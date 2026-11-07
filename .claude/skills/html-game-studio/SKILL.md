---
name: html-game-studio
description: Điều phối toàn bộ việc làm/sửa game HTML5 trong kho giabao1710.click như một studio nhỏ - phân loại yêu cầu, chỉ gọi đúng các skill chuyên môn cần thiết, đặt cổng kiểm định (quality gates) và giao kiểm tra độc lập cho subagent trước khi báo xong. Dùng khi tạo game mới, nâng cấp/làm lại game, thêm tính năng, đổi giao diện, thêm hoạt ảnh hay sửa lỗi trong game/*.html.
---

# HTML Game Studio - Master Skill

Mục tiêu: một yêu cầu về game đi qua đúng các bước cần thiết, có bằng chứng ở mỗi cổng, và **không ai tự chấm bài của chính mình**. Code chạy không báo lỗi chưa phải là xong.

## 1. Phân loại yêu cầu rồi chỉ chạy đúng tuyến

| Yêu cầu | Tuyến | Skill / agent dùng |
|---|---|---|
| Game mới hoặc làm lại lớn | Đủ 11 bước | `game-analysis` → `game-design` → `thiet-ke-giao-dien` → `game-motion` → code → 4 subagent → báo cáo |
| Thêm tính năng gameplay | Phân tích → Thiết kế → Code → Test | `game-analysis` (rút gọn), `game-design`, `gameplay-tester` |
| Đổi giao diện / logo / bố cục | UI → Code → Kiểm tra hình | `thiet-ke-giao-dien` hoặc `ui-ux-pro-max`, `visual-reviewer` |
| Thêm hoạt ảnh / hiệu ứng | Motion → Code → Hiệu năng | `game-motion`, `performance-auditor` |
| Sửa lỗi | Tái hiện → Nguyên nhân gốc → Sửa → Hồi quy | `awesome-bug-fix`, `gameplay-tester` |
| Tối ưu code | Kiểm code → Refactor → Test | `code-auditor`, `awesome-code-standards` |
| Kiểm tra toàn diện | QA → kiểm độc lập → báo cáo | cả 4 subagent |

Sửa một cái nút không chạy quy trình 11 bước. Chọn tuyến ngắn nhất đủ để có bằng chứng.

### Yêu cầu đơn giản: làm ngay, không kiểm tra lại (người dùng đã chốt)
Yêu cầu đơn giản (xoá/ẩn một thành phần, đổi chữ, đổi màu, chỉnh vài con số, gỡ một dòng patchnote...) thì **làm luôn và không chạy lại kiểm thử trình duyệt, không gọi subagent**. Chỉ làm kiểm tối thiểu không tốn kém: `node --check` phần script nếu có sửa JS và tìm lại tên đã xoá để chắc không còn tham chiếu sót. Vẫn commit, PR, merge như thường lệ. Khi nói với người dùng thì nêu rõ là chưa chạy kiểm thử. Yêu cầu không đơn giản (đổi luật, vật lý, logic, thêm tính năng) vẫn đi đúng tuyến ở bảng trên.

## 2. Quy trình đầy đủ (game mới / làm lại lớn)

1. Tiếp nhận: ghi lại yêu cầu nguyên văn và điều người dùng **không** muốn đổi (luật chơi, điểm số, tên game...).
2. Phân tích (`game-analysis`) → `GAME_ANALYSIS.md`.
3. Thiết kế gameplay (`game-design`) → `GAME_DESIGN.md`.
4. Thiết kế UI/UX (`thiet-ke-giao-dien`, `ui-ux-pro-max`).
5. Định hướng đồ họa: chọn công nghệ theo mục đích (bảng ở mục 5).
6. Thiết kế hoạt ảnh (`game-motion`) → `ANIMATION_SPEC.md`.
7. Lập kế hoạch code: liệt kê hàm sẽ sửa, hàm mới, dữ liệu lưu.
8. Triển khai từng phần nhỏ, chạy thử sau mỗi phần.
9. Kiểm thử: Playwright (mục 4) + giao 4 subagent kiểm độc lập.
10. Sửa lỗi theo thứ tự P0 → P1 → P2 → P3, kiểm hồi quy.
11. Báo cáo: đã làm gì, bằng chứng, lỗi còn lại, giới hạn.

Tài liệu thiết kế để trong `docs/studio/<id-game>/` (không đưa vào game).

## 3. Cổng kiểm định

| Cổng | Điều kiện qua | Không qua thì quay về |
|---|---|---|
| G1 | Yêu cầu, vòng lặp chơi, điều kiện thắng/thua rõ | Phân tích |
| G2 | Mọi cơ chế mới có tình huống kiểm chứng cụ thể | Thiết kế |
| G3 | Bảng màu, kiểu chữ, phong cách hình đã chốt | UI/Đồ họa |
| G4 | Biết rõ sửa hàm nào, không viết lại cả file | Kế hoạch code |
| G5 | Chức năng chính chạy, 0 lỗi `pageerror` | Triển khai |
| G6 | Không còn lỗi P0/P1 đã biết | Sửa lỗi |
| G7 | Tính năng cũ vẫn chạy (điểm, lưu kỷ lục, âm thanh, bảo trì) | Sửa lỗi |
| G8 | Báo cáo nêu rõ phần chưa kiểm được | Báo cáo |

Mức lỗi: **P0** game không chơi được / mất dữ liệu; **P1** sai luật, sai điểm, kẹt trạng thái; **P2** lỗi hiển thị, khó thao tác; **P3** đề xuất nhỏ.

## 4. Quy ước riêng của kho này (bắt buộc)

- Game là một file `game/<id>.html` tự chứa, kèm `../maintenance.js` (data-game), `../scene.js` (chuyển cảnh), `../scores.js` (bảng xếp hạng, `Scores.submit(id, điểm)`). Không đổi id, khóa localStorage hay cách tính điểm nếu người dùng không yêu cầu: điểm cũ trên bảng xếp hạng phải còn so được.
- `scene.js` chặn click nút để chạy chuyển cảnh; nút cần hỏi xác nhận trước thì gắn `data-no-scene`.
- Kiểm thử bằng Playwright với `python3 -m http.server 8765` ở gốc repo. Trong `addInitScript` đặt `player_name`, `lb_name_asked`, `lb_name_claimed` và `window.SCORE_FIREBASE_URL='http://127.0.0.1:9'` để khỏi hiện hộp nhập tên. Game đang bảo trì thì `page.route('**/maintenance.json*')` trả bản tắt bảo trì.
- Chụp ảnh ở 390×844 (điện thoại) và một khổ ngang; ảnh gửi người dùng dùng `deviceScaleFactor: 2`.
- Hoạt ảnh canvas kiểm bằng cách đặt thời gian giả hoặc chụp nhiều khung; hoạt ảnh CSS kiểm bằng `document.getAnimations()`.
- Mỗi thay đổi người chơi thấy được thì thêm vào `patchnote.txt` (mục "CẬP NHẬT VỀ TRÒ CHƠI" của ngày mới nhất), trừ khi người dùng nói đó là bí mật.
- Trả lời người dùng bằng tiếng Việt, gửi ảnh khi đổi giao diện.

