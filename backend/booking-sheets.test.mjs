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
  const sheet = { getLastRow: () => rows.length, getMaxRows: () => 1000, getRange: range, setFrozenRows() {} };
  const context = {
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ setMimeType: () => JSON.parse(value) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => config.secret }) },
    LockService: { getScriptLock: () => ({ waitLock() { locked = true; }, hasLock: () => locked, releaseLock() { locked = false; } }) },
    SpreadsheetApp: { openById: value => { assert.equal(value, '1rorIH0Ema2uM1DcpxBI35XDlJxx8nAF0TWrkBU2g32c'); return { getSheetById: value => { assert.equal(value, 0); return sheet; } }; }, flush() {} },
    Utilities: { formatDate: () => '01/01/1970 07:00:01' },
  };
  runInNewContext(readFileSync(new URL('./google-sheets/Code.gs', import.meta.url), 'utf8'), context);
  const send = (secret = config.secret) => context.doPost({ postData: { contents: JSON.stringify({ secret, booking }) } });
  assert.equal(send('wrong').ok, false); assert.equal(rows.length, 0);
  assert.equal(send().ok, true); assert.equal(rows.length, 2);
  assert.equal(rows[1][2], booking.fullName); assert.equal(rows[1][3], '0901234567');
  assert.equal(rows[1][16], 'Chờ gọi'); rows[1][19] = 'Đã gọi khách';
  assert.equal(send().ok, true); assert.equal(rows.length, 2); assert.equal(rows[1][19], 'Đã gọi khách');
  rows[0][0] = 'Existing column';
  assert.equal(send().error, 'header_mismatch'); assert.equal(rows.length, 2); assert.equal(locked, false);
});
