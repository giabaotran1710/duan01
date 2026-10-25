/* Cờ Gánh: luật chơi + AI. Dùng được như script thường, Web Worker, hoặc require() trong Node.
 *
 * Bàn 5x5 (25 điểm). Đường chéo chỉ đi qua các điểm có (hàng + cột) chẵn. Mỗi bên 8 quân, đi 1 bước theo đường nối.
 *  - GÁNH : đi vào giữa hai quân đối phương nằm đối diện nhau trên một đường → cả hai đổi sang màu mình.
 *  - CHẸT : đi tới đầu một đường có hai quân đối phương liền nhau và đầu kia là quân mình → cả hai đổi màu.
 *  - VÂY  : sau nước đi, nhóm quân đối phương liền nhau mà không còn nước đi nào (bị chặn kín) → cả nhóm đổi màu.
 *  - MỞ   : nếu nước đi của một bên để lại chỗ trống mà đối phương có thể đi vào đó để gánh/chẹt, đối phương BẮT BUỘC
 *           phải đi vào chỗ đó để ăn.
 *  - Thắng khi đối phương hết quân hoặc hết nước đi. Hòa khi 40 nước liên tiếp không có quân nào đổi màu.
 */
(function (root) {
  'use strict';
  const N = 5, NN = 25, DRAW_PLIES = 40;
  // hướng: d và d^1 là đối nhau
  const DR = [-1, 1, 0, 0, -1, 1, -1, 1], DC = [0, 0, -1, 1, -1, 1, 1, -1];
  const NB = new Int8Array(NN * 8).fill(-1);   // láng giềng theo hướng (nếu có đường nối)
  const ADJ = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = r * N + c, list = [];
    for (let d = 0; d < 8; d++) {
      if (d >= 4 && (r + c) % 2 !== 0) continue;   // đường chéo chỉ qua điểm chẵn
      const nr = r + DR[d], nc = c + DC[d];
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      NB[i * 8 + d] = nr * N + nc;
      list.push(nr * N + nc);
    }
    ADJ.push(list);
  }

  function initialBoard() {
    const b = new Int8Array(NN);
    // 1 = Đỏ (đi trước, phía trên), 2 = Xanh (phía dưới)
    for (let c = 0; c < 5; c++) { b[c] = 1; b[20 + c] = 2; }
    b[5] = 1; b[9] = 1; b[10] = 1;      // hàng 1: hai đầu; hàng 2: đầu trái
    b[15] = 2; b[19] = 2; b[14] = 2;    // hàng 3: hai đầu; hàng 2: đầu phải
    return b;
  }

  // các điểm bị gánh/chẹt khi p đặt quân vào `to` (bàn đã có quân ở `to`); chưa lật
  function captureList(b, to, p, out) {
    const o = 3 - p;
    out.length = 0;
    for (let d = 0; d < 8; d++) {
      const a = NB[to * 8 + d];
      if (a < 0 || b[a] !== o) continue;
      // GÁNH (xét một lần cho mỗi cặp đối nhau)
      if ((d & 1) === 0) {
        const z = NB[to * 8 + (d ^ 1)];
        if (z >= 0 && b[z] === o) { out.push(a, z); }
      }
      // CHẸT: to, a, a2 (đối phương), a3 (quân mình)
      const a2 = NB[a * 8 + d];
      if (a2 >= 0 && b[a2] === o) {
        const a3 = NB[a2 * 8 + d];
        if (a3 >= 0 && b[a3] === p) { out.push(a, a2); }
      }
    }
    return out.length > 0;
  }

  // VÂY: nhóm quân của `o` liền nhau, không còn ô trống kề → đổi sang p
  const seen = new Int8Array(NN), stack = new Int8Array(NN), grp = new Int8Array(NN);
  function surround(b, p, flips) {
    const o = 3 - p;
    seen.fill(0);
    for (let s = 0; s < NN; s++) {
      if (b[s] !== o || seen[s]) continue;
      let top = 0, n = 0, free = false;
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const x = stack[--top];
        grp[n++] = x;
        const nbs = ADJ[x];
        for (let k = 0; k < nbs.length; k++) {
          const y = nbs[k];
          if (b[y] === 0) free = true;
          else if (b[y] === o && !seen[y]) { seen[y] = 1; stack[top++] = y; }
        }
      }
      if (!free) for (let k = 0; k < n; k++) flips.push(grp[k]);
    }
  }

  const tmpCap = [];
  // có nước nào của p đi vào điểm trống `x` mà gánh/chẹt được không (dùng cho luật MỞ)
  function canCaptureInto(b, x, p) {
    const nbs = ADJ[x];
    for (let k = 0; k < nbs.length; k++) {
      const f = nbs[k];
      if (b[f] !== p) continue;
      b[f] = 0; b[x] = p;
      const ok = captureList(b, x, p, tmpCap);
      b[x] = 0; b[f] = p;
      if (ok) return true;
    }
    return false;
  }

  // trạng thái: { b, side, forced, noCap }
  function newGame() { return { b: initialBoard(), side: 1, forced: -1, noCap: 0 }; }
  function cloneState(s) { return { b: Int8Array.from(s.b), side: s.side, forced: s.forced, noCap: s.noCap }; }

  // danh sách nước đi hợp lệ: mảng [from, to]
  function legalMoves(s) {
    const b = s.b, p = s.side, out = [];
    if (s.forced >= 0) {
      const x = s.forced;
      if (b[x] === 0) {
        const nbs = ADJ[x];
        for (let k = 0; k < nbs.length; k++) {
          const f = nbs[k];
          if (b[f] !== p) continue;
          b[f] = 0; b[x] = p;
          const ok = captureList(b, x, p, tmpCap);
          b[x] = 0; b[f] = p;
          if (ok) out.push([f, x]);
        }
        if (out.length) return out;   // bắt buộc ăn vào chỗ vừa mở
      }
    }
    for (let f = 0; f < NN; f++) {
      if (b[f] !== p) continue;
      const nbs = ADJ[f];
      for (let k = 0; k < nbs.length; k++) if (b[nbs[k]] === 0) out.push([f, nbs[k]]);
    }
    return out;
  }

  // thực hiện nước đi (sửa tại chỗ); trả về { flips: [...] } để hiển thị/hoàn tác
  function applyMove(s, from, to) {
    const b = s.b, p = s.side, o = 3 - p;
    b[from] = 0; b[to] = p;
    const flips = [];
    if (captureList(b, to, p, tmpCap)) for (const x of tmpCap) if (b[x] === o) { b[x] = p; flips.push(x); }
    const sv = [];
    surround(b, p, sv);
    for (const x of sv) { b[x] = p; flips.push(x); }
    s.noCap = flips.length ? 0 : s.noCap + 1;
    s.side = o;
    s.forced = canCaptureInto(b, from, o) ? from : -1;
    return { flips, from, to, p };
  }

  function counts(b) { let r = 0, x = 0; for (let i = 0; i < NN; i++) { if (b[i] === 1) r++; else if (b[i] === 2) x++; } return [r, x]; }

  // kết quả: 0 đang chơi, 1 Đỏ thắng, 2 Xanh thắng, 3 hòa
  function result(s) {
    const [r, x] = counts(s.b);
    if (r === 0) return 2;
    if (x === 0) return 1;
    if (s.noCap >= DRAW_PLIES) return 3;
    if (legalMoves(s).length === 0) return 3 - s.side;
    return 0;
  }

  // ---------------- AI ----------------
  let seed = 0x9e3779b9;
  function rnd() { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), seed | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; }
  const ZA = new Uint32Array(NN * 3), ZB = new Uint32Array(NN * 3), ZSA = rnd(), ZSB = rnd();
  const ZFA = new Uint32Array(NN + 1), ZFB = new Uint32Array(NN + 1);
  for (let i = 0; i < NN * 3; i++) { ZA[i] = rnd(); ZB[i] = rnd(); }
  for (let i = 0; i <= NN; i++) { ZFA[i] = rnd(); ZFB[i] = rnd(); }
  function hashDelta(oldForced, newForced, side, from, to, p, flips, h) {
    // cập nhật băm tăng dần sau nước đi: h = [a, c]
    const o = 3 - p;
    let a = h[0] ^ ZA[from * 3 + p] ^ ZA[to * 3 + p], c = h[1] ^ ZB[from * 3 + p] ^ ZB[to * 3 + p];
    for (let k = 0; k < flips.length; k++) { const x = flips[k]; a ^= ZA[x * 3 + o] ^ ZA[x * 3 + p]; c ^= ZB[x * 3 + o] ^ ZB[x * 3 + p]; }
    a ^= ZSA; c ^= ZSB;   // đổi bên đi
    a ^= ZFA[oldForced + 1] ^ ZFA[newForced + 1]; c ^= ZFB[oldForced + 1] ^ ZFB[newForced + 1];
    h[0] = a >>> 0; h[1] = c >>> 0;
  }
  function hashState(s) {
    let a = 0, c = 0;
    for (let i = 0; i < NN; i++) if (s.b[i]) { a ^= ZA[i * 3 + s.b[i]]; c ^= ZB[i * 3 + s.b[i]]; }
    if (s.side === 2) { a ^= ZSA; c ^= ZSB; }
    const f = s.forced + 1; a ^= ZFA[f]; c ^= ZFB[f];
    return [a >>> 0, c >>> 0];
  }

  const WIN = 100000, INF = 1e9;
  const EVEN = new Uint8Array(NN);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) EVEN[r * N + c] = (r + c) % 2 === 0 ? 1 : 0;

  function evaluate(s, p) {   // góc nhìn của p (bên sắp đi)
    const b = s.b, o = 3 - p;
    let mine = 0, theirs = 0, junc = 0;
    for (let i = 0; i < NN; i++) {
      if (b[i] === p) { mine++; junc += EVEN[i]; }
      else if (b[i] === o) { theirs++; junc -= EVEN[i]; }
    }
    // linh hoạt: số nước đi hai bên
    let mm = 0, om = 0;
    for (let i = 0; i < NN; i++) {
      if (!b[i]) continue;
      const nbs = ADJ[i]; let m = 0;
      for (let k = 0; k < nbs.length; k++) if (!b[nbs[k]]) m++;
      if (b[i] === p) mm += m; else om += m;
    }
    return (mine - theirs) * 100 + junc * 4 + (mm - om) * 3;
  }

  function Search(timeMs) {
    this.deadline = Date.now() + timeMs;
    this.nodes = 0; this.stop = false;
    this.tt = new Map();
    this.snaps = [];
    this.hist = new Map();   // lịch sử vị trí đã xuất hiện trong ván (tránh lặp vô nghĩa)
  }
  Search.prototype.timeUp = function () {
    if ((++this.nodes & 511) === 0 && Date.now() > this.deadline) this.stop = true;
    return this.stop;
  };

  function orderMoves(s, moves, ttMove) {
    const b = s.b, p = s.side;
    const scored = moves.map(m => {
      let sc = 0;
      if (ttMove && m[0] === ttMove[0] && m[1] === ttMove[1]) sc += 1e6;
      b[m[0]] = 0; b[m[1]] = p;
      if (captureList(b, m[1], p, tmpCap)) sc += 1000 * (tmpCap.length / 2 | 0) + 500;
      b[m[1]] = 0; b[m[0]] = p;
      sc += EVEN[m[1]] * 3;
      return { m, sc };
    });
    scored.sort((x, y) => y.sc - x.sc);
    return scored.map(x => x.m);
  }

  Search.prototype.negamax = function (s, depth, alpha, beta, ply, h1, h2) {
    if (this.timeUp()) return 0;
    const b = s.b, p = s.side, o = 3 - p;
    // kết thúc
    let r = 0, x = 0;
    for (let i = 0; i < NN; i++) { if (b[i] === 1) r++; else if (b[i] === 2) x++; }
    if (r === 0 || x === 0) return (p === 1 ? r : x) > 0 ? WIN - ply : -WIN + ply;
    if (s.noCap >= DRAW_PLIES) return 0;

    const useTT = s.noCap < 24;
    const key = h1 * 4 + (h2 & 3);
    let ttMove = null;
    if (useTT) {
      const e = this.tt.get(key);
      if (e && e.h2 === h2) {
        ttMove = e.move;
        if (e.depth >= depth) {
          if (e.flag === 0) return e.val;
          if (e.flag === 1 && e.val >= beta) return e.val;
          if (e.flag === 2 && e.val <= alpha) return e.val;
        }
      }
    }

    const moves = legalMoves(s);
    if (moves.length === 0) return -WIN + ply;
    if (depth <= 0) return evaluate(s, p);
    const ordered = orderMoves(s, moves, ttMove);
    const a0 = alpha;
    let best = -INF, bestMove = ordered[0];
    const snap = this.snaps[ply] || (this.snaps[ply] = new Int8Array(NN));
    snap.set(b);
    const hh = [0, 0];
    for (const m of ordered) {
      const sv = s.forced, snc = s.noCap;
      const mv = applyMove(s, m[0], m[1]);
      hh[0] = h1; hh[1] = h2;
      hashDelta(sv, s.forced, p, m[0], m[1], p, mv.flips, hh);
      const v = -this.negamax(s, depth - 1, -beta, -alpha, ply + 1, hh[0], hh[1]);
      s.b.set(snap); s.side = p; s.forced = sv; s.noCap = snc;
      if (this.stop) return 0;
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    if (useTT) {
      const flag = best <= a0 ? 2 : best >= beta ? 1 : 0;
      this.tt.set(key, { h2, depth, val: best, flag, move: bestMove });
    }
    return best;
  };

  // s: trạng thái; trả về [from, to]
  function chooseMove(state, timeMs) {
    const s = cloneState(state);
    const moves = legalMoves(s);
    if (!moves.length) return null;
    if (moves.length === 1) { api.lastStats = { depth: 0, val: 0 }; return moves[0]; }
    const S = new Search(timeMs || 1500);
    let root = orderMoves(s, moves, null);
    let bestMove = root[0], bestVal = -INF, doneDepth = 0;
    const p = s.side;
    for (let depth = 1; depth <= 40; depth++) {
      let alpha = -INF, curBest = null, curVal = -INF;
      const scored = [];
      for (const m of root) {
        const sv = s.forced, snc = s.noCap, sbd = Int8Array.from(s.b);
        applyMove(s, m[0], m[1]);
        const [n1, n2] = hashState(s);
        const v = -S.negamax(s, depth - 1, -INF, -alpha, 1, n1, n2);
        s.b.set(sbd); s.side = p; s.forced = sv; s.noCap = snc;
        if (S.stop) break;
        scored.push([m, v]);
        if (v > curVal) { curVal = v; curBest = m; }
        if (v > alpha) alpha = v;
      }
      if (curBest) { bestMove = curBest; bestVal = curVal; }
      if (S.stop) break;
      doneDepth = depth;
      scored.sort((x, y) => y[1] - x[1]);
      root = scored.map(x => x[0]);
      if (Math.abs(bestVal) >= WIN - 60) break;   // đã tìm ra thắng/thua chắc chắn
    }
    api.lastStats = { depth: doneDepth, val: bestVal, nodes: S.nodes };
    return bestMove;
  }

  const api = { N, NN, ADJ, NB, initialBoard, newGame, cloneState, legalMoves, applyMove, result, counts, chooseMove, DRAW_PLIES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.onmessage = (e) => {
      const { id, board, side, forced, noCap, timeMs } = e.data;
      const st = { b: Int8Array.from(board), side, forced, noCap };
      self.postMessage({ id, move: chooseMove(st, timeMs) });
    };
  }
  root.CoGanh = api;
})(typeof self !== 'undefined' ? self : this);
