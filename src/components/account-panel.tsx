import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Account, authRequest } from "@/utils/auth";

type Props = {
  account: Account | null;
  loading: boolean;
  error: string;
  onChange: (account: Account | null) => void;
  onRetry: () => void;
};

export default function AccountPanel({ account, loading, error, onChange, onRetry }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-3 mt-1 bg-white text-gray-900";
  const buttonClass = "w-full bg-blue-600 text-white font-medium rounded-xl py-3 disabled:opacity-50";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setFormError("");
    if (mode === "register" && password !== confirmPassword) {
      setFormError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setBusy(true);
    try {
      const result = await authRequest(mode, { email, password, ...(mode === "register" ? { name } : {}) });
      onChange(result);
      setPassword(""); setConfirmPassword("");
      toast.success(mode === "register" ? "Đăng ký thành công" : "Đăng nhập thành công");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể đăng nhập.");
    } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setFormError("");
    try {
      await authRequest("logout", {});
      onChange(null);
      toast.success("Đã đăng xuất");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể đăng xuất.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mx-4 my-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      {loading ? <p role="status" className="text-sm text-gray-500">Đang kiểm tra đăng nhập…</p> : account ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Tài khoản của bạn</h2>
          <p className="text-sm text-gray-600 break-all">{account.email}</p>
          <button type="button" className={buttonClass} disabled={busy} onClick={logout}>
            {busy ? "Đang đăng xuất…" : "Đăng xuất"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4" role="group" aria-label="Chọn đăng nhập hoặc đăng ký">
            {(["login", "register"] as const).map((value) => (
              <button key={value} type="button" disabled={busy} aria-pressed={mode === value}
                onClick={() => { setMode(value); setFormError(""); setPassword(""); setConfirmPassword(""); }}
                className={`flex-1 py-2.5 rounded-xl font-medium ${mode === value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
                {value === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mb-4">{mode === "register" ? "Tạo tài khoản FirstClass Travel bằng email của bạn." : "Đăng nhập tài khoản FirstClass Travel của bạn."}</p>
          {error && <div className="mb-3 text-sm text-red-600" role="alert">{error} <button type="button" onClick={onRetry} className="underline">Thử lại</button></div>}
          <form onSubmit={submit} className="space-y-3">
            <fieldset disabled={busy} className="space-y-3">
              {mode === "register" && <label className="block text-sm font-medium">Họ và tên
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={100} />
              </label>}
              <label className="block text-sm font-medium">Email
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required maxLength={254} />
              </label>
              <label className="block text-sm font-medium">Mật khẩu
                <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} required minLength={8} maxLength={128} />
              </label>
              {mode === "register" && <>
                <p className="text-xs text-gray-500">Mật khẩu từ 8 đến 128 ký tự.</p>
                <label className="block text-sm font-medium">Xác nhận mật khẩu
                  <input className={inputClass} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required minLength={8} maxLength={128} />
                </label>
              </>}
              <button type="submit" className={buttonClass}>{busy ? "Đang xử lý…" : mode === "register" ? "Tạo tài khoản" : "Đăng nhập"}</button>
            </fieldset>
          </form>
        </>
      )}
      {formError && <p role="alert" className="text-sm text-red-600 mt-3">{formError}</p>}
    </section>
  );
}
