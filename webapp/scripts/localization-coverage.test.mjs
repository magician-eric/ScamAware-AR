// Three-language coverage for the dictionaries validate-i18n.mjs cannot see.
//
// scripts/validate-i18n.mjs checks the dictionaries that are keyed off a
// Chinese source string (Scenario 01/02/04/05 and the App modules). It cannot
// check the other shape this repo uses: a namespaced table, `{ zh: {...},
// en: {...}, jp: {...} }`, read as `t.callStage1.caseNumberLabel`. Scenario
// 03 - the whole 假檢警 run - and every entry screen use that shape, and
// nothing was checking them at all: a key present in `zh` and missing from
// `jp` reads as `undefined` on screen, and a key whose `en` value is still
// the Chinese sentence renders Chinese to an English player. Both are exactly
// the failures this suite exists to stop.
//
//   node --test scripts/localization-coverage.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { findLeak } from './localization-leak-rules.mjs';

// lib/lang.js reads localStorage on import-time-adjacent calls; these tables
// are asked for a language explicitly, so an empty store is enough.
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.sessionStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

const { getScenario03Strings } = await import('../src/pages/scenario03/i18n.js');
const { getArScanStrings } = await import('../src/pages/arScan/i18n.js');
const { getGestureTutorialStrings } = await import('../src/pages/gestureTutorial/i18n.js');
const { getScenarioMenuStrings } = await import('../src/pages/scenarioMenuI18n.js');
const { getLanguageSelectStrings } = await import('../src/pages/languageSelectI18n.js');

const flat = async (path, name) => (await import(path))[name];
const SCENARIO01_EN = await flat('../src/pages/scenario01/i18nEn.js', 'EN');
const SCENARIO01_JP = await flat('../src/pages/scenario01/i18nJp.js', 'JP');
const SCENARIO02_EN = await flat('../src/shared/i18n/scenario02En.js', 'EN');
const SCENARIO02_JP = await flat('../src/shared/i18n/scenario02Jp.js', 'JP');
const SCENARIO04_EN = await flat('../src/shared/i18n/scenario04En.js', 'EN');
const SCENARIO04_JP = await flat('../src/shared/i18n/scenario04Jp.js', 'JP');
const SCENARIO05_EN = await flat('../src/shared/i18n/scenario05En.js', 'EN');
const SCENARIO05_JP = await flat('../src/shared/i18n/scenario05Jp.js', 'JP');
const BLACKPI_EN = await flat('../src/apps/blackpi/i18n/en.js', 'EN');
const BLACKPI_JP = await flat('../src/apps/blackpi/i18n/jp.js', 'JP');
const COIN_WINNER_EN = await flat('../src/apps/coin-winner/i18n/en.js', 'EN');
const COIN_WINNER_JP = await flat('../src/apps/coin-winner/i18n/jp.js', 'JP');
const MYDONDON_EN = await flat('../src/apps/mydondon/i18n/en.js', 'EN');
const MYDONDON_JP = await flat('../src/apps/mydondon/i18n/jp.js', 'JP');
const MEETU_EN = await flat('../src/apps/meetu/i18n/en.js', 'EN');
const MEETU_JP = await flat('../src/apps/meetu/i18n/jp.js', 'JP');
const HPE_EN = await flat('../src/apps/hpe-logistics/i18n/en.js', 'EN');
const HPE_JP = await flat('../src/apps/hpe-logistics/i18n/jp.js', 'JP');

