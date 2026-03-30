// ====== DOM ======
const twoplayer = document.getElementById("twoplayer");
const namePopup = document.getElementById("namePopup");
const closeName = document.getElementById("closeName");
const start2P = document.getElementById("start2P");

const boardEl = document.getElementById("board");
const statusTop = document.getElementById("statusTop");

// ====== GAME STATE ======
const BOARD_SIZE = 15;
let board = [];
let currentPlayer = "X";
let playerX = "Người chơi 1";
let playerO = "Người chơi 2";
let gameActive = false;

// ====== MỞ POPUP ======
twoplayer.onclick = () => {
  namePopup.style.display = "flex";
};

// ====== ĐÓNG POPUP ======
closeName.onclick = () => {
  namePopup.style.display = "none";
};

// ====== BẮT ĐẦU GAME ======
start2P.onclick = () => {
  const p1 = document.getElementById("player1").value.trim();
  const p2 = document.getElementById("player2").value.trim();

  let player1 = p1 || "Người chơi 1";
  let player2 = p2 || "Người chơi 2";

  namePopup.style.display = "none";

  startGame(player1, player2);
};

// ====== START GAME ======
function startGame(p1, p2){
  gameActive = true;

  // Random X/O
  if(Math.random() < 0.5){
    playerX = p1;
    playerO = p2;
  } else {
    playerX = p2;
    playerO = p1;
  }

  currentPlayer = "X";

  initBoard();
  drawBoard();

  updateStatus(`${playerX} (X) đi trước`);
}

// ====== TẠO BOARD ======
function initBoard(){
  board = [];
  for(let i = 0; i < BOARD_SIZE; i++){
    board[i] = [];
    for(let j = 0; j < BOARD_SIZE; j++){
      board[i][j] = "";
    }
  }
}

// ====== VẼ BOARD ======
function drawBoard(){
  boardEl.innerHTML = "";

  for(let i = 0; i < BOARD_SIZE; i++){
    for(let j = 0; j < BOARD_SIZE; j++){
      const cell = document.createElement("div");
      cell.classList.add("cell");

      cell.dataset.row = i;
      cell.dataset.col = j;

      cell.onclick = handleClick;

      boardEl.appendChild(cell);
    }
  }
}

// ====== CLICK ======
function handleClick(e){
  if(!gameActive) return;

  const row = e.target.dataset.row;
  const col = e.target.dataset.col;

  if(board[row][col] !== "") return;

  board[row][col] = currentPlayer;
  e.target.textContent = currentPlayer;

  if(checkWin(row, col)){
    gameActive = false;

    const winner = currentPlayer === "X" ? playerX : playerO;
    updateStatus(`🎉 ${winner} thắng!`);
    return;
  }

  switchPlayer();
}

// ====== ĐỔI LƯỢT ======
function switchPlayer(){
  currentPlayer = currentPlayer === "X" ? "O" : "X";

  if(currentPlayer === "X"){
    updateStatus(`Lượt của ${playerX} (X)`);
  } else {
    updateStatus(`Lượt của ${playerO} (O)`);
  }
}

// ====== CHECK WIN ======
function checkWin(row, col){
  row = parseInt(row);
  col = parseInt(col);

  return (
    count(row, col, 1, 0) + count(row, col, -1, 0) >= 4 ||
    count(row, col, 0, 1) + count(row, col, 0, -1) >= 4 ||
    count(row, col, 1, 1) + count(row, col, -1, -1) >= 4 ||
    count(row, col, 1, -1) + count(row, col, -1, 1) >= 4
  );
}

// ====== ĐẾM ======
function count(row, col, dx, dy){
  let c = 0;
  let i = parseInt(row) + dx;
  let j = parseInt(col) + dy;

  while(
    i >= 0 && i < BOARD_SIZE &&
    j >= 0 && j < BOARD_SIZE &&
    board[i][j] === currentPlayer
  ){
    c++;
    i += dx;
    j += dy;
  }

  return c;
}

// ====== STATUS ======
function updateStatus(msg){
  if(statusTop){
    statusTop.textContent = msg;
  }
}