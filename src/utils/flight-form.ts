export type TripType = "roundtrip" | "oneway";
export type FlightForm = { origin: string; destination: string; departureDate: string; returnDate: string; adults: number; children: number; infants: number; cabin: string; fullName: string; phone: string; note: string };
export type FlightErrors = Partial<Record<keyof FlightForm, string>>;
export const EMPTY_FLIGHT = (): FlightForm => ({ origin: "", destination: "", departureDate: "", returnDate: "", adults: 1, children: 0, infants: 0, cabin: "Phổ thông", fullName: "", phone: "", note: "" });
export const DRAFT_KEY = "firstclass.flight-draft.v1";
export function vietnamToday() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  return ["year", "month", "day"].map((part) => parts.find((value) => value.type === part)?.value).join("-");
}
export function readFlightDraft(): { form: FlightForm; tripType: TripType } | null {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (!draft || !["roundtrip", "oneway"].includes(draft.tripType) || !draft.form || typeof draft.form !== "object" || !Number.isFinite(draft.savedAt) || draft.savedAt > Date.now() || Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) return null;
    const form = EMPTY_FLIGHT();
    for (const key of Object.keys(form) as (keyof FlightForm)[]) {
      const value = draft.form[key];
      if (typeof value !== typeof form[key] || (typeof value === "string" && value.length > (key === "note" ? 2000 : 200)) || (typeof value === "number" && (!Number.isInteger(value) || value < 0 || value > 20))) return null;
    }
    return { form: Object.fromEntries(Object.keys(form).map((key) => [key, draft.form[key]])) as FlightForm, tripType: draft.tripType };
  } catch { return null; }
}
export function validateFlight(form: FlightForm, tripType: TripType): FlightErrors {
  const errors: FlightErrors = {};
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
  if (!form.origin.trim() || form.origin.length > 200) errors.origin = "Nhập điểm đi (tối đa 200 ký tự).";
  if (!form.destination.trim() || form.destination.length > 200) errors.destination = "Nhập điểm đến (tối đa 200 ký tự).";
  else if (form.origin.trim().toLowerCase() === form.destination.trim().toLowerCase()) errors.destination = "Điểm đến cần khác điểm đi.";
  if (!validDate(form.departureDate)) errors.departureDate = "Chọn ngày đi hợp lệ.";
  else if (form.departureDate < vietnamToday()) errors.departureDate = "Ngày đi phải từ hôm nay trở đi.";
  if (tripType === "roundtrip") {
    if (!validDate(form.returnDate)) errors.returnDate = "Chọn ngày về hợp lệ.";
    else if (form.returnDate < form.departureDate) errors.returnDate = "Ngày về phải sau hoặc bằng ngày đi.";
  }
  if (!Number.isInteger(form.adults) || form.adults < 1 || form.adults > 20) errors.adults = "Cần từ 1 đến 20 người lớn.";
  if (!Number.isInteger(form.children) || form.children < 0 || form.children > 20) errors.children = "Số trẻ em từ 0 đến 20.";
  if (!Number.isInteger(form.infants) || form.infants < 0 || form.infants > form.adults) errors.infants = "Mỗi em bé cần một người lớn đi cùng.";
  if (form.adults + form.children + form.infants > 20) errors.adults = "Tối đa 20 hành khách trong một yêu cầu.";
  if (!["Phổ thông", "Phổ thông đặc biệt", "Thương gia", "Hạng nhất"].includes(form.cabin)) errors.cabin = "Chọn hạng ghế hợp lệ.";
  if (form.fullName.trim().length < 2 || form.fullName.length > 100) errors.fullName = "Nhập họ tên từ 2 đến 100 ký tự.";
  if (!/^\+?[\d\s().-]{7,30}$/.test(form.phone.trim())) errors.phone = "Nhập số điện thoại hợp lệ, ví dụ 0901234567.";
  if (form.note.length > 2000) errors.note = "Ghi chú tối đa 2.000 ký tự.";
  return errors;
}
