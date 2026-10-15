import { createAuthServer } from "./server.mjs";
import { startAgencyBrowser } from "./vietjet-agency.mjs";
import { createFlightSearch } from "./flight-search.mjs";
import { statSync } from "node:fs";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3002);
const session = await startAgencyBrowser();
const adapterUrl = new URL("./vietjet-agency.mjs", import.meta.url);
let revision, adapter;
const searchFlights = createFlightSearch({ run: async query => {
  const changed = statSync(adapterUrl).mtimeMs;
  if (changed !== revision) {
    adapter = await import(`${adapterUrl.href}?revision=${changed}`);
    revision = changed;
  }
  return adapter.searchAgency(query, session);
} });
const server = createAuthServer({ searchFlights });
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); }).catch(async error => { await session.close(); throw error; });
console.log(`FirstClass agency backend: http://${host}:${port}`);
console.log("Đăng nhập đại lý trong cửa sổ Chrome vừa mở. Phiên chỉ tồn tại khi tiến trình này chạy; không lưu mật khẩu hoặc xuất cookie.");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { server.close(); void session.close(); });
