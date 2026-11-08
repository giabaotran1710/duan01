# Quản trị: danh sách người chơi và cấm tài khoản

Nút **khiên người dùng** (cạnh nút cờ lê hoạt động) chỉ hiện trên trang chủ cho tài khoản `giabao1710` thật sự: tên này phải
thuộc về đúng mã người chơi của máy (`/names/giabao1710` trên Firebase), nên sửa localStorage để giả tên không hiện được nút.

## Cài đặt một lần (bắt buộc, làm trên Firebase Console)

1. **Cập nhật luật**: Realtime Database → Rules → dán toàn bộ `database.rules.json` → Publish.
2. **Đặt mã quản trị**: Realtime Database → Data → thêm nút `admin` → con `key` = một chuỗi bí mật ngẫu nhiên, **tối thiểu 16 ký tự**
   (ví dụ tạo bằng trình quản lý mật khẩu). Chuỗi này không đọc được từ ngoài (`admin` bị khoá đọc/ghi).
3. **Nhập mã vào máy admin**: mở bảng quản lý → biểu tượng chìa khoá → dán đúng chuỗi trên → Lưu. Mã chỉ lưu trong trình duyệt
   của bạn (`localStorage.adm_key`), không nằm trong mã nguồn.

Chưa làm bước 1–2 thì bảng vẫn mở nhưng không tải được danh sách hoặc báo "Bị từ chối" khi cấm.

Nếu báo "Bị từ chối": (1) Publish lại luật mới nhất; (2) mở `admin/key` trong Data, xem giá trị có thừa dấu cách / xuống dòng / ngoặc kép không
rồi lưu lại, dán lại đúng mã đó vào bảng quản lý. Nên dùng mã khoảng 32–64 ký tự (luật cũ từ chối mã dài từ 100 ký tự trở lên).

## Cách hoạt động

- Danh sách người chơi lấy từ `/names` (tên → mã người chơi).
- **Cấm** ghi `/bans/{uid}` = `{ k, b: { on, n, t } }`. Luật Firebase chỉ nhận khi `k` bắt đầu bằng `"{admin/key}:"` và khác giá
  trị cũ, nên chỉ người biết mã quản trị mới cấm / bỏ cấm được. `b` đọc công khai, `k` thì không.
- Người bị cấm:
  - `maintenance.js` (có trong mọi trang game) chặn toàn bộ trò chơi bằng lớp phủ "Tài khoản đã bị cấm", kể cả khi đang chơi
    (kiểm tra lại mỗi 30 giây) và nhớ trạng thái cấm (`lb_banned`) để vẫn chặn khi mất mạng.
  - `scores.js` + `leaderboard-ui.js` không cho đổi tên; luật Firebase từ chối giữ chỗ tên mới và ghi/sửa điểm của mã đó.
- Bỏ cấm: bấm **Bỏ cấm**; máy người chơi tự gỡ chặn ở lần kiểm tra kế tiếp.

## Giới hạn cần biết

Trang web không có đăng nhập, danh tính người chơi là một mã ngẫu nhiên lưu trên máy (`lb_uid`). Người bị cấm xoá dữ liệu
trình duyệt sẽ có mã mới và vào lại được (với một tên mới). Muốn chặn triệt để cần có tài khoản đăng nhập thật.

<!-- Lần kiểm tra deploy: 2026-11-08 -->
