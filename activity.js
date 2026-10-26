// Nhật ký hoạt động chơi game.
// - Trong trang game: ghi 1 dòng mỗi lần vào game và mỗi lần bấm chơi lại / ván mới.
// - Trên trang chủ: nút cờ lê (chỉ tài khoản admin thấy) mở danh sách hoạt động hôm nay của người chơi khác.
// Dữ liệu: /activity/{ngày theo giờ VN, YYYYMMDD}/{id} = { u, n, g, t }. Danh sách tự đổi sang ngày mới lúc 0:00.
(function () {
  'use strict';
  if (window.__activity) return;
  window.__activity = true;

  const FIREBASE_URL = (window.SCORE_FIREBASE_URL || 'https://giabao-f4854-default-rtdb.firebaseio.com').replace(/\/+$/, '');
  const ADMIN = 'giabao1710';
  const TZ_MS = 7 * 3600 * 1000;   // giờ Việt Nam (UTC+7)
  const safeGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ssGet = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };

  function uid() {
    if (window.Scores && Scores.getUid) return Scores.getUid();
    let id = safeGet('lb_uid');
    if (!/^[a-f0-9]{24,40}$/.test(id || '')) {   // giống scores.js: tạo mã người chơi nếu chưa có
      try {
        const a = new Uint8Array(16); crypto.getRandomValues(a);
        id = Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
        localStorage.setItem('lb_uid', id);
      } catch (e) { return ''; }
    }
    return id;
  }
  const myName = () => (safeGet('player_name') || '').trim();
  const pad = n => String(n).padStart(2, '0');
  function vnParts(ms) {
    const d = new Date(ms + TZ_MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds() };
  }
  const dayKey = ms => { const p = vnParts(ms); return '' + p.y + pad(p.m) + pad(p.d); };
  const pagePath = () => location.pathname.replace(/^\/+/, '').replace(/\.html$/, '').replace(/\/index$/, '');

  const isHome = !!document.querySelector('.games-grid');
  if (isHome) initHome(); else initGame();

  // ================= Trang game: ghi log =================
  function gameName() {
    const saved = ssGet('act_name:' + pagePath());
    if (saved) return saved;
    return (document.title || pagePath()).replace(/[—–|:].*$/, '').replace(/[^\p{L}\p{N}\s!&.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40) || pagePath();
  }
  function initGame() {
    let last = 0, absorbStart = true;
    const loadedAt = Date.now();
    function log() {
      const now = Date.now();
      if (now - last < 3000) return;
      last = now;
      const id = uid();
      if (!/^[a-f0-9]{24,40}$/.test(id)) return;
      const body = { u: id, n: myName() || ('khach' + id.slice(0, 4)), g: gameName(), t: { '.sv': 'timestamp' } };
      try {
        fetch(FIREBASE_URL + '/activity/' + dayKey(now) + '.json', { method: 'POST', body: JSON.stringify(body), keepalive: true }).catch(() => {});
      } catch (e) {}
    }
    // vào game = bấm chơi từ trang chủ
    log();
    const REPLAY = /^(chơi lại|choi lai|ván mới|van moi|ván tiếp|chơi tiếp|chơi ván mới|thử lại|làm lại|bắt đầu lại|chơi lượt mới|restart|replay|play again|retry|new game|try again)/i;
    const START = /^(chơi|bắt đầu|play|start|vào chơi|chơi ngay|với máy|hai người|người vs|1 người|2 người)/i;
    document.addEventListener('click', e => {
      const el = e.target.closest && e.target.closest('button, a, [role="button"], .btn, input[type="button"]');
      if (!el) return;
      const label = ((el.innerText || el.value || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('aria-label') || ''))
        .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
      if (REPLAY.test(label)) { absorbStart = false; log(); return; }
      if (START.test(label)) {
        // lần bấm "Bắt đầu" đầu tiên ngay sau khi vào game thuộc cùng lượt vào game, không tính thêm
        if (absorbStart && Date.now() - loadedAt < 90000) { absorbStart = false; return; }
        absorbStart = false; log();
      }
    }, true);
  }

  // ================= Trang chủ: nút admin =================
  function initHome() {
    // nhớ tên game theo đường dẫn khi mở từ trang chủ để log hiện đúng tên
    const hook = () => {
      const nav = window.navigateToGame;
      if (typeof nav !== 'function' || nav.__act) return !!nav;
      const wrapped = function (url, name) {
        try { const p = new URL(url, location.href).pathname.replace(/^\/+/, '').replace(/\.html$/, ''); ssSet('act_name:' + p, String(name || '').replace(/<[^>]*>/g, '').trim()); } catch (e) {}
        return nav.apply(this, arguments);
      };
      wrapped.__act = true;
      window.navigateToGame = wrapped;
      return true;
    };
    if (!hook()) { const t = setInterval(() => { if (hook()) clearInterval(t); }, 300); setTimeout(() => clearInterval(t), 15000); }

    const isAdmin = () => myName() === ADMIN && safeGet('lb_name_claimed') === ADMIN;
    const ready = (window.Scores && Scores.ready) || Promise.resolve();
    ready.then(() => { if (isAdmin()) buildAdmin(); });
    // vừa đặt tên xong (hộp hỏi tên) thì kiểm tra lại
    const recheck = setInterval(() => { if (isAdmin()) { clearInterval(recheck); buildAdmin(); } }, 2000);
    setTimeout(() => clearInterval(recheck), 600000);
  }

  function buildAdmin() {
    if (document.getElementById('admBtn')) return;
    const css = `
    #admBtn{position:fixed;top:calc(24px + env(safe-area-inset-top,0px));right:calc(24px + 116px + env(safe-area-inset-right,0px));z-index:1000;
      color:#9fd8ff;font-size:19px;padding:0;border-radius:10px}
    #admBtn i{filter:drop-shadow(0 0 5px rgba(120,200,255,.6))}
    #admBtn .admN{position:absolute;top:-7px;right:-9px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#ff4d6d;color:#fff;
      font:700 11px/18px system-ui,sans-serif;text-align:center;display:none}
    #admModal{position:fixed;inset:0;z-index:2147483300;display:none;align-items:center;justify-content:center;background:rgba(3,6,16,.72);
      -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:12px}
    #admModal.show{display:flex}
    #admCard{width:100%;max-width:640px;height:min(80vh,640px);display:flex;flex-direction:column;background:#0d1226;border:1px solid #2c3762;border-radius:16px;
      color:#dfe5ff;box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    #admHead{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #222c52;font-weight:800;font-size:15px}
    #admHead .sub{font-weight:500;font-size:12px;color:#8f9bd0;margin-left:auto}
    #admX{background:none;border:0;color:#9aa6d8;font-size:18px;cursor:pointer;padding:2px 6px}
    #admList{flex:1;overflow:auto;padding:6px 0;font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
    #admList div{white-space:nowrap;padding:0 14px}
    #admList div:nth-child(odd){background:rgba(255,255,255,.025)}
    #admList b{color:#7ee0c8;font-weight:700}#admList em{font-style:normal;color:#ffd35a}#admList span{color:#8f9bd0}
    #admList .msg{color:#8f9bd0;text-align:center;padding:24px 14px;white-space:normal}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    const btn = document.createElement('button');
    btn.id = 'admBtn'; btn.type = 'button'; btn.className = 'toggle-btn'; btn.title = 'Hoạt động người chơi';
    btn.innerHTML = '<i class="fa-solid fa-wrench"></i><span class="admN"></span>';
    document.body.appendChild(btn);
    const modal = document.createElement('div');
    modal.id = 'admModal';
    modal.innerHTML = '<div id="admCard"><div id="admHead"><i class="fa-solid fa-wrench"></i> Hoạt động hôm nay<span class="sub" id="admSub"></span>' +
      '<button id="admX" type="button" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div><div id="admList"></div></div>';
    document.body.appendChild(modal);
    const list = modal.querySelector('#admList'), sub = modal.querySelector('#admSub'), badge = btn.querySelector('.admN');

    let rows = {}, day = '', es = null, seen = 0;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const fmt = ms => { const p = vnParts(ms); return p.d + '/' + p.m + '/' + String(p.y).slice(-2) + ' ' + pad(p.h) + ':' + pad(p.mi) + ':' + pad(p.s); };
    function visible() {
      const me = uid();
      return Object.values(rows).filter(r => r && r.u !== me && r.n !== ADMIN && typeof r.t === 'number').sort((a, b) => b.t - a.t);
    }
    function render() {
      const v = visible();
      sub.textContent = v.length + ' lượt';
      const unseen = v.filter(r => r.t > seen).length;
      badge.style.display = unseen && !modal.classList.contains('show') ? 'block' : 'none';
      badge.textContent = unseen > 99 ? '99+' : unseen;
      if (!modal.classList.contains('show')) return;
      list.innerHTML = v.length ? v.map(r => '<div><b>' + esc(r.n) + '</b> play <em>' + esc(r.g) + '</em> <span>on ' + fmt(r.t) + '</span></div>').join('')
        : '<div class="msg">Chưa có hoạt động nào hôm nay.</div>';
    }
    // đường dẫn trong sự kiện: "/" = cả ngày, "/{id}" = một dòng, "/{id}/x" = một trường
    function apply(path, data) {
      const parts = path.split('/').filter(Boolean);
      if (!parts.length) rows = data || {};
      else if (parts.length === 1) { if (data == null) delete rows[parts[0]]; else rows[parts[0]] = data; }
      else { const r = rows[parts[0]] = rows[parts[0]] || {}; r[parts[1]] = data; }
    }
    function connect() {
      if (es) es.close();
      day = dayKey(Date.now()); rows = {};
      list.innerHTML = '<div class="msg">Đang tải...</div>';
      es = new EventSource(FIREBASE_URL + '/activity/' + day + '.json');
      const on = e => { try { const m = JSON.parse(e.data); apply(m.path, m.data); render(); } catch (err) {} };
      es.addEventListener('put', on);
      es.addEventListener('patch', e => { try { const m = JSON.parse(e.data); const base = m.path.replace(/\/$/, ''); Object.keys(m.data || {}).forEach(k => apply(base + '/' + k, m.data[k])); render(); } catch (err) {} });
      es.onerror = () => { if (es.readyState === 2) list.innerHTML = '<div class="msg">Không kết nối được máy chủ.</div>'; };
      cleanup();
    }
    // xoá dữ liệu các ngày trước (danh sách reset lúc 0:00)
    async function cleanup() {
      try {
        const keys = await (await fetch(FIREBASE_URL + '/activity.json?shallow=true')).json();
        Object.keys(keys || {}).filter(k => k < day).forEach(k => fetch(FIREBASE_URL + '/activity/' + k + '.json', { method: 'DELETE' }).catch(() => {}));
      } catch (e) {}
    }
    // sang ngày mới thì đổi danh sách
    setInterval(() => { if (dayKey(Date.now()) !== day) connect(); }, 15000);
    connect();

    const open = () => { modal.classList.add('show'); seen = Date.now() + 60000; render(); list.scrollTop = 0; };
    const close = () => { modal.classList.remove('show'); seen = Date.now(); render(); };
    btn.onclick = open;
    modal.querySelector('#admX').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });
  }
})();
