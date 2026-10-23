import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const source = path.join(root, 'outputs', 'marketing', 'C-025-tee-box-to-flag-source.html');
const out = path.join(root, 'outputs', 'marketing');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1200, height: 1470 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
for (const i of [1, 2, 3]) await page.locator(`#slide-${i}`).screenshot({ path: path.join(out, `C-025-tee-box-to-flag-static-${i}.png`) });
await page.setViewportSize({ width: 2280, height: 2830 });
await page.evaluate(() => {
  document.body.style.gridTemplateColumns = '1080px 1080px';
  document.body.style.padding = '40px';
  document.body.style.gap = '40px';
  document.querySelector('#slide-3').style.gridColumn = '1 / 3';
  document.querySelector('#slide-3').style.justifySelf = 'center';
});
await page.screenshot({ path: path.join(out, 'C-025-tee-box-to-flag-static-review-sheet.png'), fullPage: true });
await browser.close();
