---
name: anim-css-ui
description: Làm hoạt ảnh giao diện cho game HTML bằng CSS và Web Animations API - nút bấm, popup, menu, thẻ bài, chữ điểm nảy, thanh tiến độ, đếm số, banner cột mốc, màn hình thắng/thua - gọn, mượt, có nhánh giảm chuyển động. Dùng khi hoạt ảnh nằm ở phần DOM chứ không phải canvas.
---

# Animation cho giao diện (DOM)

Dùng khi phần tử là DOM: nút, bảng, thẻ, HUD, chữ nổi. Cái gì vẽ trên canvas thì dùng `anim-canvas-sprite`.

## Bộ biến chuyển động (đặt một lần trên `:root` của game)

```css
:root{
  --t-press:100ms; --t-in:260ms; --t-out:180ms; --t-banner:450ms;
  --e-out:cubic-bezier(.2,.8,.2,1);          /* ra nhanh, dừng êm */
  --e-in:cubic-bezier(.4,0,1,1);             /* biến mất */
  --e-pop:cubic-bezier(.2,.9,.3,1.25);       /* nảy nhẹ khi xuất hiện */
}
```
Thời lượng cho từng loại: xem bảng trong `game-motion`. Dùng đúng các biến để cả game cùng một nhịp.

## Công thức

**Nút bấm** - phản hồi tức thì, chỉ transform:
```css
.btn{transition:transform var(--t-press) var(--e-out)}
.btn:active{transform:scale(.94)}
@media (hover:hover){.btn:hover{transform:translateY(-2px)}}
```

**Popup / bảng** - vào bằng nảy, ra bằng mờ nhanh:
```css
.panel{opacity:0;transform:translateY(12px) scale(.96);pointer-events:none;
  transition:opacity var(--t-out) var(--e-in),transform var(--t-out) var(--e-in)}
.panel.show{opacity:1;transform:none;pointer-events:auto;
  transition:opacity var(--t-in) var(--e-out),transform var(--t-in) var(--e-pop)}
```

**Chữ điểm nảy** - bằng Web Animations API, không để lại class:
```js
function pop(el){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate([{transform:'scale(1)'},{transform:'scale(1.35)',offset:.35},{transform:'scale(1)'}],
             {duration:260,easing:'cubic-bezier(.2,.9,.3,1.25)'});
}
```

**Đếm số điểm**: `FX.count(el, từ, đến, ms, fmt)` nếu game đã nạp `fx.js`; nếu không, tween `Anim.tween` với `onUpdate`.

**Banner cột mốc**: trượt vào 450 ms, giữ 1,6 s, ra 500 ms; tổng không quá 3 s, tự gỡ khỏi DOM khi xong (`animationend` hoặc `finished`).

**Danh sách nhiều thẻ vào lần lượt**: trễ so le 30–60 ms mỗi thẻ (`animation-delay: calc(var(--i) * 40ms)`), tổng không quá 400 ms.

**Rung nhẹ khi sai**: `FX.shake(el)` hoặc keyframes `translateX` ±6 px, 3 lần, 240 ms.

## Giảm chuyển động

```css
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
}
```
Dùng khối này khi game chưa có. Phần cần cho gameplay (cảnh báo) thì loại ra bằng lớp riêng và đổi sang hiện/ẩn tĩnh.

## Hiệu năng và lỗi hay gặp

- Chỉ `transform` và `opacity`. `will-change: transform` chỉ đặt trên thứ đang chuyển động lâu, và gỡ khi xong.
- Không đặt `transition: all`: nó kéo cả layout vào.
- `animation-fill-mode: forwards` giữ trạng thái cuối; nhớ đặt lại khi chơi lại (gỡ class, ép reflow `void el.offsetWidth`, thêm lại).
- Phần tử ẩn bằng `opacity:0` vẫn bấm được: thêm `pointer-events:none`.
- Game hay có CSS chung cho mọi thẻ (ví dụ `button`, `canvas`): kiểm hiệu ứng không bị CSS đó ghi đè.
- Đừng để popup chặn nhập liệu quá 300 ms mà không cần thiết.

## Kiểm

Mở game, bật cả hai chế độ (bình thường và `reducedMotion: 'reduce'`) bằng `anim-qa`. Chụp trạng thái giữa hiệu ứng (t = nửa thời lượng) để chắc không có nháy hoặc lệch bố cục.
