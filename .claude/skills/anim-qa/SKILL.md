---
name: anim-qa
description: Kiểm chuyển động của game HTML - đo thời gian khung (trung bình, p95), khung rớt, so sánh có và không giảm chuyển động, chụp các mốc giữa hiệu ứng, soát nháy/lệch bố cục/hoạt ảnh bị kẹt/rò hạt khi chơi lại - bằng scripts/motion-probe.js và Playwright. Dùng sau khi thêm hoặc sửa hoạt ảnh, trước khi báo xong.
---

# Kiểm chuyển động

Hoạt ảnh "chạy không báo lỗi" chưa phải là xong. Cần số đo và ảnh chụp giữa hiệu ứng.

## 1. Đo khung hình: `scripts/motion-probe.js`

```
node .claude/skills/anim-qa/scripts/motion-probe.js game/tiaso.html --seconds 8 --cpu 4
node .claude/skills/anim-qa/scripts/motion-probe.js game/tiaso.html --reduced --shots 0,500,1500
```
Script tự mở máy chủ tĩnh ở gốc repo, mở game ở khung điện thoại (390×844, UA iPhone vì một số game chặn máy tính), đặt sẵn tên người chơi (không thì hộp "Chọn tên người chơi" che game), chặn mọi mạng ngoài, bọc `requestAnimationFrame` để ghi khoảng giữa các khung, và in: số khung, trung bình, p95, % khung > 20 ms, số khung > 50 ms, số canvas và phần tử `animate` đang chạy, heap đầu/cuối. Tuỳ chọn: `--cpu N` (làm chậm CPU N lần), `--reduced` (giả lập giảm chuyển động), `--shots a,b,c` (chụp ảnh ở các mốc ms vào thư mục `--out`, mặc định thư mục tạm), `--click "<selector>"` (bấm vào nút bắt đầu trước khi đo), `--eval "<js>"` (chạy một đoạn để vào trạng thái cần đo, ví dụ đặt thẳng `state.t`).

Đọc số: trình duyệt headless không có GPU thật, nên số tuyệt đối thường cao hơn máy thật. So sánh trước và sau khi sửa, và so có `--cpu 4` để thấy chỗ yếu trên máy yếu.

Mục tiêu: p95 < 20 ms (bình thường), p95 < 33 ms với `--cpu 4`. Quá ngưỡng thì giao `performance-auditor` tìm điểm nóng.

Muốn tự viết kịch bản chơi bằng Playwright (bấm nút thật, thử thắng/thua) thì làm đúng ba điều trên: UA điện thoại, `addInitScript` đặt `localStorage` `player_name`, `lb_name_asked='1'`, `lb_name_claimed` và `window.SCORE_FIREBASE_URL='http://127.0.0.1:9'`, chặn route ngoài. Biến `const` ở mức cao nhất của script game (như `S` trong `vetcatvohinh`) đọc được bằng `page.evaluate(() => S.phase)`.

## 2. Giảm chuyển động

Chạy lại với `--reduced` ở đúng trạng thái đã thêm hiệu ứng, rồi kiểm:
- Không còn rung, hạt, chớp, trượt xa. Chữ nổi hoặc thông báo cần thiết vẫn hiện.
- Cảnh báo cần cho gameplay vẫn còn (dạng tĩnh/mờ).
- Chuỗi chuyển cảnh vẫn kết thúc đúng và trạng thái game đúng.

## 3. Ảnh giữa hiệu ứng

Chụp ở đầu, giữa (t = nửa thời lượng) và cuối. Soát: không lệch bố cục, không bị cắt, HUD không bị che, văn bản vẫn đọc được, trạng thái cuối trùng thiết kế. Chụp cả dọc (390×844) và ngang (844×390) khi game hỗ trợ. Việc soát hình kỹ giao `visual-reviewer`.

## 4. Kiểm vòng đời (nguồn lỗi hay gặp)

Sau hiệu ứng lớn, chơi lại 3 lần liên tiếp rồi đo lại:
- Số canvas/phần tử ở cuối không tăng so với ban đầu (không rò lớp hiệu ứng, chữ nổi, listener).
- Heap cuối không tăng đều qua các lần.
- Không có tween/chuỗi cũ còn chạy sau khi thoát hoặc chơi lại (giá trị bị ghi đè ngoài ý muốn).
- Sau khi để tab ẩn 5 giây rồi quay lại không có nhảy vọt hoặc `dt` lớn.

## 5. Soát nhanh mã

- `grep -n "requestAnimationFrame" game/<game>.html`: chỉ một vòng lặp chính (không tính hiệu ứng riêng có điều kiện dừng).
- `shadowBlur`, `filter`, `createLinearGradient/RadialGradient` trong vòng vẽ.
- Animate thuộc tính layout (`width`, `top`, `left`, `box-shadow`).
- Có nhánh `prefers-reduced-motion` hoặc `FX.reduced()`/`Anim.reduced`.
- Nhấp nháy > 3 lần/giây; rung liên tục.

## Báo cáo

Bảng: trạng thái đo, avg / p95 / % > 20 ms (thường và `--cpu 4`), khác biệt khi `--reduced`, danh sách lỗi vòng đời và soát mã, ảnh đã chụp. Kết luận dùng ba mức: đạt, đạt có ghi chú, chưa đạt. Nói rõ điều chưa kiểm (máy thật, thiết bị thật).
