// Regression cover for the Final Audit's remaining Scenario 03 (假檢警) fixes:
// AUD-08, AUD-09 and AUD-10.
//
// One suite, because the three are the same failure wearing three coats: a
// screen said something about itself that was not true of what was on it.
// The case site said "every task is done" for a consent form nobody signed,
// the LINE案件說明 said `display` while its own CTA was live on screen, and the
// prosecutor's finished call said "ringing" every time the story walked past
// it again. Each block below states the failure it exists to catch.
//
// These are behaviour tests, not source greps: every one of them mounts the
// real screen, drives it through the contract (the same entry point a Gesture
// Bridge uses), and asserts on where it ends up. Run through
// scripts/register-gesture-contract-loaders.mjs, which compiles the app's JSX
// and stubs react-router-dom so these screens mount outside a <Router>.
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
globalThis.requestAnimationFrame = globalThis.requestAnimationFrame ?? ((fn) => setTimeout(fn, 0));

// AUD-10 asserts that a call that already happened does not buzz the device
// again, so the vibration has to be observable.
const vibrations = [];
try {
  Object.defineProperty(globalThis.navigator ?? {}, 'vibrate', {
    configurable: true,
    value: (pattern) => { vibrations.push(pattern); return true; },
  });
} catch {
  // A navigator that refuses the property leaves `vibrations` empty, which
  // only ever makes the AUD-10 assertion weaker, never wrong.
}

const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { RIGHT } = AR_GESTURES;
const { navigations, resetNavigations } = await import('react-router-dom');
const {
  getScenario03State,
  resetScenario03,
  updateScenario03State,
} = await import('../src/lib/scenario03Store.js');

// Walks a mounted screen's element tree, including the prop slots this app
// puts elements in (LineConversation's footer/quickReplies/bodyBefore), which
// plain children traversal never reaches.
function findElements(node, pred, out = []) {
  if (Array.isArray(node)) { node.forEach((n) => findElements(n, pred, out)); return out; }
  if (!React.isValidElement(node)) return out;
  if (pred(node)) out.push(node);
  if (node.props?.children) React.Children.toArray(node.props.children).forEach((n) => findElements(n, pred, out));
  for (const slot of ['after', 'quickReplies', 'footer', 'bodyBefore', 'actions', 'body']) {
    if (node.props?.[slot]) findElements(node.props[slot], pred, out);
  }
  return out;
}

const byClass = (name) => (node) => typeof node.props?.className === 'string'
  && node.props.className.split(/\s+/).includes(name);

const surfaceId = () => getCurrentARInteraction().surfaceId;

test.beforeEach(() => {
  resetARInteractionContract();
  resetNavigations();
  globalThis.localStorage.clear();
  globalThis.sessionStorage.clear();
  resetScenario03();
  vibrations.length = 0;
});

// ---------------------------------------------------------------------------
// AUD-08 - closing the consent form must not end the run
//
// The case site's four tasks unlock one at a time, and its contract is "open
// the one unlocked task". The consent form is the fourth, and it is the only
// one whose task is completed by SIGNING rather than by reading - signing is
// what ends the officer's call and routes to the prosecutor.
//
// closeDoc() treated it like the other three and ticked its task off anyway.
// All four then read 已完成, the one unlocked task was gone, the contract
// collapsed to `display` on scenario03/case-site/complete, and the run had
// nothing left that a gesture could reach: the only way on was to re-open the
// consent form by tapping a 已完成 row, which no gesture can do.
// ---------------------------------------------------------------------------
async function mountCaseSite() {
  const { CaseSite } = await import('../src/pages/scenario03/CaseSite.jsx');
  return mountSurface(CaseSite);
}

// Opens task `n` (1-based) through the contract and closes it again with the
// document bar's own 關閉 button - the control a player taps, not the footer.
function closeThroughDocBar(page) {
  const close = findElements(page.output, byClass('pol-doc-close'))[0];
  assert.ok(close, 'the open document has a 關閉 control in its bar');
  close.props.onClick();
  page.rerender();
}

test('AUD-08 closing the consent form leaves the case site with something to do', async () => {
  const page = await mountCaseSite();
  try {
    assert.equal(surfaceId(), 'scenario03/case-site');

    // Read the three read-only documents the way the run does.
    for (let i = 0; i < 3; i += 1) {
      assert.equal(performARInteraction(RIGHT), true, `task ${i + 1} opens`);
      page.rerender();
      assert.equal(surfaceId(), 'scenario03/case-site/document');
      assert.equal(performARInteraction(RIGHT), true, `task ${i + 1} closes`);
      page.rerender();
      assert.equal(surfaceId(), 'scenario03/case-site');
    }

    // The fourth task is the consent form.
    assert.equal(performARInteraction(RIGHT), true);
    page.rerender();
    assert.equal(surfaceId(), 'scenario03/case-site/consent');

    // Put it down without signing.
    closeThroughDocBar(page);

    assert.notEqual(
      surfaceId(),
      'scenario03/case-site/complete',
      'an unsigned consent form must never leave the case site with every task done',
    );
    assert.equal(surfaceId(), 'scenario03/case-site');
    assert.equal(getCurrentARInteraction().mode, 'single');
    assert.equal(getCurrentARInteraction().rightAvailable, true);

    // And the way on is still there: RIGHT re-opens the consent form.
    assert.equal(performARInteraction(RIGHT), true);
    page.rerender();
    assert.equal(surfaceId(), 'scenario03/case-site/consent');
  } finally {
    page.unmount();
  }
});

