/* Bowling: lõi vật lý và tính điểm (không vẽ, không DOM) để game và công cụ thử chung một luật.
 * Toạ độ thật theo mét: x ngang làn (giữa = 0, mép làn ±0,53), z dọc làn tính từ vạch ném (ki số 1 ở z = 18,29).
 * Bóng 7 kg bán kính 0,108 m; ki 1,5 kg. Ki đứng là hình tròn, ki đang đổ / đã nằm là đoạn thẳng có bề dày
 * (capsule) nên ki đổ quét trúng ki bên cạnh, tạo hiệu ứng dây chuyền như ngoài đời. */
(function (root) {
  'use strict';
  var LANE = 0.53, GUT = 0.765, HEAD = 18.29, DECK = 17.9, PIT = 19.45;
  var BALL_R = 0.108, BALL_M = 7, PIN_R = 0.061, PIN_M = 1.5, PIN_LEN = 0.30;
  var SPOTS = [[0, 0], [-0.1524, 0.264], [0.1524, 0.264], [-0.3048, 0.528], [0, 0.528], [0.3048, 0.528],
               [-0.4572, 0.792], [-0.1524, 0.792], [0.1524, 0.792], [0.4572, 0.792]];

  /* Mười khung, khó dần. oil: độ dài lớp dầu (bóng chưa ăn xoáy khi còn trên dầu); hook: hệ số bẻ xoáy;
     tilt: làn nghiêng (m/s², dấu chọn ngẫu nhiên mỗi ván); blocks: tấm chắn trượt {z, w (rad/s)}; post: cọc giữa làn. */
  var FRAMES = [
    { name: 'Làn chuẩn', tip: 'Kéo lùi để ngắm, kéo càng dài ném càng mạnh.', oil: 11 },
    { name: 'Làn chuẩn', tip: 'Bóng xoáy chỉ bẻ khi ra khỏi lớp dầu, gần cuối làn.', oil: 11 },
    { name: 'Dầu dài', tip: 'Dầu phủ gần hết làn, bóng bẻ rất muộn.', oil: 15 },
    { name: 'Tấm chắn trượt', tip: 'Canh lúc tấm chắn trượt sang một bên rồi hãy ném.', oil: 11, blocks: [{ z: 9, w: 1.15 }] },
    { name: 'Làn nghiêng', tip: 'Làn dốc về một bên, mũi tên cho biết hướng dốc.', oil: 11, tilt: 0.22 },
    { name: 'Làn khô', tip: 'Ít dầu, bóng xoáy bẻ sớm và mạnh.', oil: 5, hook: 1.3 },
    { name: 'Hai tấm chắn', tip: 'Hai tấm chắn trượt ngược chiều nhau.', oil: 11, blocks: [{ z: 7, w: 1.3 }, { z: 12, w: -1.3 }] },
    { name: 'Cọc giữa làn', tip: 'Ném lệch tránh cọc rồi dùng xoáy bẻ về giữa.', oil: 9, post: { x: 0, z: 11.5 } },
    { name: 'Dốc và chắn', tip: 'Làn nghiêng, tấm chắn chạy nhanh hơn.', oil: 11, tilt: 0.2, blocks: [{ z: 10, w: 2.1 }] },
    { name: 'Chung kết', tip: 'Cọc, hai tấm chắn và làn khô. Khung cuối được ném thêm nếu Strike hay Spare.', oil: 6, hook: 1.2,
      post: { x: 0, z: 13 }, blocks: [{ z: 6.5, w: 1.5 }, { z: 9.5, w: -1.7 }] }
  ];

  function rack() {
    return SPOTS.map(function (s, i) {
      return { id: i + 1, x: s[0], z: HEAD + s[1], vx: 0, vz: 0, st: 0, tilt: 0, tw: 0, dx: 0, dz: 1, wob: 0, wobT: 0, fade: 1 };
    });
  }

  /* Đoạn thẳng gần nhất giữa hai đoạn [p1,q1] và [p2,q2] (Ericson, Real-Time Collision Detection). */
  function closest(p1x, p1z, q1x, q1z, p2x, p2z, q2x, q2z) {
    var d1x = q1x - p1x, d1z = q1z - p1z, d2x = q2x - p2x, d2z = q2z - p2z, rx = p1x - p2x, rz = p1z - p2z;
    var a = d1x * d1x + d1z * d1z, e = d2x * d2x + d2z * d2z, f = d2x * rx + d2z * rz, s, t;
    if (a < 1e-9 && e < 1e-9) { s = 0; t = 0; }
    else if (a < 1e-9) { s = 0; t = clamp(f / e, 0, 1); }
    else {
      var c = d1x * rx + d1z * rz;
      if (e < 1e-9) { t = 0; s = clamp(-c / a, 0, 1); }
      else {
        var b = d1x * d2x + d1z * d2z, den = a * e - b * b;
        s = den > 1e-9 ? clamp((b * f - c * e) / den, 0, 1) : 0;
        t = (b * s + f) / e;
        if (t < 0) { t = 0; s = clamp(-c / a, 0, 1); } else if (t > 1) { t = 1; s = clamp((b - c) / a, 0, 1); }
      }
    }
    return [p1x + d1x * s, p1z + d1z * s, p2x + d2x * t, p2z + d2z * t, s, t];
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function pinSeg(p) {
    if (p.st === 0) return [p.x, p.z, p.x, p.z, PIN_R];
    var L = PIN_LEN * Math.sin(p.tilt);
    return [p.x, p.z, p.x + p.dx * L, p.z + p.dz * L, 0.058];
  }

  /* Một lượt ném. cond: khung đang chơi; tiltSign, phase: ngẫu nhiên theo ván; rnd: hàm ngẫu nhiên 0..1. */
  function Sim(cond, pins, opt) {
    opt = opt || {};
    this.c = cond; this.pins = pins; this.rnd = opt.rnd || Math.random;
    this.tilt = (cond.tilt || 0) * (opt.tiltSign || 1);
    this.phase = opt.phase || 0; this.t = opt.t0 || 0;
    this.ball = null; this.ev = opt.ev || function () {};
    this.quiet = 0; this.after = 0; this.done = false; this.firstHit = false;
  }
  Sim.prototype.blockX = function (b, t) { return 0.34 * Math.sin(b.w * (t == null ? this.t : t) + this.phase + b.z); };
  Sim.prototype.launch = function (x, ang, speed, spin) {
    this.ball = { x: x, z: 0, vx: Math.sin(ang) * speed, vz: Math.cos(ang) * speed, st: 1, spin: spin, roll: 0, stall: 0, hk: 0 };
  };
  Sim.prototype.step = function (dt) {
    this.t += dt;
    var b = this.ball, c = this.c, i, j, ps = this.pins;
    if (b && b.st > 0) {
      var sp = Math.hypot(b.vx, b.vz) || 1;
      if (b.st === 1) {
        var oilK = b.z < c.oil ? 0 : Math.min(1, (b.z - c.oil) / 2.2);
        // xoáy: ra khỏi dầu thì bóng bẻ dần cho tới khi đạt vận tốc ngang tối đa của nấc xoáy đó
        var cap = Math.abs(b.spin) * 0.22 * (c.hook || 1), hook = 0;
        if (b.spin && b.z < DECK && b.hk < cap) { hook = Math.sign(b.spin) * 1.4 * oilK; b.hk += Math.abs(hook) * dt; }
        b.vx += (hook + this.tilt) * dt;
        var fr = b.z < c.oil ? 0.06 : 0.28;
        b.vx -= b.vx / sp * fr * dt; b.vz -= b.vz / sp * fr * dt;
      } else { b.vx = 0; b.vz -= 0.05 * dt; }
      b.x += b.vx * dt; b.z += b.vz * dt; b.roll += sp * dt / BALL_R;
      if (b.st === 1) {
        if (Math.abs(b.x) > LANE && b.z < DECK) { b.st = 2; b.x = Math.sign(b.x) * 0.65; this.ev('gutter', 1); }
        else if (b.z >= DECK && Math.abs(b.x) > GUT - BALL_R) { b.x = Math.sign(b.x) * (GUT - BALL_R); b.vx = -b.vx * 0.4; this.ev('wall', 0.5); }
        var bl = c.blocks || [];
        for (i = 0; i < bl.length; i++) this.hitBlock(b, bl[i], dt);
        if (c.post) this.hitPost(b, c.post);
        if (b.vz < 0.4 && b.z < 17) { b.stall += dt; if (b.stall > 0.9) { b.st = 0; this.ev('dead', 1); } }
      }
      if (b.z > PIT || b.z < -1) b.st = 0;
    }
    // ki: trượt, đổ, ma sát
    for (i = 0; i < ps.length; i++) {
      var p = ps[i]; if (p.st === 3) continue;
      if (p.st === 1) { p.tw += 20 * dt; p.tilt += p.tw * dt; if (p.tilt >= Math.PI / 2) { p.tilt = Math.PI / 2; p.st = 2; this.ev('pinDown', 0.5); } }
      var v = Math.hypot(p.vx, p.vz);
      if (v > 0) { var dec = (p.st === 0 ? 5 : 2.2) * dt; if (v <= dec) { p.vx = 0; p.vz = 0; } else { p.vx -= p.vx / v * dec; p.vz -= p.vz / v * dec; } }
      p.x += p.vx * dt; p.z += p.vz * dt;
      if (p.wob > 0) { p.wobT += dt; p.wob = Math.max(0, p.wob - dt * 0.9); }
      if (Math.abs(p.x) > GUT - 0.05) { p.x = Math.sign(p.x) * (GUT - 0.05); p.vx = -p.vx * 0.55; this.ev('wall', Math.min(1, Math.abs(p.vx))); }
      if (p.st === 0 && (Math.abs(p.x) > LANE || p.z > PIT - 0.1)) this.knock(p, p.vx || 0.01, p.vz || 0.01);
      if (p.z > PIT || p.z < HEAD - 2.5) { p.st = 3; p.vx = p.vz = 0; }
    }
    // va chạm bóng - ki
    if (b && b.st === 1 && b.z > HEAD - 0.5) {
      for (i = 0; i < ps.length; i++) if (ps[i].st !== 3) this.collide(null, ps[i], 0.55);
    }
    // va chạm ki - ki
    for (i = 0; i < ps.length; i++) {
      if (ps[i].st === 3) continue;
      for (j = i + 1; j < ps.length; j++) if (ps[j].st !== 3) this.collide(ps[i], ps[j], 0.6);
    }
    // đếm thời gian để biết lượt ném đã xong
    var moving = false;
    for (i = 0; i < ps.length; i++) { var q = ps[i]; if (q.st === 1 || (q.st !== 3 && Math.hypot(q.vx, q.vz) > 0.04)) { moving = true; break; } }
    if (b && (b.st === 0 || b.z > HEAD - 0.3)) this.after += dt;
    if (b && b.st === 0) { this.quiet = moving ? 0 : this.quiet + dt; if (this.quiet > 0.45 || this.after > 4.5) this.done = true; }
  };
  Sim.prototype.knock = function (p, vx, vz) {
    var l = Math.hypot(vx, vz) || 1;
    p.st = 1; p.dx = vx / l; p.dz = vz / l; p.tw = 3 + Math.min(6, l * 2); p.tilt = 0.02;
  };
  Sim.prototype.collide = function (A, B, e) {
    // A = null nghĩa là bóng
    var b = this.ball, sa, sb = pinSeg(B);
    if (A) sa = pinSeg(A); else sa = [b.x, b.z, b.x, b.z, BALL_R];
    var cp = closest(sa[0], sa[1], sa[2], sa[3], sb[0], sb[1], sb[2], sb[3]);
    var nx = cp[2] - cp[0], nz = cp[3] - cp[1], d = Math.hypot(nx, nz), R = sa[4] + sb[4];
    if (d >= R) return;
    if (d < 1e-6) { nx = 0; nz = 1; d = 1e-6; } nx /= d; nz /= d;
    var ma = A ? PIN_M : BALL_M, mb = PIN_M, ia = 1 / ma, ib = 1 / mb;
    var pen = R - d, k = pen / (ia + ib);
    if (A) { A.x -= nx * k * ia; A.z -= nz * k * ia; } else { b.x -= nx * k * ia; b.z -= nz * k * ia; }
    B.x += nx * k * ib; B.z += nz * k * ib;
    var avx = A ? A.vx : b.vx, avz = A ? A.vz : b.vz;
    // ki đang đổ: đầu ki quét theo hướng đổ
    if (A && A.st === 1) { var ta = cp[4] * PIN_LEN * Math.cos(A.tilt) * A.tw * 0.6; avx += A.dx * ta; avz += A.dz * ta; }
    var bvx = B.vx, bvz = B.vz;
    if (B.st === 1) { var tb = cp[5] * PIN_LEN * Math.cos(B.tilt) * B.tw * 0.6; bvx += B.dx * tb; bvz += B.dz * tb; }
    var rel = (bvx - avx) * nx + (bvz - avz) * nz;
    if (rel >= 0) return;
    var jimp = -(1 + e) * rel / (ia + ib);
    if (A) { A.vx -= nx * jimp * ia; A.vz -= nz * jimp * ia; } else { b.vx -= nx * jimp * ia; b.vz -= nz * jimp * ia; }
    var dvx = nx * jimp * ib, dvz = nz * jimp * ib;
    if (!A) { var r = (this.rnd() - 0.5) * 0.3, cs = Math.cos(r), sn = Math.sin(r), tx = dvx * cs - dvz * sn; dvz = dvx * sn + dvz * cs; dvx = tx; }
    B.vx += dvx; B.vz += dvz;
    var dv = Math.hypot(dvx, dvz);
    if (A) { this.react(A, dv); }
    this.react(B, dv);
    if (!A) { if (!this.firstHit) { this.firstHit = true; this.ev('first', Math.min(1, -rel / 8)); } else this.ev('ball', Math.min(1, -rel / 8)); }
    else this.ev('pin', Math.min(1, -rel / 3));
  };
  Sim.prototype.react = function (p, dv) {
    if (p.st !== 0) return;
    if (dv > 0.3) this.knock(p, p.vx, p.vz);
    else if (dv > 0.05) { p.wob = Math.min(0.5, p.wob + dv); p.wobT = 0; }
  };
  Sim.prototype.hitBlock = function (b, bl, dt) {
    var bx = this.blockX(bl), hw = 0.13, hd = 0.06;
    var cx = clamp(b.x, bx - hw, bx + hw), cz = clamp(b.z, bl.z - hd, bl.z + hd);
    var dx = b.x - cx, dz = b.z - cz, d = Math.hypot(dx, dz);
    if (d >= BALL_R) return;
    if (d < 1e-6) { dx = 0; dz = -1; d = 1; } dx /= d; dz /= d;
    b.x = cx + dx * BALL_R; b.z = cz + dz * BALL_R;
    var vbx = (this.blockX(bl, this.t + dt) - bx) / dt;
    var rvx = b.vx - vbx, rel = rvx * dx + b.vz * dz;
    if (rel < 0) { b.vx -= (1.35) * rel * dx; b.vz -= (1.35) * rel * dz; b.vx *= 0.85; b.vz *= 0.85; this.ev('block', Math.min(1, -rel / 6)); }
  };
  Sim.prototype.hitPost = function (b, po) {
    var dx = b.x - po.x, dz = b.z - po.z, d = Math.hypot(dx, dz), R = BALL_R + 0.05;
    if (d >= R) return;
    dx /= d; dz /= d; b.x = po.x + dx * R; b.z = po.z + dz * R;
    var rel = b.vx * dx + b.vz * dz;
    if (rel < 0) { b.vx -= 1.4 * rel * dx; b.vz -= 1.4 * rel * dz; this.ev('block', Math.min(1, -rel / 6)); }
  };
  Sim.prototype.standing = function () { return this.pins.filter(function (p) { return p.st === 0; }).length; };

  /* ---------- tính điểm ---------- */
  function totals(frames) {
    var rolls = [], idx = [], out = [], i;
    frames.forEach(function (f, fi) { f.forEach(function (r) { rolls.push(r); }); idx.push(fi); });
    var k = 0, sum = 0;
    for (i = 0; i < 10; i++) {
      var f = frames[i]; if (!f || !f.length) break;
      if (i < 9) {
        if (f[0] === 10) { if (rolls.length < k + 3) break; sum += 10 + rolls[k + 1] + rolls[k + 2]; k += 1; }
        else if (f.length < 2) break;
        else if (f[0] + f[1] === 10) { if (rolls.length < k + 3) break; sum += 10 + rolls[k + 2]; k += 2; }
        else { sum += f[0] + f[1]; k += 2; }
      } else {
        var need = (f[0] === 10 || f[0] + (f[1] || 0) === 10) ? 3 : 2;
        if (f.length < need) break;
        sum += f.reduce(function (a, b) { return a + b; }, 0);
      }
      out[i] = sum;
    }
    return out;
  }
  /* Ký hiệu từng ô ném: X, /, -, số */
  function marks(f, i) {
    var m = [];
    if (i < 9) {
      if (f[0] === 10) return ['', 'X'];
      if (f.length) m.push(f[0] ? String(f[0]) : '-');
      if (f.length > 1) m.push(f[0] + f[1] === 10 ? '/' : f[1] ? String(f[1]) : '-');
      return m;
    }
    var fresh = true, prev = 0;
    for (var k = 0; k < f.length; k++) {
      var r = f[k];
      if (fresh && r === 10) { m.push('X'); fresh = true; prev = 0; }
      else if (!fresh && prev + r === 10) { m.push('/'); fresh = true; prev = 0; }
      else { m.push(r ? String(r) : '-'); if (fresh) { fresh = false; prev = r; } else { fresh = true; prev = 0; } }
    }
    return m;
  }
  /* Sau một lần ném: khung đã xong chưa, có dựng lại đủ ki không */
  function after(f, i) {
    if (i < 9) { var dn = f[0] === 10 || f.length === 2; return { done: dn, reset: dn }; }
    if (f.length === 1) return { done: false, reset: f[0] === 10 };
    if (f.length === 2) {
      if (f[0] === 10) return { done: false, reset: f[1] === 10 };
      if (f[0] + f[1] === 10) return { done: false, reset: true };
      return { done: true, reset: true };
    }
    return { done: true, reset: true };
  }
  /* Chẻ đôi (split): ki số 1 đã đổ, các ki còn đứng tách thành hai nhóm không kề nhau */
  function isSplit(pins) {
    var up = pins.filter(function (p) { return p.st === 0; });
    if (up.length < 2 || pins[0].st === 0) return false;
    var seen = [up[0]], q = [up[0]];
    while (q.length) {
      var a = q.pop();
      up.forEach(function (b) {
        if (seen.indexOf(b) < 0 && Math.hypot(a.x - b.x, a.z - b.z) < 0.34) { seen.push(b); q.push(b); }
      });
    }
    return seen.length < up.length;
  }

  root.BW = { FRAMES: FRAMES, rack: rack, Sim: Sim, totals: totals, marks: marks, after: after, isSplit: isSplit,
    LANE: LANE, GUT: GUT, HEAD: HEAD, DECK: DECK, PIT: PIT, BALL_R: BALL_R, PIN_R: PIN_R, PIN_LEN: PIN_LEN };
})(typeof window !== 'undefined' ? window : globalThis);
