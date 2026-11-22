/* Hiệu ứng âm thanh ngắn dùng chung cho các game, tổng hợp bằng Web Audio (không cần tệp âm thanh).
 * Nạp: <script src="../sfx.js"></script>  rồi gọi SFX.play('ok'), SFX.play('win'), SFX.play('tap', { pitch: 1.2, vol: 0.6 }) ...
 * Âm có sẵn: tap, select, place, move, capture, ok, bad, win, lose, pick, coin, hit, bump, jump, pop,
 *            flip, whoosh, tick, level, shoot, boom, dice, splash, deal, warn, undo, clack.
 * - Chỉ tạo AudioContext sau lần chạm/bấm phím đầu tiên (trình duyệt mới cho phép), trước đó gọi play() không phát gì.
 * - Âm lượng nhỏ, đi qua bộ lọc thấp (cắt phần chói trên ~4,5 kHz) và bộ nén, mọi âm đều có tăng/giảm mềm nên không "bụp".
 * - Cùng một âm gọi dồn dập trong 40 ms chỉ phát một lần; tối đa 10 âm cùng lúc.
 * - Tự im khi chuyển tab/khoá màn hình. SFX.mute(true/false) tắt/bật, nhớ trong localStorage 'sfx_off'.
 * - Game có nút tắt tiếng riêng: SFX.gate(function(){ return soundOn; }) để SFX nghe theo nút đó. */
