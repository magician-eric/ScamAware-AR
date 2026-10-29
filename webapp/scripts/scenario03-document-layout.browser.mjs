// Real-browser regression for every simulated document, including larger
// text. Run against a built preview or dev server with Playwright installed:
// node scripts/scenario03-document-layout.browser.mjs --base http://localhost:4173/ScamAware-AR/
// Optional: --executable /path/to/chromium, --font-css /url/to/local-font.css
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const option = (key, fallback) => {
  const i = args.indexOf(key);
  return i < 0 ? fallback : args[i + 1];
};
const base = option('--base', 'http://localhost:4173/ScamAware-AR/').replace(/\/?$/, '/');
const executablePath = option('--executable', process.env.CHROMIUM_PATH);
const fontCss = option('--font-css', null);
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(base);
  let cases = 0;
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    for (const language of ['zh', 'en', 'jp']) {
      for (const largerText of [false, true]) {
        await page.evaluate((lang) => {
          sessionStorage.clear();
          localStorage.setItem('language', lang);
        }, language);
        // A fresh document resets the run's in-memory state as well as storage.
        await page.goto(`${base}?document-layout=${cases}#/scenario03-police/case-site`);
        if (fontCss) await page.addStyleTag({ url: new URL(fontCss, base).href });
        if (largerText) {
          await page.addStyleTag({ content: '.pol-doc-bar,.pol-doc-close,.pol-doc-rows,.pol-doc-table{font-size:20px}' });
        }
        for (let doc = 0; doc < 4; doc += 1) {
          await page.locator('.pol-task.is-active').click();
          await page.locator('.pol-doc').waitFor();
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(400);
          const label = `${viewport.width}×${viewport.height}/${language}/${largerText ? 'large' : 'normal'}/document-${doc}`;
          const geometry = await page.evaluate(() => {
            const panel = document.querySelector('.pol-doc');
            const paper = panel.querySelector('.pol-doc-page');
            const bounds = (el) => {
              const r = el.getBoundingClientRect();
              return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
            };
            return {
              panel: bounds(panel),
              close: bounds(panel.querySelector('.pol-doc-close')),
              action: bounds(panel.querySelector('.pol-doc-footer button')),
              widths: [panel, panel.querySelector('.pol-doc-bar'), paper].map((el) => [el.clientWidth, el.scrollWidth]),
            };
          });
          for (const [name, rect] of Object.entries(geometry).filter(([key]) => key !== 'widths')) {
            assert(rect.left >= -1 && rect.right <= viewport.width + 1, `${label}: ${name} overflows horizontally`);
            assert(rect.top >= -1 && rect.bottom <= viewport.height + 1, `${label}: ${name} overflows vertically`);
          }
          for (const [clientWidth, scrollWidth] of geometry.widths) {
            assert(scrollWidth <= clientWidth + 1, `${label}: document content needs horizontal scrolling`);
          }
          // Reading the entire paper must not move the action out of view.
          await page.locator('.pol-doc-page').evaluate((el) => { el.scrollTop = el.scrollHeight; });
          const end = await page.evaluate(() => {
            const paper = document.querySelector('.pol-doc-page');
            return {
              gap: paper.scrollHeight - paper.clientHeight - paper.scrollTop,
              actionBottom: document.querySelector('.pol-doc-footer button').getBoundingClientRect().bottom,
            };
          });
          assert(end.gap <= 2 && end.actionBottom <= viewport.height + 1, `${label}: paper end/action is inaccessible`);
          await page.locator('.pol-doc-footer button').click();
          if (doc < 3) await page.locator('.pol-doc').waitFor({ state: 'detached' });
          cases += 1;
        }
        assert(page.url().endsWith('#/scenario03-police/prosecutor-call'), 'Consent must still advance to prosecutor call');
      }
    }
  }
  console.log(`PASS: ${cases} document layouts; full paper scrolling, fixed controls and consent navigation`);

  // LINE's case card and pinned custody card share CaseNumber. Drive the
  // real narrative briefly so this also covers the actual bubble width,
  // translated labels and timestamp beside it, rather than a wide fixture.
  await page.addInitScript(() => {
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, ms, ...rest) => timeout(callback, typeof ms === 'number' ? Math.max(1, ms * 0.02) : ms, ...rest);
  });
  await page.route('**/*.mp3', (route) => route.abort());
  let cards = 0;
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    for (const language of ['zh', 'en', 'jp']) {
      for (const scene of ['line', 'line-custody']) {
        await page.evaluate((lang) => {
          sessionStorage.clear();
          localStorage.setItem('language', lang);
        }, language);
        await page.goto(`${base}?case-number-layout=${cards}#/scenario03-police/${scene}`);
        if (fontCss) await page.addStyleTag({ url: new URL(fontCss, base).href });
        await page.locator('.pol-msg-card .pol-case-number-part').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const geometry = await page.evaluate(() => [...document.querySelectorAll('.pol-msg-card')]
          .filter((card) => card.querySelector('.pol-case-number-part'))
          .map((card) => {
            const parts = [...card.querySelectorAll('.pol-case-number-part')];
            const cell = parts[0].parentElement;
            const bounds = cell.getBoundingClientRect();
            const rects = parts.flatMap((part) => [...part.getClientRects()]);
            const bubble = card.closest('.line-msg') ?? card;
            return {
              value: parts.map((part) => part.textContent).join(''),
              fits: rects.every((rect) => rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1),
              widthsFit: [cell, card, bubble].every((el) => el.scrollWidth <= el.clientWidth + 1),
            };
          }));
        assert(geometry.length > 0, 'No case number was rendered');
        for (const item of geometry) {
          assert(/-165-\d+$/.test(item.value), 'Case number must remain complete');
          assert(item.fits && item.widthsFit, `${viewport.width}/${language}/${scene}: case number escapes its cell/bubble`);
        }
        cards += 1;
      }
    }
  }
  console.log(`PASS: ${cards} LINE case-number layouts across zh/en/jp`);
} finally {
  await browser.close();
}
