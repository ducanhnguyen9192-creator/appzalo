# FirstClass Travel

Zalo Mini App của FirstClass Travel, hỗ trợ khách hàng gửi yêu cầu đặt vé máy bay, xem tin tức và tiếp cận các dịch vụ du lịch.

## Chức năng hiện có

- Gửi yêu cầu vé máy bay một chiều hoặc khứ hồi.
- Tìm sân bay theo mã IATA, tên thành phố hoặc tên sân bay.
- Chọn ngày đi, ngày về, số người lớn, trẻ em, em bé và hạng ghế.
- Nhập họ tên, số điện thoại và ghi chú để nhân viên liên hệ tư vấn.
- Xem tin tức, danh mục dịch vụ và trang tài khoản khách hàng.
- Đăng ký, đăng nhập bằng email và mật khẩu; duy trì phiên đăng nhập và đăng xuất.

Form đặt vé yêu cầu đăng nhập và lưu yêu cầu vào backend theo tài khoản khách hàng. Nhân viên FirstClass Travel xem và xử lý trong admin, kiểm tra hành trình, giá vé và liên hệ lại; ứng dụng hiện chưa tra giá hoặc xuất vé tự động. Form không còn gửi tới Google Apps Script.

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

Backend chưa có xác minh email, quên mật khẩu hoặc liên kết đăng nhập Zalo. API Checkfly chưa được tích hợp. Trước khi đưa lên môi trường thật cần kiểm tra phiên đăng nhập trong Zalo, cấu hình tên miền API, sao lưu dữ liệu và giới hạn truy cập tại reverse proxy (giới hạn trong backend hiện dựa trên IP kết nối trực tiếp).

## Trang quản trị

Mở `http://127.0.0.1:5173/admin` khi backend và demo web đang chạy. Trang quản trị có:

- Tổng quan số khách hàng, tài khoản bị khóa, bài viết và banner đang hiển thị.
- Tìm tài khoản theo tên/email, xem ngày tạo và khóa/mở khóa khách hàng. Khóa sẽ thu hồi các phiên đăng nhập hiện có.
- Thêm/sửa tin tức và ưu đãi, lưu bản nháp hoặc bật hiển thị.
- Thêm/sửa banner và bật/tắt hiển thị; chọn ảnh trực tiếp từ máy hoặc điện thoại, có ảnh xem trước.
- Đổi mật khẩu quản trị; các phiên cũ bị thu hồi.

Tạo tài khoản quản trị riêng trên máy chủ bằng lệnh:

```bash
npm run admin:create -- admin@firstclass.local
```

Mật khẩu ngẫu nhiên được ghi vào `backend/data/admin-access.txt`. File này và cơ sở dữ liệu bị loại khỏi GitHub và bị chặn truy cập qua Vite. Mở file tại máy để lấy mật khẩu ban đầu rồi đổi trong mục **Bảo mật**. Script không ghi đè tài khoản hoặc tự nâng quyền tài khoản khách hàng đã tồn tại. Tài khoản quản trị không được tạo tự động khi khởi động; trên máy triển khai mới cần chạy lệnh tạo riêng.

API `/api/admin/*` yêu cầu phiên có vai trò `admin`; đăng ký công khai luôn tạo vai trò `customer`, kể cả khi yêu cầu gửi thêm trường `role`. Mật khẩu hoặc bản băm không được trả về trong danh sách tài khoản. Không thể khóa tài khoản quản trị từ giao diện.

Đăng nhập quản trị sử dụng `/api/admin/auth/login`, `/api/admin/auth/me` và `/api/admin/auth/logout` với cookie riêng `firstclass_admin_session`. Trang khách hàng sử dụng `/api/auth/*` và cookie `firstclass_customer_session`. Phiên được ràng buộc với từng khu vực trên máy chủ; đăng nhập/đăng xuất một bên không ảnh hưởng bên kia. Tài khoản quản trị chỉ đăng nhập tại `/admin`, tài khoản khách hàng tại `/profile`. Khi cập nhật từ phiên dùng chung cũ, các phiên cũ được thu hồi và cần đăng nhập lại; tài khoản và mật khẩu vẫn giữ nguyên.

Tin tức và banner của app được lấy từ `/api/content/products` và `/api/content/banners`, chỉ trả về nội dung đã bật hiển thị. Nội dung mẫu được nạp vào SQLite một lần khi khởi tạo. Sau khi sửa trong admin, tải lại ứng dụng để cập nhật dữ liệu. Demo cần backend để tải tin tức và banner. Tài khoản, nội dung đã sửa và mật khẩu quản trị chỉ nằm trong cơ sở dữ liệu tại máy chủ, không được đồng bộ bằng Git; cần sao lưu SQLite riêng. Chưa tự lấy ưu đãi từ Checkfly.

