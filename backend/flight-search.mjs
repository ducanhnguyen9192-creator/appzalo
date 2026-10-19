import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validPassengers } from "../src/utils/passengers.mjs";

const airports = JSON.parse(readFileSync(new URL("../src/mock/airports.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
export class FlightSearchError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

// Observe the real response status, including responses hidden from page JS by
// CORS. This reads network metadata only; it does not change browser security.
export function watchVietjetAccess(session) {
  const ids = new Set(), statuses = new Map();
  let resolveFailure;
  const failure = new Promise(resolve => { resolveFailure = resolve; });
  function inspect(id) {
    if (ids.has(id) && statuses.has(id)) resolveFailure(new FlightSearchError(503, "Hiện chưa kết nối được nguồn giá Vietjet. Vui lòng thử lại sau hoặc tra cứu trên website hãng.", "VIETJET_ACCESS_DENIED"));
  }
  function onRequest(event) {
    try {
      const url = new URL(event.request.url);
      if (url.origin === "https://vietjet-api.vietjetair.com" && url.pathname === "/booking/api/v1/search-flight") { ids.add(event.requestId); inspect(event.requestId); }
    } catch {}
  }
  function onStatus(event) {
    if ([401, 403, 429].includes(event.statusCode)) {
      statuses.set(event.requestId, event.statusCode);
      if (statuses.size > 100) statuses.delete(statuses.keys().next().value);
      inspect(event.requestId);
    }
  }
  session.on("Network.requestWillBeSent", onRequest);
  session.on("Network.responseReceivedExtraInfo", onStatus);
  return { failure, dispose() { session.off("Network.requestWillBeSent", onRequest); session.off("Network.responseReceivedExtraInfo", onStatus); } };
}
export function validateSearch(body, today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())) {
  const { origin, destination, departureDate } = body;
  const codes = new Set(airports.map(a => a.code));
  if (body.tripType !== "oneway" || !validPassengers(body)) throw new FlightSearchError(400, "Tổng người lớn và trẻ em tối đa 10, có ít nhất 1 người lớn; em bé tối đa 2.");
  if (!codes.has(origin) || !codes.has(destination) || origin === destination) throw new FlightSearchError(400, "Chọn hai sân bay khác nhau từ danh sách gợi ý.");
  const date = new Date(`${departureDate}T00:00:00Z`);
  if (typeof departureDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || !Number.isFinite(+date) || date.toISOString().slice(0, 10) !== departureDate || departureDate < today || +date - +new Date(`${today}T00:00:00Z`) > 330 * 86400000) throw new FlightSearchError(400, "Ngày đi phải từ hôm nay đến tối đa 330 ngày tới.");
  return { origin, destination, departureDate, tripType: "oneway", adults: body.adults, children: body.children, infants: body.infants };
}

// Runs in the browser. Read rendered flight rows, never marketing/calendar prices.
export function readFlightRows() {
  const result = [];
  for (const el of document.querySelectorAll("span")) {
    const number = el.textContent.trim();
    if (!/^(VJ|VZ)\d{2,5}$/.test(number) || [...el.children].some(c => c.textContent.trim() === number)) continue;
    let row = el.parentElement;
    while (row && !(/\d{2}:\d{2}\s*Đến\s*\d{2}:\d{2}/.test(row.textContent) && /000\s*VND/.test(row.textContent))) row = row.parentElement;
    if (!row || /V[JZ]\d+[\s\S]*V[JZ]\d+/.test(row.textContent)) continue;
    const time = row.textContent.match(/(\d{2}:\d{2})\s*Đến\s*(\d{2}:\d{2})/);
    const values = [...row.querySelectorAll("p")].map(p => p.textContent.trim());
    const fares = [];
    const names = ["Business", "SkyBoss", "Deluxe", "Eco"];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === "Hết chỗ") fares.push({ name: names[fares.length], amount: null });
      else if (/^[\d,.]+$/.test(values[i]) && /^000\s*VND$/.test(values[i + 1] ?? "")) {
        fares.push({ name: names[fares.length], amount: Number(values[i].replace(/\D/g, "")) * 1000 }); i++;
      }
    }
    if (!time || fares.length !== 4 || fares.some(f => f.amount !== null && (!Number.isSafeInteger(f.amount) || f.amount <= 0))) continue;
    result.push({ number, departure: time[1], arrival: time[2], arrivalNextDay: time[2] < time[1], aircraft: row.textContent.match(/Airbus\s*A\s*\d{3}/)?.[0].replace(/A\s+(\d)/, "A$1") ?? "", fares });
  }
  return [...new Map(result.map(f => [f.number, f])).values()];
}

