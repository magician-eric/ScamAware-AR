import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Splash, Home, Search, SearchResults, ProductDetail, Checkout,
  PaymentSuccess, Orders, OrderDetail, Messages, Category, Me,
} from '../../../apps/blackpi';
import { useShoppingState } from '../../../lib/shoppingStore';
import { useARInteraction } from '../../../lib/arInteraction';
import { BLACKPI_ROUTES } from './routes';
import {
  selectOrder, selectOrderSummary, markRunStarted, selectProduct,
  selectSearchTerm, confirmPurchase, settlePayment, advanceDelivery,
} from './appState';

// Scenario 04's hosts for the BlackPi app module.
//
// BlackPi is a storefront: it owns its shell, its catalog presentation, its
// screen chrome and its own transient UI state, and nothing else. Everything
// this scenario's run is actually made of - which product line the player is
// on, the order, the dispute/return/refund progression - is scenario state and
// lives in lib/shoppingStore, which only this layer touches. Everything about
// where the player goes next is this scenario's story, and its routes live in
// ./routes.js, which only this layer reads.
//
// So every BlackPi screen that used to reach into that store, or navigate to a
// scenario route, is mounted here instead: the host reads the store, hands the
// app exactly the data it needs as props, and turns the app's semantic
// callbacks (the shopper opened a product, confirmed a payment, asked to open
// the parcel, tapped the 訂單 tab) back into store writes - every one of those
// transitions living in ./appState.js - and into navigation. The app never
// learns that any of this is a scenario, or that it has URLs at all. See
// scripts/validate-app-boundaries.mjs, which fails the build if apps/blackpi
// imports a scenario store or names a scenario route again.

// The bottom bar is fake App chrome, not a story control. It once reported the
// tapped tab and this file turned that into a URL; it no longer reports
// anything, because it is no longer a control under any input - see
// apps/blackpi/components/BottomNav.jsx. So there is no tab hook here, no tab
// route map to resolve against, and nothing for a host to wire: a player
// inside BlackPi moves through the story's own actions or not at all.
//
// AR Interaction Contract note for this whole file: no host below ever
// declares a tab, a search pill or any other piece of chrome as an AR action -
// a screen's geometry is the story actions ON it, and those are the only
// things a finger, a mouse or a gesture can reach. The screens whose only
// controls are internal to the App (the two hero products, the PDP's bottom
// bar, 確認付款, the order's one-at-a-time CTA) declare their own contract
// inside apps/blackpi; the ones whose actions are wholly this scenario's are
// declared here. Nothing scans buttons, in either place.

// The product line the run is on - taken from the URL exactly where the app
// screens used to read it themselves, so the same screen shows the same
// product as before.
function useProductRoute() {
  return useParams().route ?? null;
}

// 01 - Splash. Marking the run as started is scenario bookkeeping; the splash
// screen itself only shows a logo for a beat and reports that it is done.
export function BlackPiSplash() {
  const navigate = useNavigate();
  // The splash shows a logo for a beat and moves on by itself: no story action.
  useARInteraction({ mode: 'display', surfaceId: 'scenario04/blackpi-splash' });
  useEffect(() => {
    markRunStarted();
  }, []);
  const onIntroComplete = useCallback(
    () => navigate(BLACKPI_ROUTES.home, { replace: true }),
    [navigate],
  );
  return <Splash onIntroComplete={onIntroComplete} />;
}

// 02 - 首頁. Opening one of the two story products both puts the run on that
// product line and opens the PDP, and it is the only thing this screen does:
// the search pill and the tab bar below it are scenery now, so 首頁 has
// exactly one wired event.
export function BlackPiHome() {
  const navigate = useNavigate();
  const onSelectProduct = useCallback((product) => {
    selectProduct(product);
    navigate(BLACKPI_ROUTES.product(product.route));
  }, [navigate]);
  return <Home onSelectProduct={onSelectProduct} />;
}

// 03 - 搜尋頁. Only the two story terms resolve to a product line, and where
// that leads is this scenario's decision.
export function BlackPiSearch() {
  const navigate = useNavigate();
  const onSearchTerm = useCallback((route) => {
    selectSearchTerm(route);
    navigate(BLACKPI_ROUTES.searchResults(route));
  }, [navigate]);
  const onBack = useCallback(() => navigate(-1), [navigate]);
  return <Search onSearchTerm={onSearchTerm} onBack={onBack} />;
}

