import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { Countdown } from './components/Countdown';
import { DialogueLayer } from './components/DialogueLayer';
import { OngoingCallIndicator } from './components/OngoingCallIndicator';
import { ScriptedLineConversation } from './components/ScriptedLineConversation';
import { LineWebsitePreview } from '../../apps/line';
import { useScriptPlayer } from './useScriptPlayer';
import { getOfficerIdentity, getOrCreateScenarioSession, getLineAccountDisplayName } from '../../lib/session/ScenarioSessionFactory';
import { buildScenario03Script } from '../../data/scenario03Dialogues';
import { sceneStartTime } from '../../data/scenario03Config';
import { playSound } from '../../lib/scenario03Feedback';
import { usePaceMultiplier } from '../../lib/scenario03Store';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Scene 09 - 資金監管任務卡. The ask finally arrives, wrapped as a numbered
// "task" with a deadline - by now the player has been walked through so many
// procedural steps that transferring their savings reads as step five of a
// process rather than as giving money to a stranger.
//
// Two channels, kept strictly apart, because this screen is the one place in
// the run where both are live at once:
//
//   * the PHONE. police_custody_account is a real recording, so it plays over
//     the call subtitle plate (DialogueLayer) exactly like every other spoken
//     block. It is mounted with the card already on screen so the voice never
//     describes data the player cannot see yet, and the call stays open (no
//     hangup) through to the bank app.
//   * LINE. custody_task has no recording and never will - it is the
//     officer's typed task order, the same as every other officer chat
//     message in this run. It therefore renders as LINE chat bubbles in the
//     LINE conversation, NOT as call subtitles: a subtitle plate under a
//     live "通話中" indicator is the phone talking, and putting silent text
//     there is what made the back half of this call read as "the line is
//     open but nobody is saying anything".
//
// The LINE half only starts once the recording has finished, so the two
// never talk over each other.
export function LineCustody() {
  const navigate = useNavigate();
  const pace = usePaceMultiplier();
  const [session] = useState(() => getOrCreateScenarioSession());
  const lang = getScenario03Lang();
  const t = getScenario03Strings();
  const officer = getOfficerIdentity(session, lang, t.common.policeOfficerSuffix);

  const voiceScript = useMemo(() => buildScenario03Script('lineCustodyAccount', session), [session]);
  const voicePlayer = useScriptPlayer(voiceScript, pace);
  const taskScript = useMemo(() => buildScenario03Script('lineCustody', session), [session]);
  const taskPlayer = useScriptPlayer(taskScript, pace, voicePlayer.done);

  // The officer's link, and the only way on from here. Both the card's own
  // tap and a RIGHT gesture run THIS function - one handler, so the two
  // inputs can never disagree about where the link goes.
  function openBankSite() {
    playSound('click');
    navigate('/scenario03-police/bank');
  }

  // The link card rides the last LINE message, exactly like a URL pasted into
  // a real chat: it is tappable from the moment that message lands, which is
  // also the moment the screen stops being display-only.
  const linkSent = taskPlayer.log.some((beat) => beat.card?.kind === 'bankLink');

  // AR Interaction Contract. Two scripted channels run on this one screen -
  // the officer's recorded line over the call subtitle plate, then his typed
  // LINE task order - and neither asks the player anything, so the screen is
  // `display` until his link arrives. From that message on, opening the link
  // is the one and only action on screen, so the contract is `single` and
  // RIGHT opens the site - the same handler the card's own tap runs.
  //
  // Both scripts here (lineCustodyAccount, lineCustody) are pure narration:
  // neither carries a choice beat, so this screen has no `dual` state to
  // declare. scripts/ar-interaction-migration.test.mjs pins that, so adding a
  // choice to either script fails loudly here instead of silently leaving the
  // player with a prompt no gesture can answer.
  useARInteraction(linkSent
    ? { mode: 'single', surfaceId: 'scenario03/line-custody/open-bank-site', action: openBankSite }
    : { mode: 'display', surfaceId: 'scenario03/line-custody' });

  // Pinned above the transcript rather than attached to one chat bubble: the
  // recorded line talks the player through this card before the first LINE
  // message arrives, so it has to be on screen from the first frame.
  const custodyCard = (
    <div className="pol-line-custody-pinned">
      <OngoingCallIndicator />
      <div className="pol-msg-card">
        <h4>{t.lineCustody.cardHeader}</h4>
        <dl>
          <dt>{t.lineCustody.caseNumberLabel}</dt><dd>{session.caseNumber}</dd>
          <dt>{t.lineCustody.custodyBankLabel}</dt><dd>{t.bank.brand}</dd>
          <dt>{t.lineCustody.accountNameLabel}</dt><dd>{t.lineCustody.accountNameValue}</dd>
          <dt>{t.lineCustody.custodyAccountLabel}</dt><dd>{session.fakeBankAccount}</dd>
          <dt>{t.lineCustody.statusLabel}</dt><dd>{t.lineCustody.statusValue}</dd>
          <dt>{t.lineCustody.noticeLabel}</dt><dd>{t.lineCustody.noticeValue(session.deadlineLabel)}</dd>
        </dl>
        <div style={{ marginTop: 8 }}>
          <Countdown deadlineAt={session.deadlineAt} label={t.lineCustody.countdownLabel} />
        </div>
      </div>
    </div>
  );

  // The URL preview LINE draws for the officer's link. It is the shared LINE
  // link card (apps/line), the same component Scenario 02 pastes a link into,
  // so it looks like every other link a player has ever been sent - and it
  // carries nothing but what a bank's own page metadata would: the brand, the
  // service, the address. Nothing on it says 模擬 or 教育用途, because a card
  // that admits what it is stops being the thing this scene is about.
  //
  // The address is fictional and the tap never leaves the app: `onOpen` is an
  // in-app route to BankSite.jsx.
  const bankLinkCard = (
    <LineWebsitePreview
      title={t.lineCustody.bankLink.title}
      description={t.lineCustody.bankLink.description}
      domain={t.lineCustody.bankLink.domain}
      openLabel={t.lineCustody.bankLink.openLabel}
      onOpen={openBankSite}
    />
  );

  return (
    <PoliceFrame stepKey="line-custody" statusTitle={t.lineCustody.statusTitle}>
      <ScriptedLineConversation
        baseTime={sceneStartTime(session, 'line-custody')}
        title={getLineAccountDisplayName(session, lang, t.common.policeOfficerSuffix)}
        avatar={officer.avatar}
        role={officer.role}
        player={taskPlayer}
        bodyBefore={custodyCard}
        renderCard={(beat) => (beat.card?.kind === 'bankLink' ? bankLinkCard : null)}
      />
      <DialogueLayer player={voicePlayer} />
    </PoliceFrame>
  );
}
