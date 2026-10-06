import { Link } from "react-router-dom";
import { ServiceRequest, SERVICE_STATUS } from "@/utils/service-requests";
import { formatDateTime } from "@/utils/bookings";
import ServiceRequestInfo from "./service-request-info";
import CopyButton from "./copy-button";

export default function ServiceRequestList({ requests, page, onFirstPage }: { requests: ServiceRequest[]; page: number; onFirstPage: () => void }) {
  if (!requests.length) return <div className="py-6 space-y-3"><p className="text-gray-500">{page > 1 ? "Không còn yêu cầu trên trang này." : "Bạn chưa gửi yêu cầu tour/eSIM."}</p>{page > 1 && <button className="text-blue-600 underline" onClick={onFirstPage}>Về trang đầu</button>}<Link className="block text-blue-600" to="/tours">Khám phá tour →</Link><Link className="block text-blue-600" to="/esims">Chọn gói eSIM →</Link></div>;
  return <>{requests.map(item => <details key={item.id} className="border border-gray-200 rounded-xl p-4"><summary className="cursor-pointer font-medium break-words">{item.item.name} · {SERVICE_STATUS[item.status]} · {formatDateTime(item.createdAt)}</summary><div className="mt-4 space-y-3"><ServiceRequestInfo item={item} /><CopyButton text={item.id} label="Sao chép mã yêu cầu" /><Link className="block text-blue-600 text-sm py-2" to="/support">Hỏi FirstClass về yêu cầu này →</Link></div></details>)}</>;
}
