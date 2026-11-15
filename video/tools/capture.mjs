/**
 * Photographs the real demo (running on localhost:5173) for the explainer films.
 * Usage: node capture.mjs en|ar
 * The app clock is pinned to Sunday 15 Nov 2026, 11:20 in Dubai so the center is "open now".
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const lang = process.argv[2] === 'ar' ? 'ar' : 'en';
const OUT = path.resolve(import.meta.dirname, '..', 'shots', lang);
fs.mkdirSync(OUT, { recursive: true });
const FIXED = Date.parse('2026-11-15T07:20:00Z');

const browser = await puppeteer.launch({
  executablePath: process.env.CAPTURE_BROWSER,
  headless: 'shell',
  userDataDir: path.join(process.env.TEMP, 'mth-capture-profile'),
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const page = (await browser.pages())[0] ?? (await browser.newPage());
page.on('error', (e) => console.log('PAGE CRASH', e.message));
await page.evaluateOnNewDocument((fixed) => {
  const shift = fixed - Date.now();
  const Real = Date;
  class Fake extends Real {
    constructor(...a) {
      if (a.length === 0) super(Real.now() + shift);
      else super(...a);
    }
    static now() {
      return Real.now() + shift;
    }
  }
  window.Date = Fake;
}, FIXED);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (name) => {
  await wait(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('shot', name);
};
/** Click the first visible button whose text contains any of the given strings. */
const click = async (texts, { exact = false, within = 'body', nth = 0 } = {}) => {
  const ok = await page.evaluate(
    (texts, exact, within, nth) => {
      const root = document.querySelector(within) ?? document.body;
      const list = [...root.querySelectorAll('button, a')].filter((b) => {
        const t = b.innerText.trim();
        return b.getClientRects().length > 0 && texts.some((x) => (exact ? t === x : t.includes(x)));
      });
      list[nth]?.click();
      return !!list[nth];
    },
    [texts].flat(),
    exact,
    within,
    nth,
  );
  if (!ok) console.log('  (not found:', [texts].flat()[0], ')');
  await wait(650);
  return ok;
};
const rects = {};
/** Remember where an element sits in a shot, as fractions of the viewport. */
const mark = async (shotName, key, selector, index = 0) => {
  const r = await page.evaluate(
    (selector, index) => {
      const el = [...document.querySelectorAll(selector)][index];
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return [b.left / innerWidth, b.top / innerHeight, b.width / innerWidth, b.height / innerHeight].map((n) => +n.toFixed(4));
    },
    selector,
    index,
  );
  if (!r) console.log('  (no rect:', shotName, key, ')');
  (rects[shotName] ??= {})[key] = r;
};
const scrollTo = (y) => page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y);
const scrollToText = (text, offset = 120) =>
  page.evaluate(
    (text, offset) => {
      const el = [...document.querySelectorAll('span, h2, h3')].find((e) => e.innerText?.trim() === text);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'instant' });
    },
    text,
    offset,
  );

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
if (lang === 'ar') await click('العربية');
// hide the presenter panel
await page.keyboard.down('Control');
await page.keyboard.down('Shift');
await page.keyboard.press('KeyD');
await page.keyboard.up('Shift');
await page.keyboard.up('Control');
await wait(1800);
await shot('login');

// ── Parent ──
await click(['Al Mansoori family', 'عائلة المنصوري']);
await wait(1600);
await mark('home', 'child', 'main .no-scrollbar button[class*="min-w-"]', 0);
await mark('home', 'kids', 'main .no-scrollbar');
await mark('home', 'next', 'main button.bg-ink');
await shot('home');

