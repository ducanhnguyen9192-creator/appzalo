import { useLanguage } from "@/i18n/store";
import { Link } from "react-router-dom";
import logo from "@/static/header-logo.svg";
import "./desktop-footer.css";

export default function DesktopFooter() {
  const { t } = useLanguage();
  return <footer className="desktop-footer" aria-label="Thông tin FirstClass Travel">
    <div className="desktop-footer-main">
      <div className="desktop-footer-intro">
        <Link to="/" aria-label={t("FirstClass Travel - Trang chủ")}><img src={logo} alt="FirstClass Travel" /></Link>
        <p>Đối tác hàng không, du lịch và công nghệ dành cho đại lý, doanh nghiệp và khách hàng cao cấp. Hơn hai thập kỷ kiến tạo những hành trình xứng tầm.</p>
      </div>
      <nav aria-label="Khám phá FirstClass">
        <h2>Khám phá</h2>
        <Link to="/gioi-thieu">Giới thiệu công ty</Link>
        <a href="https://csck.firstclass-travel.com.vn/#policy" target="_blank" rel="noopener noreferrer">Chính sách hãng</a>
        <a href="https://csck.firstclass-travel.com.vn/dieu-kien-ve" target="_blank" rel="noopener noreferrer">Điều kiện vé</a>
        <Link to="/admin">Cổng quản trị</Link>
      </nav>
      <div>
        <h2>FirstClass Concierge</h2>
        <address>
          <a href="tel:+842432293999">(+84) 24 3229 3999</a>
          <a href="tel:0588599588">0588 599 588</a>
          <a href="mailto:info@firstclass-travel.vn">info@firstclass-travel.vn</a>
          <p>52/603 Lạc Long Quân, Phường Tây Hồ, Hà Nội</p>
        </address>
      </div>
    </div>
    <div className="desktop-footer-bottom"><div>
      <p>© {new Date().getFullYear()} FirstClass Travel. All rights reserved.</p>
      <p>Chính sách bảo mật · Điều khoản sử dụng</p>
    </div></div>
  </footer>;
}
