/* =========================================================
   HẢI CHIẾN ONLINE (1 đấu 1) — ghép trận tự động như Bida online.
   Firebase Realtime Database qua REST + EventSource.

   Ghép trận: /haichien_queue/{id} = { name, seen, room? }
     Ai vào trước tạo phòng và ghi mã phòng vào mục của mình; người sau thấy phòng đang chờ thì vào làm khách.
     Hai người cùng tạo phòng một lúc: bên có id lớn hơn nhường phòng và vào phòng của bên kia.

   Phòng: /haichien_rooms/{MÃ}
     host, guest  : { id, name, seen }        first: bên bắn trước      left: bên đã thoát
     ready/{vai}  : mã băm SHA-256 của (bố trí + muối) — khoá bố trí trước trận, không lộ vị trí tàu
     ev/e{n}      : { t, u, p } chuỗi sự kiện ghi một lần
       shot {n,r,c}            người đến lượt bắn
       res  {n,r,c,k,s?,left}  máy bị bắn tự trả kết quả (k = miss | hit | sunk; s = tàu vừa chìm)
       to   {n}                hết 30 giây, mất lượt
       rev  {lay,salt}         hết trận: công khai bố trí để máy kia đối chiếu với mã băm
   Mỗi máy chỉ giữ bố trí của mình, nên đọc dữ liệu phòng cũng không thấy được tàu đối thủ.
   ========================================================= */
