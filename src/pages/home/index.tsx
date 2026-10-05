import { useNavigate } from "react-router-dom";
import Banners from "./banners";
import SearchBar from "../../components/search-bar";
import Category from "./category";
import Tintuc from "./tin-tuc";
import HomeTours from "./tours";
import HomeEsims from "./esims";
import HorizontalDivider from "@/components/horizontal-divider";


const HomePage: React.FunctionComponent = () => {
  const navigate = useNavigate();
  return (
    <div className="home-page min-h-full bg-section">
      <div className="home-tools bg-background pt-2">
        <div className="desktop-home-intro"><h1>Khám phá cùng FirstClass Travel</h1><p>Vé máy bay, tour và dịch vụ cho hành trình của bạn.</p></div>
        <div className="home-search"><SearchBar onClick={() => navigate("/search")} /></div>
      </div>
      <div className="home-banner bg-background"><Banners /></div>
      <div className="home-services bg-background space-y-2 mt-2">
        <Category />
      </div>
      <HorizontalDivider />
      <HomeTours />
      <HomeEsims />
      <Tintuc />
    </div>
  );
};

export default HomePage;
