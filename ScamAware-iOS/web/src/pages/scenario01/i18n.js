// Scenario01 (Money Trap / fake investment scam) localization.
//
// Mirrors scenario02's i18n.js exactly: reuses the existing app-wide
// language selector (src/lib/lang.js) - no new storage key, no new route,
// no locale-aware navigation wrapper. Whatever the player picked on the
// /language screen is what scenario01 renders in, and it persists across a
// refresh for free because lib/lang.js already reads from localStorage.
//
// This file keys the English/Japanese dictionaries directly off the
// existing Chinese copy: t('中文原句') -> 'English sentence'. The Chinese
// string IS already a stable, greppable identifier, so this is a pure
// lookup-table exercise with no risk of renaming/restructuring the Chinese
// path while doing it. The internal locale code for Japanese is always
// 'jp' - never 'ja'.
import { getLanguage } from '../../lib/lang';
import { EN } from './i18nEn';
import { JP } from './i18nJp';
import { getScenario01CharacterBySlot } from '../../lib/scenario01Characters';

// Same 6-character pool and mechanism as scenario02's "{investmentAssistant}" (see
// scenario02/i18n.js) - independent draw, own sessionStorage key, so
// scenario01's assistant persona doesn't share a pick with scenario02.
// sessionStorage (not localStorage) matches this file's existing
// useChatClock('cibar-scenario01-lineteacher-clock') convention - survives
// a refresh, and resets with the rest of the run: resetScenario01() sweeps
// every key sharing the 'cibar-scenario01-' prefix.
export function getInvestmentAssistantName(lang = getScenario01Lang()) {
  return getScenario01CharacterBySlot('investmentAssistant', lang).name;
}

// The assistant's on-screen identity, resolved in exactly one place.
//
// She is one character - the same cast entry, the same drawn name, the same
// face - and she is seen twice: as the other party in the LINE 1:1 chat, and
// as a sender inside the VIP group. Those two surfaces used to spell her
// differently ("陳老師投資助理 小芸" in the chat header, a bare "小芸" in the
// group), which read as two people, and the longer of the two named her as
// an extension of 陳老師 rather than as herself. Both now come through here.
//
// The title is copy, so it lives in the dictionary as an ordinary zh key
// ('投資小助理 {investmentAssistant}') with EN/JP entries beside every other
// scenario01 string - no component spells a language. The name is cast data
// and stays where it was: t() substitutes it from getInvestmentAssistantName
// above, which reads the same sessionStorage cast snapshot every other
// scenario01 surface reads. Nothing here creates a second character.
//
// Every other VIP group sender is shown by name alone, which is what LINE
// itself does - the assistant is the exception because "投資小助理" is how
// she introduces herself, in the group as much as in the private chat.
export function getScenario01SenderName(slot, lang = getScenario01Lang()) {
  if (slot === 'investmentAssistant') return t('投資小助理 {investmentAssistant}', lang);
  return getScenario01CharacterBySlot(slot, lang).name;
}

export function getScenario01Lang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

export function useScenario01Lang() {
  return getScenario01Lang();
}

// t(zh) - looks up the exact Chinese source string in the active
// dictionary. Falls back to the Chinese input itself if the language is
// 'zh', or if a string hasn't been added to the active table yet (fails
// safe to the original text rather than blank).
export function t(zh, lang = getScenario01Lang()) {
  const out = lang === 'en' ? EN[zh] ?? zh : lang === 'jp' ? JP[zh] ?? zh : zh;
  return out.replaceAll('{investmentAssistant}', getInvestmentAssistantName(lang));
}

// useT() - the hook form for components; returns a bound t() so JSX reads
// as {t('中文')} without re-deriving the language on every call.
export function useT() {
  const lang = getScenario01Lang();
  return (zh) => t(zh, lang);
}
