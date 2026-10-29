import { createAuthServer } from "./server.mjs";
import { startAgencyBrowser, searchAgency } from "./vietjet-agency.mjs";
import { holdAgency } from "./vietjet-hold.mjs";
import { createFlightSearch } from "./flight-search.mjs";

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3002);
const session = await startAgencyBrowser();
// Search and hold must use the same adapter lock and browser session.
const server = createAuthServer({ searchFlights: createFlightSearch({ run: query => searchAgency(query, session) }), holdAgency: (booking, beforeSubmit) => holdAgency(booking, beforeSubmit, session) });
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); }).catch(async error => { await session.close(); throw error; });
console.log(`FirstClass agency backend: http://${host}:${port}`);
console.log(process.env.VIETJET_AGENT_USERNAME && process.env.VIETJET_AGENT_PASSWORD
  ? "Tự đăng nhập đại lý khi tìm vé; phiên chỉ nằm trong bộ nhớ máy chủ."
  : "Đăng nhập đại lý trong cửa sổ Chrome vừa mở. Phiên chỉ tồn tại khi tiến trình này chạy; không lưu mật khẩu hoặc xuất cookie.");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { server.close(); void session.close(); });
