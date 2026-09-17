// What the shared inactivity hint says, and when it is allowed to start
// counting. Pure functions over one contract snapshot: no React, no timers,
// no DOM, no route and no scenario. The component that uses these
// (components/hints/InteractionHint.jsx) owns the clock; this owns the rules.
import { AR_GESTURES } from './interactionContract';

// The one place this number is written down.
//
// Ten seconds, because several story screens carry a paragraph the player is
// meant to read before choosing, and a hint that arrives while they are still
// reading is an interruption rather than help.
export const INACTIVITY_HINT_DELAY_MS = 10000;

// Which hint a snapshot calls for, or null for "say nothing".
//
// There are three, and which one applies is decided by what is ACTUALLY
// callable right now - never by the declared geometry alone. A screen that
// declared two options but currently has only one of them live must point at
// the live one, or the hint sends the player waving at a control the screen
// has switched off.
export const INACTIVITY_HINTS = Object.freeze({
  // Both directions live: the player picks a side.
  DUAL: 'dual',
  // Only RIGHT: the one-action screen, and the two-action screen whose left
  // side is currently switched off.
  RIGHT: AR_GESTURES.RIGHT,
  // Only LEFT. Rarer, and exactly why this is derived rather than assumed:
  // turning a live LEFT into "swipe right" would be pointing at nothing.
  LEFT: AR_GESTURES.LEFT,
});

// Everything the spec lists as "do not start counting" reduces to this one
// question, because the contract already answers all of them:
//
//   options not on screen yet, every option disabled, the story auto-playing,
//   a choice already made and the screen mid-transition, a display-only
//   screen, a loading screen, a screen waiting to become operable
//                                       -> nothing is callable -> null
//   the gesture tutorial, and anything else that declares nothing at all
//                                       -> `active` is false     -> null
//   a video the player is meant to watch through
//                                       -> `presenting` is true  -> null
//
// So there is no list of screens here, no route matching and no DOM probing:
// a screen that is not ready is a screen with nothing callable on it, and that
// is the same fact a gesture would find.
export function inactivityHintFor(snapshot) {
  if (!snapshot || !snapshot.active) return null;
  // Playing something through is not idling. The action stays callable the
  // whole time - this only holds the clock.
  if (snapshot.presenting) return null;
  const { leftAvailable, rightAvailable } = snapshot;
  if (leftAvailable && rightAvailable) return INACTIVITY_HINTS.DUAL;
  if (rightAvailable) return INACTIVITY_HINTS.RIGHT;
  if (leftAvailable) return INACTIVITY_HINTS.LEFT;
  return null;
}

// The identity of "this chance to act", which is what the clock is keyed on.
//
// It is the contract's own revision counter, and deliberately nothing else.
// That counter moves when a screen is registered or released, and when the
// resolved geometry changes - and pointedly NOT when a re-render produces new
// handler closures for the same geometry. Keying on it therefore gives both
// halves of the rule for free: a new screen, a newly answered quiz or an
// option being switched off all restart the count, and an ordinary re-render
// does not, so the hint cannot be starved by a screen that renders often.
export function inactivityHintKey(snapshot) {
  return snapshot && snapshot.active ? snapshot.revision : null;
}
