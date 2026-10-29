import { useEffect, useState } from "react";
import { adminApi, adminApiBase, uploadAdminImage } from "@/utils/admin-api";
import { useUnsavedChanges } from "./unsaved-changes";
import ImagePicker from "./image-picker";

const defaultImage = "/images/tours/phu-quoc.jpg";

export default function HomeHeroEditor() {
  const [image, setImage] = useState(defaultImage);
  const [savedImage, setSavedImage] = useState(defaultImage);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  useUnsavedChanges(image !== savedImage);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`${adminApiBase}/api/content/home-hero`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được ảnh bìa hiện tại.");
        const data = await response.json();
        if (typeof data.image !== "string") throw new Error("Dữ liệu ảnh bìa không hợp lệ.");
        if (!controller.signal.aborted) { setImage(data.image); setSavedImage(data.image); }
      })
      .catch((e) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);

  async function act(work: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (e) { setError(e instanceof Error ? e.message : "Không cập nhật được ảnh bìa."); }
    finally { setBusy(false); }
  }

  return <form className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4" onSubmit={(event) => {
    event.preventDefault();
    if (busy || loading) return;
    void act(async () => {
      const saved = await adminApi<{ image: string }>("home-hero/save", { image });
      setImage(saved.image); setSavedImage(saved.image);
      setNotice("Đã lưu ảnh bìa. Tải lại trang chủ để xem thay đổi.");
    });
  }}>
    <div><h3 className="font-semibold text-lg">Ảnh bìa đầu trang</h3><p className="text-sm text-gray-500 mt-1">Ảnh lớn sau dòng chữ “Đi để khám phá”. Nên chọn ảnh ngang, chủ thể ở giữa hoặc bên phải để không bị chữ che.</p></div>
    {loading ? <p role="status">Đang tải ảnh bìa…</p> : <ImagePicker label="Ảnh bìa trang chủ" image={image} disabled={busy} onChange={(value) => { setImage(value); setNotice(""); }} onUpload={(file) => { void act(async () => { setImage(await uploadAdminImage(file)); setNotice("Đã tải ảnh lên. Bấm Lưu ảnh bìa để áp dụng."); }); }} />}
    {error && <p role="alert" className="text-sm text-red-600">{error} <button type="button" disabled={busy || loading} className="underline" onClick={() => setRevision(value => value + 1)}>Tải lại ảnh đã lưu</button></p>}
    {notice && <p role="status" className="text-sm text-gold-700">{notice}</p>}
    <div className="flex flex-wrap gap-2">
      <button disabled={busy || loading || !image.trim() || image === savedImage} className="rounded-xl bg-gold-600 text-white px-4 py-2.5 font-medium disabled:opacity-50">{busy ? "Đang xử lý…" : "Lưu ảnh bìa"}</button>
      <button type="button" disabled={busy || loading} className="rounded-xl border border-gray-200 px-4 py-2.5 disabled:opacity-50" onClick={() => { setImage(defaultImage); setNotice("Đã chọn ảnh mặc định. Bấm Lưu ảnh bìa để áp dụng."); }}>Dùng ảnh mặc định</button>
    </div>
  </form>;
}
