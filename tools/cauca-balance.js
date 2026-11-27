/* Bảng cân bằng Năng lực: mỗi cấp nâng tăng bao nhiêu xu mỗi lần thả câu, và mất bao nhiêu lần thả để hoàn vốn.
 * Cách dùng: node tools/cauca-balance.js [vùng] [số lần mô phỏng]
 * Khung giờ, thời tiết, con nước chọn ngẫu nhiên đều nhau; mồi giun; mỗi cấp dùng cùng hạt ngẫu nhiên nên so sánh công bằng. */
'use strict';
var path = require('path');
require(path.join(__dirname, '..', 'game', 'cauca-data.js'));
var CC = globalThis.CC;
var reg = process.argv[2] || 'bien', N = +(process.argv[3] || 60000);
function mulberry32(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function xuPerCast(up) {
  var r = mulberry32(777), m = CC.upMods(up), tot = 0, n = { thuong: 0, hiem: 0, hiemco: 0, rac: 0 };
  for (var i = 0; i < N; i++) {
    var slot = CC.SLOTS[Math.floor(r() * 7)].id, wx = ['nang', 'may', 'mua', 'suong', 'giong'][Math.floor(r() * 5)], tide = ['cuong', 'vua', 'nong'][Math.floor(r() * 3)];
    var e = CC.pick(reg, slot, wx, {}, r, 'giun', tide, m), s = CC.roll(e, r, 'giun', m);
    tot += CC.price(e, s.cm, m); n[e.r]++;
  }
  return { v: tot / N, n: n };
}
var base = xuPerCast({});
console.log('Vùng ' + reg + ', ' + N + ' lần. Gốc: ' + base.v.toFixed(2) + ' xu/lần thả. Nhóm: ' + JSON.stringify(base.n));
var A = 0.7; // tỉ lệ thả ra cá sau khi qua trò kim (ước lượng)
console.log('Giả sử khoảng ' + Math.round(A * 100) + '% lần thả thành công, 1 năng lượng = 1 lần thả.\n');
['kt', 'hiem', 'rac'].forEach(function (id) {
  var U = CC.UPBYID[id], up = {}, prev = base.v, sum = 0;
  console.log('### ' + U.name + '\n| Cấp | Giá nâng | Hiệu quả | Xu/lần thả | Cộng thêm | Hoàn vốn (lần thả) |\n|---:|---:|---|---:|---:|---:|');
  for (var l = 0; l < U.max; l++) {
    var c = U.cost(l); sum += c; up[id] = l + 1;
    var x = xuPerCast(up).v, d = (x - prev) * A;
    console.log('| ' + (l + 1) + ' | ' + c + ' | ' + U.text(U.val(l + 1)) + ' | ' + x.toFixed(2) + ' | +' + (x - prev).toFixed(2) + ' | ' + Math.round(c / Math.max(d, 1e-9)) + ' |');
    prev = x;
  }
  console.log('Tổng giá: ' + sum + ' xu, tăng ' + ((prev / base.v - 1) * 100).toFixed(0) + '% xu mỗi lần thả\n');
});
['nl', 'hoi'].forEach(function (id) {
  var U = CC.UPBYID[id], sum = 0;
  console.log('### ' + U.name + '\n| Cấp | Giá nâng | Hiệu quả | Năng lượng mỗi giờ thật | Tối đa đầy sau |\n|---:|---:|---|---:|---:|');
  for (var l = 0; l < U.max; l++) {
    var c = U.cost(l); sum += c;
    var up = {}; up[id] = l + 1;
    var max = CC.energyMax(up), rg = CC.regenMs(up), per = 3600000 / rg;
    var gain = id === 'hoi' ? (per - 3600000 / CC.regenMs(l ? (function () { var q = {}; q[id] = l; return q; })() : {})) * base.v * A : 0;
    console.log('| ' + (l + 1) + ' | ' + c + ' | ' + U.text(U.val(l + 1)) + ' | ' + per.toFixed(1) + ' | ' + (max * rg / 3600000).toFixed(1) + ' giờ |' + (id === 'hoi' ? ' +' + gain.toFixed(1) + ' xu/giờ, hoàn vốn ' + (c / gain).toFixed(1) + ' giờ |' : ''));
  }
  console.log('Tổng giá: ' + sum + ' xu\n');
});
console.log('Cấp tối đa mọi mục: ' + (function () { var u = {}; CC.UPGRADES.forEach(function (x) { u[x.id] = x.max; }); var x = xuPerCast(u).v; return x.toFixed(2) + ' xu/lần thả (gốc ' + base.v.toFixed(2) + ', ×' + (x / base.v).toFixed(2) + '), năng lượng ' + CC.energyMax(u) + ', hồi 1 mỗi ' + Math.round(CC.regenMs(u) / 1000) + ' giây'; })());
