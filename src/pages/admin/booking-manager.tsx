import RequestFilters from "./request-filters";
import EditorDialog from "./editor-dialog";
import "./booking-detail.css";
import { confirmDiscardChanges, useUnsavedChanges } from "./unsaved-changes";
import { FormEvent, useEffect, useState } from "react";
import BookingInfo from "@/components/booking-info";
import { adminApi } from "@/utils/admin-api";
import { showNotice } from "@/utils/notifications";
import { Booking, BookingStatus, BOOKING_STATUS, formatBookingRoute, formatDateTime, formatMoney } from "@/utils/bookings";

type AdminBooking = Booking & { customerEmail: string; transactions: { id: string; amount: number; reference: string; note: string; paidAt: string }[] };
const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 mt-1";
const primary = "rounded-xl bg-gold-600 text-white px-4 py-2.5 font-medium disabled:opacity-50";
const secondary = "rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium disabled:opacity-50";
const localNow = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,16); };

export default function BookingManager() {
  const [filters, setFilters] = useState("");
  const [revision, setRevision] = useState(0);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState<BookingStatus>("received");
  const [response, setResponse] = useState("");
  const [payment, setPayment] = useState({ amount: "", reference: "", paidAt: localNow(), note: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selected = bookings.find((booking) => booking.id === selectedId);
  async function refresh() { const result = await adminApi<{ bookings: AdminBooking[]; total: number }>(`bookings?page=${page}&${filters}`); setBookings(result.bookings); setTotal(result.total); if (page > 1 && !result.bookings.length) setPage(Math.max(1, Math.ceil(result.total / 20))); }
  useEffect(() => {
    let active = true; setLoading(true); setError(""); setSelectedId("");
    adminApi<{ bookings: AdminBooking[]; total: number }>(`bookings?page=${page}&${filters}`).then(result => {
      if (!active) return;
      setBookings(result.bookings); setTotal(result.total);
      if (page > 1 && !result.bookings.length) setPage(Math.max(1, Math.ceil(result.total / 20)));
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, filters, revision]);
  useUnsavedChanges(Boolean(selected && (status !== selected.status || response !== selected.response || payment.amount || payment.reference || payment.note)));
  function applyFilters(value: string) { if (!confirmDiscardChanges()) return false; setSelectedId(""); setPage(1); setFilters(value); setRevision(value => value + 1); return true; }
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Không kết nối được máy chủ."); } finally { setBusy(false); }
  }
  function open(booking: AdminBooking) { if (!confirmDiscardChanges()) return; setSelectedId(booking.id); setStatus(booking.status); setResponse(booking.response); setPayment({ amount: "", reference: "", paidAt: localNow(), note: "" }); setError(""); setNotice(""); }
  async function saveStatus(event: FormEvent) { event.preventDefault(); if (!selected) return; await act(async () => { await adminApi("bookings/status", { id: selected.id, status, response }); await refresh(); setNotice("Đã cập nhật trạng thái và phản hồi. Khách hàng có thể xem trong lịch sử."); }); }
  async function recordPayment(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    await act(async () => {
      const paidAt = new Date(payment.paidAt);
      if (!Number.isFinite(paidAt.getTime())) { showNotice("error", "Chưa ghi nhận được giao dịch", "Thời điểm thanh toán không hợp lệ."); throw new Error("Thời điểm thanh toán không hợp lệ."); }
      await adminApi("bookings/payment", { bookingId: selected.id, amount: Number(payment.amount), reference: payment.reference, paidAt: paidAt.toISOString(), note: payment.note });
      await refresh(); setPayment({ amount: "", reference: "", paidAt: localNow(), note: "" }); setNotice("Đã ghi nhận giao dịch thanh toán vào lịch sử khách hàng.");
    });
  }
  return <div className="space-y-4">
    <button className={secondary} disabled={busy || loading} onClick={() => { if (confirmDiscardChanges()) setRevision(value => value + 1); }}>Làm mới yêu cầu</button>
    <RequestFilters statuses={BOOKING_STATUS} disabled={busy || loading} onApply={applyFilters} />
    {!loading && <p className="text-sm text-gray-500" role="status">{total} yêu cầu phù hợp</p>}
    {!selected && error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">{error}</p>}
    {!selected && notice && <p role="status" className="rounded-xl bg-green-50 text-green-700 p-4">{notice}</p>}
    {selected && <EditorDialog enabled title="Chi tiết yêu cầu & giao dịch" busy={busy} error={error} notice={notice} onClose={() => { if (confirmDiscardChanges()) setSelectedId(""); }}><section className="booking-detail">
      <div className="booking-summary">
        <div className="booking-summary-top"><span className="booking-eyebrow">YÊU CẦU ĐẶT VÉ</span><span className={`booking-status booking-status-${selected.status}`}>{BOOKING_STATUS[selected.status]}</span></div>
        <h3>{formatBookingRoute(selected)}</h3>
        <p className="booking-reference">Mã yêu cầu: {selected.id}</p>
        <div className="booking-summary-grid"><div><span>Khách hàng</span><strong>{selected.fullName}</strong><a href={`tel:${selected.phone}`}>{selected.phone}</a></div><div><span>Đã ghi nhận thanh toán</span><strong>{formatMoney(selected.transactions.reduce((total, transaction) => total + transaction.amount, 0))}</strong><small>{selected.transactions.length} giao dịch · Không phải số dư còn lại</small></div></div>
      </div>
      <div className="booking-attention"><strong>{selected.status === "received" ? "Yêu cầu mới cần xử lý" : selected.status === "cancelled" ? "Yêu cầu đã hủy" : selected.status === "ticketed" ? "Đã ghi nhận trạng thái xuất vé" : "Theo dõi tiến độ xử lý"}</strong><p>{selected.response ? "Đã có phản hồi cho khách. Kiểm tra thông tin trước khi cập nhật tiếp." : "Chưa có phản hồi cho khách hàng. Nhập nội dung ở phần Xử lý yêu cầu bên dưới."}</p></div>
      <section className="booking-panel booking-information"><h3><span>01</span> Thông tin hành trình</h3><p className="booking-account">Tài khoản: {selected.customerEmail}</p><BookingInfo booking={selected} /></section>
      <form onSubmit={saveStatus} className="booking-panel booking-action"><h3><span>02</span> Xử lý yêu cầu</h3><p className="booking-panel-note">Cập nhật trạng thái và nội dung khách hàng sẽ thấy trong lịch sử.</p><fieldset disabled={busy} className="space-y-3"><label className="block text-sm">Trạng thái yêu cầu<select className={input} value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>{Object.entries(BOOKING_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm">Phản hồi cho khách hàng<textarea rows={4} maxLength={5000} className={input} value={response} onChange={(e) => setResponse(e.target.value)} /></label><div className="booking-save"><span>{status !== selected.status || response !== selected.response ? "Có thay đổi chưa lưu" : "Chỉnh sửa rồi bấm lưu để cập nhật"}</span><button className={primary}>Lưu trạng thái & phản hồi</button></div></fieldset></form>
      <section className="booking-panel booking-payments"><h3><span>03</span> Giao dịch đã ghi nhận <small>({selected.transactions.length})</small></h3>{selected.transactions.length ? selected.transactions.map((transaction) => <div key={transaction.id} className="booking-transaction"><strong>{formatMoney(transaction.amount)}</strong><p>Mã chứng từ: {transaction.reference}</p><p>{formatDateTime(transaction.paidAt)}</p>{transaction.note && <p className="whitespace-pre-wrap mt-1">{transaction.note}</p>}</div>) : <p className="booking-empty">Chưa có giao dịch thanh toán được ghi nhận cho yêu cầu này.</p>}
      <details className="booking-payment-entry"><summary>+ Ghi nhận khoản thanh toán</summary><form onSubmit={recordPayment} className="space-y-3 pt-4"><p className="booking-panel-note">Chỉ nhập khoản tiền đã xác nhận nhận được. Chức năng này lưu lịch sử, không thu tiền. Mã giao dịch phải khớp chứng từ; ghi chú sẽ hiển thị cho khách hàng.</p><fieldset disabled={busy} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3"><label className="block text-sm">Số tiền đã nhận (VNĐ)<input required type="number" min={1} max={1000000000} step={1} className={input} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></label><label className="block text-sm">Mã giao dịch / chứng từ<input required maxLength={200} className={input} value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></label><label className="block text-sm">Thời điểm thanh toán<input required type="datetime-local" className={input} value={payment.paidAt} onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })} /></label></div>
        <label className="block text-sm">Ghi chú giao dịch<textarea rows={2} maxLength={2000} className={input} value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} /></label><button className={primary}>Ghi nhận giao dịch</button>
      </fieldset></form></details></section>
    </section></EditorDialog>}
    {loading ? <p role="status">Đang tải yêu cầu…</p> : bookings.length ? bookings.map((booking) => <div key={booking.id} className="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center"><div className="min-w-0 break-words"><p className="font-medium">{formatBookingRoute(booking)}</p><p className="text-sm text-gray-500">{booking.fullName} · {booking.phone}</p><p className="text-sm text-gold-600">{BOOKING_STATUS[booking.status]} · {formatDateTime(booking.createdAt)}</p></div><button className={secondary} disabled={busy} onClick={() => open(booking)}>Xem / xử lý</button></div>) : <p className="bg-white border rounded-xl p-6 text-gray-500">Không có yêu cầu phù hợp. Thử đổi hoặc xóa bộ lọc.</p>}
    {total > 20 && <div className="flex justify-between items-center gap-3 text-sm"><span>{total} yêu cầu · Trang {page}</span><div className="flex gap-2"><button className={secondary} disabled={busy || loading || page === 1} onClick={() => { if (confirmDiscardChanges()) setPage(page - 1); }}>Trước</button><button className={secondary} disabled={busy || loading || page * 20 >= total} onClick={() => { if (confirmDiscardChanges()) setPage(page + 1); }}>Sau</button></div></div>}
  </div>;
}
