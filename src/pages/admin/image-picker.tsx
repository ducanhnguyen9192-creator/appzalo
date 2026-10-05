import { ChangeEvent } from "react";
import { contentImage } from "@/utils/content-image";

type Props = { image: string; label: string; disabled: boolean; onChange: (url: string) => void; onUpload: (file: File) => void };

export default function ImagePicker({ image, label, disabled, onChange, onUpload }: Props) {
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onUpload(file);
  }
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={disabled} onChange={choose}
          className="block w-full mt-2 text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 disabled:opacity-50" />
      </label>
      <p className="text-xs text-gray-500">Chọn ảnh từ máy hoặc điện thoại. JPG, PNG, WebP, GIF · tối đa 5 MB. Chọn xong, bấm Lưu để áp dụng.</p>
      {image && <img src={contentImage(image)} alt="Xem trước ảnh đã chọn" className="w-full max-w-lg max-h-56 object-contain rounded-xl border border-gray-100 bg-gray-50" />}
      <details className="text-sm text-gray-500"><summary className="cursor-pointer">Hoặc nhập đường dẫn ảnh</summary>
        <input aria-label={`Đường dẫn ${label.toLowerCase()}`} disabled={disabled} maxLength={2000} value={image} onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-gray-900 mt-2" />
      </details>
    </div>
  );
}
