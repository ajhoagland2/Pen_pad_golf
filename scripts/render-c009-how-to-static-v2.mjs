import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'outputs', 'marketing', 'C-009-how-to-static-v2-source.html');
const out = path.join(root, 'outputs', 'marketing');
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
});
const page = await browser.newPage({ viewport: { width: 1160, height: 1430 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
await page.evaluate(async () => document.fonts.ready);

const requestedSlides = process.argv.slice(2).map(Number).filter(i => Number.isInteger(i) && i >= 1 && i <= 5);
const slides = requestedSlides.length ? requestedSlides : [1, 2, 3, 4, 5];

for (const i of slides) {
  await page.locator(`#slide-${i}`).screenshot({ path: path.join(out, `C-009-how-to-static-v2-${i}.png`) });
}

await page.setViewportSize({ width: 3400, height: 2830 });
await page.evaluate(() => {
  document.body.style.gridTemplateColumns = 'repeat(3, 1080px)';
  document.body.style.padding = '40px';
  document.body.style.gap = '40px';
});
await page.screenshot({ path: path.join(out, 'C-009-how-to-static-v2-review-sheet.png'), fullPage: true });
await browser.close();
