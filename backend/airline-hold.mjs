import { createHash } from 'node:crypto';

export function holdFingerprint(booking) {
  return createHash('sha256').update(JSON.stringify({ flights: booking.selectedFlights.map(({ origin, destination, departureDate, number, fareName }) => ({ origin, destination, departureDate, number, fareName })), passengers: booking.passengers.map(({ type, lastName, firstName, dateOfBirth, documentNumber }) => ({ type, lastName, firstName, dateOfBirth, documentNumber })) })).digest('hex');
}
export function parseHoldConfirmation(text) {
  if (!/ĐẶT VÉ THÀNH CÔNG/i.test(text)) throw new Error('Missing airline confirmation');
  const pnr = text.match(/Mã đặt chỗ\s*:?\s*([A-Z0-9]{6})\b/i)?.[1]?.toUpperCase();
  const deadline = text.match(/Vui lòng thanh toán trước\s*(\d{2}:\d{2})\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (!pnr || !deadline) throw new Error('Missing PNR or Pay Later deadline');
  return { pnr, paymentDeadline: `${deadline[4]}-${deadline[3]}-${deadline[2]}T${deadline[1]}:00+07:00`, paymentMethod: 'pay_later' };
}

// Persist before contacting the airline. An uncertain submission is NEVER replayed.
export function createAirlineHolds(db, run, { onHeld = () => {} } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS airline_holds (booking_id TEXT PRIMARY KEY REFERENCES bookings(id), user_id TEXT NOT NULL, fingerprint TEXT NOT NULL, UNIQUE(user_id, fingerprint))`);
  const save = (id, hold) => {
    const row = db.prepare('SELECT data FROM bookings WHERE id = ?').get(id);
    if (!row) return;
    db.prepare('UPDATE bookings SET data = ?, updated_at = ? WHERE id = ?').run(JSON.stringify({ ...JSON.parse(row.data), airlineHold: hold }), Date.now(), id);
  };
  return {
    previous(userId, booking) {
      const row = db.prepare('SELECT bookings.* FROM airline_holds JOIN bookings ON bookings.id = airline_holds.booking_id WHERE airline_holds.user_id = ? AND fingerprint = ?').get(userId, holdFingerprint(booking));
      return row && JSON.parse(row.data).airlineHold?.status !== 'failed' ? row : undefined;
    },
    register(userId, id, booking) {
      // A NEW request may retry only a confirmed failure before submission.
      // Same-key retries are handled by the booking API and never replayed.
      db.prepare("DELETE FROM airline_holds WHERE user_id = ? AND fingerprint = ? AND booking_id IN (SELECT id FROM bookings WHERE json_extract(data, '$.airlineHold.status') = 'failed')").run(userId, holdFingerprint(booking));
      db.prepare('INSERT INTO airline_holds VALUES (?, ?, ?)').run(id, userId, holdFingerprint(booking));
    },
    async start(id, booking) {
      let submitting = false;
      try {
        const result = await run(booking, () => { submitting = true; save(id, { status: 'submitting', message: 'Đang chờ Vietjet xác nhận mã đặt chỗ.' }); });
        if (!/^[A-Z0-9]{6}$/.test(result?.pnr ?? '') || result.paymentMethod !== 'pay_later' || !Number.isFinite(Date.parse(result.paymentDeadline))) throw new Error('Invalid airline result');
        save(id, { ...result, status: 'held', message: 'Đã giữ chỗ Vietjet — chưa thanh toán.' });
        // A Sheets outage must never turn a confirmed reservation into a retryable failure.
        try { onHeld(id); } catch { console.warn('Held booking awaits Sheets synchronization.'); }
      } catch (error) {
        save(id, { status: submitting ? 'unknown' : 'failed', message: submitting ? 'Chưa xác định kết quả từ Vietjet. Cần kiểm tra đặt chỗ trên hãng trước khi thử lại để tránh trùng.' : error.publicMessage || 'Chưa giữ được chỗ trên Vietjet. Kiểm tra phiên đại lý, thông tin khách và giá vé. Không tự gửi lại yêu cầu này.' });
      }
    },
  };
}
