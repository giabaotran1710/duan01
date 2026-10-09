# Backend lưu điểm trên Cloudflare (miễn phí)

Cloudflare Workers + D1, API giống `server/server.js`. Gói Free không có hạn dùng thử.
Bảng dữ liệu tự được tạo ở lần gọi đầu tiên, không cần chạy lệnh tạo bảng.

## Triển khai chỉ bằng trình duyệt (điện thoại cũng làm được)

1. Vào dash.cloudflare.com, đăng ký hoặc đăng nhập tài khoản miễn phí.
2. **Workers & Pages → Create → Import a repository** (kết nối GitHub), chọn repo `duan01`.
3. Ở phần cấu hình build, đặt **Root directory** = `worker`. Để trống các ô còn lại
   (Deploy command mặc định là `npx wrangler deploy`).
4. Bấm **Deploy**. Cloudflare tự tạo cơ sở dữ liệu D1 `duan01-scores` rồi in ra địa chỉ
   dạng `https://duan01-scores.xxx.workers.dev`.
5. Mở `<địa chỉ>/api/health`, thấy `{"ok":true}` là xong.

Nếu bước 4 báo lỗi thiếu database: vào **Storage & Databases → D1 → Create database**
(tên `duan01-scores`), chép **Database ID**, dán vào `worker/wrangler.toml` dưới dòng
`database_name`, dạng `database_id = "..."`, rồi deploy lại.

## Nối trang web với server

Điền địa chỉ Worker vào `DEFAULT_API_BASE` ở đầu `scores.js`.

## Giới hạn miễn phí

Workers Free: 100.000 lượt gọi/ngày. D1 Free có giới hạn đọc/ghi theo ngày; vượt thì API báo lỗi
đến nửa đêm UTC rồi tự mở lại, dữ liệu không mất. Game vẫn chạy bình thường vì điểm luôn được lưu
trên máy trước.

## Chạy thử trên máy (cho người có Node)

```
cd worker
npx wrangler dev --local
```

## Hạn chế bỏ ngỏ

Ai cũng gọi được API gửi điểm nên điểm có thể bị giả mạo; chỉ nên dùng cho mục đích vui. Đổi
`ALLOWED_ORIGINS` trong `wrangler.toml` thành địa chỉ trang của bạn để hạn chế trình duyệt lạ.
