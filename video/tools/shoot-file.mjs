// Screenshots a standalone HTML file (read-only look at another build). Usage: node shoot-file.mjs <file> <outDir>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [file, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CAPTURE_BROWSER,
  headless: 'shell',
  userDataDir: path.join(process.env.TEMP, 'mth-shoot-profile'),
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: ['--hide-scrollbars', '--no-sandbox', '--disable-gpu'],
});
const page = (await browser.pages())[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name, full = false) => {
  await wait(500);
  await page.screenshot({ path: path.join(outDir, `${name}.jpg`), type: 'jpeg', quality: 80, fullPage: full });
  console.log('shot', name);
};
const click = async (text) => {
  const ok = await page.evaluate((text) => {
    const b = [...document.querySelectorAll('button, a')].find((x) => x.getClientRects().length && x.innerText.trim().toLowerCase().includes(text.toLowerCase()));
    b?.click();
    return b ? b.innerText.trim().slice(0, 60) : null;
  }, text);
  console.log('  click', text, '→', ok);
  await wait(700);
  return ok;
};

await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle0' });
await wait(1500);
console.log('buttons:', await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => b.innerText.trim().replace(/\s+/g, ' ').slice(0, 28)).filter(Boolean).slice(0, 60).join(' | ')));
await shot('1-first');
await shot('2-first-full', true);
for (const [label, name] of [['Staff & Center Admin', '3-admin']]) {
  if (await click(label)) {
    await shot(name);
    await shot('4-admin-full', true);
    break;
  }
}
await click('العربية');
await shot('5-arabic');
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await shot('6-mobile');
console.log('scrollWidth at 390:', await page.evaluate(() => document.documentElement.scrollWidth));
console.log('errors:', errors.slice(0, 6));
await browser.close();
