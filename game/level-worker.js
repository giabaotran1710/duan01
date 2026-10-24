// Dùng chung với trang dayhop.html (tệp này cũng được nạp như script thường)
function isBox(ch) {
  return ch === '$' || ch === '*';
}

function isFloor(ch) {
  return ch === ' ' || ch === '.';
}

function mulberry32(seed) {
        return function () {
          let t = seed += 0x6D2B79F5;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }

      function randInt(rand, min, max) {
        return Math.floor(rand() * (max - min + 1)) + min;
      }

     function shuffleWithRand(arr, rand) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = randInt(rand, 0, i);
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      function isWallCell(grid, r, c) {
        return r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] === '#';
      }

function toKey(r, c) {
  return `${r},${c}`;
}

function fromKey(key) {
  return key.split(',').map(Number);
}

/* =========================================================
   BỘ GIẢI THEO SỐ LẦN ĐẨY (nhanh hơn nhiều so với A* từng bước đi)
   - Trạng thái = vị trí các hộp + vùng người chơi có thể tới (chuẩn hoá về ô nhỏ nhất)
   - h = tổng quãng đường đẩy ngắn nhất của từng hộp tới đích gần nhất (không bao giờ đánh giá quá cao)
   - Ô "chết" (hộp vào là không thể tới đích) bị loại ngay
   Trả về lời giải ít lần đẩy nhất → dùng để đo độ hóc búa của màn.
   ========================================================= */
function computePushDist(grid, targetsSet) {
  const rows = grid.length, cols = grid[0].length;
  const dist = new Array(rows * cols).fill(Infinity);
  const q = [];
  for (const key of targetsSet) {
    const [r, c] = fromKey(key);
    dist[r * cols + c] = 0;
    q.push([r, c]);
  }
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (let qi = 0; qi < q.length; qi++) {
    const [r, c] = q[qi];
    const d0 = dist[r * cols + c];
    for (const [dr, dc] of dirs) {
      const pr = r - dr, pc = c - dc;           // hộp từng ở đây rồi bị đẩy tới (r,c)
      const sr = r - 2 * dr, sc = c - 2 * dc;   // người đứng đẩy
      if (isWallCell(grid, pr, pc) || isWallCell(grid, sr, sc)) continue;
      if (dist[pr * cols + pc] <= d0 + 1) continue;
      dist[pr * cols + pc] = d0 + 1;
      q.push([pr, pc]);
    }
  }
  return dist;
}

function solvePushes(grid, player, boxesSet, targetsSet, opts) {
  const rows = grid.length, cols = grid[0].length;
  const N = rows * cols;
  const maxNodes = (opts && opts.maxNodes) || 60000;
  const deadline = (opts && opts.deadline) || Infinity;
  const dist = computePushDist(grid, targetsSet);
  const wall = new Uint8Array(N);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === '#') wall[r * cols + c] = 1;
  const isTarget = new Uint8Array(N);
  for (const key of targetsSet) { const [r, c] = fromKey(key); isTarget[r * cols + c] = 1; }

  // láng giềng của từng ô (bỏ ô ngoài bàn), tính một lần
  const nbr = [];
  for (let i = 0; i < N; i++) {
    const r = (i / cols) | 0, c = i % cols, l = [];
    if (r > 0) l.push(i - cols);
    if (r < rows - 1) l.push(i + cols);
    if (c > 0) l.push(i - 1);
    if (c < cols - 1) l.push(i + 1);
    nbr.push(l);
  }
  const DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];

  const occ = new Uint8Array(N);          // ô đang có hộp (cập nhật tại chỗ)
  const mark = new Int32Array(N);
  const stack = new Int32Array(N);
  let stamp = 0;

  // vùng người chơi tới được từ pcell; trả về ô nhỏ nhất của vùng
  function flood(pcell) {
    stamp++;
    let top = 0, min = pcell;
    stack[top++] = pcell; mark[pcell] = stamp;
    while (top) {
      const cur = stack[--top];
      if (cur < min) min = cur;
      const l = nbr[cur];
      for (let k = 0; k < l.length; k++) {
        const n = l[k];
        if (wall[n] || occ[n] || mark[n] === stamp) continue;
        mark[n] = stamp;
        stack[top++] = n;
      }
    }
    return min;
  }

  const startBoxes = [...boxesSet].map(k => { const [r, c] = fromKey(k); return r * cols + c; }).sort((a, b) => a - b);
  for (const b of startBoxes) if (dist[b] === Infinity) return { solvable: false };
  for (const b of startBoxes) occ[b] = 1;
  const startMin = flood(player.r * cols + player.c);
  for (const b of startBoxes) occ[b] = 0;

  const keyOf = (boxes, pmin) => boxes.join(',') + '|' + pmin;
  const hOf = boxes => { let h = 0; for (let i = 0; i < boxes.length; i++) h += dist[boxes[i]]; return h; };

  const heap = [];
  const less = (a, b) => a.f < b.f || (a.f === b.f && a.g > b.g);
  function push(n) { heap.push(n); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!less(heap[i], heap[p])) break; const t = heap[i]; heap[i] = heap[p]; heap[p] = t; i = p; } }
  function pop() { const t = heap[0], e = heap.pop(); if (heap.length) { heap[0] = e; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; const t2 = heap[i]; heap[i] = heap[m]; heap[m] = t2; i = m; } } return t; }

  const startKey = keyOf(startBoxes, startMin);
  const best = new Map([[startKey, 0]]);
  const parent = new Map();
  push({ boxes: startBoxes, pmin: startMin, g: 0, f: hOf(startBoxes), key: startKey });
  let explored = 0;
  const reach = new Uint8Array(N);

  while (heap.length) {
    const cur = pop();
    if (cur.g !== best.get(cur.key)) continue;
    explored++;
    if (explored > maxNodes || ((explored & 255) === 0 && Date.now() > deadline)) return { solvable: null, explored };

    const cb = cur.boxes;
    let done = true;
    for (let i = 0; i < cb.length; i++) if (!isTarget[cb[i]]) { done = false; break; }
    if (done) {
      const pushes = [];
      let k = cur.key;
      while (k !== startKey) { const pr = parent.get(k); pushes.push(pr.push); k = pr.prev; }
      pushes.reverse();
      return { solvable: true, pushes: pushes.length, list: pushes, explored };
    }

    // vùng tới được của trạng thái hiện tại
    for (let i = 0; i < cb.length; i++) occ[cb[i]] = 1;
    flood(cur.pmin);
    for (let i = 0; i < N; i++) reach[i] = mark[i] === stamp ? 1 : 0;

    for (let bi = 0; bi < cb.length; bi++) {
      const b = cb[bi];
      const r = (b / cols) | 0, c = b % cols;
      for (let di = 0; di < 4; di++) {
        const fr = r - DR[di], fc = c - DC[di];
        const tr = r + DR[di], tc = c + DC[di];
        if (fr < 0 || fr >= rows || fc < 0 || fc >= cols || tr < 0 || tr >= rows || tc < 0 || tc >= cols) continue;
        const from = fr * cols + fc, to = tr * cols + tc;
        if (!reach[from]) continue;
        if (wall[to] || occ[to] || dist[to] === Infinity) continue;
        const nb = cb.slice(); nb[bi] = to; nb.sort((x, y) => x - y);
        occ[b] = 0; occ[to] = 1;                 // áp dụng nước đẩy để tính vùng mới
        const npm = flood(b);
        occ[b] = 1; occ[to] = 0;
        const nk = keyOf(nb, npm);
        const ng = cur.g + 1;
        const old = best.get(nk);
        if (old !== undefined && old <= ng) continue;
        best.set(nk, ng);
        parent.set(nk, { prev: cur.key, push: { from: b, dir: di } });
        push({ boxes: nb, pmin: npm, g: ng, f: ng + hOf(nb), key: nk });
      }
    }
    for (let i = 0; i < cb.length; i++) occ[cb[i]] = 0;
  }
  return { solvable: false, explored };
}

