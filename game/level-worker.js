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
  const sol = solvePushes(grid, player, boxesSet, targetsSet, { maxNodes: 300000, deadline: Date.now() + 3000 });
  if (!sol || sol.solvable !== true) return { solvable: false, moves: 0 };
  const m = measureSolution(grid, player, boxesSet, sol);
  return { solvable: true, moves: m.moves, pushes: m.pushes };
}

// Gợi ý nước đi tiếp theo (Developer Mode): ký tự U/D/L/R của bước đầu tiên trên lời giải ít lần đẩy nhất
function solveHintMove(grid, player, boxesSet, targetsSet) {
  const sol = solvePushes(grid, player, boxesSet, targetsSet, { maxNodes: 300000, deadline: Date.now() + 3000 });
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
   - Sinh nhiều ứng viên trong giới hạn thời gian (GEN_BUDGET_MS, tối đa 15 giây),
     chọn màn khó nhất; dừng sớm khi đạt điểm mục tiêu theo cấp.
   ========================================================= */
// Tối đa ~10 giây tìm màn + tối đa ~3 giây đo lại lời giải = dưới 15 giây
const GEN_BUDGET_MS = 10000;
const EVAL_CAP = 45000;
// Kích thước bàn và số hộp theo loại màn (màn cứ 4 cấp là khó, 10 cấp là cực khó)
const LEVEL_CFG = {
  normal:  { size: 8, boxes: 5 },
  hard:    { size: 9, boxes: 6 },
  extreme: { size: 9, boxes: 7 }
};

// Mục tiêu độ khó (số trạng thái bộ giải phải duyệt) theo loại màn; tăng nhẹ theo cấp
function targetPushesFor(levelIndex, stage) {
  const base = stage === 'extreme' ? 40000 : stage === 'hard' ? 22000 : 9000;
  const ramp = 0.4 + 0.6 * Math.min(1, levelIndex / 12);   // các cấp đầu dễ hơn để vào game nhanh
  return Math.round((base + Math.min(6, Math.floor(levelIndex / 3)) * 600) * ramp);
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
      stageDifficulty: stage
    };
}

function createGeneratedLevel(levelIndex) {
  const levelNo = levelIndex + 1;
  const stage = levelNo % 10 === 0 ? 'extreme' : levelNo % 4 === 0 ? 'hard' : 'normal';
  const started = Date.now();
  const deadline = started + GEN_BUDGET_MS;
  const goal = targetPushesFor(levelIndex, stage);

  let best = null;        // khó nhất (có thể chưa đo được lời giải vì vượt EVAL_CAP)
  let bestSolved = null;  // khó nhất trong số đã giải được → dự phòng
  let n = 0;

  while (Date.now() < deadline) {
    const rand = mulberry32((0xA53A + levelIndex * 9973 + n * 7919) ^ Math.floor(Math.random() * 0x7fffffff));
    n++;
    const cand = buildCandidate(levelIndex, rand, stage);
    if (!cand) continue;

    // mỗi ứng viên được leo tối đa ~4 giây để còn thử nhiều bàn khác nhau
    const m = climb(cand, rand, goal, Math.min(deadline, Date.now() + 4000));
    if (!m) continue;

    const snap = { grid: cand.grid, playerPos: cand.playerPos, boxesSet: cand.boxesSet, targetsSet: cand.targetsSet, targets: cand.targets, m };
    if (!best || m.hard > best.m.hard) best = snap;
    if (!m.capped && (!bestSolved || m.hard > bestSolved.m.hard)) bestSolved = snap;
    if (m.hard >= goal) break;
  }

  // Màn khó nhất có thể vượt giới hạn đo: giải lại với giới hạn lớn hơn (tối đa ~3 giây thêm) để biết số bước chuẩn
  if (best && best.m.capped) {
    const sol = solvePushes(best.grid, best.playerPos, best.boxesSet, best.targetsSet, { maxNodes: 400000, deadline: Math.max(Date.now() + 1500, started + GEN_BUDGET_MS + 3000) });
    if (sol && sol.solvable === true) {
      const m = measureSolution(best.grid, best.playerPos, best.boxesSet, sol);
      m.hard = sol.explored;
      best.m = m;
    } else {
      best = bestSolved;   // không đo được trong thời gian cho phép → dùng màn khó nhất đã đo được
    }
  }

  if (best) return finishLevel(levelIndex, stage, best, best.m);
  return createGeneratedLevel(levelIndex);   // hiếm: chưa có màn nào dùng được
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

  if (type === "generate") {
    const level = createGeneratedLevel(levelIndex);
    self.postMessage({
      type: "generated",
      levelIndex,
      level
    });
  }
};
