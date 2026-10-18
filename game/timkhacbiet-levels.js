/* Tìm điểm khác biệt — 100 màn.
   Mỗi màn là một bức tranh (phông chủ đề + các vật thể) được dựng theo hạt giống cố định, rồi tạo ra ảnh B bằng cách sửa
   đúng N vật thể (biến mất, thêm vào, đổi màu, to/nhỏ, xê dịch, lật, đổi chi tiết). Độ khó tăng dần theo số màn:
   nhiều vật thể hơn, nhỏ hơn, nhiều điểm khác hơn, và chênh lệch nhỏ dần. */
(function (root) {
  'use strict';
  var A = root.TKBArt || (typeof require !== 'undefined' ? require('./timkhacbiet-art.js') : null);
  var W = A.W, H = A.H, TYPES = A.TYPES, mulberry32 = A.mulberry32;

  var TIER_NAMES = ['Dễ', 'Vừa', 'Khó', 'Rất khó', 'Siêu khó'];

  /* types: [loại, trọng số, tối đa mỗi ảnh, (vùng thay thế)];  zones: tên vùng -> ['c'|'f', y0, y1]
     'c' = tâm vật nằm trong [y0,y1]; 'f' = chân vật (đáy) nằm trong [y0,y1] và vật xa/gần theo độ sâu */
  var THEMES = [
    { id: 'village', name: 'Làng quê', zones: { sky: ['c', 45, 250], ground: ['f', 335, 575] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['bird', 2, 2], ['kite', 1, 1], ['butterfly', 1, 1], ['house', 4, 3], ['tree', 4, 5], ['bush', 2, 3], ['flower', 4, 6], ['fence', 2, 2], ['sheep', 3, 3], ['windmill', 1, 1], ['mushroom', 2, 2], ['rock', 1, 2]] },
    { id: 'beach', name: 'Bãi biển', zones: { sky: ['c', 40, 240], sea: ['f', 385, 462], ground: ['f', 480, 578] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['bird', 2, 3], ['balloon', 1, 1], ['sailboat', 3, 3], ['umbrella', 3, 3], ['palm', 3, 3], ['crab', 2, 3], ['starfish', 2, 3], ['beachball', 2, 2], ['lighthouse', 1, 1], ['sandcastle', 1, 1]] },
    { id: 'sea', name: 'Đại dương', zones: { water: ['c', 40, 490], floor: ['f', 520, 582], ground: ['f', 520, 582], sky: ['c', 40, 490] },
      types: [['fish', 6, 7], ['jelly', 2, 3], ['bubbles', 3, 4], ['submarine', 1, 1], ['turtle', 2, 2], ['seaweed', 3, 4], ['coral', 3, 4], ['chest', 1, 1], ['starfish', 1, 2], ['crab', 1, 2]] },
    { id: 'space', name: 'Vũ trụ', zones: { any: ['c', 40, 560], sky: ['c', 40, 560], ground: ['c', 40, 560] },
      types: [['planet', 3, 4], ['rocket', 2, 2], ['crescent', 1, 1], ['ufo', 2, 2], ['satellite', 1, 2], ['astronaut', 2, 2], ['alien', 2, 3], ['star', 5, 7]] },
    { id: 'forest', name: 'Rừng xanh', zones: { sky: ['c', 40, 200], ground: ['f', 365, 578] },
      types: [['sun', 1, 1], ['cloud', 2, 2], ['bird', 1, 2], ['butterfly', 2, 2], ['tree', 5, 6], ['pine', 4, 5], ['bush', 3, 3], ['flower', 4, 5], ['mushroom', 4, 5], ['owl', 2, 2], ['bunny', 2, 2], ['snail', 2, 2], ['rock', 2, 2]] },
    { id: 'city', name: 'Thành phố', zones: { sky: ['c', 40, 235], skyline: ['f', 462, 505], street: ['f', 525, 582], ground: ['f', 525, 582] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['plane', 1, 2], ['balloon', 1, 1], ['bird', 2, 2], ['building', 4, 5, 'skyline'], ['car', 3, 4, 'street'], ['traffic', 2, 2, 'street'], ['lamp', 2, 3, 'street'], ['tree', 2, 3, 'street']] },
    { id: 'winter', name: 'Xứ tuyết', zones: { sky: ['c', 40, 230], ground: ['f', 350, 578] },
      types: [['snowflake', 4, 5], ['cloud', 2, 2], ['snowman', 2, 2], ['spine', 5, 6], ['igloo', 1, 1], ['penguin', 3, 4], ['gift', 2, 3], ['cabin', 2, 2], ['bunny', 1, 1]] },
    { id: 'desert', name: 'Sa mạc', zones: { sky: ['c', 40, 230], ground: ['f', 385, 578] },
      types: [['sun', 1, 1], ['cloud', 1, 1], ['bird', 2, 2], ['cactus', 5, 6], ['pyramid', 2, 2], ['palm', 2, 3], ['tent', 2, 2], ['camel', 3, 3], ['rock', 3, 3]] },
    { id: 'castle', name: 'Lâu đài', zones: { sky: ['c', 40, 235], ground: ['f', 355, 578] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['rainbow', 1, 1], ['bird', 2, 2], ['balloon', 2, 2], ['kite', 1, 1], ['castle', 2, 1], ['tower', 3, 3], ['flag', 3, 3], ['tree', 3, 4], ['bush', 2, 3], ['flower', 3, 4], ['crown', 1, 1, 'ground']] },
    { id: 'party', name: 'Tiệc ngọt', zones: { sky: ['c', 50, 215], ground: ['c', 355, 572], any: ['c', 355, 572] },
      types: [['balloon', 4, 4], ['star', 3, 4], ['gift', 3, 3, 'any'], ['cupcake', 3, 4], ['icecream', 2, 2], ['lollipop', 3, 3], ['donut', 3, 4], ['candy', 4, 4], ['cookie', 3, 4], ['cake', 2, 3]] }
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function cfgFor(n) {
    var t = (n - 1) / 99, tier = Math.min(4, Math.floor((n - 1) / 20));
    var kinds = [
      ['missing', 'extra', 'color'],
      ['missing', 'extra', 'color', 'size', 'variant'],
      ['missing', 'extra', 'color', 'size', 'move', 'variant'],
      ['color', 'size', 'move', 'variant', 'flip', 'missing', 'extra'],
      ['color', 'size', 'move', 'variant', 'flip', 'color', 'variant', 'missing']
    ][tier];
    var diffs = 3 + Math.floor((n - 1) / 12);
    return {
      n: n, t: t, tier: tier, tierName: TIER_NAMES[tier], kinds: kinds,
      count: Math.round(11 + t * 19),
      diffs: diffs,
      sf: 1.38 - t * 0.6,
      gap: Math.round(16 - t * 9),
      dh: Math.round(150 - t * 122), dl: Math.round(34 - t * 16),
      sizeR: 1.55 - t * 0.33,
      moveD: Math.round(52 - t * 34),
      minPx: Math.round(300 - t * 190),
      time: 5 * Math.round((40 + diffs * 15) / 5)
    };
  }

  /* ---------- hình chữ nhật ---------- */
  /* khung bao thật (đã đo) của vật, có tính lật ngang và tỉ lệ, nới 1,5 px cho nét viền */
  function rectOf(o) {
    var e = TYPES[o.t].ext, s = o.s, x0 = e[0], x1 = e[2], t;
    if (o.f < 0) { t = x0; x0 = -x1; x1 = -t; }
    return { x0: o.x + x0 * s - 1.5, y0: o.y + e[1] * s - 1.5, x1: o.x + x1 * s + 1.5, y1: o.y + e[3] * s + 1.5 };
  }
  function touch(a, b, gap) { return a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.y0 < b.y1 + gap && a.y1 > b.y0 - gap; }
  function unite(a, b) { return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }; }
  function inside(r, m) { return r.x0 >= m && r.y0 >= m && r.x1 <= W - m && r.y1 <= H - m; }
  var MIN_HIT = 54, HIT_PAD = 6;
  function hitRect(r) {
    var cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, w = Math.max(r.x1 - r.x0, MIN_HIT) + HIT_PAD * 2, h = Math.max(r.y1 - r.y0, MIN_HIT) + HIT_PAD * 2;
    return { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
  }

  function shuffle(a, r) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- đặt vật thể ---------- */
  function place(theme, cfg, r) {
    var list = [], counts = {}, i, tries, want = [], tot = 0, id = 0;
    theme.types.forEach(function (e) { tot += e[1]; });
    for (i = 0; i < cfg.count; i++) {
      for (tries = 0; tries < 20; tries++) {
        var x = r() * tot, e = null;
        for (var k = 0; k < theme.types.length; k++) { x -= theme.types[k][1]; if (x <= 0) { e = theme.types[k]; break; } }
        e = e || theme.types[0];
        if ((counts[e[0]] || 0) < e[2]) { counts[e[0]] = (counts[e[0]] || 0) + 1; want.push(e); break; }
      }
    }
    want.sort(function (a, b) { return TYPES[b[0]].w * TYPES[b[0]].h - TYPES[a[0]].w * TYPES[a[0]].h; });
    want.forEach(function (e) {
      var T = TYPES[e[0]], zname = e[3] || T.zone, z = theme.zones[zname] || theme.zones.ground || theme.zones.any, att;
      for (att = 0; att < 90; att++) {
        var o = { id: 0, t: e[0], zone: zname, f: 1, v: Math.floor(r() * T.vmax), k: Math.floor(r() * 1e9) }, yb, ex = T.ext, top, bot;
        o.h = T.hue[0] + r() * (T.hue[1] - T.hue[0]); o.sat = T.sat + (r() - .5) * 12; o.l = T.lit + (r() - .5) * 8;
        if (T.asym && r() < .5) o.f = -1;
        var big = Math.max(ex[2] - ex[0], ex[3] - ex[1]);
        if (z[0] === 'f') {
          yb = z[1] + r() * (z[2] - z[1]);
          o.s = cfg.sf * lerp(.76, 1.12, (yb - z[1]) / Math.max(1, z[2] - z[1])) * (.92 + r() * .16);
          if (big * o.s > 270) o.s = 270 / big;
          o.y = yb - ex[3] * o.s;
        } else {
          o.s = cfg.sf * (.9 + r() * .2);
          if (big * o.s > 270) o.s = 270 / big;
          top = z[1] - ex[1] * o.s; bot = z[2] - ex[3] * o.s;
          if (bot < top) continue;
          o.y = top + r() * (bot - top);
        }
        o.x = 8 + r() * (W - 16);
        var rc = rectOf(o);
        if (!inside(rc, 4)) continue;
        var ok = true;
        for (var q = 0; q < list.length; q++) if (touch(rc, rectOf(list[q]), cfg.gap)) { ok = false; break; }
        if (!ok) continue;
        o.id = id++;
        list.push(o); return;
      }
    });
    return list;
  }

  /* ---------- sửa đổi cho ảnh B ---------- */
  function clone(o) { var c = {}, k; for (k in o) c[k] = o[k]; return c; }
  function isFoot(o, theme) { var z = theme.zones[o.zone]; return !!z && z[0] === 'f'; }

  function makeMod(kind, o, list, cfg, theme, r, hits) {
    var T = TYPES[o.t], b = clone(o), ra = rectOf(o), rb, q, sgn = r() < .5 ? -1 : 1, ang, d, yb, rcU, s2 = o.s * o.s, mp = cfg.minPx, rr, tg, vv;
    switch (kind) {
      case 'missing': case 'extra':
        if (T.area * s2 < mp) return null;
        rb = ra; break;
      case 'color':
        if (T.colorPx * s2 < mp) return null;
        b.h = o.h + sgn * cfg.dh;
        if (T.low) { b.l = clamp(o.l + (o.l > 55 ? -1 : 1) * cfg.dl, 8, 97); }
        rb = ra; break;
      case 'size':
        yb = o.y + T.ext[3] * o.s;
        rr = r() < .5 ? cfg.sizeR : 1 / cfg.sizeR;
        if (Math.max(T.ext[2] - T.ext[0], T.ext[3] - T.ext[1]) * o.s * rr > 280) rr = 1 / cfg.sizeR;
        if (T.area * s2 * Math.abs(1 - rr * rr) < mp) { rr = cfg.sizeR; if (T.area * s2 * (rr * rr - 1) < mp) return null; }
        b.s = o.s * rr;
        b.y = isFoot(o, theme) ? yb - T.ext[3] * b.s : o.y;
        rb = rectOf(b); break;
      case 'move':
        if (T.area * s2 < mp * 1.2) return null;
        ang = Math.floor(r() * 8) * Math.PI / 4 + (r() - .5) * .3; d = cfg.moveD * (.85 + r() * .3);
        b.x = o.x + Math.cos(ang) * d; b.y = o.y + Math.sin(ang) * d * (isFoot(o, theme) ? .5 : 1);
        rb = rectOf(b); break;
      case 'flip':
        if (!T.asym || (T.flipPx[o.v] || 0) * s2 < mp) return null;
        b.f = -o.f; rb = rectOf(b); break;
      case 'variant':
        if (T.vmax < 2) return null;
        tg = [];
        for (vv = 0; vv < T.vmax; vv++) if (vv !== o.v && ((T.varPx[o.v] || [])[vv] || 0) * s2 >= mp) tg.push(vv);
        if (!tg.length) return null;
        b.v = tg[Math.floor(r() * tg.length)]; rb = ra; break;
      default: return null;
    }
    if (!inside(rb, 2)) return null;
    for (q = 0; q < list.length; q++) {
      if (list[q] === o) continue;
      if (kind === 'size' || kind === 'move') { if (touch(rb, rectOf(list[q]), Math.max(3, cfg.gap * .4))) return null; }
    }
    rcU = hitRect(unite(ra, rb));
    for (q = 0; q < hits.length; q++) if (touch(rcU, hits[q], 3)) return null;
    return { b: b, hit: rcU, kind: kind };
  }

  function hashSeed(n, att) { return (Math.imul(n + 17, 2654435761) ^ Math.imul(att + 3, 40503) ^ 0x9E3779B1) >>> 0; }

  function zOrder(o) { return (o.zone === 'sky' ? -10000 : 0) + o.y + (o.zone === 'sky' ? 0 : TYPES[o.t].ext[3] * o.s); }

  function buildLevel(n) {
    var cfg = cfgFor(n), theme = THEMES[(n - 1) % 10], mood = Math.floor((n - 1) / 10), att;
    for (att = 0; att < 80; att++) {
      var r = mulberry32(hashSeed(n, att)), list = place(theme, cfg, r);
      if (list.length < Math.min(cfg.count, 8) || list.length < cfg.count * .8 && att < 79) continue;
      var order = shuffle(list.map(function (_, i) { return i; }), r), used = {}, hits = [], diffs = [], kinds = shuffle(cfg.kinds.slice(), r), ki = 0, okAll = true, s;
      for (s = 0; s < cfg.diffs && okAll; s++) {
        var done = false, tryK;
        for (tryK = 0; tryK < kinds.length && !done; tryK++) {
          var kind = kinds[(ki + tryK) % kinds.length];
          for (var c = 0; c < order.length && !done; c++) {
            var o = list[order[c]];
            if (used[o.id]) continue;
            var mod = makeMod(kind, o, list, cfg, theme, r, hits);
            if (!mod) continue;
            used[o.id] = 1; hits.push(mod.hit); done = true;
            diffs.push({ id: s, kind: kind, oid: o.id, b: mod.b, hit: mod.hit });
          }
        }
        ki++;
        if (!done) okAll = false;
      }
      if (!okAll) continue;
      var byId = {}; diffs.forEach(function (d) { byId[d.oid] = d; });
      var Aobjs = [], Bobjs = [];
      list.forEach(function (o) {
        var d = byId[o.id];
        if (!d) { Aobjs.push(o); Bobjs.push(o); return; }
        if (d.kind === 'extra') { Bobjs.push(o); return; }
        Aobjs.push(o);
        if (d.kind !== 'missing') Bobjs.push(d.b);
      });
      Aobjs.sort(function (a, b) { return zOrder(a) - zOrder(b); }); Bobjs.sort(function (a, b) { return zOrder(a) - zOrder(b); });
      return {
        n: n, theme: theme.id, themeName: theme.name, mood: mood, bgSeed: hashSeed(n, 777), tier: cfg.tier, tierName: cfg.tierName,
        time: cfg.time, cfg: cfg,
        diffs: diffs.map(function (d) { return { id: d.id, kind: d.kind, hit: d.hit, cx: (d.hit.x0 + d.hit.x1) / 2, cy: (d.hit.y0 + d.hit.y1) / 2, oid: d.oid }; }),
        A: Aobjs, B: Bobjs, objCount: list.length
      };
    }
    throw new Error('Không dựng được màn ' + n);
  }

  var cache = {};
  function getLevel(n) { return cache[n] || (cache[n] = buildLevel(n)); }

  function drawScene(g, lv, side) {
    A.drawBackground(g, lv.theme, lv.mood, lv.bgSeed);
    var arr = lv[side], i;
    for (i = 0; i < arr.length; i++) A.drawObject(g, arr[i]);
  }

  /* vẽ lên canvas (kích thước điểm ảnh bất kỳ, tỉ lệ 4:3) */
  function renderTo(canvas, lv, side) {
    var g = canvas.getContext('2d'), sc = canvas.width / W;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(sc, 0, 0, sc, 0, 0);
    g.imageSmoothingEnabled = true;
    if (lv.photo) {
      /* màn ảnh chụp: ảnh A, ảnh B = A + các mảnh vá */
      g.imageSmoothingQuality = 'high';
      g.drawImage(lv.img, 0, 0, W, H);
      if (side === 'B') lv.patches.forEach(function (p) { g.drawImage(p.img, p.x, p.y, p.w, p.h); });
      return;
    }
    drawScene(g, lv, side);
  }

  root.TKB = { W: W, H: H, THEMES: THEMES, TIER_NAMES: TIER_NAMES, TOTAL: 100, cfgFor: cfgFor, buildLevel: buildLevel, getLevel: getLevel, drawScene: drawScene, renderTo: renderTo, rectOf: rectOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.TKB;
})(typeof window !== 'undefined' ? window : globalThis);
