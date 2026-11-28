/* Chặn chơi màn hình ngang cho game chỉ hỗ trợ màn hình dọc.
   Dùng: <link rel="stylesheet" href="../rotate-lock.css?v=..."> + <script src="../rotate-lock.js?v=..."></script>
   Khi lớp phủ bật/tắt, phát sự kiện window 'rotatelock' (detail.locked) để game tạm dừng. */
(function () {
  'use strict';
  if (window.RotateLock) return;
  var mq = window.matchMedia ? matchMedia('(orientation:landscape) and (max-height:560px) and (hover:none)') : null;
  var api = window.RotateLock = { locked: false };
  function mount() {
    if (document.getElementById('rotateLock')) return;
    var d = document.createElement('div');
    d.id = 'rotateLock';
    d.setAttribute('role', 'alertdialog');
    d.setAttribute('aria-labelledby', 'rotateLockTitle');
    d.innerHTML = '<div class="rl-card">' +
      '<svg class="rl-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="1.5" width="13" height="21" rx="3" fill="currentColor"/>' +
      '<rect x="7.3" y="4" width="9.4" height="14.2" rx="1" fill="#fff"/><circle cx="12" cy="20.2" r="1" fill="#fff"/></svg>' +
      '<h2 id="rotateLockTitle">Vui lòng xoay dọc màn hình</h2>' +
      '<p>Trò chơi chỉ hỗ trợ màn hình dọc.</p></div>';
    ['touchstart', 'touchmove', 'pointerdown', 'click'].forEach(function (t) {
      d.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
    });
    document.body.appendChild(d);
  }
  function check() {
    var on = !!(mq && mq.matches);
    if (on === api.locked) return;
    api.locked = on;
    try { window.dispatchEvent(new CustomEvent('rotatelock', { detail: { locked: on } })); } catch (e) {}
  }
  function init() { mount(); check(); }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
  if (mq) { if (mq.addEventListener) mq.addEventListener('change', check); else if (mq.addListener) mq.addListener(check); }
  window.addEventListener('resize', check);
})();
