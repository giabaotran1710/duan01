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
  powerMinPct: 60,
powerMaxPct: 99,

// AI dò bằng đúng spin này và khi đánh cũng dùng đúng spin này.
// Muốn giống bi tâm: để 0,0.
// Muốn hơi cule nhẹ: spinY 0.08.
scanSpinX: 0,
scanSpinY: 0.08,

  // Mỗi nhịp xử lý bao nhiêu mô phỏng.
  // Máy yếu: 4 - 8
  // Máy mạnh: 12 - 20
  scanPerTick: 20,

  // Giới hạn frame mô phỏng cho mỗi cú thử.
  simFrameLimit: 760,

  // Giới hạn tốc độ giống file chính.
  maxBallSpeed: 72,
  directScanMaxMs: 6000,
kickScanMaxMs: 6000,

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
    if(gameOver) return;
    if(turn !== "ai") return;

    aiThinking = false;

    showAICueAndShoot(
      bestShot,
      AI_ENGINE.previewMs
    );
  });
}

/* Hàm này được HTML chính gọi sau khi AI đặt bi cái */
function startAIThinkSearch(done){
  const token = ++AI_SCAN_TOKEN;

  const targets = getAITargetBalls()
    .slice()
    .sort((a, b) => {
      const da = AI_dist(cueBall.x, cueBall.y, a.x, a.y);
      const db = AI_dist(cueBall.x, cueBall.y, b.x, b.y);
      return da - db;
    });

  if(!targets.length){
    done(findAISafeFallbackShot());
    return;
  }

  const job = {
    token,
    done,
    targets,

    targetIndex: 0,
    phase: "direct",
phaseStartedAt: performance.now(),
    angles: null,
    angleIndex: 0,
    powerPct: AI_ENGINE.powerMinPct,

    bestForCurrentTarget: null
  };

  setTimeout(() => AI_processScanJob(job), 0);
}

function AI_processScanJob(job){
  if(job.token !== AI_SCAN_TOKEN) return;
  if(gameOver) return;
  if(turn !== "ai") return;

  // Hết thời gian dò phase hiện tại
  if(AI_isPhaseTimeout(job)){
    AI_handlePhaseTimeout(job);
    return;
  }

  let count = 0;

  while(count < AI_ENGINE.scanPerTick){
    if(AI_isPhaseTimeout(job)){
      AI_handlePhaseTimeout(job);
      return;
    }

    const target = job.targets[job.targetIndex];

    // Đã dò hết toàn bộ bi ở phase hiện tại
    if(!target){
      if(job.phase === "direct"){
        AI_switchToKickPhase(job);
        return;
      }

      const randomShot = findAIRandomShot();
      setMessage("AI không tìm thấy case phù hợp · đánh ngẫu nhiên", true);
      job.done(randomShot);
      return;
    }

    if(!target.active){
      AI_nextTarget(job);
      continue;
    }

    if(!job.angles){
      if(job.phase === "direct"){
        job.angles = AI_buildDirectAnglesToTarget(target);
      }else{
        job.angles = AI_buildKickAnglesToTarget(target);
      }

      job.angleIndex = 0;
      job.powerPct = AI_ENGINE.powerMinPct;
      job.bestForCurrentTarget = null;

      if(!job.angles.length){
        AI_nextTarget(job);
        continue;
      }
    }

    const angle = job.angles[job.angleIndex];
    const power = job.powerPct / 100;

    const dir = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };

    const sim = AI_predictLikeDeveloper(
      dir,
      power,
      target.num
    );

    if(sim.ok){
      const shot = AI_makeShotFromSimulation(
        dir,
        power,
        target,
        sim,
        job.phase
      );

      setMessage(
        `AI tìm thấy case: bi ${shot.meta.targetNum} vào lỗ · lực ${Math.round(shot.power * 100)}% · ${shot.meta.mode}`,
        true
      );

      AI_SCAN_TOKEN++;

      job.done(shot);
      return;
    }

    AI_advanceScanCursor(job);
    count++;
  }

  const t = job.targets[job.targetIndex];
  const elapsed = Math.floor((performance.now() - job.phaseStartedAt) / 1000);
  const maxTime = job.phase === "direct"
    ? AI_ENGINE.directScanMaxMs / 1000
    : AI_ENGINE.kickScanMaxMs / 1000;

  if(t){
    setMessage(
      `AI.GiaBao đang suy nghĩ...`,
      true
    );
  }

  setTimeout(() => AI_processScanJob(job), 0);
}

