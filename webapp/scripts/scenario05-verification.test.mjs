// Scenario 05's fake-verification detour: the SafeDeal "support desk", the one
// simulated transfer it asks for, and the three結局 that follow.
//
// The rules this pins are the ones the scenario is built on, and every one of
// them is a way the story could quietly stop being true:
//
//   * the deposit figure is written down once, so "what is the amount?" has
//     one answer rather than one per screen
//   * the transfer happens at most once per run - no second deposit, no
//     unfreeze fee, no shortfall, no re-verification, and no way for a double
//     tap, a refresh or a replayed navigation to charge twice
//   * nothing about it touches money: no bank API, no payment link, no real
//     account, no card, no OTP, and nothing asked of the player
//   * the three結局 report what actually happened on this run - never a
//     deposit the player did not pay, never "zero loss" after one they did
//   * 黑皮通 stays a courier: it runs no support desk, no verification and no
//     payment anywhere in the detour
//   * every new line exists in all three languages, with no Chinese falling
//     through into an English or Japanese run
//
// Run with scripts/register-gesture-contract-loaders.mjs - the JSX loader plus
// the react-router-dom stub, so the screens can be mounted outside a Router.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { findLeak } from './localization-leak-rules.mjs';
import { mountSurface } from './ar-surface-harness.mjs';

const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');

const storage = () => {
  let data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    clear: () => { data = {}; },
    get length() { return Object.keys(data).length; },
    key: (i) => Object.keys(data)[i] ?? null,
  };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = globalThis.window ?? globalThis;

const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { RIGHT } = AR_GESTURES;
const { navigations, resetNavigations } = await import('react-router-dom');

const { SCENARIO05_VERIFICATION_AMOUNT, formatNtAmount, VERIFICATION_AMOUNT_DIGITS } =
  await import('../src/data/scenario05Verification.js');
const store = await import('../src/lib/scenario05Store.js');
const { buildBuyerTree, buildSupportTree } = await import('../src/data/scenario05Dialogues.js');
const { getProduct } = await import('../src/apps/mydondon/data/catalog.js');
const { SafeDealTransfer } = await import('../src/pages/scenario05/SafeDealTransfer.jsx');
const { EndingCaught } = await import('../src/pages/scenario05/EndingCaught.jsx');
const { EndingStopped } = await import('../src/pages/scenario05/EndingStopped.jsx');
const { EndingScammed } = await import('../src/pages/scenario05/EndingScammed.jsx');

const TABLET = { id: 'tablet', name: '10.9 吋二手平板' };
const STROLLER = { id: 'stroller', name: '輕量型嬰兒手推車' };
const PRICE = { tablet: 12000, stroller: 4500 };

function freshRun(patch = {}) {
  localStorage.clear();
  sessionStorage.clear();
  store.resetScenario05();
  if (Object.keys(patch).length) store.saveScenario05State(patch);
}

function mount(Component) {
  resetARInteractionContract();
  resetNavigations();
  return mountSurface(Component);
}

// The `amounts` a結局 page hands the shared Outcome System, as a plain
// label -> value map. The page returns an unrendered <ScenarioOutcome> element,
// which is exactly the contract worth reading: these are the facts the
// scenario claims, before any styling touches them.
function ledger(Component) {
  const mounted = mount(Component);
  const element = mounted.output;
  const rows = Object.fromEntries((element.props.amounts ?? []).map(({ label, value }) => [label, value]));
  const outcome = { rows, title: element.props.title, consequence: element.props.outcome, state: element.props.state };
  mounted.unmount();
  return outcome;
}

const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

async function scenario05Sources() {
  const found = [];
  async function walk(dir) {
    for (const entry of await readdir(join(WEBAPP, dir), { withFileTypes: true })) {
      const child = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(child);
      else if (/\.[jt]sx?$/.test(entry.name)) found.push(child);
    }
  }
  await walk('src/pages/scenario05');
  for (const file of ['src/lib/scenario05Store.js', 'src/data/scenario05Dialogues.js',
    'src/data/scenario05Verification.js', 'src/data/scenario05Characters.js',
    'src/data/scenario05FakeSite.js', 'src/shared/i18n/scenario05En.js',
    'src/shared/i18n/scenario05Jp.js']) found.push(file);
  return found;
}

