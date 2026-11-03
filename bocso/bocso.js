/* =========================================================
   BỐC SỐ ONLINE — phòng tối đa 10 người, rải X phiếu (X = số người), ai nhanh tay chọn trước thì được.
   Firebase Realtime Database qua REST + EventSource (giống Cờ Caro / Bida online).

   /bocso/{MÃ}
     created            : thời điểm tạo phòng (giờ máy chủ)
     p/{ô 0–9}          : { id, name, at, seen }  người trong phòng (10 ô = tối đa 10 người). `at` = lúc vào (giờ máy chủ), `seen` = nhịp tim.
                          Ô của người rớt mạng quá 40 giây thì người mới được vào thế chỗ. Chủ phòng = người VÀO TRƯỚC (at nhỏ nhất) trong số những người còn "sống".
     go                 : { t, n, lay, by }   ván đang chơi: n phiếu, lay = "x,y,góc;..." (x,y theo ‰ bàn), by = chủ phòng. Ghi một lần.
     claims/{i}         : { id, name }        phiếu số i đã có chủ. Ghi một lần  → ai ghi trước thì được.
     picks/{id}         : i                   người chơi đã chọn phiếu nào (mỗi người một phiếu). Ghi cùng claims trong một lần ghi nguyên tử.
   Số trên phiếu (2 chữ cái + 18–26 + 6 chữ số) do máy người chọn tự sinh và CHỈ lưu ở máy đó: không ai thấy trước khi cào.
   Game không tính "nút", không phân thắng thua: kết quả phân xử ngoài đời.
   ========================================================= */
