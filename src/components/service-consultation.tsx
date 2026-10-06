import { Link } from "react-router-dom";

export default function ServiceConsultation({ service, id }: { service: "tour" | "esim"; id?: number }) {
  const isTour = service === "tour";
  const params = new URLSearchParams({ service, ...(id ? { item: String(id) } : {}) });
  return <aside className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-3">
    <h2 className="font-semibold">{isTour ? "Bạn quan tâm hành trình này?" : "Cần chọn gói eSIM phù hợp?"}</h2>
    <p className="text-sm text-gray-600">{isTour ? "FirstClass sẽ tư vấn lịch khởi hành, số chỗ và giá tại thời điểm bạn đi." : "FirstClass sẽ tư vấn vùng phủ sóng, thiết bị tương thích và điều kiện kích hoạt trước khi mua."}</p>
    <Link to={`/support?${params}`} className="inline-block rounded-xl bg-blue-600 text-white px-5 py-3 font-medium">{isTour ? "Nhận tư vấn tour này" : "Nhận tư vấn gói eSIM này"} →</Link>
  </aside>;
}
