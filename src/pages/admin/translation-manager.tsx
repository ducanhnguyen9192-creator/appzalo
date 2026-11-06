import { loadTranslations } from "@/i18n/store";

export default function TranslationManager() {
  return <section className="bg-white rounded-2xl border p-5 space-y-4">
    <h3 className="font-semibold text-lg">Bản dịch tiếng Anh</h3>
    <p>Sử dụng bản dịch tiếng Anh đã lưu trong ứng dụng và cơ sở dữ liệu. Không cần Google Cloud hoặc khóa API dịch.</p>
    <p className="text-sm text-gray-600">Nội dung mới hoặc thay đổi cần được bổ sung bản dịch. Phần chưa có bản dịch hiển thị bản gốc tiếng Việt.</p>
    <button type="button" className="rounded-xl border px-4 py-3" onClick={() => void loadTranslations()}>Tải lại bản dịch giao diện</button>
  </section>;
}
