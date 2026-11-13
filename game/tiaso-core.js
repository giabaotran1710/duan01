// Tia số - lõi luật: dựng bàn, mô phỏng tia, máy giải tìm lời giải ít ô nhất.
// Dùng chung cho game (trình duyệt) và tool/tiaso-solver.js (node).
(function (root) {
  'use strict';
  const DIRS = { R: [1, 0], L: [-1, 0], U: [0, -1], D: [0, 1] };
  const LEFT = { R: 'U', U: 'L', L: 'D', D: 'R' };
  const RIGHT = { R: 'D', D: 'L', L: 'U', U: 'R' };
  // gương "/" : đi phải thì lên, đi xuống thì sang trái...
  const SLASH = { R: 'U', U: 'R', L: 'D', D: 'L' };
  const BACK = { R: 'D', D: 'R', L: 'U', U: 'L' };
  const MAXV = 9999;

  function isOp(t) { return /^([+\-*\/%]\d+|sq|rev|sum)$/.test(t); }

  // Đổi giá trị khi tia đi qua ô phép tính. Trả về null nếu tia tắt.
  function apply(op, v) {
    let r;
    if (op === 'sq') r = v * v;
    else if (op === 'rev') r = Number(String(v).split('').reverse().join(''));
    else if (op === 'sum') r = String(v).split('').reduce((t, c) => t + Number(c), 0);
    else {
      const n = Number(op.slice(1));
      switch (op[0]) {
        case '+': r = v + n; break;
        case '-': r = v - n; break;
        case '*': r = v * n; break;
        case '/': if (v % n !== 0) return null; r = v / n; break;
        case '%': r = v % n; break;
      }
    }
    if (r < 0 || r > MAXV || !Number.isInteger(r)) return null;
    return r;
  }

  function label(t) {
    if (t === 'sq') return 'x²';
    if (t === 'rev') return '⇄';
    if (t === 'sum') return 'Σ';
    if (t === 'split') return '◇';
    if (t === '/' || t === '\\') return t;
    return t.replace('*', '×').replace('/', '÷').replace('-', '−');
  }

  // Dựng bàn từ dữ liệu màn.
  // Ký tự: '.' ô đặt được, ',' sàn không đặt được, '#' tường, '/' '\' gương cố định, 'o' tách cố định,
  // chữ cái khác tra trong lv.ents: {t:'src',d,v} | {t:'tgt',v} | {t:'op',op} | {t:'merge',d}
  //   | {t:'gate',p:'even'|'odd'} cổng chẵn/lẻ | {t:'portal',id} cổng dịch chuyển (hai ô cùng id là một cặp)
  function parse(lv) {
    const H = lv.map.length, W = lv.map[0].length;
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = lv.map[y][x];
      let c;
      if (ch === '.') c = { k: 'slot' };
      else if (ch === ',') c = { k: 'floor' };
      else if (ch === '#') c = { k: 'wall' };
      else if (ch === '/' || ch === '\\') c = { k: 'fix', t: ch };
      else if (ch === 'o') c = { k: 'fix', t: 'split' };
      else {
        const e = lv.ents && lv.ents[ch];
        if (!e) throw new Error('Ký tự lạ ' + ch + ' trong màn ' + lv.name);
        if (e.t === 'src') c = { k: 'src', d: e.d, v: e.v };
        else if (e.t === 'tgt') c = { k: 'tgt', v: e.v };
        else if (e.t === 'op') c = { k: 'fix', t: e.op };
        else if (e.t === 'merge') c = { k: 'merge', d: e.d };
        else if (e.t === 'gate') c = { k: 'gate', p: e.p };
        else if (e.t === 'portal') c = { k: 'portal', id: e.id };
        else throw new Error('Thực thể lạ');
      }
      cells.push(c);
    }
    const pair = {};
    cells.forEach((c, i) => {
      if (c.k !== 'portal') return;
      const j = cells.findIndex((o, k) => k !== i && o.k === 'portal' && o.id === c.id);
      if (j < 0) throw new Error('Cổng dịch chuyển thiếu cặp');
      pair[i] = j;
    });
    return { W, H, cells, pair, tray: lv.tray.slice() };
  }

  // Mô phỏng. place: mảng (theo chỉ số ô) chứa tên ô người chơi đặt, hoặc undefined.
  // undecided (tùy chọn): Set các ô chưa quyết - gặp thì dừng và trả về ô đó (dùng cho máy giải).
  function simulate(B, place, undecided) {
    const { W, H, cells } = B;
    const segs = [];            // đoạn tia để vẽ: {x0,y0,x1,y1,v}
    const marks = [];           // giá trị tia ngay sau mỗi ô phép tính: {i, v, d}
    const hits = {};            // đích -> danh sách giá trị nhận
    const mergeIn = {};         // ô hợp -> danh sách giá trị vào
    const deaths = [];          // chỗ tia tắt: {i, why}
    let overload = [];
    let loop = false;
    const queue = [];
    cells.forEach((c, i) => { if (c.k === 'src') queue.push({ i, d: c.d, v: c.v }); });
    let steps = 0;
    while (queue.length) {
      const b = queue.shift();
      let x = b.i % W, y = (b.i / W) | 0, d = b.d, v = b.v;
      let sx = x, sy = y;
      const seen = new Set();
      for (;;) {
        if (++steps > 4000) { loop = true; queue.length = 0; break; }
        const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) {
          segs.push({ x0: sx, y0: sy, x1: x + DIRS[d][0] * 0.5, y1: y + DIRS[d][1] * 0.5, v });
          break;
        }
        x = nx; y = ny;
        const i = y * W + x;
        const key = i * 4 + 'RLUD'.indexOf(d);
        if (seen.has(key)) { loop = true; segs.push({ x0: sx, y0: sy, x1: x, y1: y, v }); deaths.push({ i, why: 'loop' }); break; }
        seen.add(key);
        const c = cells[i];
        let t = null;
        if (c.k === 'slot') {
          if (undecided && undecided.has(i)) return { pending: i };
          t = place[i] || null;
        } else if (c.k === 'fix') t = c.t;
        if (c.k === 'wall' || c.k === 'src') {
          segs.push({ x0: sx, y0: sy, x1: x - DIRS[d][0] * 0.5, y1: y - DIRS[d][1] * 0.5, v });
          deaths.push({ i, why: 'wall' });
          break;
        }
        if (c.k === 'tgt') {
          segs.push({ x0: sx, y0: sy, x1: x - DIRS[d][0] * 0.32, y1: y - DIRS[d][1] * 0.32, v });
          (hits[i] = hits[i] || []).push(v);
          break;
        }
        if (c.k === 'gate') {
          if ((v % 2 === 0) === (c.p === 'even')) continue;
          segs.push({ x0: sx, y0: sy, x1: x - DIRS[d][0] * 0.3, y1: y - DIRS[d][1] * 0.3, v });
          deaths.push({ i, why: 'gate' });
          break;
        }
        if (c.k === 'portal') {
          segs.push({ x0: sx, y0: sy, x1: x, y1: y, v });
          const j = B.pair[i];
          x = j % W; y = (j / W) | 0; sx = x; sy = y;
          const k2 = j * 4 + 'RLUD'.indexOf(d);
          if (seen.has(k2)) { loop = true; deaths.push({ i: j, why: 'loop' }); break; }
          seen.add(k2);
          continue;
        }
        if (c.k === 'merge') {
          segs.push({ x0: sx, y0: sy, x1: x, y1: y, v });
          const arr = (mergeIn[i] = mergeIn[i] || []);
          arr.push(v);
          if (arr.length === 2) {
            if (arr[0] + arr[1] > MAXV) deaths.push({ i, why: 'op' });
            else queue.push({ i, d: c.d, v: arr[0] + arr[1] });
          }
          else if (arr.length === 3) overload.push(i);
          break;
        }
        if (!t) continue;
        if (t === '/' || t === '\\') {
          segs.push({ x0: sx, y0: sy, x1: x, y1: y, v });
          sx = x; sy = y;
          d = (t === '/' ? SLASH : BACK)[d];
          continue;
        }
        if (t === 'split') {
          segs.push({ x0: sx, y0: sy, x1: x, y1: y, v });
          queue.push({ i, d: LEFT[d], v });
          queue.push({ i, d: RIGHT[d], v });
          break;
        }
        // ô phép tính
        const nv = apply(t, v);
        if (nv === null) {
          segs.push({ x0: sx, y0: sy, x1: x, y1: y, v });
          deaths.push({ i, why: 'op' });
          break;
        }
        segs.push({ x0: sx, y0: sy, x1: x, y1: y, v });
        marks.push({ i, v: nv, d });
        sx = x; sy = y; v = nv;
      }
    }
    // đánh giá đích
    const tg = {};
    let win = !loop && overload.length === 0;
    cells.forEach((c, i) => {
      if (c.k !== 'tgt') return;
      const h = hits[i] || [];
      let st = 'idle';
      if (h.length === 1 && h[0] === c.v) st = 'ok';
      else if (h.length) st = 'bad';
      tg[i] = { st, got: h };
      if (st !== 'ok') win = false;
    });
    return { segs, marks, tg, mergeIn, deaths, overload, loop, win };
  }

  function countTray(tray) {
    const m = {};
    tray.forEach(t => { m[t] = (m[t] || 0) + 1; });
    return m;
  }

  // Máy giải: rẽ nhánh ở từng ô trống mà tia đi qua (để trống hoặc đặt một loại ô còn trong khay).
  // Trả về {best: số ô ít nhất, sols: các lời giải ít ô nhất (tối đa limit), nodes}.
  function solve(B, opts) {
    opts = opts || {};
    const limit = opts.limit || 20;
    const N = B.cells.length;
    const undecided = new Set();
    B.cells.forEach((c, i) => { if (c.k === 'slot') undecided.add(i); });
    const place = new Array(N);
    const left = countTray(B.tray);
    const types = Object.keys(left);
    let best = opts.cap != null ? opts.cap : Infinity, found = false, sols = [], nodes = 0, cut = false;
    function rec(used) {
      if (++nodes > (opts.maxNodes || 3e6)) { cut = true; return; }
      if (used > best) return;
      const r = simulate(B, place, undecided);
      if (r.pending === undefined) {
        if (r.win) {
          if (used < best || !found) { best = used; sols = []; found = true; }
          if (sols.length < limit) {
            const s = {};
            place.forEach((t, i) => { if (t) s[i] = t; });
            sols.push(s);
          }
        }
        return;
      }
      const i = r.pending;
      undecided.delete(i);
      rec(used);                                  // để trống
      if (used + 1 <= best) {
        for (const t of types) {
          if (!left[t]) continue;
          left[t]--; place[i] = t;
          rec(used + 1);
          left[t]++; place[i] = undefined;
        }
      }
      undecided.add(i);
    }
    rec(0);
    return { best: found ? best : -1, sols, nodes, cut };
  }

  const api = { DIRS, apply, label, isOp, parse, simulate, solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TiaSo = api;
})(this);
