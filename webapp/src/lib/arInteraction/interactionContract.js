// AR Interaction Contract - the one place that answers "what is the player
// allowed to do on the screen that is on right now?".
//
// CIBAR's AR build is driven by hand gestures instead of taps, and a gesture
// carries no coordinates: a wave is just LEFT or RIGHT. So the AR build needs
// a *semantic* answer, not a visual one. Counting the buttons on screen can
// never give that answer - a CIBAR screen is full of controls that are not
// story actions (display-only app header icons, fake browser chrome, footer
// tabs, decorative marks), and several story screens carry none at all.
//
// Hence this module. Every screen that wants to be gesture-operable declares
// its interaction geometry through `useARInteraction` (see
// ./useARInteraction.js), and the Gesture Bridge (./gestureBridge.js) reads
// *only* what is declared here. There are exactly three geometries, and no
// fourth:
//
//   0 story actions -> 'display'  - nothing to do; gestures do nothing
//   1 story action  -> 'single'   - RIGHT runs it; there is no LEFT
//   2 story actions -> 'dual'     - LEFT runs the first, RIGHT the second
//
// More than two story actions on one AR screen is an AR contract violation:
// there is no third gesture, and UP/DOWN/scroll/cursor are deliberately not
// part of the vocabulary. This module reports such a declaration (see
// `validateARInteraction`) rather than failing the build; the migration that
// removed the last of them is pinned by `test:ar-interaction-migration`, and
// turning the report into a build-failing gate is still open work (see
// docs/CIBAR-Technical-Specification.md §4.12).
//
// What this module is NOT, and must never become:
//
// - It knows nothing about gesture recognition, the camera, MediaPipe, any
//   hand-tracking SDK, or any vendor's AR glasses. It never imports a device
//   API. "RIGHT" here is a story-level word, not a hand pose. Neither does
//   the Bridge above it: recognition has not been built yet, and when it is,
//   it lands in an adapter outside both of them.
// - It never touches the DOM. No `querySelector`, no synthetic `.click()`,
//   no button index, no screen coordinate, no `data-*` attribute. An action
//   is the React handler itself, called directly.
// - It holds no UI. There is no overlay, no cursor, no debug panel.
//
// Touch input is completely unaffected: screens keep their own onClick
// handlers exactly as they were, and this contract just names the same
// handlers a second time, semantically.

// The three legal interaction geometries.
export const AR_INTERACTION_MODES = Object.freeze({
  DISPLAY: 'display',
  SINGLE: 'single',
  DUAL: 'dual',
});

// The whole gesture vocabulary. Deliberately two entries: there is no UP,
// no DOWN, no third choice, and no focus cursor.
export const AR_GESTURES = Object.freeze({
  LEFT: 'left',
  RIGHT: 'right',
});

// The AR ceiling: two story actions per screen, because there are two
// gestures. Exported so the spec's rule has exactly one definition in code.
export const AR_MAX_ACTIONS = 2;

const { DISPLAY, SINGLE, DUAL } = AR_INTERACTION_MODES;
const { LEFT, RIGHT } = AR_GESTURES;

// Which keys each mode may carry. Anything else in a declaration is a
// contract violation - this is where a third choice, an UP/DOWN action or a
// scroll action would surface.
const ALLOWED_KEYS = {
  [DISPLAY]: ['mode', 'surfaceId', 'disabled'],
  [SINGLE]: ['mode', 'surfaceId', 'disabled', 'action'],
  [DUAL]: ['mode', 'surfaceId', 'disabled', 'left', 'right'],
};

const EMPTY = Object.freeze({ mode: DISPLAY, declaredMode: DISPLAY, surfaceId: null, left: null, right: null });

// The single active registration, plus a revision counter that changes every
// time the *interaction* changes - which is not the same thing as every time
// the screen changes.
//
// A registration is made on mount and dropped on unmount, so navigating bumps
// the revision. But a screen can also change what it allows without
// re-registering: the anti-fraud quiz is `dual` until it is answered and
// `single` afterwards, from one registration and one live `read()`. That is a
// different interaction, and a gesture recognised against the earlier one
// must not land on the later one, so the counter has to move there too.
//
// It therefore moves on two things: registration/release, and any change to
// the resolved geometry (which surface, which mode, which sides are
// callable). It deliberately does not move when a re-render merely produces
// new handler closures for the same geometry - inline arrow handlers are new
// objects on every render, and a counter that moved with them would call
// every gesture stale.
//
// The Gesture Bridge reads `revision` alongside a gesture and refuses events
// recognised against a revision that has passed; this module deliberately
// does not debounce anything itself.
let active = null;
let revision = 0;
let tokenSeq = 0;
let signature = null;
let signatureKnown = false;

// What "the same interaction" means, as one comparable string.
function signatureOf(resolved, isActive) {
  if (!isActive) return null;
  return [
    resolved.surfaceId,
    resolved.declaredMode,
    resolved.mode,
    resolved.left !== null,
    resolved.right !== null,
  ].join('|');
}

// Checks one declaration against the contract and returns the problems as
// plain strings. Nothing here throws or fails a build: Phase 1 records
// violations, the migration Phase that follows will gate on them.
export function validateARInteraction(declaration) {
  const problems = [];
  const value = declaration && typeof declaration === 'object' ? declaration : {};
  const allowed = ALLOWED_KEYS[value.mode];
  if (!allowed) {
    problems.push(`unknown AR interaction mode: ${JSON.stringify(value.mode)}`);
    return problems;
  }
  Object.keys(value)
    .filter((key) => !allowed.includes(key))
    .forEach((key) => {
      problems.push(`'${key}' is not part of the '${value.mode}' contract (AR screens allow at most ${AR_MAX_ACTIONS} actions: LEFT and RIGHT)`);
    });
  return problems;
}

