import { useRef, useState } from 'react';
import { useStageClassName } from '../../shell/StageClassContext';
import { ReturnBar } from './ReturnBar';
import { AI_ARBITRAGE_STRATEGY } from './catalog';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Section 九 of the story: the strategy detail page the LINE round trip
// hands off to (see s8-end in PrivateChat's NODES). "立即啟用" is what the
// player came here to do (section 十) - this page never shows {datingLead},
// only the strategy's own numbers.
//
// Activating used to cut straight back to the chat in the same frame, before
// the page had shown that anything had happened. It now does what it says:
// the strategy reads 運行中, and the player leaves through 返回 LINE 對話 when
// they are ready. What is reported to the host, and when relative to that
// hand-off, is unchanged - one onStrategyActivated({strategy}) immediately
// before control goes back.
export function TradingPage({ onStrategyActivated = () => {} }) {
  useStageClassName('bition-stage');
  const t = useT();
  const [activated, setActivated] = useState(false);
  const firedRef = useRef(false);

  function activate() {
    setActivated(true);
  }

  function requestReturn() {
    if (firedRef.current) return;
    firedRef.current = true;
    onStrategyActivated({ strategy: AI_ARBITRAGE_STRATEGY });
  }

  // AR Interaction Contract: one story action at a time and never two -
  // 立即啟用 while the strategy is waiting, 返回 LINE 對話 once it is running.
  // The stat rows are display only.
  useARInteraction(activated
    ? { mode: 'single', surfaceId: 'coin-winner/trading-activated', action: requestReturn }
    : { mode: 'single', surfaceId: 'coin-winner/trading', action: activate });

  return (
    <div className="bition-app">
      <header className="bition-sub-header">
        <div className="bition-home-logo small">{t('幣勝客')} <span>BITION</span></div>
      </header>
      <div className="bition-home-scroll">
        <div className="bition-card">
          <h2 className="bition-section-title">{t('AI 智慧套利策略')}</h2>
          <p className="mini">{t('系統透過全球市場價差，自動執行套利配置。')}</p>
          <div className="bition-stat-row"><span>{t('策略市場')}</span><strong>{t('全球多市場套利')}</strong></div>
          <div className="bition-stat-row"><span>{t('預估日收益')}</span><strong>2.8%–6.5%</strong></div>
          <div className="bition-stat-row"><span>{t('策略週期')}</span><strong>{t('24 小時自動運行')}</strong></div>
          <div className="bition-stat-row"><span>{t('最低啟用金額')}</span><strong>10,000 CIBDT</strong></div>
          <div className="bition-stat-row"><span>{t('結算資產')}</span><strong>CIBDT</strong></div>
          {activated
            ? <div className="bition-stat-row"><span>{t('目前狀態')}</span><strong>{t('運行中')}</strong></div>
            : <button type="button" className="bition-btn-primary" onClick={activate}>{t('立即啟用')}</button>}
        </div>
      </div>

      {activated && <ReturnBar onReturn={requestReturn} />}
    </div>
  );
}