### Tải ảnh từ máy

Trong **Banner → Sửa / Thêm banner**, bấm **Chọn tệp** tại mục **Ảnh banner**, chọn ảnh, chờ ảnh xem trước rồi bấm **Lưu banner**. Ảnh bài viết cũng dùng cùng bộ chọn file. Hỗ trợ JPG, PNG, WebP, GIF tối đa 5 MB; backend kiểm tra định dạng từ nội dung file và chỉ nhận upload từ phiên quản trị. Có thể tiếp tục nhập URL ảnh trong mục mở rộng bên dưới.

Ảnh được gửi đến `POST /api/admin/uploads`, lưu trong `backend/data/uploads/` (cùng thư mục với SQLite khi đổi `DB_PATH`) và phục vụ qua `/api/media/<mã ảnh>`. Không cần thêm ảnh vào `images`, sửa code hay commit ảnh. Chọn ảnh chỉ tải file lên; nội dung công khai thay đổi sau khi bấm Lưu. Ảnh đã tải lên có URL công khai, kể cả khi bài viết/banner còn là bản nháp; không dùng chức năng này để lưu tài liệu riêng tư. Khi triển khai thật, dùng ổ đĩa bền vững và sao lưu cả SQLite lẫn thư mục uploads. Ảnh đã tải lên chưa dùng hoặc đã thay thế được giữ lại, chưa tự động dọn.

## Cấu hình ứng dụng

- `app-config.json`: tên ứng dụng FirstClass Travel, giao diện, địa chỉ API và OA hỗ trợ.
- `src/pages/flights/index.tsx`: form gửi yêu cầu vé máy bay vào backend theo tài khoản khách hàng.
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

## Quản lý tour du lịch

Trang chủ có mục **Tour có sẵn**. Các tiện ích **Tour trong nước**, **Tour quốc tế**, **Combo du lịch** mở `/tours?type=domestic`, `/tours?type=international`, `/tours?type=combo`. Danh sách hỗ trợ tìm tên tour/điểm đến; mỗi tour mở trang chi tiết `/tours/:id` với giá, thời lượng, lịch khởi hành, lịch trình và dịch vụ bao gồm/chưa bao gồm.

Trong **Admin → Tour du lịch → Thêm tour**, chọn nhóm, nhập thông tin, chọn ảnh từ máy, bật **Hiển thị tour trong ứng dụng** rồi bấm **Lưu tour**. Bỏ chọn hiển thị để giữ bản nháp hoặc ẩn tour. Giá để trống sẽ hiện “Giá liên hệ”. Tải lại ứng dụng sau khi lưu. Danh sách ban đầu trống, cần nhập tour thực tế trước khi hiển thị.

Tour được lưu trong SQLite. API công khai `GET /api/content/tours` (lọc bằng `type`) và `GET /api/content/tours/:id` chỉ trả tour đã bật hiển thị. API quản trị `GET /api/admin/tours` và `POST /api/admin/tours/save` yêu cầu phiên quản trị. Dữ liệu tour chưa tự đồng bộ từ Checkfly.

## Quản lý eSIM

Mục **eSIM** trong tiện ích mở `/esims`, hiển thị các gói đã công khai và hỗ trợ tìm theo tên gói/quốc gia. Trang chủ có mục **eSIM du lịch**; mỗi gói mở `/esims/:id` với vùng phủ sóng, dung lượng, thời hạn, giá, nhà mạng, điều kiện kích hoạt, hướng dẫn và lưu ý.

Vào **Admin → eSIM → Thêm gói eSIM**, nhập thông tin và chọn ảnh từ máy, bật **Hiển thị gói eSIM trong ứng dụng**, bấm **Lưu gói eSIM** rồi tải lại ứng dụng. Có thể sửa và ẩn gói bằng cách bỏ chọn hiển thị. Danh sách ban đầu trống; giá để trống hiển thị “Giá liên hệ”.

Dữ liệu lưu trong SQLite. API công khai `GET /api/content/esims` và `GET /api/content/esims/:id` chỉ trả gói đã bật hiển thị. Quản trị sử dụng `GET /api/admin/esims`, `POST /api/admin/esims/save`. Đây là danh mục thông tin, chưa có thanh toán, cấp mã kích hoạt hoặc đồng bộ nhà cung cấp eSIM. Không nhập mã kích hoạt riêng của khách hàng vào nội dung công khai.

## Dữ liệu mẫu tour và eSIM

