// Regression cover for the Scenario 03 (假檢警) flow fixes:
//
//   1. The contentless LINE bubble 「我先確認一件事：」 is gone, and no
//      sentence was put in its place.
//   2. The fake 承辦檢察官 is one person: the same name AND the same photo on
//      his ring screen, his in-call screen and his LINE account - drawn once
//      per run from the existing random pool, never re-drawn per screen, and
//      never the 承辦員警's face.
//   3. Every `dual` contract in the scenario is drawn as a LEFT and a RIGHT,
//      and its gestures are not swapped.
//   4. The 完成轉帳 branch always runs through the post-transfer LINE
//      aftermath before its 受騙 ending; the 撥打 165 branch never touches it.
//   5. The 先傳簡訊查證 entry point in front of the officer's conversation is
//      gone, along with the screen and the strings it owned.
//
// Behaviour tests wherever behaviour is what's at stake: these mount the real
// screens and drive them through the AR Interaction Contract, the same entry
// point a Gesture Bridge uses. Run through
// scripts/register-gesture-contract-loaders.mjs, which compiles the app's JSX
// and stubs react-router-dom so screens mount outside a <Router>.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
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
const {
  getScenario03State,
  resetScenario03,
  updateScenario03State,
} = await import('../src/lib/scenario03Store.js');
const { BALANCE_TOTAL } = await import('../src/data/scenario03Config.js');
const { SCENARIO03_DIALOGUES, buildScenario03Script } = await import('../src/data/scenario03Dialogues.js');
const { getOrCreateScenarioSession, getOfficerIdentity, getProsecutorIdentity } =
  await import('../src/lib/session/ScenarioSessionFactory.js');

// Imported up here, not inside a test: withFakeTimers below restores the real
// timers the moment its callback returns, so a callback that awaits anything
// would hand the screen back its real setTimeout before it ever ran a beat.
// Every fake-timer body in this file is therefore synchronous.
const { IncomingCall } = await import('../src/pages/scenario03/IncomingCall.jsx');
const { ProsecutorCall } = await import('../src/pages/scenario03/ProsecutorCall.jsx');
const { FinalDecision } = await import('../src/pages/scenario03/FinalDecision.jsx');
const { Aftermath } = await import('../src/pages/scenario03/Aftermath.jsx');
const { ChoicePanel } = await import('../src/pages/scenario03/components/ChoicePanel.jsx');

// Runs a screen's own timers to completion instead of waiting on the wall
// clock. Same shape as the outcome-reachability walker's: capture every
// scheduled callback, then drain the queue until the screen stops scheduling.
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

test.beforeEach(() => {
  resetARInteractionContract();
  resetNavigations();
  globalThis.sessionStorage.clear();
  resetScenario03();
});

// ---------------------------------------------------------------------------
// 1. The contentless LINE bubble is gone
// ---------------------------------------------------------------------------
test('「我先確認一件事：」 is gone from the LINE script, in every language', async () => {
  // Code only. The block's own comment quotes the deleted sentence on purpose,
  // to record what was removed and why - same convention IncomingCall.jsx uses
  // for the controls it no longer offers.
  const dialogues = (await src('data/scenario03Dialogues.js'))
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(dialogues, /我先確認一件事/);
  assert.doesNotMatch(dialogues, /Let me confirm one thing first/);
  assert.doesNotMatch(dialogues, /まず一つ確認します/);
});

test('the block it belonged to keeps its one real line and gains no replacement', () => {
  const block = SCENARIO03_DIALOGUES.line_verification_prompt;
  for (const lang of ['zh', 'en', 'jp']) {
    assert.equal(block.lines[lang].length, 1, `${lang} must be one line, not a line plus an announcement`);
  }
  assert.equal(block.lines.zh[0], '接下來我需要您配合完成身分與資料查核。');
});

test('the deleted bubble never reaches the player, and the choice still follows immediately', () => {
  const session = getOrCreateScenarioSession();
  for (const lang of ['zh', 'en', 'jp']) {
    const beats = buildScenario03Script('lineIntro', session, lang);
    for (const beat of beats) {
      assert.doesNotMatch(String(beat.text ?? ''), /我先確認一件事|Let me confirm one thing first|まず一つ確認します/);
    }
    const promptAt = beats.findIndex((b) => b.dialogueId === 'line_verification_prompt');
    assert.ok(promptAt > -1, `${lang}: the verification block is still played`);
    assert.equal(beats[promptAt + 1]?.type, 'choice',
      `${lang}: the 2-choice moment follows the block directly, with nothing in between`);
  }
});

