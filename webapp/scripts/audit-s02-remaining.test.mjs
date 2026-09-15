// Regression cover for the Final Audit's remaining Scenario 02 fixes.
//
// One suite, because the five findings are one subject - the same one the
// first batch (scripts/audit-batch-abc.test.mjs, AUD-01 … AUD-07) was about,
// applied to the surfaces that batch did not reach:
//
//   * a screen whose contract is `dual` has to be drawn as a LEFT and a RIGHT
//     (dating-lead-reveal, mini-match/<id>/reply, private-chat/video-recovery)
//   * a control the player can see has to be one a gesture can reach - and a
//     thing no gesture can reach must therefore stop being a control
//     (the LINE video thumbnails, the LINE photo lightbox)
//
// Run through scripts/register-gesture-contract-loaders.mjs, which compiles
// the app's JSX and stubs react-router-dom so these screens mount outside a
// <Router> (see scripts/stubs/react-router-dom.mjs).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

const { AR_GESTURES, getCurrentARInteraction, performARInteraction, resetARInteractionContract } =
  await import('../src/lib/arInteraction/index.js');
const { LEFT, RIGHT } = AR_GESTURES;

const src = (p) => readFile(new URL(`../src/${p}`, import.meta.url), 'utf8');

// Same tree walk the first batch uses: React children plus the prop slots this
// app puts elements in (LineConversation's after/quickReplies, MeetU's footer),
// which plain children traversal never reaches.
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

// A CSS rule body, by exact selector. `selector` is matched literally, so a
// rule that gains an extra comma-separated selector still resolves.
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[},])\\s*(?:[^{}]*,\\s*)?${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1] ?? null;
}

const TWO_EQUAL_COLUMNS =
  /grid-template-columns:\s*(?:minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)|repeat\(2,\s*minmax\(0,\s*1fr\)\))/;

// ---------------------------------------------------------------------------
// A `dual` decision is drawn as a LEFT and a RIGHT
//
// The first batch fixed the four surfaces it named; these are Scenario 02's
// remaining three. Geometry lives in CSS, so this pins the CSS - and pins that
// none of it sits inside a media query, because a width where the pair
// restacks teaches "top and bottom" for a contract that only speaks left and
// right.
// ---------------------------------------------------------------------------
const DUAL_GEOMETRY = [
  ['scenario02 dating-lead-reveal / MeetU interstitials', 'apps/meetu/styles/index.css', '.meetu-interstitial-actions-split'],
  ['scenario02 mini-match reply pills', 'apps/meetu/styles/index.css', '.meetu-mini-chat .meetu-suggested-pills:has(> .meetu-suggested-pill:nth-child(2):last-child)'],
  ['scenario02 private-chat video recovery', 'pages/scenario02/PrivateChat.css', '.line-video-error-actions'],
];

test('every remaining Scenario 02 dual decision is laid out as two columns', async () => {
  for (const [label, file, selector] of DUAL_GEOMETRY) {
    const css = await src(file);
    const body = ruleBody(css, selector);
    assert.ok(body, `${label}: ${selector} must declare its own layout`);
    assert.match(body, TWO_EQUAL_COLUMNS, `${label}: ${selector} must be two equal columns`);
  }
});

