import { getShoppingState, saveShoppingState, generateScenarioId } from '../../../lib/shoppingStore';

// The one adapter between Scenario 04's run state and the BlackPi app module.
//
// BlackPi owns the storefront - its shell, its catalog presentation, its screen
// chrome, its own transient UI state - and nothing else. Which product line the
// run is on, the order, and the dispute/return/refund progression are the
// story, and the story's state lives in lib/shoppingStore. This module is the
// only place the app's side of that store is read or written: hosts.jsx calls
// these functions from the app's semantic callbacks, and passes the app plain
// props built by the selectors below.
//
// It is deliberately plain JS rather than JSX so the store transitions the app
// can trigger are directly testable - see scripts/blackpi-store-boundary.test.mjs.

// --- selectors: scenario state -> App props ---------------------------------

// The 訂單 tab shows the run's one order, or nothing before there is one.
export function selectOrderSummary(state) {
  if (!state.selectedRoute) return null;
  return { productRoute: state.selectedRoute, status: state.orderStatus };
}

// 訂單詳情 needs the order itself; the scores, evidence, dialogue history and
// every other story field stay on this side of the boundary.
export function selectOrder(state) {
  return {
    id: state.orderId,
    status: state.orderStatus,
    createdAt: state.orderCreatedAt,
    disputeStatus: state.disputeStatus,
  };
}

// --- App events -> scenario state -------------------------------------------

// Entering the storefront starts the run, once.
export function markRunStarted() {
  const state = getShoppingState();
  if (state.scenarioStartedAt) return state;
  return saveShoppingState({ scenarioStartedAt: Date.now() });
}

// Opening a product is what puts the run on a product line - the same write
// whether it came from the home feed, the search results, or the PDP's
// 賣家聊聊 / 直接購買 actions.
export function selectProduct(product) {
  const route = product?.route;
  if (!route) return getShoppingState();
  return saveShoppingState({ selectedRoute: route });
}

// Searching one of the two story terms puts the run on that product line,
// exactly as opening the product does - this is the store half of what
// features/shopping/searchNav.js used to do for the search page, with the
// route half now in ./routes.js where the rest of them live.
export function selectSearchTerm(route) {
  if (!route) return getShoppingState();
  return saveShoppingState({ selectedRoute: route });
}

// 確認付款. The order id is minted exactly once, here, and never regenerated on
// a re-render or a revisit - which is why every later screen (訂單詳情 /
// 退貨申請 / 客服) can just read orderId back rather than building its own.
export function confirmPurchase(product) {
  const route = product?.route;
  const existing = getShoppingState();
  const sameRoute = existing.selectedRoute === route;
  return saveShoppingState({
    selectedRoute: route,
    orderStatus: 'placed',
    orderId: sameRoute && existing.orderId ? existing.orderId : generateScenarioId('order', route),
    orderCreatedAt: sameRoute && existing.orderCreatedAt ? existing.orderCreatedAt : Date.now(),
  });
}

// 付款成功 settles 已下單 into 已付款.
export function settlePayment() {
  return saveShoppingState({ orderStatus: 'paid' });
}

// Each leg the app's logistics montage reports. The montage's timing is App
// presentation; the status it lands on is scenario state.
export function advanceDelivery(status) {
  return saveShoppingState({ orderStatus: status });
}
