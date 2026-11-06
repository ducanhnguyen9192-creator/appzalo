// Deploy as a Web app, execute as owner. Configure BOOKING_SHEETS_SECRET in Script Properties.
const SPREADSHEET_ID = '1rorIH0Ema2uM1DcpxBI35XDlJxx8nAF0TWrkBU2g32c';
const SHEET_ID = 0;
const HEADERS = ['Mã yêu cầu', 'Thời gian đặt (VN)', 'Họ tên', 'Số điện thoại', 'Email tài khoản', 'Loại hành trình', 'Hành trình', 'Ngày đi', 'Ngày về', 'Người lớn', 'Trẻ em', 'Em bé', 'Hạng ghế', 'Chuyến đã chọn / giá tham khảo', 'Ghi chú khách', 'Thông tin giữ chỗ', 'Kiểm tra dữ liệu', 'Trạng thái gọi', 'Thời gian gọi'];

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(value ?? '');
}

function formatMoneyInText(value) {
  return String(value ?? '').replace(/\b(\d[\d,]*)\s+VND\b/g, (_, amount) => formatMoney(amount.replace(/,/g, '')) + ' VND');
}

function compactHoldText(value) {
  const text = formatMoneyInText(value);
  const match = text.match(/^Mã đặt chỗ Vietjet: ([A-Z0-9]+)\nPay Later - chưa thanh toán\.\s*Hạn thanh toán \(VN\): ([^\n]+)(?:\nTổng tiền hãng: ([\d,]+ VND))?$/);
  if (!match) return text;
  const deadline = match[2].replace(/^(\d{2}:\d{2}:\d{2}) (\d{2}\/\d{2}\/\d{4})$/, '$2 $1');
  return [`Hạn thanh toán: ${deadline}`, `Mã: ${match[1]}`, ...(match[3] ? [`Tổng tiền: ${match[3]}`] : [])].join('\n');
}

function bookingNotes(b) {
  // Recognize only the exact generated suffix, keeping free-form customer notes intact.
  const note = String(b.note ?? '');
  const legacy = note.match(/(?:^|\n)(Mã đặt chỗ Vietjet: [A-Z0-9]+\nPay Later - chưa thanh toán\. Hạn thanh toán \(VN\): [^\n]+(?:\nTổng tiền hãng: [\d,]+ VND)?)$/);
  const hold = b.airlineHold;
  const info = hold?.status === 'held' ? [
    `Hạn thanh toán: ${Utilities.formatDate(new Date(hold.paymentDeadline), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss')}`,
    `Mã: ${hold.pnr}`,
    ...(hold.total != null ? [`Tổng tiền: ${formatMoney(hold.total)} VND`] : []),
  ].join('\n') : legacy?.[1] || '';
  return { note: legacy ? note.slice(0, legacy.index) : note, hold: compactHoldText(info) };
}

// Run once after updating the deployment; also safe to rerun for a style refresh.
function upgradeBookingSheet() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetById(SHEET_ID);
    if (!sheet) throw new Error('sheet_missing');
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    const actual = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const removed = ['Nhân viên phụ trách', 'Ghi chú xác nhận'];
    const required = HEADERS.filter(h => h !== 'Thông tin giữ chỗ');
    if (new Set(actual).size !== actual.length || required.some(h => !actual.includes(h)) || actual.some(h => !HEADERS.includes(h) && !removed.includes(h))) throw new Error('header_mismatch');
    // Keep an untouched backup before removing columns or cleaning historical rows.
    const backup = sheet.copyTo(sheet.getParent());
    backup.setName('Sao lưu ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd HHmmss') + ' ' + backup.getSheetId());
    for (let i = actual.length - 1; i >= 0; i--) {
      if (removed.includes(actual[i])) { sheet.deleteColumn(i + 1); actual.splice(i, 1); }
    }
    if (!actual.includes('Thông tin giữ chỗ')) {
      sheet.insertColumnAfter(actual.indexOf('Ghi chú khách') + 1);
      actual.splice(actual.indexOf('Ghi chú khách') + 1, 0, 'Thông tin giữ chỗ');
      sheet.getRange(1, actual.indexOf('Thông tin giữ chỗ') + 1).setValue('Thông tin giữ chỗ');
    }
    // Move columns with their values, formulas and staff-entered call times.
    HEADERS.forEach((header, index) => {
      const from = actual.indexOf(header);
      if (from !== index) {
        sheet.moveColumns(sheet.getRange(1, from + 1, sheet.getMaxRows(), 1), index + 1);
        actual.splice(from, 1); actual.splice(index, 0, header);
      }
    });
    if (sheet.getLastRow() > 1) {
      const range = sheet.getRange(2, 14, sheet.getLastRow() - 1, 3);
      const values = range.getValues(), formulas = range.getFormulas();
      values.forEach((row, i) => {
        const notes = bookingNotes({ note: row[1] });
        const existingHold = String(row[2] ?? '');
        // If an existing hold differs, retain both pieces rather than discard evidence.
        const hold = compactHoldText(existingHold || notes.hold);
        const canSeparate = !existingHold || compactHoldText(existingHold).replace(/\s+/g, ' ').trim() === notes.hold.replace(/\s+/g, ' ').trim();
        const next = [formatMoneyInText(row[0]), canSeparate ? notes.note : row[1], hold];
        next.forEach((value, j) => {
          if (!formulas[i][j] && value !== row[j]) sheet.getRange(i + 2, j + 14).setValue("'" + value);
        });
      });
    }
    styleBookingSheet(sheet);
    SpreadsheetApp.flush();
  } finally { lock.releaseLock(); }
}

