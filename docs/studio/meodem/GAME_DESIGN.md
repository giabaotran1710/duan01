# Mèo đêm đột nhập (id `meodem`)

Yêu cầu gốc (13/11/2026): "Làm một trò chơi màn hình ngang khá giống cơ chế của game King of Thieves." Làm game nguyên bản cùng thể loại (nền tảng một chạm, nhân vật tự chạy), không dùng tên, nhân vật, hình, nhạc hay màn của game kia.

## Vòng lặp chơi
- Mèo tự chạy. Đụng tường khi đang trên đất thì mèo đứng yên chờ; chạm để nhảy ngay sát tường thì mèo nhảy và quay đầu.
- Một nút: chạm / phím cách / mũi tên lên để nhảy. Nhảy cao cố định (khoảng 3,4 ô), xa khoảng 3,5 ô.
- Giữa không trung còn 1 cú nhảy thứ hai (lực 310, bằng một nửa nhảy đất 620). Chạm đất, bám tường hoặc đạp lò xo thì nạp lại. Hằng số `P.airJumps` (hiện là 1) quyết định số cú nhảy trên không.
- Giữa không trung mà chạm tường thì bám và trượt chậm; chạm tiếp để bật ngược ra (leo giếng bằng bật tường).
- Hầm nối hầm, không có hầm cuối. Hầm 1-10 là hầm nhập môn làm tay (mỗi hầm giới thiệu một loại bẫy). Từ hầm 11, hầm được dựng tự động theo số hầm (cùng số thì giống nhau trên mọi máy), chia thành các khu chủ đề 10 hầm, độ khó lên theo răng cưa.
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
- Khu chủ đề: mỗi 10 hầm (11-20, 21-30, ...) là một khu, xoay vòng 6 khu: Mái ngói (lò xo), Lò bếp (lửa), Cống ngầm (cưa đuổi trên vách giếng), Xưởng cưa (cưa), Kho đạn (đại bác), Tháp canh (chìa và cửa, trộn bẫy). Từ vòng thứ hai mỗi khu mượn thêm bẫy của một khu khác. Mỗi khu có cảnh nền và màu đá riêng (`VIS`, `drawScene`).
- Kiểu phòng gọn (`genRoom` + `trapRoom`, khoảng 2/3 số hầm, được phép liền nhau): một phòng tường dày, sàn bậc cao thấp, gờ vách, khối đá giữa phòng, rương trên khối đá phía xa hoặc trên gờ cao phía cửa vào. Bẫy (3-6 cái) được đặt theo đường đi thật: lấy đường máy giải tìm được, đặt từng bẫy chắn đúng chỗ mèo đi qua (gai/lửa trên chỗ chạy, cưa xoay/cưa dọc/đại bác ở chỗ nhảy) rồi giải lại, bẫy nào làm hầm không qua được thì bỏ. Sau khi đặt, đo độ khắt khe bằng `jitter()`: phát lại đường đi với mỗi lần chạm lệch ngẫu nhiên ±0,05 giây, nếu tỉ lệ ngã thấp hơn mức của độ khó thì đặt thêm bẫy (tối đa 9) hoặc bỏ bản dựng.
- Các kiểu còn lại: tầng zíc zắc (khoảng cách tầng 4-6, mô đá phải nhảy qua, ván phụ có ngọc, tầng gạch mục trên hố gai), sảnh cầu thang (bậc so le, có cột chắn để quay đầu), mái nhà (dãy nhà cao thấp, hẻm gai, lò xo bật lên mái cao, đi ngược trên xà), giếng đứng (leo bằng bật tường hai bên).
- Bộ bẫy mỗi hầm (`kindsFor`): luôn có bẫy đặc trưng của khu, tối đa 4 loại. Hầm đầu khu chỉ dạy bẫy đặc trưng, hầm thứ 5 là hầm nghỉ (ít bẫy), hầm thứ 10 là hầm cao trào (có chìa và cửa nếu đủ tầng).
- Độ khó `diffOf(n)` = 0,45 + 0,06 × số khu + nhịp răng cưa trong khu (`ARC`), tối đa 0,85.
- Mỗi bản dựng chạy qua máy giải (`MD.solve`); chỉ giữ bản mở được rương VÀ nhặt đủ ngọc được, và về đích không dưới 5 giây; thử 14 lần không được thì đổi kiểu địa hình khác của khu (tối đa 40 lần).
- Trong trình duyệt việc dựng chạy trong Web Worker (dựng sẵn hầm kế tiếp khi đang chơi), lưu tạm 40 hầm gần nhất trong localStorage. Đổi bộ sinh thì tăng `GEN_VER`: các hầm chưa qua được dựng lại, hầm đã qua giữ nguyên.

## Sao và điểm
Mỗi hầm 3 sao độc lập: mở rương, nhặt đủ ngọc trong một lượt, về đích trong thời gian mốc.
Mốc giờ = thời gian nhanh nhất khi nhặt đủ ngọc × 1,3 + 2 giây (hầm nhập môn) hoặc × 1,35 + 2 giây (hầm dựng mới), làm tròn lên, nên một lượt chơi hoàn hảo lấy được cả 3 sao.
Điểm bảng xếp hạng `meodem` = số hầm xa nhất đã qua (càng cao càng tốt, giữ cao nhất).

## Kiểm màn
`node tool/meodem-solver.js [số hầm]` (hầm nhập môn) hoặc `node tool/meodem-solver.js gen 11 40` (hầm dựng mới) tìm đường nhanh nhất (và nhanh nhất khi nhặt đủ ngọc) bằng tìm kiếm theo lớp thời gian 0,05 giây. Mọi hầm có sẵn phải giải được cả hai.
