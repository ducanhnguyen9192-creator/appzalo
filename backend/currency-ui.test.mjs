import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

test("language switch converts service prices to USD, caches rates and restores VND", { timeout: 60000 }, async () => {
  const server = await createServer({ root: process.cwd(), server: { host: "127.0.0.1", port: 5196, strictPort: true, open: false, watch: null } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "msedge", headless: true });
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = []; page.on("pageerror", e => errors.push(e.message));
      let rateRequests = 0;
      let failRates = false;
      await page.route("https://api.frankfurter.dev/**", route => {
        rateRequests++;
        return failRates ? route.abort() : route.fulfill({ json: [{ base: "VND", quote: "USD", rate: .00004, date: new Date().toISOString().slice(0, 10) }] });
      });
      await page.route("**/api/**", route => route.fulfill({ json: route.request().url().includes("/content/esims") ? [{ id: 999, name: "Test Japan eSIM", coverage: "Nhật Bản", price: 250000, allowance: "5 GB", validity: "7 ngày", image: "", summary: "Test" }] : { entries: {}, complete: true } }));
      await page.addInitScript(() => localStorage.setItem("travel-currency", "JPY"));
      await page.goto("http://127.0.0.1:5196/esims/country/jp");
      await page.locator(".catalog-card-price").waitFor();
      assert.equal(await page.locator(".catalog-card-price").innerText(), "250.000 đ");
      await page.locator(".language-trigger").filter({ visible: true }).click();
      assert.equal(await page.locator("[data-currency]").count(), 0);
      await page.getByRole("button", { name: "English", exact: true }).click();
      const price = page.locator(".catalog-card-price");
      await price.filter({ hasText: "$10.00" }).waitFor();
      assert.ok((await price.innerText()).includes("10.00"));
      assert.equal(rateRequests, 1);
      failRates = true;
      await page.reload();
      await price.filter({ hasText: "$10.00" }).waitFor();
      assert.ok((await price.innerText()).includes("10.00"));
      await page.locator(".language-trigger").filter({ visible: true }).click();
      await page.getByRole("button", { name: "Tiếng Việt", exact: true }).click();
      await price.filter({ hasText: "250.000 đ" }).waitFor();
      await page.evaluate(() => localStorage.removeItem("travel-usd-rates"));
      await page.reload();
      await page.locator(".language-trigger").filter({ visible: true }).click();
      await page.getByRole("button", { name: "English", exact: true }).click();
      await page.getByText("USD exchange rate is unavailable. Prices are shown in VND.", { exact: true }).waitFor();
      assert.ok((await price.innerText()).includes("250,000"));
      assert.ok((await price.innerText()).includes("VND"));
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser?.close(); await server.close(); }
});