// Phân tích một màn có sẵn (màn chia sẻ): giải được không và số bước theo lời giải ít lần đẩy nhất
/* =========================================================
   BỘ GIẢI TỐI ƯU THEO SỐ BƯỚC ĐI (dùng cho số bước 3 sao và gợi ý Developer)
   - Mỗi "cạnh" là một lần đẩy, chi phí = quãng đường người chơi đi tới chỗ đẩy + 1 bước đẩy
   - Trạng thái gồm vị trí chính xác của người chơi (sau khi đẩy người đứng ở ô hộp cũ)
   - h = ghép cặp hộp–đích ít lần đẩy nhất + quãng đi bộ tới chỗ đẩy kế tiếp → không đánh giá quá cao,
     nên số bước tìm được là NHỎ NHẤT thật sự (không có cách nào thắng sớm hơn)
   - cắt nhánh: ô chết, bế tắc đóng băng; trạng thái lưu bằng mảng + băm Zobrist để chạy nhanh
   Trả về { solvable, moves, pushes, list } hoặc solvable = null nếu hết giờ / vượt số nút.
   ========================================================= */
function solveMoves(grid, player, boxesSet, targetsSet, opts) {
  const rows = grid.length, cols = grid[0].length;
  const N = rows * cols;
  const maxNodes = (opts && opts.maxNodes) || 400000;
  const deadline = (opts && opts.deadline) || Infinity;
  const INF = 1e6;
  const wall = new Uint8Array(N);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === '#') wall[r * cols + c] = 1;
  const isTarget = new Uint8Array(N);
  const tgt = [];
  for (const key of targetsSet) { const [r, c] = fromKey(key); isTarget[r * cols + c] = 1; tgt.push(r * cols + c); }
  const nbr = [];
  for (let i = 0; i < N; i++) {
    const r = (i / cols) | 0, c = i % cols, l = [];
    if (r > 0) l.push(i - cols);
    if (r < rows - 1) l.push(i + cols);
    if (c > 0) l.push(i - 1);
    if (c < cols - 1) l.push(i + 1);
    nbr.push(l);
  }
  const DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];
  const isW = (r, c) => r < 0 || r >= rows || c < 0 || c >= cols || wall[r * cols + c] === 1;

  // số lần đẩy ít nhất để đưa một hộp từ mỗi ô tới TỪNG đích (bỏ qua các hộp khác)
  const T = tgt.length;
  if (boxesSet.size !== T) return solveMovesBasic(grid, player, boxesSet, targetsSet, opts);
  const pd = [];
  const pdist = new Int32Array(N).fill(INF);   // tới đích gần nhất; INF = ô chết
  for (let t = 0; t < T; t++) {
    const d = new Int32Array(N).fill(INF);
    const q = [tgt[t]]; d[tgt[t]] = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const cur = q[qi], r = (cur / cols) | 0, c = cur % cols;
      for (let di = 0; di < 4; di++) {
        const pr = r - DR[di], pc = c - DC[di], sr = r - 2 * DR[di], sc = c - 2 * DC[di];
        if (isW(pr, pc) || isW(sr, sc)) continue;
        const pi = pr * cols + pc;
        if (d[pi] !== INF) continue;
        d[pi] = d[cur] + 1; q.push(pi);
      }
    }
    pd.push(d);
    for (let i = 0; i < N; i++) if (d[i] < pdist[i]) pdist[i] = d[i];
  }

  // h = ghép cặp hộp–đích có tổng số lần đẩy nhỏ nhất (thuật toán Hungary) → vẫn không đánh giá quá cao
  const n = T;
  const hu = new Float64Array(n + 1), hv = new Float64Array(n + 1), minv = new Float64Array(n + 1);
  const hp = new Int32Array(n + 1), way = new Int32Array(n + 1);
  const used = new Uint8Array(n + 1);
  const near = new Int32Array(N).fill(-1);   // đích gần nhất của từng ô
  for (let i = 0; i < N; i++) for (let t = 0; t < T; t++) if (pd[t][i] === pdist[i] && pdist[i] < INF) { near[i] = t; break; }
  const seen = new Int32Array(n);
  let seenStamp = 0;
  function hOf(boxes) {
    if (boxes.length !== n) return INF;
    // nhanh: nếu mỗi hộp về đích gần nhất mà không trùng nhau thì đó chính là cách ghép tốt nhất
    seenStamp++;
    let s0 = 0, clash = false;
    for (let i = 0; i < n; i++) {
      const t = near[boxes[i]];
      if (t < 0) return INF;
      if (seen[t] === seenStamp) { clash = true; break; }
      seen[t] = seenStamp; s0 += pdist[boxes[i]];
    }
    if (!clash) return s0;
    hu.fill(0); hv.fill(0); hp.fill(0); way.fill(0);
    for (let i = 1; i <= n; i++) {
      hp[0] = i; let j0 = 0;
      minv.fill(Infinity); used.fill(0);
      const bi = boxes;
      do {
        used[j0] = 1;
        const i0 = hp[j0]; let delta = Infinity, j1 = 0;
        const cell = bi[i0 - 1];
        for (let j = 1; j <= n; j++) if (!used[j]) {
          const cur = pd[j - 1][cell] - hu[i0] - hv[j];
          if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
          if (minv[j] < delta) { delta = minv[j]; j1 = j; }
        }
        for (let j = 0; j <= n; j++) {
          if (used[j]) { hu[hp[j]] += delta; hv[j] -= delta; } else minv[j] -= delta;
        }
        j0 = j1;
      } while (hp[j0] !== 0);
      do { const j1 = way[j0]; hp[j0] = hp[j1]; j0 = j1; } while (j0);
    }
    let s = 0;
    for (let j = 1; j <= n; j++) s += pd[j - 1][boxes[hp[j] - 1]];
    return s >= INF ? INF : s;
  }

  const occ = new Uint8Array(N);
  // bế tắc "đóng băng": hộp vừa đẩy không thể di chuyển theo cả hai trục (tính cả các hộp chặn nhau),
  // và trong nhóm bị đóng băng có hộp chưa nằm trên đích → không thể thắng
  const vis = new Int32Array(N);
  let visStamp = 0, chainBad = false;
  const solid = (i) => wall[i] === 1 || vis[i] === visStamp;
  function frozenAt(i) {
    vis[i] = visStamp;
    if (!isTarget[i]) chainBad = true;
    return blockedAxis(i, 1) && blockedAxis(i, cols);
  }
  function blockedAxis(i, step) {
    const a = i - step, b = i + step;
    if (solid(a) || solid(b)) return true;
    if (pdist[a] >= INF && pdist[b] >= INF) return true;
    if (occ[a] && frozenAt(a)) return true;
    if (occ[b] && frozenAt(b)) return true;
    return false;
  }
  function frozenDead(to) {
    visStamp++; chainBad = false;
    return frozenAt(to) && chainBad;
  }

  const wd = new Int32Array(N);
  const queue = new Int32Array(N);
  function walk(p) {
    wd.fill(-1);
    let h = 0, t = 0;
    queue[t++] = p; wd[p] = 0;
    while (h < t) {
      const cur = queue[h++];
      const l = nbr[cur];
      for (let k = 0; k < l.length; k++) {
        const m = l[k];
        if (wall[m] || occ[m] || wd[m] !== -1) continue;
        wd[m] = wd[cur] + 1;
        queue[t++] = m;
      }
    }
  }

  // băm Zobrist (2 x 32 bit) → khoá số
  const rf = mulberry32(0x5eed1234);   // phải là bộ sinh phi tuyến (xorshift tuyến tính gây trùng khoá)
  const rnd = () => (rf() * 4294967296) >>> 0;
  const zb1 = new Uint32Array(N), zb2 = new Uint32Array(N), zp1 = new Uint32Array(N), zp2 = new Uint32Array(N);
  for (let i = 0; i < N; i++) { zb1[i] = rnd(); zb2[i] = rnd(); zp1[i] = rnd(); zp2[i] = rnd(); }
  // bảng băm mở (khoá = 2 số 32 bit) → chỉ số; không tạo đối tượng để tránh GC
  function makeTable(bits) {
    let size = 1 << bits, mask = size - 1, A = new Uint32Array(size), B = new Uint32Array(size), V = new Int32Array(size).fill(-1), cnt = 0;
    const t = {
      get(a, b) { let i = (a ^ (b * 0x9e3779b1)) & mask; for (;;) { const v = V[i]; if (v < 0) return -1; if (A[i] === a && B[i] === b) return v; i = (i + 1) & mask; } },
      set(a, b, val) {
        if ((cnt + 1) * 2 > size) grow();
        let i = (a ^ (b * 0x9e3779b1)) & mask;
        for (;;) { if (V[i] < 0) { A[i] = a; B[i] = b; V[i] = val; cnt++; return; } if (A[i] === a && B[i] === b) { V[i] = val; return; } i = (i + 1) & mask; }
      }
    };
    function grow() {
      const oA = A, oB = B, oV = V;
      size <<= 1; mask = size - 1; A = new Uint32Array(size); B = new Uint32Array(size); V = new Int32Array(size).fill(-1); cnt = 0;
      for (let i = 0; i < oV.length; i++) if (oV[i] >= 0) t.set(oA[i], oB[i], oV[i]);
    }
    return t;
  }

  const startBoxes = [...boxesSet].map(k => { const [r, c] = fromKey(k); return r * cols + c; }).sort((a, b) => a - b);
  const startP = player.r * cols + player.c;
  const h0 = hOf(startBoxes);
  if (h0 >= INF) return { solvable: false };
  let s1 = zp1[startP], s2 = zp2[startP];
  for (const b of startBoxes) { s1 ^= zb1[b]; s2 ^= zb2[b]; }
  s1 >>>= 0; s2 >>>= 0;

  // kho trạng thái dạng mảng
  const nb = startBoxes.length;
  let cap = 1 << 16;
  let K1 = new Uint32Array(cap), K2 = new Uint32Array(cap), G = new Int32Array(cap), H = new Int32Array(cap);
  let P = new Int32Array(cap), PAR = new Int32Array(cap), PUSH = new Int32Array(cap), LZ = new Uint8Array(cap), BX = new Int16Array(cap * nb);
  let count = 0;
  const MAX_STATES = 5000000;   // giữ bộ nhớ ở mức chấp nhận được trên điện thoại
  function grow() {
    cap *= 2;
    const g32 = (o, T) => { const x = new T(T === Int16Array ? cap * nb : cap); x.set(o); return x; };
    K1 = g32(K1, Uint32Array); K2 = g32(K2, Uint32Array); G = g32(G, Int32Array); H = g32(H, Int32Array);
    P = g32(P, Int32Array); PAR = g32(PAR, Int32Array); PUSH = g32(PUSH, Int32Array); LZ = g32(LZ, Uint8Array); BX = g32(BX, Int16Array);
  }
  const table = makeTable(16);
  const hTable = makeTable(14);
  const tmp = new Int32Array(nb);

  // hàng đợi theo f (số nguyên) – trong cùng f ưu tiên g lớn
  const buckets = [];
  let minF = h0, open = 0;
  function enqueue(id, f, g) {
    let bf = buckets[f]; if (!bf) bf = buckets[f] = [];
    let bg = bf[g]; if (!bg) bg = bf[g] = [];
    bg.push(id); open++;
    if (f < minF) minF = f;
  }

  K1[0] = s1; K2[0] = s2; G[0] = 0; H[0] = h0; P[0] = startP; PAR[0] = -1;
  for (let i = 0; i < nb; i++) BX[i] = startBoxes[i];
  count = 1; table.set(s1, s2, 0);
  enqueue(0, h0, 0);
  let explored = 0;
  const cb = new Int32Array(nb);

  while (open) {
    // lấy phần tử nhỏ nhất
    let id = -1, gq = 0;
    for (;;) {
      const bf = buckets[minF];
      if (bf) { let g = bf.length - 1; for (; g >= 0; g--) { const bg = bf[g]; if (bg && bg.length) { id = bg.pop(); gq = g; break; } } if (id >= 0) break; buckets[minF] = undefined; }
      minF++;
    }
    open--;
    if (G[id] !== gq) continue;   // đã có đường tốt hơn

    if (H[id] === 0) {
      const list = [];
      for (let k = id; PAR[k] >= 0; k = PAR[k]) list.push({ from: PUSH[k] >> 2, dir: PUSH[k] & 3 });
      list.reverse();
      return { solvable: true, moves: G[id], pushes: list.length, list, explored, states: count };
    }

    const base = id * nb, cp = P[id], ck1 = K1[id], ck2 = K2[id], cg = G[id];
    for (let i = 0; i < nb; i++) { cb[i] = BX[base + i]; occ[cb[i]] = 1; }
    walk(cp);

    // cận dưới thêm: người chơi phải đi tới chỗ đẩy đầu tiên (đánh giá lại lười)
    if (!LZ[id]) {
      let w = INF;
      for (let bi = 0; bi < nb && w > 0; bi++) {
        const b = cb[bi], r = (b / cols) | 0, c = b % cols;
        for (let di = 0; di < 4; di++) {
          const fr = r - DR[di], fc = c - DC[di], tr = r + DR[di], tc = c + DC[di];
          if (isW(fr, fc) || isW(tr, tc)) continue;
          const from = fr * cols + fc, to = tr * cols + tc;
          if (wd[from] < 0 || occ[to] || pdist[to] >= INF) continue;
          if (wd[from] < w) w = wd[from];
        }
      }
      if (w >= INF || w > 0) {
        for (let i = 0; i < nb; i++) occ[cb[i]] = 0;
        if (w < INF) { LZ[id] = 1; enqueue(id, cg + H[id] + w, cg); }
        continue;
      }
    }

    explored++;
    if (explored > maxNodes || count > MAX_STATES || ((explored & 255) === 0 && Date.now() > deadline)) {
      for (let i = 0; i < nb; i++) occ[cb[i]] = 0;
      return { solvable: null, explored };
    }

    for (let bi = 0; bi < nb; bi++) {
      const b = cb[bi];
      const r = (b / cols) | 0, c = b % cols;
      for (let di = 0; di < 4; di++) {
        const fr = r - DR[di], fc = c - DC[di];
        const tr = r + DR[di], tc = c + DC[di];
        if (isW(fr, fc) || isW(tr, tc)) continue;
        const from = fr * cols + fc, to = tr * cols + tc;
        if (wd[from] < 0) continue;
        if (occ[to] || pdist[to] >= INF) continue;
        occ[b] = 0; occ[to] = 1;
        const dead = frozenDead(to);
        occ[b] = 1; occ[to] = 0;
        if (dead) continue;
        const ng = cg + wd[from] + 1;
        const bh1 = (ck1 ^ zp1[cp] ^ zb1[b] ^ zb1[to]) >>> 0, bh2 = (ck2 ^ zp2[cp] ^ zb2[b] ^ zb2[to]) >>> 0;
        const n1 = (bh1 ^ zp1[b]) >>> 0, n2 = (bh2 ^ zp2[b]) >>> 0;
        let sid = table.get(n1, n2);
        if (sid >= 0 && G[sid] <= ng) continue;
        let nh;
        if (sid >= 0) nh = H[sid];
        else {
          const hv = hTable.get(bh1, bh2);
          if (hv >= 0) nh = hv;
          else {
            for (let i = 0; i < nb; i++) tmp[i] = cb[i];
            tmp[bi] = to;
            nh = hOf(tmp);
            hTable.set(bh1, bh2, nh);
          }
          if (nh >= INF) continue;
          if (count >= cap) grow();
          sid = count++;
          K1[sid] = n1; K2[sid] = n2; H[sid] = nh; P[sid] = b;
          const nbase = sid * nb;
          for (let i = 0; i < nb; i++) BX[nbase + i] = cb[i];
          BX[nbase + bi] = to;
          table.set(n1, n2, sid);
        }
        G[sid] = ng; PAR[sid] = id; PUSH[sid] = (b << 2) | di; LZ[sid] = 0;
        enqueue(sid, ng + nh, ng);
      }
    }
    for (let i = 0; i < nb; i++) occ[cb[i]] = 0;
  }
  return { solvable: false, explored };
}

