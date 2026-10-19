import test from "node:test";
import assert from "node:assert/strict";
import { flightFareAmount, sortFlights } from "../src/utils/flight-selection.ts";

const flight = (number, departure, eco, deluxe = 1) => ({ number, departure, fares: [{ name: "Eco", amount: eco }, { name: "Deluxe", amount: deluxe }] });

test("sort uses the selected cabin and keeps unavailable fares last in either mode", () => {
  const flights = [flight("sold", "01:00", null), flight("late", "19:00", 100), flight("early", "5:30", 300), { number: "missing", departure: "00:00", fares: [{ name: "Deluxe", amount: 10 }] }, flight("free", "10:00", 0)];
  const original = [...flights];
  assert.deepEqual(sortFlights(flights, "Eco", "price").map(f => f.number), ["free", "late", "early", "missing", "sold"]);
  assert.deepEqual(sortFlights(flights, "Eco", "departure").map(f => f.number), ["early", "free", "late", "missing", "sold"]);
  assert.deepEqual(sortFlights(flights, "Deluxe", "departure").map(f => f.number), ["missing", "sold", "early", "free", "late"]);
  assert.deepEqual(flights, original);
});

test("price ties use departure time, and Business includes the provider fare alias", () => {
  assert.deepEqual(sortFlights([flight("late", "12:00", 100), flight("early", "09:00", 100)], "Eco", "price").map(f => f.number), ["early", "late"]);
  const business = { number: "business", departure: "12:00", fares: [{ name: "SkyBoss Premium", amount: 500 }] };
  assert.equal(flightFareAmount(business, "Business"), 500);
  assert.equal(flightFareAmount(business, "Eco"), null);
});
