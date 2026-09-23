import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { ScriptedLineConversation } from './components/ScriptedLineConversation';
import { useScriptPlayer } from './useScriptPlayer';
import { LineConversation } from '../../apps/line';
import {
  getLineAccountDisplayName,
  getOfficerIdentity,
  getOrCreateScenarioSession,
  getProsecutorIdentity,
} from '../../lib/session/ScenarioSessionFactory';
import { getScenario03State, updateScenario03State, usePaceMultiplier } from '../../lib/scenario03Store';
import { buildScenario03Script } from '../../data/scenario03Dialogues';
import {
  BALANCE_TOTAL,
  aftermathLaterDateLabel,
  aftermathLaterTime,
  formatNT,
  messageTimeLabel,
  sceneStartTime,
} from '../../data/scenario03Config';
import { playSound } from '../../lib/scenario03Feedback';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Scene 11a2 - 轉帳完成之後. The end of the 受騙 branch, and ONLY of the 受騙
// branch: FinalDecision's 確認轉帳 routes here instead of straight to the
// ending, while its 撥打 165 half still goes to the hotline and its own 成功
// ending, which never touches this screen. The mount guard below enforces
// that from this side too - arriving without a completed transfer bounces
// back to the decision rather than showing a player who stopped in time the
// consequences of a transfer they never made.
//
// Three beats, all automatic. The player makes no decision here - there is no
// choice to make once the money has moved, and inventing one would say the
// opposite of what this scene is for:
//
//   1. 'wait'     - LINE, from the prosecutor's own account: 「你做得很好，請
//                   等待我們的消息。」 The pressure stops dead the moment the
//                   transfer clears. Nothing is asked of the player, and no
//                   reply is offered.
//   2. 'timeskip' - 「幾天後」. The scam's whole machinery ran on a 30-minute
//                   countdown; what follows it is silence measured in days.
//   3. 'gone'     - LINE again. The player's own follow-up will not send:
//                   both the 承辦員警 and the 承辦檢察官 accounts are gone, and
//                   the number on the caller ID no longer answers. This is
//                   where the player finds out, not before.
//
// Everything on screen is the run's existing furniture: the same LINE module
// every other chat scene renders through, the same officer and prosecutor
// identities the session was minted with (same names, same faces - see
// getOfficerIdentity/getProsecutorIdentity), and the same PoliceFrame shell.
// No second LINE UI was built for this scene.
const WAIT_HOLD_MS = 2600;
const TIMESKIP_MS = 2400;