// Bản đơn giản (dùng khi số hộp khác số đích)
function solveMovesBasic(grid, player, boxesSet, targetsSet, opts) {
  const rows = grid.length, cols = grid[0].length;
  const N = rows * cols;
  const maxNodes = (opts && opts.maxNodes) || 400000;
  const deadline = (opts && opts.deadline) || Infinity;
  const pdist = computePushDist(grid, targetsSet);
  const wall = new Uint8Array(N);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === '#') wall[r * cols + c] = 1;
  const isTarget = new Uint8Array(N);
  for (const key of targetsSet) { const [r, c] = fromKey(key); isTarget[r * cols + c] = 1; }
  const nbr = [];
  for (let i = 0; i < N; i++) {
    const r = (i / cols) | 0, c = i % cols, l = [];
    if (r > 0) l.push(i - cols);
    if (r < rows - 1) l.push(i + cols);
    if (c > 0) l.push(i - 1);
    if (c < cols - 1) l.push(i + 1);
    nbr.push(l);
  }
  const DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];
  const occ = new Uint8Array(N);
  const wd = new Int32Array(N);
  const queue = new Int32Array(N);
  // khoảng cách đi bộ từ p tới mọi ô (hộp là vật cản)
  function walk(p) {
    wd.fill(-1);
    let h = 0, t = 0;
    queue[t++] = p; wd[p] = 0;
    while (h < t) {
      const cur = queue[h++];
      const l = nbr[cur];
      for (let k = 0; k < l.length; k++) {
        const n = l[k];
        if (wall[n] || occ[n] || wd[n] !== -1) continue;
        wd[n] = wd[cur] + 1;
        queue[t++] = n;
      }
    }
  }

  const startBoxes = [...boxesSet].map(k => { const [r, c] = fromKey(k); return r * cols + c; }).sort((a, b) => a - b);
  for (const b of startBoxes) if (pdist[b] === Infinity) return { solvable: false };
  const startP = player.r * cols + player.c;
  const keyOf = (boxes, p) => boxes.join(',') + '|' + p;
  const hOf = boxes => { let h = 0; for (let i = 0; i < boxes.length; i++) h += pdist[boxes[i]]; return h; };

  const heap = [];
  const less = (a, b) => a.f < b.f || (a.f === b.f && a.g > b.g);
  function push(n) { heap.push(n); let i = heap.length - 1; while (i > 0) { const q = (i - 1) >> 1; if (!less(heap[i], heap[q])) break; const t = heap[i]; heap[i] = heap[q]; heap[q] = t; i = q; } }
  function pop() { const t = heap[0], e = heap.pop(); if (heap.length) { heap[0] = e; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && less(heap[l], heap[m])) m = l; if (r < heap.length && less(heap[r], heap[m])) m = r; if (m === i) break; const t2 = heap[i]; heap[i] = heap[m]; heap[m] = t2; i = m; } } return t; }

  const startKey = keyOf(startBoxes, startP);
  const best = new Map([[startKey, 0]]);
  const parent = new Map();
  push({ boxes: startBoxes, p: startP, g: 0, f: hOf(startBoxes), key: startKey });
  let explored = 0;

  while (heap.length) {
    const cur = pop();
    if (cur.g !== best.get(cur.key)) continue;
    explored++;
    if (explored > maxNodes || ((explored & 255) === 0 && Date.now() > deadline)) return { solvable: null, explored };

    const cb = cur.boxes;
    let done = true;
    for (let i = 0; i < cb.length; i++) if (!isTarget[cb[i]]) { done = false; break; }
    if (done) {
      const list = [];
      let k = cur.key;
      while (k !== startKey) { const pr = parent.get(k); list.push(pr.push); k = pr.prev; }
      list.reverse();
      return { solvable: true, moves: cur.g, pushes: list.length, list, explored };
    }

    for (let i = 0; i < cb.length; i++) occ[cb[i]] = 1;
    walk(cur.p);
    for (let bi = 0; bi < cb.length; bi++) {
      const b = cb[bi];
      const r = (b / cols) | 0, c = b % cols;
      for (let di = 0; di < 4; di++) {
        const fr = r - DR[di], fc = c - DC[di];
        const tr = r + DR[di], tc = c + DC[di];
        if (fr < 0 || fr >= rows || fc < 0 || fc >= cols || tr < 0 || tr >= rows || tc < 0 || tc >= cols) continue;
        const from = fr * cols + fc, to = tr * cols + tc;
        if (wd[from] < 0) continue;
        if (wall[to] || occ[to] || pdist[to] === Infinity) continue;
        const nb = cb.slice(); nb[bi] = to; nb.sort((x, y) => x - y);
        const ng = cur.g + wd[from] + 1;
        const nk = keyOf(nb, b);
        const old = best.get(nk);
        if (old !== undefined && old <= ng) continue;
        best.set(nk, ng);
        parent.set(nk, { prev: cur.key, push: { from: b, dir: di } });
        push({ boxes: nb, p: b, g: ng, f: ng + hOf(nb), key: nk });
      }
    }
    for (let i = 0; i < cb.length; i++) occ[cb[i]] = 0;
  }
  return { solvable: false, explored };
}

