// BlackPi owns the storefront; Scenario 04 owns the story.
//
// The app module used to import lib/shoppingStore directly from nine screens,
// which meant the storefront knew what a 詐騙劇情 run is: it read the order,
// wrote the order status, and decided when the run had started. It now
// receives what it needs as props and reports what happened through semantic
// callbacks; Scenario 04's hosts (pages/scenario04/blackpi) own every store
// read and write. These tests pin both halves - that the app cannot reach the
// store, and that the story still ends up in exactly the same state.
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const run = promisify(execFile);
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const WEBAPP = new URL('../', import.meta.url).pathname;
const APP_DIR = new URL('../src/apps/blackpi/', import.meta.url).pathname;

// A scenario store imported with an extension is the same module as one
// imported without: `lib/shoppingStore` and `lib/shoppingStore.js` resolve
// identically, so both spellings have to be caught. Matched generically over
// JS/TS extensions rather than per store.
const SCENARIO_STATE_IMPORT = /(?:^|\/)(?:shoppingStore|scenario\d+Store|scenario\d+Characters)(?:\.[mc]?[jt]sx?)?$/i;

const IMPORT_SPECIFIER = /(?:from\s*|import\s*)['"]([^'"]+)['"]/g;

async function appSources(dir = APP_DIR) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await appSources(path));
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

const HEALTH = { route: 'health', name: '智慧掃拖機器人' };
const VEXA_FLEX_X1 = { route: 'luckyBag', name: 'VEXA FLEX X1｜8.7 吋旗艦摺疊手機' };

// --- the boundary itself -----------------------------------------------------

test('no BlackPi source imports a scenario store', async () => {
  const offenders = [];
  for (const file of await appSources()) {
    const source = await readFile(file, 'utf8');
    const imports = [...source.matchAll(IMPORT_SPECIFIER)].map((m) => m[1]);
    for (const value of imports) {
      if (SCENARIO_STATE_IMPORT.test(value)) offenders.push(`${file.slice(APP_DIR.length)} -> ${value}`);
    }
  }
  assert.deepEqual(offenders, [], 'apps/blackpi must not import Scenario 04 run state');

  // Not just the import: no direct store access of any shape either.
  for (const file of await appSources()) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /getShoppingState|saveShoppingState|useShoppingState|applyEffects/,
      `${file.slice(APP_DIR.length)} touches the scenario store`);
  }
});

// The rule has to be enforced by the build, not by a reviewer remembering it.
test('validate:boundaries fails if BlackPi reaches for the store again', async () => {
  await run('node', ['scripts/validate-app-boundaries.mjs'], { cwd: new URL('../', import.meta.url).pathname });

  const validator = await read('scripts/validate-app-boundaries.mjs');
  assert.match(validator, /SCENARIO_STATE_MODULE/, 'validator must know scenario stores by module name');
  assert.match(validator, /shoppingStore/, 'Scenario 04 store is under a legacy name and must be named explicitly');
  // The AD-01 exception list is empty - Coin Winner was the last debtor - so
  // BlackPi is held to the rule along with every other App module.
  const debt = validator.match(/SCENARIO_STATE_DEBT = \[([^\]]*)\]/)[1];
  assert.ok(!debt.includes('blackpi'), 'BlackPi must not be exempted from the store rule');
  assert.equal(debt.trim(), '', 'AD-01 is paid off: no App module is exempt any more');

  // The decoupled Apps are also held to the stricter scenario-owned-import
  // rule, so none can reach back through lib/data/pages either.
  const strict = validator.match(/SCENARIO_STATE_FREE_APPS = \[([^\]]*)\]/)[1];
  for (const app of ['blackpi', 'coin-winner', 'mydondon']) {
    assert.ok(strict.includes(app), `${app} is decoupled and must be held to the strict rule`);
  }
});

// The rule has to hold for every spelling of the same import. `shoppingStore`
// and `shoppingStore.js` are one module; an extension-blind rule would let the
// second walk past it. Driven against the real validator through fixture files
// rather than a copy of its regex, so the two cannot drift apart.
const BLOCKED_IMPORTS = [
  '../../lib/shoppingStore',
  '../../lib/shoppingStore.js',
  '../../lib/scenario02Store',
  '../../lib/scenario02Store.js',
  '../../data/scenario05Characters',
  '../../data/scenario05Characters.js',
  // The remaining extensions this repo could reasonably adopt.
  '../../lib/scenario05Store.jsx',
  '../../lib/scenario02Store.mjs',
  '../../lib/scenario05Store.cjs',
  '../../lib/scenario02Store.ts',
  '../../lib/scenario05Store.tsx',
];

