// Test-only stand-in for src/apps/gugo-invest/app, used by
// scripts/outcome-reachability.test.mjs.
//
// GuGo Invest's React surface is TypeScript (apps/gugo-invest/app/index.ts)
// and scripts/jsx-test-loader.mjs deliberately resolves only .js/.jsx - see
// that index's own header for why the boundary is drawn there. So
// scenario01's WithdrawFail cannot be imported at all while the real platform
// card is in the way.
//
// What the reachability suite needs off that screen is not the platform's
// card: it is scenario01's own final decision, which WithdrawFail keeps on
// its side of the boundary precisely so that a platform cannot route the
// player to an ending (see that file's header). This stub therefore renders
// the `actions` and `children` the scenario hands in and nothing else - the
// two <Button to> the scenario owns stay exactly as the scenario wrote them,
// and the screen's own hooks, its AR Interaction Contract included, run for
// real.
//
// Written with React.createElement rather than JSX on purpose: it lives
// outside src/, which is the only place the JSX loader compiles.
import React from 'react';

export function WithdrawalResult({ actions, children }) {
  return React.createElement('div', null, children, actions);
}
