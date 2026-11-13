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
    de:   { label: 'Dễ',   shadows: 0, w: [7, 8], h: [6, 7], fill: .58, gates: 1, steps: [8, 14],  slack: 3 },
    vua:  { label: 'Vừa',  shadows: 1, w: [7, 8], h: [6, 7], fill: .6,  gates: 1, steps: [12, 24], slack: 2 },
    kho:  { label: 'Khó',  shadows: 1, w: [8, 9], h: [7, 8], fill: .58, gates: 2, steps: [18, 32], slack: 1 },
  };
  const TIPS = {
    de: 'Đứng lên bệ thì cửa cùng màu mở. Bước thẳng từ bệ vào cửa.',
    vua: 'Bệ không nằm sát cửa: cần một cái bóng giữ bệ cho bạn.',
    kho: 'Một bóng, hai cửa. Bóng có thể phải làm hai việc, hoặc đi qua cửa khi bạn giữ bệ.',
  };
  const SEARCH_LOOP = 16;
  const STATE_LIMIT = 1500000;
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

  // Thử dựng một màn. Trả về level (đã kiểm có lời giải) hoặc null.
  function attempt(r, key) {
    const P = DIFF[key];
    const w = between(r, P.w[0], P.w[1]), h = between(r, P.h[0], P.h[1]);
    const g = carve(r, w, h, P.fill);
    // S: ô xa nhất từ một ô bất kỳ, E: ô xa nhất từ S
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
    const ch = chokes(g, S, E).filter(c => !adj(c, S) && !adj(c, E));
    if (ch.length < P.gates) return null;

    let gates;
    if (P.gates === 1) gates = [pick(r, ch)];
    else {
      // hai cửa cách nhau ít nhất 2 ô dọc đường
      const a = pick(r, ch.slice(0, Math.max(1, ch.length - 1)));
      const later = ch.filter(c => c[2] >= a[2] + 2);
      if (!later.length) return null;
      gates = [a, pick(r, later)];
    }
    gates.forEach((c, i) => { g[c[1]][c[0]] = 'AB'[i]; });
    const isGateCell = (x, y) => g[y][x] === 'A' || g[y][x] === 'B';
    const sideS = bfs(g, S[0], S[1], isGateCell); // vùng S đi tới được khi mọi cửa đóng
    const free = floors.filter(([x, y]) => g[y][x] === '.' && !(x === S[0] && y === S[1]) && !(x === E[0] && y === E[1]));

    const plates = [];
    if (key === 'de') {
      // bệ nằm sát cửa, phía S: tự giữ bệ rồi bước thẳng vào cửa
      const A = gates[0];
      const opts = free.filter(c => adj(c, A) && sideS[c[1]][c[0]] >= 0);
      if (!opts.length) return null;
      plates.push(pick(r, opts));
      // thêm một bệ giả ở xa cho có việc để nghĩ (không bắt buộc)
    } else {
      gates.forEach((G, i) => {
        let opts = free.filter(c => !adj(c, G) && !plates.some(p => p[0] === c[0] && p[1] === c[1]));
        if (i === 0) opts = opts.filter(c => sideS[c[1]][c[0]] >= 1);
        if (opts.length) plates.push(pick(r, opts));
      });
      if (plates.length !== gates.length) return null;
    }
    plates.forEach((c, i) => { g[c[1]][c[0]] = 'ab'[i]; });
    g[S[1]][S[0]] = 'S'; g[E[1]][E[0]] = 'E';

    // cắt bớt phần tường thừa, chừa 1 ô viền
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    g.forEach((row, y) => row.forEach((c, x) => { if (c !== '#') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
    const map = g.slice(y0 - 1, y1 + 2).map(row => row.slice(x0 - 1, x1 + 2).join(''));
    const level = { map, loop: SEARCH_LOOP, maxShadows: P.shadows, par: { shadows: P.shadows, steps: 0 } };
    const sol = C.solve(level, STATE_LIMIT);
    if (!sol || sol.shadows.length !== P.shadows) return null;
    if (sol.steps < P.steps[0] || sol.steps > P.steps[1]) return null;

    const need = Math.max(sol.moves.length, ...sol.shadows.map(s => s.length));
    level.loop = Math.min(SEARCH_LOOP, need + P.slack);
    if (key === 'kho' && !interesting(level, sol)) return null;

    // kiểm lại với độ dài vòng thật
    const final = C.solve(level, STATE_LIMIT);
    if (!final || final.shadows.length !== P.shadows) return null;
    const sim = C.simulate(C.parse(level), final.shadows, final.moves);
    if (sim.win < 0) return null;
    level.par.steps = final.steps;
    level.solution = final;
    return level;
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
            lv.tip = TIPS[key];
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
