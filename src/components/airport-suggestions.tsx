import { InputHTMLAttributes, useEffect, useId, useMemo, useRef, useState } from "react";
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

type Props = {
  value: string; title: string; open: boolean;
  inputProps: InputHTMLAttributes<HTMLInputElement>;
  onOpen: () => void; onChange: (value: string) => void;
  onSelect: (value: string) => void; onClose: () => void;
};

export default function AirportSuggestions({ value, title, open, inputProps, onOpen, onChange, onSelect, onClose }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [active, setActive] = useState(-1);
  const key = normalize(value.trim().replace(/.*\(([A-Z]{3})\)$/, "$1"));
  const matches = useMemo(() => airports.filter(airport => !key || normalize(`${airport.code} ${cityName(airport)} ${airport.city} ${airport.airport} ${countryName(airport.country)} ${airport.country}`).includes(key)).slice(0, 40), [key]);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) closeRef.current(); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  useEffect(() => { setActive(-1); root.current?.querySelector(".airport-results")?.scrollTo(0, 0); }, [key, open]);
  useEffect(() => { if (active >= 0) document.getElementById(listId + "-" + active)?.scrollIntoView({ block: "nearest" }); }, [active, listId]);
  const choose = (index: number) => {
    const airport = matches[index];
    if (airport) onSelect(`${cityName(airport)} (${airport.code})`);
  };
  return <div ref={root} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) onClose(); }}>
    <input {...inputProps} value={value} type="text" autoComplete="off" maxLength={200} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && active >= 0 ? listId + "-" + active : undefined} style={{ fontSize: 16 }} onFocus={onOpen} onClick={onOpen} onChange={event => { onChange(event.target.value); onOpen(); }} onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); onOpen();
        setActive(current => event.key === "ArrowDown" ? Math.min(current + 1, matches.length - 1) : Math.max(current - 1, 0));
      } else if (event.key === "Enter" && open) { event.preventDefault(); if (active >= 0) choose(active); }
    }} />
    {open && <div className="airport-dropdown">
      <div className="airport-results" id={listId} tabIndex={-1} role="listbox" aria-label={title}>
        {matches.map((airport, index) => <div key={airport.code + airport.airport} id={listId + "-" + index} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onClick={() => choose(index)} className={`cursor-pointer px-3 py-2 border-b hover:bg-gold-50 ${active === index ? "bg-gold-100" : ""}`}>
          <p className="font-medium text-sm">{cityName(airport)} ({airport.code})</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{airport.airport} · {countryName(airport.country)}</p>
        </div>)}
        {!matches.length && <p role="status" className="p-3 text-sm text-gray-500">Không tìm thấy sân bay phù hợp.</p>}
      </div>
    </div>}
  </div>;
}
