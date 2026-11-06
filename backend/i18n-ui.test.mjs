import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import languages from "../src/i18n/languages.json" with { type: "json" };
import seeds from "../src/i18n/seeds.json" with { type: "json" };

test("language switch translates customer/admin UI and content, preserves form values and language across reload", { timeout: 120000 }, async () => {
  const vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", ".", "--host", "127.0.0.1", "--port", "5184", "--strictPort"], { windowsHide: true, stdio: "pipe" });
  let output = "";
  vite.stdout.on("data", chunk => { output += chunk; }); vite.stderr.on("data", chunk => { output += chunk; });
  let browser;
  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (vite.exitCode !== null) throw new Error(output);
      try { if ((await fetch("http://127.0.0.1:5184")).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({ channel: "msedge", headless: true });
    for (const width of [1280, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = []; page.on("pageerror", e => errors.push(e.message));
      await page.route("https://api.frankfurter.dev/**", route => route.fulfill({ json: [...languages, ["", "", "", "JPY"]].map(([, , , quote]) => ({ base: "VND", quote, rate: quote === "USD" ? .00004 : .006, date: new Date().toISOString().slice(0, 10) })) }));
      const original = { id: 999, name: "Gói Nhật Bản kiểm thử", coverage: "Nhật Bản", allowance: "5 GB", validity: "7 ngày", price: 250000, image: "", summary: "Nội dung gốc" };
      await context.route("**/api/**", route => {
        const url = new URL(route.request().url()), path = url.pathname;
        if (path.startsWith("/api/i18n/")) {
          const lang = path.split("/").at(-1);
          return route.fulfill({ json: { complete: true, entries: { ...seeds[lang], "Dung lượng": "Data", "Thời hạn": "Validity", "7 ngày": "7 days", "Bản dịch": "Translations", "__FCVAR0__ gói eSIM phù hợp": "__FCVAR0__ matching plans" } } });
        }
        if (path === "/api/content/esims") {
          const lang = url.searchParams.get("lang");
          return route.fulfill({ json: [{ ...original, _translationLanguage: lang, _localized: lang === "vi" ? {} : { name: `${lang} Japan plan`, validity: "7 days" } }] });
        }
        if (path === "/api/admin/auth/me") return route.fulfill({ json: { user: { id: "1", name: "Admin", email: "admin@example.test", role: "admin" } } });
        if (path === "/api/admin/users") return route.fulfill({ json: { users: [], total: 0 } });
        if (path === "/api/admin/articles") return route.fulfill({ json: { articles: [] } });
        if (path === "/api/admin/banners") return route.fulfill({ json: { banners: [] } });
        if (path === "/api/admin/i18n/status") return route.fulfill({ json: { state: "idle", configured: false } });
        if (path === "/api/admin/overview") return route.fulfill({ json: {} });
        if (path.endsWith("/auth/me")) return route.fulfill({ status: 401, json: {} });
        return route.fulfill({ json: [] });
      });
      await page.addInitScript(() => { if (!localStorage.getItem("travel-language")) localStorage.setItem("travel-language", "ja"); });
      await page.goto("http://127.0.0.1:5184/esims/country/jp");
      assert.equal(await page.locator("html").getAttribute("lang"), "vi");
      await page.locator(".catalog-card-price").waitFor();
      await page.locator(".language-trigger").filter({ visible: true }).click();
      assert.deepEqual(await page.locator(".language-option[lang]").evaluateAll(items => items.map(item => item.lang)), ["vi", "en"]);
      await page.locator(".language-close").click();
      assert.equal(await page.locator(".catalog-card-price").innerText(), "250.000 đ");
      const choose = async code => {
        await page.locator(".language-trigger").filter({ visible: true }).click();
        await page.locator(`.language-option[lang="${code}"]`).click();
        await page.waitForFunction(code => document.documentElement.lang === code, code);
      };
      for (const [code] of languages.filter(([code]) => code !== "vi")) {
        await choose(code);
        await page.locator(".catalog-card-title").filter({ hasText: `${code} Japan plan` }).waitFor({ timeout: 8000 });
        assert.equal(await page.locator("html").getAttribute("dir"), code === "ar" ? "rtl" : "ltr");
        const nav = page.locator(width > 600 ? ".desktop-nav" : ".mobile-bottom-nav");
        assert.ok((await nav.innerText()).includes(seeds[code]["Trang chủ"]), code);
      }
      await choose("en");
      await page.locator(".catalog-card-price").filter({ hasText: "$10.00" }).waitFor();
      assert.match(await page.locator(".catalog-card-price").innerText(), /10\.00/);
      await page.getByText("1 matching eSIM plans", { exact: true }).waitFor();
      const validity = page.getByLabel("Validity", { exact: true });
      await validity.selectOption({ label: "7 days" });
      assert.equal(await validity.inputValue(), "7 ngày", "translated option retains original filter value");
      assert.equal(await page.locator(".catalog-card-title").innerText(), "en Japan plan");
      await page.locator(".language-trigger").filter({ visible: true }).click();
      assert.equal(await page.locator("[data-currency]").count(), 0);
      await page.locator(".language-close").click();
      await page.reload();
      await page.locator(".catalog-card-price").filter({ hasText: "$10.00" }).waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem("travel-language")), "en");
      // Bundled UI translations must work even when the dictionary API is down.
      await page.route("**/api/i18n/en", route => route.fulfill({ status: 503, json: {} }));
      await page.goto("http://127.0.0.1:5184/flights");
      await page.getByRole("heading", { name: "Flight booking request", exact: true }).waitFor();
      await page.getByRole("button", { name: "Search flights →", exact: true }).waitFor();
      assert.equal(await page.getByText("Người lớn", { exact: true }).count(), 0);
      assert.equal(await page.getByText("Some translations are not yet available; the original Vietnamese content is shown.", { exact: true }).count(), 0);
      await choose("vi");
      await page.getByRole("heading", { name: "Yêu cầu đặt vé máy bay", exact: true }).waitFor();
      await choose("en");
      await page.goto("http://127.0.0.1:5184/admin");
      assert.equal(await page.locator("html").getAttribute("lang"), "vi", "admin does not inherit customer language");
      await choose("en");
      if (width < 768) await page.locator(".admin-mobile-navigation").selectOption("translations");
      else await page.getByRole("button", { name: "Translations", exact: true }).click();
      await page.getByRole("heading", { name: "English translations", exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "Tạo / cập nhật tất cả bản dịch", exact: true }).count(), 0);
      const customer = await context.newPage();
      await customer.goto("http://127.0.0.1:5184/flights");
      await customer.getByRole("heading", { name: "Flight booking request", exact: true }).waitFor();
      await choose("vi");
      assert.equal(await customer.locator("html").getAttribute("lang"), "en", "admin changes leave the customer tab unchanged");
      await page.reload();
      assert.equal(await page.locator("html").getAttribute("lang"), "vi");
      await choose("en");
      await customer.locator(".language-trigger").filter({ visible: true }).click();
      await customer.locator('.language-option[lang="vi"]').click();
      await customer.getByRole("heading", { name: "Yêu cầu đặt vé máy bay", exact: true }).waitFor();
      await customer.reload();
      await customer.getByRole("heading", { name: "Yêu cầu đặt vé máy bay", exact: true }).waitFor();
      assert.equal(await page.locator("html").getAttribute("lang"), "en", "customer changes leave the admin tab unchanged");
      await page.reload();
      assert.equal(await page.locator("html").getAttribute("lang"), "en", "admin preference survives reload independently");
      // Exercise SPA navigation too, where the translation store is not recreated.
      await page.evaluate(async () => { const { default: router } = await import('/src/router.tsx'); await router.navigate('/flights'); });
      await page.getByRole("heading", { name: "Yêu cầu đặt vé máy bay", exact: true }).waitFor();
      await page.evaluate(async () => { const { default: router } = await import('/src/router.tsx'); await router.navigate('/admin'); });
      await page.waitForFunction(() => document.documentElement.lang === "en");
      assert.equal(await page.evaluate(() => localStorage.getItem("travel-language")), "vi");
      assert.equal(await page.evaluate(() => localStorage.getItem("travel-admin-language")), "en");
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser?.close(); vite.kill(); }
});
