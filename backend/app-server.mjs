// Optional separate app backend: retain the running agency browser session while
// reloading app/database code. Only read-only flight searches go to that worker.
import { createAuthServer } from "./server.mjs";
import { FlightSearchError, validateSearch } from "./flight-search.mjs";

const worker = new URL(process.env.FLIGHT_SEARCH_WORKER || "http://127.0.0.1:3002/api/flights/search");
if (worker.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(worker.hostname) || worker.pathname !== "/api/flights/search" || worker.username || worker.password || worker.search || worker.hash) throw new Error("Flight worker must be the local read-only search endpoint.");
const server = createAuthServer({ searchFlights: async body => {
  const query = validateSearch(body);
  let response;
  try { response = await fetch(worker, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query), signal: AbortSignal.timeout(125000) }); }
  catch { throw new FlightSearchError(503, "Chưa kết nối được bộ tìm vé. Vui lòng thử lại sau."); }
  const data = await response.json();
  if (!response.ok) throw new FlightSearchError(response.status, data.message ?? "Chưa tải được chuyến bay.", data.code);
  return data;
} });
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3003);
if (worker.port === String(port)) throw new Error("App backend and flight worker must use separate ports.");
server.listen(port, host, () => console.log(`FirstClass app backend: http://${host}:${port}; read-only search worker: ${worker.origin}`));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
