import { HomeIcon, PlaneIcon, TravelIcon, ProfileIcon } from "./vectors";
import HorizontalDivider from "./horizontal-divider";
import { useAtomValue } from "jotai";
import { cartState } from "@/state";
import TransitionLink from "./transition-link";

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
    name: "Du lịch",
    path: "/categories",
    icon: TravelIcon,
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
      <div
        className="w-full px-4 pt-2 grid"
        style={{
          gridTemplateColumns: `repeat(${NAV_ITEMS.length}, 1fr)`,
          paddingBottom: `max(16px, env(safe-area-inset-bottom)`,
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
      </div>
    </>
  );
}
