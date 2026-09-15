import { useEffect, useState } from 'react';
import { getScenario03Strings } from '../i18n';

// The 30-minute artificial deadline every urgency screen quotes, counted
// against the ONE deadline minted with the session (never restarted per
// screen) - so the pressure the player feels is continuous across the LINE
// chat, the case site and the bank app.
export function useDeadlineRemaining(deadlineAt) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(deadlineAt).getTime() - Date.now()));
  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, new Date(deadlineAt).getTime() - Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadlineAt]);
  return remaining;
}

export function formatRemaining(ms) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function Countdown({ deadlineAt, label }) {
  const remaining = useDeadlineRemaining(deadlineAt);
  const t = getScenario03Strings();
  return (
    <div className={`pol-countdown${remaining < 5 * 60000 ? ' is-urgent' : ''}`}>
      <span className="pol-countdown-label">{label ?? t.components.countdownDefault}</span>
      <span className="pol-countdown-value">{formatRemaining(remaining)}</span>
    </div>
  );
}
