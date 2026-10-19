import { FlightSearchError } from "./flight-search.mjs";

export const AGENCY_URL = "https://agents2.vietjetair.com/booking";
let activeSession;
const loginRequired = () => new FlightSearchError(503, "Nguồn giá đại lý chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ FirstClass.", "VIETJET_AGENT_LOGIN_REQUIRED");

// Extract rendered fares only. Empty columns mean unavailable, not a zero fare.
export function readAgencyRows() {
  const names = ["SkyBoss Premium", "SkyBoss", "Deluxe", "Eco"];
  const rows = [];
  for (const row of document.querySelectorAll(".list_card")) {
    const flight = row.querySelector(".fare-information_flight")?.textContent.match(/\b((?:VJ|VZ|QV)\d{2,5})\s*-\s*(.+)/);
    const time = row.querySelector(".fare-information_time")?.textContent.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    const columns = [...row.querySelectorAll(".fare-col")];
    if (!flight || !time || columns.length !== 4) continue;
    const fares = columns.map((column, index) => {
      const text = column.querySelector(".card_money")?.textContent ?? "";
      const price = text.match(/([\d,.]+)\s*,000\s*VND/);
      return { name: names[index], amount: price ? Number(price[1].replace(/\D/g, "")) * 1000 : null };
    });
    if (!fares.some(fare => Number.isSafeInteger(fare.amount) && fare.amount > 0)) continue;
    rows.push({ number: flight[1], aircraft: flight[2].trim(), departure: time[1], arrival: time[2], arrivalNextDay: time[2] < time[1], fares });
  }
  return [...new Map(rows.map(row => [row.number, row])).values()];
}

