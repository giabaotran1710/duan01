// Trò chơi toán học - lõi luật: tính chuỗi phép tính, đếm lời giải, sinh đề từ lời giải.
// Dùng chung cho game (trình duyệt) và tool/toanhoc-check.js (node).
//
// Một đề: { start, steps, tray, target, sol }
//   start: số đầu chuỗi, hoặc null nếu đầu chuỗi là ô trống nhận thẻ số
//   steps: [{op, n}] - op null: ô trống nhận thẻ phép tính (vd "+3");
//                       op có sẵn ('+','-','*','/'), n null: ô trống nhận thẻ số
//                       op và n đều có: bước khắc sẵn
//   tray: thẻ trong khay, chuỗi: thẻ phép tính "+3" "-2" "*4" "/2", thẻ số "7"
// Tính theo thứ tự phép tính như môn toán: nhân chia trước, cộng trừ sau (9 − 6 × 2 = −3).
// Chia không hết hoặc có số quá MAXV thì chuỗi đứt. Đáp án luôn là số không âm.
(function (root) {
  'use strict';
  const MAXV = 9999;
  const GEN_VER = 3;

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

  // Tính chuỗi theo thứ tự phép tính. steps: [{op, n}] (op hoặc n thiếu thì dừng tại đó).
  // vals[i]: giá trị của biểu thức tính tới bước i (có thể âm khi đang dở dang), undefined nếu chưa tính được.
  // broke: chỉ số bước làm đứt chuỗi (chia không hết: why 'div', term là số bị chia; quá lớn: why 'big').
  function calc(start, steps) {
    const vals = [];
    let broke = -1, why = '', brokeTerm;
    let total = 0, sign = 1, term = start, stop = start === undefined;
    steps.forEach((st, i) => {
      if (stop || st.op == null || st.n == null) { stop = true; vals.push(undefined); return; }
      const n = st.n;
      if (st.op === '+') { total += sign * term; sign = 1; term = n; }
      else if (st.op === '-') { total += sign * term; sign = -1; term = n; }
      else if (st.op === '*') term *= n;
      else if (st.op === '/') {
        if (n === 0 || term % n !== 0) { broke = i; why = 'div'; brokeTerm = term; stop = true; vals.push(undefined); return; }
        term /= n;
      }
      const v = total + sign * term;
      if (term > MAXV || Math.abs(v) > MAXV) { broke = i; why = 'big'; stop = true; vals.push(undefined); return; }
      vals.push(v);
    });
    return { vals, broke, why, brokeTerm };
  }

  // fill: mảng thẻ theo thứ tự ô trống (undefined = chưa đặt).
  // Trả về {vals, broke, why, brokeTerm, full, value, win}
  function evaluate(lv, fill) {
    const slots = slotsOf(lv);
    const at = {};
    slots.forEach((s, k) => { at[s.pos] = fill[k]; });
    const start = lv.start != null ? lv.start : (at[-1] != null ? Number(at[-1]) : undefined);
    const steps = lv.steps.map((st, i) => {
      let op = st.op, n = st.n;
      if (op == null) { const c = at[i]; if (c != null) { op = c[0]; n = Number(c.slice(1)); } }
      else if (n == null && at[i] != null) n = Number(at[i]);
      return { op, n };
    });
    const r = calc(start, steps);
    const full = slots.every((s, k) => fill[k] != null);
    const value = r.broke < 0 && full ? r.vals[r.vals.length - 1] : undefined;
    return { vals: r.vals, broke: r.broke, why: r.why, brokeTerm: r.brokeTerm, full, value, win: value === lv.target };
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

  // Ba mức đề. slots: [ít nhất, nhiều nhất] ô trống; decoys: số thẻ nhiễu; maxN: số lớn nhất trên thẻ;
  // maxV: giá trị dở dang lớn nhất; maxSols: số lời giải tối đa (kể cả thẻ nhiễu); kinds: kiểu đề có thể ra.
  // Nhãn thật của đề không lấy từ mức này mà từ phép đo analyze/rate bên dưới.
  const TIERS = {
    de:     { slots: [2, 3], decoys: [0, 1], ops: '+-*',  maxN: 6,  maxV: 40,  maxSols: 2, kinds: ['op', 'op', 'num'] },
    thuong: { slots: [3, 4], decoys: [1, 2], ops: '+-*/', maxN: 9,  maxV: 100, maxSols: 2, kinds: ['op', 'num', 'mix'] },
    kho:    { slots: [5, 6], decoys: [2, 3], ops: '+-*/', maxN: 12, maxV: 300, maxSols: 1, kinds: ['mix', 'num', 'op'] }
  };
  const TIER_NAME = { de: 'Dễ', thuong: 'Thường', kho: 'Khó' };

  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));

  // Chọn một bước hợp lệ nối thêm vào sol: mọi giá trị dở dang không âm, không vượt maxV,
  // chia phải hết, không có bước vô nghĩa như +0, ×1, ÷1.
  function randomStep(r, start, sol, cfg) {
    const prev = sol.length ? sol[sol.length - 1].op : null;
    for (let t = 0; t < 40; t++) {
      const op = pick(r, cfg.ops.split(''));
      if (op === prev && r() < 0.6) continue;     // tránh lặp một phép liên tiếp
      let n;
      if (op === '+' || op === '-') n = between(r, 1, cfg.maxN);
      else if (op === '*') n = between(r, 2, Math.min(cfg.maxN, 6 + (cfg.maxN > 9 ? 3 : 0)));
      else n = between(r, 2, cfg.maxN);
      const c = calc(start, sol.concat([{ op, n }]));
      const v = c.vals[c.vals.length - 1];
      if (c.broke >= 0 || v === undefined || v < 0 || v > cfg.maxV) continue;
      return { op, n, v };
    }
    return null;
  }

  function shuffle(r, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Tính chuỗi lần lượt từ trái sang phải, bỏ qua thứ tự ưu tiên: cách tính "ngây thơ" mà người chơi hay nhầm.
  function ltrValue(lv, fill) {
    const slots = slotsOf(lv), at = {};
    slots.forEach((s, k) => { at[s.pos] = fill[k]; });
    let v = lv.start != null ? lv.start : Number(at[-1]);
    for (let i = 0; i < lv.steps.length; i++) {
      let op = lv.steps[i].op, n = lv.steps[i].n;
      if (op == null) { const c = at[i]; op = c[0]; n = Number(c.slice(1)); }
      else if (n == null) n = Number(at[i]);
      v = apply(op, n, v);
      if (v === null) return null;
    }
    return v;
  }

  // Duyệt mọi cách xếp thẻ để đo đề:
  //  space: tổng số cách xếp khác nhau; sols: số cách đúng; near: số cách ra sát đáp án (lệch ≤ 2) nhưng sai;
  //  trap: số cách sai theo luật nhân chia trước nhưng lại đúng nếu tính lần lượt từ trái sang phải (bẫy cho người hay nhầm).
  function analyze(lv, capSols) {
    const slots = slotsOf(lv);
    const pool = {};
    lv.tray.forEach(c => { pool[c] = (pool[c] || 0) + 1; });
    const keys = Object.keys(pool), fill = new Array(slots.length);
    let space = 0, sols = 0, near = 0, trap = 0, first = null;
    (function rec(k) {
      if (capSols && sols > capSols) return;
      if (k === slots.length) {
        space++;
        const r = evaluate(lv, fill);
        if (r.win) { sols++; if (!first) first = fill.slice(); return; }
        if (r.value !== undefined && Math.abs(r.value - lv.target) <= 2) near++;
        if (ltrValue(lv, fill) === lv.target) trap++;
        return;
      }
      for (const c of keys) {
        if (!pool[c] || isOpCard(c) !== (slots[k].kind === 'op')) continue;
        pool[c]--; fill[k] = c; rec(k + 1); pool[c]++;
      }
    })(0);
    return { space, sols, near, trap, first };
  }

  // Điểm độ khó của đề: log2(số cách xếp) cộng thêm cho bẫy, cho cách xếp sát đáp án và cho phép chia.
  function rate(lv, an) {
    const div = lv.steps.some(st => st.op === '/') || lv.tray.some(c => c[0] === '/');
    return Math.log2(Math.max(an.space, 1)) + (an.trap > 0 ? 1 : 0) + Math.min(an.near, 6) * 0.25 + (div ? 0.5 : 0);
  }
  // Ngưỡng nhãn, chỉnh theo phân bố đo được ở tool/toanhoc-check.js.
  const CUT = { de: 4.5, thuong: 9 };
  function labelOf(score) { return score < CUT.de ? 'de' : score < CUT.thuong ? 'thuong' : 'kho'; }

  // Ứng viên thẻ nhiễu: thẻ trông giống thẻ thật. Phép: cùng số nhưng đổi dấu (+4 / −4, ×3 / ÷3),
  // cùng phép lệch một đơn vị (×6 / ×7), cùng số khác phép (+3 / ×3). Số: lệch 1-2 so với số thật.
  function decoyCandidates(lv, cfg) {
    const have = new Set(lv.tray);
    const out = new Set();
    const OPP = { '+': '-', '-': '+', '*': '/', '/': '*' };
    const lo = o => (o === '*' || o === '/') ? 2 : 1;
    lv.tray.forEach(c => {
      if (isOpCard(c)) {
        const o = c[0], n = Number(c.slice(1));
        out.add(OPP[o] + n);
        [n - 1, n + 1].forEach(m => { if (m >= lo(o) && m <= cfg.maxN + 2) out.add(o + m); });
        cfg.ops.split('').forEach(o2 => { if (o2 !== o && n >= lo(o2)) out.add(o2 + n); });
      } else {
        const n = Number(c);
        [n - 2, n - 1, n + 1, n + 2].forEach(m => { if (m >= 1 && m <= cfg.maxN + 2) out.add(String(m)); });
      }
    });
    return [...out].filter(c => !have.has(c) && (!isOpCard(c) || cfg.ops.includes(c[0])));
  }

  // Dựng một đề thô (chưa có thẻ nhiễu): dựng lời giải trước rồi khoét ô trống.
  function buildBase(cfg, r) {
    const kind = pick(r, cfg.kinds);
    const slotsN = between(r, cfg.slots[0], cfg.slots[1]);
    const nSteps = kind === 'num' ? slotsN - 1 : slotsN;   // kiểu num có thêm ô đầu chuỗi
    const start = between(r, 2, Math.min(12, cfg.maxN + 3));
    const sol = [];
    for (let i = 0; i < nSteps; i++) {
      const st = randomStep(r, start, sol, cfg);
      if (!st) return null;
      sol.push(st);
    }
    const target = sol[sol.length - 1].v;
    if (target < 1) return null;
    if (new Set(sol.map(s => s.op)).size < Math.min(2, nSteps)) return null;   // cần ít nhất hai loại phép
    const steps = [], tray = [];
    let lvStart = start;
    if (kind === 'op') {
      sol.forEach(s => { steps.push({ op: null, n: null }); tray.push(s.op + s.n); });
    } else if (kind === 'num') {
      lvStart = null; tray.push(String(start));
      sol.forEach(s => { steps.push({ op: s.op, n: null }); tray.push(String(s.n)); });
    } else {
      let opSlots = 0;
      sol.forEach(s => {
        if (r() < 0.5) { steps.push({ op: null, n: null }); tray.push(s.op + s.n); opSlots++; }
        else { steps.push({ op: s.op, n: null }); tray.push(String(s.n)); }
      });
      if (!opSlots || opSlots === sol.length) return null;
    }
    return { start: lvStart, steps, tray, target };
  }

  // Sinh một đề thuộc mức `tier`: dựng đề thô, rồi thêm thẻ nhiễu. Mỗi thẻ nhiễu chọn trong vài ứng viên,
  // lấy thẻ làm nhiều cách xếp sai sát đáp án hoặc trúng bẫy nhất, nhưng không được tạo thêm lời giải.
  function generateOnce(tier, r) {
    const cfg = TIERS[tier];
    const lv = buildBase(cfg, r);
    if (!lv) return null;
    const nd = between(r, cfg.decoys[0], cfg.decoys[1]);
    const kindsPresent = new Set(slotsOf(lv).map(sl => sl.kind));
    let an = analyze(lv, cfg.maxSols);
    if (an.sols < 1 || an.sols > cfg.maxSols) return null;
    for (let d = 0; d < nd; d++) {
      const cands = shuffle(r, decoyCandidates(lv, cfg)).filter(c => kindsPresent.has(isOpCard(c) ? 'op' : 'num')).slice(0, 8);
      let best = null, bestAn = null, bestScore = -1;
      for (const c of cands) {
        lv.tray.push(c);
        const a2 = analyze(lv, cfg.maxSols);
        lv.tray.pop();
        if (a2.sols < 1 || a2.sols > cfg.maxSols) continue;
        const sc = a2.near + 4 * a2.trap + r();
        if (sc > bestScore) { best = c; bestAn = a2; bestScore = sc; }
      }
      if (!best) break;
      lv.tray.push(best); an = bestAn;
    }
    lv.decoys = lv.tray.length - slotsOf(lv).length;
    lv.tray = shuffle(r, lv.tray);
    // xếp nguyên theo khay không được trúng ngay
    const used = {}, naive = slotsOf(lv).map(sl => {
      const j = lv.tray.findIndex((t, i) => !used[i] && isOpCard(t) === (sl.kind === 'op'));
      used[j] = true; return lv.tray[j];
    });
    if (evaluate(lv, naive).win) return null;
    lv.sol = an.first;
    lv.score = rate(lv, an);
    lv.tier = labelOf(lv.score);
    lv.stats = { space: an.space, near: an.near, trap: an.trap };
    return lv;
  }

  // Sinh đề thuộc nhãn `tier` ('de' | 'thuong' | 'kho'); `seed` cố định thì ra cùng một đề.
  // Nhãn gắn lên đề (lv.tier) là nhãn đo được từ chính đề đó, khớp với mức yêu cầu.
  function generate(tier, seed) {
    const r = rng(seed == null ? (Math.random() * 4294967296) >>> 0 : seed);
    for (let t = 0; t < 600; t++) {
      const lv = generateOnce(tier, r);
      if (lv && lv.tier === tier) return lv;
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

  const api = { MAXV, GEN_VER, TIERS, TIER_NAME, isOpCard, label, opLabel, apply, slotsOf, calc, evaluate, solve, analyze, rate, generate, hintFor, rng, hashStr };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ToanHoc = api;
})(this);