Sau khi backend đã khởi tạo cơ sở dữ liệu, có thể bổ sung danh mục minh họa bằng:

```bash
npm run content:sample
```

Lệnh thêm 4 tour (Đà Nẵng – Hội An, Đà Lạt, Dubai, combo Phú Quốc) và 4 gói eSIM (Nhật Bản, Hàn Quốc, Thái Lan, Singapore), bật hiển thị trên trang chủ và danh mục. Tên và nội dung ghi rõ là mẫu, ảnh minh họa và giá để trống để hiện “Giá liên hệ”; chưa phải dịch vụ được xác nhận mở bán.

Lệnh giữ nguyên nội dung đã có và chỉ nạp một lần. Chạy lại không tạo bản sao hoặc bật lại các mẫu đã ẩn. Có thể chỉnh sửa, thay ảnh hoặc ẩn từng mục trong Admin. Dữ liệu nằm trong SQLite tại máy chạy, không được đưa lên GitHub; trên máy mới cần chạy lệnh riêng sau khi khởi tạo backend.

## Lịch sử giao dịch và yêu cầu đặt vé

Mở **Tài khoản → Lịch sử giao dịch** hoặc `/history`. Trang có hai mục: yêu cầu đặt vé (mở từng yêu cầu để xem thông tin và phản hồi), giao dịch đã ghi nhận. Khách hàng chỉ xem dữ liệu của phiên tài khoản mình; không dựa trên email/số điện thoại gửi từ trình duyệt. Danh sách phân trang 20 mục và có nút làm mới.

Form `/flights` hỗ trợ đăng nhập tại chỗ, lưu yêu cầu vào `POST /api/bookings` và trả mã yêu cầu sau khi backend xác nhận. Gửi lại cùng mã/nội dung không tạo bản sao. `GET /api/bookings` và `GET /api/transactions` yêu cầu cookie khách hàng. Dữ liệu nằm trong SQLite và cần sao lưu; các yêu cầu từng gửi sang Google Script chưa được nhập vào lịch sử.

Trong **Admin → Yêu cầu & giao dịch**, nhân viên xem yêu cầu, cập nhật trạng thái (đã tiếp nhận/đang xử lý/đã báo giá/đã xuất vé/đã hủy), nhập phản hồi cho khách hàng và ghi nhận khoản thanh toán đã xác nhận nhận được. Mã chứng từ trùng trong cùng yêu cầu không tạo thêm giao dịch. Ghi chú giao dịch được hiển thị cho khách hàng. Chức năng ghi nhận không thực hiện thanh toán, tự xuất vé hoặc tự đối soát ngân hàng; trạng thái “Đã xuất vé” do quản trị xác nhận. Hiện chưa có hoàn tiền/sửa chứng từ; không ghi giao dịch thử nghiệm vào tài khoản khách hàng thực tế.

API quản trị: `GET /api/admin/bookings?page=1`, `POST /api/admin/bookings/status` (`id`, `status`, `response`), `POST /api/admin/bookings/payment` (`bookingId`, `amount` VNĐ, `reference`, `paidAt` ISO UTC, `note`). Chỉ phiên quản trị được cập nhật yêu cầu và ghi nhận giao dịch.

## Điều hướng, hỗ trợ và form đặt vé

Tiện ích vé máy bay mở `/flights`; các liên kết cũ `/category/1` cũng được chuyển về form này. Tin tức có bộ lọc chủ đề và tìm kiếm bài viết. Các trang dịch vụ khác hiển thị bài viết đúng danh mục cùng nút tư vấn; các nút tài khoản chưa có chức năng đã được gỡ khỏi giao diện.

Trang `/support` dùng OA Zalo `887244279805076722`: mở chat bằng SDK trong Zalo, mở link OA khi dùng trình duyệt web. Hotline chưa được cấu hình. Liên kết quên mật khẩu dẫn tới hỗ trợ để xử lý thủ công, chưa có quy trình đặt lại mật khẩu tự động.

Khách có thể nhập hành trình trước khi đăng nhập. Form có gợi ý sân bay, đảo điểm đi/đến, thông báo lỗi theo từng ô và kiểm tra ngày bay cùng số hành khách ở cả giao diện và backend. Đăng nhập tại chỗ giữ lại nội dung; người dùng bấm gửi để xác nhận sau khi đăng nhập. Bản nháp lưu trong `sessionStorage`, hết hạn sau 24 giờ, được xóa khi gửi thành công hoặc đăng xuất; có nút xóa thủ công. Đây là yêu cầu tư vấn vé, chưa phải xác nhận mua vé hoặc thanh toán.

## Tìm kiếm và tư vấn tour/eSIM

