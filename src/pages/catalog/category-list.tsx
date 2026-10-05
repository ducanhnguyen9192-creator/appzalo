import SearchBar from "../../components/search-bar";
import TransitionLink from "../../components/transition-link";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import { categoriesState } from "../../state";
import { getCategoryImage } from "../../utils/category-assets";

export default function CategoryListPage() {
  const navigate = useNavigate();
  const categories = useAtomValue(categoriesState);

  return (
    <>
      <div className="py-2">
        <SearchBar onClick={() => navigate("/search")} />
      </div>

      <div className="grid grid-cols-4 p-4 gap-x-4 gap-y-8">
        {categories.map((category) => {
          const imageSrc = getCategoryImage(category.image);

          return (
            <TransitionLink
              key={category.id}
              className="flex flex-col items-center space-y-2 overflow-hidden cursor-pointer"
              to={`/category/${category.id}`}
            >
              <div className="w-full aspect-square rounded-full border border-black/10 bg-white flex items-center justify-center overflow-hidden">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    className="w-full h-full object-contain p-2"
                    alt={category.name}
                  />
                ) : (
                  <div className="text-xs text-gray-400">No image</div>
                )}
              </div>

              <div className="text-center text-sm w-full line-clamp-2 text-subtitle">
                {category.name}
              </div>
            </TransitionLink>
          );
        })}
      </div>
    </>
  );
}
