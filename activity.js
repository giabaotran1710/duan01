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
    // vào game = bấm chơi từ trang chủ (game đang bảo trì thì không tính)
    const mtId = (document.querySelector('script[data-game]') || {}).getAttribute ? document.querySelector('script[data-game]').getAttribute('data-game') : '';
    const inMaintenance = () => { try { return !!(mtId && window.gameMaintenance && gameMaintenance.isOff(mtId)); } catch (e) { return false; } };
    const mtReady = (window.gameMaintenance && gameMaintenance.ready) || Promise.resolve();
    mtReady.then(() => { if (!inMaintenance()) log(); });
    const REPLAY = /^(chơi lại|choi lai|ván mới|van moi|ván tiếp|chơi tiếp|chơi ván mới|thử lại|làm lại|bắt đầu lại|chơi lượt mới|màn sau|màn tiếp|qua màn|restart|replay|play again|retry|new game|try again|next)/i;
    const REPLAY_ID = /(restart|reset|again|retry|replay|newgame|new-game|btnnew|playagain|nextlevel|nextbtn)/i;
    const START = /^(chơi|bắt đầu|play|start|vào chơi|chơi ngay|với máy|hai người|người vs|1 người|2 người|đấu|solo)/i;
    const NOT_PLAY = /(trang chủ|menu|thoát|quay lại|về |home|back|exit|xem lại|bảng xếp hạng|luật|cài đặt|âm thanh|tạm dừng|pause|đóng|close)/i;
    // game vừa kết thúc (có gửi điểm): lần chạm kế tiếp (không phải nút thoát) là bắt đầu ván mới, kể cả game chạm màn hình để chơi lại
    let ended = 0;
    const hookSubmit = () => {
      if (!(window.Scores && Scores.submit) || Scores.submit.__act) return !!(window.Scores && Scores.submit);
      const orig = Scores.submit;
      Scores.submit = function () { ended = Date.now(); return orig.apply(this, arguments); };
      Scores.submit.__act = true;
      return true;
    };
    if (!hookSubmit()) { const t = setInterval(() => { if (hookSubmit()) clearInterval(t); }, 300); setTimeout(() => clearInterval(t), 10000); }
    document.addEventListener('click', e => {
      if (inMaintenance()) return;
      const el = e.target.closest && e.target.closest('button, a, [role="button"], .btn, input[type="button"]');
      const label = el ? ((el.innerText || el.value || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('aria-label') || ''))
        .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim() : '';
      const ident = el ? (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '') : '';
      if (el && NOT_PLAY.test(label)) { ended = 0; return; }
      if (el && (REPLAY.test(label) || REPLAY_ID.test(ident))) { absorbStart = false; ended = 0; log(); return; }
      if (el && START.test(label)) {
        // lần bấm "Bắt đầu" đầu tiên ngay sau khi vào game thuộc cùng lượt vào game, không tính thêm
        if (absorbStart && Date.now() - loadedAt < 90000) { absorbStart = false; return; }
        absorbStart = false; ended = 0; log(); return;
      }
      if (ended && Date.now() - ended > 500) { ended = 0; log(); }
    }, true);
    // game chơi bằng chạm/chạm giữ trên canvas (không có nút): pointerdown đầu tiên sau khi kết thúc
    document.addEventListener('pointerdown', e => {
      if (!ended || Date.now() - ended < 500 || inMaintenance()) return;
      if (e.target.closest && e.target.closest('button, a, [role="button"], .btn, input')) return;   // nút đã được xử lý ở click
      ended = 0; log();
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
    ready.then(() => { if (isAdmin()) { buildAdmin(); buildManager(); } });
    // vừa đặt tên xong (hộp hỏi tên) thì kiểm tra lại
    const recheck = setInterval(() => { if (isAdmin()) { clearInterval(recheck); buildAdmin(); buildManager(); } }, 2000);
    setTimeout(() => clearInterval(recheck), 600000);
  }


  // ================= Nút quản trị: danh sách người chơi + cấm =================
  // Chỉ hiện khi tên admin (giabao1710) thuộc về đúng mã người chơi của máy này trên máy chủ (/names/giabao1710 == uid).
  // Cấm = ghi /bans/{uid} = { k, b: { on, n, t } }. Luật Firebase chỉ nhận khi k bắt đầu bằng "{admin/key}:" (admin/key là
  // một chuỗi bí mật bạn tự đặt trong Firebase Console → Data, tối thiểu 16 ký tự) và k phải khác giá trị cũ ở mỗi lần ghi.
  // Mã quản trị nhập một lần, chỉ lưu trên máy admin (localStorage adm_key), không nằm trong mã nguồn.
  // Người bị cấm: maintenance.js chặn mọi trò chơi; scores.js + luật Firebase chặn đổi tên và ghi điểm.
  function buildManager() {
    if (document.getElementById('mgrBtn') || buildManager.pending) return;
    buildManager.pending = true;
    fetch(FIREBASE_URL + '/names/' + ADMIN + '.json', { cache: 'no-store' }).then(r => r.json()).then(owner => {
      buildManager.pending = false;
      if (owner && owner === uid()) mountManager();
    }).catch(() => { buildManager.pending = false; });
  }
  function mountManager() {
    if (document.getElementById('mgrBtn')) return;
    const css = `
    #mgrBtn{position:fixed;top:calc(24px + env(safe-area-inset-top,0px));right:calc(24px + 174px + env(safe-area-inset-right,0px));z-index:1000;
      color:#ffb3c0;font-size:19px;padding:0;border-radius:10px}
    #mgrBtn i{filter:drop-shadow(0 0 5px rgba(255,120,150,.6))}
    #mgrModal{position:fixed;inset:0;z-index:2147483300;display:none;align-items:center;justify-content:center;background:rgba(3,6,16,.72);
      -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:12px}
    #mgrModal.show{display:flex}
    #mgrCard{width:100%;max-width:560px;height:min(82vh,680px);display:flex;flex-direction:column;background:#0d1226;border:1px solid #2c3762;border-radius:16px;
      color:#dfe5ff;box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    #mgrHead{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #222c52;font-weight:800;font-size:15px}
    #mgrHead .sub{font-weight:500;font-size:12px;color:#8f9bd0;margin-left:auto}
    #mgrX,#mgrReload,#mgrKeyBtn{background:none;border:0;color:#9aa6d8;font-size:16px;cursor:pointer;padding:6px 8px;min-width:36px;min-height:36px}
    #mgrTools{display:flex;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid #1b2347}
    #mgrSearch,#mgrKey{flex:1;min-width:0;background:#141b3a;border:1px solid #2c3762;border-radius:10px;color:#e8ecff;padding:9px 12px;font:14px system-ui,sans-serif;outline:none}
    #mgrSearch:focus,#mgrKey:focus{border-color:#6d7cff}
    #mgrKeyRow{display:none;gap:6px;padding:8px 10px;background:#1a1530;border-bottom:1px solid #3a2a5a;align-items:center}
    #mgrKeyRow.show{display:flex}
    #mgrKeyRow span{font-size:12px;color:#d9b8ff;flex:none}
    #mgrKeySave{flex:none;border:0;border-radius:10px;padding:9px 14px;background:#7c5cff;color:#fff;font-weight:700;cursor:pointer;min-height:38px}
    #mgrList{flex:1;overflow:auto;padding:4px 0}
    #mgrList .r{display:flex;align-items:center;gap:10px;padding:8px 14px;min-height:48px}
    #mgrList .r:nth-child(odd){background:rgba(255,255,255,.025)}
    #mgrList .nm{font:700 14px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#7ee0c8;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #mgrList .tag{font-size:11px;font-weight:800;color:#fff;background:#d6294a;border-radius:999px;padding:3px 9px;flex:none}
    #mgrList .me{font-size:12px;color:#8f9bd0;flex:none}
    #mgrList .r.banned .nm{color:#ff8a98;text-decoration:line-through;text-decoration-thickness:1.5px}
    #mgrList button.bn{flex:none;min-width:84px;min-height:38px;border-radius:10px;border:1px solid #6a2a3a;background:#3a1220;color:#ff9aaa;font-weight:700;font-size:13px;cursor:pointer}
    #mgrList button.bn.un{border-color:#2a6a4a;background:#0f2a1f;color:#7ee0a8}
    #mgrList button.bn:disabled{opacity:.5;cursor:default}
    #mgrList .msg{color:#8f9bd0;text-align:center;padding:26px 14px;white-space:normal;font-size:14px}
    #mgrToast{padding:8px 14px;font-size:13px;color:#ffd35a;border-top:1px solid #222c52;min-height:34px}
    #mgrToast.err{color:#ff8a98}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    const btn = document.createElement('button');
    btn.id = 'mgrBtn'; btn.type = 'button'; btn.className = 'toggle-btn'; btn.title = 'Quản lý người chơi';
    btn.innerHTML = '<i class="fa-solid fa-user-shield"></i>';
    document.body.appendChild(btn);
    const modal = document.createElement('div');
    modal.id = 'mgrModal';
    modal.innerHTML = '<div id="mgrCard"><div id="mgrHead"><i class="fa-solid fa-user-shield"></i> Quản lý người chơi<span class="sub" id="mgrSub"></span>' +
      '<button id="mgrX" type="button" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div id="mgrTools"><input id="mgrSearch" type="search" placeholder="Tìm tên người chơi..." autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<button id="mgrKeyBtn" type="button" title="Mã quản trị" aria-label="Mã quản trị"><i class="fa-solid fa-key"></i></button>' +
      '<button id="mgrReload" type="button" title="Tải lại" aria-label="Tải lại"><i class="fa-solid fa-rotate"></i></button></div>' +
      '<div id="mgrKeyRow"><span>Mã quản trị</span><input id="mgrKey" type="password" autocomplete="off" placeholder="giá trị admin/key trong Firebase"><button id="mgrKeySave" type="button">Lưu</button></div>' +
      '<div id="mgrList"></div><div id="mgrToast"></div></div>';
    document.body.appendChild(modal);
    const $ = id => modal.querySelector('#' + id);
    const list = $('mgrList'), sub = $('mgrSub'), toast = $('mgrToast'), search = $('mgrSearch'), keyRow = $('mgrKeyRow'), keyIn = $('mgrKey');
    const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const say = (t, err) => { toast.textContent = t || ''; toast.className = err ? 'err' : ''; };

    let people = [], bans = {}, loadId = 0;   // people: [{ name, uid }]; bans: uid -> true | false (chưa biết = undefined)
    const me = uid();
    const hasKey = () => !!safeGet('adm_key');
    function showKeyRow(on) { keyRow.classList.toggle('show', on); if (on) setTimeout(() => keyIn.focus(), 30); }

    function render() {
      const q = search.value.trim().toLowerCase();
      const rows = people.filter(p => !q || p.name.includes(q));
      const nBan = people.filter(p => bans[p.uid] === true).length;
      sub.textContent = people.length + ' người' + (nBan ? ' · ' + nBan + ' bị cấm' : '');
      if (!people.length) { list.innerHTML = '<div class="msg">Chưa có người chơi nào.</div>'; return; }
      if (!rows.length) { list.innerHTML = '<div class="msg">Không có tên nào khớp.</div>'; return; }
      list.innerHTML = rows.map(p => {
        const self = p.name === ADMIN || p.uid === me, b = bans[p.uid] === true;
        return '<div class="r' + (b ? ' banned' : '') + '" data-u="' + esc(p.uid) + '"><span class="nm">' + esc(p.name) + '</span>' +
          (b ? '<span class="tag">ĐÃ CẤM</span>' : '') +
          (self ? '<span class="me">quản trị</span>' : '<button type="button" class="bn' + (b ? ' un' : '') + '" data-a="' + (b ? 'un' : 'ban') + '"' + (bans[p.uid] === undefined ? ' disabled' : '') + '>' + (b ? 'Bỏ cấm' : 'Cấm') + '</button>') + '</div>';
      }).join('');
    }

    async function loadBans(id) {
      const queue = people.slice(), workers = Array.from({ length: 8 }, async () => {
        while (queue.length && id === loadId) {
          const p = queue.shift();
          try {
            const r = await fetch(FIREBASE_URL + '/bans/' + p.uid + '/b.json?t=' + Date.now(), { cache: 'no-store' });
            const b = r.ok ? await r.json() : null;
            bans[p.uid] = !!(b && b.on === true);
          } catch (e) { bans[p.uid] = false; }
          if (id === loadId) render();
        }
      });
      await Promise.all(workers);
    }
    async function load() {
      const id = ++loadId; bans = {}; say('');
      list.innerHTML = '<div class="msg">Đang tải danh sách...</div>';
      try {
        const r = await fetch(FIREBASE_URL + '/names.json?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error('http ' + r.status);
        const data = (await r.json()) || {};
        people = Object.keys(data).filter(n => typeof data[n] === 'string').sort().map(n => ({ name: n, uid: data[n] }));
      } catch (e) {
        list.innerHTML = '<div class="msg">Không tải được danh sách. Nếu vừa cập nhật mã nguồn, hãy dán luật mới (database.rules.json) vào Firebase Console rồi nhấn Xuất bản.</div>'; return;
      }
      render();
      loadBans(id);
    }

    async function setBan(p, on) {
      const key = safeGet('adm_key');
      if (!key) { showKeyRow(true); say('Hãy nhập mã quản trị trước.', true); return; }
      if (on && !confirm('Cấm "' + p.name + '"?\nNgười này sẽ không vào được mọi trò chơi và không đổi tên được.')) return;
      const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      const body = { k: key + ':' + nonce, b: { on, n: p.name, t: { '.sv': 'timestamp' } } };
      bans[p.uid] = undefined; render(); say((on ? 'Đang cấm ' : 'Đang bỏ cấm ') + p.name + '...');
      try {
        const r = await fetch(FIREBASE_URL + '/bans/' + p.uid + '.json', { method: 'PUT', body: JSON.stringify(body) });
        if (r.ok) { bans[p.uid] = on; say((on ? 'Đã cấm ' : 'Đã bỏ cấm ') + p.name + '.'); }
        else {
          bans[p.uid] = !on;
          if (r.status === 401 || r.status === 403) { say('Bị từ chối. Kiểm tra: (1) đã Publish luật Firebase mới nhất chưa; (2) admin/key trên Firebase khớp từng ký tự với mã đã lưu (không thừa dấu cách, xuống dòng hay ngoặc kép).', true); showKeyRow(true); }
          else say('Lỗi máy chủ (' + r.status + '). Thử lại sau.', true);
        }
      } catch (e) { bans[p.uid] = !on; say('Không kết nối được máy chủ.', true); }
      render();
    }

    list.addEventListener('click', e => {
      const b = e.target.closest('button.bn'); if (!b || b.disabled) return;
      const u = b.closest('.r').getAttribute('data-u'), p = people.find(x => x.uid === u);
      if (p) setBan(p, b.getAttribute('data-a') === 'ban');
    });
    search.addEventListener('input', render);
    ['keydown', 'keyup', 'keypress'].forEach(t => modal.addEventListener(t, e => { if (e.key !== 'Escape') e.stopPropagation(); }));
    $('mgrReload').onclick = load;
    $('mgrKeyBtn').onclick = () => showKeyRow(!keyRow.classList.contains('show'));
    $('mgrKeySave').onclick = () => {
      const v = keyIn.value.trim();
      if (v.length < 16) { say('Mã quản trị tối thiểu 16 ký tự.', true); return; }
      try { localStorage.setItem('adm_key', v); } catch (e) {}
      keyIn.value = ''; showKeyRow(false); say('Đã lưu mã quản trị trên máy này.');
    };
    const open = () => { modal.classList.add('show'); search.value = ''; showKeyRow(!hasKey()); load(); };
    const close = () => modal.classList.remove('show');
    btn.onclick = open;
    $('mgrX').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });
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

// Rung nhẹ khi bấm nút (phản hồi chạm trên điện thoại); tôn trọng chế độ giảm chuyển động
(function () {
  if (!navigator.vibrate || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  let last = 0;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const b = e.target.closest && e.target.closest('button:not(:disabled), [role="button"], .btn');
    const now = Date.now();
    if (!b || now - last < 60) return;
    last = now;
    try { navigator.vibrate(8); } catch (err) {}
  }, true);
})();
