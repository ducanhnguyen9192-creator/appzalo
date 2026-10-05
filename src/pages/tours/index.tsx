import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import TourCards from "@/components/tour-cards";
import ProductListPage from "@/pages/catalog/product-list";
import { Tour, TourKind, TOUR_KINDS, categoryPath, useTourData } from "@/utils/tours";
import { useState } from "react";

export function CategoryDestination() {
  const { id } = useParams();
  return [2, 3, 4].includes(Number(id)) ? <Navigate to={categoryPath(Number(id))} replace /> : <ProductListPage />;
}

export default function ToursPage() {
  const [params, setParams] = useSearchParams();
  const rawType = params.get("type") ?? "";
  const kind = Object.keys(TOUR_KINDS).includes(rawType) ? rawType as TourKind : "";
  const [search, setSearch] = useState("");
  const { data, loading, error, retry } = useTourData<Tour[]>(`tours${kind ? `?type=${kind}` : ""}`);
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const filtered = (data ?? []).filter((tour) => normalize(`${tour.name} ${tour.destination}`).includes(normalize(search.trim())));
  return <div className="tours-page bg-white rounded-2xl pb-4">
    <div className="p-4 lg:p-6 space-y-4"><h1 className="text-xl lg:text-2xl font-bold">{kind ? TOUR_KINDS[kind] : "Tour có sẵn"}</h1><p className="text-sm text-gray-500">Khám phá hành trình, lịch khởi hành và thông tin chi tiết của từng tour.</p>
      <nav className="flex flex-wrap gap-2" aria-label="Nhóm tour">{[["", "Tất cả"], ...Object.entries(TOUR_KINDS)].map(([value, label]) => <button key={value} onClick={() => { setSearch(""); setParams(value ? { type: value } : {}); }} aria-pressed={kind === value} className={`rounded-xl px-4 py-2.5 text-sm ${kind === value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>{label}</button>)}</nav>
      <input type="search" aria-label="Tìm tour" placeholder="Tìm tên tour hoặc điểm đến" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full max-w-lg border border-gray-200 rounded-xl px-4 py-3" />
    </div>
    {loading ? <p role="status" className="p-4 text-gray-500">Đang tải danh sách tour…</p> : error ? <p role="alert" className="p-4 text-red-600">{error} <button className="underline" onClick={retry}>Thử lại</button></p> : filtered.length ? <TourCards tours={filtered} /> : <div className="px-4 py-10 text-center"><p className="font-medium">{search ? "Không tìm thấy tour phù hợp" : "Chưa có tour đang hiển thị trong nhóm này"}</p><p className="text-sm text-gray-500 mt-2">{search ? "Thử tìm với tên tour hoặc điểm đến khác." : "Danh sách đang được cập nhật. Bạn có thể xem thêm các nhóm tour khác."}</p></div>}
    <Link to="/" className="inline-block px-4 py-2 text-sm text-blue-600">← Về trang chủ</Link>
  </div>;
}
