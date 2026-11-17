/* =========================================================
   REPLAY — chiếu lại cú đánh đẹp (của người chơi hoặc AI) bằng góc quay 3D kiểu truyền hình.
   - Ghi mọi khung vật lý của cú đánh: vị trí, độ lăn, xoáy của từng bi, va băng, va bi, rơi lỗ.
   - Cú đánh xong: chấm "độ đẹp" (đánh băng, A băng, ăn nhiều bi, cắt mỏng, đánh chuyền, 3 băng...).
     Đủ điểm thì tạm dừng ván (như lúc mở menu) và phát replay 3D (replay3d.js + three.js, chỉ tải khi cần).
   - Nút Replay cạnh nút Menu bật/tắt tính năng (nhớ trong máy). Chạm màn hình / BỎ QUA để thoát replay.
   ========================================================= */

const REPLAY = {
  enabled: true,
  minScore: 3,          // điểm "đẹp" tối thiểu để phát
  maxFrames: 2400,      // cú chạy quá 40 giây thì không ghi nữa
  rec: null,            // cú đang ghi
  open: false,
  player: null,
  module: null,
  failed: false,
  endArgs: null,        // kết quả ván (nếu cú vừa rồi kết thúc ván) để hiện lại sau replay
  curDt: 1,
  last: null            // clip của replay gần nhất (kiểm thử)
};

try{
  if(localStorage.getItem("bida:replay") === "0") REPLAY.enabled = false;
}catch(e){}

const replayView = document.getElementById("replayView");
const replayCanvas = document.getElementById("replayCanvas");
const replayBtn = document.getElementById("replayBtn");
const rpCam = document.getElementById("rpCam");
const rpTitle = document.getElementById("rpTitle");
const rpWho = document.getElementById("rpWho");
const rpSlow = document.getElementById("rpSlow");
const rpSkip = document.getElementById("rpSkip");
const rpWipe = document.getElementById("rpWipe");
const rpLoading = document.getElementById("rpLoading");

const RP_CAM_NAMES = {
  fpv: "GÓC NHÌN THỨ NHẤT",
  chase: "CAMERA BÁM BI",
  wide: "TOÀN CẢNH"
};

/* ---------- ghi cú đánh ---------- */

function replayPushFrame(r){
  const n = r.n;
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  const act = new Uint8Array(n);
  const roll = r.roll.slice();

  for(let i = 0; i < n; i++){
    const b = r.ref[i];
    xs[i] = b.x;
    ys[i] = b.y;
    act[i] = b.active ? 1 : 0;
    const f = b.faceRot || 0;
    roll[i * 3 + 2] = f - r.face[i];
    r.face[i] = f;
  }

  r.roll.fill(0);
  r.times.push(r.t);
  r.xs.push(xs);
  r.ys.push(ys);
  r.act.push(act);
  r.rolls.push(roll);
}

// Thời điểm (khung 60 Hz kể từ lúc đánh) của sự kiện đang xảy ra trong lần cập nhật vật lý hiện tại
function replayNow(r){
  if(GAME_MODE !== "carom" && typeof physFrameUsed === "number") return r.tick0 + physFrameUsed;
  return r.tick0 + REPLAY.curDt * 0.5;
}

function replayEvent(r, e){
  // Một lần chạm băng / chạm bi có thể báo ở vài bước con liền nhau: gộp lại
  for(let k = r.events.length - 1; k >= 0 && k >= r.events.length - 8; k--){
    const o = r.events[k];
    if(o.k === e.k && o.i === e.i && e.t - o.t < 3) return;
  }
  r.events.push(e);
}

