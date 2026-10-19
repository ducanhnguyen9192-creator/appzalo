import { validPhone } from "./contact.mjs";
import { passengerErrors, validPassengers } from "./passengers.mjs";
export type TripType = "roundtrip" | "oneway" | "multicity";
export type FlightSegment = { origin: string; destination: string; departureDate: string };
export const MAX_FLIGHT_SEGMENTS = 6;
export const EMPTY_SEGMENT = (): FlightSegment => ({ origin: "", destination: "", departureDate: "" });
export type FlightForm = { origin: string; destination: string; departureDate: string; returnDate: string; adults: number; children: number; infants: number; cabin: string; fullName: string; phone: string; note: string; segments: FlightSegment[] };
export type FlightField = keyof FlightForm | `segments.${number}.${keyof FlightSegment}`;
export type FlightErrors = Partial<Record<FlightField, string>>;
export const EMPTY_FLIGHT = (): FlightForm => ({ origin: "", destination: "", departureDate: "", returnDate: "", adults: 1, children: 0, infants: 0, cabin: "Phổ thông", fullName: "", phone: "", note: "", segments: [EMPTY_SEGMENT(), EMPTY_SEGMENT()] });
export const DRAFT_KEY = "firstclass.flight-draft.v1";
export function vietnamToday() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return ["year", "month", "day"].map((part) => parts.find((value) => value.type === part)?.value).join("-");
}
export function readFlightDraft(): { form: FlightForm; tripType: TripType } | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (!draft || !["roundtrip", "oneway", "multicity"].includes(draft.tripType) || !draft.form || typeof draft.form !== "object" || !Number.isFinite(draft.savedAt) || draft.savedAt > Date.now() || Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) return null;
    const form = EMPTY_FLIGHT();
    if (!validPassengers(draft.form)) return null;
    for (const key of Object.keys(form) as (keyof FlightForm)[]) {
      if (key === "segments") continue;
      const value = draft.form[key];
      if (typeof value !== typeof form[key] || (typeof value === "string" && value.length > (key === "note" ? 2000 : 200)) || (typeof value === "number" && (!Number.isInteger(value) || value < 0 || value > 20))) return null;
    }
    if (draft.form.segments !== undefined) {
      if (!Array.isArray(draft.form.segments) || draft.form.segments.length < 2 || draft.form.segments.length > MAX_FLIGHT_SEGMENTS) return null;
      if (draft.form.segments.some((segment) => !segment || ["origin", "destination", "departureDate"].some((key) => typeof segment[key] !== "string" || segment[key].length > 200))) return null;
      form.segments = draft.form.segments.map(({ origin, destination, departureDate }) => ({ origin, destination, departureDate }));
    } else if (draft.tripType === "multicity") return null;
    return { form: { ...Object.fromEntries(Object.keys(form).filter((key) => key !== "segments").map((key) => [key, draft.form[key]])), segments: form.segments } as FlightForm, tripType: draft.tripType };
  } catch { return null; }
}
export function validateFlight(form: FlightForm, tripType: TripType, scope: "journey" | "all" = "all"): FlightErrors {
  const errors: FlightErrors = {};
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
  if (tripType !== "multicity") {
    if (!form.origin.trim() || form.origin.length > 200) errors.origin = "Nhập điểm đi (tối đa 200 ký tự).";
    if (!form.destination.trim() || form.destination.length > 200) errors.destination = "Nhập điểm đến (tối đa 200 ký tự).";
    else if (form.origin.trim().toLowerCase() === form.destination.trim().toLowerCase()) errors.destination = "Điểm đến cần khác điểm đi.";
    if (!validDate(form.departureDate)) errors.departureDate = "Chọn ngày đi hợp lệ.";
    else if (form.departureDate < vietnamToday()) errors.departureDate = "Ngày đi phải từ hôm nay trở đi.";
    if (tripType === "roundtrip") {
      if (!validDate(form.returnDate)) errors.returnDate = "Chọn ngày về hợp lệ.";
      else if (form.returnDate < form.departureDate) errors.returnDate = "Ngày về phải sau hoặc bằng ngày đi.";
    }
  } else {
    if (!Array.isArray(form.segments) || form.segments.length < 2 || form.segments.length > MAX_FLIGHT_SEGMENTS) errors.segments = "Hành trình đa chặng cần từ 2 đến 6 chặng.";
    else form.segments.forEach((segment, index) => {
      if (!segment.origin.trim() || segment.origin.length > 200) errors[`segments.${index}.origin`] = "Nhập điểm đi (tối đa 200 ký tự).";
      if (!segment.destination.trim() || segment.destination.length > 200) errors[`segments.${index}.destination`] = "Nhập điểm đến (tối đa 200 ký tự).";
      else if (segment.origin.trim().toLowerCase() === segment.destination.trim().toLowerCase()) errors[`segments.${index}.destination`] = "Điểm đến cần khác điểm đi.";
      if (!validDate(segment.departureDate)) errors[`segments.${index}.departureDate`] = "Chọn ngày bay hợp lệ.";
      else if (segment.departureDate < vietnamToday()) errors[`segments.${index}.departureDate`] = "Ngày bay phải từ hôm nay trở đi.";
      else if (index > 0 && segment.departureDate < form.segments[index - 1].departureDate) errors[`segments.${index}.departureDate`] = "Ngày bay phải sau hoặc bằng ngày bay chặng trước.";
    });
  }
  for (const [field, message] of Object.entries(passengerErrors(form))) if (message) errors[field as FlightField] = message;
  if (!["Phổ thông", "Phổ thông đặc biệt", "Thương gia", "Hạng nhất"].includes(form.cabin)) errors.cabin = "Chọn hạng ghế hợp lệ.";
  if (scope === "journey") return errors;
  if (form.fullName.trim().length < 2 || form.fullName.length > 100) errors.fullName = "Nhập họ tên từ 2 đến 100 ký tự.";
  if (!validPhone(form.phone.trim())) errors.phone = "Nhập số điện thoại hợp lệ, ví dụ 0901234567.";
  if (form.note.length > 2000) errors.note = "Ghi chú tối đa 2.000 ký tự.";
  return errors;
}
