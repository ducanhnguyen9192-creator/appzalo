import type { SelectedFlight } from "@/utils/flight-selection";
import { vietjetFareLabel } from "@/utils/flight-selection";
import { formatMoney, formatFlightDate } from "@/utils/bookings";

export default function SelectedFlightInfo({ flights, onClear, disabled = false, compact = false }: { flights: SelectedFlight[]; onClear?: () => void; disabled?: boolean; compact?: boolean }) {
  if (!flights.length) return null;
  return <section aria-label="Chuyến bay đã chọn" className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-3 text-sm">
    <h3 className="font-semibold">Chuyến bay đã chọn cho yêu cầu</h3>
    {flights.map(flight => <div key={flight.leg}>
      <p className="font-medium">{flight.leg === "outbound" ? "Chiều đi" : "Chiều về"}: {flight.origin} → {flight.destination} · {formatFlightDate(flight.departureDate)}</p>
      <p>{flight.number} · {flight.aircraft} · {flight.departure} → {flight.arrival}{flight.arrivalNextDay ? " (+1 ngày)" : ""}</p>
      <p>{vietjetFareLabel(flight.fareName)} · {formatMoney(flight.amount)}</p>
      {!compact && <p className="text-xs text-gray-500">Giá tra lúc {new Date(flight.searchedAt).toLocaleString("vi-VN")}</p>}
    </div>)}
    <p className="font-semibold">{compact ? "Tổng giá hiển thị" : "Tổng giá tại bảng của các chuyến đã chọn"}: {formatMoney(flights.reduce((sum, flight) => sum + flight.amount, 0))}</p>
    <p className="text-xs text-gray-600">{compact ? "Giá tham khảo, chưa xác nhận tổng thanh toán cho toàn bộ hành khách. Chưa giữ chỗ với hãng." : "Giá tại bảng tìm kiếm, chưa phải tổng thanh toán cho toàn bộ hành khách; chưa xác nhận tổng thuế, phí hoặc tình trạng chỗ. Yêu cầu được lưu nội bộ trong app; chưa giữ chỗ, đặt vé hoặc thanh toán với hãng."}</p>
    {onClear && <button type="button" disabled={disabled} onClick={onClear} className="text-blue-700 underline py-2">Bỏ các chuyến đã chọn</button>}
  </section>;
}