## 5. Chọn công nghệ đồ họa theo mục đích

| Cần | Dùng |
|---|---|
| Menu, HUD, hộp thoại | HTML/CSS |
| Icon, logo, vật thể vector | SVG (+ CSS animation) |
| Gameplay 2D nhiều vật thể, vẽ liên tục | Canvas 2D, vẽ sẵn lớp tĩnh vào canvas phụ |
| 3D | Three.js qua importmap |
| Âm thanh ngắn, nhạc nền | Web Audio (tổng hợp) hoặc mẫu CC0 nhúng base64 (`bgmweb.js`) |

Không dùng hình khối thô thay cho đồ họa khi game cần minh họa. Không thêm thư viện nặng cho việc CSS/Canvas làm được.

## 6. Kiểm định độc lập

Sau khi tự test, giao cho subagent trong `.claude/agents/` (mỗi agent một ngữ cảnh riêng, không thấy lý lẽ của người viết code):
- `visual-reviewer`: ảnh chụp, bố cục, màu, chữ, độ tương phản.
- `gameplay-tester`: chơi thử bằng Playwright, tìm cách phá luật, kẹt trạng thái.
- `code-auditor`: đọc diff, tìm timer/listener trùng, rò bộ nhớ, lỗi logic.
- `performance-auditor`: đo FPS, thời gian khung hình, số đối tượng.

Mỗi phát hiện phải tự kiểm lại trước khi sửa (có thể agent sai). Báo cáo cho người dùng ghi rõ cái nào đã sửa, cái nào bỏ qua và vì sao.
