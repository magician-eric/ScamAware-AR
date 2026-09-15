import { createTranslator } from '../../../shared/i18n/createTranslator';
import { EN } from './en';
import { JP } from './jp';

// BlackPi (黑皮購物)'s own localization module.
//
// The App decides what its own UI reads in every language: nothing outside
// apps/blackpi/ passes it translated strings, and it reaches for no
// Scenario dictionary (§13 AD-14, enforced by scripts/validate-app-boundaries.mjs).
// A host still decides the language - it just does that through the app-wide
// language selector every module already reads (lib/lang.js), not by wiring
// copy in one prop at a time.
//
// Falls back to the Chinese source string for 'zh' and for any string an
// English/Japanese table has no entry for, so a missing key renders the
// authored copy rather than a blank.
export const { getLang, useLang, t, useT } = createTranslator({ en: EN, jp: JP });
