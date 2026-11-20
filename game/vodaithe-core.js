/* Võ đài thẻ: bộ luật (không đụng DOM, tất định theo hạt giống, chạy được cả trong trình duyệt lẫn Node).
 *
 * Chiến trường có 5 làn: Núi, ba làn Đồng bằng, Biển.
 * Mỗi vòng có một bên TẤN CÔNG và một bên PHÒNG THỦ, đổi vai sau mỗi vòng. Một vòng có 4 giai đoạn:
 * Quân lệnh cộng dồn: mỗi vòng nhận đúng bằng số vòng, phần chưa dùng giữ lại (không có trần). Tay đầu 5 lá giống nhau cho hai bên; sau mỗi Khai chiến mỗi bên rút 1 lá.
 *   1. Bên tấn công chỉ ra Lính.
 *   2. Bên phòng thủ ra Lính và Mưu (Mưu đặt úp).
 *   3. Bên tấn công ra Mưu (úp).
 *   4. Khai chiến: lật Mưu (Phản kế trước, rồi Mưu bên phòng thủ, rồi bên tấn công), các làn giao chiến.
 * Lính sống sót ở lại sân sang vòng sau. Thành 20 máu; phá Thành đối thủ trước là thắng, 10 vòng chưa phân thắng bại thì ai còn nhiều máu hơn thắng.
 *
 * Trạng thái là object thuần (JSON được):
 *   lanes[làn][bên] = mảng Lính theo thứ tự đặt (mỗi làn mỗi bên 2 ô, Tượng binh chiếm cả 2)
 *   traps[bên]      = Mưu úp { id, k, lane }
 */
