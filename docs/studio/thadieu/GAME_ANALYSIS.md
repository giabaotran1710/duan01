# Thả diều - Phân tích

## 1. Tóm tắt
Giữ diều trong khung trời bằng hai nút Kéo trái/Kéo phải, chống lại gió nền và các cơ gió giật, không được giữ nút quá lâu kẻo dây căng quá mức và đứt. Điểm là số giây bay.

## 2. Người chơi & bối cảnh
Điện thoại dọc, ván ngắn (15–60 giây), chơi đi chơi lại để phá kỷ lục. Có thêm nghiêng máy (gyro) góp ~25% lực.

## 3. Vòng lặp chơi
- 1 giây: thấy diều lệch / gió đổi → nhấp nút kéo theo nhịp → xem thanh lực căng.
- 1 ván: gió nền + cơn giật báo trước 0,9 giây (`updateWind`, dòng 303–335), độ khó tăng tới 1,7× ở giây 105 (`difficulty`, dòng 302).
- Nhiều ván: kỷ lục (`thadieu_v1`), bảng xếp hạng (`Scores.submit('thadieu', t*10)`, dòng 662).

## 4. Luật thua (dòng 361–362)
- `tension >= 1` → "Dây căng quá mức".
- `|kite.x| > W/2 + 4` → "Diều bay khỏi khung trời".

## 5. Số liệu đo bằng Playwright
| Cách chơi | Thời gian sống |
|---|---|
| Không bấm gì | 20,6 giây (bay khỏi khung) |
| Bot kéo theo nhịp ngược độ lệch | 60,7 giây |
→ Phần lớn ván nằm trong khoảng 15–60 giây; người giỏi vượt 60 giây.

## 6. Trạng thái
`menu → play → snap (1,4 giây) → over → play`.

## 7. Điểm mạnh cần giữ
- Vật lý diều/đuôi verlet mượt, dây đổi màu và rung khi căng.
- Cảnh báo mép đỏ, vệt gió, lá bay, mây trôi theo gió, tiếng gió tổng hợp.
- Điều khiển đơn giản, một tay chơi được.

## 8. Điểm yếu trải nghiệm (bằng chứng: ảnh old_menu/old_play/old_over)
1. **Thế giới đứng yên:** giây 1 và giây 60 trông giống hệt nhau (cùng bầu trời xanh, cùng nền). Không có cảm giác "đi được xa".
2. **Cảnh chung chung:** đồi cỏ + núi có thể ở bất kỳ đâu; chỉ có nón lá gợi Việt Nam, trong khi thả diều là ký ức làng quê Việt (lũy tre, đình, ruộng lúa, trâu, sáo diều).
3. **Khoảnh khắc đứt dây yếu:** chỉ có tiếng "tưng" và diều bay đi; không khựng, không rung, không chớp.
4. **Màn thua chỉ có con số:** không cho biết đã đi được bao xa so với "hành trình", không có mục tiêu kế tiếp để muốn chơi lại.
5. **Âm thanh đơn điệu:** chỉ có tiếng gió; không có tiếng sáo diều đặc trưng.
6. **Cơn gió giật** báo trước bằng gió nổi dần nhưng khó thấy từ phía nào tới.

## 9. Ràng buộc không được phá
- Vật lý & độ khó (`updateWind`, `updateKite`, `PULL`, `BREAK`, `difficulty`): giữ nguyên để kỷ lục cũ còn so được.
- `Scores.submit('thadieu', Math.floor(t*10))`, khóa `thadieu_v1`.
- Nút Kéo trái/phải, phím mũi tên/A/D, Space/Enter, nút âm thanh, nghiêng máy.

## 10. Rủi ro kỹ thuật
- Vẽ thêm lớp nền mỗi khung có thể tụt FPS trên điện thoại yếu → vẽ sẵn, pha trộn.
- Ban đêm phải giữ diều, dây, HUD dễ nhìn.
