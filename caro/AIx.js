// ================================
// 🤖 AI ĐÁNH X (FULL ĐỘC LẬP)
// ================================

function getAIMove(board, ai){
  const SIZE = board.length;
  const enemy = ai === "X" ? "O" : "X";

  // 🥇 thắng ngay
  let move = findWin(board, ai);
  if(move) return move;

  // 🥈 tạo double threat
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      if(board[r][c] !== "") continue;

      board[r][c] = ai;

      if(isDoubleThreat(board, r,c, ai)){
        board[r][c] = "";
        return [r,c];
      }

      board[r][c] = "";
    }
  }

  // 🥉 chặn khi cần
  move = findWin(board, enemy);
  if(move) return move;

  // 🧠 heuristic (tấn công mạnh)
  let bestScore = -Infinity;
  let bestMove = null;

  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      if(board[r][c] !== "") continue;

      let attack = evaluate(board, r,c, ai);
      let defend = evaluate(board, r,c, enemy);

      let score = attack * 1.2 + defend * 0.6;

      if(score > bestScore){
        bestScore = score;
        bestMove = [r,c];
      }
    }
  }

  return bestMove;
}

// ================================
// 🏆 TÌM NƯỚC THẮNG
// ================================
function findWin(board, player){
  const SIZE = board.length;

  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      if(board[r][c] !== "") continue;

      board[r][c] = player;

      if(checkWin(board, r,c,player)){
        board[r][c] = "";
        return [r,c];
      }

      board[r][c] = "";
    }
  }

  return null;
}

// ================================
// 💀 DOUBLE THREAT
// ================================
function isDoubleThreat(board, r,c,player){
  const SIZE = board.length;
  let threats = 0;

  const dirs = [[1,0],[0,1],[1,1],[1,-1]];

  for(let [dr,dc] of dirs){
    let count = 1;
    let open = 0;

    let i=r+dr, j=c+dc;
    while(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]===player){
      count++; i+=dr; j+=dc;
    }
    if(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]==="") open++;

    i=r-dr; j=c-dc;
    while(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]===player){
      count++; i-=dr; j-=dc;
    }
    if(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]==="") open++;

    if(count === 3 && open === 2){
      threats++;
    }
  }

  return threats >= 2;
}

// ================================
// 🧠 ĐÁNH GIÁ
// ================================
function evaluate(board, r,c,player){
  return (
    scoreDir(board,r,c,1,0,player)+
    scoreDir(board,r,c,0,1,player)+
    scoreDir(board,r,c,1,1,player)+
    scoreDir(board,r,c,1,-1,player)
  );
}

function scoreDir(board,r,c,dr,dc,player){
  const SIZE = board.length;

  let count = 1;
  let open = 0;

  let i=r+dr, j=c+dc;
  while(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]===player){
    count++; i+=dr; j+=dc;
  }
  if(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]==="") open++;

  i=r-dr; j=c-dc;
  while(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]===player){
    count++; i-=dr; j-=dc;
  }
  if(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]==="") open++;

  return getScore(count, open);
}

function getScore(count, open){
  if(count >= 5) return 100000;

  if(count === 4){
    if(open === 2) return 10000;
    if(open === 1) return 1000;
  }

  if(count === 3){
    if(open === 2) return 500;
    if(open === 1) return 100;
  }

  if(count === 2){
    if(open === 2) return 50;
    if(open === 1) return 10;
  }

  return 1;
}

// ================================
// 🏁 CHECK WIN
// ================================
function checkWin(board, r,c,player){
  return (
    count(board,r,c,1,0,player)+count(board,r,c,-1,0,player)>=4 ||
    count(board,r,c,0,1,player)+count(board,r,c,0,-1,player)>=4 ||
    count(board,r,c,1,1,player)+count(board,r,c,-1,-1,player)>=4 ||
    count(board,r,c,1,-1,player)+count(board,r,c,-1,1,player)>=4
  );
}

function count(board,r,c,dr,dc,player){
  const SIZE = board.length;
  let i=r+dr, j=c+dc, cnt=0;

  while(i>=0 && i<SIZE && j>=0 && j<SIZE && board[i][j]===player){
    cnt++;
    i+=dr;
    j+=dc;
  }

  return cnt;
}