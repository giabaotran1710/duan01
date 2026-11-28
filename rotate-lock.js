/* Lớp phủ xoay màn hình dùng chung cho game chỉ chơi một hướng.
   Dùng: <link rel="stylesheet" href="../rotate-lock.css?v=..."> + <script src="../rotate-lock.js?v=..." [data-mode="landscape"]></script>
   - Mặc định chặn màn ngang (game chỉ dọc); data-mode="landscape" chặn màn dọc (game chỉ ngang).
   - Khi lớp phủ bật/tắt, phát sự kiện window 'rotatelock' (detail.locked) để game tạm dừng.
   - data-mode="none": chỉ nạp RotateLock.html() cho game tự quản lớp phủ (gắn class rl-screen). */
(function () {
  'use strict';
  if (window.RotateLock) return;
  var me = document.currentScript, mode = (me && me.getAttribute('data-mode')) || 'portrait';
  var Q = { portrait: '(orientation:landscape) and (max-height:560px) and (hover:none)',
            landscape: '(orientation:portrait) and (max-width:760px) and (hover:none)' };
  var PHONE = '<svg class="rl-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.5" y="1.5" width="13" height="21" rx="3" fill="currentColor"/>' +
    '<rect x="7.3" y="4" width="9.4" height="14.2" rx="1" fill="#fff"/><circle cx="12" cy="20.2" r="1" fill="#fff"/></svg>';
  /* Nội dung thẻ chuẩn; want = hướng game cần ('portrait' | 'landscape') */
  function html(want, idTitle) {
    var land = want === 'landscape';
    return '<div class="rl-card' + (land ? ' rl-land' : '') + '">' + PHONE +
      '<h2' + (idTitle ? ' id="' + idTitle + '"' : '') + '>Vui lòng xoay ' + (land ? 'ngang' : 'dọc') + ' màn hình</h2>' +
      '<p>Trò chơi chỉ hỗ trợ màn hình ' + (land ? 'ngang' : 'dọc') + '.</p></div>';
  }
  var api = window.RotateLock = { locked: false, mode: mode, html: html };
  if (mode === 'none') return;
  var mq = window.matchMedia ? matchMedia(Q[mode] || Q.portrait) : null;
  function mount() {
    if (document.getElementById('rotateLock')) return;
    var d = document.createElement('div');
    d.id = 'rotateLock';
    d.className = 'rl-screen ' + (mode === 'landscape' ? 'rl-land' : 'rl-port');
    d.setAttribute('role', 'alertdialog');
    d.setAttribute('aria-labelledby', 'rotateLockTitle');
    d.innerHTML = html(mode, 'rotateLockTitle');
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
