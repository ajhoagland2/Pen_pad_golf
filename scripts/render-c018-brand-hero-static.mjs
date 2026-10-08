import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const source = path.join(root, 'outputs', 'marketing', 'C-018-brand-hero-static-source.html');
const out = path.join(root, 'outputs', 'marketing');
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1800 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

await page.locator('#slide-1').screenshot({
  path: path.join(out, 'C-018-brand-hero-static-1.png'),
});
await page.locator('#review-sheet').screenshot({
  path: path.join(out, 'C-018-brand-hero-static-review-sheet.png'),
});
await browser.close();
