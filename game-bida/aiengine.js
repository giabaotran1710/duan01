/* =========================================================
   AI ENGINE - BIDA 6 LỖ
   BRUTE FORCE SCAN VERSION
   File: aiengine.js
   ========================================================= */

/* =========================
   CONFIG
   ========================= */

const AI_ENGINE = {
  previewMs: 850,

  // Số góc quét trong vùng bi cái có thể chạm bi mục tiêu.
  // Tăng lên = chính xác hơn nhưng AI nghĩ lâu hơn.
  directAngleSamples: 43,

  // Số góc quét khi AI đánh A băng bi cái vào bi mục tiêu.
  kickAngleSamples: 35,

  // AI sẽ thử đúng từ 1% đến 100%.
  // Cơ chế lỗ mới khó hơn, cần cho AI thử cả lực nhẹ
powerMinPct: 60,
powerMaxPct: 98,
  
  // Ưu tiên cú trực tiếp sạch trước khi brute-force
cleanDirectPowerMinPct: 38,
cleanDirectPowerMaxPct: 90,

// Dùng áp phê nhẹ, tránh bi cái rơi lỗ ảo
scanSpinX: 0,
scanSpinY: 0,

  // Kế hoạch cú đánh: tổng thời gian suy nghĩ và độ dài mỗi lát tính (ms)
  thinkBudgetMs: 3200,
  sliceMs: 12,
  scanExtraMs: 2500,
  safeExtraMs: 2000,

  // Số cú ăn trực tiếp tốt nhất được tính kỹ, số cú được thử kỹ thuật điều bi
  potCandidates: 8,
  techniqueShots: 3,

  // Lệch góc (độ) quanh điểm ngắm hình học để bù "ném" bi
  aimOffsetsDeg: [0, 0.6, -0.6, 1.2, -1.2, 2, -2, 3, -3, 4.2, -4.2],

  // Kỹ thuật điều bi: x = áp phê (phải +), y = culê (+) / retro (−)
  techniques: [
    {x:0, y:0}, {x:0, y:0.45}, {x:0, y:0.85}, {x:0, y:-0.45}, {x:0, y:-0.85},
    {x:0.6, y:0}, {x:-0.6, y:0}, {x:0.5, y:0.5}, {x:-0.5, y:0.5}, {x:0.5, y:-0.5}, {x:-0.5, y:-0.5}
  ],

  // Giới hạn frame mô phỏng cho mỗi cú thử.
  simFrameLimit: 760,

  // Giới hạn tốc độ giống file chính.
  maxBallSpeed: 100,
  directScanMaxMs: 6000,
kickScanMaxMs: 6000,
  // Khi không tìm được cú ăn bi, AI sẽ tìm cú A băng an toàn để chạm đúng bi mục tiêu
safeKickAngleSamples: 65,
safeKickPowerMinPct: 28,
safeKickPowerMaxPct: 92,
safeKickScanMaxMs: 4500,

randomPowerMinPct: 30,
randomPowerMaxPct: 99,

  // Nếu true: AI ưu tiên cú trực tiếp trước, rồi mới A băng.
  preferDirect: true
};

const AI_THINKER = {
  depth: "BRUTE-SCAN"
};

let AI_SCAN_TOKEN = 0;

/* =========================
   MAIN AI TURN
   ========================= */

// Thời điểm AI còn đang tính toán (để chốt an toàn trong bida.html biết AI không bị treo)
let AI_lastProgress = 0;

function aiTakeShot(){
  if(gameOver) return;
  if(turn !== "ai") return;
  if(aiCueMove) return;

  if(isMoving() || shotLocked){
    scheduleAIShot(260);
    return;
  }

  if(ballInHand && ballInHandOwner === "ai"){
    startAICueBallDragThenShoot("full");
    return;
  }

  if(!breakDone){
    startAICueBallDragThenShoot("break");
    return;
  }

  if(aiThinking) return;

  aiThinking = true;
  setMessage("AI.GiaBao đang suy nghĩ...", true);

  startAIThinkSearch(bestShot => {
    aiThinking = false;

    if(gameOver || turn !== "ai") return;

    if(isMoving() || shotLocked || aiCueMove){
      scheduleAIShot(260);
      return;
    }

    showAICueAndShoot(bestShot, AI_ENGINE.previewMs);
  });
}

/*
  Chạy kế hoạch cú đánh theo từng lát nhỏ (≤ sliceMs) để màn hình không bị giật,
  có tổng thời gian tối đa; lỗi bất ngờ cũng không làm AI treo mà chuyển sang cú dự phòng.
*/
function startAIThinkSearch(done){
  const token = ++AI_SCAN_TOKEN;
  const started = performance.now();
  let gen = null;
  let finished = false;

  const finish = shot => {
    if(finished) return;
    finished = true;
    if(token === AI_SCAN_TOKEN) AI_SCAN_TOKEN++;
    done(shot || findAISafeFallbackShot());
  };

  const tick = () => {
    if(finished) return;

    // Lượt đã đổi, ván kết thúc hoặc đã có lượt tính mới: dừng và không giữ cờ "đang suy nghĩ"
    if(token !== AI_SCAN_TOKEN || gameOver || turn !== "ai"){
      finished = true;
      aiThinking = false;
      return;
    }

    const t0 = AI_lastProgress = performance.now();

    try{
      if(!gen) gen = AI_planShot(started);

      while(performance.now() - t0 < AI_ENGINE.sliceMs){
        const r = gen.next();

        if(r.done){
          finish(r.value);
          return;
        }
      }
    }catch(err){
      console.error("AI lỗi khi tính cú đánh:", err);
      let shot = null;
      try{ shot = findAIRandomShot(); }catch(e){}
      finish(shot);
      return;
    }

    setTimeout(tick, 0);
  };

  setTimeout(tick, 0);
}

