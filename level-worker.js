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

function solveLevelAStar(grid, player, boxesSet, targetsSet) {
  const dirs = [
    { dr: -1, dc: 0, ch: 'U' },
    { dr: 1, dc: 0, ch: 'D' },
    { dr: 0, dc: -1, ch: 'L' },
    { dr: 0, dc: 1, ch: 'R' }
  ];

  const targetPoints = [...targetsSet].map(fromKey);
  const startBoxes = new Set(boxesSet);
  const startKey = stateKey(player, startBoxes);

  class MinHeap {
    constructor() {
      this.data = [];
    }

    size() {
      return this.data.length;
    }

    push(node) {
      this.data.push(node);
      this.#bubbleUp(this.data.length - 1);
    }

    pop() {
      if (this.data.length === 0) return null;
      const top = this.data[0];
      const end = this.data.pop();
      if (this.data.length > 0) {
        this.data[0] = end;
        this.#bubbleDown(0);
      }
      return top;
    }

    #bubbleUp(index) {
      const data = this.data;
      while (index > 0) {
        const parent = (index - 1) >> 1;
        if (data[parent].f <= data[index].f) break;
        [data[parent], data[index]] = [data[index], data[parent]];
        index = parent;
      }
    }

    #bubbleDown(index) {
      const data = this.data;
      const length = data.length;

      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;

        if (left < length && data[left].f < data[smallest].f) smallest = left;
        if (right < length && data[right].f < data[smallest].f) smallest = right;
        if (smallest === index) break;

        [data[index], data[smallest]] = [data[smallest], data[index]];
        index = smallest;
      }
    }
  }
    function createGeneratedLevel(levelIndex) {

    let bestLevel = null;
    let bestScore = -Infinity;

    const tries = 2;
    ;

    for (let i = 0; i < tries; i++) {

        const level = createSingleLevel(levelIndex);
      

        if (!level) continue;

        const score = Math.random() * 20 + (level.par || 0);

        if (!bestLevel || score > bestScore) {
            bestLevel = level;
            bestScore = score;
        }
    }

    return bestLevel || createSingleLevel(levelIndex);
}
function createSingleLevel(levelIndex) {
  const levelNo = levelIndex + 1;

let stageDifficulty = "normal";

if (levelNo % 10 === 0) {
    stageDifficulty = "extreme";
}
else if (levelNo % 4 === 0) {
    stageDifficulty = "hard";
}
  while (true) {
    const rand = mulberry32(
      (0xA53A + levelIndex * 9973) ^ Math.floor(Math.random() * 0x7fffffff)
    );

    const size = 8;
    const rows = size;
    const cols = size;

    const boxCount = 5;
    const wallDensity = 0.15 + rand() * 0.15;
    const reverseSteps =
Math.min(180+levelIndex*4,260);

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

    // Tường ngẫu nhiên
    const numWalls = Math.floor(innerCells.length * wallDensity);
    const wallsToPlace = innerCells.slice(0, numWalls);

    for (const [r, c] of wallsToPlace) {
      grid[r][c] = '#';

      // Tránh tạo ô chết hoàn toàn
      let isolated = true;
      for (const d of dirs) {
        const nr = r + d.dr, nc = c + d.dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === ' ') {
          isolated = false;
          break;
        }
      }
      if (isolated) grid[r][c] = ' ';
    }

    // Lấy các ô trống
    const emptyCells = [];
    for (let r = 1; r <= rows - 2; r++) {
      for (let c = 1; c <= cols - 2; c++) {
        if (grid[r][c] === ' ') emptyCells.push([r, c]);
      }
    }

    if (emptyCells.length < boxCount + 1) continue;

    // Kiểm tra liên thông toàn bộ vùng trống
    const visited = new Set();
    const queue = [emptyCells[0]];
    visited.add(toKey(emptyCells[0][0], emptyCells[0][1]));

    while (queue.length) {
      const [r, c] = queue.shift();
      for (const d of dirs) {
        const nr = r + d.dr, nc = c + d.dc;
        const key = toKey(nr, nc);
        if (visited.has(key)) continue;
        if (grid[nr] && grid[nr][nc] === ' ') {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }

    if (visited.size < emptyCells.length) continue;

    // Chọn target: cách nhau một chút để tránh lộ
    const minTargetDist = (size >= 10) ? 2 : 1;
    const targets = pickSpreadCells(emptyCells, boxCount, minTargetDist, rand);
    if (!targets) continue;

    const targetsSet = new Set(targets.map(([r, c]) => toKey(r, c)));
    const targetPoints = targets.map(([r, c]) => [r, c]);

    // Chọn player ban đầu
    const playerCandidates = emptyCells.filter(([r, c]) => !targetsSet.has(toKey(r, c)));
    if (playerCandidates.length === 0) continue;

    shuffleWithRand(playerCandidates, rand);

    let playerCell = null;
    for (const cell of playerCandidates) {
      const [r, c] = cell;
      const distToTargets = targets.reduce((min, t) => {
        const d = Math.abs(r - t[0]) + Math.abs(c - t[1]);
        return Math.min(min, d);
      }, Infinity);

      if (distToTargets >= 2) {
        playerCell = cell;
        break;
      }
    }

    if (!playerCell) playerCell = playerCandidates[0];

    let playerPos = { r: playerCell[0], c: playerCell[1] };
    let boxesSet = new Set(targets.map(([r, c]) => toKey(r, c)));

    // Reverse generation: đẩy ngược box ra khỏi đích
    let ok = true;

    for (let step = 0; step < reverseSteps; step++) {
      let candidates = getReverseCandidates(
        grid,
        playerPos,
        boxesSet,
        targetsSet
      );

      if (candidates.length === 0) {
        ok = false;
        break;
      }

      // Ưu tiên các bước làm box rời target
      const onTargetMoves = candidates.filter(c => {
        const [br, bc] = fromKey(c.boxKey);
        const [nr, nc] = fromKey(c.nextBoxKey);
        return targetsSet.has(toKey(br, bc)) && !targetsSet.has(toKey(nr, nc));
      });

      if (onTargetMoves.length > 0) {
        candidates = onTargetMoves;
      }

      const pick = chooseReverseCandidate(
    candidates,
    grid,
    boxesSet,
    targetsSet,
    targetPoints,
    rand
);
      if (!pick) {
        ok = false;
        break;
      }

      boxesSet.delete(pick.boxKey);
      boxesSet.add(pick.nextBoxKey);
      playerPos = { r: fromKey(pick.nextPlayerKey)[0], c: fromKey(pick.nextPlayerKey)[1] };
    }

    if (!ok) continue;

    // Đảm bảo không còn box nào nằm trên target
    let safety = 0;
    while (boxesOnTargetCount(boxesSet, targetsSet) > 0 && safety < 30) {
      let candidates = getReverseCandidates(
        grid,
        playerPos,
        boxesSet,
        targetsSet
      );
      if (candidates.length === 0) break;

      const preferred = candidates.filter(c => {
        const [br, bc] = fromKey(c.boxKey);
        const [nr, nc] = fromKey(c.nextBoxKey);
        return targetsSet.has(toKey(br, bc)) && !targetsSet.has(toKey(nr, nc));
      });

      if (preferred.length > 0) candidates = preferred;

      const pick = chooseReverseCandidate(
  candidates,
  grid,
  boxesSet,
  targetsSet,
  targetPoints,
  rand
);
      if (!pick) break;

      boxesSet.delete(pick.boxKey);
      boxesSet.add(pick.nextBoxKey);
      playerPos = { r: fromKey(pick.nextPlayerKey)[0], c: fromKey(pick.nextPlayerKey)[1] };

      safety++;
    }

    if (boxesOnTargetCount(boxesSet, targetsSet) !== 0) {
      continue;
    }
const boxes = [...boxesSet].map(fromKey);

// Không cho box quá gần target hoặc nhìn thẳng tới target

    // Chạy solver để lọc độ dài lời giải
    const analysis =
solveLevelAStar(
    grid,
    playerPos,
    boxesSet,
    targetsSet
);
      
    if (!analysis.solvable) continue;

    let minMoves, maxMoves;

switch(stageDifficulty){

    case "hard":
        minMoves = 38;
        maxMoves = 46;
        break;

    case "extreme":
        minMoves = 38;
        maxMoves = 47;
        break;

    default:
        minMoves = 38;
        maxMoves = 45;
}

if(
    analysis.moves < minMoves ||
    analysis.moves > maxMoves
){
    continue;
}


    // Gán lên grid
    for (const [r, c] of targets) grid[r][c] = '.';

    for (const boxKey of boxesSet) {
      const [r, c] = fromKey(boxKey);
      grid[r][c] = targetsSet.has(boxKey) ? '*' : '$';
    }

    grid[playerPos.r][playerPos.c] =
      targetsSet.has(toKey(playerPos.r, playerPos.c)) ? '+' : '@';

    const difficulty =
      analysis.pushes >= 24 ? 'RẤT KHÓ' :
      analysis.pushes >= 18 ? 'KHÓ' :
      analysis.pushes >= 12 ? 'VỪA' :
      'DỄ';

    return {
  name: `Cấp ${levelIndex + 1}`,
  map: grid.map(row => row.join('')),
  difficulty: `${difficulty} • ${analysis.moves} bước`,
  par: analysis.moves,
  stageDifficulty: stageDifficulty
};
  }
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

