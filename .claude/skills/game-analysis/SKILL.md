---
name: game-analysis
description: Phân tích một game HTML5 (mới hoặc đang có) trước khi thiết kế hay viết code - vòng lặp chơi, luật, thắng/thua, điểm, người chơi mục tiêu, tình huống ngoại lệ, điểm yếu trải nghiệm và rủi ro kỹ thuật. Dùng ở bước đầu khi làm game mới, nâng cấp/làm lại game, hoặc thêm tính năng gameplay. Đầu ra là GAME_ANALYSIS.md.
---

# Game Analyst - Phân tích trò chơi

Hiểu đúng game **trước** khi đụng vào code. Với game đang có, phân tích dựa trên code thật, không dựa trên đoán.

## Cách làm

1. **Đọc code**, không đọc lướt: tìm vòng lặp (`requestAnimationFrame`/`setInterval`), trạng thái (`state`, `phase`), hàm cập nhật, hàm vẽ, input, lưu trữ (`localStorage` key), gửi điểm (`Scores.submit`). Ghi số dòng.
2. **Chơi thử** bằng Playwright (xem `html-game-studio` mục 4): chụp menu, đang chơi, thua/thắng. Nếu cần, giả lập input bằng `page.keyboard` hoặc gọi hàm nội bộ.
3. Viết `docs/studio/<id>/GAME_ANALYSIS.md` theo khung dưới.

## Khung GAME_ANALYSIS.md

```
# <Tên game> - Phân tích
## 1. Tóm tắt một câu
## 2. Người chơi mục tiêu & bối cảnh chơi (điện thoại? chơi nhanh 1-2 phút?)
## 3. Vòng lặp chơi
   - Vòng 1 giây (thao tác ↔ phản hồi)
   - Vòng 1 ván (bắt đầu → căng thẳng → kết thúc)
   - Vòng nhiều ván (lý do chơi lại: kỷ lục, mở khóa, xếp hạng)
## 4. Luật & điều kiện thắng/thua (trích hàm, số dòng)
## 5. Điểm số & độ khó (công thức thật trong code)
## 6. Trạng thái & chuyển trạng thái (sơ đồ: menu → play → ... )
## 7. Tình huống ngoại lệ (đổi tab, xoay màn, mất tiếng, chạm nhiều ngón, mạng lỗi)
## 8. Điểm mạnh cần giữ
## 9. Điểm yếu trải nghiệm (mỗi điểm có bằng chứng: ảnh, số liệu, dòng code)
## 10. Ràng buộc không được phá (id điểm, khóa lưu, luật người dùng đã chốt)
## 11. Rủi ro kỹ thuật & độ phức tạp
## 12. Câu hỏi còn mở (nếu thiếu thông tin quan trọng)
```

## Câu hỏi bắt buộc tự trả lời

- Người chơi làm gì trong **3 giây đầu**? Có hiểu ngay không?
- Cảm xúc chính của game là gì (căng thẳng, thư giãn, đắc thắng)? Hình, tiếng, chuyển động hiện có phục vụ cảm xúc đó chưa?
- Sau 30 giây chơi, có gì **mới** xuất hiện không, hay màn hình y như giây đầu?
- Khi thua, người chơi có hiểu vì sao thua và muốn chơi lại ngay không?
- Có cách khai thác nào phá luật (giữ nút, đổi tab để dừng thời gian, xoay màn)?

## Không làm

- Không đề xuất giải pháp trong tài liệu này (để cho `game-design`), chỉ nêu vấn đề và bằng chứng.
- Không viết "trò chơi khá tốt" chung chung; mỗi nhận xét gắn với bằng chứng.
