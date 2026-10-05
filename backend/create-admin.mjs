import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { provisionAdmin } from "./server.mjs";

const email = process.argv[2] ?? "admin@firstclass.local";
const path = fileURLToPath(new URL("./data/admin-access.txt", import.meta.url));
if (existsSync(path)) throw new Error("File admin-access.txt đã tồn tại. Cất file này trước khi tạo quản trị viên khác.");
const password = randomBytes(24).toString("base64url");
await provisionAdmin({ email, password });
mkdirSync(fileURLToPath(new URL("./data/", import.meta.url)), { recursive: true });
writeFileSync(path, `FirstClass Travel — tài khoản quản trị\n\nTrang đăng nhập: http://127.0.0.1:5173/admin\nEmail: ${email}\nMật khẩu ban đầu: ${password}\n\nĐổi mật khẩu trong mục Bảo mật sau khi đăng nhập.\nFile này chỉ lưu trên máy, không được đưa lên GitHub.\n`, { mode: 0o600, flag: "wx" });
console.log(`Đã tạo quản trị viên ${email}. Xem mật khẩu ban đầu trong backend/data/admin-access.txt.`);
