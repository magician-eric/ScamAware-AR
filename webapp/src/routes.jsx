// The BlackPi app module is mounted through Scenario 04's hosts, never
// directly: the hosts own the scenario store and pass the app props.
import { BlackPiSplash as ShoppingSplash, BlackPiHome as ShoppingHome, BlackPiSearch as ShoppingSearch, BlackPiSearchResults as SearchResults, BlackPiProductDetail as ProductDetail, BlackPiCheckout as Checkout, BlackPiPaymentSuccess as PaymentSuccess, BlackPiOrders as ShoppingOrders, BlackPiOrderDetail as OrderDetail, BlackPiMessages as ShoppingMessages, BlackPiCategory as ShoppingCategory, BlackPiMe as ShoppingMe } from './pages/scenario04/blackpi';
import { Navigate } from 'react-router-dom';
import { AppShell } from './shell/AppShell';
import { RequireLanguage } from './lib/RequireLanguage';
import { LanguageSelect } from './pages/LanguageSelect';
import { OpeningHome } from './pages/opening/OpeningHome';
import { GestureTutorial } from './pages/gestureTutorial/GestureTutorial';
import { ArScanHome } from './pages/arScan/ArScanHome';
import { ScenarioMenu } from './pages/ScenarioMenu';
import { StaffSetupScreen } from './pages/staff/StaffSetupScreen';
import { PhoneHome } from './pages/scenario03/PhoneHome';
import { Briefing as PoliceBriefing } from './pages/scenario03/Briefing';
import { IncomingCall } from './pages/scenario03/IncomingCall';
import { CallStage1 } from './pages/scenario03/CallStage1';
import { LineAdd } from './pages/scenario03/LineAdd';
import { LineIntro } from './pages/scenario03/LineIntro';
import { CaseSite } from './pages/scenario03/CaseSite';
import { ProsecutorCall } from './pages/scenario03/ProsecutorCall';
import { PoliceCallback } from './pages/scenario03/PoliceCallback';
import { LineCustody } from './pages/scenario03/LineCustody';
import { BankSite } from './pages/scenario03/BankSite';
import { FinalDecision } from './pages/scenario03/FinalDecision';
import { Aftermath as PoliceAftermath } from './pages/scenario03/Aftermath';
import { Ending as PoliceEnding } from './pages/scenario03/Ending';
import { Analysis as PoliceAnalysis } from './pages/scenario03/Analysis';
import { Quiz as PoliceQuiz } from './pages/scenario03/Quiz';
import { RequireLocationProfile } from './lib/RequireLocationProfile';
import { Briefing } from './pages/scenario01/Briefing';
import { Feed } from './pages/scenario01/Feed';
import { VideoTeacher } from './pages/scenario01/VideoTeacher';
import { LineTeacher } from './pages/scenario01/LineTeacher';
import { VipGroup } from './pages/scenario01/VipGroup';
import { PlatformRegister } from './pages/scenario01/PlatformRegister';
import { Profit } from './pages/scenario01/Profit';
import { Quiz } from './pages/scenario01/Quiz';
import { Analysis as InvestmentAnalysis } from './pages/scenario01/Analysis';
import { WithdrawFail } from './pages/scenario01/WithdrawFail';
import { ScammedResult } from './pages/scenario01/ScammedResult';
import { StoppedResult } from './pages/scenario01/StoppedResult';
import { Briefing as RomanceBriefing } from './pages/scenario02/Briefing';
import { PhoneDesktop as RomancePhoneDesktop } from './pages/scenario02/PhoneDesktop';
import { AppLanding as RomanceAppLanding } from './pages/scenario02/AppLanding';
import { DatingBrowse } from './pages/scenario02/DatingBrowse';
import { DatingMatch } from './pages/scenario02/DatingMatch';
import { DatingChat } from './pages/scenario02/DatingChat';
import { PrivateChat } from './pages/scenario02/PrivateChat';
import {
  CoinWinnerLandingPage,
  CoinWinnerRegisterPage,
  CoinWinnerHomePage,
  CoinWinnerDepositPage,
  CoinWinnerTradingPage,
  CoinWinnerWithdrawalPage,
} from './pages/scenario02/CoinWinnerScreens';



