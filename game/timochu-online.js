/* Tìm ô chữ trực tuyến ("Đấu trường"): hai người ở hai máy giải CÙNG MỘT BẢNG, ai giải xong trước thì thắng.
 * Bảng được dựng lại ở mỗi máy từ (cỡ, seed) nằm trong phòng, nên không phải gửi nội dung bảng qua mạng.
 * Cỡ bảng do máy tự chọn ngẫu nhiên 4–6 và KHÔNG hiện ra cho người chơi.
 * Firebase Realtime Database qua REST + EventSource (không SDK, không máy chủ riêng). Giao diện riêng của game này (tiền tố tco-).
 *
 * Dữ liệu: /timochu_rooms/{MÃ}
 *   host, guest : { id, name, seen }      seen = nhịp tim (giờ máy chủ)
 *   round       : ván hiện tại (g0, g1...) ; rounds/{g} = { seed, n, v }  v = số từ trong kho (hai máy phải trùng)
 *   prog/{g}/{host|guest} = { n }          số hàng đã giải
 *   win/{g}     = { r }                    người giải xong trước; chỉ ghi được một lần
 *   left        : 'host' | 'guest'         người đã thoát; người còn lại thắng
 * Ghép trận nhanh: /timochu_queue/{id} = { name, seen, room? }
 */