test('no remaining Scenario 02 dual decision restacks vertically at any width', async () => {
  for (const [label, file, selector] of DUAL_GEOMETRY) {
    const css = await src(file);
    for (const block of css.match(/@media[^{]*\{[\s\S]*?\n\}/g) ?? []) {
      assert.ok(!block.includes(selector),
        `${label}: ${selector} is touched inside a media query - the pair must stay side by side across 320px-430px`);
    }
  }
});

// The columns are only worth anything if the pair actually opts into them, and
// a column pair is only readable if its buttons can shrink and wrap.
test('the dual surfaces really do carry the modifier', async () => {
  const browse = await src('pages/scenario02/DatingBrowse.jsx');
  // MeetUInterstitial opts in per instance. Both of MeetU's remaining `dual`
  // interstitials must pass it - dating-lead-reveal was the odd one out.
  // simulation-required is no longer among them: 返回情境首頁 is gone, so it is
  // a one-button `single` screen and has no pair to split.
  assert.equal((browse.match(/splitActions/g) ?? []).length, 2,
    'dating-lead-skipped and dating-lead-reveal are both dual and both split');
  const reveal = /function DatingLeadRevealScreen[\s\S]*?\n}/.exec(browse);
  assert.ok(reveal && reveal[0].includes('splitActions'), '主線對象個人頁 is a dual decision and must be drawn as one');

  const chat = await src('pages/scenario02/PrivateChat.jsx');
  assert.equal((chat.match(/className="line-video-error-actions"/g) ?? []).length, 2,
    'both recovery panels (STALLED and ERROR) put their two buttons in the row');

  const css = await src('apps/meetu/styles/index.css');
  const pill = ruleBody(css, '.meetu-mini-chat .meetu-suggested-pills:has(> .meetu-suggested-pill:nth-child(2):last-child) .meetu-suggested-pill');
  assert.ok(pill, 'the mini-match pills need the matching pill rule, not just the grid');
  assert.match(pill, /white-space:\s*normal/, 'a column pill wraps instead of forcing the row wider');
  assert.match(pill, /min-width:\s*0/, 'a column pill must be allowed to shrink below its content');

  const chatCss = await src('pages/scenario02/PrivateChat.css');
  const btn = ruleBody(chatCss, '.line-video-error-btn');
  assert.ok(btn, '.line-video-error-btn must still declare itself');
  assert.doesNotMatch(btn, /width:\s*220px/, 'a fixed 220px button overflows a two-column row at 320px');
  assert.match(btn, /min-width:\s*0/, 'the recovery buttons must be allowed to shrink into their columns');
});

// ---------------------------------------------------------------------------
// The recovery panel's handlers are AUD-01's, untouched
//
// The row above is layout and nothing else. This is the guard that keeps it
// that way: the two buttons must still be the same two, in the same order,
// running the same functions the overlay publishes upward - and the panel must
// still wait for the player rather than skipping itself.
// ---------------------------------------------------------------------------
async function reachVideoOverlay() {
  mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const { PrivateChat } = await import('../src/pages/scenario02/PrivateChat.jsx');
  const page = mountSurface(PrivateChat);
  const isOverlay = (n) => typeof n.type === 'function' && /VideoOverlay/.test(n.type.name || '');
  for (let i = 0; i < 400; i += 1) {
    mock.timers.tick(1200);
    const found = findElements(page.output, isOverlay);
    if (found.length) return { page, element: found[0] };
    const choice = findElements(page.output, (n) => typeof n.props?.onChoose === 'function');
    if (choice.length) choice[0].props.onChoose(0);
  }
  page.unmount();
  throw new Error('PrivateChat never opened a video overlay');
}

test('the recovery row keeps AUD-01 intact: same two handlers, LEFT first, no auto-skip', async () => {
  resetARInteractionContract();
  const { page, element } = await reachVideoOverlay();
  const VideoOverlay = element.type;
  const recoveryRef = { current: null };
  const overlay = mountSurface(VideoOverlay, { ...element.props, recoveryRef, onRecoveringChange: () => {} });
  try {
    findElements(overlay.output, (n) => n.type === 'video')[0]
      .props.onError({ currentTarget: { error: { code: 4, message: 'MEDIA_ERR_SRC_NOT_SUPPORTED' } } });

    const buttons = findElements(overlay.output, (n) => n.type === 'button');
    assert.equal(buttons.length, 2, 'the recovery panel has exactly the two story actions, no third control');
    // Drawn order is contract order: LEFT is the button drawn first.
    assert.equal(buttons[0].props.onClick, recoveryRef.current.retry, '重新播放 is drawn first and is LEFT');
    assert.equal(buttons[1].props.onClick, recoveryRef.current.skip, '略過影片並繼續 is drawn second and is RIGHT');

    // Still the overlay's own handlers, still no timer that answers for the
    // player - the row must not have introduced either.
    const finished = [];
    const waiting = mountSurface(VideoOverlay, {
      ...element.props, recoveryRef: { current: null }, onRecoveringChange: () => {}, onFinished: (id) => finished.push(id),
    });
    findElements(waiting.output, (n) => n.type === 'video')[0]
      .props.onError({ currentTarget: { error: { code: 4, message: 'x' } } });
    mock.timers.tick(120000);
    assert.deepEqual(finished, [], 'the recovery panel must not skip itself on a timer');
    waiting.unmount();
  } finally {
    overlay.unmount();
    page.unmount();
    mock.timers.reset();
  }
});

