---
name: game-motion
description: Thiết kế hoạt ảnh, hiệu ứng và "cảm giác game" (game feel / juice) cho game HTML5 - thời lượng, easing, squash & stretch, rung màn, khựng khung (hit-stop), hạt, ánh sáng, chuyển cảnh, đồng bộ âm thanh - và kiểm hiệu năng trên điện thoại. Dùng khi thêm hoặc làm lại hoạt ảnh, hiệu ứng, chuyển màn, logo động. Đầu ra là ANIMATION_SPEC.md.
---

# Motion Designer - Hoạt ảnh và cảm giác game

Chuyển động phải **phục vụ trải nghiệm**: báo trước, xác nhận, thưởng, kể chuyện. Hiệu ứng không có mục đích thì bỏ.

## Bảng thời lượng & easing mặc định

| Loại | Thời lượng | Easing |
|---|---|---|
| Phản hồi nút bấm | 80–120 ms | ease-out |
| Popup / menu xuất hiện | 200–350 ms | cubic-bezier(.2,.9,.3,1.2) (nảy nhẹ) |
| Biến mất | 150–250 ms | ease-in |
| Báo trước nguy hiểm | 500–900 ms | tuyến tính tăng dần, nhấp nháy ≤ 3 lần/giây |
| Khựng khung khi va chạm (hit-stop) | 40–120 ms | dừng thời gian game, vẫn vẽ |
| Rung màn | 150–350 ms, biên độ 2–10 px, tắt dần | nhiễu giảm theo `(1-t)^2` |
| Chuyển cảnh lớn (ngày → đêm, qua màn) | 2–6 s | smoothstep |

## Bộ công cụ "juice" (chọn cái phục vụ cảm xúc)

- **Báo trước (anticipation / telegraph):** vệt sáng, mũi tên, rung nhẹ trước sự kiện.
- **Squash & stretch:** vật thể méo theo vận tốc/va chạm, luôn giữ thể tích (sx·sy ≈ 1).
- **Theo sau & chồng chéo (follow-through):** đuôi, dây, tóc, ruy băng mô phỏng bằng chuỗi điểm verlet.
- **Hạt (particles):** bụi, lá, tia lửa, đom đóm; có tuổi thọ, giới hạn số lượng (mục hiệu năng).
- **Ánh sáng & màu:** chuyển màu bầu trời, vignette khi nguy hiểm, chớp trắng 1 khung khi va chạm mạnh.
- **Camera:** rung, lắc lư nhẹ theo nhân vật, thị sai (parallax) giữa các lớp nền.
- **Chữ & con số:** số điểm nảy lên, banner cột mốc trượt vào rồi tự tắt.
- **Âm thanh đồng bộ:** mỗi hiệu ứng lớn có tiếng; tiếng phải bắt đầu cùng khung hình với hình.

## Hiệu năng (bắt buộc với điện thoại)

- Vẽ sẵn lớp tĩnh vào canvas phụ; mỗi khung chỉ vẽ phần động. Lớp đổi chậm (bầu trời theo giờ) thì vẽ lại tối đa vài lần mỗi giây hoặc pha trộn 2 bản vẽ sẵn bằng `globalAlpha`.
- Không tạo gradient/đối tượng mới trong vòng lặp nếu tránh được; giới hạn hạt (thường ≤ 150).
- `shadowBlur` và `filter` trên canvas rất đắt: chỉ dùng cho vài vật thể.
- Dùng `dt` (thời gian khung) cho mọi chuyển động; kẹp `dt` ≤ 33 ms.
- Một vòng `requestAnimationFrame` duy nhất; dừng/giảm khi `document.hidden`.
- Tôn trọng `prefers-reduced-motion`: tắt rung màn, giảm hạt, giữ hoạt ảnh cần cho gameplay.
- Đo: chạy Playwright, ghi thời gian khung trung bình và p95 bằng `performance.now()` trong 5–10 giây (giao `performance-auditor`).

## Khung ANIMATION_SPEC.md

```
# <Tên game> - Hoạt ảnh
| Sự kiện | Mục đích | Hình | Thời lượng / easing | Âm thanh | Giảm chuyển động |
|---|---|---|---|---|---|
## Ngân sách hiệu năng (số hạt tối đa, lớp vẽ sẵn, mục tiêu FPS)
## Cách kiểm chứng (khung nào chụp, đo gì)
```

## Không làm

- Không rung màn liên tục hoặc nhấp nháy quá 3 lần/giây (nguy cơ động kinh, khó chịu).
- Không để hiệu ứng che thông tin gameplay (HUD, chướng ngại, cảnh báo).
- Không thêm thư viện hoạt ảnh khi CSS/Canvas đủ dùng.
