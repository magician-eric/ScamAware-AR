// What 幣勝客 sells. The platform has exactly one product - an "AI 智慧套利
// 策略" activated by a single fixed deposit - and both the strategy page and
// the deposit page need to name it when they report what the player just did.
// These are the App's own facts (its catalog), not scenario state: the app
// says "this strategy was activated with this amount" and the hosting
// scenario decides what that means for the run.
export const AI_ARBITRAGE_STRATEGY = 'ai-arbitrage';

// The one amount the deposit screen processes - the same figure its form and
// the strategy page's 最低啟用金額 row display.
export const STRATEGY_ACTIVATION_AMOUNT = 10000;
