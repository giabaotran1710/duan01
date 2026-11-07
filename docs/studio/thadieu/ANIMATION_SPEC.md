# Thả diều - Hoạt ảnh

| Sự kiện | Mục đích | Hình | Thời lượng / easing | Âm thanh | Giảm chuyển động |
|---|---|---|---|---|---|
| Đổi cảnh trời | Tiến triển | nội suy màu trời, mặt trời/trăng di chuyển | liên tục, smoothstep giữa mốc | sáo đổi âm vực nhẹ | giữ |
| Banner cột mốc | Thưởng | trượt xuống + mờ dần | vào 450 ms nảy nhẹ, giữ 1,6 s, ra 500 ms | chuông ngũ cung | chỉ mờ, không trượt |
| Sao lấp lánh | Không khí đêm | alpha sin, chu kỳ 2–5 s | liên tục | - | sao đứng yên |
| Đom đóm | Không khí đêm | 22 chấm sáng bay lượn | liên tục | - | ẩn |
| Cảnh báo cơn giật | Báo trước | dải mũi tên mép màn, nhấp nháy 2,5 lần/s | 0,9 s tăng dần | vù | giữ (cần cho gameplay) |
| Căng dây nguy hiểm | Cảnh báo | viền đỏ đập theo nhịp tim 1,6 Hz | khi tension > 0,8 | tim đập | viền tĩnh |
| Đứt dây | Va chạm | khựng 90 ms → chớp trắng → rung 350 ms 8 px `(1-t)^2` | | tưng | không rung, không chớp |
| Dây giật ngược | Follow-through | điểm giữa dây là lò xo tắt dần | 1,2 s | - | giữ |
| Thị sai | Chiều sâu | lớp nền dịch theo diều | lerp mượt | - | tắt |

## Ngân sách hiệu năng
- Nền: 3 lớp × 3 bảng màu (ngày, hoàng hôn, đêm) vẽ sẵn theo dải chiều cao, pha trộn bằng `globalAlpha`; vẽ lại chỉ khi đổi kích thước màn hình.
- Mỗi khung: 1 gradient trời, ≤ 140 sao, ≤ 22 đom đóm (sprite vẽ sẵn), dải ruộng phản chiếu 1 gradient.
- Mục tiêu: thời gian khung p95 < 20 ms trên Playwright với CPU chậm ×4.

## Kiểm chứng
- Chụp các mốc t = 5, 25, 45, 52, 70, 115 giây (đặt `state.t` trực tiếp) và màn đứt dây.
- Đo thời gian khung 8 giây ở t = 5 (ngày) và t = 70 (đêm) có/không CPU chậm.
