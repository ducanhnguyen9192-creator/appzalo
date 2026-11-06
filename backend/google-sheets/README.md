# Kích hoạt danh sách gọi xác nhận

Đích cố định: https://docs.google.com/spreadsheets/d/1rorIH0Ema2uM1DcpxBI35XDlJxx8nAF0TWrkBU2g32c/edit?gid=0 (tab có ID 0).

## Cài đặt một lần

1. Mở file Google Sheets bằng tài khoản có quyền sửa → **Tiện ích mở rộng → Apps Script**. Chép toàn bộ `Code.gs` trong thư mục này vào trình soạn thảo, lưu lại.
2. Tạo chuỗi bí mật ngẫu nhiên bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` trên máy quản trị. Trong Apps Script → **Project Settings → Script properties**, thêm `BOOKING_SHEETS_SECRET` với chuỗi này. Không gửi chuỗi bí mật vào chat hay đưa vào frontend.
3. **Deploy → New deployment → Web app**: Execute as **Me**, Who has access **Anyone**, rồi cấp quyền Google Sheets cho script. Lấy URL kết thúc bằng `/exec`. Chỉ endpoint nhận dữ liệu được truy cập công khai; không cần công khai nội dung Sheet. Nếu tổ chức không cho phép Web app kiểu này, cần quản trị Google Workspace hỗ trợ cấu hình.
4. Trong `backend/.env`, thêm `BOOKING_SHEETS_URL=<URL /exec>` và `BOOKING_SHEETS_SECRET=<chuỗi bước 2>`. Khởi động lại backend xử lý `/api/bookings` (thường `npm run dev:backend`, hoặc `npm run dev:app-api` khi dùng worker hãng riêng).
5. Gửi một yêu cầu thử qua app với tài khoản thử. Kiểm tra có đúng một dòng và cột **Trạng thái gọi** là **Chờ gọi**. Nhân viên điền trạng thái gọi và thời gian gọi. Xóa dòng thử sau khi kiểm tra xong.

Script chỉ khởi tạo tiêu đề khi tab trống. Nếu tab có dữ liệu với tiêu đề khác, script trả `header_mismatch` và không sửa dữ liệu. Khi đó cần đối chiếu cấu trúc hiện tại để điều chỉnh ánh xạ trước khi bật đồng bộ; không xóa dữ liệu cũ. Tiêu đề yêu cầu nằm trong `HEADERS` của `Code.gs`.

## Hành vi

### Cập nhật bảng đang có dữ liệu

Thay mã Apps Script bằng `Code.gs`, lưu và chạy `upgradeBookingSheet`. Hàm tạo tab sao lưu trước khi bỏ hai cột **Nhân viên phụ trách**, **Ghi chú xác nhận** và chuyển phần giữ chỗ do hệ thống ghép vào ghi chú sang **Thông tin giữ chỗ**. Ghi chú khách tự nhập và thời gian gọi được giữ nguyên. Tiêu đề lạ bị từ chối trước khi sửa.

Cập nhật deployment hiện có sang phiên bản mới trong **Manage deployments** để giữ nguyên URL `/exec`. Khởi động lại backend khi áp dụng bản backend mới. Script vẫn xử lý được payload cũ đang chờ gửi.

Số tiền trong giá tham khảo và tổng tiền hãng hiển thị dạng `1,672,381 VND`. Bảng dùng Arial 10, tiêu đề xanh đậm, dòng xen kẽ, bộ lọc, cố định tiêu đề và ba cột đầu, xuống dòng tự động. Trạng thái gọi có danh sách chọn và màu theo trạng thái. Chạy lại `upgradeBookingSheet` để làm mới định dạng; mỗi lần chạy tạo một tab sao lưu.

- Áp dụng cho yêu cầu đặt vé mới từ `/api/bookings`, không tự xuất dữ liệu khách cũ, tour hoặc eSIM.
- Backend xác thực phiên khách và kiểm tra tên, định dạng điện thoại, ngày bay, số khách, hành trình và chuyến đã chọn trước khi lưu. Đây không phải xác minh danh tính/OTP hoặc xác nhận giữ chỗ với hãng.
- Booking và hàng đợi SQLite được lưu trong cùng giao dịch. Khi chưa cấu hình Google, yêu cầu mới vẫn xếp hàng; sau khi cấu hình sẽ gửi các yêu cầu này. Khi Google lỗi, khách vẫn gửi được và nhân viên vẫn xem được trong Admin.
- Thử gửi ngay khi tiếp nhận, khi khởi động và mỗi 15 giây. Lỗi được thử lại sau 30 giây, tăng dần tối đa một giờ. Dữ liệu hàng đợi nằm cùng database nên vẫn còn sau khi khởi động lại. Máy chủ cần chạy để xử lý hàng đợi.
- Google khóa ghi và tìm mã yêu cầu trước khi thêm dòng. Gửi lại không tạo bản sao hoặc ghi đè ghi chú nhân viên. Không xóa/sửa cột mã yêu cầu; nếu xóa mã trong lúc còn lượt gửi lại, có thể phát sinh dòng mới.
- Đồng bộ một chiều lúc tiếp nhận; chỉnh trạng thái trên Sheet không cập nhật Admin và ngược lại. Số điện thoại giữ số 0 đầu; dữ liệu khách được ghi thành văn bản để không chạy công thức.
- Cột email lấy từ tài khoản đã đăng nhập, không phải địa chỉ tùy ý gửi từ form. Chỉ chia sẻ Sheet với nhân viên cần xử lý.

## Kiểm tra khi không thấy dòng

Kiểm tra URL `/exec`, hai giá trị secret giống nhau, quyền thực thi của Web app và tiêu đề tab 0. Khi sửa mã Apps Script, tạo phiên bản mới trong **Manage deployments**. Backend ghi cảnh báo chung khi gửi lỗi, không ghi thông tin khách hay secret.

Có thể kiểm tra hàng đợi bằng SQLite: `SELECT booking_id, attempts, next_attempt, synced_at, last_error FROM booking_sheet_outbox;`. `synced_at IS NULL` là chưa xác nhận ghi thành công; không tự xóa hàng đợi để giải quyết lỗi.

Tài liệu Google: https://developers.google.com/apps-script/guides/web
