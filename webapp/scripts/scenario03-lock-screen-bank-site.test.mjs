// Regression cover for the Scenario 03 (假檢警) opening-scene, ringing and
// fake-bank rework:
//
//   1. Scene 01 is a LOCK SCREEN. No app grid, no icon to choose, and no
//      「這是一支手機」 narration explaining a picture that explains itself.
//      The first unknown call still arrives on its own.
//   2. Every ringing surface in the scenario - the unknown call, the
//      prosecutor's call, the officer's callback - shakes the phone frame
//      with ONE shared class, and stops the moment the call is answered.
//   3. The bank is no longer an app on the player's phone. The officer sends
//      a 好匯銀行 (HOWEI BANK) link in LINE, the player taps that card, and
//      the link opens the website. The run never returns to a desktop.
//   4. 台灣數位銀行 is gone from every player-facing surface in the scenario,
//      and the site and the link card carry the same brand.
//   5. The site says only what an online bank says. Every "do as you are
//      told" line belongs to the caller, not to the page.
//
// Behaviour wherever behaviour is what's at stake: these mount the real
// screens and drive them through the AR Interaction Contract, the same entry
// point a Gesture Bridge uses. Run through
// scripts/register-gesture-contract-loaders.mjs, which compiles the app's JSX
// and stubs react-router-dom so screens mount outside a <Router>.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import React from 'react';

import { mountSurface } from './ar-surface-harness.mjs';

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
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 0));

const src = (path) => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');

const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { LEFT, RIGHT } = AR_GESTURES;
const { navigations, resetNavigations } = await import('react-router-dom');
const { getScenario03State, resetScenario03, updateScenario03State } =
  await import('../src/lib/scenario03Store.js');
const { getScenario03Strings } = await import('../src/pages/scenario03/i18n.js');
const { getOrCreateScenarioSession } = await import('../src/lib/session/ScenarioSessionFactory.js');
const { BALANCE_TOTAL } = await import('../src/data/scenario03Config.js');

const { PhoneHome } = await import('../src/pages/scenario03/PhoneHome.jsx');
const { IncomingCall } = await import('../src/pages/scenario03/IncomingCall.jsx');
const { ProsecutorCall } = await import('../src/pages/scenario03/ProsecutorCall.jsx');
const { PoliceCallback } = await import('../src/pages/scenario03/PoliceCallback.jsx');
const { LineCustody } = await import('../src/pages/scenario03/LineCustody.jsx');
const { BankSite } = await import('../src/pages/scenario03/BankSite.jsx');
const { FinalDecision } = await import('../src/pages/scenario03/FinalDecision.jsx');
const { INCOMING_CALL_SHAKE_CLASS } = await import('../src/pages/scenario03/components/PoliceFrame.jsx');

const LANGS = ['zh', 'en', 'jp'];

// Runs a screen's own timers to completion instead of waiting on the wall
// clock - same shape as the aftermath suite's. Every body is synchronous:
// the real timers come back the moment the callback returns.
function withFakeTimers(run) {
  const real = {
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    setInterval: globalThis.setInterval,
    clearInterval: globalThis.clearInterval,
  };
  const queue = [];
  globalThis.setTimeout = (fn) => queue.push(fn);
  globalThis.clearTimeout = () => {};
  globalThis.setInterval = () => 0;
  globalThis.clearInterval = () => {};
  const settle = () => {
    let guard = 0;
    while (queue.length) {
      if (guard += 1, guard > 500) throw new Error('the screen\'s timers never settled');
      queue.shift()();
    }
  };
  try {
    return run(settle);
  } finally {
    Object.assign(globalThis, real);
  }
}

function findElements(node, pred, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => findElements(n, pred, out)); return out; }
  if (!React.isValidElement(node)) return out;
  if (pred(node)) out.push(node);
  if (node.props?.children) React.Children.toArray(node.props.children).forEach((n) => findElements(n, pred, out));
  for (const slot of ['after', 'quickReplies', 'footer', 'bodyBefore', 'actions', 'body', 'messages']) {
    if (node.props?.[slot]) findElements(node.props[slot], pred, out);
  }
  return out;
}

const byClass = (name) => (node) => typeof node.props?.className === 'string'
  && node.props.className.split(/\s+/).includes(name);
