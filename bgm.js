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

  /* WebAudioEl: thay thế new Audio(src) / <audio> bằng Web Audio, dùng cùng cách gọi:
     play() (trả Promise), pause(), load(), cloneNode(), currentTime, volume, loop, muted, paused, addEventListener.
     Dùng chung một AudioContext và bộ nhớ đệm giải mã cho cả trang. */
  var sharedAc = null, buffers = {}, pending = {}, instances = [];
  function sAc() {
    if (sharedAc) return sharedAc;
    try { sharedAc = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { sharedAc = null; }
    return sharedAc;
  }
  function decode(url, cb, fail) {
    if (buffers[url]) { cb(buffers[url]); return; }
    if (!pending[url]) {
      pending[url] = [];
      fetch(url).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(function (b) {
        return new Promise(function (ok, no) { var q = sharedAc.decodeAudioData(b, ok, no); if (q && q.then) q.then(ok, no); });
      }).then(function (buf) { buffers[url] = buf; var l = pending[url]; delete pending[url]; l.forEach(function (f) { f[0](buf); }); })
        .catch(function (e) { var l = pending[url]; delete pending[url]; l.forEach(function (f) { f[1](e); }); });
    }
    pending[url].push([cb, fail || function () {}]);
  }
  function WebAudioEl(url) {
    if (!(this instanceof WebAudioEl)) return new WebAudioEl(url);
    var self = this, node = null, gain = null, startedAt = 0, offset = 0, playing = false, ls = {};
    self.src = url; self.loop = false; self.preload = 'auto'; self._vol = 1; self.muted = false; self.autoplay = false;
    Object.defineProperty(self, 'volume', { get: function () { return self._vol; }, set: function (v) { self._vol = Math.max(0, Math.min(1, +v || 0)); apply(); } });
    Object.defineProperty(self, 'paused', { get: function () { return !playing; } });
    Object.defineProperty(self, 'currentTime', {
      get: function () { return pos(); },
      set: function (t) { offset = Math.max(0, +t || 0); if (playing) { stopNode(); startNode(); } }
    });
    function emit(n, ev) { (ls[n] || []).slice().forEach(function (f) { try { f.call(self, ev || { type: n }); } catch (e) {} }); if (typeof self['on' + n] === 'function') { try { self['on' + n]({ type: n }); } catch (e) {} } }
    self.addEventListener = function (n, f) { (ls[n] = ls[n] || []).push(f); };
    self.removeEventListener = function (n, f) { ls[n] = (ls[n] || []).filter(function (x) { return x !== f; }); };
    function apply() { if (gain) gain.gain.value = self.muted ? 0 : self._vol; }
    function pos() {
      var b = buffers[url]; if (!playing || !b || !sharedAc) return offset;
      var t = offset + (sharedAc.currentTime - startedAt);
      return self.loop ? t % b.duration : Math.min(t, b.duration);
    }
    function stopNode() { if (node) { node.onended = null; try { node.stop(); } catch (e) {} try { node.disconnect(); } catch (e) {} node = null; } }
    function startNode() {
      var b = buffers[url]; if (!b || !sharedAc) return;
      gain = gain || sharedAc.createGain(); gain.connect(sharedAc.destination); apply();
      node = sharedAc.createBufferSource(); node.buffer = b; node.loop = !!self.loop; node.connect(gain);
      var off = offset >= b.duration ? 0 : offset; offset = off;
      startedAt = sharedAc.currentTime; node.start(0, off);
      var me_ = node;
      node.onended = function () { if (node === me_ && !self.loop) { node = null; playing = false; offset = 0; emit('ended'); } };
    }
    self.load = function () { if (sAc()) decode(url, function () { emit('canplaythrough'); }, function (e) { emit('error', e); }); };
    self.play = function () {
      var c = sAc();
      if (!c) return Promise.reject(new Error('Web Audio không khả dụng'));
      if (playing) return Promise.resolve();
      playing = true; self._want = true;
      if (instances.indexOf(self) < 0) instances.push(self);
      if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
      return new Promise(function (ok, no) {
        decode(url, function () { if (playing && !node) { startNode(); } emit('canplaythrough'); ok(); }, function (e) { playing = false; emit('error', e); no(e); });
      });
    };
    self.pause = function () { if (playing) { offset = pos(); } playing = false; self._want = false; stopNode(); };
    self.cloneNode = function () { var c = new WebAudioEl(url); c.loop = self.loop; c._vol = self._vol; c.muted = self.muted; return c; };
    self._resume = function () { if (playing && !node) { var b = buffers[url]; if (b) startNode(); } };
  }
  window.WebAudioEl = WebAudioEl;
  /* trình duyệt chỉ cho phát sau thao tác của người chơi: mở khoá ở lần chạm kế tiếp */
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (sharedAc && sharedAc.state === 'suspended' && !document.hidden) { try { sharedAc.resume(); } catch (e) {} } }, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (!sharedAc) return;
    if (document.hidden) { try { sharedAc.suspend(); } catch (e) {} } else { try { sharedAc.resume(); } catch (e) {} }
  });
  window.addEventListener('pagehide', function () { if (sharedAc) { try { sharedAc.suspend(); } catch (e) {} } });

  if (!me || !me.getAttribute('data-src')) return;
  var vol = parseFloat(me.getAttribute('data-volume'));
  var bgm = WebLoop(me.getAttribute('data-src'), isNaN(vol) ? 0.35 : Math.max(0, Math.min(1, vol)));
  /* giữ các lắng nghe này suốt trang: lần chạm kế tiếp sẽ bật lại nhạc nếu trình duyệt chặn */
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, function () { if (!bgm.playing()) bgm.play(); }, { capture: true, passive: true });
  });
  window.__bgm = bgm;
})();
