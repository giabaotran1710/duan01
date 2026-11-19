/* =========================================================
   BIDA PHĂNG (carom tự do, 3 bi) — bàn không lỗ, luật, vật lý.
   Nạp sau script chính của bida.html, dùng chung các hàm vật lý (clothStep, resolveBallContacts, bounceOffPlane...).

   Luật (theo cách chơi phăng/libre phổ biến):
   - 3 bi: trắng (PLAYER), vàng (AI.GiaBao), đỏ. Mỗi người đánh bi cái của mình; hai bi còn lại là bi mục tiêu.
   - Bi cái chạm được cả hai bi mục tiêu (thứ tự nào cũng được, có thể chạm băng trước) ⇒ 1 điểm và đánh tiếp.
     Không chạm đủ hai bi ⇒ mất lượt.
   - Khai cuộc: bi đỏ ở chấm cuối bàn, bi đối thủ ở chấm đầu bàn, bi người khai cuộc trên vạch đầu bàn cách 18,25 cm.
     Cú khai cuộc phải chạm bi đỏ trước, nếu không là phạm lỗi (mất lượt, không tính điểm).
   - Vùng góc (4 tam giác ở góc bàn): sau một điểm mà hai bi mục tiêu cùng nằm trong một vùng góc,
     điểm kế tiếp phải làm ít nhất một bi mục tiêu ra khỏi vùng đó (ra rồi quay lại vẫn được), nếu không là phạm lỗi.
   - Bi cái dính sát bi khác khi tới lượt: xếp lại bi như khai cuộc.
   - Ai đạt CAROM.TARGET điểm trước thì thắng.
   ========================================================= */

const CAROM = {
  TARGET: 10,
  YELLOW: 20,
  RED: 21,
  // 1 kim cương trên băng ngắn (1/4 bề rộng mặt chơi) ≈ 35,5 cm
  ZONE_LEG: (table.h - 2 * CUSHION_THICKNESS) / 4,
  // 18,25 cm trên bàn dài 284 cm
  SPOT_OFFSET: PLAY_LEN * 18.25 / 284,
  COLORS: { 0: "#f4f1e6", 20: "#f2c230", 21: "#d3241c" }
};

ballColors[CAROM.YELLOW] = CAROM.COLORS[20];
ballColors[CAROM.RED] = CAROM.COLORS[21];

let caromScore = { player: 0, ai: 0 };
let caromRun = 0;            // số điểm liên tiếp của người đang đánh
let caromOpening = false;    // cú khai cuộc: phải chạm bi đỏ trước
let caromZoneLock = -1;      // ≥ 0: điểm kế tiếp phải đưa một bi mục tiêu ra khỏi vùng góc này
let caromAccum = 0;          // thời gian (khung 60 Hz) chưa mô phỏng
let caromShot = null;        // cú đánh đang chạy trên bàn
let whiteBall = null;
let yellowBall = null;
let redBall = null;

/* ---------- hình học ---------- */

function caromBounds(){
  return {
    left: table.x + CUSHION_THICKNESS + BALL_R,
    right: table.x + table.w - CUSHION_THICKNESS - BALL_R,
    top: table.y + CUSHION_THICKNESS + BALL_R,
    bottom: table.y + table.h - CUSHION_THICKNESS - BALL_R
  };
}

// Góc mặt chơi (mũi băng) và hướng vào lòng bàn
function caromCorners(){
  const c = CUSHION_THICKNESS;
  return [
    { x: table.x + c, y: table.y + c, sx: 1, sy: 1 },
    { x: table.x + table.w - c, y: table.y + c, sx: -1, sy: 1 },
    { x: table.x + c, y: table.y + table.h - c, sx: 1, sy: -1 },
    { x: table.x + table.w - c, y: table.y + table.h - c, sx: -1, sy: -1 }
  ];
}

const CAROM_CORNERS = caromCorners();

