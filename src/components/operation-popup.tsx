import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { closeNotice, currentNotice, showNotice, subscribeNotices } from "@/utils/notifications";

export default function OperationPopup() {
  const notice = useSyncExternalStore(subscribeNotices, currentNotice, currentNotice);
  const panel = useRef<HTMLDivElement>(null);
  const confirm = useRef<HTMLButtonElement>(null);
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
    const previousFocus = document.activeElement as HTMLElement | null;
    const app = document.getElementById("app");
    const oldHidden = app?.getAttribute("aria-hidden");
    const oldInert = app?.inert ?? false;
    if (app) { app.inert = true; app.setAttribute("aria-hidden", "true"); }
    confirm.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeNotice(notice!.id); }
      if (event.key === "Tab") {
        const buttons = panel.current?.querySelectorAll<HTMLButtonElement>("button");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    function focusin(event: FocusEvent) { if (!panel.current?.contains(event.target as Node)) confirm.current?.focus(); }
    document.addEventListener("keydown", keydown);
    document.addEventListener("focusin", focusin);
    return () => {
      document.removeEventListener("keydown", keydown); document.removeEventListener("focusin", focusin);
      if (app) { app.inert = oldInert; if (oldHidden === null) app.removeAttribute("aria-hidden"); else if (oldHidden !== undefined) app.setAttribute("aria-hidden", oldHidden); }
      if (previousFocus?.isConnected && !(previousFocus as HTMLButtonElement).disabled) previousFocus.focus({ preventScroll: true });
    };
  }, [notice?.id]);
  if (!notice) return null;
  return createPortal(<div className="operation-popup-backdrop">
    <div ref={panel} role="alertdialog" aria-modal="true" aria-labelledby="operation-popup-title" aria-describedby="operation-popup-message" className="operation-popup-panel">
      <button type="button" className="operation-popup-close" aria-label="Đóng thông báo" onClick={() => closeNotice(notice.id)}>×</button>
      <div aria-hidden="true" className={`operation-popup-icon ${notice.kind === "success" ? "is-success" : "is-error"}`}>{notice.kind === "success" ? "✓" : "!"}</div>
      <h2 id="operation-popup-title" className="text-xl font-semibold text-gray-900">{notice.title}</h2>
      <p id="operation-popup-message" className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-6 mt-3">{notice.message}</p>
      <button ref={confirm} type="button" className="mt-6 w-full rounded-xl bg-blue-600 text-white font-semibold py-3" onClick={() => closeNotice(notice.id)}>Đã hiểu</button>
    </div>
  </div>, document.body);
}
