import { Booking, BOOKING_STATUS, formatDateTime, formatFlightDate } from "@/utils/bookings";

export default function BookingInfo({ booking }: { booking: Booking }) {
  return <div className="space-y-3 break-words">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{booking.origin} → {booking.destination}</h3><span className="text-sm rounded-lg bg-blue-50 text-blue-700 px-3 py-1">{BOOKING_STATUS[booking.status]}</span></div>
    <p className="text-xs text-gray-500">Mã yêu cầu: {booking.id}</p>
    <dl className="grid sm:grid-cols-2 gap-3 text-sm">
      {[["Hành trình", `${booking.tripType === "roundtrip" ? "Khứ hồi" : "Một chiều"} · ${booking.cabin}`], ["Ngày bay", `${formatFlightDate(booking.departureDate)}${booking.returnDate ? ` → ${formatFlightDate(booking.returnDate)}` : ""}`], ["Hành khách", `${booking.adults} người lớn · ${booking.children} trẻ em · ${booking.infants} em bé`], ["Liên hệ", `${booking.fullName} · ${booking.phone}`], ["Gửi lúc", formatDateTime(booking.createdAt)], ["Cập nhật", formatDateTime(booking.updatedAt)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-gray-500">{label}</dt><dd className="mt-1">{value}</dd></div>)}
    </dl>
    {booking.note && <div className="text-sm"><p className="text-gray-500">Ghi chú của bạn</p><p className="whitespace-pre-wrap mt-1">{booking.note}</p></div>}
    {booking.response && <div className="bg-blue-50 rounded-xl p-3 text-sm"><p className="font-medium text-blue-700">Phản hồi từ FirstClass</p><p className="whitespace-pre-wrap mt-1">{booking.response}</p></div>}
  </div>;
}
