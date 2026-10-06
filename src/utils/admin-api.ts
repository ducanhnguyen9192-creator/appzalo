export const adminApiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
import { notified } from "./notifications";

async function requestAdmin<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(`${adminApiBase}/api/admin/${path}`, { credentials: "include", method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error("Không kết nối được máy chủ quản trị. Vui lòng thử lại."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Không thể kết nối máy chủ quản trị.");
  return data;
}
export function adminApi<T>(path: string, body?: unknown): Promise<T> {
  const work = () => requestAdmin<T>(path, body);
  if (!body) return work();
  const notices: Record<string, { title: string; message: string }> = {
    "bookings/payment": { title: "Đã ghi nhận giao dịch", message: "Khoản thanh toán đã được lưu trong lịch sử khách hàng. Thao tác này không thu tiền hoặc chuyển tiền." },
    "bookings/status": { title: "Đã cập nhật yêu cầu", message: "Trạng thái và phản hồi đã được lưu. Khách hàng có thể xem trong lịch sử." },
    "password": { title: "Đổi mật khẩu thành công", message: "Mật khẩu mới đã được lưu và các phiên cũ đã được thu hồi." },
    "users/status": { title: "Đã cập nhật tài khoản", message: "Trạng thái tài khoản đã được lưu." },
    "tours/save": { title: "Đã lưu tour", message: "Thông tin tour đã được lưu. Tour bật hiển thị sẽ xuất hiện khi tải lại ứng dụng." },
    "esims/save": { title: "Đã lưu gói eSIM", message: "Thông tin gói đã được lưu. Gói bật hiển thị sẽ xuất hiện khi tải lại ứng dụng." },
    "articles/save": { title: "Đã lưu bài viết", message: "Nội dung đã được lưu. Bài bật hiển thị sẽ xuất hiện khi tải lại ứng dụng." },
    "banners/save": { title: "Đã lưu banner", message: "Banner đã được lưu. Tải lại ứng dụng để xem thay đổi." },
  };
  return notified(work, () => notices[path] ?? { title: "Thao tác thành công", message: "Thông tin đã được lưu." });
}
export function uploadAdminImage(file: File): Promise<string> {
  return notified(async () => {
    if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh phải nhỏ hơn hoặc bằng 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Chọn ảnh JPG, PNG, WebP hoặc GIF.");
    let response: Response;
    try { response = await fetch(`${adminApiBase}/api/admin/uploads`, { method: "POST", credentials: "include", headers: { "Content-Type": file.type }, body: file }); }
    catch { throw new Error("Không kết nối được máy chủ để tải ảnh. Vui lòng thử lại."); }
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message ?? "Không tải được ảnh.");
    return data.image;
  }, () => ({ title: "Tải ảnh thành công", message: "Ảnh đã tải lên. Bấm Lưu trong form để áp dụng vào nội dung." }), "Chưa tải được ảnh");
}
