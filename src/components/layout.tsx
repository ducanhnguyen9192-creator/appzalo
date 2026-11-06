import { useLanguage } from "@/i18n/store";
import { NavLink, Outlet } from "react-router-dom";
import headerLogo from "@/static/header-logo.svg";
import Header from "./header";
import Footer from "./footer";
import DesktopFooter from "./desktop-footer";
import { Suspense } from "react";
import { PageSkeleton } from "./skeleton";
import { Toaster } from "react-hot-toast";
import { ScrollRestoration } from "./scroll-restoration";
import LanguageSelector from "./language-selector";
import { CurrencyProvider, CurrencyNotice } from "./currency-provider";
import LanguageNotice from "./language-notice";
import ScrollReveal from "./scroll-reveal";

export default function Layout() {
  const { t } = useLanguage();
  return (
    <CurrencyProvider><div className="app-shell flex flex-col bg-background text-foreground">
      <div className="mobile-header"><Header /><div className="mobile-currency-selector"><LanguageSelector /></div></div>
      <header className="desktop-header">
        <div className="desktop-header-inner">
          <NavLink to="/" aria-label={t("FirstClass Travel - Trang chủ")} className="desktop-brand"><img src={headerLogo} alt="FirstClass" /></NavLink>
          <nav aria-label="Điều hướng chính" className="desktop-nav">
            {[["/flights", "Vé máy bay"], ["/history", "Lịch sử"], ["/", "Trang chủ"], ["/gioi-thieu", "Giới thiệu công ty"], ["/profile", "Tài khoản"]].map(([path, label]) => (
              <NavLink key={path} to={path} end={path === "/"} className={({ isActive }) => isActive ? "is-active" : ""}>{label}</NavLink>
            ))}
            <LanguageSelector />
            <NavLink to="/support" className="desktop-contact">Yêu cầu hợp tác</NavLink>
          </nav>
        </div>
      </header>
      <div className="app-content flex-1 overflow-y-auto">
        <LanguageNotice />
        <CurrencyNotice />
        <main className="app-route">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
        </main>
        <DesktopFooter />
      </div>
      <div className="mobile-footer"><Footer /></div>
      <Toaster
        containerClassName="toast-container"
        containerStyle={{
          top: "calc(50% - 24px)",
        }}
      />
      <ScrollRestoration />
      <ScrollReveal />
    </div></CurrencyProvider>
  );
}
