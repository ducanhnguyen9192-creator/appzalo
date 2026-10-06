import { useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [result, setResult] = useState<"" | "copied" | "manual">("");
  async function copy() {
    try { await navigator.clipboard.writeText(text); setResult("copied"); }
    catch { setResult("manual"); }
  }
  return <div className="space-y-2">
    <button type="button" onClick={copy} className="rounded-xl border border-blue-200 px-4 py-3 text-sm text-blue-600 font-medium">{label}</button>
    {result === "copied" && <p role="status" className="text-xs text-green-700">Đã sao chép.</p>}
    {result === "manual" && <label className="block text-xs text-gray-600">Chạm vào nội dung và chọn Sao chép trên thiết bị.<textarea aria-label="Nội dung cần sao chép" value={text} readOnly onFocus={(event) => event.currentTarget.select()} rows={2} className="block w-full border rounded-lg p-2 mt-2 text-sm break-all" /></label>}
  </div>;
}