// Tâm bi nằm trong tam giác góc nào (−1: không)
function caromZoneOf(x, y){
  for(let i = 0; i < 4; i++){
    const k = CAROM_CORNERS[i];
    const dx = (x - k.x) * k.sx;
    const dy = (y - k.y) * k.sy;

    if(dx >= 0 && dy >= 0 && dx + dy <= CAROM.ZONE_LEG) return i;
  }
  return -1;
}

// Hai bi mục tiêu cùng nằm trong một vùng góc ⇒ chỉ số vùng, ngược lại −1
function caromPairZone(a, b){
  const z = caromZoneOf(a.x, a.y);
  return z >= 0 && z === caromZoneOf(b.x, b.y) ? z : -1;
}

/* ---------- bi ---------- */

function caromBallOf(side){
  return side === "player" ? whiteBall : yellowBall;
}

function caromObjectBalls(side){
  const mine = caromBallOf(side);
  return balls.filter(b => b !== mine);
}

function makeCaromBall(x, y, num){
  const b = new Ball(x, y, num);
  if(num !== 0) b.type = "carom";
  return b;
}

// Vị trí khai cuộc: đỏ ở chấm cuối bàn, bi đối thủ ở chấm đầu bàn, bi người khai cuộc trên vạch đầu bàn lệch 18,25 cm
function caromSpotBalls(breaker){
  const cy = table.y + table.h / 2;
  const mine = caromBallOf(breaker);
  const other = caromBallOf(breaker === "player" ? "ai" : "player");

  for(const b of balls) stopBall(b);

  redBall.x = FOOT_SPOT_X;
  redBall.y = cy;
  other.x = HEAD_STRING_X;
  other.y = cy;
  mine.x = HEAD_STRING_X;
  mine.y = cy + CAROM.SPOT_OFFSET;
}

function rackCarom(breaker){
  whiteBall = makeCaromBall(0, 0, 0);
  yellowBall = makeCaromBall(0, 0, CAROM.YELLOW);
  redBall = makeCaromBall(0, 0, CAROM.RED);
  balls = [whiteBall, yellowBall, redBall];
  caromSpotBalls(breaker);
  cueBall = caromBallOf(breaker);
}

function caromReset(breaker){
  caromScore = { player: 0, ai: 0 };
  caromRun = 0;
  caromZoneLock = -1;
  caromAccum = 0;
  caromShot = null;
  caromOpening = true;
  rackCarom(breaker);
}

/* ---------- vật lý (bàn thật và AI dùng chung) ---------- */

// Băng liền 4 cạnh. Trả về số băng bi vừa chạm.
function caromRail(b, B){
  let n = 0;

  if(b.x < B.left && bounceOffPlane(b, 1, 0, B.left - b.x)) n++;
  if(b.x > B.right && bounceOffPlane(b, -1, 0, b.x - B.right)) n++;
  if(b.y < B.top && bounceOffPlane(b, 0, 1, B.top - b.y)) n++;
  if(b.y > B.bottom && bounceOffPlane(b, 0, -1, b.y - B.bottom)) n++;

  // Chốt an toàn (tốc độ cực lớn): không cho bi ra khỏi mặt chơi
  if(b.x < B.left - BALL_R) b.x = B.left;
  if(b.x > B.right + BALL_R) b.x = B.right;
  if(b.y < B.top - BALL_R) b.y = B.top;
  if(b.y > B.bottom + BALL_R) b.y = B.bottom;

  return n;
}

const CAROM_B = caromBounds();

