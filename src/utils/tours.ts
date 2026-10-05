import { useEffect, useState } from "react";

export type TourKind = "domestic" | "international" | "combo";
export type Tour = { id?: number; name: string; kind: TourKind; destination: string; duration: string; departure: string; price: number | null; image: string; summary: string; itinerary: string; included: string; excluded: string; published: boolean };
export const TOUR_KINDS: Record<TourKind, string> = { domestic: "Tour trong nước", international: "Tour quốc tế", combo: "Combo du lịch" };
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export function categoryPath(id: number) {
  if (id === 1) return "/flights";
  if (id === 7) return "/esims";
  const kind = ({ 2: "domestic", 3: "international", 4: "combo" } as Record<number, string>)[id];
  return kind ? `/tours?type=${kind}` : `/category/${id}`;
}
export function tourPrice(price: number | null) {
  return price === null ? "Giá liên hệ" : `${new Intl.NumberFormat("vi-VN").format(price)} đ`;
}
export function useTourData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    fetch(`${API_BASE}/api/content/${path}`, { signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Không tải được thông tin.");
      return result as T;
    }).then(setData).catch((e) => { if (!controller.signal.aborted) setError(e.message ?? "Không kết nối được máy chủ."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, retry]);
  return { data, loading, error, retry: () => setRetry((value) => value + 1) };
}
export const useContentData = useTourData;
