import { FormEvent, useEffect, useState } from "react";
import BookingInfo from "@/components/booking-info";
import { adminApi } from "@/utils/admin-api";
import { showNotice } from "@/utils/notifications";
import { Booking, BookingStatus, BOOKING_STATUS, formatDateTime, formatMoney } from "@/utils/bookings";

type AdminBooking = Booking & { customerEmail: string; transactions: { id: string; amount: number; reference: string; note: string; paidAt: string }[] };
const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 mt-1";
const primary = "rounded-xl bg-blue-600 text-white px-4 py-2.5 font-medium disabled:opacity-50";
const secondary = "rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium disabled:opacity-50";
const localNow = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0,16); };

export default function BookingManager() {
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
  async function refresh() { const result = await adminApi<{ bookings: AdminBooking[]; total: number }>(`bookings?page=${page}`); setBookings(result.bookings); setTotal(result.total); }
  useEffect(() => { setLoading(true); setSelectedId(""); refresh().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [page]);
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Không kết nối được máy chủ."); } finally { setBusy(false); }
  }
  function open(booking: AdminBooking) { setSelectedId(booking.id); setStatus(booking.status); setResponse(booking.response); setPayment({ amount: "", reference: "", paidAt: localNow(), note: "" }); setError(""); setNotice(""); }
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
    <button className={secondary} disabled={busy || loading} onClick={() => act(refresh)}>Làm mới yêu cầu</button>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 text-green-700 p-4">{notice}</p>}
    {selected && <section className="bg-white border rounded-2xl p-5 space-y-5">
      <div className="flex justify-between items-center gap-3"><h3 className="font-semibold">Chi tiết yêu cầu</h3><button className={secondary} disabled={busy} onClick={() => setSelectedId("")}>Đóng</button></div>
      <p className="text-sm text-gray-500 break-all">Tài khoản: {selected.customerEmail}</p><BookingInfo booking={selected} />
      <form onSubmit={saveStatus} className="space-y-3 border-t pt-4"><fieldset disabled={busy} className="space-y-3"><label className="block text-sm">Trạng thái yêu cầu<select className={input} value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>{Object.entries(BOOKING_STATUS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm">Phản hồi cho khách hàng<textarea rows={4} maxLength={5000} className={input} value={response} onChange={(e) => setResponse(e.target.value)} /></label><button className={primary}>Lưu trạng thái & phản hồi</button></fieldset></form>
      <div className="border-t pt-4 space-y-3"><h3 className="font-semibold">Giao dịch đã ghi nhận</h3>{selected.transactions.length ? selected.transactions.map((transaction) => <div key={transaction.id} className="bg-gray-50 rounded-xl p-3 text-sm break-words"><p className="font-semibold">{formatMoney(transaction.amount)} · {transaction.reference}</p><p>{formatDateTime(transaction.paidAt)}</p>{transaction.note && <p className="whitespace-pre-wrap mt-1">{transaction.note}</p>}</div>) : <p className="text-sm text-gray-500">Chưa có giao dịch thanh toán.</p>}</div>
      <form onSubmit={recordPayment} className="space-y-3 border-t pt-4"><h3 className="font-semibold">Ghi nhận khoản thanh toán</h3><p className="text-sm text-gray-500">Chỉ nhập khoản tiền đã xác nhận nhận được. Chức năng này lưu lịch sử, không thu tiền. Mã giao dịch phải khớp chứng từ; ghi chú sẽ hiển thị cho khách hàng.</p><fieldset disabled={busy} className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3"><label className="block text-sm">Số tiền đã nhận (VNĐ)<input required type="number" min={1} max={1000000000} step={1} className={input} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} /></label><label className="block text-sm">Mã giao dịch / chứng từ<input required maxLength={200} className={input} value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></label><label className="block text-sm">Thời điểm thanh toán<input required type="datetime-local" className={input} value={payment.paidAt} onChange={(e) => setPayment({ ...payment, paidAt: e.target.value })} /></label></div>
        <label className="block text-sm">Ghi chú giao dịch<textarea rows={2} maxLength={2000} className={input} value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} /></label><button className={primary}>Ghi nhận giao dịch</button>
      </fieldset></form>
    </section>}
    {loading ? <p role="status">Đang tải yêu cầu…</p> : bookings.length ? bookings.map((booking) => <div key={booking.id} className="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center"><div className="min-w-0 break-words"><p className="font-medium">{booking.origin} → {booking.destination}</p><p className="text-sm text-gray-500">{booking.fullName} · {booking.phone}</p><p className="text-sm text-blue-600">{BOOKING_STATUS[booking.status]} · {formatDateTime(booking.createdAt)}</p></div><button className={secondary} disabled={busy} onClick={() => open(booking)}>Xem / xử lý</button></div>) : <p className="bg-white border rounded-xl p-6 text-gray-500">Chưa có yêu cầu đặt vé.</p>}
    {total > 20 && <div className="flex justify-between items-center gap-3 text-sm"><span>{total} yêu cầu · Trang {page}</span><div className="flex gap-2"><button className={secondary} disabled={busy || loading || page === 1} onClick={() => setPage(page - 1)}>Trước</button><button className={secondary} disabled={busy || loading || page * 20 >= total} onClick={() => setPage(page + 1)}>Sau</button></div></div>}
  </div>;
}
