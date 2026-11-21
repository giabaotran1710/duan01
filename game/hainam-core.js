// Hái nấm: luật, sinh màn theo ngày và máy giải.
// Dùng chung cho game/hainam.html và tool/hainam-check.js (chạy được bằng node).
(function (root) {
  'use strict';

  const GEN_VER = 1;
  const COLORS = ['do', 'nau', 'vang', 'trang', 'tim'];
  const COLOR_NAME = { do: 'đỏ', nau: 'nâu', vang: 'vàng', trang: 'trắng', tim: 'tím' };
  const SHAPES = ['tron', 'nhon', 'det'];
  const SHAPE_NAME = { tron: 'tròn', nhon: 'nhọn', det: 'dẹt' };
  const ZONES = ['go', 'reu', 'la', 'suoi', 'goc'];
  const ZONE_NAME = { go: 'khúc gỗ mục', reu: 'bãi rêu', la: 'đám lá khô', suoi: 'bờ suối', goc: 'gốc sồi' };
  const POISON_KINDS = ['doc', 'chi', 'tru'];

  // ---------- ngẫu nhiên có hạt giống: cùng một ngày luôn ra cùng một khu rừng ----------
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  function shuffle(r, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  // ---------- đặc điểm ----------
  // m = { c: màu mũ, s: có đốm, h: dáng mũ, r: có vòng cổ, z: 1 to / 0 nhỏ, zone, cl: chỉ số bụi }
  const matchOne = (m, p) => m[p.k] === p.v;
  const matchAll = (m, ps) => ps.every(p => matchOne(m, p));

  // Ghép mô tả: "nấm nhỏ mũ đỏ nhọn có đốm có vòng cổ"
  function describe(ps, short) {
    const g = {};
    ps.forEach(p => { g[p.k] = p.v; });
    const cap = [];
    if (g.c !== undefined) cap.push(COLOR_NAME[g.c]);
    if (g.h !== undefined) cap.push(SHAPE_NAME[g.h]);
    if (g.s === false) cap.push('trơn');
    const out = [];
    if (g.z !== undefined) out.push(short && !cap.length && g.s !== true && g.r === undefined ? (g.z ? 'cây to' : 'cây nhỏ') : (g.z ? 'to' : 'nhỏ'));
    if (cap.length) out.push('mũ ' + cap.join(' '));
    if (g.s === true) out.push('có đốm');
    if (g.r !== undefined) out.push(g.r ? 'có vòng cổ' : 'không có vòng cổ');
    return out.join(' ');
  }

  function ruleText(rule, zoneCount) {
    switch (rule.t) {
      case 'doc': return 'Nấm ' + describe(rule.p) + ' là nấm độc.';
      case 'chi': return 'Chỉ nấm ' + describe(rule.p) + ' là ăn được, còn lại đều độc.';
      case 'tru': return 'Nấm ' + describe(rule.p) + ' là nấm độc, trừ khi ' + describe(rule.q, true) + '.';
      case 'non': return 'Không hái nấm nhỏ, để chúng lớn tiếp.';
      case 'vung': return 'Chỉ hái ở ' + ZONE_NAME[rule.z] + '.';
      case 'cam': return 'Không hái ở ' + ZONE_NAME[rule.z] + '.';
      case 'lay': return 'Nấm mọc chung bụi với nấm độc cũng nhiễm độc.';
      case 'gioi': return 'Mỗi màu mũ chỉ hái tối đa ' + rule.k + ' cây.';
      case 'chua': return 'Bụi nào cũng phải chừa lại ít nhất một cây. Nấm mọc lẻ cũng là một bụi.';
      case 'dau': return 'Cây đầu tiên bỏ vào giỏ phải là nấm ' + describe(rule.p) + '.';
      case 'xen': return 'Không bỏ hai cây cùng màu mũ liền nhau vào giỏ.';
    }
    return '';
  }
  // Nhóm luật để vẽ biểu tượng trong sổ tay
  const RULE_GROUP = { doc: 'doc', chi: 'an', tru: 'doc', non: 'cam', vung: 'vung', cam: 'vung', lay: 'doc', gioi: 'gio', chua: 'gio', dau: 'gio', xen: 'gio' };

  // ---------- kiểm luật ----------
  function basePoisonBy(rule, m) {
    if (rule.t === 'doc') return matchAll(m, rule.p);
    if (rule.t === 'chi') return !matchAll(m, rule.p);
    if (rule.t === 'tru') return matchAll(m, rule.p) && !matchAll(m, rule.q);
    return false;
  }
  function basePoison(lv, m) { return lv.rules.some(r => basePoisonBy(r, m)); }

  // Luật tĩnh đầu tiên mà cây i phạm (chỉ số trong lv.rules), -1 nếu không phạm
  function staticBreak(lv, i) {
    const m = lv.ms[i];
    for (let k = 0; k < lv.rules.length; k++) {
      const r = lv.rules[k];
      if (basePoisonBy(r, m)) return k;
      if (r.t === 'non' && m.z === 0) return k;
      if (r.t === 'vung' && m.zone !== r.z) return k;
      if (r.t === 'cam' && m.zone === r.z) return k;
      if (r.t === 'lay' && lv.ms.some((o, j) => j !== i && o.cl === m.cl && basePoison(lv, o))) return k;
    }
    return -1;
  }
  // Luật động (phụ thuộc thứ tự hái) mà việc hái cây i lúc này phạm
  function dynamicBreak(lv, i, picked, seq) {
    const m = lv.ms[i];
    for (let k = 0; k < lv.rules.length; k++) {
      const r = lv.rules[k];
      if (r.t === 'gioi' && seq.filter(j => lv.ms[j].c === m.c).length >= r.k) return k;
      if (r.t === 'chua') {
        const left = lv.ms.filter((o, j) => o.cl === m.cl && j !== i && !picked[j]).length;
        if (left === 0) return k;
      }
      if (r.t === 'dau' && seq.length === 0 && !matchAll(m, r.p)) return k;
      if (r.t === 'xen' && seq.length && lv.ms[seq[seq.length - 1]].c === m.c) return k;
    }
    return -1;
  }

  // ---------- máy giải: hái được tối đa bao nhiêu cây kể từ trạng thái hiện tại ----------
  function maxPick(lv, picked, seq) {
    const valid = [];
    lv.ms.forEach((_, i) => { if (!picked[i] && staticBreak(lv, i) < 0) valid.push(i); });
    const seen = new Set();
    let best = 0;
    const p = picked.slice(), s = seq.slice();
    const goal = valid.length;
    (function dfs(mask, depth) {
      if (depth > best) best = depth;
      if (best === goal) return;
      const key = mask + ':' + (s.length ? lv.ms[s[s.length - 1]].c : '') + ':' + s.length;
      if (seen.has(key)) return;
      seen.add(key);
      for (let b = 0; b < valid.length; b++) {
        if (mask & (1 << b)) continue;
        const i = valid[b];
        if (dynamicBreak(lv, i, p, s) >= 0) continue;
        p[i] = true; s.push(i);
        dfs(mask | (1 << b), depth + 1);
        p[i] = false; s.pop();
        if (best === goal) return;
      }
    })(0, 0);
    return best;
  }

  // ---------- lịch luật theo ngày ----------
  // 10 ngày đầu giới thiệu từng loại luật; từ ngày 11 trộn ngẫu nhiên, càng về sau càng nhiều luật
  const SCHEDULE = [
    ['doc'], ['chi'], ['doc', 'vung'], ['tru', 'cam'], ['doc', 'lay'],
    ['doc', 'gioi'], ['chi', 'chua'], ['doc', 'non', 'dau'], ['doc', 'xen', 'cam'], ['tru', 'lay', 'vung'],
  ];
  function kindsFor(d, r) {
    if (d <= SCHEDULE.length) return SCHEDULE[d - 1].slice();
    const total = Math.min(5, 3 + (d >= 18 ? 1 : 0) + (d >= 30 ? 1 : 0));
    const kinds = [pick(r, POISON_KINDS)];
    const pool = ['doc', 'tru', 'chi', 'non', 'vung', 'cam', 'lay', 'gioi', 'chua', 'dau', 'xen', 'lay', 'xen', 'gioi'];
    let guard = 0;
    while (kinds.length < total && guard++ < 100) {
      const k = pick(r, pool);
      if (k !== 'doc' && kinds.includes(k)) continue;
      if (k === 'chi' && kinds.includes('chi')) continue;
      if ((k === 'vung' && kinds.includes('cam')) || (k === 'cam' && kinds.includes('vung'))) continue;
      if (k === 'lay' && !kinds.some(x => POISON_KINDS.includes(x))) continue;
      kinds.push(k);
    }
    // luật độc đứng trước để "nấm độc" trong luật lây có nghĩa rõ ràng
    const order = { doc: 0, chi: 0, tru: 0, lay: 1, non: 2, vung: 2, cam: 2, gioi: 3, chua: 3, dau: 3, xen: 3 };
    return kinds.sort((a, b) => order[a] - order[b]);
  }

  function randPred(r, allowZ) {
    const ks = allowZ ? ['c', 'c', 's', 'h', 'r', 'z'] : ['c', 'c', 's', 'h', 'r'];
    const k = pick(r, ks);
    if (k === 'c') return { k, v: pick(r, COLORS) };
    if (k === 'h') return { k, v: pick(r, SHAPES) };
    if (k === 'z') return { k, v: r() < 0.5 ? 1 : 0 };
    return { k, v: r() < 0.5 };
  }
  function predsFor(r, d, n) {
    const a = randPred(r, false);
    if (n < 2) return [a];
    let b; do { b = randPred(r, true); } while (b.k === a.k);
    return [a, b];
  }

  function makeRules(r, d, kinds, zones) {
    return kinds.map(t => {
      const pair = d >= 12 && r() < Math.min(0.6, 0.15 + d * 0.015);
      if (t === 'doc') return { t, p: predsFor(r, d, pair ? 2 : 1) };
      if (t === 'chi') {
        // một đặc điểm hay gặp để còn đủ nấm ăn được
        const k = pick(r, ['s', 'r', 'h', 'r']);
        return { t, p: [k === 'h' ? { k, v: pick(r, SHAPES) } : { k, v: r() < 0.5 }] };
      }
      if (t === 'tru') {
        const p = predsFor(r, d, 1);
        let q; do { q = randPred(r, true); } while (q.k === p[0].k);
        return { t, p, q: [q] };
      }
      if (t === 'vung' || t === 'cam') return { t, z: pick(r, zones) };
      if (t === 'gioi') return { t, k: r() < 0.6 ? 2 : 1 };
      if (t === 'dau') return { t, p: [pick(r, [{ k: 'c', v: pick(r, COLORS) }, { k: 'h', v: pick(r, SHAPES) }, { k: 'r', v: true }, { k: 's', v: true }])] };
      return { t };
    });
  }

  // ---------- bố cục rừng (khung nhìn 360 × 460) ----------
  const W = 360, H = 460;
  function zoneRects(count) {
    if (count === 4) return [[10, 12, 166, 212], [184, 12, 166, 212], [10, 236, 166, 212], [184, 236, 166, 212]];
    return [[10, 12, 166, 212], [184, 12, 166, 212], [10, 236, 340, 212]];
  }
  function anchorsOf(rect) {
    const [x, y, w, h] = rect;
    const rows = [y + 92, y + 190];
    if (w > 200) return [[x + w * 0.25, rows[0]], [x + w * 0.73, rows[0]], [x + w * 0.27, rows[1]], [x + w * 0.75, rows[1]]];
    return [[x + w * 0.5, rows[0]], [x + w * 0.5, rows[1]]];
  }
  const OFFS = { 1: [[0, 0]], 2: [[-23, 4], [23, -4]], 3: [[-39, 6], [0, -6], [39, 6]] };

  function attempt(d, r) {
    const n = Math.min(18, 6 + d);
    const zoneCount = d >= 6 ? 4 : 3;
    const zones = shuffle(r, ZONES.slice()).slice(0, zoneCount);
    const kinds = kindsFor(d, r);
    const rules = makeRules(r, d, kinds, zones);
    const rects = zoneRects(zoneCount);
    const anchors = [];
    rects.forEach((rc, zi) => anchorsOf(rc).forEach(a => anchors.push({ x: a[0], y: a[1], zone: zones[zi] })));
    const C = Math.max(3, Math.min(anchors.length, Math.ceil(n / 2.1)));
    // mỗi khu có ít nhất một bụi, phần còn lại rải ngẫu nhiên
    const pool = shuffle(r, anchors.slice()), used = [];
    zones.forEach(z => { const k = pool.findIndex(a => a.zone === z); used.push(pool.splice(k, 1)[0]); });
    while (used.length < C) used.push(pool.shift());
    const sizes = new Array(C).fill(1);
    let left = n - C;
    while (left > 0) { const k = Math.floor(r() * C); if (sizes[k] < 3) { sizes[k]++; left--; } }
    const ms = [];
    used.forEach((a, ci) => {
      const jx = (r() - 0.5) * (sizes[ci] === 3 ? 4 : sizes[ci] === 2 ? 20 : 40), jy = (r() - 0.5) * 10;
      OFFS[sizes[ci]].forEach(o => {
        ms.push({
          c: pick(r, COLORS), s: r() < 0.45, h: pick(r, SHAPES), r: r() < 0.5, z: r() < 0.7 ? 1 : 0,
          zone: a.zone, cl: ci, x: Math.round(a.x + o[0] + jx), y: Math.round(a.y + o[1] + jy),
        });
      });
    });
    // luật đầu tiên phải hái được: đặt sẵn vài cây khớp
    return { day: d, rules, ms, zones, rects, W, H, kinds };
  }

  function check(lv, relax) {
    const n = lv.ms.length;
    const breaks = lv.ms.map((_, i) => staticBreak(lv, i));
    const valid = breaks.filter(b => b < 0).length;
    if (valid < 3 || n - valid < 2) return false;
    if (valid > Math.ceil(n * 0.7)) return false;
    // luật tĩnh nào cũng phải là lý do duy nhất loại ít nhất một cây
    for (let k = 0; k < lv.rules.length; k++) {
      const t = lv.rules[k].t;
      if (['gioi', 'chua', 'dau', 'xen'].includes(t)) continue;
      const only = lv.ms.some((m, i) => {
        if (breaks[i] < 0) return false;
        const others = { ...lv, rules: lv.rules.filter((_, j) => j !== k) };
        return staticBreak(others, i) < 0;
      });
      if (!only) return false;
    }
    const V = lv.ms.map((_, i) => i).filter(i => breaks[i] < 0);
    for (const r of lv.rules) {
      if (r.t === 'gioi' && !COLORS.some(c => V.filter(i => lv.ms[i].c === c).length > r.k)) return false;
      if (r.t === 'chua' && !lv.ms.some((m, i) => lv.ms.every((o, j) => o.cl !== m.cl || breaks[j] < 0))) return false;
      if (r.t === 'dau' && !(V.some(i => matchAll(lv.ms[i], r.p)) && V.some(i => !matchAll(lv.ms[i], r.p)))) return false;
      if (r.t === 'xen' && !COLORS.some(c => V.filter(i => lv.ms[i].c === c).length >= 2)) return false;
    }
    // "trừ khi" phải cứu được ít nhất một cây
    for (const r of lv.rules) if (r.t === 'tru' && !lv.ms.some(m => matchAll(m, r.p) && matchAll(m, r.q))) return false;
    const M = maxPick(lv, new Array(n).fill(false), []);
    if (M < Math.max(3, Math.min(5, 3 + Math.floor(lv.day / 8)) - (relax ? 2 : 0) - (lv.kinds.includes('vung') ? 1 : 0))) return false;
    lv.quota = M;
    return true;
  }

  const cache = {};
  function level(d) {
    d = Math.max(1, Math.floor(d));
    if (cache[d]) return cache[d];
    const r = rng(d * 7919 + GEN_VER * 104729);
    let lv = null;
    for (let t = 0; t < 4000; t++) {
      const cand = attempt(d, r);
      if (check(cand, t > 2500)) { lv = cand; break; }
    }
    if (!lv) throw new Error('Không dựng được ngày ' + d);
    // đánh dấu luật mới lần đầu xuất hiện
    const seenBefore = new Set();
    for (let k = 0; k < Math.min(d - 1, SCHEDULE.length); k++) SCHEDULE[k].forEach(x => seenBefore.add(x));
    lv.rules.forEach(rl => { rl.isNew = d <= SCHEDULE.length && !seenBefore.has(rl.t); });
    return (cache[d] = lv);
  }

  const api = { GEN_VER, COLORS, COLOR_NAME, SHAPES, SHAPE_NAME, ZONES, ZONE_NAME, RULE_GROUP, level, ruleText, staticBreak, dynamicBreak, maxPick, basePoison, describe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.HaiNam = api;
})(typeof window !== 'undefined' ? window : globalThis);
