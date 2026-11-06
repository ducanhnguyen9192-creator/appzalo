import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

test("late content responses cannot overwrite the current language after cancellation", { timeout: 60000 }, async () => {
  const server = await createServer({ root: process.cwd(), server: { host: "127.0.0.1", port: 5195, strictPort: true, open: false, watch: null } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || "msedge", headless: true });
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    await page.addInitScript(() => {
      localStorage.setItem("travel-language", "en");
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        const stale = String(input).includes("/content/tours/1?lang=en");
        const response = await originalFetch(input, stale ? { ...init, signal: undefined } : init);
        if (stale) {
          const originalJson = response.json.bind(response);
          response.json = async () => {
            const data = await originalJson();
            await new Promise(resolve => { window.releaseStaleContent = resolve; window.staleReady = true; });
            return data;
          };
        }
        return response;
      };
    });
    await page.route("**/api/**", route => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/content/tours/1") return route.fulfill({ json: {
        id: 1, name: url.searchParams.get("lang") === "en" ? "Stale tour response" : "Current tour response",
        kind: "domestic", destination: "Hanoi", duration: "3 days", departure: "", price: null,
        image: "", summary: "Test description", itinerary: "", included: "", excluded: "", published: true,
      } });
      if (url.pathname.endsWith("/auth/me")) return route.fulfill({ status: 401, json: {} });
      return route.fulfill({ json: { entries: {}, complete: true } });
    });
    await page.goto("http://127.0.0.1:5195/tours/1");
    await page.waitForFunction(() => window.staleReady);
    await page.locator(".language-trigger").filter({ visible: true }).click();
    await page.locator('.language-option[lang="vi"]').click();
    await page.getByRole("heading", { name: "Current tour response", exact: true }).waitFor();
    await page.evaluate(async () => {
      window.releaseStaleContent();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    assert.equal(await page.getByRole("heading", { name: "Stale tour response", exact: true }).count(), 0);
    assert.equal(await page.getByRole("heading", { name: "Current tour response", exact: true }).count(), 1);
  } finally { await browser?.close(); await server.close(); }
});
