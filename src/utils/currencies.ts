// Display currencies; catalog and booking amounts remain denominated in VND.
import currencyCodes from "../i18n/currency-codes.json";
const existingCurrencies = [
  ["VND", "Việt Nam Đồng"], ["USD", "Đô la Mỹ"], ["EUR", "Euro"],
  ["GBP", "Bảng Anh"], ["JPY", "Yên Nhật"], ["KRW", "Won Hàn Quốc"],
  ["CNY", "Nhân dân tệ Trung Quốc"], ["TWD", "Đô la Đài Loan"],
  ["HKD", "Đô la Hồng Kông"], ["SGD", "Đô la Singapore"], ["THB", "Baht Thái Lan"],
  ["MYR", "Ringgit Malaysia"], ["IDR", "Rupiah Indonesia"], ["PHP", "Peso Philippines"],
  ["INR", "Rupee Ấn Độ"], ["AED", "Dirham UAE"], ["SAR", "Riyal Ả Rập Xê-út"],
  ["AFN", "Afghani Afghanistan"], ["AMD", "Dram Armenia"], ["AZN", "Manat Azerbaijan"],
  ["AUD", "Đô la Úc"], ["NZD", "Đô la New Zealand"], ["CAD", "Đô la Canada"],
  ["CHF", "Franc Thụy Sĩ"], ["SEK", "Krona Thụy Điển"], ["NOK", "Krone Na Uy"],
  ["DKK", "Krone Đan Mạch"], ["PLN", "Złoty Ba Lan"], ["CZK", "Koruna Séc"],
  ["HUF", "Forint Hungary"], ["RON", "Leu Romania"], ["TRY", "Lira Thổ Nhĩ Kỳ"],
  ["UAH", "Hryvnia Ukraina"], ["RUB", "Rúp Nga"], ["ALL", "Lek Albania"],
  ["MKD", "Denar Bắc Macedonia"], ["BYN", "Rúp Belarus"], ["BAM", "Mark Bosnia và Herzegovina"],
  ["BRL", "Real Brazil"], ["MXN", "Peso Mexico"], ["ARS", "Peso Argentina"],
  ["XCD", "Đô la Đông Caribe"], ["AWG", "Florin Aruba"], ["BSD", "Đô la Bahamas"],
  ["BBD", "Đô la Barbados"], ["BZD", "Đô la Belize"], ["BMD", "Đô la Bermuda"],
  ["EGP", "Bảng Ai Cập"], ["DZD", "Dinar Algeria"], ["AOA", "Kwanza Angola"],
  ["XOF", "Franc CFA Tây Phi"], ["XAF", "Franc CFA Trung Phi"],
  ["BWP", "Pula Botswana"], ["BIF", "Franc Burundi"], ["ZAR", "Rand Nam Phi"],
  ["MAD", "Dirham Ma Rốc"], ["KES", "Shilling Kenya"], ["TZS", "Shilling Tanzania"],
  ["FJD", "Đô la Fiji"], ["WST", "Tala Samoa"],
] as const;

export function currencyName(code: string, language: string, fallback = code): string {
  if (language === "vi") {
    const existing = existingCurrencies.find(item => item[0] === code);
    if (existing) return existing[1];
  }
  try {
    const DisplayNames = (Intl as any).DisplayNames;
    return new DisplayNames([language], { type: "currency" }).of(code) || fallback;
  } catch { return fallback; }
}
export const currencies: ReadonlyArray<readonly [string, string]> = [
  ...existingCurrencies,
  ...currencyCodes.filter(code => !existingCurrencies.some(item => item[0] === code)).map(code => [code, currencyName(code, "vi")] as const),
];
