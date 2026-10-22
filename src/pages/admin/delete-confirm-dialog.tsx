import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

type Props = { name: string; label: string; onCancel: () => void; onConfirm: () => void };

export default function DeleteConfirmDialog({ name, label, onCancel, onConfirm }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return createPortal(<dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border-0 bg-white p-6 text-gray-900 shadow-2xl backdrop:bg-black/40">
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></svg>
    </div>
    <h2 id={titleId} className="text-lg font-semibold">Bạn có chắc chắn muốn xoá?</h2>
    <p id={descriptionId} className="mt-2 text-sm leading-6 text-gray-600 break-words">{label} <strong className="font-medium text-gray-900">“{name}”</strong> sẽ bị xoá. Thao tác này không thể hoàn tác.</p>
    <div className="mt-6 flex justify-end gap-3">
      <button type="button" autoFocus onClick={onCancel} className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 font-medium hover:bg-gray-50 focus-visible:outline-gold-600">Huỷ</button>
      <button type="button" onClick={onConfirm} className="rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white hover:bg-red-700 focus-visible:outline-red-600">Xoá</button>
    </div>
  </dialog>, document.body);
}
