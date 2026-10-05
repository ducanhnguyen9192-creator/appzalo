import Button from "../../components/button";
import HorizontalDivider from "../../components/horizontal-divider";
import Collapse from "../../components/collapse";

import { useAtomValue } from "jotai";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { productState } from "../../state";
import { formatPrice } from "../../utils/format";
import { useAddToCart } from "../../hooks";
import { Color, Size } from "../../types";

import ShareButton from "./share-buttont";
import VariantPicker from "./variant-picker";
import RelatedProducts from "./related-products";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = useAtomValue(productState(Number(id)))!;

  const [selectedColor, setSelectedColor] = useState<Color>();
  const [selectedSize, setSelectedSize] = useState<Size>();

  /**
   * Nếu product không có price hợp lệ,
   * coi đây là bài viết / tin tức.
   */
  const hasPrice =
    typeof product?.price === "number" &&
    !Number.isNaN(product.price) &&
    product.price > 0;

  const hasOriginalPrice =
    typeof product?.originalPrice === "number" &&
    !Number.isNaN(product.originalPrice) &&
    product.originalPrice > 0;

  const isNews = !hasPrice;

  useEffect(() => {
    if (!product) return;

    setSelectedColor(product.colors?.[0]);
    setSelectedSize(product.sizes?.[0]);
  }, [id, product]);

  const { addToCart, setOptions } = useAddToCart(product);

  useEffect(() => {
    if (isNews) return;

    setOptions({
      size: selectedSize,
      color: selectedColor?.name,
    });
  }, [
    selectedSize,
    selectedColor,
    isNews,
    setOptions,
  ]);

  if (!product) {
    return (
      <div className="p-4 text-center text-sm text-gray-500">
        Không tìm thấy nội dung.
      </div>
    );
  }

  return (
    <div className="product-detail w-full h-full flex flex-col">
      {/* Nội dung chính */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full px-4">
          {/* Ảnh */}
          {product.image && (
            <div className="py-2">
              <img
                key={product.id}
                src={product.image}
                alt={product.name}
                className="w-full rounded-lg object-cover"
                style={{
                  viewTransitionName: `product-image-${product.id}`,
                }}
              />
            </div>
          )}

          {/* Tên bài / sản phẩm */}
          <div
            className={
              isNews
                ? "text-lg font-semibold text-gray-900 mt-2"
                : "text-sm mt-1"
            }
          >
            {product.name}
          </div>

          {/* Giá - chỉ hiện khi có giá hợp lệ */}
          {hasPrice && (
            <div className="mt-2">
              <div className="text-xl font-medium text-primary">
                {formatPrice(product.price)}
              </div>

              {hasOriginalPrice && (
                <div className="text-2xs text-subtitle line-through mt-1">
                  {formatPrice(product.originalPrice)}
                </div>
              )}
            </div>
          )}

          {/* Ngày đăng nếu dữ liệu tin tức có publishedAt */}
          {"publishedAt" in product &&
            product.publishedAt && (
              <div className="text-xs text-gray-400 mt-2">
                {String(product.publishedAt)}
              </div>
            )}

          {/* Tóm tắt tin tức nếu có */}
          {"summary" in product &&
            product.summary && (
              <div className="text-sm text-gray-600 leading-6 mt-3">
                {String(product.summary)}
              </div>
            )}

          {/* Chia sẻ */}
          <div className="py-3">
            <ShareButton product={product} />
          </div>

          {/* Màu - chỉ dùng cho sản phẩm */}
          {!isNews &&
            product.colors &&
            product.colors.length > 0 && (
              <>
                <VariantPicker
                  title="Màu sắc"
                  variants={product.colors}
                  value={selectedColor}
                  onChange={(color) =>
                    setSelectedColor(color)
                  }
                  renderVariant={(
                    variant,
                    selected
                  ) => (
                    <div
                      className={
                        "w-full h-full rounded-full ".concat(
                          selected
                            ? "border-2 border-primary p-0.5"
                            : ""
                        )
                      }
                    >
                      <div
                        className="w-full h-full rounded-full"
                        style={{
                          backgroundColor:
                            variant?.hex,
                        }}
                      />
                    </div>
                  )}
                />

                <HorizontalDivider />
              </>
            )}

          {/* Size - chỉ dùng cho sản phẩm */}
          {!isNews &&
            product.sizes &&
            product.sizes.length > 0 && (
              <VariantPicker
                title="Kích thước"
                variants={product.sizes}
                value={selectedSize}
                onChange={(size) =>
                  setSelectedSize(size)
                }
                renderVariant={(
                  variant,
                  selected
                ) => (
                  <div
                    className={
                      "w-full h-full flex justify-center items-center ".concat(
                        selected
                          ? "bg-primary text-white"
                          : ""
                      )
                    }
                  >
                    <div className="truncate">
                      {variant}
                    </div>
                  </div>
                )}
              />
            )}
        </div>

        {/* Nội dung chi tiết */}
        {product.details &&
          product.details.length > 0 && (
            <>
              <div className="bg-section h-2 w-full" />

              <Collapse items={product.details} />
            </>
          )}

        {/* Sản phẩm liên quan - không hiện cho tin tức */}
        {!isNews && (
          <>
            <div className="bg-section h-2 w-full" />

            <div className="font-medium py-2 px-4">
              <div className="pt-2 pb-2.5">
                Sản phẩm khác
              </div>

              <HorizontalDivider />
            </div>

            <RelatedProducts
              currentProductId={product.id}
            />
          </>
        )}

        {/* Khoảng trống cuối bài tin */}
        {isNews && <div className="h-6" />}
      </div>

      {/* Thanh mua hàng - chỉ hiện sản phẩm có giá */}
      {!isNews && (
        <>
          <HorizontalDivider />

          <div className="flex-none grid grid-cols-2 gap-2 py-3 px-4">
            <Button
              large
              onClick={() => {
                addToCart(1);
                toast.success(
                  "Đã thêm vào giỏ hàng"
                );
              }}
            >
              Thêm vào giỏ
            </Button>

            <Button
              large
              primary
              onClick={() => {
                addToCart(1);
                navigate("/cart");
              }}
            >
              Mua ngay
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
