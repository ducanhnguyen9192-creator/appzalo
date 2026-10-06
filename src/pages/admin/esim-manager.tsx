import { FormEvent, useEffect, useState } from "react";
import { adminApi, uploadAdminImage } from "@/utils/admin-api";
import { Esim, esimTextFields, initialEsim } from "@/utils/esims";
import { tourPrice } from "@/utils/tours";
import ImagePicker from "./image-picker";

const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 mt-1";
const primary = "rounded-xl bg-blue-600 text-white px-4 py-2.5 font-medium disabled:opacity-50";
const secondary = "rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium disabled:opacity-50";

export default function EsimManager() {
  const [items, setItems] = useState<Esim[]>([]);
  const [item, setItem] = useState<Esim | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function refresh() { const data = await adminApi<{ esims: Esim[] }>("esims"); setItems(data.esims); }
  useEffect(() => { refresh().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Không thể kết nối máy chủ."); } finally { setBusy(false); }
  }
  async function upload(file: File) {
    await act(async () => {
      const image = await uploadAdminImage(file);
      setItem((current) => current ? { ...current, image } : null);
      setNotice("Đã tải ảnh lên. Bấm Lưu gói eSIM để áp dụng.");
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!item) return;
    await act(async () => { await adminApi("esims/save", item); setItem(null); await refresh(); setNotice("Đã lưu gói eSIM. Tải lại ứng dụng để xem thay đổi."); });
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2"><button className={primary} disabled={busy} onClick={() => { setItem(initialEsim()); setNotice(""); }}>+ Thêm gói eSIM</button><button className={secondary} disabled={busy} onClick={() => act(refresh)}>Làm mới danh sách eSIM</button></div>
    <p className="text-sm text-gray-500">Nhập thông tin gói dữ liệu và bật hiển thị để đưa gói lên trang chủ và danh sách eSIM.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 text-green-700 p-4">{notice}</p>}
    {item && <form onSubmit={save} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold">{item.id ? "Chỉnh sửa gói eSIM" : "Thêm gói eSIM mới"}</h3>
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">{esimTextFields.map(([field, label, max, required]) => <label key={field} className="block text-sm">{label}<input required={required} minLength={field === "name" ? 3 : undefined} maxLength={max} className={input} value={item[field]} onChange={(e) => setItem({ ...item, [field]: e.target.value })} /></label>)}
          <label className="block text-sm">Giá gói (VNĐ)<input type="number" min={0} max={1000000000} step={1} placeholder="Để trống nếu giá liên hệ" className={input} value={item.price ?? ""} onChange={(e) => setItem({ ...item, price: e.target.value === "" ? null : Number(e.target.value) })} /></label>
        </div>
        <ImagePicker label="Ảnh gói eSIM" image={item.image} disabled={busy} onChange={(image) => setItem({ ...item, image })} onUpload={upload} />
        {([ ["summary", "Giới thiệu ngắn", 1000], ["instructions", "Hướng dẫn sử dụng", 20000], ["notes", "Lưu ý / thiết bị tương thích", 5000] ] as const).map(([field, label, max]) => <label key={field} className="block text-sm">{label}<textarea rows={field === "instructions" ? 6 : 3} maxLength={max} className={input} value={item[field]} onChange={(e) => setItem({ ...item, [field]: e.target.value })} /></label>)}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.published} onChange={(e) => setItem({ ...item, published: e.target.checked })} />Hiển thị gói eSIM trong ứng dụng</label>
        <div className="flex gap-2"><button className={primary}>Lưu gói eSIM</button><button type="button" className={secondary} onClick={() => setItem(null)}>Hủy</button></div>
      </fieldset>
    </form>}
    {loading ? <p role="status">Đang tải eSIM…</p> : items.length === 0 ? <p className="bg-white border rounded-xl p-6 text-gray-500">Chưa có gói eSIM. Bấm “Thêm gói eSIM” để tạo gói đầu tiên.</p> : items.map((entry) => <div key={entry.id} className="bg-white border border-gray-100 rounded-xl p-4 flex justify-between gap-4 items-center"><div className="min-w-0 break-words"><p className="font-medium">{entry.name}</p><p className="text-sm text-gray-500">{entry.coverage} · {entry.allowance} · {entry.validity} · {tourPrice(entry.price)}</p><p className={`text-sm mt-1 ${entry.published ? "text-green-700" : "text-gray-500"}`}>{entry.published ? "Đang hiển thị" : "Bản nháp / đã ẩn"}</p></div><button disabled={busy} className={secondary} onClick={() => { setItem({ ...entry }); setNotice(""); }}>Sửa</button></div>)}
  </div>;
}
