export type Notice = { id: number; kind: "success" | "error"; title: string; message: string };
let nextId = 0;
let queue: Notice[] = [];
const listeners = new Set<() => void>();
function emit() { listeners.forEach((listener) => listener()); }
export const subscribeNotices = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const currentNotice = () => queue[0] ?? null;
export function showNotice(kind: Notice["kind"], title: string, message: string) {
  queue = [...queue, { id: ++nextId, kind, title, message }]; emit();
}
export function closeNotice(id: number) { queue = queue.filter((notice) => notice.id !== id); emit(); }
export async function notified<T>(work: () => Promise<T>, success: (data: T) => { title: string; message: string }, errorTitle = "Thao tác chưa thành công"): Promise<T> {
  try { const data = await work(); const notice = success(data); showNotice("success", notice.title, notice.message); return data; }
  catch (error) { showNotice("error", errorTitle, error instanceof Error ? error.message : "Không kết nối được máy chủ. Vui lòng thử lại."); throw error; }
}
