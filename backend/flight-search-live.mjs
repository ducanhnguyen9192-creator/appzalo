// Optional live smoke check. Start the app and backend first; this uses real prices.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const browser = await chromium.launch({ headless: true, channel: process.env.VIETJET_BROWSER_CHANNEL || "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto(process.env.FLIGHT_APP_URL || "http://127.0.0.1:5174/flights");
  const roundtrip = Boolean(process.env.FLIGHT_TEST_RETURN_DATE);
  await page.getByRole("button", { name: roundtrip ? "Khứ hồi" : "Một chiều", exact: true }).click();
  await page.getByLabel("Điểm đi *", { exact: true }).fill(process.env.FLIGHT_TEST_ORIGIN || "HAN");
  await page.getByLabel("Điểm đến *", { exact: true }).fill(process.env.FLIGHT_TEST_DESTINATION || "SGN");
  const date = process.env.FLIGHT_TEST_DATE || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.getByLabel("Ngày đi *", { exact: true }).fill(date);
  if (roundtrip) await page.getByLabel("Ngày về *", { exact: true }).fill(process.env.FLIGHT_TEST_RETURN_DATE);
  const responses = [];
  page.on("response", response => { if (response.url().endsWith("/api/flights/search")) responses.push(response); });
  await page.getByRole("button", { name: "Tìm chuyến bay", exact: true }).click();
  await page.getByRole("button", { name: "Tìm chuyến bay", exact: true }).waitFor({ timeout: 250000 });
  const response = responses.at(-1);
  if (!response) throw new Error("No search response received");
  const data = await response.json();
  const legs = await Promise.all(responses.map(async item => ({ status: item.status(), ...await item.json() })));
  const directory = new URL("./data/vietjet-debug/", import.meta.url);
  mkdirSync(directory, { recursive: true });
  writeFileSync(new URL("app-result.json", directory), JSON.stringify({ status: response.status(), ...data, legs }, null, 2));
  await page.getByRole("region", { name: `Tìm vé Vietjet ${roundtrip ? "hai chiều" : "một chiều"}` }).screenshot({ path: fileURLToPath(new URL("app-result.png", directory)) });
  if (roundtrip && response.ok()) {
    if (legs.length !== 2 || legs[1].query.origin !== legs[0].query.destination || legs[1].query.destination !== legs[0].query.origin || legs[1].query.departureDate !== process.env.FLIGHT_TEST_RETURN_DATE) throw new Error("Return route/date mismatch");
    await page.getByRole("button", { name: /^Chiều về:/ }).click();
  }
  if (response.ok() && data.flights?.length) {
    await page.getByRole("heading", { name: new RegExp(`^${data.flights.length} chuyến`) }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: fileURLToPath(new URL("app-preview.png", directory)) });
  }
  if (process.env.FLIGHT_TEST_SELECT === "1" && legs.every(leg => leg.status === 200)) {
    const region = page.getByRole("region", { name: `Tìm vé Vietjet ${roundtrip ? "hai chiều" : "một chiều"}` });
    if (roundtrip) await region.getByRole("button", { name: /^Chiều đi:/ }).click();
    await region.getByRole("button", { name: /^Chọn .+ Eco$/ }).first().click();
    if (roundtrip) await region.getByRole("button", { name: /^Chọn .+ Eco$/ }).first().click();
    const chosen = page.getByRole("region", { name: "Chuyến bay đã chọn", exact: true });
    await chosen.screenshot({ path: fileURLToPath(new URL("selection-live-preview.png", directory)) });
    console.log(await chosen.innerText());
  }
  console.log(JSON.stringify({ legs: legs.map(leg => ({ status: leg.status, query: leg.query, count: leg.flights?.length, first: leg.flights?.[0], last: leg.flights?.at(-1), message: leg.message })) }));
  if (response.status() !== 200) process.exitCode = 1;
} finally { await browser.close(); }
