import Section from "../../components/section";
import { categoryPath } from "@/utils/tours";
import TransitionLink from "../../components/transition-link";
import { useAtomValue } from "jotai";
import { categoriesState } from "../../state";
import { getCategoryImage } from "../../utils/category-assets";

export default function Category() {
  const categories = useAtomValue(categoriesState);

  return (
    <Section title="Dịch vụ du lịch" viewMoreTo="/categories">
      <nav className="home-category-list" aria-label="Dịch vụ du lịch">
        {categories.map((category) => (
          <TransitionLink
            key={category.id}
            className="home-category-link"
            to={categoryPath(category.id)}
          >
            <img
              src={getCategoryImage(category.image)}
              className="home-category-icon"
              alt=""
            />
            <div className="home-category-name">
              {category.name}
            </div>
          </TransitionLink>
        ))}
      </nav>
    </Section>
  );
}