// An action counts only if it is actually callable right now. A missing
// handler and a disabled control are the same thing to a gesture: nothing
// happens. This is what keeps a gesture from answering an already-answered
// quiz or re-firing a CTA that the screen has greyed out.
function callable(fn, disabled) {
  return typeof fn === 'function' && !disabled ? fn : null;
}

// Turns a raw declaration into the resolved shape everything below reads.
// `mode` is the *effective* geometry: a declaration whose actions are all
// unavailable collapses to 'display', which is exactly the "answered quiz"
// state - the geometry the player sees and the geometry a gesture gets are
// then the same thing.
function resolve(declaration) {
  const value = declaration && typeof declaration === 'object' ? declaration : {};
  const problems = validateARInteraction(value);
  if (problems.length > 0 && typeof console !== 'undefined') {
    problems.forEach((problem) => console.warn(`[ar-interaction] contract violation: ${problem}`));
  }
  const declaredMode = ALLOWED_KEYS[value.mode] ? value.mode : DISPLAY;
  const surfaceId = typeof value.surfaceId === 'string' ? value.surfaceId : null;
  const disabled = value.disabled === true;

  let left = null;
  let right = null;
  if (declaredMode === DUAL) {
    left = callable(value.left, disabled);
    right = callable(value.right, disabled);
  } else if (declaredMode === SINGLE) {
    // One action is the RIGHT gesture. A 'single' screen has no LEFT at all.
    right = callable(value.action, disabled);
  }

  return { mode: left || right ? declaredMode : DISPLAY, declaredMode, surfaceId, left, right };
}

function readActive() {
  const resolved = active ? resolve(active.read()) : EMPTY;
  const next = signatureOf(resolved, active !== null);
  if (!signatureKnown) {
    // First read after a registration change, which already moved the
    // counter - record what it settled on rather than moving it twice.
    signature = next;
    signatureKnown = true;
  } else if (next !== signature) {
    signature = next;
    revision += 1;
  }
  return resolved;
}

// Makes `read()`'s declaration the active screen's contract, replacing
// whatever was active before, and returns a token the caller keeps.
//
// `read` is a getter rather than a value on purpose: the screen re-renders
// (a quiz gets answered, a CTA becomes disabled) without re-registering, and
// every read below picks up the current handlers. That is also why a stale
// screen can never keep answering - see `releaseARInteraction`.
export function registerARInteraction(read) {
  if (typeof read !== 'function') throw new TypeError('registerARInteraction(read): read must be a function');
  tokenSeq += 1;
  const token = { id: tokenSeq };
  active = { token, read };
  revision += 1;
  signatureKnown = false;
  return token;
}

// Drops the registration this token owns. Releasing a token that is no
// longer the active one does nothing and returns false - so when React mounts
// the next screen before unmounting the previous one, the newcomer's contract
// survives and the outgoing screen still cannot leave its handlers behind.
export function releaseARInteraction(token) {
  if (!token || !active || active.token !== token) return false;
  active = null;
  revision += 1;
  signatureKnown = false;
  return true;
}

// The readable snapshot for tests and for a future Gesture Bridge. It is
// data only: no React handler is ever exposed or logged from here, and there
// is no player-facing debug UI anywhere in this module.
export function getCurrentARInteraction() {
  const resolved = readActive();
  return {
    // Whether any screen is registered at all. "Nothing is mounted" and "a
    // display-only screen is mounted" both offer a gesture nothing to do, but
    // they are different facts, and a Bridge has to be able to say which one
    // it is rejecting on (see ./gestureBridge.js).
    active: active !== null,
    mode: resolved.mode,
    // The geometry the screen *declared*, before availability was applied.
    // `mode` collapses to 'display' when every action is currently
    // unavailable, so this is what separates "this screen has no LEFT at all"
    // from "this screen's LEFT exists but is disabled right now".
    declaredMode: resolved.declaredMode,
    leftAvailable: resolved.left !== null,
    rightAvailable: resolved.right !== null,
    surfaceId: resolved.surfaceId,
    revision,
  };
}

// Maps a gesture to the active screen's semantic action and runs it,
// returning whether anything ran - `false` for display-only screens, for LEFT
// on a 'single' screen, and for anything the screen currently has disabled.
// The Gesture Bridge calls the result-carrying form below; this stays the
// plain boolean entry point.
export function performARInteraction(gesture) {
  return performARInteractionWithResult(gesture).performed;
}

// The same dispatch, with the action's own return value kept instead of
// discarded. A screen's handler is allowed to be `async` (several of them
// await a store write before navigating), and a caller that drops the
// returned promise turns a rejected handler into an unhandled rejection and
// has no way to tell that the action failed at all. The Gesture Bridge uses
// this form and owns the promise; `performARInteraction` stays the plain
// boolean call the contract has always had.
//
// `performed` answers only "did an action run" - it is `false` for a
// display-only screen, for LEFT on a 'single' screen, and for anything the
// screen currently has disabled. It says nothing about whether the action
// succeeded; that is what `result` is for.
export function performARInteractionWithResult(gesture) {
  const resolved = readActive();
  const action = gesture === LEFT ? resolved.left : gesture === RIGHT ? resolved.right : null;
  if (!action) return { performed: false, result: undefined };
  return { performed: true, result: action() };
}

// Teardown for tests (and for a Bridge shutting down). Not used by the app.
export function resetARInteractionContract() {
  active = null;
  revision = 0;
  tokenSeq = 0;
  signature = null;
  signatureKnown = false;
}
