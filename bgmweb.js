/* Nhạc nền cho game: MP3 nhúng base64 (window.BGM_DATA, nạp từ music/<game>.js), phát bằng Web Audio.
   Dùng: <script src="../music/ten.js"></script><script src="../bgmweb.js" data-volume="0.4" data-xf="2"></script>
   - Lặp liền mạch: mỗi vòng sau chồng lên vòng trước data-xf giây (xf=0: lặp thẳng bằng loop của Web Audio).
   - Bắt đầu ở lần chạm/bấm phím đầu tiên; tự tạm dừng khi chuyển tab, phát tiếp khi quay lại.
   - Bật/tắt nhớ trong localStorage (khóa bgm_on). API: BGM.setOn(bool), BGM.isOn(), BGM.toggle(). */
(function () {
  'use strict';
  var me = document.currentScript, data = window.BGM_DATA;
  if (!me || !data) return;
  var vol = parseFloat(me.getAttribute('data-volume')); if (isNaN(vol)) vol = 0.4;
  var xf = parseFloat(me.getAttribute('data-xf')); if (isNaN(xf)) xf = 0;
  var on = true; try { on = localStorage.getItem('bgm_on') !== '0'; } catch (e) {}
  var ac, master, buf, nextT = 0, timer = 0, started = false, cur = null;
  var B = { isOn: function () { return on; } };

  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = on ? vol : 0; master.connect(ac.destination);
      var s = atob(data), u = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
      var done = function (b) { buf = b; if (started) schedule(); };
      var p = ac.decodeAudioData(u.buffer, done, function () {});
      if (p && p.then) p.then(done, function () {});
    } catch (e) { ac = null; }
  }
  function layer(t0) {
    var s = ac.createBufferSource(), g = ac.createGain(), d = buf.duration;
    s.buffer = buf; s.connect(g); g.connect(master);
    if (xf <= 0) { s.loop = true; g.gain.value = 1; s.start(t0); cur = s; return Infinity; }
    g.gain.setValueAtTime(t0 === 0 || !cur ? 1 : 0, t0);
    if (cur) g.gain.linearRampToValueAtTime(1, t0 + xf);
    g.gain.setValueAtTime(1, t0 + d - xf);
    g.gain.linearRampToValueAtTime(0, t0 + d);
    s.start(t0); cur = s;
    return t0 + d - xf;
  }
  function schedule() {
    if (!ac || !buf) return;
    if (!nextT) nextT = ac.currentTime + 0.05;
    if (xf <= 0) { if (!cur) layer(nextT); return; }
    while (nextT - ac.currentTime < 1.5) nextT = layer(nextT);
  }
  function start() {
    if (document.hidden) return;
    init(); if (!ac) return;
    if (ac.state === 'suspended') ac.resume();
    started = true; schedule();
    if (!timer && xf > 0) timer = setInterval(function () { if (ac && ac.state === 'running') schedule(); }, 500);
  }
  B.setOn = function (v, noSave) {
    on = !!v; if (!noSave) { try { localStorage.setItem('bgm_on', on ? '1' : '0'); } catch (e) {} }
    if (master) { var t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(on ? vol : 0, t + 0.25); }
    if (on) start();
    document.dispatchEvent(new CustomEvent('bgmchange', { detail: on }));
  };
  B.toggle = function () { B.setOn(!on); return on; };
  /* nút bật/tắt nhạc dùng chung (game chưa có nút âm thanh): B.makeButton() trả về <button>, game tự đặt vào bố cục */
  B.makeButton = function () {
    var b = document.createElement('button'), NS = 'http://www.w3.org/2000/svg';
    b.type = 'button'; b.className = 'bgmBtn';
    b.style.cssText = 'width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,.55);background:rgba(10,30,50,.62);color:#fff;display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;pointer-events:auto;';
    function paint() {
      b.setAttribute('aria-label', on ? 'Nhạc nền: bật' : 'Nhạc nền: tắt'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = b.getAttribute('aria-label');
      b.innerHTML = '<svg xmlns="' + NS + '" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>' + (on ? '' : '<path d="M3 3l18 18" stroke="#ff8a8a" stroke-width="2.6"/>') + '</svg>';
      b.style.opacity = on ? '1' : '.78';
    }
    ['pointerdown', 'touchstart', 'mousedown'].forEach(function (ev) { b.addEventListener(ev, function (e) { e.stopPropagation(); }); });
    b.addEventListener('click', function (e) { e.stopPropagation(); B.toggle(); });
    document.addEventListener('bgmchange', paint); paint();
    return b;
  };
  ['pointerup', 'touchend', 'click', 'keydown'].forEach(function (ev) { window.addEventListener(ev, start, { capture: true, passive: true }); });
  document.addEventListener('visibilitychange', function () {
    if (!ac) return;
    if (document.hidden) { ac.suspend(); } else if (started) { ac.resume(); }
  });
  window.addEventListener('pagehide', function () { if (ac) ac.suspend(); });
  init();
  window.BGM = B;
})();
