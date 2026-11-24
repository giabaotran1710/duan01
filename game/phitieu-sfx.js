/* Âm thanh riêng của Phi tiêu trăng rằm (không dùng sfx.js chung).
 * Một tệp mp3 ghép sẵn các tiếng thật (gỗ cắm, kim loại chạm, chuông, cồng, vút gió...), cắt theo bảng IDX.
 *   PTSnd.play('stick')                 tiếng ngẫu nhiên trong nhóm 'stick'
 *   PTSnd.play('stick', { rate: 1.1 })  đổi cao độ, { vol: 0.5 } đổi to nhỏ, { i: 0 } chọn đúng biến thể
 *   PTSnd.mute(true/false), PTSnd.off() -> đang tắt?     (nhớ ở localStorage 'phitieu_snd_off')
 * Chỉ phát sau lần chạm đầu tiên (trình duyệt chặn âm thanh tự phát), tự im khi chuyển tab. */
(function () {
  'use strict';
  if (window.PTSnd) return;
  var IDX = {"throw":[[0.05,0.116],[0.316,0.172],[0.638,0.122]],"stick":[[0.909,0.2],[1.259,0.2],[1.609,0.2]],"clash":[[1.959,0.4],[2.509,0.354]],"seed":[[3.014,0.5]],"chime":[[3.664,1.1]],"gong":[[4.914,1.2]],"gong2":[[6.264,1.0]],"crack":[[7.414,0.532],[8.095,0.56]],"lose":[[8.805,0.9]],"tick":[[9.855,0.14]],"win":[[10.145,1.5]],"tap":[[11.795,0.12]]};
  var URL = '../audio/phitieu/sfx.mp3?v=1';
  var ctx = null, buf = null, loading = false, master = null, off = false, last = {};
  try { off = localStorage.getItem('phitieu_snd_off') === '1'; } catch (e) {}

  function boot() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try { ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); } catch (e) { ctx = null; return false; }
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    if (!buf && !loading) {
      loading = true;
      fetch(URL).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
        return new Promise(function (ok, no) { ctx.decodeAudioData(ab, ok, no); });
      }).then(function (b) { buf = b; }).catch(function () { loading = false; });
    }
    return true;
  }
  function play(name, o) {
    o = o || {};
    if (off || document.hidden || !boot() || !buf) return;
    var list = IDX[name]; if (!list) return;
    var i = o.i != null ? o.i % list.length : (list.length > 1 ? ((last[name] || 0) + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length : 0);
    last[name] = i;
    var seg = list[i], src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    var rate = (o.rate || 1) * (1 + (Math.random() - 0.5) * 0.06);
    src.playbackRate.value = rate;
    g.gain.value = o.vol == null ? 1 : o.vol;
    src.connect(g); g.connect(master);
    try { src.start(ctx.currentTime + (o.delay || 0), seg[0], seg[1] + 0.02); } catch (e) {}
  }
  function unlock() { boot(); }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { window.addEventListener(t, unlock, { passive: true }); });
  window.PTSnd = {
    play: play, unlock: unlock,
    off: function () { return off; },
    mute: function (v) { off = !!v; try { localStorage.setItem('phitieu_snd_off', off ? '1' : '0'); } catch (e) {} }
  };
})();
