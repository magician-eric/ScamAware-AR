import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { ScriptedLineConversation } from './components/ScriptedLineConversation';
import { useScriptPlayer } from './useScriptPlayer';
import { getOfficerIdentity, getOrCreateScenarioSession, getPoliceUnitDisplay, getProsecutorDisplayName, getProsecutorsOfficeDisplay, getLineAccountDisplayName } from '../../lib/session/ScenarioSessionFactory';
import { addWarningFlags, usePaceMultiplier } from '../../lib/scenario03Store';
import { playSound } from '../../lib/scenario03Feedback';
import { buildScenario03Script } from '../../data/scenario03Dialogues';
import { sceneStartTime } from '../../data/scenario03Config';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Scene 05 - LINE 案件說明. The "ask family or call 165 first" branch is the
// one real off-ramp a victim has, so the script answers it the way the scam
// actually does: not by refusing, but by reframing silence as the player's
// own legal duty (偵查不公開、避免串證) and the caller as the only person on
// their side. Lines live in data/scenario03Dialogues.js (key: lineIntro).
export function LineIntro() {
  const navigate = useNavigate();
  const pace = usePaceMultiplier();
  const [session] = useState(() => getOrCreateScenarioSession());
  const script = useMemo(() => buildScenario03Script('lineIntro', session), [session]);
  const player = useScriptPlayer(script, pace);
  const lang = getScenario03Lang();
  const t = getScenario03Strings();
  const policeUnit = getPoliceUnitDisplay(session, lang);
  const officer = getOfficerIdentity(session, lang, t.common.policeOfficerSuffix);

  function toCaseSite() {
    playSound('click');
    addWarningFlags('agreed_to_cooperate', 'isolated_from_family');
    navigate('/scenario03-police/case-site');
  }

  function renderCard(beat) {
    if (beat.card?.kind === 'case') {
      return (
        <div className="pol-msg-card">
          <h4>{t.lineIntro.caseCardHeader(session.caseDate)}</h4>
          <dl>
            <dt>{t.lineIntro.caseNumberLabel}</dt><dd>{session.caseNumber}</dd>
            <dt>{t.lineIntro.partyLabel}</dt><dd>{t.lineIntro.partyValue}</dd>
            <dt>{t.lineIntro.receivingUnitLabel}</dt>
            <dd>
              {policeUnit.department ?? '—'}
              {policeUnit.handlingUnit && policeUnit.handlingUnit !== policeUnit.department && (
                <><br />{policeUnit.handlingUnit}</>
              )}
            </dd>
            <dt>{t.lineIntro.directingAgencyLabel}</dt><dd>{getProsecutorsOfficeDisplay(session, lang) ?? '—'}</dd>
            <dt>{t.lineIntro.prosecutorLabel}</dt><dd>{getProsecutorDisplayName(session, lang)}</dd>
            <dt>{t.lineIntro.accountLabel}</dt><dd>{session.maskedBankAccount}</dd>
          </dl>
        </div>
      );
    }
    if (beat.card?.kind === 'status') {
      return (
        <div className="pol-msg-card">
          <h4>{t.lineIntro.statusSystemHeader}</h4>
          <dl>
            <dt>{t.lineIntro.caseStatusLabel}</dt><dd>{t.lineIntro.caseStatusValue}</dd>
            <dt>{t.lineIntro.deadlineLabel}</dt><dd>{t.lineIntro.deadlineValue(session.deadlineLabel)}</dd>
          </dl>
          <button type="button" className="pol-msg-card-cta" onClick={toCaseSite}>{t.lineIntro.openCaseSite}</button>
        </div>
      );
    }
    return null;
  }

  // The 案件狀態查詢 card carries its own 開啟案件狀態查詢 button (renderCard
  // above), and it arrives with the officer's last message rather than with
  // the footer - so from the moment that card is in the transcript the screen
  // already offers this scene's one story action. Same shape as CallStage1's
  // `caseRevealed`: ask the log what is on screen.
  const caseSiteCardShown = player.log.some((beat) => beat.card?.kind === 'status');

  // AR Interaction Contract - same three states as every other scripted scene
  // here, declared by the page that owns the script and the footer CTA rather
  // than by components/ScriptedLineConversation, which only translates beats
  // into LINE's neutral message contract and must not decide what a quick
  // reply means (spec §4.12).
  //
  // `single` starts at the card, not at player.done: the card's CTA and the
  // footer button are the same `toCaseSite`, but the card appears about four
  // seconds earlier, and for those four seconds the screen showed a live
  // primary control with LEFT and RIGHT both off - a player on the glasses had
  // to sit out a line that a player tapping the screen could already skip.
  // Declaring it here names the control the player can actually see; it does
  // not add one, and it does not copy a handler.
  useARInteraction(player.choice
    ? {
      mode: 'dual',
      surfaceId: `scenario03/line-intro/${player.choice.momentKey}`,
      left: () => player.choose(player.choice.options[0]),
      right: () => player.choose(player.choice.options[1]),
    }
    : player.done || caseSiteCardShown
      ? { mode: 'single', surfaceId: 'scenario03/line-intro/open-case-site', action: toCaseSite }
      : { mode: 'display', surfaceId: 'scenario03/line-intro' });

  return (
    <PoliceFrame stepKey="line-chat" statusTitle={t.lineIntro.statusTitle}>
      <ScriptedLineConversation
        baseTime={sceneStartTime(session, 'line-chat')}
        title={getLineAccountDisplayName(session, lang, t.common.policeOfficerSuffix)}
        avatar={officer.avatar}
        role={officer.role}
        player={player}
        renderCard={renderCard}
        footer={<button type="button" className="pol-cta" onClick={toCaseSite}>{t.lineIntro.openCaseSite}</button>}
      />
    </PoliceFrame>
  );
}
