import nodemailer from "nodemailer";

export function createAccountMailer(env = process.env) {
  if (!env.SMTP_HOST || !env.SMTP_FROM || !env.APP_PUBLIC_URL) return null;
  const base = new URL(env.APP_PUBLIC_URL);
  if (base.username || base.password || base.search || base.hash || (base.protocol !== "https:" && !(env.NODE_ENV !== "production" && base.protocol === "http:" && ["localhost", "127.0.0.1"].includes(base.hostname)))) throw new Error("APP_PUBLIC_URL requires HTTPS (localhost HTTP is allowed in development).");
  const port = Number(env.SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASSWORD)) throw new Error("Invalid SMTP configuration.");
  const secure = env.SMTP_SECURE === "true" || port === 465;
  const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port, secure, requireTLS: !secure, auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000, disableFileAccess: true, disableUrlAccess: true });
  return async ({ email, purpose, token }) => {
    const url = new URL(`${base.pathname.replace(/\/$/, "")}/${purpose === "verify" ? "verify-email" : "reset-password"}`, base.origin);
    url.hash = `token=${token}`;
    const title = purpose === "verify" ? "Xác minh email FirstClass Travel" : "Đặt lại mật khẩu FirstClass Travel";
    const result = await transport.sendMail({ from: env.SMTP_FROM, to: email, subject: title, text: `${title}\n\nMở liên kết và xác nhận trên trang:\n${url.href}\n\nLiên kết dùng một lần, hết hạn sau ${purpose === "verify" ? "60" : "15"} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.\nFirstClass Travel` });
    if (!result.accepted?.length) throw new Error("Email was not accepted.");
  };
}
