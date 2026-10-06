import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { seedSampleCatalog } from "./seed-sample-content.mjs";

test("sample catalog adds labeled content once without changing real records or republishing hidden samples", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT); CREATE TABLE tours (id INTEGER PRIMARY KEY, data TEXT, published INTEGER); CREATE TABLE esims (id INTEGER PRIMARY KEY, data TEXT, published INTEGER);");
    const original = JSON.stringify({ name: "Gói do quản trị nhập", price: 123456 });
    db.prepare("INSERT INTO esims (data, published) VALUES (?, 1)").run(original);
    assert.deepEqual(seedSampleCatalog(db), { addedTours: 4, addedEsims: 4 });
    assert.equal(db.prepare("SELECT data FROM esims WHERE id=1").get().data, original);
    const tours = db.prepare("SELECT data FROM tours").all().map((row) => JSON.parse(row.data));
    assert.deepEqual(new Set(tours.map((item) => item.kind)), new Set(["domestic", "international", "combo"]));
    assert.ok(tours.every((item) => item.name.includes("mẫu") && item.price === null));
    db.exec("UPDATE tours SET published=0 WHERE id=1");
    assert.deepEqual(seedSampleCatalog(db), { addedTours: 0, addedEsims: 0 });
    assert.equal(db.prepare("SELECT published FROM tours WHERE id=1").get().published, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM esims").get().count, 5);
  } finally { db.close(); }
});
