import {
  HOME_VISIT_BROWSING,
  HOME_VISIT_POST_REGISTRATION,
  HOME_VISIT_PROFIT_UPDATE,
} from '../../apps/coin-winner/homeVisit';
import { savePlatformState } from '../../lib/scenario02Store';

// The one adapter between Scenario 02's platform run state and the Coin
// Winner app module.
//
// Coin Winner owns the 幣勝客 storefront - its screens, its brand, its
// catalog, its own transient UI state - and nothing else. Everything this
// scenario's run is actually made of - whether the player has registered or
// deposited, how much the "portfolio" is showing, which scripted beat brought
// them back to the platform - is story state and lives in lib/scenario02Store,
// which only this layer touches. CoinWinnerScreens.jsx reads the store through
// the selectors below, hands the app plain props, and turns the app's semantic
// callbacks back into the writes here.
//
// It is deliberately plain JS rather than JSX so the store transitions the app
// can trigger are directly testable - see
// scripts/coin-winner-store-boundary.test.mjs.
//
// The visit vocabulary is imported from the app's own plain-JS module rather
// than restated here, so the two sides of that prop cannot drift apart.

// --- selectors: scenario run state -> App props ------------------------------

// The two numbers 平台首頁 puts on screen. Registration/deposit flags, the
// scripted step and the withdrawal progression stay on this side.
export function selectPortfolio(state) {
  return { balance: state.balance ?? 0, profit: state.profit ?? 0 };
}

// 申請提領 quotes the same figures back at the player. It is only ever reached
// after 十六 has already grown the balance, so these fallbacks are what a
// direct visit (a deep link, a dev reload) sees rather than zeroes - the
// numbers the story would have put there.
const WITHDRAWAL_FALLBACK_BALANCE = 38640;
const WITHDRAWAL_FALLBACK_PROFIT = 28640;

export function selectWithdrawalPortfolio(state) {
  return {
    balance: state.balance || WITHDRAWAL_FALLBACK_BALANCE,
    profit: state.profit || WITHDRAWAL_FALLBACK_PROFIT,
  };
}

// The two scripted beats where {datingLead} asks the player to go and look at
// a bigger number (PrivateChat's s15-check-goto / s17-check-goto). The app is
// told "this is a profit check-in", never which step it came from.
const PROFIT_CHECK_IN_STEPS = new Set(['stage1', 'stage3']);

// Why the player is on 平台首頁 this time. 'post-registration' is the visit
// right after 建立帳戶 - registered, nothing deposited yet, no scripted step
// running - which is the one that returns to LINE on its own after 5s.
export function selectHomeVisit(state) {
  if (PROFIT_CHECK_IN_STEPS.has(state.platformStep)) return HOME_VISIT_PROFIT_UPDATE;
  if (state.platformStep === 'idle' && state.registrationCompleted && !state.depositCompleted) {
    return HOME_VISIT_POST_REGISTRATION;
  }
  return HOME_VISIT_BROWSING;
}

// Whether 智慧套利策略 reads as 運行中 rather than 等待啟用.
export function selectStrategyRunning(state) {
  return Boolean(state.depositCompleted);
}

// --- App events -> scenario run state ----------------------------------------

// 建立帳戶 succeeded. The only write that does not also hand control back to
// LINE: the player stays on the success card for its beat afterwards, and
// 平台首頁 needs these flags already set when that beat sends them onward.
export function completeRegistration() {
  return savePlatformState({
    registrationCompleted: true,
    termsAccepted: true,
    accountCreated: true,
    page: 'home',
  });
}

// The remaining four are patch builders rather than writers: each one is
// handed straight to switchToLine(), which persists it and leaves for
// datingLead's chat in a single step.

// A profit check-in has been seen. The numbers themselves were already set by
// the chat node that sent the player here, so there is nothing to update.
export function profitReviewedPatch() {
  return { page: 'home' };
}

// The post-registration visit is over. Re-asserting the registration flags
// keeps this trip back to LINE self-contained even if the account-created
// write never landed (private mode, a cleared session).
export function registrationVisitCompletePatch() {
  return {
    page: 'home',
    registrationCompleted: true,
    accountCreated: true,
    termsAccepted: true,
  };
}

// 立即啟用 on the strategy page: the app reports which strategy, this side
// decides that "selected" is what the run records.
export function strategyActivatedPatch({ strategy = null } = {}) {
  return { page: 'strategy', selectedStrategy: strategy };
}

// 入金 completed. The app reports the amount it processed and the strategy it
// turned on; the run's money - balance, the profit that has not accrued yet -
// and the fact that the strategy is now running are recorded here.
export function depositCompletedPatch({ amount = 0, strategy = null } = {}) {
  return {
    depositCompleted: true,
    selectedStrategy: strategy,
    balance: amount,
    profit: 0,
    platformStep: 'running',
    page: 'deposit-success',
  };
}

// The scripted withdrawal failure (十七/十八). Where the run goes from here is
// PrivateChat's business; this only records that it failed.
export function withdrawalFailedPatch() {
  return { page: 'withdrawal-failed', withdrawalStep: 'failed' };
}
