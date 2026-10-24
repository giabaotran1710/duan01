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

      function isBox(ch) {
        return ch === '$' || ch === '*';
      }

      function isFloor(ch) {
        return ch === ' ' || ch === '.';
      }

      function serializeBoxes(boxesSet) {
        return [...boxesSet].sort().join('|');
      }

      function stateKey(player, boxesSet) {
        return `${player.r},${player.c};${serializeBoxes(boxesSet)}`;
      }

      function isWallCell(grid, r, c) {
        return r < 0 || r >= grid.length || c < 0 || c >= grid[0].length || grid[r][c] === '#';
      }

      function isFreeForPlayer(grid, r, c, boxesSet) {
        if (isWallCell(grid, r, c)) return false;
        return !boxesSet.has(`${r},${c}`);
      }

      function reachableCells(grid, player, boxesSet) {
        const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        const q = [[player.r, player.c]];
        const seen = new Set([`${player.r},${player.c}`]);

        while (q.length) {
          const [r, c] = q.shift();
          for (const d of dirs) {
            const nr = r + d.dr, nc = c + d.dc;
            const key = `${nr},${nc}`;
            if (seen.has(key)) continue;
            if (!isFreeForPlayer(grid, nr, nc, boxesSet)) continue;
            seen.add(key);
            q.push([nr, nc]);
          }
        }
        return seen;
      }

function isSolved(boxesSet, targetsSet) {
        for (const b of boxesSet) {
          if (!targetsSet.has(b)) return false;
        }
        return true;
      }

      function isSolvableFast(grid, player, boxesSet, targetsSet) {
        const dirs = [{ dr: -1, dc: 0 }, { dr: 1, dc: 0 }, { dr: 0, dc: -1 }, { dr: 0, dc: 1 }];
        
        const visited = new Set();
        const queue = [{ player: { ...player }, boxes: new Set(boxesSet) }];
        visited.add(stateKey(player, boxesSet));
        
        let steps = 0;
        // Giới hạn thấp hơn cho solver nhanh
        const MAX_STATES = 100000;
        
        while (queue.length > 0 && steps < MAX_STATES) {
          const state = queue.shift();
          steps++;
          
          if (isSolved(state.boxes, targetsSet)) return true;
          
          const reach = reachableCells(grid, state.player, state.boxes);
          
          for (const box of state.boxes) {
            const [br, bc] = box.split(',').map(Number);
            
            for (const d of dirs) {
              const pushFromR = br - d.dr, pushFromC = bc - d.dc;
              const destR = br + d.dr, destC = bc + d.dc;
              
              // Kiểm tra nhanh: ô đẩy phải đến được và ô đích phải trống
              if (!reach.has(`${pushFromR},${pushFromC}`)) continue;
              if (!isFreeForPlayer(grid, destR, destC, state.boxes)) continue;
              
              // Kiểm tra deadlock đơn giản: hộp không nên dính tường nếu không phải target
              const destKey = `${destR},${destC}`;
              if (!targetsSet.has(destKey)) {
                // Deadlock: hộp ở góc
                const wallChecks = [
                  [destR - 1, destC], [destR + 1, destC],
                  [destR, destC - 1], [destR, destC + 1]
                ];
                let blockedCount = 0;
                for (const [wr, wc] of wallChecks) {
                  if (isWallCell(grid, wr, wc)) blockedCount++;
                }
                if (blockedCount >= 2) continue; // Bỏ qua nếu hộp bị kẹt góc
              }
              
              const nextBoxes = new Set(state.boxes);
              nextBoxes.delete(box);
              nextBoxes.add(destKey);
              
              const nextPlayer = { r: br, c: bc };
              const key = stateKey(nextPlayer, nextBoxes);
              
              if (!visited.has(key)) {
                visited.add(key);
                queue.push({ player: nextPlayer, boxes: nextBoxes });
              }
            }
          }
        }
        
        return false;
      }