// find a day that has an on-the-hour time with exactly one place left
const found = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const days = [...document.querySelectorAll('.no-scrollbar button.w-16')];
  for (let i = 0; i < days.length; i++) {
    [...document.querySelectorAll('.no-scrollbar button.w-16')][i].click();
    await sleep(350);
    const cards = [...document.querySelectorAll('.grid > .anim-fade-up.rounded-2xl')];
    const idx = cards.findIndex((c) => /:00 – \d\d:00/.test(c.innerText) && /(1 place left|مقعد واحد)/.test(c.innerText) && c.querySelector('button.bg-brand'));
    if (idx >= 0) return { day: i, card: idx };
  }
  return null;
});
console.log('  one-seat hour:', JSON.stringify(found));
await wait(700);
await scrollToText(lang === 'ar' ? 'مدة الحصة' : 'Lesson length', 150);
await mark('times', 'length', 'main section .grid.grid-cols-4');
await mark('times', 'days', 'main section .no-scrollbar');
await shot('times');
await scrollToText(lang === 'ar' ? 'اختر الوقت' : 'Choose a time', 130);
await mark('times2', 'grid', 'main section .grid.grid-cols-1');
await mark('times2', 'seat', 'main section .grid.grid-cols-1 > .anim-fade-up', found.card);
await shot('times2');

await page.evaluate((i) => [...document.querySelectorAll('.grid > .anim-fade-up.rounded-2xl')][i].querySelector('button.bg-brand').click(), found.card);
await wait(700);
await mark('confirm', 'modal', '.anim-pop.relative');
await shot('confirm');
await click(['Confirm booking', 'تأكيد الحجز']);
await wait(380);
await mark('done', 'modal', '.anim-pop.relative');
await shot('done');
await wait(900);
await click(['Done', 'تم'], { exact: true });
await shot('times-after');
await scrollTo(0);
await wait(500);
await mark('limit', 'notice', 'main .bg-brand-soft.rounded-2xl');
await mark('limit', 'child', 'main .no-scrollbar button[class*="min-w-"]', 0);
await shot('limit');
await click(['Book in December', 'الحجز في ديسمبر']);
await wait(900);
await scrollTo(0);
await mark('nextmonth', 'notice', 'main .anim-unlock');
await mark('nextmonth', 'months', 'main section .inline-flex.rounded-xl.bg-slate-100');
await mark('nextmonth', 'child', 'main .no-scrollbar button[class*="min-w-"]', 0);
await shot('nextmonth');

// cancel dialog (Rashid has upcoming lessons he can still cancel)
await click(['Rashid', 'راشد']);
await wait(600);
await click(['Cancel', 'إلغاء'], { exact: true, within: 'aside', nth: 1 });
await mark('cancel', 'modal', '.anim-pop.relative');
await shot('cancel');
await click(['Keep lesson', 'الإبقاء على الحصة']);

// assistant
await click(['Ask us', 'اسألونا']);
await click(['How many lessons are left?', 'كم حصة متبقية؟'], { exact: true });
await wait(1000);
await click(['What happens after 10 lessons?', 'ماذا يحدث بعد 10 حصص؟'], { exact: true });
await wait(1100);
await mark('assistant', 'panel', '.anim-slide-up');
await shot('assistant');
await page.evaluate(() => document.querySelector('header.bg-ink button')?.click());
await wait(300);

// ── Center ──
await click(['Sign out', 'تسجيل الخروج']);
await wait(500);
await click(['Center Director', 'مدير المركز']);
await wait(2200);
await mark('dash', 'kpis', 'main .grid.grid-cols-2');
await mark('dash', 'today', 'main .min-w-0.space-y-5 > *', 0);
await mark('dash', 'attention', 'main .grid > .space-y-5 > *', 0);
await shot('dash');
await scrollTo(520);
await wait(900);
await mark('dash2', 'charts', 'main .min-w-0.space-y-5 > *', 1);
await mark('dash2', 'centers', 'main .min-w-0.space-y-5 > *', 2);
await shot('dash2');
await scrollTo(0);
await page.evaluate(() => document.querySelector('main section .grid button')?.click());
await wait(900);
await mark('roster', 'drawer', 'aside.anim-drawer');
await shot('roster');
await page.keyboard.press('Escape');
await wait(300);
await click(['Calendar', 'التقويم'], { exact: true });
await click(['Week', 'أسبوعي'], { exact: true });
await wait(600);
await mark('week', 'grid', 'main .thin-scroll');
await shot('week');

fs.writeFileSync(path.join(OUT, 'rects.json'), JSON.stringify(rects, null, 1));
await browser.close();
console.log('done →', OUT);
