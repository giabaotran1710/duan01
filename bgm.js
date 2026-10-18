/* Nhạc nền lặp lại cho một trang game.
   Dùng: <script src="../bgm.js?v=..." data-src="../audio/ten.mp3" data-volume="0.35"></script>
   - Một đối tượng Audio duy nhất cho cả trang, nên chơi lại/màn mới không làm nhạc phát lại từ đầu.
   - Trình duyệt chặn tự phát tiếng nên nhạc bắt đầu ở lần chạm/bấm phím đầu tiên (nếu được phát ngay thì chạy luôn).
   - Tự tạm dừng khi chuyển tab/khoá màn hình và phát tiếp khi quay lại. */
(function () {
  'use strict';
  var me = document.currentScript;
  if (!me || !me.getAttribute('data-src')) return;
  var vol = parseFloat(me.getAttribute('data-volume'));
  var bgm = new Audio(me.getAttribute('data-src'));
  bgm.loop = true;
  bgm.preload = 'auto';
  bgm.volume = isNaN(vol) ? 0.35 : Math.max(0, Math.min(1, vol));

  /* giữ các lắng nghe này suốt trang: nếu trình duyệt chặn phát lại sau khi quay lại tab, lần chạm kế tiếp sẽ bật lại nhạc */
  function play() {
    if (document.hidden || !bgm.paused) return;
    var p = bgm.play();
    if (p && p.catch) p.catch(function () { /* chưa có thao tác của người chơi: thử lại ở lần sau */ });
  }
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) { window.addEventListener(ev, play, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) bgm.pause(); else play(); });
  window.addEventListener('pagehide', function () { bgm.pause(); });
  play();
  window.__bgm = bgm;
})();