/* =========================
   KẾ HOẠCH CÚ ĐÁNH
   1. Liệt kê cú ăn trực tiếp: mỗi bi mục tiêu × mỗi lỗ có đường đi sạch (điểm ngắm "bi ma").
   2. Mỗi cú: chọn lực theo quãng đường, dò lệch góc nhỏ quanh điểm ngắm để bù "ném" bi,
      rồi tìm hai mép của khoảng góc vẫn vào lỗ và ngắm vào giữa (chắc chắn nhất).
   3. Kỹ thuật điều bi: thử culê / retro / bi dừng / áp phê với vài mức lực; giữ cú vẫn vào lỗ
      và bi cái dừng ở chỗ có cú tiếp theo tốt nhất.
   4. Không có cú ăn trực tiếp: dò quét (chạm bi khác, A băng); vẫn không có thì A băng an toàn chạm đúng bi.
   ========================= */

const AI_DEG = Math.PI / 180;

function AI_baseSpin(){
  return { x: AI_ENGINE.scanSpinX || 0, y: AI_ENGINE.scanSpinY || 0 };
}

function* AI_planShot(started){
  const elapsed = () => performance.now() - started;
  const budget = AI_ENGINE.thinkBudgetMs;
  const targets = getAITargetBalls();

  if(!targets.length) return findAISafeFallbackShot();

  const nowTarget = getCurrentTarget("ai");
  const cands = AI_potCandidates({ x: cueBall.x, y: cueBall.y }, balls, targets)
    .slice(0, AI_ENGINE.potCandidates);
  const found = [];

  for(const c of cands){
    if(elapsed() > budget || (found.length >= 3 && elapsed() > budget * 0.5)) break;

    const shot = yield* AI_findPottingAim(c, elapsed, budget);
    if(shot) found.push(shot);
  }

  if(found.length){
    found.sort((a, b) => b.score - a.score);

    let best = null;

    for(const shot of found.slice(0, AI_ENGINE.techniqueShots)){
      const tuned = yield* AI_chooseTechnique(shot, nowTarget, elapsed, budget * 1.25);
      if(!best || tuned.score > best.score) best = tuned;
    }

    return AI_finalizeShot(best);
  }

  const scan = yield* AI_scanForPot(targets, started);
  if(scan) return scan;

  const safe = yield* AI_scanSafeContact(targets, started);
  if(safe) return safe;

  const shot = findAIRandomShot();
  shot.meta = Object.assign(shot.meta || {}, { label: "AI không tìm thấy cú chạm hợp lệ · đánh ngẫu nhiên" });
  return shot;
}

// Mô phỏng một cú: có ăn đúng bi mục tiêu (bi chạm đầu tiên) không, vào lỗ nào, bi cái có rơi không
function AI_simPot(dir, power, spin, targetNum){
  const sim = simulateDeveloperPhysicsPrediction(dir, power, spin);
  const pocket = sim.firstHitNum === targetNum ? sim.firstHitPocket : null;
  const blackGone = targetNum !== 8 && (sim.finalBalls || []).some(b => b.num === 8 && !b.active);

  return {
    ok: !!pocket && !sim.cuePocket && !blackGone,
    pocketId: pocket ? pocket.id : null,
    scratch: !!sim.cuePocket,
    sim
  };
}

// Lực đủ để bi mục tiêu tới lỗ (có dư), tính ngược từ ma sát và góc cắt; trả về vài mức để thử
function AI_powerOrder(c){
  const vObj = (Math.sqrt(2 * PHYS.ROLL_A * c.pocketDist * 1.35) + 2.5) / 0.75;
  const vHit = vObj / (0.975 * Math.max(0.3, Math.cos(c.cut)));
  const v0 = Math.sqrt(vHit * vHit + 2 * 0.12 * c.cueDist);
  const p = Math.pow(AI_clamp((v0 - 4) / 96, 0, 1), 2 / 3);
  const list = [p, p + 0.08, p + 0.17, p - 0.06, p + 0.3].map(x => AI_clamp(x, 0.12, 0.95));

  return list.filter((x, i) => list.indexOf(x) === i);
}

function* AI_findPottingAim(c, elapsed, budget){
  const spin = AI_baseSpin();
  const goes = (off, p) => {
    const r = AI_simPot(AI_rotate(c.dir, off * AI_DEG), p, spin, c.target.num);
    return r.ok && r.pocketId === c.pocket.id;
  };

  let hit = null;

  outer:
  for(const p of AI_powerOrder(c)){
    for(const off of AI_ENGINE.aimOffsetsDeg){
      if(elapsed() > budget) return null;

      const ok = goes(off, p);
      yield;

      if(ok){
        hit = { off, p };
        break outer;
      }
    }
  }

  if(!hit) return null;

  // Hai mép của khoảng góc vẫn vào lỗ: bước 0,3° tới khi trượt, rồi chia đôi 4 lần
  function* edge(sign){
    let inside = hit.off;
    let outside = null;

    for(let k = 1; k <= 8; k++){
      const t = hit.off + sign * 0.3 * k;
      const ok = goes(t, hit.p);
      yield;

      if(ok) inside = t;
      else { outside = t; break; }
    }

    if(outside === null) return inside;

    for(let k = 0; k < 4; k++){
      const m = (inside + outside) / 2;
      const ok = goes(m, hit.p);
      yield;

      if(ok) inside = m;
      else outside = m;
    }

    return inside;
  }

  const lo = yield* edge(-1);
  const hi = yield* edge(1);
  const center = (lo + hi) / 2;
  const width = hi - lo;

  return {
    c,
    dir: AI_rotate(c.dir, center * AI_DEG),
    power: hit.p,
    spin,
    width,
    mode: "trực tiếp",
    score: c.score + width * 900
  };
}

// Thử các kỹ thuật (xoáy + lực) cho một cú đã vào lỗ; chấm điểm theo vị trí bi cái cho cú tiếp theo
function* AI_chooseTechnique(shot, nowTarget, elapsed, budget){
  const groupAfter = nowTarget === "open" ? shot.c.target.type : nowTarget;
  const powers = [shot.power, shot.power + 0.1, shot.power - 0.07]
    .map(x => AI_clamp(x, 0.12, 0.95))
    .filter((x, i, a) => a.indexOf(x) === i);

  let best = null;

  for(const sp of AI_ENGINE.techniques){
    for(const p of powers){
      if(best && elapsed() > budget) return best;

      const r = AI_simPot(shot.dir, p, sp, shot.c.target.num);
      yield;

      if(!r.ok || r.pocketId !== shot.c.pocket.id) continue;

      const pos = AI_positionScore(r.sim.finalBalls, groupAfter, shot.c.target.num);
      // Ngang điểm thì ưu tiên cú đơn giản: ít áp phê, lực gần lực chuẩn
      const score = shot.score + pos - Math.abs(sp.x) * 120 - Math.abs(p - shot.power) * 300;

      if(!best || score > best.score){
        best = Object.assign({}, shot, { power: p, spin: sp, score, posScore: pos });
      }
    }
  }

  return best || shot;
}

