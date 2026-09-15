import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Home } from "./pages/Home";
import { Markets } from "./pages/Markets";
import { StockDetail } from "./pages/StockDetail";
import { Portfolio } from "./pages/Portfolio";
import { Account } from "./pages/Account";
import { AppStoreProvider } from "./store/AppStoreContext";
import { OnboardingGate } from "./OnboardingGate";
import { GuGoBasePathProvider } from "./routing";
import { useGuGoLanguage } from "./i18n/useGuGoLanguage";
import "./styles/index.css";

export interface GuGoInvestAppProps {
  /**
   * The host route this app is mounted under, e.g. "/dev/gugo-invest". The
   * host must match it with a splat ("/dev/gugo-invest/*") so the app's own
   * routes below have somewhere to live.
   */
  basePath: string;
  /**
   * Which language to show, in CIBAR's codes ('zh' | 'en' | 'jp'). Replaces
   * the `?lang=` query the host used to put on the iframe's URL, which this
   * app's i18next language detector read on load. Mounted inline there is no
   * such URL, so the host passes it in instead.
   */
  language?: string;
  /**
   * Called with the current step of this app's own onboarding, as one of
   * GUGO_ONBOARDING_STAGES (../index.js): 'register', 'deposit' or 'funded'.
   *
   * The host wraps this app in its own chrome, and some of that chrome only
   * makes sense once the AI quant contract has actually been funded - there
   * are no holdings to look at before then. Without this the host would have
   * to guess, exactly as it did when the platform was an iframe it could not
   * see into. It is a report, not a command: this app never learns what the
   * host does with it.
   */
  onOnboardingStageChange?: (stage: string) => void;
}


/**
 * The GuGo Invest app, as one mountable element - this is gugo-invest/src/App.tsx
 * with two changes, both forced by living inside the CIBAR webapp rather than
 * on its own page:
 *
 * 1. No <HashRouter>. webapp mounts the one Router at its root (src/main.jsx),
 *    and React Router refuses a second one nested inside it - MemoryRouter
 *    included. So this renders a descendant <Routes> instead: paths here are
 *    matched relative to whatever host route mounted it, and the navigations
 *    inside the screens stay absolute ("/markets", "/stock/2330") by going
 *    through ./routing, which prefixes basePath. See that file.
 * 2. A `.gugo-app` wrapper. Every style this module emits - Tailwind's reset
 *    included - is confined to this element's subtree, so nothing here reaches
 *    the rest of the webapp. See ./styles/index.css.
 *
 * The store, onboarding gate, screens, charts, i18n and persisted state are the
 * standalone app's, unchanged: it still reads and writes GUGO_STORAGE_KEYS.state
 * ('gugo-invest-app-state'), which is what lets resetScenario01() ->
 * resetGuGoState() end a run for this module exactly as it did for the iframe.
 */
export function GuGoInvestApp({ basePath, language, onOnboardingStageChange }: GuGoInvestAppProps) {
  useGuGoLanguage(language);

  return (
    <div className="gugo-app">
      <AppStoreProvider>
        <GuGoBasePathProvider basePath={basePath}>
          <OnboardingGate onStageChange={onOnboardingStageChange}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="markets" element={<Markets />} />
                <Route path="stock/:code" element={<StockDetail />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="account" element={<Account />} />
              </Route>
            </Routes>
          </OnboardingGate>
        </GuGoBasePathProvider>
      </AppStoreProvider>
    </div>
  );
}

export default GuGoInvestApp;
