// The second way a real 佐臻 (Jorjin) gesture reaches the page: as a key.
//
// The ToF module carries its own gesture engine. JJSDK switches it on during
// its connection handshake (`settofpwr 1`, `settofmode 1`, `settofconf 0` -
// the SDK's command table is obfuscated; see android/CLAUDE.md), and when
// that engine recognises a swipe it does not report through the depth frames
// android/.../TofGestureRecognizer.java reads. It reports the way the
// vendor's own gesture app (android/J-Reality-Gesture_v0.9.5.apk) relies on:
// the glasses enumerate as a USB keyboard and the module presses Left Arrow
// or Right Arrow. Android routes that press to the focused window - the
// WebView that fills the screen, which WebLayerController gives focus - and
// it arrives here as an ordinary `keydown` whose key is 'ArrowLeft' or
// 'ArrowRight'.
//
//   ToF module's own engine -> USB HID Left / Right Arrow
//          -> Android key dispatch -> the WebView -> window 'keydown'
//          -> THIS FILE -> canonical AR_GESTURES.LEFT / AR_GESTURES.RIGHT
//
// The vendor app on the same glasses, phone and lighting swipes reliably; the
// app's own depth-frame recogniser did not. The difference was never the
// sensor. It was that this channel had nobody listening on it.
//
// ONLY INSIDE THE GLASSES APP. A desktop or phone browser has a real
// keyboard, and there an arrow key is a person pressing a key, not a hand in
// front of the glasses. Outside the Android shell this file answers nothing
// at all, so "the tutorial cannot be passed with a keyboard" stays true
// everywhere a keyboard exists. The shell announces itself by publishing
// `window.__cibarShell` (android/.../ShellBridgeScript.java) and
// `window.__jorjinGestureBridge` (GestureBridgeScript.java); either is enough.
// Both are read when the key arrives rather than when a listener is
// installed, because Android publishes them after the page has loaded.
//
// THE MODULE'S OTHER GESTURES. The engine also recognises UP, DOWN and PUSH,
// and the vendor app's default key map has it press ArrowUp, ArrowDown and
// Enter for them. None of them is a word CIBAR speaks, and left alone they
// would scroll the page or press whatever happens to hold focus - so inside
// the shell they are swallowed here and go nowhere. (PULL presses Back in
// that key map. Back is handled by Android before the page sees it; it is
// the glasses' own back button too, and is deliberately not touched.)
//
// What this file is not: a recogniser, a simulator, or a second vocabulary.
// It reads which key the module pressed and translates it once, at the edge.
// It never synthesises an event, never touches the DOM and never decides
// what a gesture does - see ./jorjinGestureAdapter.js for how its readings
// join the native stream, and ../gestureBridge.js for everything after.
import { AR_GESTURES } from '../interactionContract';

// The DOM event the module's key presses arrive as. Named once, here.
export const GLASSES_KEY_EVENT = 'keydown';

// Echoed on every gesture read off a key, as `source`, for the diagnostic
// log line and for telemetry. Nothing branches on it.
export const GLASSES_KEY_SOURCE = 'jorjin-tof-key';

// The whole mapping: the two keys the module presses for LEFT and RIGHT.
const KEY_GESTURES = Object.freeze({
  ArrowLeft: AR_GESTURES.LEFT,
  ArrowRight: AR_GESTURES.RIGHT,
});

// Keys the module can press for gestures CIBAR does not speak.
const SWALLOWED_KEYS = Object.freeze(['ArrowUp', 'ArrowDown', 'Enter']);

// The two globals Android publishes into the page, by name.
const SHELL_MARKERS = Object.freeze(['__cibarShell', '__jorjinGestureBridge']);

function defaultScope() {
  return typeof globalThis === 'undefined' ? null : globalThis.window ?? null;
}

// Whether this page is running inside the glasses app.
export function isInsideGlassesShell(scope = defaultScope()) {
  if (!scope || (typeof scope !== 'object' && typeof scope !== 'function')) return false;
  return SHELL_MARKERS.some((name) => Boolean(scope[name]));
}

// A key typed into a text field is typing. The staff setup screen has fields,
// and a software keyboard's arrow keys must keep moving the caret. Read off
// the event's own target - this is not a DOM lookup.
function isTyping(event) {
  const target = event?.target;
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

// What one key event means here:
//
//   null                       not ours: outside the glasses app, typing in a
//                              field, or a key the module never presses. The
//                              event is left exactly as it was.
//   { gesture: null }          the module's key for something CIBAR does not
//                              speak, or an auto-repeat of a gesture key. The
//                              caller swallows it (preventDefault) and
//                              delivers nothing.
//   { gesture: LEFT | RIGHT }  a gesture. The caller swallows the key - an
//                              arrow left to the browser scrolls the page -
//                              and delivers the gesture.
export function readGlassesKeyEvent(event, scope = defaultScope()) {
  if (!event || typeof event.key !== 'string') return null;
  if (!isInsideGlassesShell(scope)) return null;
  if (isTyping(event)) return null;

  const gesture = KEY_GESTURES[event.key];
  if (gesture) return Object.freeze({ gesture: event.repeat ? null : gesture });
  if (SWALLOWED_KEYS.includes(event.key)) return Object.freeze({ gesture: null });
  return null;
}

// Keeps a key the module pressed away from the browser's own handling: an
// arrow would scroll the page, Enter would press whatever holds focus. The
// one place the gesture layer cancels anything, and what it cancels is only
// ever a key event `readGlassesKeyEvent` claimed - never a tap, a click or a
// pointer, so a finger keeps every path it had
// (scripts/gesture-never-replaces-pointer.test.mjs).
export function swallowGlassesKey(event) {
  if (event && typeof event.preventDefault === 'function') event.preventDefault();
}
