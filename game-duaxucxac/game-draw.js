/* =====================================================
   DRAW ENGINE
===================================================== */

function roundedRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

function drawScene(t){
  drawSky();
  drawSun(t);
  drawClouds(t);
  drawSea(t);
  drawSand(t);
  drawBeachDecor(t);
  drawBoard();
  drawBoardTraps(t);
  drawBoardFlags(t);
  drawTokens(t);
  drawConfetti();
}

function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,H*.55);

  g.addColorStop(0,"#69d7ff");
  g.addColorStop(.55,"#b7f0ff");
  g.addColorStop(1,"#fff1b8");

  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);
}

function drawSun(t){
  const x=W*.82;
  const y=H*.13;
  const r=Math.max(28,Math.min(48,W*.055));

  const glow=ctx.createRadialGradient(x,y,0,x,y,r*3);

  glow.addColorStop(0,"rgba(255,245,140,.8)");
  glow.addColorStop(.45,"rgba(255,200,50,.23)");
  glow.addColorStop(1,"rgba(255,200,50,0)");

  ctx.fillStyle=glow;
  ctx.beginPath();
  ctx.arc(x,y,r*3,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#ffe66d";
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle="rgba(255,255,255,.55)";
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.arc(x,y,r+8+Math.sin(t*.003)*2,0,Math.PI*2);
  ctx.stroke();
}

function drawClouds(t){
  drawCloud(W*.18+Math.sin(t*.00025)*20,H*.12,1.0);
  drawCloud(W*.52+Math.sin(t*.0002+2)*24,H*.09,.75);
  drawCloud(W*.72+Math.sin(t*.00023+1)*18,H*.22,.65);
}

function drawCloud(x,y,s){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(s,s);

  ctx.fillStyle="rgba(255,255,255,.78)";
  ctx.beginPath();
  ctx.arc(-36,6,22,0,Math.PI*2);
  ctx.arc(-12,-8,28,0,Math.PI*2);
  ctx.arc(20,0,24,0,Math.PI*2);
  ctx.arc(44,8,18,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawSea(t){
  const seaTop=H*.28;
  const shore=H*.50;

  const g=ctx.createLinearGradient(0,seaTop,0,shore+40);

  g.addColorStop(0,"#118ce8");
  g.addColorStop(.45,"#13b9df");
  g.addColorStop(1,"#69e4dc");

  ctx.fillStyle=g;
  ctx.fillRect(0,seaTop,W,shore-seaTop+60);

  for(let i=0;i<7;i++){
    const y=seaTop+18+i*26;

    ctx.beginPath();

    for(let x=-40;x<=W+40;x+=16){
      const w=
        Math.sin((x*.024)+t*.002+i)*(5+i*.4)+
        Math.sin((x*.048)+t*.0014)*2;

      if(x===-40){
        ctx.moveTo(x,y+w);
      }else{
        ctx.lineTo(x,y+w);
      }
    }

    ctx.strokeStyle=`rgba(255,255,255,${.18+i*.035})`;
    ctx.lineWidth=2;
    ctx.stroke();
  }

  const foamY=shore+Math.sin(t*.002)*5;

  ctx.fillStyle="rgba(255,255,255,.72)";
  ctx.beginPath();
  ctx.moveTo(0,foamY);

  for(let x=0;x<=W;x+=18){
    ctx.lineTo(x,foamY+Math.sin(x*.035+t*.003)*9);
  }

  ctx.lineTo(W,foamY+30);
  ctx.lineTo(0,foamY+38);
  ctx.closePath();
  ctx.fill();
}

function drawSand(t){
  const sandTop=H*.49;

  const g=ctx.createLinearGradient(0,sandTop,0,H);

  g.addColorStop(0,"#ffe59a");
  g.addColorStop(.5,"#f7ca70");
  g.addColorStop(1,"#e8a94d");

  ctx.fillStyle=g;
  ctx.fillRect(0,sandTop,W,H-sandTop);

  ctx.globalAlpha=.22;

  for(let i=0;i<170;i++){
    const x=(i*97)%W;
    const y=sandTop+((i*53)%Math.max(1,H-sandTop));
    const r=1+((i*11)%22)/20;

    ctx.fillStyle=i%3===0 ? "#c78938" : "#fff0b7";
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }

  ctx.globalAlpha=1;
}

function drawBeachDecor(t){
  drawPalmCanvas(W*.08,H*.86,Math.max(.75,Math.min(1.1,W/900)),false,t);
  drawPalmCanvas(W*.92,H*.84,Math.max(.7,Math.min(1.0,W/1000)),true,t);

  drawUmbrella(W*.16,H*.56,.82,t);
  drawUmbrella(W*.83,H*.58,.72,t+900);

  drawTowel(W*.12,H*.72,.75,"#ff5b8a");
  drawTowel(W*.86,H*.72,.68,"#2ec5ff");

  drawShell(W*.24,H*.84,.8,t);
  drawShell(W*.74,H*.82,.65,t+200);

  drawStarfish(W*.34,H*.90,.72,t);
  drawStarfish(W*.66,H*.91,.58,t);
}

function drawPalmCanvas(x,y,s,flip,t){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(flip ? -s : s,s);

  const sway=Math.sin(t*.0015)*5;

  ctx.strokeStyle="#8a5525";
  ctx.lineWidth=15;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.quadraticCurveTo(12,-70,4+sway,-138);
  ctx.stroke();

  ctx.strokeStyle="rgba(90,42,12,.35)";
  ctx.lineWidth=2;

  for(let i=0;i<7;i++){
    ctx.beginPath();
    ctx.moveTo(-6,-18-i*17);
    ctx.lineTo(8,-25-i*17);
    ctx.stroke();
  }

  ctx.translate(4+sway,-142);

  for(let i=0;i<8;i++){
    drawLeaf(
      -150+i*42+Math.sin(t*.0016+i)*5,
      i%2 ? "#17aa53" : "#0e8b45"
    );
  }

  ctx.fillStyle="#875019";
  ctx.beginPath();
  ctx.arc(-8,8,7,0,Math.PI*2);
  ctx.arc(4,11,7,0,Math.PI*2);
  ctx.arc(0,0,6,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawLeaf(angle,color){
  ctx.save();
  ctx.rotate(angle*Math.PI/180);

  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.quadraticCurveTo(48,-16,92,0);
  ctx.quadraticCurveTo(48,18,0,0);
  ctx.fill();

  ctx.strokeStyle="rgba(255,255,255,.22)";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(4,0);
  ctx.lineTo(80,0);
  ctx.stroke();

  ctx.restore();
}

function drawUmbrella(x,y,s,t){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(s,s);

  ctx.strokeStyle="#7c4d24";
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(0,8);
  ctx.lineTo(0,84);
  ctx.stroke();

  ctx.rotate(Math.sin(t*.0013)*.03);

  ctx.beginPath();
  ctx.moveTo(-58,10);
  ctx.quadraticCurveTo(0,-55,58,10);
  ctx.closePath();
  ctx.fillStyle="#ff4d6d";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-58,10);
  ctx.quadraticCurveTo(-30,-12,0,10);
  ctx.quadraticCurveTo(30,-12,58,10);
  ctx.lineTo(-58,10);
  ctx.fillStyle="rgba(255,255,255,.22)";
  ctx.fill();

  ctx.strokeStyle="rgba(255,255,255,.7)";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(0,-43);
  ctx.lineTo(0,10);
  ctx.moveTo(0,-43);
  ctx.lineTo(-38,10);
  ctx.moveTo(0,-43);
  ctx.lineTo(38,10);
  ctx.stroke();

  ctx.restore();
}

function drawTowel(x,y,s,color){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(-.18);
  ctx.scale(s,s);

  ctx.fillStyle=color;
  roundedRect(-42,-18,84,36,7);
  ctx.fill();

  ctx.fillStyle="rgba(255,255,255,.38)";

  for(let i=-30;i<=30;i+=20){
    ctx.fillRect(i,-18,8,36);
  }

  ctx.restore();
}

function drawShell(x,y,s,t){
  ctx.save();
  ctx.translate(x,y+Math.sin(t*.002)*1.5);
  ctx.scale(s,s);

  ctx.fillStyle="#fff3d8";
  ctx.beginPath();
  ctx.arc(0,0,16,Math.PI,0);
  ctx.lineTo(16,10);
  ctx.quadraticCurveTo(0,22,-16,10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle="rgba(175,105,54,.32)";
  ctx.lineWidth=2;

  for(let i=-2;i<=2;i++){
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(i*7,11);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStarfish(x,y,s,t){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(Math.sin(t*.001)*.08);
  ctx.scale(s,s);

  ctx.fillStyle="#ff8b4a";
  ctx.beginPath();

  for(let i=0;i<10;i++){
    const r=i%2===0 ? 20 : 8;
    const a=-Math.PI/2+i*Math.PI/5;

    if(i===0){
      ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);
    }else{
      ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
    }
  }

  ctx.closePath();
  ctx.fill();

  ctx.fillStyle="rgba(255,255,255,.45)";
  ctx.beginPath();
  ctx.arc(0,0,3,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawBoard(){
  ctx.save();

  ctx.shadowColor="rgba(0,60,90,.25)";
  ctx.shadowBlur=28;
  ctx.shadowOffsetY=12;

  roundedRect(board.x-10,board.y-10,board.size+20,board.size+20,26);

  ctx.fillStyle="rgba(255,255,255,.28)";
  ctx.fill();

  ctx.shadowColor="transparent";
  ctx.shadowBlur=0;
  ctx.shadowOffsetY=0;

  for(let pos=1;pos<=100;pos++){
    const c=getCellCenter(pos);
    const x=c.x-board.cell/2;
    const y=c.y-board.cell/2;
    const row=Math.floor((pos-1)/10);
    const alt=(row+pos)%2===0;

    let fill=alt ? "rgba(255,255,255,.76)" : "rgba(255,246,202,.78)";
    let stroke="rgba(20,90,120,.24)";

    if(pos===1){
      fill="rgba(113,224,130,.88)";
      stroke="rgba(0,120,60,.45)";
    }

    if(pos===100){
      fill="rgba(255,222,67,.92)";
      stroke="rgba(255,120,0,.55)";
    }

    roundedRect(
      x+2,
      y+2,
      board.cell-4,
      board.cell-4,
      Math.max(7,board.cell*.18)
    );

    ctx.fillStyle=fill;
    ctx.fill();

    ctx.strokeStyle=stroke;
    ctx.lineWidth=1.3;
    ctx.stroke();

    ctx.fillStyle=pos===100 ? "#9d3b00" : "#17617c";
    ctx.font=`900 ${Math.max(9,board.cell*.23)}px Arial`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(pos,c.x,c.y-board.cell*.22);

    if(pos===1){
      ctx.font=`900 ${Math.max(7,board.cell*.16)}px Arial`;
      ctx.fillStyle="#08662e";
      ctx.fillText("START",c.x,c.y+board.cell*.18);
    }

    if(pos===100){
      ctx.font=`${Math.max(14,board.cell*.34)}px Arial`;
      ctx.fillText("🏁",c.x,c.y+board.cell*.17);
    }
  }

  ctx.restore();
}

function drawBoardTraps(t){
  if(!boardTraps || boardTraps.length<=0){
    return;
  }

  for(const trap of boardTraps){
    const c=getCellCenter(trap.pos);
    const pulse=1+Math.sin(t*.006+trap.pos)*.055;

    const x=c.x;
    const y=c.y+board.cell*.18;

    ctx.save();
    ctx.translate(x,y);
    ctx.scale(pulse,pulse);

    // Bóng hố bẫy
    ctx.fillStyle="rgba(45,23,10,.34)";
    ctx.beginPath();
    ctx.ellipse(0,0,board.cell*.32,board.cell*.16,0,0,Math.PI*2);
    ctx.fill();

    // Miệng hố
    const pit=ctx.createRadialGradient(0,0,2,0,0,board.cell*.34);
    pit.addColorStop(0,"rgba(42,20,8,.95)");
    pit.addColorStop(.56,"rgba(103,55,22,.82)");
    pit.addColorStop(1,"rgba(255,206,110,.12)");

    ctx.fillStyle=pit;
    ctx.beginPath();
    ctx.ellipse(0,0,board.cell*.28,board.cell*.135,0,0,Math.PI*2);
    ctx.fill();

    // Viền cảnh báo
    ctx.strokeStyle="rgba(255,80,60,.9)";
    ctx.lineWidth=Math.max(2,board.cell*.04);
    ctx.beginPath();
    ctx.ellipse(0,0,board.cell*.34,board.cell*.18,0,0,Math.PI*2);
    ctx.stroke();

    // Răng / gai bẫy
    ctx.fillStyle="rgba(255,245,210,.92)";
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2;
      const px=Math.cos(a)*board.cell*.2;
      const py=Math.sin(a)*board.cell*.09;

      ctx.beginPath();
      ctx.moveTo(px,py);
      ctx.lineTo(px+Math.cos(a)*board.cell*.06,py+Math.sin(a)*board.cell*.035);
      ctx.lineTo(px-Math.sin(a)*board.cell*.035,py+Math.cos(a)*board.cell*.025);
      ctx.closePath();
      ctx.fill();
    }

    // Icon cảnh báo
    ctx.font=`900 ${Math.max(12,board.cell*.28)}px Arial`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.lineWidth=3;
    ctx.strokeStyle="rgba(0,0,0,.36)";
    ctx.strokeText("⚠",0,-board.cell*.23);
    ctx.fillStyle="#ffdd3b";
    ctx.fillText("⚠",0,-board.cell*.23);

    // Nhãn BẪY
    const label="BẪY";
    ctx.font=`900 ${Math.max(7,board.cell*.14)}px Arial`;

    const labelW=Math.max(board.cell*.52,ctx.measureText(label).width+8);
    const labelH=Math.max(13,board.cell*.2);

    ctx.fillStyle="rgba(120,42,18,.82)";
    roundedRect(
      -labelW/2,
      board.cell*.14,
      labelW,
      labelH,
      labelH/2
    );
    ctx.fill();

    ctx.fillStyle="#ffffff";
    ctx.fillText(label,0,board.cell*.14+labelH/2+.5);

    ctx.restore();
  }
}

function drawBoardFlags(t){
  if(!boardFlags || boardFlags.length<=0){
    return;
  }

  for(const flag of boardFlags){
    const c=getCellCenter(flag.pos);

    const ownerToken=tokens[flag.owner];
    const targetToken=tokens[flag.targetOwner];

    const baseColor=ownerToken?.color || "#ff4d4d";
    const darkColor=ownerToken?.dark || "#8b1d1d";

    const pulse=1+Math.sin(t*.006+flag.pos)*0.08;
    const poleH=Math.max(22,board.cell*.58);
    const poleW=Math.max(3,board.cell*.055);

    const x=c.x+board.cell*.22;
    const y=c.y+board.cell*.22;

    ctx.save();

    ctx.translate(x,y);
    ctx.scale(pulse,pulse);

    // Vòng cảnh báo dưới chân cờ
    ctx.fillStyle="rgba(255,70,70,.18)";
    ctx.beginPath();
    ctx.ellipse(0,6,board.cell*.28,board.cell*.12,0,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,.9)";
    ctx.lineWidth=Math.max(1.5,board.cell*.035);
    ctx.beginPath();
    ctx.arc(0,6,board.cell*.24,0,Math.PI*2);
    ctx.stroke();

    // Cột cờ
    ctx.fillStyle="#5b3820";
    roundedRect(
      -poleW/2,
      -poleH+8,
      poleW,
      poleH,
      poleW
    );
    ctx.fill();

    ctx.fillStyle="rgba(255,255,255,.45)";
    roundedRect(
      -poleW/2,
      -poleH+8,
      poleW*.42,
      poleH,
      poleW
    );
    ctx.fill();

    // Lá cờ
    ctx.beginPath();
    ctx.moveTo(0,-poleH+8);
    ctx.lineTo(board.cell*.34,-poleH+board.cell*.13);
    ctx.lineTo(0,-poleH+board.cell*.27);
    ctx.closePath();

    const g=ctx.createLinearGradient(0,-poleH,board.cell*.36,-poleH+board.cell*.28);
    g.addColorStop(0,baseColor);
    g.addColorStop(1,darkColor);

    ctx.fillStyle=g;
    ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,.85)";
    ctx.lineWidth=Math.max(1.2,board.cell*.028);
    ctx.stroke();

    // Icon cờ
    ctx.font=`900 ${Math.max(11,board.cell*.25)}px Arial`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.lineWidth=3;
    ctx.strokeStyle="rgba(0,0,0,.28)";
    ctx.strokeText("!",board.cell*.14,-poleH+board.cell*.16);
    ctx.fillStyle="#ffffff";
    ctx.fillText("!",board.cell*.14,-poleH+board.cell*.16);

    // Nhãn nhỏ: ai bị chặn
    ctx.font=`900 ${Math.max(7,board.cell*.14)}px Arial`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";

    const label=flag.targetOwner==="player" ? "CHẶN BẠN" : "CHẶN AI";

    const labelW=Math.max(board.cell*.72,ctx.measureText(label).width+10);
    const labelH=Math.max(14,board.cell*.22);

    ctx.fillStyle="rgba(0,42,64,.72)";
    roundedRect(
      -labelW/2,
      board.cell*.28,
      labelW,
      labelH,
      labelH/2
    );
    ctx.fill();

    ctx.fillStyle="#ffffff";
    ctx.fillText(label,0,board.cell*.28+labelH/2+0.5);

    ctx.restore();
  }
}

function drawTokens(t){
  drawCharacter(tokens.ai,t,"ai");
  drawCharacter(tokens.player,t,"player");
}

function drawCharacter(t,time,who){
  const bob=Math.sin(time*.004+t.phase)*2;
  const r=Math.max(12,board.cell*.25);
  const isInvisible=who && itemRuntime[who] && itemRuntime[who].invisibleTurns>0;

  ctx.save();

  ctx.globalAlpha=isInvisible ? 0.5 : 1;
  ctx.translate(t.x,t.y+bob);

  ctx.fillStyle="rgba(0,0,0,.20)";
  ctx.beginPath();
  ctx.ellipse(0,r*.95,r*1.05,r*.34,0,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle=t.color;
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();

  ctx.lineWidth=Math.max(2,r*.16);
  ctx.strokeStyle="rgba(255,255,255,.85)";
  ctx.stroke();

  ctx.fillStyle="rgba(255,255,255,.25)";
  ctx.beginPath();
  ctx.arc(-r*.32,-r*.35,r*.28,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#fff9df";
  ctx.beginPath();
  ctx.arc(-r*.27,-r*.08,r*.13,0,Math.PI*2);
  ctx.arc(r*.27,-r*.08,r*.13,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#123";
  ctx.beginPath();
  ctx.arc(-r*.27,-r*.08,r*.055,0,Math.PI*2);
  ctx.arc(r*.27,-r*.08,r*.055,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle="#fff9df";
  ctx.lineWidth=Math.max(2,r*.11);
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.arc(0,r*.18,r*.32,.15,Math.PI-.15);
  ctx.stroke();

  if(t.label==="AI"){
    ctx.strokeStyle="rgba(20,20,20,.78)";
    ctx.lineWidth=Math.max(3,r*.16);
    ctx.beginPath();
    ctx.moveTo(-r*.48,-r*.12);
    ctx.lineTo(r*.48,-r*.12);
    ctx.stroke();

    ctx.fillStyle="rgba(10,10,10,.85)";
    ctx.beginPath();
    ctx.ellipse(-r*.27,-r*.12,r*.22,r*.13,0,0,Math.PI*2);
    ctx.ellipse(r*.27,-r*.12,r*.22,r*.13,0,0,Math.PI*2);
    ctx.fill();
  }else{
    ctx.fillStyle="#ffe66d";
    ctx.beginPath();
    ctx.moveTo(-r*.75,-r*.58);
    ctx.quadraticCurveTo(0,-r*1.18,r*.75,-r*.58);
    ctx.quadraticCurveTo(0,-r*.35,-r*.75,-r*.58);
    ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,.65)";
    ctx.lineWidth=1.5;
    ctx.stroke();
  }

  ctx.font=`900 ${Math.max(9,r*.5)}px Arial`;
  ctx.textAlign="center";
  ctx.textBaseline="middle";

  ctx.lineWidth=4;
  ctx.strokeStyle="rgba(0,0,0,.32)";
  ctx.strokeText(t.label,0,r*1.85);

  ctx.fillStyle="#ffffff";
  ctx.fillText(t.label,0,r*1.85);

  ctx.restore();
}

function spawnConfetti(){
  state.confetti.length=0;

  for(let i=0;i<120;i++){
    state.confetti.push({
      x:Math.random()*W,
      y:-20-Math.random()*H*.4,
      vx:-1.5+Math.random()*3,
      vy:2+Math.random()*4,
      r:4+Math.random()*6,
      rot:Math.random()*Math.PI,
      vr:-.12+Math.random()*.24,
      color:["#ff4d6d","#ffe66d","#00d5ff","#37e66c","#ffffff"][Math.floor(Math.random()*5)]
    });
  }
}

function drawConfetti(){
  if(!state.confetti.length) return;

  for(const p of state.confetti){
    p.x+=p.vx;
    p.y+=p.vy;
    p.rot+=p.vr;

    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle=p.color;
    ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*.65);
    ctx.restore();
  }

  state.confetti=state.confetti.filter(p=>p.y<H+40);
}

function loop(t){
  ctx.clearRect(0,0,W,H);
  drawScene(t);
  requestAnimationFrame(loop);
}

