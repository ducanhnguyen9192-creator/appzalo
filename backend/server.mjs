import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const hashToken = (value) => createHash("sha256").update(value).digest("hex");
const publicUser = (row) => ({ id: row.id, name: row.name, email: row.email });
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function passwordHash(password, salt = randomBytes(16).toString("hex")) {
  const key = await deriveKey(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `${salt}:${key.toString("hex")}`;
}

async function readJson(req) {
  if (!req.headers["content-type"]?.startsWith("application/json")) {
    throw new HttpError(415, "Yêu cầu phải sử dụng JSON.");
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8192) throw new HttpError(413, "Dữ liệu quá dài.");
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new HttpError(400, "Dữ liệu không hợp lệ."); }
}

export function createAuthServer(options = {}) {
  const databasePath = options.databasePath ?? process.env.DB_PATH ?? fileURLToPath(new URL("./data/firstclass.sqlite", import.meta.url));
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
  `);
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
  const cookieName = secure ? "__Host-firstclass_session" : "firstclass_session";
  const cookie = (token, maxAge) => `${cookieName}=${token}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
  const getToken = (req) => (req.headers.cookie ?? "").split(";").map((x) => x.trim()).find((x) => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? "";
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
  function createSession(userId, req, res) {
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE expires_at <= ? OR token_hash = ?").run(Date.now(), hashToken(getToken(req)));
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(hashToken(token), userId, Date.now() + SESSION_SECONDS * 1000);
    res.setHeader("Set-Cookie", cookie(token, SESSION_SECONDS));
  }
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
      const path = new URL(req.url, "http://localhost").pathname;
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.writeHead(204); res.end(); return;
      }
      if (req.method === "GET" && path === "/api/health") return send(200, { ok: true });
      if (req.method === "GET" && path === "/api/auth/me") {
        const user = db.prepare("SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?").get(hashToken(getToken(req)), Date.now());
        if (!user) throw new HttpError(401, "Vui lòng đăng nhập.");
        return send(200, { user: publicUser(user) });
      }
      if (req.method === "POST" && path.startsWith("/api/auth/")) {
        if (req.headers["sec-fetch-site"] === "cross-site" && !origin) throw new HttpError(403, "Nguồn truy cập không được phép.");
        const body = await readJson(req);
        if (path === "/api/auth/logout") {
          db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(getToken(req)));
          res.setHeader("Set-Cookie", cookie("", 0));
          return send(200, { message: "Đã đăng xuất." });
        }
        if (!["/api/auth/register", "/api/auth/login"].includes(path)) throw new HttpError(404, "Không tìm thấy API.");
        rateLimit(req, res);
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = body.password;
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Email không hợp lệ.");
        if (typeof password !== "string" || password.length < 8 || password.length > 128) throw new HttpError(400, "Mật khẩu phải có từ 8 đến 128 ký tự.");
        if (path === "/api/auth/register") {
          const name = typeof body.name === "string" ? body.name.trim() : "";
          if (name.length < 2 || name.length > 100) throw new HttpError(400, "Họ tên phải có từ 2 đến 100 ký tự.");
          const user = { id: randomUUID(), name, email };
          const encoded = await passwordHash(password);
          try {
            db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?)").run(user.id, name, email, encoded, Date.now());
          } catch (error) {
            if (error.errcode === 2067 || error.message.includes("UNIQUE constraint failed")) throw new HttpError(409, "Email này đã được đăng ký.");
            throw error;
          }
          createSession(user.id, req, res);
          return send(201, { user });
        }
        const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
        const encoded = user?.password_hash ?? await dummyHash;
        const [salt, expected] = encoded.split(":");
        const actual = (await passwordHash(password, salt)).split(":")[1];
        if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex")) || !user) throw new HttpError(401, "Email hoặc mật khẩu không đúng.");
        createSession(user.id, req, res);
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
