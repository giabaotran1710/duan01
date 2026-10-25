/* AI Cờ Bao Vây (bàn 10x10, đặt vào ô trống bất kỳ, kẹp chuỗi quân đối phương theo 8 hướng để lật; quân ở góc không bị lật).
 * - Alpha-beta lặp sâu dần + bảng chuyển vị (Zobrist) trong giới hạn thời gian.
 * - Tìm kiếm tĩnh ở lá: xét các nước kẹp và nước chặn để không bị "hiệu ứng chân trời".
 * - Đánh giá: chênh lệch quân + mối đe dọa kẹp của hai bên + quân ở cạnh/góc (khó bị lật).
 * - Cuối ván (ít ô trống): giải chính xác toàn bộ.
 * Dùng được như Web Worker (postMessage {board, player, timeMs, id}) hoặc require() trong Node.
 */
(function (root) {
  'use strict';
  const N = 10, NN = N * N;
  const DR = [-1, -1, -1, 0, 0, 1, 1, 1], DC = [-1, 0, 1, -1, 1, -1, 0, 1];

  const CORNER = new Uint8Array(NN), EDGE = new Uint8Array(NN);
  // tia phẳng: các ô theo hướng d từ ô i nằm ở RD[RS[i*8+d] .. RS[i*8+d]+RL[i*8+d])
  const RS = new Int32Array(NN * 8), RL = new Int32Array(NN * 8);
  const rdTmp = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const i = r * N + c;
    CORNER[i] = (r === 0 || r === N - 1) && (c === 0 || c === N - 1) ? 1 : 0;
    EDGE[i] = r === 0 || r === N - 1 || c === 0 || c === N - 1 ? 1 : 0;
    for (let d = 0; d < 8; d++) {
      RS[i * 8 + d] = rdTmp.length;
      let rr = r + DR[d], cc = c + DC[d];
      while (rr >= 0 && rr < N && cc >= 0 && cc < N) { rdTmp.push(rr * N + cc); rr += DR[d]; cc += DC[d]; }
      RL[i * 8 + d] = rdTmp.length - RS[i * 8 + d];
    }
  }
  const RD = Int16Array.from(rdTmp);

  // Tính một lượt cho ô trống i: số quân bên 1 lật được (G1) và bên 2 lật được (G2) nếu đặt vào i.
  // Chuỗi quân màu v (không chứa góc) bị chặn bởi quân màu 3-v → bên 3-v đặt vào i sẽ lật cả chuỗi.
  let G1 = 0, G2 = 0;
  function gains(b, i) {
    G1 = 0; G2 = 0;
    const base = i * 8;
    for (let d = 0; d < 8; d++) {
      const len = RL[base + d];
      if (len < 2) continue;
      const s = RS[base + d];
      const v = b[RD[s]];
      if (v === 0) continue;
      let k = 0;
      while (k < len) {
        const x = RD[s + k];
        if (b[x] !== v) break;
        if (CORNER[x]) { k = -1; break; }
        k++;
      }
      if (k <= 0 || k >= len) continue;
      const w = b[RD[s + k]];
      if (w === 3 - v) { if (w === 1) G1 += k; else G2 += k; }
    }
  }
  function gain(b, i, p) { gains(b, i); return p === 1 ? G1 : G2; }

  // đặt quân + lật; ghi các ô bị lật vào `flips`
  function play(b, i, p, flips) {
    const o = 3 - p;
    b[i] = p;
    const base = i * 8;
    for (let d = 0; d < 8; d++) {
      const len = RL[base + d], s = RS[base + d];
      let k = 0;
      while (k < len) {
        const x = RD[s + k];
        if (b[x] !== o) break;
        if (CORNER[x]) { k = -1; break; }
        k++;
      }
      if (k > 0 && k < len && b[RD[s + k]] === p) {
        for (let j = 0; j < k; j++) { const x = RD[s + j]; b[x] = p; flips.push(x); }
      }
    }
  }
  function undo(b, i, p, flips, from) {
    const o = 3 - p;
    for (let j = flips.length - 1; j >= from; j--) b[flips[j]] = o;
    flips.length = from;
    b[i] = 0;
  }

  // ---------- Zobrist ----------
  let seed = 0x1234567;
  function rnd() { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), seed | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return (t ^ (t >>> 14)) >>> 0; }
  const ZA = new Uint32Array(NN * 3), ZB = new Uint32Array(NN * 3);
  for (let i = 0; i < NN * 3; i++) { ZA[i] = rnd(); ZB[i] = rnd(); }

  // ---------- Tham số đánh giá (đơn vị: 1 quân = 100) ----------
  const W = { edge: 30, corner: 300, tempo: 100, threat2: 120, myThreat: 25, adj: 6, ordMy: 100, ordOpp: 80,
    beam3: 12, beam2: 10, beam1: 8, qn: 6, qd: 4, qBlock: 2 };

  const INF = 1e9;

  function Search(timeMs) {
    this.deadline = Date.now() + timeMs;
    this.nodes = 0;
    this.stop = false;
    this.tt = new Map();
    // danh sách ô trống (sửa tại chỗ khi đi/hoàn tác)
    this.E = new Int16Array(NN);
    this.pos = new Int16Array(NN);
    this.n = 0;
    // bộ đệm theo tầng để không tạo mảng mới
    this.mvBuf = []; this.scBuf = [];
    for (let k = 0; k < 128; k++) { this.mvBuf.push(new Int16Array(NN)); this.scBuf.push(new Float64Array(NN)); }
  }

  Search.prototype.removeE = function (i) {   // bỏ ô i khỏi danh sách trống (đổi chỗ với cuối)
    const k = this.pos[i], last = this.E[this.n - 1];
    this.E[k] = last; this.pos[last] = k;
    this.E[this.n - 1] = i; this.pos[i] = this.n - 1;
    this.n--;
  };
  Search.prototype.restoreE = function () { this.n++; };   // ô vừa bỏ vẫn nằm ngay sau đoạn trống

  Search.prototype.timeUp = function () {
    if ((++this.nodes & 1023) === 0 && Date.now() > this.deadline) this.stop = true;
    return this.stop;
  };

  // Quét ô trống: trả về số nước trong mvBuf[ply] (đã sắp theo điểm giảm dần), đồng thời tính
  // phần đánh giá tĩnh (mối đe dọa lớn nhì của đối phương, của ta) vào this.th
  Search.prototype.scan = function (b, p, ply, onlyTactical, limit) {
    const mv = this.mvBuf[ply], sc = this.scBuf[ply];
    let cnt = 0, o1 = 0, o2 = 0, m1 = 0, m2 = 0;
    for (let k = 0; k < this.n; k++) {
      const i = this.E[k];
      gains(b, i);
      const gm = p === 1 ? G1 : G2, go = p === 1 ? G2 : G1;
      if (go > o1) { o2 = o1; o1 = go; } else if (go > o2) o2 = go;
      if (gm > m1) { m2 = m1; m1 = gm; } else if (gm > m2) m2 = gm;
      if (onlyTactical && gm === 0 && go < W.qBlock) continue;
      let s = gm * W.ordMy + go * W.ordOpp;
      if (CORNER[i]) s += 150; else if (EDGE[i]) s += 20;
      if (!onlyTactical) {
        let adj = 0;
        const base = i * 8;
        for (let d = 0; d < 8; d++) if (RL[base + d] && b[RD[RS[base + d]]]) adj++;
        s += adj * W.adj;
      }
      // chèn có thứ tự
      let j = cnt++;
      while (j > 0 && sc[j - 1] < s) { sc[j] = sc[j - 1]; mv[j] = mv[j - 1]; j--; }
      sc[j] = s; mv[j] = i;
    }
    this.o2 = o2; this.m2 = m2;
    if (limit && cnt > limit) {
      // giữ thêm mọi nước kẹp/chặn lớn nằm ngoài giới hạn
      let keep = limit;
      for (let j = limit; j < cnt; j++) if (sc[j] >= 2 * W.ordOpp) { mv[keep] = mv[j]; sc[keep] = sc[j]; keep++; }
      cnt = keep;
    }
    return cnt;
  };

  Search.prototype.staticEval = function (b, p) {
    let mat = 0, pos = 0;
    for (let i = 0; i < NN; i++) {
      const v = b[i];
      if (!v) continue;
      const s = v === p ? 1 : -1;
      mat += s;
      if (CORNER[i]) pos += s * W.corner;
      else if (EDGE[i]) pos += s * W.edge;
    }
    // ta sắp đi một nước (tempo), chặn được mối đe dọa lớn nhất; mối lớn nhì của đối phương coi như mất
    return mat * 100 + pos + W.tempo - this.o2 * W.threat2 + this.m2 * W.myThreat;
  };

  function finalScore(b, p) {
    let d = 0;
    for (let i = 0; i < NN; i++) if (b[i]) d += b[i] === p ? 1 : -1;
    return (d > 0 ? 100000 : d < 0 ? -100000 : 0) + d * 100;
  }

  // tìm kiếm tĩnh: chỉ xét nước kẹp và nước chặn
  Search.prototype.qsearch = function (b, p, alpha, beta, qd, ply, flips) {
    if (this.timeUp()) return 0;
    if (this.n === 0) return finalScore(b, p);
    const cnt = this.scan(b, p, ply, true, 0);
    const stand = this.staticEval(b, p);
    if (qd >= W.qd || stand >= beta || cnt === 0) return stand;
    if (stand > alpha) alpha = stand;
    const mv = this.mvBuf[ply];
    const o = 3 - p;
    let best = stand;
    for (let k = 0; k < cnt && k < W.qn; k++) {
      const i = mv[k];
      const from = flips.length;
      play(b, i, p, flips); this.removeE(i);
      const v = -this.qsearch(b, o, -beta, -alpha, qd + 1, ply + 1, flips);
      this.restoreE(); undo(b, i, p, flips, from);
      if (this.stop) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  Search.prototype.negamax = function (b, p, depth, alpha, beta, h1, h2, flips, ply) {
    if (this.timeUp()) return 0;
    if (this.n === 0) return finalScore(b, p);
    const exact = this.n <= this.exactN;
    if (depth <= 0 && !exact) return this.qsearch(b, p, alpha, beta, 0, ply, flips);

    const key = h1 * 8 + (h2 & 3) * 2 + (p - 1);
    const ent = this.tt.get(key);
    let ttMove = -1;
    if (ent !== undefined && ent.h2 === h2) {
      ttMove = ent.move;
      if (ent.depth >= depth || ent.depth === 99) {
        if (ent.flag === 0) return ent.val;
        if (ent.flag === 1 && ent.val >= beta) return ent.val;
        if (ent.flag === 2 && ent.val <= alpha) return ent.val;
      }
    }

    const limit = exact ? 0 : depth >= 3 ? W.beam3 : depth === 2 ? W.beam2 : W.beam1;
    const cnt = this.scan(b, p, ply, false, limit);
    const mv = this.mvBuf[ply];
    if (ttMove >= 0) for (let k = 1; k < cnt; k++) if (mv[k] === ttMove) { mv[k] = mv[0]; mv[0] = ttMove; break; }
    const o = 3 - p;
    const a0 = alpha;
    let best = -INF, bestMove = cnt ? mv[0] : -1;
    for (let k = 0; k < cnt; k++) {
      const i = mv[k];
      const from = flips.length;
      play(b, i, p, flips); this.removeE(i);
      let n1 = h1 ^ ZA[i * 3 + p], n2 = h2 ^ ZB[i * 3 + p];
      for (let j = from; j < flips.length; j++) { const f = flips[j]; n1 ^= ZA[f * 3 + o] ^ ZA[f * 3 + p]; n2 ^= ZB[f * 3 + o] ^ ZB[f * 3 + p]; }
      const v = -this.negamax(b, o, depth - 1, -beta, -alpha, n1 >>> 0, n2 >>> 0, flips, ply + 1);
      this.restoreE(); undo(b, i, p, flips, from);
      if (this.stop) return 0;
      if (v > best) { best = v; bestMove = i; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    const flag = best <= a0 ? 2 : best >= beta ? 1 : 0;
    this.tt.set(key, { h2, depth: exact ? 99 : depth, val: best, flag, move: bestMove });
    return best;
  };

  // board2d: mảng 10x10 (0 trống, 1 đỏ, 2 xanh); trả về [r, c]
  function chooseMove(board2d, player, timeMs, opts) {
    const b = new Int8Array(NN);
    const S = new Search(timeMs || 900);
    S.exactN = (opts && opts.exactN) || 9;
    let h1 = 0, h2 = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c, v = board2d[r][c];
      b[i] = v;
      if (v) { h1 ^= ZA[i * 3 + v]; h2 ^= ZB[i * 3 + v]; }
      else { S.E[S.n] = i; S.pos[i] = S.n; S.n++; }
    }
    if (S.n === 0) return null;
    if (S.n === NN) return [0, 0];   // nước đầu: góc (không bao giờ bị lật)
    h1 >>>= 0; h2 >>>= 0;
    const flips = [];
    const o = 3 - player;
    let cnt = S.scan(b, player, 0, false, 0);
    let root = Array.from(S.mvBuf[0].slice(0, cnt));
    let bestMove = root[0], bestVal = -INF, depthDone = 0;
    for (let depth = 1; depth <= 30; depth++) {
      let alpha = -INF, curBest = -1, curVal = -INF;
      const scores = [];
      for (const i of root) {
        const from = flips.length;
        play(b, i, player, flips); S.removeE(i);
        let n1 = h1 ^ ZA[i * 3 + player], n2 = h2 ^ ZB[i * 3 + player];
        for (let j = from; j < flips.length; j++) { const f = flips[j]; n1 ^= ZA[f * 3 + o] ^ ZA[f * 3 + player]; n2 ^= ZB[f * 3 + o] ^ ZB[f * 3 + player]; }
        const v = -S.negamax(b, o, depth - 1, -INF, -alpha, n1 >>> 0, n2 >>> 0, flips, 1);
        S.restoreE(); undo(b, i, player, flips, from);
        if (S.stop) break;
        scores.push([i, v]);
        if (v > curVal) { curVal = v; curBest = i; }
        if (v > alpha) alpha = v;
      }
      // vòng dở dang: nước tốt nhất vòng trước được xét đầu tiên, nên nước tốt nhất trong phần đã xét vẫn đáng tin
      if (curBest >= 0) { bestMove = curBest; bestVal = curVal; }
      if (S.stop) break;
      depthDone = depth;
      scores.sort((x, y) => y[1] - x[1]);
      root = scores.map(s => s[0]);
      if (Math.abs(bestVal) >= 90000 || S.n - 1 <= S.exactN) break;   // đã giải xong (cuối ván tìm chính xác)
    }
    api.lastStats = { depth: depthDone, nodes: S.nodes, val: bestVal };
    return [(bestMove / N) | 0, bestMove % N];
  }

  const api = { chooseMove, gain, play, N, W };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.onmessage = (e) => {
      const { board, player, timeMs, id } = e.data;
      self.postMessage({ id, move: chooseMove(board, player, timeMs) });
    };
  }
  root.ReversiAI = api;
})(typeof self !== 'undefined' ? self : this);
