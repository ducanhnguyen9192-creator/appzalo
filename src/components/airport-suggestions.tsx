import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AIRPORTS from "@/mock/airports.json";
import COUNTRIES from "@/mock/airport-countries.json";

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const countryName = (code: string) => COUNTRIES[code as keyof typeof COUNTRIES] || code;
const popularVietnam = ["SGN", "HAN", "DAD", "CXR", "PQC", "DLI", "HPH", "HUI", "VCA"];
const vietnamCities: Record<string, string> = { SGN: "TP. Hồ Chí Minh", HAN: "Hà Nội", DAD: "Đà Nẵng", CXR: "Nha Trang (Cam Ranh)", PQC: "Phú Quốc", DLI: "Đà Lạt", HPH: "Hải Phòng", HUI: "Huế", VCA: "Cần Thơ", BMV: "Buôn Ma Thuột", CAH: "Cà Mau", VCS: "Côn Đảo", DIN: "Điện Biên Phủ", VDH: "Đồng Hới", PXU: "Pleiku", UIH: "Quy Nhơn", VKG: "Rạch Giá", VCL: "Chu Lai", THD: "Thanh Hóa", TBB: "Tuy Hòa", VDO: "Vân Đồn", VII: "Vinh" };
const cityName = (airport: typeof AIRPORTS[number]) => airport.country === "VN" ? vietnamCities[airport.code] || airport.city : airport.city;
const airports = [...AIRPORTS].sort((a, b) => {
  if (a.country === "VN" && b.country !== "VN") return -1;
  if (b.country === "VN" && a.country !== "VN") return 1;
  if (a.country === "VN" && b.country === "VN") {
    const rank = (code: string) => popularVietnam.includes(code) ? popularVietnam.indexOf(code) : popularVietnam.length;
    if (rank(a.code) !== rank(b.code)) return rank(a.code) - rank(b.code);
  }
  return countryName(a.country).localeCompare(countryName(b.country), "vi") || a.city.localeCompare(b.city, "vi");
});

export default function AirportSuggestions({ value, title, onSelect, onClose }: { value: string; title: string; onSelect: (value: string) => void; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const searchId = useId();
  const [query, setQuery] = useState(/\([A-Z]{3}\)$/.test(value.trim()) ? "" : value);
  const [limit, setLimit] = useState(60);
  const key = normalize(query.trim());
  useEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => { dialog?.close(); trigger?.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => { setLimit(60); }, [key]);
  const matches = useMemo(() => {
    if (!key) return airports;
    return airports.filter(airport => normalize(`${airport.code} ${cityName(airport)} ${airport.city} ${airport.airport} ${countryName(airport.country)} ${airport.country}`).includes(key));
  }, [key]);
  const visible = matches.slice(0, limit);
  return createPortal(<dialog ref={dialogRef} className="airport-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="airport-dialog-panel">
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b">
      <h2 id={titleId} className="font-semibold">{title}</h2>
      <button type="button" onClick={onClose} className="min-h-11 px-3 rounded-lg text-blue-600" aria-label="Đóng bộ chọn sân bay">Đóng ✕</button>
    </div>
    <div className="p-4 border-b">
      <label htmlFor={searchId} className="text-sm font-medium">Tìm sân bay</label>
      <input id={searchId} type="search" autoComplete="off" maxLength={200} value={query} onChange={(event) => { setQuery(event.target.value); dialogRef.current?.querySelector(".airport-results")?.scrollTo(0, 0); }} placeholder="Thành phố, quốc gia hoặc mã sân bay" className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-3 text-base" />
      <p className="mt-2 text-xs text-gray-500">Việt Nam ưu tiên hiển thị trước.</p>
    </div>
    <div className="airport-results" aria-label="Gợi ý sân bay">
    {visible.map((airport, index) => <div key={`${airport.code}-${airport.airport}`}>
      {(index === 0 || visible[index - 1].country !== airport.country) && <p className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">{countryName(airport.country)}</p>}
      <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => onSelect(`${cityName(airport)} (${airport.code})`)} className="w-full p-3 text-left border-b hover:bg-blue-50">
        <p className="font-medium text-sm">{cityName(airport)} ({airport.code})</p>
        <p className="text-xs text-gray-500 mt-1">{airport.airport} · {countryName(airport.country)}</p>
      </button>
    </div>)}
    {!matches.length && <p className="p-3 text-sm text-gray-500">Không tìm thấy sân bay phù hợp.</p>}
    {matches.length > limit && <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => setLimit(current => current + 60)} className="w-full p-3 text-sm font-medium text-blue-600">Xem thêm sân bay</button>}
    </div>
    </div>
  </dialog>, document.body);
}
