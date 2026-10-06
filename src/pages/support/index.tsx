import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { openChat } from "zmp-sdk";
import { getConfig } from "@/utils/template";
import { Tour, tourPrice, useContentData } from "@/utils/tours";
import { Esim } from "@/utils/esims";

function ConsultationContext({ service, id }: { service: "tour" | "esim"; id: string }) {
  const { data, loading, error, retry } = useContentData<Tour | Esim>(`${service === "tour" ? "tours" : "esims"}/${id}`);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  if (loading) return <p role="status" className="text-sm">Đang tải thông tin cần tư vấn…</p>;
  if (error || !data) return <div role="alert" className="rounded-xl bg-amber-50 p-4 text-sm">Thông tin này hiện không còn khả dụng. Bạn vẫn có thể liên hệ OA để được tư vấn. <button className="text-blue-600 underline" onClick={retry}>Thử tải lại</button></div>;
  const detailPath = `/${service === "tour" ? "tours" : "esims"}/${id}`;
  const message = service === "tour" && "destination" in data
    ? `Tôi muốn được tư vấn tour: ${data.name} (mã tour ${id}).\nĐiểm đến: ${data.destination}. Thời lượng: ${data.duration}.\nGiá tham khảo: ${tourPrice(data.price)}.\nNgày dự kiến đi: …\nSố người lớn / trẻ em: …\nNhờ FirstClass xác nhận lịch khởi hành, số chỗ và giá.`
    : "coverage" in data ? `Tôi muốn được tư vấn eSIM: ${data.name} (mã gói ${id}).\nVùng phủ sóng: ${data.coverage}.\nDung lượng: ${data.allowance}. Thời hạn: ${data.validity}.\nGiá tham khảo: ${tourPrice(data.price)}.\nNgày sử dụng: …\nThiết bị tôi dùng: …\nNhờ FirstClass kiểm tra tính tương thích và điều kiện kích hoạt.` : "";
  async function copy() {
    try { await navigator.clipboard.writeText(message); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <section className="rounded-xl border p-4 space-y-3 break-words"><h2 className="font-semibold">Bạn đang cần tư vấn: {data.name}</h2><Link to={detailPath} className="text-sm text-blue-600">Xem lại thông tin →</Link>
    <p className="text-sm text-gray-600">Sao chép nội dung gợi ý, mở Zalo bên dưới rồi dán vào chat và bổ sung những mục có dấu “…”.</p>
    <label htmlFor="consultation-message" className="block text-sm font-medium">Nội dung gợi ý gửi FirstClass</label><textarea id="consultation-message" readOnly value={message} rows={7} onFocus={(event) => event.currentTarget.select()} className="w-full border rounded-xl p-3 text-sm bg-gray-50" />
    <button onClick={copy} className="rounded-xl border border-blue-200 text-blue-600 px-4 py-3 text-sm font-medium">Sao chép nội dung</button>
    {copied && <p role="status" className="text-sm text-green-700">Đã sao chép. Bạn có thể dán vào chat Zalo.</p>}
    {copyError && <p role="status" className="text-sm text-gray-600">Trình duyệt chưa cho phép sao chép. Chạm vào ô nội dung, chọn Sao chép trên thiết bị.</p>}
    <p className="text-xs text-gray-500">Nội dung chưa được gửi và chưa tạo đơn đặt dịch vụ.</p>
  </section>;
}

export default function SupportPage() {
  const [params] = useSearchParams();
  const service = params.get("service");
  const id = params.get("item");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const oaId = getConfig((config) => config.template.oaIDtoOpenChat);
  const oaLink = `https://zalo.me/${oaId}`;
  const inZalo = /Zalo/i.test(navigator.userAgent);
  async function chat() {
    setBusy(true); setError("");
    try { await openChat({ type: "oa", id: oaId }); }
    catch { setError("Không mở được chat trong ứng dụng. Bạn có thể mở trang Zalo của FirstClass bên dưới."); }
    finally { setBusy(false); }
  }
  return <div className="bg-white border border-gray-100 rounded-2xl p-5 lg:p-8 max-w-3xl mx-auto space-y-5">
    <p className="text-sm font-semibold text-blue-600">FIRSTCLASS TRAVEL</p><h1 className="text-2xl font-bold">Hỗ trợ & tư vấn</h1>
    <p className="text-gray-600">Trao đổi với FirstClass qua Zalo để hỏi về vé máy bay, tour, eSIM hoặc yêu cầu đã gửi.</p>
    {(service === "tour" || service === "esim") && (id && /^[1-9]\d{0,9}$/.test(id) ? <ConsultationContext key={`${service}-${id}`} service={service} id={id} /> : <p className="rounded-xl bg-gray-50 p-4 text-sm">{service === "tour" ? "Để tư vấn tour, bạn hãy cho biết điểm đến, ngày đi dự kiến và số người lớn / trẻ em khi nhắn OA." : "Để tư vấn eSIM, bạn hãy cho biết quốc gia sẽ đến, ngày sử dụng và mẫu điện thoại khi nhắn OA."}</p>)}
    <div className="bg-blue-50 rounded-xl p-4 space-y-3"><h2 className="font-semibold">Zalo Official Account</h2><p className="text-sm text-gray-600">Nếu cần hỗ trợ yêu cầu đặt vé, hãy gửi kèm mã yêu cầu để nhân viên dễ tra cứu.</p>
      {inZalo ? <button className="rounded-xl bg-blue-600 text-white px-5 py-3 font-medium disabled:opacity-50" disabled={busy} onClick={chat}>{busy ? "Đang mở…" : "Chat với FirstClass trên Zalo"}</button> : <a className="inline-block rounded-xl bg-blue-600 text-white px-5 py-3 font-medium" href={oaLink} target="_blank" rel="noopener noreferrer">Mở Zalo FirstClass ↗</a>}
      {inZalo && <a href={oaLink} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600">Hoặc mở trang OA Zalo ↗</a>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
    <div className="grid sm:grid-cols-2 gap-3"><Link to="/history" className="border rounded-xl p-4 text-blue-600 font-medium">Xem yêu cầu & giao dịch →</Link><Link to="/flights" className="border rounded-xl p-4 text-blue-600 font-medium">Gửi yêu cầu đặt vé mới →</Link></div>
    <p className="text-sm text-gray-500">Đây là kênh liên hệ. Yêu cầu đặt vé vẫn cần nhân viên xác nhận hành trình, giá và điều kiện trước khi thanh toán.</p>
  </div>;
}
