// Polyfills
import ResizeObserver from "resize-observer-polyfill";
Object.assign(window, { ResizeObserver });

import { ReactNode, useCallback, useEffect, useState } from "react";
import { EmblaCarouselType } from "embla-carousel";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

type UseDotButtonType = {
  selectedIndex: number;
  scrollSnaps: number[];
  onDotButtonClick: (index: number) => void;
};

export const useDotButton = (
  emblaApi: EmblaCarouselType | undefined
): UseDotButtonType => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onDotButtonClick = useCallback(
    (index: number) => {
      if (!emblaApi) return;
      emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const onInit = useCallback((emblaApi: EmblaCarouselType) => {
    setScrollSnaps(emblaApi.scrollSnapList());
  }, []);

  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    onInit(emblaApi);
    onSelect(emblaApi);
    emblaApi.on("reInit", onInit).on("reInit", onSelect).on("select", onSelect);
    return () => { emblaApi.off("reInit", onInit).off("reInit", onSelect).off("select", onSelect); };
  }, [emblaApi, onInit, onSelect]);

  return {
    selectedIndex,
    scrollSnaps,
    onDotButtonClick,
  };
};

export interface CarouselProps {
  slides: ReactNode[];
  disabled?: boolean;
}

export default function Carousel(props: CarouselProps) {
  const [paused, setPaused] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ active: !props.disabled && !paused, stopOnInteraction: false }),
  ]);
  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);

  useEffect(() => {
    const autoplay = emblaApi?.plugins().autoplay;
    if (paused || props.disabled) autoplay?.stop(); else autoplay?.play();
  }, [emblaApi, paused, props.disabled]);

  return (
    <section className="overflow-hidden" ref={emblaRef} aria-label="Banner FirstClass Travel">
      <div className="flex">
        {props.slides.map((slide, i) => (
          <div key={i} className="flex-none basis-full p-4 pb-0">
            {slide}
          </div>
        ))}
      </div>

      {!props.disabled && scrollSnaps.length > 1 && <div className="carousel-controls flex flex-wrap justify-center items-center">
        {scrollSnaps.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Xem banner ${index + 1}`}
            aria-current={index === selectedIndex ? "true" : undefined}
            onClick={() => onDotButtonClick(index)}
            className={`carousel-dot ${index === selectedIndex ? "is-active" : ""}`}
          ><span /></button>
        ))}
        <button type="button" className="carousel-pause text-sm text-blue-600 rounded-lg px-3" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? "Tiếp tục" : "Tạm dừng"}</button>
      </div>}
    </section>
  );
}