/*
  Một bước dt (khung 60 Hz) cho cả bàn, giống hệt updatePhysics nhưng không có lỗ.
  ev (tuỳ chọn): { impact(a, b), rail(b, n), sub() } để ghi nhận sự kiện của cú đánh.
  visual: cập nhật hình bi lăn (chỉ bàn thật cần).
*/
function caromStep(list, dt, ev, visual){
  let maxSpeed = 0;

  for(const b of list){
    limitBallSpeed(b);
    const v = Math.hypot(b.vx, b.vy);
    const r = Math.hypot(b.rx || 0, b.ry || 0);
    if(v > maxSpeed) maxSpeed = v;
    if(r > maxSpeed) maxSpeed = r;
  }

  const steps = clamp(Math.ceil(maxSpeed * dt / (BALL_R * 0.22)), Math.max(1, Math.ceil(2 * dt)), 64);
  const h = dt / steps;
  const impact = ev ? ev.impact : null;

  for(let s = 0; s < steps; s++){
    for(const b of list){
      if(ballIsResting(b)) continue;

      clothStep(b, h);
      limitBallSpeed(b);

      if(visual){
        updateBallRollingVisual(b, b.rx * h, b.ry * h);
        b.faceRot += b.sz * h / BALL_R;
      }

      if(ballNearEdge(b)){
        const n = caromRail(b, CAROM_B);
        if(n && ev) ev.rail(b, n);
      }
    }

    resolveBallContacts(list, impact);

    for(const b of list){
      if(ballIsResting(b) || !ballNearEdge(b)) continue;

      const n = caromRail(b, CAROM_B);
      if(n && ev) ev.rail(b, n);
      limitBallSpeed(b);
    }

    if(ev && ev.sub) ev.sub();
  }

  // Bi gần như dừng thì dừng hẳn (giống stopTinyMotion của bàn thật) để mô phỏng kết thúc sớm
  for(const b of list){
    if(!ballIsResting(b) && !isBallMoving(b)) stopBall(b);
  }
}

/*
  Theo dõi một cú: bi cái chạm những bi nào (theo thứ tự), bi chạm đầu tiên, số băng bi cái chạm trước khi chạm bi thứ hai,
  và (nếu đang bị khoá vùng góc) bi mục tiêu đã ra khỏi vùng chưa.
*/
function caromTracker(cue, o1, o2, zoneLock){
  const t = {
    cue, o1, o2, zoneLock,
    first: null,
    hits: [],
    cushions: 0,
    cushionsBeforeSecond: -1,
    scored: false,
    leftZone: zoneLock < 0
  };

  t.ev = {
    impact(a, b){
      if(a !== cue && b !== cue) return;

      const o = a === cue ? b : a;
      if(!t.first) t.first = o;

      if(t.hits.indexOf(o) < 0){
        t.hits.push(o);

        if(t.hits.length === 2){
          t.scored = true;
          t.cushionsBeforeSecond = t.cushions;
        }
      }
    },
    rail(b, n){
      if(b === cue) t.cushions += n;
    },
    sub(){
      if(t.leftZone) return;
      if(caromZoneOf(o1.x, o1.y) !== zoneLock || caromZoneOf(o2.x, o2.y) !== zoneLock) t.leftZone = true;
    }
  };

  return t;
}

// Kết luận một cú theo luật
function caromJudge(t, opening, red){
  if(opening && t.first !== red){
    return { point: false, foul: true, reason: t.first ? "Khai cuộc phải chạm bi đỏ trước" : "Khai cuộc không chạm bi nào" };
  }

  if(!t.scored){
    return { point: false, foul: false, reason: t.hits.length ? "Chỉ chạm được 1 bi" : "Không chạm bi nào" };
  }

  if(!t.leftZone){
    return { point: false, foul: true, reason: "Hai bi mục tiêu chưa ra khỏi vùng góc" };
  }

  return { point: true, foul: false, reason: "" };
}

/* ---------- bàn thật ---------- */

// Mô phỏng bước cố định 1 khung: bàn thật chạy đúng như AI đã tính trước
function caromPhysicsTick(dt){
  if(!isMoving()){
    caromAccum = 0;
    return;
  }

  caromAccum += dt;
  let n = 0;

  while(caromAccum >= 0.85 && n < 4){
    caromStep(balls, 1, caromShot ? caromShot.ev : null, true);
    caromAccum -= 1;
    n++;
  }

  if(n === 4) caromAccum = 0;
}

