export type Esim = { id?: number; name: string; coverage: string; allowance: string; validity: string; network: string; activation: string; price: number | null; image: string; summary: string; instructions: string; notes: string; published: boolean };
export const esimTextFields = [
  ["name", "Tên gói eSIM", 200, true],
  ["coverage", "Quốc gia / vùng phủ sóng", 1000, true],
  ["allowance", "Dung lượng dữ liệu", 200, true],
  ["validity", "Thời hạn sử dụng", 100, true],
  ["network", "Nhà mạng / tốc độ", 300, false],
  ["activation", "Điều kiện kích hoạt", 1000, false],
] as const;
export const initialEsim = (): Esim => ({ name: "", coverage: "", allowance: "", validity: "", network: "", activation: "", price: null, image: "/images/news/news-4.jpg", summary: "", instructions: "", notes: "", published: false });
