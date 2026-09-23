// Desktop-Chromium smoke test for the ScamAware-iOS web bundle (NOT an iPhone test):
// camera-denied fallback, manual menu, briefings, staff version panel, language switch,
// and that nothing is requested from the network. See scripts/browser-smoke/README.md.
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const results = [];
const rec = (name, ok, detail = '') => { results.push({ name, ok, detail }); };

(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader'],
  });
  // No camera permission granted -> getUserMedia is denied, like tapping "Don't Allow" on iOS.
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  // Offline: anything that is not the local bundle fails, like aeroplane mode.
  const external = [];
  await ctx.route((url) => !url.href.startsWith(BASE), (route) => { external.push(route.request().url()); route.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  // 1. opening -> language
  await page.goto(BASE);
  await page.waitForTimeout(6000);
  rec('opening sequence reveals language buttons', await page.getByText('🇺🇸 English', { exact: true }).isVisible());

  // 2. camera denied -> calm error + manual selection still works
  await page.waitForLoadState('networkidle');
  await page.getByText('🇺🇸 English', { exact: true }).tap();
  await page.waitForFunction(() => location.hash === '#/ar-scan');
  const err = await page.waitForSelector('.ar-scan-camera-error', { timeout: 10000 }).then((e) => e.textContent(), () => null);
  rec('camera denied -> error message shown', !!err, err);
  await page.tap('#manual-scenario-button');
  await page.waitForFunction(() => location.hash === '#/scenario-menu');
  rec('manual scenario menu reachable by tap', true);
  const buttons = await page.$$eval('button', (bs) => bs.map((b) => b.textContent.trim()).filter(Boolean));
  rec('scenario menu lists buttons', buttons.length >= 5, buttons.join(' | '));

  // 3. each scenario briefing renders from the menu
  const routes = ['scenario01-investment', 'scenario02-romance', 'scenario04-shopping', 'scenario05-atm'];
  for (const r of routes) {
    await page.goto(`${BASE}#/${r}`); await page.waitForTimeout(1200);
    const text = (await page.textContent('body')).trim().slice(0, 60);
    rec(`briefing renders: ${r}`, text.length > 10, text);
  }
  // scenario 03 needs the staff location profile first
  await page.goto(`${BASE}#/scenario03-police`); await page.waitForTimeout(800);
  const s3 = (await page.textContent('body')).trim().slice(0, 80);
  rec('scenario03 gated until staff location setup (as on Android)', /set up|venue/i.test(s3), s3);

  // 4. staff setup: iOS version panel instead of OTA controls
  await page.goto(`${BASE}#/staff-setup`); await page.waitForTimeout(1000);
  const staff = await page.textContent('body');
  rec('staff screen shows iOS version panel', staff.includes('系統版本') && staff.includes('重新安裝新版 .ipa'));
  rec('staff screen has no OTA buttons', !/下載更新|檢查更新|重新啟動並套用/.test(staff));

  // 5. video: scenario01 video teacher plays from the bundle
  await page.goto(`${BASE}#/scenario01-investment/video-teacher`); await page.waitForTimeout(4000);
  const vids = await page.$$eval('video', (vs) => vs.map((v) => ({ src: v.currentSrc, readyState: v.readyState, t: v.currentTime, paused: v.paused, err: v.error && v.error.code })));
  rec('scenario01 video loads', vids.some((v) => v.readyState >= 2 && !v.err), JSON.stringify(vids));

  // 6. language switch persists (jp)
  await page.goto(`${BASE}#/language`); await page.waitForLoadState('networkidle');
  await page.getByText('🇯🇵 日本語', { exact: true }).tap();
  await page.waitForFunction(() => location.hash === '#/ar-scan');
  await page.goto(`${BASE}#/scenario-menu`); await page.waitForTimeout(800);
  const jp = (await page.textContent('body')).slice(0, 120);
  rec('Japanese applied to menu', /[぀-ヿ]/.test(jp), jp);

  rec('no external network requests (offline)', external.length === 0, external.slice(0, 5).join(', '));
  const realErrors = errors.filter((e) => !/Permission denied|NotAllowedError|Failed to start AR camera/i.test(e));
  rec('no page errors', realErrors.length === 0, realErrors.slice(0, 5).join(' || '));
  await browser.close();
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${String(r.detail).slice(0, 160)}` : ''}`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
})();
