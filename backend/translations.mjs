import languages from "../src/i18n/languages.json" with { type: "json" };
import catalog from "../src/i18n/catalog.json" with { type: "json" };
import seeds from "../src/i18n/seeds.json" with { type: "json" };
import contentEnglish from "../src/i18n/content-en.json" with { type: "json" };

export const translationLanguages = languages.map(([code]) => code);
export const contentFields = {
  tours: ["name", "destination", "duration", "departure", "summary", "itinerary", "included", "excluded"],
  esims: ["name", "coverage", "allowance", "validity", "network", "activation", "summary", "instructions", "notes"],
};

// Read saved translations only. No external translation service or API key.
export function createTranslations(db, { uiCatalog = catalog } = {}) {
  db.exec("CREATE TABLE IF NOT EXISTS translations (language TEXT NOT NULL, source TEXT NOT NULL, translated TEXT NOT NULL, PRIMARY KEY(language, source))");
  const read = db.prepare("SELECT translated FROM translations WHERE language = ? AND source = ?");
  const lookup = (language, source) => seeds[language]?.[source] ?? (language === "en" ? contentEnglish[source] : undefined) ?? read.get(language, source)?.translated;
  function dictionary(language) {
    const entries = {};
    for (const source of uiCatalog) {
      const translated = lookup(language, source);
      if (translated) entries[source] = translated;
    }
    return { entries, complete: language === "vi" || Object.keys(entries).length === uiCatalog.length, total: uiCatalog.length, translated: Object.keys(entries).length };
  }
  function localize(item, table, language) {
    if (!translationLanguages.includes(language) || language === "vi") return item;
    const localized = {};
    let complete = true;
    for (const field of contentFields[table] ?? []) {
      const source = item[field];
      if (!source) continue;
      const translated = lookup(language, source);
      if (translated) localized[field] = translated;
      else complete = false;
    }
    return { ...item, _localized: localized, _translationLanguage: language, _translationComplete: complete };
  }
  function getStatus() {
    const saved = dictionary("en");
    return { state: "stored", language: "en", completed: saved.translated, total: saved.total, complete: saved.complete };
  }
  return { dictionary, localize, getStatus };
}
