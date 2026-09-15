// Coin Winner (幣勝客) is an App module: it renders its own screens and
// reports what the player did. Scenario 02 owns where any of that leads.
// These are the invariants that keep that split honest - webapp has no
// DOM/JSX test runner, so they are checked against the sources themselves
// (same approach as gugo-invest-module.test.mjs).
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const APP_URL = new URL('../src/apps/coin-winner/', import.meta.url);
const WRAPPER = '../src/pages/scenario02/CoinWinnerScreens.jsx';
const read = (path, base = APP_URL) => readFile(new URL(path, base), 'utf8');
const stripComments = (source) => source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');

async function appFiles(dir = '') {
  const out = [];
  for (const entry of await readdir(new URL(dir || '.', APP_URL), { withFileTypes: true })) {
    const path = `${dir}${entry.name}`;
    if (entry.isDirectory()) out.push(...(await appFiles(`${path}/`)));
    else if (/\.[jt]sx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

test('A. the app module carries no scenario02 route literal and no router navigation', async () => {
  for (const path of await appFiles()) {
    const source = stripComments(await read(path));
    assert.doesNotMatch(source, /\/scenario\d+-/, `${path} must not name a scenario route`);
    assert.doesNotMatch(source, /useNavigate|\bnavigate\(/, `${path} must not navigate; it reports events instead`);
  }
});

test('E. the app module imports no scenario02 page, store helper or flow', async () => {
  for (const path of await appFiles()) {
    const source = await read(path);
    const imports = [...source.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const value of imports) {
      assert.doesNotMatch(value, /pages\/scenario\d+/, `${path} must not import a scenario page`);
    }
    // switchToLine() is the scenario's "hand control back to LINE" helper -
    // the app must never call it. (The store half of this boundary landed
    // separately; scripts/coin-winner-store-boundary.test.mjs owns it.)
    assert.doesNotMatch(stripComments(source), /switchToLine/, `${path} must not decide when to leave for LINE`);
  }
});

test('B. every completion the app used to navigate on is now a semantic callback', async () => {
  const expected = {
    'PlatformLanding.jsx': ['onStart'],
    'PlatformRegister.jsx': ['onAccountCreated', 'onRegistrationComplete'],
    'PlatformHome.jsx': ['onProfitReviewed', 'onRegistrationVisitComplete'],
    'DepositPage.jsx': ['onDepositComplete'],
    'TradingPage.jsx': ['onStrategyActivated'],
    'WithdrawalPage.jsx': ['onWithdrawalFailed'],
  };
  for (const [file, callbacks] of Object.entries(expected)) {
    const source = stripComments(await read(file));
    for (const name of callbacks) {
      assert.match(source, new RegExp(`\\b${name}\\b`), `${file} must accept ${name}`);
      // ...and no callback may leak a scenario step into the app's API.
      assert.doesNotMatch(name, /scenario|step\d|line/i, `${name} names a scenario destination`);
    }
  }
});

test('C. scenario 02 turns each callback into the route it used to navigate to itself', async () => {
  const wrapper = stripComments(await read(WRAPPER, import.meta.url));

  // The landing CTA and the finished registration are plain platform hops.
  assert.match(wrapper, /onStart=\{onStart\}/);
  assert.match(wrapper, /navigate\(COIN_WINNER_ROUTES\.register\)/);
  assert.match(wrapper, /onRegistrationComplete=\{onRegistrationComplete\}/);
  assert.match(wrapper, /navigate\(COIN_WINNER_ROUTES\.home\)/);

  // Everything else hands control back to datingLead's LINE chat, exactly as
  // the pages did before. The platform-state patch is now built on this side
  // of the boundary (see ./coinWinnerAppState.js) rather than handed up by the
  // app, but it is still switchToLine() that persists it and leaves.
  for (const prop of ['onProfitReviewed', 'onRegistrationVisitComplete', 'onDepositComplete', 'onStrategyActivated', 'onWithdrawalFailed']) {
    assert.match(wrapper, new RegExp(`${prop}=\\{(returnToLine|${prop})\\}`), `${prop} must be wired up`);
  }
  const trips = wrapper.match(/switchToLine\(navigate, \w+\(\w*\)\)/g) ?? [];
  assert.equal(trips.length, 5, 'each LINE return goes through the same helper');

  // The routes themselves are unchanged and still mounted on the wrappers.
  assert.match(wrapper, /landing: '\/scenario02-romance\/platform-landing'/);
  assert.match(wrapper, /register: '\/scenario02-romance\/platform-register'/);
  assert.match(wrapper, /home: '\/scenario02-romance\/platform-home'/);
  assert.match(wrapper, /deposit: '\/scenario02-romance\/deposit'/);
  assert.match(wrapper, /trading: '\/scenario02-romance\/trading'/);
  assert.match(wrapper, /withdrawal: '\/scenario02-romance\/withdrawal'/);

  const routes = await readFile(new URL('../src/routes.jsx', import.meta.url), 'utf8');
  for (const [path, element] of [
    ['scenario02-romance/platform-landing', 'CoinWinnerLandingPage'],
    ['scenario02-romance/platform-register', 'CoinWinnerRegisterPage'],
    ['scenario02-romance/platform-home', 'CoinWinnerHomePage'],
    ['scenario02-romance/deposit', 'CoinWinnerDepositPage'],
    ['scenario02-romance/trading', 'CoinWinnerTradingPage'],
    ['scenario02-romance/withdrawal', 'CoinWinnerWithdrawalPage'],
  ]) {
    assert.match(routes, new RegExp(`path: '${path}', element: <${element} />`), `${path} must render the scenario wrapper`);
  }
  assert.doesNotMatch(routes, /from '\.\/apps\/coin-winner'/, 'routes mount the app through scenario 02, not directly');
});

test('D. the post-registration screen waits for the player, then returns to LINE', async () => {
  const code = stripComments(await read('PlatformHome.jsx'));

  // This visit used to end itself 5s after it opened - the player was back in
  // the chat before they had read the screen. Nothing on this page decides
  // that the visit is over any more; 返回 LINE 對話 does, and only when it is
  // pressed.
  assert.doesNotMatch(code, /REGISTRATION_RETURN_DELAY|PROFIT_REVIEW_DELAY/,
    'the timed returns are gone, name and all');
  assert.doesNotMatch(code, /setTimeout/, 'the platform home may not report itself on a timer');
  assert.match(code, /<ReturnBar onReturn=\{requestReturn\} \/>/);

  // The "fire exactly once" guard stayed behind - it guards a press now
  // rather than a timeout - and the callback is still stabilised through
  // useEventCallback, so a host passing an inline arrow cannot leave the
  // guarded handler holding a stale prop.
  assert.match(code, /if \(!reportReturn \|\| firedRef\.current\) return;/);
  assert.match(code, /const reportRegistrationVisitComplete = useEventCallback\(onRegistrationVisitComplete\)/);
  assert.match(await read('useEventCallback.js'), /useInsertionEffect/);

  // ...and the scenario end of it still goes to the LINE chat.
  const wrapper = stripComments(await read(WRAPPER, import.meta.url));
  assert.match(wrapper, /onRegistrationVisitComplete=\{onRegistrationVisitComplete\}/);
  assert.match(wrapper, /switchToLine\(navigate, registrationVisitCompletePatch\(\)\)/);
  const store = await readFile(new URL('../src/lib/scenario02Store.js', import.meta.url), 'utf8');
  assert.match(store, /navigate\('\/scenario02-romance\/private-chat'\)/);
});

// Every one of the five trips back to LINE is the same control: the player
// presses 返回 LINE 對話, and the screen reports its own event. None of them
// is on a clock, and no screen shows the bar before the player has something
// to leave (the deposit has landed, the strategy is running, the withdrawal
// has failed).
test('every return to LINE is the player pressing the same bar', async () => {
  const bar = await read('ReturnBar.jsx');
  assert.match(bar, /t\('返回 LINE 對話'\)/, 'the label comes from the App\'s own dictionary');
  for (const [file, gate] of [
    ['PlatformHome.jsx', '{reportReturn && <ReturnBar onReturn={requestReturn} />}'],
    ['DepositPage.jsx', "{status === 'success' && <ReturnBar onReturn={requestReturn} />}"],
    ['TradingPage.jsx', '{activated && <ReturnBar onReturn={requestReturn} />}'],
    ['WithdrawalPage.jsx', "{phase === 'failed' && <ReturnBar onReturn={requestReturn} />}"],
  ]) {
    const code = stripComments(await read(file));
    assert.ok(code.includes(gate), `${file} must show the bar exactly where the visit is finished`);
    assert.match(code, /if \(!?\w*\s*\|?\|?\s*firedRef\.current\) return;|firedRef\.current\) return;/,
      `${file} must still report its event exactly once`);
  }
});

// The platform's own pauses are not returns and were never the complaint:
// they are the fake app pretending to work, and they keep their timings.
test('the platform\'s own processing beats keep their original timings', async () => {
  assert.match(stripComments(await read('DepositPage.jsx')), /\}, 1200\);/);
  assert.match(stripComments(await read('WithdrawalPage.jsx')), /setTimeout\(\(\) => setPhase\('failed'\), 1500\)/);
  assert.match(stripComments(await read('PlatformRegister.jsx')), /setTimeout\(\(\) => reportRegistrationComplete\(\), 800\)/);
});