function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function hasClearStraightLine(grid, a, b) {
  if (a[0] === b[0]) {
    const r = a[0];
    const [from, to] = a[1] < b[1] ? [a[1], b[1]] : [b[1], a[1]];
    for (let c = from + 1; c < to; c++) {
      if (grid[r][c] === '#') return false;
    }
    return true;
  }

  if (a[1] === b[1]) {
    const c = a[1];
    const [from, to] = a[0] < b[0] ? [a[0], b[0]] : [b[0], a[0]];
    for (let r = from + 1; r < to; r++) {
      if (grid[r][c] === '#') return false;
    }
    return true;
  }

  return false;
}

function looksTooObvious(grid, targets, boxes, minDist) {
  for (const box of boxes) {
    for (const target of targets) {
      const d = manhattan(box, target);

      // Quá gần nhau -> dễ đoán cặp
      if (d < minDist) return true;

      // Cùng hàng/cột và nhìn thẳng được -> rất lộ
      if (d <= minDist + 1 && hasClearStraightLine(grid, box, target)) return true;
    }
  }
  return false;
}

function toKey(r, c) {
  return `${r},${c}`;
}

function fromKey(key) {
  return key.split(',').map(Number);
}

function boxesOnTargetCount(boxesSet, targetsSet) {
  let count = 0;
  for (const b of boxesSet) {
    if (targetsSet.has(b)) count++;
  }
  return count;
}

function freeNeighborCount(grid, r, c) {
  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1]
  ];
  let count = 0;
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (!isWallCell(grid, nr, nc)) count++;
  }
  return count;
}

function pickSpreadCells(cells, count, minDist, rand) {
  const attempts = 60;

  for (let t = 0; t < attempts; t++) {
    const pool = [...cells];
    shuffleWithRand(pool, rand);

    const chosen = [];
    for (const cell of pool) {
      let ok = true;
      for (const other of chosen) {
        const d = Math.abs(cell[0] - other[0]) + Math.abs(cell[1] - other[1]);
        if (d < minDist) {
          ok = false;
          break;
        }
      }
      if (ok) chosen.push(cell);
      if (chosen.length === count) return chosen;
    }
  }

  return null;
}

function nearestTargetInfo(pos, targetPoints) {
  let bestDist = Infinity;
  let bestTarget = null;

  for (const t of targetPoints) {
    const d = Math.abs(pos[0] - t[0]) + Math.abs(pos[1] - t[1]);
    if (d < bestDist) {
      bestDist = d;
      bestTarget = t;
    }
  }

  return { dist: bestDist, target: bestTarget };
}

function isCornerDeadlockCell(grid, r, c, targetsSet) {
  const key = toKey(r, c);
  if (targetsSet.has(key)) return false;

  const up = isWallCell(grid, r - 1, c);
  const down = isWallCell(grid, r + 1, c);
  const left = isWallCell(grid, r, c - 1);
  const right = isWallCell(grid, r, c + 1);

  return (up || down) && (left || right);
}

function scoreReverseCandidate(
    grid,
    candidate,
    boxesSet,
    targetsSet,
    targetPoints,
    rand
) {
  const [br, bc] = fromKey(candidate.boxKey);
  const [nr, nc] = fromKey(candidate.nextBoxKey);
  const [pr, pc] = fromKey(candidate.nextPlayerKey);

  let score = 0;
  // Khuyến khích box tụ lại


for (const other of boxesSet) {
    if (other === candidate.boxKey) continue;

    const [or, oc] = fromKey(other);

    const d = Math.abs(nr - or) + Math.abs(nc - oc);

    if(d===1) score+=120;

else if(d===2) score+=70;

else if(d===3) score+=30;

else if(d>=7) score-=80;}

  const oldInfo = nearestTargetInfo([br, bc], targetPoints);
  const newInfo = nearestTargetInfo([nr, nc], targetPoints);

  // Ưu tiên làm box rời xa đích
  score+=(newInfo.dist-oldInfo.dist)*100;

  // Đẩy box off target là tốt
  const boxWasTarget = targetsSet.has(candidate.boxKey);
  const boxNowTarget = targetsSet.has(candidate.nextBoxKey);
  if (boxWasTarget && !boxNowTarget) score += 160;
  if (boxNowTarget) score -= 450;

  // Không cho box dính quá gần target
  if(newInfo.dist<=4) score -= (3 - newInfo.dist) * 120;

  // Càng vào hành lang / chỗ chật vừa phải càng tốt
  const open = freeNeighborCount(grid, nr, nc);
  score += (4 - open) * 14;

  // Tránh vị trí quá lộ: thẳng hàng nhìn thấy target
  if (newInfo.target && hasClearStraightLine(grid, [nr, nc], newInfo.target)) {
    score -= newInfo.dist <= 4 ? 90 : 30;
  }

  // Tránh deadlock thật sự
  if (isCornerDeadlockCell(grid, nr, nc, targetsSet)) {
    score -= 10000;
  }

  // Đừng để player đứng quá sát sau khi reverse
  const playerToBox = Math.abs(pr - nr) + Math.abs(pc - nc);
  score += Math.max(0, playerToBox - 1) * 3;

  // Nhiễu nhỏ để tránh lặp pattern
  score += rand() * 8;

  return score;
}

