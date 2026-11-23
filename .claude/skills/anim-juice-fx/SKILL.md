---
name: anim-juice-fx
description: Thêm "cảm giác game" (juice) cho game HTML - hạt, rung màn, chớp sáng, khựng khung (hit-stop), vòng sóng, chữ nổi, đếm số, thưởng và thua - bằng fx.js có sẵn của kho và Anim.hitStop, có công thức theo từng sự kiện và ngân sách hạt. Dùng khi game thiếu phản hồi khi ăn điểm, va chạm, thắng, thua, combo.
---

# Juice: phản hồi cho sự kiện gameplay

Mỗi sự kiện quan trọng cần phản hồi ở **ba kênh cùng một khung hình**: hình, chuyển động, âm thanh. Thiếu một kênh thì cảm giác "nhẹ". Nhiều quá thì loạn: sự kiện thường chỉ cần 1–2 kênh, sự kiện lớn mới đủ cả ba.

## Có sẵn: `fx.js` ở thư mục gốc

Nạp: `<script src="../fx.js"></script>` (game trong `game/`), `../../fx.js` nếu ở thư mục con. Kiểm game đã nạp chưa: `grep -n "fx.js" game/<game>.html`.

| Hàm | Dùng cho |
|---|---|
| `FX.burst(x,y,{n,colors,speed,spread,angle,gravity,size,life,shape,shapes,drag,shrink})` | bắn hạt: ăn điểm, vỡ, tia lửa |
| `FX.ring(x,y,màu,r,w)` | vòng sóng: kích hoạt, hồi sinh, chạm đáy |
| `FX.rain({n,colors,shapes})` | mưa hạt chúc mừng khi thắng |
| `FX.shake(el,amp,dur)` | rung (mặc định cả trang) |
| `FX.text(x,y,'+10',{...})` | chữ nổi: điểm, "Tuyệt!", "Sai" |
| `FX.count(el,a,b,ms,fmt)` | đếm số điểm |
| `FX.pulse(el,màu,ms)` | nhấp viền một lần |
| `FX.center(el)` | tâm phần tử để đặt hiệu ứng |

`fx.js` đã tự bỏ hạt và rung khi người dùng bật giảm chuyển động, và giới hạn hạt (150 trên điện thoại, 320 máy tính). Hạt vẽ trên canvas phủ toàn màn hình riêng, nên không đụng canvas của game.

## Công thức theo sự kiện

| Sự kiện | Hình | Chuyển động | Thời lượng |
|---|---|---|---|
| Ăn điểm nhỏ | `FX.text '+N'` + `FX.burst n:8` | số điểm nảy (`anim-css-ui` `pop`) | 300–600 ms |
| Combo / chuỗi | chữ to hơn mỗi bậc, hạt nhiều hơn tăng dần (bậc 3 trở đi) | `FX.ring` | 500–900 ms |
| Trúng / va chạm | chớp trắng 1 khung trên vật bị trúng | `Anim.hitStop(60–90)` + `FX.shake(amp 4–8, 220 ms)` | 100–350 ms |
| Sai / mất mạng | viền đỏ nháy 1 lần, `FX.text` màu đỏ | rung ngang 3 lần | 250–400 ms |
| Thắng màn | `FX.rain`, `FX.count` điểm | banner trượt vào | 1,5–3 s |
| Kỷ lục mới | `FX.burst` 2 đợt cách 150 ms + `FX.ring` | số điểm phóng to rồi về | 1–2 s |
| Thua | làm tối dần (vignette), vật rơi/mờ | **không rung**, chậm lại | 600–1200 ms |

Chớp trắng: một lớp phủ trắng `opacity` 0.6 → 0 trong 80–120 ms, hoặc tô trắng vật thể 1 khung. Không chớp toàn màn hình liên tục.

## Hit-stop (khựng khung)

```js
Anim.hitStop(70);                    // trước khi gọi Anim.step
const dt = Anim.step(now - last);    // trả 0 trong lúc khựng: logic dừng, vẫn vẽ
```
Chỉ cho va chạm có trọng lượng (đòn mạnh, boss, đứt dây), 40–120 ms. Đặt cho cả va chạm nhỏ sẽ làm game giật. Nếu game không dùng `Anim`, tự giữ biến `freezeUntil = performance.now() + ms` và bỏ qua phần cập nhật logic trong thời gian đó.

## Màu và hình hạt từ chủ đề game

Hạt lấy màu từ bảng màu của game, không dùng cầu vồng mặc định. Ví dụ biển: bọt trắng + xanh ngọc, `shape:'circle'`, `gravity` thấp; lửa: cam/vàng, `shape:'drop'` ngược chiều trọng lực; giấy ăn mừng: nhiều màu, `shape:'square'`, `rain`. Trọng lực, `drag` và vòng đời tạo ra cảm giác vật liệu; chọn trước màu.

## Ngân sách và an toàn

- Mỗi sự kiện ≤ 24 hạt (lớn: ≤ 60). Không bắn hạt mỗi khung; chỉ khi sự kiện xảy ra.
- Không rung liên tục, không nhấp nháy quá 3 lần/giây, biên độ rung ≤ 10 px.
- Hiệu ứng không che vật cần nhìn: đặt chữ nổi lệch khỏi HUD.
- Âm thanh bắt đầu cùng khung với hình; dùng âm thanh sẵn có của game (`audio/`), không thêm file nặng.
- Nếu game đã có hiệu ứng riêng, kiểm không chồng lặp hai lớp cho cùng một sự kiện.

## Kiểm

Chạy `anim-qa`: chế độ giảm chuyển động không còn hạt và rung; p95 khung không tệ đi khi bắn hiệu ứng lớn nhất.