// Bi cái dừng ở đâu thì cú tiếp theo dễ tới đâu (càng cao càng tốt)
function AI_positionScore(list, group, pottedNum){
  const cue = list.find(b => b.num === 0);

  if(!cue || !cue.active) return -6000;
  if(pottedNum === 8) return 0;

  let next = list.filter(b => b.active && b.num !== 0 && b.num !== 8 && b.type === group);
  if(!next.length) next = list.filter(b => b.active && b.num === 8);
  if(!next.length) return 0;

  const cands = AI_potCandidates(cue, list, next);
  let s = 0;

  if(cands.length){
    s += (cands[0].score - 10000) * 0.6 + 900;
    s += Math.min(cands.length, 4) * 110;
  }else{
    s -= 1400;
  }

  // Bi cái nằm sát băng thì khó đánh
  const m = CUSHION_THICKNESS + BALL_R * 1.3;
  if(cue.x < table.x + m || cue.x > table.x + table.w - m || cue.y < table.y + m || cue.y > table.y + table.h - m){
    s -= 260;
  }

  return s;
}

// Các cú ăn trực tiếp nhìn thấy được từ vị trí bi cái cue, với bố cục bi list
function AI_potCandidates(cue, list, targets){
  const out = [];

  for(const t of targets){
    if(!t || !t.active) continue;

    for(const pocket of pockets){
      const od = AI_norm(pocket.x - t.x, pocket.y - t.y);

      // Lỗ giữa chỉ nhận bi đi vào gần vuông góc với băng
      if(pocket.type === "side" && Math.abs(od.x) > 0.82) continue;

      const ghost = { x: t.x - od.x * BALL_R * 2, y: t.y - od.y * BALL_R * 2 };

      if(!AI_isPointPlayable(ghost)) continue;
      if(!AI_segmentClear(list, t.x, t.y, pocket.x, pocket.y, [0, t.num], BALL_R * 2.02)) continue;
      if(!AI_segmentClear(list, cue.x, cue.y, ghost.x, ghost.y, [0, t.num], BALL_R * 2.04)) continue;

      const cueDist = AI_dist(cue.x, cue.y, ghost.x, ghost.y);
      if(cueDist < 1) continue;

      const dir = { x: (ghost.x - cue.x) / cueDist, y: (ghost.y - cue.y) / cueDist };
      const cut = Math.acos(AI_clamp(dir.x * od.x + dir.y * od.y, -1, 1));

      // Cắt quá mỏng nhìn rất hack, bỏ qua
      if(cut > 1.28) continue;

      const pocketDist = AI_dist(t.x, t.y, pocket.x, pocket.y);
      const score = 10000 - cueDist * 0.35 - pocketDist * 0.85 - cut * 1800 + (pocket.type === "corner" ? 520 : 260);

      out.push({ target: t, pocket, ghost, dir, cut, cueDist, pocketDist, score });
    }
  }

  return out.sort((a, b) => b.score - a.score);
}

function AI_isPointPlayable(p){
  const b = AI_getPlayableBounds();
  return p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
}

function AI_segmentClear(list, x1, y1, x2, y2, ignoreNums, clearance){
  for(const b of list){
    if(!b.active || ignoreNums.includes(b.num)) continue;
    if(AI_distancePointToSegment(b.x, b.y, x1, y1, x2, y2) < clearance) return false;
  }

  return true;
}

function AI_distancePointToSegment(px, py, x1, y1, x2, y2){
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;
  const t = AI_clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);

  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

// Không có cú ăn trực tiếp: quét góc chạm bi (kể cả qua băng) với vài mức lực
function* AI_scanForPot(targets, started){
  const limit = AI_ENGINE.thinkBudgetMs + AI_ENGINE.scanExtraMs;
  const powers = [0.42, 0.58, 0.74, 0.9];

  for(const mode of ["direct", "kick"]){
    for(const t of targets){
      if(!t.active) continue;

      const angles = mode === "direct" ? AI_buildDirectAnglesToTarget(t) : AI_buildKickAnglesToTarget(t);

      for(const a of angles){
        for(const p of powers){
          if(performance.now() - started > limit) return null;

          const dir = { x: Math.cos(a), y: Math.sin(a) };
          const r = AI_simPot(dir, p, AI_baseSpin(), t.num);
          yield;

          if(r.ok){
            return AI_finalizeShot({
              c: { target: t, pocket: AI_getPocketById(r.pocketId) },
              dir, power: p, spin: AI_baseSpin(),
              mode: mode === "direct" ? "dò góc" : "A băng"
            });
          }
        }
      }
    }
  }

  return null;
}

// Cú an toàn: chạm đúng bi mục tiêu rồi có bi chạm băng (không phạm lỗi)
function* AI_scanSafeContact(targets, started){
  const limit = AI_ENGINE.thinkBudgetMs + AI_ENGINE.scanExtraMs + AI_ENGINE.safeExtraMs;
  const powers = [0.36, 0.5, 0.66];

  for(const t of targets){
    if(!t.active) continue;

    const angles = AI_buildDirectAnglesToTarget(t).concat(AI_buildKickAnglesToTarget(t, AI_ENGINE.safeKickAngleSamples));

    for(const a of angles){
      for(const p of powers){
        if(performance.now() - started > limit) return null;

        const dir = { x: Math.cos(a), y: Math.sin(a) };
        const r = AI_predictLegalContact(dir, p, t.num);
        yield;

        if(r.ok){
          return {
            dir, power: p, spinX: AI_ENGINE.scanSpinX || 0, spinY: AI_ENGINE.scanSpinY || 0,
            meta: { mode: "safe", targetNum: t.num, label: `AI chơi an toàn: chạm bi ${t.num} · lực ${Math.round(p * 100)}%` }
          };
        }
      }
    }
  }

  return null;
}

