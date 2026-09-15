import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { DialogueLayer } from './components/DialogueLayer';
import { PhoneNumberDisplay } from './components/PhoneNumberDisplay';
import { useScriptPlayer } from './useScriptPlayer';
import { getOrCreateScenarioSession, getProsecutorIdentity, getProsecutorsOfficeDisplay } from '../../lib/session/ScenarioSessionFactory';
import { addWarningFlags, clearActiveCall, getScenario03State, setActiveCall, updateScenario03State, usePaceMultiplier } from '../../lib/scenario03Store';
import { buzz, playSound, startRingtone } from '../../lib/scenario03Feedback';
import { buildScenario03Script } from '../../data/scenario03Dialogues';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

function formatCallTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// How long the ended prosecutor call stays on screen before the officer's
// callback screen takes over. Long enough to read as "he hung up", short
// enough that the player never waits on a dead screen.
const HANGUP_GAP_MS = 1100;

// Scene 07 - 假檢察官來電. A plain Android phone call, not a video call: no
// camera permission, no self-preview, nothing this app could plausibly have
// obtained from the player's real device. Tone shifts hard here - 嚴厲、
// 居高臨下、不容質疑, noticeably sterner than either police appearance.
// Caller ID shows the agency, never a fabricated prosecutor name (section
// 四 of the rewrite spec). One 2-choice moment (account_relationship); the
// 凍結/羈押 pressure is the prosecutor's own narration. Lines live in
// data/scenario03Dialogues.js (script key: prosecutorCall).
//
// The prosecutor's job on this call is authority pressure only - confirm the
// case, state how serious it is, demand cooperation - and then he is gone.
// He never walks the player through LINE or the bank. The script ends on
// prosecutor_pressure and this call genuinely ENDS - hangup tone, activeCall
// cleared, a short 'ended' beat - before PoliceCallback rings as a separate,
// second call from the officer who called first. The handoff is narrated by
// that officer (police_callback_intro: "剛才檢察官已經把後續處理交代給我"),
// not by the prosecutor, so every line the player hears is backed by a
// recording that matches what actually happens next.
export function ProsecutorCall() {
  const navigate = useNavigate();
  const pace = usePaceMultiplier();
  const [session] = useState(() => getOrCreateScenarioSession());
  // Starts 'blocked' and stays there until the mount-guard effect below
  // confirms this is a valid arrival - the same gate PoliceCallback uses. It
  // deliberately does NOT derive 'ringing' from firstPoliceCallStatus alone:
  // that status is still 'ended' long after this call has finished, so every
  // later arrival here (the case site's own "the first call is over" redirect,
  // which is what the browser Back button reaches from LINE 資金監管) mounted
  // straight into the ring stage - a ring screen for a call that already
  // happened, complete with its vibration, on the way to a redirect.
  const [stage, setStage] = useState('blocked');
  const [seconds, setSeconds] = useState(0);
  const script = useMemo(() => buildScenario03Script('prosecutorCall', session), [session]);
  const player = useScriptPlayer(script, pace, stage === 'incall');
  const { done: scriptDone, stop: stopScript } = player;
  const stopRingtoneRef = useRef(() => {});

  const t = getScenario03Strings();
  const lang = getScenario03Lang();
  const prosecutorsOffice = getProsecutorsOfficeDisplay(session, lang)
    ?? t.common.prosecutorsOfficeFallback;
  // ONE identity for this call: the same name and the same face the aftermath's
  // LINE account shows, both read out of the run's session snapshot rather than
  // drawn here. A screen that cast him itself would give the player a different
  // man on the ring screen than in the conversation.
  const prosecutor = getProsecutorIdentity(session, lang, t.prosecutorCall.prosecutorRole);
  const prosecutorName = prosecutor.displayName;
  // Same "name + role" ordering as resolveSpeakerLabel in
  // data/scenario03Dialogues.js: role-first in English, name-first in
  // Chinese/Japanese.
  const prosecutorHeading = lang === 'en'
    ? `${t.prosecutorCall.prosecutorRole} ${prosecutorName}`.trim()
    : `${prosecutorName} ${t.prosecutorCall.prosecutorRole}`.trim();

  useEffect(() => {
    const state = getScenario03State();
    if (state.firstPoliceCallStatus !== 'ended') {
      navigate('/scenario03-police/case-site', { replace: true });
    } else if (state.prosecutorCallCompleted) {
      navigate('/scenario03-police/police-callback', { replace: true });
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
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [stage]);

  // The prosecutor's last recorded line (prosecutor_pressure) has finished
  // playing, so the call is over: stop the script, play the hangup tone and
  // clear activeCall, so no screen can keep claiming the player is on the
  // phone with the prosecutor and no prosecutor audio can outlive the call.
  useEffect(() => {
    if (stage !== 'incall' || !scriptDone) return;
    stopScript();
    playSound('hangup');
    clearActiveCall();
    updateScenario03State({ prosecutorCallCompleted: true });
    setStage('ended');
  }, [stage, scriptDone, stopScript]);

  // The short beat between the two calls. Nothing rings, nothing pops up in
  // the centre of the screen - the player just watches the prosecutor's call
  // end, and then the officer's own incoming call takes over on the next
  // screen.
  useEffect(() => {
    if (stage !== 'ended') return undefined;
    const timer = window.setTimeout(() => {
      // replace: true - without it, the browser Back button remounts this
      // finished call screen. Its stage is re-derived from persisted state
      // (prosecutorCallCompleted is now true, firstPoliceCallStatus is
      // 'ended') so it briefly re-renders the 'ringing' stage and restarts
      // the ringtone/vibration before the mount-guard effect above redirects
      // away again - the "audio replays after leaving this step" bug.
      navigate('/scenario03-police/police-callback', { replace: true });
    }, HANGUP_GAP_MS);
    return () => window.clearTimeout(timer);
  }, [stage, navigate]);

  function answer() {
    stopRingtoneRef.current();
    playSound('callConnected');
    setStage('incall');
    setActiveCall('prosecutor');
    addWarningFlags('prosecutor_call_pressure', 'fear_of_freeze');
  }

  // AR Interaction Contract, one stage at a time:
  //
  //   ringing -> single, RIGHT = 接聽 (this ring screen has no other action)
  //   incall  -> dual on its one 2-choice moment, display while he talks
  //   ended   -> display: the prosecutor has hung up and this screen is the
  //              short beat before the officer's own call rings on the next
  //              screen. Nothing is on it to press, and nothing may be.
  useARInteraction(stage === 'ringing'
    ? { mode: 'single', surfaceId: 'scenario03/prosecutor-call/answer', action: answer }
    : stage === 'ended'
      ? { mode: 'display', surfaceId: 'scenario03/prosecutor-call/ended' }
      : player.choice
        ? {
          mode: 'dual',
          surfaceId: `scenario03/prosecutor-call/${player.choice.momentKey}`,
          left: () => player.choose(player.choice.options[0]),
          right: () => player.choose(player.choice.options[1]),
        }
        : { mode: 'display', surfaceId: 'scenario03/prosecutor-call' });

  // 'blocked' is the pre-guard frame of an out-of-order mount, on its way to a
  // redirect - it must not flash a ring screen for a call that already ended.
  if (stage === 'blocked') return null;

  if (stage === 'ringing') {
    return (
      <PoliceFrame stepKey="prosecutor-call" dark ringing statusTitle={t.prosecutorCall.statusTitleRinging}>
        <div className="pol-call">
          <div>
            <p className="pol-call-label">{t.prosecutorCall.callLabel}</p>
            <p className="pol-call-number">{prosecutorsOffice}</p>
            <p className="pol-call-org">
              {prosecutorHeading}
              <br />
              <PhoneNumberDisplay number={session.fakePhoneNumber} />
            </p>
          </div>
          <img className="pol-call-avatar" src={prosecutor.avatar} alt={prosecutorName} />
          <div className="pol-call-actions">
            <button type="button" className="pol-call-btn pol-call-btn-answer" onClick={answer}>{t.prosecutorCall.answer}</button>
          </div>
        </div>
      </PoliceFrame>
    );
  }

  const ended = stage === 'ended';

  return (
    <PoliceFrame
      stepKey="prosecutor-call"
      dark
      statusTitle={ended ? t.prosecutorCall.statusTitleEnded : t.prosecutorCall.statusTitleInCall}
    >
      <div className="pol-incall">
        <div className="pol-incall-head">
          <img className="pol-call-avatar pol-incall-avatar" src={prosecutor.avatar} alt={prosecutorName} />
          <div className="pol-incall-name">{prosecutorsOffice}</div>
          <div className="pol-incall-org">
            {prosecutorHeading}
            <br />
            <PhoneNumberDisplay number={session.fakePhoneNumber} />
          </div>
          <div className="pol-incall-timer">
            {ended ? t.prosecutorCall.callEnded : formatCallTime(seconds)}
          </div>
          {!ended && (
            <div className="pol-wave" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ '--i': i }} />)}
            </div>
          )}
        </div>

        {!ended && (
          <DialogueLayer
            player={player}
            pace={pace}
          />
        )}
      </div>
    </PoliceFrame>
  );
}