const byName = (name) => (node) => typeof node.type === 'function' && new RegExp(name).test(node.type.name || '');
const flatten = (node) => JSON.stringify(findElements(node, () => true).map((n) => n.props ?? null));

test.beforeEach(() => {
  resetARInteractionContract();
  resetNavigations();
  globalThis.sessionStorage.clear();
  resetScenario03();
});

// ---------------------------------------------------------------------------
// 1. Scene 01 is a lock screen
// ---------------------------------------------------------------------------
test('the opening scene never tells the player that a phone is a phone', async () => {
  const [phoneHome, i18n] = await Promise.all([src('pages/scenario03/PhoneHome.jsx'), src('pages/scenario03/i18n.js')]);
  // The deleted sentence is quoted in PhoneHome.jsx's own header comment, on
  // purpose, to record what went and why - so this reads code only.
  const code = phoneHome.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const gone of [
    '這是一支手機', '這是一隻手機', '手機畫面', '請操作手機', '點擊以下',
    'This is a phone', 'これはスマートフォンです',
  ]) {
    assert.ok(!code.includes(gone), `the lock screen still says "${gone}"`);
    assert.ok(!i18n.includes(gone), `scenario03's dictionary still carries "${gone}"`);
  }
  // Nothing was substituted for it either: the screen renders no dictionary
  // string at all.
  assert.doesNotMatch(code, /t\.phoneHome/);
  assert.doesNotMatch(i18n, /phoneHome:/);
});

test('the lock screen draws a clock and a date, and no app grid', () => {
  withFakeTimers(() => {
    const page = mountSurface(PhoneHome);
    try {
      const lock = findElements(page.output, byClass('pol-lock'));
      assert.equal(lock.length, 1, 'scene 01 is the lock screen');
      const clock = findElements(page.output, byClass('pol-lock-clock'));
      assert.equal(clock.length, 1);
      const printed = flatten(clock[0]);
      assert.match(printed, /\d{1,2}:\d{2}/, 'the time is on screen');
      assert.ok(printed.length > 0);

      // Nothing from the old desktop, and nothing to press.
      assert.equal(findElements(page.output, byClass('pol-app-grid')).length, 0);
      assert.equal(findElements(page.output, byClass('pol-app')).length, 0);
      assert.equal(findElements(page.output, (n) => n.type === 'button').length, 0,
        'a locked phone has no buttons on it');
    } finally {
      page.unmount();
    }
  });
});

test('the lock screen is display-only, and the first call still rings by itself', () => {
  withFakeTimers((settle) => {
    const page = mountSurface(PhoneHome);
    try {
      const contract = getCurrentARInteraction();
      assert.equal(contract.mode, 'display');
      assert.equal(contract.surfaceId, 'scenario03/phone-home');
      assert.equal(performARInteraction(LEFT), false, 'a gesture cannot skip the wait');
      assert.equal(performARInteraction(RIGHT), false);
      assert.deepEqual(navigations.flat(), [], 'nothing has happened yet');

      settle();
      assert.deepEqual(navigations.flat(), ['/scenario03-police/call'],
        'the unknown call arrives on its own, exactly as it always did');
    } finally {
      page.unmount();
    }
  });
});

test('the lock screen turns the shared shell status bar on instead of drawing one', async () => {
  const [phoneHome, css] = await Promise.all([src('pages/scenario03/PhoneHome.jsx'), src('styles/scenario03.css')]);
  assert.match(phoneHome, /systemChrome/, 'the locked phone shows a status row');
  // ...and it is the shell's, not a second one this scenario paints itself.
  assert.doesNotMatch(css, /\.pol-lock-statusbar|\.pol-statusbar/);
});

