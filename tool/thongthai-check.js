// Kiểm tra ngân hàng câu hỏi và bộ sinh câu hỏi của Thông thái trắc nghiệm.
//   node tool/thongthai-check.js
// Báo lỗi định dạng (thiếu phương án, phương án trùng, câu trùng), đếm câu theo mức/chủ đề,
// và chạy thử bộ sinh 20.000 lần mỗi mức để chắc mọi câu sinh ra đều có 4 phương án khác nhau.
global.window = {};
const path = require('path');
require(path.join(__dirname, '../game/thongthai-bank.js'));
require(path.join(__dirname, '../game/thongthai-bank2.js'));
require(path.join(__dirname, '../game/thongthai-bank3.js'));
require(path.join(__dirname, '../game/thongthai-bank4.js'));
require(path.join(__dirname, '../game/thongthai-bank5.js'));
require(path.join(__dirname, '../game/thongthai-wiki.js'));
require(path.join(__dirname, '../game/thongthai-gen.js'));
const BANK = window.TT_BANK, GEN = window.TTGen;
let errors = 0;
const err = m => { errors++; console.log('LỖI:', m); };

const seenQ = new Map(), seenKey = new Set();
const byTier = {}, byCat = {};
for (const it of BANK) {
  if (!(it.tier >= 1 && it.tier <= 5)) err('mức sai: ' + it.q);
  if (it.a.length !== 4) err('không đủ 4 phương án: ' + it.q);
  if (new Set(it.a.map(s => s.trim().toLowerCase())).size !== 4) err('phương án trùng: ' + it.q);
  if (it.a.some(s => !s.trim())) err('phương án rỗng: ' + it.q);
  const k = it.q.trim().toLowerCase();
  if (seenQ.has(k) && seenQ.get(k) === it.a[0]) err('câu trùng: ' + it.q);
  seenQ.set(k, it.a[0]);
  if (seenKey.has(it.key)) err('trùng khóa: ' + it.q);
  seenKey.add(it.key);
  byTier[it.tier] = (byTier[it.tier] || 0) + 1;
  byCat[it.cat] = (byCat[it.cat] || 0) + 1;
}
console.log('Câu viết tay:', BANK.length);
console.log('  theo mức:', byTier);
console.log('  theo chủ đề:', byCat);

for (let t = 1; t <= 5; t++) {
  const uniq = new Set(); let fail = 0;
  for (let i = 0; i < 20000; i++) {
    const q = GEN.make(t);
    if (!q) { fail++; continue; }
    if (q.a.length !== 4 || new Set(q.a).size !== 4) err('câu sinh lỗi: ' + q.q + ' => ' + q.a.join(' | '));
    uniq.add(q.key);
  }
  if (fail) err(`mức ${t}: ${fail} lần không sinh được câu`);
  console.log(`Bộ sinh mức ${t}: ${uniq.size} câu khác nhau trong 20.000 lần thử`);
}
console.log('Ước tính số câu khác nhau bộ sinh tạo được:', GEN.size().toLocaleString('vi-VN'));
// Kiểm chéo vài giá trị lịch đã biết
const chk = (a, b, m) => { if (a !== b) err(m + `: ${a} ≠ ${b}`); };
chk(GEN._canChi(1945), 'Ất Dậu', 'Can Chi 1945'); chk(GEN._canChi(1984), 'Giáp Tý', 'Can Chi 1984'); chk(GEN._canChi(2025), 'Ất Tỵ', 'Can Chi 2025');
chk(GEN._roman(1994), 'MCMXCIV', 'La Mã 1994'); chk(GEN._dow(1945, 9, 2), 0, 'Thứ 2/9/1945 (Chủ nhật)'); chk(GEN._dow(1975, 4, 30), 3, 'Thứ 30/4/1975 (Thứ Tư)');
console.log(errors ? `\n${errors} lỗi` : '\nKhông có lỗi.');
process.exit(errors ? 1 : 0);
