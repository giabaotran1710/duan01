# Stockfish 19 (bản WebAssembly) cho game Cờ Vua

Thư mục này chứa engine cờ vua **Stockfish 19** đã biên dịch sang WebAssembly, dùng trong `game/covua.html`.

| Tệp | Mô tả |
| --- | --- |
| `stockfish-19-lite-single.js` | Phần khởi động engine, chạy trong Web Worker và nói chuyện bằng giao thức UCI |
| `stockfish-19-lite-single.wasm` | Engine Stockfish 19, mạng NNUE "lite", chạy một luồng |
| `Copying.txt` | Giấy phép GNU GPL phiên bản 3 |

- Nguồn: gói npm [`stockfish@19.0.1`](https://www.npmjs.com/package/stockfish) của dự án [Stockfish.js](https://github.com/nmrugg/stockfish.js) (Nathan Rugg, Chess.com), xây dựng từ [Stockfish](https://github.com/official-stockfish/Stockfish) của đội ngũ phát triển Stockfish. Mạng NNUE lite của Chris Bao (sscg13).
- Mã nguồn đầy đủ của engine: https://github.com/nmrugg/stockfish.js và https://github.com/official-stockfish/Stockfish
- Giấy phép: GNU GPL v3 (xem `Copying.txt`). Các tệp được giữ nguyên, không sửa đổi.

Chọn bản "lite, một luồng" vì chỉ khoảng 1,9 MB, chạy được trên mọi trình duyệt hiện đại và trên GitHub Pages mà không cần header cross-origin isolation. Bản đầy đủ nặng khoảng 94 MB.
