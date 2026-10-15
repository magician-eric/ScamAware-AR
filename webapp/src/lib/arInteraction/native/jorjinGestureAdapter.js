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
// - a simulator. There is no pointer/touch/click handler and no timer that
//   produces a gesture on its own. The only things that can make this module
//   report a gesture are a real `jorjinGesture` event and a real key press
//   from the glasses' ToF module, read by ./glassesKeyGestures.js - which
//   answers nothing outside the glasses app, so a keyboard on a desktop
//   browser still drives nothing.
//
// Deliberately narrow vocabulary: the ToF module also emits UP, DOWN, PULL,
// PUSH, HALT, PRESENCE and SELECT (see android/README.md). Every one of them
// is dropped here without a listener ever hearing about it - CIBAR's whole
// interaction vocabulary is two words, and a third one entering the app
// through the adapter would be a third one to design against.
//
// TWO CHANNELS, ONE STREAM. A real gesture reaches the page one of two ways:
//
//   1. 'jorjinGesture' - android/.../TofGestureRecognizer.java read the
//      swipe off the ToF depth frames and GestureBridgeScript delivered it.
//   2. a key - the ToF module's own gesture engine recognised the swipe and
//      pressed Left / Right Arrow (see ./glassesKeyGestures.js). This is the
//      channel the vendor's own app runs on, and the one that recognises
//      reliably on these glasses.
//
// Both read the same hand on the same sensor, so one swipe can arrive twice.
// `subscribeNativeGestures` merges them and keeps it at one:
//
//   - a delivery on one channel within CROSS_CHANNEL_WINDOW_MS of one on the
//     other is the same swipe - or the arm coming back after it - and is
//     dropped, whichever way it points;
//   - the two run side by side only with a depth recogniser that knows about
//     the keys. From Shell 1.2.2 (`detail.recognizer` >= 2,
//     GestureBridgeScript.RECOGNIZER_GENERATION) the module's key presses lock
//     the depth recogniser natively, so it catches what the module misses
//     without echoing what it caught. An older Shell's recogniser does not, so
//     once the glasses have pressed a key its 'jorjinGesture' deliveries are no
//     longer passed on, as before.
//
// Setting DEPTH_ALONGSIDE_KEYS_FROM_RECOGNIZER to Infinity in an OTA bundle
// returns every Shell to keys-only, without a new APK.
//
// The decision is made once per event and shared by every subscriber on the
// same window, so the tutorial and the Bridge can never disagree about
// whether a swipe happened.
import { AR_GESTURES } from '../interactionContract';
import {
  GLASSES_KEY_EVENT,
  GLASSES_KEY_SOURCE,
  readGlassesKeyEvent,
  swallowGlassesKey,
} from './glassesKeyGestures';

// How close together a delivery on each channel has to be to count as one
// swipe. Both channels report at the end of the same movement; a second,
// genuine swipe cannot be made, finished and recognised inside this window.
// Raised from 800 when the depth recogniser began running alongside the keys:
// it reports when the hand has left, a few hundred milliseconds after the
// module's key for the same swipe.
export const CROSS_CHANNEL_WINDOW_MS = 1000;

// The lowest depth-recogniser generation whose deliveries are taken alongside
// the module's keys. See the comment at the top of the file.
export const DEPTH_ALONGSIDE_KEYS_FROM_RECOGNIZER = 2;

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

function defaultNow() {
  const clock = globalThis.performance;
  return clock && typeof clock.now === 'function' ? clock.now() : Date.now();
}

// One merged stream per window: its listeners, its subscribers, and the
// little it has to remember to keep one swipe at one delivery.
const streams = new WeakMap();

function streamFor(target, now) {
  let stream = streams.get(target);
  if (stream) return stream;

  stream = {
    subscribers: new Set(),
    listening: false,
    now,
    // Whether the glasses have pressed a gesture key since this page loaded.
    keysSeen: false,
    // The last delivery passed on: which channel, and when (stream clock).
    last: null,
    keySeq: 0,
  };

  const offer = (reading, fromKey, recognizer = null) => {
    const at = stream.now();
    if (!fromKey && stream.keysSeen && !(recognizer >= DEPTH_ALONGSIDE_KEYS_FROM_RECOGNIZER)) return;
    if (stream.last && stream.last.fromKey !== fromKey && at - stream.last.at < CROSS_CHANNEL_WINDOW_MS) return;
    stream.last = { fromKey, at };
    // A copy, so a subscriber that stops itself (or another) mid-delivery
    // does not change who hears this one.
    for (const subscriber of [...stream.subscribers]) {
      try {
        subscriber(reading);
      } catch (error) {
        // One consumer's bug must not take the gesture away from the others.
        if (typeof globalThis.reportError === 'function') globalThis.reportError(error);
        else if (typeof console !== 'undefined') console.error(error);
      }
    }
  };

  stream.onNative = (event) => {
    const reading = readNativeGestureEvent(event);
    if (reading !== null) offer(reading, false, number(event.detail.recognizer));
  };

  stream.onKey = (event) => {
    const reading = readGlassesKeyEvent(event, target);
    if (reading === null) return;
    swallowGlassesKey(event);
    if (reading.gesture === null) return;
    stream.keysSeen = true;
    stream.keySeq += 1;
    const at = Math.round(stream.now());
    offer(Object.freeze({
      gesture: reading.gesture,
      eventId: `${GLASSES_KEY_SOURCE}:${stream.keySeq}@${at}`,
      count: null,
      at,
      source: GLASSES_KEY_SOURCE,
    }), true);
  };

  streams.set(target, stream);
  return stream;
}

// Subscribes to the real gesture stream and returns a stop function.
//
//   const stop = subscribeNativeGestures(({ gesture }) => { ... })
//
// The listener is called once per real LEFT / RIGHT gesture, with the
// canonical word - whichever channel it came in on, and never twice for one
// swipe. It is never called for any other code, and never called by anything
// but a real event. Returns a no-op stop when there is nothing to listen on
// (a plain Node process, a build-time render), so a caller never has to
// branch on the environment.
//
// `now` is the clock the cross-channel window is measured on; tests pass one.
// It is read when the first subscription on a window creates that window's
// stream.
export function subscribeNativeGestures(onGesture, options = {}) {
  if (typeof onGesture !== 'function') throw new TypeError('subscribeNativeGestures(onGesture): onGesture must be a function');
  const { target = defaultTarget(), now = defaultNow } = options;
  if (!target || typeof target.addEventListener !== 'function') return () => {};

  const stream = streamFor(target, now);
  const subscriber = (reading) => onGesture(reading);
  stream.subscribers.add(subscriber);
  if (!stream.listening) {
    target.addEventListener(JORJIN_GESTURE_EVENT, stream.onNative);
    target.addEventListener(GLASSES_KEY_EVENT, stream.onKey);
    stream.listening = true;
  }

  return () => {
    if (!stream.subscribers.delete(subscriber)) return;
    if (stream.subscribers.size > 0 || !stream.listening) return;
    target.removeEventListener(JORJIN_GESTURE_EVENT, stream.onNative);
    target.removeEventListener(GLASSES_KEY_EVENT, stream.onKey);
    stream.listening = false;
  };
}

// Test teardown: forgets what a window's stream remembered - whether the
// glasses have pressed a key, and the last delivery - without touching its
// subscriptions.
export function resetNativeGestureStream(target = defaultTarget()) {
  const stream = target ? streams.get(target) : null;
  if (!stream) return;
  stream.keysSeen = false;
  stream.last = null;
  stream.keySeq = 0;
}
