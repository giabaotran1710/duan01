/* =========================================================
   HẢI CHIẾN — ĐỒ HOẠ (canvas 2D)
   Mặt biển có vân sáng chuyển động, tàu chiến vẽ nhìn từ trên xuống, lửa khói, đạn bay, nổ, cột nước, âm thanh.
   Dùng chung cho chơi với máy và online. Xuất ra window.HCArt.
   ========================================================= */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dprOf = () => Math.min(2, window.devicePixelRatio || 1);
  // Mũi tàu ở ô (r,c); thân kéo dài ngược hướng mũi. Hướng: 0 Đông, 1 Nam, 2 Tây, 3 Bắc
  const BODY = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  const ANG = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const FONT = '"Chakra Petch", system-ui, sans-serif';

  function shipCells(s) {
    const [dr, dc] = BODY[s.dir];
    const out = [];
    for (let i = 0; i < s.size; i++) out.push({ r: s.r + dr * i, c: s.c + dc * i });
    return out;
  }
  function hash(a, b) { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); }

  function mkCanvas(w, h, dpr) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(w * dpr)); cv.height = Math.max(1, Math.ceil(h * dpr));
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    return { cv, g };
  }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  /* ---------- Hạt mềm (khói, lửa, nước) vẽ sẵn ---------- */
  function soft(R, stops) {
    const c = document.createElement('canvas'); c.width = c.height = R * 2;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(R, R, 0, R, R, R);
    for (const [o, col] of stops) gr.addColorStop(o, col);
    g.fillStyle = gr; g.fillRect(0, 0, R * 2, R * 2);
    return c;
  }
  const SPR = {
    smoke: soft(48, [[0, 'rgba(44,46,50,.9)'], [.45, 'rgba(44,46,50,.5)'], [1, 'rgba(44,46,50,0)']]),
    steam: soft(48, [[0, 'rgba(235,245,252,.9)'], [.5, 'rgba(215,232,244,.4)'], [1, 'rgba(215,232,244,0)']]),
    fire: soft(48, [[0, 'rgba(255,248,210,1)'], [.22, 'rgba(255,196,80,.95)'], [.55, 'rgba(255,96,24,.5)'], [1, 'rgba(200,30,0,0)']]),
    glow: soft(64, [[0, 'rgba(255,252,230,1)'], [.3, 'rgba(255,205,120,.65)'], [1, 'rgba(255,120,40,0)']]),
    water: soft(24, [[0, 'rgba(255,255,255,1)'], [.5, 'rgba(220,240,255,.7)'], [1, 'rgba(200,230,255,0)']]),
    cyan: soft(48, [[0, 'rgba(225,255,255,1)'], [.35, 'rgba(0,229,255,.6)'], [1, 'rgba(0,160,255,0)']]),
    gold: soft(48, [[0, 'rgba(255,255,230,1)'], [.35, 'rgba(255,214,80,.7)'], [1, 'rgba(255,160,0,0)']]),
    red: soft(48, [[0, 'rgba(255,225,225,1)'], [.35, 'rgba(255,40,60,.65)'], [1, 'rgba(255,0,40,0)']]),
    yellow: soft(48, [[0, 'rgba(255,255,225,1)'], [.35, 'rgba(255,221,0,.6)'], [1, 'rgba(255,170,0,0)']])
  };

  /* ---------- Hệ hạt ---------- */
  class Particles {
    constructor(max) { this.list = []; this.max = max; }
    add(p) {
      if (this.list.length >= this.max) return;
      p.age = -(p.delay || 0); p.z = p.z || 0; p.vx = p.vx || 0; p.vy = p.vy || 0; p.vz = p.vz || 0; p.rot = p.rot || 0;
      if (p.s1 === undefined) p.s1 = p.s;
      if (p.a === undefined) p.a = 1;
      if (p.fo === undefined) p.fo = 0.5;
      this.list.push(p);
    }
    clear() { this.list.length = 0; }
    update(dt) {
      const L = this.list; let j = 0;
      for (let i = 0; i < L.length; i++) {
        const p = L[i]; p.age += dt;
        if (p.age >= p.life) continue;
        if (p.age >= 0) {
          if (p.drag) { const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy *= d; }
          if (p.wind) { p.vx += p.wind[0] * dt; p.vy += p.wind[1] * dt; }
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.grav) p.vz -= p.grav * dt;
          p.z += p.vz * dt;
          if (p.grav && p.z < 0) {
            if (p.kind === 'drop') { p.age = p.life; continue; }
            p.z = 0; p.vz *= -0.25; p.vx *= 0.4; p.vy *= 0.4;
          }
          if (p.vr) p.rot += p.vr * dt;
        }
        L[j++] = p;
      }
      L.length = j;
    }
    draw(g) {
      for (const p of this.list) {
        if (p.age < 0) continue;
        const k = p.age / p.life;
        const s = p.s + (p.s1 - p.s) * k;
        let a = p.a;
        if (p.fi) a *= Math.min(1, k / p.fi);
        if (k > p.fo) a *= (1 - k) / (1 - p.fo);
        if (a <= 0.004 || s <= 0) continue;
        const x = p.x, y = p.y - p.z;
        g.globalAlpha = Math.min(1, a);
        g.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        if (p.spr) g.drawImage(SPR[p.spr], x - s, y - s, s * 2, s * 2);
        else if (p.kind === 'chunk') {
          if (p.z > 1) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(p.x - s, p.y - s * .5, s * 2, s); }
          g.save(); g.translate(x, y); g.rotate(p.rot); g.fillStyle = p.col; g.fillRect(-s, -s * .55, s * 2, s * 1.1); g.restore();
        } else if (p.kind === 'drop') {
          g.fillStyle = p.col || '#eaf7ff'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
        } else if (p.kind === 'spark') {
          g.strokeStyle = p.col || '#ffd27a'; g.lineWidth = s; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x, y); g.lineTo(x - p.vx * .035, y - (p.vy - p.vz) * .035); g.stroke();
        } else if (p.kind === 'ring') {
          g.strokeStyle = p.col; g.lineWidth = Math.max(.5, p.lw * (1 - k));
          g.beginPath(); g.ellipse(x, y, s, s * (p.flat || 1), 0, 0, TAU); g.stroke();
        } else if (p.kind === 'arc') {
          g.strokeStyle = p.col; g.lineWidth = Math.max(.6, p.lw * (1 - k * .6)); g.lineCap = 'round';
          g.beginPath(); g.arc(x, y, s, p.ang - .62, p.ang + .62); g.stroke();
        } else if (p.kind === 'text') {
          const sc = k < .15 ? .6 + k / .15 * .5 : 1.1 - Math.min(.1, (k - .15));
          g.font = `700 ${p.s * sc}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineWidth = Math.max(3, p.s * .18); g.lineJoin = 'round'; g.strokeStyle = 'rgba(2,10,20,.85)';
          g.strokeText(p.txt, x, y); g.fillStyle = p.col; g.fillText(p.txt, x, y);
        }
      }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
  }

  /* ---------- Mặt biển ---------- */
  // Vân sáng đáy biển: hiệu khoảng cách Voronoi (F2 − F1), ghép liền mép
  function makeCaustic(S, N) {
    const pts = [];
    for (let i = 0; i < N; i++) pts.push([Math.random() * S, Math.random() * S]);
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const g = cv.getContext('2d'); const img = g.createImageData(S, S); const d = img.data;
    const half = S / 2, k = S * 0.05;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let d1 = 1e9, d2 = 1e9;
      for (const p of pts) {
        let dx = Math.abs(x - p[0]); if (dx > half) dx = S - dx;
        let dy = Math.abs(y - p[1]); if (dy > half) dy = S - dy;
        const dd = dx * dx + dy * dy;
        if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
      }
      let b = Math.max(0, 1 - (Math.sqrt(d2) - Math.sqrt(d1)) / k); b = b * b * b;
      const i = (y * S + x) * 4;
      d[i] = 190; d[i + 1] = 236; d[i + 2] = 255; d[i + 3] = b * 255;
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
  const caustic = { a: null, b: null };
  const patCache = new WeakMap();
  function pattern(g, tile) {
    let m = patCache.get(g); if (!m) { m = new Map(); patCache.set(g, m); }
    let p = m.get(tile); if (!p) { p = g.createPattern(tile, 'repeat'); m.set(tile, p); }
    return p;
  }
  function layer(g, tile, x, y, w, h, ox, oy, sc, a) {
    const p = pattern(g, tile), span = tile.width * sc;
    if (p.setTransform) p.setTransform(new DOMMatrix([sc, 0, 0, sc, x + (ox % span), y + (oy % span)]));
    g.globalAlpha = a; g.fillStyle = p; g.fillRect(x, y, w, h); g.globalAlpha = 1;
  }
  const OCEAN = ['#0d5480', '#0a3d64', '#062a48'];
  function ocean(g, x, y, w, h, t, unit, tone) {
    if (!caustic.a) { caustic.a = makeCaustic(160, 17); caustic.b = makeCaustic(128, 12); }
    tone = tone || OCEAN;
    const gr = g.createLinearGradient(x, y, x + w * .35, y + h);
    gr.addColorStop(0, tone[0]); gr.addColorStop(.55, tone[1]); gr.addColorStop(1, tone[2]);
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    const lg = g.createRadialGradient(x + w * .3, y + h * .25, 0, x + w * .3, y + h * .25, Math.max(w, h) * .75);
    lg.addColorStop(0, 'rgba(70,180,230,.20)'); lg.addColorStop(1, 'rgba(70,180,230,0)');
    g.fillStyle = lg; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.globalCompositeOperation = 'lighter';
    const sc = unit / 90;
    layer(g, caustic.a, x, y, w, h, t * 9 * sc, t * 5 * sc, sc, .16);
    layer(g, caustic.b, x, y, w, h, -t * 7 * sc, t * 8 * sc, sc * 1.45, .10);
    // lấp lánh nắng
    g.fillStyle = '#fff';
    const n = Math.round(w * h / 9000);
    for (let i = 0; i < n; i++) {
      const ph = t * (0.35 + hash(i, 3) * .5) + hash(i, 9) * 7;
      const cyc = Math.floor(ph), f = ph - cyc;
      const a = Math.pow(Math.max(0, Math.sin(f * Math.PI)), 6) * .55;
      if (a < .02) continue;
      const gx = x + hash(i, cyc) * w, gy = y + hash(cyc, i + 5) * h, L = unit * (.06 + hash(i, 1) * .06);
      g.globalAlpha = a; g.drawImage(SPR.water, gx - L, gy - L * .45, L * 2, L * .9);
    }
    g.restore();
  }

  /* ---------- Tàu chiến ---------- */
  const PAL = {
    own: { hull: ['#2e3d4a', '#62788a', '#8aa0b1', '#566c7e', '#283642'], deck: ['#6e828f', '#92a5b1', '#6c7f8c'], sup: ['#d2dde5', '#8e9eaa'], dark: '#18222a', gun: '#22303a', acc: '#00e5ff', stripe: '#c9a25a' },
    enemy: { hull: ['#262629', '#504f55', '#6b6a71', '#46454b', '#202023'], deck: ['#5b5a61', '#78777f', '#58575e'], sup: ['#b9b7bf', '#7b7a82'], dark: '#121214', gun: '#1d1d21', acc: '#ff4a3d', stripe: '#b3261e' }
  };
  const sprites = new Map();
  function shipDims(size, cs) {
    return { L: size * cs * .94, W: cs * (size === 5 ? .7 : size === 4 ? .64 : size === 3 ? .58 : .5) };
  }
  function shipSprite(size, cs, look, sunk) {
    const dpr = dprOf();
    const key = size + '|' + Math.round(cs * dpr * 4) + '|' + look + '|' + (sunk ? 1 : 0);
    let s = sprites.get(key);
    if (s) return s;
    if (sprites.size > 80) sprites.clear();
    const { L, W } = shipDims(size, cs), pad = cs * .45;
    const w = L + pad * 2, h = W + pad * 2;
    const { cv, g } = mkCanvas(w, h, dpr);
    g.translate(w / 2, h / 2);
    paintShip(g, size, L, W, PAL[look] || PAL.own, sunk, cs);
    s = { cv, w, h };
    sprites.set(key, s);
    return s;
  }

  function paintShip(g, size, L, W, P, sunk, cs) {
    const hl = L / 2, hw = W / 2, bow = Math.min(L * .3, W * 1.55);
    const X = u => -hl + L * u;
    const hull = (k) => {
      const a = hl * k + (1 - k) * 0, b = hw * k, bl = bow * k, st = -hl + (hl - a);
      g.beginPath();
      g.moveTo(st + b * .6, -b);
      g.lineTo(a - bl, -b);
      g.bezierCurveTo(a - bl * .35, -b, a - bl * .04, -b * .42, a, 0);
      g.bezierCurveTo(a - bl * .04, b * .42, a - bl * .35, b, a - bl, b);
      g.lineTo(st + b * .6, b);
      g.quadraticCurveTo(st, b, st, b * .5);
      g.lineTo(st, -b * .5);
      g.quadraticCurveTo(st, -b, st + b * .6, -b);
      g.closePath();
    };
    // bóng đổ xuống mặt nước
    g.save();
    g.shadowColor = 'rgba(0,8,18,.6)'; g.shadowBlur = W * .45; g.shadowOffsetX = W * .1; g.shadowOffsetY = W * .2;
    hull(1); g.fillStyle = P.hull[4]; g.fill();
    g.restore();
    // mạn tàu
    const hg = g.createLinearGradient(0, -hw, 0, hw);
    hg.addColorStop(0, P.hull[0]); hg.addColorStop(.16, P.hull[1]); hg.addColorStop(.5, P.hull[2]); hg.addColorStop(.84, P.hull[3]); hg.addColorStop(1, P.hull[4]);
    hull(1); g.fillStyle = hg; g.fill();
    g.lineWidth = Math.max(1, W * .045); g.strokeStyle = P.dark; g.stroke();
    // boong
    const dg = g.createLinearGradient(0, -hw, 0, hw);
    dg.addColorStop(0, P.deck[0]); dg.addColorStop(.5, P.deck[1]); dg.addColorStop(1, P.deck[2]);
    g.save(); g.translate(-hl * .02, 0); hull(.86); g.restore();
    g.fillStyle = dg; g.fill();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(0,0,0,.09)'; g.lineWidth = Math.max(.5, W * .02);
    for (let y = -hw; y <= hw; y += W * .13) { g.beginPath(); g.moveTo(-hl, y); g.lineTo(hl, y); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.07)';
    for (let x = -hl; x <= hl; x += L / (size * 3)) { g.beginPath(); g.moveTo(x, -hw); g.lineTo(x, hw); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = Math.max(.6, W * .025);
    g.save(); g.translate(-hl * .02, 0); hull(.86); g.restore(); g.stroke();

    // vạch mũi
    g.strokeStyle = P.stripe; g.lineWidth = Math.max(.8, W * .05); g.globalAlpha = .75;
    g.beginPath(); g.moveTo(hl - bow * .55, -hw * .62); g.lineTo(hl - bow * .55, hw * .62); g.stroke();
    g.globalAlpha = 1;
    // neo
    g.fillStyle = P.dark;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(hl - bow * .28, s * hw * .28, Math.max(.8, W * .05), 0, TAU); g.fill(); }

    const shade = (fn) => {
      g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = W * .12; g.shadowOffsetX = W * .07; g.shadowOffsetY = W * .12;
      fn(); g.restore();
    };
    const block = (u0, u1, wf, lvl) => {
      const x0 = X(u0), x1 = X(u1), hh = hw * wf;
      shade(() => {
        const bg = g.createLinearGradient(x0, -hh, x1, hh);
        bg.addColorStop(0, lvl ? P.sup[0] : P.sup[1]); bg.addColorStop(1, lvl ? P.sup[1] : P.deck[2]);
        rr(g, x0, -hh, x1 - x0, hh * 2, hh * .35); g.fillStyle = bg; g.fill();
      });
      rr(g, x0, -hh, x1 - x0, hh * 2, hh * .35); g.lineWidth = Math.max(.6, W * .03); g.strokeStyle = P.dark; g.stroke();
    };
    const windows = (u, wf) => {
      const x = X(u), hh = hw * wf;
      g.fillStyle = '#0d1820'; rr(g, x - W * .05, -hh, W * .1, hh * 2, W * .03); g.fill();
      g.fillStyle = P.acc; g.globalAlpha = .55;
      for (let i = -2; i <= 2; i++) g.fillRect(x - W * .02, i * hh * .36 - W * .02, W * .04, W * .04);
      g.globalAlpha = 1;
    };
    const turret = (u, r, face, n, bl) => {
      const x = X(u);
      g.save(); g.translate(x, 0); if (face < 0) g.rotate(Math.PI);
      g.strokeStyle = P.gun; g.lineCap = 'round'; g.lineWidth = Math.max(.9, r * .2);
      for (let i = 0; i < n; i++) { const oy = (i - (n - 1) / 2) * r * .36; g.beginPath(); g.moveTo(r * .3, oy); g.lineTo(r * .3 + bl, oy); g.stroke(); }
      shade(() => {
        const tg = g.createRadialGradient(-r * .3, -r * .35, r * .1, 0, 0, r * 1.1);
        tg.addColorStop(0, P.sup[0]); tg.addColorStop(1, P.hull[3]);
        g.beginPath(); g.moveTo(-r * .85, -r * .78); g.lineTo(r * .4, -r * .78);
        g.quadraticCurveTo(r * 1.05, -r * .62, r * 1.05, 0); g.quadraticCurveTo(r * 1.05, r * .62, r * .4, r * .78);
        g.lineTo(-r * .85, r * .78); g.quadraticCurveTo(-r, 0, -r * .85, -r * .78); g.closePath();
        g.fillStyle = tg; g.fill();
      });
      g.lineWidth = Math.max(.6, r * .1); g.strokeStyle = P.dark; g.stroke();
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.arc(-r * .35, r * .2, r * .2, 0, TAU); g.fill();
      g.restore();
    };
    const funnel = (u, rx, ry) => {
      const x = X(u);
      shade(() => { g.fillStyle = '#3a454f'; g.beginPath(); g.ellipse(x, 0, rx, ry, 0, 0, TAU); g.fill(); });
      g.fillStyle = '#0b0f13'; g.beginPath(); g.ellipse(x, 0, rx * .62, ry * .62, 0, 0, TAU); g.fill();
      g.strokeStyle = P.stripe; g.lineWidth = Math.max(.6, rx * .25); g.beginPath(); g.ellipse(x, 0, rx * .9, ry * .9, 0, 0, TAU); g.stroke();
    };
    const mast = (u, r) => {
      const x = X(u);
      g.strokeStyle = P.dark; g.lineWidth = Math.max(.7, W * .04);
      g.beginPath(); g.moveTo(x, -hw * .75); g.lineTo(x, hw * .75); g.stroke();
      g.fillStyle = P.sup[0]; g.beginPath(); g.arc(x, 0, r, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = P.acc; g.globalAlpha = .8; g.beginPath(); g.arc(x, 0, r * .35, 0, TAU); g.fill(); g.globalAlpha = 1;
    };
    const aa = (u, side) => { g.fillStyle = P.gun; g.beginPath(); g.arc(X(u), side * hw * .62, Math.max(.8, W * .07), 0, TAU); g.fill(); };

    if (size === 5) {
      turret(.15, hw * .62, -1, 3, L * .085);
      block(.33, .6, .62, 0); block(.4, .57, .46, 1);
      funnel(.37, L * .035, hw * .3);
      block(.47, .56, .3, 1); windows(.555, .28); mast(.5, W * .09);
      aa(.28, -1); aa(.28, 1); aa(.64, -1); aa(.64, 1);
      turret(.81, hw * .56, 1, 3, L * .075);
      turret(.69, hw * .62, 1, 3, L * .085);
    } else if (size === 4) {
      const x = X(.1), r = hw * .55;
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(.6, W * .03);
      g.beginPath(); g.arc(x, 0, r, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `700 ${r * 1.1}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.translate(x, 0); g.rotate(Math.PI / 2); g.fillText('H', 0, r * .05); g.restore();
      turret(.27, hw * .58, -1, 2, L * .08);
      block(.37, .64, .58, 0); block(.46, .62, .4, 1);
      funnel(.42, L * .035, hw * .28); funnel(.52, L * .03, hw * .26);
      windows(.615, .36); mast(.57, W * .09);
      turret(.77, hw * .6, 1, 2, L * .085);
    } else if (size === 3) {
      turret(.16, hw * .5, -1, 1, L * .1);
      g.save(); g.translate(X(.31), 0);
      g.fillStyle = P.gun; rr(g, -L * .06, -hw * .5, L * .12, hw * .32, hw * .1); g.fill(); rr(g, -L * .06, hw * .18, L * .12, hw * .32, hw * .1); g.fill();
      g.restore();
      funnel(.45, L * .04, hw * .32);
      block(.52, .68, .62, 0); block(.56, .67, .42, 1); windows(.665, .4); mast(.6, W * .1);
      turret(.81, hw * .52, 1, 1, L * .11);
    } else {
      g.strokeStyle = P.gun; g.lineWidth = Math.max(.7, W * .05);
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X(.05), s * hw * .45); g.lineTo(X(.15), s * hw * .45); g.stroke(); }
      block(.27, .6, .62, 0); block(.35, .58, .44, 1); windows(.575, .42); mast(.43, W * .11);
      turret(.78, hw * .5, 1, 1, L * .12);
    }

    if (sunk) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(26,14,6,.36)'; g.fillRect(-hl - W, -hw - W, L + W * 2, W * 3);
      for (let i = 0; i < size + 1; i++) {
        const x = -hl + L * hash(i, size), y = (hash(size, i) - .5) * W * .8, r = W * (.35 + hash(i, i) * .35);
        const bg = g.createRadialGradient(x, y, 0, x, y, r);
        bg.addColorStop(0, 'rgba(0,0,0,.5)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = bg; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }

  function shipCenter(view, s) {
    const cells = shipCells(s), a = view.center(cells[0].r, cells[0].c), b = view.center(cells[cells.length - 1].r, cells[cells.length - 1].c);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  // Vẽ tàu tại tâm (cx,cy); o: { look, sunk, alpha, t, foam, wake }
  function drawShip(g, size, dir, cx, cy, cs, o) {
    const t = o.t || 0;
    const spr = shipSprite(size, cs, o.look || 'own', !!o.sunk);
    const { L, W } = shipDims(size, cs);
    const ang = (o.angle !== undefined ? o.angle : ANG[dir]) + (o.sunk ? (o.tilt || 0) : Math.sin(t * 1.3 + size) * .012);
    g.save(); g.translate(cx, cy); g.rotate(ang);
    if (!o.sunk && o.foam !== false) {
      const p = .5 + .5 * Math.sin(t * 2.2 + size);
      g.strokeStyle = `rgba(225,242,255,${.16 + p * .1})`; g.lineWidth = cs * .05;
      g.beginPath(); g.ellipse(0, 0, L / 2 + cs * .06 + p * cs * .03, W / 2 + cs * .05 + p * cs * .02, 0, 0, TAU); g.stroke();
      // sóng mũi
      g.strokeStyle = `rgba(235,248,255,${.35 + p * .15})`; g.lineWidth = cs * .035;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(L / 2 + cs * .03, 0); g.quadraticCurveTo(L / 2 - cs * .1, s * W * .55, L / 2 - cs * .35, s * W * (.62 + p * .06)); g.stroke(); }
    }
    if (o.sunk) {
      // vệt dầu loang
      const og = g.createRadialGradient(0, 0, 0, 0, 0, L * .62);
      og.addColorStop(0, 'rgba(10,8,14,.55)'); og.addColorStop(.6, 'rgba(40,20,60,.22)'); og.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = og; g.beginPath(); g.ellipse(0, 0, L * .62, W * 1.15, 0, 0, TAU); g.fill();
    }
    g.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
    g.drawImage(spr.cv, -spr.w / 2, -spr.h / 2, spr.w, spr.h);
    g.restore();
  }

  /* ---------- Bàn cờ ---------- */
  const WCOL = { torpedo: '#00e5ff', missile: '#ffdd00', stone: '#cfe3f2', bomb: '#ff3b4a' };

  class BoardView {
    constructor(cv, opt) {
      opt = opt || {};
      this.cv = cv; this.g = cv.getContext('2d'); this.N = opt.grid || 12;
      this.tone = opt.tone || null; this.accent = opt.accent || 'rgba(0,229,255,.38)';
      this.parts = new Particles(650);
      this.size = 0; this.acc = new Map();
    }
    setSize(w) {
      w = Math.max(220, Math.floor(w));
      const dpr = dprOf();
      if (w === this.size && dpr === this.dpr) return;
      this.size = w; this.dpr = dpr;
      this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(w * dpr);
      this.cv.style.width = w + 'px'; this.cv.style.height = w + 'px';
      this.m = Math.round(Math.max(15, w * .05));
      this.cs = (w - this.m * 2) / this.N;
      this.ox = this.m; this.oy = this.m;
      this.parts.clear();
      this.buildStatic();
    }
    buildStatic() {
      const w = this.size, m = this.m, N = this.N, cs = this.cs, d = this.dpr;
      // khung
      const F = mkCanvas(w, w, d), g = F.g;
      rr(g, .5, .5, w - 1, w - 1, m * .6);
      const fg = g.createLinearGradient(0, 0, w, w); fg.addColorStop(0, '#1d3a55'); fg.addColorStop(.5, '#0e2338'); fg.addColorStop(1, '#081626');
      g.fillStyle = fg; g.fill(); g.lineWidth = 1; g.strokeStyle = 'rgba(201,162,90,.6)'; g.stroke();
      rr(g, 3.5, 3.5, w - 7, w - 7, m * .5); g.strokeStyle = 'rgba(255,255,255,.06)'; g.stroke();
      rr(g, m - 4, m - 4, cs * N + 8, cs * N + 8, 6); g.fillStyle = '#020a14'; g.fill();
      for (const [x, y] of [[m * .5, m * .5], [w - m * .5, m * .5], [m * .5, w - m * .5], [w - m * .5, w - m * .5]]) {
        const rg = g.createRadialGradient(x - 1, y - 1, 0, x, y, m * .2);
        rg.addColorStop(0, '#f3dca4'); rg.addColorStop(1, '#7a5a22');
        g.fillStyle = rg; g.beginPath(); g.arc(x, y, m * .16, 0, TAU); g.fill();
      }
      g.font = `600 ${Math.round(m * .5)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#86b4d6';
      for (let i = 0; i < N; i++) {
        g.fillText(String.fromCharCode(65 + i), m + cs * (i + .5), m * .52);
        g.fillText(String(i + 1), m * .5, m + cs * (i + .5) + 1);
      }
      this.frameCv = F.cv;
      // lưới
      const G = mkCanvas(w, w, d), h = G.g;
      h.strokeStyle = 'rgba(175,228,255,.13)'; h.lineWidth = 1;
      h.beginPath();
      for (let i = 1; i < N; i++) {
        const p = Math.round(m + cs * i) + .5;
        h.moveTo(p, m); h.lineTo(p, m + cs * N); h.moveTo(m, p); h.lineTo(m + cs * N, p);
      }
      h.stroke();
      h.strokeStyle = 'rgba(200,240,255,.3)';
      h.beginPath();
      const q = Math.max(2, cs * .07);
      for (let i = 1; i < N; i++) for (let j = 1; j < N; j++) {
        const x = m + cs * i, y = m + cs * j;
        h.moveTo(x - q, y); h.lineTo(x + q, y); h.moveTo(x, y - q); h.lineTo(x, y + q);
      }
      h.stroke();
      this.gridCv = G.cv;
      // viền tối + viền sáng
      const V = mkCanvas(w, w, d), v = V.g, S = cs * N;
      const vg = v.createRadialGradient(m + S / 2, m + S / 2, S * .3, m + S / 2, m + S / 2, S * .75);
      vg.addColorStop(0, 'rgba(0,8,20,0)'); vg.addColorStop(1, 'rgba(0,8,20,.55)');
      v.fillStyle = vg; v.fillRect(m, m, S, S);
      v.strokeStyle = this.accent; v.lineWidth = 1.5; v.strokeRect(m + .75, m + .75, S - 1.5, S - 1.5);
      this.vignCv = V.cv;
    }
    center(r, c) { return { x: this.ox + this.cs * (c + .5), y: this.oy + this.cs * (r + .5) }; }
    // Gốc toạ độ lấy từ khung chứa (không dính hiệu ứng thu/phóng của canvas hay rung màn hình) để đạn luôn rơi đúng ô
    base() {
      const b = this.cv.parentElement.getBoundingClientRect();
      return { x: b.left - HCArt.shake.x, y: b.top - HCArt.shake.y, k: b.width / this.size };
    }
    toScreen(x, y) { const b = this.base(); return { x: b.x + x * b.k, y: b.y + y * b.k }; }
    screenCenter(r, c) { const p = this.center(r, c); return this.toScreen(p.x, p.y); }
    screenCs() { return this.cs * this.base().k; }
    cellAt(cx, cy) {
      const b = this.base();
      const x = (cx - b.x) / b.k - this.ox, y = (cy - b.y) / b.k - this.oy;
      const c = Math.floor(x / this.cs), r = Math.floor(y / this.cs);
      if (r < 0 || c < 0 || r >= this.N || c >= this.N) return null;
      return { r, c };
    }
    emit(key, rate, dt, fn) {
      let a = (this.acc.get(key) || Math.random()) + rate * dt;
      while (a >= 1) { a -= 1; fn(); }
      this.acc.set(key, a);
    }
    fireAt(x, y, k, dt, key, strength) {
      const cs = this.cs, P = this.parts;
      this.emit(key + 'f', 14 * strength, dt, () => P.add({ x: x + rnd(-.18, .18) * cs * k, y: y + rnd(-.18, .18) * cs * k, vx: rnd(-6, 6), vy: rnd(-18, -6), spr: 'fire', s: cs * rnd(.24, .36) * k, s1: cs * .05, life: rnd(.45, .7), add: true, a: .95, fo: .3 }));
      this.emit(key + 's', 5 * strength, dt, () => P.add({ x: x + rnd(-.1, .1) * cs, y: y + rnd(-.1, .1) * cs, vx: rnd(-4, 4), vy: rnd(-6, 2), wind: [cs * .4, -cs * .55], drag: .6, spr: 'smoke', s: cs * .2, s1: cs * rnd(.75, 1.05), life: rnd(1.6, 2.4), a: .6, fi: .12, fo: .35 }));
    }
    // M: { cell(r,c), ships[], blips[], aim, dim, pending[], marks }
    draw(now, dt, M) {
      const g = this.g, w = this.size, cs = this.cs, N = this.N, t = now / 1000, S = cs * N, m = this.m;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.clearRect(0, 0, w, w);
      g.drawImage(this.frameCv, 0, 0, w, w);
      ocean(g, m, m, S, S, t, cs, this.tone);
      g.drawImage(this.gridCv, 0, 0, w, w);
      g.save(); g.beginPath(); g.rect(m, m, S, S); g.clip();

      // ô trượt: cọc trắng + gợn sóng
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const st = M.cell(r, c);
        if (st !== 'miss') continue;
        const { x, y } = this.center(r, c), ph = (t * .7 + hash(r, c)) % 1;
        g.strokeStyle = `rgba(210,240,255,${.32 * (1 - ph)})`; g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(x, y, cs * (.16 + ph * .3), cs * (.16 + ph * .3), 0, 0, TAU); g.stroke();
        g.fillStyle = 'rgba(0,10,25,.35)'; g.beginPath(); g.ellipse(x + cs * .04, y + cs * .06, cs * .12, cs * .09, 0, 0, TAU); g.fill();
        const pg = g.createRadialGradient(x - cs * .04, y - cs * .05, cs * .01, x, y, cs * .12);
        pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#9ab9cf');
        g.fillStyle = pg; g.beginPath(); g.arc(x, y, cs * .105, 0, TAU); g.fill();
      }

      // tàu
      for (const s of M.ships) {
        const ctr = shipCenter(this, s);
        if (s.hl) {
          const cells = shipCells(s);
          let r0 = 99, c0 = 99, r1 = -1, c1 = -1;
          for (const q of cells) { r0 = Math.min(r0, q.r); c0 = Math.min(c0, q.c); r1 = Math.max(r1, q.r); c1 = Math.max(c1, q.c); }
          const pad = cs * .06;
          rr(g, m + c0 * cs + pad, m + r0 * cs + pad, (c1 - c0 + 1) * cs - pad * 2, (r1 - r0 + 1) * cs - pad * 2, cs * .22);
          g.fillStyle = s.hl === 'bad' ? 'rgba(255,40,60,.22)' : 'rgba(0,229,255,.16)'; g.fill();
          g.lineWidth = 2; g.strokeStyle = s.hl === 'bad' ? 'rgba(255,70,90,.9)' : 'rgba(0,229,255,.85)'; g.stroke();
        }
        let alpha = s.ghost ? .78 : 1, tilt = 0;
        if (s.sunk) {
          const k = s.sunkAt ? Math.min(1, (now - s.sunkAt) / 1600) : 1;
          tilt = (hash(s.r, s.c) - .5) * .12 * k;
          alpha = 1 - .22 * k;
          if (k < 1) drawShip(g, s.size, s.dir, ctr.x, ctr.y, cs, { look: s.look, t, alpha: 1 - k, foam: false });
        }
        if (s.drag) { g.save(); g.globalAlpha = .9; }
        drawShip(g, s.size, s.dir, ctr.x + (s.dx || 0), ctr.y + (s.dy || 0), cs, { look: s.look, sunk: s.sunk, t, alpha, tilt, foam: !s.ghost });
        if (s.drag) g.restore();
        if (s.ghost) {
          const cells = shipCells(s);
          g.strokeStyle = 'rgba(255,90,80,.55)'; g.setLineDash([4, 4]); g.lineWidth = 1.5;
          for (const q of cells) { const p = this.center(q.r, q.c); g.strokeRect(p.x - cs * .44, p.y - cs * .44, cs * .88, cs * .88); }
          g.setLineDash([]);
        }
      }

      // trúng / khiên / ô bí mật
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const st = M.cell(r, c);
        if (!st || st === 'miss' || st === 'detected') continue;
        const { x, y } = this.center(r, c);
        if (st === 'hit' || st === 'ownhit') {
          if (st === 'hit') {
            const sg = g.createRadialGradient(x, y, 0, x, y, cs * .5);
            sg.addColorStop(0, 'rgba(14,8,4,.9)'); sg.addColorStop(.6, 'rgba(30,16,6,.55)'); sg.addColorStop(1, 'rgba(30,16,6,0)');
            g.fillStyle = sg; g.fillRect(x - cs / 2, y - cs / 2, cs, cs);
            g.fillStyle = '#3b3f44';
            for (let i = 0; i < 4; i++) {
              const a = hash(r * 5 + i, c) * TAU, d = cs * (.14 + hash(c, r + i) * .2), q = cs * (.05 + hash(i, r + c) * .05);
              g.save(); g.translate(x + Math.cos(a) * d, y + Math.sin(a) * d); g.rotate(a * 3);
              g.fillRect(-q, -q * .5, q * 2, q); g.restore();
            }
          } else {
            const sg = g.createRadialGradient(x, y, 0, x, y, cs * .4);
            sg.addColorStop(0, 'rgba(10,6,4,.85)'); sg.addColorStop(1, 'rgba(10,6,4,0)');
            g.fillStyle = sg; g.fillRect(x - cs / 2, y - cs / 2, cs, cs);
          }
          const fl = .55 + .25 * Math.sin(t * 13 + r * 3 + c);
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = fl;
          g.drawImage(SPR.fire, x - cs * .48, y - cs * .48, cs * .96, cs * .96);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          const pg = g.createRadialGradient(x - cs * .03, y - cs * .04, cs * .01, x, y, cs * .1);
          pg.addColorStop(0, '#ffb3a6'); pg.addColorStop(1, '#c81e2b');
          g.fillStyle = pg; g.beginPath(); g.arc(x, y, cs * .09, 0, TAU); g.fill();
          this.fireAt(x, y, 1, dt, r * 16 + c, 1);
        } else if (st === 'shield') {
          const p = .5 + .5 * Math.sin(t * 4 + r + c);
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = .35 + p * .25;
          g.drawImage(SPR.cyan, x - cs * .55, y - cs * .55, cs * 1.1, cs * 1.1);
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          g.strokeStyle = `rgba(120,240,255,${.7 + p * .3})`; g.lineWidth = 1.6;
          g.beginPath();
          for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6; const px = x + Math.cos(a) * cs * .36, py = y + Math.sin(a) * cs * .36; i ? g.lineTo(px, py) : g.moveTo(px, py); }
          g.closePath(); g.stroke();
          g.strokeStyle = 'rgba(220,255,255,.9)'; g.lineWidth = 1.2;
          g.beginPath(); g.moveTo(x - cs * .2, y - cs * .2); g.lineTo(x - cs * .02, y - cs * .04); g.lineTo(x - cs * .1, y + cs * .08); g.lineTo(x + cs * .14, y + cs * .22); g.stroke();
        } else if (st === 'secret' || st === 'secretUnfound') {
          const bob = Math.sin(t * 2 + c) * cs * .03;
          g.globalAlpha = st === 'secret' ? 1 : .55;
          if (st === 'secret') {
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = .45 + .2 * Math.sin(t * 5);
            g.drawImage(SPR.gold, x - cs * .6, y - cs * .6, cs * 1.2, cs * 1.2);
            g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
          }
          g.save(); g.translate(x, y + bob); g.rotate(.18);
          const q = cs * .26;
          g.fillStyle = 'rgba(0,10,20,.35)'; g.fillRect(-q + cs * .05, -q + cs * .08, q * 2, q * 2);
          const wg = g.createLinearGradient(-q, -q, q, q); wg.addColorStop(0, '#d39a52'); wg.addColorStop(1, '#8a5524');
          g.fillStyle = wg; g.fillRect(-q, -q, q * 2, q * 2);
          g.strokeStyle = '#5a3412'; g.lineWidth = Math.max(1, cs * .04); g.strokeRect(-q, -q, q * 2, q * 2);
          g.beginPath(); g.moveTo(-q, -q); g.lineTo(q, q); g.moveTo(q, -q); g.lineTo(-q, q); g.stroke();
          g.fillStyle = '#ffd23f'; g.beginPath();
          for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? q * .3 : q * .7; const px = Math.cos(a) * rr2, py = Math.sin(a) * rr2; i ? g.lineTo(px, py) : g.moveTo(px, py); }
          g.closePath(); g.fill(); g.strokeStyle = '#7a4c00'; g.lineWidth = 1; g.stroke();
          g.restore(); g.globalAlpha = 1;
        } else if (st === 'sunk') {
          const s = M.shipAt && M.shipAt(r, c);
          const age = s && s.sunkAt ? now - s.sunkAt : 1e9;
          const { x: fx, y: fy } = this.center(r, c);
          if (age < 7000) this.fireAt(fx, fy, 1, dt, r * 16 + c, 1);
          else if ((r + c) % 2 === 0) this.fireAt(fx, fy, .7, dt, r * 16 + c, .3);
          else this.emit(r * 16 + c + 's2', .5, dt, () => this.parts.add({ x: fx, y: fy, wind: [cs * .35, -cs * .45], drag: .6, spr: 'smoke', s: cs * .12, s1: cs * .5, life: 2, a: .32, fi: .2, fo: .3 }));
        }
      }

      // hạt
      this.parts.update(dt);
      this.parts.draw(g);

      // đạn đang chờ kết quả (online)
      if (M.pending) for (const p of M.pending) {
        const { x, y } = this.center(p.r, p.c), a = .5 + .5 * Math.sin(t * 10);
        g.strokeStyle = `rgba(255,230,140,${.5 + a * .5})`; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, cs * (.25 + a * .08), 0, TAU); g.stroke();
      }

      // radar phát hiện
      if (M.blips) for (const b of M.blips) {
        if (b.dur && b.start === null) b.start = now, b.until = now + b.dur;   // tính từ khung hình đầu tiên được vẽ, máy yếu cũng thấy đủ thời gian
        const k = (now - b.start) / (b.until - b.start);
        if (k < 0 || k > 1) continue;
        const { x, y } = this.center(b.r, b.c);
        const a = k > .8 ? (1 - k) / .2 : 1, pop = Math.min(1, k * 10), pulse = .75 + .25 * Math.sin(k * 30);
        g.globalAlpha = a;
        g.globalCompositeOperation = 'lighter';
        g.drawImage(SPR.red, x - cs * 1.1, y - cs * 1.1, cs * 2.2, cs * 2.2);
        g.drawImage(SPR.yellow, x - cs * .6 * pulse, y - cs * .6 * pulse, cs * 1.2 * pulse, cs * 1.2 * pulse);
        g.globalCompositeOperation = 'source-over';
        g.strokeStyle = '#ffe14d'; g.lineWidth = 2.5;
        g.beginPath(); g.arc(x, y, cs * (.25 + k * .45), 0, TAU); g.stroke();
        g.font = `700 ${cs * .95 * (.5 + pop * .5)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = 'rgba(70,0,0,.95)'; g.strokeText('!', x, y + 1);
        g.fillStyle = '#ffe14d'; g.fillText('!', x, y + 1);
        g.globalAlpha = 1;
      }

      // ngắm
      if (M.aim) {
        const { r, c, weapon } = M.aim, col = WCOL[weapon] || WCOL.stone, { x, y } = this.center(r, c);
        g.strokeStyle = col; g.fillStyle = col;
        if (weapon === 'bomb') {
          g.globalAlpha = .14; g.fillRect(x - cs * 1.5, y - cs * 1.5, cs * 3, cs * 3); g.globalAlpha = 1;
          g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeRect(x - cs * 1.5 + 1, y - cs * 1.5 + 1, cs * 3 - 2, cs * 3 - 2); g.setLineDash([]);
        } else if (weapon === 'torpedo' || weapon === 'missile') {
          const hz = weapon === 'torpedo';
          g.globalAlpha = .55; g.lineWidth = 2;
          for (const s of [-1, 1]) {
            const ax = x + (hz ? s * cs : 0), ay = y + (hz ? 0 : s * cs);
            g.beginPath();
            if (hz) { g.moveTo(ax - s * cs * .18, ay - cs * .16); g.lineTo(ax + s * cs * .08, ay); g.lineTo(ax - s * cs * .18, ay + cs * .16); }
            else { g.moveTo(ax - cs * .16, ay - s * cs * .18); g.lineTo(ax, ay + s * cs * .08); g.lineTo(ax + cs * .16, ay - s * cs * .18); }
            g.stroke();
          }
          g.globalAlpha = 1;
        }
        g.globalAlpha = .18; g.fillRect(x - cs / 2, y - cs / 2, cs, cs); g.globalAlpha = 1;
        g.lineWidth = 2;
        const q = cs * .5, L = cs * .2;
        g.beginPath();
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.moveTo(x + sx * q, y + sy * (q - L)); g.lineTo(x + sx * q, y + sy * q); g.lineTo(x + sx * (q - L), y + sy * q); }
        g.stroke();
        g.save(); g.translate(x, y); g.rotate(t * 1.5); g.setLineDash([cs * .12, cs * .1]); g.lineWidth = 1.2;
        g.beginPath(); g.arc(0, 0, cs * .3, 0, TAU); g.stroke(); g.restore(); g.setLineDash([]);
        g.beginPath(); g.arc(x, y, 1.8, 0, TAU); g.fill();
      }
      g.restore();
      g.drawImage(this.vignCv, 0, 0, w, w);
      if (M.dim) { g.fillStyle = 'rgba(2,10,20,.32)'; g.fillRect(m, m, S, S); }
    }
  }

  /* ---------- Hiệu ứng toàn màn hình (đạn bay, nổ, cột nước) ---------- */
  class FX {
    constructor(cv) {
      this.cv = cv; this.g = cv.getContext('2d'); this.parts = new Particles(1200);
      this.projs = []; this.shake = 0; this.flash = 0;
      this.resize(); addEventListener('resize', () => this.resize());
    }
    resize() {
      const d = dprOf(); this.d = d; this.w = this.cv.clientWidth || innerWidth; this.h = this.cv.clientHeight || innerHeight;
      this.cv.width = Math.round(this.w * d); this.cv.height = Math.round(this.h * d);
    }
    get busy() { return this.projs.length > 0; }
    launch(o) {
      const dx = o.to.x - o.from.x, dy = o.to.y - o.from.y, dist = Math.hypot(dx, dy);
      const dur = o.dur || ({ stone: 520 + dist * .32, missile: 620 + dist * .38, torpedo: 260 + dist * 1.05, bomb: 820 }[o.kind] || 600);
      const p = Object.assign({}, o, { t: 0, dur: dur / 1000, h: o.kind === 'missile' ? Math.min(300, dist * .55 + 70) : o.kind === 'stone' ? Math.min(220, dist * .45 + 50) : 0, px: o.from.x, py: o.from.y });
      this.projs.push(p);
      if (o.kind === 'bomb') SFX.whistle(); else if (o.kind === 'torpedo') SFX.torpedo(); else SFX.launch(o.kind === 'missile');
      if (o.kind !== 'bomb' && o.kind !== 'torpedo' && o.muzzle !== false) {
        const P = this.parts, cs = o.cs;
        P.add({ x: o.from.x, y: o.from.y, spr: 'glow', s: cs * .6, s1: cs * 1.1, life: .2, add: true, fo: 0 });
        for (let i = 0; i < 6; i++) P.add({ x: o.from.x, y: o.from.y, vx: rnd(-40, 40), vy: rnd(-70, -20), drag: 2, spr: 'smoke', s: cs * .2, s1: cs * .7, life: rnd(.6, 1), a: .5 });
      }
      return p;
    }
    stepProj(p, dt) {
      p.t += dt;
      const k = Math.min(1, p.t / p.dur), cs = p.cs, P = this.parts;
      let x, y, z;
      if (p.kind === 'bomb') { x = p.to.x; y = p.to.y; z = Math.pow(1 - k, 1.7) * 420; }
      else if (p.kind === 'torpedo') { const e = k; x = p.from.x + (p.to.x - p.from.x) * e; y = p.from.y + (p.to.y - p.from.y) * e; z = 0; }
      else {
        const e = p.kind === 'missile' ? k * k * .45 + k * .55 : k;
        x = p.from.x + (p.to.x - p.from.x) * e; y = p.from.y + (p.to.y - p.from.y) * e; z = 4 * p.h * e * (1 - e);
      }
      const vx = (x - p.px) / Math.max(dt, 1e-3), vy = ((y - z) - (p.py - (p.pz || 0))) / Math.max(dt, 1e-3);
      p.vx = vx; p.vy = vy;
      p.px = x; p.py = y; p.pz = z; p.k = k;
      // vệt
      if (p.kind === 'missile') {
        P.add({ x, y: y - z, vx: rnd(-10, 10), vy: rnd(-10, 10), drag: 1, spr: 'smoke', s: cs * .1, s1: cs * .45, life: rnd(.5, .8), a: .55 });
        P.add({ x, y: y - z, spr: 'fire', s: cs * .2, s1: cs * .03, life: .14, add: true });
      } else if (p.kind === 'stone') {
        if (Math.random() < .6) P.add({ x, y: y - z, spr: 'steam', s: cs * .07, s1: cs * .2, life: .35, a: .35 });
      } else if (p.kind === 'torpedo') {
        P.add({ x, y, vx: rnd(-8, 8), vy: rnd(-8, 8), drag: 2, spr: 'steam', s: cs * .08, s1: cs * .28, life: rnd(.6, 1), a: .55 });
        if (Math.random() < .5) P.add({ x: x + rnd(-3, 3), y: y + rnd(-3, 3), kind: 'drop', s: 1.2, life: .5, a: .7 });
      }
      return k >= 1;
    }
    drawProj(g, p) {
      const cs = p.cs, x = p.px, y = p.py, z = p.pz || 0;
      if (p.kind !== 'torpedo') {
        const sh = p.kind === 'bomb' ? (1 - z / 420) : Math.max(.2, 1 - z / 300);
        g.fillStyle = `rgba(0,10,20,${.35 * sh})`;
        g.beginPath(); g.ellipse(x, y, cs * .22 * (.5 + sh * .5), cs * .13 * (.5 + sh * .5), 0, 0, TAU); g.fill();
      }
      if (p.kind === 'stone') {
        const r = cs * .13 * (1 + z / 260);
        const bg = g.createRadialGradient(x - r * .35, y - z - r * .35, r * .1, x, y - z, r);
        bg.addColorStop(0, '#d5dde3'); bg.addColorStop(.5, '#6f7a83'); bg.addColorStop(1, '#262c31');
        g.fillStyle = bg; g.beginPath(); g.arc(x, y - z, r, 0, TAU); g.fill();
      } else if (p.kind === 'missile') {
        const a = Math.atan2(p.vy || -1, p.vx || 0), sc = 1 + z / 380, L = cs * .55 * sc, W = cs * .12 * sc;
        g.save(); g.translate(x, y - z); g.rotate(a);
        g.globalCompositeOperation = 'lighter';
        g.drawImage(SPR.fire, -L * .9, -W * 1.4, W * 2.8, W * 2.8);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = '#5b6670'; g.beginPath(); g.moveTo(-L * .45, -W * 1.1); g.lineTo(-L * .25, 0); g.lineTo(-L * .45, W * 1.1); g.closePath(); g.fill();
        const mg = g.createLinearGradient(0, -W / 2, 0, W / 2); mg.addColorStop(0, '#f2f5f7'); mg.addColorStop(1, '#8c98a2');
        g.fillStyle = mg; rr(g, -L * .45, -W / 2, L * .8, W, W / 2); g.fill();
        g.fillStyle = '#e8b400'; g.beginPath(); g.moveTo(L * .35, -W / 2); g.quadraticCurveTo(L * .58, 0, L * .35, W / 2); g.closePath(); g.fill();
        g.restore();
      } else if (p.kind === 'torpedo') {
        const a = Math.atan2(p.to.y - p.from.y, p.to.x - p.from.x), L = cs * .55, W = cs * .12;
        g.save(); g.translate(x, y); g.rotate(a);
        g.strokeStyle = 'rgba(235,248,255,.6)'; g.lineWidth = 1.5;
        for (const s of [-1, 1]) { g.beginPath(); g.moveTo(L * .4, 0); g.lineTo(-L * 1.4, s * W * 3.2); g.stroke(); }
        g.fillStyle = 'rgba(5,20,35,.55)'; rr(g, -L / 2, -W / 2, L, W, W / 2); g.fill();
        g.fillStyle = 'rgba(0,229,255,.8)'; g.beginPath(); g.arc(L / 2 - W * .3, 0, W * .35, 0, TAU); g.fill();
        g.restore();
      } else if (p.kind === 'bomb') {
        const sc = 1 + z / 150, r = cs * .16 * sc, a = Math.min(1, p.k * 4);
        g.save(); g.globalAlpha = a; g.translate(x + z * .05, y - z * .12); g.rotate(.5);
        g.fillStyle = '#2b2f34';
        g.beginPath(); g.moveTo(-r * 1.6, -r * .8); g.lineTo(-r * 1.1, 0); g.lineTo(-r * 1.6, r * .8); g.closePath(); g.fill();
        const bg = g.createRadialGradient(-r * .3, -r * .4, r * .1, 0, 0, r * 1.2);
        bg.addColorStop(0, '#8a939b'); bg.addColorStop(1, '#1d2125');
        g.fillStyle = bg; g.beginPath(); g.ellipse(0, 0, r * 1.25, r * .82, 0, 0, TAU); g.fill();
        g.fillStyle = '#ff3b4a'; g.fillRect(r * .3, -r * .82, r * .18, r * 1.64);
        g.restore();
      }
    }
    splash(x, y, cs, big, quiet) {
      const P = this.parts, k = big ? 1.4 : 1;
      P.add({ x, y, spr: 'steam', s: cs * .3, s1: cs * 1.1 * k, life: 1.1, a: .7, fo: .2 });
      for (let i = 0; i < 3; i++) P.add({ x, y, kind: 'ring', col: 'rgba(225,245,255,.8)', s: cs * .15, s1: cs * (1 + i * .35) * k, lw: 2.5, life: .9, delay: i * .12, flat: .92 });
      for (let i = 0; i < 38 * k; i++) {
        const a = rnd(0, TAU), sp = rnd(.1, 1) * cs * 1.8;
        P.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .8, vz: rnd(120, 360) * cs / 40 * k, grav: 900 * cs / 40, kind: 'drop', s: rnd(1, 2.4), life: 1.4, a: .95, fo: .8 });
      }
      for (let i = 0; i < 6; i++) P.add({ x: x + rnd(-.1, .1) * cs, y, vz: rnd(40, 90) * cs / 40, drag: 1, spr: 'steam', s: cs * .2, s1: cs * .55, life: rnd(.6, .9), a: .55 });
      if (!quiet) SFX.splash();
    }
    explode(x, y, cs, big, quiet) {
      const P = this.parts, k = big ? 1.6 : 1;
      P.add({ x, y, spr: 'glow', s: cs * 1.1 * k, s1: cs * 2.8 * k, life: .32, add: true, fo: 0 });
      P.add({ x, y, spr: 'steam', s: cs * .4, s1: cs * 1.4 * k, life: .9, a: .45, fo: .2 });
      for (let i = 0; i < 16 * k; i++) {
        const a = rnd(0, TAU), sp = rnd(.1, .8) * cs * 1.6;
        P.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .8, vz: rnd(150, 380) * cs / 40, grav: 900 * cs / 40, kind: 'drop', s: rnd(1, 2.2), life: 1.2, a: .85, fo: .8 });
      }
      P.add({ x, y, kind: 'ring', col: 'rgba(255,225,170,.95)', s: cs * .2, s1: cs * 1.7 * k, lw: 4, life: .42 });
      P.add({ x, y, kind: 'ring', col: 'rgba(225,245,255,.6)', s: cs * .3, s1: cs * 1.3 * k, lw: 2, life: .9, delay: .05, flat: .9 });
      for (let i = 0; i < 26 * k; i++) {
        const a = rnd(0, TAU), sp = rnd(.4, 1.7) * cs * 1.7;
        P.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 4.2, spr: 'fire', s: cs * rnd(.4, .7) * k, s1: cs * rnd(.1, .25), life: rnd(.4, .8), add: true, fo: .4 });
      }
      for (let i = 0; i < 18 * k; i++) {
        const a = rnd(0, TAU), sp = rnd(.5, 1.5) * cs * 3;
        P.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(80, 260), grav: 600, kind: 'spark', s: rnd(1, 2), col: '#ffd27a', life: rnd(.4, .8), add: true });
      }
      for (let i = 0; i < 8 * k; i++) {
        const a = rnd(0, TAU), sp = rnd(.3, 1) * cs * 2.2;
        P.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(120, 300), grav: 700, kind: 'chunk', col: i % 2 ? '#2d3238' : '#4a4f55', s: rnd(1.4, 3) * cs / 40, rot: rnd(0, 6), vr: rnd(-12, 12), life: 1.2, fo: .8 });
      }
      for (let i = 0; i < 14 * k; i++) {
        const a = rnd(0, TAU), sp = rnd(.1, .7) * cs;
        P.add({ x: x + Math.cos(a) * cs * .2, y: y + Math.sin(a) * cs * .2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - cs * .3, drag: 1.2, spr: 'smoke', s: cs * .3, s1: cs * rnd(1.1, 1.7) * k, life: rnd(1.3, 2.2), a: .75, fi: .12, delay: .08 });
      }
      this.shake = Math.max(this.shake, big ? 14 : 7);
      this.flash = Math.max(this.flash, big ? .28 : .14);
      if (!quiet) SFX.boom(big);
    }
    shieldHit(x, y, cs) {
      const P = this.parts;
      P.add({ x, y, spr: 'cyan', s: cs * .5, s1: cs * 1.6, life: .45, add: true, fo: .1 });
      P.add({ x, y, kind: 'ring', col: 'rgba(120,240,255,.95)', s: cs * .2, s1: cs * 1.2, lw: 3, life: .5 });
      for (let i = 0; i < 22; i++) {
        const a = rnd(0, TAU), sp = rnd(.6, 1.6) * cs * 2.5;
        P.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 3, kind: 'spark', s: rnd(1, 2), col: '#9ff6ff', life: rnd(.3, .6), add: true });
      }
      this.shake = Math.max(this.shake, 4);
      SFX.shield();
    }
    goldBurst(x, y, cs) {
      const P = this.parts;
      P.add({ x, y, spr: 'gold', s: cs * .6, s1: cs * 2.2, life: .6, add: true, fo: .2 });
      for (let i = 0; i < 30; i++) {
        const a = rnd(0, TAU), sp = rnd(.5, 1.6) * cs * 2.2;
        P.add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd(60, 200), grav: 300, drag: 1.5, kind: 'spark', s: rnd(1.4, 2.6), col: '#ffe27a', life: rnd(.6, 1.1), add: true });
      }
      SFX.gold();
    }
    sonar(x, y, cs, horizontal, col) {
      const P = this.parts;
      const angs = horizontal ? [0, Math.PI] : [Math.PI / 2, -Math.PI / 2];
      for (const ang of angs) for (let i = 0; i < 3; i++) P.add({ x, y, kind: 'arc', ang, col, s: cs * .3, s1: cs * 1.6, lw: 3 - i * .7, life: .6, delay: i * .11, fo: .25 });
      SFX.ping();
    }
    text(x, y, txt, col, size) {
      const hw = txt.length * size * .36 + 6;
      x = Math.max(hw, Math.min(this.w - hw, x));
      this.parts.add({ x, y, vy: -28, kind: 'text', txt, col, s: size, life: 1.1, fo: .6 });
    }
    frame(dt) {
      const g = this.g;
      if (this.cv.clientWidth !== this.w || this.cv.clientHeight !== this.h) this.resize();   // thanh địa chỉ trình duyệt co giãn
      g.setTransform(this.d, 0, 0, this.d, 0, 0);
      g.clearRect(0, 0, this.w, this.h);
      const done = [];
      for (const p of this.projs) if (this.stepProj(p, dt)) done.push(p);
      this.parts.update(dt);
      this.parts.draw(g);
      for (const p of this.projs) if (!done.includes(p)) this.drawProj(g, p);
      if (this.flash > .005) {
        g.fillStyle = `rgba(255,214,150,${this.flash})`; g.fillRect(0, 0, this.w, this.h);
        this.flash *= Math.exp(-dt * 9);
      }
      this.shake *= Math.exp(-dt * 8);
      if (this.shake < .3) this.shake = 0;
      for (const p of done) {
        this.projs.splice(this.projs.indexOf(p), 1);
        try { p.onImpact && p.onImpact(p); } catch (e) { console.error(e); }
      }
    }
  }

  /* ---------- Cảnh nền menu: tàu chiến rẽ sóng ---------- */
  class Hero {
    constructor(cv) {
      this.cv = cv; this.g = cv.getContext('2d'); this.parts = new Particles(500);
      this.t = 0; this.fireT = 2.2; this.ships = null;
    }
    resize() {
      const b = this.cv.getBoundingClientRect(), d = dprOf();
      if (!b.width) return false;
      if (b.width !== this.w || b.height !== this.h || d !== this.d) {
        this.w = b.width; this.h = b.height; this.d = d;
        this.cv.width = Math.round(b.width * d); this.cv.height = Math.round(b.height * d);
        this.parts.clear(); this.ships = null;
      }
      return true;
    }
    frame(dt) {
      if (!this.resize()) return;
      const g = this.g, w = this.w, h = this.h; this.t += dt;
      const cs = Math.min(h * .085, w * .14, 80);
      if (!this.ships) this.ships = [
        { size: 5, look: 'own', x: w * .45, y: h * .47, v: cs * .5 },
        { size: 3, look: 'own', x: w * .05, y: h * .33, v: cs * .7 },
        { size: 4, look: 'enemy', x: w * .8, y: h * .6, v: -cs * .42 }
      ];
      g.setTransform(this.d, 0, 0, this.d, 0, 0);
      ocean(g, 0, 0, w, h, this.t, cs * .9);
      const P = this.parts;
      for (const s of this.ships) {
        s.x += s.v * dt;
        const L = shipDims(s.size, cs).L;
        if (s.v > 0 && s.x - L > w + cs) s.x = -L - cs * 2;
        if (s.v < 0 && s.x + L < -cs) s.x = w + L + cs * 2;
        const dir = s.v > 0 ? 1 : -1, stern = s.x - dir * L / 2;
        if (Math.random() < .8) {
          P.add({ x: stern, y: s.y + rnd(-.2, .2) * cs, vx: -dir * rnd(4, 12), vy: rnd(-6, 6), drag: .4, spr: 'steam', s: cs * .14, s1: cs * .5, life: rnd(2, 3), a: .45, fo: .3 });
          for (const sd of [-1, 1]) P.add({ x: s.x + dir * L * .45, y: s.y + sd * cs * .3, vx: -dir * 2, vy: sd * cs * .25, drag: .3, kind: 'drop', s: 1.4, life: 2.4, a: .6 });
        }
      }
      this.parts.update(dt);
      this.parts.draw(g);
      for (const s of this.ships) drawShip(g, s.size, s.v > 0 ? 0 : 2, s.x, s.y, cs, { look: s.look, t: this.t });
      // pháo hạm bắn
      this.fireT -= dt;
      if (this.fireT <= 0) {
        this.fireT = rnd(2.4, 4);
        const s = this.ships[0], L = shipDims(5, cs).L, x = s.x + L * .2, y = s.y;
        P.add({ x: x + cs * .5, y, spr: 'glow', s: cs * .4, s1: cs * .9, life: .22, add: true, fo: 0 });
        for (let i = 0; i < 7; i++) P.add({ x: x + cs * .5, y, vx: rnd(10, 60), vy: rnd(-30, 10), drag: 1.5, spr: 'smoke', s: cs * .15, s1: cs * .6, life: rnd(1, 1.6), a: .5 });
        const tx = rnd(w * .55, w * .95), ty = rnd(h * .15, h * .5);
        setTimeout(() => {
          P.add({ x: tx, y: ty, spr: 'steam', s: cs * .2, s1: cs * .8, life: 1, a: .6 });
          for (let i = 0; i < 24; i++) { const a = rnd(0, TAU), sp = rnd(.1, 1) * cs; P.add({ x: tx, y: ty, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .7, vz: rnd(60, 160), grav: 300, kind: 'drop', s: rnd(1, 2), life: 1.2 }); }
          P.add({ x: tx, y: ty, kind: 'ring', col: 'rgba(225,245,255,.7)', s: cs * .1, s1: cs * .9, lw: 2, life: .9 });
        }, 700);
      }
      const vg = g.createLinearGradient(0, 0, 0, h);
      vg.addColorStop(0, 'rgba(2,8,16,.15)'); vg.addColorStop(.7, 'rgba(2,8,16,0)'); vg.addColorStop(1, 'rgba(2,8,16,.75)');
      g.fillStyle = vg; g.fillRect(0, 0, w, h);
    }
  }

  // Hình tàu nhỏ cho bảng hạm đội
  function fleetIcon(cv, size, look, dead, cs) {
    const { L, W } = shipDims(size, cs), d = dprOf();
    const w = L + cs * .5, h = W + cs * .5;
    cv.width = Math.ceil(w * d); cv.height = Math.ceil(h * d);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const g = cv.getContext('2d'); g.scale(d, d);
    drawShip(g, size, 0, w / 2, h / 2, cs, { look, sunk: dead, foam: false, alpha: dead ? .7 : 1 });
    if (dead) {
      g.strokeStyle = '#ff3b4a'; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(w * .15, h * .5); g.lineTo(w * .85, h * .5); g.stroke();
    }
  }

  /* ---------- Âm thanh tổng hợp (WebAudio, không cần tệp) ---------- */
  const SFX = (() => {
    let ac = null, master = null, noiseBuf = null, muted = false;
    try { muted = localStorage.getItem('haichien_mute') === '1'; } catch (e) {}
    function ctx() {
      if (muted) return null;
      if (!ac) {
        const A = window.AudioContext || window.webkitAudioContext;
        if (!A) return null;
        ac = new A(); master = ac.createGain(); master.gain.value = .7; master.connect(ac.destination);
      }
      if (ac.state === 'suspended') ac.resume();
      return ac;
    }
    function noise(a) {
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    }
    function burst(dur, f0, f1, vol, type, delay) {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + (delay || 0);
      const src = a.createBufferSource(); src.buffer = noise(a);
      const f = a.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
      const gn = a.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(.001, t + dur);
      src.connect(f); f.connect(gn); gn.connect(master); src.start(t, Math.random()); src.stop(t + dur + .05);
    }
    function tone(f0, f1, dur, vol, type, delay) {
      const a = ctx(); if (!a) return;
      const t = a.currentTime + (delay || 0);
      const o = a.createOscillator(); o.type = type || 'sine';
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      const gn = a.createGain(); gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(vol, t + .015); gn.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(gn); gn.connect(master); o.start(t); o.stop(t + dur + .05);
    }
    return {
      get muted() { return muted; },
      setMuted(v) { muted = !!v; try { localStorage.setItem('haichien_mute', muted ? '1' : '0'); } catch (e) {} if (muted && ac) ac.suspend(); },
      unlock() { ctx(); },
      launch(m) { burst(.3, 1400, 180, .35); tone(140, 45, .25, .35); if (m) burst(.7, 3000, 900, .08, 'bandpass', .05); },
      torpedo() { burst(.6, 500, 200, .18, 'lowpass'); tone(90, 70, .5, .1, 'triangle'); },
      whistle() { tone(2200, 520, .8, .05, 'sine'); },
      boom(big) { burst(big ? 1.6 : 1, 1600, 50, big ? .95 : .7); tone(90, 28, big ? .9 : .55, .6); if (big) burst(1.2, 600, 60, .5, 'lowpass', .18); },
      splash() { burst(.6, 4000, 500, .22, 'bandpass'); burst(.35, 900, 200, .12); },
      ping() { tone(1500, 1480, .45, .09); tone(1500, 1480, .35, .035, 'sine', .28); },
      shield() { tone(500, 1900, .22, .1, 'sawtooth'); tone(2400, 900, .3, .05, 'square', .05); },
      gold() { [880, 1108, 1318, 1760].forEach((f, i) => tone(f, f, .25, .09, 'triangle', i * .07)); },
      click() { tone(900, 700, .05, .05, 'square'); },
      turn() { tone(660, 660, .12, .07, 'triangle'); tone(990, 990, .18, .07, 'triangle', .1); },
      win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .35, .1, 'triangle', i * .12)); },
      lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, f * .98, .4, .09, 'triangle', i * .16)); }
    };
  })();

  window.HCArt = { shake: { x: 0, y: 0 }, BoardView, FX, Hero, SFX, shipCells, drawShip, fleetIcon, ANG, BODY, WCOL };
})();