function caromBeginShot(side){
  const mine = caromBallOf(side);
  const [o1, o2] = caromObjectBalls(side);

  caromShot = caromTracker(mine, o1, o2, caromZoneLock);
  caromShot.side = side;
  caromShot.opening = caromOpening;
  caromAccum = 0;
}

function caromFinishShot(){
  const t = caromShot;
  caromShot = null;
  currentShot = null;
  if(!t) return;

  const side = t.side;
  const res = caromJudge(t, t.opening, redBall);
  caromOpening = false;

  if(res.point){
    caromScore[side]++;
    caromRun++;
    showHitComboFx(caromRun);
    updateTargetBoard();

    if(caromScore[side] >= CAROM.TARGET){
      endGame(
        side === "player" ? "win" : "lose",
        (side === "player" ? "Bạn" : "AI.GiaBao") + " đạt " + CAROM.TARGET + " điểm trước · " + caromScore.player + " – " + caromScore.ai
      );
      return;
    }

    const [o1, o2] = caromObjectBalls(side);
    caromZoneLock = caromPairZone(o1, o2);

    setMessage(
      (side === "player" ? "+1 điểm · đánh tiếp" : "AI.GiaBao +1 điểm") +
      (caromZoneLock >= 0 ? " · 2 bi đang trong vùng góc: cú sau phải đưa 1 bi ra" : "")
    );

    caromStartTurn(side, false);
    return;
  }

  setMessage((res.foul ? "Phạm lỗi: " : "") + res.reason + " · " + (side === "player" ? "đến lượt AI.GiaBao" : "đến lượt bạn"));
  caromPassTurn(side);
}

function caromPassTurn(side){
  caromRun = 0;
  caromZoneLock = -1;
  caromStartTurn(side === "player" ? "ai" : "player", true);
}

// Bắt đầu lượt (hoặc đánh tiếp sau khi ghi điểm)
function caromStartTurn(side, changed){
  setTurn(side);
  cueBall = caromBallOf(side);
  caromFixFrozen(side);

  hasAim = true;
  aimWorld = { x: cueBall.x + (cueBall.x < table.x + table.w / 2 ? 260 : -260), y: cueBall.y };
  updateHud();

  if(side === "ai"){
    scheduleAIShot(changed ? 900 : 700);
  }
}

// Bi cái dính sát bi khác: xếp lại như khai cuộc (không bắt buộc chạm bi đỏ trước)
function caromFixFrozen(side){
  const mine = caromBallOf(side);

  for(const b of balls){
    if(b === mine) continue;

    if(Math.hypot(b.x - mine.x, b.y - mine.y) < BALL_R * 2 + 0.6){
      caromSpotBalls(side);
      caromZoneLock = -1;
      setMessage("Bi dính sát nhau · xếp lại bi như khai cuộc");
      return true;
    }
  }

  return false;
}

/* ---------- bảng điểm ---------- */

function renderCaromBoard(){
  const card = side => {
    const chip = side === "player" ? "white" : "yellow";
    const run = turn === side && caromRun > 1 ? `<i>chuỗi ${caromRun}</i>` : "";
    return `<div class="caromScore"><span class="caromChip ${chip}"></span><b>${caromScore[side]}</b><small>/${CAROM.TARGET}</small>${run}</div>`;
  };

  playerTargetBallsEl.innerHTML = card("player");
  aiTargetBallsEl.innerHTML = card("ai");
}

/* ---------- vẽ bàn phăng (lớp tĩnh) ---------- */

