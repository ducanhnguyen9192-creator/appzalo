import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createRequestCode } from "./request-code.mjs";

test("request codes retry collisions across bookings and services", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("CREATE TABLE bookings (id TEXT PRIMARY KEY); CREATE TABLE service_requests (id TEXT PRIMARY KEY); INSERT INTO bookings VALUES ('AAAAAA'); INSERT INTO service_requests VALUES ('BBBBBB');");
    let attempt = 0;
    assert.equal(createRequestCode(db, size => Buffer.alloc(size, attempt++)), "CCCCCC");
    assert.equal(attempt, 3);
    assert.match(createRequestCode(db), /^[A-HJ-NP-Z2-9]{6}$/);
  } finally { db.close(); }
});
