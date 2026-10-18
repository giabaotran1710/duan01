/* Tìm điểm khác biệt — màn dùng ảnh chụp như thật (tạo bằng tool/timkhacbiet-photo/gen.py).
   Đọc timkhacbiet-photos/manifest.json; màn nào có ảnh thì dùng ảnh, chưa có thì game dùng tranh vẽ như cũ.
   Ảnh B = ảnh A + các mảnh vá (WebP có kênh trong suốt) đặt đúng chỗ khác biệt. */
(function (root) {
  'use strict';
  var BASE = 'timkhacbiet-photos/', LW = 800, LH = 600;
  var manP = null, cache = {};

  function manifest() {
    if (!manP) {
      manP = fetch(BASE + 'manifest.json', { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return manP;
  }
  function loadImg(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error('Không tải được ' + src)); };
      im.src = src;
    });
  }

  /* trả về màn ảnh (đã tải xong ảnh) hoặc null nếu màn n chưa có ảnh / tải lỗi */
  function get(n) {
    if (cache[n]) return cache[n];
    cache[n] = manifest().then(function (m) {
      var L = m && m.levels && m.levels.filter(function (l) { return l.n === n; })[0];
      if (!L) return null;
      var sx = LW / m.w, sy = LH / m.h;
      return Promise.all([loadImg(BASE + L.a)].concat(L.diffs.map(function (d) { return loadImg(BASE + d.patch.file); })))
        .then(function (imgs) {
          return {
            n: n, photo: true, theme: 'photo', themeName: L.name, tier: L.tier,
            tierName: (root.TKB && root.TKB.TIER_NAMES[L.tier]) || '', time: L.time, img: imgs[0],
            patches: L.diffs.map(function (d, i) { var p = d.patch; return { img: imgs[i + 1], x: p.x * sx, y: p.y * sy, w: p.w * sx, h: p.h * sy }; }),
            diffs: L.diffs.map(function (d, i) {
              var h = { x0: d.hit[0] * sx, y0: d.hit[1] * sy, x1: d.hit[2] * sx, y1: d.hit[3] * sy };
              return { id: i, kind: d.kind, hit: h, cx: (h.x0 + h.x1) / 2, cy: (h.y0 + h.y1) / 2 };
            })
          };
        });
    }).catch(function () { delete cache[n]; return null; });
    return cache[n];
  }

  root.TKBPhoto = { get: get, manifest: manifest };
})(window);
