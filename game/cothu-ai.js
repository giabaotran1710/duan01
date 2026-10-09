// Bộ máy AI Cờ Thú: alpha-beta (PVS) tìm sâu dần theo thời gian, bảng chuyển vị Zobrist,
// sắp xếp nước bằng killer/history, quiescence có xét đòn ăn quân và phòng thủ hang.
// Luật mô phỏng khớp từng chi tiết với cothu.js (Cú, Rắn, Cá sấu, Tử chiến, Thủy triều, Cờ úp),
// kể cả việc bộ đếm choáng/ngủ và thủy triều chỉ chạy sau nước đi của bên Đỏ.
// Không đụng tới DOM nên dùng được cả trong trình duyệt lẫn Node (để đo đạc).
(function (root) {
  'use strict';

  const W = 7, NSQ = 63;
  const BLUE = 0, RED = 1;
  const DEN = [3, 59]; // DEN[side] = hang của chính bên đó
  const TYPES = ['rat', 'cat', 'dog', 'wolf', 'leopard', 'tiger', 'lion', 'elephant', 'owl', 'crocodile', 'snake', 'bear', 'eagle'];
  const RAT = 0, TIGER = 5, LION = 6, ELEPHANT = 7, OWL = 8, CROC = 9, SNAKE = 10;
  const WIN = 1000000, MATE_BOUND = WIN - 1000;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  // ---------- Luật theo chế độ ----------
  function rulesFor(modes) {
    const rank = new Int8Array(13), val = new Int32Array(13), adv = new Int32Array(13);
    let def;
    if (modes.forest) {
      def = { bear: [7, 900, 14], eagle: [7, 880, 14], crocodile: [6, 640, 12], tiger: [6, 720, 14],
        leopard: [5, 480, 16], wolf: [4, 360, 16], owl: [2, 330, 14], snake: [1, 260, 18] };
    } else if (modes.death) {
      def = { elephant: [8, 950, 10], lion: [7, 860, 14], tiger: [6, 760, 14], leopard: [5, 480, 16],
        wolf: [4, 360, 16], owl: [2, 330, 14], rat: [1, 400, 10] };
    } else {
      def = { elephant: [8, 950, 10], lion: [7, 860, 14], tiger: [6, 760, 14], leopard: [5, 480, 16],
        wolf: [4, 360, 16], dog: [3, 290, 16], cat: [2, 210, 16], rat: [1, 400, 10] };
    }
    for (const k in def) {
      const t = TYPES.indexOf(k);
      rank[t] = def[k][0]; val[t] = def[k][1]; adv[t] = def[k][2];
    }
    // trapOwner[sq]: -1 không phải bẫy, 0 = bẫy của Xanh (làm yếu quân Đỏ), 1 = bẫy của Đỏ
    const trapOwner = new Int8Array(NSQ).fill(-1);
    const traps = modes.forest
      ? [[2, 0], [4, 0], [3, 1], [2, 1], [4, 1]]
      : [[2, 0], [4, 0], [3, 1]];
    for (const [x, y] of traps) { trapOwner[y * W + x] = BLUE; trapOwner[(8 - y) * W + x] = RED; }
    const water = new Uint8Array(NSQ);
    for (let y = 3; y <= 5; y++) for (const x of [1, 2, 4, 5]) water[y * W + x] = 1;
    return { forest: !!modes.forest, death: !!modes.death, tide: !!modes.tide, up: !!modes.up,
      rank, val, adv, trapOwner, water };
  }

  // Thưởng tiến quân theo khoảng cách Manhattan tới hang địch (nhân hệ số từng loài / 16)
  const ADV_TAB = [0, 140, 70, 38, 22, 13, 8, 4, 2, 1, 0, 0, 0, 0, 0, 0];

  // ---------- Zobrist ----------
  let seed = 0x9e3779b9;
  function rnd() {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return seed | 0;
  }
  function zarr(n) { const a = new Int32Array(n); for (let i = 0; i < n; i++) a[i] = rnd(); return a; }
  const ZP_HI = zarr(2 * 13 * 64), ZP_LO = zarr(2 * 13 * 64);
  const ZST_HI = zarr(64 * 4), ZST_LO = zarr(64 * 4);
  const ZSL_HI = zarr(64 * 4), ZSL_LO = zarr(64 * 4);
  const ZH_HI = zarr(64), ZH_LO = zarr(64);
  const ZTC_HI = zarr(8), ZTC_LO = zarr(8);
  const ZTURN_HI = rnd(), ZTURN_LO = rnd(), ZTA_HI = rnd(), ZTA_LO = rnd();

  // ---------- Bảng chuyển vị ----------
  const TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  const ttHi = new Int32Array(TT_SIZE), ttLo = new Int32Array(TT_SIZE);
  const ttScore = new Int32Array(TT_SIZE), ttMove = new Int16Array(TT_SIZE);
  const ttDepth = new Int8Array(TT_SIZE), ttFlag = new Uint8Array(TT_SIZE), ttAge = new Uint8Array(TT_SIZE);
  let ttGen = 0, ttSig = '';
  const F_EXACT = 1, F_LOWER = 2, F_UPPER = 3;

  function clearTT() {
    ttHi.fill(0); ttLo.fill(0); ttFlag.fill(0); ttDepth.fill(0); ttMove.fill(0); ttAge.fill(0);
  }

  // ---------- Trạng thái tìm kiếm (thiết lập lại mỗi lần gọi) ----------
  let R, NP, ptype, pside;
  let POS, STN, SLP, HID, TURN, TA, TC, WINNER, BSIZE;
  let hHi = 0, hLo = 0;
  let nodes = 0, deadline = 0, stopped = false;
  const MAXPLY = 96, MAXM = 160;
  const moveBuf = new Int32Array(MAXPLY * MAXM);
  const scoreBuf = new Int32Array(MAXPLY * MAXM);
  const killers = new Int32Array(MAXPLY * 2);
  const history = new Int32Array(64 * 64);
  const pathHi = new Int32Array(MAXPLY + 8), pathLo = new Int32Array(MAXPLY + 8);
  let gameHist = new Set();

  const now = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();

  function wt(b, sq) { return R.water[sq] === 1 || (b[TA] === 1 && sq >= 28 && sq < 35); }
  function effRank(i, sq) { return R.trapOwner[sq] === 1 - pside[i] ? 0 : R.rank[ptype[i]]; }
  function amph(t) { return t === RAT || t === OWL || t === CROC; }

  function canCap(b, i, d, asq, dsq) {
    const at = ptype[i], dt = ptype[d];
    const aw = wt(b, asq), dw = wt(b, dsq);
    if (!amph(at) && dw) return false;
    const dr = effRank(d, dsq);
    if (dr === 0) return true;
    if (at === RAT && dt === ELEPHANT) return true;
    if (at === ELEPHANT && dt === RAT) return false;
    if (at === OWL) return true;
    if (at === RAT && dt === RAT) return aw === dw;
    return effRank(i, asq) >= dr;
  }

  // Sinh nước đi cho bên đang đi. Mã nước: (from << 6) | to, to = 63 nghĩa là "vạch cỏ" (Cờ úp).
  function gen(b, o, capsOnly) {
    const side = b[TURN], own = DEN[side];
    let n = o;
    for (let i = 0; i < NP; i++) {
      if (pside[i] !== side) continue;
      const from = b[POS + i];
      if (from < 0) continue;
      if (b[HID + i]) { if (!capsOnly) moveBuf[n++] = (from << 6) | 63; continue; }
      if (b[STN + i] > 0 || b[SLP + i] > 0) continue;
      const t = ptype[i], fx = from % W, fy = (from / W) | 0;
      if (t === CROC) {
        for (let k = 0; k < 4; k++) {
          const x = fx + DIAG[k][0], y = fy + DIAG[k][1];
          if (x < 0 || x >= W || y < 0 || y > 8) continue;
          const sq = y * W + x;
          if (sq === own) continue;
          const occ = b[sq];
          if (!occ) { if (!capsOnly) moveBuf[n++] = (from << 6) | sq; }
          else { const d = occ - 1; if (pside[d] !== side && canCap(b, i, d, from, sq)) moveBuf[n++] = (from << 6) | sq; }
        }
        continue;
      }
      if (t === SNAKE) {
        if (capsOnly) continue;
        for (let k = 0; k < 4; k++) {
          const x = fx + DIRS[k][0], y = fy + DIRS[k][1];
          if (x < 0 || x >= W || y < 0 || y > 8) continue;
          const sq = y * W + x;
          if (sq === own || wt(b, sq)) continue;
          moveBuf[n++] = (from << 6) | sq;
        }
        continue;
      }
      const range = t === OWL ? 2 : 1;
      for (let k = 0; k < 4; k++) {
        const dx = DIRS[k][0], dy = DIRS[k][1];
        for (let step = 1; step <= range; step++) {
          const x = fx + dx * step, y = fy + dy * step;
          if (x < 0 || x >= W || y < 0 || y > 8) break;
          const sq = y * W + x;
          if (sq === own) break;
          const occ = b[sq];
          if (!occ) {
            if (!capsOnly && (t === RAT || t === OWL || !wt(b, sq))) moveBuf[n++] = (from << 6) | sq;
          } else {
            const d = occ - 1;
            if (pside[d] !== side && canCap(b, i, d, from, sq)) moveBuf[n++] = (from << 6) | sq;
            break;
          }
          if (t !== OWL && wt(b, sq)) break;
        }
      }
      if (t === TIGER || t === LION) {
        for (let k = 0; k < 4; k++) {
          const dx = DIRS[k][0], dy = DIRS[k][1];
          let x = fx + dx, y = fy + dy;
          if (x < 0 || x >= W || y < 0 || y > 8 || !wt(b, y * W + x)) continue;
          let blocked = false;
          while (x >= 0 && x < W && y >= 0 && y <= 8 && wt(b, y * W + x)) {
            const occ = b[y * W + x];
            if (occ && ptype[occ - 1] === RAT) blocked = true;
            x += dx; y += dy;
          }
          if (blocked || x < 0 || x >= W || y < 0 || y > 8) continue;
          const sq = y * W + x;
          if (sq === own) continue;
          const occ = b[sq];
          if (!occ) { if (!capsOnly) moveBuf[n++] = (from << 6) | sq; }
          else { const d = occ - 1; if (pside[d] !== side && canCap(b, i, d, from, sq)) moveBuf[n++] = (from << 6) | sq; }
        }
      }
    }
    return n - o;
  }

  // Bên `side` có thể vào hang địch ngay nước tới không? slack: số lượt choáng/ngủ sẽ được trừ trước khi bên đó đi.
  function canEnterDen(b, side, slack) {
    const den = DEN[1 - side], dx0 = den % W, dy0 = (den / W) | 0;
    for (let i = 0; i < NP; i++) {
      if (pside[i] !== side) continue;
      const p = b[POS + i];
      if (p < 0 || b[HID + i]) continue;
      if (b[STN + i] > slack || b[SLP + i] > slack) continue;
      const ax = Math.abs(p % W - dx0), ay = Math.abs(((p / W) | 0) - dy0);
      const t = ptype[i];
      if (t === CROC) { if (ax === 1 && ay === 1) return true; continue; }
      if (ax + ay === 1) return true;
      if (t === OWL && ax + ay === 2 && (ax === 0 || ay === 0)) {
        const mid = (p + den) >> 1;
        if (!b[mid]) return true;
      }
    }
    return false;
  }

  function kill(b, i) { b[b[POS + i]] = 0; b[POS + i] = -1; }
  function alive(b, side) { for (let i = 0; i < NP; i++) if (pside[i] === side && b[POS + i] >= 0) return true; return false; }

  // Thực hiện nước đi đúng như processMove + finishAITurn/startHumanTurn của game.
  function applyMove(b, m) {
    const from = m >> 6, to = m & 63;
    const i = b[from] - 1, side = pside[i];
    if (to === 63) { b[HID + i] = 0; b[TURN] = 1 - side; return; }
    const occ = b[to];
    const t = ptype[i];
    if (occ) {
      const d = occ - 1;
      if (t === SNAKE) {
        b[POS + d] = from; b[from] = d + 1; b[POS + i] = to; b[to] = i + 1; b[HID + d] = 0;
      } else if (t === OWL) {
        if (ptype[d] === OWL) { kill(b, d); kill(b, i); }
        else if (effRank(d, to) > effRank(i, from)) { b[STN + d] = 3; b[SLP + i] = 3; }
        else { kill(b, d); b[from] = 0; b[to] = i + 1; b[POS + i] = to; b[SLP + i] = 3; }
      } else if (R.death && effRank(i, from) === effRank(d, to)) {
        kill(b, d); kill(b, i);
      } else {
        kill(b, d); b[from] = 0; b[to] = i + 1; b[POS + i] = to;
      }
    } else {
      b[from] = 0; b[to] = i + 1; b[POS + i] = to;
      if (t === OWL) {
        const dd = Math.abs(from % W - to % W) + Math.abs(((from / W) | 0) - ((to / W) | 0));
        if (dd === 2) b[SLP + i] = 3;
      }
    }
    b[TURN] = 1 - side;
    if (b[POS + i] === DEN[1 - side]) { b[WINNER] = side; return; }
    if (!alive(b, 1 - side)) { b[WINNER] = side; return; }
    if (!alive(b, side)) { b[WINNER] = 1 - side; return; }
    if (side === RED) {
      // finishAITurn() + startHumanTurn(): mỗi hàm trừ trạng thái 1 lần
      for (let k = 0; k < NP; k++) {
        const s = b[STN + k] - 2; b[STN + k] = s < 0 ? 0 : s;
        const l = b[SLP + k] - 2; b[SLP + k] = l < 0 ? 0 : l;
      }
      if (R.tide) {
        if (b[TA]) { b[TA] = 0; b[TC] = 3; }
        else {
          b[TC]--;
          if (b[TC] <= 0) {
            b[TA] = 1; b[TC] = 3;
            for (let k = 0; k < NP; k++) {
              const p = b[POS + k];
              if (p >= 28 && p < 35 && ptype[k] !== RAT) kill(b, k);
            }
            if (!alive(b, BLUE)) b[WINNER] = RED;
            else if (!alive(b, RED)) b[WINNER] = BLUE;
          }
        }
      }
    }
  }

  function computeHash(b) {
    let hi = 0, lo = 0;
    for (let i = 0; i < NP; i++) {
      const p = b[POS + i];
      if (p < 0) continue;
      const z = ((pside[i] * 13 + ptype[i]) << 6) | p;
      hi ^= ZP_HI[z]; lo ^= ZP_LO[z];
      const st = b[STN + i], sl = b[SLP + i];
      if (st) { hi ^= ZST_HI[(p << 2) | st]; lo ^= ZST_LO[(p << 2) | st]; }
      if (sl) { hi ^= ZSL_HI[(p << 2) | sl]; lo ^= ZSL_LO[(p << 2) | sl]; }
      if (b[HID + i]) { hi ^= ZH_HI[p]; lo ^= ZH_LO[p]; }
    }
    if (b[TURN] === RED) { hi ^= ZTURN_HI; lo ^= ZTURN_LO; }
    if (R.tide) {
      if (b[TA]) { hi ^= ZTA_HI; lo ^= ZTA_LO; }
      const c = b[TC] & 7; hi ^= ZTC_HI[c]; lo ^= ZTC_LO[c];
    }
    hHi = hi; hLo = lo;
  }

  // Đánh giá tĩnh, trả về theo góc nhìn bên đang đi.
  function evaluate(b) {
    let s = 0, mat = 0, cnt = 0;
    const tideSoon = R.tide && !b[TA] && b[TC] === 1;
    for (let i = 0; i < NP; i++) {
      const p = b[POS + i];
      if (p < 0) continue;
      const side = pside[i], t = ptype[i];
      const base = R.val[t];
      let v = base;
      const den = DEN[1 - side];
      const d = Math.abs(p % W - den % W) + Math.abs(((p / W) | 0) - ((den / W) | 0));
      v += (ADV_TAB[d] * R.adv[t]) >> 4;
      if (R.trapOwner[p] === 1 - side) v -= 50;
      if (b[STN + i] > 0 || b[SLP + i] > 0) v -= (base >> 4) * (b[STN + i] + b[SLP + i]);
      if (b[HID + i]) v -= 18;
      if (tideSoon && p >= 28 && p < 35 && t !== RAT) v -= base >> 2;
      // Thưởng giữ quân gần hang nhà (phòng thủ) cho quân mạnh
      const od = Math.abs(p % W - 3) + Math.abs(((p / W) | 0) - (side === BLUE ? 0 : 8));
      if (od <= 2 && R.rank[t] >= 4) v += 14;
      s += side === RED ? v : -v;
      mat += side === RED ? base : -base;
      cnt++;
    }
    // Hơn quân thì càng ít quân trên bàn càng dễ thắng: khuyến khích đổi quân khi đang hơn
    s += (mat * 3) / (cnt + 6) | 0;
    return (b[TURN] === RED ? s : -s) + 12;
  }

  function ttProbeIndex() { return hLo & TT_MASK; }

  function scoreToTT(s, ply) { return s > MATE_BOUND ? s + ply : s < -MATE_BOUND ? s - ply : s; }
  function scoreFromTT(s, ply) { return s > MATE_BOUND ? s - ply : s < -MATE_BOUND ? s + ply : s; }

  function ttStore(depth, flag, score, move, ply) {
    const idx = hLo & TT_MASK;
    if (ttFlag[idx] && ttAge[idx] === ttGen && ttDepth[idx] > depth && !(ttHi[idx] === hHi && ttLo[idx] === hLo)) return;
    ttHi[idx] = hHi; ttLo[idx] = hLo;
    ttScore[idx] = scoreToTT(score, ply); ttMove[idx] = move; ttDepth[idx] = depth;
    ttFlag[idx] = flag; ttAge[idx] = ttGen;
  }

  function isRepeat(ply) {
    for (let k = ply - 2; k >= 0; k -= 2) if (pathHi[k] === hHi && pathLo[k] === hLo) return true;
    return gameHist.has(hHi + ':' + hLo);
  }

  // Điểm sắp xếp nước: nước TT > ăn quân (MVV-LVA) > killer > history
  function scoreMoves(b, o, n, ttm, ply) {
    const k1 = killers[ply * 2], k2 = killers[ply * 2 + 1];
    for (let j = o; j < o + n; j++) {
      const m = moveBuf[j];
      if (m === ttm) { scoreBuf[j] = 1 << 30; continue; }
      const from = m >> 6, to = m & 63;
      if (to !== 63 && b[to] && pside[b[to] - 1] !== b[TURN]) {
        scoreBuf[j] = 1e8 + R.val[ptype[b[to] - 1]] * 64 - R.val[ptype[b[from] - 1]];
      } else if (m === k1) scoreBuf[j] = 9e7;
      else if (m === k2) scoreBuf[j] = 8e7;
      else scoreBuf[j] = history[(from << 6) | to];
    }
  }
  function pickNext(o, j, end) {
    let best = j, bs = scoreBuf[j];
    for (let k = j + 1; k < end; k++) if (scoreBuf[k] > bs) { bs = scoreBuf[k]; best = k; }
    if (best !== j) {
      const tm = moveBuf[j]; moveBuf[j] = moveBuf[best]; moveBuf[best] = tm;
      const ts = scoreBuf[j]; scoreBuf[j] = scoreBuf[best]; scoreBuf[best] = ts;
    }
    return moveBuf[j];
  }
  function isCapture(b, m) { const to = m & 63; return to !== 63 && b[to] !== 0 && ptype[b[m >> 6] - 1] !== SNAKE; }

  function checkTime() {
    if ((++nodes & 1023) === 0 && now() > deadline) stopped = true;
  }

  function quiesce(b, alpha, beta, ply, qply) {
    checkTime();
    if (stopped) return 0;
    if (b[WINNER] >= 0) return b[WINNER] === b[TURN] ? WIN - ply : -(WIN - ply);
    const side = b[TURN];
    if (canEnterDen(b, side, 0)) return WIN - ply - 1;
    if (ply >= MAXPLY - 1) return evaluate(b);
    const o = ply * MAXM;
    const danger = qply < 2 && canEnterDen(b, 1 - side, side === RED ? 2 : 0);
    let best, n;
    if (danger) {
      n = gen(b, o, false);
      if (!n) return -(WIN - ply);
      best = -WIN;
    } else {
      const stand = evaluate(b);
      if (stand >= beta || qply >= 8) return stand;
      if (stand > alpha) alpha = stand;
      best = stand;
      n = gen(b, o, true);
    }
    scoreMoves(b, o, n, 0, ply);
    for (let j = o; j < o + n; j++) {
      const m = pickNext(o, j, o + n);
      const c = b.slice();
      applyMove(c, m);
      const s = -quiesce(c, -beta, -alpha, ply + 1, qply + 1);
      if (stopped) return 0;
      if (s > best) {
        best = s;
        if (s > alpha) { alpha = s; if (alpha >= beta) break; }
      }
    }
    return best;
  }

  function search(b, depth, alpha, beta, ply) {
    checkTime();
    if (stopped) return 0;
    if (b[WINNER] >= 0) return b[WINNER] === b[TURN] ? WIN - ply : -(WIN - ply);
    computeHash(b);
    if (ply > 0 && isRepeat(ply)) return 0;
    pathHi[ply] = hHi; pathLo[ply] = hLo;
    if (depth <= 0 || ply >= MAXPLY - 4) return quiesce(b, alpha, beta, ply, 0);
    const side = b[TURN];
    if (canEnterDen(b, side, 0)) return WIN - ply - 1;
    const myHi = hHi, myLo = hLo;
    const idx = ttProbeIndex();
    let ttm = 0;
    if (ttFlag[idx] && ttHi[idx] === hHi && ttLo[idx] === hLo) {
      ttm = ttMove[idx];
      if (ply > 0 && ttDepth[idx] >= depth) {
        const ts = scoreFromTT(ttScore[idx], ply), f = ttFlag[idx];
        if (f === F_EXACT || (f === F_LOWER && ts >= beta) || (f === F_UPPER && ts <= alpha)) return ts;
      }
    }
    const danger = canEnterDen(b, 1 - side, side === RED ? 2 : 0);
    const ext = danger && ply < 24 ? 1 : 0;
    const o = ply * MAXM;
    const n = gen(b, o, false);
    if (!n) return -(WIN - ply);
    scoreMoves(b, o, n, ttm, ply);
    const alpha0 = alpha;
    let best = -WIN - 1, bestMove = 0;
    for (let j = o, cnt = 0; j < o + n; j++, cnt++) {
      const m = pickNext(o, j, o + n);
      const cap = isCapture(b, m);
      const c = b.slice();
      applyMove(c, m);
      let s;
      if (cnt === 0) {
        s = -search(c, depth - 1 + ext, -beta, -alpha, ply + 1);
      } else {
        let r = 0;
        if (depth >= 3 && cnt >= 3 && !cap && !danger && m !== killers[ply * 2] && m !== killers[ply * 2 + 1]) {
          r = 1;
          if (depth >= 6 && cnt >= 10) r = 2;
        }
        s = -search(c, depth - 1 + ext - r, -alpha - 1, -alpha, ply + 1);
        if (!stopped && s > alpha && r) s = -search(c, depth - 1 + ext, -alpha - 1, -alpha, ply + 1);
        if (!stopped && s > alpha && s < beta) s = -search(c, depth - 1 + ext, -beta, -alpha, ply + 1);
      }
      if (stopped) return 0;
      if (s > best) {
        best = s; bestMove = m;
        if (s > alpha) {
          alpha = s;
          if (alpha >= beta) {
            if (!cap) {
              if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
              history[m & 4095] += depth * depth;
            }
            break;
          }
        }
      }
    }
    hHi = myHi; hLo = myLo;
    ttStore(depth, best >= beta ? F_LOWER : best > alpha0 ? F_EXACT : F_UPPER, best, bestMove, ply);
    return best;
  }

  // ---------- Giao tiếp với game ----------
  function setup(pos) {
    const sig = JSON.stringify(pos.modes || {});
    R = rulesFor(pos.modes || {});
    if (sig !== ttSig) { clearTT(); ttSig = sig; }
    const list = pos.pieces.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    NP = list.length;
    ptype = new Int8Array(NP); pside = new Int8Array(NP);
    POS = NSQ; STN = POS + NP; SLP = STN + NP; HID = SLP + NP;
    TURN = HID + NP; TA = TURN + 1; TC = TA + 1; WINNER = TC + 1; BSIZE = WINNER + 1;
    const b = new Int16Array(BSIZE);
    list.forEach((p, i) => {
      ptype[i] = TYPES.indexOf(p.type); pside[i] = p.side === 'red' ? RED : BLUE;
      const sq = p.y * W + p.x;
      b[sq] = i + 1; b[POS + i] = sq;
      b[STN + i] = Math.min(3, p.stunned | 0); b[SLP + i] = Math.min(3, p.asleep | 0);
      b[HID + i] = R.up && p.hidden ? 1 : 0;
    });
    b[TURN] = pos.turn === 'red' ? RED : BLUE;
    b[TA] = pos.tideActive ? 1 : 0;
    b[TC] = pos.tideCountdown == null ? 3 : Math.max(0, Math.min(7, pos.tideCountdown | 0));
    b[WINNER] = -1;
    return { b, list };
  }

  function positionKey(pos) {
    const { b } = setup(pos);
    computeHash(b);
    return hHi + ':' + hLo;
  }

  function decode(m, list, b) {
    const from = m >> 6, to = m & 63;
    const p = list[b[from] - 1];
    if (to === 63) return { kind: 'reveal', pieceId: p.id };
    return { kind: 'move', pieceId: p.id, x: to % W, y: (to / W) | 0, fromX: from % W, fromY: (from / W) | 0 };
  }

  // pos: { pieces:[{id,side,type,x,y,stunned,asleep,hidden}], turn, tideActive, tideCountdown, modes:{up,tide,forest,death}, history:[key] }
  // opts: { timeMs, maxDepth }
  function chooseMove(pos, opts = {}) {
    const timeMs = opts.timeMs || 1000, maxDepth = opts.maxDepth || 60;
    const t0 = now();
    const { b, list } = setup(pos);
    gameHist = new Set(pos.history || []);
    nodes = 0; stopped = false; deadline = t0 + timeMs;
    ttGen = (ttGen + 1) & 255;
    killers.fill(0);
    for (let k = 0; k < history.length; k++) history[k] >>= 3;

    const n = gen(b, 0, false);
    if (!n) return null;
    const root = Array.from(moveBuf.subarray(0, n));
    const rootScore = new Map();
    // Thắng ngay nếu có thể
    for (const m of root) {
      const c = b.slice(); applyMove(c, m);
      if (c[WINNER] === b[TURN]) return Object.assign(decode(m, list, b), { score: WIN, depth: 1, nodes: 1, timeMs: now() - t0 });
    }
    computeHash(b);
    gameHist.delete(hHi + ':' + hLo);
    let bestMove = root[0], bestScore = -WIN, depthDone = 0;
    if (root.length === 1) return Object.assign(decode(bestMove, list, b), { score: 0, depth: 0, nodes: 0, timeMs: now() - t0 });

    for (let depth = 1; depth <= maxDepth; depth++) {
      // sắp xếp: nước tốt nhất lần trước lên đầu, rồi theo điểm lần trước
      root.sort((a, c) => (a === bestMove ? -1 : c === bestMove ? 1 : (rootScore.get(c) ?? -WIN * 2) - (rootScore.get(a) ?? -WIN * 2)));
      let alpha = -WIN - 1, iterBest = 0, iterScore = -WIN - 1;
      computeHash(b); pathHi[0] = hHi; pathLo[0] = hLo;
      const rootHi = hHi, rootLo = hLo;
      for (let k = 0; k < root.length; k++) {
        const m = root[k];
        const c = b.slice(); applyMove(c, m);
        let s;
        if (k === 0) s = -search(c, depth - 1, -WIN - 1, -alpha, 1);
        else {
          s = -search(c, depth - 1, -alpha - 1, -alpha, 1);
          if (!stopped && s > alpha) s = -search(c, depth - 1, -WIN - 1, -alpha, 1);
        }
        if (stopped) break;
        rootScore.set(m, s);
        if (s > iterScore) { iterScore = s; iterBest = m; }
        if (s > alpha) alpha = s;
      }
      if (stopped) {
        // dùng kết quả dở dang nếu nước đầu (nước tốt nhất cũ) đã được tính xong mà có nước khác tốt hơn
        if (iterBest && iterScore > bestScore - 1 && rootScore.has(iterBest)) { bestMove = iterBest; bestScore = iterScore; }
        break;
      }
      bestMove = iterBest; bestScore = iterScore; depthDone = depth;
      hHi = rootHi; hLo = rootLo;
      ttStore(depth, F_EXACT, bestScore, bestMove, 0);
      if (Math.abs(bestScore) > MATE_BOUND) break;
      if (now() - t0 > timeMs * 0.55) break;
    }
    return Object.assign(decode(bestMove, list, b), { score: bestScore, depth: depthDone, nodes, timeMs: now() - t0 });
  }

  const api = { chooseMove, positionKey, newGame: clearTT,
    // lộ ra để kiểm thử luật mô phỏng
    _test: { setup, gen: (b) => Array.from(moveBuf.subarray(0, gen(b, 0, false))), applyMove, TYPES,
      get WINNER() { return WINNER; }, get TURN() { return TURN; }, get POS() { return POS; }, get STN() { return STN; },
      get SLP() { return SLP; }, get HID() { return HID; }, get TA() { return TA; }, get TC() { return TC; } } };
  root.CothuAI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : globalThis);
