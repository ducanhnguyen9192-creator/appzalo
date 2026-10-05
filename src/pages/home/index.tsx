import { useNavigate } from "react-router-dom";
import Banners from "./banners";
import SearchBar from "../../components/search-bar";
import Category from "./category";
import Tintuc from "./tin-tuc";
import HorizontalDivider from "@/components/horizontal-divider";


const HomePage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-full bg-section">
      <div className="bg-background pt-2">
        <SearchBar onClick={() => navigate("/search")} />
        <Banners />
      </div>
      <div className="bg-background space-y-2 mt-2">
        <Category />
      </div>
      <HorizontalDivider />
      <Tintuc />
    </div>
  );
};

export default HomePage;
