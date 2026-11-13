// Thử máy sinh màn Tia số: mỗi độ khó sinh N màn, kiểm có lời giải, đo thời gian.
// Chạy: node tool/tiaso-gen-test.js [N]
'use strict';
const G = require('../game/tiaso-gen.js');
const C = require('../game/tiaso-core.js');
const N = +process.argv[2] || 30;
let bad = 0;
for (const d of ['vua', 'kho', 'rkho']) {
  let tot = 0, mx = 0, fail = 0, pars = 0;
  for (let s = 1; s <= N; s++) {
    const t0 = Date.now(); const lv = G.generate(d, s * 7919 + 13); const dt = Date.now() - t0;
    tot += dt; mx = Math.max(mx, dt);
    if (!lv) { fail++; continue; }
    pars += lv.par;
    if (!C.simulate(C.parse(lv), lv.sol).win) { bad++; console.log('KHÔNG GIẢI ĐƯỢC', d, s); }
  }
  console.log(`${d}: ${N - fail}/${N} màn, par TB ${(pars / (N - fail)).toFixed(1)}, TB ${(tot / N) | 0} ms, tối đa ${mx} ms`);
  if (fail) bad++;
}
process.exit(bad ? 1 : 0);
