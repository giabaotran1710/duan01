/* Tìm điểm khác biệt — các chủ đề trong nhà, đồ vật và con vật (không phải phong cảnh): nhà bếp, phòng đồ chơi, lớp học,
   phòng nhạc, dụng cụ thể thao, sạp trái cây, cửa hàng thú cưng, tủ quần áo, phòng tắm, xưởng đồ nghề.
   Vùng mặc định của vật: 'table' (mặt bàn/kệ bếp), 'floor' (sàn), 'wall' (treo tường, tự có móc), 'shelf' (kệ). */
(function (root) {
  'use strict';
  var A = root.TKBArt, L = A.lib, def = A.def, BG = A.BG;
  var TAU = L.TAU, OL = L.OL, W = A.W, H = A.H;
  var mouth = L.mouth, fs = L.fs, circ = L.circ, ell = L.ell, poly = L.poly, rrect = L.rrect, line = L.line, arc = L.arc, blob = L.blob, star = L.star,
      glow = L.glow, clipStripes = L.clipStripes, hsl = L.hsl, vgrad = L.vgrad;

  /* ---------- hàm vẽ nhỏ ---------- */
  function rpath(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  /* tô một hình rồi kẻ n sọc cắt trong hình, cuối cùng mới viền */
  function striped(g, path, fill, n, x0, x1, y0, y1, wid, col, vert) {
    path(); fs(g, fill, 0);
    clipStripes(g, path, n, x0, x1, y0, y1, wid, col, vert);
    path(); g.lineWidth = 2; g.strokeStyle = OL; g.lineJoin = 'round'; g.stroke();
  }
  function ngon(g, x, y, r, n, fill, lw, rot) {
    var pts = [], i, a;
    for (i = 0; i < n; i++) { a = (rot || 0) + i * TAU / n; pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    poly(g, pts, fill, lw);
  }
  function eye(g, x, y, r) { circ(g, x, y, r, '#1b1420', 0); circ(g, x + r * .35, y - r * .35, r * .4, '#fff', 0); }
  /* móc treo tường */
  function hook(g, y) { line(g, 0, y + 7, 0, y, 2, '#6b5a48'); circ(g, 0, y - 1, 3.4, '#8a6a4a', 1.2); }
  /* móc áo */
  function hanger(g, y) {
    g.beginPath(); g.arc(0, y - 5, 4.5, Math.PI * .9, Math.PI * 2.25); g.lineWidth = 2; g.strokeStyle = '#777'; g.stroke();
    g.beginPath(); g.moveTo(-28, y + 9); g.lineTo(0, y); g.lineTo(28, y + 9); g.lineWidth = 3; g.strokeStyle = '#8a6a4a'; g.lineCap = 'round'; g.stroke();
  }
  function flower5(g, x, y, r, col, mid) {
    for (var k = 0; k < 5; k++) { var a = -Math.PI / 2 + k * TAU / 5; circ(g, x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55, r * .48, col, 0); }
    circ(g, x, y, r * .36, mid, 0);
  }

  /* ===== nhà bếp ===== */
  def('pot', { w: 104, h: 64, zone: 'table', hue: [0, 360], sat: 50, lit: 50, vmax: 2, asym: true, pat: [1, 3], draw: function (g, o, c) {
    if (o.v === 0) { rrect(g, -44, -12, 14, 8, 4, '#3a3a44', 1.4); rrect(g, 30, -12, 14, 8, 4, '#3a3a44', 1.4); }
    else rrect(g, 28, -13, 30, 8, 4, '#3a3a44', 1.4);
    var body = function () { g.beginPath(); g.moveTo(-32, -14); g.lineTo(32, -14); g.lineTo(30, 20); g.quadraticCurveTo(0, 30, -30, 20); g.closePath(); };
    striped(g, body, c(), o.p, -32, 32, -14, 26, 5, c(0, 0, 26), false);
    ell(g, 0, -16, 34, 7, c(0, 0, -10), 1.6); circ(g, 0, -24, 5, '#3a3a44', 1.2);
  } });
  def('pan', { w: 110, h: 64, zone: 'table', hue: [200, 230], sat: 12, lit: 28, low: true, asym: true, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, 20, -5, 46, 10, 5, '#5a3a24', 1.6);
    circ(g, -8, 0, 30, c(), 2); circ(g, -8, 0, 24, c(0, 0, -8), 1);
    var P = [[-16, -7], [3, 5], [-13, 12]];
    for (var i = 0; i < o.p; i++) { blob(g, [[P[i][0], P[i][1], 9, 7], [P[i][0] + 3, P[i][1] + 2, 7, 6]], '#fbfaf2'); circ(g, P[i][0] + 1, P[i][1], 4.6, '#ffb21e', 1); }
  } });
  def('kettle', { w: 86, h: 70, zone: 'table', hue: [0, 360], sat: 60, lit: 52, asym: true, pat: [2, 5], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(-22, 8); g.quadraticCurveTo(-36, 2, -40, -16); g.lineTo(-33, -18); g.quadraticCurveTo(-30, -6, -20, -4); g.closePath(); fs(g, c(0, 0, -8), 1.6);
    arc(g, 0, -18, 18, Math.PI * 1.05, Math.PI * 1.95, 4.5, '#3a3a44');
    g.beginPath(); g.moveTo(-26, 24); g.quadraticCurveTo(-30, -16, 0, -18); g.quadraticCurveTo(30, -16, 26, 24); g.closePath(); fs(g, c(), 2);
    var P = [[-12, 6], [8, -4], [12, 13], [-3, 16], [-4, -8]];
    for (var i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 4.6, '#fff', 0);
    rrect(g, -28, 22, 56, 6, 3, '#3a3a44', 1.2); circ(g, 0, -20, 4, c(0, 0, -14), 1.2);
  } });
  def('jar', { w: 50, h: 66, zone: 'shelf', hue: [0, 360], sat: 60, lit: 50, vmax: 2, pat: [2, 5], draw: function (g, o, c) {
    rpath(g, -20, -16, 40, 46, 9); fs(g, 'rgba(225,240,255,.6)', 2);
    var P = [[-9, 19], [8, 20], [-1, 8], [10, 4], [-10, 0]], i;
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 6.6, hsl(o.h + 120 + i * 70, 75, 55), 1.2);
    line(g, -14, -8, -14, 20, 3, 'rgba(255,255,255,.7)');
    if (o.v === 0) rrect(g, -22, -24, 44, 10, 3, c(), 1.6);
    else { g.beginPath(); g.moveTo(-22, -15); g.quadraticCurveTo(0, -36, 22, -15); g.closePath(); fs(g, c(), 1.6); circ(g, 0, -28, 4, c(0, 0, -12), 1.2); }
  } });
  def('plates', { w: 76, h: 50, zone: 'shelf', hue: [0, 360], sat: 55, lit: 60, pat: [2, 5], draw: function (g, o, c) {
    for (var i = 0; i < o.p; i++) { var y = 16 - i * 7; ell(g, 0, y + 2, 32, 6, c(0, 0, -16), 1.4); ell(g, 0, y, 32, 6, i % 2 ? '#fbf8f0' : c(), 1.4); }
  } });
  def('toaster', { w: 80, h: 66, zone: 'table', hue: [0, 360], sat: 45, lit: 58, asym: true, pat: [0, 2], draw: function (g, o, c) {
    var X = [-12, 10], i;
    for (i = 0; i < o.p; i++) { rrect(g, X[i] - 9, -32, 18, 22, 5, '#e2a560', 1.4); rrect(g, X[i] - 6, -29, 12, 6, 3, '#f4d6a0', 0); }
    rrect(g, -30, -18, 60, 40, 12, c());
    for (i = 0; i < 2; i++) rrect(g, X[i] - 10, -20, 20, 4, 2, '#3a3a44', 0);
    rrect(g, 30, -6, 9, 6, 2, '#3a3a44', 1);
    line(g, -22, 8, 22, 8, 2.4, c(0, 0, 18));
    rrect(g, -26, 21, 10, 5, 2, '#3a3a44', 0); rrect(g, 16, 21, 10, 5, 2, '#3a3a44', 0);
  } });
  def('board', { w: 96, h: 50, zone: 'table', hue: [26, 36], sat: 45, lit: 55, asym: true, pat: [2, 5], draw: function (g, o, c) {
    rrect(g, 28, -7, 20, 14, 7, c()); circ(g, 40, 0, 3, '#5a3a24', 0);
    rrect(g, -44, -20, 76, 40, 10, c());
    line(g, -36, -13, 22, -13, 1.2, c(0, 0, -10)); line(g, -36, 14, 22, 14, 1.2, c(0, 0, -10));
    var P = [[-26, 2], [-8, -6], [10, 4], [-12, 10], [18, -9]];
    for (var i = 0; i < o.p; i++) { circ(g, P[i][0], P[i][1], 7, '#f08a24', 1.4); circ(g, P[i][0], P[i][1], 3.4, '#f7b860', 0); }
  } });
  def('eggbox', { w: 84, h: 52, zone: 'table', hue: [30, 45], sat: 30, lit: 70, low: true, pat: [3, 6], draw: function (g, o, c) {
    rrect(g, -38, -20, 76, 40, 6, c());
    var ORD = [0, 4, 2, 3, 1, 5], i, k, x, y;
    for (i = 0; i < 6; i++) { x = -25 + (i % 3) * 25; y = -9 + Math.floor(i / 3) * 19; circ(g, x, y, 9, c(0, 0, -12), 1); }
    for (i = 0; i < o.p; i++) { k = ORD[i]; x = -25 + (k % 3) * 25; y = -9 + Math.floor(k / 3) * 19; ell(g, x, y - 1, 8.4, 9, k % 2 ? '#e9c8a0' : '#fff6e6', 1.4); }
  } });
  def('utensils', { w: 96, h: 104, zone: 'wall', hue: [0, 360], sat: 55, lit: 50, pat: [2, 4], draw: function (g, o, c) {
    rrect(g, -44, -46, 88, 8, 4, '#9aa0aa', 1.6); circ(g, -38, -42, 2, '#555', 0); circ(g, 38, -42, 2, '#555', 0);
    var X = [-28, 8, -10, 26], i, k;
    for (i = 0; i < o.p; i++) {
      g.save(); g.translate(X[i], -38);
      line(g, 0, 0, 0, 8, 2, '#555');
      rrect(g, -2.5, 6, 5, 40, 2, c(i * 50), 1.2);
      if (i === 0) ell(g, 0, 54, 6.5, 10, '#c9ced6', 1.4);
      else if (i === 1) rrect(g, -8, 44, 16, 22, 3, c(i * 50, 0, -12), 1.4);
      else if (i === 2) { for (k = 0; k < 3; k++) { g.beginPath(); g.ellipse(0, 56, 2.5 + k * 2.6, 12, 0, 0, TAU); g.lineWidth = 1.8; g.strokeStyle = '#8f96a2'; g.stroke(); } }
      else { circ(g, 0, 54, 9.5, '#c9ced6', 1.4); circ(g, 0, 52, 6, '#aeb5c0', 0); }
      g.restore();
    }
  } });
  def('mitt', { w: 50, h: 80, zone: 'wall', hue: [0, 360], sat: 65, lit: 52, asym: true, pat: [1, 3], draw: function (g, o, c) {
    hook(g, -38);
    var m = function () { g.beginPath(); g.moveTo(-14, 30); g.lineTo(-16, -10); g.quadraticCurveTo(-16, -30, 0, -30); g.quadraticCurveTo(14, -30, 14, -8); g.lineTo(14, 0); g.quadraticCurveTo(28, -10, 25, 4); g.quadraticCurveTo(22, 16, 14, 18); g.lineTo(14, 30); g.closePath(); };
    striped(g, m, c(), o.p, -16, 26, -30, 26, 5, '#fff', false);
    rrect(g, -17, 26, 34, 10, 3, c(0, 0, -16), 1.4);
  } });
  def('teapot', { w: 92, h: 66, zone: 'shelf', hue: [0, 360], sat: 45, lit: 60, asym: true, pat: [1, 4], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(20, 6); g.quadraticCurveTo(34, 4, 40, -14); g.lineTo(45, -12); g.quadraticCurveTo(40, 12, 22, 16); g.closePath(); fs(g, c(0, 0, -6), 1.6);
    arc(g, -27, 4, 11, Math.PI * .5, Math.PI * 1.5, 5, c(0, 0, -10));
    ell(g, 0, 6, 28, 22, c());
    var P = [[-13, 4], [9, 10], [3, -7], [-5, 17]];
    for (var i = 0; i < o.p; i++) flower5(g, P[i][0], P[i][1], 7, '#fff', '#ffcf3a');
    ell(g, 0, -15, 16, 4, c(0, 0, -12), 1.4); circ(g, 0, -21, 4, c(0, 0, -12), 1.2);
  } });

  /* ===== phòng đồ chơi ===== */
  def('teddy', { w: 70, h: 84, zone: 'floor', hue: [22, 36], sat: 50, lit: 50, pat: [1, 3], mood: true, draw: function (g, o, c) {
    ell(g, -16, 30, 11, 9, c(0, 0, -6)); ell(g, 16, 30, 11, 9, c(0, 0, -6)); circ(g, -16, 31, 5, c(0, 0, 18), 0); circ(g, 16, 31, 5, c(0, 0, 18), 0);
    ell(g, -24, 8, 7, 12, c(0, 0, -6), 2, .4); ell(g, 24, 8, 7, 12, c(0, 0, -6), 2, -.4);
    ell(g, 0, 12, 20, 20, c()); ell(g, 0, 15, 13, 14, c(0, 0, 16), 0);
    var P = [[-5, 9], [6, 15], [-3, 22]];
    for (var i = 0; i < o.p; i++) { g.save(); g.translate(P[i][0], P[i][1]); g.beginPath(); g.moveTo(0, 4.5); g.bezierCurveTo(-8, -1, -4, -7, 0, -3); g.bezierCurveTo(4, -7, 8, -1, 0, 4.5); fs(g, '#e5392e', 1); g.restore(); }
    circ(g, -15, -36, 8, c(), 2); circ(g, 15, -36, 8, c(), 2); circ(g, -15, -36, 4, c(0, 0, 16), 0); circ(g, 15, -36, 4, c(0, 0, 16), 0);
    circ(g, 0, -22, 19, c());
    ell(g, 0, -15, 11, 8, c(0, 0, 18), 0);
    eye(g, -7, -27, 2.6); eye(g, 7, -27, 2.6);
    ell(g, 0, -19, 3.4, 2.4, '#1b1420', 0);
    mouth(g, o.m || 0, 0, -13, 15, '#1b1420');
  } });
  def('robot', { w: 64, h: 100, zone: 'floor', hue: [180, 240], sat: 30, lit: 62, vmax: 2, pat: [1, 4], mood: true, draw: function (g, o, c) {
    rrect(g, -18, 26, 12, 16, 3, c(0, 0, -14)); rrect(g, 6, 26, 12, 16, 3, c(0, 0, -14));
    rrect(g, -31, -4, 9, 26, 4, c(0, 0, -10)); rrect(g, 22, -4, 9, 26, 4, c(0, 0, -10));
    rrect(g, -5, -14, 10, 8, 1, c(0, 0, -14), 0);
    rrect(g, -22, -8, 44, 36, 6, c());
    var P = [[-8, 3, '#e5392e'], [8, 3, '#ffd23f'], [-8, 17, '#2ec27e'], [8, 17, '#3b82f6']], i;
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 5, P[i][2], 1.2);
    if (o.v === 0) { line(g, 0, -44, 0, -54, 2.4, '#555'); circ(g, 0, -56, 4.5, '#e5392e', 1.2); }
    else { line(g, -10, -44, -15, -54, 2.4, '#555'); line(g, 10, -44, 15, -54, 2.4, '#555'); circ(g, -15, -55, 3.6, '#ffd23f', 1.2); circ(g, 15, -55, 3.6, '#ffd23f', 1.2); }
    rrect(g, -21, -46, 42, 34, 8, c(0, 0, 6));
    circ(g, -9, -33, 6, '#fff', 1.4); circ(g, 9, -33, 6, '#fff', 1.4); circ(g, -9, -33, 3, '#1b1420', 0); circ(g, 9, -33, 3, '#1b1420', 0);
    mouth(g, o.m || 0, 0, -22, 17, '#1b1420');
  } });
  def('blocks', { w: 56, h: 100, zone: 'floor', hue: [0, 360], sat: 70, lit: 55, pat: [2, 4], draw: function (g, o, c) {
    for (var i = 0; i < o.p; i++) {
      var y = 28 - i * 22, x = i % 2 ? 3 : -2, k = i % 3;
      rrect(g, x - 11, y - 11, 22, 22, 3, c(i * 85), 1.6); rrect(g, x - 7.5, y - 7.5, 15, 15, 2, 'rgba(255,255,255,.85)', 0);
      if (k === 0) circ(g, x, y, 4.5, c(i * 85, 0, -14), 0);
      else if (k === 1) poly(g, [x - 5, y + 4, x, y - 5, x + 5, y + 4], c(i * 85, 0, -14), 0);
      else rrect(g, x - 4.5, y - 4.5, 9, 9, 1, c(i * 85, 0, -14), 0);
    }
  } });
  def('toytrain', { w: 130, h: 56, zone: 'floor', hue: [0, 360], sat: 70, lit: 52, asym: true, pat: [1, 3], draw: function (g, o, c) {
    var i, x;
    for (i = 0; i < o.p; i++) {
      x = 4 - i * 30;
      line(g, x + 12, 8, x + 18, 8, 3, '#555');
      rrect(g, x - 12, -6, 24, 18, 3, c(70 + i * 70), 1.6);
      circ(g, x - 7, 16, 5.5, '#333', 1.2); circ(g, x + 7, 16, 5.5, '#333', 1.2); circ(g, x - 7, 16, 1.8, '#ccc', 0); circ(g, x + 7, 16, 1.8, '#ccc', 0);
    }
    rrect(g, 24, -24, 7, 14, 2, '#444', 1.2);
    rrect(g, 18, -10, 38, 22, 4, c()); rrect(g, 38, -26, 18, 18, 3, c(0, 0, -10)); rrect(g, 41, -22, 12, 9, 2, '#cfe8ff', 1);
    circ(g, 26, 16, 7, '#333', 1.2); circ(g, 47, 16, 7, '#333', 1.2); circ(g, 26, 16, 2.4, '#ccc', 0); circ(g, 47, 16, 2.4, '#ccc', 0);
  } });
  def('drum', { w: 64, h: 64, zone: 'floor', hue: [0, 360], sat: 70, lit: 50, vmax: 2, pat: [3, 6], draw: function (g, o, c) {
    if (o.v === 1) { line(g, -22, -32, 4, -18, 3, '#c89a5a'); line(g, 22, -32, -4, -18, 3, '#c89a5a'); circ(g, -22, -32, 3.4, '#f6efe0', 1); circ(g, 22, -32, 3.4, '#f6efe0', 1); }
    rrect(g, -28, -14, 56, 36, 3, c()); ell(g, 0, 22, 28, 6, c(0, 0, -14), 1.6);
    var n = o.p, k;
    g.beginPath();
    for (k = 0; k <= n * 2; k++) g[k ? 'lineTo' : 'moveTo'](-26 + k * 52 / (n * 2), k % 2 ? 17 : -9);
    g.lineWidth = 2.6; g.strokeStyle = '#fff'; g.lineJoin = 'round'; g.stroke();
    rrect(g, -29, -14, 58, 5, 2, '#f2f2f2', 1.2); rrect(g, -29, 17, 58, 5, 2, '#f2f2f2', 1.2);
    ell(g, 0, -14, 28, 7, '#f6efe0', 1.6);
  } });
  def('dino', { w: 100, h: 76, zone: 'floor', hue: [90, 160], sat: 55, lit: 48, asym: true, pat: [3, 6], mood: true, draw: function (g, o, c) {
    var n = o.p, i, t, x, yb;
    for (i = 0; i < n; i++) {
      t = (i + .5) / 6; x = -28 + t * 42;
      yb = 4 - 16 * Math.sqrt(Math.max(0, 1 - Math.pow((x + 4) / 26, 2)));
      poly(g, [x - 5.5, yb + 4, x, yb - 9, x + 5.5, yb + 4], '#f59e2a', 1.4);
    }
    g.beginPath(); g.moveTo(-22, -2); g.quadraticCurveTo(-44, 2, -52, 18); g.quadraticCurveTo(-36, 18, -20, 16); g.closePath(); fs(g, c());
    rrect(g, -18, 10, 10, 20, 4, c(0, 0, -8)); rrect(g, 6, 10, 10, 20, 4, c(0, 0, -8));
    ell(g, -4, 4, 26, 16, c()); ell(g, -2, 11, 16, 6, c(0, 0, 16), 0);
    poly(g, [12, -6, 20, -22, 30, -16, 20, 4], c(), 0);
    ell(g, 28, -18, 16, 13, c());
    eye(g, 30, -23, 2.8);
    mouth(g, o.m || 0, 31, -13, 18, '#1b1420');
  } });
  def('spintop', { w: 52, h: 62, zone: 'floor', hue: [0, 360], sat: 75, lit: 55, pat: [2, 4], draw: function (g, o, c) {
    line(g, 0, -28, 0, -12, 4, '#8a5a30');
    var tp = function () { g.beginPath(); g.moveTo(-24, -6); g.quadraticCurveTo(0, -22, 24, -6); g.lineTo(2, 24); g.lineTo(-2, 24); g.closePath(); };
    striped(g, tp, c(), o.p, -24, 24, -16, 24, 5, '#fff', false);
    line(g, 0, 22, 0, 29, 2.4, '#555');
  } });
  def('rockhorse', { w: 104, h: 84, zone: 'floor', hue: [0, 40], sat: 60, lit: 50, asym: true, pat: [1, 4], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(-48, 20); g.quadraticCurveTo(0, 48, 48, 20); g.lineWidth = 6; g.strokeStyle = '#8a5a30'; g.lineCap = 'round'; g.stroke();
    line(g, -22, 4, -30, 28, 5, c(0, 0, -10)); line(g, -12, 4, -12, 34, 5, c(0, 0, -10)); line(g, 12, 4, 12, 34, 5, c(0, 0, -10)); line(g, 22, 4, 30, 28, 5, c(0, 0, -10));
    line(g, -30, -4, -44, 8, 5, '#5a3a24');
    ell(g, 0, 0, 30, 13, c());
    var P = [[-16, 2], [2, 5], [-6, -5], [16, 0]];
    for (var i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 4.6, '#fff', 0);
    poly(g, [18, -8, 26, -36, 38, -40, 46, -30, 38, -24, 32, -4], c());
    line(g, 24, -36, 18, -16, 4, '#5a3a24');
    eye(g, 36, -33, 2.2);
    rrect(g, -9, -15, 18, 6, 2, '#e5392e', 1.2);
  } });

  /* ===== lớp học ===== */
  def('globe', { w: 66, h: 88, zone: 'table', hue: [195, 215], sat: 70, lit: 52, asym: true, pat: [2, 4], draw: function (g, o, c) {
    ell(g, 0, 37, 18, 5, '#7a5230', 1.6); line(g, 0, 36, 0, 26, 4, '#7a5230');
    arc(g, 0, -4, 30, Math.PI * .55, Math.PI * 1.9, 3.4, '#c9a24a');
    circ(g, 0, -4, 25, c(), 2);
    var P = [[-9, -14, 9, 6, .4], [8, 3, 8, 10, -.3], [-11, 8, 7, 5, .2], [11, -16, 6, 4.5, -.5]], i;
    g.save(); g.beginPath(); g.arc(0, -4, 24, 0, TAU); g.clip();
    for (i = 0; i < o.p; i++) ell(g, P[i][0], P[i][1], P[i][2], P[i][3], '#5fb25a', 1.2, P[i][4]);
    g.restore();
    ell(g, -10, -14, 4, 7, 'rgba(255,255,255,.35)', 0, .5);
  } });
  def('backpack', { w: 66, h: 82, zone: 'floor', hue: [0, 360], sat: 65, lit: 50, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    arc(g, 0, -30, 10, Math.PI, 0, 4, c(0, 0, -14));
    rrect(g, -26, -31, 52, 66, 14, c());
    if (o.v === 0) rrect(g, -18, 6, 36, 25, 7, c(0, 0, -10), 1.6);
    else { g.beginPath(); g.arc(0, 13, 18, Math.PI, 0); g.lineTo(18, 31); g.lineTo(-18, 31); g.closePath(); fs(g, c(0, 0, -10), 1.6); }
    line(g, -12, 13, 12, 13, 2, c(0, 0, 20));
    var P = [[-12, -16], [11, -15], [0, -4]];
    for (var i = 0; i < o.p; i++) { circ(g, P[i][0], P[i][1], 5.4, hsl(o.h + 150 + i * 60, 80, 62), 1.2); circ(g, P[i][0], P[i][1], 2, '#fff', 0); }
  } });
  def('crayons', { w: 60, h: 72, zone: 'table', hue: [40, 55], sat: 85, lit: 55, pat: [3, 6], draw: function (g, o, c) {
    for (var i = 0; i < o.p; i++) {
      var x = -18 + i * 7.2, col = hsl(i * 57 + 5, 80, 52), y = -28 - (i % 2) * 6;
      rrect(g, x - 3.2, y, 6.4, 36, 1, col, 1); poly(g, [x - 3.2, y, x + 3.2, y, x, y - 8], col, 1);
    }
    rrect(g, -24, -6, 48, 36, 3, c()); rrect(g, -18, 3, 36, 12, 3, '#2a6bd1', 0);
  } });
  def('apple', { w: 46, h: 52, zone: 'table', hue: [0, 10], sat: 80, lit: 48, vmax: 2, asym: true, pat: [0, 2], draw: function (g, o, c) {
    line(g, 0, -10, 2, -21, 2.6, '#5a3a24');
    for (var i = 0; i < o.p; i++) { g.save(); g.translate(2, -17); g.scale(i ? -1 : 1, 1); ell(g, 9, -3, 9, 4.5, '#4fae48', 1.2, -.4); g.restore(); }
    blob(g, [[-8, 5, 14, 15], [8, 5, 14, 15]], c());
    ell(g, -9, -1, 3, 6, 'rgba(255,255,255,.6)', 0, .3);
    if (o.v === 1) { circ(g, 6, 9, 6, '#fff7d6', 1.2); circ(g, 6, 9, 2.4, c(0, 0, -10), 0); }
  } });
  def('abacus', { w: 84, h: 72, zone: 'table', hue: [20, 34], sat: 50, lit: 42, pat: [2, 6], draw: function (g, o, c, r) {
    var j, i, n, y;
    for (j = 0; j < 3; j++) {
      y = -12 + j * 14; line(g, -30, y, 30, y, 1.6, '#888');
      n = j === 0 ? o.p : 2 + Math.floor(r() * 5);
      for (i = 0; i < n; i++) ell(g, -24 + i * 9.4, y, 4.5, 6.2, hsl(j * 120 + 10, 75, 55), 1);
    }
    rrect(g, -38, -28, 76, 8, 2, c()); rrect(g, -38, 22, 76, 8, 2, c()); rrect(g, -38, -28, 8, 58, 2, c()); rrect(g, 30, -28, 8, 58, 2, c());
  } });
  def('palette', { w: 80, h: 60, zone: 'table', hue: [30, 40], sat: 45, lit: 62, asym: true, pat: [3, 6], draw: function (g, o, c) {
    ell(g, 0, 0, 36, 26, c()); circ(g, 18, 10, 6, c(0, 0, -25), 1.2);
    var P = [[-22, -4], [-12, -15], [3, -17], [17, -10], [-18, 11], [-3, 13]];
    for (var i = 0; i < o.p; i++) blob(g, [[P[i][0], P[i][1], 6.4, 5.4]], hsl(i * 60 + 5, 80, 52));
  } });
  def('scissors', { w: 84, h: 44, zone: 'table', hue: [0, 360], sat: 70, lit: 50, vmax: 2, asym: true, draw: function (g, o, c) {
    var a = o.v === 0 ? .16 : .4;
    for (var k = -1; k <= 1; k += 2) {
      g.save(); g.rotate(k * a);
      poly(g, [-2, -3, 40, 0, -2, 3], '#cfd4dc', 1.4);
      line(g, -10, 0, -2, 0, 4, c(0, 0, -10));
      g.beginPath(); g.ellipse(-21, 0, 11, 7.5, 0, 0, TAU); g.lineWidth = 5.5; g.strokeStyle = c(); g.stroke();
      g.restore();
    }
    circ(g, 0, 0, 2.6, '#555', 0);
  } });
  def('chart', { w: 70, h: 82, zone: 'wall', hue: [0, 360], sat: 70, lit: 55, pat: [3, 5], draw: function (g, o, c, r) {
    var Hh = [], i;
    for (i = 0; i < 5; i++) Hh.push(12 + Math.floor(r() * 30));
    rrect(g, -30, -34, 60, 70, 3, '#fbf8ee'); circ(g, 0, -34, 3.2, '#e5392e', 1);
    for (i = 0; i < o.p; i++) rrect(g, -18 + i * 9, 26 - Hh[i], 7, Hh[i], 1, c(i * 30), 0);
    line(g, -22, 26, 24, 26, 2, '#333'); line(g, -22, 26, -22, -24, 2, '#333');
  } });

  /* ===== phòng nhạc ===== */
  def('guitar', { w: 60, h: 132, zone: 'floor', hue: [20, 36], sat: 65, lit: 46, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -5, -62, 10, 62, 2, '#5a3a24'); rrect(g, -8, -72, 16, 13, 3, '#3a2616');
    blob(g, [[0, 6, 18, 16], [0, 34, 25, 22]], c());
    circ(g, 0, 12, 7, '#2a1a0e', 0);
    for (var i = 0; i < o.p; i++) { g.beginPath(); g.arc(0, 12, 9.8 + i * 3.4, 0, TAU); g.lineWidth = 2.2; g.strokeStyle = '#f6e6c4'; g.stroke(); }
    rrect(g, -9, 38, 18, 5, 2, '#3a2616', 0);
    for (var k = 0; k < 4; k++) line(g, -3 + k * 2, -60, -3 + k * 2, 40, .8, '#eee');
  } });
  def('keyboard', { w: 120, h: 70, zone: 'floor', hue: [200, 240], sat: 15, lit: 24, low: true, pat: [2, 5], draw: function (g, o, c) {
    var k, i;
    for (k = -1; k <= 1; k += 2) { line(g, k * 38 - 7, 4, k * 38 + 7, 34, 3.4, '#444'); line(g, k * 38 + 7, 4, k * 38 - 7, 34, 3.4, '#444'); }
    rrect(g, -56, -32, 112, 36, 4, c());
    rrect(g, -50, -10, 100, 14, 1, '#fff', 1);
    for (k = 1; k < 10; k++) line(g, -50 + k * 10, -10, -50 + k * 10, 4, 1, '#999');
    [1, 2, 4, 5, 6, 8, 9].forEach(function (b) { rrect(g, -50 + b * 10 - 3, -10, 6, 8, 1, '#111', 0); });
    for (i = 0; i < o.p; i++) circ(g, -42 + i * 11.5, -22, 4.8, hsl(i * 70 + 10, 80, 58), 1);
    rrect(g, 20, -27, 28, 10, 2, '#7fd1ff', 1);
  } });
  def('trumpet', { w: 100, h: 50, zone: 'table', hue: [40, 50], sat: 85, lit: 55, asym: true, pat: [1, 3], draw: function (g, o, c) {
    rpath(g, -26, -2, 40, 16, 7); g.lineWidth = 4; g.strokeStyle = c(0, 0, -10); g.stroke();
    for (var i = 0; i < o.p; i++) { var x = -12 + i * 10; rrect(g, x - 3, -18, 6, 15, 2, c(0, 0, -12), 1.2); circ(g, x, -20, 4.2, '#f6efe0', 1.2); }
    g.beginPath(); g.moveTo(14, -4); g.lineTo(34, -15); g.quadraticCurveTo(41, 0, 34, 15); g.lineTo(14, 4); g.closePath(); fs(g, c());
    rrect(g, -40, -4, 56, 8, 3, c(), 1.6);
    rrect(g, -49, -3, 11, 6, 2, c(0, 0, -12), 1.2);
  } });
  def('maracas', { w: 72, h: 72, zone: 'table', hue: [0, 360], sat: 75, lit: 55, pat: [2, 5], draw: function (g, o, c) {
    var P = [[-5, -16], [5, -8], [-4, -2], [5, -20], [0, -10]], i;
    for (var k = -1; k <= 1; k += 2) {
      g.save(); g.translate(k * 13, 0); g.rotate(k * .35);
      rrect(g, -3, 4, 6, 28, 3, '#8a5a30', 1.2);
      ell(g, 0, -10, 13, 16, c(k > 0 ? 40 : 0));
      for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 3.4, '#fff', 0);
      g.restore();
    }
  } });
  def('musicnote', { w: 64, h: 72, zone: 'wall', hue: [260, 330], sat: 65, lit: 46, pat: [1, 3], draw: function (g, o, c) {
    var n = o.p, i, X = [-18, 0, 18], x;
    for (i = 0; i < n; i++) { x = X[i]; ell(g, x - 6, 22 - i * 4, 8, 6, c(), 1.4, -.4); line(g, x + 1, 20 - i * 4, x + 1, -24 - i * 4, 3, c()); }
    if (n === 1) { g.beginPath(); g.moveTo(-17, -24); g.quadraticCurveTo(-4, -18, -6, -4); g.lineWidth = 3.4; g.strokeStyle = c(); g.stroke(); }
    else poly(g, [X[0] - .5, -25, X[n - 1] + 2.5, -25 - (n - 1) * 4, X[n - 1] + 2.5, -17 - (n - 1) * 4, X[0] - .5, -17], c(), 0);
  } });
  def('metronome', { w: 56, h: 78, zone: 'table', hue: [18, 32], sat: 55, lit: 42, vmax: 2, pat: [3, 6], draw: function (g, o, c) {
    poly(g, [-12, -34, 12, -34, 24, 32, -24, 32], c());
    poly(g, [-8, -27, 8, -27, 15, 24, -15, 24], '#f6efe0', 1.2);
    for (var i = 0; i < o.p; i++) { var y = -20 + i * 8, hw = 7 + (y + 27) * .13; line(g, -hw, y, hw, y, 3, '#3a2616'); }
    g.save(); g.translate(0, 18); g.rotate(o.v === 0 ? -.32 : .32);
    line(g, 0, 0, 0, -42, 2.4, '#333'); rrect(g, -5.5, -32, 11, 8, 2, '#c9a24a', 1); g.restore();
    rrect(g, -27, 30, 54, 7, 2, c(0, 0, -12));
  } });
  def('xylophone', { w: 104, h: 60, zone: 'floor', hue: [20, 32], sat: 45, lit: 40, pat: [4, 7], draw: function (g, o, c) {
    line(g, -44, -10, 44, -16, 4, c()); line(g, -44, 18, 44, 10, 4, c());
    for (var i = 0; i < o.p; i++) {
      var x = -38 + i * 12, hh = 36 - i * 2.8, y0 = -12 - i * .5 + (36 - hh) / 2 - 2;
      rrect(g, x - 5, y0, 10, hh, 2, hsl(i * 45, 80, 58), 1.2); circ(g, x, y0 + 3, 1.4, '#eee', 0); circ(g, x, y0 + hh - 3, 1.4, '#eee', 0);
    }
    line(g, 18, 24, 44, 30, 2.4, '#8a5a30'); circ(g, 16, 23, 4.4, '#e5392e', 1.2);
  } });
  def('speaker', { w: 56, h: 92, zone: 'floor', hue: [200, 240], sat: 12, lit: 26, low: true, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -24, -42, 48, 84, 5, c());
    var S = [[6, 15], [-26, 9], [30, 7]];
    for (var i = 0; i < o.p; i++) { var y = S[i][0], rr = S[i][1]; circ(g, 0, y, rr, '#c9ced6', 1.4); circ(g, 0, y, rr * .76, '#2b2b33', 0); circ(g, 0, y, rr * .26, '#9aa0aa', 0); }
  } });
  def('accordion', { w: 98, h: 64, zone: 'table', hue: [0, 360], sat: 70, lit: 48, pat: [4, 7], draw: function (g, o, c) {
    var n = o.p, k, w = 56 / n, x0;
    for (k = 0; k < n; k++) { x0 = -28 + k * w; poly(g, [x0, -22, x0 + w / 2, -26, x0 + w, -22, x0 + w, 22, x0 + w / 2, 26, x0, 22], k % 2 ? '#f6efe0' : c(0, 0, -14), 1.2); }
    rrect(g, -46, -26, 18, 52, 3, c()); rrect(g, -42, -22, 10, 44, 2, '#fbf8f0', 1);
    for (k = 0; k < 5; k++) rrect(g, -42, -19 + k * 9, 6, 4, 1, '#222', 0);
    rrect(g, 28, -26, 18, 52, 3, c());
    for (k = 0; k < 4; k++) circ(g, 37, -15 + k * 10, 2.4, '#fbf8f0', 0);
  } });
  def('tambourine', { w: 66, h: 66, zone: 'wall', hue: [20, 40], sat: 60, lit: 50, pat: [3, 6], draw: function (g, o, c) {
    circ(g, 0, 0, 26, c()); circ(g, 0, 0, 20, '#f6efe0', 1.4);
    for (var i = 0; i < o.p; i++) { var a = -Math.PI / 2 + i * TAU / 6; ell(g, Math.cos(a) * 23, Math.sin(a) * 23, 6.4, 3.8, '#d7dbe5', 1.4, a + Math.PI / 2); }
    line(g, -18, 18, -28, 30, 2.4, '#e5392e');
  } });
  def('headphones', { w: 72, h: 66, zone: 'table', hue: [0, 360], sat: 65, lit: 50, vmax: 2, pat: [0, 2], draw: function (g, o, c) {
    arc(g, 0, 4, 26, Math.PI * 1.04, Math.PI * 1.96, 5, c(0, 0, -12));
    for (var k = -1; k <= 1; k += 2) {
      var x = k * 25;
      var cup = o.v === 0 ? function () { rpath(g, x - 9, -4, 18, 30, 8); } : function () { g.beginPath(); g.arc(x, 11, 12, 0, TAU); };
      striped(g, cup, c(), o.p, x - 12, x + 12, -4, 26, 3.6, '#fff', false);
    }
  } });
  def('mic', { w: 50, h: 100, zone: 'floor', hue: [200, 240], sat: 10, lit: 30, low: true, pat: [2, 4], draw: function (g, o, c) {
    line(g, 0, 0, 0, 42, 3, '#444'); line(g, 0, 40, -16, 48, 3, '#444'); line(g, 0, 40, 16, 48, 3, '#444');
    rrect(g, -5, -15, 10, 22, 3, c(), 1.4);
    striped(g, function () { g.beginPath(); g.arc(0, -29, 13, 0, TAU); }, '#c9ced6', o.p, -13, 13, -42, -16, 3, '#5a606a', false);
    rrect(g, -9, -17, 18, 4, 2, c(0, 0, 22), 1);
  } });

  /* ===== dụng cụ thể thao ===== */
  def('soccer', { w: 50, h: 50, zone: 'floor', hue: [0, 360], sat: 0, lit: 96, low: true, pat: [2, 5], draw: function (g, o, c) {
    circ(g, 0, 0, 22, c());
    var P = [[0, 0, 7], [0, -18, 6.5], [17, -6, 6.5], [11, 15, 6.5], [-11, 15, 6.5], [-17, -6, 6.5]];
    g.save(); g.beginPath(); g.arc(0, 0, 21, 0, TAU); g.clip();
    for (var i = 0; i < o.p; i++) ngon(g, P[i][0], P[i][1], P[i][2], 5, '#1b1b22', 0, -Math.PI / 2);
    g.restore();
    circ(g, 0, 0, 22, 'rgba(0,0,0,0)', 2);
  } });
  def('basketball', { w: 50, h: 50, zone: 'floor', hue: [20, 30], sat: 85, lit: 50, vmax: 2, draw: function (g, o, c) {
    circ(g, 0, 0, 22, c());
    g.save(); g.beginPath(); g.arc(0, 0, 21, 0, TAU); g.clip(); if (o.v === 1) g.rotate(.7);
    line(g, -22, 0, 22, 0, 2.2, '#2a1a0e'); line(g, 0, -22, 0, 22, 2.2, '#2a1a0e');
    arc(g, -30, 0, 20, -.95, .95, 2.2, '#2a1a0e'); arc(g, 30, 0, 20, Math.PI - .95, Math.PI + .95, 2.2, '#2a1a0e');
    g.restore();
    circ(g, 0, 0, 22, 'rgba(0,0,0,0)', 2);
  } });
  def('racket', { w: 56, h: 112, zone: 'floor', hue: [0, 360], sat: 70, lit: 50, pat: [3, 5], draw: function (g, o, c) {
    rrect(g, -4, 14, 8, 40, 3, '#3a3a44', 1.4);
    poly(g, [-4, 16, 4, 16, 12, 6, -12, 6], c(), 1.4);
    var hd = function () { g.beginPath(); g.ellipse(0, -22, 21, 29, 0, 0, TAU); };
    hd(); fs(g, 'rgba(255,255,255,.35)', 0);
    g.save(); hd(); g.clip();
    for (var k = 0; k < 5; k++) line(g, -22, -42 + k * 10, 22, -42 + k * 10, 1.4, '#9aa0aa');
    var X = [0, -8, 8, -15, 15];
    for (k = 0; k < o.p; k++) line(g, X[k], -52, X[k], 8, 2.4, '#3a3a44');
    g.restore();
    hd(); g.lineWidth = 5; g.strokeStyle = c(); g.stroke();
  } });
  def('trophy', { w: 64, h: 86, zone: 'shelf', hue: [42, 50], sat: 85, lit: 52, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    if (o.v === 0) { arc(g, -22, -16, 9, Math.PI * .5, Math.PI * 1.5, 4, c()); arc(g, 22, -16, 9, -Math.PI * .5, Math.PI * .5, 4, c()); }
    else { g.beginPath(); g.moveTo(-20, -26); g.lineTo(-30, -26); g.lineTo(-30, -12); g.lineTo(-16, -2); g.moveTo(20, -26); g.lineTo(30, -26); g.lineTo(30, -12); g.lineTo(16, -2); g.lineWidth = 4; g.strokeStyle = c(); g.lineJoin = 'round'; g.stroke(); }
    rrect(g, -20, 28, 40, 12, 2, '#5a3a24'); rrect(g, -5, 6, 10, 14, 2, c(0, 0, -8)); rrect(g, -12, 18, 24, 10, 2, c(0, 0, -8));
    g.beginPath(); g.moveTo(-22, -30); g.lineTo(22, -30); g.quadraticCurveTo(22, 6, 0, 9); g.quadraticCurveTo(-22, 6, -22, -30); g.closePath(); fs(g, c());
    var P = [[0, -13], [-11, -21], [11, -21]];
    for (var i = 0; i < o.p; i++) { g.save(); g.translate(P[i][0], P[i][1]); star(g, 5, 7, 3, '#fff7c8', 1); g.restore(); }
  } });
  def('medal', { w: 44, h: 84, zone: 'wall', hue: [0, 360], sat: 70, lit: 50, pat: [1, 3], draw: function (g, o, c) {
    hook(g, -44);
    striped(g, function () { rpath(g, -14, -38, 28, 36, 2); }, c(), o.p, -14, 14, -38, -2, 4.6, '#fff', true);
    circ(g, 0, 16, 17, '#e8b830', 1.8); circ(g, 0, 16, 11, '#f6d360', 1.2);
    g.save(); g.translate(0, 16); star(g, 5, 7, 3, '#e8b830', 0); g.restore();
  } });
  def('sneaker', { w: 92, h: 50, zone: 'floor', hue: [0, 360], sat: 70, lit: 52, asym: true, pat: [2, 5], draw: function (g, o, c) {
    rrect(g, -43, 12, 86, 9, 4, '#f6f6f6', 1.6);
    g.beginPath(); g.moveTo(-40, 12); g.lineTo(-38, -10); g.quadraticCurveTo(-30, -19, -18, -17); g.lineTo(-2, -2); g.quadraticCurveTo(26, -4, 40, 6); g.lineTo(42, 12); g.closePath(); fs(g, c());
    g.beginPath(); g.moveTo(-30, 6); g.quadraticCurveTo(0, 12, 26, 0); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke();
    for (var i = 0; i < o.p; i++) { var x = -21 + i * 5.6, y = -13 + i * 3.6; line(g, x - 5, y - 3, x + 5, y + 3, 3, '#fff'); line(g, x - 5, y + 3, x + 5, y - 3, 3, '#fff'); }
  } });
  def('dumbbell', { w: 100, h: 40, zone: 'floor', hue: [200, 240], sat: 12, lit: 28, low: true, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -42, -3, 84, 6, 2, '#c9ced6', 1.4);
    for (var k = -1; k <= 1; k += 2) for (var i = 0; i < o.p; i++) { var x = k * (20 + i * 8); rrect(g, x - 3.5, -16 + i * 2, 7, 32 - i * 4, 2, c(), 1.4); }
  } });
  def('skateboard', { w: 100, h: 40, zone: 'floor', hue: [0, 360], sat: 75, lit: 52, pat: [1, 3], draw: function (g, o, c) {
    [[-30, -14], [30, -14], [-30, 14], [30, 14]].forEach(function (p) { circ(g, p[0], p[1], 5, '#f6d360', 1.2); });
    striped(g, function () { rpath(g, -46, -12, 92, 24, 12); }, c(), o.p, -46, 46, -12, 12, 5, '#fff', true);
  } });
  def('cap', { w: 72, h: 44, zone: 'shelf', hue: [0, 360], sat: 70, lit: 50, asym: true, pat: [1, 3], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(8, 10); g.quadraticCurveTo(36, 7, 39, 16); g.quadraticCurveTo(24, 21, 4, 16); g.closePath(); fs(g, c(0, 0, -12));
    striped(g, function () { g.beginPath(); g.moveTo(-28, 14); g.quadraticCurveTo(-28, -20, 0, -20); g.quadraticCurveTo(26, -20, 26, 14); g.closePath(); }, c(), o.p, -28, 26, -20, 14, 4.6, '#fff', true);
    circ(g, 0, -20, 3, c(0, 0, -12), 1);
  } });
  def('bowlingpin', { w: 32, h: 86, zone: 'floor', hue: [0, 8], sat: 80, lit: 50, pat: [1, 3], draw: function (g, o, c) {
    var pin = function () {
      g.beginPath(); g.moveTo(0, -40);
      g.quadraticCurveTo(8, -40, 8, -30); g.quadraticCurveTo(8, -20, 5, -14); g.quadraticCurveTo(14, 0, 13, 20); g.quadraticCurveTo(12, 38, 6, 40);
      g.lineTo(-6, 40); g.quadraticCurveTo(-12, 38, -13, 20); g.quadraticCurveTo(-14, 0, -5, -14); g.quadraticCurveTo(-8, -20, -8, -30); g.quadraticCurveTo(-8, -40, 0, -40); g.closePath();
    };
    pin(); fs(g, '#fbfbf6', 0);
    g.save(); pin(); g.clip(); g.fillStyle = c();
    for (var i = 0; i < o.p; i++) g.fillRect(-15, -15 + i * 7.5, 30, 4.6);
    g.restore();
    pin(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  } });
  def('shuttle', { w: 46, h: 58, zone: 'floor', hue: [0, 360], sat: 70, lit: 55, pat: [4, 7], draw: function (g, o, c) {
    var n = o.p, i, a;
    for (i = 0; i < n; i++) {
      a = (i - (n - 1) / 2) * (1.1 / (n - 1));
      g.save(); g.translate(0, 14); g.rotate(a);
      ell(g, 0, -21, 6, 14, '#fbfbf6', 1.2); line(g, 0, -5, 0, -33, 1.2, '#bbb');
      g.restore();
    }
    rrect(g, -10, 8, 20, 6, 2, c(), 1);
    g.beginPath(); g.arc(0, 14, 9, 0, Math.PI); g.closePath(); fs(g, c(0, 0, -10), 1.6);
  } });
  def('pennant', { w: 88, h: 46, zone: 'wall', hue: [0, 360], sat: 75, lit: 50, asym: true, pat: [1, 3], draw: function (g, o, c) {
    line(g, -41, -20, -41, 21, 3.4, '#8a5a30');
    striped(g, function () { g.beginPath(); g.moveTo(-38, -16); g.lineTo(42, 0); g.lineTo(-38, 16); g.closePath(); }, c(), o.p, -38, 42, -16, 16, 5, '#fff', true);
  } });

  /* ===== sạp trái cây ===== */
  def('bananas', { w: 74, h: 60, zone: 'table', hue: [48, 56], sat: 90, lit: 58, pat: [2, 5], draw: function (g, o, c) {
    for (var i = 0; i < o.p; i++) {
      g.save(); g.translate(-22, -16); g.rotate(-.35 + i * .26);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(12, 30, 50, 22); g.quadraticCurveTo(18, 16, 5, -3); g.closePath(); fs(g, c(i % 2 ? -4 : 0, 0, i % 2 ? -6 : 0), 1.6);
      circ(g, 50, 22, 2.2, '#5a3a24', 0);
      g.restore();
    }
    rrect(g, -27, -22, 9, 9, 2, '#6b8a2a', 1.2);
  } });
  def('grapes', { w: 54, h: 70, zone: 'table', hue: [270, 300], sat: 50, lit: 42, pat: [6, 10], draw: function (g, o, c) {
    line(g, 0, -30, 2, -22, 3, '#5a3a24'); ell(g, 9, -27, 9, 5, '#4fae48', 1.2, -.3);
    var P = [[-10, -14], [2, -15], [13, -12], [-4, -4], [8, -3], [-15, -3], [2, 7], [-9, 8], [13, 7], [-3, 18], [8, 18]];
    for (var i = 0; i < o.p; i++) { circ(g, P[i][0], P[i][1], 6.6, c(i % 2 ? 6 : 0), 1.4); circ(g, P[i][0] - 2, P[i][1] - 2, 1.6, 'rgba(255,255,255,.6)', 0); }
  } });
  def('watermelon', { w: 76, h: 50, zone: 'table', hue: [350, 360], sat: 80, lit: 55, vmax: 2, pat: [3, 7], draw: function (g, o, c) {
    if (o.v === 0) { g.beginPath(); g.arc(0, -10, 34, 0, Math.PI); g.closePath(); fs(g, '#3f8f3a'); g.beginPath(); g.arc(0, -10, 29, 0, Math.PI); g.closePath(); fs(g, '#e8f5d0', 0); g.beginPath(); g.arc(0, -10, 26, 0, Math.PI); g.closePath(); fs(g, c(), 0); }
    else { poly(g, [-34, -10, 34, -10, 0, 34], '#3f8f3a'); poly(g, [-28, -10, 28, -10, 0, 27], '#e8f5d0', 0); poly(g, [-25, -10, 25, -10, 0, 24], c(), 0); }
    var P = [[-12, -2], [0, 4], [12, -2], [-6, 10], [6, 10], [-18, -6], [18, -6]];
    for (var i = 0; i < o.p; i++) ell(g, P[i][0], P[i][1], 3.6, 5, '#1b1420', 0);
  } });
  def('berries', { w: 66, h: 52, zone: 'table', hue: [0, 8], sat: 80, lit: 50, pat: [2, 5], draw: function (g, o, c) {
    var P = [[-15, -6], [2, -9], [16, -5], [-6, 1], [10, 2]], i, x, y;
    for (i = 0; i < o.p; i++) {
      x = P[i][0]; y = P[i][1];
      g.beginPath(); g.moveTo(x - 8, y - 4); g.quadraticCurveTo(x, y - 9, x + 8, y - 4); g.quadraticCurveTo(x + 6, y + 8, x, y + 11); g.quadraticCurveTo(x - 6, y + 8, x - 8, y - 4); fs(g, c(), 1.4);
      poly(g, [x - 6, y - 5, x, y - 10, x + 6, y - 5, x, y - 3], '#3f9b48', 0);
      circ(g, x - 2, y, 1, '#ffe9a0', 0); circ(g, x + 3, y + 3, 1, '#ffe9a0', 0);
    }
    rrect(g, -29, 5, 58, 20, 3, '#5aa0d8');
    for (i = 0; i < 4; i++) line(g, -24 + i * 16, 8, -24 + i * 16, 22, 1.6, 'rgba(255,255,255,.6)');
  } });
  def('pineapple', { w: 52, h: 92, zone: 'table', hue: [38, 46], sat: 80, lit: 50, pat: [3, 5], draw: function (g, o, c) {
    var n = o.p, i, a, d;
    for (i = 0; i < n; i++) { d = i - (n - 1) / 2; a = d * .42; g.save(); g.translate(0, -12); g.rotate(a); poly(g, [-5.5, 0, 0, -32 + Math.abs(d) * 5, 5.5, 0], '#3f9b48', 1.2); g.restore(); }
    var body = function () { g.beginPath(); g.ellipse(0, 16, 18, 26, 0, 0, TAU); };
    body(); fs(g, c(), 0);
    g.save(); body(); g.clip();
    for (i = -5; i <= 5; i++) { line(g, i * 8 - 20, -12, i * 8 + 20, 44, 1.4, '#a06a1a'); line(g, i * 8 + 20, -12, i * 8 - 20, 44, 1.4, '#a06a1a'); }
    g.restore();
    body(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  } });
  def('orange', { w: 54, h: 54, zone: 'table', hue: [26, 34], sat: 95, lit: 55, pat: [6, 9], draw: function (g, o, c) {
    circ(g, 0, 0, 24, c()); circ(g, 0, 0, 20, '#fff4d8', 0);
    var n = o.p, k, a0, a1;
    for (k = 0; k < n; k++) { a0 = -Math.PI / 2 + k * TAU / n; a1 = a0 + TAU / n; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 18, a0 + .1, a1 - .1); g.closePath(); fs(g, c(0, 0, 10), 0); }
    circ(g, 0, 0, 2.4, '#fff4d8', 0);
  } });
  def('carrots', { w: 72, h: 62, zone: 'table', hue: [22, 30], sat: 90, lit: 55, pat: [2, 4], draw: function (g, o, c) {
    for (var i = 0; i < o.p; i++) {
      g.save(); g.translate(-14 + i * 10, -14); g.rotate(-.5 + i * .3);
      line(g, 0, 0, -5, -12, 2.4, '#3f9b48'); line(g, 0, 0, 5, -12, 2.4, '#3f9b48'); line(g, 0, 0, 0, -15, 2.4, '#3f9b48');
      poly(g, [-6.5, 0, 6.5, 0, 0, 40], c(), 1.4);
      line(g, -3, 12, 1, 12, 1.4, c(0, 0, -16)); line(g, 0, 22, 3, 22, 1.4, c(0, 0, -16));
      g.restore();
    }
  } });
  def('cherries', { w: 52, h: 58, zone: 'table', hue: [348, 358], sat: 80, lit: 42, pat: [1, 3], draw: function (g, o, c) {
    var P = [[-12, 14], [10, 16], [-1, 21]];
    ell(g, 11, -23, 10, 5, '#4fae48', 1.2, -.4);
    for (var i = 0; i < o.p; i++) {
      g.beginPath(); g.moveTo(2, -22); g.quadraticCurveTo(P[i][0] * .4, -6, P[i][0], P[i][1] - 8); g.lineWidth = 2.2; g.strokeStyle = '#4a7a2a'; g.stroke();
      circ(g, P[i][0], P[i][1], 9, c(), 1.6); circ(g, P[i][0] - 3, P[i][1] - 3, 2.2, 'rgba(255,255,255,.65)', 0);
    }
  } });
  def('corn', { w: 44, h: 92, zone: 'table', hue: [46, 54], sat: 90, lit: 55, pat: [3, 5], draw: function (g, o, c) {
    var cob = function () { g.beginPath(); g.ellipse(0, -4, 12, 32, 0, 0, TAU); };
    cob(); fs(g, c(), 0);
    g.save(); cob(); g.clip();
    var n = o.p, wk = 24 / n, j, k;
    for (j = 0; j < 12; j++) for (k = 0; k < n; k++) rrect(g, -12 + k * wk + .8, -36 + j * 5.6 + .6, wk - 1.6, 4.4, 1.4, c(0, 0, k % 2 ? -8 : 6), 0);
    g.restore();
    cob(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    poly(g, [-3, 42, -19, 16, -15, -14, -3, 10], '#5fae48', 1.4); poly(g, [3, 42, 19, 16, 15, -14, 3, 10], '#4f9e3e', 1.4);
  } });
  def('pear', { w: 44, h: 62, zone: 'table', hue: [70, 85], sat: 60, lit: 55, vmax: 2, asym: true, draw: function (g, o, c) {
    line(g, 0, -16, 3, -27, 2.6, '#5a3a24');
    if (o.v === 1) ell(g, 10, -25, 8, 4, '#3f9b48', 1.2, -.5);
    blob(g, [[0, 12, 16, 15], [0, -6, 10, 12]], c());
    ell(g, -7, 8, 3, 6, 'rgba(255,255,255,.5)', 0, .3);
  } });

  /* ===== cửa hàng thú cưng ===== */
  def('cat', { w: 74, h: 88, zone: 'floor', hue: [20, 40], sat: 70, lit: 58, vmax: 2, asym: true, pat: [1, 4], mood: true, draw: function (g, o, c) {
    g.beginPath();
    if (o.v === 0) { g.moveTo(16, 30); g.quadraticCurveTo(44, 26, 36, -4); }
    else { g.moveTo(14, 36); g.quadraticCurveTo(42, 42, 34, 22); }
    g.lineCap = 'round'; g.lineWidth = 9; g.strokeStyle = OL; g.stroke(); g.lineWidth = 6.5; g.strokeStyle = c(0, 0, -6); g.stroke();
    ell(g, 0, 16, 22, 22, c());
    var P = [[-11, 8], [11, 20], [-5, 27], [12, 3]], i;
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 6.4, c(0, 0, -30), 0);
    ell(g, -10, 36, 7, 5, c(0, 0, 12)); ell(g, 10, 36, 7, 5, c(0, 0, 12));
    poly(g, [-18, -30, -14, -48, -3, -37], c()); poly(g, [18, -30, 14, -48, 3, -37], c());
    poly(g, [-15, -33, -13, -43, -7, -37], '#f6b6c0', 0); poly(g, [15, -33, 13, -43, 7, -37], '#f6b6c0', 0);
    circ(g, 0, -20, 20, c());
    ell(g, -8, -23, 3, 4, '#1b1420', 0); ell(g, 8, -23, 3, 4, '#1b1420', 0); circ(g, -7, -24.5, 1.1, '#fff', 0); circ(g, 9, -24.5, 1.1, '#fff', 0);
    poly(g, [-3, -16, 3, -16, 0, -13], '#e07a8a', 0);
    for (i = -1; i <= 1; i += 2) { line(g, i * 9, -14, i * 26, -17, 1.2, 'rgba(255,255,255,.9)'); line(g, i * 9, -12, i * 26, -10, 1.2, 'rgba(255,255,255,.9)'); }
    mouth(g, o.m || 0, 0, -10, 15, '#3a2016');
  } });
  def('dog', { w: 78, h: 88, zone: 'floor', hue: [24, 36], sat: 45, lit: 62, vmax: 2, asym: true, pat: [1, 4], mood: true, draw: function (g, o, c) {
    g.beginPath(); g.moveTo(16, 24); g.quadraticCurveTo(34, 20, 36, 4); g.lineCap = 'round'; g.lineWidth = 8.5; g.strokeStyle = OL; g.stroke(); g.lineWidth = 6; g.strokeStyle = c(0, 0, -8); g.stroke();
    rrect(g, -14, 24, 10, 16, 4, c()); rrect(g, 4, 24, 10, 16, 4, c());
    ell(g, 0, 16, 22, 20, c());
    var P = [[-11, 12], [12, 18], [6, 5], [-6, 26]], i;
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 6.4, c(0, 0, -30), 0);
    rrect(g, -14, -3, 28, 5, 2, '#e5392e', 1); circ(g, 0, 5, 3, '#ffd23f', 1);
    if (o.v === 1) { poly(g, [-18, -24, -14, -46, -3, -33], c(0, 0, -26)); poly(g, [18, -24, 14, -46, 3, -33], c(0, 0, -26)); }
    ell(g, 0, -18, 20, 18, c());
    if (o.v === 0) { ell(g, -20, -15, 7, 14, c(0, 0, -26), 1.6, .3); ell(g, 20, -15, 7, 14, c(0, 0, -26), 1.6, -.3); }
    ell(g, 0, -8, 12, 9, c(0, 0, 22), 0);
    ell(g, 0, -13, 4.4, 3.2, '#1b1420', 0);
    eye(g, -8, -23, 3); eye(g, 8, -23, 3);
    mouth(g, o.m || 0, 0, -7, 15, '#1b1420');
  } });
  def('hamster', { w: 60, h: 50, zone: 'floor', hue: [28, 38], sat: 70, lit: 62, pat: [1, 3], mood: true, draw: function (g, o, c) {
    circ(g, -15, -16, 6.5, c(), 1.6); circ(g, 15, -16, 6.5, c(), 1.6); circ(g, -15, -16, 3.4, '#f6b6c0', 0); circ(g, 15, -16, 3.4, '#f6b6c0', 0);
    ell(g, 0, 2, 25, 20, c());
    var P = [[-18, -4], [18, -4], [0, -14]];
    for (var i = 0; i < o.p; i++) ell(g, P[i][0], P[i][1], 6.6, 5.6, c(0, 0, -26), 0);
    ell(g, 0, 9, 15, 11, '#fff6e6', 0);
    eye(g, -8, -3, 2.8); eye(g, 8, -3, 2.8);
    circ(g, -14, 5, 3.6, 'rgba(255,120,140,.5)', 0); circ(g, 14, 5, 3.6, 'rgba(255,120,140,.5)', 0);
    circ(g, 0, 1, 2, '#e07a8a', 0);
    mouth(g, o.m || 0, 0, 7, 15, '#5a3020');
    ell(g, -7, 20, 4.5, 3, c(0, 0, 10)); ell(g, 7, 20, 4.5, 3, c(0, 0, 10));
  } });
  def('parrot', { w: 56, h: 104, zone: 'floor', hue: [100, 140], sat: 70, lit: 45, asym: true, pat: [2, 4], draw: function (g, o, c) {
    line(g, 0, 20, 0, 48, 3.4, '#8a5a30'); ell(g, 0, 48, 14, 3.4, '#8a5a30', 1.2); line(g, -20, 20, 20, 20, 4, '#8a5a30');
    var F = ['#e5392e', '#ffd23f', '#3b82f6', '#f59e2a'];
    for (var i = 0; i < o.p; i++) { g.save(); g.translate(-4, 10); g.rotate(.25 + (i - 1.5) * .2); ell(g, 0, 18, 4, 16, F[i], 1.2); g.restore(); }
    ell(g, 0, -6, 14, 22, c());
    ell(g, -4, -2, 8, 16, c(0, 0, -12), 1.4, .2);
    line(g, -4, 16, -4, 21, 2.4, '#555'); line(g, 4, 16, 4, 21, 2.4, '#555');
    circ(g, 4, -28, 11, c());
    g.beginPath(); g.moveTo(12, -32); g.quadraticCurveTo(23, -30, 17, -19); g.quadraticCurveTo(15, -24, 11, -24); g.closePath(); fs(g, '#f2c14e', 1.4);
    circ(g, 6, -31, 3.4, '#fff', 1); circ(g, 7, -31, 1.6, '#1b1420', 0);
  } });
  def('fishbowl', { w: 70, h: 68, zone: 'shelf', hue: [0, 40], sat: 90, lit: 55, pat: [1, 3], draw: function (g, o, c) {
    var bowl = function () { g.beginPath(); g.arc(0, 2, 28, 0, TAU); };
    bowl(); fs(g, 'rgba(200,235,255,.55)', 0);
    g.save(); bowl(); g.clip(); g.fillStyle = 'rgba(80,170,230,.55)'; g.fillRect(-30, -10, 60, 42);
    for (var k = 0; k < 7; k++) circ(g, -18 + k * 6, 27, 3.4, hsl(k * 50, 40, 60), 0);
    g.restore();
    var P = [[-8, 8, 1], [10, -2, -1], [2, 18, 1]];
    for (var i = 0; i < o.p; i++) {
      g.save(); g.translate(P[i][0], P[i][1]); g.scale(P[i][2], 1);
      poly(g, [-6, 0, -14, -6, -14, 6], c(i * 20), 1.2); ell(g, 0, 0, 8, 5.4, c(i * 20), 1.2); circ(g, 4, -1, 1.4, '#1b1420', 0);
      g.restore();
    }
    bowl(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    ell(g, 0, -24, 15, 4, 'rgba(255,255,255,.7)', 1.4);
  } });
  def('birdcage', { w: 62, h: 96, zone: 'wall', hue: [40, 50], sat: 70, lit: 52, pat: [4, 7], draw: function (g, o, c) {
    g.beginPath(); g.arc(0, -44, 4, 0, TAU); g.lineWidth = 2.4; g.strokeStyle = c(0, 0, -10); g.stroke();
    line(g, -14, 12, 14, 12, 2.4, '#8a5a30');
    ell(g, 0, 4, 8, 6.5, '#ffd23f', 1.2); circ(g, 6, -3, 4.6, '#ffd23f', 1.2); poly(g, [10, -4, 14, -2, 10, 0], '#f59e2a', 0); circ(g, 7, -4, 1, '#1b1420', 0);
    var n = o.p, k, x, y;
    for (k = 0; k < n; k++) { x = -24 + k * 48 / (n - 1); y = -10 - Math.sqrt(Math.max(0, 576 - x * x)); line(g, x, y, x, 30, 2, c()); }
    arc(g, 0, -10, 24, Math.PI, 0, 3, c());
    rrect(g, -27, 30, 54, 7, 2, c(), 1.4);
  } });
  def('petbowl', { w: 64, h: 40, zone: 'floor', hue: [0, 360], sat: 70, lit: 52, pat: [3, 6], draw: function (g, o, c) {
    var P = [[-12, -8], [0, -10], [12, -8], [-6, -14], [6, -14], [0, -18]];
    for (var i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 5, '#9a5a2a', 1.2);
    poly(g, [-28, -6, 28, -6, 22, 14, -22, 14], c());
    rrect(g, -8, 2, 16, 4, 2, '#fff', 0); circ(g, -8, 2, 2.6, '#fff', 0); circ(g, -8, 6, 2.6, '#fff', 0); circ(g, 8, 2, 2.6, '#fff', 0); circ(g, 8, 6, 2.6, '#fff', 0);
  } });
  def('bone', { w: 62, h: 28, zone: 'floor', hue: [36, 44], sat: 40, lit: 90, low: true, draw: function (g, o, c) {
    blob(g, [[-20, -6, 7], [-20, 6, 7], [20, -6, 7], [20, 6, 7], [0, 0, 20, 5]], c());
  } });
  def('yarn', { w: 52, h: 48, zone: 'floor', hue: [0, 360], sat: 70, lit: 55, pat: [2, 5], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(12, 14); g.quadraticCurveTo(28, 26, 24, 18); g.lineWidth = 2; g.strokeStyle = c(); g.stroke();
    var ball = function () { g.beginPath(); g.arc(0, 0, 18, 0, TAU); };
    ball(); fs(g, c(), 0);
    g.save(); ball(); g.clip();
    for (var i = 0; i < o.p; i++) { g.save(); g.rotate(i * .75); g.beginPath(); g.ellipse(0, 4, 18, 8, 0, 0, TAU); g.lineWidth = 2.4; g.strokeStyle = c(0, 0, -22); g.stroke(); g.restore(); }
    g.restore();
    ball(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  } });
  def('doghouse', { w: 96, h: 92, zone: 'floor', hue: [0, 40], sat: 55, lit: 48, pat: [2, 4], draw: function (g, o, c) {
    rrect(g, -36, -10, 72, 50, 2, c());
    for (var k = 0; k < 4; k++) line(g, -34, 0 + k * 10, 34, 0 + k * 10, 1.2, c(0, 0, -12));
    poly(g, [-46, -6, 0, -44, 46, -6], '#b5442f');
    for (var i = 0; i < o.p; i++) { var y = -14 - i * 8, hw = 46 * (y + 44) / 38; line(g, -hw + 5, y, hw - 5, y, 2.4, '#7a2a1a'); }
    g.beginPath(); g.moveTo(-14, 40); g.lineTo(-14, 12); g.arc(0, 12, 14, Math.PI, 0); g.lineTo(14, 40); g.closePath(); fs(g, '#2a1a10', 1.4);
  } });
  def('mouse', { w: 66, h: 36, zone: 'floor', hue: [210, 230], sat: 8, lit: 66, low: true, vmax: 2, asym: true, draw: function (g, o, c) {
    g.beginPath(); g.moveTo(-20, 8); g.quadraticCurveTo(-38, 14, -34, -2); g.lineWidth = 2.4; g.strokeStyle = '#e8a0a8'; g.lineCap = 'round'; g.stroke();
    ell(g, -2, 4, 20, 12, c());
    circ(g, 9, -9, 8, c(), 1.6); circ(g, 9, -9, 4.6, '#f6b6c0', 0);
    ell(g, 16, 1, 12, 9, c());
    circ(g, 28, 1, 2.6, '#e07a8a', 0); eye(g, 18, -2, 2.2);
    if (o.v === 1) { poly(g, [22, 6, 38, 12, 22, 16], '#ffd23f', 1.2); circ(g, 27, 11, 1.4, '#e8b830', 0); }
  } });
  def('scratchpost', { w: 58, h: 102, zone: 'floor', hue: [0, 360], sat: 55, lit: 52, pat: [4, 7], draw: function (g, o, c) {
    rrect(g, -26, 38, 52, 10, 3, c());
    rrect(g, -11, -36, 22, 76, 2, '#d8b98a');
    for (var i = 0; i < o.p; i++) line(g, -11, 32 - i * 9, 11, 32 - i * 9, 3.4, '#8a6a3a');
    rrect(g, -24, -45, 48, 9, 3, c());
    line(g, 18, -36, 18, -16, 1.4, '#555'); circ(g, 18, -12, 5, '#e5392e', 1.2);
  } });

  /* ===== tủ quần áo ===== */
  def('shirt', { w: 80, h: 90, zone: 'wall', hue: [0, 360], sat: 55, lit: 58, vmax: 2, pat: [2, 5], draw: function (g, o, c) {
    hanger(g, -38);
    var lg = o.v === 1;
    g.beginPath(); g.moveTo(-10, -30); g.lineTo(-28, -24); g.lineTo(lg ? -38 : -34, lg ? 16 : -6); g.lineTo(lg ? -28 : -24, lg ? 18 : -1); g.lineTo(-22, -12); g.lineTo(-22, 38);
    g.lineTo(22, 38); g.lineTo(22, -12); g.lineTo(lg ? 28 : 24, lg ? 18 : -1); g.lineTo(lg ? 38 : 34, lg ? 16 : -6); g.lineTo(28, -24); g.lineTo(10, -30); g.quadraticCurveTo(0, -22, -10, -30); g.closePath(); fs(g, c());
    poly(g, [-10, -30, 0, -22, -6, -17], '#fbf8f0', 1.2); poly(g, [10, -30, 0, -22, 6, -17], '#fbf8f0', 1.2);
    line(g, 0, -20, 0, 36, 1.4, c(0, 0, -14));
    for (var i = 0; i < o.p; i++) circ(g, 0, -13 + i * 11, 4, '#fbf8f0', 1.2);
  } });
  def('dress', { w: 72, h: 98, zone: 'wall', hue: [0, 360], sat: 60, lit: 55, pat: [2, 6], draw: function (g, o, c) {
    hanger(g, -44);
    g.beginPath(); g.moveTo(-12, -34); g.lineTo(-14, -10); g.lineTo(-30, 42); g.quadraticCurveTo(0, 48, 30, 42); g.lineTo(14, -10); g.lineTo(12, -34); g.quadraticCurveTo(0, -26, -12, -34); g.closePath(); fs(g, c());
    line(g, -10, -34, -18, -36, 2, c(0, 0, -14)); line(g, 10, -34, 18, -36, 2, c(0, 0, -14));
    var P = [[-8, 1], [8, 6], [-15, 23], [2, 19], [17, 28], [-4, 36]];
    for (var i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 5, '#fff', 0);
    rrect(g, -15, -13, 30, 5, 2, c(0, 0, -16), 0);
  } });
  def('sweater', { w: 88, h: 84, zone: 'wall', hue: [0, 360], sat: 50, lit: 50, pat: [1, 3], draw: function (g, o, c) {
    hanger(g, -38);
    striped(g, function () { g.beginPath(); g.moveTo(-10, -30); g.lineTo(-30, -24); g.lineTo(-42, 26); g.lineTo(-32, 28); g.lineTo(-24, -6); g.lineTo(-24, 36); g.lineTo(24, 36); g.lineTo(24, -6); g.lineTo(32, 28); g.lineTo(42, 26); g.lineTo(30, -24); g.lineTo(10, -30); g.quadraticCurveTo(0, -22, -10, -30); g.closePath(); },
      c(), o.p, -42, 42, -20, 30, 6, '#f6efe0', false);
    rrect(g, -24, 32, 48, 6, 2, c(0, 0, -12), 1.2);
  } });
  def('hat', { w: 86, h: 46, zone: 'shelf', hue: [36, 46], sat: 60, lit: 66, pat: [1, 3], draw: function (g, o, c) {
    ell(g, 0, 10, 40, 9, c());
    g.beginPath(); g.moveTo(-20, 8); g.quadraticCurveTo(-22, -20, 0, -20); g.quadraticCurveTo(22, -20, 20, 8); g.closePath(); fs(g, c());
    rrect(g, -21, -3, 42, 8, 2, c(150, 0, -22), 1);
    var X = [-13, 13, 0];
    for (var i = 0; i < o.p; i++) flower5(g, X[i], 1, 7, '#fff', '#ffcf3a');
  } });
  def('socks', { w: 64, h: 74, zone: 'wall', hue: [0, 360], sat: 70, lit: 55, asym: true, pat: [1, 3], draw: function (g, o, c) {
    line(g, -30, -34, 30, -34, 1.6, '#777');
    for (var k = -1; k <= 1; k += 2) {
      var x = k * 12;
      rrect(g, x - 3, -38, 6, 9, 1.5, '#c89a5a', 1);
      var sk = function () { g.beginPath(); g.moveTo(x - 8, -30); g.lineTo(x + 8, -30); g.lineTo(x + 8, 14); g.quadraticCurveTo(x + 22, 14, x + 22, 24); g.quadraticCurveTo(x + 22, 32, x + 6, 32); g.quadraticCurveTo(x - 8, 32, x - 8, 18); g.closePath(); };
      sk(); fs(g, c(), 0);
      g.save(); sk(); g.clip(); g.fillStyle = '#fff';
      for (var i = 0; i < o.p; i++) g.fillRect(x - 9, -24 + i * 9, 18, 4.6);
      g.fillStyle = c(0, 0, -16); g.fillRect(x + 12, 14, 12, 20);
      g.restore();
      sk(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    }
  } });
  def('boots', { w: 76, h: 72, zone: 'floor', hue: [16, 30], sat: 50, lit: 34, asym: true, pat: [1, 3], draw: function (g, o, c) {
    for (var k = 0; k < 2; k++) {
      var x = -28 + k * 26;
      g.beginPath(); g.moveTo(x, -32); g.lineTo(x + 18, -32); g.lineTo(x + 18, 10); g.quadraticCurveTo(x + 32, 12, x + 32, 24); g.lineTo(x, 24); g.closePath(); fs(g, c(k * 4));
      rrect(g, x - 1, 22, 34, 7, 2, '#2a1a10', 1.2);
      for (var i = 0; i < o.p; i++) rrect(g, x + 1, -24 + i * 10, 16, 5, 1.5, '#e8c860', 1);
    }
  } });
  def('scarf', { w: 52, h: 104, zone: 'wall', hue: [0, 360], sat: 70, lit: 50, pat: [2, 4], draw: function (g, o, c) {
    hook(g, -48);
    var s1 = function () { rpath(g, -16, -42, 15, 86, 3); }, s2 = function () { rpath(g, 1, -42, 15, 78, 3); };
    var Y = [-22, -6, 10, 26], i, s;
    [s2, s1].forEach(function (p) {
      p(); fs(g, c(), 0);
      g.save(); p(); g.clip(); g.fillStyle = '#fff';
      for (i = 0; i < o.p; i++) g.fillRect(-18, Y[i], 36, 5);
      g.restore();
      p(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    });
    rrect(g, -18, -44, 36, 8, 4, c(0, 0, -12), 1.4);
    for (s = 0; s < 4; s++) { line(g, -14 + s * 4, 44, -14 + s * 4, 50, 1.6, c()); line(g, 3 + s * 4, 36, 3 + s * 4, 42, 1.6, c()); }
  } });
  def('tie', { w: 38, h: 92, zone: 'wall', hue: [0, 360], sat: 65, lit: 45, pat: [2, 4], draw: function (g, o, c) {
    hook(g, -46);
    poly(g, [-7, -38, 7, -38, 5, -28, -5, -28], c(0, 0, -10));
    var bl = function () { g.beginPath(); g.moveTo(-5, -28); g.lineTo(5, -28); g.lineTo(12, 30); g.lineTo(0, 42); g.lineTo(-12, 30); g.closePath(); };
    bl(); fs(g, c(), 0);
    g.save(); bl(); g.clip();
    for (var i = 0; i < o.p; i++) { var y0 = -14 + i * 13; line(g, -14, y0 + 6, 14, y0 - 6, 4.6, '#fff'); }
    g.restore();
    bl(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  } });
  def('handbag', { w: 68, h: 66, zone: 'shelf', hue: [0, 360], sat: 60, lit: 46, vmax: 2, pat: [2, 5], draw: function (g, o, c) {
    if (o.v === 0) arc(g, 0, -10, 16, Math.PI, 0, 4.5, c(0, 0, -14));
    else { arc(g, -9, -8, 8, Math.PI, 0, 3.6, c(0, 0, -14)); arc(g, 9, -8, 8, Math.PI, 0, 3.6, c(0, 0, -14)); }
    poly(g, [-26, -8, 26, -8, 30, 28, -30, 28], c());
    var P = [[-18, 17], [18, 17], [-6, 21], [6, 21], [0, 13]];
    for (var i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 4.4, '#ffd6e6', 1);
    poly(g, [-26, -8, 26, -8, 22, 8, -22, 8], c(0, 0, -10));
    circ(g, 0, 8, 4, '#e8c860', 1.2);
  } });
  def('sunglasses', { w: 72, h: 32, zone: 'shelf', hue: [0, 360], sat: 70, lit: 45, vmax: 2, draw: function (g, o, c) {
    line(g, -27, -5, -34, -9, 2.6, c()); line(g, 27, -5, 34, -9, 2.6, c());
    arc(g, 0, -1, 6, Math.PI, 0, 2.6, c());
    for (var k = -1; k <= 1; k += 2) {
      if (o.v === 0) { g.beginPath(); g.arc(k * 16, 0, 11, 0, TAU); } else rpath(g, k * 16 - 12, -9, 24, 18, 4);
      g.fillStyle = '#1b2030'; g.fill(); g.lineWidth = 3; g.strokeStyle = c(); g.stroke();
      line(g, k * 16 - 5, -4, k * 16 - 1, -7, 1.6, 'rgba(255,255,255,.6)');
    }
  } });

  /* ===== phòng tắm ===== */
  def('toothcup', { w: 46, h: 80, zone: 'shelf', hue: [0, 360], sat: 55, lit: 62, pat: [1, 3], draw: function (g, o, c) {
    var P = [[-6, -.22, 200], [6, .26, 0], [0, .04, 120]];
    for (var i = 0; i < o.p; i++) { g.save(); g.translate(P[i][0], 0); g.rotate(P[i][1]); rrect(g, -2.4, -40, 4.8, 40, 2, hsl(P[i][2], 75, 55), 1); rrect(g, -3.6, -49, 7.2, 12, 2, '#fbfbf6', 1); g.restore(); }
    poly(g, [-14, -10, 14, -10, 11, 26, -11, 26], c());
  } });
  def('soap', { w: 62, h: 50, zone: 'shelf', hue: [0, 360], sat: 55, lit: 70, pat: [2, 5], draw: function (g, o, c) {
    ell(g, 0, 15, 28, 6, '#c9e6f2', 1.6);
    rrect(g, -20, -2, 40, 16, 7, c());
    var P = [[-10, -11, 6], [6, -15, 5.4], [15, -5, 4.8], [-2, -24, 4.8], [-17, -23, 4.4]];
    for (var i = 0; i < o.p; i++) { circ(g, P[i][0], P[i][1], P[i][2], 'rgba(255,255,255,.9)', 1.6); circ(g, P[i][0] - P[i][2] * .35, P[i][1] - P[i][2] * .35, P[i][2] * .3, '#bfe6ff', 0); }
  } });
  def('towel', { w: 80, h: 92, zone: 'wall', hue: [0, 360], sat: 55, lit: 60, pat: [1, 3], draw: function (g, o, c) {
    circ(g, -38, -40, 4, '#c9ced6', 1.2); circ(g, 38, -40, 4, '#c9ced6', 1.2);
    rrect(g, -28, -38, 56, 80, 3, c());
    for (var i = 0; i < o.p; i++) rrect(g, -28, 10 + i * 9.5, 56, 5, 0, '#fff', 0);
    rrect(g, -28, -38, 56, 11, 2, c(0, 0, -8), 1.4);
    rrect(g, -40, -43, 80, 6, 3, '#c9ced6', 1.4);
    for (i = 0; i < 6; i++) line(g, -24 + i * 9.6, 42, -24 + i * 9.6, 47, 1.6, c(0, 0, -10));
  } });
  def('rubberduck', { w: 66, h: 56, zone: 'floor', hue: [48, 54], sat: 95, lit: 58, vmax: 2, asym: true, draw: function (g, o, c) {
    poly(g, [-26, 4, -36, -8, -22, -2], c());
    ell(g, -4, 10, 24, 14, c());
    ell(g, -8, 8, 11, 7, c(0, 0, -10), 1.4, -.2);
    circ(g, 12, -10, 13, c());
    ell(g, 25, -5, 9, 4.6, '#ff8a1e', 1.4);
    if (o.v === 0) eye(g, 15, -14, 2.6);
    else { rrect(g, 6, -18, 18, 7, 3, '#1b2030', 1); line(g, 2, -15, 6, -15, 1.6, '#1b2030'); }
  } });
  def('shampoo', { w: 38, h: 88, zone: 'shelf', hue: [0, 360], sat: 60, lit: 55, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    if (o.v === 0) { rrect(g, -3.5, -42, 7, 11, 2, '#eee', 1.2); rrect(g, -3.5, -46, 17, 5, 2, '#eee', 1.2); }
    else rrect(g, -9, -40, 18, 10, 4, c(0, 0, -16), 1.4);
    rrect(g, -14, -32, 28, 70, 8, c());
    rrect(g, -10, -12, 20, 32, 3, '#fbf8f0', 1);
    for (var i = 0; i < o.p; i++) rrect(g, -8, -8 + i * 8.4, 16, 4.6, 1, c(0, 0, -18), 0);
  } });
  def('mirror', { w: 78, h: 92, zone: 'wall', hue: [36, 46], sat: 60, lit: 55, vmax: 2, pat: [3, 6], draw: function (g, o, c) {
    var gl = g.createLinearGradient(-20, -30, 20, 30); gl.addColorStop(0, '#e6f6ff'); gl.addColorStop(1, '#a8d0e8');
    if (o.v === 0) { ell(g, 0, 0, 30, 38, c()); ell(g, 0, 0, 23, 31, gl, 1.2); }
    else { rrect(g, -30, -38, 60, 76, 8, c()); rrect(g, -23, -31, 46, 62, 4, gl, 1.2); }
    line(g, -12, -16, -2, -26, 3, 'rgba(255,255,255,.8)'); line(g, -12, -6, 6, -24, 2, 'rgba(255,255,255,.6)');
    var A6 = [-90, -30, 30, 90, 150, 210];
    for (var i = 0; i < o.p; i++) { var a = A6[i] * Math.PI / 180; circ(g, Math.cos(a) * 26.5, Math.sin(a) * 34.5, 4.6, '#fff3b0', 1.2); }
  } });
  def('sponge', { w: 58, h: 42, zone: 'shelf', hue: [48, 56], sat: 85, lit: 62, pat: [3, 7], draw: function (g, o, c) {
    rrect(g, -25, -14, 50, 9, 3, '#3fae5a');
    rrect(g, -25, -6, 50, 22, 4, c());
    var P = [[-16, 3], [-3, 8], [11, 2], [18, 10], [-10, 11], [3, -1], [-19, 10]];
    for (var i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 3.8, c(0, 0, -26), 0);
  } });
  def('toiletroll', { w: 50, h: 66, zone: 'shelf', hue: [0, 360], sat: 30, lit: 94, low: true, pat: [1, 3], draw: function (g, o, c) {
    var roll = function () { rpath(g, -18, -26, 36, 44, 3); };
    roll(); fs(g, '#fbfbf6', 0);
    g.save(); roll(); g.clip(); g.fillStyle = hsl(o.h, 65, 62);
    for (var i = 0; i < o.p; i++) g.fillRect(-20, -16 + i * 10, 40, 4.6);
    g.restore();
    roll(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    ell(g, 0, -26, 18, 6, '#ececec', 1.4); ell(g, 0, -26, 6, 2.4, '#c9a46a', 0);
    rrect(g, -14, 16, 28, 18, 1, '#fbfbf6', 1.2);
  } });
  def('comb', { w: 78, h: 32, zone: 'shelf', hue: [0, 360], sat: 65, lit: 55, pat: [6, 10], draw: function (g, o, c) {
    var n = o.p;
    for (var k = 0; k < n; k++) { var x = -30 + k * 60 / (n - 1); rrect(g, x - 1.8, -6, 3.6, 18, 1, c(0, 0, -8), 0); }
    rrect(g, -35, -13, 70, 9, 3, c());
  } });
  def('hairdryer', { w: 80, h: 72, zone: 'shelf', hue: [0, 360], sat: 65, lit: 55, asym: true, pat: [1, 3], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(-8, 36); g.quadraticCurveTo(-22, 44, -32, 36); g.lineWidth = 2; g.strokeStyle = '#444'; g.stroke();
    g.save(); g.rotate(-.18); rrect(g, -9, -2, 14, 36, 5, c(0, 0, -10)); g.restore();
    rrect(g, 12, -21, 24, 20, 3, c(0, 0, -14));
    striped(g, function () { rpath(g, -24, -25, 42, 28, 14); }, c(), o.p, -24, 18, -25, 3, 4.4, '#fff', true);
    circ(g, -22, -11, 10, c(0, 0, 8), 1.6); circ(g, -22, -11, 4, c(0, 0, -16), 0);
  } });
  def('slippers', { w: 72, h: 44, zone: 'floor', hue: [0, 360], sat: 60, lit: 62, pat: [1, 3], draw: function (g, o, c) {
    for (var k = -1; k <= 1; k += 2) {
      var x = k * 16;
      ell(g, x, 2, 12, 19, c(0, 0, -16));
      striped(g, function () { rpath(g, x - 13, -12, 26, 13, 5); }, c(), o.p, x - 13, x + 13, -12, 1, 3.6, '#fff', true);
    }
  } });
  def('bucket', { w: 60, h: 66, zone: 'floor', hue: [0, 360], sat: 65, lit: 55, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    arc(g, 0, -16, 24, Math.PI * 1.08, Math.PI * 1.92, 2.4, '#555');
    if (o.v === 1) blob(g, [[-8, -20, 8, 6], [6, -22, 9, 7], [14, -17, 6, 5]], '#fbfbf6');
    striped(g, function () { g.beginPath(); g.moveTo(-22, -16); g.lineTo(22, -16); g.lineTo(17, 26); g.lineTo(-17, 26); g.closePath(); }, c(), o.p, -22, 22, -16, 26, 5, '#fff', false);
    ell(g, 0, -16, 22, 5, c(0, 0, -14), 1.6);
  } });
  def('laundry', { w: 72, h: 72, zone: 'floor', hue: [30, 45], sat: 45, lit: 60, pat: [2, 4], draw: function (g, o, c) {
    blob(g, [[-14, -20, 12, 9], [8, -22, 13, 9]], '#7fb2e5'); ell(g, 18, -16, 9, 7, '#f6a6b6', 1.6);
    striped(g, function () { g.beginPath(); g.moveTo(-30, -14); g.lineTo(30, -14); g.lineTo(24, 32); g.lineTo(-24, 32); g.closePath(); }, c(), o.p, -30, 30, -14, 32, 4.6, c(0, 0, -20), false);
    rrect(g, -32, -18, 64, 7, 3, c(0, 0, -10)); rrect(g, -8, -10, 16, 5, 2, '#5a3a24', 0);
  } });

  /* ===== xưởng đồ nghề ===== */
  def('hammer', { w: 52, h: 98, zone: 'wall', hue: [0, 360], sat: 70, lit: 48, vmax: 2, asym: true, draw: function (g, o, c) {
    rrect(g, -4, -28, 8, 72, 3, '#c89a5a');
    rrect(g, -5.5, 12, 11, 32, 4, c());
    if (o.v === 0) { poly(g, [-20, -42, 12, -42, 12, -28, -20, -28], '#7d8590'); g.beginPath(); g.moveTo(12, -42); g.quadraticCurveTo(28, -42, 30, -26); g.lineTo(24, -26); g.quadraticCurveTo(22, -32, 12, -30); g.closePath(); fs(g, '#7d8590', 1.6); }
    else rrect(g, -18, -44, 36, 17, 3, '#7d8590');
  } });
  def('wrench', { w: 32, h: 102, zone: 'wall', hue: [210, 220], sat: 8, lit: 62, low: true, vmax: 2, draw: function (g, o, c) {
    rrect(g, -5, -30, 10, 66, 4, c());
    if (o.v === 0) poly(g, [-12, -32, -12, -50, -5, -50, -4, -38, 4, -38, 5, -50, 12, -50, 12, -32, 5, -26, -5, -26], c());
    else { circ(g, 0, -38, 12, c()); ngon(g, 0, -38, 6, 6, '#3a3a44', 0, 0); }
    circ(g, 0, 40, 9, c()); circ(g, 0, 40, 4.4, '#3a3a44', 0);
  } });
  def('screwdriver', { w: 26, h: 98, zone: 'wall', hue: [0, 360], sat: 75, lit: 50, pat: [2, 4], draw: function (g, o, c) {
    rrect(g, -2.5, -44, 5, 48, 1, '#b8bec8'); poly(g, [-2.5, -44, 2.5, -44, 1.5, -49, -1.5, -49], '#8f96a2', 0);
    rrect(g, -8, 2, 16, 44, 6, c());
    for (var i = 0; i < o.p; i++) rrect(g, -8, 9 + i * 9, 16, 4.6, 1, c(0, 0, -24), 0);
  } });
  def('saw', { w: 112, h: 48, zone: 'wall', hue: [0, 360], sat: 70, lit: 45, asym: true, pat: [7, 10], draw: function (g, o, c) {
    var n = o.p, k, t, pts = [-34, -14, 46, -6, 46, 4];
    for (k = 0; k < n; k++) { t = (k + .5) / n; pts.push(46 - 80 * t, 10 + 8 * t); t = (k + 1) / n; pts.push(46 - 80 * t, 4 + 8 * t); }
    poly(g, pts, '#c9ced6', 1.6);
    rrect(g, -56, -20, 26, 36, 9, c()); rrect(g, -50, -12, 13, 18, 5, c(0, 0, -26), 1);
  } });
  def('pliers', { w: 42, h: 98, zone: 'wall', hue: [0, 360], sat: 75, lit: 48, vmax: 2, draw: function (g, o, c) {
    var a = o.v === 0 ? .1 : .3;
    for (var k = -1; k <= 1; k += 2) {
      g.save(); g.rotate(k * a);
      rrect(g, -3.5, 4, 7, 42, 3, c());
      poly(g, [-3, -36, 3, -36, 4, 4, -4, 4], '#7d8590', 1.4);
      g.restore();
    }
    circ(g, 0, 0, 4, '#555', 1);
  } });
  def('toolbox', { w: 96, h: 68, zone: 'table', hue: [0, 12], sat: 75, lit: 46, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -18, -34, 36, 8, 4, '#3a3a44');
    rrect(g, -44, -26, 88, 54, 4, c());
    for (var i = 0; i < o.p; i++) { var y = -10 + i * 12; line(g, -42, y, 42, y, 2.4, c(0, 0, -22)); rrect(g, -8, y + 2, 16, 4.4, 2, '#c9ced6', 0); }
    rrect(g, -46, -28, 92, 8, 3, c(0, 0, -10));
  } });
  def('paintcan', { w: 54, h: 64, zone: 'table', hue: [0, 360], sat: 75, lit: 52, pat: [1, 4], draw: function (g, o, c) {
    arc(g, 0, -18, 22, Math.PI * 1.1, Math.PI * 1.9, 2, '#555');
    rrect(g, -20, -18, 40, 44, 3, '#c9ced6'); rrect(g, -20, -4, 40, 20, 0, '#fbf8f0', 0);
    var X = [-12, 4, 14, -4], Ln = [16, 24, 12, 20];
    for (var i = 0; i < o.p; i++) rrect(g, X[i] - 3, -18, 6, Ln[i], 3, c(), 0);
    ell(g, 0, -18, 20, 5, c(), 1.4);
  } });
  def('drill', { w: 92, h: 74, zone: 'table', hue: [20, 45], sat: 90, lit: 52, asym: true, pat: [2, 4], draw: function (g, o, c) {
    line(g, 30, -12, 46, -12, 3, '#b8bec8');
    poly(g, [-14, -2, 4, -2, 0, 32, -18, 32], c(0, 0, -10)); rrect(g, -24, 30, 30, 10, 3, '#2b2f3a');
    rrect(g, -30, -24, 58, 24, 10, c()); rrect(g, 24, -18, 10, 12, 2, '#3a3a44');
    for (var i = 0; i < o.p; i++) rrect(g, -24 + i * 7, -18, 4.6, 13, 2, '#2b2f3a', 0);
  } });
  def('nuts', { w: 62, h: 42, zone: 'table', hue: [210, 220], sat: 8, lit: 64, low: true, pat: [2, 5], draw: function (g, o, c) {
    var P = [[-14, 4], [6, 6], [18, -4], [-4, -8], [-21, -9]];
    for (var i = 0; i < o.p; i++) { ngon(g, P[i][0], P[i][1], 8, 6, c(0, 0, i % 2 ? 8 : 0), 1.6, i * .3); circ(g, P[i][0], P[i][1], 3.4, '#3a3a44', 0); }
  } });
  def('bulb', { w: 44, h: 64, zone: 'table', hue: [48, 56], sat: 95, lit: 70, vmax: 2, draw: function (g, o, c) {
    if (o.v === 0) glow(g, 0, -8, 26, 'rgba(255,230,120,.6)');
    poly(g, [-8, 2, 8, 2, 7, 8, -7, 8], o.v === 0 ? c() : '#eef2f6', 1.4);
    circ(g, 0, -8, 15, o.v === 0 ? c() : '#eef2f6');
    g.beginPath(); g.moveTo(-4, 4); g.lineTo(-4, -6); g.lineTo(-2, -10); g.lineTo(0, -6); g.lineTo(2, -10); g.lineTo(4, -6); g.lineTo(4, 4); g.lineWidth = 1.4; g.strokeStyle = '#8a6a2a'; g.stroke();
    rrect(g, -7, 7, 14, 14, 2, '#9aa0aa'); line(g, -7, 11, 7, 12, 1.6, '#5a606a'); line(g, -7, 16, 7, 17, 1.6, '#5a606a');
  } });
  def('gear', { w: 58, h: 58, zone: 'wall', hue: [210, 220], sat: 10, lit: 55, low: true, pat: [6, 10], draw: function (g, o, c) {
    for (var k = 0; k < o.p; k++) { g.save(); g.rotate(k * TAU / o.p); rrect(g, -4.6, -26, 9.2, 10, 2, c()); g.restore(); }
    circ(g, 0, 0, 19, c()); circ(g, 0, 0, 7, '#3a3a44', 1.4);
  } });

  /* ---------- phông nền ---------- */
  function tiles(g, x0, y0, x1, y1, sz, fill, grout, alt) {
    var i, j;
    g.fillStyle = fill; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (alt) { g.fillStyle = alt; for (j = 0; y0 + j * sz < y1; j++) for (i = 0; x0 + i * sz < x1; i++) if ((i + j) % 2) g.fillRect(x0 + i * sz, y0 + j * sz, sz, Math.min(sz, y1 - y0 - j * sz)); }
    g.strokeStyle = grout; g.lineWidth = 2; g.beginPath();
    for (i = 0; x0 + i * sz <= x1; i++) { g.moveTo(x0 + i * sz, y0); g.lineTo(x0 + i * sz, y1); }
    for (j = 0; y0 + j * sz <= y1; j++) { g.moveTo(x0, y0 + j * sz); g.lineTo(x1, y0 + j * sz); }
    g.stroke();
  }
  function shelfBoard(g, y, x0, x1, col) {
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x0 + 4, y + 10, x1 - x0 - 8, 7);
    g.fillStyle = col; g.fillRect(x0, y, x1 - x0, 11);
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x0, y, x1 - x0, 3);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x0, y + 9, x1 - x0, 2);
  }
  function woodFloor(g, y0, y1, hue, lit, r) {
    vgrad(g, y0, y1, [[0, hsl(hue, 45, lit + 6)], [1, hsl(hue, 45, lit - 6)]]);
    var i, k, y;
    g.strokeStyle = 'rgba(60,30,10,.22)'; g.lineWidth = 1.6;
    for (i = 0; y0 + i * 30 < y1; i++) {
      y = y0 + i * 30; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      for (k = 0; k < 4; k++) { var x = (k * 230 + i * 97 + r() * 40) % W; g.beginPath(); g.moveTo(x, y); g.lineTo(x, Math.min(y1, y + 30)); g.stroke(); }
    }
  }
  function wallpaper(g, y1, m, hue) {
    var i, j, k = m % 3;
    g.fillStyle = hsl(hue, 40, 86); g.fillRect(0, 0, W, y1);
    g.fillStyle = hsl(hue, 40, 80);
    if (k === 0) for (i = 0; i < 20; i++) g.fillRect(i * 44, 0, 20, y1);
    else if (k === 1) { for (j = 0; j * 40 < y1; j++) for (i = 0; i < 21; i++) { g.beginPath(); g.arc(i * 40 + (j % 2) * 20, j * 40 + 20, 4.5, 0, TAU); g.fill(); } }
    else { g.strokeStyle = hsl(hue, 40, 79); g.lineWidth = 2; g.beginPath(); for (i = -10; i < 30; i++) { g.moveTo(i * 40, 0); g.lineTo(i * 40 + y1, y1); g.moveTo(i * 40, 0); g.lineTo(i * 40 - y1, y1); } g.stroke(); }
  }
  function baseboard(g, y) { g.fillStyle = '#f4efe6'; g.fillRect(0, y - 8, W, 10); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, y + 2, W, 3); }

  BG.kitchen = function (g, m, r) {
    var hw = (m * 37 + 20) % 360, i;
    g.fillStyle = hsl(hw, 35, 84); g.fillRect(0, 0, W, 152);
    tiles(g, 0, 150, W, 302, 30, '#f4f6f8', 'rgba(150,160,175,.55)');
    shelfBoard(g, 120, 0, W, '#a8743f');
    g.fillStyle = '#7d5a3a'; g.fillRect(60, 131, 8, 14); g.fillRect(732, 131, 8, 14);
    vgrad(g, 302, H, [[0, hsl(30 + (m % 4) * 6, 22, 72)], [1, hsl(30 + (m % 4) * 6, 22, 60)]]);
    g.fillStyle = 'rgba(255,255,255,.18)'; for (i = 0; i < 160; i++) g.fillRect(r() * W, 312 + r() * 285, 2, 2);
    g.fillStyle = '#8a8f99'; g.fillRect(0, 296, W, 9);
  };
  BG.toyroom = function (g, m, r) {
    var hw = (m * 41 + 180) % 360;
    wallpaper(g, 352, m, hw);
    shelfBoard(g, 180, 0, W, '#c98a4a');
    woodFloor(g, 352, H, 32, 58, r);
    baseboard(g, 352);
    ell(g, 400, 485, 340, 92, hsl(hw + 180, 50, 66), 0); ell(g, 400, 485, 306, 76, hsl(hw + 180, 50, 76), 0);
  };
  BG.classroom = function (g, m, r) {
    var hw = (m * 29 + 90) % 360, i, x, y;
    g.fillStyle = hsl(hw, 28, 84); g.fillRect(0, 0, W, 332);
    g.fillStyle = hsl(hw, 28, 74); g.fillRect(0, 250, W, 82);
    rrect(g, 150, 24, 500, 184, 4, '#7a5230', 0); rrect(g, 160, 34, 480, 164, 2, '#2f5a46', 0);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2.4; g.lineCap = 'round';
    for (i = 0; i < 6; i++) { y = 62 + i * 22; x = 186 + r() * 30; g.beginPath(); g.moveTo(x, y); var ln = 160 + r() * 240; for (var t = 0; t < ln; t += 10) g.lineTo(x + t, y + Math.sin(t * .5 + i) * 3); g.stroke(); }
    rrect(g, 150, 206, 500, 8, 2, '#5a3a24', 0);
    vgrad(g, 332, H, [[0, '#c58a52'], [1, '#9a6538']]);
    g.fillStyle = '#8a5a34'; g.fillRect(0, 328, W, 10);
    g.strokeStyle = 'rgba(60,30,10,.16)'; g.lineWidth = 1.4;
    for (i = 0; i < 12; i++) { y = 352 + i * 21 + r() * 6; g.beginPath(); g.moveTo(0, y); for (x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x * .01 + i) * 3); g.stroke(); }
  };
  BG.music = function (g, m, r) {
    var hw = (m * 31 + 250) % 360, i, j;
    g.fillStyle = hsl(hw, 22, 64); g.fillRect(0, 0, W, 362);
    for (i = 0; i < 10; i++) for (j = 0; j < 4; j++) {
      var x = 12 + i * 79, y = 14 + j * 86;
      rrect(g, x, y, 70, 78, 6, hsl(hw, 22, 69 + ((i + j) % 2) * 4), 0);
      g.strokeStyle = hsl(hw, 22, 60); g.lineWidth = 1.4; g.beginPath();
      if ((i + j) % 2) { for (var k = 1; k < 4; k++) { g.moveTo(x + 6, y + k * 19.5); g.lineTo(x + 64, y + k * 19.5); } }
      else { for (k = 1; k < 4; k++) { g.moveTo(x + k * 17.5, y + 6); g.lineTo(x + k * 17.5, y + 72); } }
      g.stroke();
    }
    woodFloor(g, 362, H, 26, 46, r);
    baseboard(g, 362);
    rrect(g, 70, 418, 660, 168, 12, hsl(hw + 40, 40, 52, .55), 0);
  };
  BG.sports = function (g, m, r) {
    var hw = (m * 47 + 200) % 360, i;
    g.fillStyle = hsl(hw, 30, 56); g.fillRect(0, 0, W, 342);
    for (i = 0; i < 11; i++) {
      var x = i * 73 + 2;
      rrect(g, x, 8, 69, 330, 3, hsl(hw, 32, 66), 0);
      for (var k = 0; k < 4; k++) rrect(g, x + 14, 22 + k * 8, 40, 4, 2, hsl(hw, 30, 50), 0);
      rrect(g, x + 56, 150, 6, 22, 2, hsl(hw, 20, 40), 0);
    }
    g.fillStyle = '#9a6538'; g.fillRect(0, 298, W, 12); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 298, W, 3);
    g.fillStyle = '#5a3a24'; for (i = 0; i < 6; i++) g.fillRect(50 + i * 140, 310, 8, 32);
    vgrad(g, 342, H, [[0, '#e2b47a'], [1, '#c8955a']]);
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 372); g.lineTo(W, 372); g.stroke();
    g.beginPath(); g.ellipse(400, 520, 140, 44, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(400, 372); g.lineTo(400, H); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1.4; for (i = 0; i < 9; i++) { g.beginPath(); g.moveTo(0, 390 + i * 24); g.lineTo(W, 390 + i * 24); g.stroke(); }
  };
  BG.fruit = function (g, m, r) {
    var ha = (m * 53) % 360, i;
    for (i = 0; i < 20; i++) { g.fillStyle = hsl(30, 40, 62 + (i % 2) * 4); g.fillRect(i * 40, 0, 40, 300); }
    for (i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#fbf8f0' : hsl(ha, 70, 55); g.fillRect(i * 50, 0, 50, 54); g.beginPath(); g.arc(i * 50 + 25, 54, 25, 0, Math.PI); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 54, W, 4);
    shelfBoard(g, 250, 0, W, '#8a5a30');
    vgrad(g, 300, H, [[0, '#b07a44'], [1, '#8a5a30']]);
    g.fillStyle = '#6b4424'; g.fillRect(0, 296, W, 10);
    g.strokeStyle = 'rgba(40,20,5,.3)'; g.lineWidth = 2;
    for (i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, 340 + i * 38); g.lineTo(W, 340 + i * 38); g.stroke(); }
    for (i = 0; i < 5; i++) { g.beginPath(); g.moveTo(i * 200 + 100, 306); g.lineTo(i * 200 + 100, H); g.stroke(); }
  };
  BG.petshop = function (g, m, r) {
    var hw = (m * 43 + 140) % 360, i, x, y;
    g.fillStyle = hsl(hw, 45, 84); g.fillRect(0, 0, W, 342);
    g.fillStyle = hsl(hw, 45, 78);
    for (i = 0; i < 26; i++) {
      x = (i % 9) * 92 + 30 + (Math.floor(i / 9) % 2) * 46; y = Math.floor(i / 9) * 110 + 50;
      g.beginPath(); g.ellipse(x, y, 9, 7, 0, 0, TAU); g.fill();
      for (var k = 0; k < 4; k++) { g.beginPath(); g.arc(x - 10 + k * 6.6, y - 11 + (k % 3 ? -3 : 0), 3.2, 0, TAU); g.fill(); }
    }
    shelfBoard(g, 200, 0, W, '#c98a4a');
    tiles(g, 0, 342, W, H, 52, '#f2efe6', 'rgba(150,140,120,.35)', '#e2dccd');
    baseboard(g, 342);
  };
  BG.closet = function (g, m, r) {
    var hw = 26 + (m * 7) % 20, i;
    for (i = 0; i < 10; i++) { g.fillStyle = hsl(hw, 38, 64 + (i % 2) * 4); g.fillRect(i * 80, 0, 80, 382); }
    g.fillStyle = 'rgba(0,0,0,.1)'; for (i = 1; i < 10; i++) g.fillRect(i * 80 - 1, 0, 2, 382);
    shelfBoard(g, 380, 0, W, '#7a5230');
    woodFloor(g, 391, H, hw - 6, 44, r);
  };
  BG.bathroom = function (g, m, r) {
    var hw = (m * 23 + 170) % 360;
    tiles(g, 0, 0, W, 382, 40, hsl(hw, 35, 87), hsl(hw, 25, 74));
    rrect(g, -4, 206, W + 8, 7, 3, 'rgba(210,240,255,.9)', 1.2);
    g.fillStyle = '#b8bec8'; g.fillRect(70, 213, 6, 12); g.fillRect(724, 213, 6, 12);
    tiles(g, 0, 382, W, H, 50, hsl(hw + 20, 18, 72), 'rgba(80,90,100,.3)', hsl(hw + 20, 18, 64));
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 380, W, 5);
    rrect(g, 210, 470, 380, 104, 22, hsl(hw + 180, 45, 68, .85), 0);
  };
  BG.workshop = function (g, m, r) {
    var i, j, lit = 58 + (m % 3) * 4;
    g.fillStyle = hsl(30, 35, lit); g.fillRect(0, 0, W, 332);
    g.fillStyle = 'rgba(60,40,20,.45)';
    for (j = 0; j < 14; j++) for (i = 0; i < 34; i++) { g.beginPath(); g.arc(12 + i * 24, 12 + j * 24, 2.2, 0, TAU); g.fill(); }
    g.fillStyle = '#5a3a24'; g.fillRect(0, 0, W, 6);
    vgrad(g, 332, H, [[0, '#b98a58'], [1, '#8f6238']]);
    g.fillStyle = '#6b4424'; g.fillRect(0, 330, W, 14);
    g.strokeStyle = 'rgba(40,20,5,.22)'; g.lineWidth = 1.6;
    for (i = 0; i < 6; i++) { g.beginPath(); g.moveTo(0, 380 + i * 40); g.lineTo(W, 380 + i * 40); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,.08)'; for (i = 0; i < 40; i++) g.fillRect(r() * W, 350 + r() * 240, 10 + r() * 30, 2);
  };
})(typeof window !== 'undefined' ? window : globalThis);
