import { useEffect, useState } from 'react';

// A scam's LINE nudge (or a plain "the deadline is closing in" pressure
// beat) is not part of whatever app the player happens to be looking at -
// it's an outside interruption. This renders as a real Android heads-up
// notification: slides in from the top, floats above everything, auto-
// dismisses on its own. Never blocks input, never requires a tap.
//
// `active` toggles true exactly once per moment the caller wants to show
// this (the caller is responsible for only flipping it once per run - see
// BankSite/FinalDecision's own "shown" refs). `onDone` fires after the
// notification has fully slid back out, so callers can chain a second one.
export function HeadsUpNotification({ active, variant = 'line', icon, title, message, holdMs = 4000, onDone }) {
  const [phase, setPhase] = useState('hidden'); // hidden | in | out

  useEffect(() => {
    if (!active) return undefined;
    setPhase('in');
    const hideTimer = window.setTimeout(() => setPhase('out'), holdMs);
    const doneTimer = window.setTimeout(() => {
      setPhase('hidden');
      onDone?.();
    }, holdMs + 350);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (phase === 'hidden') return null;

  return (
    <div
      className={`pol-headsup pol-headsup-${variant}${phase === 'out' ? ' is-leaving' : ''}`}
      role="status"
    >
      <span className="pol-headsup-icon" aria-hidden="true">{icon}</span>
      <div className="pol-headsup-body">
        <div className="pol-headsup-title">{title}</div>
        <div className="pol-headsup-message">{message}</div>
      </div>
    </div>
  );
}
