import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const languages = [
  ["vi", "Tiếng Việt", "vn"], ["zh-TW", "繁體中文", "tw"], ["ja", "日本語", "jp"],
  ["ko", "한국어", "kr"], ["th", "ภาษาไทย", "th"], ["uk", "Українська", "ua"],
  ["ar", "العربية", "globe"], ["id", "Bahasa Indonesia", "id"], ["ms", "Bahasa Melayu", "my"],
  ["da", "Dansk", "dk"], ["de", "Deutsch", "de"], ["en", "English", "globe"],
  ["es", "Español", "es"], ["fr", "Français", "fr"], ["it", "Italiano", "it"],
  ["nl", "Nederlands", "nl"], ["pl", "Polski", "pl"], ["pt-BR", "Português (Brasil)", "br"],
  ["fi", "Suomi", "fi"], ["sv", "Svenska", "se"], ["tr", "Türkçe", "tr"],
  ["el", "Ελληνικά", "gr"], ["ru", "Русский", "ru"],
] as const;

function LanguageIcon({ country }: { country: string }) {
  const clip = useId();
  const stripes: Record<string, string[]> = {
    ua: ["#1689e8", "#ffda00"], id: ["#e81934", "white"], pl: ["white", "#e81945"],
    de: ["#111", "#e00024", "#ffce00"], nl: ["#b71c34", "white", "#174a95"],
    ru: ["white", "#0867cf", "#e92030"], th: ["#df1933", "white", "#193878", "#193878", "white", "#df1933"],
    es: ["#ef2132", "#ffdc00", "#ffdc00", "#ef2132"], fr: ["#003c79", "white", "#ed1730"], it: ["#00964e", "white", "#e42c3d"],
    gr: ["#0877d9", "white", "#0877d9", "white", "#0877d9", "white", "#0877d9", "white", "#0877d9"],
    my: Array.from({ length: 10 }, (_, i) => i % 2 ? "white" : "#e31b36"),
  };
  const vertical = country === "fr" || country === "it";
  return <svg className="language-icon" viewBox="0 0 24 24" aria-hidden="true">
    <defs><clipPath id={clip}><circle cx="12" cy="12" r="11" /></clipPath></defs>
    <g clipPath={`url(#${clip})`}>
      <path fill={country === "globe" ? "#2583ff" : ["vn", "tr"].includes(country) ? "#ed1328" : country === "se" ? "#0087b9" : country === "dk" ? "#ef0034" : country === "br" ? "#00a651" : "white"} d="M0 0h24v24H0z" />
      {stripes[country]?.map((color, i, all) => <rect key={i} fill={color} x={vertical ? i * 24 / all.length : 0} y={vertical ? 0 : i * 24 / all.length} width={vertical ? 24 / all.length : 24} height={vertical ? 24 : 24 / all.length} />)}
      {country === "vn" && <path fill="#ffe000" d="m12 4 2.1 5.5H20l-4.8 3.5 1.8 5.7-5-3.5-5 3.5 1.8-5.7L4 9.5h5.9z" />}
      {country === "tw" && <text x="12" y="17" textAnchor="middle" fill="#263e60" fontSize="13">繁</text>}
      {country === "jp" && <circle cx="12" cy="12" r="7" fill="#bf073b" />}
      {country === "kr" && <><circle cx="12" cy="12" r="5" fill="#e52535" /><path d="M7 12a5 5 0 0 0 10 0q-2.5-4-5 0t-5 0" fill="#1757ac" /><path d="m3 6 3-3m12 18 3-3M3 18l3 3M18 3l3 3" stroke="#111" strokeWidth="2" /></>}
      {["dk", "fi", "se"].includes(country) && <path d="M8 0v24M0 12h24" stroke={country === "se" ? "#ffdf00" : country === "fi" ? "#003580" : "white"} strokeWidth="4" />}
      {country === "br" && <><path fill="#ffdf00" d="m12 3 10 9-10 9L2 12z" /><circle cx="12" cy="12" r="5" fill="#0054a4" /><path d="m7 10 10 4" stroke="white" strokeWidth="1.5" /></>}
      {country === "tr" && <><circle cx="10" cy="12" r="6" fill="white" /><circle cx="12" cy="11" r="5" fill="#ed1328" /><path fill="white" d="m17 8 1 3h3l-2.5 1.8 1 3-2.5-1.8-2.5 1.8 1-3L13 11h3z" /></>}
      {country === "my" && <><path fill="#003b8a" d="M0 0h14v13H0z" /><circle cx="7" cy="6" r="4" fill="#ffdf00" /><circle cx="8.5" cy="5" r="3.5" fill="#003b8a" /></>}
      {country === "gr" && <><path fill="#0877d9" d="M0 0h12v12H0z" /><path d="M6 0v12M0 6h12" stroke="white" strokeWidth="2" /></>}
      {country === "globe" && <g fill="none" stroke="white" strokeWidth="1.3"><circle cx="12" cy="12" r="8" /><ellipse cx="12" cy="12" rx="4" ry="8" /><path d="M4 12h16M6 7.5h12M6 16.5h12" /></g>}
    </g>
    <circle cx="12" cy="12" r="11" fill="none" stroke="#e2e8f0" strokeWidth=".7" />
  </svg>;
}

