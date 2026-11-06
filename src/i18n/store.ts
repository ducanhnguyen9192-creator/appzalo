import { useSyncExternalStore } from "react";
import languages from "./languages.json";
import seeds from "./seeds.json";
import templates from "./templates.json";
import contentEnglish from "./content-en.json";
import catalog from "./catalog.json";

export { languages };
export const validLanguage = (value: string | null) => languages.some(([code]) => code === value) ? value! : "vi";
type LanguageScope = "customer" | "admin";
let scope: LanguageScope = "customer";
const storageKey = () => scope === "admin" ? "travel-admin-language" : "travel-language";
const sessionLanguages: Record<LanguageScope, string> = { customer: "vi", admin: "vi" };
function storedLanguage() { try { return validLanguage(localStorage.getItem(storageKey())); } catch { return sessionLanguages[scope]; } }
let language = storedLanguage();
const seedDictionary = (code: string): Record<string, string> => ({ ...(code === "en" ? contentEnglish : {}), ...(seeds as Record<string, Record<string, string>>)[code] });
let dictionary: Record<string, string> = seedDictionary(language);
let revision = 0;
let loading = false;
let incomplete = false;
let request: AbortController | undefined;
const listeners = new Set<() => void>();
let pageTitle = "";
export function setTranslatedPageTitle(title: string) { pageTitle = title; document.title = `${translate(title)} | FirstClass Travel`; }
const emit = () => { revision++; if (pageTitle) setTranslatedPageTitle(pageTitle); listeners.forEach(listener => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => revision;
const own = (key: string) => Object.prototype.hasOwnProperty.call(dictionary, key);
const patterns = [...new Set([...templates, ...Object.keys(seeds.en).filter(source => /__FCVAR\d+__/.test(source))])].sort((a, b) => b.length - a.length).map(source => {
  const chunks = source.split(/__FCVAR\d+__/);
  const pattern = chunks.map(chunk => chunk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("([\\s\\S]*?)");
  return { source, regex: new RegExp(`^${pattern}$`) };
});

export function translate(text: string): string {
  if (language === "vi" || !text) return text;
  if (own(text)) return dictionary[text];
  const trimmed = text.trim();
  const normalized = trimmed.replace(/\s+/g, " ");
  if (own(normalized)) return text.replace(trimmed, dictionary[normalized]);
  for (const { source, regex } of patterns) {
    if (!own(source)) continue;
    const match = trimmed.match(regex);
    if (match) return text.replace(trimmed, dictionary[source].replace(/__FCVAR(\d+)__/g, (_, index) => {
      const value = match[Number(index) + 1] ?? "";
      return own(value) ? dictionary[value] : value;
    }));
  }
  return own(trimmed) ? text.replace(trimmed, dictionary[trimmed]) : text;
}
export function registerTranslations(locale: string, entries: Record<string, string>) {
  if (locale !== language) return;
  let changed = false;
  const bundled = seedDictionary(locale);
  for (const [source, target] of Object.entries(entries)) {
    if (Object.prototype.hasOwnProperty.call(bundled, source)) continue;
    if (typeof target === "string" && target && dictionary[source] !== target) { dictionary[source] = target; changed = true; }
  }
  if (changed) emit();
}
export async function loadTranslations() {
  request?.abort();
  const controller = new AbortController(); request = controller;
  if (language === "vi") { loading = false; incomplete = false; emit(); return; }
  const locale = language;
  loading = true; incomplete = false; emit();
  try {
    const base = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
    const response = await fetch(`${base}/api/i18n/${encodeURIComponent(locale)}`, { signal: controller.signal });
    if (!response.ok) throw new Error("Translation unavailable");
    const result = await response.json();
    if (!result.entries || typeof result.entries !== "object" || Array.isArray(result.entries)) throw new Error("Invalid dictionary");
    if (locale !== language || controller.signal.aborted) return;
    registerTranslations(locale, result.entries);
    incomplete = catalog.some(source => !own(source));
  } catch { if (!controller.signal.aborted) incomplete = catalog.some(source => !own(source)); }
  finally { if (!controller.signal.aborted) { loading = false; emit(); } }
}
export function setLanguage(value: string) {
  const next = validLanguage(value);
  if (language === next) return;
  language = next; dictionary = seedDictionary(next);
  sessionLanguages[scope] = next;
  try { localStorage.setItem(storageKey(), next); } catch { /* Session preference still works. */ }
  applyDocumentLanguage(); emit(); void loadTranslations();
}
export function setLanguageScope(next: LanguageScope) {
  if (scope === next) return;
  sessionLanguages[scope] = language;
  scope = next;
  language = storedLanguage();
  dictionary = seedDictionary(language);
  applyDocumentLanguage(); emit(); void loadTranslations();
}
function applyDocumentLanguage() {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
}
if (typeof window !== "undefined") {
  applyDocumentLanguage();
  window.addEventListener("storage", event => {
    if (event.storageArea === localStorage && (event.key === storageKey() || event.key === null)) setLanguage(storedLanguage());
  });
}
export function useLanguage() {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  return { language, setLanguage, t: translate, loading, incomplete, retry: loadTranslations };
}