// Chuyển lời giải (danh sách lần đẩy) thành chuỗi bước U/D/L/R và danh sách khoá trạng thái trước mỗi bước.
// Khoá = "r,c|" + các ô hộp (đã sắp xếp) nối bằng ";" — client dùng cùng cách tạo khoá để tra cứu.
function stateKeyOf(r, c, boxes) {
  return r + ',' + c + '|' + [...boxes].sort().join(';');
}

function solutionToPath(grid, player, boxesSet, list) {
  const cols = grid[0].length;
  const D = [[-1, 0, 'U'], [1, 0, 'D'], [0, -1, 'L'], [0, 1, 'R']];
  const boxes = new Set(boxesSet);
  let pr = player.r, pc = player.c;
  const moves = [];
  const keys = [stateKeyOf(pr, pc, boxes)];

  const step = (ch) => {
    const d = D.find(x => x[2] === ch);
    const nr = pr + d[0], nc = pc + d[1], k = toKey(nr, nc);
    if (boxes.has(k)) { boxes.delete(k); boxes.add(toKey(nr + d[0], nc + d[1])); }
    pr = nr; pc = nc;
    moves.push(ch);
    keys.push(stateKeyOf(pr, pc, boxes));
  };

  for (const p of list) {
    const r = (p.from / cols) | 0, c = p.from % cols;
    const sr = r - D[p.dir][0], sc = c - D[p.dir][1];
    const prev = new Map([[toKey(pr, pc), null]]);
    const q = [[pr, pc]];
    for (let qi = 0; qi < q.length; qi++) {
      const [qr, qc] = q[qi];
      if (qr === sr && qc === sc) break;
      for (const [dr, dc, ch] of D) {
        const nr = qr + dr, nc = qc + dc, k = toKey(nr, nc);
        if (isWallCell(grid, nr, nc) || boxes.has(k) || prev.has(k)) continue;
        prev.set(k, { from: toKey(qr, qc), ch });
        q.push([nr, nc]);
      }
    }
    let k = toKey(sr, sc), seg = [];
    while (prev.get(k)) { seg.push(prev.get(k).ch); k = prev.get(k).from; }
    seg.reverse();
    for (const ch of seg) step(ch);
    step(D[p.dir][2]);
  }
  return { path: moves.join(''), keys };
}

