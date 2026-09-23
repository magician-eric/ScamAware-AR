// Scenario02 (Love Script / romance scam) localization.
//
// Mirrors scenario04's i18n.js exactly: reuses the existing app-wide
// language selector (src/lib/lang.js) - no new storage key, no new route,
// no locale-aware navigation wrapper. Whatever the player picked on the
// /language screen is what scenario02 renders in, and it persists across a
// refresh for free because lib/lang.js already reads from localStorage.
//
// This file keys the English dictionary directly off the existing Chinese
// copy: t('中文原句') -> 'English sentence'. The Chinese string IS already a
// stable, greppable identifier, so adding the reviewed English text is a
// pure lookup-table exercise with no risk of renaming/restructuring the
// Chinese path while doing it.
//
// Only 'en' is populated so far (this pass). 'jp' intentionally has no
// dictionary yet - t()/useT() already fall back to the Chinese source for
// any language/string with no table entry, so adding i18nJp.js later is
// purely additive, exactly like scenario04's Phase 2. The internal locale
// code for Japanese is always 'jp' - never 'ja'.
import { getLanguage } from '../../lib/lang';
import { getScenario02Cast } from '../../lib/scenario02Store';
import { getCastName } from '../../experience/characters/casting';
import { EN } from './scenario02En';
import { JP } from './scenario02Jp';

export function getDatingLeadName(lang = getScenario02Lang()) {
  return getDatingCharacterName('scenario02.datingLead', lang);
}

export function getDatingCharacterName(roleId, lang = getScenario02Lang()) {
  return getCastName(getScenario02Cast(), roleId, lang);
}

export function getDatingLeadReferralCode(lang = getScenario02Lang()) {
  const ascii = getDatingLeadName(lang).normalize('NFKD').replace(/[^a-z0-9]/gi, '').toUpperCase();
  return ascii ? `${ascii}88` : 'REFERRAL88';
}

export function getScenario02Lang() {
  const lang = getLanguage();
  if (lang === 'en') return 'en';
  if (lang === 'jp') return 'jp';
  return 'zh';
}

export function useScenario02Lang() {
  return getScenario02Lang();
}

// t(zh) - looks up the exact Chinese source string in the active
// dictionary. Falls back to the Chinese input itself if the language is
// 'zh', or if 'en' is active but this particular string hasn't been added
// to the table yet (fails safe to the original text rather than blank).
// 'jp' currently has no dictionary at all, so it also falls back to zh.
export function t(zh, lang = getScenario02Lang()) {
  const out = lang === 'en' ? EN[zh] ?? zh : lang === 'jp' ? JP[zh] ?? zh : zh;
  const cast = getScenario02Cast();
  return ['datingCandidate01', 'datingCandidate02', 'datingLead'].reduce(
    (text, slot) => text.replaceAll(`{${slot}}`, getCastName(cast, `scenario02.${slot}`, lang)),
    out,
  );
}

// useT() - the hook form for components; returns a bound t() so JSX reads
// as {t('中文')} without re-deriving the language on every call.
export function useT() {
  const lang = getScenario02Lang();
  return (zh) => t(zh, lang);
}
