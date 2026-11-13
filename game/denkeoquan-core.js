// Đèn kéo quân - lõi luật (không đụng tới giao diện). Dùng chung cho game, bộ sinh màn và công cụ kiểm màn.
//
// Bản đồ: '#' tường, '.' sàn, 'S' xuất phát, 'E' cửa trăng (đích),
//         'a'..'c' bệ đạp, 'A'..'C' cửa (mở khi có ai đứng trên bệ cùng chữ),
//         '1'..'3' cửa ngược của bệ a..c (đóng khi có ai đứng trên bệ đó).
//         Cửa không bao giờ đóng lên người đang đứng trong nó.
//         '~' ván mục: chỉ chịu một người. Đang có người đứng thì không ai bước lên được; người đó bước đi là ván sụp
//             thành hố cho tới hết vòng. Nên mỗi vòng, mỗi ván chỉ một người (bóng hoặc bạn) đi qua được, và không quay đầu được.
// level.guards: các lính tuần, mỗi lính là một đường ô liền nhau [[x,y],...]; lính đi qua lại trên đường đó mỗi nhịp 1 ô.
//         Lính không bước vào ô có bóng (đứng chờ tại chỗ). Lính chạm người chơi (cùng ô, hoặc đổi chỗ cho nhau) là người chơi bị bắt.
// Hành động: 'U','D','L','R' đi 1 ô, 'W' đứng chờ.
// Mỗi nhịp: trạng thái cửa tính theo vị trí ĐẦU nhịp, mọi người cùng đi (bị chặn thì đứng yên, bóng thì "vấp"), rồi lính đi.
(function (root) {
  'use strict';

  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };
  const ACT = ['U', 'D', 'L', 'R', 'W'];

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
    const guards = (level.guards || []).map(tr => tr.map(p => p.slice()));
    return { w, h, rows, start, exit, loop: level.loop, maxShadows: level.maxShadows, guards };
  }

  const cell = (g, x, y) => (x < 0 || y < 0 || x >= g.w || y >= g.h) ? '#' : g.rows[y][x];
  const isGate = c => c >= 'A' && c <= 'C';
  const isInv = c => c >= '1' && c <= '3';
  const isPlate = c => c >= 'a' && c <= 'c';
  const isDoor = c => isGate(c) || isInv(c);
  const isCrumble = c => c === '~';
  const fkey = (x, y) => x + ',' + y;
  const doorLetter = c => isGate(c) ? c : String.fromCharCode(64 + +c); // '1' -> 'A'
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];

  // Những chữ bệ đang bị giẫm (tên theo chữ hoa của cửa).
  function openLetters(g, positions) {
    const open = {};
    for (const [x, y] of positions) {
      const c = cell(g, x, y);
      if (isPlate(c)) open[c.toUpperCase()] = true;
    }
    return open;
  }
  // Cửa ở ô có ký tự c có đang mở không (pressed = kết quả openLetters).
  function doorOpen(c, pressed) {
    if (isGate(c)) return !!pressed[c];
    if (isInv(c)) return !pressed[doorLetter(c)];
    return true;
  }

  function passable(g, x, y, pressed, positions, fallen) {
    const c = cell(g, x, y);
    if (c === '#') return false;
    if (fallen && fallen[fkey(x, y)]) return false;
    if (isDoor(c) && !doorOpen(c, pressed)) {
      for (const p of positions) if (p[0] === x && p[1] === y) return true; // không đóng cửa lên người
      return false;
    }
    return true;
  }

  const initGuards = g => g.guards.map(() => ({ i: 0, d: 1 }));
  const guardCell = (g, gi, st) => g.guards[gi][st.i];

  // Lính đi 1 ô qua lại; không bước vào ô đang có bóng.
  function moveGuards(g, guards, shadowCells) {
    return guards.map((st, gi) => {
      const tr = g.guards[gi];
      let d = st.d, ni = st.i + d;
      if (ni < 0 || ni >= tr.length) { d = -d; ni = st.i + d; }
      if (shadowCells.some(p => same(p, tr[ni]))) return { i: st.i, d };
      return { i: ni, d };
    });
  }

  // Một nhịp: positions[i] đi theo actions[i] (người chơi là phần tử cuối, các phần tử trước là bóng).
  function step(g, positions, actions, guards, fallen) {
    guards = guards || initGuards(g);
    fallen = fallen || {};
    const pressed = openLetters(g, positions);
    const next = [], bumped = [];
    for (let i = 0; i < positions.length; i++) {
      const [x, y] = positions[i];
      const d = DIRS[actions[i] || 'W'];
      const nx = x + d[0], ny = y + d[1];
      const busy = (d[0] || d[1]) && isCrumble(cell(g, nx, ny)) &&
        (positions.some(q => q[0] === nx && q[1] === ny) || next.some((q, j) => q[0] === nx && q[1] === ny && !same(q, positions[j])));
      if ((d[0] || d[1]) && (busy || !passable(g, nx, ny, pressed, positions, fallen))) {
        next.push([x, y]); bumped.push(true);
      } else {
        next.push([nx, ny]); bumped.push(false);
      }
    }
    const n = positions.length - 1;
    const ng = moveGuards(g, guards, next.slice(0, n));
    const pp = positions[n], p2 = next[n];
    let caught = false;
    ng.forEach((st, gi) => {
      const before = guardCell(g, gi, guards[gi]), after = guardCell(g, gi, st);
      if (same(p2, after) || (same(p2, before) && same(pp, after))) caught = true;
    });
    // ván mục: có người đứng đầu nhịp mà cuối nhịp trống thì sụp
    let nf = fallen;
    for (const [x, y] of positions) {
      if (!isCrumble(cell(g, x, y)) || nf[fkey(x, y)]) continue;
      if (next.some(q => q[0] === x && q[1] === y)) continue;
      if (nf === fallen) nf = Object.assign({}, fallen);
      nf[fkey(x, y)] = true;
    }
    return { next, bumped, guards: ng, caught, fallen: nf };
  }

  // Mô phỏng một vòng: các bóng (mảng chuỗi hành động) + chuỗi hành động của người chơi.
  // Trả về các khung (frames) từ nhịp 0, nhịp thắng (win) và nhịp bị bắt (caught), -1 nếu không có.
  function simulate(g, shadows, moves) {
    const n = shadows.length;
    let pos = [];
    for (let i = 0; i <= n; i++) pos.push(g.start.slice());
    let guards = initGuards(g), fallen = {};
    const frames = [{ pos, bumped: new Array(n + 1).fill(false), open: openLetters(g, pos), guards, fallen }];
    let win = -1, caught = -1;
    for (let t = 0; t < moves.length; t++) {
      const acts = shadows.map(s => s[t] || 'W');
      acts.push(moves[t]);
      const r = step(g, pos, acts, guards, fallen);
      pos = r.next; guards = r.guards; fallen = r.fallen;
      frames.push({ pos, bumped: r.bumped, open: openLetters(g, pos), guards, fallen, caught: r.caught });
      if (r.caught) { caught = t + 1; break; }
      if (same(pos[n], g.exit)) { win = t + 1; break; }
    }
    return { frames, win, caught };
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
  function compile(g) {
    const idx = new Int16Array(g.w * g.h).fill(-1), cells = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (g.rows[y][x] !== '#') { idx[y * g.w + x] = cells.length; cells.push([x, y]); }
    }
    const N = cells.length;
    const nbr = new Int16Array(N * 5), gate = new Uint8Array(N), inv = new Uint8Array(N), plate = new Uint8Array(N), cr = new Uint8Array(N);
    let M = 1;
    cells.forEach(([x, y], i) => {
      const c = g.rows[y][x];
      if (isGate(c)) gate[i] = 1 << (c.charCodeAt(0) - 65);
      if (isInv(c)) inv[i] = 1 << (+c - 1);
      if (isPlate(c)) plate[i] = 1 << (c.charCodeAt(0) - 97);
      if (isCrumble(c)) { cr[i] = M; M *= 2; }
      ACT.forEach((a, k) => {
        const nx = x + DIRS[a][0], ny = y + DIRS[a][1];
        nbr[i * 5 + k] = (nx < 0 || ny < 0 || nx >= g.w || ny >= g.h) ? -1 : idx[ny * g.w + nx];
      });
    });
    const tracks = g.guards.map(tr => tr.map(([x, y]) => idx[y * g.w + x]));
    // trạng thái chung của mọi lính: mỗi lính (vị trí, hướng) = i*2 + (d>0)
    const mult = []; let G = 1;
    tracks.forEach(tr => { mult.push(G); G *= tr.length * 2; });
    return { N, cells, nbr, gate, inv, plate, cr, M, tracks, mult, G,
      start: idx[g.start[1] * g.w + g.start[0]], exit: idx[g.exit[1] * g.w + g.exit[0]] };
  }

  // ô q có đi vào được không, khi các bệ đang giẫm là mask open và ô q có người đứng hay không
  // fm: các ván mục đã sụp (bit theo k.cr)
  const enter = (k, q, open, occupied, fm) =>
    q >= 0 && !(k.cr[q] & fm) && !(k.gate[q] && !(k.gate[q] & open) && !occupied) && !(k.inv[q] && (k.inv[q] & open) && !occupied);
  // ván sụp: ô ván có người đứng trước (b1,b2) mà sau đó (c1,c2) không còn ai
  const crumble = (k, fm, b1, b2, c1, c2) => {
    if (k.cr[b1] && b1 !== c1 && b1 !== c2) fm |= k.cr[b1];
    if (b2 >= 0 && k.cr[b2] && b2 !== c1 && b2 !== c2) fm |= k.cr[b2];
    return fm;
  };

  // Lính: từ trạng thái gs, bóng ở ô sh (-1 nếu không có). Trả về [gs mới, có bắt người chơi đi từ pp tới p2 không].
  function guardsStep(k, gs, sh, pp, p2) {
    let ngs = 0, caught = false;
    for (let j = 0; j < k.tracks.length; j++) {
      const tr = k.tracks[j], st = Math.floor(gs / k.mult[j]) % (tr.length * 2);
      const i = st >> 1;
      let d = (st & 1) ? 1 : -1, ni = i + d;
      if (ni < 0 || ni >= tr.length) { d = -d; ni = i + d; }
      if (tr[ni] === sh) ni = i;
      if (p2 === tr[ni] || (p2 === tr[i] && pp === tr[ni])) caught = true;
      ngs += (ni * 2 + (d > 0 ? 1 : 0)) * k.mult[j];
    }
    return [ngs, caught];
  }
  const guardsStart = k => k.tracks.reduce((s, tr, j) => s + 1 * k.mult[j], 0); // i=0, d=+1

  function decode(path) { let s = ''; for (const a of path) s += ACT[a]; return s; }

  function solve0(g, k) {
    k = k || compile(g);
    const N = k.N, G = k.G, seen = new Set();
    const M = k.M;
    let layer = [[k.start, guardsStart(k), [], 0]];
    for (let t = 0; t < g.loop && layer.length; t++) {
      const next = [];
      for (const [p, gs, path, fm] of layer) for (let a = 0; a < 5; a++) {
        let q = k.nbr[p * 5 + a];
        if (!enter(k, q, k.plate[p], q === p, fm)) q = p;
        const nfm = crumble(k, fm, p, -1, q, -1);
        const [ngs, caught] = guardsStep(k, gs, -1, p, q);
        if (caught) continue;
        const np = path.concat(a);
        if (q === k.exit) return { shadows: [], moves: decode(np), steps: np.length };
        const key = ((G > 1 ? (t + 1) * N * G : 0) + q * G + ngs) * M + nfm;
        if (seen.has(key)) continue;
        seen.add(key); next.push([q, ngs, np, nfm]);
      }
      layer = next;
    }
    return null;
  }

  function solve1(g, k, limit) {
    k = k || compile(g);
    const N = k.N, T = g.loop, G = k.G, E = k.exit, M = k.M;
    // vòng 1 chỉ có một mình nên lính đi đúng lịch: tính trước trạng thái lính theo từng nhịp
    const g1 = [guardsStart(k)];
    for (let t = 0; t < T; t++) g1.push(guardsStep(k, g1[t], -1, -1, -1)[0]);
    // f1: ván đã sụp ở vòng 1 (chỉ người ghi bóng), f2: ván đã sụp ở vòng 2
    const enc = (t, e, a, s, p, gs, f1, f2) => ((((((t * 2 + e) * N + a) * N + s) * N + p) * G + gs) * M + f1) * M + f2;
    const best = new Map(); // id -> [cost, prevId, how]
    const buckets = [];
    const push = (c, st) => (buckets[c] || (buckets[c] = [])).push(st);
    const s0 = enc(0, 0, k.start, k.start, k.start, guardsStart(k), 0, 0);
    best.set(s0, [0, -1, 0]);
    push(0, [s0, 0, 0, k.start, k.start, k.start, guardsStart(k), 0, 0]);
    const done = new Set();
    for (let c = 0; c < buckets.length; c++) {
      const b = buckets[c]; if (!b) continue;
      for (let bi = 0; bi < b.length; bi++) {
        const [v, t, e, a, s, p, gs, f1, f2] = b[bi];
        if (done.has(v) || best.get(v)[0] !== c) continue;
        done.add(v);
        if (limit && done.size > limit) return undefined;
        if (p === E && t > 0) {
          let rec = '', mv = '';
          for (let u = v; best.get(u)[1] !== -1; u = best.get(u)[1]) {
            const [, pu, h] = best.get(u);
            const endNow = h >= 25, ra = Math.floor(h % 25 / 5), pa = h % 5;
            mv = ACT[pa] + mv;
            const pe = Math.floor(pu / (M * M * G * N * N * N)) % 2;
            if (!pe && !endNow) rec = ACT[ra] + rec;
          }
          return { shadows: [rec], moves: mv, steps: c };
        }
        if (t >= T) continue;
        const opts = e ? [[4, 1, 0]] : [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1], [4, 1, 0]];
        for (const [ra, endNow, extra] of opts) {
          const ne = e || endNow;
          let a2 = a, nf1 = f1;
          if (!ne) {
            let q = k.nbr[a * 5 + ra];
            if (!enter(k, q, k.plate[a], q === a, f1)) q = a;
            if (guardsStep(k, g1[t], -1, a, q)[1]) continue; // vòng 1 bị lính bắt thì không ghi được bước này
            if (q === E) continue; // vòng 1 tới đích thì đã thắng một mình
            a2 = q; nf1 = crumble(k, f1, a, -1, q, -1);
          }
          const realRa = ne ? 4 : ra;
          const open = k.plate[s] | k.plate[p];
          let s2 = k.nbr[s * 5 + realRa];
          if (!enter(k, s2, open, s2 === p || s2 === s, f2) || (k.cr[s2] && s2 !== s && s2 === p)) s2 = s;
          for (let pa = 0; pa < 5; pa++) {
            let p2 = k.nbr[p * 5 + pa];
            if (!enter(k, p2, open, p2 === s || p2 === p, f2) || (k.cr[p2] && p2 !== p && (p2 === s || (p2 === s2 && s2 !== s)))) p2 = p;
            const [ngs, caught] = guardsStep(k, gs, s2, p, p2);
            if (caught) continue;
            const nf2 = crumble(k, f2, s, p, s2, p2);
            const w = enc(t + 1, ne, a2, s2, p2, ngs, ne ? 0 : nf1, nf2);
            const cost = c + 1 + extra, old = best.get(w);
            if (old && old[0] <= cost) continue;
            best.set(w, [cost, v, (endNow ? 25 : 0) + ra * 5 + pa]);
            push(cost, [w, t + 1, ne, a2, s2, p2, ngs, ne ? 0 : nf1, nf2]);
          }
        }
      }
      buckets[c] = null;
    }
    return null;
  }

  // Với các bóng đã ghi và những bước đã đi ở vòng này, tìm các bước còn lại ngắn nhất để tới trăng trong vòng này.
  // Trả về chuỗi bước còn lại ('' nếu đã ở đích) hoặc null nếu vòng này đã kẹt (không còn đường, hoặc đã bị bắt).
  function solveFrom(g, shadows, moves) {
    const sim = simulate(g, shadows, moves);
    if (sim.win >= 0) return '';
    if (sim.caught >= 0) return null;
    const last = sim.frames[sim.frames.length - 1];
    let layer = [{ pos: last.pos, guards: last.guards, fallen: last.fallen, path: '' }];
    const seen = new Set();
    for (let t = moves.length; t < g.loop && layer.length; t++) {
      const next = [];
      for (const st of layer) {
        for (const a of ACT) {
          const acts = shadows.map(s => s[t] || 'W'); acts.push(a);
          const r = step(g, st.pos, acts, st.guards, st.fallen);
          if (r.caught) continue;
          if (same(r.next[r.next.length - 1], g.exit)) return st.path + a;
          const key = (t + 1) + '|' + r.next.join(';') + '|' + r.guards.map(q => q.i + ',' + q.d).join(';') + '|' + Object.keys(r.fallen).sort().join(';');
          if (seen.has(key)) continue;
          seen.add(key);
          next.push({ pos: r.next, guards: r.guards, fallen: r.fallen, path: st.path + a });
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

  const api = { DIRS, ACT, parse, cell, isGate, isInv, isDoor, isPlate, isCrumble, doorLetter, doorOpen, openLetters, passable,
    initGuards, guardCell, step, simulate, stars, compile, solve0, solve1, solve, solveFrom };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DKQ = api;
})(this);
