
const SIZE = 15;
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

let board = [];
let human = "X", ai = "O";

// ---------- Zobrist hashing ----------
const zobristTable = [];
for (let r = 0; r < SIZE; r++) {
  zobristTable[r] = [];
  for (let c = 0; c < SIZE; c++) {
    zobristTable[r][c] = { X: Math.floor(Math.random() * 2 ** 30), O: Math.floor(Math.random() * 2 ** 30) };
  }
}
let boardHash = 0;

// ---------- Bảng chuyển vị / killer / history ----------
const TT = new Map();
const FLAG_EXACT = 0, FLAG_LOWER = 1, FLAG_UPPER = 2;
const MAX_KILLER_DEPTH = 20;
const killerMoves = Array(MAX_KILLER_DEPTH + 1).fill(null).map(() => [null, null]);
const historyTable = new Map();

// ---------- Trọng số các thế cờ ----------
const WEIGHTS = {
  FIVE: 10000000,
  OPEN_FOUR: 1000000,     // _oooo_  -> không thể chặn (2 điểm thắng)
  FOUR_GAP: 520000,       // oo_oo, o_ooo, ooo_o -> 1 điểm duy nhất hoàn thành 5
  FOUR_ONE: 500000,       // xoooo_  -> 1 điểm duy nhất hoàn thành 5
  OPEN_THREE: 50000,      // _ooo_
  GAP_THREE: 47000,       // _o_oo_ , _oo_o_ -> thành tứ mở nếu không chặn
  THREE_ONE: 5000,        // xooo_
  GAP_THREE_ONE: 4500,    // xo_oo_ ...
  OPEN_TWO: 500,
  TWO_ONE: 100,
  OPEN_ONE: 20
};

// Danh sách mẫu hình, kiểm tra theo thứ tự ưu tiên giảm dần.
const PATTERNS = [
  { re: /ooooo/, score: WEIGHTS.FIVE },
  { re: /_oooo_/, score: WEIGHTS.OPEN_FOUR },
  { re: /oo_oo/, score: WEIGHTS.FOUR_GAP },
  { re: /o_ooo/, score: WEIGHTS.FOUR_GAP },
  { re: /ooo_o/, score: WEIGHTS.FOUR_GAP },
  { re: /xoooo_/, score: WEIGHTS.FOUR_ONE },
  { re: /_oooox/, score: WEIGHTS.FOUR_ONE },
  { re: /_ooo_/, score: WEIGHTS.OPEN_THREE },
  { re: /_o_oo_/, score: WEIGHTS.GAP_THREE },
  { re: /_oo_o_/, score: WEIGHTS.GAP_THREE },
  { re: /xooo_/, score: WEIGHTS.THREE_ONE },
  { re: /_ooox/, score: WEIGHTS.THREE_ONE },
  { re: /xo_oo_/, score: WEIGHTS.GAP_THREE_ONE },
  { re: /_oo_ox/, score: WEIGHTS.GAP_THREE_ONE },
  { re: /xoo_o_/, score: WEIGHTS.GAP_THREE_ONE },
  { re: /_o_oox/, score: WEIGHTS.GAP_THREE_ONE },
  { re: /_oo_/, score: WEIGHTS.OPEN_TWO },
  { re: /xoo_/, score: WEIGHTS.TWO_ONE },
  { re: /_oox/, score: WEIGHTS.TWO_ONE },
  { re: /_o_/, score: WEIGHTS.OPEN_ONE }
];

function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

// Xây chuỗi biểu diễn 1 hướng quanh (r,c), bán kính 5 ô mỗi bên (đủ cho mọi mẫu hình cần xét).
function buildWindow(r, c, dr, dc, player) {
  let s = "";
  for (let k = -5; k <= 5; k++) {
    const nr = r + dr * k, nc = c + dc * k;
    if (!inBounds(nr, nc)) s += "x";
    else {
      const v = board[nr][nc];
      if (v === "") s += "_";
      else if (v === player) s += "o";
      else s += "x";
    }
  }
  return s;
}

