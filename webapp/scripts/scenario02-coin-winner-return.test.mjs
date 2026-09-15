// Scenario 02: LINE → 幣勝客 → 「返回 LINE 對話」 → LINE, in three languages.
//
// The platform used to end its own visits. Each screen showed itself for a
// beat (5s after 建立帳戶, 2.6s on a profit check-in, 2.4s on the deposit
// success card, 1s on the withdrawal failure) and then reported itself
// finished, so the player was back in the chat before they had read what the
// platform was showing them - and 立即啟用 cut back in the same frame.
//
// A visit ends where the player ends it now: every trip back to LINE goes
// through one control, the 返回 LINE 對話 bar at the bottom of the screen.
// This suite pins that end to end, through Scenario 02's own hosts rather
// than the app in isolation, because "returns to LINE" is a fact about the
// pair:
//
//   1. no visit can end itself - no timer anywhere reports one,
//   2. the bar is on screen exactly where the visit is finished, and is the
//      one story action the AR contract exposes there,
//   3. pressing it (tap or RIGHT gesture) lands in datingLead's chat with
//      the run state the beat is supposed to leave behind,
//   4. all of the above in zh-TW, English and Japanese, each reading its own
//      label and none of them leaking another language's copy.
//
// Run through scripts/register-gesture-contract-loaders.mjs, which compiles
// the JSX and stubs react-router-dom so the hosts mount outside a <Router>.
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
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
globalThis.performance ??= { now: () => 0 };
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 0));
globalThis.cancelAnimationFrame = globalThis.cancelAnimationFrame ?? ((id) => clearTimeout(id));

const router = await import('react-router-dom');
const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { RIGHT } = AR_GESTURES;
const store = await import('../src/lib/scenario02Store.js');
const hosts = await import('../src/pages/scenario02/CoinWinnerScreens.jsx');
const { ReturnBar } = await import('../src/apps/coin-winner/ReturnBar.jsx');

const LINE_CHAT = '/scenario02-romance/private-chat';

// The label the bar must read, per language. These are the three strings the
// request named, and they are asserted against the rendered element rather
// than against the dictionary, so a screen that stopped translating - or a
// dictionary whose entry drifted - fails here.
const RETURN_LABEL = {
  zh: '返回 LINE 對話',
  en: 'Back to LINE Chat',
  jp: 'LINEのトークに戻る',
};
const LANGUAGES = Object.keys(RETURN_LABEL);

function setLanguage(language) {
  globalThis.localStorage.setItem('language', language);
}

// Same tree walk the other Scenario 02 suites use: React children plus the
// prop slots this app puts elements in.
function findElements(node, pred, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => findElements(n, pred, out)); return out; }
  if (!React.isValidElement(node)) return out;
  if (pred(node)) out.push(node);
  if (node.props?.children) React.Children.toArray(node.props.children).forEach((n) => findElements(n, pred, out));
  for (const slot of ['after', 'quickReplies', 'footer', 'actions', 'media', 'icon']) {
    if (node.props?.[slot]) findElements(node.props[slot], pred, out);
  }
  return out;
}

const returnBars = (tree) => findElements(tree, (n) => n.type === ReturnBar);

// The bar as a player sees it: its own render, in the current language.
function returnBarText(bar) {
  const rendered = mountSurface(bar.type, bar.props);
  try {
    const strings = [];
    const walk = (node) => {
      if (typeof node === 'string') { strings.push(node); return; }
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (React.isValidElement(node) && node.props?.children) React.Children.toArray(node.props.children).forEach(walk);
    };
    walk(rendered.output);
    return strings.join('');
  } finally {
    rendered.unmount();
  }
}

// One visit: put the run in the state the story would have left it in, mount
// the host the chat navigates to, then mount the Coin Winner screen that host
// hands its props to.
//
// Both halves are real. The harness calls a component function without
// rendering its children, so mounting the host alone would only produce an
// un-invoked <PlatformHome/> element - the screen's own hooks, its AR
// contract and its bar would never run. Mounting the screen with the host's
// own props is what makes a press here go through the same wiring a player's
// press goes through: the App's callback, the host's switchToLine(), the
// real store.
function visit({ language, platform = {}, Host, seed = () => {} }) {
  setLanguage(language);
  globalThis.sessionStorage.clear();
  seed();
  store.savePlatformState(platform);
  router.resetNavigations();
  resetARInteractionContract();
  const host = mountSurface(Host);
  const screen = React.Children.toArray([host.output]).find((n) => React.isValidElement(n));
  assert.ok(screen, 'the host must mount a Coin Winner screen');
  const page = mountSurface(screen.type, screen.props);
  return {
    page,
    get bar() { return returnBars(page.output)[0] ?? null; },
    get navigations() { return router.navigations.map(([route]) => route); },
    unmount() { page.unmount(); host.unmount(); },
  };
}

