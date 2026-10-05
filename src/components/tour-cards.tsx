import { Link } from "react-router-dom";
import { Tour, TOUR_KINDS, tourPrice } from "@/utils/tours";
import { contentImage } from "@/utils/content-image";

export default function TourCards({ tours }: { tours: Tour[] }) {
  return <div className="tour-grid grid grid-cols-2 gap-4 p-4">
    {tours.map((tour) => <Link key={tour.id} to={`/tours/${tour.id}`} className="tour-card bg-white rounded-2xl overflow-hidden border border-gray-100">
      <img src={contentImage(tour.image)} alt={tour.name} className="w-full aspect-[4/3] object-cover" />
      <div className="p-3 space-y-2">
        <p className="text-xs text-blue-600">{TOUR_KINDS[tour.kind]}</p>
        <h3 className="font-semibold text-sm leading-5 line-clamp-2">{tour.name}</h3>
        <p className="text-xs text-gray-500">{tour.destination} · {tour.duration}</p>
        {tour.departure && <p className="text-xs text-gray-500">Khởi hành: {tour.departure}</p>}
        <p className="font-semibold text-blue-600 text-sm">{tourPrice(tour.price)}</p>
        <span className="inline-block text-xs text-gray-500">Xem chi tiết →</span>
      </div>
    </Link>)}
  </div>;
}