// Gợi ý nước đi tiếp theo (Developer Mode): ký tự U/D/L/R của bước đầu tiên trên lời giải ít lần đẩy nhất
// Đo độ hóc búa từ lời giải ít lần đẩy nhất: số lần đẩy, số bước đi, số lần đổi hộp, số lần hộp đổi hướng
/* =========================================================
   SINH MÀN (bản 2) — độ khó dựa trên cấu trúc, không dựa vào số hộp
   1) Địa hình ghép từ các khối mẫu 3x3 (phòng, hành lang hẹp, cột, góc) → có lối đi chật, góc chết.
   2) Đặt đích, rồi khám phá TOÀN BỘ không gian trạng thái bằng cách "kéo ngược" từ thế thắng:
      mọi thế trong tập này đều giải được, thế ngoài tập là bế tắc → biết chính xác đâu là nước "bẫy".
   3) Chấm điểm từng thế bắt đầu:
      - số lần đẩy tối thiểu,
      - số nước bẫy dọc đường giải (đẩy sai 1 nước là kẹt vĩnh viễn; bế tắc khó thấy được điểm cao hơn đẩy vào góc),
      - số lần phải đổi hộp, hộp nằm sát nhau, hộp xa đích, người chơi bị kẹp giữa các hộp.
   ========================================================= */

const MAP_TEMPLATES = [
  ["...", "...", "..."],
  ["#..", "...", "..."],
  ["##.", "#..", "..."],
  ["###", "...", "..."],
  ["###", "#..", "#.."],
  ["#..", "#..", "#.."],
  [".#.", "...", "..."],
  ["...", ".#.", "..."],
  ["##.", "##.", "..."],
  ["#..", "...", "..#"],
  [".#.", ".#.", "..."],
  [".##", "...", "##."],
  ["#.#", "...", "..."],
  ["###", "###", "###"],
  ["#..", "...", ".#."],
  ["..#", ".##", "..."]
];

function templateCells(t, rot, mirror) {
  // trả về ma trận 3x3 sau khi xoay/lật
  let m = t.map(row => row.split(''));
  if (mirror) m = m.map(row => row.slice().reverse());
  for (let k = 0; k < rot; k++) m = m[0].map((_, c) => m.map(row => row[c]).reverse());
  return m;
}

