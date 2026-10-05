import ProductGrid from "@/components/product-grid";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { categoriesState, productsState } from "@/state";

export default function ProductListPage() {
  const products = useAtomValue(productsState);
  const categories = useAtomValue(categoriesState);
  const { id } = useParams();
  const category = categories.find((item) => item.id === Number(id));
  const [topic, setTopic] = useState(0);
  const [search, setSearch] = useState("");
  const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const filtered = products.filter((item) => (!(category?.id ?? topic) || item.category?.id === (category?.id ?? topic)) && normalize(item.name).includes(normalize(search.trim())));
  return <div className="bg-white rounded-2xl border border-gray-100 pb-5">
    <div className="p-4 lg:p-6 space-y-4"><h1 className="text-xl lg:text-2xl font-bold">{category?.name ?? "Tin tức & kinh nghiệm du lịch"}</h1>
      {category && <><p className="text-sm text-gray-500">Tìm hiểu thông tin {category.name.toLowerCase()} và trao đổi với FirstClass để được tư vấn theo nhu cầu của bạn.</p><Link to="/support" className="inline-block rounded-xl bg-blue-600 text-white px-4 py-3 text-sm font-medium">Nhận tư vấn {category.name.toLowerCase()}</Link><h2 className="font-semibold">Thông tin liên quan</h2></>}
      {!id && <nav aria-label="Chủ đề tin tức" className="flex flex-wrap gap-2">{[{ id: 0, name: "Tất cả" }, ...categories.filter((item) => products.some((product) => product.category?.id === item.id))].map((item) => <button key={item.id} aria-pressed={topic === item.id} onClick={() => setTopic(item.id)} className={`rounded-xl px-3 py-2 text-sm ${topic === item.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>{item.name}</button>)}</nav>}
      <label className="block text-sm">Tìm bài viết<input type="search" placeholder="Tên bài viết hoặc từ khóa" className="block w-full max-w-lg border rounded-xl px-4 py-3 mt-1" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
    </div>
    {filtered.length ? <ProductGrid products={filtered} /> : <p className="px-4 py-6 text-sm text-gray-500">{search ? "Không tìm thấy bài viết phù hợp. Thử từ khóa khác." : "Thông tin đang được cập nhật. Bạn có thể liên hệ FirstClass để được tư vấn."}</p>}
  </div>;
}