// ---------------------------------------------------------------------------
// 2. One prosecutor: same name, same face, every surface
// ---------------------------------------------------------------------------
test('the prosecutor is drawn once per run and carries a photo', () => {
  const session = getOrCreateScenarioSession();
  const prosecutor = getProsecutorIdentity(session, 'zh');
  const officer = getOfficerIdentity(session, 'zh');
  assert.ok(prosecutor.displayName, 'the run draws a prosecutor name');
  assert.ok(prosecutor.characterId, 'the run draws a prosecutor visual');
  assert.match(prosecutor.avatar, /assets\/shared\/characters\/.+\/avatar\.webp$/);
  assert.notEqual(prosecutor.characterId, officer.characterId, 'never the 承辦員警\'s face');
  assert.notEqual(prosecutor.displayName, officer.displayName, 'never the 承辦員警\'s name');
  // Same session, read again: the identity is a snapshot, not a fresh draw.
  const again = getProsecutorIdentity(getOrCreateScenarioSession(), 'zh');
  assert.equal(again.characterId, prosecutor.characterId);
  assert.equal(again.displayName, prosecutor.displayName);
});

// The prosecutor's name is NOT pinned to one person: a new run may draw
// another. What is pinned is that a run keeps whichever one it drew - which
// the test above asserts.
test('a new run may draw a different prosecutor - the identity is not hard-coded', () => {
  const names = new Set();
  const faces = new Set();
  for (let i = 0; i < 80; i += 1) {
    globalThis.sessionStorage.clear();
    const session = getOrCreateScenarioSession();
    const prosecutor = getProsecutorIdentity(session, 'zh');
    names.add(prosecutor.displayName);
    faces.add(prosecutor.characterId);
    assert.notEqual(prosecutor.characterId, getOfficerIdentity(session, 'zh').characterId);
  }
  assert.ok(names.size > 1, 'the prosecutor name still comes from the existing random pool');
  assert.ok(faces.size > 1, 'and so does his photo');
});