function getWindowScore(str) {
  for (const p of PATTERNS) {
    if (p.re.test(str)) return p.score;
  }
  return 0;
}

// Điểm số nếu đặt quân player tại (r,c) — tổng 4 hướng.
function scoreCell(r, c, player) {
  if (board[r][c] !== "") return 0;
  board[r][c] = player;
  let total = 0;
  for (const [dr, dc] of DIRS) total += getWindowScore(buildWindow(r, c, dr, dc, player));
  board[r][c] = "";
  return total;
}

function evaluateCell(r, c, player) {
  if (board[r][c] !== player) return 0;
  let total = 0;
  for (const [dr, dc] of DIRS) total += getWindowScore(buildWindow(r, c, dr, dc, player));
  return total;
}

// Đánh giá toàn bàn cờ theo góc nhìn của `player`.
function evaluateBoard(player) {
  const enemy = player === "X" ? "O" : "X";
  let score = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = board[r][c];
      if (v === "") continue;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (inBounds(pr, pc) && board[pr][pc] === v) continue; // tránh đếm trùng
        const s = getWindowScore(buildWindow(r, c, dr, dc, v));
        if (v === player) score += s; else score -= s;
      }
    }
  }
  score += countForks(player) * 80000;
  score -= countForks(enemy) * 100000;
  return score;
}

function isThreatThreeAt(r, c, dr, dc, player) {
  board[r][c] = player;
  const w = buildWindow(r, c, dr, dc, player);
  board[r][c] = "";
  return w.includes("_ooo_") || w.includes("_o_oo_") || w.includes("_oo_o_");
}

function countForks(player) {
  let forkCount = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== "" || !hasNeighbor(r, c, 2)) continue;
      let cnt = 0;
      for (const [dr, dc] of DIRS) if (isThreatThreeAt(r, c, dr, dc, player)) cnt++;
      if (cnt >= 2) forkCount++;
    }
  }
  return forkCount;
}

// ==================== TIỆN ÍCH BÀN CỜ ====================
function hasNeighbor(r, c, radius = 2) {
  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] !== "") return true;
    }
  }
  return false;
}

function getOccupiedCount() {
  let n = 0;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] !== "") n++;
  return n;
}

function countDir(r, c, dr, dc, player) {
  let i = r + dr, j = c + dc, cnt = 0;
  while (inBounds(i, j) && board[i][j] === player) { cnt++; i += dr; j += dc; }
  return cnt;
}

function checkWin(r, c, player) {
  return (
    countDir(r, c, 1, 0, player) + countDir(r, c, -1, 0, player) >= 4 ||
    countDir(r, c, 0, 1, player) + countDir(r, c, 0, -1, player) >= 4 ||
    countDir(r, c, 1, 1, player) + countDir(r, c, -1, -1, player) >= 4 ||
    countDir(r, c, 1, -1, player) + countDir(r, c, -1, 1, player) >= 4
  );
}

function checkWinnerGlobal() {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (board[r][c] !== "" && checkWin(r, c, board[r][c])) return board[r][c];
  return null;
}

// Sinh + sắp xếp ứng viên trong 1 lần quét (gộp bước lọc và bước xếp hạng để đỡ tính lại).
function getOrderedCandidates(limit, depthForKiller) {
  const occ = getOccupiedCount();
  const cells = [];

  if (occ === 0) return [[Math.floor(SIZE / 2), Math.floor(SIZE / 2)]];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== "" || !hasNeighbor(r, c, 2)) continue;
      cells.push([r, c]);
    }
  }
  if (cells.length === 0) return [[Math.floor(SIZE / 2), Math.floor(SIZE / 2)]];

  const ttEntry = TT.get(boardHash);
  const kd = killerMoves[depthForKiller] || [null, null];

  const scored = cells.map(([r, c]) => {
    const atk = scoreCell(r, c, ai);
    const def = scoreCell(r, c, human);
    let priority = Math.max(atk, def * 1.05);
    if (ttEntry && ttEntry.bestMove && ttEntry.bestMove[0] === r && ttEntry.bestMove[1] === c) priority += 2000000;
    if (kd[0] && kd[0][0] === r && kd[0][1] === c) priority += 6000;
    if (kd[1] && kd[1][0] === r && kd[1][1] === c) priority += 3000;
    const key = r + "," + c;
    priority += (historyTable.get(key) || 0);
    return { move: [r, c], priority };
  });
  scored.sort((a, b) => b.priority - a.priority);
  return scored.slice(0, limit).map(x => x.move);
}

