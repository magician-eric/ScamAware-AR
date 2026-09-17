import { useEffect, useState } from 'react';
import {
  getCurrentARInteraction,
  subscribeARInteraction,
} from '../../lib/arInteraction';
import {
  INACTIVITY_HINT_DELAY_MS,
  inactivityHintFor,
  inactivityHintKey,
} from '../../lib/arInteraction/inactivityHint';
import { getInteractionHintStrings } from './interactionHintI18n';
import './InteractionHint.css';

// The run's one inactivity hint.
//
// Mounted ONCE, inside the stage, as a sibling of the routed screen (see
// shell/AppShell.jsx). There is no per-scenario copy of this: the five
// scenarios, the shared anti-fraud quiz, the shared outcome and analysis
// screens and the AR scan home all get the same clock and the same line,
// because all of them already describe themselves to the same contract.
//
// WHAT IT IS FOR. A player on the glasses who has read the screen and does
// not know what to do next has no affordance to fall back on - there is no
// cursor, and the buttons they can see are not tappable from where they are
// standing. After ten seconds of a live choice going untaken, this says which
// way to wave. Before those ten seconds it says nothing at all, because
// several story screens carry a paragraph that takes longer than that to read
// and a hint that interrupts it is worse than no hint.
//
// WHAT IT IS NOT:
//
// - not a countdown, not a modal, not an alert, not a full-screen scrim
// - not a control: `pointer-events: none`, so a finger passes straight
//   through it to whatever is underneath, and the touch fallback every screen
//   already has is untouched
// - not a second source of truth: it reads the contract and holds no copy of
//   what any screen allows
// - not a nudge that escalates: it appears once per chance-to-act, stays put
//   while that chance is still open, and goes when it is taken. It never
//   blinks, never repeats on a second timer and never acts for the player
// - never on top of the story: almost every screen in this app runs its
//   content to within ~22px of the stage's bottom edge, so a strip laid over
//   that edge would sit on a CTA, a chat's last line or a quiz's answer. It
//   reserves its band instead (`has-interaction-hint` on the stage, see
//   ./InteractionHint.css) and the screen is inset into what is left, which is
//   also why the band eases in rather than appearing: the screen it shares the
//   stage with must never jump
//
// It also cannot appear on the gesture tutorial. That screen deliberately does
// not declare itself to the contract (its LEFT and RIGHT are steps, not
// options - see pages/gestureTutorial/tutorialStateMachine.js), so the
// contract answers "nothing is registered" and this renders null.
export function InteractionHint({ onVisibilityChange }) {
  // What the contract currently says. Re-read on notification, never polled,
  // and never cached beyond the render it belongs to.
  //
  // It starts as `null` - "nothing known yet" - rather than as a read taken
  // during render, and that is the point. React renders this component and the
  // routed screen in the SAME pass, then runs the SCREEN's registration effect
  // before this one's subscription effect. A snapshot taken while rendering is
  // therefore always from before the screen that is about to be on screen
  // registered, and nothing would ever correct it: the registration that would
  // have notified happened while there was no observer to hear it. Starting
  // empty and reading back below closes that window by construction instead of
  // relying on the screen re-rendering later.
  const [snapshot, setSnapshot] = useState(null);
  // The chance-to-act this hint has already surfaced for, so it is shown once
  // and then left alone rather than re-armed on every render.
  const [shownFor, setShownFor] = useState(null);

  useEffect(() => {
    const readBack = () => setSnapshot(getCurrentARInteraction());
    const stop = subscribeARInteraction(readBack);
    // Whatever happened between this component rendering and this line.
    readBack();
    return stop;
  }, []);

  const hint = inactivityHintFor(snapshot);
  const key = inactivityHintKey(snapshot);

  useEffect(() => {
    // Nothing to do on this screen: drop the hint and any clock with it, so a
    // timer started on the screen before can never land on this one.
    if (hint === null) {
      setShownFor(null);
      return undefined;
    }
    // Already up for this exact chance to act. Not re-armed - a screen that
    // re-renders while the player reads must not push the hint further away,
    // and one that is already showing must not flash.
    if (shownFor === key) return undefined;
    const timer = setTimeout(() => setShownFor(key), INACTIVITY_HINT_DELAY_MS);
    return () => clearTimeout(timer);
    // `hint` and `key` are both primitives derived from the contract, and they
    // change only when the contract's own revision does - which is to say when
    // the screen, the geometry or the availability changed, and not when React
    // merely re-rendered. That is what makes the ten seconds real.
  }, [hint, key, shownFor]);

  const visible = hint !== null && shownFor === key;

  // The shell reserves the band this sits in, so it has to be told. Reported
  // from an effect rather than during render because it moves the shell's own
  // state, and cleared on unmount so the band can never outlive the hint.
  useEffect(() => {
    if (typeof onVisibilityChange !== 'function') return undefined;
    onVisibilityChange(visible);
    return () => onVisibilityChange(false);
  }, [visible, onVisibilityChange]);

  if (!visible) return null;

  return (
    <div className="interaction-hint" role="status" aria-live="polite">
      <p className="interaction-hint-line">{getInteractionHintStrings()[hint]}</p>
    </div>
  );
}
