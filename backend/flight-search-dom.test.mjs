import test from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFlightRows } from "./flight-search.mjs";
import { readAgencyRows, chooseAgencyDate, chooseAgencyOneWay, chooseAgencyAirport } from "./vietjet-agency.mjs";

test("rendered rows preserve fare columns, midnight arrival and do not include calendar prices", async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.VIETJET_BROWSER_CHANNEL ? { channel: process.env.VIETJET_BROWSER_CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent(`<div><p>Từ 890</p><p>000 VND</p></div>
      <section><div><span><span>VJ123</span></span><div>05:30 <span>Đến</span> 07:40</div><span>Airbus A321</span></div><div><p>Hết chỗ</p><p>2,490</p><p>000 VND</p><p>1,360</p><p>000 VND</p><p>1,290</p><p>000 VND</p></div></section>
      <section><div><span>VJ167</span><div>22:45 Đến 00:55</div><span>Airbus A 321</span></div><div><p>Hết chỗ</p><p>2,490</p><p>000 VND</p><p>1,200</p><p>000 VND</p><p>1,130</p><p>000 VND</p></div></section>`);
    const rows = await page.evaluate(readFlightRows);
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0].fares, [{ name: "Business", amount: null }, { name: "SkyBoss", amount: 2490000 }, { name: "Deluxe", amount: 1360000 }, { name: "Eco", amount: 1290000 }]);
    assert.equal(rows[1].arrivalNextDay, true);
    assert.equal(rows[1].aircraft, "Airbus A321");
    await page.locator("body").evaluate(body => body.insertAdjacentHTML("beforeend", `<section><span>VJ999</span><div>12:30 Đến 14:40</div><p>1,200</p><p>000 VND</p></section>`));
    assert.equal((await page.evaluate(readFlightRows)).length, 2, "malformed/partial price rows must not look like complete fares");
  } finally { await browser.close(); }
});

test("agency parser keeps four fare columns, unavailable seats and overnight arrival", async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.VIETJET_BROWSER_CHANNEL ? { channel: process.env.VIETJET_BROWSER_CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent(`<div>Ngày rẻ nhất 890,000 VND</div><div class="list_card"><div class="fare-information_time">22:45 - 00:55</div><div class="fare-information_flight">VJ167 - Airbus A321</div><div class="fare-col"></div><div class="fare-col"><span class="card_money">2,490 <span>,000 VND</span></span></div><div class="fare-col"><span class="card_money">1,200 <span>,000 VND</span></span></div><div class="fare-col"><span class="card_money">1,130 <span>,000 VND</span></span></div></div>`);
    const rows = await page.evaluate(readAgencyRows);
    assert.equal(rows.length, 1); assert.equal(rows[0].arrivalNextDay, true); assert.equal(rows[0].number, "VJ167");
    assert.deepEqual(rows[0].fares, [{ name: "SkyBoss Premium", amount: null }, { name: "SkyBoss", amount: 2490000 }, { name: "Deluxe", amount: 1200000 }, { name: "Eco", amount: 1130000 }]);
  } finally { await browser.close(); }
});

test("agency calendar selects the requested year/month/day and handles another month", async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.VIETJET_BROWSER_CHANNEL ? { channel: process.env.VIETJET_BROWSER_CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent(`<input aria-label="Ngày đi"><button id="month" aria-label="Choose month and year">OCT 2026</button><button aria-label="Next month" onclick="document.getElementById('month').textContent='NOV 2026'; document.getElementById('day').setAttribute('aria-label','16 November 2026');">Next</button><button id="day" role="gridcell" aria-label="16 October 2026" onclick="document.querySelector('input').value=this.getAttribute('aria-label')">16</button>`);
    await chooseAgencyDate(page, "2026-11-16");
    assert.equal(await page.locator("input").inputValue(), "16 November 2026");
  } finally { await browser.close(); }
});

test("agency one-way selection works with a hidden Material radio under its label", async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.VIETJET_BROWSER_CHANNEL ? { channel: process.env.VIETJET_BROWSER_CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>label{position:relative;display:block;width:160px;height:40px;background:white}input{position:absolute;width:1px;height:1px;opacity:0}span{position:absolute;inset:0;background:white}</style><label><input type="radio" name="trip" aria-label="Khứ hồi" checked><span>Khứ hồi</span></label><label><input type="radio" name="trip" aria-label="Một chiều"><span>Một chiều</span></label>`);
    await chooseAgencyOneWay(page);
    assert.equal(await page.getByRole("radio", { name: "Một chiều", exact: true }).isChecked(), true);
    assert.equal(await page.getByRole("radio", { name: "Khứ hồi", exact: true }).isChecked(), false);
  } finally { await browser.close(); }
});

test("agency airport selection uses its owning panel when other panels duplicate the code", async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.VIETJET_BROWSER_CHANNEL ? { channel: process.env.VIETJET_BROWSER_CHANNEL } : {}) });
  try {
    const page = await browser.newPage();
    for (const attribute of ["aria-controls", "aria-owns"]) {
      await page.setContent(`<button role="combobox" aria-label="Điểm khởi hành" ${attribute}="origin-panel">Điểm khởi hành</button><div role="listbox" id="other-panel"><div role="option" onclick="throw new Error('Wrong dropdown')">Ho Chi Minh (SGN)</div></div><div role="listbox" id="origin-panel"><div role="option" onclick="document.querySelector('[role=combobox]').textContent='Ho Chi Minh (SGN)'">Ho Chi Minh (SGN)</div></div>`);
      await chooseAgencyAirport(page, "Điểm khởi hành", "SGN");
      assert.equal(await page.getByRole("combobox").innerText(), "Ho Chi Minh (SGN)");
    }
  } finally { await browser.close(); }
});
