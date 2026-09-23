import { useRef, useState } from 'react';
import { useStageClassName } from '../../shell/StageClassContext';
import { ReturnBar } from './ReturnBar';
import { useEventCallback } from './useEventCallback';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Section 十七/十八: withdrawal request followed by the scripted failure
// (a "resource security verification" demand). The failure card is the whole
// point of the visit, so nothing lets the player skip past it - and nothing
// takes it away from them either: it used to hand control back 1s after it
// appeared, which was barely long enough to read the demand it exists to
// teach. It stays up until the player leaves through 返回 LINE 對話.
// portfolio: the figures this screen quotes back at the player, handed in by
// the host - the app has no idea how the run got to them.
export function WithdrawalPage({ portfolio = {}, onWithdrawalFailed }) {
  const reportWithdrawalFailed = useEventCallback(onWithdrawalFailed);
  useStageClassName('bition-stage');
  const t = useT();
  const [phase, setPhase] = useState('form');
  const total = portfolio.balance ?? 0;
  const profit = portfolio.profit ?? 0;
  const firedRef = useRef(false);

  function requestWithdrawal() {
    setPhase('reviewing');
    setTimeout(() => setPhase('failed'), 1500);
  }

  function requestReturn() {
    if (firedRef.current) return;
    firedRef.current = true;
    reportWithdrawalFailed();
  }

  // AR Interaction Contract: 確認提領 while the form is up, nothing while the
  // request is under review (`display`), then 返回 LINE 對話 on the failure
  // card. The 完成安全驗證 button on that card stays deliberately disabled and
  // is not the declared action - so a gesture cannot run it either, exactly as
  // before; the one thing LEFT/RIGHT can reach here is the way back.
  useARInteraction(phase === 'form'
    ? { mode: 'single', surfaceId: 'coin-winner/withdrawal', action: requestWithdrawal }
    : phase === 'failed'
      ? { mode: 'single', surfaceId: 'coin-winner/withdrawal-failed', action: requestReturn }
      : { mode: 'display', surfaceId: 'coin-winner/withdrawal-reviewing' });

  return (
    <div className="bition-app">
      <header className="bition-sub-header">
        <div className="bition-home-logo small">{t('幣勝客')} <span>BITION</span></div>
      </header>
      <div className="bition-home-scroll">
        <div className="bition-card">
          <h2 className="bition-section-title">{t('申請提領')}</h2>
          <div className="bition-stat-row"><span>{t('總資產估值')}</span><strong>{total.toFixed(2)} CIBDT</strong></div>
          <div className="bition-stat-row"><span>{t('累積收益')}</span><strong>+{profit.toFixed(2)} CIBDT</strong></div>

          {phase === 'form' && (
            <>
              <div className="bition-stat-row"><span>{t('可提領資產')}</span><strong>{total.toFixed(2)} CIBDT</strong></div>
              <div className="bition-stat-row"><span>{t('預計到帳')}</span><strong>NT${Math.round(total).toLocaleString()}</strong></div>
              <button type="button" className="bition-btn-primary" onClick={requestWithdrawal}>{t('確認提領')}</button>
            </>
          )}

          {phase === 'reviewing' && <p className="bition-processing">{t('提領申請審核中……')}</p>}

          {phase === 'failed' && (
            <div className="bition-withdraw-failed">
              <h3>{t('提領暫時無法完成')}</h3>
              <p>{t('您的帳戶尚未完成資金安全驗證。完成驗證後，即可恢復完整提領權限。')}</p>
              <div className="bition-stat-row"><span>{t('資金安全驗證金')}</span><strong>NT$30,000</strong></div>
              <button type="button" className="bition-btn-primary" disabled>{t('完成安全驗證')}</button>
            </div>
          )}
        </div>
      </div>

      {phase === 'failed' && <ReturnBar onReturn={requestReturn} />}
    </div>
  );
}
