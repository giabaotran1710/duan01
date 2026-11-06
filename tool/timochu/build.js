// Xuất đề ra game/timochu-data/puzzles.json. Chạy: node tool/timochu/build.js
const fs = require('fs'), path = require('path');
const { solve, rng, KEYS } = require('./gen.js');
const WORDS = require('./words.js');
const SIZES = [4, 5, 6, 7];
const PER_SIZE = 3;
const out = { version: 1, sizes: {} };
function distinctSolutions(N, key, want) {
  const sols = [], seen = new Set();
  for (let seed = 1; seed < 2000 && sols.length < want; seed++) {
    const r = solve(N, key, rng(seed * 104729 + N * 17));
    if (!r) continue;
    const sig = r.map(x => x.w).sort().join('|');
    if (seen.has(sig)) continue;
    seen.add(sig); sols.push(r);
  }
  return sols;
}
for (const N of SIZES) {
  const keys = WORDS.filter(([w]) => w.length === N);
  const list = [];
  for (const key of keys) {
    for (const rows of distinctSolutions(N, key, 2)) {
      list.push({ key, rows });
      if (list.length >= PER_SIZE) break;
    }
    if (list.length >= PER_SIZE) break;
  }
  const c = Math.floor((N - 1) / 2);
  out.sizes[N] = list.map((p, idx) => {
    // ô chữ hiện sẵn một số ô (không tính cột từ khóa); lấy ngẫu nhiên có seed cố định
    const r = rng(1000 + N * 10 + idx);
    const cells = [];
    p.rows.forEach((row, i) => { for (let k = 0; k < row.w.length; k++) if (row.s + k !== c) cells.push([i, row.s + k]); });
    const count = Math.max(2, Math.round(cells.length * 0.15));
    const reveal = [];
    const pool = cells.slice();
    while (reveal.length < count && pool.length) {
      const j = Math.floor(r() * pool.length);
      reveal.push(pool.splice(j, 1)[0]);
    }
    return {
      id: 'c' + N + '-' + (idx + 1),
      n: N,
      keyCol: c,
      keyword: { word: p.key[0], clue: p.key[1] },
      rows: p.rows.map(row => ({ start: row.s, word: row.w, clue: row.clue })),
      reveal: reveal.map(([i, col]) => [i, col]).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    };
  });
}
const dir = path.join(__dirname, '..', '..', 'game', 'timochu-data');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'puzzles.js'), '// Đề ô chữ (sinh bởi tool/timochu/build.js, không sửa tay)\nwindow.TIMOCHU_DATA = ' + JSON.stringify(out) + ';\n');
for (const N of SIZES) console.log(N, out.sizes[N].map(p => p.id + ':' + p.keyword.word).join('  ') || 'KHÔNG CÓ');
