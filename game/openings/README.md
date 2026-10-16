# Tên khai cuộc cho game Cờ Vua

`covua-openings.json` là danh sách 3.864 tên khai cuộc (mã ECO) mà `game/covua.html` hiển thị dưới tiêu đề **Biên bản**.

- Nguồn: [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (các tệp `a.tsv` … `e.tsv`), giấy phép **CC0** (phạm vi công cộng). Các tên có gốc từ bộ phân loại ECO.
- Định dạng: `{ "v":1, "src":"…", "max":<số nước dài nhất, tính theo nửa nước>, "e":[ [khoá, ECO, tên], … ] }`.
- Khoá theo **thế cờ**, không theo thứ tự nước đi, nên đi đảo nước vẫn nhận ra khai cuộc. Khoá là `cyrb53(bàn cờ + lượt đi + quyền nhập thành của FEN).toString(36)`, tức ba trường đầu của FEN, ví dụ `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq`.
- Mỗi dòng PGN của nguồn được chạy bằng bộ luật cờ của game để lấy thế cờ cuối. Cả 3.864 dòng đều hợp lệ; một cặp tên trùng thế cờ chỉ giữ tên đầu tiên.
- Trang chỉ tải tệp này một lần; không tải được thì dòng khai cuộc bị ẩn và ván cờ vẫn chạy bình thường.
