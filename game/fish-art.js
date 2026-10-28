/* =========================================================
   CÁ LỚN NUỐT CÁ BÉ — ĐỒ HOẠ CÁ (canvas 2D)
   Mỗi loài được vẽ một lần thành sprite (nhìn nghiêng, đầu hướng phải): thân theo đường cong sinh học,
   đổ bóng sáng-tối, vảy, hoa văn, vây có tia, mắt có tròng. Khi bơi, sprite được chia lát và uốn theo sóng
   để thân và đuôi lượn như cá thật. Xuất ra window.FishArt.
   ========================================================= */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- tiện ích màu ---------- */
  function hex(c) { const n = parseInt(c.replace('#', ''), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join(''); }
  const lighten = (c, t) => mix(c, '#ffffff', t), darken = (c, t) => mix(c, '#000000', t);
  function rgba(c, a) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

  /* ---------- bộ vẽ cá tổng quát ---------- */
  // P: tl (độ dài đuôi/W), hh (nửa dày thân tối đa/W), a,b (dạng thân), ped (cuống đuôi), asym (bụng phình),
  //    top/mid/belly (màu), pattern[], fins{}, eye{}, scales, extra(g,c)
  function paintFish(g, W, H, P) {
    const cy = H / 2 + (P.cy || 0) * H;
    const x0 = W * (P.tl || .2) * .86, x1 = W * (1 - (P.snout || 0)) - 2;
    const hh = P.hh * W, asym = P.asym || 0, ped = P.ped == null ? .2 : P.ped;
    const A = P.a || .9, B = P.b || .6;
    const peak = Math.pow(A / (A + B), A) * Math.pow(B / (A + B), B);
    const prof = u => {
      const beta = Math.pow(u, A) * Math.pow(1 - u, B) / peak;
      return clamp(ped * Math.pow(1 - u, 1.6) + (1 - ped) * beta, 0, 1.02);
    };
    const X = u => x0 + u * (x1 - x0);
    const topY = u => cy - hh * prof(u) * (1 - asym) - (P.dorsalBump && u > P.dorsalBump[0] && u < P.dorsalBump[1] ? hh * P.dorsalBump[2] * Math.sin((u - P.dorsalBump[0]) / (P.dorsalBump[1] - P.dorsalBump[0]) * Math.PI) : 0);
    const botY = u => cy + hh * prof(u) * (1 + asym);
    const C = { W, H, cy, hh, X, topY, botY, x0, x1, prof, P };

    const bodyPath = () => {
      g.beginPath();
      const n = 72;
      for (let i = 0; i <= n; i++) { const u = i / n; const x = X(u), y = topY(u); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      for (let i = n; i >= 0; i--) { const u = i / n; g.lineTo(X(u), botY(u)); }
      g.closePath();
    };
    C.bodyPath = bodyPath;

    // --- vây phía sau thân
    const F = P.fins || {};
    if (P.tail !== false) caudal(g, C, P.caudal || {});
    if (F.dorsal) for (const d of [].concat(F.dorsal)) dorsal(g, C, d, true);
    if (F.anal) for (const d of [].concat(F.anal)) dorsal(g, C, d, false);
    if (F.pelvic) pelvic(g, C, F.pelvic);
    if (P.back) P.back(g, C);

    // --- thân
    g.save();
    bodyPath();
    const gr = g.createLinearGradient(0, cy - hh * (1 - asym), 0, cy + hh * (1 + asym));
    const st = P.stops || [0, .42, 1];
    gr.addColorStop(st[0], P.top); gr.addColorStop(st[1], P.mid); gr.addColorStop(st[2], P.belly);
    if (P.sharp) { gr.addColorStop(P.sharp - .001, P.mid); gr.addColorStop(P.sharp, P.belly); }
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    // chuyển màu theo chiều dài (đầu sáng hơn hoặc tối hơn)
    if (P.headTint) {
      const hg = g.createLinearGradient(x0, 0, x1, 0);
      hg.addColorStop(0, rgba(P.headTint[0], P.headTint[1])); hg.addColorStop(.55, 'rgba(0,0,0,0)'); hg.addColorStop(1, rgba(P.headTint[2] || P.headTint[0], P.headTint[3] == null ? P.headTint[1] : P.headTint[3]));
      g.fillStyle = hg; g.fillRect(0, 0, W, H);
    }
    if (P.pattern) for (const p of P.pattern) pattern(g, C, p);
    if (P.scales !== false) scales(g, C, P.scales || {});
    // bóng khối: tối ở bụng và sống lưng, sáng ở vai
    const sh = g.createLinearGradient(0, cy - hh * 1.1, 0, cy + hh * 1.1);
    sh.addColorStop(0, 'rgba(0,0,0,.28)'); sh.addColorStop(.22, 'rgba(0,0,0,0)'); sh.addColorStop(.38, 'rgba(255,255,255,.17)');
    sh.addColorStop(.52, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.34)');
    g.fillStyle = sh; g.fillRect(0, 0, W, H);
    // ánh sáng dọc thân (gloss)
    if (P.gloss !== false) {
      const gl = g.createLinearGradient(0, topY(.55), 0, cy);
      gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(.5, 'rgba(255,255,255,.34)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gl; g.beginPath();
      g.moveTo(X(.18), cy - hh * .5 * (1 - asym)); g.quadraticCurveTo(X(.55), cy - hh * .95 * (1 - asym), X(.9), cy - hh * .3);
      g.quadraticCurveTo(X(.55), cy - hh * .5, X(.18), cy - hh * .5 * (1 - asym)); g.fill();
    }
    // tối nhẹ về phía đuôi và mõm cho khối tròn
    const eg = g.createLinearGradient(x0, 0, x1, 0);
    eg.addColorStop(0, 'rgba(0,0,0,.2)'); eg.addColorStop(.25, 'rgba(0,0,0,0)'); eg.addColorStop(.85, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,.18)');
    g.fillStyle = eg; g.fillRect(0, 0, W, H);
    g.restore();
    bodyPath(); g.lineWidth = Math.max(1, W * .0055); g.strokeStyle = rgba(darken(P.top, .55), .75); g.stroke();
    g.restore();

    // --- nắp mang, miệng
    gill(g, C, P.gill || {});
    mouth(g, C, P.mouth || {});
    if (P.teeth) teeth(g, C, P.mouth || {}, P.teeth);
    if (P.front) P.front(g, C);

    // --- vây trước (đè lên thân)
    if (F.pectoral) pectoral(g, C, F.pectoral);
    if (P.over) P.over(g, C);
    // --- mắt
    eye(g, C, P.eye || {});
  }

  function pattern(g, C, p) {
    const { W, H, cy, hh, X, topY, botY } = C;
    g.save();
    if (p.t === 'bands') {
      // dải dọc theo thân: p.at = [[u, bề rộng/W, màu, viền]]
      for (const [u, w, col, edge] of p.at) {
        const cx = X(u), tilt = p.tilt || 0;
        g.beginPath();
        g.moveTo(cx - w * W / 2 - tilt * hh, cy - hh * 1.5); g.lineTo(cx + w * W / 2 - tilt * hh, cy - hh * 1.5);
        g.lineTo(cx + w * W / 2 + tilt * hh, cy + hh * 1.5); g.lineTo(cx - w * W / 2 + tilt * hh, cy + hh * 1.5); g.closePath();
        if (edge) { g.lineWidth = W * (p.edgeW || .012); g.strokeStyle = edge; g.stroke(); }
        g.fillStyle = col; g.fill();
      }
    } else if (p.t === 'hstripes') {
      // sọc ngang: p.at = [[v (−1..1 theo độ dày), dày/hh, màu, u0, u1]]
      for (const [v, th, col, u0, u1] of p.at) {
        g.beginPath();
        const n = 28, a = u0 == null ? .08 : u0, b = u1 == null ? .95 : u1;
        for (let i = 0; i <= n; i++) { const u = lerp(a, b, i / n); const y = cy + v * hh * C.prof(u) - th * hh * C.prof(u) / 2; i ? g.lineTo(X(u), y) : g.moveTo(X(u), y); }
        for (let i = n; i >= 0; i--) { const u = lerp(a, b, i / n); g.lineTo(X(u), cy + v * hh * C.prof(u) + th * hh * C.prof(u) / 2); }
        g.closePath(); g.fillStyle = col; g.fill();
      }
    } else if (p.t === 'spots') {
      let s = p.seed || 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < p.n; i++) {
        const u = lerp(p.u0 == null ? .08 : p.u0, p.u1 == null ? .9 : p.u1, rnd()), v = (rnd() * 2 - 1) * (p.spread == null ? .85 : p.spread);
        const r = W * lerp(p.r0, p.r1, rnd());
        g.beginPath(); g.ellipse(X(u), cy + v * hh * C.prof(u), r, r * (p.sq || 1), 0, 0, TAU);
        g.fillStyle = p.col; g.fill();
        if (p.ring) { g.lineWidth = W * .003; g.strokeStyle = p.ring; g.stroke(); }
      }
    } else if (p.t === 'path') { p.draw(g, C); }
    g.restore();
  }

  function scales(g, C, o) {
    const { W, X, cy, hh } = C;
    const s = W * (o.size || .028), col = o.col || 'rgba(0,0,0,.13)', hi = o.hi || 'rgba(255,255,255,.12)';
    g.save();
    g.lineWidth = Math.max(.6, W * .0022);
    let row = 0;
    for (let y = cy - hh * 1.1; y < cy + hh * 1.1; y += s * .55, row++) {
      for (let x = C.x0 + (row % 2) * s * .5; x < C.x1; x += s) {
        g.beginPath(); g.arc(x, y, s * .52, Math.PI * .1, Math.PI * .9);
        g.strokeStyle = col; g.stroke();
        g.beginPath(); g.arc(x, y - s * .05, s * .5, Math.PI * 1.15, Math.PI * 1.85);
        g.strokeStyle = hi; g.stroke();
      }
    }
    g.restore();
  }

  /* ---------- vây ---------- */
  // vây tia: đáy A→B, đỉnh T1 (trước), T2 (sau); cong; tia từ đáy ra mép
  function finShape(g, A, B, T1, T2, col, o) {
    o = o || {};
    const mx = (T1[0] + T2[0]) / 2 + (o.dipX || 0), my = (T1[1] + T2[1]) / 2 + (o.dip || 0);
    g.save();
    const gx = (A[0] + B[0]) / 2, gy = (A[1] + B[1]) / 2;
    const gr = g.createLinearGradient(gx, gy, mx, my);
    gr.addColorStop(0, rgba(col, o.alphaBase == null ? .95 : o.alphaBase)); gr.addColorStop(1, rgba(o.tip || col, o.alphaTip == null ? .5 : o.alphaTip));
    g.beginPath(); g.moveTo(A[0], A[1]);
    g.quadraticCurveTo(lerp(A[0], T1[0], .35) + (o.bx1 || 0), lerp(A[1], T1[1], .35) + (o.by1 || 0), T1[0], T1[1]);
    g.quadraticCurveTo(mx, my, T2[0], T2[1]);
    g.quadraticCurveTo(lerp(B[0], T2[0], .35) + (o.bx2 || 0), lerp(B[1], T2[1], .35) + (o.by2 || 0), B[0], B[1]);
    g.closePath();
    g.fillStyle = gr; g.fill();
    if (o.edge) { g.lineWidth = o.edgeW || 1.2; g.strokeStyle = o.edge; g.stroke(); }
    g.clip();
    const n = o.rays == null ? 9 : o.rays;
    g.lineWidth = Math.max(.6, (o.rayW || 1)); g.strokeStyle = rgba(darken(col, .4), o.rayA == null ? .35 : o.rayA);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bx = lerp(A[0], B[0], t), by = lerp(A[1], B[1], t);
      const tx = lerp(T1[0], T2[0], t), ty = lerp(T1[1], T2[1], t) + (o.dip || 0) * Math.sin(t * Math.PI);
      g.beginPath(); g.moveTo(bx, by); g.lineTo(tx, ty); g.stroke();
    }
    g.restore();
  }

  function dorsal(g, C, d, top) {
    const { X, topY, botY, W, hh } = C;
    const u1 = d.u1, u2 = d.u2, h = d.h * W, edgeY = top ? topY : botY, s = top ? -1 : 1;
    const A = [X(u1), edgeY(u1) + s * -1.5], B = [X(u2), edgeY(u2) + s * -1.5];
    const peak = d.peak == null ? .3 : d.peak;
    const T1 = [lerp(X(u1), X(u2), peak) + (d.sweep || 0) * W, edgeY(lerp(u1, u2, peak)) + s * h];
    const T2 = [X(u2) + (d.tail || 0) * W, edgeY(u2) + s * h * (d.rearH == null ? .35 : d.rearH)];
    finShape(g, A, B, T1, T2, d.col, { rays: d.rays, dip: s * (d.dip || 0) * h, edge: d.edge, edgeW: W * .004, tip: d.tip, alphaTip: d.alphaTip });
    if (d.spines) {
      g.save(); g.strokeStyle = rgba(darken(d.col, .5), .7); g.lineWidth = Math.max(.8, W * .004);
      for (let i = 0; i < d.spines; i++) {
        const t = i / (d.spines - 1 || 1), u = lerp(u1, u2, t);
        const sy = edgeY(u) + s * h * (1 - Math.abs(t - peak) * .9 - .06);
        g.beginPath(); g.moveTo(X(u), edgeY(u) + s * -1); g.lineTo(X(u) + (d.sweep || 0) * W * (1 - t), sy); g.stroke();
      }
      g.restore();
    }
  }

  function pelvic(g, C, d) {
    const { X, botY, W } = C;
    const u = d.u, A = [X(u), botY(u) - 2], B = [X(u - d.w), botY(u - d.w) - 2];
    finShape(g, A, B, [X(u - d.w * .4) + d.sweep * W * .5, botY(u) + d.h * W], [X(u - d.w * 1.2) - d.sweep * W, botY(u) + d.h * W * .55], d.col, { rays: 4, edge: d.edge, edgeW: W * .003 });
  }

  function pectoral(g, C, d) {
    const { X, cy, hh, W, topY, botY } = C;
    const u = d.u, ax = X(u), ay = cy + (d.v || .05) * hh;
    const len = d.len * W, wid = d.wid * W;
    g.save();
    g.translate(ax, ay); g.rotate(d.rot == null ? .5 : d.rot);
    finShape(g, [0, -wid * .35], [0, wid * .35], [-len * (d.fwd || .35), -wid * .8], [-len, wid * (d.tipv || .1)], d.col, { rays: d.rays || 8, edge: d.edge, edgeW: W * .003, alphaBase: d.alpha == null ? .85 : d.alpha, alphaTip: .35 });
    g.restore();
  }

  function caudal(g, C, o) {
    const { W, H, cy, X, topY, botY, x0, hh, P } = C;
    const type = o.type || 'fork';
    const tl = (P.tl || .2) * W, rx = x0 + W * .02;
    const ped = Math.max(hh * (P.ped == null ? .2 : P.ped), W * .004);
    const col = o.col || darken(P.top, .08);
    const spread = (o.spread || .09) * W, len = (o.len || .2) * W;
    const up = o.up == null ? 1 : o.up, dn = o.dn == null ? 1 : o.dn;
    g.save();
    let path;
    if (type === 'fork' || type === 'lunate') {
      const notch = type === 'lunate' ? .5 : .62;
      const tipX = rx - len, bend = type === 'lunate' ? W * .035 : 0;
      path = () => {
        g.beginPath(); g.moveTo(rx, cy - ped);
        g.bezierCurveTo(rx - len * .35, cy - ped - spread * .35 * up, tipX + bend, cy - spread * up * .75, tipX, cy - spread * up);
        g.bezierCurveTo(tipX + len * (type === 'lunate' ? .18 : .1), cy - spread * up * .42, rx - len * notch, cy - ped * .3, rx - len * notch, cy);
        g.bezierCurveTo(rx - len * notch, cy + ped * .3, tipX + len * (type === 'lunate' ? .18 : .1), cy + spread * dn * .42, tipX, cy + spread * dn);
        g.bezierCurveTo(tipX + bend, cy + spread * dn * .75, rx - len * .35, cy + ped + spread * .35 * dn, rx, cy + ped);
        g.closePath();
      };
    } else if (type === 'round') {
      path = () => {
        g.beginPath(); g.moveTo(rx, cy - ped);
        g.bezierCurveTo(rx - len * .5, cy - spread * up * 1.1, rx - len * 1.02, cy - spread * up * .6, rx - len, cy);
        g.bezierCurveTo(rx - len * 1.02, cy + spread * dn * .6, rx - len * .5, cy + spread * dn * 1.1, rx, cy + ped);
        g.closePath();
      };
    } else if (type === 'shark') {
      path = () => {
        g.beginPath(); g.moveTo(rx, cy - ped);
        g.bezierCurveTo(rx - len * .3, cy - ped - spread * .9, rx - len * .75, cy - spread * 1.45, rx - len, cy - spread * 1.55);
        g.bezierCurveTo(rx - len * .72, cy - spread * .8, rx - len * .55, cy - spread * .2, rx - len * .46, cy + spread * .1);
        g.bezierCurveTo(rx - len * .6, cy + spread * .55, rx - len * .62, cy + spread * .8, rx - len * .58, cy + spread * .95);
        g.bezierCurveTo(rx - len * .3, cy + spread * .6, rx - len * .12, cy + ped + spread * .25, rx, cy + ped);
        g.closePath();
      };
    } else if (type === 'whip') {
      path = () => { g.beginPath(); g.moveTo(rx, cy - ped * .7); g.lineTo(rx - len, cy - W * .002); g.lineTo(rx - len, cy + W * .002); g.lineTo(rx, cy + ped * .7); g.closePath(); };
    } else { // trunc
      path = () => {
        g.beginPath(); g.moveTo(rx, cy - ped);
        g.bezierCurveTo(rx - len * .45, cy - spread * up, rx - len * .85, cy - spread * up * 1.05, rx - len, cy - spread * up * .9);
        g.quadraticCurveTo(rx - len * .93, cy, rx - len, cy + spread * dn * .9);
        g.bezierCurveTo(rx - len * .85, cy + spread * dn * 1.05, rx - len * .45, cy + spread * dn, rx, cy + ped);
        g.closePath();
      };
    }
    path();
    const gr = g.createLinearGradient(rx, 0, rx - len, 0);
    gr.addColorStop(0, rgba(col, .98)); gr.addColorStop(1, rgba(o.tip || col, o.alphaTip == null ? .72 : o.alphaTip));
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    if (o.bands) for (const [t, w, c2] of o.bands) { g.fillStyle = c2; g.fillRect(rx - len * (t + w / 2), 0, len * w, H); }
    g.lineWidth = Math.max(.6, W * .0022); g.strokeStyle = rgba(darken(col, .45), .38);
    const n = o.rays == null ? 12 : o.rays;
    for (let i = 0; i <= n; i++) {
      const t = i / n, ty = cy + (t * 2 - 1) * spread * 1.2;
      g.beginPath(); g.moveTo(rx, cy + (t * 2 - 1) * ped); g.lineTo(rx - len * 1.02, ty); g.stroke();
    }
    g.restore();
    path(); g.lineWidth = Math.max(1, W * .004); g.strokeStyle = rgba(o.edge || darken(col, .5), .65); g.stroke();
    g.restore();
  }

  function gill(g, C, o) {
    if (o.none) return;
    const { X, cy, hh, W } = C, u = o.u || .76;
    g.save();
    g.lineWidth = Math.max(1, W * .0042); g.strokeStyle = rgba(o.col || '#000000', o.a == null ? .38 : o.a); g.lineCap = 'round';
    const slits = o.slits || 1;
    for (let i = 0; i < slits; i++) {
      const x = X(u) - i * W * .014, k = hh * C.prof(u) * (o.k || .8);
      g.beginPath(); g.moveTo(x + W * .008, cy - k * .85); g.quadraticCurveTo(x - W * .028, cy, x + W * .006, cy + k * .85); g.stroke();
    }
    g.restore();
  }

  // Miệng và răng đi theo đường viền thân, nên không bao giờ nằm ngoài thân cá.
  function mouthPts(C, o) {
    const { X, cy, hh, W, x0, x1 } = C, len = (o.len || .035) * W, v = o.v == null ? .22 : o.v, a = o.open || 0, pts = [];
    for (let i = 0; i <= 10; i++) {
      const k = i / 10, x = x1 - 1 - len * k, u = clamp((x - x0) / (x1 - x0), 0, 1);
      pts.push([x, cy + v * hh * C.prof(u) + len * a * k * k * 1.4 + len * .06 * Math.sin(k * Math.PI)]);
    }
    return pts;
  }
  function mouth(g, C, o) {
    if (o.none) return;
    const pts = mouthPts(C, o), W = C.W;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = Math.max(1, W * .0042); g.strokeStyle = 'rgba(30,10,10,.72)';
    g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    if (o.lip) { g.strokeStyle = rgba(o.lip, .5); g.lineWidth = W * .005; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1] - 2) : g.moveTo(p[0], p[1] - 2)); g.stroke(); }
    g.restore();
  }
  function teeth(g, C, o, t) {
    const pts = mouthPts(C, o), W = C.W, n = t.n, size = t.size * W;
    g.save(); g.fillStyle = t.col || '#f7f7f1'; g.strokeStyle = 'rgba(40,30,30,.45)'; g.lineWidth = Math.max(.5, W * .0012);
    for (let i = 0; i < n; i++) {
      const k = (i + .5) / n * (pts.length - 1), a = Math.floor(k), f = k - a, A = pts[a], B = pts[Math.min(pts.length - 1, a + 1)];
      const x = lerp(A[0], B[0], f), y = lerp(A[1], B[1], f), bw = size * .8;
      g.beginPath(); g.moveTo(x + bw / 2, y); g.lineTo(x - bw / 2, y); g.lineTo(x - bw * .15, y + size * (1 - (t.taper || 0) * i / n)); g.closePath(); g.fill(); g.stroke();
    }
    g.restore();
  }

  function eye(g, C, o) {
    const { X, cy, hh, W } = C;
    const u = o.u || .88, v = o.v == null ? -.16 : o.v, r = (o.r || .024) * W;
    const x = X(u), y = cy + v * hh * C.prof(u) * 1.2;
    g.save();
    g.beginPath(); g.arc(x, y, r * 1.28, 0, TAU); g.fillStyle = o.ring || 'rgba(8,10,16,.92)'; g.fill();
    const ir = g.createRadialGradient(x - r * .25, y - r * .3, r * .1, x, y, r);
    ir.addColorStop(0, lighten(o.iris || '#f4d35a', .5)); ir.addColorStop(.6, o.iris || '#f4d35a'); ir.addColorStop(1, darken(o.iris || '#f4d35a', .45));
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = ir; g.fill();
    g.beginPath(); g.arc(x + r * .08, y, r * (o.pupil || .56), 0, TAU); g.fillStyle = '#05070b'; g.fill();
    g.beginPath(); g.arc(x - r * .3, y - r * .34, r * .27, 0, TAU); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill();
    g.beginPath(); g.arc(x + r * .3, y + r * .3, r * .12, 0, TAU); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
    g.restore();
  }

  /* ---------- dữ liệu loài ---------- */
  const S = {};
  const sp = (id, name, o) => { o.id = id; o.name = name; S[id] = o; return o; };

  // hit: {back, front, r} theo tỉ lệ chiều dài; role: school|prey|hunter|giant|jelly
  sp('anchovy', 'Cá cơm', {
    size: [24, 32], aspect: .22, role: 'school', depth: [.02, .38], speed: 1.12, hit: { back: .3, front: .44, r: .09 },
    paint: { tl: .2, hh: .058, a: .9, b: .75, ped: .22, top: '#4f6c62', mid: '#b4ced6', belly: '#f2f7f6', stops: [0, .4, 1], scales: { size: .02, col: 'rgba(0,0,0,.08)' },
      pattern: [{ t: 'hstripes', at: [[.05, .26, '#dfeef4', .1, .97]] }],
      fins: { dorsal: { u1: .44, u2: .6, h: .035, col: '#8fb0b5', rays: 4 }, anal: { u1: .38, u2: .55, h: .03, col: '#a8c4c8', rays: 4 }, pectoral: { u: .74, len: .06, wid: .03, col: '#c9dde0', rot: .7 } },
      caudal: { type: 'fork', spread: .085, len: .16, col: '#8fb0b5', rays: 8 }, eye: { u: .87, r: .02, iris: '#e8e8d0' }, gill: { u: .75 }, mouth: { len: .02, v: .3 } }
  });
  sp('sardine', 'Cá trích', {
    size: [32, 44], aspect: .27, role: 'school', depth: [.03, .45], speed: 1.1, hit: { back: .3, front: .44, r: .1 },
    paint: { tl: .2, hh: .068, a: .85, b: .7, ped: .2, top: '#27547a', mid: '#a9c0cf', belly: '#f4f7f8', stops: [0, .36, 1],
      pattern: [{ t: 'spots', n: 6, u0: .45, u1: .8, spread: .45, r0: .008, r1: .012, col: 'rgba(15,35,60,.55)', seed: 3 }, { t: 'hstripes', at: [[-.28, .3, 'rgba(70,150,200,.5)', .1, .95]] }],
      fins: { dorsal: { u1: .42, u2: .6, h: .045, col: '#41688a', rays: 5 }, anal: { u1: .3, u2: .46, h: .032, col: '#b6c9d4', rays: 4 }, pectoral: { u: .74, len: .07, wid: .035, col: '#cfdde5', rot: .7 }, pelvic: { u: .5, w: .05, h: .04, sweep: .01, col: '#cfdde5' } },
      caudal: { type: 'fork', spread: .1, len: .17, col: '#41688a', rays: 9 }, eye: { u: .87, r: .022, iris: '#eee9cf' }, gill: { u: .75 }, mouth: { len: .022, v: .28 } }
  });
  sp('clown', 'Cá hề', {
    size: [36, 48], aspect: .6, role: 'prey', depth: [.1, .5], speed: .9, hit: { back: .3, front: .44, r: .16 },
    paint: { tl: .2, hh: .17, a: 1.0, b: .55, ped: .38, top: '#ff7a10', mid: '#ff8e24', belly: '#ffb04d', stops: [0, .5, 1], scales: { size: .03, col: 'rgba(120,40,0,.12)' },
      pattern: [{ t: 'bands', at: [[.82, .09, '#fbfbf6', '#17110d'], [.52, .1, '#fbfbf6', '#17110d'], [.2, .07, '#fbfbf6', '#17110d']], tilt: -.06, edgeW: .012 }],
      fins: { dorsal: { u1: .22, u2: .8, h: .08, col: '#ff8a1a', rays: 11, edge: '#17110d', peak: .5, rearH: .55, dip: .1 }, anal: { u1: .3, u2: .55, h: .07, col: '#ff8a1a', edge: '#17110d', rays: 6 }, pectoral: { u: .74, len: .12, wid: .09, col: '#ff9a35', edge: '#17110d', rot: .55, rays: 7 }, pelvic: { u: .55, w: .07, h: .07, sweep: .02, col: '#ff9a35', edge: '#17110d' } },
      caudal: { type: 'round', spread: .16, len: .19, col: '#ff8a1a', edge: '#17110d', rays: 11 }, eye: { u: .88, r: .04, iris: '#ffd23f', v: -.22 }, gill: { u: .78, a: .25 }, mouth: { len: .04, v: .26 } }
  });
  sp('damsel', 'Cá thia xanh', {
    size: [44, 58], aspect: .6, role: 'prey', depth: [.1, .5], speed: 1, hit: { back: .3, front: .44, r: .15 },
    paint: { tl: .2, hh: .16, a: .95, b: .5, ped: .3, top: '#0c3fb8', mid: '#2272f0', belly: '#78b0ff', stops: [0, .45, 1], scales: { size: .032, col: 'rgba(0,10,60,.18)', hi: 'rgba(160,220,255,.25)' },
      pattern: [{ t: 'spots', n: 14, u0: .3, u1: .85, spread: .7, r0: .004, r1: .008, col: 'rgba(150,230,255,.8)', seed: 11 }],
      fins: { dorsal: { u1: .22, u2: .8, h: .09, col: '#1d62dc', rays: 12, peak: .45, rearH: .6, tail: .04, edge: '#0a2a80' }, anal: { u1: .3, u2: .52, h: .07, col: '#2b78ee', rays: 6, edge: '#0a2a80' }, pectoral: { u: .74, len: .1, wid: .07, col: '#3a8cff', rot: .55 }, pelvic: { u: .55, w: .06, h: .07, sweep: .02, col: '#3a8cff' } },
      caudal: { type: 'fork', spread: .13, len: .19, col: '#ffd22b', tip: '#ffe98a', rays: 10 }, eye: { u: .87, r: .036, iris: '#ffe066', v: -.18 }, gill: { u: .77 }, mouth: { len: .035, v: .25 } }
  });
  sp('butterfly', 'Cá bướm', {
    size: [54, 68], aspect: 1.0, role: 'prey', depth: [.12, .55], speed: .85, hit: { back: .3, front: .44, r: .24 },
    paint: { tl: .17, hh: .27, a: 1.0, b: .55, ped: .22, snout: .05, top: '#ffd22e', mid: '#ffe05a', belly: '#fff2a6', stops: [0, .5, 1], scales: { size: .028, col: 'rgba(130,90,0,.18)' },
      pattern: [{ t: 'path', draw: (g, C) => { g.strokeStyle = 'rgba(190,130,0,.35)'; g.lineWidth = C.W * .004; for (let i = 0; i < 9; i++) { const u = .2 + i * .075; g.beginPath(); g.moveTo(C.X(u), C.cy - C.hh * C.prof(u)); g.lineTo(C.X(u) - C.W * .06, C.cy + C.hh * .9 * C.prof(u)); g.stroke(); } } },
        { t: 'bands', at: [[.86, .06, '#14110a', null]], tilt: .02 },
        { t: 'spots', n: 1, u0: .2, u1: .2, spread: -.5, r0: .032, r1: .032, col: '#14110a', ring: '#fff6c2' }],
      fins: { dorsal: { u1: .22, u2: .86, h: .13, col: '#ffd22e', rays: 14, edge: '#14110a', peak: .35, sweep: -.02, rearH: .8, tail: .02 }, anal: { u1: .25, u2: .72, h: .11, col: '#ffd22e', edge: '#14110a', rays: 11, peak: .4, rearH: .8 }, pectoral: { u: .72, len: .1, wid: .1, col: '#ffe27a', rot: .5 }, pelvic: { u: .6, w: .06, h: .1, sweep: .02, col: '#ffe27a' } },
      caudal: { type: 'trunc', spread: .15, len: .15, col: '#ffe36e', rays: 11 }, eye: { u: .87, r: .034, iris: '#ffe9a0', v: -.12, ring: 'rgba(8,8,8,.95)' }, gill: { u: .8, a: .2 }, mouth: { len: .025, v: .22 } }
  });
  sp('tang', 'Cá bắp nẻ xanh', {
    size: [70, 90], aspect: .8, role: 'prey', depth: [.18, .6], speed: .95, hit: { back: .3, front: .44, r: .2 },
    paint: { tl: .2, hh: .22, a: .85, b: .5, ped: .2, top: '#0b2fa8', mid: '#1c5fe6', belly: '#6aa6ff', stops: [0, .5, 1], scales: { size: .026, col: 'rgba(0,10,70,.15)', hi: 'rgba(160,210,255,.2)' },
      pattern: [{ t: 'path', draw: (g, C) => {
        g.fillStyle = '#06143e'; g.beginPath();
        g.moveTo(C.X(.82), C.cy - C.hh * .35); g.bezierCurveTo(C.X(.55), C.cy - C.hh * .95, C.X(.35), C.cy - C.hh * .6, C.X(.2), C.cy - C.hh * .15);
        g.bezierCurveTo(C.X(.12), C.cy + C.hh * .05, C.X(.05), C.cy + C.hh * .1, C.X(.02), C.cy);
        g.lineTo(C.X(.02), C.cy + C.hh * .2); g.bezierCurveTo(C.X(.3), C.cy + C.hh * .35, C.X(.38), C.cy + C.hh * .78, C.X(.55), C.cy + C.hh * .45);
        g.bezierCurveTo(C.X(.7), C.cy + C.hh * .25, C.X(.76), C.cy + C.hh * .05, C.X(.82), C.cy - C.hh * .35); g.fill();
        g.strokeStyle = 'rgba(70,140,255,.5)'; g.lineWidth = C.W * .004; g.stroke(); } }],
      fins: { dorsal: { u1: .12, u2: .78, h: .11, col: '#0f3fc8', rays: 14, peak: .5, rearH: .7, edge: '#06143e' }, anal: { u1: .16, u2: .62, h: .09, col: '#0f3fc8', rays: 10, edge: '#06143e', rearH: .7 }, pectoral: { u: .73, len: .13, wid: .09, col: '#ffe02b', edge: '#06143e', rot: .55 }, pelvic: { u: .55, w: .07, h: .08, sweep: .02, col: '#1c5fe6' } },
      caudal: { type: 'fork', spread: .17, len: .2, col: '#ffdc2b', tip: '#fff08a', edge: '#06143e', rays: 11 }, eye: { u: .88, r: .028, iris: '#f6f0c0', v: -.1 }, gill: { u: .77 }, mouth: { len: .03, v: .22 } }
  });
  sp('angel', 'Cá thần tiên', {
    size: [86, 110], aspect: 1.12, role: 'prey', depth: [.16, .6], speed: .85, hit: { back: .3, front: .44, r: .22 },
    paint: { tl: .15, hh: .26, a: 1.0, b: .5, ped: .2, top: '#1a4fb0', mid: '#ffc928', belly: '#ffe27a', stops: [0, .35, 1], snout: .02, scales: { size: .026, col: 'rgba(80,50,0,.16)' },
      pattern: [{ t: 'path', draw: (g, C) => { g.strokeStyle = 'rgba(60,130,255,.85)'; g.lineWidth = C.W * .007; for (let i = -4; i <= 4; i++) { g.beginPath(); for (let k = 0; k <= 20; k++) { const u = .06 + k / 20 * .62; const y = C.cy + i * C.hh * .2 * C.prof(u) + C.hh * .0; k ? g.lineTo(C.X(u), y) : g.moveTo(C.X(u), y); } g.stroke(); } } },
        { t: 'bands', at: [[.86, .075, '#0c1c52', '#5fb4ff']], tilt: .03, edgeW: .01 },
        { t: 'spots', n: 1, u0: .72, u1: .72, spread: .3, r0: .0, r1: .0, col: 'rgba(0,0,0,0)' }],
      fins: { dorsal: { u1: .2, u2: .78, h: .13, col: '#2a64d0', rays: 16, peak: .75, sweep: -.1, tail: -.3, rearH: 3.4, edge: '#0c1c52' }, anal: { u1: .24, u2: .68, h: .1, col: '#ffc928', rays: 12, peak: .7, tail: -.2, rearH: 3, edge: '#0c1c52' }, pectoral: { u: .72, len: .1, wid: .09, col: '#ffd84a', rot: .5 }, pelvic: { u: .6, w: .06, h: .11, sweep: .03, col: '#ffd84a' } },
      caudal: { type: 'trunc', spread: .17, len: .15, col: '#ffd22b', rays: 12 }, eye: { u: .87, r: .026, iris: '#fff2b0', v: -.1 }, gill: { u: .8, a: .2 }, mouth: { len: .03, v: .22 } }
  });
  sp('parrot', 'Cá vẹt', {
    size: [110, 140], aspect: .58, role: 'prey', depth: [.2, .65], speed: .95, hit: { back: .3, front: .44, r: .16 },
    paint: { tl: .19, hh: .15, a: .8, b: .55, ped: .28, top: '#0f9a98', mid: '#23c8b4', belly: '#ff9ec2', stops: [0, .45, 1], scales: { size: .038, col: 'rgba(0,50,60,.28)', hi: 'rgba(255,255,255,.2)' }, headTint: ['#ff7fb0', .35, '#7be8ff', .18],
      pattern: [{ t: 'hstripes', at: [[.35, .12, 'rgba(255,170,200,.65)', .1, .9]] }],
      fins: { dorsal: { u1: .16, u2: .72, h: .07, col: '#2dd4c0', rays: 14, edge: '#ff7fb0', peak: .5 }, anal: { u1: .2, u2: .56, h: .06, col: '#ff9ec2', rays: 9 }, pectoral: { u: .72, len: .12, wid: .08, col: '#ffd0e2', edge: '#14a8a0', rot: .5 }, pelvic: { u: .55, w: .06, h: .06, sweep: .02, col: '#ff9ec2' } },
      caudal: { type: 'round', spread: .1, len: .17, col: '#27c9b6', edge: '#ff7fb0', rays: 12 }, eye: { u: .85, r: .026, iris: '#ffcb52', v: -.1 }, gill: { u: .74 }, mouth: { none: true },
      front: (g, C) => { const x = C.x1, y = C.cy + C.hh * .22; g.fillStyle = '#ecfffb'; g.strokeStyle = '#0c6f6a'; g.lineWidth = C.W * .004; g.beginPath(); g.moveTo(x - C.W * .05, y - C.hh * .3); g.quadraticCurveTo(x + C.W * .002, y - C.hh * .2, x + C.W * .002, y); g.quadraticCurveTo(x, y + C.hh * .25, x - C.W * .05, y + C.hh * .32); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x - C.W * .05, y + .005 * C.W); g.lineTo(x + C.W * .002, y); g.stroke(); } }
  });
  sp('puffer', 'Cá nóc', {
    size: [98, 128], aspect: .92, role: 'prey', depth: [.2, .6], speed: .6, hit: { back: .3, front: .44, r: .3 },
    paint: { tl: .15, hh: .3, a: .7, b: .5, ped: .3, top: '#8a6b34', mid: '#d8c081', belly: '#f8f1d8', stops: [0, .5, 1], asym: .1, scales: false, gloss: true,
      pattern: [{ t: 'spots', n: 46, u0: .08, u1: .9, spread: .8, r0: .006, r1: .016, col: 'rgba(60,40,15,.55)', seed: 17 }, { t: 'hstripes', at: [[.7, .5, 'rgba(255,255,240,.5)', .15, .9]] }],
      fins: { dorsal: { u1: .3, u2: .42, h: .09, col: '#e4d29c', rays: 7, sweep: -.02 }, anal: { u1: .3, u2: .4, h: .08, col: '#e4d29c', rays: 6 }, pectoral: { u: .7, len: .1, wid: .08, col: '#efe0b2', rot: .3, rays: 8 } },
      caudal: { type: 'round', spread: .12, len: .14, col: '#d6bf84', rays: 9 }, eye: { u: .83, r: .05, iris: '#7fd0a8', v: -.2, pupil: .5 }, gill: { u: .7, a: .2 }, mouth: { len: .03, v: .3 } }
  });
  sp('puffer_inf', 'Cá nóc phồng', {
    size: [98, 128], aspect: .95, role: 'hidden', depth: [.2, .6], speed: .6, hit: { back: .22, front: .36, r: .34 },
    paint: { tl: .13, hh: .38, a: .55, b: .45, ped: .25, top: '#8a6b34', mid: '#d8c081', belly: '#f8f1d8', stops: [0, .55, 1], asym: .08, scales: false,
      pattern: [{ t: 'spots', n: 60, u0: .08, u1: .92, spread: .85, r0: .006, r1: .016, col: 'rgba(60,40,15,.55)', seed: 17 },
        { t: 'path', draw: (g, C) => { g.strokeStyle = 'rgba(70,45,15,.9)'; g.lineWidth = C.W * .004; g.lineCap = 'round'; for (let i = 0; i < 70; i++) { const a = i * 2.399, r = Math.sqrt(i / 70); const x = C.X(.5 + Math.cos(a) * r * .42), y = C.cy + Math.sin(a) * r * C.hh * .92; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * C.W * .012, y + Math.sin(a) * C.W * .012); g.stroke(); } } }],
      fins: { pectoral: { u: .68, len: .1, wid: .07, col: '#efe0b2', rot: .3, rays: 6 } },
      caudal: { type: 'round', spread: .09, len: .12, col: '#d6bf84', rays: 8 }, eye: { u: .8, r: .055, iris: '#7fd0a8', v: -.22, pupil: .5 }, gill: { none: true }, mouth: { len: .03, v: .32 } }
  });
  sp('lion', 'Cá sư tử', {
    size: [130, 165], aspect: 1.0, role: 'prey', depth: [.3, .75], speed: .55, venom: true, hit: { back: .3, front: .44, r: .17 },
    paint: { tl: .18, hh: .13, a: .85, b: .6, ped: .3, top: '#b3281a', mid: '#d6452c', belly: '#f4d9b8', stops: [0, .5, 1], scales: { size: .03, col: 'rgba(60,0,0,.15)' }, cy: .08,
      pattern: [{ t: 'bands', at: [[.9, .028, '#f8ecd8'], [.82, .03, '#f8ecd8'], [.72, .03, '#f8ecd8'], [.6, .032, '#f8ecd8'], [.48, .034, '#f8ecd8'], [.36, .034, '#f8ecd8'], [.24, .03, '#f8ecd8']], tilt: -.04 }, { t: 'bands', at: [[.86, .02, '#5a1308'], [.77, .022, '#5a1308'], [.66, .022, '#5a1308'], [.54, .024, '#5a1308'], [.42, .024, '#5a1308'], [.3, .024, '#5a1308']], tilt: -.04 }],
      back: (g, C) => { // vây lưng gai dài
        g.save(); g.lineCap = 'round';
        for (let i = 0; i < 13; i++) { const u = .3 + i * .045, x = C.X(u), y = C.topY(u), L = C.W * (.17 - Math.abs(i - 4) * .006); g.strokeStyle = rgba('#7a1b10', .85); g.lineWidth = C.W * .006; g.beginPath(); g.moveTo(x, y + 1); g.quadraticCurveTo(x - C.W * .02, y - L * .6, x - C.W * .05 - i * C.W * .002, y - L); g.stroke();
          g.strokeStyle = 'rgba(250,225,200,.55)'; g.lineWidth = C.W * .0025; g.stroke(); }
        g.restore(); },
      fins: { anal: { u1: .3, u2: .55, h: .07, col: '#d6452c', rays: 8, edge: '#5a1308' }, pectoral: { u: .72, len: .26, wid: .2, col: '#e8603e', tip: '#f6d2b0', edge: '#5a1308', rot: .35, rays: 14, tipv: .25, fwd: .5, alpha: .9 } },
      caudal: { type: 'round', spread: .12, len: .18, col: '#d6452c', tip: '#f4d9b8', rays: 12, bands: [[.3, .08, 'rgba(90,19,8,.5)'], [.6, .08, 'rgba(90,19,8,.4)']] }, eye: { u: .86, r: .03, iris: '#f2c84a', v: -.1 }, gill: { u: .77 }, mouth: { len: .045, v: .22 } }
  });
  sp('mackerel', 'Cá thu', {
    size: [130, 160], aspect: .3, role: 'hunter', depth: [.15, .6], speed: 1.1, hit: { back: .3, front: .44, r: .09 }, sight: 5.5,
    paint: { tl: .2, hh: .075, a: .85, b: .7, ped: .1, top: '#0f5a6e', mid: '#7fb4b8', belly: '#f1f6f4', stops: [0, .38, 1], scales: { size: .022 },
      pattern: [{ t: 'path', draw: (g, C) => { g.strokeStyle = 'rgba(10,50,60,.7)'; g.lineWidth = C.W * .006; for (let i = 0; i < 14; i++) { const u = .15 + i * .056; g.beginPath(); for (let k = 0; k <= 6; k++) { const v = -.95 + k * .16, x = C.X(u) + Math.sin(k * 1.7 + i) * C.W * .008; const y = C.cy + v * C.hh * C.prof(u); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } } }],
      fins: { dorsal: [{ u1: .45, u2: .6, h: .06, col: '#2b7a86', rays: 6 }, { u1: .22, u2: .3, h: .035, col: '#2b7a86', rays: 3 }], anal: { u1: .28, u2: .38, h: .04, col: '#c5d9d8', rays: 4 }, pectoral: { u: .74, len: .08, wid: .04, col: '#2b7a86', rot: .7 } },
      caudal: { type: 'fork', spread: .12, len: .2, col: '#2b7a86', rays: 11 }, eye: { u: .88, r: .02, iris: '#f2e6b0' }, gill: { u: .76 }, mouth: { len: .03, v: .3 },
      over: (g, C) => { g.fillStyle = '#2b7a86'; for (let i = 0; i < 5; i++) { const u = .15 + i * .05, x = C.X(u); g.beginPath(); g.moveTo(x, C.topY(u)); g.lineTo(x - C.W * .02, C.topY(u) - C.W * .022); g.lineTo(x - C.W * .03, C.topY(u)); g.fill(); g.beginPath(); g.moveTo(x, C.botY(u)); g.lineTo(x - C.W * .02, C.botY(u) + C.W * .02); g.lineTo(x - C.W * .03, C.botY(u)); g.fill(); } } }
  });
  sp('jack', 'Cá cam', {
    size: [78, 98], aspect: .52, role: 'hunter', depth: [.12, .55], speed: 1.12, hit: { back: .3, front: .44, r: .13 }, sight: 6,
    paint: { tl: .19, hh: .135, a: .8, b: .6, ped: .12, top: '#4d7f86', mid: '#c9c66e', belly: '#f6f3cf', stops: [0, .38, 1], scales: { size: .026 },
      pattern: [{ t: 'hstripes', at: [[.0, .12, 'rgba(255,224,90,.7)', .08, .92]] }, { t: 'spots', n: 1, u0: .79, u1: .79, spread: -.2, r0: .018, r1: .018, col: 'rgba(10,20,20,.85)' }],
      fins: { dorsal: [{ u1: .42, u2: .58, h: .06, col: '#6a8f8a', rays: 6, edge: '#2c4a4a' }, { u1: .12, u2: .4, h: .05, col: '#6a8f8a', rays: 11, rearH: 1 }], anal: { u1: .12, u2: .38, h: .05, col: '#e2d86e', rays: 10 }, pectoral: { u: .73, len: .1, wid: .05, col: '#d8cf70', rot: .65 }, pelvic: { u: .56, w: .05, h: .06, sweep: .02, col: '#e2d86e' } },
      caudal: { type: 'fork', spread: .15, len: .2, col: '#f0cf2e', rays: 11 }, eye: { u: .88, r: .028, iris: '#f4e7a0', v: -.12 }, gill: { u: .77 }, mouth: { len: .035, v: .28 } }
  });
  sp('grouper', 'Cá mú', {
    size: [190, 240], aspect: .58, role: 'hunter', depth: [.4, .9], speed: .75, hit: { back: .3, front: .44, r: .17 }, sight: 4.5, ambush: true,
    paint: { tl: .17, hh: .165, a: .6, b: .42, ped: .35, top: '#4f3a1c', mid: '#8f6e38', belly: '#d8c18a', stops: [0, .5, 1], scales: { size: .03, col: 'rgba(30,15,0,.2)' },
      pattern: [{ t: 'bands', at: [[.74, .08, 'rgba(40,25,8,.4)'], [.55, .09, 'rgba(40,25,8,.4)'], [.34, .08, 'rgba(40,25,8,.4)']], tilt: -.05 }, { t: 'spots', n: 40, u0: .1, u1: .92, spread: .8, r0: .006, r1: .014, col: 'rgba(240,220,150,.5)', seed: 5 }],
      fins: { dorsal: { u1: .18, u2: .72, h: .09, col: '#6e5428', rays: 14, spines: 9, peak: .5, rearH: .7 }, anal: { u1: .22, u2: .5, h: .08, col: '#6e5428', rays: 8 }, pectoral: { u: .72, len: .14, wid: .1, col: '#9a7a40', rot: .5 }, pelvic: { u: .55, w: .07, h: .08, sweep: .02, col: '#9a7a40' } },
      caudal: { type: 'round', spread: .15, len: .17, col: '#6e5428', rays: 12 }, eye: { u: .84, r: .026, iris: '#e8d27a', v: -.15 }, gill: { u: .74 }, mouth: { len: .1, v: .3, open: .15, lip: '#d8c18a' } }
  });
  sp('mahi', 'Cá nục heo', {
    size: [240, 290], aspect: .54, role: 'hunter', depth: [.08, .45], speed: 1.15, hit: { back: .3, front: .44, r: .14 }, sight: 6,
    paint: { tl: .2, hh: .12, a: .78, b: .38, ped: .15, top: '#087f8a', mid: '#a6d84a', belly: '#f6e48a', stops: [0, .38, 1], dorsalBump: [.62, .98, .06], scales: { size: .024 },
      pattern: [{ t: 'spots', n: 30, u0: .15, u1: .85, spread: .65, r0: .004, r1: .008, col: 'rgba(40,210,255,.8)', seed: 9 }, { t: 'hstripes', at: [[-.5, .3, 'rgba(10,150,170,.5)', .1, .95]] }],
      fins: { dorsal: { u1: .05, u2: .94, h: .075, col: '#1aa5b0', rays: 20, peak: .75, rearH: .5 }, anal: { u1: .18, u2: .6, h: .05, col: '#e6d24a', rays: 12 }, pectoral: { u: .74, len: .08, wid: .04, col: '#e6d24a', rot: .7 } },
      caudal: { type: 'fork', spread: .16, len: .22, col: '#e0cf3a', tip: '#a6d84a', rays: 12 }, eye: { u: .9, r: .022, iris: '#f4e08a', v: -.1 }, gill: { u: .8 }, mouth: { len: .03, v: .3 } }
  });
  sp('tuna', 'Cá ngừ', {
    size: [300, 380], aspect: .36, role: 'hunter', depth: [.3, .85], speed: 1.2, hit: { back: .3, front: .44, r: .1 }, sight: 6.5,
    paint: { tl: .22, hh: .1, a: .8, b: .65, ped: .08, top: '#0d2a58', mid: '#5b8db8', belly: '#eef3f6', stops: [0, .4, 1], sharp: .62, scales: { size: .02 },
      pattern: [{ t: 'hstripes', at: [[.2, .05, 'rgba(255,220,60,.7)', .12, .9]] }],
      fins: { dorsal: [{ u1: .45, u2: .58, h: .06, col: '#14315e', rays: 6, peak: .2, rearH: .3 }, { u1: .27, u2: .35, h: .04, col: '#2a4f7e', rays: 4 }], anal: { u1: .3, u2: .38, h: .04, col: '#c0cfdb', rays: 4 }, pectoral: { u: .75, len: .1, wid: .035, col: '#2a4f7e', rot: .8 } },
      caudal: { type: 'lunate', spread: .18, len: .2, col: '#14315e', rays: 12 }, eye: { u: .89, r: .017, iris: '#e8e0b0' }, gill: { u: .78, slits: 2 }, mouth: { len: .028, v: .3 },
      over: (g, C) => { g.fillStyle = '#f2d230'; for (let i = 0; i < 7; i++) { const u = .1 + i * .035, x = C.X(u); g.beginPath(); g.moveTo(x, C.topY(u)); g.lineTo(x - C.W * .018, C.topY(u) - C.W * .018); g.lineTo(x - C.W * .028, C.topY(u)); g.fill(); g.beginPath(); g.moveTo(x, C.botY(u)); g.lineTo(x - C.W * .018, C.botY(u) + C.W * .018); g.lineTo(x - C.W * .028, C.botY(u)); g.fill(); } } }
  });
  sp('barracuda', 'Cá nhồng', {
    size: [360, 440], aspect: .2, role: 'hunter', depth: [.15, .6], speed: 1.3, hit: { back: .3, front: .44, r: .06 }, sight: 6.5,
    paint: { tl: .18, hh: .052, a: .9, b: 1.0, ped: .2, snout: .02, top: '#34505a', mid: '#9fb5bf', belly: '#f1f5f6', stops: [0, .4, 1], scales: { size: .018 },
      pattern: [{ t: 'path', draw: (g, C) => { g.fillStyle = 'rgba(20,40,50,.55)'; for (let i = 0; i < 11; i++) { const u = .18 + i * .07, x = C.X(u); g.beginPath(); g.moveTo(x, C.topY(u)); g.lineTo(x - C.W * .016, C.cy + C.hh * .15); g.lineTo(x + C.W * .008, C.topY(u)); g.fill(); } } }],
      fins: { dorsal: [{ u1: .35, u2: .43, h: .035, col: '#4b6670', rays: 4 }, { u1: .15, u2: .24, h: .035, col: '#4b6670', rays: 4 }], anal: { u1: .16, u2: .24, h: .03, col: '#bfd0d6', rays: 4 }, pectoral: { u: .72, len: .05, wid: .02, col: '#b9c9d0', rot: .7 }, pelvic: { u: .5, w: .03, h: .03, sweep: .01, col: '#b9c9d0' } },
      caudal: { type: 'fork', spread: .075, len: .15, col: '#4b6670', rays: 9 }, eye: { u: .9, r: .016, iris: '#f2e6b0' }, gill: { u: .8 }, mouth: { len: .07, v: .25, open: .12 },
      teeth: { n: 9, size: .015, taper: .5 } }
  });
  sp('sailfish', 'Cá cờ', {
    size: [480, 560], aspect: .5, role: 'hunter', depth: [.1, .55], speed: 1.4, hit: { back: .3, front: .5, r: .08 }, sight: 7,
    paint: { tl: .2, hh: .075, a: .85, b: .75, ped: .1, snout: .2, top: '#0b2457', mid: '#4a78b0', belly: '#e8eef2', stops: [0, .4, 1], sharp: .6, scales: { size: .02 },
      pattern: [{ t: 'bands', at: [[.7, .012, 'rgba(120,180,240,.35)'], [.6, .012, 'rgba(120,180,240,.35)'], [.5, .012, 'rgba(120,180,240,.35)'], [.4, .012, 'rgba(120,180,240,.35)'], [.3, .012, 'rgba(120,180,240,.35)']]}],
      fins: { dorsal: { u1: .1, u2: .8, h: .2, col: '#17418a', tip: '#5c8fd0', rays: 22, peak: .55, rearH: .1, sweep: .02, edge: '#0b2457' }, anal: [{ u1: .24, u2: .34, h: .05, col: '#c0cfdb', rays: 4 }], pectoral: { u: .74, len: .13, wid: .03, col: '#2a4f7e', rot: .85 }, pelvic: { u: .56, w: .03, h: .12, sweep: .02, col: '#2a4f7e' } },
      caudal: { type: 'lunate', spread: .15, len: .2, col: '#17418a', rays: 12 }, eye: { u: .87, r: .016, iris: '#e8e0b0' }, gill: { u: .76 }, mouth: { none: true },
      front: (g, C) => { // mõm kiếm
        const bx = C.x1 - C.W * .01, by = C.cy + C.hh * .02;
        g.fillStyle = '#243a55'; g.beginPath(); g.moveTo(bx, by - C.hh * .22); g.lineTo(C.W - 1, by - C.W * .004); g.lineTo(C.W - 1, by + C.W * .004); g.lineTo(bx, by + C.hh * .3); g.closePath(); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = C.W * .003; g.stroke(); } }
  });
  sp('shark', 'Cá mập', {
    size: [780, 900], aspect: .36, role: 'hunter', depth: [.45, 1], speed: 1.25, hit: { back: .3, front: .45, r: .1 }, sight: 7,
    paint: { tl: .26, hh: .09, a: .85, b: .72, ped: .1, snout: .0, top: '#4f6678', mid: '#8095a4', belly: '#eef2f3', stops: [0, .5, 1], sharp: .56, scales: false, gloss: false, asym: -.04,
      fins: { dorsal: [{ u1: .5, u2: .66, h: .13, col: '#4a6072', rays: 0, peak: .15, sweep: -.01, rearH: .05 }, { u1: .2, u2: .26, h: .03, col: '#4a6072', rays: 0, rearH: .1 }], anal: { u1: .22, u2: .28, h: .03, col: '#a3b3bd', rays: 0 }, pectoral: { u: .7, len: .2, wid: .06, col: '#566b7c', rot: .85, rays: 0, tipv: .05, fwd: .3 }, pelvic: { u: .48, w: .05, h: .04, sweep: .02, col: '#aab9c2' } },
      caudal: { type: 'shark', spread: .095, len: .26, col: '#4a6072', rays: 0 }, eye: { u: .9, r: .012, iris: '#14181c', v: -.2, pupil: .9, ring: 'rgba(5,8,12,.9)' }, gill: { u: .72, slits: 5, a: .5, k: .55 }, mouth: { len: .06, v: .42, open: .05 },
      teeth: { n: 9, size: .013, taper: .3 } }
  });
  sp('whiteshark', 'Cá mập trắng', {
    size: [1000, 1180], aspect: .36, role: 'hunter', depth: [.55, 1], speed: 1.3, hit: { back: .3, front: .45, r: .11 }, sight: 8,
    paint: { tl: .26, hh: .1, a: .85, b: .72, ped: .1, top: '#3c4a56', mid: '#6b7a86', belly: '#f6f8f8', stops: [0, .5, 1], sharp: .55, scales: false, gloss: false, asym: -.05,
      pattern: [{ t: 'path', draw: (g, C) => { g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = C.W * .003; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(C.X(.55 + i * .06), C.cy - C.hh * .6); g.lineTo(C.X(.5 + i * .06), C.cy - C.hh * .1); g.stroke(); } } }],
      fins: { dorsal: [{ u1: .5, u2: .67, h: .15, col: '#38454f', rays: 0, peak: .15, rearH: .05 }, { u1: .2, u2: .26, h: .03, col: '#38454f', rays: 0 }], anal: { u1: .22, u2: .28, h: .03, col: '#a3b3bd', rays: 0 }, pectoral: { u: .7, len: .23, wid: .065, col: '#46545f', rot: .85, rays: 0, tipv: .05, fwd: .3 }, pelvic: { u: .48, w: .05, h: .04, sweep: .02, col: '#aab9c2' } },
      caudal: { type: 'shark', spread: .1, len: .26, col: '#38454f', rays: 0 }, eye: { u: .9, r: .011, iris: '#101418', v: -.2, pupil: .95, ring: 'rgba(5,8,12,.9)' }, gill: { u: .72, slits: 5, a: .55, k: .55 }, mouth: { len: .075, v: .42, open: .06 },
      teeth: { n: 11, size: .015, taper: .3 } }
  });
  // cá đuối manta: không có thân cá thông thường
  sp('manta', 'Cá đuối manta', {
    size: [560, 680], aspect: .62, role: 'giant', depth: [.15, .7], speed: .55, hit: { back: .35, front: .42, r: .2 }, special: 'manta',
    paint: null
  });
  sp('jelly', 'Sứa', { size: [60, 240], aspect: 1, role: 'jelly', depth: [.15, .85], speed: .25, hit: { back: 0, front: 0, r: .45 }, special: 'jelly', paint: null });
  // cá của người chơi
  sp('hero', 'Cá của bạn', {
    size: [40, 40], aspect: .62, role: 'hero', depth: [0, 1], speed: 1, hit: { back: .3, front: .44, r: .17 },
    paint: { tl: .2, hh: .17, a: .9, b: .5, ped: .3, top: '#f07a00', mid: '#ffb01f', belly: '#fff0a0', stops: [0, .5, 1], scales: { size: .032, col: 'rgba(110,50,0,.16)', hi: 'rgba(255,255,255,.2)' },
      pattern: [{ t: 'hstripes', at: [[-.35, .09, '#1fd8e8', .1, .9], [.05, .09, '#1fd8e8', .1, .9]] }, { t: 'bands', at: [[.9, .028, '#ffffff', null]], tilt: .02 }],
      fins: { dorsal: { u1: .2, u2: .78, h: .1, col: '#1fd8e8', tip: '#b7f6ff', rays: 13, peak: .55, rearH: .55, edge: '#0a7f90' }, anal: { u1: .28, u2: .55, h: .08, col: '#1fd8e8', tip: '#b7f6ff', rays: 7, edge: '#0a7f90' }, pectoral: { u: .74, len: .13, wid: .09, col: '#6ceaf4', edge: '#0a7f90', rot: .55 }, pelvic: { u: .55, w: .07, h: .08, sweep: .02, col: '#6ceaf4' } },
      caudal: { type: 'fork', spread: .16, len: .2, col: '#19c7d8', tip: '#b7f6ff', edge: '#0a7f90', rays: 11 }, eye: { u: .88, r: .042, iris: '#27e0f0', v: -.2 }, gill: { u: .78, a: .3 }, mouth: { len: .04, v: .26 } }
  });

  /* ---------- manta ---------- */
  function paintManta(g, W, H) {
    const cy = H * .52;
    g.strokeStyle = '#1b2836'; g.lineWidth = W * .007; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W * .3, cy + H * .01); g.quadraticCurveTo(W * .16, cy + H * .05, W * .015, cy - H * .01); g.stroke();
    const body = () => {
      g.beginPath();
      g.moveTo(W * .975, cy + H * .06);
      g.bezierCurveTo(W * .93, cy - H * .06, W * .78, cy - H * .36, W * .46, cy - H * .5);     // mép trước lên mút cánh
      g.bezierCurveTo(W * .42, cy - H * .38, W * .34, cy - H * .14, W * .27, cy - H * .0);     // mép sau về thân
      g.bezierCurveTo(W * .31, cy + H * .1, W * .42, cy + H * .26, W * .6, cy + H * .27);     // bụng
      g.bezierCurveTo(W * .8, cy + H * .26, W * .93, cy + H * .17, W * .975, cy + H * .06);
      g.closePath();
    };
    body();
    const gr = g.createLinearGradient(0, cy - H * .5, 0, cy + H * .28);
    gr.addColorStop(0, '#0b1420'); gr.addColorStop(.55, '#22364a'); gr.addColorStop(.62, '#4c6176'); gr.addColorStop(.68, '#e6eef1'); gr.addColorStop(1, '#f7fafa');
    g.fillStyle = gr; g.fill();
    g.save(); body(); g.clip();
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.beginPath(); g.ellipse(W * .8, cy - H * .08, W * .035, H * .09, -.5, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(W * .7, cy - H * .15, W * .03, H * .08, -.55, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = W * .003;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(W * (.52 - i * .012), cy - H * .46 + i * H * .03); g.quadraticCurveTo(W * (.58 + i * .02), cy - H * .08, W * (.62 + i * .04), cy + H * .22); g.stroke(); }
    g.fillStyle = 'rgba(10,20,30,.5)'; for (let i = 0; i < 16; i++) { g.beginPath(); g.arc(W * (.38 + (i * 37 % 13) * .03), cy + H * .12 + (i * 53 % 5) * H * .02, W * .003, 0, TAU); g.fill(); }
    g.restore();
    body(); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = W * .004; g.stroke();
    // thuỳ đầu (cephalic fins)
    g.fillStyle = '#1b2836'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = W * .003;
    g.beginPath(); g.moveTo(W * .95, cy + H * .02); g.quadraticCurveTo(W * 1.0, cy - H * .0, W * 1.0, cy + H * .12); g.quadraticCurveTo(W * .97, cy + H * .1, W * .94, cy + H * .1); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#05070b'; g.beginPath(); g.arc(W * .885, cy + H * .0, W * .011, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(W * .882, cy - H * .008, W * .004, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(30,40,50,.55)'; g.lineWidth = W * .003;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(W * (.6 + i * .03), cy + H * .14); g.quadraticCurveTo(W * (.61 + i * .03), cy + H * .18, W * (.63 + i * .03), cy + H * .22); g.stroke(); }
  }

  /* ---------- sprite: vẽ một lần, tạo mip ---------- */
  const SPRITES = {};
  const BASE_W = 440;
  function sprite(id) {
    if (SPRITES[id]) return SPRITES[id];
    const d = S[id], W = BASE_W, H = Math.round(W * d.aspect);
    const cv = mk(W, H), g = cv.getContext('2d');
    g.lineJoin = 'round';
    if (d.special === 'manta') paintManta(g, W, H); else paintFish(g, W, H, d.paint);
    const mips = [cv];
    let cur = cv;
    while (cur.width > 70) {
      const n = mk(cur.width / 2, cur.height / 2), ng = n.getContext('2d');
      ng.imageSmoothingQuality = 'high'; ng.drawImage(cur, 0, 0, n.width, n.height);
      mips.push(n); cur = n;
    }
    return (SPRITES[id] = { id, mips, W, H, aspect: d.aspect });
  }

  /* ---------- vẽ cá có uốn thân ---------- */
  // f: {x,y} bỏ qua; vẽ tại (x,y) toạ độ màn hình, length = chiều dài thân tính bằng px màn hình
  // o: {angle, flip, phase, amp, alpha, chomp, speed}
  const SLICES = 18;
  function drawFish(ctx, id, x, y, length, o) {
    const spr = sprite(id), d = S[id];
    if (length < 1.5) return;
    let mi = 0; while (mi < spr.mips.length - 1 && spr.mips[mi + 1].width >= length * (o.dpr || 1) * 1.1) mi++;
    const src = spr.mips[mi], sw = src.width, sh = src.height;
    const h = length * spr.aspect;
    ctx.save();
    ctx.translate(x, y);
    const flip = o.flip == null ? 1 : o.flip;
    ctx.rotate(o.angle || 0);
    ctx.scale(flip, 1);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    const amp = (o.amp == null ? .045 : o.amp) * h * 1.7, ph = o.phase || 0;
    const n = length < 24 ? 1 : Math.min(SLICES, Math.max(6, Math.ceil(length / 12))), step = sw / n, dw = length / n;
    const ox = -length / 2, oy = -h / 2;
    const bendAt = t => Math.sin(ph - t * 4.2) * amp * Math.pow(Math.max(0, 1 - t), 1.7);   // t: 0 = đuôi → 1 = mõm
    for (let i = 0; i < n; i++) {
      // mỗi lát là hình bình hành: cạnh trái và phải khớp với lát bên cạnh nên thân liền mạch, không lộ khớp nối
      const y0 = bendAt(i / n), y1 = bendAt((i + 1) / n);
      ctx.save();
      ctx.transform(1, (y1 - y0) / dw, 0, 1, ox + i * dw, oy + y0);
      ctx.drawImage(src, i * step, 0, step + (i < n - 1 ? 1 : 0), sh, 0, 0, dw + (i < n - 1 ? .7 : 0), h);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- sứa (vẽ động) ---------- */
  function drawJelly(ctx, x, y, size, o) {
    const t = o.phase || 0, pulse = Math.sin(t), r = size * .5;
    const hue = o.hue == null ? 300 : o.hue;
    ctx.save(); ctx.translate(x, y); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    const bw = r * (1 + pulse * .08), bh = r * (.78 - pulse * .1);
    // xúc tu
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const k = (i / 8 - .5) * 1.7, bx = k * bw * .85;
      ctx.beginPath(); ctx.moveTo(bx, bh * .2);
      const L = r * (1.4 + (i % 3) * .35);
      for (let s = 1; s <= 12; s++) { const u = s / 12; ctx.lineTo(bx + Math.sin(t * .9 + u * 5 + i) * r * .12 * u + k * r * .1 * u, bh * .2 + u * L); }
      ctx.strokeStyle = `hsla(${hue},80%,78%,${.5 - (i % 2) * .15})`; ctx.lineWidth = Math.max(1, r * (i % 2 ? .035 : .05)); ctx.stroke();
    }
    // tua miệng
    for (let i = 0; i < 4; i++) {
      const k = (i / 3 - .5) * .5 * bw;
      ctx.beginPath(); ctx.moveTo(k, bh * .3);
      for (let s = 1; s <= 10; s++) { const u = s / 10; ctx.lineTo(k + Math.sin(t * 1.1 + u * 4 + i * 2) * r * .16 * u, bh * .3 + u * r * 1.1); }
      ctx.strokeStyle = `hsla(${hue + 20},90%,85%,.55)`; ctx.lineWidth = Math.max(1.5, r * .09); ctx.stroke();
    }
    // chuông
    const gr = ctx.createRadialGradient(0, -bh * .35, bw * .1, 0, 0, bw * 1.1);
    gr.addColorStop(0, `hsla(${hue},90%,92%,.85)`); gr.addColorStop(.6, `hsla(${hue},80%,72%,.55)`); gr.addColorStop(1, `hsla(${hue + 20},85%,60%,.3)`);
    ctx.beginPath(); ctx.moveTo(-bw, bh * .22);
    ctx.bezierCurveTo(-bw * 1.02, -bh * 1.05, bw * 1.02, -bh * 1.05, bw, bh * .22);
    for (let i = 0; i <= 8; i++) { const u = 1 - i / 8; ctx.lineTo(bw * (u * 2 - 1), bh * .22 + Math.sin(i * 2.4 + t * 2) * bh * .06 + (i % 2 ? bh * .06 : 0)); }
    ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
    ctx.strokeStyle = `hsla(${hue},90%,90%,.7)`; ctx.lineWidth = Math.max(1, r * .03); ctx.stroke();
    ctx.strokeStyle = `hsla(${hue},80%,95%,.28)`; ctx.lineWidth = Math.max(.8, r * .02);
    for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * bw * .25, bh * .2); ctx.quadraticCurveTo(i * bw * .3, -bh * .4, i * bw * .1, -bh * .85); ctx.stroke(); }
    ctx.fillStyle = `hsla(${hue + 30},90%,95%,.4)`; ctx.beginPath(); ctx.ellipse(-bw * .3, -bh * .55, bw * .28, bh * .14, -.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  window.FishArt = { S, sprite, drawFish, drawJelly, lighten, darken, rgba, mk };
})();
