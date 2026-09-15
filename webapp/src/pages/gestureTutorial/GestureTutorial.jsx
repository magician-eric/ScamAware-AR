import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStageClassName } from '../../shell/StageClassContext';
import { subscribeNativeGestures } from '../../lib/arInteraction/native/jorjinGestureAdapter';
import {
  GESTURE_TUTORIAL_INITIAL_STATE,
  GESTURE_TUTORIAL_STATES,
  GESTURE_TUTORIAL_STEP_COUNT,
  acceptsGesture,
  completedSteps,
  nextTutorialState,
} from './tutorialStateMachine';
import { getGestureTutorialStrings } from './i18n';
import { AR_GESTURES } from '../../lib/arInteraction';
import '../entryScreens.css';

// The language home's own Hero artwork, reused as-is - the same file
// pages/LanguageSelect.jsx and pages/ScenarioMenu.jsx render, not a copy of
// it and not a new one. It is a portrait piece with the CIB masthead top
// left, 刑事熊 and the patrol car top right, and an empty middle band; it is
// laid out with `object-fit: contain` and the tutorial's text sits inside
// that middle band (see .gesture-tutorial-content in ../entryScreens.css),
// so neither the mascot nor the masthead is ever cropped or covered.
const BACKGROUND_SRC = `${import.meta.env.BASE_URL}assets/shared/ui/scenario-menu-background.webp`;

// How long the completion line stays up before the player is taken to the
// scan screen. Spec: 0.8-1.2s, and there is no button to press - the tutorial
// is over the moment the second step lands.
//
// This timer moves the player between two screens; it never moves the state
// machine. Nothing in this file can reach COMPLETE except a real LEFT and
// then a real RIGHT, so the tutorial cannot time itself out into "finished".
export const GESTURE_TUTORIAL_COMPLETE_DELAY_MS = 1000;

const { COMPLETE } = GESTURE_TUTORIAL_STATES;
const { LEFT, RIGHT } = AR_GESTURES;

// The two steps, in the order the tutorial teaches them. `key` is the copy
// entry in ./i18n.js, `gesture` is the canonical word the step is completed
// with - by a wave on the glasses or by a tap/click on this side's panel,
// which are the same thing to everything below.
const STEPS = Object.freeze([
  { gesture: LEFT, key: 'left', arrow: '←' },
  { gesture: RIGHT, key: 'right', arrow: '→' },
]);

