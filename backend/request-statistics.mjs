import { adminRequestFilters } from "./admin-request-filters.mjs";

const DAY = 86400000;
export function requestStatistics(db, params, now = Date.now()) {
  const today = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
  const from = params.get("from") || new Date(Date.parse(`${today}T00:00:00Z`) - 29 * DAY).toISOString().slice(0, 10);
  const to = params.get("to") || today;
  const service = params.get("service") || "";
  const fail = message => { throw Object.assign(new Error(message), { status: 400 }); };
  if (service && !["flight", "tour", "esim"].includes(service)) fail("Dịch vụ lọc không hợp lệ.");
  const dates = new URLSearchParams({ from, to });
  const filters = adminRequestFilters(dates, "bookings");
  const start = Date.parse(`${from}T00:00:00+07:00`);
  const end = Date.parse(`${to}T00:00:00+07:00`);
  if ((end - start) / DAY >= 366) fail("Vui lòng chọn khoảng thời gian tối đa 366 ngày.");
  const rows = db.prepare(`
    SELECT service, status, date(created_at / 1000, 'unixepoch', '+7 hours') AS day, COUNT(*) AS count
    FROM (
      SELECT 'flight' AS service, status, created_at FROM bookings${filters.where}
      UNION ALL
      SELECT json_extract(data, '$.request.service') AS service, status, created_at
      FROM service_requests${adminRequestFilters(dates, "service_requests").where}
    ) WHERE service IN ('flight', 'tour', 'esim') ${service ? "AND service = ?" : ""}
    GROUP BY service, status, day
  `).all(...filters.args, ...filters.args, ...(service ? [service] : []));
  const summary = ["flight", "tour", "esim"].map(service => ({
    service, total: 0, statuses: { received: 0, reviewing: 0, quoted: 0, ticketed: 0, completed: 0, cancelled: 0 },
  }));
  const daily = [];
  for (let time = start; time <= end; time += DAY) daily.push({ date: new Date(time + 7 * 3600000).toISOString().slice(0, 10), flight: 0, tour: 0, esim: 0 });
  const days = new Map(daily.map(day => [day.date, day]));
  for (const row of rows) {
    const item = summary.find(item => item.service === row.service);
    item.total += row.count;
    item.statuses[row.status] = (item.statuses[row.status] || 0) + row.count;
    days.get(row.day)[row.service] += row.count;
  }
  return { from, to, service, total: summary.reduce((sum, item) => sum + item.total, 0), summary, daily };
}
