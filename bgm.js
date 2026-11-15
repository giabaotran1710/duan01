/* Nhạc nền lặp lại cho một trang game.
   Dùng: <script src="../bgm.js?v=..." data-src="../audio/ten.mp3" data-volume="0.35"></script>
   - Phát bằng Web Audio (không dùng thẻ audio) nên điện thoại không hiện thanh điều khiển nhạc / tên file mp3
     ở thông báo hay màn hình khoá.
   - Một nguồn phát duy nhất cho cả trang, nên chơi lại/màn mới không làm nhạc phát lại từ đầu.
   - Trình duyệt chặn tự phát tiếng nên nhạc bắt đầu ở lần chạm/bấm phím đầu tiên.
   - Tự tạm dừng khi chuyển tab/khoá màn hình và phát tiếp khi quay lại.
   - window.WebLoop(src, volume) → { play(), restart(), stop() } cho game muốn tự điều khiển (vd. phát lại từ đầu mỗi ván). */
(function () {
  'use strict';
  if (window.WebLoop) return;
  var me = document.currentScript;

  function WebLoop(src, volume) {
    var ac = null, gain = null, buf = null, loading = false, src_ = null, want = false, o = {};
    function ctx() {
      if (ac) return ac;
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); gain = ac.createGain(); gain.gain.value = volume; gain.connect(ac.destination); } catch (e) { ac = null; }
      return ac;
    }
    function load() {
      if (buf || loading || !ctx()) return;
      loading = true;
      fetch(src).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
        return new Promise(function (ok, no) { var p = ac.decodeAudioData(b, ok, no); if (p && p.then) p.then(ok, no); });
      }).then(function (b) { buf = b; loading = false; if (want) begin(); }).catch(function () { loading = false; });
    }
    function begin() {
      if (!ac || !buf || src_) return;
      src_ = ac.createBufferSource(); src_.buffer = buf; src_.loop = true; src_.connect(gain); src_.start(0);
    }
    function halt() { if (src_) { try { src_.stop(); } catch (e) {} try { src_.disconnect(); } catch (e) {} src_ = null; } }
    o.play = function () {
      if (document.hidden) return;
      want = true;
      if (!ctx()) return;
      if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
      if (buf) begin(); else load();
    };
    o.restart = function () { halt(); o.play(); };
    o.stop = function () { want = false; halt(); };
    o.suspend = function () { if (ac && ac.state === 'running') { try { ac.suspend(); } catch (e) {} } };
    o.resume = function () { if (ac && want && ac.state === 'suspended') { try { ac.resume(); } catch (e) {} } };
    o.playing = function () { return !!src_ && !!ac && ac.state === 'running'; };
    document.addEventListener('visibilitychange', function () { if (document.hidden) o.suspend(); else o.resume(); });
    window.addEventListener('pagehide', o.suspend);
    return o;
  }
  window.WebLoop = WebLoop;

  if (!me || !me.getAttribute('data-src')) return;
  var vol = parseFloat(me.getAttribute('data-volume'));
  var bgm = WebLoop(me.getAttribute('data-src'), isNaN(vol) ? 0.35 : Math.max(0, Math.min(1, vol)));
  /* giữ các lắng nghe này suốt trang: lần chạm kế tiếp sẽ bật lại nhạc nếu trình duyệt chặn */
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (!bgm.playing()) bgm.play(); }, { capture: true, passive: true });
  });
  window.__bgm = bgm;
})();
