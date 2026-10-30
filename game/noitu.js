/* Nối từ tiếng Việt: hai người thay phiên nói một từ hai tiếng, tiếng đầu của từ mới phải là tiếng cuối của từ trước, không được lặp từ.
 * Chơi với máy (3 mức) hoặc trực tuyến (noitu-online.js dùng window.NW).
 * Từ điển (thư mục noitu-data/): noitu-words.md (bộ từ chọn lọc, máy dùng) + noitu-extra.txt (từ ít gặp hơn, chỉ để chấp nhận khi người chơi nhập). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'noitu_v1';
  const V = '20261030v';
  const LEVELS = {
    easy:   { name: 'DỄ',     vocab: .6,  trap: 0,   think: [1100, 1500], time: 40, mult: 1 },
    normal: { name: 'THƯỜNG', vocab: .85, trap: .2, think: [800, 1300],  time: 28, mult: 2 },
    hard:   { name: 'KHÓ',    vocab: 1,   trap: .45, think: [600, 1000],  time: 20, mult: 3 },
  };
  const ONLINE_TIME = 25;

  // ---------- Lưu trữ & âm thanh ----------
  const store = { best: 0, snd: true, level: 'normal' };
  try { Object.assign(store, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) {}
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(store)); } catch (e) {} };
  const Snd = {
    ac: null,
    init() { if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; } try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} },
    tone(f, d, type, vol, delay, to) {
      if (!this.ac || !store.snd) return;
      const t = this.ac.currentTime + (delay || 0), o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + d);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol || .12, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g); g.connect(this.ac.destination); o.start(t); o.stop(t + d + .03);
    },
    me() { this.tone(660, .09, 'triangle', .13); this.tone(990, .14, 'sine', .09, .06); },
    opp() { this.tone(520, .09, 'triangle', .11); this.tone(780, .14, 'sine', .08, .06); },
    stop(i) { this.tone(500 + i * 70, .07, 'triangle', .07); },
    bad() { this.tone(200, .16, 'square', .05, 0, 150); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, .2, 'triangle', .12, i * .09)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, .3, 'triangle', .13, i * .16)); },
    tick() { this.tone(1400, .03, 'square', .03); }
  };
  function syncSnd() { $('bSnd').innerHTML = `<i class="fa-solid ${store.snd ? 'fa-volume-high' : 'fa-volume-xmark'}"></i>`; }
  function vibrate(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
  let toastT = null;
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const myName = () => (window.Scores && Scores.hasName()) ? Scores.getName() : 'Bạn';
  const rand = (a, b) => a + Math.random() * (b - a);
  const pickOf = arr => arr[Math.floor(Math.random() * arr.length)];

  // ---------- Từ điển ----------
  const D = { cur: new Set(), all: new Set(), curBy: new Map(), allBy: new Map(), starters: [], rare: new Set(), banned: new Set(), ready: false };
  // chuẩn hoá: chữ thường, một dấu cách, dấu thanh kiểu "hòa/khỏe/thủy" (hoà/khoẻ/thuỷ cũng được chấp nhận)
  const TONE_RE = /[\u0300\u0301\u0309\u0303\u0323]/;
  function fixTone(syl) {
    const d = syl.normalize('NFD'), i = d.search(TONE_RE);
    if (i < 0 || i !== d.length - 1) return syl.normalize('NFC');
    const base = d.slice(0, i);
    if (!/(oa|oe|uy)$/.test(base) || /^qu/.test(base)) return syl.normalize('NFC');
    return (base.slice(0, -1) + d[i] + base.slice(-1)).normalize('NFC');
  }
  const norm = s => String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim().split(' ').map(fixTone).join(' ');
  const first = w => w.slice(0, w.indexOf(' '));
  const last = w => w.slice(w.indexOf(' ') + 1);
  const WORD_RE = /^\p{L}+ \p{L}+$/u;
  function addWord(raw, cur) {
    const w = norm(raw);
    if (!WORD_RE.test(w) || D.banned.has(w) || D.all.has(w) && !cur) return;
    if (!D.all.has(w)) {
      D.all.add(w);
      const f = first(w);
      if (!D.allBy.has(f)) D.allBy.set(f, []);
      D.allBy.get(f).push(w);
    }
    if (cur && !D.cur.has(w)) {
      D.cur.add(w);
      const f = first(w);
      if (!D.curBy.has(f)) D.curBy.set(f, []);
      D.curBy.get(f).push(w);
    }
  }
  async function loadDict() {
    const [a, b, bn] = await Promise.all([
      fetch('noitu-data/noitu-words.md?v=' + V).then(r => { if (!r.ok) throw new Error('md'); return r.text(); }),
      fetch('noitu-data/noitu-extra.txt?v=' + V).then(r => { if (!r.ok) throw new Error('extra'); return r.text(); }),
      fetch('noitu-data/noitu-banned.txt?v=' + V).then(r => r.ok ? r.text() : '').catch(() => ''),
    ]);
    for (const w of bn.split('\n')) if (w.trim() && !w.startsWith('#')) D.banned.add(norm(w));
    let inList = false, common = true, starter = false;   // phần 0: từ phổ biến nhất (mở ván), phần 1: từ thông dụng (máy ưu tiên), phần 2: từ ít gặp (chỉ để chấp nhận)
    const starts = [];
    for (const line of a.split('\n')) {
      if (line.startsWith('# PHẦN')) { starter = line.startsWith('# PHẦN 0'); common = !line.startsWith('# PHẦN 2'); continue; }
      if (line.startsWith('## ')) { inList = true; continue; }
      if (!inList || !line.trim() || line.startsWith('#')) continue;
      for (const w of line.split(',')) { addWord(w, common); if (starter) starts.push(norm(w)); }
    }
    for (const w of b.split('\n')) { const n = norm(w); if (WORD_RE.test(n) && !D.all.has(n) && !D.banned.has(n)) D.rare.add(n); addWord(w, false); }
    // từ mở đầu cho máy: còn nhiều từ để nối tiếp
    for (const w of starts) if (D.cur.has(w) && (D.allBy.get(last(w)) || []).length >= 8) D.starters.push(w);
    D.ready = D.cur.size > 1000;
    if (!D.ready) throw new Error('empty');
  }
  // đếm từ còn nối được sau tiếng `syl`
  function avail(syl, exclude) {
    const arr = D.allBy.get(syl); if (!arr) return 0;
    let n = 0; for (const w of arr) if (!G.used.has(w) && w !== exclude) n++;
    return n;
  }
  const hashPct = w => { let h = 2166136261; for (let i = 0; i < w.length; i++) { h ^= w.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 1000 / 1000; };

  // ---------- Trạng thái ----------
  const G = {
    mode: 'menu',            // menu | solo | online
    level: store.level,
    chain: [], used: new Set(), need: null,
    turn: null, deadline: 0, limit: 25000, running: false, paused: false, left: 0,
    mine: 0, theirs: 0, hints: 3,
    names: { me: 'Bạn', opp: 'Máy' }, wins: { me: 0, opp: 0 }, winner: null, oppTag: 'MÁY', connOk: true, oppOff: '',
    hooks: null,             // chế độ trực tuyến: { move(w, idx), timeout() }
    aiT: null, lastSec: 99, locked: false,
  };
  const score = () => G.mine * (G.mode === 'solo' ? LEVELS[G.level].mult : 1);

  // ---------- Hiển thị ----------
  function show(id) { for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === id); }
  function renderHud() {
    const turn = G.running || G.turn ? G.turn : null;
    $('pcMe').className = 'pc me' + (turn === 'me' ? ' turn' : '') + (G.winner === 'me' ? ' win' : '');
    $('pcOpp').className = 'pc opp' + (turn === 'opp' ? ' turn' : '') + (G.winner === 'opp' ? ' win' : '');
    const dot = ok => `<i class="d${ok ? '' : ' off'}"></i>`;
    $('pcMe').innerHTML = `<div class="pcTop"><span class="pcName">${esc(G.names.me)}</span><span class="pcWins"><i class="fa-solid fa-trophy"></i> ${G.wins.me}</span></div>
      <div class="pcBot"><span class="pcTag">${G.mode === 'online' ? dot(G.connOk) : ''}BẠN</span><span class="pcNum"><b>${G.mine}</b> từ</span></div>`;
    $('pcOpp').innerHTML = `<div class="pcTop"><span class="pcName">${esc(G.names.opp)}</span><span class="pcWins"><i class="fa-solid fa-trophy"></i> ${G.wins.opp}</span></div>
      <div class="pcBot"><span class="pcTag">${G.mode === 'online' ? dot(!G.oppOff) : ''}${esc(G.oppOff || G.oppTag)}</span><span class="pcNum"><b>${G.theirs}</b> từ</span></div>`;
    $('sScore').textContent = score();
    $('sChain').textContent = G.mine + G.theirs;
  }
  function syllables(w) { const p = w.split(' '); return [p[0], p[1]]; }
  const searchUrl = w => 'https://www.google.com/search?q=' + encodeURIComponent('"' + w + '" nghĩa là gì');
  function wordEl(m, i) {
    const [a, b] = syllables(m.w);
    const el = document.createElement('div');
    const rare = D.rare.has(m.w);
    el.className = 'wd ' + m.by + ' cur' + (rare ? ' rare' : '');
    el.innerHTML = `<span class="sy"><span class="${i > 0 ? 'k' : ''}">${esc(a)}</span><span class="l">${esc(b)}</span></span>` +
      `<a class="mg" href="${searchUrl(m.w)}" target="_blank" rel="noopener noreferrer" aria-label="Tra từ ${esc(m.w)}"><i class="fa-solid fa-magnifying-glass"></i></a>` +
      (rare ? '<span class="rareTag"><i class="fa-solid fa-star"></i> TỪ HIẾM</span>' : '');
    return el;
  }
  // chữ chạy lên xuống như máy quay, dừng lần lượt từng chữ (chữ chẵn chạy lên, chữ lẻ chạy xuống)
  const REEL_POOL = 'aăâbcdđeêghiklmnoôơpqrstuưvxyáàảãạếềểễệốồổỗộớờởỡợứừửữựíìỉĩịúùủũụéèẻẽẹóòỏõọýỳỷỹỵ';
  function reel(el, base, step, done) {
    const spans = el.querySelectorAll('.sy > span');
    let idx = 0, end = 0;
    spans.forEach(sp => {
      const chars = Array.from(sp.textContent); sp.textContent = '';
      chars.forEach(ch => {
        const i = idx++, up = i % 2 === 0, n = 9 + Math.floor(Math.random() * 6);
        const rnd = () => REEL_POOL[Math.floor(Math.random() * REEL_POOL.length)];
        const seq = []; for (let k = 0; k < n; k++) seq.push(rnd());
        up ? seq.push(ch) : seq.unshift(ch);
        const cell = document.createElement('span'); cell.className = 'cell';
        const col = document.createElement('span'); col.className = 'col';
        col.innerHTML = seq.map(c => `<i>${c}</i>`).join('');
        cell.appendChild(col); sp.appendChild(cell);
        const dur = base + i * step; end = Math.max(end, dur);
        const d = n * 1.25;
        if (col.animate) col.animate(up ? [{ transform: 'translateY(0)' }, { transform: `translateY(${-d}em)` }] : [{ transform: `translateY(${-d}em)` }, { transform: 'translateY(0)' }],
          { duration: dur, easing: 'cubic-bezier(.12,.75,.2,1)', fill: 'forwards' });
        setTimeout(() => { cell.replaceWith(document.createTextNode(ch)); Snd.stop(i); }, dur);
      });
    });
    setTimeout(() => { el.classList.add('done'); if (done) done(); }, end + 60);
  }
  const chainIn = () => $('chainIn');
  function scrollEnd(smooth) { const s = $('chainScroll'); s.style.scrollBehavior = smooth ? 'smooth' : 'auto'; s.scrollTop = s.scrollHeight; }
  function clearThink() { const t = chainIn().querySelector('.think'); if (t) t.remove(); }
  function showThink() {
    clearThink();
    const el = document.createElement('div');
    el.className = 'wd opp think';
    el.innerHTML = '<span><i></i><i></i><i></i></span>';
    chainIn().appendChild(el); scrollEnd(true);
  }
  function appendWord(m, fx, done) {
    clearThink();
    const prev = chainIn().querySelector('.wd.cur');
    if (prev) { prev.classList.remove('cur'); prev.querySelector('.l').classList.add('k'); }
    const el = wordEl(m, G.chain.length - 1);
    chainIn().appendChild(el);
    scrollEnd(true);
    if (fx) { el.classList.add('rolling'); reel(el, fx[0], fx[1], () => { el.classList.remove('rolling'); scrollEnd(true); if (done) done(); }); }
    else if (done) done();
  }
  function renderNeed() {
    $('need').textContent = G.need || '';
    $('inp').placeholder = 'tiếng thứ hai';
  }
  function setInput(on) {
    $('inp').disabled = !on; $('bSend').disabled = !on;
    $('inRow').classList.toggle('off', !on);
    $('inp').value = '';
    if (on) { try { $('inp').focus({ preventScroll: true }); } catch (e) {} } else $('inp').blur();
  }
  function say(t) { $('msg').textContent = t || ''; clearTimeout(say.t); if (t) say.t = setTimeout(() => $('msg').textContent = '', 2600); }

  // ---------- Luật ----------
  function check(raw) {
    let w = norm(raw);
    if (!w) return { err: '' };
    if (G.need && w.indexOf(' ') < 0) w = G.need + ' ' + w;
    if (!WORD_RE.test(w)) return { err: 'Hãy nhập một từ hai tiếng.' };
    if (D.banned.has(w)) return { err: '"' + w + '" là từ bị cấm. Hãy dùng từ khác.', banned: true };
    if (G.need && first(w) !== G.need) return { err: 'Từ phải bắt đầu bằng "' + G.need + '".' };
    if (!D.all.has(w)) return { err: '"' + w + '" không có trong từ điển.' };
    if (G.used.has(w)) return { err: 'Từ này đã được dùng.' };
    return { w };
  }

  // ---------- Lượt chơi ----------
  const pickStart = () => pickOf(D.starters);
  // đặt từ khởi đầu (chọn ngẫu nhiên, không thuộc về ai) rồi quay chữ; xong thì gọi done
  function placeStart(w, done) {
    G.chain = [{ w, by: 'sys' }]; G.used = new Set([w]); G.need = null;
    renderNeed(); renderHud();
    appendWord(G.chain[0], [750, 280], () => { G.need = last(w); renderNeed(); if (done) done(); });
  }
  function startTurn(who) {
    G.turn = who;
    G.limit = (G.mode === 'solo' ? LEVELS[G.level].time : ONLINE_TIME) * 1000;
    G.deadline = Date.now() + G.limit;
    G.running = true; G.lastSec = 99;
    $('timebar').classList.toggle('idle', who !== 'me' && G.mode === 'solo');
    $('timebar').classList.remove('low');
    renderHud();
    setInput(who === 'me');
    if (who === 'opp') showThink();
    if (who === 'opp' && G.mode === 'solo') scheduleAI();
  }
  function applyMove(by, w) {
    G.chain.push({ w, by }); G.used.add(w); G.need = last(w);
    if (by === 'me') G.mine++; else G.theirs++;
    G.running = false; clearTimeout(G.aiT);
    appendWord(G.chain[G.chain.length - 1], by === 'opp' ? [320, 110] : null);
    if (by === 'me') Snd.me(); else Snd.opp();
    renderNeed(); renderHud();
    if (by === 'me' && G.hooks) G.hooks.move(w, G.mine + G.theirs - 1);
    startTurn(by === 'me' ? 'opp' : 'me');
  }
  function timeUp() {
    G.running = false;
    if (G.turn !== 'me') return;
    setInput(false);
    if (G.hooks) { G.hooks.timeout(); return; }
    finishSolo('lose', 'Hết giờ.');
  }
  function submit() {
    if (!G.running || G.turn !== 'me' || G.paused) return;
    const r = check($('inp').value);
    if (!r.w) {
      if (r.err) { say(r.err); if (r.banned) toast(r.err); Snd.bad(); vibrate(40); const row = $('inRow'); row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); }
      return;
    }
    applyMove('me', r.w);
  }

  // ---------- Máy ----------
  function scheduleAI() {
    const lv = LEVELS[G.level];
    clearTimeout(G.aiT);
    G.aiT = setTimeout(aiMove, rand(lv.think[0], lv.think[1]));
  }
  function aiMove() {
    if (G.mode !== 'solo' || G.turn !== 'opp' || G.paused) return;
    const lv = LEVELS[G.level];
    let pool = (D.curBy.get(G.need) || []).filter(w => !G.used.has(w) && hashPct(w) < lv.vocab);
    if (!pool.length) {
      const full = lv.vocab >= 1 ? (D.allBy.get(G.need) || []) : (D.curBy.get(G.need) || []);
      if (lv.vocab >= 1 || Math.random() < lv.vocab) pool = full.filter(w => !G.used.has(w));
    }
    if (!pool.length) { finishSolo('win', 'Máy không nối được.'); return; }
    const sc = pool.map(w => ({ w, f: avail(last(w), w) }));
    let pick;
    if (Math.random() < lv.trap) {
      const m = Math.min(...sc.map(x => x.f));
      pick = pickOf(sc.filter(x => x.f === m)).w;
    } else {
      const ok = sc.filter(x => x.f > 0);
      pick = pickOf(ok.length ? ok : sc).w;
    }
    applyMove('opp', pick);
  }

  // ---------- Kết thúc (chơi với máy) ----------
  function finishSolo(kind, why) {
    G.running = false; G.turn = null; clearTimeout(G.aiT); setInput(false); clearThink();
    G.winner = kind === 'win' ? 'me' : 'opp'; renderHud();
    const sc = score();
    const isNew = sc > store.best;
    if (isNew) { store.best = sc; save(); }
    if (window.Scores && sc > 0) Scores.submit('noitu', sc);
    if (kind === 'win') { Snd.win(); vibrate([20, 40, 20]); } else { Snd.lose(); vibrate(60); }
    $('oTitle').textContent = kind === 'win' ? 'BẠN THẮNG' : 'BẠN THUA';
    $('oWhy').textContent = why;
    const lw = G.chain[G.chain.length - 1];
    $('oLast').innerHTML = lw && lw.by !== 'sys' ? (lw.by === 'opp' ? 'Máy đáp: ' : 'Bạn đáp: ') + '<b>' + esc(lw.w) + '</b>' : '';
    $('oScore').textContent = sc;
    $('oWords').textContent = G.mine; $('oChain').textContent = G.mine + G.theirs; $('oBest').textContent = store.best;
    $('oNew').style.display = isNew && sc > 0 ? 'block' : 'none';
    setTimeout(() => { if (G.mode === 'solo' && !G.turn) show('over'); }, kind === 'win' ? 500 : 800);
  }

  // ---------- Bắt đầu / thoát ----------
  function reset() {
    clearTimeout(G.aiT);
    Object.assign(G, { chain: [], used: new Set(), need: null, turn: null, running: false, paused: false, mine: 0, theirs: 0, winner: null, locked: false, hints: 3 });
    chainIn().innerHTML = '';
    $('nHint').textContent = 3; $('bHint').disabled = false;
    $('timeFill').style.transform = 'scaleX(1)'; $('timeTxt').textContent = '';
    $('timebar').className = 'idle'; say('');
    renderNeed(); setInput(false);
  }
  function startSolo(level) {
    Snd.init();
    store.level = level; save();
    G.mode = 'solo'; G.level = level; G.hooks = null;
    document.body.classList.remove('online');
    G.names = { me: myName(), opp: 'Máy' }; G.oppTag = 'MÁY · ' + LEVELS[level].name; G.oppOff = '';
    G.wins = { me: 0, opp: 0 };
    $('bPause').innerHTML = '<i class="fa-solid fa-pause"></i>';
    reset();
    $('menu').classList.remove('lv');
    show(null); fit();
    const turn = Math.random() < .5 ? 'me' : 'opp';
    placeStart(pickStart(), () => startTurn(turn));
  }
  function pause(on) {
    if (G.mode !== 'solo' || !G.turn) return;
    if (on && !G.paused && !$('over').classList.contains('show')) {
      G.paused = true; G.left = G.deadline - Date.now(); clearTimeout(G.aiT); $('inp').blur(); show('pause');
    } else if (!on && G.paused) {
      G.paused = false; G.deadline = Date.now() + G.left; show(null);
      if (G.turn === 'opp') scheduleAI(); else try { $('inp').focus({ preventScroll: true }); } catch (e) {}
    }
  }
  function toMenu() {
    if (G.mode === 'online' && window.NWOnline && NWOnline.active()) NWOnline.leave();
    clearTimeout(G.aiT);
    Object.assign(G, { mode: 'menu', turn: null, running: false, paused: false, hooks: null });
    document.body.classList.remove('online');
    $('menu').classList.remove('onl', 'lv');
    $('mBest').innerHTML = store.best > 0 ? `Kỷ lục: <b>${store.best}</b>` : '';
    show('menu');
  }

  // ---------- Vòng lặp ----------
  function frame() {
    requestAnimationFrame(frame);
    if (!G.running || G.paused || G.limit > 6e5) return;
    const left = G.deadline - Date.now();
    $('timeFill').style.transform = `scaleX(${Math.max(0, left / G.limit)})`;
    const sec = Math.max(0, Math.ceil(left / 1000));
    $('timeTxt').textContent = sec;
    const low = left < 6000 && G.turn === 'me';
    $('timebar').classList.toggle('low', low);
    if (low && sec < G.lastSec) { G.lastSec = sec; Snd.tick(); }
    if (left <= 0) timeUp();
  }

  // ---------- Gợi ý ----------
  function hint() {
    if (G.hints <= 0 || !G.running || G.turn !== 'me' || G.mode !== 'solo') return;
    const arr = (D.curBy.get(G.need) || []).concat(D.allBy.get(G.need) || []);
    const ok = arr.filter(w => !G.used.has(w) && avail(last(w), w) > 0);
    if (!ok.length) { toast('Không có gợi ý'); return; }
    const w = pickOf(ok);
    G.hints--; $('nHint').textContent = G.hints; if (!G.hints) $('bHint').disabled = true;
    $('inp').value = last(w);
    try { $('inp').focus({ preventScroll: true }); } catch (e) {}
  }

  // ---------- Sự kiện ----------
  function fit() {
    const vv = window.visualViewport, h = vv ? vv.height : window.innerHeight;
    document.documentElement.style.setProperty('--h', h + 'px');
    if (vv && vv.offsetTop) window.scrollTo(0, 0);
    scrollEnd(false);
  }
  if (window.visualViewport) { visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', () => { if (visualViewport.offsetTop) window.scrollTo(0, 0); }); }
  window.addEventListener('resize', fit);

  $('bSend').onclick = submit;
  $('inp').addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(); } });
  $('bHint').onclick = hint;
  $('bPlay').onclick = () => { Snd.init(); $('menu').classList.add('lv'); };
  $('lvBack').onclick = () => $('menu').classList.remove('lv');
  document.querySelectorAll('.lvBtn').forEach(b => b.onclick = () => startSolo(b.dataset.lv));
  $('bResume').onclick = () => pause(false);
  $('bRestart').onclick = () => { G.paused = false; startSolo(G.level); };
  $('bQuit').onclick = toMenu;
  $('bAgain').onclick = () => startSolo(G.level);
  $('bMenu').onclick = toMenu;
  $('bPause').onclick = () => { if (G.mode === 'online') { if (window.NWOnline) NWOnline.askLeave(); } else pause(true); };
  $('bSnd').onclick = () => { store.snd = !store.snd; save(); syncSnd(); Snd.init(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });

  // ---------- Giao diện cho chế độ trực tuyến ----------
  window.NW = {
    G, D, Snd, pickStart, show, toast, toMenu, vibrate, check, avail, renderHud, say, myName,
    ready: () => D.ready,
    // bắt đầu ván trực tuyến; chưa tính giờ cho đến khi gọi begin()
    startOnline(names, wins, hooks, startWord, done) {
      G.mode = 'online'; G.hooks = hooks; G.names = names; G.wins = wins; G.oppTag = 'ĐỐI THỦ'; G.oppOff = '';
      document.body.classList.add('online');
      $('bPause').innerHTML = '<i class="fa-solid fa-right-from-bracket"></i>';
      reset(); show(null); fit(); renderHud();
      placeStart(startWord, done);
    },
    begin(turn) { startTurn(turn); },
    applyMove,
    lock() { G.running = false; G.turn = null; clearTimeout(G.aiT); setInput(false); clearThink(); renderHud(); },
    setWinner(w) { G.winner = w; renderHud(); },
    setBanner(cls, html) { const b = $('banner'); b.className = cls || ''; b.innerHTML = html; },
    setConn(ok, oppOff) { G.connOk = ok; G.oppOff = oppOff || ''; renderHud(); },
  };

  syncSnd();
  toMenu();
  requestAnimationFrame(frame);
  loadDict().then(() => {
    $('dictMsg').textContent = '';
    $('bPlay').disabled = false; $('bOnline').disabled = false;
  }).catch(() => {
    $('dictMsg').innerHTML = 'Không tải được từ điển. <a href="" style="color:var(--gold)">Tải lại</a>';
  });
})();
