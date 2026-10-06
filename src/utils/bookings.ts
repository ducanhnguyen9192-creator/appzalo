import { API_BASE } from "./tours";
import { notified } from "./notifications";

export const BOOKING_STATUS = { received: "Đã tiếp nhận", reviewing: "Đang xử lý", quoted: "Đã báo giá", ticketed: "Đã xuất vé", cancelled: "Đã hủy" } as const;
export type BookingStatus = keyof typeof BOOKING_STATUS;
export type Booking = { id: string; tripType: "oneway" | "roundtrip"; origin: string; destination: string; departureDate: string; returnDate: string; adults: number; children: number; infants: number; cabin: string; fullName: string; phone: string; note: string; status: BookingStatus; response: string; createdAt: number; updatedAt: number };
export type Transaction = { id: string; bookingId: string; amount: number; reference: string; note: string; paidAt: string; origin: string; destination: string };
export class BookingApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function requestBooking<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(`${API_BASE}/api/${path}`, { credentials: "include", method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined }); }
  catch { throw new Error("Không kết nối được máy chủ. Nội dung yêu cầu được giữ lại, hãy thử lại."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new BookingApiError(data?.message ?? "Không tải được dữ liệu. Vui lòng thử lại.", response.status);
  return data;
}
export function bookingApi<T>(path: string, body?: unknown): Promise<T> {
  const work = () => requestBooking<T>(path, body);
  if (!body) return work();
  return notified(work, (data) => {
    const id = (data as { booking?: Booking; request?: { id: string } })?.booking?.id ?? (data as { request?: { id: string } })?.request?.id;
    return { title: "Đã tiếp nhận yêu cầu", message: `${id ? `Mã yêu cầu: ${id}\n` : ""}Bạn có thể theo dõi trong mục Lịch sử. FirstClass sẽ kiểm tra thông tin và liên hệ tư vấn. Đây chưa phải xác nhận mua dịch vụ hay thanh toán.` };
  }, "Chưa gửi được yêu cầu");
}
export const formatMoney = (amount: number) => `${new Intl.NumberFormat("vi-VN").format(amount)} đ`;
export const formatDateTime = (value: number | string) => new Date(value).toLocaleString("vi-VN");
export const formatFlightDate = (value: string) => value.split("-").reverse().join("/");
