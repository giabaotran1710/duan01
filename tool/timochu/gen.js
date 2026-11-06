// Sinh bố cục ô chữ: mỗi hàng là một từ, từ khóa đọc từ trên xuống ở cột giữa (floor((N-1)/2)).
const WORDS = require('./words.js');
const KEYS = {
  4: [['TÌNH','cảm xúc gắn bó giữa người với người'], ['BIỂN','nước mặn mênh mông'], ['SÔNG','dòng nước chảy lớn'], ['CHIM','loài vật biết bay']],
  5: [['TRĂNG','sáng ban đêm'], ['MIỆNG','bộ phận để ăn và nói'], ['CHÂN','chi để đi lại']],
  6: [['ĐƯỜNG','gia vị ngọt'], ['CHUỒNG','nơi nhốt vật nuôi'], ['TRƯỜNG','nơi học tập'], ['CHUYỂN','đổi chỗ, di chuyển']],
  7: [['NGHIÊNG','lệch về một bên']],
};
// hàng i: từ w có chữ K[i] ở vị trí p; bắt đầu tại s = c - p, ô nằm trong lưới
function solve(N, key, rnd) {
  const c = Math.floor((N - 1) / 2), K = key[0];
  const rows = [];
  const used = new Set([K]);   // không dùng lại chính từ khóa làm một hàng
  function cands(ch) {
    const out = [];
    for (const [w, clue] of WORDS) {
      if (w.length > N) continue;
      for (let p = 0; p < w.length; p++) {
        if (w[p] !== ch) continue;
        const s = c - p; if (s < 0 || s + w.length > N) continue;
        out.push({ w, clue, s, p });
      }
    }
    return out;
  }
  function go(i) {
    if (i === N) return true;
    const list = cands(K[i]).filter(x => !used.has(x.w));
    list.sort(() => rnd() - 0.5);
    for (const x of list) {
      used.add(x.w); rows.push(x);
      if (go(i + 1)) return true;
      rows.pop(); used.delete(x.w);
    }
    return false;
  }
  return go(0) ? rows : null;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
module.exports = { KEYS, solve, rng };
// Tạo đề: với mỗi cỡ, thử các từ khóa (là từ có đúng N chữ trong danh sách), lấy các bố cục đầu tiên tìm được
function puzzles(N, want) {
  const keys = WORDS.filter(([w]) => w.length === N);
  const out = [];
  for (const key of keys) {
    for (let seed = 1; seed < 300; seed++) {
      const r = solve(N, key, rng(seed * 7919 + N * 31 + key[0].length));
      if (r) { out.push({ key, rows: r }); break; }
    }
    if (out.length >= want) break;
  }
  return out;
}
if (require.main === module) {
  for (const N of [4,5,6,7]) {
    const ps = puzzles(N, 99);
    console.log(N, 'từ khóa khả thi:', ps.map(p => p.key[0]).join(', ') || 'KHÔNG CÓ');
  }
}
module.exports.puzzles = puzzles;
