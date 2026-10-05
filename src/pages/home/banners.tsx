import Carousel from "../../components/carousel";
import { useAtomValue } from "jotai";
import { bannersState } from "@/state";

export default function Banners() {
  const banners = useAtomValue(bannersState);
  if (!banners.length) return null;
  return (
    <Carousel
      slides={banners.map((banner, index) => (
        <img
          key={index}
          className="w-full rounded object-cover"
          src={banner}
          alt={`Firstclass Travel banner ${index + 1}`}
        />
      ))}
    />
  );
}
