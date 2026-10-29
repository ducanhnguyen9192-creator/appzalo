import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { FilterField, SortField, filterInputClass } from "@/components/catalog-filters";
import { Link, useSearchParams } from "react-router-dom";
import EsimCards from "@/components/esim-cards";
import { Esim } from "@/utils/esims";
import { useContentData } from "@/utils/tours";
import { matchesBudget, filterOptions, sortCatalog, SORT_OPTIONS } from "@/utils/catalog-filters";
import { matchesSearch } from "@/utils/search";
import { useRef } from "react";
import heroImage from "@/assets/esims/hero.png";
import "./esims.css";
import EsimDestinations from "./destinations";

export default function EsimsPage() {
  const resultsRef = useRef<HTMLElement>(null);
  const { data, loading, error, retry } = useContentData<Esim[]>("esims");
  const [params, setParams] = useSearchParams();
  const search = (params.get("q") ?? "").slice(0, 200);
  const allowance = params.get("allowance") ?? "";
  const validity = params.get("validity") ?? "";
  const budget = ["low", "mid", "high", "contact"].includes(params.get("budget") ?? "") ? params.get("budget")! : "";
  const rawSort = params.get("sort") ?? "newest";
  const sort = SORT_OPTIONS.some(([key]) => key === rawSort) ? rawSort : "newest";
  const items = data ?? [];
  const filtered = sortCatalog(items.filter((item) => matchesSearch(search, item.name, item.coverage) && (!allowance || item.allowance === allowance) && (!validity || item.validity === validity) && matchesBudget(item.price, budget, 200000, 500000)), sort, (item) => item.validity);
  const active = !!(search || allowance || validity || budget || sort !== "newest");
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value && value !== "newest") next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  const choices = (key: "allowance" | "validity", selected: string) => <><option value="">{key === "allowance" ? "Tất cả dung lượng" : "Tất cả thời hạn"}</option>{filterOptions(items.map((item) => item[key])).map((value) => <option key={value}>{value}</option>)}{selected && !items.some((item) => item[key] === selected) && <option>{selected}</option>}</>;
  return <div className="esim-page">
    <section className="esim-hero" aria-labelledby="esim-heading">
      <img className="esim-hero-image" src={heroImage} alt="" fetchPriority="high" />
      <div className="esim-hero-copy"><p className="esim-eyebrow">FIRSTCLASS TRAVEL eSIM</p>
        <h1 id="esim-heading">Internet toàn cầu.<br /><em>Hành trình liền mạch.</em></h1>
        <p className="esim-hero-description">Khám phá thế giới, giữ trọn kết nối. Chọn gói eSIM du lịch phù hợp để luôn sẵn sàng cho mỗi điểm đến.</p>
        <form className="esim-search" role="search" onSubmit={(event) => { event.preventDefault(); resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); resultsRef.current?.focus({ preventScroll: true }); }}>
          <label className="esim-search-field"><span aria-hidden="true">⌕</span><span className="sr-only">Tìm gói eSIM theo quốc gia hoặc tên gói</span><input type="search" placeholder="Bạn sắp đi đâu?" value={search} maxLength={200} onChange={(event) => update("q", event.target.value)} /></label><button type="submit">Tìm eSIM <span aria-hidden="true">→</span></button>
        </form>
        <p className="esim-hero-note">Không cần đổi SIM vật lý · Dễ dàng chuẩn bị trước chuyến đi</p>
      </div>
    </section>
    <div className="esim-benefits">{[["01", "Kết nối linh hoạt", "Chọn dung lượng theo nhu cầu"], ["02", "Thông tin rõ ràng", "Xem giá, thời hạn và vùng phủ sóng"], ["03", "Cài đặt thuận tiện", "Hướng dẫn theo từng gói eSIM"], ["04", "Đồng hành cùng bạn", "Tư vấn bằng tiếng Việt"]].map(([number, title, text]) => <div key={number}><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>)}</div>
    <section className="esim-catalog" ref={resultsRef} tabIndex={-1} aria-labelledby="esim-catalog-heading">
    <div className="esim-section-heading"><p className="esim-eyebrow">ĐIỂM ĐẾN CỦA BẠN</p><h2 id="esim-catalog-heading">Một hành trình. Trọn kết nối.</h2><p>Tìm gói eSIM phù hợp với nơi bạn đến và cách bạn khám phá.</p></div>
    <div className="esim-filter-panel space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FilterField label="Dung lượng"><select className={filterInputClass} value={allowance} onChange={(event) => update("allowance", event.target.value)}>{choices("allowance", allowance)}</select></FilterField>
        <FilterField label="Thời hạn"><select className={filterInputClass} value={validity} onChange={(event) => update("validity", event.target.value)}>{choices("validity", validity)}</select></FilterField>
        <FilterField label="Khoảng giá"><select className={filterInputClass} value={budget} onChange={(event) => update("budget", event.target.value)}><option value="">Tất cả mức giá</option><option value="low">Đến 200.000 đ</option><option value="mid">Trên 200.000 đến 500.000 đ</option><option value="high">Trên 500.000 đ</option><option value="contact">Giá liên hệ</option></select></FilterField>
        <SortField value={sort} onChange={(value) => update("sort", value)} esim />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-gray-500">{loading ? "Đang tải danh sách…" : error ? "Chưa tải được kết quả" : filtered.length + " gói eSIM phù hợp"}</p>{active && <button type="button" className="text-sm text-gold-600 underline py-2" onClick={() => setParams({}, { replace: true })}>Xóa bộ lọc</button>}</div>
      <p className="text-xs text-gray-500">Gói chưa có giá được xếp cuối khi sắp xếp theo giá. Điều kiện và giá thực tế cần được xác nhận khi tư vấn.</p>
    </div>
    {loading ? <CatalogSkeleton label="Đang tải gói eSIM…" /> : error ? <p role="alert" className="p-4 text-red-600">{error} <button className="underline" onClick={retry}>Thử lại</button></p> : filtered.length ? <EsimCards esims={filtered} /> : <div className="px-4 py-10 text-center space-y-3"><p className="font-medium">{active ? "Không tìm thấy gói eSIM phù hợp" : "Danh sách gói eSIM đang được cập nhật"}</p><p className="text-sm text-gray-500">{active ? "Thử thay đổi quốc gia, dung lượng, thời hạn hoặc khoảng giá." : "Vui lòng quay lại để xem các gói mới."}</p>{active && <button className="rounded-xl bg-gold-50 text-gold-600 px-4 py-3" onClick={() => setParams({}, { replace: true })}>Xóa tất cả bộ lọc</button>}<Link to="/support?service=esim" className="block text-gold-600 py-2">Nhờ FirstClass tư vấn eSIM →</Link></div>}
    </section>
    <EsimDestinations items={items} loading={loading} onSelect={(country) => {
      setParams({ q: country }, { replace: true });
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      resultsRef.current?.focus({ preventScroll: true });
    }} />
    <section className="esim-how"><div className="esim-section-heading"><p className="esim-eyebrow">NHANH CHÓNG & ĐƠN GIẢN</p><h2>Sẵn sàng trong 3 bước</h2></div><div className="esim-steps">{[["01", "Chọn gói eSIM", "Tìm theo điểm đến, dung lượng và thời hạn chuyến đi."], ["02", "Xác nhận cùng FirstClass", "Gửi yêu cầu tư vấn để xác nhận giá, thiết bị và cách nhận eSIM."], ["03", "Cài đặt & kết nối", "Làm theo hướng dẫn của gói và kích hoạt đúng thời điểm."]].map(([number, title, text]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    <section className="esim-concierge"><div><p className="esim-eyebrow">FIRSTCLASS LUÔN ĐỒNG HÀNH</p><h2>Đi xa mà vẫn gần.</h2><p>Để chúng tôi giúp bạn chọn kết nối cho hành trình tiếp theo.</p></div><Link to="/support?service=esim">Tư vấn gói eSIM <span aria-hidden="true">→</span></Link></section>
  </div>;
}
