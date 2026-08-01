(() => {
  const W = 7, H = 9;
  const boardEl = document.getElementById('board');
  const cellMap = new Map();
  const grassMap = new Map();
  let captureFx = null;
  let lastBlueMove = null;
let lastRedMove = null;
  const HUMAN_SIDE = 'blue';
  const AI_SIDE = 'red';
  const AI_DEPTH = 4;
  let aiThinking = false;
  let aiTimer = null;

  const PIECE_SCORE = {
    rat: 100,
    cat: 200,
    owl: 200,
    dog: 300,
    wolf: 400,
    leopard: 520,
    tiger: 680,
    lion: 820,
    elephant: 1000,
    crocodile: 680,
    snake: 100,
    bear: 820,
    eagle: 820
  };
  const turnValue = document.getElementById('turnValue');
  const statusEl = document.getElementById('status');
  const winnerPanel = document.getElementById('winnerPanel');
  const winnerEl = document.getElementById('winner');
  const restartBtn = document.getElementById('restartBtn');
  const infoBtn = document.getElementById('infoBtn');
  const rulesModal = document.getElementById('rulesModal');
  const closeRulesBtn = document.getElementById('closeRulesBtn');
  const modeBtn = document.getElementById('modeBtn');
  let tideMode = false;
  let forestMode = false;
  const tideBtn = document.getElementById('tideBtn');
  let upMode = false;
  let revealedIds = new Set();
  let deathMatchMode = false;
  const deathBtn = document.getElementById('deathBtn');
  const foodChain = document.getElementById('foodChain');

function updateFoodChain() {
  if (forestMode) {
    foodChain.textContent = "🐻 = 🦅 > 🐊 =  🐯 > 🐆 > 🐺 > 🦉 > 🐍";
  } else if (deathMatchMode) {
    foodChain.textContent = "🐘 > 🦁 > 🐯 > 🐆 > 🐺 > 🦉 > 🐭 > 🐘";
  } else {
    foodChain.textContent = "🐘 > 🦁 > 🐯 > 🐆 > 🐺 > 🐶 > 🐱 > 🐭 > 🐘";
  }
}
  
  function revealGrass(piece) {
    const key = `${piece.x},${piece.y}`;
    const grass = grassMap.get(key);
    if (!grass) return;
    const pieceDiv = grass.parentElement; // div.piece
    if (!pieceDiv) return;
    grass.remove();
    grassMap.delete(key);
    revealedIds.add(piece.id);
    const def = pieceDefs[piece.type];
    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'emoji';
    emojiSpan.textContent = def.emoji;
    pieceDiv.appendChild(emojiSpan);
    if (isTrapFor(piece, piece.x, piece.y)) {
      const arrow = document.createElement('div');
      arrow.className = 'trapArrow';
      arrow.textContent = '➟';
      pieceDiv.appendChild(arrow);
    }
  }

function updateModeBtn() {
  modeBtn.textContent = upMode ? 'Cờ úp' : 'Cờ thường';
  modeBtn.classList.toggle('modeOn', upMode);
  
  // Vô hiệu hóa các nút khi đang ở Rừng sâu hoặc Tử chiến
  if (forestMode || deathMatchMode) {
    modeBtn.classList.add('disabled-btn');
    if (!forestMode) tideBtn.classList.add('disabled-btn'); // Tử chiến disable nút thủy triều
  } else {
    modeBtn.classList.remove('disabled-btn');
  }
  
  // Luôn cho phép bấm nút thủy triều trừ khi đang Tử chiến
  if (deathMatchMode) {
    tideBtn.classList.add('disabled-btn');
  } else {
    tideBtn.classList.remove('disabled-btn');
  }

  // Cập nhật text và class cho nút tideBtn
  if (forestMode) {
    tideBtn.textContent = 'Rừng sâu';
    tideBtn.classList.add('modeOn');
    tideBtn.classList.remove('tideOn');
  } else if (tideMode) {
    tideBtn.textContent = 'Thủy triều';
    tideBtn.classList.add('tideOn');
    tideBtn.classList.remove('modeOn');
  } else {
    tideBtn.textContent = 'Thủy triều';
    tideBtn.classList.remove('tideOn', 'modeOn');
  }
}
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Hàm lấy định nghĩa quân tùy chế độ
function getPieceDefs() {
  if (forestMode) {
    return {
      bear:    { rank: 7, emoji: '🐻', name: 'Gấu' },
      eagle:   { rank: 7, emoji: '🦅', name: 'Đại bàng' },
      crocodile: { rank: 6, emoji: '🐊', name: 'Cá sấu' },
      owl:     { rank: 2, emoji: '🦉', name: 'Cú' },
      wolf:    { rank: 4, emoji: '🐺', name: 'Sói' },
      leopard: { rank: 5, emoji: '🐆', name: 'Báo' },
      tiger:   { rank: 6, emoji: '🐯', name: 'Hổ' },
      snake: { rank: 1, emoji: '🐍', name: 'Rắn' },
    };
  }
  if (deathMatchMode) {
    return {
      rat:     { rank: 1, emoji: '🐭', name: 'Chuột' },
      owl:     { rank: 2, emoji: '🦉', name: 'Cú' },
      wolf:    { rank: 4, emoji: '🐺', name: 'Sói' },
      leopard: { rank: 5, emoji: '🐆', name: 'Báo' },
      tiger:   { rank: 6, emoji: '🐯', name: 'Hổ' },
      lion:    { rank: 7, emoji: '🦁', name: 'Sư tử' },
      elephant:{ rank: 8, emoji: '🐘', name: 'Voi' }
    };
  }
  return {
    rat:     { rank: 1, emoji: '🐭', name: 'Chuột' },
    cat:     { rank: 2, emoji: '🐱', name: 'Mèo' },
    dog:     { rank: 3, emoji: '🐶', name: 'Chó' },
    wolf:    { rank: 4, emoji: '🐺', name: 'Sói' },
    leopard: { rank: 5, emoji: '🐆', name: 'Báo' },
    tiger:   { rank: 6, emoji: '🐯', name: 'Hổ' },
    lion:    { rank: 7, emoji: '🦁', name: 'Sư tử' },
    elephant:{ rank: 8, emoji: '🐘', name: 'Voi' }
  };
}

function buildInitialPieces() {
  if (forestMode) {
    // Rừng sâu: mỗi bên 7 quân (không có chuột, thay voi = gấu, sư tử = đại bàng, chó mèo = cú)
    const base = [
      // Xanh
      {id:'b_eagle',  side:'blue', type:'eagle',   x:0, y:0},
      {id:'b_tiger',  side:'blue', type:'tiger',   x:6, y:0},
      {id:'b_owl1',   side:'blue', type:'owl',     x:1, y:1},
      {id:'b_owl2',   side:'blue', type:'owl',     x:5, y:1},
      {id:'b_wolf',   side:'blue', type:'wolf',    x:2, y:2},
      {id:'b_leopard',side:'blue', type:'leopard', x:4, y:2},
      {id:'b_croc',   side:'blue', type:'crocodile', x:0, y:2},
      {id:'b_snake',   side:'blue', type:'snake',     x:6, y:2},
      {id:'b_bear',   side:'blue', type:'bear',    x:3, y:3},
      // Đỏ
      {id:'r_eagle',  side:'red',  type:'eagle',   x:6, y:8},
      {id:'r_tiger',  side:'red',  type:'tiger',   x:0, y:8},
      {id:'r_owl1',   side:'red',  type:'owl',     x:5, y:7},
      {id:'r_owl2',   side:'red',  type:'owl',     x:1, y:7},
      {id:'r_wolf',   side:'red',  type:'wolf',    x:4, y:6},
      {id:'r_snake',   side:'red',  type:'snake',     x:0, y:6},
      {id:'r_leopard',side:'red',  type:'leopard', x:2, y:6},
      {id:'r_croc',   side:'red',  type:'crocodile', x:6, y:6},
      {id:'r_bear',   side:'red',  type:'bear',    x:3, y:5}
    ];
    return base.map(p => ({...p, stunned: 0, asleep: 0}));
  }

  if (deathMatchMode) {
    // Tử chiến: thay chó mèo thành cú, còn lại giữ nguyên
    const base = [
      {id:'b_lion',    side:'blue', type:'lion',    x:0, y:0},
      {id:'b_tiger',   side:'blue', type:'tiger',   x:6, y:0},
      {id:'b_owl_d1',  side:'blue', type:'owl',     x:1, y:1},
      {id:'b_owl_c1',  side:'blue', type:'owl',     x:5, y:1},
      {id:'b_wolf',    side:'blue', type:'wolf',    x:2, y:2},
      {id:'b_leopard', side:'blue', type:'leopard', x:4, y:2},
      {id:'b_rat',     side:'blue', type:'rat',     x:0, y:2},
      {id:'b_elephant',side:'blue', type:'elephant',x:6, y:2},
      {id:'r_lion',    side:'red',  type:'lion',    x:6, y:8},
      {id:'r_tiger',   side:'red',  type:'tiger',   x:0, y:8},
      {id:'r_owl_d1',  side:'red',  type:'owl',     x:5, y:7},
      {id:'r_owl_c1',  side:'red',  type:'owl',     x:1, y:7},
      {id:'r_wolf',    side:'red',  type:'wolf',    x:4, y:6},
      {id:'r_leopard', side:'red',  type:'leopard', x:2, y:6},
      {id:'r_rat',     side:'red',  type:'rat',     x:6, y:6},
      {id:'r_elephant',side:'red',  type:'elephant',x:0, y:6}
    ];
    return base.map(p => ({...p, stunned: 0, asleep: 0}));
  }

  // Mặc định
  const base = [
    {id:'b_lion',    side:'blue', type:'lion',    x:0, y:0},
    {id:'b_tiger',   side:'blue', type:'tiger',   x:6, y:0},
    {id:'b_dog',     side:'blue', type:'dog',     x:1, y:1},
    {id:'b_cat',     side:'blue', type:'cat',     x:5, y:1},
    {id:'b_wolf',    side:'blue', type:'wolf',    x:2, y:2},
    {id:'b_leopard', side:'blue', type:'leopard', x:4, y:2},
    {id:'b_rat',     side:'blue', type:'rat',     x:0, y:2},
    {id:'b_elephant',side:'blue', type:'elephant',x:6, y:2},
    {id:'r_lion',    side:'red',  type:'lion',    x:6, y:8},
    {id:'r_tiger',   side:'red',  type:'tiger',   x:0, y:8},
    {id:'r_dog',     side:'red',  type:'dog',     x:5, y:7},
    {id:'r_cat',     side:'red',  type:'cat',     x:1, y:7},
    {id:'r_wolf',    side:'red',  type:'wolf',    x:4, y:6},
    {id:'r_leopard', side:'red',  type:'leopard', x:2, y:6},
    {id:'r_rat',     side:'red',  type:'rat',     x:6, y:6},
    {id:'r_elephant',side:'red',  type:'elephant',x:0, y:6}
  ];
  return base.map(p => ({...p, stunned: 0, asleep: 0}));
}
  let initialPieces = buildInitialPieces();

  function buildPiecesForMode() {
    if (!upMode) {
      revealedIds = new Set(initialPieces.map(p => p.id));
      return structuredClone(initialPieces);
    }
    revealedIds = new Set();
    const bluePieces = initialPieces.filter(p => p.side === 'blue').map(p => ({ ...p }));
    const redPieces = initialPieces.filter(p => p.side === 'red').map(p => ({ ...p }));
    const bluePos = bluePieces.map(p => ({ x: p.x, y: p.y }));
    const redPos = redPieces.map(p => ({ x: p.x, y: p.y }));
    shuffleArray(bluePos);
    shuffleArray(redPos);
    bluePieces.forEach((p, i) => { p.x = bluePos[i].x; p.y = bluePos[i].y; });
    redPieces.forEach((p, i) => { p.x = redPos[i].x; p.y = redPos[i].y; });
    return [...bluePieces, ...redPieces];
  }

  function isHiddenPiece(piece) {
    return upMode && !revealedIds.has(piece.id);
  }
  
  function isWaterOrTide(x, y) {
    const t = terrain(x, y);
    return t === 'water' || t === 'tide';
  }
  
  function syncTurnUI() {
    turnValue.textContent = state.turn === 'blue' ? 'XANH' : 'ĐỎ';
    turnValue.className = 'turnValue ' + state.turn;
  }

  // terrain() luôn trả về địa hình LOGIC (denBlue/denRed/trapBlue/trapRed/water/land/tide),
  // bất kể đang ở chế độ nào. Toàn bộ luật chơi (vào sông, vào hang, bẫy hạ cấp...) đều
  // dựa vào các chuỗi này nên phải giữ nhất quán giữa các chế độ (thường / rừng sâu / tử chiến).
  const terrain = (x, y) => {
  if (state && state.tideActive && y === 4 && x >= 0 && x < W) {
    return 'tide';
  }
  const denBlue = x === 3 && y === 0;
  const denRed = x === 3 && y === 8;
  // Rừng sâu: 5 ô bẫy bao quanh ô hang (2 ô hai bên, 1 ô ngay trước, 2 ô chéo trước hang).
  // Các chế độ khác giữ nguyên bố trí bẫy gốc (2 ô chéo + 1 ô ngay trước hang).
  const trapBlue = forestMode
    ? ((x === 2 && y === 0) || (x === 4 && y === 0) || (x === 3 && y === 1) || (x === 2 && y === 1) || (x === 4 && y === 1))
    : ((x === 2 && y === 0) || (x === 4 && y === 0) || (x === 3 && y === 1));
  const trapRed = forestMode
    ? ((x === 2 && y === 8) || (x === 4 && y === 8) || (x === 3 && y === 7) || (x === 2 && y === 7) || (x === 4 && y === 7))
    : ((x === 2 && y === 8) || (x === 4 && y === 8) || (x === 3 && y === 7));
  const water = (y >= 3 && y <= 5) && (x === 1 || x === 2 || x === 4 || x === 5);
  if (denBlue) return 'denBlue';
  if (denRed) return 'denRed';
  if (trapBlue) return 'trapBlue';
  if (trapRed) return 'trapRed';
  if (water) return 'water';
  return 'land';
};

  // visualTerrainClass() chỉ dùng để CHỌN CLASS CSS hiển thị, tách biệt với địa hình logic ở trên.
  // Đây là nơi duy nhất ánh xạ theo chế độ (thường / rừng sâu) sang giao diện tương ứng.
  function visualTerrainClass(t) {
    if (forestMode) {
      if (t === 'denBlue' || t === 'denRed') return 'forest-den';
      if (t === 'trapBlue' || t === 'trapRed') return 'forest-trap';
      if (t === 'water') return 'forest-water';
      if (t === 'land') return 'forest-land';
      return t; // 'tide' (không xảy ra cùng lúc với rừng sâu)
    }
    if (t === 'denBlue' || t === 'denRed') return 'den';
    if (t === 'trapBlue' || t === 'trapRed') return 'trap';
    return t; // 'water','land','tide'
  }

  // Địa hình gốc không bao gồm thủy triều
  function baseTerrain(x, y) {
    const denBlue = x === 3 && y === 0;
    const denRed = x === 3 && y === 8;
    const trapBlue = (x === 2 && y === 0) || (x === 4 && y === 0) || (x === 3 && y === 1);
    const trapRed = (x === 2 && y === 8) || (x === 4 && y === 8) || (x === 3 && y === 7);
    const water = (y >= 3 && y <= 5) && (x === 1 || x === 2 || x === 4 || x === 5);
    if (denBlue) return 'denBlue';
    if (denRed) return 'denRed';
    if (trapBlue) return 'trapBlue';
    if (trapRed) return 'trapRed';
    if (water) return 'water';
    return 'land';
  }

  // Kiểm tra quân có bị choáng hoặc ngủ không
  function isDisabled(piece) {
    return piece.stunned > 0 || piece.asleep > 0;
  }

  // Kiểm tra hai quân đồng rank trong chế độ Tử chiến
  function isMutualKill(attacker, defender, ax, ay, dx, dy) {
  if (!deathMatchMode) return false;
  const aRank = effectiveRank(attacker, ax, ay);
  const dRank = effectiveRank(defender, dx, dy);
  return aRank === dRank;
}

function processMove(piece, move) {
  const defender = pieceAt(move.x, move.y);

  // Rắn: hoán đổi vị trí với thú khác (đồng minh hoặc đối phương) thay vì ăn quân
  if (move.swap && defender) {
    const oldX = piece.x, oldY = piece.y;
    if (upMode && !revealedIds.has(defender.id)) revealedIds.add(defender.id);
    defender.x = oldX;
    defender.y = oldY;
    piece.x = move.x;
    piece.y = move.y;
    if (piece.side === 'blue') {
      lastBlueMove = { x: oldX, y: oldY };
    } else {
      lastRedMove = { x: oldX, y: oldY };
    }
    captureFx = { x: move.x, y: move.y, icon: '🔄' };
    return;
  }

  // Cú đánh cú: cả hai cùng chết
  if (piece.type === 'owl' && move.capture && defender && defender.type === 'owl') {
    state.pieces = state.pieces.filter(p => p.id !== defender.id && p.id !== piece.id);
    captureFx = { x: move.x, y: move.y, icon: '💀' };
    return;
  }

  // Cú đánh quân mạnh hơn: quân bị đánh choáng, cú ngủ, cú KHÔNG tiến vào ô đó
  if (piece.type === 'owl' && move.capture && defender) {
    const aRank = effectiveRank(piece, piece.x, piece.y);
    const dRank = effectiveRank(defender, move.x, move.y);

    if (dRank > aRank) {
      defender.stunned = 3;
      piece.asleep = 3;
      captureFx = { x: move.x, y: move.y, icon: '💫' };
      return;
    }

    // Cú thắng thì ăn bình thường, nhưng vẫn ngủ sau khi hành động
    state.pieces = state.pieces.filter(p => p.id !== defender.id);
    captureFx = { x: move.x, y: move.y, icon: '💥' };
    if (piece.side === 'blue') {
  lastBlueMove = { x: piece.x, y: piece.y };
} else {
  lastRedMove = { x: piece.x, y: piece.y };
}

piece.x = move.x;
piece.y = move.y;
    piece.asleep = 3;
    return;
  }

  // Các quân khác
  if (move.capture && defender) {
    if (isMutualKill(piece, defender, piece.x, piece.y, move.x, move.y)) {
      state.pieces = state.pieces.filter(p => p.id !== defender.id && p.id !== piece.id);
      captureFx = { x: move.x, y: move.y, icon: '💀' };
      return;
    } else {
      state.pieces = state.pieces.filter(p => p.id !== defender.id);
      captureFx = { x: move.x, y: move.y };
    }
  }

  if (state.pieces.find(p => p.id === piece.id)) {
  // Lưu lại vị trí cũ để hiển thị dấu chân
  const oldX = piece.x;
  const oldY = piece.y;

  piece.x = move.x;
  piece.y = move.y;

  // Cập nhật dấu chân
  if (piece.side === 'blue') {
    lastBlueMove = { x: oldX, y: oldY };
  } else {
    lastRedMove = { x: oldX, y: oldY };
  }

  // Cú dùng kỹ năng bay 2 ô thì ngủ 3 lượt
  if (
    piece.type === 'owl' &&
    (Math.abs(move.x - move.fromX) + Math.abs(move.y - move.fromY) === 2)
  ) {
    piece.asleep = 3;
  }
}
}

  // Giảm trạng thái choáng/ngủ mỗi đầu lượt
  function decreaseStatuses(pieces) {
    for (let p of pieces) {
      if (p.stunned > 0) p.stunned--;
      if (p.asleep > 0) p.asleep--;
    }
  }

  let state;

  function reset() {
    clearTimeout(aiTimer);
    pieceDefs = getPieceDefs();
    initialPieces = buildInitialPieces();
    aiTimer = null;
    aiThinking = false;
    state = {
      pieces: buildPiecesForMode(),
      turn: 'blue',
      selectedId: null,
      legal: [],
      winner: null,
      tideActive: false,
      tideAnimating: false,
      tideCountdown: 3
    };
    updateModeBtn();
    updateFoodChain();
    tideBtn.classList.toggle('tideOn', tideMode);
tideBtn.classList.toggle('modeOn', forestMode);
if (forestMode) tideBtn.textContent = 'Rừng sâu';
else if (tideMode) tideBtn.textContent = 'Thủy triều';
else tideBtn.textContent = 'Thủy triều';
    tideBtn.classList.toggle('tideOn', tideMode);
    deathBtn.classList.toggle('modeOn', deathMatchMode);
    winnerPanel.classList.remove('show');
    winnerEl.classList.remove('show');
    winnerEl.textContent = '';
    startHumanTurn();
    cellMap.clear();
    grassMap.clear();
    lastBlueMove = null;
lastRedMove = null;
    render();
  }
  
  function applyTide() {
    state.tideActive = true;
    state.tideAnimating = true;
    const victims = state.pieces.filter(p => p.y === 4 && p.type !== 'rat');
    for (const v of victims) {
      const idx = state.pieces.findIndex(p => p.id === v.id);
      if (idx >= 0) state.pieces.splice(idx, 1);
    }
    if (victims.length) setStatus('Thủy triều dâng! Một số quân bị chết đuối.');
    if (!state.pieces.some(p => p.side === HUMAN_SIDE)) {
      state.winner = AI_SIDE;
      winnerEl.textContent = 'AI thắng do thủy triều!';
    } else if (!state.pieces.some(p => p.side === AI_SIDE)) {
      state.winner = HUMAN_SIDE;
      winnerEl.textContent = 'Bạn thắng do thủy triều!';
    }
    if (state.winner) {
      winnerPanel.classList.add('show');
      winnerEl.classList.add('show');
    }
  }
  
  function createTideOverlays(phase) {
    boardEl.querySelectorAll('.tide-overlay').forEach(el => el.remove());
    for (let x = 0; x < W; x++) {
      const cell = cellMap.get(`${x},4`);
      if (!cell) continue;
      const overlay = document.createElement('div');
      overlay.className = `tide-overlay ${phase}`;
      overlay.style.left = cell.offsetLeft + 'px';
      overlay.style.top = cell.offsetTop + 'px';
      overlay.style.width = cell.offsetWidth + 'px';
      overlay.style.height = cell.offsetHeight + 'px';
      overlay.style.zIndex = '15';
      boardEl.appendChild(overlay);
      overlay.addEventListener('animationend', () => overlay.remove());
    }
  }
  
  function startHumanTurn() {
    decreaseStatuses(state.pieces);
    if (tideMode && !state.tideActive && state.tideCountdown <= 0) {
      applyTide();
      state.tideCountdown = 3;
      if (state.winner) {
        render();
        return;
      }
      render();
      requestAnimationFrame(() => {
        createTideOverlays('rising');
        setTimeout(() => {
          state.tideAnimating = false;
          render();
          clearSelection('Đến lượt bạn.');
        }, 1500);
      });
      return;
    }
    clearSelection('Đến lượt bạn.');
  }
  
  function pieceAt(x, y, pieces = state.pieces) {
    return pieces.find(p => p.x === x && p.y === y) || null;
  }
  function inBounds(x, y) { return x >= 0 && x < W && y >= 0 && y < H; }
  function isWater(x, y) { return terrain(x, y) === 'water'; }
  function isTrapFor(piece, x, y) {
    const t = terrain(x, y);
    return (piece.side === 'blue' && t === 'trapRed') || (piece.side === 'red' && t === 'trapBlue');
  }
  function isOwnDen(piece, x, y) {
    const t = terrain(x, y);
    return (piece.side === 'blue' && t === 'denBlue') || (piece.side === 'red' && t === 'denRed');
  }
  function isEnemyDen(piece, x, y) {
    const t = terrain(x, y);
    return (piece.side === 'blue' && t === 'denRed') || (piece.side === 'red' && t === 'denBlue');
  }
  function effectiveRank(piece, x = piece.x, y = piece.y) {
    return isTrapFor(piece, x, y) ? 0 : pieceDefs[piece.type].rank;
  }
  // Các loài lưỡng cư: có thể ăn/bị ăn tự do khi đối phương đứng dưới nước
  function isAmphibious(type) {
    return type === 'rat' || type === 'owl' || type === 'crocodile';
  }
  function canCapture(attacker, defender, ax, ay, dx, dy) {
    if (attacker.side === defender.side) return false;
    const attackerInWater = isWaterOrTide(ax, ay);
    const defenderInWater = isWaterOrTide(dx, dy);
    if (!isAmphibious(attacker.type) && defenderInWater) return false;
    if (defender.type === 'rat' && defenderInWater && !isAmphibious(attacker.type)) return false;
    const aRank = effectiveRank(attacker, ax, ay);
    const dRank = effectiveRank(defender, dx, dy);
    if (dRank === 0) return true; // Quân địch đang đứng trong bẫy của mình -> mất sức mạnh, ai cũng ăn được
    if (attacker.type === 'rat' && defender.type === 'elephant') return true;
    if (attacker.type === 'elephant' && defender.type === 'rat') return false;
    if (attacker.type === 'owl') return true;
    if (attacker.type === 'rat' && defender.type === 'rat') return attackerInWater === defenderInWater;
    return aRank >= dRank;
  }

  // Cá sấu: chỉ di chuyển/tấn công theo đường chéo 1 ô, có thể tự do vào sông
  function crocodileMoves(piece) {
    const moves = [];
    const diagDirs = [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dx, dy] of diagDirs) {
      const x = piece.x + dx;
      const y = piece.y + dy;
      if (!inBounds(x, y) || isOwnDen(piece, x, y)) continue;
      const occ = pieceAt(x, y);
      if (!occ) {
        moves.push({x, y, capture:false, fromX: piece.x, fromY: piece.y});
      } else {
        if (occ.side === piece.side) continue;
        if (upMode && !revealedIds.has(occ.id)) {
          if (canCapture(piece, occ, piece.x, piece.y, x, y))
            moves.push({x, y, capture:true, hidden:true, fromX: piece.x, fromY: piece.y});
        } else {
          if (canCapture(piece, occ, piece.x, piece.y, x, y))
            moves.push({x, y, capture:true, hidden:false, fromX: piece.x, fromY: piece.y});
        }
      }
    }
    return moves;
  }

  // Rắn: đi thẳng 1 ô như bình thường, không tự bơi được; khi gặp thú khác (đồng minh hay
  // đối phương) ở ô kế bên thì hoán đổi vị trí thay vì ăn quân.
  function snakeMoves(piece) {
    const moves = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx, dy] of dirs) {
      const x = piece.x + dx;
      const y = piece.y + dy;
      if (!inBounds(x, y) || isOwnDen(piece, x, y)) continue;
      if (isWaterOrTide(x, y)) continue;
      const occ = pieceAt(x, y);
      if (!occ) {
        moves.push({x, y, capture:false, fromX: piece.x, fromY: piece.y});
      } else {
        const hidden = upMode && !revealedIds.has(occ.id);
        moves.push({x, y, capture:false, swap:true, targetId: occ.id, hidden, fromX: piece.x, fromY: piece.y});
      }
    }
    return moves;
  }

  function legalMoves(piece) {
    if (isDisabled(piece)) return [];

    if (piece.type === 'crocodile') return crocodileMoves(piece);
    if (piece.type === 'snake') return snakeMoves(piece);

    const moves = [];
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const range = (piece.type === 'owl') ? 2 : 1;
    for (const [dx, dy] of dirs) {
      for (let step = 1; step <= range; step++) {
        const x = piece.x + dx * step;
        const y = piece.y + dy * step;
        if (!inBounds(x, y) || isOwnDen(piece, x, y)) break;
        const occ = pieceAt(x, y);
        if (!occ) {
          if (piece.type === 'rat' || piece.type === 'owl' || !isWaterOrTide(x, y))
            moves.push({
  x,
  y,
  capture:false,
  fromX: piece.x,
  fromY: piece.y
});
        } else {
          if (occ.side === piece.side) break;
          if (upMode && !revealedIds.has(occ.id)) {
            if (canCapture(piece, occ, piece.x, piece.y, x, y))
              moves.push({
  x,
  y,
  capture:true,
  hidden:true,
  fromX: piece.x,
  fromY: piece.y
});
          } else {
            if (canCapture(piece, occ, piece.x, piece.y, x, y))
              moves.push({
  x,
  y,
  capture:true,
  hidden:false,
  fromX: piece.x,
  fromY: piece.y
});
          }
          break;
        }
        if (piece.type !== 'owl' && isWaterOrTide(x, y)) break;
      }
    }
    if (piece.type === 'tiger' || piece.type === 'lion') {
      for (const [dx, dy] of dirs) {
        let nx = piece.x + dx, ny = piece.y + dy;
        if (!inBounds(nx, ny) || !isWaterOrTide(nx, ny)) continue;
        let blocked = false;
        while (inBounds(nx, ny) && isWaterOrTide(nx, ny)) {
          const occ = pieceAt(nx, ny);
          if (occ && occ.type === 'rat') blocked = true;
          nx += dx; ny += dy;
        }
        if (blocked || !inBounds(nx, ny) || isOwnDen(piece, nx, ny)) continue;
        const occ = pieceAt(nx, ny);
        if (!occ) moves.push({x:nx, y:ny, capture:false, jump:true});
        else if (occ.side !== piece.side && canCapture(piece, occ, piece.x, piece.y, nx, ny))
          moves.push({x:nx, y:ny, capture:true, jump:true});
      }
    }
    return moves;
  }


  function otherSide(side) { return side === HUMAN_SIDE ? AI_SIDE : HUMAN_SIDE; }

  function withTempState(st, fn) {
    const prev = state; state = st;
    try { return fn(); } finally { state = prev; }
  }

  function cloneStateForAI(st) {
    return {
      pieces: st.pieces.map(p => ({ ...p })),
      turn: st.turn,
      selectedId: null,
      legal: [],
      winner: st.winner,
      tideActive: st.tideActive,
      tideAnimating: false,
      tideCountdown: st.tideCountdown
    };
  }

  function pieceAtIn(st, x, y) { return st.pieces.find(p => p.x === x && p.y === y) || null; }
  function isTrapForIn(piece, x, y) {
    const t = terrain(x, y);
    return (piece.side === 'blue' && t === 'trapRed') || (piece.side === 'red' && t === 'trapBlue');
  }
  function isEnemyDenIn(piece, x, y) {
    const t = terrain(x, y);
    return (piece.side === 'blue' && t === 'denRed') || (piece.side === 'red' && t === 'denBlue');
  }
  function legalMovesIn(st, piece) {
    if (!piece) return [];
    if (upMode && !revealedIds.has(piece.id)) return [];
    return withTempState(st, () => legalMoves(piece));
  }
  function allMovesIn(st, side) {
    const moves = [];
    for (const p of st.pieces) {
      if (p.side !== side) continue;
      for (const mv of legalMovesIn(st, p)) {
        moves.push({...mv, pieceId: p.id, fromX: p.x, fromY: p.y, side: p.side, type: p.type});
      }
    }
    return moves;
  }

  function applySimMove(st, move) {
    // Mô phỏng đúng vòng đời trạng thái choáng/ngủ: mỗi lượt đi (kể cả lượt do AI tưởng tượng
    // trước trong quá trình tìm kiếm) đều phải làm giảm bộ đếm choáng/ngủ của MỌI quân đi 1,
    // giống hệt decreaseStatuses() ở ván thật. Trước đây bước này bị bỏ sót trong cây tìm kiếm,
    // khiến hiệu ứng choáng của Cú (vốn chỉ kéo dài 3 lượt) bị AI xem như VĨNH VIỄN trong suốt
    // nhánh tìm kiếm, dẫn tới AI đánh giá quá cao các đòn chọc choáng thay vì phòng thủ hang.
    for (const p of st.pieces) {
      if (p.stunned > 0) p.stunned--;
      if (p.asleep > 0) p.asleep--;
    }
    const piece = st.pieces.find(p => p.id === move.pieceId);
    if (!piece) return;
    const target = pieceAtIn(st, move.x, move.y);

    // Rắn: hoán đổi vị trí thay vì ăn quân
    if (move.swap && target) {
      const oldX = piece.x, oldY = piece.y;
      target.x = oldX; target.y = oldY;
      piece.x = move.x; piece.y = move.y;
      if (isEnemyDenIn(piece, piece.x, piece.y)) { st.winner = piece.side; return; }
      if (!st.pieces.some(p => p.side !== piece.side)) { st.winner = piece.side; return; }
      st.turn = otherSide(piece.side);
      return;
    }

    // Mô phỏng đúng luật của Cú: chặn/choáng thay vì luôn ăn, và tự ngủ sau khi hành động
    if (piece.type === 'owl' && move.capture && target) {
      // Cú đánh cú: cả hai cùng biến mất
      if (target.type === 'owl') {
        st.pieces = st.pieces.filter(p => p.id !== target.id && p.id !== piece.id);
        st.turn = otherSide(piece.side);
        return;
      }
      const aRank = withTempState(st, () => effectiveRank(piece, piece.x, piece.y));
      const dRank = withTempState(st, () => effectiveRank(target, move.x, move.y));
      if (dRank > aRank) {
        // Cú không thắng nổi: quân địch bị choáng, cú ngủ, cú KHÔNG di chuyển vào ô đó
        target.stunned = 3;
        piece.asleep = 3;
        st.turn = otherSide(piece.side);
        return;
      }
      // Cú thắng: ăn bình thường nhưng vẫn ngủ sau đó
      st.pieces = st.pieces.filter(p => p.id !== target.id);
      piece.x = move.x; piece.y = move.y;
      piece.asleep = 3;
      if (isEnemyDenIn(piece, move.x, move.y)) { st.winner = piece.side; return; }
      if (!st.pieces.some(p => p.side !== piece.side)) { st.winner = piece.side; return; }
      st.turn = otherSide(piece.side);
      return;
    }

    if (target && target.side !== piece.side) {
      // Mutual-kill trong chế độ Tử chiến khi hai quân cùng cấp
      if (deathMatchMode) {
        const aRank = withTempState(st, () => effectiveRank(piece, piece.x, piece.y));
        const dRank = withTempState(st, () => effectiveRank(target, move.x, move.y));
        if (aRank === dRank) {
          st.pieces = st.pieces.filter(p => p.id !== target.id && p.id !== piece.id);
          st.turn = otherSide(piece.side);
          return;
        }
      }
      st.pieces = st.pieces.filter(p => p.id !== target.id);
    }
    piece.x = move.x; piece.y = move.y;
    // Cú bay 2 ô (không ăn) cũng ngủ sau đó
    if (piece.type === 'owl' && (Math.abs(move.x - move.fromX) + Math.abs(move.y - move.fromY) === 2)) {
      piece.asleep = 3;
    }
    if (isEnemyDenIn(piece, move.x, move.y)) { st.winner = piece.side; return; }
    if (!st.pieces.some(p => p.side !== piece.side)) { st.winner = piece.side; return; }
    st.turn = otherSide(piece.side);

    // Mô phỏng Thủy triều: nếu lượt vừa xong khiến thủy triều tới hạn dâng, xử lý luôn cho AI tính toán
    if (tideMode) {
      if (st.tideActive) {
        // Sau lượt của bên đang có triều dâng thì triều rút (đơn giản hoá theo đúng vòng đời trong game thật:
        // triều rút sau khi AI đi xong 1 lượt trong khi triều đang dâng)
        if (piece.side === AI_SIDE) {
          st.tideActive = false;
          st.tideCountdown = 3;
        }
      } else {
        if (piece.side === AI_SIDE) {
          st.tideCountdown = (st.tideCountdown ?? 3) - 1;
          if (st.tideCountdown <= 0) {
            st.tideActive = true;
            const victims = st.pieces.filter(p => p.y === 4 && p.type !== 'rat');
            if (victims.length) st.pieces = st.pieces.filter(p => !(p.y === 4 && p.type !== 'rat'));
            if (!st.pieces.some(p => p.side === HUMAN_SIDE)) st.winner = AI_SIDE;
            else if (!st.pieces.some(p => p.side === AI_SIDE)) st.winner = HUMAN_SIDE;
          }
        }
      }
    }
  }

  function escapePressureScore(st, piece) {
    const moves = legalMovesIn(st, piece);
    const n = moves.length;
    if (n === 0) return 5000;
    if (n === 1) return 1800;
    if (n === 2) return 700;
    if (n === 3) return 250;
    return 0;
  }

  function evaluateBoard(st) {
    function edgeTrapScore(piece) {
      let score = 0;
      if (piece.x === 0 || piece.x === 6) score += 120;
      if (piece.y === 0 || piece.y === 8) score += 120;
      if ((piece.x === 0 || piece.x === 6) && (piece.y === 0 || piece.y === 8)) score += 220;
      return score;
    }
    if (st.winner === AI_SIDE) return 1000000;
    if (st.winner === HUMAN_SIDE) return -1000000;
    let score = 0;
    const aiMoves = allMovesIn(st, AI_SIDE);
    const humanMoves = allMovesIn(st, HUMAN_SIDE);
    // Chỉ tính điểm thưởng "sắp thắng" cho bên THỰC SỰ đang được đi lượt này.
    // Trước đây bonus này được cộng bất kể đến lượt ai, khiến AI đánh giá quá cao một quân
    // đang áp sát hang địch dù đối thủ mới là người đi tiếp theo và có thể ăn mất quân đó
    // trước (đặc biệt ở Rừng sâu, nơi cả 3 ô liền kề miệng hang đều là bẫy nên quân áp sát
    // luôn ở thế bị bất kỳ quân nào của đối phương ăn tự do).
    if (st.turn === HUMAN_SIDE) {
      for (const m of humanMoves) {
        const piece = st.pieces.find(p => p.id === m.pieceId);
        if (piece && isEnemyDenIn(piece, m.x, m.y)) score -= 100000;
      }
    }
    if (st.turn === AI_SIDE) {
      for (const m of aiMoves) {
        const piece = st.pieces.find(p => p.id === m.pieceId);
        if (piece && isEnemyDenIn(piece, m.x, m.y)) score += 90000;
      }
    }
    for (const p of st.pieces) {
      const val = PIECE_SCORE[p.type] || 0;
      const sign = p.side === AI_SIDE ? 1 : -1;
      score += sign * val;
      if (isTrapForIn(p, p.x, p.y)) score += sign * -140;
      const target = p.side === AI_SIDE ? { x:3, y:0 } : { x:3, y:8 };
      const dist = Math.abs(p.x - target.x) + Math.abs(p.y - target.y);
      score += sign * (18 - dist) * 3;
      if (p.side === HUMAN_SIDE) {
        if (dist <= 1) score -= 2500;
        else if (dist === 2) score -= 1200;
        else if (dist === 3) score -= 500;
      } else {
        if (dist <= 1) score += 1800;
        else if (dist === 2) score += 900;
      }
      const enemyMoves = p.side === AI_SIDE ? humanMoves : aiMoves;
      if (enemyMoves.some(m => m.capture && m.x === p.x && m.y === p.y)) {
        score += p.side === AI_SIDE ? -val * 0.55 : val * 0.35;
      }
      // Áp lực bị dồn ép (ít đường thoát) - quan trọng với quân giá trị cao
      if (val >= 300) {
        const pressure = escapePressureScore(st, p);
        score += sign * -pressure * 0.12;
      }
      score += sign * edgeTrapScore(p) * 0.15;
    }
    score += aiMoves.length * 4;
    score -= humanMoves.length * 4;
    return score;
  }

  // Sắp xếp nước đi: ưu tiên xét ăn quân giá trị cao trước để alpha-beta cắt tỉa hiệu quả hơn
  function orderMoves(st, moves) {
    return moves.slice().sort((a, b) => {
      const av = a.capture ? (PIECE_SCORE[(pieceAtIn(st, a.x, a.y) || {}).type] || 0) : -1;
      const bv = b.capture ? (PIECE_SCORE[(pieceAtIn(st, b.x, b.y) || {}).type] || 0) : -1;
      return bv - av;
    });
  }

  // Một nước đi được coi là "bắt buộc phải xét thêm" trong quiescence search nếu nó ăn quân
  // HOẶC đi thẳng vào hang đối phương để thắng ngay. Trước đây quiescence chỉ mở rộng thêm
  // các nước ăn quân, nên nếu nước thắng nằm ngay sau đường chân trời tìm kiếm chính, AI sẽ
  // dùng điểm heuristic gần đúng (dễ sai) thay vì phát hiện chính xác cơ hội thắng đó.
  function isForcingMove(st, m) {
    if (m.capture) return true;
    const piece = st.pieces.find(p => p.id === m.pieceId);
    if (!piece) return false;
    return isEnemyDenIn(piece, m.x, m.y);
  }

  // Quiescence search: sau khi hết độ sâu, nếu còn nước ăn quân "nóng" thì tính thêm để tránh horizon effect
  function quiescence(st, maximizing, alpha, beta, qDepth) {
    const standPat = evaluateBoard(st);
    if (qDepth <= 0 || st.winner) return standPat;
    if (maximizing) {
      if (standPat >= beta) return standPat;
      alpha = Math.max(alpha, standPat);
      const side = AI_SIDE;
      const captures = orderMoves(st, allMovesIn(st, side).filter(m => isForcingMove(st, m)));
      let best = standPat;
      for (const move of captures) {
        const next = cloneStateForAI(st);
        applySimMove(next, move);
        const value = quiescence(next, false, alpha, beta, qDepth - 1);
        best = Math.max(best, value);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      if (standPat <= alpha) return standPat;
      beta = Math.min(beta, standPat);
      const side = HUMAN_SIDE;
      const captures = orderMoves(st, allMovesIn(st, side).filter(m => isForcingMove(st, m)));
      let best = standPat;
      for (const move of captures) {
        const next = cloneStateForAI(st);
        applySimMove(next, move);
        const value = quiescence(next, true, alpha, beta, qDepth - 1);
        best = Math.min(best, value);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  function minimax(st, depth, maximizing, alpha, beta) {
    if (st.winner) return evaluateBoard(st);
    if (depth === 0) return quiescence(st, maximizing, alpha, beta, 3);
    const side = maximizing ? AI_SIDE : HUMAN_SIDE;
    const moves = orderMoves(st, allMovesIn(st, side));
    if (!moves.length) return maximizing ? -900000 : 900000;
    if (maximizing) {
      let best = -Infinity;
      for (const move of moves) {
        const next = cloneStateForAI(st);
        applySimMove(next, move);
        const value = minimax(next, depth - 1, false, alpha, beta);
        best = Math.max(best, value);
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const move of moves) {
        const next = cloneStateForAI(st);
        applySimMove(next, move);
        const value = minimax(next, depth - 1, true, alpha, beta);
        best = Math.min(best, value);
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }

  // Độ sâu tìm kiếm động: cuối ván (ít quân) tính sâu hơn vì không gian nước đi nhỏ lại
  function computeSearchDepth(st) {
    const totalPieces = st.pieces.length;
    if (totalPieces <= 4) return AI_DEPTH + 4;
    if (totalPieces <= 6) return AI_DEPTH + 3;
    if (totalPieces <= 9) return AI_DEPTH + 2;
    if (totalPieces <= 12) return AI_DEPTH + 1;
    return AI_DEPTH;
  }

  function chooseAIMove(st, depthOverride) {
    if (upMode) {
      const aiDen = { x: 3, y: 8 };
      const humanPieces = st.pieces.filter(p => p.side === HUMAN_SIDE && revealedIds.has(p.id));
      let immediateThreat = false;
      for (let p of humanPieces) {
        const dist = Math.abs(p.x - aiDen.x) + Math.abs(p.y - aiDen.y);
        if (dist <= 2) { immediateThreat = true; break; }
      }
      if (!immediateThreat) {
        const hiddenAI = st.pieces.filter(p => p.side === AI_SIDE && !revealedIds.has(p.id));
        if (hiddenAI.length) {
          const randomIndex = Math.floor(Math.random() * hiddenAI.length);
          return { kind: 'reveal', pieceId: hiddenAI[randomIndex].id };
        }
      }
    }
    const depth = depthOverride || computeSearchDepth(st);
    const moves = orderMoves(st, allMovesIn(st, AI_SIDE));
    if (!moves.length) return null;
    for (const move of moves) {
      const next = cloneStateForAI(st);
      applySimMove(next, move);
      if (next.winner === AI_SIDE) return move;
    }
    let bestMove = moves[0];
    let bestScore = -Infinity;
    for (const move of moves) {
      const next = cloneStateForAI(st);
      applySimMove(next, move);
      const score = next.winner ? evaluateBoard(next) : minimax(next, depth - 1, false, -Infinity, Infinity);
      if (score > bestScore) { bestScore = score; bestMove = move; }
    }
    return bestMove;
  }

  function finishAITurn(piece) {
    if (state.winner) { aiThinking = false; render(); return; }
    if (isEnemyDen(piece, piece.x, piece.y)) {
      state.winner = AI_SIDE;
      winnerEl.textContent = 'AI chiến thắng bằng cách vào hang đối thủ!';
      winnerPanel.classList.add('show'); winnerEl.classList.add('show');
      setStatus('Trận đấu kết thúc.');
      aiThinking = false; render(); return;
    }
    if (!state.pieces.some(p => p.side === HUMAN_SIDE)) {
      state.winner = AI_SIDE;
      winnerEl.textContent = 'AI chiến thắng vì bạn không còn quân.';
      winnerPanel.classList.add('show'); winnerEl.classList.add('show');
      setStatus('Trận đấu kết thúc.');
      aiThinking = false; render(); return;
    }
    decreaseStatuses(state.pieces);
    if (tideMode && state.tideActive) {
      state.tideActive = false;
      state.tideAnimating = true;
      state.tideCountdown = 3;
      render();
      requestAnimationFrame(() => {
        createTideOverlays('receding');
        setTimeout(() => {
          state.tideAnimating = false;
          render();
          state.turn = HUMAN_SIDE;
          aiThinking = false;
          startHumanTurn();
        }, 1500);
      });
      return;
    } else if (tideMode && !state.tideActive) {
      state.tideCountdown--;
    }
    state.turn = HUMAN_SIDE;
    aiThinking = false;
    startHumanTurn();
  }

  function executeAIMove(move) {
    if (move.kind === 'reveal') {
      const piece = state.pieces.find(p => p.id === move.pieceId);
      if (piece) revealGrass(piece);
      aiThinking = false;
      state.turn = HUMAN_SIDE;
      clearSelection('AI đã vạch cỏ.', false);
      syncTurnUI();
      return;
    }
    const piece = state.pieces.find(p => p.id === move.pieceId);
    if (!piece || state.winner) { aiThinking = false; return; }
    // Kiểm tra nếu quân bị disabled (phòng trường hợp AI vô tình chọn)
    if (isDisabled(piece)) { aiThinking = false; return; }
    processMove(piece, move);
    render();
    setTimeout(() => {
      captureFx = null;
      finishAITurn(piece);
    }, 420);
  }

  function scheduleAIMove() {
    if (state.winner || state.turn !== AI_SIDE || aiThinking) return;
    clearTimeout(aiTimer);
    aiThinking = true;
    setStatus('AI đang suy nghĩ...');
    aiTimer = setTimeout(() => {
      const move = chooseAIMove(state);
      if (!move) {
        aiThinking = false;
        state.winner = HUMAN_SIDE;
        winnerEl.textContent = 'Bạn thắng vì AI không còn nước đi!';
        winnerPanel.classList.add('show'); winnerEl.classList.add('show');
        setStatus('Trận đấu kết thúc.');
        render(); return;
      }
      executeAIMove(move);
    }, 260);
  }

  function setStatus(text) { statusEl.textContent = text; }
  function sideName(side) { return side === 'blue' ? 'Xanh' : 'Đỏ'; }

  function render() {
    cellMap.clear();
    grassMap.clear();
    turnValue.textContent = state.turn === 'blue' ? 'XANH' : 'ĐỎ';
    turnValue.className = 'turnValue ' + state.turn;
    boardEl.innerHTML = '';
    const selected = state.pieces.find(p => p.id === state.selectedId) || null;
    const moves = state.legal;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const cell = document.createElement('div');
        const key = `${x},${y}`;
        cell.dataset.key = key;
        cellMap.set(key, cell);
        let logicalTerrain = terrain(x, y);
        if (logicalTerrain === 'tide' && state.tideAnimating) {
          logicalTerrain = baseTerrain(x, y);
        }
        cell.className = 'cell ' + visualTerrainClass(logicalTerrain);
        if (selected && selected.x === x && selected.y === y) cell.classList.add('selected');
        const hint = moves.find(m => m.x === x && m.y === y);
        if (hint) {
          if (hint.swap) cell.classList.add('swapHint');
          else cell.classList.add(hint.capture ? 'captureHint' : 'moveHint');
        }
        const piece = pieceAt(x, y);
        if (
    !piece &&
    (
      (lastBlueMove && lastBlueMove.x === x && lastBlueMove.y === y) ||
      (lastRedMove && lastRedMove.x === x && lastRedMove.y === y)
    )
) {
    cell.innerHTML =
  '<div class="lastMoveMark"><i class="fa-solid fa-paw fa-fade" style="color:rgb(144,86,5);"></i></div>';
}
        if (captureFx && captureFx.x === x && captureFx.y === y) {
          const icon = captureFx.icon || '<i class="fa-solid fa-skull"></i>';
          cell.innerHTML = `<div class="captureFx">${icon}</div>`;
          boardEl.appendChild(cell);
          continue;
        }
        if (piece) {
          const def = pieceDefs[piece.type];
          const node = document.createElement('div');
          node.className = 'piece ' + piece.side;
          if (piece.stunned > 0) node.classList.add('stunned');
          if (piece.asleep > 0) node.classList.add('asleep');
          const hidden = isHiddenPiece(piece);
          if (hidden) {
            const grass = document.createElement("span");
            grass.className = "grass";
            grassMap.set(`${x},${y}`, grass);
            node.appendChild(grass);
          } else {
            node.innerHTML = `<div class="emoji">${def.emoji}</div>${isTrapFor(piece, x, y) ? '<div class="trapArrow">➟</div>' : ''}`;
          }
          cell.appendChild(node);
        } else {
          const t = terrain(x, y);
          if (t === 'denBlue' || t === 'denRed') cell.textContent = 'HANG';
          else if (t === 'trapBlue' || t === 'trapRed') cell.textContent = 'BẪY';
          else if (t === 'water') cell.textContent = '';
        }
        if (terrain(x, y) === 'tide' && !state.tideAnimating) {
          cell.classList.add('tide');
        }
        if (tideMode && !state.tideActive && state.tideCountdown === 1 && y === 4 && terrain(x, y) !== 'water') {
          const warn = document.createElement('div');
          warn.className = 'tideWarning';
          warn.textContent = '⚠️';
          cell.appendChild(warn);
        }
        cell.addEventListener('click', () => onCellClick(x, y));
        boardEl.appendChild(cell);
      }
    }
  }

  function clearSelection(msg, doRender = true) {
    state.selectedId = null;
    state.legal = [];
    if (msg) setStatus(msg);
    if (doRender) render(); else syncTurnUI();
  }

 function onCellClick(x, y) {
    if (state.tideAnimating || state.winner || state.turn === AI_SIDE || aiThinking) return;

    const selected = state.pieces.find(p => p.id === state.selectedId) || null;
    const clickedPiece = pieceAt(x, y);

    // Mở cỏ
    if (upMode && clickedPiece && !revealedIds.has(clickedPiece.id)) {
        revealGrass(clickedPiece);
        state.selectedId = null;
        state.legal = [];
        state.turn = otherSide(state.turn);
        setStatus('Đã vạch cỏ, mất lượt.');
        syncTurnUI();
        if (state.turn === AI_SIDE) scheduleAIMove();
        return;
    }

    // Chưa chọn quân
    if (!selected) {
        if (clickedPiece && clickedPiece.side === state.turn) {
            if (isDisabled(clickedPiece)) {
                setStatus(`${pieceDefs[clickedPiece.type].name} đang bị choáng hoặc ngủ.`);
                return;
            }
            state.selectedId = clickedPiece.id;
            state.legal = legalMoves(clickedPiece);
            setStatus(`Đã chọn ${pieceDefs[clickedPiece.type].name}. Chạm ô sáng để đi.`);
            render();
        } else {
            setStatus(`Đến lượt ${sideName(state.turn)}. Hãy chọn quân của mình.`);
        }
        return;
    }

    // Nếu quân đang chọn bị disabled
    if (isDisabled(selected)) {
        clearSelection('Quân này đang bị choáng hoặc ngủ, không thể di chuyển.');
        return;
    }

    // Chạm vào chính quân đã chọn => bỏ chọn
    if (clickedPiece && clickedPiece.id === selected.id) {
        clearSelection('Đã bỏ chọn.');
        return;
    }

    // Nếu quân đang chọn là Rắn và chạm vào quân mình khác => cho phép chọn hoán đổi
    // (nước đi swap đã có sẵn trong state.legal), nên chỉ chuyển sang chọn lại quân khác
    // khi ô đó KHÔNG nằm trong danh sách nước đi hợp lệ của Rắn.
    const swapMoveToClicked = selected.type === 'snake'
      ? state.legal.find(m => m.x === x && m.y === y && m.swap)
      : null;

    // Chạm vào quân mình khác => chọn lại (trừ khi đó là một nước hoán đổi hợp lệ của Rắn)
    if (clickedPiece && clickedPiece.side === state.turn && !swapMoveToClicked) {
        if (isDisabled(clickedPiece)) {
            setStatus(`${pieceDefs[clickedPiece.type].name} đang bị choáng hoặc ngủ.`);
            return;
        }
        state.selectedId = clickedPiece.id;
        state.legal = legalMoves(clickedPiece);
        setStatus(`Đã chọn ${pieceDefs[clickedPiece.type].name}.`);
        render();
        return;
    }

    // Tìm nước đi hợp lệ
    const move = state.legal.find(m => m.x === x && m.y === y);
    if (!move) {
        setStatus('Nước đi không hợp lệ.');
        return;
    }

    // Thực hiện nước đi (có xử lý mutual kill, Cú, hoán đổi của Rắn...)
    state.selectedId = null;
    state.legal = [];
    processMove(selected, move);
    render();

    setTimeout(() => {
        captureFx = null;
        // Kiểm tra thắng
      if (
    state.pieces.find(p => p.id === selected.id) &&
    isEnemyDen(selected, selected.x, selected.y)
) {
    state.winner = HUMAN_SIDE;
    winnerEl.textContent = 'Bạn chiến thắng bằng cách vào hang đối thủ!';
    winnerPanel.classList.add('show');
    winnerEl.classList.add('show');
    setStatus('Trận đấu kết thúc.');
    render();
    return;
}
        const humanPiecesLeft = state.pieces.some(p => p.side === HUMAN_SIDE);
        if (!humanPiecesLeft) {
            state.winner = AI_SIDE;
            winnerEl.textContent = 'AI chiến thắng!';
            winnerPanel.classList.add('show');
            winnerEl.classList.add('show');
            setStatus('Trận đấu kết thúc.');
            render();
            return;
        }
        state.turn = AI_SIDE;
        clearSelection('Đến lượt AI.');
        scheduleAIMove();
    }, 300);
}

  function openRules() { rulesModal.classList.add('show'); }
  function closeRules() { rulesModal.classList.remove('show'); }

  restartBtn.addEventListener('click', reset);
  modeBtn.addEventListener('click', () => {
    if (deathMatchMode) return;
    upMode = !upMode;
    reset();
  });
  tideBtn.addEventListener('click', () => {
  if (deathMatchMode) return;
  // Xoay vòng: tắt -> thủy triều -> rừng sâu -> tắt
  if (!tideMode && !forestMode) {
    // Bật thủy triều
    tideMode = true;
    forestMode = false;
  } else if (tideMode && !forestMode) {
    // Chuyển sang rừng sâu
    tideMode = false;
    forestMode = true;
  } else if (!tideMode && forestMode) {
    // Tắt hết
    tideMode = false;
    forestMode = false;
  }
  // Cập nhật giao diện nút
  if (tideMode) {
    tideBtn.textContent = 'Thủy triều';
    tideBtn.classList.add('tideOn');
  } else if (forestMode) {
    tideBtn.textContent = 'Rừng sâu';
    tideBtn.classList.add('modeOn');
    tideBtn.classList.remove('tideOn');
  } else {
    tideBtn.textContent = 'Thủy triều';
    tideBtn.classList.remove('tideOn', 'modeOn');
  }
  reset();
});
  deathBtn.addEventListener('click', () => {
    deathMatchMode = !deathMatchMode;
    if (deathMatchMode) {
      upMode = false;
      tideMode = false;
      modeBtn.classList.add('disabled-btn');
      tideBtn.classList.add('disabled-btn');
    } else {
      modeBtn.classList.remove('disabled-btn');
      tideBtn.classList.remove('disabled-btn');
    }
    reset();
  });
  updateModeBtn();
  infoBtn.addEventListener('click', openRules);
  closeRulesBtn.addEventListener('click', closeRules);
  rulesModal.addEventListener('click', (e) => { if (e.target === rulesModal) closeRules(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeRules(); });

  reset();
})();