export function createFlightSearch({ run = async query => (await import("./vietjet-agency.mjs")).searchAgency(query), now = Date.now } = {}) {
  let busy = false;
  const cache = new Map();
  return async body => {
    const query = validateSearch(body);
    const key = JSON.stringify(query);
    const previous = cache.get(key);
    if (previous && now() - previous.savedAt < 60000) return previous.result;
    if (busy) throw new FlightSearchError(429, "Đang có lượt tìm vé khác. Vui lòng thử lại sau giây lát.");
    busy = true;
    try {
      const flights = await run(query);
      // The upstream UI has returned false empty results in observed sessions.
      if (!Array.isArray(flights) || !flights.length) throw new FlightSearchError(502, "Vietjet chưa trả về danh sách xác thực. Vui lòng thử lại; chưa thể kết luận hết chuyến.");
      const result = { query, source: "Vietjet (đại lý)", sourceUrl: "https://agents2.vietjetair.com/booking", currency: "VND", priceType: "displayed_fare", searchedAt: new Date(now()).toISOString(), flights };
      cache.set(key, { savedAt: now(), result });
      if (cache.size > 30) cache.delete(cache.keys().next().value);
      return result;
    } finally { busy = false; }
  };
}

async function chooseAirport(page, index, code) {
  const input = page.getByRole("textbox").nth(index);
  await input.fill(code);
  await input.click();
  await page.getByText(code, { exact: true }).filter({ visible: true }).last().click();
  await input.waitFor({ state: "visible" });
  if (!(await input.inputValue()).includes(`(${code})`)) throw new Error("Airport selection failed");
}

async function chooseDate(page, date) {
  const header = page.getByText(/^[Tt]háng\s+\d{1,2}\s+\d{4}$/).first();
  // Destination selection opens the calendar after a React transition. Wait
  // for that transition before clicking, otherwise the click closes it again.
  await header.waitFor({ state: "visible", timeout: 2000 }).catch(async () => {
    await page.getByRole("button", { name: /^Ngày đi/ }).click();
  });
  const [year, month, day] = date.split("-").map(Number);
  const target = year * 12 + month - 1;
  for (let step = 0; step < 13; step++) {
    await header.waitFor();
    const match = (await header.innerText()).match(/(\d{1,2})\s+(\d{4})/);
    const current = Number(match[2]) * 12 + Number(match[1]) - 1;
    if (current === target || current + 1 === target) {
      // Both months have their own day buttons; dates in the trailing/leading
      // month are disabled. Filter those before choosing the target month.
      const candidates = page.getByRole("button", { name: String(day), exact: true }).filter({ visible: true });
      const enabled = [];
      for (const item of await candidates.all()) if (await item.isEnabled()) enabled.push(item);
      await enabled[current === target ? 0 : enabled.length - 1].click();
      const label = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
      await page.getByRole("button", { name: `Ngày đi ${label}`, exact: true }).waitFor();
      return;
    }
    // The calendar's two navigation buttons immediately precede its month header.
    let calendar = header.locator("..");
    for (let level = 0; level < 5 && await calendar.getByRole("button").filter({ has: page.locator("svg") }).count() < 2; level++) calendar = calendar.locator("..");
    const arrows = calendar.getByRole("button").filter({ has: page.locator("svg") });
    if (await arrows.count() !== 2) throw new Error("Calendar navigation changed");
    await arrows.nth(current < target ? 1 : 0).click();
  }
  throw new Error("Date selection failed");
}

