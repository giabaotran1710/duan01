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
    initLive();
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


  // ================= Trang game: phát màn hình cho admin xem =================
  // /live/{uid} = { n, g, p, t } người đang chơi (nhịp 15 giây); /live_w/{uid}/{người xem} = giờ xem gần nhất;
  // chỉ khi có người xem mới chụp màn hình (html2canvas, ~1,5 khung/giây) gửi lên /live_f/{uid} = { i, t }.
  function initLive() {
    const id = uid();
    if (!/^[a-f0-9]{24,40}$/.test(id)) return;
    const name = () => myName() || ('khach' + id.slice(0, 4));
    if (name() === ADMIN) return;
    const put = (path, body, ka) => { try { return fetch(FIREBASE_URL + path + '.json', { method: body === null ? 'DELETE' : 'PUT', body: body === null ? undefined : JSON.stringify(body), keepalive: !!ka }).catch(() => {}); } catch (e) {} };
    const beat = () => { if (document.visibilityState === 'visible') put('/live/' + id, { n: name(), g: gameName(), p: pagePath(), t: { '.sv': 'timestamp' } }); };
    beat();
    setInterval(beat, 15000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') beat(); });
    window.addEventListener('pagehide', () => { put('/live/' + id, null, true); put('/live_f/' + id, null, true); });

    // người xem
    let watchers = {}, offset = 0, loop = null, busy = false, lib = null;
    const fresh = () => Object.values(watchers).some(t => typeof t === 'number' && Date.now() + offset - t < 25000);
    function listen() {
      const es = new EventSource(FIREBASE_URL + '/live_w/' + id + '.json');
      const apply = (path, data) => {
        const k = path.split('/').filter(Boolean);
        if (!k.length) watchers = data || {};
        else if (data == null) delete watchers[k[0]]; else watchers[k[0]] = data;
      };
      es.addEventListener('put', e => { try { const m = JSON.parse(e.data); apply(m.path, m.data); check(); } catch (err) {} });
      es.addEventListener('patch', e => { try { const m = JSON.parse(e.data); Object.keys(m.data || {}).forEach(k => apply(m.path.replace(/\/$/, '') + '/' + k, m.data[k])); check(); } catch (err) {} });
    }
    // đồng bộ giờ máy chủ (đọc lại mốc giờ vừa ghi) để biết người xem còn đang xem dù đồng hồ máy lệch
    setTimeout(() => fetch(FIREBASE_URL + '/live/' + id + '/t.json').then(r => r.json()).then(t => { if (typeof t === 'number') offset = t - Date.now(); }).catch(() => {}), 1200);
    setTimeout(listen, 1500);
    setInterval(check, 5000);
    function check() {
      const on = fresh();
      badge(on);
      if (on && !loop) { loop = true; shoot(); }
      if (!on && loop) { loop = null; put('/live_f/' + id, null); }
    }
    function loadLib() {
      if (lib) return lib;
      lib = new Promise((res, rej) => {
        if (window.html2canvas) return res(window.html2canvas);
        const sc = document.createElement('script');
        sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        sc.onload = () => res(window.html2canvas); sc.onerror = () => { lib = null; rej(); };
        document.head.appendChild(sc);
      });
      return lib;
    }
    async function shoot() {
      if (!loop || busy) return;
      busy = true;
      try {
        if (document.visibilityState === 'visible') {
          const h2c = await loadLib();
          const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight), sc = Math.min(1, 360 / w);
          const cv = await h2c(document.body, { scale: sc, width: w, height: h, x: window.scrollX, y: window.scrollY, windowWidth: w, windowHeight: h,
            backgroundColor: getComputedStyle(document.body).backgroundColor || '#000', logging: false, useCORS: true,
            ignoreElements: el => el.id === 'liveEye',
            // bản sao để chụp: bỏ mask-image (html2canvas không vẽ được) và đưa hiệu ứng CSS về trạng thái cuối (bản sao chạy lại hiệu ứng từ đầu nên phần tử mới hiện sẽ trong suốt)
            onclone: doc => { const st = doc.createElement('style'); st.textContent = '*,*::before,*::after{-webkit-mask-image:none!important;mask-image:none!important;animation-play-state:paused!important;animation-delay:-60s!important;transition:none!important}'; doc.head.appendChild(st); } });
          const img = cv.toDataURL('image/jpeg', .55);
          if (loop && img.length < 190000) await put('/live_f/' + id, { i: img, w, h, t: { '.sv': 'timestamp' } });
        }
        busy = false;
        if (loop) setTimeout(shoot, 650);
      } catch (e) { busy = false; if (loop) setTimeout(shoot, 4000); }   // lỗi tải thư viện / chụp: thử lại chậm hơn
    }
    // cho người chơi biết đang có người xem
    function badge(on) {
      let el = document.getElementById('liveEye');
      if (!on) { if (el) el.remove(); return; }
      if (el) return;
      el = document.createElement('div');
      el.id = 'liveEye';
      el.style.cssText = 'position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:2147483000;padding:3px 9px;border-radius:99px;' +
        'background:rgba(0,0,0,.55);color:#ff6b7a;font:700 11px/1.4 system-ui,sans-serif;pointer-events:none;display:flex;align-items:center;gap:5px';
      el.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:#ff3b52;box-shadow:0 0 6px #ff3b52"></span>Đang được xem';
      document.body.appendChild(el);
    }
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


  // ================= Trang chủ: nút Video (admin xem màn hình người đang chơi) =================
  function buildLiveAdmin() {
    if (document.getElementById('vidBtn')) return;
    const css = `
    #vidBtn{position:fixed;top:calc(24px + env(safe-area-inset-top,0px));right:calc(24px + 174px + env(safe-area-inset-right,0px));z-index:1000;
      color:#ff8a9a;font-size:19px;padding:0;border-radius:10px}
    #vidBtn i{filter:drop-shadow(0 0 5px rgba(255,120,140,.6))}
    #vidBtn .vidN{position:absolute;top:-7px;right:-9px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#2fbf71;color:#fff;
      font:700 11px/18px system-ui,sans-serif;text-align:center;display:none}
    #vidModal,#vidView{position:fixed;inset:0;z-index:2147483300;display:none;align-items:center;justify-content:center;background:rgba(3,6,16,.78);
      -webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:12px}
    #vidModal.show,#vidView.show{display:flex}
    .vidCard{width:100%;max-width:520px;max-height:min(80vh,640px);display:flex;flex-direction:column;background:#0d1226;border:1px solid #2c3762;border-radius:16px;
      color:#dfe5ff;box-shadow:0 24px 60px rgba(0,0,0,.55);overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    .vidHead{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #222c52;font-weight:800;font-size:15px}
    .vidHead .sub{font-weight:500;font-size:12px;color:#8f9bd0;margin-left:auto}
    .vidX{background:none;border:0;color:#9aa6d8;font-size:18px;cursor:pointer;padding:2px 6px}
    #vidList{flex:1;overflow:auto;padding:6px 0}
    .vidRow{display:flex;align-items:center;gap:10px;padding:9px 14px;font-size:14px}
    .vidRow:nth-child(odd){background:rgba(255,255,255,.03)}
    .vidRow .dot{width:8px;height:8px;border-radius:50%;background:#2fbf71;box-shadow:0 0 6px #2fbf71;flex:none}
    .vidRow .who{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .vidRow b{color:#7ee0c8}.vidRow em{font-style:normal;color:#ffd35a}
    .vidRow button{flex:none;border:0;border-radius:9px;padding:6px 12px;font:700 13px system-ui,sans-serif;color:#fff;background:#e0465c;cursor:pointer;display:flex;gap:6px;align-items:center}
    #vidList .msg{color:#8f9bd0;text-align:center;padding:24px 14px}
    #vidView .vidCard{max-width:min(96vw,480px);max-height:94vh}
    #vidStage{position:relative;flex:1;min-height:0;display:flex;align-items:center;justify-content:center;background:#000}
    #vidImg{max-width:100%;max-height:calc(94vh - 60px);display:block}
    #vidWait{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8f9bd0;font-size:13px;text-align:center;padding:20px}
    #vidLive{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;color:#ff5a6e;letter-spacing:.1em}
    #vidLive i{width:7px;height:7px;border-radius:50%;background:#ff3b52;box-shadow:0 0 6px #ff3b52}`;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const btn = document.createElement('button');
    btn.id = 'vidBtn'; btn.type = 'button'; btn.className = 'toggle-btn'; btn.title = 'Xem người đang chơi';
    btn.innerHTML = '<i class="fa-solid fa-video"></i><span class="vidN"></span>';
    document.body.appendChild(btn);
    const modal = document.createElement('div'); modal.id = 'vidModal';
    modal.innerHTML = '<div class="vidCard"><div class="vidHead"><i class="fa-solid fa-video"></i> Đang chơi<span class="sub" id="vidSub"></span>' +
      '<button class="vidX" id="vidX" type="button" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div><div id="vidList"></div></div>';
    document.body.appendChild(modal);
    const view = document.createElement('div'); view.id = 'vidView';
    view.innerHTML = '<div class="vidCard"><div class="vidHead"><span id="vidLive"><i></i>LIVE</span><span id="vidWho" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>' +
      '<button class="vidX" id="vidVX" type="button" aria-label="Đóng" style="margin-left:auto"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div id="vidStage"><img id="vidImg" alt=""><div id="vidWait">Đang kết nối...</div></div></div>';
    document.body.appendChild(view);
    const list = modal.querySelector('#vidList'), sub = modal.querySelector('#vidSub'), count = btn.querySelector('.vidN');

    let players = {}, offset = 0, lastHtml = '';
    const me = uid();
    // giờ máy chủ: ghi một mốc giờ rồi đọc lại
    fetch(FIREBASE_URL + '/live_w/' + me + '/_.json', { method: 'PUT', body: JSON.stringify({ '.sv': 'timestamp' }) })
      .then(() => fetch(FIREBASE_URL + '/live_w/' + me + '/_.json')).then(r => r.json())
      .then(t => { if (typeof t === 'number') offset = t - Date.now(); fetch(FIREBASE_URL + '/live_w/' + me + '.json', { method: 'DELETE' }).catch(() => {}); }).catch(() => {});
    const now = () => Date.now() + offset;
    const live = () => Object.entries(players).filter(([k, p]) => p && k !== me && p.n !== ADMIN && typeof p.t === 'number' && now() - p.t < 45000)
      .sort((a, b) => String(a[1].n).localeCompare(String(b[1].n)));
    function render() {
      const v = live();
      count.style.display = v.length ? 'block' : 'none'; count.textContent = v.length;
      sub.textContent = v.length + ' người';
      if (!modal.classList.contains('show')) return;
      const html = v.length ? v.map(([k, p]) => '<div class="vidRow"><span class="dot"></span><span class="who"><b>' + esc(p.n) + '</b> đang chơi <em>' + esc(p.g) + '</em></span>' +
        '<button type="button" data-u="' + esc(k) + '"><i class="fa-solid fa-eye"></i>Xem</button></div>').join('')
        : '<div class="msg">Hiện không có ai đang chơi.</div>';
      // chỉ vẽ lại khi nội dung đổi: vẽ lại liên tục làm nút Xem bị thay mới giữa lúc bấm, mất cú chạm
      if (html !== lastHtml) { lastHtml = html; list.innerHTML = html; }
    }
    function apply(path, data) {
      const k = path.split('/').filter(Boolean);
      if (!k.length) players = data || {};
      else if (k.length === 1) { if (data == null) delete players[k[0]]; else players[k[0]] = data; }
      else { const r = players[k[0]] = players[k[0]] || {}; r[k[1]] = data; }
    }
    const es = new EventSource(FIREBASE_URL + '/live.json');
    es.addEventListener('put', e => { try { const m = JSON.parse(e.data); apply(m.path, m.data); render(); } catch (err) {} });
    es.addEventListener('patch', e => { try { const m = JSON.parse(e.data); Object.keys(m.data || {}).forEach(k => apply(m.path.replace(/\/$/, '') + '/' + k, m.data[k])); render(); } catch (err) {} });
    setInterval(render, 5000);
    // dọn người chơi đã thoát mà không kịp xoá
    setTimeout(() => Object.entries(players).forEach(([k, p]) => { if (!p || typeof p.t !== 'number' || now() - p.t > 600000) fetch(FIREBASE_URL + '/live/' + k + '.json', { method: 'DELETE' }).catch(() => {}); }), 8000);

    // xem một người
    let watching = null, wes = null, hb = null, lastFrame = 0, stale = null;
    function watch(k) {
      stop();
      watching = k;
      const p = players[k] || {};
      view.querySelector('#vidWho').innerHTML = '<b style="color:#7ee0c8">' + esc(p.n) + '</b> <span style="color:#8f9bd0;font-weight:500">·</span> <em style="font-style:normal;color:#ffd35a">' + esc(p.g) + '</em>';
      const img = view.querySelector('#vidImg'), wait = view.querySelector('#vidWait');
      img.removeAttribute('src'); wait.textContent = 'Đang kết nối...'; wait.style.display = 'flex';
      modal.classList.remove('show'); view.classList.add('show');
      const ping = () => fetch(FIREBASE_URL + '/live_w/' + k + '/' + me + '.json', { method: 'PUT', body: JSON.stringify({ '.sv': 'timestamp' }) }).catch(() => {});
      ping(); hb = setInterval(ping, 8000);
      wes = new EventSource(FIREBASE_URL + '/live_f/' + k + '.json');
      const show = d => { if (d && typeof d.i === 'string' && d.i.startsWith('data:image/')) { img.src = d.i; wait.style.display = 'none'; lastFrame = Date.now(); } };
      wes.addEventListener('put', e => { try { const m = JSON.parse(e.data); if (m.path === '/') show(m.data); else if (m.path === '/i') show({ i: m.data }); } catch (err) {} });
      wes.addEventListener('patch', e => { try { const m = JSON.parse(e.data); if (m.data && m.data.i) show(m.data); } catch (err) {} });
      stale = setInterval(() => {
        const p2 = players[k];
        if (!p2 || now() - p2.t > 45000) { wait.textContent = 'Người chơi đã thoát.'; wait.style.display = 'flex'; }
        else if (Date.now() - lastFrame > 8000) { wait.textContent = lastFrame ? 'Người chơi đang ẩn trang...' : 'Đang chờ hình ảnh...'; wait.style.display = 'flex'; }
      }, 2000);
    }
    function stop() {
      if (wes) wes.close(); wes = null; clearInterval(hb); clearInterval(stale);
      if (watching) fetch(FIREBASE_URL + '/live_w/' + watching + '/' + me + '.json', { method: 'DELETE', keepalive: true }).catch(() => {});
      watching = null; lastFrame = 0;
    }
    list.addEventListener('click', e => { const b = e.target.closest('button[data-u]'); if (b) watch(b.getAttribute('data-u')); });
    const closeView = () => { stop(); view.classList.remove('show'); modal.classList.add('show'); render(); };
    view.querySelector('#vidVX').onclick = closeView;
    view.addEventListener('click', e => { if (e.target === view) closeView(); });
    const close = () => modal.classList.remove('show');
    btn.onclick = () => { modal.classList.add('show'); render(); };
    modal.querySelector('#vidX').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (view.classList.contains('show')) closeView(); else if (modal.classList.contains('show')) close(); });
    window.addEventListener('pagehide', stop);
  }

  function buildAdmin() {
    if (document.getElementById('admBtn')) return;
    buildLiveAdmin();
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
