/* Tìm điểm khác biệt — vật thể và phông nền cho các chủ đề mới: vườn cây, đường xá, bàn làm việc, dòng suối,
   dòng sông, rừng núi, cảnh quan đồng quê; thêm vật cho vũ trụ. Mỗi vật đều có hoạ tiết đếm được (pat)
   để điểm khác "hoạ tiết" chỉ hơn/kém đúng 1 sọc, 1 đốm, 1 cửa sổ... */
(function (root) {
  'use strict';
  var A = root.TKBArt, L = A.lib, def = A.def, BG = A.BG;
  var TAU = L.TAU, OL = L.OL, W = A.W, H = A.H;
  var mouth = L.mouth, fs = L.fs, circ = L.circ, ell = L.ell, poly = L.poly, rrect = L.rrect, line = L.line, arc = L.arc, blob = L.blob, star = L.star,
      glow = L.glow, spots = L.spots, clipStripes = L.clipStripes, hsl = L.hsl, vgrad = L.vgrad, skyFill = L.skyFill, hills = L.hills,
      tufts = L.tufts, sparkle = L.sparkle, SKIES = L.SKIES;

  /* ===== vườn cây, thực vật ===== */
  def('potplant', { w: 64, h: 84, zone: 'ground', hue: [0, 360], sat: 55, lit: 55, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    var i;
    if (o.v === 0) blob(g, [[-14, -18, 14, 12], [12, -22, 14, 12], [0, -32, 13, 11], [-4, -12, 16, 10]], '#3f9b48');
    else for (i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 5, 0); g.quadraticCurveTo(i * 12, -24, i * 7, -46 + Math.abs(i) * 6); g.quadraticCurveTo(i * 3, -24, i * 5 + 3, 0); fs(g, i % 2 ? '#2f8a3c' : '#4fae48', 1.4); }
    var pot = function () { g.beginPath(); g.moveTo(-22, -4); g.lineTo(22, -4); g.lineTo(16, 38); g.lineTo(-16, 38); g.closePath(); };
    pot(); fs(g, c(), 0);
    clipStripes(g, pot, o.p, -22, 22, 2, 38, 4, c(0, 0, 22), false);
    pot(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    rrect(g, -25, -8, 50, 8, 2, c(0, 0, -10), 1.6);
  } });
  def('sunflower', { w: 58, h: 120, zone: 'ground', hue: [42, 50], sat: 95, lit: 56, pat: [9, 13], draw: function (g, o, c) {
    var i, n = o.p;
    line(g, 0, -20, 0, 58, 4, '#3f8f3a'); ell(g, -11, 22, 11, 5, '#4fae48', 1.5, -.5); ell(g, 11, 34, 11, 5, '#4fae48', 1.5, .5);
    for (i = 0; i < n; i++) { g.save(); g.translate(0, -32); g.rotate(i * TAU / n); ell(g, 0, -18, 5.2, 10, c(), 1.4); g.restore(); }
    circ(g, 0, -32, 12, '#6b3e1f', 1.6);
    for (i = 0; i < 7; i++) circ(g, Math.cos(i) * 6, -32 + Math.sin(i * 1.7) * 6, 1.4, '#3b220f', 0);
  } });
  def('tulip', { w: 42, h: 86, zone: 'ground', hue: [0, 360], sat: 80, lit: 56, pat: [1, 3], draw: function (g, o, c) {
    line(g, 0, -10, 0, 40, 3.4, '#3f8f3a');
    var Lf = [[-1, 26], [1, 16], [-1, 6]], i;
    for (i = 0; i < o.p; i++) { g.save(); g.translate(0, Lf[i][1]); g.scale(Lf[i][0], 1); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(14, -6, 16, -22); g.quadraticCurveTo(6, -10, 0, 0); fs(g, '#4fae48', 1.3); g.restore(); }
    g.beginPath(); g.moveTo(-13, -30); g.lineTo(-7, -22); g.lineTo(0, -32); g.lineTo(7, -22); g.lineTo(13, -30); g.quadraticCurveTo(14, -6, 0, -6); g.quadraticCurveTo(-14, -6, -13, -30); fs(g, c());
    line(g, 0, -28, 0, -10, 1.4, c(0, 0, -14));
  } });
  def('fern', { w: 84, h: 72, zone: 'ground', hue: [80, 105], sat: 55, lit: 50, pat: [3, 6], draw: function (g, o, c) {
    var n = o.p, i, k;
    for (i = 0; i < n; i++) {
      var a = -Math.PI / 2 + (i - (n - 1) / 2) * (1.9 / Math.max(1, n - 1));
      g.save(); g.translate(0, 30); g.rotate(a + Math.PI / 2);
      line(g, 0, 0, 0, -58, 2.2, c(0, 0, -10));
      for (k = 1; k < 8; k++) { var y = -k * 7, ln = 9 - k * .8; ell(g, -ln / 2 - 1, y, ln / 2 + 1, 2.4, c(0, 0, k % 2 ? 4 : 0), 0, .4); ell(g, ln / 2 + 1, y, ln / 2 + 1, 2.4, c(0, 0, k % 2 ? 0 : 4), 0, -.4); }
      g.restore();
    }
  } });
  def('ladybug', { w: 40, h: 34, zone: 'ground', hue: [0, 12], sat: 85, lit: 50, asym: true, pat: [2, 7], draw: function (g, o, c) {
    for (var i = -1; i <= 1; i++) { line(g, -6 + i * 7, 8, -10 + i * 9, 15, 1.6, '#222'); line(g, -6 + i * 7, -8, -10 + i * 9, -15, 1.6, '#222'); }
    circ(g, 14, 0, 7, '#222', 1.4); circ(g, 17, -3, 1.4, '#fff', 0); circ(g, 17, 3, 1.4, '#fff', 0);
    ell(g, -2, 0, 15, 12.5, c(), 1.8);
    line(g, 11, 0, -17, 0, 1.6, '#222');
    var P = [[-4, -6], [-4, 6], [-12, -3], [-12, 4], [4, -7], [4, 7], [-9, -9]];
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 3.4, '#1d1d1d', 0);
  } });
  def('bee', { w: 46, h: 36, zone: 'sky', hue: [42, 50], sat: 95, lit: 56, asym: true, pat: [2, 4], draw: function (g, o, c) {
    ell(g, -2, -11, 9, 6, 'rgba(220,240,255,.85)', 1.2, -.4); ell(g, 6, -11, 8, 5.5, 'rgba(220,240,255,.85)', 1.2, .3);
    var body = function () { g.beginPath(); g.ellipse(0, 2, 16, 10, 0, 0, TAU); };
    body(); fs(g, c(), 0);
    clipStripes(g, body, o.p, -16, 16, -8, 12, 4, '#222', true);
    body(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
    circ(g, 16, 1, 6, '#222', 1.2); circ(g, 18, -1, 1.4, '#fff', 0); poly(g, [-16, 1, -22, 3, -16, 5], '#222', 0);
  } });
  def('wateringcan', { w: 76, h: 54, zone: 'ground', hue: [0, 360], sat: 55, lit: 55, vmax: 2, asym: true, pat: [0, 2], draw: function (g, o, c) {
    poly(g, [16, 0, 34, -20, 37, -17, 22, 8], c(0, 0, -8), 1.6);
    if (o.v === 0) ell(g, 36, -20, 4, 6, c(0, 0, -16), 1.4, .7);
    arc(g, -6, -14, 14, Math.PI, 0, 4, c(0, 0, -10));
    var body = function () { g.beginPath(); g.moveTo(-24, -12); g.lineTo(18, -12); g.lineTo(20, 22); g.lineTo(-22, 22); g.closePath(); };
    body(); fs(g, c(), 0);
    clipStripes(g, body, o.p, -24, 20, -12, 22, 4, c(0, 0, 20), false);
    body(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  } });
  def('birdhouse', { w: 48, h: 74, zone: 'ground', hue: [0, 360], sat: 50, lit: 58, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -3, 6, 6, 32, 1.5, '#7b4f2a');
    rrect(g, -16, -20, 32, 28, 2, c()); poly(g, [-21, -18, 0, -36, 21, -18], c(180, 10, -24));
    var Y = [[0, -11], [-7, -2], [7, -2]];
    for (var i = 0; i < o.p; i++) { circ(g, Y[i][0], Y[i][1], 4.6, '#2a1d14', 1); }
    line(g, 0, 3, 0, 7, 2, '#7b4f2a');
  } });
  def('cactuspot', { w: 46, h: 66, zone: 'ground', hue: [130, 150], sat: 45, lit: 42, vmax: 2, pat: [2, 4], draw: function (g, o, c, r) {
    ell(g, 0, -10, 15, 20, c());
    var i;
    for (i = 0; i < o.p; i++) { var x = -12 + (i + 1) * 24 / (o.p + 1); g.beginPath(); g.moveTo(x, -28); g.quadraticCurveTo(x * 1.5, -10, x, 8); g.lineWidth = 2.6; g.strokeStyle = c(0, 0, 16); g.stroke(); }
    if (o.v === 1) { circ(g, 0, -30, 5, '#ff6fa5', 1.2); circ(g, 0, -30, 1.8, '#ffd23f', 0); }
    poly(g, [-16, 8, 16, 8, 12, 30, -12, 30], '#c96f3b', 1.8); rrect(g, -18, 4, 36, 6, 2, '#b55f2f', 1.4);
  } });

  /* ===== đường xá ===== */
  function wheel(g, x, y, r, spokes) {
    circ(g, x, y, r, '#2b2b36'); circ(g, x, y, r * .45, '#c9ced9', 0);
    if (spokes) for (var i = 0; i < spokes; i++) { var a = i * TAU / spokes; line(g, x, y, x + Math.cos(a) * r * .8, y + Math.sin(a) * r * .8, 1.4, '#c9ced9'); }
  }
  def('truck', { w: 138, h: 66, zone: 'ground', hue: [0, 360], sat: 55, lit: 55, asym: true, pat: [2, 5], draw: function (g, o, c) {
    var box = function () { g.beginPath(); g.rect(-64, -30, 86, 46); };
    box(); fs(g, c(0, -20, 18), 0);
    clipStripes(g, box, o.p, -64, 22, -30, 16, 3, c(0, -20, 2), true);
    box(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    rrect(g, 24, -18, 40, 34, 6, c(150, 10, -6)); poly(g, [40, -14, 58, -14, 60, 0, 40, 0], '#bfe6ff', 1.4);
    rrect(g, -66, 14, 132, 6, 2, '#3b4252', 0);
    wheel(g, -44, 22, 10); wheel(g, -20, 22, 10); wheel(g, 46, 22, 10);
  } });
  def('bus', { w: 148, h: 64, zone: 'ground', hue: [0, 360], sat: 70, lit: 52, asym: true, pat: [4, 6], draw: function (g, o, c) {
    rrect(g, -70, -28, 140, 46, 9, c());
    var n = o.p, i, ww = 100 / n;
    for (i = 0; i < n; i++) rrect(g, -62 + i * ww, -22, ww - 5, 16, 2, '#bfe6ff', 1.3);
    rrect(g, 46, -22, 18, 34, 2, '#bfe6ff', 1.3); line(g, 55, -22, 55, 12, 1.4, OL);
    rrect(g, -70, 2, 140, 4, 0, '#fff', 0);
    wheel(g, -40, 20, 10); wheel(g, 40, 20, 10);
    rrect(g, 66, 4, 5, 6, 1, '#ffe27a', 1);
  } });
  def('moto', { w: 76, h: 52, zone: 'ground', hue: [0, 360], sat: 75, lit: 52, vmax: 2, asym: true, draw: function (g, o, c) {
    wheel(g, -24, 14, 11, 5); wheel(g, 26, 14, 11, 5);
    g.beginPath(); g.moveTo(-26, 4); g.quadraticCurveTo(-10, -14, 8, -6); g.lineTo(20, 8); g.lineTo(-14, 10); g.closePath(); fs(g, c());
    line(g, 18, 8, 22, -20, 3, '#555'); line(g, 16, -20, 28, -22, 3, '#333');
    rrect(g, -22, -14, 22, 6, 3, '#2b2b36', 1.2);
    if (o.v === 1) rrect(g, -36, -24, 16, 14, 3, c(0, 0, -16), 1.4);
  } });
  def('cone', { w: 32, h: 46, zone: 'ground', hue: [18, 28], sat: 95, lit: 55, pat: [1, 3], draw: function (g, o, c) {
    var body = function () { g.beginPath(); g.moveTo(-3, -20); g.lineTo(3, -20); g.lineTo(11, 16); g.lineTo(-11, 16); g.closePath(); };
    body(); fs(g, c(), 0);
    clipStripes(g, body, o.p, -12, 12, -20, 16, 4.5, '#fff', false);
    body(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
    rrect(g, -15, 15, 30, 6, 2, c(0, 0, -12), 1.6);
  } });
  def('roadsign', { w: 42, h: 88, zone: 'ground', hue: [0, 8], sat: 80, lit: 50, vmax: 3, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -2.5, -10, 5, 52, 1.5, '#8b93a1');
    var i;
    if (o.v === 0) { circ(g, 0, -22, 18, '#fff'); circ(g, 0, -22, 18, 'rgba(0,0,0,0)', 0); arc(g, 0, -22, 15, 0, TAU, 5, c()); }
    else if (o.v === 1) { poly(g, [0, -42, 20, -6, -20, -6], '#ffd23f'); poly(g, [0, -36, 15, -10, -15, -10], 'rgba(0,0,0,0)', 0); g.beginPath(); g.moveTo(0, -42); g.lineTo(20, -6); g.lineTo(-20, -6); g.closePath(); g.lineWidth = 4; g.strokeStyle = c(); g.stroke(); }
    else { g.save(); g.translate(0, -22); g.rotate(Math.PI / 4); rrect(g, -13, -13, 26, 26, 2, '#ffd23f'); g.restore(); }
    for (i = 0; i < o.p; i++) { var y = -26 + i * 6 - (o.p - 1) * 3 + 4; g.beginPath(); g.moveTo(-6, y + 3); g.lineTo(0, y - 2); g.lineTo(6, y + 3); g.lineWidth = 2.6; g.strokeStyle = '#222'; g.stroke(); }
  } });
  def('barrier', { w: 86, h: 42, zone: 'ground', hue: [0, 10], sat: 85, lit: 50, pat: [3, 6], draw: function (g, o, c) {
    line(g, -30, -6, -34, 20, 4, '#555'); line(g, 30, -6, 34, 20, 4, '#555');
    var board = function () { g.beginPath(); g.rect(-40, -16, 80, 14); };
    board(); fs(g, '#fff', 0);
    g.save(); board(); g.clip();
    for (var i = 0; i < o.p; i++) { var x = -40 + (i + .5) * 80 / o.p; poly(g, [x - 6, -16, x + 2, -16, x + 6, -2, x - 2, -2], c(), 0); }
    g.restore();
    board(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  } });
  def('bicycle', { w: 76, h: 48, zone: 'ground', hue: [0, 360], sat: 70, lit: 50, asym: true, pat: [3, 6], draw: function (g, o, c) {
    var i, wl = function (x) { arc(g, x, 10, 13, 0, TAU, 3, '#2b2b36'); for (i = 0; i < o.p; i++) { var a = i * Math.PI / o.p; line(g, x - Math.cos(a) * 12, 10 - Math.sin(a) * 12, x + Math.cos(a) * 12, 10 + Math.sin(a) * 12, 1.1, '#8b93a1'); } circ(g, x, 10, 2, '#555', 0); };
    wl(-22); wl(22);
    g.beginPath(); g.moveTo(-22, 10); g.lineTo(-4, -10); g.lineTo(16, -10); g.lineTo(22, 10); g.moveTo(-4, -10); g.lineTo(0, 10); g.lineTo(-22, 10); g.moveTo(0, 10); g.lineTo(16, -10);
    g.lineWidth = 3; g.strokeStyle = c(); g.lineJoin = 'round'; g.stroke();
    line(g, -6, -10, -8, -17, 2.4, '#333'); rrect(g, -14, -20, 12, 4, 2, '#2b2b36', 0);
    line(g, 16, -10, 14, -20, 2.4, '#333'); line(g, 10, -21, 20, -21, 2.6, '#333');
  } });
  def('bench', { w: 86, h: 46, zone: 'ground', hue: [20, 35], sat: 50, lit: 45, pat: [2, 4], draw: function (g, o, c) {
    line(g, -32, 0, -34, 20, 4, '#3b4252'); line(g, 32, 0, 34, 20, 4, '#3b4252'); line(g, -30, -6, -30, -20, 3, '#3b4252'); line(g, 30, -6, 30, -20, 3, '#3b4252');
    for (var i = 0; i < o.p; i++) rrect(g, -40, -22 + i * (12 / Math.max(1, o.p - 1)) * (o.p > 1 ? 1 : 0), 80, 4.5, 1.5, c(0, 0, i % 2 ? 4 : 0), 1.2);
    rrect(g, -42, -2, 84, 6, 2, c(0, 0, -6), 1.4);
  } });
  def('hydrant', { w: 30, h: 46, zone: 'ground', hue: [0, 8], sat: 80, lit: 48, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -9, -10, 18, 30, 3, c()); g.beginPath(); g.arc(0, -10, 9, Math.PI, 0); fs(g, c(0, 0, -6)); rrect(g, -3, -22, 6, 5, 1, c(0, 0, -10), 1.2);
    rrect(g, -14, -4, 28, 6, 2, c(0, 0, -8), 1.4); rrect(g, -12, 19, 24, 5, 2, c(0, 0, -12), 1.4);
    for (var i = 0; i < o.p; i++) rrect(g, -9, 18 - i * 8 - 4, 18, 3.4, 0, '#ffd23f', 0);
  } });

  /* ===== bàn làm việc ===== */
  def('laptop', { w: 114, h: 74, zone: 'desk', hue: [180, 280], sat: 55, lit: 55, pat: [2, 5], draw: function (g, o, c) {
    rrect(g, -42, -36, 84, 54, 4, '#2b2f3a');
    var scr = g.createLinearGradient(0, -32, 0, 14); scr.addColorStop(0, c(0, 0, 10)); scr.addColorStop(1, c(30, 0, -12));
    rrect(g, -38, -32, 76, 46, 2, scr, 0);
    for (var i = 0; i < o.p; i++) rrect(g, -34, -29 + i * 9.5, 9, 7.5, 1.5, 'rgba(255,255,255,.9)', 0);
    poly(g, [-50, 18, 50, 18, 56, 30, -56, 30], '#b9c0cc'); for (var k = 0; k < 3; k++) line(g, -42 + k * 2, 21 + k * 3, 42 - k * 2, 21 + k * 3, 1.2, 'rgba(0,0,0,.25)');
  } });
  def('mug', { w: 50, h: 50, zone: 'desk', hue: [0, 360], sat: 60, lit: 55, vmax: 2, asym: true, pat: [0, 3], draw: function (g, o, c) {
    arc(g, 16, 2, 9, -1.4, 1.4, 4, c(0, 0, -10));
    var cup = function () { g.beginPath(); g.moveTo(-16, -14); g.lineTo(16, -14); g.lineTo(14, 20); g.quadraticCurveTo(0, 24, -14, 20); g.closePath(); };
    cup(); fs(g, c(), 0);
    clipStripes(g, cup, o.p, -16, 16, -14, 20, 3.4, '#fff', false);
    cup(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    ell(g, 0, -14, 16, 4, '#6b3e1f', 1.4);
    if (o.v === 1) for (var i = -1; i <= 1; i += 2) { g.beginPath(); g.moveTo(i * 5, -20); g.quadraticCurveTo(i * 5 - 4, -26, i * 5, -31); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.7)'; g.stroke(); }
  } });
  def('pencup', { w: 44, h: 76, zone: 'desk', hue: [0, 360], sat: 50, lit: 45, pat: [2, 5], draw: function (g, o, c) {
    var P = [[-9, -34, 10], [4, -40, 120], [-2, -30, 210], [10, -32, 45], [-12, -26, 300]], i;
    for (i = 0; i < o.p; i++) { var x = P[i][0], y = P[i][1]; g.save(); g.translate(x, 0); g.rotate((x) * .012); rrect(g, -2.5, y, 5, 40, 1, hsl(P[i][2], 75, 55), 1); poly(g, [-2.5, y, 2.5, y, 0, y - 6], '#f2d3a0', 1); g.restore(); }
    rrect(g, -15, -6, 30, 40, 4, c()); rrect(g, -15, -6, 30, 4, 2, c(0, 0, 12), 0);
  } });
  def('books', { w: 76, h: 66, zone: 'desk', hue: [0, 360], sat: 55, lit: 48, pat: [2, 4], draw: function (g, o, c) {
    var i, n = o.p;
    for (i = 0; i < n; i++) { var y = 24 - (i + 1) * 12, w = 64 - (i % 2) * 8, x = -w / 2 + (i % 2 ? 4 : -2); rrect(g, x, y, w, 11, 2, c(i * 70, 0, 0)); rrect(g, x + w - 8, y + 1, 5, 9, 1, '#fff7e0', 0); line(g, x + 4, y + 5.5, x + w - 12, y + 5.5, 1.2, 'rgba(255,255,255,.5)'); }
  } });
  def('notebook', { w: 76, h: 56, zone: 'desk', hue: [0, 360], sat: 55, lit: 55, pat: [4, 7], draw: function (g, o, c) {
    rrect(g, -32, -20, 64, 44, 3, c()); rrect(g, -32, -20, 64, 44, 3, 'rgba(0,0,0,0)', 1.8);
    rrect(g, -12, -4, 24, 12, 2, '#fff7e0', 1);
    for (var i = 0; i < o.p; i++) { var x = -28 + i * 56 / (o.p - 1); arc(g, x, -21, 4, Math.PI, 0, 2.8, '#59616f'); }
  } });
  def('clock', { w: 56, h: 56, zone: 'wall', hue: [0, 360], sat: 55, lit: 50, vmax: 2, pat: [3, 6], draw: function (g, o, c) {
    circ(g, 0, 0, 25, c()); circ(g, 0, 0, 20, '#fffaf0', 1.4);
    for (var i = 0; i < o.p; i++) { var a = -Math.PI / 2 + i * TAU / o.p; line(g, Math.cos(a) * 14, Math.sin(a) * 14, Math.cos(a) * 18, Math.sin(a) * 18, 2.4, '#333'); }
    var h = o.v === 0 ? -0.6 : 2.2, m = o.v === 0 ? 1.4 : -1.1;
    line(g, 0, 0, Math.cos(h) * 9, Math.sin(h) * 9, 2.6, '#222'); line(g, 0, 0, Math.cos(m) * 14, Math.sin(m) * 14, 1.8, '#222'); circ(g, 0, 0, 2, '#e5392e', 0);
  } });
  def('desklamp', { w: 76, h: 86, zone: 'desk', hue: [0, 360], sat: 65, lit: 50, vmax: 2, asym: true, draw: function (g, o, c) {
    ell(g, -10, 36, 22, 6, c(0, 0, -10)); line(g, -10, 34, -18, -2, 4, c()); line(g, -18, -2, 12, -26, 4, c()); circ(g, -18, -2, 4, c(0, 0, -14), 1);
    if (o.v === 0) { glow(g, 22, -8, 26, 'rgba(255,230,140,.55)'); }
    g.save(); g.translate(16, -26); g.rotate(.6); poly(g, [-10, -6, 10, -6, 16, 12, -16, 12], c(0, 0, -6)); g.restore();
  } });
  def('clips', { w: 56, h: 36, zone: 'desk', hue: [0, 360], sat: 70, lit: 55, pat: [2, 5], draw: function (g, o, c) {
    var P = [[-16, -6, .3], [4, -8, -.4], [-6, 8, .9], [16, 6, .1], [-20, 10, -.6]], i;
    for (i = 0; i < o.p; i++) {
      g.save(); g.translate(P[i][0], P[i][1]); g.rotate(P[i][2]);
      g.beginPath(); g.moveTo(-3, 6); g.lineTo(-3, -6); g.arc(0, -6, 3, Math.PI, 0); g.lineTo(3, 8); g.arc(-.5, 8, 3.5, 0, Math.PI); g.lineTo(-4, -3);
      g.lineWidth = 2.4; g.strokeStyle = c(i * 50, 0, 0); g.stroke(); g.restore();
    }
  } });
  def('phone', { w: 40, h: 70, zone: 'desk', hue: [180, 300], sat: 60, lit: 55, pat: [4, 9], draw: function (g, o, c) {
    rrect(g, -16, -32, 32, 64, 6, '#22252c');
    var scr = g.createLinearGradient(0, -28, 0, 26); scr.addColorStop(0, c(0, 0, 8)); scr.addColorStop(1, c(40, 0, -10));
    rrect(g, -13, -27, 26, 54, 3, scr, 0);
    for (var i = 0; i < o.p; i++) rrect(g, -12 + (i % 3) * 8.6, -24 + Math.floor(i / 3) * 9.4, 8, 8, 1.6, hsl(i * 47, 80, 58), 0);
    rrect(g, -4, -30, 8, 1.6, .8, '#555', 0);
  } });
  def('sticky', { w: 46, h: 46, zone: 'wall', hue: [44, 60], sat: 95, lit: 72, pat: [1, 4], draw: function (g, o, c) {
    poly(g, [-19, -19, 19, -19, 19, 11, 11, 19, -19, 19], c()); poly(g, [19, 11, 11, 11, 11, 19], c(0, 0, -14), 1);
    for (var i = 0; i < o.p; i++) { var y = -11 + i * 7.5; g.beginPath(); g.moveTo(-13, y); g.quadraticCurveTo(-5, y - 3, 2, y); g.quadraticCurveTo(7, y + 2, 12 - (i % 2) * 4, y - 1); g.lineWidth = 2.6; g.strokeStyle = '#3a4a7a'; g.stroke(); }
  } });
  def('calculator', { w: 48, h: 66, zone: 'desk', hue: [200, 230], sat: 20, lit: 32, low: true, pat: [3, 5], draw: function (g, o, c) {
    rrect(g, -20, -30, 40, 60, 5, c()); rrect(g, -15, -25, 30, 12, 2, '#b8d8a8', 1.2);
    var n = o.p, i, j, rh = 34 / n;
    for (j = 0; j < n; j++) for (i = 0; i < 4; i++) rrect(g, -15 + i * 7.8, -9 + j * rh, 6, rh - 2.4, 1.2, i === 3 ? '#ff9d2e' : '#d7dbe5', 0);
  } });
  def('ruler', { w: 106, h: 24, zone: 'desk', hue: [44, 52], sat: 80, lit: 62, pat: [6, 10], draw: function (g, o, c) {
    rrect(g, -50, -9, 100, 18, 2, c());
    for (var i = 0; i < o.p; i++) { var x = -44 + i * 88 / (o.p - 1); line(g, x, -9, x, -1, 1.6, '#3b2a1a'); }
    for (i = 0; i < o.p - 1; i++) { var x2 = -44 + (i + .5) * 88 / (o.p - 1); line(g, x2, -9, x2, -5, 1.2, '#3b2a1a'); }
  } });

  /* ===== dòng suối ===== */
  def('frog', { w: 48, h: 40, zone: 'water', hue: [90, 130], sat: 60, lit: 45, pat: [1, 4], mood: true, draw: function (g, o, c) {
    ell(g, -16, 12, 9, 5, c(0, 0, -8), 1.4); ell(g, 16, 12, 9, 5, c(0, 0, -8), 1.4);
    ell(g, 0, 4, 18, 13, c());
    var P = [[-9, 6], [8, 7], [0, 13], [-1, 1]];
    for (var i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 4.2, c(0, 0, -20), 0);
    circ(g, -9, -8, 6, c(), 1.6); circ(g, 9, -8, 6, c(), 1.6); circ(g, -9, -9, 3, '#fff', 0); circ(g, 9, -9, 3, '#fff', 0); circ(g, -9, -9, 1.5, '#111', 0); circ(g, 9, -9, 1.5, '#111', 0);
    mouth(g, o.m || 0, 0, 2, 17, c(0, 0, -34));
  } });
  def('lilypad', { w: 62, h: 36, zone: 'water', hue: [100, 135], sat: 50, lit: 42, vmax: 2, pat: [3, 6], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(0, 0); g.ellipse(0, 0, 28, 14, 0, -1.25, 4.6); g.closePath(); fs(g, c());
    for (var i = 0; i < o.p; i++) { var a = 1.0 + i * (4.2 / o.p); line(g, 0, 0, Math.cos(a) * 22, Math.sin(a) * 11, 1.2, c(0, 0, 14)); }
    if (o.v === 1) { for (var k = 0; k < 5; k++) { g.save(); g.translate(8, -8); g.rotate(k * TAU / 5); ell(g, 0, -5, 3, 6, '#ffb6d0', 1); g.restore(); } circ(g, 8, -8, 2.4, '#ffd23f', 0); }
  } });
  def('reeds', { w: 46, h: 98, zone: 'bank', hue: [90, 130], sat: 45, lit: 40, pat: [2, 4], draw: function (g, o, c) {
    var i;
    for (i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 4, 46); g.quadraticCurveTo(i * 7, 10, i * 9 + (i % 2) * 4, -24 + Math.abs(i) * 6); g.lineWidth = 2.4; g.strokeStyle = c(0, 0, i % 2 ? 6 : -4); g.stroke(); }
    var X = [-6, 6, 0, -12];
    for (i = 0; i < o.p; i++) { line(g, X[i], 46, X[i], -36 + i * 4, 1.8, '#5b7a3a'); rrect(g, X[i] - 3.5, -38 + i * 4, 7, 16, 3.5, '#7a4a24', 1); }
  } });
  def('bridge', { w: 152, h: 66, zone: 'bridge', hue: [22, 34], sat: 45, lit: 42, pat: [5, 9], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(-72, 18); g.quadraticCurveTo(0, -18, 72, 18); g.lineTo(72, 26); g.quadraticCurveTo(0, -10, -72, 26); g.closePath(); fs(g, c());
    for (var i = 0; i < o.p; i++) { var t = (i + .5) / o.p, x = -72 + 144 * t, y = 18 - 36 * (2 * t * (1 - t)) * 1; line(g, x, y + 1, x, y + 7, 1.4, 'rgba(0,0,0,.35)'); }
    for (var k = 0; k <= 4; k++) { var t2 = k / 4, x2 = -66 + 132 * t2, y2 = 18 - 36 * 2 * ((x2 + 72) / 144) * (1 - (x2 + 72) / 144); line(g, x2, y2, x2, y2 - 18, 3, c(0, 0, -10)); }
    g.beginPath(); g.moveTo(-66, 2); g.quadraticCurveTo(0, -36, 66, 2); g.lineWidth = 3; g.strokeStyle = c(0, 0, -10); g.stroke();
  } });
  def('stones', { w: 76, h: 40, zone: 'bank', hue: [200, 240], sat: 10, lit: 60, low: true, pat: [2, 4], draw: function (g, o, c) {
    var P = [[-14, 4, 16, 11], [12, 6, 14, 10], [-1, -6, 11, 8], [24, -4, 9, 7]];
    for (var i = 0; i < o.p; i++) { ell(g, P[i][0], P[i][1], P[i][2], P[i][3], c(0, 0, i * 6 - 6)); ell(g, P[i][0] - P[i][2] * .3, P[i][1] - P[i][3] * .4, P[i][2] * .4, P[i][3] * .25, 'rgba(255,255,255,.3)', 0); }
  } });
  def('dragonfly', { w: 58, h: 36, zone: 'sky', hue: [170, 220], sat: 70, lit: 50, asym: true, pat: [2, 5], draw: function (g, o, c) {
    ell(g, 4, -8, 14, 4.5, 'rgba(210,240,255,.8)', 1, -.3); ell(g, 4, 8, 14, 4.5, 'rgba(210,240,255,.8)', 1, .3);
    ell(g, -6, -7, 12, 4, 'rgba(210,240,255,.8)', 1, .3); ell(g, -6, 7, 12, 4, 'rgba(210,240,255,.8)', 1, -.3);
    rrect(g, -26, -2, 30, 4, 2, c());
    for (var i = 0; i < o.p; i++) rrect(g, -24 + i * (26 / o.p), -2.5, 3.4, 5, 0, c(0, 0, -26), 0);
    circ(g, 8, 0, 4, c(0, 0, -6)); circ(g, 13, 0, 4.2, c(0, 0, 8), 1);
  } });
  def('log', { w: 86, h: 36, zone: 'bank', hue: [22, 32], sat: 45, lit: 40, vmax: 2, asym: true, pat: [2, 4], draw: function (g, o, c) {
    rrect(g, -38, -12, 72, 24, 10, c()); line(g, -30, -4, 20, -4, 1.4, 'rgba(0,0,0,.25)'); line(g, -24, 5, 26, 5, 1.4, 'rgba(0,0,0,.25)');
    ell(g, 34, 0, 8, 12, '#d9b47e');
    for (var i = 0; i < o.p; i++) { g.beginPath(); g.ellipse(34, 0, 8 * (i + 1) / (o.p + 1), 12 * (i + 1) / (o.p + 1), 0, 0, TAU); g.lineWidth = 1.3; g.strokeStyle = '#8a6136'; g.stroke(); }
    if (o.v === 1) { rrect(g, -18, -20, 4, 9, 1, '#f6e7cf', 0); g.beginPath(); g.ellipse(-16, -20, 8, 6, 0, Math.PI, 0); fs(g, '#e5392e', 1); }
  } });

  /* ===== dòng sông ===== */
  def('duck', { w: 56, h: 46, zone: 'water', hue: [0, 360], sat: 20, lit: 88, asym: true, low: true, pat: [1, 3], draw: function (g, o, c) {
    ell(g, -4, 6, 22, 13, c()); circ(g, 16, -10, 10, c(0, 0, -2));
    poly(g, [24, -10, 34, -7, 24, -4], '#ff9d2e', 1.2); circ(g, 18, -12, 1.8, '#111', 0);
    ell(g, -8, 4, 12, 7, c(0, 0, -10), 1.4, -.2);
    var wing = function () { g.beginPath(); g.ellipse(-8, 4, 12, 7, -.2, 0, TAU); };
    clipStripes(g, wing, o.p, -20, 4, -4, 12, 3.6, c(0, 0, -30), true);
    poly(g, [-24, 2, -32, -6, -26, 8], c(0, 0, -6), 1.2);
  } });
  def('rowboat', { w: 106, h: 44, zone: 'water', hue: [0, 360], sat: 55, lit: 48, vmax: 2, asym: true, pat: [1, 3], draw: function (g, o, c) {
    if (o.v === 0) { line(g, -14, -6, -36, 16, 3, '#8b6b4a'); line(g, 12, -6, 34, 16, 3, '#8b6b4a'); }
    var hull = function () { g.beginPath(); g.moveTo(-48, -6); g.lineTo(48, -10); g.quadraticCurveTo(40, 14, 20, 14); g.lineTo(-30, 14); g.quadraticCurveTo(-44, 10, -48, -6); g.closePath(); };
    hull(); fs(g, c(), 0);
    clipStripes(g, hull, o.p, -48, 48, -10, 14, 2.4, c(0, 0, 22), false);
    hull(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    rrect(g, -8, -10, 16, 4, 1, '#8b6b4a', 1);
  } });
  def('buoy', { w: 32, h: 46, zone: 'water', hue: [0, 12], sat: 85, lit: 50, pat: [1, 3], draw: function (g, o, c) {
    line(g, 0, -12, 0, -24, 2, '#555'); poly(g, [0, -24, 9, -20, 0, -16], '#ffd23f', 1);
    var body = function () { g.beginPath(); g.moveTo(-6, -12); g.lineTo(6, -12); g.lineTo(13, 14); g.lineTo(-13, 14); g.closePath(); };
    body(); fs(g, c(), 0);
    clipStripes(g, body, o.p, -13, 13, -12, 14, 4, '#fff', false);
    body(); g.lineWidth = 1.8; g.strokeStyle = OL; g.stroke();
    ell(g, 0, 16, 16, 3.5, 'rgba(255,255,255,.55)', 0);
  } });
  def('lotus', { w: 56, h: 42, zone: 'water', hue: [320, 350], sat: 70, lit: 72, pat: [5, 8], draw: function (g, o, c) {
    ell(g, 0, 12, 26, 7, '#3f8f3a');
    var n = o.p, i;
    for (i = 0; i < n; i++) { var t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; g.save(); g.translate(t * 12, 6); g.rotate(t * .9); ell(g, 0, -10, 6, 12, c(0, 0, i % 2 ? 6 : 0), 1.4); g.restore(); }
    circ(g, 0, 2, 4, '#ffd23f', 1);
  } });
  def('houseboat', { w: 136, h: 76, zone: 'water', hue: [0, 360], sat: 45, lit: 60, asym: true, pat: [2, 4], draw: function (g, o, c) {
    poly(g, [-62, 10, 62, 10, 50, 30, -54, 30], '#7b4f2a');
    rrect(g, -46, -22, 82, 32, 3, c());
    for (var i = 0; i < o.p; i++) rrect(g, -40 + i * (70 / o.p), -14, 70 / o.p - 6, 12, 2, '#bfe6ff', 1.2);
    poly(g, [-52, -20, 42, -20, 30, -34, -40, -34], c(180, 10, -26));
  } });

  /* ===== rừng núi ===== */
  def('deer', { w: 86, h: 86, zone: 'ground', hue: [22, 34], sat: 50, lit: 46, vmax: 2, asym: true, pat: [2, 6], draw: function (g, o, c) {
    var i;
    for (i = 0; i < 2; i++) { rrect(g, -24 + i * 8, 6, 5, 32, 2, c(0, 0, -10)); rrect(g, 14 + i * 8, 6, 5, 32, 2, c(0, 0, -10)); }
    ell(g, 0, 4, 30, 15, c());
    var P = [[-15, -2], [-4, 5], [8, -3], [-22, 7], [15, 6], [0, -7]];
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 3.8, '#fff4e0', 0);
    poly(g, [22, -4, 30, -26, 36, -24, 32, 0], c(0, 0, 4));
    ell(g, 36, -28, 10, 7, c(0, 0, 6), 2, .3); circ(g, 38, -30, 1.6, '#111', 0); circ(g, 45, -26, 2, '#222', 0);
    ell(g, 28, -36, 3, 6, c(0, 0, -6), 1, -.5);
    if (o.v === 0) { g.beginPath(); g.moveTo(32, -34); g.lineTo(28, -48); g.lineTo(22, -54); g.moveTo(28, -48); g.lineTo(34, -54); g.moveTo(36, -34); g.lineTo(40, -48); g.lineTo(36, -56); g.moveTo(40, -48); g.lineTo(46, -52); g.lineWidth = 2.6; g.strokeStyle = '#6b4a2b'; g.lineCap = 'round'; g.stroke(); }
    poly(g, [-30, 0, -36, -6, -32, 4], '#fff4e0', 1);
  } });
  def('eagle', { w: 78, h: 44, zone: 'sky', hue: [20, 32], sat: 45, lit: 32, asym: true, pat: [3, 5], draw: function (g, o, c) {
    var sd, i;
    for (sd = -1; sd <= 1; sd += 2) {
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sd * 16, -16, sd * 30, -8);
      for (i = 0; i < o.p; i++) { var t = i / (o.p - 1); g.lineTo(sd * (30 + 6 * Math.cos(t * 1.2)), -8 + t * 12); g.lineTo(sd * (26 - t * 2), -4 + t * 12); }
      g.lineTo(sd * 8, 8); g.closePath(); fs(g, c(), 1.6);
    }
    ell(g, 0, 4, 7, 12, c(0, 0, -6)); circ(g, 0, -9, 6, '#f7f3ea', 1.4); poly(g, [2, -10, 8, -8, 2, -6], '#ffb703', 1);
    poly(g, [-5, 14, 5, 14, 0, 22], c(0, 0, -6), 1.2);
  } });
  def('signpost', { w: 56, h: 76, zone: 'ground', hue: [22, 34], sat: 45, lit: 48, asym: true, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -3, -30, 6, 66, 1.5, c(0, 0, -12));
    for (var i = 0; i < o.p; i++) { var y = -28 + i * 15, d = i % 2 ? -1 : 1; g.save(); g.scale(d, 1); poly(g, [-6, y, 18, y, 24, y + 5.5, 18, y + 11, -6, y + 11], c(0, 0, i * 5)); line(g, -2, y + 5.5, 14, y + 5.5, 1.2, 'rgba(0,0,0,.3)'); g.restore(); }
  } });
  def('campfire', { w: 58, h: 48, zone: 'ground', hue: [16, 40], sat: 95, lit: 55, pat: [2, 4], draw: function (g, o, c) {
    glow(g, 0, -4, 30, 'rgba(255,170,60,.45)');
    g.beginPath(); g.moveTo(-12, 10); g.quadraticCurveTo(-14, -8, 0, -24); g.quadraticCurveTo(14, -8, 12, 10); g.closePath(); fs(g, c(), 1.4);
    g.beginPath(); g.moveTo(-6, 10); g.quadraticCurveTo(-6, -2, 0, -12); g.quadraticCurveTo(6, -2, 6, 10); g.closePath(); fs(g, c(20, 0, 20), 0);
    for (var i = 0; i < o.p; i++) { var a = (i - (o.p - 1) / 2) * (1.2 / Math.max(1, o.p - 1)); g.save(); g.translate(0, 14); g.rotate(a); rrect(g, -22, -3.5, 44, 7, 3.5, '#7b4f2a', 1.2); g.restore(); }
  } });

  /* ===== cảnh quan đồng quê ===== */
  def('barn', { w: 126, h: 106, zone: 'ground', hue: [0, 12], sat: 60, lit: 42, asym: true, pat: [3, 6], draw: function (g, o, c) {
    poly(g, [-50, -8, -34, -42, 34, -42, 50, -8, 50, 50, -50, 50], c());
    for (var i = 1; i <= o.p; i++) { var x = -50 + i * 100 / (o.p + 1); line(g, x, -6, x, 50, 1.6, 'rgba(0,0,0,.28)'); }
    poly(g, [-54, -6, -36, -46, 36, -46, 54, -6, 48, -6, 32, -40, -32, -40, -48, -6], '#f3eadb', 1.4);
    rrect(g, -18, 12, 36, 38, 1, '#f3eadb', 1.4); line(g, -18, 12, 18, 50, 2.4, c(0, 0, -10)); line(g, 18, 12, -18, 50, 2.4, c(0, 0, -10));
    rrect(g, -9, -30, 18, 14, 1, '#3b2a1a', 1.2);
  } });
  def('haystack', { w: 74, h: 60, zone: 'ground', hue: [40, 48], sat: 70, lit: 60, pat: [1, 3], draw: function (g, o, c) {
    g.beginPath(); g.moveTo(-34, 26); g.quadraticCurveTo(-36, -30, 0, -28); g.quadraticCurveTo(36, -30, 34, 26); g.closePath(); fs(g, c());
    for (var i = 0; i < 9; i++) line(g, -26 + i * 6.5, 20, -22 + i * 5.5, -12 + (i % 3) * 4, 1, c(0, 0, -16));
    for (i = 0; i < o.p; i++) { var y = 18 - (i + 1) * 40 / (o.p + 1); g.beginPath(); g.moveTo(-32, y + 2); g.quadraticCurveTo(0, y + 8, 32, y + 2); g.lineWidth = 2.6; g.strokeStyle = '#8a5a30'; g.stroke(); }
  } });
  def('cow', { w: 98, h: 66, zone: 'ground', hue: [20, 30], sat: 30, lit: 22, asym: true, pat: [1, 5], mood: true, draw: function (g, o, c) {
    var i;
    for (i = 0; i < 2; i++) { rrect(g, -30 + i * 9, 6, 6, 26, 2, '#f4f1ea'); rrect(g, 20 + i * 9, 6, 6, 26, 2, '#f4f1ea'); }
    ell(g, 0, 0, 36, 18, '#f4f1ea');
    g.save(); g.beginPath(); g.ellipse(0, 0, 36, 18, 0, 0, TAU); g.clip();
    var P = [[-18, -6, 9, 6], [6, -8, 8, 7], [-4, 8, 7, 5], [20, 4, 7, 6], [-26, 8, 6, 5]];
    for (i = 0; i < o.p; i++) ell(g, P[i][0], P[i][1], P[i][2], P[i][3], c(), 0, .3);
    g.restore();
    ell(g, 0, 0, 36, 18, 'rgba(0,0,0,0)', 2);
    ell(g, 40, -12, 11, 13, '#f4f1ea'); ell(g, 44, -4, 8, 6, '#f2b8b8', 1.2); circ(g, 38, -16, 1.8, '#111', 0); mouth(g, o.m || 0, 44, -3, 14, '#6a1f40');
    poly(g, [32, -24, 30, -32, 36, -26], '#d9c9a8', 1); ell(g, 30, -18, 5, 3, c(), 1, -.4);
    line(g, -36, -2, -42, 14, 2.4, '#f4f1ea');
  } });
  def('scarecrow', { w: 60, h: 98, zone: 'ground', hue: [0, 360], sat: 55, lit: 50, pat: [1, 3], mood: true, draw: function (g, o, c) {
    rrect(g, -2.5, -20, 5, 68, 1.5, '#7b4f2a'); rrect(g, -28, -14, 56, 5, 1.5, '#7b4f2a');
    poly(g, [-16, -16, 16, -16, 18, 18, -18, 18], c());
    var P = [[-8, -6], [6, 4], [-6, 10]];
    for (var i = 0; i < o.p; i++) rrect(g, P[i][0] - 4.5, P[i][1] - 4.5, 9, 9, 1, c(150, 0, 10), 1);
    for (i = 0; i < 3; i++) line(g, -28 - i, -11 + i * 3, -34, -8 + i * 4, 1.4, '#e6b84a');
    circ(g, 0, -26, 11, '#e9d4a8'); circ(g, -4, -28, 1.6, '#333', 0); circ(g, 4, -28, 1.6, '#333', 0); mouth(g, o.m || 0, 0, -25, 12, '#222');
    ell(g, 0, -36, 18, 4, '#d9a441', 1.4); poly(g, [-9, -37, 9, -37, 6, -48, -6, -48], '#d9a441', 1.4);
  } });
  def('tractor', { w: 98, h: 66, zone: 'ground', hue: [0, 360], sat: 70, lit: 45, asym: true, pat: [3, 6], draw: function (g, o, c) {
    rrect(g, -10, -14, 50, 20, 4, c()); rrect(g, -30, -36, 26, 34, 3, c(0, 0, -6)); rrect(g, -26, -32, 18, 14, 2, '#bfe6ff', 1.2);
    rrect(g, 28, -26, 4, 12, 1, '#555', 0);
    var i, wx = -18, wy = 14;
    circ(g, wx, wy, 20, '#2b2b36'); circ(g, wx, wy, 11, c(0, -20, 30), 1.2);
    for (i = 0; i < o.p; i++) { var a = i * TAU / o.p; line(g, wx, wy, wx + Math.cos(a) * 10, wy + Math.sin(a) * 10, 2, '#555'); }
    circ(g, 30, 20, 11, '#2b2b36'); circ(g, 30, 20, 5, c(0, -20, 30), 0);
  } });

  /* ===== thêm cho vũ trụ ===== */
  def('moon', { w: 66, h: 66, zone: 'any', hue: [200, 240], sat: 8, lit: 76, low: true, pat: [2, 5], draw: function (g, o, c) {
    glow(g, 0, 0, 34, 'rgba(255,255,255,.18)');
    circ(g, 0, 0, 26, c());
    var P = [[-8, -10, 5.6], [9, 4, 6.4], [-6, 13, 4.6], [12, -12, 4.2], [-16, 2, 4]];
    for (var i = 0; i < o.p; i++) { circ(g, P[i][0], P[i][1], P[i][2], c(0, 0, -14), 0); circ(g, P[i][0] + 1, P[i][1] + 1, P[i][2] * .6, c(0, 0, -6), 0); }
  } });
  def('comet', { w: 98, h: 46, zone: 'any', hue: [180, 220], sat: 80, lit: 70, asym: true, pat: [2, 4], draw: function (g, o, c) {
    for (var i = 0; i < o.p; i++) { var dy = (i - (o.p - 1) / 2) * 7; g.beginPath(); g.moveTo(26, dy * .3); g.lineTo(-44, dy * 2); g.lineWidth = 3.2 - Math.abs(dy) * .08; g.strokeStyle = c(0, 0, 10, .75); g.lineCap = 'round'; g.stroke(); }
    glow(g, 30, 0, 18, c(0, 0, 20, .7)); circ(g, 30, 0, 8, '#fff', 1.2);
  } });

  /* ---------- phông nền ---------- */
  BG.garden = function (g, m, r) {
    var hb = 120 + (m * 13) % 50, i;
    vgrad(g, 0, 270, [[0, hsl(hb - 20, 30, 86)], [1, hsl(hb, 30, 92)]]);
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3;
    for (i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 100, 0); g.lineTo(i * 100, 250); g.stroke(); }
    g.beginPath(); g.moveTo(0, 120); g.lineTo(W, 120); g.stroke();
    g.fillStyle = '#8a5a30'; g.fillRect(0, 248, W, 14); g.fillStyle = '#6e4626'; g.fillRect(0, 262, W, 6);
    vgrad(g, 268, 330, [[0, '#7fb069'], [1, '#5f9450']]);
    vgrad(g, 330, H, [[0, '#7a5232'], [1, '#5b3b22']]);
    g.fillStyle = 'rgba(0,0,0,.14)'; for (i = 0; i < 4; i++) g.fillRect(0, 380 + i * 55, W, 4);
    g.fillStyle = 'rgba(255,255,255,.08)'; for (i = 0; i < 90; i++) { g.beginPath(); g.arc(r() * W, 340 + r() * 250, 1 + r() * 1.5, 0, TAU); g.fill(); }
  };
  BG.road = function (g, m, r) {
    var i;
    skyFill(g, m, 200);
    for (i = 0; i < 9; i++) { var x = i * 95 + r() * 30, hh = 40 + r() * 60; g.fillStyle = 'rgba(60,70,100,.22)'; g.fillRect(x, 170 - hh, 60, hh + 30); }
    vgrad(g, 160, 236, [[0, '#7fb069'], [1, '#6a9c58']]);
    g.fillStyle = '#b8bec8'; g.fillRect(0, 236, W, 30);
    vgrad(g, 266, H, [[0, '#4a4f5e'], [1, '#383c48']]);
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 270, W, 4); g.fillRect(0, H - 8, W, 4);
    g.fillStyle = '#ffd23f';
    for (i = 0; i < 12; i++) { g.fillRect(i * 70 + 10, 384, 40, 5); g.fillRect(i * 70 + 40, 486, 40, 5); }
    g.fillStyle = 'rgba(255,255,255,.85)'; for (i = 0; i < 8; i++) g.fillRect(560 + i * 22, 276, 12, 104);
  };
  BG.desk = function (g, m, r) {
    var hw = 30 + (m * 23) % 200, i;
    vgrad(g, 0, 250, [[0, hsl(hw, 25, 82)], [1, hsl(hw, 25, 74)]]);
    g.strokeStyle = hsl(hw, 25, 70); g.lineWidth = 2; for (i = 0; i < 20; i++) { g.beginPath(); g.moveTo(i * 44, 0); g.lineTo(i * 44, 240); g.stroke(); }
    rrect(g, 470, 30, 260, 150, 4, '#b7895a', 0); rrect(g, 478, 38, 244, 134, 2, '#e8dcc6', 0);
    var gr = g.createLinearGradient(0, 240, 0, H); gr.addColorStop(0, '#a87346'); gr.addColorStop(1, '#7a5030'); g.fillStyle = gr; g.fillRect(0, 240, W, H - 240);
    g.fillStyle = '#8a5a34'; g.fillRect(0, 236, W, 10);
    g.strokeStyle = 'rgba(60,30,10,.18)'; g.lineWidth = 1.4;
    for (i = 0; i < 16; i++) { var y = 262 + i * 22 + r() * 8; g.beginPath(); g.moveTo(0, y); for (var x = 0; x <= W; x += 40) g.lineTo(x, y + Math.sin(x * .01 + i) * 3); g.stroke(); }
  };
  BG.stream = function (g, m, r) {
    var gh = 95 + (m * 9) % 40, i;
    skyFill(g, m, 150);
    hills(g, r, 140, 26, hsl(gh + 20, 35, 62), .008);
    vgrad(g, 130, H, [[0, hsl(gh, 50, 50)], [1, hsl(gh, 52, 36)]]);
    var top = function (x) { return 300 + Math.sin(x * .011 + 1) * 16 + Math.sin(x * .027) * 6; }, bot = function (x) { return 420 + Math.sin(x * .012 + 2) * 16 + Math.sin(x * .023) * 6; };
    g.beginPath(); g.moveTo(0, top(0)); for (var x = 0; x <= W; x += 10) g.lineTo(x, top(x)); for (x = W; x >= 0; x -= 10) g.lineTo(x, bot(x)); g.closePath();
    var gr = g.createLinearGradient(0, 290, 0, 440); gr.addColorStop(0, '#6cc6e8'); gr.addColorStop(1, '#2d8fbf'); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.lineCap = 'round';
    for (i = 0; i < 26; i++) { var xx = r() * W, yy = top(xx) + 14 + r() * (bot(xx) - top(xx) - 28); g.beginPath(); g.moveTo(xx, yy); g.quadraticCurveTo(xx + 10, yy - 3, xx + 20, yy); g.stroke(); }
    g.lineWidth = 5; g.strokeStyle = 'rgba(120,100,80,.5)';
    g.beginPath(); g.moveTo(0, top(0)); for (x = 0; x <= W; x += 10) g.lineTo(x, top(x)); g.stroke();
    g.beginPath(); g.moveTo(0, bot(0)); for (x = 0; x <= W; x += 10) g.lineTo(x, bot(x)); g.stroke();
    tufts(g, r, 160, 70, hsl(gh, 45, 26));
  };
  BG.river = function (g, m, r) {
    var gh = 90 + (m * 11) % 40, i;
    skyFill(g, m, 230);
    hills(g, r, 200, 30, 'rgba(90,110,140,.35)', .006);
    vgrad(g, 200, 272, [[0, hsl(gh, 45, 50)], [1, hsl(gh, 48, 42)]]);
    vgrad(g, 268, 488, [[0, '#7fc3d8'], [.5, '#4a9fbf'], [1, '#2f7ea3']]);
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.lineCap = 'round';
    for (i = 0; i < 34; i++) { var x = r() * W, y = 280 + r() * 200; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18 + r() * 20, y); g.stroke(); }
    vgrad(g, 486, H, [[0, hsl(gh + 5, 45, 46)], [1, hsl(gh, 50, 34)]]);
    g.fillStyle = 'rgba(160,130,90,.6)'; g.fillRect(0, 484, W, 6);
    tufts(g, r, 496, 50, hsl(gh, 45, 24));
  };
  BG.mountain = function (g, m, r) {
    var gh = 110 + (m * 7) % 40, i, x;
    skyFill(g, m, 380);
    g.beginPath(); g.moveTo(0, 330);
    var pk = [[0, 300], [110, 150], [200, 250], [320, 110], [430, 240], [540, 140], [660, 260], [760, 160], [800, 220]];
    for (i = 0; i < pk.length; i++) g.lineTo(pk[i][0], pk[i][1]);
    g.lineTo(W, 340); g.lineTo(0, 340); g.closePath(); g.fillStyle = 'rgba(100,110,150,.55)'; g.fill();
    for (i = 1; i < pk.length - 1; i += 2) poly(g, [pk[i][0], pk[i][1], pk[i][0] - 26, pk[i][1] + 30, pk[i][0] + 26, pk[i][1] + 30], 'rgba(255,255,255,.85)', 0);
    for (i = 0; i < 26; i++) { x = i * 32 + r() * 10; poly(g, [x, 360, x + 16, 300 + r() * 20, x + 32, 360], hsl(gh + 20, 30, 40), 0); }
    vgrad(g, 352, H, [[0, hsl(gh, 40, 42)], [1, hsl(gh - 6, 45, 28)]]);
    tufts(g, r, 370, 60, hsl(gh, 45, 20));
  };
  BG.landscape = function (g, m, r) {
    var gh = 85 + (m * 9) % 40, i, k;
    skyFill(g, m, 360);
    hills(g, r, 270, 34, hsl(gh + 25, 35, 66), .005);
    hills(g, r, 320, 24, hsl(gh + 10, 45, 56), .007);
    vgrad(g, 330, H, [[0, hsl(gh, 52, 52)], [1, hsl(gh - 5, 55, 38)]]);
    for (k = 0; k < 7; k++) { g.fillStyle = k % 2 ? hsl(gh + 30, 50, 58, .5) : hsl(gh - 15, 45, 44, .35); g.beginPath(); g.moveTo(0, 340 + k * 38); g.lineTo(W, 330 + k * 40); g.lineTo(W, 350 + k * 40); g.lineTo(0, 360 + k * 38); g.closePath(); g.fill(); }
    tufts(g, r, 345, 50, hsl(gh, 50, 26));
  };
})(typeof window !== 'undefined' ? window : globalThis);