// ---------------------------------------------------------------------------
// 2. One shake, on the frame, for every ringing surface
// ---------------------------------------------------------------------------
test('the shake is declared once, for the whole phone frame, and honours reduced motion', async () => {
  const [frame, css] = await Promise.all([
    src('pages/scenario03/components/PoliceFrame.jsx'),
    src('styles/scenario03.css'),
  ]);
  assert.equal(INCOMING_CALL_SHAKE_CLASS, 'pol-frame-ringing');
  assert.match(frame, /ringing \? INCOMING_CALL_SHAKE_CLASS/, 'the frame owns the class, not the pages');

  const declarations = css.match(/\.pol-frame-ringing\{animation:pol-incoming-call-shake[^}]*\}/g) ?? [];
  assert.equal(declarations.length, 1, 'exactly one shake animation exists in the scenario');
  const keyframes = css.match(/@keyframes pol-incoming-call-shake\{[\s\S]*?\n\}/) ?? [];
  assert.equal(keyframes.length, 1);
  // A nudge, not a rattle: nothing over 4px, so a ring screen cannot walk out
  // of the phone frame at any of 320/390/430.
  const offsets = [...keyframes[0].matchAll(/translateX\((-?\d+)px\)/g)].map(([, px]) => Math.abs(Number(px)));
  assert.ok(offsets.length > 0);
  assert.ok(Math.max(...offsets) <= 4, `the shake travels ${Math.max(...offsets)}px - too far`);
  assert.match(keyframes[0], /20%,100%\{transform:translateX\(0\)\}/,
    'and it comes back to rest and stays there - one buzz, then a pause, then the next');
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\.pol-frame-ringing\{animation:none\}\}/);
  // The old per-page animation must not come back alongside it.
  assert.doesNotMatch(css, /pol-call-shake|@keyframes pol-shake\b/);
});

test('all three incoming calls shake while ringing, and none of them keeps shaking after 接聽', () => {
  const ringingFrame = (page) => {
    const frames = findElements(page.output, byName('PoliceFrame'));
    assert.equal(frames.length, 1, 'a scenario03 screen renders exactly one phone frame');
    return Boolean(frames[0].props.ringing);
  };

  // 1. The first unknown call.
  withFakeTimers(() => {
    const page = mountSurface(IncomingCall);
    try {
      assert.equal(ringingFrame(page), true, '陌生來電 rings');
      assert.equal(performARInteraction(RIGHT), true, '接聽');
      assert.deepEqual(navigations.flat(), ['/scenario03-police/call-stage1'],
        'answering leaves the ring screen, so nothing is left to shake');
    } finally {
      page.unmount();
    }
  });

  // 2. The prosecutor's call - same screen, two stages.
  resetARInteractionContract();
  resetNavigations();
  updateScenario03State({ firstPoliceCallStatus: 'ended' });
  withFakeTimers((settle) => {
    const page = mountSurface(ProsecutorCall);
    try {
      settle();
      assert.equal(ringingFrame(page), true, '檢察官來電 rings');
      assert.equal(performARInteraction(RIGHT), true, '接聽');
      page.rerender();
      assert.equal(ringingFrame(page), false, 'the in-call screen does not shake');
    } finally {
      page.unmount();
    }
  });

  // 3. The officer's callback.
  resetARInteractionContract();
  resetNavigations();
  updateScenario03State({ prosecutorCallCompleted: true, policeCallbackStatus: 'idle' });
  withFakeTimers(() => {
    const page = mountSurface(PoliceCallback);
    try {
      assert.equal(ringingFrame(page), true, '員警重新來電 rings');
      assert.equal(performARInteraction(RIGHT), true, '接聽');
      page.rerender();
      assert.equal(ringingFrame(page), false, 'the call is up - the buzzing stops');
    } finally {
      page.unmount();
    }
  });
});

test('no screen that is not ringing asks the frame to shake', async () => {
  const files = ['PhoneHome.jsx', 'CallStage1.jsx', 'LineAdd.jsx', 'LineIntro.jsx', 'CaseSite.jsx',
    'LineCustody.jsx', 'BankSite.jsx', 'FinalDecision.jsx', 'Aftermath.jsx'];
  for (const file of files) {
    const source = await src(`pages/scenario03/${file}`);
    assert.doesNotMatch(source, /<PoliceFrame[^>]*\sringing/s, `${file} must not shake - nothing is ringing on it`);
  }
  // The two multi-stage call screens ask for it exactly once each: on their
  // ring stage only.
  for (const file of ['ProsecutorCall.jsx', 'PoliceCallback.jsx', 'IncomingCall.jsx']) {
    const source = await src(`pages/scenario03/${file}`);
    assert.equal((source.match(/<PoliceFrame[^>]*\sringing/gs) ?? []).length, 1, `${file}`);
  }
});

