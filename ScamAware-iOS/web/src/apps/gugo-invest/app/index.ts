/**
 * GuGo Invest's React surface.
 *
 * Deliberately a separate entry point from the module's ../index.js, which
 * stays plain, React-free JavaScript: scenario01's run-reset contract
 * (resetGuGoState, GUGO_STORAGE_KEYS) is imported by Node directly in
 * scripts/scenario-run-reset.test.mjs, which can neither parse .tsx nor load
 * React. Host code that renders the app imports from here; host code that
 * only needs the storage contract keeps importing '../gugo-invest'.
 */
export { GuGoInvestApp } from "./GuGoInvestApp";
// The platform screens the host places inside its own pages, rather than
// inside the routed app: scenario01 shows these after the player leaves the
// platform proper. Both take the story's wiring as props and route nowhere
// themselves - see each file.
export { ProfitOverview } from "./screens/ProfitOverview";
export { WithdrawalResult } from "./screens/WithdrawalResult";
export { PlatformHeader } from "./components/layout/PlatformHeader";
export { useAppStore, usePortfolioSummary, AppStoreProvider } from "./store/AppStoreContext";
export { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./i18n";
export { LogoHorizontal } from "./components/logo/LogoHorizontal";
export { LogoMark } from "./components/logo/LogoMark";
export { AppIcon } from "./components/logo/AppIcon";
