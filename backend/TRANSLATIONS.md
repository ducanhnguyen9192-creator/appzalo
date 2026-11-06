# Ngôn ngữ

Ứng dụng hỗ trợ tiếng Việt và tiếng Anh. Chọn English đổi cả giao diện lẫn nội dung tour/eSIM, không đổi tiền tệ hoặc dữ liệu giao dịch.

## Bản dịch lưu sẵn

- `src/i18n/seeds.json` chứa bản dịch giao diện, thông báo, nhãn biểu mẫu và tên quốc gia. Tất cả câu trong `catalog.json` hiện có bản dịch tiếng Anh.
- `src/i18n/content-en.json` chứa bản dịch tên, mô tả, lịch trình, dịch vụ bao gồm và hướng dẫn của các tour/eSIM mẫu hiện có.
- Bản dịch được đóng gói vào frontend, dùng được ngay cả khi API từ điển không hoạt động. Bản dịch đóng gói được ưu tiên để API cũ không ghi đè chúng.
- Backend dùng cùng từ điển và đọc thêm bảng SQLite `translations`; không gọi dịch vụ dịch bên ngoài.
- Chỉ đổi văn bản hiển thị. ID, giá, giá trị biểu mẫu và dữ liệu gửi đặt dịch vụ giữ nguyên. Tìm kiếm nhận cả tên tiếng Việt lẫn tên tiếng Anh.
- Nội dung mới hoặc đã sửa cần bổ sung bản dịch theo đúng chuỗi nguồn vào từ điển hoặc bảng `translations`. Chuỗi chưa có bản dịch hiển thị nguyên văn, không tự động dịch hay bịa nội dung.
- Khi sửa giao diện, chạy `npm run i18n:extract`, bổ sung bản dịch rồi build lại. Khi sửa từ điển backend, khởi động lại backend để API nạp bản mới.

## Kiểm tra

`npm run test:i18n` kiểm tra độ phủ từ điển, nội dung các gói, giữ nguyên dữ liệu biểu mẫu, chuyển ngôn ngữ và API từ điển không hoạt động trên desktop/mobile. `npm run build:web` tạo bản build web.
