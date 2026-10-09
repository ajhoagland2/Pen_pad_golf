import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const source = path.join(root, 'outputs', 'marketing', 'C-020-scoring-loop-static-source.html');
const out = path.join(root, 'outputs', 'marketing');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' });
const page = await browser.newPage({ viewport: { width: 2400, height: 3000 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
for (let i = 1; i <= 4; i += 1) await page.locator(`#slide-${i}`).screenshot({ path: path.join(out, `C-020-scoring-loop-static-${i}.png`) });
await page.locator('#review-sheet').screenshot({ path: path.join(out, 'C-020-scoring-loop-static-review-sheet.png') });
await browser.close();
