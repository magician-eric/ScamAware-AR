import { useEffect, useState } from 'react';
import { getScenario03State, useScenario03State } from '../../../lib/scenario03Store';
import { getOfficerDisplayName, getProsecutorDisplayName, getOrCreateScenarioSession } from '../../../lib/session/ScenarioSessionFactory';
import { getScenario03Lang, getScenario03Strings } from '../i18n';

function elapsedSeconds(startedAt) {
  return Math.max(0, Math.floor((Date.now() - Number(startedAt || Date.now())) / 1000));
}

function formatDuration(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// Reads scenario03Store's activeCall (the single source of truth for who
// the player is on the phone with) so this bubble can never claim a call is
// in progress with a role that isn't actually the one currently talking -
// null renders nothing, 'investigator' shows the officer's name, and
// 'prosecutor' shows the prosecutor's name, never a hardcoded role.
export function OngoingCallIndicator({ className = '' }) {
  const state = useScenario03State();
  const [seconds, setSeconds] = useState(() => elapsedSeconds(getScenario03State().callStartedAt));
  const session = getOrCreateScenarioSession();
  const lang = getScenario03Lang();
  const t = getScenario03Strings(lang);

  useEffect(() => {
    setSeconds(elapsedSeconds(state.callStartedAt));
    if (!state.activeCall) return undefined;
    const timer = window.setInterval(() => setSeconds(elapsedSeconds(state.callStartedAt)), 1000);
    return () => window.clearInterval(timer);
  }, [state.activeCall, state.callStartedAt]);

  if (!state.activeCall) return null;
  const callerName = state.activeCall === 'prosecutor'
    ? getProsecutorDisplayName(session, lang)
    : getOfficerDisplayName(session, lang);
  return (
    <div className={`pol-ongoing-call ${className}`.trim()} role="status">
      <span className="pol-ongoing-call-dot" aria-hidden="true" />
      <span><strong>{callerName}</strong><small>{t.common.ongoingCall} {formatDuration(seconds)}</small></span>
    </div>
  );
}
