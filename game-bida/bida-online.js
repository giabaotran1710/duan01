/* =========================================================
   BIDA ONLINE (bida lỗ, 1 đấu 1) — ghép trận tự động, không dùng mã phòng.
   Firebase Realtime Database qua REST + EventSource (như Cờ Caro trực tuyến).

   Ghép trận: /bida_queue/{id} = { name, seen, room? }
     Ai vào hàng chờ trước thì tạo phòng và ghi mã phòng vào mục của mình; người sau thấy phòng đang chờ thì vào làm khách.
     Hai người cùng tạo phòng một lúc: bên có id lớn hơn nhường phòng và vào phòng của bên kia.

   Phòng: /bida_rooms/{MÃ}
     host, guest : { id, name, seen }      first: 'host' | 'guest' (bên đề-pa)      left: bên đã thoát
     ev/e{n}     : { t, u, p }             chuỗi sự kiện ghi một lần: t = 'shot' | 'res' | 'to'
     aim/{vai}   : hướng cơ / vị trí bi cái đang ngắm (đối thủ xem trực tiếp)

   Đồng bộ vật lý: bàn bi chạy theo bước cố định (60 Hz) ở cả hai máy.
     - shot: người đến lượt gửi vị trí bi cái + hướng + lực + áp phê; hai máy cùng mô phỏng cú đánh.
     - res : máy người đánh chốt luật (lượt, nhóm bi, lỗi, thắng thua) và gửi vị trí cuối của 16 bi; máy kia đồng bộ theo.
     - to  : hết 30 giây thì bên kia được đặt bi cái tự do (đề-pa thì bên kia đề-pa).
   Chạy sau replay.js; dùng biến/hàm toàn cục của bida.html.
   ========================================================= */
