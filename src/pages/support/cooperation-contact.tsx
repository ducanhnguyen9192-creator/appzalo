import contactImage from "@/assets/company/contact-original.webp";
import "./cooperation-contact.css";

const services = [
  ["Tối ưu lịch trình", "Cung cấp routing, giờ bay và mức giá cạnh tranh cho hành trình nội địa và quốc tế."],
  ["Xử lý khẩn cấp", "Chuyên gia vé hỗ trợ đổi, hủy, giữ chỗ và xử lý tình huống phát sinh."],
  ["Đặc quyền doanh nghiệp", "Chính sách chiết khấu, quản lý linh hoạt cho tập đoàn, doanh nghiệp FDI và tổ chức quốc tế."],
  ["eSIM toàn cầu", "Kích hoạt bằng QR, đa quốc gia, tiết kiệm chi phí và bảo mật."],
  ["Private Jet", "Hành trình riêng tư với lịch bay linh hoạt, dịch vụ mặt đất và hỗ trợ 1:1."],
  ["Visa & pháp lý", "Tư vấn hồ sơ, thủ tục thị thực minh bạch và nhanh chóng."],
  ["Hỗ trợ hành lý", "Xử lý hành lý quá cước, thất lạc, hư hỏng và nhu cầu đặc biệt."],
  ["Dịch vụ VIP sân bay", "Fast Track, phòng chờ, xe đưa đón và hỗ trợ ưu tiên."],
  ["Hỗ trợ 24/7", "Đường dây nóng vận hành liên tục, đồng hành trước, trong và sau chuyến đi."],
  ["Bảo hiểm du lịch", "Bảo vệ y tế, hành lý, hủy chuyến, trễ hành trình và trách nhiệm cá nhân."],
  ["Khách sạn toàn cầu", "Đặt phòng trong nước và quốc tế theo nhu cầu cá nhân hoặc doanh nghiệp."],
  ["Tour trọn gói & MICE", "Thiết kế tour, team building, hội nghị, hội thảo, visa và vận chuyển."],
];

export default function CooperationContact() {
  return <section className="cooperation-contact" aria-labelledby="cooperation-title">
    <div className="cooperation-copy">
      <p className="cooperation-eyebrow">LIÊN HỆ VỚI CHÚNG TÔI</p>
      <h1 id="cooperation-title">Cùng FirstClass<br /><span>kiến tạo hành trình tiếp theo.</span></h1>
      <dl className="cooperation-details">
        <div><dt>Địa chỉ</dt><dd>52/603 Lạc Long Quân, Phường Tây Hồ, Hà Nội</dd></div>
        <div><dt>Điện thoại</dt><dd><a href="tel:+842432293999">(+84) 24 3229 3999</a><br /><a href="tel:0588599588">0588 599 588</a></dd></div>
        <div><dt>Email</dt><dd><a href="mailto:info@firstclass-travel.vn">info@firstclass-travel.vn</a></dd></div>
        <div><dt>Facebook</dt><dd>Vietnam Firstclass Travel</dd></div>
      </dl>
      <a className="cooperation-submit" href="mailto:info@firstclass-travel.vn?subject=Y%C3%AAu%20c%E1%BA%A7u%20h%E1%BB%A3p%20t%C3%A1c">Gửi yêu cầu hợp tác</a>
    </div>
    <div className="cooperation-overview">
      <section className="cooperation-services" aria-labelledby="cooperation-services-title">
        <p className="cooperation-eyebrow">SẢN PHẨM & DỊCH VỤ</p>
        <h2 id="cooperation-services-title">Một hệ sinh thái cho mọi hành trình.</h2>
        <p className="cooperation-services-intro">Từ vé máy bay đến dịch vụ tại sân bay, điểm đến và công nghệ vận hành — tất cả được kết nối trong một đầu mối chuyên nghiệp.</p>
        <div className="cooperation-service-grid">{services.map(([title, description], index) => <div className="cooperation-service-card" key={title}>
          <span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p>
        </div>)}</div>
      </section>
      <figure className="cooperation-art"><img src={contactImage} alt="Thông tin liên hệ FirstClass Travel và mã QR Chat Zalo, Website" /></figure>
    </div>
  </section>;
}
