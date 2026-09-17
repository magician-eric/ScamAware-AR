import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { PhoneNumberDisplay } from './components/PhoneNumberDisplay';
import { getOfficerIdentity, getOrCreateScenarioSession, getPoliceUnitDisplay } from '../../lib/session/ScenarioSessionFactory';
import { addWarningFlags, startFirstPoliceCall } from '../../lib/scenario03Store';
import { buzz, playSound, startRingtone } from '../../lib/scenario03Feedback';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Scene 02 - 陌生來電. 接聽 is the ONLY action on this screen, matching the
// prosecutor's own incoming call and the officer's callback later in the run -
// all three scam calls present the same single-button ring screen.
//
// 拒接 is gone, and so is everything it drove: the ring screen used to offer
// 拒接, drop into a "未接來電" beat, and ring a second time from the same
// number, because the point being made was "declining costs you nothing and
// changes nothing - they just call back". Half a minute of dead-end taps to
// arrive at the same 接聽 is a worse way to say that than simply not
// offering the button, so the decline handler, the `declined`/`call2`
// stages and the persisted `declinedFirstCall` flag are all removed rather
// than merely hidden.
//
// The 先傳簡訊查證 off-ramp is gone for the same reason, and it is the last
// thing standing between the player and the officer's conversation: it opened
// a second screen (a text the player sends, an automated refusal, a 回到來電畫面
// button) whose only outcome was the ring screen again. Every player walked
// the same three extra taps to reach the 接聽 they were always going to press.
// The lesson it carried - "the caller ID and the reply both look official, and
// neither proves anything" - is still on this screen, in the callerIdNote line
// under the caller ID, which is where a player actually reads it. The `sms`
// stage, its two message bubbles, the 返回來電 control and the
// tried_to_verify_caller flag write are all removed rather than hidden.
export function IncomingCall() {
  const navigate = useNavigate();
  const [session] = useState(() => getOrCreateScenarioSession());

  useEffect(() => {
    const stop = startRingtone(1500);
    buzz([200, 300, 200]);
    return stop;
  }, []);

  function answer() {
    playSound('click');
    startFirstPoliceCall();
    addWarningFlags('answered_unknown_caller');
    navigate('/scenario03-police/call-stage1');
  }

  // AR Interaction Contract: one screen, one story action. With the SMS
  // off-ramp removed this ring screen carries exactly 接聽, so the geometry is
  // `single` (RIGHT), the same declaration ProsecutorCall and PoliceCallback
  // make on their own ring screens. There is no LEFT here to get backwards -
  // which is what AUD-02 had to correct while the pair existed.
  useARInteraction({
    mode: 'single',
    surfaceId: 'scenario03/incoming-call',
    action: answer,
  });

  const t = getScenario03Strings();
  const lang = getScenario03Lang();
  const policeUnit = getPoliceUnitDisplay(session, lang);
  const org = [policeUnit.department ?? t.common.policeDepartmentFallback, policeUnit.division]
    .filter(Boolean).join(' ');
  const officer = getOfficerIdentity(session, lang, t.common.policeOfficerSuffix);

  return (
    <PoliceFrame stepKey="incoming-call" dark ringing statusTitle={t.incomingCall.statusTitleRinging}>
      <div className="pol-call">
        <div>
          <p className="pol-call-label">{t.incomingCall.callLabel}</p>
          <p className="pol-call-number"><PhoneNumberDisplay number={session.fakePhoneNumber} /></p>
          <p className="pol-call-org">
            {t.incomingCall.callerIdLabel(org)}
            <br />
            <span style={{ opacity: 0.65, fontSize: 'var(--fs-caption)' }}>{t.incomingCall.callerIdNote}</span>
          </p>
        </div>
        <img className="pol-call-avatar" src={officer.avatar} alt={officer.displayName} />
        <div style={{ width: '100%', display: 'grid', gap: 14 }}>
          <div className="pol-call-actions">
            <button type="button" className="pol-call-btn pol-call-btn-answer" onClick={answer}>{t.incomingCall.answer}</button>
          </div>
          <p className="pol-call-decision-note">
            {t.incomingCall.cannotHangUp}
          </p>
        </div>
      </div>
    </PoliceFrame>
  );
}
