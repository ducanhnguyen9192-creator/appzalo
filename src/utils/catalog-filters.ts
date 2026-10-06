export const SORT_OPTIONS = [["newest", "Mới nhất"], ["price-asc", "Giá thấp đến cao"], ["price-desc", "Giá cao đến thấp"], ["duration-asc", "Thời lượng ngắn nhất"], ["duration-desc", "Thời lượng dài nhất"]] as const;

export function matchesBudget(price: number | null, budget: string, low: number, high: number) {
  if (!budget) return true;
  if (budget === "contact") return price === null;
  if (price === null) return false;
  return budget === "low" ? price <= low : budget === "mid" ? price > low && price <= high : budget === "high" ? price > high : true;
}

// Only interpret an explicit day unit; arbitrary admin text stays unsorted at the end.
export function durationDays(text: string): number | null {
  const match = text.match(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:ngày|days?|d)(?=\s|$|[^\p{L}\p{N}])/iu);
  return match ? Number(match[1].replace(",", ".")) : null;
}

type Sortable = { id?: number; price: number | null };
export function sortCatalog<T extends Sortable>(items: T[], sort: string, duration: (item: T) => string): T[] {
  return [...items].sort((a, b) => {
    if (sort === "price-asc" || sort === "price-desc" || sort === "duration-asc" || sort === "duration-desc") {
      const left = sort.startsWith("price") ? a.price : durationDays(duration(a));
      const right = sort.startsWith("price") ? b.price : durationDays(duration(b));
      if (left === null && right !== null) return 1;
      if (right === null && left !== null) return -1;
      if (left !== null && right !== null && left !== right) return (left - right) * (sort.endsWith("desc") ? -1 : 1);
    }
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

export function filterOptions(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi", { numeric: true }));
}
