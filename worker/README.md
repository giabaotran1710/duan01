# Backend lưu điểm trên Cloudflare (miễn phí)

Cloudflare Workers + D1, API giống `server/server.js`. Gói Free không có hạn dùng thử.

## Triển khai (làm một lần, trên máy có Node 18+)

```
cd worker
npx wrangler login                          # mở trình duyệt, đăng nhập Cloudflare
npx wrangler d1 create duan01-scores        # in ra database_id
```

Dán `database_id` vừa in ra vào `wrangler.toml` (dòng `database_id = ...`), rồi:

```
npx wrangler d1 execute duan01-scores --remote --file=schema.sql   # tạo bảng
npx wrangler deploy                                                # in ra địa chỉ *.workers.dev
```

Kiểm tra: mở `<địa chỉ>/api/health`, thấy `{"ok":true}` là xong.

## Nối trang web với server

Điền địa chỉ Worker vào `DEFAULT_API_BASE` ở đầu `scores.js`.

## Giới hạn miễn phí

Workers Free: 100.000 lượt gọi/ngày. D1 Free có giới hạn đọc/ghi theo ngày; vượt thì API báo lỗi
đến nửa đêm UTC rồi tự mở lại, dữ liệu không mất. Game vẫn chạy bình thường vì điểm luôn được lưu
trên máy trước.

## Chạy thử trên máy

```
npx wrangler d1 execute DB --local --file=schema.sql
npx wrangler dev --local
```

## Hạn chế bỏ ngỏ

Ai cũng gọi được API gửi điểm nên điểm có thể bị giả mạo; chỉ nên dùng cho mục đích vui. Đổi
`ALLOWED_ORIGINS` trong `wrangler.toml` thành địa chỉ trang của bạn để hạn chế trình duyệt lạ.
