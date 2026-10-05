import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AccountPanel from "@/components/account-panel";
import { Account, authRequest } from "@/utils/auth";
import { Booking, BookingApiError, bookingApi } from "@/utils/bookings";
import toast from "react-hot-toast";
import AIRPORTS from "@/mock/airports.json";

export default function FlightSearchPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [lastBooking, setLastBooking] = useState<Booking | null>(null);
  const sending = useRef(false);
  const requestIdentity = useRef<{ payload: string; key: string } | null>(null);
  async function loadAccount() {
    setAuthLoading(true); setAuthError("");
    try { setAccount(await authRequest("me")); } catch (e) { setAuthError(e instanceof Error ? e.message : "Không kiểm tra được tài khoản."); } finally { setAuthLoading(false); }
  }
  useEffect(() => { loadAccount(); }, []);
  useEffect(() => { setLastBooking(null); }, [account?.id]);
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAirportField, setActiveAirportField] = useState<
    "origin" | "destination" | null
  >(null);

  const [form, setForm] = useState({
    origin: "",
    destination: "",
    departureDate: "",
    returnDate: "",
    adults: 1,
    children: 0,
    infants: 0,
    cabin: "Phổ thông",
    fullName: "",
    phone: "",
    note: "",
  });

  const updateField = (field: string, value: string | number) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      origin: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      adults: 1,
      children: 0,
      infants: 0,
      cabin: "Phổ thông",
      fullName: "",
      phone: "",
      note: "",
    });

    setActiveAirportField(null);
  };

  const normalizeText = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const getAirportSuggestions = (value: string) => {
    const keyword = normalizeText(value.trim());

    if (!keyword) return [];

    // Nếu nhập đúng 3 ký tự, coi là mã IATA và chỉ khớp chính xác mã.
    if (/^[a-z0-9]{3}$/.test(keyword)) {
      return AIRPORTS.filter(
        (item) => normalizeText(item.code) === keyword
      ).slice(0, 8);
    }

    // Nếu nhập tên thành phố hoặc tên sân bay thì tìm gần đúng.
    return AIRPORTS.filter((item) => {
      const city = normalizeText(item.city || "");
      const airport = normalizeText(item.airport || "");

      return (
        city.includes(keyword) ||
        airport.includes(keyword)
      );
    }).slice(0, 8);
  };

  const selectAirport = (
    field: "origin" | "destination",
    airport: { city: string; code: string; airport: string }
  ) => {
    updateField(field, `${airport.city} (${airport.code})`);
    setActiveAirportField(null);
  };

  const submitRequest = async () => {
    if (sending.current || authLoading) return;
    if (!account) { toast.error("Vui lòng đăng nhập ở phía trên để lưu và theo dõi yêu cầu."); return; }

    if (!form.origin.trim()) {
      toast.error("Vui lòng nhập điểm đi");
      return;
    }

    if (!form.destination.trim()) {
      toast.error("Vui lòng nhập điểm đến");
      return;
    }

    if (!form.departureDate) {
      toast.error("Vui lòng chọn ngày đi");
      return;
    }

    if (tripType === "roundtrip" && !form.returnDate) {
      toast.error("Vui lòng chọn ngày về");
      return;
    }

    if (
      tripType === "roundtrip" &&
      form.returnDate &&
      form.returnDate < form.departureDate
    ) {
      toast.error("Ngày về phải sau hoặc bằng ngày đi");
      return;
    }

    if (!form.fullName.trim()) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }

    if (!form.phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }

    if (form.adults < 1) {
      toast.error("Số người lớn phải từ 1 trở lên");
      return;
    }

    const payload = { ...form, tripType, returnDate: tripType === "oneway" ? "" : form.returnDate };
    const serialized = JSON.stringify({ ...payload, accountId: account.id });
    if (requestIdentity.current?.payload !== serialized) {
      const bytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      requestIdentity.current = { payload: serialized, key: `${bytes.slice(0,8)}-${bytes.slice(8,12)}-${bytes.slice(12,16)}-${bytes.slice(16,20)}-${bytes.slice(20)}` };
    }

    try {
      setIsSubmitting(true);
      sending.current = true;
      const result = await bookingApi<{ booking: Booking }>("bookings", { ...payload, requestKey: requestIdentity.current.key });
      setLastBooking(result.booking);
      requestIdentity.current = null;
      toast.success("Đã gửi yêu cầu đặt vé thành công");
      resetForm();
    } catch (error) {
      if (error instanceof BookingApiError && error.status === 401) setAccount(null);
      toast.error(error instanceof Error ? error.message : "Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
      sending.current = false;
    }
  };

  const originSuggestions = getAirportSuggestions(form.origin);
  const destinationSuggestions = getAirportSuggestions(form.destination);

  return (
    <div className="flight-page p-4 pb-8 space-y-4">
      <AccountPanel account={account} loading={authLoading} error={authError} onRetry={loadAccount} onChange={setAccount} />
      <Link to="/history" className="inline-block text-sm text-blue-600">Xem lịch sử giao dịch & yêu cầu đặt vé →</Link>
      {lastBooking && <div role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 break-words"><p className="font-medium text-green-800">Đã tiếp nhận yêu cầu đặt vé</p><p className="text-sm mt-1">Mã yêu cầu: {lastBooking.id}</p><Link to="/history" className="inline-block mt-2 text-sm text-blue-600">Theo dõi yêu cầu trong lịch sử →</Link></div>}
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="mb-5">
          <h1 className="text-xl font-semibold">Yêu cầu đặt vé máy bay</h1>
          <p className="text-sm text-gray-500 mt-1">
            Firstclass Travel sẽ kiểm tra hành trình và gửi phương án vé phù hợp
            cho bạn.
          </p>
        </div>

        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setTripType("roundtrip")}
            disabled={isSubmitting}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${
              tripType === "roundtrip"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Khứ hồi
          </button>

          <button
            type="button"
            onClick={() => {
              setTripType("oneway");
              updateField("returnDate", "");
            }}
            disabled={isSubmitting}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${
              tripType === "oneway"
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            Một chiều
          </button>
        </div>

        <div className="flight-fields space-y-4">
          <div className="relative z-30">
            <label className="text-sm font-medium">Điểm đi</label>

            <input
              value={form.origin}
              onFocus={() => setActiveAirportField("origin")}
              onChange={(e) => {
                updateField("origin", e.target.value);
                setActiveAirportField("origin");
              }}
              placeholder="Ví dụ: HAN hoặc Hà Nội"
              disabled={isSubmitting}
              autoComplete="off"
              className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary disabled:bg-gray-50"
            />

            {activeAirportField === "origin" &&
              form.origin.trim() &&
              originSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {originSuggestions.map((airport) => (
                    <button
                      key={airport.code}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectAirport("origin", airport)}
                      className="w-full px-4 py-3 text-left border-b last:border-b-0 hover:bg-gray-50 active:bg-gray-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {airport.city} ({airport.code})
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            {airport.airport}
                          </div>
                        </div>

                        <div className="font-semibold text-gray-400">
                          {airport.code}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>

          <div className="relative z-20">
            <label className="text-sm font-medium">Điểm đến</label>

            <input
              value={form.destination}
              onFocus={() => setActiveAirportField("destination")}
              onChange={(e) => {
                updateField("destination", e.target.value);
                setActiveAirportField("destination");
              }}
              placeholder="Ví dụ: SGN hoặc Hồ Chí Minh"
              disabled={isSubmitting}
              autoComplete="off"
              className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary disabled:bg-gray-50"
            />

            {activeAirportField === "destination" &&
              form.destination.trim() &&
              destinationSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {destinationSuggestions.map((airport) => (
                    <button
                      key={airport.code}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectAirport("destination", airport)}
                      className="w-full px-4 py-3 text-left border-b last:border-b-0 hover:bg-gray-50 active:bg-gray-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {airport.city} ({airport.code})
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            {airport.airport}
                          </div>
                        </div>

                        <div className="font-semibold text-gray-400">
                          {airport.code}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Ngày đi</label>

              <input
                type="date"
                value={form.departureDate}
                onChange={(e) => updateField("departureDate", e.target.value)}
                disabled={isSubmitting}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary disabled:bg-gray-50"
              />
            </div>

            {tripType === "roundtrip" && (
              <div>
                <label className="text-sm font-medium">Ngày về</label>

                <input
                  type="date"
                  value={form.returnDate}
                  min={form.departureDate || undefined}
                  onChange={(e) => updateField("returnDate", e.target.value)}
                  disabled={isSubmitting}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary disabled:bg-gray-50"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Hành khách</label>

            <div className="grid grid-cols-3 gap-2 mt-1">
              <div>
                <span className="text-xs text-gray-500">Người lớn</span>

                <input
                  type="number"
                  min={1}
                  value={form.adults}
                  onChange={(e) =>
                    updateField("adults", Number(e.target.value))
                  }
                  disabled={isSubmitting}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 disabled:bg-gray-50"
                />
              </div>

              <div>
                <span className="text-xs text-gray-500">Trẻ em</span>

                <input
                  type="number"
                  min={0}
                  value={form.children}
                  onChange={(e) =>
                    updateField("children", Number(e.target.value))
                  }
                  disabled={isSubmitting}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 disabled:bg-gray-50"
                />
              </div>

              <div>
                <span className="text-xs text-gray-500">Em bé</span>

                <input
                  type="number"
                  min={0}
                  value={form.infants}
                  onChange={(e) =>
                    updateField("infants", Number(e.target.value))
                  }
                  disabled={isSubmitting}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Hạng ghế</label>

            <select
              value={form.cabin}
              onChange={(e) => updateField("cabin", e.target.value)}
              disabled={isSubmitting}
              className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 bg-white disabled:bg-gray-50"
            >
              <option>Phổ thông</option>
              <option>Phổ thông đặc biệt</option>
              <option>Thương gia</option>
              <option>Hạng nhất</option>
            </select>
          </div>

          <div className="flight-contact border-t pt-4">
            <div className="font-semibold mb-3">Thông tin liên hệ</div>

            <div className="flight-contact-fields space-y-3">
              <div>
                <label className="text-sm font-medium">Họ và tên</label>

                <input
                  value={form.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="Nhập họ và tên"
                  disabled={isSubmitting}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Số điện thoại / Zalo
                </label>

                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="Ví dụ: 09xxxxxxxx"
                  disabled={isSubmitting}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Ghi chú</label>

                <textarea
                  rows={3}
                  value={form.note}
                  onChange={(e) => updateField("note", e.target.value)}
                  placeholder="Ví dụ: Ưu tiên chuyến sáng, cần hành lý 23kg..."
                  disabled={isSubmitting}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-primary resize-none disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={submitRequest}
            disabled={isSubmitting}
            className={`flight-submit w-full font-semibold rounded-xl py-3.5 active:scale-[0.99] ${
              isSubmitting
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary text-white"
            }`}
          >
            {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu đặt vé"}
          </button>

          <p className="flight-note text-xs text-gray-500 text-center">
            Nhân viên Firstclass Travel sẽ kiểm tra giá và liên hệ lại với bạn.
          </p>
        </div>
      </div>
    </div>
  );
}
