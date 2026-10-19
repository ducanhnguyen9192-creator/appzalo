// App limits shared by the form, searches and booking validation.
export function passengerErrors({ adults, children, infants }) {
  return {
    adults: !Number.isInteger(adults) || adults < 1 || adults > 10 || adults + children > 10 ? "Cần ít nhất 1 người lớn; tổng người lớn và trẻ em tối đa 10." : undefined,
    children: !Number.isInteger(children) || children < 0 || children > 10 || adults + children > 10 ? "Tổng người lớn và trẻ em tối đa 10." : undefined,
    infants: !Number.isInteger(infants) || infants < 0 || infants > 2 ? "Số em bé từ 0 đến 2." : undefined,
  };
}
export const validPassengers = counts => !Object.values(passengerErrors(counts)).some(Boolean);