// 04 - 搜尋結果.
export function BlackPiSearchResults() {
  const navigate = useNavigate();
  const query = useProductRoute();
  const onSelectProduct = useCallback((product) => {
    selectProduct(product);
    navigate(BLACKPI_ROUTES.product(product.route));
  }, [navigate]);
  const onBack = useCallback(() => navigate(BLACKPI_ROUTES.search), [navigate]);
  return <SearchResults query={query} onSelectProduct={onSelectProduct} onBack={onBack} />;
}

// 05 - 商品詳情. 賣家聊聊 and 直接購買 both put the run on this product line;
// only the screen they open differs.
//
// No onBack: the PDP no longer draws a 返回 arrow, so there is no event left
// for a back handler to answer. The wiring goes with the button rather than
// staying as an unreachable navigate(-1) - the point of removing the arrow is
// that the player cannot step out of the scripted run from here.
export function BlackPiProductDetail() {
  const navigate = useNavigate();
  const productRoute = useProductRoute();
  const onContactSeller = useCallback((product) => {
    selectProduct(product);
    navigate(BLACKPI_ROUTES.sellerChat(product.route));
  }, [navigate]);
  const onBuy = useCallback((product) => {
    selectProduct(product);
    navigate(BLACKPI_ROUTES.checkout(product.route));
  }, [navigate]);
  const onGoHome = useCallback(() => navigate(BLACKPI_ROUTES.home), [navigate]);
  return (
    <ProductDetail
      productRoute={productRoute}
      onContactSeller={onContactSeller}
      onBuy={onBuy}
      onGoHome={onGoHome}
    />
  );
}

// 07 - 結帳確認.
export function BlackPiCheckout() {
  const navigate = useNavigate();
  const productRoute = useProductRoute();
  const onConfirmPayment = useCallback((product) => {
    confirmPurchase(product);
    navigate(BLACKPI_ROUTES.paymentSuccess(product.route));
  }, [navigate]);
  const onBack = useCallback(() => navigate(-1), [navigate]);
  return <Checkout productRoute={productRoute} onConfirmPayment={onConfirmPayment} onBack={onBack} />;
}

// 08 - 付款成功.
export function BlackPiPaymentSuccess() {
  const navigate = useNavigate();
  const productRoute = useProductRoute();
  useEffect(() => {
    settlePayment();
  }, []);
  const onViewOrder = useCallback(
    () => navigate(BLACKPI_ROUTES.order(productRoute)),
    [navigate, productRoute],
  );
  useARInteraction({ mode: 'single', surfaceId: 'scenario04/payment-success', action: onViewOrder });
  return <PaymentSuccess onViewOrder={onViewOrder} />;
}

// 底部導覽・訂單.
export function BlackPiOrders() {
  const navigate = useNavigate();
  const [state] = useShoppingState();
  const onOpenOrder = useCallback((route) => navigate(BLACKPI_ROUTES.order(route)), [navigate]);
  const order = selectOrderSummary(state);
  // A BottomNav destination, not a mainline step - but it still has one real
  // action when there is an order to open, and none when there is not.
  useARInteraction(order
    ? { mode: 'single', surfaceId: 'scenario04/orders', action: () => onOpenOrder(order.productRoute) }
    : { mode: 'display', surfaceId: 'scenario04/orders-empty' });
  return <Orders order={order} onOpenOrder={onOpenOrder} />;
}

