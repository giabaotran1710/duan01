# Gió mùa (id `giomua`)

Yêu cầu gốc (17/11/2026): "Lên kế hoạch sáng tạo một siêu game dùng màn hình ngang", rồi "[*] Làm đi, làm thật là kỹ về mặt hình ảnh, đồ hoạ".
Kế hoạch: https://claude.ai/artifact/4YV1vYhp8g3GjL6ZUg2foR. Game gốc, không dựa trên game có sẵn.
Đợt này: lõi gió + chương Xuân (5 chặng + 1 trận giông) chơi được trọn vẹn, đồ họa hoàn chỉnh. Hạ / Thu / Đông hiện "Sắp ra mắt".

## Vòng lặp chơi
- Người chơi là cơn gió. Cảnh là một dải tranh giấy dài khoảng 2,6 màn hình, camera tự trôi sang phải trong 95-130 giây.
- Ước nguyện của dân làng hiện thành đèn lồng đỏ (vòng tiến độ quanh đèn). Đèn trôi khỏi mép trái mà chưa xong thì coi là lỡ.
- Hết cảnh: xong đủ số ước nguyện cần thì qua chặng. Làng có 3 lá sức sống; mất hết là thua ngay.

## Ba động tác (trường gió lưới 20 đơn vị, toạ độ thế giới, cao 540)
| Động tác | Thao tác | Tác dụng | Hơi gió |
|---|---|---|---|
| Luồng | vuốt / kéo chuột | các ô trong bán kính 70 kéo dần về vận tốc của nét vuốt (tối đa 430) | theo độ dài nét |
| Xoáy | nét vuốt quay đủ ~300° | xoáy 2,6 giây, hút vào tâm và quay tròn | 18 |
| Lặng | giữ yên một chỗ 0,3 giây, chạm hai ngón, hoặc giữ Space | vùng bán kính 95 tắt gió, kể cả gió bão | 22/giây |
Hơi gió tối đa 100, hồi 16/giây sau 0,4 giây nghỉ. Hết hơi thì nét vuốt không còn tác dụng. Gió tự lắng về gió nền của chặng.

## Vật và luật
| Vật | Luật | Tình huống kiểm chứng |
|---|---|---|
| Mây nhỏ | trôi theo gió; 2 mây chạm nhau gộp lại (cỡ 1+1=2, tới 3) | đẩy 3 mây vào nhau thành mây mưa xám đậm |
| Mây mưa (cỡ 3) | mưa liên tục, chứa 7 giây nước rồi tan thành mây nhỏ | đứng yên trên ruộng 4 giây thì ruộng xanh |
| Ruộng mạ | cần 4 giây mưa | ruộng chuyển từ vàng khô sang xanh, đèn lồng sáng |
| Sân phơi thóc | mưa 1,5 giây thì mất 1 lá, rồi dân làng che bạt (không mất thêm) | đẩy mây mưa qua sân phơi |
| Diều | gió đều nâng diều; diều ở cao hơn tay trẻ 120 trong 4 giây là xong; gió tại diều > 340 thì đứt dây, 4 giây sau trẻ có diều mới | vuốt rất nhanh qua diều làm đứt dây |
| Bồ công anh | gió > 90 làm bung hạt; hạt rơi vào luống đất trống thì nở hoa; 3 hoa là xong | dùng xoáy gom hạt rồi thả xuống luống |
| Mái chợ (trận giông) | gió > 170 tại mái làm mái hỏng dần; hỏng hẳn thì bay mái, mất 1 lá | đặt vùng lặng chắn trước mái |
| Cơn giật (trận giông) | báo trước 1,2 giây bằng mũi tên, rồi luồng gió mạnh lao về một mái | thổi ngược hoặc lặng để bẻ |

## Chặng (chương Xuân, Đồng bằng Bắc Bộ)
1. Mưa xuân: 2 ruộng, cần 2. Nhập môn vuốt và gộp mây.
2. Làng diều: 3 diều, cần 2. Học gió đều, gió gắt làm đứt dây.
3. Hạt gió: 2 luống hoa + 1 ruộng, cần 2. Học xoáy.
4. Phiên chợ: 2 ruộng + 1 diều, sân phơi giữa ruộng, có gió giật tự nhiên. Học lặng. Cần 2.
5. Chiều hội: 6 ước nguyện trộn, cần 4, cảnh chiều tối đèn lồng.
6. Giông đầu mùa: cảnh đứng yên, 3 đợt giật + mây đen, giữ được ít nhất 1 lá là qua; mỗi mái còn nguyên là 1 ước nguyện.

## Điểm
- Lưu `giomua_v1`: `best[i]` = số ước nguyện nhiều nhất của chặng i khi qua chặng; chặng qua hiện tick xanh lá (không chấm sao).
- Điểm bảng xếp hạng = tổng `best`, giữ điểm cao nhất (`Scores.submit('giomua', tổng)`).
