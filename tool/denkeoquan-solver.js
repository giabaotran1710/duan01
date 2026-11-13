// Kiểm màn Đèn kéo quân: tìm lời giải ít bóng nhất, rồi ít bước nhất (tổng bước mọi vòng).
// Chạy: node tool/denkeoquan-solver.js   (hỗ trợ màn tối đa 1 bóng)
'use strict';
const C = require('../game/denkeoquan-core.js');
const LEVELS = require('../game/denkeoquan-levels.js');

let bad = 0;
LEVELS.forEach((lv, i) => {
  const t0 = Date.now();
  const sol = C.solve(lv);
  const used = sol ? sol.shadows.length : -1;
  let note = '';
  if (!sol) { note = ' KHÔNG GIẢI ĐƯỢC'; bad++; }
  else {
    if (used !== lv.par.shadows) { note += ' [số bóng khác thiết kế: ' + lv.par.shadows + ']'; bad++; }
    if (sol.steps !== lv.par.steps) { note += ' [par bước nên = ' + sol.steps + ']'; bad++; }
    const sim = C.simulate(C.parse(lv), sol.shadows, sol.moves);
    if (sim.win < 0) { note += ' [MÔ PHỎNG KHÔNG THẮNG]'; bad++; }
  }
  console.log(`${i + 1}. ${lv.name}: bóng=${used} bước=${sol ? sol.steps : '-'} ${sol ? JSON.stringify(sol.shadows) + ' ' + sol.moves : ''} (${Date.now() - t0} ms)${note}`);
});
process.exit(bad ? 1 : 0);
