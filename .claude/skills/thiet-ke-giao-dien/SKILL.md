---
name: thiet-ke-giao-dien
description: Thiết kế giao diện web/game có cá tính riêng, tránh vẻ "AI mặc định". Dùng khi tạo mới hoặc làm lại giao diện, trang, màn hình menu, thẻ bài, nút, hoạt ảnh. Viết kế hoạch thiết kế trước, rồi mới code.
---

# Thiết kế giao diện có chủ đích

Dựa trên nguyên tắc của skill Frontend Design (Anthropic), viết lại cho dự án cổng game này. Mục tiêu: mỗi màn hình trông như được thiết kế cho đúng chủ đề của nó, không phải khuôn mẫu chung.

## Quy trình bắt buộc

1. **Viết kế hoạch thiết kế ngắn** (5-10 dòng) trước khi code: chủ đề, người dùng, màu, chữ, bố cục, 2-3 nguyên tắc riêng.
2. **Soát kế hoạch với yêu cầu**: chỗ nào nghe giống mọi giao diện khác thì sửa. Hỏi: "Nếu bỏ tên game đi, người ta có nhận ra đây là game nào không?"
3. **Build**, rồi tự kiểm tra bằng ảnh chụp thật ở 390x780 và 360x640 (hoặc cỡ màn hình đích). Sửa lỗi xung đột CSS (độ ưu tiên selector) trước khi báo xong.

## Bắt đầu từ chủ đề

- Xác định: sản phẩm là gì, ai dùng, việc chính của màn hình này là gì.
- Mượn hình ảnh, chất liệu, ngôn ngữ thị giác từ chính chủ đề (ví dụ game dân gian dùng trống đồng, giấy dó, sơn mài; game công nghệ dùng bản vẽ, lưới, màn hình).
- Phần mở đầu (hero, màn hình chính) mở bằng yếu tố đặc trưng nhất của thế giới đó, không phải con số lớn kèm nền gradient mặc định.

## Chữ

- Dùng 1-2 họ chữ khác biệt rõ, có thang cỡ chữ cố ý (ví dụ 12 / 14 / 18 / 28 / 44).
- Tránh: nhấn riêng một từ trong tiêu đề, nhãn viết hoa toàn bộ không cần thiết, nhãn nhỏ đặt trên mọi khối nội dung.
- Dòng văn bản dài không quá ~80 ký tự. Chữ có chân (serif) cần dòng cao hơn chữ không chân.
- Tiếng Việt: kiểm tra dấu không bị cắt (line-height tối thiểu 1.2 cho tiêu đề, 1.4 cho đoạn văn).

## Màu

- Chọn bảng màu từ chủ đề, định nghĩa thành biến CSS (token) ở `:root`, không rải mã màu khắp nơi.
- Màu phải hài hòa và đủ tương phản (chữ thường ≥ 4.5:1). Một màu nhấn chính, không rải nhiều màu bằng nhau.
- Tránh bảng màu "AI quen thuộc": nền kem + nhấn đất nung, tím-xanh gradient, thẻ kính mờ... trừ khi yêu cầu thật sự đòi hỏi.

## Bố cục và cấu trúc

- Viền, đường kẻ, số thứ tự phải mang thông tin. Chỉ đánh số khi là chuỗi bước thật.
- Tránh bộ khung SaaS dựng sẵn: lưới thẻ giống hệt nhau, thanh điều hướng/chân trang mẫu, nút bo tròn mặc định.
- Tạo nhịp: khối lớn xen khối nhỏ, khoảng trắng có chủ ý, một điểm nhìn chính cho mỗi màn hình.
- Mobile trước: lề 16px, không cuộn ngang, vùng chạm ≥ 44px.

## Hình ảnh

- Ưu tiên canvas/SVG tự vẽ hoặc hình thật hơn emoji hay biểu tượng thư viện dùng chung.
- Biểu tượng nên cùng một nét vẽ, cùng độ dày, cùng góc bo.

## Chuyển động

- Dùng tiết kiệm: một khoảnh khắc được dàn dựng kỹ tốt hơn nhiều hiệu ứng rải rác.
- Chuyển động phản hồi hành động của người dùng (bấm, kéo, thắng/thua), không chỉ để trang trí.
- Tôn trọng `prefers-reduced-motion`.

## Mức tối thiểu phải đạt

- Responsive, trạng thái focus nhìn thấy được, điều khiển bằng bàn phím được, không phụ thuộc mỗi màu để truyền đạt thông tin.
- Chế độ sáng/tối nếu trang hỗ trợ, nền `body` luôn đặt rõ.
- Không có lỗi console; tải ổn khi mạng chậm hoặc font không tải được.

## Nội dung chữ trên giao diện

- Viết từ góc nhìn người dùng, câu chủ động, viết hoa kiểu câu (sentence case).
- Thông báo lỗi nói rõ chuyện gì sai và làm gì tiếp.
- Nút nói rõ hành động ("Lên đường", "Hết lượt"), tránh "OK", "Gửi".

## Riêng cho cổng game này

- Mỗi game có nhận diện riêng, không dùng chung khung với game khác (menu, nút, bảng phụ khác nhau).
- Logo trên trang chủ là biểu tượng nhỏ có chuyển động nhẹ, dùng màu phẳng, bo theo khung nút chung của trang.
- Mọi game phải có: chân trang phiên bản `.tbFooter`, chế độ bảo trì (`maintenance.js`), xử lý xoay màn hình, và chạy tốt ở màn hình nhỏ.
- Hình minh họa mới (bài, quái, cổ vật) chỉ cần **khác một chút** so với hình có sẵn (đổi màu, đổi chi tiết, đổi tư thế) là đạt; không bắt buộc vẽ lại từ đầu.
- Sau khi đổi giao diện: chụp ảnh preview gửi cho chủ dự án trước khi xem là xong.

## Những điều cần tránh (tự kiểm tra cuối cùng)

- [ ] Có thể nhầm với game/trang khác nếu bỏ logo?
- [ ] Có ô, thẻ, nút nào chỉ để "cho đầy" mà không mang thông tin?
- [ ] Có hiệu ứng nào không phản hồi hành động nào?
- [ ] Có chữ thừa lặp lại điều đã rõ?
- [ ] Đã kiểm tra bằng ảnh chụp thật chưa?