// ---------------------------------------------------------------------------
// The amount
// ---------------------------------------------------------------------------

test('the verification amount is defined in exactly one place', async () => {
  assert.equal(SCENARIO05_VERIFICATION_AMOUNT, 20000);
  assert.equal(VERIFICATION_AMOUNT_DIGITS, '20,000');
  assert.equal(formatNtAmount(SCENARIO05_VERIFICATION_AMOUNT), 'NT$20,000');
  assert.equal(formatNtAmount(0), 'NT$0');

  const offenders = [];
  for (const file of await scenario05Sources()) {
    if (file === 'src/data/scenario05Verification.js') continue;
    if (/\b20[,]?000\b/.test(withoutComments(await read(file)))) offenders.push(file);
  }
  assert.deepEqual(offenders, [],
    'the deposit figure belongs only in data/scenario05Verification.js - every screen, line and ending reads it from there');
});

test('the copy carries the amount as a placeholder, never as digits', async () => {
  const dialogues = await read('src/data/scenario05Dialogues.js');
  assert.match(dialogues, /VERIFICATION_AMOUNT_DIGITS/, 'the deposit demand must interpolate the central amount');
  for (const dictionary of ['src/shared/i18n/scenario05En.js', 'src/shared/i18n/scenario05Jp.js']) {
    const source = await read(dictionary);
    assert.match(source, /NT\$\{amount\}/, `${dictionary} must keep the {amount} placeholder`);
  }
});

// ---------------------------------------------------------------------------
// One transfer, and only one
// ---------------------------------------------------------------------------

test('the deposit is charged at most once, however many times it is confirmed', () => {
  freshRun();
  assert.equal(store.getScenario05State().verificationPaid, false);
  assert.equal(store.getScenario05State().verificationLoss, 0);

  store.payVerificationDeposit();
  const after = store.getScenario05State();
  assert.equal(after.verificationPaid, true);
  assert.equal(after.verificationLoss, SCENARIO05_VERIFICATION_AMOUNT);
  assert.equal(after.verificationStatus, 'completed');

  // A double tap, a gesture landing on top of a tap, a remount after a
  // refresh: all of them arrive here, and none of them may add anything.
  store.payVerificationDeposit();
  store.payVerificationDeposit();
  assert.equal(store.getScenario05State().verificationLoss, SCENARIO05_VERIFICATION_AMOUNT);
});

test('the transfer screen stops offering the transfer once it has been used', () => {
  freshRun();
  let mounted = mount(SafeDealTransfer);
  assert.equal(getCurrentARInteraction().surfaceId, 'scenario05/safedeal-transfer');
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(navigations, [], 'confirming a simulated transfer must not navigate anywhere');
  assert.equal(store.getScenario05State().verificationLoss, SCENARIO05_VERIFICATION_AMOUNT);
  // The confirm action is gone, replaced by the way back - so the same gesture
  // cannot be repeated into a second charge.
  assert.equal(getCurrentARInteraction().surfaceId, 'scenario05/safedeal-transfer-done');
  assert.equal(performARInteraction(RIGHT), true);
  assert.deepEqual(navigations, [['/scenario05-atm/safedeal-support', { replace: true }]]);
  assert.equal(store.getScenario05State().verificationLoss, SCENARIO05_VERIFICATION_AMOUNT);
  mounted.unmount();

  // Walking back into the screen - or refreshing on it - finds it already done.
  mounted = mount(SafeDealTransfer);
  assert.equal(getCurrentARInteraction().surfaceId, 'scenario05/safedeal-transfer-done');
  assert.equal(performARInteraction(RIGHT), true);
  assert.equal(store.getScenario05State().verificationLoss, SCENARIO05_VERIFICATION_AMOUNT);
  mounted.unmount();
});

