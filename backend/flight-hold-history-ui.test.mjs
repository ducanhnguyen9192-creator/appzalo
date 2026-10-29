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
    page.setDefaultTimeout(10000);
    page.setDefaultNavigationTimeout(60000);
    const booking = { id: 'hold-test', origin: 'SGN', destination: 'HAN', departureDate: '2027-01-01', tripType: 'oneway', cabin: 'economy', adults: 1, children: 0, infants: 0, status: 'received', createdAt: Date.now(), airlineHold: { status: 'held', pnr: 'TESTPNR', message: 'Đã giữ chỗ' } };
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/auth/me') ? { user: { id: 'test-user', name: 'Test', role: 'customer' } }
        : path.endsWith('/flights/search') ? { flights: [], source: 'Test', searchedAt: Date.now() }
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
  } finally {
    await browser?.close();
    await server.close();
  }
});

