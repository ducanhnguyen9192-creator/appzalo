import { AGENCY_URL, startAgencyBrowser, currentAgencySession, withAgencySession, ensureAgencyLogin, chooseAgencyDate, chooseAgencyAirport, chooseAgencyPassengers, readAgencyRows } from './vietjet-agency.mjs';
import { parseHoldConfirmation } from './airline-hold.mjs';

const stop = message => { throw Object.assign(new Error(message), { publicMessage: message }); };
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function holdAgency(booking, beforeSubmit, providedSession) {
  return withAgencySession(async () => {
    if (booking.airlineTermsAccepted !== true) stop('Chưa xác nhận điều kiện vận chuyển Vietjet.');
    const session = providedSession || currentAgencySession() || await startAgencyBrowser();
    const { page } = session;
    // Every operation is bounded by Playwright timeouts; no detached timeout race
    // may leave a click running after the job has been reported as failed.
    let stage = 'mở hành trình';
    try {
    const next = () => page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
    await page.goto(AGENCY_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ensureAgencyLogin(session);
    await page.getByText(booking.tripType === 'roundtrip' ? 'Khứ hồi' : 'Một chiều', { exact: true }).click();
    const first = booking.selectedFlights[0];
    await chooseAgencyAirport(page, 'Điểm khởi hành', first.origin);
    await chooseAgencyAirport(page, 'Điểm đến', first.destination);
    await chooseAgencyDate(page, booking.departureDate);
    if (booking.tripType === 'roundtrip') await chooseAgencyDate(page, booking.returnDate, 'Ngày về');
    await chooseAgencyPassengers(page, booking);
    await page.getByRole('button', { name: 'Tìm chuyến bay', exact: true }).click();
    stage = 'chọn chuyến';
    for (const flight of booking.selectedFlights) {
      await page.getByText(new RegExp(`Chuyến ${flight.leg === 'inbound' ? 'về' : 'đi'}\\s*\\(${flight.origin}-${flight.destination}\\)`)).waitFor({ timeout: 35000 });
      const row = page.locator('.list_card').filter({ has: page.locator('.fare-information_flight').filter({ hasText: new RegExp(`^\\s*${escape(flight.number)}\\s*-`) }) }).filter({ has: page.locator('.fare-information_time').filter({ hasText: `${flight.departure} - ${flight.arrival}` }) });
      await row.waitFor({ timeout: 35000 });
      const live = (await page.evaluate(readAgencyRows)).find(item => item.number === flight.number && item.departure === flight.departure);
      if (!live || live.departure !== flight.departure || live.arrival !== flight.arrival || live.fares.find(f => f.name === flight.fareName)?.amount !== flight.amount) stop('Giá hoặc giờ bay đã thay đổi. Vui lòng tìm và chọn lại chuyến.');
      const index = ['SkyBoss Premium', 'SkyBoss', 'Deluxe', 'Eco'].indexOf(flight.fareName);
      await row.locator('.fare-col').nth(index).locator('.card_money').click();
      await row.getByRole('radio', { name: 'Đã chọn', exact: true }).waitFor();
      await page.getByRole('progressbar').waitFor({ state: 'hidden', timeout: 35000 });
      if (booking.tripType === 'roundtrip' && flight.leg === 'outbound') await next();
    }
    await next();
    stage = 'nhập hành khách';
    for (const [index, person] of booking.passengers.entries()) {
      const label = person.type === 'adult' ? 'Người lớn' : person.type === 'child' ? 'Trẻ em' : 'Em bé';
      const ordinal = booking.passengers.slice(0, index + 1).filter(p => p.type === person.type).length;
      const name = new RegExp(`${label} ${ordinal}(?:\\s|$)`);
      const panel = page.getByRole('region', { name });
      if (!(await panel.isVisible())) await page.getByRole('button', { name }).click();
      await panel.getByRole('textbox', { name: 'Họ', exact: true }).fill(person.lastName);
      await panel.getByRole('textbox', { name: 'Tên đệm và tên', exact: true }).fill(person.firstName);
      const birth = panel.getByRole('textbox', { name: 'Ngày sinh (DD/MM/YYYY)', exact: true });
      // This field has a dd/mm/yyyy input mask: ISO input is truncated by the mask.
      await birth.fill('');
      await birth.pressSequentially(person.dateOfBirth.split('-').reverse().join(''));
      await birth.press('Tab');
      const displayedBirth = (await birth.inputValue()).trim();
      if (displayedBirth !== person.dateOfBirth.split('-').reverse().join('/')) stop(`Vietjet chưa nhận đúng ngày sinh (ô hãng: ${displayedBirth || 'trống'}). Đã dừng trước khi gửi.`);
    stage = 'danh xưng';
      await panel.getByRole('combobox', { name: /^(Ông|Bà|Cô)$/ }).click();
      await page.getByRole('option', { name: person.title, exact: true }).click();
    stage = 'giấy tờ';
      await panel.getByRole('textbox', { name: 'CCCD / Passport', exact: true }).fill(person.documentNumber);
      if (index === 0) {
        await panel.getByRole('textbox', { name: 'Địa chỉ email', exact: true }).fill(booking.contactEmail);
        await panel.getByRole('textbox', { name: 'Số điện thoại', exact: true }).first().fill(booking.phone.replace(/[\s().-]/g, '').replace(/^\+?84/, '').replace(/^0/, ''));
    stage = 'quốc gia';
        await panel.getByRole('combobox', { name: /^Quốc gia/ }).click();
        await page.getByRole('option', { name: person.country, exact: true }).click();
    stage = 'thành phố';
        if (person.city) {
          await panel.getByRole('combobox', { name: /^Thành phố\/Tỉnh/ }).click();
          await page.getByRole('option', { name: person.city, exact: true }).click();
        }
    stage = 'địa chỉ';
        if (person.address) await panel.getByRole('textbox', { name: 'Địa chỉ', exact: true }).fill(person.address);
    stage = 'điện thoại bổ sung';
        if (person.secondaryPhone) await panel.getByRole('textbox', { name: 'Số điện thoại', exact: true }).nth(1).fill(person.secondaryPhone);
      }
    }
    await next();
    stage = 'dịch vụ';
    await page.getByText('Đừng quên mua hành lý, chỗ ngồi, suất ăn và hơn thế nữa...', { exact: true }).waitFor();
    await page.getByRole('progressbar').waitFor({ state: 'hidden', timeout: 35000 });
    await next();
    stage = 'Pay Later';
    const payments = page.getByRole('region', { name: 'Phương thức thanh toán', exact: true });
    const payLater = payments.locator('mat-card.payment_method').filter({ hasText: /^\s*Paylater\s*$/i });
    await payLater.waitFor({ timeout: 20000 });
    await payLater.click();
    if (!(await payLater.getAttribute('class'))?.split(/\s+/).includes('method_active') || new URL(page.url()).origin !== new URL(AGENCY_URL).origin) stop('Không xác nhận được phương thức Pay Later. Đã dừng giữ chỗ.');
    await next();
    stage = 'xem lại thông tin';
    const review = page.getByRole('dialog');
    await review.waitFor();
    await page.getByRole('progressbar').waitFor({ state: 'hidden', timeout: 35000 });
    const flights = await review.getByRole('region', { name: 'Thông tin chuyến bay', exact: true }).innerText();
    for (const flight of booking.selectedFlights) {
      if (![flight.number, flight.origin, flight.destination, flight.departure, flight.departureDate.split('-').reverse().join('/')].every(value => flights.includes(value))) stop('Thông tin chuyến trong bước xác nhận không khớp lựa chọn.');
    }
    const passengerSummary = await review.getByRole('region', { name: 'Thông tin hành khách', exact: true }).innerText();
    if (!booking.passengers.every(p => passengerSummary.includes(`${p.lastName} ${p.firstName}`))) stop('Thông tin khách trong bước xác nhận không khớp.');
    const fareText = await review.getByRole('region', { name: 'Chi tiết giá vé', exact: true }).innerText();
    const total = Number(fareText.match(/Tổng tiền:\s*([\d,.]+)\s*VND/)?.[1]?.replace(/\D/g, ''));
    if (!Number.isSafeInteger(total) || total <= 0) stop('Vietjet chưa trả tổng tiền hợp lệ.');
    stage = 'đồng ý điều khoản';
    const terms = review.getByRole('checkbox', { name: /Tôi đã đọc, hiểu và đồng ý/ });
    if (!(await terms.isChecked())) await review.getByText(/Tôi đã đọc, hiểu và đồng ý/).click();
    if (!(await terms.isChecked())) stop('Chưa đánh dấu được điều khoản trên Vietjet. Đã dừng trước khi gửi.');
    const submit = review.getByRole('button', { name: 'Tiếp tục', exact: true });
    stage = 'gửi giữ chỗ';
    beforeSubmit();
    await submit.click();
    await page.getByText('ĐẶT VÉ THÀNH CÔNG', { exact: false }).waitFor({ timeout: 45000 });
    return { ...parseHoldConfirmation(await page.locator('body').innerText()), total, currency: 'VND' };
    } catch (error) {
      if (!error.publicMessage) error.publicMessage = `Vietjet dừng tại bước ${stage}. Chưa xác nhận mã đặt chỗ.`;
      console.warn(`Vietjet hold stage: ${stage}; ${error.name}`);
      throw error;
    }
  });
}
