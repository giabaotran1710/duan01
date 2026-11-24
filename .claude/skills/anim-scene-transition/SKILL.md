---
name: anim-scene-transition
description: Làm hoạt ảnh chuyển cảnh và chuỗi theo thời gian cho game HTML - vào game, qua màn, đổi ngày thành đêm, logo động, màn kết thúc, đếm ngược - bằng mốc thời gian (timeline) với Anim.seq, có thể bỏ qua và không khoá người chơi. Dùng khi cần một đoạn hoạt ảnh nhiều bước nối nhau.
---

# Chuyển cảnh và chuỗi hoạt ảnh

Đoạn dài hơn 1 giây gồm nhiều bước thì viết như **kịch bản có mốc thời gian**, không lồng `setTimeout`.

## Viết kịch bản trước (storyboard)

| Mốc (ms) | Cảnh | Chuyển động | Âm thanh |
|---|---|---|---|
| 0 | màn tối | logo mờ vào, scale .9 → 1 (`outCubic`, 500) | chuông nhẹ |
| 500 | logo | tia sáng quét ngang (400) | |
| 1400 | logo | mờ ra (300) | |
| 1700 | menu | nút vào so le 60 ms (`outBack`) | |

Mốc tuyệt đối từ lúc bắt đầu; tổng độ dài ghi ở đầu bảng.

## Cài bằng `Anim.seq`

```js
function playIntro(done){
  const L = {a:0}, R = {x:-120};
  Anim.seq([
    {at:0,    obj:L, to:{a:1}, dur:500, ease:'outCubic'},
    {at:500,  obj:R, to:{x:W+120}, dur:400, ease:'inOutQuad'},
    {at:1400, obj:L, to:{a:0}, dur:300},
    {at:1700, call: done}
  ]);
  // draw() đọc L.a và R.x mỗi khung
}
```
Vì chạy theo `Anim.update(dt)`, đoạn chuỗi dừng khi game tạm dừng và chậm khi hit-stop. Với phần DOM, dùng `el.animate(...).finished.then(...)`.

## Quy tắc cho chuyển cảnh

- **Có thể bỏ qua:** chạm hoặc bấm phím bất kỳ nhảy tới cuối (`tween.t = dur`, hoặc gọi hàm `finish()` gộp các giá trị cuối). Chuỗi dài hơn 1,5 s mà không bỏ qua được là lỗi.
- **Không khoá không cần thiết:** qua màn tối đa 600 ms khoá nhập liệu; phần còn lại chạy khi người chơi đã chơi được.
- **Một chiều thống nhất:** vào bằng mờ/trượt cùng hướng, ra ngược lại. Cả game dùng một vài kiểu chuyển, không mỗi màn một kiểu.
- **Đổi trạng thái game tại điểm đen** (mờ hoàn toàn), không giữa lúc nhìn thấy.
- **Chuyển liên tục (ngày → đêm):** nội suy màu bằng `smoothstep` giữa các mốc trong 2–6 s; vẽ sẵn 2–3 bản nền và pha bằng `globalAlpha`, không vẽ lại gradient từng khung. Xem `docs/studio/thadieu/ANIMATION_SPEC.md` làm ví dụ.
- **Đếm ngược 3-2-1:** mỗi số vào bằng `outBack` 250 ms rồi mờ 150 ms; tiếng bíp cùng khung.
- **Kết thúc:** điểm đếm lên bằng `FX.count`, kỷ lục mới có thêm hiệu ứng từ `anim-juice-fx`; nút "Chơi lại" hiện sau khi điểm đã hiện, không đợi hết hoạt ảnh.

## Chơi lại và thoát giữa chừng

Giữ danh sách tween của chuỗi (`const run = Anim.seq(...)`) và huỷ khi người chơi thoát hoặc chơi lại: `run.forEach(Anim.cancel)`. Đặt lại mọi biến mà chuỗi đã sửa. Chuỗi cũ còn chạy ngầm là lỗi hay gặp nhất.

## Giảm chuyển động

Thay bằng mờ nhanh (150 ms) hoặc cắt thẳng. `Anim.tween` tự nhảy tới cuối khi `Anim.reduced`, nhưng `call` trong `Anim.seq` vẫn chạy đúng thứ tự, nên logic chuyển cảnh không hỏng.
