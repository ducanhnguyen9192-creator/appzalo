import { Link } from "react-router-dom";
import { Esim } from "@/utils/esims";
import { tourPrice } from "@/utils/tours";
import { contentImage } from "@/utils/content-image";

export default function EsimCards({ esims }: { esims: Esim[] }) {
  return <div className="tour-grid grid grid-cols-2 gap-4 p-4">{esims.map((item) => <Link key={item.id} to={`/esims/${item.id}`} className="tour-card bg-white rounded-2xl overflow-hidden border border-gray-100">
    <img src={contentImage(item.image)} alt={item.name} className="w-full aspect-[4/3] object-cover" />
    <div className="p-3 space-y-2 break-words"><p className="text-xs text-blue-600">eSIM du lịch</p><h3 className="text-sm leading-5 font-semibold line-clamp-2">{item.name}</h3><p className="text-xs text-gray-500 line-clamp-2">{item.coverage}</p><p className="text-xs text-gray-500">{item.allowance} · {item.validity}</p><p className="font-semibold text-blue-600 text-sm">{tourPrice(item.price)}</p><span className="text-xs text-gray-500">Xem chi tiết →</span></div>
  </Link>)}</div>;
}
