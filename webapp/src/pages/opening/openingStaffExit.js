// The hidden staff exit on the opening animation: three taps in the screen's top-right
// corner, inside 1.5 seconds, and the opening is over.
//
// It lives here, as plain DOM, rather than as an `onPointerDown` prop on a div inside
// the screen - because that is what it was, and on a phone it did not work. Two
// separate reasons, both reproduced in a Chromium driven by real touch input:
//
// 1. THE CORNER WAS NOT THE CORNER. The hit area was `position: absolute` inside
//    `.opening`, which is inside the shared stage - and useFitStage gives that
//    stage `position: fixed` plus a `transform`. On a phone-width viewport the stage
//    happens to fill the screen and the two corners coincide, which is why it passed
//    on a bench. On any WebView whose layout viewport is 768 CSS px or wider (a
//    tablet, an unfolded foldable, a landscape head unit) the same CSS letterboxes
//    the stage into a 430px column: measured at 800x1280 the hit area sat 112px in
//    from the right edge, and at 1280x720 it sat 425px in. A thumb on the screen's
//    real top-right corner hit `<body>` and the opening played on.
//
//    A `transform` on an ancestor also makes that ancestor the containing block for
//    `position: fixed` descendants, so moving the old div to `fixed` in place would
//    have changed nothing. The element has to leave the stage entirely, which is why
//    this module creates it on `document.body`.
//
// 2. THE SKIP WORKED AND THE TAP KEPT GOING. The third `pointerdown` skipped the
//    opening synchronously - React flushes discrete events before the handler
//    returns - so by the time that same tap produced its `click`, the language
//    screen was already mounted underneath the finger. Its staff-settings gear is at
//    `top: 1.8%; right: 3.5%`: the same corner. The click landed on it and the app
//    went to /staff-setup. Five runs out of six ended there. From the room that
//    reads as "the triple tap does not skip the opening" - the opening stops and the
//    wrong screen appears - which is exactly what was reported from the device.
//    `preventDefault()` on `pointerdown` does not suppress that click; nothing that
//    only listens on the opening's own element can, because the opening is gone by then.
//    So the skip arms a short guard that eats the rest of that gesture (below).
//
// Counting happens in the CAPTURE phase on `window`, not on the element. Capture on
// window is the first thing in the document to see any event, before React's root
// delegation and before anything the opening's own layers could do with it - so "is the hidden area really on top of the video" stops being a
// question that has to be answered by inspecting stacking contexts on a device
// nobody can attach a debugger to. The element is still there, still on top, and
// still swallows the touch; it just is not what the counter depends on.

// Three taps and not two: a double tap is what a wearer produces by accident when a
// screen does not respond instantly, and the cost of a false positive is the audience
// never seeing the opening at all.
export const STAFF_SKIP_TAPS = 3;
export const STAFF_SKIP_WINDOW_MS = 1500;

// The corner, in CSS pixels, and the fallback used when the element has not been laid
// out yet. Big enough to hit reliably with a thumb on a moving head-mounted display -
// the spec's floor is 80 - and small enough that a wearer reaching for the screen
// anywhere else, including the rest of the top edge, cannot find it by accident.
// OpeningSequence.css draws the same number; opening-animation.test.mjs fails if the two
// drift.
export const STAFF_SKIP_HIT_AREA_PX = 88;

// How long after a successful skip the rest of that gesture is eaten. A trailing
// click follows its pointerdown by well under 100ms even on a slow device; this is
// deliberately several times that, because the failure it prevents is the tap landing
// on whatever the NEXT screen happens to draw in the same corner, and there is no
// second chance at that once it has happened.
export const STAFF_SKIP_TAIL_MS = 700;

// The three ways a single tap can announce itself, best first. Exactly one of them is
// counted per device: the first family seen in the corner wins and the others are
// ignored from then on, so one finger is one tap whether the WebView speaks Pointer
// Events (`pointerdown` arrives first and latches), only Touch Events (`touchend`
// latches instead), or neither (a desktop mouse's `click`).
//
// The ordering is what makes the de-duplication exact rather than a timing heuristic:
// a real tap emits pointerdown -> touchend -> click in that order, so by the time the
// weaker events arrive the latch is already set. A window of "ignore anything within
// N ms" would have to be shorter than the gap between two deliberate taps (which can
// be 120ms) and longer than the gap between a pointerdown and its own click (which
// can be 300ms), and no such N exists.
const TAP_EVENTS = Object.freeze({ pointerdown: 3, touchend: 2, click: 1 });

// What the guard eats after a skip. `pointerdown` is deliberately NOT in this list:
// it is the start of a new gesture, not the tail of the finished one, and swallowing
// it would make the next screen feel dead. Everything here is a tail event, and the
// guard only ever looks at the corner.
const TAIL_EVENTS = Object.freeze([
  'pointerup', 'pointercancel', 'touchend', 'touchcancel',
  'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu',
]);

const CAPTURE = Object.freeze({ capture: true, passive: false });

// performance.now(), not event.timeStamp: it is page-relative by definition and
// monotonic, so neither a device whose wall clock jumps mid-gesture nor a WebView
// that stamps touch events from a clock of its own can turn three taps into one.
function defaultNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

