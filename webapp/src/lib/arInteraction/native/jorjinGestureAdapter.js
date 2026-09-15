// The real Gesture Input Adapter: 佐臻 (Jorjin) AR glasses -> canonical
// LEFT / RIGHT.
//
// This is the production counterpart of ../debug/keyboardGestureAdapter.js,
// and it sits in exactly the same place in the layering:
//
//   JJSDK ToF module (Android)          <- recognises the hand
//          |  'LEFT' / 'RIGHT' / 'PUSH' / 'HALT' / ...
//          v
//   GestureBridgeScript (Android)       <- android/.../GestureBridgeScript.java
//          |  window CustomEvent 'jorjinGesture', detail.gesture = the code
//          v
//   THIS FILE                           <- the dialect stops here
//          |  canonical AR_GESTURES.LEFT / AR_GESTURES.RIGHT
//          v
//   a consumer: the Gesture Bridge, or a screen that owns its own state
//               machine (pages/gestureTutorial/)
//
// What it does: reads one already-recognised gesture code off the event the
// Android WebView dispatched, and answers with the canonical word for it -
// or with nothing at all. That is the whole job.
//
// What it must never become:
//
// - a recogniser. There is no camera here, no frame, no hand, no SDK, no
//   depth sensor reading. Android has already decided a gesture happened;
//   this file only reads which one.
// - a second vocabulary. `AR_GESTURES` is imported, never redefined. The
//   uppercase codes below are the *vendor's* words, translated once, at the
//   edge, so that nothing downstream ever has to know they existed.
// - a simulator. There is no keyboard binding, no pointer/touch/click
//   handler, no timer that produces a gesture on its own. The only thing
//   that can make this module report a gesture is a real `jorjinGesture`
//   event.
//
// Deliberately narrow vocabulary: the ToF module also emits UP, DOWN, PULL,
// PUSH, HALT, PRESENCE and SELECT (see android/README.md). Every one of them
// is dropped here without a listener ever hearing about it - CIBAR's whole
// interaction vocabulary is two words, and a third one entering the app
// through the adapter would be a third one to design against.
import { AR_GESTURES } from '../interactionContract';

// The single global event the Android WebView dispatches. One name, spelled
// once, so a consumer never has to know it.
export const JORJIN_GESTURE_EVENT = 'jorjinGesture';

// Echoed on every reported gesture as `source`, for the debug overlay and for
// telemetry. Nothing branches on it.
export const NATIVE_GESTURE_SOURCE = 'jorjin-tof';

// The vendor's codes, and the only two of them CIBAR speaks.
const CANONICAL_BY_CODE = Object.freeze({
  LEFT: AR_GESTURES.LEFT,
  RIGHT: AR_GESTURES.RIGHT,
});

// One vendor code -> one canonical gesture, or null for "not a word we
// speak". Case and surrounding whitespace are forgiving because they are a
// transport detail; a code that is not LEFT or RIGHT is not.
export function toCanonicalGesture(code) {
  if (typeof code !== 'string') return null;
  return CANONICAL_BY_CODE[code.trim().toUpperCase()] ?? null;
}

const number = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

// Reads one `jorjinGesture` event into the shape a consumer sees, or null
// when the event carries no gesture this app acts on.
//
// `eventId` is the identity of the delivery. A consumer uses it to make one
// wave run one thing even if the same delivery reaches it twice (the bridge
// script is re-installed on every call, and a re-entering page can see a
// replay).
//
// It is built from BOTH numbers the bridge sends, and the second one is not
// decoration: `count` is the running total of accepted gestures, and
// `JorjinHardwareManager.start()` resets that counter to zero every time the
// activity comes back to the foreground or the tester hits 重新連接 - without
// reloading the WebView, which only pauses and resumes. A page that had
// already seen `count` 1..n would then treat the next n real waves as
// duplicates and sit there ignoring the player. `at` is
// `SystemClock.elapsedRealtime()`, which keeps climbing across those resets,
// so the pair stays unique through them while a genuine replay of the same
// delivery - same count, same timestamp - still collides and is dropped.
//
// A delivery carrying neither number yields a null id rather than a
// fabricated one: an id that is not the vendor's own would collide.
export function readNativeGestureEvent(event) {
  const detail = event?.detail;
  const gesture = toCanonicalGesture(detail?.gesture);
  if (gesture === null) return null;
  const count = number(detail.count);
  const at = number(detail.at);
  return Object.freeze({
    gesture,
    eventId: count === null && at === null ? null : `${NATIVE_GESTURE_SOURCE}:${count ?? '?'}@${at ?? '?'}`,
    count,
    at,
    source: NATIVE_GESTURE_SOURCE,
  });
}

function defaultTarget() {
  return typeof globalThis === 'undefined' ? null : globalThis.window ?? null;
}

// Subscribes to the real gesture stream and returns a stop function.
//
//   const stop = subscribeNativeGestures(({ gesture }) => { ... })
//
// The listener is called once per real LEFT / RIGHT delivery, with the
// canonical word. It is never called for any other code, and never called by
// anything but the event. Returns a no-op stop when there is nothing to
// listen on (a plain Node process, a build-time render), so a caller never
// has to branch on the environment.
export function subscribeNativeGestures(onGesture, options = {}) {
  if (typeof onGesture !== 'function') throw new TypeError('subscribeNativeGestures(onGesture): onGesture must be a function');
  const { target = defaultTarget() } = options;
  if (!target || typeof target.addEventListener !== 'function') return () => {};

  const handler = (event) => {
    const gesture = readNativeGestureEvent(event);
    if (gesture !== null) onGesture(gesture);
  };

  target.addEventListener(JORJIN_GESTURE_EVENT, handler);
  return () => target.removeEventListener(JORJIN_GESTURE_EVENT, handler);
}
