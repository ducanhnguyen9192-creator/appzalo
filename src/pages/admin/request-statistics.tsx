import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "@/utils/admin-api";
import { BOOKING_STATUS } from "@/utils/bookings";
import { SERVICE_STATUS } from "@/utils/service-requests";

const services = { flight: "Vé máy bay", tour: "Tour", esim: "eSIM" };
type Service = keyof typeof services;
const colors: Record<Service, string> = { flight: "#2563eb", tour: "#059669", esim: "#9333ea" };
const statuses = { ...BOOKING_STATUS, ...SERVICE_STATUS };
type Statistics = {
  from: string; to: string; service: string; total: number;
  summary: { service: Service; total: number; statuses: Record<string, number> }[];
  daily: ({ date: string } & Record<Service, number>)[];
};
const dayString = (time: number) => new Date(time + 7 * 3600000).toISOString().slice(0, 10);
const initialDates = () => ({ from: dayString(Date.now() - 29 * 86400000), to: dayString(Date.now()), service: "" });
const input = "block w-full border border-gray-200 rounded-xl px-3 py-2.5 mt-1 bg-white";
const number = (value: number) => value.toLocaleString("vi-VN");
const displayDate = (value: string) => value.split("-").reverse().join("/");

export default function RequestStatistics() {
  const [draft, setDraft] = useState(initialDates);
  const [filters, setFilters] = useState(draft);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setData(null);
    adminApi<Statistics>(`request-statistics?${new URLSearchParams(filters)}`)
      .then(result => { if (active) setData(result); })
      .catch(e => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, revision]);
  function apply(event: FormEvent) {
    event.preventDefault();
    if (draft.from > draft.to) { setError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."); return; }
    if ((Date.parse(draft.to) - Date.parse(draft.from)) / 86400000 >= 366) { setError("Vui lòng chọn khoảng thời gian tối đa 366 ngày."); return; }
    setFilters({ ...draft }); setRevision(value => value + 1);
  }
  const visible = data?.summary.filter(item => !data.service || item.service === data.service) ?? [];
  const max = Math.max(2, Math.ceil(Math.max(0, ...(data?.daily.map(day => day.flight + day.tour + day.esim) ?? [])) / 2) * 2);
  return <section className="space-y-4">
    <p className="text-sm text-gray-500">Thống kê theo ngày gửi yêu cầu (giờ Việt Nam) và trạng thái xử lý hiện tại. Mỗi yêu cầu được tính một lần, không phụ thuộc số khách hoặc số lượng dịch vụ.</p>
    <form onSubmit={apply} className="bg-white border border-gray-100 rounded-2xl p-4">
      <fieldset disabled={loading} className="flex flex-wrap items-end gap-3">
        <label className="text-sm flex-1 min-w-40">Từ ngày<input type="date" required className={input} value={draft.from} onChange={e => setDraft({ ...draft, from: e.target.value })} /></label>
        <label className="text-sm flex-1 min-w-40">Đến ngày<input type="date" required className={input} value={draft.to} onChange={e => setDraft({ ...draft, to: e.target.value })} /></label>
        <label className="text-sm flex-1 min-w-40">Dịch vụ<select aria-label="Dịch vụ" className={input} value={draft.service} onChange={e => setDraft({ ...draft, service: e.target.value })}><option value="">Tất cả dịch vụ</option>{Object.entries(services).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <button className="rounded-xl bg-gold-600 text-white px-4 py-2.5 disabled:opacity-50">Áp dụng</button>
        <button type="button" className="rounded-xl border px-4 py-2.5" onClick={() => { const next = initialDates(); setDraft(next); setFilters(next); setRevision(value => value + 1); }}>30 ngày gần đây</button>
        <button type="button" className="rounded-xl border px-4 py-2.5" onClick={() => setRevision(value => value + 1)}>Làm mới</button>
      </fieldset>
    </form>
    {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-4">{error}</p>}
    {loading && <p role="status">Đang tải thống kê…</p>}
    {!loading && data && <>
      <p className="text-sm text-gray-500" role="status">{displayDate(data.from)} – {displayDate(data.to)} · {data.service ? services[data.service as Service] : "Tất cả dịch vụ"}</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Tổng yêu cầu", value: data.total }, ...data.summary.map(item => ({ label: services[item.service], value: data.service && data.service !== item.service ? null : item.total }))].map(item => <div key={item.label} className="bg-white border border-gray-100 rounded-2xl p-5"><p className="text-sm text-gray-500">{item.label}</p><p className="text-3xl font-bold mt-3">{item.value === null ? "—" : number(item.value)}</p>{item.value === null && <p className="text-xs text-gray-500 mt-1">Ngoài bộ lọc</p>}</div>)}
      </div>
      {data.total === 0 && <p className="bg-gold-50 text-gold-800 rounded-xl p-4">Không có yêu cầu trong khoảng thời gian và dịch vụ đã chọn.</p>}
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="font-semibold">Yêu cầu theo ngày</h3>
        <div className="flex flex-wrap gap-4 my-3 text-sm">{visible.map(item => <span key={item.service} className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded" style={{ background: colors[item.service] }} />{services[item.service]}</span>)}</div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Biểu đồ số yêu cầu theo ngày, có thể cuộn ngang">
          <svg width={Math.max(600, data.daily.length * 42 + 50)} height={250} role="img" aria-label="Biểu đồ cột chồng số yêu cầu theo ngày">
            {[0, 0.5, 1].map(ratio => <g key={ratio}><line x1={35} x2="100%" y1={200 - ratio * 170} y2={200 - ratio * 170} stroke="#e5e7eb" /><text x={30} y={204 - ratio * 170} textAnchor="end" fontSize={11} fill="#6b7280">{number(max * ratio)}</text></g>)}
            {data.daily.map((day, index) => {
              let bottom = 200;
              const total = day.flight + day.tour + day.esim;
              return <g key={day.date}><title>{displayDate(day.date)}: {visible.map(item => `${services[item.service]} ${day[item.service]}`).join(", ")}</title>
                {visible.map(item => { const height = day[item.service] / max * 170; bottom -= height; return <rect key={item.service} x={45 + index * 42} y={bottom} width={26} height={height} fill={colors[item.service]} />; })}
                {total > 0 && <text x={58 + index * 42} y={bottom - 5} textAnchor="middle" fontSize={11}>{total}</text>}
                <text x={58 + index * 42} y={220} textAnchor="middle" fontSize={10} fill="#6b7280">{displayDate(day.date).slice(0, 5)}</text>
              </g>;
            })}
          </svg>
        </div>
        <details className="mt-3 text-sm"><summary className="cursor-pointer text-gold-600">Xem số liệu từng ngày</summary><div className="overflow-x-auto mt-3"><table className="w-full text-left"><thead><tr><th className="p-2">Ngày</th>{visible.map(item => <th className="p-2" key={item.service}>{services[item.service]}</th>)}</tr></thead><tbody>{data.daily.map(day => <tr key={day.date} className="border-t"><th className="p-2 font-normal">{displayDate(day.date)}</th>{visible.map(item => <td className="p-2" key={item.service}>{number(day[item.service])}</td>)}</tr>)}</tbody></table></div></details>
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <h3 className="font-semibold p-5">Tổng hợp theo trạng thái</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-100"><tr><th className="p-3">Dịch vụ</th>{Object.entries(statuses).map(([key, name]) => <th key={key} className="p-3 whitespace-nowrap">{name}</th>)}<th className="p-3">Tổng</th></tr></thead>
          <tbody>{visible.map(item => <tr key={item.service} className="border-t border-gray-100"><th className="p-3 whitespace-nowrap">{services[item.service]}</th>{Object.keys(statuses).map(status => <td key={status} className="p-3">{(status === "ticketed" && item.service !== "flight") || (status === "completed" && item.service === "flight") ? "—" : number(item.statuses[status] ?? 0)}</td>)}<td className="p-3 font-semibold">{number(item.total)}</td></tr>)}</tbody>
        </table></div>
      </div>
    </>}
  </section>;
}
