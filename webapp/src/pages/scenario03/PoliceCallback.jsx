import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { DialogueLayer } from './components/DialogueLayer';
import { useScriptPlayer } from './useScriptPlayer';
import { getOfficerIdentity, getOrCreateScenarioSession, getPoliceUnitDisplay, getLineAccountDisplayName } from '../../lib/session/ScenarioSessionFactory';
import { addWarningFlags, getScenario03State, setActiveCall, updateScenario03State, usePaceMultiplier } from '../../lib/scenario03Store';
import { buzz, playSound, startRingtone } from '../../lib/scenario03Feedback';
import { buildScenario03Script } from '../../data/scenario03Dialogues';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

function formatCallTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// Scene 08 - 承辦員警回電. A second, separate incoming call - not a warm
// transfer. The prosecutor's call has already ended on the previous screen
// (hangup tone, activeCall cleared), so this is the SAME investigating
// officer from the first call ringing the player back: the caller identity
// is read from the run's session snapshot (getOfficerIdentity /
// getLineAccountDisplayName), never re-drawn, never a generic "警察" or
// "承辦人員" label.
//
// Like every other call in this scenario, the ring screen offers exactly one
// action - 接聽. No decline, no "remind me later", no second button.
//
// Nothing plays until the player answers: the script (police_callback_intro,
// "剛才檢察官已經把後續處理交代給我") is gated on stage === 'incall', the same
// gate ProsecutorCall uses, so no officer audio can start over a ring screen
// and no prosecutor audio can still be running once this officer speaks.
export function PoliceCallback() {
  const navigate = useNavigate();
  const pace = usePaceMultiplier();
  const [session] = useState(() => getOrCreateScenarioSession());
  const [seconds, setSeconds] = useState(0);
  // Stays 'blocked' until the mount-guard effect below confirms this is a
  // valid arrival (straight off the prosecutor's hangup) - keeps the ringtone
  // and the script from ever starting for the split second before an
  // out-of-order mount (deep link, stale reload) redirects away.
  const [stage, setStage] = useState('blocked');
  const script = useMemo(() => buildScenario03Script('policeCallback', session), [session]);
  const player = useScriptPlayer(script, pace, stage === 'incall');
  const { done: scriptDone, stop: stopScript } = player;
  const stopRingtoneRef = useRef(() => {});
  const lang = getScenario03Lang();
  const t = getScenario03Strings();
  const callerName = getLineAccountDisplayName(session, lang, t.common.policeOfficerSuffix);
  const officer = getOfficerIdentity(session, lang, t.common.policeOfficerSuffix);
  const policeUnit = getPoliceUnitDisplay(session, lang);
  const policeDepartment = policeUnit.department ?? t.policeCallback.policeDepartmentFallback;

  // Arriving here out of order (deep link, reload after the callback already
  // happened) must never replay the recording or ring a call that already
  // finished - route back to the prosecutor call that hands off to this one,
  // or forward past a callback already completed earlier in this session.
  useEffect(() => {
    const state = getScenario03State();
    if (!state.prosecutorCallCompleted) {
      navigate('/scenario03-police/prosecutor-call', { replace: true });
    } else if (state.policeCallbackStatus === 'completed') {
      navigate('/scenario03-police/line-custody', { replace: true });
    } else {
      setStage('ringing');
    }
  }, [navigate]);

  useEffect(() => {
    if (stage !== 'ringing') return undefined;
    const stop = startRingtone(1500);
    stopRingtoneRef.current = stop;
    buzz([200, 300, 200]);
    return () => {
      stop();
      stopRingtoneRef.current = () => {};
    };
  }, [stage]);

  useEffect(() => {
    if (stage !== 'incall') return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'incall' || !scriptDone) return;
    stopScript();
    updateScenario03State({ policeCallbackStatus: 'completed' });
    // No hangup here: from this point the officer stays on the line through
    // LINE, the custody-account card and the bank app. activeCall keeps
    // saying 'investigator' (OngoingCallIndicator is the only thing that
    // shows it) until FinalDecision resolves the run.
    navigate('/scenario03-police/line-custody', { replace: true });
  }, [stage, navigate, scriptDone, stopScript]);

  // Answering is the one and only action on the ring screen.
  function answer() {
    stopRingtoneRef.current();
    playSound('callConnected');
    setStage('incall');
    setActiveCall('investigator');
    updateScenario03State({ policeCallbackStatus: 'active' });
    addWarningFlags('isolated_from_family', 'online_bank_pushed');
  }

  // AR Interaction Contract. This is a second, separate incoming call, so it
  // has the same shape as every other ring screen in this scenario: 接聽 is
  // the one and only action while it rings (`single`), and once the player
  // has answered, the officer's recording plays itself out and hands over to
  // LINE - nothing for a gesture to do (`display`). The pre-guard 'blocked'
  // frame is on its way to a redirect and is display-only too.
  //
  // Declared above the early returns below, so the hook order never depends on
  // which stage the screen is in.
  useARInteraction(stage === 'ringing'
    ? { mode: 'single', surfaceId: 'scenario03/police-callback/answer', action: answer }
    : { mode: 'display', surfaceId: 'scenario03/police-callback' });

  // 'blocked' is the pre-guard frame of an out-of-order mount, on its way to
  // a redirect - it must not flash a ring screen for a call that never rang.
  if (stage === 'blocked') return null;

  if (stage === 'ringing') {
    return (
      <PoliceFrame stepKey="police-callback" dark ringing statusTitle={t.policeCallback.statusTitleRinging}>
        <div className="pol-call">
          <div>
            <p className="pol-call-label">{t.policeCallback.incomingCall}</p>
            <p className="pol-call-number">{callerName}</p>
            <p className="pol-call-org">
              {policeDepartment} / {t.policeCallback.investigationUnit}
              {policeUnit.handlingUnit && policeUnit.handlingUnit !== policeUnit.department && (
                <><br />{policeUnit.handlingUnit}</>
              )}
            </p>
          </div>
          <img className="pol-call-avatar" src={officer.avatar} alt={officer.displayName} />
          <div className="pol-call-actions">
            <button type="button" className="pol-call-btn pol-call-btn-answer" onClick={answer}>
              {t.policeCallback.answer}
            </button>
          </div>
        </div>
      </PoliceFrame>
    );
  }

  return (
    <PoliceFrame stepKey="police-callback" dark statusTitle={t.policeCallback.statusTitleInCall}>
      <div className="pol-incall">
        <div className="pol-incall-head">
          <img className="pol-call-avatar pol-incall-avatar" src={officer.avatar} alt={officer.displayName} />
          <div className="pol-incall-name">{callerName}</div>
          <div className="pol-incall-org">
            {policeDepartment} / {t.policeCallback.investigationUnit}
            {policeUnit.handlingUnit && policeUnit.handlingUnit !== policeUnit.department && (
              <><br />{policeUnit.handlingUnit}</>
            )}
          </div>
          <div className="pol-incall-timer">{formatCallTime(seconds)}</div>
          <div className="pol-wave" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => <span key={index} style={{ '--i': index }} />)}
          </div>
        </div>
        <DialogueLayer player={player} pace={pace} />
      </div>
    </PoliceFrame>
  );
}