function styleBookingSheet(sheet) {
  const rows = sheet.getMaxRows();
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(3);
  sheet.setHiddenGridlines(true);
  sheet.getRange(1, 1, rows, HEADERS.length).setFontFamily('Arial').setFontSize(10).setVerticalAlignment('top').setWrap(true);
  sheet.getBandings().forEach(banding => banding.remove());
  sheet.getRange(1, 1, rows, HEADERS.length).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY)
    .setHeaderRowColor('#17365d').setFirstRowColor('#ffffff').setSecondRowColor('#f3f6fa');
  sheet.getRange(1, 1, 1, HEADERS.length).setFontColor('#ffffff').setFontWeight('bold').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 48);
  [130, 155, 175, 125, 220, 120, 230, 110, 110, 75, 75, 75, 110, 350, 250, 330, 220, 155, 155].forEach((width, i) => sheet.setColumnWidth(i + 1, width));
  sheet.getRange(2, 10, rows - 1, 3).setHorizontalAlignment('center').setNumberFormat('0');
  sheet.getRange(2, 19, rows - 1, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  const statusRange = sheet.getRange(2, 18, rows - 1, 1);
  statusRange.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Chờ gọi', 'Đã gọi', 'Không liên lạc được', 'Đã xác nhận', 'Đã hủy'], true).setAllowInvalid(true).build());
  const rules = sheet.getConditionalFormatRules().filter(rule => !rule.getRanges().some(range => range.getColumn() === 18 && range.getNumColumns() === 1));
  [['Chờ gọi', '#fff3cd', '#785500'], ['Đã gọi', '#dbeafe', '#1e40af'], ['Không liên lạc được', '#fee2e2', '#991b1b'], ['Đã xác nhận', '#dcfce7', '#166534'], ['Đã hủy', '#e5e7eb', '#374151']].forEach(([status, bg, fg]) => {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(status).setBackground(bg).setFontColor(fg).setRanges([statusRange]).build());
  });
  sheet.setConditionalFormatRules(rules);
  if (!sheet.getFilter()) sheet.getRange(1, 1, rows, HEADERS.length).createFilter();
  if (sheet.getLastRow() > 1) sheet.autoResizeRows(2, sheet.getLastRow() - 1);
}

function doPost(e) {
  const reply = value => ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
  let lock;
  try {
    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('BOOKING_SHEETS_SECRET');
    if (!secret || secret.length < 32 || body.secret !== secret) return reply({ ok: false, error: 'unauthorized' });
    const b = body.booking;
    if (!b || !/^(?:[A-Z2-9]{6}|[a-f0-9-]{36})$/.test(b.id) || typeof b.fullName !== 'string' || typeof b.phone !== 'string' || !Number.isFinite(b.createdAt)) return reply({ ok: false, error: 'invalid_booking' });
    lock = LockService.getScriptLock();
    lock.waitLock(20000);
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetById(SHEET_ID);
    if (!sheet) return reply({ ok: false, error: 'sheet_missing' });
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#dbeafe');
      sheet.setFrozenRows(1);
      styleBookingSheet(sheet);
    } else {
      const actual = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
      if (HEADERS.some((h, i) => actual[i] !== h)) return reply({ ok: false, error: 'header_mismatch' });
    }
    // A retry after a timeout must not create another row or overwrite staff notes.
    if (sheet.getLastRow() > 1 && sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).createTextFinder(b.id).matchEntireCell(true).useRegularExpression(false).findNext()) return reply({ ok: true, id: b.id });
    const route = b.segments?.length ? b.segments.map(s => s.origin + ' → ' + s.destination + ' (' + s.departureDate + ')').join('\n') : b.origin + ' → ' + b.destination;
    const flights = (b.selectedFlights || []).map(f => `${f.number} | ${f.origin} → ${f.destination}\n${f.departureDate} ${f.departure}–${f.arrival}${f.arrivalNextDay ? ' (+1 ngày)' : ''} | ${f.fareName}\n${formatMoney(f.amount)} VND | tra lúc ${f.searchedAt}`).join('\n\n');
    const notes = bookingNotes(b);
    const values = [b.id, Utilities.formatDate(new Date(b.createdAt), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss'), b.fullName, b.phone, b.customerEmail, { oneway: 'Một chiều', roundtrip: 'Khứ hồi', multicity: 'Đa chặng' }[b.tripType], route, b.departureDate, b.returnDate, b.adults, b.children, b.infants, b.cabin, flights, notes.note, notes.hold, 'Hợp lệ định dạng; chưa xác minh SĐT', 'Chờ gọi', ''];
    // Escape spreadsheet formulas and retain leading zeroes in telephone numbers.
    const safe = values.map(v => typeof v === 'number' ? v : "'" + String(v ?? ''));
    const row = sheet.getLastRow() + 1;
    if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    sheet.getRange(row, 1, 1, HEADERS.length).setValues([safe]);
    sheet.autoResizeRows(row, 1);
    SpreadsheetApp.flush();
    return reply({ ok: true, id: b.id });
  } catch (_) {
    return reply({ ok: false, error: 'delivery_failed' });
  } finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
