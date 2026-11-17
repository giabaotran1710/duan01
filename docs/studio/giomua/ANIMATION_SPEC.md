# Gió mùa: đồ họa và chuyển động

Phong cách: tranh cắt giấy nhiều lớp. Màu phẳng, mỗi mảng có bóng đổ mềm 2-4 px lệch xuống như giấy dán chồng, phủ hạt giấy nhẹ.

## Bảng màu Xuân (Bắc Bộ)
Trời bình minh #f9d9b8 -> trưa #bfe0ef -> chiều #f6b98a -> tối #3b3157. Núi xa #9fb7c9 / #b9cbd6. Tre #5f8f5a / #7aa86b.
Mái ngói #b5523b, tường vôi #f3e6cf, đào #f7a8b8 / #e86f8e, đèn lồng #d8382f / vàng #ffcf5a, ruộng khô #d6b56a -> xanh #7cc46a.
Chữ: Be Vietnam Pro (giao diện), Dancing Script (tên game).

## Lớp cảnh (thị sai)
0 trời (vẽ động, chuyển màu theo tiến độ chặng) · 1 núi xa 0,15 · 2 tre, đình, cây đa 0,35 · 3 nhà làng, cây cau 0,62 · 4 mặt đất, bờ ruộng 1,0 · 5 cỏ tiền cảnh 1,25 (lay theo gió).
Lớp 1-4 là tranh tĩnh, vẽ sẵn thành ô 512 đơn vị, chỉ vẽ ô đang thấy.

## Gió nhìn thấy được
- Dải lụa trắng: hạt có đuôi 14 điểm chạy theo trường gió, sinh ở chỗ gió > 70, mờ dần 1,1 giây.
- Cánh đào bay khắp khung (70 cánh), lật theo gió.
- Cỏ, lúa, khói bếp, đuôi diều ngả theo gió tại chỗ.

## Hiệu ứng
| Sự kiện | Hiệu ứng | Thời lượng |
|---|---|---|
| Ước nguyện xong | đèn lồng bừng sáng, vòng tỏa, hoa giấy nở, chuông gió ngũ cung | 0,9 s |
| Mây gộp | mây nảy (scale 1,15 -> 1, easeOutBack) | 0,35 s |
| Mất lá | lá bay khỏi HUD, rung màn 6 px | 0,4 s |
| Đứt dây diều | diều xoay tròn bay đi, dây rơi | 2 s |
| Sét (giông) | chớp trắng 2 khung + tia sét, tiếng sấm | 0,25 s |
| Qua trận giông | trời quang dần, cầu vồng giấy | 2,5 s |
Giảm chuyển động (prefers-reduced-motion): tắt rung màn và chớp.

## Ngân sách hiệu năng
Tối đa 400 hạt (điện thoại) / 900 (máy tính). Mây, trẻ con, diều vẽ sẵn thành sprite. Khung p95 < 20 ms khi giả lập CPU chậm 4 lần.
