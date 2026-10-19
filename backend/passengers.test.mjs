import test from "node:test";
import assert from "node:assert/strict";
import { validPassengers } from "../src/utils/passengers.mjs";
import { validateSearch, createFlightSearch } from "./flight-search.mjs";
import { EMPTY_FLIGHT, validateFlight, vietnamToday } from "../src/utils/flight-form.ts";

test("passenger limits allow all three groups and cap seated passengers separately from infants", () => {
  const base = { ...EMPTY_FLIGHT(), origin: "HAN", destination: "SGN", departureDate: vietnamToday(), tripType: "oneway", fullName: "Khách thử", phone: "0901234567" };
  for (const counts of [{ adults: 10, children: 0, infants: 2 }, { adults: 1, children: 9, infants: 2 }, { adults: 5, children: 5, infants: 1 }, { adults: 1, children: 1, infants: 2 }, { adults: 2, children: 0, infants: 2 }, { adults: 1, children: 1, infants: 1 }, { adults: 1, children: 0, infants: 0 }]) {
    assert.equal(validPassengers(counts), true);
    assert.deepEqual(validateFlight({ ...base, ...counts }, "oneway"), {});
    const query = validateSearch({ ...base, ...counts });
    for (const key of ["adults", "children", "infants"]) assert.equal(query[key], counts[key]);
  }
  for (const counts of [{ adults: 0, children: 2, infants: 0 }, { adults: 6, children: 5, infants: 0 }, { adults: 1, children: 0, infants: 3 }, { adults: 1, children: -1, infants: 0 }, { adults: 1.5, children: 0, infants: 0 }]) {
    assert.equal(validPassengers(counts), false);
    assert.throws(() => validateSearch({ ...base, ...counts }), { status: 400 });
  }
});

test("search caching distinguishes passenger combinations", async () => {
  const queries = [];
  const search = createFlightSearch({ run: async query => { queries.push(query); return [{ number: "VJ123" }]; } });
  const base = { origin: "HAN", destination: "SGN", departureDate: vietnamToday(), tripType: "oneway", adults: 1, children: 0, infants: 0 };
  await search(base);
  await search({ ...base, children: 1, infants: 1 });
  await search({ ...base, children: 1, infants: 1 });
  assert.equal(queries.length, 2);
  assert.equal(queries[1].children, 1);
  assert.equal(queries[1].infants, 1);
});
