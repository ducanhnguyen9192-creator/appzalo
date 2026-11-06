import type { AirlineHold } from '@/utils/bookings';
import { useMoney } from './currency-provider';
export default function AirlineHoldInfo({ hold }: { hold?: AirlineHold }) {
  const money = useMoney();
  if (!hold) return null;
  return <div role="status" className={`rounded-xl border p-4 space-y-2 ${hold.status === 'held' ? 'bg-green-50 border-green-200' : 'bg-gold-50 border-gold-200'}`}>
    <p className="font-semibold">{hold.status === 'held' ? 'Giữ chỗ Vietjet thành công' : ['processing', 'submitting'].includes(hold.status) ? 'Đang giữ chỗ trên Vietjet…' : 'Chưa xác nhận giữ chỗ'}</p>
    {hold.pnr && <p>Mã đặt chỗ: <strong className="text-2xl text-red-600">{hold.pnr}</strong></p>}
    {hold.total && <p>Tổng tiền hãng: <strong>{hold.total.toLocaleString('vi-VN')} {hold.currency ?? 'VND'}</strong></p>}
    {hold.total != null && (!hold.currency || hold.currency === 'VND') && money(hold.total).startsWith('$') && <p>Quy đổi tham khảo: {money(hold.total)}</p>}
    {hold.paymentDeadline && <p>Thanh toán trước: <strong>{new Date(hold.paymentDeadline).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</strong> (giờ Việt Nam)</p>}
    <p className="text-sm">{hold.message}</p>
    {hold.status === 'held' && <p className="text-sm">Pay Later · Chưa thanh toán, chưa xuất vé. Chỗ có thể bị hủy khi hết hạn thanh toán.</p>}
  </div>;
}
