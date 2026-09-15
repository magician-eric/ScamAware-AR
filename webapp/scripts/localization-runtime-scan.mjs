// Runtime localization scan: opens every player-facing screen of all five
// scenarios in a real browser, in every language, and reports any text a
// player would read that is in the wrong language.
//
// This exists because a source-level check cannot see what a player sees.
// Scenario 03 renders its 縣市 / 警察局 / 分局 / 派出所 / 地方檢察署 out of a
// dataset, not out of a dictionary; a dialogue line interpolates an agency
// name at run time; a document is assembled per language from three sources.
// The only place all of that comes back together is the DOM.
//
// Not part of `npm test` or the build: it needs a browser and a dev server.
// Run it against a running dev server:
//
//   npm install --no-save playwright
//   npm run dev &
//   node scripts/localization-runtime-scan.mjs --base http://127.0.0.1:5173/CIBAR
//
// Options:
//   --base <url>      where the app is served (default http://127.0.0.1:5173/CIBAR)
//   --executable <p>  a Chromium binary to drive, when the machine already has
//                     one and Playwright's own download is not wanted
//                     (CHROMIUM_PATH does the same)
//   --lang <codes>    comma-separated subset of zh,en,jp
//   --scenario <ids>  comma-separated subset of 01,02,03,04,05
//   --dwell <ms>      extra time to sit on each screen before reading it, so
//                     copy that appears on a timer (the fraud-warning banner)
//                     is on screen when the text is collected
//   --taps <n>        how many of each screen's controls to try, one per fresh
//                     load, to reach the states behind a tap (default 12; 0
//                     reads each screen as it first paints and nothing else)
//   --json            machine-readable output
//
// Exits non-zero if any language shows text belonging to another one.
import { findLeak } from './localization-leak-rules.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : args[index + 1];
};
const BASE = option('base', 'http://127.0.0.1:5173/CIBAR').replace(/\/$/, '');
const LANGUAGES = option('lang', 'zh,en,jp').split(',');
const SCENARIOS = option('scenario', '01,02,03,04,05').split(',');
const AS_JSON = args.includes('--json');
const DWELL = Number(option('dwell', 0));
const MAX_TAPS = Number(option('taps', 12));

// One entry per screen a player reaches. `steps` are clicked in order before
// the screen is read, so a screen that only exists after a choice (a revealed
// quiz answer, an opened 公文, a played-out LINE thread) is still measured.
// Selectors are text-free on purpose - a scan that looked screens up by their
// Chinese labels could not run in English.
const SHARED = ['language', 'gesture-tutorial', 'ar-scan', 'scenario-menu'];

const SCREENS = {
  '01': [
    'scenario01-investment', 'scenario01-investment/feed', 'scenario01-investment/video-teacher',
    'scenario01-investment/line-teacher', 'scenario01-investment/vip-group',
    'scenario01-investment/platform-register', 'scenario01-investment/profit',
    'scenario01-investment/withdraw-fail', 'scenario01-investment/scammed-result',
    'scenario01-investment/stopped-result', 'scenario01-investment/analysis',
    'scenario01-investment/quiz',
  ],
  '02': [
    'scenario02-romance', 'scenario02-romance/phone-desktop', 'scenario02-romance/app-landing',
    'scenario02-romance/dating-browse', 'scenario02-romance/dating-match',
    'scenario02-romance/dating-chat', 'scenario02-romance/private-chat',
    'scenario02-romance/platform-landing', 'scenario02-romance/platform-register',
    'scenario02-romance/platform-home', 'scenario02-romance/deposit-warning',
    'scenario02-romance/deposit', 'scenario02-romance/trading', 'scenario02-romance/withdrawal',
    'scenario02-romance/topup-warning', 'scenario02-romance/guarantee',
    'scenario02-romance/scammed-result', 'scenario02-romance/stopped-result',
    'scenario02-romance/risk-analysis', 'scenario02-romance/quiz',
  ],
  '03': [
    'scenario03-police', 'scenario03-police/phone-home', 'scenario03-police/call',
    'scenario03-police/call-stage1', 'scenario03-police/line-add', 'scenario03-police/line',
    'scenario03-police/case-site', 'scenario03-police/prosecutor-call',
    'scenario03-police/police-callback', 'scenario03-police/line-custody',
    'scenario03-police/bank', 'scenario03-police/final', 'scenario03-police/aftermath',
    'scenario03-police/ending/scammed', 'scenario03-police/ending/verified',
    'scenario03-police/analysis', 'scenario03-police/quiz',
  ],
  '04': [
    'scenario04-shopping', 'scenario04-shopping/phone-home', 'scenario04-shopping/splash',
    'scenario04-shopping/home', 'scenario04-shopping/search', 'scenario04-shopping/category',
    'scenario04-shopping/messages', 'scenario04-shopping/orders', 'scenario04-shopping/me',
    ...['health', 'luckyBag'].flatMap((route) => [
      `scenario04-shopping/search-results/${route}`,
      `scenario04-shopping/product/${route}`,
      `scenario04-shopping/seller-chat/${route}`,
      `scenario04-shopping/checkout/${route}`,
      `scenario04-shopping/payment-success/${route}`,
      `scenario04-shopping/order/${route}`,
      `scenario04-shopping/unboxing/${route}`,
      `scenario04-shopping/dispute-chat/${route}`,
      `scenario04-shopping/return-request/${route}`,
      `scenario04-shopping/return-ack/${route}`,
      `scenario04-shopping/return-shipping/${route}`,
      `scenario04-shopping/return-logistics/${route}`,
      `scenario04-shopping/refund-delay/${route}`,
      `scenario04-shopping/refund-center/${route}`,
      `scenario04-shopping/platform-support/${route}`,
      `scenario04-shopping/result/${route}/scammed`,
      `scenario04-shopping/result/${route}/stopped`,
      `scenario04-shopping/ending/${route}`,
    ]),
    'scenario04-shopping/quiz',
  ],
  '05': [
    'scenario05-atm', 'scenario05-atm/phone-home', 'scenario05-atm/home',
    'scenario05-atm/product-select', 'scenario05-atm/listing', 'scenario05-atm/chat',
    'scenario05-atm/shop-create', 'scenario05-atm/trade-info', 'scenario05-atm/mydondon-orders',
    'scenario05-atm/hpe-ship', 'scenario05-atm/order-gone', 'scenario05-atm/ending-caught',
    'scenario05-atm/ending-scammed', 'scenario05-atm/reveal', 'scenario05-atm/quiz',
  ],
};

