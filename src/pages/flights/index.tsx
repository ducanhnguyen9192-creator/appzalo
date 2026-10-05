import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AccountPanel from "@/components/account-panel";
import { Account, authRequest } from "@/utils/auth";
import { Booking, BookingApiError, bookingApi } from "@/utils/bookings";
import { DRAFT_KEY, EMPTY_FLIGHT, FlightErrors, FlightForm, readFlightDraft, TripType, validateFlight, vietnamToday } from "@/utils/flight-form";
import AIRPORTS from "@/mock/airports.json";

export default function FlightSearchPage() {
  const [draft] = useState(readFlightDraft);
  const [form, setForm] = useState<FlightForm>(draft?.form ?? EMPTY_FLIGHT());
  const [tripType, setTripType] = useState<TripType>(draft?.tripType ?? "roundtrip");
  const [restored, setRestored] = useState(Boolean(draft));
  const [account, setAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [errors, setErrors] = useState<FlightErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [lastBooking, setLastBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAirport, setActiveAirport] = useState<"origin" | "destination" | null>(null);
  const sending = useRef(false);
  const requestIdentity = useRef<{ payload: string; key: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);
  const previousAccount = useRef<string | null>(null);
  const today = vietnamToday();

  async function loadAccount() {
    setAuthLoading(true); setAuthError("");
    try { setAccount(await authRequest("me")); } catch (e) { setAuthError(e instanceof Error ? e.message : "Không kiểm tra được tài khoản."); } finally { setAuthLoading(false); }
  }
  useEffect(() => { loadAccount(); }, []);
  useEffect(() => {
    if (previousAccount.current && previousAccount.current !== account?.id) {
      setForm(EMPTY_FLIGHT()); setRestored(false); setErrors({}); requestIdentity.current = null;
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    }
    previousAccount.current = account?.id ?? null;
    setLastBooking(null);
    if (account) setShowAuth(false);
  }, [account?.id]);
  useEffect(() => {
    try {
      const meaningful = Object.entries(form).some(([key, value]) => typeof value === "string" && key !== "cabin" && value.trim());
      if (meaningful) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, tripType, savedAt: Date.now() }));
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [form, tripType]);
  useEffect(() => { if (showAuth) authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [showAuth]);

  function update<K extends keyof FlightForm>(field: K, value: FlightForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }
  function clearDraft() {
    setForm(EMPTY_FLIGHT()); setTripType("roundtrip"); setErrors({}); setRestored(false); setActiveAirport(null); setSubmitError(""); requestIdentity.current = null;
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
  }
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  function suggestions(value: string) {
    const key = normalize(value.trim());
    if (!key) return [];
    return AIRPORTS.filter((airport) => /^[a-z0-9]{3}$/.test(key) ? normalize(airport.code) === key : normalize(`${airport.city} ${airport.airport}`).includes(key)).slice(0,8);
  }
  function swapAirports() {
    setForm((current) => ({ ...current, origin: current.destination, destination: current.origin }));
    setErrors((current) => ({ ...current, origin: undefined, destination: undefined })); setActiveAirport(null);
  }
  function focusField(field: string) {
    const element = formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" }); element?.focus({ preventScroll: true });
  }
  async function submitRequest() {
    if (sending.current) return;
    const nextErrors = validateFlight(form, tripType); setErrors(nextErrors); setSubmitError("");
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) { focusField(firstError); return; }
    if (authLoading) { setSubmitError("Đang kiểm tra tài khoản. Vui lòng thử gửi lại sau giây lát."); return; }
    if (!account) { setShowAuth(true); return; }
    const payload = { ...form, tripType, returnDate: tripType === "oneway" ? "" : form.returnDate };
    const serialized = JSON.stringify({ ...payload, accountId: account.id });
    if (requestIdentity.current?.payload !== serialized) {
      const bytes = Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2,"0")).join("");
      requestIdentity.current = { payload: serialized, key: `${bytes.slice(0,8)}-${bytes.slice(8,12)}-${bytes.slice(12,16)}-${bytes.slice(16,20)}-${bytes.slice(20)}` };
    }
    sending.current = true; setIsSubmitting(true);
    try {
      const result = await bookingApi<{ booking: Booking }>("bookings", { ...payload, requestKey: requestIdentity.current.key });
      clearDraft(); setLastBooking(result.booking);
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      if (e instanceof BookingApiError && e.status === 401) { previousAccount.current = null; setAccount(null); setShowAuth(true); }
      setSubmitError(e instanceof Error ? e.message : "Không gửi được yêu cầu. Dữ liệu của bạn được giữ lại, hãy thử lại.");
    } finally { sending.current = false; setIsSubmitting(false); }
  }
  const inputClass = "w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 bg-white outline-none focus:border-blue-600 disabled:bg-gray-50";
  function fieldProps(field: keyof FlightForm) { return { id: `flight-${field}`, name: field, "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `error-${field}` : undefined, disabled: isSubmitting, className: `${inputClass} ${errors[field] ? "border-red-500" : ""}` }; }
  function errorText(field: keyof FlightForm) { return errors[field] ? <p id={`error-${field}`} className="mt-1 text-sm text-red-600">{errors[field]}</p> : null; }

  return <div ref={formRef} className="flight-page p-4 pb-8 space-y-4">
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="mb-5"><h1 className="text-xl font-semibold">Yêu cầu đặt vé máy bay</h1><p className="text-sm text-gray-500 mt-2">Nhập hành trình để FirstClass kiểm tra phương án vé và liên hệ tư vấn. Gửi yêu cầu chưa phải xác nhận mua vé hay thanh toán.</p></div>
      {lastBooking && <div role="status" className="mb-5 rounded-xl bg-green-50 border border-green-200 p-4 break-words"><h2 className="font-semibold text-green-800">Đã tiếp nhận yêu cầu đặt vé</h2><p className="mt-2 text-sm">Mã yêu cầu: {lastBooking.id}</p><Link to="/history" className="inline-block mt-3 text-blue-600 text-sm font-medium">Theo dõi yêu cầu trong lịch sử →</Link></div>}
      {restored && <p role="status" className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">Đã khôi phục bản nháp trong phiên này. Bạn có thể tiếp tục nhập hoặc xóa bản nháp.</p>}
      <div className="flex gap-2 mb-5">{([ ["roundtrip", "Khứ hồi"], ["oneway", "Một chiều"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tripType === value} disabled={isSubmitting} onClick={() => { setTripType(value); if (value === "oneway") update("returnDate", ""); setErrors((current) => ({ ...current, returnDate: undefined })); }} className={`flex-1 py-3 rounded-xl text-sm font-medium ${tripType === value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>{label}</button>)}</div>
      {Object.values(errors).some(Boolean) && <div role="alert" className="mb-4 rounded-xl bg-red-50 text-red-700 p-3 text-sm">Vui lòng sửa các ô được đánh dấu bên dưới trước khi tiếp tục.</div>}
      <div className="flight-fields space-y-4">
        {([ ["origin", "Điểm đi", "Ví dụ: HAN hoặc Hà Nội"], ["destination", "Điểm đến", "Ví dụ: SGN hoặc Hồ Chí Minh"] ] as const).map(([field, label, placeholder]) => <div key={field} className={`relative ${field === "origin" ? "z-30" : "z-20"}`}><label htmlFor={`flight-${field}`} className="text-sm font-medium">{label} <span className="text-red-600">*</span></label><input {...fieldProps(field)} maxLength={200} autoComplete="off" value={form[field]} placeholder={placeholder} onFocus={() => setActiveAirport(field)} onBlur={() => setActiveAirport(null)} onChange={(e) => { update(field, e.target.value); setActiveAirport(field); }} />{errorText(field)}
          {activeAirport === field && suggestions(form[field]).length > 0 && <div className="absolute top-full mt-1 left-0 right-0 max-h-64 overflow-y-auto bg-white border rounded-xl shadow-lg z-50">{suggestions(form[field]).map((airport) => <button key={`${airport.code}-${airport.airport}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { update(field, `${airport.city} (${airport.code})`); setActiveAirport(null); }} className="w-full p-3 text-left border-b last:border-0 hover:bg-blue-50"><p className="font-medium text-sm">{airport.city} ({airport.code})</p><p className="text-xs text-gray-500 mt-1">{airport.airport}</p></button>)}</div>}
        </div>)}
        <div className="flight-swap"><button type="button" disabled={isSubmitting} className="rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-600" onClick={swapAirports}>⇄ Đảo điểm đi / điểm đến</button></div>
        <div className="grid grid-cols-2 gap-3"><div><label htmlFor="flight-departureDate" className="text-sm font-medium">Ngày đi <span className="text-red-600">*</span></label><input {...fieldProps("departureDate")} type="date" min={today} value={form.departureDate} onChange={(e) => update("departureDate", e.target.value)} />{errorText("departureDate")}</div>{tripType === "roundtrip" && <div><label htmlFor="flight-returnDate" className="text-sm font-medium">Ngày về <span className="text-red-600">*</span></label><input {...fieldProps("returnDate")} type="date" min={form.departureDate > today ? form.departureDate : today} value={form.returnDate} onChange={(e) => update("returnDate", e.target.value)} />{errorText("returnDate")}</div>}</div>
        <fieldset><legend className="text-sm font-medium">Hành khách</legend><div className="grid grid-cols-3 gap-2 mt-2">{([ ["adults", "Người lớn", "Từ 12 tuổi", 1], ["children", "Trẻ em", "2–11 tuổi", 0], ["infants", "Em bé", "Dưới 2 tuổi", 0] ] as const).map(([field, label, age, min]) => <div key={field}><label htmlFor={`flight-${field}`} className="text-xs font-medium">{label}</label><p className="text-xs text-gray-500 mt-1">{age}</p><input {...fieldProps(field)} type="number" min={min} max={20} step={1} value={Number.isFinite(form[field]) ? form[field] : ""} onChange={(e) => update(field, e.target.value === "" ? NaN : Number(e.target.value))} />{errorText(field)}</div>)}</div><p className="text-xs text-gray-500 mt-2">Tối đa 20 người. Độ tuổi được tính tại ngày bay; điều kiện cụ thể được xác nhận khi tư vấn.</p></fieldset>
        <div><label htmlFor="flight-cabin" className="text-sm font-medium">Hạng ghế</label><select {...fieldProps("cabin")} value={form.cabin} onChange={(e) => update("cabin", e.target.value)}>{["Phổ thông", "Phổ thông đặc biệt", "Thương gia", "Hạng nhất"].map((cabin) => <option key={cabin}>{cabin}</option>)}</select>{errorText("cabin")}</div>
        <div className="flight-contact border-t pt-4"><h2 className="font-semibold mb-3">Thông tin liên hệ</h2><div className="flight-contact-fields space-y-3">
          <div><label htmlFor="flight-fullName" className="text-sm font-medium">Họ và tên <span className="text-red-600">*</span></label><input {...fieldProps("fullName")} autoComplete="name" maxLength={100} value={form.fullName} placeholder="Nhập họ và tên" onChange={(e) => update("fullName", e.target.value)} />{errorText("fullName")}</div>
          <div><label htmlFor="flight-phone" className="text-sm font-medium">Số điện thoại / Zalo <span className="text-red-600">*</span></label><input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={form.phone} placeholder="Ví dụ: 0901234567" onChange={(e) => update("phone", e.target.value)} />{errorText("phone")}</div>
          <div><label htmlFor="flight-note" className="text-sm font-medium">Ghi chú (không bắt buộc)</label><textarea {...fieldProps("note")} rows={3} maxLength={2000} value={form.note} placeholder="Ví dụ: Ưu tiên chuyến sáng, cần hành lý 23 kg…" onChange={(e) => update("note", e.target.value)} />{errorText("note")}</div>
        </div></div>
        <div className="flight-auth" ref={authRef}>
          {showAuth && !account && <div className="mb-4 rounded-xl bg-blue-50 border border-blue-100 p-3"><h2 className="font-semibold">Đăng nhập để gửi và theo dõi yêu cầu</h2><p className="text-sm text-gray-600 mt-2">Hành trình và thông tin vừa nhập được giữ nguyên. Đăng nhập xong, bấm Gửi yêu cầu để xác nhận.</p><AccountPanel account={account} loading={authLoading} error={authError} onRetry={loadAccount} onChange={setAccount} /><button type="button" className="text-sm text-blue-600 underline" onClick={() => setShowAuth(false)}>Tiếp tục chỉnh sửa hành trình</button></div>}
          {account && <p className="text-sm text-gray-500 break-all">Yêu cầu được lưu cho tài khoản {account.email}.</p>}
          {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 mt-3">{submitError}</p>}
        </div>
        <button type="button" onClick={submitRequest} disabled={isSubmitting || authLoading} className="flight-submit w-full rounded-xl bg-blue-600 text-white font-semibold py-3.5 disabled:opacity-50">{isSubmitting ? "Đang gửi…" : authLoading ? "Đang kiểm tra tài khoản…" : account ? "Gửi yêu cầu đặt vé" : "Tiếp tục gửi yêu cầu"}</button>
        <div className="flight-note text-sm flex flex-wrap gap-4 justify-center"><Link to="/history" className="text-blue-600">Xem lịch sử yêu cầu</Link><Link to="/support" className="text-blue-600">Cần hỗ trợ?</Link><button type="button" disabled={isSubmitting} className="text-gray-500 underline" onClick={clearDraft}>Xóa bản nháp</button></div>
        <p className="flight-note text-xs text-gray-500 text-center">Ô có * là bắt buộc. Bản nháp lưu trong phiên trình duyệt, tối đa 24 giờ; tự xóa sau khi gửi thành công.</p>
      </div>
    </div>
  </div>;
}
