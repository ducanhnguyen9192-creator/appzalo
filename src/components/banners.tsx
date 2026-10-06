import ContentImage from "@/components/content-image";
import Carousel from "./carousel";

import banner1 from "../assets/banners/banner-1.jpg";
import banner2 from "../assets/banners/banner-2.jpg";
import banner3 from "../assets/banners/banner-3.jpg";

const BANNERS = [banner1, banner2, banner3];

export default function Banners() {
  return (
    <Carousel
      slides={BANNERS.map((banner, index) => (
        <ContentImage
          key={index}
          loading={index === 0 ? "eager" : "lazy"}
          src={banner}
          alt={`FirstClass Travel banner ${index + 1}`}
          className="w-full rounded object-cover"
        />
      ))}
    />
  );
}