(function () {
  'use strict';
  var DB = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  var MAX = 10, FRESH_MS = 35000, BEAT_MS = 10000, OPEN_MS = 20 * 60000;
  var COLORS = ['#ff6b6b', '#4dd4ff', '#ffd24d', '#7be07b', '#c58bff', '#ff9f45', '#ff7ac8', '#5eead4', '#a3b8ff', '#e6e6e6'];
  var LS = { room: 'bocso_room', tk: 'bocso_tk' };

  var $ = function (id) { return document.getElementById(id); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function reduced() { return window.FX && FX.reduced(); }

  var uid = Scores.getUid();
  function myName() { return (Scores.getName() || 'Người chơi').replace(/[<>"'`\\]/g, '').slice(0, 20) || 'Người chơi'; }

  /* ---------- REST ---------- */
  function api(method, path, body) {
    var q = path.indexOf('?'), url = DB + (q < 0 ? path : path.slice(0, q)) + '.json' + (q < 0 ? '' : path.slice(q));
    return fetch(url, { method: method, body: body === undefined ? undefined : JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return { ok: r.ok, status: r.status, d: d }; }); })
      .catch(function () { return { ok: false, status: 0, d: null }; });
  }
  var off = 0, offOk = false;
  function now() { return Date.now() + off; }
  function syncTime() {
    var t0 = Date.now();
    return api('PUT', '/bocso_t/' + uid, { '.sv': 'timestamp' }).then(function (r) {
      if (r.ok && typeof r.d === 'number') { off = r.d - (t0 + Date.now()) / 2; offOk = true; }
    });
  }

  /* ---------- trạng thái ---------- */
  var S = { code: null, room: null, es: null, beat: null, tick: null, poll: null, board: null, boardT: 0, busy: false, picking: false, leaving: false };
  var tk = null;            // phiếu của tôi { code, t, i, no }

  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }
  function show(id) {
    ['vMenu', 'vRoom', 'vTable'].forEach(function (v) { $(v).classList.toggle('on', v === id); });
  }

  /* ---------- người chơi ---------- */
  function fresh(p) { return p && typeof p.seen === 'number' && now() - p.seen < FRESH_MS; }
  function players() {   // người còn "sống", theo thứ tự vào phòng
    var p = (S.room && S.room.p) || {}, a = [];
    Object.keys(p).forEach(function (s) { var e = p[s]; if (e && (e.id === uid || fresh(e))) a.push({ id: e.id, name: e.name, at: e.at || 0, slot: s }); });
    a.sort(function (x, y) { return x.at - y.at || (x.id < y.id ? -1 : 1); });
    return a;
  }
  function colorOf(id) {      // màu theo thứ tự vào phòng trong toàn bộ danh sách (ổn định cả khi có người rớt)
    var p = (S.room && S.room.p) || {}, a = Object.keys(p).map(function (s) { return p[s]; }).filter(Boolean).sort(function (x, y) { return (x.at || 0) - (y.at || 0) || (x.id < y.id ? -1 : 1); }).map(function (e) { return e.id; });
    var k = a.indexOf(id); return COLORS[(k < 0 ? 0 : k) % COLORS.length];
  }
  function hostId() { var a = players(); return a.length ? a[0].id : null; }
  function isHost() { return hostId() === uid; }

  /* ---------- tạo / vào phòng ---------- */
  function newCode() { var c = ''; for (var i = 0; i < 5; i++) c += ALPHA[rnd(ALPHA.length)]; return c; }
  function slotOf(p, id) { p = p || {}; var k = Object.keys(p).filter(function (s) { return p[s] && p[s].id === id; })[0]; return k == null ? null : k; }
  function meEntry() { return { id: uid, name: myName(), at: { '.sv': 'timestamp' }, seen: { '.sv': 'timestamp' } }; }

  function openRooms() {     // phòng chưa bắt đầu, còn chỗ, còn người sống
    return api('GET', '/bocso?orderBy=%22created%22&startAt=' + Math.floor(now() - OPEN_MS)).then(function (r) {
      var out = [], rooms = (r.ok && r.d) || {};
      Object.keys(rooms).forEach(function (c) {
        var m = rooms[c]; if (!CODE_RE.test(c) || !m || m.go) return;
        var live = Object.keys(m.p || {}).filter(function (s) { return fresh(m.p[s]); });
        if (!live.length) { if (now() - (m.created || 0) > 120000) api('DELETE', '/bocso/' + c); return; }   // phòng bỏ hoang: dọn
        if (live.length >= MAX && slotOf(m.p, uid) == null) return;
        out.push({ code: c, created: m.created || 0, n: live.length });
      });
      out.sort(function (a, b) { return b.n - a.n || a.created - b.created; });   // ưu tiên phòng đông hơn rồi phòng cũ hơn
      return out;
    });
  }
  function joinRoom(code) {
    return api('GET', '/bocso/' + code).then(function (r) {
      var m = r.d; if (!r.ok || !m) return false;
      var p = m.p || {}, mine = slotOf(p, uid);
      if (mine != null) return api('PATCH', '/bocso/' + code + '/p/' + mine, { seen: { '.sv': 'timestamp' } }).then(function (r2) { return r2.ok; });   // vào lại
      if (m.go) return false;
      var free = null;
      for (var s = 0; s < MAX && free == null; s++) if (!p[s] || !fresh(p[s])) free = s;   // ô trống hoặc ô của người đã rớt mạng
      if (free == null) return false;
      var body = {}; body['p/' + free] = meEntry();
      return api('PATCH', '/bocso/' + code, body).then(function (r2) { return r2.ok; });
    });
  }
  function createRoom(tries) {
    var code = newCode();
    return api('PUT', '/bocso/' + code, { created: { '.sv': 'timestamp' }, p: { 0: meEntry() } }).then(function (r) {
      if (r.ok) return code;
      return (tries || 0) < 4 ? createRoom((tries || 0) + 1) : null;
    });
  }

  function quick() {
    if (S.busy) return; S.busy = true; setMenuBusy(true);
    ensureName().then(syncTime).then(openRooms).then(function (list) {
      var i = 0;
      function next() {
        if (i >= list.length) return create();
        var c = list[i++].code;
        return joinRoom(c).then(function (ok) { return ok ? enter(c) : next(); });
      }
      function create() {
        return createRoom().then(function (code) {
          if (!code) { toast('Không tạo được phòng. Kiểm tra mạng rồi thử lại.'); return; }
          enter(code, true);
        });
      }
      return next();
    }).then(function () { S.busy = false; setMenuBusy(false); }, function () { S.busy = false; setMenuBusy(false); });
  }
  function joinByCode() {
    var code = $('inCode').value.trim().toUpperCase();
    if (!CODE_RE.test(code)) { toast('Mã phòng gồm 5 ký tự'); FX.shake($('inCode')); return; }
    if (S.busy) return; S.busy = true; setMenuBusy(true);
    ensureName().then(syncTime).then(function () { return api('GET', '/bocso/' + code); }).then(function (r) {
      var m = r.d;
      if (!r.ok || !m) { toast('Không tìm thấy phòng ' + code); return; }
      var mine = slotOf(m.p, uid) != null;
      if (m.go && !mine) { toast('Phòng này đã bắt đầu rồi'); return; }
      var live = Object.keys(m.p || {}).filter(function (s) { return fresh(m.p[s]); });
      if (!mine && live.length >= MAX) { toast('Phòng đã đủ ' + MAX + ' người'); return; }
      return joinRoom(code).then(function (ok) { if (ok) enter(code); else toast('Không vào được phòng'); });
    }).then(function () { S.busy = false; setMenuBusy(false); }, function () { S.busy = false; setMenuBusy(false); });
  }
  function setMenuBusy(b) { $('btnQuick').disabled = b; $('btnJoin').disabled = b; }
  function ensureName() {
    if (Scores.hasName && Scores.hasName()) return Promise.resolve();
    return Scores.askName({ required: false }).then(function () { refreshMe(); });
  }
  function refreshMe() { $('meName').textContent = myName(); }

  /* ---------- đồng bộ phòng ---------- */
  function setPath(root, path, val) {
    var parts = path.split('/').filter(Boolean);
    if (!parts.length) return val;
    root = root && typeof root === 'object' ? root : {};
    var o = root;
    for (var i = 0; i < parts.length - 1; i++) { if (!o[parts[i]] || typeof o[parts[i]] !== 'object') o[parts[i]] = {}; o = o[parts[i]]; }
    var k = parts[parts.length - 1];
    if (val === null || val === undefined) delete o[k]; else o[k] = val;
    return root;
  }
  function onEvent(type, e) {
    var m; try { m = JSON.parse(e.data); } catch (x) { return; }
    if (!m) return;
    if (type === 'put') S.room = setPath(S.room, m.path, m.data);
    else if (m.data) Object.keys(m.data).forEach(function (k) { S.room = setPath(S.room, m.path + '/' + k, m.data[k]); });
    schedule();
  }
  function connect() {
    closeES();
    var es = new EventSource(DB + '/bocso/' + S.code + '.json');
    es.addEventListener('put', function (e) { onEvent('put', e); });
    es.addEventListener('patch', function (e) { onEvent('patch', e); });
    es.addEventListener('cancel', function () { closeES(); setTimeout(function () { if (S.code) connect(); }, 2000); });
    S.es = es;
  }
  function closeES() { if (S.es) { try { S.es.close(); } catch (e) {} S.es = null; } }
  var raf = 0;
  function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; render(); }); }

  function enter(code, created) {
    S.code = code; S.room = null; S.leaving = false; S.board = null; S.boardT = 0; tk = null;
    lsSet(LS.room, code);
    S.heardOnce = false;
    connect();
    clearInterval(S.beat); S.beat = setInterval(heartbeat, BEAT_MS);
    clearInterval(S.tick); S.tick = setInterval(schedule, 1000);
    clearInterval(S.poll); S.poll = setInterval(resync, 6000);
    $('roomCode').textContent = code; $('tCode').textContent = code;
    show('vRoom');
    $('slots').innerHTML = ''; S.slotKey = '';
    if (created) setTimeout(mergeSmall, 1600);
    return Promise.resolve();
  }
  function heartbeat() {
    if (!S.code) return;
    var slot = S.room ? slotOf(S.room.p, uid) : null;
    if (slot == null) { if (S.room && !S.room.go) joinRoom(S.code); return; }   // ô của mình bị thế chỗ (ngủ máy quá lâu): vào lại nếu còn chỗ
    api('PATCH', '/bocso/' + S.code + '/p/' + slot, { seen: { '.sv': 'timestamp' } }).then(function (r) { if (!r.ok && S.room && !S.room.go) joinRoom(S.code); });
  }
  function resync() {
    if (!S.code) return;
    api('GET', '/bocso/' + S.code).then(function (r) { if (r.ok && S.code) { S.room = r.d; schedule(); } });
  }
  // Hai người cùng lúc tạo hai phòng: người tạo sau (khi đang đơn độc) dọn qua phòng cũ hơn để không ai ngồi chờ một mình
  function mergeSmall() {
    if (!S.code || !S.room || S.room.go) return;
    if (players().length > 1) return;
    var mine = S.code, myCreated = S.room.created || 0;
    openRooms().then(function (list) {
      var other = list.filter(function (x) { return x.code !== mine && x.n < MAX && (x.created < myCreated || (x.created === myCreated && x.code < mine)); })[0];
      if (!other || !S.code || S.code !== mine || players().length > 1) return;
      joinRoom(other.code).then(function (ok) {
        if (!ok) return;
        api('DELETE', '/bocso/' + mine);
        leaveLocal(); enter(other.code);
      });
    });
  }

  function leaveLocal() {
    closeES(); clearInterval(S.beat); clearInterval(S.tick); clearInterval(S.poll);
    S.code = null; S.room = null; S.board = null; S.boardT = 0; tk = null; lsSet(LS.room, null); lsSet(LS.tk, null);
    $('big').classList.remove('on'); $('board').innerHTML = '';
  }
  function leave() {
    if (!S.code || S.leaving) return; S.leaving = true;
    var code = S.code, alone = players().filter(function (p) { return p.id !== uid; }).length === 0, slot = S.room ? slotOf(S.room.p, uid) : null;
    if (alone) api('DELETE', '/bocso/' + code);
    else if (slot != null) api('DELETE', '/bocso/' + code + '/p/' + slot);
    leaveLocal(); show('vMenu'); S.leaving = false;
  }

  /* ---------- hiển thị ---------- */
  function render() {
    if (!S.code) return;
    if (S.room === null) {   // chưa nhận gì hoặc phòng bị xoá
      if (S.heardOnce) { toast('Phòng đã đóng'); leaveLocal(); show('vMenu'); }
      return;
    }
    S.heardOnce = true;
    var go = S.room.go;
    if (go) { if ($('vTable').classList.contains('on') === false) show('vTable'); renderTable(go); }
    else {
      if (S.boardT) { resetTableLocal(); }
      if ($('vRoom').classList.contains('on') === false) show('vRoom');
      renderRoom();
    }
  }
  function crownSvg() { return '<svg class="crown" viewBox="0 0 20 14"><path d="M1 12 L2.5 3 L7 7.5 L10 1 L13 7.5 L17.5 3 L19 12 Z" fill="#f2c14e" stroke="#8a5a00" stroke-width="1"/></svg>'; }
  function renderRoom() {
    var a = players(), h = hostId();
    $('roomCount').textContent = a.length + '/' + MAX + ' người';
    var key = a.map(function (p) { return p.id + p.name; }).join('|') + '|' + h;
    if (key !== S.slotKey) {
      var old = {}; (S.slotKey || '').split('|').forEach(function (s) { old[s] = 1; });
      var html = '';
      for (var i = 0; i < MAX; i++) {
        var p = a[i];
        if (!p) { html += '<div class="slot empty">Trống</div>'; continue; }
        var isNew = !old[p.id + p.name];
        html += '<div class="slot' + (isNew ? ' in' : '') + '"><div class="av" style="--c:' + colorOf(p.id) + '">' + (p.id === h ? crownSvg() : '') + esc(p.name.charAt(0).toUpperCase()) + '</div>' +
          '<div class="nm">' + esc(p.name) + '<small>' + (p.id === h ? 'Chủ phòng' : '') + (p.id === uid ? (p.id === h ? ' · Bạn' : 'Bạn') : '') + '</small></div></div>';
      }
      $('slots').innerHTML = html; S.slotKey = key;
    }
    var host = isHost();
    $('btnStart').style.display = host ? '' : 'none';
    $('btnStart').disabled = a.length < 2;
    var hn = a.filter(function (p) { return p.id === h; })[0];
    $('roomHint').innerHTML = host ? (a.length < 2 ? 'Cần ít nhất 2 người để bắt đầu' : 'Bạn vào trước nên bạn bấm Bắt đầu — sẽ rải <b>' + a.length + '</b> phiếu')
      : 'Đợi <b>' + esc(hn ? hn.name : 'chủ phòng') + '</b> bấm Bắt đầu<span class="dots"></span>';
  }

  /* ---------- bắt đầu / ván mới ---------- */
  function makeLayout(n) {
    // rải n điểm trên bàn (toạ độ ‰; bàn tỉ lệ 3:4), cách nhau đủ xa để phiếu không đè nhau, góc nghiêng ngẫu nhiên
    for (var attempt = 0; attempt < 80; attempt++) {
      var minD = 88 - attempt * .3, pts = [], ok = true;
      for (var i = 0; i < n && ok; i++) {
        var placed = false;
        for (var k = 0; k < 120 && !placed; k++) {
          var x = 160 + rnd(681), y = 125 + rnd(751);
          if (pts.every(function (q) { var dx = (x - q.x) * .3, dy = (y - q.y) * .4; return Math.sqrt(dx * dx + dy * dy) > minD; })) { pts.push({ x: x, y: y, r: rnd(61) - 30 }); placed = true; }
        }
        if (!placed) ok = false;
      }
      if (ok) return pts.map(function (p) { return p.x + ',' + p.y + ',' + p.r; }).join(';');
    }
    var g = []; for (var j = 0; j < n; j++) g.push((j % 2 ? 680 : 320) + ',' + (110 + Math.floor(j / 2) * 170 + (j % 2 ? 50 : 0)) + ',' + (rnd(41) - 20));
    return g.join(';');
  }
  function start() {
    if (!isHost()) return;
    var a = players(); if (a.length < 2) return;
    var live = {}; a.forEach(function (p) { live[p.slot] = 1; });
    var body = {};
    Object.keys(S.room.p || {}).forEach(function (s) { if (!live[s]) body['p/' + s] = null; });   // dọn người đã rớt mạng
    body.go = { t: { '.sv': 'timestamp' }, n: a.length, lay: makeLayout(a.length), by: uid };
    $('btnStart').disabled = true;
    api('PATCH', '/bocso/' + S.code, body).then(function (r) {
      if (!r.ok) { toast('Chưa bắt đầu được, thử lại nhé'); $('btnStart').disabled = false; }
    });
  }
  function newRound() {
    if (!isHost()) return;
    api('PATCH', '/bocso/' + S.code, { go: null, claims: null, picks: null });
  }
  function resetTableLocal() {
    S.board = null; S.boardT = 0; tk = null; lsSet(LS.tk, null); S.picking = false;
    $('board').innerHTML = ''; $('big').classList.remove('on'); closeBigState();
  }

  /* ---------- bàn chơi ---------- */
  function parseLay(s) { return String(s).split(';').map(function (p) { var q = p.split(',').map(Number); return { x: q[0], y: q[1], r: q[2] }; }); }
  function renderTable(go) {
    var board = $('board'); fitBoard();
    if (S.boardT !== go.t) {      // ván mới: rải phiếu
      S.boardT = go.t; board.innerHTML = ''; S.board = [];
      closeBigState(); tk = null;
      var saved; try { saved = JSON.parse(lsGet(LS.tk)); } catch (e) { saved = null; }
      if (saved && saved.code === S.code && saved.t === go.t) tk = saved;
      var lay = parseLay(go.lay);
      lay.forEach(function (p, i) {
        var d = document.createElement('div');
        d.className = 'tk free'; d.dataset.i = i; d.style.left = p.x / 10 + '%'; d.style.top = p.y / 10 + '%'; d.style.setProperty('--r', p.r + 'deg');
        d.innerHTML = '<div class="q">?</div><div class="own"></div>';
        d.addEventListener('pointerdown', function (ev) { ev.preventDefault(); pick(i); });
        board.appendChild(d); S.board.push(d);
        if (d.animate && !reduced()) {      // ném phiếu xuống bàn từ phía trên, lần lượt
          var side = (i % 2 ? 1 : -1);
          d.animate([
            { transform: 'translate(calc(-50% + ' + side * 160 + 'px),-420%) rotate(' + (p.r + side * 260) + 'deg) scale(1.5)', opacity: 0 },
            { opacity: 1, offset: .25 },
            { transform: 'translate(-50%,-50%) rotate(' + p.r + 'deg) scale(1)', opacity: 1 }
          ], { duration: 620, delay: i * 90, easing: 'cubic-bezier(.2,.9,.3,1.15)', fill: 'backwards' });
          setTimeout(function () { var c = FX.center(d); FX.burst(c.x, c.y, { n: 5, colors: ['#fff3d3', '#f2c14e'], speed: 90, gravity: 200, size: 4, life: .45, shape: 'square' }); }, 560 + i * 90);
        }
      });
      lockUntil = Date.now() + 620 + lay.length * 90 - 200;
    }
    var claims = S.room.claims || {}, picks = S.room.picks || {}, a = players();
    // phiếu có chủ
    S.board.forEach(function (d, i) {
      var c = claims[i], was = d.classList.contains('taken');
      d.classList.toggle('taken', !!c); d.classList.toggle('free', !c);
      d.classList.toggle('mine', !!c && c.id === uid);
      if (c) {
        d.style.setProperty('--c', colorOf(c.id));
        d.querySelector('.own').textContent = c.name;
        if (!was && c.id !== uid) { var ce = FX.center(d); FX.ring(ce.x, ce.y, colorOf(c.id), 46, 3); if (d.animate && !reduced()) d.animate([{ scale: 1.18 }, { scale: 1 }], { duration: 260, easing: 'ease-out' }); }
      }
    });
    // phiếu của tôi (từ máy chủ)
    if (picks[uid] != null && !tk) {
      var i0 = Number(picks[uid]);
      tk = { code: S.code, t: go.t, i: i0, no: makeNo() }; lsSet(LS.tk, JSON.stringify(tk));
      buildBig();
    } else if (tk && !bigBuilt) buildBig();
    // dải người chơi
    var strip = $('strip'), html = '';
    var ids = {}; a.forEach(function (p) { ids[p.id] = 1; });
    Object.keys(picks).forEach(function (id) { if (!ids[id] && S.room.claims && S.room.claims[picks[id]]) { ids[id] = 1; a.push({ id: id, name: S.room.claims[picks[id]].name, at: 0 }); } });
    a.forEach(function (p) {
      var got = picks[p.id] != null;
      html += '<div class="chip' + (got ? ' got' : '') + (p.id === uid ? ' me' : '') + '" style="--c:' + colorOf(p.id) + '"><div class="av" style="--c:' + colorOf(p.id) + '">' + esc(p.name.charAt(0).toUpperCase()) + '</div><span class="cn">' + esc(p.name) + '</span><span class="ok">✓</span></div>';
    });
    if (strip.dataset.k !== html) { strip.innerHTML = html; strip.dataset.k = html; }
    var left = go.n - Object.keys(picks).length, mine = tk != null;
    $('board').classList.toggle('locked', mine || Date.now() < lockUntil);
    $('btnMine').style.display = mine ? '' : 'none';
    $('btnNew').style.display = isHost() && left <= 0 ? '' : 'none';
    $('tNote').innerHTML = mine ? (left > 0 ? 'Bạn đã có phiếu. Còn <b>' + left + '</b> người chưa chọn.' : 'Mọi người đã chọn xong. Cào, so số và phân xử ngoài đời nhé!') + '<br>Tự đếm nút nhé — game không đếm giùm.'
      : (left > 0 ? 'Nhanh tay chọn một phiếu! Còn <b>' + left + '</b> phiếu trống.' : 'Hết phiếu mất rồi.');
  }
  var lockUntil = 0;
  function fitBoard() {
    var w = $('board').parentNode; if (!w.clientWidth) return;
    var size = Math.floor(Math.min(w.clientWidth, w.clientHeight * 0.75));
    $('board').style.width = size + 'px'; $('board').style.height = Math.round(size / 0.75) + 'px';
  }

  function pick(i) {
    if (tk || S.picking || Date.now() < lockUntil || !S.room || !S.room.go) return;
    var c = S.room.claims && S.room.claims[i];
    var d = S.board[i];
    if (c) { if (d.animate && !reduced()) d.animate([{ translate: '0 0' }, { translate: '-4px 0' }, { translate: '4px 0' }, { translate: '0 0' }], { duration: 200 }); return; }
    S.picking = true;
    var body = {}; body['claims/' + i] = { id: uid, name: myName() }; body['picks/' + uid] = i;
    // chọn ngay trên màn hình mình để có cảm giác tức thì; máy chủ sẽ xác nhận ai nhanh hơn
    d.classList.add('mine'); d.classList.remove('free');
    api('PATCH', '/bocso/' + S.code, body).then(function (r) {
      S.picking = false;
      if (r.ok) {
        if (!tk) { tk = { code: S.code, t: S.room.go.t, i: i, no: makeNo() }; lsSet(LS.tk, JSON.stringify(tk)); }
        if (!S.room.claims) S.room.claims = {};
        S.room.claims[i] = { id: uid, name: myName() }; if (!S.room.picks) S.room.picks = {}; S.room.picks[uid] = i;
        d.querySelector('.own').textContent = myName(); d.classList.add('taken'); d.style.setProperty('--c', colorOf(uid));
        if (bigBuilt) openBig(d, true); else buildBig(d, true);
        schedule();
      } else {
        d.classList.remove('mine'); if (!(S.room.claims && S.room.claims[i])) d.classList.add('free');
        toast(r.status === 0 ? 'Mất kết nối, thử lại nhé' : 'Chậm một nhịp! Phiếu đó có người lấy rồi');
        FX.shake($('board'), 5, 260); resync();
      }
    });
  }

  /* ---------- số trên phiếu ---------- */
  function makeNo() {
    var L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', s = L[rnd(26)] + L[rnd(26)] + ' ', first = 18 + rnd(9);
    s += first; for (var i = 0; i < 6; i++) s += rnd(10);
    return s;
  }

  /* ---------- phiếu to + lớp bạc ---------- */
  var bigBuilt = false, scr = null;
  function closeBigState() { bigBuilt = false; scr = null; }
  function buildBig(fromEl, animate) {
    if (!tk) return;
    bigBuilt = true;
    var no = tk.no.split(' ');
    $('btNo').innerHTML = '<span>' + no[0] + '</span>' + no[1];
    $('btOwner').textContent = myName();
    $('bigWho').textContent = myName();
    $('bt').classList.remove('shine');
    openBig(fromEl, animate);
  }
  function openBig(fromEl, animate) {
    var big = $('big'), bt = $('bt');
    big.classList.add('on');
    if (!scr) initScratch();
    if (animate && fromEl && bt.animate && !reduced()) {
      var a = fromEl.getBoundingClientRect(), b = bt.getBoundingClientRect();
      var dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2), k = a.width / b.width;
      var r = parseFloat(fromEl.style.getPropertyValue('--r')) || 0;
      bt.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + r + 'deg) scale(' + k + ')' }, { transform: 'translate(0,0) rotate(0) scale(1.06)', offset: .75 }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)' });
      big.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
      setTimeout(function () { var c = FX.center(bt); FX.burst(c.x, c.y, { n: 22, colors: ['#f2c14e', '#fff3d3', '#ff6b6b'], speed: 300, gravity: 420, size: 6, life: .9, shapes: ['star', 'square'] }); FX.ring(c.x, c.y, '#f2c14e', 150, 5); }, 450);
    }
  }
  function hideBig() { $('big').classList.remove('on'); }

  /* --- lớp bạc --- */
  function initScratch() {
    var cv = $('foil'), zone = cv.parentNode, bt = $('bt');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.round(zone.clientWidth || 300), h = Math.round(zone.clientHeight || 80);
    if (!zone.clientWidth) { requestAnimationFrame(initScratch); return; }
    cv.width = w * dpr; cv.height = h * dpr;
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawFoil(c, w, h);
    var fl = $('flakes'); fl.width = bt.clientWidth * dpr; fl.height = bt.clientHeight * dpr;
    var fc = fl.getContext('2d'); fc.setTransform(dpr, 0, 0, dpr, 0, 0);
    scr = { c: c, w: w, h: h, dpr: dpr, last: null, acc: 0, fc: fc, flakes: 0, cleared: false, down: false, checkT: 0, bw: bt.clientWidth, bh: bt.clientHeight };
    cv.onpointerdown = function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} audioInit(); scr.down = true; scr.last = pos(e); scratchAt(scr.last, scr.last); };
    cv.onpointermove = function (e) { if (!scr.down) return; e.preventDefault(); var p = pos(e); scratchAt(scr.last, p); scr.last = p; };
    var up = function () { scr.down = false; scr.last = null; audioStop(); queueCheck(); };
    cv.onpointerup = up; cv.onpointercancel = up; cv.onlostpointercapture = up;
  }
  function pos(e) { var r = $('foil').getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, px: e.clientX, py: e.clientY }; }
  function drawFoil(c, w, h) {
    var g = c.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#9fa8b4'); g.addColorStop(.18, '#eef1f4'); g.addColorStop(.36, '#b4bcc7'); g.addColorStop(.55, '#f7f9fb'); g.addColorStop(.75, '#a5adb9'); g.addColorStop(1, '#dde2e8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // vân kim loại xước ngang mịn
    for (var y = 0; y < h; y += 2) { c.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '70,80,95') + ',' + (Math.random() * .1).toFixed(3) + ')'; c.fillRect(0, y, w, 1); }
    // hạt nhũ
    for (var i = 0; i < w * h / 14; i++) { c.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '60,70,85') + ',' + (Math.random() * .25).toFixed(3) + ')'; c.fillRect(Math.random() * w, Math.random() * h, 1.4, 1.4); }
    // hoa văn chìm
    c.save(); c.fillStyle = 'rgba(70,82,98,.28)'; c.font = '800 ' + Math.round(h * .26) + 'px "Be Vietnam Pro",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.translate(w / 2, h / 2); c.rotate(-.06); c.fillText('★ CÀO TẠI ĐÂY ★', 0, 0); c.restore();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
    c.strokeStyle = 'rgba(60,70,85,.35)'; c.lineWidth = 1; c.strokeRect(3.5, 3.5, w - 7, h - 7);
  }
  function scratchAt(a, b) {
    var c = scr.c, dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy), steps = Math.max(1, Math.ceil(dist / 3));
    c.globalCompositeOperation = 'destination-out';
    var R = Math.max(11, scr.h * .2);
    for (var i = 0; i <= steps; i++) {
      var x = a.x + dx * i / steps, y = a.y + dy * i / steps;
      c.beginPath(); c.arc(x, y, R * (.85 + Math.random() * .3), 0, 6.2832); c.fill();
      if (Math.random() < .5) { var ox = (Math.random() - .5) * R * 2.2, oy = (Math.random() - .5) * R * 2.2; c.beginPath(); c.arc(x + ox, y + oy, 2 + Math.random() * 4, 0, 6.2832); c.fill(); }   // mép xước lởm chởm
    }
    c.globalCompositeOperation = 'source-over';
    // vụn bạc
    scr.acc += dist;
    var r = $('foil').getBoundingClientRect(), ang = Math.atan2(-dy, -dx);
    if (scr.acc > 7) {
      var n = Math.min(5, Math.floor(scr.acc / 7)); scr.acc = 0;
      FX.burst(b.px, b.py, { n: n, colors: ['#f4f6f8', '#cfd5dc', '#aeb7c2', '#ffffff', '#8f99a6'], shapes: ['square', 'tri'], size: 3.4, speed: 120, spread: 2.2, angle: ang - 0.3, gravity: 950, drag: 1.1, life: .75 });
      dropFlakes(b.x + r.left - $('bt').getBoundingClientRect().left, b.y + r.top - $('bt').getBoundingClientRect().top, n);
    }
    audioMove(dist);
    clearTimeout(scr.checkT); scr.checkT = setTimeout(queueCheck, 350);
  }
  function dropFlakes(x, y, n) {     // vụn bạc rơi xuống và nằm lại trên phiếu giấy
    if (scr.flakes > 160) return;
    setTimeout(function () {
      if (!scr) return;
      var fc = scr.fc;
      for (var i = 0; i < n; i++) {
        var fx = x + (Math.random() - .5) * 30, fy = Math.min(scr.bh - 8, y + 18 + Math.random() * 70);
        var s = 1.5 + Math.random() * 2.6, rot = Math.random() * 3.14;
        fc.save(); fc.translate(fx, fy); fc.rotate(rot);
        fc.fillStyle = Math.random() < .5 ? '#e9edf1' : '#aab3be'; fc.shadowColor = 'rgba(0,0,0,.35)'; fc.shadowBlur = 2; fc.shadowOffsetY = 1;
        fc.beginPath(); fc.moveTo(-s, -s * .5); fc.lineTo(s, -s * .8); fc.lineTo(s * .7, s * .6); fc.lineTo(-s * .6, s * .8); fc.closePath(); fc.fill(); fc.restore();
        scr.flakes++;
      }
    }, 280);
  }
  function queueCheck() {   // khi đã cào lộ gần hết vùng số: ánh sáng chúc mừng (không tính nút, không đọc giùm số)
    if (!scr || scr.cleared) return;
    var cv = $('foil'), c = scr.c, w = cv.width, h = cv.height, d;
    try { d = c.getImageData(0, 0, w, h).data; } catch (e) { return; }
    var tot = 0, clear = 0;
    for (var y = 0; y < h; y += 6) for (var x = 0; x < w; x += 6) { tot++; if (d[(y * w + x) * 4 + 3] < 40) clear++; }
    if (clear / tot > .62) {
      scr.cleared = true;
      var bt = $('bt'); bt.classList.add('shine');
      var ce = FX.center($('foil')); FX.burst(ce.x, ce.y, { n: 24, colors: ['#f2c14e', '#fff3d3', '#fff'], shapes: ['star', 'circle'], speed: 260, gravity: 200, size: 6, life: 1 }); FX.ring(ce.x, ce.y, '#f2c14e', 120, 4);
      c.globalCompositeOperation = 'destination-out';
      var step = 0; (function fade() { c.globalAlpha = .25; c.fillRect(0, 0, scr.w, scr.h); if (++step < 8) setTimeout(fade, 40); else { c.globalAlpha = 1; c.clearRect(0, 0, scr.w, scr.h); c.globalCompositeOperation = 'source-over'; } })();
    }
  }

  /* --- âm thanh cào (nhiễu lọc dải, chỉ khi đang kéo) --- */
  var au = null;
  function audioInit() {
    if (au) { if (au.ctx.state === 'suspended') au.ctx.resume(); return; }
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      var ctx = new Ctx(), len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = .9;
      var g = ctx.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start();
      au = { ctx: ctx, g: g, bp: bp, t: 0 };
    } catch (e) { au = null; }
  }
  function audioMove(dist) {
    if (!au) return;
    var v = Math.min(.16, dist * .012), t = au.ctx.currentTime;
    au.g.gain.cancelScheduledValues(t); au.g.gain.setTargetAtTime(v, t, .02); au.g.gain.setTargetAtTime(0, t + .06, .05);
    au.bp.frequency.setTargetAtTime(3200 + Math.random() * 2600, t, .02);
  }
  function audioStop() { if (au) { var t = au.ctx.currentTime; au.g.gain.cancelScheduledValues(t); au.g.gain.setTargetAtTime(0, t, .03); } }

  /* ---------- mời bạn ---------- */
  function share() {
    var url = location.origin + location.pathname.replace(/index\.html$/, '') + '?r=' + S.code;
    var text = 'Vào phòng Bốc số của mình nhé! Mã phòng: ' + S.code;
    if (navigator.share) { navigator.share({ title: 'Bốc số', text: text, url: url }).catch(function () {}); return; }
    var done = function () { toast('Đã chép liên kết phòng'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { toast(url); }); else toast(url);
  }

  /* ---------- sự kiện ---------- */
  $('btnQuick').onclick = quick;
  $('btnJoin').onclick = joinByCode;
  $('inCode').addEventListener('keydown', function (e) { if (e.key === 'Enter') joinByCode(); });
  $('inCode').addEventListener('input', function () { this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('btnRename').onclick = function () { Scores.askName({ required: false }).then(refreshMe); };
  $('btnLeave').onclick = leave; $('btnLeave2').onclick = leave;
  $('btnStart').onclick = start; $('btnNew').onclick = newRound; $('btnShare').onclick = share;
  $('btnMine').onclick = function () { openBig(); }; $('btnHide').onclick = hideBig;
  $('big').addEventListener('pointerdown', function (e) { if (e.target === this) hideBig(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.code) { heartbeat(); resync(); } });
  window.addEventListener('resize', function () { if ($('vTable').classList.contains('on')) fitBoard(); });

  /* ---------- khởi động ---------- */
  refreshMe();
  var q = (location.search.match(/[?&]r=([A-Za-z0-9]{5})/) || [])[1];
  if (q) $('inCode').value = q.toUpperCase();
  var saved = lsGet(LS.room);
  syncTime().then(function () {
    var code = saved && CODE_RE.test(saved) ? saved : null;
    if (!code) { if (q) joinByCode(); return; }
    return api('GET', '/bocso/' + code).then(function (r) {   // vào lại phòng cũ sau khi tải lại trang
      if (r.ok && r.d && slotOf(r.d.p, uid) != null) { api('PATCH', '/bocso/' + code + '/p/' + slotOf(r.d.p, uid), { seen: { '.sv': 'timestamp' } }); enter(code); }
      else { lsSet(LS.room, null); lsSet(LS.tk, null); if (q) joinByCode(); }
    });
  });
  window.__bocso = { S: S, get tk() { return tk; } };
})();
