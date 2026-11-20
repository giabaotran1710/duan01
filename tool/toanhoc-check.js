// Kiểm đề Trò chơi toán học: màn nhập môn có lời giải; đề sinh ra đúng nhãn, có đúng số lời giải, nhanh.
// Chạy: node tool/toanhoc-check.js [số đề mỗi mức]
const C = require('../game/toanhoc-core.js');
const L = require('../game/toanhoc-levels.js');
let bad = 0;
L.forEach((lv, i) => {
  const s = C.solve(lv);
  console.log(`nhập môn ${i + 1} ${lv.name}: ${s.count} lời giải, vd ${s.first}`);
  if (s.count < 1) { bad++; console.log('  ✗ KHÔNG CÓ LỜI GIẢI'); }
});
const N = +process.argv[2] || 100;
const show = lv => (lv.start == null ? '□' : lv.start) + ' ' + lv.steps.map(st => st.op == null ? '[?]' : C.opLabel(st.op) + (st.n == null ? '□' : st.n)).join(' ') + ' = ' + lv.target;
for (const tier of ['de', 'thuong', 'kho']) {
  let tmax = 0, tsum = 0, sc = [], dec = [], trap = 0, near = 0, fail = 0, slots = [];
  for (let i = 1; i <= N; i++) {
    const t = Date.now(), lv = C.generate(tier, i * 7919);
    const dt = Date.now() - t; tmax = Math.max(tmax, dt); tsum += dt;
    if (!lv) { fail++; bad++; continue; }
    const a = C.analyze(lv);
    if (a.sols < 1 || a.sols > C.TIERS[tier].maxSols) { bad++; console.log('✗ số lời giải', a.sols, show(lv)); }
    if (!C.evaluate(lv, lv.sol).win) { bad++; console.log('✗ lv.sol sai'); }
    sc.push(lv.score); dec.push(lv.decoys); slots.push(C.slotsOf(lv).length); if (lv.stats.trap) trap++; near += lv.stats.near;
    if (i <= 3) console.log(`  ${C.TIER_NAME[tier]} #${i}: ${show(lv)} | khay ${lv.tray.join(' ')} | ô ${C.slotsOf(lv).length}, nhiễu ${lv.decoys}, điểm ${lv.score.toFixed(1)}, bẫy ${lv.stats.trap}, sát ${lv.stats.near}`);
  }
  sc.sort((a, b) => a - b);
  console.log(`${C.TIER_NAME[tier]}: ${N} đề, lỗi ${fail}, ô TB ${(slots.reduce((a, b) => a + b, 0) / slots.length).toFixed(1)}, nhiễu TB ${(dec.reduce((a, b) => a + b, 0) / dec.length).toFixed(1)}, điểm ${sc[0].toFixed(1)}..${sc[sc.length - 1].toFixed(1)}, có bẫy ${trap}/${N}, TB ${(tsum / N).toFixed(0)}ms, max ${tmax}ms`);
}
console.log(bad ? `✗ ${bad} lỗi` : '✓ ổn');
process.exit(bad ? 1 : 0);