// ---------------------------------------------------------------------------
// 主線對象個人頁: the split did not move the buttons or the contract
// ---------------------------------------------------------------------------
const byName = (re) => (n) => typeof n.type === 'function' && re.test(n.type.name || '');

test('dating-lead-reveal binds LEFT to the button drawn first, and asks for two columns', async () => {
  const { DatingBrowse } = await import('../src/pages/scenario02/DatingBrowse.jsx');
  localStorage.clear();
  const page = mountSurface(DatingBrowse);
  let screen = null;
  try {
    // Pass on all three cards - passing on her is what opens the notice.
    for (let i = 0; i < 4; i += 1) {
      const stage = findElements(page.output, (n) => typeof n.props?.onDecision === 'function')[0];
      if (!stage) break;
      stage.props.onDecision('pass');
    }
    const skipped = findElements(page.output, byName(/DatingLeadSkippedScreen/))[0];
    assert.ok(skipped, 'passing on 主線對象 opens 略過主線對象後的通知');
    skipped.props.onReveal(); // 查看對方
    const reveal = findElements(page.output, byName(/DatingLeadRevealScreen/))[0];
    assert.ok(reveal, '查看對方 opens her profile page');

    // Mount that screen for real, with spies where the story's two actions go.
    resetARInteractionContract();
    const opened = [];
    const back = [];
    screen = mountSurface(reveal.type, {
      ...reveal.props,
      onOpenChat: () => opened.push(1),
      onBack: () => back.push(1),
    });

    const ar = getCurrentARInteraction();
    assert.equal(ar.surfaceId, 'scenario02/dating-lead-reveal');
    assert.equal(ar.mode, 'dual');
    assert.equal(ar.leftAvailable, true);
    assert.equal(ar.rightAvailable, true);

    const interstitial = findElements(screen.output, (n) => typeof n.props?.primaryLabel === 'string')[0];
    assert.ok(interstitial, 'the profile page renders MeetU\'s interstitial');
    assert.equal(interstitial.props.splitActions, true, 'and asks it for two columns');

    // The button drawn first and LEFT must be the same action - the whole
    // point of drawing the pair as a LEFT and a RIGHT.
    interstitial.props.onPrimary();
    assert.deepEqual(opened, [1], '看看她的訊息 is the primary, drawn first');
    assert.equal(performARInteraction(LEFT), true);
    assert.deepEqual(opened, [1, 1], 'LEFT runs 看看她的訊息');
    interstitial.props.onSecondary();
    assert.deepEqual(back, [1], '返回 is the secondary');
    assert.equal(performARInteraction(RIGHT), true);
    assert.deepEqual(back, [1, 1], 'RIGHT runs 返回');
  } finally {
    screen?.unmount();
    page.unmount();
  }
});

