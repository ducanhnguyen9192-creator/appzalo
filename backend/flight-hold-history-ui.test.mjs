import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import react from '@vitejs/plugin-react';
import path from 'node:path';

test('current hold stays visible until a new search, and past holds remain in history', { timeout: 120000 }, async () => {
  const server = await createServer({ configFile: false, root: process.cwd(), plugins: [react()], resolve: { alias: { '@': path.resolve('src') } }, server: { host: '127.0.0.1', port: 5198, strictPort: true, open: false, watch: null } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ headless: true, channel: process.env.TEST_BROWSER_CHANNEL || 'chrome' });
    const page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(60000);
    const booking = { id: 'hold-test', origin: 'SGN', destination: 'HAN', departureDate: '2027-01-01', tripType: 'oneway', cabin: 'economy', adults: 1, children: 0, infants: 0, status: 'received', createdAt: Date.now(), airlineHold: { status: 'held', pnr: 'TESTPNR', message: 'Đã giữ chỗ' } };
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/auth/me') ? { user: { id: 'test-user', name: 'Test', role: 'customer' } }
        : path.endsWith('/flights/search') ? { flights: Array.from({ length: 9 }, (_, index) => ({ number: `VJ${100 + index}`, aircraft: 'Airbus A321', departure: '10:00', arrival: '12:00', arrivalNextDay: false, fares: [{ name: 'Eco', amount: 900000 + index * 10000 }] })), source: 'Test', searchedAt: Date.now() }
        : path.endsWith('/bookings/hold-test') ? { booking }
        : path.endsWith('/bookings') ? { bookings: [booking], total: 1 } : [];
      return route.fulfill({ json: body });
    });
    await page.addInitScript(() => sessionStorage.setItem('firstclass.active-hold.test-user', 'hold-test'));
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    await page.goto(`${base}/flights`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => sessionStorage.getItem('firstclass.active-hold.test-user') === null);
    assert.equal(await page.getByText('TESTPNR', { exact: true }).count(), 0);
    assert.equal(await page.getByText('Giữ chỗ Vietjet thành công', { exact: true }).count(), 0);
    await page.goto(`${base}/history`, { waitUntil: 'domcontentloaded' });
    await page.locator('details summary').first().click();
    await page.getByText('TESTPNR', { exact: true }).waitFor({ state: 'visible' });
    booking.airlineHold = { status: 'processing', message: 'Đang xử lý' };
    await page.goto(`${base}/flights`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Đang giữ chỗ trên Vietjet…', { exact: true }).waitFor({ state: 'visible' });
    booking.airlineHold = { status: 'held', pnr: 'TESTPNR', message: 'Đã giữ chỗ' };
    await page.waitForFunction(() => sessionStorage.getItem('firstclass.active-hold.test-user') === null);
    await page.getByText('TESTPNR', { exact: true }).waitFor({ state: 'visible' });
    await page.locator('#flight-origin').fill('SGN');
    await page.locator('#flight-destination').fill('HAN');
    await page.locator('#flight-departureDate').fill(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'Tìm chuyến bay →', exact: true }).click();
    assert.deepEqual(await page.getByRole('alert').allTextContents(), []);
    await page.getByRole('heading', { name: /Bước 2\/3/ }).waitFor({ state: 'visible' });
    assert.equal(await page.getByText('TESTPNR', { exact: true }).count(), 0);
    await page.getByRole('article', { name: 'Chuyến VJ100', exact: true }).waitFor();
    assert.equal(await page.locator('.flight-result-card').count(), 9);
    const firstCard = page.locator('.flight-result-card').first();
    const firstBox = await firstCard.boundingBox();
    const secondBox = await page.locator('.flight-result-card').nth(1).boundingBox();
    assert.equal(firstBox.y, secondBox.y, 'desktop results should share a grid row');
    assert.ok(secondBox.x > firstBox.x, 'desktop cards should sit side by side');
    assert.equal(await page.locator('.flight-results-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 4);
    assert.ok(firstBox.height < 200, 'desktop cards should be compact without fixed square height');
    assert.ok(await firstCard.evaluate(element => element.scrollWidth <= element.clientWidth), 'desktop card must not overflow');
    assert.equal(await page.getByRole('button', { name: /Xem thêm/ }).count(), 0);
    assert.equal(await page.locator('.flight-result-card').count(), 9);
    await page.getByRole('button', { name: 'Khởi hành sớm nhất', exact: true }).click();
    assert.equal(await page.locator('.flight-result-card').count(), 9);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.flight-results-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), 1);
    assert.ok(await firstCard.evaluate(element => element.scrollWidth <= element.clientWidth), 'mobile card must not overflow');
    await page.getByRole('button', { name: 'Chọn VJ100 Eco', exact: true }).click();
    await page.getByRole('heading', { name: /Bước 3\/3/ }).waitFor();
  } finally {
    await browser?.close();
    await server.close();
  }
});