function AI_describeSpin(sp){
  const parts = [];

  if(sp.y > 0.25) parts.push("culê");
  else if(sp.y < -0.25) parts.push("retro");
  else parts.push("bi dừng");

  if(sp.x > 0.25) parts.push("áp phê phải");
  else if(sp.x < -0.25) parts.push("áp phê trái");

  return parts.join(" + ");
}

function AI_finalizeShot(s){
  const tech = AI_describeSpin(s.spin);
  const pocket = s.c.pocket;
  const where = pocket ? (pocket.type === "corner" ? "lỗ góc" : "lỗ giữa") : "lỗ";
  const label = `AI: bi ${s.c.target.num} vào ${where} · ${tech} · lực ${Math.round(s.power * 100)}%`;

  return {
    dir: s.dir,
    power: s.power,
    spinX: s.spin.x,
    spinY: s.spin.y,
    meta: {
      mode: s.mode || "trực tiếp",
      targetNum: s.c.target.num,
      targetPocketId: pocket ? pocket.id : null,
      technique: tech,
      label
    }
  };
}

/*
  Bi trong tay: đặt bi cái để có cú ăn thẳng/ít cắt, khoảng cách vừa phải, đường đi sạch.
  Trả null nếu không tìm được chỗ tốt (bida.html sẽ đặt ngẫu nhiên như cũ).
*/
function AI_pickBallInHandSpot(){
  const targets = getAITargetBalls();
  const zone = typeof getFullCueZone === "function" ? getFullCueZone() : null;
  let best = null;

  for(const t of targets){
    for(const pocket of pockets){
      const od = AI_norm(pocket.x - t.x, pocket.y - t.y);

      if(pocket.type === "side" && Math.abs(od.x) > 0.82) continue;

      const ghost = { x: t.x - od.x * BALL_R * 2, y: t.y - od.y * BALL_R * 2 };

      if(!AI_isPointPlayable(ghost)) continue;
      if(!AI_segmentClear(balls, t.x, t.y, pocket.x, pocket.y, [0, t.num], BALL_R * 2.02)) continue;

      const pocketDist = AI_dist(t.x, t.y, pocket.x, pocket.y);

      for(const dist of [120, 180, 250]){
        for(const ang of [0.12, -0.12, 0.3, -0.3, 0]){
          const d = AI_rotate(od, ang);
          const spot = { x: ghost.x - d.x * dist, y: ghost.y - d.y * dist };

          if(zone && (spot.x < zone.left || spot.x > zone.right || spot.y < zone.top || spot.y > zone.bottom)) continue;
          if(!AI_isPointPlayable(spot) || !isCueSpotFree(spot.x, spot.y)) continue;
          if(!AI_segmentClear(balls, spot.x, spot.y, ghost.x, ghost.y, [0, t.num], BALL_R * 2.04)) continue;

          // Hơi cắt một chút giúp điều bi dễ hơn đánh thẳng tuyệt đối
          const score = 10000 - pocketDist * 0.85 - Math.abs(Math.abs(ang) - 0.12) * 1500 - Math.abs(dist - 180) * 0.6 +
            (pocket.type === "corner" ? 520 : 260);

          if(!best || score > best.score) best = { x: spot.x, y: spot.y, score };
        }
      }
    }
  }

  return best ? { x: best.x, y: best.y } : null;
}

/* =========================
   TARGET FILTER
   ========================= */

function getAITargetBalls(){
  const targetType = getCurrentTarget("ai");

  if(targetType === "open"){
    return balls.filter(b =>
      b.active &&
      b.num !== 0 &&
      b.num !== 8 &&
      (b.type === "solid" || b.type === "stripe")
    );
  }

  if(targetType === "black"){
    return balls.filter(b =>
      b.active &&
      b.num === 8
    );
  }

  return balls.filter(b =>
    b.active &&
    b.type === targetType
  );
}

/* =========================
   BREAK SHOT
   ========================= */

function findAIBreakShot(){
  const objectBalls = balls.filter(b =>
    b.active &&
    b.num !== 0
  );

  if(!objectBalls.length){
    return {
      dir:{x:1, y:0},
      power:0.72,
      spinX:0,
      spinY:0.10
    };
  }

  let apex = objectBalls[0];

  for(const b of objectBalls){
    if(b.x < apex.x){
      apex = b;
    }
  }

  const offset = Math.random() < 0.5
    ? -BALL_R * 0.42
    : BALL_R * 0.42;

  let dir = AI_norm(
    apex.x - cueBall.x,
    apex.y + offset - cueBall.y
  );

  dir = AI_rotate(dir, AI_rand(-0.004, 0.004));

  return {
    dir,
    power:0.95,
    spinX:AI_rand(-0.06, 0.06),
    spinY:0.16,
    meta:{ label:"AI.GiaBao phá bi" }
  };
}

/* =========================
   ANGLE BUILDERS
   ========================= */

function AI_buildDirectAnglesToTarget(target){
  const dx = target.x - cueBall.x;
  const dy = target.y - cueBall.y;
  const d = Math.hypot(dx, dy);

  if(d <= BALL_R * 2.2) return [];

  const center = Math.atan2(dy, dx);

  /*
    Vùng bi cái có thể chạm bi mục tiêu:
    bán kính va chạm = 2R.
    AI quét từ mép trái sang mép phải vùng này.
  */
  const half = Math.asin(
    AI_clamp((BALL_R * 2.02) / d, 0, 0.985)
  ) * 1.04;

  return AI_makeZigZagAngles(
    center,
    half,
    AI_ENGINE.directAngleSamples
  );
}

function AI_buildKickAnglesToTarget(target, sampleCount = AI_ENGINE.kickAngleSamples){
  const bounds = AI_getPlayableBounds();
  const rails = ["top", "bottom", "left", "right"];
  const result = [];

  for(const rail of rails){
    const virtualTarget = AI_reflectPointByRail(
      {
        x: target.x,
        y: target.y
      },
      rail,
      bounds
    );

    if(!virtualTarget) continue;

    const dx = virtualTarget.x - cueBall.x;
    const dy = virtualTarget.y - cueBall.y;
    const d = Math.hypot(dx, dy);

    if(d <= BALL_R * 2.2) continue;

    const center = Math.atan2(dy, dx);

    const half = Math.asin(
      AI_clamp((BALL_R * 2.05) / d, 0, 0.985)
    ) * 1.14;

    const angles = AI_makeZigZagAngles(
      center,
      half,
      sampleCount
    );

    for(const a of angles){
      const dir = {
        x: Math.cos(a),
        y: Math.sin(a)
      };

      const hitRail = AI_firstRailByRay(
        cueBall.x,
        cueBall.y,
        dir,
        bounds
      );

      if(hitRail === rail){
        result.push(a);
      }
    }
  }

  return AI_uniqueAngles(result);
}

