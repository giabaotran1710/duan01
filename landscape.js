/* Lõi "xoay ngang" dùng chung cho các game chỉ chơi màn hình ngang.
   Dùng: <script src="../landscape.js?v=..."></script> rồi gọi
     LandscapeGate.bind(nútOK, { note: phầnTửGhiChú, onSkip: hàm })
   - Nút OK: vào toàn màn hình rồi khóa hướng ngang (screen.orientation.lock), nên máy tự xoay ngang, người chơi không phải xoay tay.
   - Máy không hỗ trợ (vd. iPhone/Safari): hiện ghi chú nhờ xoay tay; bấm OK lần nữa thì chơi tiếp ở màn hình dọc (onSkip).
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
    opt = opt || {}; var failed = false;
    btn.textContent = 'OK';
    btn.onclick = function () {
      if (failed) { if (opt.onSkip) opt.onSkip(); return; }
      request().then(function (ok) {
        if (ok) { if (opt.onOk) opt.onOk(); return; }
        failed = true;
        if (opt.note) opt.note.textContent = 'Máy này chưa tự xoay được. Hãy tắt khóa xoay màn hình rồi xoay ngang máy, hoặc bấm OK lần nữa để chơi màn hình dọc.';
      });
    };
  }
  window.LandscapeGate = { request: request, bind: bind, isLandscape: isLandscape };
})();
