/* Mô phỏng tỉ lệ cắn câu của game Câu cá bằng đúng hàm CC.pick.
 * Cách dùng: node tools/cauca-sim.js [vùng] [khung giờ] [thời tiết] [con nước] [mồi] [số lần] [file dữ liệu]
 * Ví dụ:    node tools/cauca-sim.js ao trua may vua giun 1000
 * In ra bảng xác suất hệ thống tính cho từng loài và kết quả câu thử (hạt ngẫu nhiên cố định nên chạy lại ra y hệt). */
'use strict';
var path = require('path');
var a = process.argv.slice(2);
var reg = a[0] || 'ao', slot = a[1] || 'trua', wx = a[2] || 'may', tide = a[3] || 'vua', bait = a[4] || 'giun';
var N = +(a[5] || 1000), file = a[6] || path.join(__dirname, '..', 'game', 'cauca-data.js');
delete globalThis.CC;
require(path.resolve(file));
var CC = globalThis.CC;

function mulberry32(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* Xác suất chính xác: tìm ngưỡng của từng loài bằng cách quét rnd() từ 0 tới 1. */
var prob = {}, STEPS = 200000;
for (var i = 0; i < STEPS; i++) {
  var v = (i + 0.5) / STEPS, e = CC.pick(reg, slot, wx, null, function () { return v; }, bait, tide);
  prob[e.id] = (prob[e.id] || 0) + 1 / STEPS;
}
var rnd = mulberry32(20261127), got = {};
for (var k = 0; k < N; k++) { var f = CC.pick(reg, slot, wx, null, rnd, bait, tide); got[f.id] = (got[f.id] || 0) + 1; }

var order = { thuong: 0, hiem: 1, hiemco: 2, rac: 3 };
var list = CC.ALL.filter(function (e) { return e.r === 'rac' ? e.reg.indexOf(reg) >= 0 : (e.reg === reg || e.also.indexOf(reg) >= 0); });
list.sort(function (x, y) { return order[x.r] - order[y.r] || (prob[y.id] || 0) - (prob[x.id] || 0); });
function cond(e) {
  var s = [];
  if (e.t) s = s.concat(e.t.map(function (t) { return CC.SLOTS.filter(function (z) { return z.id === t; })[0].name; }));
  if (e.w) s = s.concat(e.w.map(function (w) { return CC.WEATHER[w].name; }));
  if (e.d) s.push(CC.DAYNIGHT[e.d].name);
  if (e.n) s.push(CC.TIDES[e.n].name);
  return s.join(' + ') || '-';
}
var R = CC.REGIONS.filter(function (r) { return r.id === reg; })[0];
console.log('## ' + R.name + ' · ' + CC.SLOTS.filter(function (z) { return z.id === slot; })[0].name + ' · ' + CC.WEATHER[wx].name + ' · ' + CC.TIDES[tide].name + ' · mồi ' + CC.BAITS[bait].name + ' · ' + N + ' lần');
console.log('| Loài | Độ hiếm | Điều kiện | Xác suất | Câu được |');
console.log('|---|---|---|---:|---:|');
var sum = {};
list.forEach(function (e) {
  var p = prob[e.id] || 0, n = got[e.id] || 0;
  sum[e.r] = sum[e.r] || { p: 0, n: 0, kinds: 0 };
  sum[e.r].p += p; sum[e.r].n += n; if (n) sum[e.r].kinds++;
  console.log('| ' + e.name + ' | ' + CC.RARITY[e.r].name + ' | ' + (e.r === 'rac' ? '-' : cond(e)) + ' | ' + (p * 100).toFixed(2) + '% | ' + n + ' |');
});
console.log('\n| Nhóm | Tổng xác suất | Câu được | Số loài câu được |');
console.log('|---|---:|---:|---:|');
['thuong', 'hiem', 'hiemco', 'rac'].forEach(function (r) {
  var s = sum[r] || { p: 0, n: 0, kinds: 0 };
  console.log('| ' + CC.RARITY[r].name + ' | ' + (s.p * 100).toFixed(2) + '% | ' + s.n + ' | ' + s.kinds + ' |');
});
