import adminLogo from "@/static/header-logo.svg";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { confirmDiscardChanges } from "./unsaved-changes";
import "./navigation.css";

export const adminGroups = [
  { label: "Tổng quan", items: [{ id: "overview", label: "Tổng quan" }, { id: "statistics", label: "Thống kê yêu cầu" }] },
  { label: "Kinh doanh", items: [{ id: "bookings", label: "Yêu cầu & giao dịch" }, { id: "services", label: "Yêu cầu tour/eSIM" }] },
  { label: "Nội dung", items: [{ id: "articles", label: "Tin tức & ưu đãi" }, { id: "tours", label: "Tour du lịch" }, { id: "esims", label: "eSIM" }, { id: "banners", label: "Banner" }] },
  { label: "Hệ thống", items: [{ id: "users", label: "Tài khoản" }, { id: "audit", label: "Nhật ký thao tác" }] },
];

export function AdminHeader({ name, busy, onLogout, onSecurity }: { name: string; busy: boolean; onLogout: () => void; onSecurity: () => void }) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);
  return <header className="admin-header">
    <div className="admin-header-inner">
    <img className="admin-brand-logo" src={adminLogo} alt="FirstClass Travel" width="792" height="512" />
    <details className="admin-account" ref={menu}>
      <summary aria-label="Menu tài khoản"><span className="admin-avatar" aria-hidden="true">{name.trim().charAt(0).toUpperCase() || "A"}</span></summary>
      <div className="admin-account-panel">
        <p>{name}</p>
        <button disabled={busy} onClick={() => { onSecurity(); if (menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}>Bảo mật</button>
        <Link to="/" onClick={event => { if (!confirmDiscardChanges()) event.preventDefault(); }}>Xem ứng dụng ↗</Link>
        <button disabled={busy} onClick={onLogout}>Đăng xuất</button>
      </div>
    </details>
    </div>
  </header>;
}

export function AdminNavigation({ tab, busy, onSelect }: { tab: string; busy: boolean; onSelect: (id: string) => void }) {
  return <nav className="admin-navigation" aria-label="Quản trị">
    <select className="admin-mobile-navigation" aria-label="Chọn mục quản trị" value={tab} disabled={busy} onChange={event => onSelect(event.target.value)}>
      {tab === "security" && <option value="security" hidden>Bảo mật</option>}
      {adminGroups.map(group => <optgroup key={group.label} label={group.label}>{group.items.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}
    </select>
    <div className="admin-sidebar">
      {adminGroups.map(group => <div className="admin-nav-group" key={group.label}>
        <p>{group.label}</p>
        {group.items.map(item => <button key={item.id} disabled={busy} aria-current={tab === item.id ? "page" : undefined} onClick={() => onSelect(item.id)}>{item.label}</button>)}
      </div>)}
    </div>
  </nav>;
}
