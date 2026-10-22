import { categoryPath } from "@/utils/tours";
import TransitionLink from "../../components/transition-link";
import { useAtomValue } from "jotai";
import { categoriesState } from "../../state";
import { getCategoryImage } from "../../utils/category-assets";
import "./category-list.css";

export default function CategoryListPage() {
  const categories = useAtomValue(categoriesState);

  return (
    <section className="category-directory" aria-labelledby="category-directory-title">
      <header className="category-directory-heading">
        <p>FIRSTCLASS TRAVEL</p>
        <h1 id="category-directory-title">Danh mục tiện ích</h1>
        <span className="category-directory-rule" aria-hidden="true" />
        <div>Mọi dịch vụ cho một hành trình trọn vẹn.<br />Chọn tiện ích bạn cần, FirstClass đồng hành cùng bạn.</div>
      </header>

      <nav className="service-grid category-directory-grid" aria-label="Dịch vụ du lịch">
        {categories.map((category) => {
          const imageSrc = getCategoryImage(category.image);

          return (
            <TransitionLink
              key={category.id}
              className="flex flex-col items-center space-y-2 rounded-2xl overflow-hidden cursor-pointer"
              to={categoryPath(category.id)}
            >
              <div className="w-full aspect-square rounded-full border border-gold-200 bg-gold-50 flex items-center justify-center overflow-hidden">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    className="w-full h-full object-contain p-2"
                    alt=""
                  />
                ) : (
                  <div className="text-xs text-gray-400">No image</div>
                )}
              </div>

              <div className="text-center text-sm font-medium leading-5 w-full text-gold-800">
                {category.name}
              </div>
            </TransitionLink>
          );
        })}
      </nav>
    </section>
  );
}
