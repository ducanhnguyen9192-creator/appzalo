import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

test("journey submission searches both legs once, preserves selections on back, and searches edited dates", { timeout: 90000 }, async () => {
  const server = await createServer({ root: process.cwd(), server: { host: "127.0.0.1", port: 5198, strictPort: true, open: false, watch: null } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(30000);
    const queries = [];
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (path !== "/api/flights/search") return route.fulfill({ json: path.includes("/auth/") ? { user: null } : [] });
      const query = route.request().postDataJSON();
      queries.push(query);
      return route.fulfill({ json: { query, source: "Fixture", searchedAt: new Date().toISOString(), flights: [{ number: "VJ123", aircraft: "A321", departure: "08:00", arrival: "10:00", arrivalNextDay: false, fares: [{ name: "Eco", amount: 1000000 }] }] } });
    });
    await page.goto("http://127.0.0.1:5198/flights");
    await page.getByRole("button", { name: "Khứ hồi", exact: true }).click();
    await page.getByRole("button", { name: "Tìm chuyến bay →", exact: true }).click();
    assert.equal(queries.length, 0);
    await page.locator("#flight-origin").fill("HAN");
    await page.locator("#flight-destination").fill("SGN");
    const date = days => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
    await page.locator("#flight-departureDate").fill(date(5));
    await page.locator("#flight-returnDate").fill(date(7));
    await page.getByRole("button", { name: "Tìm chuyến bay →", exact: true }).click();
    await page.getByRole("button", { name: /^Chiều về:/ }).waitFor();
    assert.equal(queries.length, 2);
    assert.deepEqual(queries.map(q => [q.origin, q.destination]), [["HAN", "SGN"], ["SGN", "HAN"]]);
    await page.getByRole("button", { name: "Chọn VJ123 Eco", exact: true }).click();
    await page.getByRole("button", { name: "Chọn VJ123 Eco", exact: true }).click();
    await page.getByRole("heading", { name: "Bước 3/3 · Thông tin liên hệ" }).waitFor();
    await page.getByRole("button", { name: "← Chọn chuyến", exact: true }).click();
    await page.getByRole("heading", { name: "Bước 2/3 · Chọn chuyến" }).waitFor();
    assert.equal(queries.length, 2);
    assert.equal(await page.getByRole("button", { name: "Chọn VJ123 Eco", exact: true }).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "Sửa hành trình", exact: true }).click();
    await page.locator("#flight-departureDate").fill(date(6));
    await page.getByRole("button", { name: "Tìm chuyến bay →", exact: true }).click();
    await page.getByRole("button", { name: /^Chiều về:/ }).waitFor();
    assert.equal(queries.length, 4);
    assert.equal(queries[2].departureDate, date(6));
  } finally { await browser?.close(); await server.close(); }
});
