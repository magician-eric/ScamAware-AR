// Desktop-Chromium smoke test for the ScamAware-iOS web bundle (NOT an iPhone test).
// Feeds each poster card to MindAR through a fake camera and checks that the matching
// scenario is offered and entered by a tap. See scripts/browser-smoke/README.md.
const { chromium, devices } = require('playwright');
const SP = process.env.FAKE_CAMERA_DIR || require('path').join(__dirname, 'out');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const ROUTES = { 1: 'scenario01-investment', 2: 'scenario02-romance', 3: 'scenario03-police', 4: 'scenario04-shopping', 5: 'scenario05-atm' };
const LANGS = { zh: '🇹🇼 中文', en: '🇺🇸 English', jp: '🇯🇵 日本語' };

async function run(target, lang) {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${SP}/target${target}.y4m`, '--autoplay-policy=no-user-gesture-required',
      '--enable-unsafe-swiftshader'],
  });
  const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: ['camera'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
  await page.goto(`${BASE}#/language`);
  await page.waitForLoadState('networkidle'); await page.getByText(LANGS[lang], { exact: true }).tap();
  await page.waitForFunction(() => location.hash === '#/ar-scan', null, { timeout: 15000 })
    .catch(async () => { errors.push(`not on ar-scan: ${page.url()}`); await page.screenshot({ path: `${SP}/fail-${target}-${lang}.png` }); });
  const cameraOk = await page.waitForSelector('.ar-scan-camera-host video', { timeout: 15000 }).then(() => true, () => false);
  const enter = await page.waitForSelector('#enter-scenario-button', { timeout: 60000 }).then(() => true, () => false);
  let headline = '', landed = '';
  if (enter) {
    headline = (await page.textContent('.ar-scan-title'))?.trim();
    await page.tap('#enter-scenario-button');
    await page.waitForTimeout(1500);
    landed = new URL(page.url()).hash;
  }
  const camError = await page.$('.ar-scan-camera-error');
  await browser.close();
  const ok = cameraOk && enter && landed === `#/${ROUTES[target]}` && !camError;
  console.log(JSON.stringify({ target, lang, ok, cameraOk, recognised: enter, headline, landed, errors: errors.slice(0, 5) }));
  return ok;
}

(async () => {
  const plan = (process.env.PLAN || '1:zh,2:en,3:jp,4:zh,5:en').split(',').map((x) => x.split(':')).map(([t, l]) => [Number(t), l]);
  let all = true;
  for (const [t, l] of plan) all = (await run(t, l)) && all;
  process.exit(all ? 0 : 1);
})();
