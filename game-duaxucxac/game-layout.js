/* =====================================================
   GAME LAYOUT - RESIZE / BOARD / TOKEN POSITION
===================================================== */

function resize(){
  DPR=Math.max(1,Math.min(2,window.devicePixelRatio||1));

  W=window.innerWidth;
  H=window.innerHeight;

  canvas.width=Math.floor(W*DPR);
  canvas.height=Math.floor(H*DPR);

  canvas.style.width=W+"px";
  canvas.style.height=H+"px";

  ctx.setTransform(DPR,0,0,DPR,0,0);

  computeBoard();
  syncTokensToBoard();
}

function computeBoard(){
  const topSafe=Math.max(98,Math.min(132,H*.18));
  const bottomSafe=Math.max(130,Math.min(170,H*.23));

  let available=H-topSafe-bottomSafe;
  let size=Math.min(W*.92,available,640);

  if(size<280){
    size=Math.min(W*.9,H*.56,360);
  }

  board.size=Math.floor(size);
  board.cell=board.size/10;

  board.x=Math.floor((W-board.size)/2);
  board.y=Math.floor(topSafe+Math.max(0,available-board.size)*.25);
}

function getCellCenter(pos){
  pos=Math.max(1,Math.min(100,pos));

  const n=pos-1;
  const rowFromBottom=Math.floor(n/10);
  const colInRow=n%10;

  const col=rowFromBottom%2===0 ? colInRow : 9-colInRow;
  const row=9-rowFromBottom;

  return {
    x:board.x+col*board.cell+board.cell/2,
    y:board.y+row*board.cell+board.cell/2
  };
}

function getTokenTarget(who,pos){
  if(pos<=0){
    const start=getCellCenter(1);

    return {
      x:start.x,
      y:board.y+board.size+board.cell*.42
    };
  }

  const c=getCellCenter(pos);

  return {
    x:c.x,
    y:c.y
  };
}

function syncTokensToBoard(){
  for(const k of Object.keys(tokens)){
    const t=tokens[k];

    if(!t.animating){
      const p=getTokenTarget(k,t.pos);

      t.x=p.x;
      t.y=p.y;
    }
  }
}

window.addEventListener("resize",resize);