function replayBegin(side, dir, power, shotSpin, isBreak){
  const list = balls.slice();
  const n = list.length;

  list.forEach((b, i) => { b.__ri = i; });

  const r = {
    mode: GAME_MODE,
    side,
    isBreak,
    dir: { x: dir.x, y: dir.y },
    power,
    spin: { x: (shotSpin && shotSpin.x) || 0, y: (shotSpin && shotSpin.y) || 0 },
    meta: list.map(b => ({ num: b.num, type: b.type, color: ballColors[b.num] || "#f4f1e6" })),
    ref: list,
    n,
    cueIdx: list.indexOf(cueBall),
    t: 0,
    tick0: 0,
    times: [],
    xs: [],
    ys: [],
    act: [],
    rolls: [],
    roll: new Float32Array(n * 3),
    face: list.map(b => b.faceRot || 0),
    events: [],
    firstHitT: -1,
    done: false
  };

  replayPushFrame(r);
  REPLAY.rec = r;

  // Bida phăng: lấy sự kiện chạm bi / chạm băng chính xác từ bộ theo dõi luật của cú đánh
  if(r.mode === "carom" && caromShot && caromShot.ev){
    const ev = caromShot.ev;
    const cue = caromShot.cue;
    const impact = ev.impact;
    const rail = ev.rail;

    ev.impact = (a, b) => {
      impact(a, b);
      if(r.done || (a !== cue && b !== cue)) return;
      const o = a === cue ? b : a;
      if(o.__ri !== undefined) replayEvent(r, { k: "hit", t: replayNow(r), i: o.__ri });
    };

    ev.rail = (b, k) => {
      rail(b, k);
      if(!r.done && b.__ri !== undefined) replayEvent(r, { k: "rail", t: replayNow(r), i: b.__ri });
    };
  }
}

/* ---------- móc vào game (không đổi luật, chỉ ghi lại) ---------- */

(function(){
  const _shoot = shoot;
  shoot = function(side, dir, power, shotSpin){
    const wasLocked = shotLocked;
    const isBreak = GAME_MODE !== "carom" && !breakDone;
    const out = _shoot.apply(this, arguments);

    if(!wasLocked && shotLocked && REPLAY.enabled && !REPLAY.failed){
      try{
        replayBegin(side, dir, power, shotSpin, isBreak);
      }catch(err){
        console.error("Replay: lỗi khi bắt đầu ghi", err);
        REPLAY.rec = null;
      }
    }

    return out;
  };

  const _update = updatePhysics;
  updatePhysics = function(dt = 1){
    const r = REPLAY.rec;

    if(r && !r.done){
      REPLAY.curDt = dt;
      r.tick0 = r.t;
    }

    const out = _update.apply(this, arguments);

    if(r && !r.done && REPLAY.rec === r){
      if(r.firstHitT < 0 && GAME_MODE !== "carom" && currentShot && currentShot.firstHit) r.firstHitT = r.tick0 + dt * 0.5;
      r.t += dt;
      replayPushFrame(r);
      if(r.times.length > REPLAY.maxFrames) REPLAY.rec = null;
    }

    return out;
  };

  const _roll = updateBallRollingVisual;
  updateBallRollingVisual = function(b, dx, dy){
    const r = REPLAY.rec;
    if(r && !r.done && b.__ri !== undefined && r.ref[b.__ri] === b){
      r.roll[b.__ri * 3] += dx;
      r.roll[b.__ri * 3 + 1] += dy;
    }
    return _roll.apply(this, arguments);
  };

  const _rail = markRailHit;
  markRailHit = function(b){
    const r = REPLAY.rec;
    if(r && !r.done && shotLocked && b.__ri !== undefined && r.ref[b.__ri] === b){
      replayEvent(r, { k: "rail", t: replayNow(r), i: b.__ri });
    }
    return _rail.apply(this, arguments);
  };

  const _sink = startPocketSinkAnimation;
  startPocketSinkAnimation = function(ball, pocket){
    const r = REPLAY.rec;
    if(r && !r.done && ball.__ri !== undefined && r.ref[ball.__ri] === ball){
      r.events.push({
        k: "pot", t: replayNow(r), i: ball.__ri,
        px: pocket.x, py: pocket.y, ptype: pocket.type,
        vx: ball.vx, vy: ball.vy
      });
    }
    return _sink.apply(this, arguments);
  };

  const _end = endGame;
  endGame = function(type, sub){
    REPLAY.endArgs = [type, sub];
    return _end.apply(this, arguments);
  };

  const _finish = finishShot;
  finishShot = function(){
    const r = REPLAY.rec;
    let info = null;

    if(r && !r.done){
      r.t = r.tick0 + REPLAY.curDt;
      if(r.firstHitT < 0 && GAME_MODE !== "carom" && currentShot && currentShot.firstHit) r.firstHitT = r.tick0;
      replayPushFrame(r);
      r.done = true;
      info = replayShotInfo(r);
    }

    REPLAY.rec = null;
    REPLAY.endArgs = null;

    const out = _finish.apply(this, arguments);

    if(info){
      try{
        replayAfterShot(r, info);
      }catch(err){
        console.error("Replay: lỗi khi chấm cú đánh", err);
      }
    }

    return out;
  };
})();

