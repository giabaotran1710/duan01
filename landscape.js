/* Lõi "xoay ngang" dùng chung cho các game chỉ chơi màn hình ngang.
   Dùng: <script src="../landscape.js?v=..."></script> rồi gọi
     LandscapeGate.bind(nútOK, { note: phầnTửGhiChú, onSkip: hàm })
   - Nút OK: vào toàn màn hình rồi khóa hướng ngang (screen.orientation.lock), nên máy tự xoay ngang, người chơi không phải xoay tay.
   - Máy không hỗ trợ (vd. iPhone/Safari): hiện ghi chú nhờ xoay tay; bấm lại thì thử xoay lần nữa. Không có đường chơi màn hình dọc (onSkip bị bỏ qua).
   - Việc hiện/ẩn lớp phủ "xoay ngang" vẫn do từng game tự quyết theo kích thước khung nhìn (portrait hay không). */
(function () {
  'use strict';
  if (window.LandscapeGate) return;
  function isLandscape() { return window.innerWidth >= window.innerHeight; }
  function goFullscreen() {
    var el = document.documentElement, f = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (!f || document.fullscreenElement || document.webkitFullscreenElement) return Promise.resolve();
    try { var p = f.call(el, { navigationUI: 'hide' }); return p && p.then ? p.then(function () {}, function () {}) : Promise.resolve(); } catch (e) { return Promise.resolve(); }
  }
  function lockLandscape() {
    try { if (screen.orientation && screen.orientation.lock) return screen.orientation.lock('landscape').then(function () { return true; }, function () { return false; }); } catch (e) {}
    return Promise.resolve(false);
  }
  /* trả về Promise<true> nếu đang ở (hoặc đã chuyển sang) màn hình ngang */
  function request() {
    return goFullscreen().then(lockLandscape).then(function (ok) {
      return new Promise(function (res) { setTimeout(function () { res(ok || isLandscape()); }, 400); });
    });
  }
  function bind(btn, opt) {
    opt = opt || {};
    if (!btn.textContent.trim()) btn.textContent = 'OK';
    btn.onclick = function () {
      /* bấm lại: thử xoay lần nữa (không còn đường chơi màn hình dọc; opt.onSkip bị bỏ qua) */
      request().then(function (ok) {
        if (ok) { if (opt.note) opt.note.textContent = ''; if (opt.onOk) opt.onOk(); return; }
        if (opt.note) opt.note.textContent = 'Máy này chưa tự xoay được. Hãy tắt khóa xoay màn hình rồi xoay ngang máy.';
      });
    };
  }
  window.LandscapeGate = { request: request, bind: bind, isLandscape: isLandscape };
})();
