import { useRef, useState } from 'react';
import { Bell, User } from 'lucide-react';
import { useStageClassName } from '../../shell/StageClassContext';
import { ReturnBar } from './ReturnBar';
import { useEventCallback } from './useEventCallback';
import {
  HOME_VISIT_BROWSING,
  HOME_VISIT_POST_REGISTRATION,
  HOME_VISIT_PROFIT_UPDATE,
} from './homeVisit';
import { useCountUp } from '../../lib/useCountUp';
import { useT } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Stable ids for tab state/comparisons - kept separate from the displayed
// (and localized) label so switching language never changes which tab is
// "active", only what its button reads.
const TABS = [
  { id: 'home', label: '首頁' },
  { id: 'market', label: '市場' },
  { id: 'strategy', label: '策略' },
  { id: 'assets', label: '資產' },
  { id: 'me', label: '我的' },
];

const POOLS = [
  { name: '全球趨勢池', change: '+3.82%', nodes: 24 },
  { name: '跨市場套利池', change: '+2.46%', nodes: 18 },
  { name: '智能網格池', change: '+4.15%', nodes: 32 },
];

// Fictional, constantly-scrolling "recent executions" feed - purely a
// visual simulation (no real trade data, no real coin names) that makes the
// home screen read as "actively running" rather than a static page.
const TICKER_ROWS = [
  '20:31:12　跨市場價差捕捉　+12.6 CIBDT',
  '20:31:08　智能網格結算　　+8.2 CIBDT',
  '20:30:54　全球趨勢套利　　+16.4 CIBDT',
  '20:30:41　跨市場價差捕捉　+9.8 CIBDT',
  '20:30:22　智能網格結算　　+11.3 CIBDT',
];

