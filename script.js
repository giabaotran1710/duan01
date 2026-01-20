const audio = document.getElementById("bgm");

function playMusicOnce() {
  if (!audio) return;

  audio.play().then(() => {
    document.removeEventListener("click", playMusicOnce);
    document.removeEventListener("touchstart", playMusicOnce);
  }).catch(() => {
    // mobile cần tương tác mạnh hơn, nhưng click/touch là đủ
  });
}

// Bắt mọi tương tác đầu tiên
document.addEventListener("click", playMusicOnce, { once: true });
document.addEventListener("touchstart", playMusicOnce, { once: true });


const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

/* ================= SETUP ================= */

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
addEventListener("resize", resize);
resize();

let t = 0;
let wavePhase = 0;      // pha sóng chính
let waveMood = 0;       // trạng thái êm ↔ động


/* ================= SKY TIME ================= */

// skyTime chạy vô hạn, dùng % để chia pha
let skyTime = 0;
let sky = 1; // 1 day | 2 afternoon | 3 sunset | 4 night

// giữ mặt trời đứng yên
let sunHold = 0;
const SUN_HOLD_TIME = 1; // ~4 giây (60fps)

/* ================= SUN ================= */

let sunY = canvas.height * 0.22;
let sunTargetY = sunY;
let sunColorT = 0; // 0 vàng | 1 đỏ

/* ================= STARS ================= */

const stars = Array.from({ length: 120 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 1.3,
  s: Math.random() * 10
}));

/* ================= HELPERS ================= */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(c1, c2, t) {
  return `rgb(
    ${Math.round(lerp(c1[0], c2[0], t))},
    ${Math.round(lerp(c1[1], c2[1], t))},
    ${Math.round(lerp(c1[2], c2[2], t))}
  )`;
}

/* ================= SKY ================= */

