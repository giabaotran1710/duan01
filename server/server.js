// Backend lưu điểm cho các game.
// Chỉ dùng thư viện có sẵn của Node (không cần npm install).
// Chạy: node server/server.js  (mặc định cổng 3000)
//
// API:
//   GET  /api/health                     -> { ok: true }
//   GET  /api/scores/:game?limit=10      -> { game, scores: [{ name, score, at }] }
//   POST /api/scores/:game  { name, score } -> { ok, rank, best, scores }
//
// Ngoài API, server còn phục vụ toàn bộ file tĩnh của trang web,
// nên mở http://localhost:3000 là chơi được và điểm được lưu lên server.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(__dirname, '..');
const DATA_FILE = process.env.SCORES_FILE || path.join(__dirname, 'data', 'scores.json');
// Danh sách nguồn được phép gọi API, cách nhau bởi dấu phẩy. Mặc định cho phép mọi nguồn.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);

const MAX_PER_GAME = 100;      // giữ tối đa 100 điểm cao nhất mỗi game
const MAX_SCORE = 1e9;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 30;           // tối đa 30 lần gửi điểm / phút / IP

const GAME_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

// ---------- Lưu trữ ----------
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    if (e.code !== 'ENOENT') console.warn('Không đọc được file điểm, bắt đầu lại từ đầu:', e.message);
    return {};
  }
}

let data = loadData();
let saveTimer = null;

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DATA_FILE); // ghi nguyên tử, tránh hỏng file khi tắt đột ngột
  }, 200);
}

function topScores(game, limit) {
  return (data[game] || []).slice(0, limit);
}

function addScore(game, name, score) {
  const list = data[game] || (data[game] = []);
  const entry = { name, score, at: new Date().toISOString() };
  // Sắp xếp giảm dần theo điểm; cùng điểm thì ai đạt trước đứng trước.
  let i = list.findIndex(e => e.score < score);
  if (i === -1) i = list.length;
  list.splice(i, 0, entry);
  if (list.length > MAX_PER_GAME) list.length = MAX_PER_GAME;
  scheduleSave();
  const best = list.filter(e => e.name === name).reduce((m, e) => Math.max(m, e.score), 0);
  return { rank: i < MAX_PER_GAME ? i + 1 : null, best };
}

// ---------- Kiểm tra dữ liệu ----------
function cleanName(name) {
  if (typeof name !== 'string') return null;
  const n = name.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 20);
  return n || null;
}

function cleanScore(score) {
  const s = Number(score);
  if (!Number.isFinite(s) || s < 0 || s > MAX_SCORE) return null;
  return Math.floor(s);
}

// ---------- Giới hạn tần suất ----------
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > RATE_MAX;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of hits) if (!arr.some(t => now - t < RATE_WINDOW_MS)) hits.delete(ip);
}, RATE_WINDOW_MS).unref();

// ---------- HTTP ----------
function corsHeaders(req) {
  const origin = req.headers.origin;
  let allow = '';
  if (ALLOWED_ORIGINS.includes('*')) allow = '*';
  else if (origin && ALLOWED_ORIGINS.includes(origin)) allow = origin;
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (allow) h['Access-Control-Allow-Origin'] = allow;
  return h;
}

function sendJson(req, res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(req) });
  res.end(JSON.stringify(body));
}

function readBody(req, maxBytes = 2048) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > maxBytes) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders(req));
    return res.end();
  }
  if (url.pathname === '/api/health') return sendJson(req, res, 200, { ok: true });

  const m = url.pathname.match(/^\/api\/scores\/([^/]+)\/?$/);
  if (!m) return sendJson(req, res, 404, { error: 'not_found' });

  const game = decodeURIComponent(m[1]);
  if (!GAME_ID_RE.test(game)) return sendJson(req, res, 400, { error: 'invalid_game' });

  if (req.method === 'GET') {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || 10, 1), MAX_PER_GAME);
    return sendJson(req, res, 200, { game, scores: topScores(game, limit) });
  }

  if (req.method === 'POST') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) return sendJson(req, res, 429, { error: 'too_many_requests' });

    let body;
    try {
      body = JSON.parse(await readBody(req) || '{}');
    } catch (e) {
      return sendJson(req, res, e.message === 'too_large' ? 413 : 400, { error: 'invalid_body' });
    }
    const name = cleanName(body.name);
    const score = cleanScore(body.score);
    if (!name) return sendJson(req, res, 400, { error: 'invalid_name' });
    if (score === null) return sendJson(req, res, 400, { error: 'invalid_score' });

    const { rank, best } = addScore(game, name, score);
    return sendJson(req, res, 201, { ok: true, game, rank, best, scores: topScores(game, 10) });
  }

  return sendJson(req, res, 405, { error: 'method_not_allowed' });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.wav': 'audio/wav',
};

function serveStatic(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { rel = '/'; }
  let file = path.normalize(path.join(ROOT, rel));
  // Không cho đọc ra ngoài thư mục web, và không lộ mã server / dữ liệu / .git.
  const relToRoot = path.relative(ROOT, file);
  if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot) ||
      /^(server|\.git|node_modules)(\/|\\|$)/.test(relToRoot)) {
    res.writeHead(404); return res.end('Not found');
  }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) { file = path.join(file, 'index.html'); }
    else if (err && !path.extname(file)) { file += '.html'; } // /game/nedan -> /game/nedan.html
    fs.readFile(file, (err2, buf) => {
      if (err2) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(buf);
    });
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch(e => {
      console.error(e);
      if (!res.headersSent) sendJson(req, res, 500, { error: 'server_error' });
    });
  } else if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res, url);
  } else {
    res.writeHead(405); res.end();
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Server điểm chạy tại http://localhost:${PORT}`));
}

module.exports = { server };
