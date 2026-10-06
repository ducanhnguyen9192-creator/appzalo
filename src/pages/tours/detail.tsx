import { DetailSkeleton } from "@/components/catalog-skeleton";
import { usePageTitle } from "@/utils/page-title";
import ContentImage from "@/components/content-image";
import { Link, useParams } from "react-router-dom";
import { Tour, TOUR_KINDS, tourPrice, useTourData } from "@/utils/tours";
import ServiceConsultation from "@/components/service-consultation";

export default function TourDetail() {
  const { id } = useParams();
  const { data: tour, loading, error, retry } = useTourData<Tour>(`tours/${id}`);
  usePageTitle(tour?.name);
  if (loading) return <DetailSkeleton label="Đang tải thông tin tour…" />;
  if (error || !tour) return <div className="p-6 space-y-4"><p role="alert">{error || "Không tìm thấy tour."}</p><button onClick={retry} className="text-blue-600">Thử lại</button><Link to="/tours" className="block text-blue-600">← Danh sách tour</Link></div>;
  return <article className="tour-detail bg-white rounded-2xl overflow-hidden">
    <ContentImage src={tour.image} alt={tour.name} className="content-hero w-full object-cover" loading="eager" />
    <div className="p-4 lg:p-8 space-y-6"><div><p className="text-sm text-blue-600">{TOUR_KINDS[tour.kind]}</p><h1 className="text-xl lg:text-3xl font-bold mt-2">{tour.name}</h1><p className="text-gray-500 mt-3 whitespace-pre-wrap">{tour.summary}</p></div>
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 rounded-xl bg-blue-50 p-4">{[["Điểm đến", tour.destination], ["Thời lượng", tour.duration], ["Khởi hành", tour.departure || "Liên hệ tư vấn"], ["Giá tour", tourPrice(tour.price)]].map(([label, value]) => <div key={label}><dt className="text-xs text-gray-500">{label}</dt><dd className="font-semibold mt-1 text-sm break-words">{value}</dd></div>)}</dl>
      {[["Lịch trình", tour.itinerary], ["Dịch vụ bao gồm", tour.included], ["Dịch vụ chưa bao gồm", tour.excluded]].map(([title, content]) => content && <section key={title}><h2 className="font-semibold text-lg mb-2">{title}</h2><p className="text-sm leading-6 whitespace-pre-wrap text-gray-600">{content}</p></section>)}
      <ServiceConsultation service="tour" id={tour.id} />
      <Link to={`/tours?type=${tour.kind}`} className="inline-block text-blue-600 font-medium">← Xem các tour cùng nhóm</Link>
    </div>
  </article>;
}
