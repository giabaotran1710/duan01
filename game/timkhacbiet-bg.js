/* Tìm điểm khác biệt — phông nền 27 chủ đề, vẽ theo hướng tả thực: trời có mây và nắng, núi có sườn sáng sườn tối, rừng nhiều lớp
   mờ dần theo không khí, mặt nước có gợn và lấp lánh, cát/đất/cỏ có hạt, phòng có nắng hắt qua cửa sổ và bóng ở chân tường.
   Giữ nguyên các mốc toạ độ của bản cũ (chân trời, mép kệ, mép sàn) vì vị trí đặt vật trong timkhacbiet-levels.js dựa vào đó.
   Mọi chi tiết ngẫu nhiên lấy từ r (theo hạt giống của tranh) nên ảnh A và ảnh B luôn giống hệt nhau.
   Lớp "ảnh chụp" phủ chung (hạt, loang sáng, tối góc) nằm ở drawBackground trong timkhacbiet-art.js. */
(function (root) {
  'use strict';
  var A = root.TKBArt, L = A.lib, BG = A.BG;
  var TAU = L.TAU, W = A.W, H = A.H, hsl = L.hsl, vgrad = L.vgrad, skyFill = L.skyFill, hills = L.hills, tufts = L.tufts, puff = L.puff, SKIES = L.SKIES;

  /* ---------- bộ đồ nghề ---------- */
  function rectG(g, x, y, w, h, c0, c1, horiz) {
    var gr = horiz ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, c0); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  /* đường gờ gãy khúc (chia đôi trung điểm): mảng 129 độ cao 0..1 */
  function ridge(r, rough) {
    var n = 128, h = new Array(n + 1), step = n, amp = 1, i, lo = 1e9, hi = -1e9;
    h[0] = r(); h[n] = r();
    while (step > 1) {
      for (i = step / 2; i < n; i += step) h[i] = (h[i - step / 2] + h[i + step / 2]) / 2 + (r() - .5) * amp;
      step /= 2; amp *= rough;
    }
    for (i = 0; i <= n; i++) { if (h[i] < lo) lo = h[i]; if (h[i] > hi) hi = h[i]; }
    for (i = 0; i <= n; i++) h[i] = (h[i] - lo) / (hi - lo || 1);
    return h;
  }
  /* dãy núi đá: sườn đón nắng sáng, sườn khuất tối, chân núi chìm trong mù; snow = tỉ lệ phần đỉnh phủ tuyết (0 = không) */
  function mountains(g, r, yBase, hgt, col, snow, haze) {
    var h = ridge(r, .56), n = 128, i, x, y, dx = W / n, Y = [];
    for (i = 0; i <= n; i++) Y.push(yBase - hgt * (.18 + .82 * h[i]));
    var path = function () { g.beginPath(); g.moveTo(0, yBase + 4); for (i = 0; i <= n; i++) g.lineTo(i * dx, Y[i]); g.lineTo(W, yBase + 4); g.closePath(); };
    path(); g.fillStyle = col; g.fill();
    g.save(); path(); g.clip();
    if (snow) {
      var ys = yBase - hgt * (1 - snow);
      g.fillStyle = 'rgba(250,252,255,.94)'; g.beginPath(); g.moveTo(0, yBase - hgt - 10);
      for (i = 0; i <= n; i++) g.lineTo(i * dx, ys + (h[(i * 7) % n] - .5) * hgt * .22 + (i % 2) * 5);
      g.lineTo(W, yBase - hgt - 10); g.closePath(); g.fill();
    }
    /* mỗi đỉnh hắt một mảng tối xuống sườn bên phải */
    for (i = 2; i < n - 1; i++) if (Y[i] < Y[i - 1] && Y[i] <= Y[i + 1] && Y[i] < Y[i - 2]) {
      var k = i; g.beginPath(); g.moveTo(i * dx, Y[i]);
      while (k < n && (Y[k + 1] > Y[k] - 1 || k - i < 3) && k - i < 18) { k++; g.lineTo(k * dx, Y[k]); }
      g.lineTo(k * dx + (yBase - Y[k]) * .9 + 10, yBase + 4); g.lineTo(i * dx + (yBase - Y[i]) * (.25 + r() * .3), yBase + 4); g.closePath();
      g.fillStyle = 'rgba(22,28,54,' + (.16 + r() * .12).toFixed(2) + ')'; g.fill();
    }
    /* khe đá, vệt xước */
    g.strokeStyle = 'rgba(20,25,50,.1)'; g.lineWidth = 1;
    for (i = 0; i < 70; i++) { x = r() * W; y = yBase - r() * hgt * .8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 + r() * 14, y + 10 + r() * 26); g.stroke(); }
    var gr = g.createLinearGradient(0, yBase - hgt * .6, 0, yBase + 4);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, haze || 'rgba(235,240,248,.55)');
    g.fillStyle = gr; g.fillRect(0, yBase - hgt, W, hgt + 4);
    g.restore();
  }
  /* rìa rừng: rất nhiều ngọn cây cao thấp chen nhau; conifer = cây lá kim (nhọn) hay tán tròn */
  function treeline(g, r, y, hgt, col, conifer, haze) {
    var x = -10, w, t, i;
    g.fillStyle = col;
    g.beginPath(); g.moveTo(0, y + 2);
    while (x < W + 10) {
      w = conifer ? Math.max(9, hgt * .2) * (1 + r() * .9) : Math.max(16, hgt * .5) * (1 + r()); t = hgt * (.45 + r() * .55);
      if (conifer) {
        g.lineTo(x, y - t * .1);
        for (i = 1; i <= 3; i++) { g.lineTo(x + w * (.5 - .42 * (1 - i / 3.4)), y - t * (i / 3.2)); g.lineTo(x + w * (.5 - .2 * (1 - i / 3.4)), y - t * (i / 3.2) - 1); }
        g.lineTo(x + w * .5, y - t);
        for (i = 3; i >= 1; i--) { g.lineTo(x + w * (.5 + .2 * (1 - i / 3.4)), y - t * (i / 3.2) - 1); g.lineTo(x + w * (.5 + .42 * (1 - i / 3.4)), y - t * (i / 3.2)); }
        g.lineTo(x + w, y - t * .1);
      } else {
        g.lineTo(x, y - t * .4); g.bezierCurveTo(x - w * .1, y - t * 1.05, x + w * 1.1, y - t * 1.05, x + w, y - t * .4);
      }
      x += w * (conifer ? .62 : .7);
    }
    g.lineTo(W, y + 2); g.closePath(); g.fill();
    g.save(); g.clip();
    /* đốm nắng trên tán và bóng dưới gốc */
    for (i = 0; i < 90; i++) puff(g, r() * W, y - r() * hgt * .9, 5 + r() * 9, 3 + r() * 5, r() < .5 ? 'rgba(255,250,200,1)' : 'rgba(10,25,20,1)', .13);
    var gr = g.createLinearGradient(0, y - hgt, 0, y + 2);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.6, 'rgba(10,20,30,.12)'); gr.addColorStop(1, haze || 'rgba(225,235,235,.3)');
    g.fillStyle = gr; g.fillRect(0, y - hgt - 4, W, hgt + 8);
    g.restore();
  }
  /* mặt đất có cỏ: xa nhạt và ngả xám, gần đậm; có mảng nắng, mảng râm và lá cỏ */
  function meadow(g, r, y0, hue, dense) {
    var i;
    vgrad(g, y0, H, [[0, hsl(hue + 6, 30, 58)], [.25, hsl(hue, 40, 46)], [1, hsl(hue - 6, 46, 27)]]);
    g.save(); g.beginPath(); g.rect(0, y0, W, H - y0); g.clip();
    for (i = 0; i < 46; i++) {
      var d = r(), y = y0 + d * (H - y0), s = .4 + d * 1.3;
      puff(g, r() * W, y, (60 + r() * 110) * s, (7 + r() * 12) * s, r() < .5 ? 'rgba(235,235,150,1)' : 'rgba(10,40,20,1)', .1 + r() * .08);
    }
    g.restore();
    tufts(g, r, y0 + 4, dense || 70, hsl(hue - 8, 45, 20));
    var gr = g.createLinearGradient(0, y0, 0, y0 + 60); gr.addColorStop(0, 'rgba(235,240,235,.4)'); gr.addColorStop(1, 'rgba(235,240,235,0)');
    g.fillStyle = gr; g.fillRect(0, y0, W, 60);
  }
  /* mặt nước trong một đường bao (path) hoặc dải ngang y0..y1: phản chiếu trời ở xa, sẫm ở gần, gợn ngang và lấp lánh */
  function water(g, r, y0, y1, hue, path, calm) {
    var i, d, x, y, w;
    g.save();
    if (path) { path(); g.clip(); } else { g.beginPath(); g.rect(0, y0, W, y1 - y0); g.clip(); }
    vgrad(g, y0, y1, [[0, hsl(hue - 6, 38, 74)], [.3, hsl(hue, 50, 52)], [1, hsl(hue + 8, 58, 30)]]);
    for (i = 0; i < (calm ? 150 : 260); i++) {
      d = r(); y = y0 + d * d * (y1 - y0) * .2 + d * (y1 - y0) * .8; x = r() * W; w = (10 + r() * 40) * (.35 + d * 1.2);
      g.fillStyle = r() < .55 ? 'rgba(255,255,255,' + (.1 + r() * .16).toFixed(2) + ')' : 'rgba(8,30,60,' + (.08 + r() * .12).toFixed(2) + ')';
      g.beginPath(); g.ellipse(x, y, w, .5 + d * 1.5, 0, 0, TAU); g.fill();
    }
    /* vệt nắng lấp lánh */
    var sx = W * (.2 + r() * .6);
    for (i = 0; i < 120; i++) {
      d = r(); y = y0 + d * (y1 - y0); x = sx + (r() + r() - 1) * (30 + d * 90);
      g.fillStyle = 'rgba(255,255,240,' + (.25 + r() * .5).toFixed(2) + ')';
      g.beginPath(); g.ellipse(x, y, 2 + d * 7 * r(), .5 + d * .9, 0, 0, TAU); g.fill();
    }
    g.restore();
  }
  /* hạt cát / sỏi / bụi rải trong dải y0..y1 */
  function grains(g, r, y0, y1, n, dark, light) {
    for (var i = 0; i < n; i++) {
      var d = r(), y = y0 + d * (y1 - y0);
      g.fillStyle = r() < .5 ? dark : light; g.globalAlpha = .25 + r() * .5;
      g.fillRect(r() * W, y, .6 + d * 1.6, .5 + d * 1.1);
    }
    g.globalAlpha = 1;
  }
  /* gợn cát do gió */
  function sandRipples(g, r, y0, y1, hue) {
    var i, x, y, ph;
    for (i = 0; i < 26; i++) {
      var d = (i + r()) / 26; y = y0 + d * (y1 - y0); ph = r() * 9;
      g.beginPath(); g.moveTo(0, y);
      for (x = 0; x <= W; x += 14) g.lineTo(x, y + Math.sin(x * (.012 + d * .004) + ph) * (3 + d * 5) + Math.sin(x * .05 + ph * 2) * 1.2);
      g.lineWidth = 1 + d * 2.4; g.strokeStyle = hsl(hue - 6, 45, 40, .13); g.stroke();
      g.beginPath(); g.moveTo(0, y - 2 - d * 2);
      for (x = 0; x <= W; x += 14) g.lineTo(x, y - 2 - d * 2 + Math.sin(x * (.012 + d * .004) + ph) * (3 + d * 5) + Math.sin(x * .05 + ph * 2) * 1.2);
      g.lineWidth = 1 + d * 1.4; g.strokeStyle = 'rgba(255,250,225,.16)'; g.stroke();
    }
  }
  /* dãy nhà xa trong mù: khối nhà có mặt sáng mặt tối và ô cửa sổ */
  function skyline(g, r, yBase, hMin, hMax, col, alpha) {
    var x = -20, bw, hh, i, j;
    while (x < W) {
      bw = 26 + r() * 54; hh = hMin + r() * (hMax - hMin);
      g.globalAlpha = alpha; g.fillStyle = col; g.fillRect(x, yBase - hh, bw, hh);
      g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(x, yBase - hh, bw * .34, hh);
      g.fillStyle = 'rgba(10,15,35,.2)'; g.fillRect(x + bw * .8, yBase - hh, bw * .2, hh);
      if (r() < .4) { g.fillStyle = col; g.fillRect(x + bw * .4, yBase - hh - 8 - r() * 14, 3, 24); }
      for (j = 0; yBase - hh + 6 + j * 9 < yBase - 6; j++) for (i = 0; x + 4 + i * 7 < x + bw - 5; i++) {
        var k = r();
        g.fillStyle = k < .16 ? 'rgba(255,236,170,.75)' : k < .6 ? 'rgba(200,225,250,.3)' : 'rgba(15,25,50,.25)';
        g.fillRect(x + 4 + i * 7, yBase - hh + 6 + j * 9, 4, 5.5);
      }
      x += bw + r() * 6 - 2;
    }
    g.globalAlpha = 1;
    var gr = g.createLinearGradient(0, yBase - hMax * .5, 0, yBase); gr.addColorStop(0, 'rgba(240,240,245,0)'); gr.addColorStop(1, 'rgba(240,240,245,.5)');
    g.fillStyle = gr; g.fillRect(0, yBase - hMax, W, hMax);
  }
  /* mặt đường nhựa: sần, có vệt bánh xe và vết vá */
  function asphalt(g, r, y0, y1) {
    vgrad(g, y0, y1, [[0, '#6b6e75'], [.3, '#54575f'], [1, '#383b43']]);
    grains(g, r, y0, y1, 2600, 'rgba(15,15,20,1)', 'rgba(210,210,215,1)');
    for (var i = 0; i < 4; i++) { var y = y0 + (y1 - y0) * (.18 + i * .22); puff(g, W / 2, y, W * .7, 9 + i * 4, 'rgba(15,15,22,1)', .22); }
    g.strokeStyle = 'rgba(20,20,26,.35)'; g.lineWidth = 1;
    for (i = 0; i < 7; i++) { var x = r() * W, yy = y0 + r() * (y1 - y0), k; g.beginPath(); g.moveTo(x, yy); for (k = 0; k < 5; k++) { x += 8 + r() * 22; yy += (r() - .5) * 12; g.lineTo(x, yy); } g.stroke(); }
  }
  /* vạch sơn đã mòn */
  function paint(g, r, x, y, w, h, col) {
    g.fillStyle = col; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(60,62,70,.5)'; for (var i = 0; i < w * h / 30; i++) g.fillRect(x + r() * w, y + r() * h, 1 + r() * 3, 1);
  }
  /* mặt gỗ (bàn, sàn, ván): thớ chạy ngang, mắt gỗ, bóng nhẹ */
  function wood(g, r, x0, y0, x1, y1, hue, lit, plank, sat) {
    var i, k, x, y, yy;
    sat = sat || 42;
    g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
    vgrad(g, y0, y1, [[0, hsl(hue, sat, lit + 7)], [1, hsl(hue - 3, sat + 4, lit - 9)]]);
    if (plank) for (i = 0, y = y0; y < y1; i++) {
      var ph = plank * (.75 + (y - y0) / (y1 - y0) * .7);
      g.fillStyle = hsl(hue + (r() - .5) * 8, sat, lit + (r() - .5) * 12, .5); g.fillRect(x0, y, x1 - x0, ph);
      g.fillStyle = 'rgba(30,14,4,.4)'; g.fillRect(x0, y + ph - 1.2, x1 - x0, 1.6);
      g.fillStyle = 'rgba(255,240,215,.14)'; g.fillRect(x0, y, x1 - x0, 1.2);
      for (k = 0; k < 3; k++) { x = x0 + ((k * 290 + i * 131 + r() * 60) % (x1 - x0)); g.fillStyle = 'rgba(30,14,4,.4)'; g.fillRect(x, y, 1.6, ph); }
      y += ph;
    }
    g.lineWidth = .8;
    for (i = 0; i < (y1 - y0) * .55; i++) {
      y = y0 + r() * (y1 - y0); x = x0 + r() * (x1 - x0); var len = 40 + r() * 200, wob = r() * 6;
      g.strokeStyle = r() < .6 ? 'rgba(50,24,8,' + (.08 + r() * .14).toFixed(2) + ')' : 'rgba(255,235,200,.1)';
      g.beginPath(); g.moveTo(x, y); for (k = 0; k <= len; k += 20) g.lineTo(x + k, y + Math.sin(k * .03 + wob) * 1.6); g.stroke();
    }
    for (i = 0; i < 5; i++) { x = x0 + r() * (x1 - x0); yy = y0 + r() * (y1 - y0); for (k = 3; k > 0; k--) { g.beginPath(); g.ellipse(x, yy, k * 4.5, k * 1.8, 0, 0, TAU); g.strokeStyle = 'rgba(45,20,6,.2)'; g.stroke(); } }
    g.restore();
  }
  /* tường sơn/giấy dán: sáng ở giữa, tối dần về góc và về phía chân tường */
  function wallShade(g, y1) {
    var gr = g.createRadialGradient(W * .5, y1 * .3, 60, W * .5, y1 * .3, W * .75);
    gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(20,15,35,.2)');
    g.fillStyle = gr; g.fillRect(0, 0, W, y1);
  }
  /* nắng hắt qua cửa sổ lên tường (ô sáng xiên có song cửa) và bóng tiếp giáp tường – sàn */
  function roomLight(g, r, yFloor, wallTop) {
    var x = 80 + r() * 380, y = (wallTop || 20) + 10 + r() * 30, w = 150 + r() * 60, h = Math.min(yFloor - y - 30, 150 + r() * 60), sk = 46, i, j;
    g.save(); g.beginPath(); g.rect(0, 0, W, yFloor); g.clip();
    g.globalCompositeOperation = 'soft-light';
    for (j = 0; j < 2; j++) for (i = 0; i < 2; i++) {
      var px = x + i * (w / 2 + 3), py = y + j * (h / 2 + 3), pw = w / 2 - 3, phh = h / 2 - 3;
      g.beginPath(); g.moveTo(px + sk * (1 - py / yFloor), py); g.lineTo(px + pw + sk * (1 - py / yFloor), py);
      g.lineTo(px + pw + sk * (1 - (py + phh) / yFloor) - sk, py + phh); g.lineTo(px + sk * (1 - (py + phh) / yFloor) - sk, py + phh); g.closePath();
      g.fillStyle = 'rgba(255,244,205,.75)'; g.shadowColor = 'rgba(255,244,205,.8)'; g.shadowBlur = 14; g.fill();
    }
    g.restore();
    var gr = g.createLinearGradient(0, yFloor - 46, 0, yFloor); gr.addColorStop(0, 'rgba(20,12,30,0)'); gr.addColorStop(1, 'rgba(20,12,30,.26)');
    g.fillStyle = gr; g.fillRect(0, yFloor - 46, W, 46);
    gr = g.createLinearGradient(0, yFloor, 0, yFloor + 70); gr.addColorStop(0, 'rgba(20,12,30,.34)'); gr.addColorStop(1, 'rgba(20,12,30,0)');
    g.fillStyle = gr; g.fillRect(0, yFloor, W, 70);
    /* sàn bóng: vệt sáng hắt lại */
    puff(g, x + w * .4 - 60, yFloor + (H - yFloor) * .55, 300, (H - yFloor) * .4, 'rgba(255,248,225,1)', .2);
  }
  /* ô gạch: mỗi viên hơi khác màu, mạch vữa lõm, viền bắt sáng */
  function tiles(g, r, x0, y0, x1, y1, sz, hue, sat, lit, alt, gloss) {
    var i, j, x, y, w, h;
    for (j = 0; y0 + j * sz < y1; j++) for (i = 0; x0 + i * sz < x1; i++) {
      x = x0 + i * sz; y = y0 + j * sz; w = Math.min(sz, x1 - x); h = Math.min(sz, y1 - y);
      g.fillStyle = hsl(hue + (r() - .5) * 4, sat, lit + (r() - .5) * 3 - (alt && (i + j) % 2 ? alt : 0)); g.fillRect(x, y, w, h);
      var gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,255,255,' + (gloss || .16) + ')'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,20,.07)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    g.lineWidth = 2.2; g.strokeStyle = hsl(hue, Math.max(0, sat - 14), lit - 26, .7); g.beginPath();
    for (i = 0; x0 + i * sz <= x1; i++) { g.moveTo(x0 + i * sz, y0); g.lineTo(x0 + i * sz, y1); }
    for (j = 0; y0 + j * sz <= y1; j++) { g.moveTo(x0, y0 + j * sz); g.lineTo(x1, y0 + j * sz); }
    g.stroke();
    g.lineWidth = .8; g.strokeStyle = 'rgba(255,255,255,.4)'; g.beginPath();
    for (i = 0; x0 + i * sz <= x1; i++) { g.moveTo(x0 + i * sz + 1.6, y0); g.lineTo(x0 + i * sz + 1.6, y1); }
    for (j = 0; y0 + j * sz <= y1; j++) { g.moveTo(x0, y0 + j * sz + 1.6); g.lineTo(x1, y0 + j * sz + 1.6); }
    g.stroke();
  }
  /* tấm kệ gỗ dày, có thớ và bóng đổ xuống tường */
  function shelfBoard(g, r, y, hue, lit) {
    var gr = g.createLinearGradient(0, y + 11, 0, y + 40); gr.addColorStop(0, 'rgba(20,12,30,.34)'); gr.addColorStop(1, 'rgba(20,12,30,0)');
    g.fillStyle = gr; g.fillRect(0, y + 11, W, 30);
    wood(g, r, 0, y, W, y + 11, hue, lit, 0, 50);
    g.fillStyle = 'rgba(255,240,215,.4)'; g.fillRect(0, y, W, 1.6);
    g.fillStyle = 'rgba(30,14,4,.45)'; g.fillRect(0, y + 8.6, W, 2.4);
  }
  function baseboard(g, y) {
    rectG(g, 0, y - 9, W, 11, '#f7f3ec', '#d9d2c6'); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y + 2, W, 2);
  }
  function bracket(g, x, y) { g.fillStyle = '#6a6d74'; g.fillRect(x, y, 7, 15); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, y, 2, 15); }

  /* ===================== ngoài trời ===================== */
  BG.village = function (g, m, r) {
    var gh = 88 + (m * 7) % 24;
    skyFill(g, m, 380);
    mountains(g, r, 330, 90, hsl(215, 20, 62), 0);
    hills(g, r, 318, 26, hsl(gh + 20, 22, 56), .006); treeline(g, r, 338, 26, hsl(gh + 14, 30, 34), false);
    hills(g, r, 346, 14, hsl(gh + 6, 34, 46), .009);
    meadow(g, r, 336, gh, 80);
  };
  BG.landscape = function (g, m, r) {
    var gh = 84 + (m * 7) % 26, k;
    skyFill(g, m, 360);
    mountains(g, r, 320, 120, hsl(218, 22, 60), .22);
    hills(g, r, 290, 30, hsl(gh + 26, 20, 58), .005); treeline(g, r, 318, 22, hsl(gh + 16, 28, 36), true);
    hills(g, r, 326, 20, hsl(gh + 8, 34, 46), .007);
    meadow(g, r, 330, gh, 64);
    /* luống ruộng mờ */
    for (k = 0; k < 6; k++) puff(g, W * (.2 + r() * .6), 350 + k * 40, 420, 6 + k * 2, k % 2 ? 'rgba(230,220,130,1)' : 'rgba(20,50,20,1)', .16);
  };
  BG.castle = function (g, m, r) {
    var gh = 92 + (m * 6) % 26;
    skyFill(g, m, 380);
    mountains(g, r, 330, 150, hsl(250, 16, 58), .2);
    hills(g, r, 322, 34, hsl(gh + 26, 20, 54), .006); treeline(g, r, 350, 30, hsl(gh + 14, 30, 30), true);
    hills(g, r, 366, 20, hsl(gh + 8, 34, 44), .008);
    meadow(g, r, 344, gh, 64);
    /* lối mòn đất */
    g.save(); g.beginPath(); g.moveTo(320, H); g.bezierCurveTo(360, 520, 444, 470, 408, 396); g.lineTo(436, 396); g.bezierCurveTo(484, 480, 424, 540, 512, H); g.closePath(); g.clip();
    vgrad(g, 396, H, [[0, hsl(34, 30, 62)], [1, hsl(30, 34, 46)]]); grains(g, r, 396, H, 900, 'rgba(70,50,30,1)', 'rgba(255,245,220,1)');
    g.restore();
  };
  BG.mountain = function (g, m, r) {
    var gh = 100 + (m * 6) % 30;
    skyFill(g, m, 380);
    mountains(g, r, 345, 250, hsl(222, 22, 66), .34, 'rgba(232,238,246,.75)');
    mountains(g, r, 350, 170, hsl(218, 24, 50), .16, 'rgba(225,232,240,.6)');
    treeline(g, r, 348, 44, hsl(gh + 30, 22, 38), true, 'rgba(215,228,230,.5)');
    treeline(g, r, 364, 56, hsl(gh + 16, 32, 24), true, 'rgba(60,90,80,.2)');
    meadow(g, r, 356, gh + 4, 64);
  };
  BG.forest = function (g, m, r) {
    var gh = 96 + (m * 7) % 30, i;
    vgrad(g, 0, 420, [[0, SKIES[m % 10][0]], [.5, SKIES[m % 10][1]], [1, hsl(gh + 30, 20, 84)]]);
    puff(g, W * (.3 + r() * .4), 150, 380, 300, 'rgba(255,250,220,1)', .5);
    treeline(g, r, 372, 150, hsl(gh + 34, 14, 66), true, 'rgba(235,240,235,.7)');
    treeline(g, r, 390, 130, hsl(gh + 24, 22, 48), true, 'rgba(215,230,220,.5)');
    treeline(g, r, 410, 120, hsl(gh + 12, 32, 30), true, 'rgba(60,90,70,.2)');
    /* tia nắng xuyên tán */
    g.save(); g.globalCompositeOperation = 'soft-light';
    for (i = 0; i < 5; i++) { var x = 60 + i * 150 + r() * 60; g.beginPath(); g.moveTo(x, 200); g.lineTo(x + 34, 200); g.lineTo(x - 60, 520); g.lineTo(x - 150, 520); g.closePath(); g.fillStyle = 'rgba(255,250,210,.3)'; g.fill(); }
    g.restore();
    meadow(g, r, 362, gh, 70);
    for (i = 0; i < 260; i++) { var d = r(); g.fillStyle = ['rgba(150,96,40,.55)', 'rgba(196,150,60,.5)', 'rgba(90,60,30,.5)'][i % 3]; g.beginPath(); g.ellipse(r() * W, 380 + d * 215, 1.4 + d * 2.6, .8 + d * 1.4, r() * 3, 0, TAU); g.fill(); }
  };
  BG.winter = function (g, m, r) {
    var hb = 208 + (m * 4) % 16, i;
    vgrad(g, 0, 380, [[0, hsl(hb, 34, 62)], [.6, hsl(hb, 30, 82)], [1, hsl(hb - 10, 30, 93)]]);
    puff(g, W * (.2 + r() * .6), 120, 300, 200, 'rgba(255,255,255,1)', .6);
    mountains(g, r, 340, 150, hsl(hb + 6, 18, 70), .7, 'rgba(240,246,252,.85)');
    treeline(g, r, 338, 46, hsl(hb - 30, 16, 46), true, 'rgba(235,242,250,.7)');
    hills(g, r, 334, 22, '#e3ecf6', .007); hills(g, r, 376, 18, '#f2f6fb', .009);
    vgrad(g, 366, H, [[0, '#f3f7fc'], [1, '#c9d9ec']]);
    for (i = 0; i < 30; i++) { var d = r(); puff(g, r() * W, 384 + d * 200, (70 + r() * 120) * (.5 + d), (5 + r() * 8) * (.5 + d), r() < .6 ? 'rgba(120,150,200,1)' : 'rgba(255,255,255,1)', .2); }
    grains(g, r, 370, H, 900, 'rgba(140,165,205,1)', 'rgba(255,255,255,1)');
    for (i = 0; i < 90; i++) puff(g, r() * W, r() * H, 1.4 + r() * 2.6, 1.4 + r() * 2.6, 'rgba(255,255,255,1)', .5 + r() * .4);
  };
  BG.desert = function (g, m, r) {
    var dh = 30 + (m * 3) % 10;
    skyFill(g, m, 360);
    mountains(g, r, 366, 70, hsl(dh - 8, 30, 62), 0, 'rgba(250,235,215,.6)');
    hills(g, r, 362, 20, hsl(dh + 4, 46, 68), .007); hills(g, r, 402, 26, hsl(dh, 50, 60), .006);
    vgrad(g, 400, H, [[0, hsl(dh, 50, 62)], [1, hsl(dh - 5, 48, 44)]]);
    sandRipples(g, r, 410, H, dh); grains(g, r, 396, H, 1800, 'rgba(110,70,30,1)', 'rgba(255,245,215,1)');
  };
  BG.beach = function (g, m, r) {
    var sand = 36 + (m % 4) * 3, i;
    skyFill(g, m, 300);
    water(g, r, 298, 480, 196);
    var shore = function () { g.beginPath(); g.moveTo(0, 470); g.bezierCurveTo(200, 430, 500, 500, W, 440); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); };
    g.save(); shore(); g.clip();
    vgrad(g, 430, H, [[0, hsl(sand - 4, 34, 56)], [.16, hsl(sand, 50, 74)], [1, hsl(sand, 44, 58)]]);
    sandRipples(g, r, 500, H, sand); grains(g, r, 440, H, 2200, 'rgba(120,90,50,1)', 'rgba(255,250,235,1)');
    g.restore();
    /* bọt sóng */
    for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(0, 470 - i * 9); g.bezierCurveTo(200, 430 - i * 10, 500, 500 - i * 8, W, 440 - i * 9); g.lineWidth = 7 - i * 2.4; g.strokeStyle = 'rgba(255,255,255,' + (.85 - i * .28) + ')'; g.stroke(); }
  };
  BG.sea = function (g, m, r) {
    var hb = 196 + (m * 5) % 26, i, x;
    vgrad(g, 0, H, [[0, hsl(hb - 6, 60, 60)], [.4, hsl(hb + 6, 66, 36)], [1, hsl(hb + 16, 70, 14)]]);
    puff(g, W * (.3 + r() * .4), -20, 520, 260, 'rgba(220,250,255,1)', .6);
    g.save(); g.globalCompositeOperation = 'soft-light';
    for (i = 0; i < 7; i++) { x = 40 + i * 120 + r() * 50; var w = 20 + r() * 50; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w * 2.6 + 90, 520); g.lineTo(x + 20, 520); g.closePath(); g.fillStyle = 'rgba(235,255,255,' + (.14 + r() * .2).toFixed(2) + ')'; g.fill(); }
    g.restore();
    for (i = 0; i < 9; i++) { x = r() * W; puff(g, x, 490 - r() * 30, 40 + r() * 50, 90 + r() * 60, 'rgba(4,22,48,1)', .4); }
    var floor = function () { g.beginPath(); g.moveTo(0, H); for (var xx = 0; xx <= W; xx += 10) g.lineTo(xx, 525 + Math.sin(xx * .012 + m) * 14 + Math.sin(xx * .031) * 6); g.lineTo(W, H); g.closePath(); };
    g.save(); floor(); g.clip();
    vgrad(g, 505, H, [[0, hsl(42, 30, 58)], [1, hsl(36, 30, 36)]]);
    sandRipples(g, r, 520, H, 40); grains(g, r, 510, H, 1200, 'rgba(60,50,40,1)', 'rgba(240,240,220,1)');
    /* vân sáng mặt nước in xuống đáy */
    g.globalCompositeOperation = 'soft-light'; g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2;
    for (i = 0; i < 26; i++) { x = r() * W; var y = 520 + r() * 76; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 16, y - 6, x + 30, y + 6, x + 50, y - 2); g.stroke(); }
    g.restore();
    for (i = 0; i < 90; i++) puff(g, r() * W, r() * 500, 1 + r() * 2.2, 1 + r() * 2.2, 'rgba(255,255,255,1)', .15 + r() * .3);
  };
  BG.space = function (g, m, r) {
    var i, h0 = (m * 36) % 360, x, y;
    vgrad(g, 0, H, [[0, '#020108'], [1, hsl(h0 + 230, 50, 9)]]);
    /* dải thiên hà chéo */
    g.save(); g.translate(W / 2, H / 2); g.rotate(-.5 + r() * .4);
    for (i = 0; i < 60; i++) puff(g, (r() - .5) * 900, (r() + r() - 1) * 70, 40 + r() * 90, 20 + r() * 40, hsl(h0 + 200 + r() * 80, 50, 60 + r() * 20), .07);
    for (i = 0; i < 26; i++) puff(g, (r() - .5) * 800, (r() + r() - 1) * 30, 30 + r() * 60, 10 + r() * 16, 'rgba(8,4,16,1)', .3);
    for (i = 0; i < 900; i++) { g.fillStyle = 'rgba(255,255,255,' + (.2 + r() * .6).toFixed(2) + ')'; g.fillRect((r() - .5) * 900, (r() + r() + r() - 1.5) * 80, .8, .8); }
    g.restore();
    for (i = 0; i < 3; i++) puff(g, 100 + r() * 600, 80 + r() * 440, 170 + r() * 110, 170 + r() * 110, hsl(h0 + i * 70, 60, 45), .16);
    for (i = 0; i < 700; i++) { var b = r(); g.fillStyle = 'rgba(' + (b < .2 ? '255,225,190' : b < .4 ? '200,220,255' : '255,255,255') + ',' + (.25 + r() * .7).toFixed(2) + ')'; var s = r() < .93 ? .7 + r() * .7 : 1.4 + r() * 1.2; g.fillRect(r() * W, r() * H, s, s); }
    for (i = 0; i < 12; i++) { x = r() * W; y = r() * H; puff(g, x, y, 7, 7, 'rgba(255,255,255,1)', .8); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .8; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.moveTo(x, y - 7); g.lineTo(x, y + 7); g.stroke(); }
  };
  BG.city = function (g, m, r) {
    var i;
    skyFill(g, m, 440);
    skyline(g, r, 440, 130, 300, 'rgb(120,130,155)', .5);
    skyline(g, r, 440, 60, 190, 'rgb(72,82,108)', .8);
    /* vỉa hè lát đá */
    vgrad(g, 440, 474, [[0, '#b9bcc2'], [1, '#8f939c']]);
    for (i = 0; i < W / 40; i++) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(i * 40, 440, 1.6, 34); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(i * 40 + 1.6, 440, 1, 34); }
    grains(g, r, 440, 474, 500, 'rgba(40,40,50,1)', 'rgba(255,255,255,1)');
    g.fillStyle = '#d9d9d4'; g.fillRect(0, 470, W, 6); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 476, W, 3);
    asphalt(g, r, 479, H);
    for (i = 0; i < 10; i++) paint(g, r, i * 90 + 10, 548, 50, 6, '#e6dfa8');
  };
  BG.road = function (g, m, r) {
    var i;
    skyFill(g, m, 200);
    skyline(g, r, 172, 40, 120, 'rgb(96,104,128)', .55);
    treeline(g, r, 176, 30, hsl(105, 28, 32), false);
    vgrad(g, 172, 236, [[0, hsl(96, 34, 44)], [1, hsl(92, 38, 34)]]); tufts(g, r, 180, 8, hsl(95, 40, 20));
    vgrad(g, 236, 266, [[0, '#c3c5c9'], [1, '#9a9da4']]);
    for (i = 0; i < W / 50; i++) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(i * 50 + 12, 236, 1.6, 30); }
    grains(g, r, 236, 266, 400, 'rgba(40,40,50,1)', 'rgba(255,255,255,1)');
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 264, W, 3);
    asphalt(g, r, 267, H);
    paint(g, r, 0, 270, W, 4, '#eeeeea'); paint(g, r, 0, H - 8, W, 4, '#eeeeea');
    for (i = 0; i < 12; i++) { paint(g, r, i * 70 + 10, 384, 40, 5, '#f2c93a'); paint(g, r, i * 70 + 40, 486, 40, 5, '#f2c93a'); }
    for (i = 0; i < 8; i++) paint(g, r, 560 + i * 22, 276, 12, 104, 'rgba(238,238,234,.92)');
  };
  BG.stream = function (g, m, r) {
    var gh = 90 + (m * 7) % 28, i, x;
    skyFill(g, m, 150);
    mountains(g, r, 138, 60, hsl(216, 20, 60), 0);
    treeline(g, r, 140, 30, hsl(gh + 14, 28, 32), true);
    meadow(g, r, 130, gh, 80);
    var top = function (x) { return 300 + Math.sin(x * .011 + 1) * 16 + Math.sin(x * .027) * 6; }, bot = function (x) { return 420 + Math.sin(x * .012 + 2) * 16 + Math.sin(x * .023) * 6; };
    var path = function () { g.beginPath(); g.moveTo(0, top(0)); for (x = 0; x <= W; x += 10) g.lineTo(x, top(x)); for (x = W; x >= 0; x -= 10) g.lineTo(x, bot(x)); g.closePath(); };
    /* bờ đất sẫm rồi tới mặt nước */
    g.lineWidth = 14; g.strokeStyle = hsl(30, 30, 30, .8); path(); g.stroke();
    water(g, r, 280, 440, 200, path);
    g.save(); path(); g.clip();
    g.lineWidth = 16; g.strokeStyle = 'rgba(10,30,30,.34)'; g.beginPath(); g.moveTo(0, top(0)); for (x = 0; x <= W; x += 10) g.lineTo(x, top(x)); g.stroke();
    for (i = 0; i < 14; i++) { x = r() * W; var yy = top(x) + 16 + r() * (bot(x) - top(x) - 30); g.fillStyle = hsl(30, 8, 40 + r() * 20); g.beginPath(); g.ellipse(x, yy, 5 + r() * 8, 3 + r() * 3, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(x + 3, yy + 3, 9 + r() * 6, 1.4, 0, 0, TAU); g.fill(); }
    g.restore();
    for (i = 0; i < 220; i++) { x = r() * W; var e = r() < .5 ? top(x) - 2 : bot(x) + 6; g.strokeStyle = hsl(gh - 6, 45, 18 + r() * 14, .8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, e); g.lineTo(x + (r() - .5) * 5, e - 5 - r() * 8); g.stroke(); }
  };
  BG.river = function (g, m, r) {
    var gh = 88 + (m * 7) % 28, i, x;
    skyFill(g, m, 230);
    mountains(g, r, 216, 90, hsl(216, 20, 62), 0);
    treeline(g, r, 222, 30, hsl(gh + 22, 22, 42), false, 'rgba(225,235,235,.5)');
    vgrad(g, 214, 272, [[0, hsl(gh + 4, 30, 50)], [1, hsl(gh, 38, 36)]]); tufts(g, r, 222, 8, hsl(gh, 40, 20));
    water(g, r, 268, 490, 200, null, true);
    /* bóng bờ xa in xuống nước */
    var gr = g.createLinearGradient(0, 268, 0, 320); gr.addColorStop(0, 'rgba(20,50,40,.5)'); gr.addColorStop(1, 'rgba(20,50,40,0)'); g.fillStyle = gr; g.fillRect(0, 268, W, 52);
    meadow(g, r, 486, gh, 40);
    g.fillStyle = hsl(30, 30, 30, .7); g.fillRect(0, 484, W, 5);
    for (i = 0; i < 160; i++) { x = r() * W; g.strokeStyle = hsl(gh - 6, 45, 16 + r() * 14, .8); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, 492); g.lineTo(x + (r() - .5) * 6, 480 - r() * 8); g.stroke(); }
  };
  BG.garden = function (g, m, r) {
    var hb = 120 + (m * 13) % 50, i;
    /* nhà kính: sau kính là vườn mờ */
    vgrad(g, 0, 250, [[0, hsl(205, 34, 78)], [.5, hsl(hb - 20, 22, 82)], [1, hsl(100, 26, 62)]]);
    for (i = 0; i < 30; i++) puff(g, r() * W, 150 + r() * 110, 40 + r() * 70, 30 + r() * 40, hsl(95 + r() * 40, 34, 30 + r() * 26), .3);
    for (i = 0; i < 8; i++) { g.save(); g.globalCompositeOperation = 'soft-light'; g.beginPath(); g.moveTo(i * 100 + 20, 0); g.lineTo(i * 100 + 50, 0); g.lineTo(i * 100 - 20, 250); g.lineTo(i * 100 - 50, 250); g.closePath(); g.fillStyle = 'rgba(255,255,255,.3)'; g.fill(); g.restore(); }
    for (i = 0; i <= 8; i++) { rectG(g, i * 100 - 3, 0, 6, 250, '#f4f6f4', '#b9c0bc', true); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(i * 100 + 3, 0, 3, 250); }
    rectG(g, 0, 117, W, 6, '#f4f6f4', '#b9c0bc'); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, 123, W, 3);
    wood(g, r, 0, 248, W, 262, 26, 38, 0, 50); g.fillStyle = 'rgba(255,240,215,.35)'; g.fillRect(0, 248, W, 1.6);
    g.fillStyle = '#4a2f18'; g.fillRect(0, 262, W, 6);
    vgrad(g, 268, 330, [[0, hsl(98, 34, 38)], [1, hsl(95, 38, 30)]]); tufts(g, r, 274, 8, hsl(95, 40, 18));
    rectG(g, 0, 268, W, 16, 'rgba(10,10,20,.4)', 'rgba(10,10,20,0)');
    /* luống đất tơi */
    vgrad(g, 330, H, [[0, '#6b4a30'], [1, '#3e2917']]);
    for (i = 0; i < 4; i++) { rectG(g, 0, 376 + i * 55, W, 12, 'rgba(20,10,4,.45)', 'rgba(20,10,4,0)'); g.fillStyle = 'rgba(255,225,190,.1)'; g.fillRect(0, 370 + i * 55, W, 6); }
    grains(g, r, 332, H, 2600, 'rgba(25,14,6,1)', 'rgba(190,150,110,1)');
    for (i = 0; i < 120; i++) { var d = r(); g.fillStyle = hsl(28, 20, 30 + r() * 26); g.beginPath(); g.ellipse(r() * W, 340 + d * 250, 1.6 + d * 3, 1.2 + d * 2, 0, 0, TAU); g.fill(); }
  };

  /* ===================== trong nhà ===================== */
  function plainWall(g, y1, hue, sat, lit) { vgrad(g, 0, y1, [[0, hsl(hue, sat, lit + 4)], [1, hsl(hue, sat, lit - 5)]]); }
  function wallpaper(g, y1, m, hue) {
    var i, j, k = m % 3;
    plainWall(g, y1, hue, 26, 84);
    g.fillStyle = hsl(hue, 28, 78, .7);
    if (k === 0) for (i = 0; i < 20; i++) g.fillRect(i * 44, 0, 20, y1);
    else if (k === 1) { for (j = 0; j * 40 < y1; j++) for (i = 0; i < 21; i++) { g.beginPath(); g.arc(i * 40 + (j % 2) * 20, j * 40 + 20, 4.5, 0, TAU); g.fill(); } }
    else { g.strokeStyle = hsl(hue, 28, 76, .8); g.lineWidth = 2; g.beginPath(); for (i = -10; i < 30; i++) { g.moveTo(i * 40, 0); g.lineTo(i * 40 + y1, y1); g.moveTo(i * 40, 0); g.lineTo(i * 40 - y1, y1); } g.stroke(); }
    wallShade(g, y1);
  }
  BG.desk = function (g, m, r) {
    var hw = 30 + (m * 23) % 200, i;
    plainWall(g, 240, hw, 16, 80);
    g.strokeStyle = hsl(hw, 16, 70, .6); g.lineWidth = 1.4; for (i = 0; i < 20; i++) { g.beginPath(); g.moveTo(i * 44, 0); g.lineTo(i * 44, 240); g.stroke(); }
    wallShade(g, 240);
    /* tranh phong cảnh treo tường */
    g.fillStyle = 'rgba(20,12,30,.3)'; g.fillRect(476, 40, 262, 150);
    wood(g, r, 470, 30, 730, 180, 28, 46, 0, 46);
    g.save(); g.beginPath(); g.rect(482, 42, 236, 126); g.clip();
    vgrad(g, 42, 168, [[0, '#9cc3e4'], [.55, '#e9e2cf'], [.56, '#6f8f66'], [1, '#3f5e3d']]);
    for (i = 0; i < 6; i++) puff(g, 490 + r() * 220, 60 + r() * 30, 30 + r() * 30, 8, 'rgba(255,255,255,1)', .6);
    g.restore();
    g.strokeStyle = 'rgba(30,14,4,.5)'; g.lineWidth = 1.4; g.strokeRect(482, 42, 236, 126);
    roomLight(g, r, 240, 0);
    wood(g, r, 0, 240, W, H, 26, 44, 0, 46);
    g.fillStyle = '#5c3a1e'; g.fillRect(0, 236, W, 9); g.fillStyle = 'rgba(255,240,215,.3)'; g.fillRect(0, 236, W, 1.6);
    puff(g, W * .4, 300, 420, 50, 'rgba(255,248,225,1)', .22);
  };
  BG.kitchen = function (g, m, r) {
    var hw = (m * 37 + 20) % 360, ft = 30 + (m % 4) * 6;
    plainWall(g, 152, hw, 20, 82); wallShade(g, 152);
    tiles(g, r, 0, 150, W, 302, 30, 210, 10, 95, 0, .3);
    shelfBoard(g, r, 120, 28, 48); bracket(g, 60, 131); bracket(g, 732, 131);
    roomLight(g, r, 302, 0);
    /* mặt bếp đá */
    vgrad(g, 302, H, [[0, hsl(ft, 16, 74)], [1, hsl(ft, 16, 54)]]);
    grains(g, r, 304, H, 2400, 'rgba(50,40,36,1)', 'rgba(255,255,255,1)');
    for (var i = 0; i < 22; i++) { var d = r(); puff(g, r() * W, 310 + d * 280, 30 + r() * 80, 4 + r() * 10, r() < .5 ? 'rgba(255,255,255,1)' : 'rgba(70,60,56,1)', .14); }
    rectG(g, 0, 296, W, 9, '#a9adb5', '#6f737c'); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(0, 296, W, 1.4);
    rectG(g, 0, 305, W, 22, 'rgba(20,12,30,.3)', 'rgba(20,12,30,0)');
  };
  BG.toyroom = function (g, m, r) {
    var hw = (m * 41 + 180) % 360, i;
    wallpaper(g, 352, m, hw);
    shelfBoard(g, r, 180, 30, 56);
    wood(g, r, 0, 352, W, H, 32, 56, 26);
    baseboard(g, 352);
    roomLight(g, r, 352, 195);
    /* thảm len tròn */
    g.fillStyle = 'rgba(20,12,30,.26)'; g.beginPath(); g.ellipse(400, 492, 344, 94, 0, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.ellipse(400, 485, 340, 92, 0, 0, TAU); g.clip();
    g.fillStyle = hsl(hw + 180, 34, 60); g.fillRect(0, 380, W, 220);
    for (i = 9; i > 0; i--) { g.beginPath(); g.ellipse(400, 485, i * 37, i * 10, 0, 0, TAU); g.lineWidth = 3; g.strokeStyle = i % 2 ? hsl(hw + 180, 34, 70, .8) : hsl(hw + 180, 30, 48, .5); g.stroke(); }
    grains(g, r, 390, 580, 2600, 'rgba(30,20,30,1)', 'rgba(255,255,255,1)');
    g.restore();
  };
  BG.classroom = function (g, m, r) {
    var hw = (m * 29 + 90) % 360, i, x, y;
    plainWall(g, 332, hw, 16, 84);
    vgrad(g, 250, 332, [[0, hsl(hw, 18, 70)], [1, hsl(hw, 18, 62)]]); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(0, 250, W, 2);
    wallShade(g, 332);
    g.fillStyle = 'rgba(20,12,30,.28)'; g.fillRect(156, 32, 504, 190);
    wood(g, r, 150, 24, 650, 208, 26, 36, 0, 44);
    /* bảng đen còn vệt phấn lau */
    g.save(); g.beginPath(); g.rect(160, 34, 480, 164); g.clip();
    vgrad(g, 34, 198, [[0, '#2f5a48'], [1, '#234636']]);
    for (i = 0; i < 30; i++) puff(g, 160 + r() * 480, 34 + r() * 164, 40 + r() * 90, 10 + r() * 24, 'rgba(235,245,240,1)', .07);
    g.strokeStyle = 'rgba(245,248,244,.7)'; g.lineWidth = 2; g.lineCap = 'round';
    for (i = 0; i < 6; i++) { y = 62 + i * 22; x = 186 + r() * 30; g.beginPath(); g.moveTo(x, y); var ln = 160 + r() * 240; for (var t = 0; t < ln; t += 7) { if (r() < .12) { g.stroke(); g.beginPath(); g.moveTo(x + t + 6, y); t += 6; } g.lineTo(x + t, y + Math.sin(t * .5 + i) * 3 + (r() - .5) * 2); } g.stroke(); }
    g.restore();
    wood(g, r, 150, 204, 650, 214, 26, 30, 0, 44); g.fillStyle = '#f4f4ee'; g.fillRect(230, 200, 22, 5); g.fillStyle = '#f0c5c5'; g.fillRect(270, 200, 18, 5);
    roomLight(g, r, 332, 0);
    wood(g, r, 0, 332, W, H, 28, 50, 0, 46);
    g.fillStyle = '#5c3a1e'; g.fillRect(0, 328, W, 9); g.fillStyle = 'rgba(255,240,215,.3)'; g.fillRect(0, 328, W, 1.6);
  };
  BG.music = function (g, m, r) {
    var hw = (m * 31 + 250) % 360, i, j, k;
    g.fillStyle = hsl(hw, 14, 34); g.fillRect(0, 0, W, 362);
    /* tấm mút tiêu âm: mỗi tấm có rãnh nổi */
    for (i = 0; i < 10; i++) for (j = 0; j < 4; j++) {
      var x = 12 + i * 79, y = 14 + j * 86, ver = (i + j) % 2 === 0;
      g.fillStyle = hsl(hw, 14, 56 + (ver ? 0 : 4)); g.fillRect(x, y, 70, 78);
      for (k = 0; k < 6; k++) {
        if (ver) rectG(g, x + k * 11.7, y, 11.7, 78, 'rgba(255,255,255,.2)', 'rgba(10,10,20,.34)', true);
        else rectG(g, x, y + k * 13, 70, 13, 'rgba(255,255,255,.2)', 'rgba(10,10,20,.34)');
      }
    }
    wallShade(g, 362);
    wood(g, r, 0, 362, W, H, 26, 44, 26);
    baseboard(g, 362);
    roomLight(g, r, 362, 0);
    g.fillStyle = 'rgba(20,12,30,.26)'; g.fillRect(74, 424, 660, 168);
    g.save(); g.beginPath(); g.rect(70, 418, 660, 168); g.clip();
    g.fillStyle = hsl(hw + 40, 26, 44); g.fillRect(70, 418, 660, 168);
    g.strokeStyle = hsl(hw + 40, 30, 60, .6); g.lineWidth = 3; g.strokeRect(84, 432, 632, 140);
    grains(g, r, 418, 586, 3000, 'rgba(20,14,24,1)', 'rgba(255,255,255,1)');
    g.restore();
  };
  BG.sports = function (g, m, r) {
    var hw = (m * 47 + 200) % 360, i, k;
    g.fillStyle = hsl(hw, 20, 30); g.fillRect(0, 0, W, 342);
    /* dãy tủ sắt */
    for (i = 0; i < 11; i++) {
      var x = i * 73 + 2;
      rectG(g, x, 8, 69, 330, hsl(hw, 24, 62), hsl(hw, 26, 46), true);
      rectG(g, x, 8, 69, 330, 'rgba(255,255,255,.14)', 'rgba(0,0,20,.16)');
      g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, 8, 1.6, 330); g.fillStyle = 'rgba(0,0,20,.4)'; g.fillRect(x + 67, 8, 2, 330);
      for (k = 0; k < 4; k++) { g.fillStyle = 'rgba(0,0,20,.55)'; g.fillRect(x + 14, 22 + k * 8, 40, 3.4); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 14, 25.4 + k * 8, 40, 1); }
      rectG(g, x + 55, 150, 7, 22, '#d6d9de', '#7c8088', true);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + 22, 70, 22, 12); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 25, 75, 16, 1.4);
    }
    wallShade(g, 342);
    wood(g, r, 0, 298, W, 310, 26, 40, 0, 46); g.fillStyle = 'rgba(255,240,215,.35)'; g.fillRect(0, 298, W, 1.6);
    for (i = 0; i < 6; i++) rectG(g, 50 + i * 140, 310, 8, 32, '#9a9da4', '#55585f', true);
    rectG(g, 0, 310, W, 20, 'rgba(20,12,30,.3)', 'rgba(20,12,30,0)');
    wood(g, r, 0, 342, W, H, 34, 62, 22, 46);
    g.strokeStyle = 'rgba(250,250,245,.85)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, 372); g.lineTo(W, 372); g.stroke();
    g.beginPath(); g.ellipse(400, 520, 140, 44, 0, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(400, 372); g.lineTo(400, H); g.stroke();
    roomLight(g, r, 342, 400);
    puff(g, 400, 470, 380, 60, 'rgba(255,255,255,1)', .26);
  };
  BG.fruit = function (g, m, r) {
    var ha = (m * 53) % 360, i;
    wood(g, r, 0, 0, W, 300, 30, 52, 0, 34);
    for (i = 0; i < 20; i++) { g.fillStyle = 'rgba(30,14,4,.4)'; g.fillRect(i * 40, 0, 1.6, 300); g.fillStyle = 'rgba(255,240,215,.16)'; g.fillRect(i * 40 + 1.6, 0, 1.2, 300); }
    wallShade(g, 300);
    /* mái hiên bạt sọc, mép lượn có bóng */
    rectG(g, 0, 54, W, 40, 'rgba(20,12,30,.4)', 'rgba(20,12,30,0)');
    for (i = 0; i < 16; i++) {
      g.fillStyle = i % 2 ? '#f6f2e8' : hsl(ha, 56, 46); g.fillRect(i * 50, 0, 50, 54); g.beginPath(); g.arc(i * 50 + 25, 54, 25, 0, Math.PI); g.fill();
      rectG(g, i * 50, 0, 50, 80, 'rgba(255,255,255,.2)', 'rgba(0,0,20,.2)', true);
    }
    rectG(g, 0, 0, W, 30, 'rgba(20,12,30,.3)', 'rgba(20,12,30,0)');
    shelfBoard(g, r, 250, 26, 36);
    wood(g, r, 0, 300, W, H, 28, 42, 38, 46);
    for (i = 0; i < 5; i++) { g.fillStyle = 'rgba(30,14,4,.5)'; g.fillRect(i * 200 + 99, 306, 2.4, H - 306); }
    g.fillStyle = '#4e3118'; g.fillRect(0, 296, W, 10); g.fillStyle = 'rgba(255,240,215,.3)'; g.fillRect(0, 296, W, 1.6);
    rectG(g, 0, 306, W, 26, 'rgba(20,12,30,.34)', 'rgba(20,12,30,0)');
  };
  BG.petshop = function (g, m, r) {
    var hw = (m * 43 + 140) % 360, i, x, y, k;
    plainWall(g, 342, hw, 24, 84);
    g.fillStyle = hsl(hw, 26, 77, .8);
    for (i = 0; i < 26; i++) {
      x = (i % 9) * 92 + 30 + (Math.floor(i / 9) % 2) * 46; y = Math.floor(i / 9) * 110 + 50;
      g.beginPath(); g.ellipse(x, y, 9, 7, 0, 0, TAU); g.fill();
      for (k = 0; k < 4; k++) { g.beginPath(); g.arc(x - 10 + k * 6.6, y - 11 + (k % 3 ? -3 : 0), 3.2, 0, TAU); g.fill(); }
    }
    wallShade(g, 342);
    shelfBoard(g, r, 200, 30, 56);
    tiles(g, r, 0, 342, W, H, 52, 44, 14, 90, 6, .26);
    baseboard(g, 342);
    roomLight(g, r, 342, 215);
  };
  BG.closet = function (g, m, r) {
    var hw = 26 + (m * 7) % 20, i;
    wood(g, r, 0, 0, W, 382, hw, 56, 0, 36);
    for (i = 1; i < 10; i++) { g.fillStyle = 'rgba(30,14,4,.45)'; g.fillRect(i * 80 - 1, 0, 2, 382); g.fillStyle = 'rgba(255,240,215,.2)'; g.fillRect(i * 80 + 1, 0, 1.2, 382); }
    wallShade(g, 382);
    rectG(g, 0, 0, W, 60, 'rgba(20,12,30,.4)', 'rgba(20,12,30,0)');
    shelfBoard(g, r, 380, hw, 32);
    wood(g, r, 0, 391, W, H, hw - 6, 42, 28);
    rectG(g, 0, 391, W, 40, 'rgba(20,12,30,.4)', 'rgba(20,12,30,0)');
  };
  BG.bathroom = function (g, m, r) {
    var hw = (m * 23 + 170) % 360;
    tiles(g, r, 0, 0, W, 382, 40, hw, 22, 88, 0, .34);
    wallShade(g, 382);
    /* thanh treo inox */
    rectG(g, -4, 206, W + 8, 7, '#f4f8fb', '#8d96a0'); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 207.4, W, 1.2);
    rectG(g, 0, 214, W, 14, 'rgba(20,12,30,.2)', 'rgba(20,12,30,0)');
    bracket(g, 70, 211); bracket(g, 724, 211);
    tiles(g, r, 0, 382, W, H, 50, hw + 20, 12, 70, 8, .3);
    roomLight(g, r, 382, 0);
    g.fillStyle = 'rgba(20,12,30,.26)'; g.fillRect(214, 476, 380, 104);
    g.save(); g.beginPath(); g.rect(210, 470, 380, 104); g.clip();
    g.fillStyle = hsl(hw + 180, 30, 64); g.fillRect(210, 470, 380, 104);
    for (var i = 0; i < 24; i++) { g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(210, 470 + i * 4.4, 380, 1.6); }
    grains(g, r, 470, 574, 1800, 'rgba(20,14,24,1)', 'rgba(255,255,255,1)');
    g.restore();
  };
  BG.workshop = function (g, m, r) {
    var i, j, lit = 56 + (m % 3) * 4;
    /* tấm ván đục lỗ treo đồ */
    vgrad(g, 0, 332, [[0, hsl(30, 28, lit + 4)], [1, hsl(30, 28, lit - 6)]]);
    grains(g, r, 0, 332, 2600, 'rgba(60,40,20,1)', 'rgba(255,240,215,1)');
    for (j = 0; j < 14; j++) for (i = 0; i < 34; i++) {
      g.fillStyle = 'rgba(30,18,8,.75)'; g.beginPath(); g.arc(12 + i * 24, 12 + j * 24, 2.2, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,240,215,.35)'; g.beginPath(); g.arc(12.8 + i * 24, 13 + j * 24, 2.2, .2, 1.8); g.fill();
    }
    wallShade(g, 332);
    rectG(g, 0, 0, W, 6, '#6a4528', '#3e2612');
    roomLight(g, r, 332, 0);
    /* mặt bàn thợ: ván dày, nhiều vết xước */
    wood(g, r, 0, 332, W, H, 28, 48, 40, 40);
    g.strokeStyle = 'rgba(30,14,4,.3)'; g.lineWidth = 1;
    for (i = 0; i < 46; i++) { var x = r() * W, y = 350 + r() * 240, a = r() * TAU, l = 8 + r() * 36; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * .4); g.stroke(); }
    rectG(g, 0, 330, W, 14, '#70492a', '#4b2f17'); g.fillStyle = 'rgba(255,240,215,.3)'; g.fillRect(0, 330, W, 1.6);
    rectG(g, 0, 344, W, 26, 'rgba(20,12,30,.34)', 'rgba(20,12,30,0)');
  };
  BG.party = function (g, m, r) {
    var hp = (m * 36 + 330) % 360, i, j;
    plainWall(g, 330, hp, 34, 88);
    g.fillStyle = hsl(hp, 36, 80, .8);
    if (m % 2 === 0) for (i = 0; i < 20; i++) g.fillRect(i * 44, 0, 22, 330);
    else for (i = 0; i < 18; i++) for (j = 0; j < 8; j++) { g.beginPath(); g.arc(i * 46 + (j % 2) * 23, j * 44 + 20, 7, 0, TAU); g.fill(); }
    wallShade(g, 330);
    roomLight(g, r, 330, 30);
    /* khăn trải bàn kẻ ca rô, có nếp vải */
    g.fillStyle = hsl(hp + 180, 34, 62); g.fillRect(0, 334, W, H - 334);
    g.fillStyle = 'rgba(255,255,255,.3)'; for (i = 0; i < 20; i++) g.fillRect(i * 44, 334, 22, H - 334);
    g.fillStyle = 'rgba(255,255,255,.24)'; for (i = 0; i < 14; i++) g.fillRect(0, 334 + i * 44, W, 22);
    for (i = 0; i < 12; i++) { var x = r() * W; rectG(g, x, 334, 30 + r() * 50, H - 334, 'rgba(255,255,255,.12)', 'rgba(20,12,30,.12)', true); }
    grains(g, r, 334, H, 2200, 'rgba(30,20,30,1)', 'rgba(255,255,255,1)');
    rectG(g, 0, 322, W, 12, hsl(hp, 20, 40, .2), hsl(hp, 20, 30, .5));
    rectG(g, 0, 334, W, 30, 'rgba(20,12,30,.3)', 'rgba(20,12,30,0)');
    /* dây cờ tam giác chùng xuống */
    g.strokeStyle = 'rgba(80,60,60,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, 4);
    for (i = 0; i < 9; i++) g.quadraticCurveTo(i * 100 + 28, 16, i * 100 + 100, 4);
    g.stroke();
    for (i = 0; i < 9; i++) {
      g.beginPath(); g.moveTo(i * 100 + 8, 8); g.lineTo(i * 100 + 50, 8); g.lineTo(i * 100 + 30, 38); g.closePath();
      g.fillStyle = 'rgba(20,12,30,.2)'; g.save(); g.translate(3, 4); g.fill(); g.restore();
      g.fillStyle = hsl(hp + i * 40, 56, 56); g.fill();
      var gr = g.createLinearGradient(i * 100 + 8, 0, i * 100 + 50, 0); gr.addColorStop(0, 'rgba(255,255,255,.3)'); gr.addColorStop(1, 'rgba(0,0,20,.2)'); g.fillStyle = gr; g.fill();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
