// Рендер постера в одностраничный векторный PDF фиксированной ширины.
// Использование: node render.js <input.html> <output.pdf> [width]
// Логика повторяет html2poster: авто-замер высоты документа, printBackground,
// ширина в px (высота в px — вычисленная). Запускается локально и в CI.
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const [, , input, output, width = '1200px'] = process.argv;
  if (!input || !output) {
    console.error('Usage: node render.js <input.html> <output.pdf> [width]');
    process.exit(1);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto('file://' + path.resolve(input), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const height = await page.evaluate(() =>
    Math.ceil(document.documentElement.scrollHeight));
  await page.pdf({
    path: output,
    width,
    height: `${height}px`,
    printBackground: true,
    pageRanges: '1',
  });
  await browser.close();
  console.log(`Done: ${output} (${width} x ${height}px)`);
})().catch((err) => { console.error(err); process.exit(1); });
