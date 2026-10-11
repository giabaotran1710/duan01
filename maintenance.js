/* Công tắc bảo trì dùng chung cho mọi game.
 * Mỗi game gọi: <script src="../maintenance.js" data-game="<id>"></script> ở đầu <head>.
 * Trang chủ gọi không có data-game và dùng window.gameMaintenance để làm mờ thẻ game.
 * Trạng thái lấy từ maintenance.json (cùng thư mục với file này). Lỗi mạng/file hỏng => chơi bình thường. */
(function () {
  'use strict';
  var DEFAULT_MSG = 'Trò chơi đang được bảo trì. Vui lòng trở lại sau.';
  var me = document.currentScript;
  var src = (me && me.src) || location.href;
  var gameId = me ? me.getAttribute('data-game') : null;
  var cfg = null;

  function entry(id) {
    return cfg && cfg.games && id && cfg.games[id] ? cfg.games[id] : null;
  }
  function isOff(id) {
    if (!cfg) return false;
    if (cfg.all && cfg.all.on === true) return true;
    var e = entry(id);
    return !!(e && e.on === true);
  }
  function message(id) {
    var e = entry(id);
    if (e && e.on === true && e.message) return String(e.message);
    if (cfg && cfg.all && cfg.all.on === true && cfg.all.message) return String(cfg.all.message);
    return DEFAULT_MSG;
  }

  var ready = fetch(new URL('maintenance.json', src).href + '?t=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { cfg = j && typeof j === 'object' ? j : null; })
    .catch(function () { cfg = null; });

  window.gameMaintenance = {
    ready: ready,
    isOff: isOff,
    message: message
  };

  if (!gameId) return; // trang chủ: chỉ cung cấp dữ liệu

  // ---- Chế độ trong game ----
  var blocked = false;
  var overlay = null;

  // Ghi nhận AudioContext để tắt tiếng khi bảo trì.
  var audioCtxs = [];
  ['AudioContext', 'webkitAudioContext'].forEach(function (k) {
    var AC = window[k];
    if (typeof AC !== 'function' || AC.__mtWrapped) return;
    var W = class extends AC {
      constructor() { super(...arguments); audioCtxs.push(this); }
    };
    W.__mtWrapped = true;
    window[k] = W;
  });

  // Chặn mọi thao tác của người chơi khi đang bảo trì (đăng ký trước code game).
  ['pointerdown', 'pointerup', 'pointermove', 'pointercancel', 'mousedown', 'mouseup', 'mousemove',
   'click', 'dblclick', 'contextmenu', 'touchstart', 'touchmove', 'touchend', 'touchcancel',
   'keydown', 'keyup', 'keypress', 'wheel', 'visibilitychange'].forEach(function (t) {
    window.addEventListener(t, function (e) {
      if (!blocked) return;
      // Trong lớp phủ: để các nút hoạt động (chuột/chạm/click, và Tab/Enter/Space cho bàn phím).
      var inOverlay = overlay && e.target instanceof Node && overlay.contains(e.target);
      var navKey = t.indexOf('key') === 0 && (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ');
      if (inOverlay && (t.indexOf('key') !== 0 || navKey)) return;
      e.stopImmediatePropagation();
      if (e.cancelable && t !== 'visibilitychange') e.preventDefault();
    }, { capture: true, passive: false });
  });

  function freeze() {
    blocked = true;
    // Dừng vòng lặp và mọi timer của game.
    window.requestAnimationFrame = function () { return 0; };
    var last = setTimeout(function () {}, 0);
    for (var i = 0; i <= last; i++) { clearTimeout(i); clearInterval(i); }
    window.setTimeout = window.setInterval = function () { return 0; };
    // Tắt âm thanh.
    audioCtxs.forEach(function (c) { try { if (c.state !== 'closed') c.suspend().catch(function () {}); } catch (e) {} });
    document.querySelectorAll('audio,video').forEach(function (m) { try { m.pause(); } catch (e) {} });
    HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  }

  var CSS = [
    ':host{all:initial}',
    '*{box-sizing:border-box;margin:0;padding:0}',
    '.wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:20px;overflow:hidden;',
    'font-family:"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;color:#e8eefc;',
    'background:radial-gradient(1200px 700px at 15% 10%,#243b8a55,transparent 60%),radial-gradient(900px 600px at 90% 95%,#7c3aed44,transparent 60%),linear-gradient(160deg,#070b1a,#0d1530 55%,#0a0f24);touch-action:none}',
    '.grid{position:absolute;inset:-60px;background-image:linear-gradient(#ffffff0a 1px,transparent 1px),linear-gradient(90deg,#ffffff0a 1px,transparent 1px);background-size:44px 44px;',
    '-webkit-mask-image:radial-gradient(circle at 50% 45%,#000 10%,transparent 70%);mask-image:radial-gradient(circle at 50% 45%,#000 10%,transparent 70%);animation:pan 14s linear infinite}',
    '.orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:.55;animation:float 9s ease-in-out infinite}',
    '.o1{width:280px;height:280px;background:#2563eb;left:-70px;top:12%}',
    '.o2{width:240px;height:240px;background:#a855f7;right:-60px;bottom:10%;animation-delay:-4s}',
    '.o3{width:160px;height:160px;background:#06b6d4;left:55%;top:-50px;animation-delay:-2s;opacity:.35}',
    '.card{position:relative;width:min(440px,100%);padding:36px 28px 28px;text-align:center;border-radius:28px;',
    'background:linear-gradient(160deg,#ffffff1c,#ffffff08);border:1px solid #ffffff26;',
    'box-shadow:0 30px 80px #00000066,inset 0 1px 0 #ffffff30;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);animation:rise .7s cubic-bezier(.2,.8,.2,1) both}',
    '.gears{position:relative;width:132px;height:112px;margin:0 auto 18px}',
    '.gear{position:absolute;fill:none;stroke-linejoin:round}',
    '.g1{left:0;top:10px;width:84px;height:84px;color:#7dd3fc;animation:spin 8s linear infinite}',
    '.g2{right:0;top:0;width:56px;height:56px;color:#c4b5fd;animation:spin 5.3s linear infinite reverse}',
    '.g3{right:14px;bottom:0;width:38px;height:38px;color:#67e8f9;animation:spin 3.6s linear infinite}',
    '.gear path{fill:currentColor;fill-opacity:.16;stroke:currentColor;stroke-width:2.2}',
    '.gear circle{fill:none;stroke:currentColor;stroke-width:2.2}',
    '.glow{filter:drop-shadow(0 0 10px currentColor)}',
    '.badge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;background:#fbbf2418;border:1px solid #fbbf2455;color:#fcd34d;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}',
    '.dot{width:8px;height:8px;border-radius:50%;background:#fbbf24;box-shadow:0 0 0 0 #fbbf24aa;animation:ping 1.8s ease-out infinite}',
    'h1{margin:16px 0 10px;font-size:clamp(26px,7vw,34px);line-height:1.15;font-weight:800;letter-spacing:.01em;background:linear-gradient(90deg,#fff,#a5c8ff 60%,#d8b4fe);-webkit-background-clip:text;background-clip:text;color:transparent}',
    'p{font-size:16.5px;line-height:1.6;color:#c9d4f0;margin:0 auto;max-width:34ch;text-wrap:balance}',
    '.bar{position:relative;height:6px;border-radius:99px;background:#ffffff14;overflow:hidden;margin:24px auto 0;width:78%}',
    '.bar:after{content:"";position:absolute;top:0;bottom:0;width:38%;border-radius:inherit;background:linear-gradient(90deg,transparent,#60a5fa,#c084fc,transparent);animation:slide 1.9s ease-in-out infinite}',
    '.btns{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:26px}',
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-width:140px;padding:12px 22px;border-radius:14px;font:inherit;font-size:15px;font-weight:700;cursor:pointer;text-decoration:none;border:1px solid transparent;transition:transform .18s,box-shadow .18s,background .18s}',
    '.btn:focus-visible{outline:2px solid #93c5fd;outline-offset:3px}',
    '.pri{color:#06122e;background:linear-gradient(135deg,#7dd3fc,#a5b4fc);box-shadow:0 8px 24px #38bdf855}',
    '.pri:hover{transform:translateY(-2px);box-shadow:0 12px 30px #38bdf877}',
    '.sec{color:#e8eefc;background:#ffffff10;border-color:#ffffff2a}',
    '.sec:hover{background:#ffffff1c;transform:translateY(-2px)}',
    '.btn:active{transform:scale(.97)}',
    '.foot{margin-top:20px;font-size:12.5px;color:#8fa0c8}',
    '@keyframes spin{to{transform:rotate(360deg)}}',
    '@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-28px)}}',
    '@keyframes pan{to{transform:translate(44px,44px)}}',
    '@keyframes rise{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}',
    '@keyframes slide{0%{left:-40%}100%{left:102%}}',
    '@keyframes ping{70%{box-shadow:0 0 0 9px #fbbf2400}100%{box-shadow:0 0 0 0 #fbbf2400}}',
    '@media (prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important}}',
    '@media (max-height:520px){.gears{display:none}.card{padding:22px}}'
  ].join('');

  // Bánh răng 8 răng: thân tròn + răng, vẽ bằng path để không cần ảnh ngoài.
  function gearSvg(cls) {
    var teeth = '', n = 8, i;
    for (i = 0; i < n; i++) {
      teeth += '<rect x="-4.5" y="-45" width="9" height="15" rx="2" transform="rotate(' + (i * 360 / n) + ')"/>';
    }
    return '<svg class="gear ' + cls + '" viewBox="-50 -50 100 100" aria-hidden="true">' +
      '<g fill="currentColor" fill-opacity=".16" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round">' + teeth +
      '<circle r="36"/></g><circle r="14" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
  }

  function show() {
    // Host nằm ngoài CSS của game; toàn bộ style nằm trong shadow root nên không bị game ghi đè.
    overlay = document.createElement('div');
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:block;';
    var root = overlay.attachShadow ? overlay.attachShadow({ mode: 'open' }) : overlay;

    var style = document.createElement('style');
    style.textContent = CSS;

    var wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.innerHTML =
      '<div class="grid"></div><div class="orb o1"></div><div class="orb o2"></div><div class="orb o3"></div>' +
      '<div class="card">' +
        '<div class="gears glow">' + gearSvg('g1') + gearSvg('g2') + gearSvg('g3') + '</div>' +
        '<span class="badge"><i class="dot"></i>Đang bảo trì</span>' +
        '<h1>Sắp quay lại thôi!</h1>' +
        '<p class="msg"></p>' +
        '<div class="bar" role="presentation"></div>' +
        '<div class="btns"></div>' +
        '<div class="foot">Cảm ơn bạn đã kiên nhẫn 💙</div>' +
      '</div>';
    wrap.querySelector('.msg').textContent = message(gameId);

    var home = document.createElement('a');
    home.className = 'btn pri';
    home.href = new URL('./', src).href;
    home.textContent = '🏠 Về trang chủ';
    var retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn sec';
    retry.textContent = '↻ Thử lại';
    retry.addEventListener('click', function () { location.reload(); });
    var btns = wrap.querySelector('.btns');
    btns.appendChild(home);
    btns.appendChild(retry);

    root.appendChild(style);
    root.appendChild(wrap);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    try { home.focus({ preventScroll: true }); } catch (e) {}
  }

  ready.then(function () {
    if (!isOff(gameId)) return;
    freeze();
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show, { once: true });
  });
})();
