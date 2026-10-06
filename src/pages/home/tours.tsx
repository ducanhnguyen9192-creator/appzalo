import { CatalogSkeleton } from "@/components/catalog-skeleton";
import Section from "@/components/section";
import TourCards from "@/components/tour-cards";
import { Tour, useTourData } from "@/utils/tours";

export default function HomeTours() {
  const { data, loading, error, retry } = useTourData<Tour[]>("tours");
  return <div className="home-tours"><Section title="Tour có sẵn" viewMoreTo="/tours">
    {loading ? <CatalogSkeleton label="Đang tải tour…" /> : error ? <p className="p-4 text-sm text-red-600" role="alert">Không tải được tour. <button onClick={retry} className="underline">Thử lại</button></p> : data?.length ? <TourCards tours={data.slice(0, 8)} /> : <p className="p-4 pb-6 text-sm text-gray-500">Danh sách tour đang được cập nhật. Bạn có thể xem các nhóm tour tại mục Xem thêm.</p>}
  </Section></div>;
}
