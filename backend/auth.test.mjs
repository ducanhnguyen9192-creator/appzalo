import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createAuthServer, provisionAdmin } from "./server.mjs";

const account = { name: "Khách hàng thử nghiệm", email: "demo@example.test", password: "Test-password-2026!" };

async function start(t, options = {}) {
  const server = createAuthServer({ databasePath: ":memory:", ...options });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((done) => { server.close(done); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, cookie, extra = {}) => fetch(`${base}/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  const api = (path, body, cookie, extra = {}) => fetch(`${base}/api/${path}`, {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { server, request, api };
}

async function adminFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "firstclass-admin-"));
  const databasePath = join(directory, "test.sqlite");
  const admin = { email: "admin@example.test", password: "Admin-Test-password-2026!" };
  await provisionAdmin({ ...admin, databasePath });
  const fixture = await start(t, { databasePath });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const login = await fixture.api("admin/auth/login", admin);
  assert.equal(login.status, 200);
  return { ...fixture, admin, cookie: login.headers.get("set-cookie"), databasePath };
}

test("customers cannot self-promote or access admin reads or writes", async (t) => {
  const { api, request } = await start(t);
  assert.equal((await api("admin/users")).status, 401);
  const registered = await request("register", { ...account, role: "admin", disabled: 0 });
  assert.equal((await registered.json()).user.role, "customer");
  const cookie = registered.headers.get("set-cookie");
  for (const [path, body] of [["admin/users"], ["admin/overview"], ["admin/articles"], ["admin/banners"], ["admin/users/status", { id: "x", disabled: true }], ["admin/articles/save", { name: "x" }], ["admin/banners/save", {}], ["admin/password", {}]]) {
    assert.equal((await api(path, body, cookie)).status, 401);
  }
});

test("admin can list customers, disable sessions and re-enable login", async (t) => {
  const { api, request, cookie, admin } = await adminFixture(t);
  const registered = await request("register", account);
  const customer = (await registered.json()).user;
  const customerCookie = registered.headers.get("set-cookie");
  const list = await (await api("admin/users", null, cookie)).json();
  assert.equal(list.total, 2);
  assert.ok(list.users.every((user) => !user.password_hash));
  assert.equal((await api("admin/users/status", { id: customer.id, disabled: true }, cookie)).status, 200);
  assert.equal((await request("me", null, customerCookie)).status, 401);
  assert.equal((await request("login", account)).status, 401);
  assert.equal((await api("admin/users/status", { id: customer.id, disabled: false }, cookie)).status, 200);
  assert.equal((await request("login", account)).status, 200);
  const me = await (await api("admin/auth/me", null, cookie)).json();
  assert.equal((await api("admin/users/status", { id: me.user.id, disabled: true }, cookie)).status, 403);
  assert.equal((await api("admin/auth/login", admin)).status, 200);
});

test("only published content reaches public API and edits persist", async (t) => {
  const { api, cookie, databasePath } = await adminFixture(t);
  const article = { name: "Ưu đãi thử nghiệm", summary: "Tóm tắt", content: "Điều kiện ưu đãi", image: "/images/news/news-1.jpg", publishedAt: "05/10/2026", categoryId: 1, type: "offer", published: false };
  const created = await api("admin/articles/save", article, cookie);
  assert.equal(created.status, 201);
  const { id } = await created.json();
  assert.ok(!(await (await api("content/products")).json()).some((item) => item.id === id));
  assert.equal((await api("admin/articles/save", { ...article, id, published: true }, cookie)).status, 200);
  const visible = (await (await api("content/products")).json()).find((item) => item.id === id);
  assert.equal(visible.contentType, "offer"); assert.equal(visible.details[0].content, article.content);
  assert.equal((await api("admin/articles/save", { ...article, image: "javascript:alert(1)" }, cookie)).status, 400);
  const banner = { title: "Banner thử nghiệm", image: "https://example.com/banner.jpg", active: false };
  const imageResult = await (await api("admin/banners/save", banner, cookie)).json();
  assert.ok(!(await (await api("content/banners")).json()).includes(banner.image));
  await api("admin/banners/save", { ...banner, id: imageResult.id, active: true }, cookie);
  assert.ok((await (await api("content/banners")).json()).includes(banner.image));
  const db = new DatabaseSync(databasePath);
  assert.equal(JSON.parse(db.prepare("SELECT data FROM articles WHERE id = ?").get(id).data).name, article.name);
  db.close();
  assert.equal((await api("admin/articles/save", article, cookie, { Origin: "https://untrusted.example" })).status, 403);
});

test("tour management validates data and only publishes the selected tour groups", async (t) => {
  const { api, request, cookie, databasePath } = await adminFixture(t);
  const customer = await request("register", account);
  const customerCookie = customer.headers.get("set-cookie");
  const tour = { name: "Tour kiểm thử", destination: "Đà Nẵng", duration: "3 ngày 2 đêm", departure: "Hàng tuần", price: 4500000, image: "/images/news/news-3.jpg", summary: "Giới thiệu", itinerary: "Ngày 1\nNgày 2", included: "Khách sạn", excluded: "Chi phí cá nhân", kind: "domestic", published: false };
  assert.equal((await api("admin/tours", null, customerCookie)).status, 401);
  assert.equal((await api("admin/tours/save", tour, customerCookie)).status, 401);
  const created = await api("admin/tours/save", tour, cookie);
  assert.equal(created.status, 201);
  const { id } = await created.json();
  assert.deepEqual(await (await api("content/tours")).json(), []);
  assert.equal((await api(`content/tours/${id}`)).status, 404);
  for (const invalid of [{ price: -1 }, { kind: "unknown" }, { image: "javascript:alert(1)" }, { duration: "" }, { published: "true" }]) {
    assert.equal((await api("admin/tours/save", { ...tour, ...invalid }, cookie)).status, 400);
  }
  await api("admin/tours/save", { ...tour, id, published: true }, cookie);
  for (const kind of ["international", "combo"]) await api("admin/tours/save", { ...tour, kind, price: null, published: true }, cookie);
  assert.equal((await (await api("content/tours")).json()).length, 3);
  for (const kind of ["domestic", "international", "combo"]) {
    const list = await (await api(`content/tours?type=${kind}`)).json();
    assert.equal(list.length, 1); assert.equal(list[0].kind, kind);
  }
  assert.equal((await api("content/tours?type=unknown")).status, 400);
  assert.equal((await (await api(`content/tours/${id}`)).json()).itinerary, tour.itinerary);
  await api("admin/tours/save", { ...tour, id, published: false }, cookie);
  assert.equal((await api(`content/tours/${id}`)).status, 404);
  assert.equal((await (await api("admin/tours", null, cookie)).json()).tours.length, 3);
  assert.equal((await api("admin/tours/save", { ...tour, id: 999999 }, cookie)).status, 404);
  const db = new DatabaseSync(databasePath);
  assert.equal(JSON.parse(db.prepare("SELECT data FROM tours WHERE id = ?").get(id).data).price, tour.price);
  db.close();
});

test("admin password change revokes old sessions and old password", async (t) => {
  const { api, request, cookie, admin } = await adminFixture(t);
  const other = await api("admin/auth/login", admin);
  const otherCookie = other.headers.get("set-cookie");
  assert.equal((await api("admin/password", { currentPassword: "wrong-password", password: "New-Admin-password-2026!" }, cookie)).status, 401);
  const changed = await api("admin/password", { currentPassword: admin.password, password: "New-Admin-password-2026!" }, cookie);
  assert.equal(changed.status, 200);
  assert.equal((await api("admin/users", null, cookie)).status, 401);
  assert.equal((await api("admin/users", null, otherCookie)).status, 401);
  assert.equal((await api("admin/auth/login", admin)).status, 401);
  assert.equal((await api("admin/auth/login", { ...admin, password: "New-Admin-password-2026!" })).status, 200);
  assert.equal((await api("admin/users", null, changed.headers.get("set-cookie"))).status, 200);
});

test("cannot turn an existing customer into admin through provisioning", async (t) => {
  const { request, databasePath } = await adminFixture(t);
  await request("register", account);
  await assert.rejects(provisionAdmin({ email: account.email, password: "Admin-Test-password-2026!", databasePath }), /Email đã tồn tại/);
  const login = await request("login", account);
  assert.equal((await login.json()).user.role, "customer");
});

test("customer and admin login, replacement and logout are independent", async (t) => {
  const { api, request, cookie: adminCookie, admin } = await adminFixture(t);
  // An admin session must never sign the user into the customer portal.
  assert.equal((await request("me", null, adminCookie)).status, 401);
  const registered = await request("register", account, adminCookie);
  const customerCookie = registered.headers.get("set-cookie");
  assert.match(customerCookie, /^firstclass_customer_session=/);
  assert.match(adminCookie, /^firstclass_admin_session=/);
  const both = `${adminCookie.split(";")[0]}; ${customerCookie.split(";")[0]}`;
  assert.equal((await request("me", null, both)).status, 200);
  assert.equal((await api("admin/auth/me", null, both)).status, 200);
  assert.equal((await api("admin/users", null, both)).status, 200);
  assert.equal((await request("login", admin, both)).status, 401);
  assert.equal((await api("admin/auth/login", account, both)).status, 401);
  assert.equal((await api("admin/auth/register", account, both)).status, 404);
  // Logging in again as a customer only rotates the customer token.
  const relogin = await request("login", account, both);
  const newCustomerCookie = relogin.headers.get("set-cookie");
  assert.equal((await request("me", null, customerCookie)).status, 401);
  assert.equal((await api("admin/auth/me", null, both)).status, 200);
  await request("logout", {}, `${adminCookie.split(";")[0]}; ${newCustomerCookie.split(";")[0]}`);
  assert.equal((await request("me", null, newCustomerCookie)).status, 401);
  assert.equal((await api("admin/users", null, adminCookie)).status, 200);
  const customerAgain = await request("login", account);
  const nextCookie = customerAgain.headers.get("set-cookie");
  await api("admin/auth/logout", {}, `${adminCookie.split(";")[0]}; ${nextCookie.split(";")[0]}`);
  assert.equal((await api("admin/users", null, adminCookie)).status, 401);
  assert.equal((await request("me", null, nextCookie)).status, 200);
});

test("renaming a cookie cannot change its session audience", async (t) => {
  const { api, request, cookie: adminCookie } = await adminFixture(t);
  const registered = await request("register", account);
  const customerCookie = registered.headers.get("set-cookie");
  const forgedAdmin = customerCookie.replace("firstclass_customer_session", "firstclass_admin_session");
  const forgedCustomer = adminCookie.replace("firstclass_admin_session", "firstclass_customer_session");
  assert.equal((await api("admin/users", null, forgedAdmin)).status, 401);
  assert.equal((await request("me", null, forgedCustomer)).status, 401);
});

test("admin image uploads persist and can be used as banner images", async (t) => {
  const { api, server, cookie } = await adminFixture(t);
  const base = `http://127.0.0.1:${server.address().port}`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jFz8AAAAASUVORK5CYII=", "base64");
  const response = await fetch(`${base}/api/admin/uploads`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "image/png" }, body: png });
  assert.equal(response.status, 201);
  const { image } = await response.json();
  assert.match(image, /^\/api\/media\/[a-f0-9-]{36}\.png$/);
  const stored = await fetch(`${base}${image}`);
  assert.equal(stored.status, 200);
  assert.equal(stored.headers.get("content-type"), "image/png");
  assert.equal(stored.headers.get("x-content-type-options"), "nosniff");
  assert.deepEqual(Buffer.from(await stored.arrayBuffer()), png);
  const banner = await api("admin/banners/save", { title: "Uploaded banner", image, active: true }, cookie);
  assert.equal(banner.status, 201);
  assert.ok((await (await api("content/banners")).json()).includes(image));
});

