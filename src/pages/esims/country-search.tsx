import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { matchesSearch, findEsimCountry } from "@/utils/search";
import groups from "./destinations.json";

const countries = groups.flatMap(group => group.countries);

export function esimSearchPath(query: string) {
  const country = findEsimCountry(query);
  return country ? `/esims/country/${country.code}` : `/esims/search?q=${encodeURIComponent(query.trim())}`;
}

export default function CountrySearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const matches = query.trim() ? countries.filter(country => matchesSearch(query, country.name)) : [];
  const visible = open && !!query.trim();
  useEffect(() => {
    if (visible && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, visible]);

  return <div className="esim-search-container" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setActive(-1); }
  }}>
    <form className="esim-search" role="search" onSubmit={event => {
      event.preventDefault();
      if (query.trim()) navigate(visible && active >= 0 ? `/esims/country/${matches[active].code}` : esimSearchPath(query));
    }}>
      <label className="esim-search-field"><span aria-hidden="true">⌕</span><span className="sr-only">Tìm gói eSIM theo quốc gia hoặc tên gói</span>
        <input type="search" role="combobox" aria-autocomplete="list" aria-expanded={visible}
          aria-controls={visible ? "esim-country-suggestions" : undefined}
          aria-activedescendant={visible && active >= 0 ? `esim-suggestion-${matches[active]?.code}` : undefined}
          autoComplete="off" placeholder="Bạn sắp đi đâu?" value={query} maxLength={200}
          onFocus={() => setOpen(true)}
          onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
          onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActive(-1); }
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && matches.length) {
              event.preventDefault(); setOpen(true);
              setActive(current => event.key === "ArrowDown" ? (current + 1) % matches.length : (current <= 0 ? matches.length - 1 : current - 1));
            }
          }} />
      </label><button type="submit">Tìm eSIM <span aria-hidden="true">→</span></button>
    </form>
    {visible && <div className="esim-suggestions">
      <p className="esim-suggestions-caption" role="status">{matches.length ? `${matches.length} quốc gia phù hợp` : "Không tìm thấy quốc gia phù hợp"}</p>
      <ul id="esim-country-suggestions" role="listbox" aria-label="Quốc gia gợi ý" ref={listRef}>
        {matches.map((country, index) => <li key={country.code} id={`esim-suggestion-${country.code}`} role="option" aria-selected={active === index}
          className={active === index ? "is-active" : ""} onMouseDown={event => event.preventDefault()}
          onClick={() => navigate(`/esims/country/${country.code}`)}>
          <span>{country.name}</span><span aria-hidden="true">→</span>
        </li>)}
      </ul>
    </div>}
  </div>;
}
