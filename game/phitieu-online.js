/* Phi tiêu trăng rằm - đấu 2 người: hai máy chơi CÙNG MỘT DÃY BÁNH (sinh từ cùng seed), mỗi người có 3 mạng.
 * Chạm vào phi tiêu đã cắm là mất 1 mạng; hết 3 mạng là thua ván. Hai bên chơi song song, thấy đêm và số mạng của nhau.
 * Dùng Firebase Realtime Database qua REST + EventSource (giống Nối thú trực tuyến, không cần SDK hay máy chủ riêng).
 *
 * Dữ liệu: /phitieu_rooms/{MÃ}
 *   host, guest : { id, name, seen }   seen = nhịp tim (giờ máy chủ)
 *   round       : ván hiện tại (g0, g1, ...); rounds/{g} = { seed }
 *   prog/{g}/{host|guest} = { n, l, s }   đêm đang chơi, số mạng còn lại, điểm
 *   win/{g}     = { r }                người thắng; chỉ ghi được một lần
 *   left        : 'host' | 'guest'     người đã thoát; người còn lại thắng và là người xoá phòng
 * Ghép trận nhanh: /phitieu_queue/{id} = { name, seen, room? } giống noithu_queue.
 * Chạy sau script chính của phitieu.html và dùng window.PT. */
