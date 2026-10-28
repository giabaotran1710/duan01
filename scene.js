/* Chuyển cảnh dùng chung cho các game.
 * Mỗi game gọi: <script src="../scene.js" data-game="<id>"></script> trong <head> (ngay sau maintenance.js).
 *  - Vào game: màn chuyển cảnh theo chủ đề màu của game phủ kín rồi mở ra khi trang đã tải.
 *  - Bấm các nút như "Chơi lại", "Bắt đầu", "Ván mới", "Về menu", "Trang chủ"…: màn đóng lại, nút được bấm
 *    khi màn đã che kín, rồi màn mở ra. Rời trang qua liên kết cũng đóng màn trước khi chuyển trang.
 *  - Game tự gọi được: window.sceneTransition(function () { ...đổi màn... }).
 *  - Thêm data-scene vào một nút để luôn có chuyển cảnh; data-no-scene để không bao giờ có.
 * Hiệu ứng chạy bằng CSS transition (theo thời gian thực), không đụng vào vòng lặp hay tốc độ khung hình của game. */
(function () {
  'use strict';
  if (window.sceneTransition) return;

  var me = document.currentScript;
  var gameId = me ? me.getAttribute('data-game') : null;
  var nSetTimeout = window.setTimeout.bind(window);
  var nClearTimeout = window.clearTimeout.bind(window);

  // Chủ đề từng game: [kiểu chuyển cảnh, màu 1, màu 2, màu nhấn]
  //  curtain: hai cánh màn kéo ra (cờ, bàn chơi)      iris: vòng tròn khép/mở (hành động, phản xạ)
  //  blinds : rèm sọc dọc lần lượt cuộn lên (trí tuệ)   tiles: ô vuông lật dần theo đường chéo (ghi nhớ, quan sát)
  //  diagonal: tấm chéo lướt ngang (thể thao, giải trí)
  var THEMES = {
    'word-game': ['blinds', '#1e3a8a', '#3b82f6', '#fde68a'],
    gamecaro: ['curtain', '#0f172a', '#334155', '#f87171'],
    memori: ['tiles', '#4c1d95', '#7c3aed', '#f0abfc'],
    magic: ['tiles', '#3b0764', '#a21caf', '#fde68a'],
    crab: ['diagonal', '#0c4a6e', '#0891b2', '#fed7aa'],
    reversi: ['curtain', '#14532d', '#15803d', '#f8fafc'],
    domin: ['blinds', '#111827', '#4b5563', '#fca5a5'],
    haichien: ['diagonal', '#0c2a4a', '#1d4ed8', '#bae6fd'],
    musicgame: ['iris', '#3b0764', '#9333ea', '#f9a8d4'],
    nedan: ['iris', '#111827', '#7f1d1d', '#fca5a5'],
    ghinho: ['tiles', '#78350f', '#d97706', '#fef3c7'],
    thaphaycao: ['diagonal', '#064e3b', '#059669', '#fde68a'],
    neonreflex: ['iris', '#020617', '#0e7490', '#22d3ee'],
    dapquai: ['iris', '#365314', '#65a30d', '#fef08a'],
    unogame: ['diagonal', '#7f1d1d', '#dc2626', '#fde047'],
    sieuduoibat: ['iris', '#1e1b4b', '#4338ca', '#a5b4fc'],
    blockjump: ['diagonal', '#0c4a6e', '#0284c7', '#fef9c3'],
    bidaBtn: ['curtain', '#052e16', '#15803d', '#fef3c7'],
    khinhkhi: ['iris', '#0369a1', '#38bdf8', '#fff7ed'],
    xepbonggai: ['tiles', '#1e3a8a', '#0ea5e9', '#e0f2fe'],
    xepnuoc: ['iris', '#0b2a4a', '#0891b2', '#cffafe'],
    truottuyet: ['diagonal', '#0c4a6e', '#38bdf8', '#ffffff'],
    demsao: ['iris', '#020617', '#312e81', '#fde68a'],
    bongnay: ['iris', '#7c2d12', '#ea580c', '#fed7aa'],
    demech: ['tiles', '#14532d', '#22c55e', '#fef9c3'],
    comet: ['iris', '#0f0a1f', '#4c1d95', '#fdba74'],
    sudoku: ['blinds', '#172554', '#1d4ed8', '#e0e7ff'],
    timmaulac: ['tiles', '#831843', '#db2777', '#fce7f3'],
    dayhop: ['blinds', '#451a03', '#a16207', '#fde68a'],
    cothu: ['curtain', '#3f2a0b', '#92400e', '#fde68a'],
    barricade: ['curtain', '#3b0764', '#6d28d9', '#fde68a'],
    ganangdong: ['iris', '#7c2d12', '#f59e0b', '#fff7ed'],
    dogdoku: ['blinds', '#422006', '#b45309', '#fef3c7'],
    phagach: ['iris', '#1c1917', '#b91c1c', '#fde68a'],
    truytimso: ['blinds', '#0f172a', '#334155', '#fbbf24'],
    vetcatvohinh: ['diagonal', '#070a14', '#1d2658', '#7df9ff'],
    conganh: ['curtain', '#3b1d0a', '#a16207', '#fde68a'],
    thadieu: ['diagonal', '#1f5fae', '#5d9fe0', '#ffe39a'],
    noimach: ['blinds', '#022c22', '#0f766e', '#5eead4'],
    dieukhiengiaolo: ['diagonal', '#1f2937', '#374151', '#facc15'],
    dungsidietvirus: ['iris', '#052e16', '#16a34a', '#bbf7d0'],
    colorCode: ['blinds', '#1e1b4b', '#7c3aed', '#fbcfe8'],
    latly: ['tiles', '#164e63', '#0891b2', '#ecfeff'],
    vuontraicay: ['diagonal', '#14532d', '#16a34a', '#fecaca'],
    fishsurvival: ['iris', '#082f49', '#0369a1', '#7dd3fc'],
    cotuong: ['curtain', '#450a0a', '#991b1b', '#fde68a'],
    gheptranh: ['tiles', '#312e81', '#4f46e5', '#e0e7ff'],
    covua: ['curtain', '#0b1220', '#1e3a5f', '#5cc8ff'],
    stickman: ['diagonal', '#101114', '#2378ff', '#ef3f54'],
    thamtubayes: ['iris', '#0f2a47', '#1e4a7a', '#ffd45e'],
    timkhacbiet: ['iris', '#1c1530', '#3a2a5e', '#ffb454'],
    noithu: ['tiles', '#0c3b34', '#1a7a62', '#ffe27a'],
    xepthap: ['diagonal', '#7b2a6b', '#e8577e', '#ffd28a'],
    xepgach: ['blinds', '#0a0b1e', '#2a2470', '#7c8cff'],
    cotuhuyenbi: ['tiles', '#1a0c3a', '#4a1a8a', '#ffd66b'],
    noitu: ['curtain', '#2a0c11', '#7a1f2b', '#ffcf5a']
  };
  var t = THEMES[gameId] || ['iris', '#0f172a', '#1e293b', '#93c5fd'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var kind = reduce ? 'fade' : t[0];

  // Thời gian (ms): đóng màn, mở màn, và độ trễ lệch nhau tối đa giữa các mảnh của kiểu đó
  var CLOSE_MS = reduce ? 160 : 340, OPEN_MS = reduce ? 200 : 480, HOLD_MS = reduce ? 60 : 120;
  var STAGGER = { blinds: 7 * 30, tiles: (7 + 11) * 12 }[kind] || 0;
  var ENTRY_MIN_MS = reduce ? 250 : 650, ENTRY_MAX_MS = 2000;

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;margin:0;padding:0}',
    '.root{position:fixed;inset:0;overflow:hidden;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;--d:' + CLOSE_MS + 'ms;--ease:cubic-bezier(.76,0,.24,1)}',
    '.root.opening,.root.open{--d:' + OPEN_MS + 'ms}',
    '.p{position:absolute;background:linear-gradient(135deg,var(--c1),var(--c2));transition:transform var(--d) var(--ease),clip-path var(--d) var(--ease),opacity var(--d) ease;will-change:transform}',
    // khi chưa chạy hiệu ứng (đặt thẳng trạng thái) thì không có transition
    '.root.instant .p{transition:none!important}',
    // ---- curtain: hai cánh màn ----
    '.curtain .p{top:0;bottom:0;width:50.5%}',
    '.curtain .l{left:0;box-shadow:inset -4px 0 0 var(--ac),12px 0 40px rgba(0,0,0,.45)}',
    '.curtain .r{right:0;box-shadow:inset 4px 0 0 var(--ac),-12px 0 40px rgba(0,0,0,.45);background:linear-gradient(225deg,var(--c1),var(--c2))}',
    '.curtain.opening .l,.curtain.open .l{transform:translateX(-102%)}',
    '.curtain.opening .r,.curtain.open .r{transform:translateX(102%)}',
    // ---- iris: vòng tròn ----
    '.iris .p{inset:0;background:radial-gradient(circle at 50% 50%,var(--c2),var(--c1) 70%);clip-path:circle(150% at 50% 50%)}',
    '.iris .ring{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:3px solid var(--ac);opacity:0;z-index:2}',
    '.iris.opening .p,.iris.open .p{clip-path:circle(0% at 50% 50%)}',
    '.iris.opening .ring{animation:ring var(--d) ease-out forwards}',
    '@keyframes ring{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(30)}}',
    // ---- blinds: rèm sọc dọc ----
    '.blinds .p{top:0;bottom:0;width:12.6%;left:calc(var(--i) * 12.5%);transform-origin:50% 0;transition-delay:calc(var(--i) * 30ms)}',
    '.blinds .p:nth-child(even){background:linear-gradient(180deg,var(--c2),var(--c1))}',
    '.blinds.opening .p,.blinds.open .p{transform:scaleY(0)}',
    // ---- tiles: ô vuông ----
    '.tiles .grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(12,1fr)}',
    '.tiles .p{position:relative;inset:auto;transform:scale(1.04);transition-delay:calc((var(--x) + var(--y)) * 12ms)}',
    '.tiles .p.alt{background:linear-gradient(135deg,var(--c2),var(--c1))}',
    '.tiles.opening .p,.tiles.open .p{transform:scale(0) rotate(45deg)}',
    // ---- diagonal: tấm chéo lướt ngang ----
    '.diagonal .p{top:-20%;bottom:-20%;left:-40%;width:180%;transform:skewX(-16deg) translateX(0);box-shadow:inset 6px 0 0 var(--ac),inset -6px 0 0 var(--ac)}',
    '.diagonal.from .p{transform:skewX(-16deg) translateX(-112%)}',
    '.diagonal.opening .p,.diagonal.open .p{transform:skewX(-16deg) translateX(112%)}',
    // ---- fade (người dùng chọn giảm chuyển động) ----
    '.fade .p{inset:0}',
    '.fade.opening .p,.fade.open .p{opacity:0}'
  ].join('');

  function pieces() {
    var h = '', i, x, y;
    if (kind === 'curtain') h = '<div class="p l"></div><div class="p r"></div>';
    else if (kind === 'iris') h = '<div class="p"></div><div class="ring"></div>';
    else if (kind === 'blinds') for (i = 0; i < 8; i++) h += '<div class="p" style="--i:' + i + '"></div>';
    else if (kind === 'tiles') {
      h = '<div class="grid">';
      for (y = 0; y < 12; y++) for (x = 0; x < 8; x++) h += '<div class="p' + ((x + y) % 2 ? ' alt' : '') + '" style="--x:' + x + ';--y:' + y + '"></div>';
      h += '</div>';
    } else h = '<div class="p"></div>';
    return h;
  }

  // ---- lớp phủ (Shadow DOM để CSS của game không ảnh hưởng) ----
  var host = document.createElement('scene-transition');
  host.setAttribute('aria-hidden', 'true');
  var HOST_CSS = 'position:fixed!important;inset:0!important;z-index:2147483000!important;display:block!important;margin:0!important;padding:0!important;border:0!important;background:none!important;';
  function hostState(visible) {
    host.setAttribute('style', HOST_CSS + (visible ? 'visibility:visible!important;pointer-events:auto!important;' : 'visibility:hidden!important;pointer-events:none!important;'));
  }
  var shadow = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  shadow.innerHTML = '<style>' + CSS + '</style><div class="root ' + kind + ' instant closed" style="--c1:' + t[1] + ';--c2:' + t[2] + ';--ac:' + t[3] + '">' +
    pieces() + '</div>';
  var el = shadow.querySelector('.root');
  hostState(true);
  (document.body || document.documentElement).appendChild(host);

  var busy = true, timer = 0;
  function phase(name, instant) { el.className = 'root ' + kind + (instant ? ' instant ' : ' ') + name; }

  // Đóng màn (che kín) rồi gọi done
  function cover(done) {
    nClearTimeout(timer);
    hostState(true);
    if (kind === 'diagonal') { phase('from', true); void el.offsetWidth; }
    phase('closing');
    timer = nSetTimeout(function () { phase('closed'); if (done) done(); }, CLOSE_MS + STAGGER + 20);
  }
  // Mở màn (lộ game) rồi gọi done
  function reveal(done) {
    nClearTimeout(timer);
    phase('opening');
    timer = nSetTimeout(function () { phase('open'); hostState(false); if (done) done(); }, OPEN_MS + STAGGER + 30);
  }

  // Dùng cho game: sceneTransition(fn) — đóng màn, chạy fn khi đã che kín, rồi mở màn
  function sceneTransition(fn) {
    if (busy) { if (fn) fn(); return; }
    busy = true;
    cover(function () {
      try { if (fn) fn(); } catch (e) { setTimeout(function () { throw e; }); }
      nSetTimeout(function () { reveal(function () { busy = false; }); }, HOLD_MS);
    });
  }
  window.sceneTransition = sceneTransition;

  // ---- vào game: mở màn khi trang đã tải (ít nhất ENTRY_MIN_MS để kịp thấy, tối đa ENTRY_MAX_MS) ----
  var t0 = Date.now(), entered = false;
  function enter() {
    if (entered) return;
    entered = true;
    nSetTimeout(function () { reveal(function () { busy = false; }); }, Math.max(0, ENTRY_MIN_MS - (Date.now() - t0)));
  }
  if (document.readyState === 'complete') enter(); else window.addEventListener('load', enter, { once: true });
  nSetTimeout(enter, ENTRY_MAX_MS);
  // Game đang bảo trì: lớp phủ bảo trì đã che kín, bỏ màn chuyển cảnh ngay
  function dropForMaintenance() { if (maintenanceOn()) { nClearTimeout(timer); busy = false; phase('open', true); hostState(false); } }
  if (window.gameMaintenance) {
    if (window.gameMaintenance.ready) window.gameMaintenance.ready.then(dropForMaintenance);
    if (window.gameMaintenance.onChange) window.gameMaintenance.onChange(dropForMaintenance);
  }
  // Quay lại bằng nút Back (trang lấy từ bộ nhớ đệm khi đang che màn): mở màn lại
  window.addEventListener('pageshow', function (e) { if (e.persisted) { busy = false; phase('open', true); hostState(false); } });

  // ---- tự thêm chuyển cảnh cho nút bắt đầu / chơi lại / về menu… và liên kết sang trang khác ----
  var LABELS = ['chơi lại', 'chơi tiếp', 'chơi ngay', 'chơi', 'bắt đầu', 'bắt đầu chơi', 'ván mới', 'ván tiếp', 'chơi ván mới',
    'màn sau', 'màn tiếp', 'màn tiếp theo', 'qua màn', 'chơi đơn', 'chơi đội', 'với máy', 'hai người', 'người vs người', 'người vs ai',
    'tái khởi động', 'về menu', 'trở về menu', 'menu', 'trang chủ', 'về trang chủ', 'thoát game',
    'play', 'play again', 'restart', 'replay', 'new game', 'start'];
  var LABEL_SET = {};
  LABELS.forEach(function (s) { LABEL_SET[s] = 1; });
  function labelOf(node) {
    var s = node.tagName === 'INPUT' ? node.value : node.textContent;
    return String(s || '').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function maintenanceOn() {
    try { return !!(window.gameMaintenance && gameId && window.gameMaintenance.isOff(gameId)); } catch (e) { return false; }
  }
  var passing = false;
  window.addEventListener('click', function (e) {
    if (passing) return;
    if (busy) { e.stopImmediatePropagation(); e.preventDefault(); return; }   // đang chuyển cảnh: bỏ qua bấm thêm
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || maintenanceOn()) return;
    var node = e.target instanceof Element ? e.target.closest('a[href],button,[role="button"],input[type="button"],input[type="submit"]') : null;
    if (!node || node.disabled || node.closest('[data-no-scene]')) return;

    // Liên kết sang trang khác (ví dụ về trang chủ): đóng màn rồi mới chuyển trang
    if (node.tagName === 'A') {
      var href = node.getAttribute('href') || '';
      if (/^(#|javascript:|mailto:|tel:)/i.test(href) || node.hasAttribute('download') || (node.target && node.target !== '_self')) return;
      var url;
      try { url = new URL(node.href, location.href); } catch (err) { return; }
      if (!/^https?:$/.test(url.protocol)) return;
      if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
      e.preventDefault(); e.stopImmediatePropagation();
      busy = true;
      cover(function () {
        location.href = url.href;
        // không rời trang được (bị chặn…) thì mở màn lại
        nSetTimeout(function () { if (document.visibilityState === 'visible') reveal(function () { busy = false; }); }, 4000);
      });
      return;
    }

    if (!node.hasAttribute('data-scene') && !LABEL_SET[labelOf(node)]) return;
    e.preventDefault(); e.stopImmediatePropagation();
    busy = true;
    cover(function () {
      passing = true;
      try { node.click(); } catch (err) { setTimeout(function () { throw err; }); } finally { passing = false; }
      nSetTimeout(function () { reveal(function () { busy = false; }); }, HOLD_MS);
    });
  }, true);
})();
