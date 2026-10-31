// Thư viện lưu điểm và bảng xếp hạng dùng chung cho các game.
//
//   Scores.submit('nedan', 1234)   -> ghi điểm (luôn lưu trên máy; gửi lên Firebase nếu có mạng)
//   Scores.top('nedan', 50)        -> Promise<{ online, scores: [{ name, score, at, me }] }>
//   Scores.getName() / Scores.setName('Bảo')
//   Scores.games                   -> danh sách game có bảng xếp hạng: [{ id, name }]
//   Scores.format('thadieu', 123)  -> chuỗi điểm để hiển thị (ví dụ "12.3 giây")
//
// Nơi lưu: Firebase Realtime Database (giao diện REST, không cần SDK). Mỗi người chơi một khoá ngẫu nhiên
// tạo trên máy (lb_uid) nên mỗi game mỗi người chỉ có MỘT dòng, giữ điểm cao nhất. Quy tắc bảo mật nằm ở
// database.rules.json (dán vào Firebase Console → Realtime Database → Rules).
// Có thể đổi nơi lưu: window.SCORE_FIREBASE_URL = '...' hoặc dùng server riêng bằng window.SCORE_API_BASE.
// Khi không gọi được mạng, điểm vẫn được lưu trên máy và tự gửi lại sau.
(function () {
  'use strict';

  const FIREBASE_URL = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  const NAME_KEY = 'player_name';
  const UID_KEY = 'lb_uid';
  const LOCAL_KEY = 'scores_local_v1';
  const PENDING_KEY = 'scores_pending_v1';
  const SENT_KEY = 'scores_sent_v1';     // điểm cao nhất đã gửi thành công của từng game
  const PLAYED_KEY = 'scores_games_v1';  // các game đã gửi điểm (để đổi tên đồng loạt)
  const ASKED_KEY = 'lb_name_asked';
  const CLAIMED_KEY = 'lb_name_claimed';
  const LOCAL_MAX = 20;
  const TIMEOUT_MS = 6000;
  const MAX_SCORE = 10000000;

  // Các game có bảng xếp hạng (id trùng với id trong index.html). fmt: cách hiển thị điểm.
  const GAMES = [
    { id: 'nedan', name: 'Né đạn' },
    { id: 'neonreflex', name: 'Neon Reflex' },
    { id: 'dapquai', name: 'Đập chuột chũi' },
    { id: 'comet', name: 'Trốn khỏi thiên thạch' },
    { id: 'ganangdong', name: 'Gà năng động' },
    { id: 'dieukhiengiaolo', name: 'Điều khiển giao lộ' },
    { id: 'thadieu', name: 'Thả diều', fmt: v => (v / 10).toFixed(1) + ' giây' },
    { id: 'vetcatvohinh', name: 'Vết cắt vô hình' },
    { id: 'bongnay', name: 'Bóng nảy' },
    { id: 'xepbonggai', name: 'Xếp bóng gai' },
    { id: 'hungbi', name: 'Hứng bi' },
    { id: 'sieuduoibat', name: 'Siêu đuổi bắt' },
    { id: 'khinhkhicau', name: 'Khinh khí cầu', fmt: v => v.toLocaleString('vi-VN') + ' m' },
    { id: 'blockjump', name: 'Nhảy! Nhảy và nhảy!' },
    { id: 'dungsidietvirus', name: 'Bắn phá virus' },
    { id: 'fishsurvival', name: 'Cá lớn nuốt cá bé' },
    { id: 'phagach', name: 'Phá gạch' },
    { id: 'noithu', name: 'Nối thú' },
    { id: 'xepthap', name: 'Xây tháp', fmt: v => v.toLocaleString('vi-VN') + ' tầng' },
    { id: 'xepgach', name: 'Xếp gạch' },
    { id: 'cotuhuyenbi', name: 'Cổ tự huyền bí' },
    { id: 'noitu', name: 'Nối từ' },
    { id: 'dauba', name: 'Đấu bài Thạch Sanh', fmt: v => v + ' trận thắng' },
  ];
  const gameInfo = id => GAMES.find(g => g.id === id);

  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function readJson(key, fallback) {
    try { const v = JSON.parse(safeGet(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }

  function apiBase() {
    const b = window.SCORE_API_BASE || safeGet('score_api_base') || '';
    return b.replace(/\/+$/, '');
  }

  // ---------- Danh tính ----------
  function getUid() {
    let id = safeGet(UID_KEY);
    if (!/^[a-f0-9]{24,40}$/.test(id || '')) {
      const a = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(a);
      id = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
      safeSet(UID_KEY, id);
    }
    return id;
  }
  function getName() { return (safeGet(NAME_KEY) || '').trim() || 'Người chơi'; }
  // Tên hợp lệ: 6–10 ký tự, chỉ gồm chữ a–z (không dấu) và số 0–9, có ít nhất một chữ và một số. Luôn chuyển về chữ thường.
  const NAME_MIN = 6, NAME_MAX = 10;
  function normalizeName(raw) { return String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, NAME_MAX); }
  function validateName(raw) {
    const name = normalizeName(raw);
    if (name.length < NAME_MIN) return { ok: false, name, error: 'Tên cần ít nhất ' + NAME_MIN + ' ký tự.' };
    if (!/[a-z]/.test(name)) return { ok: false, name, error: 'Tên cần có ít nhất một chữ cái (a–z).' };
    if (!/[0-9]/.test(name)) return { ok: false, name, error: 'Tên cần có ít nhất một chữ số (0–9).' };
    return { ok: true, name, error: '' };
  }
  // Dùng để hiển thị tên của người khác trên bảng (tên cũ có thể không theo quy tắc mới)
  function cleanName(name) { return String(name || '').replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20); }
  function setName(name) {
    const v = validateName(name);
    if (v.ok) { safeSet(NAME_KEY, v.name); renameOnServer(v.name); }
    return getName();
  }
  const hasName = () => !!(safeGet(NAME_KEY) || '').trim();

  // Giữ chỗ tên trên máy chủ: /names/{tên} = uid. Mỗi tên chỉ thuộc về một người chơi.
  // Trả về { ok } hoặc { ok:false, error, taken?, offline? }.
  async function claimName(raw) {
    const v = validateName(raw);
    if (!v.ok) return v;
    if (apiBase()) { setName(v.name); return v; }
    const uid = getUid(), path = '/names/' + v.name;
    try {
      const owner = await http(FIREBASE_URL + path + '.json');
      if (owner && owner !== uid) return { ok: false, taken: true, name: v.name, error: 'Tên này đã có người dùng, hãy chọn tên khác.' };
      if (!owner) await fbWrite('PUT', path, uid);   // quy tắc chỉ cho ghi khi chưa có chủ → hai người tranh nhau thì một người bị từ chối
      safeSet(CLAIMED_KEY, v.name);
      setName(v.name);
      return { ok: true, name: v.name, error: '' };
    } catch (e) {
      if (isPermanent(e)) return { ok: false, taken: true, name: v.name, error: 'Tên này đã có người dùng, hãy chọn tên khác.' };
      return { ok: false, offline: true, name: v.name, error: 'Không kết nối được máy chủ, hãy thử lại.' };
    }
  }
  // Người chơi cũ đã có tên nhưng chưa giữ chỗ: giữ chỗ ngay; nếu tên đã bị người khác lấy thì xoá để hỏi lại.
  const ready = (async () => {
    const n = (safeGet(NAME_KEY) || '').trim();
    if (!n || safeGet(CLAIMED_KEY) === n) return;
    const r = await claimName(n);
    if (r.taken) { try { localStorage.removeItem(NAME_KEY); localStorage.removeItem(ASKED_KEY); } catch (e) {} }
  })().catch(() => {});

  function format(game, score) {
    const g = gameInfo(game), v = Number(score) || 0;
    return g && g.fmt ? g.fmt(v) : v.toLocaleString('vi-VN');
  }

  // ---------- Bảng điểm trên máy ----------
  function localTop(game, limit) {
    const all = readJson(LOCAL_KEY, {});
    return (all[game] || []).slice(0, limit || 10);
  }
  function localAdd(game, entry) {
    const all = readJson(LOCAL_KEY, {});
    const list = all[game] || [];
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    all[game] = list.slice(0, LOCAL_MAX);
    safeSet(LOCAL_KEY, JSON.stringify(all));
  }

  // ---------- Gọi mạng ----------
  async function http(url, options) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, Object.assign({ signal: ctrl && ctrl.signal }, options));
      if (!res.ok) { const err = new Error('http_' + res.status); err.status = res.status; throw err; }
      return await res.json();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  // Gửi body dạng text/plain để tránh yêu cầu preflight CORS (Firebase vẫn đọc được JSON)
  const fbWrite = (method, path, body) => http(FIREBASE_URL + path + '.json', { method, body: JSON.stringify(body), keepalive: true });

  function postScore(entry) {
    if (apiBase()) {   // server riêng (tuỳ chọn)
      return http(apiBase() + '/api/scores/' + encodeURIComponent(entry.game), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: entry.name, score: entry.score }),
      });
    }
    return fbWrite('PUT', '/leaderboards/' + encodeURIComponent(entry.game) + '/' + getUid(),
      { name: entry.name, score: entry.score, at: { '.sv': 'timestamp' } });
  }

  // Lỗi do dữ liệu/quy tắc (4xx) thì bỏ, không gửi lại mãi; lỗi mạng / quá tải thì giữ lại.
  function isPermanent(err) { return err && err.status >= 400 && err.status < 500 && err.status !== 429; }

  function markSent(game, score) {
    const sent = readJson(SENT_KEY, {});
    if (!(score <= sent[game])) { sent[game] = score; safeSet(SENT_KEY, JSON.stringify(sent)); }
    const played = readJson(PLAYED_KEY, []);
    if (!played.includes(game)) { played.push(game); safeSet(PLAYED_KEY, JSON.stringify(played)); }
  }

  let flushing = false;
  async function flushPending() {
    if (flushing) return;
    flushing = true;
    try {
      let pending = readJson(PENDING_KEY, []);
      while (pending.length) {
        try { await postScore(pending[0]); markSent(pending[0].game, pending[0].score); }
        catch (e) { if (!isPermanent(e)) break; }
        pending = readJson(PENDING_KEY, []);
        pending.shift();
        safeSet(PENDING_KEY, JSON.stringify(pending));
      }
    } finally {
      flushing = false;
    }
  }

  // Mỗi game chỉ gửi một yêu cầu tại một thời điểm; điểm cao hơn đến trong lúc đang gửi sẽ gửi tiếp sau đó.
  const inflight = {};
  async function sendBest(game, entry) {
    if (inflight[game]) { inflight[game].next = entry; return { ok: true, online: true, queued: true }; }
    inflight[game] = { next: null };
    try {
      const res = await postScore(entry);
      markSent(game, entry.score);
      return Object.assign({ online: true }, res);
    } catch (e) {
      if (!isPermanent(e)) {
        const pending = readJson(PENDING_KEY, []);
        pending.push(entry);
        safeSet(PENDING_KEY, JSON.stringify(pending.slice(-50)));
      }
      return { ok: true, online: false };
    } finally {
      const nx = inflight[game].next;
      delete inflight[game];
      if (nx) sendBest(game, nx);
    }
  }

  async function submit(game, score, name) {
    const s = Math.floor(Number(score));
    if (!game || !Number.isFinite(s) || s < 0 || s > MAX_SCORE) return { ok: false, online: false };
    const entry = { game, name: name ? setName(name) : getName(), score: s, at: new Date().toISOString() };
    localAdd(game, { name: entry.name, score: entry.score, at: entry.at });
    maybeAskName();
    // chỉ gửi khi cao hơn điểm đã gửi thành công của game này (server giữ điểm cao nhất mỗi người)
    const sent = readJson(SENT_KEY, {})[game];
    if (sent !== undefined && s <= sent) return { ok: true, online: true, skipped: true };
    const res = await sendBest(game, entry);
    flushPending();
    return res;
  }

  async function top(game, limit) {
    limit = limit || 10;
    try {
      if (apiBase()) {
        const res = await http(apiBase() + '/api/scores/' + encodeURIComponent(game) + '?limit=' + limit);
        return { online: true, scores: res.scores };
      }
      const data = await http(FIREBASE_URL + '/leaderboards/' + encodeURIComponent(game) + '.json?orderBy=%22score%22&limitToLast=' + limit);
      const me = getUid();
      const scores = Object.keys(data || {}).map(uid => {
        const d = data[uid] || {};
        return { name: cleanName(d.name) || 'Người chơi', score: Number(d.score) || 0, at: d.at ? new Date(d.at).toISOString() : '', me: uid === me, _t: d.at || 0 };
      }).sort((a, b) => b.score - a.score || a._t - b._t).slice(0, limit);
      scores.forEach(s => delete s._t);
      return { online: true, scores };
    } catch (e) {
      return { online: false, scores: localTop(game, limit) };
    }
  }

  // Đổi tên: cập nhật mọi dòng của người này trên bảng xếp hạng
  async function renameOnServer(name) {
    if (apiBase()) return;
    const uid = getUid(), played = readJson(PLAYED_KEY, []);
    for (const game of played) {
      try { await fbWrite('PATCH', '/leaderboards/' + encodeURIComponent(game) + '/' + uid, { name }); } catch (e) {}
    }
  }

  // ---------- Hộp hỏi tên (dùng chung) ----------
  // opts.required: không cho bỏ qua (trang chủ). Trả về Promise<tên | null>.
  function askName(opts) {
    opts = opts || {};
    return new Promise(resolve => {
      if (document.getElementById('lbNameDlg')) return resolve(null);
      const host = document.createElement('div');
      host.id = 'lbNameDlg';
      host.setAttribute('style', 'position:fixed;inset:0;z-index:2147483600;display:flex;overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(3,6,16,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);padding:20px;box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif');
      host.innerHTML = '<div style="width:100%;max-width:360px;margin:auto;background:linear-gradient(170deg,#1a2147,#0d1226);border:1px solid #34406e;border-radius:20px;padding:22px 20px 18px;color:#eef1ff;box-shadow:0 24px 60px rgba(0,0,0,.55)">' +
        '<div style="font-size:34px;text-align:center">🏆</div>' +
        '<div style="font-weight:800;font-size:19px;text-align:center;margin:6px 0 4px">Chọn tên người chơi</div>' +
        '<div style="font-size:13px;color:#9aa6d8;text-align:center;margin-bottom:14px">Tên của bạn sẽ hiện trên bảng xếp hạng.</div>' +
        '<input id="lbNameIn" maxlength="' + NAME_MAX + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="vd: gamer2026" style="width:100%;padding:13px 14px;border-radius:12px;border:1px solid #34406e;background:#0a0f22;color:#fff;font-size:18px;font-weight:700;letter-spacing:.06em;outline:none;margin-bottom:12px">' +
        '<div id="lbNameRules" style="font-size:12.5px;line-height:1.75;color:#8f9bd0;margin-bottom:14px"></div>' +
        '<div style="display:flex;gap:8px">' + (opts.required ? '' : '<button id="lbNameSkip" type="button" style="flex:1;padding:12px;border-radius:12px;border:1px solid #34406e;background:transparent;color:#9aa6d8;font-size:15px;cursor:pointer">Bỏ qua</button>') +
        '<button id="lbNameOk" type="button" disabled style="flex:2;padding:12px;border-radius:12px;border:0;background:linear-gradient(#5ee0c8,#2bb39a);color:#052a24;font-weight:800;font-size:15px;cursor:pointer;opacity:.45">Xác nhận</button></div></div>';
      document.body.appendChild(host);
      const input = host.querySelector('#lbNameIn'), ok = host.querySelector('#lbNameOk'), rules = host.querySelector('#lbNameRules');
      // Bàn phím ảo che bớt màn hình: bám theo vùng nhìn thấy và cho cuộn để nút Xác nhận luôn bấm được
      const vv = window.visualViewport;
      function fitDlg() { if (!vv) return; host.style.inset = 'auto'; host.style.left = '0'; host.style.width = '100%'; host.style.top = vv.offsetTop + 'px'; host.style.height = vv.height + 'px'; }
      if (vv) { vv.addEventListener('resize', fitDlg); vv.addEventListener('scroll', fitDlg); fitDlg(); }
      const done = v => { if (vv) { vv.removeEventListener('resize', fitDlg); vv.removeEventListener('scroll', fitDlg); } host.remove(); resolve(v); };
      function refresh() {
        const n = input.value, hasL = /[a-z]/.test(n), hasD = /[0-9]/.test(n), lenOk = n.length >= NAME_MIN && n.length <= NAME_MAX;
        const row = (good, t) => '<div style="color:' + (good ? '#5eead4' : '#8f9bd0') + '">' + (good ? '✓' : '○') + ' ' + t + '</div>';
        rules.innerHTML = row(lenOk, NAME_MIN + '–' + NAME_MAX + ' ký tự (đang có ' + n.length + ')') + row(hasL, 'Có ít nhất một chữ cái a–z') + row(hasD, 'Có ít nhất một chữ số 0–9') +
          '<div style="color:#6e7bb0">Chỉ dùng chữ a–z không dấu và số. Chữ hoa tự đổi thành chữ thường.</div>';
        const valid = validateName(n).ok;
        ok.disabled = !valid; ok.style.opacity = valid ? '1' : '.45';
      }
      input.addEventListener('input', () => { const p = normalizeName(input.value); if (p !== input.value) input.value = p; refresh(); });
      ['keydown', 'keyup', 'keypress'].forEach(t => input.addEventListener(t, e => e.stopPropagation()));
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); });
      ok.onclick = async () => {
        const v = validateName(input.value); if (!v.ok) return;
        ok.disabled = true; ok.style.opacity = '.45'; ok.textContent = 'Đang kiểm tra...';
        const r = await claimName(v.name);
        if (r.ok) return done(v.name);
        ok.textContent = 'Xác nhận'; refresh();
        const e = document.createElement('div'); e.style.cssText = 'color:#ff8a8a;font-weight:700'; e.textContent = r.error; rules.appendChild(e);
      };
      const skip = host.querySelector('#lbNameSkip'); if (skip) skip.onclick = () => done(null);
      input.addEventListener('focus', () => setTimeout(() => { try { ok.scrollIntoView({ block: 'nearest' }); } catch (e) {} }, 300));
      refresh(); setTimeout(() => { try { input.focus(); } catch (e) {} }, 60);
    });
  }

  // ---------- Hỏi tên trong game (một lần, khi lần đầu có điểm) ----------
  let asking = false;
  function maybeAskName() {
    if (asking || hasName() || safeGet(ASKED_KEY) || !document.body) return;
    asking = true;
    safeSet(ASKED_KEY, '1');   // trong game chỉ hỏi một lần; tên chính thức được hỏi khi vào trang chủ
    setTimeout(() => { askName({ required: false }).then(() => { asking = false; }); }, 900);
  }

  window.Scores = { submit, top, getName, setName, hasName, localTop, flushPending, games: GAMES, format, getUid, askName, validateName, normalizeName, claimName, ready };

  // Gửi lại các điểm còn chờ khi trang mở lại hoặc có mạng trở lại.
  if (readJson(PENDING_KEY, []).length) setTimeout(flushPending, 1500);
  window.addEventListener('online', flushPending);
})();
