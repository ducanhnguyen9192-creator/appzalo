import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
const digest = value => createHash("sha256").update(value).digest("hex");
const generic = { message: "Nếu email thuộc tài khoản khách hàng đang hoạt động, liên kết khôi phục sẽ được gửi. Kiểm tra hộp thư và thư rác; nếu chưa nhận được, hãy thử lại hoặc liên hệ hỗ trợ." };

export function customerAccountRoutes({ db, getSessionUser, createSession, passwordHash, rateLimit, mailer, HttpError }) {
  const invalid = () => new HttpError(400, "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu liên kết mới.");
  const passwordValid = value => typeof value === "string" && value.length >= 8 && value.length <= 128;
  function transaction(work) {
    db.exec("BEGIN IMMEDIATE");
    try { const result = work(); db.exec("COMMIT"); return result; } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
  function issue(user, purpose) {
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM account_tokens WHERE expires_at <= ?").run(Date.now());
    db.prepare("INSERT INTO account_tokens (token_hash,user_id,purpose,password_version,expires_at) VALUES (?,?,?,?,?)").run(digest(token), user.id, purpose, user.password_hash, Date.now() + (purpose === "verify" ? 60 : 15) * 60000);
    return token;
  }
  function tokenUser(token, purpose) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw invalid();
    const user = db.prepare("SELECT users.* FROM account_tokens JOIN users ON users.id=account_tokens.user_id WHERE token_hash=? AND purpose=? AND expires_at>? AND users.password_hash=account_tokens.password_version AND users.role='customer' AND users.disabled=0").get(digest(token), purpose, Date.now());
    if (!user) throw invalid();
    return user;
  }
  function replacePassword(user, encoded) {
    const updated = db.prepare("UPDATE users SET password_hash=? WHERE id=? AND password_hash=? AND disabled=0 AND role='customer'").run(encoded, user.id, user.password_hash);
    if (!updated.changes) throw new HttpError(409, "Tài khoản đã thay đổi. Vui lòng đăng nhập lại.");
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.id);
    db.prepare("DELETE FROM account_tokens WHERE user_id=?").run(user.id);
  }
  return async (path, body, req, res) => {
    if (!['profile', 'password', 'forgot-password', 'reset-password', 'send-verification', 'verify-email'].includes(path)) return null;
    if (['forgot-password', 'reset-password', 'verify-email'].includes(path)) {
      rateLimit(req, res, `password:${path}`);
      if (path === 'forgot-password') {
        if (!mailer) throw new HttpError(503, "Chưa cấu hình gửi email. Vui lòng liên hệ hỗ trợ để khôi phục tài khoản.");
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Email không hợp lệ.");
        rateLimit(req, res, 'password:email-delivery', digest(email));
        const user = db.prepare("SELECT * FROM users WHERE email=? AND role='customer' AND disabled=0").get(email);
        if (user) {
          const token = issue(user, 'reset');
          // Return the same response immediately for known and unknown addresses.
          Promise.resolve().then(() => mailer({ email, purpose: 'reset', token })).catch(() => {
            try { db.prepare('DELETE FROM account_tokens WHERE token_hash=?').run(digest(token)); } catch {}
            console.error('Account recovery email delivery failed.');
          });
        }
        return generic;
      }
      const purpose = path === 'verify-email' ? 'verify' : 'reset';
      const user = tokenUser(body.token, purpose);
      if (purpose === 'verify') {
        transaction(() => {
          tokenUser(body.token, purpose);
          db.prepare('UPDATE users SET email_verified=1 WHERE id=?').run(user.id);
          db.prepare("DELETE FROM account_tokens WHERE user_id=? AND purpose='verify'").run(user.id);
        });
        return { message: 'Email đã được xác minh. Bạn có thể quay lại tài khoản.' };
      }
      if (!passwordValid(body.password)) throw new HttpError(400, 'Mật khẩu phải có từ 8 đến 128 ký tự.');
      const encoded = await passwordHash(body.password);
      transaction(() => { tokenUser(body.token, purpose); replacePassword(user, encoded); });
      return { message: 'Mật khẩu đã được đặt lại. Vui lòng đăng nhập bằng mật khẩu mới.' };
    }
    const user = getSessionUser(req, 'customer');
    if (!user) throw new HttpError(401, 'Vui lòng đăng nhập tài khoản khách hàng.');
    rateLimit(req, res, `password:customer-${path}`, user.id);
    if (path === 'profile') {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      if (typeof body.phone !== 'string' || name.length < 2 || name.length > 100 || (phone && !/^\+?[\d\s().-]{7,30}$/.test(phone))) throw new HttpError(400, 'Họ tên hoặc số điện thoại không hợp lệ.');
      db.prepare('UPDATE users SET name=?,phone=? WHERE id=?').run(name, phone, user.id);
      return { user: db.prepare('SELECT * FROM users WHERE id=?').get(user.id), message: 'Thông tin tài khoản đã được lưu.' };
    }
    if (path === 'send-verification') {
      if (user.email_verified) return { message: 'Email đã được xác minh.' };
      if (!mailer) throw new HttpError(503, 'Chưa cấu hình gửi email. Bạn vẫn có thể sử dụng tài khoản.');
      const token = issue(user, 'verify');
      try { await mailer({ email: user.email, purpose: 'verify', token }); } catch {
        db.prepare('DELETE FROM account_tokens WHERE token_hash=?').run(digest(token));
        throw new HttpError(503, 'Chưa gửi được email xác minh. Vui lòng thử lại hoặc liên hệ hỗ trợ.');
      }
      return { message: 'Đã gửi liên kết xác minh. Vui lòng kiểm tra email và thư rác.' };
    }
    if (!passwordValid(body.password) || !passwordValid(body.currentPassword)) throw new HttpError(400, 'Mật khẩu phải có từ 8 đến 128 ký tự.');
    const salt = user.password_hash.split(':')[0];
    if (!timingSafeEqual(Buffer.from(await passwordHash(body.currentPassword, salt)), Buffer.from(user.password_hash))) throw new HttpError(400, 'Mật khẩu hiện tại không đúng.');
    if (body.currentPassword === body.password) throw new HttpError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại.');
    const encoded = await passwordHash(body.password);
    transaction(() => replacePassword(user, encoded));
    createSession(user.id, req, res, 'customer');
    return { user: db.prepare('SELECT * FROM users WHERE id=?').get(user.id), message: 'Đã đổi mật khẩu và kết thúc các phiên đăng nhập cũ.' };
  };
}