// ==================== CHIẾN THUẬT CƠ BẢN (dùng cho root) ====================
function findWin(player) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== "") continue;
      board[r][c] = player;
      const w = checkWin(r, c, player);
      board[r][c] = "";
      if (w) return [r, c];
    }
  }
  return null;
}

function findOpenFour(player) {
  for (const [r, c] of getOrderedCandidates(60, 0)) {
    board[r][c] = player;
    let found = false;
    for (const [dr, dc] of DIRS) {
      if (buildWindow(r, c, dr, dc, player).includes("_oooo_")) { found = true; break; }
    }
    board[r][c] = "";
    if (found) return [r, c];
  }
  return null;
}

function countThreats(r, c, player) {
  if (board[r][c] !== "") return 0;
  board[r][c] = player;
  let threats = 0;
  for (const [dr, dc] of DIRS) {
    const s = getWindowScore(buildWindow(r, c, dr, dc, player));
    if (s >= WEIGHTS.GAP_THREE) threats++;
  }
  board[r][c] = "";
  return threats;
}

function findDoubleThreat(player) {
  let best = null, bestScore = 0;
  for (const [r, c] of getOrderedCandidates(60, 0)) {
    const t = countThreats(r, c, player);
    if (t >= 2 && t > bestScore) { bestScore = t; best = [r, c]; }
  }
  return best;
}

// ==================== TÌM KIẾM CHUỖI THẮNG BẮT BUỘC (VCF) ====================
function getFiveCompletionPoints(player) {
  const pts = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== "" || !hasNeighbor(r, c, 2)) continue;
      board[r][c] = player;
      if (checkWin(r, c, player)) pts.push([r, c]);
      board[r][c] = "";
    }
  }
  return pts;
}

function vcfSearch(player, opponent, depth, deadline) {
  if (depth <= 0 || Date.now() > deadline) return null;
  if (findWin(opponent)) return null; // đối phương đã có nước thắng sẵn, không ép được nữa

  const candidates = getOrderedCandidates(40, 0);
  for (const [r, c] of candidates) {
    if (board[r][c] !== "") continue;
    board[r][c] = player;

    if (checkWin(r, c, player)) { board[r][c] = ""; return [[r, c]]; }
    if (findWin(opponent)) { board[r][c] = ""; continue; } // đối phương có nước thắng riêng, bỏ nước này

    const pts = getFiveCompletionPoints(player);
    if (pts.length === 0) { board[r][c] = ""; continue; } // không tạo ra mối đe doạ "tứ", bỏ qua
    if (pts.length >= 2) { board[r][c] = ""; return [[r, c]]; } // tứ đôi — không thể chặn hết

    const [br, bc] = pts[0];
    board[br][bc] = opponent;
    if (checkWin(br, bc, opponent)) { board[br][bc] = ""; board[r][c] = ""; continue; } // chặn xong lại thắng luôn -> hỏng

    const rest = vcfSearch(player, opponent, depth - 2, deadline);
    board[br][bc] = "";
    board[r][c] = "";
    if (rest) return [[r, c], [br, bc], ...rest];
    if (Date.now() > deadline) return null;
  }
  return null;
}

// ==================== QUIESCENCE ====================
let startTime = 0;
let TIME_LIMIT = 2200;
const QUIESCENCE_DEPTH = 6;

