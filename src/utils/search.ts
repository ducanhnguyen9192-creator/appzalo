import groups from "../pages/esims/destinations.json" with { type: "json" };
import seeds from "../i18n/seeds.json" with { type: "json" };
import contentEnglish from "../i18n/content-en.json" with { type: "json" };

const english: Record<string, string> = { ...contentEnglish, ...seeds.en };

export const normalizeSearch = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

// Every word must appear; Vietnamese accents and repeated spaces are optional.
export function matchesSearch(query: string, ...fields: (string | undefined)[]) {
  const text = normalizeSearch(fields.filter(Boolean).flatMap(field => [field, english[field!]]).filter(Boolean).join(" "));
  return normalizeSearch(query).trim().split(/\s+/).every((word) => text.includes(word));
}
const esimCountries = groups.flatMap(group => group.countries);
export function findEsimCountry(query: string) {
  const normalized = normalizeSearch(query).trim().replace(/\s+/g, " ");
  return esimCountries.find(country => [country.name, english[country.name]].filter(Boolean).some(name => normalizeSearch(name) === normalized));
}

export function matchesEsimSearch(query: string, item: { name: string; coverage: string }) {
  const normalized = normalizeSearch(query).trim().replace(/\s+/g, " ");
  const selectedCountry = findEsimCountry(normalized);
  if (selectedCountry) {
    return normalizeSearch(item.coverage).replace(/\([^)]*\)/g, "").split(/[,;\n/|]+/)
      .some(country => country.trim().replace(/\s+/g, " ") === normalizeSearch(selectedCountry.name));
  }
  return matchesSearch(query, item.name, item.coverage);
}
