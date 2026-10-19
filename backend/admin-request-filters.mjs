// All identifiers are selected here; user input is only passed as SQL parameters.
export function adminRequestFilters(params, table) {
  const service = table === "service_requests";
  const status = params.get("status") || "";
  const allowed = ["received", "reviewing", "quoted", service ? "completed" : "ticketed", "cancelled"];
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  if (status && !allowed.includes(status)) fail("Trạng thái lọc không hợp lệ.");
  const clauses = [], args = [];
  const query = (params.get("q") || "").trim().slice(0, 100);
  if (query) {
    const prefix = service ? "$.request." : "$.";
    clauses.push(`(${table}.id LIKE ? ESCAPE '\\' OR users.email LIKE ? ESCAPE '\\' OR json_extract(${table}.data, '${prefix}fullName') LIKE ? ESCAPE '\\' OR json_extract(${table}.data, '${prefix}phone') LIKE ? ESCAPE '\\')`);
    const search = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    args.push(search, search, search, search);
  }
  if (status) { clauses.push(`${table}.status = ?`); args.push(status); }
  const dates = {};
  for (const key of ["from", "to"]) {
    const value = params.get(key);
    if (!value) continue;
    const time = Date.parse(`${value}T00:00:00+07:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(time) || new Date(time + 7 * 3600000).toISOString().slice(0, 10) !== value) fail("Ngày lọc không hợp lệ.");
    dates[key] = time;
    clauses.push(`${table}.created_at ${key === "from" ? ">=" : "<"} ?`);
    args.push(time + (key === "to" ? 86400000 : 0));
  }
  if (dates.from !== undefined && dates.to !== undefined && dates.from > dates.to) fail("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
  return { where: clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "", args };
}
