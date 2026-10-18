/* =========================================================
   AI BIDA PHĂNG (AI.GiaBao) — tìm cú ghi điểm chắc nhất và để bi đẹp cho cú sau.
   Mỗi cú thử được mô phỏng bằng đúng hàm vật lý của bàn thật (caromStep, bước cố định 1 khung),
   nên cú AI chọn trên bàn chạy giống hệt lúc tính.

   1. Cú trực tiếp: lần lượt chạm bi mục tiêu thứ nhất với độ dày từ mỏng trái tới mỏng phải,
      nhiều kiểu xoáy (bi chết, culê, retro, áp phê trái/phải) và vài mức lực.
   2. Thiếu cú tốt: cú đánh băng trước (bricole) quét đủ 360°.
   3. Các cú ghi điểm được chấm: độ chắc (lệch nhẹ góc/lực/xoáy vẫn ghi điểm), thế bi sau cú đánh
      (hai bi mục tiêu gần nhau, bi cái gần, không dính băng/dính bi), và số cú ghi điểm ở thế bi đó (nhìn trước 1 cú).
   4. Không có cú ghi điểm: đánh phòng thủ — chạm một bi và để đối thủ ở thế khó nhất.
   Tính theo từng lát nhỏ (AI_ENGINE.sliceMs/gapMs) để màn hình vẫn mượt.
   ========================================================= */

const CAROM_AI = {
  budgetMs: 2300,          // tổng thời gian suy nghĩ tối đa
  offsets: 33,             // số độ dày thử cho mỗi bi chạm trước
  spins: [[0, 0], [0, 0.55], [0, -0.6], [0.55, 0.25], [-0.55, 0.25], [0.5, -0.45], [-0.5, -0.45]],
  powers: [0.2, 0.3, 0.42, 0.56],
  bankAngles: 240,
  bankSpins: [[0, 0.2], [0.55, 0.2], [-0.55, 0.2]],
  bankPowers: [0.38, 0.52],
  refine: 10,              // số cú tốt nhất được kiểm tra kỹ
  maxFrames: 1500,
  /* Sai số tay khi thực hiện cú đánh. AI tính cực chuẩn và luôn chọn cú "chắc" nên sai số nhỏ gần như không làm trượt:
     không có sai số thì AI ghi điểm liên tục mãi. Vì vậy thỉnh thoảng (lapseChance) AI đánh lệch hẳn 1,3–2,8°.
     Đo tự đấu: ghi điểm ~80% số cú, chuỗi trung bình ~4 điểm — rất giỏi nhưng vẫn có thể thắng được. */
  aimNoiseDeg: 0.3,
  powerNoise: 0.03,
  lapseChance: 0.18,
  lapseMinDeg: 1.3,
  lapseMaxDeg: 2.8
};

