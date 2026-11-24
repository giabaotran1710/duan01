# Vết cắt vô hình - Hoạt ảnh

Game đã có rung màn, hạt và chữ nổi trên canvas. Lần này bổ sung bằng `anim-css-ui`, `anim-juice-fx`: phản hồi ở HUD, viền khi chạm, vào màn hình theo lớp, và nhánh giảm chuyển động (trước đây chưa có). Không đổi luật, điểm, thời gian hay độ khó.

| Sự kiện | Mục đích | Hình | Thời lượng / easing | Âm thanh | Giảm chuyển động |
|---|---|---|---|---|---|
| Ghi điểm | Xác nhận | số điểm trên HUD phóng 1,3 lần và đổi xanh lá | 260 ms, nảy nhẹ | `ok` có sẵn | số đổi, không nảy |
| Chạm vết cắt | Cảnh báo | viền đỏ mờ dần quanh khung chơi (cộng rung màn và hạt đỏ có sẵn) | 320 ms ease-out | `hit` có sẵn | không viền, không rung, không hạt; chữ "CHẠM!" và tim mất vẫn hiện |
| Vào menu / tạm dừng / hết mạng | Hướng mắt | từng khối trồi lên 14 px, so le 60 ms | 380 ms ease-out | - | hiện tức thì |
| Hết mạng: điểm | Thưởng | số điểm đếm từ 0 lên điểm cuối (`FX.count`) | 800 ms | - | hiện ngay số cuối |
| Hết mạng: kỷ lục mới | Thưởng | nhãn "KỶ LỤC MỚI" nảy vào, sau đó 18 hạt sao vàng (`FX.burst`) | 500 ms + 900 ms | - | nhãn hiện tĩnh, không hạt |

## Ngân sách hiệu năng
- Không thêm vòng rAF. CSS chỉ dùng `transform` và `opacity`; hạt kỷ lục chỉ bắn một lần khi hết mạng (≤ 18 hạt).
- Hạt của game (tối đa 240) giữ nguyên; trong chế độ giảm chuyển động `burst` thoát ngay.

## Kiểm chứng
- Chơi thật bằng Playwright (iPhone 13, 7 ván): thấy lớp `bump` ở điểm, `on` ở viền chạm, `S.shake > 0`, màn hết mạng mở đúng; không lỗi JS.
- Chạy lại với `reducedMotion: reduce`: không có `bump`, `on` hay rung; ván vẫn chơi và kết thúc bình thường.
- `motion-probe.js --click '#bPlay' --cpu 4`: p95 16,8 ms, không khung nào trên 20 ms.