function drawCaromCushions(){
  const x = table.x;
  const y = table.y;
  const w = table.w;
  const h = table.h;
  const c = CUSHION_THICKNESS;

  const seg = (pts, gx1, gy1, gx2, gy2) => {
    const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    grad.addColorStop(0, "#0d4f2a");
    grad.addColorStop(0.5, "#28a856");
    grad.addColorStop(1, "#0d4f2a");

    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(0,0,0,.28)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for(let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.30)";
  ctx.shadowBlur = 6;

  // Bốn băng liền, nối chéo 45° ở góc
  seg([x, y, x + w, y, x + w - c, y + c, x + c, y + c], x, y, x + w, y);
  seg([x, y + h, x + w, y + h, x + w - c, y + h - c, x + c, y + h - c], x, y + h, x + w, y + h);
  seg([x, y, x + c, y + c, x + c, y + h - c, x, y + h], x, y, x, y + h);
  seg([x + w, y, x + w - c, y + c, x + w - c, y + h - c, x + w, y + h], x + w, y, x + w, y + h);

  ctx.restore();

  // Ánh sáng mảnh dọc mũi băng
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = "#e8ffd8";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + c * 0.62, y + c * 0.62, w - c * 1.24, h - c * 1.24);
  ctx.restore();
}

function drawCaromDiamonds(){
  ctx.fillStyle = "rgba(255,234,160,.75)";

  const nose = CUSHION_THICKNESS;
  const playL = table.w - 2 * nose;
  const playW = table.h - 2 * nose;

  const diamond = (cx, cy, vertical) => {
    ctx.beginPath();
    if(vertical){
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 8, cy);
    }else{
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 8, cy); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 8, cy);
    }
    ctx.fill();
  };

  for(let i = 1; i < 8; i++){
    const x = table.x + nose + playL * i / 8;
    diamond(x, table.y - 27);
    diamond(x, table.y + table.h + 27);
  }

  for(let i = 1; i < 4; i++){
    const y = table.y + nose + playW * i / 4;
    diamond(table.x - 27, y, true);
    diamond(table.x + table.w + 27, y, true);
  }
}

// Vạch vùng góc + các chấm đặt bi
function drawCaromMarks(){
  ctx.save();

  // Tam giác vùng góc: tô rất nhạt + cạnh huyền nét đứt
  for(const k of CAROM_CORNERS){
    const L = CAROM.ZONE_LEG;

    ctx.fillStyle = "rgba(255,255,255,.045)";
    ctx.beginPath();
    ctx.moveTo(k.x, k.y);
    ctx.lineTo(k.x + L * k.sx, k.y);
    ctx.lineTo(k.x, k.y + L * k.sy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.38)";
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.beginPath();
    ctx.moveTo(k.x + L * k.sx, k.y);
    ctx.lineTo(k.x, k.y + L * k.sy);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  // Chấm đặt bi: đầu bàn, cuối bàn, hai chấm khai cuộc
  const cy = table.y + table.h / 2;
  const spots = [
    [FOOT_SPOT_X, cy],
    [HEAD_STRING_X, cy],
    [HEAD_STRING_X, cy + CAROM.SPOT_OFFSET],
    [HEAD_STRING_X, cy - CAROM.SPOT_OFFSET]
  ];

  ctx.fillStyle = "rgba(255,255,255,.55)";
  for(const [sx, sy] of spots){
    ctx.beginPath();
    ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCaromTableParts(){
  drawCaromCushions();
  drawCaromDiamonds();
  drawCaromMarks();
}

/* ---------- vẽ bi phăng (vàng, đỏ): bi trơn, vài chấm nhỏ để thấy bi đang lăn ---------- */

function drawCaromBallFace(b, color, face){
  const g = ctx.createRadialGradient(
    b.x - BALL_R * 0.35, b.y - BALL_R * 0.38, 3,
    b.x, b.y, BALL_R
  );

  g.addColorStop(0, lighten(color, 0.45));
  g.addColorStop(0.6, color);
  g.addColorStop(1, darken(color, 0.45));

  ctx.fillStyle = g;
  ctx.fillRect(b.x - BALL_R, b.y - BALL_R, BALL_R * 2, BALL_R * 2);

  if(face.alpha <= 0.03) return;

  ctx.save();
  ctx.translate(b.x + face.x, b.y + face.y);
  ctx.rotate(face.rot);
  ctx.scale(face.scale, face.scale * face.squash);
  ctx.globalAlpha = face.alpha * 0.5;
  ctx.fillStyle = darken(color, 0.55);
  ctx.beginPath();
  ctx.arc(0, 0, BALL_R * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
