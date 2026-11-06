import { useMoney } from "@/components/currency-provider";
import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { FilterField, SortField, filterInputClass } from "@/components/catalog-filters";
import { Link, useSearchParams, useParams } from "react-router-dom";
import EsimCards from "@/components/esim-cards";
import { Esim } from "@/utils/esims";
import { useContentData } from "@/utils/tours";
import { matchesBudget, filterOptions, sortCatalog, SORT_OPTIONS } from "@/utils/catalog-filters";
import { matchesEsimSearch } from "@/utils/search";
import "./esims.css";
import groups from "./destinations.json";
import { usePageTitle } from "@/utils/page-title";

export default function EsimResultsPage() {
  const money = useMoney();
  const { countryCode } = useParams();
  const country = groups.flatMap(group => group.countries).find(item => item.code === countryCode);
  const { data, loading, error, retry } = useContentData<Esim[]>("esims");
  const [params, setParams] = useSearchParams();
  const search = country?.name ?? (params.get("q") ?? "").slice(0, 200);
  const allowance = params.get("allowance") ?? "";
  const validity = params.get("validity") ?? "";
  const budget = ["low", "mid", "high", "contact"].includes(params.get("budget") ?? "") ? params.get("budget")! : "";
  const rawSort = params.get("sort") ?? "newest";
  const sort = SORT_OPTIONS.some(([key]) => key === rawSort) ? rawSort : "newest";
  const items = (data ?? []).filter(item => matchesEsimSearch(search, item));
  const filtered = sortCatalog(items.filter((item) => matchesEsimSearch(search, item) && (!allowance || item.allowance === allowance) && (!validity || item.validity === validity) && matchesBudget(item.price, budget, 200000, 500000)), sort, (item) => item.validity);
  const active = !!(allowance || validity || budget || sort !== "newest");
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value && value !== "newest") next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  const choices = (key: "allowance" | "validity", selected: string) => <><option value="">{key === "allowance" ? "Tất cả dung lượng" : "Tất cả thời hạn"}</option>{filterOptions(items.map((item) => item[key])).map((value) => <option key={value}>{value}</option>)}{selected && !items.some((item) => item[key] === selected) && <option>{selected}</option>}</>;
  usePageTitle(country ? `eSIM ${country.name}` : "Kết quả tìm eSIM");
  if (countryCode && !country) return <div className="p-6"><h1>Không tìm thấy quốc gia</h1><Link to="/esims">← Chọn quốc gia khác</Link></div>;
  const clearFilters = () => setParams(country ? {} : (search ? { q: search } : {}), { replace: true });
  return <div className="esim-page">
    <section className="esim-catalog" aria-labelledby="esim-catalog-heading">
    <Link to="/esims" className="inline-block text-gold-600 mb-6">← Tất cả quốc gia</Link><div className="esim-section-heading"><p className="esim-eyebrow">ĐIỂM ĐẾN CỦA BẠN</p><h1 id="esim-catalog-heading" className="text-3xl font-semibold mt-3">{country ? `Gói eSIM ${country.name}` : search ? `Kết quả eSIM cho “${search}”` : "Các gói eSIM"}</h1><p>Tìm gói eSIM phù hợp với nơi bạn đến và cách bạn khám phá.</p></div>
    <div className="esim-filter-panel space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FilterField label="Dung lượng"><select className={filterInputClass} value={allowance} onChange={(event) => update("allowance", event.target.value)}>{choices("allowance", allowance)}</select></FilterField>
        <FilterField label="Thời hạn"><select className={filterInputClass} value={validity} onChange={(event) => update("validity", event.target.value)}>{choices("validity", validity)}</select></FilterField>
        <FilterField label="Khoảng giá"><select className={filterInputClass} value={budget} onChange={(event) => update("budget", event.target.value)}><option value="">Tất cả mức giá</option><option value="low">Đến {money(200000)}</option><option value="mid">Trên {money(200000)} đến {money(500000)}</option><option value="high">Trên {money(500000)}</option><option value="contact">Giá liên hệ</option></select></FilterField>
        <SortField value={sort} onChange={(value) => update("sort", value)} esim />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-gray-500">{loading ? "Đang tải danh sách…" : error ? "Chưa tải được kết quả" : filtered.length + " gói eSIM phù hợp"}</p>{active && <button type="button" className="text-sm text-gold-600 underline py-2" onClick={clearFilters}>Xóa bộ lọc</button>}</div>
      <p className="text-xs text-gray-500">Gói chưa có giá được xếp cuối khi sắp xếp theo giá. Điều kiện và giá thực tế cần được xác nhận khi tư vấn.</p>
    </div>
    {loading ? <CatalogSkeleton label="Đang tải gói eSIM…" /> : error ? <p role="alert" className="p-4 text-red-600">{error} <button className="underline" onClick={retry}>Thử lại</button></p> : filtered.length ? <EsimCards esims={filtered} /> : <div className="px-4 py-10 text-center space-y-3"><p className="font-medium">{active ? "Không tìm thấy gói eSIM phù hợp" : "Danh sách gói eSIM đang được cập nhật"}</p><p className="text-sm text-gray-500">{active ? "Thử thay đổi quốc gia, dung lượng, thời hạn hoặc khoảng giá." : "Vui lòng quay lại để xem các gói mới."}</p>{active && <button className="rounded-xl bg-gold-50 text-gold-600 px-4 py-3" onClick={clearFilters}>Xóa tất cả bộ lọc</button>}<Link to="/support?service=esim" className="block text-gold-600 py-2">Nhờ FirstClass tư vấn eSIM →</Link></div>}
    </section>
  </div>;
}