test('the story asks for money exactly once, and never again after it is paid', () => {
  const support = buildSupportTree('zh');
  const byId = Object.fromEntries(support.map((node) => [node.id, node]));

  const toTransfer = support.filter((node) => node.redirectTo === '/scenario05-atm/safedeal-transfer');
  assert.equal(toTransfer.length, 1, 'there must be exactly one hand-off to the simulated transfer');

  const asksForMoney = support.filter((node) => (node.messages ?? []).some((m) => m.text.includes('NT$')));
  assert.equal(asksForMoney.length, 1, 'only one node in the whole conversation may name an amount');
  assert.equal(asksForMoney[0].id, 'cs.flow');

  // Everything the agent says after the money is gone, and everything the
  // player can still do there: no amount, no payment, no second demand.
  const after = byId[toTransfer[0].resumeNodeId];
  assert.ok(after, 'the transfer no longer returns to the conversation');
  for (const message of after.messages ?? []) {
    assert.ok(!message.text.includes('NT$'), 'the agent must not name another amount after the transfer');
  }
  for (const choice of after.choices ?? []) {
    assert.ok(!/驗證金|轉帳|付款|匯款/.test(choice.label), `"${choice.label}" is a second payment control`);
    assert.notEqual(choice.nextNodeId, toTransfer[0].id);
  }
});

test('no reply in either conversation can charge the player', () => {
  for (const tree of [buildBuyerTree(TABLET, 'zh'), buildBuyerTree(STROLLER, 'zh'), buildSupportTree('zh')]) {
    for (const node of tree) {
      for (const choice of node.choices ?? []) {
        assert.ok(!Object.hasOwn(choice.statePatch ?? {}, 'verificationPaid'),
          `${node.id}/${choice.id} charges the deposit from a chat reply`);
        assert.ok(!Object.hasOwn(choice.statePatch ?? {}, 'verificationLoss'),
          `${node.id}/${choice.id} writes a loss from a chat reply`);
      }
    }
  }
});

test('no second deposit, unfreeze fee, shortfall or re-verification fee exists anywhere in Scenario 05', async () => {
  const banned = ['第二筆', '解凍金', '再匯一次', '補差額', '補款', '重新驗證費', '追加匯款', '第二次轉帳'];
  const offenders = [];
  for (const file of await scenario05Sources()) {
    const source = await read(file);
    for (const phrase of banned) if (source.includes(phrase)) offenders.push(`${file}: ${phrase}`);
  }
  assert.deepEqual(offenders, []);
});

test('the simulated transfer stays a closed simulation - no real money anywhere', async () => {
  const transfer = await read('src/pages/scenario05/SafeDealTransfer.jsx');
  // It says what it is, on the screen, in every language.
  assert.match(transfer, /教育模擬｜不會進行真實轉帳/);
  // No input of any kind: the player is never asked for a name, an account, a
  // card or a one-time code.
  for (const control of ['<input', '<form', '<select', '<textarea']) {
    assert.ok(!transfer.includes(control), `the transfer screen must not collect anything (${control})`);
  }
  // Nowhere to send them, and nothing to send.
  for (const escape of ['http://', 'https://', 'fetch(', 'XMLHttpRequest', 'window.open']) {
    assert.ok(!withoutComments(transfer).includes(escape), `the transfer screen must not reach outside (${escape})`);
  }
  const support = await read('src/data/scenario05Dialogues.js');
  for (const banned of ['帳號末五碼', '銀行帳號', '信用卡', '驗證碼', 'OTP', '身分證字號']) {
    assert.ok(!support.includes(banned), `the fake verification must not ask for ${banned}`);
  }
});

