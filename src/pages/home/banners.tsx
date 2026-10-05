import Carousel from "../../components/carousel";
import banner1 from "../../assets/banners/banner-1.jpg";
import banner2 from "../../assets/banners/banner-2.jpg";

const banners = [
  banner1,
  banner2,
];

export default function Banners() {
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