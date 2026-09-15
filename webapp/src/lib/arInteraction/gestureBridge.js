// AR Gesture Bridge - Phase 3.
//
// THE BRIDGE DOES NOT RECOGNISE GESTURES. It never opens a camera, never
// loads an SDK, never looks at a hand, never sees a frame. It consumes a
// semantic LEFT or RIGHT that something upstream has *already* decided
// happened, and it turns that one decision into at most one call into the AR
// Interaction Contract (./interactionContract.js).
//
//   Gesture Recognizer (future: 佐臻 / camera / SDK)
//            |  semantic LEFT / RIGHT
//            v
//   Gesture Input Adapter (future phase; the DEV keyboard adapter in
//            |             ./debug/keyboardGestureAdapter.js is its stand-in)
//            v
//   Gesture Bridge                <- this file
//            |
//            v
//   AR Interaction Contract       <- Phase 1
//            |
//            v
//   Scenario semantic action      <- Phase 2
//
// Layers are not crossed. This module knows nothing about any scenario:
// there is no route, no pathname, no surfaceId comparison, no `switch`, no
// special case for a screen. It knows two words, LEFT and RIGHT, and it asks
// the contract - the single source of truth for what the screen that is on
// right now allows - whether that direction is available. It holds no copy
// of the current surface, mode or revision, and it never reaches past the
// contract to a handler.
//
// What this module adds on top of `performARInteraction`, and the whole
// reason it exists:
//
//   1. An observable result. A rejected gesture is normal (LEFT on a
//      'single' screen is a designed no-op, not an error), so nothing here
//      throws for it; the caller gets a reason code instead.
//   2. One event runs one action. Recognition delivers a wave on many
//      frames; a Bridge that ran them all would answer a quiz twice. Each
//      dispatch carries an `eventId`, and a repeated `eventId` is rejected
//      without the handler ever being called again.
//   3. Staleness. A gesture recognised on the screen the player was looking
//      at must not land on the screen that replaced it. An adapter passes
//      the `revision` it saw, and a changed revision rejects the event.
//
// What it deliberately does NOT do: there is no cooldown, no debounce, no
// throttle and no timer anywhere in this file. The frame rate, hold
// duration and callback pattern of the real recogniser are not known yet,
// and inventing a time window now would be inventing it against nothing.
// Time-based stabilisation belongs to the Gesture Input Adapter of a later
// phase; identity-based protection belongs here.
import {
  AR_GESTURES,
  AR_INTERACTION_MODES,
  getCurrentARInteraction,
  performARInteractionWithResult,
} from './interactionContract';

// The canonical vocabulary is the contract's own - re-exported, not
// redefined. There is exactly one set of gesture words in this codebase, and
// `AR_GESTURES.LEFT` / `AR_GESTURES.RIGHT` are it. `AR_GESTURE` is an alias
// of the same frozen object for callers that read better in the singular.
//
// Nothing here accepts 'LEFT', 'Left', 'swipeLeft', 'gesture_left', 0 or 1.
// A source that speaks a different dialect - a native bridge, an SDK
// callback - is converted to these two words by *its own* adapter before it
// reaches this module, so that the dialect lives at the edge and never
// becomes a second vocabulary in the core.
export { AR_GESTURES };
export const AR_GESTURE = AR_GESTURES;

const { LEFT, RIGHT } = AR_GESTURES;
const { DISPLAY, SINGLE, DUAL } = AR_INTERACTION_MODES;

// Every way a dispatch can end without the screen's action running. All of
// these are ordinary outcomes reported through the return value; none of
// them throws.
export const AR_GESTURE_REJECTIONS = Object.freeze({
  // The word was not LEFT or RIGHT.
  INVALID_GESTURE: 'invalid-gesture',
  // No screen is registered with the contract at all.
  NO_ACTIVE_INTERACTION: 'no-active-interaction',
  // The active screen has no action on that side by design: any gesture on a
  // 'display' screen, LEFT on a 'single' screen.
  DIRECTION_UNAVAILABLE: 'direction-unavailable',
  // The active screen does declare that side, but has it switched off right
  // now (a sent request, a locked quiz option, a CTA the screen greys out).
  DISABLED: 'disabled',
  // This exact event was dispatched before. The action does not run again.
  DUPLICATE_EVENT: 'duplicate-event',
  // The contract moved on between recognition and dispatch: the event was
  // recognised against a revision that is no longer current.
  STALE_INTERACTION: 'stale-interaction',
  // A dispatch is still running (a handler that navigates, or an async
  // handler that has not settled). Not a cooldown - it is held open by the
  // action itself and released the moment that action finishes.
  BUSY: 'busy',
});

