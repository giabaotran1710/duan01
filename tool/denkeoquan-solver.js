// Kiểm màn Đèn kéo quân: tìm lời giải ít bóng nhất, rồi ít bước nhất (tổng bước mọi vòng).
// Chạy: node tool/denkeoquan-solver.js   (hỗ trợ màn tối đa 1 bóng)
'use strict';
const C = require('../game/denkeoquan-core.js');
const LEVELS = require('../game/denkeoquan-levels.js');
const ACTS = ['U', 'D', 'L', 'R', 'W'];
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];

function solve0(g) {
  // BFS (vị trí, nhịp) khi đi một mình.
  const seen = new Set();
  let layer = [{ p: g.start, path: '' }];
  for (let t = 0; t < g.loop; t++) {
    const nextLayer = [];
    for (const s of layer) for (const a of ACTS) {
      const p = C.step(g, [s.p], [a]).next[0];
      const path = s.path + a;
      if (eq(p, g.exit)) return { shadows: [], moves: path, steps: path.length };
      const k = p + '';
      if (seen.has(k)) continue; // đi một mình: trạng thái không phụ thuộc thời gian
      seen.add(k); nextLayer.push({ p, path });
    }
    layer = nextLayer;
  }
  return null;
}

function solve1(g) {
  // Trạng thái: (nhịp, vị trí người vòng 1, đã quay đèn chưa, vị trí bóng ở vòng 2, vị trí người vòng 2).
  const start = { t: 0, a: g.start, end: 0, s: g.start, p: g.start, rec: '', mv: '', cost: 0 };
  const buckets = [[start]];
  const best = new Map();
  for (let c = 0; c < buckets.length; c++) {
    const b = buckets[c]; if (!b) continue;
    for (const st of b) {
      if (st.t >= g.loop) continue;
      const key = [st.t, st.a, st.end, st.s, st.p].join('|');
      if (best.has(key)) continue; best.set(key, 1);
      const recActs = st.end ? ['W'] : ACTS;
      for (const ra of recActs) for (const endNow of (st.end ? [1] : [0, 1])) {
        if (!st.end && endNow && ra !== 'W') continue; // quay đèn = hết ghi, từ đây bóng đứng yên
        const real = endNow ? 'W' : ra;
        const a2 = endNow ? st.a : C.step(g, [st.a], [real]).next[0];
        if (!endNow && eq(a2, g.exit)) continue; // vòng 1 tới đích thì đã thắng một mình
        for (const pa of ACTS) {
          const r = C.step(g, [st.s, st.p], [real, pa]).next;
          const cost = st.cost + 1 + (endNow ? 0 : 1);
          const ns = { t: st.t + 1, a: a2, end: endNow, s: r[0], p: r[1], rec: st.rec + (endNow ? '' : real), mv: st.mv + pa, cost };
          if (eq(r[1], g.exit)) return { shadows: [ns.rec], moves: ns.mv, steps: cost };
          (buckets[cost] = buckets[cost] || []).push(ns);
        }
      }
    }
    buckets[c] = null;
  }
  return null;
}

let bad = 0;
LEVELS.forEach((lv, i) => {
  const g = C.parse(lv);
  const s0 = solve0(g);
  const s1 = lv.maxShadows >= 1 ? solve1(g) : null;
  const sol = s0 || s1;
  const usedShadows = s0 ? 0 : (s1 ? 1 : -1);
  let note = '';
  if (!sol) { note = 'KHÔNG GIẢI ĐƯỢC'; bad++; }
  else {
    if (usedShadows < lv.par.shadows) { note += ' [ít bóng hơn thiết kế]'; bad++; }
    if (usedShadows > lv.par.shadows) { note += ' [cần nhiều bóng hơn par]'; bad++; }
    if (sol.steps !== lv.par.steps) note += ' [par bước nên = ' + sol.steps + ']';
    // tự kiểm lời giải bằng bộ mô phỏng của game
    const sim = C.simulate(g, sol.shadows, sol.moves);
    if (sim.win < 0) { note += ' [MÔ PHỎNG KHÔNG THẮNG]'; bad++; }
  }
  console.log(`${i + 1}. ${lv.name}: bóng=${usedShadows} bước=${sol ? sol.steps : '-'} ${sol ? JSON.stringify(sol.shadows) + ' ' + sol.moves : ''}${note}`);
});
process.exit(bad ? 1 : 0);