test('AUD-08 an unsigned consent form is not recorded as a completed task', async () => {
  const page = await mountCaseSite();
  try {
    for (let i = 0; i < 4; i += 1) {
      performARInteraction(RIGHT);
      page.rerender();
      if (surfaceId() === 'scenario03/case-site/consent') break;
      performARInteraction(RIGHT);
      page.rerender();
    }
    assert.equal(surfaceId(), 'scenario03/case-site/consent');

    closeThroughDocBar(page);

    const state = getScenario03State();
    assert.ok(
      !state.documentsRead.includes('consent'),
      'only 送出同意書 completes the consent task, never 關閉',
    );
    assert.equal(state.consentSigned, false);
    // Reading a fake document is still recorded - that is what the flag means.
    assert.ok(state.warningFlags.includes('opened_fake_documents'));
  } finally {
    page.unmount();
  }
});

test('AUD-08 signing the consent form is what completes it, and it leaves the case site', async () => {
  const page = await mountCaseSite();
  try {
    for (let i = 0; i < 4; i += 1) {
      performARInteraction(RIGHT);
      page.rerender();
      if (surfaceId() === 'scenario03/case-site/consent') break;
      performARInteraction(RIGHT);
      page.rerender();
    }
    assert.equal(surfaceId(), 'scenario03/case-site/consent');

    // The consent document's footer button, which is what RIGHT runs here.
    const sign = findElements(page.output, (n) => n.props?.className === 'pol-cta' && typeof n.props?.onClick === 'function')
      .pop();
    assert.ok(sign, 'the consent document carries its own 送出同意書 button');
    assert.equal(performARInteraction(RIGHT), true);
    page.rerender();

    const state = getScenario03State();
    assert.equal(state.consentSigned, true);
    assert.ok(state.documentsRead.includes('consent'));
    assert.equal(state.firstPoliceCallStatus, 'ended', 'signing ends the first officer\'s call');
    assert.equal(navigations[0][0], '/scenario03-police/prosecutor-call');
  } finally {
    page.unmount();
  }
});

// ---------------------------------------------------------------------------
// AUD-09 - the LINE 案件說明 CTA arrives before the footer does
//
// The 案件狀態查詢 card carries its own 開啟案件狀態查詢 button and lands with
// the officer's last message; the footer only appears once the script has
// played out. The contract flipped to `single` on the footer, so for the
// ~4 seconds in between the screen showed a live primary control with LEFT and
// RIGHT both off - a player tapping the screen could move on, a player on the
// glasses had to sit and wait.
//
// What makes this worth a behavioural test rather than a source assertion is
// the "same handler" half: the contract must run the card's own toCaseSite,
// not a second copy of it.
// ---------------------------------------------------------------------------
// The chat itself is components/ScriptedLineConversation, which this harness
// does not invoke - so the card is reached the way the page hands it over:
// the conversation element the page built, with the page's own `player` and
// `renderCard` on it. Nothing here restates what LineIntro passes down.
const conversationOf = (page) => findElements(
  page.output,
  (n) => typeof n.type === 'function' && /ScriptedLineConversation/.test(n.type.name || ''),
)[0];

const caseSiteCardBeat = (page) => conversationOf(page)?.props?.player?.log
  ?.find((beat) => beat.card?.kind === 'status') ?? null;

// The 開啟案件狀態查詢 button, exactly as the page's own renderCard draws it.
function cardCta(page) {
  const conversation = conversationOf(page);
  const beat = caseSiteCardBeat(page);
  if (!conversation || !beat) return null;
  return findElements(conversation.props.renderCard(beat), byClass('pol-msg-card-cta'))[0] ?? null;
}

async function reachCaseSiteCard() {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { LineIntro } = await import('../src/pages/scenario03/LineIntro.jsx');
  const page = mountSurface(LineIntro);
  for (let i = 0; i < 400; i += 1) {
    if (caseSiteCardBeat(page)) return page;
    // Answer the scene's one 2-choice moment as soon as it appears, the same
    // way a gesture would.
    if (getCurrentARInteraction().mode === 'dual') {
      performARInteraction(RIGHT);
      page.rerender();
      continue;
    }
    mock.timers.tick(1200);
    page.rerender();
  }
  page.unmount();
  mock.timers.reset();
  throw new Error('LineIntro never reached the 案件狀態查詢 card');
}

