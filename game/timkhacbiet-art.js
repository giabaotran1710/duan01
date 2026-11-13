/* Tìm điểm khác biệt — phần vẽ: các loại vật thể (vẽ bằng canvas 2D) và phông nền các chủ đề cũ
   (thêm chủ đề mới ở timkhacbiet-art2.js và timkhacbiet-art3.js, số đo ở timkhacbiet-meta.js).
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
  var OL = 'rgba(28,16,40,.55)';
  /* tô khối có đổ bóng mềm: sau màu nền phủ thêm một lớp sáng (phía trên/trái) - tối (phía dưới) theo khung hình (B),
     để vật trông có khối thay vì tô phẳng. Màu bán trong suốt (ánh sáng, bóng) thì giữ phẳng. */
  var B = null;
  function solid(f) { return typeof f === 'string' && f.indexOf('rgba') < 0 && f.indexOf('hsla') < 0; }
  function shadeFill(g, b) {
    var gr, w = b[2] - b[0], h = b[3] - b[1];
    if (b[4]) {
      var rx = w / 2, ry = h / 2, cx = b[0] + rx, cy = b[1] + ry, R = Math.max(rx, ry);
      gr = g.createRadialGradient(cx - rx * .38, cy - ry * .45, R * .05, cx, cy, R * 1.08);
      gr.addColorStop(0, 'rgba(255,255,255,.34)'); gr.addColorStop(.42, 'rgba(255,255,255,.06)');
      gr.addColorStop(.78, 'rgba(0,0,0,.04)'); gr.addColorStop(1, 'rgba(20,8,30,.24)');
    } else {
      gr = g.createLinearGradient(b[0] + w * .2, b[1], b[0] + w * .8, b[3]);
      gr.addColorStop(0, 'rgba(255,255,255,.26)'); gr.addColorStop(.45, 'rgba(255,255,255,0)');
      gr.addColorStop(1, 'rgba(20,8,30,.2)');
    }
    g.fillStyle = gr; g.fill();
  }
  function fs(g, fill, lw) {
    var b = B; B = null;
    g.fillStyle = fill; g.fill();
    if (b && solid(fill) && b[2] - b[0] > 4 && b[3] - b[1] > 4) shadeFill(g, b);
    if (lw !== 0) { g.lineWidth = lw || 2; g.strokeStyle = OL; g.lineJoin = 'round'; g.stroke(); }
  }
  function circ(g, x, y, r, fill, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); B = [x - r, y - r, x + r, y + r, 1]; fs(g, fill, lw); }
  function ell(g, x, y, rx, ry, fill, lw, rot) {
    g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
    if (!rot) B = [x - rx, y - ry, x + rx, y + ry, 1];
    else { var m = Math.max(rx, ry), n = Math.min(rx, ry), q = (m + n) / 2; B = [x - q, y - q, x + q, y + q, 1]; }
    fs(g, fill, lw);
  }
  function poly(g, p, fill, lw) {
    var x0 = p[0], y0 = p[1], x1 = p[0], y1 = p[1], i;
    g.beginPath(); g.moveTo(p[0], p[1]);
    for (i = 2; i < p.length; i += 2) {
      g.lineTo(p[i], p[i + 1]);
      if (p[i] < x0) x0 = p[i]; if (p[i] > x1) x1 = p[i]; if (p[i + 1] < y0) y0 = p[i + 1]; if (p[i + 1] > y1) y1 = p[i + 1];
    }
    g.closePath(); B = [x0, y0, x1, y1, 0]; fs(g, fill, lw);
  }
  function rrect(g, x, y, w, h, r, fill, lw) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath(); g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath(); B = [x, y, x + w, y + h, 0]; fs(g, fill, lw);
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
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    g.beginPath();
    for (i = 0; i < L.length; i++) {
      s = L[i]; g.moveTo(s[0] + s[2], s[1]); g.ellipse(s[0], s[1], s[2], s[3] || s[2], 0, 0, TAU);
      x0 = Math.min(x0, s[0] - s[2]); x1 = Math.max(x1, s[0] + s[2]); y0 = Math.min(y0, s[1] - (s[3] || s[2])); y1 = Math.max(y1, s[1] + (s[3] || s[2]));
    }
    g.fill('nonzero');
    if (solid(fill)) shadeFill(g, [x0, y0, x1, y1, 1]);
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
  /* cho hàm vẽ tự dựng đường (bezier...) được đổ bóng khối như circ/ell: gọi sb([x0,y0,x1,y1,tròn?]) ngay trước fs */
  function sb(b) { B = b; }
  /* mắt bóng: tròng đen hơi dài, hai đốm sáng */
  function eye2(g, x, y, r, col) {
    ell(g, x, y, r * .84, r, col || '#1b1420', 0);
    circ(g, x + r * .3, y - r * .38, r * .36, '#fff', 0); circ(g, x - r * .28, y + r * .4, r * .15, 'rgba(255,255,255,.75)', 0);
  }
  function blush(g, x, y, r) { ell(g, x, y, r, r * .62, 'rgba(255,110,130,.38)', 0); }
  function pick(r, a) { return a[Math.floor(r() * a.length) % a.length]; }
  /* nét mặt của con vật: m = 0 cười, 1 bình thường (không cười, không buồn), 2 buồn; (x,y) = giữa miệng, w = bề rộng miệng */
  function mouth(g, m, x, y, w, col) {
    g.beginPath(); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = Math.max(2.2, w * .2); g.strokeStyle = col;
    if (m === 1) { g.moveTo(x - w * .42, y + w * .12); g.lineTo(x + w * .42, y + w * .12); }
    else if (m === 2) { g.moveTo(x - w * .5, y + w * .36); g.quadraticCurveTo(x, y - w * .3, x + w * .5, y + w * .36); }
    else { g.moveTo(x - w * .5, y - w * .08); g.quadraticCurveTo(x, y + w * .7, x + w * .5, y - w * .08); }
    g.stroke();
  }
  /* các điểm rải trong một vùng theo hạt giống của vật: n điểm đầu luôn giống nhau dù n đổi,
     nên thêm/bớt 1 hoạ tiết (đốm, quả...) chỉ làm xuất hiện/mất đúng 1 cái */
  function spots(r, n, x0, y0, x1, y1, md, inside) {
    var out = [], tries = 0, x, y, i, ok, dx, dy;
    /* nếu chật chỗ thì nới dần khoảng cách tối thiểu: luôn đủ đúng n điểm (n điểm đầu vẫn giữ nguyên) */
    while (out.length < n) {
      if (++tries > 300) { tries = 0; md *= .85; if (md < 1) break; }
      x = x0 + r() * (x1 - x0); y = y0 + r() * (y1 - y0);
      if (inside && !inside(x, y)) continue;
      ok = true;
      for (i = 0; i < out.length; i++) { dx = out[i][0] - x; dy = out[i][1] - y; if (dx * dx + dy * dy < md * md) { ok = false; break; } }
      if (ok) out.push([x, y]);
    }
    return out;
  }
  function inEll(cx, cy, rx, ry) { return function (x, y) { var a = (x - cx) / rx, b = (y - cy) / ry; return a * a + b * b <= 1; }; }
  /* sọc song song cắt trong một hình (clip) */
  function clipStripes(g, path, n, x0, x1, y0, y1, wid, col, vertical) {
    var i, t;
    g.save(); path(); g.clip();
    for (i = 0; i < n; i++) {
      t = (i + 1) / (n + 1);
      g.fillStyle = col;
      if (vertical) g.fillRect(x0 + (x1 - x0) * t - wid / 2, y0, wid, y1 - y0);
      else g.fillRect(x0, y0 + (y1 - y0) * t - wid / 2, x1 - x0, wid);
    }
    g.restore();
  }

  /* ---------- các loại vật thể ----------
     w,h: kích thước ở tỉ lệ 1; zone: vùng mặc định; hue:[a,b] sat lit: màu chủ đạo; vmax: số biến thể (kiểu dáng);
     pat:[a,b]: số hoạ tiết lặp lại (sọc, đốm, cửa sổ, cánh hoa...) — điểm khác "hoạ tiết" là đổi số này đúng 1 đơn vị;
     asym: lật ngang nhìn thấy được; max: số lượng tối đa mỗi ảnh; low: màu nhạt/xám (đổi màu bằng độ sáng) */
  var T = {};
  function def(name, o) { o.name = name; o.vmax = o.vmax || 1; T[name] = o; }

  /* ===== trên trời ===== */
  def('sun', { w: 84, h: 84, zone: 'sky', hue: [40, 50], sat: 96, lit: 56, vmax: 2, max: 1, pat: [7, 12], mood: true, moodOn: function (o) { return o.v === 1; }, draw: function (g, o, c) {
    var n = o.p, i;
    for (i = 0; i < n; i++) { g.save(); g.rotate(i * TAU / n); poly(g, [-5, -29, 5, -29, 0, -42], c(0, 0, 6), 1.5); g.restore(); }
    circ(g, 0, 0, 25, c(), 2); circ(g, -7, -8, 8, c(0, -8, 20, .55), 0);
    if (o.v === 1) {
      circ(g, -8, -3, 2.6, '#5a3b00', 0); circ(g, 8, -3, 2.6, '#5a3b00', 0);
      mouth(g, o.m || 0, 0, 3, 17, '#5a3b00');
      if (o.m === 2) { line(g, -12, -9, -5, -6, 2.4, '#5a3b00'); line(g, 12, -9, 5, -6, 2.4, '#5a3b00'); }
    }
  } });
  def('cloud', { w: 112, h: 74, zone: 'sky', hue: [195, 215], sat: 55, lit: 93, low: true, pat: [0, 4], draw: function (g, o, c) {
    blob(g, [[-30, 8, 18], [-8, -4, 24], [22, 0, 21], [44, 10, 13], [2, 14, 44, 12]], c());
    var xs = [-24, 22, -2, 40], i;
    for (i = 0; i < o.p; i++) { g.beginPath(); g.moveTo(xs[i], 27); g.quadraticCurveTo(xs[i] - 7, 38, xs[i], 41); g.quadraticCurveTo(xs[i] + 7, 38, xs[i], 27); fs(g, '#4aa3ff', 1); }
  } });
  def('balloon', { w: 62, h: 98, zone: 'sky', hue: [0, 360], sat: 80, lit: 55, vmax: 2, pat: [2, 5], draw: function (g, o, c) {
    var env = function () { g.beginPath(); g.ellipse(0, -16, 28, 34, 0, 0, TAU); };
    line(g, -9, 30, -7, 38, 1.5, '#6b4a2b'); line(g, 9, 30, 7, 38, 1.5, '#6b4a2b');
    rrect(g, -10, 37, 20, 13, 3, '#b07a3c');
    env(); fs(g, c(), 2);
    clipStripes(g, env, o.p, -28, 28, -50, 18, 6, c(40, 0, 18), o.v === 0);
    poly(g, [-9, 26, 9, 26, 5, 31, -5, 31], c(0, 0, -15), 1.5);
    circ(g, -9, -30, 6, 'rgba(255,255,255,.4)', 0);
  } });
  def('star', { w: 54, h: 54, zone: 'sky', hue: [40, 55], sat: 95, lit: 58, pat: [4, 7], draw: function (g, o, c) {
    glow(g, 0, 0, 26, c(0, 0, 20, .5));
    star(g, o.p, 24, o.p === 4 ? 8 : 11, c(), 2);
  } });
  def('plane', { w: 100, h: 46, zone: 'sky', hue: [0, 360], sat: 65, lit: 55, vmax: 2, asym: true, pat: [3, 6], draw: function (g, o, c) {
    poly(g, [-34, -3, -46, -20, -30, -20, -14, -3], c(0, 0, -10));
    ell(g, 0, 0, 42, 11, '#f3f6fb'); poly(g, [-6, 4, 14, 4, -12, 20, -22, 20], c(0, 0, -6));
    for (var i = 0; i < o.p; i++) circ(g, -24 + i * 10, -2, 3.8, '#6fa8dc', 0);
    ell(g, 34, -2, 9, 6, '#6fa8dc', 1.5);
    if (o.v === 1) rrect(g, -38, 5, 78, 3.5, 1, c(), 0);
  } });
  def('kite', { w: 54, h: 90, zone: 'sky', hue: [0, 360], sat: 80, lit: 58, pat: [2, 5], draw: function (g, o, c) {
    var n = o.p, i;
    g.beginPath(); g.moveTo(0, 24); g.bezierCurveTo(-10, 30, 8, 36, -2, 44); g.lineWidth = 1.8; g.strokeStyle = '#5b4636'; g.stroke();
    for (i = 0; i < n; i++) { var t = (i + 1) / (n + 1), x = -2 + (t - .5) * 6, y = 26 + t * 16; poly(g, [x - 5, y, x + 5, y + 3, x - 5, y + 6], c(150, 0, 0), 1); }
    poly(g, [0, -42, 24, -8, 0, 24], c()); poly(g, [0, -42, -24, -8, 0, 24], c(40, 0, 12));
    line(g, 0, -42, 0, 24, 1.6, OL); line(g, -24, -8, 24, -8, 1.6, OL);
  } });
  def('butterfly', { w: 54, h: 44, zone: 'sky', hue: [0, 360], sat: 75, lit: 62, vmax: 2, pat: [0, 3], draw: function (g, o, c) {
    ell(g, -14, -8, 14, 12, c(), 2, -.5); ell(g, 14, -8, 14, 12, c(), 2, .5);
    ell(g, -11, 10, 10, 9, c(30, 0, 8), 2, .4); ell(g, 11, 10, 10, 9, c(30, 0, 8), 2, -.4);
    var P = [[-15, -9], [-20, -3], [-10, -14]], i;
    for (i = 0; i < o.p; i++) { circ(g, P[i][0], P[i][1], 3.6, '#fff', 0); circ(g, -P[i][0], P[i][1], 3.6, '#fff', 0); }
    if (o.v === 1) { circ(g, -11, 11, 3, c(0, 0, -25), 0); circ(g, 11, 11, 3, c(0, 0, -25), 0); }
    rrect(g, -2.5, -14, 5, 28, 2.5, '#3a2a28', 0);
    arc(g, -3, -14, 7, Math.PI * 1.1, Math.PI * 1.7, 1.6, '#3a2a28'); arc(g, 3, -14, 7, Math.PI * 1.3, Math.PI * 1.9, 1.6, '#3a2a28');
  } });
  def('rainbow', { w: 160, h: 84, zone: 'sky', hue: [0, 360], sat: 80, lit: 58, pat: [4, 7], draw: function (g, o, c) {
    var n = o.p, i;
    g.lineCap = 'butt';
    for (i = 0; i < n; i++) arc(g, 0, 40, 72 - i * 9, Math.PI, 0, 9.5, c(i * (300 / n), 0, 0));
    g.lineCap = 'round';
  } });

  /* ===== trên mặt đất ===== */
  def('tree', { w: 86, h: 118, zone: 'ground', hue: [95, 140], sat: 52, lit: 42, vmax: 2, pat: [3, 8], draw: function (g, o, c, r) {
    var i, P;
    rrect(g, -7, 22, 14, 36, 3, '#7b4f2a'); rrect(g, -7, 22, 5, 36, 2, 'rgba(255,255,255,.12)', 0);
    blob(g, [[0, -18, 33], [-22, 0, 24], [22, 2, 24], [0, 10, 28]], c());
    circ(g, -10, -26, 9, c(0, 0, 10, .5), 0);
    P = spots(r, o.p, -30, -40, 30, 20, 13, function (x, y) { return (x * x) / 900 + ((y + 10) * (y + 10)) / 1000 <= 1; });
    for (i = 0; i < P.length; i++) {
      if (o.v === 0) { circ(g, P[i][0], P[i][1], 6, '#e5392e', 1.5); circ(g, P[i][0] - 1.6, P[i][1] - 1.8, 1.6, 'rgba(255,255,255,.6)', 0); }
      else { circ(g, P[i][0], P[i][1], 5, '#ffe3ee', 1.2); circ(g, P[i][0], P[i][1], 1.8, '#ffb703', 0); }
    }
  } });
  function pineShape(g, o, c, snow) {
    var tiers = [[-60, -22, 22], [-42, 4, 30], [-20, 32, 38]], i, t, n = o.p, y, hw;
    rrect(g, -6, 30, 12, 28, 2, '#7a4a24');
    for (i = 0; i < 3; i++) { t = tiers[i]; poly(g, [0, t[0], -t[2], t[1], t[2], t[1]], c(0, 0, i * 3)); }
    if (snow) for (i = 0; i < 3; i++) { t = tiers[i]; y = t[0] + (t[1] - t[0]) * .5; hw = t[2] * .5; poly(g, [0, t[0], -hw, y, -hw * .4, y + 4, 0, y - 1, hw * .4, y + 4, hw, y], '#f7fbff', 1.2); }
    /* các dải sọc (dây kim tuyến) ngang thân cây */
    for (i = 0; i < n; i++) {
      y = -46 + (i + .5) * (78 / n);
      hw = y < -22 ? (y + 60) * 22 / 38 : y < 4 ? (y + 42) * 30 / 46 : (y + 20) * 38 / 52;
      hw = Math.max(6, hw - 3);
      g.beginPath(); g.moveTo(-hw, y - 3); g.quadraticCurveTo(0, y + 5, hw, y - 3);
      g.lineWidth = 3.4; g.strokeStyle = snow ? '#ff5d73' : '#ffd23f'; g.lineCap = 'round'; g.stroke();
    }
    if (o.v === 1) { g.save(); g.translate(0, -62); star(g, 5, 9, 4, '#ffd23f', 1.5); g.restore(); }
  }
  def('pine', { w: 76, h: 124, zone: 'ground', hue: [130, 160], sat: 45, lit: 32, vmax: 2, pat: [2, 5], draw: function (g, o, c) { pineShape(g, o, c, false); } });
  def('spine', { w: 76, h: 124, zone: 'ground', hue: [130, 160], sat: 45, lit: 32, vmax: 2, pat: [2, 5], draw: function (g, o, c) { pineShape(g, o, c, true); } });
  def('bush', { w: 76, h: 48, zone: 'ground', hue: [105, 150], sat: 50, lit: 40, vmax: 2, pat: [2, 7], draw: function (g, o, c, r) {
    blob(g, [[-22, 4, 16], [0, -4, 20], [22, 4, 16], [0, 8, 28, 13]], c());
    var P = spots(r, o.p, -30, -16, 30, 14, 11, function (x, y) { return (x * x) / 1000 + (y * y) / 300 <= 1; }), i;
    for (i = 0; i < P.length; i++) {
      if (o.v === 0) circ(g, P[i][0], P[i][1], 5.4, '#d62f45', 1.2);
      else { circ(g, P[i][0], P[i][1], 5.4, '#ffd23f', 1.2); circ(g, P[i][0], P[i][1], 1.6, '#fff', 0); }
    }
  } });
  def('flower', { w: 42, h: 78, zone: 'ground', hue: [0, 360], sat: 85, lit: 60, vmax: 2, pat: [5, 8], draw: function (g, o, c) {
    var n = o.p, i;
    line(g, 0, -4, 0, 36, 3.4, '#3f8f3a'); ell(g, -9, 20, 9, 4, '#4fae48', 1.5, -.5); ell(g, 9, 28, 9, 4, '#4fae48', 1.5, .5);
    for (i = 0; i < n; i++) { g.save(); g.translate(0, -18); g.rotate(i * TAU / n); ell(g, 0, -11, 6, 11, c(), 1.5); g.restore(); }
    circ(g, 0, -18, 7, o.v === 0 ? '#ffd23f' : '#6b3e1f', 1.5);
  } });
  def('house', { w: 114, h: 112, zone: 'ground', hue: [0, 360], sat: 55, lit: 72, vmax: 2, asym: true, pat: [1, 3], draw: function (g, o, c) {
    if (o.v === 0) rrect(g, 20, -40, 14, 30, 2, '#9c5a43');
    rrect(g, -40, 0, 80, 54, 3, c());
    poly(g, [-52, 4, 0, -52, 52, 4], c(180, 10, -28));
    rrect(g, -9, 24, 18, 30, 3, '#7a4a2a'); circ(g, 4, 40, 1.6, '#ffd23f', 0);
    var P = [[-33, 10], [17, 10], [-33, 32]], i;
    for (i = 0; i < o.p; i++) { var x = P[i][0], y = P[i][1], s = 16; rrect(g, x, y, s, s, 2, '#bfe6ff'); line(g, x + s / 2, y, x + s / 2, y + s, 1.5, '#fff'); line(g, x, y + s / 2, x + s, y + s / 2, 1.5, '#fff'); }
    circ(g, 0, -16, 7, '#bfe6ff', 2);
  } });
  def('fence', { w: 114, h: 52, zone: 'ground', hue: [25, 40], sat: 55, lit: 62, pat: [4, 7], draw: function (g, o, c) {
    var n = o.p, i, x;
    rrect(g, -54, -8, 108, 7, 2, c(0, 0, -8)); rrect(g, -54, 10, 108, 7, 2, c(0, 0, -8));
    for (i = 0; i < n; i++) { x = -48 + i * (96 / (n - 1)); poly(g, [x - 6, 24, x - 6, -14, x, -22, x + 6, -14, x + 6, 24], c()); }
  } });
  def('windmill', { w: 92, h: 136, zone: 'ground', hue: [0, 360], sat: 55, lit: 62, vmax: 2, pat: [3, 5], draw: function (g, o, c) {
    var i, n = o.p, a = [.2, .55][o.v];
    poly(g, [-19, 66, 19, 66, 11, -14, -11, -14], c()); poly(g, [-14, -12, 0, -34, 14, -12], c(180, 10, -26));
    rrect(g, -6, 44, 12, 22, 2, '#7a4a2a'); rrect(g, -4, 14, 8, 10, 1, '#bfe6ff');
    for (i = 0; i < n; i++) {
      g.save(); g.translate(0, -22); g.rotate(a + i * TAU / n);
      rrect(g, -2.5, -44, 5, 44, 1, '#8a5a30'); poly(g, [3, -42, 15, -42, 15, -12, 3, -12], 'rgba(255,255,255,.9)', 1.5);
      g.restore();
    }
    circ(g, 0, -22, 5, '#8a5a30');
  } });
  def('rock', { w: 62, h: 44, zone: 'ground', hue: [200, 260], sat: 12, lit: 62, vmax: 2, low: true, pat: [0, 3], draw: function (g, o, c) {
    if (o.v === 1) poly(g, [-34, 20, -30, 8, -22, 4, -18, 20], c(0, 0, -8));
    poly(g, [-28, 18, -22, -8, -6, -20, 14, -16, 28, 2, 26, 18], c());
    poly(g, [-6, -20, 14, -16, 28, 2, 6, -2], c(0, 0, 10), 0);
    var P = [[-14, 4], [8, 8], [-2, -8]], i;
    for (i = 0; i < o.p; i++) ell(g, P[i][0], P[i][1], 6.5, 5, '#7cbf4a', 0);
  } });
  def('mushroom', { w: 48, h: 54, zone: 'ground', hue: [0, 20], sat: 75, lit: 50, pat: [2, 6], draw: function (g, o, c) {
    rrect(g, -8, -2, 16, 28, 5, '#f6e7cf'); g.beginPath(); g.moveTo(-24, 4); g.bezierCurveTo(-24, -34, 24, -34, 24, 4); g.closePath(); fs(g, c());
    var sp = [[-11, -11, 5], [9, -14, 5], [0, -3, 4.4], [15, -3, 3.8], [-16, -1, 3.8], [-1, -20, 3.8]];
    for (var i = 0; i < o.p; i++) circ(g, sp[i][0], sp[i][1], sp[i][2], '#fff', 0);
  } });
  def('lamp', { w: 34, h: 114, zone: 'ground', hue: [40, 50], sat: 90, lit: 62, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -3, -34, 6, 90, 2, '#3b4252'); rrect(g, -9, 52, 18, 6, 2, '#3b4252');
    for (var i = 0; i < o.p; i++) rrect(g, -6, 28 - i * 15, 12, 7, 2, '#7d879a', 0);
    if (o.v === 0) glow(g, 0, -42, 30, c(0, 0, 10, .55));
    rrect(g, -9, -56, 18, 24, 5, o.v === 0 ? c() : '#8b93a1'); poly(g, [-12, -56, 12, -56, 0, -66], '#3b4252');
  } });

  /* ===== bãi biển ===== */
  def('umbrella', { w: 98, h: 98, zone: 'ground', hue: [0, 360], sat: 80, lit: 56, vmax: 2, pat: [4, 7], draw: function (g, o, c) {
    var i, n = o.p, wseg = 92 / n;
    rrect(g, -2.5, -10, 5, 58, 2, '#8b6b4a');
    g.save(); g.beginPath(); g.moveTo(-46, 0); g.bezierCurveTo(-46, -50, 46, -50, 46, 0); g.closePath(); g.clip();
    g.fillStyle = c(); g.fillRect(-48, -52, 96, 54);
    for (i = 0; i < n; i++) if (i % 2 === 0) poly(g, [0, 8, -46 + i * wseg, 4, -46 + (i + 1) * wseg, 4], o.v === 1 ? c(0, 0, -16) : '#fff', 0);
    g.restore();
    g.beginPath(); g.moveTo(-46, 0); g.bezierCurveTo(-46, -50, 46, -50, 46, 0); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    for (i = 0; i < n; i++) arc(g, -46 + (i + .5) * wseg, 0, wseg / 2, 0, Math.PI, 2, OL);
  } });
  def('sailboat', { w: 98, h: 96, zone: 'sea', hue: [0, 360], sat: 70, lit: 52, vmax: 2, asym: true, pat: [0, 3], draw: function (g, o, c) {
    poly(g, [-38, 24, 38, 24, 26, 42, -26, 42], c());
    line(g, 0, -44, 0, 24, 3, '#5b4636');
    if (o.v === 0) poly(g, [-4, -38, -4, 18, -32, 18], '#fff7e6', 1.5);
    var sail = function () { g.beginPath(); g.moveTo(4, -44); g.lineTo(4, 18); g.lineTo(34, 18); g.closePath(); };
    sail(); fs(g, '#fff', 1.5);
    clipStripes(g, sail, o.p, 4, 34, -44, 18, 5, c(0, 0, 8), false);
    poly(g, [0, -44, 14, -39, 0, -34], '#ff5252', 1);
    arc(g, -22, 46, 10, Math.PI, 0, 2.5, 'rgba(255,255,255,.8)'); arc(g, 6, 46, 10, Math.PI, 0, 2.5, 'rgba(255,255,255,.8)');
  } });
  def('palm', { w: 98, h: 138, zone: 'ground', hue: [110, 140], sat: 55, lit: 40, asym: true, pat: [1, 4], draw: function (g, o, c) {
    var i;
    g.beginPath(); g.moveTo(-8, 66); g.bezierCurveTo(-4, 20, 6, -10, 16, -40); g.lineTo(26, -36); g.bezierCurveTo(14, -8, 8, 22, 10, 66); g.closePath(); fs(g, '#a9774a');
    for (i = 0; i < 6; i++) { g.save(); g.translate(20, -42); g.rotate(-2.5 + i * .55); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(14, -18, 40, -22, 52, 2); g.bezierCurveTo(36, -8, 14, -6, 0, 0); fs(g, c(0, 0, i % 2 ? 4 : -4), 1.6); g.restore(); }
    var P = [[13, -35], [26, -33], [19, -27], [8, -29]];
    for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 6, '#6b4a2b');
  } });
  def('starfish', { w: 50, h: 50, zone: 'ground', hue: [10, 40], sat: 85, lit: 58, pat: [0, 5], draw: function (g, o, c) {
    star(g, 5, 23, 9, c(), 2.2);
    for (var i = 0; i < o.p; i++) circ(g, Math.cos(-Math.PI / 2 + i * TAU / 5) * 12, Math.sin(-Math.PI / 2 + i * TAU / 5) * 12, 4, c(0, 0, 24), 0);
  } });
  def('beachball', { w: 50, h: 50, zone: 'ground', hue: [0, 360], sat: 80, lit: 56, pat: [2, 4], draw: function (g, o, c) {
    var i, n = o.p * 2;
    g.save(); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.clip(); g.fillStyle = '#fff'; g.fillRect(-24, -24, 48, 48);
    for (i = 0; i < n; i += 2) { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 30, i * TAU / n, (i + 1) * TAU / n); g.closePath(); g.fillStyle = (i / 2) % 2 ? c(150, 0, 0) : c(); g.fill(); }
    g.restore(); circ(g, 0, 0, 22, 'rgba(0,0,0,0)', 2); circ(g, 0, 0, 4, '#fff', 1.5); circ(g, -8, -9, 5, 'rgba(255,255,255,.55)', 0);
  } });
  def('lighthouse', { w: 54, h: 138, zone: 'ground', hue: [0, 360], sat: 75, lit: 55, pat: [2, 5], draw: function (g, o, c) {
    var n = o.p, i, ya = -34, yb = 64, ht = (yb - ya) / (2 * n);
    g.save(); g.beginPath(); g.moveTo(-18, yb); g.lineTo(18, yb); g.lineTo(11, ya); g.lineTo(-11, ya); g.closePath(); g.clip();
    g.fillStyle = '#fff'; g.fillRect(-20, ya, 40, yb - ya);
    for (i = 0; i < n; i++) { g.fillStyle = c(); g.fillRect(-20, ya + (2 * i + .5) * ht, 40, ht); }
    g.restore(); poly(g, [-18, yb, 18, yb, 11, ya, -11, ya], 'rgba(0,0,0,0)', 2);
    rrect(g, -16, -42, 32, 8, 2, '#3b4252'); rrect(g, -9, -64, 18, 22, 3, '#ffe27a'); poly(g, [-12, -64, 12, -64, 0, -76], c(0, 0, -12));
    glow(g, 0, -53, 26, 'rgba(255,240,150,.45)'); rrect(g, -4, 46, 8, 18, 2, '#7a4a2a', 1.5);
  } });
  def('sandcastle', { w: 78, h: 60, zone: 'ground', hue: [38, 44], sat: 60, lit: 68, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    var ts = o.v === 1 ? [[-24, 14], [24, 14]] : [[-26, 12], [0, 20], [26, 12]], i, k;
    rrect(g, -34, 6, 68, 24, 3, c());
    for (i = 0; i < ts.length; i++) { rrect(g, ts[i][0] - 9, -ts[i][1], 18, ts[i][1] + 30, 2, c(0, 0, 4)); for (k = -1; k <= 1; k++) rrect(g, ts[i][0] + k * 6 - 2.5, -ts[i][1] - 6, 5, 7, 1, c(0, 0, 4), 1); }
    line(g, 0, -26, 0, -38, 2, '#8b6b4a'); poly(g, [0, -38, 12, -34, 0, -30], '#ff5252', 1);
    var X = [-14, 14, 0];
    for (i = 0; i < o.p; i++) rrect(g, X[i] - 4, 14, 8, 12, 4, c(0, 0, -18), 1);
  } });

  /* ===== dưới biển ===== */
  def('jelly', { w: 56, h: 80, zone: 'water', hue: [280, 340], sat: 70, lit: 70, vmax: 2, pat: [3, 6], mood: true, draw: function (g, o, c) {
    var i, n = o.p, x;
    for (i = 0; i < n; i++) { x = -18 + i * (36 / (n - 1)); g.beginPath(); g.moveTo(x, 4); g.bezierCurveTo(x - 7, 16, x + 7, 26, x, 36); g.lineWidth = 3; g.strokeStyle = c(0, 0, -10); g.lineCap = 'round'; g.stroke(); }
    g.beginPath(); g.moveTo(-24, 8); g.bezierCurveTo(-26, -34, 26, -34, 24, 8); g.quadraticCurveTo(12, 14, 0, 8); g.quadraticCurveTo(-12, 14, -24, 8); fs(g, c());
    circ(g, -8, -14, 5, 'rgba(255,255,255,.5)', 0); circ(g, -7, -5, 2.2, '#3a1d4a', 0); circ(g, 7, -5, 2.2, '#3a1d4a', 0); mouth(g, o.m || 0, 0, 0, 14, '#3a1d4a');
    if (o.v === 1) { circ(g, 6, -10, 3, c(0, 0, -20), 0); circ(g, 12, 0, 2.4, c(0, 0, -20), 0); circ(g, -2, -2, 2.4, c(0, 0, -20), 0); }
  } });
  def('seaweed', { w: 36, h: 106, zone: 'floor', hue: [110, 150], sat: 60, lit: 38, pat: [2, 4], draw: function (g, o, c) {
    var n = o.p, i, x;
    for (i = 0; i < n; i++) {
      x = (i - (n - 1) / 2) * 11; g.beginPath(); g.moveTo(x, 50);
      g.bezierCurveTo(x - 14, 25, x + 14, 5, x - 4, -14 - i * 6); g.bezierCurveTo(x + 6, -30 - i * 4, x - 6, -40 - i * 4, x, -50 + i * 4);
      g.lineWidth = 7; g.strokeStyle = c(0, 0, -6 + i * 5); g.lineCap = 'round'; g.stroke();
    }
  } });
  def('coral', { w: 74, h: 86, zone: 'floor', hue: [320, 360], sat: 75, lit: 60, pat: [2, 5], draw: function (g, o, c) {
    var n = o.p, i, y;
    rrect(g, -6, -10, 12, 54, 5, c());
    for (i = 0; i < n; i++) {
      y = 26 - i * (62 / n); var sd = i % 2 ? 1 : -1;
      g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(sd * 18, y - 4, sd * 24, y - 26); g.lineWidth = 11; g.strokeStyle = OL; g.lineCap = 'round'; g.stroke(); g.lineWidth = 8; g.strokeStyle = c(0, 0, i * 3); g.stroke();
    }
    circ(g, 0, -12, 8, c(0, 0, 6), 1.5);
  } });
  def('bubbles', { w: 38, h: 58, zone: 'water', hue: [190, 200], sat: 80, lit: 80, low: true, pat: [2, 4], draw: function (g, o, c) {
    var P = [[0, 18, 10], [8, -2, 8], [-4, -22, 6], [6, -34, 4]], i;
    for (i = 0; i < o.p; i++) { circ(g, P[i][0], P[i][1], P[i][2], 'rgba(255,255,255,.28)', 0); g.beginPath(); g.arc(P[i][0], P[i][1], P[i][2], 0, TAU); g.lineWidth = 2.6; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke(); g.beginPath(); g.arc(P[i][0], P[i][1], P[i][2] + 1.8, 0, TAU); g.lineWidth = 1.2; g.strokeStyle = 'rgba(20,60,110,.55)'; g.stroke(); circ(g, P[i][0] - P[i][2] * .35, P[i][1] - P[i][2] * .35, Math.max(2, P[i][2] * .3), '#fff', 0); }
  } });
  def('chest', { w: 74, h: 58, zone: 'floor', hue: [20, 30], sat: 55, lit: 40, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -32, -2, 64, 30, 3, c());
    if (o.v === 1) { glow(g, 0, -4, 34, 'rgba(255,224,102,.7)'); poly(g, [-30, -4, -26, -14, 26, -14, 30, -4], '#ffd23f', 1.5); circ(g, -10, -9, 3, '#fff2a8', 0); circ(g, 8, -11, 3, '#fff2a8', 0); poly(g, [-34, -4, -28, -24, 28, -24, 34, -4], c(0, 0, -10), 1.5); }
    else { g.beginPath(); g.moveTo(-32, -2); g.bezierCurveTo(-32, -26, 32, -26, 32, -2); g.closePath(); fs(g, c(0, 0, -6)); }
    var X = [-20, 20, 0];
    for (var i = 0; i < o.p; i++) rrect(g, X[i] - 2.5, -2, 5, 30, 0, '#c9a227', 0);
    rrect(g, -6, 4, 12, 13, 3, '#ffd23f', 1.5); circ(g, 0, 10, 2, '#5a3b00', 0);
  } });
  def('submarine', { w: 106, h: 58, zone: 'water', hue: [40, 52], sat: 92, lit: 56, asym: true, pat: [2, 5], draw: function (g, o, c) {
    var n = o.p, i;
    line(g, 6, -20, 6, -30, 3, '#555'); line(g, 6, -30, 16, -30, 3, '#555');
    rrect(g, -8, -24, 28, 14, 5, c(0, 0, -6));
    ell(g, 0, 4, 46, 19, c()); poly(g, [-44, 0, -52, -10, -52, 14], c(0, 0, -12)); rrect(g, -56, -4, 7, 16, 2, '#555', 1);
    for (i = 0; i < n; i++) circ(g, -26 + i * 13, 4, 4.6, '#bfe6ff', 2);
  } });

  /* ===== vũ trụ ===== */
  def('planet', { w: 88, h: 88, zone: 'any', hue: [0, 360], sat: 65, lit: 55, vmax: 2, pat: [1, 4], draw: function (g, o, c) {
    var gr = g.createRadialGradient(-10, -12, 4, 0, 0, 30), i;
    gr.addColorStop(0, c(0, 0, 18)); gr.addColorStop(1, c(0, 0, -16));
    var ring = o.v === 0;
    if (ring) { g.save(); g.rotate(-.4); g.beginPath(); g.ellipse(0, 0, 42, 11, 0, Math.PI, TAU); g.lineWidth = 5; g.strokeStyle = c(40, -10, 14); g.stroke(); g.restore(); }
    circ(g, 0, 0, 28, gr, 2);
    g.save(); g.beginPath(); g.arc(0, 0, 28, 0, TAU); g.clip(); g.fillStyle = c(30, 0, 18, .85);
    for (i = 0; i < o.p; i++) g.fillRect(-30, -20 + i * (40 / o.p) + 4, 60, 5);
    g.restore();
    if (ring) { g.save(); g.rotate(-.4); g.beginPath(); g.ellipse(0, 0, 42, 11, 0, 0, Math.PI); g.lineWidth = 5; g.strokeStyle = c(40, -10, 14); g.stroke(); g.restore(); }
    else { circ(g, 34, -26, 8, '#d7dbe5', 1.5); circ(g, 31, -28, 2.2, '#aeb4c4', 0); }
  } });
  def('rocket', { w: 50, h: 112, zone: 'any', hue: [0, 360], sat: 70, lit: 55, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    poly(g, [-10, 36, 0, 70, 10, 36], '#ffb02e', 1.5); poly(g, [-5, 36, 0, 56, 5, 36], '#fff2a8', 0);
    poly(g, [-16, 20, -30, 40, -16, 40], c(150, 0, -6)); poly(g, [16, 20, 30, 40, 16, 40], c(150, 0, -6));
    g.beginPath(); g.moveTo(0, -56); g.bezierCurveTo(20, -36, 18, 14, 14, 40); g.lineTo(-14, 40); g.bezierCurveTo(-18, 14, -20, -36, 0, -56); fs(g, '#f3f6fb');
    g.beginPath(); g.moveTo(0, -56); g.bezierCurveTo(10, -46, 15, -38, 16, -30); g.lineTo(-16, -30); g.bezierCurveTo(-15, -38, -10, -46, 0, -56); fs(g, c(), 1.5);
    for (var i = 0; i < o.p; i++) circ(g, 0, -16 + i * 15, 6, '#7ec8ff', 2);
    if (o.v === 1) rrect(g, -15, 26, 30, 7, 0, c(), 1);
  } });
  def('crescent', { w: 62, h: 62, zone: 'any', hue: [42, 52], sat: 90, lit: 70, asym: true, pat: [0, 3], draw: function (g, o, c) {
    glow(g, 0, 0, 36, c(0, 0, 10, .35));
    g.save(); g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.arc(12, -6, 22, 0, TAU, true); g.clip('evenodd'); g.fillStyle = c(); g.fillRect(-30, -30, 60, 60);
    var P = [[-17, 0, 4.6], [-9, 15, 4], [-14, -14, 3.8]];
    for (var i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], P[i][2], c(0, 0, -16), 0);
    g.restore();
    g.beginPath(); g.arc(0, 0, 26, Math.PI * .62, Math.PI * 1.55); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
  } });
  def('ufo', { w: 100, h: 60, zone: 'any', hue: [190, 330], sat: 20, lit: 78, vmax: 2, low: true, pat: [3, 6], draw: function (g, o, c) {
    var n = o.p, i;
    g.beginPath(); g.arc(0, -6, 17, Math.PI, 0); g.closePath(); fs(g, 'rgba(150,230,255,.85)');
    if (o.v === 1) { circ(g, 0, -12, 7, '#7be07a', 1.5); circ(g, -2.5, -13, 1.6, '#222', 0); circ(g, 2.5, -13, 1.6, '#222', 0); }
    ell(g, 0, 6, 46, 14, c(0, 0, 0)); ell(g, 0, 10, 40, 8, c(0, 0, -16), 0);
    for (i = 0; i < n; i++) circ(g, -32 + i * (64 / (n - 1)), 8, 3.6, i % 2 ? '#ffd23f' : '#ff6b6b', 1);
  } });
  def('satellite', { w: 100, h: 66, zone: 'any', hue: [40, 52], sat: 15, lit: 76, vmax: 2, low: true, pat: [2, 4], draw: function (g, o, c) {
    var i, n = o.p;
    rrect(g, -44, -10, 30, 20, 2, '#3a63c8'); rrect(g, 14, -10, 30, 20, 2, '#3a63c8');
    for (i = 1; i < n; i++) { line(g, -44 + i * 30 / n, -10, -44 + i * 30 / n, 10, 1.4, '#9cc0ff'); line(g, 14 + i * 30 / n, -10, 14 + i * 30 / n, 10, 1.4, '#9cc0ff'); }
    rrect(g, -14, -14, 28, 28, 4, c(), 2); rrect(g, -8, -8, 16, 16, 2, c(0, 0, -16), 1);
    if (o.v === 0) { arc(g, 0, -14, 14, Math.PI * 1.1, Math.PI * 1.9, 4, '#d7dbe5'); line(g, 0, -14, 0, -30, 2, '#d7dbe5'); circ(g, 0, -32, 3, '#ff6b6b', 0); }
    else { line(g, 0, -14, 0, -34, 2, '#d7dbe5'); circ(g, 0, -36, 3.5, '#ff6b6b', 0); line(g, -8, 14, -8, 26, 2, '#d7dbe5'); line(g, 8, 14, 8, 26, 2, '#d7dbe5'); }
  } });
  def('astronaut', { w: 56, h: 76, zone: 'any', hue: [10, 30], sat: 85, lit: 55, vmax: 2, asym: true, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -26, -4, 12, 24, 4, '#c9ced9'); rrect(g, -9, 30, 7, 22, 3, '#f3f6fb'); rrect(g, 2, 30, 7, 22, 3, '#f3f6fb');
    rrect(g, -17, -6, 30, 40, 7, '#f3f6fb'); rrect(g, -10, 4, 16, 14, 2, '#c9ced9', 1.4);
    for (var i = 0; i < o.p; i++) circ(g, -6 + i * 5.5, 11, 3, i % 2 ? '#3bd16f' : c(), 0);
    if (o.v === 1) { line(g, 12, 0, 24, -20, 8, '#f3f6fb'); } else line(g, 12, 2, 20, 22, 8, '#f3f6fb');
    line(g, -17, 2, -22, 20, 8, '#f3f6fb');
    circ(g, -2, -22, 19, '#f3f6fb'); ell(g, 1, -22, 12, 10, '#26344d', 1.5); ell(g, -3, -26, 4, 2.4, 'rgba(255,255,255,.7)', 0);
  } });
  def('alien', { w: 52, h: 68, zone: 'any', hue: [90, 150], sat: 65, lit: 55, pat: [1, 3], mood: true, draw: function (g, o, c) {
    var n = o.p, i;
    line(g, -8, -22, -14, -34, 2.4, c(0, 0, -16)); circ(g, -14, -36, 3.6, '#ff6bd8', 1); line(g, 8, -22, 14, -34, 2.4, c(0, 0, -16)); circ(g, 14, -36, 3.6, '#ff6bd8', 1);
    rrect(g, -12, 14, 8, 20, 4, c(0, 0, -10)); rrect(g, 4, 14, 8, 20, 4, c(0, 0, -10));
    ell(g, 0, 18, 15, 14, c(0, 0, -4)); ell(g, 0, -6, 21, 24, c());
    for (i = 0; i < n; i++) { var x = (i - (n - 1) / 2) * 13; circ(g, x, -8, 5.6, '#fff', 1.4); circ(g, x, -8, 2.6, '#222', 0); }
    mouth(g, o.m || 0, 0, 4, 13, '#2a4a2a');
    if (o.m === 2) { line(g, -10, -14, -4, -11, 2.2, '#2a4a2a'); line(g, 10, -14, 4, -11, 2.2, '#2a4a2a'); }
  } });

  /* ===== thành phố ===== */
  def('building', { w: 76, h: 160, zone: 'ground', hue: [0, 360], sat: 35, lit: 58, vmax: 2, pat: [5, 8], draw: function (g, o, c, r) {
    var cols = 3, rows = o.p, i, j, rh = 112 / rows, lit = [];
    for (i = 0; i < 24; i++) lit.push(r() > .45);
    if (o.v === 0) { line(g, 0, -80, 0, -58, 2.4, '#555'); circ(g, 0, -82, 3, '#ff5252', 0); }
    else { rrect(g, -14, -76, 28, 18, 3, '#8b6b4a'); poly(g, [-17, -76, 17, -76, 0, -86], '#5b4636', 1.2); }
    rrect(g, -34, -60, 68, 140, 3, c());
    rrect(g, -34, -60, 14, 140, 2, c(0, 0, -10), 0);
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) rrect(g, -22 + i * 20, -54 + j * rh, 13, Math.min(12, rh - 5), 1.5, lit[j * 3 + i] ? '#ffe9a0' : '#35455f', 1);
    rrect(g, -8, 58, 16, 22, 2, '#35455f', 1);
  } });
  def('car', { w: 104, h: 50, zone: 'ground', hue: [0, 360], sat: 75, lit: 52, vmax: 2, asym: true, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -46, -2, 92, 22, 7, c());
    g.beginPath(); g.moveTo(-26, -2); g.lineTo(-18, -20); g.lineTo(18, -20); g.lineTo(30, -2); g.closePath(); fs(g, c(0, 0, 6));
    var n = o.p, i, x0 = -21, x1 = 24, w = (x1 - x0) / n;
    for (i = 0; i < n; i++) { var a = x0 + i * w + 1.5, b = x0 + (i + 1) * w - 1.5; poly(g, [a, -4, i === 0 ? a + 6 : a, -17, i === n - 1 ? b - 8 : b, -17, b, -4], '#bfe6ff', 1.4); }
    circ(g, -28, 20, 9, '#2b2b36'); circ(g, -28, 20, 4, '#c9ced9', 0); circ(g, 28, 20, 9, '#2b2b36'); circ(g, 28, 20, 4, '#c9ced9', 0);
    rrect(g, 42, 4, 6, 5, 1, '#ffe27a', 1); rrect(g, -48, 4, 5, 5, 1, '#ff5252', 1);
    if (o.v === 1) { rrect(g, -8, -28, 16, 8, 2, '#ffd23f', 1.2); rrect(g, -46, 8, 92, 3, 0, '#fff', 0); }
  } });
  def('traffic', { w: 34, h: 100, zone: 'ground', hue: [0, 0], sat: 0, lit: 30, vmax: 3, draw: function (g, o, c) {
    rrect(g, -3, -10, 6, 66, 2, '#3b4252'); rrect(g, -10, 50, 20, 7, 2, '#3b4252');
    rrect(g, -12, -48, 24, 58, 6, '#2b2f3a');
    var cs = ['#ff3b3b', '#ffc933', '#3bd16f'], i;
    for (i = 0; i < 3; i++) { circ(g, 0, -36 + i * 18, 6.5, i === o.v ? cs[i] : 'rgba(255,255,255,.14)', 0); if (i === o.v) glow(g, 0, -36 + i * 18, 14, cs[i]); }
  } });

  /* ===== xứ tuyết ===== */
  def('snowman', { w: 66, h: 100, zone: 'ground', hue: [0, 360], sat: 75, lit: 52, vmax: 2, pat: [2, 4], mood: true, draw: function (g, o, c) {
    circ(g, 0, 28, 24, '#f7fbff'); circ(g, 0, -4, 18, '#f7fbff'); circ(g, 0, -32, 13, '#f7fbff');
    var Y = [-6, 4, 18, 30];
    for (var i = 0; i < o.p; i++) circ(g, 0, Y[i], 3.6, '#333', 0);
    circ(g, -4.5, -36, 1.8, '#222', 0); circ(g, 4.5, -36, 1.8, '#222', 0); poly(g, [0, -33, 14, -31, 0, -29], '#ff8a2e', 1);
    mouth(g, o.m || 0, 0, -26, 12, '#111');
    line(g, -16, -6, -34, -18, 3, '#7b4f2a'); line(g, 16, -6, 34, -14, 3, '#7b4f2a');
    rrect(g, -15, -22, 30, 7, 3, c(), 1.4); rrect(g, 7, -20, 7, 18, 2, c(), 1.4);
    if (o.v === 0) { rrect(g, -9, -62, 18, 18, 1, '#2b2f3a'); rrect(g, -14, -46, 28, 5, 2, '#2b2f3a'); }
    else { g.beginPath(); g.arc(0, -42, 12, Math.PI, 0); g.closePath(); fs(g, c(150, 0, 0)); circ(g, 0, -55, 3.5, '#fff', 1); }
  } });
  def('igloo', { w: 106, h: 74, zone: 'ground', hue: [200, 210], sat: 50, lit: 92, vmax: 2, low: true, pat: [2, 4], draw: function (g, o, c) {
    var i;
    g.beginPath(); g.arc(0, 18, 44, Math.PI, 0); g.closePath(); fs(g, c());
    g.save(); g.beginPath(); g.arc(0, 18, 44, Math.PI, 0); g.closePath(); g.clip();
    for (i = 0; i < o.p; i++) arc(g, 0, 18, 44 * (i + 1) / (o.p + 1), Math.PI, 0, 1.8, 'rgba(60,90,130,.5)');
    for (var j = -1; j <= 1; j++) line(g, j * 22, 18, j * 12, -26, 1.4, 'rgba(60,90,130,.4)');
    g.restore();
    rrect(g, -14, 0, 28, 24, 12, c(0, 0, -12)); g.beginPath(); g.arc(0, 18, 10, Math.PI, 0); g.lineTo(10, 24); g.lineTo(-10, 24); g.closePath(); g.fillStyle = '#26344d'; g.fill();
    if (o.v === 1) { line(g, 0, -26, 0, -42, 2, '#8b6b4a'); poly(g, [0, -42, 14, -37, 0, -32], '#ff5252', 1); }
  } });
  def('snowflake', { w: 52, h: 52, zone: 'sky', hue: [195, 215], sat: 85, lit: 56, pat: [1, 3], draw: function (g, o, c) {
    var i, k;
    for (i = 0; i < 6; i++) {
      g.save(); g.rotate(i * Math.PI / 3);
      line(g, 0, 0, 0, -23, 3, c());
      for (k = 0; k < o.p; k++) { var y = -8 - k * 6; line(g, 0, y, -6, y - 6, 2.4, c()); line(g, 0, y, 6, y - 6, 2.4, c()); }
      g.restore();
    }
    circ(g, 0, 0, 4, c(0, 0, 10), 0);
  } });
  def('gift', { w: 52, h: 52, zone: 'ground', hue: [0, 360], sat: 75, lit: 55, vmax: 2, pat: [2, 5], draw: function (g, o, c) {
    var i, box = function () { g.beginPath(); g.rect(-22, -14, 44, 36); };
    rrect(g, -22, -14, 44, 36, 3, c());
    if (o.v === 0) { var P = [[-13, -5], [13, -5], [-13, 13], [13, 13], [-13, 4]]; for (i = 0; i < o.p; i++) circ(g, P[i][0], P[i][1], 3.8, '#fff', 0); }
    else clipStripes(g, box, o.p, -22, 22, -14, 22, 4, c(0, 0, 18), true);
    rrect(g, -22, -22, 44, 10, 3, c(0, 0, -10), 1.5);
    rrect(g, -4, -22, 8, 44, 0, '#ffd23f', 1); ell(g, -8, -26, 8, 5, '#ffd23f', 1.4, -.4); ell(g, 8, -26, 8, 5, '#ffd23f', 1.4, .4); circ(g, 0, -24, 3.4, '#ffbf00', 1);
  } });
  def('cabin', { w: 114, h: 104, zone: 'ground', hue: [20, 32], sat: 55, lit: 42, vmax: 2, asym: true, pat: [3, 6], draw: function (g, o, c) {
    var i;
    rrect(g, 20, -40, 14, 30, 2, '#9c5a43'); rrect(g, 17, -44, 20, 8, 3, '#f7fbff', 1.2);
    for (i = 0; i < 3; i++) circ(g, 28 + i * 6, -52 - i * 10, 5 + i * 1.6, 'rgba(255,255,255,.6)', 0);
    rrect(g, -40, 0, 80, 50, 2, c());
    for (i = 1; i <= o.p; i++) line(g, -40, i * 50 / (o.p + 1), 40, i * 50 / (o.p + 1), 1.8, 'rgba(0,0,0,.3)');
    poly(g, [-54, 4, 0, -44, 54, 4], '#7b4f2a'); poly(g, [-54, 4, 0, -44, 54, 4], 'rgba(0,0,0,0)', 2);
    poly(g, [-50, 2, 0, -40, 50, 2, 46, 8, 0, -30, -46, 8], '#f7fbff', 1.4);
    rrect(g, -8, 22, 16, 28, 3, '#5b3a22', 1.5);
    if (o.v === 0) { rrect(g, -34, 14, 18, 16, 2, '#ffd86b', 1.5); glow(g, -25, 22, 26, 'rgba(255,220,100,.4)'); }
    else rrect(g, -34, 14, 14, 14, 2, '#9ec9ff', 1.5);
  } });

  /* ===== sa mạc ===== */
  def('cactus', { w: 58, h: 108, zone: 'ground', hue: [130, 150], sat: 45, lit: 40, vmax: 3, asym: true, pat: [1, 3], draw: function (g, o, c) {
    var arm = function (sd, y) { g.beginPath(); g.moveTo(sd * 8, y); g.lineTo(sd * 22, y); g.lineTo(sd * 22, y - 22); g.lineWidth = 12; g.strokeStyle = OL; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); g.lineWidth = 9; g.strokeStyle = c(); g.stroke(); };
    if (o.v === 0 || o.v === 1) arm(-1, 10); if (o.v === 0 || o.v === 2) arm(1, 22);
    rrect(g, -11, -50, 22, 104, 11, c());
    for (var i = 0; i < o.p; i++) { var x = (i - (o.p - 1) / 2) * 6; line(g, x, -42, x, 44, 1.8, c(0, 0, 14)); }
    if (o.v === 1) { circ(g, 0, -52, 6, '#ff6fa5', 1.5); circ(g, 0, -52, 2, '#ffd23f', 0); }
  } });
  def('pyramid', { w: 118, h: 86, zone: 'ground', hue: [36, 42], sat: 70, lit: 62, vmax: 2, pat: [2, 5], draw: function (g, o, c) {
    poly(g, [-54, 40, 0, -40, 54, 40], c()); poly(g, [0, -40, 54, 40, 10, 40], c(0, 0, -14), 0); poly(g, [-54, 40, 0, -40, 54, 40], 'rgba(0,0,0,0)', 2);
    for (var i = 1; i <= o.p; i++) { var y = 40 - i * 80 / (o.p + 1), hw = 54 * (y + 40) / 80; line(g, -hw + 2, y, hw - 2, y, 1.8, 'rgba(0,0,0,.28)'); }
    if (o.v === 1) rrect(g, -7, 22, 14, 18, 2, '#3b2a1a', 1.2);
  } });
  def('tent', { w: 106, h: 74, zone: 'ground', hue: [0, 360], sat: 60, lit: 55, vmax: 2, asym: true, pat: [0, 4], draw: function (g, o, c) {
    var tri = function () { g.beginPath(); g.moveTo(-50, 30); g.lineTo(-4, -32); g.lineTo(50, 30); g.closePath(); };
    tri(); fs(g, c(), 0);
    clipStripes(g, tri, o.p, -50, 50, -32, 30, 5, c(150, 0, 14), true);
    poly(g, [-4, -32, 50, 30, 20, 30], 'rgba(0,0,0,.14)', 0);
    tri(); g.lineWidth = 2; g.strokeStyle = OL; g.stroke();
    poly(g, [-14, 30, -4, 0, 8, 30], '#3b2a1a', 1.4);
    if (o.v === 0) { line(g, -4, -32, -4, -44, 2, '#8b6b4a'); poly(g, [-4, -44, 12, -40, -4, -36], '#ffd23f', 1); }
  } });

  /* ===== lâu đài ===== */
  def('castle', { w: 154, h: 150, zone: 'ground', hue: [215, 225], sat: 14, lit: 78, vmax: 2, low: true, pat: [2, 4], draw: function (g, o, c) {
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
    poly(g, [-54, -66, -40, -61, -54, -56], '#ff5252', 1); if (o.v === 0) poly(g, [54, -66, 68, -61, 54, -56], '#ff5252', 1);
    g.beginPath(); g.moveTo(-14, 64); g.lineTo(-14, 36); g.arc(0, 36, 14, Math.PI, 0); g.lineTo(14, 64); g.closePath(); fs(g, c(30, 40, -34), 1.6);
    for (i = -1; i <= 1; i++) line(g, i * 7, 28, i * 7, 64, 1.4, 'rgba(0,0,0,.35)');
    for (i = 0; i < o.p; i++) rrect(g, -30 + i * (60 - 8) / (o.p - 1), -18, 8, 14, 4, '#26344d', 1.2);
    rrect(g, -58, 8, 8, 12, 4, '#26344d', 1.2); rrect(g, 50, 8, 8, 12, 4, '#26344d', 1.2);
  } });
  def('tower', { w: 64, h: 150, zone: 'ground', hue: [215, 225], sat: 14, lit: 76, low: true, pat: [1, 4], draw: function (g, o, c) {
    var i, n = o.p;
    rrect(g, -16, -40, 32, 108, 2, c()); rrect(g, -16, -40, 9, 108, 2, c(0, 0, -8), 0);
    poly(g, [-24, -40, 0, -84, 24, -40], c(0, 55, -24)); line(g, 0, -84, 0, -100, 2, '#5b4636'); poly(g, [0, -100, 14, -95, 0, -90], '#ff5252', 1);
    for (i = 0; i < n; i++) rrect(g, -4.5, -32 + i * 20, 9, 13, 4.5, '#26344d', 1.2);
    rrect(g, -7, 50, 14, 18, 7, '#7a4a2a', 1.4);
  } });
  def('flag', { w: 40, h: 70, zone: 'ground', hue: [0, 360], sat: 75, lit: 52, vmax: 2, asym: true, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -2, -32, 4, 66, 2, '#6b4a2b'); circ(g, 0, -33, 3.5, '#ffd23f', 1);
    var ban = function () { g.beginPath(); g.moveTo(2, -28); g.lineTo(32, -28); g.lineTo(26, -17); g.lineTo(32, -6); g.lineTo(2, -6); g.closePath(); };
    ban(); fs(g, c());
    clipStripes(g, ban, o.p, 2, 32, -28, -6, 3, '#fff', false);
    if (o.v === 1) { g.save(); g.translate(13, -17); star(g, 5, 5.5, 2.4, '#ffd23f', 0); g.restore(); }
  } });
  def('crown', { w: 56, h: 44, zone: 'any', hue: [42, 50], sat: 92, lit: 55, pat: [3, 5], draw: function (g, o, c) {
    var n = o.p, i, pts = [-24, 12, -24, -18];
    for (i = 0; i < n; i++) { pts.push(-24 + (i + .5) * (48 / n), -2); pts.push(-24 + (i + 1) * (48 / n), -18); }
    pts.push(24, 12); poly(g, pts, c(), 2);
    rrect(g, -24, 8, 48, 8, 2, c(0, 0, -8), 1.6);
    for (i = 0; i <= n; i++) circ(g, -24 + i * (48 / n), -18, 3, ['#ff5252', '#52a7ff', '#7be07a'][i % 3], 1);
  } });

  /* ===== tiệc ngọt ===== */
  def('cupcake', { w: 52, h: 64, zone: 'any', hue: [0, 360], sat: 80, lit: 70, vmax: 2, pat: [2, 4], draw: function (g, o, c) {
    poly(g, [-18, 0, 18, 0, 13, 28, -13, 28], '#e9b872', 1.8); for (var i = -1; i <= 1; i++) line(g, i * 8, 2, i * 6, 26, 1.4, 'rgba(0,0,0,.2)');
    var L = [];
    for (i = 0; i < o.p; i++) { var t = i / Math.max(1, o.p - 1); L.push([0, -4 - i * (20 / Math.max(1, o.p - 1)) * (o.p > 1 ? 1 : 0), 22 - t * 11, 8]); }
    blob(g, L, c());
    for (i = 1; i < o.p; i++) arc(g, 0, L[i][1] + 4, L[i][2] - 2, .2, Math.PI - .2, 1.6, c(0, 0, -14));
    var top = L[L.length - 1][1] - 8;
    if (o.v === 0) circ(g, 0, top - 3, 5, '#e5392e', 1.5);
  } });
  def('icecream', { w: 46, h: 106, zone: 'any', hue: [0, 360], sat: 75, lit: 72, pat: [1, 3], draw: function (g, o, c) {
    var n = o.p, i;
    g.translate(0, 13);
    poly(g, [-14, 0, 14, 0, 0, 40], '#e6b26a', 1.8); for (i = 0; i < 3; i++) line(g, -12 + i * 6, 2 + i * 2, 12 - i * 6, 2 + i * 2, 1.2, 'rgba(0,0,0,.25)');
    for (i = 0; i < n; i++) { blob(g, [[0, -4 - i * 20, 17]], c(i * 55, 0, 0)); circ(g, -6, -9 - i * 20, 4, 'rgba(255,255,255,.4)', 0); }
    circ(g, 0, -4 - (n - 1) * 20 - 18, 4.6, '#e5392e', 1.4);
  } });
  def('lollipop', { w: 52, h: 88, zone: 'any', hue: [0, 360], sat: 85, lit: 62, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    rrect(g, -2.5, 4, 5, 38, 2, '#f3f6fb', 1.4);
    circ(g, 0, -20, 24, c());
    var i;
    if (o.v === 0) for (i = 0; i < o.p; i++) arc(g, 0, -20, 19 - i * 6, 0, TAU, 3.4, c(150, 0, 14));
    else for (i = 0; i < o.p * 2; i++) { g.beginPath(); g.moveTo(0, -20); g.arc(0, -20, 22, i * TAU / (o.p * 2), (i + .45) * TAU / (o.p * 2)); g.closePath(); if (i % 2 === 0) { g.fillStyle = c(150, 0, 14); g.fill(); } }
    circ(g, 0, -20, 24, 'rgba(0,0,0,0)', 1.8); circ(g, -9, -30, 5, 'rgba(255,255,255,.45)', 0);
  } });
  def('donut', { w: 62, h: 62, zone: 'any', hue: [0, 360], sat: 80, lit: 70, pat: [3, 8], draw: function (g, o, c, r) {
    var i, P;
    circ(g, 0, 0, 27, '#e0a35e', 1.8); circ(g, 0, 0, 21, c(), 1.4);
    P = spots(r, o.p, -19, -19, 19, 19, 9, function (x, y) { var d = Math.sqrt(x * x + y * y); return d > 12 && d < 17; });
    for (i = 0; i < P.length; i++) { var a = Math.atan2(P[i][1], P[i][0]) + 1.2; line(g, P[i][0] - Math.cos(a) * 5, P[i][1] - Math.sin(a) * 5, P[i][0] + Math.cos(a) * 5, P[i][1] + Math.sin(a) * 5, 4.6, ['#ffd23f', '#52a7ff', '#fff', '#7be07a'][i % 4]); }
    circ(g, 0, 0, 8, '#f6efe0', 1.6);
  } });
  def('candy', { w: 66, h: 40, zone: 'any', hue: [0, 360], sat: 85, lit: 60, pat: [2, 5], draw: function (g, o, c) {
    poly(g, [-18, 0, -34, -13, -34, 13], c(150, 0, 12), 1.6); poly(g, [18, 0, 34, -13, 34, 13], c(150, 0, 12), 1.6);
    ell(g, 0, 0, 22, 14, c(), 2);
    var body = function () { g.beginPath(); g.ellipse(0, 0, 22, 14, 0, 0, TAU); };
    clipStripes(g, body, o.p, -22, 22, -14, 14, 3.6, c(150, 0, 18), true);
  } });
  def('cookie', { w: 56, h: 56, zone: 'any', hue: [28, 36], sat: 60, lit: 60, vmax: 2, pat: [3, 7], draw: function (g, o, c, r) {
    circ(g, 0, 0, 24, c());
    var P = spots(r, o.p, -18, -18, 18, 18, 11, function (x, y) { return x * x + y * y < 300 && !(o.v === 1 && x > 8 && y < -4); }), i;
    for (i = 0; i < P.length; i++) circ(g, P[i][0], P[i][1], 5, '#4a2c1a', 0);
    if (o.v === 1) circ(g, 22, -14, 9, '#f6efe0', 0);
    circ(g, -9, -12, 6, 'rgba(255,255,255,.2)', 0);
  } });
  def('cake', { w: 64, h: 56, zone: 'any', hue: [330, 355], sat: 70, lit: 78, vmax: 2, pat: [1, 3], draw: function (g, o, c) {
    poly(g, [-28, 20, -28, -4, 28, -20, 28, 20], '#f3dcae', 1.8);
    for (var i = 0; i < o.p; i++) { var y = 16 - (i + 1) * 24 / (o.p + 1); poly(g, [-28, y + 2, 28, y - 10 + 2, 28, y - 10 + 6, -28, y + 6], c(0, 0, -14), 0); }
    poly(g, [-28, -4, 28, -20, 28, -12, -28, 4], c(), 1.6);
    if (o.v === 0) circ(g, 12, -22, 5, '#e5392e', 1.4);
  } });

  /* ---------- phông nền chủ đề ---------- */
  /* bầu trời theo màu thật: trong xanh, nắng vàng cuối chiều, chạng vạng, sương sớm, u ám... */
  var SKIES = [
    ['#3f8fd8', '#8ec3ee', '#dcecf7'], ['#6d8fc4', '#f2b58a', '#fbe3c0'], ['#2b3a67', '#b0647a', '#f5b877'], ['#1f2a56', '#5b5a94', '#e7a6a1'],
    ['#5aa7c9', '#a9d5e2', '#e6f2ee'], ['#7fa6d6', '#e8b9c8', '#fbe6dc'], ['#8794a3', '#b4bfca', '#dde3e8'], ['#5f7fd0', '#a9bdea', '#e6ecf8'],
    ['#4a9bd6', '#a5d3ee', '#eef7f4'], ['#5b9fe0', '#b7d9f0', '#fbf1d8']
  ];
  function vgrad(g, y0, y1, stops) {
    var gr = g.createLinearGradient(0, y0, 0, y1), i;
    for (i = 0; i < stops.length; i++) gr.addColorStop(stops[i][0], stops[i][1]);
    g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0);
  }
  /* một đốm mềm (tâm đậm, rìa tan) — dùng dựng mây, sương, quầng sáng */
  function puff(g, x, y, rx, ry, col, a) {
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    var gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill();
    g.restore();
  }
  function skyFill(g, m, y1) {
    var s = SKIES[m % 10], r = mulberry32(m * 977 + 131), i, k, dark = m % 10 === 2 || m % 10 === 3;
    vgrad(g, 0, y1, [[0, s[0]], [.55, s[1]], [1, s[2]]]);
    g.save(); g.beginPath(); g.rect(0, 0, W, y1); g.clip();
    /* quầng mặt trời thấp gần chân trời */
    var sx = W * (.18 + r() * .64), sy = y1 * (dark ? .92 : .2 + r() * .3);
    puff(g, sx, sy, 300, 300, dark ? 'rgba(255,190,120,.9)' : 'rgba(255,250,225,.9)', .55);
    puff(g, sx, sy, 90, 90, 'rgba(255,255,245,1)', dark ? .35 : .5);
    /* mây mỏng trải ngang, nhạt dần về chân trời */
    var n = 3 + Math.floor(r() * 3);
    for (i = 0; i < n; i++) {
      var cx = r() * W, cy = y1 * (.12 + r() * .6), w = 120 + r() * 200, h = 10 + r() * 16;
      for (k = 0; k < 14; k++) {
        var px = cx + (r() - .5) * w * 2, py = cy + (r() - .5) * h * 1.6, pr = w * (.18 + r() * .3);
        puff(g, px, py + h * .35, pr, pr * .2, dark ? 'rgba(70,60,95,1)' : 'rgba(150,165,185,1)', .1);
        puff(g, px, py, pr, pr * .22, dark ? 'rgba(255,205,170,1)' : 'rgba(255,255,255,1)', .2 + r() * .14);
      }
    }
    /* lớp mù sát chân trời */
    var hz = g.createLinearGradient(0, y1 - 90, 0, y1);
    hz.addColorStop(0, 'rgba(255,255,255,0)'); hz.addColorStop(1, 'rgba(255,255,255,.4)');
    g.fillStyle = hz; g.fillRect(0, y1 - 90, W, 90);
    g.restore();
  }
  /* dãy đồi: đường gờ nhiều nhịp nhỏ, phía chân đồi sáng và nhạt dần như có lớp không khí */
  function hills(g, r, y, amp, col, freq) {
    var ph = [r() * 6, r() * 6, r() * 6], x, yy, top = y - amp * 1.3;
    g.beginPath(); g.moveTo(0, H);
    for (x = 0; x <= W; x += 4) {
      yy = y - amp * (Math.sin(x * freq + ph[0]) * .5 + Math.sin(x * freq * 2.3 + ph[1]) * .3 + Math.sin(x * freq * .6 + ph[2]) * .4)
         - amp * .07 * (Math.sin(x * freq * 9.1 + ph[1] * 3) + Math.sin(x * freq * 17.3 + ph[0] * 5) * .6);
      g.lineTo(x, yy);
    }
    g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.fill();
    g.save(); g.clip();
    var gr = g.createLinearGradient(0, top, 0, y + amp * 2.2);
    gr.addColorStop(0, 'rgba(20,30,50,.16)'); gr.addColorStop(.35, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.38)');
    g.fillStyle = gr; g.fillRect(0, top, W, amp * 4);
    g.restore();
  }
  /* cỏ: rất nhiều lá mảnh, xa thì nhỏ và nhạt, gần thì to và đậm, pha vài lá úa */
  function tufts(g, r, y0, n, col) {
    var i, k, x, y, d, sc, N = n * 26;
    g.save(); g.lineCap = 'round';
    for (i = 0; i < N; i++) {
      d = r(); d = d * d * .35 + d * .65; y = y0 + d * (H - y0 - 2); x = r() * W; sc = .35 + d * 1.25;
      k = r();
      g.strokeStyle = k < .14 ? 'rgba(210,200,120,.5)' : k < .5 ? 'rgba(255,255,255,.13)' : col;
      g.globalAlpha = k < .5 ? 1 : .28 + r() * .3;
      g.lineWidth = .7 + sc * .7;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (r() - .5) * 3 * sc, y - 4 * sc, x + (r() - .5) * 7 * sc, y - (5 + r() * 6) * sc); g.stroke();
    }
    g.restore();
  }
  function sparkle(g, r, n, y0, y1, col) {
    var i; g.fillStyle = col;
    for (i = 0; i < n; i++) { g.beginPath(); g.arc(r() * W, y0 + r() * (y1 - y0), .8 + r() * 1.6, 0, TAU); g.fill(); }
  }

  var BG = {};
  /* các phông nền nằm ở timkhacbiet-bg.js */

  /* Lớp "ảnh chụp" phủ lên mọi phông: loang sáng tối tự nhiên của bề mặt, hạt nhiễu mịn, ánh sáng xiên từ một phía,
     giảm bớt màu rực và tối dần bốn góc. Mọi thứ đều tất định theo hạt giống nên ảnh A và ảnh B giống hệt nhau. */
  var TEX = {};
  function noiseTile(seed, n, soft) {
    var key = seed + ':' + n + ':' + soft;
    if (TEX[key]) return TEX[key];
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas'), r = mulberry32(seed), x, i, v, d;
    c.width = c.height = n;
    var q = c.getContext('2d'), im = q.createImageData(n, n); d = im.data;
    for (i = 0; i < n * n; i++) { v = soft ? 128 + (r() + r() + r() - 1.5) * 150 : r() * 255; x = i * 4; d[x] = d[x + 1] = d[x + 2] = v < 0 ? 0 : v > 255 ? 255 : v; d[x + 3] = 255; }
    q.putImageData(im, 0, 0);
    var keys = Object.keys(TEX); if (keys.length > 8) delete TEX[keys[0]];
    return (TEX[key] = c);
  }
  function photoPass(g, seed) {
    var big = noiseTile(seed, 14, 1), mid = noiseTile(seed ^ 0x51ed, 56, 1), fine = noiseTile(seed ^ 0x9e37, 256, 0), gr, r = mulberry32(seed ^ 0x77f1);
    if (!big) return;
    g.save();
    /* bớt rực */
    g.globalCompositeOperation = 'saturation'; g.globalAlpha = .14; g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
    /* loang sáng tối: mảng lớn + mảng vừa (ảnh nhỏ phóng to, trình duyệt tự làm mềm) */
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = .16; g.drawImage(big, 1, 1, 12, 12, 0, 0, W, H);
    g.globalAlpha = .06; g.drawImage(mid, 1, 1, 54, 54, 0, 0, W, H);
    /* hạt mịn như hạt phim */
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = .09;
    g.fillStyle = g.createPattern(fine, 'repeat'); g.save(); g.scale(.5, .5); g.fillRect(0, 0, W * 2, H * 2); g.restore();
    /* ánh sáng xiên: ấm ở phía nguồn sáng, mát và tối ở phía đối diện */
    var lx = r() < .5 ? 0 : W;
    gr = g.createRadialGradient(lx, -40, 40, lx, -40, 980);
    gr.addColorStop(0, 'rgba(255,240,205,.5)'); gr.addColorStop(.5, 'rgba(255,240,205,0)'); gr.addColorStop(1, 'rgba(20,30,70,.3)');
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, W, H);
    /* tối dần bốn góc */
    gr = g.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 560);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,8,20,.22)');
    g.globalCompositeOperation = 'source-over'; g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.restore();
  }
  function drawBackground(g, theme, mood, seed) {
    var r = mulberry32((seed | 0) ^ 0x5bd1e995);
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    BG[theme](g, mood, r);
    g.restore();
    photoPass(g, (seed | 0) ^ 0x3c6ef372);
  }

  /* ---------- vẽ một vật thể ---------- */
  /* Mỗi vật được vẽ riêng ra một canvas phụ rồi mới dán vào tranh, kèm bóng đổ mềm phía dưới
     (vật nổi khối, tách khỏi phông). Không có canvas phụ (vd. chạy trong Node) thì vẽ thẳng như cũ. */
  var OFF = null, OG = null;
  function drawRaw(g, o) {
    var t = T[o.t];
    g.translate(o.x, o.y);
    if (o.r) g.rotate(o.r);
    g.scale(o.s * (o.f || 1) * (o.sx || 1), o.s);
    var c = function (dh, ds, dl, a) { return hsl(o.h + (dh || 0), o.sat + (ds || 0), o.l + (dl || 0), a); };
    t.draw(g, o, c, mulberry32(o.k | 0));
  }
  function drawObject(g, o) {
    var t = T[o.t], m = g.getTransform && g.getTransform();
    if (!OFF && typeof document !== 'undefined') { OFF = document.createElement('canvas'); OG = OFF.getContext('2d'); }
    if (!OFF || !m) { g.save(); drawRaw(g, o); g.restore(); return; }
    /* khung bao của vật trên điểm ảnh thật (đủ rộng cho viền, ánh sáng, xoay, kéo giãn) */
    var e = t.ext || [-t.w / 2, -t.h / 2, t.w / 2, t.h / 2];
    var R = Math.max(Math.abs(e[0]), Math.abs(e[2]), Math.abs(e[1]), Math.abs(e[3])) * o.s * Math.max(1, o.sx || 1) * 1.08 + 6;
    var ds = Math.sqrt(m.a * m.a + m.b * m.b) || 1;
    var cx = m.a * o.x + m.c * o.y + m.e, cy = m.b * o.x + m.d * o.y + m.f, rp = Math.ceil(R * ds);
    var bx = Math.floor(cx - rp), by = Math.floor(cy - rp), bw = rp * 2 + 2, bh = rp * 2 + 2;
    if (OFF.width < bw || OFF.height < bh) { OFF.width = Math.max(OFF.width, bw); OFF.height = Math.max(OFF.height, bh); }
    OG.setTransform(1, 0, 0, 1, 0, 0); OG.clearRect(0, 0, bw, bh);
    OG.setTransform(m.a, m.b, m.c, m.d, m.e - bx, m.f - by);
    OG.save(); drawRaw(OG, o); OG.restore();
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.shadowColor = 'rgba(24,12,36,.3)'; g.shadowBlur = 5 * ds * Math.min(1.4, o.s + .2); g.shadowOffsetY = 3 * ds * Math.min(1.4, o.s + .2);
    g.drawImage(OFF, 0, 0, bw, bh, bx, by, bw, bh);
    g.restore();
  }

  /* Gắn số đo thật (timkhacbiet-meta.js) vào từng loại vật: e = khung bao [x0,y0,x1,y1] gồm cả viền và ánh sáng;
     a = diện tích; f[v] = điểm ảnh đổi khi lật; v[a][b] = khi đổi kiểu dáng; p[i] = khi hoạ tiết đổi từ pat[0]+i sang pat[0]+i+1;
     c / c2 = khi đổi màu 30° / 14°; t = khi nghiêng ~11°; x = khi kéo giãn ngang 1,2 lần; d = khi đổi độ sáng ±10.
     Gọi lại được nhiều lần (sau khi nạp thêm loại vật mới). */
  function finalize() {
    var META = root.TKBArt.META || {};
    Object.keys(T).forEach(function (n) {
      var m = META[n] || {}, t = T[n];
      t.ext = m.e ? m.e.slice() : [-t.w / 2, -t.h / 2, t.w / 2, t.h / 2];
      t.area = m.a || t.w * t.h * .4; t.flipPx = m.f || []; t.varPx = m.v || []; t.patPx = m.p || [];
      t.colorPx = m.c == null ? 1e9 : m.c; t.colorPx2 = m.c2 == null ? 1e9 : m.c2;
      t.tiltPx = m.t == null ? 1e9 : m.t; t.stretchPx = m.x == null ? 1e9 : m.x; t.shadePx = m.d == null ? 1e9 : m.d;
      t.moodPx = m.mo || 0; t.moodOn = t.moodOn || function () { return true; };
    });
    /* vật trong suốt/nhạt: đổi màu hay độ sáng gần như không thấy → không dùng */
    /* vài kiểu khác biệt của vài vật quá mờ trong tranh thật (đo kiểm bằng so điểm ảnh) → không dùng */
    if (T.reeds) T.reeds.stretchPx = 0;
    if (T.log) T.log.patPx = [0, 0, 0];
    if (T.eagle) T.eagle.patPx = [0, 0, 0];
    ['bubbles', 'bowlingpin'].forEach(function (n) { if (T[n]) { T[n].colorPx = 0; T[n].colorPx2 = 0; T[n].shadePx = 0; } });
    /* công trình/vật đứng không nghiêng được (nghiêng trông như bị đổ) */
    ['tree', 'pine', 'spine', 'house', 'cabin', 'fence', 'windmill', 'lamp', 'palm', 'lighthouse', 'building', 'traffic', 'cactus', 'pyramid',
     'castle', 'tower', 'igloo', 'umbrella', 'flag', 'seaweed', 'coral', 'barn', 'signpost', 'roadsign', 'reeds', 'bridge', 'scarecrow',
     'sunflower', 'tulip', 'birdhouse', 'hydrant', 'houseboat', 'bus', 'truck',
     'doghouse', 'scratchpost', 'keyboard', 'speaker', 'parrot', 'mic', 'globe', 'birdcage', 'bowlingpin'].forEach(function (n) { if (T[n]) T[n].notilt = true; });
  }

  root.TKBArt = {
    W: W, H: H, TYPES: T, BG: BG, META: (root.TKBArt && root.TKBArt.META) || {}, def: def, drawObject: drawObject,
    drawPlain: function (g, o) { g.save(); drawRaw(g, o); g.restore(); }, drawBackground: drawBackground,
    finalize: finalize, mulberry32: mulberry32, hsl: hsl,
    lib: { mouth: mouth, sb: sb, eye2: eye2, blush: blush, TAU: TAU, OL: OL, fs: fs, circ: circ, ell: ell, poly: poly, rrect: rrect, line: line, arc: arc, blob: blob, star: star, glow: glow,
           spots: spots, inEll: inEll, clipStripes: clipStripes, hsl: hsl, vgrad: vgrad, puff: puff, skyFill: skyFill, hills: hills, tufts: tufts, sparkle: sparkle, SKIES: SKIES }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.TKBArt;
})(typeof window !== 'undefined' ? window : globalThis);
