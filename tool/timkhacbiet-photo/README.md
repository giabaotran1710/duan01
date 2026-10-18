# Ảnh chụp như thật cho game Tìm điểm khác biệt

`gen.py` dùng trình tạo ảnh **Google Gemini** để tạo 100 màn ảnh chụp như thật (mô tả cảnh trong `scenes.json`).
Kết quả ghi vào `game/timkhacbiet-photos/` (ảnh A `NNN.webp`, các mảnh vá `NNN-k.webp`, `manifest.json`).
Màn nào đã có ảnh thì game tự dùng ảnh; màn chưa có vẫn dùng tranh vẽ.

## Cách chạy

```bash
pip install pillow numpy scipy
export GEMINI_API_KEY=...            # khoá API Gemini (Google AI Studio)
python3 tool/timkhacbiet-photo/gen.py --levels 1-5     # thử vài màn trước
python3 tool/timkhacbiet-photo/gen.py --levels 1-100   # tất cả (màn đã có sẽ bỏ qua; --force để làm lại)
python3 tool/timkhacbiet-photo/gen.py --verify         # kiểm tra lại
```

Mỗi màn: tạo ảnh A → Gemini tìm khung các vật → chọn 8 vật nhỏ → Gemini sửa ảnh (chỉ siêu khó: vật vẫn còn đó nhưng hơn/kém đúng 1 hoạ tiết, hoặc đổi nhẹ màu, hình dạng, chi tiết)
→ chỉ lấy phần đã đổi trong khung từng vật dán lên ảnh A thành ảnh B. Bước kiểm tra ghép lại ảnh B từ đúng các tệp WebP và bảo đảm:
mọi điểm khác đều đủ thấy, ngoài vùng khác biệt ảnh B giống hệt ảnh A, các vùng không chồng nhau.

Ảnh tạm (ảnh gốc, ảnh sửa) nằm trong `tool/timkhacbiet-photo/cache/` (không đưa lên git).
Tuỳ chọn: `TKB_IMAGE_MODEL`, `TKB_VISION_MODEL` để chọn mô hình cụ thể.
