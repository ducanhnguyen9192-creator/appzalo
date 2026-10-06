import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createAuthServer, provisionAdmin } from "./server.mjs";
import { createBackup, verifyBackup, restoreBackup } from "./backup.mjs";
import { createRateLimiter, clientAddress, trustedProxyList } from "./rate-limit.mjs";

async function fixture(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), "firstclass-operations-"));
  const databasePath = join(directory, "firstclass.sqlite");
  await provisionAdmin({ databasePath, email: "admin@operations.test", password: "Admin-operations-2026!" });
  const server = createAuthServer({ databasePath, ...options }); server.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(async () => { await new Promise(done => { server.close(done); server.closeAllConnections(); }); rmSync(directory, { recursive: true, force: true }); });
  const api = (path, body, cookie) => fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, { method: body ? "POST" : "GET", headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const login = await api("admin/auth/login", { email: "admin@operations.test", password: "Admin-operations-2026!" });
  const registration = await api("auth/register", { email: "customer@operations.test", password: "Customer-operations-2026!", name: "Khách thử nghiệm" });
  return { api, directory, databasePath, adminCookie: login.headers.get("set-cookie"), cookie: registration.headers.get("set-cookie"), customer: (await registration.json()).user };
}
const tour = { name: "Tour kiểm thử", kind: "domestic", destination: "Đà Nẵng", duration: "3 ngày", departure: "Liên hệ", price: 5000000, image: "/images/news/news-1.jpg", summary: "Mẫu", itinerary: "Mẫu", included: "Mẫu", excluded: "Mẫu", published: true };
const esim = { name: "eSIM kiểm thử", coverage: "Nhật Bản", allowance: "5 GB", validity: "7 ngày", network: "", activation: "", price: null, image: "/images/news/news-2.jpg", summary: "Mẫu", instructions: "Mẫu", notes: "Mẫu", published: true };
const requestBody = (service, itemId) => ({ service, itemId, requestKey: randomUUID(), fullName: "Khách thử nghiệm", phone: "0901234567", quantity: 2, desiredDate: "", note: "Tư vấn thử nghiệm", price: 1, userId: "forged" });

test("service requests are account-scoped, snapshot trusted catalog data, reject drafts and retry safely", async t => {
  const f = await fixture(t);
  const tourId = (await (await f.api("admin/tours/save", tour, f.adminCookie)).json()).id;
  const esimId = (await (await f.api("admin/esims/save", esim, f.adminCookie)).json()).id;
  assert.equal((await f.api("service-requests", requestBody("tour", tourId))).status, 401);
  assert.equal((await f.api("service-requests", requestBody("tour", tourId), f.adminCookie)).status, 401);
  const body = requestBody("tour", tourId);
  const created = await f.api("service-requests", body, f.cookie); assert.equal(created.status, 201);
  const item = (await created.json()).request; assert.equal(item.item.price, tour.price); assert.equal(item.request.service, "tour");
  await f.api("admin/tours/save", { ...tour, id: tourId, name: "Tour đã sửa", price: 8000000, published: false }, f.adminCookie);
  assert.equal((await f.api("service-requests", body, f.cookie)).status, 200);
  assert.equal((await f.api("service-requests", { ...body, quantity: 3 }, f.cookie)).status, 409);
  assert.equal((await f.api("service-requests", requestBody("tour", tourId), f.cookie)).status, 404);
  assert.equal((await f.api("service-requests", { ...requestBody("esim", esimId), desiredDate: "2000-01-01" }, f.cookie)).status, 400);
  assert.equal((await f.api("service-requests", requestBody("esim", esimId), f.cookie)).status, 201);
  const other = await f.api("auth/register", { email: "other@operations.test", password: "Other-operations-2026!", name: "Khách khác" });
  const otherCookie = other.headers.get("set-cookie");
  assert.equal((await (await f.api("service-requests", null, otherCookie)).json()).total, 0);
  assert.equal((await f.api("admin/service-requests", null, f.cookie)).status, 401);
  assert.equal((await f.api("admin/service-requests/status", { id: item.id, status: "completed", response: "Đã tư vấn" }, f.cookie)).status, 401);
  assert.equal((await f.api("admin/service-requests/status", { id: item.id, status: "ticketed", response: "" }, f.adminCookie)).status, 400);
  assert.equal((await f.api("admin/service-requests/status", { id: item.id, status: "quoted", response: "Báo giá thử" }, f.adminCookie)).status, 200);
  const history = (await (await f.api("service-requests", null, f.cookie)).json()).requests;
  assert.equal(history.length, 2); assert.equal(history.find(i => i.id === item.id).item.name, tour.name); assert.equal(history.find(i => i.id === item.id).response, "Báo giá thử");
});

