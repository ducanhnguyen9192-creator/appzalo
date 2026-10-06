import { ServiceRequest, SERVICE_STATUS } from "@/utils/service-requests";
import { formatDateTime } from "@/utils/bookings";
import { tourPrice } from "@/utils/tours";

export default function ServiceRequestInfo({ item }: { item: ServiceRequest }) {
  return <div className="space-y-3 text-sm break-words"><h3 className="font-semibold text-base">{item.item.name}</h3><p className="text-blue-600">{SERVICE_STATUS[item.status]}</p><p className="text-xs text-gray-500">Mã yêu cầu: {item.id}</p>
    <dl className="grid sm:grid-cols-2 gap-3">{[["Dịch vụ", item.request.service === "tour" ? "Tour / combo du lịch" : "eSIM"], ["Thông tin gói lúc gửi", [item.item.destination, item.item.duration, item.item.coverage, item.item.allowance, item.item.validity].filter(Boolean).join(" · ")], ["Giá tham khảo lúc gửi", tourPrice(item.item.price)], [item.request.service === "tour" ? "Số người" : "Số gói", String(item.request.quantity)], ["Ngày mong muốn", item.request.desiredDate ? item.request.desiredDate.split("-").reverse().join("/") : "Nhờ tư vấn"], ["Liên hệ", `${item.request.fullName} · ${item.request.phone}`], ["Gửi lúc", formatDateTime(item.createdAt)], ["Cập nhật", formatDateTime(item.updatedAt)]].map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="mt-1">{value}</dd></div>)}</dl>
    {item.request.note && <p className="whitespace-pre-wrap">Ghi chú: {item.request.note}</p>}{item.response && <div className="rounded-xl bg-blue-50 p-3"><p className="font-medium text-blue-700">Phản hồi từ FirstClass</p><p className="mt-2 whitespace-pre-wrap">{item.response}</p></div>}
    <p className="text-xs text-gray-500">Yêu cầu tư vấn chưa xác nhận mua dịch vụ, thanh toán hoặc cấp mã eSIM.</p>
  </div>;
}
