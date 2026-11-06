import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { seedSampleCatalog } from "./seed-sample-content.mjs";
import groups from "../src/pages/esims/destinations.json" with { type: "json" };
import { matchesEsimSearch, normalizeSearch } from "../src/utils/search.ts";

const countries = groups.flatMap(group => group.countries);

test("sample catalog adds labeled content once without changing real records or republishing hidden samples", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT); CREATE TABLE tours (id INTEGER PRIMARY KEY, data TEXT, published INTEGER); CREATE TABLE esims (id INTEGER PRIMARY KEY, data TEXT, published INTEGER);");
    const original = JSON.stringify({ name: "Gói do quản trị nhập", price: 123456 });
    db.prepare("INSERT INTO esims (data, published) VALUES (?, 1)").run(original);
    assert.deepEqual(seedSampleCatalog(db), { addedTours: 4, addedEsims: countries.length });
    const esims = db.prepare("SELECT data FROM esims WHERE id != 1").all().map(row => JSON.parse(row.data));
    for (const country of countries) {
      for (const query of [country.name, normalizeSearch(country.name)]) {
        const matches = esims.filter(item => matchesEsimSearch(query, item));
        assert.equal(matches.length, 1, query);
        assert.equal(matches[0].coverage, `${country.name} (minh họa)`);
      }
    }
    assert.equal(db.prepare("SELECT data FROM esims WHERE id=1").get().data, original);
    const tours = db.prepare("SELECT data FROM tours").all().map((row) => JSON.parse(row.data));
    assert.deepEqual(new Set(tours.map((item) => item.kind)), new Set(["domestic", "international", "combo"]));
    assert.ok(tours.every((item) => item.name.includes("mẫu") && Number.isInteger(item.price) && item.price > 0));
    assert.ok(esims.every((item) => Number.isInteger(item.price) && item.price > 0));
    db.exec("UPDATE tours SET published=0 WHERE id=1");
    assert.deepEqual(seedSampleCatalog(db), { addedTours: 0, addedEsims: 0 });
    assert.equal(db.prepare("SELECT published FROM tours WHERE id=1").get().published, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM esims").get().count, countries.length + 1);
  } finally { db.close(); }
});

test("upgrades original catalog once while preserving edited, hidden and deleted samples", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT); CREATE TABLE tours (id INTEGER PRIMARY KEY, data TEXT, published INTEGER); CREATE TABLE esims (id INTEGER PRIMARY KEY, data TEXT, published INTEGER);");
    db.prepare("INSERT INTO settings VALUES (?, ?)").run("sample_catalog_seeded_v1", "{}");
    const edited = JSON.stringify({ name: "Gói Nhật đã chỉnh sửa", coverage: "Nhật Bản", price: 123456 });
    db.prepare("INSERT INTO esims VALUES (1, ?, 0)").run(edited);
    assert.deepEqual(seedSampleCatalog(db), { addedTours: 0, addedEsims: countries.length - 4 });
    assert.deepEqual(db.prepare("SELECT data, published FROM esims WHERE id=1").get(), Object.assign(Object.create(null), { data: edited, published: 0 }));
    db.exec("DELETE FROM esims WHERE id=2");
    assert.deepEqual(seedSampleCatalog(db), { addedTours: 0, addedEsims: 0 });
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM esims").get().count, countries.length - 4);
  } finally { db.close(); }
});

test("English destination and package searches match the original Vietnamese catalog", () => {
  assert.equal(matchesEsimSearch("Japan", { name: "eSIM mẫu · Nhật Bản 5 GB", coverage: "Nhật Bản (minh họa)" }), true);
  assert.equal(matchesEsimSearch("Japan", { name: "eSIM mẫu · Hàn Quốc 10 GB", coverage: "Hàn Quốc (minh họa)" }), false);
});
