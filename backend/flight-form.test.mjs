import { test } from "node:test";
import assert from "node:assert/strict";
import { DRAFT_KEY, EMPTY_FLIGHT, readFlightDraft, validateFlight, vietnamToday } from "../src/utils/flight-form.ts";

const validForm = () => ({ ...EMPTY_FLIGHT(), origin: "HAN", destination: "SGN", departureDate: vietnamToday(), returnDate: vietnamToday(), fullName: "Khách kiểm thử", phone: "0901234567" });

test("flight form reports missing fields, past dates and invalid passengers before login", () => {
  const missing = validateFlight(EMPTY_FLIGHT(), "roundtrip");
  for (const key of ["origin", "destination", "departureDate", "returnDate", "fullName", "phone"]) assert.ok(missing[key]);
  assert.ok(validateFlight({ ...validForm(), departureDate: "2000-01-01" }, "oneway").departureDate);
  assert.ok(validateFlight({ ...validForm(), destination: "han", infants: 2 }, "oneway").destination);
  assert.ok(validateFlight({ ...validForm(), infants: 2 }, "oneway").infants);
  assert.ok(validateFlight({ ...validForm(), adults: NaN }, "oneway").adults);
  assert.ok(validateFlight({ ...validForm(), adults: 20, children: 1 }, "oneway").adults);
});

test("valid one-way requests do not require a return date and today is accepted", () => {
  assert.deepEqual(validateFlight({ ...validForm(), returnDate: "" }, "oneway"), {});
  assert.deepEqual(validateFlight(validForm(), "roundtrip"), {});
  assert.ok(validateFlight({ ...validForm(), returnDate: "2000-01-01" }, "roundtrip").returnDate);
});

test("draft restore rejects corruption, expired data and unexpected fields", (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  let stored = "";
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem(key) { assert.equal(key, DRAFT_KEY); return stored; } } });
  t.after(() => { if (original) Object.defineProperty(globalThis, "sessionStorage", original); else delete globalThis.sessionStorage; });
  stored = JSON.stringify({ form: { ...validForm(), status: "ticketed" }, tripType: "oneway", savedAt: Date.now() });
  const restored = readFlightDraft();
  assert.equal(restored.form.origin, "HAN"); assert.equal(restored.form.status, undefined);
  stored = JSON.stringify({ form: validForm(), tripType: "oneway", savedAt: Date.now() - 25 * 60 * 60 * 1000 });
  assert.equal(readFlightDraft(), null);
  stored = JSON.stringify({ form: validForm(), tripType: "oneway" }); assert.equal(readFlightDraft(), null);
  stored = "bad-json"; assert.equal(readFlightDraft(), null);
});