export default function LanguageSelector() {
  const [selected, setSelected] = useState(() => {
    try { return languages.find(item => item[0] === localStorage.getItem("travel-language"))?.[0] ?? "vi"; }
    catch { return "vi"; }
  });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("language");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const panelId = useId();
  const current = languages.find(item => item[0] === selected)!;

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); trigger.current?.focus(); };
  }, [open]);

  function choose(code: typeof selected) {
    setSelected(code);
    try { localStorage.setItem("travel-language", code); } catch { /* Keep the selection for this session. */ }
    setOpen(false);
  }

  return <>
    <button ref={trigger} type="button" className="language-trigger" aria-label={`Chọn ngôn ngữ: ${current[1]}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => { setTab("language"); setOpen(true); }}>
      <LanguageIcon country={current[2]} /><span>{current[1]}</span>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && createPortal(<dialog ref={dialog} className="language-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false); } }}>
      <div className="language-dialog-header">
        <div className="language-tabs" role="tablist" aria-label="Ngôn ngữ và tiền tệ">
          <button type="button" id={`${titleId}-language`} role="tab" aria-selected={tab === "language"} aria-controls={panelId} tabIndex={tab === "language" ? 0 : -1} className={tab === "language" ? "is-active" : ""} onClick={() => setTab("language")} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { setTab("currency"); document.getElementById(`${titleId}-currency`)?.focus(); } }}>Ngôn Ngữ</button>
          <button type="button" id={`${titleId}-currency`} role="tab" aria-selected={tab === "currency"} aria-controls={panelId} tabIndex={tab === "currency" ? 0 : -1} className={tab === "currency" ? "is-active" : ""} onClick={() => setTab("currency")} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { setTab("language"); document.getElementById(`${titleId}-language`)?.focus(); } }}>Tiền Tệ</button>
        </div>
        <button type="button" className="language-close" aria-label="Đóng bảng chọn ngôn ngữ" onClick={() => setOpen(false)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button>
      </div>
      <div className="language-dialog-body" id={panelId} role="tabpanel" aria-labelledby={`${titleId}-${tab}`}>
        <h2 id={titleId}>{tab === "language" ? "Tất Cả Ngôn Ngữ" : "Tiền Tệ"}</h2>
        {tab === "language" ? <div className="language-grid">
          {languages.map(([code, label, country]) => <button type="button" key={code} lang={code} aria-pressed={selected === code} className={`language-option${selected === code ? " is-selected" : ""}`} onClick={() => choose(code)}><LanguageIcon country={country} /><span dir="auto">{label}</span></button>)}
        </div> : <div className="language-currency"><button type="button" className="language-option is-selected" aria-pressed="true" onClick={() => setOpen(false)}><LanguageIcon country="vn" /><span>VND — Việt Nam Đồng</span></button><p>Giá và thanh toán hiện được tính bằng Việt Nam Đồng (VND).</p></div>}
      </div>
    </dialog>, document.body)}
  </>;
}
