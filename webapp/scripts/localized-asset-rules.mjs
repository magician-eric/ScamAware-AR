// What counts as correct localized-asset coverage, as pure functions.
//
// Split out of validate-localized-assets.mjs so the rules can be driven
// directly by scripts/validate-localized-assets.test.mjs. The shapes worth
// testing are precisely the ones this repo does not currently contain - two
// non-Chinese languages sharing a recording, a declared gap that has quietly
// been filled, a language-neutral asset that has sprouted a per-language
// variant - and a validator that can only be run against the real assets can
// never be shown to catch any of them.
//
// Same split, same reason, as scripts/ar-interaction-regression-rules.mjs.
export const LANGUAGES = ['zh', 'en', 'jp'];

// Every unordered pair of languages. What pass 2 walks.
const LANGUAGE_PAIRS = LANGUAGES.flatMap(
  (a, i) => LANGUAGES.slice(i + 1).map((b) => [a, b]),
);

export const asList = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);

// The whole judgement for one family, given the files each language names.
//
// Kept pure - no disk, no registry, no process.exit - because the shapes worth
// testing are the ones this repo does not currently contain: two non-Chinese
// languages sharing a recording, a declared gap that has quietly been filled,
// a language-neutral asset that has sprouted a per-language variant. The test
// file drives all of them through here.
//
// Returns { errors, status }, where status is PASS / FAIL / MISSING / SHARED
// per language.
export function checkLocaleTable({ id, byLang, gaps = [], languageNeutral = false }) {
  const errors = [];
  const fail = (message) => errors.push(`${id}: ${message}`);
  const files = Object.fromEntries(LANGUAGES.map((lang) => [lang, asList(byLang[lang])]));
  const declaredGaps = new Set(gaps);

  // A language-neutral family is the inverse contract: one file, every
  // language, on purpose. Sharing is required, and a language that has drifted
  // to a file of its own is the failure.
  if (languageNeutral) {
    if (declaredGaps.size) fail('is language-neutral, so it cannot declare a per-language gap');
    const status = {};
    const reference = files.zh.join('\u0000');
    for (const lang of LANGUAGES) {
      if (files[lang].length === 0) {
        fail(`${lang} names no file, but a language-neutral asset is shared by every language`);
        status[lang] = 'MISSING';
      } else if (files[lang].join('\u0000') !== reference) {
        fail(`${lang} names a different file (${files[lang][0]}) from zh (${files.zh[0]}) - a language-neutral asset is one file; register it as locale-varying instead`);
        status[lang] = 'FAIL';
      } else {
        status[lang] = 'SHARED';
      }
    }
    return { errors, status };
  }

  // PASS 2a - no two languages may name the same file. Every unordered pair,
  // not each language against zh: en and jp both pointing at one non-Chinese
  // recording is the same bug as either of them pointing at the Chinese one,
  // and checking only against zh could not see it.
  const collided = new Set();
  for (const [a, b] of LANGUAGE_PAIRS) {
    const inB = new Set(files[b]);
    const shared = files[a].filter((url) => inB.has(url));
    if (shared.length === 0) continue;
    fail(`${a} and ${b} share ${shared.length} file(s) (${shared[0]}) - two languages cannot be covered by one asset`);
    collided.add(a);
    collided.add(b);
  }

  // PASS 2b - per language: a real set of its own, or a declared gap.
  const status = { zh: collided.has('zh') ? 'FAIL' : 'PASS' };
  if (files.zh.length === 0) {
    fail('zh names no file - the source language is what every other language is counted against');
    status.zh = 'MISSING';
  }
  for (const lang of ['en', 'jp']) {
    if (collided.has(lang)) { status[lang] = 'FAIL'; continue; }
    if (files[lang].length === 0) {
      if (!declaredGaps.has(lang)) fail(`${lang} has no files and no declared gap`);
      status[lang] = 'MISSING';
    } else if (files[lang].length !== files.zh.length) {
      fail(`${lang} has ${files[lang].length} file(s) where zh has ${files.zh.length}`);
      status[lang] = 'FAIL';
    } else {
      if (declaredGaps.has(lang)) fail(`${lang} is declared a gap but has ${files[lang].length} file(s) - remove the declaration`);
      status[lang] = 'PASS';
    }
  }
  return { errors, status };
}
