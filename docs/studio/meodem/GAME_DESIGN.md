# Mèo đêm đột nhập (id `meodem`)

Yêu cầu gốc (13/11/2026): "Làm một trò chơi màn hình ngang khá giống cơ chế của game King of Thieves." Làm game nguyên bản cùng thể loại (nền tảng một chạm, nhân vật tự chạy), không dùng tên, nhân vật, hình, nhạc hay màn của game kia.

## Vòng lặp chơi
- Mèo tự chạy, đụng tường khi đang trên đất thì quay đầu.
- Một nút: chạm / phím cách / mũi tên lên để nhảy. Nhảy cao cố định (khoảng 3,4 ô), xa khoảng 3,5 ô.
- Giữa không trung mà chạm tường thì bám và trượt chậm; chạm tiếp để bật ngược ra (leo giếng bằng bật tường).
- Hầm nối hầm, không có hầm cuối. Hầm 1-10 là hầm nhập môn làm tay (mỗi hầm giới thiệu một loại bẫy). Từ hầm 11, hầm được dựng tự động theo số hầm (cùng số thì giống nhau trên mọi máy), độ khó tăng tới hầm 29 rồi giữ nguyên.
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
| `O` | Cưa xoay vòng | quay tròn quanh trục, bán kính 34 điểm ảnh |
| `X` `Y` | Cưa rượt đuổi (sàn / tường) | thấy mèo đi trên sàn (X) hoặc bám tường (Y) trong đoạn ray thì tăng tốc đuổi tới cuối đoạn, rồi chậm rãi về chỗ cũ |
| `1`-`8` | Đại bác cố định | bắn mỗi 2 giây theo 1 trong 8 hướng (1 phải, theo chiều kim đồng hồ) |
| `Q` | Đại bác xoay | tới nhịp thì ngắm đúng chỗ mèo đang đứng và bắn |
| `W` `M` | Đại bác chạy ray | chạy qua lại trên ray, bắn xuống (W) hoặc bắn lên (M) |
| `T` | Lò xo tre | bật cao khoảng 6,8 ô |
| `K` `D` | Chìa khóa / cửa gỗ | có chìa thì mọi cửa mở |
| `*` | Ngọc bích | nhặt để lấy sao |
| `S` `s` / `C` | Mèo (quay phải / trái) / rương | |

## Dựng hầm vô hạn (`MD.gen(n)`)
- Hai kiểu: các tầng zíc zắc nối bằng ván một chiều, hoặc sảnh lớn với cầu thang lơ lửng; lật trái phải ngẫu nhiên.
- Bẫy mở dần theo độ khó: gai, lửa, cưa ngang, cưa dọc, gạch mục, gai trần, chìa và cửa.
- Mỗi bản dựng chạy qua máy giải (`MD.solve`); chỉ giữ bản mở được rương VÀ nhặt đủ ngọc được, nếu không thì thử bản kế tiếp (tối đa 40).
- Trong trình duyệt việc dựng chạy trong Web Worker (dựng sẵn hầm kế tiếp khi đang chơi), lưu tạm 40 hầm gần nhất trong localStorage.

## Sao và điểm
Mỗi hầm 3 sao độc lập: mở rương, nhặt đủ ngọc trong một lượt, về đích trong thời gian mốc.
Mốc giờ hầm nhập môn = thời gian nhanh nhất × 1,3 + 2 giây; hầm dựng mới = × 1,35 + 2 giây (làm tròn lên).
Điểm bảng xếp hạng `meodem` = số hầm xa nhất đã qua (càng cao càng tốt, giữ cao nhất).

## Kiểm màn
`node tool/meodem-solver.js [số hầm]` (hầm nhập môn) hoặc `node tool/meodem-solver.js gen 11 40` (hầm dựng mới) tìm đường nhanh nhất (và nhanh nhất khi nhặt đủ ngọc) bằng tìm kiếm theo lớp thời gian 0,05 giây. Mọi hầm có sẵn phải giải được cả hai.
