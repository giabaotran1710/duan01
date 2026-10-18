/* =========================================================
   MÀN HÌNH CHỌN CHẾ ĐỘ (bida lỗ / bida phăng) + LUẬT CHƠI có nút chuyển + video minh hoạ.
   Mở khi vào trang và khi bấm nút ☰. Khi menu mở, bàn tạm dừng như lúc thoát toàn màn hình.
   ========================================================= */

const modeMenu = document.getElementById("modeMenu");
const ruleVideo = document.getElementById("ruleVideo");
const mmResume = document.getElementById("mmResume");
const homeBtn = document.getElementById("homeBtn");

// MP4 (H.264) cho mọi trình duyệt có sẵn bộ giải mã; WebM (VP9) dự phòng cho trình duyệt không có H.264
const RULE_VIDEOS = {
  pool: { name: "video/bida-lo", v: "20261020" },
  carom: { name: "video/bida-phang", v: "20261020" }
};

let ruleMode = "pool";
let gameInProgress = false;

try{
  if(localStorage.getItem("bida:rule") === "carom") ruleMode = "carom";
}catch(e){}

/* ---------- luật chơi: nút chuyển ---------- */

function showRule(mode, autoplay = true){
  ruleMode = mode;

  document.querySelectorAll(".ruleToggle button").forEach(b => {
    const on = b.dataset.rule === mode;
    b.classList.toggle("on", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });

  document.querySelectorAll(".ruleText").forEach(el => {
    el.hidden = el.dataset.rule !== mode;
  });

  const v = RULE_VIDEOS[mode];

  if(ruleVideo.dataset.mode !== mode){
    ruleVideo.dataset.mode = mode;
    ruleVideo.poster = `${v.name}.jpg?v=${v.v}`;
    ruleVideo.innerHTML =
      `<source src="${v.name}.mp4?v=${v.v}" type="video/mp4">` +
      `<source src="${v.name}.webm?v=${v.v}" type="video/webm">`;
    ruleVideo.load();
  }

  if(autoplay && !modeMenu.classList.contains("hide")){
    const p = ruleVideo.play();
    if(p && p.catch) p.catch(() => {});
  }

  try{ localStorage.setItem("bida:rule", mode); }catch(e){}
}

document.querySelectorAll(".ruleToggle button").forEach(b => {
  b.addEventListener("click", () => showRule(b.dataset.rule));
});

/* ---------- hình minh hoạ hai chế độ: vẽ bằng chính hàm vẽ bàn/bi của game ---------- */

function artBall(x, y, num, type){
  const b = new Ball(x, y, num);
  if(type) b.type = type;
  return b;
}

// Bi trong hình minh hoạ được vẽ to hơn thật để nhìn rõ trên thẻ nhỏ
const ART_BALL_SCALE = 1.7;

function poolArtBalls(){
  const list = [];
  const cy = table.y + table.h * 0.5;
  const gap = (BALL_R * 2 + 1.2) * ART_BALL_SCALE;
  const order = [1, 9, 2, 10, 8, 3, 4, 11, 12, 5, 13, 6, 14, 15, 7];
  let idx = 0;

  for(let row = 0; row < 5; row++){
    for(let col = 0; col <= row; col++){
      list.push(artBall(FOOT_SPOT_X + row * gap * 0.88, cy + (col - row / 2) * gap, order[idx++]));
    }
  }

  const cue = artBall(HEAD_STRING_X - 20, cy + 70, 0);
  list.unshift(cue);
  return { list, cue, dir: AI_norm(FOOT_SPOT_X - cue.x, cy - cue.y) };
}

function caromArtBalls(){
  const cy = table.y + table.h * 0.5;
  const white = artBall(HEAD_STRING_X, cy + CAROM.SPOT_OFFSET, 0);
  const yellow = artBall(HEAD_STRING_X, cy, CAROM.YELLOW, "carom");
  const red = artBall(FOOT_SPOT_X, cy, CAROM.RED, "carom");
  return { list: [white, yellow, red], white, yellow, red };
}

function drawArtShadow(b){
  const k = ART_BALL_SCALE;
  ctx.fillStyle = "rgba(0,0,0,.32)";
  ctx.beginPath();
  ctx.ellipse(b.x + 6 * k, b.y + 9 * k, BALL_R * 1.08 * k, BALL_R * 0.48 * k, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawArtBall(b){
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(ART_BALL_SCALE, ART_BALL_SCALE);
  const saveX = b.x;
  const saveY = b.y;
  b.x = 0;
  b.y = 0;
  drawBall(b);
  b.x = saveX;
  b.y = saveY;
  ctx.restore();
}

// Mũi tên đường đi (nét đứt) cho hình phăng
function drawArtPath(points, color){
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.setLineDash([26, 20]);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for(let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
  ctx.setLineDash([]);

  const [ax, ay] = points[points.length - 2];
  const [bx, by] = points[points.length - 1];
  const a = Math.atan2(by - ay, bx - ax);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - Math.cos(a - 0.45) * 44, by - Math.sin(a - 0.45) * 44);
  ctx.lineTo(bx - Math.cos(a + 0.45) * 44, by - Math.sin(a + 0.45) * 44);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderModeArt(cv, mode){
  const r = cv.parentElement.getBoundingClientRect();
  if(r.width < 10 || r.height < 10) return;

  const k2 = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(r.width * k2);
  cv.height = Math.round(r.height * k2);

  const g = cv.getContext("2d");
  const x0 = table.x - 76;
  const y0 = table.y - 76;
  const w = table.w + 152;
  const h = table.h + 152;
  const k = Math.min(cv.width / w, cv.height / h) * 0.96;

  const saved = { mode: GAME_MODE, ctx, cue: cueBall, sx: spin.x, sy: spin.y };

  try{
    GAME_MODE = mode;
    ctx = g;
    spin.x = 0;
    spin.y = 0;

    g.setTransform(1, 0, 0, 1, 0, 0);
    const bg = g.createRadialGradient(cv.width / 2, cv.height / 2, 10, cv.width / 2, cv.height / 2, cv.width * 0.7);
    bg.addColorStop(0, "#173f26");
    bg.addColorStop(1, "#050c07");
    g.fillStyle = bg;
    g.fillRect(0, 0, cv.width, cv.height);

    g.setTransform(k, 0, 0, k, (cv.width - w * k) / 2 - x0 * k, (cv.height - h * k) / 2 - y0 * k);
    drawTable();

    if(mode === "pool"){
      const art = poolArtBalls();
      cueBall = art.cue;
      art.list.forEach(drawArtShadow);
      art.list.forEach(drawArtBall);
      ctx.save();
      ctx.translate(art.cue.x, art.cue.y);
      ctx.scale(ART_BALL_SCALE, ART_BALL_SCALE);
      drawCueStick(0, 0, art.dir, { isAI: false, pullBack: 40 });
      ctx.restore();
    }else{
      const art = caromArtBalls();
      cueBall = art.white;

      // Bi trắng → chạm mỏng bi đỏ → bật băng → chạm bi vàng: 1 điểm
      const cy = table.y + table.h / 2;
      const R = BALL_R * ART_BALL_SCALE;
      const hitRed = [art.red.x - R * 1.5, art.red.y + R * 1.5];
      const cushion = [table.x + table.w - CUSHION_THICKNESS - R, cy + 200];
      const hitYellow = [art.yellow.x + R * 2.1, art.yellow.y + R * 0.5];
      drawArtPath([[art.white.x, art.white.y], hitRed, cushion, hitYellow], "rgba(255,255,255,.8)");

      art.list.forEach(drawArtShadow);
      art.list.forEach(drawArtBall);

      ctx.save();
      ctx.font = "900 96px system-ui, Arial";
      ctx.fillStyle = "#ffe27a";
      ctx.strokeStyle = "rgba(0,0,0,.6)";
      ctx.lineWidth = 12;
      ctx.textAlign = "center";
      ctx.strokeText("+1", art.yellow.x, art.yellow.y - R * 1.9);
      ctx.fillText("+1", art.yellow.x, art.yellow.y - R * 1.9);
      ctx.restore();
    }
  }finally{
    GAME_MODE = saved.mode;
    ctx = saved.ctx;
    cueBall = saved.cue;
    spin.x = saved.sx;
    spin.y = saved.sy;
  }
}

function drawModeArts(){
  document.querySelectorAll(".modeArt").forEach(cv => renderModeArt(cv, cv.dataset.art));
}

/* ---------- mở / đóng menu ---------- */

function openMenu(){
  menuOpen = true;
  modeMenu.classList.remove("hide");
  mmResume.hidden = !(gameInProgress && !gameOver);
  requestAnimationFrame(drawModeArts);
  showRule(ruleMode);
  fsRefresh();
}

function closeMenu(){
  menuOpen = false;
  modeMenu.classList.add("hide");
  ruleVideo.pause();
  fsRefresh();
}

function startMode(mode){
  GAME_MODE = mode === "carom" ? "carom" : "pool";
  resize();
  resetGame();
  gameInProgress = true;
  closeMenu();
}

document.querySelectorAll(".modeCard").forEach(card => {
  card.addEventListener("click", () => startMode(card.dataset.mode));
});

mmResume.addEventListener("click", closeMenu);

homeBtn.addEventListener("pointerdown", e => { e.stopPropagation(); });
homeBtn.addEventListener("pointerup", e => { e.stopPropagation(); });
homeBtn.addEventListener("click", e => {
  e.preventDefault();
  e.stopPropagation();
  openMenu();
});

window.addEventListener("resize", () => {
  if(menuOpen) requestAnimationFrame(drawModeArts);
});

// Vào trang: hiện menu
openMenu();
