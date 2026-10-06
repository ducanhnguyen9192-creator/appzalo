export const normalizeSearch = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");

// Every word must appear; Vietnamese accents and repeated spaces are optional.
export function matchesSearch(query: string, ...fields: (string | undefined)[]) {
  const text = normalizeSearch(fields.filter(Boolean).join(" "));
  return normalizeSearch(query).trim().split(/\s+/).every((word) => text.includes(word));
}
