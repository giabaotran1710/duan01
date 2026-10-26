/* Cờ Caro trực tuyến: hai người chơi ở hai máy, vào cùng một phòng bằng MÃ PHÒNG (5 ký tự).
 * Dùng Firebase Realtime Database qua REST + EventSource (không cần SDK, không cần máy chủ riêng).
 *
 * Dữ liệu: /caro_rooms/{MÃ}
 *   host, guest : { id, name, seen }   id ngẫu nhiên giữ trong máy mỗi người; seen = nhịp tim (giờ máy chủ)
 *   round       : khoá ván hiện tại (g0, g1, ...); rounds/{g} = { xHost }  (ai là X; mỗi ván đổi bên)
 *   moves/{g}/m{n} = { n, r, c, p, u }  nước thứ n, ô (r,c), quân p, người đi u (id)
 *   left        : 'host' | 'guest' — người đã thoát; người còn lại thắng ván đang chơi và là người xoá phòng
 * Ghép trận nhanh (CHƠI NGAY): /caro_queue/{id} = { name, seen, room? } — ai vào hàng chờ trước tạo phòng và ghi mã vào đó;
 *   người sau thấy phòng đang chờ thì vào làm khách. Hai người cùng tạo phòng một lúc thì bên có id lớn hơn nhường phòng.
 * Mỗi nước chỉ ghi được một lần (quy tắc trong database.rules.json). Mã phòng không liệt kê được: phải biết mã mới vào.
 * Chạy sau script chính của caro.html và dùng các biến/hàm toàn cục của nó (board, place, createBoard, checkWin, ...).
 */
