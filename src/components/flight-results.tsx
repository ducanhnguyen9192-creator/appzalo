import { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/utils/tours";
import { formatMoney } from "@/utils/bookings";
import type { FlightForm, TripType } from "@/utils/flight-form";
import AIRPORTS from "@/mock/airports.json";
import type { SelectedFlight } from "@/utils/flight-selection";

type Fare = { name: string; amount: number | null };
type SearchResult = { searchedAt: string; source: string; flights: { number: string; aircraft: string; departure: string; arrival: string; arrivalNextDay: boolean; fares: Fare[] }[] };
export function airportCode(value: string) {
  const code = value.trim().toUpperCase().match(/(?:^|\()([A-Z]{3})\)?$/)?.[1];
  return code && AIRPORTS.some(a => a.code === code) ? code : null;
}
export default function FlightResults({ form, tripType, selectedFlights = [], onSelectionChange, disabled = false }: { form: FlightForm; tripType: TripType; selectedFlights?: SelectedFlight[]; onSelectionChange?: (value: SelectedFlight[]) => void; disabled?: boolean }) {
  const [results, setResults] = useState<{ result: SearchResult; origin: string; destination: string; date: string }[]>([]);
  const [activeLeg, setActiveLeg] = useState(0);
  const [searchLeg, setSearchLeg] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const key = JSON.stringify([form.origin, form.destination, form.departureDate, form.returnDate, form.adults, form.children, form.infants, tripType]);
  useEffect(() => {
    revision.current++; controller.current?.abort(); setResults([]); setActiveLeg(0); setError(""); setAccessDenied(false); setLoading(false); onSelectionChange?.([]);
    return () => { revision.current++; controller.current?.abort(); };
  }, [key]);
  if (tripType === "multicity") return null;
  const roundtrip = tripType === "roundtrip";
  const title = `Tìm vé Vietjet ${roundtrip ? "hai chiều" : "một chiều"}`;
  const selected = results[activeLeg];
  const result = selected?.result;
  function selectFare(flight: SearchResult["flights"][number], fare: Fare) {
    if (!selected || fare.amount === null || disabled || loading) return;
    const leg = activeLeg === 0 ? "outbound" : "inbound";
    const choice: SelectedFlight = { leg, origin: selected.origin, destination: selected.destination, departureDate: selected.date, number: flight.number, aircraft: flight.aircraft, departure: flight.departure, arrival: flight.arrival, arrivalNextDay: flight.arrivalNextDay, fareName: fare.name, amount: fare.amount, currency: "VND", priceType: "displayed_fare", searchedAt: selected.result.searchedAt };
    onSelectionChange?.([...selectedFlights.filter(item => item.leg !== leg), choice].sort((a, b) => a.leg === b.leg ? 0 : a.leg === "outbound" ? -1 : 1));
    if (roundtrip && activeLeg === 0 && results.length === 2) setActiveLeg(1);
  }
  async function search() {
    const origin = airportCode(form.origin), destination = airportCode(form.destination);
    setResults([]); setActiveLeg(0); setSearchLeg(0); setError(""); setAccessDenied(false); onSelectionChange?.([]);
    if (!origin || !destination || origin === destination) { setError("Chọn điểm đi và điểm đến khác nhau trong danh sách gợi ý."); return; }
    if (!form.departureDate) { setError("Chọn ngày đi trước khi tìm vé."); return; }
    if (roundtrip && (!form.returnDate || form.returnDate < form.departureDate)) { setError("Chọn ngày về sau hoặc bằng ngày đi."); return; }
    if (form.adults !== 1 || form.children !== 0 || form.infants !== 0) { setError("Bản thử hiện hỗ trợ 1 người lớn, không có trẻ em hoặc em bé."); return; }
    controller.current?.abort();
    const current = new AbortController(); controller.current = current;
    const token = ++revision.current;
    setLoading(true);
    const timer = window.setTimeout(() => current.abort(), roundtrip ? 240000 : 135000);
    let legIndex = 0;
    try {
      const legs = [{ origin, destination, date: form.departureDate }, ...(roundtrip ? [{ origin: destination, destination: origin, date: form.returnDate }] : [])];
      for (const leg of legs) {
        if (current.signal.aborted || token !== revision.current) return;
        setSearchLeg(legIndex);
        const response = await fetch(`${API_BASE}/api/flights/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: leg.origin, destination: leg.destination, departureDate: leg.date, tripType: "oneway", adults: form.adults, children: form.children, infants: form.infants }), signal: current.signal });
        const data = await response.json();
        if (token === revision.current) setAccessDenied(data.code === "VIETJET_ACCESS_DENIED");
        if (!response.ok) throw new Error(data.message ?? "Chưa tải được kết quả tìm vé.");
        if (token === revision.current) setResults(previous => [...previous, { result: data, ...leg }]);
        legIndex++;
      }
    } catch (e) {
      if (token === revision.current) setError(`${roundtrip ? (legIndex === 0 ? "Chiều đi: " : "Chiều về: ") : ""}${current.signal.aborted ? "Tìm kiếm quá lâu. Vui lòng thử lại." : e instanceof Error ? e.message : "Không kết nối được máy chủ tìm vé."}`);
    } finally {
      window.clearTimeout(timer);
      if (token === revision.current) setLoading(false);
    }
  }
  return <section className="flight-note border rounded-xl p-4 space-y-3" aria-label={title}>
    <h2 className="font-semibold">{title}</h2>
    <p className="text-sm text-gray-500">Tra giá Vietjet từ nguồn đại lý cho 1 người lớn. Chỉ cần hành trình và ngày đi, chưa cần thông tin liên hệ.</p>
    <button type="button" onClick={search} disabled={loading || disabled} className="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 disabled:opacity-50">{loading ? "Đang tìm trên Vietjet…" : "Tìm chuyến bay"}</button>
    <p className="text-sm text-gray-500">{roundtrip ? "Tra riêng chiều đi và chiều về, chưa phải giá xác nhận của một vé khứ hồi. " : ""}Chọn chuyến ở đây chỉ lưu vào yêu cầu của app, không giữ chỗ hay đặt vé trên Vietjet.</p>
    {loading && <p role="status" className="text-sm text-blue-700">{roundtrip ? `Đang tra ${searchLeg === 0 ? "chiều đi (1/2)" : "chiều về (2/2)"}. ` : ""}Đang tải đầy đủ danh sách, có thể mất đến 2 phút mỗi chiều.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {accessDenied && <div className="space-y-2"><p className="text-sm">{airportCode(form.origin)} → {airportCode(form.destination)} · {form.departureDate.split("-").reverse().join("/")} · 1 người lớn</p><a href="https://www.vietjetair.com/vi" target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl border border-blue-200 px-4 py-3 text-blue-600 font-medium">Mở website Vietjet</a><p className="text-xs text-gray-500">Nhập hành trình trên website hãng để xem giá hiện tại.</p></div>}
    {roundtrip && results.length > 0 && <div className="flex gap-2" aria-label="Kết quả từng chiều">{results.map((leg, index) => <button key={index} type="button" aria-pressed={activeLeg === index} onClick={() => setActiveLeg(index)} className={`flex-1 rounded-lg border p-2 text-sm ${activeLeg === index ? "bg-blue-50 border-blue-500 text-blue-700" : "border-gray-200"}`}>{index === 0 ? "Chiều đi" : "Chiều về"}: {leg.result.flights.length} chuyến<br />{leg.origin} → {leg.destination}</button>)}</div>}
    {result && selected && <div className="space-y-3" aria-live="polite">
      <h3 className="font-semibold">{result.flights.length} chuyến · {selected.origin} → {selected.destination} · {selected.date.split("-").reverse().join("/")}</h3>
      <p className="text-xs text-gray-500">Nguồn: {result.source} · Lấy lúc {new Date(result.searchedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}. Giá tại bảng kết quả, chưa xác nhận tổng thuế, phí; có thể thay đổi khi chọn vé.</p>
      {result.flights.map(flight => <article key={flight.number} className="rounded-xl border border-gray-200 p-3">
        <p className="font-semibold">{flight.departure} → {flight.arrival}{flight.arrivalNextDay ? " (+1 ngày)" : ""}</p>
        <p className="text-sm text-gray-500 mt-1">{flight.number} · {flight.aircraft} · Bay thẳng</p>
        <div className="grid grid-cols-2 gap-2 mt-3">{flight.fares.map(fare => {
          const chosen = selectedFlights.some(item => item.leg === (activeLeg === 0 ? "outbound" : "inbound") && item.number === flight.number && item.fareName === fare.name);
          return <button type="button" key={fare.name} aria-label={`Chọn ${flight.number} ${fare.name}`} aria-pressed={chosen} disabled={fare.amount === null || disabled || loading || !onSelectionChange} onClick={() => selectFare(flight, fare)} className={`rounded-lg border p-2 text-sm text-left disabled:opacity-50 ${chosen ? "border-blue-500 bg-blue-50 text-blue-700" : "border-transparent bg-gray-50"}`}><p>{fare.name}</p><p className="font-semibold">{fare.amount === null ? "Hết chỗ" : formatMoney(fare.amount)}</p>{fare.amount !== null && <p className="text-xs mt-1">{chosen ? "Đã chọn" : "Chọn giá này"}</p>}</button>;
        })}</div>
      </article>)}
      {!result.flights.length && <p>Không có chuyến phù hợp với ngày đã chọn.</p>}
    </div>}
  </section>;
}
