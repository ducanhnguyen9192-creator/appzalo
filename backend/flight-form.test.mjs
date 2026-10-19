import { test } from "node:test";
import assert from "node:assert/strict";
import { validPhone, createRequestKey } from "../src/utils/contact.mjs";
import { DRAFT_KEY, EMPTY_FLIGHT, readFlightDraft, validateFlight, vietnamToday } from "../src/utils/flight-form.ts";

const validForm = () => ({ ...EMPTY_FLIGHT(), origin: "HAN", destination: "SGN", departureDate: vietnamToday(), returnDate: vietnamToday(), fullName: "Khách kiểm thử", phone: "0901234567" });

test("contact validation requires actual digits and request keys do not need randomUUID", () => {
  for (const phone of ["-------", ".......", "( ) - .", "123-456", "1234567890123456", "090abc1234"]) {
    assert.equal(validPhone(phone), false);
    assert.ok(validateFlight({ ...validForm(), phone }, "oneway").phone);
  }
  for (const phone of ["0901234567", "+84 (90) 123-4567", " 090 123 4567 "]) assert.equal(validPhone(phone), true);
  const keys = Array.from({ length: 100 }, createRequestKey);
  assert.equal(new Set(keys).size, 100);
  for (const key of keys) assert.match(key, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});

test("flight form reports missing fields, past dates and invalid passengers before login", () => {
  const missing = validateFlight(EMPTY_FLIGHT(), "roundtrip");
  for (const key of ["origin", "destination", "departureDate", "returnDate", "fullName", "phone"]) assert.ok(missing[key]);
  assert.ok(validateFlight({ ...validForm(), departureDate: "2000-01-01" }, "oneway").departureDate);
  assert.ok(validateFlight({ ...validForm(), destination: "han", infants: 2 }, "oneway").destination);
  assert.ok(validateFlight({ ...validForm(), infants: 3 }, "oneway").infants);
  assert.ok(validateFlight({ ...validForm(), adults: NaN }, "oneway").adults);
  assert.ok(validateFlight({ ...validForm(), adults: 20, children: 1 }, "oneway").adults);
});

test("valid one-way requests do not require a return date and today is accepted", () => {
  assert.deepEqual(validateFlight({ ...validForm(), returnDate: "" }, "oneway"), {});
  assert.deepEqual(validateFlight(validForm(), "roundtrip"), {});
  assert.ok(validateFlight({ ...validForm(), returnDate: "2000-01-01" }, "roundtrip").returnDate);
});

test("journey step validates travel details without requiring contact details", () => {
  const form = { ...validForm(), fullName: "", phone: "", note: "x".repeat(2001) };
  assert.deepEqual(validateFlight(form, "oneway", "journey"), {});
  assert.deepEqual(Object.keys(validateFlight(form, "oneway")).sort(), ["fullName", "note", "phone"]);
  assert.ok(validateFlight({ ...form, departureDate: "2000-01-01" }, "oneway", "journey").departureDate);
  assert.ok(validateFlight({ ...form, returnDate: "" }, "roundtrip", "journey").returnDate);
  assert.ok(validateFlight({ ...form, segments: [] }, "multicity", "journey").segments);
});

test("multi-city validates each leg, chronology and segment count, allowing return to origin", () => {
  const form = { ...validForm(), origin: "", destination: "", departureDate: "", returnDate: "", segments: [
    { origin: "HAN", destination: "SGN", departureDate: vietnamToday() },
    { origin: "SGN", destination: "HAN", departureDate: vietnamToday() },
  ] };
  assert.deepEqual(validateFlight(form, "multicity"), {});
  for (const segments of [[], form.segments.slice(0, 1), Array(7).fill(form.segments[0])]) assert.ok(validateFlight({ ...form, segments }, "multicity").segments);
  for (const [field, value] of [["origin", ""], ["destination", "sgn"], ["departureDate", "2000-01-01"], ["departureDate", "2027-02-30"]]) {
    const invalid = { ...form, segments: [form.segments[0], { ...form.segments[1], [field]: value }] };
    assert.ok(validateFlight(invalid, "multicity")[`segments.1.${field}`]);
  }
  const outOfOrder = { ...form, segments: [{ ...form.segments[0], departureDate: "2099-01-02" }, { ...form.segments[1], departureDate: "2099-01-01" }] };
  assert.ok(validateFlight(outOfOrder, "multicity")["segments.1.departureDate"]);
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
  const legacy = validForm(); delete legacy.segments;
  stored = JSON.stringify({ form: legacy, tripType: "oneway", savedAt: Date.now() });
  assert.equal(readFlightDraft().form.segments.length, 2);
  const multi = { ...validForm(), segments: [{ origin: "HAN", destination: "SGN", departureDate: vietnamToday(), status: "forged" }, { origin: "SGN", destination: "DAD", departureDate: vietnamToday() }] };
  stored = JSON.stringify({ form: multi, tripType: "multicity", savedAt: Date.now() });
  assert.equal(readFlightDraft().tripType, "multicity");
  assert.equal(readFlightDraft().form.segments[0].status, undefined);
  assert.equal(readFlightDraft().form.segments[1].destination, "DAD");
  for (const segments of [undefined, null, [], [null, null], [{ origin: 1 }, {}], Array(7).fill(multi.segments[0])]) {
    stored = JSON.stringify({ form: { ...multi, segments }, tripType: "multicity", savedAt: Date.now() });
    assert.equal(readFlightDraft(), null);
  }
});
