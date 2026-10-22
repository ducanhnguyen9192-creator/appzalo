import { Link } from "react-router-dom";
import Banners from "./banners";
import Category from "./category";
import Tintuc from "./tin-tuc";
import HomeTours from "./tours";
import HomeEsims from "./esims";
import heroImage from "@/assets/tours/phu-quoc.jpg";
import "./home.css";
import HomeFlightSearch from "./flight-search";


const HomePage: React.FunctionComponent = () => {
  return (
    <div className="home-page home-boutique min-h-full">
      <section className="journey-hero" aria-labelledby="journey-title">
        <img className="journey-hero-image" src={heroImage} alt="Bờ biển xanh với hàng dừa và bãi cát trắng" fetchPriority="high" />
        <div className="journey-hero-content">
          <p className="journey-eyebrow">FIRSTCLASS TRAVEL · ĐI & CẢM NHẬN</p>
          <h1 id="journey-title">Đi để khám phá.<br /><em>Ở lại trong ký ức.</em></h1>
          <p className="journey-description">Một miền đất mới, một khoảng trời riêng.<br />Tìm hành trình tiếp theo của bạn cùng FirstClass.</p>
          <Link className="journey-explore" to="/tours">Khám phá hành trình <span aria-hidden="true">↗</span></Link>
        </div>
        <span className="journey-image-note">Cảm hứng cho một kỳ nghỉ bên biển</span>
      </section>
      <HomeFlightSearch />
      <div className="home-services">
        <Category />
      </div>
      <div className="journey-collection"><p className="journey-section-kicker">THÊM MỘT ĐIỂM ĐẾN, THÊM MỘT KỶ NIỆM</p><HomeTours /></div>
      <div className="journey-connect"><div className="journey-connect-intro"><span className="journey-section-kicker">KẾT NỐI MỌI NƠI</span><h2>Đi xa.<br />Vẫn luôn gần.</h2><p>Khám phá các gói eSIM để giữ liên lạc và chia sẻ những khoảnh khắc trên đường đi.</p><Link to="/esims">Khám phá eSIM <span aria-hidden="true">→</span></Link></div><HomeEsims /></div>
      <div className="journey-updates"><p className="journey-section-kicker">NHỊP ĐIỆU FIRSTCLASS</p><h2 className="journey-updates-title">Câu chuyện & cảm hứng</h2><div className="home-banner"><Banners /></div><Tintuc /></div>
      <section className="journey-concierge"><div><p className="journey-eyebrow">MỖI HÀNH TRÌNH ĐỀU RIÊNG BIỆT</p><h2>Cần một chút gợi ý cho chuyến đi?</h2><p>Chia sẻ mong muốn của bạn, cùng FirstClass tìm lựa chọn phù hợp.</p></div><Link to="/support">Kết nối với FirstClass <span aria-hidden="true">↗</span></Link></section>
    </div>
  );
};

export default HomePage;
