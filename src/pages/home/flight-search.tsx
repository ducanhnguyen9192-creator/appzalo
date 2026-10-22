import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import AirportSuggestions from "@/components/airport-suggestions";
import { airportCode } from "@/components/flight-results";
import { EMPTY_FLIGHT, validateFlight, vietnamToday } from "@/utils/flight-form";

export default function HomeFlightSearch() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FLIGHT);
  const [tripType, setTripType] = useState<"oneway" | "roundtrip">("oneway");
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [withChildren, setWithChildren] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    const errors = validateFlight(form, tripType, "journey");
    if (!airportCode(form.origin) || !airportCode(form.destination)) { setError("Chọn điểm đi và điểm đến từ danh sách sân bay."); return; }
    if (airportCode(form.origin) === airportCode(form.destination)) { setError("Điểm đến cần khác điểm đi."); return; }
    if (Object.values(errors).some(Boolean)) { setError(Object.values(errors).find(Boolean)!); return; }
    navigate("/flights", { state: { searchJourney: { form, tripType } } });
  }
  return <section className="journey-flight journey-search" aria-labelledby="journey-flight-title">
    <div className="journey-flight-copy"><p className="journey-eyebrow">BẮT ĐẦU HÀNH TRÌNH</p><h2 id="journey-flight-title">Bạn muốn bay đến đâu?</h2><p>Nhập hành trình để tìm chuyến bay phù hợp.</p></div>
    <form onSubmit={submit} className="home-flight-form">
      <fieldset className="home-flight-types"><legend className="sr-only">Loại hành trình</legend>{([['oneway', 'Một chiều'], ['roundtrip', 'Khứ hồi']] as const).map(([value, label]) => <label key={value}><input type="radio" name="home-trip-type" value={value} checked={tripType === value} onChange={() => { setTripType(value); setError(""); }} />{label}</label>)}</fieldset>
      <div className="home-flight-fields">
        {([['origin', 'Điểm đi'], ['destination', 'Điểm đến']] as const).map(([field, label]) => <div key={field}><label htmlFor={`home-${field}`}>{label}</label><AirportSuggestions value={form[field]} title={label} open={active === field} inputProps={{ id: `home-${field}`, required: true, placeholder: "Thành phố hoặc sân bay" }} onOpen={() => setActive(field)} onClose={() => setActive(null)} onChange={value => { setForm(current => ({ ...current, [field]: value })); setError(""); }} onSelect={value => { setForm(current => ({ ...current, [field]: value })); setActive(null); setError(""); }} /></div>)}
        <label>Ngày đi<input type="date" required min={vietnamToday()} value={form.departureDate} onChange={event => { setForm({ ...form, departureDate: event.target.value }); setError(""); }} /></label>
        {tripType === "roundtrip" && <label>Ngày về<input type="date" required min={form.departureDate || vietnamToday()} value={form.returnDate} onChange={event => { setForm({ ...form, returnDate: event.target.value }); setError(""); }} /></label>}
        <label>Người lớn<select value={form.adults} onChange={event => { setForm({ ...form, adults: Number(event.target.value) }); setError(""); }}>{Array.from({ length: 10 - form.children }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1} người lớn</option>)}</select></label>
        <div className="home-family-options">
          <label className="home-family-toggle"><input type="checkbox" checked={withChildren} aria-controls="home-child-passengers" onChange={event => { setWithChildren(event.target.checked); if (!event.target.checked) setForm(current => ({ ...current, children: 0, infants: 0 })); setError(""); }} />Có trẻ em / em bé đi cùng</label>
          <div id="home-child-passengers" hidden={!withChildren}>
            {withChildren && <div className="home-child-fields">
              <label>Trẻ em <span>(2–11 tuổi)</span><select aria-label="Số trẻ em" value={form.children} onChange={event => { setForm({ ...form, children: Number(event.target.value) }); setError(""); }}>{Array.from({ length: 11 - form.adults }, (_, i) => <option key={i} value={i}>{i} trẻ em</option>)}</select></label>
              <label>Em bé <span>(dưới 2 tuổi)</span><select aria-label="Số em bé" value={form.infants} onChange={event => { setForm({ ...form, infants: Number(event.target.value) }); setError(""); }}>{[0, 1, 2].map(i => <option key={i} value={i}>{i} em bé</option>)}</select></label>
              <p>Người lớn và trẻ em tối đa 10 người; em bé tối đa 2.</p>
            </div>}
          </div>
        </div>
        <button className="journey-flight-button" type="submit">Tìm chuyến bay <span aria-hidden="true">→</span></button>
      </div>
      <p className="home-flight-hint">Vé một chiều hoặc khứ hồi · Hạng phổ thông.</p>
      {error && <p className="home-flight-error" role="alert">{error}</p>}
    </form>
  </section>;
}