// App-owned imports, plus the near-misses an over-broad rule would swallow:
// the App's own dictionary (AD-14 is paid off - BlackPi owns its copy now),
// and modules that merely contain a store name rather than being one.
const ALLOWED_IMPORTS = [
  'react',
  'lucide-react',
  '../../lib/feedback',
  '../../lib/useToast',
  './i18n',
  '../../lib/shoppingStoreHelpers',
  '../../lib/myShoppingStore',
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
  const dir = join(WEBAPP, 'src/apps/__boundary-fixture__');
  try {
    await mkdir(dir, { recursive: true });
    for (const [name, body] of Object.entries(files)) await writeFile(join(dir, name), body, 'utf8');
    await assertions(await runValidator());
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('the store rule catches every extension the same module can be imported with', async () => {
  for (const specifier of BLOCKED_IMPORTS) {
    await withAppFixture(
      { 'Offender.jsx': `import { thing } from '${specifier}';\n\nexport const value = thing;\n` },
      ({ code, output }) => {
        assert.equal(code, 1, `validator must reject "${specifier}"`);
        assert.match(output, /__boundary-fixture__\/Offender\.jsx: app imports scenario run state/);
        assert.ok(output.includes(specifier), `violation should name "${specifier}"`);
      },
    );
  }
});

test('App-owned imports and near-misses are left alone', async () => {
  const body = `${ALLOWED_IMPORTS.map((s, i) => `import x${i} from '${s}';`).join('\n')}\n\nexport const all = [${ALLOWED_IMPORTS.map((_, i) => `x${i}`).join(', ')}];\n`;
  await withAppFixture({ 'Innocent.jsx': body }, ({ code, output }) => {
    assert.equal(code, 0, `an App module importing its own dependencies must pass:\n${output}`);
  });
});

// Nothing is exempt any more - not the decoupled Apps, and not a fixture that
// might one day be added to slip past the rule.
test('the AD-01 exception list is empty', async () => {
  const validator = await read('scripts/validate-app-boundaries.mjs');
  const debt = validator.match(/SCENARIO_STATE_DEBT = \[([^\]]*)\]/)[1];
  assert.equal(debt.trim(), '');
  for (const app of ['__boundary-fixture__', 'blackpi', 'coin-winner', 'mydondon']) {
    assert.ok(!debt.includes(app), `${app} must not be exempt`);
  }
});

// routes.jsx is where the app could be re-attached to the store by accident.
test('routes mount BlackPi through Scenario 04 hosts, not the app directly', async () => {
  const routes = await read('src/routes.jsx');
  assert.doesNotMatch(routes, /from '\.\/apps\/blackpi'/, 'routes must not mount app screens directly');
  assert.match(routes, /from '\.\/pages\/scenario04\/blackpi'/);
  for (const host of ['BlackPiSplash', 'BlackPiHome', 'BlackPiCheckout', 'BlackPiOrderDetail', 'BlackPiOrders', 'BlackPiMessages', 'BlackPiMe']) {
    assert.ok(routes.includes(host), `routes.jsx should mount ${host}`);
  }
});

// --- the props / callbacks API ----------------------------------------------

test('every screen that lost the store now takes props and semantic callbacks', async () => {
  // The store-facing half of each signature. The navigation callbacks these
  // screens also take are pinned by blackpi-navigation-boundary.test.mjs;
  // what matters here is that the data still arrives as props and the
  // store-shaped events are still reported, not navigated around.
  const expected = {
    // onSelectProduct is the whole signature now: the search pill and the tab
    // bar it used to sit beside are scenery, so `\s*}` closes it.
    'Home.jsx': [/export function Home\(\{ onSelectProduct\s*[,}]/],
    'SearchResults.jsx': [/export function SearchResults\(\{ query: route = null, onSelectProduct[,}]/],
    'Search.jsx': [/export function Search\(\{ onSearchTerm[,}]/],
    'ProductDetail.jsx': [/export function ProductDetail\(\{ productRoute: route = null, onContactSeller, onBuy[,}]/],
    'Checkout.jsx': [/export function Checkout\(\{ productRoute: route = null, onConfirmPayment[,}]/],
    'Orders.jsx': [/export function Orders\(\{ order[,}]/],
    'OrderDetail.jsx': [/productRoute: route = null, order = \{\},\n\s*onDeliveryStatusChange[,}]/],
    'Messages.jsx': [/activeProductRoute = null, sellerUnreachable = false,/],
    'Me.jsx': [/export function Me\(\{ activeProductRoute = null[,}]/],
  };
  for (const [file, patterns] of Object.entries(expected)) {
    const source = await read(`src/apps/blackpi/screens/${file}`);
    for (const pattern of patterns) assert.match(source, pattern, `${file} signature`);
  }
});

// A callback named after a scenario step would put the story back into the app.
test('no App callback is named after a Scenario 04 step or route', async () => {
  for (const file of await appSources()) {
    const source = await readFile(file, 'utf8');
    const callbacks = [...source.matchAll(/\bon[A-Z]\w*/g)].map((m) => m[0]);
    for (const name of callbacks) {
      assert.doesNotMatch(name, /scenario|AR\d|step\d|Scene|Chapter/i,
        `${file.slice(APP_DIR.length)} declares a scenario-shaped callback: ${name}`);
    }
  }
});

// --- the story still lands in the same state ---------------------------------

test('a purchase reported by the App produces the order Scenario 04 expects', async () => {
  installStorages();
  const store = await import('../src/lib/shoppingStore.js');
  const app = await import('../src/pages/scenario04/blackpi/appState.js');

  app.markRunStarted();
  assert.ok(store.getShoppingState().scenarioStartedAt, 'entering the storefront starts the run');

  // 首頁 -> 商品詳情: the App only says which product was opened.
  app.selectProduct(HEALTH);
  assert.equal(store.getShoppingState().selectedRoute, 'health');

  // 確認付款.
  app.confirmPurchase(HEALTH);
  const placed = store.getShoppingState();
  assert.equal(placed.orderStatus, 'placed');
  assert.equal(placed.selectedRoute, 'health');
  assert.match(placed.orderId, /^BP\d{8}-CIB-165\d{2}$/, 'order id keeps its established shape');
  assert.ok(placed.orderCreatedAt, 'the order is stamped when it is placed');

  // 付款成功.
  app.settlePayment();
  assert.equal(store.getShoppingState().orderStatus, 'paid');
});

test('the order id and its timestamp are minted once, never on a revisit', async () => {
  installStorages();
  const store = await import('../src/lib/shoppingStore.js');
  const app = await import('../src/pages/scenario04/blackpi/appState.js');

  // An order id ends in two random digits, so two freshly minted ids collide
  // once in a hundred runs by chance alone. What is under test is whether the
  // id was minted again at all, not what it landed on, so the digits are made
  // to walk 0,1,2... here - the assertions below then mean what they say on
  // every run instead of 99 in 100.
  const realRandom = Math.random;
  let tick = 0;
  Math.random = () => { tick = (tick + 1) % 10; return tick / 10; };

  try {
    app.selectProduct(HEALTH);
    app.confirmPurchase(HEALTH);
    const first = store.getShoppingState();

    // Back to 結帳 and 確認付款 again on the same product line.
    app.confirmPurchase(HEALTH);
    const second = store.getShoppingState();
    assert.equal(second.orderId, first.orderId, 'revisiting checkout must not re-mint the order id');
    assert.equal(second.orderCreatedAt, first.orderCreatedAt, 'nor restamp it');

    // The other product line is a different order.
    app.confirmPurchase(VEXA_FLEX_X1);
    const other = store.getShoppingState();
    assert.equal(other.selectedRoute, 'luckyBag');
    assert.notEqual(other.orderId, first.orderId, 'switching product line mints a new order');
  } finally {
    Math.random = realRandom;
  }
});

test('the logistics montage reported by the App walks the order to 已送達', async () => {
  installStorages();
  const store = await import('../src/lib/shoppingStore.js');
  const app = await import('../src/pages/scenario04/blackpi/appState.js');

  app.confirmPurchase(HEALTH);
  app.settlePayment();
  for (const status of ['preparing', 'shipped', 'shipping', 'delivered']) {
    app.advanceDelivery(status);
    assert.equal(store.getShoppingState().orderStatus, status);
  }
  assert.equal(store.getShoppingState().orderStatus, 'delivered', '拆開包裹 becomes available');
});

test('the props handed to the App carry the order and nothing else of the story', async () => {
  installStorages();
  const store = await import('../src/lib/shoppingStore.js');
  const app = await import('../src/pages/scenario04/blackpi/appState.js');

  assert.equal(app.selectOrderSummary(store.getShoppingState()), null, '訂單 tab is empty before there is an order');

  app.confirmPurchase(VEXA_FLEX_X1);
  store.saveShoppingState({ orderStatus: 'delivered', disputeStatus: 'opened', trustScore: 12, evidenceSaved: ['received-photos'] });
  const state = store.getShoppingState();

  assert.deepEqual(app.selectOrderSummary(state), { productRoute: 'luckyBag', status: 'delivered' });

  const order = app.selectOrder(state);
  assert.deepEqual(Object.keys(order).sort(), ['createdAt', 'disputeStatus', 'id', 'status']);
  assert.equal(order.status, 'delivered');
  assert.equal(order.disputeStatus, 'opened');
  assert.equal(order.id, state.orderId);
  // Scores, evidence, dialogue history and warning flags never cross over.
  for (const key of ['trustScore', 'evidenceSaved', 'dialogueHistory', 'warningFlags', 'reported']) {
    assert.ok(!(key in order), `${key} is Scenario 04's, not the App's`);
  }
});

test('a reload resumes the run from the same store the App never touches', async () => {
  installStorages();
  const store = await import('../src/lib/shoppingStore.js');
  const app = await import('../src/pages/scenario04/blackpi/appState.js');

  app.markRunStarted();
  app.confirmPurchase(HEALTH);
  app.settlePayment();
  app.advanceDelivery('delivered');
  const before = store.getShoppingState();

  // Same localStorage, fresh read - exactly what a refresh does.
  const after = store.getShoppingState();
  assert.equal(after.orderId, before.orderId);
  assert.equal(after.orderStatus, 'delivered');
  assert.equal(after.selectedRoute, 'health');
  assert.equal(after.scenarioStartedAt, before.scenarioStartedAt);
  assert.deepEqual(app.selectOrder(after), app.selectOrder(before));
});