function AI_makeZigZagAngles(center, half, samples){
  samples = Math.max(3, samples | 0);

  const linear = [];

  for(let i = 0; i < samples; i++){
    const t = samples === 1 ? 0.5 : i / (samples - 1);
    linear.push(center - half + half * 2 * t);
  }

  /*
    Dò qua dò lại:
    center trước, sau đó lệch phải/trái dần ra mép.
  */
  linear.sort((a, b) => {
    return Math.abs(a - center) - Math.abs(b - center);
  });

  return linear;
}

function AI_uniqueAngles(list){
  const result = [];

  for(const a of list){
    let exists = false;

    for(const b of result){
      if(Math.abs(AI_angleDiff(a, b)) < 0.0009){
        exists = true;
        break;
      }
    }

    if(!exists){
      result.push(a);
    }
  }

  return result;
}

function AI_predictLikeDeveloper(dir, power, targetNum){
  /*
    AI phải dùng đúng mô phỏng của Developer Mode.
    Developer Mode đang dùng cơ chế lỗ mới của game chính,
    nên AI cũng sẽ đánh theo cùng logic.
  */

  const shotSpin = {
    x: AI_ENGINE.scanSpinX || 0,
    y: AI_ENGINE.scanSpinY || 0
  };

  let sim = null;

  if(typeof simulateDeveloperPhysicsPrediction === "function"){
    sim = simulateDeveloperPhysicsPrediction(
      dir,
      power,
      shotSpin
    );
  }else{
    // Dự phòng nếu file chính chưa load hàm Developer prediction
    return AI_simulateShot(dir, power, targetNum);
  }

  const targetPocket = AI_getTargetPocketFromMainSim(sim, targetNum);
  const cueScratch = !!(sim && sim.cuePocket);

  const ok =
    sim &&
    sim.firstHitNum === targetNum &&
    targetPocket &&
    !cueScratch;

  return {
    ok,
    reason: ok ? "main_pocket_confirmed" : "main_pocket_failed",
    firstHitNum: sim ? sim.firstHitNum : null,
    targetPocketId: targetPocket ? targetPocket.id : null,
    cueScratch,
    sim
  };
}

function AI_getTargetPocketFromMainSim(sim, targetNum){
  if(!sim) return null;

  /*
    Bản Developer hiện tại trả:
    - firstHitNum
    - firstHitPocket
    - cuePocket

    Nghĩa là: bi đầu tiên AI chạm đã thật sự rơi vào lỗ.
  */
  if(sim.firstHitNum === targetNum && sim.firstHitPocket){
    return sim.firstHitPocket;
  }

  /*
    Dự phòng nếu sau này bạn nâng cấp simulateDeveloperPhysicsPrediction
    trả danh sách potted/pottedBalls.
  */
  const lists = [
    sim.potted,
    sim.pottedBalls,
    sim.pottedObjects
  ];

  for(const list of lists){
    if(!Array.isArray(list)) continue;

    for(const item of list){
      const num = item.num ?? item.ballNum ?? item.targetNum;
      const pocket = item.pocket ?? item.firstHitPocket ?? null;

      if(num === targetNum && pocket){
        return pocket;
      }
    }
  }

  return null;
}
/* =========================
   SAFE KICK CONTACT
   Khi không ăn được bi, AI tìm cú A băng chạm đúng bi mục tiêu
   ========================= */

function AI_predictLegalContact(dir, power, targetNum){
  const sim = AI_simulateLegalContactShot(dir, power, targetNum);

  const ok =
    sim &&
    sim.firstHitNum === targetNum &&
    !sim.cueScratch &&
    !sim.blackPottedBad &&
    (
      sim.targetPotted ||
      sim.anyObjectPotted ||
      sim.railAfterFirstHit
    );

  return {
    ok,
    reason: ok ? "legal_contact" : "illegal_contact",
    firstHitNum: sim.firstHitNum,
    targetPocketId: sim.targetPocketId,
    cueScratch: sim.cueScratch,
    railAfterFirstHit: sim.railAfterFirstHit,
    targetPotted: sim.targetPotted,
    anyObjectPotted: sim.anyObjectPotted,
    blackPottedBad: sim.blackPottedBad,
    frames: sim.frames,
    sim
  };
}

