# Võ đài thẻ – thiết kế bản 2 (tham khảo lối chơi Plants vs. Zombies Heroes)

## Giữ nguyên
- 5 làn (Núi, 3 Đồng bằng, Biển), mỗi làn 2 ô mỗi bên; 4 giai đoạn mỗi vòng (Xuất quân → Bày trận → Kế hiểm → Khai chiến), đổi vai tấn công/phòng thủ.
- Quân lệnh cộng dồn theo số vòng; Thành 20 máu; 10 vòng; Mưu đặt úp; AI 4 mức không nhìn trộm bài.

## Mượn từ PvZ Heroes (viết lại theo chủ đề võ tướng, không dùng tên/hình của PvZ)
| PvZH | Võ đài thẻ |
|---|---|
| Hero + 4 Superpower | **Chủ tướng** (4 tướng) + 4 **Tuyệt kỹ** riêng, giá 1, dùng ngay trong lượt của mình |
| Block meter | **Khiên Thành**: mỗi đòn vào Thành nạp 1 nấc, đủ 4 nấc thì đòn đó bị chặn và nhận 1 Tuyệt kỹ (tối đa 3 lần/ván) |
| Heights / Water lane | **Núi**: Lính Tầm xa +1 Công. **Biển**: chỉ Lính có Thủy được đặt |
| Traits | Đánh trước, Giáp, Tầm xa, Thủy, Ẩn (như Gravestone), Xuyên phá (Strikethrough), Tất sát (Deadly), Cuồng nộ (Frenzy), Song kích (Double Strike), Bắn tỉa (Bullseye), Bắn trước (Overshoot), Xung phong, Cổ vũ |
| Class / deck | Mỗi tướng: bộ chung + 2 loại thẻ đặc trưng (×2) |

## Tình huống kiểm chứng
1. Đặt Lính không có Thủy vào Biển → không hợp lệ; Thủy binh vào Biển → hợp lệ.
2. Cung thủ ở Núi đánh 3 thay vì 2.
3. Thành trúng 4 đòn không Bắn tỉa → đòn thứ 4 bị chặn, Khiên về 0, tay +1 Tuyệt kỹ; sau 3 lần chặn thì Khiên không nạp nữa.
4. Thích khách (Ẩn) không lộ với đối thủ cho tới Khai chiến; Tất sát hạ Tượng binh 6 máu.
5. Hổ báo kỵ hạ Lính đối diện thì đánh tiếp vào Thành (Cuồng nộ).
6. Nỏ thần đánh Lính đối diện và cả Thành (Xuyên phá).
7. Song đao đánh hai lần; lần 2 vào Thành nếu Lính đối diện đã chết.
8. Thuyền chiến bắn trước 2 vào Lính đối diện trước khi giao chiến.
9. Sương giá: Lính bị đóng băng không đánh vòng đó.
10. AI tự chơi 300 ván không lỗi; tỉ lệ thắng giữa các tướng không lệch quá 60/40.
