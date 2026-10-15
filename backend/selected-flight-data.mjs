// A customer's requested itinerary and displayed price snapshot, never a ticket.
// Validation has no network calls or dependency on the airline browser.
export function selectedFlightData(value, booking) {
  if (value === undefined) return undefined;
  const invalid = () => { throw Object.assign(new Error("Chuyến đã chọn không hợp lệ hoặc không khớp hành trình. Vui lòng tìm và chọn lại."), { status: 400 }); };
  const code = text => typeof text === "string" ? text.trim().toUpperCase().match(/(?:^|\()([A-Z]{3})\)?$/)?.[1] : undefined;
  const count = booking.tripType === "roundtrip" ? 2 : 1;
  if (booking.tripType === "multicity" || !Array.isArray(value) || value.length !== count || booking.adults !== 1 || booking.children !== 0 || booking.infants !== 0) invalid();
  return ["outbound", ...(count === 2 ? ["inbound"] : [])].map(leg => {
    const matches = value.filter(item => item && item.leg === leg);
    if (matches.length !== 1) invalid();
    const item = matches[0];
    const origin = code(leg === "outbound" ? booking.origin : booking.destination);
    const destination = code(leg === "outbound" ? booking.destination : booking.origin);
    const departureDate = leg === "outbound" ? booking.departureDate : booking.returnDate;
    if (!origin || !destination || item.origin !== origin || item.destination !== destination || item.departureDate !== departureDate) invalid();
    if (typeof item.number !== "string" || !/^(VJ|VZ|QV)\d{2,5}$/.test(item.number) || typeof item.aircraft !== "string" || !item.aircraft.trim() || item.aircraft.length > 80) invalid();
    if (![item.departure, item.arrival].every(time => typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) || item.arrivalNextDay !== (item.arrival < item.departure)) invalid();
    if (!["SkyBoss Premium", "SkyBoss", "Deluxe", "Eco"].includes(item.fareName) || !Number.isSafeInteger(item.amount) || item.amount <= 0 || item.amount > 1000000000 || item.currency !== "VND" || item.priceType !== "displayed_fare") invalid();
    if (typeof item.searchedAt !== "string" || item.searchedAt.length > 40 || !Number.isFinite(Date.parse(item.searchedAt)) || Date.parse(item.searchedAt) > Date.now() + 300000) invalid();
    return { leg, origin, destination, departureDate, number: item.number, aircraft: item.aircraft.trim(), departure: item.departure, arrival: item.arrival, arrivalNextDay: item.arrivalNextDay, fareName: item.fareName, amount: item.amount, currency: "VND", priceType: "displayed_fare", searchedAt: item.searchedAt };
  });
}
