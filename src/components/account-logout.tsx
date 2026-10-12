import { useState } from "react";
import { authRequest } from "@/utils/auth";

export default function AccountLogout({ onLogout }: { onLogout: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await authRequest("logout", {});
      onLogout();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể đăng xuất.");
    } finally { setBusy(false); }
  }

  return <div className="profile-logout px-4 mt-6">
    <button type="button" disabled={busy} onClick={logout}
      className="w-full rounded-xl border border-red-200 bg-white py-3 font-medium text-red-600 disabled:opacity-50">
      {busy ? "Đang đăng xuất…" : "Đăng xuất"}
    </button>
    {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
  </div>;
}
