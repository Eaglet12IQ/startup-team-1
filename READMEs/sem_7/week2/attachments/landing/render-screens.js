// Пересборка полноразмерных скриншотов лендинга (4 штуки: десктоп/мобилка × тёмная/светлая).
// Сам поднимает статик-сервер на 127.0.0.1:8123 из каталога лендинга и рендерит
// Playwright-ом с явным кадром по scrollWidth/scrollHeight.
// Использование: node render-screens.js   (локально: NODE_PATH=/opt/homebrew/lib/node_modules)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}/`;
const OUT = path.join(__dirname, 'screenshots');

const SHOTS = [
  { name: 'desktop-dark', width: 1440, height: 900, dsf: 1, theme: 'dark' },
  { name: 'desktop-light', width: 1440, height: 900, dsf: 1, theme: 'light' },
  { name: 'mobile-dark', width: 390, height: 844, dsf: 2, theme: 'dark' },
  { name: 'mobile-light', width: 390, height: 844, dsf: 2, theme: 'light' },
];

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(BASE);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error('static server did not start');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
    { cwd: __dirname, stdio: 'ignore' });
  try {
    await waitForServer();

    const browser = await chromium.launch();
    for (const s of SHOTS) {
      const ctx = await browser.newContext({
        viewport: { width: s.width, height: s.height },
        deviceScaleFactor: s.dsf,
      });
      const page = await ctx.newPage();
      await page.addInitScript((t) => localStorage.setItem('piconstruct-theme', t), s.theme);
      await page.goto(BASE, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      // заморозка анимаций: reveal-блоки видимы, плавающие карточки и переходы отключены
      await page.addStyleTag({
        content:
          'html{scroll-behavior:auto!important}' +
          '.reveal{opacity:1!important;transform:none!important}' +
          '.float-card{animation:none!important}' +
          '*{transition:none!important}',
      });
      await page.waitForTimeout(400);
      const [w, h] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
      ]);
      // fullPage без clip берёт contentSize слоя, куда попадает layout-overflow
      // свечения hero (inset -20%); clip без fullPage обрезается по вьюпорту.
      // Вместе они дают полный кадр ровно по размеру документа.
      await page.screenshot({
        path: path.join(OUT, s.name + '.png'),
        fullPage: true,
        clip: { x: 0, y: 0, width: w, height: h },
      });
      console.log(`done ${s.name}: ${w * s.dsf}x${h * s.dsf}px`);
      await ctx.close();
    }
    await browser.close();
  } finally {
    server.kill();
  }
})().catch((e) => { console.error(e); process.exit(1); });
