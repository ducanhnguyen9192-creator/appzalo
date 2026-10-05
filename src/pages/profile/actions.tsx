import {
  OrderHistoryIcon,
  PackageIcon,
  ProfileIcon,
} from "../../components/vectors";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function ProfileActions() {
  const navigate = useNavigate();

  const comingSoon = () => {
    toast("Chức năng đang được cập nhật");
  };

  const actions = [
    {
      label: "Thông tin cá nhân",
      icon: ProfileIcon,
      onClick: comingSoon,
    },
    {
      label: "Yêu cầu đặt vé",
      icon: PackageIcon,
      onClick: () => navigate("/flights"),
    },
    {
      label: "Lịch sử giao dịch",
      icon: OrderHistoryIcon,
      onClick: () => navigate("/history"),
    },
    {
      label: "Hỗ trợ",
      icon: ProfileIcon,
      onClick: () => navigate("/support"),
    },
  ];

  return (
    <div className="bg-white rounded-lg p-4 grid grid-cols-4 gap-4 border-[0.5px] border-black/15">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="flex flex-col gap-2 items-center cursor-pointer active:scale-95"
        >
          <div className="w-10 h-10 rounded-full bg-[#EBEFF7] flex items-center justify-center">
            <action.icon active />
          </div>

          <div className="text-2xs text-center">
            {action.label}
          </div>
        </button>
      ))}
    </div>
  );
}
