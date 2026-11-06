export type ExchangeRate = { rate: number; date: string };
export type ExchangeRates = Record<string, ExchangeRate>;
export const MAX_RATE_AGE = 7 * 24 * 60 * 60 * 1000;

export function parseExchangeRates(data: unknown, now = Date.now()): ExchangeRates {
  if (!Array.isArray(data)) throw new Error("Invalid exchange rates");
  const rates: ExchangeRates = {};
  for (const row of data) {
    if (!row || row.base !== "VND" || !/^[A-Z]{3}$/.test(row.quote) || typeof row.rate !== "number" || !Number.isFinite(row.rate) || row.rate <= 0) continue;
    if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue;
    const date = Date.parse(`${row.date}T00:00:00Z`);
    if (!Number.isFinite(date) || date > now + 86400000 || now - date > MAX_RATE_AGE) continue;
    rates[row.quote] = { rate: row.rate, date: row.date };
  }
  if (!Object.keys(rates).length) throw new Error("No recent exchange rates");
  return rates;
}

export function formatConvertedPrice(amount: number | null, currency: string, rates: ExchangeRates, now = Date.now(), locale = "vi-VN") {
  if (amount === null) return "Giá liên hệ";
  const entry = rates[currency];
  const available = currency !== "VND" && entry && now - Date.parse(`${entry.date}T00:00:00Z`) <= MAX_RATE_AGE;
  if (!available) return locale.startsWith("vi") ? `${new Intl.NumberFormat(locale).format(amount)} đ` : new Intl.NumberFormat(locale, { style: "currency", currency: "VND", currencyDisplay: "code" }).format(amount);
  if (currency === "USD") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount * entry.rate);
  return `≈ ${new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code" }).format(amount * entry.rate)}`;
}