// Thông tin luật của cú đánh, lấy trước khi finishShot xoá đi
function replayShotInfo(r){
  if(r.mode === "carom"){
    const t = caromShot;
    return {
      scoreBefore: caromScore[r.side],
      cushions: t ? t.cushionsBeforeSecond : -1
    };
  }

  const cs = currentShot || {};
  return {
    potted: (cs.potted || []).map(b => b.__ri).filter(i => i !== undefined),
    scratch: !!cs.scratch,
    firstHit: cs.firstHit && cs.firstHit.__ri !== undefined ? cs.firstHit.__ri : -1,
    target: cs.targetBeforeShot,
    blackLegal: !!cs.blackLegalBeforeShot
  };
}

/* ---------- chấm độ đẹp ---------- */

function rpPos(r, i, t){
  const T = r.times;
  let k = 0;
  while(k < T.length - 1 && T[k + 1] <= t) k++;
  const k2 = Math.min(k + 1, T.length - 1);
  const f = k2 === k ? 0 : Math.min(1, Math.max(0, (t - T[k]) / (T[k2] - T[k])));
  return { x: r.xs[k][i] + (r.xs[k2][i] - r.xs[k][i]) * f, y: r.ys[k][i] + (r.ys[k2][i] - r.ys[k][i]) * f };
}

function rpPathLen(r, i, t0, t1){
  let len = 0;
  for(let k = 1; k < r.times.length; k++){
    if(r.times[k] <= t0 || r.times[k - 1] >= t1) continue;
    if(!r.act[k - 1][i]) continue;
    len += Math.hypot(r.xs[k][i] - r.xs[k - 1][i], r.ys[k][i] - r.ys[k - 1][i]);
  }
  return len;
}

function rpRails(r, i, t0, t1){
  return r.events.filter(e => e.k === "rail" && e.i === i && e.t >= t0 && e.t < t1).length;
}

// Hướng bi bắt đầu chạy (sau khi bị chạm)
function rpDeparture(r, i){
  const x0 = r.xs[0][i];
  const y0 = r.ys[0][i];
  for(let k = 1; k < r.xs.length; k++){
    const dx = r.xs[k][i] - x0;
    const dy = r.ys[k][i] - y0;
    const d = Math.hypot(dx, dy);
    if(d > 8) return { x: dx / d, y: dy / d };
  }
  return null;
}

function rpFirstMove(r, i){
  const x0 = r.xs[0][i];
  const y0 = r.ys[0][i];
  for(let k = 1; k < r.xs.length; k++){
    if(Math.hypot(r.xs[k][i] - x0, r.ys[k][i] - y0) > 0.5) return r.times[k - 1];
  }
  return Infinity;
}

// Bi nào đẩy bi i lăn: bi đang chạm nó ngay lúc nó bắt đầu chạy (−1 nếu không rõ)
function rpHitter(r, i){
  const x0 = r.xs[0][i];
  const y0 = r.ys[0][i];
  let k = -1;

  for(let f = 1; f < r.xs.length; f++){
    if(Math.hypot(r.xs[f][i] - x0, r.ys[f][i] - y0) > 0.5){
      k = f;
      break;
    }
  }
  if(k < 1) return -1;

  const px = r.xs[k - 1][i];
  const py = r.ys[k - 1][i];
  const kb = Math.max(0, k - 2);
  let best = -1;
  let bd = Infinity;

  for(let j = 0; j < r.n; j++){
    if(j === i || !r.act[k - 1][j]) continue;
    // bi đứng yên sát bên (vd. trong cụm bi) không phải bi đẩy
    if(Math.hypot(r.xs[k][j] - r.xs[kb][j], r.ys[k][j] - r.ys[kb][j]) < 0.3) continue;

    for(let u = 0; u <= 1.001; u += 0.125){
      const x = r.xs[k - 1][j] + (r.xs[k][j] - r.xs[k - 1][j]) * u;
      const y = r.ys[k - 1][j] + (r.ys[k][j] - r.ys[k - 1][j]) * u;
      const d = Math.hypot(x - px, y - py);
      if(d < bd){
        bd = d;
        best = j;
      }
    }
  }

  return bd < BALL_R * 2 + 12 ? best : -1;
}