test('黑皮通 stays a courier: no support desk, no verification, no payment', async () => {
  const detour = [
    'src/pages/scenario05/SafeDealPaymentStatus.jsx',
    'src/pages/scenario05/SafeDealSupportChat.jsx',
    'src/pages/scenario05/SafeDealTransfer.jsx',
    'src/pages/scenario05/components/SafeDealSupportSurface.jsx',
  ];
  for (const file of detour) {
    const source = withoutComments(await read(file));
    assert.ok(!source.includes('黑皮通'), `${file} must not put HPE inside the fake verification`);
    assert.ok(!/\bHpe[A-Z]/.test(source), `${file} must not render HPE's own UI`);
  }
  // The support tree is SafeDeal's, start to finish.
  for (const node of buildSupportTree('zh')) {
    for (const message of node.messages ?? []) {
      assert.ok(!message.text.includes('黑皮通'), `${node.id} puts HPE in the fake support desk`);
    }
  }
});

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

test('the run records the transfer and the shipment as two separate facts', () => {
  freshRun();
  const fresh = store.getScenario05State();
  assert.equal(fresh.verificationStatus, 'notStarted');
  assert.equal(fresh.shipmentDecision, null);

  store.markVerificationRequested();
  assert.equal(store.getScenario05State().verificationStatus, 'requested');
  // Resuming the conversation after the transfer must not walk the status back.
  store.payVerificationDeposit();
  store.markVerificationRequested();
  assert.equal(store.getScenario05State().verificationStatus, 'completed');

  store.saveScenario05State({ shipmentDecision: 'stopped' });
  const stopped = store.getScenario05State();
  assert.equal(stopped.verificationPaid, true, 'stopping the shipment must not undo the transfer');
  assert.equal(stopped.shipmentDecision, 'stopped');
});

test('a save from before this flow existed resumes without inventing a payment', () => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('cibar-scenario05-state', JSON.stringify({
    selectedProduct: 'tablet', shipStatus: 'delivered', awarenessKey: null,
  }));
  const state = store.getScenario05State();
  assert.equal(state.verificationPaid, false);
  assert.equal(state.verificationLoss, 0);
  assert.equal(state.verificationStatus, 'notStarted');
  assert.equal(state.shipmentDecision, null);
  assert.equal(state.shipStatus, 'delivered', 'the rest of the old save still resumes');
});

test('a nonsense value is read back as the default, not rendered', () => {
  localStorage.clear();
  localStorage.setItem('cibar-scenario05-state', JSON.stringify({
    verificationPaid: false, verificationLoss: 999999, verificationStatus: 'refunded', shipmentDecision: 'posted',
  }));
  const state = store.getScenario05State();
  assert.equal(state.verificationLoss, 0, 'a loss can only follow from an actual transfer');
  assert.equal(state.verificationStatus, 'notStarted');
  assert.equal(state.shipmentDecision, null);
});

test('replaying the scenario clears the transfer and the shipment', () => {
  freshRun();
  store.payVerificationDeposit();
  store.saveScenario05State({ shipmentDecision: 'shipped', shipStatus: 'delivered' });
  localStorage.setItem('cibar-scenario04-state', 'untouched');
  sessionStorage.setItem('cibar-scenario02-progress', 'untouched');

  store.resetScenario05();
  const state = store.getScenario05State();
  assert.equal(state.verificationPaid, false);
  assert.equal(state.verificationLoss, 0);
  assert.equal(state.verificationStatus, 'notStarted');
  assert.equal(state.shipmentDecision, null);
  assert.equal(state.shipStatus, 'idle');
  // Another scenario's saved run is none of this one's business.
  assert.equal(localStorage.getItem('cibar-scenario04-state'), 'untouched');
  assert.equal(sessionStorage.getItem('cibar-scenario02-progress'), 'untouched');
});

// ---------------------------------------------------------------------------
// The three結局 report what actually happened
// ---------------------------------------------------------------------------

test('完全識破: nothing transferred, nothing shipped, nothing lost', () => {
  freshRun({ selectedProduct: 'tablet' });
  const { rows, state } = ledger(EndingCaught);
  assert.equal(state, 'blocked');
  assert.equal(rows['驗證金損失'], 'NT$0');
  assert.equal(rows['商品損失'], 'NT$0');
  assert.equal(rows['總損失'], 'NT$0');
  assert.equal(rows['商品'], '未寄出');
});

