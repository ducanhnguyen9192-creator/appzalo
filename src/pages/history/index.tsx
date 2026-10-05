import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AccountPanel from "@/components/account-panel";
import BookingInfo from "@/components/booking-info";
import { Account, authRequest } from "@/utils/auth";
import { Booking, Transaction, BookingApiError, BOOKING_STATUS, bookingApi, formatMoney, formatDateTime } from "@/utils/bookings";

export default function HistoryPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "transactions" ? "transactions" : "bookings";
  const [account, setAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  async function loadAccount() {
    setAuthLoading(true); setAuthError("");
    try { setAccount(await authRequest("me")); } catch (e) { setAuthError(e instanceof Error ? e.message : "Không kiểm tra được tài khoản."); } finally { setAuthLoading(false); }
  }
  useEffect(() => { loadAccount(); }, []);
  useEffect(() => {
    let active = true;
    setBookings([]); setTransactions([]); setTotal(0); setError("");
    if (!account) return;
    setLoading(true);
    bookingApi<{ bookings?: Booking[]; transactions?: Transaction[]; total: number }>(`${tab}?page=${page}`).then((data) => {
      if (active) { setBookings(data.bookings ?? []); setTransactions(data.transactions ?? []); setTotal(data.total); }
    }).catch((e) => { if (active) { if (e instanceof BookingApiError && e.status === 401) setAccount(null); else setError(e.message ?? "Không tải được lịch sử."); } }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account, tab, page, revision]);
  return <div className="bg-white rounded-2xl border border-gray-100 p-4 lg:p-6 space-y-5">
    <h1 className="text-xl lg:text-2xl font-bold">Lịch sử giao dịch & yêu cầu đặt vé</h1>
    {authLoading || !account ? <><p className="text-sm text-gray-500">Đăng nhập để xem yêu cầu và giao dịch của tài khoản bạn.</p><AccountPanel account={account} loading={authLoading} error={authError} onRetry={loadAccount} onChange={(value) => { setPage(1); setAccount(value); }} /></> : <>
      <div className="flex flex-wrap gap-2"><button aria-pressed={tab === "bookings"} onClick={() => { setPage(1); setParams({ tab: "bookings" }); }} className={`rounded-xl px-4 py-3 text-sm ${tab === "bookings" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Yêu cầu đặt vé</button><button aria-pressed={tab === "transactions"} onClick={() => { setPage(1); setParams({ tab: "transactions" }); }} className={`rounded-xl px-4 py-3 text-sm ${tab === "transactions" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Giao dịch đã ghi nhận</button><button className="rounded-xl border px-4 py-3 text-sm" disabled={loading} onClick={() => setRevision((value) => value + 1)}>Làm mới</button></div>
      {loading ? <p role="status">Đang tải lịch sử…</p> : error ? <p role="alert" className="text-red-600">{error}</p> : <>
        {tab === "bookings" ? bookings.length ? bookings.map((booking) => <details key={booking.id} className="border border-gray-200 rounded-xl p-4"><summary className="cursor-pointer font-medium break-words">{booking.origin} → {booking.destination} · {BOOKING_STATUS[booking.status]} · {formatDateTime(booking.createdAt)}</summary><div className="mt-4"><BookingInfo booking={booking} /></div></details>) : <p className="py-6 text-gray-500">Bạn chưa có yêu cầu đặt vé.</p> : transactions.length ? transactions.map((transaction) => <article key={transaction.id} className="border rounded-xl p-4 space-y-2 break-words"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{transaction.origin} → {transaction.destination}</h2><p className="font-semibold text-blue-600">{formatMoney(transaction.amount)}</p></div><p className="text-sm text-green-700">Đã ghi nhận thanh toán · {formatDateTime(transaction.paidAt)}</p><p className="text-xs text-gray-500">Mã giao dịch: {transaction.reference}</p><p className="text-xs text-gray-500">Mã yêu cầu: {transaction.bookingId}</p>{transaction.note && <p className="text-sm whitespace-pre-wrap">{transaction.note}</p>}</article>) : <p className="py-6 text-gray-500">Chưa có giao dịch thanh toán được ghi nhận.</p>}
        {total > 20 && <div className="flex justify-between items-center text-sm gap-3"><span>{total} mục · Trang {page}</span><div className="flex gap-2"><button className="border rounded-lg p-2" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</button><button className="border rounded-lg p-2" disabled={page * 20 >= total} onClick={() => setPage(page + 1)}>Sau</button></div></div>}
      </>}
      {tab === "transactions" && <p className="text-xs text-gray-500">Giao dịch xuất hiện sau khi FirstClass xác nhận và ghi nhận khoản thanh toán. Gửi yêu cầu đặt vé chưa tạo giao dịch thanh toán.</p>}
    </>}
    <div className="flex flex-wrap gap-4 text-sm text-blue-600"><Link to="/flights">+ Gửi yêu cầu đặt vé mới</Link><Link to="/profile">← Về tài khoản</Link></div>
  </div>;
}