test("uploads require admin session and reject unsafe or oversized files", async (t) => {
  const { server, request, cookie } = await adminFixture(t);
  const base = `http://127.0.0.1:${server.address().port}`;
  const upload = (body, type, session, extra = {}) => fetch(`${base}/api/admin/uploads`, { method: "POST", headers: { "Content-Type": type, ...(session ? { Cookie: session } : {}), ...extra }, body });
  assert.equal((await upload("file", "image/png")).status, 401);
  const registered = await request("register", account);
  assert.equal((await upload("file", "image/png", registered.headers.get("set-cookie"))).status, 401);
  assert.equal((await upload("<svg onload='alert(1)'/>", "image/svg+xml", cookie)).status, 415);
  assert.equal((await upload("not a PNG image", "image/png", cookie)).status, 415);
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1), "image/png", cookie)).status, 413);
  assert.equal((await upload("file", "image/png", cookie, { Origin: "https://untrusted.example" })).status, 403);
  assert.equal((await fetch(`${base}/api/media/not-a-real-file.png`)).status, 404);
});

test("register, restore session, logout and login with normalized email", async (t) => {
  const { request } = await start(t);
  assert.equal((await request("me")).status, 401);
  const registered = await request("register", account);
  assert.equal(registered.status, 201);
  const result = await registered.json();
  assert.equal(result.user.name, account.name);
  assert.deepEqual(Object.keys(result.user).sort(), ["email", "id", "name", "role"]);
  const cookie = registered.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/);
  assert.equal((await request("me", null, cookie)).status, 200);
  const logout = await request("logout", {}, cookie);
  assert.equal(logout.status, 200); assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await request("me", null, cookie)).status, 401);
  const login = await request("login", { email: " DEMO@EXAMPLE.TEST ", password: account.password });
  assert.equal(login.status, 200);
  assert.equal((await request("me", null, login.headers.get("set-cookie"))).status, 200);
});

