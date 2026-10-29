import { Link } from "react-router-dom";
import heroImage from "@/assets/company/hero.webp";
import teamImage from "@/assets/company/team-roles-final.png";
import privateJetImage from "@/assets/company/private-jet.webp";
import partnersImage from "@/assets/company/partners.webp";
import technologyImage from "@/assets/company/technology.webp";
import awardsImage from "@/assets/company/awards.webp";
import "./about.css";

const source = "https://csck.firstclass-travel.com.vn/ho-so-nang-luc";
const images: Record<string, string> = { hero: heroImage, team: teamImage, "private-jet": privateJetImage, partners: partnersImage, technology: technologyImage, awards: awardsImage };
const milestones = [
  ["2002", "Khởi đầu", "Thành lập doanh nghiệp, trở thành đại lý ủy quyền của Vietnam Airlines."],
  ["2005", "Kết nối quốc tế", "Gia nhập Hiệp hội Vận tải Hàng không Quốc tế (IATA)."],
  ["2023", "Thương hiệu FirstClass", "Tái cấu trúc và phát triển thương hiệu FirstClass Travel."],
  ["2025", "Dấu ấn tăng trưởng", "Được các hãng hàng không trong nước và quốc tế ghi nhận về doanh số."],
];
const services = [
  ["Vé máy bay", "Tư vấn đường bay, giờ khởi hành và giá vé cho hành trình trong nước, quốc tế."],
  ["Xử lý khẩn cấp", "Hỗ trợ đổi, hủy, giữ chỗ và các tình huống phát sinh trong hành trình."],
  ["Dịch vụ doanh nghiệp", "Chính sách chiết khấu và quản lý linh hoạt cho doanh nghiệp, tập đoàn và tổ chức."],
  ["eSIM toàn cầu", "Kết nối tại nhiều quốc gia, kích hoạt bằng mã QR."],
  ["Private Jet", "Lịch bay riêng linh hoạt, hỗ trợ cá nhân và dịch vụ mặt đất cao cấp."],
  ["Visa & thủ tục", "Tư vấn hồ sơ và hỗ trợ thủ tục thị thực."],
  ["Hỗ trợ hành lý", "Hỗ trợ nhu cầu đặc biệt, hành lý quá cước, thất lạc hoặc hư hỏng."],
  ["Dịch vụ VIP sân bay", "Fast Track, phòng chờ, xe đưa đón và hỗ trợ ưu tiên."],
  ["Hỗ trợ 24/7", "Đồng hành cùng khách hàng trước, trong và sau chuyến đi."],
  ["Bảo hiểm du lịch", "Các giải pháp bảo vệ cho sức khỏe, hành lý và những rủi ro trong hành trình."],
  ["Khách sạn", "Đặt phòng trong nước và quốc tế theo nhu cầu cá nhân, doanh nghiệp."],
  ["Tour & MICE", "Tour trọn gói, team building, hội nghị, hội thảo và vận chuyển."],
];

function ProfileImage({ name, alt }: { name: string; alt: string }) {
  return <img className="company-image" src={images[name]} alt={alt} loading={name === "hero" ? "eager" : "lazy"} />;
}

