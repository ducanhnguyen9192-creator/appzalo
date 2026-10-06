import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductGrid from "@/components/product-grid";
import TourCards from "@/components/tour-cards";
import EsimCards from "@/components/esim-cards";
import { productsState } from "@/state";
import { Tour, useContentData } from "@/utils/tours";
import { Esim } from "@/utils/esims";
import { matchesSearch } from "@/utils/search";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = (params.get("q") ?? "").slice(0, 200);
  const [input, setInput] = useState(query);
  const [group, setGroup] = useState("all");
  useEffect(() => { setInput(query); }, [query]);
  const articles = useAtomValue(productsState);
  const tours = useContentData<Tour[]>("tours");
  const esims = useContentData<Esim[]>("esims");
  const foundArticles = articles.filter((item) => matchesSearch(query, item.name, item.category?.name));
  const foundTours = (tours.data ?? []).filter((item) => matchesSearch(query, item.name, item.destination, item.duration));
  const foundEsims = (esims.data ?? []).filter((item) => matchesSearch(query, item.name, item.coverage, item.allowance, item.validity));
  const groups = [["all", "Tất cả", foundArticles.length + foundTours.length + foundEsims.length], ["tours", "Tour", foundTours.length], ["esims", "eSIM", foundEsims.length], ["articles", "Bài viết", foundArticles.length]] as const;
  return <div className="bg-white rounded-2xl pb-5">
    <div className="p-4 lg:p-6 space-y-4"><h1 className="text-xl lg:text-2xl font-bold">Tìm kiếm hành trình & thông tin</h1>
      <form onSubmit={(event) => { event.preventDefault(); setParams(input.trim() ? { q: input.trim() } : {}); }} className="flex flex-wrap gap-2">
        <label htmlFor="travel-search" className="sr-only">Tìm tour, eSIM hoặc bài viết</label><input id="travel-search" type="search" value={input} onChange={(event) => setInput(event.target.value)} maxLength={200} placeholder="Điểm đến, tên tour, gói eSIM hoặc bài viết" className="min-w-0 flex-1 border rounded-xl px-4 py-3" />
        <button className="bg-blue-600 text-white rounded-xl px-5 py-3 font-medium" type="submit">Tìm kiếm</button>
      </form>
      <p className="text-sm text-gray-500">{query ? `Kết quả cho “${query}”` : "Khám phá tour, eSIM và bài viết. Có thể tìm không dấu, ví dụ: da nang."}</p>
      <nav aria-label="Loại kết quả" className="flex flex-wrap gap-2">{groups.map(([key, title, count]) => <button key={key} aria-pressed={group === key} onClick={() => setGroup(key)} className={`rounded-xl px-3 py-2 text-sm ${group === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>{title} ({count})</button>)}</nav>
    </div>
    {(group === "all" || group === "tours") && <section aria-label="Kết quả tour"><h2 className="px-4 font-semibold">Tour du lịch</h2>{tours.loading ? <p role="status" className="p-4 text-sm">Đang tìm tour…</p> : tours.error ? <p role="alert" className="p-4 text-sm text-red-600">Không tải được tour. <button className="underline" onClick={tours.retry}>Thử lại</button></p> : foundTours.length ? <TourCards tours={foundTours} /> : <p className="p-4 text-sm text-gray-500">Chưa có tour phù hợp đang được công khai. <Link to="/support?service=tour" className="text-blue-600 underline">Nhờ tư vấn hành trình</Link></p>}</section>}
    {(group === "all" || group === "esims") && <section aria-label="Kết quả eSIM" className="mt-4"><h2 className="px-4 font-semibold">eSIM du lịch</h2>{esims.loading ? <p role="status" className="p-4 text-sm">Đang tìm eSIM…</p> : esims.error ? <p role="alert" className="p-4 text-sm text-red-600">Không tải được eSIM. <button className="underline" onClick={esims.retry}>Thử lại</button></p> : foundEsims.length ? <EsimCards esims={foundEsims} /> : <p className="p-4 text-sm text-gray-500">Chưa có gói eSIM phù hợp đang được công khai. <Link to="/support?service=esim" className="text-blue-600 underline">Nhờ tư vấn gói dữ liệu</Link></p>}</section>}
    {(group === "all" || group === "articles") && <section aria-label="Kết quả bài viết" className="mt-4"><h2 className="px-4 font-semibold">Bài viết & kinh nghiệm</h2>{foundArticles.length ? <ProductGrid products={foundArticles} /> : <p className="p-4 text-sm text-gray-500">Không tìm thấy bài viết. Thử từ khóa ngắn hơn hoặc điểm đến khác.</p>}</section>}
    <p className="px-4 mt-4 text-xs text-gray-500">Giá và tình trạng dịch vụ cần được FirstClass xác nhận khi tư vấn.</p>
  </div>;
}