// Thế bi ở khung f: danh sách bi + các bi mục tiêu của người đánh
function rpLayout(r, f, target){
  const list = r.meta.map((m, i) => ({ num: m.num, type: m.type, x: r.xs[f][i], y: r.ys[f][i], active: !!r.act[f][i] }));
  const targets = list.filter(b => b.active && (
    target === "black" ? b.num === 8 :
    target === "open" ? (b.type === "solid" || b.type === "stripe") :
    b.type === target
  ));
  return { list, targets, cue: list[r.cueIdx] };
}

// Bi cái nhìn thấy (đánh thẳng chạm được) bao nhiêu bi mục tiêu
function rpVisibleCount(list, cue, targets){
  let n = 0;

  for(const t of targets){
    const d = Math.hypot(t.x - cue.x, t.y - cue.y);
    if(d < BALL_R * 2.2){ n++; continue; }

    const px = -(t.y - cue.y) / d;
    const py = (t.x - cue.x) / d;

    for(const o of [0, -1.2, 1.2]){
      if(AI_segmentClear(list, cue.x, cue.y, t.x + px * o * BALL_R, t.y + py * o * BALL_R, [0, t.num], BALL_R * 2)){
        n++;
        break;
      }
    }
  }

  return n;
}

function replayJudgePool(r, info){
  const side = r.side;
  const foul = turn !== side && ballInHand && ballInHandOwner === turn;
  const ended = gameOver && REPLAY.endArgs;
  const won = !!ended && (REPLAY.endArgs[0] === "win") === (side === "player");
  const pots = r.events.filter(e => e.k === "pot" && e.i !== r.cueIdx);
  const potT = i => {
    const e = pots.find(p => p.i === i);
    return e ? e.t : Infinity;
  };

  if(r.isBreak){
    const n = pots.length;
    if(foul || ended || n < 3) return null;
    const key = pots[0];
    return { score: n, title: `PHÁ BI ĂN ${n} BI`, keyIdx: key.i, keyT: key.t, keyPocket: key };
  }

  if(foul || (ended && !won)) return null;

  const meta = r.meta;
  const target = info.target;
  const own = pots.map(e => e.i).filter(i => {
    const m = meta[i];
    if(target === "black") return m.num === 8;
    if(target === "open") return m.type === "solid" || m.type === "stripe";
    return m.type === target;
  });

  let score = 0;
  let best = null;
  const add = (pts, title) => {
    score += pts;
    if(!best || pts > best.pts) best = { pts, title };
  };

  const fh = info.firstHit;
  const tFirst = r.firstHitT >= 0 ? r.firstHitT : Infinity;

  // Phá thế khó: trước cú đánh bị che hết bi (bị gài) mà vẫn chạm đúng bi, không phạm lỗi;
  // hoặc không có cú ăn thẳng nào mà vẫn ăn được bi
  const before = rpLayout(r, 0, target);
  const snookered = before.targets.length > 0 && rpVisibleCount(before.list, before.cue, before.targets) === 0;
  const noDirectPot = before.targets.length > 0 && !AI_potCandidates(before.cue, before.list, before.targets).length;

  if(snookered) add(3, "PHÁ THẾ GÀI");

  if(!own.length){
    if(!snookered || fh < 0) return null;
    return { score, title: best.title, keyIdx: fh, keyT: tFirst, keyPocket: null };
  }

  if(!snookered && noDirectPot) add(3, "GỠ THẾ KHÓ");

  let keyIdx = own.slice().sort((a, b) => potT(a) - potT(b))[0];

  if(won) add(3, "CÚ ĐÁNH KẾT THÚC VÁN");
  if(own.length >= 2) add(2 * (own.length - 1), `ĂN ${own.length} BI MỘT CÚ`);

  for(const i of own){
    // Chạm mép miệng lỗ ngay trước khi rơi không phải đánh băng
    const pe = pots.find(e => e.i === i);
    const t0 = rpFirstMove(r, i);
    // Bi nằm sát băng bị chạm cũng báo chạm băng: chỉ tính khi bi đã chạy một đoạn trước và sau khi dội băng
    const rails = r.events.filter(e => {
      if(e.k !== "rail" || e.i !== i || e.t < t0 || e.t >= pe.t) return false;
      const p = rpPos(r, i, e.t);
      return Math.hypot(p.x - pe.px, p.y - pe.py) > CORNER_POCKET_R + BALL_R * 2.5 &&
        rpPathLen(r, i, t0, e.t) > BALL_R * 4 &&
        rpPathLen(r, i, e.t, pe.t) > BALL_R * 5;
    }).length;
    if(rails >= 1){
      add(3 + (rails - 1), rails >= 2 ? `ĐÁNH ${rails} BĂNG VÀO LỖ` : "ĐÁNH BĂNG VÀO LỖ");
      keyIdx = i;
      break;
    }
  }

  if(rpRails(r, r.cueIdx, 0, tFirst) >= 1) add(3, "A BĂNG ĂN BI");

  // Đánh chuyền (đôn bi): bi rơi lỗ bị một bi khác (không phải bi cái) đẩy vào
  for(const i of own){
    const h = rpHitter(r, i);
    if(h >= 0 && h !== r.cueIdx){
      add(3.5, "ĐÁNH CHUYỀN – ĐÔN BI");
      keyIdx = i;
      break;
    }
    if(h === r.cueIdx && fh >= 0 && fh !== i){
      add(1.5, "BI CÁI CHẠM 2 BI");
      break;
    }
  }

  if(fh >= 0 && own.includes(fh)){
    const dep = rpDeparture(r, fh);
    if(dep){
      const cut = Math.acos(Math.max(-1, Math.min(1, dep.x * r.dir.x + dep.y * r.dir.y))) * 180 / Math.PI;
      if(cut > 60) add(2, "CẮT MỎNG");
      else if(cut > 45) add(1, "CẮT MỎNG");
    }

    const len = rpPathLen(r, r.cueIdx, 0, tFirst) + rpPathLen(r, fh, tFirst, potT(fh));
    if(len > 1100) add(1.5, "CÚ ĂN XA");
  }

  // Retro: bi cái giật lùi xa sau khi chạm
  if(tFirst < Infinity && !info.scratch){
    const a = rpPos(r, r.cueIdx, tFirst);
    const b = rpPos(r, r.cueIdx, r.t);
    if((b.x - a.x) * r.dir.x + (b.y - a.y) * r.dir.y < -230) add(1, "RETRO ĐẸP");
  }

  // Điều bi: ăn bi xong, bi cái chủ ý chạy tới chỗ cú sau dễ ăn (gần, gần như thẳng, lỗ không xa)
  let positional = false;
  if(!gameOver && turn === side && tFirst < Infinity && !info.scratch && cueBall && cueBall.active){
    const tg = getCurrentTarget(side);
    const next = balls.filter(b => b.active && (
      tg === "black" ? b.num === 8 :
      tg === "open" ? (b.type === "solid" || b.type === "stripe") :
      b.type === tg
    ));
    const c0 = AI_potCandidates(cueBall, balls, next)[0];
    const travel = rpPathLen(r, r.cueIdx, tFirst, r.t);
    const railsAfter = rpRails(r, r.cueIdx, tFirst, r.t);
    const easy = c0 && c0.cut < 0.3 && c0.cueDist < 420 && c0.pocketDist < 650;
    const meant = travel > 340 || (Math.abs(r.spin.y) >= 0.4 && travel > 170) || (railsAfter >= 1 && travel > 260);

    if(easy && meant){
      add(3 + (travel > 700 ? 0.5 : 0), "ĐIỀU BI ĐẸP");
      positional = best.title === "ĐIỀU BI ĐẸP";
    }
  }

  const ke = pots.find(e => e.i === keyIdx);
  return { score, title: best ? best.title : "ĂN BI", keyIdx, keyT: ke.t, keyPocket: ke, focusCue: positional };
}

