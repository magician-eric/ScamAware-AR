import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { OngoingCallIndicator } from './components/OngoingCallIndicator';
import { getOrCreateScenarioSession } from '../../lib/session/ScenarioSessionFactory';
import { addWarningFlags, clearActiveCall, recordChoice, updateScenario03State } from '../../lib/scenario03Store';
import { playSound } from '../../lib/scenario03Feedback';
import { BALANCE_TOTAL, HOTLINE_165, formatNT } from '../../data/scenario03Config';
import { getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Scene 11a - 最後一個決定. Everything before this was designed to make the
// left-hand button feel like the safe, obedient, procedural choice. This is
// the only moment in the run where the two branches genuinely diverge.
//
// The time pressure here is the scammer's, not the bank's: no live
// countdown (a fixed "剩餘 5 分鐘" line reads just as urgent without a
// ticking number pulling attention away from the actual choice), and both
// Pressure stays in the active phone call while the bank renders localized
// text instructions; this avoids bouncing back to LINE during bank work.
export function FinalDecision() {
  const navigate = useNavigate();
  const [session] = useState(() => getOrCreateScenarioSession());
  // 完成轉帳 no longer lands on the ending. The money moving is not the end of
  // the story the player needs to see: the caller says well done, asks them to
  // wait, and then - days later - both accounts are gone. Scene 11a2
  // (Aftermath.jsx) plays that out and routes on to /ending/failure itself.
  // The 165 branch below never goes near it: it resolves to 成功反詐 directly.
  function confirmTransfer() {
    playSound('click');
    recordChoice('final.decision', 'confirm', ['transfer_completed']);
    updateScenario03State({ transferAmount: BALANCE_TOTAL, ending: 'failure' });
    clearActiveCall();
    navigate('/scenario03-police/aftermath');
  }

  // 撥打 165 IS the successful anti-fraud judgement - there is no simulated
  // hotline call in between. Picking up the phone to 165 before the money
  // moves is the whole point of the branch, so the run is decided here: the
  // choice and its warning flag are recorded, the ending is marked success,
  // the scammer's call is dropped and the player goes straight to the
  // 成功反詐 outcome (and on to 詐騙疑點分析／反詐小測驗 from there).
  // No dial tone either: nothing here starts a call the player has to sit
  // through.
  function call165() {
    playSound('click');
    recordChoice('final.decision', 'call165', ['called_165']);
    addWarningFlags('called_165');
    updateScenario03State({ ending: 'success' });
    clearActiveCall();
    navigate('/scenario03-police/ending/success');
  }

  const t = getScenario03Strings();

  // AR Interaction Contract: scenario03's final decision, and the only moment
  // in the run where the two branches genuinely diverge - `dual`, in the
  // buttons' own on-screen order (LEFT = 確認轉帳, RIGHT = 撥打 165).
  useARInteraction({
    mode: 'dual',
    surfaceId: 'scenario03/final-decision',
    left: confirmTransfer,
    right: call165,
  });

  return (
    <PoliceFrame stepKey="decision" statusTitle={t.finalDecision.statusTitle}>
      <div className="pol-bank">
        <OngoingCallIndicator />
        <header className="pol-bank-header">
          <div className="pol-bank-brand">{t.finalDecision.brand}</div>
          <div className="pol-bank-sub">{t.finalDecision.sub}</div>
        </header>
        <div className="pol-bank-body">
          <span className="pol-pressure-badge">{t.finalDecision.badge}</span>
          <div className="pol-bank-instruction"><strong>{t.finalDecision.pressureTitle}</strong><br />{t.finalDecision.pressureText}</div>
          <section className="pol-bank-balance">
            <div className="label">{t.finalDecision.balanceLabel}</div>
            <div className="amount" style={{ color: '#ec3013' }}>{formatNT(BALANCE_TOTAL)}</div>
            <div className="pol-bank-row"><span>{t.finalDecision.toAccountLabel}</span><span>{session.fakeBankAccount}</span></div>
            <div className="pol-bank-row"><span>{t.finalDecision.noteLabel}</span><span>{session.caseNumber}</span></div>
          </section>
          {/* AUD-06: pol-choices-split is the existing two-column modifier the
              in-call ownership question already uses - this screen's contract
              is `dual` too, so it gets the same geometry rather than a second
              one invented for it. 照對方說的 stays first and stays LEFT. */}
          <div className="pol-choices pol-choices-split" style={{ background: '#fff', border: '1px solid #dfe4ee' }}>
            <p className="pol-choices-prompt" style={{ color: '#6b7484' }}>{t.finalDecision.prompt}</p>
            <button type="button" className="pol-choice-btn" style={{ background: '#f3f5f9', color: '#16181d', borderColor: '#dfe4ee' }} onClick={confirmTransfer}>
              {t.finalDecision.confirmOption}
            </button>
            <button type="button" className="pol-choice-btn" style={{ background: '#f3f5f9', color: '#16181d', borderColor: '#dfe4ee' }} onClick={call165}>
              {t.finalDecision.call165Option(HOTLINE_165)}
            </button>
          </div>
        </div>
      </div>
    </PoliceFrame>
  );
}
