// The gugo-invest App module holds the real GuGo Invest app (screens, store,
// charts, i18n), not just the iframe adapter it used to be. These are the
// invariants that make it safe to mount inside webapp, and that a browser
// can't check for us in CI:
//
//  - it keeps scenario01's run-reset contract (PR #247) working,
//  - it doesn't reach back into the standalone /gugo-invest/dist/ build,
//  - it doesn't start a second React router or leak Tailwind site-wide,
//  - it still ships all three languages for every screen.
//
// Rendering is deliberately not covered here: webapp has no DOM/JSX test
// runner, and adding one for this would be a bigger change than the move
// itself. The screens are exercised by hand through scenario01's
// platform-register step, which is where the module is mounted.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const MODULE_URL = new URL('../src/apps/gugo-invest/', import.meta.url);
const read = (path) => readFile(new URL(path, MODULE_URL), 'utf8');

async function sourceFiles(dir = 'app/') {
  const out = [];
  for (const entry of await readdir(new URL(dir, MODULE_URL), { withFileTypes: true })) {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) out.push(...(await sourceFiles(`${path}/`)));
    else if (/\.(tsx?|css)$/.test(entry.name) && !entry.name.endsWith('.generated.css')) out.push(path);
  }
  return out;
}

test('the app persists to the same key the run reset sweeps', async () => {
  // Two halves of one contract: the store writes GUGO_STORAGE_KEYS.state and
  // scenario01's Briefing clears it. Read from the same declaration, so
  // renaming the key can't quietly leave a run un-resettable.
  const store = await read('app/store/AppStoreContext.tsx');
  assert.match(store, /const STORAGE_KEY = GUGO_STORAGE_KEYS\.state;/);
  assert.doesNotMatch(store, /"gugo-invest-app-state"/, 'the key must not be re-literalised here');

  const { GUGO_STORAGE_KEYS, resetGuGoState } = await import('../src/apps/gugo-invest/index.js');
  assert.equal(GUGO_STORAGE_KEYS.state, 'gugo-invest-app-state', 'the persisted key is player-facing state; it must not change');
  assert.equal(GUGO_STORAGE_KEYS.language, 'gugo-invest-language');

  // The language key is i18next's, configured in the app's own i18n setup.
  assert.match(await read('app/i18n/index.ts'), /lookupLocalStorage: "gugo-invest-language"/);

  const store_ = new Map(Object.entries({ 'gugo-invest-app-state': '{"registered":true}', 'gugo-invest-language': 'jp', keep: 'me' }));
  resetGuGoState({ removeItem: (k) => store_.delete(k) });
  assert.deepEqual([...store_.keys()], ['keep'], 'reset clears the new module\'s state and nothing else');
});

test('nothing loads the standalone /gugo-invest/dist/ build any more', async () => {
  for (const path of await sourceFiles()) {
    assert.doesNotMatch(await read(path), /gugo-invest\/dist/, `${path} must not reference the iframe build`);
  }

  // scenario01 is the module's one mount point. It used to embed the
  // separately-built app in an <iframe src="/gugo-invest/dist/...">; if that
  // ever comes back, the run's language stops reaching the platform and the
  // player downloads a second copy of React.
  // Comments here name the iframe it replaced, so match against code only.
  const host = (await readFile(new URL('../src/pages/scenario01/PlatformRegister.jsx', import.meta.url), 'utf8'))
    .replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.doesNotMatch(host, /<iframe|gugo-invest\/dist|createGuGoIframeUrl/);
  // Matched prop by prop rather than as one exact line: the element now also
  // hands the platform a callback (see the onboarding-stage test below), so
  // pinning the whole tag would break on any further prop while saying
  // nothing more than these two assertions already do.
  assert.match(host, /<GuGoInvestApp\b[^>]*basePath=\{GUGO_MOUNT_PATH\}/);
  assert.match(host, /<GuGoInvestApp\b[^>]*language=\{getScenario01Lang\(\)\}/);

  // ...and the route it mounts on has to own everything below it, or GuGo's
  // own routes (/markets, /stock/2330, /portfolio) have nowhere to match.
  assert.match(
    await readFile(new URL('../src/routes.jsx', import.meta.url), 'utf8'),
    /path: 'scenario01-investment\/platform-register\/\*'/,
  );
});