// Everything a player can read on the screen in front of them: rendered text
// plus the placeholder/alt/aria text a screen reader announces. Hidden
// subtrees are skipped - an off-screen step of a wizard is not on screen -
// but nothing is skipped for being "technical": if it renders, it counts.
function collectVisibleText() {
  const found = [];
  const walk = (element) => {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    for (const attribute of ['alt', 'placeholder', 'aria-label', 'title']) {
      const value = element.getAttribute?.(attribute);
      if (value?.trim()) found.push(value.trim());
    }
    if ((element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') && element.value) {
      found.push(element.value);
    }
    for (const node of element.childNodes) {
      if (node.nodeType === 3) {
        const text = node.textContent.trim();
        if (text) found.push(text);
      } else if (node.nodeType === 1) {
        walk(node);
      }
    }
  };
  walk(document.body);
  return found;
}

// Every button/link on the screen is clicked one at a time from a fresh load,
// so the states behind a tap - an opened document, a revealed quiz answer, a
// chat that has advanced a beat - get read too. Only same-screen taps are
// measured; a tap that navigates lands on a screen the scan visits in its own
// right. How many to try is --taps.

// The language is re-asserted on every load, not once per context: the tap
// loop below taps whatever is on the screen, and on /language that includes
// the language buttons themselves. Without this, scanning the language screen
// in English would leave the rest of the run in Japanese.
async function open(page, url, language) {
  // Retried once: a scan is a long sequence of full reloads, and a single
  // transient navigation failure (a rebuilt bundle, a socket the server
  // dropped) should not throw away the rest of the run.
  for (let attempt = 0; ; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.evaluate((value) => localStorage.setItem('language', value), language);
      await page.reload({ waitUntil: 'domcontentloaded' });
      return;
    } catch (error) {
      if (attempt >= 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

async function readScreen(page, url, language) {
  await open(page, url, language);
  await page.waitForTimeout(900);
  const texts = new Set(await page.evaluate(collectVisibleText));
  // A second read after --dwell catches anything that arrives on a timer and
  // then leaves again - the fraud-warning banner is on screen for 5-7s.
  if (DWELL > 0) {
    await page.waitForTimeout(DWELL);
    for (const text of await page.evaluate(collectVisibleText)) texts.add(text);
  }

  const tappable = await page.locator('button:visible, [role="button"]:visible, a:visible').all();
  const count = Math.min(tappable.length, MAX_TAPS);
  for (let index = 0; index < count; index += 1) {
    try {
      await open(page, url, language);
      await page.waitForTimeout(500);
      const targets = await page.locator('button:visible, [role="button"]:visible, a:visible').all();
      if (!targets[index]) continue;
      await targets[index].click({ timeout: 1500, noWaitAfter: true });
      await page.waitForTimeout(700);
      if (!page.url().startsWith(url)) continue;
      for (const text of await page.evaluate(collectVisibleText)) texts.add(text);
    } catch {
      // A control that navigates away, detaches or refuses the click is not a
      // failure of the scan: the screen it leads to is scanned on its own.
    }
  }
  return [...texts];
}

const { chromium } = await import('playwright');
const executablePath = option('executable', process.env.CHROMIUM_PATH) || undefined;
const browser = await chromium.launch({ executablePath });
const report = [];

for (const language of LANGUAGES) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/#/language`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((value) => localStorage.setItem('language', value), language);

  const routes = [...SHARED, ...SCENARIOS.flatMap((id) => SCREENS[id] ?? [])];
  for (const route of routes) {
    const texts = await readScreen(page, `${BASE}/#/${route}`, language);
    for (const text of texts) {
      const leak = findLeak(text, language);
      if (leak) report.push({ language, route, text, reason: leak.reason });
    }
  }
  await context.close();
}
await browser.close();

if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const byLanguage = new Map();
  for (const entry of report) {
    if (!byLanguage.has(entry.language)) byLanguage.set(entry.language, []);
    byLanguage.get(entry.language).push(entry);
  }
  for (const language of LANGUAGES) {
    const leaks = byLanguage.get(language) ?? [];
    console.log(`\n=== ${language}: ${leaks.length} leaked strings ===`);
    let route = null;
    for (const leak of leaks) {
      if (leak.route !== route) { route = leak.route; console.log(`  ${route}`); }
      console.log(`    - ${JSON.stringify(leak.text.slice(0, 160))}  [${leak.reason}]`);
    }
  }
}
process.exitCode = report.length ? 1 : 0;