function buildTemplateMap(rand, bw, bh, minFloor, maxFloor) {
  const rows = bh * 3 + 2, cols = bw * 3 + 2;
  const g = Array.from({ length: rows }, () => Array(cols).fill('#'));
  for (let by = 0; by < bh; by++) for (let bx = 0; bx < bw; bx++) {
    // khối trống ít được chọn hơn để địa hình có nhiều chi tiết
    let t = MAP_TEMPLATES[Math.floor(rand() * MAP_TEMPLATES.length)];
    if (t === MAP_TEMPLATES[0] && rand() < 0.5) t = MAP_TEMPLATES[1 + Math.floor(rand() * (MAP_TEMPLATES.length - 1))];
    const m = templateCells(t, Math.floor(rand() * 4), rand() < 0.5);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) g[1 + by * 3 + r][1 + bx * 3 + c] = m[r][c] === '#' ? '#' : ' ';
  }
  const isF = (r, c) => r > 0 && c > 0 && r < rows - 1 && c < cols - 1 && g[r][c] === ' ';
  // lấp ngõ cụt (ô trống có ≥3 mặt tường) — vô dụng cho việc đẩy hộp
  for (let changed = true; changed;) {
    changed = false;
    for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
      if (g[r][c] !== ' ') continue;
      const n = isF(r - 1, c) + isF(r + 1, c) + isF(r, c - 1) + isF(r, c + 1);
      if (n <= 1) { g[r][c] = '#'; changed = true; }
    }
  }
  // giữ vùng liên thông lớn nhất
  const comp = Array.from({ length: rows }, () => Array(cols).fill(-1));
  let bestId = -1, bestSize = 0, id = 0;
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    if (!isF(r, c) || comp[r][c] >= 0) continue;
    let size = 0; const q = [[r, c]]; comp[r][c] = id;
    while (q.length) {
      const [a, b] = q.pop(); size++;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const na = a + dr, nb = b + dc;
        if (isF(na, nb) && comp[na][nb] < 0) { comp[na][nb] = id; q.push([na, nb]); }
      }
    }
    if (size > bestSize) { bestSize = size; bestId = id; }
    id++;
  }
  if (bestSize < minFloor || bestSize > maxFloor) return null;
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) if (g[r][c] === ' ' && comp[r][c] !== bestId) g[r][c] = '#';
  // quá thoáng (có vùng trống 3x4) thì bỏ — màn thoáng dễ xoay xở, không có thế bí
  for (let r = 1; r + 2 < rows - 1; r++) for (let c = 1; c + 2 < cols - 1; c++) {
    let open33 = true;
    for (let a = 0; a < 3 && open33; a++) for (let b = 0; b < 3; b++) if (g[r + a][c + b] !== ' ') { open33 = false; break; }
    if (!open33) continue;
    const ext = (r + 3 < rows - 1 && [0, 1, 2].every(b => g[r + 3][c + b] === ' ')) || (c + 3 < cols - 1 && [0, 1, 2].every(a => g[r + a][c + 3] === ' '));
    if (ext) return null;
  }
  // cắt viền tường thừa
  let r0 = rows, r1 = 0, c0 = cols, c1 = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (g[r][c] === ' ') { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  return g.slice(r0 - 1, r1 + 2).map(row => row.slice(c0 - 1, c1 + 2));
}

// Khám phá toàn bộ không gian trạng thái từ thế thắng bằng nước kéo ngược.
// Trạng thái = tập ô hộp + vùng người chơi (đại diện bằng ô nhỏ nhất). depth = số lần đẩy ít nhất tới thế thắng.
function exploreStateSpace(grid, targetCells, cap, deadline) {
  const rows = grid.length, cols = grid[0].length;
  const fl = [], idxOf = new Int32Array(rows * cols).fill(-1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] !== '#') { idxOf[r * cols + c] = fl.length; fl.push(r * cols + c); }
  const F = fl.length;
  if (F > 63) return null;
  const nb = [];   // nb[i*4+d]
  const DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];
  for (let i = 0; i < F; i++) {
    const r = (fl[i] / cols) | 0, c = fl[i] % cols;
    for (let d = 0; d < 4; d++) {
      const nr = r + DR[d], nc = c + DC[d];
      nb.push(nr >= 0 && nc >= 0 && nr < rows && nc < cols ? idxOf[nr * cols + nc] : -1);
    }
  }
  const n = targetCells.length;
  const occ = new Uint8Array(F), mark = new Int32Array(F), stack = new Int32Array(F);
  let stamp = 0;
  function flood(p) {
    stamp++; let top = 0, mn = p; stack[top++] = p; mark[p] = stamp;
    while (top) { const cur = stack[--top]; if (cur < mn) mn = cur; for (let d = 0; d < 4; d++) { const m = nb[cur * 4 + d]; if (m < 0 || occ[m] || mark[m] === stamp) continue; mark[m] = stamp; stack[top++] = m; } }
    return mn;
  }
  const enc = (bx, rep) => { let k = 0; for (let i = 0; i < n; i++) k = k * 64 + bx[i]; return k * 64 + rep; };
  const dec = (k, bx) => { const rep = k % 64; k = (k - rep) / 64; for (let i = n - 1; i >= 0; i--) { bx[i] = k % 64; k = (k - bx[i]) / 64; } return rep; };

  const goal = targetCells.map(c => idxOf[c]).sort((a, b) => a - b);
  const depth = new Map();
  let frontier = [];
  for (const b of goal) occ[b] = 1;
  const seenRep = new Set();
  for (let i = 0; i < F; i++) {
    if (occ[i]) continue;
    const rep = flood(i);
    if (seenRep.has(rep)) continue;
    seenRep.add(rep);
    const k = enc(goal, rep); depth.set(k, 0); frontier.push(k);
  }
  for (const b of goal) occ[b] = 0;

  const bx = new Int32Array(n), nbx = new Int32Array(n);
  let d = 0;
  while (frontier.length) {
    const next = [];
    for (const k of frontier) {
      const rep = dec(k, bx);
      for (let i = 0; i < n; i++) occ[bx[i]] = 1;
      flood(rep);
      let st = stamp;
      for (let i = 0; i < n; i++) {
        const b = bx[i];
        for (let dd = 0; dd < 4; dd++) {
          const p = nb[b * 4 + dd];            // người đứng cạnh hộp
          if (p < 0 || mark[p] !== st) continue;
          const q = nb[p * 4 + dd];            // lùi thêm 1 ô (kéo hộp theo)
          if (q < 0 || occ[q]) continue;
          // áp dụng: hộp b → p, người → q
          occ[b] = 0; occ[p] = 1;
          const nrep = flood(q);
          occ[p] = 0; occ[b] = 1;
          for (let j = 0; j < n; j++) nbx[j] = bx[j];
          nbx[i] = p;
          // sắp xếp chèn
          for (let a = 1; a < n; a++) { const v = nbx[a]; let c = a - 1; while (c >= 0 && nbx[c] > v) { nbx[c + 1] = nbx[c]; c--; } nbx[c + 1] = v; }
          const nk = enc(nbx, nrep);
          if (!depth.has(nk)) { depth.set(nk, d + 1); next.push(nk); }
          // flood() đã ghi đè mark: dựng lại vùng hiện tại
          flood(rep); st = stamp;
        }
      }
      for (let i = 0; i < n; i++) occ[bx[i]] = 0;
      if (depth.size > cap || Date.now() > deadline) return null;
    }
    frontier = next; d++;
  }
  return { depth, F, fl, idxOf, nb, n, enc, dec, flood, occ, mark, getStamp: () => stamp, maxDepth: d - 1 };
}

