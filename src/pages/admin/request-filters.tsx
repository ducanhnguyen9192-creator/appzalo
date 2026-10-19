import { useState } from "react";

export default function RequestFilters({ statuses, disabled, onApply }: { statuses: Record<string, string>; disabled: boolean; onApply: (query: string) => boolean }) {
  const empty = { q: "", status: "", from: "", to: "" };
  const [filters, setFilters] = useState(empty);
  const input = "block w-full border rounded-xl bg-white px-3 py-2.5 mt-1";
  return <form onSubmit={event => { event.preventDefault(); onApply(new URLSearchParams(filters).toString()); }} className="bg-white border rounded-xl p-4">
    <fieldset disabled={disabled} className="flex flex-wrap items-end gap-3">
      <label className="text-sm flex-1 min-w-48">Tìm yêu cầu<input className={input} maxLength={100} placeholder="Mã, tên, điện thoại hoặc email" value={filters.q} onChange={e => setFilters({ ...filters, q: e.target.value })} /></label>
      <label className="text-sm">Trạng thái<select className={input} value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}><option value="">Tất cả trạng thái</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="text-sm">Tạo từ ngày<input type="date" className={input} max={filters.to || undefined} value={filters.from} onChange={e => setFilters({ ...filters, from: e.target.value })} /></label>
      <label className="text-sm">Đến hết ngày<input type="date" className={input} min={filters.from || undefined} value={filters.to} onChange={e => setFilters({ ...filters, to: e.target.value })} /></label>
      <button className="rounded-xl bg-blue-600 text-white px-4 py-2.5 disabled:opacity-50">Áp dụng</button>
      <button type="button" className="border rounded-xl px-4 py-2.5 disabled:opacity-50" onClick={() => { if (onApply("")) setFilters(empty); }}>Xóa bộ lọc</button>
    </fieldset>
    <p className="text-xs text-gray-500 mt-3">Lọc ngày tạo theo giờ Việt Nam. Bấm Áp dụng để cập nhật danh sách.</p>
  </form>;
}
