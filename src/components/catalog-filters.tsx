import { cloneElement, isValidElement, ReactElement, ReactNode, useId } from "react";
import { SORT_OPTIONS } from "@/utils/catalog-filters";

export const filterInputClass = "w-full border border-gray-200 rounded-xl px-3 py-3 bg-white text-sm";
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return <div className="min-w-0 text-sm font-medium text-gray-700"><label htmlFor={id} className="block mb-2">{label}</label>{isValidElement(children) ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children}</div>;
}
export function SortField({ value, onChange, esim = false }: { value: string; onChange: (value: string) => void; esim?: boolean }) {
  return <FilterField label="Sắp xếp"><select className={filterInputClass} value={value} onChange={(event) => onChange(event.target.value)}>{SORT_OPTIONS.map(([key, label]) => <option key={key} value={key}>{esim && key.startsWith("duration") ? label.replace("Thời lượng", "Thời hạn") : label}</option>)}</select></FilterField>;
}