test('及時止損: the deposit is gone, the item is not, and it never claims otherwise', () => {
  freshRun({ selectedProduct: 'stroller' });
  store.payVerificationDeposit();
  store.saveScenario05State({ shipmentDecision: 'stopped' });
  const { rows, consequence, state } = ledger(EndingStopped);
  // It is still 詐騙成立: money left and did not come back.
  assert.equal(state, 'scammed');
  assert.equal(rows['驗證金損失'], 'NT$20,000');
  assert.equal(rows['商品損失'], 'NT$0');
  assert.equal(rows['總損失'], 'NT$20,000');
  assert.equal(rows['商品'], '未寄出');
  assert.equal(consequence, '−NT$20,000');
  assert.notEqual(rows['總損失'], 'NT$0', 'a run that transferred money cannot report zero loss');
});

for (const product of [TABLET, STROLLER]) {
  test(`雙重損失 (${product.id}): the deposit plus this run's own item price`, () => {
    freshRun({ selectedProduct: product.id });
    store.payVerificationDeposit();
    store.saveScenario05State({ shipmentDecision: 'shipped', shipStatus: 'delivered' });
    const { rows, consequence, state } = ledger(EndingScammed);
    const total = SCENARIO05_VERIFICATION_AMOUNT + PRICE[product.id];
    assert.equal(state, 'scammed');
    assert.equal(rows['驗證金損失'], 'NT$20,000');
    assert.equal(rows['商品損失'], formatNtAmount(PRICE[product.id]));
    assert.equal(rows['總損失'], formatNtAmount(total));
    assert.equal(rows['實際入帳'], 'NT$0');
    assert.equal(rows['已送達'] ?? rows['黑皮通'], '已送達');
    assert.equal(consequence, `−${formatNtAmount(total)}`);
  });
}

test('an old run that reached 雙重損失 without a transfer shows no deposit loss', () => {
  localStorage.clear();
  localStorage.setItem('cibar-scenario05-state', JSON.stringify({ selectedProduct: 'tablet', shipStatus: 'delivered' }));
  const { rows } = ledger(EndingScammed);
  assert.equal(rows['驗證金損失'], 'NT$0');
  assert.equal(rows['商品損失'], 'NT$12,000');
  assert.equal(rows['總損失'], 'NT$12,000');
});

// ---------------------------------------------------------------------------
// Three languages
// ---------------------------------------------------------------------------

// Every line either of the two conversations can put on screen, in source
// order: message bodies and the replies the player picks from.
function spoken(tree) {
  return tree.flatMap((node) => [
    ...(node.messages ?? []).map((m) => m.text),
    ...(node.choices ?? []).map((c) => c.label),
  ]);
}

const HAS_CHINESE = /[㐀-鿿]/u;

for (const language of ['en', 'jp']) {
  test(`every line of both conversations is really translated into ${language}`, () => {
    // The product goes in already language-resolved, exactly as BuyerChat
    // hands it in - its name is catalog data, not a dictionary lookup.
    const cases = [
      ['buyer/tablet', (lang) => buildBuyerTree(getProduct('tablet', lang), lang)],
      ['buyer/stroller', (lang) => buildBuyerTree(getProduct('stroller', lang), lang)],
      ['support', (lang) => buildSupportTree(lang)],
    ];
    for (const [label, build] of cases) {
      const zh = spoken(build('zh'));
      const translated = spoken(build(language));
      assert.equal(zh.length, translated.length, `${label}: the ${language} tree has a different shape`);
      const productName = getProduct(label.endsWith('stroller') ? 'stroller' : 'tablet', language)?.name ?? '';
      zh.forEach((source, i) => {
        const value = translated[i];
        if (!HAS_CHINESE.test(source)) return;
        assert.notEqual(value, source, `${label}: "${source}" falls back to Chinese in ${language}`);
        // The catalog's own product name is interpolated into one line and is
        // per-language data rather than a dictionary entry, so it is measured
        // by the catalog, not by this check.
        const leak = findLeak(productName ? value.split(productName).join('') : value, language);
        assert.equal(leak, null, `${label}: "${value}" - ${leak?.reason}`);
      });
    }
  });
}
