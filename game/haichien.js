/* =========================================================
   HẢI CHIẾN — khung trang + chơi với máy.
   Luật chơi với máy giữ nguyên bản cũ: bàn 12×12, mũi tàu đánh chìm cả tàu, bom 3×3, ngư lôi dò trái/phải,
   tên lửa dò trên/dưới, đạn đá, thùng bí mật thả 5 quả đạn đá; chế độ Khó có khiên đuôi tàu và nạp đạn.
   Phần chung (menu, bàn, hiệu ứng, hộp thoại) xuất ra window.HC cho haichien-online.js.
   ========================================================= */
(function () {
  'use strict';
  const { BoardView, FX, Hero, SFX, shipCells, fleetIcon } = HCArt;
  const $ = id => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const GRID = 12;

  const fx = new FX($('fx'));
  const viewA = new BoardView($('boardA'));
  const viewB = new BoardView($('boardB'), { tone: ['#0f5872', '#0a3f5e', '#062a42'], accent: 'rgba(43,245,154,.4)' });
  const hero = new Hero($('hero'));

  /* ---------- Bố cục ---------- */
  const stage = $('stage');
  function layout() {
    const app = $('app');
    const cs = getComputedStyle(app);
    const innerW = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    let used = 0, n = 0;
    for (const el of app.children) {
      if (el === stage || el.offsetParent === null) continue;
      used += el.id === 'log' ? 64 : el.offsetHeight; n++;
    }
    const avail = window.innerHeight - used - n * 8 - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const size = Math.floor(Math.max(Math.min(innerW, 270), Math.min(innerW, avail)));
    stage.style.width = size + 'px'; stage.style.height = size + 'px';
    viewA.setSize(size); viewB.setSize(size);
  }
  addEventListener('resize', () => layout());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { viewA.size = 0; viewB.size = 0; layout(); });

  /* ---------- Hiển thị bàn A (biển địch) / B (hạm đội ta) ---------- */
  let shown = 'A';
  function showBoard(w) {
    shown = w;
    $('boardA').classList.toggle('off', w !== 'A');
    $('boardB').classList.toggle('off', w !== 'B');
    document.querySelectorAll('#onTabs button').forEach(b => b.classList.toggle('on', b.dataset.v === w));
  }

  /* ---------- Thông báo ---------- */
  function addLog(msg, type) {
    const log = $('log');
    log.querySelectorAll('.le.new').forEach(e => e.classList.remove('new'));
    const el = document.createElement('div');
    el.className = 'le new ' + (type || ''); el.textContent = msg;
    log.appendChild(el); log.scrollTop = log.scrollHeight;
    while (log.children.length > 60) log.removeChild(log.firstChild);
  }
  function clearLog() { $('log').innerHTML = ''; }
  let toastT = null;
  function toast(text) {
    const el = $('toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function banner(title, sub, color) {
    const el = $('banner');
    el.querySelector('b').textContent = title;
    const s = el.querySelector('span'); s.textContent = sub || ''; s.style.display = sub ? '' : 'none';
    el.style.setProperty('--bc', color || '#ff6a3d');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }
  function buzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
  const coord = (r, c) => String.fromCharCode(65 + c) + (r + 1);

  function confirmBox(text, yes, cb) {
    const ov = $('confirmOv');
    $('cfMsg').textContent = text; $('cfYes').textContent = yes || 'ĐỒNG Ý';
    ov.classList.remove('hidden');
    $('cfNo').onclick = () => ov.classList.add('hidden');
    $('cfYes').onclick = () => { ov.classList.add('hidden'); cb(); };
  }
  function showResult(o) {
    $('resIco').innerHTML = o.win ? '<i class="fa-solid fa-trophy" style="color:#ffd23f;filter:drop-shadow(0 0 12px rgba(255,210,63,.7))"></i>' : '<i class="fa-solid fa-skull" style="color:#ff4d5e;filter:drop-shadow(0 0 12px rgba(255,59,74,.6))"></i>';
    const t = $('resTitle'); t.textContent = o.title; t.className = o.win ? 'win' : 'lose';
    $('resMsg').innerHTML = o.msg;
    const box = $('resBtns'); box.innerHTML = '';
    for (const b of o.buttons) {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || ''); el.innerHTML = b.label; el.onclick = b.fn;
      box.appendChild(el);
    }
    $('resultOv').classList.remove('hidden');
  }
  function hideResult() { $('resultOv').classList.add('hidden'); }
  function floatBtn(label, fn) {
    const b = $('floatBtn');
    if (!label) { b.classList.add('hidden'); return; }
    b.innerHTML = label; b.onclick = fn; b.classList.remove('hidden');
  }
  const stat = (v, l) => `<div><b>${v}</b><span>${l}</span></div>`;

  /* ---------- Hiệu ứng tại một ô ---------- */
  // res: 'miss' | 'hit' | 'sunk' | 'shield' | 'secret'; o.cells: các ô của tàu vừa chìm; o.quiet: không chữ nổi
  function impactFx(view, r, c, res, o) {
    o = o || {};
    const p = view.screenCenter(r, c), cs = view.screenCs();
    if (res === 'sunk') {
      fx.explode(p.x, p.y, cs, true, o.silent);
      (o.cells || []).forEach((q, i) => {
        if (q.r === r && q.c === c) return;
        setTimeout(() => { const s = view.screenCenter(q.r, q.c); fx.explode(s.x, s.y, cs * .8, false, true); }, 120 + i * 110);
      });
      buzz([40, 30, 90]);
    } else if (res === 'hit') {
      fx.explode(p.x, p.y, cs, false, o.silent);
      if (!o.quiet) fx.text(p.x, p.y - cs * .7, 'TRÚNG!', '#ffb35a', cs * .5);
      buzz(35);
    } else if (res === 'shield') {
      fx.shieldHit(p.x, p.y, cs);
      if (!o.quiet) fx.text(p.x, p.y - cs * .7, 'KHIÊN!', '#8ff6ff', cs * .46);
    } else if (res === 'secret') {
      fx.splash(p.x, p.y, cs, false, true);
      fx.goldBurst(p.x, p.y, cs);
    } else {
      fx.splash(p.x, p.y, cs, false, o.silent);
      if (!o.quiet) fx.text(p.x, p.y - cs * .65, 'TRƯỢT', '#cfe3f2', cs * .4);
    }
  }

  /* ---------- Vòng vẽ ---------- */
  const HC = window.HC = {
    GRID, fx, viewA, viewB, SFX, layout, showBoard, addLog, clearLog, toast, banner, buzz, coord, confirmBox,
    showResult, hideResult, floatBtn, impactFx, stat,
    models: { A: null, B: null }, input: null, screen: 'solo',
    get shown() { return shown; }
  };
  let menuOpen = true, last = performance.now();
  function loop(now) {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    if (menuOpen) hero.frame(dt);
    else {
      const a = $('boardA'), b = $('boardB');
      if (HC.models.A && (!a.classList.contains('off') || parseFloat(getComputedStyle(a).opacity) > .02)) viewA.draw(now, dt, HC.models.A(now));
      if (HC.models.B && (!b.classList.contains('off') || parseFloat(getComputedStyle(b).opacity) > .02)) viewB.draw(now, dt, HC.models.B(now));
    }
    fx.frame(dt);
    const sx = fx.shake ? rnd(-1, 1) * fx.shake : 0, sy = fx.shake ? rnd(-1, 1) * fx.shake : 0;
    HCArt.shake.x = sx; HCArt.shake.y = sy;
    stage.style.transform = fx.shake ? `translate(${sx}px, ${sy}px)` : '';
    requestAnimationFrame(loop);
  }

  /* ---------- Chuột / chạm trên bàn ---------- */
  function bindBoard(cv, which, view) {
    let down = null;
    cv.addEventListener('pointerdown', e => {
      SFX.unlock();
      const cell = view.cellAt(e.clientX, e.clientY);
      down = { x: e.clientX, y: e.clientY, cell };
      try { cv.setPointerCapture(e.pointerId); } catch (er) {}
      if (HC.input && HC.input.down) HC.input.down(which, cell, e);
    });
    cv.addEventListener('pointermove', e => {
      const cell = view.cellAt(e.clientX, e.clientY);
      if (HC.input && HC.input.move) HC.input.move(which, cell, e, down);
    });
    cv.addEventListener('pointerup', e => {
      const cell = view.cellAt(e.clientX, e.clientY);
      const d = down; down = null;
      if (HC.input && HC.input.up) HC.input.up(which, cell, e, d);
    });
    cv.addEventListener('pointercancel', () => { down = null; if (HC.input && HC.input.leave) HC.input.leave(which); });
    cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && HC.input && HC.input.leave) HC.input.leave(which); });
  }
  bindBoard($('boardA'), 'A', viewA);
  bindBoard($('boardB'), 'B', viewB);

  /* ---------- Màn chơi: với máy / online ---------- */
  function setScreen(kind) {
    HC.screen = kind;
    const on = kind === 'online';
    $('soloHud').classList.toggle('hidden', on);
    $('weapons').classList.toggle('hidden', on);
    $('onHud').classList.toggle('hidden', !on);
    $('onTabs').classList.toggle('hidden', !on);
    if (!on) { $('placeBar').classList.add('hidden'); showBoard('A'); }
    document.body.dataset.mode = on ? 'online' : difficulty;
    $('modeTag').textContent = on ? 'ONLINE' : DIFFICULTY[difficulty].label;
    layout();
  }
  HC.setScreen = setScreen;

  /* ---------- Menu ---------- */
  function menuView(name) {
    document.querySelectorAll('.mv').forEach(v => v.classList.toggle('hidden', v.dataset.view !== name));
    if (HC.onMenuView) HC.onMenuView(name);
  }
  function openMenu(view) {
    if (HC.screen === 'online' && HC.onlineBusy && HC.onlineBusy()) {
      confirmBox(HC.onlineLeaveText(), 'RỜI TRẬN', () => { HC.onlineExit(); openMenu(view); });
      return;
    }
    menuOpen = true;
    const m = $('menu'); m.classList.remove('hidden', 'fade');
    $('mResume').classList.toggle('hidden', !(HC.screen === 'solo' && started && !gameOver));
    $('mInfo').classList.toggle('only', $('mResume').classList.contains('hidden'));
    floatBtn(null);
    menuView(view || 'home');
  }
  function closeMenu() {
    menuOpen = false;
    const m = $('menu'); m.classList.add('fade');
    setTimeout(() => { if (!menuOpen) m.classList.add('hidden'); }, 380);
    const app = $('app'); app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
    layout();
  }
  HC.openMenu = openMenu; HC.closeMenu = closeMenu; HC.menuView = menuView;
  HC.isMenuOpen = () => menuOpen;

  document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { SFX.unlock(); SFX.click(); menuView(b.dataset.go); }));
  document.querySelectorAll('[data-solo]').forEach(b => b.addEventListener('click', () => { SFX.unlock(); SFX.click(); startSolo(b.dataset.solo); }));
  $('mResume').onclick = () => { SFX.click(); closeMenu(); };
  $('mInfo').onclick = () => toggleInfo(true);
  $('btnMenu').onclick = () => { SFX.unlock(); if (HC.screen === 'solo' && firingLocked) return; openMenu(); };
  $('btnInfo').onclick = () => toggleInfo(true);
  $('infoOk').onclick = () => toggleInfo(false);
  $('infoOv').onclick = () => toggleInfo(false);
  function toggleInfo(v) { $('infoOv').classList.toggle('hidden', !v); }
  function soundIcon() { $('btnSound').innerHTML = SFX.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>'; }
  $('btnSound').onclick = () => { SFX.setMuted(!SFX.muted); soundIcon(); if (!SFX.muted) SFX.click(); };
  soundIcon();
  document.querySelectorAll('#onTabs button').forEach(b => b.addEventListener('click', () => { if (HC.onTab) HC.onTab(b.dataset.v); else showBoard(b.dataset.v); }));

  /* =========================================================
     CHƠI VỚI MÁY (lõi giữ nguyên bản cũ)
     ========================================================= */
  const SHIP_NAMES = ['Thiết Giáp Hạm', 'Tuần Dương Hạm', 'Khu Trục Hạm 1', 'Khu Trục Hạm 2', 'Tàu Hộ Tống 1', 'Tàu Hộ Tống 2', 'Tàu Hộ Tống 3'];
  const LOW_AMMO = 8;
  const DIFFICULTY = {
    normal: { label: 'THƯỜNG', ships: [5, 4, 3, 3, 2, 2], ammo: { torpedo: 5, missile: 5, stone: 25, bomb: 1 }, secretDrops: 5, bangMs: 2000, shield: false, reload: false },
    hard: { label: 'KHÓ', ships: [5, 4, 3, 3, 2, 2, 2], ammo: { torpedo: 5, missile: 5, stone: 25, bomb: 1 }, secretDrops: 5, bangMs: 500, shield: true, reload: true }
  };
  const RELOAD_EVERY = 4;
  const MODE_KEY = 'haichien_difficulty';
  const WEAPONS = ['bomb', 'torpedo', 'missile', 'stone'];
  let difficulty = 'normal';
  try { const v = localStorage.getItem(MODE_KEY); if (DIFFICULTY[v]) difficulty = v; } catch (e) {}

  let board = [], revealed = [], ships = [], ammo = {}, selectedWeapon = 'torpedo';
  let shotsCount = 0, shipsAlive = 6, totalShips = 6, missCount = 0;
  let started = false, gameOver = true, firingLocked = false;
  let secretCell = null, secretTriggered = false, secretPending = false;
  let gen = 0, blips = [], revealAll = false, aim = null;

  const getTotalAmmo = () => ammo.torpedo + ammo.missile + ammo.stone + ammo.bomb;
  const isOpen = st => st === '' || st === 'detected' || st === 'shield';
  function lockFiring() { firingLocked = true; document.body.classList.add('locked'); }
  function unlockFiring() { firingLocked = false; document.body.classList.remove('locked'); }
  const weaponName = w => ({ torpedo: 'Ngư Lôi', missile: 'Tên Lửa', stone: 'Đạn Đá', bomb: 'Bom' }[w]);

  function soloModel(now) {
    return {
      cell(r, c) {
        const st = revealed[r][c];
        if (revealAll && secretCell && !secretTriggered && r === secretCell.r && c === secretCell.c) return 'secretUnfound';
        return st;
      },
      ships: ships.filter(s => !s.alive || revealAll).map(s => ({ size: s.size, r: s.headCell.r, c: s.headCell.c, dir: s.dir, look: 'enemy', sunk: !s.alive, sunkAt: s.sunkAt, ghost: s.alive })),
      shipAt(r, c) { const b = board[r][c]; return b ? ships[b.shipId] : null; },
      blips: blips.filter(b => b.start === null || b.until > now),
      aim: aim && !gameOver && !firingLocked && isOpen(revealed[aim.r][aim.c]) ? { r: aim.r, c: aim.c, weapon: selectedWeapon } : null
    };
  }

  const soloInput = {
    down(w, cell, e) { if (w === 'A' && cell) aim = cell; },
    move(w, cell, e, d) { if (w === 'A' && (e.pointerType === 'mouse' || d)) aim = cell; },
    up(w, cell, e, d) {
      if (w !== 'A' || !cell || !d || !d.cell) return;
      if (d.cell.r !== cell.r || d.cell.c !== cell.c) { aim = cell; return; }
      fire(cell.r, cell.c);
      if (e.pointerType !== 'mouse') aim = null;
    },
    leave() { aim = null; }
  };

  function startSolo(m) {
    if (!DIFFICULTY[m]) return;
    const go = () => {
      if (HC.onlineExit) HC.onlineExit();
      difficulty = m; started = true;
      try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
      setScreen('solo');
      HC.models.A = soloModel; HC.models.B = null; HC.input = soloInput; HC.onTab = null;
      initGame();
      closeMenu();
    };
    if (started && !gameOver && shotsCount > 0 && HC.screen === 'solo') confirmBox('Bắt đầu ván mới? Ván hiện tại sẽ bị huỷ.', 'VÁN MỚI', go);
    else go();
  }

  function initGame() {
    board = Array.from({ length: GRID }, () => Array(GRID).fill(null));
    revealed = Array.from({ length: GRID }, () => Array(GRID).fill(''));
    ships = []; ammo = { ...DIFFICULTY[difficulty].ammo };
    selectedWeapon = 'torpedo'; shotsCount = 0; shipsAlive = 0; missCount = 0;
    gameOver = false; gen++; secretPending = false; blips = []; revealAll = false; aim = null;
    unlockFiring(); hideResult(); floatBtn(null);
    viewA.parts.clear();
    placeShips(); placeSecret();
    shipsAlive = totalShips = ships.length;
    clearLog();
    document.body.dataset.mode = difficulty;
    $('modeTag').textContent = DIFFICULTY[difficulty].label;
    addLog(`Trận hải chiến bắt đầu! (Chế độ ${DIFFICULTY[difficulty].label})`, 'system');
    WEAPONS.forEach(n => { const b = $('btn-' + n); b.disabled = false; b.classList.remove('active'); });
    buildFleet();
    selectWeapon('torpedo');
    updateAmmoButtons();
    layout();
  }

  function placeShips() {
    DIFFICULTY[difficulty].ships.forEach((size, idx) => {
      let placed = false, attempts = 0;
      while (!placed && attempts < 1000) {
        attempts++;
        const horizontal = Math.random() < 0.5;
        const maxR = horizontal ? GRID : GRID - size, maxC = horizontal ? GRID - size : GRID;
        const r = Math.floor(Math.random() * maxR), c = Math.floor(Math.random() * maxC);
        let fits = true; const cells = [];
        for (let i = 0; i < size; i++) {
          const nr = horizontal ? r : r + i, nc = horizontal ? c + i : c;
          if (board[nr][nc] !== null) { fits = false; break; }
          for (let dr = -1; dr <= 1 && fits; dr++) for (let dc = -1; dc <= 1; dc++) {
            const br = nr + dr, bc = nc + dc;
            if (br >= 0 && br < GRID && bc >= 0 && bc < GRID && board[br][bc] !== null) { fits = false; break; }
          }
          if (!fits) break;
          cells.push({ r: nr, c: nc });
        }
        if (fits) {
          const isReverse = Math.random() < 0.5;
          const headCell = isReverse ? cells[cells.length - 1] : cells[0];
          const tailCell = isReverse ? cells[0] : cells[cells.length - 1];
          // hướng mũi tàu để vẽ: mũi ở đầu trái → hướng Tây, đầu phải → Đông, đầu trên → Bắc, đầu dưới → Nam
          const dir = horizontal ? (isReverse ? 0 : 2) : (isReverse ? 1 : 3);
          const ship = { id: idx, name: SHIP_NAMES[idx], size, cells, alive: true, headCell, tailCell, dir, shieldUp: DIFFICULTY[difficulty].shield, hit: new Set(), isHorizontal: horizontal, sunkAt: 0 };
          ships.push(ship);
          cells.forEach(({ r, c }) => { board[r][c] = { shipId: idx, isHead: r === headCell.r && c === headCell.c, isTail: r === tailCell.r && c === tailCell.c }; });
          placed = true;
        }
      }
    });
  }
  function placeSecret() {
    const free = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) if (board[r][c] === null) free.push({ r, c });
    secretCell = free[Math.floor(Math.random() * free.length)];
    secretTriggered = false;
  }

  function registerMiss() {
    if (!DIFFICULTY[difficulty].reload) return;
    if (++missCount >= RELOAD_EVERY) {
      missCount = 0; ammo.stone++;
      addLog('Nạp đạn: +1 ĐẠN ĐÁ (đã bắn trượt 4 lần)!', 'good');
      toast('+1 ĐẠN ĐÁ');
      updateAmmoButtons();
    } else updateHud();
  }

  function buildFleet() {
    const box = $('fleet'); box.innerHTML = '';
    for (const s of ships) { const cv = document.createElement('canvas'); s.icon = cv; box.appendChild(cv); }
    updateFleet();
  }
  function updateFleet() {
    const fw = $('fleet').clientWidth || 300, total = ships.reduce((a, s) => a + s.size * .94 + .5, 0);
    const cs = Math.max(8, Math.min(13, (fw - 8 * ships.length) / total));
    for (const s of ships) if (s.icon && s.iconDead !== !s.alive) { s.iconDead = !s.alive; fleetIcon(s.icon, s.size, 'enemy', !s.alive, cs); }
  }
  function updateHud() {
    $('hudShips').textContent = `${shipsAlive}/${totalShips}`;
    $('hudShots').textContent = shotsCount;
    const total = getTotalAmmo(), el = $('hudAmmo');
    el.textContent = total; el.classList.toggle('low', total <= LOW_AMMO);
    $('reload').classList.toggle('hidden', !DIFFICULTY[difficulty].reload);
    $('reload').querySelectorAll('i').forEach((p, i) => p.classList.toggle('on', i < missCount));
    updateFleet();
  }

  function selectWeapon(w) {
    if (ammo[w] <= 0) return;
    selectedWeapon = w; document.body.dataset.weapon = w;
    WEAPONS.forEach(n => $('btn-' + n).classList.toggle('active', n === w));
  }
  WEAPONS.forEach(w => $('btn-' + w).addEventListener('click', () => { SFX.unlock(); SFX.click(); selectWeapon(w); }));
  function updateAmmoButtons() {
    WEAPONS.forEach(w => {
      const btn = $('btn-' + w), count = ammo[w];
      $('count-' + w).textContent = '×' + count;
      btn.disabled = count <= 0;
      if (count <= 0 && selectedWeapon === w) {
        const next = ['torpedo', 'missile', 'stone', 'bomb'].find(x => ammo[x] > 0);
        if (next) selectWeapon(next);
      }
    });
    updateHud();
  }

  const LOGS = {
    sunk: [n => `Tuyệt đỉnh! ${n} trúng ngay mũi tàu! Tiễn biệt đối thủ!`, () => 'Cú bắn thần sầu! Một chiếc tàu địch đã chìm sâu dưới đáy biển!', () => 'Tuyệt vời chỉ huy! Chúng ta đã đánh chìm hoàn toàn tàu địch!', () => 'Bùm! Mũi tàu nổ tung, mục tiêu đã bị xoá sổ!', () => 'Xác nhận tiêu diệt! Đã loại bỏ một tàu chiến địch khỏi bản đồ!'],
    hit: [n => `Trúng đích! ${n} đã khiến chúng bốc cháy!`, () => 'Khá lắm! Tàu địch đã trúng đạn, chúng không thoát được đâu!', () => 'Một cú va chạm mạnh! Thân tàu địch đang hư hỏng nặng!', () => 'Tốt! Chúng ta đã gây thiệt hại cho hạm đội địch!', n => `Kim loại rách nát! ${n} đã xuyên thủng lớp giáp của chúng!`],
    miss: [n => `Chệch mục tiêu! ${n} chỉ tạo ra một cột nước khổng lồ.`, () => 'Trượt rồi! Chúng ta cần căn chỉnh lại thước ngắm!', () => 'Đạn rơi xuống biển! Một sự lãng phí tài nguyên, thưa chỉ huy.', () => 'Không có gì cả! Chỉ là một đàn cá vừa bơi qua.', n => `Có vẻ như dòng hải lưu đã làm lệch đường đi của ${n}.`],
    shield: [() => 'Trúng khiên đuôi tàu! Cần bắn thêm một lần nữa!', () => 'Lớp khiên đã rạn nứt! Bắn tiếp để xuyên thủng!', n => `${n} bị khiên chặn lại! Khiên chỉ chịu được thêm một đòn!`],
    radar_none: [() => '[RADAR]: Vùng biển xung quanh hoàn toàn yên tĩnh.', () => '[RADAR]: Không có tín hiệu kim loại nào trong phạm vi quét.', () => '[RADAR]: Sóng âm không phản hồi, không thấy mục tiêu lân cận.', () => '[RADAR]: Khu vực này có vẻ sạch bóng quân thù.', () => '[RADAR]: Tín hiệu phẳng lặng, không có dấu hiệu chuyển động.']
  };
  const pick = (arr, n) => arr[Math.floor(Math.random() * arr.length)](n);

  function launchFrom(weapon, r, c, to) {
    if (weapon === 'bomb') return to;
    if (weapon === 'torpedo') {
      const o = viewA.toScreen(0, 0), k = viewA.screenCs() / viewA.cs, fromLeft = c >= GRID / 2;
      return { x: fromLeft ? o.x + viewA.m * k : o.x + (viewA.size - viewA.m) * k, y: to.y };
    }
    return { x: innerWidth / 2 + rnd(-70, 70), y: innerHeight + 30 };
  }

  function fire(r, c) {
    if (gameOver || firingLocked) return;
    if (!isOpen(revealed[r][c])) return;
    const weapon = selectedWeapon;
    if (ammo[weapon] <= 0) {
      addLog(`Hết ${weaponName(weapon).toUpperCase()}!`, 'system');
      const alt = ['stone', 'torpedo', 'missile', 'bomb'].find(w => ammo[w] > 0);
      if (alt) { addLog(`Chuyển sang: ${weaponName(alt).toUpperCase()}`, 'system'); selectWeapon(alt); }
      return;
    }
    lockFiring();
    ammo[weapon]--; shotsCount++;
    updateAmmoButtons();
    const to = viewA.screenCenter(r, c), g = gen;
    fx.launch({ kind: weapon, from: launchFrom(weapon, r, c, to), to, cs: viewA.screenCs(), onImpact: () => { if (g === gen) impact(r, c, weapon); } });
  }

  function impact(r, c, weapon) {
    const wName = weaponName(weapon);
    const p = viewA.screenCenter(r, c), cs = viewA.screenCs();
    if (weapon === 'torpedo') fx.sonar(p.x, p.y, cs, true, 'rgba(0,229,255,.95)');
    if (weapon === 'missile') fx.sonar(p.x, p.y, cs, false, 'rgba(255,221,0,.95)');
    let damaged = false;
    if (weapon === 'bomb') damaged = blastArea(r, c);
    else {
      const result = attackCell(r, c);
      impactFx(viewA, r, c, result, { cells: result === 'sunk' ? ships[board[r][c].shipId].cells : null });
      if (result === 'sunk') { addLog(pick(LOGS.sunk, wName), 'sunk'); sunkBanner(ships[board[r][c].shipId]); damaged = true; }
      else if (result === 'hit') { addLog(pick(LOGS.hit, wName), 'hit'); damaged = true; }
      else if (result === 'shield') { addLog(pick(LOGS.shield, wName), 'hit'); damaged = true; }
      else if (result !== 'secret') addLog(pick(LOGS.miss, wName), 'miss');
    }
    if (weapon === 'torpedo' || weapon === 'missile') {
      const dirs = weapon === 'torpedo' ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      let found = false;
      dirs.forEach(([dr, dc]) => { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && board[nr][nc] !== null && (revealed[nr][nc] === '' || revealed[nr][nc] === 'detected')) found = true; });
      if (found) detectCells(r, c, dirs);
      else addLog(pick(LOGS.radar_none), 'detect');
    }
    if (!damaged && !secretPending) registerMiss();
    const finish = () => { checkEndGame(); unlockFiring(); };
    if (secretPending && shipsAlive > 0) { secretPending = false; setTimeout(() => dropSecretShells(finish), 350); }
    else { secretPending = false; finish(); }
  }

  function sunkBanner(ship) { banner('ĐÃ ĐÁNH CHÌM', ship.name.toUpperCase(), '#ff5a4a'); }

  function attackCell(r, c) {
    if (secretCell && !secretTriggered && r === secretCell.r && c === secretCell.c) {
      secretTriggered = true; secretPending = true;
      revealed[r][c] = 'secret';
      banner('THÙNG BÍ MẬT', 'MƯA ĐẠN ĐÁ', '#ffd23f');
      return 'secret';
    }
    if (board[r][c] !== null) {
      const { shipId, isHead, isTail } = board[r][c], ship = ships[shipId];
      if (isHead && ship.alive) {
        ship.alive = false; ship.sunkAt = performance.now(); shipsAlive--;
        ship.cells.forEach(({ r: sr, c: sc }) => { revealed[sr][sc] = 'sunk'; });
        updateHud();
        return 'sunk';
      } else if (ship.alive) {
        if (isTail && ship.shieldUp) { ship.shieldUp = false; revealed[r][c] = 'shield'; return 'shield'; }
        revealed[r][c] = 'hit'; ship.hit.add(`${r},${c}`); return 'hit';
      }
    }
    if (!revealed[r][c] || revealed[r][c] === 'detected') revealed[r][c] = 'miss';
    return 'miss';
  }

  // Thùng bí mật: thả 5 đạn đá xuống 5 ô chưa bắn (không tốn đạn)
  function dropSecretShells(done) {
    const g = gen, pool = [];
    for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID; c++) { const st = revealed[r][c]; if (st === '' || st === 'detected') pool.push([r, c]); }
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const targets = pool.slice(0, DIFFICULTY[difficulty].secretDrops);
    addLog(`THÙNG BÍ MẬT! ${targets.length} quả đạn đá đang rơi xuống ngẫu nhiên trên bàn!`, 'detect');
    if (!targets.length) { done(); return; }
    let landed = 0, hits = 0, sunk = 0;
    targets.forEach(([tr, tc], i) => {
      setTimeout(() => {
        if (g !== gen) return;
        const to = viewA.screenCenter(tr, tc);
        fx.launch({ kind: 'stone', from: { x: to.x + rnd(-50, 50), y: -40 }, to, cs: viewA.screenCs(), dur: 650, muzzle: false, onImpact: () => {
          if (g !== gen) return;
          if (isOpen(revealed[tr][tc])) {
            const res = attackCell(tr, tc);
            impactFx(viewA, tr, tc, res, { quiet: true, cells: res === 'sunk' ? ships[board[tr][tc].shipId].cells : null });
            if (res === 'sunk') { sunk++; sunkBanner(ships[board[tr][tc].shipId]); } else if (res === 'hit' || res === 'shield') hits++;
          }
          if (++landed === targets.length) {
            if (sunk > 0) addLog(`Mưa đạn đá đánh chìm ${sunk} tàu${hits ? `, trúng thêm ${hits} ô` : ''}!`, 'sunk');
            else if (hits > 0) addLog(`Mưa đạn đá trúng ${hits} ô tàu địch!`, 'hit');
            else addLog('Mưa đạn đá rơi xuống biển, không trúng tàu nào.', 'miss');
            done();
          }
        } });
      }, i * 170);
    });
  }

  // Bom: tấn công mọi ô chưa lộ trong vùng 3×3 quanh (r,c)
  function blastArea(r, c) {
    const p = viewA.screenCenter(r, c), cs = viewA.screenCs();
    fx.explode(p.x, p.y, cs * 1.6, true);
    let hits = 0, sunk = 0, k = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
      if (!isOpen(revealed[nr][nc])) continue;
      const res = attackCell(nr, nc);
      const delay = 60 + (k++) * 50;
      setTimeout(() => impactFx(viewA, nr, nc, res, { quiet: true, silent: true, cells: res === 'sunk' ? ships[board[nr][nc].shipId].cells : null }), delay);
      if (res === 'sunk') { sunk++; sunkBanner(ships[board[nr][nc].shipId]); } else if (res === 'hit' || res === 'shield') hits++;
    }
    if (sunk > 0) addLog(`Bom nổ tung vùng 3×3! Đánh chìm ${sunk} tàu${hits ? `, trúng thêm ${hits} ô` : ''}!`, 'sunk');
    else if (hits > 0) addLog(`Bom trúng ${hits} ô tàu địch!`, 'hit');
    else addLog('Bom nổ giữa biển khơi, không trúng mục tiêu nào.', 'miss');
    return hits > 0 || sunk > 0;
  }

  function detectCells(r, c, dirs) {
    const now = performance.now(), ms = DIFFICULTY[difficulty].bangMs;
    dirs.forEach(([dr, dc]) => {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && board[nr][nc] !== null && revealed[nr][nc] === '') {
        revealed[nr][nc] = 'detected';
        blips.push({ r: nr, c: nc, start: null, until: 0, dur: ms });
        addLog('Radar phát hiện tàu!', 'detect');
      }
    });
  }

  function checkEndGame() {
    if (gameOver) return;
    if (shipsAlive === 0) {
      gameOver = true;
      setTimeout(() => {
        SFX.win();
        banner('CHIẾN THẮNG', 'HẠM ĐỘI ĐỊCH BỊ XOÁ SỔ', '#2bf59a');
        setTimeout(() => showResult({
          win: true, title: 'CHIẾN THẮNG',
          msg: `<div class="stats">${stat(shotsCount, 'PHÁT BẮN')}${stat(getTotalAmmo(), 'ĐẠN CÒN')}</div>`,
          buttons: endButtons()
        }), 1300);
      }, 700);
      return;
    }
    if (getTotalAmmo() <= 0) {
      gameOver = true; revealAll = true;
      setTimeout(() => {
        SFX.lose();
        showResult({
          win: false, title: 'THẤT BẠI',
          msg: `<div class="stats">${stat(shotsCount, 'PHÁT BẮN')}${stat(shipsAlive, 'TÀU ĐỊCH CÒN')}</div>Hết đạn! Vị trí tàu địch đã hiện trên bản đồ.`,
          buttons: endButtons()
        });
      }, 600);
    }
  }
  function endButtons() {
    return [
      { label: '<i class="fa-solid fa-rotate-right"></i>CHƠI LẠI', fn: () => initGame() },
      { label: '<i class="fa-solid fa-map"></i>XEM BẢN ĐỒ', cls: 'ghost', fn: () => { revealAll = true; hideResult(); floatBtn('<i class="fa-solid fa-rotate-right"></i>CHƠI LẠI', () => initGame()); } },
      { label: '<i class="fa-solid fa-bars"></i>ĐỔI CHẾ ĐỘ', cls: 'ghost', fn: () => { hideResult(); openMenu(); } }
    ];
  }

  window.__hcSolo = { get ammo() { return ammo; }, get ships() { return ships; }, get revealed() { return revealed; }, get secret() { return secretCell; }, fire, selectWeapon, startSolo };   // chỉ để kiểm thử

  /* ---------- Khởi động ---------- */
  HC.models.A = soloModel; HC.input = soloInput;
  setScreen('solo');
  initGame(); gameOver = true; started = false;   // bàn nền phía sau menu
  openMenu('home');
  requestAnimationFrame(loop);
})();
