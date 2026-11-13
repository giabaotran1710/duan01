// Đèn kéo quân - lõi luật (không đụng tới giao diện). Dùng chung cho game và công cụ kiểm màn (tool/denkeoquan-solver.js).
//
// Bản đồ: '#' tường, '.' sàn, 'S' xuất phát, 'E' cửa trăng (đích),
//         'a'..'c' bệ đạp, 'A'..'C' cửa cùng màu (mở khi có ai đứng trên bệ cùng chữ, hoặc có ai đang đứng trong ô cửa).
// Hành động: 'U','D','L','R' đi 1 ô, 'W' đứng chờ.
// Mỗi nhịp: trạng thái cửa tính theo vị trí ĐẦU nhịp, rồi mọi người cùng đi. Bị chặn thì đứng yên (bóng thì "vấp").
(function (root) {
  'use strict';

  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };

  function parse(level) {
    const rows = level.map;
    const h = rows.length, w = rows[0].length;
    let start = null, exit = null;
    for (let y = 0; y < h; y++) {
      if (rows[y].length !== w) throw new Error(level.name + ': dòng ' + y + ' lệch độ dài');
      for (let x = 0; x < w; x++) {
        const c = rows[y][x];
        if (c === 'S') start = [x, y];
        if (c === 'E') exit = [x, y];
      }
    }
    if (!start || !exit) throw new Error(level.name + ': thiếu S hoặc E');
    return { w, h, rows, start, exit, loop: level.loop, maxShadows: level.maxShadows };
  }

  const cell = (g, x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h) ? '#' : g.rows[y][x];
  const isGate = c => c >= 'A' && c <= 'C';
  const isPlate = c => c >= 'a' && c <= 'c';

  // Những chữ cửa đang mở với các vị trí cho trước.
  function openLetters(g, positions) {
    const open = {};
    for (const [x, y] of positions) {
      const c = cell(g, x, y);
      if (isPlate(c)) open[c.toUpperCase()] = true;
    }
    return open;
  }

  function passable(g, x, y, open, positions) {
    const c = cell(g, x, y);
    if (c === '#') return false;
    if (isGate(c)) {
      if (open[c]) return true;
      for (const [px, py] of positions) if (px === x && py === y) return true; // không đóng cửa lên người
      return false;
    }
    return true;
  }

  // Một nhịp: positions[i] đi theo actions[i]. Trả về { next, bumped[] }.
  function step(g, positions, actions) {
    const open = openLetters(g, positions);
    const next = [], bumped = [];
    for (let i = 0; i < positions.length; i++) {
      const [x, y] = positions[i];
      const d = DIRS[actions[i] || 'W'];
      const nx = x + d[0], ny = y + d[1];
      if ((d[0] || d[1]) && !passable(g, nx, ny, open, positions)) {
        next.push([x, y]); bumped.push(true);
      } else {
        next.push([nx, ny]); bumped.push(false);
      }
    }
    return { next, bumped };
  }

  // Mô phỏng một vòng: các bóng (mảng chuỗi hành động) + chuỗi hành động của người chơi.
  // Trả về các khung (frames) từ nhịp 0, và nhịp thắng (nếu có).
  function simulate(g, shadows, moves) {
    const n = shadows.length;
    let pos = [];
    for (let i = 0; i <= n; i++) pos.push(g.start.slice());
    const frames = [{ pos, bumped: new Array(n + 1).fill(false), open: openLetters(g, pos) }];
    let win = -1;
    for (let t = 0; t < moves.length; t++) {
      const acts = shadows.map(s => s[t] || 'W');
      acts.push(moves[t]);
      const r = step(g, pos, acts);
      pos = r.next;
      frames.push({ pos, bumped: r.bumped, open: openLetters(g, pos) });
      const me = pos[n];
      if (me[0] === g.exit[0] && me[1] === g.exit[1]) { win = t + 1; break; }
    }
    return { frames, win };
  }

  function stars(level, shadowsUsed, totalSteps) {
    let s = 1;
    if (shadowsUsed <= level.par.shadows) s = 2;
    if (s === 2 && totalSteps <= level.par.steps) s = 3;
    return s;
  }

  // ---------- Máy giải ----------
  // Tìm lời giải ít bóng nhất (0 hoặc 1 bóng), trong đó ít bước nhất (tổng bước mọi vòng, kể cả bước chờ).
  // Trả về { shadows: [chuỗi bước của bóng], moves: chuỗi bước vòng cuối, steps } hoặc null.
  // limit (tuỳ chọn): số trạng thái tối đa được duyệt, quá thì bỏ cuộc (trả về undefined) để bộ sinh màn không treo.
  const ACT = ['U', 'D', 'L', 'R', 'W'];

  function compile(g) {
    const idx = new Int16Array(g.w * g.h).fill(-1), cells = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (g.rows[y][x] !== '#') { idx[y * g.w + x] = cells.length; cells.push([x, y]); }
    }
    const N = cells.length;
    const nbr = new Int16Array(N * 5), gate = new Uint8Array(N), plate = new Uint8Array(N);
    cells.forEach(([x, y], i) => {
      const c = g.rows[y][x];
      if (isGate(c)) gate[i] = 1 << (c.charCodeAt(0) - 65);
      if (isPlate(c)) plate[i] = 1 << (c.charCodeAt(0) - 97);
      ACT.forEach((a, k) => {
        const nx = x + DIRS[a][0], ny = y + DIRS[a][1];
        nbr[i * 5 + k] = (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) ? -1 : idx[ny * g.w + nx];
      });
    });
    return { N, cells, nbr, gate, plate, start: idx[g.start[1] * g.w + g.start[0]], exit: idx[g.exit[1] * g.w + g.exit[0]] };
  }

  function solve0(g, k) {
    k = k || compile(g);
    const prev = new Int16Array(k.N).fill(-2), how = new Uint8Array(k.N);
    prev[k.start] = -1;
    let layer = [k.start];
    for (let t = 0; t < g.loop && layer.length; t++) {
      const next = [];
      for (const p of layer) for (let a = 0; a < 5; a++) {
        let q = k.nbr[p * 5 + a];
        if (q < 0 || (k.gate[q] && !(k.gate[q] & k.plate[p]))) q = p;
        if (prev[q] !== -2) continue;
        prev[q] = p; how[q] = a; next.push(q);
        if (q === k.exit) {
          let s = '';
          for (let c = q; prev[c] !== -1; c = prev[c]) s = ACT[how[c]] + s;
          return { shadows: [], moves: s, steps: s.length };
        }
      }
      layer = next;
    }
    return null;
  }

  function solve1(g, k, limit) {
    k = k || compile(g);
    const N = k.N, T = g.loop, NN = N * N, NNN = NN * N;
    const total = (T + 1) * 2 * NNN;
    const seen = new Uint8Array(total), prev = new Int32Array(total), how = new Uint8Array(total), dist = new Uint16Array(total).fill(65535);
    const id = (t, e, a, s, p) => ((t * 2 + e) * N + a) * NN + s * N + p;
    const nbr = k.nbr, gate = k.gate, plate = k.plate, E = k.exit;
    const buckets = [];
    const push = (c, v) => (buckets[c] || (buckets[c] = [])).push(v);
    const s0 = id(0, 0, k.start, k.start, k.start);
    prev[s0] = -1; dist[s0] = 0; push(0, s0);
    let visited = 0;
    for (let c = 0; c < buckets.length; c++) {
      const b = buckets[c]; if (!b) continue;
      for (let bi = 0; bi < b.length; bi++) {
        const v = b[bi];
        if (seen[v]) continue;
        seen[v] = 1;
        if (limit && ++visited > limit) return undefined;
        let r = v;
        const p = r % N; r = (r - p) / N;
        const s = r % N; r = (r - s) / N;
        const a = r % N; r = (r - a) / N;
        const e = r % 2, t = (r - e) / 2;
        if (p === E && t > 0) {
          let rec = '', mv = '';
          for (let u = v; prev[u] !== -1; u = prev[u]) {
            const h = how[u], endNow = h >= 25, ra = Math.floor(h % 25 / 5), pa = h % 5;
            mv = ACT[pa] + mv;
            const pe = Math.floor(prev[u] / NNN) % 2;
            if (!pe && !endNow) rec = ACT[ra] + rec;
          }
          return { shadows: [rec], moves: mv, steps: c };
        }
        if (t >= T) continue;
        // các lựa chọn cho người vòng 1: đi tiếp (chưa quay đèn) hoặc quay đèn ngay (từ đây đứng yên)
        const opts = e ? [[4, 1, 0]] : [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1], [4, 1, 0]];
        for (const [ra, endNow, extra] of opts) {
          const ne = e || endNow;
          let a2 = a;
          if (!ne) {
            let q = nbr[a * 5 + ra];
            if (q < 0 || (gate[q] && !(gate[q] & plate[a]))) q = a;
            a2 = q;
            if (a2 === E) continue; // vòng 1 tới đích thì đã thắng một mình
          }
          const realRa = ne ? 4 : ra;
          const open = plate[s] | plate[p];
          let s2 = nbr[s * 5 + realRa];
          if (s2 < 0 || (gate[s2] && !(gate[s2] & open) && s2 !== p)) s2 = s;
          for (let pa = 0; pa < 5; pa++) {
            let p2 = nbr[p * 5 + pa];
            if (p2 < 0 || (gate[p2] && !(gate[p2] & open) && p2 !== s)) p2 = p;
            const w = id(t + 1, ne, a2, s2, p2);
            if (seen[w]) continue;
            const cost = c + 1 + extra;
            if (cost >= dist[w]) continue;
            dist[w] = cost; prev[w] = v; how[w] = (endNow ? 25 : 0) + ra * 5 + pa;
            push(cost, w);
          }
        }
      }
      buckets[c] = null;
    }
    return null;
  }

  // Với các bóng đã ghi và những bước đã đi ở vòng này, tìm các bước còn lại ngắn nhất để tới trăng trong vòng này.
  // Trả về chuỗi bước còn lại ('' nếu đang đứng ở đích) hoặc null nếu vòng này đã kẹt.
  function solveFrom(g, shadows, moves) {
    const sim = simulate(g, shadows, moves);
    if (sim.win >= 0) return '';
    let layer = new Map();
    const startPos = sim.frames[sim.frames.length - 1].pos;
    layer.set(startPos.join(';'), { pos: startPos, path: '' });
    const seen = new Set();
    for (let t = moves.length; t < g.loop; t++) {
      const next = new Map();
      for (const st of layer.values()) {
        for (const a of ACT) {
          const acts = shadows.map(s => s[t] || 'W'); acts.push(a);
          const pos = step(g, st.pos, acts).next;
          const me = pos[pos.length - 1];
          if (me[0] === g.exit[0] && me[1] === g.exit[1]) return st.path + a;
          const key = pos.join(';');
          // sau khi mọi bóng đã đi hết bước ghi, trạng thái không còn phụ thuộc thời gian
          const settled = shadows.every(s => s.length <= t + 1);
          const sk = settled ? 'z' + key : (t + 1) + '|' + key;
          if (next.has(key) || seen.has(sk)) continue;
          seen.add(sk);
          next.set(key, { pos, path: st.path + a });
        }
      }
      layer = next;
    }
    return null;
  }

  function solve(level, limit) {
    const g = parse(level), k = compile(g);
    const s0 = solve0(g, k);
    if (s0) return s0;
    if (!level.maxShadows) return null;
    return solve1(g, k, limit);
  }

  const api = { DIRS, ACT, parse, cell, isGate, isPlate, openLetters, passable, step, simulate, stars, compile, solve0, solve1, solve, solveFrom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DKQ = api;
})(this);
