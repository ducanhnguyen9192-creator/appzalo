import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { accountAction } from "@/utils/auth";
import { showNotice } from "@/utils/notifications";

export default function AccountRecovery() {
  const location = useLocation();
  const verify = location.pathname.endsWith("/verify-email");
  const forgot = location.pathname.endsWith("/forgot-password");
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get("token") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    // Strip the secret from the address bar and retain it only in this page's memory.
    if (location.hash) window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    if (forgot) accountAction("capabilities").then(value => setEnabled(Boolean(value.emailEnabled))).catch(() => setError("Không kiểm tra được dịch vụ email. Vui lòng tải lại trang."));
  }, []);
  const input = "block w-full border rounded-xl p-3 mt-1 bg-white";
  return <section className="mx-auto max-w-xl p-4">
    <div className="rounded-2xl bg-white border p-5 space-y-4">
      <h1 className="text-xl font-semibold">{forgot ? "Quên mật khẩu" : verify ? "Xác minh email" : "Đặt lại mật khẩu"}</h1>
      {forgot && enabled === false ? <p className="text-sm text-gray-600">Dịch vụ gửi email chưa được thiết lập. Vui lòng liên hệ FirstClass để được hỗ trợ khôi phục tài khoản.</p> : !forgot && !token ? <p role="alert" className="text-sm text-red-600">Liên kết thiếu mã xác nhận. Vui lòng mở lại liên kết trong email hoặc yêu cầu liên kết mới.</p> : message ? <p role="status" className="text-sm text-green-700">{message}</p> : <form className="space-y-4" onSubmit={async event => {
        event.preventDefault(); if (busy) return;
        if (!forgot && !verify && password !== confirm) { setError("Mật khẩu xác nhận không khớp."); showNotice("error", "Chưa đặt lại được mật khẩu", "Mật khẩu xác nhận không khớp."); return; }
        setBusy(true); setError("");
        try {
          const result = await accountAction(forgot ? "forgot-password" : verify ? "verify-email" : "reset-password", forgot ? { email } : verify ? { token } : { token, password });
          setMessage(result.message ?? "Đã xử lý yêu cầu."); setPassword(""); setConfirm("");
        } catch (error) { setError(error instanceof Error ? error.message : "Không xử lý được yêu cầu."); }
        finally { setBusy(false); }
      }}>
        <fieldset disabled={busy} className="space-y-4">
          {forgot ? <label className="block text-sm">Email tài khoản<input className={input} type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label> : verify ? <p className="text-sm text-gray-600">Bấm xác nhận để xác minh email cho tài khoản của bạn.</p> : <>
            <label className="block text-sm">Mật khẩu mới<input className={input} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
            <label className="block text-sm">Nhập lại mật khẩu mới<input className={input} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
            <p className="text-xs text-gray-500">Từ 8 đến 128 ký tự. Các phiên đăng nhập cũ sẽ kết thúc.</p>
          </>}
          <button disabled={forgot && enabled !== true} className="w-full rounded-xl bg-blue-600 text-white p-3 disabled:opacity-50">{busy ? "Đang xử lý…" : forgot ? "Gửi liên kết khôi phục" : verify ? "Xác nhận email" : "Lưu mật khẩu mới"}</button>
        </fieldset>
      </form>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-4 text-sm text-blue-600"><Link to="/profile">Về tài khoản</Link><Link to="/support">Liên hệ hỗ trợ</Link>{!forgot && <Link to="/forgot-password">Yêu cầu liên kết khôi phục mới</Link>}</div>
    </div>
  </section>;
}