function AI_simulateLegalContactShot(dir, power, targetNum){
  const simBalls = balls.map(b => ({
    num:b.num,
    type:b.type,
    x:b.x,
    y:b.y,
    vx:0,
    vy:0,
    rx:0,
    ry:0,
    sz:0,
    active:b.active,
    potted:b.potted
  }));

  const simCue = simBalls.find(b => b.num === 0);

  if(!simCue || !simCue.active){
    return {
      firstHitNum:null,
      cueScratch:true,
      railAfterFirstHit:false,
      targetPotted:false,
      anyObjectPotted:false,
      blackPottedBad:false,
      targetPocketId:null,
      frames:0
    };
  }

  strikeCueBall(simCue, dir, power, {
    x: AI_ENGINE.scanSpinX || 0,
    y: AI_ENGINE.scanSpinY || 0
  });

  let firstHitNum = null;
  let cueScratch = false;
  let railAfterFirstHit = false;
  let targetPotted = false;
  let anyObjectPotted = false;
  let blackPottedBad = false;
  let targetPocketId = null;
  let frames = 0;
  const onHitFirst = hitNum => { if(firstHitNum === null) firstHitNum = hitNum; };

  const currentTarget = getCurrentTarget("ai");
  const blackIsLegal = currentTarget === "black";

  for(frames = 0; frames < AI_ENGINE.simFrameLimit; frames++){
    let maxSpeed = 0;

    for(const b of simBalls){
      if(!b.active) continue;

      AI_limitSimBallSpeed(b);
      maxSpeed = Math.max(maxSpeed, Math.hypot(b.vx, b.vy), Math.hypot(b.rx, b.ry));
    }

    if(frames > 0 && !simBalls.some(isBallMoving)){
      break;
    }

    const steps = AI_clamp(
      Math.ceil(maxSpeed / (BALL_R * 0.22)),
      2,
      24
    );

    for(let s = 0; s < steps; s++){
      for(const b of simBalls){
        if(!b.active || ballIsResting(b)) continue;

        clothStep(b, 1 / steps);
        AI_limitSimBallSpeed(b);

        const pocket = AI_simHandlePocketStrict(b);

        if(pocket){
          if(b.num === 0){
            cueScratch = true;
          }else{
            anyObjectPotted = true;

            if(b.num === targetNum){
              targetPotted = true;
              targetPocketId = pocket.id;
            }

            if(b.num === 8 && !blackIsLegal){
              blackPottedBad = true;
            }
          }
        }

        if(b.active){
          const jawHit = AI_applyMainPocketJawsForLegalSim(b);
          const railHit = AI_simHandleRailTrack(b);

          if(firstHitNum !== null && (jawHit || railHit)){
            railAfterFirstHit = true;
          }

          AI_limitSimBallSpeed(b);
        }
      }

      AI_simHandleCollisionsLegal(simBalls, onHitFirst);

      for(const b of simBalls){
        if(!b.active) continue;

        const pocket = AI_simHandlePocketStrict(b);

        if(pocket){
          if(b.num === 0){
            cueScratch = true;
          }else{
            anyObjectPotted = true;

            if(b.num === targetNum){
              targetPotted = true;
              targetPocketId = pocket.id;
            }

            if(b.num === 8 && !blackIsLegal){
              blackPottedBad = true;
            }
          }
        }

        if(b.active){
          const jawHit = AI_applyMainPocketJawsForLegalSim(b);
          const railHit = AI_simHandleRailTrack(b);

          if(firstHitNum !== null && (jawHit || railHit)){
            railAfterFirstHit = true;
          }

          AI_limitSimBallSpeed(b);
        }
      }

      if(cueScratch || blackPottedBad){
        break;
      }
    }

    if(cueScratch || blackPottedBad){
      break;
    }
  }

  return {
    firstHitNum,
    cueScratch,
    railAfterFirstHit,
    targetPotted,
    anyObjectPotted,
    blackPottedBad,
    targetPocketId,
    frames
  };
}

function AI_applyMainPocketJawsForLegalSim(b){
  let hit = false;

  if(typeof applyCornerPocketJaws === "function"){
    hit = applyCornerPocketJaws(b, false) || hit;
  }

  if(typeof applySidePocketMiddleJaws === "function"){
    hit = applySidePocketMiddleJaws(b) || hit;
  }

  return hit;
}

function AI_simHandlePocketStrict(b){
  if(b.potted){
    return null;
  }

  for(const p of pockets){
    let hit = false;

    if(typeof shouldCapturePocketBall === "function"){
      hit = shouldCapturePocketBall(b, p);
    }else{
      hit = AI_isPocketHitByMainRule(b, p);
    }

    if(!hit){
      continue;
    }

    b.active = false;
    b.potted = true;
    stopBall(b);

    return p;
  }

  return null;
}

function AI_simHandleCollisionsLegal(simBalls, onCueFirstHit){
  resolveBallContacts(simBalls, (a, b) => {
    if(a.num === 0 && b.num !== 0){
      onCueFirstHit(b.num);
    }

    if(b.num === 0 && a.num !== 0){
      onCueFirstHit(a.num);
    }
  });
}

function AI_simHandleRailTrack(b){
  const bounds = AI_getPlayableBounds();

  const left = bounds.left;
  const right = bounds.right;
  const top = bounds.top;
  const bottom = bounds.bottom;

  const openTopBottom = AI_isTopBottomPocketOpeningX(b.x);
  const openLeftRight = AI_isLeftRightPocketOpeningY(b.y);

  const movingToTopPocket = openTopBottom && b.vy < -0.15;
  const movingToBottomPocket = openTopBottom && b.vy > 0.15;
  const movingToLeftPocket = openLeftRight && b.vx < -0.15;
  const movingToRightPocket = openLeftRight && b.vx > 0.15;

  let hit = false;

  if(b.x < left && !movingToLeftPocket){
    bounceOffPlane(b, 1, 0, left - b.x);
    hit = true;
  }

  if(b.x > right && !movingToRightPocket){
    bounceOffPlane(b, -1, 0, b.x - right);
    hit = true;
  }

  if(b.y < top && !movingToTopPocket){
    bounceOffPlane(b, 0, 1, top - b.y);
    hit = true;
  }

  if(b.y > bottom && !movingToBottomPocket){
    bounceOffPlane(b, 0, -1, b.y - bottom);
    hit = true;
  }

  const safeLeft = table.x - BALL_R * 2;
  const safeRight = table.x + table.w + BALL_R * 2;
  const safeTop = table.y - BALL_R * 2;
  const safeBottom = table.y + table.h + BALL_R * 2;

  if(b.x < safeLeft){
    b.x = left;
    b.vx = Math.abs(b.vx) * 0.55;
  }

  if(b.x > safeRight){
    b.x = right;
    b.vx = -Math.abs(b.vx) * 0.55;
  }

  if(b.y < safeTop){
    b.y = top;
    b.vy = Math.abs(b.vy) * 0.55;
  }

  if(b.y > safeBottom){
    b.y = bottom;
    b.vy = -Math.abs(b.vy) * 0.55;
  }

  return hit;
}
/* =========================
   FALLBACK
   ========================= */
