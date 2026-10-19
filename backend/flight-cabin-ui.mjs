// Local UI verification with fixed search responses; no airline requests.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  let searches = 0;
  await page.route("**/api/flights/search", route => {
    searches++;
    return route.fulfill({ contentType: "application/json", body: JSON.stringify({ source: "Test", searchedAt: new Date().toISOString(), flights: [
      { number: "VJ123", aircraft: "Airbus A321", departure: "05:00", arrival: "07:10", arrivalNextDay: false, fares: [{ name: "SkyBoss Premium", amount: 4000000 }, { name: "SkyBoss", amount: 3000000 }, { name: "Deluxe", amount: 2000000 }, { name: "Eco", amount: 1000000 }] },
      { number: "VJ125", aircraft: "Airbus A321", departure: "08:00", arrival: "10:10", arrivalNextDay: false, fares: [{ name: "Business", amount: null }, { name: "Eco", amount: 1200000 }] },
    ] }) });
  });
  await page.goto(process.env.FLIGHT_APP_URL || "http://127.0.0.1:5173/flights");
  await page.getByRole("button", { name: "Khứ hồi", exact: true }).click();
  await page.getByLabel("Điểm đi *", { exact: true }).fill("HAN");
  await page.getByLabel("Điểm đến *", { exact: true }).fill("SGN");
  await page.getByLabel("Ngày đi *", { exact: true }).fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await page.getByLabel("Ngày về *", { exact: true }).fill(new Date(Date.now() + 172800000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Tìm chuyến bay", exact: true }).click();
  await page.getByRole("button", { name: /^Chiều về:/ }).waitFor();
  for (const [cabin, fare] of [["Phổ thông", "Eco"], ["Phổ thông đặc biệt", "Deluxe"], ["Thương gia", "SkyBoss"], ["Hạng nhất", "Business"]]) {
    await page.getByLabel("Hạng ghế", { exact: true }).selectOption(cabin);
    const buttons = page.getByRole("button", { name: /^Chọn VJ/ });
    const labels = await buttons.evaluateAll(items => items.map(item => item.getAttribute("aria-label")));
    assert.ok(labels.length > 0);
    assert.ok(labels.every(label => label.endsWith(` ${fare}`)), `Only ${fare} should appear`);
    if (fare === "Business") assert.equal(await page.getByRole("button", { name: "Chọn VJ125 Business", exact: true }).isDisabled(), true);
    if (fare === "Deluxe") await page.getByText("Chưa có giá Deluxe cho chuyến này.", { exact: true }).waitFor();
    await page.getByRole("button", { name: `Chọn VJ123 ${fare}`, exact: true }).click();
    // Outbound selection switches to inbound; both directions use the same filter.
    assert.ok((await buttons.evaluateAll(items => items.map(item => item.getAttribute("aria-label")))).every(label => label.endsWith(` ${fare}`)));
    assert.equal(await page.getByRole("heading", { name: "Thông tin liên hệ", exact: true }).count(), 0);
    await page.getByRole("button", { name: `Chọn VJ123 ${fare}`, exact: true }).click();
    await page.getByRole("heading", { name: "Thông tin liên hệ", exact: true }).waitFor();
    assert.match(await page.getByRole("region", { name: "Chuyến bay đã chọn", exact: true }).innerText(), new RegExp(fare));
  }
  await page.getByLabel("Hạng ghế", { exact: true }).selectOption("Phổ thông");
  await page.getByRole("region", { name: "Chuyến bay đã chọn", exact: true }).waitFor({ state: "detached" });
  assert.equal(await page.getByRole("region", { name: "Chuyến bay đã chọn", exact: true }).count(), 0);
  assert.equal(await page.getByRole("heading", { name: "Thông tin liên hệ", exact: true }).count(), 0);
  assert.equal(searches, 2, "Cabin switching filters loaded results without more airline searches");
  console.log("Passed: all four cabin filters, Business alias, missing fares, unavailable seats, both directions, selection clearing and contact visibility.");
} finally { await browser.close(); }
