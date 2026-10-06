import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return <div className="bg-white rounded-2xl p-6 lg:p-10 space-y-4 max-w-3xl mx-auto"><h1 className="text-2xl font-bold">Không tìm thấy trang</h1><p className="text-gray-600">Đường dẫn có thể đã thay đổi. Bạn có thể về trang chủ hoặc tìm hành trình phù hợp.</p><div className="flex flex-wrap gap-3"><Link to="/" className="rounded-xl bg-blue-600 text-white px-5 py-3">Về trang chủ</Link><Link to="/search" className="rounded-xl border px-5 py-3 text-blue-600">Tìm tour, eSIM & bài viết</Link></div></div>;
}

export function RouteErrorPage() {
  return <div className="bg-white text-gray-900 rounded-2xl p-6 space-y-4 max-w-3xl mx-auto mt-8"><h1 className="text-2xl font-bold">Chưa mở được trang</h1><p className="text-gray-600">Bạn hãy thử tải lại hoặc về trang chủ để tiếp tục.</p><button onClick={() => window.location.reload()} className="rounded-xl bg-blue-600 text-white px-5 py-3">Tải lại trang</button><Link to="/" className="block text-blue-600">← Về trang chủ</Link></div>;
}
