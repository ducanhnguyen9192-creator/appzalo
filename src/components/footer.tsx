import { HomeIcon, PlaneIcon, CategoryIcon, ProfileIcon } from "./vectors";
import HorizontalDivider from "./horizontal-divider";
import TransitionLink from "./transition-link";

function HistoryIcon({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--primary)" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    name: "Trang chủ",
    path: "/",
    icon: HomeIcon,
  },
  {
    name: "Vé máy bay",
    path: "/flights",
    icon: PlaneIcon,
  },
  {
    name: "Danh mục",
    path: "/categories",
    icon: CategoryIcon,
  },
  {
    name: "Lịch sử",
    path: "/history",
    icon: HistoryIcon,
  },
  {
    name: "Tài khoản",
    path: "/profile",
    icon: ProfileIcon,
  },
];

export default function Footer() {
  return (
    <>
      <HorizontalDivider />
      <nav
        aria-label="Điều hướng chính"
        className="w-full px-4 pt-2 grid"
        style={{
          gridTemplateColumns: `repeat(${NAV_ITEMS.length}, 1fr)`,
          paddingBottom: `max(16px, env(safe-area-inset-bottom))`,
        }}
      >
        {NAV_ITEMS.map((item) => {
          return (
            <TransitionLink
              to={item.path}
              key={item.path}
              className="flex flex-col items-center space-y-0.5 p-1 pb-0.5 cursor-pointer active:scale-105"
            >
              {({ isActive }) => (
                <>
                  <div className="w-6 h-6 flex justify-center items-center">
                    <item.icon active={isActive} />
                  </div>
                  <div className={`text-2xs ${isActive ? "text-primary" : ""}`}>
                    {item.name}
                  </div>
                </>
              )}
            </TransitionLink>
          );
        })}
      </nav>
    </>
  );
}
