/* Võ đài thẻ: bộ luật (không đụng DOM, tất định theo hạt giống, chạy được cả trong trình duyệt lẫn Node).
 *
 * Chiến trường có 5 làn: Núi, ba làn Đồng bằng, Biển.
 *   - Núi: Lính có Tầm xa được +1 Công.   - Biển: chỉ Lính có Thủy mới được đặt.
 * Mỗi vòng có một bên TẤN CÔNG và một bên PHÒNG THỦ, đổi vai sau mỗi vòng. Một vòng có 4 giai đoạn:
 *   1. Bên tấn công chỉ ra Lính.
 *   2. Bên phòng thủ ra Lính và Mưu (Mưu đặt úp).
 *   3. Bên tấn công ra Mưu (úp).
 *   4. Khai chiến: Lính Ẩn lộ diện, lật Mưu (Phản kế trước, rồi bên phòng thủ, rồi bên tấn công), các làn giao chiến từ trái sang phải.
 * Tuyệt kỹ của Chủ tướng (giá 1) dùng ngay trong bất kỳ giai đoạn nào của mình.
 * Khiên Thành: mỗi đòn đánh vào Thành nạp 1 nấc; đòn làm Khiên đủ nấc thì bị chặn hẳn, Khiên về 0 và chủ Thành nhận 1 Tuyệt kỹ (tối đa 3 lần mỗi ván).
 * Quân lệnh cộng dồn: mỗi vòng nhận đúng bằng số vòng. Thành 20 máu; phá Thành đối thủ trước là thắng, 10 vòng chưa phân thắng bại thì ai còn nhiều máu hơn thắng.
 *
 * Trạng thái là object thuần (JSON được):
 *   lanes[làn][bên] = mảng Lính theo thứ tự đặt (mỗi làn mỗi bên 2 ô, Tượng binh chiếm cả 2)
 *   traps[bên]      = Mưu úp { id, k, lane }
 */
