import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type Props = { enabled: boolean; title: string; busy: boolean; error: string; notice: string; onClose: () => void; children: ReactNode };

export default function EditorDialog({ enabled, title, busy, error, notice, onClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!enabled) return;
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [enabled]);

  if (!enabled) return <>{children}</>;
  return createPortal(<dialog ref={dialog} aria-labelledby={titleId} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-4xl max-h-[90dvh] overflow-y-auto rounded-2xl border-0 bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-black/50">
    <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4">
      <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
      <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 disabled:opacity-50" aria-label="Đóng cửa sổ chỉnh sửa">Đóng</button>
    </header>
    {error && <p role="alert" className="mx-5 mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {notice && <p role="status" className="mx-5 mt-4 rounded-xl bg-green-50 p-4 text-green-700">{notice}</p>}
    {children}
  </dialog>, document.body);
}
