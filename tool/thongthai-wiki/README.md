# Câu hỏi suy ra từ Wikipedia (Thông thái trắc nghiệm)

Sinh `game/thongthai-wiki.js` từ Wikidata (dữ liệu có cấu trúc của Wikipedia).

```
export TT_WD_CACHE=/đường/dẫn/đệm   # nơi lưu kết quả truy vấn và bài Wikipedia đã tải
python3 fetch.py                    # tải các nguồn trong sources.py
python3 build.py                    # suy câu, đối chiếu, chọn, ghi game/thongthai-wiki.js và audit.tsv
node ../thongthai-check.js          # kiểm toàn bộ ngân hàng
```

- `sources.py`: các truy vấn SPARQL (chỉ lấy thực thể có bài Wikipedia tiếng Việt).
- `types_cfg.py`: mẫu câu tiếng Việt, cách chọn phương án sai, chia mức theo độ nổi tiếng.
- `build.py`: lọc trùng (kể cả với ngân hàng viết tay), đối chiếu đáp án với bài Wikipedia tiếng Việt của chủ đề, chọn theo chỉ tiêu `TT_EASY` (mức 1-2) và `TT_HARD` (mức 3-5).
- `audit.tsv`: mỗi câu kèm mã Wikidata của chủ đề và đáp án để tra lại nguồn.
