import { FormEvent, useEffect, useState } from "react";
import { Account, accountAction } from "@/utils/auth";
import { showNotice } from "@/utils/notifications";

export default function AccountSettings({ account, onChange }: { account: Account; onChange: (value: Account) => void }) {
  const [name, setName] = useState(account.name);
  const [phone, setPhone] = useState(account.phone ?? "");
  const [currentPassword, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [capabilityError, setCapabilityError] = useState("");
  async function loadCapabilities() {
    setCapabilityError("");
    try { setEmailEnabled(Boolean((await accountAction("capabilities")).emailEnabled)); }
    catch { setCapabilityError("Không kiểm tra được dịch vụ email."); }
  }
  useEffect(() => { loadCapabilities(); }, []);
  async function run(path: string, body: Record<string, string>) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await accountAction(path, body);
      if (result.user) onChange(result.user);
      if (path === "password") { setCurrent(""); setPassword(""); setConfirm(""); }
    } catch (error) { setError(error instanceof Error ? error.message : "Không xử lý được yêu cầu."); }
    finally { setBusy(false); }
  }
  const input = "block w-full mt-1 border rounded-xl p-3 bg-white";
  const button = "rounded-xl bg-blue-600 text-white px-4 py-3 disabled:opacity-50";
  return <section className="account-settings mx-4 my-4 bg-white rounded-2xl border p-4 space-y-5">
    <h2 className="font-semibold text-lg">Cài đặt tài khoản</h2>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); run("profile", { name, phone }); }}>
      <fieldset disabled={busy} className="space-y-3">
        <label className="block text-sm">Họ và tên<input className={input} required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="block text-sm">Số điện thoại<input className={input} type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} /></label>
        <button className={button}>Lưu thông tin</button>
      </fieldset>
    </form>
    <div className="border-t pt-4 space-y-2">
      <h3 className="font-medium">Xác minh email</h3>
      <p className="text-sm break-all">{account.email}</p>
      <p className={`text-sm ${account.emailVerified ? "text-green-700" : "text-gray-500"}`}>{account.emailVerified ? "Đã xác minh" : "Chưa xác minh"}</p>
      {!account.emailVerified && <>
        {emailEnabled === false && <p className="text-sm text-gray-500">Dịch vụ gửi email chưa được thiết lập. Bạn vẫn có thể sử dụng tài khoản.</p>}
        {capabilityError && <p role="alert" className="text-sm text-red-600">{capabilityError} <button type="button" className="underline" onClick={loadCapabilities}>Thử lại</button></p>}
        <button type="button" className={button} disabled={busy || emailEnabled !== true} onClick={() => run("send-verification", {})}>Gửi email xác minh</button>
        {emailEnabled && <button type="button" className="block text-sm text-blue-600" onClick={async () => { try { const result = await accountAction("me"); if (result.user) onChange(result.user); } catch { setError("Không tải được trạng thái xác minh."); } }}>Tôi đã xác minh — cập nhật trạng thái</button>}
      </>}
    </div>
    <form className="account-password border-t pt-4" onSubmit={event => {
      event.preventDefault();
      if (password !== confirm) { setError("Mật khẩu xác nhận không khớp."); showNotice("error", "Chưa đổi được mật khẩu", "Mật khẩu xác nhận không khớp."); return; }
      run("password", { currentPassword, password });
    }}>
      <h3 className="font-medium mb-3">Đổi mật khẩu</h3>
      <fieldset disabled={busy} className="space-y-3">
        <label className="block text-sm">Mật khẩu hiện tại<input className={input} type="password" autoComplete="current-password" required minLength={8} maxLength={128} value={currentPassword} onChange={e => setCurrent(e.target.value)} /></label>
        <label className="block text-sm">Mật khẩu mới<input className={input} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block text-sm">Nhập lại mật khẩu mới<input className={input} type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <p className="text-xs text-gray-500">Từ 8 đến 128 ký tự. Đổi mật khẩu sẽ kết thúc các phiên đăng nhập cũ và giữ bạn đăng nhập tại đây.</p>
        <button className={button}>Đổi mật khẩu</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </section>;
}
