/* Nối thú trực tuyến: hai người ở hai máy chơi CÙNG MỘT BÀN (sinh từ cùng seed), ai phá hết bàn trước thì thắng ván.
 * Dùng Firebase Realtime Database qua REST + EventSource (giống Cờ Caro trực tuyến, không cần SDK hay máy chủ riêng).
 *
 * Dữ liệu: /noithu_rooms/{MÃ}
 *   host, guest : { id, name, seen }   seen = nhịp tim (giờ máy chủ)
 *   round       : ván hiện tại (g0, g1, ...); rounds/{g} = { seed }  bàn của ván
 *   prog/{g}/{host|guest} = { n, m }   số cặp đã nối, m = chuỗi 0/1 các ô còn lại (để vẽ bàn thu nhỏ của đối thủ)
 *   win/{g}     = { r }                người phá xong trước; chỉ ghi được một lần nên không thể hai người cùng thắng
 *   left        : 'host' | 'guest'     người đã thoát; người còn lại thắng và là người xoá phòng
 * Ghép trận nhanh (CHƠI NGAY): /noithu_queue/{id} = { name, seen, room? } giống caro_queue.
 * Chạy sau script chính của noithu.html và dùng window.NT.
 */
(function () {
  'use strict';
  if (!window.NT) return;
  const NT = window.NT, G = NT.G;
  const DB = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  const ROOMS = '/noithu_rooms/', QUEUE = '/noithu_queue/';
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bỏ O/0/I/1 cho khỏi nhầm khi đọc mã
  const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  const HEARTBEAT_MS = 12000, STALE_MS = 40000, FORFEIT_MS = 80000, COUNT_MS = 3000;

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
  #onPanel{display:none;flex-direction:column;gap:10px}
  #menu.onl #onPanel{display:flex}
  #menu.onl #bPlay,#menu.onl #bOnline,#menu.onl .tips,#menu.onl #mBest{display:none!important}
  .onRow{display:flex;gap:8px}
  #onCodeIn{flex:1;min-width:0;height:52px;border-radius:15px;border:1px solid rgba(190,255,230,.35);background:rgba(0,0,0,.2);color:var(--ink);
    font:800 22px "Baloo 2",system-ui,sans-serif;letter-spacing:.35em;text-align:center;text-transform:uppercase;outline:none}
  #onCodeIn::placeholder{letter-spacing:.05em;font-size:12px;font-weight:700;color:var(--mute)}
  #onCodeIn:focus{border-color:#b8f36b}
  #onJoin{width:96px;height:52px;font-size:16px}
  #onMsg{min-height:16px;font-size:12px;color:#ffb3a8;font-weight:600}
  #onCodeBox,#onQueueBox{display:none;padding:16px 10px;border-radius:16px;border:1px solid rgba(190,255,230,.25);background:rgba(0,0,0,.18)}
  #onCode{font-size:40px;font-weight:800;letter-spacing:.3em;margin-right:-.3em}
  .onSub{font-size:12px;color:var(--mute);font-weight:600}
  .onWait{font-size:13px;color:var(--ink);font-weight:700;margin-top:6px}
  .onWait i{display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin:0 2px;animation:onDot 1.2s infinite}
  .onWait i:nth-child(2){animation-delay:.2s}.onWait i:nth-child(3){animation-delay:.4s}
  @keyframes onDot{0%,80%,100%{opacity:.2}40%{opacity:1}}
  .onPaws{display:flex;justify-content:center;gap:12px;font-size:28px;margin-bottom:6px}
  .onPaws i{animation:bob 1.6s ease-in-out infinite}.onPaws i:last-child{animation-delay:.8s}
  .onLink{color:var(--mute);font-size:13px;font-weight:700;padding:6px 0}
  .onSmall{height:40px!important;font-size:14px!important;width:auto!important;padding:0 18px;margin:10px auto 0!important}

  /* ----- Trong ván ----- */
  body.online #top .stat,body.online #timebar,body.online #tools{display:none!important}
  body.online #bPause{visibility:hidden}
  #onHud{display:none;flex:none;width:100%;max-width:560px;margin:4px auto 0;flex-direction:column;gap:8px}
  body.online #onHud{display:flex}
  .vsRow{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:stretch}
  .pc{min-width:0;padding:8px 10px;border-radius:14px;background:rgba(0,0,0,.2);border:1px solid var(--line);display:flex;flex-direction:column;gap:5px}
  .pc.me{border-color:rgba(184,243,107,.55);box-shadow:0 0 18px -6px #b8f36b}
  .pc.win{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 0 22px -4px var(--gold)}
  .pcTop{display:flex;align-items:center;gap:6px;min-width:0}
  .pcName{flex:1;min-width:0;font-size:13px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pcWins{flex:none;font-size:13px;font-weight:800;color:var(--gold)}
  .pcTag{font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--mute);display:flex;align-items:center;gap:5px}
  .pcTag .d{width:6px;height:6px;border-radius:50%;background:#5fd48a}.pcTag .d.off{background:#e0903a}
  .bar{height:8px;border-radius:99px;background:rgba(0,0,0,.3);overflow:hidden}
  .bar i{display:block;height:100%;width:0;border-radius:99px;background:linear-gradient(90deg,#4ee3a0,#b8f36b);transition:width .3s}
  .pc.opp .bar i{background:linear-gradient(90deg,#ffb15c,#ff7a59)}
  .pcBody{display:flex;align-items:center;gap:8px}
  .pcNum{font-size:12px;font-weight:700;color:var(--mute);white-space:nowrap}
  .pcNum b{color:var(--ink);font-size:15px}
  #oppMini{flex:none;border-radius:5px;background:rgba(0,0,0,.25)}
  .vsMid{align-self:center;font-size:12px;font-weight:800;letter-spacing:.12em;color:var(--mute)}
  #onBanner{text-align:center;font-size:13px;font-weight:800;padding:6px 12px;border-radius:99px;border:1px solid var(--line);background:rgba(0,0,0,.18);color:var(--ink)}
  #onBanner.win{border-color:var(--gold);color:var(--gold)}
  #onBanner.warn{border-color:#ffb15c;color:#ffcf9a}
  #onBanner b{letter-spacing:.2em;color:var(--mute)}
  #onBar{display:none;flex:none;justify-content:center;gap:10px;padding-top:8px}
  body.online #onBar{display:flex}
  #onCount{position:fixed;inset:0;z-index:30;display:none;align-items:center;justify-content:center;pointer-events:none}
  #onCount.show{display:flex}
  #onCount span{font-size:120px;font-weight:800;color:#fff;text-shadow:0 6px 30px rgba(0,0,0,.5);animation:cnt .9s ease-out both}
  #onCount span.go{font-size:64px;color:#b8f36b}
  @keyframes cnt{0%{transform:scale(2.2);opacity:0}25%{transform:scale(1);opacity:1}100%{transform:scale(.8);opacity:0}}
  #onIntro{position:fixed;inset:0;z-index:40;display:none;align-items:center;justify-content:center;background:rgba(4,26,22,.92);padding:20px}
  #onIntro.show{display:flex;animation:fade .3s ease both}
  .oiBox{width:min(100%,380px);text-align:center}
  .oiTitle{font-size:12px;font-weight:800;letter-spacing:.22em;color:var(--gold);margin-bottom:20px}
  .oiRow{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
  .oiP{display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 8px 14px;border-radius:18px;border:1.5px solid var(--c);background:rgba(255,255,255,.05);min-width:0}
  .oiP.l{--c:#b8f36b;animation:oiL .8s cubic-bezier(.2,.85,.25,1) both}.oiP.r{--c:#ffb15c;animation:oiR .8s cubic-bezier(.2,.85,.25,1) both}
  @keyframes oiL{from{transform:translateX(-110vw)}}@keyframes oiR{from{transform:translateX(110vw)}}
  .oiIc{width:62px;height:62px;border-radius:18px;display:grid;place-items:center;font-size:32px;color:var(--c);background:linear-gradient(180deg,#fffdf6,#f1e0bd);box-shadow:0 5px 0 #c7a978}
  .oiName{font-size:15px;font-weight:800;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .oiTag{font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--c);min-height:12px}
  .oiVs{font-size:16px;font-weight:800;letter-spacing:.1em;color:var(--mute)}
  #onResult .card{padding-top:18px}
  #orIcon{font-size:46px;color:var(--gold);margin-bottom:4px}
  #orIcon.lose{color:var(--mute)}
  #orTitle{font-size:30px;font-weight:800;line-height:1.1;margin-bottom:4px}
  #orSub{font-size:13px;color:var(--mute);font-weight:600;margin-bottom:12px}
  #orScore{display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:16px}
  #orScore div{min-width:0;max-width:40%}
  #orScore b{display:block;font-size:40px;line-height:1}
  #orScore small{display:block;font-size:11px;color:var(--mute);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #orScore span{font-size:22px;color:var(--mute);font-weight:800}
  #onConfirm .card{max-width:300px}
  #onConfirm p{font-size:13px;color:var(--mute);margin:0 0 16px;line-height:1.5}
  #onConfirm .onRow .btn{margin-top:0;height:46px;font-size:15px}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // bảng chọn trong menu
  const menuCard = document.querySelector('#menu .card');
  const panel = document.createElement('div');
  panel.id = 'onPanel';
  panel.innerHTML = `
    <div id="onMenu" style="display:flex;flex-direction:column;gap:10px">
      <button class="btn" id="onQuick"><i class="fa-solid fa-bolt"></i>CHƠI NGAY</button>
      <button class="btn alt" id="onCreate" style="margin-top:0"><i class="fa-solid fa-door-open"></i>TẠO PHÒNG</button>
      <div class="onRow"><input id="onCodeIn" maxlength="5" placeholder="NHẬP MÃ PHÒNG" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="btn" id="onJoin">VÀO</button></div>
      <p class="onSub" style="margin:0">Hai người cùng một bàn. Ai nối hết trước thì thắng!</p>
    </div>
    <div id="onQueueBox"><div class="onPaws"><i class="fa-solid fa-cat" style="color:#ff7a2f"></i><i class="fa-solid fa-dog" style="color:#e6b17a"></i></div>
      <div class="onWait">Đang tìm đối thủ<i></i><i></i><i></i></div>
      <button class="btn ghost onSmall" id="onQCancel">HỦY</button></div>
    <div id="onCodeBox"><div class="onSub">Mã phòng của bạn</div><div id="onCode">-----</div>
      <button class="btn ghost onSmall" id="onCopy" style="margin-top:4px!important">SAO CHÉP MÃ</button>
      <div class="onWait">Đang chờ người chơi thứ hai<i></i><i></i><i></i></div></div>
    <div id="onMsg"></div>
    <button class="onLink" id="onBack"><i class="fa-solid fa-arrow-left"></i> Quay lại</button>`;
  menuCard.appendChild(panel);

  // khung thông tin trong ván
  const hud = document.createElement('div');
  hud.id = 'onHud';
  hud.innerHTML = `<div class="vsRow"><div class="pc me" id="pcMe"></div><div class="vsMid">VS</div><div class="pc opp" id="pcOpp"></div></div><div id="onBanner"></div>`;
  $('top').after(hud);
  const bar = document.createElement('div');
  bar.id = 'onBar';
  bar.innerHTML = `<button class="tb" id="onLeaveBtn"><i class="fa-solid fa-right-from-bracket"></i>THOÁT PHÒNG</button>`;
  $('tools').after(bar);

  const count = document.createElement('div'); count.id = 'onCount'; document.body.appendChild(count);
  const intro = document.createElement('div'); intro.id = 'onIntro'; document.body.appendChild(intro);
  const result = document.createElement('section'); result.id = 'onResult'; result.className = 'screen';
  result.innerHTML = `<div class="card"><div id="orIcon"></div><div id="orTitle"></div><div id="orSub"></div><div id="orScore"></div>
    <button class="btn" id="orAgain">VÁN MỚI</button><button class="btn ghost" id="orLeave">THOÁT PHÒNG</button></div>`;
  document.body.appendChild(result);
  const confirmEl = document.createElement('section'); confirmEl.id = 'onConfirm'; confirmEl.className = 'screen';
  document.body.appendChild(confirmEl);

  const msg = t => { $('onMsg').textContent = t || ''; };
  function showMenu() {
    $('onMenu').style.display = 'flex'; $('onCodeBox').style.display = 'none'; $('onQueueBox').style.display = 'none';
    $('onCode').textContent = '-----'; $('onCodeIn').value = ''; msg('');
  }
  $('bOnline').onclick = () => { NT.Snd.init(); $('menu').classList.add('onl'); showMenu(); };
  $('onBack').onclick = async () => { await cancelAll(); $('menu').classList.remove('onl'); };
  $('onCodeIn').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('onCodeIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('onJoin').click(); });
  $('onCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(on.code); $('onCopy').textContent = 'ĐÃ SAO CHÉP'; setTimeout(() => $('onCopy').textContent = 'SAO CHÉP MÃ', 1500); } catch (e) {}
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
    msg(''); $('onCreate').disabled = true;
    try {
      const code = await makeRoom();
      $('onMenu').style.display = 'none'; $('onCodeBox').style.display = 'block'; $('onCode').textContent = code;
    } catch (e) { msg('Không tạo được phòng. Kiểm tra mạng rồi thử lại.'); }
    $('onCreate').disabled = false;
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
    msg(''); $('onJoin').disabled = true;
    try { const err = await joinCode(code); if (err) msg(err); }
    catch (e) { msg('Không vào được phòng. Kiểm tra mạng rồi thử lại.'); }
    finally { $('onJoin').disabled = false; }
  }
  $('onCreate').onclick = createRoom;
  $('onJoin').onclick = () => joinRoom($('onCodeIn').value);

  // ---------- Ghép trận nhanh ----------
  const qm = { on: false, id: null, timer: null, hasRoom: false, offset: 0, tick: 0, busy: false };
  const QUEUE_FRESH_MS = 25000;
  async function quickPlay() {
    if (qm.on) return;
    msg('');
    qm.on = true; qm.id = rndId(); qm.hasRoom = false; qm.tick = 0; qm.busy = false;
    $('onMenu').style.display = 'none'; $('onQueueBox').style.display = 'block';
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
    $('onQueueBox').style.display = 'none';
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
  $('onQuick').onclick = quickPlay;
  $('onQCancel').onclick = async () => { await cancelAll(); showMenu(); };
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
    es.onerror = () => { on.connOk = false; render(); };
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

  function onTree() {
    const t = on.tree;
    if (t === null && on.active && !on.closing) {   // phòng đã bị xoá
      if (on.started) { opponentLeft(); return; }
      leave().then(() => { $('menu').classList.remove('onl'); NT.toMenu(); });
      return;
    }
    if (!t || !t.host) return;
    if (t.guest && !on.started) {
      on.started = true;
      if (qm.on) qmStop(true);
      $('menu').classList.remove('onl');
      startRound(t.round || 'g0', true);
    }
    if (!on.started) return;
    if (t.left && t.left !== on.role) { opponentLeft(); return; }
    if (on.forfeit) return;
    if (t.round && t.round !== on.round) startRound(t.round, false);
    const w = t.win && t.win[on.round];
    if (w && !on.over) roundOver(w.r);
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

  function startRound(g, first) {
    const t = on.tree, r = t.rounds && t.rounds[g];
    if (!r || typeof r.seed !== 'number') return;   // chờ dữ liệu ván về đủ
    on.round = g; on.over = false; on.playing = false;
    clearTimeout(on.countT);
    NT.show(null);
    NT.startOnline(r.seed);
    G.onChange = sendProgress;
    G.onCleared = cleared;
    render();
    if (first) showIntro(() => countdown());
    else countdown();
  }
  function countdown() {
    let n = 3;
    const step = () => {
      if (!on.active || on.over) { count.classList.remove('show'); return; }
      count.classList.add('show');
      count.innerHTML = n > 0 ? `<span>${n}</span>` : '<span class="go">NỐI NÀO!</span>';
      if (n > 0) NT.Snd.tone(660, .1, 'triangle', .12); else NT.Snd.tone(990, .25, 'triangle', .14);
      if (n === 0) { on.playing = true; NT.unlock(); render(); setTimeout(() => count.classList.remove('show'), 700); return; }
      n--; on.countT = setTimeout(step, COUNT_MS / 3);
    };
    step();
  }
  function showIntro(done) {
    const n = names();
    intro.innerHTML = `<div class="oiBox"><div class="oiTitle">GHÉP TRẬN THÀNH CÔNG</div><div class="oiRow">
      <div class="oiP l"><div class="oiIc"><i class="fa-solid fa-cat"></i></div><div class="oiName">${esc(n.me)}</div><div class="oiTag">BẠN</div></div>
      <div class="oiVs">VS</div>
      <div class="oiP r"><div class="oiIc"><i class="fa-solid fa-dog"></i></div><div class="oiName">${esc(n.opp)}</div><div class="oiTag">ĐỐI THỦ</div></div></div></div>`;
    intro.classList.add('show');
    setTimeout(() => { intro.classList.remove('show'); intro.innerHTML = ''; done(); }, 2400);
  }

  // gửi tiến độ (gộp các lần nối sát nhau)
  function sendProgress() {
    if (!on.active || !on.started || on.over) return;
    render();
    clearTimeout(on.sendT);
    on.sendT = setTimeout(() => {
      const n = G.total - NT.left();
      http('PUT', ROOMS + on.code + '/prog/' + on.round + '/' + on.role, { n, m: NT.mask() }).catch(() => {});
    }, 120);
  }
  async function cleared() {
    if (on.over) return;
    sendProgress();
    try { await http('PUT', ROOMS + on.code + '/win/' + on.round, { r: on.role }); }
    catch (e) { /* đối thủ đã ghi thắng trước một chút: chờ dữ liệu về */ }
  }

  function roundOver(winner) {
    on.over = true; on.playing = false;
    clearTimeout(on.countT); count.classList.remove('show');
    NT.lock();
    const mine = winner === on.role;
    if (mine) { NT.Snd.win(); NT.vibrate([20, 40, 20]); } else { NT.Snd.lose(); NT.vibrate(60); }
    render();
    setTimeout(() => showResult(mine ? 'win' : 'lose'), mine ? 500 : 900);
  }
  function showResult(kind) {
    if (!on.active) return;
    const n = names(), w = wins();
    const icon = $('orIcon'), title = $('orTitle'), sub = $('orSub');
    icon.className = kind === 'lose' ? 'lose' : '';
    icon.innerHTML = kind === 'lose' ? '<i class="fa-solid fa-face-sad-tear"></i>' : '<i class="fa-solid fa-trophy"></i>';
    if (kind === 'win') { title.textContent = 'BẠN THẮNG!'; sub.textContent = 'Bạn nối hết bàn trước đối thủ.'; }
    else if (kind === 'lose') { title.textContent = 'ĐỐI THỦ THẮNG'; sub.textContent = n.opp + ' nối hết bàn trước.'; }
    else { title.textContent = 'BẠN THẮNG!'; sub.textContent = 'Đối thủ đã rời phòng.'; }
    $('orScore').innerHTML = `<div><b>${w.me}</b><small>${esc(n.me)}</small></div><span>:</span><div><b>${w.opp}</b><small>${esc(n.opp)}</small></div>`;
    $('orAgain').style.display = kind === 'forfeit' ? 'none' : '';
    $('orAgain').disabled = false;
    $('orLeave').textContent = kind === 'forfeit' ? 'VỀ MENU' : 'THOÁT PHÒNG';
    NT.show('onResult');
  }
  $('orAgain').onclick = async () => {
    if (!on.active || on.forfeit) return;
    $('orAgain').disabled = true;
    const next = 'g' + (parseInt(on.round.slice(1), 10) + 1);
    try {
      try { await http('PUT', ROOMS + on.code + '/rounds/' + next, { seed: newSeed() }); } catch (e) { /* đối thủ vừa tạo xong */ }
      await http('PUT', ROOMS + on.code + '/round', next);
    } catch (e) { NT.toast('Không tạo được ván mới. Thử lại.'); $('orAgain').disabled = false; }
  };
  $('orLeave').onclick = () => { if (on.forfeit || !on.started) { leave(); NT.toMenu(); } else askLeave(); };

  function opponentLeft() {
    if (on.forfeit) return;
    on.forfeit = true; on.over = true; on.playing = false;
    clearTimeout(on.countT); count.classList.remove('show'); intro.classList.remove('show');
    NT.lock();
    NT.Snd.win();
    render();
    showResult('forfeit');
  }

  // ---------- Vẽ khung thông tin ----------
  function miniBoard(m) {
    const c = $('oppMini'); if (!c) return;
    const R = 10, C = 7, s = 5, d = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== C * s * d) { c.width = C * s * d; c.height = R * s * d; c.style.width = C * s + 'px'; c.style.height = R * s + 'px'; }
    const x = c.getContext('2d');
    x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, C * s, R * s);
    for (let i = 0; i < R * C; i++) {
      if (m && m[i] === '0') continue;
      x.fillStyle = '#f6ead2';
      x.fillRect((i % C) * s + .6, Math.floor(i / C) * s + .6, s - 1.2, s - 1.2);
    }
  }
  function render() {
    if (!on.active || !on.started) return;
    const n = names(), w = wins(), total = G.total || 35;
    const myN = G.total - NT.left();
    const op = on.tree && on.tree.prog && on.tree.prog[on.round] && on.tree.prog[on.round][oppRole()];
    const opN = op && typeof op.n === 'number' ? op.n : 0;
    const winner = on.over && !on.forfeit ? (on.tree.win && on.tree.win[on.round] && on.tree.win[on.round].r) : (on.forfeit ? on.role : null);
    const dot = ok => `<i class="d${ok ? '' : ' off'}"></i>`;
    $('pcMe').className = 'pc me' + (winner === on.role ? ' win' : '');
    $('pcMe').innerHTML = `<div class="pcTop"><span class="pcName">${esc(n.me)}</span><span class="pcWins"><i class="fa-solid fa-trophy"></i> ${w.me}</span></div>
      <div class="pcTag">${dot(on.connOk)}BẠN</div><div class="bar"><i style="width:${(myN / total * 100).toFixed(1)}%"></i></div>
      <div class="pcNum"><b>${myN}</b>/${total} cặp</div>`;
    const left = on.forfeit, lost = on.oppLost && !left;
    $('pcOpp').className = 'pc opp' + (winner === oppRole() ? ' win' : '');
    $('pcOpp').innerHTML = `<div class="pcTop"><span class="pcName">${esc(n.opp)}</span><span class="pcWins"><i class="fa-solid fa-trophy"></i> ${w.opp}</span></div>
      <div class="pcTag">${dot(!left && !lost)}${left ? 'ĐÃ THOÁT' : lost ? 'MẤT KẾT NỐI' : 'ĐỐI THỦ'}</div><div class="bar"><i style="width:${(opN / total * 100).toFixed(1)}%"></i></div>
      <div class="pcBody"><canvas id="oppMini"></canvas><div class="pcNum"><b>${opN}</b>/${total} cặp</div></div>`;
    miniBoard(op && op.m);
    const b = $('onBanner');
    if (on.forfeit) { b.className = 'win'; b.textContent = 'Đối thủ đã thoát. Bạn thắng!'; }
    else if (on.over) { const me = winner === on.role; b.className = me ? 'win' : ''; b.textContent = me ? 'Bạn thắng ván này!' : 'Đối thủ thắng ván này'; }
    else if (!on.playing) { b.className = ''; b.innerHTML = 'Chuẩn bị...'; }
    else if (opN - myN >= 3) { b.className = 'warn'; b.textContent = 'Đối thủ đang dẫn ' + (opN - myN) + ' cặp, nhanh lên!'; }
    else if (myN - opN >= 3) { b.className = 'win'; b.textContent = 'Bạn đang dẫn ' + (myN - opN) + ' cặp'; }
    else { b.className = ''; b.innerHTML = 'Phòng <b>' + esc(on.code) + '</b> · ai nối hết trước thắng'; }
  }

  // ---------- Thoát ----------
  function askLeave() {
    const mid = on.started && !on.over && !on.forfeit;
    confirmEl.innerHTML = `<div class="card"><h2 style="font-size:20px;letter-spacing:.06em;color:var(--ink);margin-bottom:8px">Thoát phòng?</h2>
      <p>${mid ? 'Ván đang chơi dở. Nếu thoát, đối thủ sẽ thắng.' : 'Bạn sẽ rời khỏi phòng trực tuyến.'}</p>
      <div class="onRow"><button class="btn ghost" id="ocNo">Ở LẠI</button><button class="btn alt" id="ocYes">THOÁT</button></div></div>`;
    const prev = document.querySelector('.screen.show');
    NT.show('onConfirm');
    $('ocNo').onclick = () => { if (prev && prev.id !== 'onConfirm') NT.show(prev.id); else NT.show(null); };
    $('ocYes').onclick = () => { leave(); NT.toMenu(); };
  }
  $('onLeaveBtn').onclick = () => { if (on.active && on.started) askLeave(); };

  function resetOnline() {
    clearInterval(on.hb); clearInterval(on.watch); clearTimeout(on.countT); clearTimeout(on.sendT);
    if (on.es) on.es.close();
    const snap = { code: on.code, role: on.role, active: on.active, started: on.started, tree: on.tree };
    Object.assign(on, { active: false, code: null, role: null, es: null, tree: null, started: false, round: null, forfeit: false, over: false, playing: false });
    G.onChange = null; G.onCleared = null;
    count.classList.remove('show'); intro.classList.remove('show');
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

  window.NTOnline = { active: () => on.active, leave, askLeave };

  window.addEventListener('pagehide', () => {
    const ka = (method, path, body) => { try { fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body), keepalive: true }); } catch (e) {} };
    if (qm.on && qm.id) ka('DELETE', QUEUE + qm.id);
    if (!on.active || !on.code) return;
    const t = on.tree;
    if (on.started && t && t.guest && !(t.left && t.left !== on.role)) ka('PUT', ROOMS + on.code + '/left', on.role);
    else ka('DELETE', ROOMS + on.code);
  });
})();
