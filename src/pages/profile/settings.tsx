import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AccountSettings from "@/components/account-settings";
import { Account, authRequest } from "@/utils/auth";

export default function AccountSettingsPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAccount() {
    setLoading(true);
    setError("");
    try { setAccount(await authRequest("me")); }
    catch (error) { setError(error instanceof Error ? error.message : "Không tải được tài khoản."); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadAccount(); }, []);

  return <div className="account-settings-page min-h-full bg-gray-50 py-4">
    <Link to="/profile" className="inline-block mx-4 mb-2 text-sm text-gold-600">← Quay lại tài khoản</Link>
    {loading ? <p role="status" className="px-4 text-sm text-gray-500">Đang tải cài đặt…</p>
      : error ? <p role="alert" className="px-4 text-sm text-red-600">{error} <button type="button" onClick={loadAccount} className="underline">Thử lại</button></p>
      : account ? <AccountSettings key={account.id} account={account} onChange={setAccount} />
      : <p className="px-4 text-sm text-gray-600">Vui lòng <Link to="/profile" className="text-gold-600 underline">đăng nhập</Link> để mở cài đặt tài khoản.</p>}
  </div>;
}