(function () {
  'use strict';
  const DB = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  const SHOT_SECONDS = 30;
  const GRACE_MS = 5000;          // bên kia chờ thêm chừng này mới thay người chậm báo hết giờ
  const HEARTBEAT_MS = 12000, STALE_MS = 40000, FORFEIT_MS = 80000;
  const INTRO_MS = 2800;
  const QUEUE_FRESH_MS = 25000;
  const AIM_MS = 140;

  const $ = id => document.getElementById(id);
  const on = {
    active: false, code: null, role: null, id: null, es: null, tree: null, started: false, closing: false,
    applied: 0, wseq: 0, hb: null, watch: null, oppSeen: null, oppSeenAt: 0, oppLost: false, connOk: true,
    forfeit: false, shotSeq: 0, introUntil: 0, names: { me: 'Bạn', opp: 'Đối thủ' }
  };
  // trạng thái cú đánh của đối thủ đang chạy ở máy này
  const R = { phase: 'idle', shot: null, res: null, settled: false, resAt: 0, target: null, lastAimK: null };
  const T = { active: false, side: null, key: -1, start: 0, last: 0, fired: false };

  /* ---------- Mạng ---------- */
  async function http(method, path, body) {
    const res = await fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) { const e = new Error('http_' + res.status); e.status = res.status; throw e; }
    return res.json();
  }
  const SV = { '.sv': 'timestamp' };
  const rndId = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); };
  const genCode = () => { let s = ''; const a = new Uint8Array(5); crypto.getRandomValues(a); for (const b of a) s += ALPHA[b % ALPHA.length]; return s; };
  const myName = () => { try { const n = (localStorage.getItem('player_name') || '').trim(); if (n) return n.slice(0, 20); } catch (e) {} return 'Người chơi'; };
  const retryable = e => !e.status || e.status >= 500 || e.status === 429;

  // Ghi tuần tự để thứ tự sự kiện đến máy kia đúng như đã tạo
  let wq = Promise.resolve();
  function enqueue(fn) {
    const job = wq.then(fn);
    wq = job.catch(() => {});
    return job;
  }
  async function putRetry(path, body) {
    for (let i = 0; i < 4; i++) {
      try { return await http('PUT', path, body); }
      catch (e) { if (!retryable(e) || i === 3) throw e; await new Promise(r => setTimeout(r, 400 * (i + 1))); }
    }
  }

  function eventCount(t) {
    let n = 0;
    if (t && t.ev) for (const k of Object.keys(t.ev)) { const i = parseInt(k.slice(1), 10); if (i + 1 > n) n = i + 1; }
    return n;
  }
  // Ghi sự kiện; resolve true nếu ghi được (chỉ một bên giành được mỗi số thứ tự)
  function writeEvent(t, payload) {
    const n = Math.max(on.wseq, eventCount(on.tree));
    on.wseq = n + 1;
    const body = { t, u: on.id, p: JSON.stringify(payload || {}) };
    const code = on.code;
    return enqueue(() => putRetry('/bida_rooms/' + code + '/ev/e' + n, body)).then(() => true, () => false);
  }

  /* ---------- Thông báo / hộp thoại ---------- */
  let toastT = null;
  function toast(text) {
    const el = $('onToast'); if (!el) return;
    el.textContent = text; el.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(() => { el.style.opacity = '0'; }, 2400);
  }
  function askLeave(done) {
    const box = $('onConfirm');
    const mid = on.started && !gameOver && !on.forfeit;
    box.querySelector('p').textContent = mid ? 'Ván đang chơi dở. Nếu thoát, đối thủ sẽ thắng.' : 'Bạn sẽ rời khỏi trận đấu.';
    box.classList.add('show');
    const close = () => box.classList.remove('show');
    box.querySelector('.no').onclick = close;
    box.querySelector('.yes').onclick = () => { close(); done(); };
  }

  /* ---------- Menu: tìm đối thủ ---------- */
  const qm = { on: false, id: null, timer: null, hasRoom: false, offset: 0, tick: 0, busy: false };

  function setSearchUi(searching, err) {
    $('mmOnIdle').hidden = searching;
    $('mmOnSearch').hidden = !searching;
    $('mmOnMsg').textContent = err || '';
  }
  window.onlineMenuView = function (name) {
    if (name !== 'online' && qm.on) cancelSearch();
    if (name === 'online' && !qm.on) setSearchUi(false);
  };

  async function findOpponent() {
    if (qm.on || on.active) return;
    qm.on = true; qm.id = rndId(); qm.hasRoom = false; qm.tick = 0; qm.busy = false;
    setSearchUi(true);
    try {
      await http('PUT', '/bida_queue/' + qm.id, { name: myName(), seen: SV });
      const me = await http('GET', '/bida_queue/' + qm.id);
      qm.offset = ((me && me.seen) || Date.now()) - Date.now();   // chênh lệch giờ máy chủ so với máy này
    } catch (e) {
      qm.on = false; setSearchUi(false, 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'); return;
    }
    qm.timer = setInterval(qmTick, 1500);
    qmTick();
  }
  function qmStop(del) {
    clearInterval(qm.timer);
    const id = qm.id, was = qm.on;
    qm.on = false; qm.timer = null; qm.hasRoom = false;
    if (del && was && id) http('DELETE', '/bida_queue/' + id).catch(() => {});
  }
  async function cancelSearch() {
    qmStop(true);
    if (on.active && !on.started) await closeRoomSilently();
    setSearchUi(false);
  }

  async function qmTick() {
    if (!qm.on || qm.busy || on.started) return;
    qm.busy = true;
    try {
      const q = (await http('GET', '/bida_queue')) || {};
      if (!qm.on) return;
      const now = Date.now() + qm.offset;
      const cands = [];
      for (const k of Object.keys(q)) {
        const v = q[k];
        if (!v || typeof v.seen !== 'number') continue;
        if (now - v.seen > 120000) { http('DELETE', '/bida_queue/' + k).catch(() => {}); continue; }   // dọn mục đã bỏ đi
        if (k !== qm.id && v.room && CODE_RE.test(v.room) && now - v.seen < QUEUE_FRESH_MS) cands.push([k, v.room]);
      }
      cands.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      for (const [k, room] of cands) {
        if (qm.hasRoom) {
          if (!(k < qm.id)) continue;                      // chỉ nhường cho bên có id nhỏ hơn
          if (on.tree && on.tree.guest) break;             // phòng của mình đã có người
          await closeRoomSilently();
          http('DELETE', '/bida_queue/' + qm.id + '/room').catch(() => {});
          qm.hasRoom = false;
        }
        let ok = false;
        try { ok = await joinRoom(room); } catch (e) {}
        if (ok) { qmStop(true); return; }
      }
      if (!qm.on) return;
      if (!qm.hasRoom) {
        await makeRoom();
        qm.hasRoom = true;
        await http('PUT', '/bida_queue/' + qm.id + '/room', on.code);
      }
      if (++qm.tick % 5 === 0) http('PUT', '/bida_queue/' + qm.id + '/seen', SV).catch(() => {});
    } catch (e) { /* lỗi mạng tạm thời: thử lại ở nhịp sau */ }
    finally { qm.busy = false; }
  }

  async function makeRoom() {
    let code = null;
    for (let i = 0; i < 6 && !code; i++) { const c = genCode(); if ((await http('GET', '/bida_rooms/' + c + '/host')) === null) code = c; }
    if (!code) throw new Error('no_code');
    const id = rndId();
    await http('PUT', '/bida_rooms/' + code, { host: { id, name: myName(), seen: SV }, created: SV, first: Math.random() < 0.5 ? 'host' : 'guest' });
    Object.assign(on, { code, id, role: 'host' });
    connect();
  }
  async function joinRoom(code) {
    const room = await http('GET', '/bida_rooms/' + code);
    if (!room || !room.host || room.guest || room.left) return false;
    const id = rndId();
    try { await http('PUT', '/bida_rooms/' + code + '/guest', { id, name: myName(), seen: SV }); }
    catch (e) { return false; }
    Object.assign(on, { code, id, role: 'guest' });
    connect();
    return true;
  }

  /* ---------- Luồng dữ liệu thời gian thực ---------- */
  function setIn(obj, parts, val) {
    if (!parts.length) return val;
    obj = (obj && typeof obj === 'object') ? obj : {};
    const k = parts[0];
    if (parts.length === 1) { if (val === null) delete obj[k]; else obj[k] = val; }
    else obj[k] = setIn(obj[k], parts.slice(1), val);
    return obj;
  }
  const split = p => p.split('/').filter(Boolean);

  function connect() {
    Object.assign(on, { active: true, closing: false, started: false, tree: null, applied: 0, wseq: 0, forfeit: false, connOk: true, shotSeq: 0 });
    startStream();
    clearInterval(on.hb); clearInterval(on.watch);
    on.hb = setInterval(() => { http('PUT', '/bida_rooms/' + on.code + '/' + on.role + '/seen', SV).catch(() => {}); }, HEARTBEAT_MS);
    on.watch = setInterval(watchOpp, 4000);
  }
  function startStream() {
    if (on.es) on.es.close();
    const es = new EventSource(DB + '/bida_rooms/' + on.code + '.json');
    on.es = es;
    es.addEventListener('put', e => { const m = JSON.parse(e.data); on.tree = setIn(on.tree, split(m.path), m.data === undefined ? null : m.data); onTree(); });
    es.addEventListener('patch', e => {
      const m = JSON.parse(e.data), base = split(m.path);
      for (const k of Object.keys(m.data || {})) on.tree = setIn(on.tree, base.concat(split(k)), m.data[k]);
      onTree();
    });
    es.onerror = () => { on.connOk = false; };
    es.onopen = () => { on.connOk = true; };
  }

  const oppRole = () => (on.role === 'host' ? 'guest' : 'host');
  const oppNode = () => (on.tree ? on.tree[oppRole()] : null);

  function watchOpp() {
    const o = oppNode();
    const seen = o ? o.seen : null;
    if (seen !== on.oppSeen) { on.oppSeen = seen; on.oppSeenAt = Date.now(); }
    on.oppLost = !!(o && Date.now() - on.oppSeenAt > STALE_MS);
    // đối thủ im lặng quá lâu (tắt máy, mất mạng, đóng trình duyệt không báo): coi như đã thoát, người ở lại thắng
    if (on.started && !gameOver && !on.forfeit && on.connOk && document.visibilityState === 'visible' && o && Date.now() - on.oppSeenAt > FORFEIT_MS) {
      http('PUT', '/bida_rooms/' + on.code + '/left', oppRole()).catch(() => {});
      opponentLeft();
    }
  }

  function onTree() {
    const t = on.tree;
    if (t === null && on.active && !on.closing) {   // phòng đã bị xoá
      if (on.started) { opponentLeft(); return; }
      return;
    }
    if (!t || !t.host) return;
    if (t.guest && !on.started) { startMatch(); }
    if (!on.started) return;
    if (t.left && t.left !== on.role) opponentLeft();
    processEvents();
    liveAim(t);
  }

  /* ---------- Vào trận ---------- */
  function startMatch() {
    const t = on.tree;
    on.started = true;
    on.names = { me: myName(), opp: (oppNode() && oppNode().name) || 'Đối thủ' };
    ONLINE_ON = true;
    ONLINE_FIRST = (t.first === on.role) ? 'player' : 'ai';
    NAMES.player = on.names.me;
    NAMES.ai = on.names.opp;
    GAME_MODE = 'pool';
    document.body.classList.add('onlineGame');
    try { REPLAY.enabled = false; REPLAY.rec = null; } catch (e) {}
    $('playerAvatar').textContent = NAMES.player;
    $('aiAvatar').textContent = NAMES.ai;
    $('titleSub').textContent = 'Online · 8-Ball rút gọn';
    qmStop(true);
    R.phase = 'idle'; R.shot = null; R.res = null; R.settled = false; R.lastAimK = null;
    T.active = false; T.key = -1;
    resize();
    resetGame();
    gameInProgress = true;
    closeMenu();
    showIntro();
  }

  function showIntro() {
    const el = $('onIntro'), me = ONLINE_FIRST === 'player';
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    el.innerHTML = '<div><div class="ttl">GHÉP TRẬN THÀNH CÔNG</div><div class="row">' +
      '<div class="pl a"><div class="nm">' + esc(NAMES.player) + '</div><div class="tag">' + (me ? 'ĐỀ-PA TRƯỚC' : '') + '</div></div>' +
      '<div class="vs">VS</div>' +
      '<div class="pl b"><div class="nm">' + esc(NAMES.ai) + '</div><div class="tag">' + (me ? '' : 'ĐỀ-PA TRƯỚC') + '</div></div></div></div>';
    el.classList.add('show');
    on.introUntil = performance.now() + INTRO_MS;
    setTimeout(() => el.classList.remove('show'), INTRO_MS);
  }

  /* ---------- Xử lý chuỗi sự kiện ---------- */
  function processEvents() {
    const t = on.tree;
    if (!t || !t.ev) return;
    for (;;) {
      if (R.phase === 'pre' || R.phase === 'sim') {
        // đang chạy cú của đối thủ: chỉ nhận kết quả (res) của cú đó, các sự kiện sau chờ cú này xong
        const ev = t.ev['e' + on.applied];
        if (ev && ev.t === 'res' && !R.res) { on.applied++; R.res = safeParse(ev.p); R.resAt = performance.now(); tryApply(); continue; }
        return;
      }
      const ev = t.ev['e' + on.applied];
      if (!ev) return;
      on.applied++;
      if (ev.u === on.id) continue;   // sự kiện của chính mình: đã xử lý lúc ghi
      handleEvent(ev);
    }
  }
  function safeParse(s) { try { return JSON.parse(s); } catch (e) { return null; } }

  function handleEvent(ev) {
    const p = safeParse(ev.p);
    if (!p) return;
    if (ev.t === 'shot') remoteShot(p);
    else if (ev.t === 'res') { R.res = p; R.resAt = performance.now(); R.settled = true; tryApply(); }   // res không có cú đi trước: đồng bộ thẳng
    else if (ev.t === 'to') applyTimeout(p.who === on.role ? 'player' : 'ai');
  }

  /* ---------- Cú đánh của đối thủ ---------- */
  function remoteShot(p) {
    if (gameOver) return;
    R.phase = 'pre'; R.shot = p; R.res = null; R.settled = false;
    R.target = null;
    if (turn !== 'ai') setTurn('ai');
    stopOppAimVisual();
    if (ballInHand && ballInHandOwner === 'ai') { /* giữ cờ đến lúc đánh */ }

    const d = Math.hypot(cueBall.x - p.cx, cueBall.y - p.cy);
    if (d > 2) {
      cueBall.active = true; cueBall.potted = false;
      aiCueMove = { mode: 'full', sx: cueBall.x, sy: cueBall.y, tx: p.cx, ty: p.cy, start: performance.now(), duration: 380 };
    } else {
      previewShot();
    }
  }
  window.onlineCueMoved = function () { if (R.phase === 'pre') previewShot(); };

  function previewShot() {
    const p = R.shot; if (!p || gameOver) return;
    spin.x = p.sx; spin.y = p.sy; updateSpinUI();
    aiCueVisual = { dir: { x: p.dx, y: p.dy }, start: performance.now(), duration: 750 };
    setMessage(NAMES.ai + ' đang ngắm...');
    setTimeout(fireRemoteShot, 800);
  }
  function fireRemoteShot() {
    const p = R.shot;
    if (!p || R.phase !== 'pre') return;
    if (gameOver) { R.phase = 'idle'; return; }
    if (fsPaused || isMoving() || shotLocked || aiCueMove) { setTimeout(fireRemoteShot, 250); return; }
    aiCueVisual = null;
    cueBall.x = p.cx; cueBall.y = p.cy;     // đúng vị trí người đánh đã dùng
    R.phase = 'sim';
    shoot('ai', { x: p.dx, y: p.dy }, p.pw, { x: p.sx, y: p.sy });
    if (!shotLocked) { R.phase = 'pre'; setTimeout(fireRemoteShot, 250); }
  }

  // Bi dừng hết sau cú của đối thủ (gọi từ updatePhysics)
  window.onlineRemoteSettled = function () { R.settled = true; tryApply(); };

  function tryApply() {
    if (!(R.res && R.settled)) return;
    const res = R.res;
    R.phase = 'idle'; R.shot = null; R.res = null; R.settled = false;
    applyRes(res);
    processEvents();
  }

  const flipSide = s => (s === 'm' ? 'ai' : s === 'o' ? 'player' : null);
  const flipGroup = g => g;     // nhóm bi ghi theo tên nhóm, không phụ thuộc phía

  function applyRes(r) {
    currentShot = null; shotLocked = false; aiCueVisual = null; aiCueMove = null; aiThinking = false;
    for (const row of r.bs) {
      const b = getBall(row[0]); if (!b) continue;
      b.x = row[1]; b.y = row[2];
      stopBall(b);
      b.active = !!row[3]; b.potted = !row[3];
    }
    rebuildTray();
    // r.g: nhóm bi theo phía người đánh (p = người đánh, o = người kia)
    groups.ai = flipGroup(r.g.p); groups.player = flipGroup(r.g.o);
    breakDone = !!r.bd; isBreakShot = !r.bd;
    clearBallInHand();
    spin.x = 0; spin.y = 0; updateSpinUI();

    const nextTurn = flipSide(r.t);
    if (turn !== nextTurn) setTurn(nextTurn);
    if (r.bih) {
      ballInHand = true; ballInHandOwner = flipSide(r.bih);
      const cb = cueBall; cb.active = true; cb.potted = false; stopBall(cb);
    }
    hitChain.player = 0;
    hitChain.ai = r.ch | 0;
    if (hitChain.ai > 0) showHitComboFx(hitChain.ai);

    hasAim = true; aimWorld = { x: cueBall.x + 260, y: cueBall.y };
    updateHud();
    on.shotSeq++;
    if (r.ov) {
      const won = r.ov.r === 'lose';   // người đánh thua = mình thắng
      endGame(won ? 'win' : 'lose', won ? NAMES.ai + ' làm rơi bi số 8 quá sớm hoặc phạm lỗi' : NAMES.ai + ' đã đưa bi số 8 xuống lỗ hợp lệ');
      afterEnd();
      return;
    }
    setMessage(r.m || ('Lượt của ' + sideName(turn)), turn === 'player' && ballInHand);
  }

  // Khay bi vào lỗ khớp với kết quả chốt
  function rebuildTray() {
    const gone = new Set(balls.filter(b => !b.active && b.num !== 0).map(b => b.num));
    pottedTrayBalls = pottedTrayBalls.filter(t => gone.has(t.num));
    pocketAnimations = pocketAnimations.filter(a => gone.has(a.num));
    sinkingBalls = sinkingBalls.filter(a => a.num === 0 || gone.has(a.num));
    const have = new Set();
    pottedTrayBalls.concat(pocketAnimations, sinkingBalls).forEach(x => have.add(x.num));
    for (const n of gone) {
      if (have.has(n)) continue;
      const b = getBall(n), slot = getTraySlot(pottedTrayBalls.length);
      pottedTrayBalls.push({ num: n, type: b.type, x: slot.x, y: slot.y });
    }
    pottedTrayBalls.forEach((t, i) => { const s = getTraySlot(i); t.x = s.x; t.y = s.y; });
  }

  /* ---------- Cú đánh của mình ---------- */
  const _shoot = shoot;
  shoot = function (side, dir, power, shotSpin) {
    if (!ONLINE_ON || side !== 'player') return _shoot.apply(this, arguments);
    if (gameOver || isMoving() || shotLocked || fsPaused || R.phase !== 'idle' || on.forfeit) return;
    const cx = cueBall.x, cy = cueBall.y;
    const body = { cx, cy, dx: dir.x, dy: dir.y, pw: power, sx: (shotSpin && shotSpin.x) || 0, sy: (shotSpin && shotSpin.y) || 0 };
    _shoot.apply(this, arguments);
    if (shotLocked) {
      T.active = false;
      aimSent = null;
      writeEvent('shot', body);
    }
  };

  let lastEnd = null;
  const _end = endGame;
  endGame = function (t, sub) { lastEnd = { r: t, s: sub }; return _end.apply(this, arguments); };

  const _finish = finishShot;
  finishShot = function () {
    const mine = ONLINE_ON && currentShot && currentShot.side === 'player';
    lastEnd = null;
    const out = _finish.apply(this, arguments);
    if (mine) {
      on.shotSeq++;
      writeEvent('res', {
        bs: balls.map(b => [b.num, b.x, b.y, b.active ? 1 : 0]),
        g: { p: groups.player, o: groups.ai },
        t: turn === 'player' ? 'm' : 'o',
        bih: ballInHand ? (ballInHandOwner === 'player' ? 'm' : 'o') : null,
        bd: breakDone ? 1 : 0,
        m: msg.textContent,
        ch: hitChain.player | 0,
        ov: lastEnd ? { r: lastEnd.r } : null
      });
      if (lastEnd) afterEnd();
    }
    return out;
  };

  /* ---------- Hết giờ ---------- */
  function applyTimeout(side) {
    if (gameOver || R.phase !== 'idle') return;
    isAiming = false; cueBallDragging = false; powerDragging = false; rulerDragging = false;
    aimPower = 0; powerFill.style.height = '0%'; resetPowerPercent();
    powerWrap.classList.remove('charging'); aimRuler.classList.remove('active');
    stopOppAimVisual();
    const other = otherSide(side);
    on.shotSeq++;
    if (isBreakShot && !breakDone) {
      setTurn(other);
      updateHud();
      setMessage(sideName(side) + ' hết giờ. Đến lượt ' + sideName(other) + ' đề-pa.', true);
    } else {
      setTurn(other);
      startBallInHand(other, sideName(side) + ' hết giờ.');
      updateHud();
    }
  }

  async function fireTimeout(side) {
    const who = side === 'player' ? on.role : oppRole();
    const ok = await writeEvent('to', { who });
    if (ok) applyTimeout(side);   // không ghi được = bên kia đã đi trước ở số thứ tự này; sự kiện của họ sẽ tới qua luồng
  }

  /* ---------- Đồng hồ + xem ngắm trực tiếp (mỗi khung hình) ---------- */
  function setRing(side, left) {
    const card = $(side === 'player' ? 'playerTargetCard' : 'aiTargetCard');
    const other = $(side === 'player' ? 'aiTargetCard' : 'playerTargetCard');
    if (other) { other.classList.remove('timerActive'); other.classList.remove('timerLow'); }
    if (!card) return;
    const percent = Math.max(0, Math.min(100, left / SHOT_SECONDS * 100));
    card.classList.add('timerActive');
    card.style.setProperty('--shotTimer', percent.toFixed(2));
    card.style.setProperty('--shotTimerColor', percent <= 20 ? '#ff3030' : percent <= 40 ? '#ff9f2a' : percent <= 65 ? '#ffe45c' : '#51ff7a');
  }
  function clearRings() {
    ['playerTargetCard', 'aiTargetCard'].forEach(id => { const c = $(id); if (c) { c.classList.remove('timerActive'); c.classList.remove('timerLow'); } });
  }

  let aimSent = null, aimAt = 0, aimK = 0;
  function sendAim(now) {
    if (now - aimAt < AIM_MS || !on.active) return;
    const dragging = isAiming || powerDragging || cueBallDragging || rulerDragging || (hasAim && !aimSent);
    if (!dragging) return;
    const d = (powerDragging && powerLockedDir) ? powerLockedDir : getAimDir();
    const a = { x: Math.round(cueBall.x * 10) / 10, y: Math.round(cueBall.y * 10) / 10, dx: Math.round(d.x * 1000) / 1000, dy: Math.round(d.y * 1000) / 1000,
      pw: powerDragging ? Math.round(aimPower * 100) / 100 : 0, sx: Math.round(spin.x * 100) / 100, sy: Math.round(spin.y * 100) / 100 };
    const key = JSON.stringify(a);
    if (key === aimSent) return;
    aimSent = key; aimAt = now;
    a.k = ++aimK;
    http('PUT', '/bida_rooms/' + on.code + '/aim/' + on.role, a).catch(() => {});
  }

  function stopOppAimVisual() {
    if (aiCueVisual && aiCueVisual.live) aiCueVisual = null;
    R.target = null;
  }
  // Đối thủ đang ngắm / kéo bi cái: hiện cơ và vị trí bi cái của họ
  function liveAim(t) {
    const a = t.aim && t.aim[oppRole()];
    if (!a || typeof a.k !== 'number' || a.k === R.lastAimK) return;
    R.lastAimK = a.k;
    if (turn !== 'ai' || gameOver || R.phase !== 'idle' || isMoving() || shotLocked || performance.now() < on.introUntil) return;
    if (Math.hypot(cueBall.x - a.x, cueBall.y - a.y) > 0.5) R.target = { x: a.x, y: a.y };
    spin.x = a.sx; spin.y = a.sy; updateSpinUI();
    aiCueVisual = { dir: { x: a.dx, y: a.dy }, start: performance.now(), duration: 1e9, live: true, pull: 14 + a.pw * 80 };
  }

  window.onlineTick = function (now) {
    if (!ONLINE_ON || !on.started) return;

    // cơ và bi cái của đối thủ trượt mượt tới vị trí mới nhất
    if (R.target && turn === 'ai' && !shotLocked && !aiCueMove && R.phase === 'idle') {
      cueBall.x += (R.target.x - cueBall.x) * 0.35;
      cueBall.y += (R.target.y - cueBall.y) * 0.35;
      if (Math.hypot(cueBall.x - R.target.x, cueBall.y - R.target.y) < 0.3) { cueBall.x = R.target.x; cueBall.y = R.target.y; R.target = null; }
    }

    // R.res chờ quá lâu mà bi vẫn chưa dừng (hai máy mô phỏng lệch nhau): chốt theo kết quả của người đánh
    if (R.res && !R.settled && now - R.resAt > 25000) {
      shotLocked = false; balls.forEach(b => { if (b.active) stopBall(b); }); R.settled = true; tryApply();
    }

    const waiting = !gameOver && !on.forfeit && !isMoving() && !shotLocked && !aiCueMove && R.phase === 'idle' && now >= on.introUntil && !fsPaused;
    if (!waiting) {
      if (T.active && !(fsPaused || now < on.introUntil)) { T.active = false; clearRings(); }
      T.last = now;
      return;
    }

    if (!T.active || T.side !== turn || T.key !== on.shotSeq) {
      Object.assign(T, { active: true, side: turn, key: on.shotSeq, start: now, fired: false });
      aimSent = null;   // đầu lượt: gửi lại hướng cơ cho đối thủ xem
    }
    T.last = now;
    const left = SHOT_SECONDS - (now - T.start) / 1000;
    setRing(T.side, left);

    if (T.side === 'player') {
      sendAim(now);
      if (left <= 0 && !T.fired) { T.fired = true; fireTimeout('player'); }
    } else if (left <= -GRACE_MS / 1000 && !T.fired) {
      T.fired = true; fireTimeout('ai');     // bên kia không báo hết giờ (mất mạng / treo máy): thay họ báo
    }
  };

  /* ---------- Kết thúc / thoát ---------- */
  function afterEnd() {
    RESET_LABEL = 'TÌM TRẬN MỚI';
    resetBtn.textContent = RESET_LABEL;
    clearRings();
  }

  function opponentLeft() {
    if (on.forfeit) return;
    on.forfeit = true;
    if (!gameOver) {
      endGame('win', NAMES.ai + ' đã thoát trận');
      afterEnd();
    } else {
      toast(NAMES.ai + ' đã rời phòng');
    }
    stopOppAimVisual();
  }

  async function closeRoomSilently() {
    on.closing = true;
    clearInterval(on.hb); clearInterval(on.watch);
    if (on.es) on.es.close();
    const code = on.code, active = on.active;
    Object.assign(on, { active: false, code: null, role: null, es: null, tree: null, started: false });
    if (active && code) { try { await http('DELETE', '/bida_rooms/' + code); } catch (e) {} }
  }

  // Rời trận: chưa đủ người thì xoá phòng; đã vào trận thì ghi "left" để người ở lại thắng (người ở lại sẽ xoá phòng)
  async function leaveRoom() {
    const { code, role, active, started, tree } = on;
    on.closing = true;
    clearInterval(on.hb); clearInterval(on.watch);
    if (on.es) on.es.close();
    Object.assign(on, { active: false, code: null, role: null, es: null, tree: null, started: false });
    if (!(active && code)) return;
    try {
      const oppLeft = tree && tree.left && tree.left !== role;
      if (started && tree && tree.guest && !oppLeft) await http('PUT', '/bida_rooms/' + code + '/left', role);
      else await http('DELETE', '/bida_rooms/' + code);
    } catch (e) {}
  }

  // Thoát hẳn chế độ online (về chơi với máy / menu)
  window.onlineExit = function () {
    qmStop(true);
    if (on.active) leaveRoom();
    ONLINE_ON = false; ONLINE_FIRST = null;
    NAMES.player = 'PLAYER'; NAMES.ai = 'AI.GiaBao';
    $('playerAvatar').textContent = NAMES.player; $('aiAvatar').textContent = NAMES.ai;
    $('titleSub').textContent = 'Player vs AI · 8-Ball rút gọn';
    document.body.classList.remove('onlineGame');
    $('onIntro').classList.remove('show'); $('onConfirm').classList.remove('show');
    clearRings();
    R.phase = 'idle'; R.shot = null; R.res = null; R.settled = false; R.target = null;
    aiCueVisual = null; aiCueMove = null;
    try { REPLAY.enabled = localStorage.getItem('bida:replay') !== '0'; } catch (e) { REPLAY.enabled = true; }
    RESET_LABEL = 'CHƠI LẠI';
    resetBtn.textContent = RESET_LABEL;
  };

  function leaveAndMenu(view, thenSearch) {
    onlineExit();
    gameInProgress = false;
    openMenu(view);
    if (thenSearch) findOpponent();
  }

  window.__onlineDebug = { on, R, T, qm };   // chỉ để kiểm thử

  /* ---------- Nút bấm ---------- */
  $('mmFind').addEventListener('click', findOpponent);
  $('mmCancel').addEventListener('click', cancelSearch);

  // ☰ trong lúc đấu online: hỏi xác nhận thay vì mở menu (ván online không tạm dừng được)
  window.addEventListener('click', e => {
    if (!ONLINE_ON) return;
    if (e.target.closest && e.target.closest('#homeBtn')) {
      e.stopImmediatePropagation(); e.preventDefault();
      askLeave(() => leaveAndMenu('home'));
    } else if (e.target === resetBtn) {
      e.stopImmediatePropagation(); e.preventDefault();
      leaveAndMenu('online', true);   // TÌM TRẬN MỚI
    }
  }, true);

  // đóng trang / thoát đột ngột: báo cho đối thủ (hoặc xoá phòng / hàng chờ)
  window.addEventListener('pagehide', () => {
    const ka = (method, path, body) => { try { fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body), keepalive: true }); } catch (e) {} };
    if (qm.on && qm.id) ka('DELETE', '/bida_queue/' + qm.id);
    if (!on.active || !on.code) return;
    const t = on.tree;
    if (on.started && t && t.guest && !(t.left && t.left !== on.role)) ka('PUT', '/bida_rooms/' + on.code + '/left', on.role);
    else ka('DELETE', '/bida_rooms/' + on.code);
  });
})();
