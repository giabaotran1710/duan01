# Tia số - Hoạt ảnh

Làm bằng bộ `animation-studio`: `anim-css-ui` (bảng, chữ báo lỗi, dấu ✓), `anim-juice-fx` (`fx.js`), `anim-scene-transition` (chuỗi lúc thắng). Không đổi luật, điểm hay thời gian: thắng vẫn mở bảng sau 700 ms như cũ.

| Sự kiện | Mục đích | Hình | Thời lượng / easing | Âm thanh | Giảm chuyển động |
|---|---|---|---|---|---|
| Đặt ô lên bàn | Xác nhận | ô nảy vào (đã có `.pop`) | 220 ms ease-out | `sfx.place` có sẵn | không nảy |
| Đích vừa sáng (✓) | Thưởng nhỏ | `FX.ring` xanh lá quanh đích, chỉ khi đích đổi từ chưa sang đúng | 550 ms | có sẵn | không vòng |
| Báo lỗi (sai số, tia vòng, ô hợp quá tải...) | Từ chối | dòng chữ báo lỗi rung ngang ±6 px, chỉ khi câu báo đổi | 260 ms | - | không rung, chữ đỏ vẫn hiện |
| Thắng màn | Cao trào | khung đồng loé sáng hổ phách; mỗi đích có vòng sóng + 10 hạt, so le 90 ms | 900 ms (khung), 90 ms mỗi đích | `sfx.ok` có sẵn | chỉ chữ và bảng thắng |
| Mở bảng (thắng, menu, hướng dẫn) | Hướng mắt | bảng nảy vào; menu dạng ngăn kéo trượt từ dưới lên | 260 ms | - | hiện tức thì |
| Dấu ✓ ở bảng thắng | Thưởng | vòng tròn nảy rồi nét ✓ được vẽ dần | 450 ms + 380 ms | - | ✓ hiện ngay |

## Ngân sách hiệu năng
- Không thêm vòng `requestAnimationFrame` riêng: hạt do `fx.js` (một canvas phủ màn, tối đa 150 hạt trên điện thoại, chỉ chạy khi còn hạt). Phần còn lại là CSS (`transform`, `opacity`).
- Hiệu ứng "khung loé" dùng lớp `::after` đổi `opacity`, không đổi `box-shadow` mỗi khung.

## Kiểm chứng
- Chơi thật màn 1 bằng Playwright: đặt ô đúng, chờ khung có lớp `lit`, chụp ở +250 ms (khung sáng, vòng sóng và hạt quanh đích) và sau khi bảng mở (✓ đã vẽ xong).
- Chạy lại với `reducedMotion: reduce`: không có canvas hiệu ứng, bảng thắng vẫn mở, ✓ hiện đủ.
- `tiaso` không dùng `requestAnimationFrame` nên `motion-probe.js` báo "chưa đo được" là đúng; hiệu năng do `fx.js` quyết định.
