/* Gió mùa - đồ họa tranh cắt giấy nhiều lớp. Mọi hình vẽ bằng Canvas 2D trong mã, không dùng ảnh ngoài.
   Lớp tĩnh (núi, tre, làng, mặt đất) vẽ sẵn thành ô 512 đơn vị và chỉ vẽ ô đang thấy. */
(function () {
  'use strict';
  const { H, GROUND, clamp } = window.GM;
  const TILE = 512;
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
  const outBack = t => { const c = 1.9; t = clamp(t, 0, 1) - 1; return 1 + (c + 1) * t * t * t + c * t * t; };
  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')'; }
  function mixA(a, b, t, al) { const A = hex(a), B = hex(b); return 'rgba(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ',' + al + ')'; }

  // ================= BẢNG MÀU THEO GIỜ =================
  const SKY = [
    [0.00, '#e9a991', '#fde3c4', '#fff1d6'],
    [0.22, '#93c3e3', '#f3ead6', '#fff6e0'],
    [0.50, '#79b8e0', '#e2f0ec', '#fffbe9'],
    [0.74, '#e99c74', '#fcdcaa', '#ffe0a0'],
    [0.90, '#9a6688', '#f19a72', '#ffc07a'],
    [1.00, '#3a3159', '#d9806a', '#ffb070'],
  ];
  function skyAt(tod) {
    let i = 0; while (i < SKY.length - 2 && tod > SKY[i + 1][0]) i++;
    const a = SKY[i], b = SKY[i + 1], t = ease((tod - a[0]) / (b[0] - a[0]));
    return { top: mix(a[1], b[1], t), bot: mix(a[2], b[2], t), sun: mix(a[3], b[3], t), dusk: clamp((tod - 0.78) / 0.22, 0, 1), dawn: clamp(1 - tod / 0.2, 0, 1) };
  }

  // ================= TIỆN ÍCH VẼ =================
  function paper(c, rs, off, fn) {
    c.save(); c.shadowColor = 'rgba(64,38,22,.30)'; c.shadowBlur = 5 * rs; c.shadowOffsetY = (off || 3) * rs; fn(); c.restore();
  }
  function blob(c, pts) { // đường cong khép kín đi qua các điểm
    c.beginPath();
    const n = pts.length;
    c.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    c.closePath();
  }
  function noiseCanvas(size, seed) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d'), img = c.createImageData(size, size), r = GM.rng(seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r(), fib = r() < 0.012;
      const dark = v < 0.5;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = dark ? 60 : 255;
      img.data[i + 3] = fib ? 40 : Math.round(Math.abs(v - 0.5) * 30);
    }
    c.putImageData(img, 0, 0);
    // vài sợi xơ giấy
    c.strokeStyle = 'rgba(90,60,30,.10)'; c.lineWidth = 0.7;
    for (let i = 0; i < 26; i++) { const x = r() * size, y = r() * size, a = r() * TAU, l = 6 + r() * 14; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
    return cv;
  }

  // ================= HÌNH TĨNH =================
  function mountains(r, len) {
    const S = [];
    const bands = [['#bccfd9', 236, 70, 0.0035], ['#a5bccb', 262, 90, 0.005], ['#8fa9bb', 292, 70, 0.007]];
    bands.forEach((b, bi) => {
      const pts = []; let x = -100;
      const ph = r() * 100;
      while (x < len + 200) {
        // núi đá vôi đồng bằng: đỉnh tròn, sườn dốc
        const y = b[1] - (0.3 + 0.7 * Math.abs(Math.sin(x * b[3] + ph))) * b[2] - Math.sin(x * b[3] * 3.1 + ph * 2) * 22 - Math.sin(x * b[3] * 7.3 + ph) * 8 - (r() * 12);
        pts.push([x, y]); x += 34 + r() * 30;
      }
      S.push({ x0: -200, x1: len + 300, draw(c, rs) {
        paper(c, rs, 2, () => {
          c.fillStyle = b[0]; c.beginPath(); c.moveTo(-200, H);
          for (let i = 0; i < pts.length - 1; i++) { const p = pts[i], q = pts[i + 1]; c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
          c.lineTo(len + 300, H); c.closePath(); c.fill();
        });
        if (bi === 0) { // sương mờ chân núi
          const g = c.createLinearGradient(0, 230, 0, 330); g.addColorStop(0, 'rgba(255,250,240,0)'); g.addColorStop(1, 'rgba(255,250,240,.55)');
          c.fillStyle = g; c.fillRect(-200, 230, len + 500, 120);
        }
      } });
    });
    return S;
  }

  function bambooClump(c, rs, x, base, h, r, col) {
    const n = 7 + (r() * 5 | 0);
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const sx = x + (i - n / 2) * 5 + r() * 4, lean = (r() - 0.45) * h * 0.5, hh = h * (0.7 + r() * 0.35);
      c.strokeStyle = i % 2 ? col[2] : col[3]; c.lineWidth = 2.6;
      c.beginPath(); c.moveTo(sx, base); c.quadraticCurveTo(sx + lean * 0.2, base - hh * 0.6, sx + lean, base - hh); c.stroke();
    }
    // tán lá: khối nền mềm rồi các chùm lá tre mảnh rủ xuống
    c.fillStyle = col[0];
    for (let k = 0; k < 7; k++) { const lx = x + (r() - 0.5) * h * 0.7, ly = base - h * (0.55 + r() * 0.45); c.beginPath(); c.ellipse(lx, ly, 16 + r() * 10, 9 + r() * 5, (r() - 0.5) * 0.6, 0, TAU); c.fill(); }
    for (let k = 0; k < 16; k++) {
      const sx = x + (r() - 0.5) * h * 0.95, sy = base - h * (0.4 + r() * 0.68), side = r() < 0.5 ? -1 : 1;
      c.fillStyle = k % 3 === 0 ? col[1] : k % 3 === 1 ? col[0] : col[3];
      for (let l = 0; l < 5; l++) {
        const a = side * (0.5 + l * 0.22) + Math.PI / 2 - 0.2, len = 9 + r() * 6;
        c.save(); c.translate(sx + side * l * 3, sy + l * 2); c.rotate(a);
        c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(len * 0.5, -2.6, len, 0); c.quadraticCurveTo(len * 0.5, 2.6, 0, 0); c.fill();
        c.restore();
      }
    }
  }
  function curvedRoof(c, x, y, w, h, col, dark) { // mái cong đầu đao
    c.fillStyle = col; c.beginPath();
    c.moveTo(x - w / 2 - 12, y - 8);
    c.quadraticCurveTo(x - w / 2 + 2, y + 2, x - w / 2 + 10, y);
    c.lineTo(x + w / 2 - 10, y);
    c.quadraticCurveTo(x + w / 2 - 2, y + 2, x + w / 2 + 12, y - 8);
    c.lineTo(x + w / 2 - 14, y - h);
    c.lineTo(x - w / 2 + 14, y - h);
    c.closePath(); c.fill();
    c.fillStyle = dark; c.fillRect(x - w / 2 + 12, y - h - 3, w - 24, 4);
    // ngói
    c.strokeStyle = 'rgba(0,0,0,.13)'; c.lineWidth = 1;
    for (let i = 1; i < 4; i++) { const yy = y - h * i / 4; c.beginPath(); c.moveTo(x - w / 2 + 6 + i * 2, yy); c.lineTo(x + w / 2 - 6 - i * 2, yy); c.stroke(); }
  }
  function dinh(c, rs, x, base, s) {
    paper(c, rs, 3, () => {
      c.fillStyle = '#7d5a4c'; c.fillRect(x - 50 * s, base - 34 * s, 100 * s, 34 * s);
      curvedRoof(c, x, base - 30 * s, 132 * s, 26 * s, '#6b4b45', '#4f3632');
      curvedRoof(c, x, base - 58 * s, 92 * s, 22 * s, '#6b4b45', '#4f3632');
    });
  }
  function banyan(c, rs, x, base, s, col) {
    paper(c, rs, 3, () => {
      c.fillStyle = '#6a5446'; c.beginPath(); c.moveTo(x - 10 * s, base); c.quadraticCurveTo(x - 4 * s, base - 40 * s, x - 16 * s, base - 70 * s); c.lineTo(x + 14 * s, base - 70 * s); c.quadraticCurveTo(x + 6 * s, base - 40 * s, x + 12 * s, base); c.closePath(); c.fill();
      c.fillStyle = col[0];
      [[-46, -82, 46, 30], [0, -104, 56, 36], [44, -84, 44, 28], [-20, -64, 40, 20], [26, -62, 40, 20]].forEach(e => { c.beginPath(); c.ellipse(x + e[0] * s, base + e[1] * s, e[2] * s, e[3] * s, 0, 0, TAU); c.fill(); });
      c.fillStyle = col[1];
      [[-30, -96, 26, 14], [16, -116, 30, 14], [50, -92, 18, 10]].forEach(e => { c.beginPath(); c.ellipse(x + e[0] * s, base + e[1] * s, e[2] * s, e[3] * s, 0, 0, TAU); c.fill(); });
    });
  }
  function house(c, rs, x, base, w, s, r, opt) {
    const wallH = 34 * s, roofH = 30 * s;
    paper(c, rs, 3, () => {
      c.fillStyle = opt.wall; c.fillRect(x - w / 2, base - wallH, w, wallH);
      curvedRoof(c, x, base - wallH + 2, w + 22 * s, roofH, opt.roof, opt.roofD);
    });
    // cửa, cửa sổ
    c.fillStyle = opt.door; c.fillRect(x - 8 * s, base - 22 * s, 16 * s, 22 * s);
    c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(x - w / 2, base - wallH, w, 4 * s);
    const wins = [];
    [-1, 1].forEach(sd => { if (w > 70 * s) { const wx = x + sd * w * 0.3; c.fillStyle = opt.door; c.fillRect(wx - 7 * s, base - 26 * s, 14 * s, 11 * s); c.strokeStyle = opt.wall; c.lineWidth = 1.3; c.beginPath(); c.moveTo(wx, base - 26 * s); c.lineTo(wx, base - 15 * s); c.stroke(); wins.push([wx, base - 20.5 * s, 7 * s]); } });
    wins.push([x, base - 11 * s, 8 * s]);
    return wins;
  }
  function areca(c, rs, x, base, h, r) {
    c.strokeStyle = '#8a7a63'; c.lineWidth = 3; c.lineCap = 'round';
    const lean = (r() - 0.5) * 14;
    c.beginPath(); c.moveTo(x, base); c.quadraticCurveTo(x + lean * 0.3, base - h * 0.5, x + lean, base - h); c.stroke();
    c.strokeStyle = 'rgba(60,40,20,.25)'; c.lineWidth = 1;
    for (let i = 1; i < 8; i++) { const yy = base - h * i / 8, xx = x + lean * Math.pow(i / 8, 2); c.beginPath(); c.moveTo(xx - 2, yy); c.lineTo(xx + 2, yy); c.stroke(); }
    const tx = x + lean, ty = base - h;
    c.strokeStyle = '#4f8a52'; c.lineWidth = 3.2;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.42, l = 26 + r() * 8;
      c.beginPath(); c.moveTo(tx, ty); c.quadraticCurveTo(tx + Math.cos(a) * l * 0.6, ty + Math.sin(a) * l * 0.6 - 6, tx + Math.cos(a) * l, ty + Math.sin(a) * l + Math.abs(Math.cos(a)) * 12); c.stroke();
    }
    c.fillStyle = '#c99a3c'; c.beginPath(); c.arc(tx + 3, ty + 6, 3.5, 0, TAU); c.fill();
  }
  function peach(c, rs, x, base, s, r) {
    c.strokeStyle = '#5d4038'; c.lineCap = 'round';
    const tips = [];
    function br(x0, y0, a, l, w, d) {
      const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l;
      c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2 + (r() - 0.5) * 8, (y0 + y1) / 2, x1, y1); c.stroke();
      if (d > 0) { br(x1, y1, a - 0.5 - r() * 0.3, l * 0.72, w * 0.66, d - 1); br(x1, y1, a + 0.45 + r() * 0.3, l * 0.7, w * 0.66, d - 1); }
      else tips.push([x1, y1]);
    }
    br(x, base, -Math.PI / 2 + (r() - 0.5) * 0.2, 26 * s, 5 * s, 3);
    tips.forEach(t => {
      for (let k = 0; k < 6; k++) {
        const px = t[0] + (r() - 0.5) * 16 * s, py = t[1] + (r() - 0.5) * 14 * s;
        c.fillStyle = r() < 0.3 ? '#fbd2dc' : r() < 0.6 ? '#f39cb2' : '#e86f8e';
        c.beginPath(); c.arc(px, py, (2.2 + r() * 2.4) * s, 0, TAU); c.fill();
      }
    });
  }
  function haystack(c, rs, x, base, s) {
    paper(c, rs, 2, () => {
      c.fillStyle = '#e1b85c'; c.beginPath(); c.moveTo(x - 20 * s, base); c.quadraticCurveTo(x - 22 * s, base - 30 * s, x, base - 40 * s); c.quadraticCurveTo(x + 22 * s, base - 30 * s, x + 20 * s, base); c.closePath(); c.fill();
    });
    c.strokeStyle = 'rgba(140,90,30,.35)'; c.lineWidth = 1;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(x - 18 * s + i * 3, base - 8 * s - i * 8 * s); c.quadraticCurveTo(x, base - 12 * s - i * 8 * s, x + 18 * s - i * 3, base - 8 * s - i * 8 * s); c.stroke(); }
    c.strokeStyle = '#6b4b35'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, base - 38 * s); c.lineTo(x, base - 50 * s); c.stroke();
  }
  function buffalo(c, rs, x, base, s, flip) {
    c.save(); c.translate(x, base); c.scale(flip ? -s : s, s);
    paper(c, rs, 2, () => {
      c.fillStyle = '#5b5960';
      c.beginPath(); c.ellipse(0, -20, 26, 13, 0, 0, TAU); c.fill();
      c.fillRect(-20, -14, 6, 14); c.fillRect(-8, -12, 6, 12); c.fillRect(10, -12, 6, 12); c.fillRect(18, -14, 6, 14);
      c.beginPath(); c.ellipse(30, -24, 10, 8, 0.3, 0, TAU); c.fill();
    });
    c.strokeStyle = '#d9d2c3'; c.lineWidth = 2.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(28, -30); c.quadraticCurveTo(20, -42, 30, -44); c.stroke();
    c.beginPath(); c.moveTo(34, -30); c.quadraticCurveTo(42, -40, 36, -46); c.stroke();
    c.strokeStyle = '#5b5960'; c.lineWidth = 2; c.beginPath(); c.moveTo(-26, -22); c.quadraticCurveTo(-34, -14, -31, -6); c.stroke();
    c.restore();
  }
  function fence(c, x0, x1, base) {
    c.strokeStyle = '#a07e57'; c.lineWidth = 2;
    for (let x = x0; x < x1; x += 11) { c.beginPath(); c.moveTo(x, base); c.lineTo(x + 1, base - 16); c.stroke(); }
    c.lineWidth = 1.6; c.beginPath(); c.moveTo(x0, base - 11); c.lineTo(x1, base - 11); c.moveTo(x0, base - 5); c.lineTo(x1, base - 5); c.stroke();
  }

  // ================= DỰNG CẢNH CHẶNG =================
  const BAMBOO = ['#6f9d63', '#88b672', '#4e7a4c', '#5d8a56'];
  const BAMBOO2 = ['#5a8a57', '#73a466', '#3f6a42', '#4c7a4b'];
  function buildScene(G) {
    const r = GM.rng(G.L.seed * 131 + 7);
    const len = G.len, W = G.W;
    const layerLen = par => W + (len - W) * par + 400;
    const L = [];
    // lớp 1: núi xa
    L.push({ par: 0.12, shapes: mountains(r, layerLen(0.12)) });
    // lớp 2: lũy tre, đình, cây đa, mặt đất xa
    const s2 = [];
    const l2 = layerLen(0.32);
    s2.push({ x0: -200, x1: l2 + 200, draw(c, rs) {
      paper(c, rs, 2, () => { c.fillStyle = '#a9c98a'; c.beginPath(); c.moveTo(-200, 330); for (let x = -200; x <= l2 + 200; x += 60) c.lineTo(x, 328 + Math.sin(x * 0.01) * 4); c.lineTo(l2 + 200, H); c.lineTo(-200, H); c.closePath(); c.fill(); });
    } });
    for (let x = 40; x < l2; x += 70 + r() * 90) {
      const kind = r(), bx = x, base = 334 + r() * 6;
      if (kind < 0.1) s2.push({ x0: bx - 90, x1: bx + 90, draw: (c, rs) => dinh(c, rs, bx, base, 0.8) });
      else if (kind < 0.2) s2.push({ x0: bx - 80, x1: bx + 80, draw: (c, rs) => banyan(c, rs, bx, base, 0.75, BAMBOO) });
      else { const h = 70 + r() * 40, sd = r() * 1e6 | 0; s2.push({ x0: bx - 60, x1: bx + 60, draw: (c, rs) => paper(c, rs, 3, () => bambooClump(c, rs, bx, base, h, GM.rng(sd), BAMBOO)) }); }
    }
    L.push({ par: 0.32, shapes: s2 });
    // lớp 3: làng gần, cau, đào, đụn rơm, ruộng bậc xa
    const s3 = [], l3 = layerLen(0.62);
    s3.push({ x0: -200, x1: l3 + 200, draw(c, rs) {
      paper(c, rs, 3, () => {
        c.fillStyle = '#9cc373'; c.beginPath(); c.moveTo(-200, 368);
        for (let x = -200; x <= l3 + 200; x += 40) c.lineTo(x, 366 + Math.sin(x * 0.013) * 5);
        c.lineTo(l3 + 200, H); c.lineTo(-200, H); c.closePath(); c.fill();
      });
      // ruộng xa: dải sọc
      c.strokeStyle = 'rgba(80,120,60,.18)'; c.lineWidth = 1.2;
      for (let y = 380; y < 420; y += 9) { c.beginPath(); c.moveTo(-200, y); c.lineTo(l3 + 200, y + 2); c.stroke(); }
    } });
    const pal = [['#f1e2c4', '#b5523b', '#8e3d2c', '#6b4a3a'], ['#efe6d2', '#a9533e', '#7e3a2a', '#5e4335'], ['#e9d7b3', '#9a5a46', '#6e3d2f', '#5a3e30']];
    for (let x = 30; x < l3; x += 60 + r() * 110) {
      const k = r(), bx = x, base = 372 + r() * 4;
      if (k < 0.34) { const p = pal[r() * 3 | 0], w = 80 + r() * 40; s3.push({ x0: bx - 80, x1: bx + 80, draw: (c, rs) => house(c, rs, bx, base, w, 0.85, r, { wall: p[0], roof: p[1], roofD: p[2], door: p[3] }) }); }
      else if (k < 0.55) { const h = 90 + r() * 40, sd = r() * 1e6 | 0; s3.push({ x0: bx - 50, x1: bx + 50, draw: (c, rs) => paper(c, rs, 3, () => areca(c, rs, bx, base, h, GM.rng(sd))) }); }
      else if (k < 0.75) { const sd = r() * 1e6 | 0; s3.push({ x0: bx - 60, x1: bx + 60, draw: (c, rs) => paper(c, rs, 3, () => peach(c, rs, bx, base, 1.0, GM.rng(sd))) }); }
      else if (k < 0.88) s3.push({ x0: bx - 40, x1: bx + 40, draw: (c, rs) => haystack(c, rs, bx, base, 0.9) });
      else { const sd = r() * 1e6 | 0, h = 80 + r() * 30; s3.push({ x0: bx - 60, x1: bx + 60, draw: (c, rs) => paper(c, rs, 3, () => bambooClump(c, rs, bx, base, h, GM.rng(sd), BAMBOO2)) }); }
    }
    L.push({ par: 0.62, shapes: s3 });
    // lớp 4: mặt đất chính
    const s4 = [], busy = [];
    G.fields.forEach(f => busy.push([f.x - 30, f.x + f.w + 30]));
    G.mats.forEach(m => busy.push([m.x - 40, m.x + m.w + 40]));
    G.kites.forEach(k => busy.push([k.kidX - 60, k.kidX + 80]));
    G.dands.forEach(d => busy.push([d.x - 40, d.x + 40]));
    G.beds.forEach(b => busy.push([b.x - 30, b.x + b.w + 30]));
    G.roofs.forEach(o => busy.push([o.x - o.w / 2 - 30, o.x + o.w / 2 + 30]));
    const free = (a, b) => busy.every(o => b < o[0] || a > o[1]);
    s4.push({ x0: -200, x1: len + 200, draw(c, rs) {
      paper(c, rs, -3, () => {
        const g = c.createLinearGradient(0, GROUND, 0, H); g.addColorStop(0, '#8fbf62'); g.addColorStop(1, '#5f8f45');
        c.fillStyle = g; c.beginPath(); c.moveTo(-200, GROUND + 2);
        for (let x = -200; x <= len + 200; x += 30) c.lineTo(x, GROUND + Math.sin(x * 0.02) * 2.5 + Math.sin(x * 0.051) * 1.5);
        c.lineTo(len + 200, H); c.lineTo(-200, H); c.closePath(); c.fill();
      });
      // đường đất
      paper(c, rs, 2, () => { c.fillStyle = '#dcbf8f'; c.beginPath(); c.moveTo(-200, 470); for (let x = -200; x <= len + 200; x += 40) c.lineTo(x, 468 + Math.sin(x * 0.009) * 6); for (let x = len + 200; x >= -200; x -= 40) c.lineTo(x, 486 + Math.sin(x * 0.009) * 6); c.closePath(); c.fill(); });
      c.fillStyle = 'rgba(120,80,40,.18)';
      for (let x = -200; x < len + 200; x += 23) { c.beginPath(); c.ellipse(x + (x * 7 % 13), 476 + Math.sin(x * 0.009) * 6 + (x % 5), 3, 1.4, 0, 0, TAU); c.fill(); }
    } });
    const chims = [], wins = [];
    for (let x = 60; x < len - 40; x += 70 + r() * 80) {
      const k = r(), bx = x;
      if (k < 0.32 && free(bx - 70, bx + 70)) {
        const p = pal[r() * 3 | 0], w = 96 + r() * 30;
        chims.push([bx + w * 0.28, GROUND - 60]);
        s4.push({ x0: bx - 90, x1: bx + 90, draw(c, rs) { const ws = house(c, rs, bx, GROUND + 4, w, 1.1, r, { wall: p[0], roof: p[1], roofD: p[2], door: p[3] }); if (!this.done) { this.done = 1; ws.forEach(o => wins.push(o)); } } });
        x += 60;
      } else if (k < 0.48 && free(bx - 50, bx + 50)) { const sd = r() * 1e6 | 0; s4.push({ x0: bx - 70, x1: bx + 70, draw: (c, rs) => paper(c, rs, 3, () => peach(c, rs, bx, GROUND + 2, 1.35, GM.rng(sd))) }); }
      else if (k < 0.6 && free(bx - 40, bx + 40)) { const h = 130 + r() * 50, sd = r() * 1e6 | 0; s4.push({ x0: bx - 50, x1: bx + 50, draw: (c, rs) => paper(c, rs, 3, () => areca(c, rs, bx, GROUND + 2, h, GM.rng(sd))) }); }
      else if (k < 0.68 && free(bx - 50, bx + 50)) { const fl = r() < 0.5; s4.push({ x0: bx - 60, x1: bx + 60, draw: (c, rs) => buffalo(c, rs, bx, GROUND + 4, 0.95, fl) }); }
      else if (k < 0.8 && free(bx - 30, bx + 30)) s4.push({ x0: bx - 40, x1: bx + 40, draw: (c, rs) => haystack(c, rs, bx, GROUND + 3, 1.15) });
      else if (free(bx - 40, bx + 40)) s4.push({ x0: bx - 40, x1: bx + 40, draw: c => fence(c, bx - 35, bx + 35, GROUND + 4) });
    }
    L.push({ par: 1, shapes: s4 });
    const tufts = [];
    for (let x = -100; x < len * 1.25 + W; x += 26 + r() * 40) tufts.push({ x, h: 14 + r() * 18, n: 3 + (r() * 3 | 0), c: r() < 0.5 ? '#4f7f3c' : '#679a48', fl: r() < 0.12 });
    const birds = [];
    for (let i = 0; i < 5; i++) birds.push({ x: r() * W, y: 80 + r() * 60, ph: r() * 6 });
    return { layers: L.map(l => ({ par: l.par, shapes: l.shapes, tiles: new Map() })), chims, wins, tufts, birds, r };
  }

  // ================= TRẠNG THÁI VẼ =================
  const A = {
    cv: null, c: null, S: 1, W: 960, scene: null, rs: 1, grain: null, grainPat: null, vign: null,
    trails: [], petals: [], smoke: [], parts: [], rings: [], rainP: [], bolts: [], spr: new Map(), time: 0, reduce: false,
  };
  function init(cv) {
    A.cv = cv; A.c = cv.getContext('2d');
    A.grain = noiseCanvas(220, 99);
    A.reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function resize(W, S) {
    A.W = W; A.S = S; A.rs = Math.min(S, 2.2);
    A.grainPat = A.c.createPattern(A.grain, 'repeat');
    // viền tối nhẹ
    const v = document.createElement('canvas'); v.width = A.cv.width; v.height = A.cv.height;
    const vc = v.getContext('2d'), g = vc.createRadialGradient(v.width / 2, v.height * 0.45, v.height * 0.35, v.width / 2, v.height * 0.5, v.width * 0.72);
    g.addColorStop(0, 'rgba(40,20,10,0)'); g.addColorStop(1, 'rgba(40,20,10,.30)');
    vc.fillStyle = g; vc.fillRect(0, 0, v.width, v.height); A.vign = v;
    if (A.scene) A.scene.layers.forEach(l => l.tiles.clear());
    A.spr.clear();
  }
  function setLevel(G) {
    A.scene = buildScene(G);
    A.trails.length = 0; A.petals.length = 0; A.smoke.length = 0; A.parts.length = 0; A.rings.length = 0; A.rainP.length = 0; A.bolts.length = 0;
    const r = A.scene.r;
    for (let i = 0; i < (G.storm ? 40 : 60); i++) A.petals.push(newPetal(G, r, true));
  }
  function newPetal(G, r, any) {
    return { x: G.cam + (any ? r() * A.W : -20 - r() * 60), y: any ? r() * GROUND : 40 + r() * 300, vx: 0, vy: 0, a: r() * TAU, f: r() * TAU, s: 2.4 + r() * 2.2, leaf: G.storm ? true : r() < 0.15 };
  }

  function getTile(layer, ti) {
    let t = layer.tiles.get(ti);
    if (t) return t;
    const rs = A.rs, cv = document.createElement('canvas');
    cv.width = Math.ceil(TILE * rs); cv.height = Math.ceil(H * rs);
    const c = cv.getContext('2d');
    c.scale(rs, rs); c.translate(-ti * TILE, 0);
    const x0 = ti * TILE - 10, x1 = (ti + 1) * TILE + 10;
    c.beginPath(); c.rect(x0, 0, TILE + 20, H); c.clip();
    layer.shapes.forEach(s => { if (s.x1 >= x0 - 120 && s.x0 <= x1 + 120) s.draw(c, rs); });
    layer.tiles.set(ti, cv);
    if (layer.tiles.size > 8) { const k = layer.tiles.keys().next().value; layer.tiles.delete(k); }
    return cv;
  }
  function drawLayer(c, layer, cam) {
    const off = cam * layer.par, a = Math.floor(off / TILE), b = Math.floor((off + A.W) / TILE);
    for (let ti = a; ti <= b; ti++) {
      if (ti < -1) continue;
      const t = getTile(layer, ti);
      c.drawImage(t, ti * TILE - off, 0, TILE + 0.6, H);
    }
  }

  // ================= SPRITE MÂY =================
  function cloudSprite(size, dark, seed) {
    const key = size + (dark ? 'd' : '') + (seed % 5 | 0);
    let s = A.spr.get(key); if (s) return s;
    const R = GM.cloudR({ size, dark }), rs = A.rs, pad = 18;
    // khung đủ cao cho cụm bông giữa (cao tới ~1,6R) và bóng đổ phía dưới
    const ty = pad + R * 1.75, w = (R * 2.6 + pad * 2), h = ty + R * 0.42 + pad;
    const cv = document.createElement('canvas'); cv.width = Math.ceil(w * rs); cv.height = Math.ceil(h * rs);
    const c = cv.getContext('2d'); c.scale(rs, rs); c.translate(w / 2, ty);
    const r = GM.rng(seed % 5 * 977 + size * 31 + (dark ? 7 : 0) + 1);
    const base = dark ? '#5a6274' : size >= 3 ? '#9aa8bd' : size === 2 ? '#dfe5ee' : '#fbfdff';
    const lite = dark ? '#7a8496' : size >= 3 ? '#b8c4d4' : size === 2 ? '#f1f4f8' : '#ffffff';
    const shade = dark ? '#3e4556' : size >= 3 ? '#7d8ba1' : size === 2 ? '#bcc6d4' : '#dfe8f1';
    const puffs = [];
    const n = 4 + size * 2;
    for (let i = 0; i < n; i++) { const t = i / (n - 1); puffs.push([(t - 0.5) * R * 2.0, -Math.sin(t * Math.PI) * R * (0.42 + r() * 0.25), R * (0.38 + Math.sin(t * Math.PI) * 0.36 + r() * 0.1)]); }
    // thân mây: các bông tròn + đáy bo tròn nhẹ (không dùng hình chữ nhật để khỏi lộ vạch cứng)
    const body = () => {
      c.beginPath(); puffs.forEach(p => { c.moveTo(p[0] + p[2], p[1]); c.arc(p[0], p[1], p[2], 0, TAU); });
      c.moveTo(-R * 1.05, R * 0.1); c.quadraticCurveTo(-R * 1.1, R * 0.3, -R * 0.8, R * 0.3); c.lineTo(R * 0.8, R * 0.3); c.quadraticCurveTo(R * 1.1, R * 0.3, R * 1.05, R * 0.1); c.lineTo(R * 1.0, -R * 0.15); c.lineTo(-R * 1.0, -R * 0.15); c.closePath();
    };
    c.save(); c.shadowColor = 'rgba(50,60,80,.28)'; c.shadowBlur = 8 * rs; c.shadowOffsetY = 5 * rs;
    c.fillStyle = shade; body(); c.fill(); c.restore();
    c.fillStyle = base; c.save(); c.translate(0, -3); c.scale(0.985, 0.97); body(); c.fill(); c.restore();
    c.fillStyle = lite; c.globalAlpha = 0.85;
    puffs.forEach(p => { c.beginPath(); c.arc(p[0] - p[2] * 0.18, p[1] - p[2] * 0.25 - 3, p[2] * 0.62, 0, TAU); c.fill(); });
    c.globalAlpha = 1;
    s = { cv, w, h, oy: ty - R * 0.12 }; A.spr.set(key, s); return s;
  }

  // ================= NHÂN VẬT =================
  const SHIRTS = ['#3f7fbf', '#e0654b', '#f2b84b', '#6aa84f', '#9a6bc0'];
  function kid(c, x, y, shirt, pose, t, hand) {
    // y: chân chạm đất
    const bob = pose === 'cheer' ? -Math.abs(Math.sin(t * 9)) * 7 : 0;
    c.save(); c.translate(x, y + bob);
    c.fillStyle = 'rgba(40,30,20,.18)'; c.beginPath(); c.ellipse(0, 1 - bob, 11, 3, 0, 0, TAU); c.fill();
    c.fillStyle = '#3c3a46'; c.fillRect(-6, -14, 5, 14); c.fillRect(1, -14, 5, 14);
    c.fillStyle = shirt; c.beginPath(); c.moveTo(-9, -14); c.lineTo(9, -14); c.lineTo(7, -32); c.lineTo(-7, -32); c.closePath(); c.fill();
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.arc(0, -40, 8.5, 0, TAU); c.fill();
    c.fillStyle = '#2b2226'; c.beginPath(); c.arc(0, -42, 8.6, Math.PI * 1.05, Math.PI * 1.95); c.fill(); c.fillRect(-8.6, -43, 17.2, 3);
    // mặt
    c.fillStyle = '#2b2226';
    if (pose === 'sad') { c.fillRect(-4, -39, 2, 1.4); c.fillRect(2, -39, 2, 1.4); c.beginPath(); c.arc(0, -33.5, 2.4, Math.PI * 1.15, Math.PI * 1.85); c.strokeStyle = '#2b2226'; c.lineWidth = 1; c.stroke(); }
    else { c.beginPath(); c.arc(-3, -39, 1.2, 0, TAU); c.arc(3, -39, 1.2, 0, TAU); c.fill(); c.strokeStyle = '#2b2226'; c.lineWidth = 1; c.beginPath(); c.arc(0, -37, 2.6, 0.2, Math.PI - 0.2); c.stroke(); c.fillStyle = 'rgba(240,120,110,.45)'; c.beginPath(); c.arc(-5.5, -36.5, 1.8, 0, TAU); c.arc(5.5, -36.5, 1.8, 0, TAU); c.fill(); }
    // tay
    c.strokeStyle = '#f2c9a0'; c.lineWidth = 3.2; c.lineCap = 'round';
    if (pose === 'cheer') { c.beginPath(); c.moveTo(-6, -29); c.lineTo(-12, -44); c.moveTo(6, -29); c.lineTo(12, -44); c.stroke(); }
    else if (hand) { c.beginPath(); c.moveTo(6, -29); c.lineTo(hand[0] - x, hand[1] - y - bob); c.moveTo(-6, -29); c.lineTo(-9, -18); c.stroke(); }
    else { c.beginPath(); c.moveTo(-6, -29); c.lineTo(-9, -17); c.moveTo(6, -29); c.lineTo(9, -17); c.stroke(); }
    c.restore();
  }
  function farmer(c, x, y, t, worry) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(40,30,20,.18)'; c.beginPath(); c.ellipse(0, 1, 13, 3, 0, 0, TAU); c.fill();
    c.fillStyle = '#4a3b32'; c.fillRect(-6, -18, 5, 18); c.fillRect(1, -18, 5, 18);
    c.fillStyle = '#7a5b8c'; c.beginPath(); c.moveTo(-10, -18); c.lineTo(10, -18); c.lineTo(8, -40); c.lineTo(-8, -40); c.closePath(); c.fill();
    c.fillStyle = '#e9bf94'; c.beginPath(); c.arc(0, -47, 7.5, 0, TAU); c.fill();
    // nón lá
    c.fillStyle = '#efd9a0'; c.beginPath(); c.moveTo(-19, -47); c.lineTo(0, -64); c.lineTo(19, -47); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(120,90,40,.4)'; c.lineWidth = 0.8; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-19 + i * 4.7, -47 - i * 4.2); c.lineTo(19 - i * 4.7, -47 - i * 4.2); c.stroke(); }
    // cào
    const sw = worry ? Math.sin(t * 14) * 0.25 : Math.sin(t * 2.2) * 0.35;
    c.save(); c.translate(8, -30); c.rotate(0.6 + sw);
    c.strokeStyle = '#8a6a44'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 34); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.moveTo(-8, 34); c.lineTo(8, 34); c.stroke();
    c.restore();
    c.strokeStyle = '#e9bf94'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(6, -36); c.lineTo(10, -28); c.stroke();
    if (worry) { c.fillStyle = '#5aa7e8'; c.beginPath(); c.moveTo(14, -60); c.quadraticCurveTo(18, -54, 14, -51); c.quadraticCurveTo(10, -54, 14, -60); c.fill(); }
    c.restore();
  }

  // ================= VẼ VẬT ĐỘNG =================
  const tmp = {};
  function windAt(G, x, y) { return G.field.sample(x, y, tmp); }

  function drawField(c, G, f, t) {
    const x = f.x, w = f.w, top = GROUND - 2, d = 30;
    const wet = f.water, green = ease(clamp((wet - 0.15) / 0.85, 0, 1));
    // bờ
    c.fillStyle = 'rgba(60,40,20,.20)'; c.beginPath(); c.moveTo(x - 6, top + 3); c.lineTo(x + w + 6, top + 3); c.lineTo(x + w + 20, top + d + 3); c.lineTo(x - 20, top + d + 3); c.closePath(); c.fill();
    c.fillStyle = '#c9a874'; c.beginPath(); c.moveTo(x - 6, top); c.lineTo(x + w + 6, top); c.lineTo(x + w + 20, top + d); c.lineTo(x - 20, top + d); c.closePath(); c.fill();
    // mặt ruộng: đất nứt -> nước phản chiếu trời
    const g = c.createLinearGradient(0, top + 3, 0, top + d - 3);
    g.addColorStop(0, mix('#b99a63', '#9fc9df', ease(wet))); g.addColorStop(1, mix('#a8854f', '#cfe6ea', ease(wet)));
    c.fillStyle = g; c.beginPath(); c.moveTo(x, top + 4); c.lineTo(x + w, top + 4); c.lineTo(x + w + 11, top + d - 4); c.lineTo(x - 11, top + d - 4); c.closePath(); c.fill();
    if (wet < 0.4) { // vết nứt
      c.strokeStyle = 'rgba(90,60,30,' + (0.35 * (1 - wet / 0.4)) + ')'; c.lineWidth = 0.9;
      for (let i = 0; i < w / 26; i++) { const cx = x + 10 + i * 26, cy = top + 10 + (i % 3) * 5; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + 6, cy + 4); c.lineTo(cx + 3, cy + 9); c.moveTo(cx + 6, cy + 4); c.lineTo(cx + 13, cy + 2); c.stroke(); }
    }
    // gợn mưa
    if (f.raining > 0 && !f.done) {
      c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1;
      for (let i = 0; i < 6; i++) { const k = (t * 1.7 + i * 0.37) % 1, rx = x + ((i * 97 + Math.floor(t * 1.7 + i * 0.37) * 53) % w), ry = top + 8 + (i * 7) % 16; c.globalAlpha = 1 - k; c.beginPath(); c.ellipse(rx, ry, 2 + k * 9, 1 + k * 3, 0, 0, TAU); c.stroke(); }
      c.globalAlpha = 1;
    }
    // khóm mạ
    windAt(G, x + w / 2, GROUND - 20);
    const wx = clamp(tmp.x / 260, -1, 1);
    const hgt = 7 + green * 15;
    const col = mix('#c5a35c', '#5fb257', green), col2 = mix('#b08d48', '#3f9447', green);
    for (let row = 0; row < 3; row++) {
      const yy = top + 8 + row * 7, sx = x + 6 - row * 4, ex = x + w + row * 4;
      for (let px = sx; px < ex; px += 15) {
        const sway = wx * (0.5 + row * 0.15) + Math.sin(t * 2.4 + px * 0.05) * 0.08;
        c.strokeStyle = row % 2 ? col : col2; c.lineWidth = 1.7;
        for (let b = -1; b <= 1; b++) {
          c.beginPath(); c.moveTo(px + b * 2, yy); c.quadraticCurveTo(px + b * 3 + sway * hgt * 0.4, yy - hgt * 0.6, px + b * 4 + sway * hgt, yy - hgt * (0.95 - Math.abs(b) * 0.15)); c.stroke();
        }
      }
    }
    // cò trắng khi xong
    if (f.done) {
      const k = clamp((f.doneT || 0) / 1, 0, 1);
      [[0.3, 0], [0.72, 1]].forEach((p, i) => {
        const cx = x + w * p[0], cy = top + 14 + i * 4, dy = (1 - ease(k)) * -60;
        c.save(); c.translate(cx, cy + dy); if (i) c.scale(-1, 1);
        c.strokeStyle = '#d8a640'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-1, 0); c.lineTo(-1, 9); c.moveTo(2, 0); c.lineTo(3, 9); c.stroke();
        c.fillStyle = '#fbfbf7'; c.beginPath(); c.ellipse(0, -3, 8, 4.6, -0.2, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(5, -5); c.quadraticCurveTo(9, -14, 8, -17); c.lineTo(10, -17); c.quadraticCurveTo(12, -12, 7, -3); c.fill();
        c.fillStyle = '#e7b54c'; c.beginPath(); c.moveTo(10, -17); c.lineTo(16, -16); c.lineTo(10, -15.6); c.fill();
        c.restore();
      });
    }
  }
  function drawMat(c, G, m, t) {
    const x = m.x, w = m.w, top = GROUND + 1;
    c.fillStyle = 'rgba(60,40,20,.2)'; c.fillRect(x - 4, top + 3, w + 8, 22);
    c.fillStyle = '#c96c4f'; c.fillRect(x - 4, top, w + 8, 22);
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 1;
    for (let gx = x; gx < x + w; gx += 16) { c.beginPath(); c.moveTo(gx, top); c.lineTo(gx - 4, top + 22); c.stroke(); }
    // thóc vàng
    c.fillStyle = '#f0c34e'; c.beginPath(); c.moveTo(x + 4, top + 4); c.lineTo(x + w - 4, top + 4); c.lineTo(x + w - 1, top + 18); c.lineTo(x + 1, top + 18); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(180,120,30,.45)';
    for (let gx = x + 10; gx < x + w - 6; gx += 9) { c.beginPath(); c.moveTo(gx, top + 6); c.quadraticCurveTo(gx + 4, top + 11, gx, top + 16); c.stroke(); }
    const warn = !m.covered && m.exp > 0;
    if (warn) { c.fillStyle = 'rgba(220,60,40,' + (0.25 + 0.2 * Math.sin(t * 16)) + ')'; c.fillRect(x - 4, top, w + 8, 22); }
    if (m.cover > 0) {
      const cw = (w + 12) * ease(m.cover);
      c.fillStyle = '#3d7fb8'; c.beginPath(); c.moveTo(x - 6, top + 2); c.quadraticCurveTo(x - 6 + cw / 2, top - 8, x - 6 + cw, top + 2); c.lineTo(x - 6 + cw, top + 20); c.lineTo(x - 6, top + 20); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.moveTo(x - 4, top + 6); c.lineTo(x - 6 + cw, top + 6); c.stroke();
    }
    farmer(c, x + w + 22, GROUND + 6, t, warn);
  }
  function drawKite(c, G, k, t, ki) {
    const shirt = SHIRTS[(ki * 2 + 1) % SHIRTS.length];
    const pose = k.state === 'done' ? 'cheer' : k.state === 'broken' ? 'sad' : 'hold';
    const hand = [k.ax + 4, k.ay + 10];
    // dây
    if (k.state !== 'broken') {
      c.strokeStyle = 'rgba(70,50,40,.6)'; c.lineWidth = 0.9;
      const mx = (k.ax + k.kx) / 2, my = (k.ay + k.ky) / 2 + Math.min(40, Math.hypot(k.kx - k.ax, k.ky - k.ay) * 0.12);
      c.beginPath(); c.moveTo(hand[0], hand[1]); c.quadraticCurveTo(mx, my, k.kx, k.ky); c.stroke();
    }
    kid(c, k.kidX, GROUND + 6, shirt, pose, t, pose === 'hold' ? hand : null);
    // đuôi diều đi theo gió
    windAt(G, k.kx, k.ky);
    const tail = k.tail;
    if (!tail.length) for (let i = 0; i < 9; i++) tail.push([k.kx, k.ky]);
    tail[0][0] = k.kx; tail[0][1] = k.ky + 10;
    for (let i = 1; i < tail.length; i++) {
      const p = tail[i], q = tail[i - 1];
      p[0] += (q[0] - tmp.x * 0.04 - p[0]) * 0.35; p[1] += (q[1] + 7 - p[1]) * 0.35 + Math.sin(t * 7 + i) * 0.4;
      const dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1; if (d > 8) { p[0] = q[0] + dx / d * 8; p[1] = q[1] + dy / d * 8; }
    }
    c.strokeStyle = '#e8483d'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(tail[0][0], tail[0][1]); for (let i = 1; i < tail.length; i++) c.lineTo(tail[i][0], tail[i][1]); c.stroke();
    for (let i = 2; i < tail.length; i += 2) { c.fillStyle = i % 4 ? '#ffd166' : '#e8483d'; c.save(); c.translate(tail[i][0], tail[i][1]); c.rotate(t * 3 + i); c.fillRect(-3, -1.5, 6, 3); c.restore(); }
    // thân diều
    c.save(); c.translate(k.kx, k.ky); c.rotate(k.state === 'broken' ? k.spin : k.ang);
    const pal = [['#e8483d', '#ffd166'], ['#3f7fbf', '#f7f1e3'], ['#6aa84f', '#ffd166']][ki % 3];
    c.fillStyle = 'rgba(40,30,20,.22)'; c.beginPath(); c.moveTo(1, -16); c.lineTo(15, 2); c.lineTo(1, 22); c.lineTo(-13, 2); c.closePath(); c.fill();
    c.fillStyle = pal[0]; c.beginPath(); c.moveTo(0, -18); c.lineTo(14, 0); c.lineTo(0, 20); c.lineTo(-14, 0); c.closePath(); c.fill();
    c.fillStyle = pal[1]; c.beginPath(); c.moveTo(0, -18); c.lineTo(14, 0); c.lineTo(0, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(0, 20); c.lineTo(-14, 0); c.lineTo(0, 0); c.closePath(); c.fill();
    c.strokeStyle = '#6b4b35'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 20); c.moveTo(-14, 0); c.lineTo(14, 0); c.stroke();
    c.restore();
    // vòng tiến độ diều trên cao
    if (k.state === 'fly' && k.aloft > 0) {
      c.strokeStyle = 'rgba(255,209,102,.9)'; c.lineWidth = 2.5; c.lineCap = 'round';
      c.beginPath(); c.arc(k.kx, k.ky, 26, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k.aloft / 4, 0, 1)); c.stroke();
    }
    // vạch độ cao cần đạt
    if (k.state !== 'done' && k.state !== 'broken') {
      const yy = k.ay - GM.KITE_UP;
      c.setLineDash([4, 6]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(k.kidX - 70, yy); c.lineTo(k.kidX + 190, yy); c.stroke(); c.setLineDash([]);
    }
  }
  function drawDand(c, G, p, t) {
    c.save(); c.translate(p.x, GROUND + 4); c.scale(1.45, 1.45); c.translate(-p.x, -(GROUND + 4));
    const sw = p.sway * 10 + Math.sin(t * 2 + p.x) * 1.5;
    const hx = p.x + sw, hy = GROUND - 50;
    c.strokeStyle = '#5b8d3e'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(p.x, GROUND + 4); c.quadraticCurveTo(p.x, GROUND - 26, hx, hy); c.stroke();
    // lá răng cưa
    c.fillStyle = '#5f9a42';
    [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(p.x, GROUND + 4); c.quadraticCurveTo(p.x + sd * 18, GROUND - 6, p.x + sd * 26, GROUND - 12); c.quadraticCurveTo(p.x + sd * 12, GROUND - 2, p.x, GROUND + 4); c.fill(); });
    const n = p.seeds;
    if (n > 0) {
      c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 0.9;
      for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + 0.3; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(a) * 13, hy + Math.sin(a) * 13); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(hx, hy, 13 * (0.5 + n / 24), 0, TAU); c.fill();
    } else {
      const g = clamp(p.regrow / 6, 0, 1);
      c.fillStyle = mix('#7a9a4a', '#f4c430', g); c.beginPath(); c.arc(hx, hy, 3 + g * 5, 0, TAU); c.fill();
    }
    c.fillStyle = '#7a9a4a'; c.beginPath(); c.arc(hx, hy, 2.6, 0, TAU); c.fill();
    c.restore();
  }
  function seed(c, s) {
    c.save(); c.translate(s.x, s.y); c.rotate(Math.sin(s.rot) * 0.4); c.scale(1.6, 1.6);
    c.fillStyle = 'rgba(255,255,255,.28)'; c.beginPath(); c.arc(0, -1, 7, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 7); for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.45; c.moveTo(0, 0); c.lineTo(Math.cos(a) * 6, Math.sin(a) * 6); } c.stroke();
    c.fillStyle = '#8a6a40'; c.fillRect(-0.8, 6, 1.6, 3);
    c.restore();
  }
  const FLW = [['#f5a623', '#e2711d'], ['#e86f8e', '#c94f74'], ['#f7f1e3', '#f2c94c']];
  function drawBed(c, G, b, t) {
    const x = b.x, w = b.w, top = GROUND;
    c.fillStyle = 'rgba(40,25,15,.22)'; c.beginPath(); c.ellipse(x + w / 2, top + 7, w / 2 + 6, 9, 0, 0, TAU); c.fill();
    c.fillStyle = '#7a5236'; c.beginPath(); c.ellipse(x + w / 2, top + 4, w / 2, 8, 0, Math.PI, TAU); c.fill(); c.fillRect(x, top + 3, w, 6);
    c.fillStyle = '#9b6b45'; for (let i = 0; i < w / 14; i++) { c.beginPath(); c.arc(x + 7 + i * 14, top + 8, 3.2, 0, TAU); c.fill(); }
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([3, 4]); c.lineWidth = 1;
    if (b.n < b.need) { c.beginPath(); c.ellipse(x + w / 2, top - 1, w / 2 + 3, 10, 0, Math.PI, TAU); c.stroke(); }
    c.setLineDash([]);
    b.flowers.forEach(f => {
      const g = outBack(f.t / 0.9), h = 26 * clamp(f.t / 0.6, 0, 1);
      windAt(G, f.x, GROUND - 20);
      const sw = clamp(tmp.x / 300, -1, 1) * 5;
      c.strokeStyle = '#4f8a3c'; c.lineWidth = 2; c.beginPath(); c.moveTo(f.x, top + 2); c.quadraticCurveTo(f.x, top - h * 0.5, f.x + sw, top - h); c.stroke();
      c.fillStyle = '#5f9a42'; c.beginPath(); c.ellipse(f.x - 5, top - h * 0.4, 6, 2.6, 0.5, 0, TAU); c.fill();
      if (f.t > 0.45) {
        const s = g * 1, col = FLW[f.hue % 3];
        c.save(); c.translate(f.x + sw, top - h); c.scale(s, s); c.rotate(t * 0.3);
        c.fillStyle = col[0]; for (let i = 0; i < 8; i++) { c.beginPath(); c.ellipse(Math.cos(i / 8 * TAU) * 6, Math.sin(i / 8 * TAU) * 6, 5, 2.6, i / 8 * TAU, 0, TAU); c.fill(); }
        c.fillStyle = col[1]; c.beginPath(); c.arc(0, 0, 3.6, 0, TAU); c.fill();
        c.restore();
      }
    });
  }
  function drawRoof(c, G, o, t) {
    const x = o.x, w = o.w, base = GROUND + 4, top = base - 58;
    // gian hàng chợ
    c.fillStyle = '#7a5a3c'; [-1, 1].forEach(sd => c.fillRect(x + sd * (w / 2 - 12) - 3, top, 6, 58));
    c.fillStyle = '#8f6b47'; c.fillRect(x - w / 2 + 10, base - 22, w - 20, 8);
    // hàng hóa
    const goods = ['#f2b84b', '#e0654b', '#6aa84f', '#f7f1e3'];
    for (let i = 0; i < 6; i++) { c.fillStyle = goods[i % 4]; c.beginPath(); c.arc(x - w / 2 + 22 + i * (w - 44) / 5, base - 26, 6, Math.PI, TAU); c.fill(); }
    if (o.gone) return;
    const sh = o.shake * (Math.sin(t * 40) * 2.5), lift = o.dmg * 6;
    c.save(); c.translate(x + sh, top - lift); c.rotate(o.shake * Math.sin(t * 23) * 0.04 + o.dmg * 0.05);
    c.fillStyle = 'rgba(40,25,15,.25)'; c.beginPath(); c.moveTo(-w / 2 - 14, 4); c.lineTo(w / 2 + 14, 4); c.lineTo(w / 2 - 10, -26); c.lineTo(-w / 2 + 10, -26); c.closePath(); c.fill();
    c.fillStyle = mix('#b5523b', '#e2563a', o.dmg); c.beginPath(); c.moveTo(-w / 2 - 14, 0); c.lineTo(w / 2 + 14, 0); c.lineTo(w / 2 - 10, -30); c.lineTo(-w / 2 + 10, -30); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,.15)'; c.lineWidth = 1;
    for (let i = -w / 2; i < w / 2; i += 10) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i * 0.85, -30); c.stroke(); }
    // ngói bong
    if (o.dmg > 0.3) { c.fillStyle = '#8e3d2c'; for (let i = 0; i < o.dmg * 6; i++) c.fillRect(-w / 2 + 10 + i * 19, -18 + (i % 2) * 8, 8, 5); }
    c.restore();
    // vạch sức chịu
    if (o.dmg > 0.02) {
      c.fillStyle = 'rgba(20,10,10,.5)'; c.fillRect(x - 30, top - 48, 60, 6);
      c.fillStyle = o.dmg > 0.66 ? '#ff5b4a' : '#ffd166'; c.fillRect(x - 30, top - 48, 60 * (1 - o.dmg), 6);
    }
  }
  function drawCloud(c, G, cl, t) {
    const s = cloudSprite(cl.size, cl.dark, cl.seed | 0);
    const b = cl.bump > 0 ? 1 + Math.sin(cl.bump * Math.PI) * 0.12 : 1;
    const fa = cl.fade > 0 ? 1 - cl.fade / 2.5 : 1;
    const wob = Math.sin(t * 0.8 + cl.seed) * 1.5;
    c.globalAlpha = fa * (cl.age < 0.8 ? cl.age / 0.8 : 1);
    c.drawImage(s.cv, cl.x - s.w / 2 * b, cl.y - s.oy * b + wob, s.w * b, s.h * b);
    c.globalAlpha = 1;
    if (cl.size >= 3 && cl.fade === 0 && !cl.dark) { // vạch nước còn lại
      const R = GM.cloudR(cl), k = clamp(cl.water / 7, 0, 1);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(cl.x - R * 0.6, cl.y + R * 0.5, R * 1.2, 3);
      c.fillStyle = '#7cc4f0'; c.fillRect(cl.x - R * 0.6, cl.y + R * 0.5, R * 1.2 * k, 3);
    }
  }

  // ================= HẠT & HIỆU ỨNG =================
  function spawnTrail(x, y, life, w, col) {
    if (A.trails.length > 140) return;
    A.trails.push({ x, y, pts: [[x, y]], life, max: life, w: w || 1, col: col || null, ph: Math.random() * TAU, amp: 10 + Math.random() * 16 });
  }
  function emitStroke(G, x0, y0, x1, y1, mag) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.min(4, Math.ceil(d / 26));
    for (let i = 0; i < n; i++) { const k = (i + Math.random()) / n; spawnTrail(x0 + (x1 - x0) * k + (Math.random() - 0.5) * 50, y0 + (y1 - y0) * k + (Math.random() - 0.5) * 50, 0.9 + Math.random() * 0.5, 0.8 + mag / 400); }
  }
  function burst(x, y, n, cols, sp, life, kind) {
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = sp * (0.4 + Math.random() * 0.8); A.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life: life * (0.7 + Math.random() * 0.6), max: life, c: cols[i % cols.length], r: 2 + Math.random() * 3, a: Math.random() * TAU, kind: kind || 'dot' }); }
  }
  function event(G, e) {
    if (e.type === 'merge') { A.rings.push({ x: e.x, y: e.y, r: 20, t: 0, max: 0.5, c: '255,255,255' }); burst(e.x, e.y, 10, ['#ffffff', '#e8f1fb'], 90, 0.6); }
    else if (e.type === 'wish') { A.rings.push({ x: e.x, y: lanternY(G, e.x), r: 16, t: 0, max: 0.9, c: '255,209,102' }); burst(e.x, lanternY(G, e.x), 26, ['#ffd166', '#ff8a5b', '#f7a8b8', '#fff3c4'], 160, 1.3, 'paper'); }
    else if (e.type === 'snap') { burst(e.x, e.y, 8, ['#e8483d', '#ffd166'], 80, 0.8, 'paper'); }
    else if (e.type === 'flower') { burst(e.x, e.y - 20, 12, ['#f7a8b8', '#ffd166', '#ffffff'], 70, 0.8, 'paper'); }
    else if (e.type === 'roof') { burst(e.x, GROUND - 80, 30, ['#b5523b', '#8e3d2c', '#c96c4f'], 260, 1.6, 'tile'); }
    else if (e.type === 'wet') { burst(e.x, GROUND - 4, 14, ['#7cc4f0', '#cfe8f7'], 90, 0.7); }
    else if (e.type === 'thunder') { if (!A.reduce) A.bolts.push({ x: e.x, t: 0, seed: Math.random() * 1000 }); }
    else if (e.type === 'vortex') { A.rings.push({ x: e.x, y: e.y, r: 30, t: 0, max: 0.6, c: '255,255,255' }); }
    else if (e.type === 'spent') { burst(e.x, e.y, 8, ['#ffffff'], 40, 1); }
  }
  function lanternY(G, x) { return G.storm ? GROUND - 150 : 290; }

  function updateFx(G, dt) {
    A.time += dt;
    const F = G.field;
    // dải lụa gió tự sinh ở chỗ gió mạnh
    for (let i = 0; i < 5; i++) {
      const x = G.cam + Math.random() * A.W, y = 40 + Math.random() * (GROUND - 40);
      F.sample(x, y, tmp); const m = Math.hypot(tmp.x, tmp.y);
      if (m > 75 && Math.random() < (m - 60) / 300) spawnTrail(x, y, 0.8 + Math.random() * 0.6, 0.6 + m / 500);
    }
    G.jets.forEach(j => { if (j.warn <= 0 && Math.random() < 0.7) spawnTrail(j.x + (Math.random() - 0.5) * 40, j.y + (Math.random() - 0.5) * j.r * 1.6, 0.45 + Math.random() * 0.35, 1.2, j.nat ? null : '70,78,96'); });
    for (let i = A.trails.length - 1; i >= 0; i--) {
      const tr = A.trails[i]; tr.life -= dt;
      if (tr.life <= 0) { A.trails.splice(i, 1); continue; }
      F.sample(tr.x, tr.y, tmp);
      tr.x += tmp.x * dt; tr.y += tmp.y * dt;
      // dải lụa uốn lượn vuông góc với hướng gió
      const m = Math.hypot(tmp.x, tmp.y) || 1, wob = Math.sin((tr.max - tr.life) * 9 + tr.ph) * tr.amp * 0.18;
      tr.pts.push([tr.x - tmp.y / m * wob, tr.y + tmp.x / m * wob]); if (tr.pts.length > 14) tr.pts.shift();
    }
    // cánh hoa / lá
    A.petals.forEach((p, i) => {
      F.sample(p.x, p.y, tmp);
      p.vx += (tmp.x - p.vx) * Math.min(1, dt * 2.2); p.vy += (tmp.y - p.vy) * Math.min(1, dt * 2.2) + 14 * dt;
      p.x += (p.vx + Math.sin(A.time * 1.7 + p.f) * 12) * dt; p.y += p.vy * dt;
      p.a += dt * (1.5 + Math.abs(p.vx) * 0.02); p.f += dt * 3;
      if (p.y > GROUND + 30 || p.x < G.cam - 80 || p.x > G.cam + A.W + 80 || p.y < -60) Object.assign(p, newPetal(G, Math.random, false), { x: tmp.x < 0 ? G.cam + A.W + 20 : G.cam - 20 - Math.random() * 40, y: Math.random() * GROUND * 0.8 });
    });
    // khói bếp
    if (A.scene && !G.storm) A.scene.chims.forEach(ch => {
      if (ch[0] < G.cam - 50 || ch[0] > G.cam + A.W + 50) return;
      if (Math.random() < dt * 5) A.smoke.push({ x: ch[0], y: ch[1], r: 4, life: 3, max: 3 });
    });
    for (let i = A.smoke.length - 1; i >= 0; i--) {
      const s = A.smoke[i]; s.life -= dt; if (s.life <= 0) { A.smoke.splice(i, 1); continue; }
      F.sample(s.x, s.y, tmp); s.x += tmp.x * dt * 0.8 + 3 * dt; s.y += (tmp.y * 0.6 - 16) * dt; s.r += dt * 6;
    }
    // hạt hiệu ứng
    for (let i = A.parts.length - 1; i >= 0; i--) {
      const p = A.parts[i]; p.life -= dt; if (p.life <= 0) { A.parts.splice(i, 1); continue; }
      p.vy += (p.kind === 'tile' ? 300 : 90) * dt; p.vx *= 1 - dt * 1.5; p.x += p.vx * dt; p.y += p.vy * dt; p.a += dt * 6;
    }
    for (let i = A.rings.length - 1; i >= 0; i--) { const r = A.rings[i]; r.t += dt; if (r.t > r.max) A.rings.splice(i, 1); }
    for (let i = A.bolts.length - 1; i >= 0; i--) { const b = A.bolts[i]; b.t += dt; if (b.t > 0.35) A.bolts.splice(i, 1); }
    // mưa
    G.clouds.forEach(cl => {
      if (!cl.rain) return;
      const R = GM.cloudR(cl) * 0.8, n = cl.dark ? 3 : 2;
      for (let k = 0; k < n; k++) A.rainP.push({ x: cl.x + (Math.random() - 0.5) * R * 2, y: cl.y + R * 0.4, vy: 380 + Math.random() * 120 });
    });
    if (G.storm && G.t > 22 && G.clear < 1) for (let k = 0; k < 3; k++) A.rainP.push({ x: G.cam + Math.random() * A.W * 1.2, y: -10, vy: 520, amb: true });
    for (let i = A.rainP.length - 1; i >= 0; i--) {
      const d = A.rainP[i]; F.sample(d.x, d.y, tmp);
      d.x += tmp.x * 0.35 * dt; d.y += d.vy * dt; d.dx = tmp.x * 0.035;
      if (d.y > GROUND + 6) { if (!d.amb && Math.random() < 0.3) A.parts.push({ x: d.x, y: GROUND + 2, vx: (Math.random() - 0.5) * 40, vy: -40, life: 0.25, max: 0.25, c: '#cfe8f7', r: 1.3, a: 0, kind: 'dot' }); A.rainP.splice(i, 1); }
    }
    if (A.rainP.length > 420) A.rainP.splice(0, A.rainP.length - 420);
  }

  // ================= VẼ KHUNG HÌNH =================
  function draw(G, view) {
    const c = A.c, S = A.S, W = A.W, cam = G.cam, t = A.time;
    const tod = lerp(G.L.tod[0], G.L.tod[1], clamp(G.t / G.dur, 0, 1));
    const sk = skyAt(tod);
    const storm = G.storm ? 1 - G.clear : 0;
    const stormAmt = G.storm ? clamp((G.t - 1) / 4, 0, 1) * storm : 0;
    const sh = view.shake || 0;
    c.setTransform(S, 0, 0, S, sh ? (Math.random() - 0.5) * sh * S : 0, sh ? (Math.random() - 0.5) * sh * S : 0);
    // trời
    const g = c.createLinearGradient(0, 0, 0, 380);
    g.addColorStop(0, stormAmt ? mixColor(sk.top, '#3d4556', stormAmt) : sk.top);
    g.addColorStop(1, stormAmt ? mixColor(sk.bot, '#8a909c', stormAmt) : sk.bot);
    c.fillStyle = g; c.fillRect(-20, -20, W + 40, H + 40);
    // mặt trời
    const sa = Math.PI * (1 - tod), sx = W * 0.5 + Math.cos(sa) * W * 0.42 - cam * 0.03, sy = 300 - Math.sin(sa) * 230;
    if (stormAmt < 0.9) {
      c.globalAlpha = 1 - stormAmt;
      const sg = c.createRadialGradient(sx, sy, 10, sx, sy, 120); sg.addColorStop(0, 'rgba(255,240,200,.55)'); sg.addColorStop(1, 'rgba(255,240,200,0)');
      c.fillStyle = sg; c.fillRect(sx - 120, sy - 120, 240, 240);
      c.fillStyle = sk.sun; c.beginPath(); c.arc(sx, sy, 30, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 38, 0, TAU); c.stroke();
      c.globalAlpha = 1;
    }
    // trăng & sao khi chạng vạng
    if (sk.dusk > 0.3) {
      c.globalAlpha = (sk.dusk - 0.3) / 0.7;
      c.fillStyle = '#fff7df'; for (let i = 0; i < 26; i++) { const x = (i * 211 % W), y = 20 + (i * 97 % 150); c.fillRect(x, y, 1.6, 1.6); }
      c.beginPath(); c.arc(W * 0.82, 70, 18, 0, TAU); c.fill(); c.fillStyle = sk.top; c.beginPath(); c.arc(W * 0.82 + 7, 65, 16, 0, TAU); c.fill();
      c.globalAlpha = 1;
    }
    // mây xa trang trí
    c.fillStyle = stormAmt ? 'rgba(80,88,104,.5)' : 'rgba(255,255,255,.45)';
    for (let i = 0; i < 6; i++) { const x = ((i * 380 - cam * 0.06) % (W + 400) + W + 400) % (W + 400) - 200, y = 60 + (i * 47 % 90); c.beginPath(); c.ellipse(x, y, 90 + i * 9, 10 + (i % 3) * 3, 0, 0, TAU); c.fill(); }
    // chim
    if (!G.storm) {
      c.strokeStyle = 'rgba(60,50,60,.55)'; c.lineWidth = 1.4;
      A.scene.birds.forEach((b, i) => {
        const x = ((b.x + t * 26 - cam * 0.2) % (W + 200) + W + 200) % (W + 200) - 100, y = b.y + Math.sin(t * 0.7 + b.ph) * 8, f = Math.sin(t * 8 + b.ph) * 4;
        c.beginPath(); c.moveTo(x - 7, y - f); c.quadraticCurveTo(x - 3, y - 2, x, y); c.quadraticCurveTo(x + 3, y - 2, x + 7, y - f); c.stroke();
      });
    }
    // lớp cảnh
    const layers = A.scene.layers;
    for (let i = 0; i < 3; i++) {
      drawLayer(c, layers[i], cam);
      if (i < 2) { // sương lớp xa theo giờ, mờ dần lên trời để không có vạch cứng
        const hc = sk.dusk > 0 ? '120,80,110' : stormAmt > 0 ? '150,156,170' : '255,248,236', ha = 0.12 + sk.dawn * 0.12 + stormAmt * 0.25;
        const hg = c.createLinearGradient(0, 160, 0, 300); hg.addColorStop(0, 'rgba(' + hc + ',0)'); hg.addColorStop(1, 'rgba(' + hc + ',' + ha + ')');
        c.fillStyle = hg; c.fillRect(-10, 160, W + 20, H);
      }
    }
    c.save(); c.translate(-cam, 0);
    // khói bếp (sau mặt đất chính một chút)
    A.smoke.forEach(s => { c.fillStyle = 'rgba(240,236,228,' + (0.45 * s.life / s.max) + ')'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); });
    c.restore();
    drawLayer(c, layers[3], cam);
    // cửa sổ sáng đèn lúc chiều
    if (sk.dusk > 0.15 || stormAmt > 0.3) {
      const k = Math.max(sk.dusk, stormAmt * 0.6);
      c.save(); c.translate(-cam, 0); c.globalCompositeOperation = 'lighter';
      A.scene.wins.forEach(wi => { if (wi[0] < cam - 30 || wi[0] > cam + W + 30) return; const gg = c.createRadialGradient(wi[0], wi[1], 1, wi[0], wi[1], 22); gg.addColorStop(0, 'rgba(255,200,110,' + 0.8 * k + ')'); gg.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = gg; c.fillRect(wi[0] - 22, wi[1] - 22, 44, 44); });
      c.restore();
    }
    c.save(); c.translate(-cam, 0);
    const vis = (x, m) => x > cam - (m || 160) && x < cam + W + (m || 160);
    G.fields.forEach(f => { if (vis(f.x, f.w + 60)) drawField(c, G, f, t); });
    G.mats.forEach(m => { if (vis(m.x, m.w + 80)) drawMat(c, G, m, t); });
    G.beds.forEach(b => { if (vis(b.x, b.w + 60)) drawBed(c, G, b, t); });
    G.dands.forEach(p => { if (vis(p.x)) drawDand(c, G, p, t); });
    G.roofs.forEach(o => drawRoof(c, G, o, t));
    if (G.storm) { // người bán hàng lo lắng
      G.roofs.forEach((o, i) => kid(c, o.x + (i - 1) * 14, GROUND + 6, SHIRTS[i + 1], o.gone ? 'sad' : o.shake > 0.3 ? 'sad' : 'hold', t, null));
    }
    // vùng lặng
    G.calms.forEach(z => {
      c.globalAlpha = z.a;
      const gg = c.createRadialGradient(z.x, z.y, 4, z.x, z.y, z.r); gg.addColorStop(0, 'rgba(210,240,255,.35)'); gg.addColorStop(0.75, 'rgba(210,240,255,.12)'); gg.addColorStop(1, 'rgba(210,240,255,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(z.x, z.y, z.r, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6; c.setLineDash([2, 7]); c.lineDashOffset = -t * 10;
      c.beginPath(); c.arc(z.x, z.y, z.r * 0.92, 0, TAU); c.stroke(); c.setLineDash([]);
      // lá đứng yên trong vùng lặng
      c.fillStyle = 'rgba(120,180,110,.85)';
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 0.2; c.beginPath(); c.ellipse(z.x + Math.cos(a) * z.r * 0.6, z.y + Math.sin(a) * z.r * 0.6, 4, 1.8, a, 0, TAU); c.fill(); }
      c.globalAlpha = 1;
    });
    // xoáy
    G.vortices.forEach(v => {
      const k = v.t < 0.3 ? v.t / 0.3 : v.t > v.life - 0.5 ? (v.life - v.t) / 0.5 : 1;
      c.strokeStyle = 'rgba(255,255,255,' + 0.7 * k + ')'; c.lineCap = 'round';
      for (let arm = 0; arm < 3; arm++) {
        c.lineWidth = 2.6 - arm * 0.5; c.beginPath();
        for (let s = 0; s <= 30; s++) { const u = s / 30, a = v.dir * (t * 5 + u * 5) + arm * TAU / 3, rr = v.r * (0.15 + u * 0.75); const px = v.x + Math.cos(a) * rr, py = v.y + Math.sin(a) * rr * 0.8; s ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke();
      }
    });
    // mây
    G.clouds.forEach(cl => { if (vis(cl.x, 200)) drawCloud(c, G, cl, t); });
    // mưa
    c.strokeStyle = stormAmt ? 'rgba(200,215,235,.55)' : 'rgba(120,170,220,.75)'; c.lineWidth = 1.2; c.beginPath();
    A.rainP.forEach(d => { c.moveTo(d.x, d.y); c.lineTo(d.x - (d.dx || 0) * 3, d.y - 11); });
    c.stroke();
    // diều + trẻ con
    G.kites.forEach((k, i) => { if (vis(k.kidX, 320)) drawKite(c, G, k, t, i); });
    // hạt bồ công anh
    G.seeds.forEach(s => seed(c, s));
    // vòi gió (báo trước + đang lao)
    G.jets.forEach(j => {
      if (j.warn > 0) {
        const k = 1 - j.warn / j.w0, dx = j.tx - j.x, dy = j.ty - j.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
        const sx = j.nat ? cam + 30 : cam + W - 40, sy = j.y, ex = sx + ux * 150, ey = sy + uy * 150;
        c.globalAlpha = 0.45 + 0.45 * Math.abs(Math.sin(t * 10));
        c.strokeStyle = j.nat ? '#ffffff' : '#ff5b4a'; c.lineWidth = 5; c.lineCap = 'round'; c.setLineDash([12, 10]); c.lineDashOffset = -t * 60;
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]);
        c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(ex + ux * 16, ey + uy * 16); c.lineTo(ex - uy * 12, ey + ux * 12); c.lineTo(ex + uy * 12, ey - ux * 12); c.closePath(); c.fill();
        // vạch đích
        if (!j.nat) { c.strokeStyle = 'rgba(255,91,74,.7)'; c.lineWidth = 2; c.beginPath(); c.arc(j.tx + 60, j.ty, 20 + k * 10, 0, TAU); c.stroke(); }
        c.globalAlpha = 1;
      } else {
        // đầu cơn giật: một cuộn gió nhỏ
        c.strokeStyle = j.nat ? 'rgba(255,255,255,.75)' : 'rgba(70,78,96,.75)'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); for (let s = 0; s <= 16; s++) { const u = s / 16, a = -t * 14 + u * 9, rr = 4 + u * 22; const px = j.x + Math.cos(a) * rr, py = j.y + Math.sin(a) * rr * 0.6; s ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
      }
    });
    // dải lụa gió
    c.lineCap = 'round'; c.lineJoin = 'round';
    A.trails.forEach(tr => {
      if (tr.pts.length < 3) return;
      const a = clamp(tr.life / tr.max, 0, 1) * (tr.life > tr.max - 0.15 ? (tr.max - tr.life) / 0.15 : 1);
      c.strokeStyle = 'rgba(' + (tr.col || (stormAmt > 0.4 ? '225,232,245' : '255,255,255')) + ',' + 0.55 * a + ')'; c.lineWidth = 2.6 * tr.w;
      c.beginPath(); c.moveTo(tr.pts[0][0], tr.pts[0][1]); for (let i = 1; i < tr.pts.length; i++) c.lineTo(tr.pts[i][0], tr.pts[i][1]); c.stroke();
    });
    // cánh đào
    A.petals.forEach(p => {
      c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.scale(1, Math.abs(Math.cos(p.f)) * 0.8 + 0.2);
      c.fillStyle = p.leaf ? (G.storm ? '#7a8f5a' : '#88b06a') : '#f39cb2'; c.beginPath(); c.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, TAU); c.fill();
      if (!p.leaf) { c.fillStyle = '#fbd2dc'; c.beginPath(); c.ellipse(-p.s * 0.2, -p.s * 0.1, p.s * 0.45, p.s * 0.25, 0, 0, TAU); c.fill(); }
      c.restore();
    });
    // đèn lồng ước nguyện
    G.wishes.forEach(w => { if (vis(w.x, 60)) lantern(c, G, w, t); });
    // hạt hiệu ứng
    A.parts.forEach(p => {
      const a = clamp(p.life / p.max, 0, 1); c.globalAlpha = a; c.fillStyle = p.c;
      if (p.kind === 'paper' || p.kind === 'tile') { c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.scale(1, Math.cos(p.a * 1.3)); c.fillRect(-p.r * (p.kind === 'tile' ? 2 : 1), -p.r * 0.6, p.r * (p.kind === 'tile' ? 4 : 2), p.r * 1.2); c.restore(); }
      else { c.beginPath(); c.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, TAU); c.fill(); }
    });
    c.globalAlpha = 1;
    A.rings.forEach(r => { const k = r.t / r.max; c.strokeStyle = 'rgba(' + r.c + ',' + (1 - k) + ')'; c.lineWidth = 3 * (1 - k) + 0.5; c.beginPath(); c.arc(r.x, r.y, r.r + k * 70, 0, TAU); c.stroke(); });
    c.restore();
    // cỏ tiền cảnh (thị sai 1.2)
    const fcam = cam * 1.2;
    A.scene.tufts.forEach(tf => {
      const x = tf.x - fcam; if (x < -40 || x > W + 40) return;
      G.field.sample(tf.x / 1.2, GROUND - 10, tmp);
      const sw = clamp(tmp.x / 240, -1.2, 1.2);
      c.strokeStyle = tf.c; c.lineWidth = 2.4; c.lineCap = 'round';
      for (let b = 0; b < tf.n; b++) {
        const bx = x + (b - tf.n / 2) * 4, hh = tf.h * (0.75 + (b % 2) * 0.35), s = sw * hh * 0.6 + Math.sin(t * 2 + tf.x + b) * 2;
        c.beginPath(); c.moveTo(bx, H + 4); c.quadraticCurveTo(bx + s * 0.3, H - hh * 0.6, bx + s, H - hh); c.stroke();
      }
      if (tf.fl) { c.fillStyle = '#f7f1e3'; c.beginPath(); c.arc(x + sw * tf.h * 0.6, H - tf.h - 2, 3.2, 0, TAU); c.fill(); c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(x + sw * tf.h * 0.6, H - tf.h - 2, 1.4, 0, TAU); c.fill(); }
    });
    // ánh sáng theo giờ (nhân màu)
    c.globalCompositeOperation = 'multiply';
    const gradeA = 0.10 + sk.dusk * 0.32 + sk.dawn * 0.10 + stormAmt * 0.34;
    c.fillStyle = stormAmt > 0 ? 'rgba(110,120,150,' + gradeA + ')' : sk.dusk > 0 ? mixA('#ffcf9a', '#7a5a9a', sk.dusk, gradeA) : 'rgba(255,214,170,' + gradeA + ')';
    c.fillRect(-20, -20, W + 40, H + 40);
    c.globalCompositeOperation = 'source-over';
    // tia sét
    A.bolts.forEach(b => {
      const k = 1 - b.t / 0.35, r = GM.rng(b.seed | 0);
      c.strokeStyle = 'rgba(255,255,240,' + k + ')'; c.lineWidth = 3; c.beginPath();
      let x = b.x - cam, y = 0; c.moveTo(x, y);
      while (y < 260) { x += (r() - 0.5) * 40; y += 20 + r() * 25; c.lineTo(x, y); }
      c.stroke();
    });
    if (G.flash > 0 && !A.reduce) { c.fillStyle = 'rgba(255,255,250,' + G.flash * 1.6 + ')'; c.fillRect(-20, -20, W + 40, H + 40); }
    // cầu vồng sau giông
    if (G.storm && G.clear > 0) {
      c.globalAlpha = G.clear * 0.55;
      ['#e8483d', '#f5a623', '#f2e14c', '#6aa84f', '#3f7fbf', '#7a5ab8'].forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 9; c.beginPath(); c.arc(W * 0.55, GROUND + 60, 360 - i * 9, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); });
      c.globalAlpha = 1;
    }
    // hạt giấy + viền tối
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 0.5; c.fillStyle = A.grainPat; c.fillRect(0, 0, A.cv.width, A.cv.height); c.globalAlpha = 1;
    c.drawImage(A.vign, 0, 0);
  }
  function mixColor(rgbStr, hexB, t) { // rgbStr là 'rgb(r,g,b)'
    const m = rgbStr.match(/\d+/g).map(Number), B = hex(hexB);
    return 'rgb(' + Math.round(lerp(m[0], B[0], t)) + ',' + Math.round(lerp(m[1], B[1], t)) + ',' + Math.round(lerp(m[2], B[2], t)) + ')';
  }
  function lantern(c, G, w, t) {
    const x = w.x, y0 = lanternY(G, x);
    let y = y0 + Math.sin(t * 1.6 + x * 0.01) * 4;
    let alpha = 1, glow = 0;
    if (w.done) { glow = 1; y -= Math.min(1, w.t / 1.2) * 0; }
    if (w.missed) { alpha = Math.max(0.35, 1 - w.t); }
    c.globalAlpha = alpha;
    // cây sào tre cắm xuống đất, đầu cong treo đèn
    const px = x - 26;
    c.strokeStyle = 'rgba(60,40,20,.25)'; c.lineWidth = 4; c.beginPath(); c.moveTo(px + 1.5, GROUND + 6); c.lineTo(px + 1.5, y - 28); c.stroke();
    c.strokeStyle = '#9b8455'; c.lineWidth = 3; c.beginPath(); c.moveTo(px, GROUND + 6); c.lineTo(px, y - 30); c.quadraticCurveTo(px + 2, y - 40, x, y - 36); c.stroke();
    c.strokeStyle = 'rgba(60,40,20,.35)'; c.lineWidth = 1; for (let k = GROUND - 20; k > y - 20; k -= 34) { c.beginPath(); c.moveTo(px - 2, k); c.lineTo(px + 2, k); c.stroke(); }
    c.strokeStyle = 'rgba(80,50,30,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 36); c.lineTo(x, y - 18); c.stroke();
    if (glow) {
      const pulse = w.t < 0.9 ? outBack(w.t / 0.9) : 1;
      const gg = c.createRadialGradient(x, y, 4, x, y, 46 * pulse); gg.addColorStop(0, 'rgba(255,214,120,.75)'); gg.addColorStop(1, 'rgba(255,170,80,0)');
      c.fillStyle = gg; c.beginPath(); c.arc(x, y, 46 * pulse, 0, TAU); c.fill();
    }
    const body = w.missed ? '#8d8580' : '#d8382f';
    c.fillStyle = 'rgba(40,20,10,.25)'; c.beginPath(); c.ellipse(x + 1, y + 3, 15, 17, 0, 0, TAU); c.fill();
    c.fillStyle = body; c.beginPath(); c.ellipse(x, y, 15, 17, 0, 0, TAU); c.fill();
    c.fillStyle = glow ? '#ffcf5a' : w.missed ? '#a49c96' : '#ef6a4f'; c.beginPath(); c.ellipse(x, y, 8, 17, 0, 0, TAU); c.fill();
    c.fillStyle = '#3b2a22'; c.fillRect(x - 8, y - 19, 16, 4); c.fillRect(x - 8, y + 15, 16, 4);
    c.strokeStyle = glow ? '#ffcf5a' : '#e0b04a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y + 19); c.lineTo(x, y + 30); c.stroke();
    // biểu tượng loại ước nguyện
    c.fillStyle = 'rgba(255,248,230,.95)'; c.font = '700 12px "Be Vietnam Pro",system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const ic = { field: '\u{1F33E}', kite: '\u{1FA81}', bed: '\u{1F33C}', roof: '\u{1F3EE}' }[w.type] || '';
    c.font = '13px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; c.fillText(ic, x, y + 1);
    // vòng tiến độ
    if (!w.done && !w.missed && w.prog > 0 && w.type !== 'roof') {
      c.strokeStyle = 'rgba(40,20,10,.35)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 24, 0, TAU); c.stroke();
      c.strokeStyle = '#ffd166'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * w.prog); c.stroke();
    }
    if (w.done) { c.fillStyle = '#6fe08f'; c.beginPath(); c.arc(x + 14, y - 14, 7, 0, TAU); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 10.5, y - 14); c.lineTo(x + 13, y - 11.5); c.lineTo(x + 17.5, y - 17); c.stroke(); }
    c.globalAlpha = 1;
  }

  window.GA = { init, resize, setLevel, updateFx, draw, event, emitStroke, kid, SHIRTS, cloudSprite, skyAt, mix };
})();
