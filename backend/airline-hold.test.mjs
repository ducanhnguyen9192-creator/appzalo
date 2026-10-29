import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createAirlineHolds, holdFingerprint, parseHoldConfirmation } from './airline-hold.mjs';
import { airlinePassengerError } from '../src/utils/airline-passengers.mjs';
import { createAuthServer } from './server.mjs';

const date = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const booking = { tripType: 'oneway', origin: 'HAN', destination: 'SGN', departureDate: date, returnDate: '', adults: 1, children: 0, infants: 0, cabin: 'Phổ thông', fullName: 'Test Customer', phone: '0901234567', note: '', autoHold: true, airlineTermsAccepted: true, contactEmail: 'test@example.test', passengers: [{ type: 'adult', title: 'Ông', lastName: 'NGUYEN', firstName: 'VAN A', dateOfBirth: '1990-01-01', documentNumber: '012345678901', country: 'Vietnam' }], selectedFlights: [{ leg: 'outbound', origin: 'HAN', destination: 'SGN', departureDate: date, number: 'VJ141', departure: '05:00', arrival: '07:10', arrivalNextDay: false, aircraft: 'Airbus A321', fareName: 'Eco', amount: 1010000, currency: 'VND', priceType: 'displayed_fare', searchedAt: new Date().toISOString() }] };
const result = { pnr: 'ABC123', paymentDeadline: `${date}T16:38:00+07:00`, paymentMethod: 'pay_later' };

test('requires airline success, PNR and explicit Pay Later deadline', () => {
  assert.deepEqual(parseHoldConfirmation('ĐẶT VÉ THÀNH CÔNG\nVui lòng thanh toán trước 16:38 27/10/2026\nMã đặt chỗ ABC123'), { ...result, paymentDeadline: '2026-10-27T16:38:00+07:00' });
  for (const text of ['Mã đặt chỗ ABC123', 'ĐẶT VÉ THÀNH CÔNG Mã đặt chỗ ABC123', 'ĐẶT VÉ THÀNH CÔNG Mã đặt chỗ ABC1234']) assert.throws(() => parseHoldConfirmation(text));
});
test('validates each passenger identity and age on both travel dates', () => {
  assert.equal(airlinePassengerError(booking), '');
  assert.match(airlinePassengerError({ ...booking, passengers: [] }), /từng hành khách/);
  assert.match(airlinePassengerError({ ...booking, passengers: [{ ...booking.passengers[0], dateOfBirth: '2026-02-30' }] }), /ngày sinh không hợp lệ/);
  assert.match(airlinePassengerError({ ...booking, passengers: [{ ...booking.passengers[0], dateOfBirth: date }] }), /nhóm tuổi/);
  assert.match(airlinePassengerError({ ...booking, passengers: [{ ...booking.passengers[0], documentNumber: '' }] }), /CCCD/);
  assert.equal(holdFingerprint(booking), holdFingerprint({ ...booking, selectedFlights: booking.selectedFlights.map(f => ({ ...f, searchedAt: '2026-01-01', amount: 500 })) }));
});
test('persists success and distinguishes pre-submit failure from ambiguous submission', async () => {
  for (const mode of ['success', 'before', 'after']) {
    const db = new DatabaseSync(':memory:');
    db.exec('CREATE TABLE bookings (id TEXT PRIMARY KEY, data TEXT, updated_at INTEGER)');
    db.prepare('INSERT INTO bookings VALUES (?, ?, ?)').run('id', JSON.stringify(booking), Date.now());
    const holds = createAirlineHolds(db, async (_booking, submit) => { if (mode === 'before') throw new Error('secret upstream detail'); submit(); if (mode === 'after') throw new Error('timeout'); return result; });
    holds.register('user', 'id', booking);
    await holds.start('id', booking);
    const hold = JSON.parse(db.prepare('SELECT data FROM bookings').get().data).airlineHold;
    assert.equal(hold.status, mode === 'success' ? 'held' : mode === 'before' ? 'failed' : 'unknown');
    assert.ok(!JSON.stringify(hold).includes('secret upstream'));
    assert.equal(holds.previous('user', booking)?.id, mode === 'before' ? undefined : 'id');
    assert.equal(holds.previous('other-user', booking), undefined);
    db.close();
  }
});
test('booking API authenticates, deduplicates concurrent requests and returns persisted airline result', async () => {
  let calls = 0, finish;
  const release = new Promise(resolve => { finish = resolve; });
  const deliveries = [];
  const server = createAuthServer({ databasePath: ':memory:', mailer: null, rateLimit: 100, bookingSheets: { url: 'https://script.google.com/macros/s/test/exec', secret: 'x'.repeat(32), fetcher: async (_, options) => { const payload = JSON.parse(options.body).booking; deliveries.push(payload); return { ok: true, json: async () => ({ ok: true, id: payload.id }) }; } }, holdAgency: async (_, submit) => { calls++; submit(); await release; return result; } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, cookie) => fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const registration = await request('/api/auth/register', { name: 'Test Customer', email: 'holds@example.test', password: 'Test-password-2026!' });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get('set-cookie');
    assert.equal((await request('/api/bookings', { ...booking, requestKey: randomUUID() })).status, 401);
    const payload = { ...booking, requestKey: randomUUID() };
    const responses = await Promise.all([request('/api/bookings', payload, cookie), request('/api/bookings', payload, cookie), request('/api/bookings', { ...booking, requestKey: randomUUID() }, cookie)]);
    const records = await Promise.all(responses.map(r => r.json()));
    assert.equal(calls, 1);
    assert.equal(deliveries.length, 0);
    assert.ok(records.every(r => r.booking.id === records[0].booking.id));
    finish();
    await new Promise(resolve => setImmediate(resolve));
    const saved = await (await request(`/api/bookings/${records[0].booking.id}`, null, cookie)).json();
    assert.equal(saved.booking.airlineHold.pnr, result.pnr);
    assert.equal(saved.booking.airlineHold.status, 'held');
    assert.equal(deliveries.length, 1);
    assert.match(deliveries[0].note, /Mã đặt chỗ Vietjet: ABC123/);
    assert.equal(deliveries[0].passengers, undefined);
    assert.equal((await request(`/api/bookings/${records[0].booking.id}/retry`, {}, cookie)).status, 409);
    assert.equal((await request(`/api/bookings/${records[0].booking.id}`)).status, 401);
    const replay = await request('/api/bookings', payload, cookie);
    assert.equal(replay.status, 200);
    assert.equal(calls, 1);
    assert.equal((await request('/api/bookings', { ...payload, phone: '0909876543' }, cookie)).status, 409);
  } finally { finish(); server.close(); await once(server, 'close'); }
});
