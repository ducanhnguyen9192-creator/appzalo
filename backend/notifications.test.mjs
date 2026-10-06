import { test } from "node:test";
import assert from "node:assert/strict";
import { currentNotice, closeNotice, notified, showNotice, subscribeNotices } from "../src/utils/notifications.ts";

test("operation notifications follow confirmed outcomes, preserve errors and queue until closed", async () => {
  let updates = 0;
  const unsubscribe = subscribeNotices(() => updates++);
  let finish;
  const pending = notified(() => new Promise((resolve) => { finish = resolve; }), () => ({ title: "Đã tiếp nhận", message: "Đã lưu" }));
  assert.equal(currentNotice(), null);
  finish({ id: "request-1" });
  assert.deepEqual(await pending, { id: "request-1" });
  const first = currentNotice();
  assert.equal(first.kind, "success");
  const error = new Error("Mật khẩu không đúng");
  await assert.rejects(notified(async () => { throw error; }, () => ({ title: "Không được hiện", message: "" }), "Đăng nhập chưa thành công"), (caught) => caught === error);
  assert.equal(currentNotice().id, first.id);
  closeNotice(first.id);
  assert.equal(currentNotice().kind, "error");
  assert.equal(currentNotice().message, error.message);
  closeNotice(currentNotice().id);
  assert.equal(currentNotice(), null);
  const before = updates;
  unsubscribe();
  showNotice("success", "Đã ghi nhận", "Giao dịch đã lưu");
  assert.equal(updates, before);
  closeNotice(currentNotice().id);
});
