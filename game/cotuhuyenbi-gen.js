/* =========================================================
   CỔ TỰ HUYỀN BÍ — SINH MÀN CHƠI
   Cổ tự gồm các nét thẳng và cung tròn. Mỗi cổ tự được chia thành 2–4 mảnh đúng (các mảnh rời nhau, hợp lại
   đúng bằng cổ tự) cùng một số mảnh giả. Mảnh giả được kiểm tra bằng phép so khớp hình học (tịnh tiến, xoay,
   lật): không mảnh giả nào đặt vừa vào bất kỳ cổ tự nào của màn, nên lời giải là duy nhất.
   ========================================================= */
(function (root) {
  'use strict';
  const TOL = .6;
  const D = (Math.PI / 180);

  /* ---------- nét ---------- */
  const line = (a, b) => ({ t: 'l', a, b });
  const arc = (a, b, c) => ({ t: 'a', a, b, c });
  const pt = (x, y) => [x, y];
  const near = (p, q) => Math.abs(p[0] - q[0]) < TOL && Math.abs(p[1] - q[1]) < TOL;
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];

  /* ---------- 9 cổ tự: 3 vuông, 3 tròn, 3 tam giác ---------- */
  const GLYPHS = [];
  function def(shape, name, segs) { GLYPHS.push({ id: shape + GLYPHS.filter(g => g.shape === shape).length, shape, name, segs }); }

  (function squares() {
    const TL = pt(12, 12), TR = pt(88, 12), BR = pt(88, 88), BL = pt(12, 88);
    const Mt = pt(50, 12), Mr = pt(88, 50), Mb = pt(50, 88), Ml = pt(12, 50), C = pt(50, 50);
    const outer = () => [line(TL, Mt), line(Mt, TR), line(TR, Mr), line(Mr, BR), line(BR, Mb), line(Mb, BL), line(BL, Ml), line(Ml, TL)];
    def('square', 'vuông kim cương', outer().concat([line(Mt, Mr), line(Mr, Mb), line(Mb, Ml), line(Ml, Mt), line(Mt, C), line(Mr, C), line(Mb, C), line(Ml, C)]));
    def('square', 'vuông chéo', outer().concat([line(TL, C), line(TR, C), line(BR, C), line(BL, C), line(Mt, Mr), line(Mr, Mb), line(Mb, Ml), line(Ml, Mt)]));
    const i1 = pt(31, 31), i2 = pt(69, 31), i3 = pt(69, 69), i4 = pt(31, 69);
    def('square', 'vuông lồng', outer().concat([line(i1, i2), line(i2, i3), line(i3, i4), line(i4, i1), line(TL, i1), line(TR, i2), line(BR, i3), line(BL, i4)]));
  })();

  (function circles() {
    const C = pt(50, 50), R = 38, r = 19;
    const O = [], I = [];
    for (let k = 0; k < 8; k++) { const a = k * 45 * D; O.push(pt(50 + R * Math.cos(a), 50 + R * Math.sin(a))); I.push(pt(50 + r * Math.cos(a), 50 + r * Math.sin(a))); }
    const outer = () => O.map((p, k) => arc(p, O[(k + 1) % 8], C));
    def('circle', 'tròn nan hoa', outer().concat(O.map(p => line(C, p))));
    def('circle', 'tròn đồng tâm', outer().concat(I.map((p, k) => arc(p, I[(k + 1) % 8], C)), [0, 2, 4, 6].map(k => line(I[k], O[k]))));
    def('circle', 'tròn nội tiếp', outer().concat([1, 3, 5, 7].map((k, i, a) => line(O[k], O[a[(i + 1) % 4]])), [1, 3, 5, 7].map(k => line(C, O[k]))));
  })();

  (function triangles() {
    const A = pt(50, 12), B = pt(8, 86), Cc = pt(92, 86);
    const Dm = mid(A, B), E = mid(A, Cc), F = mid(B, Cc), G = pt(50, Dm[1]);
    const outer = () => [line(A, Dm), line(Dm, B), line(A, E), line(E, Cc), line(B, F), line(F, Cc)];
    def('triangle', 'tam giác trung tuyến', outer().concat([line(Dm, G), line(G, E), line(A, G), line(G, F), line(Dm, F), line(E, F)]));
    const H = pt((50 + 8 + 92) / 3, (12 + 86 + 86) / 3);
    def('triangle', 'tam giác sao', outer().concat([line(Dm, E), line(E, F), line(F, Dm), line(A, H), line(H, F), line(B, H), line(H, E), line(Cc, H), line(H, Dm)]));
    const sc = (p, k) => pt(H[0] + (p[0] - H[0]) * k, H[1] + (p[1] - H[1]) * k);
    const a2 = sc(A, .5), b2 = sc(B, .5), c2 = sc(Cc, .5);
    def('triangle', 'tam giác lồng', outer().concat([line(a2, b2), line(b2, c2), line(c2, a2), line(A, a2), line(B, b2), line(Cc, c2)]));
  })();

  /* ---------- so khớp hình học ---------- */
  // số phức: [re, im]
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const mul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
  const div = (p, q) => { const d = q[0] * q[0] + q[1] * q[1]; return [(p[0] * q[0] + p[1] * q[1]) / d, (p[1] * q[0] - p[0] * q[1]) / d]; };
  const conj = p => [p[0], -p[1]];
  const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function mapSeg(s, f) { const o = { t: s.t, a: f(s.a), b: f(s.b) }; if (s.c) o.c = f(s.c); return o; }
  function sameSeg(s, g) {
    if (s.t !== g.t) return false;
    if (s.t === 'a' && !near(s.c, g.c)) return false;
    return (near(s.a, g.a) && near(s.b, g.b)) || (near(s.a, g.b) && near(s.b, g.a));
  }
  function hasSeg(set, s) { for (const g of set) if (sameSeg(s, g)) return true; return false; }

  // piece có thể đặt khít vào trong glyph (qua tịnh tiến + xoay + lật) hay không
  function fitsInto(piece, glyph) {
    if (!piece.length) return true;
    const s0 = piece[0];
    for (const reflect of [false, true]) {
      const F = p => (reflect ? conj(p) : p);
      const sa = F(s0.a), sb = F(s0.b), L0 = len(sa, sb);
      for (const g of glyph) {
        if (g.t !== s0.t || Math.abs(len(g.a, g.b) - L0) > TOL) continue;
        for (const swap of [false, true]) {
          const ga = swap ? g.b : g.a, gb = swap ? g.a : g.b;
          // phép biến đổi: z → ga + (gb-ga)/(sb-sa) * (z - sa)
          const k = div(sub(gb, ga), sub(sb, sa));
          const T = p => add(ga, mul(k, sub(F(p), sa)));
          let ok = true;
          for (const s of piece) { if (!hasSeg(glyph, mapSeg(s, T))) { ok = false; break; } }
          if (ok) return true;
        }
      }
    }
    return false;
  }
  function congruent(a, b) { return a.length === b.length && fitsInto(a, b); }

  /* ---------- chia cổ tự thành các mảnh liền ---------- */
  function adjacent(s, t) { return near(s.a, t.a) || near(s.a, t.b) || near(s.b, t.a) || near(s.b, t.b); }
  function partition(segs, K, rnd) {
    const n = segs.length, adj = segs.map((s, i) => segs.map((t, j) => i !== j && adjacent(s, t)));
    for (let attempt = 0; attempt < 400; attempt++) {
      const owner = new Array(n).fill(-1), sizes = new Array(K).fill(0);
      const idx = shuffle([...Array(n).keys()], rnd);
      for (let k = 0; k < K; k++) { owner[idx[k]] = k; sizes[k] = 1; }
      let left = n - K, stuck = false;
      while (left > 0 && !stuck) {
        const order = shuffle([...Array(K).keys()], rnd).sort((a, b) => sizes[a] - sizes[b]);
        let grown = false;
        for (const k of order) {
          const cands = [];
          for (let i = 0; i < n; i++) if (owner[i] === -1) { for (let j = 0; j < n; j++) if (owner[j] === k && adj[i][j]) { cands.push(i); break; } }
          if (cands.length) { const i = cands[Math.floor(rnd() * cands.length)]; owner[i] = k; sizes[k]++; left--; grown = true; break; }
        }
        if (!grown) stuck = true;
      }
      if (stuck) continue;
      if (Math.min(...sizes) < 2) continue;
      if (Math.max(...sizes) > Math.ceil(n / K) * 1.8) continue;
      const parts = [];
      for (let k = 0; k < K; k++) parts.push(segs.filter((_, i) => owner[i] === k));
      return parts;
    }
    return null;
  }

  function shuffle(a, rnd) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function nodesOf(segs) {
    const out = [];
    const add1 = p => { if (!out.some(q => near(p, q))) out.push(p); };
    for (const s of segs) { add1(s.a); add1(s.b); }
    return out;
  }

  /* ---------- mảnh giả ---------- */
  function mutate(piece, nodes, rnd) {
    const out = piece.map(s => ({ ...s }));
    const m = rnd() < .4 && out.length > 2 ? 2 : 1;
    const picked = shuffle([...Array(out.length).keys()], rnd).slice(0, m);
    for (const i of picked) {
      const s = out[i], keep = rnd() < .5 ? s.a : s.b;
      for (let tries = 0; tries < 12; tries++) {
        const n = nodes[Math.floor(rnd() * nodes.length)];
        if (len(n, keep) < 4 || near(n, s.a) && near(n, s.b)) continue;
        const cand = line(keep, n);
        if (hasSeg(piece, cand) || hasSeg(out, cand)) continue;
        out[i] = cand; break;
      }
    }
    return out;
  }

  /* ---------- màn chơi ---------- */
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function params(n) {
    return {
      glyphs: n <= 2 ? 1 : n <= 6 ? 2 : 3,
      kmax: n <= 2 ? 2 : n <= 5 ? 3 : 4,
      decoys: Math.min(6, 1 + Math.floor((n - 1) / 2)),          // tối đa 6 mảnh giả cho mỗi cổ tự
      rotStep: n < 3 ? 90 : n < 6 ? 45 : 15,
      flip: n >= 4
    };
  }

  function buildLevel(n, rnd) {
    rnd = rnd || Math.random;
    const P = params(n);
    for (let attempt = 0; attempt < 60; attempt++) {
      const shapes = shuffle(['square', 'circle', 'triangle'], rnd).slice(0, P.glyphs);
      const glyphs = shapes.map(sh => {
        const opts = GLYPHS.filter(g => g.shape === sh);
        const g = n <= 2 ? opts[0] : opts[Math.floor(rnd() * opts.length)];
        const kmin = 2;
        const k = n <= 2 ? 2 : kmin + Math.floor(rnd() * (P.kmax - kmin + 1) + (n > 8 && rnd() < .35 ? 1 : 0));
        return { def: g, k: Math.min(k, P.kmax) };
      });
      const targets = glyphs.map(g => g.def.segs);
      const cards = []; let ok = true;
      glyphs.forEach((g, gi) => {
        const parts = partition(g.def.segs, g.k, rnd);
        if (!parts) { ok = false; return; }
        parts.forEach(p => cards.push({ segs: p, correct: true, glyph: gi }));
      });
      if (!ok) continue;
      const avg = cards.reduce((s, c) => s + c.segs.length, 0) / cards.length;
      const want = P.decoys * glyphs.length, decoys = [];
      const others = GLYPHS.filter(g => !glyphs.some(x => x.def === g));
      for (let tries = 0; tries < 800 && decoys.length < want; tries++) {
        let cand;
        if (rnd() < .65) {                                  // mảnh đúng bị bóp méo một vài nét
          const real = cards.filter(c => c.correct);
          const src = real[Math.floor(rnd() * real.length)];
          cand = mutate(src.segs, nodesOf(glyphs[src.glyph].def.segs), rnd);
        } else {                                            // mảnh lấy từ cổ tự khác
          const og = others[Math.floor(rnd() * others.length)];
          const parts = partition(og.segs, 2 + Math.floor(rnd() * 3), rnd);
          if (!parts) continue;
          cand = parts[Math.floor(rnd() * parts.length)];
        }
        if (cand.length < 2 || Math.abs(cand.length - avg) > 3) continue;
        if (targets.some(t => fitsInto(cand, t))) continue;                       // phải không khớp cổ tự nào
        if (cards.some(c => congruent(c.segs, cand))) continue;                   // không trùng mảnh nào khác
        decoys.push(cand); cards.push({ segs: cand, correct: false, glyph: -1 });
      }
      if (decoys.length < want) continue;
      cards.forEach(c => {
        const steps = 360 / P.rotStep;
        c.rot = Math.floor(rnd() * steps) * P.rotStep;
        if (n <= 2 && c.rot === 0 && rnd() < .7) c.rot = 90 * (1 + Math.floor(rnd() * 3));
        c.flip = P.flip && rnd() < .5;
      });
      shuffle(cards, rnd);
      const total = cards.length;
      const time = Math.round((20 + total * 2.4) * (1 - Math.min(.22, (n - 1) * .018)));
      return { n, glyphs: glyphs.map(g => ({ id: g.def.id, shape: g.def.shape, segs: g.def.segs, k: g.k })), cards, time };
    }
    throw new Error('không tạo được màn ' + n);
  }

  // kiểm tra độc lập: các mảnh đúng chia đúng cổ tự và không mảnh giả nào khớp
  function verify(level) {
    const errs = [];
    level.glyphs.forEach((g, gi) => {
      const mine = level.cards.filter(c => c.correct && c.glyph === gi);
      let count = 0;
      for (const c of mine) { count += c.segs.length; for (const s of c.segs) if (!hasSeg(g.segs, s)) errs.push('mảnh đúng có nét lạ'); }
      if (count !== g.segs.length) errs.push('mảnh đúng không phủ kín cổ tự ' + g.id);
    });
    for (const c of level.cards) if (!c.correct) for (const g of level.glyphs) if (fitsInto(c.segs, g.segs)) errs.push('mảnh giả khớp cổ tự ' + g.id);
    return errs;
  }

  const api = { GLYPHS, buildLevel, params, verify, fitsInto, mulberry, hasSeg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GlyphGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
