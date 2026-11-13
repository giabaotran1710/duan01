/* Đo lại số đo vật thể rồi ghi đè khối META trong game/timkhacbiet-meta.js.
   Cách chạy (ở gốc repo): python3 -m http.server 8765 & node tool/timkhacbiet-meta/run.js [--dry] */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path');
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  p.on('pageerror', e => console.error('ERR', e.message));
  await p.goto('http://localhost:8765/tool/timkhacbiet-meta/meta.html' + (process.env.THR ? '?thr=' + process.env.THR : ''));
  await p.waitForFunction('window.DONE', null, { timeout: 600000 });
  const M = await p.evaluate('window.META'); await b.close();
  const body = Object.keys(M).map(n => '    ' + n + ': ' + JSON.stringify(M[n])).join(',\n');
  if (process.argv.includes('--dry')) { fs.writeFileSync(process.argv[process.argv.indexOf('--dry') + 1] || 'meta.json', JSON.stringify(M)); return; }
  const f = path.join(__dirname, '../../game/timkhacbiet-meta.js'); let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/\/\*META-BEGIN\*\/\{[\s\S]*?\n\s*\}\/\*META-END\*\//, '/*META-BEGIN*/{\n' + body + '\n  }/*META-END*/');
  fs.writeFileSync(f, s); console.log('đã ghi', Object.keys(M).length, 'loại');
})();
