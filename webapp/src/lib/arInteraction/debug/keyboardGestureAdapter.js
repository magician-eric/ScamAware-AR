// DEV-only keyboard Gesture Input Adapter.
//
// Phase 3 builds the Bridge before any recogniser exists, so it needs a way
// to feed the real Bridge a real LEFT or RIGHT by hand. This is that way, and
// it is deliberately shaped like the adapter that will replace it: a source
// decides a semantic gesture happened, stamps it with an event id and the
// contract revision it saw, and hands it to `dispatchARGesture`. Nothing
// else. When the 佐臻 adapter arrives it plugs in exactly here, and every
// guard below it is already built and tested.
//
//   ArrowLeft  -> LEFT
//   ArrowRight -> RIGHT
//
// What it must never become, and what makes it a genuine stand-in rather
// than a shortcut: it does not look up an element, does not call `.click()`,
// does not synthesise a pointer event and does not know a single scenario.
// A keypress goes keyboard -> Bridge -> contract -> the screen's own semantic
// handler, which is the identical path a hand wave will take. If this file
// cheated by clicking a button, it would prove nothing about the Bridge.
//
// It is started only behind ./gestureDebugFlag.js, so a production build
// never listens to the keyboard at all: a player pressing an arrow key
// advances nothing.
import { dispatchARGesture, getARGestureSnapshot } from '../gestureBridge';
import { AR_GESTURES } from '../interactionContract';
import { isARGestureDebugEnabled } from './gestureDebugFlag';

// The whole mapping. Two keys, two gestures, no third binding, no modifier
// combination and no key that means "tap".
const KEY_GESTURES = Object.freeze({
  ArrowLeft: AR_GESTURES.LEFT,
  ArrowRight: AR_GESTURES.RIGHT,
});

const SOURCE = 'keyboard-debug';

let eventSeq = 0;

// A keypress inside a text field is typing, not a gesture. Read off the
// event's own target - this is not a DOM lookup and nothing is selected,
// queried or clicked; it is the property the event already carries.
function isTyping(event) {
  const target = event?.target;
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = typeof target.tagName === 'string' ? target.tagName.toLowerCase() : '';
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

// Starts the adapter and returns a stop function. Returns a no-op stop when
// the debug flag is off or there is nothing to listen on, so a caller never
// has to branch on the flag itself.
export function startARGestureKeyboardAdapter(options = {}) {
  const {
    target = typeof globalThis === 'undefined' ? null : globalThis.window ?? null,
    enabled = isARGestureDebugEnabled(),
  } = options;

  if (!enabled || !target || typeof target.addEventListener !== 'function') return () => {};

  function onKeyDown(event) {
    const gesture = KEY_GESTURES[event?.key];
    if (!gesture) return;
    // Auto-repeat from a held key is one physical press, not a stream of
    // gestures. Dropped here rather than in the Bridge: the Bridge's job is
    // that one *event* runs one action, and deciding what counts as one
    // event is an adapter's job - which is exactly the division of labour a
    // real recogniser will need for hold duration and frame rate.
    if (event.repeat) return;
    if (isTyping(event)) return;

    // The revision the gesture was recognised against, read at the moment of
    // recognition. For a keypress that is the same instant as the dispatch,
    // so it can never be stale - but it is passed anyway, because this
    // adapter is the template for one whose recognition and dispatch are
    // separated by real latency.
    const { revision } = getARGestureSnapshot();
    eventSeq += 1;
    dispatchARGesture({
      gesture,
      eventId: `${SOURCE}:${eventSeq}`,
      expectedRevision: revision,
      source: SOURCE,
    });
  }

  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}

// Test teardown, so event ids are comparable between cases.
export function resetARGestureKeyboardAdapter() {
  eventSeq = 0;
}
