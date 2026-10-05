import { useState } from "react";
import { Link } from "react-router-dom";
import { openChat } from "zmp-sdk";
import { getConfig } from "@/utils/template";

export default function SupportPage() {
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
    <div className="bg-blue-50 rounded-xl p-4 space-y-3"><h2 className="font-semibold">Zalo Official Account</h2><p className="text-sm text-gray-600">Nếu cần hỗ trợ yêu cầu đặt vé, hãy gửi kèm mã yêu cầu để nhân viên dễ tra cứu.</p>
      {inZalo ? <button className="rounded-xl bg-blue-600 text-white px-5 py-3 font-medium disabled:opacity-50" disabled={busy} onClick={chat}>{busy ? "Đang mở…" : "Chat với FirstClass trên Zalo"}</button> : <a className="inline-block rounded-xl bg-blue-600 text-white px-5 py-3 font-medium" href={oaLink} target="_blank" rel="noopener noreferrer">Mở Zalo FirstClass ↗</a>}
      {inZalo && <a href={oaLink} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600">Hoặc mở trang OA Zalo ↗</a>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
    <div className="grid sm:grid-cols-2 gap-3"><Link to="/history" className="border rounded-xl p-4 text-blue-600 font-medium">Xem yêu cầu & giao dịch →</Link><Link to="/flights" className="border rounded-xl p-4 text-blue-600 font-medium">Gửi yêu cầu đặt vé mới →</Link></div>
    <p className="text-sm text-gray-500">Đây là kênh liên hệ. Yêu cầu đặt vé vẫn cần nhân viên xác nhận hành trình, giá và điều kiện trước khi thanh toán.</p>
  </div>;
}