(function (root) {
  'use strict';

  const LANES = 5, SLOTS = 2, MAX_HAND = 8, MAX_ROUND = 10, START_HP = 20, START_HAND = 5, DRAW = 1, TRAPS_MAX = 2;
  const LANE_NAMES = ['Núi', 'Đồng bằng', 'Đồng bằng', 'Đồng bằng', 'Biển'];

  // a = Công, h = Máu, c = giá (Quân lệnh), sz = số ô chiếm
  const CARDS = {
    danbinh:   { t: 'unit', n: 'Dân binh',  c: 1, a: 1, h: 2, sz: 1, txt: 'Rẻ, đông.' },
    cungthu:   { t: 'unit', n: 'Cung thủ',  c: 2, a: 2, h: 1, sz: 1, fs: 1, txt: 'Đánh trước: hạ đối diện trước khi nó kịp đánh.' },
    khienthu:  { t: 'unit', n: 'Khiên thủ', c: 2, a: 1, h: 4, sz: 1, shield: 1, txt: 'Mỗi đòn trúng nó giảm 1 sát thương.' },
    kybinh:    { t: 'unit', n: 'Kỵ binh',   c: 3, a: 3, h: 3, sz: 1, charge: 2, txt: '+2 Công khi ở bên tấn công.' },
    thambao:   { t: 'unit', n: 'Thám báo',  c: 2, a: 1, h: 2, sz: 1, scout: 1, txt: 'Khi đặt ra: xem 1 lá ngẫu nhiên trên tay đối thủ.' },
    tuongbinh: { t: 'unit', n: 'Tượng binh', c: 5, a: 5, h: 6, sz: 2, txt: 'Chiếm cả 2 ô của làn.' },
    phuckich:  { t: 'trick', n: 'Phục kích',  c: 2, txt: 'Lính đầu tiên của mình ở làn này được +3 Công vòng này.' },
    hochong:   { t: 'trick', n: 'Hố chông',   c: 1, txt: 'Lính địch đầu tiên ở làn này mất 2 máu trước giao chiến.' },
    rutquan:   { t: 'trick', n: 'Rút quân',   c: 1, txt: 'Rút Lính đầu tiên của mình ở làn này về tay, nó không giao chiến.' },
    dieuho:    { t: 'trick', n: 'Điệu hổ ly sơn', c: 2, txt: 'Chuyển Lính địch đầu tiên ở làn này sang làn khác còn chỗ.' },
    hoacong:   { t: 'trick', n: 'Hoả công',   c: 3, txt: '2 sát thương cho mọi Lính ở làn này, cả hai bên.' },
    phanke:    { t: 'trick', n: 'Phản kế',    c: 2, txt: 'Khi Khai chiến, huỷ 1 Mưu của đối thủ (lá đặt sớm nhất) trước khi lật.' },
    nghibinh:  { t: 'trick', n: 'Nghi binh',  c: 0, txt: 'Không làm gì, chỉ để đánh lừa.' },
    tangvien:  { t: 'trick', n: 'Tăng viện',  c: 2, txt: 'Thêm 1 Dân binh vào làn này nếu còn chỗ.' }
  };
  const DECK_LIST = [].concat(
    ['danbinh', 'danbinh', 'danbinh', 'danbinh', 'cungthu', 'cungthu', 'cungthu', 'khienthu', 'khienthu', 'kybinh', 'kybinh', 'thambao', 'thambao', 'tuongbinh'],
    ['phuckich', 'phuckich', 'hochong', 'rutquan', 'dieuho', 'hoacong', 'phanke', 'phanke', 'nghibinh', 'tangvien']);

  function rnd(s) {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    let t = Math.imul(s.seed ^ (s.seed >>> 15), 1 | s.seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function shuffle(s, a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd(s) * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  const clone = s => JSON.parse(JSON.stringify(s));
  const other = p => 1 - p;

  function newGame(seed) {
    const s = {
      seed: (seed >>> 0) || 1, uid: 1, round: 1, hp: [START_HP, START_HP], hand: [[], []], deck: [[], []], disc: [[], []],
      lanes: [], traps: [[], []], orders: [0, 0], atk: 0, phase: 1, turn: 0, known: [[], []], winner: null, why: '', log: []
    };
    for (let l = 0; l < LANES; l++) s.lanes.push([[], []]);
    // Tay đầu: 5 lá ngẫu nhiên nhưng GIỐNG HỆT nhau cho hai bên (công bằng). Luôn có ít nhất 1 Dân binh để vòng 1 (1 Quân lệnh) có nước đi.
    const first = shuffle(s, DECK_LIST.slice());
    let start = first.slice(0, START_HAND);
    if (start.indexOf('danbinh') < 0) start[0] = 'danbinh';
    const rest = DECK_LIST.slice();
    for (const k of start) rest.splice(rest.indexOf(k), 1);
    for (let p = 0; p < 2; p++) {
      s.hand[p] = start.map(k => ({ id: s.uid++, k }));
      s.deck[p] = shuffle(s, rest.map(k => ({ id: s.uid++, k })));
    }
    startRound(s);
    return s;
  }

  function draw(s, p, n) {
    while (n > 0 && s.hand[p].length < MAX_HAND) {
      if (!s.deck[p].length) {
        if (!s.disc[p].length) return;
        s.deck[p] = shuffle(s, s.disc[p]); s.disc[p] = [];
      }
      s.hand[p].push(s.deck[p].pop()); n--;
    }
  }

  function startRound(s) {
    // Quân lệnh cộng dồn: mỗi lượt nhận đúng bằng số vòng, phần chưa dùng giữ lại.
    s.orders = [s.orders[0] + s.round, s.orders[1] + s.round];
    s.atk = s.round % 2 === 1 ? 0 : 1;
    s.phase = 1; s.turn = s.atk;
  }

  const used = units => units.reduce((n, u) => n + u.sz, 0);
  const handCard = (s, p, id) => s.hand[p].find(c => c.id === id);

  function makeUnit(s, k, owner, tok) {
    const d = CARDS[k];
    return { id: s.uid++, k, owner, hp: d.h, mh: d.h, a: d.a, sz: d.sz, bonus: 0, tok: tok ? 1 : 0 };
  }

  // Danh sách hành động hợp lệ của bên đang đến lượt.
  function legal(s) {
    const out = [];
    if (s.winner !== null) return out;
    const p = s.turn, seen = {};
    for (const c of s.hand[p]) {
      const d = CARDS[c.k];
      if (d.c > s.orders[p]) continue;
      if (d.t === 'unit') {
        if (s.phase === 3) continue;
        for (let l = 0; l < LANES; l++) {
          if (used(s.lanes[l][p]) + d.sz > SLOTS) continue;
          const key = c.k + ':' + l;
          if (seen[key]) continue; seen[key] = 1;
          out.push({ t: 'unit', id: c.id, k: c.k, lane: l });
        }
      } else {
        if (s.phase === 1 || s.traps[p].length >= TRAPS_MAX) continue;
        for (let l = 0; l < LANES; l++) {
          const key = c.k + ':' + l;
          if (seen[key]) continue; seen[key] = 1;
          out.push({ t: 'trick', id: c.id, k: c.k, lane: l });
        }
      }
    }
    out.push({ t: 'end' });
    return out;
  }

  function isLegal(s, a) {
    return legal(s).some(x => x.t === a.t && x.id === a.id && x.lane === a.lane);
  }

  // Áp một hành động. Trả về true nếu hợp lệ. Giai đoạn 3 kết thúc thì tự Khai chiến.
  function apply(s, a) {
    if (s.winner !== null) return false;
    if (!isLegal(s, a)) return false;
    const p = s.turn;
    if (a.t === 'end') {
      if (s.phase === 1) { s.phase = 2; s.turn = other(s.atk); }
      else if (s.phase === 2) { s.phase = 3; s.turn = s.atk; }
      else resolve(s);
      return true;
    }
    const i = s.hand[p].findIndex(c => c.id === a.id);
    const card = s.hand[p][i], d = CARDS[card.k];
    s.hand[p].splice(i, 1);
    s.orders[p] -= d.c;
    // Lá đã bị lộ (Thám báo) thì thôi coi là lộ.
    s.known[other(p)] = s.known[other(p)].filter(x => x !== card.id);
    if (a.t === 'unit') {
      const u = makeUnit(s, card.k, p, false); u.card = card;
      s.lanes[a.lane][p].push(u);
      s.log.push({ e: 'unit', p, k: card.k, lane: a.lane });
      if (d.scout && s.hand[other(p)].length) {
        const cand = s.hand[other(p)].filter(c => s.known[p].indexOf(c.id) < 0);
        if (cand.length) { const c = cand[Math.floor(rnd(s) * cand.length)]; s.known[p].push(c.id); s.log.push({ e: 'scout', p, id: c.id, k: c.k }); }
      }
    } else {
      s.traps[p].push({ id: card.id, k: card.k, lane: a.lane });
      s.log.push({ e: 'trick', p, lane: a.lane });
    }
    return true;
  }

  const front = (s, l, side) => s.lanes[l][side][0] || null;
  function dead(s, u) {
    if (u.tok) return;
    const c = u.card || { id: u.id, k: u.k };
    s.disc[u.owner].push({ id: c.id, k: c.k });
  }

  function resolveTrick(s, t, p) {
    const e = { e: 'flip', p, k: t.k, lane: t.lane, note: '' };
    const l = t.lane, o = other(p), mine = s.lanes[l][p], theirs = s.lanes[l][o];
    switch (t.k) {
      case 'phuckich': if (mine[0]) { mine[0].bonus += 3; e.note = mine[0].id + ''; e.uid = mine[0].id; } break;
      case 'hochong': if (theirs[0]) { theirs[0].hp -= 2; e.uid = theirs[0].id; } break;
      case 'rutquan':
        if (mine[0]) {
          const u = mine.shift(); e.uid = u.id;
          if (!u.tok) { s.hand[p].push(u.card || { id: u.id, k: u.k }); }
        } break;
      case 'dieuho':
        if (theirs[0]) {
          const u = theirs[0];
          for (let k = 0; k < LANES; k++) {
            if (k === l) continue;
            if (used(s.lanes[k][o]) + u.sz <= SLOTS) { theirs.shift(); s.lanes[k][o].push(u); e.uid = u.id; e.to = k; break; }
          }
        } break;
      case 'hoacong':
        for (const side of [0, 1]) for (const u of s.lanes[l][side]) u.hp -= 2;
        break;
      case 'tangvien':
        if (used(mine) + 1 <= SLOTS) mine.push(makeUnit(s, 'danbinh', p, true));
        break;
      default: break;
    }
    s.log.push(e);
    sweep(s);
  }

  // Dọn Lính hết máu, giữ nguyên thứ tự, ghi vào mộ.
  function sweep(s) {
    for (let l = 0; l < LANES; l++) for (const side of [0, 1]) {
      const keep = [];
      for (const u of s.lanes[l][side]) { if (u.hp > 0) keep.push(u); else { dead(s, u); s.log.push({ e: 'die', uid: u.id, k: u.k, lane: l, p: side }); } }
      s.lanes[l][side] = keep;
    }
  }

  function atkOf(s, u) {
    const d = CARDS[u.k];
    return u.a + u.bonus + (d.charge && u.owner === s.atk ? d.charge : 0);
  }

  function resolveCombat(s) {
    const castle = [0, 0];
    for (let l = 0; l < LANES; l++) {
      // Ô của từng Lính theo thứ tự đặt.
      const at = [[null, null], [null, null]];
      for (const side of [0, 1]) {
        let slot = 0;
        for (const u of s.lanes[l][side]) { for (let z = 0; z < u.sz; z++) at[side][slot + z] = u; slot += u.sz; }
      }
      const events = [];
      for (const side of [0, 1]) {
        for (const u of s.lanes[l][side]) {
          const slot = at[side].indexOf(u);
          const foe = at[other(side)][slot] || (u.sz === 2 ? at[other(side)][slot + 1] : null) || null;
          let dmg = atkOf(s, u);
          if (!foe) dmg = side === s.atk ? dmg : Math.floor(dmg / 2);
          events.push({ u, foe, side, dmg });
        }
      }
      const run = list => {
        const hits = [];
        for (const ev of list) {
          if (ev.u.hp <= 0) continue; // chết ở đợt trước thì không đánh nữa
          hits.push(ev);
        }
        for (const ev of hits) {
          if (ev.foe) {
            const d = ev.foe.k && CARDS[ev.foe.k].shield ? Math.max(0, ev.dmg - 1) : ev.dmg;
            ev.foe.hp -= d;
            s.log.push({ e: 'hit', lane: l, from: ev.u.id, to: ev.foe.id, dmg: d, p: ev.side });
          } else if (ev.dmg > 0) {
            castle[other(ev.side)] += ev.dmg;
            s.log.push({ e: 'castle', lane: l, from: ev.u.id, dmg: ev.dmg, p: ev.side, target: other(ev.side) });
          }
        }
      };
      // Mục tiêu đã chọn từ đầu; Đánh trước ra đòn riêng, kẻ bị hạ không đánh trả.
      run(events.filter(ev => CARDS[ev.u.k].fs));
      run(events.filter(ev => !CARDS[ev.u.k].fs));
    }
    s.hp[0] -= castle[0]; s.hp[1] -= castle[1];
    sweep(s);
  }

  function resolve(s) {
    s.log.push({ e: 'war', round: s.round });
    const a = s.atk, d = other(a);
    // 1. Phản kế: mỗi lá huỷ Mưu sớm nhất còn lại của đối thủ (không tính Phản kế).
    const order = [d, a];
    const cancelled = {};
    for (const p of order) {
      for (const t of s.traps[p]) {
        if (t.k !== 'phanke' || cancelled[t.id]) continue;
        const target = s.traps[other(p)].find(x => x.k !== 'phanke' && !cancelled[x.id]);
        s.log.push({ e: 'flip', p, k: 'phanke', lane: t.lane, cancels: target ? target.id : 0 });
        if (target) { cancelled[target.id] = 1; s.log.push({ e: 'cancel', p: other(p), k: target.k, lane: target.lane }); }
      }
    }
    // 2. Các Mưu còn lại: bên phòng thủ lật trước.
    for (const p of order) for (const t of s.traps[p]) {
      if (t.k === 'phanke' || cancelled[t.id]) continue;
      resolveTrick(s, t, p);
    }
    // 3. Giao chiến.
    resolveCombat(s);
    // 4. Dọn bàn.
    for (const p of [0, 1]) { for (const t of s.traps[p]) s.disc[p].push({ id: t.id, k: t.k }); s.traps[p] = []; }
    for (let l = 0; l < LANES; l++) for (const side of [0, 1]) for (const u of s.lanes[l][side]) u.bonus = 0;
    const h0 = s.hp[0], h1 = s.hp[1];
    if (h0 <= 0 || h1 <= 0) {
      s.winner = h0 > h1 ? 0 : h1 > h0 ? 1 : d; s.why = 'Thành sụp';
      return;
    }
    if (s.round >= MAX_ROUND) {
      const cnt = p => s.lanes.reduce((n, l) => n + l[p].length, 0);
      s.winner = h0 > h1 ? 0 : h1 > h0 ? 1 : cnt(0) > cnt(1) ? 0 : cnt(1) > cnt(0) ? 1 : 1;
      s.why = 'Hết ' + MAX_ROUND + ' vòng';
      return;
    }
    s.round++;
    draw(s, 0, DRAW); draw(s, 1, DRAW);
    startRound(s);
  }

  // Góc nhìn của một bên: giấu tay bài và Mưu úp của đối thủ (trừ lá đã lộ nhờ Thám báo).
  function viewFor(s, p) {
    const v = clone(s), o = other(p);
    v.hand[o] = v.hand[o].map(c => s.known[p].indexOf(c.id) >= 0 ? c : { id: c.id, k: null });
    v.deck[o] = v.deck[o].map(c => ({ id: c.id, k: null }));
    v.deck[p] = v.deck[p].map(c => ({ id: c.id, k: null }));
    v.traps[o] = v.traps[o].map(t => ({ id: t.id, k: null, lane: -1 }));
    v.known[o] = [];
    v.log = [];
    return v;
  }

  const api = { LANES, SLOTS, MAX_HAND, MAX_ROUND, START_HP, LANE_NAMES, CARDS, DECK_LIST, newGame, legal, apply, clone, viewFor, rnd, shuffle, used, atkOf, resolve, other };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VDT = api;
})(typeof window !== 'undefined' ? window : globalThis);
