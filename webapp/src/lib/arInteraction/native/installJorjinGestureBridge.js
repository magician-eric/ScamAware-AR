// The production native binding: the one place where a real 佐臻 (Jorjin)
// gesture becomes a call into the AR Interaction Contract.
//
// Everything either side of it already existed; what was missing was this
// single wire between them:
//
//   佐臻 ToF module (Android)
//          |  'LEFT' / 'RIGHT' / 'PUSH' / ...
//          v
//   GestureBridgeScript (Android)
//          |  window CustomEvent 'jorjinGesture'
//          v
//   ./jorjinGestureAdapter.js            <- the vendor's dialect stops here
//          |  canonical LEFT / RIGHT + eventId + source
//          v
//   THIS FILE                            <- the wire
//          |  dispatchARGesture({ gesture, eventId, source, expectedRevision })
//          v
//   ../gestureBridge.js                  <- duplicate / stale / busy guards
//          |
//          v
//   ../interactionContract.js            <- what THIS screen allows
//          |
//          v
//   the screen's own semantic action
//
// The responsibility here is exactly one line long: subscribe to the native
// stream, and dispatch what it delivers. What that deliberately excludes,
// because every one of these would be a second place that decides what a
// gesture means:
//
// - no scenario. There is no scenario name, story step or outcome in this
//   file, and no screen is special-cased to make a gesture work on it.
// - no route. No pathname, no router, no `startsWith('/...')`. *Where* the
//   binding is installed (and where it is deliberately not - the gesture
//   tutorial runs its own state machine on the same events) is the mounting
//   site's decision: see ../../../components/native/NativeGestureBridge.jsx.
// - no DOM. Nothing is queried, no element is clicked, no pointer event is
//   synthesised. An action is the screen's own React handler, reached through
//   the contract.
// - no recognition, no timer, no debounce, no cooldown. Android has already
//   decided a gesture happened; the Bridge already decides whether one event
//   runs one action.
// - no rules of its own. LEFT-is-the-left-action, RIGHT-is-the-only-action on
//   a single-action screen, and gestures-do-nothing on a display screen all
//   live in the contract, and this file cannot reach past it to a handler.
import { dispatchARGesture, getARGestureSnapshot } from '../gestureBridge';
import { isARGestureDiagnosticsEnabled } from '../debug/gestureDebugFlag';
import { subscribeNativeGestures } from './jorjinGestureAdapter';

// One line per delivery, for a device that is in the operator's hand and a
// gesture that visibly did nothing. It answers "which layer stopped it" -
// which is the only question worth asking when the glasses' own overlay says
// RIGHT and the story does not move.
//
//   [JorjinGesture] native=RIGHT eventId=jorjin-tof:23 revision=105 surface=scenario01/feed accepted=true reason=null
//   [JorjinGesture] native=LEFT  eventId=jorjin-tof:24 revision=105 surface=scenario01/feed accepted=false reason=direction-unavailable
//
// `reason` is the Bridge's own rejection code, unchanged and not reworded, so
// a line reads back against ../gestureBridge.js: `no-active-interaction` (the
// screen declares no contract - /ar-scan, an entry screen), `duplicate-event`
// (this delivery already ran), `stale-interaction` (the screen changed under
// the event), `busy` (an action is still running), `direction-unavailable`
// (by design: LEFT on a one-action screen, either gesture on a display one),
// `disabled` (the side exists but is switched off right now).
//
// It is console output and nothing else. There is no player-facing text here,
// no overlay, no toast, no DOM: see the DEV overlay in
// ../../../components/debug/ for the one piece of gesture UI that exists, and
// note that it too renders nothing in a production build.
export const NATIVE_GESTURE_LOG_PREFIX = '[JorjinGesture]';

export function formatNativeGestureDispatch(result) {
  return [
    NATIVE_GESTURE_LOG_PREFIX,
    `native=${typeof result?.gesture === 'string' ? result.gesture.toUpperCase() : 'NONE'}`,
    `eventId=${result?.eventId ?? 'null'}`,
    `revision=${result?.revision ?? 'null'}`,
    `surface=${result?.surfaceId ?? 'none'}`,
    `accepted=${result?.accepted === true}`,
    `reason=${result?.reason ?? 'null'}`,
  ].join(' ');
}

// Installs the binding and returns a stop function.
//
//   const stop = installJorjinGestureBridge();
//
// Options exist for the mounting site and for tests, not for behaviour:
// `target` is the event source (defaults to `window`), `diagnostics` forces
// the log line on or off, and `onDispatch` receives every dispatch result for
// telemetry. None of them can change what a gesture does - the only call this
// file makes into the app is `dispatchARGesture`, and every guard and every
// availability rule lives beyond it.
export function installJorjinGestureBridge(options = {}) {
  const { target, diagnostics = null, onDispatch = null } = options;
  if (onDispatch !== null && typeof onDispatch !== 'function') {
    throw new TypeError('installJorjinGestureBridge({ onDispatch }): onDispatch must be a function');
  }

  return subscribeNativeGestures(({ gesture, eventId, source }) => {
    // The revision is read here, at the moment the native event arrives, and
    // handed to the Bridge as `expectedRevision`. That is what makes one wave
    // belong to the screen it was made on: if this delivery's own action
    // navigates and the app is somewhere else by the time a repeat of it
    // lands, the Bridge sees a revision that has moved and drops it instead
    // of re-aiming it at whatever is on screen now.
    const { revision } = getARGestureSnapshot();
    const result = dispatchARGesture({ gesture, eventId, source, expectedRevision: revision });

    // Asked per delivery rather than once at install time. The binding is
    // installed when the app starts and stays installed, so a switch read at
    // install time could never be turned on afterwards - and turning it on
    // afterwards, on a device with an already-built APK in it, is the whole
    // point of the runtime one (see ../debug/gestureDebugFlag.js).
    const logging = diagnostics === null ? isARGestureDiagnosticsEnabled() : diagnostics === true;
    if (logging && typeof console !== 'undefined') console.info(formatNativeGestureDispatch(result));
    if (onDispatch !== null) {
      try {
        onDispatch(result);
      } catch (error) {
        // A telemetry sink that throws is a bug in that sink. The gesture was
        // already decided and must not be turned into a failure by it.
        if (typeof console !== 'undefined') console.error(`${NATIVE_GESTURE_LOG_PREFIX} onDispatch threw`, error);
      }
    }
  }, { target });
}
