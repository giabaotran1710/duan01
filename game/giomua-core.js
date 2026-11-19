/* Gió mùa - lõi mô phỏng: trường gió, các vật phản ứng với gió, ước nguyện, chặng chơi.
   Toạ độ thế giới: cao H = 540, mặt đất y = GROUND. Không vẽ gì ở đây (xem giomua-art.js). */
(function () {
  'use strict';
  const H = 540, GROUND = 432, CELL = 20, SKY_TOP = 58, SKY_BOT = 250;
  const MAXV = 440, KITE_UP = 120;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hyp = Math.hypot;

  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  // ================= TRƯỜNG GIÓ =================
  function Field(len) {
    this.nx = Math.ceil(len / CELL) + 3; this.ny = Math.ceil(H / CELL) + 2;
    const n = this.nx * this.ny;
    this.vx = new Float32Array(n); this.vy = new Float32Array(n);
    this.tx = new Float32Array(n); this.ty = new Float32Array(n);
    this.bx = 0; this.by = 0; this.relax = 0.75;
  }
  Field.prototype.setBase = function (x, y) {
    this.bx = x; this.by = y;
    this.vx.fill(x); this.vy.fill(y);
  };
  Field.prototype.sample = function (x, y, out) {
    const nx = this.nx, ny = this.ny;
    let fx = clamp(x / CELL, 0, nx - 1.001), fy = clamp(y / CELL, 0, ny - 1.001);
    const i = fx | 0, j = fy | 0; fx -= i; fy -= j;
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    const vx = this.vx, vy = this.vy;
    out = out || {};
    out.x = (vx[a] * (1 - fx) + vx[b] * fx) * (1 - fy) + (vx[c] * (1 - fx) + vx[d] * fx) * fy;
    out.y = (vy[a] * (1 - fx) + vy[b] * fx) * (1 - fy) + (vy[c] * (1 - fx) + vy[d] * fx) * fy;
    return out;
  };
  /* bước mô phỏng: đối lưu bán Lagrange chỉ trong cửa sổ [x0, x1] quanh camera, rồi lắng về gió nền */
  Field.prototype.step = function (dt, x0, x1) {
    const nx = this.nx, ny = this.ny, vx = this.vx, vy = this.vy, tx = this.tx, ty = this.ty;
    const i0 = clamp(Math.floor(x0 / CELL), 1, nx - 2), i1 = clamp(Math.ceil(x1 / CELL), 1, nx - 2);
    const k = 1 - Math.exp(-this.relax * dt), bx = this.bx, by = this.by;
    const s = {};
    for (let j = 1; j < ny - 1; j++) {
      for (let i = i0; i <= i1; i++) {
        const id = j * nx + i;
        const px = i * CELL - vx[id] * dt * 0.9, py = j * CELL - vy[id] * dt * 0.9;
        this.sample(px, py, s);
        // khuếch tán nhẹ với 4 ô xung quanh
        const ax = (vx[id - 1] + vx[id + 1] + vx[id - nx] + vx[id + nx]) * 0.25;
        const ay = (vy[id - 1] + vy[id + 1] + vy[id - nx] + vy[id + nx]) * 0.25;
        let nxv = s.x * 0.86 + ax * 0.14, nyv = s.y * 0.86 + ay * 0.14;
        nxv += (bx - nxv) * k; nyv += (by - nyv) * k;
        tx[id] = nxv; ty[id] = nyv;
      }
    }
    for (let j = 1; j < ny - 1; j++) {
      for (let i = i0; i <= i1; i++) { const id = j * nx + i; vx[id] = tx[id]; vy[id] = ty[id]; }
    }
    // biên: sát mặt đất gió ngang yếu đi, không thổi xuống đất
    const jg = Math.floor(GROUND / CELL) + 1;
    for (let j = jg; j < ny; j++) for (let i = i0; i <= i1; i++) { const id = j * nx + i; vx[id] *= 0.8; if (vy[id] > 0) vy[id] *= 0.3; }
  };
  /* kéo các ô gần đoạn thẳng (x0,y0)-(x1,y1) về vận tốc (tvx,tvy) */
  Field.prototype.push = function (x0, y0, x1, y1, tvx, tvy, r, amt) {
    const nx = this.nx, ny = this.ny, vx = this.vx, vy = this.vy;
    const minx = Math.min(x0, x1) - r * 1.5, maxx = Math.max(x0, x1) + r * 1.5, miny = Math.min(y0, y1) - r * 1.5, maxy = Math.max(y0, y1) + r * 1.5;
    const i0 = clamp(Math.floor(minx / CELL), 0, nx - 1), i1 = clamp(Math.ceil(maxx / CELL), 0, nx - 1);
    const j0 = clamp(Math.floor(miny / CELL), 0, ny - 1), j1 = clamp(Math.ceil(maxy / CELL), 0, ny - 1);
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1e-6;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = i * CELL, py = j * CELL;
      const t = clamp(((px - x0) * dx + (py - y0) * dy) / L2, 0, 1);
      const qx = x0 + dx * t - px, qy = y0 + dy * t - py;
      const d2 = (qx * qx + qy * qy) / (r * r);
      if (d2 > 2.25) continue;
      const f = Math.exp(-d2 * 1.6) * amt, id = j * nx + i;
      vx[id] += (tvx - vx[id]) * f; vy[id] += (tvy - vy[id]) * f;
    }
  };
  Field.prototype.swirl = function (cx, cy, r, str, dir) {
    const nx = this.nx, ny = this.ny, vx = this.vx, vy = this.vy;
    const i0 = clamp(Math.floor((cx - r) / CELL), 0, nx - 1), i1 = clamp(Math.ceil((cx + r) / CELL), 0, nx - 1);
    const j0 = clamp(Math.floor((cy - r) / CELL), 0, ny - 1), j1 = clamp(Math.ceil((cy + r) / CELL), 0, ny - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = i * CELL - cx, dy = j * CELL - cy, d = hyp(dx, dy);
      if (d > r || d < 1) continue;
      const u = d / r, f = Math.sin(Math.PI * u) * 0.35;
      const tvx = (-dy / d) * str * dir - dx / d * str * 0.55 * u, tvy = (dx / d) * str * dir - dy / d * str * 0.55 * u;
      const id = j * nx + i;
      vx[id] += (tvx - vx[id]) * f; vy[id] += (tvy - vy[id]) * f;
    }
  };
  Field.prototype.calm = function (cx, cy, r, dt) {
    const nx = this.nx, ny = this.ny, vx = this.vx, vy = this.vy;
    const i0 = clamp(Math.floor((cx - r) / CELL), 0, nx - 1), i1 = clamp(Math.ceil((cx + r) / CELL), 0, nx - 1);
    const j0 = clamp(Math.floor((cy - r) / CELL), 0, ny - 1), j1 = clamp(Math.ceil((cy + r) / CELL), 0, ny - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = hyp(i * CELL - cx, j * CELL - cy) / r;
      if (d > 1) continue;
      const k = Math.exp(-dt * 16 * (1 - d * d)), id = j * nx + i;
      vx[id] *= k; vy[id] *= k;
    }
  };

  // ================= CHẶNG =================
  /* tod: thời điểm trong ngày lúc bắt đầu / kết thúc (0 rạng sáng, .5 trưa, 1 tối) */
  const LEVELS = [
    { name: 'Mưa xuân', sub: 'Gom mây nhỏ thành mây mưa, tưới ruộng mạ', len: 2500, dur: 108, tod: [0.04, 0.32], base: [22, 0], need: 2, seed: 11,
      clouds: [[210, 120, 1], [360, 175, 1], [470, 105, 1], [640, 160, 1], [1260, 115, 1], [1390, 180, 1], [1520, 120, 1], [1640, 165, 1], [1900, 130, 1]],
      fields: [[560, 280], [1780, 300]], cloudEvery: 11,
      hints: [[0.6, 'Vuốt để thổi mây. Hai đám mây chạm nhau sẽ gộp lại'], [9, 'Gộp đủ 3 mây nhỏ thành mây mưa, đưa tới trên ruộng mạ'], [40, 'Đèn lồng trôi khỏi mép trái là lỡ ước nguyện đó']] },
    { name: 'Làng diều', sub: 'Giữ gió đều cho diều bay cao', len: 2600, dur: 112, tod: [0.3, 0.5], base: [18, 0], need: 2, seed: 23,
      clouds: [[300, 110, 1], [900, 140, 1], [1500, 100, 1], [2100, 130, 1]],
      kites: [470, 1190, 1950], cloudEvery: 0,
      hints: [[0.6, 'Vuốt đều tay từ trái sang phải quanh con diều để nâng diều lên'], [12, 'Đưa diều lên trên vạch đứt và giữ 4 giây. Vuốt quá gắt sẽ làm đứt dây']] },
    { name: 'Hạt gió', sub: 'Thổi hạt bồ công anh xuống luống đất', len: 2700, dur: 122, tod: [0.42, 0.6], base: [20, 0], need: 2, seed: 37,
      clouds: [[1030, 120, 1], [1150, 175, 1], [1260, 110, 1], [1400, 160, 1]],
      dands: [360, 1880], beds: [[600, 170], [2130, 180]], fields: [[1420, 260]], cloudEvery: 13,
      hints: [[0.6, 'Thổi vào cây bồ công anh để hạt bay lên'], [7, 'Vẽ một vòng tròn để tạo xoáy, gom hạt rồi thả xuống luống đất']] },
    { name: 'Phiên chợ', sub: 'Tưới ruộng nhưng giữ sân phơi thóc khô ráo', len: 2800, dur: 128, tod: [0.5, 0.72], base: [22, 0], need: 3, seed: 41,
      clouds: [[250, 120, 1], [380, 175, 1], [500, 110, 1], [930, 160, 1], [1040, 110, 1], [1150, 170, 1], [1950, 120, 1], [2070, 165, 1], [2190, 110, 1]],
      fields: [[600, 230], [1240, 230], [2330, 250]], mats: [[930, 190], [2020, 200]], kites: [1680], cloudEvery: 12,
      gusts: [[24, 150], [58, 190], [92, 140]],
      hints: [[0.6, 'Đừng để mưa rơi xuống sân phơi thóc'], [21, 'Gió giật sắp tới! Giữ yên ngón tay (hoặc phím Space) để tạo vùng lặng']] },
    { name: 'Chiều hội', sub: 'Cả làng chờ đón hội, hoàn thành 4 ước nguyện', len: 3100, dur: 138, tod: [0.7, 0.97], base: [20, 0], need: 4, seed: 59,
      clouds: [[230, 120, 1], [360, 170, 1], [480, 110, 1], [1900, 115, 1], [2030, 170, 1], [2150, 120, 1], [2480, 160, 1], [2600, 110, 1], [2700, 170, 1]],
      fields: [[560, 240], [2280, 240], [2860, 220]], kites: [1020, 1830], dands: [1330], beds: [[1580, 170]], mats: [[2580, 150]], cloudEvery: 12,
      gusts: [[44, 160], [96, 180]],
      hints: [[0.6, 'Chiều hội: 6 ước nguyện, cần hoàn thành 4']] },
    { name: 'Giông đầu mùa', sub: 'Chắn ba đợt gió giật, giữ mái chợ', storm: true, dur: 80, tod: [0.55, 0.62], base: [-26, 0], need: 0, seed: 71,
      hints: [[0.6, 'Giông tới! Mũi tên đỏ báo gió giật sắp lao vào mái chợ'], [4.5, 'Thổi ngược lại hoặc giữ yên ngón tay chắn trước mái. Thanh vàng trên mái là độ bền'], [24, 'Mây đen mang mưa: đẩy chúng ra xa sân phơi']] },
  ];

  // ================= TRẠNG THÁI CHẶNG =================
  function load(li, W) {
    const L = LEVELS[li];
    const storm = !!L.storm;
    const len = storm ? Math.round(W) : L.len;
    const G = {
      li, L, W, len, storm, t: 0, dur: L.dur, cam: 0, camV: storm ? 0 : (len - W) / L.dur,
      field: new Field(len), clouds: [], kites: [], fields: [], mats: [], dands: [], seeds: [], beds: [], roofs: [], jets: [],
      wishes: [], vortices: [], calms: [], events: [], hearts: 3, breath: 100, breathRest: 0, need: L.need, done: 0,
      over: false, result: null, rnd: rng(L.seed * 7919 + 3), nextCloud: L.cloudEvery || 0, uid: 1, waves: null, flash: 0, clear: 0,
      gustList: (L.gusts || []).map(g => ({ t: g[0], y: g[1], fired: false })),
    };
    G.field.setBase(L.base[0], L.base[1]);
    (L.clouds || []).forEach(c => addCloud(G, c[0], c[1], c[2]));
    (L.fields || []).forEach(f => { const o = { x: f[0], w: f[1], water: 0, done: false, flash: 0 }; G.fields.push(o); wish(G, 'field', o, f[0] + f[1] / 2); });
    (L.mats || []).forEach(m => G.mats.push({ x: m[0], w: m[1], exp: 0, covered: false, cover: 0 }));
    (L.kites || []).forEach(x => { const k = newKite(x); G.kites.push(k); wish(G, 'kite', k, x + 60); });
    (L.dands || []).forEach(x => G.dands.push({ x, seeds: 12, cool: 0, regrow: 0, sway: 0 }));
    (L.beds || []).forEach(b => { const o = { x: b[0], w: b[1], n: 0, need: 3, flowers: [] }; G.beds.push(o); wish(G, 'bed', o, b[0] + b[1] / 2); });
    if (storm) setupStorm(G);
    G.wishes.sort((a, b) => a.x - b.x);
    return G;
  }
  function addCloud(G, x, y, size, dark) {
    const c = { id: G.uid++, x, y, vx: 0, vy: 0, size, water: size >= 3 ? 7 : 0, bump: 0, dark: !!dark, fade: 0, seed: G.rnd() * 1000, rain: 0, age: 0 };
    if (dark) c.water = 7;
    G.clouds.push(c); return c;
  }
  function newKite(x) {
    return { kidX: x, ax: x + 10, ay: GROUND - 44, kx: x + 34, ky: GROUND - 14, vx: 0, vy: 0, len: 250, state: 'ground', aloft: 0, brokenT: 0, spin: 0, ang: 0, happy: 0, tail: [] };
  }
  function wish(G, type, ref, x) { G.wishes.push({ type, ref, x, prog: 0, done: false, missed: false, t: 0 }); }

  function setupStorm(G) {
    const W = G.len;
    [0.2, 0.5, 0.8].forEach(f => { const r = { x: W * f, w: 150, dmg: 0, gone: false, shake: 0 }; G.roofs.push(r); wish(G, 'roof', r, W * f); });
    G.mats.push({ x: W * 0.35 - 70, w: 140, exp: 0, covered: false, cover: 0 });
    G.mats.push({ x: W * 0.65 - 70, w: 140, exp: 0, covered: false, cover: 0 });
    // 3 đợt: [bắt đầu, kết thúc, khoảng giữa hai cơn giật, số mây đen, cơn kép?]
    G.waves = [[3, 20, 3.6, 0, false], [24, 44, 2.5, 1, false], [48, 70, 1.9, 2, true]].map(w => ({ a: w[0], b: w[1], gap: w[2], clouds: w[3], dbl: w[4], next: w[0], cl: 0 }));
    for (let i = 0; i < 3; i++) addCloud(G, W * (0.2 + i * 0.3), 90 + i * 20, 1);
  }

  // ================= NHẬP LIỆU =================
  function stroke(G, x0, y0, x1, y1, dt) {
    const d = hyp(x1 - x0, y1 - y0);
    if (d < 0.5 || G.breath <= 0) return 0;
    const sp = d / Math.max(dt, 1 / 120);
    const mag = clamp(sp * 0.55, 0, MAXV);
    const tvx = (x1 - x0) / d * mag, tvy = (y1 - y0) / d * mag;
    const cost = d * 0.036 * (0.45 + mag / MAXV);
    const f = Math.min(1, G.breath / Math.max(cost, 1e-6));
    G.field.push(x0, y0, x1, y1, tvx, tvy, 62, 0.42 * f);
    G.breath = Math.max(0, G.breath - cost); G.breathRest = 0.45;
    return mag * f;
  }
  function vortex(G, x, y, dir) {
    if (G.breath < 12) return false;
    G.breath = Math.max(0, G.breath - 18); G.breathRest = 0.45;
    G.vortices.push({ x, y: clamp(y, 40, GROUND - 30), dir, t: 0, life: 2.6, r: 120 });
    G.events.push({ type: 'vortex', x, y });
    return true;
  }
  function calm(G, x, y, dt) {
    if (G.breath <= 0) return false;
    G.breath = Math.max(0, G.breath - 14 * dt); G.breathRest = 0.45;
    let c = G.calms.find(o => o.live);
    if (!c) { c = { x, y, r: 95, a: 0, live: true }; G.calms.push(c); }
    c.x += (x - c.x) * 0.5; c.y += (y - c.y) * 0.5; c.hold = 0.12;
    return true;
  }

  // ================= BƯỚC CẬP NHẬT =================
  const tmp = {};
  function step(G, dt) {
    if (G.over) return;
    G.t += dt;
    const F = G.field;
    if (!G.storm) G.cam = clamp(G.cam + G.camV * dt, 0, Math.max(0, G.len - G.W));
    // gợi ý
    // hơi gió
    if (G.breathRest > 0) G.breathRest -= dt; else G.breath = Math.min(100, G.breath + 16 * dt);
    // gió giật tự nhiên (chặng thường) và bão
    G.gustList.forEach(g => {
      if (!g.fired && G.t >= g.t) {
        g.fired = true;
        G.jets.push({ x: G.cam - 60, y: g.y, tx: G.cam + G.W + 200, ty: g.y + 20, sp: 300, warn: 1.6, w0: 1.6, r: 70, life: 6, power: 400, nat: true });
        G.events.push({ type: 'gustWarn' });
      }
    });
    if (G.storm) stormStep(G, dt);
    // vòi gió
    for (let i = G.jets.length - 1; i >= 0; i--) {
      const j = G.jets[i];
      if (j.warn > 0) { j.warn -= dt; continue; }
      j.life -= dt;
      const dx = j.tx - j.x, dy = j.ty - j.y, d = hyp(dx, dy) || 1;
      const nxp = j.x + dx / d * j.sp * dt, nyp = j.y + dy / d * j.sp * dt;
      F.push(j.x, j.y, nxp, nyp, dx / d * j.power, dy / d * j.power, j.r, 0.5);
      j.x = nxp; j.y = nyp;
      if (j.life <= 0 || d < 30 || (j.nat ? j.x > G.cam + G.W + 120 : j.x < j.tx - 10)) G.jets.splice(i, 1);
    }
    // xoáy
    for (let i = G.vortices.length - 1; i >= 0; i--) {
      const v = G.vortices[i]; v.t += dt;
      const k = v.t < 0.3 ? v.t / 0.3 : v.t > v.life - 0.5 ? (v.life - v.t) / 0.5 : 1;
      F.swirl(v.x, v.y, v.r, 210 * k, v.dir);
      if (v.t >= v.life) G.vortices.splice(i, 1);
    }
    // lặng (sau mọi lực khác để chắn được cả gió bão)
    for (let i = G.calms.length - 1; i >= 0; i--) {
      const c = G.calms[i];
      if (c.live) { c.hold -= dt; c.a = Math.min(1, c.a + dt * 6); if (c.hold <= 0) c.live = false; }
      else { c.a -= dt * 3; if (c.a <= 0) { G.calms.splice(i, 1); continue; } }
      F.calm(c.x, c.y, c.r, dt * c.a);
    }
    F.step(dt, G.cam - 140, G.cam + G.W + 140);
    for (let i = 0; i < G.calms.length; i++) { const c = G.calms[i]; F.calm(c.x, c.y, c.r, dt * c.a); }

    // mây mới trôi vào từ mép trái
    if (G.L.cloudEvery && !G.storm) {
      G.nextCloud -= dt;
      if (G.nextCloud <= 0) { G.nextCloud = G.L.cloudEvery; if (G.cam + G.W < G.len - 200) addCloud(G, G.cam - 50, 95 + G.rnd() * 120, 1); }
    }
    cloudsStep(G, dt);
    fieldsStep(G, dt);
    kitesStep(G, dt);
    dandStep(G, dt);
    seedsStep(G, dt);
    wishStep(G, dt);
    if (G.flash > 0) G.flash -= dt;
    // kết thúc
    if (G.hearts <= 0) { G.over = true; G.result = { win: false, why: 'Làng đã mất hết sức sống' }; return; }
    if (G.storm) {
      if (G.t >= G.dur) { G.over = true; G.result = { win: true, why: 'Giông đã tan' }; }
    } else if (G.t >= G.dur + 2) {
      const win = G.done >= G.need;
      G.over = true; G.result = { win, why: win ? '' : 'Mới hoàn thành ' + G.done + ' / ' + G.need + ' ước nguyện cần thiết' };
    } else if (G.wishes.every(w => w.done || w.missed) && G.t > 3) {
      // mọi ước nguyện đã có kết quả thì kết thúc luôn, không bắt chờ cảnh trôi hết
      const win = G.done >= G.need;
      G.over = true; G.result = { win, why: win ? '' : 'Mới hoàn thành ' + G.done + ' / ' + G.need + ' ước nguyện cần thiết' };
    }
  }

  function stormStep(G, dt) {
    const W = G.len;
    G.waves.forEach((w, wi) => {
      if (G.t < w.a || G.t > w.b) return;
      if (G.t >= w.next) {
        w.next += w.gap * (0.85 + G.rnd() * 0.3);
        const alive = G.roofs.filter(r => !r.gone);
        const pick = (alive.length ? alive : G.roofs)[Math.floor(G.rnd() * (alive.length || G.roofs.length))];
        const mk = (r, dy) => G.jets.push({ x: W + 80, y: 150 + G.rnd() * 120 + dy, tx: r.x - 60, ty: GROUND - 70, sp: 330 + wi * 30, warn: 1.25, w0: 1.25, r: 64, life: 5, power: 360 + wi * 25 });
        mk(pick, 0);
        if (w.dbl && G.rnd() < 0.55 && alive.length > 1) mk(alive.filter(r => r !== pick)[0], -40);
        G.events.push({ type: 'gustWarn' });
      }
      if (w.cl < w.clouds && G.t >= w.a + 2 + w.cl * 5) {
        w.cl++; addCloud(G, W + 60, 100 + G.rnd() * 80, 3, true);
      }
      if (wi >= 1 && G.rnd() < dt * 0.22) { G.flash = 0.22; G.events.push({ type: 'thunder', x: W * (0.1 + G.rnd() * 0.8) }); }
    });
    if (G.t > 72) G.clear = Math.min(1, G.clear + dt / 3);
    // mái chợ
    G.roofs.forEach(r => {
      if (r.gone) return;
      G.field.sample(r.x, GROUND - 66, tmp);
      const m = hyp(tmp.x, tmp.y);
      r.wind = m;
      if (m > 190) { r.dmg += (m - 190) / 300 * dt * 0.9; r.shake = Math.min(1, (m - 190) / 160); } else { r.shake *= 0.9; r.dmg = Math.max(0, r.dmg - dt * 0.02); }
      if (r.dmg >= 1) { r.gone = true; G.hearts--; G.events.push({ type: 'roof', x: r.x }); G.events.push({ type: 'heart' }); }
    });
  }

  function cloudsStep(G, dt) {
    const cs = G.clouds, F = G.field;
    for (let i = cs.length - 1; i >= 0; i--) {
      const c = cs[i]; c.age += dt;
      if (c.fade > 0) { c.fade += dt; if (c.fade > 2.5) { cs.splice(i, 1); continue; } }
      F.sample(c.x, c.y, tmp);
      const k = 2.4 / (1 + (c.size - 1) * 0.45);
      c.vx += (tmp.x - c.vx) * Math.min(1, k * dt); c.vy += (tmp.y * 0.8 - c.vy) * Math.min(1, k * dt);
      if (c.y < SKY_TOP) c.vy += (SKY_TOP - c.y) * 6 * dt;
      if (c.y > SKY_BOT) c.vy -= (c.y - SKY_BOT) * 6 * dt;
      c.vx *= 1 - dt * 0.15; c.vy *= 1 - dt * 0.4;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.x = clamp(c.x, -200, G.len + 200);
      if (c.bump > 0) c.bump = Math.max(0, c.bump - dt * 3);
      c.rain = 0;
      if (c.size >= 3 && c.fade === 0) {
        c.water -= dt; c.rain = 1;
        if (c.water <= 0) { c.size = 1; c.fade = 0.001; c.rain = 0; G.events.push({ type: 'spent', x: c.x, y: c.y }); }
      }
      if (c.dark && (c.x > G.len + 160 || c.x < -160)) { cs.splice(i, 1); continue; }
    }
    // gộp mây
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j];
      if (a.fade || b.fade || a.dark || b.dark) continue;
      const ra = cloudR(a), rb = cloudR(b), d = hyp(a.x - b.x, a.y - b.y);
      if (d > (ra + rb) * 0.72) continue;
      if (a.size + b.size <= 3) {
        const s = a.size + b.size, m = a.size / s;
        a.x = a.x * m + b.x * (1 - m); a.y = a.y * m + b.y * (1 - m);
        a.vx = a.vx * m + b.vx * (1 - m); a.vy = a.vy * m + b.vy * (1 - m);
        a.size = s; a.bump = 1; if (s >= 3) a.water = 7;
        cs.splice(j, 1); j--;
        G.events.push({ type: 'merge', x: a.x, y: a.y, size: s });
      } else {
        const ux = (a.x - b.x) / (d || 1), uy = (a.y - b.y) / (d || 1), push = ((ra + rb) * 0.72 - d) * 2;
        a.vx += ux * push * dt * 6; a.vy += uy * push * dt * 6; b.vx -= ux * push * dt * 6; b.vy -= uy * push * dt * 6;
      }
    }
  }
  function cloudR(c) { return 30 + c.size * 13 + (c.dark ? 18 : 0); }

  function rainOver(G, x0, x1) {
    let s = 0;
    for (const c of G.clouds) { if (!c.rain) continue; const r = cloudR(c) * 0.8; const a = Math.max(x0, c.x - r), b = Math.min(x1, c.x + r); if (b > a) s += (b - a) / Math.min(x1 - x0, r * 2); }
    return Math.min(1, s);
  }
  function fieldsStep(G, dt) {
    G.fields.forEach(f => {
      if (f.done) return;
      const r = rainOver(G, f.x, f.x + f.w);
      f.raining = r;
      if (r > 0) { f.water = Math.min(1, f.water + dt * 0.25 * Math.min(1, r * 1.6)); }
    });
    G.mats.forEach(m => {
      if (m.covered) { m.cover = Math.min(1, m.cover + dt * 2); return; }
      const r = rainOver(G, m.x, m.x + m.w);
      m.raining = r;
      if (r > 0.15) { m.exp += dt; if (m.exp >= 1.5) { m.covered = true; G.hearts--; G.events.push({ type: 'heart' }); G.events.push({ type: 'wet', x: m.x + m.w / 2 }); } }
      else m.exp = Math.max(0, m.exp - dt * 0.5);
    });
  }

  function kitesStep(G, dt) {
    const F = G.field;
    G.kites.forEach(k => {
      if (k.state === 'broken') {
        k.brokenT -= dt; k.spin += dt * 7;
        F.sample(k.kx, k.ky, tmp);
        k.vx += (tmp.x - k.vx) * dt * 1.5; k.vy += (-40 - k.vy) * dt;
        k.kx += k.vx * dt; k.ky += k.vy * dt;
        if (k.brokenT <= 0) { Object.assign(k, newKite(k.kidX), { state: 'ground' }); }
        return;
      }
      F.sample(k.kx, k.ky, tmp);
      const wm = hyp(tmp.x, tmp.y);
      // đứt dây khi gió gắt kéo dài 0,12 giây (một cái lướt tay nhanh thoáng qua chưa đứt)
      k.harsh = wm > 340 ? (k.harsh || 0) + dt : Math.max(0, (k.harsh || 0) - dt * 2);
      if (k.state !== 'done' && k.harsh > 0.12) {
        k.state = 'broken'; k.brokenT = 4; k.harsh = 0; k.vx = tmp.x * 0.8; k.vy = tmp.y * 0.8 - 60; k.aloft = 0;
        G.events.push({ type: 'snap', x: k.kx, y: k.ky }); return;
      }
      if (k.state === 'done') {
        // trẻ giữ diều bay lượn nhẹ
        k.happy += dt;
        const tx = k.ax + 120 + Math.sin(k.happy * 0.7) * 30, ty = k.ay - 200 + Math.sin(k.happy * 1.1) * 18;
        k.kx += (tx - k.kx) * dt * 1.5; k.ky += (ty - k.ky) * dt * 1.5;
        k.ang = Math.sin(k.happy * 1.4) * 0.15;
        return;
      }
      const rx = tmp.x - k.vx, ry = tmp.y - k.vy;
      let ax = rx * 1.6, ay = ry * 1.6 - Math.min(Math.abs(rx), 300) * 1.9 + 105;
      k.vx += ax * dt; k.vy += ay * dt;
      k.vx *= 1 - dt * 0.6; k.vy *= 1 - dt * 0.6;
      k.kx += k.vx * dt; k.ky += k.vy * dt;
      // dây
      const dx = k.kx - k.ax, dy = k.ky - k.ay, d = hyp(dx, dy);
      if (d > k.len) {
        const ux = dx / d, uy = dy / d;
        k.kx = k.ax + ux * k.len; k.ky = k.ay + uy * k.len;
        const vn = k.vx * ux + k.vy * uy; if (vn > 0) { k.vx -= vn * ux; k.vy -= vn * uy; }
      }
      if (k.ky > GROUND - 12) { k.ky = GROUND - 12; k.vy = Math.min(0, k.vy); k.vx *= 0.8; }
      k.state = k.ky < GROUND - 40 ? 'fly' : 'ground';
      k.ang += (clamp(k.vx / 300, -0.6, 0.6) - k.ang) * dt * 4;
      if (k.ky < k.ay - KITE_UP) k.aloft += dt; else k.aloft = Math.max(0, k.aloft - dt * 0.6);
      if (k.aloft >= 4) { k.state = 'done'; k.happy = 0; }
    });
  }

  function dandStep(G, dt) {
    const F = G.field;
    G.dands.forEach(p => {
      F.sample(p.x, GROUND - 50, tmp);
      p.sway += (clamp(tmp.x / 260, -1, 1) - p.sway) * dt * 5;
      if (p.seeds <= 0) { p.regrow += dt; if (p.regrow > 6) { p.seeds = 12; p.regrow = 0; } return; }
      p.cool -= dt;
      const m = hyp(tmp.x, tmp.y);
      if (m > 90 && p.cool <= 0) {
        p.cool = 0.09; p.seeds--;
        G.seeds.push({ x: p.x + (G.rnd() - 0.5) * 14, y: GROUND - 52 + (G.rnd() - 0.5) * 10, vx: tmp.x * 0.4, vy: tmp.y * 0.4 - 40, life: 16, rot: G.rnd() * 6 });
      }
    });
  }
  function seedsStep(G, dt) {
    const F = G.field;
    for (let i = G.seeds.length - 1; i >= 0; i--) {
      const s = G.seeds[i];
      F.sample(s.x, s.y, tmp);
      s.vx += (tmp.x - s.vx) * Math.min(1, dt * 3); s.vy += (tmp.y - s.vy) * Math.min(1, dt * 3) + 30 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt + Math.sin(G.t * 3 + i) * 6 * dt; s.rot += dt * 2;
      s.life -= dt;
      if (s.y >= GROUND - 6) {
        const b = G.beds.find(b => s.x >= b.x && s.x <= b.x + b.w);
        if (b && b.n < b.need) {
          const fx = b.x + b.w * (0.2 + 0.3 * b.n) + (G.rnd() - 0.5) * 16;
          b.flowers.push({ x: fx, t: 0, hue: [0, 1, 2][b.n] }); b.n++;
          G.events.push({ type: 'flower', x: fx, y: GROUND - 8 });
        }
        G.seeds.splice(i, 1); continue;
      }
      if (s.life <= 0 || s.y < -40 || s.x < G.cam - 300 || s.x > G.len + 100) G.seeds.splice(i, 1);
    }
    G.beds.forEach(b => b.flowers.forEach(f => f.t += dt));
  }

  function wishStep(G, dt) {
    G.wishes.forEach(w => {
      if (w.done || w.missed) { w.t += dt; return; }
      const r = w.ref;
      w.prog = w.type === 'field' ? r.water : w.type === 'kite' ? (r.state === 'done' ? 1 : r.aloft / 4) : w.type === 'bed' ? r.n / r.need : w.type === 'roof' ? (r.gone ? 0 : G.t / G.dur) : 0;
      const ok = w.type === 'field' ? r.water >= 1 : w.type === 'kite' ? r.state === 'done' : w.type === 'bed' ? r.n >= r.need : w.type === 'roof' ? (G.t >= G.dur - 0.05 && !r.gone) : false;
      if (ok) { w.done = true; w.t = 0; G.done++; if (w.type === 'field') r.done = true; G.events.push({ type: 'wish', x: w.x, kind: w.type }); return; }
      if (w.type === 'roof' && r.gone) { w.missed = true; w.t = 0; return; }
      if (!G.storm && w.x < G.cam - 20) { w.missed = true; w.t = 0; G.events.push({ type: 'miss', x: w.x }); }
    });
  }

  /* trận giông: cảnh rộng đúng bằng khung nhìn; đổi khung thì giãn mọi toạ độ ngang theo tỉ lệ và dựng lại trường gió */
  function restretch(G, W) {
    if (!G.storm || Math.abs(W - G.len) < 1) { G.W = W; return; }
    const k = W / G.len, sx = o => { o.x *= k; };
    G.roofs.forEach(sx); G.mats.forEach(m => { m.x *= k; m.w *= k; }); G.clouds.forEach(sx); G.wishes.forEach(sx);
    G.jets.forEach(j => { j.x *= k; j.tx *= k; }); G.vortices.forEach(sx); G.calms.forEach(sx);
    // giữ nguyên gió đang thổi: lấy mẫu trường cũ sang trường mới theo tỉ lệ
    const old = G.field, nf = new Field(W), tmpS = {};
    nf.setBase(old.bx, old.by);
    for (let j = 0; j < nf.ny; j++) for (let i = 0; i < nf.nx; i++) { old.sample(i * CELL / k, j * CELL, tmpS); const id = j * nf.nx + i; nf.vx[id] = tmpS.x; nf.vy[id] = tmpS.y; }
    G.field = nf;
    G.len = W; G.W = W; G.cam = 0;
  }
  window.GM = { restretch, KITE_UP, H, GROUND, CELL, SKY_TOP, SKY_BOT, LEVELS, load, step, stroke, vortex, calm, cloudR, rng, clamp };
})();
