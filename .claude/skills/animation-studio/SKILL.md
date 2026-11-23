---
name: animation-studio
description: Điều phối bộ skill tạo hoạt ảnh cho game HTML5 như một animator - từ ANIMATION_SPEC.md đến code chạy được - chọn đúng skill con (UI bằng CSS, sprite/tween trên canvas, juice và hạt, chuyển động thủ tục, chuyển cảnh, kiểm chuyển động), dùng lõi anim-core.js và fx.js có sẵn. Dùng khi người dùng nhờ thêm, làm lại hoặc sửa hoạt ảnh, hiệu ứng, chuyển cảnh, logo động trong game/*.html.
---

# Animation Studio - Bộ skill hoạt ảnh

Vai trò: animator của studio. `game-motion` quyết định **cần chuyển động gì và vì sao** (viết `ANIMATION_SPEC.md`). Bộ skill này **làm ra chuyển động đó bằng code** và kiểm nó chạy tốt.

## Chọn skill con theo việc

| Việc | Skill | Công cụ chính |
|---|---|---|
| Nút, popup, menu, thẻ bài, chữ nổi, đếm số | `anim-css-ui` | CSS transition/keyframes, Web Animations API |
| Nhân vật/vật thể trên canvas: sprite, squash & stretch, trạng thái | `anim-canvas-sprite` | `Anim.tween`, vòng `requestAnimationFrame` |
| Cảm giác va chạm, thưởng, thua: rung, chớp, hit-stop, hạt | `anim-juice-fx` | `fx.js` (`FX.burst/shake/text/ring/count`), `Anim.hitStop` |
| Dây, đuôi, tóc, nước, thị sai, bay lượn tự nhiên | `anim-procedural` | `Anim.spring`, verlet, nhiễu |
| Vào game, qua màn, ngày → đêm, logo động, kết thúc | `anim-scene-transition` | `Anim.seq`, mốc thời gian |
| Kiểm khung hình, giảm chuyển động, chụp mốc | `anim-qa` | `scripts/motion-probe.js`, `performance-auditor` |

Một yêu cầu thường dùng 2–3 skill. Ví dụ "thêm hiệu ứng ăn điểm": `anim-juice-fx` (hạt + chữ nổi) + `anim-css-ui` (số điểm nảy).

## Quy trình

1. **Đọc game trước.** Tìm vòng vẽ (`requestAnimationFrame`), có dùng `fx.js` chưa (`grep -l "fx.js" game/<game>.html`), có `prefers-reduced-motion` chưa, canvas hay DOM. Chuyển động mới đi vào cấu trúc đang có, không dựng vòng lặp thứ hai.
2. **Có `ANIMATION_SPEC.md` chưa?** Chưa có và việc lớn: chạy `game-motion` trước. Việc nhỏ: ghi bảng sự kiện ngắn trong câu trả lời (sự kiện, mục đích, thời lượng, easing, giảm chuyển động).
3. **Chọn công cụ nhẹ nhất đủ dùng:** CSS trước, rồi `fx.js`, rồi `anim-core.js`, canvas thủ công là cuối cùng. Không thêm thư viện ngoài.
4. **Làm theo skill con**, mỗi chuyển động có thời lượng, easing và phương án giảm chuyển động.
5. **Kiểm** bằng `anim-qa`. Giao `performance-auditor` và `visual-reviewer` khi việc lớn.

## Lõi dùng chung

`references/anim-core.js` (đã kiểm bằng test): easing, `Anim.tween`, `Anim.seq`, `Anim.spring`, `Anim.hitStop`, `Anim.step`, `Anim.shakeOffset`, `Anim.squash`, cờ `Anim.reduced`. Không tự chạy rAF: game gọi `Anim.update(dt)` mỗi khung nên tween dừng khi game tạm dừng. Dán vào game khi cần (game là một file HTML độc lập), hoặc đặt cạnh `fx.js` và nạp bằng `<script>` nếu nhiều game dùng. Thời lượng và easing mặc định xem bảng trong `game-motion`.

## Luật chung (mọi skill con)

- Chuyển động phục vụ gameplay: báo trước, xác nhận, thưởng. Không có mục đích thì bỏ.
- Mọi chuyển động có nhánh giảm chuyển động (`Anim.reduced` hoặc `@media (prefers-reduced-motion: reduce)`). Cái gameplay cần (cảnh báo nguy hiểm) giữ, đổi thành tĩnh hoặc mờ dần.
- Dùng `dt`, không dùng số khung. Kẹp `dt` ≤ 33 ms. Một vòng rAF duy nhất, dừng khi `document.hidden`.
- Chỉ animate `transform` và `opacity` trên DOM. Không animate `width/height/top/left`, `box-shadow`, `filter`.
- Không nhấp nháy quá 3 lần/giây, không rung liên tục.
- Không che HUD, chướng ngại hay thông tin điểm.
- Không đổi luật, điểm, độ khó hay thời gian phản ứng của người chơi. Hoạt ảnh chỉ là lớp trình bày; nếu hiệu ứng kéo dài làm khoá nhập liệu, nói rõ.
- Dọn dẹp: huỷ tween, hạt, listener khi chơi lại hoặc thoát màn.

## Báo cáo khi xong

Nêu: chuyển động đã thêm (sự kiện, thời lượng), file sửa, nhánh giảm chuyển động, số đo hiệu năng nếu có chạy `motion-probe.js`, và điều chưa kiểm.