Trang `/search` tìm chung tour, eSIM và bài viết, hỗ trợ từ khóa không dấu và lọc theo loại kết quả. Tour/eSIM chỉ lấy từ API nội dung đã công khai; có trạng thái tải, lỗi và thử lại riêng cho từng nhóm. Có thể chia sẻ đường dẫn chứa từ khóa bằng tham số `q`.

Trang chi tiết tour/eSIM có nút **Nhận tư vấn** mở `/support?service=tour&item=ID` hoặc `/support?service=esim&item=ID`. Trang hỗ trợ tải lại dữ liệu công khai theo mã để tạo nội dung gợi ý; khách sao chép, mở OA và tự gửi. Tour/gói đã ẩn hoặc không tồn tại không hiển thị nội dung gợi ý. Danh sách trống cũng có đường dẫn tư vấn chung. Luồng này chưa tạo đơn tour/eSIM, chưa thanh toán hay cấp eSIM; lịch sử hiện vẫn ghi nhận yêu cầu vé máy bay và giao dịch do quản trị nhập.

## Bài viết và khôi phục khi gặp lỗi

Bài viết `/product/:id` tải nội dung công khai trực tiếp, hiển thị nội dung ngay và có nút tư vấn. Không còn giỏ hàng, màu/kích thước hay luồng mua hàng của template ở trang bài viết. Bài không tồn tại/đã ẩn hiển thị đường quay lại danh sách; lỗi kết nối có nút thử lại. Link `/cart` cũ chuyển sang lịch sử yêu cầu. Đường dẫn không tồn tại có trang 404; lỗi giao diện có trang khôi phục thay cho thông báo kỹ thuật.

Chia sẻ bài viết dùng SDK trong Zalo và sao chép link trên web; lỗi SDK có cách sao chép thay thế. Trong lịch sử, mở chi tiết yêu cầu để sao chép mã và liên hệ hỗ trợ. Nếu thiết bị không cho phép dùng clipboard, app hiện ô nội dung để chọn sao chép thủ công. Lịch sử có nút tải lại khi lỗi và quay về trang đầu khi trang phân trang không còn dữ liệu.

Trang quản trị và form vé được tải khi mở trang tương ứng; trang chủ không tải sẵn mã quản trị và danh sách sân bay. Nếu tải mã giao diện thất bại, trang khôi phục cho phép tải lại.

## Popup kết quả thao tác

Ứng dụng và Admin dùng chung popup cho đăng nhập, đăng ký, đăng xuất, gửi yêu cầu vé, lưu dữ liệu quản trị, cập nhật yêu cầu, ghi nhận giao dịch và tải ảnh. Thành công chỉ hiện sau phản hồi API; lỗi kết nối, API hoặc thông tin nhập chưa hợp lệ có popup lỗi, đồng thời giữ thông báo tại form. Việc tải danh sách và kiểm tra phiên nền không bật popup.

Thông báo nằm ở góc phải phía trên, tự ẩn sau 4 giây và có nút đóng sớm. Thông báo không phủ nền, không chuyển focus hoặc chặn thao tác trên trang. Các kết quả đến đồng thời được xếp hàng, không ghi đè nhau. Thông báo yêu cầu vé nêu rõ chưa phải xác nhận mua/thanh toán; giao dịch quản trị chỉ xác nhận ghi nhận lịch sử.

## Ảnh, trạng thái tải và khả năng truy cập

Ảnh nội dung tour, eSIM, tin tức và banner có ảnh thay thế FirstClass Travel khi đường dẫn trống hoặc tải lỗi. Ảnh danh mục được tải khi gần vùng xem; banner đầu tiên và ảnh chính trang chi tiết được ưu tiên tải ngay. Khung ảnh giữ kích thước để hạn chế xê dịch bố cục. Danh sách và chi tiết tour/eSIM có khung chờ với trạng thái dành cho trình đọc màn hình.

Nút chuyển banner có vùng bấm 44 × 44 px, nhãn theo số thứ tự, trạng thái banner hiện tại và nút tạm dừng/tiếp tục. Thiết bị bật giảm chuyển động sẽ bắt đầu với banner tạm dừng và không dùng hiệu ứng nhấp nháy khung chờ. Liên kết và ô nhập có viền focus khi dùng bàn phím; web cho phép phóng to màn hình. Tiêu đề tab theo từng trang, trang chi tiết dùng tên nội dung và thương hiệu FirstClass Travel.

## Nguồn gốc

Dự án được phát triển từ template ZaUI Fashion của Zalo và đã tùy chỉnh cho FirstClass Travel. Thông tin bản quyền của template được giữ trong file `LICENSE`.
