/* Võ đài thẻ: AI. Không nhìn trộm bài: chỉ nhận góc nhìn của bên mình (VDT.viewFor), đoán phần bị che rồi thử phần còn lại của vòng.
 *
 * Mỗi giai đoạn của mình, AI sinh nhiều "kế hoạch" (chuỗi quân/mưu đặt ra), với mỗi kế hoạch dựng vài thế giới giả định
 * (tay bài và Mưu úp của đối thủ bốc từ các lá chưa lộ), chạy nốt vòng bằng chính bộ luật thật rồi chấm điểm. Chọn kế hoạch tốt nhất trung bình.
 *   Dễ: kế hoạch ngẫu nhiên, hay bỏ phí Quân lệnh.   Vừa: 10 kế hoạch × 2 thế giới.   Khó: 36 × 5.   Rất khó: 60 × 9 và đoán làn đối thủ hay úp Mưu theo thói quen.
 * Không đụng DOM nên chạy được cả trong Node để đo cân bằng. */
(function (root) {
  'use strict';
  const V = root.VDT || require('./vodaithe-core.js');
  const CARDS = V.CARDS, LANES = V.LANES;
  const LEVELS = [{ N: 1, M: 0, lazy: 0.3 }, { N: 10, M: 2, lazy: 0.1 }, { N: 36, M: 5, lazy: 0.05 }, { N: 60, M: 9, lazy: 0.03 }];

  const R = seed => ({ seed: (seed >>> 0) || 7 });
  const rnd = r => V.rnd(r);

  function weight(st, a, r) {
    const p = st.turn, o = 1 - p, d = CARDS[a.k];
    const mine = st.lanes[a.lane][p], theirs = st.lanes[a.lane][o];
    let w = 0.4 + rnd(r) * 1.6;
    if (a.t === 'unit') {
      if (p === st.atk) w *= 1 + (V.SLOTS - V.used(theirs)) * 0.8;
      else w *= 1 + theirs.reduce((n, u) => n + V.atkOf(st, u), 0) * 0.5 + (theirs.length ? 1 : 0);
      w *= 0.6 + (d.a * 1.2 + d.h * 0.8) / (d.c + 1);
    } else {
      w *= 0.8 * (1 + mine.length * 0.5 + theirs.length * 0.5);
      if (a.k === 'nghibinh') w *= 0.35;
    }
    return w;
  }

  // Sinh và áp luôn một giai đoạn cho st.turn (chỉnh tại chỗ). Trả về các hành động đã chọn, không kể "end".
  function autoPhase(st, r, lazy) {
    const acts = [];
    for (let guard = 0; guard < 24; guard++) {
      const L = V.legal(st).filter(a => a.t !== 'end');
      if (!L.length || rnd(r) < lazy) break;
      const ws = L.map(a => weight(st, a, r));
      let sum = 0; for (const x of ws) sum += x;
      let t = rnd(r) * sum, pick = L[L.length - 1];
      for (let i = 0; i < L.length; i++) { t -= ws[i]; if (t <= 0) { pick = L[i]; break; } }
      V.apply(st, pick); acts.push(pick);
    }
    return acts;
  }

  function fieldValue(st, p) {
    let v = 0;
    for (let l = 0; l < LANES; l++) for (const u of st.lanes[l][p]) v += (u.a * 1.5 + u.hp) * (u.sz === 2 ? 0.9 : 1);
    return v;
  }
  function score(st, me) {
    const o = 1 - me;
    if (st.winner === me) return 1e4;
    if (st.winner === o) return -1e4;
    return (st.hp[me] - st.hp[o]) * 10 + fieldValue(st, me) - fieldValue(st, o) + (st.hand[me].length - st.hand[o].length) * 0.5 + (st.orders[me] - st.orders[o]) * 0.8;
  }

  function finishRound(st, r, lazy) {
    const r0 = st.round;
    for (let g = 0; g < 8 && st.winner === null && st.round === r0; g++) {
      autoPhase(st, r, lazy);
      V.apply(st, { t: 'end' });
    }
  }

  // Dựng một thế giới khả dĩ: điền các lá bị che của đối thủ (và thứ tự chồng bài của mình) từ các lá chưa lộ.
  function determinize(view, me, r, mem) {
    const w = V.clone(view), o = 1 - me;
    const pool = (visibleKinds) => {
      const cnt = {};
      for (const k of V.DECK_LIST) cnt[k] = (cnt[k] || 0) + 1;
      for (const k of visibleKinds) if (cnt[k] > 0) cnt[k]--;
      const a = [];
      for (const k in cnt) for (let i = 0; i < cnt[k]; i++) a.push(k);
      return V.shuffle(r, a);
    };
    const pull = a => a.length ? a.pop() : V.DECK_LIST[Math.floor(rnd(r) * V.DECK_LIST.length)];
    // Đối thủ: lá đã thấy = mộ + Lính trên sân (không tính quân phụ) + lá đã lộ trên tay.
    const seenO = [];
    for (const c of w.disc[o]) seenO.push(c.k);
    for (let l = 0; l < LANES; l++) for (const u of w.lanes[l][o]) if (!u.tok) seenO.push(u.k);
    for (const c of w.hand[o]) if (c.k) seenO.push(c.k);
    const poolO = pool(seenO);
    for (const c of w.hand[o]) if (!c.k) c.k = pull(poolO);
    for (const t of w.traps[o]) {
      t.k = pull(poolO);
      t.lane = mem && mem.lanes ? pickLane(mem.lanes, r) : Math.floor(rnd(r) * LANES);
    }
    for (const c of w.deck[o]) c.k = pull(poolO);
    // Mình: chồng bài thật không biết, chỉ biết các lá chưa ra.
    const seenM = [];
    for (const c of w.disc[me]) seenM.push(c.k);
    for (const c of w.hand[me]) seenM.push(c.k);
    for (const t of w.traps[me]) seenM.push(t.k);
    for (let l = 0; l < LANES; l++) for (const u of w.lanes[l][me]) if (!u.tok) seenM.push(u.k);
    const poolM = pool(seenM);
    for (const c of w.deck[me]) c.k = pull(poolM);
    return w;
  }
  function pickLane(counts, r) {
    let sum = 0; for (const c of counts) sum += c + 1;
    let t = rnd(r) * sum;
    for (let i = 0; i < counts.length; i++) { t -= counts[i] + 1; if (t <= 0) return i; }
    return counts.length - 1;
  }

  function create(level, seed) {
    const cfg = LEVELS[Math.max(0, Math.min(3, level | 0))];
    const r = R(seed || (Date.now() & 0x7fffffff));
    const mem = { lanes: [0, 0, 0] };
    return {
      level, mem,
      // Ghi nhớ nơi đối thủ hay úp Mưu (chỉ dùng ở mức Rất khó).
      observe(log, me) { if (level < 3) return; for (const e of log) if (e.e === 'flip' && e.p !== me && e.lane >= 0) mem.lanes[e.lane]++; },
      // Trả về chuỗi hành động cho giai đoạn hiện tại của bên đến lượt, kết thúc bằng {t:'end'}.
      plan(view) {
        const me = view.turn;
        const cands = [], seen = {};
        for (let i = 0; i < cfg.N; i++) {
          const w = V.clone(view);
          const acts = autoPhase(w, r, (i === 0 && cfg.N > 1) ? 1 : cfg.lazy * (0.5 + rnd(r)));
          const key = acts.map(a => a.id + ':' + a.lane).join(',');
          if (seen[key]) continue; seen[key] = 1;
          cands.push(acts);
        }
        let best = cands[0];
        if (cfg.M > 0 && cands.length > 1) {
          let bestScore = -Infinity;
          for (const acts of cands) {
            let total = 0;
            for (let m = 0; m < cfg.M; m++) {
              const w = determinize(view, me, r, level === 3 ? mem : null);
              for (const a of acts) V.apply(w, a);
              V.apply(w, { t: 'end' });
              finishRound(w, r, 0.08);
              total += score(w, me);
            }
            const avg = total / cfg.M;
            if (avg > bestScore) { bestScore = avg; best = acts; }
          }
        }
        return best.concat([{ t: 'end' }]);
      }
    };
  }

  const api = { create, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VDTAI = api;
})(typeof window !== 'undefined' ? window : globalThis);