function chooseReverseCandidate(
    candidates,
    grid,
    boxesSet,
    targetsSet,
    targetPoints,
    rand
) {
  const scored = [];

for (const c of candidates) {
  const s = scoreReverseCandidate(
    grid,
    c,
    boxesSet,
    targetsSet,
    targetPoints,
    rand
  );
  if (s > -9000) scored.push({ c, s });
}
  if (scored.length === 0) return null;

  scored.sort((a, b) => b.s - a.s);

  const top = scored.slice(0,2);
  const minScore = top[top.length - 1].s;

  let totalWeight = 0;
  const weighted = top.map(item => {
    const w = Math.max(1, item.s - minScore + 1);
    totalWeight += w;
    return { item, w };
  });

  let r = rand() * totalWeight;
  for (const entry of weighted) {
    r -= entry.w;
    if (r <= 0) return entry.item.c;
  }

  return weighted[0].item.c;
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
function analyzeLevel(grid, player, boxesSet, targetsSet) {
  const opt = solveMoves(grid, player, boxesSet, targetsSet, { maxNodes: 2000000, deadline: Date.now() + 8000 });
  if (opt && opt.solvable === true) return { solvable: true, moves: opt.moves, pushes: opt.pushes };
  // không tìm được lời giải ít bước nhất trong thời gian cho phép: dùng lời giải ít lần đẩy (số bước chỉ là ước lượng trên)
  const sol = solvePushes(grid, player, boxesSet, targetsSet, { maxNodes: 300000, deadline: Date.now() + 3000 });
  if (!sol || sol.solvable !== true) return { solvable: false, moves: 0 };
  const m = measureSolution(grid, player, boxesSet, sol);
  return { solvable: true, moves: m.moves, pushes: m.pushes };
}

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
function solveHintMove(grid, player, boxesSet, targetsSet) {
  // ưu tiên lời giải ÍT BƯỚC NHẤT (đi theo từng gợi ý sẽ đúng bằng số bước 3 sao); hết giờ mới dùng lời giải ít lần đẩy
  let sol = solveMoves(grid, player, boxesSet, targetsSet, { maxNodes: 3500000, deadline: Date.now() + 6000 });
  if (!sol || sol.solvable !== true) sol = solvePushes(grid, player, boxesSet, targetsSet, { maxNodes: 300000, deadline: Date.now() + 3000 });
  if (!sol || sol.solvable !== true || !sol.list.length) return null;

  const rows = grid.length, cols = grid[0].length;
  const D = [[-1, 0, 'U'], [1, 0, 'D'], [0, -1, 'L'], [0, 1, 'R']];
  const p = sol.list[0];
  const br = (p.from / cols) | 0, bc = p.from % cols;
  const sr = br - D[p.dir][0], sc = bc - D[p.dir][1];   // ô người phải đứng để đẩy

  if (player.r === sr && player.c === sc) return D[p.dir][2];   // đã đứng đúng chỗ → đẩy luôn

  const boxes = new Set([...boxesSet]);
  const start = toKey(player.r, player.c);
  const prev = new Map([[start, null]]);
  const q = [[player.r, player.c]];
  for (let qi = 0; qi < q.length; qi++) {
    const [r, c] = q[qi];
    if (r === sr && c === sc) break;
    for (const [dr, dc, ch] of D) {
      const nr = r + dr, nc = c + dc, k = toKey(nr, nc);
      if (isWallCell(grid, nr, nc) || boxes.has(k) || prev.has(k)) continue;
      prev.set(k, { from: toKey(r, c), ch });
      q.push([nr, nc]);
    }
  }
  let k = toKey(sr, sc);
  if (!prev.has(k)) return null;
  let first = null;
  while (prev.get(k)) { first = prev.get(k).ch; k = prev.get(k).from; }
  return first;
}

// Đo độ hóc búa từ lời giải ít lần đẩy nhất: số lần đẩy, số bước đi, số lần đổi hộp, số lần hộp đổi hướng
function measureSolution(grid, player, boxesSet, sol) {
  const rows = grid.length, cols = grid[0].length;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const boxes = new Set([...boxesSet].map(k => { const [r, c] = fromKey(k); return r * cols + c; }));
  let pr = player.r, pc = player.c;
  let moves = 0, switches = 0, turns = 0;
  let lastBox = -1; const lastDir = new Map();   // hướng đẩy gần nhất của từng hộp (theo vị trí hiện tại)

  for (const p of sol.list) {
    const r = (p.from / cols) | 0, c = p.from % cols;
    const [dr, dc] = dirs[p.dir];
    const sr = r - dr, sc = c - dc;
    // BFS quãng đường người chơi tới ô đứng đẩy
    const seen = new Map([[pr * cols + pc, 0]]);
    const q = [[pr, pc]];
    for (let qi = 0; qi < q.length && !seen.has(sr * cols + sc); qi++) {
      const [qr, qc] = q[qi];
      for (const [ar, ac] of dirs) {
        const nr = qr + ar, nc = qc + ac, n = nr * cols + nc;
        if (isWallCell(grid, nr, nc) || boxes.has(n) || seen.has(n)) continue;
        seen.set(n, seen.get(qr * cols + qc) + 1);
        q.push([nr, nc]);
      }
    }
    moves += (seen.get(sr * cols + sc) || 0) + 1;
    if (lastBox !== -1 && lastBox !== p.from) switches++;
    if (lastDir.has(p.from) && lastDir.get(p.from) !== p.dir) turns++;
    boxes.delete(p.from);
    const to = (r + dr) * cols + (c + dc);
    boxes.add(to);
    if (lastDir.has(p.from)) lastDir.delete(p.from);
    lastDir.set(to, p.dir);
    lastBox = to;
    pr = r; pc = c;
  }
  return { pushes: sol.list.length, moves, switches, turns };
}

/* =========================================================
   SINH MÀN
   - Dựng màn bằng cách "kéo ngược" từ trạng thái thắng → luôn giải được.
   - Giải bằng solvePushes để đo độ hóc búa:
       điểm = 4·số lần đẩy + số bước + 3·số lần đổi hộp + 2·số lần hộp đổi hướng
   - Sinh nhiều ứng viên trong giới hạn thời gian (GEN_BUDGET_MS, tối đa 30 giây),
     chọn màn khó nhất; dừng sớm khi đạt điểm mục tiêu theo cấp.
   ========================================================= */
// Tối đa ~19 giây tìm màn + tối đa ~9 giây tính số bước ít nhất chính xác ≈ dưới 30 giây
const GEN_BUDGET_MS = 19000;
const EVAL_CAP = 130000;
// Kích thước bàn và số hộp theo loại màn (màn cứ 4 cấp là khó, 10 cấp là cực khó)
const LEVEL_CFG = {
  normal:  { size: 8, boxes: 5 },
  hard:    { size: 9, boxes: 6 },
  extreme: { size: 9, boxes: 7 }
};

// Mục tiêu độ khó (số trạng thái bộ giải phải duyệt) theo loại màn; tăng nhẹ theo cấp
function targetPushesFor(levelIndex, stage) {
  const base = stage === 'extreme' ? 110000 : stage === 'hard' ? 60000 : 25000;
  const ramp = 0.4 + 0.6 * Math.min(1, levelIndex / 12);   // các cấp đầu dễ hơn để vào game nhanh
  return Math.round((base + Math.min(6, Math.floor(levelIndex / 3)) * 1800) * ramp);
}

// Leo đồi: từ thế bắt đầu, kéo ngược thêm vài bước ngẫu nhiên rồi giải lại;
// giữ thế mới nếu lời giải ít lần đẩy nhất dài hơn. Màn vẫn luôn giải được vì chỉ dùng bước kéo ngược.
function climb(cand, rand, goalPushes, deadline) {
  const { grid, targetsSet } = cand;
  let boxes = new Set(cand.boxesSet);
  let player = { ...cand.playerPos };

  // Độ khó = số trạng thái bộ giải phải duyệt (hộp phụ thuộc lẫn nhau càng nhiều càng lớn).
  // Vượt EVAL_CAP thì tính là EVAL_CAP (vẫn giải được vì thế bắt đầu dựng ngược từ thế thắng).
  const evalState = (bx, pl) => {
    const sol = solvePushes(grid, pl, bx, targetsSet, { maxNodes: EVAL_CAP, deadline });
    if (!sol) return null;
    if (sol.solvable === true) { const m = measureSolution(grid, pl, bx, sol); m.hard = sol.explored; return m; }
    if (sol.solvable === null && sol.explored > EVAL_CAP) return { pushes: 0, moves: 0, switches: 0, turns: 0, hard: EVAL_CAP, capped: true };
    return null;
  };

  let cur = evalState(boxes, player);
  if (!cur) return null;
  let best = cur, bestBoxes = boxes, bestPlayer = player;
  let stale = 0;

  while (Date.now() < deadline && best.hard < goalPushes && stale < 220) {
    const bx = new Set(boxes);
    let pl = { ...player };
    const k = 1 + Math.floor(rand() * 7);
    let ok = true;
    for (let i = 0; i < k; i++) {
      const cs = getReverseCandidates(grid, pl, bx, targetsSet);
      if (!cs.length) { ok = false; break; }
      const pick = cs[Math.floor(rand() * cs.length)];
      bx.delete(pick.boxKey);
      bx.add(pick.nextBoxKey);
      const np = fromKey(pick.nextPlayerKey);
      pl = { r: np[0], c: np[1] };
    }
    stale++;
    if (!ok || boxesOnTargetCount(bx, targetsSet) !== 0) continue;
    const ev = evalState(bx, pl);
    if (!ev) continue;

    // chấp nhận thế tốt hơn hoặc ngang bằng (đi ngang để thoát cực trị cục bộ); thỉnh thoảng cho lùi 1 lần đẩy
    const accept = ev.hard >= cur.hard * 0.97 || (rand() < 0.08);
    if (!accept) continue;
    boxes = bx; player = pl; cur = ev;
    if (ev.hard > best.hard) {
      if (ev.hard > best.hard * 1.1) stale = 0;
      best = ev; bestBoxes = bx; bestPlayer = pl;
    }
  }
  cand.boxesSet = bestBoxes;
  cand.playerPos = bestPlayer;
  return best;
}

function buildCandidate(levelIndex, rand, stage) {
    const cfg = LEVEL_CFG[stage];
    const size = cfg.size;
    const rows = size;
    const cols = size;

    const boxCount = cfg.boxes;
    const wallDensity = 0.15 + rand() * 0.15;
    const reverseSteps = Math.min(180 + levelIndex * 4, 260);

    const dirs = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 }
    ];

    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) =>
        (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) ? '#' : ' '
      )
    );

    const innerCells = [];
    for (let r = 1; r <= rows - 2; r++) {
      for (let c = 1; c <= cols - 2; c++) {
        innerCells.push([r, c]);
      }
    }
    shuffleWithRand(innerCells, rand);

    const numWalls = Math.floor(innerCells.length * wallDensity);
    for (const [r, c] of innerCells.slice(0, numWalls)) {
      grid[r][c] = '#';
      let isolated = true;
      for (const d of dirs) {
        const nr = r + d.dr, nc = c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === ' ') { isolated = false; break; }
      }
      if (isolated) grid[r][c] = ' ';
    }

    const emptyCells = [];
    for (let r = 1; r <= rows - 2; r++) for (let c = 1; c <= cols - 2; c++) if (grid[r][c] === ' ') emptyCells.push([r, c]);
    if (emptyCells.length < boxCount + 1) return null;

    const visited = new Set([toKey(emptyCells[0][0], emptyCells[0][1])]);
    const queue = [emptyCells[0]];
    while (queue.length) {
      const [r, c] = queue.shift();
      for (const d of dirs) {
        const nr = r + d.dr, nc = c + d.dc, key = toKey(nr, nc);
        if (visited.has(key)) continue;
        if (grid[nr] && grid[nr][nc] === ' ') { visited.add(key); queue.push([nr, nc]); }
      }
    }
    if (visited.size < emptyCells.length) return null;

    const targets = pickSpreadCells(emptyCells, boxCount, 1, rand);
    if (!targets) return null;
    const targetsSet = new Set(targets.map(([r, c]) => toKey(r, c)));
    const targetPoints = targets.map(([r, c]) => [r, c]);

    const playerCandidates = emptyCells.filter(([r, c]) => !targetsSet.has(toKey(r, c)));
    if (!playerCandidates.length) return null;
    shuffleWithRand(playerCandidates, rand);
    let playerCell = playerCandidates.find(([r, c]) =>
      Math.min(...targets.map(t => Math.abs(r - t[0]) + Math.abs(c - t[1]))) >= 2) || playerCandidates[0];

    let playerPos = { r: playerCell[0], c: playerCell[1] };
    const boxesSet = new Set(targets.map(([r, c]) => toKey(r, c)));

    const reverseOnce = () => {
      let candidates = getReverseCandidates(grid, playerPos, boxesSet, targetsSet);
      if (!candidates.length) return false;
      const off = candidates.filter(c => {
        const [br, bc] = fromKey(c.boxKey), [nr, nc] = fromKey(c.nextBoxKey);
        return targetsSet.has(toKey(br, bc)) && !targetsSet.has(toKey(nr, nc));
      });
      if (off.length) candidates = off;
      const pick = chooseReverseCandidate(candidates, grid, boxesSet, targetsSet, targetPoints, rand);
      if (!pick) return false;
      boxesSet.delete(pick.boxKey);
      boxesSet.add(pick.nextBoxKey);
      const np = fromKey(pick.nextPlayerKey);
      playerPos = { r: np[0], c: np[1] };
      return true;
    };

    for (let step = 0; step < reverseSteps; step++) if (!reverseOnce()) return null;
    let safety = 0;
    while (boxesOnTargetCount(boxesSet, targetsSet) > 0 && safety < 30) { if (!reverseOnce()) break; safety++; }
    if (boxesOnTargetCount(boxesSet, targetsSet) !== 0) return null;

    return { grid, playerPos, boxesSet, targetsSet, targets };
}

