import { randomBytes } from "node:crypto";

// 32 readable characters, with no ambiguous I, O, 0 or 1.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRequestCode(db, bytes = randomBytes) {
  const existing = db.prepare("SELECT id FROM bookings WHERE id = ? UNION ALL SELECT id FROM service_requests WHERE id = ? LIMIT 1");
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = Array.from(bytes(6), byte => ALPHABET[byte & 31]).join("");
    if (!existing.get(code, code)) return code;
  }
  throw new Error("Unable to allocate a unique request code");
}