// The outcome of an accepted dispatch, once its action has finished. An
// action that throws (or a promise that rejects) is reported, never
// swallowed and never left as an unhandled rejection.
export const AR_GESTURE_OUTCOMES = Object.freeze({
  OK: 'ok',
  ACTION_ERROR: 'action-error',
});

// Bridge-owned dispatch state. Note what is *not* here: no surfaceId, no
// mode, no revision, no handler. Those live in the contract and are read
// fresh on every dispatch, because a second copy of them is exactly how a
// gesture ends up answering the screen before last.
const SEEN_LIMIT = 512;
const seenIds = new Set();
const seenOrder = [];
const listeners = new Set();
let pending = false;
let autoEventSeq = 0;

function remember(eventId) {
  seenIds.add(eventId);
  seenOrder.push(eventId);
  // A run is long and every recognised wave adds an id; the set is bounded so
  // it cannot grow without limit. 512 events is far past any plausible
  // in-flight duplicate window, and an id that falls out is an id no
  // recogniser could still be repeating.
  while (seenOrder.length > SEEN_LIMIT) seenIds.delete(seenOrder.shift());
}

function emit(event) {
  // A listener that throws is a bug in that listener, not in the dispatch
  // that was already decided. It must not turn into a failed gesture.
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      if (typeof console !== 'undefined') console.error('[ar-gesture] dispatch listener threw', error);
    }
  });
}

// Read-only view of what a gesture would be aimed at right now. Derived from
// `getCurrentARInteraction()` on every call - this is a projection of the
// contract, not a cache of it, so it cannot drift from what a dispatch will
// actually see a moment later.
//
// A future Native Adapter reads this to know which revision it is
// recognising against, and the DEV debug overlay reads it to display state.
// Neither is allowed to reach past it to a handler.
export function getARGestureSnapshot() {
  const snapshot = getCurrentARInteraction();
  return {
    active: snapshot.active,
    surfaceId: snapshot.surfaceId,
    mode: snapshot.mode,
    declaredMode: snapshot.declaredMode,
    revision: snapshot.revision,
    leftAvailable: snapshot.leftAvailable,
    rightAvailable: snapshot.rightAvailable,
    // True while an accepted dispatch's action is still running.
    busy: pending,
  };
}