// clientX/clientY for a pointer, mouse or click event; the lifted finger for a touch
// one. Both are in the same coordinate space the hit area's own rect is in.
function pointOf(event) {
  if (event && typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event && event.changedTouches && event.changedTouches[0];
  if (touch && typeof touch.clientX === 'number') {
    return { x: touch.clientX, y: touch.clientY };
  }
  return null;
}

function isRect(rect) {
  return !!rect && rect.width > 0 && rect.height > 0;
}

/**
 * Installs the hidden staff exit: the invisible corner element, and the counter that
 * watches it.
 *
 * Returns a teardown that removes both. It deliberately does NOT cancel a guard armed
 * by a successful skip - that guard exists precisely to outlive this screen, and by
 * the time it matters this screen has already navigated away.
 */
export function installOpeningStaffExit(options = {}) {
  const {
    onSkip,
    view = typeof window === 'undefined' ? null : window,
    doc = view && view.document,
    now = defaultNow,
    taps = STAFF_SKIP_TAPS,
    windowMs = STAFF_SKIP_WINDOW_MS,
    hitAreaPx = STAFF_SKIP_HIT_AREA_PX,
    tailMs = STAFF_SKIP_TAIL_MS,
  } = options;

  if (!view || typeof view.addEventListener !== 'function') return () => {};
  if (typeof onSkip !== 'function') return () => {};

  // The hidden hit area itself. On document.body, so no ancestor transform, filter or
  // stacking context stands between it and the viewport - see (1) at the top of this
  // file. No label, no icon, no border, no cursor and nothing in the accessibility
  // tree: a screen reader announcing a skip target would defeat the point as
  // thoroughly as drawing one would.
  let element = null;
  if (doc && typeof doc.createElement === 'function' && doc.body) {
    element = doc.createElement('div');
    element.className = 'opening__staff-exit';
    element.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(element);
  }

  let marks = [];
  let family = 0;
  let disarmTail = null;

  // The corner is the element's own box, so the area that is counted and the area
  // that is drawn cannot disagree. The fallback is for the frame before layout has
  // run, and for a document that never laid it out at all.
  function corner() {
    const rect = element && typeof element.getBoundingClientRect === 'function'
      ? element.getBoundingClientRect()
      : null;
    if (isRect(rect)) {
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }
    const root = doc && doc.documentElement;
    const width = (root && root.clientWidth) || view.innerWidth || 0;
    return { left: width - hitAreaPx, right: width, top: 0, bottom: hitAreaPx };
  }

  function inCorner(event) {
    const point = pointOf(event);
    if (!point) return false;
    const box = corner();
    return point.x >= box.left && point.x <= box.right
      && point.y >= box.top && point.y <= box.bottom;
  }

  // The taps belong to this corner and reach nothing else - not the animation underneath,
  // and not the home screen that is revealed underneath it a
  // millisecond later.
  function claim(event) {
    if (event.cancelable !== false && typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }

  function armTailGuard() {
    if (disarmTail) disarmTail();
    const deadline = now() + tailMs;
    const swallow = (event) => {
      if (now() > deadline) { if (disarmTail) disarmTail(); return; }
      if (!inCorner(event)) return;
      claim(event);
      // The click is the one that would have opened the next screen's corner control.
      // Once it has been eaten there is nothing left of this gesture to guard against,
      // and the next deliberate tap must not be delayed by a guard still standing.
      if (event.type === 'click' && disarmTail) disarmTail();
    };
    for (const type of TAIL_EVENTS) view.addEventListener(type, swallow, CAPTURE);
    // A WebView that suppressed the click entirely would otherwise leave the guard
    // standing for ever; nothing here depends on the timer firing promptly.
    const timer = setTimeout(() => { if (disarmTail) disarmTail(); }, tailMs + 50);
    disarmTail = () => {
      disarmTail = null;
      clearTimeout(timer);
      for (const type of TAIL_EVENTS) view.removeEventListener(type, swallow, CAPTURE);
    };
  }

  function onTap(event) {
    if (!inCorner(event)) return;
    const rank = TAP_EVENTS[event.type] || 0;
    if (rank < family) return;
    family = rank;
    claim(event);

    // A sliding window: every tap first drops the taps that have aged out, then adds
    // itself. So a slow triple tap - three taps spread over two seconds, which is what
    // a curious wearer produces - never has more than two in play, while a genuine
    // three inside 1.5s counts whenever it happens, however much idle tapping came
    // before it.
    const at = now();
    marks = marks.filter((mark) => at - mark < windowMs);
    marks.push(at);
    if (marks.length < taps) return;
    marks = [];
    armTailGuard();
    onSkip();
  }

  for (const type of Object.keys(TAP_EVENTS)) view.addEventListener(type, onTap, CAPTURE);

  return () => {
    for (const type of Object.keys(TAP_EVENTS)) view.removeEventListener(type, onTap, CAPTURE);
    if (element && element.parentNode) element.parentNode.removeChild(element);
    element = null;
  };
}
