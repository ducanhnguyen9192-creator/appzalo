import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { ExchangeRates, formatConvertedPrice, parseExchangeRates } from "@/utils/exchange-rates";
import { useLanguage } from "@/i18n/store";

const CACHE_KEY = "travel-usd-rates";
const CurrencyContext = createContext({ rates: {} as ExchangeRates, loading: false });

function cachedRates(): ExchangeRates {
  try { return parseExchangeRates(JSON.parse(localStorage.getItem(CACHE_KEY) || "null")); }
  catch { return {}; }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const [rates, setRates] = useState(cachedRates);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (language !== "en") return;
    let disposed = false;
    let request: AbortController | undefined;
    async function refresh() {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      setLoading(true);
      try {
        const response = await fetch("https://api.frankfurter.dev/v2/rates?base=VND&quotes=USD", { signal: controller.signal });
        if (!response.ok) throw new Error("Exchange rates unavailable");
        const rows = await response.json();
        const next = parseExchangeRates(rows);
        if (!next.USD) throw new Error("USD rate unavailable");
        if (!disposed) {
          setRates(next);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify(rows)); } catch { /* Cache is optional. */ }
        }
      } catch {
        if (!disposed) setRates(cachedRates());
      } finally {
        window.clearTimeout(timeout);
        if (!disposed) setLoading(false);
      }
    }
    void refresh();
    const interval = window.setInterval(refresh, 60 * 60 * 1000);
    return () => { disposed = true; request?.abort(); window.clearInterval(interval); };
  }, [language]);

  return <CurrencyContext.Provider value={{ rates, loading }}>{children}</CurrencyContext.Provider>;
}

export function useMoney() {
  const { language, t } = useLanguage();
  const { rates } = useContext(CurrencyContext);
  return (amount: number | null) => amount === null
    ? t("Giá liên hệ")
    : formatConvertedPrice(amount, language === "en" ? "USD" : "VND", rates, Date.now(), language);
}

export function CurrencyNotice() {
  const { language } = useLanguage();
  const { rates, loading } = useContext(CurrencyContext);
  if (language !== "en") return null;
  const available = formatConvertedPrice(1, "USD", rates).startsWith("$");
  if (available) return null;
  return <div className="currency-notice" role="status">
    {loading ? "Loading USD exchange rate. Prices currently shown in VND."
        : "USD exchange rate is unavailable. Prices are shown in VND."}
  </div>;
}
