import { useEffect, useState } from "react";
import { registerTranslations, useLanguage } from "@/i18n/store";

export type TourKind = "domestic" | "international" | "combo";
export type Tour = { id?: number; name: string; kind: TourKind; destination: string; duration: string; departure: string; price: number | null; image: string; summary: string; itinerary: string; included: string; excluded: string; published: boolean };
export const TOUR_KINDS: Record<TourKind, string> = { domestic: "Tour trong nước", international: "Tour quốc tế", combo: "Combo du lịch" };
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
export function tourPath(kind: TourKind) { return `/tours/${kind}`; }

export function categoryPath(id: number) {
  if (id === 1) return "/flights";
  if (id === 7) return "/esims";
  const kind = ({ 2: "domestic", 3: "international", 4: "combo" } as Record<number, TourKind>)[id];
  return kind ? tourPath(kind) : `/category/${id}`;
}
export function tourPrice(price: number | null) {
  return price === null ? "Giá liên hệ" : `${new Intl.NumberFormat("vi-VN").format(price)} đ`;
}
export function useTourData<T>(path: string) {
  const { language } = useLanguage();
  const contentLanguage = language;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(""); setData(null);
    fetch(`${API_BASE}/api/content/${path}${path.includes("?") ? "&" : "?"}lang=${encodeURIComponent(contentLanguage)}`, { signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Không tải được thông tin.");
      if (controller.signal.aborted) return result as T;
      const entries: Record<string, string> = {};
      for (const item of Array.isArray(result) ? result : [result]) {
        if (contentLanguage === "vi" || item?._translationLanguage !== contentLanguage || !item._localized) continue;
        for (const [field, text] of Object.entries(item._localized)) {
          if (typeof item[field] === "string" && typeof text === "string") entries[item[field]] = text;
        }
      }
      registerTranslations(language, entries);
      return result as T;
    }).then(result => { if (!controller.signal.aborted) setData(result); }).catch((e) => { if (!controller.signal.aborted) setError(e.message ?? "Không kết nối được máy chủ."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path, retry, contentLanguage]);
  return { data, loading, error, retry: () => setRetry((value) => value + 1) };
}
export const useContentData = useTourData;