export default function AboutPage() {
  return <article className="company-page">
    <section className="company-hero">
      <div><p className="company-eyebrow">FIRSTCLASS TRAVEL · HỒ SƠ NĂNG LỰC</p>
        <h1>Hơn hai thập kỷ<br /><em>đồng hành cùng bạn.</em></h1>
        <p>Đối tác hàng không và du lịch toàn diện dành cho đại lý, doanh nghiệp và khách hàng cao cấp. FirstClass kết hợp kinh nghiệm vận hành, sự tận tâm và công nghệ để mang đến những hành trình thuận tiện, an tâm.</p>
        <div className="company-actions"><Link to="/support" className="company-button">Kết nối với FirstClass →</Link><a href={source} target="_blank" rel="noopener noreferrer">Xem hồ sơ năng lực ↗</a></div>
      </div>
      <ProfileImage name="hero" alt="FirstClass Travel — hành trình phát triển" />
    </section>
    <dl className="company-stats">{[["20+", "Năm kinh nghiệm"], ["200+", "Đối tác hàng không"], ["1.000.000+", "Vé máy bay mỗi năm"], ["35", "Nhân sự chuyên nghiệp"]].map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <section className="company-section"><p className="company-eyebrow">VỀ CHÚNG TÔI</p><h2>Uy tín từ mỗi hành trình</h2><p>Khởi đầu từ năm 2002, FirstClass Travel phát triển trong lĩnh vực đại lý vé máy bay, du lịch và dịch vụ bổ trợ. Khách hàng là trung tâm của mọi hoạt động; minh bạch và tận tâm là nền tảng để xây dựng quan hệ lâu dài.</p><p>Chúng tôi đầu tư vào con người và công nghệ để việc tìm kiếm, lựa chọn và sử dụng dịch vụ ngày càng thuận tiện.</p>
      <div className="company-timeline">{milestones.map(([year, title, description]) => <div key={year}><span>{year}</span><h3>{title}</h3><p>{description}</p></div>)}</div>
    </section>
    <section className="company-section company-team"><a className="company-team-image-link" href={teamImage} target="_blank" rel="noopener noreferrer" aria-label="Mở ảnh đội ngũ kích thước lớn"><ProfileImage name="team" alt="Đội ngũ FirstClass Travel" /><span>Bấm vào ảnh để xem kích thước lớn ↗</span></a><div><p className="company-eyebrow">ĐỘI NGŨ</p><h2>Kinh nghiệm và sự tận tâm</h2><p>Đội ngũ được đào tạo bài bản về hàng không, du lịch và chăm sóc khách hàng, làm việc với tinh thần trách nhiệm và đồng hành đến cùng.</p><div className="company-leaders"><p><strong>Nguyễn Đức Anh</strong><span>Tổng Giám đốc</span></p><p><strong>Nguyễn Kim Yến</strong><span>Phó Giám đốc</span></p></div></div></section>
    <section className="company-section"><p className="company-eyebrow">SẢN PHẨM & DỊCH VỤ</p><h2>Một điểm đến cho mọi nhu cầu du lịch</h2><p>Kết nối dịch vụ hàng không, lưu trú, điểm đến và hỗ trợ hành trình qua một đầu mối.</p><div className="company-services">{services.map(([title, description], index) => <div key={title}><span className="company-number">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p></div>)}</div></section>
    <section className="company-section company-split company-premium"><div><p className="company-eyebrow">TRẢI NGHIỆM CAO CẤP</p><h2>Private Jet — hành trình của riêng bạn</h2><p>Lịch trình linh hoạt cùng dịch vụ ăn uống, vận chuyển mặt đất, hỗ trợ hành lý và chăm sóc riêng cho khách hàng cao cấp.</p><Link to="/support" className="company-button">Tư vấn hành trình →</Link></div><ProfileImage name="private-jet" alt="Dịch vụ Private Jet FirstClass" /></section>
    <section className="company-section company-split"><div><p className="company-eyebrow">ĐỐI TÁC & KHÁCH HÀNG</p><h2>Kết nối rộng, đồng hành bền lâu</h2><p>Mạng lưới hơn 200 hãng hàng không, hệ thống phân phối và nhà cung cấp phục vụ cơ quan nhà nước, tổ chức quốc tế, doanh nghiệp trong nước, doanh nghiệp FDI và đối tác du lịch.</p><div className="company-partners">{["Vietnam Airlines", "Vietjet Air", "Bamboo Airways", "Qatar Airways", "Emirates", "ANA", "Air China", "Turkish Airlines", "Sabre", "Galileo"].map(name => <span key={name}>{name}</span>)}</div></div><ProfileImage name="partners" alt="Đối tác và khách hàng FirstClass Travel" /></section>
    <section className="company-section company-split"><ProfileImage name="technology" alt="Nền tảng công nghệ FirstClass Travel" /><div><p className="company-eyebrow">GIẢI PHÁP CÔNG NGHỆ</p><h2>Travel API Hub</h2><p>Kết nối hãng hàng không, hệ thống GDS, bảo hiểm và ngân hàng; phân phối dữ liệu tới website, ứng dụng và các hệ thống B2B/B2C.</p><ul><li>Tìm kiếm và so sánh theo thời gian thực.</li><li>Hỗ trợ quản lý hành trình.</li><li>Trải nghiệm trên nhiều thiết bị.</li><li>Kết nối hệ sinh thái đại lý và khách hàng.</li></ul></div></section>
    <section className="company-section"><p className="company-eyebrow">ĐỊNH HƯỚNG PHÁT TRIỂN</p><h2>Phát triển từ những giá trị bền vững</h2><div className="company-values"><div><h3>Tầm nhìn</h3><p>Mở rộng quy mô, nâng cao chất lượng đội ngũ và ứng dụng công nghệ, hướng tới vị thế tập đoàn du lịch hàng đầu, uy tín tại Việt Nam.</p></div><div><h3>Sứ mệnh</h3><p>Tích hợp nguồn lực và nền tảng để cung cấp dịch vụ đầy đủ, trở thành lựa chọn tin cậy của khách hàng.</p></div></div><div className="company-partners">{["Tin cậy · Giữ trọn cam kết", "Tận tâm · Lấy khách hàng làm trung tâm", "Con người · Phát triển đội ngũ", "Chia sẻ · Cùng đối tác tăng trưởng"].map(value => <span key={value}>{value}</span>)}</div></section>
    <section className="company-section company-split"><div><p className="company-eyebrow">THÀNH TỰU & CHỨNG NHẬN</p><h2>Sự ghi nhận từ các đối tác</h2><p>Theo hồ sơ năng lực, FirstClass được ghi nhận trong nhóm đại lý doanh thu cao của Vietnam Airlines và là đại lý xuất sắc của Sabre, Galileo qua nhiều giai đoạn.</p><p>Các chứng nhận về du lịch và thương hiệu ghi nhận năng lực tổ chức, phân phối và phục vụ khách hàng.</p></div><ProfileImage name="awards" alt="Thành tựu và chứng nhận FirstClass Travel" /></section>
    <section className="company-section"><p className="company-eyebrow">VÌ SAO CHỌN FIRSTCLASS?</p><div className="company-reasons">{["Giá minh bạch", "Đặt vé nhanh chóng", "Combo tiện lợi", "Hỗ trợ 24/7", "Trải nghiệm cao cấp"].map((reason, index) => <div key={reason}><span>0{index + 1}</span><h3>{reason}</h3></div>)}</div></section>
    <section className="company-section company-contact"><p className="company-eyebrow">LIÊN HỆ VỚI CHÚNG TÔI</p><h2>Cùng lên kế hoạch cho hành trình tiếp theo</h2><address><p>52/603 Lạc Long Quân, Phường Tây Hồ, Hà Nội</p><p><a href="tel:+842432293999">(+84) 24 3229 3999</a> · <a href="tel:0588599588">0588 599 588</a></p><p><a href="mailto:info@firstclass-travel.vn">info@firstclass-travel.vn</a></p><p>Facebook: Vietnam Firstclass Travel</p></address><div className="company-actions"><Link to="/support" className="company-button">Liên hệ tư vấn →</Link><a href="mailto:info@firstclass-travel.vn">Gửi yêu cầu hợp tác ↗</a></div></section>
    <p className="company-source">Thông tin theo <a href={source} target="_blank" rel="noopener noreferrer">hồ sơ năng lực FirstClass Travel</a>.</p>
  </article>;
}
