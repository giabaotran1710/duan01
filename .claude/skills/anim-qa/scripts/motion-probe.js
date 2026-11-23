// Đo chuyển động của một game HTML: thời gian khung (trung bình, p95), khung rớt, số canvas và
// hoạt ảnh đang chạy, heap, so sánh giảm chuyển động, chụp ảnh ở các mốc thời gian.
//
// Chạy (từ gốc repo, cần Playwright; môi trường này đã có sẵn):
//   node .claude/skills/anim-qa/scripts/motion-probe.js game/tiaso.html [tuỳ chọn]
//     --seconds N     thời gian đo (mặc định 8)
//     --cpu N         làm chậm CPU N lần (mặc định 1)
//     --reduced       giả lập "giảm chuyển động"
//     --click SEL     bấm phần tử này trước khi đo (vào ván)
//     --eval JS       chạy đoạn JS trong trang trước khi đo (đưa game vào trạng thái cần đo)
//     --shots a,b,c   chụp ảnh ở các mốc ms kể từ lúc bắt đầu đo
//     --out DIR       thư mục lưu ảnh (mặc định: thư mục tạm của hệ thống)
//     --size WxH      khung nhìn (mặc định 390x844)
// Số trên trình duyệt không có GPU thật cao hơn máy thật: hãy so trước/sau, đừng coi là tuyệt đối.
'use strict';
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wasm': 'application/wasm' };

function parseArgs(argv) {
  const o = { file: null, seconds: 8, cpu: 1, reduced: false, click: null, eval: null, shots: [], out: null, size: '390x844' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--seconds') o.seconds = Number(argv[++i]);
    else if (a === '--cpu') o.cpu = Number(argv[++i]);
    else if (a === '--reduced') o.reduced = true;
    else if (a === '--click') o.click = argv[++i];
    else if (a === '--eval') o.eval = argv[++i];
    else if (a === '--shots') o.shots = argv[++i].split(',').map(Number).filter(n => n >= 0);
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--size') o.size = argv[++i];
    else if (!a.startsWith('--') && !o.file) o.file = a;
    else { console.error('Tuỳ chọn lạ: ' + a); process.exit(2); }
  }
  if (!o.file || !(o.seconds > 0) || !(o.cpu >= 1)) { console.error('Cách dùng: node motion-probe.js game/<tên>.html [--seconds N] [--cpu N] [--reduced] [--click SEL] [--eval JS] [--shots a,b] [--out DIR]'); process.exit(2); }
  return o;
}

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

const pct = (arr, p) => { const s = arr.slice().sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

// Ghi khoảng giữa các khung thật (nhiều vòng rAF trong cùng một khung chỉ tính một lần).
const INIT = () => {
  window.__frames = [];
  let last = 0;
  const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => orig(t => { if (t !== last) { if (last) window.__frames.push(t - last); last = t; } cb(t); });
};

const SNAP = () => ({
  canvases: document.querySelectorAll('canvas').length,
  anims: document.getAnimations ? document.getAnimations().filter(a => a.playState === 'running').length : -1,
  nodes: document.getElementsByTagName('*').length,
  heap: performance.memory ? performance.memory.usedJSHeapSize : -1,
});

(async () => {
  const o = parseArgs(process.argv.slice(2));
  const target = path.join(ROOT, o.file);
  if (!target.startsWith(ROOT) || !fs.existsSync(target)) { console.error('Không thấy file: ' + o.file); process.exit(2); }
  const [w, h] = o.size.split('x').map(Number);
  const outDir = o.out || fs.mkdtempSync(path.join(os.tmpdir(), 'motion-probe-'));
  fs.mkdirSync(outDir, { recursive: true });

  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  await ctx.route(url => !url.href.startsWith(base), r => r.abort());   // không gọi mạng ngoài (Firebase, phông chữ)
  const page = await ctx.newPage();
  const errs = new Set();
  page.on('pageerror', e => errs.add(String(e.message).slice(0, 140)));
  await page.addInitScript(INIT);
  await page.goto(base + o.file, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(800);
  if (o.cpu > 1) { const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: o.cpu }); }
  if (o.click) { try { await page.click(o.click, { timeout: 3000 }); } catch (e) { console.error('Không bấm được ' + o.click); } await page.waitForTimeout(300); }
  if (o.eval) { try { await page.evaluate(o.eval); } catch (e) { console.error('--eval lỗi: ' + String(e.message).slice(0, 120)); } }

  const before = await page.evaluate(SNAP);
  await page.evaluate(() => { window.__frames.length = 0; });
  const t0 = Date.now(), shots = [];
  for (const ms of o.shots) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const f = path.join(outDir, `${path.basename(o.file, '.html')}-${o.reduced ? 'giam' : 'thuong'}-${ms}ms.png`);
    await page.screenshot({ path: f });
    shots.push(f);
  }
  const rest = o.seconds * 1000 - (Date.now() - t0);
  if (rest > 0) await page.waitForTimeout(rest);
  const frames = await page.evaluate(() => window.__frames.slice());
  const after = await page.evaluate(SNAP);
  await browser.close(); srv.close();

  const avg = frames.reduce((a, b) => a + b, 0) / (frames.length || 1);
  const over = t => frames.filter(x => x > t).length;
  console.log(`Game: ${o.file}   khung nhìn ${o.size}   CPU ×${o.cpu}   giảm chuyển động: ${o.reduced ? 'bật' : 'tắt'}   đo ${o.seconds}s`);
  if (frames.length < 5) console.log('CẢNH BÁO: chỉ ghi được ' + frames.length + ' khung. Game có thể chưa vào ván (thử --click hoặc --eval) hoặc không dùng requestAnimationFrame.');
  console.log(`Số khung: ${frames.length}  (≈ ${(frames.length / o.seconds).toFixed(1)} khung/s)`);
  console.log(`Khung trung bình: ${avg.toFixed(1)} ms   p95: ${pct(frames, .95).toFixed(1)} ms   lớn nhất: ${Math.max(0, ...frames).toFixed(1)} ms`);
  console.log(`Khung > 20 ms: ${over(20)} (${(100 * over(20) / (frames.length || 1)).toFixed(1)}%)   > 33 ms: ${over(33)}   > 50 ms: ${over(50)}`);
  console.log(`Canvas: ${before.canvases} → ${after.canvases}   Hoạt ảnh đang chạy: ${before.anims} → ${after.anims}   Phần tử: ${before.nodes} → ${after.nodes}`);
  if (before.heap >= 0) console.log(`Heap JS: ${(before.heap / 1048576).toFixed(1)} MB → ${(after.heap / 1048576).toFixed(1)} MB`);
  if (errs.size) { console.log('LỖI JS:'); errs.forEach(e => console.log('  ' + e)); }
  shots.forEach(f => console.log('Ảnh: ' + f));
  const limit = o.cpu > 1 ? 33 : 20, p95 = pct(frames, .95);
  console.log(`Kết luận: ${errs.size ? 'CHƯA ĐẠT (có lỗi JS)' : frames.length < 5 ? 'CHƯA ĐO ĐƯỢC' : p95 <= limit ? 'ĐẠT' : 'CHƯA ĐẠT'} (ngưỡng p95 ≤ ${limit} ms)`);
  process.exit(errs.size ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
