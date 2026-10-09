# Backend lưu điểm

Server Node nhỏ, không cần cài thêm thư viện. Lưu điểm vào `server/data/scores.json`.

## Chạy thử trên máy

```
npm start          # mở http://localhost:3000
npm test
```

Server vừa phục vụ trang web vừa có API, nên chơi ở `localhost:3000` là điểm được lưu lên server.

## API

| Lệnh | Mô tả |
|---|---|
| `GET /api/health` | Kiểm tra server |
| `GET /api/scores/:game?limit=10` | Lấy bảng điểm cao nhất |
| `POST /api/scores/:game` với `{ "name": "Bảo", "score": 123 }` | Gửi điểm |

## Biến môi trường

- `PORT` cổng (mặc định 3000)
- `SCORES_FILE` đường dẫn file lưu điểm
- `ALLOWED_ORIGINS` các trang được gọi API, ví dụ `https://giabao1710.click` (mặc định cho phép tất cả)

## Khi trang chạy trên GitHub Pages

GitHub Pages chỉ chạy file tĩnh, nên `scores.js` sẽ tự lưu điểm trên máy người chơi (localStorage)
và gửi lại khi có server. Khi đã đưa server lên một hosting (Render, Railway, VPS…), đặt địa chỉ
trong trang trước khi nạp `scores.js`:

```html
<script>window.SCORE_API_BASE = 'https://dia-chi-server-cua-ban';</script>
```

## Thêm game mới

Nạp `scores.js` và gọi khi thua:

```js
if (window.Scores) Scores.submit('id-game', diem);
```

Rồi thêm game vào danh sách `GAMES` trong `bangxephang.html`.
