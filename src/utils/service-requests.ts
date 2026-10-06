import { bookingApi } from "./bookings";

export const SERVICE_STATUS = { received: "Đã tiếp nhận", reviewing: "Đang xử lý", quoted: "Đã báo giá", completed: "Đã hoàn tất", cancelled: "Đã hủy" } as const;
export type ServiceStatus = keyof typeof SERVICE_STATUS;
export type ServiceRequest = { id: string; request: { service: "tour" | "esim"; itemId: number; quantity: number; fullName: string; phone: string; desiredDate: string; note: string }; item: { name: string; price: number | null; destination?: string; duration?: string; coverage?: string; allowance?: string; validity?: string }; status: ServiceStatus; response: string; createdAt: number; updatedAt: number };
export const serviceApi = <T,>(path = "", body?: unknown) => bookingApi<T>(`service-requests${path}`, body);
