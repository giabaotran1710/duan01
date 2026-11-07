# Thả diều - Thiết kế nâng cấp "Hành trình bầu trời"

## 1. Mục tiêu (đo được)
1. Mỗi ~20 giây bay, thế giới thay đổi rõ rệt (bầu trời, ánh sáng, âm thanh) và có banner cột mốc.
2. Cảnh mang bản sắc làng quê Việt: lũy tre, mái đình, nhà tranh lên đèn, ruộng nước soi bóng trời, con trâu, tiếng sáo diều.
3. Khoảnh khắc đứt dây có khựng khung, chớp, rung, dây giật ngược.
4. Màn thua cho biết đã bay tới đâu trên hành trình và còn bao nhiêu giây tới cảnh kế tiếp.
5. Độ khó và điểm **không đổi** (vật lý giữ nguyên).

## 2. Giữ nguyên
Toàn bộ vật lý, gió, lực căng, điều kiện thua, cách tính điểm, khóa lưu, điều khiển.

## 3. Cơ chế mới
### 3.1 Hành trình bầu trời (chu kỳ 140 giây theo thời gian bay)
| Giây | Cảnh | Bầu trời | Ánh sáng |
|---|---|---|---|
| 0 | Trưa nắng | xanh trong | mặt trời cao |
| 20 | Nắng chiều | xanh ngả vàng | mặt trời hạ, nắng vàng |
| 40 | Hoàng hôn | cam - hồng - tím | mặt trời to, đỏ, chạm núi ở giây ~52 |
| 58 | Đêm trăng | xanh thẫm | sao, trăng lên, nhà lên đèn, đom đóm |
| 105 | Bình minh | hồng - tím nhạt | sao tắt dần |
| 140 | Ngày mới (lặp) | | |
- Tham số: `JOURNEY` (bảng khung màu), nội suy smoothstep giữa hai khung kề nhau.
- Kiểm chứng: đặt `state.t = 45` → bầu trời có tông cam, mặt trời gần đường chân trời; `state.t = 70` → nền tối, có sao và trăng, cửa sổ nhà sáng.

### 3.2 Banner cột mốc
- Khi bước sang cảnh mới (trừ cảnh đầu): banner tên cảnh trượt từ trên xuống, 2,6 giây, kèm tiếng chuông ngũ cung và dòng "Bay được N giây".
- Kiểm chứng: chơi qua giây 20 → banner "NẮNG CHIỀU" hiện đúng một lần.

### 3.3 Làng quê & thị sai
- Lớp xa: núi mờ. Lớp giữa: lũy tre, đình, nhà tranh, ruộng nước phản chiếu màu trời. Lớp gần: đồi cỏ.
- Thị sai theo vị trí diều: xa 1,5%, giữa 3%, gần 6% của `kite.x` (ngược chiều), chỉ là hình, không đổi vật lý.
- Con trâu gặm cỏ đi chậm trên bờ ruộng.

### 3.4 Báo trước cơn giật rõ hơn
- Trong 0,9 giây cảnh báo (`wind.warn`, có sẵn): mép màn hình phía gió tới hiện dải mũi tên sáng nhấp nháy ≤ 3 lần/giây, kèm tiếng "vù" tăng dần. Không đổi thời gian cảnh báo.

### 3.5 Đứt dây
- Khựng 90 ms, chớp trắng 1 khung (độ mờ 0,5), rung màn 350 ms biên độ 8 px giảm dần, dây giật ngược lò xo về tay người.

### 3.6 Màn thua
- Thanh hành trình 5 mốc (Trưa · Chiều · Hoàng hôn · Đêm · Bình minh) với vị trí đã đạt.
- Dòng mục tiêu: "Còn X giây nữa là tới <cảnh kế>" (hoặc "Bạn đã bay trọn một ngày!").

## 4. Phản hồi
| Hành động | Hình | Tiếng | Rung |
|---|---|---|---|
| Giữ kéo | người nghiêng, dây căng | sáo diều cao hơn | - |
| Lực căng > 0,8 | viền đỏ đập theo nhịp tim | tiếng tim đập | - |
| Cơn giật tới | dải mũi tên mép màn | vù | - |
| Qua cảnh mới | banner | chuông ngũ cung | 20 ms |
| Đứt dây | khựng, chớp, rung | tưng + rơi | 80 ms |

## 5. Âm thanh: sáo diều
Hai dao động sin lệch nhẹ (luồng hơi + họa âm) chơi các nốt ngũ cung Đô (C5 D5 E5 G5 A5), đổi nốt chậm 2–4 giây, rung (vibrato) 5 Hz; âm lượng theo sức gió; tắt khi tắt tiếng.

## 6. Cố ý không làm
- Không thêm vật cản / vật phẩm (giữ game một-cơ-chế, kỷ lục cũ còn công bằng).
- Không đổi thời gian báo trước cơn giật.
