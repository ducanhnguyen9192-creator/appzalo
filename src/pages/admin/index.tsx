import { FormEvent, useEffect, useState } from "react";
import { Account, adminAuthRequest as authRequest } from "@/utils/auth";
import ImagePicker from "./image-picker";
import TourManager from "./tour-manager";
import EsimManager from "./esim-manager";
import BookingManager from "./booking-manager";
import { adminApi } from "@/utils/admin-api";

type Customer = Account & { disabled: number; created_at: number };
type Article = { id?: number; name: string; image: string; summary: string; content: string; publishedAt: string; categoryId: number; type: "news" | "offer"; published: boolean };
type Banner = { id?: number; title: string; image: string; active: boolean };
type Overview = { customers: number; disabled: number; articles: number; banners: number };
const initialArticle = (): Article => ({ name: "", image: "/images/news/news-1.jpg", summary: "", content: "", publishedAt: new Date().toLocaleDateString("vi-VN"), categoryId: 1, type: "news", published: false });
const initialBanner = (): Banner => ({ title: "", image: "/images/banners/banner-1.jpg", active: true });
const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 mt-1";
const primary = "rounded-xl bg-blue-600 text-white px-4 py-2.5 font-medium disabled:opacity-50";
const secondary = "rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium disabled:opacity-50";
const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export default function AdminPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState<Customer[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [article, setArticle] = useState<Article | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  async function loadUsers(search = query, currentPage = page) {
    const result = await adminApi<{ users: Customer[]; total: number }>(`users?q=${encodeURIComponent(search)}&page=${currentPage}`);
    setUsers(result.users); setTotal(result.total);
  }
  async function refresh() {
    const [stats, people, content, images] = await Promise.all([
      adminApi<Overview>("overview"),
      adminApi<{ users: Customer[]; total: number }>(`users?q=${encodeURIComponent(query)}&page=${page}`),
      adminApi<{ articles: Article[] }>("articles"), adminApi<{ banners: Banner[] }>("banners"),
    ]);
    setOverview(stats); setUsers(people.users); setTotal(people.total); setArticles(content.articles); setBanners(images.banners);
  }
  useEffect(() => {
    authRequest("me").then(setAccount).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (account?.role === "admin") refresh().catch((e) => setError(e.message));
  }, [account]);

  async function act(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không thể kết nối máy chủ."); }
    finally { setBusy(false); }
  }
  async function uploadImage(file: File, target: "banner" | "article") {
    await act(async () => {
      if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh phải nhỏ hơn hoặc bằng 5 MB.");
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Chọn ảnh JPG, PNG, WebP hoặc GIF.");
      const response = await fetch(`${apiBase}/api/admin/uploads`, { method: "POST", credentials: "include", headers: { "Content-Type": file.type }, body: file });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? "Không tải được ảnh. Vui lòng thử lại.");
      if (target === "banner") setBanner((current) => current ? { ...current, image: result.image } : null);
      else setArticle((current) => current ? { ...current, image: result.image } : null);
      setNotice("Đã tải ảnh lên. Bấm Lưu để áp dụng vào nội dung.");
    });
  }
  async function login(event: FormEvent) {
    event.preventDefault();
    await act(async () => {
      const user = await authRequest("login", { email, password });
      setPassword("");
      if (user?.role !== "admin") { await authRequest("logout", {}); throw new Error("Tài khoản này không có quyền quản trị."); }
      setAccount(user);
    });
  }
  async function logout() {
    await act(async () => { await authRequest("logout", {}); setAccount(null); setUsers([]); setOverview(null); setArticles([]); setBanners([]); });
  }

  if (loading) return <div className="min-h-screen bg-gray-50 p-8" role="status">Đang kiểm tra phiên quản trị…</div>;
  if (account?.role !== "admin") return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
        <p className="text-blue-600 font-semibold">FIRSTCLASS TRAVEL</p>
        <h1 className="text-2xl font-bold mt-2">Đăng nhập quản trị</h1>
        <p className="text-sm text-gray-500 mt-2 mb-6">Dành cho tài khoản được cấp quyền quản lý.</p>
        {account ? <><p className="mb-4 text-red-600" role="alert">Tài khoản hiện tại không có quyền quản trị.</p><button className={primary} onClick={logout} disabled={busy}>Đăng xuất để đổi tài khoản</button></> : (
          <form onSubmit={login} className="space-y-4">
            <label className="block text-sm font-medium">Email quản trị<input type="email" required autoComplete="username" className={input} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label className="block text-sm font-medium">Mật khẩu<input type="password" required autoComplete="current-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <button className={`${primary} w-full`} disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập quản trị"}</button>
          </form>
        )}
        {error && <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>}
        <a href="/" className="block mt-6 text-sm text-blue-600">← Về ứng dụng</a>
      </div>
    </main>
  );

  const tabs = [{ id: "overview", label: "Tổng quan" }, { id: "users", label: "Tài khoản" }, { id: "bookings", label: "Yêu cầu & giao dịch" }, { id: "articles", label: "Tin tức & ưu đãi" }, { id: "tours", label: "Tour du lịch" }, { id: "esims", label: "eSIM" }, { id: "banners", label: "Banner" }, { id: "security", label: "Bảo mật" }];
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-bold text-blue-600">FIRSTCLASS TRAVEL</p><h1 className="text-lg font-semibold">Trang quản trị</h1></div>
        <div className="flex flex-wrap items-center gap-3 text-sm"><span>{account.name}</span><a href="/" className="text-blue-600">Xem ứng dụng ↗</a><button className={secondary} disabled={busy} onClick={logout}>Đăng xuất</button></div>
      </header>
      <div className="max-w-7xl mx-auto p-5 flex flex-col md:flex-row gap-5">
        <nav className="md:w-56 shrink-0 flex md:flex-col gap-2 flex-wrap" aria-label="Quản trị">
          {tabs.map((item) => <button key={item.id} disabled={busy} aria-current={tab === item.id ? "page" : undefined} onClick={() => { setTab(item.id); setError(""); setNotice(""); }} className={`text-left rounded-xl px-4 py-3 font-medium ${tab === item.id ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}>{item.label}</button>)}
        </nav>
        <main className="flex-1 min-w-0 space-y-4">
          <div className="flex justify-between gap-3 items-center"><h2 className="text-xl font-bold">{tabs.find((item) => item.id === tab)?.label}</h2><button className={secondary} disabled={busy} onClick={() => act(refresh)}>Làm mới</button></div>
          {error && <div role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">{error}</div>}
          {notice && <div role="status" className="rounded-xl bg-green-50 text-green-700 p-4">{notice}</div>}
          {tab === "tours" && <TourManager />}
          {tab === "esims" && <EsimManager />}
          {tab === "bookings" && <BookingManager />}
          {tab === "overview" && <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[ ["Khách hàng", overview?.customers], ["Tài khoản bị khóa", overview?.disabled], ["Bài đang hiển thị", overview?.articles], ["Banner đang bật", overview?.banners] ].map(([label, value]) => <div key={String(label)} className="bg-white border border-gray-100 rounded-2xl p-5"><p className="text-sm text-gray-500">{label}</p><p className="text-3xl font-bold mt-3">{value ?? "—"}</p></div>)}
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5"><h3 className="font-semibold">Quản lý nội dung FirstClass</h3><p className="text-gray-500 text-sm mt-2">Bài viết và banner đã bật sẽ xuất hiện trong ứng dụng khi tải lại trang. Dùng bản nháp để chuẩn bị nội dung trước khi hiển thị.</p></div>
          </>}
          {tab === "users" && <>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); act(() => loadUsers(query, 1)); }}><input className={input} aria-label="Tìm tài khoản" placeholder="Tìm theo tên hoặc email" value={query} onChange={(e) => setQuery(e.target.value)} /><button className={primary} disabled={busy}>Tìm</button></form>
            <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100"><table className="w-full text-sm text-left"><thead className="bg-gray-100"><tr>{["Họ tên / email", "Vai trò", "Ngày tạo", "Trạng thái", "Thao tác"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-t border-gray-100"><td className="p-4"><p className="font-medium">{user.name}</p><p className="text-gray-500 break-all">{user.email}</p></td><td className="p-4">{user.role === "admin" ? "Quản trị" : "Khách hàng"}</td><td className="p-4 whitespace-nowrap">{new Date(user.created_at).toLocaleDateString("vi-VN")}</td><td className="p-4">{user.disabled ? "Đã khóa" : "Hoạt động"}</td><td className="p-4">{user.role === "customer" && <button className={secondary} disabled={busy} onClick={() => act(async () => { await adminApi("users/status", { id: user.id, disabled: !user.disabled }); await refresh(); setNotice(user.disabled ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản và đăng xuất các phiên của khách hàng."); })}>{user.disabled ? "Mở khóa" : "Khóa tài khoản"}</button>}</td></tr>)}</tbody></table>{users.length === 0 && <p className="p-6 text-gray-500">Không có tài khoản phù hợp.</p>}</div>
            <div className="flex justify-between items-center text-sm"><span>{total} tài khoản · Trang {page}</span><div className="flex gap-2"><button className={secondary} disabled={busy || page === 1} onClick={() => { const next = page - 1; setPage(next); act(() => loadUsers(query, next)); }}>Trước</button><button className={secondary} disabled={busy || page * 50 >= total} onClick={() => { const next = page + 1; setPage(next); act(() => loadUsers(query, next)); }}>Sau</button></div></div>
          </>}
          {tab === "articles" && <>
            <button className={primary} disabled={busy} onClick={() => setArticle(initialArticle())}>+ Thêm bài viết</button>
            {article && <form className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); act(async () => { await adminApi("articles/save", article); setArticle(null); await refresh(); setNotice("Đã lưu bài viết. Tải lại ứng dụng để xem nội dung mới."); }); }}>
              <h3 className="font-semibold">{article.id ? "Sửa bài viết" : "Bài viết mới"}</h3>
              <label className="block text-sm">Tiêu đề<input required minLength={3} maxLength={200} className={input} value={article.name} onChange={(e) => setArticle({ ...article, name: e.target.value })} /></label>
              <div className="grid sm:grid-cols-3 gap-4"><label className="text-sm">Loại nội dung<select className={input} value={article.type} onChange={(e) => setArticle({ ...article, type: e.target.value as Article["type"] })}><option value="news">Tin tức</option><option value="offer">Ưu đãi</option></select></label><label className="text-sm">Ngày hiển thị<input maxLength={30} className={input} value={article.publishedAt} onChange={(e) => setArticle({ ...article, publishedAt: e.target.value })} /></label><label className="text-sm">Danh mục<select className={input} value={article.categoryId} onChange={(e) => setArticle({ ...article, categoryId: Number(e.target.value) })}>{["Vé máy bay", "Tour trong nước", "Tour quốc tế", "Combo du lịch", "Khách sạn", "Visa", "eSIM", "Dịch vụ sân bay", "Thuê xe", "Bảo hiểm du lịch"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label></div>
              <ImagePicker label="Ảnh bài viết" image={article.image} disabled={busy} onChange={(image) => setArticle({ ...article, image })} onUpload={(file) => uploadImage(file, "article")} />
              <label className="block text-sm">Tóm tắt<textarea maxLength={1000} className={input} value={article.summary} onChange={(e) => setArticle({ ...article, summary: e.target.value })} /></label>
              <label className="block text-sm">Nội dung<textarea rows={6} maxLength={20000} className={input} value={article.content} onChange={(e) => setArticle({ ...article, content: e.target.value })} /></label>
              <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={article.published} onChange={(e) => setArticle({ ...article, published: e.target.checked })} />Hiển thị trong ứng dụng</label>
              <div className="flex gap-2"><button className={primary} disabled={busy}>Lưu bài viết</button><button type="button" className={secondary} disabled={busy} onClick={() => setArticle(null)}>Hủy</button></div>
            </form>}
            <div className="space-y-3">{articles.map((item) => <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between gap-4"><div><p className="font-medium">{item.name}</p><p className="text-sm text-gray-500 mt-1">{item.type === "offer" ? "Ưu đãi" : "Tin tức"} · {item.published ? "Đang hiển thị" : "Bản nháp / đã ẩn"} · {item.publishedAt}</p></div><button className={secondary} disabled={busy} onClick={() => setArticle({ ...item })}>Sửa</button></div>)}</div>
          </>}
          {tab === "banners" && <>
            <button className={primary} disabled={busy} onClick={() => setBanner(initialBanner())}>+ Thêm banner</button>
            {banner && <form className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); act(async () => { await adminApi("banners/save", banner); setBanner(null); await refresh(); setNotice("Đã lưu banner. Tải lại ứng dụng để xem thay đổi."); }); }}>
              <label className="block text-sm">Tên banner<input required minLength={2} maxLength={200} className={input} value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} /></label>
              <ImagePicker label="Ảnh banner" image={banner.image} disabled={busy} onChange={(image) => setBanner({ ...banner, image })} onUpload={(file) => uploadImage(file, "banner")} />
              <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={banner.active} onChange={(e) => setBanner({ ...banner, active: e.target.checked })} />Bật hiển thị banner</label>
              <div className="flex gap-2"><button className={primary} disabled={busy}>Lưu banner</button><button type="button" className={secondary} disabled={busy} onClick={() => setBanner(null)}>Hủy</button></div>
            </form>}
            {banners.map((item) => <div key={item.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4"><div><p className="font-medium">{item.title}</p><p className="text-sm text-gray-500 break-all">{item.image}</p><p className="text-sm mt-1">{item.active ? "Đang hiển thị" : "Đã ẩn"}</p></div><button className={secondary} disabled={busy} onClick={() => setBanner({ ...item })}>Sửa</button></div>)}
          </>}
          {tab === "security" && <form className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 max-w-xl" onSubmit={(e) => { e.preventDefault(); act(async () => { if (newPassword !== confirmation) throw new Error("Mật khẩu xác nhận không khớp."); await adminApi("password", { currentPassword, password: newPassword }); setCurrentPassword(""); setNewPassword(""); setConfirmation(""); setNotice("Đã đổi mật khẩu và thu hồi các phiên cũ."); }); }}>
            <h3 className="font-semibold">Đổi mật khẩu quản trị</h3><p className="text-sm text-gray-500">Mật khẩu mới từ 12 đến 128 ký tự. Các phiên đăng nhập khác sẽ bị thu hồi.</p>
            <label className="block text-sm">Mật khẩu hiện tại<input type="password" autoComplete="current-password" required maxLength={128} className={input} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label>
            <label className="block text-sm">Mật khẩu mới<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} className={input} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
            <label className="block text-sm">Xác nhận mật khẩu mới<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} className={input} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>
            <button className={primary} disabled={busy}>Đổi mật khẩu</button>
          </form>}
        </main>
      </div>
    </div>
  );
}