test("duplicate email, wrong credentials and forged sessions are rejected", async (t) => {
  const { request } = await start(t);
  await request("register", account);
  assert.equal((await request("register", { ...account, email: "DEMO@EXAMPLE.TEST" })).status, 409);
  const wrong = await request("login", { ...account, password: "incorrect-password" });
  const unknown = await request("login", { ...account, email: "unknown@example.test" });
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
  assert.deepEqual(await wrong.json(), await unknown.json());
  assert.equal((await request("me", null, "firstclass_customer_session=fake")).status, 401);
});

test("reject invalid input and SQL injection-shaped credentials", async (t) => {
  const { request } = await start(t);
  for (const body of [{ ...account, name: "x" }, { ...account, email: "invalid" }, { ...account, password: "short" }, { ...account, password: "x".repeat(129) }]) {
    assert.equal((await request("register", body)).status, 400);
  }
  await request("register", account);
  assert.equal((await request("login", { email: "'OR'1'='1@example.test", password: account.password })).status, 401);
});

test("origin checks block cross-site logout and registration", async (t) => {
  const { request } = await start(t);
  const registered = await request("register", account);
  const cookie = registered.headers.get("set-cookie");
  assert.equal((await request("logout", {}, cookie, { Origin: "https://untrusted.example" })).status, 403);
  assert.equal((await request("me", null, cookie)).status, 200);
  assert.equal((await request("register", account, null, { "Sec-Fetch-Site": "cross-site" })).status, 403);
  const allowed = await request("login", account, null, { Origin: "http://127.0.0.1:5173" });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "http://127.0.0.1:5173");
  assert.equal(allowed.headers.get("access-control-allow-credentials"), "true");
});

