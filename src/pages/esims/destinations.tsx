import { useState } from "react";
import { Esim } from "@/utils/esims";
import { matchesSearch } from "@/utils/search";
import { tourPrice } from "@/utils/tours";
import groups from "./destinations.json";

const featuredCountries: Record<string, string[]> = {
  "Châu Á": ["cn", "jp", "kr", "th"],
  "Châu Âu": ["fr", "de", "it", "gb"],
  "Châu Mỹ": ["us", "ca", "br", "mx"],
  "Châu Phi": ["eg", "za", "ma", "ke"],
  "Châu Đại Dương": ["au", "nz", "fj", "pw"],
};

export default function EsimDestinations({ items, loading, onSelect }: {
  items: Esim[];
  loading: boolean;
  onSelect: (country: string) => void;
}) {
  const [expanded, setExpanded] = useState<string[]>([]);
  return <section className="esim-destinations" aria-labelledby="esim-destinations-heading">
    <div className="esim-section-heading"><p className="esim-eyebrow">KHÁM PHÁ THẾ GIỚI</p><h2 id="esim-destinations-heading">eSIM theo quốc gia & vùng lãnh thổ</h2><p>Chọn điểm đến để tìm gói eSIM hoặc nhận tư vấn cho hành trình của bạn.</p></div>
    {groups.map((group, index) => {
      const isExpanded = expanded.includes(group.name);
      const featured = featuredCountries[group.name] ?? [];
      const ordered = [...group.countries].sort((a, b) => {
        const rank = (code: string) => featured.includes(code) ? featured.indexOf(code) : featured.length;
        return rank(a.code) - rank(b.code);
      });
      const visible = isExpanded ? ordered : ordered.slice(0, 4);
      return <section key={group.name} className="esim-region" aria-labelledby={`esim-region-${index}`}>
        <div className="esim-region-heading"><div><h3 id={`esim-region-${index}`}>{group.name}</h3><span>{group.countries.length} điểm đến</span></div><button type="button" aria-expanded={isExpanded} aria-controls={`esim-countries-${index}`} aria-label={`${isExpanded ? "Thu gọn" : "Xem thêm"} ${group.name}`} onClick={() => setExpanded((current) => isExpanded ? current.filter((name) => name !== group.name) : [...current, group.name])}>{isExpanded ? "Thu gọn ↑" : "Xem thêm ↓"}</button></div>
        <div className="esim-country-grid" id={`esim-countries-${index}`}>{visible.map((country) => {
          const prices = items.filter((item) => matchesSearch(country.name, item.name, item.coverage)).map((item) => item.price).filter((price): price is number => price !== null && Number.isFinite(price));
          return <button type="button" className="esim-country" key={country.code} onClick={() => onSelect(country.name)} aria-label={`Tìm eSIM ${country.name}`}>
            <img src={`https://flagcdn.com/w80/${country.code}.png`} alt="" width={40} height={28} loading="lazy" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />
            <span className="esim-country-copy"><strong title={country.name}>{country.name}</strong><small>{loading ? "Đang tải giá…" : prices.length ? `Từ ${tourPrice(Math.min(...prices))}` : "Liên hệ tư vấn"}</small></span><span className="esim-country-arrow" aria-hidden="true">›</span>
          </button>;
        })}</div>
      </section>;
    })}
  </section>;
}