export async function searchVietjet(query) {
  let browser;
  let page;
  let timedOut = false;
  let timer;
  let access;
  const networkErrors = [];
  const browserErrors = [];
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true, ...(process.env.VIETJET_BROWSER_CHANNEL ? { channel: process.env.VIETJET_BROWSER_CHANNEL } : {}) });
    timer = setTimeout(() => { timedOut = true; void browser.close().catch(() => {}); }, 120000);
    const context = await browser.newContext({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", viewport: { width: 1366, height: 900 } });
    page = await context.newPage();
    const session = await context.newCDPSession(page);
    access = watchVietjetAccess(session);
    await session.send("Network.enable");
    page.on("console", message => {
      if (message.type() === "error" && /CORS|Access-Control|net::|certificate/i.test(message.text())) browserErrors.push(message.text().replace(/https?:\/\/[^\s'"<>]+/g, value => { try { const url = new URL(value); return `${url.origin}${url.pathname}`; } catch { return "[URL]"; } }));
    });
    const publicPath = request => { const url = new URL(request.url()); return `${url.origin}${url.pathname}`; };
    page.on("requestfailed", request => {
      if (["xhr", "fetch"].includes(request.resourceType())) networkErrors.push({ url: publicPath(request), error: request.failure()?.errorText });
    });
    page.on("response", response => {
      if (response.status() >= 400 && ["xhr", "fetch"].includes(response.request().resourceType())) networkErrors.push({ url: publicPath(response.request()), status: response.status() });
    });
    page.setDefaultTimeout(15000);
    await page.goto("https://www.vietjetair.com/vi", { waitUntil: "domcontentloaded", timeout: 30000 });
    const rejectCookies = page.getByRole("button", { name: "Từ chối tất cả", exact: true });
    await rejectCookies.waitFor({ state: "visible", timeout: 4000 }).then(() => rejectCookies.click()).catch(() => {});
    await page.getByRole("radio", { name: "Một chiều", exact: true }).check();
    await chooseAirport(page, 0, query.origin);
    await chooseAirport(page, 1, query.destination);
    await chooseDate(page, query.departureDate);
    await page.getByRole("button", { name: "Tìm chuyến bay", exact: true }).filter({ visible: true }).last().click();
    await page.waitForURL("**/select-flight", { timeout: 30000 });
    await Promise.race([
      page.waitForFunction(() => [...document.querySelectorAll("span")].some(el => /^(VJ|VZ)\d{2,5}$/.test(el.textContent.trim())), null, { timeout: 40000 }),
      access.failure.then(error => { throw error; }),
    ]);
    const collected = new Map();
    let stable = 0;
    for (let step = 0; step < 45; step++) {
      const rows = await page.evaluate(readFlightRows);
      rows.forEach(row => collected.set(row.number, row));
      const atBottom = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5);
      const before = collected.size;
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(600);
      (await page.evaluate(readFlightRows)).forEach(row => collected.set(row.number, row));
      stable = atBottom && before === collected.size ? stable + 1 : 0;
      if (stable >= 3) return [...collected.values()].sort((a, b) => a.departure.localeCompare(b.departure));
    }
    throw new Error("Flight list did not finish loading");
  } catch (error) {
    if (process.env.VIETJET_DEBUG_DIR && page && !page.isClosed()) {
      const directory = process.env.VIETJET_DEBUG_DIR;
      mkdirSync(directory, { recursive: true });
      await page.screenshot({ path: join(directory, "search-error.png"), fullPage: true }).catch(() => {});
      await page.locator("body").innerText().then(text => writeFileSync(join(directory, "search-error.txt"), text)).catch(() => {});
      writeFileSync(join(directory, "search-diagnostic.json"), JSON.stringify({ query, error: error.message, code: error.code, networkErrors, browserErrors }, null, 2));
    }
    console.error("Vietjet search:", timedOut ? "Timed out" : error.message);
    if (error instanceof FlightSearchError) throw error;
    throw new FlightSearchError(502, "Chưa tải được đầy đủ kết quả từ Vietjet. Vui lòng thử lại sau.");
  } finally {
    clearTimeout(timer);
    access?.dispose();
    await browser?.close().catch(() => {});
  }
}
