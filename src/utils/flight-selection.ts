export const VIETJET_CABIN_FARES: Record<string, string> = { "Phổ thông": "Eco", "Phổ thông đặc biệt": "Deluxe", "Thương gia": "SkyBoss", "Hạng nhất": "Business" };
export const vietjetFareLabel = (name: string) => name === "SkyBoss Premium" ? "Business" : name;

export type FlightSortMode = "price" | "departure";
type SortableFlight = { number: string; departure: string; fares: { name: string; amount: number | null }[] };

export function flightFareAmount(flight: SortableFlight, requestedFare: string): number | null {
  const amounts = flight.fares.filter(fare => vietjetFareLabel(fare.name) === requestedFare && fare.amount !== null && Number.isFinite(fare.amount) && fare.amount >= 0).map(fare => fare.amount as number);
  return amounts.length ? Math.min(...amounts) : null;
}

export function sortFlights<T extends SortableFlight>(flights: T[], requestedFare: string, mode: FlightSortMode): T[] {
  const minutes = (time: string) => {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : Number.POSITIVE_INFINITY;
  };
  return [...flights].sort((a, b) => {
    const aPrice = flightFareAmount(a, requestedFare), bPrice = flightFareAmount(b, requestedFare);
    if ((aPrice === null) !== (bPrice === null)) return aPrice === null ? 1 : -1;
    const byTime = minutes(a.departure) - minutes(b.departure);
    const byPrice = (aPrice ?? 0) - (bPrice ?? 0);
    return (mode === "price" ? byPrice || byTime : byTime || byPrice) || a.number.localeCompare(b.number);
  });
}

export type SelectedFlight = {
  leg: "outbound" | "inbound";
  origin: string;
  destination: string;
  departureDate: string;
  number: string;
  aircraft: string;
  departure: string;
  arrival: string;
  arrivalNextDay: boolean;
  fareName: string;
  amount: number;
  currency: "VND";
  priceType: "displayed_fare";
  searchedAt: string;
};
