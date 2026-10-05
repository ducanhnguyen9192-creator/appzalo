import Section from "@/components/section";
import EsimCards from "@/components/esim-cards";
import { Esim } from "@/utils/esims";
import { useContentData } from "@/utils/tours";

export default function HomeEsims() {
  const { data, loading, error, retry } = useContentData<Esim[]>("esims");
  return <div className="home-tours"><Section title="eSIM du lịch" viewMoreTo="/esims">{loading ? <p role="status" className="p-4 text-sm text-gray-500">Đang tải eSIM…</p> : error ? <p role="alert" className="p-4 text-sm text-red-600">Không tải được eSIM. <button onClick={retry} className="underline">Thử lại</button></p> : data?.length ? <EsimCards esims={data.slice(0, 8)} /> : <p className="p-4 pb-6 text-sm text-gray-500">Danh sách gói eSIM đang được cập nhật.</p>}</Section></div>;
}
