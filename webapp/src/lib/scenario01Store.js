import { resetGuGoState } from '../apps/gugo-invest';
import { resetScenario01Cast } from './scenario01Characters';

// Scenario01's run state, and the one call that ends a run and starts a new
// one. Two separate things have to be swept, which is exactly why this
// wasn't right before:
//
// 1. Scenario01's own persisted keys - the cast snapshot and LineTeacher's
//    chat clock - all sharing the 'cibar-scenario01-' prefix, so a key added
//    later is covered without this file needing an update.
// 2. The GuGo Invest platform's state. That app is embedded as an iframe
//    (see pages/scenario01/PlatformRegister.jsx) and persists `registered` /
//    `quantContract` to localStorage under its own keys, which no scenario01
//    sweep would ever reach. Without clearing it, the second run of the
//    scenario loads the iframe with the previous run's account still
//    registered, GuGo's OnboardingGate skips straight past the register ->
//    invest screens, and the player never sees the registration step the
//    story depends on.
//
// The reverse mistake matters just as much: this must NOT run on the normal
// LINE <-> platform round trips inside one run, or the player would be asked
// to register again mid-story. It is called from exactly one place - the
// scenario's Briefing, which is the first page of a run and is never
// re-entered during one (see lib/enterScenario.js).
const SCENARIO01_KEY_PREFIX = 'cibar-scenario01-';

function sweep(storage) {
  try {
    Object.keys(storage)
      .filter((key) => key.startsWith(SCENARIO01_KEY_PREFIX))
      .forEach((key) => storage.removeItem(key));
  } catch {
    // Storage unavailable (private mode, quota) - nothing to clear.
  }
}

export function resetScenario01() {
  sweep(globalThis.localStorage);
  sweep(globalThis.sessionStorage);
  try {
    resetGuGoState();
  } catch {
    // Storage unavailable - the embedded platform just starts from whatever
    // it already had.
  }
  // Re-seed immediately so the whole run reads one stable cast, rather than
  // the first t('...{investmentAssistant}') call rolling it lazily.
  return resetScenario01Cast();
}