function finishLevel(levelIndex, stage, cand, metrics) {
    const { grid, playerPos, boxesSet, targetsSet, targets } = cand;
    for (const [r, c] of targets) grid[r][c] = '.';
    for (const boxKey of boxesSet) {
      const [r, c] = fromKey(boxKey);
      grid[r][c] = targetsSet.has(boxKey) ? '*' : '$';
    }
    grid[playerPos.r][playerPos.c] = targetsSet.has(toKey(playerPos.r, playerPos.c)) ? '+' : '@';

    const p = metrics.pushes;
    const difficulty = p >= 26 ? 'CỰC KHÓ' : p >= 21 ? 'RẤT KHÓ' : p >= 16 ? 'KHÓ' : p >= 11 ? 'VỪA' : 'DỄ';
    return {
      name: `Cấp ${levelIndex + 1}`,
      map: grid.map(row => row.join('')),
      difficulty: `${difficulty} • ${metrics.moves} bước`,
      par: metrics.moves,
      parOpt: metrics.parOpt === true,   // true: số bước là số bước ít nhất thật sự
      stageDifficulty: stage
    };
}

function createGeneratedLevel(levelIndex, budget = GEN_BUDGET_MS) {
  const levelNo = levelIndex + 1;
  const stage = levelNo % 10 === 0 ? 'extreme' : levelNo % 4 === 0 ? 'hard' : 'normal';
  const started = Date.now();
  const deadline = started + budget;
  const goal = targetPushesFor(levelIndex, stage);

  const pool = [];         // các ứng viên khó nhất (giữ tối đa 6) để chọn màn tính được số bước ít nhất chính xác
  let n = 0;

  while (Date.now() < deadline) {
    const rand = mulberry32((0xA53A + levelIndex * 9973 + n * 7919) ^ Math.floor(Math.random() * 0x7fffffff));
    n++;
    const cand = buildCandidate(levelIndex, rand, stage);
    if (!cand) continue;

    // mỗi ứng viên được leo tối đa ~7 giây để còn thử nhiều bàn khác nhau
    const m = climb(cand, rand, goal, Math.min(deadline, Date.now() + 7000));
    if (!m) continue;

    pool.push({ grid: cand.grid, playerPos: cand.playerPos, boxesSet: cand.boxesSet, targetsSet: cand.targetsSet, targets: cand.targets, m });
    pool.sort((x, y) => y.m.hard - x.m.hard);
    if (pool.length > 6) pool.pop();
    if (m.hard >= goal) break;
  }

  // Số bước 3 sao PHẢI là số bước ít nhất thật sự: chỉ nhận màn mà bộ giải tối ưu giải xong.
  // Màn khó nhất được tối đa ~8 giây, các màn dự phòng ~3 giây; tổng cộng không quá ~30 giây.
  const hardEnd = started + budget + 9000;
  for (let i = 0; i < pool.length; i++) {
    const left = hardEnd - Date.now();
    if (left < 400 && i > 0) break;
    const s = pool[i];
    const opt = solveMoves(s.grid, s.playerPos, s.boxesSet, s.targetsSet, {
      maxNodes: 3500000, deadline: Date.now() + Math.max(400, Math.min(i === 0 ? 8000 : 3000, left))
    });
    if (opt && opt.solvable === true) {
      s.m.moves = opt.moves; s.m.pushes = opt.pushes; s.m.parOpt = true;
      return finishLevel(levelIndex, stage, s, s.m);
    }
  }
  return createGeneratedLevel(levelIndex, 1000);   // hiếm: chưa có màn nào dùng được
}

  function getReverseCandidates(grid, playerPos, boxesSet, targetsSet) {
  const reach = reachableCells(grid, playerPos, boxesSet);

  const dirs = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 }
  ];

  const candidates = [];

  for (const boxKey of boxesSet) {
    const [br, bc] = fromKey(boxKey);

    for (const d of dirs) {
      const nextBoxR = br - d.dr;
      const nextBoxC = bc - d.dc;

      const nextPlayerR = br - 2 * d.dr;
      const nextPlayerC = bc - 2 * d.dc;

      const nextBoxKey = toKey(nextBoxR, nextBoxC);
      const nextPlayerKey = toKey(nextPlayerR, nextPlayerC);

      if (!reach.has(nextBoxKey)) continue;
      if (!isFreeForPlayer(grid, nextBoxR, nextBoxC, boxesSet)) continue;
      if (!isFreeForPlayer(grid, nextPlayerR, nextPlayerC, boxesSet)) continue;

      candidates.push({
        boxKey,
        nextBoxKey,
        nextPlayerKey
      });
    }
  }

  return candidates;
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