(function () {
  'use strict';
  const HC = window.HC, { shipCells, SFX } = HCArt;
  const $ = id => document.getElementById(id);
  const DB = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/;
  const N = HC.GRID;
  const SIZES = [5, 4, 3, 3, 2, 2];
  const SHIP_NAMES = ['Thiết Giáp Hạm', 'Tuần Dương Hạm', 'Khu Trục Hạm', 'Khu Trục Hạm', 'Tàu Hộ Tống', 'Tàu Hộ Tống'];
  const TURN_MS = 30000, GRACE_MS = 5000, PLACE_MS = 90000;
  const HEARTBEAT_MS = 12000, STALE_MS = 40000, FORFEIT_MS = 80000, QUEUE_FRESH_MS = 25000;
  const INTRO_MS = 2400;
  const BODY = HCArt.BODY;

  /* ---------- Mạng ---------- */
  async function http(method, path, body) {
    const res = await fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!res.ok) { const e = new Error('http_' + res.status); e.status = res.status; throw e; }
    return res.json();
  }
  const SV = { '.sv': 'timestamp' };
  const rndHex = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); };
  const rndId = () => rndHex(12);
  const genCode = () => { let s = ''; const a = new Uint8Array(5); crypto.getRandomValues(a); for (const b of a) s += ALPHA[b % ALPHA.length]; return s; };
  const myName = () => { try { const n = (localStorage.getItem('player_name') || '').trim(); if (n) return n.slice(0, 20); } catch (e) {} return 'Người chơi'; };
  const retryable = e => !e.status || e.status >= 500 || e.status === 429;
  const safeParse = s => { try { return JSON.parse(s); } catch (e) { return null; } };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let wq = Promise.resolve();
  function enqueue(fn) { const job = wq.then(fn); wq = job.catch(() => {}); return job; }
  async function putRetry(path, body) {
    for (let i = 0; i < 4; i++) {
      try { return await http('PUT', path, body); }
      catch (e) { if (!retryable(e) || i === 3) throw e; await new Promise(r => setTimeout(r, 400 * (i + 1))); }
    }
  }
  async function sha256(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {   // không có crypto.subtle (trang không bảo mật): băm dự phòng
      let h1 = 0x811c9dc5, h2 = 0x1234567;
      for (let i = 0; i < text.length; i++) { h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0; h2 = Math.imul(h2 + text.charCodeAt(i), 2654435761) >>> 0; }
      return (h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')).repeat(4);
    }
  }

  /* ---------- Trạng thái ---------- */
  const on = { active: false, code: null, role: null, id: null, es: null, tree: null, started: false, closing: false,
    applied: 0, wseq: 0, hb: null, watch: null, oppSeen: null, oppSeenAt: 0, connOk: true, forfeit: false, names: { me: 'Bạn', opp: 'Đối thủ' } };
  let B = null;
  function freshBattle() {
    return {
      phase: 'place',            // place | wait | battle | over
      my: randomLayout(), salt: rndHex(16), hash: null, sel: -1, drag: null, placeEnd: performance.now() + PLACE_MS,
      inc: new Map(),            // ô ta bị bắn (logic): key → miss | hit | sunk
      incShown: new Map(),       // đã hiện trên bàn ta
      mySunk: new Map(),         // chỉ số tàu ta đã chìm → thời điểm chìm (hiển thị)
      enemyShown: new Map(),     // ô đã bắn bên địch (hiển thị)
      enemyRes: new Map(),       // kết quả đối thủ báo (logic, để đối chiếu)
      enemySunk: [],             // tàu địch đã chìm { size, r, c, dir, sunkAt }
      oppLayout: null, oppCheat: false,
      n: 0, turn: 'host', tphase: 'aim', turnStart: 0, toSent: -1, sent: -1,
      anims: [], pending: [], aim: null,
      myShots: 0, myHits: 0, oppShots: 0, myLeft: SIZES.length, oppLeft: SIZES.length,
      winner: null, reason: '', revSent: false, endShown: false, manualView: 0
    };
  }

  /* ---------- Bố trí hạm đội ---------- */
  const inB = (r, c) => r >= 0 && c >= 0 && r < N && c < N;
  function cellsOf(s) { return shipCells(s); }
  function fitsIn(s) { return cellsOf(s).every(q => inB(q.r, q.c)); }
  function clampShip(s) {
    for (let i = 0; i < 2; i++) {
      const cs = cellsOf(s);
      let r0 = Math.min(...cs.map(q => q.r)), r1 = Math.max(...cs.map(q => q.r)), c0 = Math.min(...cs.map(q => q.c)), c1 = Math.max(...cs.map(q => q.c));
      if (r0 < 0) s.r -= r0; if (c0 < 0) s.c -= c0; if (r1 >= N) s.r -= r1 - N + 1; if (c1 >= N) s.c -= c1 - N + 1;
    }
  }
  function invalidSet(lay) {
    const bad = new Set(), occ = new Map();
    lay.forEach((s, i) => {
      if (!fitsIn(s)) bad.add(i);
      for (const q of cellsOf(s)) occ.set(q.r * N + q.c, i);
    });
    lay.forEach((s, i) => {
      for (const q of cellsOf(s)) for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const o = occ.get((q.r + dr) * N + (q.c + dc));
        if (o !== undefined && o !== i && inB(q.r + dr, q.c + dc)) { bad.add(i); bad.add(o); }
      }
    });
    return bad;
  }
  function randomLayout() {
    for (let tries = 0; tries < 200; tries++) {
      const lay = []; let ok = true;
      for (const size of SIZES) {
        let placed = false;
        for (let a = 0; a < 400 && !placed; a++) {
          const s = { size, dir: Math.floor(Math.random() * 4), r: Math.floor(Math.random() * N), c: Math.floor(Math.random() * N) };
          if (!fitsIn(s)) continue;
          lay.push(s);
          if (invalidSet(lay).size) lay.pop(); else placed = true;
        }
        if (!placed) { ok = false; break; }
      }
      if (ok) return lay;
    }
    return null;
  }
  function validLayout(lay) {
    if (!Array.isArray(lay) || lay.length !== SIZES.length) return false;
    for (let i = 0; i < SIZES.length; i++) {
      const s = lay[i];
      if (!s || s.size !== SIZES[i] || ![0, 1, 2, 3].includes(s.dir) || !Number.isInteger(s.r) || !Number.isInteger(s.c)) return false;
    }
    return invalidSet(lay).size === 0;
  }
  const layText = (lay, salt) => JSON.stringify(lay.map(s => [s.size, s.r, s.c, s.dir])) + '|' + salt;
  // kết quả bắn vào bố trí lay (trúng mũi → chìm cả tàu)
  function resolveShot(lay, hits, r, c) {
    for (let i = 0; i < lay.length; i++) {
      const cs = cellsOf(lay[i]);
      const idx = cs.findIndex(q => q.r === r && q.c === c);
      if (idx < 0) continue;
      if (idx === 0) return { k: 'sunk', i };
      // tàu chìm khi mọi ô đã cháy
      const all = cs.every((q, j) => j === idx || hits.get(q.r * N + q.c) === 'hit');
      return all ? { k: 'sunk', i } : { k: 'hit', i };
    }
    return { k: 'miss', i: -1 };
  }

  /* ---------- Giao diện online ---------- */
  function onlineModelA(now) {
    const b = B;
    if (!b) return { cell: () => '', ships: [] };
    const ships = b.enemySunk.map(s => ({ size: s.size, r: s.r, c: s.c, dir: s.dir, look: 'enemy', sunk: true, sunkAt: s.sunkAt }));
    if (b.oppLayout) b.oppLayout.forEach((s, i) => { if (!b.enemySunk.some(e => e.i === i)) ships.push({ size: s.size, r: s.r, c: s.c, dir: s.dir, look: 'enemy', ghost: true }); });
    const sunkCells = new Map();
    for (const s of b.enemySunk) for (const q of cellsOf(s)) sunkCells.set(q.r * N + q.c, s);
    const myTurn = b.phase === 'battle' && b.turn === on.role && b.tphase === 'aim' && b.sent !== b.n;
    return {
      cell(r, c) { const k = r * N + c; if (sunkCells.has(k)) return 'sunk'; return b.enemyShown.get(k) || ''; },
      ships,
      shipAt(r, c) { return sunkCells.get(r * N + c) || null; },
      pending: b.pending,
      aim: myTurn && b.aim && !b.enemyShown.has(b.aim.r * N + b.aim.c) && !sunkCells.has(b.aim.r * N + b.aim.c) ? { r: b.aim.r, c: b.aim.c, weapon: 'stone' } : null,
      dim: b.phase === 'battle' && !myTurn && b.tphase === 'aim'
    };
  }
  function onlineModelB(now) {
    const b = B;
    if (!b) return { cell: () => '', ships: [] };
    const placing = b.phase === 'place';
    const bad = placing ? invalidSet(b.my) : null;
    const ships = b.my.map((s, i) => {
      const o = { size: s.size, r: s.r, c: s.c, dir: s.dir, look: 'own', sunk: b.mySunk.has(i), sunkAt: b.mySunk.get(i) };
      if (placing) o.hl = bad.has(i) ? 'bad' : (i === b.sel ? 'sel' : null);
      return o;
    });
    const sunkCells = new Map();
    b.mySunk.forEach((t, i) => { for (const q of cellsOf(b.my[i])) sunkCells.set(q.r * N + q.c, ships[i]); });
    return {
      cell(r, c) {
        const k = r * N + c;
        if (sunkCells.has(k)) return 'sunk';
        const v = b.incShown.get(k);
        return v === 'hit' ? 'ownhit' : (v || '');
      },
      ships,
      shipAt(r, c) { return sunkCells.get(r * N + c) || null; },
      dim: false
    };
  }

  function shipIndexAt(lay, r, c) {
    for (let i = 0; i < lay.length; i++) if (cellsOf(lay[i]).some(q => q.r === r && q.c === c)) return i;
    return -1;
  }
  function rotateShip(i) {
    const s = B.my[i], cs = cellsOf(s), k = Math.floor((s.size - 1) / 2), p = cs[k];
    s.dir = (s.dir + 1) % 4;
    const [dr, dc] = BODY[s.dir];
    s.r = p.r - dr * k; s.c = p.c - dc * k;
    clampShip(s);
    SFX.click();
  }

  const input = {
    down(w, cell, e) {
      if (!B) return;
      if (w === 'B' && B.phase === 'place' && cell) {
        const i = shipIndexAt(B.my, cell.r, cell.c);
        if (i >= 0) { B.sel = i; B.drag = { i, start: cell, r: B.my[i].r, c: B.my[i].c, moved: false }; }
      }
      if (w === 'A' && cell) B.aim = cell;
    },
    move(w, cell, e, d) {
      if (!B) return;
      if (w === 'B' && B.drag && cell) {
        const g = B.drag, s = B.my[g.i];
        const nr = g.r + cell.r - g.start.r, nc = g.c + cell.c - g.start.c;
        if (nr !== s.r || nc !== s.c) { s.r = nr; s.c = nc; clampShip(s); g.moved = true; }
      }
      if (w === 'A' && (e.pointerType === 'mouse' || d)) B.aim = cell;
    },
    up(w, cell, e, d) {
      if (!B) return;
      if (w === 'B' && B.drag) {
        const g = B.drag; B.drag = null;
        if (!g.moved && cell && cell.r === g.start.r && cell.c === g.start.c) rotateShip(g.i);
        updatePlaceUi();
        return;
      }
      if (w === 'A' && cell && d && d.cell && d.cell.r === cell.r && d.cell.c === cell.c) {
        shoot(cell.r, cell.c);
        if (e.pointerType !== 'mouse') B.aim = null;
      } else if (w === 'A') B.aim = cell;
    },
    leave(w) { if (B && w === 'A') B.aim = null; }
  };

  function pips(el, left) {
    let h = '';
    for (let i = 0; i < SIZES.length; i++) h += `<i class="${i < left ? '' : 'dead'}"></i>`;
    el.innerHTML = h;
  }
  function updateHud() {
    if (!B) return;
    $('onMe').textContent = on.names.me; $('onOpp').textContent = on.names.opp;
    pips($('onMePips'), B.myLeft); pips($('onOppPips'), B.oppLeft);
    const t = $('onTurn'), clock = $('onClock');
    const myTurn = B.phase === 'battle' && B.turn === on.role;
    $('onMeBox').classList.toggle('act', myTurn);
    $('onOppBox').classList.toggle('act', B.phase === 'battle' && !myTurn);
    clock.classList.toggle('opp', B.phase === 'battle' && !myTurn);
    t.className = 'turn';
    if (B.phase === 'place') t.textContent = oppReady() ? 'BỐ TRÍ HẠM ĐỘI · ĐỐI THỦ ĐÃ SẴN SÀNG' : 'BỐ TRÍ HẠM ĐỘI';
    else if (B.phase === 'wait') t.textContent = 'ĐANG CHỜ ĐỐI THỦ BỐ TRÍ…';
    else if (B.phase === 'battle') { t.textContent = myTurn ? 'LƯỢT CỦA BẠN · CHỌN Ô ĐỂ BẮN' : 'LƯỢT ĐỐI THỦ'; t.classList.add(myTurn ? 'me' : 'opp'); }
    else t.textContent = 'KẾT THÚC';
  }
  function updatePlaceUi() {
    if (!B) return;
    const placing = B.phase === 'place';
    $('placeBar').classList.toggle('hidden', !(placing || B.phase === 'wait'));
    const bad = placing ? invalidSet(B.my).size : 0;
    $('pbReady').disabled = !placing || bad > 0;
    $('pbRandom').disabled = !placing; $('pbRotate').disabled = !placing;
    $('pbReady').innerHTML = B.phase === 'wait' ? '<i class="fa-solid fa-hourglass-half"></i>ĐÃ SẴN SÀNG' : '<i class="fa-solid fa-check"></i>SẴN SÀNG';
    $('pbHint').textContent = B.phase === 'wait' ? 'Hạm đội đã khoá. Đang chờ đối thủ…' : bad ? 'Tàu tô đỏ đang chạm nhau hoặc ra ngoài biển' : 'Kéo tàu để di chuyển · chạm vào tàu để xoay · các tàu không được chạm nhau';
    updateHud();
    HC.layout();
  }
  function tickClock(now) {
    if (!B) return;
    let left = null, total = TURN_MS;
    if (B.phase === 'place') { left = B.placeEnd - now; total = PLACE_MS; }
    else if (B.phase === 'battle' && B.tphase === 'aim') left = TURN_MS - (now - B.turnStart);
    const ring = $('onRing'), sec = $('onSec'), clock = $('onClock');
    if (left === null) { sec.textContent = '--'; ring.style.strokeDashoffset = '106.8'; clock.classList.remove('warn'); return; }
    left = Math.max(0, left);
    sec.textContent = Math.ceil(left / 1000);
    ring.style.strokeDashoffset = String(106.8 * (1 - left / total));
    clock.classList.toggle('warn', left < 8000);
  }

  $('pbRandom').onclick = () => { if (!B || B.phase !== 'place') return; SFX.click(); B.my = randomLayout(); B.sel = -1; updatePlaceUi(); };
  $('pbRotate').onclick = () => { if (!B || B.phase !== 'place') return; rotateShip(B.sel >= 0 ? B.sel : 0); updatePlaceUi(); };
  $('pbReady').onclick = () => readyUp();

  async function readyUp(auto) {
    if (!B || B.phase !== 'place') return;
    if (invalidSet(B.my).size) { if (!auto) return; B.my = randomLayout(); }
    B.phase = 'wait'; B.sel = -1; B.drag = null;
    updatePlaceUi();
    SFX.turn();
    B.hash = await sha256(layText(B.my, B.salt));
    try { await putRetry('/haichien_rooms/' + on.code + '/ready/' + on.role, B.hash); }
    catch (e) { HC.toast('Mất kết nối, đang thử lại…'); setTimeout(() => { if (B && B.phase === 'wait') putRetry('/haichien_rooms/' + on.code + '/ready/' + on.role, B.hash).catch(() => {}); }, 2000); }
    HC.addLog('Hạm đội đã vào vị trí. Chờ lệnh khai hoả!', 'system');
    onTree();
  }
  const oppReady = () => !!(on.tree && on.tree.ready && on.tree.ready[oppRole()]);

  /* ---------- Ghép trận ---------- */
  const qm = { on: false, id: null, timer: null, hasRoom: false, offset: 0, tick: 0, busy: false };
  function setSearchUi(searching, err) {
    $('onFind').classList.toggle('hidden', searching);
    $('onCancel').classList.toggle('hidden', !searching);
    $('onSearchTxt').classList.toggle('hidden', !searching);
    $('radar').classList.toggle('spin', searching);
    $('onMsg').textContent = err || '';
  }
  HC.onMenuView = name => { if (name !== 'online' && qm.on) cancelSearch(); if (name === 'online' && !qm.on) setSearchUi(false); };
  $('onFind').onclick = () => { SFX.unlock(); SFX.click(); findOpponent(); };
  $('onCancel').onclick = () => { SFX.click(); cancelSearch(); };

  async function findOpponent() {
    if (qm.on) return;
    if (on.active || B) { if (B && on.started && B.phase !== 'over') return; exitOnline(); }
    qm.on = true; qm.id = rndId(); qm.hasRoom = false; qm.tick = 0; qm.busy = false;
    setSearchUi(true);
    try {
      await http('PUT', '/haichien_queue/' + qm.id, { name: myName(), seen: SV });
      const me = await http('GET', '/haichien_queue/' + qm.id);
      qm.offset = ((me && me.seen) || Date.now()) - Date.now();
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
    if (del && was && id) http('DELETE', '/haichien_queue/' + id).catch(() => {});
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
      const q = (await http('GET', '/haichien_queue')) || {};
      if (!qm.on) return;
      const now = Date.now() + qm.offset, cands = [];
      for (const k of Object.keys(q)) {
        const v = q[k];
        if (!v || typeof v.seen !== 'number') continue;
        if (now - v.seen > 120000) { http('DELETE', '/haichien_queue/' + k).catch(() => {}); continue; }
        if (k !== qm.id && v.room && CODE_RE.test(v.room) && now - v.seen < QUEUE_FRESH_MS) cands.push([k, v.room]);
      }
      cands.sort((a, b) => (a[0] < b[0] ? -1 : 1));
      for (const [k, room] of cands) {
        if (qm.hasRoom) {
          if (!(k < qm.id)) continue;
          if (on.tree && on.tree.guest) break;
          await closeRoomSilently();
          http('DELETE', '/haichien_queue/' + qm.id + '/room').catch(() => {});
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
        await http('PUT', '/haichien_queue/' + qm.id + '/room', on.code);
      }
      if (++qm.tick % 5 === 0) http('PUT', '/haichien_queue/' + qm.id + '/seen', SV).catch(() => {});
    } catch (e) { /* lỗi mạng tạm thời: thử lại ở nhịp sau */ }
    finally { qm.busy = false; }
  }
  async function makeRoom() {
    let code = null;
    for (let i = 0; i < 6 && !code; i++) { const c = genCode(); if ((await http('GET', '/haichien_rooms/' + c + '/host')) === null) code = c; }
    if (!code) throw new Error('no_code');
    const id = rndId();
    await http('PUT', '/haichien_rooms/' + code, { host: { id, name: myName(), seen: SV }, created: SV, first: Math.random() < 0.5 ? 'host' : 'guest' });
    Object.assign(on, { code, id, role: 'host' });
    connect();
  }
  async function joinRoom(code) {
    const room = await http('GET', '/haichien_rooms/' + code);
    if (!room || !room.host || room.guest || room.left) return false;
    const id = rndId();
    try { await http('PUT', '/haichien_rooms/' + code + '/guest', { id, name: myName(), seen: SV }); }
    catch (e) { return false; }
    Object.assign(on, { code, id, role: 'guest' });
    connect();
    return true;
  }
  async function closeRoomSilently() {
    const code = on.code;
    disconnect();
    if (code) await http('DELETE', '/haichien_rooms/' + code).catch(() => {});
  }

  /* ---------- Luồng thời gian thực ---------- */
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
    Object.assign(on, { active: true, closing: false, started: false, tree: null, applied: 0, wseq: 0, forfeit: false, connOk: true });
    if (on.es) on.es.close();
    const es = new EventSource(DB + '/haichien_rooms/' + on.code + '.json');
    on.es = es;
    es.addEventListener('put', e => { const m = JSON.parse(e.data); on.tree = setIn(on.tree, split(m.path), m.data === undefined ? null : m.data); onTree(); });
    es.addEventListener('patch', e => { const m = JSON.parse(e.data), base = split(m.path); for (const k of Object.keys(m.data || {})) on.tree = setIn(on.tree, base.concat(split(k)), m.data[k]); onTree(); });
    es.onerror = () => { on.connOk = false; };
    es.onopen = () => { on.connOk = true; };
    clearInterval(on.hb); clearInterval(on.watch);
    on.hb = setInterval(() => { http('PUT', '/haichien_rooms/' + on.code + '/' + on.role + '/seen', SV).catch(() => {}); }, HEARTBEAT_MS);
    on.watch = setInterval(watchOpp, 1000);
  }
  function disconnect() {
    on.closing = true;
    if (on.es) { on.es.close(); on.es = null; }
    clearInterval(on.hb); clearInterval(on.watch);
    on.active = false; on.started = false; on.code = null; on.tree = null;
  }
  const oppRole = () => (on.role === 'host' ? 'guest' : 'host');
  const oppNode = () => (on.tree ? on.tree[oppRole()] : null);
  const idOf = role => (on.tree && on.tree[role] ? on.tree[role].id : null);

  function watchOpp() {
    if (!on.active) return;
    const now = performance.now();
    const o = oppNode(), seen = o ? o.seen : null;
    if (seen !== on.oppSeen) { on.oppSeen = seen; on.oppSeenAt = Date.now(); }
    if (on.started && B && B.phase !== 'over' && !on.forfeit && on.connOk && document.visibilityState === 'visible' && o && Date.now() - on.oppSeenAt > FORFEIT_MS) {
      http('PUT', '/haichien_rooms/' + on.code + '/left', oppRole()).catch(() => {});
      opponentLeft();
      return;
    }
    if (!B || !on.started) return;
    if (B.phase === 'place' && now > B.placeEnd) readyUp(true);
    if (B.phase === 'battle' && B.tphase === 'aim' && B.toSent !== B.n) {
      const el = now - B.turnStart, mine = B.turn === on.role;
      if ((mine && el > TURN_MS) || (!mine && el > TURN_MS + GRACE_MS)) { B.toSent = B.n; writeEvent('to', { n: B.n }); }
    }
    if (o && Date.now() - on.oppSeenAt > STALE_MS && B.phase !== 'over' && !B.staleWarned) { B.staleWarned = true; HC.toast('Đối thủ mất kết nối…'); }
    if (o && Date.now() - on.oppSeenAt < STALE_MS) B.staleWarned = false;
  }

  function eventCount(t) {
    let n = 0;
    if (t && t.ev) for (const k of Object.keys(t.ev)) { const i = parseInt(k.slice(1), 10); if (i + 1 > n) n = i + 1; }
    return n;
  }
  function writeEvent(t, payload) {
    const n = Math.max(on.wseq, eventCount(on.tree));
    on.wseq = n + 1;
    const body = { t, u: on.id, p: JSON.stringify(payload || {}) }, code = on.code;
    return enqueue(() => putRetry('/haichien_rooms/' + code + '/ev/e' + n, body)).then(() => true, () => false);
  }

  function onTree() {
    const t = on.tree;
    if (t === null && on.active && !on.closing) { if (on.started && B && B.phase !== 'over') opponentLeft(); return; }
    if (!t || !t.host) return;
    if (t.guest && !on.started) startMatch();
    if (!on.started || !B) return;
    if (t.left && t.left !== on.role) opponentLeft();
    if ((B.phase === 'place' || B.phase === 'wait') && t.ready) {
      if (B.phase === 'wait' && t.ready.host && t.ready.guest) startBattle();
      else updateHud();
    }
    if (B.phase === 'battle' || B.phase === 'over') processEvents();
  }

  /* ---------- Vào trận ---------- */
  function startMatch() {
    on.started = true;
    on.names = { me: myName(), opp: (oppNode() && oppNode().name) || 'Đối thủ' };
    qmStop(true);
    B = freshBattle();
    HC.setScreen('online');
    HC.models.A = onlineModelA; HC.models.B = onlineModelB; HC.input = input;
    HC.viewA.parts.clear(); HC.viewB.parts.clear();
    HC.clearLog(); HC.hideResult(); HC.floatBtn(null);
    HC.showBoard('B');
    $('onTabs').classList.add('hidden');
    HC.addLog(`Đã ghép trận với ${on.names.opp}. Hãy bố trí hạm đội trong 90 giây.`, 'system');
    updatePlaceUi();
    HC.closeMenu();
    const el = $('intro');
    el.innerHTML = '<div><div class="ttl">GHÉP TRẬN THÀNH CÔNG</div><div class="row">' +
      '<div class="pl a"><div class="nm">' + esc(on.names.me) + '</div><div class="tag">BẠN</div></div><div class="vsx">VS</div>' +
      '<div class="pl b"><div class="nm">' + esc(on.names.opp) + '</div><div class="tag">ĐỐI THỦ</div></div></div></div>';
    el.classList.add('show');
    SFX.turn();
    setTimeout(() => el.classList.remove('show'), INTRO_MS);
    B.placeEnd = performance.now() + PLACE_MS + INTRO_MS;
  }

  function startBattle() {
    const t = on.tree;
    B.phase = 'battle'; B.n = 0; B.turn = t.first === 'guest' ? 'guest' : 'host'; B.tphase = 'aim'; B.turnStart = performance.now();
    $('placeBar').classList.add('hidden');
    $('onTabs').classList.remove('hidden');
    const mine = B.turn === on.role;
    HC.showBoard(mine ? 'A' : 'B');
    HC.banner('KHAI HOẢ!', mine ? 'BẠN BẮN TRƯỚC' : 'ĐỐI THỦ BẮN TRƯỚC', mine ? '#2bf59a' : '#ff6a5a');
    HC.addLog(mine ? 'Trận đánh bắt đầu! Bạn được bắn trước.' : `Trận đánh bắt đầu! ${on.names.opp} bắn trước.`, 'system');
    SFX.turn();
    updateHud(); HC.layout();
    processEvents();
  }

  /* ---------- Bắn ---------- */
  function shoot(r, c) {
    if (!B || B.phase !== 'battle' || B.turn !== on.role || B.tphase !== 'aim' || B.sent === B.n) return;
    const k = r * N + c;
    if (B.enemyShown.has(k) || B.enemyRes.has(k) || B.enemySunk.some(s => cellsOf(s).some(q => q.r === r && q.c === c))) return;
    if (performance.now() - B.turnStart > TURN_MS) return;
    const n = B.n;
    B.sent = n;
    const anim = { n, r, c, mine: true, landed: false, res: null, dead: false };
    B.anims.push(anim); B.pending.push(anim);
    writeEvent('shot', { n, r, c }).then(ok => { if (!ok && B && B.sent === n && B.n === n) { B.sent = -1; dropAnim(anim); } });
    const to = HC.viewA.screenCenter(r, c);
    HC.fx.launch({ kind: 'stone', from: { x: innerWidth / 2 + (Math.random() - .5) * 140, y: innerHeight + 30 }, to, cs: HC.viewA.screenCs(),
      onImpact: () => { anim.landed = true; settle(anim); } });
    B.aim = null;
    updateHud();
  }
  function dropAnim(a) {
    a.dead = true;
    B.pending = B.pending.filter(x => x !== a);
    B.anims = B.anims.filter(x => x !== a);
  }

  /* ---------- Xử lý chuỗi sự kiện ---------- */
  function processEvents() {
    const t = on.tree;
    if (!t || !t.ev || !B) return;
    for (;;) {
      const ev = t.ev['e' + on.applied];
      if (!ev) return;
      on.applied++;
      handleEvent(ev);
    }
  }
  function handleEvent(ev) {
    const p = safeParse(ev.p);
    if (!p || !B) return;
    const shooterId = idOf(B.turn), defenderRole = B.turn === 'host' ? 'guest' : 'host';
    if (ev.t === 'shot') {
      if (B.phase !== 'battle' || B.tphase !== 'aim' || p.n !== B.n || ev.u !== shooterId) return;
      if (!inB(p.r, p.c)) return;
      B.tphase = 'fly';
      if (defenderRole === on.role) incomingShot(p.n, p.r, p.c);
    } else if (ev.t === 'res') {
      if (B.phase !== 'battle' || B.tphase !== 'fly' || p.n !== B.n || ev.u !== idOf(defenderRole)) return;
      const shooterIsMe = B.turn === on.role;
      if (shooterIsMe) {
        B.myShots++;
        if (p.k !== 'miss') B.myHits++;
        B.enemyRes.set(p.r * N + p.c, p.k);
        B.oppLeft = typeof p.left === 'number' ? p.left : B.oppLeft;
        const a = B.anims.find(x => x.mine && x.n === p.n);
        if (a) { a.res = p; settle(a); } else showEnemyResult(p);
      } else {
        B.oppShots++;
        B.myLeft = typeof p.left === 'number' ? p.left : B.myLeft;
      }
      if (p.left === 0) { endGame(B.turn === on.role ? 'me' : 'opp', 'fleet'); return; }
      nextTurn(p.k !== 'miss');
    } else if (ev.t === 'to') {
      if (B.phase !== 'battle' || B.tphase !== 'aim' || p.n !== B.n) return;
      const mine = B.turn === on.role;
      HC.addLog(mine ? 'Hết 30 giây! Bạn bị mất lượt.' : `${on.names.opp} hết giờ, mất lượt.`, 'system');
      if (mine) HC.toast('Hết giờ! Mất lượt bắn.');
      nextTurn();
    } else if (ev.t === 'rev') {
      if (ev.u === on.id || B.phase !== 'over') return;
      checkReveal(p);
    }
  }
  // again = bắn trúng thì bên đó được bắn thêm một phát. Màn hình: lượt ta → biển địch, lượt đối thủ → hạm đội ta.
  function nextTurn(again) {
    const prevMine = B.turn === on.role;
    B.n++; if (!again) B.turn = B.turn === 'host' ? 'guest' : 'host';
    B.tphase = 'aim'; B.turnStart = performance.now();
    const mine = B.turn === on.role, n = B.n;
    updateHud();
    if (mine) SFX.turn();
    // chờ hiệu ứng phát vừa rồi xong rồi mới chuyển cảnh
    const delay = mine ? (prevMine ? 0 : 1100) : 1500;
    const view = mine ? 'A' : 'B';
    const go = () => { if (B && B.phase === 'battle' && B.n === n && HC.shown !== view) HC.showBoard(view); };
    if (delay) setTimeout(go, delay); else go();
  }

  // Máy ta bị bắn: tự tính kết quả từ bố trí của mình rồi báo lại
  function incomingShot(n, r, c) {
    const k = r * N + c;
    const res = resolveShot(B.my, B.inc, r, c);
    let s = null;
    if (res.k === 'sunk') {
      for (const q of cellsOf(B.my[res.i])) B.inc.set(q.r * N + q.c, 'sunk');
      const sh = B.my[res.i]; s = { size: sh.size, r: sh.r, c: sh.c, dir: sh.dir, i: res.i };
    } else if (!B.inc.has(k)) B.inc.set(k, res.k);
    const left = B.my.filter((sh, i) => !cellsOf(sh).every(q => B.inc.get(q.r * N + q.c) === 'sunk')).length;
    writeEvent('res', { n, r, c, k: res.k, s, left });
    // hình ảnh: chuyển sang hạm đội ta, đạn rơi từ phía đối thủ
    const go = () => {
      const to = HC.viewB.screenCenter(r, c);
      const a = { n, r, c, mine: false, landed: false, res: { k: res.k, i: res.i }, dead: false };
      HC.fx.launch({ kind: 'stone', from: { x: to.x + (Math.random() - .5) * 120, y: -40 }, to, cs: HC.viewB.screenCs(), muzzle: false,
        onImpact: () => { a.landed = true; settleIncoming(a); } });
    };
    if (HC.shown !== 'B') {
      HC.showBoard('B');
      const tab = document.querySelector('#onTabs [data-v="B"]'); tab.classList.remove('ping'); void tab.offsetWidth; tab.classList.add('ping');
      setTimeout(go, 320);
    } else go();
  }
  function settleIncoming(a) {
    if (!B) return;
    const { r, c } = a, k = r * N + c, res = a.res;
    if (res.k === 'sunk') {
      const ship = B.my[res.i];
      B.mySunk.set(res.i, performance.now());
      for (const q of cellsOf(ship)) B.incShown.set(q.r * N + q.c, 'sunk');
      HC.impactFx(HC.viewB, r, c, 'sunk', { cells: cellsOf(ship), quiet: true });
      HC.banner('TÀU TA BỊ CHÌM', SHIP_NAMES[res.i].toUpperCase(), '#ff5a4a');
      HC.addLog(`${on.names.opp} bắn ${HC.coord(r, c)}: ${SHIP_NAMES[res.i]} của ta đã chìm!`, 'sunk');
    } else if (res.k === 'hit') {
      B.incShown.set(k, 'hit');
      HC.impactFx(HC.viewB, r, c, 'hit', { quiet: true });
      HC.addLog(`${on.names.opp} bắn ${HC.coord(r, c)}: tàu ta trúng đạn!`, 'hit');
    } else {
      if (!B.incShown.has(k)) B.incShown.set(k, 'miss');
      HC.impactFx(HC.viewB, r, c, 'miss', { quiet: true });
      HC.addLog(`${on.names.opp} bắn ${HC.coord(r, c)}: trượt.`, '');
    }
    updateHud();
  }

  // Đạn của ta: chỉ hiện kết quả khi đạn đã rơi và máy đối thủ đã trả lời
  function settle(a) {
    if (!B || a.dead || !a.landed || !a.res) return;
    a.dead = true;
    B.pending = B.pending.filter(x => x !== a);
    B.anims = B.anims.filter(x => x !== a);
    showEnemyResult(a.res);
  }
  function showEnemyResult(p) {
    const { r, c } = p, k = r * N + c;
    if (p.k === 'sunk' && p.s && validShip(p.s)) {
      const s = { size: p.s.size, r: p.s.r, c: p.s.c, dir: p.s.dir, i: p.s.i, sunkAt: performance.now() };
      B.enemySunk.push(s);
      for (const q of cellsOf(s)) B.enemyShown.set(q.r * N + q.c, 'sunk');
      HC.impactFx(HC.viewA, r, c, 'sunk', { cells: cellsOf(s) });
      HC.banner('ĐÃ ĐÁNH CHÌM', (SHIP_NAMES[p.s.i] || 'TÀU ĐỊCH').toUpperCase(), '#ff5a4a');
      HC.addLog(`Bạn bắn ${HC.coord(r, c)}: đánh chìm ${SHIP_NAMES[p.s.i] || 'tàu địch'}!`, 'sunk');
    } else if (p.k === 'hit' || p.k === 'sunk') {
      B.enemyShown.set(k, 'hit');
      HC.impactFx(HC.viewA, r, c, 'hit');
      HC.addLog(`Bạn bắn ${HC.coord(r, c)}: trúng!`, 'hit');
    } else {
      B.enemyShown.set(k, 'miss');
      HC.impactFx(HC.viewA, r, c, 'miss');
      HC.addLog(`Bạn bắn ${HC.coord(r, c)}: trượt.`, '');
    }
    updateHud();
  }
  function validShip(s) {
    return s && SIZES.includes(s.size) && [0, 1, 2, 3].includes(s.dir) && Number.isInteger(s.r) && Number.isInteger(s.c) && fitsIn(s);
  }

  /* ---------- Hết trận ---------- */
  function endGame(winner, reason) {
    if (!B || B.phase === 'over') return;
    B.phase = 'over'; B.winner = winner; B.reason = reason;
    updateHud();
    if (reason === 'fleet' && !B.revSent) { B.revSent = true; writeEvent('rev', { lay: B.my.map(s => [s.size, s.r, s.c, s.dir]), salt: B.salt }); }
    const delay = reason === 'fleet' ? 2600 : 300;
    setTimeout(() => showEnd(), delay);
  }
  function showEnd() {
    if (!B || B.endShown) return;
    B.endShown = true;
    const win = B.winner === 'me';
    if (win) SFX.win(); else SFX.lose();
    if (win && B.reason === 'fleet') HC.banner('CHIẾN THẮNG', 'HẠM ĐỘI ĐỊCH BỊ XOÁ SỔ', '#2bf59a');
    const acc = B.myShots ? Math.round(B.myHits / B.myShots * 100) : 0;
    const why = '';
    setTimeout(() => {
      if (!B) return;
      HC.showResult({
        win, title: win ? 'CHIẾN THẮNG' : 'THẤT BẠI',
        msg: `<div class="stats">${HC.stat(B.myShots, 'PHÁT BẮN')}${HC.stat(acc + '%', 'TỈ LỆ TRÚNG')}${HC.stat(B.myLeft, 'TÀU CÒN')}</div>${why}` +
          (B.oppCheat ? '<br><b style="color:#ffdd00">Cảnh báo: bố trí đối thủ công khai không khớp với kết quả đã báo.</b>' : ''),
        buttons: [
          { label: '<i class="fa-solid fa-satellite-dish"></i>TÌM TRẬN MỚI', cls: 'green', fn: () => { exitOnline(); HC.openMenu('online'); findOpponent(); } },
          { label: '<i class="fa-solid fa-map"></i>XEM BẢN ĐỒ', cls: 'ghost', fn: () => { HC.hideResult(); HC.floatBtn('<i class="fa-solid fa-bars"></i>MENU', () => { exitOnline(); HC.openMenu('online'); }); } },
          { label: '<i class="fa-solid fa-bars"></i>MENU', cls: 'ghost', fn: () => { exitOnline(); HC.openMenu('home'); } }
        ]
      });
    }, win && B.reason === 'fleet' ? 1400 : 0);
  }
  async function checkReveal(p) {
    if (!B || B.oppLayout) return;
    const lay = Array.isArray(p.lay) ? p.lay.map(a => ({ size: a[0], r: a[1], c: a[2], dir: a[3] })) : null;
    if (!lay || !validLayout(lay)) { B.oppCheat = true; return; }
    const h = await sha256(layText(lay, String(p.salt || '')));
    const want = on.tree && on.tree.ready ? on.tree.ready[oppRole()] : null;
    let ok = h === want;
    // đối chiếu từng phát ta đã bắn với kết quả đối thủ đã báo
    if (ok) {
      const hits = new Map();
      for (const [k, v] of B.enemyRes) {
        const r = Math.floor(k / N), c = k % N, idx = shipIndexAt(lay, r, c);
        if ((v === 'miss') !== (idx < 0)) { ok = false; break; }
        hits.set(k, v);
      }
    }
    B.oppLayout = lay;
    if (!ok) { B.oppCheat = true; HC.addLog('Cảnh báo: bố trí đối thủ không khớp với kết quả đã báo!', 'detect'); }
    else HC.addLog('Đã đối chiếu bố trí của đối thủ: hợp lệ.', 'good');
  }
  function opponentLeft() {
    if (!B || B.phase === 'over' || on.forfeit) return;
    on.forfeit = true;
    HC.addLog(`${on.names.opp} đã rời trận.`, 'system');
    if (B.phase === 'place' || B.phase === 'wait') {
      B.phase = 'over'; B.winner = 'me'; B.reason = 'left';
      showEnd();
      return;
    }
    endGame('me', 'left');
  }

  /* ---------- Thoát ---------- */
  function exitOnline() {
    qmStop(true);
    const code = on.code, mid = on.started && B && B.phase !== 'over';
    if (code && on.role) {
      if (mid) http('PUT', '/haichien_rooms/' + code + '/left', on.role).catch(() => {});
      else if (!on.started) http('DELETE', '/haichien_rooms/' + code).catch(() => {});
    }
    disconnect();
    B = null;
    HC.models.A = null; HC.models.B = null; HC.input = null; HC.onTab = null;
    HC.hideResult(); HC.floatBtn(null);
    $('placeBar').classList.add('hidden');
  }
  HC.onlineExit = () => { if (on.active || qm.on || B) exitOnline(); };
  HC.onlineBusy = () => !!(B && B.phase !== 'over' && on.started);
  HC.onlineLeaveText = () => (B && B.phase === 'battle' ? 'Trận đang diễn ra. Nếu rời đi, bạn sẽ bị xử thua.' : 'Bạn sẽ rời khỏi trận đấu.');

  addEventListener('pagehide', () => {
    const ka = (method, path, body) => { try { fetch(DB + path + '.json', { method, body: body === undefined ? undefined : JSON.stringify(body), keepalive: true }); } catch (e) {} };
    if (qm.on && qm.id) ka('DELETE', '/haichien_queue/' + qm.id);
    if (on.code && on.role) {
      if (on.started && B && B.phase !== 'over') ka('PUT', '/haichien_rooms/' + on.code + '/left', on.role);
      else if (!on.started) ka('DELETE', '/haichien_rooms/' + on.code);
    }
  });

  (function tick() { if (B && on.started) tickClock(performance.now()); requestAnimationFrame(tick); })();
  window.__hcOnline = { on, get B() { return B; }, qm };   // chỉ để kiểm thử
})();
