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
      e.stopImmediatePropagation();
      // Trong lớp phủ vẫn giữ hành vi mặc định để bấm được "Về trang chủ".
      var inOverlay = overlay && e.target instanceof Node && overlay.contains(e.target);
      if (!inOverlay && e.cancelable && t !== 'visibilitychange') e.preventDefault();
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

  function show() {
    overlay = document.createElement('div');
    overlay.setAttribute('role', 'alertdialog');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
      'justify-content:center;padding:24px;box-sizing:border-box;background:linear-gradient(135deg,#0f172a,#1e293b);' +
      'color:#fff;font-family:Arial,Helvetica,sans-serif;text-align:center;touch-action:none;';
    var box = document.createElement('div');
    box.style.cssText = 'max-width:420px';
    var icon = document.createElement('div');
    icon.textContent = '🛠️';
    icon.style.cssText = 'font-size:56px;margin-bottom:16px';
    var p = document.createElement('p');
    p.textContent = message(gameId);
    p.style.cssText = 'font-size:20px;line-height:1.5;margin:0 0 24px;font-weight:700';
    var a = document.createElement('a');
    a.href = new URL('./', src).href;
    a.textContent = 'Về trang chủ';
    a.style.cssText = 'display:inline-block;padding:10px 22px;border-radius:999px;background:#38bdf8;color:#0f172a;' +
      'text-decoration:none;font-weight:700';
    box.appendChild(icon); box.appendChild(p); box.appendChild(a);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  ready.then(function () {
    if (!isOff(gameId)) return;
    freeze();
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show, { once: true });
  });
})();
