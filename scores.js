// Thư viện lưu điểm dùng chung cho các game.
//
//   Scores.submit('nedan', 1234)   -> lưu điểm (server nếu có, luôn lưu cả máy)
//   Scores.top('nedan', 10)        -> Promise<{ online, scores: [{ name, score, at }] }>
//   Scores.getName() / Scores.setName('Bảo')
//
// Địa chỉ server: mặc định là cùng trang web (/api). Có thể đổi bằng
//   window.SCORE_API_BASE = 'https://server-cua-ban.com'  (trước khi nạp file này)
// hoặc localStorage.setItem('score_api_base', 'https://server-cua-ban.com').
// Khi không gọi được server (ví dụ trang chạy trên GitHub Pages), điểm vẫn được
// lưu trong localStorage và sẽ tự gửi lại lên server khi kết nối được.
(function () {
  'use strict';

  const NAME_KEY = 'player_name';
  const LOCAL_KEY = 'scores_local_v1';
  const PENDING_KEY = 'scores_pending_v1';
  const LOCAL_MAX = 20;
  const TIMEOUT_MS = 4000;

  function safeGet(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function safeSet(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function readJson(key, fallback) {
    try { const v = JSON.parse(safeGet(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }

  function apiBase() {
    const b = window.SCORE_API_BASE || safeGet('score_api_base') || '';
    return b.replace(/\/+$/, '');
  }

  function getName() {
    return (safeGet(NAME_KEY) || '').trim() || 'Người chơi';
  }
  function setName(name) {
    const n = String(name || '').replace(/[<>]/g, '').trim().slice(0, 20);
    if (n) safeSet(NAME_KEY, n);
    return getName();
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

  // ---------- Gọi server ----------
  async function request(path, options) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(apiBase() + path, Object.assign({ signal: ctrl && ctrl.signal }, options));
      const type = res.headers.get('content-type') || '';
      // Trên hosting tĩnh, /api trả về trang 404 HTML -> coi như không có server.
      if (!type.includes('application/json')) throw new Error('no_server');
      const body = await res.json();
      if (!res.ok) { const err = new Error(body.error || 'http_' + res.status); err.status = res.status; throw err; }
      return body;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function postScore(entry) {
    return request('/api/scores/' + encodeURIComponent(entry.game), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: entry.name, score: entry.score }),
    });
  }

  // Lỗi do dữ liệu (400) thì bỏ, không gửi lại mãi; lỗi mạng / quá tải thì giữ lại.
  function isPermanent(err) { return err && err.status >= 400 && err.status < 500 && err.status !== 429; }

  let flushing = false;
  async function flushPending() {
    if (flushing) return;
    flushing = true;
    try {
      let pending = readJson(PENDING_KEY, []);
      while (pending.length) {
        try { await postScore(pending[0]); }
        catch (e) { if (!isPermanent(e)) break; }
        pending = readJson(PENDING_KEY, []);
        pending.shift();
        safeSet(PENDING_KEY, JSON.stringify(pending));
      }
    } finally {
      flushing = false;
    }
  }

  async function submit(game, score, name) {
    const s = Math.floor(Number(score));
    if (!game || !Number.isFinite(s) || s < 0) return { ok: false, online: false };
    const entry = { game, name: name ? setName(name) : getName(), score: s, at: new Date().toISOString() };
    localAdd(game, { name: entry.name, score: entry.score, at: entry.at });
    try {
      const res = await postScore(entry);
      flushPending();
      return Object.assign({ online: true }, res);
    } catch (e) {
      if (!isPermanent(e)) {
        const pending = readJson(PENDING_KEY, []);
        pending.push(entry);
        safeSet(PENDING_KEY, JSON.stringify(pending.slice(-50)));
      }
      return { ok: true, online: false };
    }
  }

  async function top(game, limit) {
    limit = limit || 10;
    try {
      const res = await request('/api/scores/' + encodeURIComponent(game) + '?limit=' + limit);
      return { online: true, scores: res.scores };
    } catch (e) {
      return { online: false, scores: localTop(game, limit) };
    }
  }

  window.Scores = { submit, top, getName, setName, localTop, flushPending };

  // Gửi lại các điểm còn chờ khi trang mở lại hoặc có mạng trở lại.
  if (readJson(PENDING_KEY, []).length) setTimeout(flushPending, 1500);
  window.addEventListener('online', flushPending);
})();