export function Aftermath() {
  const navigate = useNavigate();
  const pace = usePaceMultiplier();
  const [session] = useState(() => getOrCreateScenarioSession());
  // 'blocked' until the mount guard confirms the player actually completed the
  // transfer - the same pre-guard shape ProsecutorCall and PoliceCallback use,
  // so an out-of-order arrival never flashes a frame of this scene on its way
  // to a redirect.
  const [stage, setStage] = useState('blocked');
  const lang = getScenario03Lang();
  const t = getScenario03Strings(lang);

  const officer = getOfficerIdentity(session, lang, t.common.policeOfficerSuffix);
  const prosecutor = getProsecutorIdentity(session, lang, t.prosecutorCall.prosecutorRole);
  const officerLineName = getLineAccountDisplayName(session, lang, t.common.policeOfficerSuffix);
  const prosecutorLineName = lang === 'en'
    ? `${t.prosecutorCall.prosecutorRole} ${prosecutor.displayName}`.trim()
    : `${prosecutor.displayName} ${t.prosecutorCall.prosecutorRole}`.trim();

  const script = useMemo(() => buildScenario03Script('aftermathProsecutor', session), [session]);
  const player = useScriptPlayer(script, pace, stage === 'wait');
  const { done: waitDone } = player;

  // Mount guard, same shape as ProsecutorCall's. Two ways in are wrong and
  // both are redirected rather than rendered:
  //
  //   no completed transfer -> back to the decision. A player who stopped in
  //     time must never be shown the consequences of a transfer they did not
  //     make, and this is the second half of that guarantee (the first is that
  //     the 165 branch simply never navigates here).
  //   already played        -> straight on to the ending, so the browser Back
  //     button cannot replay the beat the way it once re-rang finished calls.
  useEffect(() => {
    const state = getScenario03State();
    if (state.ending !== 'failure' || !state.transferAmount) {
      navigate('/scenario03-police/final', { replace: true });
    } else if (state.aftermathSeen) {
      navigate('/scenario03-police/ending/failure', { replace: true });
    } else {
      setStage('wait');
    }
  }, [navigate]);

  // The prosecutor's message has landed and been read; hold on it for a beat
  // so it is not swept off screen by the transition, then skip forward.
  useEffect(() => {
    if (stage !== 'wait' || !waitDone) return undefined;
    const timer = window.setTimeout(() => setStage('timeskip'), WAIT_HOLD_MS * pace);
    return () => window.clearTimeout(timer);
  }, [stage, waitDone, pace]);

  useEffect(() => {
    if (stage !== 'timeskip') return undefined;
    const timer = window.setTimeout(() => {
      playSound('lineNotify');
      setStage('gone');
    }, TIMESKIP_MS * pace);
    return () => window.clearTimeout(timer);
  }, [stage, pace]);

  // Recorded the moment the player reaches the last beat, so the ending can be
  // asked whether the 受騙 branch really went through here.
  useEffect(() => {
    if (stage === 'gone') updateScenario03State({ aftermathSeen: true });
  }, [stage]);

  function toEnding() {
    playSound('click');
    navigate('/scenario03-police/ending/failure');
  }

  // AR Interaction Contract: the first two beats play themselves out with
  // nothing on screen to press (`display`), and the last one offers exactly
  // one way on (`single`). There is deliberately no `dual` state anywhere in
  // this scene - it adds no decision, so there is no LEFT/RIGHT to declare.
  useARInteraction(stage === 'gone'
    ? { mode: 'single', surfaceId: 'scenario03/aftermath/continue', action: toEnding }
    : { mode: 'display', surfaceId: `scenario03/aftermath/${stage === 'timeskip' ? 'timeskip' : 'wait'}` });

  if (stage === 'blocked') return null;

  if (stage === 'timeskip') {
    return (
      <PoliceFrame stepKey="decision" dark statusTitle={t.aftermath.statusTitleLine}>
        <div className="pol-timeskip">
          <strong>{t.aftermath.timeSkip}</strong>
          <span>{t.aftermath.timeSkipNote(aftermathLaterDateLabel(session))}</span>
        </div>
      </PoliceFrame>
    );
  }

  if (stage === 'gone') {
    const laterBase = aftermathLaterTime(session);
    // The player's own unanswered follow-up, then what LINE tells them about
    // each account. `read: false` on the outgoing bubble is the point: this
    // chat never shows 已讀 again.
    const messages = [
      {
        id: 'follow-up',
        text: t.aftermath.playerFollowUp,
        outgoing: true,
        read: false,
        time: messageTimeLabel(laterBase, 0),
      },
      { id: 'send-failed', type: 'system', text: t.aftermath.sendFailed(officerLineName) },
      { id: 'prosecutor-gone', type: 'system', text: t.aftermath.prosecutorGone(prosecutorLineName) },
      { id: 'phone-dead', type: 'system', text: t.aftermath.phoneDead },
      { id: 'realization', type: 'system', text: t.aftermath.realization },
    ];
    return (
      <PoliceFrame stepKey="decision" statusTitle={t.aftermath.statusTitleGone}>
        <LineConversation
          fullBleed
          showBack
          identity={{
            displayName: officerLineName,
            avatar: officer.avatar,
            status: t.aftermath.chatStatusGone,
            role: officer.role,
          }}
          messages={messages}
          footer={(
            <button type="button" className="pol-cta" onClick={toEnding}>
              {t.aftermath.continueLabel}
            </button>
          )}
        />
      </PoliceFrame>
    );
  }

  // stage === 'wait'. The receipt is pinned above the transcript rather than
  // sent as a chat message: it is the bank's, not the caller's, and the whole
  // beat only makes sense with "the money has already left" on screen while
  // the prosecutor says well done.
  const receipt = (
    <div className="pol-line-custody-pinned">
      <div className="pol-msg-card">
        <h4>{t.aftermath.transferCardHeader}</h4>
        <dl>
          <dt>{t.aftermath.transferAmountLabel}</dt><dd>{formatNT(BALANCE_TOTAL)}</dd>
          <dt>{t.aftermath.transferToLabel}</dt><dd>{session.fakeBankAccount}</dd>
          <dt>{t.aftermath.transferAccountNameLabel}</dt><dd>{t.lineCustody.accountNameValue}</dd>
          <dt>{t.aftermath.transferStatusLabel}</dt><dd>{t.aftermath.transferStatusValue}</dd>
        </dl>
      </div>
    </div>
  );

  return (
    <PoliceFrame stepKey="decision" statusTitle={t.aftermath.statusTitleLine}>
      <ScriptedLineConversation
        baseTime={sceneStartTime(session, 'aftermath')}
        title={prosecutorLineName}
        avatar={prosecutor.avatar}
        role={prosecutor.role}
        player={player}
        bodyBefore={receipt}
      />
    </PoliceFrame>
  );
}
