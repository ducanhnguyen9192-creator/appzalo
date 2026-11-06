import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

test('service editor preserves drafts, reports failures and saves without closing on desktop and mobile', { timeout: 90000 }, async () => {
  const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 5203, strictPort: true, open: false, watch: null } });
  let browser;
  try {
    await server.listen();
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(10000);
      let item = { id: 'SR-1', customerEmail: 'test@example.test', request: { service: width === 390 ? 'esim' : 'tour', quantity: 2, fullName: 'Khách thử', phone: '0901234567', desiredDate: '', note: 'Cần tư vấn' }, item: { name: 'Gói thử', price: 249000 }, status: 'received', response: '', createdAt: Date.now(), updatedAt: Date.now() };
      let fail = true;
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let body = {};
        if (path.endsWith('/auth/me')) body = { user: { id: 'admin', role: 'admin', name: 'Admin', email: 'admin@example.test' } };
        if (path.endsWith('/overview')) body = { customers: 0, disabled: 0, articles: 0, banners: 0 };
        if (path.endsWith('/service-requests')) body = { requests: [item], total: 1 };
        if (path.endsWith('/service-requests/status')) {
          if (fail) return route.fulfill({ status: 500, json: { error: 'Lỗi lưu thử nghiệm' } });
          item = { ...item, ...route.request().postDataJSON() };
        }
        return route.fulfill({ json: body });
      });
      await page.goto('http://127.0.0.1:5203/admin');
      if (width === 390) await page.getByLabel('Chọn mục quản trị').selectOption('services');
      else await page.getByRole('button', { name: 'Yêu cầu tour/eSIM', exact: true }).click();
      const trigger = page.getByRole('button', { name: 'Xem / xử lý', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      assert.equal(await dialog.locator('a[href="tel:0901234567"]').count(), 1);
      await dialog.getByRole('combobox', { name: /^Trạng thái yêu cầu/ }).selectOption('quoted');
      await dialog.getByLabel('Phản hồi cho khách hàng').fill('Báo giá thử nghiệm');
      page.once('dialog', d => d.dismiss());
      await page.keyboard.press('Escape');
      assert.equal(await dialog.getByLabel('Phản hồi cho khách hàng').inputValue(), 'Báo giá thử nghiệm');
      await dialog.getByRole('button', { name: 'Lưu trạng thái & phản hồi' }).click();
      await dialog.getByRole('alert').waitFor();
      assert.equal(await dialog.getByLabel('Phản hồi cho khách hàng').inputValue(), 'Báo giá thử nghiệm');
      fail = false;
      await dialog.getByRole('button', { name: 'Lưu trạng thái & phản hồi' }).click();
      await dialog.getByText('Đã cập nhật trạng thái và phản hồi. Khách hàng có thể xem trong lịch sử.', { exact: true }).waitFor();
      assert.equal(item.status, 'quoted');
      assert.equal(item.response, 'Báo giá thử nghiệm');
      assert.equal(await dialog.getByRole('button', { name: 'Lưu trạng thái & phản hồi' }).isDisabled(), true);
      assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth));
      await dialog.getByRole('button', { name: 'Đóng cửa sổ chỉnh sửa' }).click();
      await trigger.click();
      assert.equal(await dialog.getByLabel('Phản hồi cho khách hàng').inputValue(), 'Báo giá thử nghiệm');
      await page.close();
    }
  } finally { await browser?.close(); await server.close(); }
});
