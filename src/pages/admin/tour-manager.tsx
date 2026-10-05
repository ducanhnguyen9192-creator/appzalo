import { FormEvent, useEffect, useState } from "react";
import { adminApi, adminApiBase } from "@/utils/admin-api";
import { Tour, TourKind, TOUR_KINDS, tourPrice } from "@/utils/tours";
import ImagePicker from "./image-picker";

const initialTour = (): Tour => ({ name: "", kind: "domestic", destination: "", duration: "", departure: "", price: null, image: "/images/news/news-3.jpg", summary: "", itinerary: "", included: "", excluded: "", published: false });
const input = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 mt-1";
const primary = "rounded-xl bg-blue-600 text-white px-4 py-2.5 font-medium disabled:opacity-50";
const secondary = "rounded-xl border border-gray-200 bg-white px-4 py-2.5 font-medium disabled:opacity-50";

export default function TourManager() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [tour, setTour] = useState<Tour | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function refresh() { const data = await adminApi<{ tours: Tour[] }>("tours"); setTours(data.tours); }
  useEffect(() => { refresh().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function act(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); } catch (e) { setError(e instanceof Error ? e.message : "Không thể kết nối máy chủ."); } finally { setBusy(false); }
  }
  async function upload(file: File) {
    await act(async () => {
      if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh phải nhỏ hơn hoặc bằng 5 MB.");
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) throw new Error("Chọn ảnh JPG, PNG, WebP hoặc GIF.");
      const response = await fetch(`${adminApiBase}/api/admin/uploads`, { method: "POST", credentials: "include", headers: { "Content-Type": file.type }, body: file });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message ?? "Không tải được ảnh.");
      setTour((current) => current ? { ...current, image: data.image } : null);
      setNotice("Đã tải ảnh lên. Bấm Lưu tour để áp dụng.");
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!tour) return;
    await act(async () => { await adminApi("tours/save", tour); setTour(null); await refresh(); setNotice("Đã lưu tour. Tour bật hiển thị sẽ xuất hiện khi tải lại ứng dụng."); });
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2"><button className={primary} disabled={busy} onClick={() => { setTour(initialTour()); setNotice(""); }}>+ Thêm tour</button><button className={secondary} disabled={busy} onClick={() => act(refresh)}>Làm mới danh sách tour</button></div>
    <p className="text-sm text-gray-500">Quản lý tour trong nước, quốc tế và combo. Bật hiển thị để đưa tour lên trang chủ và danh sách tương ứng.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-4">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-green-50 text-green-700 p-4">{notice}</p>}
    {tour && <form onSubmit={save} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold">{tour.id ? "Chỉnh sửa tour" : "Thêm tour mới"}</h3>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block text-sm">Tên tour<input required minLength={3} maxLength={200} className={input} value={tour.name} onChange={(e) => setTour({ ...tour, name: e.target.value })} /></label>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block text-sm">Nhóm tour<select className={input} value={tour.kind} onChange={(e) => setTour({ ...tour, kind: e.target.value as TourKind })}>{Object.entries(TOUR_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="block text-sm">Điểm đến<input required maxLength={200} className={input} value={tour.destination} onChange={(e) => setTour({ ...tour, destination: e.target.value })} /></label>
          <label className="block text-sm">Thời lượng<input required maxLength={100} placeholder="Ví dụ: 3 ngày 2 đêm" className={input} value={tour.duration} onChange={(e) => setTour({ ...tour, duration: e.target.value })} /></label>
          <label className="block text-sm">Lịch khởi hành<input maxLength={300} placeholder="Ngày cụ thể hoặc lịch khởi hành hàng tuần" className={input} value={tour.departure} onChange={(e) => setTour({ ...tour, departure: e.target.value })} /></label>
          <label className="block text-sm">Giá từ (VNĐ)<input type="number" min={0} max={1000000000} step={1} placeholder="Để trống nếu giá liên hệ" className={input} value={tour.price ?? ""} onChange={(e) => setTour({ ...tour, price: e.target.value === "" ? null : Number(e.target.value) })} /></label>
        </div>
        <ImagePicker label="Ảnh tour" image={tour.image} disabled={busy} onChange={(image) => setTour({ ...tour, image })} onUpload={upload} />
        {([ ["summary", "Giới thiệu ngắn", 1000], ["itinerary", "Lịch trình chi tiết", 20000], ["included", "Giá bao gồm", 5000], ["excluded", "Giá không bao gồm / lưu ý", 5000] ] as const).map(([field, label, max]) => <label key={field} className="block text-sm">{label}<textarea rows={field === "itinerary" ? 7 : 3} maxLength={max} className={input} value={tour[field]} onChange={(e) => setTour({ ...tour, [field]: e.target.value })} /></label>)}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tour.published} onChange={(e) => setTour({ ...tour, published: e.target.checked })} />Hiển thị tour trong ứng dụng</label>
        <div className="flex gap-2"><button className={primary}>Lưu tour</button><button type="button" className={secondary} onClick={() => setTour(null)}>Hủy</button></div>
      </fieldset>
    </form>}
    {loading ? <p role="status">Đang tải tour…</p> : tours.length === 0 ? <p className="bg-white border rounded-xl p-6 text-gray-500">Chưa có tour. Bấm “Thêm tour” để tạo tour đầu tiên.</p> : tours.map((item) => <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-4 flex justify-between gap-4 items-center"><div className="min-w-0"><p className="font-medium break-words">{item.name}</p><p className="text-sm text-gray-500">{TOUR_KINDS[item.kind]} · {item.destination} · {tourPrice(item.price)}</p><p className={`text-sm mt-1 ${item.published ? "text-green-700" : "text-gray-500"}`}>{item.published ? "Đang hiển thị" : "Bản nháp / đã ẩn"}</p></div><button disabled={busy} className={secondary} onClick={() => { setTour({ ...item }); setNotice(""); }}>Sửa</button></div>)}
  </div>;
}
