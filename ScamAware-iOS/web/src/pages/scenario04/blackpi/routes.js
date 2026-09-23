// Every Scenario 04 route the BlackPi app module used to navigate to itself.
//
// BlackPi is a storefront App: it renders its screens and reports what the
// shopper did. Where any of that leads is this scenario's decision, so the
// route literals live here - the single place in the codebase that knows the
// BlackPi surface of Scenario 04 has URLs at all (the same shape as Scenario
// 02's COIN_WINNER_ROUTES in pages/scenario02/CoinWinnerScreens.jsx).
//
// Deliberately plain JS rather than JSX so the event -> route mapping is
// directly testable - see scripts/blackpi-navigation-boundary.test.mjs.
// Paths are spelled out in full rather than composed from a base constant so
// that a route stays greppable from the route table in src/routes.jsx.

export const BLACKPI_ROUTES = {
  splash: '/scenario04-shopping/splash',
  home: '/scenario04-shopping/home',
  search: '/scenario04-shopping/search',
  orders: '/scenario04-shopping/orders',
  messages: '/scenario04-shopping/messages',
  category: '/scenario04-shopping/category',
  me: '/scenario04-shopping/me',
  searchResults: (route) => `/scenario04-shopping/search-results/${route}`,
  product: (route) => `/scenario04-shopping/product/${route}`,
  sellerChat: (route) => `/scenario04-shopping/seller-chat/${route}`,
  checkout: (route) => `/scenario04-shopping/checkout/${route}`,
  paymentSuccess: (route) => `/scenario04-shopping/payment-success/${route}`,
  order: (route) => `/scenario04-shopping/order/${route}`,
  unboxing: (route) => `/scenario04-shopping/unboxing/${route}`,
  disputeChat: (route) => `/scenario04-shopping/dispute-chat/${route}`,
  refundCenter: (route) => `/scenario04-shopping/refund-center/${route}`,
  platformSupport: (route) => `/scenario04-shopping/platform-support/${route}`,
};

// There is deliberately no tab-route map here any more. The App's bottom bar
// used to report the tapped tab and this module turned it into one of the five
// URLs above; the bar is scenery now (apps/blackpi/components/BottomNav.jsx),
// so nothing reports a tab and nothing may resolve one. The five screens stay
// mounted in routes.jsx and stay in the map above - what is gone is the
// mechanism that let fake App chrome move the player off the scripted run.
