import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { closeNotice, currentNotice, showNotice, subscribeNotices } from "@/utils/notifications";

export default function OperationPopup() {
  const notice = useSyncExternalStore(subscribeNotices, currentNotice, currentNotice);
  useEffect(() => {
    let handling = false;
    function invalid(event: Event) {
      event.preventDefault();
      if (handling) return;
      handling = true;
      queueMicrotask(() => { handling = false; });
      (event.target as HTMLElement)?.focus();
      showNotice("error", "Vui lòng kiểm tra thông tin", "Điền các ô bắt buộc và kiểm tra định dạng email, mật khẩu, ngày hoặc số tiền trước khi tiếp tục.");
    }
    document.addEventListener("invalid", invalid, true);
    return () => document.removeEventListener("invalid", invalid, true);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => closeNotice(notice.id), 4000);
    return () => window.clearTimeout(timer);
  }, [notice?.id]);
  if (!notice) return null;
  return createPortal(<div className="operation-popup-position">
    <div role={notice.kind === "error" ? "alert" : "status"} aria-atomic="true" className="operation-popup-panel" key={notice.id}>
      <div aria-hidden="true" className={`operation-popup-icon ${notice.kind === "success" ? "is-success" : "is-error"}`}>{notice.kind === "success" ? "✓" : "!"}</div>
      <div className="min-w-0"><h2 className="text-sm font-semibold text-gray-900">{notice.title}</h2><p className="text-xs text-gray-600 whitespace-pre-wrap break-words leading-5 mt-1">{notice.message}</p></div>
      <button type="button" className="operation-popup-close" aria-label="Đóng thông báo" onClick={() => closeNotice(notice.id)}>×</button>
    </div>
  </div>, document.body);
}
