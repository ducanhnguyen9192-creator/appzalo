import { test } from "node:test";
import assert from "node:assert/strict";
import { parseExchangeRates, formatConvertedPrice, MAX_RATE_AGE } from "../src/utils/exchange-rates.ts";

const now = Date.parse("2026-10-29T10:00:00Z");
const rows = [
  { base: "VND", quote: "USD", rate: 0.00004, date: "2026-10-29" },
  { base: "VND", quote: "JPY", rate: 0.006, date: "2026-10-29" },
];
test("conversion uses VND base, target minor units and preserves original amounts", () => {
  const rates = parseExchangeRates(rows, now);
  assert.equal(formatConvertedPrice(250000, "USD", rates, now), "$10.00");
  assert.equal(formatConvertedPrice(250000, "JPY", rates, now), `≈ ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "JPY", currencyDisplay: "code" }).format(1500)}`);
  assert.equal(rows[0].rate, 0.00004);
});
test("contact prices stay contact; zero stays zero; unknown or stale rates fall back to VND", () => {
  const rates = parseExchangeRates(rows, now);
  assert.equal(formatConvertedPrice(null, "USD", rates, now), "Giá liên hệ");
  assert.match(formatConvertedPrice(0, "USD", rates, now), /0\.00/);
  for (const code of ["VND", "EUR"]) assert.equal(formatConvertedPrice(250000, code, rates, now), "250.000 đ");
  assert.equal(formatConvertedPrice(250000, "USD", rates, now + MAX_RATE_AGE), "250.000 đ");
});
test("rejects invalid, wrong-base, expired and future rates instead of mislabeling VND amounts", () => {
  const invalid = [
    { ...rows[0], rate: -1 }, { ...rows[0], rate: 0 }, { ...rows[0], rate: Infinity },
    { ...rows[0], rate: "0.00004" }, { ...rows[0], base: "USD" },
    { ...rows[0], quote: "BAD-CODE" }, { ...rows[0], date: "2020-01-01" },
    { ...rows[0], date: "2030-01-01" }, { ...rows[0], date: "invalid" },
  ];
  assert.throws(() => parseExchangeRates(invalid, now));
  assert.throws(() => parseExchangeRates({}, now));
  assert.deepEqual(Object.keys(parseExchangeRates([...invalid, ...rows], now)), ["USD", "JPY"]);
});
