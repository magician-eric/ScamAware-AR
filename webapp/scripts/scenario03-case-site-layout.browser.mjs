// Built-preview regression: four square tasks stay visible through every read state.
// node scripts/scenario03-case-site-layout.browser.mjs --base http://localhost:4173/ScamAware-AR/
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const base = option('--base', 'http://localhost:4173/ScamAware-AR/');
const browser = await chromium.launch({ executablePath: option('--executable', process.env.CHROMIUM_PATH), args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(base);
  let checks = 0;
  const wave = async () => {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('jorjinGesture', { detail: { gesture: 'RIGHT', count: Date.now(), at: Date.now(), recognizer: 2 } })));
    await page.waitForTimeout(200);
  };
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    for (const lang of ['zh', 'en', 'jp']) {
      await page.evaluate((language) => { sessionStorage.clear(); localStorage.setItem('language', language); }, lang);
      await page.goto(`${base}?case-grid=${checks}#/scenario03-police/case-site`);
      if (option('--font-css')) await page.addStyleTag({ url: new URL(option('--font-css'), base).href });
      await page.evaluate(() => { window.__cibarShell = { shellVersion: '1.2.11' }; });
      await page.locator('.pol-task').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);
      for (let step = 0; step < 4; step += 1) {
        if (viewport.width === 360 && lang === 'zh' && step === 3) await page.waitForTimeout(11000);
        const label = `${viewport.width}/${lang}/${step}`;
        const layout = await page.evaluate(() => {
          const stage = document.querySelector('.ar-stage').getBoundingClientRect();
          const cards = [...document.querySelectorAll('.pol-task')];
          const rects = cards.map(el => el.getBoundingClientRect());
          return {
            visible: rects.every(r => r.top >= stage.top && r.bottom <= stage.bottom + 1 && r.left >= stage.left && r.right <= stage.right + 1),
            square: rects.every(r => Math.abs(r.width - r.height) <= 1),
            grid: Math.abs(rects[0].top - rects[1].top) <= 1 && Math.abs(rects[2].top - rects[3].top) <= 1 && rects[2].top >= rects[0].bottom,
            text: cards.every(el => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1),
            hints: document.querySelectorAll('.pol-task-hint').length,
            done: document.querySelectorAll('.pol-task.is-done').length,
          };
        });
        assert(layout.visible && layout.square && layout.grid && layout.text && layout.hints === 0 && layout.done === step, `${label}: ${JSON.stringify(layout)}`);
        checks += 1;
        if (viewport.width === 360 && lang === 'zh' && step === 3 && option('--screenshot')) await page.screenshot({ path: option('--screenshot') });
        // Alternate actual touch activation and simulated native RIGHT events.
        if (step % 2) await page.locator('.pol-task.is-active').click(); else await wave();
        await page.locator('.pol-doc').waitFor();
        if (step < 3) {
          await wave();
          await page.locator('.pol-doc').waitFor({ state: 'detached' });
        } else {
          await wave();
          await page.waitForURL(url => url.hash === '#/scenario03-police/prosecutor-call');
        }
      }
    }
  }
  console.log(`PASS: ${checks} task-grid states, 2×2 squares, visible controls, tap/native progression and consent continuation`);
} finally { await browser.close(); }
