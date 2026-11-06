import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Esim } from "@/utils/esims";
import { useContentData } from "@/utils/tours";
import heroImage from "@/assets/esims/hero.png";
import EsimDestinations from "./destinations";
import CountrySearch, { esimSearchPath } from "./country-search";
import "./esims.css";

const benefits = [
  { title: "Kết nối linh hoạt", text: "Chọn dung lượng theo nhu cầu", icon: <><path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0" /><circle cx="12" cy="20" r="1" /></> },
  { title: "Thông tin rõ ràng", text: "Xem giá, thời hạn và vùng phủ sóng", icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></> },
  { title: "Cài đặt thuận tiện", text: "Hướng dẫn theo từng gói eSIM", icon: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="m9 11 2 2 4-4M11 18h2" /></> },
  { title: "Đồng hành cùng bạn", text: "Tư vấn bằng tiếng Việt", icon: <><path d="M4 14v-3a8 8 0 0 1 16 0v6a4 4 0 0 1-4 4h-4" /><rect x="3" y="11" width="4" height="7" rx="2" /><rect x="17" y="11" width="4" height="7" rx="2" /></> },
];

export default function EsimsPage() {
  const { data, loading } = useContentData<Esim[]>("esims");
  const [params] = useSearchParams();
  const items = data ?? [];
  if (params.get("q")) return <Navigate to={esimSearchPath(params.get("q")!)} replace />;
  return <div className="esim-page">
    <section className="esim-hero" aria-labelledby="esim-heading">
      <img className="esim-hero-image" src={heroImage} alt="" fetchPriority="high" />
      <div className="esim-hero-copy"><p className="esim-eyebrow">FIRSTCLASS TRAVEL eSIM</p>
        <h1 id="esim-heading">Internet toàn cầu.<br /><em>Hành trình liền mạch.</em></h1>
        <p className="esim-hero-description">Khám phá thế giới, giữ trọn kết nối. Chọn gói eSIM du lịch phù hợp để luôn sẵn sàng cho mỗi điểm đến.</p>
        <CountrySearch />
        <p className="esim-hero-note">Không cần đổi SIM vật lý · Dễ dàng chuẩn bị trước chuyến đi</p>
      </div>
    </section>
    <div className="esim-benefits">{benefits.map(({ title, text, icon }) => <div key={title}><span className="esim-benefit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icon}</svg></span><div><h2>{title}</h2><p>{text}</p></div></div>)}</div>
    <EsimDestinations items={items} loading={loading} />
    <section className="esim-how"><div className="esim-section-heading"><p className="esim-eyebrow">NHANH CHÓNG & ĐƠN GIẢN</p><h2>Sẵn sàng trong 3 bước</h2></div><div className="esim-steps">{[["01", "Chọn gói eSIM", "Tìm theo điểm đến, dung lượng và thời hạn chuyến đi."], ["02", "Xác nhận cùng FirstClass", "Gửi yêu cầu tư vấn để xác nhận giá, thiết bị và cách nhận eSIM."], ["03", "Cài đặt & kết nối", "Làm theo hướng dẫn của gói và kích hoạt đúng thời điểm."]].map(([number, title, text]) => <div key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></div>)}</div></section>
    <section className="esim-concierge"><div><p className="esim-eyebrow">FIRSTCLASS LUÔN ĐỒNG HÀNH</p><h2>Đi xa mà vẫn gần.</h2><p>Để chúng tôi giúp bạn chọn kết nối cho hành trình tiếp theo.</p></div><Link to="/support?service=esim">Tư vấn gói eSIM <span aria-hidden="true">→</span></Link></section>
  </div>;
}
