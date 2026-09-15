// Coin Winner owns the 幣勝客 platform; Scenario 02 owns the story.
//
// The app module used to import lib/scenario02Store directly from three
// screens - reading the run's balance/profit, reading how far the scam had
// progressed, and writing the registration flags - and three more screens
// built raw store patches and handed them out through their callbacks. It now
// receives what it draws as props and reports what happened through semantic
// callbacks; Scenario 02's hosts (pages/scenario02/CoinWinnerScreens.jsx plus
// coinWinnerAppState.js) own every store read and write. These tests pin both
// halves - that the app cannot reach the store, and that the story still lands
// in exactly the same state.
//
// #285 moved navigation out of the app; scripts/coin-winner-navigation-boundary
// .test.mjs still owns that half. The checks here only re-assert the parts of
// it this refactor could have undone.
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;
const APP_URL = new URL('../src/apps/coin-winner/', import.meta.url);
const APP_DIR = APP_URL.pathname;
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const readApp = (file) => readFile(new URL(file, APP_URL), 'utf8');
const stripComments = (source) => source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

// A scenario store imported with an extension is the same module as one
// imported without: `lib/scenario02Store` and `lib/scenario02Store.js` resolve
// identically, so both spellings have to be caught. Matched generically over
// JS/TS extensions rather than per store.
const SCENARIO_STATE_IMPORT = /(?:^|\/)(?:scenario\d+Store|shoppingStore|scenario\d+Characters)(?:\.[mc]?[jt]sx?)?$/i;
const IMPORT_SPECIFIER = /(?:from\s*|import\s*)['"]([^'"]+)['"]/g;

async function appSources(dir = APP_DIR) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await appSources(path)));
    else if (/\.[jt]sx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    snapshot: () => Object.fromEntries(store),
  };
}