// The other dictionary shape: keyed off the Chinese source string.
// validate-i18n.mjs already checks that every string a screen reaches for has
// an entry in both; what it does not check is whether the entry says anything.
// An English value that is still Chinese, or a Japanese one written in
// Traditional Chinese, satisfies "has an entry" and reads as a leak on screen.
const FLAT_TABLES = [
  ['Scenario 01', SCENARIO01_EN, SCENARIO01_JP],
  ['Scenario 02', SCENARIO02_EN, SCENARIO02_JP],
  ['Scenario 04', SCENARIO04_EN, SCENARIO04_JP],
  ['Scenario 05', SCENARIO05_EN, SCENARIO05_JP],
  ['App: blackpi', BLACKPI_EN, BLACKPI_JP],
  ['App: coin-winner', COIN_WINNER_EN, COIN_WINNER_JP],
  ['App: mydondon', MYDONDON_EN, MYDONDON_JP],
  ['App: meetu', MEETU_EN, MEETU_JP],
  ['App: hpe-logistics', HPE_EN, HPE_JP],
];

const TABLES = [
  ['Scenario 03', getScenario03Strings],
  ['AR scan home', getArScanStrings],
  ['Gesture tutorial', getGestureTutorialStrings],
  ['Scenario menu', getScenarioMenuStrings],
  ['Language select', getLanguageSelectStrings],
];

// Every leaf path in a namespaced table. A function leaf (a line that
// interpolates a case number, an agency, a name) is a leaf like any other:
// what matters here is that all three languages define it.
function paths(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => paths(child, prefix ? `${prefix}.${key}` : key));
}

function leaf(table, path) {
  return path.split('.').reduce((node, key) => node?.[key], table);
}

for (const [name, getStrings] of TABLES) {
  const zh = getStrings('zh');
  const en = getStrings('en');
  const jp = getStrings('jp');

  test(`${name}: EN and JP define every key zh does`, () => {
    const expected = paths(zh).sort();
    assert.deepEqual(paths(en).sort(), expected, `${name}: English table does not match the Chinese one`);
    assert.deepEqual(paths(jp).sort(), expected, `${name}: Japanese table does not match the Chinese one`);
  });

  test(`${name}: no EN or JP entry is still its Chinese source`, () => {
    const untranslated = [];
    for (const path of paths(zh)) {
      const source = leaf(zh, path);
      if (typeof source !== 'string') continue;
      for (const [language, table] of [['en', en], ['jp', jp]]) {
        const value = leaf(table, path);
        if (typeof value !== 'string') continue;
        // A value identical to the Chinese one is only a finding when it
        // actually contains Chinese: 'CIB AR ANTI-FRAUD' and '165' are the
        // same string in all three languages on purpose.
        if (value === source && findLeak(value, language)) {
          untranslated.push(`${language} ${path}: ${JSON.stringify(value)}`);
        }
      }
    }
    assert.deepEqual(untranslated, [], `${name}: entries left in Chinese`);
  });

  test(`${name}: no EN entry contains Chinese, no JP entry contains Traditional Chinese`, () => {
    const leaks = [];
    for (const [language, table] of [['en', en], ['jp', jp]]) {
      for (const path of paths(table)) {
        const value = leaf(table, path);
        if (typeof value !== 'string') continue;
        const found = findLeak(value, language);
        if (found) leaks.push(`${language} ${path}: ${JSON.stringify(value)} - ${found.reason}`);
      }
    }
    assert.deepEqual(leaks, [], `${name}: wrong-language text in a dictionary`);
  });
}

// A dictionary entry that is character-identical to its Chinese key, or an
// English one carrying Han characters, or a Japanese one written in
// Traditional Chinese - each of them renders wrong-language text on screen
// while satisfying every "does this key exist" check.
for (const [name, en, jp] of FLAT_TABLES) {
  test(`${name}: no dictionary entry renders the wrong language`, () => {
    const leaks = [];
    for (const [language, table] of [['en', en], ['jp', jp]]) {
      for (const [key, value] of Object.entries(table)) {
        if (typeof value !== 'string') continue;
        const found = findLeak(value, language);
        if (found) leaks.push(`${language} ${JSON.stringify(key)} -> ${JSON.stringify(value)} - ${found.reason}`);
      }
    }
    assert.deepEqual(leaks, [], `${name}: wrong-language text in a dictionary`);
  });
}
