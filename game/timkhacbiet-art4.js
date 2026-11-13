/* Tìm điểm khác biệt — con vật và nhân vật vẽ lại chi tiết hơn (dáng cong bằng bezier, mắt bóng, má hồng, lông/vảy/vân).
   Giữ đúng ý nghĩa tham số của bản cũ: o.v = kiểu dáng, o.p = số hoạ tiết (mỗi đơn vị phải thấy rõ), o.m = nét mặt,
   vật "asym" phải trông khác khi lật ngang. Nạp sau timkhacbiet-art3.js; số đo ở timkhacbiet-meta.js (tool/timkhacbiet-meta). */
(function (root) {
  'use strict';
  var A = root.TKBArt, L = A.lib, def = A.def;
  var TAU = L.TAU, OL = L.OL;
  var mouth = L.mouth, fs = L.fs, circ = L.circ, ell = L.ell, poly = L.poly, rrect = L.rrect, line = L.line, arc = L.arc, blob = L.blob,
      clipStripes = L.clipStripes, sb = L.sb, eye2 = L.eye2, blush = L.blush;
  var INK = '#1b1420';

  /* tô một đường đã dựng (path) có đổ khối theo khung b */
  function shape(g, path, fill, lw, b) { path(); sb(b); fs(g, fill, lw); }
  /* cắt theo đường rồi vẽ bên trong (hoạ tiết nằm gọn trong thân) */
  function inside(g, path, fn) { g.save(); path(); g.clip(); fn(); g.restore(); }
  function stroke(g, path, w, col) { path(); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
  /* nét đôi: viền tối rồi màu (đuôi, chân mảnh) */
  function cord(g, path, w, col) { stroke(g, path, w + 2.6, OL); stroke(g, path, w, col); }
  function whiskers(g, x, y, s, col) {
    for (var i = -1; i <= 1; i += 2) {
      line(g, x + i * 6 * s, y, x + i * 20 * s, y - 3 * s, 1.1, col); line(g, x + i * 6 * s, y + 2.5 * s, x + i * 20 * s, y + 4 * s, 1.1, col);
    }
  }
  function toes(g, x, y, r, col) { circ(g, x - r * .9, y, r * .55, col, 0); circ(g, x, y - r * .25, r * .55, col, 0); circ(g, x + r * .9, y, r * .55, col, 0); }

  /* ===================== thú cưng (trong nhà) ===================== */
  def('cat', { w: 74, h: 88, zone: 'floor', hue: [20, 40], sat: 70, lit: 58, vmax: 2, asym: true, pat: [1, 4], mood: true, draw: function (g, o, c) {
    var i, tail = function () { g.beginPath(); if (o.v === 0) { g.moveTo(14, 32); g.bezierCurveTo(40, 30, 42, 8, 34, -6); } else { g.moveTo(12, 38); g.bezierCurveTo(40, 44, 44, 26, 32, 22); } };
    cord(g, tail, 7, c(0, 0, -4));
    stroke(g, function () { g.beginPath(); if (o.v === 0) { g.moveTo(39, 6); g.quadraticCurveTo(40, 0, 34, -6); } else { g.moveTo(40, 30); g.quadraticCurveTo(38, 24, 32, 22); } }, 7, c(0, -10, -22));
    var body = function () { g.beginPath(); g.moveTo(-8, -6); g.bezierCurveTo(-26, 2, -26, 30, -18, 40); g.lineTo(18, 40); g.bezierCurveTo(26, 30, 26, 2, 8, -6); g.closePath(); };
    shape(g, body, c(), 2, [-24, -6, 24, 40, 1]);
    var P = [[-14, 18], [14, 10], [-8, 33], [15, 30]];
    inside(g, body, function () { for (i = 0; i < o.p; i++) blob(g, [[P[i][0], P[i][1], 7, 6], [P[i][0] + 4, P[i][1] - 3, 4.5]], c(0, 6, -26)); });
    shape(g, function () { g.beginPath(); g.moveTo(-7, -2); g.bezierCurveTo(-12, 12, -8, 26, 0, 30); g.bezierCurveTo(8, 26, 12, 12, 7, -2); g.closePath(); }, c(0, -30, 30), 0, [-10, -2, 10, 30, 0]);
    ell(g, -9, 38, 7.5, 5, c(0, -20, 18), 1.6); ell(g, 9, 38, 7.5, 5, c(0, -20, 18), 1.6);
    line(g, -10, 36, -10, 40, 1, OL); line(g, -7, 36, -7, 40, 1, OL); line(g, 8, 36, 8, 40, 1, OL); line(g, 11, 36, 11, 40, 1, OL);
    poly(g, [-19, -26, -15, -47, -3, -36], c()); poly(g, [19, -26, 15, -47, 3, -36], c());
    poly(g, [-15.5, -31, -14, -42, -7, -36], '#f6aab8', 0); poly(g, [15.5, -31, 14, -42, 7, -36], '#f6aab8', 0);
    var head = function () { g.beginPath(); g.ellipse(0, -20, 22, 18.5, 0, 0, TAU); };
    shape(g, head, c(), 2, [-22, -38.5, 22, -1.5, 1]);
    inside(g, head, function () { for (i = -1; i <= 1; i++) line(g, i * 5, -38, i * 4, -31, 2.6, c(0, 6, -24)); });
    ell(g, 0, -12, 11, 7, c(0, -30, 30), 0);
    ell(g, -8.5, -22, 5, 5.6, '#cfe86a', 1.2); ell(g, 8.5, -22, 5, 5.6, '#cfe86a', 1.2);
    ell(g, -8.5, -22, 1.8, 4.6, INK, 0); ell(g, 8.5, -22, 1.8, 4.6, INK, 0);
    circ(g, -7, -24, 1.4, '#fff', 0); circ(g, 10, -24, 1.4, '#fff', 0);
    blush(g, -14, -14, 4); blush(g, 14, -14, 4);
    poly(g, [-3, -15.5, 3, -15.5, 0, -12.5], '#e87a8e', 1);
    whiskers(g, 0, -12, 1, 'rgba(255,255,255,.9)');
    mouth(g, o.m || 0, 0, -9, 15, '#3a2016');
  } });

  def('dog', { w: 78, h: 88, zone: 'floor', hue: [24, 36], sat: 45, lit: 62, vmax: 2, asym: true, pat: [1, 4], mood: true, draw: function (g, o, c) {
    var i;
    cord(g, function () { g.beginPath(); g.moveTo(14, 30); g.bezierCurveTo(30, 30, 36, 18, 38, 2); }, 7, c(0, 0, -6));
    var body = function () { g.beginPath(); g.moveTo(-9, -4); g.bezierCurveTo(-26, 4, -26, 32, -18, 40); g.lineTo(18, 40); g.bezierCurveTo(26, 32, 26, 4, 9, -4); g.closePath(); };
    shape(g, body, c(), 2, [-24, -4, 24, 40, 1]);
    var P = [[-13, 16], [13, 22], [10, 6], [-12, 32]];
    inside(g, body, function () { for (i = 0; i < o.p; i++) blob(g, [[P[i][0], P[i][1], 6.5, 5.5], [P[i][0] - 3, P[i][1] + 3, 4]], c(0, 4, -28)); });
    ell(g, 0, 16, 9, 14, c(0, -20, 24), 0);
    rrect(g, -14, 22, 9, 18, 4.5, c()); rrect(g, 5, 22, 9, 18, 4.5, c());
    ell(g, -9.5, 39, 6, 3.6, c(0, -10, 16), 1.4); ell(g, 9.5, 39, 6, 3.6, c(0, -10, 16), 1.4);
    rrect(g, -14, -3, 28, 6, 3, '#e5392e', 1.4); circ(g, 0, 6, 3.6, '#ffd23f', 1.2); circ(g, -1, 5, 1.2, 'rgba(255,255,255,.8)', 0);
    if (o.v === 1) { poly(g, [-19, -24, -15, -47, -3, -34], c(0, 0, -24)); poly(g, [19, -24, 15, -47, 3, -34], c(0, 0, -24)); poly(g, [-15, -28, -14, -40, -8, -33], '#e8a0a8', 0); poly(g, [15, -28, 14, -40, 8, -33], '#e8a0a8', 0); }
    var head = function () { g.beginPath(); g.moveTo(0, -38); g.bezierCurveTo(16, -38, 21, -26, 19, -16); g.bezierCurveTo(17, -4, 8, -2, 0, -2); g.bezierCurveTo(-8, -2, -17, -4, -19, -16); g.bezierCurveTo(-21, -26, -16, -38, 0, -38); g.closePath(); };
    shape(g, head, c(), 2, [-20, -38, 20, -2, 1]);
    inside(g, head, function () { ell(g, -8, -24, 7, 8, c(0, 4, -18), 0); });
    if (o.v === 0) {
      shape(g, function () { g.beginPath(); g.moveTo(-14, -34); g.bezierCurveTo(-30, -34, -30, -10, -22, -6); g.bezierCurveTo(-16, -4, -14, -16, -12, -26); g.closePath(); }, c(0, 4, -26), 1.8, [-28, -34, -12, -5, 0]);
      shape(g, function () { g.beginPath(); g.moveTo(14, -34); g.bezierCurveTo(30, -34, 30, -10, 22, -6); g.bezierCurveTo(16, -4, 14, -16, 12, -26); g.closePath(); }, c(0, 4, -26), 1.8, [12, -34, 28, -5, 0]);
    }
    ell(g, 0, -10, 11.5, 8.5, c(0, -24, 26), 0);
    ell(g, 0, -14.5, 4.6, 3.4, INK, 0); ell(g, -1.2, -15.6, 1.6, 1, 'rgba(255,255,255,.7)', 0);
    eye2(g, -8, -23, 3.2); eye2(g, 8, -23, 3.2);
    arc(g, -8, -29, 4, Math.PI * 1.15, Math.PI * 1.85, 1.6, c(0, 0, -34)); arc(g, 8, -29, 4, Math.PI * 1.15, Math.PI * 1.85, 1.6, c(0, 0, -34));
    if (!o.m) { g.save(); g.beginPath(); g.ellipse(0, -2.5, 3.4, 4.2, 0, 0, TAU); fs(g, '#ef6f86', 1); g.restore(); }
    mouth(g, o.m || 0, 0, -7, 16, INK);
  } });

  def('hamster', { w: 60, h: 50, zone: 'floor', hue: [28, 38], sat: 70, lit: 62, pat: [1, 3], mood: true, draw: function (g, o, c) {
    circ(g, -16, -16, 6.8, c(), 1.6); circ(g, 16, -16, 6.8, c(), 1.6); circ(g, -16, -16, 3.8, '#f4a6b4', 0); circ(g, 16, -16, 3.8, '#f4a6b4', 0);
    var body = function () { g.beginPath(); g.moveTo(0, -20); g.bezierCurveTo(20, -20, 28, -6, 27, 6); g.bezierCurveTo(26, 18, 14, 23, 0, 23); g.bezierCurveTo(-14, 23, -26, 18, -27, 6); g.bezierCurveTo(-28, -6, -20, -20, 0, -20); g.closePath(); };
    shape(g, body, c(), 2, [-27, -20, 27, 23, 1]);
    var P = [[-19, -5], [19, -5], [0, -16]], i;
    inside(g, body, function () { for (i = 0; i < o.p; i++) ell(g, P[i][0], P[i][1], 7.5, 6.4, c(4, 4, -24), 0); });
    shape(g, function () { g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(12, -6, 18, 2, 17, 10); g.bezierCurveTo(16, 19, 8, 22, 0, 22); g.bezierCurveTo(-8, 22, -16, 19, -17, 10); g.bezierCurveTo(-18, 2, -12, -6, 0, -6); g.closePath(); }, '#fff6e6', 0, [-17, -6, 17, 22, 1]);
    eye2(g, -8.5, -4, 3); eye2(g, 8.5, -4, 3);
    blush(g, -14, 5, 4.4); blush(g, 14, 5, 4.4);
    ell(g, 0, 1, 2.2, 1.6, '#e07a8a', 0);
    whiskers(g, 0, 3, .7, 'rgba(90,50,30,.45)');
    mouth(g, o.m || 0, 0, 8, 18, '#5a3020');
    ell(g, -10, 16, 3.4, 2.8, '#f4c2b0', 1.2); ell(g, 10, 16, 3.4, 2.8, '#f4c2b0', 1.2);
    ell(g, -9, 22, 5, 3, '#f4c2b0', 1.2); ell(g, 9, 22, 5, 3, '#f4c2b0', 1.2);
  } });

  def('mouse', { w: 66, h: 36, zone: 'floor', hue: [210, 230], sat: 8, lit: 66, low: true, vmax: 2, asym: true, draw: function (g, o, c) {
    stroke(g, function () { g.beginPath(); g.moveTo(-20, 8); g.bezierCurveTo(-34, 14, -40, 4, -32, -4); g.quadraticCurveTo(-28, -8, -30, -12); }, 2.6, '#e39aa6');
    var body = function () { g.beginPath(); g.moveTo(30, 3); g.bezierCurveTo(24, -12, 4, -12, -10, -8); g.bezierCurveTo(-24, -4, -26, 12, -14, 15); g.lineTo(18, 14); g.bezierCurveTo(26, 12, 31, 8, 30, 3); g.closePath(); };
    shape(g, body, c(), 2, [-24, -12, 30, 15, 1]);
    ell(g, 2, 8, 12, 5, c(0, 0, 14), 0);
    ell(g, -8, 15, 5, 2.6, '#f4b2bc', 1.2); ell(g, 14, 15, 5, 2.6, '#f4b2bc', 1.2);
    circ(g, 9, -12, 9, c(), 1.8); circ(g, 9, -12, 5.6, '#f4a6b4', 0);
    circ(g, 30, 3, 2.8, '#e0707e', 1); eye2(g, 19, -2, 2.6);
    whiskers(g, 27, 4, .6, 'rgba(60,50,70,.5)');
    if (o.v === 1) { poly(g, [20, 7, 40, 12, 22, 18], '#ffd23f', 1.4); circ(g, 27, 12, 1.6, '#e2a91e', 0); circ(g, 33, 12, 1.1, '#e2a91e', 0); }
  } });

  def('parrot', { w: 56, h: 104, zone: 'floor', hue: [100, 140], sat: 70, lit: 45, asym: true, pat: [2, 4], draw: function (g, o, c) {
    rrect(g, -2, 20, 4, 28, 2, '#8a5a30'); ell(g, 0, 48, 15, 3.6, '#7a4c26', 1.4); rrect(g, -22, 18, 44, 5, 2.5, '#9a6a3a', 1.4);
    var F = ['#e5392e', '#ffd23f', '#3b82f6', '#f59e2a'], i;
    for (i = 0; i < o.p; i++) {
      g.save(); g.translate(-4, 12); g.rotate(.25 + (i - 1.5) * .2);
      shape(g, function () { g.beginPath(); g.moveTo(-4, 0); g.quadraticCurveTo(-5, 22, 0, 36); g.quadraticCurveTo(5, 22, 4, 0); g.closePath(); }, F[i], 1.2, [-5, 0, 5, 36, 0]);
      line(g, 0, 4, 0, 32, .9, 'rgba(0,0,0,.25)');
      g.restore();
    }
    var body = function () { g.beginPath(); g.moveTo(4, -30); g.bezierCurveTo(18, -24, 16, 6, 6, 18); g.lineTo(-6, 18); g.bezierCurveTo(-16, 6, -14, -20, 4, -30); g.closePath(); };
    shape(g, body, c(), 2, [-15, -30, 16, 18, 1]);
    shape(g, function () { g.beginPath(); g.moveTo(-8, -14); g.bezierCurveTo(-18, -2, -12, 14, -4, 18); g.bezierCurveTo(2, 8, 2, -6, -8, -14); g.closePath(); }, c(0, 0, -12), 1.4, [-16, -14, 2, 18, 0]);
    for (i = 0; i < 3; i++) arc(g, -6, -2 + i * 6, 5, .3, 2.2, 1.2, c(0, 0, -24));
    line(g, -4, 17, -6, 21, 2.6, '#555'); line(g, 4, 17, 6, 21, 2.6, '#555');
    circ(g, 4, -29, 11.5, c(), 2);
    shape(g, function () { g.beginPath(); g.ellipse(7, -29, 7, 6, 0, 0, TAU); }, '#fff8ea', 0, [0, -35, 14, -23, 1]);
    eye2(g, 8, -30, 2.4);
    shape(g, function () { g.beginPath(); g.moveTo(13, -33); g.bezierCurveTo(24, -34, 26, -22, 18, -19); g.quadraticCurveTo(19, -24, 13, -24); g.closePath(); }, '#ffb32e', 1.4, [13, -34, 25, -19, 0]);
    line(g, 13, -26, 20, -25, 1, 'rgba(0,0,0,.35)');
  } });

  def('teddy', { w: 70, h: 84, zone: 'floor', hue: [22, 36], sat: 50, lit: 50, pat: [1, 3], mood: true, draw: function (g, o, c) {
    var i;
    ell(g, -16, 30, 11.5, 9.5, c(0, 0, -6)); ell(g, 16, 30, 11.5, 9.5, c(0, 0, -6));
    circ(g, -16, 32, 5.2, c(0, -10, 20), 0); circ(g, 16, 32, 5.2, c(0, -10, 20), 0);
    toes(g, -16, 26.5, 2.6, c(0, -10, 20)); toes(g, 16, 26.5, 2.6, c(0, -10, 20));
    ell(g, -24, 8, 7.5, 12.5, c(0, 0, -6), 2, .4); ell(g, 24, 8, 7.5, 12.5, c(0, 0, -6), 2, -.4);
    var body = function () { g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(16, -6, 22, 10, 21, 18); g.bezierCurveTo(20, 30, 10, 34, 0, 34); g.bezierCurveTo(-10, 34, -20, 30, -21, 18); g.bezierCurveTo(-22, 10, -16, -6, 0, -6); g.closePath(); };
    shape(g, body, c(), 2, [-21, -6, 21, 34, 1]);
    ell(g, 0, 16, 13, 14, c(0, -10, 16), 0);
    g.save(); g.setLineDash([2.4, 2.4]); g.beginPath(); g.ellipse(0, 16, 11, 12, 0, 0, TAU); g.lineWidth = 1.1; g.strokeStyle = c(0, 0, -20); g.stroke(); g.restore();
    var P = [[-5, 10], [6, 16], [-3, 23]];
    for (i = 0; i < o.p; i++) { g.save(); g.translate(P[i][0], P[i][1]); g.beginPath(); g.moveTo(0, 4.5); g.bezierCurveTo(-8, -1, -4, -7, 0, -3); g.bezierCurveTo(4, -7, 8, -1, 0, 4.5); sb([-6, -6, 6, 4.5, 1]); fs(g, '#e5392e', 1); g.restore(); }
    circ(g, -15, -36, 8.5, c(), 2); circ(g, 15, -36, 8.5, c(), 2); circ(g, -15, -36, 4.4, c(0, -10, 16), 0); circ(g, 15, -36, 4.4, c(0, -10, 16), 0);
    circ(g, 0, -22, 19.5, c());
    ell(g, 0, -14.5, 11, 8.4, c(0, -10, 20), 0);
    eye2(g, -7.5, -27, 2.8); eye2(g, 7.5, -27, 2.8);
    ell(g, 0, -19, 3.8, 2.7, INK, 0); circ(g, -1, -20, .9, 'rgba(255,255,255,.7)', 0);
    blush(g, -12, -17, 3.6); blush(g, 12, -17, 3.6);
    mouth(g, o.m || 0, 0, -13, 14, INK);
  } });

  def('dino', { w: 100, h: 76, zone: 'floor', hue: [90, 160], sat: 55, lit: 48, asym: true, pat: [3, 6], mood: true, draw: function (g, o, c) {
    var n = o.p, i, t, x, yb;
    /* gai lưng nằm dọc theo cung lưng */
    for (i = 0; i < n; i++) {
      t = (i + .5) / 6; x = -38 + t * 42;
      yb = -14 + Math.pow(Math.min(0, x + 6) / 34, 2) * 16;
      poly(g, [x - 5.5, yb + 5, x - 1, yb - 9, x + 5.5, yb + 5], '#f59e2a', 1.4);
    }
    rrect(g, -20, 8, 11, 22, 5, c(0, 0, -10)); rrect(g, 6, 8, 11, 22, 5, c(0, 0, -10));
    var body = function () {
      g.beginPath(); g.moveTo(-52, 18); g.bezierCurveTo(-40, 14, -34, -14, -6, -14); g.bezierCurveTo(10, -14, 14, -18, 18, -26);
      g.bezierCurveTo(22, -34, 44, -34, 44, -20); g.bezierCurveTo(44, -10, 32, -8, 22, -6); g.bezierCurveTo(22, 6, 16, 20, 0, 20); g.bezierCurveTo(-16, 22, -32, 20, -52, 18); g.closePath();
    };
    shape(g, body, c(), 2, [-52, -32, 44, 21, 1]);
    shape(g, function () { g.beginPath(); g.moveTo(-26, 16); g.bezierCurveTo(-18, 6, 10, 4, 18, 8); g.bezierCurveTo(14, 18, 0, 20, -26, 16); g.closePath(); }, c(-20, -10, 22), 0, [-26, 4, 18, 20, 0]);
    for (i = 0; i < 3; i++) arc(g, -6 + i * 8, 30, 20, -1.85, -1.6, 1, c(0, 0, -18));
    rrect(g, -14, 14, 11, 18, 5, c()); rrect(g, 10, 14, 11, 18, 5, c());
    toes(g, -8.5, 32, 2.6, '#fff8e8'); toes(g, 15.5, 32, 2.6, '#fff8e8');
    ell(g, 21, 0, 4, 6, c(0, 0, -6), 1.4, .5);
    eye2(g, 31, -24, 3.2);
    circ(g, 41, -22, 1.2, c(0, 0, -30), 0);
    blush(g, 34, -15, 3.6);
    mouth(g, o.m || 0, 34, -13, 16, INK);
  } });

  /* ===================== trang trại, rừng ===================== */
  def('sheep', { w: 74, h: 58, zone: 'ground', hue: [0, 360], sat: 50, lit: 90, vmax: 3, asym: true, low: true, mood: true, pat: [0, 3], draw: function (g, o, c) {
    var i;
    [-26, -14, 4, 16].forEach(function (x) { rrect(g, x - 3, 10, 6, 17, 3, '#3c3340', 1.4); rrect(g, x - 3.4, 23, 6.8, 4, 1.6, '#1e1822', 0); });
    var W = [[-24, -4, 11], [-14, -12, 12], [0, -15, 12], [14, -12, 12], [22, -2, 10], [16, 9, 11], [2, 12, 12], [-12, 11, 12], [-24, 6, 10], [-2, -2, 18, 14]];
    blob(g, W, c());
    for (i = 0; i < 7; i++) arc(g, -18 + (i % 4) * 11 + (i > 3 ? 5 : 0), -6 + (i > 3 ? 10 : 0), 3.6, .5, 2.6, 1.1, c(0, 0, -7));
    var P = [[-17, -4], [4, -10], [-4, 7]];
    for (i = 0; i < o.p; i++) blob(g, [[P[i][0], P[i][1], 6, 5], [P[i][0] + 4, P[i][1] + 2, 4.5], [P[i][0] - 4, P[i][1] + 2, 4]], '#5e5262');
    ell(g, 21, -6, 4.5, 7, '#3c3340', 1.4, .9);
    var head = function () { g.beginPath(); g.moveTo(26, -10); g.bezierCurveTo(34, -10, 38, -2, 36, 6); g.bezierCurveTo(34, 12, 26, 12, 23, 6); g.bezierCurveTo(20, 0, 20, -10, 26, -10); g.closePath(); };
    shape(g, head, '#3c3340', 1.8, [21, -10, 37, 11, 1]);
    blob(g, [[25, -11, 4.5], [30, -12, 4.5], [34, -9, 3.6]], c());
    ell(g, 36, -3, 4.4, 7, '#3c3340', 1.4, -.6);
    circ(g, 29, -3, 3, '#fff', 0); circ(g, 30, -3, 1.6, INK, 0); circ(g, 30.6, -3.7, .6, '#fff', 0);
    mouth(g, o.m || 0, 30, 5, 12.5, '#f7e4ee');
    if (o.v === 1) { arc(g, 26, 6, 7, .5, 2.4, 2, '#c0392b'); circ(g, 24, 14, 4.2, '#ffd23f', 1.5); line(g, 22, 15.5, 26, 15.5, 1, '#9a7410'); }
    if (o.v === 2) { poly(g, [26, -15, 34, -10, 34, -20], '#ff6fa5', 1.2); poly(g, [26, -15, 18, -20, 18, -10], '#ff6fa5', 1.2); circ(g, 26, -15, 2.4, '#ff3d86', 1); }
  } });

  def('cow', { w: 98, h: 66, zone: 'ground', hue: [20, 30], sat: 30, lit: 22, asym: true, pat: [1, 5], mood: true, draw: function (g, o, c) {
    var i, WH = '#f6f3ec';
    cord(g, function () { g.beginPath(); g.moveTo(-34, -6); g.bezierCurveTo(-42, 0, -42, 10, -40, 18); }, 2.6, WH);
    ell(g, -40, 20, 3, 4.4, c(), 1.2);
    [-28, -19, 18, 27].forEach(function (x) { rrect(g, x - 3.6, 6, 7.2, 22, 3, WH, 1.6); rrect(g, x - 3.8, 25, 7.6, 5, 1.8, '#3a2d26', 0); });
    var body = function () { g.beginPath(); g.moveTo(-26, -16); g.bezierCurveTo(-8, -20, 14, -14, 28, -16); g.bezierCurveTo(38, -16, 40, 8, 30, 14); g.bezierCurveTo(12, 18, -12, 18, -30, 14); g.bezierCurveTo(-40, 8, -40, -14, -26, -16); g.closePath(); };
    shape(g, body, WH, 2, [-38, -18, 38, 17, 0]);
    var P = [[-20, -6, 9, 7], [4, -8, 8, 7], [-6, 8, 7, 5], [20, 4, 7, 6], [-30, 4, 5, 6]];
    inside(g, body, function () {
      for (i = 0; i < o.p; i++) blob(g, [[P[i][0], P[i][1], P[i][2], P[i][3]], [P[i][0] + P[i][2] * .6, P[i][1] - P[i][3] * .5, P[i][2] * .55], [P[i][0] - P[i][2] * .5, P[i][1] + P[i][3] * .5, P[i][2] * .5]], c());
    });
    ell(g, -6, 16, 7, 4, '#f4a6b4', 1.2); circ(g, -10, 19, 1.6, '#f4a6b4', 1); circ(g, -2, 19, 1.6, '#f4a6b4', 1);
    ell(g, 30, -22, 6, 3.4, c(), 1.4, -.5);
    var head = function () { g.beginPath(); g.moveTo(36, -26); g.bezierCurveTo(46, -26, 50, -16, 49, -8); g.lineTo(32, -8); g.bezierCurveTo(30, -16, 30, -26, 36, -26); g.closePath(); };
    shape(g, head, WH, 2, [31, -26, 49, -8, 1]);
    stroke(g, function () { g.beginPath(); g.moveTo(35, -25); g.quadraticCurveTo(31, -30, 33, -34); g.moveTo(44, -25); g.quadraticCurveTo(48, -30, 46, -34); }, 2.6, '#d9c9a8');
    ell(g, 40, -21, 4, 3, c(), 0);
    shape(g, function () { g.beginPath(); g.ellipse(41, -4, 10, 7, 0, 0, TAU); }, '#f4b8c0', 1.6, [31, -11, 51, 3, 1]);
    ell(g, 37.5, -5, 1.6, 1.2, '#a0525e', 0); ell(g, 44.5, -5, 1.6, 1.2, '#a0525e', 0);
    eye2(g, 36, -16, 2.2); eye2(g, 45, -16, 2.2);
    mouth(g, o.m || 0, 41, -1, 14, '#6a1f40');
  } });

  def('bunny', { w: 50, h: 70, zone: 'ground', hue: [0, 360], sat: 20, lit: 88, vmax: 3, low: true, mood: true, draw: function (g, o, c) {
    var down = o.v === 2;
    if (down) { ell(g, -14, -12, 5.5, 15, c(0, 0, -6), 2, 1.15); ell(g, 14, -12, 5.5, 15, c(0, 0, -6), 2, -1.15); ell(g, -14, -12, 2.4, 10, '#ffc4d4', 0, 1.15); ell(g, 14, -12, 2.4, 10, '#ffc4d4', 0, -1.15); }
    else { ell(g, -8, -27, 5.8, 17, c(0, 0, -4), 2, -.12); ell(g, 8, -27, 5.8, 17, c(0, 0, -4), 2, .12); ell(g, -8, -26, 2.6, 11.5, '#ffc4d4', 0, -.12); ell(g, 8, -26, 2.6, 11.5, '#ffc4d4', 0, .12); }
    var body = function () { g.beginPath(); g.moveTo(0, 2); g.bezierCurveTo(14, 2, 20, 18, 18, 28); g.bezierCurveTo(16, 37, 8, 38, 0, 38); g.bezierCurveTo(-8, 38, -16, 37, -18, 28); g.bezierCurveTo(-20, 18, -14, 2, 0, 2); g.closePath(); };
    shape(g, body, c(), 2, [-18, 2, 18, 38, 1]);
    ell(g, 0, 24, 9, 11, c(0, 0, 8), 0);
    ell(g, -9, 37, 7.5, 4, c(0, 0, -2), 1.6); ell(g, 9, 37, 7.5, 4, c(0, 0, -2), 1.6);
    ell(g, -8, 20, 4, 6, c(0, 0, -2), 1.4, .3); ell(g, 8, 20, 4, 6, c(0, 0, -2), 1.4, -.3);
    var head = function () { g.beginPath(); g.ellipse(0, -5, 16, 14.5, 0, 0, TAU); };
    shape(g, head, c(), 2, [-16, -19.5, 16, 9.5, 1]);
    ell(g, -4, 0, 5, 4, c(0, 0, 8), 0); ell(g, 4, 0, 5, 4, c(0, 0, 8), 0);
    eye2(g, -6, -8, 2.6); eye2(g, 6, -8, 2.6);
    blush(g, -10, -1, 3.4); blush(g, 10, -1, 3.4);
    poly(g, [-2.4, -3, 2.4, -3, 0, -.6], '#ff8fa8', .8);
    mouth(g, o.m || 0, 0, 2.5, 13, '#7a3a50');
    if (o.v === 1) {
      shape(g, function () { g.beginPath(); g.moveTo(13, 12); g.quadraticCurveTo(26, 14, 32, 26); g.quadraticCurveTo(22, 24, 13, 20); g.closePath(); }, '#ff8a2e', 1.5, [13, 12, 32, 26, 0]);
      line(g, 18, 15, 19, 19, 1, 'rgba(0,0,0,.25)'); line(g, 23, 18, 24, 22, 1, 'rgba(0,0,0,.25)');
      poly(g, [13, 14, 8, 6, 12, 7, 14, 4, 16, 10], '#4fae48', 1.2);
    }
  } });

  def('deer', { w: 86, h: 86, zone: 'ground', hue: [22, 34], sat: 50, lit: 46, vmax: 2, asym: true, pat: [2, 6], draw: function (g, o, c) {
    var i;
    [[-24, -1], [-15, 1], [16, -1], [25, 1]].forEach(function (L2) { var x = L2[0];
      shape(g, function () { g.beginPath(); g.moveTo(x - 3.4, 4); g.lineTo(x + 3.4, 4); g.lineTo(x + 2.2, 36); g.lineTo(x - 2.2, 36); g.closePath(); }, c(0, 0, -10 + L2[1] * 4), 1.6, [x - 3.4, 4, x + 3.4, 36, 0]);
      rrect(g, x - 2.6, 34, 5.2, 4, 1.4, '#2e2018', 0);
    });
    poly(g, [-30, -6, -38, -14, -34, -2], c(0, 0, -6), 1.2); ell(g, -34, -8, 3, 4.4, '#fff4e0', 0, .6);
    var body = function () { g.beginPath(); g.moveTo(-28, -8); g.bezierCurveTo(-12, -12, 14, -12, 24, -10); g.bezierCurveTo(34, -8, 34, 12, 22, 14); g.bezierCurveTo(4, 18, -14, 18, -26, 14); g.bezierCurveTo(-36, 10, -36, -6, -28, -8); g.closePath(); };
    shape(g, body, c(), 2, [-34, -12, 32, 16, 0]);
    inside(g, body, function () { ell(g, -2, 16, 26, 7, c(0, -20, 26), 0); });
    var P = [[-16, -2], [-4, 4], [8, -3], [-24, 5], [16, 5], [0, -6]];
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 3.9, '#fff4e0', 0);
    shape(g, function () { g.beginPath(); g.moveTo(18, -8); g.bezierCurveTo(22, -18, 26, -26, 30, -30); g.lineTo(38, -26); g.bezierCurveTo(34, -18, 32, -6, 30, 4); g.closePath(); }, c(0, 0, 4), 2, [18, -30, 38, 4, 0]);
    if (o.v === 0) stroke(g, function () { g.beginPath(); g.moveTo(32, -38); g.lineTo(28, -50); g.lineTo(22, -56); g.moveTo(28, -50); g.lineTo(34, -56); g.moveTo(37, -37); g.lineTo(41, -50); g.lineTo(37, -58); g.moveTo(41, -50); g.lineTo(47, -54); }, 3, '#6b4a2b');
    ell(g, 27, -38, 3.4, 7, c(0, 0, -4), 1.4, -.7); ell(g, 27, -38, 1.4, 4.4, '#f0c8b0', 0, -.7);
    var head = function () { g.beginPath(); g.moveTo(30, -40); g.bezierCurveTo(38, -42, 46, -34, 48, -28); g.bezierCurveTo(48, -24, 44, -22, 40, -23); g.bezierCurveTo(34, -24, 28, -28, 28, -34); g.closePath(); };
    shape(g, head, c(0, 0, 6), 2, [28, -42, 48, -22, 1]);
    circ(g, 47, -27, 2.2, INK, 0);
    eye2(g, 36, -33, 2.2);
    ell(g, 42, -24, 4, 1.6, '#fff4e0', 0);
  } });

  def('camel', { w: 116, h: 94, zone: 'ground', hue: [30, 40], sat: 55, lit: 60, vmax: 2, asym: true, pat: [0, 3], draw: function (g, o, c) {
    var i;
    [[-30, -8], [-21, 0], [22, -8], [31, 0]].forEach(function (L2) { var x = L2[0];
      shape(g, function () { g.beginPath(); g.moveTo(x - 4, 12); g.lineTo(x + 4, 12); g.lineTo(x + 3, 30); g.lineTo(x + 3.6, 46); g.lineTo(x - 3.6, 46); g.lineTo(x - 3, 30); g.closePath(); }, c(0, 0, L2[1]), 1.6, [x - 4, 12, x + 4, 46, 0]);
      circ(g, x, 30, 3.4, c(0, 0, L2[1] - 4), 0); ell(g, x, 47, 5, 2.4, c(0, -10, -20), 1);
    });
    cord(g, function () { g.beginPath(); g.moveTo(-38, -2); g.quadraticCurveTo(-46, 8, -44, 20); }, 2.4, c(0, 0, -6));
    ell(g, -44, 22, 2.6, 4, c(0, -10, -26), 0);
    var humps = o.v === 1 ? [[-14, 14, -38]] : [[-26, -6, -34], [2, 22, -34]];
    var body = function () {
      g.beginPath(); g.moveTo(-38, 0);
      humps.forEach(function (h) { g.lineTo(h[0], -8); g.bezierCurveTo(h[0] + 2, h[2], h[1] - 2, h[2], h[1], -8); });
      g.lineTo(30, -6); g.bezierCurveTo(42, -4, 42, 14, 30, 18); g.bezierCurveTo(8, 22, -20, 22, -32, 18); g.bezierCurveTo(-42, 14, -42, 2, -38, 0); g.closePath();
    };
    shape(g, body, c(), 2, [-42, -36, 40, 21, 0]);
    inside(g, body, function () { ell(g, 0, 22, 36, 7, c(0, -10, 14), 0); });
    shape(g, function () { g.beginPath(); g.moveTo(26, -4); g.bezierCurveTo(36, -10, 38, -30, 44, -40); g.lineTo(54, -38); g.bezierCurveTo(50, -28, 48, -8, 40, 12); g.closePath(); }, c(0, 0, 4), 2, [26, -40, 54, 12, 0]);
    shape(g, function () { g.beginPath(); g.moveTo(44, -44); g.bezierCurveTo(52, -50, 64, -48, 66, -42); g.bezierCurveTo(66, -36, 60, -34, 54, -35); g.bezierCurveTo(48, -35, 42, -38, 44, -44); g.closePath(); }, c(0, 0, 6), 2, [43, -49, 66, -34, 1]);
    ell(g, 46, -47, 2.4, 4, c(0, 0, -8), 1.2, -.5);
    eye2(g, 52, -44, 2.2); line(g, 50, -47, 49, -49, 1, INK); line(g, 52, -47.6, 52, -50, 1, INK);
    line(g, 63, -42, 65, -41, 1.4, c(0, 0, -40)); arc(g, 62, -37, 3, .2, 1.6, 1.2, c(0, 0, -40));
    var bx = -14, bw = 28;
    var blank = function () { g.beginPath(); g.moveTo(bx, -10); g.lineTo(bx + bw, -10); g.lineTo(bx + bw + 3, 8); g.lineTo(bx - 3, 8); g.closePath(); };
    shape(g, blank, '#d1495b', 1.4, [bx - 3, -10, bx + bw + 3, 8, 0]);
    inside(g, blank, function () { for (i = 0; i < o.p; i++) { var x = bx - 3 + (i + 1) * (bw + 6) / (o.p + 1); rrect(g, x - 2.4, -12, 4.8, 22, 0, '#ffd23f', 0); } });
    for (i = 0; i <= 4; i++) circ(g, bx - 3 + i * (bw + 6) / 4, 10, 1.6, '#ffd23f', .8);
  } });

  def('owl', { w: 54, h: 68, zone: 'ground', hue: [20, 40], sat: 40, lit: 45, vmax: 2, pat: [2, 5], draw: function (g, o, c) {
    var i;
    poly(g, [-18, -20, -14, -36, -5, -25], c(0, 0, -8)); poly(g, [18, -20, 14, -36, 5, -25], c(0, 0, -8));
    var body = function () { g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(18, -28, 24, -14, 23, 4); g.bezierCurveTo(22, 24, 12, 32, 0, 32); g.bezierCurveTo(-12, 32, -22, 24, -23, 4); g.bezierCurveTo(-24, -14, -18, -28, 0, -28); g.closePath(); };
    shape(g, body, c(), 2, [-23, -28, 23, 32, 1]);
    shape(g, function () { g.beginPath(); g.moveTo(-20, -2); g.bezierCurveTo(-28, 10, -24, 24, -14, 28); g.bezierCurveTo(-12, 16, -12, 4, -20, -2); g.closePath(); }, c(0, 0, -12), 1.6, [-26, -2, -12, 28, 0]);
    shape(g, function () { g.beginPath(); g.moveTo(20, -2); g.bezierCurveTo(28, 10, 24, 24, 14, 28); g.bezierCurveTo(12, 16, 12, 4, 20, -2); g.closePath(); }, c(0, 0, -12), 1.6, [12, -2, 26, 28, 0]);
    ell(g, 0, 14, 12.5, 15, c(0, -14, 24), 0);
    var P = [[-5, 5], [5, 5], [0, 12], [-5, 19], [5, 19]];
    for (i = 0; i < o.p; i++) { g.beginPath(); g.moveTo(P[i][0] - 4.5, P[i][1] - 2.5); g.quadraticCurveTo(P[i][0], P[i][1] + 4, P[i][0] + 4.5, P[i][1] - 2.5); g.lineWidth = 2.6; g.strokeStyle = c(0, 0, -24); g.lineCap = 'round'; g.stroke(); }
    circ(g, -9, -9, 10, c(0, -14, 20), 0); circ(g, 9, -9, 10, c(0, -14, 20), 0);
    toes(g, -7, 32, 2.6, '#e69a2c'); toes(g, 7, 32, 2.6, '#e69a2c');
    if (o.v === 1) { arc(g, -9, -10, 6, .2, Math.PI - .2, 2.6, '#2a1d14'); arc(g, 9, -10, 6, .2, Math.PI - .2, 2.6, '#2a1d14'); }
    else { circ(g, -9, -9, 7.6, '#ffc93a', 1.4); circ(g, 9, -9, 7.6, '#ffc93a', 1.4); eye2(g, -9, -9, 4.4); eye2(g, 9, -9, 4.4); }
    poly(g, [-4, -3, 4, -3, 0, 5], '#e69a2c', 1.4);
  } });

  def('penguin', { w: 56, h: 80, zone: 'ground', hue: [0, 360], sat: 80, lit: 55, vmax: 2, asym: true, pat: [0, 3], draw: function (g, o, c) {
    var DK = c(0, -28, -22), i;
    ell(g, -10, 36, 9, 4.5, '#ff9d2e', 1.4); ell(g, 10, 36, 9, 4.5, '#ff9d2e', 1.4);
    ell(g, -22, 6, 6, 18, DK, 1.6, .3); ell(g, 22, 6, 6, 18, DK, 1.6, -.3);
    var body = function () { g.beginPath(); g.moveTo(0, -30); g.bezierCurveTo(16, -30, 22, -14, 22, 6); g.bezierCurveTo(22, 28, 12, 37, 0, 37); g.bezierCurveTo(-12, 37, -22, 28, -22, 6); g.bezierCurveTo(-22, -14, -16, -30, 0, -30); g.closePath(); };
    shape(g, body, DK, 2, [-22, -30, 22, 37, 1]);
    shape(g, function () { g.beginPath(); g.moveTo(0, -12); g.bezierCurveTo(4, -22, 16, -22, 14, -10); g.bezierCurveTo(18, 4, 16, 32, 0, 34); g.bezierCurveTo(-16, 32, -18, 4, -14, -10); g.bezierCurveTo(-16, -22, -4, -22, 0, -12); g.closePath(); }, '#f7fbff', 0, [-17, -22, 17, 34, 1]);
    eye2(g, -6.5, -14, 2.6); eye2(g, 6.5, -14, 2.6);
    blush(g, -10, -7, 3); blush(g, 10, -7, 3);
    shape(g, function () { g.beginPath(); g.moveTo(-4, -9); g.quadraticCurveTo(6, -10, 12, -7); g.quadraticCurveTo(6, -3, -4, -4); g.closePath(); }, '#ff9d2e', 1.2, [-4, -10, 12, -3, 0]);
    rrect(g, -18, -1, 36, 7, 3.5, c(), 1.4); rrect(g, 8, 3, 8.4, 18, 2, c(), 1.4);
    for (i = 0; i < o.p; i++) rrect(g, 7.8, 4 + i * 5.2, 9, 4, 0, '#fff', 0);
    for (i = 0; i < 4; i++) line(g, 9 + i * 2.2, 21, 9 + i * 2.2, 24, 1.2, c());
    if (o.v === 1) {
      g.beginPath(); g.arc(0, -24, 13.5, Math.PI, 0); g.closePath(); sb([-13.5, -37.5, 13.5, -24, 1]); fs(g, c());
      rrect(g, -14.5, -27, 29, 5, 2.5, c(0, 0, 18), 1.2); circ(g, 0, -39, 3.8, '#fff', 1);
    }
  } });

  def('bird', { w: 56, h: 40, zone: 'sky', hue: [0, 360], sat: 70, lit: 55, vmax: 2, asym: true, pat: [0, 3], draw: function (g, o, c) {
    shape(g, function () { g.beginPath(); g.moveTo(-14, 0); g.lineTo(-31, -9); g.quadraticCurveTo(-28, 0, -31, 7); g.closePath(); }, c(0, 0, -10), 1.6, [-31, -9, -14, 7, 0]);
    var body = function () { g.beginPath(); g.moveTo(-18, 2); g.bezierCurveTo(-14, -12, 8, -14, 14, -10); g.bezierCurveTo(20, -18, 28, -12, 24, -2); g.bezierCurveTo(20, 12, -6, 18, -18, 2); g.closePath(); };
    shape(g, body, c(), 2, [-18, -16, 26, 14, 1]);
    inside(g, body, function () { ell(g, 2, 10, 16, 7, c(10, -20, 24), 0); });
    poly(g, [23, -10, 33, -7, 23, -3], '#ff9d2e', 1.4);
    eye2(g, 18, -9, 2.2);
    var up = o.v === 1, i, wx = up ? -2 : -3, wy = up ? -9 : 5, rot = up ? -.9 : .4;
    g.save(); g.translate(wx, wy); g.rotate(rot);
    shape(g, function () { g.beginPath(); g.moveTo(10, -5); g.bezierCurveTo(4, -9, -12, -6, -15, 0); g.bezierCurveTo(-10, 6, 6, 6, 10, -5); g.closePath(); }, c(0, 0, -14), 1.8, [-15, -8, 10, 6, 0]);
    for (i = 0; i < o.p; i++) { var t = (i + 1) / (o.p + 1) * 2 - 1; line(g, t * 9, -4, t * 9 - 2, 3.6, 2, c(0, -10, 24)); }
    g.restore();
  } });

  /* ===================== dưới nước, bờ biển ===================== */
  def('fish', { w: 74, h: 48, zone: 'water', hue: [0, 360], sat: 80, lit: 58, vmax: 2, asym: true, pat: [1, 4], mood: true, draw: function (g, o, c) {
    var i;
    shape(g, function () { g.beginPath(); g.moveTo(-22, 0); g.bezierCurveTo(-30, -6, -36, -16, -40, -17); g.quadraticCurveTo(-34, 0, -40, 17); g.bezierCurveTo(-36, 16, -30, 6, -22, 0); g.closePath(); }, c(0, 0, -10), 1.8, [-40, -17, -22, 17, 0]);
    for (i = -1; i <= 1; i++) line(g, -26, 0, -36, i * 10, 1, c(0, 0, -24));
    shape(g, function () { g.beginPath(); g.moveTo(-10, -14); g.bezierCurveTo(-6, -26, 8, -27, 14, -14); g.closePath(); }, c(0, 0, -10), 1.8, [-10, -26, 14, -14, 0]);
    var body = function () { g.beginPath(); g.moveTo(30, 2); g.bezierCurveTo(26, -18, -10, -22, -24, -3); g.quadraticCurveTo(-26, 0, -24, 3); g.bezierCurveTo(-10, 20, 24, 18, 30, 2); g.closePath(); };
    shape(g, body, c(), 2, [-26, -18, 30, 17, 1]);
    inside(g, body, function () {
      ell(g, 2, 14, 26, 7, c(0, -10, 22), 0);
      if (o.v === 0) { g.fillStyle = c(0, 0, 22); for (i = 0; i < o.p; i++) { g.save(); g.translate(-14 + i * 9, 0); g.rotate(.12); g.fillRect(-2.5, -22, 5, 44); g.restore(); } }
      else { var P = [[-7, 5], [4, -8], [7, 7], [-15, -3]]; for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 4.6, c(0, 0, 26), 0); }
    });
    arc(g, 11, 1, 9, -1, 1, 1.6, OL);
    shape(g, function () { g.beginPath(); g.moveTo(4, 4); g.quadraticCurveTo(-4, 10, -6, 14); g.quadraticCurveTo(2, 12, 6, 7); g.closePath(); }, c(0, 0, -6), 1.2, [-6, 4, 6, 14, 0]);
    circ(g, 18, -5, 5, '#fff', 1.2); circ(g, 19, -5, 2.6, INK, 0); circ(g, 20, -6.2, .9, '#fff', 0);
    mouth(g, o.m || 0, 24, 6, 12, '#2a1020');
  } });

  def('turtle', { w: 86, h: 58, zone: 'water', hue: [95, 135], sat: 55, lit: 42, asym: true, pat: [3, 6], mood: true, draw: function (g, o, c) {
    var SK = c(-20, -15, 14), i;
    ell(g, -26, 10, 10, 5, SK, 1.6, .5); ell(g, 18, 12, 10, 5, SK, 1.6, -.4);
    poly(g, [-33, 4, -44, 2, -35, 10], SK, 1.2);
    shape(g, function () { g.beginPath(); g.moveTo(22, 0); g.bezierCurveTo(26, -6, 30, -10, 36, -10); g.bezierCurveTo(46, -10, 48, 2, 42, 5); g.bezierCurveTo(36, 8, 28, 6, 22, 6); g.closePath(); }, SK, 2, [22, -10, 47, 7, 1]);
    eye2(g, 39, -4, 2.4); blush(g, 42, 1, 2.6);
    mouth(g, o.m || 0, 42, 1.5, 12, '#111');
    ell(g, 0, 7, 33, 6, c(30, -10, -6), 1.8);
    var shell = function () { g.beginPath(); g.moveTo(-32, 6); g.bezierCurveTo(-32, -24, 32, -24, 32, 6); g.closePath(); };
    shape(g, shell, c(30, 0, 4), 2, [-32, -20, 32, 6, 1]);
    var P = [[-15, -5], [0, -11], [15, -5], [-7, 0], [7, 0], [-24, 1]];
    inside(g, shell, function () {
      for (i = 0; i < o.p; i++) {
        var pts = [], k, a; for (k = 0; k < 6; k++) { a = k * TAU / 6 + Math.PI / 6; pts.push(P[i][0] + Math.cos(a) * 5.6, P[i][1] + Math.sin(a) * 5); }
        poly(g, pts, c(30, 6, 22), 1.2);
      }
    });
  } });

  def('frog', { w: 48, h: 40, zone: 'water', hue: [90, 130], sat: 60, lit: 45, pat: [1, 4], mood: true, draw: function (g, o, c) {
    var i;
    ell(g, -16, 12, 10, 6, c(0, 0, -6), 1.6, .2); ell(g, 16, 12, 10, 6, c(0, 0, -6), 1.6, -.2);
    toes(g, -24, 16, 2.4, c(0, 0, -6)); toes(g, 24, 16, 2.4, c(0, 0, -6));
    var body = function () { g.beginPath(); g.moveTo(0, -8); g.bezierCurveTo(14, -8, 20, 0, 19, 8); g.bezierCurveTo(18, 16, 10, 18, 0, 18); g.bezierCurveTo(-10, 18, -18, 16, -19, 8); g.bezierCurveTo(-20, 0, -14, -8, 0, -8); g.closePath(); };
    shape(g, body, c(), 2, [-19, -8, 19, 18, 1]);
    ell(g, 0, 12, 11, 5.6, c(-20, -20, 26), 0);
    var P = [[-10, 5], [9, 6], [-3, -1], [4, 11]];
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 4.2, c(0, 0, -20), 0);
    ell(g, -6, 17, 4.4, 2.4, c(0, 0, -4), 1.2); ell(g, 6, 17, 4.4, 2.4, c(0, 0, -4), 1.2);
    circ(g, -9, -8, 6.5, c(), 1.8); circ(g, 9, -8, 6.5, c(), 1.8);
    circ(g, -9, -9, 4, '#fff', 0); circ(g, 9, -9, 4, '#fff', 0);
    ell(g, -9, -9, 2.6, 1.8, INK, 0); ell(g, 9, -9, 2.6, 1.8, INK, 0); circ(g, -8, -10, .8, '#fff', 0); circ(g, 10, -10, .8, '#fff', 0);
    blush(g, -12, 2, 2.8); blush(g, 12, 2, 2.8);
    mouth(g, o.m || 0, 0, 2, 16, c(0, 0, -34));
  } });

  def('duck', { w: 56, h: 46, zone: 'water', hue: [0, 360], sat: 20, lit: 88, asym: true, low: true, pat: [1, 3], draw: function (g, o, c) {
    var body = function () { g.beginPath(); g.moveTo(-28, -6); g.quadraticCurveTo(-24, 4, -16, 0); g.bezierCurveTo(-4, -4, 6, -2, 12, 0); g.bezierCurveTo(22, 4, 18, 18, 4, 19); g.lineTo(-14, 19); g.bezierCurveTo(-26, 18, -30, 6, -28, -6); g.closePath(); };
    shape(g, body, c(), 2, [-29, -6, 20, 19, 1]);
    var head = function () { g.beginPath(); g.ellipse(14, -10, 10, 10, 0, 0, TAU); };
    shape(g, head, c(0, 0, -2), 2, [4, -20, 24, 0, 1]);
    shape(g, function () { g.beginPath(); g.moveTo(22, -12); g.quadraticCurveTo(32, -12, 34, -7); g.quadraticCurveTo(30, -3, 22, -5); g.closePath(); }, '#ff9d2e', 1.3, [22, -12, 34, -3, 0]);
    line(g, 23, -7.5, 32, -7.5, .9, 'rgba(0,0,0,.3)');
    eye2(g, 16, -12, 2); blush(g, 18, -5, 2.6);
    var wing = function () { g.beginPath(); g.moveTo(4, 2); g.bezierCurveTo(-2, -4, -20, -2, -22, 6); g.bezierCurveTo(-14, 14, 0, 12, 4, 2); g.closePath(); };
    shape(g, wing, c(0, 0, -10), 1.6, [-22, -3, 4, 12, 0]);
    clipStripes(g, wing, o.p, -22, 4, -4, 12, 3.4, c(0, 0, -28), true);
    wing(); g.lineWidth = 1.6; g.strokeStyle = OL; g.stroke();
  } });

  def('crab', { w: 66, h: 46, zone: 'ground', hue: [0, 12], sat: 80, lit: 52, vmax: 2, pat: [0, 3], draw: function (g, o, c) {
    var i, up = o.v === 0, sd;
    for (sd = -1; sd <= 1; sd += 2) for (i = 0; i < 3; i++) cord(g, function () { g.beginPath(); g.moveTo(sd * 15, 6 + i * 4.5); g.lineTo(sd * 26, 4 + i * 6); g.lineTo(sd * 31, 14 + i * 5); }, 2.4, c(0, 0, -10));
    for (sd = -1; sd <= 1; sd += 2) {
      cord(g, function () { g.beginPath(); g.moveTo(sd * 13, -1); g.lineTo(sd * 22, up ? -6 : 2); g.lineTo(sd * 26, up ? -12 : 4); }, 3.4, c(0, 0, -6));
      g.save(); g.translate(sd * 28, up ? -17 : 7); g.scale(sd, 1); g.rotate(up ? -.3 : .4);
      shape(g, function () { g.beginPath(); g.moveTo(-6, 6); g.bezierCurveTo(-12, -2, -6, -12, 2, -11); g.lineTo(-1, -4); g.lineTo(7, -6); g.bezierCurveTo(8, 2, 2, 8, -6, 6); g.closePath(); }, c(), 1.8, [-10, -12, 8, 7, 1]);
      g.restore();
    }
    var body = function () { g.beginPath(); g.moveTo(-22, 6); g.bezierCurveTo(-22, -8, 22, -8, 22, 6); g.bezierCurveTo(22, 20, -22, 20, -22, 6); g.closePath(); };
    shape(g, body, c(), 2, [-22, -4, 22, 17, 1]);
    var P = [[-10, 7], [10, 7], [0, 12]];
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 4.8, c(0, 0, 24), 0);
    line(g, -6, -2, -7, -11, 2.2, c(0, 0, -12)); line(g, 6, -2, 7, -11, 2.2, c(0, 0, -12));
    circ(g, -7, -13, 3.8, '#fff', 1.2); circ(g, 7, -13, 3.8, '#fff', 1.2); circ(g, -6.6, -13, 1.8, INK, 0); circ(g, 7.4, -13, 1.8, INK, 0);
    arc(g, 0, 2, 4, .4, Math.PI - .4, 1.6, c(0, 0, -34));
  } });

  def('eagle', { w: 78, h: 44, zone: 'sky', hue: [20, 32], sat: 45, lit: 32, asym: true, pat: [3, 5], draw: function (g, o, c) {
    var sd, i;
    for (sd = -1; sd <= 1; sd += 2) {
      g.beginPath(); g.moveTo(sd * 4, -2); g.bezierCurveTo(sd * 14, -18, sd * 26, -16, sd * 34, -10);
      for (i = 0; i < o.p; i++) { var t = i / (o.p - 1); g.lineTo(sd * (38 - t * 3), -8 + t * 12); g.lineTo(sd * (30 - t * 4), -3 + t * 11); }
      g.quadraticCurveTo(sd * 16, 10, sd * 6, 8); g.closePath(); sb([sd > 0 ? 4 : -38, -18, sd > 0 ? 38 : -4, 10, 0]); fs(g, c(), 1.8);
      arc(g, sd * 16, -4, 10, sd > 0 ? -2.6 : -.55, sd > 0 ? -2.0 : .05, 1.2, c(0, 0, 14));
    }
    shape(g, function () { g.beginPath(); g.moveTo(-6, 12); g.lineTo(6, 12); g.lineTo(8, 22); g.lineTo(0, 20); g.lineTo(-8, 22); g.closePath(); }, '#f7f3ea', 1.4, [-8, 12, 8, 22, 0]);
    ell(g, 0, 4, 7.5, 12, c(0, 0, -6));
    circ(g, 0, -9, 6.5, '#f7f3ea', 1.6);
    shape(g, function () { g.beginPath(); g.moveTo(2, -11); g.quadraticCurveTo(10, -11, 9, -5); g.quadraticCurveTo(6, -7, 2, -6); g.closePath(); }, '#ffb703', 1.1, [2, -11, 10, -5, 0]);
    circ(g, 2.4, -10.5, 1.3, INK, 0);
  } });

  def('snail', { w: 54, h: 42, zone: 'ground', hue: [0, 360], sat: 60, lit: 62, asym: true, pat: [1, 3], draw: function (g, o, c) {
    var SK = '#dccba6', i;
    shape(g, function () { g.beginPath(); g.moveTo(-24, 18); g.quadraticCurveTo(-10, 12, 14, 12); g.bezierCurveTo(18, 4, 16, -2, 22, -4); g.bezierCurveTo(30, -4, 32, 8, 28, 14); g.quadraticCurveTo(24, 20, 10, 20); g.lineTo(-20, 20); g.closePath(); }, SK, 1.8, [-24, -4, 31, 20, 0]);
    line(g, 22, -2, 20, -13, 2, '#a99877'); line(g, 27, -2, 30, -12, 2, '#a99877');
    circ(g, 20, -13.5, 2.4, INK, 0); circ(g, 30, -12.5, 2.4, INK, 0);
    arc(g, 26, 7, 3, .3, 2.6, 1.3, '#7a6a50'); blush(g, 30, 6, 2.4);
    var shell = function () { g.beginPath(); g.arc(-4, 0, 17, 0, TAU); };
    shape(g, shell, c(), 2, [-21, -17, 13, 17, 1]);
    /* vòng xoắn: mỗi hoạ tiết là một vòng */
    for (i = 0; i < o.p; i++) {
      g.beginPath(); var r0 = 13 - i * 4.2, a;
      for (a = 0; a <= TAU * .9; a += .2) { var rr = r0 - a / TAU * 3; g[a ? 'lineTo' : 'moveTo'](-4 + Math.cos(a - .6) * rr, Math.sin(a - .6) * rr); }
      g.lineWidth = 2.6; g.strokeStyle = c(0, 0, -22); g.lineCap = 'round'; g.stroke();
    }
  } });

  def('ladybug', { w: 40, h: 34, zone: 'ground', hue: [0, 12], sat: 85, lit: 50, asym: true, pat: [2, 7], draw: function (g, o, c) {
    var i;
    for (i = -1; i <= 1; i++) { cord(g, function () { g.beginPath(); g.moveTo(-4 + i * 7, 8); g.lineTo(-8 + i * 8, 14); g.lineTo(-11 + i * 9, 15); }, 1.4, '#222'); cord(g, function () { g.beginPath(); g.moveTo(-4 + i * 7, -8); g.lineTo(-8 + i * 8, -14); g.lineTo(-11 + i * 9, -15); }, 1.4, '#222'); }
    line(g, 18, -3, 23, -8, 1.3, '#222'); line(g, 18, 3, 23, 8, 1.3, '#222'); circ(g, 23, -8, 1.4, '#222', 0); circ(g, 23, 8, 1.4, '#222', 0);
    circ(g, 14, 0, 7.4, '#222', 1.4); circ(g, 17, -3.4, 1.6, '#fff', 0); circ(g, 17, 3.4, 1.6, '#fff', 0);
    var shell = function () { g.beginPath(); g.ellipse(-2, 0, 15.5, 13, 0, 0, TAU); };
    shape(g, shell, c(), 2, [-17.5, -13, 13.5, 13, 1]);
    var P = [[-4, -6.5], [-4, 6.5], [-12, -3.5], [-12, 4], [5, -7], [5, 7], [-9, -9]];
    inside(g, shell, function () { for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 3.6, '#1d1d1d', 0); });
    line(g, 11, 0, -17, 0, 1.6, '#222');
    ell(g, -4, -7, 5, 2.4, 'rgba(255,255,255,.45)', 0, -.2);
  } });

  def('bee', { w: 46, h: 36, zone: 'sky', hue: [42, 50], sat: 95, lit: 56, asym: true, pat: [2, 4], draw: function (g, o, c) {
    ell(g, -3, -12, 9.5, 6, 'rgba(225,242,255,.85)', 1.3, -.5); ell(g, 6, -12, 8.5, 5.6, 'rgba(225,242,255,.85)', 1.3, .35);
    line(g, -6, -10, -1, -15, .8, 'rgba(90,120,160,.5)'); line(g, 4, -11, 9, -15, .8, 'rgba(90,120,160,.5)');
    poly(g, [-16, 1, -23, 3, -16, 5], '#222', 0);
    var body = function () { g.beginPath(); g.ellipse(0, 2, 16.5, 11, 0, 0, TAU); };
    shape(g, body, c(), 0, [-16.5, -9, 16.5, 13, 1]);
    clipStripes(g, body, o.p, -16, 16, -9, 13, 4.2, '#2a2124', true);
    body(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
    circ(g, 16, 0, 7, '#2a2124', 1.2);
    line(g, 18, -6, 19, -12, 1.2, '#2a2124'); line(g, 21, -5, 24, -10, 1.2, '#2a2124'); circ(g, 19, -12.5, 1.5, '#2a2124', 0); circ(g, 24, -10.5, 1.5, '#2a2124', 0);
    circ(g, 18.5, -1.5, 2, '#fff', 0); circ(g, 19, -1.5, 1.1, INK, 0);
    arc(g, 18, 2.2, 2.4, .3, 2.2, 1, '#fff');
  } });
})(typeof window !== 'undefined' ? window : globalThis);
