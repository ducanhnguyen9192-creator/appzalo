import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createBookingSheets } from './booking-sheets.mjs';
import { createAuthServer } from './server.mjs';
import { once } from 'node:events';

const id = '22222222-1111-1111-1111-111111111111';
const booking = { id, fullName: '=HYPERLINK("bad")', phone: '0901234567', createdAt: 1000, origin: 'HAN', destination: 'SGN', adults: 1 };
const config = { url: 'https://script.google.com/macros/s/test/exec', secret: 's'.repeat(32) };

test('booking API exports only valid authenticated bookings, uses account email and does not resend duplicates', async t => {
  const sent = [];
  const server = createAuthServer({ databasePath: ':memory:', bookingSheets: { ...config, fetcher: async (_, options) => {
    const payload = JSON.parse(options.body); sent.push(payload);
    return { ok: true, json: async () => ({ ok: true, id: payload.booking.id }) };
  } } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const post = (path, data, cookie = '') => fetch(`http://127.0.0.1:${server.address().port}/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify(data) });
  const form = { requestKey: id, tripType: 'oneway', origin: 'HAN', destination: 'SGN', departureDate: '2099-01-01', returnDate: '', adults: 1, children: 0, infants: 0, cabin: 'Phổ thông', fullName: 'Khách thử', phone: '0901234567', note: '', customerEmail: 'forged@example.test' };
  assert.equal((await post('bookings', form)).status, 401);
  const registered = await post('auth/register', { name: 'Khách thử', email: 'real@example.test', password: 'Strong-password-2026!' });
  assert.equal(registered.status, 201);
  const cookie = registered.headers.get('set-cookie');
  assert.equal((await post('bookings', { ...form, phone: 'invalid' }, cookie)).status, 400);
  assert.equal(sent.length, 0);
  assert.equal((await post('bookings', form, cookie)).status, 201);
  assert.equal((await post('bookings', form, cookie)).status, 200);
  assert.equal(sent.length, 1); assert.equal(sent[0].booking.customerEmail, 'real@example.test');
});
function database(t) {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE bookings (id TEXT PRIMARY KEY)');
  db.prepare('INSERT INTO bookings VALUES (?)').run(id);
  t.after(() => db.close());
  return db;
}

test('outbox survives worker restart, waits before retry, and requires matching acknowledgement', async t => {
  const db = database(t);
  let clock = 1000, calls = 0;
  let worker = createBookingSheets(db, { ...config, now: () => clock, fetcher: async () => { calls++; throw new Error('offline'); } });
  worker.enqueue(booking, 'customer@example.test');
  await worker.flush();
  assert.equal(db.prepare('SELECT attempts FROM booking_sheet_outbox').get().attempts, 1);
  await worker.flush(); assert.equal(calls, 1);
  worker.stop(); clock = 31000;
  worker = createBookingSheets(db, { ...config, now: () => clock, fetcher: async (_, options) => {
    const sent = JSON.parse(options.body);
    assert.equal(sent.booking.customerEmail, 'customer@example.test');
    assert.equal(sent.secret, config.secret);
    return { ok: true, json: async () => ({ ok: true, id: 'wrong' }) };
  } });
  await worker.flush();
  assert.equal(db.prepare('SELECT synced_at FROM booking_sheet_outbox').get().synced_at, null);
  worker.stop(); clock = 91000;
  worker = createBookingSheets(db, { ...config, now: () => clock, fetcher: async () => ({ ok: true, json: async () => ({ ok: true, id }) }) });
  await worker.flush(); worker.stop();
  assert.equal(db.prepare('SELECT synced_at FROM booking_sheet_outbox').get().synced_at, clock);
});

test('disabled delivery retains queue; booking transaction rollback removes queued data', async t => {
  const db = database(t);
  const worker = createBookingSheets(db, { url: '', secret: '', fetcher: () => assert.fail('disabled') });
  db.exec('BEGIN'); worker.enqueue(booking, 'a@example.test'); db.exec('ROLLBACK');
  assert.equal(db.prepare('SELECT count(*) n FROM booking_sheet_outbox').get().n, 0);
  worker.enqueue(booking, 'a@example.test'); await worker.flush(); worker.stop();
  assert.equal(db.prepare('SELECT synced_at FROM booking_sheet_outbox').get().synced_at, null);
  assert.throws(() => createBookingSheets(db, { ...config, url: 'http://unsafe.test' }), /Configure/);
});

test('shutdown during delivery does not access a closed database', async () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE bookings (id TEXT PRIMARY KEY)');
  db.prepare('INSERT INTO bookings VALUES (?)').run(id);
  let finish;
  const worker = createBookingSheets(db, { ...config, fetcher: () => new Promise(resolve => { finish = resolve; }) });
  worker.enqueue(booking, 'a@example.test');
  const pending = worker.flush(); worker.stop(); db.close();
  finish({ ok: true, json: async () => ({ ok: true, id }) });
  await pending;
});

test('Apps Script authenticates, deduplicates, preserves staff notes and refuses unknown headers', () => {
  const rows = [];
  let locked = false;
  const range = (row, col, height, width) => ({
    setValues(values) { values.forEach((value, index) => { rows[row - 1 + index] = [...value].map(v => typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v); }); return this; },
    setFontWeight() { return this; }, setBackground() { return this; },
    getValues() { return Array.from({ length: height }, (_, i) => Array.from({ length: width }, (_, j) => rows[row - 1 + i]?.[col - 1 + j] ?? '')); },
    createTextFinder(value) { return { matchEntireCell() { return this; }, useRegularExpression() { return this; }, findNext() { return rows.slice(1).find(r => r[0] === value) || null; } }; },
  });
  const sheet = { getLastRow: () => rows.length, getMaxRows: () => 1000, getRange: range, setFrozenRows() {}, autoResizeRows() {} };
  const context = {
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ setMimeType: () => JSON.parse(value) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => config.secret }) },
    LockService: { getScriptLock: () => ({ waitLock() { locked = true; }, hasLock: () => locked, releaseLock() { locked = false; } }) },
    SpreadsheetApp: { openById: value => { assert.equal(value, '1rorIH0Ema2uM1DcpxBI35XDlJxx8nAF0TWrkBU2g32c'); return { getSheetById: value => { assert.equal(value, 0); return sheet; } }; }, flush() {} },
    Utilities: { formatDate: () => '01/01/1970 07:00:01' },
  };
  runInNewContext(readFileSync(new URL('./google-sheets/Code.gs', import.meta.url), 'utf8'), context);
  context.styleBookingSheet = () => {};
  const send = (secret = config.secret) => context.doPost({ postData: { contents: JSON.stringify({ secret, booking }) } });
  assert.equal(send('wrong').ok, false); assert.equal(rows.length, 0);
  assert.equal(send().ok, true); assert.equal(rows.length, 2);
  assert.equal(rows[1][2], booking.fullName); assert.equal(rows[1][3], '0901234567');
  assert.equal(rows[0].length, 19);
  assert.equal(rows[0].includes('Nhân viên phụ trách'), false);
  assert.equal(rows[0].includes('Ghi chú xác nhận'), false);
  assert.equal(rows[1][17], 'Chờ gọi'); rows[1][18] = '04/11/2026 16:00';
  assert.equal(send().ok, true); assert.equal(rows.length, 2); assert.equal(rows[1][18], '04/11/2026 16:00');
  rows[0][0] = 'Existing column';
  assert.equal(send().error, 'header_mismatch'); assert.equal(rows.length, 2); assert.equal(locked, false);
});

test('Sheets separates customer notes and formats current and queued legacy hold amounts', () => {
  const context = { Utilities: { formatDate: () => '28/10/2026 16:56:00' } };
  runInNewContext(readFileSync(new URL('./google-sheets/Code.gs', import.meta.url), 'utf8'), context);
  const legacy = 'Mã đặt chỗ Vietjet: YBGRJC\nPay Later - chưa thanh toán. Hạn thanh toán (VN): 16:56:00 28/10/2026\nTổng tiền hãng: 1672381 VND';
  const notes = context.bookingNotes({ note: 'Cần hành lý 23 kg\n' + legacy });
  assert.equal(notes.note, 'Cần hành lý 23 kg');
  assert.match(notes.hold, /1,672,381 VND/);
  assert.equal(notes.hold, 'Hạn thanh toán: 28/10/2026 16:56:00\nMã: YBGRJC\nTổng tiền: 1,672,381 VND');
  assert.equal(context.bookingNotes({ note: legacy }).note, '');
  assert.equal(context.bookingNotes({ note: 'Mã đặt chỗ Vietjet: khách tự ghi' }).note, 'Mã đặt chỗ Vietjet: khách tự ghi');
  const current = context.bookingNotes({ note: '123123', airlineHold: { status: 'held', pnr: 'ABC123', paymentDeadline: '2026-10-28T09:56:00Z', total: 1542781 } });
  assert.equal(current.note, '123123');
  assert.match(current.hold, /ABC123/);
  assert.match(current.hold, /1,542,781 VND/);
  assert.equal(current.hold.split('\n').length, 3);
  assert.equal(context.compactHoldText(notes.hold), notes.hold);
  assert.equal(context.formatMoneyInText('1,672,381 VND'), '1,672,381 VND');
  assert.equal(context.formatMoney(0), '0');
});

test('upgrade backs up old data, removes requested columns and preserves call times on rerun', () => {
  const context = { Utilities: { formatDate: () => '20261104 160000' } };
  runInNewContext(readFileSync(new URL('./google-sheets/Code.gs', import.meta.url), 'utf8'), context);
  const headers = runInNewContext('Array.from(HEADERS)', context);
  const oldHeaders = headers.filter(h => h !== 'Thông tin giữ chỗ');
  oldHeaders.splice(17, 0, 'Nhân viên phụ trách'); oldHeaders.push('Ghi chú xác nhận');
  const legacy = 'Mã đặt chỗ Vietjet: YBGRJC\nPay Later - chưa thanh toán. Hạn thanh toán (VN): 16:56:00 28/10/2026\nTổng tiền hãng: 1672381 VND';
  const row = oldHeaders.map(() => '');
  row[0] = id; row[13] = '1672381 VND'; row[14] = 'Cần hành lý\n' + legacy;
  row[16] = 'Đã gọi'; row[17] = 'Staff'; row[18] = '04/11/2026 16:00'; row[19] = 'Confirmed';
  const rows = [oldHeaders, row];
  let backups = 0, styled = 0, released = false;
  const sheet = {
    getLastRow: () => rows.length, getLastColumn: () => rows[0].length, getMaxRows: () => 1000,
    getParent: () => ({}),
    copyTo() { backups++; assert.equal(rows[1][0], id); return { setName() {}, getSheetId: () => backups }; },
    deleteColumn(col) { rows.forEach(row => row.splice(col - 1, 1)); },
    insertColumnAfter(col) { rows.forEach(row => row.splice(col, 0, '')); },
    getRange(row, col, height = 1, width = 1) { return {
      getValues: () => rows.slice(row - 1, row - 1 + height).map(r => r.slice(col - 1, col - 1 + width)),
      getFormulas: () => Array.from({ length: height }, () => Array(width).fill('')),
      setValue(value) { rows[row - 1][col - 1] = value.startsWith("'") ? value.slice(1) : value; },
    }; },
  };
  context.SpreadsheetApp = { openById: () => ({ getSheetById: () => sheet }), flush() {} };
  context.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() { released = true; } }) };
  context.styleBookingSheet = () => { styled++; };
  context.upgradeBookingSheet();
  assert.equal(backups, 1); assert.equal(styled, 1); assert.equal(released, true);
  assert.deepEqual(Array.from(rows[0]), Array.from(headers));
  assert.equal(rows[1][14], 'Cần hành lý'); assert.match(rows[1][15], /1,672,381 VND/);
  assert.equal(rows[1][13], '1,672,381 VND'); assert.equal(rows[1][17], 'Đã gọi');
  assert.equal(rows[1][18], '04/11/2026 16:00');
  const after = JSON.stringify(rows);
  context.upgradeBookingSheet(); assert.equal(JSON.stringify(rows), after);
  rows[0][0] = 'Unknown';
  assert.throws(() => context.upgradeBookingSheet(), /header_mismatch/);
  assert.equal(backups, 2);
});
