import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { once } from "node:events";
import { seedSampleCatalog } from "./seed-sample-content.mjs";
import { createTranslations, translationLanguages } from "./translations.mjs";
import { createAuthServer } from "./server.mjs";
import { formatConvertedPrice } from "../src/utils/exchange-rates.ts";

test("only Vietnamese and English are supported; saved translations preserve original content", () => {
  assert.deepEqual(translationLanguages, ["vi", "en"]);
  const db = new DatabaseSync(":memory:");
  try {
    const service = createTranslations(db, { uiCatalog: ["Trang chủ", "Câu chưa dịch"] });
    db.prepare("INSERT INTO translations VALUES (?, ?, ?)").run("en", "Tour kiểm thử", "Test tour");
    const item = { name: "Tour kiểm thử", price: 250000 };
    const localized = service.localize(item, "tours", "en");
    assert.equal(localized.name, item.name);
    assert.equal(localized.price, 250000);
    assert.equal(localized._localized.name, "Test tour");
    assert.deepEqual(service.localize(item, "tours", "ja"), item);
    assert.equal(service.dictionary("en").entries["Tour kiểm thử"], undefined);
    assert.equal(service.dictionary("en").complete, false);
    assert.equal(service.getStatus().state, "stored");
    assert.equal(service.start, undefined, "no paid translation job remains");
    assert.equal(service.schedule, undefined);
  } finally { db.close(); }
});
test("public dictionary endpoint cannot trigger Google calls or expose admin controls", async () => {
  const server = createAuthServer({ databasePath: ":memory:", translations: { key: "", uiCatalog: ["Trang chủ"] } });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const publicResult = await (await fetch(base + "/api/i18n/en")).json();
    assert.equal(publicResult.entries["Trang chủ"], "Home");
    assert.equal((await fetch(base + "/api/i18n/invalid")).status, 400);
    assert.equal((await fetch(base + "/api/admin/i18n/status")).status, 401);
    assert.equal((await fetch(base + "/api/admin/i18n/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test("currency uses selected locale and correct minor units, fallback remains explicitly VND", () => {
  const now = Date.now(), date = new Date(now).toISOString().slice(0, 10);
  for (const language of translationLanguages) {
    for (const currency of ["USD", "JPY", "KWD"]) {
      const rate = .002;
      assert.equal(formatConvertedPrice(100000, currency, { [currency]: { rate, date } }, now, language), currency === "USD" ? "$200.00" : `≈ ${new Intl.NumberFormat(language, { style: "currency", currency, currencyDisplay: "code" }).format(200)}`);
    }
  }
  assert.match(formatConvertedPrice(250000, "USD", {}, now, "en"), /VND/);
});

test("bundled English covers every extracted UI phrase and every published sample package field", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT); CREATE TABLE tours (id INTEGER PRIMARY KEY, data TEXT, published INTEGER); CREATE TABLE esims (id INTEGER PRIMARY KEY, data TEXT, published INTEGER);");
    seedSampleCatalog(db);
    const service = createTranslations(db);
    const dictionary = service.dictionary("en");
    assert.equal(dictionary.complete, true);
    assert.equal(dictionary.entries["Tìm chuyến bay →"], "Search flights →");
    for (const [kind, fields] of Object.entries({ tours: ["name", "destination", "duration", "departure", "summary", "itinerary", "included", "excluded"], esims: ["name", "coverage", "allowance", "validity", "summary", "network", "activation", "instructions", "notes"] })) {
      const packages = db.prepare("SELECT id, data FROM " + kind).all().map(row => ({ ...JSON.parse(row.data), id: row.id }));
      assert.ok(packages.length > 0);
      for (const item of packages) {
        const localized = service.localize(item, kind, "en");
        for (const field of fields) {
          if (!/[À-ỹĐđ]/u.test(item[field] ?? "")) continue;
          assert.ok(localized._localized[field], kind + "/" + item.id + ": missing " + field);
          assert.notEqual(localized._localized[field], item[field]);
          assert.ok(!/[À-ỹĐđ]/u.test(localized._localized[field]), kind + "/" + item.id + ": untranslated " + field);
        }
      }
    }
  } finally { db.close(); }
});
