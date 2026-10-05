import flightIcon from "../assets/categories/flight.svg";
import domesticTourIcon from "../assets/categories/domestic-tour.svg";
import internationalTourIcon from "../assets/categories/international-tour.svg";
import comboIcon from "../assets/categories/combo.svg";
import hotelIcon from "../assets/categories/hotel.svg";
import visaIcon from "../assets/categories/visa.svg";
import esimIcon from "../assets/categories/esim.svg";
import airportIcon from "../assets/categories/airport.svg";
import carIcon from "../assets/categories/car.svg";
import insuranceIcon from "../assets/categories/insurance.svg";

const CATEGORY_IMAGES: Record<string, string> = {
  flight: flightIcon,
  "domestic-tour": domesticTourIcon,
  "international-tour": internationalTourIcon,
  combo: comboIcon,
  hotel: hotelIcon,
  visa: visaIcon,
  esim: esimIcon,
  airport: airportIcon,
  car: carIcon,
  insurance: insuranceIcon,
};

export function getCategoryImage(imageKey?: string) {
  if (!imageKey) return "";
  return CATEGORY_IMAGES[imageKey] || "";
}
