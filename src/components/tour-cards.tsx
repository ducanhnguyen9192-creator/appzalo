import { Link } from "react-router-dom";
import { Tour, TOUR_KINDS, tourPrice } from "@/utils/tours";
import { contentImage } from "@/utils/content-image";

export default function TourCards({ tours }: { tours: Tour[] }) {
  return <div className="tour-grid grid grid-cols-2 gap-4 p-4">
    {tours.map((tour) => <Link key={tour.id} to={`/tours/${tour.id}`} className="tour-card bg-white rounded-2xl overflow-hidden border border-gray-100">
      <div className="catalog-card-image"><img src={contentImage(tour.image)} alt={tour.name} /></div>
      <div className="catalog-card-body p-3">
        <p className="text-xs leading-4 text-blue-600">{TOUR_KINDS[tour.kind]}</p>
        <h3 className="catalog-card-title font-semibold text-sm leading-5 line-clamp-2">{tour.name}</h3>
        <p className="catalog-card-meta text-xs leading-4 text-gray-500 line-clamp-2">{tour.destination} · {tour.duration}</p>
        <p className="catalog-card-meta text-xs leading-4 text-gray-500 line-clamp-2">{tour.departure ? `Khởi hành: ${tour.departure}` : "Liên hệ tư vấn lịch khởi hành"}</p>
        <p className="catalog-card-price font-semibold text-blue-600 text-sm">{tourPrice(tour.price)}</p>
        <span className="inline-block text-xs text-gray-500">Xem chi tiết →</span>
      </div>
    </Link>)}
  </div>;
}
