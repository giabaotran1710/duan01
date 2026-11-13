// Máy giải kiểm màn cho game Mèo đêm đột nhập (game/meodem.html).
// Chạy: node tool/meodem-solver.js [số hầm nhập môn 1-10]   hoặc   node tool/meodem-solver.js gen 11 40
// Tìm đường nhanh nhất tới rương (và nhanh nhất khi nhặt đủ ngọc) bằng tìm kiếm theo lớp thời gian:
// mỗi 0,05 giây được chọn chạm hay không chạm, gộp các trạng thái giống nhau trong cùng một thời điểm.
'use strict';
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(process.env.SRC || path.join(__dirname, '..', 'game', 'meodem.html'), 'utf8');
const pick = (a, b) => { const i = src.indexOf(a), j = src.indexOf(b); if (i < 0 || j < 0) throw new Error('Không thấy ' + a); return src.slice(i, j); };
const MD = new Function(pick('/*CORE-START*/', '/*CORE-END*/') + '; return MD;')();
const LEVELS = new Function(pick('/*LEVELS-START*/', '/*LEVELS-END*/') + '; return LEVELS;')();

if (process.env.NOAIR) MD.P.airJumps = 0; // chứng minh hầm qua được kể cả khi không dùng cú nhảy trên không
const DT = 1 / 120, SUB = 6, MAXT = +process.env.MAXT || 45;

function bitCount(n) { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; }
function clone(S) { return MD.cloneRun(S); }
function keyOf(S) {
  let k = Math.round(S.x / 3) + ',' + Math.round(S.y / 3) + ',' + Math.round(S.vy / 60) + ',' + S.dir + (S.gr ? 'g' : '') + (S.wall ? 'w' : '') + (S.buf > 0 ? 'b' : '') + S.aj + ',' + S.gm + (S.key ? 'k' : '');
  // Gạch mục chỉ tính số viên đang sụp (gộp thô cho nhanh; đường tìm được vẫn được mô phỏng chính xác)
  let gone = 0; for (const c in S.cr) if (S.t - S.cr[c] >= MD.P.crumbleDelay) gone++;
  k += ';' + gone + MD.trapKey(S);
  return k;
}

// Trả về { first, all }: đường nhanh nhất tới rương và đường nhanh nhất khi đã nhặt đủ ngọc.
function solve(L) {
  const all = (1 << L.gems.length) - 1;
  const res = { first: null, all: null };
  let front = [{ S: MD.newRun(L), p: -1, a: 0 }];
  const hist = [];
  for (let layer = 0; layer * SUB * DT < MAXT; layer++) {
    hist.push(front.map(n => [n.p, n.a]));
    const next = [], seen = new Map();
    for (let i = 0; i < front.length; i++) {
      const F = front[i].S;
      // Chỉ thử chạm khi chạm có tác dụng ngay (đang trên đất, vừa rời mép hoặc đang bám tường)
      for (const a of (F.gr || F.coy > 0 || F.wall || F.aj > 0) ? [0, 1] : [0]) {
        const S = clone(F);
        for (let k = 0; k < SUB; k++) { MD.step(L, S, DT, a && k === 0); if (S.dead || S.won) break; }
        if (S.dead) continue;
        if (S.won) {
          const moves = [a]; let li = layer, p = i;
          while (li > 0) { const [pp, aa] = hist[li][p]; moves.push(aa); p = pp; li--; }
          const r = { t: S.t, taps: moves.reverse() };
          if (!res.first) res.first = r;
          if (S.gm === all && !res.all) res.all = r;
          if (res.all) return res;
          continue;
        }
        const k = keyOf(S);
        if (seen.has(k)) continue;
        seen.set(k, 1);
        next.push({ S, p: i, a });
      }
    }
    if (!next.length) return res;
    const CAPN = +process.env.CAP || 15000;
    if (next.length > CAPN) {
      // Quá nhiều trạng thái: giữ những trạng thái đã có chìa và nhiều ngọc trước
      const sc = n => (n.S.key ? 1000 : 0) + bitCount(n.S.gm) * 10;
      next.sort((a, b) => sc(b) - sc(a));
      next.length = CAPN;
    }
    front = next;
  }
  return res;
}

// node tool/meodem-solver.js gen 11 40  -> dựng thử các hầm vô hạn (giống trong game) và in thời gian
if (process.argv[2] === 'gen') {
  const a = +process.argv[3] || 11, b = +process.argv[4] || a;
  for (let n = a; n <= b; n++) {
    const t0 = Date.now(), r = MD.gen(n);
    console.log(`Hầm ${n}: ${r ? `"${r.name}" nhanh nhất ${r.best.toFixed(2)}s, mốc ${r.par}s, thử ${r.tries} bản` : 'KHÔNG DỰNG ĐƯỢC'} [${Date.now() - t0}ms]`);
    if (process.env.SHOW && r) console.log(r.map.join('\n'));
  }
  process.exit(0);
}
const only = +process.argv[2] || 0;
LEVELS.forEach((lv, i) => {
  if (only && only !== i + 1) return;
  const L = MD.parse(lv.map);
  const err = MD.validate(L);
  const t0 = Date.now();
  const { first: a, all: b } = solve(L);
  const f = r => r ? r.t.toFixed(2) + 's (' + r.taps.filter(x => x).length + ' chạm)' : 'KHÔNG GIẢI ĐƯỢC';
  console.log(`Màn ${i + 1} "${lv.name}": nhanh nhất ${f(a)} · đủ ${L.gems.length} ngọc ${f(b)} · mốc sao ${lv.par}s ${err.length ? '· LỖI ' + err.join(' ') : ''} [${Date.now() - t0}ms]`);
  if (process.env.TAPS && b) console.log('TAPS ' + JSON.stringify(b.taps));
  if (process.env.TRACE && (b || a)) {
    const S = MD.newRun(L), taps = (b || a).taps;
    for (let j = 0; j < taps.length && !S.won; j++) for (let k = 0; k < SUB; k++) {
      MD.step(L, S, DT, taps[j] && k === 0);
      const ev = S.ev.filter(e => e !== 'land' && e !== 'crack');
      if (S.won) break;
      if (ev.length) console.log('  ' + S.t.toFixed(2) + 's ô (' + Math.floor((S.x + 9) / MD.T) + ',' + Math.floor((S.y + 13) / MD.T) + ') ' + ev.join(','));
    }
  }
});
