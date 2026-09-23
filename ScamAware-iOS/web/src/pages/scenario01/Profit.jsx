import { useNavigate } from 'react-router-dom';
import { ProfitOverview } from '../../apps/gugo-invest/app';
import { useStageClassName } from '../../shell/StageClassContext';
import { getScenario01Lang } from './i18n';

// The step where the platform shows the player their "profits". Everything
// visible here - the brand header, the balance counting up, the candlestick
// chart, the return tiers, the quick-actions bar - is GuGo Invest's own
// asset-overview screen, and lives with the rest of that app in
// src/apps/gugo-invest/. This page used to render a second copy of all of it.
//
// What is left is what scenario01 actually owns: that this step comes after
// the platform, that the page scrolls (the one page on the site allowed to -
// see .scroll-stage), and that tapping "request withdrawal" is what walks the
// player into the deposit scam.
export function Profit() {
  useStageClassName('scroll-stage');
  const navigate = useNavigate();

  return (
    <ProfitOverview
      language={getScenario01Lang()}
      onRequestWithdrawal={() => navigate('/scenario01-investment/withdraw-fail')}
    />
  );
}
