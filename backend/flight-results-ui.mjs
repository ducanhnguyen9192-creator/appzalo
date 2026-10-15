// Local app integration checks with mocked search responses; no agency actions.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, channel: process.env.VIETJET_BROWSER_CHANNEL || "chrome" });
try {
  const page = await browser.newPage();
  const queries = [];
  let failReturn = false;
  await page.route("**/api/flights/search", async route => {
    const query = route.request().postDataJSON();
    queries.push(query);
    const returning = query.origin === "HAN";
    await route.fulfill({ status: returning && failReturn ? 502 : 200, contentType: "application/json", body: JSON.stringify(returning && failReturn ? { message: "Nguồn chiều về đang lỗi" } : { source: "Test", searchedAt: new Date().toISOString(), flights: [{ number: returning ? "VJ121" : "VJ120", aircraft: "Airbus A320", departure: "05:00", arrival: "07:10", arrivalNextDay: false, fares: [{ name: "Eco", amount: 1000000 }] }] }) });
  });
  await page.goto(process.env.FLIGHT_APP_URL || "http://127.0.0.1:5174/flights");
  await page.getByRole("button", { name: "Khứ hồi", exact: true }).click();
  await page.getByLabel("Điểm đi *", { exact: true }).fill("SGN");
  await page.getByLabel("Điểm đến *", { exact: true }).fill("HAN");
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const returnDate = new Date(Date.now() + 172800000).toISOString().slice(0, 10);
  await page.getByLabel("Ngày đi *", { exact: true }).fill(date);
  await page.getByLabel("Ngày về *", { exact: true }).fill(returnDate);
  const region = page.getByRole("region", { name: "Tìm vé Vietjet hai chiều" });
  const search = region.getByRole("button", { name: "Tìm chuyến bay", exact: true });
  await search.click();
  await search.waitFor();
  assert.deepEqual(queries.map(q => [q.origin, q.destination, q.departureDate, q.tripType]), [["SGN", "HAN", date, "oneway"], ["HAN", "SGN", returnDate, "oneway"]]);
  await region.getByRole("button", { name: /^Chiều về:/ }).click();
  await region.getByText(/VJ121/).waitFor();
  await region.getByRole("button", { name: /^Chiều đi:/ }).click();
  await region.getByText(/VJ120/).waitFor();
  failReturn = true;
  await search.click();
  await search.waitFor();
  assert.match(await region.getByRole("alert").innerText(), /Chiều về: Nguồn chiều về đang lỗi/);
  await region.getByText(/VJ120/).waitFor();
  assert.equal(await region.getByRole("button", { name: /^Chiều về:/ }).count(), 0);
  await page.getByLabel("Ngày về *", { exact: true }).fill("");
  assert.equal(await region.locator("article").count(), 0);
  const countBefore = queries.length;
  await search.click();
  assert.match(await region.getByRole("alert").innerText(), /Chọn ngày về/);
  assert.equal(queries.length, countBefore);
  console.log("Passed: reversed return route/date, direction tabs, partial failure preserves outbound, date edits clear stale results, missing return blocks search.");
} finally { await browser.close(); }
