import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const disclaimer = "Nội dung mẫu để minh họa giao diện, chưa phải dịch vụ đã xác nhận mở bán. Ảnh dùng để minh họa. Liên hệ FirstClass để được tư vấn lịch, giá và điều kiện thực tế.";
const tourBase = {
  departure: "Liên hệ để xác nhận lịch thực tế", price: null, summary: disclaimer,
  included: "Gợi ý: lưu trú, di chuyển và tham quan theo hành trình. Danh sách dịch vụ thực tế cần được FirstClass xác nhận trong báo giá.",
  excluded: "Các chi phí, điều kiện đổi/hủy và dịch vụ bổ sung sẽ được xác nhận khi tư vấn. Nội dung mẫu chưa tạo đặt chỗ.",
};
const esimBase = {
  price: null, image: "/images/news/news-2.jpg", summary: disclaimer,
  network: "Nhà cung cấp, nhà mạng và tốc độ chưa được xác nhận.",
  activation: "Gói mẫu chưa có mã kích hoạt. Thời điểm kích hoạt và cách tính ngày cần được nhà cung cấp xác nhận.",
  instructions: "Kiểm tra thiết bị hỗ trợ eSIM và không bị khóa mạng. Liên hệ FirstClass để chọn gói thực tế; chỉ cài đặt theo hướng dẫn được gửi cùng mã kích hoạt sau khi mua.",
  notes: "Dung lượng, thời hạn và phạm vi bên trên là cấu hình minh họa. Chưa xác nhận hỗ trợ chia sẻ Wi-Fi, gọi điện/SMS, gia hạn hoặc chính sách hoàn tiền.",
};
const samples = {
  tours: [
    { ...tourBase, name: "Tour mẫu · Đà Nẵng – Hội An", kind: "domestic", destination: "Đà Nẵng, Hội An", duration: "3 ngày 2 đêm", image: "/images/news/news-4.jpg", itinerary: "Lịch trình minh họa:\nNgày 1: Đến Đà Nẵng, nhận phòng và tự do khám phá.\nNgày 2: Tham quan Hội An, trải nghiệm ẩm thực địa phương.\nNgày 3: Nghỉ ngơi và kết thúc hành trình.\nĐiểm tham quan và lịch cụ thể cần được xác nhận khi tư vấn." },
    { ...tourBase, name: "Tour mẫu · Đà Lạt nghỉ dưỡng", kind: "domestic", destination: "Đà Lạt", duration: "3 ngày 2 đêm", image: "/images/news/news-5.jpg", itinerary: "Lịch trình minh họa:\nNgày 1: Đến Đà Lạt, nhận phòng và dạo trung tâm.\nNgày 2: Khám phá cảnh quan, quán cà phê và ẩm thực địa phương.\nNgày 3: Mua sắm, nghỉ ngơi và kết thúc hành trình.\nLưu trú và dịch vụ vận chuyển sẽ được tư vấn riêng." },
    { ...tourBase, name: "Tour mẫu · Khám phá Dubai", kind: "international", destination: "Dubai, UAE", duration: "5 ngày 4 đêm", image: "/images/news/news-3.jpg", itinerary: "Lịch trình minh họa:\nNgày 1: Di chuyển và nhận phòng.\nNgày 2–3: Khám phá cảnh quan đô thị, khu phố và trải nghiệm địa phương.\nNgày 4: Thời gian tự do hoặc hoạt động theo nhu cầu.\nNgày 5: Kết thúc hành trình.\nVé máy bay, giấy tờ nhập cảnh và các hoạt động cần được xác nhận trước khi đặt." },
    { ...tourBase, name: "Combo mẫu · Phú Quốc thư giãn", kind: "combo", destination: "Phú Quốc", duration: "4 ngày 3 đêm", image: "/images/news/news-1.jpg", itinerary: "Combo minh họa gồm nhu cầu vé máy bay khứ hồi và 3 đêm lưu trú.\nNgày 1: Đến Phú Quốc, nhận phòng.\nNgày 2–3: Tự do nghỉ dưỡng và khám phá đảo.\nNgày 4: Trả phòng, kết thúc hành trình.\nChưa xác nhận hãng bay, khách sạn, hành lý hoặc dịch vụ đưa đón; cần báo giá thực tế." },
  ],
  esims: [
    { ...esimBase, name: "eSIM mẫu · Nhật Bản 5 GB", coverage: "Nhật Bản (minh họa)", allowance: "5 GB (minh họa)", validity: "7 ngày (minh họa)" },
    { ...esimBase, name: "eSIM mẫu · Hàn Quốc 10 GB", coverage: "Hàn Quốc (minh họa)", allowance: "10 GB (minh họa)", validity: "10 ngày (minh họa)" },
    { ...esimBase, name: "eSIM mẫu · Thái Lan 5 GB", coverage: "Thái Lan (minh họa)", allowance: "5 GB (minh họa)", validity: "7 ngày (minh họa)" },
    { ...esimBase, name: "eSIM mẫu · Singapore 3 GB", coverage: "Singapore (minh họa)", allowance: "3 GB (minh họa)", validity: "5 ngày (minh họa)" },
  ],
};

// A saved marker prevents recreating samples after an admin edits or hides them.
export function seedSampleCatalog(db) {
  const key = "sample_catalog_seeded_v1";
  db.exec("BEGIN IMMEDIATE");
  try {
    if (db.prepare("SELECT value FROM settings WHERE key = ?").get(key)) { db.exec("COMMIT"); return { addedTours: 0, addedEsims: 0 }; }
    const ids = {};
    for (const table of ["tours", "esims"]) {
      ids[table] = samples[table].map((item) => Number(db.prepare(`INSERT INTO ${table} (data, published) VALUES (?, 1)`).run(JSON.stringify(item)).lastInsertRowid));
    }
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(key, JSON.stringify(ids));
    db.exec("COMMIT");
    return { addedTours: ids.tours.length, addedEsims: ids.esims.length };
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const databasePath = process.env.DB_PATH ?? fileURLToPath(new URL("./data/firstclass.sqlite", import.meta.url));
  const db = new DatabaseSync(databasePath, { timeout: 5000 });
  try { console.log(JSON.stringify(seedSampleCatalog(db))); } finally { db.close(); }
}