function findAIRandomShot(){
  const targets = getAITargetBalls();

  let ball = null;

  if(targets.length){
    ball = targets[Math.floor(Math.random() * targets.length)];
  }else{
    const anyBalls = balls.filter(b =>
      b.active &&
      b.num !== 0
    );

    ball = anyBalls.length
      ? anyBalls[Math.floor(Math.random() * anyBalls.length)]
      : null;
  }

  if(!ball){
    return {
      dir:{x:1, y:0},
      power:0.45,
      spinX:0,
      spinY:0
    };
  }

  const dx = ball.x - cueBall.x;
  const dy = ball.y - cueBall.y;
  const d = Math.hypot(dx, dy);

  const centerAngle = Math.atan2(dy, dx);

  const halfAngle = d > BALL_R * 2.2
    ? Math.asin(
        AI_clamp((BALL_R * 2.02) / d, 0, 0.985)
      ) * 1.05
    : 0.25;

  const angle = centerAngle + AI_rand(-halfAngle, halfAngle);

  const powerPct = AI_rand(
    AI_ENGINE.randomPowerMinPct,
    AI_ENGINE.randomPowerMaxPct
  );

  return {
    dir:{
      x:Math.cos(angle),
      y:Math.sin(angle)
    },
    power:powerPct / 100,
    spinX:AI_ENGINE.scanSpinX || 0,
    spinY:AI_ENGINE.scanSpinY || 0.08,
    meta:{
      mode:"random",
      targetNum:ball.num
    }
  };
}

function findAISafeFallbackShot(){
  const targets = getAITargetBalls();

  let nearest = null;

  for(const b of targets){
    const d = AI_dist(cueBall.x, cueBall.y, b.x, b.y);

    if(!nearest || d < nearest.d){
      nearest = {
        ball:b,
        d
      };
    }
  }

  const ball = nearest
    ? nearest.ball
    : balls.find(b => b.active && b.num !== 0);

  if(!ball){
    return {
      dir:{x:1, y:0},
      power:0.42,
      spinX:0,
      spinY:0
    };
  }

  const dir = AI_norm(
    ball.x - cueBall.x,
    ball.y - cueBall.y
  );

  return {
    dir,
    power:0.56,
    spinX:0,
    spinY:0.08,
    meta:{
      mode:"fallback",
      targetNum:ball.num
    }
  };
}

/* Không ép ăn nữa */
function prepareAIForcePot(){}

/* =========================
   PHYSICS SIMULATOR
   ========================= */
function AI_applyMainPocketJawsForSim(b){
  /*
    Dùng đúng mép lỗ / hàm va chạm mép lỗ của game chính.
    Nếu game chính đã sửa applyCornerPocketJaws / applySidePocketMiddleJaws
    thì AI fallback cũng chạy cùng cơ chế.
  */

  if(typeof applyCornerPocketJaws === "function"){
    applyCornerPocketJaws(b, false);
  }

  if(typeof applySidePocketMiddleJaws === "function"){
    applySidePocketMiddleJaws(b);
  }
}

function AI_simulateShot(dir, power, targetNum){
  const simBalls = balls.map(b => ({
    num:b.num,
    type:b.type,
    x:b.x,
    y:b.y,
    vx:0,
    vy:0,
    rx:0,
    ry:0,
    sz:0,
    active:b.active,
    potted:b.potted
  }));

  const simCue = simBalls.find(b => b.num === 0);

  if(!simCue || !simCue.active){
    return {
      ok:false,
      reason:"no_cue"
    };
  }

  strikeCueBall(simCue, dir, power, {
    x: AI_ENGINE.scanSpinX || 0,
    y: AI_ENGINE.scanSpinY || 0
  });

  let firstHitNum = null;
  let cueScratch = false;
  let targetPotted = false;
  let targetPocketId = null;
  let frames = 0;
  const onHitFirst = hitNum => { if(firstHitNum === null) firstHitNum = hitNum; };

  for(frames = 0; frames < AI_ENGINE.simFrameLimit; frames++){
    let maxSpeed = 0;

    for(const b of simBalls){
      if(!b.active) continue;

      AI_limitSimBallSpeed(b);

      const sp = Math.max(Math.hypot(b.vx, b.vy), Math.hypot(b.rx, b.ry));
      if(sp > maxSpeed) maxSpeed = sp;
    }

    if(frames > 0 && !simBalls.some(isBallMoving)){
      break;
    }

    const steps = AI_clamp(
      Math.ceil(maxSpeed / (BALL_R * 0.22)),
      2,
      24
    );

    for(let s = 0; s < steps; s++){
      for(const b of simBalls){
        if(!b.active || ballIsResting(b)) continue;

        clothStep(b, 1 / steps);

        const pocket = AI_simHandlePocket(b);

        if(pocket){
          if(b.num === 0){
            cueScratch = true;
          }

          if(b.num === targetNum){
            targetPotted = true;
            targetPocketId = pocket.id;
          }
        }

        if(b.active){
  AI_applyMainPocketJawsForSim(b);
  AI_simHandleRail(b);
}
      }

      AI_simHandleCollisions(simBalls, onHitFirst);

      for(const b of simBalls){
        if(!b.active) continue;

        const pocket = AI_simHandlePocket(b);

        if(pocket){
          if(b.num === 0){
            cueScratch = true;
          }

          if(b.num === targetNum){
            targetPotted = true;
            targetPocketId = pocket.id;
          }
        }

        if(b.active){
  AI_applyMainPocketJawsForSim(b);
  AI_simHandleRail(b);
  AI_limitSimBallSpeed(b);
}
      }

      if(targetPotted){
        break;
      }
    }

    if(targetPotted){
      break;
    }
  }

  const ok =
    !cueScratch &&
    firstHitNum === targetNum &&
    targetPotted;

  return {
    ok,
    reason: ok ? "target_potted" : "failed",
    firstHitNum,
    cueScratch,
    targetPotted,
    targetPocketId,
    frames
  };
}

function AI_limitSimBallSpeed(b){
  const sp = Math.hypot(b.vx, b.vy);

  if(sp > AI_ENGINE.maxBallSpeed){
    const k = AI_ENGINE.maxBallSpeed / sp;
    b.vx *= k;
    b.vy *= k;
  }
}

function AI_simHandleCollisions(simBalls, onCueFirstHit){
  resolveBallContacts(simBalls, (a, b) => {
    if(a.num === 0 && b.num !== 0){
      onCueFirstHit(b.num);
    }

    if(b.num === 0 && a.num !== 0){
      onCueFirstHit(a.num);
    }
  });
}

function AI_simHandlePocket(b){
  for(const p of pockets){
    if(!AI_isPocketHitByMainRule(b, p)){
      continue;
    }

    b.active = false;
    b.potted = true;
    stopBall(b);

    return p;
  }

  return null;
}

