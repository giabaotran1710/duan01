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
scanSpinY: 0.04,

// Giảm nhẹ để máy đỡ giật khi dùng cơ chế lỗ mới
scanPerTick: 20,

  // Giới hạn frame mô phỏng cho mỗi cú thử.
  simFrameLimit: 760,

  // Giới hạn tốc độ giống file chính.
  maxBallSpeed: 72,
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

function startAIThinkSearch(done){
  const token = ++AI_SCAN_TOKEN;

  const targets = getAITargetBalls()
    .slice()
    .sort((a, b) => {
      const ca = AI_hasCleanDirectCandidate(a) ? 0 : 1;
      const cb = AI_hasCleanDirectCandidate(b) ? 0 : 1;

      if(ca !== cb) return ca - cb;

      const da = AI_dist(cueBall.x, cueBall.y, a.x, a.y);
      const db = AI_dist(cueBall.x, cueBall.y, b.x, b.y);

      return da - db;
    });

  if(!targets.length){
    done(findAISafeFallbackShot());
    return;
  }

  const cleanCandidates = AI_buildCleanDirectCandidates(targets);

  const job = {
    token,
    done,
    targets,

    // Phase mới: tìm cú trực tiếp sạch trước
    phase: cleanCandidates.length ? "cleanDirect" : "direct",
    phaseStartedAt: performance.now(),

    cleanCandidates,
    cleanIndex: 0,
    cleanPowerPct: AI_getCleanPowerMin(),

    targetIndex: 0,
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

  // Ưu tiên cú trực tiếp sạch trước
  if(job.phase === "cleanDirect"){
    AI_processCleanDirectJob(job);
    return;
  }

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

      if(job.phase === "kick"){
        AI_switchToSafeKickPhase(job);
        return;
      }

      const randomShot = findAIRandomShot();
      setMessage("AI không tìm thấy cú chạm hợp lệ · đánh ngẫu nhiên", true);

      AI_SCAN_TOKEN++;
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
      }else if(job.phase === "safeKick"){
        job.angles = AI_buildKickAnglesToTarget(
          target,
          AI_ENGINE.safeKickAngleSamples
        );
      }else{
        job.angles = AI_buildKickAnglesToTarget(target);
      }

      job.angleIndex = 0;
      job.powerPct = AI_getPhasePowerMin(job.phase);
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

    const sim = job.phase === "safeKick"
      ? AI_predictLegalContact(dir, power, target.num)
      : AI_predictLikeDeveloper(dir, power, target.num);

    if(sim.ok){
      const shot = AI_makeShotFromSimulation(
        dir,
        power,
        target,
        sim,
        job.phase === "safeKick" ? "safe-kick-contact" : job.phase
      );

      if(job.phase === "safeKick"){
        setMessage(
          `AI chọn A băng an toàn: chạm bi ${shot.meta.targetNum} · lực ${Math.round(shot.power * 100)}%`,
          true
        );
      }else{
        setMessage(
          `AI tìm thấy case: bi ${shot.meta.targetNum} vào lỗ · lực ${Math.round(shot.power * 100)}% · ${shot.meta.mode}`,
          true
        );
      }

      AI_SCAN_TOKEN++;
      job.done(shot);
      return;
    }

    AI_advanceScanCursor(job);
    count++;
  }

  setMessage("AI.GiaBao đang suy nghĩ...", true);
  setTimeout(() => AI_processScanJob(job), 0);
}
function AI_isPhaseTimeout(job){
  const now = performance.now();

  return now - job.phaseStartedAt >= AI_getPhaseMaxMs(job.phase);
}

function AI_getPhaseMaxMs(phase){
  if(phase === "direct"){
    return AI_ENGINE.directScanMaxMs;
  }

  if(phase === "kick"){
    return AI_ENGINE.kickScanMaxMs;
  }

  if(phase === "safeKick"){
    return AI_ENGINE.safeKickScanMaxMs ?? 4500;
  }

  return 3000;
}

function AI_getPhasePowerMin(phase){
  if(phase === "safeKick"){
    return AI_ENGINE.safeKickPowerMinPct ?? 28;
  }

  return AI_ENGINE.powerMinPct;
}

