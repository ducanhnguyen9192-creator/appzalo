import { useEffect } from "react";
import { translate } from "@/i18n/store";

const dirtyForms = new Set<symbol>();
export function confirmDiscardChanges() {
  return dirtyForms.size === 0 || window.confirm(translate("Bạn có thay đổi chưa lưu. Rời phần đang nhập và bỏ các thay đổi này?"));
}
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const id = Symbol();
    dirtyForms.add(id);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => { dirtyForms.delete(id); window.removeEventListener("beforeunload", warn); };
  }, [dirty]);
}