// The screen between language selection and the AR scan home (see
// routes.jsx): /language -> /gesture-tutorial -> /ar-scan. It runs once,
// after the language is chosen, and is not on the way back - a scenario that
// ends returns the player to /ar-scan and never passes through here again.
//
// TWO INPUTS, ONE STEP. The real input is unchanged and still the real thing:
// the 佐臻 ToF module's LEFT / RIGHT, delivered by the Android WebView's
// gesture bridge and turned into canonical words by
// lib/arInteraction/native/jorjinGestureAdapter.js. Alongside it, each step's
// own panel is a plain button, so the same step can be completed by touching
// it on a phone or clicking it on a desktop. Gesture is an additional input,
// never a replacement - the tutorial is the first screen in the run, and a
// device whose sensor is not there (a phone, a laptop) must not be stranded
// on it.
//
// Both inputs go through `advance()` and therefore through the identical
// state machine call: there is no touch-only path, no gesture-only path, and
// no second copy of the tutorial's rules. A tap on the LEFT panel is exactly
// what a LEFT wave is - `nextTutorialState(current, 'left')` - so the wrong
// side stays inert either way, a repeated input cannot skip a step, and one
// wave still advances exactly one step.
//
// What is deliberately NOT here: no "skip the tutorial" control, no "gestures
// unavailable" notice, no keyboard binding, no timer that finishes the
// tutorial, and nothing that reacts to SELECT / HALT / PUSH. A player leaves
// this page having actually completed the left step and then the right one,
// or does not leave it.
//
// It also does not declare itself to the AR Interaction Contract, on purpose
// - see ./tutorialStateMachine.js for why LEFT and RIGHT are steps here, not
// the two options that contract exists to describe.
export function GestureTutorial() {
  useStageClassName('gesture-tutorial-stage');
  const navigate = useNavigate();
  const t = getGestureTutorialStrings();

  // Ordinary component state, deliberately: mounting the page IS the reset.
  // Nothing about the tutorial is written to localStorage or to a store, so
  // every entry from /language starts at WAIT_LEFT with no way to inherit
  // where a previous player got to.
  const [state, setState] = useState(GESTURE_TUTORIAL_INITIAL_STATE);

  // The deliveries already acted on. One wave produces one event with one id
  // from the glasses, but the bridge script is re-installed on every call and
  // a re-render must never let the same delivery count twice.
  const handledEventIds = useRef(new Set());

  // The one way this page's state moves, whichever input asked for it. The
  // state machine decides, not the caller: a gesture the current state does
  // not expect returns the same state and nothing happens. That is what makes
  // RIGHT inert in WAIT_LEFT and LEFT inert in WAIT_RIGHT, for a wave and for
  // a tap alike, and what makes a second input on an already-completed step a
  // no-op rather than a double advance.
  const advance = useCallback((gesture) => {
    setState((current) => nextTutorialState(current, gesture));
  }, []);

  useEffect(() => subscribeNativeGestures(({ gesture, eventId }) => {
    if (eventId !== null) {
      if (handledEventIds.current.has(eventId)) return;
      handledEventIds.current.add(eventId);
    }
    advance(gesture);
  }), [advance]);

  useEffect(() => {
    if (state !== COMPLETE) return undefined;
    const timer = setTimeout(() => navigate('/ar-scan', { replace: true }), GESTURE_TUTORIAL_COMPLETE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, navigate]);

  const done = completedSteps(state);

  return (
    <div className="gesture-tutorial-page">
      <img className="gesture-tutorial-background" src={BACKGROUND_SRC} alt="" />
      <div className="gesture-tutorial-scrim" aria-hidden="true" />

      <div className="gesture-tutorial-content">
        <p className="gesture-tutorial-heading">{t.heading}</p>

        {/* One panel per step, laid out in the direction it teaches: the left
            step is the left-hand panel, the right step the right-hand one, so
            "which way" reads at a glance on the glasses without anyone having
            to parse the sentence. Each panel is also the touch/mouse target
            for its own step - the same step, not a shortcut past it. */}
        <div className="gesture-tutorial-steps">
          {STEPS.map((step, index) => {
            const live = acceptsGesture(state, step.gesture);
            const complete = index < done;
            const status = complete ? ' is-done' : (live ? ' is-active' : '');
            return (
              <button
                key={step.key}
                type="button"
                className={`gesture-tutorial-step gesture-tutorial-step-${step.key}${status}`}
                // Only the step the player is on can be completed, by either
                // input. A panel that is waiting its turn or already behind
                // them is as inert to a finger as the wrong-direction wave is
                // to the state machine.
                disabled={!live}
                onClick={() => advance(step.gesture)}
              >
                <span className="gesture-tutorial-arrow" aria-hidden="true">{step.arrow}</span>
                <span className="gesture-tutorial-step-title">{t[step.key].title}</span>
                <span className="gesture-tutorial-step-instruction">{t[step.key].instruction}</span>
                {/* What this wave does once the run starts. A player can work
                    out how to make the gesture by copying the arrow; what it
                    picks on a two-option screen is the part only the tutorial
                    ever tells them, so it is on screen rather than implied. */}
                <span className="gesture-tutorial-step-rule">{t[step.key].rule}</span>
              </button>
            );
          })}
        </div>

        {/* The three standing lines, fixed for the whole tutorial. None of
            them is a state and nothing here switches any of them off:

            - the one-option rule completes the mapping the panels start (two
              options -> LEFT and RIGHT; one option -> RIGHT, and no LEFT),
            - the reminder heads off the one mistake that makes the sensor
              miss a real wave, which is the same on both steps,
            - the tap hint says the other input out loud, so a player on a
              phone or a laptop knows the run is theirs to take too. */}
        <div className="gesture-tutorial-notes">
          <p className="gesture-tutorial-single-rule">{t.singleOption}</p>
          <p className="gesture-tutorial-reminder">{t.reminder}</p>
          <p className="gesture-tutorial-pointer-hint">{t.pointerHint}</p>
        </div>

        <p className="gesture-tutorial-status" aria-live="polite">
          {state === COMPLETE ? t.complete : ''}
        </p>

        <div className="gesture-tutorial-dots" aria-hidden="true">
          {Array.from({ length: GESTURE_TUTORIAL_STEP_COUNT }, (unused, step) => (
            <span key={step} className={`gesture-tutorial-dot${step < done ? ' is-done' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