import { DepositWarning } from './pages/scenario02/DepositWarning';



import { TopupWarning } from './pages/scenario02/TopupWarning';
import { GuaranteePage } from './pages/scenario02/GuaranteePage';
import { RiskAnalysis as RomanceRiskAnalysis } from './pages/scenario02/RiskAnalysis';
import { Quiz as RomanceQuiz } from './pages/scenario02/Quiz';
import { ScammedResult as RomanceScammedResult } from './pages/scenario02/ScammedResult';
import { StoppedResult as RomanceStoppedResult } from './pages/scenario02/StoppedResult';
import { SimPhoneHome } from './pages/scenario04/SimPhoneHome';
import { Briefing as ShoppingBriefing } from './pages/scenario04/Briefing';






import { SellerChat } from './pages/scenario04/SellerChat';



import { Unboxing } from './pages/scenario04/Unboxing';
import { DisputeChat } from './pages/scenario04/DisputeChat';
import { ReturnRequest } from './pages/scenario04/ReturnRequest';
import { ReturnAckChat } from './pages/scenario04/ReturnAckChat';
import { ReturnShipping } from './pages/scenario04/ReturnShipping';
import { ReturnLogistics } from './pages/scenario04/ReturnLogistics';
import { RefundDelayChat } from './pages/scenario04/RefundDelayChat';
import { RefundCenter } from './pages/scenario04/RefundCenter';
import { PlatformSupportChat } from './pages/scenario04/PlatformSupportChat';
import { Ending as ShoppingEnding } from './pages/scenario04/Ending';
import { OutcomeResult as ShoppingOutcomeResult } from './pages/scenario04/OutcomeResult';
import { Quiz as ShoppingQuiz } from './pages/scenario04/Quiz';






import { Briefing as GhostOrderBriefing } from './pages/scenario05/Briefing';
import { MarketplacePhoneHome as GhostOrderPhoneHome } from './pages/scenario05/MarketplacePhoneHome';
import { MarketplaceHome as GhostOrderHome } from './pages/scenario05/MarketplaceHome';
import { MarketplaceProductSelect as GhostOrderProductSelect } from './pages/scenario05/MarketplaceProductSelect';
import { MarketplaceListing as GhostOrderListing } from './pages/scenario05/MarketplaceListing';
import { MarketplaceOrders as GhostOrderMyDonDonOrders } from './pages/scenario05/MarketplaceOrders';
import { BuyerChat as GhostOrderBuyerChat } from './pages/scenario05/BuyerChat';
import { ShopCreate as GhostOrderShopCreate } from './pages/scenario05/ShopCreate';
import { TradeInfo as GhostOrderTradeInfo } from './pages/scenario05/TradeInfo';
import { SafeDealPaymentStatus as GhostOrderSafeDealPaymentStatus } from './pages/scenario05/SafeDealPaymentStatus';
import { SafeDealSupportChat as GhostOrderSafeDealSupportChat } from './pages/scenario05/SafeDealSupportChat';
import { SafeDealTransfer as GhostOrderSafeDealTransfer } from './pages/scenario05/SafeDealTransfer';
import { HpeShip as GhostOrderHpeShip } from './pages/scenario05/HpeShip';
import { OrderGone as GhostOrderOrderGone } from './pages/scenario05/OrderGone';
import { EndingCaught as GhostOrderEndingCaught } from './pages/scenario05/EndingCaught';
import { EndingStopped as GhostOrderEndingStopped } from './pages/scenario05/EndingStopped';
import { EndingScammed as GhostOrderEndingScammed } from './pages/scenario05/EndingScammed';
import { Reveal as GhostOrderReveal } from './pages/scenario05/Reveal';
import { Quiz as GhostOrderQuiz } from './pages/scenario05/Quiz';