test('AUD-09 the case-site CTA is gesture-reachable the moment it is on screen', async () => {
  const page = await reachCaseSiteCard();
  try {
    assert.ok(cardCta(page), 'the 案件狀態查詢 card is on screen with its own live CTA');
    assert.equal(
      conversationOf(page).props.player.done,
      false,
      'the point of this test is the window BEFORE the script finishes',
    );

    const snapshot = getCurrentARInteraction();
    assert.equal(snapshot.mode, 'single', 'a live primary control means one story action, not none');
    assert.equal(snapshot.surfaceId, 'scenario03/line-intro/open-case-site');
    assert.equal(snapshot.rightAvailable, true);

    assert.equal(performARInteraction(RIGHT), true);
    assert.equal(navigations[0]?.[0], '/scenario03-police/case-site');
  } finally {
    page.unmount();
    mock.timers.reset();
  }
});

test('AUD-09 the card CTA and the footer button are one handler, not two', async () => {
  const page = await reachCaseSiteCard();
  try {
    const cta = cardCta(page);
    const footer = findElements(conversationOf(page).props.footer, byClass('pol-cta'))[0]
      ?? conversationOf(page).props.footer;
    assert.ok(cta && footer?.props?.onClick, 'both controls carry a handler');
    assert.equal(
      cta.props.onClick,
      footer.props.onClick,
      'the card CTA and the footer button must be the same toCaseSite, not a copy',
    );

    // And the gesture runs that same handler rather than a third copy.
    resetNavigations();
    assert.equal(performARInteraction(RIGHT), true);
    assert.equal(navigations[0]?.[0], '/scenario03-police/case-site');
    resetNavigations();
    cta.props.onClick();
    assert.equal(navigations[0]?.[0], '/scenario03-police/case-site');
  } finally {
    page.unmount();
    mock.timers.reset();
  }
});

// ---------------------------------------------------------------------------
// AUD-10 - a call that already ended must not ring again
//
// ProsecutorCall derived its opening stage from firstPoliceCallStatus alone.
// That status stays 'ended' for the rest of the run, so every later arrival at
// this route mounted straight into the ring stage: the ring screen painted,
// 接聽 appeared and the device buzzed, for a call that had already happened,
// on the way to a redirect. The case site's own "the first call is over"
// guard routes here, which is what the browser Back button reaches from LINE
// 資金監管 - so this was not a deep-link-only edge.
//
// PoliceCallback already solved this by staying 'blocked' until its mount
// guard says otherwise; this pins that ProsecutorCall does the same.
// ---------------------------------------------------------------------------
async function mountProsecutorCall() {
  const { ProsecutorCall } = await import('../src/pages/scenario03/ProsecutorCall.jsx');
  return mountSurface(ProsecutorCall);
}

const ringScreen = (page) => findElements(page.output, byClass('pol-call-btn-answer'));

test('AUD-10 a finished prosecutor call does not ring again on the way past', async () => {
  updateScenario03State({ firstPoliceCallStatus: 'ended', prosecutorCallCompleted: true });
  const page = await mountProsecutorCall();
  try {
    assert.equal(page.output, null, 'nothing is painted for a call that already ended');
    assert.equal(ringScreen(page).length, 0, 'no 接聽 for a call that already ended');
    assert.notEqual(surfaceId(), 'scenario03/prosecutor-call/answer');
    assert.equal(navigations.length, 1);
    assert.equal(navigations[0][0], '/scenario03-police/police-callback');
    assert.deepEqual(vibrations, [], 'a finished call must not buzz the device again');
  } finally {
    page.unmount();
  }
});

test('AUD-10 arriving before the first call has ended does not ring either', async () => {
  updateScenario03State({ firstPoliceCallStatus: 'active' });
  const page = await mountProsecutorCall();
  try {
    assert.equal(page.output, null);
    assert.equal(ringScreen(page).length, 0);
    assert.equal(navigations.length, 1);
    assert.equal(navigations[0][0], '/scenario03-police/case-site');
    assert.deepEqual(vibrations, []);
  } finally {
    page.unmount();
  }
});

test('AUD-10 the real arrival still rings, and 接聽 is still its one action', async () => {
  updateScenario03State({ firstPoliceCallStatus: 'ended', prosecutorCallCompleted: false });
  const page = await mountProsecutorCall();
  try {
    assert.equal(ringScreen(page).length, 1, 'the prosecutor really does ring on a valid arrival');
    assert.deepEqual(navigations, [], 'a valid arrival is not redirected away');
    const snapshot = getCurrentARInteraction();
    assert.equal(snapshot.mode, 'single');
    assert.equal(snapshot.surfaceId, 'scenario03/prosecutor-call/answer');
    assert.equal(snapshot.leftAvailable, false);

    // Answering leaves the ring screen for the call itself.
    assert.equal(performARInteraction(RIGHT), true);
    page.rerender();
    assert.equal(ringScreen(page).length, 0);
    assert.equal(getScenario03State().activeCall, 'prosecutor');
  } finally {
    page.unmount();
  }
});
