import test from "node:test";
import assert from "node:assert/strict";
import { createFlightSearch, validateSearch, FlightSearchError, watchVietjetAccess } from "./flight-search.mjs";
import { EventEmitter } from "node:events";
import { createAuthServer } from "./server.mjs";

const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const query = { origin: "HAN", destination: "SGN", departureDate: date, tripType: "oneway", adults: 1, children: 0, infants: 0 };
const flight = { number: "VJ123", departure: "05:30", arrival: "07:40", arrivalNextDay: false, aircraft: "Airbus A321", fares: [{ name: "Eco", amount: 1290000 }] };

test("access monitor detects a CORS-hidden 403 in either event order and ignores other hosts", async () => {
  for (const reversed of [true, false]) {
    const session = new EventEmitter();
    const monitor = watchVietjetAccess(session);
    const request = { requestId: "flight", request: { url: "https://vietjet-api.vietjetair.com/booking/api/v1/search-flight" } };
    const status = { requestId: "flight", statusCode: 403 };
    let resolved = false; monitor.failure.then(() => { resolved = true; });
    session.emit("Network.requestWillBeSent", { requestId: "ads", request: { url: "https://ads.example/booking/api/v1/search-flight" } });
    session.emit("Network.responseReceivedExtraInfo", { requestId: "ads", statusCode: 403 });
    await Promise.resolve(); assert.equal(resolved, false);
    if (reversed) { session.emit("Network.responseReceivedExtraInfo", status); session.emit("Network.requestWillBeSent", request); }
    else { session.emit("Network.requestWillBeSent", request); session.emit("Network.responseReceivedExtraInfo", status); }
    const error = await monitor.failure;
    assert.equal(error.status, 503); assert.equal(error.code, "VIETJET_ACCESS_DENIED");
    monitor.dispose(); assert.equal(session.listenerCount("Network.requestWillBeSent"), 0); assert.equal(session.listenerCount("Network.responseReceivedExtraInfo"), 0);
  }
});

test("access denial reaches the app as 503 with an explicit code, not an empty flight list", async t => {
  const server = createAuthServer({ databasePath: ":memory:", searchFlights: async () => { throw new FlightSearchError(503, "Nguồn giá chưa khả dụng", "VIETJET_ACCESS_DENIED"); } });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/flights/search`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { message: "Nguồn giá chưa khả dụng", code: "VIETJET_ACCESS_DENIED" });
});

test("search rejects invalid routes, impossible dates and unsupported passengers", () => {
  for (const change of [{ origin: "XXX" }, { destination: "HAN" }, { departureDate: "2026-02-30" }, { departureDate: "2020-01-01" }, { tripType: "roundtrip" }, { adults: 2 }, { children: 1 }]) {
    assert.throws(() => validateSearch({ ...query, ...change }), error => error.status === 400);
  }
  assert.equal(validateSearch({ ...query, injectedUrl: "http://localhost" }).origin, "HAN");
});

test("provider failures/empty results are errors and never cached as no flights", async () => {
  let calls = 0;
  const search = createFlightSearch({ run: async () => { calls++; return []; } });
  await assert.rejects(search(query), error => error.status === 502);
  await assert.rejects(search(query), error => error.status === 502);
  assert.equal(calls, 2);
});

test("cache expires, concurrent browser searches are bounded and errors release the slot", async () => {
  let now = 100000, calls = 0, finish;
  const search = createFlightSearch({ now: () => now, run: async () => { calls++; await new Promise(resolve => { finish = resolve; }); return [flight]; } });
  const pending = search(query);
  await assert.rejects(search({ ...query, destination: "DAD" }), error => error.status === 429);
  finish(); const result = await pending;
  assert.equal(result.priceType, "displayed_fare");
  assert.equal(result.sourceUrl, "https://agents2.vietjetair.com/booking");
  assert.deepEqual(await search(query), result); assert.equal(calls, 1);
  now += 60001;
  const next = search(query); finish(); await next; assert.equal(calls, 2);
});

test("agency search without a backend login session returns a setup error instead of public-site fallback", async () => {
  const search = createFlightSearch();
  await assert.rejects(search(query), error => error.status === 503 && error.code === "VIETJET_AGENT_LOGIN_REQUIRED");
});

test("public search endpoint validates input and preserves upstream error status", async t => {
  let calls = 0;
  const server = createAuthServer({ databasePath: ":memory:", searchFlights: createFlightSearch({ run: async () => { calls++; return [flight]; } }) });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/flights/search`;
  const send = body => fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:5173" }, body: JSON.stringify(body) });
  assert.equal((await send({ ...query, destination: "HAN" })).status, 400);
  const response = await send(query); assert.equal(response.status, 200);
  assert.equal((await response.json()).flights[0].number, "VJ123"); assert.equal(calls, 1);
  assert.equal((await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" }, body: JSON.stringify(query) })).status, 403);
});