function installStorages() {
  const wrap = (s) => new Proxy(s, {
    ownKeys: (target) => Object.keys(target.snapshot()),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
  globalThis.localStorage = wrap(fakeStorage());
  globalThis.sessionStorage = wrap(fakeStorage());
}

// The scenario side, loaded the way the hosts load it.
async function scenario() {
  installStorages();
  return {
    store: await import('../src/lib/scenario02Store.js'),
    app: await import('../src/pages/scenario02/coinWinnerAppState.js'),
  };
}

// switchToLine() is what every host hands its patch to; a recorder stands in
// for react-router so the store write *and* the destination are both checked.
function lineTrip() {
  const visited = [];
  return { navigate: (route) => visited.push(route), visited };
}

const LINE_CHAT = '/scenario02-romance/private-chat';

// --- 1. the boundary itself --------------------------------------------------

test('1. no Coin Winner source imports a Scenario 02 store', async () => {
  const offenders = [];
  for (const file of await appSources()) {
    const source = await readFile(file, 'utf8');
    for (const [, value] of source.matchAll(IMPORT_SPECIFIER)) {
      if (SCENARIO_STATE_IMPORT.test(value)) offenders.push(`${file.slice(APP_DIR.length)} -> ${value}`);
    }
  }
  assert.deepEqual(offenders, [], 'apps/coin-winner must not import Scenario 02 run state');

  // Not just the import: no direct store access of any shape either, and no
  // store field names smuggled out inside a callback payload.
  for (const file of await appSources()) {
    const code = stripComments(await readFile(file, 'utf8'));
    const rel = file.slice(APP_DIR.length);
    assert.doesNotMatch(code, /usePlatformState|getPlatformState|savePlatformState|resetScenario02/,
      `${rel} touches the scenario store`);
    assert.doesNotMatch(code, /\b(?:getState|setState|subscribe)\s*\(/, `${rel} reaches into a store handle`);
    for (const field of ['platformStep', 'selectedStrategy', 'withdrawalStep', 'registrationCompleted',
      'accountCreated', 'termsAccepted', 'depositCompleted']) {
      assert.doesNotMatch(code, new RegExp(`\\b${field}\\b`), `${rel} knows the store field ${field}`);
    }
  }
});

// The rule has to be enforced by the build, not by a reviewer remembering it.
test('2a. validate:boundaries fails if Coin Winner reaches for the store again', async () => {
  await run('node', ['scripts/validate-app-boundaries.mjs'], { cwd: WEBAPP });

  const validator = await read('scripts/validate-app-boundaries.mjs');
  const debt = validator.match(/SCENARIO_STATE_DEBT = \[([^\]]*)\]/)[1];
  assert.ok(!debt.includes('coin-winner'), 'Coin Winner must not be exempted from the store rule');
  assert.equal(debt.trim(), '', 'AD-01 is paid off: no App module is exempt any more');

  // ...and it is held to the stricter scenario-owned-import rule too, so it
  // cannot reach back through lib/, data/ or pages/ either.
  const strict = validator.match(/SCENARIO_STATE_FREE_APPS = \[([^\]]*)\]/)[1];
  for (const app of ['blackpi', 'coin-winner', 'mydondon']) {
    assert.ok(strict.includes(app), `${app} is decoupled and must be held to the strict rule`);
  }
});

// The rule must hold for every spelling of the same import. `scenario02Store`
// and `scenario02Store.js` are one module; an extension-blind rule would let
// the second walk past it. Driven against the real validator through fixture
// files rather than a copy of its regex, so the two cannot drift apart.
const BLOCKED_IMPORTS = [
  '../../lib/scenario02Store',
  '../../lib/scenario02Store.js',
  '../../lib/scenario02Store.jsx',
  '../../lib/scenario02Store.mjs',
  '../../lib/scenario02Store.cjs',
  '../../lib/scenario02Store.ts',
  '../../lib/scenario02Store.tsx',
  '../../lib/shoppingStore',
  '../../lib/shoppingStore.js',
];

// App-owned imports, plus the near-misses an over-broad rule would swallow:
// the App's own dictionary (AD-14 is paid off - Coin Winner owns its copy
// now) and modules that merely contain a store name rather than being one.
const ALLOWED_IMPORTS = [
  'react',
  'lucide-react',
  '../../shell/StageClassContext',
  '../../lib/useCountUp',
  '../../lib/constants',
  './i18n',
  '../../components/warnings/FraudWarningBanner',
  '../../lib/scenario02StoreHelpers',
];

async function runValidator() {
  try {
    const { stdout } = await run('node', ['scripts/validate-app-boundaries.mjs'], { cwd: WEBAPP });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.code ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// Fixtures live under src/apps/ because that is the only place the rule
// applies, and are removed again whatever the assertions do.
async function withAppFixture(files, assertions) {
  const dir = join(WEBAPP, 'src/apps/__coin-winner-fixture__');
  try {
    await mkdir(dir, { recursive: true });
    for (const [name, body] of Object.entries(files)) await writeFile(join(dir, name), body, 'utf8');
    await assertions(await runValidator());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('2b. extensionless and extensioned store imports are both blocked', async () => {
  for (const specifier of BLOCKED_IMPORTS) {
    await withAppFixture(
      { 'Offender.jsx': `import { thing } from '${specifier}';\n\nexport const value = thing;\n` },
      ({ code, output }) => {
        assert.equal(code, 1, `validator must reject "${specifier}"`);
        assert.match(output, /__coin-winner-fixture__\/Offender\.jsx: app imports scenario/);
        assert.ok(output.includes(specifier), `violation should name "${specifier}"`);
      },
    );
  }
});

test('2c. App-owned imports and near-misses are left alone', async () => {
  const body = `${ALLOWED_IMPORTS.map((s, i) => `import x${i} from '${s}';`).join('\n')}\n\nexport const all = [${ALLOWED_IMPORTS.map((_, i) => `x${i}`).join(', ')}];\n`;
  await withAppFixture({ 'Innocent.jsx': body }, ({ output }) => {
    // Scoped to this fixture rather than the run's exit code: blackpi-store-
    // boundary.test.mjs writes its own fixture into src/apps/ too, and a
    // foreign violation must not be able to fail (or pass) this assertion.
    const mine = output.split('\n').filter((line) => line.includes('__coin-winner-fixture__'));
    assert.deepEqual(mine, [], `an App module importing its own dependencies must pass:\n${output}`);
  });
});

// --- 3 + 4. the props / callbacks API ----------------------------------------

test('3. every screen that lost the store now takes Scenario-owned data as props', async () => {
  const expected = {
    'PlatformHome.jsx': /export function PlatformHome\(\{\s*portfolio = \{\},\s*strategyRunning = false,\s*visit = HOME_VISIT_BROWSING,/,
    'WithdrawalPage.jsx': /export function WithdrawalPage\(\{ portfolio = \{\}, onWithdrawalFailed \}\)/,
    // referralCode joined the props with AD-14: the code on the form is the
    // scammer's, drawn from Scenario 02's cast, so the scenario hands it in
    // rather than the platform reaching into scenario02 for it.
    'PlatformRegister.jsx': /export function PlatformRegister\(\{ onAccountCreated, onRegistrationComplete, referralCode = 'REFERRAL88' \}\)/,
  };
  for (const [file, pattern] of Object.entries(expected)) {
    assert.match(await readApp(file), pattern, `${file} signature`);
  }

  // The host passes the individual figures, never the whole run state.
  const host = stripComments(await read('src/pages/scenario02/CoinWinnerScreens.jsx'));
  assert.match(host, /portfolio=\{selectPortfolio\(platform\)\}/);
  assert.match(host, /portfolio=\{selectWithdrawalPortfolio\(platform\)\}/);
  assert.match(host, /strategyRunning=\{selectStrategyRunning\(platform\)\}/);
  assert.match(host, /visit=\{selectHomeVisit\(platform\)\}/);
  assert.match(host, /referralCode=\{getDatingLeadReferralCode\(\)\}/);
  assert.doesNotMatch(host, /(?:platform|state|scenarioState)=\{platform\}/,
    'handing the app the whole store would be a fake decoupling');
});

test('4. Coin Winner reports interaction only through semantic callbacks', async () => {
  const expected = {
    'PlatformLanding.jsx': ['onStart'],
    'PlatformRegister.jsx': ['onAccountCreated', 'onRegistrationComplete'],
    'PlatformHome.jsx': ['onProfitReviewed', 'onRegistrationVisitComplete'],
    'DepositPage.jsx': ['onDepositComplete'],
    'TradingPage.jsx': ['onStrategyActivated'],
    'WithdrawalPage.jsx': ['onWithdrawalFailed'],
  };
  for (const [file, callbacks] of Object.entries(expected)) {
    const source = stripComments(await readApp(file));
    for (const name of callbacks) assert.match(source, new RegExp(`\\b${name}\\b`), `${file} must accept ${name}`);
  }

  // No callback anywhere in the app may name a scenario step, route or store.
  for (const file of await appSources()) {
    const code = stripComments(await readFile(file, 'utf8'));
    for (const [name] of code.matchAll(/\bon[A-Z]\w*/g)) {
      assert.doesNotMatch(name, /scenario|AR\d|step\d|Scene|Chapter|Store|Line/i,
        `${file.slice(APP_DIR.length)} declares a scenario-shaped callback: ${name}`);
    }
  }

  // The payloads are the app's own facts (an amount, a strategy), not store
  // patches: the store's field names appear only on the scenario side.
  const deposit = stripComments(await readApp('DepositPage.jsx'));
  assert.match(deposit, /reportDepositComplete\(\{\s*amount: STRATEGY_ACTIVATION_AMOUNT,\s*strategy: AI_ARBITRAGE_STRATEGY,\s*\}\)/);
  assert.match(stripComments(await readApp('TradingPage.jsx')), /onStrategyActivated\(\{ strategy: AI_ARBITRAGE_STRATEGY \}\)/);
  assert.match(stripComments(await readApp('WithdrawalPage.jsx')), /reportWithdrawalFailed\(\)/);
});

// --- 5-10. the story still lands in the same state ---------------------------

test('5 + 6. registration: the account the App reports is the account the run records', async () => {
  const { store, app } = await scenario();

  assert.equal(store.getPlatformState().registrationCompleted, false);
  app.completeRegistration();

  const registered = store.getPlatformState();
  assert.equal(registered.registrationCompleted, true);
  assert.equal(registered.accountCreated, true);
  assert.equal(registered.termsAccepted, true);
  assert.equal(registered.page, 'home');
  // Registration alone must not start the money flow.
  assert.equal(registered.depositCompleted, false);
  assert.equal(registered.balance, 0);

  // ...which is exactly what makes the next home visit the 5s one.
  assert.equal(app.selectHomeVisit(registered), 'post-registration');
});

test("7. deposit: the amount the App reports becomes the run's balance", async () => {
  const { store, app } = await scenario();
  const { navigate, visited } = lineTrip();

  app.completeRegistration();
  store.switchToLine(navigate, app.depositCompletedPatch({ amount: 10000, strategy: 'ai-arbitrage' }));

  const deposited = store.getPlatformState();
  assert.equal(deposited.depositCompleted, true);
  assert.equal(deposited.selectedStrategy, 'ai-arbitrage');
  assert.equal(deposited.balance, 10000);
  assert.equal(deposited.profit, 0);
  assert.equal(deposited.platformStep, 'running');
  assert.equal(deposited.page, 'deposit-success');
  assert.deepEqual(visited, [LINE_CHAT], 'a completed deposit hands control back to LINE');
  assert.equal(app.selectStrategyRunning(deposited), true, '策略 reads as 運行中 after the deposit');

  // The strategy page's own activation records the strategy without touching
  // the money.
  store.switchToLine(navigate, app.strategyActivatedPatch({ strategy: 'ai-arbitrage' }));
  assert.equal(store.getPlatformState().balance, 10000, 'activating a strategy must not move money');
  assert.equal(store.getPlatformState().page, 'strategy');

  // And the amount the App actually reports is the one its form processes.
  const catalog = await read('src/apps/coin-winner/catalog.js');
  assert.match(catalog, /STRATEGY_ACTIVATION_AMOUNT = 10000/);
  assert.match(catalog, /AI_ARBITRAGE_STRATEGY = 'ai-arbitrage'/);
});

test('8. profit / portfolio: the scripted check-ins reach the App as props', async () => {
  const { store, app } = await scenario();
  const { navigate, visited } = lineTrip();

  // 十五: PrivateChat's s15-check-goto sets the numbers before sending the player over.
  store.savePlatformState({ page: 'home', platformStep: 'stage1', balance: 10860, profit: 860 });
  let state = store.getPlatformState();
  assert.equal(app.selectHomeVisit(state), 'profit-update');
  assert.deepEqual(app.selectPortfolio(state), { balance: 10860, profit: 860 });
  assert.equal(app.selectStrategyRunning(state), false, '運行中 follows the deposit, not the profit');

  // Seeing it reported back leaves the numbers alone and returns to LINE.
  store.switchToLine(navigate, app.profitReviewedPatch());
  assert.equal(store.getPlatformState().balance, 10860, 'reviewing profit must not change it');
  assert.deepEqual(visited, [LINE_CHAT]);

  // 十六: s17-check-goto, the bigger number.
  store.savePlatformState({ page: 'home', platformStep: 'stage3', balance: 38640, profit: 28640 });
  state = store.getPlatformState();
  assert.equal(app.selectHomeVisit(state), 'profit-update');
  assert.deepEqual(app.selectPortfolio(state), { balance: 38640, profit: 28640 });

  // An ordinary visit is neither, and does nothing on its own.
  assert.equal(app.selectHomeVisit({ ...state, platformStep: 'running' }), 'browsing');
  assert.equal(app.selectHomeVisit({ ...state, platformStep: 'idle', registrationCompleted: false }), 'browsing');
});

test('9. withdrawal failure: the run records the failure and keeps the money on screen', async () => {
  const { store, app } = await scenario();
  const { navigate, visited } = lineTrip();

  // 十七: s17-end puts the player on the withdrawal page with the 十六 numbers.
  store.savePlatformState({ page: 'withdrawal', withdrawalStep: 'requested', balance: 38640, profit: 28640 });
  assert.deepEqual(app.selectWithdrawalPortfolio(store.getPlatformState()), { balance: 38640, profit: 28640 });

  store.switchToLine(navigate, app.withdrawalFailedPatch());
  const failed = store.getPlatformState();
  assert.equal(failed.withdrawalStep, 'failed');
  assert.equal(failed.page, 'withdrawal-failed');
  assert.equal(failed.balance, 38640, 'a failed withdrawal must not move the money');
  assert.deepEqual(visited, [LINE_CHAT], '十八 continues in LINE');

  // A direct visit with no run behind it still shows the story's figures
  // rather than zeroes - the fallback the app used to hardcode.
  assert.deepEqual(app.selectWithdrawalPortfolio({ balance: 0, profit: 0 }), { balance: 38640, profit: 28640 });
});

test('10. verification money flow: GuaranteePage still projects off the run balance', async () => {
  const { store, app } = await scenario();
  const { navigate } = lineTrip();

  store.savePlatformState({ balance: 38640, profit: 28640 });
  store.switchToLine(navigate, app.withdrawalFailedPatch());

  // 二十二: s22-end moves the run to the verification page; the balance it
  // projects from is the one the platform pages left behind.
  store.savePlatformState({ page: 'guarantee', withdrawalStep: 'verification-required' });
  const state = store.getPlatformState();
  assert.equal(state.balance, 38640);
  assert.equal(state.balance + 30000, 68640, '完成後預計可提領 = 餘額 + NT$30,000');

  // GuaranteePage is a Scenario 02 page, not part of the app module, so it
  // reads that balance from the store directly - and still does.
  const guarantee = await read('src/pages/scenario02/GuaranteePage.jsx');
  assert.match(guarantee, /usePlatformState/);
  assert.match(guarantee, /\(platform\.balance \|\| 38640\) \+ 30000/);
});

// --- 11 + 12. #285's boundary is still standing ------------------------------

test('11. the #285 navigation boundary has not regressed', async () => {
  for (const file of await appSources()) {
    const source = await readFile(file, 'utf8');
    const code = stripComments(source);
    const rel = file.slice(APP_DIR.length);
    assert.doesNotMatch(code, /\/scenario\d+-/, `${rel} must not name a scenario route`);
    assert.doesNotMatch(code, /useNavigate|\bnavigate\(/, `${rel} must not navigate`);
    assert.doesNotMatch(code, /switchToLine/, `${rel} must not decide when to leave for LINE`);
    for (const [, value] of source.matchAll(IMPORT_SPECIFIER)) {
      assert.doesNotMatch(value, /pages\/scenario\d+/, `${rel} must not import a scenario page`);
    }
  }

  const routes = await read('src/routes.jsx');
  assert.doesNotMatch(routes, /from '\.\/apps\/coin-winner'/, 'routes mount the app through Scenario 02');
  assert.match(routes, /from '\.\/pages\/scenario02\/CoinWinnerScreens'/);

  // Every trip back to LINE still goes through the scenario's own helper.
  const host = stripComments(await read('src/pages/scenario02/CoinWinnerScreens.jsx'));
  const trips = host.match(/switchToLine\(navigate, \w+\(\w*\)\)/g) ?? [];
  assert.equal(trips.length, 5, 'profit, post-registration, deposit, strategy and withdrawal all return to LINE');
});

test('12. the post-registration screen returns to LINE when the player says so', async () => {
  const code = stripComments(await readApp('PlatformHome.jsx'));

  // The visit used to end itself 5s after it opened, which is what made the
  // platform flash past. It ends on the player's press now: no clock decides
  // when this screen is finished.
  assert.doesNotMatch(code, /REGISTRATION_RETURN_DELAY|PROFIT_REVIEW_DELAY/,
    'the timed returns are gone; the player decides when the visit is over');
  assert.doesNotMatch(code, /setTimeout/, 'nothing on the platform home may report itself on a timer');
  assert.match(code, /<ReturnBar onReturn=\{requestReturn\} \/>/, '返回 LINE 對話 is what ends the visit');

  // The "fire exactly once" guard stays in the app - it just guards a press
  // now rather than a timeout - and so does the stable-callback wrapper the
  // guarded handler reads its props through.
  assert.match(code, /if \(!reportReturn \|\| firedRef\.current\) return;/);
  assert.match(code, /const reportRegistrationVisitComplete = useEventCallback\(onRegistrationVisitComplete\)/);
  assert.match(await readApp('useEventCallback.js'), /useInsertionEffect/);

  // ...and the scenario end of it still lands in datingLead's LINE chat, with
  // the registration flags intact for whatever reads them next.
  const host = stripComments(await read('src/pages/scenario02/CoinWinnerScreens.jsx'));
  assert.match(host, /onRegistrationVisitComplete=\{onRegistrationVisitComplete\}/);
  assert.match(host, /switchToLine\(navigate, registrationVisitCompletePatch\(\)\)/);

  const { store, app } = await scenario();
  const { navigate, visited } = lineTrip();
  store.switchToLine(navigate, app.registrationVisitCompletePatch());
  assert.deepEqual(visited, [LINE_CHAT], '返回 LINE 對話 ends in LINE');
  const after = store.getPlatformState();
  assert.equal(after.registrationCompleted, true);
  assert.equal(after.accountCreated, true);
  assert.equal(after.termsAccepted, true);
});

// The beats that are *not* a way back to LINE keep their original timings:
// this change was about who ends a visit, not about the platform's own
// processing/creating pauses.
test('12b. the platform\'s own processing beats are untouched', async () => {
  assert.match(stripComments(await readApp('DepositPage.jsx')), /\}, 1200\);/, '入金處理中 still lasts 1.2s');
  assert.match(stripComments(await readApp('WithdrawalPage.jsx')), /setTimeout\(\(\) => setPhase\('failed'\), 1500\)/,
    '提領申請審核中 still lasts 1.5s');
  assert.match(stripComments(await readApp('PlatformRegister.jsx')), /setTimeout\(\(\) => reportRegistrationComplete\(\), 800\)/,
    '帳戶建立成功 still hands off to 平台首頁 after 0.8s');
});