(function () {
  'use strict';
  var TC = window.TimOChu && window.TimOChu.online;
  if (!TC) return;
  var DB = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  var ROOMS = '/timochu_rooms/', QUEUE = '/timochu_queue/';
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  var HEARTBEAT_MS = 12000, STALE_MS = 60000, FORFEIT_MS = 150000, QUEUE_FRESH_MS = 25000;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var esc = TC.esc;

  var on = { active: false, code: null, role: null, id: null, es: null, tree: null, round: null, started: false, closing: false,
    hb: null, watch: null, oppSeen: null, oppSeenAt: 0, oppLost: false, connOk: true, forfeit: false, over: false, playing: false,
    stageT: null, sendT: null, N: 0 };

  /* ---------- mạng ---------- */
  function http(method, path, body) {
    return fetch(DB + path + '.json', { method: method, body: body === undefined ? undefined : JSON.stringify(body) }).then(function (res) {
      if (!res.ok) { var e = new Error('http_' + res.status); e.status = res.status; throw e; }
      return res.json();
    });
  }
  var SV = { '.sv': 'timestamp' };
  function rndId() { var a = new Uint8Array(12); crypto.getRandomValues(a); return Array.from(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function genCode() { var s = '', a = new Uint8Array(5); crypto.getRandomValues(a); for (var i = 0; i < 5; i++) s += ALPHA[a[i] % ALPHA.length]; return s; }
  function myName() { return (window.Scores && Scores.hasName && Scores.hasName()) ? Scores.getName() : 'Người chơi'; }
  function toast(m) { TC.toast(m); }

  /* ---------- giao diện: kiểu "đấu trường", mọi ô là ô chữ ---------- */
  var css = [
    '#btnOnline{position:relative;display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:16px;text-align:left;background:linear-gradient(135deg,#1d6b8f,#0f3550);box-shadow:0 4px 0 #09283d,inset 0 0 0 1.5px rgba(255,209,102,.5)}',
    '#btnOnline .tcoMini{display:flex;gap:3px;flex:none}',
    '#btnOnline .tcoMini i{width:20px;height:20px;border-radius:5px;background:#fdfcf6;color:#143146;font:900 12px/20px "Be Vietnam Pro",system-ui,sans-serif;font-style:normal;text-align:center;box-shadow:0 2px 0 rgba(0,0,0,.3)}',
    '#btnOnline .tcoMini i:nth-child(2){background:#ffe9b0;transform:translateY(-2px)}',
    '#btnOnline b{display:block;font-size:16px;font-weight:900;letter-spacing:.5px;color:var(--gold)}',
    '#btnOnline small{display:block;font-size:12px;color:var(--muted);font-weight:600;margin-top:1px}',
    '#btnOnline:active{transform:translateY(2px)}',
    '#vOnline{gap:14px}',
    '.tcoHero{display:flex;justify-content:center;gap:6px;padding:10px 0 2px}',
    '.tcoT{width:clamp(44px,14vw,58px);aspect-ratio:1;border-radius:11px;background:var(--cell);color:#143146;display:grid;place-items:center;font:900 clamp(22px,7vw,30px)/1 "Be Vietnam Pro",system-ui,sans-serif;box-shadow:inset 0 -4px 0 rgba(0,0,0,.12),0 4px 0 rgba(0,0,0,.3)}',
    '.tcoT.k{background:#ffe9b0;box-shadow:inset 0 0 0 3px var(--key),0 4px 0 rgba(0,0,0,.3)}',
    '.tcoHero .tcoT{animation:tcoBob 2.6s ease-in-out infinite}',
    '.tcoHero .tcoT:nth-child(2){animation-delay:.15s}.tcoHero .tcoT:nth-child(3){animation-delay:.3s}.tcoHero .tcoT:nth-child(4){animation-delay:.45s}.tcoHero .tcoT:nth-child(5){animation-delay:.6s}',
    '@keyframes tcoBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}',
    '.tcoLead{text-align:center;color:var(--muted);font-size:14px;line-height:1.55}',
    '.tcoLead b{color:var(--ink)}',
    '.tcoBig{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:18px 12px;border-radius:18px;font-size:19px;font-weight:900;letter-spacing:1px;color:#3a2300;background:linear-gradient(180deg,#ffe07a,#f5a524);box-shadow:0 5px 0 #a86a00}',
    '.tcoBig:active{transform:translateY(3px);box-shadow:0 2px 0 #a86a00}',
    '.tcoSec{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase}',
    '.tcoSec:before,.tcoSec:after{content:"";flex:1;height:1px;background:rgba(255,255,255,.14)}',
    '.tcoGhost{width:100%;padding:14px 10px;border-radius:14px;background:rgba(255,255,255,.1);font-weight:800;font-size:15px}',
    '.tcoGhost:active{transform:translateY(2px)}',
    '.tcoGhost[disabled],.tcoBig[disabled]{opacity:.5}',
    '.tcoJoin{display:flex;gap:8px;align-items:stretch}',
    '.tcoCodeBox{position:relative;flex:1;min-width:0;display:flex;gap:5px}',
    '.tcoCodeBox .tcoT{flex:1;width:auto;max-width:54px;font-size:clamp(18px,6vw,26px);background:rgba(255,255,255,.9)}',
    '.tcoCodeBox .tcoT.on{box-shadow:inset 0 0 0 3px #2f8fd8,0 4px 0 rgba(0,0,0,.3)}',
    '.tcoCodeBox input{position:absolute;inset:0;width:100%;height:100%;opacity:0;font-size:16px;text-transform:uppercase;border:0;background:none;color:transparent}',
    '.tcoJoin .tcoGhost{width:92px;flex:none;background:rgba(47,143,216,.35)}',
    '#tcoMsg{min-height:18px;text-align:center;font-size:13px;font-weight:700;color:#ffb3a8}',
    '.tcoWait{display:none;flex-direction:column;align-items:center;gap:14px;padding:22px 12px;border-radius:20px;background:rgba(0,0,0,.2)}',
    '.tcoWait.on{display:flex}',
    '.tcoWait .row{display:flex;gap:6px}',
    '.tcoWait .lbl{font-size:15px;font-weight:800;text-align:center}',
    '.tcoWait .sub{font-size:12px;color:var(--muted);font-weight:600;text-align:center}',
    '.tcoDots i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:var(--gold);animation:tcoDot 1.2s infinite}',
    '.tcoDots i:nth-child(2){animation-delay:.2s}.tcoDots i:nth-child(3){animation-delay:.4s}',
    '@keyframes tcoDot{0%,80%,100%{opacity:.2}40%{opacity:1}}',
    '.tcoShuf .tcoT{animation:tcoFlip 1.1s ease-in-out infinite}',
    '.tcoShuf .tcoT:nth-child(2){animation-delay:.12s}.tcoShuf .tcoT:nth-child(3){animation-delay:.24s}.tcoShuf .tcoT:nth-child(4){animation-delay:.36s}.tcoShuf .tcoT:nth-child(5){animation-delay:.48s}',
    '@keyframes tcoFlip{0%,100%{transform:rotateX(0)}50%{transform:rotateX(90deg)}}',
    '#tcoCode .tcoT{width:clamp(40px,13vw,54px)}',
    '.tcoLink{align-self:center;color:var(--muted);font-size:13px;font-weight:700;padding:8px 14px}',
    /* thanh đối đầu trong ván */
    '#tcoDuel{display:none;gap:6px;padding:10px 12px;border-radius:16px;background:rgba(0,0,0,.22);flex-direction:column}',
    'body.tc-online #tcoDuel{display:flex}',
    '.tcoLane{display:grid;grid-template-columns:minmax(0,92px) 1fr auto;gap:8px;align-items:center}',
    '.tcoLane .nm{font-size:12.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.tcoLane .nm small{display:block;font-size:9.5px;letter-spacing:1.2px;color:var(--muted);font-weight:800}',
    '.tcoLane .pips{display:flex;gap:4px}',
    '.tcoLane .pips i{flex:1;max-width:30px;height:14px;border-radius:4px;background:rgba(255,255,255,.14);transition:background .25s,transform .25s}',
    '.tcoLane.me .pips i.f{background:#3fcf74;transform:translateY(-1px)}',
    '.tcoLane.op .pips i.f{background:#ff9f43;transform:translateY(-1px)}',
    '.tcoLane .w{font-size:12px;font-weight:900;color:var(--gold);min-width:26px;text-align:right}',
    '.tcoLane.off .nm small:after{content:" · mất kết nối";color:#ffb3a8}',
    'body.tc-online .status{display:none}',
    'body.tc-online #lvName{display:none}',
    'body.tc-online .actions{grid-template-columns:1fr 1fr}',
    'body.tc-online #btnGive,body.tc-online #btnNew{display:none}',
    '#tcoLeave{display:none}',
    'body.tc-online #tcoLeave{display:block}',
    /* màn chắn: giới thiệu + đếm ngược */
    '#tcoStage{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;flex-direction:column;gap:22px;background:#0b2233;padding:20px}',
    '#tcoStage.on{display:flex}',
    '#tcoStage .vs{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center;width:min(100%,380px)}',
    '#tcoStage .pl{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0}',
    '#tcoStage .pl .tcoT{width:56px}',
    '#tcoStage .pl.l{animation:tcoInL .7s cubic-bezier(.2,.9,.3,1.1) both}#tcoStage .pl.r{animation:tcoInR .7s cubic-bezier(.2,.9,.3,1.1) both}',
    '@keyframes tcoInL{from{transform:translateX(-90vw)}}@keyframes tcoInR{from{transform:translateX(90vw)}}',
    '#tcoStage .pn{font-size:14px;font-weight:800;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#tcoStage .pt{font-size:10px;font-weight:800;letter-spacing:1.4px;color:var(--muted)}',
    '#tcoStage .vsm{font-size:15px;font-weight:900;color:var(--gold);letter-spacing:1px}',
    '#tcoStage .cap{font-size:12px;font-weight:800;letter-spacing:2px;color:var(--gold)}',
    '#tcoStage .num .tcoT{width:96px;font-size:56px;animation:tcoPop .9s ease-out both}',
    '#tcoStage .num .tcoT.go{width:auto;padding:0 22px;font-size:36px;background:#ffe9b0;box-shadow:inset 0 0 0 4px var(--key),0 6px 0 rgba(0,0,0,.3)}',
    '@keyframes tcoPop{0%{transform:rotateX(90deg) scale(1.4);opacity:0}30%{transform:rotateX(0) scale(1);opacity:1}100%{transform:scale(.92);opacity:.85}}',
    /* kết quả */
    '#tcoResult{position:fixed;inset:0;z-index:70;display:none;align-items:center;justify-content:center;background:rgba(5,18,28,.82);padding:20px}',
    '#tcoResult.on{display:flex}',
    '#tcoResult .bx{width:min(100%,360px);text-align:center;background:linear-gradient(170deg,#21557a,#15364f);border-radius:22px;padding:22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.5)}',
    '#tcoResult .word{display:flex;justify-content:center;gap:5px;margin-bottom:10px}',
    '#tcoResult .word .tcoT{width:46px;animation:tcoWord .5s cubic-bezier(.2,1.4,.4,1) both}',
    '#tcoResult.lose .word .tcoT{background:#c9d6de;color:#4b6475}',
    '@keyframes tcoWord{from{transform:rotateX(90deg)}}',
    '#tcoResult .why{font-size:13px;color:var(--muted);font-weight:600;line-height:1.45;margin-bottom:12px}',
    '#tcoResult .kw{font-size:12px;color:var(--muted);font-weight:700}',
    '#tcoResult .kwv{font-size:20px;font-weight:900;letter-spacing:3px;margin:2px 0 4px}',
    '#tcoResult .kwd{font-size:12.5px;color:var(--muted);line-height:1.45;margin-bottom:12px}',
    '#tcoResult .tally{display:flex;align-items:center;justify-content:center;gap:14px;margin:6px 0 16px}',
    '#tcoResult .tally div{min-width:0;max-width:42%}',
    '#tcoResult .tally b{display:block;font-size:34px;line-height:1;font-variant-numeric:tabular-nums}',
    '#tcoResult .tally small{display:block;font-size:11px;color:var(--muted);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#tcoResult .tally span{font-size:20px;font-weight:900;color:var(--muted)}',
    '#tcoResult .bt{display:grid;gap:10px}',
    '#tcoAsk{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;background:rgba(5,18,28,.7);padding:20px}',
    '#tcoAsk.on{display:flex}',
    '#tcoAsk .bx{width:min(100%,300px);text-align:center;background:#15364f;border-radius:18px;padding:20px 16px;box-shadow:0 16px 40px rgba(0,0,0,.5)}',
    '#tcoAsk h3{font-size:18px;font-weight:900;margin-bottom:6px}',
    '#tcoAsk p{font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:14px}',
    '#tcoAsk .row{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '@media (max-height:520px) and (orientation:landscape){.tcoHero{display:none}.tcoBig{padding:12px}#tcoStage{gap:12px}}',
    '@media (prefers-reduced-motion:reduce){.tcoHero .tcoT,.tcoShuf .tcoT,#tcoStage .pl,#tcoStage .num .tcoT,#tcoResult .word .tcoT{animation:none!important}}'
  ].join('\n');
  var stEl = document.createElement('style'); stEl.textContent = css; document.head.appendChild(stEl);

  function tiles(str, cls) { return Array.from(str).map(function (c) { return '<div class="tcoT' + (cls ? ' ' + cls : '') + '">' + esc(c) + '</div>'; }).join(''); }

  // nút vào đấu trường ở menu chính
  var play = $('btnPlay');
  var entry = document.createElement('button');
  entry.id = 'btnOnline'; entry.type = 'button';
  entry.innerHTML = '<span class="tcoMini"><i>Đ</i><i>Ấ</i><i>U</i></span><span><b>ĐẤU TRỰC TUYẾN</b><small>Cùng một bảng, ai giải xong trước thì thắng</small></span>';
  play.after(entry);

  // màn sảnh
  var lobby = document.createElement('section');
  lobby.className = 'view'; lobby.id = 'vOnline';
  lobby.innerHTML =
    '<div id="tcoHome" style="display:flex;flex-direction:column;gap:14px">' +
    '<div class="tcoHero">' + ['Đ', 'Ố', 'I', 'Đ', 'Ầ', 'U'].map(function (c, i) { return '<div class="tcoT' + (i === 2 ? ' k' : '') + '">' + c + '</div>'; }).join('') + '</div>' +
    '<p class="tcoLead">Hai người cùng giải <b>một bảng chữ</b>. Ai tìm ra đáp án trước là người <b>chiến thắng</b>.</p>' +
    '<button class="tcoBig" id="tcoQuick" type="button">TÌM ĐỐI THỦ</button>' +
    '<div class="tcoSec">hoặc đấu với bạn bè</div>' +
    '<button class="tcoGhost" id="tcoCreate" type="button">Mở phòng riêng</button>' +
    '<div class="tcoJoin"><div class="tcoCodeBox" id="tcoBox">' + tiles('     ') + '<input id="tcoIn" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" aria-label="Mã phòng"></div>' +
    '<button class="tcoGhost" id="tcoJoin" type="button">VÀO</button></div>' +
    '<div id="tcoMsg" role="status"></div></div>' +
    '<div class="tcoWait" id="tcoSearch"><div class="row tcoShuf">' + tiles('TÌMĐỐ') + '</div><div class="lbl">Đang tìm đối thủ<span class="tcoDots"><i></i><i></i><i></i></span></div><div class="sub">Thường chỉ mất vài giây</div><button class="tcoLink" id="tcoQCancel" type="button">Hủy</button></div>' +
    '<div class="tcoWait" id="tcoRoom"><div class="sub">Mã phòng của bạn</div><div class="row" id="tcoCode"></div><button class="tcoGhost" id="tcoCopy" type="button" style="width:auto;padding:10px 20px">Sao chép mã</button><div class="lbl">Đang chờ người chơi thứ hai<span class="tcoDots"><i></i><i></i><i></i></span></div><button class="tcoLink" id="tcoRCancel" type="button">Hủy phòng</button></div>' +
    '<button class="tcoLink" id="tcoBack" type="button">← Về menu</button>';
  document.querySelector('.app').appendChild(lobby);

  // thanh đối đầu + nút rời trận trong màn chơi
  var duel = document.createElement('div');
  duel.id = 'tcoDuel';
  duel.innerHTML = '<div class="tcoLane me" id="tcoMe"></div><div class="tcoLane op" id="tcoOp"></div>';
  $('vPlay').insertBefore(duel, $('vPlay').firstChild);
  var leaveBtn = document.createElement('button');
  leaveBtn.id = 'tcoLeave'; leaveBtn.type = 'button'; leaveBtn.className = 'btn'; leaveBtn.textContent = 'Rời trận';
  document.querySelector('.actions').appendChild(leaveBtn);

  var stage = document.createElement('div'); stage.id = 'tcoStage'; document.body.appendChild(stage);
  var result = document.createElement('div'); result.id = 'tcoResult'; result.setAttribute('role', 'dialog'); result.setAttribute('aria-modal', 'true'); document.body.appendChild(result);
  var ask = document.createElement('div'); ask.id = 'tcoAsk'; ask.setAttribute('role', 'dialog'); ask.setAttribute('aria-modal', 'true'); document.body.appendChild(ask);

  function msg(t) { $('tcoMsg').textContent = t || ''; }
  function showHome() {
    $('tcoHome').style.display = 'flex'; $('tcoSearch').classList.remove('on'); $('tcoRoom').classList.remove('on');
    $('tcoIn').value = ''; paintCode(''); msg('');
  }
  function paintCode(v) {
    var t = $('tcoBox').querySelectorAll('.tcoT');
    for (var i = 0; i < t.length; i++) { t[i].textContent = v[i] || ''; t[i].classList.toggle('on', i === v.length && document.activeElement === $('tcoIn')); }
  }
  entry.onclick = function () { TC.show('vOnline'); showHome(); };
  $('tcoBack').onclick = function () { cancelAll().then(function () { TC.leave(); }); };
  $('tcoIn').addEventListener('input', function (e) { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); paintCode(e.target.value); });
  $('tcoIn').addEventListener('focus', function () { paintCode($('tcoIn').value); });
  $('tcoIn').addEventListener('blur', function () { paintCode($('tcoIn').value); });
  $('tcoIn').addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') $('tcoJoin').click(); });
  $('tcoCopy').onclick = function () {
    try { navigator.clipboard.writeText(on.code).then(function () { $('tcoCopy').textContent = 'Đã sao chép'; setTimeout(function () { $('tcoCopy').textContent = 'Sao chép mã'; }, 1500); }); } catch (e) {}
  };

  /* ---------- tạo / vào phòng ---------- */
  function makeRoom() {
    var code = null, pick = TC.pick();
    if (!pick) return Promise.reject(new Error('no_puzzle'));
    function tryCode(i) {
      if (i >= 6) return Promise.reject(new Error('no_code'));
      var c = genCode();
      return http('GET', ROOMS + c + '/host').then(function (h) { return h === null ? c : tryCode(i + 1); });
    }
    return tryCode(0).then(function (c) {
      code = c;
      var id = rndId();
      return http('PUT', ROOMS + code, { host: { id: id, name: myName(), seen: SV }, created: SV, round: 'g0', rounds: { g0: pick } }).then(function () {
        on.code = code; on.id = id; on.role = 'host';
        connect();
        return code;
      });
    });
  }
  function createRoom() {
    msg(''); $('tcoCreate').disabled = true;
    makeRoom().then(function (code) {
      $('tcoHome').style.display = 'none'; $('tcoRoom').classList.add('on'); $('tcoCode').innerHTML = tiles(code);
    }).catch(function () { msg('Không tạo được phòng. Kiểm tra mạng rồi thử lại.'); }).then(function () { $('tcoCreate').disabled = false; });
  }
  function joinCode(code) {
    return http('GET', ROOMS + code).then(function (room) {
      if (!room || !room.host) return 'Không tìm thấy phòng này.';
      if (room.guest || room.left) return 'Phòng đã đủ hai người.';
      var id = rndId();
      return http('PUT', ROOMS + code + '/guest', { id: id, name: myName(), seen: SV }).then(function () {
        on.code = code; on.id = id; on.role = 'guest';
        connect();
        return '';
      }, function () { return 'Phòng đã đủ hai người.'; });
    });
  }
  function joinRoom(code) {
    code = String(code || '').toUpperCase();
    if (!CODE_RE.test(code)) return msg('Mã phòng gồm 5 ký tự (chữ và số).');
    msg(''); $('tcoJoin').disabled = true;
    joinCode(code).then(function (err) { if (err) msg(err); }, function () { msg('Không vào được phòng. Kiểm tra mạng rồi thử lại.'); })
      .then(function () { $('tcoJoin').disabled = false; });
  }
  $('tcoCreate').onclick = createRoom;
  $('tcoJoin').onclick = function () { joinRoom($('tcoIn').value); };
  $('tcoRCancel').onclick = function () { cancelAll().then(showHome); };

  /* ---------- ghép trận nhanh ---------- */
  var qm = { on: false, id: null, timer: null, hasRoom: false, offset: 0, tick: 0, busy: false };
  function quickPlay() {
    if (qm.on) return;
    msg('');
    qm.on = true; qm.id = rndId(); qm.hasRoom = false; qm.tick = 0; qm.busy = false;
    $('tcoHome').style.display = 'none'; $('tcoSearch').classList.add('on');
    http('PUT', QUEUE + qm.id, { name: myName(), seen: SV }).then(function () { return http('GET', QUEUE + qm.id); }).then(function (me) {
      qm.offset = ((me && me.seen) || Date.now()) - Date.now();
      qm.timer = setInterval(qmTick, 1500);
      qmTick();
    }).catch(function () {
      qm.on = false; showHome(); msg('Không kết nối được máy chủ ghép trận. Kiểm tra mạng rồi thử lại.');
    });
  }
  function qmStop(del) {
    clearInterval(qm.timer);
    var id = qm.id, was = qm.on;
    qm.on = false; qm.timer = null; qm.hasRoom = false;
    $('tcoSearch').classList.remove('on');
    if (del && was && id) http('DELETE', QUEUE + qm.id).catch(function () {});
  }
  function qmTick() {
    if (!qm.on || qm.busy || on.started) return;
    qm.busy = true;
    http('GET', QUEUE.slice(0, -1)).then(function (q) {
      q = q || {};
      if (!qm.on) return;
      var now = Date.now() + qm.offset, cands = [];
      Object.keys(q).forEach(function (k) {
        var v = q[k];
        if (!v || typeof v.seen !== 'number') return;
        if (now - v.seen > 120000) { http('DELETE', QUEUE + k).catch(function () {}); return; }
        if (k !== qm.id && v.room && CODE_RE.test(v.room) && now - v.seen < QUEUE_FRESH_MS) cands.push([k, v.room]);
      });
      cands.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
      var chain = Promise.resolve(false);
      cands.forEach(function (c) {
        chain = chain.then(function (joined) {
          if (joined) return true;
          var k = c[0], room = c[1];
          var pre = Promise.resolve(true);
          if (qm.hasRoom) {
            if (!(k < qm.id)) return false;                    // chỉ nhường cho bên có id nhỏ hơn
            if (on.tree && on.tree.guest) return false;       // phòng của mình đã có người
            pre = closeRoomSilently().then(function () { http('DELETE', QUEUE + qm.id + '/room').catch(function () {}); qm.hasRoom = false; return true; });
          }
          return pre.then(function (go) {
            if (!go) return false;
            return joinCode(room).then(function (err) { return !err; }, function () { return false; });
          });
        });
      });
      return chain.then(function (joined) {
        if (joined) { qmStop(true); return; }
        if (!qm.on || qm.hasRoom) { if (qm.on && ++qm.tick % 5 === 0) http('PUT', QUEUE + qm.id + '/seen', SV).catch(function () {}); return; }
        return makeRoom().then(function () {
          if (!qm.on) return closeRoomSilently();           // người chơi vừa bấm hủy trong lúc đang tạo phòng
          qm.hasRoom = true; return http('PUT', QUEUE + qm.id + '/room', on.code);
        });
      });
    }).catch(function () { /* lỗi mạng tạm thời: thử lại ở nhịp sau */ }).then(function () { qm.busy = false; });
  }
  $('tcoQuick').onclick = quickPlay;
  $('tcoQCancel').onclick = function () { cancelAll().then(showHome); };
  function cancelAll() {
    if (qm.on) qmStop(true);
    return on.active ? leave(true) : Promise.resolve();
  }

  /* ---------- luồng dữ liệu thời gian thực ---------- */
  function setIn(obj, parts, val) {
    if (!parts.length) return val;
    obj = (obj && typeof obj === 'object') ? obj : {};
    var k = parts[0];
    if (parts.length === 1) { if (val === null) delete obj[k]; else obj[k] = val; }
    else obj[k] = setIn(obj[k], parts.slice(1), val);
    return obj;
  }
  function split(p) { return p.split('/').filter(Boolean); }
  function connect() {
    on.active = true; on.closing = false; on.started = false; on.tree = null; on.round = null; on.forfeit = false; on.over = false; on.playing = false; on.connOk = true;
    startStream();
    clearInterval(on.hb);
    on.hb = setInterval(function () { http('PUT', ROOMS + on.code + '/' + on.role + '/seen', SV).catch(function () {}); }, HEARTBEAT_MS);
    clearInterval(on.watch); on.watch = setInterval(updateOpp, 4000);
  }
  function startStream() {
    if (on.es) on.es.close();
    var es = new EventSource(DB + ROOMS + on.code + '.json');
    on.es = es;
    es.addEventListener('put', function (e) { var m = JSON.parse(e.data); on.tree = setIn(on.tree, split(m.path), m.data === undefined ? null : m.data); onTree(); });
    es.addEventListener('patch', function (e) {
      var m = JSON.parse(e.data), base = split(m.path);
      Object.keys(m.data || {}).forEach(function (k) { on.tree = setIn(on.tree, base.concat(split(k)), m.data[k]); });
      onTree();
    });
    es.onerror = function () { on.connOk = false; if (es.readyState === 2) setTimeout(function () { if (on.active && !on.closing && on.es === es) startStream(); }, 2000); renderDuel(); };
    es.onopen = function () { on.connOk = true; renderDuel(); };
  }
  function oppRole() { return on.role === 'host' ? 'guest' : 'host'; }
  function oppNode() { return on.tree ? on.tree[oppRole()] : null; }
  function updateOpp() {
    var o = oppNode(), seen = o ? o.seen : null;
    if (seen !== on.oppSeen) { on.oppSeen = seen; on.oppSeenAt = Date.now(); }
    on.oppLost = !!(o && Date.now() - on.oppSeenAt > STALE_MS);
    renderDuel();
    if (on.started && !on.forfeit && on.connOk && document.visibilityState === 'visible' && o && Date.now() - on.oppSeenAt > FORFEIT_MS) {
      http('PUT', ROOMS + on.code + '/left', oppRole()).catch(function () {});
      opponentLeft();
    }
  }
  function names() {
    var t = on.tree || {};
    return { me: (t[on.role] && t[on.role].name) || myName(), opp: (oppNode() && oppNode().name) || 'Đối thủ' };
  }
  function wins() {
    var w = (on.tree && on.tree.win) || {}, me = 0, opp = 0;
    Object.keys(w).forEach(function (k) { if (!w[k]) return; if (w[k].r === on.role) me++; else opp++; });
    return { me: me, opp: opp };
  }

  function onTree() {
    var t = on.tree;
    if (t === null && on.active && !on.closing) {          // phòng đã bị xoá
      if (on.started) { opponentLeft(); return; }
      leave(true).then(function () { TC.leave(); });
      return;
    }
    if (!t || !t.host) return;
    if (t.guest && !on.started) {
      on.started = true;
      if (qm.on) qmStop(true);
      startRound(t.round || 'g0', true);
    }
    if (!on.started) return;
    if (t.left && t.left !== on.role) { opponentLeft(); return; }
    if (on.forfeit) return;
    RM.onTree();
    if (t.round && t.round !== on.round) startRound(t.round, false);
    var w = t.win && t.win[on.round];
    if (w && !on.over) roundOver(w.r);
    renderDuel();
  }

  /* ---------- ván đấu ---------- */
  function startRound(g, first) {
    var t = on.tree, r = t.rounds && t.rounds[g];
    if (!r || typeof r.seed !== 'number' || typeof r.n !== 'number') return;     // chờ dữ liệu ván về đủ
    if (r.v !== window.TimOChu.bankSize()) {
      toast('Hai máy đang dùng bộ từ khác nhau. Hãy tải lại trang rồi vào lại.');
      leave(true).then(function () { TC.leave(); });
      return;
    }
    on.round = g; on.over = false; on.playing = false;
    hideResult(); clearTimeout(on.stageT);
    if (!TC.start(r.n, r.seed)) { toast('Không dựng được bảng. Hãy thử lại.'); leave(true).then(function () { TC.leave(); }); return; }
    on.N = r.n;
    renderDuel();
    if (first) intro(function () { countdown(); }); else countdown();
  }
  function intro(done) {
    var n = names();
    stage.innerHTML = '<div class="cap">ĐỐI ĐẦU</div><div class="vs"><div class="pl l"><div class="tcoT k">' + esc(Array.from(n.me)[0].toUpperCase()) + '</div><div class="pn">' + esc(n.me) + '</div><div class="pt">BẠN</div></div>' +
      '<div class="vsm">VS</div><div class="pl r"><div class="tcoT">' + esc(Array.from(n.opp)[0].toUpperCase()) + '</div><div class="pn">' + esc(n.opp) + '</div><div class="pt">ĐỐI THỦ</div></div></div>';
    stage.classList.add('on');
    on.stageT = setTimeout(done, reduced ? 1200 : 2300);
  }
  function countdown() {
    var n = 3;
    stage.classList.add('on');
    function step() {
      if (!on.active || on.over) { stage.classList.remove('on'); return; }
      if (n > 0) {
        stage.innerHTML = '<div class="cap">SẴN SÀNG</div><div class="num"><div class="tcoT">' + n + '</div></div>';
        beep(660, .1);
        n--; on.stageT = setTimeout(step, 900);
      } else {
        stage.innerHTML = '<div class="cap">BẮT ĐẦU</div><div class="num"><div class="tcoT go">GIẢI!</div></div>';
        beep(990, .22);
        on.playing = true; TC.begin();
        on.stageT = setTimeout(function () { stage.classList.remove('on'); try { $('ans').focus({ preventScroll: true }); } catch (e) {} }, 600);
      }
    }
    step();
  }
  var ac = null;
  function beep(f, d) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.14, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + d + .1);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + .12);
    } catch (e) {}
  }

  // tiến độ và kết thúc từ game
  TC.setHooks({
    progress: function (n) {
      if (!on.active || !on.started || on.over) return;
      renderDuel();
      clearTimeout(on.sendT);
      on.sendT = setTimeout(function () { http('PUT', ROOMS + on.code + '/prog/' + on.round + '/' + on.role, { n: n }).catch(function () {}); }, 100);
    },
    finish: function (won) {
      if (!on.active || !won || on.over) return;
      http('PUT', ROOMS + on.code + '/win/' + on.round, { r: on.role }).catch(function () { /* đối thủ ghi thắng trước một chút: chờ dữ liệu về */ });
    }
  });

  function roundOver(winner) {
    on.over = true; on.playing = false;
    clearTimeout(on.stageT); stage.classList.remove('on');
    TC.end();
    var mine = winner === on.role;
    if (mine) { beep(784, .12); setTimeout(function () { beep(1175, .25); }, 140); } else { beep(300, .3); }
    try { if (navigator.vibrate) navigator.vibrate(mine ? [20, 40, 20] : 60); } catch (e) {}
    renderDuel();
    setTimeout(function () { showResult(mine ? 'win' : 'lose'); }, mine ? 450 : 800);
  }
  function showResult(kind) {
    if (!on.active) return;
    var n = names(), w = wins(), S = TC.state(), K = S && S.P && S.P.key;
    var word = kind === 'lose' ? 'THUA' : 'THẮNG';
    var why = kind === 'win' ? 'Bạn giải xong trước đối thủ.' : kind === 'lose' ? n.opp + ' đã giải xong trước.' : 'Đối thủ đã rời trận.';
    result.className = 'on' + (kind === 'lose' ? ' lose' : '');
    result.innerHTML = '<div class="bx"><div class="word">' + Array.from(word).map(function (c, i) { return '<div class="tcoT' + (kind !== 'lose' && i === 0 ? ' k' : '') + '" style="animation-delay:' + (i * 90) + 'ms">' + c + '</div>'; }).join('') + '</div>' +
      '<div class="why">' + esc(why) + '</div>' +
      (K ? '<div class="kw">Từ khóa</div><div class="kwv">' + esc(TC.norm(K.w)) + '</div><div class="kwd"><b style="color:var(--gold)">' + esc(K.lab) + '.</b> ' + esc(K.d) + '</div>' : '') +
      '<div class="tally"><div><b>' + w.me + '</b><small>' + esc(n.me) + '</small></div><span>:</span><div><b>' + w.opp + '</b><small>' + esc(n.opp) + '</small></div></div>' +
      '<div class="bt">' + (kind === 'forfeit' ? '' : '<button class="btn p" id="tcoAgain" type="button">Đấu lại</button>') +
      '<button class="btn" id="tcoOut" type="button">' + (kind === 'forfeit' ? 'Về menu' : 'Rời phòng') + '</button></div></div>';
    $('tcoOut').onclick = function () { if (on.forfeit || !on.started) { leave(true).then(function () { TC.leave(); }); } else askLeave(); };
    if ($('tcoAgain')) $('tcoAgain').onclick = function () {
      if (!on.active || on.forfeit) return;
      if (on.tree && on.tree.round && on.tree.round !== on.round) return;
      RM.ask();
    };
  }
  function hideResult() { result.className = ''; result.innerHTML = ''; }
  function setWaiting(w) { var b = $('tcoAgain'); if (b) { b.disabled = w; b.textContent = w ? 'Đang chờ...' : 'Đấu lại'; } }

  // Đấu lại: gửi lời thách đấu, đối thủ đồng ý mới sang ván mới (dùng chung thông báo thách đấu của các game online)
  var RM = Rematch.create({
    game: 'Tìm ô chữ', http: http, path: function () { return ROOMS + on.code; }, tree: function () { return on.tree; }, round: function () { return on.round; }, role: function () { return on.role; },
    oppName: function () { return names().opp; }, toast: toast,
    newRound: function () { return TC.pick(); },
    onWait: setWaiting
  });

  function opponentLeft() {
    if (on.forfeit) return;
    on.forfeit = true; on.over = true; on.playing = false;
    clearTimeout(on.stageT); stage.classList.remove('on');
    TC.end();
    beep(784, .12);
    renderDuel();
    showResult('forfeit');
  }

  /* ---------- thanh đối đầu ---------- */
  function lane(el, name, tag, n, total, wn, off) {
    var pips = '';
    for (var i = 0; i < total; i++) pips += '<i class="' + (i < n ? 'f' : '') + '"></i>';
    el.classList.toggle('off', !!off);
    el.innerHTML = '<div class="nm">' + esc(name) + '<small>' + tag + '</small></div><div class="pips">' + pips + '</div><div class="w">' + wn + '</div>';
  }
  function renderDuel() {
    if (!on.active || !on.started || !on.N) return;
    var n = names(), w = wins(), S = TC.state(), mine = S ? S.solved.filter(Boolean).length : 0;
    var op = on.tree && on.tree.prog && on.tree.prog[on.round] && on.tree.prog[on.round][oppRole()];
    var opN = op && typeof op.n === 'number' ? Math.min(op.n, on.N) : 0;
    lane($('tcoMe'), n.me, 'BẠN', mine, on.N, w.me, !on.connOk);
    lane($('tcoOp'), n.opp, on.forfeit ? 'ĐÃ RỜI' : 'ĐỐI THỦ', opN, on.N, w.opp, on.oppLost && !on.forfeit);
  }

  /* ---------- thoát ---------- */
  function openAsk() {
    var mid = on.started && !on.over && !on.forfeit;
    ask.innerHTML = '<div class="bx"><h3>Rời trận?</h3><p>' + (mid ? 'Ván đang chơi dở. Nếu rời đi, đối thủ sẽ thắng.' : 'Bạn sẽ rời khỏi phòng trực tuyến.') + '</p>' +
      '<div class="row"><button class="btn" id="tcoNo" type="button">Ở lại</button><button class="btn p" id="tcoYes" type="button">Rời đi</button></div></div>';
    ask.classList.add('on');
    $('tcoNo').onclick = function () { ask.classList.remove('on'); };
    $('tcoYes').onclick = function () { ask.classList.remove('on'); leave(true).then(function () { TC.leave(); }); };
  }
  function askLeave() { openAsk(); }
  leaveBtn.onclick = function () { if (on.active && on.started) askLeave(); };

  function resetOnline() {
    RM.reset();
    clearInterval(on.hb); clearInterval(on.watch); clearTimeout(on.stageT); clearTimeout(on.sendT);
    if (on.es) on.es.close();
    var snap = { code: on.code, role: on.role, active: on.active, started: on.started, tree: on.tree };
    on.active = false; on.code = null; on.role = null; on.es = null; on.tree = null; on.started = false; on.round = null; on.forfeit = false; on.over = false; on.playing = false; on.N = 0;
    stage.classList.remove('on'); hideResult(); ask.classList.remove('on');
    return snap;
  }
  function closeRoomSilently() {
    on.closing = true;
    var s = resetOnline();
    return (s.active && s.code) ? http('DELETE', ROOMS + s.code).catch(function () {}) : Promise.resolve();
  }
  // Chưa có đối thủ: xoá phòng. Đã vào trận: ghi "left" để người ở lại thắng; người ở lại xoá phòng khi thoát.
  function leave(toHome) {
    on.closing = true;
    var s = resetOnline();
    if (qm.on) qmStop(true);
    var job = Promise.resolve();
    if (s.active && s.code) {
      var oppLeft = s.tree && s.tree.left && s.tree.left !== s.role;
      job = (s.started && s.tree && s.tree.guest && !oppLeft) ? http('PUT', ROOMS + s.code + '/left', s.role) : http('DELETE', ROOMS + s.code);
      job = job.catch(function () {});
    }
    return job.then(function () { if (toHome) showHome(); });
  }

  window.TOC = {
    active: function () { return on.active && on.started; },
    back: function () { if (on.active && on.started) askLeave(); },
    leave: leave
  };

  // Quay lại từ nền / mạng chập chờn: đừng coi đối thủ là "im lặng quá lâu"; luồng đã đóng thì nối lại.
  function resumeOnline() {
    if (document.visibilityState === 'hidden' || !on.active || on.closing) return;
    on.oppSeenAt = Date.now();
    try { if (on.es && on.es.readyState === 2 && on.code) startStream(); } catch (e) {}
  }
  ['visibilitychange', 'pageshow', 'online', 'focus'].forEach(function (t) { window.addEventListener(t, resumeOnline); });
  window.addEventListener('pagehide', function (e) {
    if (e && e.persisted) return;
    function ka(method, path, body) { try { fetch(DB + path + '.json', { method: method, body: body === undefined ? undefined : JSON.stringify(body), keepalive: true }); } catch (x) {} }
    if (qm.on && qm.id) ka('DELETE', QUEUE + qm.id);
    if (!on.active || !on.code) return;
    var t = on.tree;
    if (on.started && t && t.guest && !(t.left && t.left !== on.role)) ka('PUT', ROOMS + on.code + '/left', on.role);
    else ka('DELETE', ROOMS + on.code);
  });
})();
