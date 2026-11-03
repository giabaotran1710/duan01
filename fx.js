/* Hiệu ứng dùng chung cho các game (hạt, rung, chữ nổi, vòng sóng, đếm số).
 * Nạp: <script src="../fx.js"></script>  rồi gọi FX.burst(x, y, {...}), FX.shake(el), FX.text(x, y, 'Đúng!', {...}) ...
 * Mỗi game tự chọn màu, hình hạt, trọng lực, nên cùng một thư viện nhưng cảm giác khác nhau.
 * - Tôn trọng "giảm chuyển động" của máy: tự bỏ hạt/rung, chỉ giữ chữ nổi tĩnh ngắn.
 * - Giới hạn số hạt (điện thoại ít hơn); vòng lặp chỉ chạy khi còn hạt. */
(function () {
  'use strict';
  if (window.FX) return;
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var phone = (window.innerWidth || 800) < 700;
  var CAP = phone ? 150 : 320;
  var cv = null, cx = null, parts = [], rings = [], raf = 0, last = 0, dpr = 1;

  function ensure() {
    if (cv) return true;
    cv = document.createElement('canvas');
    cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:99997';
    document.body.appendChild(cv);
    cx = cv.getContext('2d');
    size();
    window.addEventListener('resize', size);
    return true;
  }
  function size() {
    if (!cv) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }

  function star(c, r) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fill();
  }

  function frame(t) {
    var dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var i = rings.length - 1; i >= 0; i--) {
      var g = rings[i]; g.t += dt; var k = g.t / g.life;
      if (k >= 1) { rings.splice(i, 1); continue; }
      cx.globalAlpha = (1 - k) * .9; cx.strokeStyle = g.color; cx.lineWidth = g.w * (1 - k * .6);
      cx.beginPath(); cx.arc(g.x, g.y, g.r * (.2 + .8 * easeOut(k)), 0, 6.2832); cx.stroke();
    }
    for (var j = parts.length - 1; j >= 0; j--) {
      var p = parts[j]; p.t += dt;
      if (p.t >= p.life) { parts.splice(j, 1); continue; }
      p.vx *= (1 - p.drag * dt); p.vy = p.vy * (1 - p.drag * dt) + p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      var a = 1 - p.t / p.life;
      cx.globalAlpha = Math.max(0, Math.min(1, a * 1.6));
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.color; cx.strokeStyle = p.color;
      var s = p.size * (p.shrink ? a : 1);
      if (p.shape === 'square') cx.fillRect(-s / 2, -s / 2, s, s);
      else if (p.shape === 'line') { cx.lineWidth = Math.max(1, s * .35); cx.beginPath(); cx.moveTo(-s, 0); cx.lineTo(s, 0); cx.stroke(); }
      else if (p.shape === 'star') star(cx, s);
      else if (p.shape === 'tri') { cx.beginPath(); cx.moveTo(0, -s); cx.lineTo(s * .9, s * .7); cx.lineTo(-s * .9, s * .7); cx.closePath(); cx.fill(); }
      else if (p.shape === 'drop') { cx.beginPath(); cx.ellipse(0, 0, s * .6, s, 0, 0, 6.2832); cx.fill(); }
      else { cx.beginPath(); cx.arc(0, 0, s / 2, 0, 6.2832); cx.fill(); }
      cx.restore();
    }
    cx.globalAlpha = 1;
    if (parts.length || rings.length) raf = requestAnimationFrame(frame); else { raf = 0; cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); }
  }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
  function run() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  var FX = {
    reduced: function () { return !!mq.matches; },
    /* tâm của phần tử theo toạ độ màn hình */
    center: function (el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
    /* bắn hạt: n, colors[], speed, spread(rad), angle(rad), gravity, size, life, shape, drag, shrink */
    burst: function (x, y, o) {
      if (mq.matches) return; o = o || {}; ensure();
      var n = Math.min(o.n || 16, CAP - parts.length); if (n <= 0) return;
      var cols = o.colors || ['#fff'], sp = o.speed || 220, sg = o.spread == null ? 6.2832 : o.spread, an = o.angle || 0;
      for (var i = 0; i < n; i++) {
        var a = an + (sg >= 6.28 ? Math.random() * 6.2832 : rnd(-sg / 2, sg / 2)), v = sp * rnd(.35, 1);
        parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.gravity == null ? 380 : o.gravity, drag: o.drag == null ? 1.4 : o.drag,
          size: (o.size || 6) * rnd(.6, 1.3), life: (o.life || .8) * rnd(.7, 1.2), t: 0, color: pick(cols), shape: pick(o.shapes || [o.shape || 'circle']),
          rot: rnd(0, 6.28), vr: rnd(-8, 8), shrink: o.shrink !== false });
      }
      run();
    },
    /* vòng sóng lan ra */
    ring: function (x, y, color, r, w) {
      if (mq.matches) return; ensure(); rings.push({ x: x, y: y, color: color || '#fff', r: r || 70, w: w || 4, t: 0, life: .55 }); run();
    },
    /* mưa hạt từ trên xuống (chúc mừng) */
    rain: function (o) {
      if (mq.matches) return; o = o || {}; var n = Math.min(o.n || 60, CAP - parts.length); ensure();
      for (var i = 0; i < n; i++) parts.push({ x: rnd(0, innerWidth), y: rnd(-60, -5), vx: rnd(-40, 40), vy: rnd(60, 220), g: o.gravity == null ? 160 : o.gravity, drag: .2,
        size: (o.size || 8) * rnd(.6, 1.3), life: rnd(1.6, 2.6), t: 0, color: pick(o.colors || ['#fff']), shape: pick(o.shapes || ['square']), rot: rnd(0, 6.28), vr: rnd(-6, 6), shrink: false });
      run();
    },
    /* rung phần tử (hoặc toàn trang nếu không truyền) */
    shake: function (el, amp, dur) {
      if (mq.matches) return; el = el || document.body; amp = amp || 6; dur = dur || 320;
      if (!el.animate) return;
      var f = [], n = 8; for (var i = 0; i <= n; i++) { var k = 1 - i / n; f.push({ transform: 'translate(' + (i % 2 ? -1 : 1) * amp * k + 'px,' + (i % 3 ? 1 : -1) * amp * .5 * k + 'px)' }); }
      f.push({ transform: 'none' }); el.animate(f, { duration: dur, easing: 'ease-out' });
    },
    /* chữ nổi bay lên rồi mờ dần */
    text: function (x, y, str, o) {
      o = o || {}; var d = document.createElement('div'); d.textContent = str; d.setAttribute('aria-hidden', 'true');
      d.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;transform:translate(-50%,-50%);pointer-events:none;z-index:99998;white-space:nowrap;font:' + (o.font || '900 22px system-ui,sans-serif') +
        ';color:' + (o.color || '#fff') + ';text-shadow:' + (o.shadow || '0 2px 0 rgba(0,0,0,.4)');
      document.body.appendChild(d);
      var rise = mq.matches ? 0 : (o.rise == null ? 54 : o.rise);
      if (d.animate) {
        var an = d.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-70%) scale(1.15)', opacity: 1, offset: .2 },
          { transform: 'translate(-50%,calc(-50% - ' + rise + 'px)) scale(1)', opacity: 0 }], { duration: o.dur || 900, easing: 'ease-out' });
        an.onfinish = function () { d.remove(); };
      } else setTimeout(function () { d.remove(); }, o.dur || 900);
    },
    /* đếm số nhảy dần từ a đến b */
    count: function (el, a, b, ms, fmt) {
      if (mq.matches || a === b) { el.textContent = fmt ? fmt(b) : b; return; }
      var t0 = performance.now(); ms = ms || 600;
      (function s(t) { var k = Math.min(1, (t - t0) / ms), v = Math.round(a + (b - a) * easeOut(k)); el.textContent = fmt ? fmt(v) : v; if (k < 1) requestAnimationFrame(s); })(t0);
    },
    /* nhấp nháy viền/nền phần tử một lần */
    pulse: function (el, color, ms) {
      if (mq.matches || !el.animate) return;
      el.animate([{ boxShadow: '0 0 0 0 ' + color }, { boxShadow: '0 0 0 14px transparent' }], { duration: ms || 500, easing: 'ease-out' });
    }
  };
  window.FX = FX;
})();
