(() => {
  'use strict';
  const canvas = document.getElementById('game');
  // Swapped temporarily (see withCtx) so the fish renderer can also paint the title-screen art.
  let ctx = canvas.getContext('2d', { alpha:false });
  const mmCanvas = document.getElementById('minimap');
  const mmCtx = mmCanvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = {
    loading:$('loading'), menu:$('menu'), card:$('card'), eyebrow:$('eyebrow'),
    titleScreen:$('titleScreen'), playBtn:$('playBtn'), bestChip:$('bestChip'), bestChipVal:$('bestChipVal'), titleHint:$('titleHint'), titleFsRow:$('titleFsRow'),
    heroCanvas:$('heroCanvas'), icoEat:$('icoEat'), icoDanger:$('icoDanger'),
    title:$('menuTitle'), text:$('menuText'), record:$('recordBadge'), bestLine:$('bestLine'), stats:$('stats'),
    primary:$('primaryBtn'), secondary:$('secondaryBtn'), fsRow:$('fsRow'), hint:$('hint'),
    score:$('score'), best:$('best'), level:$('level'), levelBar:$('levelBar'), combo:$('combo'), comboText:$('comboText'), comboBar:$('comboBar'),
    banner:$('banner'), bannerSmall:$('bannerSmall'), bannerBig:$('bannerBig'), tip:$('tip'),
    mute:$('muteBtn'), fs:$('fsBtn'), pause:$('pauseBtn'), dash:$('dashBtn'),
    stScore:$('stScore'), stEaten:$('stEaten'), stTime:$('stTime'), stLevel:$('stLevel')
  };
  const store = {
    get(k,d){ try{ const v=localStorage.getItem(k); return v===null?d:v; }catch(_){ return d; } },
    set(k,v){ try{ localStorage.setItem(k,String(v)); }catch(_){ /* storage is optional */ } }
  };
  const IS_TOUCH = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints>0 && !matchMedia('(pointer: fine)').matches);
  const IS_IOS = /iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  document.body.classList.toggle('touch', IS_TOUCH);

  const CONFIG = Object.freeze({
    startSize:52, maxEntities:60, attractEntities:34,
    worldWidth:9000, worldHeight:5200, skyMargin:150, cameraSmooth:6.5, despawnRadius:2600,
    // Camera: càng lớn càng kéo xa, nhưng cá của người chơi vẫn chiếm tỉ lệ vừa phải trên màn hình.
    cameraZoom:1.45, cameraZoomPow:.55, cameraZoomMin:.13,
    eatRatio:1.1, dangerRatio:1.15, npcEatRatio:1.3,
    growK:.12, levelStep:1.2, initialInvuln:2200, safeSeconds:18,
    comboWindow:2600, comboMax:5,
    dashDuration:340, dashCooldown:2400, dashBoost:2.0,
    dangerArrowRange:1400, dangerArrowNear:800, stickRadius:62
  });
  const FA = window.FishArt;
  const SP = FA.S;
  // Các loài xuất hiện trong biển (không gồm cá của người chơi và biến thể cá nóc phồng).
  const SPECIES = Object.values(SP).filter(s=>s.role!=='hero' && s.role!=='hidden');
  const ZONES = [
    {max:.22, name:'Vùng nước nông'}, {max:.45, name:'Rạn san hô'}, {max:.68, name:'Vùng biển khơi'},
    {max:.86, name:'Vùng chạng vạng'}, {max:9, name:'Đáy đại dương'}
  ];
  // Màu nước theo độ sâu thế giới (0 = mặt nước, 1 = đáy).
  const WATER_STOPS = [[0,[44,168,196]],[.14,[22,122,160]],[.36,[10,78,114]],[.6,[6,46,78]],[.82,[3,26,49]],[1,[2,14,29]]];


  const rand = (min,max) => min + Math.random() * (max-min);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const lerp = (a,b,t) => a + (b-a)*t;
  const mod = (a,b) => ((a%b)+b)%b;
  const choose = arr => arr[(Math.random()*arr.length)|0];
  const lerpAngle = (a,b,t) => a + (mod(b-a+Math.PI,Math.PI*2)-Math.PI)*t;

  const state = {
    mode:'loading', raf:0, lastTs:0, width:0, height:0, dpr:1, baseZoom:1, time:0, clock:0,
    score:0, best:Number(store.get('fish-best',0))||0, elapsed:0, worldSeed:Math.random()*1000,
    nextId:1, entities:[], particles:[], bubbles:[], texts:[],
    keys:new Set(), input:{mouse:false, mx:0, my:0, stick:null},
    player:null, camera:{x:CONFIG.worldWidth*.5, y:CONFIG.worldHeight*.4, zoom:1},
    invulnUntil:0, combo:{n:0, until:0}, stats:{eaten:0, maxLevel:1}, level:1, zone:-1, zoneAt:0,
    dash:{until:0, readyAt:0}, shake:0, flash:0, danger:0, dying:0,
    muted:store.get('fish-muted','0')==='1', autoFs:store.get('fish-autofs', IS_TOUCH?'1':'0')==='1',
    hud:{}, snowFar:[], snowNear:[], mm:null, vignette:null, vignetteRed:null
  };

  // ---------- deterministic world noise (decor & seabed) ----------
  function hash1(n){ const s=Math.sin(n*127.1+state.worldSeed*311.7)*43758.5453; return s-Math.floor(s); }
  function noise1(x){ const i=Math.floor(x), f=x-i, u=f*f*(3-2*f); return lerp(hash1(i),hash1(i+1),u); }
  function groundY(x){ return CONFIG.worldHeight-62-noise1(x*.0035)*34-noise1(x*.011+40)*12; }
  function waterRGB(d){
    d=clamp(d,0,1);
    for(let i=1;i<WATER_STOPS.length;i++){
      const b=WATER_STOPS[i];
      if(d<=b[0]){ const a=WATER_STOPS[i-1], t=(d-a[0])/(b[0]-a[0]); return [lerp(a[1][0],b[1][0],t),lerp(a[1][1],b[1][1],t),lerp(a[1][2],b[1][2],t)]; }
    }
    return WATER_STOPS[WATER_STOPS.length-1][1];
  }
  const rgba = (c,a=1) => `rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
  const shadeCache = new Map();
  function shade(hex,delta){
    const key=hex+'|'+delta; let v=shadeCache.get(key); if(v)return v;
    const n=parseInt(hex.replace('#',''),16);
    const r=clamp((n>>16)+delta,0,255), g=clamp(((n>>8)&255)+delta,0,255), b=clamp((n&255)+delta,0,255);
    v='#'+[r,g,b].map(c=>Math.round(c).toString(16).padStart(2,'0')).join('');
    shadeCache.set(key,v); return v;
  }

  // ---------- pre-rendered sprites ----------
  function makeCanvas(w,h){ const c=document.createElement('canvas'); c.width=Math.max(1,w|0); c.height=Math.max(1,h|0); return c; }
  function makeGlow(r,g,b){
    const c=makeCanvas(64,64), x=c.getContext('2d'), gr=x.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,`rgba(${r},${g},${b},1)`); gr.addColorStop(.42,`rgba(${r},${g},${b},.38)`); gr.addColorStop(1,`rgba(${r},${g},${b},0)`);
    x.fillStyle=gr; x.fillRect(0,0,64,64); return c;
  }
  function makeBeam(){
    const c=makeCanvas(64,512), x=c.getContext('2d');
    const hg=x.createLinearGradient(0,0,64,0);
    hg.addColorStop(0,'rgba(190,245,255,0)'); hg.addColorStop(.5,'rgba(190,245,255,1)'); hg.addColorStop(1,'rgba(190,245,255,0)');
    x.fillStyle=hg; x.fillRect(0,0,64,512);
    x.globalCompositeOperation='destination-in';
    const vg=x.createLinearGradient(0,0,0,512);
    vg.addColorStop(0,'rgba(0,0,0,1)'); vg.addColorStop(.55,'rgba(0,0,0,.35)'); vg.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=vg; x.fillRect(0,0,64,512); return c;
  }
  // Tileable caustic net: bright contour lines of a smooth periodic field.
  function makeCausticTile(N=192){
    const c=makeCanvas(N,N), x=c.getContext('2d'), img=x.createImageData(N,N), d=img.data, TAU=Math.PI*2;
    for(let py=0;py<N;py++)for(let px=0;px<N;px++){
      const u=px/N*TAU, v=py/N*TAU;
      const p=1.2*Math.sin(2*u+1.1*Math.sin(3*v))+1.2*Math.sin(3*v+1.1*Math.sin(2*u+1.3))+.8*Math.sin(u+2*v+.9*Math.sin(3*u-v));
      const k=Math.pow(1-Math.abs(Math.sin(p*1.8)),11);
      const i=(py*N+px)*4; d[i]=215; d[i+1]=250; d[i+2]=255; d[i+3]=Math.round(k*255);
    }
    x.putImageData(img,0,0); return c;
  }
  const SPR = { glowCyan:makeGlow(110,235,255), glowRed:makeGlow(255,55,75), glowGold:makeGlow(255,226,150), dot:makeGlow(225,248,255), beam:makeBeam() };
  const caustic = { buf:makeCanvas(2,2), bctx:null, pattern:null };
  caustic.bctx = caustic.buf.getContext('2d');

  function buildVignette(color){
    const W=Math.ceil(state.width/2), H=Math.ceil(state.height/2), c=makeCanvas(W,H), x=c.getContext('2d'), r=Math.hypot(W,H)/2;
    const g=x.createRadialGradient(W/2,H/2,r*.42,W/2,H/2,r);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,color);
    x.fillStyle=g; x.fillRect(0,0,W,H); return c;
  }
  function buildSnow(){
    const area=state.width*state.height;
    state.snowFar=Array.from({length:Math.round(clamp(area/13000,40,150))},()=>({x:Math.random(),y:Math.random(),r:rand(.6,1.7),vx:rand(-5,5),vy:rand(3,10),a:rand(.25,.8),tw:rand(0,6.3)}));
    state.snowNear=Array.from({length:Math.round(clamp(area/65000,8,32))},()=>({x:Math.random(),y:Math.random(),r:rand(2.2,4.8),vx:rand(-9,9),vy:rand(5,15),a:rand(.18,.42),tw:rand(0,6.3)}));
  }
  function buildMinimap(){
    const small=state.width<600||state.height<500;
    const W=small?104:148, H=Math.round(W*CONFIG.worldHeight/CONFIG.worldWidth), dpr=state.dpr;
    mmCanvas.width=Math.round(W*dpr); mmCanvas.height=Math.round(H*dpr); mmCanvas.style.width=W+'px'; mmCanvas.style.height=H+'px';
    const bg=makeCanvas(W*dpr,H*dpr), x=bg.getContext('2d'); x.scale(dpr,dpr);
    const g=x.createLinearGradient(0,0,0,H);
    for(const [t] of WATER_STOPS)g.addColorStop(t,rgba(waterRGB(t)));
    x.fillStyle=g; x.fillRect(0,0,W,H);
    x.strokeStyle='rgba(255,255,255,.10)'; x.setLineDash([2,3]); x.lineWidth=1;
    for(const z of ZONES.slice(0,-1)){ const y=Math.round(z.max*H)+.5; x.beginPath(); x.moveTo(0,y); x.lineTo(W,y); x.stroke(); }
    x.setLineDash([]); x.fillStyle='#2c4a48'; x.fillRect(0,H-2,W,2);
    state.mm={w:W,h:H,dpr,bg};
  }

  function resize(){
    state.dpr=Math.min(2,devicePixelRatio||1); state.width=innerWidth; state.height=innerHeight;
    canvas.width=Math.round(state.width*state.dpr); canvas.height=Math.round(state.height*state.dpr);
    // Small screens see a little more of the ocean so threats are spotted in time.
    state.baseZoom=clamp(Math.sqrt(state.width*state.height)/900,.8,1);
    caustic.buf.width=Math.ceil(state.width/2); caustic.buf.height=Math.ceil(state.height/2);
    state.vignette=buildVignette('rgba(0,5,12,1)'); state.vignetteRed=buildVignette('rgba(210,20,45,1)');
    buildSnow(); buildMinimap();
    if(state.mode==='menu')sizeHero();
    if(state.mode==='paused'){ render(); drawMinimap(); }
  }
  addEventListener('resize',resize,{passive:true});

  // ---------- camera ----------
  function livePlayer(){ const p=state.player; return p && !p.dead ? p : null; }
  function targetZoom(){
    const size=state.player?.size||CONFIG.startSize;
    return state.baseZoom*Math.max(CONFIG.cameraZoomMin, CONFIG.cameraZoom*Math.pow(CONFIG.startSize/Math.max(size,CONFIG.startSize*.5),CONFIG.cameraZoomPow));
  }
  function clampCamera(x,y,z){
    const halfW=state.width*.5/z, halfH=state.height*.5/z, W=CONFIG.worldWidth, H=CONFIG.worldHeight;
    const minY=halfH-CONFIG.skyMargin, maxY=H-halfH;
    return {
      x: halfW*2>=W ? W/2 : clamp(x,halfW,W-halfW),
      y: maxY<=minY ? (minY+maxY)/2 : clamp(y,minY,maxY)
    };
  }
  function easeCamera(dt,tx,ty,tz,smooth){
    const cam=state.camera;
    cam.zoom += (tz-cam.zoom)*(1-Math.exp(-4*dt));
    const t=clampCamera(tx,ty,cam.zoom), k=1-Math.exp(-smooth*dt);
    cam.x += (t.x-cam.x)*k; cam.y += (t.y-cam.y)*k;
  }
  function viewRect(){
    const c=state.camera, z=c.zoom, hw=state.width*.5/z, hh=state.height*.5/z;
    return {z, left:c.x-hw, right:c.x+hw, top:c.y-hh, bottom:c.y+hh};
  }
  function worldToScreen(x,y){
    const c=state.camera, z=c.zoom;
    return {x:(x-c.x)*z+state.width*.5, y:(y-c.y)*z+state.height*.5};
  }

  // ---------- tốc độ & cơ thể ----------
  // Tốc độ tuyệt đối tăng chậm theo kích cỡ (cá lớn nhanh hơn nhưng không vượt trội quá mức).
  const speedBase = size => 235 + 95*Math.log2(Math.max(1,size/CONFIG.startSize));
  const turnRate  = size => clamp(5.2 - Math.log2(Math.max(1,size/CONFIG.startSize))*.5, 1.5, 5.2);
  const wrapA = a => Math.atan2(Math.sin(a),Math.cos(a));
  const levelOf = size => 1+Math.floor(Math.log(Math.max(1,size/CONFIG.startSize))/Math.log(CONFIG.levelStep)+1e-9);
  const depthFactor = y => clamp(y/CONFIG.worldHeight,0,1);
  const isHunter = f => f.role==='hunter';

  // Thân cá xấp xỉ một viên nang từ gốc đuôi đến mõm.
  function capsule(f,shrink=1){
    const h=SP[f.sp==='puffer'&&f.puff>0?'puffer_inf':f.sp].hit, c=Math.cos(f.angle), s=Math.sin(f.angle), L=f.size;
    return {ax:f.x-c*h.back*L, ay:f.y-s*h.back*L, bx:f.x+c*h.front*L, by:f.y+s*h.front*L, r:Math.max(2,h.r*L*shrink),
            mx:f.x+c*(h.front+.04)*L, my:f.y+s*(h.front+.04)*L};
  }
  function distToSeg(px,py,b){
    const dx=b.bx-b.ax, dy=b.by-b.ay, L2=dx*dx+dy*dy;
    const t=L2?clamp(((px-b.ax)*dx+(py-b.ay)*dy)/L2,0,1):0;
    return Math.hypot(px-(b.ax+dx*t),py-(b.ay+dy*t));
  }
  // Kẻ ăn nuốt được con mồi khi mõm chạm thân hoặc thân đè lên nhau.
  function canSwallow(E,eb,P,pb){
    return distToSeg(eb.mx,eb.my,pb) < pb.r+eb.r*.35 || distToSeg(P.x,P.y,eb) < eb.r*.8;
  }

  // ---------- sinh cá ----------
  function randomPointOutsideView(sp){
    const v=viewRect(), halfW=(v.right-v.left)/2, halfH=(v.bottom-v.top)/2;
    const margin=Math.max(160,Math.min(520,Math.max(halfW,halfH)*.2));
    const d0=sp.depth[0]*CONFIG.worldHeight, d1=sp.depth[1]*CONFIG.worldHeight;
    const horiz=[];
    if(v.left-margin>70)horiz.push('l');
    if(v.right+margin<CONFIG.worldWidth-70)horiz.push('r');
    if(horiz.length){
      const side=choose(horiz);
      // Giữ đúng tầng nước của loài, ưu tiên khoảng đang nhìn thấy để người chơi gặp được.
      let lo=Math.max(d0,v.top-halfH*.3), hi=Math.min(d1,v.bottom+halfH*.3);
      if(hi<=lo){ lo=d0; hi=d1; }
      return {x:side==='l'?v.left-margin:v.right+margin, y:rand(lo,hi)};
    }
    const a=Math.random()*Math.PI*2, r=Math.max(halfW,halfH)+margin;
    return {x:clamp(state.camera.x+Math.cos(a)*r,70,CONFIG.worldWidth-70), y:clamp(rand(d0,d1),70,CONFIG.worldHeight-120)};
  }

  function playerSize(){ return state.player?.size||CONFIG.startSize; }

  // Chọn loài: nhiều con mồi vừa miệng, ít kẻ săn lớn hơn, kẻ săn tăng dần theo cấp.
  function chooseSpecies(opts={}){
    const ps=playerSize(), lvl=levelOf(ps), list=[];
    let threats=0, edible=0, total=0;
    for(const f of state.entities){
      total++;
      if(f.role==='jelly'||f.role==='giant')continue;
      if(isHunter(f) && f.size>=ps*CONFIG.dangerRatio && Math.hypot(f.x-state.camera.x,f.y-state.camera.y)<3200)threats++;
      if(f.size*CONFIG.eatRatio<=ps)edible++;
    }
    const maxThreat=Math.min(5,1+Math.floor(lvl/4));
    const needFood=total>8 && edible/total<.5;
    const noThreat=!!state.player && state.clock-state.playStart<CONFIG.safeSeconds*1000;
    for(const sp of SPECIES){
      const mid=(sp.size[0]+sp.size[1])/2;
      let r=mid/ps, w;
      if(sp.role==='jelly'){ w=.3; }
      else if(sp.role==='giant'){ w=(r>=.45&&r<=9)?.3:0; }
      else{
        if(r<.18)w=.03; else if(r<.35)w=.6; else if(r<.9)w=1.7; else if(r<1.12)w=.5;
        else if(r<1.8)w=.9; else if(r<3.2)w=.5; else if(r<5)w=.1; else w=0;
        if(isHunter({role:sp.role}) && r>=1.12){
          w*=clamp(.3+lvl*.09,.3,1.2);
          if(noThreat||threats>=maxThreat)w=0;
        }
        if(sp.role==='school')w*=.45;
        if(needFood && r<1.0)w*=2.2;
      }
      if(opts.food && !(mid*CONFIG.eatRatio<=ps*.95 && sp.role!=='jelly' && sp.role!=='giant'))w=0;
      if(opts.depth!=null){
        const d=opts.depth, a=sp.depth[0], b=sp.depth[1];
        const gap=d<a?a-d:d>b?d-b:0; w*=Math.exp(-gap*9);
      }
      if(w>0)list.push([sp,w]);
    }
    if(!list.length)return null;
    let tot=0; for(const it of list)tot+=it[1];
    let r=Math.random()*tot;
    for(const [sp,w] of list){ r-=w; if(r<=0)return sp; }
    return list[list.length-1][0];
  }

  function makeFish(sp,x,y,opts={}){
    const ps=playerSize();
    let size=opts.size!=null?opts.size:rand(sp.size[0],sp.size[1]);
    if(sp.role==='jelly')size=clamp(ps*rand(.5,2.2),sp.size[0],sp.size[1]);
    const ang=opts.angle!=null?opts.angle:(Math.random()<.5?0:Math.PI)+rand(-.5,.5);
    const base=speedBase(size)*sp.speed;
    return {
      id:state.nextId++, sp:sp.id, role:sp.role, x, y, size, angle:ang, speed:base*.35,
      facing:Math.cos(ang)>=0?1:-1, flip:Math.cos(ang)>=0?1:-1, phase:rand(0,6.3),
      mode:'wander', modeUntil:0, wanderA:ang, wanderT:rand(.2,2), energy:1, rest:0, target:null, scan:rand(0,.4),
      chomp:0, puff:0, puffCd:0, stun:0, vx:0, vy:0, ignoreUntil:0, notice:0,
      spooked:Math.random()<.25,           // chỉ số ít con nhát biết chạy khi người chơi lại gần, còn lại cứ thản nhiên → dễ săn
      hue:Math.floor(rand(265,330)), hunting:false, born:state.clock
    };
  }

  function spawnOne(opts={}){
    if(state.entities.length>=CONFIG.maxEntities)return false;
    const sp=chooseSpecies(opts);
    if(!sp)return false;
    let pt=opts.at||randomPointOutsideView(sp);
    pt={x:pt.x,y:pt.y};
    if(opts.at && opts.depthClamp!==false){ const d0=sp.depth[0]*CONFIG.worldHeight, d1=sp.depth[1]*CONFIG.worldHeight; pt.y=clamp(pt.y,d0,d1); }
    const n = sp.role==='school' ? 3+Math.floor(Math.random()*3) : 1;
    for(let i=0;i<n && state.entities.length<CONFIG.maxEntities;i++){
      const f=makeFish(sp,pt.x+rand(-110,110)*(n>1?1:0),pt.y+rand(-70,70)*(n>1?1:0));
      if(n>1){ f.angle=f.wanderA=(Math.cos(state.nextId)>0?0:Math.PI); }
      f.y=clamp(f.y,40,groundY(f.x)-f.size*.5);
      f.x=clamp(f.x,60,CONFIG.worldWidth-60);
      state.entities.push(f);
    }
    return true;
  }
  function spawnBubble(anywhere){
    const v=viewRect(), w=v.right-v.left, h=v.bottom-v.top;
    const x=rand(v.left-w*.2,v.right+w*.2);
    const y=anywhere ? rand(v.top,v.bottom+h*.2) : v.bottom+rand(10,h*.25);
    if(y<30)return;
    state.bubbles.push({x, y:Math.min(y,CONFIG.worldHeight-80), r:rand(1.5,6), speed:rand(14,34), alpha:rand(.18,.5), wobble:rand(0,Math.PI*2)});
  }
  SPR.glowGreen = makeGlow(120,255,170);

  function newPlayer(){
    return {id:0, role:'hero', sp:'hero', x:CONFIG.worldWidth*.5, y:CONFIG.worldHeight*.5, vx:0, vy:0, size:CONFIG.startSize,
            angle:0, facing:1, flip:1, phase:0, speed:0, chomp:0, stun:0, slowUntil:0, puff:0, dead:false};
  }

  // ---------- vòng đời thế giới ----------
  function clearWorld(){
    state.entities=[]; state.particles=[]; state.bubbles=[]; state.texts=[]; state.nextId=1;
    state.shake=0; state.flash=0; state.danger=0; state.spawnAcc=0; state.foodT=0;
  }
  function initAttract(){
    clearWorld(); state.player=null; state.playStart=-1e9;
    state.camera.x=CONFIG.worldWidth*.5; state.camera.y=CONFIG.worldHeight*.38; state.camera.zoom=state.baseZoom*.92;
    for(let i=0;i<CONFIG.attractEntities*3 && state.entities.length<CONFIG.attractEntities;i++){
      const sp=chooseSpecies();
      if(sp){ const y=rand(sp.depth[0],sp.depth[1])*CONFIG.worldHeight; spawnOne({at:{x:rand(200,CONFIG.worldWidth-200),y}}); }
    }
    // kéo một nhóm vào khung hình để menu có sinh khí ngay
    const v=viewRect();
    for(const f of state.entities){ if(Math.random()<.5){ f.x=rand(v.left,v.right); } }
    for(let i=0;i<34;i++)spawnBubble(true);
  }
  function resetWorld(){
    clearWorld();
    state.worldSeed=Math.random()*1000; state.elapsed=0; state.score=0;
    state.player=newPlayer(); state.invulnUntil=state.clock+CONFIG.initialInvuln; state.playStart=state.clock;
    state.crowned=false; state.combo={n:0,until:0}; state.stats={eaten:0,maxLevel:1}; state.level=1; state.zone=-1; state.zoneAt=-1e9;
    state.dash={until:0,readyAt:0}; state.hud={};
    state.input.stick=null; state.input.mouse=false; state.keys.clear();
    // Bắt đầu ở tầng rạn san hô, nơi nhiều con mồi vừa miệng.
    const p=state.player; p.y=CONFIG.worldHeight*.3;
    state.camera.zoom=targetZoom();
    const c=clampCamera(p.x,p.y,state.camera.zoom); state.camera.x=c.x; state.camera.y=c.y;
    const v=viewRect(), reach=Math.max(300,Math.min(v.right-v.left,v.bottom-v.top)*.46);
    for(let i=0;i<7;i++){
      const a=Math.random()*Math.PI*2, r=rand(240,reach);
      spawnOne({food:true,at:{x:clamp(p.x+Math.cos(a)*r,80,CONFIG.worldWidth-80), y:clamp(p.y+Math.sin(a)*r*.7,120,CONFIG.worldHeight*.55)}});
    }
    for(let i=0;i<4;i++){
      const a=Math.random()*Math.PI*2, r=rand(reach*.7,reach*1.3);
      spawnOne({at:{x:clamp(p.x+Math.cos(a)*r,80,CONFIG.worldWidth-80), y:clamp(p.y+Math.sin(a)*r*.7,120,CONFIG.worldHeight*.7)}});
    }
    for(let i=0;i<14;i++)spawnOne();
    for(let i=0;i<30;i++)spawnBubble(true);
  }

  // ---------- flow: begin / pause / death ----------
  function begin(){
    unlockAudio(); startAmbient();
    if(state.autoFs)enterFs();
    resetWorld(); state.mode='playing';
    document.body.classList.add('in-game'); ui.menu.classList.add('hidden'); ui.pause.classList.remove('on');
    tone(380,.14,'sine',.045,640); keepAwake(true);
    if(state.best<60){ ui.tip.classList.add('show'); clearTimeout(begin.tipT); begin.tipT=setTimeout(()=>ui.tip.classList.remove('show'),5200); }
    startLoop();
  }
  function togglePause(){
    if(state.mode==='playing'){
      state.mode='paused'; state.input.stick=null; state.keys.clear();
      ui.pause.classList.add('on'); showCard('pause'); keepAwake(false); ui.tip.classList.remove('show');
    }else if(state.mode==='paused'){
      state.mode='playing'; ui.menu.classList.add('hidden'); ui.pause.classList.remove('on'); keepAwake(true); startLoop();
    }
  }
  function gameOver(reason,killer){
    if(state.mode!=='playing')return;
    const p=state.player;
    state.mode='dying'; state.dying=1.3; p.dead=true; p.deathReason=reason;
    if(killer)killer.chomp=1;
    state.best=Math.max(state.best,Math.floor(state.score)); store.set('fish-best',state.best);
    if(window.Scores)Scores.submit('fishsurvival',Math.floor(state.score));
    burst(p.x,p.y,'#7feeff',26); burst(p.x,p.y,'#ff8a9a',10); bubbleBurst(p.x,p.y,14);
    state.shake=16; state.flash=1; state.input.stick=null;
    tone(160,.55,'sawtooth',.05,55); tone(90,.4,'triangle',.05,40,.05);
    try{ navigator.vibrate?.([90,40,140]); }catch(_){ /* haptics optional */ }
    keepAwake(false); ui.tip.classList.remove('show');
  }
  function showGameOver(){
    state.mode='gameover'; document.body.classList.remove('in-game');
    showCard('gameover');
  }
  const fmtNum = n => Math.floor(n).toLocaleString('vi-VN');
  const fmtTime = ms => { const s=Math.floor(ms/1000); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
  function controlsHint(){
    return IS_TOUCH
      ? 'Chạm & kéo ở bất kỳ đâu để bơi · Nút  hoặc chạm ngón thứ hai để tăng tốc' + (!FS_ENABLED&&IS_IOS ? '<br>Mẹo: chọn Chia sẻ → “Thêm vào MH chính” để chơi toàn màn hình' : '')
      : 'Di chuột hoặc <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / phím mũi tên để bơi · <kbd>Space</kbd> tăng tốc<br><kbd>P</kbd>/<kbd>Esc</kbd> tạm dừng · <kbd>F</kbd> toàn màn hình · <kbd>M</kbd> âm thanh · <kbd>Enter</kbd> chơi';
  }
  function restartAnim(el){ el.style.animation='none'; void el.offsetWidth; el.style.animation=''; }
  function showCard(kind){
    ui.menu.dataset.kind=kind;
    const isMenu=kind==='menu', isOver=kind==='gameover', isPause=kind==='pause';
    ui.titleScreen.classList.toggle('hidden',!isMenu); ui.card.classList.toggle('hidden',isMenu);
    ui.menu.classList.remove('hidden');
    if(isMenu){
      ui.bestChip.classList.toggle('hidden',!(state.best>0)); ui.bestChipVal.textContent=fmtNum(state.best);
      ui.titleFsRow.classList.toggle('hidden',!FS_ENABLED);
      ui.titleHint.innerHTML=controlsHint();
      restartAnim(ui.titleScreen); sizeHero();
      return;
    }
    ui.card.dataset.kind=kind;
    ui.eyebrow.textContent = isPause ? 'TẠM DỪNG' : 'KẾT THÚC';
    const newRecord = isOver && state.score>0 && Math.floor(state.score)>=state.best && state.best>Number(begin.prevBest||0);
    ui.record.classList.toggle('hidden',!newRecord);
    if(isPause){
      ui.title.textContent='Đại dương đang chờ';
      ui.text.textContent='Nghỉ một chút rồi quay lại săn mồi nhé.';
      ui.primary.textContent='TIẾP TỤC'; ui.secondary.textContent='CHƠI LẠI'; ui.secondary.classList.remove('hidden');
    }else{
      ui.title.textContent='Bạn đã bị nuốt!';
      ui.text.textContent=(state.player?.deathReason||'')+' Hãy quay lại biển và ăn nhanh hơn để vượt qua kỷ lục.';
      ui.primary.textContent='CHƠI LẠI'; ui.secondary.classList.add('hidden');
    }
    ui.stScore.textContent=fmtNum(state.score); ui.stEaten.textContent=state.stats.eaten;
    ui.stTime.textContent=fmtTime(state.elapsed); ui.stLevel.textContent=state.stats.maxLevel;
    ui.bestLine.innerHTML = state.best>0 ? `Kỷ lục của bạn: <b>${fmtNum(state.best)}</b>` : '';
    ui.fsRow.classList.toggle('hidden',!FS_ENABLED||isPause);
    ui.hint.innerHTML=controlsHint();
    restartAnim(ui.card);
  }

  // ---------- title screen art ----------
  // The title scene reuses the in-game fish renderer so the menu shows the
  // same creatures the player will meet: a predator closing in on our fish,
  // which is itself chasing a smaller one.
  function withCtx(c,fn){ const prev=ctx; ctx=c; try{ fn(); }finally{ ctx=prev; } }
  const hero={ctx:ui.heroCanvas.getContext('2d'), w:0, h:0, dpr:1};
  const HERO_W=540, HERO_H=180;
  function sizeHero(){
    const r=ui.heroCanvas.getBoundingClientRect();
    if(!r.width)return;
    hero.dpr=Math.min(2,devicePixelRatio||1); hero.w=r.width; hero.h=r.height;
    ui.heroCanvas.width=Math.round(r.width*hero.dpr); ui.heroCanvas.height=Math.round(r.height*hero.dpr);
  }
  function redAura(x,y,w,h,a){ ctx.save(); ctx.globalAlpha=a; ctx.drawImage(SPR.glowRed,x-w/2,y-h/2,w,h); ctx.restore(); }
  function drawHero(){
    if(!hero.w)return;
    const c=hero.ctx, t=state.time, k=hero.w/HERO_W, dpr=hero.dpr*k;
    c.setTransform(hero.dpr*k,0,0,hero.dpr*k,0,0);
    c.clearRect(0,0,HERO_W,HERO_H);
    withCtx(c,()=>{
      const sway=Math.sin(t*.8);
      const bx=145+sway*14, by=98+Math.sin(t*1.2)*7;
      const px=335+sway*6, py=92+Math.sin(t*1.6+1)*6;
      const sx=476+Math.sin(t*2.1)*10, sy=84+Math.sin(t*2.7+2)*9;
      redAura(bx+14,by,250,92,.3+.12*Math.sin(t*5));
      FA.drawFish(c,'whiteshark',bx,by,236,{angle:Math.sin(t*1.2)*.05,flip:1,phase:t*4,amp:.02,dpr});
      drawGlow(SPR.glowCyan,px,py,76,.35,true);
      FA.drawFish(c,'hero',px,py,88,{angle:-.05+Math.sin(t*1.6)*.07,flip:1,phase:t*8,amp:.05,dpr});
      FA.drawFish(c,'clown',sx,sy,48,{angle:Math.sin(t*2.3)*.12,flip:1,phase:t*11,amp:.05,dpr});
      c.lineWidth=1.3; c.strokeStyle='rgb(205,246,255)';
      for(let i=0;i<7;i++){
        const u=(t*.42+i/7)%1, r=1.6+(i%3)*.9;
        c.globalAlpha=(1-u)*.75;
        c.beginPath(); c.arc(px+34+Math.sin(u*8+i)*5,py-14-u*80,r,0,Math.PI*2); c.stroke();
      }
      c.globalAlpha=1;
    });
  }
  function drawHowtoIcons(){
    const dpr=Math.min(2,devicePixelRatio||1);
    const paint=(cv,fn)=>{ cv.width=72*dpr; cv.height=40*dpr; const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); withCtx(c,()=>fn(c,dpr)); };
    paint(ui.icoEat,(c,d)=>{
      drawGlow(SPR.glowCyan,30,21,32,.22,true);
      FA.drawFish(c,'hero',30,22,34,{angle:0,flip:1,phase:1.2,amp:.04,dpr:d});
      FA.drawFish(c,'sardine',60,11,22,{angle:-.25,flip:1,phase:2,amp:.04,dpr:d});
    });
    paint(ui.icoDanger,(c,d)=>{
      redAura(38,21,84,34,.5);
      FA.drawFish(c,'shark',38,21,64,{angle:0,flip:1,phase:.6,amp:.03,dpr:d});
    });
  }
  function banner(small,big,kind=''){
    ui.bannerSmall.textContent=small; ui.bannerBig.textContent=big;
    ui.banner.className='banner '+kind; void ui.banner.offsetWidth; ui.banner.classList.add('show');
    clearTimeout(banner.t); banner.t=setTimeout(()=>ui.banner.classList.remove('show'),1800);
  }

  // ---------- input ----------
  function desiredVector(){
    const p=state.player; let x=0,y=0;
    const K=state.keys;
    if(K.has('ArrowLeft')||K.has('a'))x-=1; if(K.has('ArrowRight')||K.has('d'))x+=1;
    if(K.has('ArrowUp')||K.has('w'))y-=1; if(K.has('ArrowDown')||K.has('s'))y+=1;
    if(x||y){ const m=Math.hypot(x,y); return {x:x/m,y:y/m,m:1}; }
    const st=state.input.stick;
    if(st){
      const dx=st.x-st.ox, dy=st.y-st.oy, d=Math.hypot(dx,dy);
      if(d>6)return {x:dx/d, y:dy/d, m:clamp((d-6)/(CONFIG.stickRadius-6),0,1)};
      return {x:0,y:0,m:0};
    }
    if(state.input.mouse && p){
      const ps=worldToScreen(p.x,p.y);
      const dx=state.input.mx-ps.x, dy=state.input.my-ps.y, d=Math.hypot(dx,dy);
      const dead=Math.max(12,p.size*state.camera.zoom*.7);
      if(d>dead){ const t=clamp((d-dead)/150,0,1); return {x:dx/d, y:dy/d, m:.25+.75*t*(2-t)}; }
    }
    return {x:0,y:0,m:0};
  }
  function tryDash(){
    if(state.mode!=='playing'||state.clock<state.dash.readyAt)return;
    const p=state.player;
    state.dash.until=state.clock+CONFIG.dashDuration; state.dash.readyAt=state.clock+CONFIG.dashCooldown;
    bubbleBurst(p.x-Math.cos(p.angle)*p.size*1.6, p.y-Math.sin(p.angle)*p.size*1.6, 8);
    state.shake=Math.max(state.shake,3);
    tone(220,.22,'triangle',.04,720);
  }

  // ---------- mô phỏng ----------
  function updatePlayer(dt){
    const p=state.player, v=desiredVector();
    p.stun=Math.max(0,p.stun-dt);
    let speed=speedBase(p.size)*1.1*(p.stun>0?.35:1)*(state.clock<p.slowUntil?.65:1);
    const dashing=state.clock<state.dash.until;
    let tx=v.x*speed*v.m, ty=v.y*speed*v.m;
    if(dashing){
      speed*=CONFIG.dashBoost;
      const dx=v.m>0?v.x:Math.cos(p.angle), dy=v.m>0?v.y:Math.sin(p.angle);
      tx=dx*speed; ty=dy*speed;
    }
    const acc=Math.min(1,dt*(dashing?14:7));
    p.vx += (tx-p.vx)*acc; p.vy += (ty-p.vy)*acc;
    p.x=clamp(p.x+p.vx*dt,40,CONFIG.worldWidth-40);
    p.y=clamp(p.y+p.vy*dt,50,groundY(p.x)-p.size*.3);
    const sp=Math.hypot(p.vx,p.vy); p.speed=sp;
    if(sp>20)p.angle=lerpAngle(p.angle,Math.atan2(p.vy,p.vx),Math.min(1,dt*10));
    const c=Math.cos(p.angle); if(c>.15)p.facing=1; else if(c<-.15)p.facing=-1;
    p.flip += (p.facing-p.flip)*Math.min(1,dt*9);
    p.phase += dt*(4.2+sp/Math.max(30,p.size)*1.8);
    p.chomp=Math.max(0,p.chomp-dt*5);
    if((dashing||sp>speedBase(p.size)*.95) && Math.random()<dt*(dashing?38:8)){
      const bx=p.x-Math.cos(p.angle)*p.size*.55, by=p.y-Math.sin(p.angle)*p.size*.55;
      state.particles.push({kind:'bubble',x:bx+rand(-4,4),y:by+rand(-4,4),vx:-p.vx*.1,vy:rand(-20,-5),r:rand(1.5,3.5)*Math.max(1,p.size/90),life:rand(.5,1),max:1});
    }
  }

  // tìm con mồi cho kẻ săn
  function huntSight(f){ return Math.min(900,f.size*(SP[f.sp].sight||5.5)); }
  function findPrey(f,p){
    const sight=huntSight(f); let best=null, bd=sight;
    if(p && state.clock>state.invulnUntil && p.size*CONFIG.dangerRatio<=f.size){
      const d=Math.hypot(p.x-f.x,p.y-f.y)*.9; if(d<bd){ bd=d; best=p; }
    }
    for(const o of state.entities){
      if(o===f||o.role==='jelly'||o.role==='giant')continue;
      if(o.size*CONFIG.npcEatRatio>f.size)continue;
      if(o.puff>0 && f.size<o.size*1.9)continue;
      const d=Math.hypot(o.x-f.x,o.y-f.y); if(d<bd){ bd=d; best=o; }
    }
    return best;
  }
  const entityById = id => { for(const o of state.entities) if(o.id===id)return o; return null; };

  function updateJelly(f,dt){
    f.phase+=dt*2.2;
    const dy=Math.sin(f.phase*.5)*16+(f.rise||0);
    f.vx += (Math.cos(f.wanderA)*10-f.vx)*dt*.6; f.vy += (dy-f.vy)*dt*.8;
    f.wanderT-=dt; if(f.wanderT<=0){ f.wanderT=rand(3,7); f.wanderA=rand(0,Math.PI*2); }
    const sp=SP.jelly, d=depthFactor(f.y);
    f.rise = d<sp.depth[0]?30:d>sp.depth[1]?-30:0;
    f.x=clamp(f.x+f.vx*dt,60,CONFIG.worldWidth-60);
    f.y=clamp(f.y+f.vy*dt,60,groundY(f.x)-f.size*.9);
    f.angle=0; f.speed=Math.hypot(f.vx,f.vy);
  }

  function updateFish(f,dt){
    const p=livePlayer(), now=state.clock, sp=SP[f.sp];
    f.chomp=Math.max(0,f.chomp-dt*4); f.stun=Math.max(0,f.stun-dt);
    f.puff=Math.max(0,f.puff-dt); f.puffCd=Math.max(0,f.puffCd-dt);
    if(f.role==='jelly'){ updateJelly(f,dt); return; }
    const W=CONFIG.worldWidth;
    const base=speedBase(f.size)*sp.speed*(f.puff>0?.45:1);
    let fx=0, fy=0, wantS=base*.4, flee=false, chase=false;
    f.hunting=false;

    // lang thang
    f.wanderT-=dt; if(f.wanderT<=0){ f.wanderT=rand(1.4,3.6); f.wanderA+=rand(-1,1)*(f.role==='school'?.45:.85); }
    fx+=Math.cos(f.wanderA)*.8; fy+=Math.sin(f.wanderA)*.8;
    // tầng nước ưa thích
    const d=depthFactor(f.y);
    if(d<sp.depth[0])fy+=(sp.depth[0]-d)*14; else if(d>sp.depth[1])fy-=(d-sp.depth[1])*14;
    // tránh biên
    const m=380;
    if(f.x<m)fx+=(1-f.x/m)*2.4; if(f.x>W-m)fx-=(1-(W-f.x)/m)*2.4;
    if(f.y<140)fy+=(1-f.y/140)*2.2;
    const gnd=groundY(f.x)-f.size*.7;
    if(f.y>gnd-180)fy-=clamp((f.y-(gnd-180))/180,0,1)*2.4;

    // bầy đàn
    if(f.role==='school'){
      let cx=0,cy=0,ax=0,ay=0,n=0,sx=0,sy=0;
      for(const o of state.entities){
        if(o===f||o.sp!==f.sp)continue;
        const dx=o.x-f.x, dy=o.y-f.y, d2=dx*dx+dy*dy;
        if(d2<260*260&&d2>1){ cx+=o.x; cy+=o.y; ax+=Math.cos(o.angle); ay+=Math.sin(o.angle); n++; if(d2<44*44){ const dd=Math.sqrt(d2); sx-=dx/dd; sy-=dy/dd; } }
      }
      if(n){ const k=.0045; fx+=(cx/n-f.x)*k+ax/n*.9+sx*1.3; fy+=(cy/n-f.y)*k+ay/n*.9+sy*1.3; }
    }

    // né kẻ săn / người chơi to hơn
    let threatNear=0, fleeHunter=false;
    const addThreat=(tx,ty,range)=>{
      const dx=f.x-tx, dy=f.y-ty, dd=Math.hypot(dx,dy)||1;
      if(dd<range){ const k=1-dd/range; fx+=dx/dd*(1.6+3*k); fy+=dy/dd*(1.6+3*k); flee=true; threatNear=Math.max(threatNear,k); }
    };
    if(p && f.spooked && p.size>=f.size*CONFIG.eatRatio && f.role!=='giant')addThreat(p.x,p.y,110+f.size*2.2);
    if(f.role!=='giant'){
      for(const o of state.entities){
        if(o===f||!isHunter(o)||o.size<f.size*CONFIG.npcEatRatio)continue;
        const before=flee; addThreat(o.x,o.y,200+o.size*(o.mode==='chase'?3.4:1.8)); if(flee&&!before)fleeHunter=true; else if(flee&&Math.hypot(f.x-o.x,f.y-o.y)<200+o.size*1.8)fleeHunter=true;
      }
    }
    if(flee){
      wantS=base*1.12;
      // con mồi chạy khỏi người chơi thì luôn chậm hơn người chơi một chút → đuổi kịp được nếu đi đúng hướng
      if(p && threatNear>0 && !fleeHunter)wantS=Math.min(wantS,speedBase(p.size)*1.1*.9);
    }
    // cá nóc phồng lên khi bị đe doạ
    if(f.sp==='puffer' && flee && threatNear>.35 && f.puffCd<=0 && f.puff<=0){ f.puff=3.4; f.puffCd=8; }

    // kẻ săn mồi
    if(isHunter(f)){
      if(f.mode==='rest'){ wantS=base*.35; if(now>f.modeUntil){ f.mode='wander'; f.energy=Math.max(f.energy,.35); } }
      else{
        f.scan-=dt;
        if(f.mode==='wander'){
          f.energy=Math.min(1,f.energy+dt/6);
          if(f.scan<=0){
            f.scan=.35+Math.random()*.25;
            const t=findPrey(f,p);
            if(t===p && state.clock<f.ignoreUntil){ /* vừa mất hứng với người chơi */ }
            else if(t && f.energy>.4){
              if(t===p){ f.notice=(f.notice||0)+f.scan; if(f.notice>=.7){ f.mode='chase'; f.target=0; f.notice=0; } }
              else{ f.mode='chase'; f.target=t.id; }
            } else f.notice=0;
          }
        }
        if(f.mode==='chase'){
          const t=f.target===0?p:entityById(f.target);
          const sight=huntSight(f);
          if(!t || (t===p&&state.clock<state.invulnUntil)){ f.mode='wander'; f.target=null; }
          else{
            const dx=t.x-f.x, dy=t.y-f.y, dd=Math.hypot(dx,dy)||1;
            if(dd>sight*1.4){ f.mode='wander'; f.target=null; }
            else if(f.energy<=0){ f.mode='rest'; f.modeUntil=now+3500; if(f.target===0)f.ignoreUntil=now+7000; f.target=null; }
            else{
              const lead=clamp(dd/ (base*1.1),0,.6);
              const ax=t.x+(t.vx||0)*lead-f.x, ay=t.y+(t.vy||0)*lead-f.y, al=Math.hypot(ax,ay)||1;
              fx=ax/al*5; fy=ay/al*5;
              wantS=base*(sp.ambush?1.2:1.0);
              // đuổi người chơi: chỉ nhanh hơn một chút để người chơi còn đường thoát (lách / tăng tốc)
              if(t===p)wantS=Math.min(wantS,speedBase(p.size)*1.1*(p.stun>0?.35:1)*(sp.ambush?1.3:1.0));
              chase=true; f.hunting=true;
              f.energy-=dt/(sp.ambush?1.5:2.8);
            }
          }
        }
      }
    }

    // hướng & tốc độ (giới hạn tốc độ quay để người chơi có thể lách)
    const wantA=(Math.abs(fx)+Math.abs(fy)>.01)?Math.atan2(fy,fx):f.angle;
    const tr=turnRate(f.size)*(chase?.85:1)*(flee?1.2:1);
    f.angle=wrapA(f.angle+clamp(wrapA(wantA-f.angle),-tr*dt,tr*dt));
    f.speed += (wantS-f.speed)*(1-Math.exp(-(wantS>f.speed?2.4:1.6)*dt));
    if(f.stun>0)f.speed*=.6;
    f.vx=Math.cos(f.angle)*f.speed; f.vy=Math.sin(f.angle)*f.speed;
    f.x+=f.vx*dt; f.y+=f.vy*dt;
    if(f.x<50){ f.x=50; f.wanderA=rand(-1,1); }
    if(f.x>W-50){ f.x=W-50; f.wanderA=Math.PI+rand(-1,1); }
    if(f.y<50){ f.y=50; f.wanderA=rand(.2,1.2); }
    const floor=groundY(f.x)-f.size*.35;
    if(f.y>floor){ f.y=floor; f.wanderA=-rand(.2,1.2); }

    const c=Math.cos(f.angle); if(c>.15)f.facing=1; else if(c<-.15)f.facing=-1;
    f.flip += (f.facing-f.flip)*Math.min(1,dt*8);
    f.phase += dt*(4.2+f.speed/Math.max(30,f.size)*1.8);
  }

  function drawAngle(f){
    const a=f.facing>0?f.angle:f.angle+Math.PI;
    return clamp(wrapA(a),-1.05,1.05);
  }

  // ---------- ăn & bị ăn ----------
  function fishColor(f){ const s=SP[f.sp]; return (s.paint&&s.paint.mid)||'#bfa6ff'; }
  function playerEat(f){
    const p=state.player;
    const n = state.clock<state.combo.until ? state.combo.n+1 : 1;
    state.combo.n=n; state.combo.until=state.clock+CONFIG.comboWindow;
    const mult=Math.min(CONFIG.comboMax,1+Math.floor((n-1)/2));
    let gain=Math.max(1,Math.round(f.size*.9));
    if(isHunter(f))gain=Math.round(gain*1.5);
    if(f.role==='jelly')gain=Math.round(gain*1.3);
    gain*=mult;
    // khối lượng tăng theo bình phương kích cỡ con mồi: cá bé cho ít, cá gần bằng mình cho nhiều
    const gk=CONFIG.growK+.22*Math.max(0,1-p.size/200);   // đầu ván lớn nhanh, về sau chậm dần
    p.size=Math.sqrt(p.size*p.size+f.size*f.size*gk);
    p.chomp=1;
    state.score+=gain; state.stats.eaten++;
    const col=fishColor(f);
    burst(f.x,f.y,col,10); bubbleBurst(f.x,f.y,4);
    addText(f.x,f.y-f.size*.4,'+'+gain+(mult>1?'  ×'+mult:''), mult>1?'#ffd76a':'#eafaff', mult>1?20:16);
    if(f.size>p.size*.55)state.shake=Math.max(state.shake,4);
    tone(520+Math.min(360,p.size*.3)+Math.min(8,n)*30,.07,'sine',.03,900+Math.min(8,n)*60);
    if(mult>1 && n%2===1){ ui.combo.classList.remove('bump'); void ui.combo.offsetWidth; ui.combo.classList.add('bump'); }
    if(SP[f.sp].venom){ p.slowUntil=state.clock+2600; addText(p.x,p.y-p.size*.6,'NỌC ĐỘC!','#ff8aa0',15); }
    const lvl=levelOf(p.size);
    if(lvl>state.level){
      state.level=lvl; state.stats.maxLevel=Math.max(state.stats.maxLevel,lvl);
      banner('TIẾN HÓA','Cấp '+lvl,'level');
      state.particles.push({kind:'ring',x:p.x,y:p.y,r:p.size*.7,grow:p.size*4,life:.8,max:.8,color:'255,215,106'});
      state.particles.push({kind:'ring',x:p.x,y:p.y,r:p.size*.4,grow:p.size*2.8,life:.6,max:.6,color:'140,240,255'});
      [523,659,784,1047].forEach((fq,i)=>tone(fq,.18,'triangle',.035,0,i*.07));
      if(p.size>=1400 && !state.crowned){ state.crowned=true; setTimeout(()=>banner('CHÚA TỂ','Đại dương thuộc về bạn','level'),900); }
    }
  }
  function sting(f){
    const p=state.player;
    if(p.stun>0||state.clock<state.invulnUntil)return;
    p.stun=1.1; p.size=Math.max(CONFIG.startSize,p.size*.95);
    state.combo.n=0; state.shake=Math.max(state.shake,6); state.flash=Math.max(state.flash,.5);
    burst(p.x,p.y,'#e6a6ff',12); addText(p.x,p.y-p.size*.7,'BỊ SỨA ĐỐT!','#e6a6ff',17);
    tone(300,.2,'sawtooth',.04,120);
    try{ navigator.vibrate?.(40); }catch(_){ /* haptics optional */ }
  }

  function despawnRadius(){
    const z=state.camera.zoom;
    return Math.max(CONFIG.despawnRadius, Math.hypot(state.width,state.height)*.5/z+500);
  }
  function targetCount(){
    const lvl=state.player?levelOf(state.player.size):1;
    return Math.min(CONFIG.maxEntities,30+Math.floor(lvl*1.6));
  }

  function updateEntities(dt,target){
    const E=state.entities;
    for(const f of E)updateFish(f,dt);
    const p=livePlayer(), cam=state.camera, R=despawnRadius();
    const dead=new Set();
    const onScreen=(x,y)=>{ const v=viewRect(); return x>v.left&&x<v.right&&y>v.top&&y<v.bottom; };
    // sinh thái: kẻ săn ăn cá nhỏ
    for(const f of E){
      if(dead.has(f)||!isHunter(f))continue;
      const fb=capsule(f);
      for(const o of E){
        if(o===f||dead.has(o)||o.role==='jelly'||o.role==='giant')continue;
        if(o.size*CONFIG.npcEatRatio>f.size)continue;
        if(o.puff>0&&f.size<o.size*1.9)continue;
        if(Math.abs(o.x-f.x)>f.size*.9+o.size||Math.abs(o.y-f.y)>f.size*.9+o.size)continue;
        if(canSwallow(f,fb,o,capsule(o))){
          dead.add(o); f.chomp=1; f.energy=Math.min(1,f.energy+.3); if(f.target===o.id){ f.target=null; f.mode='wander'; }
          if(onScreen(o.x,o.y)){ burst(o.x,o.y,fishColor(o),6); bubbleBurst(o.x,o.y,3); }
        }
      }
    }
    for(let i=E.length-1;i>=0;i--){
      const f=E[i];
      if(dead.has(f)){ E.splice(i,1); continue; }
      if(Math.hypot(f.x-cam.x,f.y-cam.y)>R){ E.splice(i,1); continue; }
    }
    // người chơi
    if(p && state.mode==='playing'){
      const pbEat=capsule(p,1), pbHit=capsule(p,.78);
      for(let i=E.length-1;i>=0;i--){
        const f=E[i];
        if(Math.hypot(f.x-p.x,f.y-p.y)>(p.size+f.size)*1.3)continue;
        const fb=capsule(f);
        if(f.role==='jelly'){
          if(p.size>=f.size*1.8){ if(canSwallow(p,pbEat,f,fb)){ playerEat(f); E.splice(i,1); } }
          else if(f.size>=p.size*.5 && Math.hypot(p.x-f.x,p.y-(f.y-f.size*.1))<f.size*.42+pbHit.r)sting(f);
          continue;
        }
        const canEat = p.size>=f.size*CONFIG.eatRatio && !(f.puff>0&&p.size<f.size*1.9);
        if(canEat){ if(canSwallow(p,pbEat,f,fb)){ playerEat(f); E.splice(i,1); } }
        else if(isHunter(f) && f.size>=p.size*CONFIG.dangerRatio && state.clock>state.invulnUntil && canSwallow(f,fb,p,pbHit)){
          f.chomp=1;
          gameOver(`Một con ${SP[f.sp].name.toLowerCase()} lớn hơn đã nuốt bạn.`,f); return;
        }
      }
    }
    // bổ sung dân số
    state.spawnAcc+=dt;
    const need=target-E.length;
    if(need>0 && (state.spawnAcc>.25||need>target*.4)){ state.spawnAcc=0; spawnOne(); }
    // luôn có thức ăn trong tầm nhìn
    if(p && state.mode==='playing'){
      state.foodT+=dt;
      if(state.foodT>1.5){
        state.foodT=0;
        const v=viewRect(), rr=Math.min(v.right-v.left,v.bottom-v.top)*.55;
        let near=0;
        for(const f of E) if(f.role!=='jelly'&&f.role!=='giant'&&f.size*CONFIG.eatRatio<=p.size&&Math.hypot(f.x-p.x,f.y-p.y)<rr)near++;
        if(near<3){
          const a=Math.random()*Math.PI*2, r=rr*rand(.9,1.2);
          spawnOne({food:true,at:{x:clamp(p.x+Math.cos(a)*r,80,CONFIG.worldWidth-80),y:clamp(p.y+Math.sin(a)*r*.8,100,CONFIG.worldHeight-200)}});
        }
      }
    }
  }
  function updateBubbles(dt){
    const cam=state.camera, R=despawnRadius();
    for(const b of state.bubbles){ b.y-=b.speed*dt; b.wobble+=dt*1.4; b.x+=Math.sin(b.wobble)*dt*7; }
    state.bubbles=state.bubbles.filter(b=>b.y>4 && Math.abs(b.x-cam.x)<R && Math.abs(b.y-cam.y)<R);
    let guard=0;
    while(state.bubbles.length<30 && guard++<4)spawnBubble(false);
  }
  function updatePlaying(dt){
    const p=state.player;
    updatePlayer(dt);
    easeCamera(dt,p.x,p.y,targetZoom(),CONFIG.cameraSmooth);
    updateEntities(dt,targetCount());
    if(state.mode!=='playing')return;
    updateBubbles(dt);
    state.elapsed += dt*1000;
    if(state.combo.n && state.clock>state.combo.until)state.combo.n=0;
    // mức nguy hiểm: kẻ săn gần nhất có thể nuốt mình
    let danger=0;
    for(const f of state.entities){
      if(!isHunter(f)||f.size<p.size*CONFIG.dangerRatio)continue;
      const gap=Math.hypot(f.x-p.x,f.y-p.y)-p.size*.5-f.size*.45;
      danger=Math.max(danger,clamp(1-gap/(f.hunting?340:170),0,1));
    }
    state.danger += (danger-state.danger)*Math.min(1,dt*6);
    // thông báo vùng nước
    const dd=depthFactor(p.y); const zi=ZONES.findIndex(z=>dd<z.max);
    if(zi!==state.zone){
      const cur=state.zone>=0?ZONES[state.zone]:null;
      const prevMax=state.zone>0?ZONES[state.zone-1].max:0;
      const hysteresis=cur && dd>prevMax-.012 && dd<cur.max+.012;
      if(!hysteresis){
        state.zone=zi;
        if(state.clock-state.zoneAt>1500){ banner(state.elapsed<500?'BẮT ĐẦU':'KHU VỰC',ZONES[zi].name,'zone'); state.zoneAt=state.clock; }
      }
    }
  }

  function updateAttract(dt){
    const t=state.time, W=CONFIG.worldWidth, H=CONFIG.worldHeight;
    if(state.mode==='menu'){
      easeCamera(dt, W*.5+Math.sin(t*.045)*W*.3, H*(.4+Math.sin(t*.031)*.32), state.baseZoom*.92, .7);
    }else{
      const c=state.camera; easeCamera(dt,c.x+Math.sin(t*.2)*6,c.y-4,c.zoom,1);
    }
    updateEntities(dt,CONFIG.attractEntities);
    updateBubbles(dt);
  }
  function updateDying(dt){
    const p=state.player;
    p.angle += dt*2.4; p.y=Math.min(p.y+dt*30,groundY(p.x)-p.size*.4); p.vx*=.9; p.vy*=.9;
    easeCamera(dt,p.x,p.y,state.camera.zoom*1.0,3);
    updateEntities(dt,state.entities.length);
    updateBubbles(dt);
  }
  function burst(x,y,color,count){
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,s=rand(25,130);
      state.particles.push({kind:'dot',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rand(1.5,4.5),life:rand(.35,.85),max:.85,color});
    }
  }
  function bubbleBurst(x,y,count){
    for(let i=0;i<count;i++)state.particles.push({kind:'bubble',x:x+rand(-8,8),y:y+rand(-8,8),vx:rand(-30,30),vy:rand(-60,-15),r:rand(1.5,4),life:rand(.6,1.2),max:1.2});
  }
  function addText(x,y,text,color,size){ state.texts.push({x,y,text,color,size,life:1,max:1,rise:0}); }
  function updateParticles(dt){
    for(const q of state.particles){
      q.life-=dt;
      if(q.kind==='ring'){ q.r+=q.grow*dt; continue; }
      q.x+=q.vx*dt; q.y+=q.vy*dt;
      if(q.kind==='bubble'){ q.vy-=40*dt; q.vx*=.96; q.x+=Math.sin(q.life*9)*dt*10; }
      else { q.vy+=25*dt; q.vx*=.985; q.vy*=.985; }
    }
    state.particles=state.particles.filter(q=>q.life>0);
    for(const t of state.texts){ t.life-=dt; t.rise+=dt*(46+t.life*30); }
    state.texts=state.texts.filter(t=>t.life>0);
  }

  // ---------- main loop ----------
  function startLoop(){ if(!state.raf){ state.lastTs=0; state.raf=requestAnimationFrame(frame); } }
  function frame(ts){
    if(state.mode==='paused'){ state.raf=0; return; }
    state.raf=requestAnimationFrame(frame);
    const raw=state.lastTs?Math.min(.05,(ts-state.lastTs)/1000):0; state.lastTs=ts;
    state.time += raw;
    let dt=Math.min(.034,raw);
    if(state.mode==='dying')dt*=.35;
    state.clock += dt*1000;
    if(state.mode==='playing')updatePlaying(dt);
    else if(state.mode==='dying'){ updateDying(dt); state.dying-=raw; if(state.dying<=0)showGameOver(); }
    else updateAttract(dt);
    updateParticles(dt);
    state.shake*=Math.exp(-raw*9); state.flash=Math.max(0,state.flash-raw*1.6);
    if(state.mode!=='playing')state.danger*=Math.exp(-raw*5);
    render();
    if(state.mode==='playing'||state.mode==='dying'){ drawMinimap(); updateHud(); }
    else if(state.mode==='menu')drawHero();
  }

  // ---------- rendering: environment ----------
  function drawWater(v){
    const w=state.width, h=state.height, H=CONFIG.worldHeight;
    const g=ctx.createLinearGradient(0,0,0,h);
    for(let i=0;i<=4;i++){ const t=i/4; g.addColorStop(t,rgba(waterRGB((v.top+(v.bottom-v.top)*t)/H))); }
    ctx.fillStyle=g; ctx.fillRect(-40,-40,w+80,h+80);
  }
  const FAR_LAYERS = [
    {f:.14, rgb:[8,44,68], a:.42, amp:1500, freq:.0011, kelp:0},
    {f:.26, rgb:[5,32,52], a:.58, amp:1050, freq:.0017, kelp:.55},
    {f:.42, rgb:[3,22,37], a:.76, amp:700,  freq:.0026, kelp:.7}
  ];
  function ridgeHeight(L,X){ return L.amp*(.35+.65*noise1(X*L.freq+L.f*100))+L.amp*.18*noise1(X*L.freq*4+13+L.f*50); }
  function drawFarLayers(){
    const w=state.width, h=state.height, cam=state.camera, z=cam.zoom, H=CONFIG.worldHeight, t=state.time;
    for(const L of FAR_LAYERS){
      const s=z*L.f, floorSY=h/2+(H-cam.y)*s;
      if(floorSY-L.amp*1.25*s>h+10)continue;
      ctx.fillStyle=rgba(L.rgb,L.a);
      ctx.beginPath(); ctx.moveTo(-40,h+40);
      for(let x=-40;x<=w+40;x+=20){ const X=cam.x+(x-w/2)/s; ctx.lineTo(x,floorSY-ridgeHeight(L,X)*s); }
      ctx.lineTo(w+40,h+40); ctx.closePath(); ctx.fill();
      if(!L.kelp||s<.05)continue;
      const sp=240, x0=cam.x+(-80-w/2)/s, x1=cam.x+(w+80-w/2)/s;
      ctx.strokeStyle=rgba(L.rgb,L.a); ctx.lineCap='round';
      for(let k=Math.floor(x0/sp);k<=Math.ceil(x1/sp);k++){
        if(hash1(k*1.7+L.f*1000)>L.kelp)continue;
        const X=k*sp+hash1(k*3.3+L.f)*sp*.6;
        const bx=w/2+(X-cam.x)*s, by=floorSY-ridgeHeight(L,X)*s+12*s;
        const len=(380+hash1(k*7.9+L.f)*600)*s, sw=Math.sin(t*.7+k*1.3)*len*.12;
        ctx.lineWidth=Math.max(1,26*s);
        ctx.beginPath(); ctx.moveTo(bx,by);
        ctx.bezierCurveTo(bx+sw*.4,by-len*.35,bx-sw*.6,by-len*.7,bx+sw,by-len); ctx.stroke();
      }
    }
  }
  function drawLightRays(v){
    const w=state.width, h=state.height, cam=state.camera, z=cam.zoom, t=state.time;
    const intensity=Math.pow(clamp(1-Math.max(0,v.top)/(CONFIG.worldHeight*.42),0,1),1.4);
    if(intensity<=.01)return;
    const surfaceY=(0-cam.y)*z+h/2;
    const spacing=190, scroll=cam.x*z*.35;
    const k0=Math.floor((scroll-w*.5-300)/spacing), k1=Math.ceil((scroll+w*.5+300)/spacing);
    const len=Math.max(h*.7,1600*z);
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let k=k0;k<=k1;k++){
      if(hash1(k*3.1+7)<.3)continue;
      const x=k*spacing-scroll+w/2+Math.sin(t*.35+k*1.3)*18;
      const bw=spacing*(.25+.55*hash1(k*5.7));
      ctx.globalAlpha=intensity*(.05+.08*(.5+.5*Math.sin(t*.6+k*2.3)));
      ctx.setTransform(state.dpr,0,0,state.dpr,0,0);
      ctx.translate(x+state.shakeX,surfaceY+state.shakeY); ctx.rotate(.2);
      ctx.drawImage(SPR.beam,-bw/2,0,bw,len);
    }
    ctx.restore();
  }
  function drawCaustics(){
    if(!caustic.pattern||!caustic.pattern.setTransform)return;
    const w=state.width, h=state.height, cam=state.camera, z=cam.zoom, t=state.time;
    const surfaceY=(0-cam.y)*z+h/2, regionH=620*z;
    const top=Math.max(0,surfaceY), bottom=Math.min(h,surfaceY+regionH);
    if(bottom-top<4)return;
    const b=caustic.bctx, bw=Math.ceil(w/2), bh=Math.ceil((bottom-top)/2);
    b.setTransform(1,0,0,1,0,0); b.globalAlpha=1; b.globalCompositeOperation='source-over'; b.clearRect(0,0,bw,bh);
    for(let i=0;i<2;i++){
      const sc=z*(i?1.6:1.25);
      const ox=(w/2-cam.x*z)*.5+t*(i?13:-9), oy=(surfaceY-top)*.5+t*(i?7:10);
      caustic.pattern.setTransform(new DOMMatrix([sc,0,0,sc,ox,oy]));
      b.globalCompositeOperation=i?'lighter':'source-over'; b.globalAlpha=i?.65:.85;
      b.fillStyle=caustic.pattern; b.fillRect(0,0,bw,bh);
    }
    b.globalCompositeOperation='destination-in'; b.globalAlpha=1;
    const g=b.createLinearGradient(0,(surfaceY-top)*.5,0,(surfaceY-top+regionH)*.5);
    g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(1,'rgba(0,0,0,0)');
    b.fillStyle=g; b.fillRect(0,0,bw,bh);
    ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=.11;
    ctx.drawImage(caustic.buf,0,0,bw,bh,0,top,w,bottom-top);
    ctx.restore();
  }
  function waveY(X,t){ return Math.sin(X*.018+t*1.7)*5+Math.sin(X*.043-t*2.4)*2.5; }
  function drawSkyAndSurface(){
    const w=state.width, h=state.height, cam=state.camera, z=cam.zoom, t=state.time;
    const sy=(0-cam.y)*z+h/2;
    if(sy<-30)return;
    const pts=[];
    for(let x=-40;x<=w+40;x+=12){ const X=cam.x+(x-w/2)/z; pts.push(x,sy+waveY(X,t)*z); }
    // Sky above the waterline.
    const sky=ctx.createLinearGradient(0,sy-CONFIG.skyMargin*z,0,sy);
    sky.addColorStop(0,'#4aa7d4'); sky.addColorStop(1,'#c8f2ff');
    ctx.fillStyle=sky; ctx.beginPath(); ctx.moveTo(-40,-40);
    for(let i=0;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);
    ctx.lineTo(w+40,-40); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.globalCompositeOperation='lighter';
    const sunX=w*.72-cam.x*z*.03%w, sunR=240*z;
    ctx.globalAlpha=.55; ctx.drawImage(SPR.glowGold,sunX-sunR,sy-70*z-sunR,sunR*2,sunR*2);
    // Bright underside of the surface.
    const band=ctx.createLinearGradient(0,sy,0,sy+80*z);
    band.addColorStop(0,'rgba(210,250,255,.34)'); band.addColorStop(1,'rgba(210,250,255,0)');
    ctx.globalAlpha=1; ctx.fillStyle=band; ctx.fillRect(-40,sy-6,w+80,80*z+6);
    ctx.restore();
    ctx.strokeStyle='rgba(235,253,255,.8)'; ctx.lineWidth=Math.max(1.2,2.2*z);
    ctx.beginPath(); for(let i=0;i<pts.length;i+=2)i?ctx.lineTo(pts[i],pts[i+1]):ctx.moveTo(pts[i],pts[i+1]); ctx.stroke();
    ctx.strokeStyle='rgba(160,235,250,.28)'; ctx.lineWidth=1;
    for(let r=1;r<=3;r++){
      ctx.beginPath();
      for(let x=-40;x<=w+40;x+=18){ const X=cam.x+(x-w/2)/z, y=sy+(r*11+Math.sin(X*.03+t*1.1+r*2)*2.5)*z; x===-40?ctx.moveTo(x,y):ctx.lineTo(x,y); }
      ctx.stroke();
    }
  }
  function drawSnow(list,f,near){
    const w=state.width, h=state.height, cam=state.camera, z=cam.zoom, t=state.time;
    const W=w+80, Hh=h+80, depthVis=.35+.65*clamp(cam.y/CONFIG.worldHeight,0,1);
    const surfaceY=(0-cam.y)*z+h/2;
    ctx.save(); if(near)ctx.globalCompositeOperation='lighter';
    for(const p of list){
      const x=mod(p.x*W-cam.x*z*f+t*p.vx,W)-40, y=mod(p.y*Hh-cam.y*z*f+t*p.vy,Hh)-40;
      if(y<surfaceY+6)continue;
      ctx.globalAlpha=p.a*depthVis*(.7+.3*Math.sin(t*1.3+p.tw))*(near?1:.8);
      const r=p.r*(near?1.6:1.2);
      ctx.drawImage(SPR.dot,x-r,y-r,r*2,r*2);
    }
    ctx.restore();
  }
  // Seabed: world-anchored sand contour plus hashed decorations every 130 units.
  function drawSeabed(v){
    const w=state.width, h=state.height, cam=state.camera, z=cam.zoom, t=state.time, H=CONFIG.worldHeight;
    if((H-560-cam.y)*z+h/2>h+20)return;
    const toSY=Y=>(Y-cam.y)*z+h/2;
    const pts=[];
    for(let x=-40;x<=w+40;x+=14){ const X=cam.x+(x-w/2)/z; pts.push(x,toSY(groundY(X))); }
    const gy0=toSY(H-110);
    const sand=ctx.createLinearGradient(0,gy0,0,gy0+240*z);
    sand.addColorStop(0,'#35544f'); sand.addColorStop(.35,'#1c3335'); sand.addColorStop(1,'#0a171c');
    ctx.fillStyle=sand; ctx.beginPath(); ctx.moveTo(-40,h+40);
    for(let i=0;i<pts.length;i+=2)ctx.lineTo(pts[i],pts[i+1]);
    ctx.lineTo(w+40,h+40); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(150,215,200,.28)'; ctx.lineWidth=Math.max(1,2*z);
    ctx.beginPath(); for(let i=0;i<pts.length;i+=2)i?ctx.lineTo(pts[i],pts[i+1]):ctx.moveTo(pts[i],pts[i+1]); ctx.stroke();
    ctx.strokeStyle='rgba(130,190,180,.10)'; ctx.lineWidth=Math.max(.8,1.2*z);
    for(const off of [18,40,68,100]){
      ctx.beginPath();
      for(let i=0;i<pts.length;i+=2){ const X=cam.x+(pts[i]-w/2)/z; const y=pts[i+1]+(off+Math.sin(X*.035+off)*3)*z; i?ctx.lineTo(pts[i],y):ctx.moveTo(pts[i],y); }
      ctx.stroke();
    }
    // Decorations.
    const sp=130, k0=Math.floor((v.left-200)/sp), k1=Math.ceil((v.right+200)/sp);
    ctx.lineCap='round'; ctx.lineJoin='round';
    const glows=[];
    for(let k=k0;k<=k1;k++){
      const X=k*sp+hash1(k*2.1)*90, type=Math.floor(hash1(k*4.3)*8);
      const x=(X-cam.x)*z+w/2, y=toSY(groundY(X))+3*z, s=z*(.7+hash1(k*9.1)*.8);
      if(s<.06)continue;
      const sway=Math.sin(t*1.1+k*1.7);
      if(type<=1){ // seagrass tuft
        ctx.strokeStyle=type?'#2f7a5f':'#3d8a57'; ctx.lineWidth=Math.max(1,3.2*s);
        for(let i=0;i<6;i++){
          const bx=x+(i-2.5)*5*s, hh=(45+hash1(k*11+i)*70)*s, bend=(sway*10+Math.sin(t*1.6+i)*5)*s;
          ctx.beginPath(); ctx.moveTo(bx,y); ctx.quadraticCurveTo(bx+bend*.3,y-hh*.55,bx+bend,y-hh); ctx.stroke();
        }
      }else if(type===2){ // branching coral
        ctx.strokeStyle=hash1(k*5.5)<.5?'#c9566f':'#e07a4f';
        const branch=(bx,by,ang,len,depth)=>{
          const ex=bx+Math.cos(ang)*len, ey=by+Math.sin(ang)*len;
          ctx.lineWidth=Math.max(1,(depth+1)*2.4*s); ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(ex,ey); ctx.stroke();
          if(depth>0){ branch(ex,ey,ang-.45-hash1(k+depth)*.2,len*.72,depth-1); branch(ex,ey,ang+.4+hash1(k*2+depth)*.2,len*.68,depth-1); }
          else glows.push([ex,ey,s*.6,'coral']);
        };
        branch(x,y,-Math.PI/2+sway*.03,34*s,3);
      }else if(type===3){ // rocks
        ctx.fillStyle='#22363f';
        ctx.beginPath(); ctx.ellipse(x,y-8*s,34*s,22*s,0,Math.PI,0); ctx.fill();
        ctx.fillStyle='#2c4550'; ctx.beginPath(); ctx.ellipse(x+26*s,y-4*s,18*s,12*s,0,Math.PI,0); ctx.fill();
        ctx.strokeStyle='rgba(170,220,230,.16)'; ctx.lineWidth=Math.max(1,2*s);
        ctx.beginPath(); ctx.ellipse(x,y-8*s,30*s,18*s,0,Math.PI*1.1,Math.PI*1.6); ctx.stroke();
      }else if(type===4){ // anemone
        ctx.fillStyle='#6b2f5c'; ctx.beginPath(); ctx.ellipse(x,y-6*s,12*s,9*s,0,Math.PI,0); ctx.fill();
        ctx.strokeStyle='#b85a9b'; ctx.lineWidth=Math.max(1,2.6*s);
        for(let i=0;i<9;i++){
          const a=-Math.PI*.92+i*(Math.PI*.84/8), len=(20+hash1(k*13+i)*10)*s, wv=Math.sin(t*2.2+i*.9+k)*5*s;
          const ex=x+Math.cos(a)*len+wv, ey=y-8*s+Math.sin(a)*len;
          ctx.beginPath(); ctx.moveTo(x+Math.cos(a)*8*s,y-8*s+Math.sin(a)*6*s); ctx.quadraticCurveTo(x+Math.cos(a)*len*.6-wv,y-8*s+Math.sin(a)*len*.6,ex,ey); ctx.stroke();
          glows.push([ex,ey,s*.45,'pink']);
        }
      }else if(type===5){ // tall kelp with leaves
        const hh=(230+hash1(k*6.6)*220)*s;
        ctx.strokeStyle='#2c6a45'; ctx.fillStyle='#347a4c'; ctx.lineWidth=Math.max(1,5*s);
        const pt=u=>[x+Math.sin(u*2.4+t*.9+k)*u*18*s, y-hh*u];
        ctx.beginPath(); ctx.moveTo(x,y);
        for(let u=.1;u<=1.001;u+=.1){ const [px,py]=pt(u); ctx.lineTo(px,py); }
        ctx.stroke();
        for(let u=.2;u<.95;u+=.15){
          const [px,py]=pt(u), side=(Math.round(u*20)%2?1:-1);
          ctx.beginPath(); ctx.ellipse(px+side*9*s,py,11*s,4*s,side*.5+sway*.1,0,Math.PI*2); ctx.fill();
        }
      }else if(type===6){ // sea fan
        ctx.strokeStyle='rgba(222,140,84,.85)'; ctx.lineWidth=Math.max(.8,1.6*s);
        const R=40*s;
        for(let i=0;i<=8;i++){ const a=-Math.PI+.25+i*(Math.PI-.5)/8+sway*.03; ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+Math.cos(a)*R*.5,y+Math.sin(a)*R*.6,x+Math.cos(a)*R,y+Math.sin(a)*R); ctx.stroke(); }
        for(let r=1;r<=3;r++){ ctx.beginPath(); ctx.arc(x,y,R*r/3.4,-Math.PI+.3,-.3); ctx.stroke(); }
      }else{ // starfish & shell
        ctx.fillStyle=hash1(k*8.8)<.5?'#d27a3e':'#c7a07a';
        ctx.beginPath();
        for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=(i%2?4:10)*s; ctx.lineTo(x+Math.cos(a)*r,y-6*s+Math.sin(a)*r); }
        ctx.closePath(); ctx.fill();
      }
    }
    // Bioluminescent tips pulse softly in the dark.
    if(glows.length){
      ctx.save(); ctx.globalCompositeOperation='lighter';
      for(let i=0;i<glows.length;i++){
        const [gx,gy,gs,kind]=glows[i], r=Math.max(2,9*gs);
        ctx.globalAlpha=.25+.2*Math.sin(t*2+i*1.3);
        ctx.drawImage(kind==='pink'?SPR.glowRed:SPR.glowCyan,gx-r,gy-r,r*2,r*2);
      }
      ctx.restore();
    }
  }
  function drawBubbles(){
    const cam=state.camera, z=cam.zoom, w=state.width, h=state.height;
    ctx.lineWidth=Math.max(.7,z);
    for(const b of state.bubbles){
      const x=(b.x-cam.x)*z+w/2, y=(b.y-cam.y)*z+h/2, r=Math.max(1,b.r*z);
      if(x<-15||x>w+15||y<-15||y>h+15)continue;
      ctx.strokeStyle=`rgba(190,245,255,${b.alpha})`;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
      if(r>2.2){ ctx.fillStyle=`rgba(255,255,255,${b.alpha*.8})`; ctx.beginPath(); ctx.arc(x-r*.35,y-r*.35,r*.28,0,Math.PI*2); ctx.fill(); }
    }
  }

  // ---------- rendering: sinh vật ----------
  function drawGlow(sprite,x,y,r,a,additive){
    ctx.save(); ctx.globalAlpha=a; if(additive)ctx.globalCompositeOperation='lighter';
    ctx.drawImage(sprite,x-r,y-r,r*2,r*2); ctx.restore();
  }
  function speciesImg(f){ return f.sp==='puffer'&&f.puff>0?'puffer_inf':f.sp; }
  function drawEntity(f,x,y,s){
    if(f.role==='jelly'){ FA.drawJelly(ctx,x,y,s,{phase:f.phase,hue:f.hue,alpha:.94}); return; }
    const sp=SP[f.sp], ratio=clamp(f.speed/(speedBase(f.size)*sp.speed),0,1.6);
    FA.drawFish(ctx,speciesImg(f),x,y,s,{angle:drawAngle(f),flip:f.flip,phase:f.phase,amp:.02+.045*ratio,dpr:state.dpr,chomp:f.chomp});
  }
  function drawEntities(){
    const cam=state.camera, z=cam.zoom, w=state.width, h=state.height, p=livePlayer();
    const pulse=.5+.5*Math.sin(state.time*7);
    // cá nhỏ vẽ trước để cá lớn đè lên tự nhiên
    state.entities.sort((a,b)=>a.size-b.size);
    for(const f of state.entities){
      const x=(f.x-cam.x)*z+w/2, y=(f.y-cam.y)*z+h/2, s=f.size*z, m=Math.max(s*1.1,30);
      if(x<-m||x>w+m||y<-m||y>h+m)continue;
      if(s<1.6)continue;
      const sp=SP[f.sp];
      if(p && isHunter(f) && f.size>=p.size*CONFIG.dangerRatio){
        // kẻ săn có thể nuốt người chơi mang quầng đỏ, đang rượt thì nhấp nháy
        const gw=Math.max(34,s*1.5), gh=Math.max(26,s*sp.aspect*2.6);
        ctx.save(); ctx.translate(x,y); ctx.rotate(drawAngle(f));
        ctx.globalAlpha=f.hunting?.34+.3*pulse:.26;
        ctx.drawImage(SPR.glowRed,-gw/2,-gh/2,gw,gh);
        ctx.restore();
      }else if(p && f.role!=='jelly' && f.size*CONFIG.eatRatio<=p.size && !(f.puff>0&&p.size<f.size*1.9)){
        const gw=Math.max(24,s*1.25), gh=Math.max(18,s*sp.aspect*2.1);
        ctx.save(); ctx.translate(x,y); ctx.rotate(drawAngle(f));
        ctx.globalAlpha=.11; ctx.globalCompositeOperation='lighter';
        ctx.drawImage(SPR.glowGreen,-gw/2,-gh/2,gw,gh);
        ctx.restore();
      }
      drawEntity(f,x,y,s);
    }
  }
  function drawPlayer(){
    const p=state.player; if(!p)return;
    const cam=state.camera, z=cam.zoom, x=(p.x-cam.x)*z+state.width/2, y=(p.y-cam.y)*z+state.height/2, s=p.size*z;
    const fade=p.dead?clamp(state.dying/1.3,0,1):1;
    const depth=depthFactor(p.y);
    drawGlow(SPR.glowCyan,x,y,s*1.5,(.16+depth*.34)*fade,true);
    const dashing=state.clock<state.dash.until;
    if(dashing)drawGlow(SPR.glowGold,x,y,s*1.3,.35,true);
    const inv=!p.dead && state.clock<state.invulnUntil;
    ctx.save();
    ctx.globalAlpha=fade*(inv?.55+.45*Math.abs(Math.sin(state.time*9)):1);
    const ratio=clamp(p.speed/(speedBase(p.size)*1.1),0,1.6);
    FA.drawFish(ctx,'hero',x,y,s,{angle:drawAngle(p),flip:p.flip,phase:p.phase,amp:.02+.05*ratio,dpr:state.dpr});
    ctx.restore();
    if(p.stun>0){ drawGlow(SPR.glowRed,x,y,s*1.2,.3,true); }
    if(inv){
      const left=(state.invulnUntil-state.clock)/CONFIG.initialInvuln;
      ctx.save();
      ctx.strokeStyle=`rgba(170,245,255,${.25+.35*left})`; ctx.lineWidth=2;
      ctx.fillStyle=`rgba(170,245,255,${.06*left})`;
      ctx.beginPath(); ctx.arc(x,y,Math.max(24,s*.9),0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }
  function drawParticles(){
    const cam=state.camera, z=cam.zoom, w=state.width, h=state.height;
    for(const q of state.particles){
      const x=(q.x-cam.x)*z+w/2, y=(q.y-cam.y)*z+h/2, a=Math.max(0,q.life/q.max);
      if(q.kind==='ring'){
        ctx.globalAlpha=a; ctx.strokeStyle=`rgba(${q.color},1)`; ctx.lineWidth=Math.max(1.5,4*a);
        ctx.beginPath(); ctx.arc(x,y,q.r*z,0,Math.PI*2); ctx.stroke();
      }else if(q.kind==='bubble'){
        const r=Math.max(1,q.r*z);
        ctx.globalAlpha=Math.min(1,a*1.4)*.8; ctx.strokeStyle='rgba(210,248,255,1)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
      }else{
        ctx.globalAlpha=a; ctx.fillStyle=q.color;
        ctx.beginPath(); ctx.arc(x,y,Math.max(1,q.r*z),0,Math.PI*2); ctx.fill();
      }
    }
    ctx.globalAlpha=1;
  }
  function drawTexts(){
    const cam=state.camera, z=cam.zoom, w=state.width, h=state.height;
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round';
    for(const t of state.texts){
      const x=(t.x-cam.x)*z+w/2, y=(t.y-cam.y)*z+h/2-t.rise;
      const a=clamp(t.life/t.max*1.6,0,1), sc=1+Math.max(0,t.life-.8)*1.5;
      ctx.globalAlpha=a;
      ctx.font=`900 ${Math.round(t.size*sc)}px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif`;
      ctx.lineWidth=4; ctx.strokeStyle='rgba(2,20,30,.65)'; ctx.strokeText(t.text,x,y);
      ctx.fillStyle=t.color; ctx.fillText(t.text,x,y);
    }
    ctx.restore();
  }

  // ---------- rendering: lớp phủ màn hình ----------
  function drawDangerArrows(){
    const p=livePlayer(); if(!p)return;
    const w=state.width, h=state.height, cam=state.camera, z=cam.zoom, pad=34, padTop=72;
    const pulse=.5+.5*Math.sin(state.time*8), list=[];
    for(const f of state.entities){
      if(!isHunter(f)||f.size<p.size*CONFIG.dangerRatio)continue;
      const range=f.hunting?CONFIG.dangerArrowRange:CONFIG.dangerArrowNear;
      const d=Math.hypot(f.x-p.x,f.y-p.y); if(d>range)continue;
      const sx=(f.x-cam.x)*z+w/2, sy=(f.y-cam.y)*z+h/2, m=f.size*z*.6;
      if(sx>-m&&sx<w+m&&sy>-m&&sy<h+m)continue;
      list.push({f,d,range,sx,sy});
    }
    list.sort((a,b)=>a.d/a.range-b.d/b.range);
    for(const {f,d,range,sx,sy} of list.slice(0,4)){
      const ang=Math.atan2(sy-h/2,sx-w/2), c=Math.cos(ang), s=Math.sin(ang);
      const tx=c>0?(w/2-pad)/c:c<0?(pad-w/2)/c:Infinity, ty=s>0?(h/2-pad)/s:s<0?(padTop-h/2)/s:Infinity;
      const t=Math.min(tx,ty);
      const ax=w/2+c*t, ay=h/2+s*t, near=1-d/range, size=9+8*near;
      ctx.save(); ctx.translate(ax,ay); ctx.rotate(ang);
      ctx.globalAlpha=(.3+.7*near)*(f.hunting?.75+.25*pulse:1);
      ctx.fillStyle='#ff5068'; ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(size,0); ctx.lineTo(-size*.7,size*.8); ctx.lineTo(-size*.35,0); ctx.lineTo(-size*.7,-size*.8); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  function drawJoystick(){
    const st=state.input.stick; if(!st||state.mode!=='playing')return;
    const R=CONFIG.stickRadius, dx=st.x-st.ox, dy=st.y-st.oy, d=Math.hypot(dx,dy), k=d>R?R/d:1;
    ctx.save();
    ctx.fillStyle='rgba(180,240,255,.07)'; ctx.strokeStyle='rgba(200,245,255,.28)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(st.ox,st.oy,R,0,Math.PI*2); ctx.fill(); ctx.stroke();
    const g=ctx.createRadialGradient(st.ox+dx*k-6,st.oy+dy*k-6,2,st.ox+dx*k,st.oy+dy*k,26);
    g.addColorStop(0,'rgba(220,252,255,.75)'); g.addColorStop(1,'rgba(84,228,255,.35)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(st.ox+dx*k,st.oy+dy*k,24,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function drawMinimap(){
    const m=state.mm; if(!m)return;
    const c=mmCtx, W=m.w, H=m.h, sx=W/CONFIG.worldWidth, sy=H/CONFIG.worldHeight;
    c.setTransform(1,0,0,1,0,0); c.drawImage(m.bg,0,0); c.setTransform(m.dpr,0,0,m.dpr,0,0);
    const v=viewRect();
    c.strokeStyle='rgba(255,255,255,.5)'; c.lineWidth=1;
    const l=clamp(v.left*sx,0,W), r=clamp(v.right*sx,0,W), t=clamp(v.top*sy,0,H), b=clamp(v.bottom*sy,0,H);
    c.strokeRect(l+.5,t+.5,Math.max(2,r-l-1),Math.max(2,b-t-1));
    const p=livePlayer();
    for(const f of state.entities){
      const danger=p && isHunter(f) && f.size>=p.size*CONFIG.dangerRatio, edible=p && f.role!=='jelly' && f.size*CONFIG.eatRatio<=p.size;
      c.fillStyle=danger?'#ff5068':edible?'rgba(150,255,200,.8)':'rgba(255,255,255,.45)';
      const rr=danger?2:1.2; c.fillRect(f.x*sx-rr/2,f.y*sy-rr/2,rr,rr);
    }
    if(state.player){
      const px=state.player.x*sx, py=state.player.y*sy;
      c.fillStyle='#6ff0ff'; c.strokeStyle='#fff'; c.lineWidth=1.2;
      c.beginPath(); c.arc(px,py,3.2,0,Math.PI*2); c.fill(); c.stroke();
    }
  }
  function render(){
    const w=state.width, h=state.height, dpr=state.dpr;
    const sh=state.shake>.2?state.shake:0;
    state.shakeX=sh?(Math.random()*2-1)*sh:0; state.shakeY=sh?(Math.random()*2-1)*sh:0;
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
    ctx.translate(state.shakeX,state.shakeY);
    const v=viewRect();
    drawWater(v);
    drawFarLayers();
    drawSnow(state.snowFar,.35,false);
    drawLightRays(v);
    drawCaustics();
    drawSkyAndSurface();
    drawSeabed(v);
    drawBubbles();
    drawEntities();
    drawPlayer();
    drawParticles();
    drawTexts();
    drawSnow(state.snowNear,1.25,true);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const depth=clamp(state.camera.y/CONFIG.worldHeight,0,1);
    ctx.globalAlpha=.42+depth*.4; ctx.drawImage(state.vignette,0,0,w,h);
    if(state.danger>.02){ ctx.globalAlpha=state.danger*(.22+.12*Math.sin(state.time*9)); ctx.drawImage(state.vignetteRed,0,0,w,h); }
    ctx.globalAlpha=1;
    if(state.flash>0){ ctx.fillStyle=`rgba(255,70,90,${state.flash*.32})`; ctx.fillRect(0,0,w,h); }
    drawDangerArrows();
    drawJoystick();
  }

  // ---------- HUD ----------
  function setHud(key,val,fn){ if(state.hud[key]!==val){ state.hud[key]=val; fn(val); } }
  function updateHud(){
    const p=state.player; if(!p)return;
    setHud('score',fmtNum(state.score),v=>ui.score.textContent=v);
    setHud('best',fmtNum(Math.max(state.best,state.score)),v=>ui.best.textContent=v);
    setHud('level',`Cấp ${state.level} · ${(p.size/CONFIG.startSize).toFixed(1)}×`,v=>ui.level.textContent=v);
    setHud('levelBar',(()=>{ const q=Math.log(Math.max(1,p.size/CONFIG.startSize))/Math.log(CONFIG.levelStep); return (q-Math.floor(q+1e-9)).toFixed(3); })(),v=>ui.levelBar.style.transform=`scaleX(${v})`);
    const comboOn=state.combo.n>=2 && state.clock<state.combo.until;
    setHud('comboOn',comboOn,v=>ui.combo.classList.toggle('on',v));
    if(comboOn){
      const mult=Math.min(CONFIG.comboMax,1+Math.floor((state.combo.n-1)/2));
      setHud('comboText',`COMBO ${state.combo.n} · ×${mult}`,v=>ui.comboText.textContent=v);
      setHud('comboBar',((state.combo.until-state.clock)/CONFIG.comboWindow).toFixed(2),v=>ui.comboBar.style.transform=`scaleX(${v})`);
    }
    const cd=clamp((state.dash.readyAt-state.clock)/CONFIG.dashCooldown,0,1);
    setHud('dash',cd.toFixed(2),v=>{ ui.dash.style.setProperty('--cd',v); ui.dash.classList.toggle('ready',+v===0); });
  }

  // ---------- audio ----------
  let audioCtx=null, master=null, ambient=null;
  function unlockAudio(){
    if(!audioCtx){
      try{
        audioCtx=new (window.AudioContext||window.webkitAudioContext)();
        master=audioCtx.createGain(); master.gain.value=state.muted?0:1; master.connect(audioCtx.destination);
      }catch(_){ audioCtx=null; }
    }
    if(audioCtx && audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});
    return audioCtx;
  }
  function tone(freq,dur,type='sine',gain=.03,slideTo=0,delay=0){
    if(!audioCtx||state.muted)return;
    try{
      const t=audioCtx.currentTime+delay, o=audioCtx.createOscillator(), g=audioCtx.createGain();
      o.type=type; o.frequency.setValueAtTime(freq,t);
      if(slideTo)o.frequency.exponentialRampToValueAtTime(slideTo,t+dur);
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+.012); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+.03);
    }catch(_){ /* sound is optional */ }
  }
  // Soft underwater rumble: looped brown noise through a slowly breathing low-pass filter.
  function startAmbient(){
    if(ambient||!audioCtx)return;
    try{
      const a=audioCtx, len=a.sampleRate*4, buf=a.createBuffer(1,len,a.sampleRate), d=buf.getChannelData(0);
      let last=0; for(let i=0;i<len;i++){ last=(last+.02*(Math.random()*2-1))/1.02; d[i]=last*3.2; }
      const drift=d[len-1]-d[0]; for(let i=0;i<len;i++)d[i]-=drift*i/len;
      const src=a.createBufferSource(); src.buffer=buf; src.loop=true;
      const lp=a.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=420; lp.Q.value=.6;
      const lfo=a.createOscillator(), lfoGain=a.createGain(); lfo.frequency.value=.08; lfoGain.gain.value=160;
      lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
      const g=a.createGain(); g.gain.setValueAtTime(0,a.currentTime); g.gain.linearRampToValueAtTime(.09,a.currentTime+2.5);
      src.connect(lp); lp.connect(g); g.connect(master); src.start(); lfo.start();
      ambient={src,g};
    }catch(_){ /* ambience is optional */ }
  }
  function toggleMute(){
    state.muted=!state.muted; store.set('fish-muted',state.muted?'1':'0');
    ui.mute.classList.toggle('on',state.muted); ui.mute.setAttribute('aria-label',state.muted?'Bật âm thanh':'Tắt âm thanh');
    if(master&&audioCtx)master.gain.setTargetAtTime(state.muted?0:1,audioCtx.currentTime,.05);
    if(!state.muted){ unlockAudio(); startAmbient(); }
  }

  // ---------- fullscreen & screen wake ----------
  const docEl=document.documentElement;
  const FS_ENABLED=!!(document.fullscreenEnabled||document.webkitFullscreenEnabled) && !!(docEl.requestFullscreen||docEl.webkitRequestFullscreen);
  const isFs=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
  function enterFs(){
    if(!FS_ENABLED||isFs())return;
    try{ const r=(docEl.requestFullscreen||docEl.webkitRequestFullscreen).call(docEl,{navigationUI:'hide'}); r?.catch?.(()=>{}); }catch(_){ /* denied */ }
  }
  function exitFs(){
    if(!isFs())return;
    try{ const r=(document.exitFullscreen||document.webkitExitFullscreen).call(document); r?.catch?.(()=>{}); }catch(_){ /* ignore */ }
  }
  function toggleFs(){ isFs()?exitFs():enterFs(); }
  function syncFs(){ const on=isFs(); ui.fs.classList.toggle('on',on); ui.fs.setAttribute('aria-label',on?'Thoát toàn màn hình':'Toàn màn hình'); }
  document.addEventListener('fullscreenchange',syncFs); document.addEventListener('webkitfullscreenchange',syncFs);
  if(!FS_ENABLED)ui.fs.classList.add('hidden');
  let wakeLock=null;
  async function keepAwake(on){
    try{
      if(on && !wakeLock && navigator.wakeLock){ wakeLock=await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release',()=>{wakeLock=null;}); }
      else if(!on && wakeLock){ const l=wakeLock; wakeLock=null; await l.release(); }
    }catch(_){ wakeLock=null; }
  }

  // ---------- event wiring ----------
  const MOVE_KEYS=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];
  addEventListener('keydown',e=>{
    const k=e.key.length===1?e.key.toLowerCase():e.key;
    const onControl=e.target instanceof Element && e.target.closest('button,input');
    unlockAudio();
    if(MOVE_KEYS.includes(k)){ e.preventDefault(); state.keys.add(k); state.input.mouse=false; return; }
    if(e.repeat)return;
    if(k===' '||k==='Shift'){ if(onControl&&k===' ')return; e.preventDefault(); tryDash(); return; }
    if(k==='p'||k==='Escape'){ if(state.mode==='playing'||state.mode==='paused'){ e.preventDefault(); togglePause(); } return; }
    if(k==='f'){ toggleFs(); return; }
    if(k==='m'){ toggleMute(); return; }
    if((k==='Enter'||k==='r') && !onControl){
      if(state.mode==='menu'||state.mode==='gameover'){ e.preventDefault(); begin.prevBest=state.best; begin(); }
      else if(state.mode==='paused' && k==='Enter')togglePause();
    }
  },{passive:false});
  addEventListener('keyup',e=>{ const k=e.key.length===1?e.key.toLowerCase():e.key; state.keys.delete(k); },{passive:true});
  addEventListener('blur',()=>{ state.keys.clear(); state.input.stick=null; });
  function localPoint(e){ const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left, y:e.clientY-r.top}; }
  canvas.addEventListener('pointerdown',e=>{
    unlockAudio();
    const pt=localPoint(e);
    if(e.pointerType==='mouse'){ state.input.mx=pt.x; state.input.my=pt.y; state.input.mouse=true; return; }
    if(state.mode!=='playing')return;
    if(!state.input.stick){
      state.input.stick={id:e.pointerId, ox:pt.x, oy:pt.y, x:pt.x, y:pt.y};
      canvas.setPointerCapture?.(e.pointerId);
    }else tryDash();
  },{passive:true});
  canvas.addEventListener('pointermove',e=>{
    const pt=localPoint(e);
    if(e.pointerType==='mouse'){ state.input.mx=pt.x; state.input.my=pt.y; if(state.mode==='playing')state.input.mouse=true; return; }
    const st=state.input.stick;
    if(st && st.id===e.pointerId){
      st.x=pt.x; st.y=pt.y;
      // Floating stick: drag the base along when the thumb overshoots.
      const dx=st.x-st.ox, dy=st.y-st.oy, d=Math.hypot(dx,dy), maxD=CONFIG.stickRadius*1.25;
      if(d>maxD){ st.ox+=dx/d*(d-maxD); st.oy+=dy/d*(d-maxD); }
    }
  },{passive:true});
  const endPointer=e=>{ const st=state.input.stick; if(st && st.id===e.pointerId)state.input.stick=null; };
  canvas.addEventListener('pointerup',endPointer,{passive:true});
  canvas.addEventListener('pointercancel',endPointer,{passive:true});
  canvas.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse')state.input.mouse=false; },{passive:true});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const tap=(el,fn)=>el.addEventListener('click',e=>{ e.currentTarget.blur(); unlockAudio(); fn(); });
  tap(ui.playBtn,()=>{ begin.prevBest=state.best; begin(); });
  tap(ui.primary,()=>{ if(ui.menu.dataset.kind==='pause')togglePause(); else { begin.prevBest=state.best; begin(); } });
  tap(ui.secondary,()=>{ begin.prevBest=state.best; begin(); });
  tap(ui.pause,togglePause);
  tap(ui.fs,toggleFs);
  tap(ui.mute,toggleMute);
  ui.dash.addEventListener('pointerdown',e=>{ e.preventDefault(); unlockAudio(); tryDash(); });
  ui.dash.addEventListener('click',e=>e.currentTarget.blur());
  const autoFsBoxes=[...document.querySelectorAll('.autofs')];
  for(const box of autoFsBoxes){
    box.checked=state.autoFs;
    box.addEventListener('change',()=>{
      state.autoFs=box.checked; store.set('fish-autofs',state.autoFs?'1':'0');
      for(const other of autoFsBoxes)other.checked=state.autoFs;
      if(state.autoFs)enterFs();
    });
  }
  ui.mute.classList.toggle('on',state.muted);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){ if(state.mode==='playing')togglePause(); audioCtx?.suspend?.().catch(()=>{}); }
    else audioCtx?.resume?.().catch(()=>{});
  });

  // ---------- boot ----------
  resize();
  setTimeout(()=>{
    const tile=makeCausticTile();
    caustic.pattern=caustic.bctx.createPattern(tile,'repeat');
    state.mode='menu'; initAttract(); drawHowtoIcons(); showCard('menu');
    ui.loading.classList.add('fade'); setTimeout(()=>ui.loading.classList.add('hidden'),500);
    startLoop();
  },60);
  // Chỉ để kiểm thử tự động
  window.__fish={state,CONFIG,SP,spawnOne,makeFish,levelOf,isHunter,speedBase,
    step(dt){ state.time+=dt; state.clock+=dt*1000; if(state.mode==='playing')updatePlaying(dt); else if(state.mode==='dying'){ updateDying(dt); state.dying-=dt; if(state.dying<=0)showGameOver(); } updateParticles(dt); state.shake*=Math.exp(-dt*9); state.flash=Math.max(0,state.flash-dt*1.6); },
    begin, worldToScreen, livePlayer, capsule};
})();
