import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getUserInfo } from "zmp-sdk";

type UserInfo = {
  name?: string;
  avatar?: string;
};

export default function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserInfo>({
    name: "Khách hàng Firstclass",
    avatar: "",
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await getUserInfo({
          avatarType: "normal",
        });

        const info = result?.userInfo;

        setUser({
          name: info?.name || "Khách hàng Firstclass",
          avatar: info?.avatar || "",
        });
      } catch (error) {
        console.error("Không lấy được thông tin Zalo:", error);
      }
    };

    loadUser();
  }, []);

  const comingSoon = (feature: string) => {
    toast(`${feature} đang được cập nhật`);
  };

  const quickItems = [
    {
      title: "Yêu cầu đặt vé",
      description: "Gửi yêu cầu mới",
      icon: "✈️",
      action: () => navigate("/flights"),
    },
    {
      title: "Lịch sử giao dịch",
      description: "Vé, tour và dịch vụ",
      icon: "🧾",
      action: () => comingSoon("Lịch sử giao dịch"),
    },
    {
      title: "Tour đã đăng ký",
      description: "Theo dõi hành trình",
      icon: "🧳",
      action: () => comingSoon("Tour đã đăng ký"),
    },
    {
      title: "Hỗ trợ",
      description: "Firstclass hỗ trợ bạn",
      icon: "💬",
      action: () => comingSoon("Trung tâm hỗ trợ"),
    },
  ];

  const menuItems = [
    {
      title: "Thông tin cá nhân",
      subtitle: "Họ tên, số điện thoại, email",
      icon: "👤",
      action: () => comingSoon("Thông tin cá nhân"),
    },
    {
      title: "Thông tin xuất hóa đơn",
      subtitle: "Lưu thông tin doanh nghiệp",
      icon: "🏢",
      action: () => comingSoon("Thông tin xuất hóa đơn"),
    },
    {
      title: "Hành khách thường xuyên",
      subtitle: "Lưu thông tin người thường đi cùng",
      icon: "👥",
      action: () => comingSoon("Hành khách thường xuyên"),
    },
    {
      title: "Chính sách & điều khoản",
      subtitle: "Quy định sử dụng dịch vụ",
      icon: "📄",
      action: () => comingSoon("Chính sách & điều khoản"),
    },
    {
      title: "Bảo mật & quyền riêng tư",
      subtitle: "Quản lý dữ liệu và quyền truy cập",
      icon: "🔒",
      action: () => comingSoon("Bảo mật & quyền riêng tư"),
    },
  ];

  return (
    <div className="min-h-full bg-gray-50 pb-8">
      <div className="bg-white px-4 pt-5 pb-6">
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
              Tài khoản Firstclass Travel
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-1">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 text-white shadow-sm">
          <div className="text-sm text-blue-100">
            Firstclass Travel
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
        <div className="text-sm font-semibold text-gray-700 mb-2 px-1">
          Tài khoản & tiện ích
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {menuItems.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-4 text-left active:bg-gray-50 ${
                index !== menuItems.length - 1
                  ? "border-b border-gray-100"
                  : ""
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg shrink-0">
                {item.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {item.title}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {item.subtitle}
                </div>
              </div>

              <div className="text-gray-300 text-lg">
                ›
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
            Firstclass Travel luôn sẵn sàng hỗ trợ các yêu cầu vé máy bay, tour và dịch vụ du lịch.
          </div>

          <button
            type="button"
            onClick={() => comingSoon("Kênh hỗ trợ")}
            className="w-full mt-4 border border-blue-600 text-blue-600 font-medium rounded-xl py-3 active:bg-blue-50"
          >
            Liên hệ hỗ trợ
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 mt-6">
        Firstclass Travel
      </div>
    </div>
  );
}
