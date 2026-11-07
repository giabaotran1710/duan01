---
name: game-design
description: Thiết kế gameplay cho game HTML5 - luật, độ khó, cân bằng, nhịp độ, phần thưởng, cảm giác điều khiển và lý do chơi lại, mỗi cơ chế kèm tình huống kiểm chứng. Dùng sau game-analysis khi làm game mới, nâng cấp game, chỉnh độ khó hoặc thêm cơ chế. Đầu ra là GAME_DESIGN.md.
---

# Game Designer - Thiết kế gameplay

Biến phân tích thành thiết kế **kiểm chứng được**. Mỗi cơ chế phải có con số và một tình huống test, không chỉ là văn mô tả.

## Nguyên tắc

1. **Giữ lõi, nâng trải nghiệm.** Với game đang có, mặc định không đổi luật, cách tính điểm và độ khó cốt lõi (điểm trên bảng xếp hạng phải còn so được). Muốn đổi thì ghi rõ lý do và hỏi người dùng.
2. **Đọc được (readability):** mọi nguy hiểm phải được báo trước bằng hình + tiếng (telegraph) đủ lâu để phản ứng (thường 0,5–1 giây).
3. **Nhịp độ:** căng - nghỉ - căng. Độ khó tăng theo đường cong có trần, không tăng tuyến tính mãi.
4. **Tiến triển nhìn thấy được:** sau mỗi 15–30 giây phải có thứ gì mới (cảnh, nhạc, thử thách, cột mốc) để người chơi cảm thấy đang tiến lên.
5. **Thua công bằng:** người chơi luôn hiểu vì sao thua; màn thua cho biết họ đã đi được bao xa và còn gì phía trước.
6. **Chơi lại trong 1 chạm:** từ lúc thua đến lúc chơi tiếp không quá 2 thao tác.

## Khung GAME_DESIGN.md

```
# <Tên game> - Thiết kế
## 1. Mục tiêu thiết kế (3-5 gạch, đo được)
## 2. Giữ nguyên (luật, điểm, khóa lưu)
## 3. Cơ chế mới / thay đổi
   Với mỗi cơ chế:
   - Mô tả
   - Tham số (con số cụ thể, đơn vị)
   - Ảnh hưởng tới độ khó/điểm (nếu có)
   - Tình huống kiểm chứng: "Khi <điều kiện>, mong đợi <kết quả quan sát được>"
## 4. Đường cong nhịp độ (bảng thời gian → sự kiện)
## 5. Phản hồi cho từng hành động (hình / tiếng / rung)
## 6. Màn kết thúc & lý do chơi lại
## 7. Những gì cố ý KHÔNG làm (và vì sao)
```

## Kiểm tra cân bằng

- Ghi tham số độ khó hiện tại (đọc từ code) cạnh tham số mới.
- Nếu có sinh màn ngẫu nhiên, chạy bộ sinh nhiều lần bằng Playwright và báo phân phối (như đã làm với Trượt băng: số bước tối ưu 17-22).
- Nếu chỉ đổi hình/tiếng mà không đổi vật lý, ghi rõ "độ khó không đổi" để người kiểm biết cần xác nhận điều đó.

## Không làm

- Không thêm cơ chế chỉ vì "cho vui" khi nó làm loãng cảm xúc chính.
- Không đưa phần thưởng ngẫu nhiên kiểu cờ bạc, không phạt người chơi vì lỗi của máy (giật, mất mạng).
