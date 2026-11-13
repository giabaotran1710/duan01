// Thử bộ sinh màn Đèn kéo quân: sinh nhiều màn mỗi mức, kiểm lời giải bằng mô phỏng, đo thời gian và số lần thử.
// Chạy: node tool/denkeoquan-gen-test.js [số màn mỗi mức, mặc định 100]
'use strict';
const C = require('../game/denkeoquan-core.js');
const G = require('../game/denkeoquan-gen.js');
const n = +process.argv[2] || 100;
let bad = 0;
for (const key of Object.keys(G.DIFF)) {
  const times = [], tries = [], steps = [], loops = [];
  for (let i = 0; i < n; i++) {
    const seed = 1000 + i * 7919;
    const t0 = Date.now();
    const gen = G.create(key, seed);
    let lv = null; while (lv === null) lv = gen.run(1e9);
    times.push(Date.now() - t0); tries.push(gen.tries);
    if (!lv) { console.log(key, seed, 'KHÔNG SINH ĐƯỢC'); bad++; continue; }
    // kiểm độc lập: giải lại từ đầu và chạy mô phỏng lời giải
    const sol = C.solve(lv);
    const sim = C.simulate(C.parse(lv), lv.solution.shadows, lv.solution.moves);
    if (!sol || sim.win < 0 || sol.steps !== lv.par.steps || sol.shadows.length !== lv.par.shadows) { console.log(key, seed, 'SAI', JSON.stringify(lv)); bad++; }
    // cùng mã phải cho cùng màn
    if (i < 5) { const again = G.generate(key, seed); if (again.map.join() !== lv.map.join()) { console.log(key, seed, 'KHÔNG ỔN ĐỊNH'); bad++; } }
    steps.push(lv.par.steps); loops.push(lv.loop);
  }
  const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
  console.log(`${key}: thời gian trung vị ${q(times, .5)} ms, p95 ${q(times, .95)} ms, max ${Math.max(...times)} ms | số lần thử trung vị ${q(tries, .5)} | bước chuẩn ${Math.min(...steps)}-${Math.max(...steps)} | vòng ${Math.min(...loops)}-${Math.max(...loops)}`);
}
process.exit(bad ? 1 : 0);