// 09 + 10 - 訂單詳情 + 物流蒙太奇. The montage's timing is the app's; each
// stage it reports is written here. 拆開包裹 and 查看售後進度 are the two
// story beats this screen leads to, and both are this scenario's routes.
export function BlackPiOrderDetail() {
  const navigate = useNavigate();
  const productRoute = useProductRoute();
  const [state, , refresh] = useShoppingState();
  const onBackToOrders = useCallback(() => navigate(BLACKPI_ROUTES.orders), [navigate]);
  const onOpenUnboxing = useCallback(
    () => navigate(BLACKPI_ROUTES.unboxing(productRoute)),
    [navigate, productRoute],
  );
  // 查看售後進度 - the one way on from an order that already has a dispute on
  // it. Where "後續" actually is depends on whether the seller conversation is
  // still live:
  //
  //   dispute open       -> back into the seller chat, where it left off.
  //   order completed    -> 黑皮客服, because the seller chat is OVER.
  //
  // The second case is the 放棄退貨 branch: at 放棄退貨提醒 the player picks
  // 先完成訂單好了, DisputeChat writes orderStatus: 'completed' (the only place
  // in the scenario that writes it) and ends the conversation at its terminal
  // node. Sending that player back into the finished chat is what stranded the
  // run - the engine resumes already `done` and navigates straight back here,
  // so 訂單詳情 and 售後對話 bounced off each other and nothing could reach the
  // 結局 → 詐騙疑點分析 → 反詐小測驗 flow every run has to end on.
  //
  // 黑皮客服 is not a new ending invented for this branch; it is the same
  // platform-support conversation the refund path reaches, and it was already
  // written FOR this player: its bot stage reads the
  // `premature_order_completion` flag this very choice sets and answers
  // 「系統顯示您先前已確認完成訂單…仍可以建立爭議案件」, which is exactly what
  // 放棄退貨提醒 promises ("你仍可以保存證據並向平台提出爭議"). From there the
  // run rejoins the existing two endings unchanged.
  const onContactSeller = useCallback(
    () => navigate(state.orderStatus === 'completed'
      ? BLACKPI_ROUTES.platformSupport(productRoute)
      : BLACKPI_ROUTES.disputeChat(productRoute)),
    [navigate, productRoute, state.orderStatus],
  );
  return (
    <OrderDetail
      productRoute={productRoute}
      order={selectOrder(state)}
      onDeliveryStatusChange={(status) => {
        advanceDelivery(status);
        refresh();
      }}
      onBackToOrders={onBackToOrders}
      onOpenUnboxing={onOpenUnboxing}
      onContactSeller={onContactSeller}
    />
  );
}

// 底部導覽・訊息. Whether the seller has gone quiet is a story fact; the inbox
// only renders it, and opening either thread is this scenario's route.
export function BlackPiMessages() {
  const navigate = useNavigate();
  const [state] = useShoppingState();
  const route = state.selectedRoute;
  const onOpenSellerChat = useCallback(
    () => navigate(BLACKPI_ROUTES.sellerChat(route)),
    [navigate, route],
  );
  const onOpenSupport = useCallback(
    () => navigate(BLACKPI_ROUTES.platformSupport(route)),
    [navigate, route],
  );
  // Two threads, in the order the inbox lists them: the seller, then 黑皮客服.
  useARInteraction({
    mode: 'dual',
    surfaceId: 'scenario04/messages',
    left: onOpenSellerChat,
    right: onOpenSupport,
  });
  return (
    <Messages
      activeProductRoute={route}
      sellerUnreachable={state.sellerUnreachable}
      onOpenSellerChat={onOpenSellerChat}
      onOpenSupport={onOpenSupport}
    />
  );
}

// 底部導覽・我的. The refund-centre / 客服 entry points only exist once the run
// is on a product line.
export function BlackPiMe() {
  const navigate = useNavigate();
  const [state] = useShoppingState();
  const route = state.selectedRoute;
  const onOpenRefundCenter = useCallback(
    () => navigate(BLACKPI_ROUTES.refundCenter(route)),
    [navigate, route],
  );
  const onOpenSupport = useCallback(
    () => navigate(BLACKPI_ROUTES.platformSupport(route)),
    [navigate, route],
  );
  // 退款中心 and 客服 only exist once the run is on a product line; the sound
  // toggle above them is a device setting, never a story action.
  useARInteraction(route
    ? {
      mode: 'dual',
      surfaceId: 'scenario04/me',
      left: onOpenRefundCenter,
      right: onOpenSupport,
    }
    : { mode: 'display', surfaceId: 'scenario04/me-empty' });
  return (
    <Me
      activeProductRoute={route}
      onOpenRefundCenter={onOpenRefundCenter}
      onOpenSupport={onOpenSupport}
    />
  );
}

// 底部導覽・分類 has no scenario state and no story action of its own; it is
// hosted so the route stays mounted and so its `display` contract is declared
// in the same place as its siblings'.
export function BlackPiCategory() {
  // A header, eight scenery tiles and the inert tab bar: nothing to declare.
  useARInteraction({ mode: 'display', surfaceId: 'scenario04/category' });
  return <Category />;
}