function drawSky() {
  const p = (skyTime % 1 + 1) % 1; // chống lỗi âm

  const colors = [
    { top: [124,199,255], bottom: [43,108,191] }, // sáng
    { top: [255,200,120], bottom: [255,140,80] }, // chiều
    { top: [255,120,80],  bottom: [120,60,80] },  // hoàng hôn
    { top: [10,20,45],    bottom: [5,10,25] },    // đêm
    { top: [124,199,255], bottom: [43,108,191] }  // quay lại sáng
  ];

  const i = Math.floor(p * 4);
  const tt = (p * 4) % 1;

  const top = lerpColor(colors[i].top, colors[i + 1].top, tt);
  const bot = lerpColor(colors[i].bottom, colors[i + 1].bottom, tt);

  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // sao chỉ ban đêm
  if (sky === 4) {
    ctx.fillStyle = "white";
    stars.forEach(s => {
      ctx.globalAlpha = 0.4 + Math.sin(t + s.s) * 0.4;
      ctx.beginPath();
      ctx.arc(
        s.x * canvas.width,
        s.y * canvas.height * 0.6,
        s.r,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

/* ================= SUN ================= */

function drawSun() {
  if (sky === 4) return;

  const x = canvas.width * 0.75;

  sunY = lerp(sunY, sunTargetY, 0.03);
  sunColorT = lerp(sunColorT, sky >= 3 ? 1 : 0, 0.02);

  const r = Math.round(lerp(255, 255, sunColorT));
  const g = Math.round(lerp(216, 107, sunColorT));
  const b = Math.round(lerp(77, 44, sunColorT));

  const color = `rgb(${r},${g},${b})`;
  const glow = lerp(90, 130, sunColorT);
  const radius = lerp(42, 38, sunColorT);

  const grad = ctx.createRadialGradient(x, sunY, 5, x, sunY, glow);
  grad.addColorStop(0, "#fff1c1");
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, "rgba(255,120,0,0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, sunY, glow, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, sunY, radius, 0, Math.PI * 2);
  ctx.fill();
}

/* ================= CLOUD ================= */

function drawCloud(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  const blobs = [
    { x: -40, y: 0,  r: 28 },
    { x: -15, y: -15, r: 34 },
    { x: 15,  y: -10, r: 38 },
    { x: 45,  y: 0,  r: 26 }
  ];

  blobs.forEach(b => {
    const g = ctx.createRadialGradient(
      b.x - 8, b.y - 8, b.r * 0.2,
      b.x, b.y, b.r
    );

    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.6, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0.0)");

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}


/* ================= WAVE & BOAT (GIỮ NGUYÊN) ================= */

function wave(x) {
  const base = canvas.height * 0.56;

  // dao động êm ↔ mạnh (loop hoàn hảo)
  const calmness = (Math.sin(waveMood) + 1) / 2; // 0 → 1
  const amplitude = lerp(4, 14, calmness);

  const rainBoost = isRaining ? 1.3 : 1;

  return base + Math.sin(x * 0.035 + wavePhase) * amplitude * rainBoost;
}


function drawSea() {
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x++) {
    ctx.lineTo(x, wave(x));
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fillStyle = "#2b75e3";
  ctx.fill();
}

function drawBoat() {
  const x = canvas.width * 0.4;
  const y = wave(x);
  const dx = 6;
  const slope = wave(x + dx) - wave(x - dx);
  const tilt = slope * 0.04;


  ctx.save();
  ctx.translate(x, y - 8);
  ctx.rotate(tilt);

  /* ===== SHADOW ===== */
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(0, 12, 32, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  /* ===== HULL ===== */
  const hullGrad = ctx.createLinearGradient(0, -4, 0, 14);
  hullGrad.addColorStop(0, "#a05a3a");
  hullGrad.addColorStop(1, "#5a2e1a");

  ctx.fillStyle = hullGrad;
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.quadraticCurveTo(0, 14, 34, 0);
  ctx.lineTo(26, 10);
  ctx.lineTo(-26, 10);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#3a1d10";
  ctx.stroke();

  /* ===== DECK ===== */
  ctx.fillStyle = "#c98a5a";
  ctx.beginPath();
  ctx.roundRect(-18, -2, 36, 6, 4);
  ctx.fill();

  /* ===== MAST ===== */
  ctx.strokeStyle = "#2b2b2b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, -44);
  ctx.stroke();

  /* ===== ROPE ===== */
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.lineTo(18, -10);
  ctx.stroke();

  /* ===== MAIN SAIL ===== */
  const sailGrad = ctx.createLinearGradient(0, -40, 26, -10);
  sailGrad.addColorStop(0, "#ffffff");
  sailGrad.addColorStop(1, "#dddddd");

  ctx.fillStyle = sailGrad;
  ctx.beginPath();
  ctx.moveTo(0, -44);
  ctx.quadraticCurveTo(30, -28, 0, -12);
  ctx.closePath();
  ctx.fill();

  /* ===== FRONT SAIL ===== */
  ctx.fillStyle = "#f0f0f0";
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(-18, -12);
  ctx.lineTo(0, -12);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

//MƯA//
function drawRain() {
  ctx.strokeStyle = "rgba(200,200,255,0.6)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 120; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 2, y + 12);
    ctx.stroke();
  }
}

/* ================= RAIN TIME CONTROL ================= */

let rainStartTime = 4000; // 4 giây
let rainEndTime   = 14000; // mưa 3 giây (10 → 13s)
let rainCycle     = 15000; // mỗi 15 giây lặp lại

let isRaining = false;


/* ================= LOOP ================= */

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  let waveTime = 0;
  const DAY_WAVE_AMP = 12;
  const NIGHT_WAVE_AMP = 3;
  let currentWaveAmp = DAY_WAVE_AMP;


  // 👉 GIẢM TỐC ĐỘ ĐỂ CẢNH DÀI HƠN
  skyTime += 0.00025;
  const now = performance.now();
  const cycleTime = now % rainCycle;

  isRaining = cycleTime >= rainStartTime && cycleTime <= rainEndTime;


  const phase = skyTime % 1;

  // phân pha
  if (phase < 0.25) sky = 1;
  else if (phase < 0.5) sky = 2;
  else if (phase < 0.6) sky = 3;
  else sky = 4;

  let targetWaveAmp = DAY_WAVE_AMP;

// giả sử:
// sky 1 = ngày
// sky 2 = hoàng hôn
// sky 3,4 = đêm

if (sky === 2) {
  targetWaveAmp = 8;          // hoàng hôn: dịu
}

if (sky >= 3) {
  targetWaveAmp = NIGHT_WAVE_AMP; // đêm: lặng
}

currentWaveAmp += (targetWaveAmp - currentWaveAmp) * 0.02;


  // LOGIC MẶT TRỜI
  if (sky === 1 && sunHold < SUN_HOLD_TIME) {
    sunHold++;
    sunTargetY = canvas.height * 0.22;
  } else if (sky === 2 || sky === 3) {
    sunHold = 0;
    const sunsetProgress = Math.min(
      Math.max((phase - 0.25) / 0.35, 0),
      1
    );
    sunTargetY = lerp(
      canvas.height * 0.22,
      canvas.height * 0.55,
      sunsetProgress
    );
  } else {
    sunHold = 0;
  }

  drawSky();
  drawSun();

  drawCloud(canvas.width * 0.2 + Math.sin(t) * 40, canvas.height * 0.2, 1.1);
  drawCloud(canvas.width * 0.5 + Math.sin(t * 0.7) * 50, canvas.height * 0.16, 0.9);

  if (sky >= 3 && isRaining) {
  drawRain();
}


  drawSea();
  drawBoat();

  wavePhase += 0.025;   // sóng chạy
waveMood  += 0.003;   // biển êm ↔ động (rất chậm)

if (wavePhase > Math.PI * 2) wavePhase -= Math.PI * 2;
if (waveMood  > Math.PI * 2) waveMood  -= Math.PI * 2;

t += 0.01; // chỉ dùng cho mây / sao / hiệu ứng nhỏ

  requestAnimationFrame(animate);
}

animate();




