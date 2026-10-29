// Deploy as a Web app, execute as owner. Configure BOOKING_SHEETS_SECRET in Script Properties.
const SPREADSHEET_ID = '1rorIH0Ema2uM1DcpxBI35XDlJxx8nAF0TWrkBU2g32c';
const SHEET_ID = 0;
const HEADERS = ['Mã yêu cầu', 'Thời gian đặt (VN)', 'Họ tên', 'Số điện thoại', 'Email tài khoản', 'Loại hành trình', 'Hành trình', 'Ngày đi', 'Ngày về', 'Người lớn', 'Trẻ em', 'Em bé', 'Hạng ghế', 'Chuyến đã chọn / giá tham khảo', 'Ghi chú khách', 'Kiểm tra dữ liệu', 'Trạng thái gọi', 'Nhân viên phụ trách', 'Thời gian gọi', 'Ghi chú xác nhận'];

function doPost(e) {
  const reply = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
  let lock;
  try {
    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('BOOKING_SHEETS_SECRET');
    if (!secret || secret.length < 32 || body.secret !== secret) return reply({ ok: false, error: 'unauthorized' });
    const b = body.booking;
    if (!b || !/^[a-f0-9-]{36}$/.test(b.id) || typeof b.fullName !== 'string' || typeof b.phone !== 'string' || !Number.isFinite(b.createdAt)) return reply({ ok: false, error: 'invalid_booking' });
    lock = LockService.getScriptLock();
    lock.waitLock(20000);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetById(SHEET_ID);
    if (!sheet) return reply({ ok: false, error: 'sheet_missing' });
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#dbeafe');
      sheet.setFrozenRows(1);
    } else {
      const actual = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
      if (HEADERS.some((h, i) => actual[i] !== h)) return reply({ ok: false, error: 'header_mismatch' });
    }
    // A retry after a timeout must not create another row or overwrite staff notes.
    if (sheet.getLastRow() > 1 && sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(b.id).matchEntireCell(true).useRegularExpression(false).findNext()) return reply({ ok: true, id: b.id });
    const route = b.segments?.length ? b.segments.map(s => s.origin + ' → ' + s.destination + ' (' + s.departureDate + ')').join('\n') : b.origin + ' → ' + b.destination;
    const flights = (b.selectedFlights || []).map(f => `${f.number} | ${f.origin} → ${f.destination} | ${f.departureDate} ${f.departure}–${f.arrival}${f.arrivalNextDay ? ' (+1 ngày)' : ''} | ${f.fareName} | ${f.amount} VND | tra lúc ${f.searchedAt}`).join('\n');
    const values = [b.id, Utilities.formatDate(new Date(b.createdAt), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'), b.fullName, b.phone, b.customerEmail, { oneway: 'Một chiều', roundtrip: 'Khứ hồi', multicity: 'Đa chặng' }[b.tripType], route, b.departureDate, b.returnDate, b.adults, b.children, b.infants, b.cabin, flights, b.note, 'Hợp lệ định dạng; chưa xác minh SĐT', 'Chờ gọi', '', '', ''];
    // Escape spreadsheet formulas and retain leading zeroes in telephone numbers.
    const safe = values.map(v => typeof v === 'number' ? v : "'" + String(v ?? ''));
    const row = sheet.getLastRow() + 1;
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    sheet.getRange(row, 1, 1, HEADERS.length).setValues([safe]);
    SpreadsheetApp.flush();
    return reply({ ok: true, id: b.id });
  } catch (_) {
    return reply({ ok: false, error: 'delivery_failed' });
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
