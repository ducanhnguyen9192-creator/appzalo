import Section from "../../components/section";
import { useAtomValue } from "jotai";
import { flashSaleProductsState } from "../../state";
import { Link } from "react-router-dom";

export default function Tintuc() {
  const products = useAtomValue(flashSaleProductsState);

  return (
    <Section title="Tin tức" viewMoreTo="/tin-tuc">
      <div className="news-grid grid grid-cols-2 gap-x-4 gap-y-5 px-4 pb-4">
        {products.map((product) => {
          const image = product.image;

          return (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="news-card text-left w-full"
            >
              {/* Ảnh */}
              <div className="news-image w-full aspect-square overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Loại nội dung */}
              <div className="text-xs text-gray-400 mt-2">
                {product.contentType === "offer" ? "Ưu đãi" : "Tin tức"}
              </div>

              {/* Tiêu đề */}
              <div className="news-title text-sm font-medium text-gray-900 mt-1 leading-5 line-clamp-2">
                {product.name}
              </div>

              {/* Ngày đăng nếu có */}
              <div className="news-date text-xs text-gray-400 mt-1">
                {"publishedAt" in product && product.publishedAt ? String(product.publishedAt) : ""}
              </div>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
