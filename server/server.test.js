const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'scores-'));
process.env.SCORES_FILE = path.join(dir, 'scores.json');
const { server } = require('./server');

let base;
test.before(() => new Promise(r => server.listen(0, () => { base = `http://localhost:${server.address().port}`; r(); })));
test.after(() => new Promise(r => server.close(r)));

const post = (game, body) => fetch(`${base}/api/scores/${game}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('lưu và trả về điểm theo thứ tự giảm dần', async () => {
  assert.equal((await post('nedan', { name: 'An', score: 50 })).status, 201);
  assert.equal((await post('nedan', { name: 'Bình', score: 120 })).status, 201);
  const res = await post('nedan', { name: 'Chi', score: 80.7 });
  const body = await res.json();
  assert.equal(body.rank, 2);
  const list = await (await fetch(`${base}/api/scores/nedan?limit=5`)).json();
  assert.deepEqual(list.scores.map(s => [s.name, s.score]), [['Bình', 120], ['Chi', 80], ['An', 50]]);
});

test('từ chối dữ liệu sai', async () => {
  assert.equal((await post('nedan', { name: '', score: 1 })).status, 400);
  assert.equal((await post('nedan', { name: 'A', score: -1 })).status, 400);
  assert.equal((await post('nedan', { name: 'A', score: 'abc' })).status, 400);
  assert.equal((await post('bad..id', { name: 'A', score: 1 })).status, 400);
});

test('lọc ký tự HTML khỏi tên', async () => {
  await post('comet', { name: '<b>Bảo</b>', score: 10 });
  const list = await (await fetch(`${base}/api/scores/comet`)).json();
  assert.equal(list.scores[0].name, 'bBảo/b');
});

test('phục vụ file tĩnh nhưng không lộ thư mục server', async () => {
  assert.equal((await fetch(`${base}/index.html`)).status, 200);
  assert.equal((await fetch(`${base}/game/nedan`)).status, 200);
  assert.equal((await fetch(`${base}/server/server.js`)).status, 404);
  assert.equal((await fetch(`${base}/%2e%2e/etc/passwd`)).status, 404);
});

test('ghi điểm ra file', async () => {
  await new Promise(r => setTimeout(r, 400));
  const saved = JSON.parse(fs.readFileSync(process.env.SCORES_FILE, 'utf8'));
  assert.equal(saved.nedan.length, 3);
});
