import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AccountPanel from "@/components/account-panel";
import AccountSettings from "@/components/account-settings";
import { Account, authRequest } from "@/utils/auth";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const user = { name: account?.name || "Khách hàng FirstClass", avatar: "" };

  const loadAccount = async () => {
    setLoading(true);
    setAuthError("");
    try { setAccount(await authRequest("me")); }
    catch (error) { setAuthError(error instanceof Error ? error.message : "Không tải được tài khoản."); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadAccount(); }, []);

  const quickItems = [
    {
      title: "Yêu cầu đặt vé",
      description: "Gửi yêu cầu mới",
      icon: "✈️",
      action: () => navigate("/flights"),
    },
    {
      title: "Lịch sử giao dịch",
      description: "Giao dịch, vé, tour và eSIM",
      icon: "🧾",
      action: () => navigate("/history"),
    },
    {
      title: "Tour du lịch",
      description: "Khám phá tour có sẵn",
      icon: "🧳",
      action: () => navigate("/tours"),
    },
    {
      title: "Hỗ trợ",
      description: "FirstClass hỗ trợ bạn",
      icon: "💬",
      action: () => navigate("/support"),
    },
  ];

  return (
    <div className={`profile-page ${account ? "profile-authenticated" : ""} min-h-full bg-gray-50 pb-8`}>
      <div className="profile-identity bg-white px-4 pt-5 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || "Avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">👤</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-gray-900 truncate">
              {user.name}
            </div>

            <div className="text-sm text-gray-500 mt-1">
              {account ? "Đã đăng nhập FirstClass Travel" : "Chưa đăng nhập"}
            </div>
          </div>
        </div>
      </div>

      <AccountPanel account={account} loading={loading} error={authError}
        onRetry={loadAccount} onChange={(value) => { setAccount(value); setAuthError(""); }} />
      {account && <AccountSettings key={account.id} account={account} onChange={setAccount} />}

      <div className="px-4 -mt-1">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 text-white shadow-sm">
          <div className="text-sm text-blue-100">
            FirstClass Travel
          </div>

          <div className="text-xl font-semibold mt-1">
            Chào mừng bạn!
          </div>

          <div className="text-sm text-blue-100 mt-2 leading-5">
            Gửi yêu cầu vé máy bay, theo dõi dịch vụ và nhận hỗ trợ trong cùng một nơi.
          </div>

          <button
            type="button"
            onClick={() => navigate("/flights")}
            className="mt-4 bg-white text-blue-600 font-medium text-sm px-4 py-2.5 rounded-xl active:scale-[0.99]"
          >
            Đặt vé máy bay
          </button>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          {quickItems.map((item) => (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className="bg-white rounded-2xl p-4 text-left border border-gray-100 shadow-sm active:scale-[0.99]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                {item.icon}
              </div>

              <div className="font-medium text-gray-900 mt-3">
                {item.title}
              </div>

              <div className="text-xs text-gray-500 mt-1">
                {item.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="font-semibold text-gray-900">
            Cần hỗ trợ?
          </div>

          <div className="text-sm text-gray-500 mt-1 leading-5">
            FirstClass Travel luôn sẵn sàng hỗ trợ các yêu cầu vé máy bay, tour và dịch vụ du lịch.
          </div>

          <button
            type="button"
            onClick={() => navigate("/support")}
            className="w-full mt-4 border border-blue-600 text-blue-600 font-medium rounded-xl py-3 active:bg-blue-50"
          >
            Liên hệ hỗ trợ
          </button>
        </div>
      </div>

      <div className="profile-signature text-center text-xs text-gray-400 mt-6">
        FirstClass Travel
      </div>
    </div>
  );
}
