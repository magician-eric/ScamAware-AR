// Regression cover for 情境二「你已略過這位使用者」的單一操作。
//
// 這頁原本有「查看配對」和「返回情境首頁」兩顆按鈕，後者讓玩家可以從情境二
// 中途跳回 scenario menu。「返回情境首頁」已整顆移除，所以這頁：
//
//   * 只剩「查看配對」一顆按鈕（沒有空白鍵、隱藏鍵或看不見的 hit area），
//     而且用 MeetUInterstitial 的單欄版面，不是原本雙按鈕的左右兩欄
//   * 依單選規則是 `single`：只有向右揮會觸發「查看配對」，向左揮不做事
//   * 點擊與手勢都繼續 Scenario 02（教學案例對話），不退出情境
//   * 中／英／日三個語系都一樣
//
// 透過 scripts/register-gesture-contract-loaders.mjs 執行，它會編譯 JSX 並把
// react-router-dom 換成 stub，讓這些畫面能在 <Router> 之外掛載。
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { mountSurface } from './ar-surface-harness.mjs';

const storage = () => {
  let d = {};
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = String(v); },
    removeItem: (k) => { delete d[k]; },
    clear: () => { d = {}; },
    get length() { return Object.keys(d).length; },
    key: (i) => Object.keys(d)[i] ?? null,
  };
};
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = globalThis.window ?? globalThis;
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 0));

const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { LEFT, RIGHT } = AR_GESTURES;
const router = await import('./stubs/react-router-dom.mjs');

function find(node, pred, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => find(n, pred, out)); return out; }
  if (!React.isValidElement(node)) return out;
  if (pred(node)) out.push(node);
  if (node.props?.children) React.Children.toArray(node.props.children).forEach((n) => find(n, pred, out));
  for (const slot of ['after', 'quickReplies', 'footer', 'actions', 'media', 'icon']) {
    if (node.props?.[slot]) find(node.props[slot], pred, out);
  }
  return out;
}
const text = (n) => JSON.stringify(n, (k, v) => (typeof v === 'function' ? undefined : v));
const byName = (re) => (n) => typeof n.type === 'function' && re.test(n.type.name || '');

const EXPECT = {
  zh: { primary: '查看配對', gone: '返回情境首頁' },
  en: { primary: 'View Match', gone: 'Back to Scenario Home' },
  jp: { primary: 'マッチを見る', gone: 'シナリオ選択に戻る' },
};

// Play from the top: pass on candidate 1, pass on candidate 2, pass on the
// third woman (主線對象), then decline her follow-up notice.
async function reachSkippedScreen(lang) {
  localStorage.clear();
  localStorage.setItem('language', lang);
  resetARInteractionContract();
  router.resetNavigations();
  const { DatingBrowse } = await import('../src/pages/scenario02/DatingBrowse.jsx');
  const page = mountSurface(DatingBrowse);

  // Cards 1 and 2: pass, run their mini-chat to the end.
  for (let step = 0; step < 12; step += 1) {
    const stage = find(page.output, (n) => typeof n.props?.onDecision === 'function')[0];
    if (stage) {
      const card = find(page.output, (n) => n.props?.person)[0]?.props?.person
        ?? stage.props.card;
      stage.props.onDecision('pass');
      if (card?.id === 'datingLead') break;
      continue;
    }
    const done = find(page.output, (n) => typeof n.props?.onDone === 'function')[0];
    if (done) { done.props.onDone(); continue; }
    break;
  }

  const skipped = find(page.output, byName(/DatingLeadSkippedScreen/))[0];
  assert.ok(skipped, `[${lang}] passing on the third woman opens the follow-up notice`);
  skipped.props.onDecline(); // 先不用 - the "一路拒絕" path
  return page;
}

