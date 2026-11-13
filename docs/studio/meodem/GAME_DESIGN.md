# Mèo đêm đột nhập (id `meodem`)

Yêu cầu gốc (13/11/2026): "Làm một trò chơi màn hình ngang khá giống cơ chế của game King of Thieves." Làm game nguyên bản cùng thể loại (nền tảng một chạm, nhân vật tự chạy), không dùng tên, nhân vật, hình, nhạc hay màn của game kia.

## Vòng lặp chơi
- Mèo tự chạy, đụng tường khi đang trên đất thì quay đầu.
- Một nút: chạm / phím cách / mũi tên lên để nhảy. Nhảy cao cố định (khoảng 3,4 ô), xa khoảng 3,5 ô.
- Giữa không trung mà chạm tường thì bám và trượt chậm; chạm tiếp để bật ngược ra (leo giếng bằng bật tường).
- Mỗi hầm là một màn hình 32×18 ô. Chạm rương là thắng. Chạm bẫy là ngã, hầm chơi lại ngay từ đầu (đếm số lần ngã).

## Bẫy và vật thể
| Ký tự | Vật thể | Luật |
|---|---|---|
| `#` | Tường đá | cứng |
| `-` | Ván một chiều | nhảy xuyên từ dưới lên, đứng được |
| `=` | Gạch mục | đứng lên 0,45 giây thì sụp, 2,6 giây sau mọc lại |
| `^` `v` | Gai sàn / gai trần | chạm là ngã |
| `F` `f` | Miệng lửa (2 nhịp lệch nhau) | chu kỳ 2,4 giây: phun 1 giây, nhấp nháy báo trước 0,45 giây |
| `H` `V` | Lưỡi cưa chạy ngang / dọc | chạy qua lại tới tường hoặc cọc chặn `!` |
| `T` | Lò xo tre | bật cao khoảng 6,8 ô |
| `K` `D` | Chìa khóa / cửa gỗ | có chìa thì mọi cửa mở |
| `*` | Ngọc bích | nhặt để lấy sao |
| `S` `s` / `C` | Mèo (quay phải / trái) / rương | |

## Sao và điểm
Mỗi hầm 3 sao độc lập, giữ vĩnh viễn: mở rương, nhặt đủ ngọc trong một lượt, về đích trong thời gian mốc.
Mốc giờ = thời gian nhanh nhất máy giải tìm được × 1,3 + 2 giây (làm tròn lên).
Điểm bảng xếp hạng `meodem` = tổng số sao của các hầm có sẵn (càng cao càng tốt, giữ cao nhất).

## Tự xây hầm
Vẽ ô trên lưới, chạy thử. Hầm chỉ lấy được mã chia sẻ khi chính người xây đã phá được nó (sửa bản đồ thì mất trạng thái kiểm chứng).
Mã dạng `MEODEM1:` + base64 của JSON {tên, bản đồ nén lặp ký tự}. Tối đa 12 hầm, 5 ngọc mỗi hầm.

## Kiểm màn
`node tool/meodem-solver.js [số hầm]` tìm đường nhanh nhất (và nhanh nhất khi nhặt đủ ngọc) bằng tìm kiếm theo lớp thời gian 0,05 giây. Mọi hầm có sẵn phải giải được cả hai.
