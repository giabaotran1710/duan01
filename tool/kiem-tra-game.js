// Kiểm tra nhanh mọi game trên trang chủ: mở từng game ở màn điện thoại dọc (390x844) và ngang (844x390),
// bắt lỗi JavaScript, file không tải được, trang tràn ngang và menu phải cuộn khi xoay ngang.
//
// Chạy:  node tool/kiem-tra-game.js            (mọi game)
//        node tool/kiem-tra-game.js tiaso meodem  (chỉ vài game, theo id trong index.html)
// Cần Playwright (npm i -D playwright && npx playwright install chromium nếu máy chưa có).
// Thoát mã 1 nếu có game lỗi JavaScript hoặc thiếu file, để dùng được trong kiểm tra tự động.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const routesSrc = (html.match(/const routes = \{([\s\S]*?)\};/) || [])[1] || '';
let routes = [...routesSrc.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map(m => ({ id: m[1], file: m[2] + '.html' }));
const only = process.argv.slice(2);
if (only.length) routes = routes.filter(r => only.includes(r.id));

// Lỗi trình duyệt không phải do game hỏng: rung máy trước lần chạm đầu, chặn tự phát tiếng
const IGNORE = [/navigator\.vibrate/i, /play\(\) failed|user didn't interact|NotAllowedError/i];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.wasm': 'application/wasm', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon' };

function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(p, (err, buf) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' });
        res.end(buf);
      });
    }).listen(0, '127.0.0.1', () => resolve(srv));
  });
}

(async () => {
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const VIEWS = [{ name: 'dọc', width: 390, height: 844 }, { name: 'ngang', width: 844, height: 390 }];
  const problems = [];
  let fatal = 0;

  for (const r of routes) {
    if (!fs.existsSync(path.join(ROOT, r.file))) { problems.push([r.id, '-', 'THIẾU FILE ' + r.file]); fatal++; continue; }
    for (const v of VIEWS) {
      const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      const errs = new Set(), missing = new Set();
      page.on('pageerror', e => errs.add(String(e.message).slice(0, 160)));
      page.on('console', m => { if (m.type() === 'error' && !IGNORE.some(re => re.test(m.text()))) errs.add(m.text().slice(0, 160)); });
      page.on('response', res => { if (res.status() === 404 && res.url().startsWith(base)) missing.add(res.url().slice(base.length)); });
      const t0 = Date.now();
      try { await page.goto(base + r.file, { waitUntil: 'load', timeout: 20000 }); }
      catch (e) { errs.add('Không mở được: ' + e.message.slice(0, 80)); }
      const loadMs = Date.now() - t0;
      await page.waitForTimeout(1200);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight })).catch(() => null);
      for (const e of errs) { problems.push([r.id, v.name, 'LỖI JS: ' + e]); fatal++; }
      for (const f of missing) { if (/favicon\.ico$/.test(f)) continue; problems.push([r.id, v.name, 'THIẾU: ' + f]); fatal++; }
      if (m && m.sw > m.iw + 2) problems.push([r.id, v.name, `tràn ngang ${m.sw}px > ${m.iw}px`]);
      if (m && v.name === 'ngang' && m.sh > m.ih * 1.5) problems.push([r.id, v.name, `phải cuộn: cao ${m.sh}px, màn ${m.ih}px`]);
      if (loadMs > 5000) problems.push([r.id, v.name, `tải chậm ${loadMs} ms`]);
      await ctx.close();
    }
    process.stdout.write('.');
  }
  await browser.close();
  srv.close();

  console.log('\n\nĐã kiểm ' + routes.length + ' game.');
  if (!problems.length) { console.log('Không thấy vấn đề nào.'); return; }
  for (const [id, view, msg] of problems) console.log(`${id.padEnd(18)} ${view.padEnd(6)} ${msg}`);
  console.log(`\n${problems.length} vấn đề, trong đó ${fatal} lỗi nghiêm trọng (lỗi JS hoặc thiếu file).`);
  process.exitCode = fatal ? 1 : 0;
})();
