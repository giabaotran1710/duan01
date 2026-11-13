// Đèn kéo quân - bộ sinh màn tự động.
// Mỗi màn được dựng ngẫu nhiên rồi đưa qua máy giải (DKQ.solve); chỉ màn có lời giải mới được giữ,
// kèm số chuẩn (par) và lời giải mẫu để làm gợi ý. Cùng một mã (seed) luôn cho cùng một màn.
(function (root) {
  'use strict';
  const C = (typeof module !== 'undefined' && module.exports) ? require('./denkeoquan-core.js') : root.DKQ;

  // Bộ số ngẫu nhiên có hạt giống (mulberry32)
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DIFF = {
    vua:  { label: 'Vừa',  shadows: 1, w: [7, 8], h: [6, 7], fill: .6,  steps: [12, 26], slack: 1,
            variants: [{ doors: [{ plate: 0 }] }, { doors: [{ plate: 0 }], guard: true }, { doors: [{ plate: 0 }, { plate: 1 }] }] },
    // Khó: vòng sát nút, có lính tuần hoặc cửa ngược, và không giải được bằng kiểu "bóng tới bệ rồi đứng im"
    kho:  { label: 'Khó',  shadows: 1, w: [8, 9], h: [7, 8], fill: .58, steps: [18, 34], slack: 0, hard: true,
            variants: [
              { doors: [{ plate: 0 }, { plate: 0, inv: true }] },
              { doors: [{ plate: 0 }, { plate: 1 }], guard: true },
              { doors: [{ plate: 0 }, { plate: 0, inv: true }], guard: true },
              { doors: [{ plate: 0 }], guard: true },
              { doors: [{ plate: 0 }, { plate: 1 }] },
            ] },
    // Rất khó: bản đồ lớn, 3 cửa (luôn có cửa ngược), có lính, vòng dài hơn nhưng không dư bước
    rkho: { label: 'Rất khó', shadows: 1, w: [9, 10], h: [8, 9], fill: .56, steps: [24, 40], slack: 0, hard: true, search: 18,
            variants: [
              { doors: [{ plate: 0 }, { plate: 0, inv: true }, { plate: 1 }], guard: 1 },
              { doors: [{ plate: 0 }, { plate: 1 }, { plate: 1, inv: true }], guard: 1 },
              { doors: [{ plate: 0 }, { plate: 1 }, { plate: 0, inv: true }], guard: 1 },
              { doors: [{ plate: 0 }, { plate: 0, inv: true }], guard: 2 },
              { doors: [{ plate: 0 }, { plate: 1, inv: true }, { plate: 1 }], guard: 2 },
            ] },
  };
  const TIPS = {
    vua: 'Bệ xa cửa: cần một cái bóng giữ bệ cho bạn.',
    kho: 'Vòng sát nút. Bóng phải làm nhiều hơn là đứng giữ bệ.',
    rkho: 'Vòng sát nút, nhiều cửa. Mỗi bước của bóng đều phải đúng nhịp.',
  };
  const SEARCH_LOOP = 16;
  const STATE_LIMIT = 400000;
  const D4 = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function between(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }

  // BFS trên lưới ký tự; blocked(x,y) cho biết ô có bị chặn không.
  function bfs(grid, sx, sy, blocked) {
    const h = grid.length, w = grid[0].length;
    const dist = Array.from({ length: h }, () => new Array(w).fill(-1));
    dist[sy][sx] = 0;
    const q = [[sx, sy]];
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of D4) {
        const nx = x + dx, ny = y + dy;
        if (grid[ny][nx] === '#' || dist[ny][nx] >= 0 || (blocked && blocked(nx, ny))) continue;
        dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]);
      }
    }
    return dist;
  }

  function carve(r, w, h, fill) {
    const g = Array.from({ length: h }, () => new Array(w).fill('#'));
    const inner = (w - 2) * (h - 2), target = Math.round(inner * fill);
    let x = between(r, 1, w - 2), y = between(r, 1, h - 2), dir = pick(r, D4), count = 0, guard = 0;
    g[y][x] = '.'; count = 1;
    while (count < target && guard++ < 5000) {
      if (r() < .35) dir = pick(r, D4);
      const nx = x + dir[0], ny = y + dir[1];
      if (nx < 1 || ny < 1 || nx > w - 2 || ny > h - 2) { dir = pick(r, D4); continue; }
      x = nx; y = ny;
      if (g[y][x] === '#') { g[y][x] = '.'; count++; }
    }
    return g;
  }

  // Các ô "cổ chai" trên đường S→E: bịt ô đó thì S không tới được E.
  function chokes(g, S, E) {
    const d = bfs(g, S[0], S[1]);
    const res = [];
    for (let y = 1; y < g.length - 1; y++) for (let x = 1; x < g[0].length - 1; x++) {
      if (g[y][x] !== '.' || (x === S[0] && y === S[1]) || (x === E[0] && y === E[1]) || d[y][x] < 0) continue;
      const d2 = bfs(g, S[0], S[1], (bx, by) => bx === x && by === y);
      if (d2[E[1]][E[0]] < 0) res.push([x, y, d[y][x]]);
    }
    return res.sort((a, b) => a[2] - b[2]);
  }

  const adj = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

  // Các đoạn thẳng 3-5 ô sàn trống (cho lính tuần), có cắt qua đường đi S→E.
  function guardTracks(g, onPath) {
    const res = [];
    const ok = (x, y) => g[y] && g[y][x] === '.';
    for (let y = 1; y < g.length - 1; y++) for (let x = 1; x < g[0].length - 1; x++) {
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        if (ok(x - dx, y - dy)) continue; // chỉ bắt đầu ở đầu đoạn
        const tr = [];
        let cx = x, cy = y;
        while (ok(cx, cy) && tr.length < 5) { tr.push([cx, cy]); cx += dx; cy += dy; }
        if (tr.length >= 3 && tr.some(c => onPath(c))) res.push(tr);
      }
    }
    return res;
  }

  // Thử dựng một màn. Trả về level (đã kiểm có lời giải) hoặc null.
  function attempt(r, key) {
    const P = DIFF[key];
    const w = between(r, P.w[0], P.w[1]), h = between(r, P.h[0], P.h[1]);
    const g = carve(r, w, h, P.fill);
    const floors = [];
    g.forEach((row, y) => row.forEach((c, x) => { if (c === '.') floors.push([x, y]); }));
    if (floors.length < 10) return null;
    const far = (from) => {
      const d = bfs(g, from[0], from[1]);
      let best = from, bd = -1;
      for (const [x, y] of floors) if (d[y][x] > bd) { bd = d[y][x]; best = [x, y]; }
      return [best, bd];
    };
    const [S] = far(pick(r, floors));
    const [E, dSE] = far(S);
    if (dSE < 5) return null;
    // ô nằm trên một đường ngắn nhất S→E
    const dS = bfs(g, S[0], S[1]), dE = bfs(g, E[0], E[1]);
    const onPath = ([x, y]) => dS[y][x] >= 0 && dS[y][x] + dE[y][x] === dSE;

    // Kiểu màn: danh sách cửa (chữ bệ + loại), có lính hay không
    const variant = pick(r, P.variants);
    const ch = chokes(g, S, E).filter(c => !adj(c, S) && !adj(c, E));
    if (ch.length < variant.doors.length) return null;
    // các cửa xếp theo thứ tự dọc đường đi, cách nhau ít nhất 2 ô
    const doorCells = [];
    for (let i = 0; i < variant.doors.length; i++) {
      const left = variant.doors.length - 1 - i;
      const prev = doorCells[i - 1];
      let opts = ch.filter(c => !prev || c[2] >= prev[2] + 2);
      if (left) opts = opts.slice(0, Math.max(1, opts.length - left));
      if (!opts.length) return null;
      doorCells.push(pick(r, opts));
    }
    const doorChar = (d) => d.inv ? String(d.plate + 1) : 'ABC'[d.plate];
    variant.doors.forEach((d, i) => { const c = doorCells[i]; g[c[1]][c[0]] = doorChar(d); });
    const isDoorCell = (x, y) => /[A-C1-3]/.test(g[y][x]);
    const sideS = bfs(g, S[0], S[1], isDoorCell);
    const free = () => floors.filter(([x, y]) => g[y][x] === '.' && !(x === S[0] && y === S[1]) && !(x === E[0] && y === E[1]));

    const nPlates = Math.max(...variant.doors.map(d => d.plate)) + 1;
    const plates = [];
    {
      for (let pi = 0; pi < nPlates; pi++) {
        // bệ của cửa thứ nhất nằm phía S; tránh đặt sát cửa của chính nó
        const first = variant.doors.findIndex(d => d.plate === pi);
        const G = doorCells[first];
        let opts = free().filter(c => !adj(c, G) && !plates.some(p => p[0] === c[0] && p[1] === c[1]));
        if (pi === 0) opts = opts.filter(c => sideS[c[1]][c[0]] >= 1);
        if (!opts.length) return null;
        plates.push(pick(r, opts));
      }
    }
    plates.forEach((c, i) => { g[c[1]][c[0]] = 'abc'[i]; });
    g[S[1]][S[0]] = 'S'; g[E[1]][E[0]] = 'E';

    let guards = [];
    for (let k = 0; k < (variant.guard === true ? 1 : variant.guard || 0); k++) {
      // lính sau không đi chung ô với lính trước
      const used = new Set(guards.flat().map(c => c.join()));
      const trs = guardTracks(g, onPath).filter(tr => !tr.some(c => used.has(c.join())));
      if (!trs.length) return null;
      const tr = pick(r, trs);
      guards.push(r() < .5 ? tr : tr.slice().reverse());
    }

    // cắt bớt phần tường thừa, chừa 1 ô viền
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    g.forEach((row, y) => row.forEach((c, x) => { if (c !== '#') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
    const map = g.slice(y0 - 1, y1 + 2).map(row => row.slice(x0 - 1, x1 + 2).join(''));
    guards = guards.map(tr => tr.map(([x, y]) => [x - x0 + 1, y - y0 + 1]));
    const SL = P.search || SEARCH_LOOP;
    const level = { map, guards, loop: SL, maxShadows: P.shadows, par: { shadows: P.shadows, steps: 0 } };
    // Lính chỉ làm màn khó thêm, nên giải bản không có lính trước (nhanh hơn nhiều): không giải được thì bỏ luôn.
    let noGuard = null;
    if (guards.length) {
      noGuard = C.solve(Object.assign({}, level, { guards: [] }), STATE_LIMIT);
      if (!noGuard) return null;
    }
    const sol = C.solve(level, STATE_LIMIT);
    if (!sol || sol.shadows.length !== P.shadows) return null;
    if (sol.steps < P.steps[0] || sol.steps > P.steps[1]) return null;
    if (noGuard && noGuard.shadows.length === sol.shadows.length && noGuard.steps >= sol.steps) return null;

    const need = Math.max(sol.moves.length, ...sol.shadows.map(x => x.length));
    if (need > SL - P.slack) return null;
    level.loop = need + P.slack;
    if (P.hard && !interesting(level, sol)) return null;

    // kiểm lại với độ dài vòng thật
    const final = C.solve(level, STATE_LIMIT);
    if (!final || final.shadows.length !== P.shadows) return null;
    const sim = C.simulate(C.parse(level), final.shadows, final.moves);
    if (sim.win < 0) return null;
    if (P.hard && naiveWorks(level)) return null;
    // lính phải thật sự gây khó: bỏ lính đi thì màn phải dễ hơn
    if (guards.length) {
      const free0 = C.solve(Object.assign({}, level, { guards: [] }), STATE_LIMIT);
      if (free0 && free0.shadows.length === final.shadows.length && free0.steps >= final.steps) return null;
      // với từng lính: bỏ riêng lính đó đi thì màn cũng phải dễ hơn
      if (guards.length > 1) for (let gi = 0; gi < guards.length; gi++) {
        const one = C.solve(Object.assign({}, level, { guards: guards.filter((_, j) => j !== gi) }), STATE_LIMIT);
        if (one && one.shadows.length === final.shadows.length && one.steps >= final.steps) return null;
      }
    }
    level.par.steps = final.steps;
    level.solution = final;
    level.tip = tipFor(key, level);
    if (!guards.length) delete level.guards;
    return level;
  }

  // Cách chơi "đếm nhẩm": bóng đi thẳng tới một bệ rồi đứng im ở đó. Màn khó không được giải bằng cách này.
  function naiveWorks(level) {
    const g = C.parse(level);
    const plates = [];
    g.rows.forEach((row, y) => [...row].forEach((c, x) => { if (C.isPlate(c)) plates.push([x, y]); }));
    for (const P of plates) {
      // đường ngắn nhất (đi một mình, tránh lính) từ S tới bệ
      const target = Object.assign({}, level, { map: level.map.map((row, y) => [...row].map((c, x) => (x === P[0] && y === P[1]) ? 'E' : c === 'E' ? '.' : c).join('')), maxShadows: 0 });
      let rec;
      try { const s0 = C.solve0(C.parse(target)); rec = s0 && s0.moves; } catch (e) { rec = null; }
      if (!rec) continue;
      if (C.solveFrom(g, [rec], '') !== null) return true;
    }
    return false;
  }

  function tipFor(key, level) {
    const parts = [TIPS[key]];
    const all = level.map.join('');
    if (/[1-3]/.test(all)) parts.push('Cửa gạch chéo đóng khi bệ cùng màu bị giẫm.');
    if (level.guards && level.guards.length) parts.push('Chạm lính là về đầu vòng; lính không bước vào ô có bóng.');
    return parts.join(' ');
  }

  // Màn khó phải bắt bóng làm nhiều hơn "đi tới bệ rồi đứng im": giữ 2 bệ, hoặc vấp cửa, hoặc phải rời bệ.
  function interesting(level, sol) {
    const g = C.parse(level);
    const sim = C.simulate(g, sol.shadows, sol.moves);
    const plates = new Set();
    let bumps = 0, leftPlate = false, onPlate = false;
    sim.frames.forEach((f, t) => {
      const [x, y] = f.pos[0], c = C.cell(g, x, y);
      if (C.isPlate(c)) { plates.add(c); onPlate = true; }
      else if (onPlate) leftPlate = true;
      if (t && f.bumped[0]) {
        const a = sol.shadows[0][t - 1], p = sim.frames[t - 1].pos[0];
        if (a && a !== 'W' && C.isGate(C.cell(g, p[0] + C.DIRS[a][0], p[1] + C.DIRS[a][1]))) bumps++;
      }
    });
    return plates.size >= 2 || bumps > 0 || leftPlate;
  }

  // Bộ sinh chạy từng phần để trang không bị đứng: gọi run(ms) nhiều lần cho tới khi có màn.
  function create(key, seed) {
    const r = rng(seed);
    let tries = 0;
    return {
      key, seed,
      get tries() { return tries; },
      run(budgetMs) {
        const t0 = Date.now();
        while (Date.now() - t0 < budgetMs) {
          tries++;
          const lv = attempt(r, key);
          if (lv) {
            lv.name = DIFF[key].label + ' #' + seed;
            lv.generated = { key, seed };
            return lv;
          }
          if (tries > 4000) return false;
        }
        return null;
      },
    };
  }

  function generate(key, seed) {
    const gen = create(key, seed);
    for (;;) { const lv = gen.run(1e9); if (lv !== null) return lv || null; }
  }

  // Mã màn của ngày (giờ Việt Nam), giống nhau với mọi người chơi.
  function dailySeed(date) {
    const d = new Date((date || new Date()).getTime() + 7 * 3600e3);
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }

  const api = { DIFF, create, generate, dailySeed, rng };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DKQ_GEN = api;
})(this);
