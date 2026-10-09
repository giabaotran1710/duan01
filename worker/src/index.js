// Backend lưu điểm chạy trên Cloudflare Workers + D1 (gói miễn phí).
// API giống hệt server/server.js:
//   GET  /api/health
//   GET  /api/scores/:game?limit=10
//   POST /api/scores/:game  { name, score }

const MAX_PER_GAME = 100;   // giữ tối đa 100 điểm cao nhất mỗi game
const MAX_SCORE = 1e9;
const GAME_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

function cors(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('Origin');
  const h = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (allowed.includes('*')) h['Access-Control-Allow-Origin'] = '*';
  else if (origin && allowed.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(request, env, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(request, env) },
  });
}

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

async function topScores(env, game, limit) {
  const { results } = await env.DB
    .prepare('SELECT name, score, at FROM scores WHERE game = ? ORDER BY score DESC, id ASC LIMIT ?')
    .bind(game, limit)
    .all();
  return results;
}

async function handle(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(request, env) });
  }
  if (url.pathname === '/api/health') return json(request, env, 200, { ok: true });

  const m = url.pathname.match(/^\/api\/scores\/([^/]+)\/?$/);
  if (!m) return json(request, env, 404, { error: 'not_found' });

  let game;
  try { game = decodeURIComponent(m[1]); } catch { game = ''; }
  if (!GAME_ID_RE.test(game)) return json(request, env, 400, { error: 'invalid_game' });

  if (request.method === 'GET') {
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit'), 10) || 10, 1), MAX_PER_GAME);
    return json(request, env, 200, { game, scores: await topScores(env, game, limit) });
  }

  if (request.method === 'POST') {
    const text = await request.text();
    if (text.length > 2048) return json(request, env, 413, { error: 'invalid_body' });
    let body;
    try { body = JSON.parse(text || '{}'); } catch { return json(request, env, 400, { error: 'invalid_body' }); }
    if (!body || typeof body !== 'object') return json(request, env, 400, { error: 'invalid_body' });

    const name = cleanName(body.name);
    const score = cleanScore(body.score);
    if (!name) return json(request, env, 400, { error: 'invalid_name' });
    if (score === null) return json(request, env, 400, { error: 'invalid_score' });

    const at = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO scores (game, name, score, at) VALUES (?, ?, ?, ?)').bind(game, name, score, at),
      // Chỉ giữ MAX_PER_GAME điểm cao nhất để bảng không phình mãi.
      env.DB.prepare(
        `DELETE FROM scores WHERE game = ?1 AND id NOT IN
           (SELECT id FROM scores WHERE game = ?1 ORDER BY score DESC, id ASC LIMIT ?2)`
      ).bind(game, MAX_PER_GAME),
    ]);

    const rankRow = await env.DB
      .prepare('SELECT COUNT(*) AS n FROM scores WHERE game = ? AND score > ?').bind(game, score).first();
    const bestRow = await env.DB
      .prepare('SELECT MAX(score) AS best FROM scores WHERE game = ? AND name = ?').bind(game, name).first();
    const rank = rankRow.n + 1;
    return json(request, env, 201, {
      ok: true,
      game,
      rank: rank <= MAX_PER_GAME ? rank : null,
      best: bestRow.best || score,
      scores: await topScores(env, game, 10),
    });
  }

  return json(request, env, 405, { error: 'method_not_allowed' });
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (e) {
      console.error(e);
      return json(request, env, 500, { error: 'server_error' });
    }
  },
};