function replayJudgeCarom(r, info){
  const side = r.side;
  if(!(caromScore[side] > info.scoreBefore)) return null;

  const hits = r.events.filter(e => e.k === "hit");
  const objs = [];
  for(const h of hits){
    if(!objs.some(o => o.i === h.i)) objs.push(h);
  }
  if(objs.length < 2) return null;

  const first = objs[0];
  const key = objs[1];
  let score = 0;
  let best = null;
  const add = (pts, title) => {
    score += pts;
    if(!best || pts > best.pts) best = { pts, title };
  };

  const c = info.cushions;
  if(c >= 3) add(3 + (c - 3) * 0.5, `${c} BĂNG ĂN ĐIỂM`);
  else if(c === 2) add(1.5, "2 BĂNG ĂN ĐIỂM");
  else if(c === 1) add(0.5, "1 BĂNG ĂN ĐIỂM");

  if(rpRails(r, r.cueIdx, 0, first.t) >= 1) add(1.5, "ĐÁNH BĂNG TRƯỚC");
  if(rpPathLen(r, r.cueIdx, 0, key.t) > 2600) add(1, "ĐƯỜNG BI DÀI");
  if(gameOver && REPLAY.endArgs) add(3, "ĐIỂM KẾT THÚC VÁN");

  // Phá thế khó: thế bi trước cú đánh không có cú ghi điểm thẳng dễ nào (vd. vừa bị gài)
  // mà vẫn ghi điểm bằng đường bi qua băng
  if(c >= 1){
    const state0 = r.meta.map((m, i) => ({ num: m.num, type: m.type, x: r.xs[0][i], y: r.ys[0][i] }));
    if(caromCountNextScores(state0, r.cueIdx) === 0) add(3, "PHÁ THẾ KHÓ");
  }

  // Điều bi (gom bi): trước cú đánh ba bi còn xa nhau, ghi điểm xong ba bi nằm gần nhau, cú sau rất dễ
  let positional = false;
  if(!gameOver){
    const last = r.xs.length - 1;
    const stateAt = f => r.meta.map((m, i) => ({ num: m.num, type: m.type, x: r.xs[f][i], y: r.ys[f][i] }));
    if(caromLayoutEase(stateAt(last), r.cueIdx) >= 0.72 && caromLayoutEase(stateAt(0), r.cueIdx) < 0.6){
      add(3, "ĐIỀU BI – GOM BI ĐẸP");
      positional = best.title === "ĐIỀU BI – GOM BI ĐẸP";
    }
  }

  if(!best) best = { title: "GHI ĐIỂM" };
  return { score, title: best.title, keyIdx: key.i, keyT: key.t, keyPocket: null, firstT: first.t, focusCue: positional };
}

