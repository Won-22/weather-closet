/* 공유 카드(og.png)·홈 화면 아이콘(apple-touch-icon.png) 만들기: node tools/make-images.js */
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const root = path.join(__dirname, '..');
  let p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await p.goto('file://' + path.join(__dirname, 'og.html')); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(root, 'og.png') });
  p = await b.newPage({ viewport: { width: 180, height: 180 } });
  await p.setContent('<body style="margin:0"><img src="file://' + path.join(root, 'icon.svg') + '" width="180" height="180" style="display:block"></body>');
  await p.waitForTimeout(200); await p.screenshot({ path: path.join(root, 'apple-touch-icon.png') });
  await b.close();
})();
