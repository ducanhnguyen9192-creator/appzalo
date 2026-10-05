import { NavLink, Outlet } from "react-router-dom";
import headerLogo from "@/static/header-logo.svg";
import Header from "./header";
import Footer from "./footer";
import { Suspense } from "react";
import { PageSkeleton } from "./skeleton";
import { Toaster } from "react-hot-toast";
import { ScrollRestoration } from "./scroll-restoration";

export default function Layout() {
  return (
    <div className="app-shell flex flex-col bg-background text-foreground">
      <div className="mobile-header"><Header /></div>
      <header className="desktop-header">
        <div className="desktop-header-inner">
          <NavLink to="/" aria-label="FirstClass Travel - Trang chủ" className="desktop-brand"><img src={headerLogo} alt="" /><span>FirstClass Travel</span></NavLink>
          <nav aria-label="Điều hướng chính" className="desktop-nav">
            {[["/", "Trang chủ"], ["/flights", "Vé máy bay"], ["/categories", "Du lịch"], ["/profile", "Tài khoản"]].map(([path, label]) => (
              <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => isActive ? "is-active" : ""}>{label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <div className="app-content flex-1 overflow-y-auto">
        <main className="app-route">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
        </main>
      </div>
      <div className="mobile-footer"><Footer /></div>
      <Toaster
        containerClassName="toast-container"
        containerStyle={{
          top: "calc(50% - 24px)",
        }}
      />
      <ScrollRestoration />
    </div>
  );
}