function quiescence(alpha, beta, isMax, player, qdepth) {
  const enemy = player === "X" ? "O" : "X";
  if (qdepth <= 0 || Date.now() - startTime > TIME_LIMIT) {
    return isMax ? evaluateBoard(player) : -evaluateBoard(enemy);
  }
  const standPat = isMax ? evaluateBoard(player) : -evaluateBoard(enemy);
  if (isMax) { if (standPat >= beta) return beta; if (standPat > alpha) alpha = standPat; }
  else { if (standPat <= alpha) return alpha; if (standPat < beta) beta = standPat; }

  const mover = isMax ? player : enemy;
  const other = mover === player ? enemy : player;
  const cands = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== "" || !hasNeighbor(r, c, 2)) continue;
      const atk = scoreCell(r, c, mover);
      const def = scoreCell(r, c, other);
      if (atk >= WEIGHTS.FOUR_ONE || def >= WEIGHTS.FOUR_ONE) cands.push([r, c]);
    }
  }
  if (cands.length === 0) return standPat;
  cands.sort((a, b) => {
    const sa = Math.max(scoreCell(a[0], a[1], player), scoreCell(a[0], a[1], enemy));
    const sb = Math.max(scoreCell(b[0], b[1], player), scoreCell(b[0], b[1], enemy));
    return sb - sa;
  });
  for (const [r, c] of cands) {
    board[r][c] = mover;
    boardHash ^= zobristTable[r][c][mover];
    const score = quiescence(alpha, beta, !isMax, player, qdepth - 1);
    board[r][c] = "";
    boardHash ^= zobristTable[r][c][mover];
    if (isMax) { if (score >= beta) return beta; if (score > alpha) alpha = score; }
    else { if (score <= alpha) return alpha; if (score < beta) beta = score; }
  }
  return isMax ? alpha : beta;
}

// ==================== MINIMAX + ĐÀO SÂU DẦN ====================
function minimax(depth, isMax, player, alpha, beta) {
  const enemy = player === "X" ? "O" : "X";
  const winner = checkWinnerGlobal();
  if (winner === player) return 5000000 + depth * 1000;
  if (winner === enemy) return -5000000 - depth * 1000;
  if (depth === 0) return quiescence(alpha, beta, isMax, player, QUIESCENCE_DEPTH);

  const ttEntry = TT.get(boardHash);
  if (ttEntry && ttEntry.depth >= depth) {
    if (ttEntry.flag === FLAG_EXACT) return ttEntry.score;
    if (ttEntry.flag === FLAG_LOWER && ttEntry.score > alpha) alpha = ttEntry.score;
    if (ttEntry.flag === FLAG_UPPER && ttEntry.score < beta) beta = ttEntry.score;
    if (alpha >= beta) return ttEntry.score;
  }

  const currentPlayer = isMax ? player : enemy;
  const kIdx = Math.min(depth, MAX_KILLER_DEPTH);
  const candidates = getOrderedCandidates(CANDIDATE_LIMIT, kIdx);
  if (candidates.length === 0) return evaluateBoard(player);

  let best = isMax ? -Infinity : Infinity;
  let bestMove = null;
  let flag = FLAG_EXACT;

  for (const [r, c] of candidates) {
    if (board[r][c] !== "") continue;
    board[r][c] = currentPlayer;
    boardHash ^= zobristTable[r][c][currentPlayer];
    const score = minimax(depth - 1, !isMax, player, alpha, beta);
    board[r][c] = "";
    boardHash ^= zobristTable[r][c][currentPlayer];

    if (isMax) { if (score > best) { best = score; bestMove = [r, c]; } alpha = Math.max(alpha, score); }
    else { if (score < best) { best = score; bestMove = [r, c]; } beta = Math.min(beta, score); }

    if (alpha >= beta) {
      if (!killerMoves[kIdx][0] || killerMoves[kIdx][0][0] !== r || killerMoves[kIdx][0][1] !== c) {
        killerMoves[kIdx][1] = killerMoves[kIdx][0];
        killerMoves[kIdx][0] = [r, c];
      }
      const key = r + "," + c;
      historyTable.set(key, (historyTable.get(key) || 0) + depth * depth);
      flag = isMax ? FLAG_LOWER : FLAG_UPPER;
      break;
    }
    if (Date.now() - startTime > TIME_LIMIT) break;
  }

  TT.set(boardHash, { depth, score: best, flag, bestMove });
  return best;
}