// ---------------------------------------------------------------------------
// 3. LINE link card -> the 好匯銀行 website
// ---------------------------------------------------------------------------
function playCustodyToLinkCard() {
  updateScenario03State({ prosecutorCallCompleted: true, policeCallbackStatus: 'completed' });
  return withFakeTimers((settle) => {
    const page = mountSurface(LineCustody);
    settle();
    page.rerender();
    settle();
    const chat = findElements(page.output, byName('ScriptedLineConversation'))[0];
    assert.ok(chat, 'the officer\'s task order is a LINE conversation');
    const linkBeat = chat.props.player.log.find((beat) => beat.card?.kind === 'bankLink');
    return { page, chat, linkBeat };
  });
}

test('the officer sends a 好匯銀行 link card in LINE, and it is the only way on', () => {
  const { page, chat, linkBeat } = playCustodyToLinkCard();
  try {
    assert.ok(linkBeat, 'the last message carries the link');
    const card = chat.props.renderCard(linkBeat);
    assert.ok(card, 'and LINE draws a URL preview for it');
    assert.equal(card.type.name, 'LineWebsitePreview', 'it is the shared LINE link card, not a scenario-built one');
    const t = getScenario03Strings('zh');
    assert.equal(card.props.title, t.lineCustody.bankLink.title);
    assert.equal(card.props.domain, 'secure.haowei-bank.tw');
    assert.ok(card.props.title.includes('好匯銀行'), 'the card is branded 好匯銀行');
    assert.ok(card.props.title.includes('HOWEI BANK'));
    assert.ok(typeof card.props.onOpen === 'function', 'the card itself is tappable');
    // Nothing on the card admits what it is.
    const printed = `${card.props.title}${card.props.description}${card.props.domain}${card.props.openLabel}`;
    for (const tell of ['詐騙', '假網站', '模擬', '教育', '請注意', 'simulat', 'fake']) {
      assert.ok(!printed.toLowerCase().includes(tell.toLowerCase()), `the link card gives itself away with "${tell}"`);
    }
    // The footer button that used to send the player back to a desktop is gone.
    assert.equal(chat.props.footer, undefined, 'no 回到桌面 button survives');
  } finally {
    page.unmount();
  }
});

test('tapping the card and gesturing RIGHT run the same handler', () => {
  const { page, chat, linkBeat } = playCustodyToLinkCard();
  try {
    const contract = getCurrentARInteraction();
    assert.equal(contract.mode, 'single', 'the link is the one action on screen');
    assert.equal(contract.surfaceId, 'scenario03/line-custody/open-bank-site');
    assert.equal(performARInteraction(LEFT), false, 'a single surface has no LEFT');
    assert.equal(performARInteraction(RIGHT), true);
    assert.deepEqual(navigations.flat(), ['/scenario03-police/bank']);

    resetNavigations();
    chat.props.renderCard(linkBeat).props.onOpen();
    assert.deepEqual(navigations.flat(), ['/scenario03-police/bank'],
      'the card\'s own tap goes exactly where the gesture went');
  } finally {
    page.unmount();
  }
});

test('the custody screen is display-only until the link actually arrives', () => {
  updateScenario03State({ prosecutorCallCompleted: true, policeCallbackStatus: 'completed' });
  withFakeTimers(() => {
    const page = mountSurface(LineCustody);
    try {
      const contract = getCurrentARInteraction();
      assert.equal(contract.mode, 'display');
      assert.equal(contract.surfaceId, 'scenario03/line-custody');
      assert.equal(performARInteraction(RIGHT), false, 'nothing to open before he sends it');
      assert.deepEqual(navigations.flat(), []);
    } finally {
      page.unmount();
    }
  });
});

