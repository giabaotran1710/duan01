/* Cờ Caro trực tuyến: hai người chơi ở hai máy, vào cùng một phòng bằng MÃ PHÒNG (5 ký tự).
 * Dùng Firebase Realtime Database qua REST + EventSource (không cần SDK, không cần máy chủ riêng).
 *
 * Dữ liệu: /caro_rooms/{MÃ}
 *   host, guest : { id, name, seen }   id ngẫu nhiên giữ trong máy mỗi người; seen = nhịp tim (giờ máy chủ)
 *   round       : khoá ván hiện tại (g0, g1, ...); rounds/{g} = { xHost }  (ai là X; mỗi ván đổi bên)
 *   moves/{g}/m{n} = { n, r, c, p, u }  nước thứ n, ô (r,c), quân p, người đi u (id)
 * Mỗi nước chỉ ghi được một lần (quy tắc trong database.rules.json). Mã phòng không liệt kê được: phải biết mã mới vào.
 * Chạy sau script chính của caro.html và dùng các biến/hàm toàn cục của nó (board, place, createBoard, checkWin, ...).
 */
(function () {
  'use strict';
  const DB = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bỏ O/0/I/1 cho khỏi nhầm khi đọc mã
  const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  const SAVE_KEY = 'caro_online_v1';
  const HEARTBEAT_MS = 12000, STALE_MS = 40000;

  const on = { active: false, code: null, role: null, id: null, es: null, tree: null, round: null, applied: 0, mySym: 'X',
               hb: null, watch: null, oppSeen: null, oppSeenAt: 0, lobby: false, started: false, closing: false };

  // ---------- Mạng ----------
  async function http(method, path, body) {
    const res = await fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) { const e = new Error('http_' + res.status); e.status = res.status; throw e; }
    return res.json();
  }
  const SV = { '.sv': 'timestamp' };
  function rndId() { const a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
  function genCode() { let s = ''; const a = new Uint8Array(5); crypto.getRandomValues(a); for (const b of a) s += ALPHA[b % ALPHA.length]; return s; }
  const myName = () => (window.Scores && Scores.hasName()) ? Scores.getName() : 'Người chơi';

  // ---------- Giao diện ----------
  const css = `
  #onPanel{display:none;width:100%;flex-direction:column;align-items:stretch;gap:8px}
  #overlay.onl #onPanel{display:flex}
  #overlay.onl #startBtn,#overlay.onl #pvpBtn,#overlay.onl #onlineBtn,#overlay.onl #dice-container,#overlay.onl #status,#overlay.onl #blub,#overlay.onl .mode-label{display:none!important}
  .onSub{font-size:11px;color:#cdc4b8;text-align:center;line-height:1.5;margin:0}
  .onRow{display:flex;gap:8px}
  #onCodeIn{flex:1;min-width:0;height:50px;border-radius:8px;border:1px solid var(--line-strong);background:rgba(243,238,229,.04);color:var(--text);
    font-size:22px;font-weight:800;letter-spacing:.35em;text-align:center;text-transform:uppercase;outline:none}
  #onCodeIn::placeholder{letter-spacing:.05em;font-size:12px;font-weight:600;color:var(--dim)}
  #onCodeIn:focus{border-color:rgba(243,238,229,.5)}
  #onJoin{width:96px;margin:0}
  #onMsg{min-height:16px;font-size:11px;color:#ff9b8a;text-align:center}
  #onCodeBox{display:none;text-align:center;padding:14px 8px;border:1px solid var(--line-strong);border-radius:10px;background:rgba(243,238,229,.04)}
  #onCode{font-size:40px;font-weight:900;letter-spacing:.3em;margin-right:-.3em;color:var(--text)}
  #onWait{font-size:11px;color:#cdc4b8;margin-top:6px}
  #onWait i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#cdc4b8;margin:0 2px;animation:onDot 1.2s infinite}
  #onWait i:nth-child(2){animation-delay:.2s}#onWait i:nth-child(3){animation-delay:.4s}
  @keyframes onDot{0%,80%,100%{opacity:.2}40%{opacity:1}}
  .onLink{border:0;background:transparent;color:var(--dim);font-size:11px;font-weight:600;cursor:pointer;padding:8px 0}
  .onLink:hover{color:var(--text)}
  body.online .action-card:nth-child(1),body.online .action-card:nth-child(3){display:none}
  #onlineBar{display:none;align-items:center;justify-content:space-between;gap:10px;font-size:10px;color:#c7beb1;padding:2px 2px 4px}
  body.online #onlineBar{display:flex}
  #onlineBar b{color:var(--text);letter-spacing:.2em}
  #onlineBar .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#5fd48a;margin-right:5px}
  #onlineBar .dot.off{background:#e0903a}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const content = document.querySelector('#overlay .overlay-content');
  const pvpBtn = document.getElementById('pvpBtn');
  const btn = document.createElement('button');
  btn.className = 'mode-btn'; btn.id = 'onlineBtn'; btn.textContent = 'TRỰC TUYẾN (MÃ PHÒNG)';
  pvpBtn.after(btn);

  const panel = document.createElement('div');
  panel.id = 'onPanel';
  panel.innerHTML = `
    <div class="mode-label" style="display:block">Chơi trực tuyến</div>
    <p class="onSub" id="onHint">Một người tạo phòng và gửi mã cho bạn; người kia nhập mã để vào cùng phòng.</p>
    <div id="onMenu">
      <button class="mode-btn" id="onCreate">TẠO PHÒNG</button>
      <div class="onRow"><input id="onCodeIn" maxlength="5" placeholder="NHẬP MÃ PHÒNG" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="mode-btn" id="onJoin">VÀO</button></div>
      <button class="mode-btn" id="onResume" style="display:none"></button>
    </div>
    <div id="onCodeBox"><div class="onSub">Mã phòng của bạn</div><div id="onCode">-----</div>
      <div class="onRow" style="justify-content:center;margin-top:8px"><button class="mode-btn" id="onCopy" style="width:130px;height:38px;margin:0">SAO CHÉP MÃ</button></div>
      <div id="onWait">Đang chờ người chơi thứ hai<i></i><i></i><i></i></div></div>
    <div id="onMsg"></div>
    <button class="onLink" id="onBack">← Quay lại</button>`;
  content.insertBefore(panel, document.getElementById('btnSiteReturn'));

  const bar = document.createElement('div');
  bar.id = 'onlineBar';
  bar.innerHTML = '<span><span class="dot" id="onDot"></span><span id="onOpp">Đối thủ</span></span><span>Phòng <b id="onBarCode"></b></span>';
  document.getElementById('statusTop').after(bar);

  const $ = id => document.getElementById(id);
  const overlayEl = $('overlay');
  const msg = t => { $('onMsg').textContent = t || ''; };

  function showMenu() {
    $('onMenu').style.display = ''; $('onCodeBox').style.display = 'none'; $('onHint').style.display = ''; msg('');
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (s && Date.now() - s.t < 6 * 3600e3) { $('onResume').style.display = ''; $('onResume').textContent = 'TIẾP TỤC PHÒNG ' + s.code; }
      else $('onResume').style.display = 'none';
    } catch (e) { $('onResume').style.display = 'none'; }
  }
  btn.onclick = () => { overlayEl.classList.add('onl'); showMenu(); };
  $('onBack').onclick = async () => { if (on.active) await leave(); overlayEl.classList.remove('onl'); };
  $('onCodeIn').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('onCodeIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('onJoin').click(); });
  $('onCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(on.code); $('onCopy').textContent = 'ĐÃ SAO CHÉP ✓'; setTimeout(() => $('onCopy').textContent = 'SAO CHÉP MÃ', 1500); } catch (e) {}
  };

  // ---------- Tạo / vào phòng ----------
  function remember() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ code: on.code, id: on.id, role: on.role, t: Date.now() })); } catch (e) {} }
  function forget() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

  async function createRoom() {
    msg(''); $('onCreate').disabled = true;
    try {
      let code = null;
      for (let i = 0; i < 6 && !code; i++) { const c = genCode(); if ((await http('GET', '/caro_rooms/' + c + '/host')) === null) code = c; }
      if (!code) throw new Error('no_code');
      const id = rndId();
      await http('PUT', '/caro_rooms/' + code, {
        host: { id, name: myName(), seen: SV }, created: SV, round: 'g0', rounds: { g0: { xHost: Math.random() < 0.5 } },
      });
      Object.assign(on, { code, id, role: 'host' }); remember();
      $('onMenu').style.display = 'none'; $('onHint').style.display = 'none'; $('onCodeBox').style.display = 'block'; $('onCode').textContent = code;
      connect();
    } catch (e) { msg('Không tạo được phòng. Kiểm tra mạng hoặc quy tắc Firebase rồi thử lại.'); }
    $('onCreate').disabled = false;
  }

  async function joinRoom(code, resumeId) {
    code = String(code || '').toUpperCase();
    if (!CODE_RE.test(code)) return msg('Mã phòng gồm 5 ký tự (chữ và số).');
    msg(''); $('onJoin').disabled = true;
    try {
      const room = await http('GET', '/caro_rooms/' + code);
      if (!room || !room.host) { msg('Không tìm thấy phòng này.'); return; }
      let id = resumeId;
      if (resumeId && room.host.id === resumeId) { Object.assign(on, { code, id, role: 'host' }); }
      else if (resumeId && room.guest && room.guest.id === resumeId) { Object.assign(on, { code, id, role: 'guest' }); }
      else {
        if (room.guest) { msg('Phòng đã đủ hai người.'); return; }
        id = rndId();
        try { await http('PUT', '/caro_rooms/' + code + '/guest', { id, name: myName(), seen: SV }); }
        catch (e) { msg('Phòng đã đủ hai người.'); return; }
        Object.assign(on, { code, id, role: 'guest' });
      }
      remember(); connect();
    } catch (e) { msg('Không vào được phòng. Kiểm tra mạng rồi thử lại.'); }
    finally { $('onJoin').disabled = false; }
  }
  $('onCreate').onclick = createRoom;
  $('onJoin').onclick = () => joinRoom($('onCodeIn').value);
  $('onResume').onclick = () => { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); joinRoom(s.code, s.id).then(() => { if (!on.active) forget(); showMenu(); }); } catch (e) {} };

  // ---------- Luồng dữ liệu thời gian thực ----------
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
    on.active = true; on.closing = false; on.started = false; on.tree = null; on.applied = 0; on.round = null;
    document.body.classList.add('online');
    $('onBarCode').textContent = on.code;
    startStream();
    clearInterval(on.hb);
    const beat = () => http('PUT', '/caro_rooms/' + on.code + '/' + on.role + '/seen', SV).catch(() => {});
    on.hb = setInterval(beat, HEARTBEAT_MS);
    clearInterval(on.watch); on.watch = setInterval(updateOpp, 4000);
  }
  function startStream() {
    if (on.es) on.es.close();
    const es = new EventSource(DB + '/caro_rooms/' + on.code + '.json');
    on.es = es;
    es.addEventListener('put', e => { const m = JSON.parse(e.data); on.tree = setIn(on.tree, split(m.path), m.data === undefined ? null : m.data); onTree(); });
    es.addEventListener('patch', e => {
      const m = JSON.parse(e.data), base = split(m.path);
      for (const k of Object.keys(m.data || {})) on.tree = setIn(on.tree, base.concat(split(k)), m.data[k]);
      onTree();
    });
    es.onerror = () => { setConn(false); };   // EventSource tự nối lại, rồi gửi lại toàn bộ dữ liệu
    es.onopen = () => setConn(true);
  }
  function setConn(ok) { const d = $('onDot'); if (d) d.classList.toggle('off', !ok); }

  function oppNode() { const t = on.tree; if (!t) return null; return on.role === 'host' ? t.guest : t.host; }
  function updateOpp() {
    const o = oppNode();
    $('onOpp').textContent = o ? (o.name || 'Đối thủ') : 'Đang chờ đối thủ';
    const seen = o ? o.seen : null;
    if (seen !== on.oppSeen) { on.oppSeen = seen; on.oppSeenAt = Date.now(); }
    const lost = o && Date.now() - on.oppSeenAt > STALE_MS;
    $('onDot').classList.toggle('off', !o || lost);
    if (lost && on.started && !gameOver) $('onOpp').textContent = (o.name || 'Đối thủ') + ' (mất kết nối?)';
  }

  function onTree() {
    const t = on.tree;
    if (t === null && on.active && !on.closing) { // phòng đã bị xoá
      const was = on.started;
      leave().then(() => { goToModeSelect(); overlayEl.classList.remove('onl'); if (was) toast('Chủ phòng đã rời đi. Phòng đã đóng.'); });
      return;
    }
    if (!t || !t.host) return;
    updateOpp();
    if (t.guest && !on.started) {
      on.started = true;
      overlayEl.style.display = 'none'; overlayEl.classList.remove('onl');
      boardDiv.classList.remove('disabled');
      startRound(t.round || 'g0');
    }
    if (!on.started) return;
    if (t.round && t.round !== on.round) { startRound(t.round); toast('Ván mới bắt đầu'); }
    applyMoves();
  }

  function roundMoves() {
    const m = on.tree && on.tree.moves && on.tree.moves[on.round];
    if (!m) return [];
    return Object.keys(m).map(k => m[k]).filter(x => x && typeof x.n === 'number').sort((a, b) => a.n - b.n);
  }

  function startRound(g) {
    const t = on.tree, xHost = !!(t.rounds && t.rounds[g] && t.rounds[g].xHost);
    on.round = g; on.applied = 0;
    on.mySym = ((on.role === 'host') === xHost) ? 'X' : 'O';
    aiRequestId++; aiThinking = false; gameOver = false; lastCell = null;
    human = on.mySym; ai = on.mySym === 'X' ? 'O' : 'X'; currentTurn = 'X'; pvpMode = true;
    moveHistory = []; canUndo = false; undoUsed = false; drawMilestones.clear(); drawPopup.style.display = 'none';
    createBoard(); statusTop.classList.remove('win');
    resetBtn.textContent = 'Ván mới';
    commentaryDiv.textContent = `Bạn chơi quân ${on.mySym}. X đi trước.`;
    renderTurn();
  }

  function renderTurn() {
    if (gameOver) return;
    const mine = currentTurn === on.mySym;
    statusTop.innerHTML = '';
    const b = document.createElement('div');
    b.id = 'turnBadge'; b.className = 'turnBadge badge-' + currentTurn;
    b.innerHTML = `<span class="badge-symbol">${currentTurn}</span><span class="badge-text">${mine ? 'Lượt của bạn' : 'Đối thủ đang đi...'}</span>`;
    statusTop.appendChild(b);
    boardDiv.classList.toggle('disabled', !mine);
  }

  function applyMoves() {
    for (const mv of roundMoves()) {
      if (mv.n < on.applied) continue;
      if (mv.n > on.applied) break;   // thiếu nước ở giữa: chờ dữ liệu về đủ
      if (board[mv.r] && board[mv.r][mv.c] === '') afterMove(mv.r, mv.c, mv.p);
      on.applied = mv.n + 1;
    }
  }
  function afterMove(r, c, p) {
    place(r, c, p);
    if (checkWin(r, c, p)) {
      highlightWin(r, c, p); gameOver = true;
      const win = p === on.mySym;
      statusTop.textContent = win ? '🎉 Bạn thắng!' : 'Đối thủ thắng';
      statusTop.classList.add('win');
      if (win) launchConfetti();
      commentaryDiv.textContent = 'Bấm "Ván mới" để chơi tiếp (đổi bên X/O).';
      boardDiv.classList.remove('disabled');
      return;
    }
    currentTurn = p === 'X' ? 'O' : 'X';
    renderTurn();
  }

  // ---------- Hành động của người chơi ----------
  window.onlineClick = async function (r, c) {
    if (!on.active || !on.started || gameOver || currentTurn !== on.mySym || board[r][c] !== '') return;
    const n = on.applied, g = on.round;
    on.applied = n + 1;
    afterMove(r, c, on.mySym);   // hiện ngay, không chờ mạng
    try { await http('PUT', '/caro_rooms/' + on.code + '/moves/' + g + '/m' + n, { n, r, c, p: on.mySym, u: on.id }); }
    catch (e) { toast('Gửi nước đi thất bại, đang đồng bộ lại...'); resync(); }
  };
  function resync() { if (on.es) on.es.close(); on.tree = null; on.started = true; startStream(); setTimeout(() => { if (on.tree && on.tree.round) startRound(on.tree.round); applyMoves(); }, 1200); }

  window.onlineNewRound = async function () {
    if (!on.active || !on.started) return;
    if (!gameOver) { toast('Chỉ bắt đầu ván mới khi ván này đã kết thúc.'); return; }
    const next = 'g' + (parseInt(on.round.slice(1), 10) + 1);
    const cur = on.tree.rounds[on.round];
    try {
      try { await http('PUT', '/caro_rooms/' + on.code + '/rounds/' + next, { xHost: !cur.xHost }); } catch (e) { /* đối thủ vừa tạo xong */ }
      await http('PUT', '/caro_rooms/' + on.code + '/round', next);
    } catch (e) { toast('Không tạo được ván mới. Thử lại.'); }
  };

  // Rời phòng: dọn dẹp, chủ phòng xoá phòng, khách chỉ xoá chỗ của mình
  async function leave() {
    on.closing = true;
    clearInterval(on.hb); clearInterval(on.watch);
    if (on.es) on.es.close();
    const { code, role, active } = on;
    Object.assign(on, { active: false, code: null, role: null, es: null, tree: null, started: false, round: null, applied: 0 });
    document.body.classList.remove('online');
    forget();
    if (active && code) {
      try { if (role === 'host') await http('DELETE', '/caro_rooms/' + code); else await http('DELETE', '/caro_rooms/' + code + '/guest'); } catch (e) {}
    }
    showMenu();
  }
  window.onlineLeave = () => { if (!on.active) return null; const p = leave(); overlayEl.classList.remove('onl'); return p; };
  window.onlineActive = () => on.active;

  // thông báo nhỏ
  let tt = null;
  function toast(text) {
    let el = document.getElementById('onToast');
    if (!el) { el = document.createElement('div'); el.id = 'onToast'; el.setAttribute('style', 'position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:50;background:rgba(20,18,16,.94);color:#f3eee5;border:1px solid rgba(243,238,229,.2);border-radius:99px;padding:9px 16px;font-size:12px;font-weight:600;max-width:86vw;text-align:center;transition:opacity .25s;opacity:0;pointer-events:none'); document.body.appendChild(el); }
    el.textContent = text; el.style.opacity = '1'; clearTimeout(tt); tt = setTimeout(() => { el.style.opacity = '0'; }, 2600);
  }

  // rời trang: báo phòng đóng (chủ phòng) bằng keepalive
  window.addEventListener('pagehide', () => {
    if (!on.active || !on.code) return;
    try { fetch(DB + '/caro_rooms/' + on.code + (on.role === 'host' ? '' : '/guest') + '.json', { method: 'DELETE', keepalive: true }); } catch (e) {}
  });
})();
