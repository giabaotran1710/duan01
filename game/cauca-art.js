/* Câu cá - đồ họa pixel. Mọi thứ vẽ ở độ phân giải thấp rồi phóng to bằng CSS (image-rendering: pixelated).
 * Hình vẽ bằng path xong được "nắn pixel": mỗi điểm ảnh bị kéo về màu gần nhất trong bảng màu của lớp đó,
 * độ trong chỉ còn 0 hoặc 255, nên không còn viền nhoè khử răng cưa.
 * window.CA = { env, setEnv, painter, sky, scenery, cloud, sprite, silhouette, icon, fisher, mix, hex, css } */
(function () {
  'use strict';
  var CA = {};

  // ---------- màu ----------
  function hex(h) {
    if (Array.isArray(h)) return h;
    var m = /rgba?\(([^)]+)\)/.exec(h);
    if (m) { var p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  function mix(a, b, t) {
    a = hex(a); b = hex(b);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] == null ? 1 : a[3]];
  }
  function css(c) { c = hex(c); return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (c[3] == null ? 1 : c[3]) + ')'; }
  function shade(c, k) { c = hex(c); return k < 0 ? mix(c, [12, 14, 26], -k) : mix(c, [255, 255, 255], k); }
  CA.hex = hex; CA.mix = mix; CA.css = css; CA.shade = shade;

  function rnd(seed) { var s = seed >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  CA.rnd = rnd;

  // ---------- ánh sáng theo giờ và thời tiết ----------
  var KEYS = [ // giờ, trời trên, trời dưới, độ tối, độ ấm
    [0, '#0b1030', '#1f2a55', .74, 0], [4.6, '#141a44', '#2c3462', .66, 0],
    [5.4, '#3a3a72', '#d98a7a', .36, .55], [6.4, '#6aa6dc', '#f6d09a', .1, .35],
    [8, '#56a2e2', '#c6e6f4', 0, .05], [12.5, '#3f90e2', '#b2e2f8', 0, 0],
    [16, '#5296d6', '#e6e0b4', 0, .12], [17.4, '#4c5c9c', '#f4a25a', .08, .6],
    [18.4, '#33386e', '#e0724a', .22, .75], [19.4, '#1c2154', '#7a4a6a', .5, .3],
    [20.6, '#0e1338', '#262e5c', .7, 0], [24, '#0b1030', '#1f2a55', .74, 0]
  ];
  var WXT = { // trộn trời với màu xám của thời tiết
    nang: null, may: ['#98a4b4', .42, .08], mua: ['#66717f', .6, .2], suong: ['#c9ced2', .55, .05], giong: ['#363c4c', .72, .32]
  };
  var E = null;
  function env(hour, wx) {
    var h = ((hour % 24) + 24) % 24, i = 0;
    while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
    var a = KEYS[i], b = KEYS[i + 1], t = (h - a[0]) / (b[0] - a[0]);
    var e = { hour: h, wx: wx, top: mix(a[1], b[1], t), bot: mix(a[2], b[2], t), dark: a[3] + (b[3] - a[3]) * t, warm: a[4] + (b[4] - a[4]) * t };
    var w = WXT[wx];
    e.grey = w ? w[1] : 0; e.greyCol = w ? hex(w[0]) : [0, 0, 0]; e.dim = w ? w[2] : 0;
    if (w) { e.top = mix(e.top, mix(w[0], e.top, e.dark * .7), w[1]); e.bot = mix(e.bot, mix(w[0], e.bot, e.dark * .7), w[1]); }
    e.night = e.dark > .45;
    return e;
  }
  CA.env = env;
  CA.setEnv = function (e) { E = e; };
  /* màu cảnh vật dưới ánh sáng hiện tại */
  function T(c) {
    c = hex(c);
    if (!E) return c;
    var o = mix(c, [255, 150, 90], E.warm * .16);
    if (E.grey) o = mix(o, mix(E.greyCol, o, .45), E.grey * .5);
    o = mix(o, [16, 22, 52], E.dark * .82);
    if (E.dim) o = mix(o, [20, 22, 30], E.dim);
    return [o[0], o[1], o[2], c[3]];
  }
  CA.T = T;

  // ---------- họa sĩ: vẽ path rồi nắn pixel ----------
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
  CA.canvas = canvas;
  function painter(w, h, tint, k) {
    var cv = canvas(w * (k || 1), h * (k || 1)), c = cv.getContext('2d'), pal = [];
    if (k) c.scale(k, k);
    function col(x) { var k = tint === false ? hex(x) : T(x); pal.push(k); return css([k[0], k[1], k[2], 1]); }
    return {
      cv: cv, c: c, col: col, w: w, h: h,
      fill: function (x) { c.fillStyle = col(x); return c; },
      stroke: function (x, lw) { c.strokeStyle = col(x); c.lineWidth = lw || 1; return c; },
      rect: function (x, y, ww, hh, k) { c.fillStyle = col(k); c.fillRect(Math.round(x), Math.round(y), Math.round(ww), Math.round(hh)); },
      ell: function (x, y, rx, ry, k) { c.fillStyle = col(k); c.beginPath(); c.ellipse(x, y, Math.max(.5, rx), Math.max(.5, ry), 0, 0, 7); c.fill(); },
      poly: function (pts, k) { c.fillStyle = col(k); c.beginPath(); c.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); },
      line: function (x1, y1, x2, y2, k) { bres(c, x1, y1, x2, y2, col(k)); },
      done: function (outline) {
        if (!k) return quant(cv, pal, outline);
        c.setTransform(1, 0, 0, 1, 0, 0); quant(cv, pal, null); volume(cv); quant(cv, [], outline); c.setTransform(k, 0, 0, k, 0, 0); return cv;
      }
    };
  }
  CA.painter = painter;
  function bres(c, x1, y1, x2, y2, st) {
    x1 = Math.round(x1); y1 = Math.round(y1); x2 = Math.round(x2); y2 = Math.round(y2);
    var dx = Math.abs(x2 - x1), dy = -Math.abs(y2 - y1), sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1, er = dx + dy, n = 0;
    c.fillStyle = st;
    while (n++ < 2000) {
      c.fillRect(x1, y1, 1, 1);
      if (x1 === x2 && y1 === y2) break;
      var e2 = 2 * er;
      if (e2 >= dy) { er += dy; x1 += sx; }
      if (e2 <= dx) { er += dx; y1 += sy; }
    }
  }
  CA.bres = bres;
  /* đổ khối: mỗi mảng màu sáng ở mép trên, tối dần xuống dưới, có hoà điểm */
  function volume(cv) {
    var w = cv.width, h = cv.height, c = cv.getContext('2d'), im = c.getImageData(0, 0, w, h), d = im.data, n = w * h;
    var top = new Int16Array(n), bot = new Int16Array(n), lft = new Int16Array(n), rgt = new Int16Array(n), x, y, i, j;
    for (x = 0; x < w; x++) { y = 0; while (y < h) { if (!d[(y * w + x) * 4 + 3]) { y++; continue; } j = y; while (j < h && d[(j * w + x) * 4 + 3]) j++; for (i = y; i < j; i++) { top[i * w + x] = y; bot[i * w + x] = j - 1; } y = j; } }
    for (y = 0; y < h; y++) { x = 0; while (x < w) { if (!d[(y * w + x) * 4 + 3]) { x++; continue; } j = x; while (j < w && d[(y * w + j) * 4 + 3]) j++; for (i = x; i < j; i++) { lft[y * w + i] = x; rgt[y * w + i] = j - 1; } x = j; } }
    var src = new Uint8ClampedArray(d);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var q = y * w + x, o = q * 4; if (!src[o + 3]) continue;
      var sv = bot[q] - top[q], sh = rgt[q] - lft[q]; if (sv < 5 || sh < 5) continue;
      var v = (y - top[q]) / sv, u = (x - lft[q]) / sh, b = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - .5) * .16;
      var t = v * .8 + (1 - u) * .2 + b, f = 0;
      if (t < .2) f = .2; else if (t > .82) f = -.3; else if (t > .62) f = -.15;
      if (y === bot[q] || y === bot[q] - 1 && sv > 10) f = Math.min(f, -.3);
      if (!f) continue;
      var r = src[o], g = src[o + 1], bb = src[o + 2];
      if (f > 0) { d[o] = r + (255 - r) * f * .9; d[o + 1] = g + (248 - g) * f * .9; d[o + 2] = bb + (220 - bb) * f * .9; }
      else { var m = -f; d[o] = r + (22 - r) * m; d[o + 1] = g + (26 - g) * m; d[o + 2] = bb + (52 - bb) * m; }
    }
    c.putImageData(im, 0, 0);
  }
  /* kéo mỗi điểm về màu gần nhất trong bảng, alpha 0/255; outline: thêm viền 1 px */
  function quant(cv, pal, outline) {
    var c = cv.getContext('2d'), w = cv.width, h = cv.height, im = c.getImageData(0, 0, w, h), d = im.data, n = w * h;
    var P = [], seen = {};
    pal.forEach(function (p) { var k = (p[0] | 0) + ',' + (p[1] | 0) + ',' + (p[2] | 0); if (!seen[k]) { seen[k] = 1; P.push([p[0] | 0, p[1] | 0, p[2] | 0]); } });
    var cache = {};
    for (var i = 0; i < n; i++) {
      var o = i * 4, a = d[o + 3];
      if (a < 110) { d[o + 3] = 0; continue; }
      d[o + 3] = 255;
      if (!P.length) continue;
      var key = (d[o] >> 2) << 12 | (d[o + 1] >> 2) << 6 | (d[o + 2] >> 2), best = cache[key];
      if (best === undefined) {
        var bd = 1e9;
        for (var j = 0; j < P.length; j++) {
          var dr = d[o] - P[j][0], dg = d[o + 1] - P[j][1], db = d[o + 2] - P[j][2], dd = dr * dr * 2 + dg * dg * 3 + db * db;
          if (dd < bd) { bd = dd; best = j; }
        }
        cache[key] = best;
      }
      d[o] = P[best][0]; d[o + 1] = P[best][1]; d[o + 2] = P[best][2];
    }
    if (outline) {
      var oc = hex(outline), cp = new Uint8ClampedArray(d);
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
        var q = (y * w + x) * 4;
        if (cp[q + 3]) continue;
        if ((x > 0 && cp[q - 1]) || (x < w - 1 && cp[q + 7]) || (y > 0 && cp[q - w * 4 + 3]) || (y < h - 1 && cp[q + w * 4 + 3])) {
          d[q] = oc[0]; d[q + 1] = oc[1]; d[q + 2] = oc[2]; d[q + 3] = 255;
        }
      }
    }
    c.putImageData(im, 0, 0);
    return cv;
  }
  CA.quant = quant;

  // ---------- trời ----------
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  /* dải màu chuyển có hoà điểm (dither) kiểu pixel: steps bậc màu */
  function gradient(im, w, y0, y1, ca, cb, steps) {
    var d = im.data;
    for (var y = y0; y < y1; y++) {
      var t = (y - y0) / Math.max(1, y1 - y0 - 1) * (steps - 1);
      for (var x = 0; x < w; x++) {
        var th = BAYER[(y & 3) * 4 + (x & 3)] / 16, s = Math.min(steps - 1, Math.floor(t + th)) / (steps - 1);
        var cc = mix(ca, cb, s), o = (y * w + x) * 4;
        d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = 255;
      }
    }
  }
  CA.gradient = gradient;
  /* trời + mặt trời/trăng + sao, vẽ vào canvas w x hy */
  CA.sky = function (w, hy, e) {
    var cv = canvas(w, hy), c = cv.getContext('2d'), im = c.createImageData(w, hy);
    gradient(im, w, 0, hy, e.top, e.bot, 7);
    c.putImageData(im, 0, 0);
    var R = rnd(77);
    if (e.dark > .35 && e.wx !== 'mua' && e.wx !== 'giong') {
      var a = Math.min(1, (e.dark - .35) * 3) * (e.wx === 'may' || e.wx === 'suong' ? .35 : 1);
      for (var i = 0; i < w * hy / 70; i++) {
        var sx = R() * w | 0, sy = R() * hy * .8 | 0, b = R();
        c.fillStyle = 'rgba(255,248,220,' + (a * (b > .85 ? 1 : .55)).toFixed(2) + ')';
        c.fillRect(sx, sy, 1, 1);
        if (b > .96) { c.fillRect(sx - 1, sy, 3, 1); c.fillRect(sx, sy - 1, 1, 3); }
      }
    }
    var h = e.hour, body = null;
    if (h >= 5.2 && h <= 18.8) body = { sun: 1, t: (h - 5.2) / 13.6 };
    else body = { sun: 0, t: ((h < 12 ? h + 24 : h) - 18.8) / 10.4 };
    var bx = Math.round(w * (.08 + .84 * body.t)), by = Math.round(hy * (.92 - Math.sin(body.t * Math.PI) * .72));
    var hidden = e.wx === 'mua' || e.wx === 'giong' ? .85 : e.wx === 'may' || e.wx === 'suong' ? .5 : 0;
    var r = Math.max(4, Math.round(Math.min(w, hy * 2) * .045));
    c.globalAlpha = 1 - hidden;
    if (body.sun) {
      var sc = body.t < .12 || body.t > .86 ? '#ffb070' : '#fff2b0';
      disc(c, bx, by, r + 2, css(mix(sc, e.bot, .55)));
      disc(c, bx, by, r, sc);
      disc(c, bx - 1, by - 1, Math.max(1, r - 2), body.t < .12 || body.t > .86 ? '#ffd2a0' : '#fffbe0');
    } else {
      disc(c, bx, by, r, '#f4f0d8');
      disc(c, bx + Math.round(r * .55), by - Math.round(r * .3), r, css(e.top));
      c.fillStyle = '#d8d2b4'; c.fillRect(bx - Math.round(r * .5), by + 1, 1, 1); c.fillRect(bx - Math.round(r * .2), by - Math.round(r * .5), 1, 1);
    }
    c.globalAlpha = 1;
    cv.body = { x: bx, y: by, r: r, sun: body.sun, vis: 1 - hidden };
    return cv;
  };
  function disc(c, cx, cy, r, col) {
    c.fillStyle = typeof col === 'string' ? col : css(col);
    for (var y = -r; y <= r; y++) { var hw = Math.round(Math.sqrt(r * r - y * y)); c.fillRect(cx - hw, cy + y, hw * 2 + 1, 1); }
  }
  CA.disc = disc;

  /* mây pixel: kiểu 0..2, màu theo thời tiết */
  CA.cloud = function (kind, scale, e) {
    var s = scale, w = Math.round(46 * s), h = Math.round(18 * s), P = painter(w, h, false);
    var base = e.wx === 'giong' ? '#4a5060' : e.wx === 'mua' ? '#8a929e' : e.wx === 'may' ? '#c4cad2' : '#f4f6f8';
    base = mix(base, [24, 30, 64], e.dark * .75);
    base = mix(base, [255, 160, 110], e.warm * .35);
    var shadow = shade(base, -.18), R = rnd(kind * 31 + 5);
    P.ell(w * .5, h * .72, w * .46, h * .26, shadow);
    var blobs = 3 + kind;
    for (var i = 0; i < blobs; i++) {
      var bx = w * (.2 + .6 * i / Math.max(1, blobs - 1)), br = h * (.28 + R() * .2);
      P.ell(bx, h * .62 - br * .4, br * 1.1, br, base);
    }
    P.rect(w * .08, h * .62, w * .84, h * .2, base);
    P.ell(w * .5, h * .86, w * .4, h * .1, shadow);
    return P.done();
  };

  // ---------- cảnh từng vùng ----------
  /* vẽ cảnh xa + mặt nước + tiền cảnh vào một canvas trong suốt w x h. hy: chân trời, fy: mép tiền cảnh. */
  CA.scenery = function (reg, w, h, hy, fy, e) {
    var out = canvas(w, h), o = out.getContext('2d');
    var water = WATER[reg];
    // nước
    var im = o.createImageData(w, h - hy), wt = T(water[0]), wb = T(water[1]);
    var top = mix(wt, e.bot, .42);
    gradient(im, w, 0, h - hy, top, wb, 7);
    o.putImageData(im, 0, hy);
    var R = rnd(reg.length * 97 + 3), lay = SC[reg](w, h, hy, fy, R, e);
    lay.forEach(function (L) { o.drawImage(L, 0, 0); });
    return out;
  };
  var WATER = {
    ao: ['#5f8f66', '#2f5a40'], song: ['#8a8a62', '#4f5a3c'], dam: ['#5a8a70', '#2a5444'],
    nui: ['#4f92a8', '#1f4f6a'], rung: ['#7a7c58', '#3c4632'], bien: ['#3f86c0', '#163f72'],
    suoi: ['#5aa0a0', '#24525a'], cuasong: ['#8a8a6a', '#3f5458'], ran: ['#3fc0c8', '#1a6a9a'],
    vinh: ['#4a9a8a', '#1e4a5a'], sau: ['#2a5a9a', '#0a1a3a']
  };
  CA.WATER = WATER;
  function treeline(P, w, y, hgt, col, R, step) {
    var pts = [0, y + 2], x = 0;
    while (x <= w + step) { pts.push(x, y - hgt * (.45 + R() * .55)); x += step * (.6 + R() * .8); }
    pts.push(w, y + 2);
    P.c.fillStyle = P.col(col); P.c.beginPath(); P.c.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length - 2; i += 2) { var mx = (pts[i] + pts[i + 2]) / 2; P.c.quadraticCurveTo(pts[i], pts[i + 1] - 2, mx, (pts[i + 1] + pts[i + 3]) / 2); }
    P.c.lineTo(w, y + 2); P.c.closePath(); P.c.fill();
  }
  function grassTufts(P, x0, x1, y, n, R, cols) {
    for (var i = 0; i < n; i++) {
      var x = x0 + R() * (x1 - x0), hh = 2 + R() * 4, k = cols[i % cols.length];
      P.line(x, y, x - 1, y - hh, k); P.line(x + 1, y, x + 2, y - hh + 1, k);
    }
  }
  function reeds(P, x, y, n, hgt, R) {
    for (var i = 0; i < n; i++) {
      var xx = x + i * 2 + R() * 2, hh = hgt * (.6 + R() * .5);
      P.line(xx, y, xx + (R() - .5) * 3, y - hh, '#5f7a3a');
      if (R() > .5) P.rect(xx - 0 + (R() - .5) * 2, y - hh - 2, 1, 3, '#8a5a30');
    }
  }
  function dock(P, w, h, fy, x0, wood, dark) {
    P.rect(x0, fy, w - x0, h - fy, wood);
    for (var y = fy + 3; y < h; y += 4) P.rect(x0, y, w - x0, 1, dark);
    for (var x = x0 + 5; x < w; x += 11) P.rect(x, fy, 1, 3, dark);
    P.rect(x0, fy, w - x0, 1, shade(wood, .18));
    P.rect(x0 - 2, fy - 1, 3, h - fy + 1, dark);
  }
  function palm(P, x, y, hgt, R) {
    var lean = (R() - .5) * 8;
    P.stroke('#6a4a2c', 2); P.c.beginPath(); P.c.moveTo(x, y); P.c.quadraticCurveTo(x + lean * .3, y - hgt * .5, x + lean, y - hgt); P.c.stroke();
    var tx = x + lean, ty = y - hgt;
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI + i * Math.PI / 5 + (R() - .5) * .3, L = hgt * .42;
      P.stroke(i % 2 ? '#2f6a32' : '#3f7f3a', 1.6); P.c.beginPath(); P.c.moveTo(tx, ty);
      P.c.quadraticCurveTo(tx + Math.cos(a) * L * .6, ty + Math.sin(a) * L * .6 - 3, tx + Math.cos(a) * L, ty + Math.sin(a) * L + L * .35); P.c.stroke();
    }
  }
  function pine(P, x, y, hgt, col) {
    for (var i = 0; i < 3; i++) {
      var yy = y - hgt * (.25 + i * .25), ww = hgt * (.32 - i * .07);
      P.poly([x - ww, yy + hgt * .22, x, yy - hgt * .18, x + ww, yy + hgt * .22], col);
    }
    P.rect(x - .5, y - hgt * .2, 1.5, hgt * .2, '#4a3424');
  }
  function lily(P, x, y, r, R) {
    P.ell(x, y, r, r * .42, '#3f7a32');
    P.ell(x - r * .15, y - r * .06, r * .7, r * .26, '#5a9a3e');
    P.poly([x, y, x + r * 1.05, y - r * .18, x + r * 1.05, y + r * .18], WATER.ao[0]);
  }
  var SC = {
    ao: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      treeline(A, w, hy, Math.max(8, hy * .2), '#2f5a34', R, 9);
      treeline(A, w, hy, Math.max(5, hy * .12), '#3f6f3a', R, 7);
      // nhà mái rơm
      var hx = Math.round(w * .26), hw = Math.max(16, Math.round(w * .13)), wh = Math.round(hw * .5);
      A.rect(hx, hy - wh, hw, wh, '#cbb07a');
      A.rect(hx + hw * .42, hy - wh * .7, hw * .18, wh * .7, '#4a3424');
      A.rect(hx + hw * .12, hy - wh * .75, hw * .16, wh * .3, '#6a4a2c');
      A.poly([hx - 3, hy - wh, hx + hw * .5, hy - wh - hw * .45, hx + hw + 3, hy - wh], '#a8863e');
      A.poly([hx - 3, hy - wh, hx + hw * .5, hy - wh - hw * .45, hx + hw * .5, hy - wh - hw * .3, hx + 1, hy - wh], '#c4a052');
      // tre
      var bx = Math.round(w * .74);
      for (var i = 0; i < 7; i++) {
        var x = bx + i * 2.3, top = hy - hy * (.38 + R() * .2), bend = (i - 3) * 1.6;
        A.stroke(i % 2 ? '#4f7f34' : '#6a9a3a', 1.2); A.c.beginPath(); A.c.moveTo(x, hy); A.c.quadraticCurveTo(x, (hy + top) / 2, x + bend, top); A.c.stroke();
        for (var k = 0; k < 4; k++) { var ly = top + k * 4 + 2; A.line(x + bend * .8, ly, x + bend * .8 + (k % 2 ? 4 : -4), ly + 2, '#5f9a3a'); }
      }
      // chuối
      var cx = Math.round(w * .08);
      A.rect(cx, hy - hy * .22, 2, hy * .22, '#7a8a4a');
      for (var j = 0; j < 4; j++) { var a = -2.6 + j * .75; A.ell(cx + Math.cos(a) * 6, hy - hy * .22 + Math.sin(a) * 4, 6, 2.2, j % 2 ? '#6aa03e' : '#4f8a34'); }
      A.rect(0, hy - 1, w, 2, '#6a9a4a');
      // lá súng
      var B = painter(w, h);
      for (var n = 0; n < 7; n++) {
        var yy = hy + 6 + R() * (fy - hy - 14), depth = (yy - hy) / (fy - hy);
        lily(B, w * (.05 + R() * .5), yy, 3 + depth * 5, R);
      }
      B.ell(w * .18, hy + (fy - hy) * .55, 1.6, 1.4, '#f6f0f0');
      // tiền cảnh: bờ cỏ trái + cầu ao gỗ phải
      var C = painter(w, h);
      C.poly([0, fy - 6, w * .32, fy + 1, w * .45, h, 0, h], '#4f7f34');
      C.poly([0, fy - 3, w * .26, fy + 3, w * .34, h, 0, h], '#3f6a2c');
      grassTufts(C, 2, w * .3, fy + 1, 14, R, ['#6a9a3e', '#5a8a34']);
      reeds(C, w * .02, fy - 2, 5, 14, R);
      dock(C, w, h, fy, Math.round(w * .5), '#9a7448', '#6a4a2c');
      return [A.done(), B.done(), C.done()];
    },
    song: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      A.poly([0, hy - 4, w * .3, hy - 6, w * .6, hy - 5, w, hy - 7, w, hy + 1, 0, hy + 1], '#5f7f3e');
      treeline(A, w, hy - 4, Math.max(4, hy * .08), '#3f6a34', R, 6);
      for (var i = 0; i < 4; i++) palm(A, w * (.12 + i * .24 + R() * .06), hy - 4, hy * (.26 + R() * .12), R);
      // nhà sàn bên bờ
      var hx = w * .56;
      A.rect(hx, hy - 9, 12, 6, '#b89a6a'); A.poly([hx - 2, hy - 9, hx + 6, hy - 14, hx + 14, hy - 9], '#8a5a3a');
      A.rect(hx + 1, hy - 3, 1, 4, '#5a3a24'); A.rect(hx + 10, hy - 3, 1, 4, '#5a3a24');
      A.rect(0, hy, w, 1, '#8a8a5a');
      // xuồng ba lá trên sông
      var B = painter(w, h), by = hy + (fy - hy) * .22, bx = w * .2, bw = Math.max(18, w * .14);
      B.poly([bx, by, bx + bw, by, bx + bw * .86, by + 3, bx + bw * .14, by + 3], '#4a3424');
      B.poly([bx + bw * .3, by, bx + bw * .4, by - 5, bx + bw * .66, by - 5, bx + bw * .74, by], '#a07a44');
      B.rect(bx + bw * .5, by - 9, 1, 4, '#2a2a2a'); B.poly([bx + bw * .44, by - 9, bx + bw * .5, by - 12, bx + bw * .58, by - 9], '#d8c08a');
      // bèo
      for (var n = 0; n < 6; n++) { var yy = hy + 5 + R() * (fy - hy - 10); B.ell(w * R() * .6, yy, 1.5 + (yy - hy) / (fy - hy) * 2.5, 1, '#5a8a3a'); }
      var C = painter(w, h);
      C.poly([0, fy - 2, w * .4, fy, w, fy - 3, w, h, 0, h], '#7a6a44');
      C.poly([0, fy + 2, w, fy + 1, w, h, 0, h], '#6a5a3a');
      for (var s = 0; s < 6; s++) C.ell(w * (.1 + s * .17 + R() * .05), fy + 3 + R() * (h - fy - 6), 3 + R() * 3, 2 + R(), s % 2 ? '#8a8478' : '#6f6a60');
      grassTufts(C, 0, w * .45, fy + 1, 16, R, ['#6a8a3e', '#7a9a4a']);
      reeds(C, w * .03, fy, 6, 16, R);
      return [A.done(), B.done(), C.done()];
    },
    dam: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      treeline(A, w, hy, Math.max(7, hy * .16), '#355f3a', R, 8);
      // mái đình cong
      var dx = w * .6, dw = Math.max(20, w * .16);
      A.rect(dx + 2, hy - 8, dw - 4, 8, '#c8a878');
      A.rect(dx + dw * .42, hy - 6, dw * .16, 6, '#5a3020');
      A.poly([dx - 4, hy - 7, dx, hy - 10, dx + dw * .2, hy - 15, dx + dw * .8, hy - 15, dx + dw, hy - 10, dx + dw + 4, hy - 7, dx + dw * .9, hy - 9, dx + dw * .1, hy - 9], '#8a3a2a');
      A.rect(dx + dw * .2, hy - 16, dw * .6, 1, '#6a2a1e');
      A.rect(0, hy - 1, w, 2, '#5f8a4a');
      var B = painter(w, h);
      for (var n = 0; n < 16; n++) {
        var yy = hy + 4 + R() * (fy - hy - 8), d = (yy - hy) / (fy - hy), r = 3 + d * 7, x = w * R();
        B.ell(x, yy, r, r * .42, '#3a7a3a'); B.ell(x, yy - r * .06, r * .5, r * .2, '#5a9a48');
        if (R() > .55) {
          var sh = r * 1.4;
          B.line(x + r * .3, yy, x + r * .35, yy - sh, '#4a7a34');
          var fx = x + r * .35, fyy = yy - sh;
          B.poly([fx - r * .35, fyy, fx, fyy - r * .55, fx + r * .35, fyy], '#f28aa8');
          B.poly([fx - r * .18, fyy, fx, fyy - r * .7, fx + r * .18, fyy], '#ffc0d0');
        }
      }
      var C = painter(w, h);
      C.poly([w * .35, fy + 4, w * .5, fy - 2, w, fy - 2, w, h, w * .45, h], '#6a4a2c');
      C.poly([w * .4, fy + 6, w * .52, fy + 1, w, fy + 1, w, h, w * .48, h], '#8a6238');
      C.rect(w * .52, fy + 5, w * .48, 1, '#5a3a22');
      C.poly([0, fy, w * .2, fy + 2, w * .3, h, 0, h], '#3f6a32');
      reeds(C, 1, fy + 1, 5, 12, R);
      return [A.done(), B.done(), C.done()];
    },
    nui: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      function range(y, hh, col, step) {
        var pts = [0, y], x = 0;
        while (x < w) { x += step * (.6 + R() * .8); pts.push(Math.min(w, x), y - hh * (.4 + R() * .6)); x += step * (.5 + R() * .6); pts.push(Math.min(w, x), y - hh * (.1 + R() * .3)); }
        pts.push(w, y); A.poly(pts, col);
      }
      range(hy, hy * .7, '#6a7a9e', w * .12);
      range(hy, hy * .5, '#4f6a6a', w * .09);
      range(hy, hy * .28, '#3a5a44', w * .06);
      for (var i = 0; i < 14; i++) pine(A, w * R(), hy + 1, hy * (.1 + R() * .08), i % 2 ? '#24452e' : '#2f5638');
      A.rect(0, hy, w, 1, '#3a5a44');
      var C = painter(w, h);
      C.poly([0, fy - 4, w * .18, fy - 8, w * .34, fy - 2, w * .4, h, 0, h], '#6f7478');
      C.poly([w * .5, fy + 2, w * .66, fy - 3, w * .85, fy - 5, w, fy - 2, w, h, w * .48, h], '#7c8184');
      C.poly([0, fy - 4, w * .18, fy - 8, w * .22, fy - 6, w * .05, fy - 2], '#9aa0a2');
      C.poly([w * .66, fy - 3, w * .85, fy - 5, w * .8, fy - 2, w * .62, fy], '#a4aaac');
      C.ell(w * .14, fy - 5, w * .07, 1.5, '#5a8a44'); C.ell(w * .78, fy - 4, w * .06, 1.3, '#5a8a44');
      grassTufts(C, w * .5, w, fy + 3, 8, R, ['#5a7a3e']);
      return [A.done(), C.done()];
    },
    rung: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      treeline(A, w, hy - 6, hy * .2, '#2f4f2e', R, 10);
      var trees = Math.max(4, Math.round(w / 30));
      for (var i = 0; i < trees; i++) {
        var x = w * (i + .3 + R() * .4) / trees, top = hy - hy * (.32 + R() * .14), cw = w / trees * .7;
        for (var r = 0; r < 5; r++) {
          var rx = x + (r - 2) * cw * .22;
          A.stroke('#5a4430', 1.2); A.c.beginPath(); A.c.moveTo(x, top + 8); A.c.quadraticCurveTo(rx, top + 10, rx + (r - 2) * 2, hy + 1); A.c.stroke();
        }
        A.rect(x - 1, top + 2, 2, 9, '#5a4430');
        A.ell(x, top, cw * .55, hy * .1, '#3a6a36'); A.ell(x - cw * .2, top + 2, cw * .35, hy * .07, '#4a7a3a'); A.ell(x + cw * .25, top - 1, cw * .3, hy * .06, '#2f5a30');
        if (R() > .5) { A.rect(x + cw * .2, top - hy * .08, 2, 2, '#f4f4ec'); A.rect(x + cw * .2 + 2, top - hy * .08 - 1, 1, 1, '#f4f4ec'); }
      }
      A.rect(0, hy, w, 1, '#5a5a40');
      var B = painter(w, h);
      for (var n = 0; n < 5; n++) { var yy = hy + 6 + R() * (fy - hy - 12); B.ell(w * R() * .55, yy, 4 + (yy - hy) / (fy - hy) * 6, 1.3, '#6a6a48'); }
      var C = painter(w, h);
      C.poly([0, fy - 1, w * .3, fy + 3, w * .35, h, 0, h], '#5a4a34');
      for (var m = 0; m < 4; m++) C.ell(w * .05 + m * 7, fy + 6 + m, 2, 1, '#4a3c2a');
      dock(C, w, h, fy, Math.round(w * .42), '#8a6a42', '#5a4228');
      for (var p = Math.round(w * .45); p < w; p += 14) { C.rect(p, fy - 7, 2, 8, '#5a4228'); }
      C.rect(w * .42, fy - 6, w * .58, 1, '#c8b080');
      return [A.done(), B.done(), C.done()];
    },
    bien: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      var islands = Math.max(3, Math.round(w / 45));
      for (var i = 0; i < islands; i++) {
        var x = w * (i + .2 + R() * .6) / islands, ih = hy * (.12 + R() * .2), iw = ih * (.5 + R() * .4);
        A.poly([x - iw, hy + 1, x - iw * .8, hy - ih * .7, x - iw * .4, hy - ih, x + iw * .3, hy - ih * .95, x + iw * .8, hy - ih * .6, x + iw, hy + 1], i % 2 ? '#5f7a7a' : '#6f8888');
        A.ell(x - iw * .1, hy - ih * .95, iw * .55, ih * .12, '#5a7a4a');
      }
      A.rect(0, hy, w, 1, '#a8c8e0');
      for (var g = 0; g < 3; g++) { var gx = w * (.2 + R() * .6), gy = hy * (.3 + R() * .4); A.line(gx - 2, gy - 1, gx, gy, '#f4f4f4'); A.line(gx, gy, gx + 2, gy - 1, '#f4f4f4'); }
      var C = painter(w, h);
      // mũi thuyền gỗ sơn xanh đỏ
      C.poly([w * .3, fy + 3, w * .42, fy - 3, w, fy - 6, w, h, w * .34, h], '#2f5f9a');
      C.poly([w * .32, fy + 6, w * .43, fy + 1, w, fy - 2, w, fy + 1, w * .44, fy + 4, w * .34, fy + 9], '#c8382f');
      C.poly([w * .36, fy + 9, w * .46, fy + 5, w, fy + 2, w, h, w * .38, h], '#8a6238');
      for (var y = fy + 9; y < h; y += 4) C.rect(w * .4, y, w * .6, 1, '#6a4a2a');
      C.rect(w * .42, fy - 3, w * .58, 1, '#f4e8c8');
      return [A.done(), C.done()];
    },
    suoi: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      // vách đá hai bên, thác giữa
      A.poly([0, hy + 1, 0, hy * .18, w * .1, hy * .1, w * .22, hy * .26, w * .34, hy * .2, w * .4, hy + 1], '#6a6e72');
      A.poly([w * .58, hy + 1, w * .6, hy * .16, w * .72, hy * .06, w * .86, hy * .2, w, hy * .12, w, hy + 1], '#62676a');
      A.poly([0, hy * .18, w * .1, hy * .1, w * .2, hy * .24, w * .06, hy * .3], '#868a8e');
      A.poly([w * .6, hy * .16, w * .72, hy * .06, w * .8, hy * .16, w * .66, hy * .24], '#80868a');
      A.rect(w * .4, hy * .22, w * .18, hy * .78 + 1, '#4a5054');
      for (var i = 0; i < 9; i++) { var x = w * (.41 + i * .019); A.rect(x, hy * .22, Math.max(1, w * .012), hy * .78, i % 3 ? '#dff2f4' : '#a8d8e0'); }
      A.rect(w * .38, hy * .18, w * .22, 3, '#3f6a3a');
      for (var t = 0; t < 10; t++) { var tx = R() < .5 ? R() * w * .36 : w * (.62 + R() * .36), ty = hy * (.12 + R() * .3); A.ell(tx, ty, 4 + R() * 4, 3 + R() * 2, t % 2 ? '#3f6a3a' : '#2f5a32'); }
      A.ell(w * .49, hy + 1, w * .14, 3, '#f4fbfc');
      var B = painter(w, h);
      for (var f = 0; f < 10; f++) { var fx = w * (.36 + R() * .26), fyy = hy + 2 + R() * (fy - hy) * .35; B.rect(fx, fyy, 2 + R() * 4, 1, '#e8f6f8'); }
      for (var r = 0; r < 4; r++) { var rx = w * (.08 + r * .26 + R() * .06), ry = hy + (fy - hy) * (.3 + R() * .5); B.ell(rx, ry, 5 + R() * 4, 2.5, '#5a5e62'); B.ell(rx - 1, ry - 1, 3, 1.2, '#7a7e82'); B.rect(rx - 6, ry + 1, 12, 1, '#dff2f4'); }
      var C = painter(w, h);
      C.poly([0, fy - 6, w * .14, fy - 10, w * .3, fy - 4, w * .36, h, 0, h], '#6a6e70');
      C.poly([0, fy - 6, w * .14, fy - 10, w * .2, fy - 8, w * .04, fy - 3], '#8a8e90');
      C.poly([w * .56, fy, w * .7, fy - 5, w * .9, fy - 3, w, fy - 6, w, h, w * .52, h], '#5e6264');
      C.poly([w * .7, fy - 5, w * .9, fy - 3, w * .84, fy - 1, w * .68, fy - 2], '#7e8284');
      C.ell(w * .12, fy - 9, w * .06, 1.4, '#4f7a3a'); C.ell(w * .86, fy - 4, w * .05, 1.2, '#4f7a3a');
      grassTufts(C, w * .55, w, fy + 2, 8, R, ['#4f7a3a', '#5a8a44']);
      return [A.done(), B.done(), C.done()];
    },
    cuasong: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      A.rect(0, hy - 2, w, 3, '#6a7a4a');
      // hàng dừa nước và hải đăng xa
      for (var i = 0; i < 9; i++) { var x = w * (.02 + i * .07 + R() * .03); for (var k = 0; k < 4; k++) A.line(x, hy - 1, x + (k - 1.5) * 3, hy - 6 - R() * 4, k % 2 ? '#4f7a3a' : '#3f6a32'); }
      var lx = w * .86; A.rect(lx, hy - hy * .3, 3, hy * .3, '#f0ece0'); A.rect(lx, hy - hy * .22, 3, 2, '#c8382f'); A.rect(lx, hy - hy * .12, 3, 2, '#c8382f'); A.rect(lx - 1, hy - hy * .3 - 2, 5, 2, '#3a3e48'); A.rect(lx, hy - hy * .3 - 4, 3, 2, '#ffe880');
      // chòi vó
      var B = painter(w, h), vx = w * .62, vy = hy + (fy - hy) * .28;
      B.rect(vx, vy - 14, 1, 16, '#5a3a24'); B.rect(vx + 14, vy - 14, 1, 16, '#5a3a24'); B.rect(vx - 2, vy - 15, 19, 2, '#7a5a34');
      B.poly([vx - 3, vy - 15, vx + 7.5, vy - 22, vx + 18, vy - 15], '#a8864a');
      B.stroke('#6a5a44', 1); B.c.beginPath(); B.c.moveTo(vx + 15, vy - 10); B.c.lineTo(vx + 34, vy - 18); B.c.stroke();
      B.stroke('#c8c0a8', 1); B.c.beginPath(); B.c.moveTo(vx + 26, vy - 14); B.c.lineTo(vx + 22, vy - 2); B.c.lineTo(vx + 40, vy - 2); B.c.lineTo(vx + 34, vy - 18); B.c.stroke();
      for (var n = 0; n < 4; n++) B.line(vx + 24 + n * 4, vy - 2, vx + 26 + n * 3, vy - 15, '#c8c0a8');
      B.rect(vx - 1, vy + 2, 17, 1, '#c8d0c0');
      for (var m = 0; m < 5; m++) { var my = hy + 4 + R() * (fy - hy - 12); B.ell(w * R() * .5, my, 3 + (my - hy) / (fy - hy) * 4, 1, '#9a9a7a'); }
      var C = painter(w, h);
      C.poly([0, fy - 3, w * .45, fy, w * .5, h, 0, h], '#7a6a4a');
      C.poly([0, fy + 2, w * .4, fy + 3, w * .44, h, 0, h], '#6a5a3c');
      for (var s = 0; s < 8; s++) C.ell(w * (.04 + s * .05), fy + 5 + R() * (h - fy - 8), 1.6, 1, '#f0e8d8');
      for (var c2 = 0; c2 < 3; c2++) { var cx = w * (.1 + c2 * .1); C.ell(cx, fy + 2, 1.5, 1, '#c84a3a'); }
      // mạn xuồng gỗ
      C.poly([w * .52, fy + 4, w * .6, fy - 2, w, fy - 3, w, h, w * .55, h], '#5a7a6a');
      C.poly([w * .54, fy + 7, w * .62, fy + 2, w, fy + 1, w, h, w * .57, h], '#8a6238');
      for (var y = fy + 6; y < h; y += 4) C.rect(w * .58, y, w * .42, 1, '#6a4a2a');
      C.rect(w * .6, fy - 2, w * .4, 1, '#c8d8c8');
      return [A.done(), B.done(), C.done()];
    },
    ran: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      var ix = w * .7, iw = w * .2;
      A.ell(ix, hy, iw, 4, '#f4e8c0'); A.ell(ix, hy - 1, iw * .8, 3, '#ffe8b0');
      palm(A, ix - iw * .3, hy - 2, hy * .32, R); palm(A, ix + iw * .25, hy - 2, hy * .26, R);
      A.rect(0, hy, w, 1, '#bfeaf0');
      var B = painter(w, h);
      // san hô thấp thoáng dưới nước
      for (var i = 0; i < 12; i++) {
        var yy = hy + 10 + R() * (fy - hy - 14), d = (yy - hy) / (fy - hy), x = w * R() * .9, r = 1.5 + d * 4, cols = ['#7aa8a8', '#8ab09a', '#6a9ab0', '#8aa8a0'];
        B.ell(x, yy, r * 1.4, r * .5, cols[i % 4]); B.ell(x - r * .5, yy - r * .3, r * .5, r * .4, cols[(i + 1) % 4]);
      }
      for (var g = 0; g < 8; g++) B.rect(w * R(), hy + 3 + R() * (fy - hy) * .6, 3 + R() * 6, 1, '#d8fbff');
      var C = painter(w, h);
      C.poly([0, fy - 1, w * .5, fy + 2, w * .62, fy - 2, w, fy - 4, w, h, 0, h], '#f4e4b8');
      C.poly([0, fy + 4, w, fy + 1, w, h, 0, h], '#e8d4a0');
      C.rect(0, fy - 1, w * .5, 1, '#ffffff');
      for (var s = 0; s < 14; s++) C.rect(w * R(), fy + 4 + R() * (h - fy - 6), 1, 1, '#c8b080');
      var sx = w * .78; C.ell(sx, fy + 6, 4, 2.5, '#f4f0e8'); C.ell(sx, fy + 5, 2.5, 1.5, '#e8a0a0');
      C.ell(w * .16, fy + 8, 3, 2, '#e8603a');
      return [A.done(), B.done(), C.done()];
    },
    vinh: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      var n = Math.max(5, Math.round(w / 34));
      for (var i = 0; i < n; i++) {
        var x = w * (i + .2 + R() * .6) / n, ph = hy * (.28 + R() * .38), pw = w / n * (.22 + R() * .18), far = i % 2;
        var col = far ? '#7a8a8a' : '#5a6a66', top = far ? '#6a8a5a' : '#4a7a4a';
        A.poly([x - pw, hy + 1, x - pw * .9, hy - ph * .6, x - pw * .55, hy - ph, x + pw * .4, hy - ph * .96, x + pw * .85, hy - ph * .55, x + pw, hy + 1], col);
        A.ell(x - pw * .05, hy - ph * .95, pw * .62, ph * .1, top);
        A.rect(x - pw * .5, hy - ph * .5, 1, ph * .4, shade(col, -.15));
      }
      A.rect(0, hy, w, 1, '#9ac8c0');
      var B = painter(w, h), bx = w * .28, by = hy + (fy - hy) * .2, bw = Math.max(20, w * .12);
      B.poly([bx, by, bx + bw, by, bx + bw * .86, by + 3, bx + bw * .12, by + 3], '#5a3a24');
      B.rect(bx + bw * .3, by - 15, 1, 15, '#3a2a1e'); B.rect(bx + bw * .66, by - 11, 1, 11, '#3a2a1e');
      B.poly([bx + bw * .32, by - 14, bx + bw * .6, by - 12, bx + bw * .58, by - 3, bx + bw * .32, by - 3], '#c84a2a');
      B.poly([bx + bw * .68, by - 10, bx + bw * .9, by - 8, bx + bw * .88, by - 3, bx + bw * .68, by - 3], '#d8603a');
      for (var l = 0; l < 3; l++) { B.rect(bx + bw * .32, by - 12 + l * 3, bw * .27, 1, '#8a2a1a'); }
      var C = painter(w, h);
      // bè tre nuôi cá
      C.rect(0, fy, w, h - fy, '#a8884a');
      for (var x2 = 0; x2 < w; x2 += 4) C.rect(x2, fy, 1, h - fy, '#7a6030');
      C.rect(0, fy, w, 1, '#d8c080'); C.rect(0, fy + 6, w, 1, '#6a5028');
      C.rect(w * .08, fy - 8, 2, 9, '#6a5028'); C.rect(w * .5, fy - 8, 2, 9, '#6a5028'); C.rect(w * .92, fy - 8, 2, 9, '#6a5028');
      C.rect(w * .08, fy - 7, w * .86, 1, '#c8b080');
      C.ell(w * .3, fy + 10, 5, 3, '#2f6fa8'); C.ell(w * .3, fy + 9, 3.5, 1.5, '#6aa8d8');
      return [A.done(), B.done(), C.done()];
    },
    sau: function (w, h, hy, fy, R) {
      var A = painter(w, h);
      A.rect(0, hy, w, 1, '#6a8ab0');
      // phao báo hiệu xa
      var px = w * .7; A.rect(px, hy - 7, 3, 7, '#e8502a'); A.rect(px - 1, hy - 1, 5, 2, '#2a2a34'); A.rect(px + 1, hy - 10, 1, 3, '#2a2a34'); A.rect(px, hy - 11, 3, 1, '#ffe880');
      A.rect(w * .18, hy - 2, 8, 2, '#5a6a7a'); A.rect(w * .18 + 2, hy - 4, 3, 2, '#7a8a9a');
      var B = painter(w, h);
      for (var i = 0; i < 9; i++) { var yy = hy + 3 + R() * (fy - hy) * .7; B.rect(w * R(), yy, 4 + R() * 10, 1, i % 2 ? '#4a7ab0' : '#3a6aa0'); }
      for (var d = 0; d < 6; d++) B.rect(w * R(), hy + (fy - hy) * (.4 + R() * .55), 1, 1, '#8af0ff');
      var C = painter(w, h);
      // boong tàu thép
      C.poly([0, fy - 2, w, fy - 4, w, h, 0, h], '#5a6470');
      C.poly([0, fy + 3, w, fy + 1, w, h, 0, h], '#3e4650');
      for (var x = 6; x < w; x += 12) C.rect(x, fy + 4, 1, h - fy - 4, '#2e343c');
      for (var y = fy + 8; y < h; y += 6) C.rect(0, y, w, 1, '#4a525c');
      C.rect(0, fy - 10, w, 1, '#c8ccd4'); C.rect(0, fy - 6, w, 1, '#a8acb4');
      for (var p = 3; p < w; p += 16) C.rect(p, fy - 10, 1, 9, '#c8ccd4');
      C.rect(w * .12, fy - 3, 8, 5, '#d8a030'); C.rect(w * .12, fy - 3, 8, 1, '#f0c050');
      C.ell(w * .82, fy + 1, 6, 2.5, '#e8502a'); C.ell(w * .82, fy + 1, 3, 1.2, '#f4f0e8');
      return [A.done(), B.done(), C.done()];
    }
  };

  // ---------- người câu cá ----------
  var FISHER = [
    '....hhhh....',
    '..hhhHHhhh..',
    '.hhhhhhhhhh.',
    'kkkkkkkkkkkk',
    '....ssss....',
    '....ssss....',
    '...aaaaaa...',
    '..aaaaaaaa..',
    '..aaAaaaas..',
    '..aaaaaas...',
    '..aaaaaa....',
    '..pppppppp..',
    '..pppppppppp',
    '..pp....ssss',
    '..pp........',
    '..ss........'
  ];
  CA.fisher = function (shirt) {
    var cols = { h: '#e2c886', H: '#f4e0a8', k: '#8a6a3a', s: '#d8a070', a: shirt || '#7a4a34', A: '#5a3424', p: '#2f3448' };
    var w = FISHER[0].length, h = FISHER.length, P = painter(w, h);
    FISHER.forEach(function (row, y) { for (var x = 0; x < w; x++) { var ch = row[x]; if (cols[ch]) P.rect(x, y, 1, 1, cols[ch]); } });
    return P.done('#1b1d2a');
  };

  // ---------- sinh vật ----------
  var OUT = '#1b1d2a';
  function fishBody(c, L, cy, hh, a) {
    var x0 = L * .2, blunt = a.snout === 'blunt', up = a.snout === 'up' ? -hh * .16 : 0;
    c.beginPath();
    c.moveTo(L, cy + up);
    c.quadraticCurveTo(L * (blunt ? 1 : .94), cy - hh * .52, L * .6, cy - hh * .5);
    c.quadraticCurveTo(L * .3, cy - hh * .46, x0, cy - hh * .13);
    c.lineTo(x0, cy + hh * .13);
    c.quadraticCurveTo(L * .3, cy + hh * .46, L * .6, cy + hh * .5);
    c.quadraticCurveTo(L * (blunt ? 1 : .94), cy + hh * .5, L, cy + up);
    c.closePath();
  }
  function tail(P, L, cy, hh, kind, col) {
    var x = L * .2;
    if (kind === 'fork') P.poly([x + 2, cy, 0, cy - hh * .55, L * .08, cy, 0, cy + hh * .55], col);
    else if (kind === 'moon') P.poly([x + 1, cy - hh * .1, L * .02, cy - hh * .8, L * .1, cy, L * .02, cy + hh * .8, x + 1, cy + hh * .1], col);
    else if (kind === 'round') P.ell(L * .12, cy, L * .11, hh * .42, col);
    else if (kind === 'fan') { P.c.fillStyle = P.col(col); P.c.beginPath(); P.c.moveTo(x + 2, cy); P.c.arc(x + 2, cy, L * .3, Math.PI - 1.05, Math.PI + 1.05); P.c.closePath(); P.c.fill(); }
    else if (kind === 'point') P.poly([x + 2, cy - hh * .22, 0, cy, x + 2, cy + hh * .22], col);
  }
  /* Cá vẽ chi tiết: thân đổ bóng nhiều tầng (lưng tối, sườn ánh bạc, bụng sáng), vây có tia,
   * nắp mang, miệng, mắt có tròng. L: chiều dài thân tính bằng điểm ảnh. */
  function drawFish(a, L) {
    var hh = Math.max(8, L * (a.h || .3) * 1.12), sail = a.dor === 'sail';
    var padT = Math.ceil(hh * (sail ? 1.15 : a.dor === 'tall' || a.dor === 'spiky' ? .62 : .42)) + 3, padB = Math.ceil(hh * (a.anal ? .5 : .36)) + 3;
    var padL = Math.ceil(L * (a.tail === 'fan' ? .1 : .02)) + 1, extra = a.snout === 'bill' ? Math.ceil(L * .35) : 3;
    var W = Math.ceil(L + padL + extra + 2), H = Math.ceil(hh + padT + padB), P = painter(W, H, false), c = P.c;
    var cy0 = padT + hh / 2, x0 = L * .17, up = a.snout === 'up' ? -.14 : a.snout === 'lips' ? .04 : 0, blunt = a.snout === 'blunt';
    var back = hex(a.c[0]), belly = hex(a.c[1]), fin = hex(a.c[2]);
    var R = rnd(L * 31 + (a.c[0].charCodeAt(2) || 1) * 7 + (a.c[1].charCodeAt(3) || 1));
    // dáng thân: u = 0 ở cuống đuôi, 1 ở mõm
    function prof(x) {
      var u = Math.max(0, Math.min(1, (x - x0) / (L - x0)));
      var uu = blunt ? .05 + .87 * u : .02 + .96 * u;
      var f = Math.pow(Math.sin(Math.PI * Math.pow(uu, .85)), .62);
      f = .17 + .83 * f;
      if (u > .985 && !blunt) f *= .6;
      var hump = a.hump ? Math.max(0, 1 - Math.abs(u - .62) / .22) * .22 : 0;
      var cy = cy0 + up * hh * Math.max(0, u - .55) / .45;
      return { u: u, top: cy - hh * .5 * (f * 1.04 + hump), bot: cy + hh * .5 * f * .96, cy: cy };
    }
    function ox(x) { return x + padL; }
    var fd = shade(fin, -.28), fl = shade(fin, .18);
    function finQ(b1, b2, o1, o2, col, rays) {
      P.poly([ox(b1[0]), b1[1], ox(o1[0]), o1[1], ox(o2[0]), o2[1], ox(b2[0]), b2[1]], col);
      for (var k = 1; k < rays; k++) { var t = k / rays; P.line(ox(b1[0] + (b2[0] - b1[0]) * t), b1[1] + (b2[1] - b1[1]) * t, ox(o1[0] + (o2[0] - o1[0]) * t), o1[1] + (o2[1] - o1[1]) * t, k % 2 ? fd : fl); }
    }
    var pT = prof(x0 + 1), tailX = x0 + 1, tcy = pT.cy;
    // ---- đuôi
    var th = hh * (a.tail === 'moon' ? .95 : a.tail === 'fork' ? .78 : .6);
    if (a.tail === 'fork') { finQ([tailX + 2, tcy - hh * .1], [tailX + 2, tcy - 1], [0, tcy - th], [L * .07, tcy - 1], fin, 5); finQ([tailX + 2, tcy + 1], [tailX + 2, tcy + hh * .1], [L * .07, tcy + 1], [0, tcy + th], fin, 5); }
    else if (a.tail === 'moon') { finQ([tailX + 2, tcy - hh * .08], [tailX + 2, tcy], [-1, tcy - th], [L * .1, tcy - th * .15], fin, 4); finQ([tailX + 2, tcy], [tailX + 2, tcy + hh * .08], [L * .1, tcy + th * .15], [-1, tcy + th], fin, 4); }
    else if (a.tail === 'round') { P.ell(ox(L * .1), tcy, L * .1, hh * .36, fin); for (var rr = -3; rr <= 3; rr++) P.line(ox(tailX + 1), tcy, ox(L * .02), tcy + rr * hh * .1, rr % 2 ? fd : fl); }
    else if (a.tail === 'fan') { c.fillStyle = P.col(fin); c.beginPath(); c.moveTo(ox(tailX + 2), tcy); c.arc(ox(tailX + 2), tcy, L * .26, Math.PI - 1.1, Math.PI + 1.1); c.closePath(); c.fill(); for (var fr = -4; fr <= 4; fr++) { var an = Math.PI + fr * .25; P.line(ox(tailX + 2), tcy, ox(tailX + 2 + Math.cos(an) * L * .25), tcy + Math.sin(an) * L * .25, fr % 2 ? fd : fl); } }
    else if (a.tail === 'point') P.poly([ox(tailX + 3), tcy - hh * .2, ox(0), tcy, ox(tailX + 3), tcy + hh * .2], fin);
    // ---- vây lưng, vây hậu môn, vây bụng (sau thân)
    function topAt(t) { return prof(L * t).top; }
    function botAt(t) { return prof(L * t).bot; }
    var dh = hh * (a.dor === 'tall' ? .5 : a.dor === 'low' ? .22 : a.dor === 'long' ? .2 : a.dor === 'tiny' ? .1 : .3);
    if (a.dor === 'spiky') {
      var pts = [ox(L * .34), topAt(.34) + 2];
      for (var i = 0; i <= 9; i++) { var tx = .36 + i * .035; pts.push(ox(L * tx), topAt(tx) - (i % 2 ? hh * .14 : hh * .36) * (1 - i * .05)); }
      pts.push(ox(L * .7), topAt(.7) + 2); P.poly(pts, fin);
      for (var s2 = 0; s2 <= 9; s2 += 2) P.line(ox(L * (.36 + s2 * .035)), topAt(.36 + s2 * .035) + 1, ox(L * (.36 + s2 * .035)), topAt(.36 + s2 * .035) - hh * .34 * (1 - s2 * .05), fd);
      finQ([L * .24, topAt(.24) + 2], [L * .34, topAt(.34) + 2], [L * .27, topAt(.27) - hh * .22], [L * .34, topAt(.34) - hh * .12], fin, 3);
    } else if (a.dor === 'sail') {
      finQ([L * .3, topAt(.3) + 2], [L * .78, topAt(.78) + 2], [L * .36, topAt(.36) - hh * 1.1], [L * .64, topAt(.64) - hh * .75], fin, 9);
    } else if (a.dor === 'long') {
      finQ([L * .24, topAt(.24) + 2], [L * .7, topAt(.7) + 2], [L * .28, topAt(.28) - dh], [L * .66, topAt(.66) - dh * .9], fin, 9);
    } else if (a.dor && a.dor !== 'none') {
      finQ([L * .42, topAt(.42) + 2], [L * .6, topAt(.6) + 2], [L * .47, topAt(.47) - dh], [L * .52, topAt(.52) - dh * .5], fin, 4);
      if (a.finlet || a.dor === 'tall' && L > 70 && a.tail === 'moon') finQ([L * .26, topAt(.26) + 2], [L * .33, topAt(.33) + 2], [L * .28, topAt(.28) - dh * .45], [L * .32, topAt(.32) - dh * .2], fin, 2);
    }
    if (a.adi) P.ell(ox(L * .29), topAt(.29) - 1, L * .025, hh * .07, fin);
    if (a.anal) finQ([L * .24, botAt(.24) - 2], [L * .62, botAt(.62) - 2], [L * .28, botAt(.28) + hh * .3], [L * .58, botAt(.58) + hh * .22], fin, 7);
    else finQ([L * .26, botAt(.26) - 2], [L * .36, botAt(.36) - 2], [L * .29, botAt(.29) + hh * .2], [L * .34, botAt(.34) + hh * .1], fin, 3);
    finQ([L * .5, botAt(.5) - 2], [L * .58, botAt(.58) - 2], [L * .48, botAt(.48) + hh * .24], [L * .52, botAt(.52) + hh * .14], fin, 3);
    if (a.finlet) for (var f = 0; f < 5; f++) { var fx = L * (.2 + f * .035); P.poly([ox(fx), topAt(fx / L) + 1, ox(fx + 1.5), topAt(fx / L) - 2, ox(fx + 2.5), topAt(fx / L) + 1], '#e8c22a'); P.poly([ox(fx), botAt(fx / L) - 1, ox(fx + 1.5), botAt(fx / L) + 2, ox(fx + 2.5), botAt(fx / L) - 1], '#e8c22a'); }
    if (a.snout === 'bill') P.poly([ox(L * .97), prof(L * .97).cy - hh * .1, ox(L * 1.33), prof(L).cy - hh * .02, ox(L * .97), prof(L * .97).cy + hh * .05], shade(back, .12));
    // ---- thân: tô từng điểm ảnh theo vị trí dọc, có hoà sắc Bayer ở chỗ chuyển màu
    var dark = shade(back, -.25), side = mix(back, belly, .55), sheen = mix(mix(back, belly, .7), [255, 255, 255], .45), under = shade(belly, -.14);
    var tones = [dark, back, side, belly, under];
    var cut = [.13, .4, .55, .9];
    var scaleStep = a.bigScale ? 5 : 4;
    for (var x = Math.floor(x0); x <= Math.ceil(L); x++) {
      var p = prof(x + .5), top = p.top, bot = p.bot, hgt = bot - top;
      if (hgt < 1) continue;
      for (var y = Math.floor(top); y <= Math.ceil(bot); y++) {
        if (y + .5 < top || y + .5 > bot) continue;
        var v = (y + .5 - top) / hgt, b = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - .5) * .07, vv = v + b, k = 0;
        while (k < cut.length && vv > cut[k]) k++;
        var col = tones[k];
        if (Math.abs(v - .47) < .5 / hgt * 1.2 && p.u > .1 && p.u < .78) col = sheen;
        // vảy: hình bán nguyệt tối nhẹ ở nửa trên
        if (a.pat === 'scales' && v < .62 && p.u > .08 && p.u < .76) {
          var row = Math.floor((y - top) / (scaleStep * .75)), sx = (x + (row % 2) * scaleStep / 2) % scaleStep;
          if (sx < .9 || (y - top) % (scaleStep * .75) < .8 && sx > scaleStep * .3 && sx < scaleStep * .7) col = mix(col, [10, 12, 20], .22);
        }
        c.fillStyle = P.col(col); c.fillRect(ox(x), y, 1, 1);
      }
    }
    // ---- hoa văn
    var pc = a.pc ? hex(a.pc) : shade(back, -.35);
    function inBody(x, y) { var p = prof(x); return y >= p.top + .5 && y <= p.bot - .5; }
    function dot(x, y, col, w, h) { for (var i = 0; i < (w || 1); i++) for (var j = 0; j < (h || 1); j++) if (inBody(x + i, y + j)) { c.fillStyle = P.col(col); c.fillRect(ox(Math.round(x + i)), Math.round(y + j), 1, 1); } }
    var pcol = pc.length > 3 && pc[3] < 1 ? mix(back, [pc[0], pc[1], pc[2]], Math.min(1, pc[3] * 1.4)) : pc;
    if (a.pat === 'bars') for (var bi = 0; bi < 6; bi++) { var bx = L * (.3 + bi * .095), pr = prof(bx); for (var by = pr.top; by < pr.top + (pr.bot - pr.top) * .75; by++) dot(bx, by, mix(back, [0, 0, 0], .3), Math.max(2, L * .035), 1); }
    if (a.pat === 'stripes') for (var sr = 0; sr < 3; sr++) for (var sxx = x0 + 3; sxx < L * .82; sxx++) { var ps = prof(sxx); dot(sxx, ps.top + (ps.bot - ps.top) * (.28 + sr * .16), pcol); }
    if (a.pat === 'stripe') for (var s1 = x0 + 2; s1 < L * .86; s1++) { var p1 = prof(s1); dot(s1, p1.top + (p1.bot - p1.top) * .46, pc.length > 3 && pc[3] < 1 ? mix(belly, [pc[0], pc[1], pc[2]], .8) : pc, 1, Math.max(1, Math.round(hh * .08))); }
    if (a.band) for (var bd = x0 + 2; bd < L * .84; bd++) { var pb = prof(bd); dot(bd, pb.top + (pb.bot - pb.top) * .4, hex(a.band), 1, Math.max(2, Math.round(hh * .14))); }
    if (a.pat === 'band' && !a.band) for (var bn = x0 + 2; bn < L * .84; bn++) { var pn = prof(bn); dot(bn, pn.top + (pn.bot - pn.top) * .36, mix(back, [0, 0, 0], .25), 1, Math.max(2, Math.round(hh * .16))); }
    if (a.pat === 'spots' || a.pat === 'dots') for (var d = 0; d < L * .9; d++) { var dx = L * (.2 + R() * .62), pd = prof(dx), dy = pd.top + (pd.bot - pd.top) * (a.pat === 'dots' ? .1 + R() * .8 : .08 + R() * .5); dot(dx, dy, a.pat === 'dots' && a.pc && a.pc.indexOf('#') === 0 ? a.pc : mix(back, [0, 0, 0], .45), R() > .6 ? 2 : 1, 1); }
    if (a.pat === 'blotch') for (var bk = 0; bk < 7; bk++) { var kx = L * (.26 + bk * .085), pk = prof(kx), ky = pk.top + (pk.bot - pk.top) * (bk % 2 ? .45 : .25); for (var q = 0; q < 9; q++) dot(kx + (R() - .5) * L * .06, ky + (R() - .5) * hh * .2, mix(back, [0, 0, 0], .42), 2, 1); }
    if (a.pat === 'wavy') for (var wv = 0; wv < 9; wv++) { var wx = L * (.28 + wv * .06), pw = prof(wx); for (var wy = 0; wy < (pw.bot - pw.top) * .34; wy++) dot(wx + Math.sin(wy * .9) * 1.2, pw.top + 1 + wy, mix(back, [0, 0, 0], .38)); }
    if (a.pat === 'clown') [.78, .52, .28].forEach(function (t) { var cx2 = L * t, pcw = prof(cx2); for (var yy = pcw.top; yy <= pcw.bot; yy++) { dot(cx2 - L * .05, yy, '#1b1d2a', 1, 1); dot(cx2 - L * .04, yy, '#f8f8f4', Math.max(2, L * .07), 1); dot(cx2 + L * .035, yy, '#1b1d2a', 1, 1); } });
    // ---- nắp mang, vây ngực, miệng
    var gx = L * (blunt ? .76 : .78), pg = prof(gx), gcol = mix(back, [0, 0, 0], .38);
    for (var gy = pg.top + (pg.bot - pg.top) * .16; gy < pg.bot - (pg.bot - pg.top) * .08; gy++) { var gt = (gy - pg.top) / (pg.bot - pg.top); dot(gx - Math.sin(gt * Math.PI) * L * .035, gy, gcol); }
    var head = mix(side, [255, 255, 255], .08);
    for (var hy2 = pg.top + (pg.bot - pg.top) * .42; hy2 < pg.bot - (pg.bot - pg.top) * .2; hy2++) dot(gx + 1, hy2, head, Math.round(L * .05), 1);
    var px0 = gx - L * .03, pp = prof(px0), py = pp.top + (pp.bot - pp.top) * .55, pf = shade(fin, .08), pe = shade(fin, -.4);
    var pfl = L * .15, pfh = hh * .2;
    P.poly([ox(px0), py - 1, ox(px0 - pfl * .55), py - pfh * .25, ox(px0 - pfl), py + pfh * .35, ox(px0 - pfl * .8), py + pfh, ox(px0), py + 2], pf);
    for (var pr2 = 0; pr2 < 4; pr2++) P.line(ox(px0), py + pr2 * .7, ox(px0 - pfl * (.62 + pr2 * .12)), py - pfh * .2 + pr2 * pfh * .38, pr2 % 2 ? pe : fd);
    P.line(ox(px0), py - 1, ox(px0 - pfl * .55), py - pfh * .25, pe);
    var mp = prof(L * .985), my = mp.cy + hh * (a.snout === 'up' ? -.02 : .08);
    for (var mx = L * .9; mx < L * .99; mx++) dot(mx, my + (L * .99 - mx) * .12, mix(back, [0, 0, 0], .5));
    if (a.snout === 'lips') P.ell(ox(L * .995), my, L * .03, hh * .08, '#e07a7a');
    c.restore && 0;
    var cvs = P.done(OUT), cx = cvs.getContext('2d');
    if (a.glass) {
      var im2 = cx.getImageData(0, 0, W, H), d2 = im2.data;
      for (var g = 0; g < d2.length; g += 4) if (d2[g + 3] && !(d2[g] === 27 && d2[g + 1] === 29)) d2[g + 3] = 170;
      cx.putImageData(im2, 0, 0);
    }
    // ---- mắt: tròng sáng, con ngươi, đốm sáng
    var ep = prof(L * .885), er = Math.max(2, Math.round(L * (a.eye === 'big' ? .055 : .036))), ex = Math.round(ox(L * .885)), ey = Math.round(ep.top + (ep.bot - ep.top) * (a.eye === 'low' ? .5 : .36));
    var iris = a.eye === 'red' ? '#e8503a' : css(mix(fin, [240, 220, 140], .55));
    cx.fillStyle = css(mix(back, [0, 0, 0], .45)); cx.beginPath(); cx.arc(ex + .5, ey + .5, er + 1, 0, 7); cx.fill();
    cx.fillStyle = iris; cx.beginPath(); cx.arc(ex + .5, ey + .5, er, 0, 7); cx.fill();
    cx.fillStyle = OUT; cx.beginPath(); cx.arc(ex + .5, ey + .5, Math.max(1, er * .6), 0, 7); cx.fill();
    cx.fillStyle = '#ffffff'; cx.fillRect(ex - Math.floor(er * .3), ey - Math.floor(er * .3), 1, 1);
    if (a.fangs) { cx.fillStyle = '#f4f4ec'; for (var fg = 0; fg < 4; fg++) cx.fillRect(Math.round(ox(L * (.9 + fg * .025))), Math.round(my + 1), 1, 2); }
    // ---- râu
    if (a.bar) for (var qb = 0; qb < a.bar; qb++) bres(cx, ox(L * .97), my + qb * 1.5, ox(L * (1.03 + qb * .03)), my + hh * (.45 + qb * .28), css(shade(fin, -.3)));
    return cropC(cvs);
  }
  function cropC(c) {
    var w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return c;
    var o = canvas(x1 - x0 + 3, y1 - y0 + 3); o.getContext('2d').drawImage(c, x0 - 1, y0 - 1, o.width, o.height, 0, 0, o.width, o.height); return o;
  }
  var SK = 2; // các hình đặc biệt vẽ gấp đôi, nét mảnh 1 px cho chi tiết
  function fx(cv, fn) { var c = cv.getContext('2d'); c.save(); c.setTransform(1, 0, 0, 1, 0, 0); fn(c); c.restore(); return cv; }
  function eyeS(cv, x, y, r, iris, slit) {
    return fx(cv, function (c) {
      var X = Math.round(x * SK), Y = Math.round(y * SK), R = Math.max(1.5, r * SK);
      c.fillStyle = OUT; c.beginPath(); c.arc(X + .5, Y + .5, R + 1, 0, 7); c.fill();
      c.fillStyle = css(iris || '#e8d27a'); c.beginPath(); c.arc(X + .5, Y + .5, R, 0, 7); c.fill();
      c.fillStyle = OUT; c.beginPath();
      if (slit) c.ellipse(X + .5, Y + .5, Math.max(1, R * .75), Math.max(.6, R * .28), 0, 0, 7); else c.arc(X + .5, Y + .5, Math.max(1, R * .55), 0, 7);
      c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(X - Math.floor(R * .45), Y - Math.floor(R * .45), 1, 1);
    });
  }
  function lineS(cv, x1, y1, x2, y2, col) { return fx(cv, function (c) { bres(c, x1 * SK, y1 * SK, x2 * SK, y2 * SK, css(col)); }); }
  function dotS(cv, x, y, col, n) { return fx(cv, function (c) { c.fillStyle = css(col); c.fillRect(Math.round(x * SK), Math.round(y * SK), n || 1, n || 1); }); }
  /* chỉ vẽ lên chỗ đã có hình (nét gân, vạch đốt) */
  function inkS(cv, pts, col) {
    return fx(cv, function (c) {
      var w = cv.width, h = cv.height, d = c.getImageData(0, 0, w, h).data; c.fillStyle = css(col);
      for (var i = 0; i < pts.length; i += 2) { var x = Math.round(pts[i] * SK), y = Math.round(pts[i + 1] * SK); if (x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3]) c.fillRect(x, y, 1, 1); }
    });
  }
  function segPts(x1, y1, x2, y2) { var n = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * SK), o = []; for (var i = 0; i <= n; i++) o.push(x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n); return o; }
  function arcPts(cx, cy, rx, ry, a0, a1) { var o = [], n = Math.ceil(Math.max(rx, ry) * SK * Math.abs(a1 - a0)) + 2; for (var i = 0; i <= n; i++) { var t = a0 + (a1 - a0) * i / n; o.push(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry); } return o; }
  function curve(P, col, lw, pts) {
    var c = P.c; P.stroke(col, lw); c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0], pts[1]);
    for (var i = 2; i + 3 < pts.length; i += 4) c.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
    c.stroke();
  }
  function blob(P, pts, col) { // đường cong khép kín qua các điểm (trung điểm)
    var c = P.c, n = pts.length / 2; c.fillStyle = P.col(col); c.beginPath();
    function m(i) { i = (i + n) % n; return [pts[i * 2], pts[i * 2 + 1]]; }
    var s = m(0), e = m(n - 1); c.moveTo((s[0] + e[0]) / 2, (s[1] + e[1]) / 2);
    for (var i = 0; i < n; i++) { var p = m(i), q = m(i + 1); c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    c.closePath(); c.fill();
  }
  function eel(a, L) {
    var th = Math.max(3, L * (a.short ? .12 : a.moray ? .1 : .075)) * (a.worm ? 1.15 : 1), A = th * .9;
    if (a.gulper) th = L * .05;
    var padH = a.gulper ? 9 : a.crest ? 6 : 2, W = Math.ceil(L + 6), H = Math.ceil(th * 3.4 + 4 + padH * 2), P = painter(W, H, false, SK), c = P.c, cy = H / 2 + (a.crest ? 2 : 0);
    var N = 48, C = [];
    for (var i = 0; i <= N; i++) {
      var t = i / N, x = 2 + L * t, y = cy + Math.sin(t * Math.PI * 2.2) * A, dy = Math.cos(t * Math.PI * 2.2) * A * Math.PI * 2.2 / L, nl = Math.sqrt(1 + dy * dy);
      var w = th * (a.worm ? Math.min(1, .55 + Math.sin(t * Math.PI) * .7) : Math.min(1, .2 + t * 4.5) * (t > .93 ? 1 - (t - .93) * 3 : 1));
      C.push({ x: x, y: y, nx: -dy / nl, ny: 1 / nl, w: w });
    }
    function side(k, off, t0, t1) { var o = []; C.forEach(function (p, i) { var t = i / N; if (t < t0 || t > t1) return; o.push(p.x + p.nx * (p.w / 2 * k + off), p.y + p.ny * (p.w / 2 * k + off)); }); return o; }
    function band(k1, k2, o1, o2, t0, t1, col) { var top = side(k1, o1, t0, t1), bt = side(k2, o2, t0, t1), pts = top.slice(); for (var i = bt.length - 2; i >= 0; i -= 2) pts.push(bt[i], bt[i + 1]); P.poly(pts, col); }
    var finC = a.crest ? '#e84a3a' : a.c[2];
    if (a.fin || a.moray) { band(-1, -1, -th * (a.crest ? .7 : .45), 0, .1, .9, finC); band(1, 1, 0, th * .38, .1, .55, finC); }
    if (!a.worm && !a.fin) band(-1, 1, -th * .2, th * .2, 0, .14, a.c[2]);
    band(-1, 1, 0, 0, 0, 1, a.c[0]);
    band(.15, 1, 0, 0, .04, .98, a.c[1]);
    band(-1, -.35, 0, 0, .04, .98, shade(a.c[0], -.12));
    var h = C[N], hp = C[Math.round(N * .95)];
    if (a.moray) P.ell(hp.x, hp.y, th * .62, th * .62, a.c[0]);
    if (a.gulper) { P.poly([h.x - 10, h.y - 2, h.x + 3, h.y - 8, h.x + 3, h.y + 2], shade(a.c[0], .1)); P.poly([h.x - 10, h.y - 1, h.x + 3, h.y + 1, h.x + 2, h.y + 9], a.c[1]); P.poly([h.x - 6, h.y - 1, h.x + 2, h.y - 4, h.x + 2, h.y + 6], '#5a2a3a'); }
    if (a.crest) { for (var r = 0; r < 4; r++) curve(P, '#e84a3a', .9, [h.x - 3 - r * 1.5, h.y - th * .5, h.x - 6 - r * 3, h.y - th - 4, h.x - 9 - r * 4, h.y - th - 5 + r]); }
    if (a.frill) for (var f = 0; f < 5; f++) { var g = C[Math.round(N * (.8 - f * .025))]; P.ell(g.x, g.y + th * .1, .8, th * .55, '#c87a7a'); }
    var R = rnd(L * 7), spots = [];
    if (a.spots) for (var s = 0; s < L * (a.moray ? .9 : .5); s++) { var p = C[1 + Math.floor(R() * (N - 4))], q = (R() - .5) * p.w * .7; P.ell(p.x + p.nx * q, p.y + p.ny * q - p.w * .1, a.moray ? 1 : .6, a.moray ? .9 : .5, shade(a.c[0], a.moray ? -.45 : -.3)); }
    var cv = P.done(OUT);
    if (a.worm) {
      for (var k = 2; k < N - 1; k += 2) { var p2 = C[k]; inkS(cv, segPts(p2.x - p2.nx * p2.w * .5, p2.y - p2.ny * p2.w * .5, p2.x + p2.nx * p2.w * .5, p2.y + p2.ny * p2.w * .5), shade(a.c[0], -.25)); }
      for (var tt = 0; tt < 5; tt++) lineS(cv, h.x - 1, h.y - 1 + tt * .6, h.x + 2.5, h.y - 3 + tt * 1.5, shade(a.c[2], -.1));
      return cv;
    }
    var ln = []; C.forEach(function (p, i) { if (i > 4 && i < N - 4 && i % 2 === 0) ln.push(p.x - p.nx * p.w * .05, p.y - p.ny * p.w * .05); }); inkS(cv, ln, shade(a.c[1], -.1));
    var gi = C[Math.round(N * .9)]; inkS(cv, segPts(gi.x - gi.nx * gi.w * .35, gi.y - gi.ny * gi.w * .35, gi.x + gi.nx * gi.w * .3, gi.y + gi.ny * gi.w * .3), shade(a.c[0], -.4));
    var ey = C[Math.round(N * .965)];
    inkS(cv, segPts(h.x - th * (a.moray ? .9 : .5), h.y + h.w * .12, h.x + 1, h.y + h.w * .05), OUT);
    if (a.moray || a.c[0] === '#c8ccd4') for (var tf = 0; tf < 3; tf++) dotS(cv, h.x - th * .3 - tf * 1.2, h.y + h.w * .22, '#f8f8f0');
    eyeS(cv, ey.x - ey.nx * ey.w * .18, ey.y - ey.ny * ey.w * .18, Math.max(.9, th * (a.gulper ? .3 : .17)), a.c[0] === '#1e1e24' ? '#8ad8ff' : '#e8c86a');
    return cv;
  }
  var SPECIAL = {
    frog: function (a) {
      var W = 38, H = 30, P = painter(W, H, false, SK), c = P.c, dk = shade(a.c[0], -.3);
      // chân sau gập, màng chân
      [[-1, 1], [1, -1]].forEach(function (s) {
        var sx = s[0] < 0 ? 9 : 29;
        P.ell(sx, 22, 6, 3.4, a.c[2]); P.ell(19 + s[0] * 3, 25, 6, 2.2, a.c[2]);
        P.poly([19 + s[0] * 7, 25, 19 + s[0] * 12, 27, 19 + s[0] * 13, 29, 19 + s[0] * 9, 28], shade(a.c[2], .1));
        P.ell(19 + s[0] * 10, 9, 2.4, 1.4, a.c[2]); P.poly([19 + s[0] * 10, 9, 19 + s[0] * 13, 7, 19 + s[0] * 13, 10], shade(a.c[2], .1));
      });
      P.ell(19, 16, 11, 8.5, a.c[0]); P.ell(19, 10, 8, 5.5, a.c[0]);
      P.ell(19, 19.5, 7, 3.6, shade(a.c[0], -.08));
      P.ell(13.5, 7, 3.4, 3.2, a.c[0]); P.ell(24.5, 7, 3.4, 3.2, a.c[0]);
      P.ell(13.5, 16, 1.2, 5, shade(a.c[0], -.12)); P.ell(24.5, 16, 1.2, 5, shade(a.c[0], -.12));
      var R = rnd(17); for (var s2 = 0; s2 < (a.warts ? 30 : 12); s2++) P.ell(11 + R() * 16, 9 + R() * 13, a.warts ? .9 : .7, a.warts ? .9 : .6, a.warts ? shade(a.c[0], .25) : dk);
      var cv = P.done(OUT);
      inkS(cv, arcPts(19, 9, 6, 3, .3, 2.84), OUT);
      eyeS(cv, 13.5, 6.4, 1.8, '#e8c040'); eyeS(cv, 24.5, 6.4, 1.8, '#e8c040');
      dotS(cv, 11.5, 11, shade(a.c[0], -.35), 3); dotS(cv, 26, 11, shade(a.c[0], -.35), 3);
      return cv;
    },
    shrimp: function (a) {
      var lob = a.lobster, man = a.mantis, W = lob ? 62 : 56, H = 32, P = painter(W, H, false, SK), c = P.c;
      var body = a.c[0], lite = a.c[1], acc = a.c[2], dk = shade(body, -.3), segs = man ? 8 : 6, arch = man ? 1.5 : lob ? 3 : 6;
      var x0 = 11, x1 = man ? 40 : 36, spine = [];
      for (var i = 0; i <= segs; i++) { var t = i / segs; spine.push([x0 + (x1 - x0) * t, 18 - Math.sin(t * 2.6) * arch]); }
      // râu dài vắt ra sau
      var hx = x1 + (lob ? 12 : 9), hy = spine[segs][1] - 1;
      // đuôi quạt
      var tx = spine[0][0], ty = spine[0][1];
      P.poly([tx, ty - 1, tx - 9, ty - 7, tx - 10, ty - 3, tx - 7, ty], acc);
      P.poly([tx, ty + 1, tx - 9, ty + 7, tx - 10, ty + 3, tx - 7, ty], acc);
      P.poly([tx + 1, ty - 1.5, tx - 8, ty - 1, tx - 9, ty + 1, tx + 1, ty + 1.5], shade(acc, .15));
      // chân bơi dưới bụng
      for (var l = 1; l < segs; l++) { var sp = spine[l]; P.poly([sp[0] - 1, sp[1] + 3, sp[0] - 2.5, sp[1] + 7.5, sp[0] - .8, sp[1] + 7.5, sp[0] + 1, sp[1] + 3], shade(lite, -.12)); }
      // các đốt bụng
      for (var k = 0; k < segs; k++) {
        var p = spine[k], q = spine[k + 1], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, r = (man ? 2.9 : 4.4) + k * (man ? .05 : .15);
        P.ell(mx, my, (q[0] - p[0]) * .72, r, k % 2 ? body : shade(body, .06));
        P.ell(mx, my + r * .55, (q[0] - p[0]) * .6, r * .4, lite);
        if (a.bands) P.ell(mx + (q[0] - p[0]) * .3, my - r * .2, 1, r * .85, '#2a2a30');
      }
      // giáp đầu ngực
      var cx0 = x1 - 1, cyy = spine[segs][1];
      if (man) { P.poly([cx0, cyy - 3.5, hx - 4, cyy - 3, hx - 1, cyy - 1, hx - 4, cyy + 3, cx0, cyy + 3.5], body); P.ell(cx0 + 2, cyy + 1.5, 4, 2, lite); }
      else {
        blob(P, [cx0 - 1, cyy - 4.5, cx0 + 6, cyy - (lob ? 7 : 6), hx - 1, cyy - 3.5, hx + 1, cyy - .5, hx - 2, cyy + 3.5, cx0 + 4, cyy + 5.5, cx0 - 1, cyy + 4.8], body);
        P.ell(cx0 + 5, cyy + 2.6, 5.5, 2.4, lite);
        P.poly([hx - 1, cyy - 2.8, hx + 9, cyy - 4.5, hx + 1, cyy - 1.2], shade(body, .1));
      }
      if (lob) { var R0 = rnd(3); for (var s = 0; s < 18; s++) P.ell(cx0 + R0() * 12, cyy - 4 + R0() * 5, .6, .6, shade(lite, .2)); }
      // càng
      if (a.claw) { curve(P, acc, 1.6, [hx - 3, cyy + 3, hx + 4, cyy + 7, hx + 10, cyy + 6]); P.ell(hx + 12, cyy + 5.5, 3.2, 1.5, acc); P.poly([hx + 14, cyy + 4.6, hx + 18, cyy + 3.8, hx + 14.5, cyy + 5.4], acc); P.poly([hx + 14, cyy + 6.2, hx + 17.5, cyy + 7, hx + 14, cyy + 6.8], shade(acc, -.15)); }
      if (man) { curve(P, acc, 1.6, [hx - 3, cyy + 2, hx - 1, cyy + 7, hx + 3, cyy + 6]); P.ell(hx + 2, cyy + 6, 2.4, 1.2, acc); P.ell(hx - 2.5, cyy - 4.5, 1.5, 1.5, acc); P.ell(hx - 4.5, cyy - 4.5, 1.5, 1.5, acc); }
      var cv = P.done(OUT), ldk = shade(lite, -.35);
      // chân bò có khớp
      for (var g = 0; g < 5; g++) { var gx = cx0 + 1 + g * 2.3, gy = cyy + 4.5; lineS(cv, gx, gy, gx + 1.2, gy + 3.5, lob ? (g % 2 ? acc : body) : ldk); lineS(cv, gx + 1.2, gy + 3.5, gx + .2, gy + 6, lob ? acc : ldk); }
      // vạch đốt
      for (var k2 = 1; k2 < segs; k2++) { var sp2 = spine[k2], r2 = (man ? 2.9 : 4.4) + k2 * .15; inkS(cv, segPts(sp2[0] + .5, sp2[1] - r2, sp2[0] - .3, sp2[1] + r2 * .7), dk); }
      if (!man) inkS(cv, arcPts(cx0 + 6, cyy + 1, 6, 4, -2.6, -.6), dk);
      // râu
      fx(cv, function (cc) {
        cc.strokeStyle = css(lob ? acc : shade(lite, -.25)); cc.lineWidth = lob ? 2 : 1; cc.beginPath(); cc.moveTo(hx * SK, (cyy - 2) * SK); cc.quadraticCurveTo((hx + 6) * SK, (cyy - 14) * SK, (x0 - 2) * SK, 2 * SK); cc.stroke();
        cc.lineWidth = 1; cc.beginPath(); cc.moveTo(hx * SK, (cyy - 1) * SK); cc.quadraticCurveTo((hx + 10) * SK, (cyy - 10) * SK, (x0 + 10) * SK, 1 * SK); cc.stroke();
        cc.strokeStyle = css(shade(lite, -.2)); cc.beginPath(); cc.moveTo((hx + 1) * SK, (cyy - 1) * SK); cc.lineTo((hx + 7) * SK, (cyy - 5) * SK); cc.stroke();
      });
      if (man) { eyeS(cv, hx - 2.5, cyy - 4.5, 1.2, '#4ad0e8'); eyeS(cv, hx - 4.5, cyy - 4.5, 1.2, '#4ad0e8'); }
      else { lineS(cv, hx - 2, cyy - 2, hx - 1, cyy - 3.6, OUT); eyeS(cv, hx - .8, cyy - 3.8, 1.1, '#2a2a30'); }
      return cv;
    },
    crab: function (a) {
      var lg = a.long, W = lg ? 60 : 50, H = lg ? 46 : 36, P = painter(W, H, false, SK), cx = W / 2, cy = lg ? 22 : 19, rx = lg ? 8 : a.dots ? 13 : 11, ry = lg ? 7.5 : 7.5;
      var leg = a.c[2], dk = shade(a.c[0], -.3);
      // chân: 4 đôi, mỗi chân 2 đốt
      for (var s = -1; s <= 1; s += 2) for (var i = 0; i < 4; i++) {
        var bx = cx + s * rx * .75, by = cy + 1 + i * 1.6, kx = cx + s * (rx + (lg ? 9 : 5) + i * .5), ky = by - (lg ? 6 : 3) + i * 2.6, fx2 = cx + s * (rx + (lg ? 18 : 8) + i * (lg ? 1 : .2)), fy = ky + (lg ? 16 : 7) - i * (lg ? 1 : .2);
        curve(P, leg, lg ? 1.4 : 2, [bx, by, (bx + kx) / 2, (by + ky) / 2, kx, ky]);
        curve(P, shade(leg, .1), lg ? 1.1 : 1.6, [kx, ky, (kx + fx2) / 2, (ky + fy) / 2 - 1, fx2, fy]);
        if (a.dots && i === 3) P.ell(fx2 - s, fy - 1, 2.2, 1.4, shade(leg, .15));
      }
      // càng
      for (var s2 = -1; s2 <= 1; s2 += 2) {
        var ax = cx + s2 * (rx * .6), ay = cy - ry * .6, pxx = cx + s2 * (rx + (a.dots ? 5 : 2)), pyy = cy - ry - (lg ? 3 : 4);
        curve(P, a.c[0], 2.2, [ax, ay, ax + s2 * 4, ay - 2, pxx, pyy + 2]);
        P.ell(pxx, pyy, a.dots ? 4.5 : 3.8, 2.7, a.c[0]);
        P.poly([pxx - s2 * 1, pyy - 2, pxx - s2 * 3.5, pyy - 6, pxx - s2 * 2, pyy - 1.5], shade(a.c[0], -.1));
        P.poly([pxx - s2 * 3, pyy - .5, pxx - s2 * 6, pyy - 4.5, pxx - s2 * 4, pyy - 4.8, pxx - s2 * 4, pyy], shade(a.c[1], -.05));
      }
      // mai
      var shell = [];
      for (var k = 0; k < 16; k++) { var t = Math.PI + k / 16 * Math.PI * 2, rr = a.dots && (k === 0 || k === 8) ? 1.35 : 1, wav = k > 8 && k < 16 && !lg ? .92 : 1; shell.push(cx + Math.cos(t) * rx * rr, cy + Math.sin(t) * ry * wav * (k < 8 ? 1.05 : .95)); }
      blob(P, shell, a.c[0]);
      P.ell(cx, cy + ry * .35, rx * .7, ry * .45, shade(a.c[0], -.06));
      P.ell(cx - rx * .3, cy - ry * .4, rx * .35, ry * .25, shade(a.c[0], .15));
      if (a.dots) { var R = rnd(4); for (var d = 0; d < 26; d++) P.ell(cx - rx * .8 + R() * rx * 1.6, cy - ry * .7 + R() * ry * 1.2, .55, .55, a.c[1]); }
      // gai mép trước
      for (var tq = 0; tq < 5; tq++) { var an = Math.PI * (1.1 + tq * .11); P.poly([cx + Math.cos(an) * rx * .98, cy + Math.sin(an) * ry, cx + Math.cos(an + .08) * rx * 1.13, cy + Math.sin(an + .08) * ry * 1.12, cx + Math.cos(an + .16) * rx * .98, cy + Math.sin(an + .16) * ry], a.c[0]); var an2 = Math.PI * 2 - (an - Math.PI); P.poly([cx + Math.cos(an2) * rx * .98, cy + Math.sin(an2) * ry, cx + Math.cos(an2 - .08) * rx * 1.13, cy + Math.sin(an2 - .08) * ry * 1.12, cx + Math.cos(an2 - .16) * rx * .98, cy + Math.sin(an2 - .16) * ry], a.c[0]); }
      if (lg) { var R2 = rnd(8); for (var sp = 0; sp < 10; sp++) P.ell(cx - rx * .7 + R2() * rx * 1.4, cy - ry * .6 + R2() * ry, .7, .7, shade(a.c[0], .3)); }
      var cv = P.done(OUT);
      // rãnh trên mai (hình chữ H)
      inkS(cv, arcPts(cx, cy + ry * .4, rx * .45, ry * .55, -2.7, -.44), dk);
      inkS(cv, segPts(cx, cy - ry * .1, cx, cy + ry * .5), dk);
      // mắt trên cuống
      lineS(cv, cx - 2.5, cy - ry + .5, cx - 3, cy - ry - 1.5, leg); lineS(cv, cx + 2.5, cy - ry + .5, cx + 3, cy - ry - 1.5, leg);
      eyeS(cv, cx - 3, cy - ry - 1.8, .9, '#2a2a2a'); eyeS(cv, cx + 3, cy - ry - 1.8, .9, '#2a2a2a');
      return cv;
    },
    turtle: function (a) {
      var W = 54, H = 38, P = painter(W, H, false, SK), cx = 25, cy = 19, rx = 15, ry = 11, sea = a.sea, fl = a.c[2], sk = shade(a.c[1], -.15);
      // chân / vây
      if (sea) {
        blob(P, [cx + 5, cy - 8, cx + 2, cy - 15, cx - 4, cy - 18.5, cx + 4, cy - 15.5, cx + 12, cy - 8], sk); blob(P, [cx + 5, cy + 8, cx + 2, cy + 15, cx - 4, cy + 18.5, cx + 4, cy + 15.5, cx + 12, cy + 8], sk);
        P.poly([cx - 10, cy - 7, cx - 15, cy - 12, cx - 13, cy - 6], sk); P.poly([cx - 10, cy + 7, cx - 15, cy + 12, cx - 13, cy + 6], sk);
      } else {
        [[cx + 9, cy - 10], [cx + 9, cy + 10], [cx - 9, cy - 10], [cx - 9, cy + 10]].forEach(function (p) { P.ell(p[0], p[1], 3.6, 2.8, sk); });
      }
      P.poly([cx - rx + 1, cy - 1.5, cx - rx - 4, cy, cx - rx + 1, cy + 1.5], sk);
      // đầu
      P.ell(cx + rx + 4, cy, a.soft ? 3.6 : 4.4, a.soft ? 3 : 3.6, sk); P.poly([cx + rx, cy - 2.5, cx + rx + 3, cy - 3, cx + rx + 3, cy + 3, cx + rx, cy + 2.5], sk);
      if (a.soft) P.poly([cx + rx + 7, cy - 1, cx + rx + 9.5, cy, cx + rx + 7, cy + 1], sk);
      // mai
      P.ell(cx, cy, rx + (a.soft ? 1.5 : 0), ry + (a.soft ? 1.5 : 0), a.soft ? shade(a.c[0], .12) : fl);
      P.ell(cx, cy, rx - 1.4, ry - 1.4, a.c[0]);
      if (a.shell) { var R = rnd(21); for (var m = 0; m < 26; m++) P.ell(cx - rx + 3 + R() * (rx * 2 - 6), cy - ry + 3 + R() * (ry * 2 - 6), 1 + R() * 1.5, .8 + R(), R() > .5 ? a.c[2] : a.c[1]); }
      if (a.soft) { var R3 = rnd(5); for (var d = 0; d < 20; d++) P.ell(cx - rx + 3 + R3() * (rx * 2 - 6), cy - ry + 3 + R3() * (ry * 2 - 6), .6, .6, shade(a.c[0], -.2)); }
      var cv = P.done(OUT), ln = shade(a.c[0], -.38);
      if (!a.soft) {
        // vảy mai: 5 vảy sống lưng + 4 vảy sườn mỗi bên + vảy viền
        var xs = [-.62, -.32, 0, .32, .62];
        for (var i = 0; i < 5; i++) { var X = cx + xs[i] * rx * .95; inkS(cv, segPts(X, cy - ry * .3, X, cy - ry * (.85 - Math.abs(xs[i]) * .3)), ln); inkS(cv, segPts(X, cy + ry * .3, X, cy + ry * (.85 - Math.abs(xs[i]) * .3)), ln); }
        inkS(cv, segPts(cx - rx * .78, cy - ry * .3, cx + rx * .78, cy - ry * .3), ln); inkS(cv, segPts(cx - rx * .78, cy + ry * .3, cx + rx * .78, cy + ry * .3), ln);
        inkS(cv, arcPts(cx, cy, rx - 1.6, ry - 1.6, 0, 6.29), ln);
        for (var r = 0; r < 22; r++) { var an = r / 22 * 6.283; inkS(cv, segPts(cx + Math.cos(an) * (rx - 1.6), cy + Math.sin(an) * (ry - 1.6), cx + Math.cos(an) * rx, cy + Math.sin(an) * ry), ln); }
      } else inkS(cv, arcPts(cx, cy, rx - .8, ry - .8, 0, 6.29), shade(a.c[0], -.1));
      if (sea) { var R4 = rnd(3); for (var sc = 0; sc < 14; sc++) { var px = cx + 6 + R4() * 7, py = R4() > .5 ? cy - 9 - R4() * 7 : cy + 9 + R4() * 7; inkS(cv, [px, py], shade(sk, -.3)); } }
      eyeS(cv, cx + rx + 5, cy - 1.6, .8, '#3a2a1a'); eyeS(cv, cx + rx + 5, cy + 1.6, .8, '#3a2a1a');
      return cv;
    },
    puffer: function (a) {
      var W = 40, H = 34, P = painter(W, H, false, SK), cx = 19, cy = 17, r = 11.5;
      P.poly([cx - r + 1, cy, cx - r - 6, cy - 5, cx - r - 5, cy, cx - r - 6, cy + 5], a.c[2]);
      P.poly([cx - 4, cy - r + 1, cx - 8, cy - r - 2.5, cx - 2, cy - r], shade(a.c[2], .1)); P.poly([cx - 4, cy + r - 1, cx - 8, cy + r + 2.5, cx - 2, cy + r], shade(a.c[2], .1));
      var nsp = a.spines ? 26 : 16; for (var i = 0; i < nsp; i++) { var t = i / nsp * Math.PI * 2 + .1, L2 = a.spines ? 4.5 : 2.5; P.poly([cx + Math.cos(t - .06) * r, cy + Math.sin(t - .06) * r, cx + Math.cos(t) * (r + L2), cy + Math.sin(t) * (r + L2), cx + Math.cos(t + .06) * r, cy + Math.sin(t + .06) * r], shade(a.c[2], .2)); }
      P.ell(cx, cy, r, r * .95, a.c[0]);
      P.ell(cx + 1, cy + 4, r * .8, r * .55, a.c[1]);
      var R = rnd(9); for (var s = 0; s < 26; s++) { var an = R() * 6.28, rr = R() * r * .85, y = cy + Math.sin(an) * rr * .9; if (y < cy + 2) P.ell(cx + Math.cos(an) * rr, y, .9, .9, a.c[2]); }
      P.ell(cx + r - .5, cy + 2.5, 2.2, 1.8, shade(a.c[1], -.1));
      P.poly([cx + 3, cy + 2, cx + 7, cy, cx + 8, cy + 4], shade(a.c[0], .15));
      var cv = P.done(OUT);
      lineS(cv, cx + r + .8, cy + 2.4, cx + r + 1.6, cy + 2.4, '#f4f0e0');
      eyeS(cv, cx + 5.5, cy - 4, 2, '#6ac8a8');
      return cv;
    },
    sunfish: function (a) {
      var W = 46, H = 58, P = painter(W, H, false, SK), cx = 22, cy = 29;
      P.poly([cx - 3, cy - 12, cx + 1, cy - 27, cx + 6, cy - 26, cx + 7, cy - 12], a.c[2]); P.poly([cx - 3, cy + 12, cx + 1, cy + 27, cx + 6, cy + 26, cx + 7, cy + 12], a.c[2]);
      blob(P, [cx - 15, cy - 13, cx - 21, cy - 6, cx - 19, cy, cx - 21, cy + 6, cx - 15, cy + 13, cx - 13, cy], shade(a.c[2], .1));
      blob(P, [cx - 15, cy - 14, cx, cy - 17, cx + 15, cy - 11, cx + 21, cy - 2, cx + 20, cy + 6, cx + 13, cy + 13, cx, cy + 16, cx - 15, cy + 14], a.c[0]);
      P.ell(cx + 2, cy + 7, 15, 7, a.c[1]);
      var R = rnd(11); for (var s = 0; s < 20; s++) P.ell(cx - 12 + R() * 28, cy - 12 + R() * 22, .7, .7, shade(a.c[0], .2));
      P.ell(cx + 10, cy + 1, 2.2, 4, shade(a.c[2], .1));
      var cv = P.done(OUT);
      for (var k = 0; k < 7; k++) inkS(cv, segPts(cx - 13, cy - 11 + k * 3.6, cx - 19, cy - 11 + k * 3.7), shade(a.c[2], -.2));
      for (var k2 = 0; k2 < 4; k2++) { inkS(cv, segPts(cx + k2 * 1.6, cy - 13, cx + 1.5 + k2 * 1.2, cy - 25), shade(a.c[2], -.25)); inkS(cv, segPts(cx + k2 * 1.6, cy + 13, cx + 1.5 + k2 * 1.2, cy + 25), shade(a.c[2], -.25)); }
      inkS(cv, segPts(cx + 13, cy - 3, cx + 13, cy + 3), shade(a.c[0], -.35));
      lineS(cv, cx + 19.5, cy + 3, cx + 20.5, cy + 3, OUT);
      eyeS(cv, cx + 15, cy - 4, 1.8, '#c8d8e0');
      return cv;
    },
    sturgeon: function (a, L) {
      L = Math.max(L, 54); var hh = L * .15, W = Math.ceil(L + 8), H = Math.ceil(hh * 2.8), P = painter(W, H, false, SK), c = P.c, cy = H / 2;
      P.poly([L * .2, cy - hh * .1, 3, cy - hh * 1.05, L * .08, cy - hh * .05, 5, cy + hh * .4, L * .2, cy + hh * .12], a.c[2]);
      P.poly([L * .3, cy - hh * .3, L * .34, cy - hh * .85, L * .4, cy - hh * .32], a.c[2]);
      P.poly([L * .5, cy + hh * .3, L * .56, cy + hh * .75, L * .6, cy + hh * .3], a.c[2]);
      P.poly([L * .74, cy + hh * .3, L * .7, cy + hh * .8, L * .8, cy + hh * .35], a.c[2]);
      c.beginPath(); c.moveTo(L + 5, cy + hh * .08); c.quadraticCurveTo(L * .9, cy - hh * .2, L * .8, cy - hh * .48); c.quadraticCurveTo(L * .45, cy - hh * .6, L * .2, cy - hh * .1);
      c.lineTo(L * .2, cy + hh * .12); c.quadraticCurveTo(L * .45, cy + hh * .5, L * .8, cy + hh * .42); c.quadraticCurveTo(L * .95, cy + hh * .3, L + 5, cy + hh * .08); c.closePath();
      c.fillStyle = P.col(a.c[0]); c.fill(); c.save(); c.clip(); P.rect(0, cy + hh * .12, W, H, a.c[1]); c.restore();
      for (var s = 0; s < 12; s++) { var x = L * (.25 + s * .05); P.poly([x - 1, cy - hh * .5, x, cy - hh * .64, x + 1, cy - hh * .5], shade(a.c[0], .3)); P.ell(x + 1, cy, .9, .6, shade(a.c[1], -.08)); }
      var cv = P.done(OUT);
      inkS(cv, segPts(L * .78, cy - hh * .35, L * .76, cy + hh * .3), shade(a.c[0], -.35));
      for (var b = 0; b < 4; b++) lineS(cv, L * (.9 + b * .015), cy + hh * .25, L * (.9 + b * .015), cy + hh * .5, '#d8c8a8');
      inkS(cv, segPts(L * .86, cy + hh * .35, L * .9, cy + hh * .35), OUT);
      eyeS(cv, L * .84, cy - hh * .18, 1, '#c8b87a');
      return cv;
    },
    mudskip: function (a) {
      var W = 52, H = 30, P = painter(W, H, false, SK), c = P.c, cy = 18;
      P.poly([9, cy, 1, cy - 5, 2, cy, 1, cy + 5], shade(a.c[0], -.05));
      blob(P, [14, cy - 4, 17, cy - 13, 22, cy - 14, 25, cy - 5], a.c[2]); blob(P, [27, cy - 5, 31, cy - 10, 38, cy - 9, 39, cy - 5], a.c[2]);
      blob(P, [8, cy, 20, cy - 5.5, 34, cy - 6.5, 42, cy - 5, 46, cy, 44, cy + 4, 34, cy + 5.5, 18, cy + 5], a.c[0]);
      P.ell(28, cy + 3, 12, 2.4, a.c[1]);
      P.poly([32, cy + 2, 30, cy + 9, 36, cy + 10, 36, cy + 3], shade(a.c[0], -.1));
      P.ell(39, cy - 6.5, 2.8, 2.8, a.c[0]); P.ell(43, cy - 6, 2.8, 2.8, a.c[0]);
      var R = rnd(5); for (var s = 0; s < 22; s++) P.ell(12 + R() * 30, cy - 4 + R() * 6, .6, .6, a.dots ? '#9ad0f0' : shade(a.c[0], -.3));
      var cv = P.done(OUT);
      for (var k = 0; k < 4; k++) { inkS(cv, segPts(16 + k * 2.4, cy - 4, 18 + k * 1.4, cy - 12.5), shade(a.c[2], -.3)); inkS(cv, segPts(29 + k * 2.4, cy - 5, 31 + k * 2, cy - 9), shade(a.c[2], -.3)); }
      lineS(cv, 44, cy + 1.5, 46, cy + 1, OUT);
      eyeS(cv, 39, cy - 7, 1.5, '#c8a85a'); eyeS(cv, 43, cy - 6.6, 1.5, '#c8a85a');
      return cv;
    },
    squid: function (a) {
      var st = a.stout, wd = a.wide, gi = a.giant, W = gi ? 70 : 58, H = st ? 30 : 28, P = painter(W, H, false, SK), c = P.c, cy = H / 2;
      var mx0 = gi ? 30 : 20, mx1 = W - 2, body = a.c[0];
      // tay + xúc tu
      for (var t = 0; t < 8; t++) curve(P, a.c[2], 1.3, [mx0 + 1, cy - 2.5 + t * .7, mx0 - 6, cy - 4 + t * 1.2, mx0 - 10 - (t % 3) * 2, cy - 5 + t * 1.5]);
      curve(P, a.c[2], .8, [mx0, cy - 1, mx0 - 12, cy - 6, 3, cy - 7]); curve(P, a.c[2], .8, [mx0, cy + 1, mx0 - 12, cy + 6, 3, cy + 7]);
      P.ell(4, cy - 7, 2.4, 1.2, a.c[2]); P.ell(4, cy + 7, 2.4, 1.2, a.c[2]);
      // vây
      if (st) blob(P, [mx0 + 1, cy - 8, mx1 - 4, cy - 9, mx1 + 1, cy, mx1 - 4, cy + 9, mx0 + 1, cy + 8, mx0 + 6, cy], shade(a.c[1], -.05));
      else if (wd) blob(P, [mx0 + 4, cy - 4, mx0 + 14, cy - 11, mx1 - 2, cy - 7, mx1 + 1, cy, mx1 - 2, cy + 7, mx0 + 14, cy + 11, mx0 + 4, cy + 4], shade(body, .12));
      else { P.poly([mx1 - 12, cy - 3, mx1 - 1, cy - 9, mx1 + 1, cy, mx1 - 1, cy + 9, mx1 - 12, cy + 3], shade(body, .08)); }
      // thân áo
      if (st) P.ell((mx0 + mx1) / 2 + 1, cy, (mx1 - mx0) / 2 - 2, 6.2, body);
      else blob(P, [mx0 - 1, cy - 4, mx0 + 12, cy - 4.8, mx1 - 4, cy - 2.5, mx1, cy, mx1 - 4, cy + 2.5, mx0 + 12, cy + 4.8, mx0 - 1, cy + 4], body);
      P.ell(mx0 - 1, cy, 4.5, 4, body);
      P.ell((mx0 + mx1) / 2, cy + 2.4, (mx1 - mx0) / 2 - 4, 1.6, a.c[1]);
      var R = rnd(3); for (var s = 0; s < (gi ? 30 : 22); s++) P.ell(mx0 + 3 + R() * (mx1 - mx0 - 8), cy - 4 + R() * 6, .5 + R() * .5, .5 + R() * .4, a.c[2]);
      if (st) for (var z = 0; z < 6; z++) P.ell(mx0 + 6 + z * 4, cy - 2 + (z % 2) * 2, 1.5, .5, shade(body, -.2));
      var cv = P.done(OUT);
      for (var k = 0; k < 8; k++) { dotS(cv, mx0 - 7 - k * 1.1, cy - 3 + k * .8, shade(a.c[1], .2)); }
      eyeS(cv, mx0 - 1, cy - 1, gi ? 2.2 : 1.7, '#e8d080');
      return cv;
    },
    octo: function (a) {
      var W = 46, H = 42, P = painter(W, H, false, SK), c = P.c, cx = 23, cy = 13, body = a.c[0];
      if (a.web) blob(P, [cx - 14, cy + 18, cx - 8, cy + 6, cx + 8, cy + 6, cx + 14, cy + 18, cx + 4, cy + 22, cx - 4, cy + 22], shade(a.c[2], -.15));
      for (var t = 0; t < 8; t++) {
        var x0 = cx - 7 + t * 2, dir = t < 4 ? -1 : 1, sp = (t % 4), ex = cx + dir * (6 + sp * 3.5), ey = cy + 22 + (sp % 2) * 3;
        curve(P, t % 2 ? body : shade(body, -.08), 2.6 - sp * .2, [x0, cy + 7, x0 + dir * (2 + sp), cy + 15, ex, ey, ex + dir * 3, ey + 2, ex + dir * 2, ey - 2]);
      }
      if (a.ears) { blob(P, [cx - 8, cy - 2, cx - 15, cy - 7, cx - 14, cy, cx - 9, cy + 2], a.c[2]); blob(P, [cx + 8, cy - 2, cx + 15, cy - 7, cx + 14, cy, cx + 9, cy + 2], a.c[2]); }
      blob(P, [cx - 8, cy + 6, cx - 9, cy - 4, cx - 4, cy - 11, cx + 4, cy - 11, cx + 9, cy - 4, cx + 8, cy + 6, cx, cy + 9], body);
      P.ell(cx - 3, cy - 5, 3.5, 3, shade(body, .15));
      var R = rnd(7); for (var s = 0; s < 20; s++) P.ell(cx - 7 + R() * 14, cy - 9 + R() * 14, .6, .6, shade(body, R() > .5 ? .2 : -.25));
      var cv = P.done(OUT);
      for (var t2 = 0; t2 < 8; t2++) { var dir2 = t2 < 4 ? -1 : 1, x02 = cx - 7 + t2 * 2; for (var k = 1; k < 5; k++) dotS(cv, x02 + dir2 * (k * 1.3), cy + 9 + k * 2.6, a.c[1]); }
      eyeS(cv, cx - 4.5, cy + 2, 1.7, '#e8c878', true); eyeS(cv, cx + 4.5, cy + 2, 1.7, '#e8c878', true);
      return cv;
    },
    ray: function (a) {
      var mt = a.manta, W = mt ? 64 : 58, H = mt ? 42 : 38, P = painter(W, H, false, SK), c = P.c, cx = mt ? 38 : 36, cy = H / 2;
      var hw = mt ? 18 : 15, len = mt ? 10 : 16;
      curve(P, a.c[2], 1, [cx - len, cy, cx - len - 10, cy + .5, 2, cy - 1]);
      if (!mt) P.poly([cx - len - 6, cy - .5, cx - len - 12, cy - 2, cx - len - 7, cy + .5], '#d8d0b8');
      P.ell(cx - len + 1, cy - 3, 3, 2, a.c[0]); P.ell(cx - len + 1, cy + 3, 3, 2, a.c[0]);
      blob(P, [cx + 10, cy, cx + 6, cy - hw * .55, cx - 2, cy - hw, cx - (mt ? 3 : 6), cy - hw * .9, cx - len, cy - 2, cx - len, cy + 2, cx - (mt ? 3 : 6), cy + hw * .9, cx - 2, cy + hw, cx + 6, cy + hw * .55], a.c[0]);
      if (mt) { P.poly([cx + 7, cy - 4, cx + 14, cy - 6, cx + 13, cy - 3], a.c[0]); P.poly([cx + 7, cy + 4, cx + 14, cy + 6, cx + 13, cy + 3], a.c[0]); P.ell(cx - 1, cy - hw * .45, 4, 2.4, a.c[1]); P.ell(cx - 1, cy + hw * .45, 4, 2.4, a.c[1]); }
      else { P.ell(cx - 1, cy, 9, 6, shade(a.c[0], .1)); }
      var cv = P.done(OUT), R = rnd(11), sp = [];
      if (!mt) for (var s = 0; s < (a.spots ? 50 : 22); s++) { var px = cx - 12 + R() * 20, py = cy - hw * .8 + R() * hw * 1.6; sp.push(px, py); if (a.spots) sp.push(px + .5, py, px, py + .5, px + .5, py + .5); }
      inkS(cv, sp, a.spots ? '#e8dcc0' : shade(a.c[0], .3));
      inkS(cv, segPts(cx + 6, cy, cx - len, cy), shade(a.c[0], -.25));
      eyeS(cv, cx + 4, cy - 2.6, mt ? .9 : 1, '#c8b87a'); eyeS(cv, cx + 4, cy + 2.6, mt ? .9 : 1, '#c8b87a');
      if (!mt) { dotS(cv, cx + 1.5, cy - 3.4, OUT, 2); dotS(cv, cx + 1.5, cy + 2.8, OUT, 2); }
      return cv;
    },
    jelly: function (a) {
      var W = 32, H = 44, P = painter(W, H, false, SK), c = P.c, cx = 16;
      for (var t = 0; t < 4; t++) curve(P, a.c[1], 1.8, [cx - 3 + t * 2, 13, cx - 5 + t * 3 + (t % 2) * 3, 22, cx - 3 + t * 2, 32, cx - 5 + t * 3, 38, cx - 2 + t * 2, 42]);
      c.beginPath(); c.moveTo(cx - 13, 14); c.quadraticCurveTo(cx - 13, 1, cx, 1); c.quadraticCurveTo(cx + 13, 1, cx + 13, 14);
      for (var s = 0; s < 8; s++) c.quadraticCurveTo(cx + 13 - s * 3.25 - 1.6, 16, cx + 13 - (s + 1) * 3.25, 14);
      c.closePath(); c.fillStyle = P.col(a.c[0]); c.fill();
      P.ell(cx, 6, 8, 3.5, a.c[1]);
      [[-4, 9], [4, 9], [0, 7], [0, 11]].forEach(function (p) { P.ell(cx + p[0], p[1], 2, 1.5, a.c[2]); });
      var cv = P.done(OUT);
      for (var r = 0; r < 7; r++) inkS(cv, segPts(cx, 4, cx - 11 + r * 3.6, 14), shade(a.c[0], -.12));
      fx(cv, function (cc) { cc.fillStyle = css(a.c[2]); for (var k = 0; k < 9; k++) { var x0 = (cx - 12 + k * 3) * SK; for (var y = 15 * SK; y < (34 + (k % 3) * 3) * SK; y++) cc.fillRect(Math.round(x0 + Math.sin(y / 5 + k) * 2), y, 1, 1); } });
      return cv;
    },
    snail: function (a) {
      var W = 30, H = 32, P = painter(W, H, false, SK), c = P.c;
      blob(P, [3, 28, 10, 25, 22, 25, 28, 27, 25, 30, 6, 30], a.c[1]);
      curve(P, a.c[1], 1, [23, 26, 25, 22, 26, 20]); curve(P, a.c[1], 1, [24, 26, 27, 23, 29, 22]);
      if (a.tall) { P.poly([7, 26, 13, 2, 15, 2, 22, 26], a.c[0]); P.ell(14.5, 25, 7.5, 3, a.c[0]); }
      else { P.ell(13, 17, 10, 9, a.c[0]); }
      var cv = P.done(OUT), ln = a.c[2];
      if (a.tall) for (var i = 0; i < 6; i++) { var y = 24 - i * 3.8, hw = 7.5 - i * 1.1; inkS(cv, arcPts(14, y - 1, hw, 1.6, .1, 3.0), ln); inkS(cv, segPts(14 - hw, y, 14 - hw * .6, y - 3), shade(a.c[0], .25)); }
      else for (var j = 0; j < 3; j++) inkS(cv, arcPts(13 + j, 17, 8 - j * 2.6, 7.5 - j * 2.4, 0, 6.2), ln);
      dotS(cv, 26, 19.5, OUT, 2); dotS(cv, 29, 21.5, OUT, 2);
      return cv;
    },
    sam: function (a) {
      var W = 54, H = 34, P = painter(W, H, false, SK), cx = 34, cy = 17;
      curve(P, a.c[2], 1.6, [cx - 14, cy, cx - 22, cy, 2, cy - .5]);
      P.poly([cx - 16, cy - 8, cx - 5, cy - 9.5, cx - 2, cy, cx - 5, cy + 9.5, cx - 16, cy + 8, cx - 18, cy], shade(a.c[0], -.06));
      for (var i = 0; i < 6; i++) { P.poly([cx - 15 + i * 2, cy - 8.5, cx - 16 + i * 2, cy - 11, cx - 14 + i * 2, cy - 8.5], a.c[2]); P.poly([cx - 15 + i * 2, cy + 8.5, cx - 16 + i * 2, cy + 11, cx - 14 + i * 2, cy + 8.5], a.c[2]); }
      blob(P, [cx - 4, cy - 12, cx + 8, cy - 15, cx + 17, cy - 8, cx + 19, cy, cx + 17, cy + 8, cx + 8, cy + 15, cx - 4, cy + 12, cx - 2, cy], a.c[0]);
      P.ell(cx + 6, cy, 8, 9, shade(a.c[0], .1));
      var cv = P.done(OUT), ln = shade(a.c[0], -.35);
      inkS(cv, segPts(cx - 3, cy, cx + 16, cy), ln); inkS(cv, arcPts(cx + 6, cy, 8, 9, -1.7, 1.7), ln);
      inkS(cv, segPts(cx - 14, cy - 4, cx - 3, cy - 5), ln); inkS(cv, segPts(cx - 14, cy + 4, cx - 3, cy + 5), ln);
      eyeS(cv, cx + 9, cy - 7, .7, '#2a2a2a'); eyeS(cv, cx + 9, cy + 7, .7, '#2a2a2a');
      return cv;
    },
    seahorse: function (a) {
      var W = 28, H = 44, P = painter(W, H, false, SK), c = P.c;
      P.ell(10, 23, 2, 5, shade(a.c[2], .2));
      curve(P, a.c[0], 2.8, [14, 30, 15, 36, 12, 39, 8, 41, 8, 37, 10, 35, 11, 37]);
      blob(P, [13, 9, 9, 14, 8, 22, 11, 29, 15, 31, 18, 26, 17, 18, 16, 11], a.c[0]);
      P.ell(15.5, 22, 2.2, 6, a.c[1]);
      P.ell(14, 8, 4, 3.6, a.c[0]); P.poly([16, 7, 25, 8.5, 25, 10.5, 16, 10.5], a.c[0]);
      P.poly([12, 5, 13, 1, 15, 1, 16, 5], a.c[2]); P.poly([10, 6, 8, 3, 12, 5], a.c[2]);
      for (var i = 0; i < 7; i++) P.ell(9 + Math.sin(i * .5) * .8, 12 + i * 2.6, .7, .7, a.c[2]);
      var cv = P.done(OUT), ln = shade(a.c[0], -.3);
      for (var k = 0; k < 9; k++) { var y = 12 + k * 2.2, xl = 8 + Math.sin(k * .35) * 1.5; inkS(cv, segPts(xl, y, xl + 9, y + 1), ln); }
      for (var r = 0; r < 4; r++) inkS(cv, segPts(9.5, 20 + r * 1.5, 7, 21 + r * 1.5), shade(a.c[2], -.2));
      eyeS(cv, 15, 7.5, 1.1, '#e8a03a');
      return cv;
    },
    flat: function (a) {
      var tg = a.tongue, W = 56, H = 30, P = painter(W, H, false, SK), cx = 28, cy = 15, rx = tg ? 21 : 18, ry = tg ? 7.5 : 9.5;
      P.poly([cx - rx - 1, cy, cx - rx - 8, cy - 5, cx - rx - 7, cy, cx - rx - 8, cy + 5], a.c[2]);
      var out = [], inn = [];
      for (var i = 0; i < 24; i++) { var t = i / 24 * Math.PI * 2, sx = Math.cos(t), sy = Math.sin(t), tp = tg ? (sx > 0 ? 1 - sx * .35 : 1) : 1; out.push(cx + sx * (rx + 2.5), cy + sy * (ry + 2.8) * tp); inn.push(cx + sx * rx, cy + sy * ry * tp); }
      blob(P, out, shade(a.c[2], .12)); blob(P, inn, a.c[0]);
      var R = rnd(13); if (a.spots) for (var s = 0; s < 22; s++) P.ell(cx - rx * .8 + R() * rx * 1.5, cy - ry * .7 + R() * ry * 1.4, .7 + R() * .7, .7 + R() * .6, R() > .3 ? a.c[2] : shade(a.c[1], -.1));
      else for (var s2 = 0; s2 < 14; s2++) P.ell(cx - rx * .8 + R() * rx * 1.5, cy - ry * .7 + R() * ry * 1.4, .6, .6, shade(a.c[0], .18));
      var cv = P.done(OUT);
      for (var k = 0; k < 26; k++) { var an = .15 + k / 26 * (Math.PI - .3); [1, -1].forEach(function (sg) { var ax = cx + Math.cos(an) * rx * .98, ay = cy + sg * Math.sin(an) * ry * .98; inkS(cv, segPts(ax, ay, cx + Math.cos(an) * (rx + 2.2), cy + sg * Math.sin(an) * (ry + 2.6)), shade(a.c[2], -.25)); }); }
      inkS(cv, segPts(cx - rx * .85, cy, cx + rx * .7, cy), shade(a.c[0], -.25));
      inkS(cv, arcPts(cx + rx * .62, cy, 2, ry * .6, -1.2, 1.2), shade(a.c[0], -.35));
      eyeS(cv, cx + rx * .72, cy - ry * .35, 1, '#e8d080'); eyeS(cv, cx + rx * .62, cy - ry * .72, 1, '#e8d080');
      return cv;
    },
    star: function (a) {
      var W = 34, H = 34, P = painter(W, H, false, SK), pts = [];
      for (var i = 0; i < 10; i++) { var t = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5.5 : 15.5; pts.push(17 + Math.cos(t) * r, 17.5 + Math.sin(t) * r); }
      blob(P, pts.map(function (v, k) { return k % 4 < 2 ? v : v; }), a.c[0]);
      P.poly(pts, a.c[0]);
      for (var arm = 0; arm < 5; arm++) { var ta = -Math.PI / 2 + arm * Math.PI * 2 / 5; for (var k = 1; k < 6; k++) P.ell(17 + Math.cos(ta) * k * 2.4, 17.5 + Math.sin(ta) * k * 2.4, 1.1 - k * .1, 1.1 - k * .1, a.c[1]); }
      P.ell(17, 17.5, 3, 3, a.c[2]);
      var cv = P.done(OUT), R = rnd(5), dt = [];
      for (var s = 0; s < 60; s++) { var a2 = R() * 6.28, rr = 3 + R() * 11; dt.push(17 + Math.cos(a2) * rr, 17.5 + Math.sin(a2) * rr); }
      inkS(cv, dt, a.c[2]);
      dotS(cv, 17, 17.5, shade(a.c[2], -.3), 2);
      return cv;
    },
    urchin: function (a) {
      var W = 34, H = 32, P = painter(W, H, false, SK), cx = 17, cy = 18;
      P.ell(cx, cy, 8.5, 7, a.c[1]);
      var cv0 = P.done(null), cv = cv0;
      fx(cv, function (cc) {
        for (var i = 0; i < 44; i++) { var t = -Math.PI + i / 44 * Math.PI * 2 * .999 + (i % 2) * .05, L2 = (i % 3 ? 12 : 15) - (Math.sin(t) > 0 ? 5 : 0); bres(cc, (cx + Math.cos(t) * 6) * SK, (cy + Math.sin(t) * 5) * SK, (cx + Math.cos(t) * L2) * SK, (cy + Math.sin(t) * L2 * .9) * SK, css(i % 2 ? a.c[0] : shade(a.c[0], .3))); }
      });
      var P2 = painter(W, H, false, SK); P2.c.setTransform(1, 0, 0, 1, 0, 0); P2.c.drawImage(cv, 0, 0); P2.c.setTransform(SK, 0, 0, SK, 0, 0);
      P2.col(a.c[0]); P2.col(shade(a.c[0], .3)); P2.col(a.c[1]);
      P2.ell(cx, cy, 6.5, 5.4, a.c[1]); P2.ell(cx - 2, cy - 2, 2.5, 1.6, shade(a.c[1], .25));
      var out = P2.done(OUT);
      for (var k = 0; k < 10; k++) dotS(out, cx - 5 + k, cy + 2 + Math.sin(k) * .8, shade(a.c[1], -.3));
      return out;
    },
    newt: function (a) {
      var W = 50, H = 22, P = painter(W, H, false, SK), c = P.c, cy = 11;
      curve(P, a.c[0], 3.4, [17, cy, 9, cy - 3, 1, cy + 2]);
      [[19, 1, 15, -1], [32, 1, 36, -1]].forEach(function (l) { [1, -1].forEach(function (sg) { var x1 = l[0], x2 = l[2]; curve(P, a.c[0], 1.6, [x1, cy + sg * 2, (x1 + x2) / 2, cy + sg * 6, x2, cy + sg * 8]); P.ell(x2, cy + sg * 8.5, 1.4, 1, a.c[1]); }); });
      P.ell(26, cy, 11, 4.2, a.c[0]); P.ell(40, cy, 5.5, 4.2, a.c[0]);
      P.ell(26, cy + 3.5, 9, 1.2, a.c[1]); P.ell(41, cy + 3, 4, 1, a.c[1]);
      var R = rnd(4); for (var s = 0; s < 34; s++) P.ell(14 + R() * 30, cy - 3.5 + R() * 6, .6, .6, R() > .6 ? '#d8682e' : shade(a.c[0], .2));
      for (var k = 0; k < 8; k++) P.ell(17 + k * 2.6, cy - 3.6, .7, .7, a.c[1]);
      var cv = P.done(OUT);
      lineS(cv, 43, cy + 1.5, 45.5, cy + 1, OUT);
      eyeS(cv, 42, cy - 2.4, .9, '#e8a040'); eyeS(cv, 42, cy + 2.2, .9, '#e8a040');
      return cv;
    },
    nautilus: function (a) {
      var W = 38, H = 32, P = painter(W, H, false, SK), cx = 21, cy = 16;
      for (var t = 0; t < 9; t++) curve(P, shade(a.c[0], -.15), .9, [cx - 9, cy + 2 + t * .4, cx - 13, cy + t * .9, 2 + (t % 3), cy - 2 + t * 1.4]);
      P.ell(cx, cy, 13, 13, a.c[0]);
      P.poly([cx - 12, cy - 6, cx - 7, cy - 9, cx - 5, cy + 1, cx - 12, cy + 5], shade(a.c[2], .1));
      var cv = P.done(OUT);
      fx(cv, function (cc) {
        for (var y = 0; y < cv.height; y++) for (var x = 0; x < cv.width; x++) {
          var ux = x / SK - cx, uy = y / SK - cy, r = Math.sqrt(ux * ux + uy * uy), an = Math.atan2(uy, ux);
          if (r > 12.4 || ux < -6 && uy > -9 && uy < 6) continue;
          var stripe = Math.sin(an * 7 + r * .25) > .25 && (an > -1.9 && an < 1.2);
          if (stripe && r > 5) { cc.fillStyle = css(a.c[1]); cc.fillRect(x, y, 1, 1); }
        }
      });
      inkS(cv, arcPts(cx + 1, cy, 5, 5, 0, 6.2), shade(a.c[0], -.3)); inkS(cv, arcPts(cx + 1.5, cy, 2.5, 2.5, 0, 6.2), shade(a.c[0], -.35));
      eyeS(cv, cx - 9, cy - 4.5, 1, '#2a2a2a');
      return cv;
    },
    angler: function (a) {
      var W = 48, H = 42, P = painter(W, H, false, SK), c = P.c, cx = 22, cy = 25;
      P.poly([cx - 13, cy, cx - 20, cy - 6, cx - 19, cy, cx - 20, cy + 6], a.c[2]);
      blob(P, [cx - 14, cy - 2, cx - 6, cy - 12, cx + 8, cy - 13, cx + 17, cy - 6, cx + 18, cy + 4, cx + 10, cy + 13, cx - 4, cy + 11, cx - 13, cy + 5], a.c[0]);
      P.poly([cx + 4, cy + 1, cx + 19, cy - 4, cx + 21, cy + 1, cx + 18, cy + 11, cx + 6, cy + 6], '#4a1a24');
      P.ell(cx - 2, cy + 6, 6, 3, shade(a.c[1], -.05));
      var R = rnd(6); for (var s = 0; s < 24; s++) P.ell(cx - 12 + R() * 26, cy - 10 + R() * 16, .5, .5, a.c[1]);
      curve(P, a.c[2], 1, [cx + 4, cy - 12, cx + 12, cy - 26, cx + 22, cy - 20]);
      var cv = P.done(OUT);
      fx(cv, function (cc) { var X = (cx + 22) * SK, Y = (cy - 19) * SK; cc.fillStyle = 'rgba(160,240,255,.35)'; cc.beginPath(); cc.arc(X, Y, 7, 0, 7); cc.fill(); cc.fillStyle = '#fff6a0'; cc.beginPath(); cc.arc(X, Y, 3.5, 0, 7); cc.fill(); cc.fillStyle = '#ffffff'; cc.fillRect(X - 1, Y - 1, 2, 2); });
      for (var i = 0; i < 6; i++) { lineS(cv, cx + 7 + i * 2.2, cy + .5 - i * .9, cx + 7.5 + i * 2.2, cy + 3 - i * .9, '#f4f4ec'); lineS(cv, cx + 8 + i * 1.8, cy + 7.5 - i * .6, cx + 8.4 + i * 1.8, cy + 4.6 - i * .6, '#f4f4ec'); }
      eyeS(cv, cx + 7, cy - 7, 1, '#7ae0f0');
      return cv;
    },
    shark: function (a, L) {
      L = a.small ? 56 : a.goblin ? 66 : 64;
      var hh = L * .19, W = Math.ceil(L + 8), H = Math.ceil(hh * 2.9), P = painter(W, H, false, SK), c = P.c, cy = Math.round(H * .52);
      var tipC = a.c[2];
      P.poly([L * .2, cy - hh * .1, 3, cy - hh * 1.1, L * .08, cy - hh * .05, 6, cy + hh * .5, L * .2, cy + hh * .12], a.c[0]);
      P.poly([L * .42, cy - hh * .42, L * .5, cy - hh * 1.25, L * .54, cy - hh * 1.2, L * .62, cy - hh * .42], a.c[0]);
      P.poly([L * .25, cy - hh * .25, L * .28, cy - hh * .6, L * .32, cy - hh * .25], a.c[0]);
      P.poly([L * .62, cy + hh * .25, L * .5, cy + hh * 1.05, L * .55, cy + hh * 1.05, L * .7, cy + hh * .3], shade(a.c[0], -.05));
      P.poly([L * .34, cy + hh * .3, L * .3, cy + hh * .62, L * .38, cy + hh * .32], a.c[0]);
      var snout = a.goblin ? L + 7 : L + 4;
      c.beginPath(); c.moveTo(snout, cy - (a.goblin ? hh * .25 : hh * .05)); c.quadraticCurveTo(L * .92, cy - hh * .6, L * .6, cy - hh * .5);
      c.quadraticCurveTo(L * .3, cy - hh * .4, L * .2, cy - hh * .1); c.lineTo(L * .2, cy + hh * .12);
      c.quadraticCurveTo(L * .4, cy + hh * .48, L * .7, cy + hh * .45); c.quadraticCurveTo(L * .94, cy + hh * .38, snout, cy - (a.goblin ? hh * .25 : hh * .05)); c.closePath();
      c.fillStyle = P.col(a.c[0]); c.fill(); c.save(); c.clip();
      c.beginPath(); c.moveTo(0, cy + hh * .12); c.quadraticCurveTo(L * .6, cy + hh * .02, L + 8, cy + hh * .05); c.lineTo(L + 8, H); c.lineTo(0, H); c.closePath(); c.fillStyle = P.col(a.c[1]); c.fill(); c.restore();
      if (a.goblin) P.poly([L * .86, cy + hh * .3, L * .98, cy + hh * .2, L * .97, cy + hh * .45, L * .86, cy + hh * .45], '#d88a8a');
      if (!a.small && !a.goblin) { P.poly([L * .5, cy - hh * 1.25, L * .54, cy - hh * 1.2, L * .56, cy - hh * .95, L * .51, cy - hh * 1], tipC); P.poly([L * .5, cy + hh * 1.05, L * .55, cy + hh * 1.05, L * .56, cy + hh * .9, L * .52, cy + hh * .88], tipC); P.poly([3, cy - hh * 1.1, 7, cy - hh * .8, 5, cy - hh * .75], tipC); }
      if (a.small) { var R = rnd(2); for (var s = 0; s < 26; s++) P.ell(L * .2 + R() * L * .7, cy - hh * .4 + R() * hh * .45, .6, .6, shade(a.c[0], -.2)); }
      var cv = P.done(OUT), gl = shade(a.c[0], -.35);
      for (var g = 0; g < 5; g++) inkS(cv, segPts(L * (.76 - g * .025), cy - hh * .22, L * (.75 - g * .025), cy + hh * .18), gl);
      inkS(cv, segPts(L * .86, cy + hh * .28, L * .96, cy + hh * .18), OUT);
      eyeS(cv, L * .86, cy - hh * .14, 1.1, a.goblin ? '#c8d8e0' : '#2a3038');
      return cv;
    }
  };
  /* hình nhân vật/vật phẩm, đã nắn pixel và có viền; cache theo id */
  var spriteCache = {};
  CA.sprite = function (e) {
    if (spriteCache[e.id]) return spriteCache[e.id];
    var a = e.a, cv;
    if (e.r === 'rac') cv = junk(a);
    else {
      var L = Math.round(Math.max(30, Math.min(58, 22 + Math.log(e.cm[1]) * 7))), LF = Math.round(Math.max(56, Math.min(100, 44 + Math.log(e.cm[1]) * 10)));
      if (a.s === 'fish') cv = drawFish(a, LF);
      else if (a.s === 'eel') cv = eel(a, a.short ? 34 : 50);
      else cv = SPECIAL[a.s](a, L);
      if (a.s !== 'fish') cv = cropC(cv);
    }
    spriteCache[e.id] = cv;
    return cv;
  };
  CA.silhouette = function (e) {
    var k = 'sil_' + e.id;
    if (spriteCache[k]) return spriteCache[k];
    var s = CA.sprite(e), cv = canvas(s.width, s.height), c = cv.getContext('2d');
    c.drawImage(s, 0, 0); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#39405a'; c.fillRect(0, 0, cv.width, cv.height);
    spriteCache[k] = cv; return cv;
  };

  // ---------- rác ----------
  function junk(kind) {
    var P, c;
    switch (kind) {
      case 'can': P = painter(18, 24, false); P.rect(3, 3, 12, 18, '#c8382f'); P.rect(3, 3, 12, 2, '#d8d8d8'); P.rect(3, 19, 12, 2, '#a8a8a8'); P.rect(5, 8, 3, 9, '#f4f4f4'); P.rect(10, 9, 3, 2, '#f8d040'); P.rect(12, 5, 2, 12, '#9a2a24'); break;
      case 'bottle': P = painter(16, 30, false); P.rect(6, 1, 4, 3, '#2f8aca'); P.rect(6, 4, 4, 4, '#bfe4f0'); P.poly([6, 8, 3, 12, 3, 28, 13, 28, 13, 12, 10, 8], '#a8dcef'); P.rect(3, 15, 10, 5, '#2f9a5a'); P.rect(5, 12, 2, 14, '#e8f6fa'); break;
      case 'bag': P = painter(26, 24, false); P.poly([4, 6, 2, 22, 24, 22, 22, 6], '#e8ecee'); P.rect(5, 2, 4, 6, '#e8ecee'); P.rect(17, 2, 4, 6, '#e8ecee'); P.rect(6, 4, 2, 4, '#1b1d2a'); P.rect(18, 4, 2, 4, '#1b1d2a'); P.line(8, 10, 12, 20, '#c8ccd0'); P.line(16, 10, 18, 20, '#c8ccd0'); P.rect(9, 12, 8, 3, '#c8382f'); break;
      case 'sandal': P = painter(30, 16, false); P.ell(15, 9, 13, 5, '#3f8ad8'); P.ell(15, 8, 11, 3.6, '#5aa6ec'); for (var i = 0; i < 6; i++) P.rect(7 + i * 3, 6 + (i % 2), 1, 1, '#2f6aaa'); P.poly([18, 7, 22, 3, 26, 7], '#2f6aaa'); break;
      case 'hat': P = painter(32, 18, false); P.poly([16, 1, 1, 15, 31, 15], '#e2c886'); P.poly([16, 1, 8, 9, 13, 15, 16, 15], '#f4e0a8'); P.rect(1, 14, 30, 2, '#a8863e'); P.poly([22, 9, 27, 15, 24, 15], WATER.ao[1]); P.line(16, 4, 24, 13, '#a8863e'); break;
      case 'boot': P = painter(22, 28, false); P.poly([5, 1, 14, 1, 14, 18, 21, 20, 21, 26, 3, 26, 3, 18], '#2f5a34'); P.rect(5, 1, 9, 3, '#4a7a4a'); P.rect(3, 24, 18, 2, '#1f3a24'); P.rect(7, 6, 2, 10, '#4a7a4a'); break;
      case 'tire': P = painter(28, 28, false); P.ell(14, 14, 13, 13, '#2a2c34'); P.ell(14, 14, 8, 8, '#4a4c56'); P.ell(14, 14, 6, 6, '#8a90a0'); for (var t = 0; t < 12; t++) { var a = t / 12 * 6.283; P.rect(14 + Math.cos(a) * 11, 14 + Math.sin(a) * 11, 1, 1, '#4a4c56'); } P.line(14, 14, 20, 8, '#c8ccd0'); P.line(14, 14, 8, 20, '#c8ccd0'); break;
      case 'branch': P = painter(36, 18, false); P.stroke('#7a5a3a', 3); P.c.beginPath(); P.c.moveTo(2, 14); P.c.quadraticCurveTo(16, 8, 34, 10); P.c.stroke(); P.stroke('#7a5a3a', 2); P.c.beginPath(); P.c.moveTo(18, 10); P.c.lineTo(24, 2); P.c.stroke(); P.ell(25, 3, 3, 1.6, '#6a8a3a'); P.line(4, 13, 30, 9, '#9a7a52'); break;
      case 'umbrella': P = painter(32, 26, false); P.poly([2, 12, 8, 5, 16, 2, 24, 5, 30, 12, 24, 11, 16, 13, 8, 11], '#3a3a50'); P.poly([16, 2, 24, 5, 30, 12, 24, 11], '#5a5a78'); P.line(16, 12, 20, 24, '#a8a8a8'); P.line(20, 24, 17, 25, '#a8a8a8'); P.line(26, 8, 31, 4, '#a8a8a8'); break;
      case 'bucket': P = painter(24, 24, false); P.poly([3, 6, 21, 6, 18, 22, 6, 22], '#e8a020'); P.rect(3, 5, 18, 3, '#f8c040'); P.stroke('#c8c8c8', 1); P.c.beginPath(); P.c.arc(12, 7, 9, Math.PI, 0); P.c.stroke(); P.ell(14, 16, 2, 2, WATER.ao[1]); break;
      case 'net': P = painter(30, 24, false); for (var x = 2; x < 30; x += 4) P.line(x, 2, x + 3, 22, '#8a9a6a'); for (var y = 3; y < 24; y += 4) P.line(1, y, 29, y + 1, '#8a9a6a'); P.ell(24, 6, 3, 3, '#e8803a'); break;
      case 'foam': P = painter(28, 20, false); P.poly([2, 6, 8, 2, 26, 2, 26, 16, 20, 19, 2, 19], '#f2f2ec'); P.poly([2, 6, 8, 2, 26, 2, 20, 6], '#ffffff'); P.poly([20, 6, 26, 2, 26, 16, 20, 19], '#d8d8d0'); P.rect(4, 10, 10, 1, '#c8c8c0'); break;
      case 'anchor': P = painter(26, 30, false); P.ell(13, 4, 3.5, 3.5, '#7a5a44'); P.ell(13, 4, 1.6, 1.6, '#000'); P.rect(12, 7, 3, 18, '#8a6a52'); P.rect(6, 10, 15, 3, '#8a6a52'); P.stroke('#8a6a52', 3); P.c.beginPath(); P.c.arc(13, 18, 9, .2, Math.PI - .2); P.c.stroke(); P.poly([2, 18, 5, 15, 7, 20], '#8a6a52'); P.poly([24, 18, 21, 15, 19, 20], '#8a6a52'); P.rect(8, 22, 2, 2, '#c8783a'); break;
      case 'coin': P = painter(20, 20, false); P.ell(10, 10, 8.5, 8.5, '#c8962a'); P.ell(10, 10, 6.5, 6.5, '#e8b83a'); P.rect(8, 8, 4, 4, '#7a5a1a'); P.rect(6, 5, 2, 2, '#fff0a0'); break;
      case 'jar': P = painter(24, 28, false); P.rect(8, 2, 8, 4, '#8a5a3a'); P.ell(12, 16, 10, 10, '#a86a3e'); P.ell(10, 13, 4, 5, '#c8885a'); P.rect(2, 14, 20, 2, '#6a4a2a'); P.ell(16, 22, 3, 2, '#4a7a3a'); P.ell(6, 20, 2, 3, '#4a7a3a'); break;
      case 'letter': P = painter(30, 16, false); P.poly([4, 4, 22, 4, 22, 12, 4, 12], '#a8d8c8'); P.rect(22, 6, 5, 4, '#a8d8c8'); P.rect(27, 6, 2, 4, '#8a5a3a'); P.rect(7, 6, 12, 4, '#f4e8c8'); P.rect(9, 7, 7, 1, '#8a7a6a'); P.rect(9, 9, 5, 1, '#8a7a6a'); P.rect(5, 5, 2, 6, '#e8f8f4'); break;
      default: P = painter(16, 16, false); P.rect(2, 2, 12, 12, '#888');
    }
    return P.done(OUT);
  }

  // ---------- biểu tượng nhỏ (giờ, thời tiết) ----------
  var ICONS = {
    binhminh: ['.....y.....', '..y..y..y..', '...yyyyy...', '..yyyyyyy..', 'yyyyyyyyyyy', 'wwwwwwwwwww', '.w.w.w.w.w.'],
    sang: ['....y....', '.y.yyy.y.', '..yyyyy..', 'yyyyYyyyy', '..yyyyy..', '.y.yyy.y.', '....y....'],
    trua: ['y...y...y', '.y.yyy.y.', '..yyyyy..', 'yyyyYyyyy', '..yyyyy..', '.y.yyy.y.', 'y...y...y'],
    chieu: ['...ooo...', '..ooooo..', '.ooooooo.', '.ooooooo.', '..ooooo..', '...ooo...', '.........'],
    hoanghon: ['...ooo...', '..ooooo..', '.ooooooo.', 'rrrrrrrrr', '.r.r.r.r.', '..r...r..', '.........'],
    toi: ['..mmm..', '.mm....', 'mm.....', 'mm.....', 'mm.....', '.mm....', '..mmm..'],
    dem: ['..mmm...s', '.mm.....', 'mm....s.', 'mm......', 'mm...s..', '.mm.....', '..mmm...'],
    nang: ['....y....', '.y.yyy.y.', '..yyyyy..', 'yyyyYyyyy', '..yyyyy..', '.y.yyy.y.', '....y....'],
    may: ['...ccc....', '..ccccc.c.', '.ccccccccc', 'cccccccccc', '.dddddddd.'],
    mua: ['..ggg...', '.ggggggg', 'gggggggg', '.b..b..b', 'b..b..b.', '..b..b..'],
    suong: ['ffffffff.', '.........', '.ffffffff', '.........', 'ffffffff.', '.........', '..ffffff.'],
    giong: ['..kkk...', '.kkkkkkk', 'kkkkkkkk', '...yy...', '..yy....', '...yy...', '....y...'],
    lock: ['.kkk.', 'k...k', 'k...k', 'yyyyy', 'yyKyy', 'yyKyy', 'yyyyy'],
    ngay: ['....y....', '..yyyyy..', '.yyYYyyy.', '.yyYyyyy.', '.yyyyyyy.', '..yyyyy..', '....y....'],
    bandem: ['...mmm.', '..mm...', '.mm....', '.mm....', '.mm...s', '..mm...', '...mmm.'],
    cuong: ['...w...w.', '..www.www', '.........', 'bbbbbbbbb', 'bwbbwbbwb', 'bbbbbbbbb', 'bbbbbbbbb'],
    vua: ['.........', '.........', '.w...w...', 'bbbbbbbbb', 'bwbbbbwbb', 'bbbbbbbbb', 'ooooooooo'],
    nong: ['.........', '.........', '.........', '.........', 'bbb...bbb', 'ooobbbooo', 'ooooooooo']
  };
  var IC = { y: '#ffd23f', Y: '#fff6c0', w: '#6ab0e8', o: '#ff8a3a', r: '#e85a3a', m: '#f4f0c8', s: '#fff6c0', c: '#e8ecf2', d: '#a8b0c0', g: '#8a94a4', b: '#6ab0ff', f: '#d8dce4', k: '#4a4e60', K: '#1b1d2a' };
  var iconCache = {};
  CA.icon = function (name) {
    if (iconCache[name]) return iconCache[name];
    var g = ICONS[name] || ICONS.nang, w = 0;
    g.forEach(function (r) { w = Math.max(w, r.length); });
    var cv = canvas(w, g.length), c = cv.getContext('2d');
    g.forEach(function (r, y) { for (var x = 0; x < r.length; x++) if (IC[r[x]]) { c.fillStyle = IC[r[x]]; c.fillRect(x, y, 1, 1); } });
    iconCache[name] = cv; return cv;
  };


  // ---------- bể cá: đồ trang trí, vật phẩm cửa hàng ----------
  var decoCache = {};
  CA.deco = function (id) {
    if (decoCache[id]) return decoCache[id];
    var P, c;
    switch (id) {
      case 'soi': P = painter(22, 9, false); P.ell(5, 6, 5, 3, '#8a8a8a'); P.ell(13, 6, 4, 3, '#a8a49a'); P.ell(18, 7, 3.5, 2, '#6f6c66'); P.ell(9, 4, 3, 2, '#c8c2b4'); break;
      case 'rong': P = painter(14, 30, false); c = P.c;
        for (var i = 0; i < 4; i++) { P.stroke(i % 2 ? '#3f8a3a' : '#5aa848', 2); c.beginPath(); c.moveTo(3 + i * 2.5, 30); c.bezierCurveTo(i * 3 - 2, 20, 6 + i * 2, 12, 2 + i * 3, 2 + i * 3); c.stroke(); }
        break;
      case 'suc': P = painter(10, 10, false); P.rect(1, 4, 8, 6, '#6a7078'); P.rect(2, 5, 6, 2, '#8a929a'); P.rect(4, 0, 2, 4, '#a8b0b8'); break;
      case 'sanho': P = painter(24, 24, false); c = P.c;
        [[12, 24, 12, 4], [12, 16, 4, 6], [12, 14, 20, 5], [6, 10, 2, 2], [18, 9, 22, 1]].forEach(function (b, k) { P.stroke(k % 2 ? '#f07a8a' : '#e85a6a', 3); c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[2], b[3]); c.stroke(); });
        P.ell(12, 4, 2, 2, '#ffa0b0'); P.ell(20, 5, 2, 2, '#ffa0b0'); P.ell(4, 6, 2, 2, '#ffa0b0'); break;
      case 'den': P = painter(14, 8, false); P.rect(0, 0, 14, 3, '#3a3e48'); P.rect(2, 3, 10, 2, '#fff2a8'); break;
      case 'ruong': P = painter(20, 14, false); P.rect(1, 5, 18, 9, '#8a5a2a'); P.poly([1, 6, 3, 1, 17, 1, 19, 6], '#a86a32'); P.rect(1, 5, 18, 1, '#5a3a1a'); P.rect(8, 6, 4, 4, '#ffd23f'); P.rect(3, 2, 2, 2, '#ffd23f'); P.rect(14, 2, 3, 2, '#ffe880'); P.rect(1, 9, 18, 1, '#5a3a1a'); break;
      case 'laudai': P = painter(30, 30, false);
        P.rect(4, 12, 22, 18, '#9aa0a8'); P.rect(0, 6, 8, 24, '#b0b6be'); P.rect(22, 6, 8, 24, '#b0b6be');
        for (var t = 0; t < 4; t++) { P.rect(t * 2, 4, 1, 2, '#b0b6be'); P.rect(22 + t * 2, 4, 1, 2, '#b0b6be'); }
        P.rect(12, 20, 6, 10, '#3a3a48'); P.ell(15, 20, 3, 3, '#3a3a48'); P.rect(3, 12, 2, 3, '#3a3a48'); P.rect(25, 12, 2, 3, '#3a3a48'); P.poly([0, 6, 4, 0, 8, 6], '#c8382f'); P.poly([22, 6, 26, 0, 30, 6], '#c8382f'); break;
      case 'tuong': P = painter(26, 30, false); P.rect(6, 22, 14, 8, '#8a8070'); P.rect(4, 20, 18, 3, '#a8a090'); break;
      case 'thuyen': P = painter(38, 18, false); c = P.c; c.translate(19, 9); c.rotate(-.18); c.translate(-19, -9);
        P.poly([2, 8, 36, 8, 31, 16, 7, 16], '#6a4a2a'); P.rect(6, 10, 26, 1, '#4a3018'); P.rect(18, 0, 2, 8, '#5a3a1a'); P.poly([20, 1, 28, 6, 20, 7], '#c8c0a8'); P.rect(12, 12, 2, 2, '#2a3a4a'); P.rect(22, 12, 3, 2, '#2a3a4a'); break;
      default: P = painter(4, 4, false); P.rect(0, 0, 4, 4, '#888');
    }
    var cv = P.done(OUT);
    if (id === 'tuong') { var x = cv.getContext('2d'), f = CA.sprite(window.CC.byId.chepvang); x.save(); x.translate(13, 12); x.rotate(-.9); var fk = 22 / f.width; x.drawImage(f, -f.width * fk / 2, -f.height * fk / 2, f.width * fk, f.height * fk); x.restore(); }
    decoCache[id] = cv; return cv;
  };
  var itemCache = {};
  CA.item = function (id) {
    if (itemCache[id]) return itemCache[id];
    var P = painter(16, 16, false), c = P.c;
    if (id === 'giun') { P.stroke('#e88a8a', 2.4); c.beginPath(); c.moveTo(2, 11); c.bezierCurveTo(5, 4, 9, 15, 14, 6); c.stroke(); }
    else if (id === 'tom') { for (var i = 0; i < 4; i++) P.ell(4 + i * 2.6, 9 - Math.sin(i / 3 * 2.4) * 3, 2.4, 2.2, i % 2 ? '#f08a4a' : '#f8a868'); P.poly([2, 8, 0, 5, 1, 11], '#e06a2a'); P.line(13, 5, 15, 1, '#c86a3a'); }
    else if (id === 'cam') { P.rect(3, 6, 10, 8, '#c8a060'); P.rect(3, 6, 10, 2, '#a88040'); for (var k = 0; k < 6; k++) P.rect(4 + (k % 3) * 3, 2 + Math.floor(k / 3) * 2, 2, 2, '#8a5a2a'); }
    else if (id === 'vang') { P.ell(8, 9, 5, 5, '#e8b83a'); P.ell(7, 8, 3, 3, '#ffe880'); P.line(8, 4, 8, 1, '#c8c8c8'); P.rect(12, 2, 1, 1, '#fff6c0'); P.rect(3, 4, 1, 1, '#fff6c0'); }
    else if (id === 'drink') { P.rect(4, 2, 8, 13, '#2fa85a'); P.rect(4, 2, 8, 2, '#c8c8c8'); P.poly([9, 5, 6, 9, 8, 9, 7, 13, 10, 8, 8, 8], '#ffd23f'); }
    else if (id === 'up_nl') { P.rect(2, 4, 11, 9, '#3a4a6a'); P.rect(13, 6, 2, 5, '#3a4a6a'); P.rect(3, 5, 9, 7, '#2a3450'); P.rect(3, 5, 6, 7, '#ffd23f'); P.rect(8, 5, 1, 7, '#fff2a8'); P.rect(3, 5, 9, 1, '#fff6c0'); }
    else if (id === 'up_hoi') { P.rect(3, 1, 10, 2, '#a8763e'); P.rect(3, 13, 10, 2, '#a8763e'); P.poly([4, 3, 12, 3, 9, 8, 12, 13, 4, 13, 7, 8], '#dfe8f0'); P.poly([5, 3, 11, 3, 8, 6], '#7ad0f0'); P.poly([5, 13, 11, 13, 8, 10], '#7ad0f0'); P.rect(7, 7, 2, 2, '#f8c040'); }
    else if (id === 'up_kt') { P.ell(8, 8, 6, 3.5, '#5aa6ec'); P.poly([13, 8, 16, 4, 16, 12], '#3f8ad8'); P.ell(5, 7, 1, 1, '#1b1d2a'); P.rect(1, 13, 14, 1, '#f4e8c8'); for (var m = 0; m < 5; m++) P.rect(1 + m * 3, 12, 1, 2, '#7a5a3a'); P.rect(1, 2, 1, 1, '#ffd23f'); P.rect(0, 3, 3, 1, '#ffd23f'); }
    else if (id === 'up_hiem') { P.poly([8, 0, 10, 6, 16, 6, 11, 10, 13, 16, 8, 12, 3, 16, 5, 10, 0, 6, 6, 6], '#ffd23f'); P.poly([8, 2, 9, 6, 8, 8, 7, 6], '#fff6c0'); P.rect(7, 7, 2, 2, '#e8a020'); }
    else if (id === 'up_rac') { P.rect(4, 3, 8, 12, '#c8382f'); P.rect(4, 3, 8, 2, '#d8d8d8'); P.rect(4, 13, 8, 2, '#a8a8a8'); P.rect(6, 7, 2, 5, '#f4f4f4'); P.ell(12, 5, 3, 3, '#e8b83a'); P.ell(12, 5, 1.4, 1.4, '#7a5a1a'); }
    else if (id === 'skill') { P.poly([8, 0, 10, 5, 15, 5, 11, 9, 13, 15, 8, 11, 3, 15, 5, 9, 1, 5, 6, 5], '#e8b83a'); P.poly([8, 2, 9, 5, 8, 7, 7, 5], '#fff6c0'); P.rect(2, 13, 12, 3, '#3f8ad8'); P.rect(3, 14, 10, 1, '#7ac0f8'); }
    else if (id === 'slot') { P.rect(1, 3, 14, 11, '#7ab8d8'); P.rect(1, 11, 14, 3, '#e8d8a8'); P.rect(1, 3, 14, 1, '#c8e8f8'); P.rect(6, 6, 4, 2, '#f08a3a'); P.rect(5, 6, 1, 2, '#f08a3a'); }
    var cv = P.done(OUT); itemCache[id] = cv; return cv;
  };
  /* Vẽ bể cá: w x h (thấp), fish = [{e, cm, x, y, vx}], on = {decoId: true}, t: giây */
  var DECO_POS = { soi: .14, rong: .05, sanho: .8, ruong: .3, laudai: .56, tuong: .42, thuyen: .68, suc: .94 };
  /* Lớp tĩnh của bể (nước, cát, đồ trang trí): chỉ vẽ lại khi bộ trang trí đổi */
  function tankStatic(w, h, on) {
    var cv = canvas(w, h), c = cv.getContext('2d'), lamp = on.den;
    c.imageSmoothingEnabled = false;
    var im = c.createImageData(w, h); gradient(im, w, 0, h, lamp ? '#7ad0f0' : '#4f9ac0', lamp ? '#2f6f9a' : '#1f4f72', 6); c.putImageData(im, 0, 0);
    var sand = on.cat ? ['#f0e8d0', '#d8ccae'] : ['#c8a870', '#a8885a'], sy = h - 9;
    c.fillStyle = sand[0]; c.fillRect(0, sy, w, 9);
    c.fillStyle = sand[1]; for (var x = 0; x < w; x += 3) c.fillRect(x + (x % 2), sy + 3 + (x * 7) % 5, 1, 1);
    Object.keys(DECO_POS).forEach(function (id) {
      if (!on[id] || id === 'suc') return;
      var d = CA.deco(id), dx = Math.round(DECO_POS[id] * w - d.width / 2), dy = sy - d.height + 3;
      if (id === 'rong') { c.drawImage(d, dx, dy); c.drawImage(d, Math.round(.9 * w - 7), dy + 4); }
      else c.drawImage(d, Math.max(0, Math.min(w - d.width, dx)), dy);
    });
    if (on.suc) c.drawImage(CA.deco('suc'), Math.max(0, Math.min(w - CA.deco('suc').width, Math.round(DECO_POS.suc * w - CA.deco('suc').width / 2))), sy - CA.deco('suc').height + 3);
    if (on.den) c.drawImage(CA.deco('den'), Math.round(w / 2 - 7), 0);
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(2, 2, 1, h - 14); c.fillRect(4, 2, 1, 6);
    return cv;
  }
  var tankStaticKey = '', tankStaticCv = null;
  /* Vẽ bể cá: toàn bộ khung được dựng trong một lần rồi chép lên canvas thật.
     fish = [{e, cm, rx, ry, face}], on = {decoId: true}, t: giây */
  CA.tank = function (c, w, h, fish, on, t) {
    c.imageSmoothingEnabled = false;
    var key = w + 'x' + h + ':' + Object.keys(on).filter(function (k) { return on[k]; }).sort().join(',');
    if (key !== tankStaticKey || !tankStaticCv) { tankStaticCv = tankStatic(w, h, on); tankStaticKey = key; }
    var sy = h - 9;
    c.drawImage(tankStaticCv, 0, 0);
    if (on.den) { c.fillStyle = 'rgba(255,250,200,.10)'; for (var r = 0; r < 4; r++) { var rx = Math.round((r * 37 + Math.sin(t * .4 + r) * 6) % w); c.beginPath(); c.moveTo(rx, 0); c.lineTo(rx + 8, 0); c.lineTo(rx + 22, h); c.lineTo(rx + 12, h); c.fill(); } }
    if (on.suc) { c.fillStyle = 'rgba(230,248,255,.8)'; for (var b = 0; b < 8; b++) { var by = (sy - 6) - ((t * 14 + b * 9) % (sy - 4)); c.fillRect(Math.round(.94 * w + Math.sin(t * 3 + b) * 1.5), Math.round(by), 1 + (b % 2), 1 + (b % 2)); } }
    fish.forEach(function (f) {
      var s = CA.sprite(f.e), tw = Math.round(Math.max(9, Math.min(w * .32, 5 + Math.log(f.cm + 2) * 5))), sc = tw / s.width, th = Math.max(2, Math.round(s.height * sc));
      var fx = f.rx != null ? f.rx : Math.round(f.x), fy = f.ry != null ? f.ry : Math.round(f.y);
      c.save(); c.translate(fx, fy); if ((f.face || f.vx) < 0) c.scale(-1, 1);
      c.drawImage(s, Math.round(-tw / 2), Math.round(-th / 2), tw, th); c.restore();
    });
  };

  window.CA = CA;
})();