// Chấm điểm một thế bắt đầu (khoá k trong không gian trạng thái)
function scoreStart(sp, k, pdistIdx) {
  const { depth, n, nb, enc, dec, flood, occ, mark } = sp;
  const bx = new Int32Array(n), nbx = new Int32Array(n);
  let rep = dec(k, bx);
  const D = depth.get(k);
  let traps = 0, subtle = 0, switches = 0, choiceSum = 0, lastBox = -1, steps = 0;
  let curK = k;
  const path = [];   // các lần đẩy [ô hộp, ô tới] theo chỉ số ô trống
  // đi theo một đường tối ưu (ưu tiên đẩy tiếp hộp vừa đẩy → số lần đổi hộp là ít nhất có thể theo đường này)
  while (depth.get(curK) > 0) {
    const cd = depth.get(curK);
    rep = dec(curK, bx);
    for (let i = 0; i < n; i++) occ[bx[i]] = 1;
    flood(rep);
    const st = sp.getStamp();
    const reach = new Uint8Array(sp.F);
    for (let i = 0; i < sp.F; i++) reach[i] = mark[i] === st ? 1 : 0;
    let bestK = -1, bestTo = -1, bestFrom = -1, bestSame = false, good = 0, legal = 0;
    for (let i = 0; i < n; i++) {
      const b = bx[i];
      for (let dd = 0; dd < 4; dd++) {
        const s = nb[b * 4 + (dd ^ 1)];        // ô người đứng đẩy (phía đối diện)
        const t = nb[b * 4 + dd];              // ô hộp đi tới
        if (s < 0 || t < 0 || !reach[s] || occ[t]) continue;
        legal++;
        occ[b] = 0; occ[t] = 1;
        const nrep = flood(b);
        occ[t] = 0; occ[b] = 1;
        for (let j = 0; j < n; j++) nbx[j] = bx[j];
        nbx[i] = t;
        for (let a = 1; a < n; a++) { const v = nbx[a]; let c = a - 1; while (c >= 0 && nbx[c] > v) { nbx[c + 1] = nbx[c]; c--; } nbx[c + 1] = v; }
        const nk = enc(nbx, nrep);
        const nd = depth.get(nk);
        if (nd === undefined) {
          traps++;
          if (pdistIdx[t] < 1e6) subtle++;     // ô đích đến không phải ô chết hiển nhiên → bế tắc khó thấy
        } else {
          if (nd < cd) good++;
          if (nd === cd - 1) {
            const same = b === lastBox;
            if (bestK < 0 || (same && !bestSame)) { bestK = nk; bestTo = t; bestFrom = b; bestSame = same; }
          }
        }
      }
    }
    for (let i = 0; i < n; i++) occ[bx[i]] = 0;
    if (bestK < 0) break;
    if (lastBox >= 0 && !bestSame) switches++;
    choiceSum += legal ? good / legal : 1;
    lastBox = bestTo;
    path.push([bestFrom, bestTo]);
    curK = bestK;
    steps++;
  }
  // đặc điểm của thế đầu
  rep = dec(k, bx);
  let adj = 0, nearT = 0, far = 0;
  const F = sp.F;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let dd = 0; dd < 4; dd++) if (nb[bx[i] * 4 + dd] === bx[j]) adj++;
    }
    const pd = pdistIdx[bx[i]];
    if (pd <= 1) nearT++;
    far += Math.min(pd, 8);
  }
  for (let i = 0; i < n; i++) occ[bx[i]] = 1;
  flood(rep);
  let region = 0; const st = sp.getStamp();
  for (let i = 0; i < F; i++) if (sp.mark[i] === st) region++;
  for (let i = 0; i < n; i++) occ[bx[i]] = 0;
  const free = F - n;
  const cramped = region < free ? 1 - region / free : 0;   // người chơi bị nhốt trong vùng nhỏ lúc đầu
  const forced = steps ? 1 - choiceSum / steps : 0;        // tỉ lệ nước "không tiến bộ" → phải tính toán
  const score = D * 1.0 + (traps - subtle) * 0.25 + subtle * 1.1 + switches * 2.2 + adj * 1.5
    - nearT * 3 + far * 0.4 + cramped * 4 + forced * 10;
  return { score, pushes: D, traps, subtle, switches, adj, nearT, cramped, forced, path };
}

// cấu hình theo loại màn: (khối ngang, khối dọc, số hộp, số ô trống tối thiểu/tối đa)
function genConfigFor(levelIndex, stage) {
  const early = levelIndex < 3;
  if (stage === 'extreme') return { shapes: [[3, 3], [3, 2], [2, 3]], boxes: [4, 5], floor: [24, 40], cap: 1500000 };
  if (stage === 'hard') return { shapes: [[3, 2], [3, 3], [2, 3]], boxes: [4], floor: [20, 36], cap: 900000 };
  if (early) return { shapes: [[2, 2], [3, 2]], boxes: [3], floor: [14, 26], cap: 300000 };
  return { shapes: [[3, 2], [2, 3], [3, 3]], boxes: [3, 4], floor: [18, 34], cap: 700000 };
}

function createStructuredLevel(levelIndex, stage, budget) {
  const started = Date.now();
  const deadline = started + budget;
  const cfg = genConfigFor(levelIndex, stage);
  const pool = [];
  let tries = 0;
  while (Date.now() < deadline) {
    const rand = mulberry32((0x51C0 + levelIndex * 7919 + tries * 104729) ^ Math.floor(Math.random() * 0x7fffffff));
    tries++;
    const [bw, bh] = cfg.shapes[Math.floor(rand() * cfg.shapes.length)];
    const grid = buildTemplateMap(rand, bw, bh, cfg.floor[0], cfg.floor[1]);
    if (!grid) continue;
    const rows = grid.length, cols = grid[0].length;
    const floor = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] !== '#') floor.push(r * cols + c);
    const nBox = cfg.boxes[Math.floor(rand() * cfg.boxes.length)];
    if (floor.length < nBox * 4) continue;
    // đích: chọn ngẫu nhiên, không cho nằm ở ô chết với chính nó (ô mà hộp không thể rời đi vẫn được)
    shuffleWithRand(floor, rand);
    const tcells = floor.slice(0, nBox);
    const sp = exploreStateSpace(grid, tcells, cfg.cap, deadline);
    if (!sp || sp.maxDepth < 6) continue;

    // khoảng cách đẩy tới đích gần nhất (theo chỉ số ô trống)
    const targetsSet = new Set(tcells.map(c => toKey((c / cols) | 0, c % cols)));
    const pdistCell = computePushDist(grid, targetsSet);
    const pdistIdx = sp.fl.map(c => pdistCell[c] === Infinity ? 1e6 : pdistCell[c]);
    const isT = new Uint8Array(sp.F);
    for (const c of tcells) isT[sp.idxOf[c]] = 1;

    // chọn ứng viên: các thế sâu nhất, không hộp nào nằm sẵn trên đích
    const bx = new Int32Array(sp.n);
    const cands = [];
    const minD = Math.max(4, sp.maxDepth - 10);
    for (const [k, d] of sp.depth) {
      if (d < minD) continue;
      sp.dec(k, bx);
      let on = false;
      for (let i = 0; i < sp.n; i++) if (isT[bx[i]]) { on = true; break; }
      if (!on) cands.push(k);
    }
    if (!cands.length) continue;
    shuffleWithRand(cands, rand);
    let best = null;
    for (const k of cands.slice(0, 160)) {
      const s = scoreStart(sp, k, pdistIdx);
      if (!best || s.score > best.s.score) best = { k, s };
    }
    // vị trí người chơi: chọn ngẫu nhiên trong vùng (ưu tiên ô xa hộp đầu tiên cần đẩy thì không cần)
    const rep = sp.dec(best.k, bx);
    for (let i = 0; i < sp.n; i++) sp.occ[bx[i]] = 1;
    sp.flood(rep);
    const st = sp.getStamp();
    const region = [];
    for (let i = 0; i < sp.F; i++) if (sp.mark[i] === st) region.push(i);
    for (let i = 0; i < sp.n; i++) sp.occ[bx[i]] = 0;
    const pIdx = region[Math.floor(rand() * region.length)];
    const pc = sp.fl[pIdx];
    pool.push({
      grid, targets: tcells.map(c => [(c / cols) | 0, c % cols]), targetsSet,
      boxesSet: new Set([...bx].map(i => toKey((sp.fl[i] / cols) | 0, sp.fl[i] % cols))),
      playerPos: { r: (pc / cols) | 0, c: pc % cols },
      m: { ...best.s, hard: best.s.score }
    });
    pool.sort((a, b) => b.m.hard - a.m.hard);
    if (pool.length > 6) pool.pop();
  }
  return pool;
}

