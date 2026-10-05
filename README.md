# FirstClass Travel

Zalo Mini App của FirstClass Travel, hỗ trợ khách hàng gửi yêu cầu đặt vé máy bay, xem tin tức và tiếp cận các dịch vụ du lịch.

## Chức năng hiện có

- Gửi yêu cầu vé máy bay một chiều hoặc khứ hồi.
- Tìm sân bay theo mã IATA, tên thành phố hoặc tên sân bay.
- Chọn ngày đi, ngày về, số người lớn, trẻ em, em bé và hạng ghế.
- Nhập họ tên, số điện thoại và ghi chú để nhân viên liên hệ tư vấn.
- Xem tin tức, danh mục dịch vụ và trang tài khoản khách hàng.
- Đăng ký, đăng nhập bằng email và mật khẩu; duy trì phiên đăng nhập và đăng xuất.

Form đặt vé gửi yêu cầu đến Google Apps Script được cấu hình trong `src/pages/flights/index.tsx`. Nhân viên FirstClass Travel kiểm tra hành trình, giá vé và liên hệ lại với khách hàng; ứng dụng hiện chưa tra giá hoặc xuất vé tự động.

## Công nghệ

React 18, TypeScript, Vite 5, Zalo Mini App SDK, ZMP UI, Jotai và Tailwind CSS.

## Chạy dự án

```bash
git clone https://github.com/ducanhnguyen9192-creator/appzalo.git
cd appzalo
npm install
```

Mở thư mục bằng Visual Studio Code có Zalo Mini App Extension, cấu hình App ID và sử dụng mục **Run / Start** để chạy thử.

Nếu đã cài Zalo Mini App CLI, có thể chạy:

```bash
npm start
```

## Backend tài khoản

Sử dụng Node.js 24 trở lên. Backend dùng SQLite tích hợp trong Node.js, không cần cài máy chủ cơ sở dữ liệu riêng.

Mở hai terminal từ thư mục dự án:

```bash
# Terminal 1: backend tại http://127.0.0.1:3001
npm run dev:backend

# Terminal 2: demo web tại http://127.0.0.1:5173
npm run dev:web
```

Trong demo, mở **Tài khoản** để đăng ký hoặc đăng nhập. Vite chuyển các yêu cầu `/api` sang backend. Dữ liệu được lưu ở `backend/data/firstclass.sqlite`, tồn tại sau khi khởi động lại và không được đưa lên GitHub.

| API | Chức năng |
| --- | --- |
| `POST /api/auth/register` | Đăng ký với `name`, `email`, `password`; tự đăng nhập sau đăng ký |
| `POST /api/auth/login` | Đăng nhập với `email`, `password` |
| `GET /api/auth/me` | Lấy tài khoản từ phiên đăng nhập |
| `POST /api/auth/logout` | Thu hồi phiên đăng nhập; gửi JSON `{}` |
| `GET /api/health` | Kiểm tra backend |

Mật khẩu được băm bằng scrypt với salt riêng. Cookie phiên có `HttpOnly`, thời hạn 7 ngày; máy chủ lưu bản băm token, kiểm tra nguồn truy cập và giới hạn lượt đăng ký/đăng nhập theo IP. Tài khoản này độc lập với tài khoản Zalo.

Kiểm tra backend:

```bash
npm run test:backend
```

Để tùy chỉnh, sao chép `backend/.env.example` thành `backend/.env`. Khi triển khai thực tế, dùng HTTPS, `NODE_ENV=production`, `COOKIE_SECURE=true`, danh sách `AUTH_ALLOWED_ORIGINS` cụ thể và ổ đĩa bền vững cho SQLite. Với frontend khác nguồn, đặt `VITE_API_URL` thành URL HTTPS của backend rồi build lại; nếu cần cookie khác site, dùng `COOKIE_SAME_SITE=None` cùng `Secure` và kiểm tra hỗ trợ cookie trong môi trường Zalo. Không đặt khóa bí mật trong biến `VITE_*`.

Backend hiện phục vụ đăng ký/đăng nhập cơ bản; chưa có xác minh email, quên mật khẩu hoặc liên kết đăng nhập Zalo. API Checkfly và việc gắn yêu cầu vé vào tài khoản chưa được tích hợp. Trước khi đưa lên môi trường thật cần kiểm tra phiên đăng nhập trong Zalo, cấu hình tên miền API, sao lưu dữ liệu và giới hạn truy cập tại reverse proxy (giới hạn trong backend hiện dựa trên IP kết nối trực tiếp).

## Cấu hình ứng dụng

- `app-config.json`: tên ứng dụng FirstClass Travel, giao diện, địa chỉ API và OA hỗ trợ.
- `src/pages/flights/index.tsx`: form yêu cầu vé máy bay và địa chỉ Google Apps Script nhận dữ liệu.
- `src/mock/airports.json`: dữ liệu sân bay phục vụ tìm kiếm.
- `src/mock/`: dữ liệu tin tức, banner và danh mục mẫu; khi chưa cấu hình `template.apiUrl`, ứng dụng sử dụng dữ liệu này.
- `src/assets/` và `src/static/`: hình ảnh, biểu tượng và tài nguyên giao diện.

File `.env` được bỏ qua khi đưa lên GitHub. Cấu hình môi trường cần được thiết lập riêng trên máy chạy dự án.

## Triển khai lên Zalo

Cấu hình App ID của FirstClass Travel trong công cụ phát triển Zalo Mini App, đăng nhập và triển khai qua mục **Deploy** của extension hoặc CLI:

```bash
zmp login
npm run deploy
```

## Cấu trúc mã nguồn

```text
src/
  components/     Thành phần giao diện dùng chung
  pages/          Các trang của ứng dụng
    flights/      Form yêu cầu vé máy bay
    home/         Trang chủ
    profile/      Trang tài khoản
    catalog/      Danh mục và nội dung chi tiết
  mock/           Dữ liệu mẫu và danh sách sân bay
  assets/         Hình ảnh, biểu tượng
  css/            Kiểu giao diện
  utils/          Hàm hỗ trợ và truy cập dữ liệu
  router.tsx      Định tuyến
  state.ts        Trạng thái ứng dụng
```

## Nguồn gốc

Dự án được phát triển từ template ZaUI Fashion của Zalo và đã tùy chỉnh cho FirstClass Travel. Thông tin bản quyền của template được giữ trong file `LICENSE`.
