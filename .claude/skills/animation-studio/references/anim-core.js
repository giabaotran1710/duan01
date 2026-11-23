/* anim-core.js - lõi hoạt ảnh nhỏ cho game HTML (không phụ thuộc, không tự chạy rAF).
 * Game gọi Anim.update(dtMs) đúng một lần mỗi khung, nên tween dừng khi game tạm dừng
 * và chậm lại khi khựng khung (hit-stop). Dán vào game hoặc nạp bằng <script>. */
(function (root) {
  'use strict';
  var mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var A = { reduced: !!mq.matches, timeScale: 1, _freeze: 0, _t: [] };
  if (mq.addEventListener) mq.addEventListener('change', function (e) { A.reduced = e.matches; });

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  A.clamp = clamp;
  A.lerp = function (a, b, t) { return a + (b - a) * t; };
  A.ease = {
    linear: function (t) { return t; },
    inQuad: function (t) { return t * t; },
    outQuad: function (t) { return t * (2 - t); },
    inOutQuad: function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; },
    outCubic: function (t) { var u = 1 - t; return 1 - u * u * u; },
    inOutCubic: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    smoothstep: function (t) { return t * t * (3 - 2 * t); },
    outBack: function (t) { var c = 1.70158, u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; },
    outElastic: function (t) {
      if (t === 0 || t === 1) return t;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;
    },
    outBounce: function (t) {
      var n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
      return n * (t -= 2.625 / d) * t + .984375;
    }
  };

  /* Tween một số hoặc nhiều thuộc tính của obj.
   * Anim.tween(obj, {x: 100, alpha: 0}, {dur: 300, ease: 'outBack', delay: 0, onDone: fn})
   * Chế độ giảm chuyển động: nhảy thẳng tới giá trị cuối (opts.keep = true thì vẫn chạy). */
  A.tween = function (obj, to, o) {
    o = o || {};
    var tw = { obj: obj, from: {}, to: to, dur: Math.max(1, o.dur || 300), t: -(o.delay || 0),
      ease: A.ease[o.ease] || o.ease || A.ease.outCubic, onUpdate: o.onUpdate, onDone: o.onDone, dead: false };
    for (var k in to) tw.from[k] = obj[k];
    if (A.reduced && !o.keep) { for (var j in to) obj[j] = to[j]; if (o.onDone) o.onDone(); tw.dead = true; return tw; }
    A._t.push(tw);
    return tw;
  };
  A.cancel = function (tw) { if (tw) tw.dead = true; };

  /* Chuỗi: Anim.seq([{at: 0, obj: a, to: {...}, dur: 200}, {at: 150, call: fn}]) - `at` tính từ lúc gọi. */
  A.seq = function (steps) {
    var list = [];
    steps.forEach(function (s) {
      if (s.call) list.push(A.tween({}, { _: 1 }, { dur: 1, delay: s.at, keep: true, onDone: s.call }));
      else list.push(A.tween(s.obj, s.to, { dur: s.dur, delay: s.at, ease: s.ease, onDone: s.onDone, onUpdate: s.onUpdate }));
    });
    return list;
  };

  /* Khựng khung: dừng thời gian game ms mili giây (vẫn vẽ). Gọi trước Anim.update. */
  A.hitStop = function (ms) { if (!A.reduced) A._freeze = Math.max(A._freeze, ms); };

  /* Trả về dt đã qua hit-stop và timeScale, kẹp ≤ 33 ms. Dùng làm dt cho cả logic game. */
  A.step = function (rawMs) {
    var dt = Math.min(rawMs, 33);
    if (A._freeze > 0) { A._freeze -= dt; return 0; }
    return dt * A.timeScale;
  };

  A.update = function (dt) {
    var list = A._t;
    for (var i = list.length - 1; i >= 0; i--) {
      var tw = list[i];
      if (tw.dead) { list.splice(i, 1); continue; }
      tw.t += dt;
      if (tw.t < 0) continue;
      var p = clamp(tw.t / tw.dur, 0, 1), e = tw.ease(p);
      for (var k in tw.to) tw.obj[k] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
      if (tw.onUpdate) tw.onUpdate(p);
      if (p >= 1) { tw.dead = true; list.splice(i, 1); if (tw.onDone) tw.onDone(); }
    }
  };

  /* Lò xo tắt dần (follow-through, nảy): trả về trạng thái mới. s = {x, v}; k ~ 120-300, d ~ 10-25. */
  A.spring = function (s, target, dt, k, d) {
    var h = dt / 1000;
    s.v += ((target - s.x) * (k || 180) - s.v * (d || 14)) * h;
    s.x += s.v * h;
    return s.x;
  };

  /* Squash & stretch giữ thể tích: amount > 0 kéo dọc. Trả về {sx, sy}. */
  A.squash = function (amount) { var sy = 1 + amount; return { sx: 1 / sy, sy: sy }; };

  /* Rung màn theo biên độ tắt dần: gọi mỗi khung với t = 0..1. */
  A.shakeOffset = function (amp, t) {
    var f = (1 - t) * (1 - t) * amp;
    return { x: (Math.random() * 2 - 1) * f, y: (Math.random() * 2 - 1) * f };
  };

  root.Anim = A;
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
})(typeof window !== 'undefined' ? window : globalThis);
