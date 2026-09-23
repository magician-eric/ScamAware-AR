import { getLanguage } from '../../lib/lang';

// The one localization mechanism an App module owns its own copy deck with.
//
// Every App that renders player-facing text needs the same four things: read
// the language the player picked on /language, look a Chinese source string
// up in an English or Japanese table, substitute any {name} placeholders, and
// fall back to the Chinese source when a string has no entry yet. That is
// mechanism, not copy - so it lives here once instead of being retyped in
// five App dictionaries (§13 AD-14).
//
// What it deliberately does NOT hold is a single translated string. Each App
// passes in its own `en`/`jp` tables (apps/<app>/i18n/en.js, jp.js) and owns
// every word in them; two Apps that happen to render the same Chinese label
// each keep their own entry, because ownership follows the UI, not the
// spelling (spec section 3.6).
//
// Dictionaries are keyed off the Chinese source string exactly as it appears
// in the JSX - t('返回') - which is the convention every dictionary in this
// repo already uses: the Chinese copy IS the identifier, so there is no
// second naming layer to keep in sync and every key is greppable from the
// screen it renders on.
//
// The internal locale code for Japanese is always 'jp', never 'ja'.

function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
}

// Narrows whatever lib/lang.js has stored to the three codes a dictionary can
// be keyed by. Anything unrecognised (including a language never set) reads as
// 'zh', which is also the language the source strings are written in - so the
// fallback path renders the authored Chinese rather than a blank.
export function toDictionaryLanguage(language) {
  if (language === 'en') return 'en';
  if (language === 'jp') return 'jp';
  return 'zh';
}

// createTranslator({ en, jp }) -> { getLang, useLang, t, useT }
//
// t(zh, lang, params) takes `lang` positionally (not as a hook) so data
// builders outside React - catalogs, dialogue trees - can translate at build
// time, exactly the way the scenario dictionaries are already called.
// useT() is the component form: it resolves the language once and returns a
// bound t(zh, params), so JSX reads as {t('返回')}.
export function createTranslator({ en = {}, jp = {} } = {}) {
  const getLang = () => toDictionaryLanguage(getLanguage());

  const t = (zh, lang = getLang(), params) => {
    const dictionary = lang === 'en' ? en : lang === 'jp' ? jp : null;
    const template = dictionary ? (dictionary[zh] ?? zh) : zh;
    return interpolate(template, params);
  };

  const useT = () => {
    const lang = getLang();
    return (zh, params) => t(zh, lang, params);
  };

  return { getLang, useLang: getLang, t, useT };
}
