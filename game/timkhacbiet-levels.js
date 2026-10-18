/* Tìm điểm khác biệt — sinh tranh siêu khó ngẫu nhiên.
   Mỗi tranh: chọn một chủ đề (17 chủ đề), dựng cảnh (phông + ~34 vật thể) theo hạt giống, rồi tạo ảnh B bằng cách sửa đúng
   8 vật thể. Có 1–2 vật chỉ tồn tại ở một trong hai ảnh (A có B không, hoặc ngược lại); các điểm còn lại là vật vẫn còn đó
   nhưng hơi khác — nhiều nhất là khác HOẠ TIẾT (hơn/kém đúng 1 sọc, 1 đốm, 1 cửa sổ, 1 cánh hoa...), con vật đổi nét mặt
   (cười / buồn / bình thường), ngoài ra đổi nhẹ màu, độ sáng, kiểu dáng, kích thước, độ nghiêng, kéo giãn, lật ngang hoặc xê dịch.
   Mọi điểm khác đều được kiểm tra đủ thấy (bảng số đo trong timkhacbiet-meta.js). */
(function (root) {
  'use strict';
  var A = root.TKBArt;
  if (!A && typeof require !== 'undefined') { require('./timkhacbiet-art.js'); require('./timkhacbiet-art2.js'); require('./timkhacbiet-meta.js'); A = root.TKBArt; }
  A.finalize();
  var W = A.W, H = A.H, TYPES = A.TYPES, mulberry32 = A.mulberry32;

  /* types: [loại, trọng số, tối đa mỗi ảnh, (vùng thay thế)];  zones: tên vùng -> ['c'|'f', y0, y1, (hệ số cỡ)]
     'c' = tâm vật nằm trong [y0,y1]; 'f' = chân vật (đáy) nằm trong [y0,y1] và vật xa/gần theo độ sâu.
     back: các vùng vẽ trước (nền xa: trời, tường) */
  var THEMES = [
    { id: 'garden', name: 'Vườn cây', zones: { sky: ['c', 24, 215], shelf: ['f', 238, 250, 1], ground: ['f', 365, 585] },
      types: [['bee', 2, 3], ['butterfly', 2, 3], ['dragonfly', 1, 1], ['potplant', 4, 5, 'shelf'], ['cactuspot', 2, 3, 'shelf'], ['sunflower', 3, 3], ['tulip', 4, 5], ['fern', 2, 3],
        ['flower', 3, 4], ['ladybug', 3, 4], ['wateringcan', 1, 2], ['birdhouse', 1, 1], ['snail', 2, 2], ['mushroom', 2, 2], ['bush', 2, 2]] },
    { id: 'road', name: 'Đường xá', zones: { sky: ['c', 24, 140], side: ['f', 228, 262], road: ['f', 330, 586], ground: ['f', 330, 586] },
      types: [['cloud', 2, 2], ['bird', 1, 2], ['plane', 1, 1], ['car', 5, 5, 'road'], ['truck', 2, 2, 'road'], ['bus', 2, 2, 'road'], ['moto', 2, 3, 'road'], ['cone', 3, 4, 'road'],
        ['barrier', 2, 2, 'road'], ['bicycle', 2, 2, 'road'], ['roadsign', 3, 3, 'side'], ['lamp', 2, 2, 'side'], ['hydrant', 2, 2, 'side'], ['bench', 1, 2, 'side'], ['traffic', 1, 2, 'side']] },
    { id: 'desk', name: 'Bàn làm việc', back: ['wall'], zones: { wall: ['c', 18, 222, 1.15], desk: ['f', 300, 586, 1.3], ground: ['f', 300, 586, 1.3] },
      types: [['clock', 1, 1, 'wall'], ['sticky', 4, 5, 'wall'], ['laptop', 1, 1], ['mug', 2, 2], ['pencup', 1, 2], ['books', 2, 2], ['notebook', 2, 2], ['desklamp', 1, 1],
        ['clips', 2, 3], ['phone', 1, 2], ['calculator', 1, 1], ['ruler', 1, 2], ['potplant', 1, 2, 'desk'], ['cactuspot', 1, 1, 'desk'], ['cookie', 1, 2, 'desk'], ['gift', 1, 1, 'desk'], ['candy', 1, 2, 'desk']] },
    { id: 'stream', name: 'Dòng suối', zones: { sky: ['c', 20, 118], bank: ['f', 178, 296, .85], water: ['c', 316, 404], bridgez: ['c', 318, 402], ground: ['f', 446, 586] },
      types: [['bird', 1, 2], ['dragonfly', 3, 3], ['butterfly', 2, 2], ['frog', 3, 4, 'water'], ['lilypad', 4, 5, 'water'], ['fish', 2, 3, 'water'], ['duck', 1, 2, 'water'],
        ['reeds', 4, 5, 'bank'], ['stones', 2, 3, 'ground'], ['log', 1, 2, 'ground'], ['flower', 3, 4, 'ground'], ['mushroom', 2, 2, 'ground'], ['tree', 2, 2, 'bank'],
        ['bush', 2, 2, 'bank'], ['rock', 2, 2, 'ground'], ['snail', 1, 2, 'ground'], ['bridge', 1, 1, 'bridgez']] },
    { id: 'river', name: 'Dòng sông', zones: { sky: ['c', 20, 175], far: ['f', 214, 268, .62], water: ['c', 288, 472], near: ['f', 500, 586], ground: ['f', 500, 586] },
      types: [['cloud', 2, 3], ['bird', 2, 3], ['house', 2, 2, 'far'], ['tree', 3, 3, 'far'], ['pine', 2, 2, 'far'], ['rowboat', 3, 3], ['houseboat', 1, 1], ['duck', 4, 5],
        ['buoy', 3, 3], ['lotus', 3, 4], ['lilypad', 2, 3], ['reeds', 3, 3, 'near'], ['stones', 1, 2, 'near'], ['flower', 2, 3, 'near'], ['frog', 1, 1, 'near']] },
    { id: 'mountain', name: 'Rừng núi', zones: { sky: ['c', 20, 215], ground: ['f', 372, 586] },
      types: [['eagle', 2, 2], ['bird', 1, 2], ['cloud', 2, 2], ['sun', 1, 1], ['pine', 5, 6], ['deer', 2, 3], ['cabin', 1, 1], ['tent', 1, 2], ['campfire', 1, 1], ['signpost', 1, 2],
        ['rock', 2, 3], ['stones', 1, 2], ['mushroom', 2, 3], ['bunny', 1, 1], ['owl', 1, 1], ['log', 1, 1], ['fern', 2, 2]] },
    { id: 'landscape', name: 'Cảnh quan', zones: { sky: ['c', 20, 230], ground: ['f', 348, 586] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['balloon', 2, 3], ['bird', 2, 2], ['barn', 1, 1], ['windmill', 1, 1], ['haystack', 2, 3], ['cow', 3, 3], ['sheep', 2, 3],
        ['scarecrow', 1, 1], ['tractor', 1, 1], ['fence', 2, 2], ['tree', 2, 3], ['flower', 2, 3], ['house', 1, 1]] },
    { id: 'space', name: 'Vũ trụ', zones: { any: ['c', 30, 570], sky: ['c', 30, 570], ground: ['c', 30, 570] },
      types: [['planet', 3, 4], ['moon', 1, 1], ['comet', 2, 2], ['rocket', 2, 3], ['crescent', 1, 1], ['ufo', 2, 2], ['satellite', 2, 2], ['astronaut', 2, 2], ['alien', 2, 3], ['star', 5, 7]] },
    { id: 'city', name: 'Thành phố', zones: { sky: ['c', 30, 235], skyline: ['f', 462, 505], street: ['f', 525, 586], ground: ['f', 525, 586] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['plane', 1, 2], ['balloon', 1, 1], ['bird', 2, 2], ['building', 4, 5, 'skyline'], ['car', 3, 4, 'street'], ['bus', 1, 1, 'street'],
        ['moto', 1, 2, 'street'], ['bicycle', 1, 2, 'street'], ['traffic', 2, 2, 'street'], ['lamp', 2, 3, 'street'], ['hydrant', 1, 2, 'street'], ['bench', 1, 1, 'street'], ['tree', 2, 3, 'street']] },
    { id: 'village', name: 'Làng quê', zones: { sky: ['c', 40, 250], ground: ['f', 335, 586] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['bird', 2, 2], ['kite', 1, 1], ['butterfly', 1, 1], ['house', 4, 3], ['tree', 4, 5], ['bush', 2, 3], ['flower', 4, 6], ['fence', 2, 2],
        ['sheep', 3, 3], ['windmill', 1, 1], ['mushroom', 2, 2], ['rock', 1, 2]] },
    { id: 'beach', name: 'Bãi biển', zones: { sky: ['c', 36, 240], sea: ['f', 385, 462], ground: ['f', 480, 586] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['bird', 2, 3], ['balloon', 1, 1], ['sailboat', 3, 3], ['umbrella', 3, 3], ['palm', 3, 3], ['crab', 2, 3], ['starfish', 2, 3],
        ['beachball', 2, 2], ['lighthouse', 1, 1], ['sandcastle', 1, 1]] },
    { id: 'sea', name: 'Đại dương', zones: { water: ['c', 36, 490], floor: ['f', 520, 586], ground: ['f', 520, 586], sky: ['c', 36, 490] },
      types: [['fish', 6, 7], ['jelly', 2, 3], ['bubbles', 3, 4], ['submarine', 1, 1], ['turtle', 2, 2], ['seaweed', 3, 4], ['coral', 3, 4], ['chest', 1, 1], ['starfish', 1, 2], ['crab', 1, 2]] },
    { id: 'forest', name: 'Rừng xanh', zones: { sky: ['c', 36, 200], ground: ['f', 365, 586] },
      types: [['sun', 1, 1], ['cloud', 2, 2], ['bird', 1, 2], ['butterfly', 2, 2], ['tree', 5, 6], ['pine', 4, 5], ['bush', 3, 3], ['flower', 4, 5], ['mushroom', 4, 5], ['owl', 2, 2],
        ['bunny', 2, 2], ['snail', 2, 2], ['rock', 2, 2], ['ladybug', 1, 2]] },
    { id: 'winter', name: 'Xứ tuyết', zones: { sky: ['c', 36, 230], ground: ['f', 350, 586] },
      types: [['snowflake', 4, 5], ['cloud', 2, 2], ['snowman', 2, 2], ['spine', 5, 6], ['igloo', 1, 1], ['penguin', 3, 4], ['gift', 2, 3], ['cabin', 2, 2], ['bunny', 1, 1]] },
    { id: 'desert', name: 'Sa mạc', zones: { sky: ['c', 36, 230], ground: ['f', 385, 586] },
      types: [['sun', 1, 1], ['cloud', 1, 1], ['bird', 2, 2], ['eagle', 1, 1], ['cactus', 5, 6], ['pyramid', 2, 2], ['palm', 2, 3], ['tent', 2, 2], ['camel', 3, 3], ['rock', 3, 3]] },
    { id: 'castle', name: 'Lâu đài', zones: { sky: ['c', 36, 235], ground: ['f', 355, 586] },
      types: [['sun', 1, 1], ['cloud', 3, 3], ['rainbow', 1, 1], ['bird', 2, 2], ['balloon', 2, 2], ['kite', 1, 1], ['castle', 2, 1], ['tower', 3, 3], ['flag', 3, 3], ['tree', 3, 4],
        ['bush', 2, 3], ['flower', 3, 4], ['crown', 1, 1, 'ground']] },
    { id: 'party', name: 'Tiệc ngọt', zones: { sky: ['c', 46, 215], ground: ['c', 355, 572], any: ['c', 355, 572] },
      types: [['balloon', 4, 4], ['star', 3, 4], ['gift', 3, 3, 'any'], ['cupcake', 3, 4], ['icecream', 2, 2], ['lollipop', 3, 3], ['donut', 3, 4], ['candy', 4, 4], ['cookie', 3, 4], ['cake', 2, 3]] }
  ];
  var THEME_BY_ID = {};
  THEMES.forEach(function (t) { THEME_BY_ID[t.id] = t; });

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* thông số siêu khó (dùng chung cho mọi tranh) */
  var CFG = {
    /* tranh dày đặc: nhiều vật hơn, nhỏ hơn, sát nhau hơn; mỗi loại vật được xuất hiện nhiều hơn (capMul) để có nhiều "vật giống nhau" gây nhiễu */
    tierName: 'Siêu khó', count: 34, capMul: 1.5, diffs: 8, sf: .78, gap: 5, time: 180,
    /* kiểu khác biệt, lặp lại = hay gặp hơn: hoạ tiết là nhiều nhất */
    kinds: ['pattern', 'pattern', 'pattern', 'pattern', 'pattern', 'mood', 'mood', 'variant', 'variant', 'color', 'shade', 'size', 'stretch', 'tilt', 'flip', 'move'],
    existMin: 1, existMax: 2,   // số vật chỉ có ở một trong hai ảnh (A có B không, hoặc B có A không)
    existPx: 300,               // vật phải đủ lớn (điểm ảnh) mới được chọn để biến mất/xuất hiện
    moodPx: 40,
    /* chênh lệch rất nhỏ */
    dh: 16, dl: 8, sizeR: 1.15, moveD: 9, tilt: .1, stretch: 1.11, shade: 7,
    minPx: 40,      // số điểm ảnh tối thiểu phải đổi (ở khung 800x600) để một điểm khác được dùng
    patMin: 34      // riêng hoạ tiết (1 đốm/1 sọc nhỏ) được phép nhỏ hơn một chút
  };

  /* ---------- hình chữ nhật ---------- */
  /* khung bao thật (đã đo) của vật, có tính lật ngang, kéo giãn, xoay và tỉ lệ, nới 1,5 px cho nét viền */
  function rectOf(o) {
    var e = TYPES[o.t].ext, sx = o.s * (o.f < 0 ? -1 : 1) * (o.sx || 1), sy = o.s, c = Math.cos(o.r || 0), sn = Math.sin(o.r || 0);
    var xs = [e[0], e[2], e[2], e[0]], ys = [e[1], e[1], e[3], e[3]], mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9, i, px, py, rx, ry;
    for (i = 0; i < 4; i++) {
      px = xs[i] * sx; py = ys[i] * sy; rx = px * c - py * sn; ry = px * sn + py * c;
      if (rx < mnx) mnx = rx; if (rx > mxx) mxx = rx; if (ry < mny) mny = ry; if (ry > mxy) mxy = ry;
    }
    return { x0: o.x + mnx - 1.5, y0: o.y + mny - 1.5, x1: o.x + mxx + 1.5, y1: o.y + mxy + 1.5 };
  }
  function touch(a, b, gap) { return a.x0 < b.x1 + gap && a.x1 > b.x0 - gap && a.y0 < b.y1 + gap && a.y1 > b.y0 - gap; }
  function unite(a, b) { return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }; }
  function inside(r, m) { return r.x0 >= m && r.y0 >= m && r.x1 <= W - m && r.y1 <= H - m; }
  var MIN_HIT = 54, HIT_PAD = 6;
  function hitRect(r) {
    var cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2, w = Math.max(r.x1 - r.x0, MIN_HIT) + HIT_PAD * 2, h = Math.max(r.y1 - r.y0, MIN_HIT) + HIT_PAD * 2;
    return { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 };
  }

  /* màu chủ đạo của vật ra RGB, để chắc đổi màu/độ sáng thật sự nhìn ra được (màu xám/tối đổi sắc độ gần như không thấy) */
  function rgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    var a = s * Math.min(l, 1 - l), f = function (n) { var k = (n + h / 30) % 12; return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); };
    return [f(0), f(8), f(4)];
  }
  function colorGap(o, b) { var p = rgb(o.h, o.sat, o.l), q = rgb(b.h, b.sat, b.l); return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]); }

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
        if ((counts[e[0]] || 0) < (e[2] > 1 ? Math.ceil(e[2] * (cfg.capMul || 1)) : e[2])) { counts[e[0]] = (counts[e[0]] || 0) + 1; want.push(e); break; }
      }
    }
    want.sort(function (a, b) { return TYPES[b[0]].w * TYPES[b[0]].h - TYPES[a[0]].w * TYPES[a[0]].h; });
    want.forEach(function (e) {
      var T = TYPES[e[0]], zname = e[3] || T.zone, z = theme.zones[zname] || theme.zones.ground || theme.zones.any, att, zs = z[3] || 1;
      for (att = 0; att < 90; att++) {
        var o = { id: 0, t: e[0], zone: zname, f: 1, v: Math.floor(r() * T.vmax), k: Math.floor(r() * 1e9) }, yb, ex = T.ext, top, bot;
        o.h = T.hue[0] + r() * (T.hue[1] - T.hue[0]); o.sat = T.sat + (r() - .5) * 12; o.l = T.lit + (r() - .5) * 8;
        if (T.pat) o.p = T.pat[0] + Math.floor(r() * (T.pat[1] - T.pat[0] + 1));
        if (T.mood) { var mr = r(); o.m = mr < .5 ? 0 : mr < .75 ? 1 : 2; }
        if (T.asym && r() < .5) o.f = -1;
        var big = Math.max(ex[2] - ex[0], ex[3] - ex[1]);
        if (z[0] === 'f') {
          yb = z[1] + r() * (z[2] - z[1]);
          o.s = cfg.sf * zs * lerp(.76, 1.12, (yb - z[1]) / Math.max(1, z[2] - z[1])) * (.92 + r() * .16);
          if (big * o.s > 250) o.s = 250 / big;
          o.y = yb - ex[3] * o.s;
        } else {
          o.s = cfg.sf * zs * (.9 + r() * .2);
          if (big * o.s > 250) o.s = 250 / big;
          top = z[1] - ex[1] * o.s; bot = z[2] - ex[3] * o.s;
          if (bot < top) { top = bot = (z[1] + z[2]) / 2 - (ex[1] + ex[3]) / 2 * o.s; }
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
    var T = TYPES[o.t], b = clone(o), ra = rectOf(o), rb, q, sgn = r() < .5 ? -1 : 1, ang, d, yb, rcU, s2 = o.s * o.s, mp = cfg.minPx, rr, tg, vv, p2;
    switch (kind) {
      case 'missing': case 'extra':
        if (T.area * s2 < cfg.existPx) return null;
        rb = ra; break;
      case 'mood':
        if (!T.mood || !T.moodOn(o) || T.moodPx * s2 < cfg.moodPx) return null;
        b.m = ((o.m || 0) + 1 + Math.floor(r() * 2)) % 3; rb = ra; break;
      case 'pattern':
        /* hơn/kém đúng 1 hoạ tiết */
        if (!T.pat) return null;
        p2 = o.p + sgn;
        if (p2 < T.pat[0] || p2 > T.pat[1]) p2 = o.p - sgn;
        if (p2 < T.pat[0] || p2 > T.pat[1]) return null;
        if ((T.patPx[Math.min(o.p, p2) - T.pat[0]] || 0) * s2 < cfg.patMin) return null;
        b.p = p2; rb = ra; break;
      case 'color':
        if (T.colorPx2 * Math.min(1, cfg.dh / 14) * s2 < mp) return null;
        b.h = o.h + sgn * cfg.dh;
        if (T.low) { b.l = clamp(o.l + (o.l > 55 ? -1 : 1) * cfg.dl, 8, 97); }
        if (colorGap(o, b) < 36) return null;
        rb = ra; break;
      case 'size':
        yb = o.y + T.ext[3] * o.s;
        rr = r() < .5 ? cfg.sizeR : 1 / cfg.sizeR;
        if (T.area * s2 * Math.abs(1 - rr * rr) < mp) { rr = cfg.sizeR; if (T.area * s2 * (rr * rr - 1) < mp) return null; }
        b.s = o.s * rr;
        b.y = isFoot(o, theme) ? yb - T.ext[3] * b.s : o.y;
        rb = rectOf(b); break;
      case 'move':
        if (T.area * s2 < mp * 1.2) return null;
        ang = Math.floor(r() * 8) * Math.PI / 4 + (r() - .5) * .3; d = cfg.moveD * (.85 + r() * .3);
        b.x = o.x + Math.cos(ang) * d; b.y = o.y + Math.sin(ang) * d * (isFoot(o, theme) ? .5 : 1);
        rb = rectOf(b); break;
      case 'tilt':
        if (T.notilt || T.tiltPx * Math.min(1, cfg.tilt / .2) * s2 < mp) return null;
        b.r = (o.r || 0) + sgn * cfg.tilt; rb = rectOf(b); break;
      case 'stretch':
        if (T.stretchPx * Math.min(1, (cfg.stretch - 1) / .2) * s2 < mp) return null;
        b.sx = (o.sx || 1) * (r() < .5 ? cfg.stretch : 1 / cfg.stretch); rb = rectOf(b); break;
      case 'shade':
        if (T.shadePx * Math.min(1, cfg.shade / 10) * s2 < mp) return null;
        b.l = clamp(o.l + (o.l > 55 ? -1 : 1) * cfg.shade, 8, 97);
        if (colorGap(o, b) < 30) return null;
        rb = ra; break;
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
    if (kind === 'size' || kind === 'move' || kind === 'tilt' || kind === 'stretch') {
      for (q = 0; q < list.length; q++) if (list[q] !== o && touch(rb, rectOf(list[q]), 3)) return null;
    }
    rcU = hitRect(unite(ra, rb));
    for (q = 0; q < hits.length; q++) if (touch(rcU, hits[q], 3)) return null;
    return { b: b, hit: rcU, kind: kind };
  }

  function zOrder(theme, o) {
    var back = o.zone === 'sky' || (theme.back && theme.back.indexOf(o.zone) >= 0);
    return (back ? -10000 : 0) + o.y + (back ? 0 : TYPES[o.t].ext[3] * o.s);
  }

  /* dựng một tranh siêu khó từ chủ đề + hạt giống (cùng hạt giống luôn ra cùng một tranh) */
  function buildPicture(themeId, seed) {
    var theme = THEME_BY_ID[themeId] || THEMES[0], cfg = CFG, att;
    for (att = 0; att < 60; att++) {
      var r = mulberry32((seed + att * 7919) >>> 0), list = place(theme, cfg, r);
      if (list.length < cfg.count * .75 && att < 59) continue;
      var order = shuffle(list.map(function (_, i) { return i; }), r), used = {}, hits = [], diffs = [], kinds = shuffle(cfg.kinds.slice(), r), ki = 0, okAll = true, s;
      var nExist = cfg.existMin + (r() < .5 ? 0 : cfg.existMax - cfg.existMin), exKinds = [];
      for (s = 0; s < nExist; s++) exKinds.push(r() < .5 ? 'missing' : 'extra');
      for (s = 0; s < cfg.diffs && okAll; s++) {
        var done = false, tryK, slotKinds = s < nExist ? [exKinds[s], exKinds[s] === 'missing' ? 'extra' : 'missing'] : kinds;
        for (tryK = 0; tryK < slotKinds.length && !done; tryK++) {
          var kind = s < nExist ? slotKinds[tryK] : slotKinds[(ki + tryK) % slotKinds.length];
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
        if (d && d.kind === 'extra') { Bobjs.push(o); return; }        // chỉ có ở ảnh B
        Aobjs.push(o);
        if (!d || d.kind !== 'missing') Bobjs.push(d ? d.b : o);       // missing: chỉ có ở ảnh A
      });
      Aobjs.sort(function (a, b) { return zOrder(theme, a) - zOrder(theme, b); }); Bobjs.sort(function (a, b) { return zOrder(theme, a) - zOrder(theme, b); });
      return {
        id: themeId + ':' + seed, theme: theme.id, themeName: theme.name, mood: (seed >>> 3) % 10, bgSeed: seed ^ 0x2c1b3c6d,
        tierName: cfg.tierName, time: cfg.time,
        diffs: diffs.map(function (d) { return { id: d.id, kind: d.kind, hit: d.hit, cx: (d.hit.x0 + d.hit.x1) / 2, cy: (d.hit.y0 + d.hit.y1) / 2, oid: d.oid }; }),
        A: Aobjs, B: Bobjs, objCount: list.length
      };
    }
    throw new Error('Không dựng được tranh ' + themeId + ' ' + seed);
  }

  /* Bộ chọn ngẫu nhiên: lần lượt đi hết các chủ đề theo thứ tự xáo trộn (không lặp chủ đề vừa chơi),
     mỗi tranh một hạt giống ngẫu nhiên mới */
  function Picker(rand) {
    rand = rand || Math.random;
    var bag = [], last = null;
    this.next = function () {
      if (!bag.length) {
        bag = THEMES.map(function (t) { return t.id; });
        for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = bag[i]; bag[i] = bag[j]; bag[j] = t; }
        if (bag[bag.length - 1] === last && bag.length > 1) { var tmp = bag[0]; bag[0] = bag[bag.length - 1]; bag[bag.length - 1] = tmp; }
      }
      last = bag.pop();
      var seed = Math.floor(rand() * 4294967296) >>> 0;
      return buildPicture(last, seed);
    };
  }

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
      /* tranh ảnh chụp: ảnh A, ảnh B = A + các mảnh vá */
      g.imageSmoothingQuality = 'high';
      g.drawImage(lv.img, 0, 0, W, H);
      if (side === 'B') lv.patches.forEach(function (p) { g.drawImage(p.img, p.x, p.y, p.w, p.h); });
      return;
    }
    drawScene(g, lv, side);
  }

  root.TKB = { W: W, H: H, THEMES: THEMES, CFG: CFG, buildPicture: buildPicture, Picker: Picker, drawScene: drawScene, renderTo: renderTo, rectOf: rectOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.TKB;
})(typeof window !== 'undefined' ? window : globalThis);