function replayAfterShot(r, info){
  if(!REPLAY.enabled || REPLAY.failed) return;

  const j = r.mode === "carom" ? replayJudgeCarom(r, info) : replayJudgePool(r, info);
  if(!j || j.score < REPLAY.minScore) return;

  const clip = {
    mode: r.mode,
    n: r.n,
    meta: r.meta,
    cueIdx: r.cueIdx,
    times: Float32Array.from(r.times),
    xs: r.xs,
    ys: r.ys,
    act: r.act,
    rolls: r.rolls,
    events: r.events,
    dir: r.dir,
    power: r.power,
    spin: r.spin,
    tFirst: r.mode === "carom" ? j.firstT : r.firstHitT,
    tKey: j.keyT,
    keyIdx: j.keyIdx,
    keyPocket: j.keyPocket ? { x: j.keyPocket.px, y: j.keyPocket.py, type: j.keyPocket.ptype } : null,
    focusCue: !!j.focusCue,
    title: j.title,
    score: j.score,
    who: r.side === "player" ? "BẠN" : "AI.GiaBao",
    endArgs: REPLAY.endArgs
  };

  replayShow(clip);
}

/* ---------- phát ---------- */

function replayEnv(){
  return {
    table, BALL_R, CUSHION_THICKNESS, pockets,
    CORNER_POCKET_R, SIDE_POCKET_R, CORNER_MOUTH, SIDE_MOUTH,
    HEAD_STRING_X, FOOT_SPOT_X,
    TIP_MAX: PHYS.TIP_MAX
  };
}

// import() viết qua Function để trình duyệt quá cũ không lỗi cú pháp cả file (khi đó replay chỉ tự tắt)
function replayLoadModule(){
  if(!REPLAY.module){
    REPLAY.module = new Function("u", "return import(u)")("./replay3d.js?v=20261023");
  }
  return REPLAY.module;
}

function replayGetPlayer(){
  return replayLoadModule().then(m => {
    if(!REPLAY.player) REPLAY.player = m.createReplayPlayer(replayCanvas, replayEnv());
    return REPLAY.player;
  });
}