(function (root) {
  'use strict';

  const LANES = 5, SLOTS = 2, MAX_HAND = 8, MAX_ROUND = 10, START_HP = 20, START_HAND = 5, DRAW = 1, TRAPS_MAX = 2;
  const SHIELD_FULL = 4, BLOCKS_MAX = 3, NUI = 0, BIEN = 4;
  const LANE_NAMES = ['Núi', 'Đồng bằng', 'Đồng bằng', 'Đồng bằng', 'Biển'];

  // Đặc tính (tr): tên và mô tả ngắn cho giao diện.
  const TRAITS = {
    fs:     { n: 'Đánh trước', d: 'Ra đòn trước; Lính bị hạ không kịp đánh trả.' },
    giap:   { n: 'Giáp', d: 'Mỗi đòn trúng nó giảm bớt sát thương.' },
    xa:     { n: 'Tầm xa', d: 'Đứng ở Núi được +1 Công.' },
    thuy:   { n: 'Thủy', d: 'Đặt được ở làn Biển.' },
    an:     { n: 'Ẩn', d: 'Đặt úp, đối thủ không biết là ai cho tới Khai chiến.' },
    xuyen:  { n: 'Xuyên phá', d: 'Đánh Lính đối diện và cả Thành phía sau.' },
    tatsat: { n: 'Tất sát', d: 'Gây sát thương là hạ ngay Lính trúng đòn.' },
    cuong:  { n: 'Cuồng nộ', d: 'Hạ được Lính đối diện thì đánh tiếp vào Thành.' },
    song:   { n: 'Song kích', d: 'Đánh hai lần mỗi trận.' },
    tia:    { n: 'Bắn tỉa', d: 'Đánh vào Thành không làm nạp Khiên.' },
    ban:    { n: 'Bắn trước', d: 'Đầu giao chiến bắn vào Lính đối diện.' },
    charge: { n: 'Xung phong', d: 'Thêm Công khi ở bên tấn công.' },
    aura:   { n: 'Cổ vũ', d: 'Lính mình khác cùng làn +1 Công.' },
    heal:   { n: 'Cứu thương', d: 'Đầu Khai chiến hồi 2 máu cho Lính mình cùng làn.' }
  };

  // a = Công, h = Máu, c = giá (Quân lệnh), sz = số ô chiếm, tr = đặc tính
  const CARDS = {
    // --- Lính dùng chung ---
    danbinh:   { t: 'unit', n: 'Dân binh',   c: 1, a: 1, h: 2, sz: 1, tr: {}, txt: 'Rẻ, đông.' },
    cungthu:   { t: 'unit', n: 'Cung thủ',   c: 2, a: 2, h: 1, sz: 1, tr: { fs: 1, xa: 1 }, txt: '' },
    khienthu:  { t: 'unit', n: 'Khiên thủ',  c: 2, a: 1, h: 4, sz: 1, tr: { giap: 1 }, txt: '' },
    kybinh:    { t: 'unit', n: 'Kỵ binh',    c: 3, a: 3, h: 3, sz: 1, tr: { charge: 2 }, txt: '' },
    thambao:   { t: 'unit', n: 'Thám báo',   c: 2, a: 1, h: 2, sz: 1, tr: {}, scout: 1, txt: 'Khi đặt ra: xem 1 lá trên tay đối thủ.' },
    tuongbinh: { t: 'unit', n: 'Tượng binh', c: 5, a: 5, h: 6, sz: 2, tr: {}, txt: 'Chiếm cả 2 ô của làn.' },
    thuybinh:  { t: 'unit', n: 'Thủy binh',  c: 2, a: 2, h: 2, sz: 1, tr: { thuy: 1 }, txt: '' },
    songdao:   { t: 'unit', n: 'Song đao',   c: 3, a: 2, h: 3, sz: 1, tr: { song: 1 }, txt: '' },
    nothan:    { t: 'unit', n: 'Nỏ thần',    c: 4, a: 3, h: 3, sz: 1, tr: { xa: 1, xuyen: 1 }, txt: '' },
    // --- Lính đặc trưng của từng tướng ---
    hobao:     { t: 'unit', n: 'Hổ báo kỵ',  c: 4, a: 2, h: 3, sz: 1, tr: { charge: 2, cuong: 1 }, txt: '' },
    trongtran: { t: 'unit', n: 'Trống trận', c: 2, a: 0, h: 3, sz: 1, tr: { aura: 1 }, txt: '' },
    thuyenchien: { t: 'unit', n: 'Thuyền chiến', c: 4, a: 3, h: 3, sz: 1, tr: { thuy: 1, ban: 2 }, txt: '' },
    linhlan:   { t: 'unit', n: 'Lính lặn',   c: 3, a: 2, h: 2, sz: 1, tr: { thuy: 1, an: 1 }, txt: '' },
    thichkhach:{ t: 'unit', n: 'Thích khách', c: 2, a: 1, h: 2, sz: 1, tr: { an: 1, tatsat: 1 }, txt: '' },
    quany:     { t: 'unit', n: 'Quân y',     c: 3, a: 1, h: 3, sz: 1, tr: { heal: 1 }, txt: '' },
    xechan:    { t: 'unit', n: 'Xe chắn',    c: 3, a: 1, h: 7, sz: 1, tr: { giap: 1 }, txt: '' },
    // --- Mưu (đặt úp, lật khi Khai chiến) ---
    phuckich:  { t: 'trick', n: 'Phục kích',  c: 2, txt: 'Lính đầu tiên của mình ở làn này được +3 Công vòng này.' },
    hochong:   { t: 'trick', n: 'Hố chông',   c: 1, txt: 'Lính địch đầu tiên ở làn này mất 2 máu trước giao chiến.' },
    rutquan:   { t: 'trick', n: 'Rút quân',   c: 1, txt: 'Rút Lính đầu tiên của mình ở làn này về tay, nó không giao chiến.' },
    dieuho:    { t: 'trick', n: 'Điệu hổ ly sơn', c: 2, txt: 'Chuyển Lính địch đầu tiên ở làn này sang làn khác còn chỗ.' },
    hoacong:   { t: 'trick', n: 'Hoả công',   c: 3, txt: '2 sát thương cho mọi Lính ở làn này, cả hai bên.' },
    phanke:    { t: 'trick', n: 'Phản kế',    c: 2, txt: 'Khi Khai chiến, huỷ 1 Mưu của đối thủ (lá đặt sớm nhất) trước khi lật.' },
    nghibinh:  { t: 'trick', n: 'Nghi binh',  c: 0, txt: 'Không làm gì, chỉ để đánh lừa.' },
    tangvien:  { t: 'trick', n: 'Tăng viện',  c: 2, txt: 'Thêm 1 Dân binh vào làn này nếu còn chỗ.' },
    lienhoan:  { t: 'trick', n: 'Liên hoàn kế', c: 1, txt: 'Khi Khai chiến: rút 2 lá.' },
    // --- Tuyệt kỹ (dùng ngay, giá 1). need: own | foe | room | foeBien | any | global ---
    gamthet:   { t: 'sp', n: 'Gầm thét',  c: 1, need: 'own', txt: 'Lính đầu tiên của mình ở làn được +2 Công và Đánh trước vòng này.' },
    phavay:    { t: 'sp', n: 'Phá vây',   c: 1, need: 'foe', txt: '3 sát thương cho Lính địch đầu tiên ở làn.' },
    hieutrieu: { t: 'sp', n: 'Hiệu triệu', c: 1, need: 'room', txt: 'Thêm 1 Dân binh vào làn (không phải Biển).' },
    cuonghoa:  { t: 'sp', n: 'Cuồng hoá', c: 1, need: 'own', txt: 'Lính đầu tiên của mình ở làn +1 Công và có Cuồng nộ mãi mãi.' },
    songdu:    { t: 'sp', n: 'Sóng dữ',   c: 1, need: 'foe', txt: 'Đẩy Lính địch đầu tiên ở làn sang làn khác còn chỗ.' },
    suonggia:  { t: 'sp', n: 'Sương giá', c: 1, need: 'foe', txt: 'Đóng băng Lính địch đầu tiên ở làn: vòng này nó không đánh.' },
    thuytrieu: { t: 'sp', n: 'Thủy triều', c: 1, need: 'own', txt: 'Lính đầu tiên của mình ở làn +2 Công +2 Máu mãi mãi.' },
    nhanchim:  { t: 'sp', n: 'Nhấn chìm', c: 1, need: 'foeBien', txt: 'Hạ ngay Lính địch đầu tiên ở làn Biển.' },
    baybinh:   { t: 'sp', n: 'Bày binh',  c: 1, need: 'global', txt: 'Rút 2 lá.' },
    dola:      { t: 'sp', n: 'Dò la',     c: 1, need: 'global', txt: 'Lộ toàn bộ tay bài đối thủ và rút 1 lá.' },
    phake:     { t: 'sp', n: 'Phá kế',    c: 1, need: 'any', txt: 'Huỷ mọi Mưu úp của đối thủ ở làn và rút 1 lá.' },
    amtoan:    { t: 'sp', n: 'Ám toán',   c: 1, need: 'own', txt: 'Lính đầu tiên của mình ở làn có Tất sát mãi mãi.' },
    trithuong: { t: 'sp', n: 'Trị thương', c: 1, need: 'global', txt: 'Thành hồi 5 máu (không quá 20).' },
    luyda:     { t: 'sp', n: 'Lũy đá',    c: 1, need: 'own', txt: 'Lính đầu tiên của mình ở làn +3 Máu và +1 Giáp mãi mãi.' },
    tiepvien:  { t: 'sp', n: 'Tiếp viện', c: 1, need: 'room', txt: 'Thêm 1 Khiên thủ vào làn (không phải Biển).' },
    tuongkhien:{ t: 'sp', n: 'Tường khiên', c: 1, need: 'global', txt: 'Khiên Thành đầy ngay: đòn kế tiếp vào Thành bị chặn.' }
  };

  const CORE = ['danbinh', 'danbinh', 'danbinh', 'cungthu', 'cungthu', 'khienthu', 'khienthu', 'kybinh', 'kybinh', 'thambao',
    'tuongbinh', 'thuybinh', 'thuybinh', 'songdao', 'nothan',
    'phuckich', 'hochong', 'rutquan', 'dieuho', 'hoacong', 'phanke', 'nghibinh', 'tangvien'];

  // Bốn Chủ tướng: mỗi người 2 loại thẻ đặc trưng (×2) và 4 Tuyệt kỹ.
  const GENERALS = {
    houy:     { n: 'Hổ Uy',     tag: 'Đánh nhanh, đánh mạnh', col: '#d2492f', sig: ['hobao', 'hobao', 'trongtran', 'trongtran'], sp: ['gamthet', 'phavay', 'hieutrieu', 'cuonghoa'] },
    thuylong: { n: 'Thủy Long', tag: 'Làm chủ mặt nước',     col: '#2f86c9', sig: ['thuyenchien', 'thuyenchien', 'linhlan', 'linhlan'], sp: ['songdu', 'suonggia', 'thuytrieu', 'nhanchim'] },
    muusi:    { n: 'Mưu Sĩ',    tag: 'Bày mưu, đánh úp',     col: '#8a5cc9', sig: ['thichkhach', 'thichkhach', 'lienhoan', 'lienhoan'], sp: ['baybinh', 'dola', 'phake', 'amtoan'] },
    tranquoc: { n: 'Trấn Quốc', tag: 'Thủ chắc, bền bỉ',     col: '#3a9a63', sig: ['quany', 'quany', 'xechan', 'xechan'], sp: ['trithuong', 'luyda', 'tiepvien', 'tuongkhien'] }
  };
  const GEN_KEYS = Object.keys(GENERALS);
  // Bộ thẻ cũ (một bộ chung cho cả hai bên) để tương thích.
  const DECK_LIST = CORE.slice();

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
  const deckOf = g => CORE.concat(GENERALS[g].sig);
  const tr = (k, name) => (CARDS[k] && CARDS[k].tr && CARDS[k].tr[name]) || 0;
  // Lính có được đặt ở làn này không (Biển chỉ nhận Thủy).
  const laneOk = (k, l) => l !== BIEN || !!tr(k, 'thuy');

  function newGame(seed, gens) {
    const s = {
      seed: (seed >>> 0) || 1, uid: 1, round: 1, hp: [START_HP, START_HP], hand: [[], []], deck: [[], []], disc: [[], []],
      lanes: [], traps: [[], []], orders: [0, 0], atk: 0, phase: 1, turn: 0, known: [[], []], winner: null, why: '', log: [],
      gen: [null, null], list: [[], []], sp: [[], []], shield: [0, 0], blocks: [0, 0]
    };
    for (let l = 0; l < LANES; l++) s.lanes.push([[], []]);
    gens = gens || [];
    for (let p = 0; p < 2; p++) {
      const g = GENERALS[gens[p]] ? gens[p] : GEN_KEYS[Math.floor(rnd(s) * GEN_KEYS.length)];
      s.gen[p] = g; s.list[p] = deckOf(g);
      // Tay đầu 5 lá, luôn có ít nhất 1 Dân binh để vòng 1 (1 Quân lệnh) có nước đi.
      const deck = shuffle(s, s.list[p].slice());
      if (deck.slice(0, START_HAND).indexOf('danbinh') < 0) { const j = deck.indexOf('danbinh'); deck[j] = deck[0]; deck[0] = 'danbinh'; }
      s.hand[p] = deck.slice(0, START_HAND).map(k => ({ id: s.uid++, k }));
      s.deck[p] = deck.slice(START_HAND).map(k => ({ id: s.uid++, k }));
      s.sp[p] = shuffle(s, GENERALS[g].sp.slice());
      gainSp(s, p);
    }
    startRound(s);
    return s;
  }

  function gainSp(s, p) {
    const k = s.sp[p].shift();
    if (!k) return null;
    const c = { id: s.uid++, k };
    s.hand[p].push(c);
    return c;
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
    s.orders = [s.orders[0] + s.round, s.orders[1] + s.round];
    s.atk = s.round % 2 === 1 ? 0 : 1;
    s.phase = 1; s.turn = s.atk;
  }

  const used = units => units.reduce((n, u) => n + u.sz, 0);

  function makeUnit(s, k, owner, tok) {
    const d = CARDS[k];
    return { id: s.uid++, k, owner, hp: d.h, mh: d.h, a: d.a, sz: d.sz, bonus: 0, tok: tok ? 1 : 0, x: {}, tmp: {}, frz: 0, hid: 0 };
  }
  // Đặc tính của Lính: gốc của thẻ + được ban mãi mãi (x) + tạm thời trong vòng (tmp).
  function has(u, name) { return !!(tr(u.k, name) || (u.x && u.x[name]) || (u.tmp && u.tmp[name])); }
  const armor = u => tr(u.k, 'giap') + ((u.x && u.x.giap) || 0);
  function laneOf(s, u) {
    for (let l = 0; l < LANES; l++) if (s.lanes[l][u.owner].indexOf(u) >= 0) return l;
    for (let l = 0; l < LANES; l++) for (const x of s.lanes[l][u.owner]) if (x.id === u.id) return l;
    return -1;
  }
  function atkOf(s, u, l) {
    if (l === undefined) l = laneOf(s, u);
    let a = u.a + u.bonus;
    if (u.owner === s.atk) a += tr(u.k, 'charge');
    if (l === NUI && has(u, 'xa')) a += 1;
    if (l >= 0) for (const o of s.lanes[l][u.owner]) if (o !== u && o.id !== u.id && has(o, 'aura')) a += 1;
    return Math.max(0, a);
  }
  // Lính đầu tiên ở làn (bỏ qua Lính đang Ẩn nếu cần nhìn thấy).
  const firstOwn = (s, l, p) => s.lanes[l][p][0] || null;
  const firstFoe = (s, l, p) => s.lanes[l][other(p)].find(u => !u.hid) || null;

  function spValid(s, p, k, l) {
    const d = CARDS[k];
    switch (d.need) {
      case 'own': return !!firstOwn(s, l, p);
      case 'foe': return !!firstFoe(s, l, p);
      case 'foeBien': return l === BIEN && !!firstFoe(s, l, p);
      case 'room': return l !== BIEN && used(s.lanes[l][p]) + 1 <= SLOTS;
      case 'any': return true;
      default: return false;
    }
  }

  // Danh sách hành động hợp lệ của bên đang đến lượt.
  function legal(s) {
    const out = [];
    if (s.winner !== null) return out;
    const p = s.turn, seen = {};
    for (const c of s.hand[p]) {
      const d = CARDS[c.k];
      if (!d || d.c > s.orders[p]) continue;   // lá chưa biết (góc nhìn bị che) thì bỏ qua
      if (d.t === 'unit') {
        if (s.phase === 3) continue;
        for (let l = 0; l < LANES; l++) {
          if (!laneOk(c.k, l) || used(s.lanes[l][p]) + d.sz > SLOTS) continue;
          const key = c.k + ':' + l;
          if (seen[key]) continue; seen[key] = 1;
          out.push({ t: 'unit', id: c.id, k: c.k, lane: l });
        }
      } else if (d.t === 'trick') {
        if (s.phase === 1 || s.traps[p].length >= TRAPS_MAX) continue;
        for (let l = 0; l < LANES; l++) {
          const key = c.k + ':' + l;
          if (seen[key]) continue; seen[key] = 1;
          out.push({ t: 'trick', id: c.id, k: c.k, lane: l });
        }
      } else if (d.t === 'sp') {
        if (d.need === 'global') {
          const key = c.k + ':g';
          if (!seen[key]) { seen[key] = 1; out.push({ t: 'sp', id: c.id, k: c.k, lane: -1 }); }
          continue;
        }
        for (let l = 0; l < LANES; l++) {
          if (!spValid(s, p, c.k, l)) continue;
          const key = c.k + ':' + l;
          if (seen[key]) continue; seen[key] = 1;
          out.push({ t: 'sp', id: c.id, k: c.k, lane: l });
        }
      }
    }
    out.push({ t: 'end' });
    return out;
  }

  function isLegal(s, a) {
    if (a.t === 'end') return s.winner === null;
    const c = s.hand[s.turn].find(x => x.id === a.id);
    if (!c) return false;
    return legal(s).some(x => x.t === a.t && x.k === c.k && x.lane === a.lane);
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
    s.known[other(p)] = s.known[other(p)].filter(x => x !== card.id);
    if (a.t === 'unit') {
      const u = makeUnit(s, card.k, p, false); u.card = card;
      if (tr(card.k, 'an')) u.hid = 1;
      s.lanes[a.lane][p].push(u);
      s.log.push({ e: 'unit', p, k: u.hid ? null : card.k, lane: a.lane, uid: u.id, hid: u.hid });
      if (d.scout && s.hand[other(p)].length) {
        const cand = s.hand[other(p)].filter(c => s.known[p].indexOf(c.id) < 0);
        if (cand.length) { const c = cand[Math.floor(rnd(s) * cand.length)]; s.known[p].push(c.id); s.log.push({ e: 'scout', p, id: c.id, k: c.k }); }
      }
    } else if (a.t === 'trick') {
      s.traps[p].push({ id: card.id, k: card.k, lane: a.lane });
      s.log.push({ e: 'trick', p, lane: a.lane });
    } else {
      resolveSp(s, p, card.k, a.lane);
      s.disc[p].push(card);
    }
    return true;
  }

  // Dời Lính sang làn khác còn chỗ và đặt được (Biển chỉ nhận Thủy). Trả về làn mới hoặc -1.
  function shove(s, u, from) {
    const order = [];
    for (let k = 1; k < LANES; k++) { if (from + k < LANES) order.push(from + k); if (from - k >= 0) order.push(from - k); }
    for (const k of order) {
      if (!laneOk(u.k, k) && !has(u, 'thuy')) continue;
      if (used(s.lanes[k][u.owner]) + u.sz > SLOTS) continue;
      const arr = s.lanes[from][u.owner]; arr.splice(arr.indexOf(u), 1);
      s.lanes[k][u.owner].push(u);
      return k;
    }
    return -1;
  }

  function resolveSp(s, p, k, l) {
    const o = other(p), e = { e: 'sp', p, k, lane: l };
    const mine = l >= 0 ? firstOwn(s, l, p) : null, foe = l >= 0 ? firstFoe(s, l, p) : null;
    switch (k) {
      case 'gamthet': if (mine) { mine.bonus += 2; mine.tmp.fs = 1; e.uid = mine.id; } break;
      case 'phavay': if (foe) { foe.hp -= Math.max(0, 3 - armor(foe)); e.uid = foe.id; e.dmg = Math.max(0, 3 - armor(foe)); } break;
      case 'hieutrieu': if (used(s.lanes[l][p]) + 1 <= SLOTS) { const u = makeUnit(s, 'danbinh', p, true); s.lanes[l][p].push(u); e.uid = u.id; } break;
      case 'cuonghoa': if (mine) { mine.a += 1; mine.x.cuong = 1; e.uid = mine.id; } break;
      case 'songdu': if (foe) { e.uid = foe.id; e.to = shove(s, foe, l); } break;
      case 'suonggia': if (foe) { foe.frz = 1; e.uid = foe.id; } break;
      case 'thuytrieu': if (mine) { mine.a += 2; mine.hp += 2; mine.mh += 2; mine.x.thuy = 1; e.uid = mine.id; } break;
      case 'nhanchim': if (foe) { foe.hp = 0; e.uid = foe.id; } break;
      case 'baybinh': draw(s, p, 2); break;
      case 'dola': for (const c of s.hand[o]) if (s.known[p].indexOf(c.id) < 0) s.known[p].push(c.id); draw(s, p, 1); break;
      case 'phake': {
        const gone = s.traps[o].filter(t => t.lane === l);
        s.traps[o] = s.traps[o].filter(t => t.lane !== l);
        for (const t of gone) s.disc[o].push({ id: t.id, k: t.k });
        e.n = gone.length; draw(s, p, 1); break;
      }
      case 'amtoan': if (mine) { mine.x.tatsat = 1; e.uid = mine.id; } break;
      case 'trithuong': s.hp[p] = Math.min(START_HP, s.hp[p] + 5); break;
      case 'luyda': if (mine) { mine.hp += 3; mine.mh += 3; mine.x.giap = (mine.x.giap || 0) + 1; e.uid = mine.id; } break;
      case 'tiepvien': if (used(s.lanes[l][p]) + 1 <= SLOTS) { const u = makeUnit(s, 'khienthu', p, true); s.lanes[l][p].push(u); e.uid = u.id; } break;
      case 'tuongkhien': if (s.blocks[p] < BLOCKS_MAX) s.shield[p] = SHIELD_FULL - 1; break;
      default: break;
    }
    s.log.push(e);
    sweep(s);
    checkWin(s);
  }

  function dead(s, u) {
    if (u.tok) return;
    const c = u.card || { id: u.id, k: u.k };
    s.disc[u.owner].push({ id: c.id, k: c.k });
  }

  function resolveTrick(s, t, p) {
    const e = { e: 'flip', p, k: t.k, lane: t.lane, note: '' };
    const l = t.lane, o = other(p), mine = s.lanes[l][p], theirs = s.lanes[l][o];
    switch (t.k) {
      case 'phuckich': if (mine[0]) { mine[0].bonus += 3; e.uid = mine[0].id; } break;
      case 'hochong': if (theirs[0]) { theirs[0].hp -= 2; e.uid = theirs[0].id; } break;
      case 'rutquan':
        if (mine[0]) {
          const u = mine.shift(); e.uid = u.id;
          if (!u.tok) { s.hand[p].push(u.card || { id: u.id, k: u.k }); }
        } break;
      case 'dieuho':
        if (theirs[0]) { const u = theirs[0]; e.uid = u.id; e.to = shove(s, u, l); }
        break;
      case 'hoacong':
        for (const side of [0, 1]) for (const u of s.lanes[l][side]) u.hp -= 2;
        break;
      case 'tangvien':
        if (l !== BIEN && used(mine) + 1 <= SLOTS) { const u = makeUnit(s, 'danbinh', p, true); mine.push(u); e.uid = u.id; }
        break;
      case 'lienhoan': draw(s, p, 2); break;
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

  function checkWin(s) {
    const h0 = s.hp[0], h1 = s.hp[1];
    if (h0 <= 0 || h1 <= 0) { s.winner = h0 > h1 ? 0 : h1 > h0 ? 1 : other(s.atk); s.why = 'Thành sụp'; return true; }
    return false;
  }

  // Một đòn vào Thành: nạp Khiên; đòn làm Khiên đủ nấc thì bị chặn và chủ Thành nhận 1 Tuyệt kỹ.
  function castleHit(s, target, dmg, u, l, pend) {
    if (dmg <= 0) return;
    if (!has(u, 'tia') && s.blocks[target] < BLOCKS_MAX) {
      s.shield[target]++;
      if (s.shield[target] >= SHIELD_FULL) {
        s.shield[target] = 0; s.blocks[target]++;
        const c = gainSp(s, target);
        s.log.push({ e: 'block', lane: l, from: u.id, dmg, target, sp: c ? c.k : null, spid: c ? c.id : 0 });
        return;
      }
    }
    pend[target] += dmg;
    s.log.push({ e: 'castle', lane: l, from: u.id, dmg, p: u.owner, target, sh: s.shield[target] });
  }

  function hitUnit(s, u, foe, dmg, l, pend) {
    const d = Math.max(0, dmg - armor(foe));
    const was = foe.hp;
    if (d > 0 && has(u, 'tatsat')) foe.hp = 0; else foe.hp -= d;
    s.log.push({ e: 'hit', lane: l, from: u.id, to: foe.id, dmg: was - Math.max(0, foe.hp), p: u.owner, deadly: d > 0 && has(u, 'tatsat') ? 1 : 0 });
    if (has(u, 'xuyen')) castleHit(s, other(u.owner), dmg, u, l, pend);
    if (has(u, 'cuong') && was > 0 && foe.hp <= 0) castleHit(s, other(u.owner), dmg, u, l, pend);
  }

  function resolveLane(s, l, pend) {
    // Bắn trước: đầu giao chiến, Lính có "ban" bắn vào Lính đối diện.
    for (const side of [0, 1]) for (const u of s.lanes[l][side]) {
      const n = tr(u.k, 'ban');
      if (!n || u.frz || u.hp <= 0) continue;
      const foes = s.lanes[l][other(side)].filter(x => x.hp > 0);
      if (!foes.length) continue;
      const slot = slotOf(s.lanes[l][side], u);
      const foe = foeAt(s.lanes[l][other(side)], slot) || foes[0];
      const d = Math.max(0, n - armor(foe));
      foe.hp -= d;
      s.log.push({ e: 'shot', lane: l, from: u.id, to: foe.id, dmg: d, p: side });
    }
    sweepLane(s, l);
    const events = [];
    for (const side of [0, 1]) {
      for (const u of s.lanes[l][side]) {
        if (u.frz) { s.log.push({ e: 'frozen', uid: u.id, lane: l }); continue; }
        const dmg = atkOf(s, u, l);
        if (dmg <= 0) continue;
        const foe = foeAt(s.lanes[l][other(side)], slotOf(s.lanes[l][side], u), u.sz);
        events.push({ u, foe, side, dmg });
      }
    }
    // Mỗi đợt ra đòn đồng thời: ai còn sống lúc đầu đợt thì được đánh; Lính đối diện đã gục trước đợt thì đòn đi thẳng vào Thành.
    const wave = list => {
      const live = list.filter(ev => ev.u.hp > 0);
      const foeUp = new Map(live.map(ev => [ev, !!(ev.foe && ev.foe.hp > 0)]));
      for (const ev of live) {
        if (foeUp.get(ev)) hitUnit(s, ev.u, ev.foe, ev.dmg, l, pend);
        else castleHit(s, other(ev.side), ev.side === s.atk ? ev.dmg : Math.floor(ev.dmg / 2), ev.u, l, pend);
      }
    };
    // Mục tiêu đã chọn từ đầu; Đánh trước ra đòn riêng, kẻ bị hạ không đánh trả.
    wave(events.filter(ev => has(ev.u, 'fs')));
    wave(events.filter(ev => !has(ev.u, 'fs')));
    // Song kích: đòn thứ hai.
    wave(events.filter(ev => has(ev.u, 'song')));
    sweepLane(s, l);
  }
  function slotOf(arr, u) { let slot = 0; for (const x of arr) { if (x === u) return slot; slot += x.sz; } return 0; }
  function foeAt(arr, slot, sz) {
    let pos = 0;
    for (const x of arr) {
      const a = pos, b = pos + x.sz - 1;
      if ((slot >= a && slot <= b) || (sz === 2 && slot + 1 >= a && slot + 1 <= b)) return x;
      pos += x.sz;
    }
    return null;
  }
  function sweepLane(s, l) {
    for (const side of [0, 1]) {
      const keep = [];
      for (const u of s.lanes[l][side]) { if (u.hp > 0) keep.push(u); else { dead(s, u); s.log.push({ e: 'die', uid: u.id, k: u.k, lane: l, p: side }); } }
      s.lanes[l][side] = keep;
    }
  }

  function resolve(s) {
    s.log.push({ e: 'war', round: s.round });
    const a = s.atk, d = other(a);
    // 0. Lính Ẩn lộ diện; Quân y hồi máu cho Lính cùng làn.
    for (let l = 0; l < LANES; l++) for (const side of [d, a]) for (const u of s.lanes[l][side]) {
      if (u.hid) { u.hid = 0; s.log.push({ e: 'reveal', uid: u.id, k: u.k, lane: l, p: side }); }
    }
    for (let l = 0; l < LANES; l++) for (const side of [d, a]) for (const u of s.lanes[l][side]) {
      if (!has(u, 'heal')) continue;
      for (const v of s.lanes[l][side]) {
        const h = Math.min(2, v.mh - v.hp);
        if (h > 0) { v.hp += h; s.log.push({ e: 'heal', uid: v.id, n: h, lane: l, p: side }); }
      }
    }
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
    // 3. Giao chiến từng làn, trái sang phải.
    const pend = [0, 0];
    for (let l = 0; l < LANES; l++) { s.log.push({ e: 'lane', lane: l }); resolveLane(s, l, pend); }
    s.hp[0] -= pend[0]; s.hp[1] -= pend[1];
    // 4. Dọn bàn.
    for (const p of [0, 1]) { for (const t of s.traps[p]) s.disc[p].push({ id: t.id, k: t.k }); s.traps[p] = []; }
    for (let l = 0; l < LANES; l++) for (const side of [0, 1]) for (const u of s.lanes[l][side]) { u.bonus = 0; u.tmp = {}; u.frz = 0; }
    if (checkWin(s)) return;
    if (s.round >= MAX_ROUND) {
      const h0 = s.hp[0], h1 = s.hp[1];
      const cnt = p => s.lanes.reduce((n, ln) => n + ln[p].length, 0);
      s.winner = h0 > h1 ? 0 : h1 > h0 ? 1 : cnt(0) > cnt(1) ? 0 : cnt(1) > cnt(0) ? 1 : 1;
      s.why = 'Hết ' + MAX_ROUND + ' vòng';
      return;
    }
    s.round++;
    draw(s, 0, DRAW); draw(s, 1, DRAW);
    startRound(s);
  }

  // Góc nhìn của một bên: giấu tay bài, Mưu úp, Lính Ẩn và thứ tự Tuyệt kỹ của đối thủ.
  function viewFor(s, p) {
    const v = clone(s), o = other(p);
    v.hand[o] = v.hand[o].map(c => s.known[p].indexOf(c.id) >= 0 ? c : { id: c.id, k: null });
    v.deck[o] = v.deck[o].map(c => ({ id: c.id, k: null }));
    v.deck[p] = v.deck[p].map(c => ({ id: c.id, k: null }));
    v.traps[o] = v.traps[o].map(t => ({ id: t.id, k: null, lane: -1 }));
    v.sp[o] = v.sp[o].map(() => null);
    v.sp[p] = v.sp[p].map(() => null);
    for (let l = 0; l < LANES; l++) v.lanes[l][o] = v.lanes[l][o].map(u => u.hid ? { id: u.id, k: null, owner: o, hp: 0, mh: 0, a: 0, sz: 1, bonus: 0, tok: 0, x: {}, tmp: {}, frz: 0, hid: 1 } : u);
    v.known[o] = [];
    v.log = [];
    return v;
  }

  const api = {
    LANES, SLOTS, MAX_HAND, MAX_ROUND, START_HP, SHIELD_FULL, BLOCKS_MAX, NUI, BIEN, LANE_NAMES, CARDS, TRAITS, GENERALS, GEN_KEYS, CORE, DECK_LIST,
    newGame, legal, apply, clone, viewFor, rnd, shuffle, used, atkOf, resolve, other, laneOk, has, armor, deckOf, spValid, laneOf
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.VDT = api;
})(typeof window !== 'undefined' ? window : globalThis);
