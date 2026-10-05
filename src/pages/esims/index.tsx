import { useState } from "react";
import { Link } from "react-router-dom";
import EsimCards from "@/components/esim-cards";
import { Esim } from "@/utils/esims";
import { useContentData } from "@/utils/tours";

export default function EsimsPage() {
  const { data, loading, error, retry } = useContentData<Esim[]>("esims");
  const [search, setSearch] = useState("");
  const normalize = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const filtered = (data ?? []).filter((item) => normalize(`${item.name} ${item.coverage}`).includes(normalize(search.trim())));
  return <div className="tours-page bg-white rounded-2xl pb-4">
    <div className="p-4 lg:p-6 space-y-4"><h1 className="text-xl lg:text-2xl font-bold">eSIM du lịch</h1><p className="text-sm text-gray-500">Tìm gói dữ liệu theo điểm đến, dung lượng và thời hạn sử dụng.</p><input type="search" aria-label="Tìm gói eSIM" placeholder="Tìm tên gói hoặc quốc gia" className="w-full max-w-lg border border-gray-200 rounded-xl px-4 py-3" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    {loading ? <p role="status" className="p-4">Đang tải gói eSIM…</p> : error ? <p role="alert" className="p-4 text-red-600">{error} <button className="underline" onClick={retry}>Thử lại</button></p> : filtered.length ? <EsimCards esims={filtered} /> : <div className="px-4 py-10 text-center"><p className="font-medium">{search ? "Không tìm thấy gói eSIM phù hợp" : "Danh sách gói eSIM đang được cập nhật"}</p><p className="mt-2 text-sm text-gray-500">{search ? "Thử tên gói hoặc quốc gia khác." : "Vui lòng quay lại để xem các gói mới."}</p></div>}
    <Link to="/" className="inline-block px-4 py-2 text-sm text-blue-600">← Về trang chủ</Link>
  </div>;
}