function AI_getPhasePowerMax(phase){
  if(phase === "safeKick"){
    return AI_ENGINE.safeKickPowerMaxPct ?? 92;
  }

  return AI_ENGINE.powerMaxPct;
}

function AI_handlePhaseTimeout(job){
  if(job.phase === "direct"){
    setMessage("AI.GiaBao đang suy nghĩ...", true);
    AI_switchToKickPhase(job);
    return;
  }

  if(job.phase === "kick"){
    setMessage("AI không thấy cú ăn bi · chuyển sang A băng chạm bi", true);
    AI_switchToSafeKickPhase(job);
    return;
  }

  const randomShot = findAIRandomShot();

  setMessage("AI không tìm thấy cú chạm hợp lệ · đánh ngẫu nhiên", true);

  AI_SCAN_TOKEN++;
  job.done(randomShot);
}

function AI_switchToKickPhase(job){
  job.phase = "kick";
  job.phaseStartedAt = performance.now();

  job.targetIndex = 0;
  job.angles = null;
  job.angleIndex = 0;
  job.powerPct = AI_getPhasePowerMin(job.phase);
  job.bestForCurrentTarget = null;

  setTimeout(() => AI_processScanJob(job), 0);
}
function AI_switchToSafeKickPhase(job){
  job.phase = "safeKick";
  job.phaseStartedAt = performance.now();

  job.targetIndex = 0;
  job.angles = null;
  job.angleIndex = 0;
  job.powerPct = AI_getPhasePowerMin(job.phase);
  job.bestForCurrentTarget = null;

  setMessage("AI đang suy nghĩ...", true);

  setTimeout(() => AI_processScanJob(job), 0);
}


function AI_advanceScanCursor(job){
  job.powerPct++;

  if(job.powerPct <= AI_getPhasePowerMax(job.phase)){
    return;
  }

  job.powerPct = AI_getPhasePowerMin(job.phase);
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
  job.angles = null;
  job.angleIndex = 0;
  job.powerPct = AI_getPhasePowerMin(job.phase);
  job.bestForCurrentTarget = null;
}
/* =========================
   CLEAN DIRECT SHOT PRIORITY
   AI ưu tiên cú trực tiếp sạch, không bi cản
   ========================= */

function AI_getCleanPowerMin(){
  return AI_ENGINE.cleanDirectPowerMinPct ?? 38;
}

function AI_getCleanPowerMax(){
  return AI_ENGINE.cleanDirectPowerMaxPct ?? 90;
}

function AI_processCleanDirectJob(job){
  if(job.token !== AI_SCAN_TOKEN) return;
  if(gameOver) return;
  if(turn !== "ai") return;

  let count = 0;

  while(count < AI_ENGINE.scanPerTick){
    const c = job.cleanCandidates[job.cleanIndex];

    if(!c){
      AI_switchToNormalDirectPhase(job);
      return;
    }

    if(!AI_cleanDirectCandidateStillValid(c)){
      job.cleanIndex++;
      job.cleanPowerPct = AI_getCleanPowerMin();
      continue;
    }

    const power = job.cleanPowerPct / 100;

    const sim = AI_predictLikeDeveloper(
      c.dir,
      power,
      c.target.num
    );

    const samePocket =
      sim &&
      sim.ok &&
      sim.targetPocketId === c.pocket.id;

    if(samePocket){
      const shot = AI_makeShotFromSimulation(
        c.dir,
        power,
        c.target,
        sim,
        "direct-clean"
      );

      setMessage(
        `AI chọn cú trực tiếp sạch: bi ${c.target.num} vào lỗ · lực ${Math.round(power * 100)}%`,
        true
      );

      AI_SCAN_TOKEN++;
      job.done(shot);
      return;
    }

    job.cleanPowerPct++;

    if(job.cleanPowerPct > AI_getCleanPowerMax()){
      job.cleanIndex++;
      job.cleanPowerPct = AI_getCleanPowerMin();
    }

    count++;
  }

  setMessage("AI.GiaBao đang suy nghĩ...", true);
  setTimeout(() => AI_processScanJob(job), 0);
}

function AI_switchToNormalDirectPhase(job){
  job.phase = "direct";
  job.phaseStartedAt = performance.now();

  job.targetIndex = 0;
  job.angles = null;
  job.angleIndex = 0;
  job.powerPct = AI_getPhasePowerMin(job.phase);
  job.bestForCurrentTarget = null;

  setMessage("AI.GiaBao đang suy nghĩ...", true);

  setTimeout(() => AI_processScanJob(job), 0);
}

