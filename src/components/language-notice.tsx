import { useEffect } from "react";
import { loadTranslations, useLanguage } from "@/i18n/store";

export default function LanguageNotice() {
  const { language, loading, incomplete, retry } = useLanguage();
  useEffect(() => { void loadTranslations(); }, []);
  if (language === "vi" || (!loading && !incomplete)) return null;
  return <div className="currency-notice" role="status">
    {loading ? "Đang tải bản dịch…" : "Một số bản dịch chưa sẵn sàng; nội dung gốc tiếng Việt được hiển thị."}
    {!loading && <button type="button" onClick={retry}>Thử tải lại</button>}
  </div>;
}
