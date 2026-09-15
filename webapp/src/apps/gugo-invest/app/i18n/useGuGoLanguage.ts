import { useLayoutEffect } from "react";
import i18n from "./index";
import { toGuGoLanguage } from "../../index.js";

/**
 * Follows the host's language, in CIBAR's codes ('zh' | 'en' | 'jp').
 *
 * Replaces the `?lang=` query the host used to put on the iframe's URL, which
 * this app's i18next language detector read on load. Mounted inline there is
 * no such URL, so every GuGo surface the host mounts calls this instead - the
 * whole app (GuGoInvestApp) and the individual screens scenario01 places in
 * its own pages alike.
 *
 * useLayoutEffect rather than useEffect so the switch lands before the browser
 * paints - the player must never see the platform come up in the wrong
 * language and correct itself. Called even when i18next already happens to
 * agree, because changeLanguage is also what writes
 * GUGO_STORAGE_KEYS.language; skipping it when the browser's own locale had
 * already guessed right would leave that key unset, making what the app does
 * after a reload depend on the kiosk's browser locale rather than on the
 * language the player picked.
 */
export function useGuGoLanguage(language?: string) {
  useLayoutEffect(() => {
    if (language) i18n.changeLanguage(toGuGoLanguage(language));
  }, [language]);
}