function AI_buildCleanDirectCandidates(targets){
  const result = [];

  for(const target of targets){
    if(!target || !target.active) continue;

    const list = AI_buildCleanDirectCandidatesForTarget(target);

    for(const c of list){
      result.push(c);
    }
  }

  result.sort((a, b) => b.score - a.score);

  return result;
}

function AI_buildCleanDirectCandidatesForTarget(target){
  const result = [];

  for(const pocket of pockets){
    const objectDir = AI_norm(
      pocket.x - target.x,
      pocket.y - target.y
    );

    const ghost = {
      x: target.x - objectDir.x * BALL_R * 2,
      y: target.y - objectDir.y * BALL_R * 2
    };

    if(!AI_isGhostPointPlayable(ghost)){
      continue;
    }

    if(!AI_isObjectPathCleanToPocket(target, pocket)){
      continue;
    }

    if(!AI_isCuePathCleanToGhost(ghost, target)){
      continue;
    }

    const dir = AI_norm(
      ghost.x - cueBall.x,
      ghost.y - cueBall.y
    );

    const cutAngle = Math.acos(
      AI_clamp(
        dir.x * objectDir.x + dir.y * objectDir.y,
        -1,
        1
      )
    );

    // Cắt quá mỏng nhìn rất hack, bỏ qua
    if(cutAngle > 1.28){
      continue;
    }

    const cueDist = AI_dist(
      cueBall.x,
      cueBall.y,
      ghost.x,
      ghost.y
    );

    const pocketDist = AI_dist(
      target.x,
      target.y,
      pocket.x,
      pocket.y
    );

    let score = 100000;

    score -= cueDist * 0.35;
    score -= pocketDist * 0.85;
    score -= cutAngle * 1800;

    if(pocket.type === "corner"){
      score += 520;
    }else{
      score += 260;
    }

    result.push({
      target,
      pocket,
      ghost,
      dir,
      score,
      mode:"direct-clean"
    });
  }

  return result;
}

function AI_hasCleanDirectCandidate(target){
  if(!target || !target.active) return false;

  return AI_buildCleanDirectCandidatesForTarget(target).length > 0;
}

function AI_cleanDirectCandidateStillValid(c){
  if(!c) return false;
  if(!c.target || !c.target.active) return false;

  return (
    AI_isGhostPointPlayable(c.ghost) &&
    AI_isCuePathCleanToGhost(c.ghost, c.target) &&
    AI_isObjectPathCleanToPocket(c.target, c.pocket)
  );
}

function AI_isGhostPointPlayable(p){
  const b = AI_getPlayableBounds();

  return (
    p.x >= b.left &&
    p.x <= b.right &&
    p.y >= b.top &&
    p.y <= b.bottom
  );
}

function AI_isCuePathCleanToGhost(ghost, target){
  return AI_isSegmentClearFromBalls(
    cueBall.x,
    cueBall.y,
    ghost.x,
    ghost.y,
    [0, target.num],
    BALL_R * 2.04
  );
}

function AI_isObjectPathCleanToPocket(target, pocket){
  return AI_isSegmentClearFromBalls(
    target.x,
    target.y,
    pocket.x,
    pocket.y,
    [0, target.num],
    BALL_R * 2.02
  );
}

function AI_isSegmentClearFromBalls(x1, y1, x2, y2, ignoreNums = [], clearance = BALL_R * 2){
  const ignore = new Set(ignoreNums);

  for(const b of balls){
    if(!b.active) continue;
    if(ignore.has(b.num)) continue;

    const d = AI_distancePointToSegment(
      b.x,
      b.y,
      x1,
      y1,
      x2,
      y2
    );

    if(d < clearance){
      return false;
    }
  }

  return true;
}

