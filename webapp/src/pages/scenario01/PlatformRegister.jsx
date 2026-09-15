import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useT, getScenario01Lang } from './i18n';
import { useStageClassName } from '../../shell/StageClassContext';
import { GuGoInvestApp } from '../../apps/gugo-invest/app';
import { GUGO_ONBOARDING_STAGES } from '../../apps/gugo-invest';
import { useARInteraction } from '../../lib/arInteraction';

// The full GuGo Invest trading-platform simulator, mounted here as an App
// module (src/apps/gugo-invest/) so the moment the player lands on this step,
// what they see already IS the real GuGo Invest CIS - the same full-bleed
// "no chrome, just the platform + one CTA" pattern VideoTeacher uses.
//
// It used to be an <iframe> pointing at /gugo-invest/dist/, a second app
// built and deployed separately. Same screens, but as a foreign document it
// had no access to the run's language (passed as a ?lang= query it re-parsed
// on load), it re-downloaded its own React, and scenario01 could not reach
// into it. Now it is ordinary React in this tree: one bundle, one router, and
// the language is handed straight down.
//
// GuGo owns everything under this route, hence the splat in routes.jsx; its
// own internal routes ("/", "/markets", "/stock/2330", "/portfolio") hang off
// GUGO_MOUNT_PATH.
export const GUGO_MOUNT_PATH = '/scenario01-investment/platform-register';

// scenario01's own chrome around the platform, and the only part of this page
// that is scenario01's to declare to the AR Interaction Contract.
//
// It is a component rather than inline JSX because it must only be mounted
// when it is actually on screen: while the platform is still walking the
// player through register / 入金, GuGo's own onboarding screens are the active
// contract (see apps/gugo-invest/app/pages/onboarding/), and exactly one
// surface may hold the contract at a time. Mounting this footer only in the
// funded state is what keeps that true, in both directions - the footer takes
// over the moment it appears, and never shadows the platform before then.
function GuGoStoryFooter({ showPortfolio, onViewHoldings, onContinue, t }) {
  useARInteraction(showPortfolio
    ? { mode: 'single', surfaceId: 'scenario01/platform-register/continue', action: onContinue }
    : { mode: 'single', surfaceId: 'scenario01/platform-register/holdings', action: onViewHoldings });

  return (
    <div className="gugo-embed-footer">
      {showPortfolio ? (
        <Button onClick={onContinue}>{t('前往下一步')}</Button>
      ) : (
        <Button onClick={onViewHoldings}>{t('查看 AI 智慧量化合約持股')}</Button>
      )}
    </div>
  );
}

export function PlatformRegister() {
  useStageClassName('gugo-stage');
  const navigate = useNavigate();
  const t = useT();
  // Where the player is inside GuGo's own onboarding - register, then the
  // deposit offer, then a funded account - reported by the platform itself
  // (see apps/gugo-invest/index.js). The story needs it because this page's
  // footer is scenario01's chrome wrapped around a platform that runs its own
  // steps inside it, and those steps are the story here: the player opens an
  // account, and only afterwards puts money in.
  const [stage, setStage] = useState(GUGO_ONBOARDING_STAGES.register);
  const funded = stage === GUGO_ONBOARDING_STAGES.funded;
  // Two-stage CTA: the AI quant contract has already bought real stocks by
  // the time this footer button is reachable, so "完成註冊" (finish
  // registering) no longer describes what's actually happening. The first
  // tap instead proves the purchase really happened by sending the app to
  // GuGo Invest's own Portfolio/holdings page; only the second tap (now
  // genuinely "continue") advances scenario01 to Profit.
  //
  // Kept as scenario01's own state rather than read back off the URL: the
  // player can also reach Portfolio through GuGo's bottom nav, and that must
  // not skip a step of the story, exactly as it did not when this was an
  // iframe the scenario could not see into.
  const [showPortfolio, setShowPortfolio] = useState(false);

  return (
    <div className="gugo-embed">
      <div className="gugo-embed-frame">
        <GuGoInvestApp
          basePath={GUGO_MOUNT_PATH}
          language={getScenario01Lang()}
          onOnboardingStageChange={setStage}
        />
      </div>
      {/* Nothing of scenario01's is drawn over the platform until the deposit
          is done. "查看 AI 智慧量化合約持股" is a promise there is something to
          look at, and during register / the deposit offer there is not: the
          player has just opened an account and the contract has bought
          nothing. Offering it there let the story run ahead of itself, and
          let a tap jump the platform's own onboarding.

          The whole footer goes, not just the button inside it - it is a
          bordered, padded bar, so an emptied one would leave a strip of
          scenario chrome sitting under a platform that is meant to be
          full-bleed until it has something to say. */}
      {funded ? (
        <GuGoStoryFooter
          t={t}
          showPortfolio={showPortfolio}
          onViewHoldings={() => {
            setShowPortfolio(true);
            navigate(`${GUGO_MOUNT_PATH}/portfolio`);
          }}
          onContinue={() => navigate('/scenario01-investment/profit')}
        />
      ) : null}
    </div>
  );
}