// The four screens a LINE round trip can land on, with the run state that
// takes each one to the moment its visit is over. `reach` runs the player's
// own action where one is needed to get there (完成入金, 立即啟用, 確認提領);
// the two home visits are already finished the moment they are on screen.
const VISITS = [
  {
    name: '平台首頁・註冊後第一次到訪',
    Host: hosts.CoinWinnerHomePage,
    platform: { registrationCompleted: true, accountCreated: true, depositCompleted: false, platformStep: 'idle' },
    surfaceId: 'coin-winner/home',
    reach: () => {},
    expect: { registrationCompleted: true, accountCreated: true, termsAccepted: true, page: 'home' },
  },
  {
    name: '平台首頁・獲利回訪',
    Host: hosts.CoinWinnerHomePage,
    platform: { registrationCompleted: true, depositCompleted: true, platformStep: 'stage1', balance: 12800, profit: 2800 },
    surfaceId: 'coin-winner/home',
    reach: () => {},
    expect: { page: 'home', balance: 12800, profit: 2800, platformStep: 'stage1' },
  },
  {
    name: '入金成功',
    Host: hosts.CoinWinnerDepositPage,
    platform: { registrationCompleted: true },
    surfaceId: 'coin-winner/deposit-success',
    // 完成入金, then the platform's own 1.2s "processing" beat.
    reach: (page) => {
      assert.equal(performARInteraction(RIGHT), true, '完成入金 must be the action on the form');
      mock.timers.tick(1400);
      page.rerender();
    },
    expect: { depositCompleted: true, balance: 10000, profit: 0, platformStep: 'running', page: 'deposit-success' },
  },
  {
    name: '策略已啟用',
    Host: hosts.CoinWinnerTradingPage,
    platform: { registrationCompleted: true, depositCompleted: true },
    surfaceId: 'coin-winner/trading-activated',
    reach: () => {
      assert.equal(performARInteraction(RIGHT), true, '立即啟用 must be the action on the strategy page');
    },
    expect: { page: 'strategy', selectedStrategy: 'ai-arbitrage' },
  },
  {
    name: '提領失敗',
    Host: hosts.CoinWinnerWithdrawalPage,
    platform: { registrationCompleted: true, depositCompleted: true, balance: 38640, profit: 28640 },
    surfaceId: 'coin-winner/withdrawal-failed',
    // 確認提領, then the platform's own 1.5s "under review" beat.
    reach: (page) => {
      assert.equal(performARInteraction(RIGHT), true, '確認提領 must be the action on the form');
      mock.timers.tick(1600);
      page.rerender();
    },
    expect: { withdrawalStep: 'failed', page: 'withdrawal-failed' },
  },
];

test.beforeEach(() => {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
});

test.afterEach(() => {
  mock.timers.reset();
});

// ---------------------------------------------------------------------------
// 1. Nothing ends a visit but the player
// ---------------------------------------------------------------------------
test('no visit to 幣勝客 hands control back on a timer', () => {
  for (const spec of VISITS) {
    const run = visit({ language: 'zh', platform: spec.platform, Host: spec.Host });
    try {
      spec.reach(run.page);
      // Two full minutes of nothing but time passing. The old build would have
      // left for LINE within five seconds of every one of these.
      mock.timers.tick(120000);
      run.page.rerender();
      assert.deepEqual(run.navigations, [], `${spec.name}: the platform must not leave on its own`);
      assert.ok(run.bar, `${spec.name}: 返回 LINE 對話 must be on screen and waiting`);
    } finally {
      run.unmount();
    }
  }
});

// ---------------------------------------------------------------------------
// 2. The bar is the one story action, and only where the visit is finished
// ---------------------------------------------------------------------------
test('the bar is the whole AR contract wherever it is shown', () => {
  for (const spec of VISITS) {
    const run = visit({ language: 'zh', platform: spec.platform, Host: spec.Host });
    try {
      spec.reach(run.page);
      const ar = getCurrentARInteraction();
      assert.equal(ar.surfaceId, spec.surfaceId, `${spec.name}: unexpected surface`);
      assert.equal(ar.mode, 'single', `${spec.name}: one story action, so 'single'`);
      assert.equal(ar.leftAvailable, false, `${spec.name}: a single surface has no LEFT`);
      assert.equal(ar.rightAvailable, true, `${spec.name}: RIGHT must reach the way back`);
      assert.equal(returnBars(run.page.output).length, 1, `${spec.name}: exactly one way back`);
    } finally {
      run.unmount();
    }
  }
});

