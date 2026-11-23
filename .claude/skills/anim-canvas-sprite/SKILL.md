---
name: anim-canvas-sprite
description: Làm hoạt ảnh nhân vật và vật thể trên canvas 2D cho game HTML - sprite sheet, máy trạng thái hoạt ảnh (đứng, chạy, nhảy, trúng đòn, chết), tween theo dt, squash & stretch, anticipation, vẽ sprite bằng mã (không cần ảnh). Dùng khi nhân vật hay vật thể vẽ bằng canvas cần chuyển động sống động.
---

# Animation canvas: sprite và tween

Hai cách tạo hình trong kho này: **vẽ bằng mã** (đa số game, không cần tải ảnh) và **sprite sheet** (khi có ảnh sẵn). Cả hai dùng chung một khung điều khiển trạng thái.

## Vòng lặp chuẩn (một vòng duy nhất)

```js
let last = 0;
function loop(now){
  const dt = Anim.step(now - last); last = now;   // đã kẹp ≤33ms, có hit-stop
  Anim.update(dt);                                // tween
  update(dt); draw();
  if (!document.hidden) requestAnimationFrame(loop);
}
```
`Anim` lấy từ `animation-studio/references/anim-core.js`. Khi tab ẩn, tiếp tục bằng `visibilitychange` và đặt lại `last` để không có dt khổng lồ.

## Máy trạng thái hoạt ảnh

```js
const hero = { state:'idle', t:0, x:0, y:0, sx:1, sy:1 };
const ANIMS = {
  idle: { dur: 900, loop: true  },
  run:  { dur: 480, loop: true  },
  jump: { dur: 600, loop: false, next: 'idle' },
  hit:  { dur: 240, loop: false, next: 'idle', lock: true },
  die:  { dur: 700, loop: false }
};
function setState(h, s){
  if (h.state === s || ANIMS[h.state].lock && h.t < ANIMS[h.state].dur) return;   // đừng cắt hoạt ảnh bị khoá
  h.state = s; h.t = 0;
}
function tickAnim(h, dt){
  const a = ANIMS[h.state]; h.t += dt;
  if (h.t >= a.dur){ if (a.loop) h.t %= a.dur; else if (a.next) setState(h, a.next); else h.t = a.dur; }
  return h.t / a.dur;   // 0..1 đưa vào hàm vẽ
}
```

## Vẽ sprite bằng mã (theo pha p = 0..1)

- **Thở/idle:** `sy = 1 + 0.03*sin(2π p)`, `sx = 1/sy`.
- **Chạy:** nảy theo `abs(sin(2π p))`, nghiêng thân 4–8° theo hướng chạy, chân/tay là hai đoạn quay quanh khớp ngược pha nhau.
- **Nhảy:** ba pha. Anticipation (ép thấp 80–120 ms, `sy=.8`), bay (kéo dọc theo vận tốc: `sy = 1 + min(.25, |vy|*k)`), chạm đất (ép `sy=.75` rồi `Anim.tween` về 1 bằng `outElastic`, 180 ms).
- **Trúng đòn:** chớp trắng 1 khung (vẽ lại sprite bằng `globalCompositeOperation='source-atop'` hoặc tô trắng), lùi 6–12 px bằng tween, `Anim.hitStop(60–90)`.
- **Chết:** xoay + mờ + rơi 500–700 ms, hạt bằng `anim-juice-fx`. Không xoá đối tượng khỏi danh sách trước khi hoạt ảnh xong.
- Squash & stretch luôn giữ thể tích: `const {sx,sy} = Anim.squash(0.2)`.
- Biến đổi quanh điểm chạm đất (chân), không quanh tâm: `ctx.translate(x,y); ctx.scale(sx,sy); ctx.drawImage(img,-w/2,-h)`.

## Sprite sheet

```js
function drawFrame(img, fw, fh, row, col, x, y){ ctx.drawImage(img, col*fw, row*fh, fw, fh, x - fw/2, y - fh, fw, fh); }
const col = Math.min(frames-1, Math.floor(p * frames));
```
- Một sheet cho mỗi nhân vật, mỗi hàng một trạng thái, ô vuông bằng nhau. 6–12 khung/giây cho nhân vật, đủ mượt.
- Tắt làm mịn khi ảnh là pixel art: `ctx.imageSmoothingEnabled = false`.
- Nhân vật vẽ bằng mã nên dựng sẵn thành `OffscreenCanvas` hoặc canvas phụ nếu hình phức tạp và ít đổi; vẽ lại mỗi khung nếu chỉ vài nét.
- Ảnh phải tải xong trước khi vào ván (`img.decode()`); không tải ảnh trong vòng vẽ.

## Điều cần tránh

- Hoạt ảnh làm đổi **hộp va chạm** của gameplay. Hộp va chạm tách khỏi hình vẽ; squash chỉ ảnh hưởng hình.
- Tạo đối tượng mới mỗi khung (gradient, mảng, `{}`) trong vòng vẽ.
- Dùng `setTimeout` để nối các pha. Dùng `Anim.seq` hoặc `h.t` để tạm dừng, hit-stop và chơi lại đều đúng.
- Quên đặt lại `state`, `t`, `sx`, `sy` khi chơi lại.

## Giảm chuyển động

Giữ pha chính (nhảy, trúng đòn) nhưng bỏ nghiêng, rung, chớp trắng; `Anim.tween` tự nhảy đến giá trị cuối khi `Anim.reduced`.
