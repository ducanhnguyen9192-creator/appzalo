export type Account = { id: string; name: string; email: string; role: "admin" | "customer" };
import { notified } from "./notifications";

const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function requestAccount(path: string, body?: Record<string, string>, audience: "customer" | "admin" = "customer"): Promise<Account | null> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/${audience === "admin" ? "admin/auth" : "auth"}/${path}`, {
      method: body ? "POST" : "GET",
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Vui lòng thử lại.");
  }
  if (path === "me" && response.status === 401) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Máy chủ chưa sẵn sàng. Vui lòng thử lại.");
  if (path === "logout" && audience === "customer") {
    try { sessionStorage.removeItem("firstclass.flight-draft.v1"); } catch {}
  }
  return data?.user ?? null;
}

export function authRequest(path: string, body?: Record<string, string>, audience: "customer" | "admin" = "customer") {
  const work = () => requestAccount(path, body, audience);
  if (!body) return work();
  const title = path === "register" ? "Đăng ký thành công" : path === "logout" ? "Đã đăng xuất" : "Đăng nhập thành công";
  return notified(work, () => ({ title, message: path === "logout" ? "Phiên đăng nhập đã được kết thúc." : audience === "admin" ? "Bạn đã đăng nhập trang quản trị FirstClass." : path === "register" ? "Tài khoản FirstClass của bạn đã được tạo. Bạn có thể gửi và theo dõi yêu cầu." : "Bạn có thể gửi yêu cầu và xem lịch sử của tài khoản mình." }), path === "register" ? "Đăng ký chưa thành công" : path === "logout" ? "Chưa đăng xuất được" : "Đăng nhập chưa thành công");
}

export function adminAuthRequest(path: string, body?: Record<string, string>) {
  return authRequest(path, body, "admin");
}
