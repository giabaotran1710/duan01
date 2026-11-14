/* Thông thái trắc nghiệm - bộ sinh câu hỏi tự động.
 * Mỗi câu do máy tính ra đáp án (phép tính, đổi đơn vị, lịch, bảng dữ liệu cố định) nên không thể sai.
 *   TTGen.make(tier, rng) -> { q, a: [đúng, sai, sai, sai], cat, key }   (tier 1 dễ ... 5 siêu khó)
 *   TTGen.size()          -> số câu khác nhau ước tính mà bộ sinh tạo được
 * rng: hàm trả số ngẫu nhiên trong [0,1); bỏ trống thì dùng Math.random. */
(function () {
  'use strict';

  const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function shuffle(r, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const fmt = n => (typeof n === 'number' ? n.toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : String(n));

  // 3 số sai khác nhau, khác đáp án, không âm. cands: các phương án nhiễu ưu tiên.
  function wrongNums(r, ans, cands, min) {
    min = min == null ? 0 : min;
    const seen = new Set([ans]), out = [];
    for (const c of shuffle(r, cands.slice())) {
      if (out.length === 3) break;
      if (typeof c === 'number' && isFinite(c) && c >= min && !seen.has(c) && Math.abs(c - Math.round(c * 1e4) / 1e4) < 1e-9) { seen.add(c); out.push(c); }
    }
    for (let k = 1; out.length < 3; k++) for (const c of [ans + k, ans - k]) if (out.length < 3 && c >= min && !seen.has(c)) { seen.add(c); out.push(c); }
    return out;
  }
  // Nhiễu cùng chữ số tận cùng (để không loại được bằng mẹo nhìn hàng đơn vị)
  const sameTail = (ans, steps) => steps.flatMap(s => [ans + s, ans - s]);
  function numQ(r, q, ans, cands, cat, unit, min) {
    const w = wrongNums(r, ans, cands, min);
    const f = v => fmt(v) + (unit || '');
    return { q, a: [f(ans)].concat(w.map(f)), cat };
  }
  function strQ(r, q, ans, pool, cat) {
    const w = shuffle(r, pool.filter(x => x !== ans).filter((x, i, arr) => arr.indexOf(x) === i)).slice(0, 3);
    return { q, a: [ans].concat(w), cat };
  }

  const G = []; // { tiers:[...], w: trọng số, size: số câu ước tính, make(r, tier) }
  function add(tiers, size, make, w) { G.push({ tiers, size, make, w: w || 1 }); }

  // Dãy số
  add([1, 2, 3, 4, 5], 50000, (r, t) => {
    let s = [], ans, c = [];
    if (t === 1) { const a = int(r, 1, 30), d = int(r, 2, 9); for (let i = 0; i < 5; i++) s.push(a + i * d); ans = a + 5 * d; c = [ans + 1, ans - 1, ans + d, ans - d]; }
    else if (t === 2) { const a = int(r, 1, 5), q = int(r, 2, 3); for (let i = 0; i < 5; i++) s.push(a * q ** i); ans = a * q ** 5; c = [ans + s[4], ans / q * (q - 1), ans + q, ans - s[3]]; }
    else if (t === 3) { const a = int(r, 1, 20), d = int(r, 1, 5), e = int(r, 1, 3); let x = a, k = d; for (let i = 0; i < 5; i++) { s.push(x); x += k; k += e; } ans = x; c = [ans + e, ans - e, ans + 1, ans + k]; }
    else if (t === 4) { let x = int(r, 1, 6), y = int(r, x, x + 6); s = [x, y]; for (let i = 0; i < 4; i++) s.push(s[s.length - 1] + s[s.length - 2]); ans = s[s.length - 1] + s[s.length - 2]; c = [ans + 1, ans - 1, s[s.length - 1] * 2, ans + s[s.length - 3]]; }
    else { const m = int(r, 2, 3), p = int(r, 1, 5); let x = int(r, 1, 6); for (let i = 0; i < 6; i++) { s.push(x); x = i % 2 === 0 ? x * m : x + p; } ans = x; c = [ans + p, ans * m, ans - p, s[s.length - 1] * m + p]; }
    return numQ(r, `Số tiếp theo của dãy: ${s.map(fmt).join(', ')}, ... là?`, ans, c, 'Tư duy');
  }, 1.2);

  // ---------- Hình học ----------
  add([1, 2, 3, 4, 5], 3000, (r, t) => {
    if (t === 1) { if (r() < .5) { const a = int(r, 2, 15); return numQ(r, `Hình vuông có cạnh ${a} cm thì chu vi là bao nhiêu?`, 4 * a, [a * a, 2 * a, 4 * a + 4, 3 * a], 'Hình học', ' cm', 1); }
      const a = int(r, 3, 20), b = int(r, 2, a - 1); return numQ(r, `Hình chữ nhật dài ${a} cm, rộng ${b} cm có chu vi bao nhiêu?`, 2 * (a + b), [a + b, a * b, 2 * a + b, 2 * (a + b) + 2], 'Hình học', ' cm', 1); }
    if (t === 2) { const a = int(r, 3, 25), b = int(r, 2, a); return numQ(r, `Hình chữ nhật dài ${a} m, rộng ${b} m có diện tích bao nhiêu?`, a * b, [2 * (a + b), a * b + a, a * b - b, a + b], 'Hình học', ' m²', 1); }
    if (t === 3) { if (r() < .5) { const a = int(r, 3, 30), h = int(r, 1, 15) * 2; return numQ(r, `Tam giác có đáy ${a} cm, chiều cao ${h} cm thì diện tích là?`, a * h / 2, [a * h, a + h, a * h / 2 + a, a * h / 4].filter(Number.isInteger), 'Hình học', ' cm²', 1); }
      const n = int(r, 5, 12); return numQ(r, `Tổng số đo các góc trong của một đa giác lồi ${n} cạnh là?`, (n - 2) * 180, [n * 180, (n - 1) * 180, (n - 3) * 180, 360 * n / 2], 'Hình học', '°', 1); }
    if (t === 4) { if (r() < .5) { const tr = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]]), k = int(r, 1, tr[0] === 3 ? 6 : 2);
        const [a, b, c] = tr.map(x => x * k); return numQ(r, `Tam giác vuông có hai cạnh góc vuông ${a} cm và ${b} cm. Cạnh huyền dài bao nhiêu?`, c, [a + b, c + 1, c - 1, c + k, b + 1], 'Hình học', ' cm', 1); }
      const rr = int(r, 1, 10), ans = Math.round(rr * rr * 314) / 100; return numQ(r, `Hình tròn bán kính ${rr} cm có diện tích bao nhiêu? (lấy π = 3,14)`, ans, [Math.round(2 * rr * 314) / 100, Math.round(rr * 314) / 100, Math.round(rr * rr * 4 * 314) / 100, ans + 1].filter(x => x !== ans), 'Hình học', ' cm²', 0); }
    if (r() < .5) { const n = int(r, 6, 20); return numQ(r, `Một đa giác lồi ${n} cạnh có bao nhiêu đường chéo?`, n * (n - 3) / 2, [n * (n - 1) / 2, n * (n - 3), n * (n - 2) / 2, n * (n - 3) / 2 + n], 'Hình học', '', 1); }
    const a = int(r, 2, 12), b = int(r, 2, 12), c = int(r, 2, 12); return numQ(r, `Hình hộp chữ nhật có kích thước ${a} × ${b} × ${c} (cm) có diện tích toàn phần là?`, 2 * (a * b + b * c + a * c), [a * b * c, a * b + b * c + a * c, 2 * (a * b + b * c + a * c) + 2 * a, 4 * (a + b + c)], 'Hình học', ' cm²', 1);
  }, 1.2);

  // Góc giữa kim giờ và kim phút
  add([4, 5], 288, (r, t) => {
    const h = int(r, 1, 12), m = t === 4 ? pick(r, [0, 30]) : int(r, 1, 11) * 5;
    let d = Math.abs(30 * (h % 12) - 5.5 * m); if (d > 180) d = 360 - d;
    if (d === 0 || d === 180) return null;
    const wr = [Math.abs(30 * (h % 12) - 6 * m) % 360, d + 15, Math.abs(d - 15), 360 - d, d + 30, d + 7.5].map(x => x > 180 ? 360 - x : x);
    return numQ(r, `Lúc ${h} giờ${m ? ' ' + m + ' phút' : ''}, góc nhỏ hơn tạo bởi kim giờ và kim phút là bao nhiêu độ?`, d, wr, 'Tư duy', '°', 0);
  }, .8);

  // ---------- Hệ đếm, số La Mã ----------
  function roman(n) { const v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], s = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I']; let o = ''; for (let i = 0; i < v.length; i++) while (n >= v[i]) { o += s[i]; n -= v[i]; } return o; }
  add([2, 3, 4], 3999, (r, t) => {
    const n = t === 2 ? int(r, 4, 39) : t === 3 ? int(r, 40, 399) : int(r, 400, 3999);
    const near = [n + 1, n - 1, n + 10, n - 10, n + 2, n - 2, n + 100, n - 100, n + 5, n - 4, n + 9, n - 9].filter(x => x > 0 && x < 4000);
    if (r() < .5) return numQ(r, `Số La Mã ${roman(n)} bằng bao nhiêu?`, n, near, 'Tư duy', '', 1);
    const w = shuffle(r, near.filter((x, i) => near.indexOf(x) === i)).slice(0, 3).map(roman);
    return { q: `Số ${n} viết bằng chữ số La Mã là?`, a: [roman(n)].concat(w), cat: 'Tư duy' };
  });
  add([4, 5], 250, (r, t) => {
    if (t === 4) { const n = int(r, 5, 63), b = n.toString(2); return numQ(r, `Số nhị phân ${b} bằng bao nhiêu trong hệ thập phân?`, n, [n + 1, n - 1, parseInt(b.split('').reverse().join(''), 2), n + 2, n * 2, n + 4], 'Tư duy', '', 1); }
    if (r() < .5) { const n = int(r, 64, 255), b = n.toString(2); const near = [n + 1, n - 1, n + 2, n + 4, n - 8, n ^ 3].filter(x => x >= 64 && x < 512).map(x => x.toString(2)); const w = shuffle(r, near.filter((x, i) => near.indexOf(x) === i && x !== b)).slice(0, 3); return { q: `Số ${n} viết trong hệ nhị phân là?`, a: [b].concat(w), cat: 'Tư duy' }; }
    const n = int(r, 26, 255), h = n.toString(16).toUpperCase(); return numQ(r, `Số thập lục phân (hệ 16) ${h} bằng bao nhiêu trong hệ thập phân?`, n, [n + 1, n - 1, n + 16, n - 16, parseInt(h, 10) || n + 6, n + 10], 'Tư duy', '', 1);
  }, .7);

  // ---------- Lịch ----------
  const CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'];   // năm tận cùng 0..9
  const CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi']; // năm % 12
  const canChi = y => CAN[y % 10] + ' ' + CHI[y % 12];
  add([3, 4], 1100, (r, t) => {
    const y = t === 3 ? int(r, 1940, 2040) : int(r, 1000, 1939);
    const ans = canChi(y);
    const w = [canChi(y + 12), canChi(y - 12), canChi(y + 1), canChi(y - 1), canChi(y + 6), CAN[(y + 2) % 10] + ' ' + CHI[y % 12], CAN[y % 10] + ' ' + CHI[(y + 2) % 12]];
    return strQ(r, `Năm ${y} (năm âm lịch bắt đầu trong năm dương lịch ${y}) là năm gì theo Can Chi?`, ans, w, 'Lịch');
  }, .8);
  const DOW = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const EVENTS = [
    [1945, 8, 19, 'Cách mạng tháng Tám giành chính quyền ở Hà Nội'], [1945, 9, 2, 'Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập'],
    [1954, 5, 7, 'Chiến thắng Điện Biên Phủ'], [1975, 4, 30, 'Giải phóng miền Nam, thống nhất đất nước'], [1973, 1, 27, 'Ký Hiệp định Paris về Việt Nam'],
    [1969, 7, 20, 'Tàu Apollo 11 đưa con người đáp xuống Mặt Trăng (giờ Mỹ)'], [1989, 11, 9, 'Bức tường Berlin bắt đầu bị mở'], [1961, 4, 12, 'Yuri Gagarin bay vào vũ trụ'],
    [2000, 1, 1, 'Ngày đầu tiên của năm 2000'], [1930, 2, 3, 'Thành lập Đảng Cộng sản Việt Nam'], [1944, 12, 22, 'Thành lập Đội Việt Nam Tuyên truyền Giải phóng quân']
  ];
  add([4, 5], 50000, (r, t) => {
    let y, m, d, extra = '';
    if (t === 5 && r() < .45) { const e = pick(r, EVENTS); [y, m, d] = e; extra = ` (${e[3]})`; }
    else { y = t === 4 ? int(r, 2000, 2035) : int(r, 1900, 1999); m = int(r, 1, 12); d = int(r, 1, [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]); }
    const k = dow(y, m, d);
    return strQ(r, `Ngày ${d}/${m}/${y}${extra} là thứ mấy?`, DOW[k], [DOW[(k + 1) % 7], DOW[(k + 6) % 7], DOW[(k + 2) % 7], DOW[(k + 5) % 7]], 'Lịch');
  }, .7);
  const leap = y => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  add([3, 4], 2000, (r, t) => {
    const ys = []; let L;
    do { L = int(r, 1600, 2400); } while (!leap(L) || (t === 3 && L % 100 === 0));
    const traps = t === 4 ? [1700, 1800, 1900, 2100, 2200, 2300].filter(x => !leap(x)) : [];
    while (ys.length < 3) { const y = traps.length && r() < .5 ? pick(r, traps) : int(r, 1600, 2400); if (!leap(y) && !ys.includes(y)) ys.push(y); }
    return { q: t === 4 ? 'Năm nào sau đây là năm nhuận (theo lịch Gregory)?' : 'Năm nào sau đây là năm nhuận?', a: [String(L)].concat(ys.map(String)), cat: 'Lịch' };
  }, .5);

  // ---------- Hóa học ----------
  const EL = [ // [kí hiệu, tên, Z, tier tên<->kí hiệu]
    ['H', 'Hiđro', 1, 2], ['He', 'Heli', 2, 3], ['Li', 'Liti', 3, 3], ['Be', 'Beri', 4, 4], ['B', 'Bo', 5, 4], ['C', 'Cacbon', 6, 2], ['N', 'Nitơ', 7, 2], ['O', 'Oxi', 8, 2],
    ['F', 'Flo', 9, 3], ['Ne', 'Neon', 10, 3], ['Na', 'Natri', 11, 2], ['Mg', 'Magie', 12, 3], ['Al', 'Nhôm', 13, 2], ['Si', 'Silic', 14, 3], ['P', 'Photpho', 15, 3],
    ['S', 'Lưu huỳnh', 16, 2], ['Cl', 'Clo', 17, 3], ['Ar', 'Argon', 18, 4], ['K', 'Kali', 19, 2], ['Ca', 'Canxi', 20, 2], ['Ti', 'Titan', 22, 4], ['Cr', 'Crom', 24, 4],
    ['Mn', 'Mangan', 25, 4], ['Fe', 'Sắt', 26, 2], ['Co', 'Coban', 27, 4], ['Ni', 'Niken', 28, 4], ['Cu', 'Đồng', 29, 2], ['Zn', 'Kẽm', 30, 3], ['Br', 'Brom', 35, 4],
    ['Kr', 'Krypton', 36, 5], ['Ag', 'Bạc', 47, 3], ['Sn', 'Thiếc', 50, 4], ['I', 'Iot', 53, 3], ['Xe', 'Xenon', 54, 5], ['Ba', 'Bari', 56, 4], ['W', 'Vonfram', 74, 5],
    ['Pt', 'Bạch kim (Platin)', 78, 4], ['Au', 'Vàng', 79, 3], ['Hg', 'Thủy ngân', 80, 3], ['Pb', 'Chì', 82, 3], ['Ra', 'Radi', 88, 5], ['U', 'Urani', 92, 4]
  ];
  add([2, 3, 4, 5], 160, (r, t) => {
    const pool = EL.filter(e => e[3] === t);
    const e = pick(r, pool.length ? pool : EL);
    const mode = t >= 4 && r() < .5 ? 'z' : r() < .5 ? 'sym' : 'name';
    const others = shuffle(r, EL.filter(x => x !== e));
    if (mode === 'sym') return { q: `Nguyên tố ${e[1]} có kí hiệu hóa học là?`, a: [e[0]].concat(others.slice(0, 3).map(x => x[0])), cat: 'Hóa học' };
    if (mode === 'name') return { q: `Kí hiệu hóa học "${e[0]}" là của nguyên tố nào?`, a: [e[1]].concat(others.slice(0, 3).map(x => x[1])), cat: 'Hóa học' };
    if (r() < .5) { const near = EL.filter(x => x !== e && Math.abs(x[2] - e[2]) <= 12); const w = shuffle(r, near.length >= 3 ? near : others).slice(0, 3); return { q: `Nguyên tố có số hiệu nguyên tử ${e[2]} là?`, a: [e[1]].concat(w.map(x => x[1])), cat: 'Hóa học' }; }
    return numQ(r, `Số hiệu nguyên tử của ${e[1]} (${e[0]}) là bao nhiêu?`, e[2], [e[2] + 1, e[2] - 1, e[2] + 2, e[2] + 8, e[2] - 8], 'Hóa học', '', 1);
  }, 1);

  // ---------- Địa lý: thủ đô, châu lục ----------
  // [nước, thủ đô, châu lục ('' = không hỏi châu lục vì trải nhiều châu), mức]
  const A = 'Châu Á', E = 'Châu Âu', F = 'Châu Phi', NA = 'Bắc Mỹ', SA = 'Nam Mỹ', O = 'Châu Đại Dương';
  const CAP = [
    ['Pháp', 'Paris', E, 1], ['Anh', 'London', E, 1], ['Nhật Bản', 'Tokyo', A, 1], ['Trung Quốc', 'Bắc Kinh', A, 1], ['Hàn Quốc', 'Seoul', A, 1], ['Thái Lan', 'Băng Cốc', A, 1],
    ['Lào', 'Viêng Chăn', A, 1], ['Campuchia', 'Phnôm Pênh', A, 1], ['Nga', 'Mát-xcơ-va', '', 1], ['Ý', 'Rome', E, 1], ['Đức', 'Berlin', E, 1], ['Hoa Kỳ', 'Washington, D.C.', NA, 2],
    ['Tây Ban Nha', 'Madrid', E, 2], ['Ai Cập', 'Cairo', '', 2], ['Ấn Độ', 'New Delhi', A, 2], ['Malaysia', 'Kuala Lumpur', A, 2], ['Philippines', 'Manila', A, 2], ['Hy Lạp', 'Athens', E, 2],
    ['Bồ Đào Nha', 'Lisbon', E, 2], ['Áo', 'Viên', E, 2], ['Bỉ', 'Brussels', E, 2], ['Cuba', 'La Habana', NA, 2], ['Triều Tiên', 'Bình Nhưỡng', A, 2], ['Argentina', 'Buenos Aires', SA, 2],
    ['Mexico', 'Thành phố Mexico', NA, 2], ['Thụy Điển', 'Stockholm', E, 2], ['Na Uy', 'Oslo', E, 2], ['Đan Mạch', 'Copenhagen', E, 2], ['Ireland', 'Dublin', E, 3],
    ['Canada', 'Ottawa', NA, 3], ['Úc', 'Canberra', O, 3], ['Brazil', 'Brasília', SA, 3], ['Thổ Nhĩ Kỳ', 'Ankara', '', 3], ['Mông Cổ', 'Ulan Bato', A, 3], ['Phần Lan', 'Helsinki', E, 3],
    ['Ba Lan', 'Warszawa', E, 3], ['Hungary', 'Budapest', E, 3], ['Séc', 'Praha', E, 3], ['Iran', 'Tehran', A, 3], ['Iraq', 'Baghdad', A, 3], ['Ả Rập Xê Út', 'Riyadh', A, 3],
    ['Kenya', 'Nairobi', F, 3], ['Peru', 'Lima', SA, 3], ['Chile', 'Santiago', SA, 3], ['Colombia', 'Bogotá', SA, 3], ['Bangladesh', 'Dhaka', A, 3], ['Nepal', 'Kathmandu', A, 3],
    ['Ukraina', 'Kyiv', E, 3], ['Venezuela', 'Caracas', SA, 3], ['Afghanistan', 'Kabul', A, 3], ['Qatar', 'Doha', A, 3], ['Singapore', 'Singapore', A, 3],
    ['Myanmar', 'Naypyidaw', A, 4], ['Pakistan', 'Islamabad', A, 4], ['Nigeria', 'Abuja', F, 4], ['Maroc', 'Rabat', F, 4], ['Thụy Sĩ', 'Bern', E, 4], ['New Zealand', 'Wellington', O, 4],
    ['Brunei', 'Bandar Seri Begawan', A, 4], ['Các Tiểu vương quốc Ả Rập Thống nhất', 'Abu Dhabi', A, 4], ['Ethiopia', 'Addis Ababa', F, 4], ['Ecuador', 'Quito', SA, 4], ['Uruguay', 'Montevideo', SA, 4],
    ['Romania', 'Bucharest', E, 4], ['Bulgaria', 'Sofia', E, 4], ['Serbia', 'Belgrade', E, 4], ['Croatia', 'Zagreb', E, 4], ['Iceland', 'Reykjavík', E, 4], ['Ghana', 'Accra', F, 4],
    ['Senegal', 'Dakar', F, 4], ['Algérie', 'Algiers', F, 4], ['Jordan', 'Amman', A, 4], ['Syria', 'Damascus', A, 4], ['Liban', 'Beirut', A, 4], ['Uzbekistan', 'Tashkent', A, 4],
    ['Jamaica', 'Kingston', NA, 4], ['Paraguay', 'Asunción', SA, 4], ['Zimbabwe', 'Harare', F, 4], ['Uganda', 'Kampala', F, 4], ['Tunisia', 'Tunis', F, 4], ['Libya', 'Tripoli', F, 4],
    ['Kazakhstan', 'Astana', '', 5], ['Đông Timor', 'Dili', A, 5], ['Bhutan', 'Thimphu', A, 5], ['Maldives', 'Malé', A, 5], ['Madagascar', 'Antananarivo', F, 5], ['Estonia', 'Tallinn', E, 5],
    ['Latvia', 'Riga', E, 5], ['Litva', 'Vilnius', E, 5], ['Slovakia', 'Bratislava', E, 5], ['Slovenia', 'Ljubljana', E, 5], ['Belarus', 'Minsk', E, 5], ['Gruzia', 'Tbilisi', '', 5],
    ['Armenia', 'Yerevan', '', 5], ['Azerbaijan', 'Baku', '', 5], ['Oman', 'Muscat', A, 5], ['Zambia', 'Lusaka', F, 5], ['Angola', 'Luanda', F, 5], ['Mozambique', 'Maputo', F, 5],
    ['Cameroon', 'Yaoundé', F, 5], ['Mali', 'Bamako', F, 5], ['Fiji', 'Suva', O, 5], ['Papua New Guinea', 'Port Moresby', O, 5], ['Costa Rica', 'San José', NA, 5], ['Kyrgyzstan', 'Bishkek', A, 5],
    ['Tajikistan', 'Dushanbe', A, 5], ['Turkmenistan', 'Ashgabat', A, 5], ['Bolivia', null, SA, 5], ['Indonesia', null, A, 2], ['Hà Lan', null, E, 2], ['Nam Phi', null, F, 3], ['Sri Lanka', null, A, 3]
  ];
  add([1, 2, 3, 4, 5], CAP.length * 3, (r, t) => {
    const pool = CAP.filter(c => c[1] && (c[3] === t || (t === 5 && c[3] === 4 && r() < .3)));
    const c = pick(r, pool);
    const same = CAP.filter(x => x !== c && x[1] && x[2] === c[2] && x[2]);
    const src = shuffle(r, same.length >= 3 && r() < .75 ? same : CAP.filter(x => x !== c && x[1]));
    if (r() < .5 || c[0] === c[1]) return { q: `Thủ đô của ${c[0]} là thành phố nào?`, a: [c[1]].concat(src.slice(0, 3).map(x => x[1])), cat: 'Địa lý' };
    return { q: `${c[1]} là thủ đô của nước nào?`, a: [c[0]].concat(src.filter(x => x[0] !== x[1]).slice(0, 3).map(x => x[0])), cat: 'Địa lý' };
  }, 1.6);
  add([1, 2, 3, 4], CAP.length, (r, t) => {
    const pool = CAP.filter(c => c[2] && Math.min(c[3], 4) === t);
    const c = pick(r, pool);
    return strQ(r, `${c[0]} thuộc châu lục nào?`, c[2], [A, E, F, NA, SA, O], 'Địa lý');
  }, .6);

  // ---------- Bộ chọn ----------
  function make(tier, rng) {
    const r = rng || Math.random;
    const list = G.filter(g => g.tiers.includes(tier));
    const tot = list.reduce((s, g) => s + g.w, 0);
    for (let tries = 0; tries < 40; tries++) {
      let x = r() * tot, g = list[0];
      for (const it of list) { x -= it.w; if (x <= 0) { g = it; break; } }
      const q = g.make(r, tier);
      if (!q || q.a.length !== 4 || new Set(q.a).size !== 4 || q.a.some(s => s == null || s === '' || /NaN|undefined|Infinity/.test(s))) continue;
      q.key = 'g:' + q.q + '|' + q.a[0];
      q.tier = tier;
      return q;
    }
    return null;
  }
  function size() { return G.reduce((s, g) => s + g.size, 0); }

  window.TTGen = { make, size, _canChi: canChi, _roman: roman, _dow: dow };
})();