// ---------------------------------------------------------------------------
// A thing no gesture can reach must not be a control
//
// The LINE chat is `display` while a clip or a photo is on screen, because
// both open and close themselves. Two things contradicted that: the video
// thumbnails were <button>s that re-opened a clip over whatever the chat was
// doing (including over a live 二選一, whose LEFT/RIGHT then answered the
// hidden conversation), and the photo lightbox's ✕ and backdrop ran
// completeImage() - a tap-only way to push the story forward.
// ---------------------------------------------------------------------------
test('the LINE video thumbnails are scenery, not controls', async () => {
  const s = await src('pages/scenario02/PrivateChat.jsx');
  const thumb = /function VideoThumb[\s\S]*?\n}/.exec(s);
  assert.ok(thumb, 'VideoThumb still exists');
  assert.doesNotMatch(thumb[0], /<button/, 'the thumbnail must not be a button');
  assert.doesNotMatch(thumb[0], /onClick/, 'the thumbnail must not carry a click handler');
  assert.doesNotMatch(thumb[0], /onOpen/, 'and must not be handed an opener at all');
  assert.doesNotMatch(s, /<VideoThumb[^/]*onOpen/, 'the call site stops passing one too');

  const css = await src('pages/scenario02/PrivateChat.css');
  const rule = ruleBody(css, '.line-video-thumb');
  assert.ok(rule, '.line-video-thumb must still declare itself');
  assert.match(rule, /pointer-events:\s*none/, 'scenery cannot be tapped');
  assert.doesNotMatch(rule, /cursor:\s*pointer/, 'and must not advertise itself as tappable');
});

test('the LINE photo lightbox has no way out but its own timer', async () => {
  const s = await src('pages/scenario02/PrivateChat.jsx');
  const lightbox = /function PhotoLightbox[\s\S]*?\n}/.exec(s);
  assert.ok(lightbox, 'PhotoLightbox still exists');
  assert.doesNotMatch(lightbox[0], /<button/, 'the ✕ must not be a button');
  assert.doesNotMatch(lightbox[0], /onClick/, 'neither the ✕ nor the backdrop may close it');
  assert.doesNotMatch(lightbox[0], /onClose/, 'and it takes no close handler at all');
  assert.match(lightbox[0], /aria-hidden="true"/, 'the ✕ glyph stays, as decoration');
  assert.doesNotMatch(s, /<PhotoLightbox[^/]*onClose/, 'the call site stops passing one too');
  // The timer that does close it is still there, still per-image.
  assert.match(s, /setTimeout\(\(\) => closeImage\(\), lightboxItem\.displayDuration \?\? 5000\)/,
    'the per-image display timer is the one way out');

  const css = await src('pages/scenario02/PrivateChat.css');
  for (const selector of ['.line-image-lightbox-close', '.line-image-thumb']) {
    const rule = ruleBody(css, selector);
    assert.ok(rule, `${selector} must still declare itself`);
    assert.match(rule, /pointer-events:\s*none/, `${selector} cannot be tapped`);
    assert.doesNotMatch(rule, /cursor:\s*pointer/, `${selector} must not advertise itself as tappable`);
  }
});

// A behavioural backstop for the two above: mount the real page, drive it to a
// real video, and confirm the chat is `display` the whole time the clip is up -
// there is no state in which one of these thumbnails becomes the contract.
test('a clip opens itself, and while it plays the chat is still display', async () => {
  resetARInteractionContract();
  const { page, element } = await reachVideoOverlay();
  try {
    assert.ok(element.props.src, 'the clip the chat opened on its own has a source');
    const ar = getCurrentARInteraction();
    assert.equal(ar.mode, 'display', 'normal playback stays display');
    assert.equal(ar.surfaceId, 'scenario02/private-chat');
    // The chat's own history is still nothing but scenery: the thumbnail the
    // clip came from is handed no opener, so there is no state in which a tap
    // on it could re-open a clip over a live decision.
    const thumbs = findElements(page.output, byName(/VideoThumb/));
    assert.ok(thumbs.length >= 1, 'the clip left its thumbnail in the chat history');
    for (const thumb of thumbs) {
      assert.equal(thumb.props.onOpen, undefined, 'a thumbnail is handed no opener');
      assert.equal(thumb.props.onClick, undefined, 'and no click handler');
    }
  } finally {
    page.unmount();
    mock.timers.reset();
  }
});
