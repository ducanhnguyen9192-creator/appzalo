import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync, existsSync, createReadStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MEDIA_PATH = /^\/api\/media\/([a-f0-9-]{36}\.(png|jpg|webp|gif))$/;
const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };
const hashToken = (value) => createHash("sha256").update(value).digest("hex");
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email, role: row.role ?? "customer" });
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  const key = await deriveKey(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `${salt}:${key.toString("hex")}`;
}

async function readJson(req, limit = 8192) {
  if (!req.headers["content-type"]?.startsWith("application/json")) {
    throw new HttpError(415, "Yêu cầu phải sử dụng JSON.");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, "Dữ liệu quá dài.");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new HttpError(400, "Dữ liệu không hợp lệ."); }
}

async function readImage(req) {
  if (Number(req.headers["content-length"]) > MAX_IMAGE_BYTES) {
    req.resume();
    throw new HttpError(413, "Ảnh phải nhỏ hơn hoặc bằng 5 MB.");
  }
  const data = await new Promise((resolveBody, reject) => {
    const chunks = []; let size = 0; let exceeded = false;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES) {
        if (!exceeded) { exceeded = true; chunks.length = 0; reject(new HttpError(413, "Ảnh phải nhỏ hơn hoặc bằng 5 MB.")); }
      } else if (!exceeded) chunks.push(chunk);
    });
    req.on("end", () => { if (!exceeded) resolveBody(Buffer.concat(chunks)); });
    req.on("error", reject);
    req.on("aborted", () => reject(new HttpError(400, "Tải ảnh bị gián đoạn.")));
  });
  let extension;
  if (data.length >= 12 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = "png";
  else if (data.length >= 12 && data[0] === 255 && data[1] === 216 && data[2] === 255) extension = "jpg";
  else if (data.length >= 12 && ["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString("ascii"))) extension = "gif";
  else if (data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP") extension = "webp";
  if (!extension || req.headers["content-type"]?.split(";")[0] !== IMAGE_TYPES[extension]) throw new HttpError(415, "Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.");
  return { data, extension };
}

function openDatabase(databasePath) {
  if (databasePath !== ":memory:") mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS banners (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, image TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS tours (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, published INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  const columns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
  if (!columns.includes("role")) db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
  if (!columns.includes("disabled")) db.exec("ALTER TABLE users ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0");
  const sessionColumns = db.prepare("PRAGMA table_info(sessions)").all().map((column) => column.name);
  if (!sessionColumns.includes("audience")) {
    db.exec("ALTER TABLE sessions ADD COLUMN audience TEXT NOT NULL DEFAULT 'legacy'");
    // Shared sessions from the previous version cannot be reused in either portal.
    db.exec("DELETE FROM sessions WHERE audience = 'legacy'");
  }
  if (!db.prepare("SELECT 1 FROM settings WHERE key = 'content_seeded'").get()) {
    const products = JSON.parse(readFileSync(new URL("../src/mock/products.json", import.meta.url), "utf8"));
    db.exec("BEGIN");
    try {
      for (const item of products) {
        const data = { name: item.name, image: item.image, summary: item.summary ?? "", content: item.details?.map((detail) => detail.content).join("\n\n") ?? "", publishedAt: item.publishedAt ?? "", categoryId: item.categoryId, type: "news" };
        db.prepare("INSERT INTO articles (id, data, published) VALUES (?, ?, 1)").run(item.id, JSON.stringify(data));
      }
      for (let i = 1; i <= 2; i++) db.prepare("INSERT INTO banners (title, image) VALUES (?, ?)").run(`FirstClass Travel ${i}`, `/images/banners/banner-${i}.jpg`);
      db.prepare("INSERT INTO settings VALUES ('content_seeded', '1')").run();
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); db.close(); throw error; }
  }
  return db;
}

const defaultDatabasePath = () => process.env.DB_PATH ?? fileURLToPath(new URL("./data/firstclass.sqlite", import.meta.url));

export async function provisionAdmin({ email, password, name = "Quản trị FirstClass", databasePath = defaultDatabasePath() }) {
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) throw new Error("Admin requires a valid email and a 12–128 character password.");
  const db = openDatabase(databasePath);
  try {
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) throw new Error("Email đã tồn tại. Chọn email riêng cho tài khoản quản trị.");
    const id = randomUUID();
    db.prepare("INSERT INTO users (id, name, email, password_hash, created_at, role) VALUES (?, ?, ?, ?, ?, 'admin')").run(id, name, email, await passwordHash(password), Date.now());
    return { id, email, name, role: "admin" };
  } finally { db.close(); }
}

const articleRow = (row) => ({ ...JSON.parse(row.data), id: row.id, published: Boolean(row.published) });
const tourRow = articleRow;
function imageUrl(value) {
  if (typeof value !== "string" || value.length > 2000 || !(value.startsWith("/images/") || value.startsWith("https://") || MEDIA_PATH.test(value))) throw new HttpError(400, "Hãy chọn ảnh từ máy hoặc nhập URL ảnh HTTPS.");
  if (value.startsWith("https://")) {
    try { const url = new URL(value); if (url.username || url.password) throw new Error(); } catch { throw new HttpError(400, "URL ảnh không hợp lệ."); }
  }
  return value;
}

export function createAuthServer(options = {}) {
  const databasePath = options.databasePath ?? defaultDatabasePath();
  const db = openDatabase(databasePath);
  const uploadsDirectory = options.uploadsDirectory ?? resolve(dirname(databasePath === ":memory:" ? defaultDatabasePath() : databasePath), "uploads");
  const origins = new Set(options.allowedOrigins ?? (process.env.AUTH_ALLOWED_ORIGINS ?? "http://127.0.0.1:5173,http://localhost:5173").split(",").map((x) => x.trim()).filter(Boolean));
  const secure = options.secureCookies ?? (process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production");
  const sameSite = process.env.COOKIE_SAME_SITE ?? "Lax";
  if (!["Lax", "Strict", "None"].includes(sameSite) || (sameSite === "None" && !secure)) {
    db.close();
    throw new Error("COOKIE_SAME_SITE must be Lax/Strict/None; None requires Secure.");
  }
  if (process.env.NODE_ENV === "production" && (!secure || !process.env.AUTH_ALLOWED_ORIGINS)) {
    db.close();
    throw new Error("Production requires secure cookies and AUTH_ALLOWED_ORIGINS.");
  }
  const cookieName = (audience) => `${secure ? "__Host-" : ""}firstclass_${audience}_session`;
  const cookie = (token, maxAge, audience) => `${cookieName(audience)}=${token}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  const getToken = (req, audience) => (req.headers.cookie ?? "").split(";").map((x) => x.trim()).find((x) => x.startsWith(`${cookieName(audience)}=`))?.slice(cookieName(audience).length + 1) ?? "";
  const attempts = new Map();
  // Always do a password derivation, including for unknown accounts.
  const dummyHash = passwordHash(randomBytes(32).toString("hex"));
  function rateLimit(req, res) {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = req.socket.remoteAddress;
    const entry = attempts.get(key) ?? { count: 0, until: now + 15 * 60 * 1000 };
    if (entry.count >= (options.rateLimit ?? 20)) {
      res.setHeader("Retry-After", Math.ceil((entry.until - now) / 1000));
      throw new HttpError(429, "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.");
    }
    entry.count += 1;
    attempts.set(key, entry);
  }
  function createSession(userId, req, res, audience) {
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires_at <= ? OR (token_hash = ? AND audience = ?)").run(Date.now(), hashToken(getToken(req, audience)), audience);
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, audience) VALUES (?, ?, ?, ?)").run(hashToken(token), userId, Date.now() + SESSION_SECONDS * 1000, audience);
    res.setHeader("Set-Cookie", cookie(token, SESSION_SECONDS, audience));
  }
  const getSessionUser = (req, audience) => db.prepare("SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ? AND users.disabled = 0 AND sessions.audience = ? AND users.role = ?").get(hashToken(getToken(req, audience)), Date.now(), audience, audience);
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Vary", "Origin");
    const send = (status, body) => { res.writeHead(status); res.end(JSON.stringify(body)); };
    try {
      const origin = req.headers.origin;
      if (origin && !origins.has(origin)) throw new HttpError(403, "Nguồn truy cập không được phép.");
      if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
      const requestUrl = new URL(req.url, "http://localhost");
      const path = requestUrl.pathname;
      const isAdminAuth = path.startsWith("/api/admin/auth/");
      const authPath = isAdminAuth ? path.replace("/api/admin/auth/", "/api/auth/") : path;
      const audience = isAdminAuth ? "admin" : "customer";
      if (req.method === "POST" && req.headers["sec-fetch-site"] === "cross-site" && !origin) throw new HttpError(403, "Nguồn truy cập không được phép.");
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.writeHead(204); res.end(); return;
      }
      if (req.method === "GET" && path === "/api/health") return send(200, { ok: true });
      const media = path.match(MEDIA_PATH);
      if (req.method === "GET" && media) {
        const file = resolve(uploadsDirectory, media[1]);
        if (!existsSync(file)) throw new HttpError(404, "Không tìm thấy ảnh.");
        res.setHeader("Content-Type", IMAGE_TYPES[media[2]]);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
        const stream = createReadStream(file);
        stream.on("error", () => res.destroy());
        stream.pipe(res);
        return;
      }
      if (req.method === "GET" && path === "/api/content/products") {
        return send(200, db.prepare("SELECT * FROM articles WHERE published = 1 ORDER BY id DESC").all().map((row) => {
          const item = articleRow(row);
          return { ...item, contentType: item.type, details: [{ title: "Nội dung", content: item.content }] };
        }));
      }
      if (req.method === "GET" && path === "/api/content/banners") return send(200, db.prepare("SELECT image FROM banners WHERE active = 1 ORDER BY id").all().map((row) => row.image));
      if (req.method === "GET" && path === "/api/content/tours") {
        const kind = requestUrl.searchParams.get("type");
        if (kind && !["domestic", "international", "combo"].includes(kind)) throw new HttpError(400, "Nhóm tour không hợp lệ.");
        const tours = db.prepare("SELECT * FROM tours WHERE published = 1 ORDER BY id DESC").all().map(tourRow);
        return send(200, kind ? tours.filter((tour) => tour.kind === kind) : tours);
      }
      const tourDetail = path.match(/^\/api\/content\/tours\/(\d+)$/);
      if (req.method === "GET" && tourDetail) {
        const tour = db.prepare("SELECT * FROM tours WHERE id = ? AND published = 1").get(Number(tourDetail[1]));
        if (!tour) throw new HttpError(404, "Tour không tồn tại hoặc chưa được hiển thị.");
        return send(200, tourRow(tour));
      }
      if (path.startsWith("/api/admin/") && !isAdminAuth) {
        const admin = getSessionUser(req, "admin");
        if (!admin) throw new HttpError(401, "Vui lòng đăng nhập quản trị.");
        if (admin.role !== "admin") throw new HttpError(403, "Bạn không có quyền quản trị.");
        if (req.method === "POST" && path === "/api/admin/uploads") {
          rateLimit(req, res);
          const { data, extension } = await readImage(req);
          mkdirSync(uploadsDirectory, { recursive: true });
          const filename = `${randomUUID()}.${extension}`;
          writeFileSync(resolve(uploadsDirectory, filename), data, { flag: "wx" });
          return send(201, { image: `/api/media/${filename}` });
        }
        if (req.method === "GET" && path === "/api/admin/overview") return send(200, {
          customers: db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'").get().count,
          disabled: db.prepare("SELECT COUNT(*) AS count FROM users WHERE disabled = 1").get().count,
          articles: db.prepare("SELECT COUNT(*) AS count FROM articles WHERE published = 1").get().count,
          banners: db.prepare("SELECT COUNT(*) AS count FROM banners WHERE active = 1").get().count,
        });
        if (req.method === "GET" && path === "/api/admin/users") {
          const query = (requestUrl.searchParams.get("q") ?? "").slice(0, 100);
          const page = Math.max(1, Math.min(100000, Number(requestUrl.searchParams.get("page")) || 1));
          const search = `%${query}%`;
          return send(200, {
            users: db.prepare("SELECT id, name, email, role, disabled, created_at FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT 50 OFFSET ?").all(search, search, (Math.floor(page) - 1) * 50),
            total: db.prepare("SELECT COUNT(*) AS count FROM users WHERE name LIKE ? OR email LIKE ?").get(search, search).count,
          });
        }
        if (req.method === "GET" && path === "/api/admin/articles") return send(200, { articles: db.prepare("SELECT * FROM articles ORDER BY id DESC").all().map(articleRow) });
        if (req.method === "GET" && path === "/api/admin/banners") return send(200, { banners: db.prepare("SELECT * FROM banners ORDER BY id").all().map((row) => ({ ...row, active: Boolean(row.active) })) });
        if (req.method === "GET" && path === "/api/admin/tours") return send(200, { tours: db.prepare("SELECT * FROM tours ORDER BY id DESC").all().map(tourRow) });
        if (req.method === "POST") {
          const body = await readJson(req, 131072);
          if (path === "/api/admin/tours/save") {
            const fields = { name: 200, destination: 200, duration: 100, departure: 300, summary: 1000, itinerary: 20000, included: 5000, excluded: 5000 };
            for (const [key, max] of Object.entries(fields)) if (typeof body[key] !== "string" || body[key].length > max) throw new HttpError(400, "Thông tin tour không hợp lệ hoặc quá dài.");
            if (body.name.trim().length < 3 || !body.destination.trim() || !body.duration.trim() || !["domestic", "international", "combo"].includes(body.kind) || typeof body.published !== "boolean" || !(body.price === null || (typeof body.price === "number" && Number.isFinite(body.price) && body.price >= 0 && body.price <= 1000000000))) throw new HttpError(400, "Vui lòng kiểm tra tên, nhóm tour, điểm đến, thời lượng và giá.");
            const data = JSON.stringify({ ...Object.fromEntries(Object.keys(fields).map((key) => [key, body[key].trim()])), image: imageUrl(body.image), kind: body.kind, price: body.price });
            if (body.id !== undefined) {
              if (!Number.isInteger(body.id) || !db.prepare("UPDATE tours SET data = ?, published = ? WHERE id = ?").run(data, Number(body.published), body.id).changes) throw new HttpError(404, "Không tìm thấy tour.");
              return send(200, { id: body.id });
            }
            return send(201, { id: Number(db.prepare("INSERT INTO tours (data, published) VALUES (?, ?)").run(data, Number(body.published)).lastInsertRowid) });
          }
          if (path === "/api/admin/users/status") {
            const target = db.prepare("SELECT role FROM users WHERE id = ?").get(typeof body.id === "string" ? body.id : "");
            if (!target) throw new HttpError(404, "Không tìm thấy tài khoản.");
            if (target.role !== "customer") throw new HttpError(403, "Không thể khóa tài khoản quản trị.");
            if (typeof body.disabled !== "boolean") throw new HttpError(400, "Trạng thái không hợp lệ.");
            db.exec("BEGIN");
            try {
              db.prepare("UPDATE users SET disabled = ? WHERE id = ?").run(Number(body.disabled), body.id);
              db.prepare("DELETE FROM sessions WHERE user_id = ?").run(body.id);
              db.exec("COMMIT");
            } catch (error) { db.exec("ROLLBACK"); throw error; }
            return send(200, { message: body.disabled ? "Đã khóa tài khoản và thu hồi phiên." : "Đã mở khóa tài khoản." });
          }
          if (path === "/api/admin/articles/save") {
            if (typeof body.name !== "string" || body.name.trim().length < 3 || body.name.length > 200 || typeof body.summary !== "string" || body.summary.length > 1000 || typeof body.content !== "string" || body.content.length > 20000 || !["news", "offer"].includes(body.type) || typeof body.published !== "boolean" || !Number.isInteger(body.categoryId) || body.categoryId < 1 || body.categoryId > 10 || typeof body.publishedAt !== "string" || body.publishedAt.length > 30) throw new HttpError(400, "Nội dung bài viết không hợp lệ.");
            const data = JSON.stringify({ name: body.name.trim(), summary: body.summary, content: body.content, image: imageUrl(body.image), categoryId: body.categoryId, publishedAt: body.publishedAt, type: body.type });
            if (body.id !== undefined) {
              if (!Number.isInteger(body.id) || !db.prepare("UPDATE articles SET data = ?, published = ? WHERE id = ?").run(data, Number(body.published), body.id).changes) throw new HttpError(404, "Không tìm thấy bài viết.");
              return send(200, { id: body.id });
            }
            return send(201, { id: Number(db.prepare("INSERT INTO articles (data, published) VALUES (?, ?)").run(data, Number(body.published)).lastInsertRowid) });
          }
          if (path === "/api/admin/banners/save") {
            if (typeof body.title !== "string" || body.title.trim().length < 2 || body.title.length > 200 || typeof body.active !== "boolean") throw new HttpError(400, "Banner không hợp lệ.");
            const image = imageUrl(body.image);
            if (body.id !== undefined) {
              if (!Number.isInteger(body.id) || !db.prepare("UPDATE banners SET title = ?, image = ?, active = ? WHERE id = ?").run(body.title.trim(), image, Number(body.active), body.id).changes) throw new HttpError(404, "Không tìm thấy banner.");
              return send(200, { id: body.id });
            }
            return send(201, { id: Number(db.prepare("INSERT INTO banners (title, image, active) VALUES (?, ?, ?)").run(body.title.trim(), image, Number(body.active)).lastInsertRowid) });
          }
          if (path === "/api/admin/password") {
            rateLimit(req, res);
            if (typeof body.currentPassword !== "string" || body.currentPassword.length > 128 || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 128) throw new HttpError(400, "Mật khẩu mới phải từ 12 đến 128 ký tự.");
            const [salt, expected] = admin.password_hash.split(":");
            const actual = (await passwordHash(body.currentPassword, salt)).split(":")[1];
            if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"))) throw new HttpError(401, "Mật khẩu hiện tại không đúng.");
            const encoded = await passwordHash(body.password);
            db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(encoded, admin.id);
            db.prepare("DELETE FROM sessions WHERE user_id = ?").run(admin.id);
            createSession(admin.id, req, res, "admin");
            return send(200, { message: "Đã đổi mật khẩu và thu hồi các phiên cũ." });
          }
        }
        throw new HttpError(404, "Không tìm thấy API quản trị.");
      }
      if (req.method === "GET" && authPath === "/api/auth/me") {
        const user = getSessionUser(req, audience);
        if (!user) throw new HttpError(401, "Vui lòng đăng nhập.");
        return send(200, { user: publicUser(user) });
      }
      if (req.method === "POST" && authPath.startsWith("/api/auth/")) {
        if (req.headers["sec-fetch-site"] === "cross-site" && !origin) throw new HttpError(403, "Nguồn truy cập không được phép.");
        const body = await readJson(req);
        if (authPath === "/api/auth/logout") {
          db.prepare("DELETE FROM sessions WHERE token_hash = ? AND audience = ?").run(hashToken(getToken(req, audience)), audience);
          res.setHeader("Set-Cookie", cookie("", 0, audience));
          return send(200, { message: "Đã đăng xuất." });
        }
        if (!["/api/auth/register", "/api/auth/login"].includes(authPath) || (isAdminAuth && authPath === "/api/auth/register")) throw new HttpError(404, "Không tìm thấy API.");
        rateLimit(req, res);
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = body.password;
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Email không hợp lệ.");
        if (typeof password !== "string" || password.length < 8 || password.length > 128) throw new HttpError(400, "Mật khẩu phải có từ 8 đến 128 ký tự.");
        if (authPath === "/api/auth/register") {
          const name = typeof body.name === "string" ? body.name.trim() : "";
          if (name.length < 2 || name.length > 100) throw new HttpError(400, "Họ tên phải có từ 2 đến 100 ký tự.");
          const user = { id: randomUUID(), name, email, role: "customer" };
          const encoded = await passwordHash(password);
          try {
            db.prepare("INSERT INTO users (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(user.id, name, email, encoded, Date.now());
          } catch (error) {
            if (error.errcode === 2067 || error.message.includes("UNIQUE constraint failed")) throw new HttpError(409, "Email này đã được đăng ký.");
            throw error;
          }
          createSession(user.id, req, res, "customer");
          return send(201, { user });
        }
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        const encoded = user?.password_hash ?? await dummyHash;
        const [salt, expected] = encoded.split(":");
        const actual = (await passwordHash(password, salt)).split(":")[1];
        if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex")) || !user || user.disabled || user.role !== audience) throw new HttpError(401, "Email hoặc mật khẩu không đúng.");
        createSession(user.id, req, res, audience);
        return send(200, { user: publicUser(user) });
      }
      throw new HttpError(404, "Không tìm thấy API.");
    } catch (error) {
      if (!(error instanceof HttpError)) console.error("Auth request failed:", error.message);
      if (!res.headersSent && !res.destroyed) send(error.status ?? 500, { message: error.status ? error.message : "Máy chủ gặp lỗi. Vui lòng thử lại." });
    }
  });
  server.on("close", () => db.close());
  server.requestTimeout = 15000;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createAuthServer();
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? 3001);
  server.listen(port, host, () => console.log(`FirstClass backend: http://${host}:${port}`));
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close());
}