test('the app mounts inside webapp: one router, one scoped stylesheet', async () => {
  // Comments here talk about routers by name, so match against code only.
  const stripComments = (source) => source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  const app = stripComments(await read('app/GuGoInvestApp.tsx'));
  // webapp's own HashRouter (src/main.jsx) is the only Router; React Router
  // throws on any nested one, MemoryRouter included. The screens' absolute
  // paths are kept working by ./routing prefixing basePath instead.
  assert.doesNotMatch(app, /HashRouter|BrowserRouter|MemoryRouter/);
  assert.match(app, /<GuGoBasePathProvider basePath=\{basePath\}>/);
  assert.match(app, /className="gugo-app"/, 'everything the module styles hangs off this element');

  const css = stripComments(await read('app/styles/index.css'));
  // Bare `@import "tailwindcss"` pulls preflight in unscoped, which restyles
  // every other scenario and App in this webapp.
  assert.doesNotMatch(css, /@import\s+"tailwindcss"\s*;/);
  assert.match(css, /@import "\.\/preflight\.generated\.css" layer\(base\);/);
  assert.match(css, /@import "tailwindcss\/utilities\.css" layer\(utilities\) source\(none\);/);
  for (const [rule] of [...css.matchAll(/^([.#a-z][^{@\n]*)\{/gim)]) {
    assert.match(rule, /\.gugo-app/, `every rule this file writes must be scoped, found: ${rule.trim()}`);
  }

  // Every screen must navigate through the base-path-aware wrappers; a raw
  // useNavigate/NavLink would send the player out of the app and into a
  // webapp route.
  for (const path of (await sourceFiles()).filter((f) => f.endsWith('.tsx') && !f.endsWith('routing.tsx'))) {
    const source = stripComments(await read(path));
    assert.doesNotMatch(source, /\buseNavigate\b/, `${path} must use useGuGoNavigate`);
    assert.doesNotMatch(source, /\bNavLink\b/, `${path} must use GuGoNavLink`);
  }

  // The React surface is a separate entry from index.js on purpose: index.js
  // is imported by Node in scenario-run-reset.test.mjs, which can neither
  // parse .tsx nor load React.
  const index = stripComments(await read('index.js'));
  assert.doesNotMatch(index, /\.\/app|react/i, 'index.js must stay React-free');
});

test('every screen ships in all three languages', async () => {
  const flatten = (value, prefix = '') =>
    Object.entries(value).flatMap(([key, inner]) =>
      inner && typeof inner === 'object' && !Array.isArray(inner) ? flatten(inner, `${prefix}${key}.`) : [`${prefix}${key}`],
    );
  const load = async (lang) => flatten(JSON.parse(await read(`app/i18n/locales/${lang}.json`))).sort();

  // 'jp', never the ISO 'ja' - the project-wide code for Japanese.
  const zh = await load('zh-TW');
  assert.ok(zh.length > 0);
  assert.deepEqual(await load('en'), zh, 'en is missing or has stray keys vs zh-TW');
  assert.deepEqual(await load('jp'), zh, 'jp is missing or has stray keys vs zh-TW');
});

test('the screens scenario01 walks through are all present', async () => {
  const files = await sourceFiles();
  for (const screen of [
    'app/pages/onboarding/Register.tsx',
    'app/pages/onboarding/InvestOffer.tsx',
    'app/pages/Home.tsx',
    'app/pages/Markets.tsx',
    'app/pages/StockDetail.tsx',
    'app/pages/Portfolio.tsx',
    'app/pages/Account.tsx',
    'app/components/charts/KLineChart.tsx',
  ]) {
    assert.ok(files.includes(screen), `${screen} is missing from the module`);
  }

  // Brand artwork is the module's own import, not a URL into someone's
  // public/ folder - the standalone build's BASE_URL trick has no meaning
  // inside webapp.
  const logo = await read('app/components/logo/LogoHorizontal.tsx');
  assert.match(logo, /from "\.\.\/\.\.\/\.\.\/assets\/logos\/logo-zh\.webp"/);
  assert.doesNotMatch(logo, /import\.meta\.env\.BASE_URL/);
});

test('AR scenery is not exposed as interactive GuGo controls', async () => {
  const register = await read('app/pages/onboarding/Register.tsx');
  assert.doesNotMatch(register, /<input|onChange=/, 'demo credentials must not focus or open a keyboard');
  assert.match(register, /register\(DEMO_PHONE\)/, 'the story registration CTA remains connected');

  const header = await read('app/components/layout/PageHeader.tsx');
  assert.doesNotMatch(header, /<button|onClick=|useGuGoNavigate/, 'the account icon is visual only');

  const footer = await read('app/components/layout/BottomNav.tsx');
  assert.doesNotMatch(footer, /GuGoNavLink|<button|onClick=|tabIndex=/, 'footer items are not controls');

  const home = await read('app/pages/Home.tsx');
  assert.doesNotMatch(home, /role="button"|tabIndex=|onClick=|onKeyDown=|useGuGoNavigate/);

  const stockRow = await read('app/components/ui/StockRow.tsx');
  assert.doesNotMatch(stockRow, /<button|onClick=|useGuGoNavigate/, 'stock rows cannot open detail pages');

  for (const path of [
    'app/pages/Account.tsx',
    'app/pages/Markets.tsx',
    'app/pages/Portfolio.tsx',
    'app/pages/StockDetail.tsx',
    'app/components/layout/TopBar.tsx',
    'app/components/ui/LanguageSwitcher.tsx',
  ]) {
    const scenery = await read(path);
    assert.doesNotMatch(
      scenery,
      /<button|<input|<select|onClick=|onChange=|tabIndex=|useGuGoNavigate/,
      `${path} must remain display-only even when reached through a deep link`,
    );
  }

  const account = await read('app/pages/Account.tsx');
  assert.doesNotMatch(account, /resetDemo|changeLanguage|window\.confirm/, 'account cannot mutate the scenario or platform state');

  const store = await read('app/store/AppStoreContext.tsx');
  assert.doesNotMatch(store, /resetDemo|toggleWatchlist|isWatched/, 'non-story state actions must not be exposed');

  for (const chartPath of ['app/components/charts/AreaTrendChart.tsx', 'app/components/charts/KLineChart.tsx']) {
    const chart = await read(chartPath);
    assert.match(chart, /handleScroll: false/);
    assert.match(chart, /handleScale: false/);
    assert.match(chart, /CrosshairMode\.Hidden/);
    assert.match(chart, /attributionLogo: false/, 'the fixed bottom-left library logo is replaced by the shared attribution');
    assert.match(chart, /<ChartAttribution \/>/);
  }

  const attribution = await read('app/components/charts/ChartAttribution.tsx');
  assert.match(attribution, /href="https:\/\/www\.tradingview\.com\/"/);
  assert.match(attribution, /absolute right-1 top-0/);
  assert.match(attribution, /text-\[8px\]/);
});

test('shared LINE back affordance is presentational, not a control', async () => {
  const line = await readFile(new URL('../src/apps/line/components/Line.jsx', import.meta.url), 'utf8');
  assert.match(line, /showBack && <span className="line-icon-btn" aria-hidden="true">/);
  assert.doesNotMatch(line, /onClick=\{onBack\}/);
});

// The onboarding-stage contract, and the one thing scenario01 does with it.
//
// The bug it exists for: scenario01's footer offered "查看 AI 智慧量化合約持股"
// from the moment the platform mounted - while the player was still on the
// register screen, before any deposit had been made and therefore before the
// AI quant contract had bought a single share. A control cannot promise a
// holdings page that does not exist yet, and tapping it jumped GuGo's own
// register -> deposit walk.
//
// Fixing it by hiding the button in CSS would have left the same wrong state
// one stylesheet away, so the platform reports where it is and the story
// decides what that means. These assertions pin both halves of that contract.
test('the platform reports how far its own onboarding has got', async () => {
  const { GUGO_ONBOARDING_STAGES } = await import('../src/apps/gugo-invest/index.js');
  assert.deepEqual(GUGO_ONBOARDING_STAGES, { register: 'register', deposit: 'deposit', funded: 'funded' });
  assert.ok(Object.isFrozen(GUGO_ONBOARDING_STAGES));

  // Read from that one declaration on both sides, so a renamed stage cannot
  // leave the gate reporting a value the host no longer recognises.
  const gate = (await read('app/OnboardingGate.tsx')).replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.match(gate, /import \{ GUGO_ONBOARDING_STAGES \} from "\.\.\/index\.js";/);
  assert.doesNotMatch(gate, /['"]funded['"]/, 'the stage values must not be re-literalised here');
  // register -> deposit -> funded, in that order, off the same two flags the
  // gate already renders from.
  assert.match(gate, /!registered\s*\?\s*GUGO_ONBOARDING_STAGES\.register/);
  assert.match(gate, /!investCompleted\s*\?\s*GUGO_ONBOARDING_STAGES\.deposit/);
  assert.match(gate, /:\s*GUGO_ONBOARDING_STAGES\.funded/);
  // Reported on mount too, not only on transitions: a reload straight onto a
  // funded account must not leave the host stuck on its initial guess.
  assert.match(gate, /useEffect\(\(\) => \{\s*onStageChange\?\.\(stage\);\s*\}, \[stage, onStageChange\]\);/);

  const app = (await read('app/GuGoInvestApp.tsx')).replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.match(app, /onOnboardingStageChange\?: \(stage: string\) => void;/);
  assert.match(app, /<OnboardingGate onStageChange=\{onOnboardingStageChange\}>/);
});

test('scenario01 reveals the holdings CTA only once the deposit is done', async () => {
  const host = (await readFile(new URL('../src/pages/scenario01/PlatformRegister.jsx', import.meta.url), 'utf8'))
    .replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

  // The story reads the platform's report rather than guessing from the URL
  // or from its own button presses.
  assert.match(host, /import \{ GUGO_ONBOARDING_STAGES \} from '\.\.\/\.\.\/apps\/gugo-invest';/);
  assert.match(host, /onOnboardingStageChange=\{setStage\}/);
  assert.match(host, /const funded = stage === GUGO_ONBOARDING_STAGES\.funded;/);

  // ...and the reveal is that state, not a class the button keeps wearing.
  // The footer element itself is what's gated, so an emptied bar can't sit
  // over a platform that is meant to be full-bleed until the deposit lands.
  //
  // The footer is now its own component - GuGoStoryFooter - because it also
  // declares scenario01's AR Interaction Contract for this step, and that
  // declaration must only exist while the footer is really on screen (see
  // PlatformRegister.jsx). What is gated is unchanged: the whole bar, on
  // `funded`, and nothing below it renders when the deposit has not landed.
  assert.match(host, /\{funded \? \(\s*<GuGoStoryFooter/);
  assert.match(host, /function GuGoStoryFooter\([\s\S]*?<div className="gugo-embed-footer">/);
  const footerStart = host.indexOf('function GuGoStoryFooter');
  const cta = host.indexOf('查看 AI 智慧量化合約持股');
  assert.ok(cta > 0, 'the holdings CTA should still exist');
  assert.ok(footerStart > 0 && footerStart < cta, 'the CTA must sit inside the gated footer');
  assert.ok(host.indexOf('export function PlatformRegister') > cta, 'the footer is the only place the CTA lives');
  assert.doesNotMatch(host, /display:\s*none|visibility:\s*hidden|hidden=\{/, 'gate the state, not the pixels');
});
