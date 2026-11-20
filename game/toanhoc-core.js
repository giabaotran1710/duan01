// Trò chơi toán học - lõi luật: tính chuỗi phép tính, đếm lời giải, sinh đề từ lời giải.
// Dùng chung cho game (trình duyệt) và tool/toanhoc-check.js (node).
//
// Một đề: { start, steps, tray, target, sol }
//   start: số đầu chuỗi, hoặc null nếu đầu chuỗi là ô trống nhận thẻ số
//   steps: [{op, n}] - op null: ô trống nhận thẻ phép tính (vd "+3");
//                       op có sẵn ('+','-','*','/'), n null: ô trống nhận thẻ số
//                       op và n đều có: bước khắc sẵn
//   tray: thẻ trong khay, chuỗi: thẻ phép tính "+3" "-2" "*4" "/2", thẻ số "7"
// Chuỗi tính lần lượt từ trái sang phải. Chia không hết, ra số âm hoặc quá MAXV thì chuỗi đứt.
(function (root) {
  'use strict';
  const MAXV = 9999;
  const GEN_VER = 1;

  const isOpCard = c => /^[+\-*\/]\d+$/.test(c);
  function label(c) {
    return String(c).replace('*', '×').replace('/', '÷').replace(/^-/, '−');
  }
  const opLabel = op => ({ '+': '+', '-': '−', '*': '×', '/': '÷' })[op];

  function apply(op, n, v) {
    let r;
    switch (op) {
      case '+': r = v + n; break;
      case '-': r = v - n; break;
      case '*': r = v * n; break;
      case '/': if (n === 0 || v % n !== 0) return null; r = v / n; break;
      default: return null;
    }
    if (r < 0 || r > MAXV) return null;
    return r;
  }

  // Danh sách ô trống theo thứ tự trái sang phải: {pos: -1 (đầu chuỗi) | chỉ số bước, kind: 'num'|'op'}
  function slotsOf(lv) {
    const s = [];
    if (lv.start == null) s.push({ pos: -1, kind: 'num' });
    lv.steps.forEach((st, i) => {
      if (st.op == null) s.push({ pos: i, kind: 'op' });
      else if (st.n == null) s.push({ pos: i, kind: 'num' });
    });
    return s;
  }

  // fill: mảng thẻ theo thứ tự ô trống (undefined = chưa đặt).
  // Trả về {start, vals: giá trị sau mỗi bước (undefined nếu chưa tính được), broke: chỉ số bước đứt hoặc -1, full, value, win}
  function evaluate(lv, fill) {
    const slots = slotsOf(lv);
    const at = {};
    slots.forEach((s, k) => { at[s.pos] = fill[k]; });
    let v = lv.start != null ? lv.start : (at[-1] != null ? Number(at[-1]) : undefined);
    const vals = [];
    let broke = -1;
    lv.steps.forEach((st, i) => {
      let op = st.op, n = st.n;
      if (op == null) { const c = at[i]; if (c != null) { op = c[0]; n = Number(c.slice(1)); } }
      else if (n == null && at[i] != null) n = Number(at[i]);
      if (v === undefined || broke >= 0 || op == null || n == null) { vals.push(undefined); v = undefined; return; }
      const r = apply(op, n, v);
      if (r === null) { broke = i; vals.push(undefined); v = undefined; return; }
      vals.push(r); v = r;
    });
    const full = slots.every((s, k) => fill[k] != null);
    const value = broke < 0 && full ? vals[vals.length - 1] : undefined;
    return { vals, broke, full, value, win: value === lv.target };
  }

  // Đếm số cách đặt thẻ (khác nhau về giá trị) cho ra đúng đích. Thẻ trùng nhau tính là một.
  // Trả về {count, results: số kết quả khác nhau có thể có, first: một lời giải}
  function solve(lv, cap) {
    cap = cap || 1e9;
    const slots = slotsOf(lv);
    const pool = {};
    lv.tray.forEach(c => { pool[c] = (pool[c] || 0) + 1; });
    const keys = Object.keys(pool);
    const fill = new Array(slots.length);
    let count = 0, first = null;
    const results = new Set();
    (function rec(k) {
      if (count >= cap) return;
      if (k === slots.length) {
        const r = evaluate(lv, fill);
        if (r.value !== undefined) results.add(r.value);
        if (r.win) { count++; if (!first) first = fill.slice(); }
        return;
      }
      const want = slots[k].kind;
      for (const c of keys) {
        if (!pool[c] || isOpCard(c) !== (want === 'op')) continue;
        pool[c]--; fill[k] = c;
        rec(k + 1);
        pool[c]++;
      }
      fill[k] = undefined;
    })(0);
    return { count, results: results.size, first };
  }

  // ---------- sinh đề ----------
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
  function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // Cấu hình theo bậc (1, 2, 3...). Độ khó tăng dần, từ bậc 30 giữ ở mức cao nhất.
  //  slots: số ô trống, extra: thẻ thừa, ops: phép được dùng, maxN: số lớn nhất trên thẻ,
  //  maxV: giá trị trung gian lớn nhất, maxSols: số lời giải tối đa, kinds: kiểu đề có thể ra
  function cfgAt(n) {
    if (n <= 3) return { slots: 2, extra: 0, ops: '+-*', maxN: 5, maxV: 40, maxSols: 1, kinds: ['op'] };
    if (n <= 6) return { slots: 3, extra: 0, ops: '+-*', maxN: 6, maxV: 60, maxSols: 2, kinds: ['op'] };
    if (n <= 9) return { slots: 3, extra: 0, ops: '+-*/', maxN: 6, maxV: 80, maxSols: 2, kinds: ['op', 'num'] };
    if (n <= 13) return { slots: 3, extra: 1, ops: '+-*/', maxN: 8, maxV: 100, maxSols: 2, kinds: ['op', 'num', 'mix'] };
    if (n <= 18) return { slots: 4, extra: 1, ops: '+-*/', maxN: 9, maxV: 150, maxSols: 2, kinds: ['op', 'num', 'mix'] };
    if (n <= 24) return { slots: 5, extra: 1, ops: '+-*/', maxN: 9, maxV: 200, maxSols: 1, kinds: ['op', 'num', 'mix'] };
    if (n <= 29) return { slots: 5, extra: 2, ops: '+-*/', maxN: 12, maxV: 300, maxSols: 1, kinds: ['num', 'mix', 'op'] };
    return { slots: 6, extra: 2, ops: '+-*/', maxN: 12, maxV: 400, maxSols: 1, kinds: ['num', 'mix', 'op'] };
  }

  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));

  // Chọn một bước hợp lệ từ giá trị v (không có bước vô nghĩa như +0, ×1, ÷1).
  function randomStep(r, v, cfg, prevOp) {
    for (let t = 0; t < 30; t++) {
      const op = pick(r, cfg.ops.split(''));
      if (op === prevOp && r() < 0.6) continue;   // tránh lặp một phép liên tiếp
      let n;
      if (op === '+') n = between(r, 1, cfg.maxN);
      else if (op === '-') { if (v < 2) continue; n = between(r, 1, Math.min(cfg.maxN, v - 1)); }
      else if (op === '*') { const lim = Math.min(cfg.maxN, Math.floor(cfg.maxV / Math.max(v, 1))); if (lim < 2) continue; n = between(r, 2, Math.min(lim, 6 + (cfg.maxN > 9 ? 3 : 0))); }
      else {
        const ds = []; for (let d = 2; d <= cfg.maxN; d++) if (v % d === 0 && v / d >= 1) ds.push(d);
        if (!ds.length) continue; n = pick(r, ds);
      }
      const nv = apply(op, n, v);
      if (nv === null || nv < 1 || nv > cfg.maxV) continue;
      return { op, n, v: nv };
    }
    return null;
  }

  function shuffle(r, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Sinh một đề: dựng lời giải trước, rồi khoét ô trống và thêm thẻ thừa. Kiểm lại bằng solve().
  function generateWith(cfg, r) {
    const kind = pick(r, cfg.kinds);
    // số bước: kiểu op mỗi bước một ô; kiểu num có ô đầu chuỗi nên ít hơn một bước
    const nSteps = kind === 'num' ? cfg.slots - 1 : cfg.slots;
    const start = between(r, 2, Math.min(12, cfg.maxN + 3));
    const sol = [];
    let v = start, prev = null;
    for (let i = 0; i < nSteps; i++) {
      const st = randomStep(r, v, cfg, prev);
      if (!st) return null;
      sol.push(st); v = st.v; prev = st.op;
    }
    if (new Set(sol.map(s => s.op)).size < Math.min(2, nSteps)) return null;   // cần ít nhất hai loại phép
    const target = v;
    const steps = [], tray = [];
    let lvStart = start;
    if (kind === 'op') {
      sol.forEach(s => { steps.push({ op: null, n: null }); tray.push(s.op + s.n); });
    } else if (kind === 'num') {
      lvStart = null; tray.push(String(start));
      sol.forEach(s => { steps.push({ op: s.op, n: null }); tray.push(String(s.n)); });
    } else {
      // mix: một số bước khoét cả phép, số khác chỉ khoét số; đủ cfg.slots ô
      let opSlots = 0;
      sol.forEach(s => {
        if (r() < 0.5) { steps.push({ op: null, n: null }); tray.push(s.op + s.n); opSlots++; }
        else { steps.push({ op: s.op, n: null }); tray.push(String(s.n)); }
      });
      if (!opSlots || opSlots === sol.length) return null;
    }
    // thẻ thừa: cùng loại với các ô có trên bàn
    const hasOp = steps.some(s => s.op == null), hasNum = lvStart == null || steps.some(s => s.op != null && s.n == null);
    for (let e = 0; e < cfg.extra; e++) {
      const asOp = hasOp && (!hasNum || r() < 0.5);
      if (asOp) { const o = pick(r, cfg.ops.split('')); tray.push(o + between(r, 2, Math.min(cfg.maxN, 9))); }
      else tray.push(String(between(r, 2, cfg.maxN)));
    }
    const lv = { start: lvStart, steps, tray: shuffle(r, tray), target };
    const s = solve(lv, cfg.maxSols + 1);
    if (s.count < 1 || s.count > cfg.maxSols) return null;
    // thứ tự phải có ý nghĩa: các cách xếp ra ít nhất 3 kết quả khác nhau,
    // và xếp nguyên theo khay không được trúng ngay
    if (s.results < (cfg.slots <= 2 ? 2 : 3)) return null;
    const naive = slotsOf(lv).map(() => undefined);
    const used = {};
    slotsOf(lv).forEach((sl, k) => {
      const c = lv.tray.find((t, j) => !used[j] && isOpCard(t) === (sl.kind === 'op') && (used[j] = true));
      naive[k] = c;
    });
    if (evaluate(lv, naive).win) return null;
    lv.sol = s.first;
    return lv;
  }

  // Đề của bậc n: tất định theo n (ai cũng gặp cùng một đề ở cùng một bậc).
  function levelAt(n) {
    const cfg = cfgAt(n);
    const r = rng(hashStr('toanhoc|' + GEN_VER + '|' + n));
    for (let t = 0; t < 4000; t++) {
      const lv = generateWith(cfg, r);
      if (lv) { lv.stage = n; return lv; }
    }
    return null;
  }

  // Gợi ý: một lời giải khớp với các ô đã đặt đúng (nếu có), nếu không thì lời giải đầu tiên.
  function hintFor(lv, fill) {
    const slots = slotsOf(lv);
    const pool = {};
    lv.tray.forEach(c => { pool[c] = (pool[c] || 0) + 1; });
    const keys = Object.keys(pool);
    const f = new Array(slots.length);
    let best = null, bestKeep = -1;
    (function rec(k) {
      if (k === slots.length) {
        if (!evaluate(lv, f).win) return;
        const keep = f.reduce((t, c, j) => t + (c === fill[j] ? 1 : 0), 0);
        if (keep > bestKeep) { bestKeep = keep; best = f.slice(); }
        return;
      }
      for (const c of keys) {
        if (!pool[c] || isOpCard(c) !== (slots[k].kind === 'op')) continue;
        pool[c]--; f[k] = c; rec(k + 1); pool[c]++;
      }
    })(0);
    if (!best) return null;
    const k = best.findIndex((c, j) => c !== fill[j]);
    return k < 0 ? null : { slot: k, card: best[k] };
  }

  const api = { MAXV, GEN_VER, isOpCard, label, opLabel, apply, slotsOf, evaluate, solve, cfgAt, levelAt, hintFor, rng, hashStr };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ToanHoc = api;
})(this);
