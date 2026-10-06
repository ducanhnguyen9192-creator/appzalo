import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AccountPanel from "./account-panel";
import { Account, authRequest } from "@/utils/auth";
import { ServiceRequest, serviceApi } from "@/utils/service-requests";
import { BookingApiError } from "@/utils/bookings";
import { vietnamToday } from "@/utils/flight-form";
import { showNotice } from "@/utils/notifications";

export default function ServiceRequestForm({ service, id }: { service: "tour" | "esim"; id: number }) {
  const [account, setAccount] = useState<Account | null>(null), [loading, setLoading] = useState(true), [authError, setAuthError] = useState("");
  const [fullName, setFullName] = useState(""), [phone, setPhone] = useState(""), [quantity, setQuantity] = useState("1"), [desiredDate, setDesiredDate] = useState(""), [note, setNote] = useState("");
  const [showAuth, setShowAuth] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [sent, setSent] = useState<ServiceRequest | null>(null);
  const retryKey = useRef({ fingerprint: "", key: "" });
  async function checkAccount() { setLoading(true); setAuthError(""); try { setAccount(await authRequest("me")); } catch (e) { setAuthError(e instanceof Error ? e.message : "Không kiểm tra được đăng nhập."); } finally { setLoading(false); } }
  useEffect(() => { checkAccount(); }, []);
  useEffect(() => { if (account) setFullName(value => value || account.name); }, [account]);
  const input = "w-full bg-white border border-gray-200 rounded-xl px-3 py-3 mt-1";
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError("");
    if (!/^\+?[\d\s().-]{7,30}$/.test(phone.trim())) { setError("Số điện thoại không hợp lệ."); showNotice("error", "Chưa gửi được yêu cầu", "Vui lòng kiểm tra số điện thoại."); return; }
    if (!account) { setShowAuth(true); return; }
    const body = { service, itemId: id, fullName, phone, quantity: Number(quantity), desiredDate, note };
    const fingerprint = JSON.stringify({ account: account.id, ...body });
    if (retryKey.current.fingerprint !== fingerprint) retryKey.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    try { const result = await serviceApi<{ request: ServiceRequest }>("", { ...body, requestKey: retryKey.current.key }); setSent(result.request); retryKey.current = { fingerprint: "", key: "" }; }
    catch (e) { setError(e instanceof Error ? e.message : "Chưa gửi được yêu cầu."); if (e instanceof BookingApiError && e.status === 401) { setAccount(null); setShowAuth(true); } }
    finally { setBusy(false); }
  }
  if (sent) return <div role="status" className="space-y-3 rounded-xl bg-green-50 p-4"><h3 className="font-semibold">Đã gửi yêu cầu tư vấn</h3><p className="text-sm break-all">Mã yêu cầu: {sent.id}</p><p className="text-sm">FirstClass sẽ kiểm tra thông tin và liên hệ. Đây chưa phải xác nhận mua hoặc thanh toán.</p><Link to="/history?tab=services" className="inline-block text-blue-600 font-medium py-2">Theo dõi yêu cầu tour/eSIM →</Link><button type="button" className="block text-sm underline py-2" onClick={() => setSent(null)}>Gửi yêu cầu mới</button></div>;
  return <section className="space-y-4"><h3 className="font-semibold">Gửi yêu cầu tư vấn trong app</h3><p className="text-sm text-gray-600">Yêu cầu được lưu theo tài khoản để bạn xem trạng thái và phản hồi. Chưa tạo đặt chỗ, thanh toán hoặc mã eSIM.</p>
    {showAuth && !account && <AccountPanel account={account} loading={loading} error={authError} onRetry={checkAccount} onChange={setAccount} />}
    <form onSubmit={submit}><fieldset disabled={busy || loading} className="space-y-3"><div className="grid sm:grid-cols-2 gap-3"><label className="block text-sm">Họ và tên<input required minLength={2} maxLength={100} autoComplete="name" className={input} value={fullName} onChange={e => setFullName(e.target.value)} /></label><label className="block text-sm">Số điện thoại<input required type="tel" autoComplete="tel" maxLength={30} className={input} value={phone} onChange={e => setPhone(e.target.value)} /></label><label className="block text-sm">{service === "tour" ? "Số người (dự kiến)" : "Số gói eSIM"}<input required type="number" min={1} max={20} step={1} className={input} value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label className="block text-sm">Ngày sử dụng mong muốn (không bắt buộc)<input type="date" min={vietnamToday()} className={input} value={desiredDate} onChange={e => setDesiredDate(e.target.value)} /></label></div><label className="block text-sm">Ghi chú<textarea rows={3} maxLength={2000} className={input} value={note} onChange={e => setNote(e.target.value)} /></label><button type="submit" className="rounded-xl bg-blue-600 text-white px-5 py-3 font-medium">{busy ? "Đang gửi…" : loading ? "Đang kiểm tra đăng nhập…" : account ? "Gửi yêu cầu tư vấn" : "Đăng nhập để gửi yêu cầu"}</button></fieldset></form>
    {showAuth && account && <p className="text-sm text-blue-700">Đã đăng nhập. Kiểm tra nội dung và bấm Gửi yêu cầu tư vấn để xác nhận.</p>}{error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
  </section>;
}
