import Section from "../../components/section";
import { useAtomValue } from "jotai";
import { flashSaleProductsState } from "../../state";
import { useNavigate } from "react-router-dom";

import news1 from "../../assets/news/news-1.jpg";
import news2 from "../../assets/news/news-2.jpg";
import news3 from "../../assets/news/news-3.jpg";
import news4 from "../../assets/news/news-4.jpg";
import news5 from "../../assets/news/news-5.jpg";
import news6 from "../../assets/news/news-6.jpg";
import news7 from "../../assets/news/news-7.jpg";
import news8 from "../../assets/news/news-8.jpg";

const NEWS_IMAGES: Record<number, string> = {
  1: news1,
  2: news2,
  3: news3,
  4: news4,
  5: news5,
  6: news6,
  7: news7,
  8: news8,
};

export default function Tintuc() {
  const products = useAtomValue(flashSaleProductsState);
  const navigate = useNavigate();

  return (
    <Section title="Tin tức" viewMoreTo="/tin-tuc">
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 px-4 pb-4">
        {products.map((product) => {
          const image =
            NEWS_IMAGES[product.id] ||
            product.image;

          return (
            <button
              key={product.id}
              type="button"
              onClick={() =>
                navigate(`/product/${product.id}`)
              }
              className="text-left w-full"
            >
              {/* Ảnh */}
              <div className="w-full aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Loại nội dung */}
              <div className="text-xs text-gray-400 mt-2">
                Tin tức
              </div>

              {/* Tiêu đề */}
              <div className="text-sm font-medium text-gray-900 mt-1 leading-5 line-clamp-2">
                {product.name}
              </div>

              {/* Ngày đăng nếu có */}
              {"publishedAt" in product &&
                product.publishedAt && (
                  <div className="text-xs text-gray-400 mt-1">
                    {String(product.publishedAt)}
                  </div>
                )}
            </button>
          );
        })}
      </div>
    </Section>
  );
}