// Subscribe to dispatch events, for the DEV debug overlay and for telemetry.
// Every dispatch emits once with `phase: 'dispatched'`; an accepted one emits
// again with `phase: 'settled'` when its action finishes. Listeners observe;
// they cannot veto, redirect or re-enter a dispatch.
export function subscribeARGestureDispatch(listener) {
  if (typeof listener !== 'function') throw new TypeError('subscribeARGestureDispatch(listener): listener must be a function');
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isCanonicalGesture(gesture) {
  return gesture === LEFT || gesture === RIGHT;
}

// Why a direction that is not available right now is not available. The
// distinction the contract already draws is between the geometry a screen
// *declared* and what is *callable* on it at this instant, and that is
// exactly the line between "there is no such action here" and "that action
// is switched off right now".
function unavailableReason(snapshot, gesture) {
  const { DIRECTION_UNAVAILABLE, DISABLED } = AR_GESTURE_REJECTIONS;
  if (snapshot.declaredMode === DISPLAY) return DIRECTION_UNAVAILABLE;
  if (snapshot.declaredMode === SINGLE && gesture === LEFT) return DIRECTION_UNAVAILABLE;
  if (snapshot.declaredMode === SINGLE || snapshot.declaredMode === DUAL) return DISABLED;
  return DIRECTION_UNAVAILABLE;
}

function result(base, extra) {
  return Object.freeze({ ...base, ...extra });
}

// Normalises the two accepted envelope shapes into one request. The envelope
// may be a bare canonical gesture (`dispatchARGesture('left')`) or a request
// object; the *gesture vocabulary* is singular either way, which is the rule
// that matters. Everything else on the request is optional metadata.
function toRequest(input) {
  const value = typeof input === 'string' ? { gesture: input } : (input && typeof input === 'object' ? input : {});
  return {
    gesture: value.gesture,
    eventId: typeof value.eventId === 'string' && value.eventId !== '' ? value.eventId : null,
    expectedRevision: typeof value.expectedRevision === 'number' ? value.expectedRevision : null,
    // Debug/telemetry only. It is echoed back and handed to listeners, and it
    // is read nowhere else in this file: there is no branch anywhere on
    // `source`, so a native event and a keyboard event travel the identical
    // path through the identical guards.
    source: typeof value.source === 'string' && value.source !== '' ? value.source : null,
  };
}

// Dispatch one already-recognised semantic gesture at the screen that is on
// right now.
//
//   dispatchARGesture('right')
//   dispatchARGesture({ gesture: 'right', eventId: 'evt-123', expectedRevision: 100, source: 'native' })
//
// Returns a frozen result. `accepted` is whether the screen's action ran;
// `reason` says why not when it did not. An accepted result also carries
// `completion`, a promise that always resolves (never rejects) to the
// action's outcome - synchronous actions resolve it immediately, async ones
// when they settle.
//
// `eventId` is what makes one wave run one action: dispatching the same id
// twice runs the handler once. It is optional, and omitting it opts that
// protection out - a call with no id gets a fresh generated one and can
// never collide - so every real adapter supplies the id its recogniser gave
// the event. `expectedRevision` is the contract revision the event was
// recognised against; if the contract has moved on, the event is stale and
// is dropped rather than landing on whatever screen is there now.
export function dispatchARGesture(input) {
  const request = toRequest(input);
  const snapshot = getARGestureSnapshot();
  const base = {
    gesture: isCanonicalGesture(request.gesture) ? request.gesture : null,
    eventId: request.eventId,
    source: request.source,
    surfaceId: snapshot.surfaceId,
    mode: snapshot.mode,
    revision: snapshot.revision,
  };

  const reject = (reason) => {
    const rejected = result(base, { accepted: false, reason, completion: null });
    emit({ phase: 'dispatched', ...rejected });
    return rejected;
  };

  if (!isCanonicalGesture(request.gesture)) return reject(AR_GESTURE_REJECTIONS.INVALID_GESTURE);

  // An event that was already dispatched is checked before anything else it
  // could do: a repeat must not run an action even if the screen would allow
  // it now, and must not consume the id a second time either.
  if (request.eventId !== null && seenIds.has(request.eventId)) {
    return reject(AR_GESTURE_REJECTIONS.DUPLICATE_EVENT);
  }

  // Re-entrancy and in-flight actions. A handler that navigates does its work
  // synchronously inside `performARInteractionWithResult`, so a gesture that
  // arrives during it - a duplicate frame the recogniser had already queued,
  // or a genuinely new wave landing mid-transition - would otherwise be
  // resolved against a half-changed screen. Held open by the action itself,
  // released when it finishes; no timer is involved.
  if (pending) return reject(AR_GESTURE_REJECTIONS.BUSY);

  // The event was recognised against a screen. If that is not the screen that
  // is on now, the event belongs to the past and is dropped - it must never
  // be re-aimed at the screen that replaced it.
  if (request.expectedRevision !== null && request.expectedRevision !== snapshot.revision) {
    return reject(AR_GESTURE_REJECTIONS.STALE_INTERACTION);
  }

  if (!snapshot.active) return reject(AR_GESTURE_REJECTIONS.NO_ACTIVE_INTERACTION);

  const available = request.gesture === LEFT ? snapshot.leftAvailable : snapshot.rightAvailable;
  if (!available) return reject(unavailableReason(snapshot, request.gesture));

  // The id is consumed at the moment the event is accepted, before the action
  // runs: a handler that navigates can bring the same event back round
  // through a re-render, and it has to find the id already spent.
  const eventId = request.eventId ?? `auto:${(autoEventSeq += 1)}`;
  remember(eventId);

  let settle;
  const completion = new Promise((resolve) => { settle = resolve; });
  const accepted = result(base, { eventId, accepted: true, reason: null, completion });
  const finish = (outcome) => {
    pending = false;
    emit({ phase: 'settled', ...accepted, outcome });
    settle(outcome);
  };

  // Marked in flight, then announced, then run - in that order, so a listener
  // that dispatches from inside the announcement is answered with `busy`
  // rather than re-entering the action.
  pending = true;
  emit({ phase: 'dispatched', ...accepted });

  let performed;
  try {
    // The one call into the contract. Availability was read from the
    // contract's own snapshot and the action is run through the contract's
    // own entry point - the Bridge never holds a handler, so it cannot
    // bypass an availability rule even by accident.
    performed = performARInteractionWithResult(request.gesture);
  } catch (error) {
    finish({ status: AR_GESTURE_OUTCOMES.ACTION_ERROR, error });
    return accepted;
  }

  if (performed.result && typeof performed.result.then === 'function') {
    // An async handler. The promise is owned here so a rejected action is
    // reported instead of becoming an unhandled rejection - and is not
    // swallowed either: it is delivered through `completion` and to every
    // listener, with the error itself intact.
    performed.result.then(
      () => finish({ status: AR_GESTURE_OUTCOMES.OK, error: null }),
      (error) => finish({ status: AR_GESTURE_OUTCOMES.ACTION_ERROR, error }),
    );
  } else {
    finish({ status: AR_GESTURE_OUTCOMES.OK, error: null });
  }

  return accepted;
}

// Teardown for tests and for an adapter shutting down. Clears only what this
// module owns; the contract's own registration is untouched.
export function resetARGestureBridge() {
  seenIds.clear();
  seenOrder.length = 0;
  listeners.clear();
  pending = false;
  autoEventSeq = 0;
}
