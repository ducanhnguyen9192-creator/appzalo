import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { ensureAgencyLogin, AGENCY_URL } from "./vietjet-agency.mjs";

test("agency login reuses sessions, renews expired sessions and protects credentials", async t => {
  const browser = await chromium.launch({ channel: process.env.VIETJET_BROWSER_CHANNEL || "chrome", headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(500);
  const login = '<label>Tài khoản<input id="account"></label><label>Mật khẩu<input id="password" type="password"></label><button onclick="window.submitted = true; if (!window.rejectLogin) document.body.innerHTML = window.searchForm">Đăng nhập</button>';
  const search = '<label><input type="radio">Một chiều</label>';
  await context.route("**/*", route => route.fulfill({ contentType: "text/html; charset=utf-8", body: login }));
  const session = { page };
  const credentials = { username: "fixture-agent", password: "fixture-secret", now: () => 100000 };
  const reset = async (url = AGENCY_URL) => {
    await page.goto(url);
    await page.evaluate(searchForm => { window.searchForm = searchForm; }, search);
  };
  await t.test("missing credentials do not submit the login form", async () => {
    await reset();
    await assert.rejects(ensureAgencyLogin(session, { username: "", password: "" }), { code: "VIETJET_AGENT_LOGIN_REQUIRED" });
    assert.equal(await page.evaluate(() => Boolean(window.submitted)), false);
  });
  await t.test("first login succeeds and an existing session needs no credentials", async () => {
    await ensureAgencyLogin(session, credentials);
    assert.equal(await page.evaluate(() => window.submitted), true);
    await ensureAgencyLogin(session, { username: "", password: "" });
    assert.equal(session.loginRetryAt, 0);
  });
  await t.test("expired session logs in again", async () => {
    await reset();
    await ensureAgencyLogin(session, credentials);
    assert.equal(await page.evaluate(() => window.submitted), true);
  });
  await t.test("redirects cannot receive credentials", async () => {
    await reset("https://untrusted.example/login");
    await assert.rejects(ensureAgencyLogin(session, credentials), { code: "VIETJET_AGENT_LOGIN_REQUIRED" });
    assert.equal(await page.locator("#account").inputValue(), "");
    assert.equal(await page.locator("#password").inputValue(), "");
  });
  await t.test("failed login is sanitized and retried only after cooldown", async () => {
    await reset();
    await page.evaluate(() => { window.rejectLogin = true; });
    // Bound the provider wait in this fixture, without changing production timeout.
    const realGetByRole = page.getByRole.bind(page);
    page.getByRole = (role, options) => {
      const locator = realGetByRole(role, options);
      if (role === "radio") {
        const wait = locator.waitFor.bind(locator);
        locator.waitFor = options => wait({ ...options, timeout: 100 });
      }
      return locator;
    };
    await assert.rejects(ensureAgencyLogin(session, credentials), error => {
      assert.equal(error.code, "VIETJET_AGENT_LOGIN_REQUIRED");
      assert.equal(error.message.includes(credentials.password), false);
      return true;
    });
    await reset();
    await assert.rejects(ensureAgencyLogin(session, credentials), { code: "VIETJET_AGENT_LOGIN_REQUIRED" });
    assert.equal(await page.evaluate(() => Boolean(window.submitted)), false);
    await ensureAgencyLogin(session, { ...credentials, now: () => 160001 });
    assert.equal(await page.evaluate(() => window.submitted), true);
  });
});