// Số ngẫu nhiên phân bố chuẩn
function caromGauss(){
  let u = 0;
  let v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function caromApplyExecutionNoise(shot){
  const lapse = Math.random() < CAROM_AI.lapseChance;
  const deg = lapse
    ? (Math.random() < 0.5 ? -1 : 1) * (CAROM_AI.lapseMinDeg + Math.random() * (CAROM_AI.lapseMaxDeg - CAROM_AI.lapseMinDeg))
    : CAROM_AI.aimNoiseDeg * caromGauss();
  const a = Math.atan2(shot.dir.y, shot.dir.x) + deg * Math.PI / 180;

  return {
    ...shot,
    dir: { x: Math.cos(a), y: Math.sin(a) },
    power: clamp(shot.power * (1 + CAROM_AI.powerNoise * caromGauss()), 0.05, 1)
  };
}

let CAROM_AI_TOKEN = 0;

/* ---------- mô phỏng ---------- */

function caromSimBalls(src){
  return src.map(b => ({
    num: b.num,
    type: b.type,
    x: b.x,
    y: b.y,
    vx: 0, vy: 0, rx: 0, ry: 0, sz: 0,
    active: true
  }));
}

// Mô phỏng một cú từ thế bi `state` (danh sách bi đứng yên). Trả về kết luận theo luật + thế bi cuối.
function caromSimShot(state, cueIdx, dir, power, sx, sy, ctxRule){
  const list = caromSimBalls(state);
  const cue = list[cueIdx];
  const objs = list.filter(b => b !== cue);
  const red = list.find(b => b.num === CAROM.RED);
  const t = caromTracker(cue, objs[0], objs[1], ctxRule.zoneLock);

  strikeCueBall(cue, dir, power, { x: sx, y: sy });

  let f = 0;
  for(; f < CAROM_AI.maxFrames; f++){
    caromStep(list, 1, t.ev, false);
    if(!list.some(isBallMoving)) break;
  }

  const res = caromJudge(t, ctxRule.opening, red);
  return { res, t, list, frames: f };
}

/* ---------- đánh giá thế bi ---------- */

// Thế bi càng dễ ghi điểm càng cao (0..1): hai bi mục tiêu gần nhau, bi cái không quá xa, không dính băng, không dính bi
function caromLayoutEase(list, cueIdx){
  const cue = list[cueIdx];
  const [a, b] = list.filter(x => x !== cue);
  const B = CAROM_B;
  const R2 = BALL_R * 2;

  const dObj = Math.hypot(a.x - b.x, a.y - b.y);
  const dA = Math.hypot(cue.x - a.x, cue.y - a.y);
  const dB = Math.hypot(cue.x - b.x, cue.y - b.y);
  const dNear = Math.min(dA, dB);

  let e = 1;
  e *= 1 / (1 + Math.pow(Math.max(0, dObj - R2 * 1.2) / 260, 1.4));        // hai bi mục tiêu gần nhau
  e *= 1 / (1 + Math.pow(Math.max(0, dNear - R2 * 1.5) / 420, 1.6));        // bi cái gần
  if(dA < R2 + 2 || dB < R2 + 2) e *= 0.35;                                // bi cái dính bi
  if(dObj < R2 + 1) e *= 0.85;

  const railGap = x => Math.min(x.x - B.left, B.right - x.x, x.y - B.top, B.bottom - x.y);
  if(railGap(cue) < 3) e *= 0.6;                                           // bi cái dính băng (khó đánh)

  // Hai bi mục tiêu cùng trong vùng góc: cú sau bị ràng buộc
  if(caromPairZone(a, b) >= 0) e *= 0.8;

  return e;
}

// Đối thủ dễ ghi điểm tới đâu nếu để lại thế bi này (dùng cho cú phòng thủ)
function caromOpponentEase(list, myIdx){
  const oppIdx = list.findIndex((b, i) => i !== myIdx && b.num !== CAROM.RED);
  return caromLayoutEase(list, oppIdx);
}

/* ---------- sinh cú thử ---------- */

function caromDirectCandidates(state, cueIdx){
  const cue = state[cueIdx];
  const out = [];
  const n = CAROM_AI.offsets;

  state.forEach((f, fi) => {
    if(fi === cueIdx) return;

    const dx = f.x - cue.x;
    const dy = f.y - cue.y;
    const d = Math.hypot(dx, dy);
    if(d < BALL_R * 2 + 0.5) return;

    const base = Math.atan2(dy, dx);

    for(let i = 0; i < n; i++){
      // độ dày: −0,97 (mỏng trái) … +0,97 (mỏng phải), dày đặc hơn ở hai mép
      const u = -1 + 2 * i / (n - 1);
      const b = Math.sign(u) * Math.pow(Math.abs(u), 0.85) * 0.97;
      const off = Math.asin(clamp(b * BALL_R * 2 / d, -1, 1));
      out.push({ ang: base + off, first: fi, thick: b });
    }
  });

  return out;
}

/* ---------- tìm cú ---------- */

function* caromPlanShot(started){
  const state = balls.map(b => ({ num: b.num, type: b.type, x: b.x, y: b.y }));
  const cueIdx = balls.indexOf(cueBall);
  const rule = { opening: caromOpening, zoneLock: caromZoneLock };
  const elapsed = () => performance.now() - started;
  const budget = CAROM_AI.budgetMs;

  const scorers = [];
  const misses = [];

  const tryShot = (ang, power, sx, sy, kind) => {
    const dir = { x: Math.cos(ang), y: Math.sin(ang) };
    const r = caromSimShot(state, cueIdx, dir, power, sx, sy, rule);
    const shot = { ang, dir, power, spinX: sx, spinY: sy, kind, list: r.list, res: r.res, t: r.t };

    if(r.res.point){
      shot.ease = caromLayoutEase(r.list, cueIdx);
      scorers.push(shot);
    }else if(!r.res.foul){
      shot.oppEase = caromOpponentEase(r.list, cueIdx);
      misses.push(shot);
    }

    return r.res.point;
  };

  // 1. Cú trực tiếp — thứ tự xen kẽ để nếu hết giờ giữa chừng thì các vùng góc vẫn được thử đều
  const direct = caromInterleave(caromDirectCandidates(state, cueIdx));

  for(const c of direct){
    for(const p of CAROM_AI.powers){
      for(const [sx, sy] of CAROM_AI.spins){
        tryShot(c.ang, p, sx, sy, "direct");
        yield;
      }
    }

    if(elapsed() > budget * 0.55) break;
  }

  // 2. Cú băng trước nếu ít cú ghi điểm
  if(scorers.length < 6){
    const cue = state[cueIdx];
    const n = CAROM_AI.bankAngles;

    for(let i = 0; i < n && elapsed() < budget * 0.75; i++){
      const ang = (i + 0.5) * Math.PI * 2 / n;
      for(const p of CAROM_AI.bankPowers){
        for(const [sx, sy] of CAROM_AI.bankSpins){
          tryShot(ang, p, sx, sy, "bank");
          yield;
        }
      }
    }
  }

  if(!scorers.length){
    return caromSafetyShot(misses, state, cueIdx, rule);
  }

  // 3. Chấm kỹ các cú tốt nhất: độ chắc + thế bi + nhìn trước 1 cú
  scorers.sort((a, b) => b.ease - a.ease);
  const pool = caromPickDiverse(scorers, CAROM_AI.refine);
  let best = null;

  for(const s of pool){
    let ok = 0;
    let total = 0;
    const jit = [
      [0.0025, 0, 0, 0], [-0.0025, 0, 0, 0], [0.006, 0, 0, 0], [-0.006, 0, 0, 0],
      [0, 0.06, 0, 0], [0, -0.06, 0, 0], [0, 0, 0.1, 0], [0, 0, 0, 0.1],
      [0.004, -0.04, -0.08, 0], [-0.004, 0.04, 0, -0.08]
    ];

    for(const [da, dp, dsx, dsy] of jit){
      const ang = s.ang + da;
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      const r = caromSimShot(state, cueIdx, dir, clamp(s.power * (1 + dp), 0.05, 1), clamp(s.spinX + dsx, -1, 1), clamp(s.spinY + dsy, -1, 1), rule);
      total++;
      if(r.res.point) ok++;
      yield;
    }

    s.robust = ok / total;

    // Nhìn trước: ở thế bi sau cú này, còn bao nhiêu cú ghi điểm dễ (mẫu thưa)
    s.next = caromCountNextScores(s.list, cueIdx);
    yield;

    s.score = s.robust * 3 + s.ease * 1.2 + s.next * 1.4 + (s.kind === "direct" ? 0.15 : 0);

    if(!best || s.score > best.score) best = s;
    if(elapsed() > budget) break;
  }

  return caromFinal(best || scorers[0]);
}

// Thứ tự "bit đảo": phủ đều cả dải trước rồi mới dày dần
function caromInterleave(list){
  const n = list.length;
  let bits = 0;
  while((1 << bits) < n) bits++;

  const out = [];
  for(let i = 0; i < (1 << bits); i++){
    let r = 0;
    for(let k = 0; k < bits; k++) if(i & (1 << k)) r |= 1 << (bits - 1 - k);
    if(r < n) out.push(list[r]);
  }
  return out;
}

// Lấy các cú tốt nhưng khác nhau (không chọn 10 cú gần như trùng nhau)
function caromPickDiverse(sorted, k){
  const out = [];

  for(const s of sorted){
    if(out.length >= k) break;
    const dup = out.some(o => Math.abs(o.ang - s.ang) < 0.012 && Math.abs(o.power - s.power) < 0.06 && o.spinX === s.spinX && o.spinY === s.spinY);
    if(!dup) out.push(s);
  }

  return out;
}

// Số cú ghi điểm (tỉ lệ 0..1) trong một lưới thưa ở thế bi mới — đo độ "dễ" thật của thế bi
function caromCountNextScores(list, cueIdx){
  const state = list.map(b => ({ num: b.num, type: b.type, x: b.x, y: b.y }));
  const rule = { opening: false, zoneLock: caromPairZone(...state.filter((b, i) => i !== cueIdx)) };
  const cue = state[cueIdx];
  let ok = 0;
  let total = 0;

  state.forEach((f, fi) => {
    if(fi === cueIdx) return;
    const d = Math.hypot(f.x - cue.x, f.y - cue.y);
    if(d < BALL_R * 2 + 0.5) return;
    const base = Math.atan2(f.y - cue.y, f.x - cue.x);

    for(const b of [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75]){
      const ang = base + Math.asin(clamp(b * BALL_R * 2 / d, -1, 1));
      const dir = { x: Math.cos(ang), y: Math.sin(ang) };
      for(const p of [0.25, 0.4]){
        const r = caromSimShot(state, cueIdx, dir, p, 0, 0.3, rule);
        total++;
        if(r.res.point) ok++;
      }
    }
  });

  return total ? ok / total : 0;
}

// Không có cú ghi điểm: chạm bi hợp lệ và để đối thủ ở thế khó nhất
function caromSafetyShot(misses, state, cueIdx, rule){
  let best = null;

  for(const m of misses){
    if(rule.opening && m.t.first && m.t.first.num !== CAROM.RED) continue;
    const touched = m.t.hits.length;
    const s = (1 - m.oppEase) + (touched ? 0.2 : 0);
    if(!best || s > best.s) best = { ...m, s };
  }

  if(best) return caromFinal(best, true);

  // Bất đắc dĩ: đánh thẳng vào bi đỏ
  const cue = state[cueIdx];
  const red = state.find(b => b.num === CAROM.RED);
  const ang = Math.atan2(red.y - cue.y, red.x - cue.x);
  return caromFinal({ ang, dir: { x: Math.cos(ang), y: Math.sin(ang) }, power: 0.35, spinX: 0, spinY: 0.2 }, true);
}

function caromFinal(s, safety = false){
  return {
    dir: s.dir,
    power: s.power,
    spinX: s.spinX,
    spinY: s.spinY,
    safety,
    robust: s.robust,
    kind: s.kind
  };
}

/* ---------- chạy theo lát ---------- */

function caromAITakeShot(){
  if(gameOver || turn !== "ai") return;
  if(aiThinking) return;

  aiThinking = true;
  setMessage("AI.GiaBao đang tính cú phăng...", true);

  const token = ++CAROM_AI_TOKEN;
  const started = performance.now();
  const gen = caromPlanShot(started);

  const tick = () => {
    if(token !== CAROM_AI_TOKEN || gameOver || turn !== "ai" || GAME_MODE !== "carom"){
      // Lượt tính đã bị thay bằng lượt mới thì không đụng tới cờ "đang suy nghĩ" của lượt mới
      if(token === CAROM_AI_TOKEN) aiThinking = false;
      return;
    }

    // Đang tạm dừng (menu / thoát toàn màn hình): chờ
    if(typeof fsPaused !== "undefined" && fsPaused){
      setTimeout(tick, 200);
      return;
    }

    const t0 = AI_lastProgress = performance.now();
    let r = null;

    try{
      while(performance.now() - t0 < AI_ENGINE.sliceMs){
        r = gen.next();
        if(r.done) break;
      }
    }catch(err){
      console.error("AI phăng lỗi:", err);
      r = { done: true, value: null };
    }

    if(r && r.done){
      aiThinking = false;
      const plan = r.value || caromFinal({ ang: 0, dir: { x: 1, y: 0 }, power: 0.3, spinX: 0, spinY: 0 }, true);
      // Cú khai cuộc đánh chuẩn (không có sai số): khai cuộc mà chạm sai bi trông rất vô lý
      showAICueAndShoot(caromOpening ? plan : caromApplyExecutionNoise(plan), AI_ENGINE.previewMs || 900);
      return;
    }

    setTimeout(tick, AI_ENGINE.gapMs || 0);
  };

  setTimeout(tick, 0);
}