let CANDIDATE_LIMIT = 24;
let MAX_DEPTH = 12;

function iterativeDeepening() {
  startTime = Date.now();
  TT.clear();
  killerMoves.forEach(a => a.fill(null));
  historyTable.clear();

  let bestMove = null;
  let depth = 1;
  while (depth <= MAX_DEPTH) {
    if (Date.now() - startTime > TIME_LIMIT) break;
    const candidates = getOrderedCandidates(CANDIDATE_LIMIT, 0);
    let localBest = -Infinity, localMove = null;
    for (const [r, c] of candidates) {
      if (board[r][c] !== "") continue;
      board[r][c] = ai;
      boardHash ^= zobristTable[r][c][ai];
      const score = minimax(depth - 1, false, ai, -Infinity, Infinity);
      board[r][c] = "";
      boardHash ^= zobristTable[r][c][ai];
      if (score > localBest) { localBest = score; localMove = [r, c]; }
      if (Date.now() - startTime > TIME_LIMIT) break;
    }
    if (localMove) bestMove = localMove;
    if (localBest > 4000000) break; // đã tìm ra thắng chắc, khỏi đào sâu thêm
    depth++;
  }
  return bestMove;
}

// Tham số thích ứng theo giai đoạn ván cờ.
function setDynamicParams() {
  const occ = getOccupiedCount();
  if (occ < 10) { CANDIDATE_LIMIT = 20; TIME_LIMIT = 1400; MAX_DEPTH = 10; }
  else if (occ < 60) { CANDIDATE_LIMIT = 26; TIME_LIMIT = 2400; MAX_DEPTH = 12; }
  else { CANDIDATE_LIMIT = 22; TIME_LIMIT = 2600; MAX_DEPTH = 14; }
}

// ==================== ĐIỂM VÀO CHÍNH ====================
function getBestMove() {
  try {
    if (getOccupiedCount() === 0) return [Math.floor(SIZE / 2), Math.floor(SIZE / 2)];

    let move = findWin(ai); if (move) return move;
    move = findWin(human); if (move) return move;
    move = findOpenFour(ai); if (move) return move;

    const vcfDeadline = Date.now() + 700;
    const seq = vcfSearch(ai, human, 14, vcfDeadline);
    if (seq && seq.length) return seq[0];

    move = findOpenFour(human); if (move) return move;
    move = findDoubleThreat(ai); if (move) return move;
    move = findDoubleThreat(human); if (move) return move;

    setDynamicParams();
    const best = iterativeDeepening();
    if (best) return best;

    const fallback = getOrderedCandidates(1, 0)[0];
    return fallback || [Math.floor(SIZE / 2), Math.floor(SIZE / 2)];
  } catch (e) {
    const fallback = getOrderedCandidates(1, 0)[0];
    return fallback || [Math.floor(SIZE / 2), Math.floor(SIZE / 2)];
  }
}

// ==================== GIAO TIẾP VỚI LUỒNG CHÍNH ====================
self.onmessage = function (e) {
  const data = e.data;
  if (!data || data.type !== "think") return;

  board = data.board.map(row => row.slice());
  human = data.human;
  ai = data.ai;

  boardHash = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === "X" || board[r][c] === "O") boardHash ^= zobristTable[r][c][board[r][c]];
    }
  }

  const move = getBestMove();
  self.postMessage({ type: "move", move });
};