// Everything on this screen comes in as props: the numbers to show
// (portfolio), whether the strategy is running, and what kind of visit this
// is. Two visits end by handing control back, and which one this is decides
// which event that return reports:
//   onProfitReviewed - the player came to look at a new profit number
//     (HOME_VISIT_PROFIT_UPDATE) and is done looking,
//   onRegistrationVisitComplete - the first visit after 建立帳戶
//     (HOME_VISIT_POST_REGISTRATION) is over.
//
// Both used to fire on a timer, which is what made the platform flash past:
// the screen reported itself finished after 2.6s / 5s whether or not the
// player had taken any of it in. Neither waits on a clock now - the player
// reads the screen for as long as they want and leaves through the
// 返回 LINE 對話 bar at the bottom. The events, their payloads and where the
// host sends them are unchanged; only what triggers them moved.
export function PlatformHome({
  portfolio = {},
  strategyRunning = false,
  visit = HOME_VISIT_BROWSING,
  onProfitReviewed,
  onRegistrationVisitComplete,
}) {
  const reportProfitReviewed = useEventCallback(onProfitReviewed);
  const reportRegistrationVisitComplete = useEventCallback(onRegistrationVisitComplete);
  useStageClassName('bition-stage');
  const t = useT();
  const [tab] = useState('home');
  const firedRef = useRef(false);

  // Which event this visit's return reports. `browsing` is not one of the
  // scripted visits - it is what a deep link or a dev reload lands on - and
  // the host wires no way back for it, so it gets no bar and no action.
  const reportReturn = visit === HOME_VISIT_PROFIT_UPDATE
    ? reportProfitReviewed
    : visit === HOME_VISIT_POST_REGISTRATION
      ? reportRegistrationVisitComplete
      : null;

  // The firedRef guard is what it always was, just moved from the timer to
  // the tap: a double-press (or a gesture landing on the same frame as a
  // touch) must still report the visit exactly once.
  function requestReturn() {
    if (!reportReturn || firedRef.current) return;
    firedRef.current = true;
    reportReturn();
  }

  // AR Interaction Contract: 返回 LINE 對話 is now this screen's one story
  // action - and still its only one. The header icons, the quick-actions row
  // and the bottom tabs stay aria-hidden / aria-disabled decoration, so the
  // bar is the whole contract: `single`. A visit with nothing to return to
  // has no callable action, which the contract resolves to `display` by
  // itself rather than leaving a gesture pointed at nothing.
  useARInteraction({
    mode: 'single',
    surfaceId: 'coin-winner/home',
    action: reportReturn ? requestReturn : null,
  });

  const balance = useCountUp(portfolio.balance ?? 0);
  const profit = useCountUp(portfolio.profit ?? 0);
  const running = strategyRunning;

  return (
    <div className="bition-app">
      <header className="bition-home-header">
        <div className="bition-home-logo">
          {t('幣勝客')}
          <span>BITION</span>
        </div>
        <div className="bition-home-icons">
          <span aria-hidden="true"><Bell size={18} /></span>
          <span aria-hidden="true"><User size={18} /></span>
        </div>
      </header>

      <div className="bition-home-scroll">
        {tab === 'home' && (
          <>
            <div className="bition-card bition-asset-card">
              <div className="bition-asset-label">{t('我的資產')}</div>
              <div className="bition-asset-value">{balance.toFixed(2)} <span>CIBDT</span></div>
              <div className="bition-asset-sub">≈ NT${Math.round(balance).toLocaleString()}</div>
              <div className="bition-asset-profit">
                <span>{t('今日收益')}</span>
                <strong className={profit > 0 ? 'up bition-pulse' : ''}>{profit.toFixed(2)} CIBDT</strong>
              </div>
              <svg viewBox="0 0 200 40" className="bition-asset-trend" aria-hidden="true">
                <defs>
                  <linearGradient id="homeChartGlow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#25d0ff" />
                    <stop offset="100%" stopColor="#39d98a" />
                  </linearGradient>
                </defs>
                <path
                  className="trend-line bition-trend-line"
                  style={{ stroke: 'url(#homeChartGlow)' }}
                  d="M4,32 L30,26 L58,29 L86,18 L114,22 L142,10 L170,14 L196,4"
                />
              </svg>
              <div className="bition-quick-actions">
                {['入金', '提領', '轉換', '紀錄'].map((label) => (
                  <div key={label} className="bition-quick-action" aria-disabled="true">
                    <span>{t(label)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bition-card bition-strategy-card">
              <div className="bition-strategy-head">
                <div>
                  <div className="bition-strategy-name">{t('AI 智慧套利策略')}</div>
                  <div className="bition-strategy-desc">{t('全球多市場價格差自動追蹤')}</div>
                </div>
                <span className={`bition-status-pill ${running ? 'running' : ''}`}>
                  {running ? t('運行中') : t('等待啟用')}
                </span>
              </div>
              <div className="bition-strategy-grid">
                <div><span>{t('預估日收益')}</span><strong>2.8%–6.5%</strong></div>
                <div><span>{t('策略類型')}</span><strong>{t('穩健型')}</strong></div>
                <div><span>{t('結算資產')}</span><strong>CIBDT</strong></div>
              </div>
            </div>

            <div className="bition-pools">
              {POOLS.map((p) => (
                <div key={p.name} className="bition-card bition-pool-card">
                  <div className="bition-pool-name"><span className="bition-node-dot" />{t(p.name)}</div>
                  <div className="bition-pool-row"><span>{t('今日收益')}</span><strong className="up">{p.change}</strong></div>
                  <div className="bition-pool-row"><span>{t('運行節點')}</span><strong>{p.nodes}</strong></div>
                </div>
              ))}
            </div>

            <div className="bition-card bition-ticker-card">
              <div className="bition-section-title small">{t('即時策略執行紀錄')}</div>
              <div className="bition-ticker">
                <div className="bition-ticker-track">
                  {[...TICKER_ROWS, ...TICKER_ROWS].map((row, i) => (
                    <div className="bition-ticker-row" key={i}>{t(row)}</div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === 'market' && (
          <div className="bition-card">
            <h2 className="bition-section-title">{t('全球多市場套利')}</h2>
            {POOLS.map((p) => (
              <div key={p.name} className="bition-stat-row">
                <span>{t(p.name)}</span>
                <strong className="up">{p.change}</strong>
              </div>
            ))}
          </div>
        )}

        {tab === 'strategy' && (
          <div className="bition-card">
            <h2 className="bition-section-title">{t('AI 智慧套利策略')}</h2>
            <div className="bition-stat-row"><span>{t('策略市場')}</span><strong>{t('全球多市場套利')}</strong></div>
            <div className="bition-stat-row"><span>{t('預估日收益')}</span><strong>2.8%–6.5%</strong></div>
            <div className="bition-stat-row"><span>{t('結算資產')}</span><strong>CIBDT</strong></div>
            <div className="bition-stat-row"><span>{t('目前狀態')}</span><strong>{running ? t('運行中') : t('等待啟用')}</strong></div>
          </div>
        )}

        {tab === 'assets' && (
          <div className="bition-card">
            <h2 className="bition-section-title">{t('資產總覽')}</h2>
            <div className="bition-stat-row"><span>{t('CIBDT 餘額')}</span><strong>{balance.toFixed(2)} CIBDT</strong></div>
            <div className="bition-stat-row"><span>{t('累積收益')}</span><strong>{profit.toFixed(2)} CIBDT</strong></div>
          </div>
        )}

        {tab === 'me' && (
          <div className="bition-card">
            <h2 className="bition-section-title">{t('我的')}</h2>
            <div className="bition-stat-row"><span>{t('推薦人')}</span><strong>EMILY88</strong></div>
            <div className="bition-stat-row"><span>{t('服務條款')}</span><strong>{t('使用者服務協議')}</strong></div>
          </div>
        )}
      </div>

      <nav className="bition-bottom-nav">
        {TABS.map((tabItem) => (
          <div
            key={tabItem.id}
            className={tabItem.id === 'home' ? 'active' : ''}
            aria-hidden="true"
          >
            {t(tabItem.label)}
          </div>
        ))}
      </nav>

      {reportReturn && <ReturnBar onReturn={requestReturn} />}
    </div>
  );
}
