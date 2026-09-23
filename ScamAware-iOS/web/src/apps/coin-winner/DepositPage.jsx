import { useRef, useState } from 'react';
import { useStageClassName } from '../../shell/StageClassContext';
import { ReturnBar } from './ReturnBar';
import { useEventCallback } from './useEventCallback';
import { AI_ARBITRAGE_STRATEGY, STRATEGY_ACTIVATION_AMOUNT } from './catalog';
import { useCountUp } from '../../lib/useCountUp';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Section 十二/十三: purely simulated deposit - no real bank account, wallet
// address, QR code, or transfer instructions anywhere on this page.
export function DepositPage({ onDepositComplete }) {
  const reportDepositComplete = useEventCallback(onDepositComplete);
  useStageClassName('bition-stage');
  const t = useT();
  const [status, setStatus] = useState('form');
  const [animatedTarget, setAnimatedTarget] = useState(0);
  const balance = useCountUp(animatedTarget, 1400);
  const firedRef = useRef(false);

  // AR Interaction Contract: 完成入金 while the form is up, nothing while the
  // deposit is processing (`display`), then 返回 LINE 對話 on the success card
  // - one story action in each state, never two.
  useARInteraction(status === 'form'
    ? { mode: 'single', surfaceId: 'coin-winner/deposit', action: () => confirmDeposit() }
    : status === 'success'
      ? { mode: 'single', surfaceId: 'coin-winner/deposit-success', action: () => requestReturn() }
      : { mode: 'display', surfaceId: 'coin-winner/deposit-processing' });

  function confirmDeposit() {
    setStatus('processing');
    setTimeout(() => {
      setStatus('success');
      setAnimatedTarget(STRATEGY_ACTIVATION_AMOUNT);
    }, 1200);
  }

  // The success card used to report itself finished 2.4s after it appeared,
  // which cut away while the balance was still counting up. It waits for the
  // player now. What is reported - and therefore what the run records - is
  // unchanged: this much went in, and it turned this strategy on. What that
  // does to the run is still the hosting scenario's business.
  function requestReturn() {
    if (firedRef.current) return;
    firedRef.current = true;
    reportDepositComplete({
      amount: STRATEGY_ACTIVATION_AMOUNT,
      strategy: AI_ARBITRAGE_STRATEGY,
    });
  }

  return (
    <div className="bition-app">
      <header className="bition-sub-header">
        <div className="bition-home-logo small">{t('幣勝客')} <span>BITION</span></div>
      </header>
      <div className="bition-home-scroll">
        <div className="bition-card">
          <h2 className="bition-section-title">{t('啟用 AI 智慧套利策略')}</h2>

          {status === 'form' && (
            <>
              <div className="bition-stat-row"><span>{t('入金金額')}</span><strong>10,000 CIBDT</strong></div>
              <div className="bition-stat-row"><span>{t('換算')}</span><strong>{t('約 NT$10,000')}</strong></div>
              <button type="button" className="bition-btn-primary" onClick={confirmDeposit}>{t('完成入金')}</button>
            </>
          )}

          {status === 'processing' && <p className="bition-processing">{t('入金處理中……')}</p>}

          {status === 'success' && (
            <div className="bition-deposit-success">
              <p className="bition-success-line">{t('入金成功')}</p>
              <div className="bition-asset-value large">{balance.toFixed(2)} <span>CIBDT</span> {t('已到帳')}</div>
              <div className="bition-status-pill running">{t('運行中')}</div>
              <div className="bition-fake-chart">
                <svg viewBox="0 0 200 60" className="candlestick-chart">
                  <defs>
                    <linearGradient id="depositChartGlow" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#25d0ff" />
                      <stop offset="100%" stopColor="#39d98a" />
                    </linearGradient>
                  </defs>
                  <path
                    className="trend-line"
                    style={{ stroke: 'url(#depositChartGlow)' }}
                    d="M4,48 L30,40 L58,44 L86,28 L114,32 L142,16 L170,20 L196,6"
                  />
                </svg>
              </div>
              <p className="mini">{t('首次結算倒數：23:59:42')}</p>
            </div>
          )}
        </div>
      </div>

      {status === 'success' && <ReturnBar onReturn={requestReturn} />}
    </div>
  );
}
