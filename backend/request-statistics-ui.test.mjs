import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium } from "playwright";

test("statistics tab filters, renders counts, empty and error states on desktop and mobile", { timeout: 90000 }, async () => {
  const server = await createServer({ root: process.cwd(), server: { host: "127.0.0.1", port: 0, open: false, watch: null } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || "chrome" });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(10000);
    page.on("pageerror", error => console.error(error.message));
    let fail = false;
    await page.route("**/api/**", async route => {
      const url = new URL(route.request().url());
      let body = {};
      if (url.pathname.endsWith("/auth/me")) body = { user: { id: "admin", name: "Admin", role: "admin" } };
      else if (url.pathname.endsWith("/request-statistics")) {
        if (fail) return route.fulfill({ status: 500, json: { message: "Không tải được thống kê." } });
        const service = url.searchParams.get("service") || "";
        body = { from: url.searchParams.get("from"), to: url.searchParams.get("to"), service, total: service ? 0 : 6,
          summary: ["flight", "tour", "esim"].map(service => ({ service, total: url.searchParams.get("service") ? 0 : 2, statuses: { received: url.searchParams.get("service") ? 0 : 2 } })),
          daily: [{ date: url.searchParams.get("from"), flight: service ? 0 : 2, tour: service ? 0 : 2, esim: service ? 0 : 2 }] };
      } else if (url.pathname.endsWith("/overview")) body = {};
      else body = { users: [], articles: [], banners: [], total: 0 };
      await route.fulfill({ json: body });
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/admin`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Thống kê yêu cầu", exact: true }).click();
    await page.getByRole("heading", { name: "Tổng hợp theo trạng thái" }).waitFor();
    assert.equal(await page.getByRole("img", { name: "Biểu đồ cột chồng số yêu cầu theo ngày" }).count(), 1);
    await page.getByLabel("Từ ngày", { exact: true }).fill("2026-10-19");
    await page.getByLabel("Đến ngày", { exact: true }).fill("2026-10-20");
    await page.getByLabel("Dịch vụ", { exact: true }).selectOption("tour");
    const request = page.waitForRequest(r => r.url().includes("request-statistics?") && r.url().includes("service=tour"));
    await page.getByRole("button", { name: "Áp dụng", exact: true }).click();
    assert.equal(new URL((await request).url()).searchParams.get("from"), "2026-10-19");
    await page.getByText("Không có yêu cầu trong khoảng thời gian và dịch vụ đã chọn.").waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    fail = true;
    await page.getByRole("button", { name: "Làm mới", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByRole("heading", { name: "Tổng hợp theo trạng thái" }).count(), 0);
    fail = false;
    await page.getByRole("button", { name: "Làm mới", exact: true }).click();
    await page.getByRole("heading", { name: "Tổng hợp theo trạng thái" }).waitFor();
  } finally { await browser?.close(); await server.close(); }
});