(function () {
  'use strict';
  if (window.SFX) return;
  var ac = null, out = null, noiseBuf = null, unlocked = false, live = 0, lastAt = {}, gateFn = null;
  var off = false;
  try { off = localStorage.getItem('sfx_off') === '1'; } catch (e) {}

  function ctx() {
    if (ac) return ac;
    try {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ac = new A();
      var master = ac.createGain(); master.gain.value = 0.55;
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4500; lp.Q.value = 0.5;
      var comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
      master.connect(lp); lp.connect(comp); comp.connect(ac.destination);
      out = master;
      var n = Math.floor(ac.sampleRate * 0.6), d;
      noiseBuf = ac.createBuffer(1, n, ac.sampleRate); d = noiseBuf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
    return ac;
  }
  function unlock() {
    unlocked = true;
    var c = ctx();
    if (c && c.state === 'suspended' && !document.hidden) { try { c.resume(); } catch (e) {} }
  }
  ['pointerdown', 'touchstart', 'touchend', 'mousedown', 'keydown', 'click'].forEach(function (ev) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (!ac) return;
    if (document.hidden) { try { ac.suspend(); } catch (e) {} } else if (unlocked) { try { ac.resume(); } catch (e) {} }
  });
  window.addEventListener('pagehide', function () { if (ac) { try { ac.suspend(); } catch (e) {} } });

  /* một nốt: tần số f (có thể trượt tới f2), dạng sóng, độ dài, âm lượng, trễ */
  function tone(f, f2, dur, type, vol, delay) {
    var t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2 && f2 !== f) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * G, t + Math.min(0.012, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out);
    track(o, t, dur);
  }
  /* tiếng nhiễu lọc: gõ, va, gió, nước */
  function noise(dur, vol, type, freq, freq2, q, delay) {
    var t = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq || 1000, t); f.Q.value = q || 0.8;
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur * 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol * G, t + Math.min(0.008, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out);
    track(s, t, dur);
  }
  function track(node, t, dur) {
    live++;
    node.onended = function () { live = Math.max(0, live - 1); try { node.disconnect(); } catch (e) {} };
    node.start(t); node.stop(t + dur + 0.02);
  }

  var P = 1, G = 1; // hệ số cao độ / âm lượng cho lần phát hiện tại
  var V = {
    tap: function () { tone(620 * P, 480 * P, 0.06, 'triangle', 0.22); },
    select: function () { tone(740 * P, 0, 0.07, 'sine', 0.2); tone(1110 * P, 0, 0.09, 'sine', 0.08, 0.035); },
    place: function () { tone(240 * P, 150 * P, 0.1, 'triangle', 0.32); noise(0.04, 0.12, 'bandpass', 1800 * P, 0, 1.2); },
    move: function () { tone(330 * P, 260 * P, 0.08, 'sine', 0.28); noise(0.035, 0.12, 'bandpass', 1400 * P, 0, 2); },
    capture: function () { V.move(); tone(250 * P, 180 * P, 0.1, 'triangle', 0.24, 0.07); noise(0.04, 0.12, 'bandpass', 1100, 0, 2, 0.07); },
    ok: function () { tone(660 * P, 0, 0.1, 'triangle', 0.22); tone(990 * P, 0, 0.18, 'triangle', 0.2, 0.08); },
    bad: function () { tone(300, 210, 0.2, 'triangle', 0.28); tone(225, 160, 0.26, 'sine', 0.2, 0.09); },
    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f * P, 0, 0.22, 'triangle', 0.2, i * 0.1); });
      tone(1047 * P, 0, 0.5, 'sine', 0.1, 0.4); tone(784 * P, 0, 0.5, 'sine', 0.08, 0.4);
    },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, f * 0.97, 0.3, 'triangle', 0.22, i * 0.18); }); tone(196, 180, 0.6, 'sine', 0.16, 0.54); },
    pick: function () { tone(880 * P, 1320 * P, 0.09, 'sine', 0.2); },
    coin: function () { tone(988 * P, 0, 0.06, 'square', 0.07); tone(1319 * P, 0, 0.2, 'triangle', 0.16, 0.06); },
    hit: function () { tone(150 * P, 70, 0.16, 'sine', 0.38); noise(0.12, 0.2, 'lowpass', 1200, 300, 0.7); },
    bump: function () { tone(200 * P, 120 * P, 0.07, 'sine', 0.26); },
    jump: function () { tone(320 * P, 640 * P, 0.13, 'triangle', 0.18); },
    pop: function () { tone(520 * P, 980 * P, 0.07, 'sine', 0.22); },
    flip: function () { noise(0.05, 0.16, 'bandpass', 2200 * P, 1400 * P, 1.4); tone(500 * P, 0, 0.04, 'triangle', 0.07); },
    whoosh: function () { noise(0.26, 0.15, 'bandpass', 450 * P, 1500 * P, 1.1); },
    tick: function () { tone(1250 * P, 0, 0.03, 'sine', 0.1); },
    level: function () { [587, 740, 880].forEach(function (f, i) { tone(f * P, 0, 0.15, 'triangle', 0.18, i * 0.08); }); },
    shoot: function () { tone(700 * P, 220 * P, 0.09, 'square', 0.06); noise(0.06, 0.1, 'bandpass', 1500 * P, 600, 1); },
    boom: function () { tone(110, 45, 0.4, 'sine', 0.42); noise(0.45, 0.3, 'lowpass', 900, 160, 0.7); },
    dice: function () { for (var i = 0; i < 5; i++) noise(0.03, 0.12, 'bandpass', 1500 + i * 180, 0, 2.5, i * 0.055 + Math.random() * 0.02); },
    splash: function () { noise(0.3, 0.18, 'bandpass', 1300, 380, 0.9); tone(400 * P, 180 * P, 0.16, 'sine', 0.1); },
    deal: function () { noise(0.07, 0.14, 'bandpass', 1800 * P, 900 * P, 1); },
    warn: function () { tone(520, 0, 0.1, 'triangle', 0.16); tone(520, 0, 0.1, 'triangle', 0.16, 0.16); },
    clack: function () { tone(1150 * P, 900 * P, 0.035, 'sine', 0.3); noise(0.03, 0.14, 'bandpass', 2600 * P, 0, 1.5); },
    undo: function () { tone(640 * P, 420 * P, 0.1, 'triangle', 0.18); }
  };

  function play(name, opt) {
    if (off || !unlocked) return;
    if (gateFn) { try { if (!gateFn()) return; } catch (e) {} }
    var c = ctx();
    if (!c || !V[name] || document.hidden) return;
    if (c.state === 'suspended') { try { c.resume(); } catch (e) {} }
    var now = (window.performance && performance.now()) || Date.now();
    if (lastAt[name] && now - lastAt[name] < 40) return;
    if (live > 10) return;
    lastAt[name] = now;
    P = opt && opt.pitch ? Math.max(0.5, Math.min(2, opt.pitch)) : 1;
    G = opt && opt.vol != null ? Math.max(0.05, Math.min(1.3, opt.vol)) : 1;
    try { V[name](); } catch (e) {}
    P = 1; G = 1;
  }

  window.SFX = {
    play: play,
    mute: function (v) { off = !!v; try { localStorage.setItem('sfx_off', off ? '1' : '0'); } catch (e) {} },
    muted: function () { return off; },
    gate: function (fn) { gateFn = typeof fn === 'function' ? fn : null; }
  };
})();
