import { DetailSkeleton } from "@/components/catalog-skeleton";
import { usePageTitle } from "@/utils/page-title";
import ContentImage from "@/components/content-image";
import { Link, useParams } from "react-router-dom";
import { Esim } from "@/utils/esims";
import { tourPrice, useContentData } from "@/utils/tours";
import ServiceConsultation from "@/components/service-consultation";

export default function EsimDetail() {
  const { id } = useParams();
  const { data: item, loading, error, retry } = useContentData<Esim>(`esims/${id}`);
  usePageTitle(item?.name);
  if (loading) return <DetailSkeleton label="Đang tải thông tin eSIM…" />;
  if (error || !item) return <div className="p-6 space-y-4"><p role="alert">{error || "Không tìm thấy gói eSIM."}</p><button className="text-blue-600" onClick={retry}>Thử lại</button><Link className="block text-blue-600" to="/esims">← Danh sách eSIM</Link></div>;
  return <article className="tour-detail bg-white rounded-2xl overflow-hidden break-words"><ContentImage src={item.image} alt={item.name} className="content-hero w-full object-cover" loading="eager" /><div className="p-4 lg:p-8 space-y-6">
    <div><p className="text-sm text-blue-600">eSIM du lịch</p><h1 className="text-xl lg:text-3xl font-bold mt-2">{item.name}</h1><p className="mt-3 text-gray-500 whitespace-pre-wrap">{item.summary}</p></div>
    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl bg-blue-50 p-4">{[["Vùng phủ sóng", item.coverage], ["Dung lượng", item.allowance], ["Thời hạn", item.validity], ["Giá gói", tourPrice(item.price)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-gray-500">{label}</dt><dd className="font-semibold text-sm mt-1">{value}</dd></div>)}</dl>
    {[["Nhà mạng / tốc độ", item.network], ["Điều kiện kích hoạt", item.activation], ["Hướng dẫn sử dụng", item.instructions], ["Lưu ý / thiết bị tương thích", item.notes]].map(([title, content]) => content && <section key={title}><h2 className="font-semibold text-lg mb-2">{title}</h2><p className="text-sm leading-6 text-gray-600 whitespace-pre-wrap">{content}</p></section>)}
    <ServiceConsultation service="esim" id={item.id} />
    <Link to="/esims" className="inline-block text-blue-600 font-medium">← Xem các gói eSIM khác</Link>
  </div></article>;
}