export const routes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      // The App's first screen at a cold start: the home screen with the
      // opening sequence playing on top of it (pages/opening/). It is one
      // screen, not two - the opening is an overlay over the real home page,
      // on the home page's own background artwork, and it ends by unmounting
      // itself rather than by navigating anywhere. So the flow is unchanged
      // from here on: 啟動 App → 首頁（開場動畫）→ 語言選擇 → 手勢教學 → …
      //
      // It used to be a <video> screen at this route that played
      // media/intro/intro.mp4 and then navigated to /language. Both the film
      // and that navigation are gone: see pages/opening/OpeningSequence.jsx
      // for why a file that has to be fetched and decoded is the wrong thing
      // to put in front of an app that has to feel instant.
      {
        index: true,
        element: <OpeningHome />,
      },
      { path: 'language', element: <LanguageSelect /> },
      // Gesture tutorial: the one onboarding screen, between language
      // selection and the AR scan home (spec: /language ->
      // /gesture-tutorial -> /ar-scan). It is on the way in only - a
      // scenario that ends returns the player to /ar-scan directly, so the
      // tutorial runs once per language selection and never again.
      { path: 'gesture-tutorial', element: <RequireLanguage><GestureTutorial /></RequireLanguage> },
      // AR scan home: inserted between language selection and the five-
      // scenario menu (never replaces it - see ScenarioMenu's own comment).
      { path: 'ar-scan', element: <RequireLanguage><ArScanHome /></RequireLanguage> },
      { path: 'scenario-menu', element: <RequireLanguage><ScenarioMenu /></RequireLanguage> },
      // Staff-only, reachable only via the hidden long-press entry on the
      // language screen - deliberately not linked from any player-facing
      // navigation, and not wrapped in RequireLanguage (staff may set this
      // up before a language has ever been chosen on this device).
      { path: 'staff-setup', element: <StaffSetupScreen /> },

      { path: 'scenario01-investment', element: <Briefing /> },
      { path: 'scenario01-investment/feed', element: <Feed /> },
      { path: 'scenario01-investment/video-teacher', element: <VideoTeacher /> },
      { path: 'scenario01-investment/line-teacher', element: <LineTeacher /> },
      { path: 'scenario01-investment/vip-group', element: <VipGroup /> },
      // Splat: GuGo Invest mounts here and owns its own routes below this
      // path (see pages/scenario01/PlatformRegister.jsx).
      { path: 'scenario01-investment/platform-register/*', element: <PlatformRegister /> },
      { path: 'scenario01-investment/profit', element: <Profit /> },
      // 詐騙成立／成功反詐 -> 詐騙疑點分析 -> 反詐小測驗: the fixed flow every
      // scenario ends on (see components/outcome/).
      { path: 'scenario01-investment/analysis', element: <InvestmentAnalysis /> },
      { path: 'scenario01-investment/quiz', element: <Quiz /> },
      { path: 'scenario01-investment/withdraw-fail', element: <WithdrawFail /> },
      { path: 'scenario01-investment/scammed-result', element: <ScammedResult /> },
      { path: 'scenario01-investment/stopped-result', element: <StoppedResult /> },

      { path: 'scenario02-romance', element: <RomanceBriefing /> },
      { path: 'scenario02-romance/phone-desktop', element: <RomancePhoneDesktop /> },
      { path: 'scenario02-romance/app-landing', element: <RomanceAppLanding /> },
      { path: 'scenario02-romance/dating-browse', element: <DatingBrowse /> },
      { path: 'scenario02-romance/dating-match', element: <DatingMatch /> },
      { path: 'scenario02-romance/dating-chat', element: <DatingChat /> },
      { path: 'scenario02-romance/private-chat', element: <PrivateChat /> },
      { path: 'scenario02-romance/platform-landing', element: <CoinWinnerLandingPage /> },
      { path: 'scenario02-romance/platform-register', element: <CoinWinnerRegisterPage /> },
      { path: 'scenario02-romance/platform-home', element: <CoinWinnerHomePage /> },
      { path: 'scenario02-romance/deposit-warning', element: <DepositWarning /> },
      { path: 'scenario02-romance/deposit', element: <CoinWinnerDepositPage /> },
      { path: 'scenario02-romance/trading', element: <CoinWinnerTradingPage /> },
      { path: 'scenario02-romance/withdrawal', element: <CoinWinnerWithdrawalPage /> },
      { path: 'scenario02-romance/topup-warning', element: <TopupWarning /> },
      { path: 'scenario02-romance/guarantee', element: <GuaranteePage /> },
      { path: 'scenario02-romance/risk-analysis', element: <RomanceRiskAnalysis /> },
      { path: 'scenario02-romance/quiz', element: <RomanceQuiz /> },
      // The two CIB Endings the last decision (TopupWarning) now branches
      // into. Both continue to the existing risk-analysis disclosure, which
      // already leads to the original, unchanged quiz URL.
      { path: 'scenario02-romance/scammed-result', element: <RomanceScammedResult /> },
      { path: 'scenario02-romance/stopped-result', element: <RomanceStoppedResult /> },

      // Every 假檢警 scene stays behind RequireLocationProfile - each one
      // renders agency names straight out of the staff-locked profile, so a
      // deep link into a mid-run scene must be gated the same as the entry.
      { path: 'scenario03-police', element: <RequireLocationProfile><PoliceBriefing /></RequireLocationProfile> },
      { path: 'scenario03-police/phone-home', element: <RequireLocationProfile><PhoneHome /></RequireLocationProfile> },
      { path: 'scenario03-police/call', element: <RequireLocationProfile><IncomingCall /></RequireLocationProfile> },
      { path: 'scenario03-police/call-stage1', element: <RequireLocationProfile><CallStage1 /></RequireLocationProfile> },
      { path: 'scenario03-police/line-add', element: <RequireLocationProfile><LineAdd /></RequireLocationProfile> },
      { path: 'scenario03-police/line', element: <RequireLocationProfile><LineIntro /></RequireLocationProfile> },
      { path: 'scenario03-police/case-site', element: <RequireLocationProfile><CaseSite /></RequireLocationProfile> },
      { path: 'scenario03-police/prosecutor-call', element: <RequireLocationProfile><ProsecutorCall /></RequireLocationProfile> },
      { path: 'scenario03-police/police-callback', element: <RequireLocationProfile><PoliceCallback /></RequireLocationProfile> },
      { path: 'scenario03-police/line-custody', element: <RequireLocationProfile><LineCustody /></RequireLocationProfile> },
      { path: 'scenario03-police/bank', element: <RequireLocationProfile><BankSite /></RequireLocationProfile> },
      { path: 'scenario03-police/final', element: <RequireLocationProfile><FinalDecision /></RequireLocationProfile> },
      { path: 'scenario03-police/aftermath', element: <RequireLocationProfile><PoliceAftermath /></RequireLocationProfile> },
      { path: 'scenario03-police/ending/:outcome', element: <RequireLocationProfile><PoliceEnding /></RequireLocationProfile> },
      { path: 'scenario03-police/analysis', element: <RequireLocationProfile><PoliceAnalysis /></RequireLocationProfile> },
      { path: 'scenario03-police/quiz', element: <RequireLocationProfile><PoliceQuiz /></RequireLocationProfile> },
      { path: 'scenario05-atm', element: <GhostOrderBriefing /> },
      { path: 'scenario05-atm/phone-home', element: <GhostOrderPhoneHome /> },
      { path: 'scenario05-atm/home', element: <GhostOrderHome /> },
      { path: 'scenario05-atm/product-select', element: <GhostOrderProductSelect /> },
      { path: 'scenario05-atm/listing', element: <GhostOrderListing /> },
      { path: 'scenario05-atm/chat', element: <GhostOrderBuyerChat /> },
      { path: 'scenario05-atm/shop-create', element: <GhostOrderShopCreate /> },
      { path: 'scenario05-atm/trade-info', element: <GhostOrderTradeInfo /> },
      { path: 'scenario05-atm/mydondon-orders', element: <GhostOrderMyDonDonOrders /> },
      { path: 'scenario05-atm/safedeal-payment-status', element: <GhostOrderSafeDealPaymentStatus /> },
      { path: 'scenario05-atm/safedeal-support', element: <GhostOrderSafeDealSupportChat /> },
      { path: 'scenario05-atm/safedeal-transfer', element: <GhostOrderSafeDealTransfer /> },
      { path: 'scenario05-atm/hpe-ship', element: <GhostOrderHpeShip /> },
      { path: 'scenario05-atm/order-gone', element: <GhostOrderOrderGone /> },
      { path: 'scenario05-atm/ending-caught', element: <GhostOrderEndingCaught /> },
      { path: 'scenario05-atm/ending-stopped', element: <GhostOrderEndingStopped /> },
      { path: 'scenario05-atm/ending-scammed', element: <GhostOrderEndingScammed /> },
      { path: 'scenario05-atm/reveal', element: <GhostOrderReveal /> },
      { path: 'scenario05-atm/quiz', element: <GhostOrderQuiz /> },

      { path: 'scenario04-shopping', element: <ShoppingBriefing /> },
      { path: 'scenario04-shopping/phone-home', element: <SimPhoneHome /> },
      { path: 'scenario04-shopping/splash', element: <ShoppingSplash /> },
      { path: 'scenario04-shopping/home', element: <ShoppingHome /> },
      { path: 'scenario04-shopping/search', element: <ShoppingSearch /> },
      { path: 'scenario04-shopping/search-results/:route', element: <SearchResults /> },
      { path: 'scenario04-shopping/product/:route', element: <ProductDetail /> },
      { path: 'scenario04-shopping/seller-chat/:route', element: <SellerChat /> },
      { path: 'scenario04-shopping/checkout/:route', element: <Checkout /> },
      { path: 'scenario04-shopping/payment-success/:route', element: <PaymentSuccess /> },
      { path: 'scenario04-shopping/order/:route', element: <OrderDetail /> },
      { path: 'scenario04-shopping/unboxing/:route', element: <Unboxing /> },
      { path: 'scenario04-shopping/dispute-chat/:route', element: <DisputeChat /> },
      { path: 'scenario04-shopping/return-request/:route', element: <ReturnRequest /> },
      { path: 'scenario04-shopping/return-ack/:route', element: <ReturnAckChat /> },
      { path: 'scenario04-shopping/return-shipping/:route', element: <ReturnShipping /> },
      { path: 'scenario04-shopping/return-logistics/:route', element: <ReturnLogistics /> },
      { path: 'scenario04-shopping/refund-delay/:route', element: <RefundDelayChat /> },
      { path: 'scenario04-shopping/refund-center/:route', element: <RefundCenter /> },
      { path: 'scenario04-shopping/platform-support/:route', element: <PlatformSupportChat /> },
      // Outcome carried in the URL, not only in the store, so the result is
      // directly navigable and survives a refresh; its CTA continues into
      // the existing per-route ending analysis below.
      { path: 'scenario04-shopping/result/:route/:outcome', element: <ShoppingOutcomeResult /> },
      { path: 'scenario04-shopping/ending/:route', element: <ShoppingEnding /> },
      { path: 'scenario04-shopping/quiz', element: <ShoppingQuiz /> },
      { path: 'scenario04-shopping/messages', element: <ShoppingMessages /> },
      { path: 'scenario04-shopping/orders', element: <ShoppingOrders /> },
      { path: 'scenario04-shopping/category', element: <ShoppingCategory /> },
      { path: 'scenario04-shopping/me', element: <ShoppingMe /> },

      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
];
