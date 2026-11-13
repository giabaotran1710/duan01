/* Thông thái trắc nghiệm - ngân hàng câu hỏi viết tay.
 * Mỗi dòng: mức|chủ đề|câu hỏi|ĐÁP ÁN ĐÚNG|sai|sai|sai
 *   mức: 1 Dễ, 2 Vừa, 3 Khó, 4 Rất khó, 5 Siêu khó. Đáp án đúng luôn đứng đầu, game tự xáo thứ tự.
 * Nguyên tắc soạn: chỉ dùng kiến thức ổn định, đã được ghi nhận rộng rãi (sách giáo khoa, bách khoa).
 * Tránh câu dễ thay đổi theo thời gian (dân số, kỷ lục đang chạy, người đương nhiệm, địa giới hành chính
 * tỉnh sau sáp nhập 2025) và câu mà nguồn còn tranh cãi. Phương án sai không được đúng một phần.
 * Kiểm tra định dạng: node tool/thongthai-check.js */
(function () {
  'use strict';
  const CAT = { su: 'Lịch sử', dia: 'Địa lý', van: 'Văn học', tv: 'Tiếng Việt', kh: 'Khoa học', the: 'Thể thao', nt: 'Nghệ thuật', dl: 'Đời sống', cn: 'Công nghệ', toan: 'Toán', sv: 'Sinh vật', yt: 'Sức khỏe' };
  const RAW = `
1|su|Ai là người đọc bản Tuyên ngôn Độc lập ngày 2/9/1945 tại quảng trường Ba Đình?|Chủ tịch Hồ Chí Minh|Đại tướng Võ Nguyên Giáp|Thủ tướng Phạm Văn Đồng|Tổng Bí thư Trường Chinh
1|su|Ngày Quốc khánh của nước Việt Nam là ngày nào?|2 tháng 9|30 tháng 4|1 tháng 5|19 tháng 8
1|su|Theo truyền thuyết, Lạc Long Quân và Âu Cơ sinh ra bao nhiêu người con?|100|50|18|1.000
1|su|Ngày Giỗ Tổ Hùng Vương là ngày nào âm lịch?|10 tháng 3|15 tháng 8|5 tháng 5|1 tháng 1
1|su|Ai là người lãnh đạo khởi nghĩa Lam Sơn chống quân Minh?|Lê Lợi|Lý Thường Kiệt|Trần Hưng Đạo|Quang Trung
1|su|Hai Bà Trưng khởi nghĩa chống lại ách đô hộ của triều đại nào?|Nhà Hán|Nhà Minh|Nhà Thanh|Nhà Nguyên
1|su|Vị anh hùng nào đánh tan quân Nam Hán trên sông Bạch Đằng năm 938?|Ngô Quyền|Lê Hoàn|Trần Hưng Đạo|Đinh Bộ Lĩnh
1|su|Thánh Gióng đánh đuổi giặc nào?|Giặc Ân|Giặc Minh|Giặc Nguyên|Giặc Thanh
1|su|Hà Nội xưa có tên gọi nổi tiếng nào?|Thăng Long|Phú Xuân|Gia Định|Hoa Lư
1|su|Thành phố Hồ Chí Minh trước năm 1976 có tên là gì?|Sài Gòn|Đồng Nai|Phú Xuân|Thăng Long
1|dia|Thủ đô của Việt Nam là thành phố nào?|Hà Nội|Thành phố Hồ Chí Minh|Huế|Đà Nẵng
1|dia|Vịnh Hạ Long nằm ở tỉnh nào?|Quảng Ninh|Thanh Hóa|Nghệ An|Hà Tĩnh
1|dia|Đại dương nào lớn nhất thế giới?|Thái Bình Dương|Đại Tây Dương|Ấn Độ Dương|Bắc Băng Dương
1|dia|Đỉnh núi cao nhất thế giới là?|Everest|K2|Phan Xi Păng|Kilimanjaro
1|dia|Đỉnh núi cao nhất Việt Nam là?|Phan Xi Păng|Bà Đen|Ngọc Linh|Bạch Mã
1|dia|Tháp Eiffel nằm ở thành phố nào?|Paris|London|Rome|Berlin
1|dia|Kim tự tháp Giza nằm ở nước nào?|Ai Cập|Mexico|Iraq|Hy Lạp
1|dia|Vạn Lý Trường Thành là công trình nổi tiếng của nước nào?|Trung Quốc|Nhật Bản|Mông Cổ|Hàn Quốc
1|dia|Nước nào có diện tích lớn nhất thế giới?|Nga|Canada|Trung Quốc|Hoa Kỳ
1|dia|Châu lục nào lạnh nhất Trái Đất?|Châu Nam Cực|Châu Âu|Châu Á|Châu Đại Dương
1|dia|Việt Nam nằm ở châu lục nào?|Châu Á|Châu Âu|Châu Phi|Châu Đại Dương
1|dia|Nước nào sau đây có chung đường biên giới trên đất liền với Việt Nam?|Lào|Thái Lan|Myanmar|Philippines
1|dia|Sông nào chảy qua thủ đô Hà Nội?|Sông Hồng|Sông Hương|Sông Hàn|Sông Sài Gòn
1|dia|Sông Hương chảy qua thành phố nào?|Huế|Hà Nội|Đà Nẵng|Cần Thơ
1|dia|Chợ Bến Thành nằm ở thành phố nào?|Thành phố Hồ Chí Minh|Hà Nội|Cần Thơ|Hải Phòng
1|dia|Nước nào có lãnh thổ hình chiếc ủng?|Ý|Chile|Việt Nam|Nhật Bản
1|dia|Hồ Tây nằm ở thành phố nào?|Hà Nội|Huế|Đà Lạt|Hải Phòng
1|kh|Ở áp suất khí quyển bình thường, nước sôi ở bao nhiêu độ C?|100 °C|90 °C|80 °C|120 °C
1|kh|Nước đá tan ở bao nhiêu độ C (áp suất bình thường)?|0 °C|−10 °C|4 °C|10 °C
1|kh|Hành tinh nào gần Mặt Trời nhất?|Sao Thủy|Sao Kim|Trái Đất|Sao Hỏa
1|kh|Hành tinh nào lớn nhất trong Hệ Mặt Trời?|Sao Mộc|Sao Thổ|Trái Đất|Sao Hải Vương
1|kh|Con vật nào sau đây là động vật có vú?|Cá voi|Cá mập|Cá sấu|Chim cánh cụt
1|kh|Khi quang hợp, cây xanh hấp thụ khí nào?|Cacbon đioxit|Oxi|Nitơ|Heli
1|kh|Bộ phận nào của cơ thể người bơm máu đi khắp cơ thể?|Tim|Phổi|Gan|Thận
1|kh|Người trưởng thành có đủ bộ răng vĩnh viễn (kể cả răng khôn) có bao nhiêu chiếc răng?|32|28|30|36
1|kh|Mặt Trăng là gì đối với Trái Đất?|Vệ tinh tự nhiên|Hành tinh|Ngôi sao|Sao chổi
1|kh|Động vật nào cao nhất thế giới?|Hươu cao cổ|Voi châu Phi|Lạc đà|Đà điểu
1|kh|Loài chim nào sau đây không biết bay?|Đà điểu|Đại bàng|Chim sẻ|Chim én
1|kh|Con ong làm ra sản phẩm nào sau đây?|Mật ong|Tơ tằm|Sữa|Nhựa cây
1|kh|Quả táo rơi xuống đất là do tác dụng của lực nào?|Lực hút của Trái Đất (trọng lực)|Lực đẩy của gió|Lực từ|Lực ma sát
1|kh|Trái Đất quay quanh Mặt Trời một vòng mất khoảng bao lâu?|Khoảng 1 năm|Khoảng 1 tháng|Khoảng 1 ngày|Khoảng 10 năm
1|kh|Trái Đất tự quay quanh trục một vòng mất khoảng bao lâu?|Khoảng 24 giờ|Khoảng 12 giờ|Khoảng 1 tuần|Khoảng 1 năm
1|kh|Mặt Trời mọc ở hướng nào?|Hướng đông|Hướng tây|Hướng nam|Hướng bắc
1|kh|Nhện có bao nhiêu chân?|8|6|10|4
1|kh|Côn trùng trưởng thành có bao nhiêu chân?|6|8|4|10
1|kh|Con vật nào sau đây đẻ trứng?|Gà|Mèo|Chó|Bò
1|kh|Cá thở bằng bộ phận nào?|Mang|Phổi|Da|Vây
1|kh|Nòng nọc lớn lên sẽ thành con gì?|Con ếch|Con cá|Con rắn|Con thằn lằn
1|kh|Sâu bướm lớn lên sẽ hóa thành con gì?|Con bướm|Con ong|Con chuồn chuồn|Con ruồi
1|kh|Nước biến thành hơi nước gọi là quá trình gì?|Bay hơi|Ngưng tụ|Đông đặc|Nóng chảy
1|kh|Nước đá chuyển thành nước lỏng gọi là quá trình gì?|Nóng chảy|Đông đặc|Bay hơi|Ngưng tụ
1|kh|Nam châm hút được vật nào sau đây?|Cây đinh sắt|Cục tẩy|Chiếc lá|Thìa nhựa
1|kh|Bộ phận nào của cây hút nước và muối khoáng từ đất?|Rễ|Lá|Hoa|Quả
1|kh|Ở Việt Nam, con vật nào được gọi là "chúa sơn lâm"?|Hổ|Voi|Gấu|Báo
1|kh|Khi thở ra, cơ thể người thải ra khí nào sinh ra từ quá trình hô hấp?|Cacbon đioxit|Oxi|Heli|Hiđro
1|dl|Một năm thường (không nhuận) có bao nhiêu ngày?|365|366|360|364
1|dl|Tháng nào có ít ngày nhất trong năm dương lịch?|Tháng Hai|Tháng Tư|Tháng Sáu|Tháng Mười Một
1|dl|Một thế kỷ có bao nhiêu năm?|100|10|1.000|50
1|dl|Một thập kỷ có bao nhiêu năm?|10|100|5|12
1|dl|Ở đèn giao thông, đèn màu gì báo hiệu phải dừng lại?|Đỏ|Vàng|Xanh|Trắng
1|dl|Tết Nguyên Đán được tính theo loại lịch nào?|Âm lịch|Dương lịch|Lịch Hồi giáo|Lịch Do Thái
1|dl|Bánh chưng truyền thống có hình gì?|Hình vuông|Hình tròn|Hình tam giác|Hình trụ dài
1|dl|Ngày đầu tiên của năm âm lịch gọi là gì?|Mùng 1 Tết|Rằm tháng Giêng|Đông chí|Tết Đoan Ngọ
1|dl|Trong 12 con giáp, con vật nào ứng với năm Tý?|Chuột|Trâu|Hổ|Rồng
1|dl|Theo 12 con giáp của người Việt, năm Mão ứng với con vật nào?|Mèo|Thỏ|Rồng|Gà
1|dl|Lá cờ Tổ quốc Việt Nam có màu gì?|Nền đỏ, sao vàng|Nền vàng, sao đỏ|Nền xanh, sao trắng|Nền đỏ, sao trắng
1|dl|Ở Việt Nam, khi có cháy cần gọi số điện thoại nào?|114|113|115|111
1|dl|Ở Việt Nam, gọi cấp cứu y tế bằng số điện thoại nào?|115|113|114|116
1|dl|Ở Việt Nam, gọi cảnh sát bằng số điện thoại nào?|113|114|115|119
1|dl|Đơn vị tiền tệ chính thức của Việt Nam là gì?|Đồng|Yên|Bạt|Won
1|dl|Đơn vị tiền tệ của Nhật Bản là gì?|Yên|Won|Nhân dân tệ|Rupee
1|dl|Phở là món ăn nổi tiếng của nước nào?|Việt Nam|Thái Lan|Hàn Quốc|Nhật Bản
1|dl|Sushi là món ăn nổi tiếng của nước nào?|Nhật Bản|Trung Quốc|Hàn Quốc|Thái Lan
1|dl|Kim chi là món ăn truyền thống của nước nào?|Hàn Quốc|Nhật Bản|Việt Nam|Ấn Độ
1|dl|Pizza có nguồn gốc từ nước nào?|Ý|Pháp|Hoa Kỳ|Tây Ban Nha
1|dl|Áo dài là trang phục truyền thống của nước nào?|Việt Nam|Hàn Quốc|Nhật Bản|Thái Lan
1|dl|Mùa nào thường nóng nhất trong năm ở miền Bắc Việt Nam?|Mùa hè|Mùa xuân|Mùa thu|Mùa đông
1|van|"Có công mài sắt, có ngày ..." - điền từ còn thiếu.|nên kim|thành dao|nên gươm|thành cuốc
1|van|Truyện "Tấm Cám" thuộc thể loại nào?|Truyện cổ tích|Truyện cười|Thơ lục bát|Tiểu thuyết
1|van|Sơn Tinh và Thủy Tinh cùng đến cầu hôn ai?|Mị Nương|Mị Châu|Tấm|Âu Cơ
1|van|Ai là tác giả "Truyện Kiều"?|Nguyễn Du|Nguyễn Trãi|Hồ Xuân Hương|Nguyễn Đình Chiểu
1|van|Câu "Uống nước nhớ nguồn" khuyên chúng ta điều gì?|Biết ơn người đi trước|Phải uống đủ nước|Bảo vệ nguồn nước|Tiết kiệm nước
1|van|Thành ngữ "Ếch ngồi đáy giếng" chỉ người như thế nào?|Hiểu biết hạn hẹp mà tưởng mình giỏi|Kiên nhẫn chờ thời cơ|Sống giản dị|Thích yên tĩnh
1|van|"Dế Mèn phiêu lưu ký" là tác phẩm của nhà văn nào?|Tô Hoài|Nam Cao|Kim Lân|Nguyễn Nhật Ánh
1|van|"Ăn quả nhớ kẻ ..." - điền từ còn thiếu.|trồng cây|hái quả|bán quả|tưới cây
1|van|"Lá lành đùm lá ..." - điền từ còn thiếu.|rách|úa|khô|xanh
1|nt|Đàn bầu có bao nhiêu dây?|1|2|3|4
1|nt|Bức tranh "Mona Lisa" do ai vẽ?|Leonardo da Vinci|Pablo Picasso|Vincent van Gogh|Claude Monet
1|nt|"Harry Potter" là bộ truyện của nhà văn nào?|J. K. Rowling|J. R. R. Tolkien|Roald Dahl|C. S. Lewis
1|nt|Trong truyện tranh, chú mèo máy Doraemon đến từ thế kỷ nào?|Thế kỷ 22|Thế kỷ 21|Thế kỷ 25|Thế kỷ 30
1|nt|Nhạc cụ nào có các phím đen và trắng?|Đàn piano|Đàn ghi-ta|Đàn bầu|Trống
1|the|Một đội bóng đá có bao nhiêu cầu thủ trên sân (kể cả thủ môn)?|11|10|9|12
1|the|Thế vận hội (Olympic) mùa hè thường được tổ chức mấy năm một lần?|4 năm|2 năm|3 năm|5 năm
1|the|Trong bóng đá, thẻ nào khiến cầu thủ bị truất quyền thi đấu ngay?|Thẻ đỏ|Thẻ vàng|Thẻ xanh|Thẻ trắng
1|the|Ở Việt Nam, môn thể thao nào thường được gọi là "môn thể thao vua"?|Bóng đá|Bóng rổ|Quần vợt|Điền kinh
1|the|Lá cờ Olympic có bao nhiêu vòng tròn?|5|4|6|7
1|the|Môn thể thao nào dùng bàn, lưới thấp và vợt gỗ phủ cao su?|Bóng bàn|Quần vợt|Cầu lông|Bóng chuyền
1|the|Bàn cờ vua có bao nhiêu ô?|64|81|100|49
1|cn|Thiết bị nào dùng để gõ chữ vào máy tính?|Bàn phím|Loa|Màn hình|Máy in
1|cn|Thiết bị nào thường dùng để di chuyển con trỏ trên màn hình máy tính?|Chuột|Loa|Máy in|Micro
1|cn|"Wi-Fi" chủ yếu dùng để làm gì?|Kết nối mạng không dây|Sạc pin|In tài liệu|Quay phim
1|cn|Công ty nào phát triển hệ điều hành Windows?|Microsoft|Apple|Google|Samsung
2|su|Chiến thắng Điện Biên Phủ diễn ra vào năm nào?|1954|1945|1975|1968
2|su|Ngày giải phóng miền Nam, thống nhất đất nước là ngày nào?|30/4/1975|2/9/1945|7/5/1954|19/8/1945
2|su|Vị vua nào dời đô từ Hoa Lư ra Thăng Long năm 1010?|Lý Thái Tổ|Lý Thánh Tông|Trần Thái Tông|Lê Đại Hành
2|su|Kinh đô của nhà Đinh và nhà Tiền Lê đặt ở đâu?|Hoa Lư|Thăng Long|Cổ Loa|Phú Xuân
2|su|Thành Cổ Loa gắn với vị vua nào?|An Dương Vương|Hùng Vương|Lý Nam Đế|Ngô Quyền
2|su|Hoàng đế Quang Trung đại phá quân Thanh vào dịp Tết năm nào?|Kỷ Dậu 1789|Mậu Thân 1788|Bính Ngọ 1786|Canh Tuất 1790
2|su|Ai là Tổng chỉ huy chiến dịch Điện Biên Phủ?|Võ Nguyên Giáp|Văn Tiến Dũng|Hoàng Văn Thái|Nguyễn Chí Thanh
2|su|Ai là tác giả "Hịch tướng sĩ"?|Trần Hưng Đạo|Lý Thường Kiệt|Nguyễn Trãi|Trần Quang Khải
2|su|"Bình Ngô đại cáo" do ai viết?|Nguyễn Trãi|Lê Lợi|Nguyễn Du|Lý Thường Kiệt
2|su|Bài thơ "Nam quốc sơn hà" gắn với cuộc kháng chiến chống quân xâm lược nào?|Quân Tống|Quân Minh|Quân Nguyên|Quân Thanh
2|su|Triều đại phong kiến cuối cùng của Việt Nam là?|Nhà Nguyễn|Nhà Lê|Nhà Trần|Nhà Tây Sơn
2|su|Nhà Trần ba lần đánh thắng quân xâm lược nào?|Quân Nguyên – Mông|Quân Tống|Quân Minh|Quân Xiêm
2|su|Năm 1911, Nguyễn Tất Thành ra đi tìm đường cứu nước từ bến cảng nào?|Bến Nhà Rồng|Cảng Hải Phòng|Cảng Đà Nẵng|Cảng Quy Nhơn
2|su|Quê nội của Chủ tịch Hồ Chí Minh ở tỉnh nào?|Nghệ An|Hà Tĩnh|Thanh Hóa|Quảng Ninh
2|su|Chủ tịch Hồ Chí Minh sinh năm nào?|1890|1900|1911|1885
2|su|Ngày thành lập Đảng Cộng sản Việt Nam là ngày nào?|3/2/1930|2/9/1945|19/5/1890|22/12/1944
2|su|Ngày thành lập Quân đội nhân dân Việt Nam là ngày nào?|22/12/1944|19/8/1945|2/9/1945|3/2/1930
2|su|Vị vua cuối cùng của triều Nguyễn là ai?|Bảo Đại|Khải Định|Duy Tân|Hàm Nghi
2|su|Con đường vận chuyển chi viện chiến lược từ Bắc vào Nam thời kháng chiến chống Mỹ có tên là?|Đường Trường Sơn|Quốc lộ 5|Đường số 9|Đường 18
2|dia|Hang Pác Bó, nơi Bác Hồ sống và làm việc khi về nước năm 1941, thuộc tỉnh nào?|Cao Bằng|Lạng Sơn|Điện Biên|Hà Tĩnh
2|dia|Đồng bằng nào có diện tích lớn nhất Việt Nam?|Đồng bằng sông Cửu Long|Đồng bằng sông Hồng|Đồng bằng Thanh – Nghệ|Đồng bằng duyên hải miền Trung
2|dia|Sông Mê Kông khi chảy vào Việt Nam chia thành hai nhánh chính nào?|Sông Tiền và sông Hậu|Sông Hồng và sông Đà|Sông Đồng Nai và sông Sài Gòn|Sông Mã và sông Cả
2|dia|Hồ nào ở trung tâm Hà Nội gắn với truyền thuyết vua Lê trả gươm?|Hồ Hoàn Kiếm|Hồ Tây|Hồ Trúc Bạch|Hồ Thiền Quang
2|dia|Quần đảo Hoàng Sa và Trường Sa của Việt Nam nằm ở biển nào?|Biển Đông|Biển Hoa Đông|Biển Java|Biển Andaman
2|dia|Sông nào dài nhất châu Á?|Trường Giang (Dương Tử)|Hoàng Hà|Mê Kông|Sông Hằng
2|dia|Sa mạc nóng lớn nhất thế giới là?|Sahara|Gobi|Kalahari|Atacama
2|dia|Đất nước nào được mệnh danh là "xứ sở hoa anh đào"?|Nhật Bản|Hàn Quốc|Trung Quốc|Hà Lan
2|dia|Đất nước nào được gọi là "xứ sở sương mù"?|Anh|Na Uy|Phần Lan|Canada
2|dia|Đất nước nào nổi tiếng là "xứ sở cối xay gió"?|Hà Lan|Đan Mạch|Bỉ|Đức
2|dia|Kênh đào Suez nối Địa Trung Hải với biển nào?|Biển Đỏ|Biển Đen|Biển Caspi|Biển Bắc
2|dia|Kênh đào Panama nối hai đại dương nào?|Thái Bình Dương và Đại Tây Dương|Đại Tây Dương và Ấn Độ Dương|Thái Bình Dương và Ấn Độ Dương|Bắc Băng Dương và Đại Tây Dương
2|dia|Tượng Nữ thần Tự do nằm ở thành phố nào?|New York|Washington|Paris|Los Angeles
2|dia|Đấu trường La Mã (Colosseum) nằm ở thành phố nào?|Rome|Athens|Milan|Venice
2|dia|Núi Phú Sĩ thuộc nước nào?|Nhật Bản|Trung Quốc|Hàn Quốc|Nepal
2|dia|Thác Niagara nằm trên biên giới giữa hai nước nào?|Hoa Kỳ và Canada|Brazil và Argentina|Zambia và Zimbabwe|Hoa Kỳ và Mexico
2|dia|Angkor Wat là quần thể đền nổi tiếng của nước nào?|Campuchia|Thái Lan|Lào|Indonesia
2|dia|Lăng Taj Mahal nằm ở nước nào?|Ấn Độ|Pakistan|Iran|Nepal
2|dia|Quốc gia nào nhỏ nhất thế giới về diện tích?|Vatican|Monaco|San Marino|Liechtenstein
2|dia|Quốc gia Đông Nam Á nào không giáp biển?|Lào|Campuchia|Myanmar|Việt Nam
2|dia|Châu lục nào có nhiều quốc gia nhất?|Châu Phi|Châu Á|Châu Âu|Nam Mỹ
2|dia|"Nóc nhà Đông Dương" là tên gọi của đỉnh núi nào?|Phan Xi Păng|Ngọc Linh|Pu Si Lung|Bạch Mã
2|dia|Vịnh nào của Việt Nam được UNESCO công nhận là Di sản thiên nhiên thế giới?|Vịnh Hạ Long|Vịnh Cam Ranh|Vịnh Nha Trang|Vịnh Xuân Đài
2|dia|Thành phố nào được mệnh danh "thành phố ngàn hoa"?|Đà Lạt|Huế|Nha Trang|Sa Pa
2|dia|Thành phố nào từng được gọi là "Hòn ngọc Viễn Đông"?|Sài Gòn|Hà Nội|Đà Nẵng|Huế
2|dia|Rãnh đại dương sâu nhất thế giới là?|Rãnh Mariana|Rãnh Tonga|Rãnh Java|Rãnh Puerto Rico
2|kh|Công thức hóa học của nước là?|H₂O|CO₂|O₂|NaCl
2|kh|Muối ăn có công thức hóa học là?|NaCl|KCl|CaCO₃|NaOH
2|kh|Khí nào chiếm nhiều nhất trong không khí?|Nitơ|Oxi|Cacbon đioxit|Argon
2|kh|Khi quang hợp, cây xanh thải ra khí gì?|Oxi|Cacbon đioxit|Nitơ|Hiđro
2|kh|Nhiệt độ cơ thể của người khỏe mạnh vào khoảng bao nhiêu?|Khoảng 37 °C|Khoảng 30 °C|Khoảng 40 °C|Khoảng 34 °C
2|kh|Cơ quan nào lọc máu để tạo thành nước tiểu?|Thận|Gan|Phổi|Dạ dày
2|kh|Tim người có mấy ngăn?|4|2|3|5
2|kh|Vitamin nào được cơ thể tự tổng hợp khi da tiếp xúc ánh nắng?|Vitamin D|Vitamin C|Vitamin A|Vitamin B12
2|kh|Thiếu i-ốt kéo dài có thể gây ra bệnh gì?|Bướu cổ|Còi xương|Quáng gà|Hoại huyết
2|kh|Xương dài nhất trong cơ thể người là?|Xương đùi|Xương cánh tay|Xương sống|Xương sườn
2|kh|Ai là người đưa ra thuyết tương đối?|Albert Einstein|Isaac Newton|Galileo Galilei|Nikola Tesla
2|kh|Ai phát hiện ra định luật vạn vật hấp dẫn?|Isaac Newton|Albert Einstein|Archimedes|Galileo Galilei
2|kh|Hành tinh nào được gọi là "Hành tinh Đỏ"?|Sao Hỏa|Sao Kim|Sao Mộc|Sao Thủy
2|kh|Hành tinh nào có hệ vành đai nổi bật, dễ quan sát nhất?|Sao Thổ|Sao Mộc|Sao Thiên Vương|Sao Hải Vương
2|kh|Theo phân loại năm 2006, Hệ Mặt Trời có bao nhiêu hành tinh?|8|9|7|10
2|kh|Năm 2006, thiên thể nào bị xếp lại thành "hành tinh lùn"?|Sao Diêm Vương|Sao Hải Vương|Mặt Trăng|Sao Thủy
2|kh|Kim loại nào ở thể lỏng ở nhiệt độ phòng?|Thủy ngân|Chì|Nhôm|Sắt
2|kh|Kim cương được tạo thành từ nguyên tố nào?|Cacbon|Silic|Sắt|Nhôm
2|kh|Tốc độ ánh sáng trong chân không xấp xỉ bao nhiêu?|300.000 km/s|30.000 km/s|3.000 km/s|300 km/s
2|kh|Âm thanh không thể truyền trong môi trường nào?|Chân không|Nước|Không khí|Thép
2|kh|Loài động vật nào lớn nhất từng được biết đến trên Trái Đất?|Cá voi xanh|Voi châu Phi|Khủng long bạo chúa|Cá mập voi
2|kh|Thức ăn chủ yếu của gấu trúc lớn là gì?|Tre, trúc|Cá|Thịt|Mật ong
2|kh|Loài vật nào nổi tiếng với khả năng đổi màu da để ngụy trang?|Tắc kè hoa|Rùa|Ếch|Rắn
2|kh|Tế bào sinh dưỡng của người có bao nhiêu cặp nhiễm sắc thể?|23 cặp|22 cặp|24 cặp|46 cặp
2|kh|Bào quan nào được gọi là "nhà máy năng lượng" của tế bào?|Ti thể|Nhân tế bào|Ribôxôm|Bộ máy Gôngi
2|kh|Loài động vật trên cạn nào chạy nhanh nhất?|Báo săn (báo gêpa)|Sư tử|Linh dương|Ngựa
2|kh|Trái Đất có bao nhiêu vệ tinh tự nhiên?|1|2|0|3
2|kh|Thiên hà chứa Hệ Mặt Trời có tên là gì?|Ngân Hà|Tiên Nữ|Tam Giác|Xoáy Nước
2|kh|Loài vật nào sau đây sống được cả dưới nước và trên cạn?|Ếch|Cá chép|Mèo|Chim sẻ
2|van|Tác giả bài thơ "Bánh trôi nước" là ai?|Hồ Xuân Hương|Bà Huyện Thanh Quan|Đoàn Thị Điểm|Xuân Quỳnh
2|van|Bài thơ "Qua Đèo Ngang" là của tác giả nào?|Bà Huyện Thanh Quan|Hồ Xuân Hương|Nguyễn Khuyến|Tú Xương
2|van|"Lục Vân Tiên" là tác phẩm của ai?|Nguyễn Đình Chiểu|Nguyễn Du|Nguyễn Khuyến|Phan Bội Châu
2|van|Truyện ngắn "Lão Hạc" là của nhà văn nào?|Nam Cao|Ngô Tất Tố|Vũ Trọng Phụng|Kim Lân
2|van|Tiểu thuyết "Tắt đèn" là của tác giả nào?|Ngô Tất Tố|Nam Cao|Nguyễn Công Hoan|Thạch Lam
2|van|"Số đỏ" là tiểu thuyết nổi tiếng của ai?|Vũ Trọng Phụng|Nam Cao|Ngô Tất Tố|Nguyễn Tuân
2|van|Truyện ngắn "Vợ nhặt" là của nhà văn nào?|Kim Lân|Tô Hoài|Nam Cao|Nguyễn Minh Châu
2|van|Nhân vật Chí Phèo là sáng tạo của nhà văn nào?|Nam Cao|Vũ Trọng Phụng|Ngô Tất Tố|Nguyễn Công Hoan
2|van|Trong "Truyện Kiều", em gái của Thúy Kiều tên là gì?|Thúy Vân|Thúy Hằng|Thúy Liễu|Thúy Lan
2|van|"Truyện Kiều" được viết theo thể thơ nào?|Lục bát|Song thất lục bát|Thất ngôn bát cú|Thơ tự do
2|van|Thể thơ lục bát gồm các cặp câu có số chữ là bao nhiêu?|6 và 8|7 và 7|5 và 7|6 và 6
2|van|Chùm ba bài thơ thu "Thu điếu", "Thu ẩm", "Thu vịnh" là của ai?|Nguyễn Khuyến|Tú Xương|Nguyễn Du|Tản Đà
2|van|Bài thơ "Tây Tiến" là của tác giả nào?|Quang Dũng|Tố Hữu|Chính Hữu|Nguyễn Đình Thi
2|van|Bài thơ "Đồng chí" là của tác giả nào?|Chính Hữu|Quang Dũng|Phạm Tiến Duật|Tố Hữu
2|van|"Bài thơ về tiểu đội xe không kính" là của ai?|Phạm Tiến Duật|Chính Hữu|Huy Cận|Tố Hữu
2|van|"Đoàn thuyền đánh cá" là bài thơ của ai?|Huy Cận|Xuân Diệu|Tế Hanh|Chế Lan Viên
2|van|"Sóng" là bài thơ nổi tiếng của nữ thi sĩ nào?|Xuân Quỳnh|Hồ Xuân Hương|Bà Huyện Thanh Quan|Lâm Thị Mỹ Dạ
2|van|"Kính vạn hoa" và "Mắt biếc" là tác phẩm của nhà văn nào?|Nguyễn Nhật Ánh|Tô Hoài|Nguyễn Ngọc Tư|Nguyễn Huy Thiệp
2|van|Ai được mệnh danh là "Bà chúa thơ Nôm"?|Hồ Xuân Hương|Đoàn Thị Điểm|Bà Huyện Thanh Quan|Sương Nguyệt Anh
2|tv|Thành ngữ "Nước đổ đầu vịt" ý nói gì?|Nói mãi mà không tiếp thu|Làm việc rất nhanh|Gặp may mắn|Giúp đỡ đúng lúc
2|tv|"Một con ngựa đau, cả tàu ..." - điền từ còn thiếu.|bỏ cỏ|đứng xem|chạy theo|bỏ đi
2|tv|Từ nào sau đây là từ láy?|Lung linh|Bàn ghế|Nhà cửa|Sách vở
2|tv|Từ trái nghĩa với "siêng năng" là?|Lười biếng|Chăm chỉ|Cần cù|Nhanh nhẹn
2|tv|Từ nào viết đúng chính tả?|Sáng sủa|Xáng xủa|Sáng xủa|Xáng sủa
2|tv|Từ nào viết đúng chính tả?|Chân thành|Trân thành|Chân thàn|Trân thàn
2|nt|Quốc ca Việt Nam ("Tiến quân ca") do ai sáng tác?|Văn Cao|Phạm Tuyên|Trịnh Công Sơn|Hoàng Vân
2|nt|Bài hát "Như có Bác trong ngày đại thắng" do ai sáng tác?|Phạm Tuyên|Văn Cao|Hoàng Hiệp|Lưu Hữu Phước
2|nt|Nhạc sĩ nào sáng tác "Diễm xưa", "Hạ trắng"?|Trịnh Công Sơn|Văn Cao|Phạm Duy|Ngô Thụy Miên
2|nt|Nhà soạn nhạc nào vẫn sáng tác "Bản giao hưởng số 9" khi đã gần như điếc hoàn toàn?|Beethoven|Mozart|Bach|Chopin
2|nt|Bức tranh "Đêm đầy sao" là của họa sĩ nào?|Vincent van Gogh|Claude Monet|Pablo Picasso|Salvador Dalí
2|nt|"Romeo và Juliet" là vở kịch của ai?|William Shakespeare|Victor Hugo|Charles Dickens|Molière
2|nt|"Những người khốn khổ" là tiểu thuyết của nhà văn nào?|Victor Hugo|Alexandre Dumas|Lev Tolstoy|Charles Dickens
2|nt|Làng tranh dân gian Đông Hồ thuộc tỉnh nào?|Bắc Ninh|Thanh Hóa|Nghệ An|Quảng Ninh
2|nt|Dân ca Quan họ là làn điệu nổi tiếng của vùng nào?|Kinh Bắc|Nghệ Tĩnh|Huế|Nam Bộ
2|nt|Nhã nhạc cung đình được UNESCO ghi danh gắn với cố đô nào?|Huế|Hà Nội|Hoa Lư|Hội An
2|the|Cầu thủ nào giành Quả bóng vàng nhiều lần nhất lịch sử?|Lionel Messi|Cristiano Ronaldo|Michel Platini|Johan Cruyff
2|the|Giải vô địch bóng đá thế giới (World Cup) nam được tổ chức mấy năm một lần?|4 năm|2 năm|3 năm|5 năm
2|the|Trong bóng rổ, một cú ném thành công từ ngoài vạch 3 điểm được tính bao nhiêu điểm?|3|2|1|4
2|the|Mỗi bên trong cờ vua có bao nhiêu quân khi bắt đầu ván đấu?|16|15|18|20
2|the|Huyền thoại bóng đá Pelé là người nước nào?|Brazil|Argentina|Bồ Đào Nha|Uruguay
2|the|Trong bóng chuyền trong nhà, mỗi đội có bao nhiêu vận động viên trên sân?|6|5|7|9
2|cn|CPU trong máy tính là viết tắt của cụm từ nào?|Central Processing Unit|Computer Personal Unit|Central Program Utility|Control Power Unit
2|cn|1 byte bằng bao nhiêu bit?|8|4|10|16
2|cn|Hệ điều hành Android do công ty nào phát triển chính?|Google|Apple|Microsoft|Samsung
2|cn|Ai đồng sáng lập Microsoft cùng Paul Allen?|Bill Gates|Steve Jobs|Mark Zuckerberg|Larry Page
2|cn|"www" trong địa chỉ trang web là viết tắt của?|World Wide Web|World Web Wide|Wide World Web|Web World Wide
2|dl|Năm nhuận, tháng Hai có bao nhiêu ngày?|29|28|30|31
2|dl|Tết Trung thu rơi vào ngày nào âm lịch?|15 tháng 8|15 tháng 1|5 tháng 5|1 tháng 1
2|dl|Tết Đoan Ngọ (Tết diệt sâu bọ) là ngày nào âm lịch?|5 tháng 5|15 tháng 8|3 tháng 3|9 tháng 9
2|dl|Tết Hàn thực (làm bánh trôi, bánh chay) là ngày nào âm lịch?|3 tháng 3|5 tháng 5|15 tháng 7|1 tháng 6
2|dl|Ngày Nhà giáo Việt Nam là ngày nào?|20/11|20/10|8/3|1/6
2|dl|Ngày Quốc tế Thiếu nhi là ngày nào?|1/6|1/5|20/11|8/3
2|dl|Ngày Phụ nữ Việt Nam là ngày nào?|20/10|8/3|20/11|27/7
2|dl|Ngày Thương binh – Liệt sĩ là ngày nào?|27/7|22/12|30/4|19/5
2|dl|Theo quy chuẩn báo hiệu đường bộ Việt Nam, biển báo cấm thường có dạng gì?|Hình tròn, viền đỏ, nền trắng|Tam giác, viền đỏ, nền vàng|Hình tròn, nền xanh|Hình vuông, nền xanh
2|dl|Theo quy chuẩn báo hiệu đường bộ Việt Nam, biển báo nguy hiểm thường có dạng gì?|Tam giác đều, viền đỏ, nền vàng|Hình tròn, viền đỏ, nền trắng|Hình vuông, nền xanh|Hình tròn, nền xanh
2|dl|Đơn vị tiền tệ của Thái Lan là gì?|Bạt|Kíp|Riel|Ringgit
2|dl|Đơn vị tiền tệ chung của nhiều nước thuộc Liên minh châu Âu là gì?|Euro|Bảng Anh|Franc|Rúp
2|dl|Đơn vị tiền tệ của Hàn Quốc là gì?|Won|Yên|Nhân dân tệ|Bạt
2|dl|Đơn vị tiền tệ của Anh là gì?|Bảng Anh|Euro|Đô la|Franc
3|su|Theo truyền thuyết và sử cũ, nhà nước đầu tiên của người Việt là?|Văn Lang|Âu Lạc|Vạn Xuân|Đại Cồ Việt
3|su|Ai đặt quốc hiệu "Vạn Xuân"?|Lý Bí (Lý Nam Đế)|Ngô Quyền|Đinh Bộ Lĩnh|Mai Thúc Loan
3|su|Quốc hiệu "Đại Cồ Việt" được đặt dưới triều vua nào?|Đinh Tiên Hoàng|Lý Thái Tổ|Lê Đại Hành|Lý Thánh Tông
3|su|Quốc hiệu "Đại Việt" bắt đầu được dùng từ năm 1054 dưới triều vua nào?|Lý Thánh Tông|Lý Thái Tổ|Trần Nhân Tông|Lê Thánh Tông
3|su|Văn Miếu ở kinh thành Thăng Long được xây dựng năm nào?|1070|1010|1054|1225
3|su|Khoa thi Nho học đầu tiên ở nước ta được mở năm nào?|1075|1010|1225|1442
3|su|Người được mệnh danh "Lưỡng quốc Trạng nguyên" là ai?|Mạc Đĩnh Chi|Lương Thế Vinh|Nguyễn Bỉnh Khiêm|Lê Quý Đôn
3|su|"Trạng Trình" là cách gọi dân gian của ai?|Nguyễn Bỉnh Khiêm|Lương Thế Vinh|Mạc Đĩnh Chi|Nguyễn Hiền
3|su|"Trạng Lường", người giỏi toán thời Lê sơ, là ai?|Lương Thế Vinh|Nguyễn Bỉnh Khiêm|Mạc Đĩnh Chi|Lê Quý Đôn
3|su|Bộ luật Hồng Đức được ban hành dưới triều vua nào?|Lê Thánh Tông|Lê Thái Tổ|Lý Thái Tông|Gia Long
3|su|Bộ "Hoàng Việt luật lệ" (luật Gia Long) thuộc triều đại nào?|Nhà Nguyễn|Nhà Lê sơ|Nhà Trần|Nhà Lý
3|su|Trong trận Rạch Gầm – Xoài Mút (1785), Nguyễn Huệ đánh tan quân xâm lược nào?|Quân Xiêm|Quân Thanh|Quân Minh|Quân Pháp
3|su|Chiến thắng Chi Lăng – Xương Giang (1427) thuộc cuộc khởi nghĩa nào?|Khởi nghĩa Lam Sơn|Phong trào Tây Sơn|Khởi nghĩa Hai Bà Trưng|Khởi nghĩa Bà Triệu
3|su|Câu nói "Ta thà làm quỷ nước Nam, chứ không thèm làm vương đất Bắc" là của ai?|Trần Bình Trọng|Trần Quốc Toản|Trần Hưng Đạo|Lý Thường Kiệt
3|su|Theo sử sách, người thiếu niên bóp nát quả cam vì căm giận giặc Nguyên là ai?|Trần Quốc Toản|Trần Bình Trọng|Trần Khánh Dư|Yết Kiêu
3|su|Câu nói "Tôi muốn cưỡi cơn gió mạnh, đạp luồng sóng dữ, chém cá kình ở biển Đông..." là của ai?|Bà Triệu|Trưng Trắc|Lê Chân|Bùi Thị Xuân
3|su|Phong trào Đông Du (đưa thanh niên sang Nhật học) do ai khởi xướng?|Phan Bội Châu|Phan Châu Trinh|Huỳnh Thúc Kháng|Lương Văn Can
3|su|Hiệp định Giơ-ne-vơ về chấm dứt chiến tranh ở Đông Dương được ký năm nào?|1954|1946|1973|1975
3|su|Hiệp định Paris về chấm dứt chiến tranh, lập lại hòa bình ở Việt Nam được ký năm nào?|1973|1968|1954|1975
3|su|Chiến dịch Hồ Chí Minh năm 1975 kết thúc bằng sự kiện nào?|Xe tăng tiến vào Dinh Độc Lập|Ký Hiệp định Paris|Giải phóng Buôn Ma Thuột|Giải phóng Huế
3|su|Trận then chốt mở màn Chiến dịch Tây Nguyên năm 1975 đánh vào đâu?|Buôn Ma Thuột|Pleiku|Kon Tum|Đà Lạt
3|su|Việt Nam trở thành thành viên Liên Hợp Quốc năm nào?|1977|1975|1986|1995
3|su|Việt Nam gia nhập ASEAN năm nào?|1995|1997|1986|2000
3|su|Việt Nam chính thức trở thành thành viên WTO năm nào?|2007|2005|2000|2010
3|su|Công cuộc Đổi mới ở Việt Nam được khởi xướng tại Đại hội Đảng lần thứ mấy (1986)?|Đại hội VI|Đại hội V|Đại hội VII|Đại hội IV
3|su|Chiến tranh thế giới thứ nhất bắt đầu năm nào?|1914|1918|1939|1905
3|su|Chiến tranh thế giới thứ hai kết thúc năm nào?|1945|1944|1939|1950
3|su|Cách mạng tháng Mười Nga nổ ra năm nào?|1917|1905|1921|1914
3|su|Cách mạng Pháp năm 1789 mở đầu bằng sự kiện nào?|Phá ngục Bastille|Hành quyết vua Louis XVI|Napoléon lên ngôi hoàng đế|Thành lập Công xã Paris
3|su|Ai là tổng thống đầu tiên của Hoa Kỳ?|George Washington|Abraham Lincoln|Thomas Jefferson|John Adams
3|su|Tuyên ngôn Độc lập của Hoa Kỳ được thông qua năm nào?|1776|1789|1812|1865
3|su|Christopher Columbus đặt chân tới châu Mỹ lần đầu vào năm nào?|1492|1519|1453|1607
3|su|Ai là người đầu tiên đặt chân lên Mặt Trăng?|Neil Armstrong|Buzz Aldrin|Yuri Gagarin|Michael Collins
3|su|Ai là người đầu tiên bay vào vũ trụ?|Yuri Gagarin|Neil Armstrong|Valentina Tereshkova|Alan Shepard
3|su|Người Việt Nam đầu tiên bay vào vũ trụ là ai?|Phạm Tuân|Nguyễn Văn Bảy|Nguyễn Văn Cốc|Đặng Ngọc Nhự
3|su|Bức tường Berlin sụp đổ năm nào?|1989|1991|1985|1975
3|su|Liên Xô tan rã năm nào?|1991|1989|1993|1985
3|su|Napoléon Bonaparte thất bại cuối cùng trong trận đánh nổi tiếng nào năm 1815?|Waterloo|Austerlitz|Borodino|Leipzig
3|su|Ai là vị hoàng đế đầu tiên thống nhất Trung Quốc (năm 221 TCN)?|Tần Thủy Hoàng|Hán Vũ Đế|Lưu Bang|Đường Thái Tông
3|dia|Hồ nước ngọt sâu nhất thế giới là?|Hồ Baikal|Hồ Victoria|Hồ Superior|Hồ Tanganyika
3|dia|Con sông nào chảy qua nhiều quốc gia nhất thế giới?|Danube|Nin|Mê Kông|Rhine
3|dia|Eo biển nào ngăn cách châu Á với châu Mỹ?|Eo biển Bering|Eo biển Gibraltar|Eo biển Malacca|Eo biển Magellan
3|dia|Eo biển Gibraltar nối Địa Trung Hải với vùng biển nào?|Đại Tây Dương|Biển Đỏ|Biển Đen|Ấn Độ Dương
3|dia|Dãy núi nào dài nhất thế giới trên đất liền?|Andes|Himalaya|Rocky|Alps
3|dia|Đường xích đạo KHÔNG đi qua nước nào sau đây?|Ấn Độ|Brazil|Indonesia|Kenya
3|dia|Cột cờ Lũng Cú đánh dấu điểm cực nào của Việt Nam?|Cực Bắc|Cực Nam|Cực Đông|Cực Tây
3|dia|Mũi Cà Mau là điểm cực nào trên đất liền Việt Nam?|Cực Nam|Cực Đông|Cực Tây|Cực Bắc
3|dia|Dạng địa hình nào chiếm phần lớn (khoảng 3/4) diện tích lãnh thổ Việt Nam?|Đồi núi|Đồng bằng|Cao nguyên badan|Cồn cát ven biển
3|dia|Đường bờ biển đất liền của Việt Nam dài khoảng bao nhiêu km?|3.260 km|1.650 km|5.000 km|2.360 km
3|dia|Đồng bằng sông Cửu Long được đặt tên theo đặc điểm gì của sông Mê Kông?|Đổ ra biển qua nhiều cửa|Có chín nhánh bắt nguồn|Chảy qua chín nước|Có chín khúc quanh lớn
3|dia|Nhà máy thủy điện Hòa Bình được xây dựng trên sông nào?|Sông Đà|Sông Hồng|Sông Lô|Sông Chảy
3|dia|Đảo lớn nhất Việt Nam là đảo nào?|Phú Quốc|Cát Bà|Côn Sơn|Lý Sơn
3|dia|Đèo nào được mệnh danh "Thiên hạ đệ nhất hùng quan"?|Đèo Hải Vân|Đèo Ngang|Đèo Pha Đin|Đèo Mã Pí Lèng
3|dia|Hang Sơn Đoòng nằm trong vườn quốc gia nào?|Phong Nha – Kẻ Bàng|Cúc Phương|Bạch Mã|Ba Vì
3|dia|Thành phố Đà Lạt nằm trên cao nguyên nào?|Lâm Viên|Pleiku|Kon Tum|Mộc Châu
3|dia|Thủ đô nào sau đây nằm ở độ cao lớn nhất so với mực nước biển?|Quito|Madrid|Hà Nội|Bern
3|dia|Đỉnh núi cao nhất châu Phi là?|Kilimanjaro|Núi Kenya|Elbrus|Aconcagua
3|dia|Quốc gia nào có diện tích lớn nhất Nam Mỹ?|Brazil|Argentina|Peru|Colombia
3|dia|Thành phố nào nằm trên cả hai châu lục Âu và Á?|Istanbul|Mát-xcơ-va|Athens|Cairo
3|kh|Nguyên tố hóa học phổ biến nhất trong vũ trụ là?|Hiđro|Heli|Oxi|Cacbon
3|kh|Nguyên tố phổ biến nhất trong vỏ Trái Đất (theo khối lượng) là?|Oxi|Silic|Nhôm|Sắt
3|kh|Nước tinh khiết ở 25 °C có độ pH bằng bao nhiêu?|7|0|14|5
3|kh|Ánh sáng Mặt Trời đến Trái Đất mất khoảng bao lâu?|Khoảng 8 phút 20 giây|Khoảng 8 giây|Khoảng 1 giờ|Khoảng 1 ngày
3|kh|Đơn vị đo cường độ dòng điện trong hệ SI là?|Ampe|Vôn|Oát|Ôm
3|kh|Đơn vị đo công suất trong hệ SI là?|Oát (W)|Jun (J)|Niutơn (N)|Paxcan (Pa)
3|kh|Đơn vị đo lực trong hệ SI là?|Niutơn|Jun|Oát|Kilôgam
3|kh|Ai được cấp bằng sáng chế điện thoại năm 1876?|Alexander Graham Bell|Thomas Edison|Nikola Tesla|Guglielmo Marconi
3|kh|Ai phát hiện ra penicillin năm 1928?|Alexander Fleming|Louis Pasteur|Robert Koch|Edward Jenner
3|kh|Ai được xem là cha đẻ của vắc-xin phòng bệnh đậu mùa?|Edward Jenner|Louis Pasteur|Alexander Fleming|Robert Koch
3|kh|Tác giả cuốn "Nguồn gốc các loài", người đưa ra thuyết tiến hóa bằng chọn lọc tự nhiên là ai?|Charles Darwin|Gregor Mendel|Jean-Baptiste Lamarck|Alfred Nobel
3|kh|Ai đặt nền móng cho di truyền học qua thí nghiệm với cây đậu Hà Lan?|Gregor Mendel|Charles Darwin|Louis Pasteur|Thomas Morgan
3|kh|Năm 1869, ai công bố bảng tuần hoàn các nguyên tố hóa học?|Dmitri Mendeleev|Antoine Lavoisier|John Dalton|Marie Curie
3|kh|Marie Curie nhận giải Nobel ở những lĩnh vực nào?|Vật lý và Hóa học|Hóa học và Y học|Vật lý và Y học|Hóa học và Hòa bình
3|kh|Năm 1953, ai công bố mô hình cấu trúc xoắn kép của ADN?|Watson và Crick|Darwin và Wallace|Mendel và Morgan|Pasteur và Koch
3|kh|Hồng cầu có màu đỏ là nhờ chứa chất nào?|Hêmôglôbin|Diệp lục|Mêlanin|Insulin
3|kh|Hoóc-môn insulin do cơ quan nào tiết ra?|Tuyến tụy|Gan|Tuyến giáp|Thận
3|kh|Sắc tố chính giúp cây xanh hấp thụ ánh sáng để quang hợp là?|Diệp lục|Hêmôglôbin|Mêlanin|Keratin
3|kh|Loài nào sau đây là động vật lưỡng cư?|Ếch|Rắn|Cá sấu|Rùa
3|kh|Cá heo hô hấp bằng cơ quan nào?|Phổi|Mang|Da|Cả mang và phổi
3|kh|Dơi thuộc lớp động vật nào?|Thú|Chim|Bò sát|Lưỡng cư
3|kh|Ngôi sao gần Trái Đất nhất là ngôi sao nào?|Mặt Trời|Sao Thiên Lang (Sirius)|Cận Tinh (Proxima Centauri)|Sao Bắc Cực
3|kh|Vệ tinh lớn nhất của Sao Thổ là?|Titan|Ganymede|Enceladus|Triton
3|kh|Hành tinh nào có nhiệt độ bề mặt trung bình cao nhất Hệ Mặt Trời?|Sao Kim|Sao Thủy|Sao Hỏa|Sao Mộc
3|kh|Hạt nào mang điện tích âm trong nguyên tử?|Electron|Proton|Nơtron|Hạt nhân
3|kh|Hạt nào trong hạt nhân nguyên tử không mang điện?|Nơtron|Proton|Electron|Pôzitron
3|kh|Ánh sáng trắng đi qua lăng kính bị tách thành dải nhiều màu. Hiện tượng này gọi là gì?|Tán sắc ánh sáng|Phản xạ ánh sáng|Nhiễu xạ|Quang điện
3|kh|Bệnh còi xương ở trẻ em thường liên quan đến việc thiếu vitamin nào?|Vitamin D|Vitamin C|Vitamin B1|Vitamin K
3|kh|Thiếu vitamin C kéo dài có thể gây bệnh gì?|Bệnh scorbut (hoại huyết)|Bệnh còi xương|Bệnh quáng gà|Bệnh bướu cổ
3|kh|Thiếu vitamin A có thể gây ra bệnh nào?|Quáng gà|Bướu cổ|Còi xương|Tê phù (beriberi)
3|cn|Ai được coi là "cha đẻ" của World Wide Web?|Tim Berners-Lee|Bill Gates|Vint Cerf|Steve Jobs
3|cn|Ngôn ngữ đánh dấu dùng để tạo cấu trúc trang web là?|HTML|CSS|SQL|Python
3|cn|RAM trong máy tính là loại bộ nhớ gì?|Bộ nhớ truy cập ngẫu nhiên|Bộ nhớ chỉ đọc|Ổ lưu trữ lâu dài|Bộ nhớ của máy in
3|cn|Máy tính lưu và xử lý dữ liệu bằng hệ đếm cơ số mấy?|2|8|10|16
3|cn|Giao thức HTTPS khác HTTP chủ yếu ở điểm nào?|Dữ liệu truyền đi được mã hóa|Tải trang nhanh gấp đôi|Chỉ dùng để gửi thư|Không cần máy chủ
3|nt|Ai vẽ các bức bích họa trên trần nhà nguyện Sistine?|Michelangelo|Raphael|Leonardo da Vinci|Donatello
3|nt|"Chiến tranh và hòa bình" là tiểu thuyết của ai?|Lev Tolstoy|Fyodor Dostoevsky|Anton Chekhov|Ivan Turgenev
3|nt|"Ông già và biển cả" là tác phẩm của nhà văn nào?|Ernest Hemingway|Mark Twain|John Steinbeck|Jack London
3|nt|"Hoàng tử bé" là tác phẩm của ai?|Antoine de Saint-Exupéry|Victor Hugo|Jules Verne|Albert Camus
3|nt|"Hai vạn dặm dưới đáy biển" là tiểu thuyết của nhà văn nào?|Jules Verne|H. G. Wells|Alexandre Dumas|Victor Hugo
3|nt|"Ba chàng lính ngự lâm" là tác phẩm của ai?|Alexandre Dumas (cha)|Victor Hugo|Gustave Flaubert|Honoré de Balzac
3|nt|Tác giả của "Don Quixote", Miguel de Cervantes, là người nước nào?|Tây Ban Nha|Ý|Pháp|Bồ Đào Nha
3|nt|Rabindranath Tagore, người châu Á đầu tiên đoạt giải Nobel Văn học, là người nước nào?|Ấn Độ|Nhật Bản|Trung Quốc|Sri Lanka
3|nt|Bức tranh "Thiếu nữ bên hoa huệ" là của họa sĩ nào?|Tô Ngọc Vân|Bùi Xuân Phái|Nguyễn Gia Trí|Nguyễn Phan Chánh
3|nt|"Phố Phái" là cách gọi những bức tranh phố cổ Hà Nội của họa sĩ nào?|Bùi Xuân Phái|Tô Ngọc Vân|Nguyễn Sáng|Dương Bích Liên
3|nt|Múa rối nước là loại hình nghệ thuật truyền thống gắn với vùng nào?|Đồng bằng Bắc Bộ|Tây Nguyên|Nam Bộ|Duyên hải Nam Trung Bộ
3|nt|Không gian văn hóa Cồng chiêng được UNESCO ghi danh thuộc vùng nào?|Tây Nguyên|Tây Bắc|Đồng bằng sông Cửu Long|Đồng bằng sông Hồng
3|nt|Đờn ca tài tử là loại hình âm nhạc của vùng nào?|Nam Bộ|Bắc Bộ|Huế|Tây Nguyên
3|nt|Vở chèo cổ nào kể về nỗi oan của Thị Kính?|Quan Âm Thị Kính|Lưu Bình Dương Lễ|Kim Nham|Trương Viên
3|nt|Bộ concerto "Bốn mùa" là của nhà soạn nhạc nào?|Antonio Vivaldi|Johann Sebastian Bach|Joseph Haydn|George Frideric Handel
3|van|"Cung oán ngâm khúc" là tác phẩm của ai?|Nguyễn Gia Thiều|Nguyễn Du|Đặng Trần Côn|Nguyễn Công Trứ
3|van|"Hoàng Lê nhất thống chí" là tác phẩm của nhóm tác giả nào?|Ngô gia văn phái|Tự Lực văn đoàn|Tao đàn Nhị thập bát tú|Xuân Thu nhã tập
3|van|Ai đứng đầu nhóm "Tự Lực văn đoàn"?|Nhất Linh|Khái Hưng|Thạch Lam|Hoàng Đạo
3|van|Tập thơ "Nhật ký trong tù" của Hồ Chí Minh được viết bằng chữ gì?|Chữ Hán|Chữ Quốc ngữ|Chữ Nôm|Tiếng Pháp
3|van|Tập thơ "Từ ấy" là của nhà thơ nào?|Tố Hữu|Xuân Diệu|Huy Cận|Chế Lan Viên
3|van|"Thơ thơ" và "Gửi hương cho gió" là hai tập thơ của ai?|Xuân Diệu|Huy Cận|Hàn Mặc Tử|Lưu Trọng Lư
3|van|"Lửa thiêng" là tập thơ của nhà thơ nào?|Huy Cận|Xuân Diệu|Tế Hanh|Nguyễn Bính
3|van|Bài thơ "Đây thôn Vĩ Dạ" là của ai?|Hàn Mặc Tử|Xuân Diệu|Nguyễn Bính|Chế Lan Viên
3|van|Bài thơ "Tràng giang" là của ai?|Huy Cận|Xuân Diệu|Thế Lữ|Lưu Trọng Lư
3|van|Bài thơ "Nhớ rừng" là của ai?|Thế Lữ|Xuân Diệu|Tản Đà|Vũ Đình Liên
3|van|"Ông đồ" là bài thơ nổi tiếng của ai?|Vũ Đình Liên|Tản Đà|Thế Lữ|Nguyễn Bính
3|van|Bài thơ "Tương tư" ("Thôn Đoài ngồi nhớ thôn Đông") là của ai?|Nguyễn Bính|Xuân Diệu|Hàn Mặc Tử|Tế Hanh
3|van|Bài thơ "Quê hương" ("Làng tôi ở vốn làm nghề chài lưới") là của ai?|Tế Hanh|Giang Nam|Đỗ Trung Quân|Huy Cận
3|van|"Người lái đò sông Đà" là tùy bút của ai?|Nguyễn Tuân|Hoàng Phủ Ngọc Tường|Thạch Lam|Tô Hoài
3|van|"Ai đã đặt tên cho dòng sông?" là bút ký của ai?|Hoàng Phủ Ngọc Tường|Nguyễn Tuân|Nguyễn Khải|Băng Sơn
3|van|"Vợ chồng A Phủ" là truyện ngắn của ai?|Tô Hoài|Kim Lân|Nguyễn Trung Thành|Nam Cao
3|van|"Rừng xà nu" là truyện ngắn của ai?|Nguyễn Trung Thành|Nguyễn Thi|Tô Hoài|Anh Đức
3|van|"Chiếc thuyền ngoài xa" là truyện ngắn của ai?|Nguyễn Minh Châu|Nguyễn Khải|Ma Văn Kháng|Nguyễn Huy Thiệp
3|van|"Hai đứa trẻ" là truyện ngắn của ai?|Thạch Lam|Nhất Linh|Khái Hưng|Nam Cao
3|van|"Chữ người tử tù" là truyện ngắn của ai?|Nguyễn Tuân|Thạch Lam|Nam Cao|Vũ Trọng Phụng
3|van|"Những ngôi sao xa xôi" là truyện ngắn của tác giả nào?|Lê Minh Khuê|Nguyễn Quang Sáng|Nguyễn Minh Châu|Bảo Ninh
3|van|"Chiếc lược ngà" là truyện ngắn của tác giả nào?|Nguyễn Quang Sáng|Lê Minh Khuê|Kim Lân|Nguyễn Thành Long
3|van|"Lặng lẽ Sa Pa" là truyện ngắn của tác giả nào?|Nguyễn Thành Long|Nguyễn Quang Sáng|Kim Lân|Nguyễn Minh Châu
3|van|Truyện ngắn "Làng" với nhân vật ông Hai là của ai?|Kim Lân|Nam Cao|Tô Hoài|Nguyễn Quang Sáng
3|van|"Nỗi buồn chiến tranh" là tiểu thuyết của ai?|Bảo Ninh|Nguyễn Huy Thiệp|Ma Văn Kháng|Nguyễn Khải
3|van|"Tôi thấy hoa vàng trên cỏ xanh" là tác phẩm của ai?|Nguyễn Nhật Ánh|Nguyễn Ngọc Tư|Tô Hoài|Nguyễn Ngọc Thuần
3|van|"Cánh đồng bất tận" là truyện của nhà văn nào?|Nguyễn Ngọc Tư|Nguyễn Nhật Ánh|Dạ Ngân|Y Ban
3|van|Câu mở đầu "Trăm năm trong cõi người ta, Chữ tài chữ mệnh khéo là ghét nhau" thuộc tác phẩm nào?|Truyện Kiều|Lục Vân Tiên|Chinh phụ ngâm|Cung oán ngâm khúc
3|tv|Chữ Quốc ngữ được xây dựng dựa trên hệ chữ cái nào?|La-tinh|Hán|Phạn|Kirin
3|tv|Thành ngữ "Đẽo cày giữa đường" chỉ người như thế nào?|Không có chủ kiến, ai bảo gì cũng nghe|Làm việc chăm chỉ|Biết lắng nghe góp ý|Kiên trì đến cùng
3|tv|Thành ngữ "Ném đá giấu tay" chỉ hành động gì?|Làm điều xấu với người khác rồi che giấu|Giúp người mà không cần đền đáp|Làm việc cẩn thận|Giữ bí mật cho bạn
3|tv|Thành ngữ "Chó ngáp phải ruồi" có nghĩa là gì?|Gặp may một cách tình cờ|Làm việc vô ích|Tham lam|Nói nhiều
3|tv|Từ nào viết đúng chính tả?|Dành dụm|Giành dụm|Rành dụm|Dành giụm
3|tv|Từ nào viết đúng chính tả?|Chậm chạp|Chậm trạp|Trậm chạp|Trậm trạp
3|tv|Từ nào viết đúng chính tả?|Bàng hoàng|Bàn hoàng|Bàng hoàn|Bàn hoàn
3|tv|Từ nào viết đúng chính tả?|Xử lý|Sử lý|Xữ lý|Sữ lý
3|the|Thế vận hội Olympic hiện đại đầu tiên được tổ chức năm 1896 tại đâu?|Athens|Paris|London|Rome
3|the|Vận động viên đầu tiên giành huy chương vàng Olympic cho Việt Nam là ai?|Hoàng Xuân Vinh|Trần Hiếu Ngân|Hoàng Anh Tuấn|Nguyễn Thị Ánh Viên
3|the|Hoàng Xuân Vinh giành huy chương vàng Olympic Rio 2016 ở môn nào?|Bắn súng|Cử tạ|Taekwondo|Bơi lội
3|the|Tấm huy chương Olympic đầu tiên của thể thao Việt Nam (HCB Sydney 2000) thuộc về ai?|Trần Hiếu Ngân|Hoàng Xuân Vinh|Hoàng Anh Tuấn|Nguyễn Tiến Minh
3|the|Bốn giải Grand Slam gồm Úc mở rộng, Roland Garros, Wimbledon và Mỹ mở rộng thuộc môn nào?|Quần vợt|Golf|Cầu lông|Bóng bàn
3|the|Giải quần vợt Wimbledon thi đấu trên mặt sân gì?|Sân cỏ|Sân đất nện|Sân cứng|Sân thảm
3|the|Giải quần vợt Roland Garros thi đấu trên mặt sân gì?|Đất nện|Cỏ|Sân cứng|Thảm
3|the|Một trận bóng đá chính thức có 2 hiệp, mỗi hiệp bao nhiêu phút?|45 phút|40 phút|30 phút|50 phút
3|the|Quãng đường chạy marathon tiêu chuẩn dài bao nhiêu?|42,195 km|40 km|21,0975 km|50 km
3|the|Đội tuyển bóng đá nam Việt Nam vô địch Đông Nam Á (AFF Cup) lần đầu năm nào?|2008|2018|1998|2004
3|the|Bàn cờ tướng có bao nhiêu giao điểm để đặt quân?|90|81|64|100
3|dl|Ngày Báo chí Cách mạng Việt Nam là ngày nào?|21/6|19/5|3/2|27/2
3|dl|Ngày Thầy thuốc Việt Nam là ngày nào?|27/2|21/6|20/11|22/12
3|dl|Đơn vị tiền tệ của Lào là gì?|Kíp|Bạt|Riel|Kyat
3|dl|Đơn vị tiền tệ của Campuchia là gì?|Riel|Kíp|Bạt|Peso
3|dl|Đơn vị tiền tệ của Ấn Độ là gì?|Rupee|Rupiah|Ringgit|Taka
3|dl|Đơn vị tiền tệ của Indonesia là gì?|Rupiah|Rupee|Ringgit|Peso
3|dl|Đơn vị tiền tệ của Malaysia là gì?|Ringgit|Rupiah|Bạt|Peso
3|dl|Đơn vị tiền tệ của Philippines là gì?|Peso|Ringgit|Bạt|Rupiah
3|dl|Đơn vị tiền tệ của Nga là gì?|Rúp|Hryvnia|Zloty|Kíp
3|dl|Thế kỷ 21 bắt đầu từ năm nào?|2001|2000|1999|2010
4|su|Trận Bạch Đằng năm 1288 do ai chỉ huy?|Trần Hưng Đạo|Ngô Quyền|Lê Hoàn|Trần Quang Khải
4|su|Năm 981, Lê Hoàn đánh thắng quân Tống tại con sông nào?|Bạch Đằng|Như Nguyệt|Sông Hồng|Sông Đáy
4|su|Phòng tuyến sông Như Nguyệt (1077) gắn với vị tướng nào?|Lý Thường Kiệt|Trần Hưng Đạo|Lê Lợi|Ngô Quyền
4|su|Nhà Hồ do ai lập nên?|Hồ Quý Ly|Hồ Nguyên Trừng|Hồ Hán Thương|Hồ Tùng Mậu
4|su|Thành nhà Hồ, Di sản Văn hóa thế giới, nằm ở tỉnh nào?|Thanh Hóa|Nghệ An|Hà Tĩnh|Quảng Ninh
4|su|Tiền giấy đầu tiên ở Việt Nam ("Thông bảo hội sao") được phát hành dưới triều đại nào?|Nhà Hồ|Nhà Trần|Nhà Lý|Nhà Lê sơ
4|su|Vua Gia Long lên ngôi năm nào?|1802|1789|1820|1858
4|su|Kinh đô của nhà Nguyễn đặt ở đâu?|Phú Xuân (Huế)|Thăng Long|Gia Định|Hoa Lư
4|su|Thực dân Pháp nổ súng xâm lược Việt Nam lần đầu tại Đà Nẵng năm nào?|1858|1862|1873|1884
4|su|Theo Hiệp ước Nhâm Tuất (1862), triều Nguyễn nhượng cho Pháp vùng nào?|Ba tỉnh miền Đông Nam Kỳ|Ba tỉnh miền Tây Nam Kỳ|Toàn bộ Bắc Kỳ|Toàn bộ Trung Kỳ
4|su|Câu nói "Bao giờ người Tây nhổ hết cỏ nước Nam thì mới hết người Nam đánh Tây" là của ai?|Nguyễn Trung Trực|Trương Định|Phan Đình Phùng|Hoàng Hoa Thám
4|su|Chiến công đốt tàu Pháp trên sông Nhật Tảo (1861) gắn với ai?|Nguyễn Trung Trực|Trương Định|Võ Duy Dương|Phan Đình Phùng
4|su|Khởi nghĩa Yên Thế do ai lãnh đạo?|Hoàng Hoa Thám|Phan Đình Phùng|Nguyễn Thiện Thuật|Đinh Công Tráng
4|su|Khởi nghĩa Hương Khê (1885–1896) do ai lãnh đạo?|Phan Đình Phùng|Hoàng Hoa Thám|Tống Duy Tân|Nguyễn Thiện Thuật
4|su|Chiếu Cần Vương năm 1885 được ban ra với danh nghĩa của vua nào?|Hàm Nghi|Duy Tân|Thành Thái|Đồng Khánh
4|su|Vị vua nào bị thực dân Pháp đưa đi đày ở đảo Réunion cùng với vua cha Thành Thái?|Duy Tân|Hàm Nghi|Khải Định|Bảo Đại
4|su|Năm 1919, Nguyễn Ái Quốc gửi "Bản yêu sách của nhân dân An Nam" tới hội nghị nào?|Hội nghị Véc-xai|Hội nghị Pốt-xđam|Hội nghị I-an-ta|Hội nghị Giơ-ne-vơ
4|su|Năm 1925, Nguyễn Ái Quốc thành lập Hội Việt Nam Cách mạng Thanh niên tại đâu?|Quảng Châu|Hương Cảng|Paris|Mát-xcơ-va
4|su|Hội nghị hợp nhất các tổ chức cộng sản, thành lập Đảng Cộng sản Việt Nam (1930) họp ở đâu?|Cửu Long (Hương Cảng)|Quảng Châu|Pác Bó|Thượng Hải
4|su|Chiến dịch Việt Bắc thu – đông diễn ra năm nào?|1947|1950|1954|1945
4|su|Chiến dịch Biên giới thu – đông diễn ra năm nào?|1950|1947|1951|1953
4|su|Chiến dịch Điện Biên Phủ kéo dài bao nhiêu ngày đêm?|56|36|45|60
4|su|Viên tướng chỉ huy tập đoàn cứ điểm Điện Biên Phủ bị bắt sống là ai?|De Castries|Navarre|De Lattre de Tassigny|Salan
4|su|Cuộc Tổng tiến công và nổi dậy Tết Mậu Thân diễn ra năm nào?|1968|1965|1972|1975
4|su|Trận "Điện Biên Phủ trên không" diễn ra vào thời gian nào?|Tháng 12 năm 1972|Tháng 4 năm 1975|Tháng 5 năm 1954|Tháng 1 năm 1968
4|su|Theo Hiệp định Giơ-ne-vơ 1954, giới tuyến quân sự tạm thời ở Việt Nam là vĩ tuyến nào?|Vĩ tuyến 17|Vĩ tuyến 16|Vĩ tuyến 18|Vĩ tuyến 38
4|su|Con sông nào chạy dọc giới tuyến quân sự tạm thời, chia cắt hai miền Nam – Bắc (1954–1975)?|Sông Bến Hải|Sông Gianh|Sông Thạch Hãn|Sông Hương
4|su|Lũy Thầy, công trình phòng thủ của chúa Nguyễn, do ai thiết kế?|Đào Duy Từ|Nguyễn Hữu Cảnh|Nguyễn Hoàng|Lê Văn Duyệt
4|su|Năm 1698, ai được chúa Nguyễn cử vào kinh lược và lập phủ Gia Định?|Nguyễn Hữu Cảnh|Lê Văn Duyệt|Đào Duy Từ|Mạc Cửu
4|su|Hội thề Đông Quan, buộc quân Minh rút về nước, diễn ra năm nào?|1427|1418|1407|1442
4|su|Kinh thành Constantinople thất thủ, đế quốc Byzantine sụp đổ năm nào?|1453|1492|1204|1517
4|su|Vua A-dục (Ashoka) nổi tiếng thuộc vương triều nào của Ấn Độ cổ?|Maurya|Gupta|Mughal|Chola
4|su|Ai là người chỉ huy đoàn thám hiểm đầu tiên đi vòng quanh thế giới (1519–1522)?|Ferdinand Magellan|Vasco da Gama|Christopher Columbus|James Cook
4|su|Vasco da Gama là người đầu tiên mở con đường biển từ châu Âu vòng qua châu Phi tới đâu?|Ấn Độ|Châu Mỹ|Trung Quốc|Úc
4|su|Cuộc cách mạng công nghiệp đầu tiên khởi đầu ở nước nào?|Anh|Pháp|Đức|Hoa Kỳ
4|su|Tổ chức Liên Hợp Quốc được thành lập năm nào?|1945|1919|1949|1955
4|su|Trụ sở chính của Liên Hợp Quốc đặt tại thành phố nào?|New York|Geneva|Paris|Washington
4|su|Năm 1967, ASEAN được thành lập tại thành phố nào?|Bangkok|Jakarta|Manila|Kuala Lumpur
4|su|Khi mới thành lập năm 1967, ASEAN có bao nhiêu nước thành viên?|5|6|10|4
4|dia|Hồ lớn nhất châu Phi là?|Hồ Victoria|Hồ Tanganyika|Hồ Malawi|Hồ Chad
4|dia|Thác nước cao nhất thế giới là?|Thác Angel (Venezuela)|Thác Niagara|Thác Victoria|Thác Iguazu
4|dia|Bờ của vùng nước nào là điểm thấp nhất trên đất liền của Trái Đất?|Biển Chết|Biển Caspi|Thung lũng Chết|Hồ Baikal
4|dia|Vùng nước kín nào có diện tích lớn nhất thế giới?|Biển Caspi|Hồ Superior|Hồ Victoria|Hồ Baikal
4|dia|Rạn san hô Great Barrier Reef nằm ngoài khơi nước nào?|Úc|Indonesia|Philippines|Maldives
4|dia|Sông Amazon đổ ra đại dương nào?|Đại Tây Dương|Thái Bình Dương|Ấn Độ Dương|Bắc Băng Dương
4|dia|Sông Nin đổ ra biển nào?|Địa Trung Hải|Biển Đỏ|Đại Tây Dương|Ấn Độ Dương
4|dia|Sông Mê Kông bắt nguồn từ vùng nào?|Cao nguyên Tây Tạng|Dãy Trường Sơn|Cao nguyên Shan|Đồng bằng Hoa Bắc
4|dia|Sông Hồng bắt nguồn từ tỉnh nào của Trung Quốc?|Vân Nam|Quảng Tây|Quảng Đông|Tứ Xuyên
4|dia|Theo số liệu thường được dẫn, quốc gia nào có đường bờ biển dài nhất thế giới?|Canada|Na Uy|Indonesia|Úc
4|dia|Đường chuyển ngày quốc tế chủ yếu nằm trên đại dương nào?|Thái Bình Dương|Đại Tây Dương|Ấn Độ Dương|Bắc Băng Dương
4|dia|Kinh tuyến gốc (0°) đi qua đài thiên văn nào?|Greenwich (London)|Đài thiên văn Paris|Pulkovo|Mauna Kea
4|dia|Nước nào nằm lọt hoàn toàn trong lãnh thổ Nam Phi?|Lesotho|Eswatini|Botswana|Namibia
4|dia|"Tứ đại đỉnh đèo" miền Bắc Việt Nam KHÔNG gồm đèo nào?|Hải Vân|Mã Pí Lèng|Ô Quy Hồ|Pha Đin
4|dia|Đỉnh núi cao nhất Tây Nguyên là?|Ngọc Linh|Chư Yang Sin|Lang Biang|Kon Ka Kinh
4|dia|Hang Sơn Đoòng nổi tiếng thế giới vì điều gì?|Là hang động tự nhiên lớn nhất thế giới|Là hang dài nhất thế giới|Là hang sâu nhất thế giới|Là hang có hồ ngầm rộng nhất
4|dia|Hồ Titicaca nằm trên biên giới của hai nước nào?|Peru và Bolivia|Chile và Argentina|Ecuador và Colombia|Peru và Chile
4|dia|Đỉnh núi cao nhất châu Nam Mỹ là?|Aconcagua|Chimborazo|Huascarán|Kilimanjaro
4|dia|Đỉnh núi cao thứ hai thế giới là?|K2|Kangchenjunga|Lhotse|Makalu
4|kh|Khí hiếm nào nhẹ nhất?|Heli|Neon|Argon|Krypton
4|kh|Nhiệt độ không tuyệt đối bằng bao nhiêu độ C?|−273,15 °C|−100 °C|−459,67 °C|−200 °C
4|kh|Hằng số Avogadro có giá trị xấp xỉ bằng bao nhiêu?|6,022 × 10²³|3 × 10⁸|9,81|1,6 × 10⁻¹⁹
4|kh|Gia tốc rơi tự do gần mặt đất có giá trị xấp xỉ bao nhiêu?|9,8 m/s²|3 × 10⁸ m/s²|1,6 m/s²|98 m/s²
4|kh|Đơn vị đo điện trở là?|Ôm (Ω)|Vôn (V)|Ampe (A)|Fara (F)
4|kh|Tia sáng bị gãy khúc khi đi từ không khí vào nước. Hiện tượng này gọi là gì?|Khúc xạ ánh sáng|Phản xạ ánh sáng|Nhiễu xạ ánh sáng|Tán xạ ánh sáng
4|kh|Nguyên lý "Khi vật A tác dụng lực lên vật B thì B cũng tác dụng lại A một lực..." là định luật thứ mấy của Newton?|Định luật III|Định luật I|Định luật II|Định luật IV
4|kh|Công thức E = mc² thể hiện mối liên hệ giữa hai đại lượng nào?|Năng lượng và khối lượng|Lực và gia tốc|Áp suất và thể tích|Điện áp và dòng điện
4|kh|Phân tử ozon có công thức là?|O₃|O₂|CO|NO₂
4|kh|Thành phần chính của đá vôi là?|CaCO₃|CaO|Ca(OH)₂|CaSO₄
4|kh|Vôi sống có công thức hóa học là?|CaO|CaCO₃|Ca(OH)₂|CaCl₂
4|kh|Axit có trong dịch vị dạ dày người chủ yếu là?|Axit clohiđric (HCl)|Axit sunfuric|Axit axetic|Axit nitric
4|kh|Giấm ăn chứa axit gì?|Axit axetic|Axit xitric|Axit clohiđric|Axit sunfuric
4|kh|Loại mạch máu nào dẫn máu từ tim đi đến các cơ quan?|Động mạch|Tĩnh mạch|Mạch bạch huyết|Ống dẫn mật
4|kh|Loại tế bào máu nào đóng vai trò chính trong việc làm đông máu?|Tiểu cầu|Hồng cầu|Bạch cầu|Tế bào thần kinh
4|kh|Loại tế bào máu nào bảo vệ cơ thể chống lại vi khuẩn, virus?|Bạch cầu|Hồng cầu|Tiểu cầu|Tế bào biểu bì
4|kh|Chất dinh dưỡng được hấp thụ chủ yếu ở bộ phận nào của ống tiêu hóa?|Ruột non|Dạ dày|Ruột già|Thực quản
4|kh|Virus gây bệnh COVID-19 có tên khoa học là?|SARS-CoV-2|SARS-CoV|MERS-CoV|H5N1
4|kh|Bệnh sốt rét do tác nhân nào gây ra?|Ký sinh trùng Plasmodium|Vi khuẩn tả|Virus cúm|Nấm men
4|kh|Muỗi nào là vật trung gian truyền bệnh sốt xuất huyết Dengue?|Muỗi vằn (Aedes)|Muỗi Anopheles|Muỗi Culex|Muỗi cát
4|kh|Vệ tinh tự nhiên lớn nhất trong Hệ Mặt Trời là?|Ganymede (của Sao Mộc)|Titan (của Sao Thổ)|Mặt Trăng|Triton (của Sao Hải Vương)
4|kh|Ngoài Mặt Trời, ngôi sao gần Hệ Mặt Trời nhất là?|Cận Tinh (Proxima Centauri)|Sirius|Betelgeuse|Vega
4|kh|Thiên hà xoắn ốc lớn gần Ngân Hà nhất là thiên hà nào?|Tiên Nữ (Andromeda)|Tam Giác|Xoáy Nước|Mặt Trăng Đen
4|kh|Bầu khí quyển Sao Hỏa có thành phần chủ yếu là khí gì?|Cacbon đioxit|Nitơ|Oxi|Mêtan
4|kh|Sao Hỏa có bao nhiêu vệ tinh tự nhiên?|2|1|0|4
4|kh|Kính viễn vọng không gian phóng cuối năm 2021, được xem là "người kế nhiệm" Hubble, mang tên ai?|James Webb|Kepler|Galileo|Carl Sagan
4|kh|Chuyến bay nào lần đầu đưa con người đáp xuống Mặt Trăng?|Apollo 11|Apollo 13|Vostok 1|Gemini 4
4|kh|Khí nào có mùi trứng thối đặc trưng?|Hiđro sunfua (H₂S)|Amoniac|Clo|Mêtan
4|kh|Thành phần chính của khí thiên nhiên là?|Mêtan|Propan|Butan|Etilen
4|kh|Khí hóa lỏng (LPG) dùng đun nấu chủ yếu gồm những chất nào?|Propan và butan|Mêtan và etan|Hiđro và oxi|Axetilen và etilen
4|kh|Kim loại nào dẫn điện tốt nhất?|Bạc|Đồng|Vàng|Nhôm
4|kh|Kim loại nhẹ nhất là?|Liti|Nhôm|Natri|Magie
4|cn|Ngôn ngữ lập trình Python được đặt tên theo điều gì?|Nhóm hài Monty Python|Loài trăn|Một nhà toán học|Một thành phố
4|cn|Ai thường được xem là lập trình viên đầu tiên trong lịch sử?|Ada Lovelace|Alan Turing|Charles Babbage|Grace Hopper
4|cn|Phép thử Turing dùng để đánh giá điều gì?|Máy có thể hành xử thông minh giống người hay không|Tốc độ xử lý của máy tính|Độ an toàn của mật khẩu|Dung lượng bộ nhớ
4|cn|Ai tạo ra nhân hệ điều hành Linux năm 1991?|Linus Torvalds|Richard Stallman|Dennis Ritchie|Ken Thompson
4|nt|Bản giao hưởng thường được gọi là "Định mệnh" là bản số mấy của Beethoven?|Số 5|Số 9|Số 3|Số 6
4|nt|Vở ballet "Hồ thiên nga" do ai sáng tác?|Tchaikovsky|Stravinsky|Prokofiev|Rimsky-Korsakov
4|nt|Cùng với Georges Braque, họa sĩ nào khởi xướng trường phái Lập thể?|Pablo Picasso|Henri Matisse|Claude Monet|Paul Cézanne
4|nt|Bức tranh "Ấn tượng, mặt trời mọc" của Claude Monet đã đặt tên cho trường phái hội họa nào?|Trường phái Ấn tượng|Trường phái Lập thể|Trường phái Siêu thực|Trường phái Dã thú
4|nt|Bức tranh "Tiếng thét" là của họa sĩ nào?|Edvard Munch|Gustav Klimt|Egon Schiele|Wassily Kandinsky
4|nt|Bức tranh "Guernica" là của họa sĩ nào?|Pablo Picasso|Salvador Dalí|Joan Miró|Francisco Goya
4|nt|Tượng "Người suy tư" là tác phẩm của nhà điêu khắc nào?|Auguste Rodin|Michelangelo|Donatello|Bernini
4|nt|Vở opera "Cây sáo thần" do ai sáng tác?|Mozart|Verdi|Wagner|Puccini
4|van|"Tiếng gà trưa" là bài thơ của ai?|Xuân Quỳnh|Phạm Tiến Duật|Bằng Việt|Tố Hữu
4|van|"Bếp lửa" là bài thơ của ai?|Bằng Việt|Xuân Quỳnh|Tế Hanh|Nguyễn Duy
4|van|"Ánh trăng" ("Hồi nhỏ sống với đồng") là bài thơ của ai?|Nguyễn Duy|Bằng Việt|Thanh Hải|Y Phương
4|van|"Mùa xuân nho nhỏ" là bài thơ của ai?|Thanh Hải|Viễn Phương|Nguyễn Duy|Huy Cận
4|van|"Viếng lăng Bác" là bài thơ của ai?|Viễn Phương|Thanh Hải|Tố Hữu|Minh Huệ
4|van|"Đêm nay Bác không ngủ" là bài thơ của ai?|Minh Huệ|Tố Hữu|Viễn Phương|Chế Lan Viên
4|van|"Nói với con" là bài thơ của nhà thơ nào?|Y Phương|Thanh Hải|Nguyễn Duy|Bằng Việt
4|van|Bài thơ "Việt Bắc" ("Mình về mình có nhớ ta") là của ai?|Tố Hữu|Chính Hữu|Quang Dũng|Hoàng Trung Thông
4|van|Đoạn trích "Đất Nước" ("Khi ta lớn lên Đất Nước đã có rồi") thuộc trường ca của ai?|Nguyễn Khoa Điềm|Nguyễn Đình Thi|Thanh Thảo|Hữu Thỉnh
4|van|"Thương vợ" ("Quanh năm buôn bán ở mom sông") là bài thơ của ai?|Trần Tế Xương|Nguyễn Khuyến|Tản Đà|Nguyễn Công Trứ
4|van|"Bài ca ngất ngưởng" là của tác giả nào?|Nguyễn Công Trứ|Cao Bá Quát|Nguyễn Khuyến|Tú Xương
4|van|"Bài ca ngắn đi trên bãi cát" là của tác giả nào?|Cao Bá Quát|Nguyễn Công Trứ|Nguyễn Du|Nguyễn Khuyến
4|van|"Văn tế nghĩa sĩ Cần Giuộc" là của ai?|Nguyễn Đình Chiểu|Phan Bội Châu|Nguyễn Khuyến|Nguyễn Trãi
4|van|"Chiếu dời đô" do ai viết?|Lý Công Uẩn (Lý Thái Tổ)|Lý Thường Kiệt|Trần Thủ Độ|Lê Lợi
4|van|"Thiên Trường vãn vọng" là bài thơ của ai?|Trần Nhân Tông|Trần Quang Khải|Lý Thường Kiệt|Nguyễn Trãi
4|van|"Phò giá về kinh" ("Tụng giá hoàn kinh sư") là bài thơ của ai?|Trần Quang Khải|Trần Nhân Tông|Trần Hưng Đạo|Phạm Ngũ Lão
4|van|"Tỏ lòng" ("Thuật hoài") là bài thơ của ai?|Phạm Ngũ Lão|Trần Quang Khải|Đặng Dung|Trần Hưng Đạo
4|van|"Quốc âm thi tập" là tập thơ Nôm của ai?|Nguyễn Trãi|Nguyễn Bỉnh Khiêm|Lê Thánh Tông|Nguyễn Du
4|van|Bài thơ "Nhàn" ("Một mai, một cuốc, một cần câu") là của ai?|Nguyễn Bỉnh Khiêm|Nguyễn Trãi|Nguyễn Công Trứ|Nguyễn Khuyến
4|van|"Độc Tiểu Thanh kí" là bài thơ chữ Hán của ai?|Nguyễn Du|Nguyễn Trãi|Cao Bá Quát|Nguyễn Khuyến
4|van|Tác phẩm chữ Hán "Chinh phụ ngâm" là của ai?|Đặng Trần Côn|Đoàn Thị Điểm|Nguyễn Gia Thiều|Nguyễn Du
4|van|Tờ báo "Thanh Niên" (1925), tờ báo cách mạng đầu tiên của Việt Nam, do ai sáng lập?|Nguyễn Ái Quốc|Phan Bội Châu|Huỳnh Thúc Kháng|Trần Phú
4|van|Câu thơ "Sao anh không về chơi thôn Vĩ?" là của nhà thơ nào?|Hàn Mặc Tử|Xuân Diệu|Huy Cận|Nguyễn Bính
4|tv|Từ nào viết đúng chính tả?|Sát sao|Xát sao|Sát xao|Xát xao
4|tv|"Nhuận bút" nghĩa là gì?|Tiền trả cho tác giả khi tác phẩm được sử dụng|Cây bút dùng để ký|Bút danh của nhà văn|Lỗi in ấn trong sách
4|tv|Thành ngữ "Đầu voi đuôi chuột" chỉ việc gì?|Lúc đầu to tát, về sau nhỏ bé, bỏ dở|Làm việc chu đáo từ đầu đến cuối|Người có sức khỏe hơn người|Kẻ mạnh bắt nạt kẻ yếu
4|tv|"Khẩu Phật tâm xà" chỉ người như thế nào?|Miệng nói từ bi nhưng lòng độc ác|Ăn nói thật thà|Tu hành chân chính|Nóng nảy nhưng tốt bụng
4|the|World Cup bóng đá nam đầu tiên (1930) được tổ chức ở nước nào?|Uruguay|Brazil|Ý|Pháp
4|the|Đội nào vô địch World Cup bóng đá nam đầu tiên năm 1930?|Uruguay|Argentina|Ý|Brazil
4|the|Vận động viên nào giành nhiều huy chương vàng Olympic nhất lịch sử?|Michael Phelps|Usain Bolt|Carl Lewis|Larisa Latynina
4|the|Thuật ngữ "birdie", "eagle", "bogey" thuộc môn thể thao nào?|Golf|Bóng bàn|Bóng chày|Bắn cung
4|the|Trong cờ vua, nước "nhập thành" là nước đi phối hợp của hai quân nào?|Vua và Xe|Vua và Hậu|Xe và Mã|Hậu và Tượng
4|the|Trong cờ tướng, quân nào sau đây không bao giờ được qua sông?|Tượng|Mã|Xe|Pháo
4|the|Trận chung kết U23 châu Á 2018, nơi U23 Việt Nam giành ngôi á quân, diễn ra ở thành phố nào?|Thường Châu (Trung Quốc)|Doha (Qatar)|Băng Cốc (Thái Lan)|Tashkent (Uzbekistan)
4|the|Trong golf, "par" nghĩa là gì?|Số gậy tiêu chuẩn để hoàn thành một hố|Đưa bóng vào hố chỉ bằng một gậy|Đánh nhiều hơn tiêu chuẩn một gậy|Hai người hòa nhau
4|dl|Đơn vị tiền tệ của Thụy Sĩ là gì?|Franc Thụy Sĩ|Euro|Krone|Bảng
5|su|Bộ chính sử đầu tiên của nước ta, "Đại Việt sử ký" (1272), do ai biên soạn?|Lê Văn Hưu|Ngô Sĩ Liên|Phan Phu Tiên|Lê Quý Đôn
5|su|"Đại Việt sử ký toàn thư" (bản hoàn thành năm 1479) do sử thần nào biên soạn?|Ngô Sĩ Liên|Lê Văn Hưu|Phan Huy Chú|Lê Quý Đôn
5|su|"Lịch triều hiến chương loại chí" là công trình của ai?|Phan Huy Chú|Lê Quý Đôn|Ngô Thì Sĩ|Phạm Đình Hổ
5|su|"Vân đài loại ngữ" là tác phẩm mang tính bách khoa của ai?|Lê Quý Đôn|Phan Huy Chú|Lê Hữu Trác|Nguyễn Bỉnh Khiêm
5|su|"Hải Thượng Lãn Ông" là tên hiệu của danh y nào?|Lê Hữu Trác|Tuệ Tĩnh|Nguyễn Đình Chiểu|Chu Văn An
5|su|Danh y Tuệ Tĩnh nổi tiếng với quan điểm nào?|"Nam dược trị Nam nhân"|"Lương y như từ mẫu"|"Phòng bệnh hơn chữa bệnh"|"Có bệnh thì vái tứ phương"
5|su|Thầy giáo nào dâng "Thất trảm sớ" xin chém 7 nịnh thần?|Chu Văn An|Lê Quý Đôn|Nguyễn Bỉnh Khiêm|Lương Thế Vinh
5|su|Vị vua nào sáng lập Thiền phái Trúc Lâm Yên Tử?|Trần Nhân Tông|Trần Thái Tông|Trần Thánh Tông|Lý Thái Tông
5|su|Vị vua nào ở ngôi lâu nhất trong lịch sử Việt Nam (56 năm)?|Lý Nhân Tông|Lê Thánh Tông|Lý Thánh Tông|Tự Đức
5|su|Năm 1428, Lê Lợi lên ngôi và đặt quốc hiệu là gì?|Đại Việt|Đại Nam|Đại Ngu|Việt Nam
5|su|Quốc hiệu "Đại Ngu" là của triều đại nào?|Nhà Hồ|Nhà Mạc|Nhà Tây Sơn|Nhà Lê sơ
5|su|Quốc hiệu "Việt Nam" lần đầu được dùng chính thức (năm 1804) dưới triều vua nào?|Gia Long|Minh Mạng|Tự Đức|Thiệu Trị
5|su|Vị vua nào đổi quốc hiệu thành "Đại Nam"?|Minh Mạng|Gia Long|Tự Đức|Thiệu Trị
5|su|Nhà Mạc do ai lập nên?|Mạc Đăng Dung|Mạc Đĩnh Chi|Mạc Mậu Hợp|Mạc Cửu
5|su|Tên gọi "Hà Nội" có từ năm nào, dưới triều vua Minh Mạng?|1831|1802|1010|1888
5|su|Theo sử cũ, tên "Thăng Long" có nghĩa là gì?|Rồng bay lên|Rồng nằm phục|Đất thiêng|Kinh đô vững bền
5|su|Năm 1912, Phan Bội Châu thành lập tổ chức nào tại Quảng Châu?|Việt Nam Quang phục hội|Duy Tân hội|Việt Nam Quốc dân đảng|Tâm tâm xã
5|su|Ai là lãnh tụ Việt Nam Quốc dân đảng, lãnh đạo khởi nghĩa Yên Bái năm 1930?|Nguyễn Thái Học|Phạm Hồng Thái|Phan Bội Châu|Phan Châu Trinh
5|su|Năm 1924, người chiến sĩ đặt bom mưu sát toàn quyền Méc-lanh tại Sa Diện (Quảng Châu) là ai?|Phạm Hồng Thái|Nguyễn Thái Học|Lý Tự Trọng|Võ Thị Sáu
5|su|Câu nói "Con đường của thanh niên chỉ có thể là con đường cách mạng" là của ai?|Lý Tự Trọng|Phạm Hồng Thái|Nguyễn Văn Trỗi|Võ Thị Sáu
5|su|Chiến tranh Trăm năm diễn ra giữa hai nước nào?|Anh và Pháp|Pháp và Tây Ban Nha|Anh và Tây Ban Nha|Phổ và Áo
5|su|Chiến tranh Trăm năm (1337–1453) thực tế kéo dài bao nhiêu năm?|116 năm|100 năm|99 năm|130 năm
5|su|Văn kiện Magna Carta (Đại Hiến chương) được ký ở nước Anh năm nào?|1215|1066|1415|1688
5|su|Trận Hastings năm 1066 mở đầu cuộc chinh phục nước Anh của ai?|William xứ Normandy|Richard Tim Sư Tử|Harold II|Henry VIII
5|su|Thành phố cổ Pompeii bị vùi lấp năm 79 do núi lửa nào phun trào?|Vesuvius|Etna|Stromboli|Krakatoa
5|su|Kim tự tháp Kheops (Khufu) được xây dựng vào khoảng thời gian nào?|Khoảng năm 2560 TCN|Khoảng năm 1200 TCN|Khoảng năm 500 TCN|Khoảng năm 100
5|su|Bộ luật Hammurabi thuộc nền văn minh cổ đại nào?|Lưỡng Hà (Babylon)|Ai Cập|Ấn Độ|Hy Lạp
5|su|Hốt Tất Liệt lập ra triều đại nào ở Trung Quốc?|Nhà Nguyên|Nhà Minh|Nhà Thanh|Nhà Tống
5|su|Nhà Minh ở Trung Quốc do ai sáng lập?|Chu Nguyên Chương|Triệu Khuông Dận|Lý Uyên|Lưu Bang
5|su|Nhà Hán ở Trung Quốc do ai sáng lập?|Lưu Bang|Hạng Vũ|Tần Thủy Hoàng|Chu Nguyên Chương
5|su|Ai là người sáng lập Đế quốc Mông Cổ?|Thành Cát Tư Hãn|Hốt Tất Liệt|Oa Khoát Đài|Mông Kha
5|dia|Sa mạc nào được xem là khô hạn nhất thế giới (không tính vùng cực)?|Atacama|Sahara|Gobi|Namib
5|dia|Không tính lục địa Úc, đảo lớn nhất thế giới là đảo nào?|Greenland|New Guinea|Borneo|Madagascar
5|dia|Quốc gia nào có diện tích lớn nhất châu Phi?|Algérie|Cộng hòa Dân chủ Congo|Sudan|Libya
5|dia|Đỉnh núi cao nhất Bắc Mỹ là?|Denali|Whitney|Logan|Orizaba
5|dia|Vịnh Hạ Long được UNESCO công nhận Di sản thiên nhiên thế giới lần đầu vào năm nào?|1994|1999|2000|2003
5|dia|Di sản Văn hóa thế giới đầu tiên của Việt Nam (năm 1993) là?|Quần thể di tích Cố đô Huế|Phố cổ Hội An|Khu đền tháp Mỹ Sơn|Hoàng thành Thăng Long
5|dia|Quần thể danh thắng Tràng An được UNESCO ghi danh là loại di sản nào?|Di sản hỗn hợp văn hóa và thiên nhiên|Di sản thiên nhiên|Di sản văn hóa|Di sản tư liệu
5|dia|Năm 2009, Mộc bản triều Nguyễn được UNESCO công nhận là loại di sản nào?|Di sản tư liệu thế giới|Di sản văn hóa phi vật thể|Di sản văn hóa vật thể|Di sản thiên nhiên
5|dia|Cầu Long Biên (Hà Nội) khi mới khánh thành mang tên vị toàn quyền Pháp nào?|Paul Doumer|Paul Bert|Albert Sarraut|Jean Decoux
5|dia|Quốc gia nào có nhiều múi giờ nhất thế giới (tính cả lãnh thổ hải ngoại)?|Pháp|Nga|Hoa Kỳ|Anh
5|kh|Ai phát hiện ra electron năm 1897?|J. J. Thomson|Ernest Rutherford|Niels Bohr|James Chadwick
5|kh|Ai phát hiện ra nơtron năm 1932?|James Chadwick|J. J. Thomson|Ernest Rutherford|Enrico Fermi
5|kh|Thí nghiệm bắn hạt alpha vào lá vàng dẫn tới mô hình hạt nhân nguyên tử là của ai?|Ernest Rutherford|Niels Bohr|J. J. Thomson|Max Planck
5|kh|Năm 2012, hạt Higgs được xác nhận tại máy gia tốc nào?|LHC của CERN|Tevatron|SLAC|RHIC
5|kh|Albert Einstein nhận giải Nobel Vật lý năm 1921 chủ yếu nhờ công trình nào?|Giải thích hiệu ứng quang điện|Thuyết tương đối hẹp|Thuyết tương đối rộng|Công thức E = mc²
5|kh|Nguyên lý bất định là của nhà vật lý nào?|Werner Heisenberg|Erwin Schrödinger|Niels Bohr|Paul Dirac
5|kh|Nguyên tố nào có độ âm điện lớn nhất?|Flo|Oxi|Clo|Nitơ
5|kh|Kim loại nào có nhiệt độ nóng chảy cao nhất?|Vonfram|Sắt|Bạch kim|Titan
5|kh|Người có nhóm máu nào có thể nhận hồng cầu của mọi nhóm máu trong hệ ABO?|AB|O|A|B
5|kh|Phần nào của não chủ yếu điều khiển thăng bằng và phối hợp vận động?|Tiểu não|Đại não|Hành não|Tuyến yên
5|kh|Hoóc-môn nào được tiết nhiều khi trời tối, giúp điều hòa giấc ngủ?|Melatonin|Adrenalin|Insulin|Cortisol
5|kh|Loài động vật nào có ba quả tim?|Bạch tuộc|Cá voi|Sứa|Ếch
5|kh|Loài chim nào có thể bay lùi?|Chim ruồi|Đại bàng|Chim én|Hải âu
5|kh|Tên khoa học của loài người hiện đại là?|Homo sapiens|Homo erectus|Homo habilis|Australopithecus
5|kh|Sao chổi Halley quay lại gần Trái Đất khoảng bao nhiêu năm một lần?|75–76 năm|50 năm|100 năm|12 năm
5|kh|Ngôi sao sáng nhất trên bầu trời đêm (không kể Mặt Trời) là?|Sirius (Thiên Lang)|Sao Bắc Cực|Betelgeuse|Vega
5|kh|Sao Bắc Cực (Polaris) thuộc chòm sao nào?|Tiểu Hùng (Gấu Nhỏ)|Đại Hùng (Gấu Lớn)|Thiên Hậu|Lạp Hộ
5|kh|Hành tinh nào có một ngày (một vòng tự quay) dài hơn một năm của chính nó?|Sao Kim|Sao Thủy|Sao Hỏa|Sao Mộc
5|kh|Hành tinh nào có trục quay nghiêng gần 98°, như đang "lăn" trên quỹ đạo?|Sao Thiên Vương|Sao Hải Vương|Sao Thổ|Sao Kim
5|kh|"Vết Đỏ Lớn" là một cơn bão khổng lồ trên hành tinh nào?|Sao Mộc|Sao Thổ|Sao Hải Vương|Sao Hỏa
5|kh|Olympus Mons, ngọn núi lửa cao nhất được biết trong Hệ Mặt Trời, nằm ở đâu?|Sao Hỏa|Sao Kim|Mặt Trăng|Io
5|kh|"Năm ánh sáng" là đơn vị đo đại lượng nào?|Khoảng cách|Thời gian|Tốc độ|Độ sáng
5|kh|Ai là người đầu tiên đi bộ ngoài không gian?|Alexei Leonov|Yuri Gagarin|Neil Armstrong|Ed White
5|kh|Người phụ nữ đầu tiên bay vào vũ trụ là ai?|Valentina Tereshkova|Sally Ride|Svetlana Savitskaya|Mae Jemison
5|cn|"Định luật Moore" dự đoán điều gì?|Số bóng bán dẫn trên một chip tăng gấp đôi khoảng mỗi 2 năm|Tốc độ Internet tăng gấp đôi mỗi năm|Giá máy tính giảm một nửa mỗi tháng|Dung lượng ổ cứng tăng 10 lần mỗi năm
5|cn|Ngôn ngữ lập trình C được Dennis Ritchie phát triển tại đâu?|Bell Labs|IBM|Microsoft|Xerox PARC
5|cn|Tên thuật toán mã hóa RSA được đặt theo điều gì?|Tên ba nhà khoa học Rivest, Shamir, Adleman|Tên một công ty bảo mật|Tên một giao thức mạng|Tên một loại máy tính
5|nt|"Truyền kỳ mạn lục" là tác phẩm của ai?|Nguyễn Dữ|Nguyễn Trãi|Lê Thánh Tông|Nguyễn Bỉnh Khiêm
5|nt|"Chuyện người con gái Nam Xương" được in trong tác phẩm nào?|Truyền kỳ mạn lục|Lĩnh Nam chích quái|Việt điện u linh|Thánh Tông di thảo
5|nt|"Thượng kinh ký sự" là tác phẩm của ai?|Lê Hữu Trác|Phạm Đình Hổ|Lê Quý Đôn|Nguyễn Án
5|nt|"Vũ trung tùy bút" là tác phẩm của ai?|Phạm Đình Hổ|Lê Hữu Trác|Lê Quý Đôn|Phan Huy Chú
5|nt|Truyện ngắn "Chiếc lá cuối cùng" là của nhà văn nào?|O. Henry|Jack London|Mark Twain|Edgar Allan Poe
5|nt|Tiểu thuyết "Trăm năm cô đơn" là của ai?|Gabriel García Márquez|Mario Vargas Llosa|Jorge Luis Borges|Pablo Neruda
5|nt|"Tội ác và hình phạt" là tiểu thuyết của ai?|Fyodor Dostoevsky|Lev Tolstoy|Anton Chekhov|Maxim Gorky
5|nt|Tiểu thuyết "Người tình" (L'Amant), lấy bối cảnh Sài Gòn thời Pháp thuộc, là của nhà văn nào?|Marguerite Duras|Simone de Beauvoir|Françoise Sagan|Albert Camus
5|nt|Vở opera "Aida" do ai sáng tác?|Giuseppe Verdi|Giacomo Puccini|Gioachino Rossini|Mozart
5|nt|Bức tranh với những chiếc đồng hồ mềm chảy "Sự dai dẳng của ký ức" là của ai?|Salvador Dalí|René Magritte|Pablo Picasso|Max Ernst
5|nt|Bức tranh "Cô gái đeo hoa tai ngọc trai" là của họa sĩ nào?|Johannes Vermeer|Rembrandt|Peter Paul Rubens|Jan van Eyck
5|nt|Tượng David bằng đá cẩm thạch cao hơn 5 m ở Florence là tác phẩm của ai?|Michelangelo|Raphael|Bernini|Auguste Rodin
5|van|Câu thơ "Tôi muốn tắt nắng đi / Cho màu đừng nhạt mất" là của nhà thơ nào?|Xuân Diệu|Huy Cận|Hàn Mặc Tử|Thế Lữ
5|van|Câu thơ "Trước lầu Ngưng Bích khóa xuân" nằm trong tác phẩm nào?|Truyện Kiều|Chinh phụ ngâm|Cung oán ngâm khúc|Lục Vân Tiên
5|van|Bài thơ "Đất nước" ("Sáng mát trong như sáng năm xưa") là của ai?|Nguyễn Đình Thi|Nguyễn Khoa Điềm|Tố Hữu|Chế Lan Viên
5|van|Ai là nữ chủ bút của "Nữ giới chung" (1918), tờ báo phụ nữ đầu tiên ở Việt Nam?|Sương Nguyệt Anh|Đạm Phương|Hồ Xuân Hương|Đoàn Thị Điểm
5|van|Tờ báo chữ Quốc ngữ đầu tiên ở Việt Nam là tờ nào?|Gia Định báo|Nam Phong tạp chí|Đông Dương tạp chí|Thanh Niên
5|van|"Truyện Kiều" của Nguyễn Du có bao nhiêu câu thơ?|3.254|3.200|2.354|4.254
5|the|"Bàn tay của Chúa" là cách gọi bàn thắng gây tranh cãi của cầu thủ nào ở World Cup 1986?|Diego Maradona|Pelé|Zico|Gary Lineker
5|the|Thuật ngữ "hat-trick" ban đầu xuất phát từ môn thể thao nào?|Cricket|Bóng đá|Khúc côn cầu trên băng|Bóng chày
5|the|Giải đua xe đạp Tour de France được tổ chức lần đầu năm nào?|1903|1896|1920|1950
5|the|Theo Pierre de Coubertin, năm vòng tròn trên lá cờ Olympic tượng trưng cho điều gì?|Năm châu lục|Năm môn thi đấu đầu tiên|Năm thành phố đăng cai đầu tiên|Năm nước sáng lập
`;
  const BANK = window.TT_BANK = window.TT_BANK || [];
  // Các file thongthai-bank*.js khác gọi TT_ADD(chuỗi) để thêm câu theo cùng định dạng.
  window.TT_ADD = function (raw) {
    for (const line of raw.split('\n')) {
      const s = line.trim(); if (!s) continue;
      const p = s.split('|');
      if (p.length !== 7) { if (typeof console !== 'undefined') console.warn('[thongthai] dòng lỗi:', s); continue; }
      const it = { tier: +p[0], cat: CAT[p[1]] || p[1], q: p[2], a: p.slice(3) };
      let h = 0; const k = it.q + '|' + it.a[0]; for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0;
      it.key = 'b' + (h >>> 0).toString(36);   // khóa ổn định theo nội dung, không phụ thuộc thứ tự dòng
      BANK.push(it);
    }
  };
  window.TT_ADD(RAW);
})();
