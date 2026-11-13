// Kiểm màn Tia số: mỗi màn phải giải được và par đúng bằng số ô ít nhất.
// Chạy: node tool/tiaso-solver.js
'use strict';
const C = require('../game/tiaso-core.js');
const LEVELS = require('../game/tiaso-levels.js');
let bad = 0;
LEVELS.forEach((lv, n) => {
  const B = C.parse(lv);
  const r = C.solve(B, { limit: 50 });
  let note = '';
  if (r.best < 0) { note = ' KHÔNG GIẢI ĐƯỢC'; bad++; }
  else if (r.best !== lv.par) { note = ' [par nên = ' + r.best + ']'; bad++; }
  const show = r.sols.slice(0, 4).map(s => Object.entries(s).map(([i, t]) => `${i % B.W},${(i / B.W) | 0}=${t}`).join(' ')).join(' | ');
  console.log(`${n + 1}. ${lv.name}: ít nhất ${r.best} ô, ${r.sols.length} cách (${r.nodes} nút)${note}\n   ${show}`);
});
process.exit(bad ? 1 : 0);