for (const lang of ['zh', 'en', 'jp']) {
  test(`[${lang}] 你已略過這位使用者 has 查看配對 as its only action, and it continues Scenario 02`, async () => {
    const { primary, gone } = EXPECT[lang];

    // --- 1. the screen itself -------------------------------------------------
    let page = await reachSkippedScreen(lang);
    const screenEl = find(page.output, byName(/SimulationRequiredScreen/))[0];
    assert.ok(screenEl, `[${lang}] 你已略過這位使用者 is reached`);
    assert.deepEqual(Object.keys(screenEl.props).sort(), ['onEnter'],
      `[${lang}] the screen takes only the one action - no onExit left behind`);

    // Mount it for real so its buttons and its AR contract are the live ones.
    resetARInteractionContract();
    const screen = mountSurface(screenEl.type, screenEl.props);
    // The screen returns an uninvoked <MeetUInterstitial>; mount it too so the
    // buttons it actually draws are the ones under test.
    const interstitial = mountSurface(screen.output.type, screen.output.props);
    const buttons = find(interstitial.output, (n) => n.type === 'button');
    assert.equal(buttons.length, 1, `[${lang}] exactly one button, no empty/hidden second one`);
    assert.equal(buttons[0].props.children, primary, `[${lang}] the one button is 查看配對`);
    assert.equal(buttons[0].props.className, 'meetu-primary-btn',
      `[${lang}] 查看配對 is the page's primary action`);
    const rendered = text(interstitial.output);
    assert.ok(!rendered.includes(gone), `[${lang}] "${gone}" is nowhere on the screen`);
    assert.ok(!rendered.includes('meetu-secondary-btn'), `[${lang}] no secondary button slot`);
    assert.ok(!rendered.includes('meetu-interstitial-actions-split'),
      `[${lang}] the single button is not left in the two-column pair layout`);

    // --- 2. the AR contract ---------------------------------------------------
    const contract = getCurrentARInteraction();
    assert.equal(contract.mode, 'single', `[${lang}] one action -> single`);
    assert.equal(contract.surfaceId, 'scenario02/simulation-required');
    assert.equal(performARInteraction(LEFT), false,
      `[${lang}] LEFT (向左揮) does nothing - there is no second action`);
    assert.equal(performARInteraction(RIGHT), true,
      `[${lang}] RIGHT (向右揮) runs 查看配對`);
    assert.deepEqual(router.navigations, [[
      '/scenario02-romance/dating-chat',
      { state: { simulationMode: true, userLikedDatingLead: false } },
    ]], `[${lang}] 向右揮 continues Scenario 02, it does not exit`);
    interstitial.unmount();
    screen.unmount();
    page.unmount();

    // --- 3. the touch path, from a fresh run ---------------------------------
    router.resetNavigations();
    page = await reachSkippedScreen(lang);
    const live = find(page.output, byName(/SimulationRequiredScreen/))[0];
    const tapScreen = mountSurface(live.type, live.props);
    const tapDrawn = mountSurface(tapScreen.output.type, tapScreen.output.props);
    find(tapDrawn.output, (n) => n.type === 'button')[0].props.onClick();
    assert.deepEqual(router.navigations, [[
      '/scenario02-romance/dating-chat',
      { state: { simulationMode: true, userLikedDatingLead: false } },
    ]], `[${lang}] tapping 查看配對 continues Scenario 02`);
    assert.ok(!router.navigations.some(([to]) => String(to).includes('scenario-menu')),
      `[${lang}] nothing on this page goes back to the scenario menu`);
    tapDrawn.unmount();
    tapScreen.unmount();
    page.unmount();

  });
}

// No dead handler, prop or route is left behind serving the removed button.
test('no 返回情境首頁 handler, prop or scenario-menu route survives on this screen', async () => {
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../src/pages/scenario02/DatingBrowse.jsx', import.meta.url), 'utf8');
  const fn = /\/\/ Scenario 02 has no exit here[\s\S]*?\n}\n/.exec(src)?.[0];
  assert.ok(fn, 'SimulationRequiredScreen must still be the screen this pins');
  assert.ok(!/scenario-menu|onExit|secondaryLabel|splitActions/.test(fn),
    'SimulationRequiredScreen carries no exit route, secondary label or split layout');
  const simBlock = /if \(phase === PHASE\.SIMULATION_REQUIRED\)[\s\S]*?\n  }/.exec(src)[0];
  assert.ok(!simBlock.includes('scenario-menu'),
    'the SIMULATION_REQUIRED branch never navigates to the scenario menu');

  for (const [label, file] of [
    ['en', '../src/shared/i18n/scenario02En.js'],
    ['jp', '../src/shared/i18n/scenario02Jp.js'],
  ]) {
    const dict = await readFile(new URL(file, import.meta.url), 'utf8');
    assert.ok(!dict.includes('返回情境首頁'), `${label} dictionary still carries the removed key`);
  }
});