test('nothing in the scenario opens a bank app from a desktop any more', async () => {
  const [custody, phoneHome, i18n, routes] = await Promise.all([
    src('pages/scenario03/LineCustody.jsx'),
    src('pages/scenario03/PhoneHome.jsx'),
    src('pages/scenario03/i18n.js'),
    src('routes.jsx'),
  ]);
  assert.doesNotMatch(custody, /phone-home/, 'the custody step goes to the site, not back to the phone');
  const phoneHomeCode = phoneHome.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(phoneHomeCode, /scenario03-police\/bank/, 'the lock screen opens nothing');
  assert.doesNotMatch(phoneHomeCode, /policeCallbackStatus/, 'and it has no second, return visit');
  // The app icon that used to open it, and the app-list strings behind it.
  assert.doesNotMatch(i18n, /apps: \{/);
  // The route is the same route - only what renders there changed.
  assert.match(routes, /path: 'scenario03-police\/bank'/);
  assert.match(routes, /<BankSite \/>/);
  const pages = await import('node:fs/promises').then(({ readdir }) => readdir(new URL('../src/pages/scenario03/', import.meta.url)));
  assert.ok(!pages.includes('BankApp.jsx'), 'the bank is not an app any more, and its file does not say it is');
});

// ---------------------------------------------------------------------------
// 4. One brand: 好匯銀行 / HOWEI BANK
// ---------------------------------------------------------------------------
test('台灣數位銀行 is gone from every Scenario 03 surface, in all three languages', async () => {
  const { readdir } = await import('node:fs/promises');
  const dir = new URL('../src/pages/scenario03/', import.meta.url);
  const files = (await readdir(dir, { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => `pages/scenario03/${entry.name}`);
  const sources = await Promise.all([
    ...files.map((file) => src(file)),
    src('data/scenario03Dialogues.js'),
    src('data/scenario03Config.js'),
    src('styles/scenario03.css'),
  ]);
  for (const source of sources) {
    for (const gone of ['台灣數位銀行', 'Taiwan Digital Bank', '台湾デジタル銀行']) {
      assert.ok(!source.includes(gone), `the retired bank brand "${gone}" is still in the scenario`);
    }
  }
});

test('the site and the link card carry the same brand in every language', () => {
  for (const lang of LANGS) {
    const t = getScenario03Strings(lang);
    assert.equal(t.bank.brandLatin, 'HOWEI BANK', `${lang}: the wordmark is the same everywhere`);
    assert.equal(t.bank.domain, 'secure.haowei-bank.tw');
    assert.equal(t.lineCustody.bankLink.domain, t.bank.domain, `${lang}: the link goes to the site it names`);
    assert.ok(t.lineCustody.bankLink.title.includes(t.bank.brand),
      `${lang}: the card names the same bank the site does`);
    assert.equal(t.bank.statusTitleLogin, t.bank.brand);
    assert.equal(t.bank.statusTitleApp, t.bank.brand);
    // The final decision is drawn as the same bank's page and must not drift
    // to a second brand.
    assert.equal(t.finalDecision.brand, t.bank.brand, `${lang}: the decision screen is the same bank`);
    assert.equal(t.finalDecision.statusTitle, t.bank.brand);
  }
  assert.equal(getScenario03Strings('zh').bank.brand, '好匯銀行');
  assert.equal(getScenario03Strings('en').bank.brand, 'HOWEI BANK');
  assert.equal(getScenario03Strings('jp').bank.brand, 'HOWEI BANK');
});

// ---------------------------------------------------------------------------
// 5. The site behaves like an online bank, and says only what one says
// ---------------------------------------------------------------------------
test('the bank site opens on a sign-in page inside browser chrome', () => {
  const session = getOrCreateScenarioSession();
  withFakeTimers(() => {
    const page = mountSurface(BankSite);
    try {
      const chrome = findElements(page.output, byClass('pol-web-chrome'));
      assert.equal(chrome.length, 1, 'the player can see they are on a website');
      const address = findElements(page.output, byClass('pol-web-domain'));
      assert.equal(address.length, 1);
      assert.equal(address[0].props.children, 'secure.haowei-bank.tw');

      assert.equal(getScenario03State().bankStage, 'login', 'and the link lands on the sign-in page');
      const printed = flatten(page.output);
      assert.ok(printed.includes(session.maskedBankAccount), 'the sign-in form is filled in');

      const contract = getCurrentARInteraction();
      assert.equal(contract.mode, 'single');
      assert.equal(contract.surfaceId, 'scenario03/bank/login');
      assert.equal(performARInteraction(RIGHT), true, '登入');
      page.rerender();
      assert.equal(getCurrentARInteraction().surfaceId, 'scenario03/bank/overview');
    } finally {
      page.unmount();
    }
  });
});

test('the site walks 帳戶總覽 -> 轉帳 -> 確認交易 and hands over to the final decision', () => {
  withFakeTimers((settle) => {
    const page = mountSurface(BankSite);
    try {
      for (const expected of ['scenario03/bank/login', 'scenario03/bank/overview', 'scenario03/bank/transfer', 'scenario03/bank/confirm']) {
        assert.equal(getCurrentARInteraction().surfaceId, expected);
        assert.equal(getCurrentARInteraction().mode, 'single', `${expected} offers exactly one action`);
        assert.equal(performARInteraction(LEFT), false, `${expected} has no LEFT`);
        assert.equal(performARInteraction(RIGHT), true);
        page.rerender();
        settle();
        page.rerender();
      }
      assert.deepEqual(navigations.flat(), ['/scenario03-police/final']);
      assert.equal(getScenario03State().transferAmount, BALANCE_TOTAL);
    } finally {
      page.unmount();
    }
  });
});

test('the bank site never claims to be working with the police', async () => {
  const [site, i18n] = await Promise.all([src('pages/scenario03/BankSite.jsx'), src('pages/scenario03/i18n.js')]);
  const bankBlocks = [...i18n.matchAll(/\n    bank: \{[\s\S]*?\n    \},/g)].map(([block]) => block);
  assert.equal(bankBlocks.length, 3, 'one bank dictionary per language');
  for (const block of bankBlocks) {
    for (const tell of [
      '照著指示操作', '照畫面上的資料操作', '依警方指示', '資金監管程序', '警方驗證',
      '請依承辦人員操作', '警政安全帳戶', '監管完成期限', '偵查佐', '承辦人員',
      'as instructed', 'Investigating Officer', '担当捜査員', '監視完了期限',
    ]) {
      // warnBox is CIBAR's own anti-fraud warning painted over the page, not
      // the bank's copy - it is allowed to name the scam, and does.
      const bankCopy = block.replace(/warnBox: '[^']*',/g, '');
      assert.ok(!bankCopy.includes(tell), `the bank site's own copy still says "${tell}"`);
    }
  }
  // The officer's spoken guidance is still played over the transfer form -
  // that line belongs to him, and it comes from his recording.
  assert.match(site, /buildScenario03Script\('bankGuide', session\)/);
  assert.match(site, /useScriptPlayer\(guideScript, pace, stage === 'transfer'\)/);
  // The page itself has no countdown, no task card and no case-status plate.
  assert.doesNotMatch(site, /Countdown/);
});

// ---------------------------------------------------------------------------
// 6. What #337 settled stays settled
// ---------------------------------------------------------------------------
test('the two branches of the final decision still land where #337 put them', () => {
  withFakeTimers(() => {
    const scammed = mountSurface(FinalDecision);
    try {
      assert.equal(getCurrentARInteraction().mode, 'dual', 'the final decision is still a LEFT and a RIGHT');
      assert.equal(performARInteraction(LEFT), true);
      assert.deepEqual(navigations.flat(), ['/scenario03-police/aftermath']);
    } finally {
      scammed.unmount();
    }

    resetARInteractionContract();
    resetNavigations();
    resetScenario03();
    const safe = mountSurface(FinalDecision);
    try {
      assert.equal(performARInteraction(RIGHT), true);
      assert.deepEqual(navigations.flat(), ['/scenario03-police/ending/success']);
      assert.equal(getScenario03State().aftermathSeen, false, 'the 165 branch still never runs the aftermath');
    } finally {
      safe.unmount();
    }
  });
});

test('every Scenario 03 two-choice moment is still drawn as two columns', async () => {
  const [panel, css] = await Promise.all([
    src('pages/scenario03/components/ChoicePanel.jsx'),
    src('styles/scenario03.css'),
  ]);
  assert.match(panel, /className=\{`pol-choices pol-choices-split/, 'the split modifier stays unconditional');
  assert.match(css, /\.pol-choices-split\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  for (const block of css.match(/@media[^{]*\{[\s\S]*?\n\}/g) ?? []) {
    assert.ok(!block.includes('pol-choices-split'), 'no viewport may restack the pair');
  }
  // ...including the hand-written pair on the decision screen.
  const final = await src('pages/scenario03/FinalDecision.jsx');
  assert.match(final, /pol-choices pol-choices-split/);
});
