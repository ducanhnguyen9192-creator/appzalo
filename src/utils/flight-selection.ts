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
