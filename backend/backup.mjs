import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync, copyFileSync, existsSync, readdirSync, lstatSync, readFileSync, writeFileSync, createReadStream, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";

const mediaName = /^[a-f0-9-]{36}\.(png|jpg|webp|gif)$/;
const expectedTables = ["users", "sessions", "articles", "banners", "tours", "esims", "settings", "bookings", "transactions"];
async function checksum(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
function checkDatabase(path) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    if (Object.values(db.prepare("PRAGMA quick_check").get())[0] !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("Cơ sở dữ liệu không toàn vẹn.");
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
    if (expectedTables.some(name => !tables.has(name))) throw new Error("Không phải cơ sở dữ liệu FirstClass hợp lệ.");
    const images = new Set();
    for (const table of ["articles", "tours", "esims"]) for (const row of db.prepare(`SELECT data FROM ${table}`).all()) {
      const item = JSON.parse(row.data);
      if (typeof item.image === "string" && item.image.startsWith("/api/media/")) images.add(item.image.slice(11));
    }
    for (const row of db.prepare("SELECT image FROM banners").all()) if (row.image.startsWith("/api/media/")) images.add(row.image.slice(11));
    return images;
  } finally { db.close(); }
}
export async function createBackup(databasePath, outputRoot = join(dirname(resolve(databasePath)), "backups")) {
  databasePath = resolve(databasePath);
  if (!existsSync(databasePath)) throw new Error("Chưa có cơ sở dữ liệu để sao lưu.");
  const directory = join(resolve(outputRoot), `firstclass-${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}`);
  mkdirSync(resolve(outputRoot), { recursive: true, mode: 0o700 });
  mkdirSync(directory, { mode: 0o700 });
  const db = new DatabaseSync(databasePath, { readOnly: true });
  try { await backup(db, join(directory, "firstclass.sqlite")); } finally { db.close(); }
  const requiredImages = checkDatabase(join(directory, "firstclass.sqlite"));
  const uploads = join(dirname(databasePath), "uploads");
  mkdirSync(join(directory, "uploads"));
  const names = existsSync(uploads) ? readdirSync(uploads).filter(name => mediaName.test(name)) : [];
  for (const name of requiredImages) if (!mediaName.test(name) || !names.includes(name)) throw new Error("Thiếu ảnh nội dung, không thể xác nhận bản sao lưu.");
  for (const name of names) {
    if (!lstatSync(join(uploads, name)).isFile() || lstatSync(join(uploads, name)).isSymbolicLink()) throw new Error("Thư mục ảnh có tệp không hợp lệ.");
    copyFileSync(join(uploads, name), join(directory, "uploads", name));
  }
  const files = [];
  for (const path of ["firstclass.sqlite", ...names.map(name => `uploads/${name}`)]) {
    const fullPath = join(directory, path);
    files.push({ path, bytes: lstatSync(fullPath).size, sha256: await checksum(fullPath) });
  }
  writeFileSync(join(directory, "manifest.json"), JSON.stringify({ version: 1, createdAt: new Date().toISOString(), files }, null, 2), { flag: "wx", mode: 0o600 });
  await verifyBackup(directory);
  return directory;
}
export async function verifyBackup(directory) {
  directory = resolve(directory);
  const manifestPath = join(directory, "manifest.json");
  if (!lstatSync(manifestPath).isFile() || lstatSync(manifestPath).isSymbolicLink() || lstatSync(manifestPath).size > 10 * 1024 * 1024) throw new Error("Manifest không hợp lệ.");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.version !== 1 || !Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > 100000) throw new Error("Bản sao lưu không hợp lệ.");
  const paths = new Set();
  for (const file of manifest.files) {
    if (typeof file.path !== "string" || !(file.path === "firstclass.sqlite" || (file.path.startsWith("uploads/") && mediaName.test(file.path.slice(8)))) || paths.has(file.path) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error("Danh sách tệp không hợp lệ.");
    paths.add(file.path);
    if (file.path.startsWith("uploads/") && lstatSync(join(directory, "uploads")).isSymbolicLink()) throw new Error("Không nhận thư mục ảnh liên kết.");
    const path = join(directory, file.path), stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== file.bytes || await checksum(path) !== file.sha256) throw new Error(`Tệp bị thiếu hoặc thay đổi: ${file.path}`);
  }
  if (!paths.has("firstclass.sqlite")) throw new Error("Thiếu cơ sở dữ liệu.");
  for (const name of checkDatabase(join(directory, "firstclass.sqlite"))) if (!paths.has(`uploads/${name}`)) throw new Error("Thiếu ảnh được tham chiếu trong cơ sở dữ liệu.");
  return manifest;
}
export async function restoreBackup(directory, targetDirectory) {
  const manifest = await verifyBackup(directory);
  const target = resolve(targetDirectory);
  if (existsSync(target)) throw new Error("Thư mục khôi phục phải là thư mục mới, không ghi đè dữ liệu đang chạy.");
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  mkdirSync(target, { mode: 0o700 });
  try {
    mkdirSync(join(target, "uploads"));
    for (const file of manifest.files) copyFileSync(join(resolve(directory), file.path), join(target, file.path));
    const db = new DatabaseSync(join(target, "firstclass.sqlite"));
    try {
      db.exec("PRAGMA journal_mode=DELETE; DELETE FROM sessions;");
      if (db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='account_tokens'").get()) db.exec("DELETE FROM account_tokens");
    } finally { db.close(); }
    checkDatabase(join(target, "firstclass.sqlite"));
    return join(target, "firstclass.sqlite");
  } catch (error) { rmSync(target, { recursive: true, force: true }); throw error; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, directory, target] = process.argv.slice(2);
    if (command === "create") console.log(await createBackup(process.env.DB_PATH ?? fileURLToPath(new URL("./data/firstclass.sqlite", import.meta.url)), directory));
    else if (command === "verify" && directory) { const manifest = await verifyBackup(directory); console.log(`Hợp lệ: ${manifest.files.length} tệp · ${manifest.createdAt}`); }
    else if (command === "restore" && directory && target) console.log(await restoreBackup(directory, target));
    else throw new Error("Dùng create [thư mục lưu], verify <bản sao>, hoặc restore <bản sao> <thư mục mới>.");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
