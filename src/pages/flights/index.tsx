import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AccountPanel from "@/components/account-panel";
import { Account, authRequest } from "@/utils/auth";
import { Booking, BookingApiError, bookingApi } from "@/utils/bookings";
import { DRAFT_KEY, EMPTY_FLIGHT, EMPTY_SEGMENT, MAX_FLIGHT_SEGMENTS, FlightErrors, FlightField, FlightSegment, FlightForm, readFlightDraft, TripType, validateFlight, vietnamToday } from "@/utils/flight-form";
import AirportSuggestions from "@/components/airport-suggestions";
import { showNotice } from "@/utils/notifications";
import FlightResults from "@/components/flight-results";
import SelectedFlightInfo from "@/components/selected-flight-info";
import type { SelectedFlight } from "@/utils/flight-selection";
import { VIETJET_CABIN_FARES } from "@/utils/flight-selection";

const FLIGHT_STEPS = ["Hành trình", "Chọn chuyến", "Thông tin liên hệ"] as const;
type FlightStep = 1 | 2 | 3;

export default function FlightSearchPage() {
  const location = useLocation();
  const [homeSearch] = useState<{ form: FlightForm; tripType: TripType } | undefined>(() => location.state?.searchJourney);
  const [step, setStep] = useState<FlightStep>(homeSearch ? 2 : 1);
  const [searchRequest, setSearchRequest] = useState(homeSearch ? 1 : 0);
  const [draft] = useState(readFlightDraft);
  const [form, setForm] = useState<FlightForm>(homeSearch?.form ?? draft?.form ?? EMPTY_FLIGHT());
  const [tripType, setTripType] = useState<TripType>(homeSearch?.tripType ?? draft?.tripType ?? "oneway");
  const [restored, setRestored] = useState(!homeSearch && Boolean(draft));
  const [account, setAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [errors, setErrors] = useState<FlightErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [lastBooking, setLastBooking] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFlights, setSelectedFlights] = useState<SelectedFlight[]>([]);
  const [activeAirport, setActiveAirport] = useState<FlightField | null>(null);
  const sending = useRef(false);
  const requestIdentity = useRef<{ payload: string; key: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const authRef = useRef<HTMLDivElement>(null);
  const previousAccount = useRef<string | null>(null);
  const today = vietnamToday();
  const consultationOnly = tripType === "multicity";
  const showContact = consultationOnly || (selectedFlights.some(flight => flight.leg === "outbound") && (tripType !== "roundtrip" || selectedFlights.some(flight => flight.leg === "inbound")));

  async function loadAccount() {
    setAuthLoading(true); setAuthError("");
    try { setAccount(await authRequest("me")); } catch (e) { setAuthError(e instanceof Error ? e.message : "Không kiểm tra được tài khoản."); } finally { setAuthLoading(false); }
  }
  useEffect(() => { loadAccount(); }, []);
  useEffect(() => {
    if (previousAccount.current && previousAccount.current !== account?.id) {
      setForm(EMPTY_FLIGHT()); setSelectedFlights([]); setRestored(false); setErrors({}); requestIdentity.current = null;
      setStep(1);
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
    }
    previousAccount.current = account?.id ?? null;
    setLastBooking(null);
    if (account) setShowAuth(false);
  }, [account?.id]);
  useEffect(() => {
    try {
      const meaningful = Object.entries(form).some(([key, value]) => typeof value === "string" && key !== "cabin" && value.trim());
      if (meaningful || form.segments.some((segment) => Object.values(segment).some((value) => value.trim()))) sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, tripType, savedAt: Date.now() }));
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [form, tripType]);
  useEffect(() => { if (showAuth) authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [showAuth]);
  useEffect(() => {
    if (previousStep.current !== step) {
      stepHeadingRef.current?.focus({ preventScroll: true });
      stepHeadingRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      previousStep.current = step;
    }
  }, [step]);

  function goToStep(next: FlightStep) {
    setActiveAirport(null); setErrors({}); setSubmitError(""); setShowAuth(false); setStep(next);
  }
  function selectFlights(flights: SelectedFlight[]) {
    setSelectedFlights(flights);
    const complete = flights.some(flight => flight.leg === "outbound") && (tripType !== "roundtrip" || flights.some(flight => flight.leg === "inbound"));
    if (step === 2 && !consultationOnly && complete) goToStep(3);
  }
  function continueJourney() {
    const nextErrors = validateFlight(form, tripType, "journey");
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) { focusField(firstError); return; }
    goToStep(2);
    if (!consultationOnly) setSearchRequest(current => current + 1);
  }

  function update<K extends keyof FlightForm>(field: K, value: FlightForm[K]) {
    if (field === "cabin" && value !== form.cabin) setSelectedFlights([]);
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  }
  function updateSegment(index: number, field: keyof FlightSegment, value: string) {
    update("segments", form.segments.map((segment, i) => i === index ? { ...segment, [field]: value } : segment));
    setErrors((current) => ({ ...current, [`segments.${index}.${field}`]: undefined }));
  }
  function changeTripType(value: TripType) {
    if (value === "multicity" && form.segments.every((segment) => !segment.origin && !segment.destination && !segment.departureDate)) {
      update("segments", [{ origin: form.origin, destination: form.destination, departureDate: form.departureDate }, { origin: form.destination, destination: "", departureDate: form.returnDate }]);
    }
    setTripType(value); setErrors({}); setActiveAirport(null); setSubmitError("");
  }
  function clearDraft() {
    setStep(1); setShowAuth(false);
    setSelectedFlights([]);
    setForm(EMPTY_FLIGHT()); setTripType("roundtrip"); setErrors({}); setRestored(false); setActiveAirport(null); setSubmitError(""); requestIdentity.current = null;
    try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
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
    if (step !== 3 || !showContact) return;
    const nextErrors = validateFlight(form, tripType); setErrors(nextErrors); setSubmitError("");
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      setStep(["fullName", "phone", "note"].includes(firstError) ? 3 : 1);
      requestAnimationFrame(() => focusField(firstError));
      showNotice("error", "Vui lòng kiểm tra yêu cầu", nextErrors[firstError as FlightField] ?? "Sửa các ô được đánh dấu trước khi tiếp tục."); return;
    }
    if (authLoading) { setSubmitError("Đang kiểm tra tài khoản. Vui lòng thử gửi lại sau giây lát."); return; }
    if (!account) { setShowAuth(true); return; }
    const { segments, ...details } = form;
    const payload = tripType === "multicity"
      ? { ...details, tripType, segments, origin: segments[0].origin, destination: segments[segments.length - 1].destination, departureDate: segments[0].departureDate, returnDate: "" }
      : { ...details, tripType, returnDate: tripType === "roundtrip" ? form.returnDate : "", ...(selectedFlights.length ? { selectedFlights } : {}) };
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
  const inputClass = "w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 bg-white outline-none focus:border-gold-600 disabled:bg-gray-50";
  function fieldProps(field: FlightField) { return { id: `flight-${field}`, name: field, "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `error-${field}` : undefined, disabled: isSubmitting, className: `${inputClass} ${errors[field] ? "border-red-500" : ""}` }; }
  function errorText(field: keyof FlightForm) { return errors[field] ? <p id={`error-${field}`} className="mt-1 text-sm text-red-600">{errors[field]}</p> : null; }

  return <div ref={formRef} className="flight-page p-4 pb-8 space-y-4">
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="mb-5"><h1 className="text-xl font-semibold">Yêu cầu đặt vé máy bay</h1><p className="text-sm text-gray-500 mt-2">Chọn hành trình và chuyến bay, FirstClass sẽ liên hệ tư vấn.</p></div>
      {lastBooking && <div role="status" className="mb-5 rounded-xl bg-green-50 border border-green-200 p-4 break-words"><h2 className="font-semibold text-green-800">Đã lưu yêu cầu trong app</h2><p className="mt-2 text-sm">Mã yêu cầu: {lastBooking.id}. Chưa đặt vé hay giữ chỗ với Vietjet.</p><SelectedFlightInfo flights={lastBooking.selectedFlights ?? []} /><Link to="/history" className="inline-block mt-3 text-gold-600 text-sm font-medium">Theo dõi yêu cầu trong lịch sử →</Link></div>}
      {restored && <p role="status" className="mb-4 rounded-xl bg-gold-50 p-3 text-sm text-gold-700">Đã khôi phục bản nháp trong phiên này. Bạn có thể tiếp tục nhập hoặc xóa bản nháp.</p>}
      <nav aria-label="Các bước đặt vé" className="flight-steps"><ol>{FLIGHT_STEPS.map((label, index) => <li key={label}><button type="button" aria-current={step === index + 1 ? "step" : undefined} disabled={isSubmitting || index + 1 > step} onClick={() => goToStep((index + 1) as FlightStep)} className={index + 1 < step ? "is-complete" : ""}><span aria-hidden="true">{index + 1 < step ? "✓" : index + 1}</span><span>{label}</span></button></li>)}</ol></nav>
      <div className="mb-5"><h2 ref={stepHeadingRef} tabIndex={-1} className="flight-step-heading font-semibold">Bước {step}/3 · {FLIGHT_STEPS[step - 1]}</h2><p className="text-sm text-gray-500 mt-2">{step === 1 ? "Chọn điểm đi, điểm đến, ngày bay và số hành khách." : step === 2 ? consultationOnly ? "Kiểm tra các chặng trước khi yêu cầu FirstClass tư vấn chuyến bay." : tripType === "roundtrip" ? "Tìm và chọn chuyến cho cả chiều đi và chiều về." : "Tìm chuyến và chọn giá phù hợp để tiếp tục." : "Để lại họ tên và số điện thoại để FirstClass liên hệ."}</p></div>
      {Object.values(errors).some(Boolean) && <div role="alert" className="mb-4 rounded-xl bg-red-50 text-red-700 p-3 text-sm">Vui lòng sửa các ô được đánh dấu bên dưới trước khi tiếp tục.</div>}
      <section hidden={step !== 1} aria-label="Hành trình" className="flight-step">
      <div className="flex gap-2 mb-5">{([ ["roundtrip", "Khứ hồi"], ["oneway", "Một chiều"], ["multicity", "Đa chặng"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={tripType === value} disabled={isSubmitting} onClick={() => changeTripType(value)} className={`flex-1 py-3 rounded-xl text-sm font-medium ${tripType === value ? "bg-gold-600 text-white" : "bg-gray-100 text-gray-600"}`}>{label}</button>)}</div>
      <div className="flight-fields space-y-4">
        {tripType === "multicity" ? <div className="flight-segments space-y-4">
          <p className="text-sm text-gray-500">Nhập từ 2 đến 6 chặng theo thứ tự bay. Mỗi chặng có thể khởi hành từ một sân bay khác.</p>
          {errorText("segments")}
          {form.segments.map((segment, index) => <fieldset key={index} className="relative rounded-xl border border-gray-200 p-4 space-y-3" style={{ zIndex: MAX_FLIGHT_SEGMENTS - index }}>
            <legend className="px-1 text-sm font-semibold">Chặng {index + 1}</legend>
            <div className="grid sm:grid-cols-2 gap-3">
              {([ ["origin", "Điểm đi", "Ví dụ: HAN hoặc Hà Nội"], ["destination", "Điểm đến", "Ví dụ: SGN hoặc Hồ Chí Minh"] ] as const).map(([field, label, placeholder]) => {
                const name: FlightField = `segments.${index}.${field}`;
                return <div key={field} className="relative" style={{ zIndex: field === "origin" ? 2 : 1 }}>
                  <label htmlFor={`flight-${name}`} className="text-sm font-medium">{label} <span className="text-red-600">*</span></label>
                  
                  {errorText(name)}
                  {<AirportSuggestions open={activeAirport === name} onOpen={() => setActiveAirport(name)} inputProps={{ ...fieldProps(name), placeholder }} onChange={(value) => updateSegment(index, field, value)} value={segment[field]} title={`Chọn ${label.toLowerCase()} · Chặng ${index + 1}`} onClose={() => setActiveAirport(null)} onSelect={(value) => { updateSegment(index, field, value); setActiveAirport(null); }} />}
                </div>;
              })}
              <div><label htmlFor={`flight-segments.${index}.departureDate`} className="text-sm font-medium">Ngày bay <span className="text-red-600">*</span></label><input {...fieldProps(`segments.${index}.departureDate`)} type="date" min={index > 0 && form.segments[index - 1].departureDate > today ? form.segments[index - 1].departureDate : today} value={segment.departureDate} onChange={(e) => updateSegment(index, "departureDate", e.target.value)} />{errorText(`segments.${index}.departureDate`)}</div>
            </div>
            {form.segments.length > 2 && <button type="button" disabled={isSubmitting} aria-label={`Xóa chặng ${index + 1}`} className="text-sm text-red-600 underline" onClick={() => { update("segments", form.segments.filter((_, i) => i !== index)); setErrors({}); setActiveAirport(null); }}>Xóa chặng</button>}
          </fieldset>)}
          <button type="button" disabled={isSubmitting || form.segments.length >= MAX_FLIGHT_SEGMENTS} className="rounded-xl border border-gold-200 px-4 py-2 text-sm text-gold-600 disabled:opacity-50" onClick={() => { const last = form.segments[form.segments.length - 1]; update("segments", [...form.segments, { ...EMPTY_SEGMENT(), origin: last.destination, departureDate: last.departureDate }]); setActiveAirport(null); }}>+ Thêm chặng</button>
        </div> : <>
        {([ ["origin", "Điểm đi", "Ví dụ: HAN hoặc Hà Nội"], ["destination", "Điểm đến", "Ví dụ: SGN hoặc Hồ Chí Minh"] ] as const).map(([field, label, placeholder]) => <div key={field} className={`relative ${field === "origin" ? "z-30" : "z-20"}`}><label htmlFor={`flight-${field}`} className="text-sm font-medium">{label} <span className="text-red-600">*</span></label>{errorText(field)}
          {<AirportSuggestions open={activeAirport === field} onOpen={() => setActiveAirport(field)} inputProps={{ ...fieldProps(field), placeholder }} onChange={(value) => update(field, value)} value={form[field]} title={`Chọn ${label.toLowerCase()}`} onClose={() => setActiveAirport(null)} onSelect={(value) => { update(field, value); setActiveAirport(null); }} />}
        </div>)}
        <div className="flight-swap"><button type="button" disabled={isSubmitting} className="rounded-xl border border-gold-200 px-4 py-2 text-sm text-gold-600" onClick={swapAirports}>⇄ Đảo điểm đi / điểm đến</button></div>
        <div className="grid grid-cols-2 gap-3"><div><label htmlFor="flight-departureDate" className="text-sm font-medium">Ngày đi <span className="text-red-600">*</span></label><input {...fieldProps("departureDate")} type="date" min={today} value={form.departureDate} onChange={(e) => update("departureDate", e.target.value)} />{errorText("departureDate")}</div>{tripType === "roundtrip" && <div><label htmlFor="flight-returnDate" className="text-sm font-medium">Ngày về <span className="text-red-600">*</span></label><input {...fieldProps("returnDate")} type="date" min={form.departureDate > today ? form.departureDate : today} value={form.returnDate} onChange={(e) => update("returnDate", e.target.value)} />{errorText("returnDate")}</div>}</div>
        </>}
        <fieldset><legend className="text-sm font-medium">Hành khách</legend><div className="grid grid-cols-3 gap-2 mt-2">{([ ["adults", "Người lớn", "Từ 12 tuổi", 1], ["children", "Trẻ em", "2–11 tuổi", 0], ["infants", "Em bé", "Dưới 2 tuổi", 0] ] as const).map(([field, label, age, min]) => <div key={field}><label htmlFor={`flight-${field}`} className="text-xs font-medium">{label}</label><p className="text-xs text-gray-500 mt-1">{age}</p><input {...fieldProps(field)} type="number" min={min} max={field === "infants" ? 2 : field === "adults" ? 10 - form.children : 10 - form.adults} step={1} value={Number.isFinite(form[field]) ? form[field] : ""} onChange={(e) => { const max = field === "infants" ? 2 : field === "adults" ? 10 - form.children : 10 - form.adults; update(field, Math.min(max, Math.max(min, Math.floor(Number(e.target.value) || min)))); }} />{errorText(field)}</div>)}</div><p className="text-xs text-gray-500 mt-2">Có thể chọn cả 3 nhóm: người lớn + trẻ em tối đa 10, em bé tối đa 2. Cần ít nhất 1 người lớn.</p></fieldset>
        <div><label htmlFor="flight-cabin" className="text-sm font-medium">Hạng ghế</label><select {...fieldProps("cabin")} value={form.cabin} onChange={(e) => update("cabin", e.target.value)}>{["Phổ thông", "Phổ thông đặc biệt", "Thương gia", "Hạng nhất"].map((cabin) => <option key={cabin} value={cabin}>{cabin} ({VIETJET_CABIN_FARES[cabin]})</option>)}</select>{errorText("cabin")}</div>
      </div>
      <div className="flight-step-actions"><button type="button" onClick={continueJourney} className="flight-next">{consultationOnly ? "Tiếp tục: Kiểm tra hành trình →" : "Tìm chuyến bay →"}</button></div>
      </section>
      <section hidden={step !== 2} aria-label="Chọn chuyến" className="flight-step space-y-4">
        <div className="rounded-xl bg-gray-50 p-3 text-sm space-y-2">
          {(consultationOnly ? form.segments : [{ origin: form.origin, destination: form.destination, departureDate: form.departureDate }]).map((segment, index) => <p key={index}>{consultationOnly && `Chặng ${index + 1}: `}{segment.origin} → {segment.destination} · {segment.departureDate.split("-").reverse().join("/")}</p>)}
          {tripType === "roundtrip" && <p>Ngày về: {form.returnDate.split("-").reverse().join("/")}</p>}
          <p>{form.adults} người lớn · {form.children} trẻ em · {form.infants} em bé · {form.cabin}</p>
          <button type="button" onClick={() => goToStep(1)} className="text-gold-600 underline py-2">Sửa hành trình</button>
        </div>
        {consultationOnly && <p className="rounded-xl bg-gold-50 p-4 text-sm text-gold-800">Hành trình đa chặng cần tư vấn riêng. FirstClass sẽ tìm chuyến và báo giá sau khi nhận yêu cầu.</p>}
        <FlightResults form={form} tripType={tripType} selectedFlights={selectedFlights} onSelectionChange={selectFlights} disabled={isSubmitting || step !== 2} searchRequest={searchRequest} />
        <SelectedFlightInfo flights={selectedFlights} onClear={() => setSelectedFlights([])} disabled={isSubmitting} compact />
        {!showContact && <p className="text-sm text-gray-500" role="status">{tripType === "roundtrip" ? "Chọn đủ chuyến chiều đi và chiều về để tiếp tục." : "Chọn một chuyến bay để tiếp tục."}</p>}
        <div className="flight-step-actions"><button type="button" onClick={() => goToStep(1)} className="flight-back">← Hành trình</button><button type="button" onClick={() => { if (showContact) goToStep(3); }} disabled={!showContact} className="flight-next">Tiếp tục: Thông tin liên hệ →</button></div>
      </section>
      <section hidden={step !== 3} aria-label="Thông tin liên hệ" className="flight-step space-y-4">
        <div className="flight-contact"><div className="flight-contact-fields space-y-3">
          <div><label htmlFor="flight-fullName" className="text-sm font-medium">Họ và tên <span className="text-red-600">*</span></label><input {...fieldProps("fullName")} autoComplete="name" maxLength={100} value={form.fullName} placeholder="Nhập họ và tên" onChange={(e) => update("fullName", e.target.value)} />{errorText("fullName")}</div>
          <div><label htmlFor="flight-phone" className="text-sm font-medium">Số điện thoại / Zalo <span className="text-red-600">*</span></label><input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={form.phone} placeholder="Ví dụ: 0901234567" onChange={(e) => update("phone", e.target.value)} />{errorText("phone")}</div>
          <div><label htmlFor="flight-note" className="text-sm font-medium">Ghi chú (không bắt buộc)</label><textarea {...fieldProps("note")} rows={3} maxLength={2000} value={form.note} placeholder="Ví dụ: Ưu tiên chuyến sáng, cần hành lý 23 kg…" onChange={(e) => update("note", e.target.value)} />{errorText("note")}</div>
        </div></div>
        <SelectedFlightInfo flights={selectedFlights} compact />
        <div className="flight-auth" ref={authRef}>
          {showAuth && !account && <div className="mb-4 rounded-xl bg-gold-50 border border-gold-100 p-3"><h2 className="font-semibold">Đăng nhập để gửi và theo dõi yêu cầu</h2><p className="text-sm text-gray-600 mt-2">Hành trình và thông tin vừa nhập được giữ nguyên. Đăng nhập xong, bấm Gửi yêu cầu để xác nhận.</p><AccountPanel account={account} loading={authLoading} error={authError} onRetry={loadAccount} onChange={setAccount} /><button type="button" className="text-sm text-gold-600 underline" onClick={() => setShowAuth(false)}>Tiếp tục chỉnh sửa hành trình</button></div>}
          {account && <p className="text-sm text-gray-500 break-all">Yêu cầu được lưu cho tài khoản {account.email}.</p>}
          {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 mt-3">{submitError}</p>}
        </div>
        <p className="text-xs text-gray-500">Gửi yêu cầu chưa phải xác nhận mua vé hay thanh toán.</p>
        <div className="flight-step-actions"><button type="button" onClick={() => goToStep(2)} disabled={isSubmitting} className="flight-back">← Chọn chuyến</button><button type="button" onClick={submitRequest} disabled={isSubmitting || authLoading || !showContact} className="flight-next">{isSubmitting ? "Đang gửi…" : authLoading ? "Đang kiểm tra tài khoản…" : account ? "Gửi yêu cầu đặt vé" : "Tiếp tục gửi yêu cầu"}</button></div>
      </section>
      <div className="mt-6 space-y-3">
        <div className="flight-note text-sm flex flex-wrap gap-4 justify-center"><Link to="/history" className="text-gold-600">Xem lịch sử yêu cầu</Link><Link to="/support" className="text-gold-600">Cần hỗ trợ?</Link><button type="button" disabled={isSubmitting} className="text-gray-500 underline" onClick={clearDraft}>Xóa bản nháp</button></div>
        <p className="flight-note text-xs text-gray-500 text-center">Bản nháp tự lưu trong phiên, tối đa 24 giờ.</p>
      </div>
    </div>
  </div>;
}
