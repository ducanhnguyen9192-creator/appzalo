import EditorDialog from "./editor-dialog";
import "./booking-detail.css";
import RequestFilters from "./request-filters";
import { confirmDiscardChanges, useUnsavedChanges } from "./unsaved-changes";
import { FormEvent, useEffect, useState } from "react";
import { adminApi } from "@/utils/admin-api";
import { ServiceRequest, ServiceStatus, SERVICE_STATUS } from "@/utils/service-requests";
import ServiceRequestInfo from "@/components/service-request-info";
import { formatDateTime } from "@/utils/bookings";

type AdminRequest = ServiceRequest & { customerEmail: string };
export default function ServiceManager() {
  const [filters, setFilters] = useState("");
  const [page, setPage] = useState(1), [revision, setRevision] = useState(0), [items, setItems] = useState<AdminRequest[]>([]), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [selected, setSelected] = useState<AdminRequest | null>(null), [status, setStatus] = useState<ServiceStatus>("received"), [response, setResponse] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = Boolean(selected && (status !== selected.status || response !== selected.response));
  useEffect(() => { let active = true; setLoading(true); setError(""); adminApi<{ requests: AdminRequest[]; total: number }>(`service-requests?page=${page}&${filters}`).then(data => { if (active) { setItems(data.requests); setTotal(data.total); if (page > 1 && !data.requests.length) setPage(Math.max(1, Math.ceil(data.total / 20))); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [page, revision, filters]);
  useUnsavedChanges(dirty);
  function applyFilters(value: string) { if (!confirmDiscardChanges()) return false; setSelected(null); setPage(1); setFilters(value); setRevision(value => value + 1); return true; }
  async function save(event: FormEvent) { event.preventDefault(); if (!selected || busy) return; setBusy(true); setError(""); setNotice(""); try { await adminApi("service-requests/status", { id: selected.id, status, response }); setSelected({ ...selected, status, response, updatedAt: Date.now() }); setNotice("Đã cập nhật trạng thái và phản hồi. Khách hàng có thể xem trong lịch sử."); setRevision(value => value + 1); } catch (e) { setError(e instanceof Error ? e.message : "Không cập nhật được yêu cầu."); } finally { setBusy(false); } }
  return <section className="space-y-4"><p className="text-sm text-gray-500">Tiếp nhận tư vấn tour/eSIM và phản hồi cho khách trong lịch sử. Trạng thái hoàn tất do nhân viên xác nhận; chưa tự đặt dịch vụ hay cấp mã eSIM.</p><button className="bg-white border rounded-xl px-4 py-3" disabled={loading || busy} onClick={() => { if (confirmDiscardChanges()) { setSelected(null); setRevision(value => value + 1); } }}>Làm mới yêu cầu tour/eSIM</button>{!selected && error && <p role="alert" className="text-red-600">{error}</p>}
    <RequestFilters statuses={SERVICE_STATUS} disabled={busy || loading} onApply={applyFilters} />
    {!loading && <p className="text-sm text-gray-500" role="status">{total} yêu cầu phù hợp</p>}
    {selected && <EditorDialog enabled title="Chi tiết yêu cầu tour/eSIM" busy={busy} error={error} notice={notice} onClose={() => { if (confirmDiscardChanges()) setSelected(null); }}>
      <section className="booking-detail">
        <div className="booking-summary">
          <div className="booking-summary-top"><span className="booking-eyebrow">{selected.request.service === "tour" ? "TOUR / COMBO DU LỊCH" : "eSIM"}</span><span className={"booking-status booking-status-" + selected.status}>{SERVICE_STATUS[selected.status]}</span></div>
          <h3>{selected.item.name}</h3><p className="booking-reference">Mã yêu cầu: {selected.id}</p>
          <div className="booking-summary-grid"><div><span>Khách hàng</span><strong>{selected.request.fullName}</strong><a href={"tel:" + selected.request.phone}>{selected.request.phone}</a><a href={"mailto:" + selected.customerEmail}>{selected.customerEmail}</a></div><div><span>{selected.request.service === "tour" ? "Số người" : "Số gói"}</span><strong>{selected.request.quantity}</strong><small>Ngày mong muốn: {selected.request.desiredDate ? selected.request.desiredDate.split("-").reverse().join("/") : "Nhờ tư vấn"}</small></div></div>
        </div>
        <div className="booking-attention"><strong>{selected.status === "received" ? "Yêu cầu mới cần xử lý" : SERVICE_STATUS[selected.status]}</strong><p>{selected.response ? "Đã có phản hồi cho khách. Kiểm tra thông tin trước khi cập nhật tiếp." : "Chưa có phản hồi cho khách hàng. Nhập nội dung ở phần Xử lý yêu cầu bên dưới."}</p></div>
        <section className="booking-panel booking-information"><h3><span>01</span> Thông tin dịch vụ</h3><ServiceRequestInfo item={selected} /></section>
        <form onSubmit={save} className="booking-panel booking-action"><h3><span>02</span> Xử lý yêu cầu</h3><p className="booking-panel-note">Cập nhật trạng thái và nội dung khách hàng sẽ thấy trong lịch sử.</p><fieldset disabled={busy} className="space-y-3">
          <label className="block text-sm">Trạng thái yêu cầu<select className="block w-full border rounded-xl p-3 mt-1 bg-white" value={status} onChange={e => setStatus(e.target.value as ServiceStatus)}>{Object.entries(SERVICE_STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="block text-sm">Phản hồi cho khách hàng<textarea rows={5} maxLength={5000} className="block w-full border rounded-xl p-3 mt-1" value={response} onChange={e => setResponse(e.target.value)} /></label>
          <div className="booking-save"><span>{dirty ? "Có thay đổi chưa lưu" : "Chỉnh sửa rồi bấm lưu để cập nhật"}</span><button disabled={busy || !dirty} className="rounded-xl bg-gold-600 text-white px-4 py-3 disabled:opacity-50">{busy ? "Đang lưu…" : "Lưu trạng thái & phản hồi"}</button></div>
        </fieldset></form>
      </section>
    </EditorDialog>}
    {loading ? <p role="status">Đang tải yêu cầu…</p> : items.length ? items.map(item => <article key={item.id} className="bg-white border rounded-xl p-4 flex flex-wrap justify-between gap-3 items-center"><div className="min-w-0 break-words"><p className="text-xs text-gray-500">{item.request.service === "tour" ? "Tour / combo" : "eSIM"} · {item.id}</p><h3 className="font-semibold">{item.item.name}</h3><p className="text-sm text-gray-500">{item.request.fullName} · {item.request.phone}</p><p className="text-sm text-gold-600">{SERVICE_STATUS[item.status]} · {formatDateTime(item.createdAt)}</p></div><button className="border rounded-xl px-4 py-3" disabled={busy} onClick={() => { if (!confirmDiscardChanges()) return; setSelected(item); setStatus(item.status); setResponse(item.response); setError(""); setNotice(""); }}>Xem / xử lý</button></article>) : <p className="bg-white border rounded-xl p-5">Không có yêu cầu phù hợp. Thử đổi hoặc xóa bộ lọc.</p>}
    {total > 20 && <div className="flex flex-wrap gap-3 items-center"><span>Trang {page} · {total} yêu cầu</span><button className="border rounded-lg p-2" disabled={loading || busy || page === 1} onClick={() => { if (!confirmDiscardChanges()) return; setSelected(null); setPage(page - 1); }}>Trước</button><button className="border rounded-lg p-2" disabled={loading || busy || page * 20 >= total} onClick={() => { if (!confirmDiscardChanges()) return; setSelected(null); setPage(page + 1); }}>Sau</button></div>}
  </section>;
}
