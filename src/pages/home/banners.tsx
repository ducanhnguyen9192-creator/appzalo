import ContentImage from "@/components/content-image";
import Carousel from "../../components/carousel";
import { useAtomValue } from "jotai";
import { bannersState } from "@/state";

export default function Banners() {
  const banners = useAtomValue(bannersState);
  if (!banners.length) return null;
  return (
    <Carousel
      slides={banners.map((banner, index) => (
        <ContentImage
          key={index}
          loading={index === 0 ? "eager" : "lazy"}
          className="w-full rounded object-cover"
          src={banner}
          alt={`FirstClass Travel banner ${index + 1}`}
        />
      ))}
    />
  );
}
