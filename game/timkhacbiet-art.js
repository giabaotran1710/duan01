/* Tìm điểm khác biệt — phần vẽ: các loại vật thể (vẽ bằng canvas 2D) và 10 phông nền chủ đề.
   Mọi chi tiết "ngẫu nhiên" của vật thể đều lấy từ hạt giống riêng của vật đó (o.k) nên ảnh A và ảnh B luôn vẽ giống hệt nhau,
   trừ đúng những chỗ khác biệt. Toạ độ vật thể: gốc (0,0) ở giữa vật, kích thước w × h ở tỉ lệ 1. */
(function (root) {
  'use strict';
  var TAU = Math.PI * 2, W = 800, H = 600;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hsl(h, s, l, a) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100); l = clamp(l, 0, 100);
    return a == null ? 'hsl(' + h.toFixed(1) + ',' + s.toFixed(1) + '%,' + l.toFixed(1) + '%)'
                     : 'hsla(' + h.toFixed(1) + ',' + s.toFixed(1) + '%,' + l.toFixed(1) + '%,' + a + ')';
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- hàm vẽ nhỏ ---------- */
  var OL = 'rgba(25,15,40,.4)';
  function fs(g, fill, lw) {
    g.fillStyle = fill; g.fill();
    if (lw !== 0) { g.lineWidth = lw || 2; g.strokeStyle = OL; g.lineJoin = 'round'; g.stroke(); }
  }
  function circ(g, x, y, r, fill, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); fs(g, fill, lw); }
  function ell(g, x, y, rx, ry, fill, lw, rot) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); fs(g, fill, lw); }
  function poly(g, p, fill, lw) {
    g.beginPath(); g.moveTo(p[0], p[1]);
    for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath(); fs(g, fill, lw);
  }
  function rrect(g, x, y, w, h, r, fill, lw) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath(); fs(g, fill, lw);
  }
  function line(g, x1, y1, x2, y2, w, col) {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
    g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.stroke();
  }
  function arc(g, x, y, r, a0, a1, w, col) {
    g.beginPath(); g.arc(x, y, r, a0, a1); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.stroke();
  }
  /* nhiều hình tròn/elip hợp lại thành một khối, chỉ viền phần ngoài */
  function blob(g, L, fill) {
    var i, s;
    g.lineJoin = 'round'; g.strokeStyle = OL; g.lineWidth = 4;
    for (i = 0; i < L.length; i++) { s = L[i]; g.beginPath(); g.ellipse(s[0], s[1], s[2], s[3] || s[2], 0, 0, TAU); g.stroke(); }
    g.fillStyle = fill;
    for (i = 0; i < L.length; i++) { s = L[i]; g.beginPath(); g.ellipse(s[0], s[1], s[2], s[3] || s[2], 0, 0, TAU); g.fill(); }
  }
  function star(g, n, ro, ri, fill, lw, rot) {
    var i, a, r;
    g.beginPath();
    for (i = 0; i < n * 2; i++) {
      a = (rot == null ? -Math.PI / 2 : rot) + i * Math.PI / n; r = i % 2 ? ri : ro;
      g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); fs(g, fill, lw);
  }
  function glow(g, x, y, r, col) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  function pick(r, a) { return a[Math.floor(r() * a.length) % a.length]; }

  /* ---------- các loại vật thể ----------
     w,h: kích thước ở tỉ lệ 1; zone: vùng mặc định; hue:[a,b] sat lit: màu chủ đạo; vmax: số biến thể;
     asym: lật ngang nhìn thấy được; max: số lượng tối đa mỗi ảnh; low: màu nhạt/xám (đổi màu bằng độ sáng) */
  var T = {};
  function def(name, o) { o.name = name; T[name] = o; }

  /* ===== trên trời ===== */
  def('sun', { w: 84, h: 84, zone: 'sky', hue: [40, 50], sat: 96, lit: 56, vmax: 3, max: 1, draw: function (g, o, c) {
    var n = o.v === 1 ? 12 : 8, i;
    for (i = 0; i < n; i++) { g.save(); g.rotate(i * TAU / n); poly(g, [-4.5, -29, 4.5, -29, 0, -41], c(0, 0, 6), 1.5); g.restore(); }
    circ(g, 0, 0, 25, c(), 2); circ(g, -7, -8, 8, c(0, -8, 20, .55), 0);
    if (o.v === 2) {
      circ(g, -8, -3, 2.6, '#5a3b00', 0); circ(g, 8, -3, 2.6, '#5a3b00', 0);
      arc(g, 0, 3, 9, .15 * Math.PI, .85 * Math.PI, 2.4, '#5a3b00');
    }
  } });
  def('cloud', { w: 112, h: 74, zone: 'sky', hue: [195, 215], sat: 55, lit: 93, vmax: 2, low: true, draw: function (g, o, c) {
    blob(g, [[-30, 8, 18], [-8, -4, 24], [22, 0, 21], [44, 10, 13], [2, 14, 44, 12]], c());
    if (o.v === 1) for (var i = -1; i <= 1; i++) { line(g, i * 22 - 3, 30, i * 22 - 8, 40, 3, '#4aa3ff'); }
  } });
  def('bird', { w: 56, h: 40, zone: 'sky', hue: [0, 360], sat: 70, lit: 55, vmax: 2, asym: true, draw: function (g, o, c) {
    poly(g, [-16, 0, -31, -8, -29, 6], c(0, 0, -8));
    ell(g, 0, 2, 19, 13, c()); circ(g, 15, -7, 9, c(0, 0, 4)); poly(g, [22, -9, 32, -5, 22, -2], '#ff9d2e', 1.5);
    circ(g, 17, -9, 2, '#222', 0);
    if (o.v === 1) poly(g, [-10, 0, 2, -22, 10, 0], c(0, 0, -14)); else ell(g, -3, 7, 12, 6, c(0, 0, -14), 2, .5);
  } });
  def('balloon', { w: 62, h: 98, zone: 'sky', hue: [0, 360], sat: 80, lit: 55, vmax: 3, draw: function (g, o, c) {
    var env = function () { g.beginPath(); g.ellipse(0, -16, 28, 34, 0, 0, TAU); };
    line(g, -9, 30, -7, 38, 1.5, '#6b4a2b'); line(g, 9, 30, 7, 38, 1.5, '#6b4a2b');
    rrect(g, -10, 37, 20, 13, 3, '#b07a3c');
    env(); fs(g, c(), 2);
    g.save(); env(); g.clip();
    if (o.v === 0) { ell(g, 0, -16, 10, 36, c(40, 0, 18), 0); }
    else if (o.v === 1) { var i, j; for (i = -1; i <= 1; i++) for (j = -2; j <= 1; j++) circ(g, i * 15, j * 15 - 6, 4, c(40, -10, 24), 0); }
    else { rrect(g, -34, -22, 68, 12, 0, c(40, 0, 22), 0); }
    g.restore();
    poly(g, [-9, 26, 9, 26, 5, 31, -5, 31], c(0, 0, -15), 1.5);
    circ(g, -9, -30, 6, 'rgba(255,255,255,.4)', 0);
  } });
  def('star', { w: 54, h: 54, zone: 'sky', hue: [40, 55], sat: 95, lit: 58, vmax: 3, draw: function (g, o, c) {
    glow(g, 0, 0, 26, c(0, 0, 20, .5));
    star(g, [5, 4, 6][o.v], 24, [5, 4, 6][o.v] === 4 ? 7 : 11, c(), 2);
  } });
  def('plane', { w: 100, h: 46, zone: 'sky', hue: [0, 360], sat: 65, lit: 55, vmax: 3, asym: true, draw: function (g, o, c) {
    poly(g, [-34, -3, -46, -20, -30, -20, -14, -3], c(0, 0, -10));
    ell(g, 0, 0, 42, 11, '#f3f6fb'); poly(g, [-6, 4, 14, 4, -12, 20, -22, 20], c(0, 0, -6));
    for (var i = 0; i < 4; i++) circ(g, -14 + i * 9, -2, 2.6, '#6fa8dc', 0);
    ell(g, 34, -2, 9, 6, '#6fa8dc', 1.5);
    if (o.v === 1) rrect(g, -38, 4, 78, 3.5, 1, c(), 0);
    if (o.v === 2) { line(g, 41, 0, 47, 0, 3, '#444'); line(g, 47, -11, 47, 11, 3, '#444'); }
  } });
  def('kite', { w: 54, h: 90, zone: 'sky', hue: [0, 360], sat: 80, lit: 58, vmax: 3, draw: function (g, o, c) {
    var n = o.v + 2, i;
    g.beginPath(); g.moveTo(0, 24); g.bezierCurveTo(-10, 30, 8, 36, -2, 44); g.lineWidth = 1.8; g.strokeStyle = '#5b4636'; g.stroke();
    for (i = 0; i < n; i++) { var t = (i + 1) / (n + 1); poly(g, [-2 + (t - .5) * 6 - 4, 26 + t * 16, -2 + (t - .5) * 6 + 4, 26 + t * 16 + 3, -2 + (t - .5) * 6 - 4, 26 + t * 16 + 6], c(150, 0, 0), 1); }
    poly(g, [0, -42, 24, -8, 0, 24], c()); poly(g, [0, -42, -24, -8, 0, 24], c(40, 0, 12));
    line(g, 0, -42, 0, 24, 1.6, OL); line(g, -24, -8, 24, -8, 1.6, OL);
  } });
  def('butterfly', { w: 54, h: 44, zone: 'sky', hue: [0, 360], sat: 75, lit: 62, vmax: 3, draw: function (g, o, c) {
    ell(g, -14, -8, 14, 12, c(), 2, -.5); ell(g, 14, -8, 14, 12, c(), 2, .5);
    ell(g, -11, 10, 10, 9, c(30, 0, 8), 2, .4); ell(g, 11, 10, 10, 9, c(30, 0, 8), 2, -.4);
    if (o.v >= 1) { circ(g, -15, -9, 4, '#fff', 0); circ(g, 15, -9, 4, '#fff', 0); }
    if (o.v === 2) { circ(g, -11, 11, 3, '#fff', 0); circ(g, 11, 11, 3, '#fff', 0); }
    rrect(g, -2.5, -14, 5, 28, 2.5, '#3a2a28', 0);
    arc(g, -3, -14, 7, Math.PI * 1.1, Math.PI * 1.7, 1.6, '#3a2a28'); arc(g, 3, -14, 7, Math.PI * 1.3, Math.PI * 1.9, 1.6, '#3a2a28');
  } });
  def('rainbow', { w: 160, h: 84, zone: 'sky', hue: [0, 360], sat: 80, lit: 58, vmax: 3, draw: function (g, o, c) {
    var n = [7, 6, 5][o.v], i;
    g.lineCap = 'butt';
    for (i = 0; i < n; i++) arc(g, 0, 40, 72 - i * 9, Math.PI, 0, 9.5, c(i * (300 / n), 0, 0));
    g.lineCap = 'round';
  } });

  /* ===== trên mặt đất ===== */
  def('tree', { w: 86, h: 118, zone: 'ground', hue: [95, 140], sat: 52, lit: 42, vmax: 3, draw: function (g, o, c, r) {
    var i, p;
    rrect(g, -7, 22, 14, 36, 3, '#7b4f2a'); rrect(g, -7, 22, 5, 36, 2, 'rgba(255,255,255,.12)', 0);
    blob(g, [[0, -18, 33], [-22, 0, 24], [22, 2, 24], [0, 10, 28]], c());
    circ(g, -10, -26, 9, c(0, 0, 10, .5), 0);
    if (o.v === 1) for (i = 0; i < 6; i++) { circ(g, -26 + r() * 52, -30 + r() * 52, 4.2, '#e5392e', 1.5); }
    if (o.v === 2) for (i = 0; i < 8; i++) { p = [-28 + r() * 56, -34 + r() * 56]; circ(g, p[0], p[1], 3.6, '#ffe3ee', 0); }
  } });
  function pineShape(g, o, c, snow, r) {
    var tiers = [[-60, -22, 22], [-42, 4, 30], [-20, 32, 38]], i, t;
    rrect(g, -6, 30, 12, 28, 2, '#7a4a24');
    for (i = 0; i < 3; i++) { t = tiers[i]; poly(g, [0, t[0], -t[2], t[1], t[2], t[1]], c(0, 0, i * 3)); }
    if (snow) for (i = 0; i < 3; i++) { t = tiers[i]; var y = t[0] + (t[1] - t[0]) * .5, x = t[2] * .5; poly(g, [0, t[0], -x, y, -x * .4, y + 4, 0, y - 1, x * .4, y + 4, x, y], '#f7fbff', 1.2); }
    if (o.v === 1) { var cs = ['#ff5252', '#ffd23f', '#52a7ff', '#ff8cf0', '#ffd23f', '#ff5252']; for (i = 0; i < 6; i++) circ(g, -26 + i * 10.5 + (i % 2) * 2, [-8, 6, -4, 16, 24, 24][i] + (i === 5 ? 4 : 0), 3.6, cs[i], 1); }
  }
  def('pine', { w: 76, h: 124, zone: 'ground', hue: [130, 160], sat: 45, lit: 32, vmax: 3, draw: function (g, o, c, r) {
    var oo = { v: o.v === 2 ? 0 : o.v }; pineShape(g, oo, c, false, r);
    if (o.v === 2) { g.save(); g.translate(0, -62); star(g, 5, 9, 4, '#ffd23f', 1.5); g.restore(); }
  } });
  def('bush', { w: 76, h: 48, zone: 'ground', hue: [105, 150], sat: 50, lit: 40, vmax: 3, draw: function (g, o, c, r) {
    blob(g, [[-22, 4, 16], [0, -4, 20], [22, 4, 16], [0, 8, 28, 13]], c());
    var i, p; if (o.v === 1) for (i = 0; i < 6; i++) { p = [-28 + r() * 56, -12 + r() * 28]; circ(g, p[0], p[1], 3.5, '#d62f45', 1.2); }
    if (o.v === 2) for (i = 0; i < 5; i++) { p = [-28 + r() * 56, -12 + r() * 26]; circ(g, p[0], p[1], 4, '#ffd23f', 1.2); circ(g, p[0], p[1], 1.5, '#fff', 0); }
  } });
  def('flower', { w: 42, h: 78, zone: 'ground', hue: [0, 360], sat: 85, lit: 60, vmax: 3, draw: function (g, o, c) {
    var n = [6, 8, 5][o.v], i;
    line(g, 0, -4, 0, 36, 3.4, '#3f8f3a'); ell(g, -9, 20, 9, 4, '#4fae48', 1.5, -.5); ell(g, 9, 28, 9, 4, '#4fae48', 1.5, .5);
    for (i = 0; i < n; i++) { g.save(); g.translate(0, -18); g.rotate(i * TAU / n); ell(g, 0, -11, 6.5, 11, c(), 1.5); g.restore(); }
    circ(g, 0, -18, 7, '#ffd23f', 1.5);
  } });
  def('house', { w: 114, h: 112, zone: 'ground', hue: [0, 360], sat: 55, lit: 72, vmax: 3, asym: true, draw: function (g, o, c) {
    rrect(g, 20, -40, 14, 30, 2, '#9c5a43');
    rrect(g, -40, 0, 80, 54, 3, c());
    poly(g, [-52, 4, 0, -52, 52, 4], c(180, 10, -28));
    rrect(g, -9, 24, 18, 30, 3, '#7a4a2a'); circ(g, 4, 40, 1.6, '#ffd23f', 0);
    var win = function (x, y, s) { rrect(g, x, y, s, s, 2, '#bfe6ff'); line(g, x + s / 2, y, x + s / 2, y + s, 1.5, '#fff'); line(g, x, y + s / 2, x + s, y + s / 2, 1.5, '#fff'); };
    if (o.v === 0) win(-33, 12, 18);
    else if (o.v === 1) { win(-34, 12, 16); win(18, 12, 16); }
    else { circ(g, 0, -14, 8, '#bfe6ff', 2); win(18, 14, 16); }
  } });
  def('fence', { w: 114, h: 52, zone: 'ground', hue: [25, 40], sat: 55, lit: 62, vmax: 3, draw: function (g, o, c) {
    var n = [5, 4, 6][o.v], i, x;
    rrect(g, -54, -8, 108, 7, 2, c(0, 0, -8)); rrect(g, -54, 10, 108, 7, 2, c(0, 0, -8));
    for (i = 0; i < n; i++) { x = -48 + i * (96 / (n - 1)); poly(g, [x - 6, 24, x - 6, -14, x, -22, x + 6, -14, x + 6, 24], c()); }
  } });
  def('sheep', { w: 74, h: 58, zone: 'ground', hue: [0, 360], sat: 50, lit: 90, vmax: 3, asym: true, low: true, draw: function (g, o, c) {
    line(g, -14, 14, -14, 26, 5, '#3c3340'); line(g, 4, 14, 4, 26, 5, '#3c3340'); line(g, 16, 14, 16, 26, 5, '#3c3340'); line(g, -26, 12, -26, 26, 5, '#3c3340');
    blob(g, [[-18, -2, 16], [0, -10, 18], [18, -2, 16], [-4, 8, 17], [12, 8, 15]], c());
    ell(g, 28, 0, 10, 12, '#3c3340'); ell(g, 21, -9, 4, 6, '#3c3340', 1.5, .5); circ(g, 31, -3, 1.8, '#fff', 0);
    if (o.v === 1) circ(g, 23, 14, 4, '#ffd23f', 1.5);
    if (o.v === 2) { poly(g, [20, -14, 28, -9, 28, -19], '#ff6fa5', 1.2); poly(g, [20, -14, 12, -19, 12, -9], '#ff6fa5', 1.2); }
  } });
  def('windmill', { w: 92, h: 136, zone: 'ground', hue: [0, 360], sat: 55, lit: 62, vmax: 3, draw: function (g, o, c) {
    var i, a = [.2, .55, .9][o.v];
    poly(g, [-19, 66, 19, 66, 11, -14, -11, -14], c()); poly(g, [-14, -12, 0, -34, 14, -12], c(180, 10, -26));
    rrect(g, -6, 44, 12, 22, 2, '#7a4a2a'); rrect(g, -4, 14, 8, 10, 1, '#bfe6ff');
    for (i = 0; i < 4; i++) {
      g.save(); g.translate(0, -22); g.rotate(a + i * Math.PI / 2);
      rrect(g, -2.5, -44, 5, 44, 1, '#8a5a30'); poly(g, [3, -42, 17, -42, 17, -12, 3, -12], 'rgba(255,255,255,.9)', 1.5);
      g.restore();
    }
    circ(g, 0, -22, 5, '#8a5a30');
  } });
  def('rock', { w: 62, h: 44, zone: 'ground', hue: [200, 260], sat: 12, lit: 62, vmax: 3, low: true, draw: function (g, o, c) {
    poly(g, [-28, 18, -22, -8, -6, -20, 14, -16, 28, 2, 26, 18], c());
    poly(g, [-6, -20, 14, -16, 28, 2, 6, -2], c(0, 0, 10), 0);
    if (o.v === 1) blob(g, [[-14, -4, 8, 5], [-4, -12, 7, 4]], '#6fbf4a');
    if (o.v === 2) poly(g, [-34, 20, -30, 8, -22, 4, -18, 20], c(0, 0, -8));
  } });
  def('mushroom', { w: 48, h: 54, zone: 'ground', hue: [0, 20], sat: 75, lit: 50, vmax: 3, draw: function (g, o, c) {
    rrect(g, -8, -2, 16, 28, 5, '#f6e7cf'); g.beginPath(); g.moveTo(-24, 4); g.bezierCurveTo(-24, -34, 24, -34, 24, 4); g.closePath(); fs(g, c());
    var sp = [[-10, -12, 4], [8, -16, 4], [2, -4, 3], [14, -4, 3]]; for (var i = 0; i < o.v + 2 && i < 4; i++) circ(g, sp[i][0], sp[i][1], sp[i][2], '#fff', 0);
  } });
  def('lamp', { w: 34, h: 114, zone: 'ground', hue: [40, 50], sat: 90, lit: 62, vmax: 2, draw: function (g, o, c) {
    rrect(g, -3, -34, 6, 90, 2, '#3b4252'); rrect(g, -9, 52, 18, 6, 2, '#3b4252');
    if (o.v === 0) glow(g, 0, -42, 30, c(0, 0, 10, .55));
    rrect(g, -9, -56, 18, 24, 5, o.v === 0 ? c() : '#8b93a1'); poly(g, [-12, -56, 12, -56, 0, -66], '#3b4252');
  } });
  def('snail', { w: 54, h: 42, zone: 'ground', hue: [0, 360], sat: 60, lit: 62, vmax: 2, asym: true, draw: function (g, o, c) {
    ell(g, 2, 14, 24, 6, '#d9c9a8'); ell(g, 22, 6, 8, 10, '#d9c9a8'); line(g, 22, -2, 20, -12, 2, '#a99877'); line(g, 26, -2, 29, -11, 2, '#a99877');
    circ(g, 20, -12, 2, '#222', 0); circ(g, 29, -11, 2, '#222', 0);
    circ(g, -4, 0, 17, c()); if (o.v === 0) { arc(g, -4, 0, 10, 0, TAU * .85, 2.4, c(0, 0, -18)); arc(g, -4, 0, 4.5, 0, TAU * .8, 2.2, c(0, 0, -18)); }
    else { arc(g, -4, 0, 12, -2, 2, 3, c(40, 0, 14)); arc(g, -4, 0, 6, -2, 2, 3, c(40, 0, 14)); }
  } });
  def('owl', { w: 54, h: 68, zone: 'ground', hue: [20, 40], sat: 40, lit: 45, vmax: 3, draw: function (g, o, c) {
    poly(g, [-18, -22, -12, -34, -6, -24], c(0, 0, -8)); poly(g, [18, -22, 12, -34, 6, -24], c(0, 0, -8));
    ell(g, 0, 4, 22, 28, c()); ell(g, 0, 12, 13, 17, c(0, -10, 22), 0);
    line(g, -8, 30, -8, 34, 3, '#e69a2c'); line(g, 8, 30, 8, 34, 3, '#e69a2c');
    if (o.v === 1) { arc(g, -9, -8, 6, .15, Math.PI - .15, 2.4, '#2a1d14'); arc(g, 9, -8, 6, .15, Math.PI - .15, 2.4, '#2a1d14'); }
    else { circ(g, -9, -8, 8, '#fff', 1.5); circ(g, 9, -8, 8, '#fff', 1.5); circ(g, -9, -8, 3.4, '#222', 0); circ(g, 9, -8, 3.4, '#222', 0);
      if (o.v === 2) { circ(g, -9, -8, 10, 'rgba(0,0,0,0)', 2.6); circ(g, 9, -8, 10, 'rgba(0,0,0,0)', 2.6); } }
    poly(g, [-4, -2, 4, -2, 0, 5], '#e69a2c', 1.5);
  } });
  def('bunny', { w: 50, h: 70, zone: 'ground', hue: [0, 360], sat: 20, lit: 88, vmax: 3, low: true, draw: function (g, o, c) {
    var down = o.v === 2;
    if (down) { ell(g, -13, -14, 5, 15, c(0, 0, -6), 2, 1.2); ell(g, 13, -14, 5, 15, c(0, 0, -6), 2, -1.2); }
    else { ell(g, -9, -26, 5.5, 17, c(0, 0, -4)); ell(g, 9, -26, 5.5, 17, c(0, 0, -4)); ell(g, -9, -26, 2.4, 11, '#ffc4d4', 0); ell(g, 9, -26, 2.4, 11, '#ffc4d4', 0); }
    ell(g, 0, 18, 19, 20, c()); circ(g, 0, -4, 15, c()); circ(g, -5, -6, 2, '#222', 0); circ(g, 5, -6, 2, '#222', 0); circ(g, 0, -1, 2.2, '#ff8fa8', 0);
    if (o.v === 1) { poly(g, [14, 8, 30, 12, 16, 24], '#ff8a2e', 1.5); poly(g, [14, 8, 20, 2, 24, 6], '#4fae48', 1.2); }
  } });

  /* ===== bãi biển ===== */
  def('umbrella', { w: 98, h: 98, zone: 'ground', hue: [0, 360], sat: 80, lit: 56, vmax: 3, draw: function (g, o, c) {
    var i, n = 6;
    rrect(g, -2.5, -10, 5, 58, 2, '#8b6b4a');
    g.save(); g.beginPath(); g.moveTo(-46, 0); g.bezierCurveTo(-46, -50, 46, -50, 46, 0); g.closePath(); g.clip();
    g.fillStyle = c(); g.fillRect(-48, -52, 96, 54);
    for (i = 0; i < n; i++) if (i % 2 === 0) { poly(g, [0, 6, -46 + i * 15.3, 4, -46 + (i + 1) * 15.3, 4], o.v === 1 ? c(0, 0, -16) : '#fff', 0); }
    if (o.v === 2) for (i = 0; i < 7; i++) circ(g, -34 + i * 11, -14 + (i % 2) * 10, 3.2, '#fff', 0);
    g.restore();
    g.beginPath(); g.moveTo(-46, 0); g.bezierCurveTo(-46, -50, 46, -50, 46, 0); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    for (i = 0; i < 4; i++) arc(g, -34.5 + i * 23, 0, 11.5, 0, Math.PI, 2, OL);
  } });
  def('sailboat', { w: 98, h: 96, zone: 'sea', hue: [0, 360], sat: 70, lit: 52, vmax: 3, asym: true, draw: function (g, o, c) {
    poly(g, [-38, 24, 38, 24, 26, 42, -26, 42], c());
    line(g, 0, -44, 0, 24, 3, '#5b4636');
    if (o.v !== 1) poly(g, [-4, -38, -4, 18, -32, 18], '#fff7e6', 1.5);
    poly(g, [4, -44, 4, 18, 34, 18], '#fff', 1.5);
    poly(g, [0, -44, 14, -39, 0, -34], o.v === 1 ? '#ff5252' : c(150, 0, 0), 1);
    if (o.v === 2) { circ(g, -12, 33, 3.4, '#bfe6ff', 1.2); circ(g, 0, 33, 3.4, '#bfe6ff', 1.2); circ(g, 12, 33, 3.4, '#bfe6ff', 1.2); }
    arc(g, -22, 46, 10, Math.PI, 0, 2.5, 'rgba(255,255,255,.8)'); arc(g, 6, 46, 10, Math.PI, 0, 2.5, 'rgba(255,255,255,.8)');
  } });
  def('palm', { w: 98, h: 138, zone: 'ground', hue: [110, 140], sat: 55, lit: 40, vmax: 3, asym: true, draw: function (g, o, c) {
    var i;
    g.beginPath(); g.moveTo(-8, 66); g.bezierCurveTo(-4, 20, 6, -10, 16, -40); g.lineTo(26, -36); g.bezierCurveTo(14, -8, 8, 22, 10, 66); g.closePath(); fs(g, '#a9774a');
    for (i = 0; i < 6; i++) { g.save(); g.translate(20, -42); g.rotate(-2.5 + i * .55); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(14, -18, 40, -22, 52, 2); g.bezierCurveTo(36, -8, 14, -6, 0, 0); fs(g, c(0, 0, i % 2 ? 4 : -4), 1.6); g.restore(); }
    if (o.v !== 1) { circ(g, 14, -36, 6, '#6b4a2b'); circ(g, 26, -34, 6, '#6b4a2b'); }
    if (o.v === 2) circ(g, 20, -28, 6, '#6b4a2b');
  } });
  def('crab', { w: 66, h: 46, zone: 'ground', hue: [0, 12], sat: 80, lit: 52, vmax: 2, draw: function (g, o, c) {
    var i, up = o.v === 0;
    for (i = 0; i < 3; i++) { line(g, -16, 6 + i * 5, -30, 12 + i * 5, 3, c(0, 0, -12)); line(g, 16, 6 + i * 5, 30, 12 + i * 5, 3, c(0, 0, -12)); }
    ell(g, 0, 8, 22, 15, c());
    line(g, -14, -2, -26, up ? -12 : 4, 4, c(0, 0, -8)); line(g, 14, -2, 26, up ? -12 : 4, 4, c(0, 0, -8));
    circ(g, -28, up ? -16 : 8, 8, c()); circ(g, 28, up ? -16 : 8, 8, c());
    line(g, -6, -4, -6, -12, 2.4, c(0, 0, -12)); line(g, 6, -4, 6, -12, 2.4, c(0, 0, -12)); circ(g, -6, -14, 3.6, '#fff'); circ(g, 6, -14, 3.6, '#fff'); circ(g, -6, -14, 1.6, '#222', 0); circ(g, 6, -14, 1.6, '#222', 0);
  } });
  def('starfish', { w: 50, h: 50, zone: 'ground', hue: [10, 40], sat: 85, lit: 58, vmax: 2, draw: function (g, o, c) {
    star(g, 5, 23, 9, c(), 2.2);
    if (o.v === 0) for (var i = 0; i < 5; i++) circ(g, Math.cos(-Math.PI / 2 + i * TAU / 5) * 13, Math.sin(-Math.PI / 2 + i * TAU / 5) * 13, 2.2, c(0, 0, 18), 0);
  } });
  def('beachball', { w: 50, h: 50, zone: 'ground', hue: [0, 360], sat: 80, lit: 56, vmax: 3, draw: function (g, o, c) {
    var i, a = o.v * .5;
    g.save(); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.clip(); g.fillStyle = '#fff'; g.fillRect(-24, -24, 48, 48);
    for (i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30, a + i * TAU / 6, a + (i + 1) * TAU / 6); g.closePath(); g.fillStyle = i % 2 ? c(0, 0, 0) : c(150, 0, 0); if (i % 3) g.fill(); }
    g.restore(); circ(g, 0, 0, 22, 'rgba(0,0,0,0)', 2); circ(g, 0, 0, 4, '#fff', 1.5); circ(g, -8, -9, 5, 'rgba(255,255,255,.55)', 0);
  } });
  def('lighthouse', { w: 54, h: 138, zone: 'ground', hue: [0, 360], sat: 75, lit: 55, vmax: 3, draw: function (g, o, c) {
    var n = o.v + 2, i, ya = -34, yb = 64, ht = (yb - ya) / n;
    g.save(); g.beginPath(); g.moveTo(-18, yb); g.lineTo(18, yb); g.lineTo(11, ya); g.lineTo(-11, ya); g.closePath(); g.clip();
    for (i = 0; i < n; i++) { g.fillStyle = i % 2 ? '#fff' : c(); g.fillRect(-20, ya + i * ht, 40, ht + 1); }
    g.restore(); poly(g, [-18, yb, 18, yb, 11, ya, -11, ya], 'rgba(0,0,0,0)', 2);
    rrect(g, -16, -42, 32, 8, 2, '#3b4252'); rrect(g, -9, -64, 18, 22, 3, '#ffe27a'); poly(g, [-12, -64, 12, -64, 0, -76], c(0, 0, -12));
    glow(g, 0, -53, 26, 'rgba(255,240,150,.45)'); rrect(g, -4, 40, 8, 24, 2, '#7a4a2a', 1.5);
  } });
  def('sandcastle', { w: 78, h: 60, zone: 'ground', hue: [38, 44], sat: 60, lit: 68, vmax: 3, draw: function (g, o, c) {
    var ts = o.v === 1 ? [[-24, 14], [24, 14]] : o.v === 2 ? [[-26, 12], [0, 20], [26, 12]] : [[0, 20]];
    rrect(g, -34, 6, 68, 24, 3, c());
    for (var i = 0; i < ts.length; i++) { rrect(g, ts[i][0] - 9, -ts[i][1], 18, ts[i][1] + 30, 2, c(0, 0, 4)); for (var k = -1; k <= 1; k++) rrect(g, ts[i][0] + k * 6 - 2.5, -ts[i][1] - 6, 5, 7, 1, c(0, 0, 4), 1); }
    line(g, 0, -26, 0, -38, 2, '#8b6b4a'); poly(g, [0, -38, 12, -34, 0, -30], '#ff5252', 1);
    rrect(g, -5, 14, 10, 16, 4, c(0, 0, -16), 1.2);
  } });

  /* ===== dưới biển ===== */
  def('fish', { w: 74, h: 48, zone: 'water', hue: [0, 360], sat: 80, lit: 58, vmax: 3, asym: true, draw: function (g, o, c) {
    poly(g, [-22, 0, -40, -16, -36, 0, -40, 16], c(0, 0, -10));
    poly(g, [-4, -16, 6, -26, 14, -14], c(0, 0, -10));
    ell(g, 0, 0, 28, 17, c());
    if (o.v === 1) { g.save(); g.beginPath(); g.ellipse(0, 0, 28, 17, 0, 0, TAU); g.clip(); g.fillStyle = c(0, 0, 18); g.fillRect(-12, -20, 6, 40); g.fillRect(2, -20, 6, 40); g.restore(); }
    if (o.v === 2) { circ(g, -6, 6, 3, c(0, 0, 20), 0); circ(g, 6, -6, 3, c(0, 0, 20), 0); circ(g, 8, 8, 2.4, c(0, 0, 20), 0); circ(g, -10, -5, 2.4, c(0, 0, 20), 0); }
    circ(g, 16, -4, 4.5, '#fff', 1.2); circ(g, 17, -4, 2, '#222', 0); arc(g, 10, 2, 9, -.9, .9, 1.6, OL);
  } });
  def('jelly', { w: 56, h: 80, zone: 'water', hue: [280, 340], sat: 70, lit: 70, vmax: 2, draw: function (g, o, c) {
    var i;
    for (i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 8, 4); g.bezierCurveTo(i * 8 - 8, 16, i * 8 + 8, 26, i * 8, 36); g.lineWidth = 3; g.strokeStyle = c(0, 0, -10); g.lineCap = 'round'; g.stroke(); }
    g.beginPath(); g.moveTo(-24, 8); g.bezierCurveTo(-26, -34, 26, -34, 24, 8); g.quadraticCurveTo(12, 14, 0, 8); g.quadraticCurveTo(-12, 14, -24, 8); fs(g, c());
    circ(g, -8, -14, 5, 'rgba(255,255,255,.5)', 0);
    if (o.v === 1) { circ(g, 6, -10, 3, c(0, 0, -20), 0); circ(g, 12, 0, 2.4, c(0, 0, -20), 0); circ(g, -2, -2, 2.4, c(0, 0, -20), 0); }
  } });
  def('seaweed', { w: 36, h: 106, zone: 'floor', hue: [110, 150], sat: 60, lit: 38, vmax: 3, draw: function (g, o, c) {
    var n = o.v + 2, i, x;
    for (i = 0; i < n; i++) {
      x = (i - (n - 1) / 2) * 11; g.beginPath(); g.moveTo(x, 50);
      g.bezierCurveTo(x - 14, 25, x + 14, 5, x - 4, -14 - i * 6); g.bezierCurveTo(x + 6, -30 - i * 4, x - 6, -40 - i * 4, x, -50 + i * 4);
      g.lineWidth = 7; g.strokeStyle = c(0, 0, -6 + i * 5); g.lineCap = 'round'; g.stroke();
    }
  } });
  def('coral', { w: 74, h: 86, zone: 'floor', hue: [320, 360], sat: 75, lit: 60, vmax: 3, draw: function (g, o, c) {
    var n = o.v + 2, i, y;
    rrect(g, -6, -10, 12, 54, 5, c());
    for (i = 0; i < n; i++) {
      y = 26 - i * (62 / n); var sd = i % 2 ? 1 : -1;
      g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(sd * 18, y - 4, sd * 24, y - 26); g.lineWidth = 11; g.strokeStyle = OL; g.lineCap = 'round'; g.stroke(); g.lineWidth = 8; g.strokeStyle = c(0, 0, i * 3); g.stroke();
    }
    circ(g, 0, -12, 8, c(0, 0, 6), 1.5);
  } });
  def('bubbles', { w: 38, h: 58, zone: 'water', hue: [190, 200], sat: 80, lit: 80, vmax: 3, low: true, draw: function (g, o, c) {
    var n = o.v + 2, P = [[0, 18, 10], [8, -2, 8], [-4, -22, 6], [6, -34, 4]], i;
    for (i = 0; i < n; i++) { circ(g, P[i][0], P[i][1], P[i][2], c(0, 0, 0, .35), 2); circ(g, P[i][0] - P[i][2] * .35, P[i][1] - P[i][2] * .35, P[i][2] * .28, 'rgba(255,255,255,.8)', 0); }
  } });
  def('chest', { w: 74, h: 58, zone: 'floor', hue: [20, 30], sat: 55, lit: 40, vmax: 2, draw: function (g, o, c) {
    rrect(g, -32, -2, 64, 30, 3, c());
    if (o.v === 1) { glow(g, 0, -4, 34, 'rgba(255,224,102,.7)'); poly(g, [-30, -4, -26, -14, 26, -14, 30, -4], '#ffd23f', 1.5); circ(g, -10, -9, 3, '#fff2a8', 0); circ(g, 8, -11, 3, '#fff2a8', 0); poly(g, [-34, -4, -28, -24, 28, -24, 34, -4], c(0, 0, -10), 1.5); }
    else { g.beginPath(); g.moveTo(-32, -2); g.bezierCurveTo(-32, -26, 32, -26, 32, -2); g.closePath(); fs(g, c(0, 0, -6)); }
    rrect(g, -32, 8, 64, 5, 0, '#c9a227', 0); rrect(g, -6, 2, 12, 14, 3, '#ffd23f', 1.5); circ(g, 0, 8, 2, '#5a3b00', 0);
  } });
  def('submarine', { w: 106, h: 58, zone: 'water', hue: [40, 52], sat: 92, lit: 56, vmax: 3, asym: true, draw: function (g, o, c) {
    var n = [2, 3, 4][o.v], i;
    line(g, 6, -20, 6, -30, 3, '#555'); line(g, 6, -30, 16, -30, 3, '#555');
    rrect(g, -8, -24, 28, 14, 5, c(0, 0, -6));
    ell(g, 0, 4, 46, 19, c()); poly(g, [-44, 0, -52, -10, -52, 14], c(0, 0, -12)); rrect(g, -56, -4, 7, 16, 2, '#555', 1);
    for (i = 0; i < n; i++) circ(g, -18 + i * (n === 2 ? 28 : n === 3 ? 20 : 15), 4, 5, '#bfe6ff', 2);
  } });
  def('turtle', { w: 86, h: 58, zone: 'water', hue: [95, 135], sat: 55, lit: 42, vmax: 2, asym: true, draw: function (g, o, c) {
    ell(g, -28, 8, 10, 5, c(0, 0, -6), 1.5, .6); ell(g, 14, 20, 10, 5, c(0, 0, -6), 1.5, -.4); ell(g, -12, -16, 10, 5, c(0, 0, -6), 1.5, -.6);
    poly(g, [-34, 6, -44, 2, -36, 12], c(0, 0, -6), 1.2);
    ell(g, 36, -2, 11, 9, c(0, 0, 10)); circ(g, 40, -4, 2, '#222', 0);
    g.beginPath(); g.ellipse(0, 0, 32, 22, 0, Math.PI, 0); g.closePath(); fs(g, c(30, 0, 6));
    if (o.v === 0) { poly(g, [-8, -8, 8, -8, 12, 4, 0, 10, -12, 4], c(30, 0, 18), 1.4); line(g, -8, -8, -16, -18, 1.4, OL); line(g, 8, -8, 16, -18, 1.4, OL); }
    else { circ(g, -12, -8, 4, c(30, 0, 18), 1); circ(g, 8, -12, 4, c(30, 0, 18), 1); circ(g, 14, -2, 4, c(30, 0, 18), 1); circ(g, -2, 0, 4, c(30, 0, 18), 1); }
  } });

  /* ===== vũ trụ ===== */
  def('planet', { w: 88, h: 88, zone: 'any', hue: [0, 360], sat: 65, lit: 55, vmax: 3, draw: function (g, o, c, r) {
    var gr = g.createRadialGradient(-10, -12, 4, 0, 0, 30);
    gr.addColorStop(0, c(0, 0, 18)); gr.addColorStop(1, c(0, 0, -16));
    if (o.v !== 1) { g.save(); g.rotate(-.4); g.beginPath(); g.ellipse(0, 0, 42, 11, 0, Math.PI, TAU); g.lineWidth = 5; g.strokeStyle = c(40, -10, 14); g.stroke(); g.restore(); }
    circ(g, 0, 0, 28, gr, 2);
    g.save(); g.beginPath(); g.arc(0, 0, 28, 0, TAU); g.clip(); g.fillStyle = c(0, 0, -12, .5); g.fillRect(-30, 4, 60, 6); g.fillRect(-30, -12, 60, 4); g.restore();
    if (o.v === 1) { circ(g, -9, 8, 5, c(0, 0, -20, .6), 0); circ(g, 10, -8, 4, c(0, 0, -20, .6), 0); circ(g, 8, 12, 3, c(0, 0, -20, .6), 0); }
    if (o.v !== 1) { g.save(); g.rotate(-.4); g.beginPath(); g.ellipse(0, 0, 42, 11, 0, 0, Math.PI); g.lineWidth = 5; g.strokeStyle = c(40, -10, 14); g.stroke(); g.restore(); }
    if (o.v === 2) { circ(g, 34, -26, 8, '#d7dbe5', 1.5); circ(g, 31, -28, 2.2, '#aeb4c4', 0); }
  } });
  def('rocket', { w: 50, h: 112, zone: 'any', hue: [0, 360], sat: 70, lit: 55, vmax: 3, draw: function (g, o, c) {
    poly(g, [-10, 36, 0, 70, 10, 36], '#ffb02e', 1.5); poly(g, [-5, 36, 0, 56, 5, 36], '#fff2a8', 0);
    poly(g, [-16, 20, -30, 40, -16, 40], c(150, 0, -6)); poly(g, [16, 20, 30, 40, 16, 40], c(150, 0, -6));
    g.beginPath(); g.moveTo(0, -56); g.bezierCurveTo(20, -36, 18, 14, 14, 40); g.lineTo(-14, 40); g.bezierCurveTo(-18, 14, -20, -36, 0, -56); fs(g, '#f3f6fb');
    g.beginPath(); g.moveTo(0, -56); g.bezierCurveTo(10, -46, 15, -38, 16, -30); g.lineTo(-16, -30); g.bezierCurveTo(-15, -38, -10, -46, 0, -56); fs(g, c(), 1.5);
    if (o.v === 1) { circ(g, 0, -12, 7, '#7ec8ff', 2); circ(g, 0, 8, 6, '#7ec8ff', 2); } else circ(g, 0, -8, 8, '#7ec8ff', 2);
    if (o.v === 2) rrect(g, -15, 22, 30, 7, 0, c(), 1);
  } });
  def('crescent', { w: 62, h: 62, zone: 'any', hue: [42, 52], sat: 90, lit: 70, vmax: 2, asym: true, draw: function (g, o, c) {
    glow(g, 0, 0, 36, c(0, 0, 10, .35));
    g.save(); g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.arc(12, -6, 22, 0, TAU, true); g.clip('evenodd'); g.fillStyle = c(); g.fillRect(-30, -30, 60, 60); g.restore();
    g.beginPath(); g.arc(0, 0, 26, Math.PI * .62, Math.PI * 1.55); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    if (o.v === 1) { circ(g, -14, 2, 3.4, c(0, 0, -14), 0); circ(g, -8, 14, 2.6, c(0, 0, -14), 0); }
  } });
  def('ufo', { w: 100, h: 60, zone: 'any', hue: [190, 330], sat: 20, lit: 78, vmax: 3, low: true, draw: function (g, o, c) {
    var n = o.v === 2 ? 5 : 3, i;
    g.beginPath(); g.arc(0, -6, 17, Math.PI, 0); g.closePath(); fs(g, 'rgba(150,230,255,.85)');
    if (o.v === 1) { circ(g, 0, -12, 7, '#7be07a', 1.5); circ(g, -2.5, -13, 1.6, '#222', 0); circ(g, 2.5, -13, 1.6, '#222', 0); }
    ell(g, 0, 6, 46, 14, c(0, 0, 0)); ell(g, 0, 10, 40, 8, c(0, 0, -16), 0);
    for (i = 0; i < n; i++) circ(g, -30 + i * (60 / (n - 1)), 8, 3.6, i % 2 ? '#ffd23f' : '#ff6b6b', 1);
  } });
  def('satellite', { w: 100, h: 66, zone: 'any', hue: [40, 52], sat: 15, lit: 76, vmax: 2, low: true, draw: function (g, o, c) {
    var i;
    rrect(g, -44, -10, 30, 20, 2, '#3a63c8'); rrect(g, 14, -10, 30, 20, 2, '#3a63c8'); for (i = 1; i < 3; i++) { line(g, -44 + i * 10, -10, -44 + i * 10, 10, 1.4, '#9cc0ff'); line(g, 14 + i * 10, -10, 14 + i * 10, 10, 1.4, '#9cc0ff'); }
    rrect(g, -14, -14, 28, 28, 4, c(), 2); rrect(g, -8, -8, 16, 16, 2, c(0, 0, -16), 1);
    if (o.v === 0) { arc(g, 0, -14, 14, Math.PI * 1.1, Math.PI * 1.9, 4, '#d7dbe5'); line(g, 0, -14, 0, -30, 2, '#d7dbe5'); circ(g, 0, -32, 3, '#ff6b6b', 0); }
    else { line(g, 0, -14, 0, -34, 2, '#d7dbe5'); circ(g, 0, -36, 3.5, '#ff6b6b', 0); line(g, -8, 14, -8, 26, 2, '#d7dbe5'); line(g, 8, 14, 8, 26, 2, '#d7dbe5'); }
  } });
  def('astronaut', { w: 56, h: 76, zone: 'any', hue: [10, 30], sat: 85, lit: 55, vmax: 3, asym: true, draw: function (g, o, c) {
    rrect(g, -26, -4, 12, 24, 4, '#c9ced9'); rrect(g, -9, 30, 7, 22, 3, '#f3f6fb'); rrect(g, 2, 30, 7, 22, 3, '#f3f6fb');
    rrect(g, -17, -6, 30, 40, 7, '#f3f6fb'); rrect(g, -9, 6, 14, 10, 2, c(), 1.4);
    if (o.v === 1) { line(g, 12, 0, 24, -20, 8, '#f3f6fb'); } else line(g, 12, 2, 20, 22, 8, '#f3f6fb');
    line(g, -17, 2, -22, 20, 8, '#f3f6fb');
    if (o.v === 2) { line(g, 24, 24, 24, -30, 2, '#8b6b4a'); poly(g, [24, -30, 40, -25, 24, -19], c(), 1.2); }
    circ(g, -2, -22, 19, '#f3f6fb'); ell(g, 1, -22, 12, 10, '#26344d', 1.5); ell(g, -3, -26, 4, 2.4, 'rgba(255,255,255,.7)', 0);
  } });
  def('alien', { w: 52, h: 68, zone: 'any', hue: [90, 150], sat: 65, lit: 55, vmax: 3, draw: function (g, o, c) {
    var n = o.v + 1, i;
    line(g, -8, -22, -14, -34, 2.4, c(0, 0, -16)); circ(g, -14, -36, 3.6, '#ff6bd8', 1); line(g, 8, -22, 14, -34, 2.4, c(0, 0, -16)); circ(g, 14, -36, 3.6, '#ff6bd8', 1);
    rrect(g, -12, 14, 8, 20, 4, c(0, 0, -10)); rrect(g, 4, 14, 8, 20, 4, c(0, 0, -10));
    ell(g, 0, 18, 15, 14, c(0, 0, -4)); ell(g, 0, -6, 21, 24, c());
    for (i = 0; i < n; i++) { var x = (i - (n - 1) / 2) * 13; circ(g, x, -8, 5.6, '#fff', 1.4); circ(g, x, -8, 2.6, '#222', 0); }
    arc(g, 0, 4, 6, .2, Math.PI - .2, 2, '#2a4a2a');
  } });

  /* ===== thành phố ===== */
  def('building', { w: 76, h: 160, zone: 'ground', hue: [0, 360], sat: 35, lit: 58, vmax: 3, draw: function (g, o, c, r) {
    var cols = 3, rows = 7, i, j;
    if (o.v === 0) { line(g, 0, -80, 0, -58, 2.4, '#555'); circ(g, 0, -82, 3, '#ff5252', 0); }
    else if (o.v === 1) { rrect(g, -14, -76, 28, 18, 3, '#8b6b4a'); poly(g, [-17, -76, 17, -76, 0, -86], '#5b4636', 1.2); }
    else rrect(g, -18, -68, 22, 10, 2, '#8b93a1');
    rrect(g, -34, -60, 68, 140, 3, c());
    rrect(g, -34, -60, 14, 140, 2, c(0, 0, -10), 0);
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) rrect(g, -22 + i * 20, -50 + j * 19, 13, 12, 1.5, r() > .45 ? '#ffe9a0' : '#35455f', 1);
    rrect(g, -8, 56, 16, 24, 2, '#35455f', 1);
  } });
  def('car', { w: 104, h: 50, zone: 'ground', hue: [0, 360], sat: 75, lit: 52, vmax: 3, asym: true, draw: function (g, o, c) {
    rrect(g, -46, -2, 92, 22, 7, c());
    g.beginPath(); g.moveTo(-26, -2); g.lineTo(-18, -20); g.lineTo(18, -20); g.lineTo(30, -2); g.closePath(); fs(g, c(0, 0, 6));
    poly(g, [-21, -4, -15, -17, -2, -17, -2, -4], '#bfe6ff', 1.4); poly(g, [2, -4, 2, -17, 16, -17, 24, -4], '#bfe6ff', 1.4);
    circ(g, -28, 20, 9, '#2b2b36'); circ(g, -28, 20, 4, '#c9ced9', 0); circ(g, 28, 20, 9, '#2b2b36'); circ(g, 28, 20, 4, '#c9ced9', 0);
    rrect(g, 42, 4, 6, 5, 1, '#ffe27a', 1); rrect(g, -48, 4, 5, 5, 1, '#ff5252', 1);
    if (o.v === 1) { rrect(g, -8, -28, 16, 8, 2, '#ffd23f', 1.2); rrect(g, -46, 8, 92, 3, 0, '#fff', 0); }
    if (o.v === 2) { rrect(g, -18, -26, 36, 6, 2, '#6b4a2b', 1); rrect(g, -12, -34, 24, 9, 2, c(150, 0, 0), 1.2); }
  } });
  def('traffic', { w: 34, h: 100, zone: 'ground', hue: [0, 0], sat: 0, lit: 30, vmax: 3, draw: function (g, o, c) {
    rrect(g, -3, -10, 6, 66, 2, '#3b4252'); rrect(g, -10, 50, 20, 7, 2, '#3b4252');
    rrect(g, -12, -48, 24, 58, 6, '#2b2f3a');
    var cs = ['#ff3b3b', '#ffc933', '#3bd16f'], i;
    for (i = 0; i < 3; i++) { circ(g, 0, -36 + i * 18, 6.5, i === o.v ? cs[i] : 'rgba(255,255,255,.14)', 0); if (i === o.v) glow(g, 0, -36 + i * 18, 14, cs[i]); }
  } });

  /* ===== xứ tuyết ===== */
  def('snowman', { w: 66, h: 100, zone: 'ground', hue: [0, 360], sat: 75, lit: 52, vmax: 3, draw: function (g, o, c) {
    circ(g, 0, 28, 24, '#f7fbff'); circ(g, 0, -4, 18, '#f7fbff'); circ(g, 0, -32, 13, '#f7fbff');
    circ(g, 0, 22, 2.4, '#333', 0); circ(g, 0, 32, 2.4, '#333', 0); circ(g, 0, -4, 2.2, '#333', 0);
    circ(g, -4.5, -35, 1.8, '#222', 0); circ(g, 4.5, -35, 1.8, '#222', 0); poly(g, [0, -32, 14, -30, 0, -28], '#ff8a2e', 1);
    line(g, -16, -6, -34, -18, 3, '#7b4f2a'); line(g, 16, -6, 34, -14, 3, '#7b4f2a');
    rrect(g, -15, -22, 30, 7, 3, c(), 1.4); rrect(g, 7, -20, 7, 18, 2, c(), 1.4);
    if (o.v === 0) { rrect(g, -9, -62, 18, 18, 1, '#2b2f3a'); rrect(g, -14, -46, 28, 5, 2, '#2b2f3a'); }
    else if (o.v === 1) { g.beginPath(); g.arc(0, -42, 12, Math.PI, 0); g.closePath(); fs(g, c(150, 0, 0)); circ(g, 0, -55, 3.5, '#fff', 1); }
  } });
  def('spine', { w: 76, h: 124, zone: 'ground', hue: [130, 160], sat: 45, lit: 32, vmax: 3, draw: function (g, o, c, r) {
    pineShape(g, { v: o.v === 2 ? 0 : o.v }, c, true, r);
    if (o.v === 2) { g.save(); g.translate(0, -62); star(g, 5, 9, 4, '#ffd23f', 1.5); g.restore(); }
  } });
  def('igloo', { w: 106, h: 74, zone: 'ground', hue: [200, 210], sat: 50, lit: 92, vmax: 3, low: true, draw: function (g, o, c) {
    g.beginPath(); g.arc(0, 18, 44, Math.PI, 0); g.closePath(); fs(g, c());
    g.save(); g.beginPath(); g.arc(0, 18, 44, Math.PI, 0); g.closePath(); g.clip();
    for (var i = 0; i < 3; i++) { arc(g, 0, 18, 14 + i * 14, Math.PI, 0, 1.6, 'rgba(60,90,130,.45)'); }
    for (var j = -1; j <= 1; j++) line(g, j * 22, 18, j * 12, -26, 1.4, 'rgba(60,90,130,.4)');
    g.restore();
    rrect(g, -14, 0, 28, 24, 12, c(0, 0, -12)); g.beginPath(); g.arc(0, 18, 10, Math.PI, 0); g.lineTo(10, 24); g.lineTo(-10, 24); g.closePath(); g.fillStyle = '#26344d'; g.fill();
    if (o.v === 1) { line(g, 0, -26, 0, -42, 2, '#8b6b4a'); poly(g, [0, -42, 14, -37, 0, -32], '#ff5252', 1); }
    if (o.v === 2) { circ(g, 26, 8, 4, '#bfe6ff', 1.4); circ(g, -26, 8, 4, '#bfe6ff', 1.4); }
  } });
  def('snowflake', { w: 52, h: 52, zone: 'sky', hue: [195, 215], sat: 85, lit: 56, vmax: 3, draw: function (g, o, c) {
    var i;
    for (i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      line(g, 0, 0, 0, -23, 3, c()); line(g, 0, -12, -8, -19, 2.4, c()); line(g, 0, -12, 8, -19, 2.4, c());
      if (o.v === 1) circ(g, 0, -24, 2.4, c(0, 0, 8), 0); if (o.v === 2) { line(g, 0, -5, -5, -9, 2, c()); line(g, 0, -5, 5, -9, 2, c()); }
      g.restore();
    }
    circ(g, 0, 0, 4, c(0, 0, 10), 0);
  } });
  def('penguin', { w: 56, h: 80, zone: 'ground', hue: [0, 360], sat: 80, lit: 55, vmax: 3, asym: true, draw: function (g, o, c) {
    ell(g, -10, 36, 9, 4.5, '#ff9d2e', 1.2); ell(g, 10, 36, 9, 4.5, '#ff9d2e', 1.2);
    ell(g, 0, 4, 22, 34, c(0, -28, -22)); ell(g, 0, 10, 14, 25, '#f7fbff', 0);
    ell(g, -22, 6, 6, 18, c(0, -28, -22), 1.4, .25); ell(g, 22, 6, 6, 18, c(0, -28, -22), 1.4, -.25);
    circ(g, -7, -16, 4.4, '#fff', 1); circ(g, 7, -16, 4.4, '#fff', 1); circ(g, -6, -16, 1.8, '#111', 0); circ(g, 8, -16, 1.8, '#111', 0);
    poly(g, [-4, -10, 12, -9, -4, -4], '#ff9d2e', 1.2);
    if (o.v === 1) { rrect(g, -17, -2, 34, 7, 3, c(), 1.4); rrect(g, 8, 2, 7, 17, 2, c(), 1.4); }
    if (o.v === 2) { g.beginPath(); g.arc(0, -26, 13, Math.PI, 0); g.closePath(); fs(g, c()); circ(g, 0, -39, 3.4, '#fff', 1); }
  } });
  def('gift', { w: 52, h: 52, zone: 'ground', hue: [0, 360], sat: 75, lit: 55, vmax: 3, draw: function (g, o, c) {
    rrect(g, -22, -14, 44, 36, 3, c());
    if (o.v === 1) { for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) circ(g, -12 + i * 12, -4 + j * 16, 3, '#fff', 0); }
    else if (o.v === 2) { g.save(); g.beginPath(); g.rect(-22, -14, 44, 36); g.clip(); for (var k = -3; k < 5; k++) line(g, -30 + k * 14, 26, -6 + k * 14, -18, 5, c(0, 0, 16)); g.restore(); }
    rrect(g, -22, -22, 44, 10, 3, c(0, 0, -10), 1.5);
    if (o.v === 0) { rrect(g, -4.5, -22, 9, 44, 0, '#ffd23f', 1); ell(g, -8, -26, 8, 5, '#ffd23f', 1.4, -.4); ell(g, 8, -26, 8, 5, '#ffd23f', 1.4, .4); circ(g, 0, -24, 3.4, '#ffbf00', 1); }
    else { ell(g, -8, -26, 8, 5, '#fff', 1.4, -.4); ell(g, 8, -26, 8, 5, '#fff', 1.4, .4); circ(g, 0, -24, 3.4, '#ddd', 1); }
  } });
  def('cabin', { w: 114, h: 104, zone: 'ground', hue: [20, 32], sat: 55, lit: 42, vmax: 3, asym: true, draw: function (g, o, c) {
    var i;
    rrect(g, 20, -40, 14, 30, 2, '#9c5a43'); rrect(g, 17, -44, 20, 8, 3, '#f7fbff', 1.2);
    for (i = 0; i < 3; i++) { circ(g, 28 + i * 6, -52 - i * 10, 5 + i * 1.6, 'rgba(255,255,255,.6)', 0); }
    rrect(g, -40, 0, 80, 50, 2, c());
    for (i = 1; i < 5; i++) line(g, -40, i * 10, 40, i * 10, 1.4, 'rgba(0,0,0,.25)');
    poly(g, [-54, 4, 0, -44, 54, 4], '#7b4f2a'); poly(g, [-54, 4, 0, -44, 54, 4], 'rgba(0,0,0,0)', 2);
    poly(g, [-50, 2, 0, -40, 50, 2, 46, 8, 0, -30, -46, 8], '#f7fbff', 1.4);
    rrect(g, -8, 22, 16, 28, 3, '#5b3a22', 1.5);
    if (o.v === 0) { rrect(g, -34, 14, 18, 16, 2, '#ffd86b', 1.5); glow(g, -25, 22, 26, 'rgba(255,220,100,.4)'); }
    else if (o.v === 1) { circ(g, 0, -14, 7, '#ffd86b', 1.5); rrect(g, 18, 14, 16, 16, 2, '#9ec9ff', 1.5); }
    else { rrect(g, -34, 14, 14, 14, 2, '#9ec9ff', 1.5); rrect(g, 20, 14, 14, 14, 2, '#9ec9ff', 1.5); }
  } });

  /* ===== sa mạc ===== */
  def('cactus', { w: 58, h: 108, zone: 'ground', hue: [130, 150], sat: 45, lit: 40, vmax: 3, asym: true, draw: function (g, o, c) {
    var arm = function (sd, y) { g.beginPath(); g.moveTo(sd * 8, y); g.lineTo(sd * 22, y); g.lineTo(sd * 22, y - 22); g.lineWidth = 12; g.strokeStyle = OL; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); g.lineWidth = 9; g.strokeStyle = c(); g.stroke(); };
    if (o.v === 0 || o.v === 1) arm(-1, 10); if (o.v === 0 || o.v === 2) arm(1, 22);
    rrect(g, -11, -50, 22, 104, 11, c()); line(g, -4, -42, -4, 44, 1.6, c(0, 0, 10)); line(g, 4, -42, 4, 44, 1.6, c(0, 0, -10));
    if (o.v === 1) { circ(g, 0, -52, 6, '#ff6fa5', 1.5); circ(g, 0, -52, 2, '#ffd23f', 0); }
  } });
  def('pyramid', { w: 118, h: 86, zone: 'ground', hue: [36, 42], sat: 70, lit: 62, vmax: 3, draw: function (g, o, c) {
    poly(g, [-54, 40, 0, -40, 54, 40], c()); poly(g, [0, -40, 54, 40, 10, 40], c(0, 0, -14), 0); poly(g, [-54, 40, 0, -40, 54, 40], 'rgba(0,0,0,0)', 2);
    for (var i = 1; i < 4; i++) line(g, -54 + i * 12 + 2, 40 - i * 21, 54 - i * 12 - 2, 40 - i * 21, 1.4, 'rgba(0,0,0,.18)');
    if (o.v === 1) { rrect(g, -7, 22, 14, 18, 2, '#3b2a1a', 1.2); }
    if (o.v === 2) { line(g, 0, -40, 0, -56, 2, '#8b6b4a'); poly(g, [0, -56, 14, -51, 0, -46], '#ff5252', 1); }
  } });
  def('tent', { w: 106, h: 74, zone: 'ground', hue: [0, 360], sat: 60, lit: 55, vmax: 3, asym: true, draw: function (g, o, c) {
    poly(g, [-50, 30, -4, -32, 50, 30], c()); poly(g, [-4, -32, 50, 30, 20, 30], c(0, 0, -10), 0);
    if (o.v === 1) { g.save(); g.beginPath(); g.moveTo(-50, 30); g.lineTo(-4, -32); g.lineTo(50, 30); g.closePath(); g.clip(); for (var i = -3; i < 4; i++) poly(g, [-4 + i * 14, -34, -4 + i * 14 + 7, -34, -4 + i * 20 + 10, 32, -4 + i * 20, 32], c(150, 0, 14), 0); g.restore(); }
    poly(g, [-50, 30, -4, -32, 50, 30], 'rgba(0,0,0,0)', 2);
    poly(g, [-14, 30, -4, 0, 8, 30], '#3b2a1a', 1.4);
    line(g, -4, -32, -4, -44, 2, '#8b6b4a'); poly(g, [-4, -44, 12, -40, -4, -36], '#ffd23f', 1);
    if (o.v === 2) { rrect(g, -30, 30, 60, 6, 2, c(150, 0, 0), 1.2); }
  } });
  def('camel', { w: 116, h: 94, zone: 'ground', hue: [30, 40], sat: 55, lit: 60, vmax: 3, asym: true, draw: function (g, o, c) {
    var i;
    for (i = 0; i < 2; i++) { rrect(g, -30 + i * 8, 14, 8, 36, 3, c(0, 0, -10)); rrect(g, 22 + i * 8, 14, 8, 36, 3, c(0, 0, -10)); }
    g.beginPath(); g.moveTo(26, -4); g.bezierCurveTo(38, -10, 40, -34, 46, -44); g.lineTo(58, -42); g.lineTo(56, -34); g.bezierCurveTo(50, -26, 48, -4, 40, 12); g.closePath(); fs(g, c(0, 0, 4));
    ell(g, 54, -44, 12, 8, c(0, 0, 6), 2, -.2); circ(g, 55, -48, 1.8, '#222', 0);
    ell(g, 0, 4, 38, 18, c());
    if (o.v === 1) { g.beginPath(); g.moveTo(-14, -8); g.quadraticCurveTo(0, -38, 14, -8); fs(g, c(0, 0, 4)); }
    else { g.beginPath(); g.moveTo(-24, -8); g.quadraticCurveTo(-16, -34, -6, -8); fs(g, c(0, 0, 4)); g.beginPath(); g.moveTo(4, -8); g.quadraticCurveTo(14, -34, 24, -8); fs(g, c(0, 0, 4)); }
    if (o.v === 2) { rrect(g, -18, -4, 36, 10, 3, '#d1495b', 1.4); }
    line(g, -38, 0, -44, 20, 3, c(0, 0, -6));
  } });

  /* ===== lâu đài ===== */
  def('castle', { w: 154, h: 150, zone: 'ground', hue: [215, 225], sat: 14, lit: 78, vmax: 3, low: true, draw: function (g, o, c) {
    var i, k;
    var tower = function (x, w, top) {
      rrect(g, x - w / 2, top, w, 64 - top + 22, 2, c(0, 0, -4));
      for (k = 0; k < 3; k++) rrect(g, x - w / 2 + k * (w / 3 + .6), top - 7, w / 3 - 2, 8, 1, c(0, 0, -4), 1.2);
    };
    tower(-54, 30, -10); tower(54, 30, -10);
    rrect(g, -38, -34, 76, 98, 2, c());
    for (k = 0; k < 5; k++) rrect(g, -38 + k * 15.6, -42, 11, 9, 1, c(), 1.2);
    poly(g, [-60, -16, -54, -50, -48, -16], c(0, 50, -24)); poly(g, [48, -16, 54, -50, 60, -16], c(0, 50, -24));
    line(g, -54, -50, -54, -66, 2, '#5b4636'); line(g, 54, -50, 54, -66, 2, '#5b4636');
    poly(g, [-54, -66, -40, -61, -54, -56], '#ff5252', 1); if (o.v !== 1) poly(g, [54, -66, 68, -61, 54, -56], '#ff5252', 1);
    if (o.v === 2) { line(g, 0, -42, 0, -62, 2, '#5b4636'); poly(g, [0, -62, 14, -57, 0, -52], '#ffd23f', 1); }
    g.beginPath(); g.moveTo(-14, 64); g.lineTo(-14, 36); g.arc(0, 36, 14, Math.PI, 0); g.lineTo(14, 64); g.closePath(); fs(g, o.v === 1 ? '#26344d' : c(30, 40, -34), 1.6);
    if (o.v === 0) { for (i = -1; i <= 1; i++) line(g, i * 7, 28, i * 7, 64, 1.4, 'rgba(0,0,0,.35)'); }
    rrect(g, -26, -16, 8, 14, 4, '#26344d', 1.2); rrect(g, 18, -16, 8, 14, 4, '#26344d', 1.2);
    rrect(g, -58, 8, 8, 12, 4, '#26344d', 1.2); rrect(g, 50, 8, 8, 12, 4, '#26344d', 1.2);
  } });
  def('tower', { w: 64, h: 150, zone: 'ground', hue: [215, 225], sat: 14, lit: 76, vmax: 3, low: true, draw: function (g, o, c) {
    var i, ys = [[-8], [-22, 6], [-30, -8, 14]][o.v];
    rrect(g, -16, -40, 32, 108, 2, c()); rrect(g, -16, -40, 9, 108, 2, c(0, 0, -8), 0);
    poly(g, [-24, -40, 0, -84, 24, -40], c(0, 55, -24)); line(g, 0, -84, 0, -100, 2, '#5b4636'); poly(g, [0, -100, 14, -95, 0, -90], '#ff5252', 1);
    for (i = 0; i < ys.length; i++) rrect(g, -4.5, ys[i], 9, 14, 4.5, '#26344d', 1.2);
    rrect(g, -7, 50, 14, 18, 7, '#7a4a2a', 1.4);
  } });
  def('flag', { w: 40, h: 70, zone: 'ground', hue: [0, 360], sat: 75, lit: 52, vmax: 3, asym: true, draw: function (g, o, c) {
    rrect(g, -2, -32, 4, 66, 2, '#6b4a2b'); circ(g, 0, -33, 3.5, '#ffd23f', 1);
    poly(g, [2, -28, 32, -28, 26, -17, 32, -6, 2, -6], c());
    if (o.v === 0) circ(g, 14, -17, 5, '#fff', 0); else if (o.v === 1) { g.save(); g.translate(14, -17); star(g, 5, 6, 2.6, '#fff', 0); g.restore(); } else rrect(g, 2, -19, 28, 4, 0, '#fff', 0);
  } });
  def('crown', { w: 56, h: 44, zone: 'any', hue: [42, 50], sat: 92, lit: 55, vmax: 3, draw: function (g, o, c) {
    var n = [3, 5, 4][o.v], i, pts = [-24, 12, -24, -18];
    for (i = 0; i < n; i++) { pts.push(-24 + (i + .5) * (48 / n), -2); pts.push(-24 + (i + 1) * (48 / n), -18); }
    pts.push(24, 12); poly(g, pts, c(), 2);
    rrect(g, -24, 8, 48, 8, 2, c(0, 0, -8), 1.6);
    for (i = 0; i < n; i++) circ(g, -24 + (i + 1) * (48 / n) - (i === n - 1 ? 0 : 0), -18, 3.2, ['#ff5252', '#52a7ff', '#7be07a'][i % 3], 1);
    circ(g, -10, 12, 2, '#52a7ff', 0); circ(g, 10, 12, 2, '#ff5252', 0);
  } });

  /* ===== tiệc ngọt ===== */
  def('cupcake', { w: 52, h: 64, zone: 'any', hue: [0, 360], sat: 80, lit: 70, vmax: 3, draw: function (g, o, c, r) {
    poly(g, [-18, 0, 18, 0, 13, 28, -13, 28], '#e9b872', 1.8); for (var i = -1; i <= 1; i++) line(g, i * 8, 2, i * 6, 26, 1.4, 'rgba(0,0,0,.2)');
    blob(g, [[0, -4, 22, 9], [0, -14, 17, 8], [0, -23, 11, 7]], c());
    if (o.v === 0) circ(g, 0, -33, 5, '#e5392e', 1.5);
    else if (o.v === 1) for (i = 0; i < 7; i++) line(g, -14 + r() * 28, -20 + r() * 20, -12 + r() * 24, -18 + r() * 18, 2.4, ['#ffd23f', '#52a7ff', '#7be07a', '#fff'][i % 4]);
  } });
  def('icecream', { w: 46, h: 106, zone: 'any', hue: [0, 360], sat: 75, lit: 72, vmax: 3, draw: function (g, o, c) {
    var n = o.v + 1, i;
    g.translate(0, 13);
    poly(g, [-14, 0, 14, 0, 0, 40], '#e6b26a', 1.8); for (i = 0; i < 3; i++) { line(g, -12 + i * 6, 2 + i * 2, 12 - i * 6, 2 + i * 2, 1.2, 'rgba(0,0,0,.25)'); }
    for (i = 0; i < n; i++) { blob(g, [[0, -4 - i * 20, 17]], c(i * 55, 0, 0)); circ(g, -6, -9 - i * 20, 4, 'rgba(255,255,255,.4)', 0); }
    circ(g, 0, -4 - (n - 1) * 20 - 18, 4.6, '#e5392e', 1.4);
  } });
  def('lollipop', { w: 52, h: 88, zone: 'any', hue: [0, 360], sat: 85, lit: 62, vmax: 3, draw: function (g, o, c) {
    rrect(g, -2.5, 4, 5, 38, 2, '#f3f6fb', 1.4);
    circ(g, 0, -20, 24, c());
    if (o.v === 0) { arc(g, 0, -20, 16, 0, TAU * .9, 4, c(150, 0, 14)); arc(g, 0, -20, 8, 0, TAU * .9, 4, c(150, 0, 14)); }
    else if (o.v === 1) { for (var i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, -20); g.arc(0, -20, 22, i * TAU / 6, (i + .5) * TAU / 6); g.closePath(); g.fillStyle = c(150, 0, 14); g.fill(); } }
    else { for (var j = 0; j < 3; j++) circ(g, -9 + j * 9, -22 + (j % 2) * 8, 4, c(150, 0, 16), 0); }
    circ(g, 0, -20, 24, 'rgba(0,0,0,0)', 1.8); circ(g, -9, -30, 5, 'rgba(255,255,255,.45)', 0);
  } });
  def('donut', { w: 62, h: 62, zone: 'any', hue: [0, 360], sat: 80, lit: 70, vmax: 3, draw: function (g, o, c, r) {
    var i;
    circ(g, 0, 0, 27, '#e0a35e', 1.8); circ(g, 0, 0, 21, c(), 1.4);
    if (o.v === 1) for (i = 0; i < 8; i++) { var a = r() * TAU, d = 11 + r() * 8; line(g, Math.cos(a) * d - 2, Math.sin(a) * d - 1, Math.cos(a) * d + 2, Math.sin(a) * d + 1, 2.6, ['#ffd23f', '#52a7ff', '#fff', '#7be07a'][i % 4]); }
    if (o.v === 2) { circ(g, 20, -12, 9, '#f2efe6', 0); }
    circ(g, 0, 0, 8, '#f6efe0', 1.6); circ(g, 0, 0, 8, '#e8dfca', 0); ell(g, 0, 0, 8, 8, '#f2efe6', 1.4);
  } });
  def('candy', { w: 66, h: 40, zone: 'any', hue: [0, 360], sat: 85, lit: 60, vmax: 3, draw: function (g, o, c) {
    poly(g, [-18, 0, -34, -13, -34, 13], c(150, 0, 12), 1.6); poly(g, [18, 0, 34, -13, 34, 13], c(150, 0, 12), 1.6);
    ell(g, 0, 0, 22, 14, c(), 2);
    if (o.v === 1) { g.save(); g.beginPath(); g.ellipse(0, 0, 22, 14, 0, 0, TAU); g.clip(); for (var i = -3; i < 4; i++) line(g, i * 9 - 6, -16, i * 9 + 6, 16, 4, c(150, 0, 18)); g.restore(); }
    if (o.v === 2) { circ(g, -8, -2, 2.6, '#fff', 0); circ(g, 0, 4, 2.6, '#fff', 0); circ(g, 8, -3, 2.6, '#fff', 0); }
  } });
  def('cookie', { w: 56, h: 56, zone: 'any', hue: [28, 36], sat: 60, lit: 60, vmax: 3, draw: function (g, o, c) {
    var P = [[-10, -10], [8, -12], [12, 4], [-4, 6], [-14, 10], [6, 16]], i, n = o.v === 1 ? 4 : o.v === 2 ? 6 : 5;
    circ(g, 0, 0, 24, c());
    for (i = 0; i < n; i++) circ(g, P[i][0], P[i][1], 3.8, '#4a2c1a', 0);
    if (o.v === 1) circ(g, 22, -14, 9, '#f6efe0', 0);
    circ(g, -9, -12, 6, 'rgba(255,255,255,.2)', 0);
  } });
  def('cake', { w: 64, h: 56, zone: 'any', hue: [330, 355], sat: 70, lit: 78, vmax: 3, draw: function (g, o, c) {
    poly(g, [-28, 20, -28, -4, 28, -20, 28, 20], '#f3dcae', 1.8); poly(g, [-28, 6, 28, -6, 28, 2, -28, 12], c(0, 0, -14), 0);
    poly(g, [-28, -4, 28, -20, 28, -12, -28, 4], c(), 1.6);
    if (o.v === 0) circ(g, 12, -22, 5, '#e5392e', 1.4);
    if (o.v === 2) { circ(g, -8, -10, 4.4, '#e5392e', 1.4); circ(g, 14, -18, 4.4, '#e5392e', 1.4); }
    if (o.v === 1) { line(g, 4, -20, 4, -34, 3, '#52a7ff'); circ(g, 4, -37, 3.6, '#ffd23f', 1); }
  } });

  /* Số đo thật của từng loại vật thể (đo bằng cách vẽ ra rồi so điểm ảnh, ở tỉ lệ 1):
     e = khung bao [x0,y0,x1,y1] gồm cả viền và ánh sáng, gốc ở tâm; a = diện tích đặc;
     f[v] = số điểm ảnh đổi khi lật ngang biến thể v; v[a][b] = số điểm ảnh đổi khi chuyển biến thể a -> b;
     c = số điểm ảnh đổi khi đổi màu. Dùng để xếp vật không chồng nhau, vẽ đúng vùng "điểm khác biệt" và chỉ chọn
     những kiểu khác biệt đủ thấy rõ. Sau khi sửa hình vẽ của một loại vật, đo lại rồi dán lại bảng này. */
  var META = /*META-BEGIN*/{
    alien: {"e":[-22,-40,22,35],"a":2204,"f":[8,8,8],"v":[[0,269,248],[269,0,406],[248,406,0]],"c":1596},
    astronaut: {"e":[-27,-42,41,53],"a":3037,"f":[1631,2050,1946],"v":[[0,403,212],[403,0,570],[212,570,0]],"c":136},
    balloon: {"e":[-29,-51,29,51],"a":3396,"f":[224,224,224],"v":[[0,1606,1330],[1606,0,1164],[1330,1164,0]],"c":2522},
    beachball: {"e":[-23,-23,23,23],"a":1561,"f":[1050,1494,318],"v":[[0,767,1471],[767,0,798],[1471,798,0]],"c":911},
    bird: {"e":[-32,-23,33,16],"a":1136,"f":[1040,889],"v":[[0,554],[554,0]],"c":938},
    bubbles: {"e":[-11,-39,17,29],"a":181,"f":[514,762,918],"v":[[0,154,232],[154,0,78],[232,78,0]],"c":391},
    building: {"e":[-35,-87,35,81],"a":9823,"f":[6741,6609,6737],"v":[[0,2493,1670],[2493,0,2493],[1670,2493,0]],"c":1698},
    bunny: {"e":[-29,-44,31,39],"a":2214,"f":[0,442,8],"v":[[0,221,839],[221,0,1060],[839,1060,0]],"c":1907},
    bush: {"e":[-40,-26,40,23],"a":2586,"f":[0,441,510],"v":[[0,278,297],[278,0,520],[297,520,0]],"c":2177},
    butterfly: {"e":[-29,-22,29,21],"a":1736,"f":[9,9,9],"v":[[0,120,184],[120,0,64],[184,64,0]],"c":1180},
    cabin: {"e":[-55,-81,55,51],"a":7196,"f":[4153,2344,1720],"v":[[0,1688,1458],[1688,0,525],[1458,525,0]],"c":2542},
    cactus: {"e":[-28,-59,28,55],"a":2711,"f":[1288,1252,1252],"v":[[0,598,450],[598,0,1048],[450,1048,0]],"c":2015},
    cake: {"e":[-29,-41,29,21],"a":1920,"f":[1572,1570,1480],"v":[[0,219,213],[219,0,275],[213,275,0]],"c":376},
    camel: {"e":[-46,-54,67,51],"a":4354,"f":[3616,3446,3616],"v":[[0,487,444],[487,0,931],[444,931,0]],"c":3342},
    candy: {"e":[-35,-15,35,15],"a":1405,"f":[0,620,40],"v":[[0,561,84],[561,0,582],[84,582,0]],"c":1239},
    car: {"e":[-49,-35,49,30],"a":3299,"f":[338,324,338],"v":[[0,444,492],[444,0,752],[492,752,0]],"c":1698},
    castle: {"e":[-70,-67,70,87],"a":14853,"f":[988,832,1164],"v":[[0,1190,338],[1190,0,1312],[338,1312,0]],"c":12905},
    chest: {"e":[-35,-37,35,29],"a":3069,"f":[0,0],"v":[[0,1853],[1853,0]],"c":2068},
    cloud: {"e":[-50,-30,59,42],"a":4311,"f":[1548,1860],"v":[[0,156],[156,0]],"c":4224},
    cookie: {"e":[-25,-25,31,25],"a":1899,"f":[512,937,616],"v":[[0,319,52],[319,0,371],[52,371,0]],"c":1384},
    coral: {"e":[-30,-52,30,45],"a":1691,"f":[1702,2481,2962],"v":[[0,1050,1604],[1050,0,1574],[1604,1574,0]],"c":1273},
    crab: {"e":[-37,-25,37,24],"a":1809,"f":[0,0],"v":[[0,1136],[1136,0]],"c":1567},
    crescent: {"e":[-34,-34,34,34],"a":1298,"f":[1986,1992],"v":[[0,58],[58,0]],"c":1207},
    crown: {"e":[-25,-22,28,17],"a":1421,"f":[206,190,200],"v":[[0,707,645],[707,0,698],[645,698,0]],"c":1191},
    cupcake: {"e":[-24,-39,24,29],"a":1863,"f":[0,298,0],"v":[[0,352,112],[352,0,240],[112,240,0]],"c":798},
    donut: {"e":[-28,-28,29,28],"a":2342,"f":[0,276,526],"v":[[0,151,263],[151,0,407],[263,407,0]],"c":933},
    fence: {"e":[-55,-23,55,25],"a":3301,"f":[0,0,0],"v":[[0,2408,2746],[2408,0,2646],[2746,2646,0]],"c":2140},
    fish: {"e":[-41,-27,29,18],"a":1817,"f":[967,1479,1113],"v":[[0,402,100],[402,0,363],[100,363,0]],"c":1643},
    flag: {"e":[-4,-37,33,35],"a":904,"f":[1372,1372,1388],"v":[[0,56,124],[56,0,112],[124,112,0]],"c":490},
    flower: {"e":[-23,-41,23,38],"a":1518,"f":[650,752,593],"v":[[0,736,764],[736,0,843],[764,843,0]],"c":770},
    gift: {"e":[-23,-33,23,23],"a":2198,"f":[0,0,775],"v":[[0,852,1206],[852,0,737],[1206,737,0]],"c":1452},
    house: {"e":[-53,-53,53,55],"a":7205,"f":[1390,598,1238],"v":[[0,595,965],[595,0,773],[965,773,0]],"c":2630},
    icecream: {"e":[-19,-55,19,54],"a":1936,"f":[104,114,152],"v":[[0,1195,1927],[1195,0,1195],[1927,1195,0]],"c":798},
    igloo: {"e":[-45,-43,45,25],"a":3240,"f":[0,176,0],"v":[[0,114,152],[114,0,266],[152,266,0]],"c":2800},
    jelly: {"e":[-25,-25,25,38],"a":1767,"f":[941,1043],"v":[[0,68],[68,0]],"c":1504},
    kite: {"e":[-25,-43,25,46],"a":1732,"f":[1777,1796,1820],"v":[[0,88,114],[88,0,102],[114,102,0]],"c":1431},
    lamp: {"e":[-29,-71,29,59],"a":1202,"f":[0,0],"v":[[0,1480],[1480,0]],"c":0},
    lighthouse: {"e":[-25,-78,25,65],"a":3764,"f":[0,0,0],"v":[[0,1416,1468],[1416,0,1436],[1468,1436,0]],"c":1310},
    lollipop: {"e":[-25,-45,25,43],"a":2129,"f":[271,1527,160],"v":[[0,890,675],[890,0,851],[675,851,0]],"c":1650},
    mushroom: {"e":[-25,-26,25,27],"a":1466,"f":[172,228,300],"v":[[0,36,72],[36,0,36],[72,36,0]],"c":912},
    owl: {"e":[-23,-35,23,36],"a":2153,"f":[0,8,0],"v":[[0,493,317],[493,0,750],[317,750,0]],"c":442},
    palm: {"e":[-22,-94,71,67],"a":3879,"f":[6826,6524,6861],"v":[[0,296,122],[296,0,385],[122,385,0]],"c":1731},
    penguin: {"e":[-30,-43,30,41],"a":3037,"f":[146,461,146],"v":[[0,421,356],[421,0,777],[356,777,0]],"c":1078},
    pine: {"e":[-39,-72,39,59],"a":3942,"f":[0,600,0],"v":[[0,300,160],[300,0,460],[160,460,0]],"c":1464},
    plane: {"e":[-47,-21,49,21],"a":1895,"f":[1434,1392,1648],"v":[[0,271,120],[271,0,391],[120,391,0]],"c":413},
    planet: {"e":[-42,-35,43,29],"a":2794,"f":[2088,1055,2462],"v":[[0,820,237],[820,0,1007],[237,1007,0]],"c":2342},
    pyramid: {"e":[-55,-57,55,41],"a":4611,"f":[3564,3564,3740],"v":[[0,296,114],[296,0,410],[114,410,0]],"c":3917},
    rainbow: {"e":[-77,-37,77,45],"a":8794,"f":[0,0,0],"v":[[0,3954,7303],[3954,0,4952],[7303,4952,0]],"c":8063},
    rock: {"e":[-35,-21,29,21],"a":1712,"f":[757,901,1072],"v":[[0,383,199],[383,0,582],[199,582,0]],"c":1430},
    rocket: {"e":[-31,-57,31,71],"a":3366,"f":[0,0,0],"v":[[0,403,284],[403,0,687],[284,687,0]],"c":749},
    sailboat: {"e":[-39,-46,39,48],"a":2895,"f":[1078,2648,1078],"v":[[0,969,174],[969,0,1143],[174,1143,0]],"c":968},
    sandcastle: {"e":[-36,-39,36,31],"a":2739,"f":[133,133,133],"v":[[0,2064,1278],[2064,0,1782],[1278,1782,0]],"c":1788},
    satellite: {"e":[-45,-40,45,27],"a":2165,"f":[14,8],"v":[[0,282],[282,0]],"c":766},
    seaweed: {"e":[-25,-54,23,54],"a":2241,"f":[1429,2745,3494],"v":[[0,2675,2015],[2675,0,3561],[2015,3561,0]],"c":1405},
    sheep: {"e":[-36,-30,39,29],"a":2863,"f":[1485,1513,1668],"v":[[0,70,124],[70,0,194],[124,194,0]],"c":2187},
    snail: {"e":[-23,-18,31,21],"a":1485,"f":[1583,1625],"v":[[0,402],[402,0]],"c":640},
    snowflake: {"e":[-24,-27,24,27],"a":729,"f":[0,0,0],"v":[[0,125,139],[125,0,264],[139,264,0]],"c":20},
    snowman: {"e":[-36,-63,36,53],"a":3584,"f":[608,610,608],"v":[[0,532,526],[532,0,314],[526,314,0]],"c":287},
    spine: {"e":[-39,-72,39,59],"a":3955,"f":[0,628,0],"v":[[0,314,166],[314,0,480],[166,480,0]],"c":1050},
    star: {"e":[-25,-25,25,25],"a":773,"f":[0,0,0],"v":[[0,839,759],[839,0,840],[759,840,0]],"c":460},
    starfish: {"e":[-23,-25,23,20],"a":649,"f":[0,0],"v":[[0,94],[94,0]],"c":579},
    submarine: {"e":[-57,-32,47,24],"a":3257,"f":[1324,1356,1592],"v":[[0,332,346],[332,0,424],[346,424,0]],"c":2682},
    sun: {"e":[-42,-42,42,42],"a":2569,"f":[374,374,338],"v":[[0,980,125],[980,0,1105],[125,1105,0]],"c":2225},
    tent: {"e":[-51,-45,51,37],"a":3520,"f":[3026,2388,3026],"v":[[0,1504,433],[1504,0,1932],[433,1932,0]],"c":2523},
    tower: {"e":[-25,-101,25,69],"a":4642,"f":[2114,2114,2114],"v":[[0,390,268],[390,0,478],[268,478,0]],"c":3962},
    traffic: {"e":[-14,-50,14,58],"a":1753,"f":[0,0,0],"v":[[0,922,1054],[922,0,921],[1054,921,0]],"c":0},
    tree: {"e":[-48,-53,48,59],"a":6108,"f":[571,1194,1219],"v":[[0,395,394],[395,0,743],[394,743,0]],"c":5316},
    turtle: {"e":[-45,-24,48,27],"a":1890,"f":[1389,1766],"v":[[0,515],[515,0]],"c":1518},
    ufo: {"e":[-47,-24,47,21],"a":2489,"f":[0,0,0],"v":[[0,164,144],[164,0,308],[144,308,0]],"c":1774},
    umbrella: {"e":[-47,-39,47,49],"a":3097,"f":[0,0,196],"v":[[0,0,252],[0,0,252],[252,252,0]],"c":2495},
    windmill: {"e":[-45,-67,45,67],"a":4953,"f":[4705,2896,4811],"v":[[0,3957,5138],[3957,0,3935],[5138,3935,0]],"c":1441}
  }/*META-END*/;
  Object.keys(T).forEach(function (n) {
    var m = META[n] || {}, t = T[n];
    t.ext = m.e ? m.e.slice() : [-t.w / 2, -t.h / 2, t.w / 2, t.h / 2];
    t.area = m.a || t.w * t.h * .4; t.flipPx = m.f || []; t.varPx = m.v || []; t.colorPx = m.c == null ? 1e9 : m.c;
  });

  /* ---------- vẽ một vật thể ---------- */
  function drawObject(g, o) {
    var t = T[o.t];
    g.save();
    g.translate(o.x, o.y); g.scale(o.s * (o.f || 1), o.s);
    var c = function (dh, ds, dl, a) { return hsl(o.h + (dh || 0), o.sat + (ds || 0), o.l + (dl || 0), a); };
    t.draw(g, o, c, mulberry32(o.k | 0));
    g.restore();
  }

  /* ---------- phông nền chủ đề ---------- */
  var SKIES = [
    ['#5ec0ff', '#aee4ff', '#e8f8ff'], ['#ff9a8b', '#ffc3a0', '#ffe9c8'], ['#3a2a6b', '#d4587a', '#ffb36b'], ['#2b2a6e', '#6d4c9f', '#f2a0b3'],
    ['#4ec5c1', '#9be8dc', '#e5fbf0'], ['#ff9ad5', '#ffc9ec', '#fff0fa'], ['#8aa0b5', '#b9c6d3', '#e0e7ee'], ['#8f9bff', '#c0c8ff', '#eef0ff'],
    ['#6fe3a8', '#b3f2cf', '#effff6'], ['#ffc94d', '#ffe08a', '#fff6d6']
  ];
  function vgrad(g, y0, y1, stops) {
    var gr = g.createLinearGradient(0, y0, 0, y1), i;
    for (i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0);
  }
  function skyFill(g, m, y1) { var s = SKIES[m % 10]; vgrad(g, 0, y1, [[0, s[0]], [.55, s[1]], [1, s[2]]]); }
  function hills(g, r, y, amp, col, freq) {
    var ph = [r() * 6, r() * 6, r() * 6], x, yy;
    g.beginPath(); g.moveTo(0, H);
    for (x = 0; x <= W; x += 8) { yy = y - amp * (Math.sin(x * freq + ph[0]) * .5 + Math.sin(x * freq * 2.3 + ph[1]) * .3 + Math.sin(x * freq * .6 + ph[2]) * .4); g.lineTo(x, yy); }
    g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.fill();
  }
  function tufts(g, r, y0, n, col) {
    var i, x, y;
    g.strokeStyle = col; g.lineWidth = 1.6; g.lineCap = 'round';
    for (i = 0; i < n; i++) { x = r() * W; y = y0 + r() * (H - y0 - 6); g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - 1, y - 5); g.moveTo(x, y); g.lineTo(x, y - 7); g.moveTo(x + 3, y); g.lineTo(x + 1, y - 5); g.stroke(); }
  }
  function sparkle(g, r, n, y0, y1, col) {
    var i; g.fillStyle = col;
    for (i = 0; i < n; i++) { g.beginPath(); g.arc(r() * W, y0 + r() * (y1 - y0), .8 + r() * 1.6, 0, TAU); g.fill(); }
  }

  var BG = {};
  BG.village = function (g, m, r) {
    var gh = 100 + (m * 11) % 40;
    skyFill(g, m, 380);
    hills(g, r, 300, 30, hsl(gh + 15, 40, 72), .006); hills(g, r, 340, 26, hsl(gh + 5, 45, 62), .008);
    vgrad(g, 330, H, [[0, hsl(gh, 52, 52)], [1, hsl(gh, 55, 38)]]);
    g.fillStyle = hsl(gh, 55, 56, .25); for (var i = 0; i < 6; i++) g.fillRect(0, 350 + i * i * 7 + i * 6, W, 10 + i * 3);
    tufts(g, r, 340, 70, hsl(gh, 50, 30));
  };
  BG.beach = function (g, m, r) {
    skyFill(g, m, 300);
    vgrad(g, 300, 470, [[0, '#3fc9d8'], [1, '#157ec0']]);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.lineCap = 'round';
    for (var i = 0; i < 26; i++) { var x = r() * W, y = 312 + r() * 130; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 5, x + 20, y); g.stroke(); }
    var sand = 38 + (m % 4) * 3;
    g.beginPath(); g.moveTo(0, 470); g.bezierCurveTo(200, 430, 500, 500, W, 440); g.lineTo(W, H); g.lineTo(0, H); g.closePath();
    var gr = g.createLinearGradient(0, 440, 0, H); gr.addColorStop(0, hsl(sand, 70, 80)); gr.addColorStop(1, hsl(sand, 60, 66)); g.fillStyle = gr; g.fill();
    g.beginPath(); g.moveTo(0, 470); g.bezierCurveTo(200, 430, 500, 500, W, 440); g.lineWidth = 6; g.strokeStyle = 'rgba(255,255,255,.8)'; g.stroke();
    g.fillStyle = hsl(sand, 50, 58, .5); for (i = 0; i < 70; i++) { g.beginPath(); g.arc(r() * W, 490 + r() * 100, .9 + r(), 0, TAU); g.fill(); }
  };
  BG.sea = function (g, m, r) {
    var hb = 196 + (m * 7) % 40, i;
    vgrad(g, 0, H, [[0, hsl(hb, 80, 62)], [.5, hsl(hb + 8, 80, 38)], [1, hsl(hb + 14, 85, 18)]]);
    g.fillStyle = 'rgba(255,255,255,.07)';
    for (i = 0; i < 5; i++) { var x = 80 + i * 170 + r() * 40; poly(g, [x, 0, x + 60, 0, x + 150, 500, x - 20, 500], 'rgba(255,255,255,.06)', 0); }
    for (i = 0; i < 8; i++) { var bx = r() * W; ell(g, bx, 470 - r() * 20, 26 + r() * 20, 60 + r() * 40, 'rgba(10,40,80,.22)', 0); }
    g.beginPath(); g.moveTo(0, H); for (var xx = 0; xx <= W; xx += 10) g.lineTo(xx, 525 + Math.sin(xx * .012 + m) * 14 + Math.sin(xx * .031) * 6); g.lineTo(W, H); g.closePath();
    var gr = g.createLinearGradient(0, 520, 0, H); gr.addColorStop(0, hsl(40, 55, 66)); gr.addColorStop(1, hsl(36, 45, 48)); g.fillStyle = gr; g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; for (i = 0; i < 18; i++) { g.beginPath(); g.arc(r() * W, r() * 480, 1 + r() * 2.4, 0, TAU); g.fill(); }
  };
  BG.space = function (g, m, r) {
    var i, h0 = (m * 36) % 360;
    vgrad(g, 0, H, [[0, '#04020f'], [1, hsl(h0 + 230, 60, 14)]]);
    for (i = 0; i < 3; i++) glow(g, 100 + r() * 600, 80 + r() * 440, 170 + r() * 110, hsl(h0 + i * 70, 70, 45, .22));
    sparkle(g, r, 160, 0, H, 'rgba(255,255,255,.75)'); sparkle(g, r, 40, 0, H, 'rgba(255,230,160,.95)');
    for (i = 0; i < 10; i++) { var x = r() * W, y = r() * H; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke(); }
  };
  BG.forest = function (g, m, r) {
    var gh = 110 + (m * 9) % 40, i, x;
    vgrad(g, 0, 420, [[0, SKIES[m % 10][1]], [1, hsl(gh + 30, 40, 80)]]);
    for (i = 0; i < 14; i++) { x = i * 64 - 10 + r() * 20; poly(g, [x, 380, x + 32, 250 + r() * 40, x + 64, 380], hsl(gh + 20, 30, 62), 0); }
    for (i = 0; i < 12; i++) { x = i * 72 + r() * 24; poly(g, [x, 410, x + 38, 290 + r() * 40, x + 76, 410], hsl(gh + 10, 40, 48), 0); }
    vgrad(g, 360, H, [[0, hsl(gh, 45, 44)], [1, hsl(gh - 5, 50, 28)]]);
    g.fillStyle = hsl(gh, 40, 60, .18); for (i = 0; i < 6; i++) { ell(g, r() * W, 420 + r() * 150, 90, 22, hsl(gh, 40, 58, .18), 0); }
    tufts(g, r, 380, 60, hsl(gh, 45, 22));
  };
  BG.city = function (g, m, r) {
    var i, x, hh;
    skyFill(g, m, 440);
    x = -10; while (x < W) { var bw = 30 + r() * 50; hh = 70 + r() * 150; g.fillStyle = 'rgba(50,60,90,.28)'; g.fillRect(x, 440 - hh, bw, hh); x += bw + 2; }
    g.fillStyle = '#9aa3b4'; g.fillRect(0, 440, W, 34);
    for (i = 0; i < W / 40; i++) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(i * 40, 440, 2, 34); }
    vgrad(g, 474, H, [[0, '#4a4f5e'], [1, '#2f3340']]);
    g.fillStyle = '#e9e2a6'; for (i = 0; i < 10; i++) g.fillRect(i * 90 + 10, 548, 50, 6);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, 478, W, 3);
  };
  BG.winter = function (g, m, r) {
    var hb = 205 + (m * 5) % 25, i, x;
    vgrad(g, 0, 380, [[0, hsl(hb, 60, 76)], [1, hsl(hb, 60, 94)]]);
    for (i = 0; i < 12; i++) { x = i * 70 + r() * 20; poly(g, [x, 340, x + 24, 270 + r() * 30, x + 48, 340], hsl(hb + 10, 30, 78), 0); }
    hills(g, r, 330, 28, '#e8f1fb', .007); hills(g, r, 380, 22, '#f5faff', .009);
    vgrad(g, 360, H, [[0, '#f4f9ff'], [1, '#d3e4f5']]);
    sparkle(g, r, 70, 0, H, 'rgba(255,255,255,.9)');
    g.fillStyle = 'rgba(150,180,220,.25)'; for (i = 0; i < 8; i++) ell(g, r() * W, 400 + r() * 170, 60 + r() * 40, 6, 'rgba(150,180,220,.22)', 0);
  };
  BG.desert = function (g, m, r) {
    var dh = 28 + (m * 4) % 12;
    skyFill(g, m, 360); glow(g, 600, 110, 220, 'rgba(255,240,190,.5)');
    hills(g, r, 360, 18, hsl(dh + 4, 60, 76), .007); hills(g, r, 400, 24, hsl(dh, 62, 70), .006);
    vgrad(g, 400, H, [[0, hsl(dh, 62, 66)], [1, hsl(dh - 4, 56, 54)]]);
    for (var i = 0; i < 7; i++) { var y = 430 + i * 22; g.beginPath(); g.moveTo(0, y); for (var x = 0; x <= W; x += 16) g.lineTo(x, y + Math.sin(x * .02 + i) * 5); g.lineWidth = 1.6; g.strokeStyle = hsl(dh, 50, 56, .45); g.stroke(); }
  };
  BG.castle = function (g, m, r) {
    var gh = 100 + (m * 8) % 50;
    skyFill(g, m, 380);
    hills(g, r, 280, 50, 'rgba(110,100,160,.45)', .005); hills(g, r, 330, 36, hsl(gh + 30, 35, 66), .006); hills(g, r, 370, 24, hsl(gh + 10, 45, 56), .008);
    vgrad(g, 340, H, [[0, hsl(gh, 52, 48)], [1, hsl(gh, 55, 34)]]);
    g.beginPath(); g.moveTo(330, H); g.bezierCurveTo(360, 520, 440, 470, 410, 400); g.lineTo(440, 400); g.bezierCurveTo(480, 480, 420, 540, 500, H); g.closePath(); g.fillStyle = hsl(36, 40, 70, .55); g.fill();
    tufts(g, r, 360, 60, hsl(gh, 50, 26));
  };
  BG.party = function (g, m, r) {
    var hp = (m * 36 + 330) % 360, i;
    g.fillStyle = hsl(hp, 70, 90); g.fillRect(0, 0, W, 330);
    if (m % 2 === 0) { g.fillStyle = hsl(hp, 70, 82); for (i = 0; i < 20; i++) g.fillRect(i * 44, 0, 22, 330); }
    else { g.fillStyle = hsl(hp + 20, 70, 82); for (i = 0; i < 18; i++) for (var j = 0; j < 8; j++) { g.beginPath(); g.arc(i * 46 + (j % 2) * 23, j * 44 + 20, 7, 0, TAU); g.fill(); } }
    g.fillStyle = hsl(hp, 50, 40, .25); g.fillRect(0, 322, W, 12);
    g.fillStyle = hsl(hp + 180, 55, 62); g.fillRect(0, 334, W, H - 334);
    g.fillStyle = 'rgba(255,255,255,.28)'; for (i = 0; i < 20; i++) g.fillRect(i * 44, 334, 22, H - 334);
    g.fillStyle = 'rgba(255,255,255,.22)'; for (i = 0; i < 14; i++) g.fillRect(0, 334 + i * 44, W, 22);
    for (i = 0; i < 9; i++) { poly(g, [i * 100 + 6, 0, i * 100 + 50, 0, i * 100 + 28, 30], hsl(hp + i * 40, 75, 62), 1.4); }
  };

  function drawBackground(g, theme, mood, seed) {
    var r = mulberry32((seed | 0) ^ 0x5bd1e995);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    BG[theme](g, mood, r);
    g.restore();
  }

  root.TKBArt = { W: W, H: H, TYPES: T, META: META, BG: BG, drawObject: drawObject, drawBackground: drawBackground, mulberry32: mulberry32, hsl: hsl };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.TKBArt;
})(typeof window !== 'undefined' ? window : globalThis);