function replayShow(clip){
  REPLAY.last = clip;
  REPLAY.open = true;
  replayOpen = true;
  fsRefresh();

  rpTitle.textContent = clip.title;
  rpWho.textContent = clip.who;
  rpCam.textContent = "";
  rpSlow.classList.remove("on");
  rpLoading.hidden = !!REPLAY.player;
  replayView.classList.remove("hide", "out");
  replayView.setAttribute("aria-hidden", "false");

  rpWipe.classList.remove("go");
  void rpWipe.offsetWidth;
  rpWipe.classList.add("go");

  const giveUp = setTimeout(() => {
    if(REPLAY.open && !REPLAY.playing) replayClose();
  }, 9000);

  replayGetPlayer().then(player => {
    clearTimeout(giveUp);
    if(!REPLAY.open) return;

    rpLoading.hidden = true;
    REPLAY.playing = true;
    player.play(clip, {
      onCam: cam => { rpCam.textContent = RP_CAM_NAMES[cam] || ""; },
      onSlow: on => { rpSlow.classList.toggle("on", on); },
      onEnd: () => replayClose()
    });
  }).catch(err => {
    clearTimeout(giveUp);
    console.error("Replay: không dựng được cảnh 3D", err);
    REPLAY.failed = true;
    replayUpdateBtn();
    replayClose();
  });
}

function replayClose(){
  if(!REPLAY.open) return;

  REPLAY.open = false;
  REPLAY.playing = false;
  if(REPLAY.player) REPLAY.player.stop();

  replayView.classList.add("out");
  setTimeout(() => {
    if(REPLAY.open) return;
    replayView.classList.add("hide");
    replayView.classList.remove("out");
    replayView.setAttribute("aria-hidden", "true");
  }, 260);

  replayOpen = false;
  fsRefresh();

  // Cú vừa phát kết thúc ván: hiện lại hiệu ứng thắng/thua (lúc đầu bị replay che mất)
  const end = REPLAY.last && REPLAY.last.endArgs;
  if(gameOver && end) showGameResultFx(end[0], end[1]);
}

rpSkip.addEventListener("click", e => {
  e.stopPropagation();
  replayClose();
});

replayView.addEventListener("pointerdown", e => {
  if(e.target === rpSkip) return;
  e.stopPropagation();
});

replayView.addEventListener("click", () => replayClose());

window.addEventListener("resize", () => {
  if(REPLAY.player && REPLAY.open) REPLAY.player.resize();
});

/* ---------- nút bật / tắt ---------- */

function replayUpdateBtn(){
  const on = REPLAY.enabled && !REPLAY.failed;
  replayBtn.classList.toggle("off", !on);
  replayBtn.setAttribute("aria-pressed", on ? "true" : "false");
  replayBtn.title = REPLAY.failed
    ? "Replay 3D không chạy được trên máy này"
    : on ? "Replay cú đẹp: BẬT (bấm để tắt)" : "Replay cú đẹp: TẮT (bấm để bật)";
}

replayBtn.addEventListener("pointerdown", e => { e.stopPropagation(); });
replayBtn.addEventListener("pointerup", e => { e.stopPropagation(); });
replayBtn.addEventListener("click", e => {
  e.preventDefault();
  e.stopPropagation();

  REPLAY.enabled = !REPLAY.enabled;
  if(!REPLAY.enabled) REPLAY.rec = null;

  try{ localStorage.setItem("bida:replay", REPLAY.enabled ? "1" : "0"); }catch(err){}
  replayUpdateBtn();
  if(REPLAY.enabled) replayPreload();
});

// Tải sẵn mã 3D lúc bàn đứng yên (thường là lúc đang ở menu) để replay đầu tiên không phải chờ
function replayPreload(){
  if(!REPLAY.enabled || REPLAY.failed || REPLAY.module) return;

  const go = () => {
    if(REPLAY.module) return;
    if(!menuOpen && (isMoving() || shotLocked)){
      setTimeout(replayPreload, 1500);
      return;
    }
    replayLoadModule().catch(() => { REPLAY.module = null; });
  };

  if(window.requestIdleCallback) requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 500);
}

replayUpdateBtn();
setTimeout(replayPreload, 3000);