test('the prosecutor role is cast for a visual, not left name-only', async () => {
  const roles = await src('experience/characters/roles.js');
  assert.match(roles, /'scenario03\.fakeProsecutor': \{[^}]*visualStrategy: 'random'/);
  assert.match(roles, /'scenario03\.fakeProsecutor': \{[^}]*formalNameKind: 'prosecutor'/);
  assert.doesNotMatch(roles, /'scenario03\.fakeProsecutor': \{[^}]*visualStrategy: 'none'/);
  // Both officials come out of ONE cast draw - that is what makes a shared
  // face impossible rather than merely unlikely.
  const factory = await src('lib/session/ScenarioSessionFactory.js');
  assert.match(factory, /roleId: 'scenario03\.fakePolice'[\s\S]{0,200}roleId: 'scenario03\.fakeProsecutor'/);
  assert.equal((factory.match(/resolveCast\(/g) ?? []).length, 1, 'exactly one resolveCast call mints the pair');
});

// A run that already had an officer face (minted before the prosecutor was
// cast) keeps it: the backfill gives the prosecutor a face without swapping
// the officer the player has been looking at, and still draws them apart.
test('backfilling an older run gives the prosecutor a face without re-casting the officer', () => {
  const session = getOrCreateScenarioSession();
  const officerBefore = getOfficerIdentity(session, 'zh');
  const stored = JSON.parse(globalThis.sessionStorage.getItem('cibar-scenario03-session'));
  delete stored.characterAssignments.fakeProsecutor;
  globalThis.sessionStorage.setItem('cibar-scenario03-session', JSON.stringify(stored));

  const backfilled = getOrCreateScenarioSession();
  const officerAfter = getOfficerIdentity(backfilled, 'zh');
  const prosecutor = getProsecutorIdentity(backfilled, 'zh');
  assert.equal(officerAfter.characterId, officerBefore.characterId, 'the officer keeps the face he had');
  assert.equal(officerAfter.displayName, officerBefore.displayName);
  assert.ok(prosecutor.characterId, 'and the prosecutor is given one');
  assert.notEqual(prosecutor.characterId, officerAfter.characterId);
  assert.equal(prosecutor.displayName, backfilled.prosecutorName, 'his name is the one the run already drew');
});

test('the ring screen and the in-call screen show the same prosecutor photo', () => {
  updateScenario03State({ firstPoliceCallStatus: 'ended' });
  const session = getOrCreateScenarioSession();
  const expected = getProsecutorIdentity(session, 'zh');
  return withFakeTimers((settle) => {
    const page = mountSurface(ProsecutorCall);
    try {
      settle();
      const ringAvatars = findElements(page.output, byClass('pol-call-avatar'));
      assert.equal(ringAvatars.length, 1, 'the ring screen shows the prosecutor');
      assert.equal(ringAvatars[0].props.src, expected.avatar);
      assert.ok(ringAvatars[0].props.src, 'and it is a real asset URL, not an empty string');

      assert.equal(performARInteraction(RIGHT), true, '接聽');
      page.rerender();
      const inCall = findElements(page.output, byClass('pol-incall-avatar'));
      assert.equal(inCall.length, 1, 'the in-call screen shows him too');
      assert.equal(inCall[0].props.src, expected.avatar, 'and it is the same photo, not a second draw');
    } finally {
      page.unmount();
    }
  });
});

test('the aftermath LINE account is the same prosecutor again', () => {
  updateScenario03State({ transferAmount: BALANCE_TOTAL, ending: 'failure' });
  const session = getOrCreateScenarioSession();
  const expected = getProsecutorIdentity(session, 'zh');
  return withFakeTimers(() => {
    const page = mountSurface(Aftermath);
    try {
      const chats = findElements(page.output,
        (n) => typeof n.type === 'function' && /ScriptedLineConversation/.test(n.type.name || ''));
      assert.equal(chats.length, 1, 'the aftermath opens on the prosecutor\'s LINE conversation');
      assert.equal(chats[0].props.avatar, expected.avatar, 'same photo as his phone call');
      assert.ok(chats[0].props.title.includes(expected.displayName), 'and the same name');
      assert.equal(chats[0].props.role, 'scenario03.fakeProsecutor');
    } finally {
      page.unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Every dual contract is a LEFT and a RIGHT, in that order
// ---------------------------------------------------------------------------
test('the choice panel always lays its two options out as two columns', async () => {
  const panel = await src('pages/scenario03/components/ChoicePanel.jsx');
  assert.match(panel, /className=\{`pol-choices pol-choices-split/,
    'the split modifier is unconditional - no momentKey may opt out of it');
  assert.doesNotMatch(panel, /momentKey === '[^']*' \? ' pol-choices-split'/,
    'the old per-moment gate must not come back');

  const css = await src('styles/scenario03.css');
  const rule = /\.pol-choices-split\{([^}]*)\}/.exec(css);
  assert.ok(rule, '.pol-choices-split declares its own layout');
  assert.match(rule[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  for (const block of css.match(/@media[^{]*\{[\s\S]*?\n\}/g) ?? []) {
    assert.ok(!block.includes('pol-choices-split'),
      'no media query may restack the pair - 320/390/430 all stay left-vs-right');
  }
  // A long option wraps inside its own column instead of widening the grid.
  assert.match(css, /\.pol-choices-split \.pol-choice-btn\{[^}]*min-width:0/);
  assert.match(css, /\.pol-choices-split \.pol-choice-btn\{[^}]*overflow-wrap:anywhere/);
});

// The prosecutor's account question is the one this regressed on: its contract
// bound LEFT/RIGHT while the panel drew a stack, because the split modifier
// was gated on the in-call ownership question's momentKey. This drives the real
// call to the real choice moment, then renders the real panel with the choice
// it produced - so what is asserted is the panel the player actually gets, not
// a fixture.
test('the prosecutor account question is a dual contract AND a two-column panel', () => {
  updateScenario03State({ firstPoliceCallStatus: 'ended' });
  const choice = withFakeTimers((settle) => {
    const page = mountSurface(ProsecutorCall);
    try {
      settle();
      performARInteraction(RIGHT);
      page.rerender();
      settle();
      page.rerender();
      const contract = getCurrentARInteraction();
      assert.equal(contract.mode, 'dual');
      assert.equal(contract.surfaceId, 'scenario03/prosecutor-call/prosecutor.account');
      // The screen hands its player to DialogueLayer, which is what mounts the
      // panel; the harness leaves child components uninvoked, so read the
      // pending choice off the props and render the panel with it below.
      const layers = findElements(page.output,
        (n) => typeof n.type === 'function' && /DialogueLayer/.test(n.type.name || ''));
      assert.equal(layers.length, 1);
      const pending = layers[0].props.player.choice;
      assert.equal(pending.momentKey, 'prosecutor.account');
      assert.equal(pending.options.length, 2);
      return pending;
    } finally {
      page.unmount();
    }
  });

  const panel = mountSurface(ChoicePanel, { choice, onChoose: () => {} });
  try {
    const root = panel.output;
    assert.ok(root.props.className.split(/\s+/).includes('pol-choices-split'),
      'the panel is drawn as two columns, not a stack');
    const buttons = findElements(root, byClass('pol-choice-btn'));
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].props.children, choice.options[0].label,
      'the first column is options[0] - the option LEFT is bound to');
    assert.equal(buttons[1].props.children, choice.options[1].label,
      'the second column is options[1] - the option RIGHT is bound to');
  } finally {
    panel.unmount();
  }
});

test('every scenario03 dual surface binds LEFT to the first option and RIGHT to the second', async () => {
  const pages = {
    'CallStage1.jsx': 'scenario03/call-stage1/${player.choice.momentKey}',
    'ProsecutorCall.jsx': 'scenario03/prosecutor-call/${player.choice.momentKey}',
    'LineIntro.jsx': 'scenario03/line-intro/${player.choice.momentKey}',
  };
  for (const [file, surfaceId] of Object.entries(pages)) {
    const source = await src(`pages/scenario03/${file}`);
    assert.ok(source.includes(surfaceId), `${file} declares its dual surface`);
    const declaration = new RegExp(
      "mode: 'dual',[\\s\\S]{0,160}left: \\(\\) => player\\.choose\\(player\\.choice\\.options\\[0\\]\\),"
      + "\\s*right: \\(\\) => player\\.choose\\(player\\.choice\\.options\\[1\\]\\),",
    );
    assert.match(source, declaration,
      `${file}: LEFT must run options[0] and RIGHT options[1] - the order ChoicePanel/LineQuickReplies draw them in`);
  }
  // The final decision is a hand-written pair rather than a choice beat, so it
  // states the same rule in its own terms: 確認轉帳 is drawn first and is LEFT.
  const final = await src('pages/scenario03/FinalDecision.jsx');
  assert.match(final, /mode: 'dual',[\s\S]{0,120}left: confirmTransfer,\s*right: call165,/);
  const body = final.slice(final.indexOf('return ('));
  assert.ok(body.indexOf('confirmOption') < body.indexOf('call165Option'),
    '確認轉帳 is the left column on screen too');
});

test('the final decision\'s gestures are not swapped at runtime', () => {
  return withFakeTimers(() => {
    const left = mountSurface(FinalDecision);
    try {
      assert.equal(getCurrentARInteraction().mode, 'dual');
      assert.equal(performARInteraction(LEFT), true);
      assert.deepEqual(navigations.flat(), ['/scenario03-police/aftermath'],
        'LEFT is 確認轉帳 - the button drawn first');
    } finally {
      left.unmount();
    }

    resetARInteractionContract();
    resetNavigations();
    resetScenario03();
    const right = mountSurface(FinalDecision);
    try {
      assert.equal(performARInteraction(RIGHT), true);
      assert.deepEqual(navigations.flat(), ['/scenario03-police/ending/success'],
        'RIGHT is 撥打 165 - the button drawn second');
    } finally {
      right.unmount();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. The aftermath belongs to the 受騙 branch, and only to it
// ---------------------------------------------------------------------------
test('完成轉帳 goes to the aftermath, never straight to the ending', () => {
  return withFakeTimers(() => {
    const page = mountSurface(FinalDecision);
    try {
      assert.equal(performARInteraction(LEFT), true);
      assert.deepEqual(navigations.flat(), ['/scenario03-police/aftermath']);
      const state = getScenario03State();
      assert.equal(state.ending, 'failure');
      assert.equal(state.transferAmount, BALANCE_TOTAL);
      assert.equal(state.aftermathSeen, false, 'not seen yet - the aftermath itself records that');
    } finally {
      page.unmount();
    }
  });
});

test('the aftermath plays itself out and only then offers one way to the 受騙 ending', () => {
  updateScenario03State({ transferAmount: BALANCE_TOTAL, ending: 'failure' });
  return withFakeTimers((settle) => {
    const page = mountSurface(Aftermath);
    try {
      // Beat 1: the prosecutor's message. Nothing to press, nothing asked.
      const first = getCurrentARInteraction();
      assert.equal(first.mode, 'display');
      assert.equal(first.surfaceId, 'scenario03/aftermath/wait');
      assert.equal(performARInteraction(LEFT), false);
      assert.equal(performARInteraction(RIGHT), false);
      assert.deepEqual(navigations.flat(), [], 'the aftermath never advances itself past the ending');

      // Beats 2 and 3 arrive on their own timers.
      settle();
      const last = getCurrentARInteraction();
      assert.equal(last.mode, 'single', 'the aftermath adds no new player decision');
      assert.equal(last.surfaceId, 'scenario03/aftermath/continue');
      assert.equal(getScenario03State().aftermathSeen, true, 'the run records that it was played');
      assert.equal(performARInteraction(LEFT), false, 'a single surface has no LEFT');
      assert.equal(performARInteraction(RIGHT), true);
      assert.deepEqual(navigations.flat(), ['/scenario03-police/ending/failure']);
    } finally {
      page.unmount();
    }
  });
});

test('the aftermath says the three things this beat exists to say', () => {
  updateScenario03State({ transferAmount: BALANCE_TOTAL, ending: 'failure' });
  const session = getOrCreateScenarioSession();
  return withFakeTimers((settle) => {
    const page = mountSurface(Aftermath);
    try {
      // 1. The money is gone, and the caller says well done and asks them to wait.
      const chat = findElements(page.output,
        (n) => typeof n.type === 'function' && /ScriptedLineConversation/.test(n.type.name || ''))[0];
      assert.ok(chat, 'the wait beat is a LINE conversation, not a second LINE UI');
      const receipt = JSON.stringify(chat.props.bodyBefore ?? {});
      assert.ok(receipt.includes(session.fakeBankAccount), 'the transfer receipt names the custody account');
      assert.equal(SCENARIO03_DIALOGUES.aftermath_prosecutor_wait.lines.zh[0], '你做得很好，請等待我們的消息。');
      assert.equal(SCENARIO03_DIALOGUES.aftermath_prosecutor_wait.speaker, 'prosecutor');

      // 2. 幾天後.
      page.rerender();
      const timers = [];
      timers.push(getCurrentARInteraction().surfaceId);
      settle();

      // 3. Both accounts are gone, and the number no longer answers.
      const text = JSON.stringify(findElements(page.output, () => true).map((n) => n.props?.messages ?? null));
      const officer = getOfficerIdentity(session, 'zh');
      const prosecutor = getProsecutorIdentity(session, 'zh');
      assert.ok(text.includes(officer.displayName), 'the 承辦員警 account is named as gone');
      assert.ok(text.includes(prosecutor.displayName), 'the 承辦檢察官 account is named as gone');
      assert.ok(text.includes('此帳號已不存在'), 'and LINE says why the message will not send');
    } finally {
      page.unmount();
    }
  });
});

test('the aftermath does not replay when the player walks back into it', () => {
  updateScenario03State({ transferAmount: BALANCE_TOTAL, ending: 'failure', aftermathSeen: true });
  return withFakeTimers(() => {
    const page = mountSurface(Aftermath);
    try {
      assert.equal(page.output, null, 'a finished aftermath does not draw a frame of itself again');
      assert.deepEqual(navigations.flat().filter((v) => typeof v === 'string'),
        ['/scenario03-police/ending/failure']);
    } finally {
      page.unmount();
    }
  });
});

test('a player who never transferred cannot reach the aftermath', () => {
  return withFakeTimers(() => {
    const page = mountSurface(Aftermath);
    try {
      assert.equal(page.output, null, 'nothing of the scene is drawn on an out-of-order arrival');
      assert.deepEqual(navigations.flat().filter((v) => typeof v === 'string'), ['/scenario03-police/final']);
      assert.equal(getScenario03State().aftermathSeen, false);
    } finally {
      page.unmount();
    }
  });
});

test('the 165 branch reaches its 成功 ending without ever passing through the aftermath', () => {
  return withFakeTimers(() => {
    const decision = mountSurface(FinalDecision);
    try {
      assert.equal(performARInteraction(RIGHT), true);
      // 撥打 165 IS the judgement: one hop to the 成功反詐 outcome, with no
      // simulated hotline call, dial screen or 掛斷電話 step in between.
      assert.deepEqual(navigations.flat(), ['/scenario03-police/ending/success']);
    } finally {
      decision.unmount();
    }
    const state = getScenario03State();
    assert.equal(state.transferAmount, null, 'no transfer was made');
    assert.equal(state.ending, 'success');
    assert.equal(state.aftermathSeen, false, 'the success branch must never run the aftermath');
  });
});

test('nothing but the aftermath reaches the 受騙 ending, and nothing but the decision the 成功 one', async () => {
  const [aftermath, final, pageNames] = await Promise.all([
    src('pages/scenario03/Aftermath.jsx'),
    src('pages/scenario03/FinalDecision.jsx'),
    readdir(new URL('../src/pages/scenario03/', import.meta.url)),
  ]);
  assert.match(aftermath, /navigate\('\/scenario03-police\/ending\/failure'\)/);
  assert.doesNotMatch(aftermath, /ending\/success/);
  // The 165 page that used to own the 成功 hop is gone, and nothing replaced it.
  assert.ok(!pageNames.includes('Hotline165.jsx'));
  // Code only: FinalDecision's comment names the route the aftermath goes on to.
  const finalCode = final.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(finalCode, /ending\/failure/, 'the decision hands the 受騙 branch to the aftermath, not the ending');
  assert.match(finalCode, /navigate\('\/scenario03-police\/aftermath'\)/);
  assert.match(finalCode, /navigate\('\/scenario03-police\/ending\/success'\)/);
  assert.doesNotMatch(finalCode, /hotline165/i, 'the 165 branch must not route through a hotline page');
});

// ---------------------------------------------------------------------------
// 5. The 先傳簡訊查證 entry point in front of the conversation is gone
// ---------------------------------------------------------------------------
test('the ring screen goes straight to the officer\'s conversation, with no 傳訊息 detour', () => {
  return withFakeTimers(() => {
    const page = mountSurface(IncomingCall);
    try {
      const contract = getCurrentARInteraction();
      assert.equal(contract.mode, 'single', 'one action: 接聽');
      assert.equal(contract.surfaceId, 'scenario03/incoming-call');
      assert.equal(performARInteraction(RIGHT), true);
      assert.deepEqual(navigations.flat(), ['/scenario03-police/call-stage1']);
    } finally {
      page.unmount();
    }
  });
});

test('the SMS screen, its strings and its warning flag are removed, not hidden', async () => {
  const [incoming, i18n] = await Promise.all([
    src('pages/scenario03/IncomingCall.jsx'),
    src('pages/scenario03/i18n.js'),
  ]);
  const code = incoming.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const gone of ['smsAsk', 'smsFakeReply', 'smsPlayerMessage', 'backToCall', "'sms'", 'tried_to_verify_caller']) {
    assert.ok(!code.includes(gone), `IncomingCall still carries ${gone}`);
  }
  assert.doesNotMatch(i18n, /smsAsk|smsFakeReply|smsPlayerMessage|smsFromMeLabel|statusTitleSms|backToCall/);
  // The lesson the off-ramp carried stays on the ring screen itself.
  assert.match(incoming, /callerIdNote/);
  assert.match(i18n, /（來電顯示可以偽造，這行字不代表真的是警方）/);
});

test('the story order in front of the conversation is otherwise unchanged', async () => {
  const [phoneHome, incoming, callStage1, lineAdd] = await Promise.all([
    src('pages/scenario03/PhoneHome.jsx'),
    src('pages/scenario03/IncomingCall.jsx'),
    src('pages/scenario03/CallStage1.jsx'),
    src('pages/scenario03/LineAdd.jsx'),
  ]);
  assert.match(phoneHome, /navigate\('\/scenario03-police\/call'\)/);
  assert.match(incoming, /navigate\('\/scenario03-police\/call-stage1'\)/);
  assert.match(callStage1, /navigate\('\/scenario03-police\/line-add'\)/);
  assert.match(lineAdd, /navigate\('\/scenario03-police\/line'\)/);
  // Answering still starts the first call and still records the flag it always did.
  assert.match(incoming, /startFirstPoliceCall\(\)/);
  assert.match(incoming, /addWarningFlags\('answered_unknown_caller'\)/);
});
