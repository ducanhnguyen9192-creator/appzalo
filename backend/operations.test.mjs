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

test("admin request filters search all pages, combine status and Vietnam dates, and treat wildcard input literally", async t => {
  const f = await fixture(t);
  const db = new DatabaseSync(f.databasePath);
  try {
    for (const table of ["bookings", "service_requests"]) {
      const insert = db.prepare(`INSERT INTO ${table} (id, user_id, request_key, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
      for (let i = 0; i < 23; i++) {
        const details = { fullName: i === 0 ? "Khách 100%_\\ đặc biệt" : "Khách thường", phone: i === 0 ? "0909999999" : "0901234567" };
        const data = table === "bookings" ? details : { request: details, item: { name: "Tour thử" } };
        const time = Date.parse(i === 0 ? "2026-10-19T23:59:59+07:00" : i === 1 ? "2026-10-20T00:00:00+07:00" : "2026-10-19T00:00:00+07:00");
        insert.run(`${table}-${i}`, f.customer.id, randomUUID(), JSON.stringify(data), i === 1 ? "quoted" : "received", time, time);
      }
    }
  } finally { db.close(); }
  for (const path of ["bookings", "service-requests"]) {
    const key = path === "bookings" ? "bookings" : "requests";
    const get = async query => {
      const response = await f.api(`admin/${path}?${query}`, null, f.adminCookie);
      assert.equal(response.status, 200); return response.json();
    };
    assert.equal((await f.api(`admin/${path}?q=0909999999`, null, f.cookie)).status, 401);
    const first = await get(""); assert.equal(first.total, 23); assert.equal(first[key].length, 20);
    const second = await get("page=2"); assert.equal(second.total, 23); assert.equal(second[key].length, 3);
    assert.equal(new Set([...first[key], ...second[key]].map(row => row.id)).size, 23);
    for (const q of ["0909999999", "100%_\\", "đặc biệt", `${path === "bookings" ? "bookings" : "service_requests"}-0`]) {
      const result = await get(`q=${encodeURIComponent(q)}`); assert.equal(result.total, 1); assert.equal(result[key].length, 1);
    }
    assert.equal((await get("q=customer%40operations.test")).total, 23);
    assert.equal((await get("from=2026-10-19&to=2026-10-19&status=received")).total, 22);
    assert.equal((await get("from=2026-10-19&to=2026-10-19&status=quoted")).total, 0);
    assert.equal((await get("from=2026-10-20&to=2026-10-20&status=quoted")).total, 1);
    assert.equal((await get("q=missing")).total, 0);
    assert.equal((await get("q=%27%20OR%201%3D1--")).total, 0);
    for (const query of ["status=invalid", "from=2026-02-30", "to=oops", "from=2026-10-20&to=2026-10-19"]) {
      assert.equal((await f.api(`admin/${path}?${query}`, null, f.adminCookie)).status, 400);
    }
  }
});

test("catalog deletion is admin-only, validates IDs, removes public content and preserves request history", async t => {
  const f = await fixture(t);
  for (const [table, body, service] of [["tours", tour, "tour"], ["esims", esim, "esim"], ["banners", { title: "Banner kiểm thử", image: tour.image, active: true }, null]]) {
    const id = (await (await f.api(`admin/${table}/save`, body, f.adminCookie)).json()).id;
    if (service) assert.equal((await f.api("service-requests", requestBody(service, id), f.cookie)).status, 201);
    assert.equal((await f.api(`admin/${table}/delete`, { id })).status, 401);
    assert.equal((await f.api(`admin/${table}/delete`, { id }, f.cookie)).status, 401);
    for (const invalid of [undefined, null, "1", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal((await f.api(`admin/${table}/delete`, { id: invalid }, f.adminCookie)).status, 400);
    }
    assert.equal((await f.api(`admin/${table}/delete`, { id }, f.adminCookie)).status, 200);
    assert.equal((await f.api(`admin/${table}/delete`, { id }, f.adminCookie)).status, 404);
    const items = (await (await f.api(`admin/${table}`, null, f.adminCookie)).json())[table];
    assert.ok(!items.some(item => item.id === id));
    if (service) {
      assert.equal((await f.api(`content/${table}/${id}`)).status, 404);
      assert.equal((await f.api("service-requests", requestBody(service, id), f.cookie)).status, 404);
    } else assert.ok(!(await (await f.api("content/banners")).json()).includes(body.image));
    const logs = (await (await f.api(`admin/audit?action=${table}.delete`, null, f.adminCookie)).json()).logs;
    assert.equal(logs.length, 1);
    assert.equal(logs[0].target_id, String(id));
    assert.equal(logs[0].details.before.id, id);
    assert.equal(logs[0].details.after, null);
  }
  const history = (await (await f.api("service-requests", null, f.cookie)).json()).requests;
  assert.equal(history.length, 2);
  assert.ok(history.some(item => item.item.name === tour.name));
  assert.ok(history.some(item => item.item.name === esim.name));
});

test("deletion rolls back when the audit cannot be written", async t => {
  const f = await fixture(t);
  const db = new DatabaseSync(f.databasePath);
  try { for (const [table, body] of [["tours", tour], ["esims", esim], ["banners", { title: "Banner rollback", image: tour.image, active: true }]]) {
    const id = (await (await f.api(`admin/${table}/save`, body, f.adminCookie)).json()).id;
    db.exec("CREATE TRIGGER reject_deletion_audit BEFORE INSERT ON admin_audit WHEN NEW.action LIKE '%.delete' BEGIN SELECT RAISE(ABORT, 'test delete rollback'); END");
    assert.equal((await f.api(`admin/${table}/delete`, { id }, f.adminCookie)).status, 500);
    assert.ok(db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id));
    db.exec("DROP TRIGGER reject_deletion_audit");
  } } finally { db.close(); }
});

test("service requests are account-scoped, snapshot trusted catalog data, reject drafts and retry safely", async t => {
  const f = await fixture(t);
  const tourId = (await (await f.api("admin/tours/save", tour, f.adminCookie)).json()).id;
  const esimId = (await (await f.api("admin/esims/save", esim, f.adminCookie)).json()).id;
  assert.equal((await f.api("service-requests", requestBody("tour", tourId))).status, 401);
  assert.equal((await f.api("service-requests", requestBody("tour", tourId), f.adminCookie)).status, 401);
  const body = requestBody("tour", tourId);
  assert.equal((await f.api("service-requests", { ...body, phone: "-------" }, f.cookie)).status, 400);
  assert.equal((await f.api("auth/profile", { name: "Khách thử", phone: "-------" }, f.cookie)).status, 400);
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
  const source = new DatabaseSync(f.databasePath);
  source.prepare("INSERT INTO account_tokens VALUES (?,?,?,?,?)").run("fixture-hash", f.customer.id, "reset", "fixture-version", Date.now() + 60000);
  source.close();
  const directory = await createBackup(f.databasePath);
  assert.equal((await verifyBackup(directory)).files.length, 2);
  const restored = await restoreBackup(directory, join(f.directory, "restored"));
  const db = new DatabaseSync(restored); assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users").get().count, 2); assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sessions").get().count, 0); assert.equal(db.prepare("SELECT COUNT(*) AS count FROM account_tokens").get().count, 0); assert.equal(db.prepare("SELECT COUNT(*) AS count FROM tours").get().count, 1); db.close();
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
