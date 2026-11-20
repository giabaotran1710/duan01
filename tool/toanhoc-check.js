// Kiểm đề Trò chơi toán học: màn nhập môn có lời giải, bậc 1..N sinh được và đúng mức.
// Chạy: node tool/toanhoc-check.js [N]
const C = require('../game/toanhoc-core.js');
const L = require('../game/toanhoc-levels.js');
let bad = 0;
L.forEach((lv, i) => {
  const s = C.solve(lv);
  console.log(`nhập môn ${i + 1} ${lv.name}: ${s.count} lời giải, ${s.results} kết quả, vd ${s.first}`);
  if (s.count < 1) { bad++; console.log('  ✗ KHÔNG CÓ LỜI GIẢI'); }
});
const N = +process.argv[2] || 60;
for (let n = 1; n <= N; n++) {
  const t = Date.now(), lv = C.levelAt(n);
  if (!lv) { bad++; console.log('bậc', n, '✗ không sinh được'); continue; }
  const s = C.solve(lv);
  const slots = C.slotsOf(lv).length;
  const show = (lv.start == null ? '□' : lv.start) + ' ' + lv.steps.map(st => st.op == null ? '[?]' : C.opLabel(st.op) + (st.n == null ? '□' : st.n)).join(' ') + ' = ' + lv.target;
  console.log(`bậc ${n}: ${show} | khay ${lv.tray.join(' ')} | ${slots} ô, ${s.count} lời giải, ${Date.now() - t}ms`);
  if (s.count < 1 || s.count > C.cfgAt(n).maxSols) bad++;
}
console.log(bad ? `✗ ${bad} lỗi` : '✓ ổn');
process.exit(bad ? 1 : 0);