test("limit repeated authentication attempts", async (t) => {
  const { request } = await start(t, { rateLimit: 2 });
  await request("login", account); await request("login", account);
  const blocked = await request("login", account);
  assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("secure cookies use the __Host prefix", async (t) => {
  const { request } = await start(t, { secureCookies: true });
  const registered = await request("register", account);
  const cookie = registered.headers.get("set-cookie");
  assert.match(cookie, /^__Host-firstclass_customer_session=/); assert.match(cookie, /; Secure/);
});

test("reject form submissions and malformed JSON without crashing", async (t) => {
  const { server, request } = await start(t);
  const url = `http://127.0.0.1:${server.address().port}/api/auth/register`;
  const form = await fetch(url, { method: "POST", body: new URLSearchParams(account) });
  assert.equal(form.status, 415);
  const malformed = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(malformed.status, 400);
  assert.equal((await request("register", account)).status, 201);
});

test("accounts persist across restart; secrets are hashed and expired sessions rejected", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "firstclass-auth-"));
  const databasePath = join(directory, "test.sqlite");
  const first = createAuthServer({ databasePath });
  first.listen(0, "127.0.0.1"); await once(first, "listening");
  const registered = await fetch(`http://127.0.0.1:${first.address().port}/api/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(account),
  });
  assert.equal(registered.status, 201);
  const cookie = registered.headers.get("set-cookie");
  await registered.json();
  await new Promise((done) => { first.close(done); first.closeAllConnections(); });
  const db = new DatabaseSync(databasePath);
  const stored = db.prepare("SELECT password_hash FROM users").get().password_hash;
  assert.notEqual(stored, account.password); assert.match(stored, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  const sessionHash = db.prepare("SELECT token_hash FROM sessions").get().token_hash;
  assert.notEqual(sessionHash, cookie.split(";")[0].split("=")[1]);
  db.prepare("UPDATE sessions SET expires_at = 0").run(); db.close();
  const { request } = await start(t, { databasePath });
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  assert.equal((await request("me", null, cookie)).status, 401);
  assert.equal((await request("login", account)).status, 200);
});
