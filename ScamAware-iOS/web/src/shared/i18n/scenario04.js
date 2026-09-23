// Scenario04 (BlackPi/HappyPick shopping fraud) localization.
//
// Reuses the existing app-wide language selector (src/lib/lang.js) exactly
// like scenario03/scenario05 do - no new storage key, no new route, no
// locale-aware navigation wrapper. Whatever the player picked on the
// /language screen is what scenario04 renders in, and it persists across a
// refresh for free because lib/lang.js already reads from localStorage.
//
// Unlike scenario03's i18n.js (which namespaces every string under a
// component/field key), this file keys the English dictionary directly off
// the existing Chinese copy: t('中文原句') -> 'English sentence'. Scenario04
// is an order of magnitude larger than scenario03 (30+ page files, 6
// dialogue trees), so inventing and wiring up a unique key name for every
// one of ~900 lines would be a lot of ceremony for no real benefit - the
// Chinese string IS already a stable, greppable identifier, and this way
// adding the review-approved English text is a pure lookup-table exercise
// with no risk of renaming/restructuring the Chinese path while doing it.
//
// 'zh', 'en', and 'jp' are all populated (Phase 2 added 'jp' - see
// i18nJp.js). The internal locale code for Japanese is always 'jp', matching
// the convention already established by scenario03/i18n.js.
// The lookup still falls back to Chinese for any language/string it doesn't
// have a table entry for, so any future language remains additive.
import { getLanguage } from '../../lib/lang';
import { EN } from './scenario04En';
import { JP } from './scenario04Jp';

export function getScenario04Lang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

export function useScenario04Lang() {
  return getScenario04Lang();
}

// t(zh) - looks up the exact Chinese source string in the active
// dictionary. Falls back to the Chinese input itself if the language is
// 'zh', or if 'en'/'jp' is active but this particular string hasn't been
// added to the table yet (fails safe to the original text rather than
// blank).
export function t(zh, lang = getScenario04Lang()) {
  if (lang === 'en') return EN[zh] ?? zh;
  if (lang === 'jp') return JP[zh] ?? zh;
  return zh;
}

// useT() - the hook form for components; returns a bound t() so JSX reads
// as {t('中文')} without re-deriving the language on every call.
export function useT() {
  const lang = getScenario04Lang();
  return (zh) => t(zh, lang);
}
