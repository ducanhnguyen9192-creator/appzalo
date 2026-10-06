import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { FilterField, SortField, filterInputClass } from "@/components/catalog-filters";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import TourCards from "@/components/tour-cards";
import ProductListPage from "@/pages/catalog/product-list";
import { Tour, TourKind, TOUR_KINDS, categoryPath, useTourData, tourPath } from "@/utils/tours";
import { matchesBudget, filterOptions, sortCatalog, SORT_OPTIONS } from "@/utils/catalog-filters";
import { matchesSearch } from "@/utils/search";
import { usePageTitle } from "@/utils/page-title";

export function CategoryDestination() {
  const { id } = useParams();
  return [1, 2, 3, 4, 7].includes(Number(id)) ? <Navigate to={categoryPath(Number(id))} replace /> : <ProductListPage />;
}

export default function ToursPage({ kind = "" }: { kind?: TourKind | "" }) {
  const [params] = useSearchParams();
  const legacyKind = params.get("type") ?? "";
  if (!kind && Object.keys(TOUR_KINDS).includes(legacyKind)) {
    const next = new URLSearchParams(params); next.delete("type");
    const query = next.toString();
    return <Navigate to={tourPath(legacyKind as TourKind) + (query ? "?" + query : "")} replace />;
  }
  return <TourCatalog key={kind} kind={kind} />;
}

function TourCatalog({ kind }: { kind: TourKind | "" }) {
  const [params, setParams] = useSearchParams();
  const search = (params.get("q") ?? "").slice(0, 200);
  const duration = params.get("duration") ?? "";
  const budget = ["low", "mid", "high", "contact"].includes(params.get("budget") ?? "") ? params.get("budget")! : "";
  const rawSort = params.get("sort") ?? "newest";
  const sort = SORT_OPTIONS.some(([key]) => key === rawSort) ? rawSort : "newest";
  const { data, loading, error, retry } = useTourData<Tour[]>("tours" + (kind ? "?type=" + kind : ""));
  const items = (data ?? []).filter((tour) => !kind || tour.kind === kind);
  const filtered = sortCatalog(items.filter((tour) => matchesSearch(search, tour.name, tour.destination) && (!duration || tour.duration === duration) && matchesBudget(tour.price, budget, 5000000, 10000000)), sort, (tour) => tour.duration);
  const active = !!(search || duration || budget || sort !== "newest");
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); if (value && value !== "newest") next.set(key, value); else next.delete(key); setParams(next, { replace: true }); };
  const title = kind ? TOUR_KINDS[kind] : "Tour có sẵn";
  usePageTitle(title);
  const descriptions = { domestic: "Khám phá các hành trình tại Việt Nam. Danh sách này chỉ hiển thị tour trong nước.", international: "Khám phá các hành trình nước ngoài. Danh sách này chỉ hiển thị tour quốc tế.", combo: "Chọn combo cho kỳ nghỉ, xem dịch vụ kết hợp và điều kiện từng gói." };
  return <div className="tours-page bg-white rounded-2xl pb-4">
    <div className="p-4 lg:p-6 space-y-4"><h1 className="text-xl lg:text-2xl font-bold">{title}</h1><p className="text-sm text-gray-500">{kind ? descriptions[kind] : "Chọn nhóm tour trong nước, quốc tế hoặc combo để tìm hành trình phù hợp."}</p>
      <nav className="flex flex-wrap gap-2" aria-label="Nhóm tour">{[["", "Tất cả"], ...Object.entries(TOUR_KINDS)].map(([value, label]) => <Link key={value} to={value ? tourPath(value as TourKind) : "/tours"} aria-current={kind === value ? "page" : undefined} className={"rounded-xl px-4 py-2.5 text-sm " + (kind === value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600")}>{label}</Link>)}</nav>
      <FilterField label="Tìm tour"><input type="search" placeholder="Tìm tên tour hoặc điểm đến" value={search} maxLength={200} onChange={(event) => update("q", event.target.value)} className={filterInputClass} /></FilterField>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FilterField label="Thời lượng"><select className={filterInputClass} value={duration} onChange={(event) => update("duration", event.target.value)}><option value="">Tất cả thời lượng</option>{filterOptions(items.map((tour) => tour.duration)).map((value) => <option key={value}>{value}</option>)}{duration && !items.some((tour) => tour.duration === duration) && <option>{duration}</option>}</select></FilterField>
        <FilterField label="Khoảng giá"><select className={filterInputClass} value={budget} onChange={(event) => update("budget", event.target.value)}><option value="">Tất cả mức giá</option><option value="low">Đến 5 triệu đồng</option><option value="mid">Trên 5 đến 10 triệu đồng</option><option value="high">Trên 10 triệu đồng</option><option value="contact">Giá liên hệ</option></select></FilterField>
        <SortField value={sort} onChange={(value) => update("sort", value)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm text-gray-500">{loading ? "Đang tải danh sách…" : error ? "Chưa tải được kết quả" : filtered.length + " tour phù hợp"}</p>{active && <button type="button" className="text-sm text-blue-600 underline py-2" onClick={() => setParams({}, { replace: true })}>Xóa bộ lọc</button>}</div>
      <p className="text-xs text-gray-500">Tour chưa có giá được xếp cuối khi sắp xếp theo giá. Giá thực tế cần được xác nhận khi tư vấn.</p>
    </div>
    {loading ? <CatalogSkeleton label="Đang tải danh sách tour…" /> : error ? <p role="alert" className="p-4 text-red-600">{error} <button className="underline" onClick={retry}>Thử lại</button></p> : filtered.length ? kind ? <TourCards tours={filtered} /> : Object.entries(TOUR_KINDS).map(([value, label]) => { const group = filtered.filter((tour) => tour.kind === value); return group.length ? <section key={value} aria-label={label} className="mb-4"><div className="px-4 flex flex-wrap justify-between items-center gap-2"><h2 className="font-semibold text-lg">{label}</h2><Link className="text-sm text-blue-600 py-2" to={tourPath(value as TourKind)}>Xem riêng nhóm này →</Link></div><TourCards tours={group} /></section> : null; }) : <div className="px-4 py-10 text-center space-y-3"><p className="font-medium">{active ? "Không tìm thấy tour phù hợp" : "Chưa có tour đang hiển thị trong nhóm này"}</p><p className="text-sm text-gray-500">{active ? "Thử thay đổi từ khóa, thời lượng hoặc khoảng giá." : "Danh sách đang được cập nhật. Bạn có thể chọn nhóm khác hoặc nhờ tư vấn."}</p>{active && <button className="rounded-xl bg-blue-50 text-blue-600 px-4 py-3" onClick={() => setParams({}, { replace: true })}>Xóa bộ lọc của nhóm này</button>}<Link to="/support?service=tour" className="block text-blue-600 py-2">Nhờ FirstClass tư vấn tour →</Link></div>}
    <Link to="/" className="inline-block px-4 py-2 text-sm text-blue-600">← Về trang chủ</Link>
  </div>;
}
