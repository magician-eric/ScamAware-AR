import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { DialogueLayer } from './components/DialogueLayer';
import { PhoneNumberDisplay } from './components/PhoneNumberDisplay';
import { useScriptPlayer } from './useScriptPlayer';
import { getOfficerIdentity, getOrCreateScenarioSession, getPoliceUnitDisplay, getProsecutorsOfficeDisplay } from '../../lib/session/ScenarioSessionFactory';
import { addWarningFlags, usePaceMultiplier } from '../../lib/scenario03Store';
import { playSound } from '../../lib/scenario03Feedback';
import { buildScenario03Script } from '../../data/scenario03Dialogues';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

function formatCallTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// Scene 03 - 通話第一階段. The caller's tone here is deliberately flat and
// procedural (制式、冷靜、不容質疑): no shouting, no threats yet, just an
// official-sounding recitation that assumes the player's cooperation. The
// one 2-choice moment in this scene (identity_theft) has an answer prepared
// either way - the player cannot "argue their way out", which is the point.
// All lines live in data/scenario03Dialogues.js (script key: callStage1).
export function CallStage1() {
  const navigate = useNavigate();
  const pace = usePaceMultiplier();
  const [session] = useState(() => getOrCreateScenarioSession());
  const script = useMemo(() => buildScenario03Script('callStage1', session), [session]);
  const player = useScriptPlayer(script, pace);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const caseRevealed = player.log.some((b) => b.dialogueId === 'police_case_number');
  const lang = getScenario03Lang();
  const t = getScenario03Strings();
  const policeUnit = getPoliceUnitDisplay(session, lang);
  const officer = getOfficerIdentity(session, lang, t.callStage1.officerSuffix);

  function toLine() {
    playSound('lineNotify');
    addWarningFlags('accepted_case_number', 'moved_to_line', 'isolated_from_family');
    navigate('/scenario03-police/line-add');
  }

  // AR Interaction Contract. A scripted call is `display` while the caller is
  // talking, `dual` on its one 2-choice moment (LEFT = options[0], the order
  // ChoicePanel draws them in), and `single` once the script has played out
  // and the continue button is on screen. Declared here rather than inside
  // components/DialogueLayer: the page is the layer that knows what "continue"
  // means for the story, and the same DialogueLayer is mounted on screens with
  // no continue at all.
  useARInteraction(player.choice
    ? {
      mode: 'dual',
      surfaceId: `scenario03/call-stage1/${player.choice.momentKey}`,
      left: () => player.choose(player.choice.options[0]),
      right: () => player.choose(player.choice.options[1]),
    }
    : player.done
      ? { mode: 'single', surfaceId: 'scenario03/call-stage1/continue', action: toLine }
      : { mode: 'display', surfaceId: 'scenario03/call-stage1' });

  return (
    <PoliceFrame stepKey="call-stage1" dark statusTitle={t.callStage1.statusTitle}>
      <div className="pol-incall">
        <div className="pol-incall-head">
          <img className="pol-call-avatar pol-incall-avatar" src={officer.avatar} alt={officer.displayName} />
          <div className="pol-incall-name">{officer.displayName} {t.callStage1.officerSuffix}</div>
          <div className="pol-incall-org">
            {[policeUnit.department ?? t.common.policeDepartmentFallback, policeUnit.division].filter(Boolean).join(' ')}
            <br />
            <PhoneNumberDisplay number={session.fakePhoneNumber} />
          </div>
          <div className="pol-incall-timer">{formatCallTime(seconds)}</div>
          <div className="pol-wave" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => <span key={i} style={{ '--i': i }} />)}
          </div>
          {caseRevealed && (
            <div className="pol-msg-card" style={{ marginTop: 16, textAlign: 'left' }}>
              <h4>{t.callStage1.caseNumberHeader}</h4>
              <dl>
                <dt>{t.callStage1.caseNumberLabel}</dt><dd>{session.caseNumber}</dd>
                <dt>{t.callStage1.receivingUnitLabel}</dt>
                <dd>
                  {policeUnit.department ?? '—'}
                  {policeUnit.handlingUnit && policeUnit.handlingUnit !== policeUnit.department && (
                    <><br />{policeUnit.handlingUnit}</>
                  )}
                </dd>
                <dt>{t.callStage1.directingAgencyLabel}</dt><dd>{getProsecutorsOfficeDisplay(session, lang) ?? '—'}</dd>
              </dl>
            </div>
          )}
        </div>

        <DialogueLayer
          player={player}
          pace={pace}
          continueLabel={t.callStage1.continueLabel}
          onContinue={toLine}
        />
      </div>
    </PoliceFrame>
  );
}
