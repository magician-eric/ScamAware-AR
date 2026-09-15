export const GUGO_INVEST_BRAND = Object.freeze({ id: 'gugo-invest', name: '股購投資', internationalName: 'GuGo Invest' });
export const GUGO_STORAGE_KEYS = Object.freeze({ state: 'gugo-invest-app-state', language: 'gugo-invest-language' });
// CIBAR calls the three languages 'zh', 'en' and 'jp'; GuGo's own i18n calls
// them 'zh-TW', 'en' and 'jp' (never the ISO 'ja').
export function toGuGoLanguage(language = 'zh') {
  return language === 'zh' ? 'zh-TW' : language;
}
export function resetGuGoState(storage = globalThis.localStorage) {
  Object.values(GUGO_STORAGE_KEYS).forEach((key) => storage?.removeItem(key));
}
// scenario01 mounts this App module directly (see
// pages/scenario01/PlatformRegister.jsx). There is no other copy of GuGo to
// integrate with: the standalone app this was built from, and the
// createGuGoIframeUrl helper that pointed at its build, are both gone.
export const GUGO_INTEGRATION = Object.freeze({ mode: 'module', routeCompatible: true });

// How far the player has got through GuGo's own onboarding, reported to
// whatever host mounts the platform (the gate that walks these steps lives
// beside this file, in OnboardingGate). Deliberately named for what the
// player has done ON THE PLATFORM, never for what a story does next: the
// host decides that. A host that shows its own chrome around the platform
// needs this because opening an account and funding the AI quant contract
// are two different moments, and a control that only makes sense once money
// is in must not be reachable before it.
//
// React-free like the rest of this file, so a Node test - and a host that
// only wants the contract - can read it without loading the screens.
export const GUGO_ONBOARDING_STAGES = Object.freeze({
  // Account not opened yet: the register screen is showing.
  register: 'register',
  // Registered, AI quant contract not funded yet: the deposit offer is showing.
  deposit: 'deposit',
  // Deposit confirmed and acknowledged; the platform proper is open, and the
  // holdings the contract bought exist and can be looked at.
  funded: 'funded',
});
