import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { LineAvatar } from '../../apps/line';
import { getOfficerIdentity, getOrCreateScenarioSession, getOfficerDisplayName, getLineAccountDisplayName } from '../../lib/session/ScenarioSessionFactory';
import { addWarningFlags } from '../../lib/scenario03Store';
import { playSound } from '../../lib/scenario03Feedback';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { FraudWarningBanner } from '../../components/warnings/FraudWarningBanner';
import { useARInteraction } from '../../lib/arInteraction';

// Scene 04 - 加入 LINE. The call doesn't end; it shrinks to a floating pill
// that stays on screen for the rest of the phone scenes. Keeping the caller
// "on the line" while the victim does things on their own phone is the
// single most characteristic move of this scam.
//
// ONE screen, ONE tap: the full-bleed LINE add-friend card (the account's
// avatar, display name and ID exactly as LINE shows them before you add
// someone) with a single 加入好友 button that goes straight into the
// conversation. There is no confirmation step and no second screen between
// the tap and the chat - the same shape scenario02 uses when it moves the
// player onto LINE.
//
// The anti-fraud reminder is rendered INLINE, in normal flow between the
// profile and the button, never as a floating banner: this screen's primary
// action sits high enough that the portalled FraudWarningBanner (fixed near
// the top of the viewport) landed straight on top of 加入好友, which is what
// made the flow read as "press, nothing happens, press again". An in-flow
// banner occupies its own space, so it can educate without ever covering the
// thing it is warning about. It also carries the one detail a player can
// actually check for themselves - this is an ordinary personal account with
// no official badge - which is what makes this screen worth a stop at all.
export function LineAdd() {
  const navigate = useNavigate();
  const [session] = useState(() => getOrCreateScenarioSession());

  useEffect(() => {
    playSound('lineNotify');
  }, []);

  function addFriend() {
    playSound('click');
    addWarningFlags('moved_to_line');
    navigate('/scenario03-police/line');
  }

  // AR Interaction Contract: one screen, one tap, one story action.
  useARInteraction({ mode: 'single', surfaceId: 'scenario03/line-add', action: addFriend });

  const lang = getScenario03Lang();
  const t = getScenario03Strings();
  const lineAccountDisplayName = getLineAccountDisplayName(session, lang, t.common.policeOfficerSuffix);
  const officer = getOfficerIdentity(session, lang, t.common.policeOfficerSuffix);

  return (
    <PoliceFrame stepKey="line-add" statusTitle={t.lineAdd.statusTitle}>
      <div className="pol-call-pill">{t.lineAdd.callPill(getOfficerDisplayName(session, lang))}</div>

      <div className="pol-lineadd">
        <div className="pol-lineadd-profile">
          <span className="pol-lineadd-kicker">{t.lineAdd.friendRequestBody(lineAccountDisplayName)}</span>
          <LineAvatar name={lineAccountDisplayName} src={officer.avatar} size={96} />
          <span className="pol-lineadd-name">{lineAccountDisplayName}</span>
          <span className="pol-lineadd-id">{t.lineAdd.idLabel(session.lineAccountId)}</span>
          <span className="pol-lineadd-status">{t.lineAdd.statusMessage}</span>
        </div>

        <div className="pol-lineadd-actions">
          <FraudWarningBanner
            inline
            active
            theme="chat"
            severity="notice"
            title={t.lineAdd.lineAddWarningTitle}
            body={<>{t.lineAdd.lineAddWarningBody}<br />{t.lineAdd.accountNote}</>}
          />
          <button type="button" className="pol-cta pol-cta-ok" onClick={addFriend}>{t.lineAdd.addFriend}</button>
        </div>
      </div>
    </PoliceFrame>
  );
}