function AI_isPhaseTimeout(job){
  const now = performance.now();

  const maxMs = job.phase === "direct"
    ? AI_ENGINE.directScanMaxMs
    : AI_ENGINE.kickScanMaxMs;

  return now - job.phaseStartedAt >= maxMs;
}

function AI_handlePhaseTimeout(job){
  if(job.phase === "direct"){
    setMessage("AI.GiaBao đang suy nghĩ...", true);
    AI_switchToKickPhase(job);
    return;
  }

  const randomShot = findAIRandomShot();

  setMessage("AI không thấy cú A băng phù hợp · đánh ngẫu nhiên", true);

  AI_SCAN_TOKEN++;
  job.done(randomShot);
}

function AI_switchToKickPhase(job){
  job.phase = "kick";
  job.phaseStartedAt = performance.now();

  job.targetIndex = 0;
  job.angles = null;
  job.angleIndex = 0;
  job.powerPct = AI_ENGINE.powerMinPct;
  job.bestForCurrentTarget = null;

  setTimeout(() => AI_processScanJob(job), 0);
}

function AI_advanceScanCursor(job){
  job.powerPct++;

  if(job.powerPct <= AI_ENGINE.powerMaxPct){
    return;
  }

  job.powerPct = AI_ENGINE.powerMinPct;
  job.angleIndex++;

  if(job.angleIndex < job.angles.length){
    return;
  }

  AI_finishPhase(job);
}

function AI_finishPhase(job){
  if(job.bestForCurrentTarget){
    const shot = job.bestForCurrentTarget;

    setMessage(
      `AI tìm thấy case: bi ${shot.meta.targetNum} vào lỗ · lực ${Math.round(shot.power * 100)}% · ${shot.meta.mode}`,
      true
    );

    job.done(shot);
    return;
  }

  AI_nextTarget(job);
}

