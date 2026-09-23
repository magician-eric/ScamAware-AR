import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlatformLanding,
  PlatformRegister,
  PlatformHome,
  DepositPage,
  TradingPage,
  WithdrawalPage,
} from '../../apps/coin-winner';
import { useSaveScenario02Progress, usePlatformState, switchToLine } from '../../lib/scenario02Store';
import { getDatingLeadReferralCode } from './i18n';
import {
  completeRegistration,
  depositCompletedPatch,
  profitReviewedPatch,
  registrationVisitCompletePatch,
  selectHomeVisit,
  selectPortfolio,
  selectStrategyRunning,
  selectWithdrawalPortfolio,
  strategyActivatedPatch,
  withdrawalFailedPatch,
} from './coinWinnerAppState';

// Scenario 02 owns everything the 幣勝客 (Coin Winner) app module is mounted
// into: every route it leads to, and every piece of run state it shows or
// changes. The app module itself only renders its screens, reports what the
// player did (or what finished on its own), and is handed the figures it
// displays as plain props.
//
// So these wrappers are the whole boundary. They read lib/scenario02Store,
// pass the app the minimum it needs to draw a screen, and turn the app's
// semantic callbacks into a scenario step - a platform route, the trip back to
// datingLead's LINE chat, or a store write - with every one of those
// transitions living in ./coinWinnerAppState.js. Nothing under
// apps/coin-winner/ knows that a scenario02 route or a scenario02 store
// exists; scripts/validate-app-boundaries.mjs fails the build if it does.
export const COIN_WINNER_ROUTES = {
  landing: '/scenario02-romance/platform-landing',
  register: '/scenario02-romance/platform-register',
  home: '/scenario02-romance/platform-home',
  deposit: '/scenario02-romance/deposit',
  trading: '/scenario02-romance/trading',
  withdrawal: '/scenario02-romance/withdrawal',
};

export function CoinWinnerLandingPage() {
  useSaveScenario02Progress(COIN_WINNER_ROUTES.landing);
  const navigate = useNavigate();
  const onStart = useCallback(() => navigate(COIN_WINNER_ROUTES.register), [navigate]);
  return <PlatformLanding onStart={onStart} />;
}

// The referral code on the sign-up form is datingLead's, derived from this
// run's drawn cast - so it is read here and handed over, rather than the
// platform reaching into scenario02's casting for it (§13 AD-14).
// 建立帳戶 lands as two events: the account existing is persisted the moment
// the success card appears, and the hop to 平台首頁 happens a beat later -
// exactly the two moments the app used to handle itself.
export function CoinWinnerRegisterPage() {
  useSaveScenario02Progress(COIN_WINNER_ROUTES.register);
  const navigate = useNavigate();
  const onRegistrationComplete = useCallback(() => navigate(COIN_WINNER_ROUTES.home), [navigate]);
  return (
    <PlatformRegister
      referralCode={getDatingLeadReferralCode()}
      onAccountCreated={completeRegistration}
      onRegistrationComplete={onRegistrationComplete}
    />
  );
}

// The post-registration visit ends by itself (the app's own 5s beat) and so
// do the two profit check-ins; both come back here as events, and going back
// to LINE from them is this scenario's decision, not the app's. Which of the
// three kinds of visit this is, and the numbers on screen, are read from the
// run state here - the app is only told what to draw.
export function CoinWinnerHomePage() {
  useSaveScenario02Progress(COIN_WINNER_ROUTES.home);
  const navigate = useNavigate();
  const [platform] = usePlatformState();
  const onProfitReviewed = useCallback(
    () => switchToLine(navigate, profitReviewedPatch()),
    [navigate],
  );
  const onRegistrationVisitComplete = useCallback(
    () => switchToLine(navigate, registrationVisitCompletePatch()),
    [navigate],
  );
  return (
    <PlatformHome
      portfolio={selectPortfolio(platform)}
      strategyRunning={selectStrategyRunning(platform)}
      visit={selectHomeVisit(platform)}
      onProfitReviewed={onProfitReviewed}
      onRegistrationVisitComplete={onRegistrationVisitComplete}
    />
  );
}

export function CoinWinnerDepositPage() {
  useSaveScenario02Progress(COIN_WINNER_ROUTES.deposit);
  const navigate = useNavigate();
  const onDepositComplete = useCallback(
    (deposit) => switchToLine(navigate, depositCompletedPatch(deposit)),
    [navigate],
  );
  return <DepositPage onDepositComplete={onDepositComplete} />;
}

export function CoinWinnerTradingPage() {
  useSaveScenario02Progress(COIN_WINNER_ROUTES.trading);
  const navigate = useNavigate();
  const onStrategyActivated = useCallback(
    (activation) => switchToLine(navigate, strategyActivatedPatch(activation)),
    [navigate],
  );
  return <TradingPage onStrategyActivated={onStrategyActivated} />;
}

export function CoinWinnerWithdrawalPage() {
  useSaveScenario02Progress(COIN_WINNER_ROUTES.withdrawal);
  const navigate = useNavigate();
  const [platform] = usePlatformState();
  const onWithdrawalFailed = useCallback(
    () => switchToLine(navigate, withdrawalFailedPatch()),
    [navigate],
  );
  return (
    <WithdrawalPage
      portfolio={selectWithdrawalPortfolio(platform)}
      onWithdrawalFailed={onWithdrawalFailed}
    />
  );
}
