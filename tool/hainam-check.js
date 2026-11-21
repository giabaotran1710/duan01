// Kiểm máy sinh màn Hái nấm: node tool/hainam-check.js [số ngày]
const H = require('../game/hainam-core.js');
const N = +process.argv[2] || 60;
let t0 = Date.now(), worst = 0;
for (let d = 1; d <= N; d++) {
  const s = Date.now();
  const lv = H.level(d);
  const ms = Date.now() - s; worst = Math.max(worst, ms);
  const valid = lv.ms.filter((_, i) => H.staticBreak(lv, i) < 0).length;
  if (d <= 14 || d % 10 === 0) console.log('Ngày ' + d, '| ' + lv.ms.length + ' cây, hợp lệ ' + valid + ', cần hái ' + lv.quota + ', bẫy ' + lv.traps + ', hái ẩu thắng ' + Math.round(lv.luck*100) + '%', '| ' + ms + 'ms');
  if (d <= 14 || d % 10 === 0) lv.rules.forEach(r => console.log('   ' + (r.isNew ? '[mới] ' : '') + H.ruleText(r)));
}
console.log('Xong ' + N + ' ngày trong ' + (Date.now() - t0) + 'ms, chậm nhất ' + worst + 'ms');
