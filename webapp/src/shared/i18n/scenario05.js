// Scenario05 (Ghost Order / 幽靈訂單・假買家騙賣家) localization.
//
// Mirrors scenario01/scenario04's i18n.js: reuses the existing app-wide
// language selector (src/lib/lang.js) - no new storage key, no new route,
// no locale-aware navigation wrapper. Whatever the player picked on the
// /language screen is what scenario05 renders in, and it persists across a
// refresh for free because lib/lang.js already reads from localStorage.
//
// This file keys the English/Japanese dictionaries directly off the
// existing Chinese copy: t('中文原句') -> 'English sentence'. The Chinese
// string IS already a stable, greppable identifier, so this is a pure
// lookup-table exercise with no risk of renaming/restructuring the Chinese
// path while doing it. The internal locale code for Japanese is always
// 'jp' - never 'ja'.
//
// Unlike scenario01/scenario04, several scenario05 strings need runtime
// interpolation (quiz progress, score counts) rather than being pure
// static lookups, so t()/useT() accept an optional `params` object and
// substitute `{name}` placeholders - the same `{current}`/`{total}`-style
// tokens appear in the Chinese source string and in every translated
// value, so the placeholder names never need translating themselves.
import { getLanguage } from '../../lib/lang';
import { EN } from './scenario05En';
import { JP } from './scenario05Jp';

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

export function getScenario05Lang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

export function useScenario05Lang() {
  return getScenario05Lang();
}

// t(zh, lang, params) - looks up the exact Chinese source string in the
// active dictionary, then substitutes any `{name}` placeholders. Falls
// back to the Chinese input itself if the language is 'zh', or if 'en'/'jp'
// is active but this particular string hasn't been added to the table yet
// (fails safe to the original text rather than blank). `lang` is a plain
// positional argument (not a hook) so dialogue-tree builders outside React
// components (data/scenario05Dialogues.js, data/scenario05Products.js) can
// call `t(zh, lang)` directly, the same way scenario04's dialogue trees do.
export function t(zh, lang = getScenario05Lang(), params) {
  const dict = lang === 'en' ? EN : lang === 'jp' ? JP : null;
  const template = dict ? (dict[zh] ?? zh) : zh;
  return interpolate(template, params);
}

// useT() - the hook form for components; returns a bound t(zh, params) so
// JSX reads as {t('中文')} or {t('第 {current} 題 / 共 {total} 題', { current, total })}
// without re-deriving the language on every call.
export function useT() {
  const lang = getScenario05Lang();
  return (zh, params) => t(zh, lang, params);
}