export async function startAgencyBrowser({ channel = process.env.VIETJET_BROWSER_CHANNEL ?? "chrome", headless = Boolean(process.env.VIETJET_AGENT_USERNAME && process.env.VIETJET_AGENT_PASSWORD) } = {}) {
  if (activeSession && !activeSession.page.isClosed()) return activeSession;
  if (activeSession) await activeSession.close().catch(() => {});
  const { chromium } = await import("playwright");
  // Credentials stay server-side; browser sessions are never exported to disk.
  const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless });
  const context = await browser.newContext({ locale: "vi-VN", timezoneId: "Asia/Ho_Chi_Minh", viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const session = { page, browser, close: () => browser.close() };
  activeSession = session;
  browser.on("disconnected", () => { if (activeSession === session) activeSession = undefined; });
  await page.goto(AGENCY_URL, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(async error => { await browser.close(); throw error; });
  return session;
}

export async function ensureAgencyLogin(session, { username = process.env.VIETJET_AGENT_USERNAME, password = process.env.VIETJET_AGENT_PASSWORD, now = Date.now } = {}) {
  const { page } = session;
  const search = page.getByRole("radio", { name: "Một chiều", exact: true });
  const account = page.getByRole("textbox", { name: "Tài khoản", exact: true });
  await Promise.any([search.waitFor(), account.waitFor()]).catch(() => { throw loginRequired(); });
  if (await search.isVisible()) return;
  if (!username || !password) throw loginRequired();
  // Never fill credentials into a redirected third-party page.
  if (new URL(page.url()).origin !== new URL(AGENCY_URL).origin) throw loginRequired();
  if (session.loginRetryAt > now()) throw loginRequired();
  session.loginRetryAt = now() + 60000;
  try {
    await account.fill(username);
    await page.getByLabel("Mật khẩu", { exact: false }).fill(password);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await search.waitFor({ timeout: 20000 });
    session.loginRetryAt = 0;
  } catch {
    // Do not expose Playwright call logs, credentials or airline login errors.
    throw loginRequired();
  }
}

export async function chooseAgencyDate(page, date) {
  const target = new Date(`${date}T00:00:00Z`);
  const label = target.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  await page.getByRole("textbox", { name: "Ngày đi", exact: true }).click();
  for (let step = 0; step < 13; step++) {
    const day = page.getByRole("gridcell", { name: label, exact: true });
    if (await day.count()) { await day.click(); return; }
    const heading = await page.getByRole("button", { name: "Choose month and year", exact: true }).innerText();
    const current = new Date(`1 ${heading}`).getTime();
    if (!Number.isFinite(current)) throw new Error("Agency calendar format changed");
    await page.getByRole("button", { name: current < +target ? "Next month" : "Previous month", exact: true }).click();
  }
  throw new Error("Agency date not found");
}

export async function chooseAgencyOneWay(page) {
  // Material radio inputs are visually hidden beneath a label. Click the
  // visible label, then verify the input state instead of forcing the input.
  await page.getByText("Một chiều", { exact: true }).click();
  if (!(await page.getByRole("radio", { name: "Một chiều", exact: true }).isChecked())) throw new Error("Agency one-way selection failed");
}

export async function chooseAgencyAirport(page, label, code) {
  const field = page.getByRole("combobox", { name: new RegExp(`^${label}`) });
  await field.click();
  // Material can keep the other select's options in the DOM. The owning panel
  // identifies the opened dropdown, even when the same code appears elsewhere.
  const panelId = await field.getAttribute("aria-controls") || await field.getAttribute("aria-owns");
  if (panelId && !/^[\w-]+$/.test(panelId)) throw new Error("Agency airport panel changed");
  const panel = panelId ? page.locator(`#${panelId}`) : page.getByRole("listbox").filter({ visible: true });
  await panel.getByRole("option", { name: new RegExp(`\\(${code}\\)$`) }).click();
  if (!(await field.innerText()).includes(`(${code})`)) throw new Error("Agency airport selection failed");
}

export async function chooseAgencyPassengers(page, query) {
  const summary = page.getByRole("button", { name: /Hành khách/ });
  await summary.click();
  const addButtons = page.locator("button").filter({ hasText: /^\s*add\s*$/ });
  await addButtons.first().waitFor();
  if (await addButtons.count() !== 3) throw new Error("Agency passenger controls changed");
  const targets = [query.adults, query.children, query.infants];
  // Remove old passengers first, so a previous search cannot constrain the next.
  for (const direction of [-1, 1]) {
    for (const index of direction === -1 ? [2, 1, 0] : [0, 1, 2]) {
      const row = addButtons.nth(index).locator("..");
      const count = async () => Number((await row.locator(":scope > div").innerText()).trim());
      for (let step = 0; step < 10; step++) {
        const current = await count();
        if (!Number.isInteger(current)) throw new Error("Agency passenger count unavailable");
        if (direction === -1 ? current <= targets[index] : current >= targets[index]) break;
        const button = row.locator("button").filter({ hasText: direction === -1 ? /^\s*remove\s*$/ : /^\s*add\s*$/ });
        if (await button.isDisabled()) throw new FlightSearchError(400, "Vietjet chưa chấp nhận tổ hợp hành khách này. Vui lòng điều chỉnh số khách hoặc liên hệ tư vấn.");
        await button.click();
        await page.waitForFunction(({ index, expected }) => {
          const buttons = [...document.querySelectorAll("button")].filter(button => button.textContent.trim() === "add");
          return Number(buttons[index]?.parentElement.querySelector(":scope > div")?.textContent.trim()) === expected;
        }, { index, expected: current + direction });
      }
      if (direction === 1 && await count() !== targets[index]) throw new Error("Agency passenger count mismatch");
    }
  }
  await summary.click();
  const text = await summary.innerText();
  for (const [count, label] of [[query.adults, "Người lớn"], [query.children, "Trẻ em"], [query.infants, "Em bé"]]) {
    if (!new RegExp(`\\b${count}\\s+${label}`, "i").test(text)) throw new Error("Agency passenger summary mismatch");
  }
}

export async function searchAgency(query, session = activeSession) {
  if ((!session || session.page.isClosed()) && process.env.VIETJET_AGENT_USERNAME && process.env.VIETJET_AGENT_PASSWORD) {
    try { session = await startAgencyBrowser(); }
    catch { throw loginRequired(); }
  }
  if (!session || session.page.isClosed()) throw loginRequired();
  const { page } = session;
  let timer;
  const deadline = new Promise((_, reject) => { timer = setTimeout(() => { void page.close().catch(() => {}); reject(new FlightSearchError(504, "Tìm vé đại lý quá lâu. Vui lòng thử lại sau.")); }, 90000); });
  const work = async () => {
    await page.goto(AGENCY_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await ensureAgencyLogin(session);
    await chooseAgencyOneWay(page);
    for (const [label, code] of [["Điểm khởi hành", query.origin], ["Điểm đến", query.destination]]) {
      await chooseAgencyAirport(page, label, code);
    }
    await chooseAgencyDate(page, query.departureDate);
    await chooseAgencyPassengers(page, query);
    // Only a search is submitted; no passenger, booking or payment steps run.
    await page.getByRole("button", { name: "Tìm chuyến bay", exact: true }).click();
    await page.locator(".list_card .fare-information_flight").first().waitFor({ timeout: 35000 });
    const route = new RegExp(`Chuyến đi\\s*\\(${query.origin}-${query.destination}\\)`);
    await page.getByText(route).waitFor();
    const rows = new Map();
    let stable = 0;
    for (let step = 0; step < 45; step++) {
      (await page.evaluate(readAgencyRows)).forEach(row => rows.set(row.number, row));
      const before = rows.size;
      const bottom = await page.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 5);
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(600);
      (await page.evaluate(readAgencyRows)).forEach(row => rows.set(row.number, row));
      stable = bottom && rows.size === before ? stable + 1 : 0;
      if (stable >= 3 && rows.size) return [...rows.values()].sort((a, b) => a.departure.localeCompare(b.departure));
    }
    throw new Error("Agency flight list did not finish loading");
  };
  try { return await Promise.race([work(), deadline]); }
  catch (error) {
    if (error instanceof FlightSearchError) throw error;
    if (page.isClosed() || new URL(page.url()).pathname.includes("login")) throw loginRequired();
    console.error("Agency search:", error.message);
    throw new FlightSearchError(502, "Chưa tải được đầy đủ kết quả đại lý Vietjet. Vui lòng thử lại sau.");
  } finally { clearTimeout(timer); }
}