(function () {
  'use strict';
  if (!window.PT) return;
  const PT = window.PT;
  const DB = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  const ROOMS = '/phitieu_rooms/', QUEUE = '/phitieu_queue/';
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  const HEARTBEAT_MS = 12000, STALE_MS = 60000, FORFEIT_MS = 150000, COUNT_MS = 3000;
  const snd = (n, o) => { if (window.PTSnd) PTSnd.play(n, o); };

  const on = { active: false, code: null, role: null, id: null, es: null, tree: null, round: null, started: false, closing: false,
               hb: null, watch: null, oppSeen: null, oppSeenAt: 0, oppLost: false, connOk: true, forfeit: false,
               over: false, playing: false, countT: null, sendT: null };

  // ---------- Mạng ----------
  async function http(method, path, body) {
    const res = await fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) { const e = new Error('http_' + res.status); e.status = res.status; throw e; }
    return res.json();
  }
  const SV = { '.sv': 'timestamp' };
  function rndId() { const a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
  function genCode() { let s = ''; const a = new Uint8Array(5); crypto.getRandomValues(a); for (const b of a) s += ALPHA[b % ALPHA.length]; return s; }
  function newSeed() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % 2147483647; }
  const myName = () => (window.Scores && Scores.hasName()) ? Scores.getName() : 'Người chơi';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = id => document.getElementById(id);

  // ---------- Giao diện ----------
  const css = `
  #onl .sheet{width:min(340px,92vw)}
  #onl .sheet h2{margin-bottom:4px}
  .olSub{margin:0 0 12px;text-align:center;font-size:13px;color:#6b4a2c;font-weight:700}
  .olCol{display:flex;flex-direction:column;gap:9px}
  .olRow{display:flex;gap:8px}
  #olCodeIn{flex:1;min-width:0;height:46px;border-radius:12px;border:2px solid #cdb98c;background:#fffdf4;color:var(--ink);font:800 20px/1 var(--ui);letter-spacing:.3em;text-align:center;text-transform:uppercase;outline:none;touch-action:auto;user-select:text;-webkit-user-select:text}
  #olCodeIn::placeholder{letter-spacing:.02em;font-size:12px;font-weight:700;color:#a58d63}
  #olCodeIn:focus{border-color:var(--red)}
  #olJoin{width:84px}
  #olMsg{min-height:16px;margin-top:8px;text-align:center;font-size:12px;color:var(--red2);font-weight:700}
  .olBox{display:none;text-align:center;padding:6px 0 2px}
  #olCode{font:800 38px/1.1 var(--ui);letter-spacing:.3em;margin-right:-.3em;color:var(--red2)}
  .olWait{font-size:13px;color:var(--ink);font-weight:800;margin-top:8px}
  .olWait i{display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin:0 2px;animation:olDot 1.2s infinite}
  .olWait i:nth-child(2){animation-delay:.2s}.olWait i:nth-child(3){animation-delay:.4s}
  @keyframes olDot{0%,80%,100%{opacity:.2}40%{opacity:1}}
  .olBack{display:block;margin:10px auto 0;color:#8a5a36;font-weight:800;font-size:13px;padding:6px 10px}
  .btn.sm{padding:9px 16px;font-size:13px}

  /* khung đối đầu trong ván: hai thẻ nhỏ, mỗi thẻ có tên, 3 đèn lồng nhỏ (mạng) và đêm đang chơi */
  #duel{position:fixed;z-index:6;top:70px;left:50%;transform:translateX(-50%);width:min(214px,calc(100vw - 206px));display:none;gap:6px;pointer-events:none}
  body.duel #duel{display:flex}
  .dc{flex:1;min-width:0;padding:5px 7px 6px;border-radius:10px;background:rgba(10,13,34,.55);box-shadow:inset 0 0 0 1.5px rgba(255,231,163,.25)}
  .dc.me{box-shadow:inset 0 0 0 1.5px rgba(255,231,163,.75)}
  .dc.opp{box-shadow:inset 0 0 0 1.5px rgba(255,138,92,.7)}
  .dc.dead{opacity:.55}
  .dc b{display:block;font:800 11px/1.2 var(--ui);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--paper)}
  .dc .r2{display:flex;align-items:center;justify-content:space-between;margin-top:3px;gap:4px}
  .dc .ls{display:flex;gap:3px}
  .lt{width:10px;height:13px;border-radius:50% / 45%;background:linear-gradient(#ff8a5c,#d8382f);box-shadow:0 0 6px rgba(255,138,92,.8);position:relative}
  .lt::before,.lt::after{content:"";position:absolute;left:2px;right:2px;height:2px;background:#ffd24a}
  .lt::before{top:-1px}.lt::after{bottom:-1px}
  .lt.x{background:#3a3f66;box-shadow:none;opacity:.6}
  .dc .nt{font:800 10px/1 var(--ui);color:var(--moon);white-space:nowrap}
  .dc .st{font:800 9px/1 var(--ui);color:#ffb08a;margin-top:2px;letter-spacing:.04em}
  #duelMsg{position:fixed;z-index:6;left:0;right:0;top:calc(70px + 52px);text-align:center;pointer-events:none;display:none;font:800 12px/1.3 var(--ui);color:var(--moon);text-shadow:0 1px 4px rgba(0,0,0,.7)}
  body.duel #duelMsg{display:block}
  #duelMsg.warn{color:#ff9d7a}
  @media (orientation:landscape) and (max-height:520px){
    #duel{top:10px;width:250px}
    #duelMsg{top:62px}
  }
  #olCount{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;pointer-events:none}
  #olCount.show{display:flex}
  #olCount span{font:400 110px/1 var(--title);color:var(--moon);text-shadow:0 0 28px rgba(216,56,47,.9),0 5px 0 var(--red2);animation:olCnt .9s ease-out both}
  #olCount span.go{font-size:60px;color:#ffd24a}
  @keyframes olCnt{0%{transform:scale(2.2);opacity:0}25%{transform:scale(1);opacity:1}100%{transform:scale(.8);opacity:0}}
  #olIntro .vs{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;width:min(100%,380px)}
  #olIntro .t{grid-column:1/-1;text-align:center;font:800 12px/1 var(--ui);letter-spacing:.24em;color:var(--candle);margin-bottom:14px}
  .ip{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 8px 12px;border-radius:16px;background:rgba(255,231,163,.1);box-shadow:inset 0 0 0 2px var(--c);min-width:0;font-weight:800}
  .ip.l{--c:#ffe7a3;animation:ipL .8s cubic-bezier(.2,.85,.25,1) both}.ip.r{--c:#ff8a5c;animation:ipR .8s cubic-bezier(.2,.85,.25,1) both}
  @keyframes ipL{from{transform:translateX(-110vw)}}@keyframes ipR{from{transform:translateX(110vw)}}
  .ip .lt{width:26px;height:34px}
  .ip .nm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}
  .ip .tg{font-size:9px;letter-spacing:.14em;color:var(--c);min-height:11px}
  #olIntro .x{font:800 16px/1 var(--ui);color:var(--moon);letter-spacing:.1em}
  #olRes .big{font-size:44px}
  #olRes .tt{margin:2px 0 4px;text-align:center;font:400 34px/1.1 var(--title);color:var(--red2)}
  #olRes .sc{display:flex;align-items:center;justify-content:center;gap:14px;margin:6px 0 10px}
  #olRes .sc div{min-width:0;max-width:42%;text-align:center}
  #olRes .sc b{display:block;font:800 38px/1 var(--ui)}
  #olRes .sc small{display:block;font:700 11px/1.3 var(--ui);color:#6b4a2c;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #olRes .sc span{font:800 20px/1 var(--ui);color:#8a5a36}
  #olToast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);z-index:60;padding:9px 16px;border-radius:99px;background:rgba(10,13,34,.92);color:var(--moon);font:800 13px/1.2 var(--ui);opacity:0;pointer-events:none;transition:.25s}
  #olToast.show{opacity:1;transform:translate(-50%,0)}
  @media (prefers-reduced-motion:reduce){.ip.l,.ip.r,#olCount span{animation:none}}
  `;
  const stl = document.createElement('style'); stl.textContent = css; document.head.appendChild(stl);

  const onl = document.createElement('div');
  onl.className = 'ov'; onl.id = 'onl';
  onl.innerHTML = `<div class="sheet" role="dialog" aria-labelledby="olTitle">
    <h2 id="olTitle">Đấu 2 người</h2>
    <div id="olMenu">
      <p class="olSub">Cùng một dãy bánh, mỗi người 3 mạng. Chạm vào phi tiêu đã cắm 3 lần là thua!</p>
      <div class="olCol">
        <button class="btn pri" id="olQuick" data-no-scene>Chơi ngay</button>
        <button class="btn" id="olCreate" data-no-scene>Tạo phòng</button>
        <div class="olRow"><input id="olCodeIn" maxlength="5" placeholder="NHẬP MÃ PHÒNG" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn pri" id="olJoin" data-no-scene>Vào</button></div>
      </div>
    </div>
    <div class="olBox" id="olQueue"><div class="olSub">Đang tìm đối thủ</div><div class="olWait"><i></i><i></i><i></i></div>
      <button class="btn sm" id="olQCancel" data-no-scene style="margin-top:12px">Hủy</button></div>
    <div class="olBox" id="olCodeBox"><div class="olSub" style="margin-bottom:2px">Mã phòng của bạn</div><div id="olCode">-----</div>
      <button class="btn sm" id="olCopy" data-no-scene style="margin-top:8px">Sao chép mã</button>
      <div class="olWait">Đang chờ người chơi thứ hai<i></i><i></i><i></i></div></div>
    <div id="olMsg"></div>
    <button class="olBack" id="olBack" data-no-scene>← Quay lại</button>
  </div>`;
  document.body.appendChild(onl);

  const duel = document.createElement('div'); duel.id = 'duel';
  duel.innerHTML = '<div class="dc me" id="dcMe"></div><div class="dc opp" id="dcOpp"></div>';
  document.body.appendChild(duel);
  const duelMsg = document.createElement('div'); duelMsg.id = 'duelMsg'; document.body.appendChild(duelMsg);
  const count = document.createElement('div'); count.id = 'olCount'; document.body.appendChild(count);
  const intro = document.createElement('div'); intro.id = 'olIntro'; intro.className = 'ov'; document.body.appendChild(intro);
  const res = document.createElement('div'); res.id = 'olRes'; res.className = 'ov';
  res.innerHTML = `<div class="sheet" role="dialog"><div class="tt" id="orTitle"></div><p class="sub" id="orSub"></p><div class="sc" id="orScore"></div>
    <div class="row"><button class="btn pri" id="orAgain" data-no-scene>Ván mới</button><button class="btn" id="orLeave" data-no-scene>Thoát phòng</button></div></div>`;
  document.body.appendChild(res);
  const cfm = document.createElement('div'); cfm.id = 'olCfm'; cfm.className = 'ov'; document.body.appendChild(cfm);
  const toastEl = document.createElement('div'); toastEl.id = 'olToast'; document.body.appendChild(toastEl);
  let toastT = 0;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); }

  const msg = t => { $('olMsg').textContent = t || ''; };
  function showMenu() {
    $('olMenu').style.display = ''; $('olCodeBox').style.display = 'none'; $('olQueue').style.display = 'none';
    $('olCode').textContent = '-----'; $('olCodeIn').value = ''; msg('');
  }
  $('onlineBtn').addEventListener('click', () => { PT.hideMenu(); showMenu(); onl.classList.add('on'); });
  $('olBack').onclick = async () => { await cancelAll(); onl.classList.remove('on'); PT.showMenu(); };
  $('olCodeIn').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('olCodeIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('olJoin').click(); });
  $('olCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(on.code); $('olCopy').textContent = 'Đã sao chép'; setTimeout(() => $('olCopy').textContent = 'Sao chép mã', 1500); } catch (e) {}
  };

  // ---------- Tạo / vào phòng ----------
  async function makeRoom() {
    let code = null;
    for (let i = 0; i < 6 && !code; i++) { const c = genCode(); if ((await http('GET', ROOMS + c + '/host')) === null) code = c; }
    if (!code) throw new Error('no_code');
    const id = rndId();
    await http('PUT', ROOMS + code, { host: { id, name: myName(), seen: SV }, created: SV, round: 'g0', rounds: { g0: { seed: newSeed() } } });
    Object.assign(on, { code, id, role: 'host' });
    connect();
    return code;
  }
  async function createRoom() {
    msg(''); $('olCreate').disabled = true;
    try {
      const code = await makeRoom();
      $('olMenu').style.display = 'none'; $('olCodeBox').style.display = 'block'; $('olCode').textContent = code;
    } catch (e) { msg('Không tạo được phòng. Kiểm tra mạng rồi thử lại.'); }
    $('olCreate').disabled = false;
  }
  async function joinCode(code) {
    const room = await http('GET', ROOMS + code);
    if (!room || !room.host) return 'Không tìm thấy phòng này.';
    if (room.guest || room.left) return 'Phòng đã đủ hai người.';
    const id = rndId();
    try { await http('PUT', ROOMS + code + '/guest', { id, name: myName(), seen: SV }); }
    catch (e) { return 'Phòng đã đủ hai người.'; }
    Object.assign(on, { code, id, role: 'guest' });
    connect();
    return '';
  }
  async function joinRoom(code) {
    code = String(code || '').toUpperCase();
    if (!CODE_RE.test(code)) return msg('Mã phòng gồm 5 ký tự (chữ và số).');
    msg(''); $('olJoin').disabled = true;
    try { const err = await joinCode(code); if (err) msg(err); }
    catch (e) { msg('Không vào được phòng. Kiểm tra mạng rồi thử lại.'); }
    finally { $('olJoin').disabled = false; }
  }
  $('olCreate').onclick = createRoom;
  $('olJoin').onclick = () => joinRoom($('olCodeIn').value);

  // ---------- Ghép trận nhanh ----------
  const qm = { on: false, id: null, timer: null, hasRoom: false, offset: 0, tick: 0, busy: false };
  const QUEUE_FRESH_MS = 25000;
  async function quickPlay() {
    if (qm.on) return;
    msg('');
    qm.on = true; qm.id = rndId(); qm.hasRoom = false; qm.tick = 0; qm.busy = false;
    $('olMenu').style.display = 'none'; $('olQueue').style.display = 'block';
    try {
      await http('PUT', QUEUE + qm.id, { name: myName(), seen: SV });
      const me = await http('GET', QUEUE + qm.id);
      qm.offset = ((me && me.seen) || Date.now()) - Date.now();
    } catch (e) {
      qm.on = false; showMenu(); msg('Không kết nối được máy chủ ghép trận. Kiểm tra mạng rồi thử lại.'); return;
    }
    qm.timer = setInterval(qmTick, 1500);
    qmTick();
  }
  function qmStop(del) {
    clearInterval(qm.timer);
    const id = qm.id, was = qm.on;
    qm.on = false; qm.timer = null; qm.hasRoom = false;
    $('olQueue').style.display = 'none';
    if (del && was && id) http('DELETE', QUEUE + id).catch(() => {});
  }
  async function qmTick() {
    if (!qm.on || qm.busy || on.started) return;
    qm.busy = true;
    try {
      const q = (await http('GET', QUEUE.slice(0, -1))) || {};
      if (!qm.on) return;
      const now = Date.now() + qm.offset;
      const cands = [];
      for (const k of Object.keys(q)) {
        const v = q[k];
        if (!v || typeof v.seen !== 'number') continue;
        if (now - v.seen > 120000) { http('DELETE', QUEUE + k).catch(() => {}); continue; }
        if (k !== qm.id && v.room && CODE_RE.test(v.room) && now - v.seen < QUEUE_FRESH_MS) cands.push([k, v.room]);
      }
      cands.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      for (const [k, room] of cands) {
        if (qm.hasRoom) {
          if (!(k < qm.id)) continue;                       // chỉ nhường cho bên có id nhỏ hơn
          if (on.tree && on.tree.guest) break;              // phòng của mình đã có người
          await closeRoomSilently();
          http('DELETE', QUEUE + qm.id + '/room').catch(() => {});
          qm.hasRoom = false;
        }
        let err = 'x';
        try { err = await joinCode(room); } catch (e) {}
        if (!err) { qmStop(true); return; }
      }
      if (!qm.on) return;
      if (!qm.hasRoom) {
        await makeRoom();
        qm.hasRoom = true;
        await http('PUT', QUEUE + qm.id + '/room', on.code);
      }
      if (++qm.tick % 5 === 0) http('PUT', QUEUE + qm.id + '/seen', SV).catch(() => {});
    } catch (e) { /* lỗi mạng tạm thời: thử lại ở nhịp sau */ }
    finally { qm.busy = false; }
  }
  $('olQuick').onclick = quickPlay;
  $('olQCancel').onclick = async () => { await cancelAll(); showMenu(); };
  async function cancelAll() {
    if (qm.on) qmStop(true);
    if (on.active) await leave(); else showMenu();
  }

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
    Object.assign(on, { active: true, closing: false, started: false, tree: null, round: null, forfeit: false, over: false, playing: false, connOk: true });
    startStream();
    clearInterval(on.hb);
    on.hb = setInterval(() => http('PUT', ROOMS + on.code + '/' + on.role + '/seen', SV).catch(() => {}), HEARTBEAT_MS);
    clearInterval(on.watch); on.watch = setInterval(updateOpp, 4000);
  }
  function startStream() {
    if (on.es) on.es.close();
    const es = new EventSource(DB + ROOMS + on.code + '.json');
    on.es = es;
    es.addEventListener('put', e => { const m = JSON.parse(e.data); on.tree = setIn(on.tree, split(m.path), m.data === undefined ? null : m.data); onTree(); });
    es.addEventListener('patch', e => {
      const m = JSON.parse(e.data), base = split(m.path);
      for (const k of Object.keys(m.data || {})) on.tree = setIn(on.tree, base.concat(split(k)), m.data[k]);
      onTree();
    });
    es.onerror = () => { on.connOk = false; if (es.readyState === 2) setTimeout(() => { if (on.active && !on.closing && on.es === es) startStream(); }, 2000); render(); };
    es.onopen = () => { on.connOk = true; render(); };
  }
  const oppRole = () => on.role === 'host' ? 'guest' : 'host';
  const oppNode = () => on.tree ? on.tree[oppRole()] : null;
  function updateOpp() {
    const o = oppNode(), seen = o ? o.seen : null;
    if (seen !== on.oppSeen) { on.oppSeen = seen; on.oppSeenAt = Date.now(); }
    on.oppLost = !!(o && Date.now() - on.oppSeenAt > STALE_MS);
    render();
    // đối thủ im lặng quá lâu (tắt máy, mất mạng): coi như đã thoát
    if (on.started && !on.forfeit && on.connOk && document.visibilityState === 'visible' && o && Date.now() - on.oppSeenAt > FORFEIT_MS) {
      http('PUT', ROOMS + on.code + '/left', oppRole()).catch(() => {});
      opponentLeft();
    }
  }
  const oppProg = () => { const t = on.tree; return t && t.prog && t.prog[on.round] && t.prog[on.round][oppRole()] || null; };

  function onTree() {
    const t = on.tree;
    if (t === null && on.active && !on.closing) {   // phòng đã bị xoá
      if (on.started) { opponentLeft(); return; }
      leave().then(() => { onl.classList.remove('on'); PT.showMenu(); });
      return;
    }
    if (!t || !t.host) return;
    if (t.guest && !on.started) {
      on.started = true;
      if (qm.on) qmStop(true);
      onl.classList.remove('on');
      startRound(t.round || 'g0', true);
    }
    if (!on.started) return;
    if (t.left && t.left !== on.role) { opponentLeft(); return; }
    if (on.forfeit) return;
    RM.onTree();
    if (t.round && t.round !== on.round) startRound(t.round, false);
    const w = t.win && t.win[on.round];
    if (w && !on.over) roundOver(w.r);
    // đối thủ hết mạng mà chưa ai ghi kết quả: bên còn sống ghi thắng cho mình
    const op = oppProg();
    if (!on.over && on.playing && op && op.l <= 0 && PT.snap().l > 0) writeWin(on.role);
    render();
  }

  function names() {
    const t = on.tree || {};
    const me = (t[on.role] && t[on.role].name) || myName();
    const opp = (oppNode() && oppNode().name) || 'Đối thủ';
    return { me, opp };
  }
  function wins() {
    const w = (on.tree && on.tree.win) || {};
    let me = 0, opp = 0;
    for (const k of Object.keys(w)) { if (!w[k]) continue; if (w[k].r === on.role) me++; else opp++; }
    return { me, opp };
  }
  function writeWin(role) { return http('PUT', ROOMS + on.code + '/win/' + on.round, { r: role }).catch(() => {}); }

  function startRound(g, first) {
    const t = on.tree, r = t.rounds && t.rounds[g];
    if (!r || typeof r.seed !== 'number') return;   // chờ dữ liệu ván về đủ
    on.round = g; on.over = false; on.playing = false;
    clearTimeout(on.countT);
    res.classList.remove('on'); cfm.classList.remove('on');
    PT.startDuel(r.seed);
    PT.hooks.progress = sendProgress;
    PT.hooks.dead = () => { if (!on.over && on.active) writeWin(oppRole()); };
    PT.hooks.leave = askLeave;
    document.body.classList.add('duel');
    render();
    sendProgress();
    if (first) showIntro(() => countdown());
    else countdown();
  }
  function countdown() {
    let n = 3;
    const step = () => {
      if (!on.active || on.over) { count.classList.remove('show'); return; }
      count.classList.add('show');
      count.innerHTML = n > 0 ? `<span>${n}</span>` : '<span class="go">Phóng!</span>';
      if (n > 0) snd('tick', { rate: 1 }); else snd('seed', { vol: 0.9 });
      if (n === 0) { on.playing = true; PT.go(); render(); setTimeout(() => count.classList.remove('show'), 700); return; }
      n--; on.countT = setTimeout(step, COUNT_MS / 3);
    };
    step();
  }
  function showIntro(done) {
    const n = names();
    intro.innerHTML = `<div class="vs"><div class="t">GHÉP TRẬN THÀNH CÔNG</div>
      <div class="ip l"><i class="lt"></i><div class="nm">${esc(n.me)}</div><div class="tg">BẠN</div></div>
      <div class="x">VS</div>
      <div class="ip r"><i class="lt"></i><div class="nm">${esc(n.opp)}</div><div class="tg">ĐỐI THỦ</div></div></div>`;
    intro.classList.add('on');
    snd('gong', { vol: 0.8 });
    setTimeout(() => { intro.classList.remove('on'); intro.innerHTML = ''; done(); }, 2400);
  }

  // gửi tiến độ (gộp các lần gửi sát nhau; hết mạng thì ghi kết quả ngay)
  function sendProgress() {
    if (!on.active || !on.started || on.over) return;
    render();
    const s = PT.snap();
    if (s.l <= 0) { clearTimeout(on.sendT); writeProg(s); writeWin(oppRole()); return; }
    clearTimeout(on.sendT);
    on.sendT = setTimeout(() => writeProg(PT.snap()), 120);
  }
  function writeProg(s) { http('PUT', ROOMS + on.code + '/prog/' + on.round + '/' + on.role, { n: Math.min(999, s.n), l: s.l, s: Math.min(100000, s.s) }).catch(() => {}); }

  function roundOver(winner) {
    on.over = true; on.playing = false;
    clearTimeout(on.countT); count.classList.remove('show');
    PT.stop();
    const mine = winner === on.role;
    if (mine) { snd('win', { vol: 0.9 }); if (navigator.vibrate) { try { navigator.vibrate([20, 40, 20]); } catch (e) {} } } else snd('lose', { vol: 0.9 });
    render();
    setTimeout(() => showResult(mine ? 'win' : 'lose'), mine ? 500 : 1100);
  }
  function showResult(kind) {
    if (!on.active) return;
    const n = names(), w = wins(), me = PT.snap(), op = oppProg();
    $('orTitle').textContent = kind === 'lose' ? 'Đối thủ thắng' : 'Bạn thắng!';
    $('orSub').textContent = kind === 'win' ? 'Đối thủ đã chạm phi tiêu đủ 3 lần.' : kind === 'lose' ? 'Bạn đã chạm phi tiêu đủ 3 lần.' : 'Đối thủ đã rời phòng.';
    $('orScore').innerHTML = `<div><b>${w.me}</b><small>${esc(n.me)} · đêm ${me.n}</small></div><span>:</span><div><b>${w.opp}</b><small>${esc(n.opp)} · đêm ${op ? op.n : 1}</small></div>`;
    $('orAgain').style.display = kind === 'forfeit' ? 'none' : '';
    $('orAgain').disabled = false; $('orAgain').textContent = 'Ván mới';
    $('orLeave').textContent = kind === 'forfeit' ? 'Về menu' : 'Thoát phòng';
    res.classList.add('on');
  }
  // Ván mới: gửi lời thách đấu, đối thủ đồng ý mới sang ván mới
  const RM = Rematch.create({
    game: 'Phi tiêu trăng rằm', http, path: () => ROOMS + on.code, tree: () => on.tree, round: () => on.round, role: () => on.role,
    oppName: () => names().opp, toast,
    newRound: () => ({ seed: newSeed() }),
    onWait: w => { $('orAgain').disabled = w; $('orAgain').textContent = w ? 'Đang chờ...' : 'Ván mới'; }
  });
  $('orAgain').onclick = () => {
    if (!on.active || on.forfeit) return;
    if (on.tree && on.tree.round && on.tree.round !== on.round) return;
    RM.ask();
  };
  $('orLeave').onclick = () => { if (on.forfeit || !on.started) { leave().then(() => PT.showMenu()); } else askLeave(); };

  function opponentLeft() {
    if (on.forfeit) return;
    on.forfeit = true; on.over = true; on.playing = false;
    clearTimeout(on.countT); count.classList.remove('show'); intro.classList.remove('on');
    PT.stop();
    snd('win', { vol: 0.9 });
    render();
    showResult('forfeit');
  }

  // ---------- Vẽ khung thông tin ----------
  function lanterns(l) { let h = ''; for (let i = 0; i < 3; i++) h += '<i class="lt' + (i < l ? '' : ' x') + '"></i>'; return h; }
  function render() {
    if (!on.active || !on.started) return;
    const n = names(), me = PT.snap(), op = oppProg();
    const opL = op ? op.l : 3, opN = op ? op.n : 1;
    const left = on.forfeit, lost = on.oppLost && !left;
    $('dcMe').className = 'dc me' + (me.l <= 0 ? ' dead' : '');
    $('dcMe').innerHTML = `<b>${esc(n.me)}</b><div class="r2"><span class="ls">${lanterns(me.l)}</span><span class="nt">Đêm ${me.n}</span></div>`;
    $('dcOpp').className = 'dc opp' + (opL <= 0 || left ? ' dead' : '');
    $('dcOpp').innerHTML = `<b>${esc(n.opp)}</b><div class="r2"><span class="ls">${lanterns(opL)}</span><span class="nt">Đêm ${opN}</span></div>` +
      (left ? '<div class="st">ĐÃ THOÁT</div>' : lost ? '<div class="st">MẤT KẾT NỐI</div>' : '');
    const m = duelMsg;
    if (on.forfeit) { m.className = ''; m.textContent = 'Đối thủ đã thoát. Bạn thắng!'; }
    else if (on.over) { m.className = ''; m.textContent = me.l > 0 ? 'Bạn thắng ván này!' : 'Đối thủ thắng ván này'; }
    else if (!on.playing) { m.className = ''; m.textContent = 'Chuẩn bị...'; }
    else if (me.l === 1) { m.className = 'warn'; m.textContent = 'Chỉ còn 1 mạng, cẩn thận!'; }
    else if (opL === 1) { m.className = ''; m.textContent = 'Đối thủ chỉ còn 1 mạng!'; }
    else { m.className = ''; m.textContent = 'Phòng ' + on.code + ' · chạm phi tiêu 3 lần là thua'; }
  }

  // ---------- Thoát ----------
  function askLeave() {
    const mid = on.started && !on.over && !on.forfeit;
    cfm.innerHTML = `<div class="sheet" role="dialog" style="width:min(300px,90vw)"><h2 style="font-size:24px">Thoát phòng?</h2>
      <p class="sub" style="font-weight:600;margin-bottom:14px">${mid ? 'Ván đang chơi dở. Nếu thoát, đối thủ sẽ thắng.' : 'Bạn sẽ rời khỏi phòng trực tuyến.'}</p>
      <div class="row"><button class="btn" id="ocNo" data-no-scene>Ở lại</button><button class="btn pri" id="ocYes" data-no-scene>Thoát</button></div></div>`;
    cfm.classList.add('on');
    $('ocNo').onclick = () => cfm.classList.remove('on');
    $('ocYes').onclick = () => { cfm.classList.remove('on'); leave().then(() => PT.showMenu()); };
  }

  function resetOnline() {
    RM.reset();
    clearInterval(on.hb); clearInterval(on.watch); clearTimeout(on.countT); clearTimeout(on.sendT);
    if (on.es) on.es.close();
    const snap = { code: on.code, role: on.role, active: on.active, started: on.started, tree: on.tree };
    Object.assign(on, { active: false, code: null, role: null, es: null, tree: null, started: false, round: null, forfeit: false, over: false, playing: false });
    PT.hooks.progress = PT.hooks.dead = PT.hooks.leave = null;
    document.body.classList.remove('duel');
    count.classList.remove('show'); intro.classList.remove('on'); res.classList.remove('on'); cfm.classList.remove('on');
    return snap;
  }
  async function closeRoomSilently() {
    on.closing = true;
    const { code, active } = resetOnline();
    if (active && code) { try { await http('DELETE', ROOMS + code); } catch (e) {} }
  }
  // Chưa có đối thủ: xoá phòng. Đã vào trận: ghi "left" để người ở lại thắng; người ở lại xoá phòng khi thoát.
  async function leave() {
    on.closing = true;
    const { code, role, active, started, tree } = resetOnline();
    if (qm.on) qmStop(true);
    if (active && code) {
      try {
        const oppLeft = tree && tree.left && tree.left !== role;
        if (started && tree && tree.guest && !oppLeft) await http('PUT', ROOMS + code + '/left', role);
        else await http('DELETE', ROOMS + code);
      } catch (e) {}
    }
    showMenu();
  }

  // Quay lại từ nền / mạng chập chờn: đừng coi đối thủ là "im lặng quá lâu", và nối lại luồng nếu đã đóng.
  function resumeOnline() {
    if (document.visibilityState === 'hidden' || !on.active || on.closing) return;
    on.oppSeenAt = Date.now();
    try { if (on.es && on.es.readyState === 2 && on.code) startStream(); } catch (e) {}
  }
  ['visibilitychange', 'pageshow', 'online', 'focus'].forEach(t => window.addEventListener(t, resumeOnline));

  window.addEventListener('pagehide', e => {
    if (e && e.persisted) return;
    const ka = (method, path, body) => { try { fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body), keepalive: true }); } catch (e) {} };
    if (qm.on && qm.id) ka('DELETE', QUEUE + qm.id);
    if (!on.active || !on.code) return;
    const t = on.tree;
    if (on.started && t && t.guest && !(t.left && t.left !== on.role)) ka('PUT', ROOMS + on.code + '/left', on.role);
    else ka('DELETE', ROOMS + on.code);
  });

  window.PTOnline = { active: () => on.active, leave, askLeave };
})();