function AI_isPocketHitByMainRule(b, pocket){
  /*
    Ưu tiên cao nhất:
    gọi trực tiếp cơ chế lỗ mới từ file game chính.
  */
  if(typeof isPocketPhysicsHit === "function"){
    return isPocketPhysicsHit(b.x, b.y, pocket);
  }

  /*
    Dự phòng nếu thiếu hàm chính.
    Không nên xảy ra nếu aiengine.js đang đặt sau script chính.
  */
  const r = pocket.type === "side"
    ? SIDE_POCKET_R + BALL_R * 0.45
    : CORNER_POCKET_R + BALL_R * 0.55;

  return Math.hypot(b.x - pocket.x, b.y - pocket.y) <= r;
}

function AI_simHandleRail(b){
  const bounds = AI_getPlayableBounds();

  const left = bounds.left;
  const right = bounds.right;
  const top = bounds.top;
  const bottom = bounds.bottom;

  const openTopBottom = AI_isTopBottomPocketOpeningX(b.x);
  const openLeftRight = AI_isLeftRightPocketOpeningY(b.y);

  const movingToTopPocket = openTopBottom && b.vy < -0.15;
  const movingToBottomPocket = openTopBottom && b.vy > 0.15;
  const movingToLeftPocket = openLeftRight && b.vx < -0.15;
  const movingToRightPocket = openLeftRight && b.vx > 0.15;

  if(b.x < left && !movingToLeftPocket){
    bounceOffPlane(b, 1, 0, left - b.x);
  }

  if(b.x > right && !movingToRightPocket){
    bounceOffPlane(b, -1, 0, b.x - right);
  }

  if(b.y < top && !movingToTopPocket){
    bounceOffPlane(b, 0, 1, top - b.y);
  }

  if(b.y > bottom && !movingToBottomPocket){
    bounceOffPlane(b, 0, -1, b.y - bottom);
  }

  const safeLeft = table.x - BALL_R * 2;
  const safeRight = table.x + table.w + BALL_R * 2;
  const safeTop = table.y - BALL_R * 2;
  const safeBottom = table.y + table.h + BALL_R * 2;

  if(b.x < safeLeft){
    b.x = left;
    b.vx = Math.abs(b.vx) * 0.55;
  }

  if(b.x > safeRight){
    b.x = right;
    b.vx = -Math.abs(b.vx) * 0.55;
  }

  if(b.y < safeTop){
    b.y = top;
    b.vy = Math.abs(b.vy) * 0.55;
  }

  if(b.y > safeBottom){
    b.y = bottom;
    b.vy = -Math.abs(b.vy) * 0.55;
  }
}

/* =========================
   GEOMETRY
   ========================= */

function AI_getPlayableBounds(){
  return {
    left: table.x + CUSHION_THICKNESS + BALL_R,
    right: table.x + table.w - CUSHION_THICKNESS - BALL_R,
    top: table.y + CUSHION_THICKNESS + BALL_R,
    bottom: table.y + table.h - CUSHION_THICKNESS - BALL_R
  };
}

function AI_reflectPointByRail(p, rail, bounds){
  if(rail === "top"){
    return {
      x:p.x,
      y:2 * bounds.top - p.y
    };
  }

  if(rail === "bottom"){
    return {
      x:p.x,
      y:2 * bounds.bottom - p.y
    };
  }

  if(rail === "left"){
    return {
      x:2 * bounds.left - p.x,
      y:p.y
    };
  }

  if(rail === "right"){
    return {
      x:2 * bounds.right - p.x,
      y:p.y
    };
  }

  return null;
}

function AI_firstRailByRay(x, y, dir, bounds){
  let best = null;

  function testRail(name, t){
    if(!isFinite(t) || t <= 0) return;

    const px = x + dir.x * t;
    const py = y + dir.y * t;

    if(name === "top" || name === "bottom"){
      if(px < bounds.left || px > bounds.right) return;
    }

    if(name === "left" || name === "right"){
      if(py < bounds.top || py > bounds.bottom) return;
    }

    if(!best || t < best.t){
      best = {
        name,
        t
      };
    }
  }

  if(dir.y < -0.001){
    testRail("top", (bounds.top - y) / dir.y);
  }

  if(dir.y > 0.001){
    testRail("bottom", (bounds.bottom - y) / dir.y);
  }

  if(dir.x < -0.001){
    testRail("left", (bounds.left - x) / dir.x);
  }

  if(dir.x > 0.001){
    testRail("right", (bounds.right - x) / dir.x);
  }

  return best ? best.name : null;
}

function AI_isTopBottomPocketOpeningX(x){
  const midX = table.x + table.w / 2;

  return (
    x < table.x + CORNER_RAIL_OPEN ||
    x > table.x + table.w - CORNER_RAIL_OPEN ||
    Math.abs(x - midX) < SIDE_MOUTH_HALF + BALL_R * 0.45
  );
}

function AI_isLeftRightPocketOpeningY(y){
  return (
    y < table.y + CORNER_RAIL_OPEN ||
    y > table.y + table.h - CORNER_RAIL_OPEN
  );
}

function AI_getPocketById(id){
  return pockets.find(p => p.id === id) || pockets[0];
}

function AI_norm(x, y){
  const l = Math.hypot(x, y) || 1;

  return {
    x:x / l,
    y:y / l
  };
}

function AI_rotate(v, angle){
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return {
    x:v.x * c - v.y * s,
    y:v.x * s + v.y * c
  };
}

function AI_angleDiff(a, b){
  let d = a - b;

  while(d > Math.PI) d -= Math.PI * 2;
  while(d < -Math.PI) d += Math.PI * 2;

  return d;
}

function AI_clamp(v, min, max){
  return Math.max(min, Math.min(max, v));
}

function AI_dist(x1, y1, x2, y2){
  return Math.hypot(x2 - x1, y2 - y1);
}

function AI_rand(min, max){
  return min + Math.random() * (max - min);
}

/* =========================
   DEBUG EXPORT
   ========================= */

window.AIEngine = {
  aiTakeShot,
  startAIThinkSearch,
  getAITargetBalls,
  findAIBreakShot,
  findAISafeFallbackShot,
  AI_simulateShot
};