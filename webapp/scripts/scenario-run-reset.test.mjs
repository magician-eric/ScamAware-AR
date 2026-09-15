// A scenario run owns its platform registration: starting a run wipes it,
// and nothing inside a run may.
//
// Both halves matter equally. Scenario01 used to fail the first (GuGo
// Invest's iframe kept `registered: true` in localStorage across runs, so the
// second run skipped registration entirely), and the obvious fix - resetting
// whenever the platform opens - would have failed the second, asking the
// player to register again on every LINE -> platform trip.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

function fakeStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    get length() {
      return store.size;
    },
    key: (i) => [...store.keys()][i] ?? null,
    // Object.keys() over the real Storage object enumerates its keys; the
    // sweeps under test rely on that, so the fake has to expose them too.
    snapshot: () => Object.fromEntries(store),
  };
}

function installStorages(local = {}, session = {}) {
  const localStorage = new Proxy(fakeStorage(local), {
    ownKeys: (target) => Object.keys(target.snapshot()),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
  const sessionStorage = new Proxy(fakeStorage(session), {
    ownKeys: (target) => Object.keys(target.snapshot()),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
  globalThis.localStorage = localStorage;
  globalThis.sessionStorage = sessionStorage;
  return { localStorage, sessionStorage };
}

const REGISTERED_GUGO = JSON.stringify({
  registered: true,
  phone: '0995-165165',
  cash: 0,
  holdings: {},
  watchlist: [],
  quantContract: { amount: 300000 },
  totalDeposited: 300000,
});

const REGISTERED_PLATFORM = JSON.stringify({
  route: '/scenario02-romance/platform-home',
  page: 'home',
  registrationCompleted: true,
  accountCreated: true,
  termsAccepted: true,
});

test('scenario01: starting a run clears the embedded GuGo Invest account', async () => {
  const { localStorage, sessionStorage } = installStorages(
    { 'gugo-invest-app-state': REGISTERED_GUGO, 'gugo-invest-language': 'en', 'cibar-location': 'keep-me' },
    { 'cibar-scenario01-lineteacher-clock': '1700000000000' },
  );
  const { resetScenario01 } = await import('../src/lib/scenario01Store.js');

  resetScenario01();

  assert.equal(localStorage.getItem('gugo-invest-app-state'), null, 'GuGo registration must not survive a new run');
  assert.equal(localStorage.getItem('gugo-invest-language'), null);
  assert.equal(sessionStorage.getItem('cibar-scenario01-lineteacher-clock'), null, 'chat clock is run state');
  assert.equal(localStorage.getItem('cibar-location'), 'keep-me', 'unrelated app state must be left alone');
});

test('scenario02: starting a run clears the 幣勝客 registration flags', async () => {
  const { localStorage, sessionStorage } = installStorages(
    { 'cibar-scenario02-dating-resolved': '["a"]', 'cibar-location': 'keep-me' },
    { 'cibar-scenario02-platform-state': REGISTERED_PLATFORM },
  );
  const { resetScenario02, getPlatformState, DEFAULT_PLATFORM_STATE } = await import('../src/lib/scenario02Store.js');

  resetScenario02();

  assert.equal(sessionStorage.getItem('cibar-scenario02-platform-state'), null);
  assert.deepEqual(getPlatformState(), DEFAULT_PLATFORM_STATE, 'a new run starts un-registered');
  assert.equal(localStorage.getItem('cibar-scenario02-dating-resolved'), null);
  assert.equal(localStorage.getItem('cibar-location'), 'keep-me');
});

test('scenario02: an intra-run platform <-> LINE trip keeps the registration', async () => {
  installStorages({}, {});
  const { savePlatformState, getPlatformState } = await import('../src/lib/scenario02Store.js');

  savePlatformState({ registrationCompleted: true, accountCreated: true, termsAccepted: true });
  // What every later page transition does: patch one field, leave the rest.
  savePlatformState({ page: 'home' });
  savePlatformState({ depositCompleted: true, balance: 10000 });

  const state = getPlatformState();
  assert.equal(state.registrationCompleted, true, 'the player must not be asked to register twice in one run');
  assert.equal(state.accountCreated, true);
  assert.equal(state.balance, 10000);
});

test('scenario05: the seller identity is drawn from the shared name pool, and never left blank', async () => {
  installStorages({}, {});
  const { resetScenario05, getBuyerCast, saveScenario05State } = await import('../src/lib/scenario05Store.js');
  const { getSellerName } = await import('../src/data/scenario05Characters.js');
  const { NAME_POOLS } = await import('../src/experience/characters/names.js');
  const pooled = (lang) => [...NAME_POOLS.female.casual[lang], ...NAME_POOLS.male.casual[lang]];

  // Normal entry: reset casts it, and the name is a real pool member in
  // every language - never hardcoded, never asked of the player.
  resetScenario05();
  for (const lang of ['zh', 'en', 'jp']) {
    assert.ok(pooled(lang).includes(getSellerName(getBuyerCast(), lang)), `${lang} seller name must come from the shared pool`);
  }

  // Both genders occur across runs, so the pre-filled sender is not always
  // female (the buyer role's gender must not leak into the seller's).
  const zhNames = new Set();
  for (let i = 0; i < 60; i += 1) {
    installStorages({}, {});
    resetScenario05();
    zhNames.add(getSellerName(getBuyerCast(), 'zh'));
  }
  assert.ok([...zhNames].some((n) => NAME_POOLS.male.casual.zh.includes(n)), 'male seller names must occur');
  assert.ok([...zhNames].some((n) => NAME_POOLS.female.casual.zh.includes(n)), 'female seller names must occur');

  // Landing mid-scenario without ever passing through the reset (direct URL,
  // storage cleared behind the player) must still resolve a seller, or
  // ShopCreate renders an empty 寄件人 field.
  installStorages({}, {});
  saveScenario05State({ selectedProduct: 'tablet' });
  const healed = getBuyerCast();
  assert.equal(healed.roles.sellerSender?.roleId, 'scenario05.sellerSender');
  assert.ok(pooled('zh').includes(getSellerName(healed, 'zh')));
  assert.equal(healed.roles.marketplaceBuyer?.roleId, 'scenario05.buyerTablet');
});

test('the run reset is triggered from the Briefing, and only from the Briefing', async () => {
  const briefings = [
    ['pages/scenario01/Briefing.jsx', 'resetScenario01'],
    ['pages/scenario02/Briefing.jsx', 'resetScenario02'],
  ];
  for (const [path, reset] of briefings) {
    const source = await read(`src/${path}`);
    assert.match(source, new RegExp(`useScenarioRunStart\\(${reset}\\)`), `${path} must start the run`);
  }

  // Every other scenario01/scenario02 file: no reset call. A platform page or
  // a LINE page calling one would re-run registration mid-story.
  const midRunFiles = [
    'src/pages/scenario01/PlatformRegister.jsx',
    'src/pages/scenario01/VipGroup.jsx',
    'src/pages/scenario02/PrivateChat.jsx',
    'src/apps/coin-winner/PlatformLanding.jsx',
    'src/apps/coin-winner/PlatformRegister.jsx',
    'src/apps/coin-winner/PlatformHome.jsx',
  ];
  for (const path of midRunFiles) {
    const source = await read(path);
    assert.doesNotMatch(source, /resetScenario0[12]\(|resetGuGoState\(/, `${path} must not reset the run`);
  }

  // Both scenarios' final decision step (shared ScenarioFinalDecision) sends
  // the player back to the AR scan rather than resetting the run inline, so
  // there is exactly one reset point per scenario (the Briefing) to keep
  // correct.
  assert.match(await read('src/pages/scenario01/Quiz.jsx'), /ScenarioFinalDecision/);
  assert.doesNotMatch(await read('src/pages/scenario01/Quiz.jsx'), /resetScenario0[12]\(/);
  assert.doesNotMatch(await read('src/pages/scenario02/Quiz.jsx'), /resetScenario0[12]\(/);
});
