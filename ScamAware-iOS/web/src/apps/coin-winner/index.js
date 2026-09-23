// The App module owns its own styling: importing it here is what makes
// mounting any Coin Winner screen bring the 幣勝客 design system with it,
// instead of a page or the global stylesheet having to know about it
// (§13 AD-04). Same shape as apps/line/index.js.
import './styles/index.css';

export { PlatformLanding } from './PlatformLanding';
export { PlatformRegister } from './PlatformRegister';
export { PlatformHome } from './PlatformHome';
export { DepositPage } from './DepositPage';
export { TradingPage } from './TradingPage';
export { WithdrawalPage } from './WithdrawalPage';
export { COIN_WINNER_BRAND, COIN_WINNER_LINK_PREVIEW } from './brand';
export { AI_ARBITRAGE_STRATEGY, STRATEGY_ACTIVATION_AMOUNT } from './catalog';
export {
  HOME_VISIT_BROWSING,
  HOME_VISIT_POST_REGISTRATION,
  HOME_VISIT_PROFIT_UPDATE,
} from './homeVisit';
