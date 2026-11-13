// Tia số - sinh màn ngẫu nhiên. Đi một (hoặc hai nhánh) đường tia, rải ô lời giải dọc đường,
// tính số đích từ chính lời giải, rồi cho máy giải kiểm: chỉ giữ màn mà số ô ít nhất đúng bằng lời giải
// và có ít cách giải ngắn nhất (đỡ đoán mò).
(function (root) {
  'use strict';
  const C = (typeof module !== 'undefined' && module.exports) ? require('./tiaso-core.js') : root.TiaSo;
  const DX = { R: 1, L: -1, U: 0, D: 0 }, DY = { R: 0, L: 0, U: -1, D: 1 };
  const LEFT = { R: 'U', U: 'L', L: 'D', D: 'R' }, RIGHT = { R: 'D', D: 'L', L: 'U', U: 'R' };
  const SLASH = { R: 'U', U: 'R', L: 'D', D: 'L' };

  const CFG = {
    vua:  { W: 6, H: 6, len: [7, 11], ops: 2, opsMax: 3, mirrors: [1, 2], split: 0,  decoy: 1, fixMirror: .5, maxSols: 6, minPar: 2, extra: .25, kinds: ['+', '-', '*'], maxNodes: 1e4 },
    kho:  { W: 7, H: 7, len: [9, 14], ops: 3, opsMax: 4, mirrors: [1, 3], split: .5, decoy: 2, fixMirror: .25, maxSols: 3, minPar: 4, extra: .35, kinds: ['+', '-', '*', '/', 'sq'], maxNodes: 2e4 },
    // Siêu khó: bàn 8×8, hai lần tách tia (ba đích), không gương dựng sẵn, nhiều ô gây nhiễu; trong game số trên tia bị ẩn
    skho: { W: 8, H: 8, len: [12, 18], ops: 5, opsMax: 6, mirrors: [3, 4], split: 1, split2: 1, minTargets: 3, decoy: 4, fixMirror: 0, maxSols: 2, minPar: 9, extra: .5, kinds: ['+', '-', '*', '/', 'sq', 'rev'], maxNodes: 6e4 },
    rkho: { W: 7, H: 8, len: [11, 16], ops: 4, opsMax: 5, mirrors: [2, 3], split: 1, decoy: 3, fixMirror: 0, maxSols: 2, minPar: 6, extra: .45, kinds: ['+', '-', '*', '/', 'sq', 'rev'], maxNodes: 4e4 }
  };

  function rng(seed) {
    let a = seed >>> 0 || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  // chọn một phép tính hợp lệ cho giá trị v
  function pickOp(R, v, kinds) {
    for (let k = 0; k < 20; k++) {
      const kind = kinds[(R() * kinds.length) | 0];
      let op;
      if (kind === '+') op = '+' + (1 + ((R() * 9) | 0));
      else if (kind === '-') { if (v < 2) continue; op = '-' + (1 + ((R() * Math.min(9, v - 1)) | 0)); }
      else if (kind === '*') { if (v > 60) continue; op = '*' + (2 + ((R() * 3) | 0)); }
      else if (kind === '/') { const ds = [2, 3, 4, 5].filter(d => v % d === 0 && v > d); if (!ds.length) continue; op = '/' + ds[(R() * ds.length) | 0]; }
      else if (kind === 'sq') { if (v < 2 || v > 15) continue; op = 'sq'; }
      else if (kind === 'rev') { if (v < 12 || v % 10 === 0 || String(v) === String(v).split('').reverse().join('')) continue; op = 'rev'; }
      const nv = C.apply(op, v);
      if (nv === null || nv < 1 || nv > 999 || nv === v) continue;
      return op;
    }
    return null;
  }

  function attempt(R, cfg) {
    const { W, H } = cfg;
    const grid = new Array(W * H).fill(null); // null = sàn trống; {k:'path'} | {k:'sol',t} | {k:'src'} | {k:'tgt'}
    const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
    const id = (x, y) => y * W + x;
    // đèn ở mép trái hoặc mép trên
    let sx, sy, sd;
    if (R() < .5) { sx = 0; sy = 1 + ((R() * (H - 2)) | 0); sd = 'R'; } else { sy = 0; sx = 1 + ((R() * (W - 2)) | 0); sd = 'D'; }
    const sv = (cfg === CFG.rkho || cfg === CFG.skho) ? 2 + ((R() * 11) | 0) : 1 + ((R() * 9) | 0);
    grid[id(sx, sy)] = { k: 'src', d: sd, v: sv };
    const sols = [];   // {i, t}
    const targets = [];
    const wantLen = cfg.len[0] + ((R() * (cfg.len[1] - cfg.len[0] + 1)) | 0);
    const wantMir = cfg.mirrors[0] + ((R() * (cfg.mirrors[1] - cfg.mirrors[0] + 1)) | 0);
    const doSplit = R() < cfg.split;
    let opsLeft = cfg.ops + ((R() * (cfg.opsMax - cfg.ops + 1)) | 0);

    // đi một nhánh; trả về false nếu kẹt
    function walk(x, y, d, v, len, mir, allowSplit) {
      let steps = 0, mirLeft = mir, splitAt = allowSplit ? 2 + ((R() * Math.max(1, len - 5)) | 0) : -1;
      for (;;) {
        const nx = x + DX[d], ny = y + DY[d];
        if (!inside(nx, ny) || grid[id(nx, ny)]) return false;
        x = nx; y = ny; steps++;
        const i = id(x, y);
        // có nên kết thúc?
        const ahead = (dd) => { const ax = x + DX[dd], ay = y + DY[dd]; return inside(ax, ay) && !grid[id(ax, ay)]; };
        if (steps >= len && mirLeft <= 0) { grid[i] = { k: 'tgt' }; targets.push({ i, v }); return true; }
        if (steps === splitAt && ahead(LEFT[d]) && ahead(RIGHT[d])) {
          grid[i] = { k: 'sol', t: 'split' }; sols.push({ i, t: 'split' });
          const half = Math.max(3, ((len - steps) * .7) | 0);
          const m1 = Math.ceil(mirLeft / 2), m2 = mirLeft - m1;
          const nest = !!cfg.split2 && R() < cfg.split2;
          return walk(x, y, LEFT[d], v, half, m1, nest) && walk(x, y, RIGHT[d], v, half, m2, false);
        }
        const r = R();
        const mustTurn = !ahead(d);
        if ((mustTurn || (mirLeft > 0 && r < .28)) && steps > 1) {
          const nd = R() < .5 ? LEFT[d] : RIGHT[d];
          const od = nd === LEFT[d] ? RIGHT[d] : LEFT[d];
          const use = ahead(nd) ? nd : ahead(od) ? od : null;
          if (!use) return false;
          const t = SLASH[d] === use ? '/' : '\\';
          grid[i] = { k: 'sol', t }; sols.push({ i, t, mirror: true });
          d = use; mirLeft--;
          continue;
        }
        if (mustTurn) return false;
        if (opsLeft > 0 && r < .5 && steps > 0) {
          const op = pickOp(R, v, cfg.kinds);
          if (op) { grid[i] = { k: 'sol', t: op }; sols.push({ i, t: op }); v = C.apply(op, v); opsLeft--; continue; }
        }
        grid[i] = { k: 'path' };
      }
    }
    if (!walk(sx, sy, sd, sv, wantLen, wantMir, doSplit)) return null;
    if (cfg.minTargets && targets.length < cfg.minTargets) return null;
    if (opsLeft > 0 && sols.filter(s => !s.mirror && s.t !== 'split').length < cfg.ops) return null;
    // đích phải khác số đèn
    if (targets.some(t => t.v === sv)) return null;

    // dựng map
    const fixed = new Set();
    sols.forEach(s => { if (s.mirror && R() < cfg.fixMirror) fixed.add(s.i); });
    const ch = new Array(W * H).fill(',');
    const ents = {};
    let letter = 65;
    const nextL = () => { let c; do { c = String.fromCharCode(letter++); } while ('o'.includes(c)); return c; };
    grid.forEach((g, i) => {
      if (!g) return;
      if (g.k === 'src') { const L = nextL(); ents[L] = { t: 'src', d: g.d, v: g.v }; ch[i] = L; }
      else if (g.k === 'tgt') { const L = nextL(); ents[L] = { t: 'tgt', v: targets.find(t => t.i === i).v }; ch[i] = L; }
      else if (g.k === 'sol' && fixed.has(i)) ch[i] = g.t;
      else ch[i] = '.';
    });
    // ô trống thêm quanh đường tia, và vài bức tường
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = id(x, y); if (ch[i] !== ',') continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => inside(x + a, y + b) && ch[id(x + a, y + b)] !== ',' && ch[id(x + a, y + b)] !== '#');
      if (near && R() < cfg.extra) ch[i] = '.';
      else if (!near && R() < .12) ch[i] = '#';
    }
    const tray = sols.filter(s => !fixed.has(s.i)).map(s => s.t);
    for (let k = 0; k < cfg.decoy; k++) {
      const op = pickOp(R, 2 + ((R() * 20) | 0), cfg.kinds);
      if (op) tray.push(op);
    }
    const map = [];
    for (let y = 0; y < H; y++) map.push(ch.slice(y * W, y * W + W).join(''));
    const sol = [];
    sols.forEach(x => { if (!fixed.has(x.i)) sol[x.i] = x.t; });
    return { map, ents, tray: tray.sort(), par: sols.length - fixed.size, sol };
  }

  // Sinh một màn theo độ khó và hạt giống. Trả về màn hoặc null nếu hết lượt thử.
  function generate(diff, seed, tries) {
    const cfg = CFG[diff];
    const R = rng(seed);
    for (let k = 0; k < (tries || 400); k++) {
      const lv = attempt(R, cfg);
      if (!lv) continue;
      lv.name = ''; lv.hint = '';
      if (lv.par < cfg.minPar) continue;
      let B;
      try { B = C.parse(lv); } catch (e) { continue; }
      if (diff === 'vua') {
        // màn dễ: kiểm kỹ, par đúng và ít cách giải
        const r = C.solve(B, { cap: lv.par, limit: cfg.maxSols + 1, maxNodes: cfg.maxNodes });
        if (r.cut || r.best !== lv.par || r.sols.length > cfg.maxSols) continue;
      } else {
        // màn khó: lời giải dựng sẵn bảo đảm giải được; chỉ tìm xem có cách ngắn hơn trong ngân sách nút không
        const r = C.solve(B, { cap: lv.par - 1, limit: 1, maxNodes: cfg.maxNodes });
        if (r.best >= 0) { if (r.best < 1) continue; lv.par = r.best; }
      }
      if (!C.simulate(B, lv.sol).win) continue;   // chắc chắn có lời giải
      if (lv.par < cfg.minPar) continue;
      lv.diff = diff; lv.seed = seed; lv.tries = k + 1;
      return lv;
    }
    return null;
  }

  const api = { generate, CFG };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TiaSoGen = api;
})(this);
