// The gesture tutorial's onboarding state machine.
//
//   WAIT_LEFT --LEFT--> WAIT_RIGHT --RIGHT--> COMPLETE
//
// This is deliberately NOT the AR Interaction Contract (see
// lib/arInteraction/interactionContract.js). That contract answers "which of
// the two things on this screen does a gesture pick?" - LEFT and RIGHT are
// *options* there, and a screen declaring `{ left, right }` is a screen with
// two choices on it.
//
// The tutorial has no choices. There is exactly one correct gesture at any
// moment and the other one is not a second option, it is the wrong answer:
// a RIGHT in WAIT_LEFT must do nothing at all, not "pick the other thing".
// Declaring this page to the contract would make LEFT and RIGHT mean the one
// thing they must not mean here, which is why the tutorial owns this instead.
//
// Pure functions over a plain string state: no timers, no storage, no React,
// no navigation. Every transition is caused by one already-recognised
// canonical gesture and nothing else - there is no `skip`, no `advance()` and
// no way to reach COMPLETE without having actually waved LEFT and then RIGHT.
import { AR_GESTURES } from '../../lib/arInteraction';

export const GESTURE_TUTORIAL_STATES = Object.freeze({
  WAIT_LEFT: 'WAIT_LEFT',
  WAIT_RIGHT: 'WAIT_RIGHT',
  COMPLETE: 'COMPLETE',
});

const { WAIT_LEFT, WAIT_RIGHT, COMPLETE } = GESTURE_TUTORIAL_STATES;

// Every entry into the tutorial starts here. The page holds the state in
// ordinary component state and nothing writes it to storage, so re-entering
// from /language always begins at WAIT_LEFT - a player cannot arrive at a
// tutorial that is already half done.
export const GESTURE_TUTORIAL_INITIAL_STATE = WAIT_LEFT;

// How many gestures the tutorial teaches - the number of progress dots.
export const GESTURE_TUTORIAL_STEP_COUNT = 2;

// The one gesture this state accepts. COMPLETE accepts nothing: the tutorial
// is over and a further wave must not do anything.
const EXPECTED_GESTURE = Object.freeze({
  [WAIT_LEFT]: AR_GESTURES.LEFT,
  [WAIT_RIGHT]: AR_GESTURES.RIGHT,
  [COMPLETE]: null,
});

export function expectedGesture(state) {
  return EXPECTED_GESTURE[state] ?? null;
}

// Whether this gesture does anything in this state. The wrong direction is an
// ordinary, designed no-op - not an error, and not something the screen
// reacts to at all.
export function acceptsGesture(state, gesture) {
  const expected = expectedGesture(state);
  return expected !== null && gesture === expected;
}

// The state after this gesture. An ignored gesture returns the state
// unchanged (the same string, so a `setState` with it is a no-op re-render at
// worst), which is what makes "RIGHT is ignored in WAIT_LEFT" a property of
// this function rather than of the screen that calls it.
export function nextTutorialState(state, gesture) {
  if (!acceptsGesture(state, gesture)) return state;
  return state === WAIT_LEFT ? WAIT_RIGHT : COMPLETE;
}

// How many of the two steps are behind the player, for the progress dots.
export function completedSteps(state) {
  if (state === COMPLETE) return GESTURE_TUTORIAL_STEP_COUNT;
  if (state === WAIT_RIGHT) return 1;
  return 0;
}