test("audit is admin-only and commits alongside writes, with no password or session material", async t => {
  const f = await fixture(t);
  assert.equal((await f.api("admin/audit", null, f.cookie)).status, 401);
  const id = (await (await f.api("admin/tours/save", tour, f.adminCookie)).json()).id;
  await f.api("admin/tours/save", { ...tour, id, published: false }, f.adminCookie);
  await f.api("admin/users/status", { id: f.customer.id, disabled: true }, f.adminCookie);
  const logs = (await (await f.api("admin/audit", null, f.adminCookie)).json()).logs;
  assert.equal(logs.length, 3); assert.ok(logs.every(log => log.actor_id && log.actor_name));
  const update = logs.find(log => log.action === "tours.update"); assert.equal(update.details.beforePublished, true); assert.equal(update.details.published, false);
  assert.doesNotMatch(JSON.stringify(logs), /password_hash|token_hash|operations-2026/);
  const db = new DatabaseSync(f.databasePath); db.exec("CREATE TRIGGER reject_audit BEFORE INSERT ON admin_audit BEGIN SELECT RAISE(ABORT, 'test audit rollback'); END");
  assert.equal((await f.api("admin/tours/save", { ...tour, name: "Phải rollback" }, f.adminCookie)).status, 500);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM tours").get().count, 1); db.close();
});

test("backups preserve database and media, verify corruption and restore to a new target with sessions revoked", async t => {
  const f = await fixture(t);
  const image = `${randomUUID()}.png`; mkdirSync(join(f.directory, "uploads")); writeFileSync(join(f.directory, "uploads", image), "image fixture");
  await f.api("admin/tours/save", { ...tour, image: `/api/media/${image}` }, f.adminCookie);
  const directory = await createBackup(f.databasePath);
  assert.equal((await verifyBackup(directory)).files.length, 2);
  const restored = await restoreBackup(directory, join(f.directory, "restored"));
  const db = new DatabaseSync(restored); assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users").get().count, 2); assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sessions").get().count, 0); assert.equal(db.prepare("SELECT COUNT(*) AS count FROM tours").get().count, 1); db.close();
  assert.equal(readFileSync(join(f.directory, "restored", "uploads", image), "utf8"), "image fixture");
  await assert.rejects(restoreBackup(directory, f.directory), /thư mục mới/);
  writeFileSync(join(directory, "uploads", image), "corrupted"); await assert.rejects(verifyBackup(directory), /thay đổi/);
});

test("rate limits isolate actions and accounts and only trust explicitly configured proxy chains", () => {
  const req = { socket: { remoteAddress: "127.0.0.1" }, headers: { "x-forwarded-for": "203.0.113.99, 198.51.100.2" } };
  assert.equal(clientAddress(req, trustedProxyList()), "127.0.0.1");
  assert.equal(clientAddress(req, trustedProxyList("127.0.0.1")), "198.51.100.2");
  assert.equal(clientAddress(req, trustedProxyList("127.0.0.1,198.51.100.2")), "203.0.113.99");
  assert.throws(() => trustedProxyList("*"));
  const res = { setHeader() {} }; let time = 0; const limit = createRateLimiter({ limit: 2, now: () => time });
  limit(req, res, "auth:customer"); limit(req, res, "auth:customer"); assert.throws(() => limit(req, res, "auth:customer"), error => error.status === 429);
  limit(req, res, "upload", "admin"); limit(req, res, "booking", "customer"); limit(req, res, "auth:admin");
  time += 15 * 60 * 1000; limit(req, res, "auth:customer");
  const accountLimit = createRateLimiter({ limit: 1 }); accountLimit(req, res, "service", "one-account");
  assert.throws(() => accountLimit({ socket: { remoteAddress: "192.0.2.3" }, headers: {} }, res, "service", "one-account"), error => error.status === 429);
});
