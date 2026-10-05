import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createAuthServer } from "./server.mjs";

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
  return { server, request };
}

test("register, restore session, logout and login with normalized email", async (t) => {
  const { request } = await start(t);
  assert.equal((await request("me")).status, 401);
  const registered = await request("register", account);
  assert.equal(registered.status, 201);
  const result = await registered.json();
  assert.equal(result.user.name, account.name);
  assert.deepEqual(Object.keys(result.user).sort(), ["email", "id", "name"]);
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
  assert.equal((await request("me", null, "firstclass_session=fake")).status, 401);
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
  assert.match(cookie, /^__Host-firstclass_session=/); assert.match(cookie, /; Secure/);
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