function AI_nextTarget(job){
  job.targetIndex++;
  job.phase = "direct";
  job.angles = null;
  job.angleIndex = 0;
  job.powerPct = AI_ENGINE.powerMinPct;
  job.bestForCurrentTarget = null;
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
    power:0.86,
    spinX:AI_rand(-0.06, 0.06),
    spinY:0.16
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

function AI_buildKickAnglesToTarget(target){
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
    ) * 1.08;

    const angles = AI_makeZigZagAngles(
      center,
      half,
      AI_ENGINE.kickAngleSamples
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
    Dùng đúng engine dự đoán của Developer Mode.
    Đây là điểm quan trọng nhất để AI đánh giống Developer Mode.
  */
  if(typeof simulateDeveloperPhysicsPrediction !== "function"){
    return {
      ok:false,
      reason:"missing_developer_prediction"
    };
  }

  const shotSpin = {
    x: AI_ENGINE.scanSpinX || 0,
    y: AI_ENGINE.scanSpinY || 0
  };

  const sim = simulateDeveloperPhysicsPrediction(
    dir,
    power,
    shotSpin
  );

  const ok =
    sim &&
    sim.firstHitNum === targetNum &&
    sim.firstHitPocket &&
    !sim.cuePocket;

  return {
    ok,
    reason: ok ? "developer_confirmed" : "developer_failed",
    firstHitNum: sim ? sim.firstHitNum : null,
    targetPocketId: sim && sim.firstHitPocket ? sim.firstHitPocket.id : null,
    cueScratch: !!(sim && sim.cuePocket),
    sim
  };
}

/* =========================
   SHOT BUILD
   ========================= */

function AI_makeShotFromSimulation(dir, power, target, sim, mode){
  const powerPct = Math.round(power * 100);

  const simFrames = sim.frames ?? (
    sim.sim && sim.sim.cuePath
      ? sim.sim.cuePath.length
      : 0
  );

  let score = 100000;

  if(mode === "direct"){
    score += 12000;
  }else{
    score += 4000;
  }

  score -= powerPct * 42;
  score -= simFrames * 4;

  const cueDist = AI_dist(
    cueBall.x,
    cueBall.y,
    target.x,
    target.y
  );

  score -= cueDist * 0.15;

  if(sim.targetPocketId){
    const p = AI_getPocketById(sim.targetPocketId);
    const pocketDist = AI_dist(
      target.x,
      target.y,
      p.x,
      p.y
    );

    score -= pocketDist * 0.22;

    if(p.type === "corner"){
      score += 420;
    }
  }

  return {
    dir,
    power,
    spinX: AI_ENGINE.scanSpinX || 0,
spinY: AI_ENGINE.scanSpinY || 0,
    meta: {
      mode,
      targetNum: target.num,
      target,
      targetPocketId: sim.targetPocketId,
firstHitNum: sim.firstHitNum,
frames: simFrames,
      score
    }
  };
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

function AI_simulateShot(dir, power, targetNum){
  const simBalls = balls.map(b => ({
    num:b.num,
    type:b.type,
    x:b.x,
    y:b.y,
    vx:0,
    vy:0,
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

  const force = 14 + power * 66;

  simCue.vx = dir.x * force;
  simCue.vy = dir.y * force;

  let firstHitNum = null;
  let cueScratch = false;
  let targetPotted = false;
  let targetPocketId = null;
  let frames = 0;

  for(frames = 0; frames < AI_ENGINE.simFrameLimit; frames++){
    let maxSpeed = 0;

    for(const b of simBalls){
      if(!b.active) continue;

      AI_limitSimBallSpeed(b);

      const sp = Math.hypot(b.vx, b.vy);
      if(sp > maxSpeed) maxSpeed = sp;
    }

    if(maxSpeed < 0.16 && frames > 8){
      break;
    }

    const steps = AI_clamp(
      Math.ceil(maxSpeed / (BALL_R * 0.22)),
      6,
      24
    );

    for(let s = 0; s < steps; s++){
      for(const b of simBalls){
        if(!b.active) continue;

        const stepDX = b.vx / steps;
        const stepDY = b.vy / steps;

        b.x += stepDX;
        b.y += stepDY;

        const friction = Math.pow(0.987, 1 / steps);

        b.vx *= friction;
        b.vy *= friction;

        if(Math.abs(b.vx) < 0.015) b.vx = 0;
        if(Math.abs(b.vy) < 0.015) b.vy = 0;

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
          AI_simHandleRail(b);
        }
      }

      AI_simHandleCollisions(
        simBalls,
        hitNum => {
          if(firstHitNum === null){
            firstHitNum = hitNum;
          }
        }
      );

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
  for(let i = 0; i < simBalls.length; i++){
    for(let j = i + 1; j < simBalls.length; j++){
      const a = simBalls[i];
      const b = simBalls[j];

      if(!a.active || !b.active) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const minD = BALL_R * 2;

      if(d > 0 && d < minD){
        const nx = dx / d;
        const ny = dy / d;
        const overlap = minD - d;

        a.x -= nx * overlap / 2;
        a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2;
        b.y += ny * overlap / 2;

        const rvx = a.vx - b.vx;
        const rvy = a.vy - b.vy;
        const impact = rvx * nx + rvy * ny;

        if(impact > 0){
          if(a.num === 0 && b.num !== 0){
            onCueFirstHit(b.num);
          }

          if(b.num === 0 && a.num !== 0){
            onCueFirstHit(a.num);
          }

          const restitution = 0.94;
          const impulse = impact * restitution;

          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }
      }
    }
  }
}

function AI_simHandlePocket(b){
  for(const p of pockets){
    if(!isPocketPhysicsHit(b.x, b.y, p)){
      continue;
    }

    b.active = false;
    b.potted = true;
    b.vx = 0;
    b.vy = 0;

    return p;
  }

  return null;
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
    b.x = left;
    b.vx = Math.abs(b.vx) * RAIL_BOUNCE;
    b.vy *= RAIL_SIDE_FRICTION;
  }

  if(b.x > right && !movingToRightPocket){
    b.x = right;
    b.vx = -Math.abs(b.vx) * RAIL_BOUNCE;
    b.vy *= RAIL_SIDE_FRICTION;
  }

  if(b.y < top && !movingToTopPocket){
    b.y = top;
    b.vy = Math.abs(b.vy) * RAIL_BOUNCE;
    b.vx *= RAIL_SIDE_FRICTION;
  }

  if(b.y > bottom && !movingToBottomPocket){
    b.y = bottom;
    b.vy = -Math.abs(b.vy) * RAIL_BOUNCE;
    b.vx *= RAIL_SIDE_FRICTION;
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