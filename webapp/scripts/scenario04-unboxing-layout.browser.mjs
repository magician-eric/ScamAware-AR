// Run against a built preview with Playwright installed:
// node scripts/scenario04-unboxing-layout.browser.mjs --base http://localhost:4173/ScamAware-AR/
// Optional: --executable /path/to/chromium, --font-css /local-font.css,
// --screenshot /tmp/unboxing.png
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const base = option('--base', 'http://localhost:4173/ScamAware-AR/').replace(/\/?$/, '/');
const fontCss = option('--font-css', null);
const browser = await chromium.launch({ executablePath: option('--executable', process.env.CHROMIUM_PATH), headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.goto(base);
  let count = 0;
  for (const viewport of [{ width: 320, height: 568 }, { width: 360, height: 800 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    for (const lang of ['zh', 'en', 'jp']) {
      for (const route of ['health', 'luckyBag']) {
        await page.evaluate((language) => {
          sessionStorage.clear();
          localStorage.setItem('language', language);
        }, lang);
        await page.goto(`${base}?unboxing-layout=${count}#/scenario04-shopping/unboxing/${route}`);
        if (fontCss) await page.addStyleTag({ url: new URL(fontCss, base).href });
        await page.evaluate(() => { window.__cibarShell = { shellVersion: '1.2.11' }; });
        const wave = async (key = false) => {
          await page.evaluate(({ key, at }) => {
            if (key) window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            else window.dispatchEvent(new CustomEvent('jorjinGesture', { detail: { gesture: 'RIGHT', count: at, at, recognizer: 2 } }));
          }, { key, at: Date.now() });
          await page.waitForTimeout(100);
        };
        await page.locator('.bp-unboxing-stage button').first().waitFor();
        for (let step = 0; step < (route === 'health' ? 3 : 2); step += 1) await wave();
        await page.locator('.bp-cva-photo').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
        const check = () => page.evaluate(() => {
          const photos = [...document.querySelectorAll('.bp-cva-photo')].map((el) => el.getBoundingClientRect());
          const stage = document.querySelector('.ar-stage').getBoundingClientRect();
          const scroll = document.querySelector('.bp-unboxing-stage');
          const button = document.querySelector('.bp-unboxing-footer button').getBoundingClientRect();
          return {
            sideBySide: photos[0].right <= photos[1].left,
            compact: photos.every((rect) => rect.width <= 133 && Math.abs(rect.width - rect.height) <= 1),
            visible: button.top >= stage.top && button.bottom <= stage.bottom + 1 && button.bottom <= innerHeight + 1,
            fitsWidth: scroll.scrollWidth <= scroll.clientWidth + 1,
            rows: document.querySelectorAll('.bp-cva-row').length,
            top: button.top,
          };
        });
        const label = `${viewport.width}/${lang}/${route}`;
        const before = await check();
        assert(before.sideBySide && before.compact, `${label}: photos must be compact and side by side`);
        assert(before.visible && before.fitsWidth && before.rows === 5, `${label}: text/action must remain accessible`);
        await page.locator('.bp-unboxing-stage').evaluate((el) => { el.scrollTop = el.scrollHeight; });
        const after = await check();
        assert(after.visible && Math.abs(before.top - after.top) < 1, `${label}: footer moved with evidence`);
        if (viewport.width === 360 && lang === 'zh' && route === 'health') {
          // The shared hint reserves a strip outside the stage after inactivity.
          await page.waitForTimeout(11000);
          assert((await check()).visible, 'Hint band must not hide the footer');
          if (option('--screenshot', null)) await page.screenshot({ path: option('--screenshot') });
        }
        // Tap, native event and the glasses key channel all keep the same route.
        if (count % 3 === 0) await page.locator('.bp-unboxing-footer button').click();
        else {
          await page.waitForTimeout(1100);
          await wave(count % 3 === 2);
        }
        await page.waitForURL((url) => url.hash === `#/scenario04-shopping/dispute-chat/${route}`);
        count += 1;
      }
    }
  }
  console.log(`PASS: ${count} unboxing layouts, fixed footer, hint band and tap/native/key continuation`);
} finally {
  await browser.close();
}
