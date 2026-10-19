// End-to-end local request flow with an isolated SQLite database and fixed
// search data. No calls to Vietjet and no requests written to customer data.
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "playwright";
import { createAuthServer } from "./server.mjs";

const directory = mkdtempSync(join(tmpdir(), "firstclass-flight-selection-"));
const databasePath = join(directory, "test.sqlite");
const appUrl = process.env.FLIGHT_APP_URL || "http://127.0.0.1:5174/flights";
let searches = 0;
const passengerQueries = [];
const server = createAuthServer({ databasePath, allowedOrigins: [new URL(appUrl).origin], searchFlights: async query => {
  searches++;
  passengerQueries.push([query.adults, query.children, query.infants]);
  return { query, searchedAt: new Date().toISOString(), source: "Kiểm thử nội bộ", flights: [{ number: query.origin === "SGN" ? "VJ120" : "VJ121", aircraft: "Airbus A320", departure: "05:00", arrival: "07:10", arrivalNextDay: false, fares: [{ name: "SkyBoss Premium", amount: null }, { name: "Eco", amount: query.origin === "SGN" ? 1130000 : 1290000 }] }] };
} });
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: process.env.VIETJET_BROWSER_CHANNEL || "chrome" });
try {
  const context = await browser.newContext({ viewport: { width: 430, height: 932 } });
  const registration = await context.request.post(`${base}/api/auth/register`, { headers: { Origin: new URL(appUrl).origin }, data: { name: "Khách kiểm thử", email: "flight-selection@example.test", password: "Test-flight-selection-2026!" } });
  assert.equal(registration.status(), 201);
  const page = await context.newPage();
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: base + url.pathname + url.search });
    await route.fulfill({ response });
  });
  await page.goto(appUrl);
  assert.equal(await page.getByRole("heading", { name: "Thông tin liên hệ", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Khứ hồi", exact: true }).click();
  await page.getByLabel("Điểm đi *", { exact: true }).fill("SGN");
  await page.getByLabel("Điểm đến *", { exact: true }).fill("HAN");
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Ngày đi *", { exact: true }).fill(date);
  await page.getByLabel("Ngày về *", { exact: true }).fill(new Date(Date.now() + 172800000).toISOString().slice(0, 10));
  await page.getByLabel("Trẻ em", { exact: true }).fill("10");
  assert.equal(await page.getByLabel("Trẻ em", { exact: true }).inputValue(), "9");
  await page.getByLabel("Người lớn", { exact: true }).fill("2");
  assert.equal(await page.getByLabel("Người lớn", { exact: true }).inputValue(), "1");
  await page.getByLabel("Em bé", { exact: true }).fill("3");
  assert.equal(await page.getByLabel("Em bé", { exact: true }).inputValue(), "2");
  await page.getByLabel("Em bé", { exact: true }).fill("1");
  await page.getByLabel("Trẻ em", { exact: true }).fill("1");
  const search = page.getByRole("button", { name: "Tìm chuyến bay", exact: true });
  await search.click();
  await search.waitFor();
  assert.equal(await page.getByRole("button", { name: "Chọn VJ120 Business", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Chọn VJ120 Eco", exact: true }).click();
  const chosen = page.getByRole("region", { name: "Chuyến bay đã chọn", exact: true });
  await chosen.getByText(/VJ120/).waitFor();
  // Selecting outbound automatically displays the return list.
  await page.getByRole("button", { name: "Chọn VJ121 Eco", exact: true }).waitFor();
  assert.equal(await page.getByRole("heading", { name: "Thông tin liên hệ", exact: true }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Gửi yêu cầu đặt vé", exact: true }).count(), 0);
  const checkBefore = new DatabaseSync(databasePath);
  assert.equal(checkBefore.prepare("SELECT COUNT(*) AS n FROM bookings").get().n, 0);
  checkBefore.close();
  await page.getByRole("button", { name: "Chọn VJ121 Eco", exact: true }).click();
  await page.getByLabel("Họ và tên *", { exact: true }).fill("Khách kiểm thử");
  await page.getByLabel("Số điện thoại / Zalo *", { exact: true }).fill("0901234567");
  assert.match(await chosen.innerText(), /2\.420\.000/);
  assert.match(await chosen.innerText(), /VJ120/);
  assert.match(await chosen.innerText(), /VJ121/);
  mkdirSync(new URL("./data/vietjet-debug/", import.meta.url), { recursive: true });
  await chosen.screenshot({ path: fileURLToPath(new URL("./data/vietjet-debug/selection-preview.png", import.meta.url)) });
  const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === "/api/bookings" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Gửi yêu cầu đặt vé", exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 201);
  const { booking } = await response.json();
  assert.equal(booking.status, "received");
  assert.equal(booking.selectedFlights.length, 2);
  await page.getByRole("heading", { name: "Đã lưu yêu cầu trong app", exact: true }).waitFor();
  const db = new DatabaseSync(databasePath);
  const stored = JSON.parse(db.prepare("SELECT data FROM bookings WHERE id = ?").get(booking.id).data);
  assert.deepEqual(stored.selectedFlights, booking.selectedFlights);
  assert.deepEqual([stored.adults, stored.children, stored.infants], [1, 1, 1]);
  assert.deepEqual(passengerQueries, [[1, 1, 1], [1, 1, 1]]);
  db.close();
  // Navigate history and verify the saved flight snapshot survives form clearing.
  await page.getByRole("link", { name: "Theo dõi yêu cầu trong lịch sử →", exact: true }).click();
  const details = page.locator("details").filter({ hasText: "SGN → HAN" });
  await details.locator("summary").click();
  await details.getByText(/VJ120/).waitFor();
  await details.getByText(/VJ121/).waitFor();
  assert.equal(searches, 2, "Submitting and reading history must not call airline search");
  console.log("Passed: unavailable fares disabled, both direction selections, partial selection blocked, price summary, authenticated submit, SQLite persistence, history snapshot; no airline calls on submit.");
} finally {
  await browser.close();
  await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
  rmSync(directory, { recursive: true, force: true });
}