function AI_distancePointToSegment(px, py, x1, y1, x2, y2){
  const dx = x2 - x1;
  const dy = y2 - y1;

  const lenSq = dx * dx + dy * dy || 1;

  let t = (
    (px - x1) * dx +
    (py - y1) * dy
  ) / lenSq;

  t = AI_clamp(t, 0, 1);

  const cx = x1 + dx * t;
  const cy = y1 + dy * t;

  return Math.hypot(px - cx, py - cy);
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

  const pocketId = sim.targetPocketId || sim.targetPocket?.id || null;

if(pocketId){
  const p = AI_getPocketById(pocketId);
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
      targetPocketId: pocketId,
firstHitNum: sim.firstHitNum,
frames: simFrames,
      score
    }
  };
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

  const force = 14 + power * 66;

  simCue.vx = dir.x * force;
  simCue.vy = dir.y * force;

  const simSpin = {
    x: AI_ENGINE.scanSpinX || 0,
    y: AI_ENGINE.scanSpinY || 0,
    life: 120
  };

  let firstHitNum = null;
  let cueScratch = false;
  let railAfterFirstHit = false;
  let targetPotted = false;
  let anyObjectPotted = false;
  let blackPottedBad = false;
  let targetPocketId = null;
  let frames = 0;

  const currentTarget = getCurrentTarget("ai");
  const blackIsLegal = currentTarget === "black";

  for(frames = 0; frames < AI_ENGINE.simFrameLimit; frames++){
    let maxSpeed = 0;

    for(const b of simBalls){
      if(!b.active) continue;

      AI_limitSimBallSpeed(b);
      maxSpeed = Math.max(maxSpeed, Math.hypot(b.vx, b.vy));
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

        const speed = Math.hypot(b.vx, b.vy);

        if(b.num === 0 && simSpin.life > 0 && speed > 0.3){
          const n = AI_norm(b.vx, b.vy);

          b.vx += n.x * simSpin.y * 0.022;
          b.vy += n.y * simSpin.y * 0.022;

          const px = -n.y;
          const py = n.x;

          b.vx += px * simSpin.x * 0.018;
          b.vy += py * simSpin.x * 0.018;

          simSpin.life--;
        }

        AI_limitSimBallSpeed(b);

        const stepDX = b.vx / steps;
        const stepDY = b.vy / steps;

        b.x += stepDX;
        b.y += stepDY;

        const friction = Math.pow(0.987, 1 / steps);

        b.vx *= friction;
        b.vy *= friction;

        if(Math.abs(b.vx) < 0.015) b.vx = 0;
        if(Math.abs(b.vy) < 0.015) b.vy = 0;

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

      AI_simHandleCollisionsLegal(
        simBalls,
        hitNum => {
          if(firstHitNum === null){
            firstHitNum = hitNum;
          }
        },
        simSpin
      );

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
    b.vx = 0;
    b.vy = 0;

    return p;
  }

  return null;
}

function AI_simHandleCollisionsLegal(simBalls, onCueFirstHit, simSpin){
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

          const tx = -ny;
          const ty = nx;

          if(a.num === 0 || b.num === 0){
            const cue = a.num === 0 ? a : b;
            const sideSign = a.num === 0 ? 1 : -1;

            cue.vx += tx * simSpin.x * 1.15 * sideSign;
            cue.vy += ty * simSpin.x * 1.15 * sideSign;

            cue.vx -= nx * simSpin.y * 0.7 * sideSign;
            cue.vy -= ny * simSpin.y * 0.7 * sideSign;

            simSpin.life = Math.max(simSpin.life, 40);
          }
        }
      }
    }
  }
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
    b.x = left;
    b.vx = Math.abs(b.vx) * RAIL_BOUNCE;
    b.vy *= RAIL_SIDE_FRICTION;
    hit = true;
  }

  if(b.x > right && !movingToRightPocket){
    b.x = right;
    b.vx = -Math.abs(b.vx) * RAIL_BOUNCE;
    b.vy *= RAIL_SIDE_FRICTION;
    hit = true;
  }

  if(b.y < top && !movingToTopPocket){
    b.y = top;
    b.vy = Math.abs(b.vy) * RAIL_BOUNCE;
    b.vx *= RAIL_SIDE_FRICTION;
    hit = true;
  }

  if(b.y > bottom && !movingToBottomPocket){
    b.y = bottom;
    b.vy = -Math.abs(b.vy) * RAIL_BOUNCE;
    b.vx *= RAIL_SIDE_FRICTION;
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
  AI_applyMainPocketJawsForSim(b);
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
    if(!AI_isPocketHitByMainRule(b, p)){
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