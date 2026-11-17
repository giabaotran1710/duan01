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
  drawHorizon(t);
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

/* đảo xa, thuyền buồm, hải âu: giữ cho mặt biển có chiều sâu */
function drawHorizon(t){
  const seaTop=H*.28;

  // đảo xa
  ctx.save();
  ctx.translate(W*.2,seaTop+16);
  ctx.fillStyle="#2b9a8f";
  ctx.beginPath();
  ctx.moveTo(-60,10);
  ctx.quadraticCurveTo(-30,-26,0,-8);
  ctx.quadraticCurveTo(24,-30,58,10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle="#6e4a24";
  ctx.lineWidth=3;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-6,-6);
  ctx.quadraticCurveTo(-4,-20,-9,-30);
  ctx.stroke();
  ctx.fillStyle="#1f7d4a";
  for(let i=0;i<5;i++){
    ctx.save();
    ctx.translate(-9,-30);
    ctx.rotate((-70+i*35)*Math.PI/180);
    ctx.beginPath();
    ctx.ellipse(10,0,11,3,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // thuyền buồm trôi ngang
  const span=W+140;
  const bx=((t*.012)%span)-70;
  const by=seaTop+34+Math.sin(t*.002)*2;

  ctx.save();
  ctx.translate(bx,by);
  ctx.rotate(Math.sin(t*.0017)*.04);
  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.moveTo(0,-34);
  ctx.lineTo(0,-4);
  ctx.lineTo(-20,-4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle="#ff6b4a";
  ctx.beginPath();
  ctx.moveTo(3,-28);
  ctx.lineTo(3,-4);
  ctx.lineTo(18,-4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle="#6e4220";
  ctx.beginPath();
  ctx.moveTo(-22,-2);
  ctx.lineTo(22,-2);
  ctx.lineTo(15,8);
  ctx.lineTo(-15,8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // hải âu
  ctx.strokeStyle="rgba(255,255,255,.95)";
  ctx.lineWidth=2.4;
  ctx.lineCap="round";
  for(let i=0;i<3;i++){
    const gx=W*(.38+i*.13)+Math.sin(t*.0006+i)*14;
    const gy=H*(.15+i*.035)+Math.sin(t*.0009+i*2)*5;
    const flap=Math.sin(t*.008+i*1.7)*5;
    ctx.beginPath();
    ctx.moveTo(gx-9,gy+flap*.2);
    ctx.quadraticCurveTo(gx-4,gy-flap,gx,gy);
    ctx.quadraticCurveTo(gx+4,gy-flap,gx+9,gy+flap*.2);
    ctx.stroke();
  }
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
  const c0=board.cell;

  ctx.save();

  // khung gỗ + bóng
  ctx.shadowColor="rgba(0,50,80,.35)";
  ctx.shadowBlur=26;
  ctx.shadowOffsetY=12;
  roundedRect(board.x-12,board.y-12,board.size+24,board.size+24,24);
  const fg=ctx.createLinearGradient(0,board.y-12,0,board.y+board.size+12);
  fg.addColorStop(0,"#c58a46");
  fg.addColorStop(1,"#8a5624");
  ctx.fillStyle=fg;
  ctx.fill();
  ctx.shadowColor="transparent";
  ctx.shadowBlur=0;
  ctx.shadowOffsetY=0;

  ctx.lineWidth=3;
  ctx.strokeStyle="#5a3a1e";
  ctx.stroke();

  // mặt trong: cát ướt
  roundedRect(board.x-5,board.y-5,board.size+10,board.size+10,18);
  ctx.fillStyle="#e8c27c";
  ctx.fill();

  for(let pos=1;pos<=100;pos++){
    const c=getCellCenter(pos);
    const x=c.x-c0/2+2;
    const y=c.y-c0/2+2;
    const w=c0-4;
    const r=Math.max(6,c0*.16);
    const lift=Math.max(2,c0*.07);

    const nn=pos-1;
    const rr=Math.floor(nn/10);
    const cc=rr%2===0 ? nn%10 : 9-(nn%10);
    let top="#fff1cf";
    let side="#d6a35a";

    if((rr+cc)%2===1){
      top="#f2c27a";
      side="#bd8640";
    }

    if(pos%10===0 && pos<100){
      top="#bfeaf2";
      side="#6fb4c4";
    }

    if(pos===1){
      top="#8ee6a0";
      side="#3f9a57";
    }

    if(pos===100){
      top="#ffe066";
      side="#d9a21a";
    }

    // cạnh dưới tạo độ dày
    roundedRect(x,y+lift,w,w,r);
    ctx.fillStyle=side;
    ctx.fill();

    roundedRect(x,y,w,w,r);
    ctx.fillStyle=top;
    ctx.fill();

    // vân gỗ
    ctx.save();
    roundedRect(x,y,w,w,r);
    ctx.clip();
    ctx.strokeStyle="rgba(120,70,20,.13)";
    ctx.lineWidth=1;
    for(let k=1;k<=2;k++){
      ctx.beginPath();
      ctx.moveTo(x,y+w*k/3);
      ctx.lineTo(x+w,y+w*k/3+((pos+k)%3-1)*1.5);
      ctx.stroke();
    }
    ctx.fillStyle="rgba(255,255,255,.35)";
    ctx.fillRect(x,y,w,Math.max(2,w*.07));
    ctx.restore();

    // số ô: góc trên trái, có viền trắng cho dễ đọc
    const fs=Math.max(9,c0*.27);
    ctx.font=`800 ${fs}px "Baloo 2","Arial Black",Arial`;
    ctx.textAlign="left";
    ctx.textBaseline="top";
    ctx.lineJoin="round";
    ctx.lineWidth=3;
    ctx.strokeStyle="rgba(255,255,255,.9)";
    ctx.strokeText(pos,x+c0*.1,y+c0*.04);
    ctx.fillStyle=pos===100 ? "#9d3b00" : (pos===1 ? "#0a5a2b" : "#6e4220");
    ctx.fillText(pos,x+c0*.1,y+c0*.04);

    // ô cuối hàng: mũi tên chỉ hướng rẽ
    if(pos%10===0 && pos<100){
      const rowFromBottom=Math.floor((pos-1)/10);
      const toRight=rowFromBottom%2===1;
      ctx.fillStyle="rgba(14,127,166,.75)";
      ctx.beginPath();
      const ax=c.x+(toRight?-1:1)*c0*.0;
      const ay=c.y+c0*.3;
      ctx.moveTo(ax-c0*.12,ay+c0*.08);
      ctx.lineTo(ax+c0*.12,ay+c0*.08);
      ctx.lineTo(ax,ay-c0*.1);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ô xuất phát: cờ xanh
  {
    const c=getCellCenter(1);
    ctx.fillStyle="#0a5a2b";
    ctx.font=`800 ${Math.max(7,c0*.17)}px "Baloo 2",Arial`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("Xuất phát",c.x,c.y+c0*.3);
  }

  // ô đích: cờ ca-rô
  {
    const c=getCellCenter(100);
    const px=c.x+c0*.02;
    const py=c.y+c0*.08;
    const q=Math.max(4,c0*.1);
    ctx.strokeStyle="#5a3a1e";
    ctx.lineWidth=Math.max(2,c0*.04);
    ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(px-c0*.18,py+c0*.22);
    ctx.lineTo(px-c0*.18,py-c0*.12);
    ctx.stroke();
    for(let i=0;i<4;i++){
      for(let j=0;j<3;j++){
        ctx.fillStyle=(i+j)%2===0 ? "#1b1b1b" : "#fff";
        ctx.fillRect(px-c0*.18+i*q,py-c0*.12+j*q,q,q);
      }
    }
    ctx.strokeStyle="rgba(0,0,0,.4)";
    ctx.lineWidth=1;
    ctx.strokeRect(px-c0*.18,py-c0*.12,q*4,q*3);
  }

  ctx.restore();
}

function drawBoardTraps(t){
  if(!boardTraps || boardTraps.length<=0){
    return;
  }

  const c0=board.cell;

  for(const trap of boardTraps){
    const c=getCellCenter(trap.pos);
    const pulse=1+Math.sin(t*.006+trap.pos)*.06;

    ctx.save();
    ctx.translate(c.x,c.y+c0*.14);

    // hố đất
    ctx.fillStyle="rgba(58,30,12,.95)";
    ctx.beginPath();
    ctx.ellipse(0,0,c0*.3,c0*.16,0,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="#ff5a3c";
    ctx.lineWidth=Math.max(2,c0*.05);
    ctx.beginPath();
    ctx.ellipse(0,0,c0*.34*pulse,c0*.19*pulse,0,0,Math.PI*2);
    ctx.stroke();

    // gai nhím biển
    ctx.strokeStyle="#2b1650";
    ctx.lineWidth=Math.max(1.5,c0*.04);
    ctx.lineCap="round";
    for(let i=0;i<9;i++){
      const a=-Math.PI+i*Math.PI/8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a)*c0*.08,-c0*.04+Math.sin(a)*c0*.08);
      ctx.lineTo(Math.cos(a)*c0*.22,-c0*.04+Math.sin(a)*c0*.22);
      ctx.stroke();
    }
    ctx.fillStyle="#5b2fa0";
    ctx.beginPath();
    ctx.arc(0,-c0*.04,c0*.1,0,Math.PI*2);
    ctx.fill();

    // biển cảnh báo tam giác ở góc phải
    const sx=c0*.27;
    const sy=-c0*.3;
    const sr=c0*.15;
    ctx.fillStyle="#ffd23f";
    ctx.strokeStyle="#7a2a12";
    ctx.lineWidth=Math.max(1.5,c0*.035);
    ctx.lineJoin="round";
    ctx.beginPath();
    ctx.moveTo(sx,sy-sr);
    ctx.lineTo(sx+sr*1.1,sy+sr*.8);
    ctx.lineTo(sx-sr*1.1,sy+sr*.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle="#7a2a12";
    ctx.font=`800 ${Math.max(8,c0*.2)}px "Baloo 2",Arial`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("!",sx,sy+sr*.25);

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
    ctx.font=`800 ${Math.max(8,board.cell*.17)}px "Baloo 2",Arial`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";

    const label=flag.targetOwner==="player" ? "Chặn bạn" : "Chặn AI";

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
  // hai quân cùng ô thì tách sang hai bên để không che nhau
  const same=tokens.player.pos===tokens.ai.pos && !tokens.player.animating && !tokens.ai.animating;
  const off=same ? board.cell*.3 : 0;

  drawCharacter(tokens.ai,t,"ai",off);
  drawCharacter(tokens.player,t,"player",-off);
}

function drawCharacter(t,time,who,dx){
  const bob=Math.sin(time*.004+t.phase)*2;
  const r=Math.max(12,board.cell*.28);
  const isInvisible=who && itemRuntime[who] && itemRuntime[who].invisibleTurns>0;

  ctx.save();

  ctx.globalAlpha=isInvisible ? 0.5 : 1;
  ctx.translate(t.x+(dx||0),t.y+bob);

  // bóng
  ctx.fillStyle="rgba(0,0,0,.22)";
  ctx.beginPath();
  ctx.ellipse(0,r*.95,r*1.05,r*.32,0,0,Math.PI*2);
  ctx.fill();

  // thân tròn có đổ sáng
  const g=ctx.createRadialGradient(-r*.3,-r*.4,r*.1,0,0,r*1.1);
  g.addColorStop(0,t.color);
  g.addColorStop(1,t.dark);
  ctx.fillStyle=g;
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();

  ctx.lineWidth=Math.max(2.5,r*.18);
  ctx.strokeStyle="#fff";
  ctx.stroke();

  // mắt
  if(t.label!=="AI"){
    ctx.fillStyle="#fff9df";
    ctx.beginPath();
    ctx.arc(-r*.3,-r*.02,r*.16,0,Math.PI*2);
    ctx.arc(r*.3,-r*.02,r*.16,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle="#123";
    ctx.beginPath();
    ctx.arc(-r*.28,-r*.0,r*.07,0,Math.PI*2);
    ctx.arc(r*.32,-r*.0,r*.07,0,Math.PI*2);
    ctx.fill();
  }

  // miệng cười
  ctx.strokeStyle="#fff9df";
  ctx.lineWidth=Math.max(2,r*.12);
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.arc(0,r*.22,r*.3,.2,Math.PI-.2);
  ctx.stroke();

  if(t.label==="AI"){
    // kính râm
    ctx.fillStyle="#141414";
    ctx.beginPath();
    ctx.ellipse(-r*.32,-r*.05,r*.26,r*.17,0,0,Math.PI*2);
    ctx.ellipse(r*.32,-r*.05,r*.26,r*.17,0,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle="#141414";
    ctx.lineWidth=Math.max(2,r*.12);
    ctx.beginPath();
    ctx.moveTo(-r*.1,-r*.07);
    ctx.lineTo(r*.1,-r*.07);
    ctx.stroke();
    ctx.fillStyle="rgba(255,255,255,.4)";
    ctx.beginPath();
    ctx.ellipse(-r*.4,-r*.1,r*.08,r*.04,-.4,0,Math.PI*2);
    ctx.fill();
  }else{
    // nón lá rơm có dải đỏ
    ctx.fillStyle="#ffe66d";
    ctx.beginPath();
    ctx.ellipse(0,-r*.72,r*1.02,r*.3,0,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle="#fff2a8";
    ctx.beginPath();
    ctx.ellipse(0,-r*.85,r*.52,r*.34,0,Math.PI,0);
    ctx.fill();
    ctx.fillStyle="#ff6b4a";
    ctx.fillRect(-r*.52,-r*.88,r*1.04,r*.14);
  }

  ctx.restore();

  // thẻ tên bên dưới
  ctx.save();
  ctx.globalAlpha=isInvisible ? 0.5 : 1;
  const name=t.label==="AI" ? "AI" : "Bạn";
  ctx.font=`800 ${Math.max(9,r*.62)}px "Baloo 2",Arial`;
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  const tw=ctx.measureText(name).width+10;
  const th=Math.max(12,r*.82);
  const nx=t.x+(dx||0);
  const ny=t.y+bob+r*1.75;
  roundedRect(nx-tw/2,ny-th/2,tw,th,th/2);
  ctx.fillStyle=t.dark;
  ctx.fill();
  ctx.lineWidth=1.5;
  ctx.strokeStyle="#fff";
  ctx.stroke();
  ctx.fillStyle="#fff";
  ctx.fillText(name,nx,ny+.5);
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

