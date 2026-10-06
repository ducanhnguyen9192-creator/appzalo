import { Link } from "react-router-dom";
import ServiceRequestForm from "./service-request-form";

export default function ServiceConsultation({ service, id }: { service: "tour" | "esim"; id?: number }) {
  const isTour = service === "tour";
  const params = new URLSearchParams({ service, ...(id ? { item: String(id) } : {}) });
  return <aside className="rounded-xl bg-blue-50 border border-blue-100 p-4 space-y-3">
    <h2 className="font-semibold">{isTour ? "Bạn quan tâm hành trình này?" : "Cần chọn gói eSIM phù hợp?"}</h2>
    <p className="text-sm text-gray-600">{isTour ? "FirstClass sẽ tư vấn lịch khởi hành, số chỗ và giá tại thời điểm bạn đi." : "FirstClass sẽ tư vấn vùng phủ sóng, thiết bị tương thích và điều kiện kích hoạt trước khi mua."}</p>
    {id && <ServiceRequestForm key={`${service}:${id}`} service={service} id={id} />}
    <Link to={`/support?${params}`} className="inline-block text-blue-600 py-3 text-sm">Trao đổi trực tiếp qua OA Zalo →</Link>
  </aside>;
}