(function () {
  'use strict';
  const DB = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // bỏ O/0/I/1 cho khỏi nhầm khi đọc mã
  const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  const SAVE_KEY = 'caro_online_v1';
  const HEARTBEAT_MS = 12000, STALE_MS = 40000, FORFEIT_MS = 80000, INTRO_MS = 3000;

  const on = { active: false, code: null, role: null, id: null, es: null, tree: null, round: null, applied: 0, mySym: 'X',
               hb: null, watch: null, oppSeen: null, oppSeenAt: 0, oppLost: false, connOk: true, forfeit: false, winner: null, emoN: null, emoInit: false, started: false, closing: false };

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
  #overlay.onl .overlay-title{margin-bottom:38px}
  #overlay.onl #btnSiteReturn{margin-top:22px}
  /* đang đổ xúc xắc / đã chọn chế độ: ẩn luôn nút trực tuyến cùng các nút chọn chế độ khác */
  #startBtn[style*="display: none"] ~ #onlineBtn{display:none!important}
  #onQuick{border-color:rgba(228,193,106,.55);color:var(--gold);background:rgba(228,193,106,.07)}
  #onQuick:hover{background:rgba(228,193,106,.14);border-color:rgba(228,193,106,.8)}
  .onSub{font-size:11px;color:#cdc4b8;text-align:center;line-height:1.5;margin:0}
  .onRow{display:flex;gap:8px}
  #onCodeIn{flex:1;min-width:0;height:50px;border-radius:8px;border:1px solid var(--line-strong);background:rgba(243,238,229,.04);color:var(--text);
    font-size:22px;font-weight:800;letter-spacing:.35em;text-align:center;text-transform:uppercase;outline:none}
  #onCodeIn::placeholder{letter-spacing:.05em;font-size:12px;font-weight:600;color:var(--dim)}
  #onCodeIn:focus{border-color:rgba(243,238,229,.5)}
  #onJoin{width:96px;margin:0}
  #onMsg{min-height:16px;font-size:11px;color:#ff9b8a;text-align:center}
  #onCodeBox,#onQueueBox{display:none;text-align:center;padding:16px 10px;border:1px solid var(--line-strong);border-radius:10px;background:rgba(243,238,229,.04)}
  #onCode{font-size:40px;font-weight:900;letter-spacing:.3em;margin-right:-.3em;color:var(--text)}
  #onWait{font-size:11px;color:#cdc4b8;margin-top:6px}
  #onWait i,#onQWait i{display:inline-block;width:6px;height:6px;border-radius:50%;background:#cdc4b8;margin:0 2px;animation:onDot 1.2s infinite}
  #onWait i:nth-child(2),#onQWait i:nth-child(2){animation-delay:.2s}#onWait i:nth-child(3),#onQWait i:nth-child(3){animation-delay:.4s}
  @keyframes onDot{0%,80%,100%{opacity:.2}40%{opacity:1}}
  #onQSym{display:flex;justify-content:center;gap:14px;font-size:34px;font-weight:900;margin-bottom:8px}
  #onQSym b:first-child{color:var(--x);animation:onSwing 1.6s ease-in-out infinite}
  #onQSym b:last-child{color:var(--o);animation:onSwing 1.6s ease-in-out infinite .8s}
  @keyframes onSwing{0%,100%{transform:translateY(0);opacity:.55}50%{transform:translateY(-6px);opacity:1}}
  #onQWait{font-size:12px;color:var(--text);font-weight:600}
  .onLink{border:0;background:transparent;color:var(--dim);font-size:11px;font-weight:600;cursor:pointer;padding:8px 0}
  .onLink:hover{color:var(--text)}

  /* ----- Giao diện ván trực tuyến: khác hẳn khi đấu với máy ----- */
  body.online .action-card:nth-child(1),body.online .action-card:nth-child(3),body.online .commentary-card,body.online #statusTop{display:none}
  #onlineHud{display:none;flex-direction:column;gap:9px}
  body.online #onlineHud{display:flex}
  .vsRow{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
  .vsP{--c:var(--muted);position:relative;display:flex;align-items:center;gap:9px;min-width:0;padding:8px 10px;border-radius:12px;border:1px solid var(--line);
    background:rgba(243,238,229,.03);opacity:.5;transition:opacity .25s,box-shadow .25s,border-color .25s,background .25s}
  .vsP.X{--c:var(--x)} .vsP.O{--c:var(--o);flex-direction:row-reverse;text-align:right}
  .vsP.act{opacity:1;border-color:var(--c);background:rgba(243,238,229,.06);box-shadow:0 0 0 1px var(--c),0 0 20px -5px var(--c)}
  .vsP.win{opacity:1;border-color:var(--gold);box-shadow:0 0 0 1px var(--gold),0 0 22px -4px var(--gold)}
  .vsP.lose{opacity:.4}
  .vsSym{flex:none;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;line-height:1;
    color:var(--c);border:1.5px solid var(--c);background:rgba(243,238,229,.04)}
  .vsInfo{min-width:0;display:flex;flex-direction:column;gap:3px}
  .vsName{font-size:13px;font-weight:800;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .vsTag{font-size:8.5px;font-weight:800;letter-spacing:.1em;color:var(--c);display:flex;align-items:center;gap:5px}
  .vsP.O .vsTag{justify-content:flex-end}
  .vsTag .d{width:6px;height:6px;border-radius:50%;background:#5fd48a}
  .vsTag .d.off{background:#e0903a}
  .vsMid{font-size:11px;font-weight:900;letter-spacing:.12em;color:var(--dim)}
  .vsBanner{text-align:center;font-size:12.5px;font-weight:800;padding:8px 12px;border-radius:99px;border:1px solid var(--line-strong);color:var(--muted);background:rgba(243,238,229,.03)}
  .vsBanner.mine{--c:var(--x);border-color:var(--c);color:var(--c);animation:vsPulse 1.6s ease-in-out infinite}
  .vsBanner.mine.O{--c:var(--o)}
  .vsBanner.win{border-color:var(--gold);color:var(--gold);background:rgba(228,193,106,.09);animation:none}
  .vsBanner.lose{color:var(--text)}
  @keyframes vsPulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 14px -3px var(--c)}}
  .vsRoom{text-align:center;font-size:9.5px;color:var(--dim);letter-spacing:.06em}
  .vsRoom b{color:#c7beb1;letter-spacing:.22em}
  body.online .control-panel{display:none}
  /* nút thoát: góc dưới bên phải màn hình */
  #btnLeaveOnline{display:none;position:fixed;right:14px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:60;align-items:center;gap:6px;height:36px;padding:0 14px;border-radius:99px;
    border:1px solid var(--line-strong);background:rgba(17,16,13,.9);color:#c7beb1;font-size:11px;font-weight:700;cursor:pointer}
  #btnLeaveOnline:active{transform:scale(.96)}
  body.online #btnLeaveOnline{display:inline-flex}
  /* biểu cảm */
  #emoBar{display:none;justify-content:center;gap:10px;padding-top:4px}
  body.online #emoBar{display:flex}
  #emoBar button{width:58px;height:50px;border-radius:14px;border:1px solid var(--line-strong);background:rgba(243,238,229,.04);font-size:26px;line-height:1;cursor:pointer;padding:0;transition:transform .1s,background .15s;-webkit-user-select:none;user-select:none;touch-action:manipulation}
  #emoBar button:active{transform:scale(.88);background:rgba(243,238,229,.1)}
  .vsP{overflow:visible}
  .vsRow{position:relative}
  .vsEmo{position:absolute;z-index:20;font-size:30px;line-height:1;pointer-events:none;will-change:transform,opacity;animation:vsEmoFly 1.5s ease-out forwards}
  @keyframes vsEmoFly{0%{transform:translate(-50%,0) scale(.5);opacity:0}15%{opacity:1;transform:translate(-50%,6px) scale(1.15)}100%{transform:translate(calc(-50% + var(--dx)),64px) scale(1);opacity:0}}
  /* hộp xác nhận thoát */
  #vsConfirm{position:fixed;inset:0;z-index:95;display:none;align-items:center;justify-content:center;background:rgba(17,16,13,.8);padding:20px}
  #vsConfirm.show{display:flex}
  .vscBox{width:min(100%,300px);background:#211e19;border:1px solid var(--line-strong);border-radius:12px;padding:20px 18px 16px;text-align:center;box-shadow:0 18px 42px rgba(0,0,0,.4)}
  .vscT{font-size:15px;font-weight:800;color:var(--text);margin-bottom:8px}
  .vscD{font-size:12px;color:#cdc4b8;line-height:1.55;margin-bottom:16px}
  .vscB{display:flex;gap:10px}
  .vscB button{flex:1;height:42px;border-radius:9px;font-size:12px;font-weight:800;cursor:pointer;border:1px solid var(--line-strong);background:transparent;color:var(--text)}
  .vscB .yes{border-color:rgba(224,110,114,.6);color:#ff9b9b;background:rgba(224,110,114,.1)}
  /* màn giới thiệu trận đấu */
  #vsIntro{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(17,16,13,.93);padding:20px}
  #vsIntro.show{display:flex;animation:vsiFade .3s ease both}
  @keyframes vsiFade{from{opacity:0}to{opacity:1}}
  .vsiBox{width:min(100%,380px);text-align:center}
  .vsiTitle{font-size:11px;font-weight:800;letter-spacing:.22em;color:var(--gold);margin-bottom:22px;animation:vsiFade .6s ease both}
  .vsiRow{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px}
  .vsiP{--c:var(--muted);display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 8px 14px;border-radius:16px;border:1.5px solid var(--c);background:rgba(243,238,229,.04);min-width:0}
  .vsiP.X{--c:var(--x);animation:vsiL .8s cubic-bezier(.2,.85,.25,1) both}.vsiP.O{--c:var(--o);animation:vsiR .8s cubic-bezier(.2,.85,.25,1) both}
  @keyframes vsiL{from{transform:translateX(-110vw)}to{transform:none}}
  @keyframes vsiR{from{transform:translateX(110vw)}to{transform:none}}
  .vsiSym{font-size:64px;line-height:1;font-weight:900;color:var(--c);text-shadow:0 0 22px var(--c)}
  .vsiName{font-size:15px;font-weight:800;color:var(--text);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .vsiTag{font-size:9px;font-weight:800;letter-spacing:.14em;color:var(--c);min-height:12px}
  .vsiVs{font-size:15px;font-weight:900;letter-spacing:.1em;color:var(--dim);animation:vsiFade .6s .5s ease both}
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const content = document.querySelector('#overlay .overlay-content');
  const pvpBtn = document.getElementById('pvpBtn');
  const btn = document.createElement('button');
  btn.className = 'mode-btn'; btn.id = 'onlineBtn'; btn.textContent = 'TRỰC TUYẾN (MÃ PHÒNG)';
  pvpBtn.after(btn);

  const panel = document.createElement('div');
  panel.id = 'onPanel';
  panel.innerHTML = `
    <div id="onMenu">
      <button class="mode-btn" id="onQuick">CHƠI NGAY</button>
      <button class="mode-btn" id="onCreate">TẠO PHÒNG</button>
      <div class="onRow"><input id="onCodeIn" maxlength="5" placeholder="NHẬP MÃ PHÒNG" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="mode-btn" id="onJoin">VÀO</button></div>
    </div>
    <div id="onQueueBox"><div id="onQSym"><b>X</b><b>O</b></div><div id="onQWait">Đang tìm đối thủ<i></i><i></i><i></i></div>
      <div class="onSub" style="margin-top:6px">Bạn sẽ được ghép với người cũng bấm CHƠI NGAY</div>
      <div class="onRow" style="justify-content:center;margin-top:10px"><button class="mode-btn" id="onQCancel" style="width:130px;height:38px;margin:0">HỦY</button></div></div>
    <div id="onCodeBox"><div class="onSub">Mã phòng của bạn</div><div id="onCode">-----</div>
      <div class="onRow" style="justify-content:center;margin-top:8px"><button class="mode-btn" id="onCopy" style="width:130px;height:38px;margin:0">SAO CHÉP MÃ</button></div>
      <div id="onWait">Đang chờ người chơi thứ hai<i></i><i></i><i></i></div></div>
    <div id="onMsg"></div>
    <button class="onLink" id="onBack">← Quay lại</button>`;
  content.insertBefore(panel, document.getElementById('btnSiteReturn'));

  // Khung thông tin ván (thay cho dòng trạng thái / bình luận AI của chế độ đấu máy)
  const hud = document.createElement('section');
  hud.id = 'onlineHud';
  hud.innerHTML = '<div class="vsRow"><div class="vsP X" id="vsX"></div><div class="vsMid">VS</div><div class="vsP O" id="vsO"></div></div>' +
    '<div class="vsBanner" id="vsBanner"></div><div class="vsRoom" id="vsRoom"></div>';
  document.getElementById('statusTop').after(hud);

  // nút Thoát phòng ở góc dưới bên phải (có xác nhận)
  const leaveBtn = document.createElement('button');
  leaveBtn.id = 'btnLeaveOnline'; leaveBtn.type = 'button'; leaveBtn.innerHTML = '<span>⎋</span><span>Thoát phòng</span>';
  document.body.appendChild(leaveBtn);
  leaveBtn.onclick = () => goToModeSelect();

  // biểu cảm: 4 nút dưới bàn cờ
  const EMOS = ['😂', '🙁', '😭', '😡'];
  const emoBar = document.createElement('div');
  emoBar.id = 'emoBar';
  emoBar.innerHTML = EMOS.map((e, i) => `<button type="button" data-k="${i}" aria-label="Biểu cảm ${e}">${e}</button>`).join('');
  document.getElementById('board-wrap').after(emoBar);

  const confirmEl = document.createElement('div');
  confirmEl.id = 'vsConfirm';
  document.body.appendChild(confirmEl);

  const intro = document.createElement('div');
  intro.id = 'vsIntro';
  document.body.appendChild(intro);

  const $ = id => document.getElementById(id);
  const overlayEl = $('overlay');
  const msg = t => { $('onMsg').textContent = t || ''; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function showMenu() {
    $('onMenu').style.display = ''; $('onCodeBox').style.display = 'none'; $('onQueueBox').style.display = 'none';
    $('onCode').textContent = '-----'; $('onCodeIn').value = ''; msg('');
  }
  btn.onclick = () => { overlayEl.classList.add('onl'); showMenu(); };
  $('onBack').onclick = async () => { await cancelAll(); overlayEl.classList.remove('onl'); };
  $('onCodeIn').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('onCodeIn').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') $('onJoin').click(); });
  $('onCopy').onclick = async () => {
    try { await navigator.clipboard.writeText(on.code); $('onCopy').textContent = 'ĐÃ SAO CHÉP ✓'; setTimeout(() => $('onCopy').textContent = 'SAO CHÉP MÃ', 1500); } catch (e) {}
  };
  // bản cũ lưu mã phòng để "tiếp tục"; tính năng này đã bỏ nên dọn mã còn sót
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}

  // ---------- Tạo / vào phòng ----------
  async function makeRoom() {
    let code = null;
    for (let i = 0; i < 6 && !code; i++) { const c = genCode(); if ((await http('GET', '/caro_rooms/' + c + '/host')) === null) code = c; }
    if (!code) throw new Error('no_code');
    const id = rndId();
    await http('PUT', '/caro_rooms/' + code, {
      host: { id, name: myName(), seen: SV }, created: SV, round: 'g0', rounds: { g0: { xHost: Math.random() < 0.5 } },
    });
    Object.assign(on, { code, id, role: 'host' });
    connect();
    return code;
  }
  async function createRoom() {
    msg(''); $('onCreate').disabled = true;
    try {
      const code = await makeRoom();
      $('onMenu').style.display = 'none'; $('onCodeBox').style.display = 'block'; $('onCode').textContent = code;
    } catch (e) { msg('Không tạo được phòng. Kiểm tra mạng hoặc quy tắc Firebase rồi thử lại.'); }
    $('onCreate').disabled = false;
  }

  // vào phòng làm khách; trả về chuỗi lỗi hoặc '' nếu thành công
  async function joinCode(code) {
    const room = await http('GET', '/caro_rooms/' + code);
    if (!room || !room.host) return 'Không tìm thấy phòng này.';
    if (room.guest || room.left) return 'Phòng đã đủ hai người.';
    const id = rndId();
    try { await http('PUT', '/caro_rooms/' + code + '/guest', { id, name: myName(), seen: SV }); }
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

  // ---------- Ghép trận nhanh (CHƠI NGAY) ----------
  const qm = { on: false, id: null, timer: null, hasRoom: false, offset: 0, tick: 0, busy: false };
  const QUEUE_FRESH_MS = 25000;

  async function quickPlay() {
    if (qm.on) return;
    msg('');
    qm.on = true; qm.id = rndId(); qm.hasRoom = false; qm.tick = 0; qm.busy = false;
    $('onMenu').style.display = 'none'; $('onQueueBox').style.display = 'block';
    try {
      await http('PUT', '/caro_queue/' + qm.id, { name: myName(), seen: SV });
      const me = await http('GET', '/caro_queue/' + qm.id);
      qm.offset = ((me && me.seen) || Date.now()) - Date.now();   // chênh lệch giờ máy chủ so với máy này
    } catch (e) {
      qm.on = false; showMenu(); msg('Không kết nối được máy chủ ghép trận. Kiểm tra mạng hoặc quy tắc Firebase.'); return;
    }
    qm.timer = setInterval(qmTick, 1500);
    qmTick();
  }
  function qmStop(del) {
    clearInterval(qm.timer);
    const id = qm.id, was = qm.on;
    qm.on = false; qm.timer = null; qm.hasRoom = false;
    $('onQueueBox').style.display = 'none';
    if (del && was && id) http('DELETE', '/caro_queue/' + id).catch(() => {});
  }
  async function qmTick() {
    if (!qm.on || qm.busy || on.started) return;
    qm.busy = true;
    try {
      const q = (await http('GET', '/caro_queue')) || {};
      if (!qm.on) return;
      const now = Date.now() + qm.offset;
      const cands = [];
      for (const k of Object.keys(q)) {
        const v = q[k];
        if (!v || typeof v.seen !== 'number') continue;
        if (now - v.seen > 120000) { http('DELETE', '/caro_queue/' + k).catch(() => {}); continue; }   // dọn mục đã bỏ đi
        if (k !== qm.id && v.room && CODE_RE.test(v.room) && now - v.seen < QUEUE_FRESH_MS) cands.push([k, v.room]);
      }
      cands.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      for (const [k, room] of cands) {
        if (qm.hasRoom) {
          if (!(k < qm.id)) continue;                       // chỉ nhường cho bên có id nhỏ hơn
          if (on.tree && on.tree.guest) break;              // phòng của mình đã có người
          await closeRoomSilently();
          http('DELETE', '/caro_queue/' + qm.id + '/room').catch(() => {});
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
        await http('PUT', '/caro_queue/' + qm.id + '/room', on.code);
      }
      if (++qm.tick % 5 === 0) http('PUT', '/caro_queue/' + qm.id + '/seen', SV).catch(() => {});
    } catch (e) { /* lỗi mạng tạm thời: thử lại ở nhịp sau */ }
    finally { qm.busy = false; }
  }
  $('onQuick').onclick = quickPlay;
  $('onQCancel').onclick = async () => { await cancelAll(); showMenu(); };
  async function cancelAll() {
    if (qm.on) qmStop(true);
    if (on.active) await leave();
    else showMenu();
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
    Object.assign(on, { active: true, closing: false, started: false, tree: null, applied: 0, round: null, forfeit: false, winner: null, connOk: true, emoN: null, emoInit: false });
    document.body.classList.add('online');
    document.body.classList.remove('on-over', 'on-forfeit');
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
    es.onerror = () => { on.connOk = false; renderVs(); };   // EventSource tự nối lại, rồi gửi lại toàn bộ dữ liệu
    es.onopen = () => { on.connOk = true; renderVs(); };
  }

  function oppRole() { return on.role === 'host' ? 'guest' : 'host'; }
  function oppNode() { const t = on.tree; return t ? t[oppRole()] : null; }
  function oppSym() { return on.mySym === 'X' ? 'O' : 'X'; }
  function updateOpp() {
    const o = oppNode();
    const seen = o ? o.seen : null;
    if (seen !== on.oppSeen) { on.oppSeen = seen; on.oppSeenAt = Date.now(); }
    on.oppLost = !!(o && Date.now() - on.oppSeenAt > STALE_MS);
    renderVs();
    // đối thủ im lặng quá lâu (tắt máy, mất mạng, đóng trình duyệt không báo): coi như đã thoát, người ở lại thắng
    if (on.started && !gameOver && !on.forfeit && on.connOk && document.visibilityState === 'visible' && o && Date.now() - on.oppSeenAt > FORFEIT_MS) {
      http('PUT', '/caro_rooms/' + on.code + '/left', oppRole()).catch(() => {});
      opponentLeft();
    }
  }

  function onTree() {
    const t = on.tree;
    if (t === null && on.active && !on.closing) {   // phòng đã bị xoá
      if (on.started) { opponentLeft(); return; }
      leave().then(() => { goToModeSelect(); overlayEl.classList.remove('onl'); });
      return;
    }
    if (!t || !t.host) return;
    if (t.guest && !on.started) {
      on.started = true;
      if (qm.on) qmStop(true);
      overlayEl.style.display = 'none'; overlayEl.classList.remove('onl');
      boardDiv.classList.remove('disabled');
      startRound(t.round || 'g0');
      showIntro(true);
    }
    if (!on.started) return;
    if (t.left && t.left !== on.role) opponentLeft();
    if (t.round && t.round !== on.round && !on.forfeit) { startRound(t.round); showIntro(false); }
    applyMoves();
    checkEmo(t);
    updateOpp();
  }

  // đối thủ đã thoát: nếu ván chưa xong thì người ở lại thắng
  function opponentLeft() {
    if (on.forfeit) return;
    on.forfeit = true;
    if (!gameOver) {
      gameOver = true; on.winner = on.mySym;
      launchConfetti();
    }
    boardDiv.classList.add('disabled');
    document.body.classList.add('on-over', 'on-forfeit');
    hideIntro();
    renderVs();
  }

  function roundMoves() {
    const m = on.tree && on.tree.moves && on.tree.moves[on.round];
    if (!m) return [];
    return Object.keys(m).map(k => m[k]).filter(x => x && typeof x.n === 'number').sort((a, b) => a.n - b.n);
  }

  function startRound(g) {
    const t = on.tree, xHost = !!(t.rounds && t.rounds[g] && t.rounds[g].xHost);
    on.round = g; on.applied = 0; on.winner = null;
    on.mySym = ((on.role === 'host') === xHost) ? 'X' : 'O';
    aiRequestId++; aiThinking = false; gameOver = false; lastCell = null;
    human = on.mySym; ai = on.mySym === 'X' ? 'O' : 'X'; currentTurn = 'X'; pvpMode = true;
    moveHistory = []; canUndo = false; undoUsed = false; drawMilestones.clear(); drawPopup.style.display = 'none';
    createBoard(); statusTop.classList.remove('win');
    document.body.classList.remove('on-over');
    renderTurn();
  }

  // tên người chơi theo quân X / O của ván hiện tại
  function names() {
    const t = on.tree || {};
    const me = myName();
    const mine = on.role === 'host' ? (t.host && t.host.name) || me : (t.guest && t.guest.name) || me;
    const opp = (oppNode() && oppNode().name) || 'Đối thủ';
    return on.mySym === 'X' ? { X: mine, O: opp } : { X: opp, O: mine };
  }

  function playerCard(sym, nm) {
    const mine = sym === on.mySym, over = gameOver;
    const left = on.forfeit && !mine;
    let tag = mine ? 'BẠN' : '';
    let dot = '';
    if (!mine) dot = `<i class="d${on.oppLost || left ? ' off' : ''}"></i>`;
    else dot = `<i class="d${on.connOk ? '' : ' off'}"></i>`;
    if (over && on.winner === sym) tag = on.forfeit && !mine ? '' : 'THẮNG';
    if (left) tag = 'ĐÃ THOÁT';
    else if (!mine && on.oppLost && !over) tag = 'MẤT KẾT NỐI';
    const cls = ['vsP', sym];
    if (over) cls.push(on.winner === sym ? 'win' : 'lose'); else if (currentTurn === sym) cls.push('act');
    return { cls: cls.join(' '), html: `<div class="vsSym">${sym}</div><div class="vsInfo"><div class="vsName">${esc(nm)}</div><div class="vsTag">${sym === 'O' ? '' : dot}${esc(tag)}${sym === 'O' ? dot : ''}</div></div>` };
  }

  function renderVs() {
    if (!on.active || !on.started) return;
    const n = names();
    for (const sym of ['X', 'O']) {
      const c = playerCard(sym, n[sym]), el = $('vs' + sym);
      el.className = c.cls; el.innerHTML = c.html;
    }
    const b = $('vsBanner');
    let text, cls = 'vsBanner';
    if (on.forfeit) { text = gameOver && on.winner === on.mySym ? '🎉 Đối thủ đã thoát — Bạn thắng!' : 'Đối thủ đã rời phòng'; cls += ' win'; }
    else if (gameOver) {
      const win = on.winner === on.mySym;
      text = win ? '🎉 Bạn thắng!' : 'Đối thủ thắng'; cls += win ? ' win' : ' lose';
    } else if (currentTurn === on.mySym) { text = `Lượt của bạn — đặt quân ${on.mySym}`; cls += ' mine ' + on.mySym; }
    else text = 'Đối thủ đang đi…';
    b.className = cls; b.textContent = text;
    $('vsRoom').innerHTML = 'Phòng <b>' + esc(on.code) + '</b>';
  }

  function renderTurn() {
    document.body.classList.toggle('on-over', !!gameOver);
    renderVs();
    if (gameOver) return;
    boardDiv.classList.toggle('disabled', currentTurn !== on.mySym);
  }

  // ---------- Màn giới thiệu trận ----------
  let introTimer = null;
  function hideIntro() { clearTimeout(introTimer); intro.classList.remove('show'); intro.innerHTML = ''; }
  function showIntro(first) {
    hideIntro();
    const n = names(), me = on.mySym;
    const card = sym => `<div class="vsiP ${sym}"><div class="vsiSym">${sym}</div><div class="vsiName">${esc(n[sym])}</div><div class="vsiTag">${sym === me ? 'BẠN' : ''}</div></div>`;
    intro.innerHTML = `<div class="vsiBox"><div class="vsiTitle">${first ? 'GHÉP TRẬN THÀNH CÔNG' : 'VÁN MỚI — ĐỔI BÊN'}</div>
      <div class="vsiRow">${card('X')}<div class="vsiVs">VS</div>${card('O')}</div></div>`;
    intro.classList.add('show');
    introTimer = setTimeout(hideIntro, INTRO_MS);   // hết 3 giây là vào trận
  }

  // ---------- Biểu cảm ----------
  function floatEmo(sym, k) {
    const card = $('vs' + sym), row = card && card.parentElement, em = EMOS[k];   // gắn vào hàng, không gắn vào thẻ (thẻ được vẽ lại liên tục)
    if (!card || !em || row.querySelectorAll('.vsEmo').length > 24) return;
    const el = document.createElement('span');
    el.className = 'vsEmo'; el.textContent = em;
    el.style.left = (card.offsetLeft + card.offsetWidth / 2) + 'px';
    el.style.top = (card.offsetTop + card.offsetHeight * 0.55) + 'px';
    el.style.setProperty('--dx', (Math.random() * 44 - 22).toFixed(0) + 'px');
    row.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }
  emoBar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !on.active || !on.started) return;
    const k = +b.dataset.k;
    floatEmo(on.mySym, k);   // hiện ngay bên mình
    http('PUT', '/caro_rooms/' + on.code + '/emo/' + on.role, { k, n: Date.now() * 1000 + Math.floor(Math.random() * 1000) }).catch(() => {});
  });
  function checkEmo(t) {
    const e = t.emo && t.emo[oppRole()];
    if (!e || typeof e.k !== 'number') { on.emoInit = true; return; }
    if (on.emoInit && e.n !== on.emoN) floatEmo(oppSym(), e.k);
    on.emoN = e.n; on.emoInit = true;
  }

  // ---------- Xác nhận thoát ----------
  function askLeave(done) {
    const mid = on.started && !gameOver && !on.forfeit;
    confirmEl.innerHTML = `<div class="vscBox"><div class="vscT">Thoát phòng?</div><div class="vscD">${mid ? 'Ván đang chơi dở. Nếu thoát, đối thủ sẽ thắng.' : 'Bạn sẽ rời khỏi phòng trực tuyến.'}</div>
      <div class="vscB"><button type="button" class="no">Ở LẠI</button><button type="button" class="yes">THOÁT</button></div></div>`;
    confirmEl.classList.add('show');
    const close = () => { confirmEl.classList.remove('show'); confirmEl.innerHTML = ''; };
    confirmEl.querySelector('.no').onclick = close;
    confirmEl.querySelector('.yes').onclick = () => { close(); done(); };
  }
  const baseGoToModeSelect = window.goToModeSelect;
  window.goToModeSelect = function () {
    if (on.active && on.started && !on.closing) return askLeave(() => baseGoToModeSelect());
    return baseGoToModeSelect();
  };

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
      highlightWin(r, c, p); gameOver = true; on.winner = p;
      if (p === on.mySym) launchConfetti();
      boardDiv.classList.remove('disabled');
      renderTurn();
      return;
    }
    currentTurn = p === 'X' ? 'O' : 'X';
    renderTurn();
  }

  // ---------- Hành động của người chơi ----------
  window.onlineClick = async function (r, c) {
    if (!on.active || !on.started || gameOver || on.forfeit || currentTurn !== on.mySym || board[r][c] !== '') return;
    const n = on.applied, g = on.round;
    on.applied = n + 1;
    afterMove(r, c, on.mySym);   // hiện ngay, không chờ mạng
    try { await http('PUT', '/caro_rooms/' + on.code + '/moves/' + g + '/m' + n, { n, r, c, p: on.mySym, u: on.id }); }
    catch (e) { toast('Gửi nước đi thất bại, đang đồng bộ lại...'); resync(); }
  };
  function resync() { if (on.es) on.es.close(); on.tree = null; on.started = true; startStream(); setTimeout(() => { if (on.tree && on.tree.round) startRound(on.tree.round); applyMoves(); }, 1200); }

  window.onlineNewRound = async function () {
    if (!on.active || !on.started || on.forfeit) return;
    if (!gameOver) { toast('Chỉ bắt đầu ván mới khi ván này đã kết thúc.'); return; }
    const next = 'g' + (parseInt(on.round.slice(1), 10) + 1);
    const cur = on.tree.rounds[on.round];
    try {
      try { await http('PUT', '/caro_rooms/' + on.code + '/rounds/' + next, { xHost: !cur.xHost }); } catch (e) { /* đối thủ vừa tạo xong */ }
      await http('PUT', '/caro_rooms/' + on.code + '/round', next);
    } catch (e) { toast('Không tạo được ván mới. Thử lại.'); }
  };

  // Rời phòng. Chưa có đối thủ: xoá phòng. Đã vào trận: ghi "left" để người ở lại thắng, người ở lại sẽ xoá phòng khi thoát.
  function resetOnline() {
    clearInterval(on.hb); clearInterval(on.watch);
    if (on.es) on.es.close();
    const snap = { code: on.code, role: on.role, active: on.active, started: on.started, tree: on.tree };
    Object.assign(on, { active: false, code: null, role: null, es: null, tree: null, started: false, round: null, applied: 0, forfeit: false, winner: null });
    document.body.classList.remove('online', 'on-over', 'on-forfeit');
    hideIntro();
    return snap;
  }
  async function closeRoomSilently() {
    on.closing = true;
    const { code, active } = resetOnline();
    if (active && code) { try { await http('DELETE', '/caro_rooms/' + code); } catch (e) {} }
  }
  async function leave() {
    on.closing = true;
    const { code, role, active, started, tree } = resetOnline();
    if (qm.on) qmStop(true);
    if (active && code) {
      try {
        const oppLeft = tree && tree.left && tree.left !== role;
        if (started && tree && tree.guest && !oppLeft) await http('PUT', '/caro_rooms/' + code + '/left', role);
        else await http('DELETE', '/caro_rooms/' + code);
      } catch (e) {}
    }
    showMenu();
  }
  window.onlineLeave = () => {
    if (qm.on) qmStop(true);
    if (!on.active) return null;
    const p = leave(); overlayEl.classList.remove('onl'); return p;
  };
  window.onlineActive = () => on.active;

  // thông báo nhỏ
  let tt = null;
  function toast(text) {
    let el = document.getElementById('onToast');
    if (!el) { el = document.createElement('div'); el.id = 'onToast'; el.setAttribute('style', 'position:fixed;left:50%;bottom:calc(70px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:90;background:rgba(20,18,16,.94);color:#f3eee5;border:1px solid rgba(243,238,229,.2);border-radius:99px;padding:9px 16px;font-size:12px;font-weight:600;max-width:86vw;text-align:center;transition:opacity .25s;opacity:0;pointer-events:none'); document.body.appendChild(el); }
    el.textContent = text; el.style.opacity = '1'; clearTimeout(tt); tt = setTimeout(() => { el.style.opacity = '0'; }, 2600);
  }

  // đóng trang / thoát đột ngột: báo cho đối thủ (hoặc xoá phòng / hàng chờ) bằng keepalive
  window.addEventListener('pagehide', () => {
    const ka = (method, path, body) => { try { fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body), keepalive: true }); } catch (e) {} };
    if (qm.on && qm.id) ka('DELETE', '/caro_queue/' + qm.id);
    if (!on.active || !on.code) return;
    const t = on.tree;
    if (on.started && t && t.guest && !(t.left && t.left !== on.role)) ka('PUT', '/caro_rooms/' + on.code + '/left', on.role);
    else ka('DELETE', '/caro_rooms/' + on.code);
  });
})();
