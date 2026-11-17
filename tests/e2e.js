/* 화면 점검: node tests/e2e.js <출력 폴더> [시각]
   Open-Meteo 응답은 tests/fixtures 값으로 바꿔 끼워 항상 같은 화면을 본다 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2] || 'shots';
const when = process.argv[3] || '2026-11-17T08:30:00+09:00';
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/seoul-2026-11-17.json'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const srv = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
(async () => {
  await new Promise((ok) => srv.listen(0, ok));
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await chromium.launch();
  const errors = [];
  async function page(vp, opts = {}) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: opts.dpr || 1, locale: 'ko-KR', colorScheme: opts.dark ? 'dark' : 'light' });
    const p = await ctx.newPage();
    await p.clock.setFixedTime(new Date(when));
    p.on('pageerror', (e) => errors.push(String(e)));
    p.on('console', (m) => { if (m.type() === 'error' && !/jsdelivr|ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
    await p.route(/cdn\.jsdelivr\.net/, (r) => r.abort());
    await p.route(/api\.open-meteo\.com/, (r) => opts.fail ? r.abort() : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: fixture }));
    await p.goto(url); await p.waitForSelector(opts.fail ? '.empty-state' : '.hero-t');
    return p;
  }
  const shot = (p, n, full = true) => p.screenshot({ path: path.join(out, n + '.png'), fullPage: full });
  const m = { width: 390, height: 844 }, d = { width: 1280, height: 860 };

  let p = await page(m); await shot(p, 'm1-home');
  await p.click('[data-act="sample"]'); await p.waitForSelector('[data-act="shuffle"]'); await p.waitForTimeout(400); await shot(p, 'm2-mine');
  await p.click('[data-act="day"][data-v="2"]'); await shot(p, 'm3-mine-day2');
  await p.click('[data-act="go-closet"]'); await shot(p, 'm4-closet');
  await p.click('[data-act="add"]'); await p.click('[data-act="i-sub"][data-v="니트"]'); await p.click('[data-act="i-color"][data-v="버건디"]'); await p.click('[data-act="i-thick"][data-v="두꺼움"]');
  await shot(p, 'm5-add', false);
  await p.click('[data-act="i-save"]'); await p.waitForTimeout(200);
  const n = await p.evaluate(() => JSON.parse(localStorage.getItem('wc.closet')).length);
  console.log('closet after add', n);
  await p.click('[data-act="home"]'); await p.click('[data-act="open-city"]'); await shot(p, 'm6-city', false);
  await p.close();

  p = await page(d); await p.click('[data-act="sample"]'); await p.waitForSelector('[data-act="shuffle"]'); await p.waitForTimeout(400); await shot(p, 'd1-mine', false);
  await p.click('[data-act="mode"][data-v="basic"]'); await shot(p, 'd2-basic', false); await p.close();
  p = await page(m, { dark: true }); await shot(p, 'm7-dark'); await p.close();
  p = await page(m, { fail: true }); await shot(p, 'm8-fail', false);
  await p.click('[data-act="mock"]'); await p.waitForSelector('.mock'); await shot(p, 'm9-mock', false); await p.close();
  p = await page({ width: 320, height: 640 }); await shot(p, 's1-320'); 
  const ow = await p.evaluate(() => document.documentElement.scrollWidth); console.log('320 scrollWidth', ow); await p.close();
  console.log('errors', JSON.stringify(errors));
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
