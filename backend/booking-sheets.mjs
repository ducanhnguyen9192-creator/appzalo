// Durable outbox: callers enqueue inside the same transaction as the booking.
export function createBookingSheets(db, { url = process.env.BOOKING_SHEETS_URL ?? "", secret = process.env.BOOKING_SHEETS_SECRET ?? "", fetcher = fetch, now = Date.now } = {}) {
  db.exec(`CREATE TABLE IF NOT EXISTS booking_sheet_outbox (
    booking_id TEXT PRIMARY KEY REFERENCES bookings(id), payload TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0,
    synced_at INTEGER, last_error TEXT NOT NULL DEFAULT ''
  )`);
  if (url || secret) {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url) || secret.length < 32) {
      throw new Error("Configure BOOKING_SHEETS_URL (Apps Script /exec) and BOOKING_SHEETS_SECRET (at least 32 characters).");
    }
  }
  let running = false, stopped = false;
  const abort = new AbortController();
  function enqueue(booking, email) {
    db.prepare("INSERT INTO booking_sheet_outbox (booking_id, payload) VALUES (?, ?)").run(booking.id, JSON.stringify({ ...booking, customerEmail: email }));
  }
  async function flush() {
    if (!url || stopped || running) return;
    running = true;
    try {
      const rows = db.prepare("SELECT * FROM booking_sheet_outbox WHERE synced_at IS NULL AND next_attempt <= ? ORDER BY rowid LIMIT 20").all(now());
      for (const row of rows) {
        if (stopped) break;
        try {
          const response = await fetcher(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret, booking: JSON.parse(row.payload) }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) });
          const result = await response.json();
          if (!response.ok || result?.ok !== true || result.id !== row.booking_id) throw new Error("Unconfirmed delivery");
          if (!stopped) db.prepare("UPDATE booking_sheet_outbox SET synced_at = ?, last_error = '' WHERE booking_id = ?").run(now(), row.booking_id);
        } catch {
          if (!stopped) {
            const delay = Math.min(3600000, 30000 * 2 ** Math.min(row.attempts, 7));
            db.prepare("UPDATE booking_sheet_outbox SET attempts = attempts + 1, next_attempt = ?, last_error = 'delivery_failed' WHERE booking_id = ?").run(now() + delay, row.booking_id);
            console.warn("Google Sheets: booking delivery pending; will retry.");
          }
        }
      }
    } catch {
      // A temporary SQLite lock must not become an unhandled background rejection.
      if (!stopped) console.warn("Google Sheets: queue unavailable; will retry.");
    } finally { running = false; }
  }
  const timer = url ? setInterval(() => { void flush(); }, 15000) : null;
  timer?.unref();
  return { enqueue, flush, stop() { stopped = true; if (timer) clearInterval(timer); abort.abort(); } };
}