function finishLevel(levelIndex, stage, cand, metrics) {
    const { grid, playerPos, boxesSet, targetsSet, targets } = cand;
    for (const [r, c] of targets) grid[r][c] = '.';
    for (const boxKey of boxesSet) {
      const [r, c] = fromKey(boxKey);
      grid[r][c] = targetsSet.has(boxKey) ? '*' : '$';
    }
    grid[playerPos.r][playerPos.c] = targetsSet.has(toKey(playerPos.r, playerPos.c)) ? '+' : '@';

    const sc = metrics.score;   // điểm độ phức tạp (số lần đẩy, nước bẫy, đổi hộp, ...)
    const difficulty = sc >= 160 ? 'CỰC KHÓ' : sc >= 125 ? 'RẤT KHÓ' : sc >= 95 ? 'KHÓ' : sc >= 65 ? 'VỪA' : 'DỄ';
    return {
      name: `Cấp ${levelIndex + 1}`,
      map: grid.map(row => row.join('')),
      difficulty: `${difficulty} • ${metrics.moves} bước`,
      par: metrics.moves,
      parOpt: metrics.parOpt === true,   // true: số bước là số bước ít nhất thật sự
      stageDifficulty: stage
    };
}

// Tổng thời gian tạo một màn < 30 giây: tìm màn theo loại + tính số bước ít nhất chính xác
const GEN_BUDGET_MS = { early: 6000, normal: 11000, hard: 16000, extreme: 19000 };

function createGeneratedLevel(levelIndex, budget) {
  const levelNo = levelIndex + 1;
  const stage = levelNo % 10 === 0 ? 'extreme' : levelNo % 4 === 0 ? 'hard' : 'normal';
  const started = Date.now();
  if (budget === undefined) budget = levelIndex < 3 && stage === 'normal' ? GEN_BUDGET_MS.early : GEN_BUDGET_MS[stage];
  const pool = createStructuredLevel(levelIndex, stage, budget);

  // Số bước 3 sao PHẢI là số bước ít nhất thật sự: chỉ nhận màn mà bộ giải tối ưu giải xong.
  const hardEnd = started + 29000;
  for (let i = 0; i < pool.length; i++) {
    const left = hardEnd - Date.now();
    if (left < 400 && i > 0) break;
    const s = pool[i];
    const opt = solveMoves(s.grid, s.playerPos, s.boxesSet, s.targetsSet, {
      maxNodes: 3500000, deadline: Date.now() + Math.max(400, Math.min(i === 0 ? 7000 : 2500, left))
    });
    if (opt && opt.solvable === true) {
      s.m.moves = opt.moves; s.m.parOpt = true;
      return finishLevel(levelIndex, stage, s, s.m);
    }
  }
  return createGeneratedLevel(levelIndex, 2000);   // hiếm: chưa có màn nào dùng được
}

    
  self.onmessage = (e) => {
  const { type, levelIndex } = e.data;

  if (type === "plan") {
    // Developer Mode: trả NGAY đường đi nhanh (ít lần đẩy), rồi tìm tiếp đường ít bước nhất và trả lần hai nếu ngắn hơn.
    // path = null: reason "dead" (thế đã vào ngõ cụt, không còn lời giải) hoặc "timeout" (hết giờ).
    const { id, rows, player, boxes } = e.data;
    const grid = rows.map(row => row.split('').map(ch => ch === '#' ? '#' : ' '));
    const boxesSet = new Set(boxes);
    const targetsSet = new Set(e.data.targets);

    // 1) ưu tiên đường ít bước nhất (tối đa 5 giây): đi theo gợi ý sẽ đúng bằng số bước 3 sao
    const quick = solveMoves(grid, player, boxesSet, targetsSet, { maxNodes: 3500000, deadline: Date.now() + 5000 });
    if (quick && quick.solvable === true) {
      const o = solutionToPath(grid, player, boxesSet, quick.list);
      self.postMessage({ type: "plan", id, path: o.path, keys: o.keys, optimal: true });
      return;
    }
    if (quick && quick.solvable === false) {
      self.postMessage({ type: "plan", id, path: null, reason: "dead" });
      return;
    }

    // 2) chưa kịp: trả đường nhanh (ít lần đẩy) để có gợi ý ngay, rồi tìm tiếp đường ít bước nhất
    let firstLen = Infinity;
    if (!e.data.skipFast) {
      const fast = solvePushes(grid, player, boxesSet, targetsSet, { maxNodes: 1500000, deadline: Date.now() + 10000 });
      if (!fast || fast.solvable !== true) {
        self.postMessage({ type: "plan", id, path: null, reason: fast && fast.solvable === false ? "dead" : "timeout" });
        return;
      }
      const first = solutionToPath(grid, player, boxesSet, fast.list);
      firstLen = first.path.length;
      self.postMessage({ type: "plan", id, path: first.path, keys: first.keys, optimal: false });
    }

    const opt = solveMoves(grid, player, boxesSet, targetsSet, { maxNodes: 4500000, deadline: Date.now() + 25000 });
    if (opt && opt.solvable === true && opt.moves < firstLen) {
      const better = solutionToPath(grid, player, boxesSet, opt.list);
      self.postMessage({ type: "plan", id, path: better.path, keys: better.keys, optimal: true });
    }
    return;
  }

  if (type === "analyze") {
    // Tính lại số bước ít nhất cho một màn đã có (màn lưu từ bản cũ)
    const { id, map } = e.data;
    const grid = map.map(row => row.split('').map(ch => ch === '#' ? '#' : ' '));
    let player = { r: 0, c: 0 };
    const boxes = new Set(), targets = new Set();
    map.forEach((row, r) => row.split('').forEach((ch, c) => {
      if (ch === '@' || ch === '+') player = { r, c };
      if (ch === '$' || ch === '*') boxes.add(toKey(r, c));
      if (ch === '.' || ch === '*' || ch === '+') targets.add(toKey(r, c));
    }));
    const opt = solveMoves(grid, player, boxes, targets, { maxNodes: 4500000, deadline: Date.now() + 25000 });
    self.postMessage({ type: "analyzed", id, moves: opt && opt.solvable === true ? opt.moves : null });
    return;
  }

  if (type === "generate") {
    const level = createGeneratedLevel(levelIndex);
    self.postMessage({
      type: "generated",
      levelIndex,
      level
    });
  }
};