test('a home visit the story never sends the player on shows no way back at all', () => {
  // 'browsing' is what a deep link or a dev reload lands on: no scripted beat
  // brought the player here, so the host has nothing to return to and the
  // contract collapses to display rather than offering a dead button.
  const run = visit({ language: 'zh', platform: { registrationCompleted: true, depositCompleted: true, platformStep: 'running' }, Host: hosts.CoinWinnerHomePage });
  try {
    assert.deepEqual(returnBars(run.page.output), []);
    const ar = getCurrentARInteraction();
    assert.equal(ar.mode, 'display');
    assert.equal(ar.rightAvailable, false);
    assert.equal(performARInteraction(RIGHT), false, 'a gesture must not invent a way out');
  } finally {
    run.unmount();
  }
});

// ---------------------------------------------------------------------------
// 3 + 4. The round trip, in all three languages
// ---------------------------------------------------------------------------
for (const language of LANGUAGES) {
  test(`[${language}] LINE → 幣勝客 → 返回 LINE 對話 → LINE, with the run state intact`, () => {
    for (const spec of VISITS) {
      const run = visit({ language, platform: spec.platform, Host: spec.Host });
      try {
        spec.reach(run.page);

        const bar = run.bar;
        assert.ok(bar, `${spec.name} [${language}]: the bar must be on screen`);
        const text = returnBarText(bar);
        assert.ok(text.includes(RETURN_LABEL[language]),
          `${spec.name} [${language}]: the bar reads "${text}", expected "${RETURN_LABEL[language]}"`);
        // ...and reads only its own language: no other locale's copy leaks in.
        for (const other of LANGUAGES.filter((l) => l !== language)) {
          assert.ok(!text.includes(RETURN_LABEL[other]),
            `${spec.name} [${language}]: ${other} copy leaked into the bar ("${text}")`);
        }

        assert.deepEqual(run.navigations, [], `${spec.name} [${language}]: nothing has left yet`);
        bar.props.onReturn();
        assert.deepEqual(run.navigations, [LINE_CHAT],
          `${spec.name} [${language}]: the press must land in datingLead's chat`);

        const after = store.getPlatformState();
        for (const [field, value] of Object.entries(spec.expect)) {
          assert.deepEqual(after[field], value,
            `${spec.name} [${language}]: ${field} should be ${JSON.stringify(value)}, got ${JSON.stringify(after[field])}`);
        }

        // Pressing twice (a double tap, or a gesture landing on the same frame
        // as a touch) must not report the beat a second time.
        bar.props.onReturn();
        assert.deepEqual(run.navigations, [LINE_CHAT], `${spec.name} [${language}]: one press, one return`);
      } finally {
        run.unmount();
      }
    }
  });
}

test('a RIGHT gesture runs the same return the button runs', () => {
  for (const spec of VISITS) {
    const run = visit({ language: 'zh', platform: spec.platform, Host: spec.Host });
    try {
      spec.reach(run.page);
      assert.equal(performARInteraction(RIGHT), true, `${spec.name}: RIGHT must run the return`);
      assert.deepEqual(run.navigations, [LINE_CHAT], `${spec.name}: and land in the same place a tap does`);
    } finally {
      run.unmount();
    }
  }
});

// ---------------------------------------------------------------------------
// The trip back changes nothing about where the chat resumes
// ---------------------------------------------------------------------------
test('returning to LINE leaves the chat checkpoint and the cast untouched', () => {
  const timeline = [{ id: 's14', kind: 'message' }];
  for (const spec of VISITS) {
    globalThis.localStorage.clear();
    store.saveDatingLeadDecision('liked');

    // Seeded the way PrivateChat seeds it: the checkpoint is written on the
    // way out, just before the chat navigates to the platform.
    const run = visit({
      language: 'zh',
      platform: spec.platform,
      Host: spec.Host,
      seed: () => store.savePrivateChatCheckpoint(timeline, 's15', ['v1']),
    });
    try {
      spec.reach(run.page);
      run.bar.props.onReturn();
      assert.deepEqual(run.navigations, [LINE_CHAT]);
    } finally {
      run.unmount();
    }

    // The checkpoint PrivateChat resumes from is still the one it saved on the
    // way out - the return does not consume, rewrite or clear it - and the
    // run's cast decision is untouched, so no Day replays and no branch moves.
    const checkpoint = store.takePrivateChatCheckpoint();
    assert.deepEqual(checkpoint, { timeline, resumeId: 's15', watchedVideoIds: ['v1'] },
      `${spec.name}: the LINE checkpoint must survive the trip back unchanged`);
    assert.equal(store.getDatingLeadDecision(), 'liked', `${spec.name}: the run's branch must not move`);
  }
});
