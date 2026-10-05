import Section from "../../components/section";
import TransitionLink from "../../components/transition-link";
import { useAtomValue } from "jotai";
import { categoriesState } from "../../state";
import { getCategoryImage } from "../../utils/category-assets";

export default function Category() {
  const categories = useAtomValue(categoriesState);

  return (
    <Section title="Danh mục tiện ích" viewMoreTo="/categories">
      <div className="home-category-list pt-2.5 pb-4 flex space-x-6 overflow-x-auto px-4">
        {categories.map((category) => (
          <TransitionLink
            key={category.id}
            className="flex flex-col items-center space-y-2 flex-none basis-[70px] overflow-hidden cursor-pointer"
            to={`/category/${category.id}`}
          >
            <img
              src={getCategoryImage(category.image)}
              className="w-[70px] h-[70px] object-contain rounded-full border-[0.5px] border-black/15 bg-white p-2"
              alt={category.name}
            />
            <div className="text-center text-sm w-full line-clamp-2 text-subtitle">
              {category.name}
            </div>
          </TransitionLink>
        ))}
      </div>
    </Section>
  );
}
