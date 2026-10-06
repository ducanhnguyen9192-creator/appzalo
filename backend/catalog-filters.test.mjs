import { test } from "node:test";
import assert from "node:assert/strict";
import { durationDays, matchesBudget, sortCatalog } from "../src/utils/catalog-filters.ts";

test("catalog sort keeps contact prices last in either direction and leaves source untouched", () => {
  const items = [{ id: 1, price: null }, { id: 2, price: 100 }, { id: 3, price: 200 }];
  assert.deepEqual(sortCatalog(items, "price-asc", () => "").map(i => i.id), [2, 3, 1]);
  assert.deepEqual(sortCatalog(items, "price-desc", () => "").map(i => i.id), [3, 2, 1]);
  assert.deepEqual(items.map(i => i.id), [1, 2, 3]);
});
test("budget boundaries include quoted prices without treating contact prices as zero", () => {
  assert.equal(matchesBudget(null, "low", 100, 200), false);
  assert.equal(matchesBudget(null, "contact", 100, 200), true);
  assert.equal(matchesBudget(0, "low", 100, 200), true);
  assert.equal(matchesBudget(100, "mid", 100, 200), false);
  assert.equal(matchesBudget(200, "mid", 100, 200), true);
  assert.equal(matchesBudget(201, "high", 100, 200), true);
});
test("duration sorting accepts Vietnamese and English days and keeps unrecognized text last", () => {
  assert.equal(durationDays("3 ngày 2 đêm"), 3);
  assert.equal(durationDays("90 days"), 90);
  assert.equal(durationDays("7 ngày (minh họa)"), 7);
  assert.equal(durationDays("Theo lịch khởi hành"), null);
  assert.equal(durationDays("5 GB"), null);
  const items = [{ id: 1, price: null, duration: "Theo lịch" }, { id: 2, price: null, duration: "3 ngày" }, { id: 3, price: null, duration: "5 days" }];
  assert.deepEqual(sortCatalog(items, "duration-desc", i => i.duration).map(i => i.id), [3, 2, 1]);
});
