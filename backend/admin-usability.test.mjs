import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";

test("admin filters, scoped refresh and unsaved forms work in the browser", { timeout: 90000 }, async () => {
  const server = await createServer({ root: process.cwd(), server: { host: "127.0.0.1", port: 5199, strictPort: true, open: false, watch: null } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" });
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    const calls = [];
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url()); calls.push(url);
      const path = url.pathname;
      let body = {};
      if (path === "/api/admin/auth/me") body = { user: { id: "admin", name: "Admin thử", email: "admin@example.test", role: "admin" } };
      else if (path.endsWith("/overview")) body = { customers: 1, disabled: 0, articles: 0, banners: 0 };
      else if (path.endsWith("/users")) body = { users: [], total: 0 };
      else if (path.endsWith("/bookings")) body = { bookings: [], total: 0 };
      else if (path.endsWith("/service-requests")) body = { requests: [], total: 0 };
      else if (path.endsWith("/tours")) body = { tours: [] };
      else if (path.endsWith("/esims")) body = { esims: [] };
      else if (path.endsWith("/articles")) body = { articles: [] };
      else if (path.endsWith("/banners")) body = { banners: [] };
      await route.fulfill({ json: body });
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/admin`);
    const nav = page.getByRole("navigation", { name: "Quản trị" });
    await nav.getByRole("button", { name: "Yêu cầu & giao dịch", exact: true }).click();
    await page.getByLabel("Tìm yêu cầu").fill("0909999999");
    await page.getByRole("combobox", { name: /^Trạng thái/ }).selectOption("received");
    await page.getByLabel("Tạo từ ngày").fill("2026-10-19");
    await page.getByLabel("Đến hết ngày").fill("2026-10-19");
    const filtered = page.waitForRequest(r => r.url().includes("/admin/bookings?") && r.url().includes("q=0909999999"));
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    const query = new URL((await filtered).url()).searchParams;
    assert.equal(query.get("status"), "received"); assert.equal(query.get("from"), "2026-10-19"); assert.equal(query.get("page"), "1");
    await page.getByRole("button", { name: "Làm mới yêu cầu", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Làm mới", exact: true }).count(), 0);
    await nav.getByRole("button", { name: "Yêu cầu tour/eSIM", exact: true }).click();
    await page.getByLabel("Tìm yêu cầu").fill("Khách thử");
    const services = page.waitForRequest(r => r.url().includes("/admin/service-requests?") && new URL(r.url()).searchParams.get("q") === "Khách thử");
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click(); await services;
    for (const [tab, add, label] of [["Tour du lịch", "+ Thêm tour", "Tên tour"], ["eSIM", "+ Thêm gói eSIM", "Tên gói eSIM"]]) {
      await nav.getByRole("button", { name: tab, exact: true }).click();
      await page.getByRole("button", { name: add, exact: true }).click();
      await page.getByLabel(label, { exact: true }).fill("Nội dung đang nhập");
      page.once("dialog", dialog => dialog.dismiss());
      await nav.getByRole("button", { name: "Tổng quan", exact: true }).click();
      assert.equal(await page.getByLabel(label, { exact: true }).inputValue(), "Nội dung đang nhập");
      page.once("dialog", dialog => dialog.accept());
      await nav.getByRole("button", { name: "Tổng quan", exact: true }).click();
      await page.getByRole("heading", { name: "Tổng quan", exact: true }).waitFor();
    }
    const before = calls.length;
    await page.getByRole("button", { name: "Làm mới", exact: true }).click();
    await page.getByRole("button", { name: "Làm mới", exact: true }).waitFor();
    assert.deepEqual(calls.slice(before).map(url => url.pathname), ["/api/admin/overview"]);
  } finally { await browser?.close(); await server.close(); }
});

test("public pages render on mobile and news failures can be retried", { timeout: 90000 }, async () => {
  const server = await createServer({ root: process.cwd(), server: { host: "127.0.0.1", port: 5199, strictPort: true, open: false, watch: null } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", error => errors.push({ message: error.message, stack: error.stack }));
    let unavailable = true;
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/products")) return route.fulfill({ status: unavailable ? 503 : 200, json: unavailable ? { message: "Tạm gián đoạn" } : [{ id: 1, name: "Tin tức kiểm thử", categoryId: 1, image: "", publishedAt: "19/10/2026", summary: "Nội dung mẫu" }] });
      if (path.endsWith("/me")) return route.fulfill({ status: 401, json: { message: "Đăng nhập" } });
      return route.fulfill({ json: path.endsWith("/capabilities") ? { emailEnabled: false } : [] });
    });
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    await page.goto(`${origin}/tin-tuc`);
    await page.getByRole("button", { name: "Tải lại tin tức" }).waitFor();
    assert.equal(await page.getByText("Thông tin đang được cập nhật.", { exact: false }).count(), 0);
    unavailable = false;
    await page.getByRole("button", { name: "Tải lại tin tức" }).click();
    await page.getByText("Tin tức kiểm thử", { exact: true }).waitFor();
    for (const path of ["/", "/categories", "/flights", "/tours", "/esims", "/search", "/profile", "/history", "/support", "/forgot-password", "/missing-page"]) {
      await page.goto(`${origin}${path}`);
      await page.locator(".app-route").waitFor();
      assert.equal(await page.getByText("Chưa mở được trang", { exact: true }).count(), 0, path);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path} overflows mobile viewport`);
    }
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); await server.close(); }
});
