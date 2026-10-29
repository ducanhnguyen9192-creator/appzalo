// Shared validation: never infer a passenger's identity from the contact name.
export function airlinePassengerError(booking) {
  if (![booking.adults, booking.children, booking.infants].every(n => Number.isInteger(n) && n >= 0 && n <= 10)) return 'Số hành khách không hợp lệ.';
  const people = booking.passengers;
  const types = [...Array(booking.adults).fill('adult'), ...Array(booking.children).fill('child'), ...Array(booking.infants).fill('infant')];
  if (!Array.isArray(people) || people.length !== types.length) return 'Nhập thông tin cho từng hành khách.';
  if (!/^(?:0\d{9,10}|\+?84\d{9,10}|1[89]00\d{4,6})$/.test((booking.phone ?? '').replace(/[\s().-]/g, ''))) return 'Giữ chỗ tự động hiện dùng số liên hệ Việt Nam (+84). Nhập số bắt đầu bằng 0, +84 hoặc số tổng đài 1800/1900.';
  if (booking.airlineTermsAccepted !== true) return 'Cần đồng ý điều kiện vé và điều lệ vận chuyển Vietjet trước khi tự động giữ chỗ.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.contactEmail ?? '') || booking.contactEmail.length > 254) return 'Nhập email nhận hành trình hợp lệ.';
  for (const [index, person] of people.entries()) {
    const error = message => `Hành khách ${index + 1}: ${message}`;
    if (!person || person.type !== types[index]) return error('loại hành khách không khớp.');
    if (!['Ông', 'Bà', 'Cô'].includes(person.title)) return error('chọn danh xưng.');
    if (![person.lastName, person.firstName].every(value => typeof value === 'string' && /^[A-Z]+(?:[ '-][A-Z]+)*$/.test(value) && value.length <= 60)) return error('nhập họ và tên bằng chữ in hoa không dấu, đúng giấy tờ.');
    if (typeof person.documentNumber !== 'string' || !/^[A-Z0-9]{6,20}$/.test(person.documentNumber)) return error('nhập CCCD/hộ chiếu hợp lệ.');
    if (typeof person.country !== 'string' || !person.country.trim() || person.country.length > 80) return error('nhập quốc gia theo tên trên Vietjet (ví dụ Vietnam).');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(person.dateOfBirth ?? '')) return error('nhập ngày sinh.');
    const birth = new Date(`${person.dateOfBirth}T00:00:00Z`);
    if (!Number.isFinite(+birth) || birth.toISOString().slice(0, 10) !== person.dateOfBirth) return error('ngày sinh không hợp lệ.');
    for (const date of [booking.departureDate, ...(booking.tripType === 'roundtrip' ? [booking.returnDate] : [])]) {
      const flight = new Date(`${date}T00:00:00Z`);
      const age = flight.getUTCFullYear() - birth.getUTCFullYear() - (date.slice(5) < person.dateOfBirth.slice(5) ? 1 : 0);
      if (+birth > +flight || (person.type === 'adult' ? age < 12 : person.type === 'child' ? age < 2 || age >= 12 : age >= 2 || +flight - +birth < 7 * 86400000)) return error('ngày sinh không khớp nhóm tuổi tại ngày bay.');
    }
  }
  return '';
}

export function airlinePassengerData(body) {
  const error = airlinePassengerError(body);
  if (error) throw Object.assign(new Error(error), { status: 400 });
  return { autoHold: true, airlineTermsAccepted: true, contactEmail: body.contactEmail.trim(), passengers: body.passengers.map(({ type, title, lastName, firstName, dateOfBirth, documentNumber, country, city, address, secondaryPhone }) => ({ type, title, lastName, firstName, dateOfBirth, documentNumber, country: country.trim(), city: typeof city === 'string' ? city.trim().slice(0,80) : '', address: typeof address === 'string' ? address.trim().slice(0,250) : '', secondaryPhone: typeof secondaryPhone === 'string' ? secondaryPhone.trim().slice(0,30) : '' })) };
}
