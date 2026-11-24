---
name: anim-procedural
description: Làm chuyển động thủ tục (sinh bằng toán, không cần khung vẽ tay) cho game HTML - lò xo, theo sau và chồng chéo (dây, đuôi, tóc, ruy băng bằng verlet), nhiễu mượt (gió, lơ lửng, đom đóm), thị sai nhiều lớp, sóng nước, camera mượt, đường cong Bezier. Dùng khi cần chuyển động tự nhiên, liên tục, phản ứng theo vật lý nhẹ.
---

# Chuyển động thủ tục

Chuyển động sinh từ công thức nên **luôn khác nhau chút ít, phản ứng với người chơi và không cần ảnh**. Hợp với game nhẹ chạy trên điện thoại.

## Lò xo (nảy, bám theo, về chỗ)

```js
const s = {x:0, v:0};
Anim.spring(s, target, dt, 180, 14);   // k cứng, d giảm chấn: d ≈ 2√k là "vừa tắt", nhỏ hơn thì rung
```
- Camera bám nhân vật: lò xo mềm (k 60–120, d 12–18) mượt hơn `lerp` cố định, vì có quán tính.
- Nút/thẻ nảy khi chạm: đặt `s.v = 400` rồi để về 0.
- Giá trị tuổi thọ ngắn: dừng cập nhật khi `|v| < 0.01` và `|x-target| < 0.01`.

## Dây, đuôi, ruy băng (verlet)

```js
// pts[i] = {x, y, px, py}; lặp nhiều lần để ràng buộc cứng hơn
function verlet(pts, dt, gravity, drag, seg){
  const h = dt/1000;
  for (let i = 1; i < pts.length; i++){                 // điểm 0 là điểm neo
    const p = pts[i], vx = (p.x - p.px) * drag, vy = (p.y - p.py) * drag;
    p.px = p.x; p.py = p.y; p.x += vx; p.y += vy + gravity * h * h;
  }
  for (let it = 0; it < 4; it++)
    for (let i = 1; i < pts.length; i++){
      const a = pts[i-1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6, k = (d - seg) / d;
      if (i === 1){ b.x -= dx * k; b.y -= dy * k; }     // điểm 0 đứng yên
      else { a.x += dx * k/2; a.y += dy * k/2; b.x -= dx * k/2; b.y -= dy * k/2; }
    }
}
```
- 6–14 điểm là đủ cho đuôi/dây; `drag` 0.98–0.995; 3–5 lần lặp ràng buộc.
- Vẽ bằng đường cong trơn qua các điểm: `quadraticCurveTo` với điểm giữa, độ dày giảm dần về đuôi.
- Dây căng (diều, cần câu): đo độ giãn `d/seg` để làm màu và âm thanh cảnh báo; **thông số gameplay thì tách khỏi hình vẽ**.

## Nhiễu mượt (không dùng `Math.random()` mỗi khung)

`Math.random()` mỗi khung cho chuyển động giật. Dùng tổng sin lệch pha:
```js
const wob = (t, seed) => Math.sin(t*1.3 + seed) * .6 + Math.sin(t*2.7 + seed*1.7) * .3 + Math.sin(t*5.1 + seed*.4) * .1;
```
- Lơ lửng: `y += 4 * wob(t/1000, id)`. Gió làm cỏ nghiêng: `rot = wind * wob(t/1000 + x*0.01, 0)`.
- Đom đóm / bụi: mỗi hạt một `seed`, vẽ bằng sprite dựng sẵn; ≤ 25 hạt.
- Nhấp nháy sao: alpha `0.5 + 0.5*sin(t/seed)` chu kỳ 2–5 s.

## Thị sai và camera

- 3–5 lớp, hệ số dịch `0.1, 0.3, 0.6, 1`; lớp xa dịch ít. Lớp nền tĩnh vẽ sẵn vào canvas phụ và chỉ `drawImage` một lần với offset.
- Camera mượt: `cam += (target - cam) * (1 - Math.exp(-dt/120))` (độc lập tốc độ khung, khác `lerp 0.1` vốn thay đổi theo FPS).
- Nhìn trước: camera nhắm trước hướng di chuyển 10–20% chiều rộng.

## Sóng nước, lửa, khói

- Mặt nước: tổng 2–3 sóng sin theo `x`, vẽ thành một đường `lineTo` với bước 8–12 px.
- Lửa/khói: hạt `FX.burst` với `gravity` âm (bay lên), `shrink`, màu chuyển từ vàng sang đỏ sang xám theo tuổi.

## Kiểm

- Không có dây nào "nổ" khi `dt` lớn: kẹp `dt` ≤ 33 ms (`Anim.step` đã làm).
- Tiến hành thử giữ tab ẩn rồi quay lại: không có nhảy vọt.
- Chạy `anim-qa` để chắc số điểm verlet × lần lặp không làm p95 khung vượt 20 ms.
