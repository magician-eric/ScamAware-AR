// Traditional Chinese place names are written 臺, never 台.
//
// 臺北市 / 臺中市 / 臺南市 / 臺東縣 / 臺西鄉 / 臺灣 are the forms the Ministry of
// the Interior uses, and they are what locationDataset.js and
// policeOrganization.js already store - 1101 and 77 occurrences of 臺, zero of
// 台. Copy written by hand elsewhere in the app drifted to the 台 form and had
// {datingLead} living in 台北 while the same device's police precinct resolved
// out of 臺北市, so this check exists to keep one spelling across the product.
//
// It is deliberately narrow, because 台 is a perfectly ordinary character:
//
//   - Only TOPONYM-shaped 台 is flagged - 台 immediately followed by a place
//     morpheme (灣/湾/北/中/南/東/西). That alone clears 平台, 櫃台, 舞台, 台端
//     (the formal "you" of a legal notice, not a place) and every 一台 / 12 台
//     measure-word use, none of which this check ever looks at.
//   - Only ZH surfaces are read. Japanese writes Taiwanese place names in Han
//     characters - 台北市信義区, 台湾台北地方検察署 - and that is correct
//     Japanese, not a leak. See the `jp` half of localization-leak-rules.mjs.
//
// Run from `npm run prebuild`, so a new 台北 in Chinese copy fails the build
// rather than reaching a screen.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { LOCALIZED_LOCATION_NAMES } from '../src/data/location/localizedLocationNames.js';
import { KANA } from './localization-leak-rules.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// 台 + a place morpheme. Nothing else in this repo is a toponym, and every
// non-place word that contains 台 fails this test by construction.
const TOPONYM = /^台[灣湾北中南東东西]/u;

// ...except where the 台 is the tail of another word and the place morpheme is
// the head of the next one. 平台 + 中 reads as 台中 to a two-character window,
// and "切換回平台中" is not a trip to Taichung.
const NOT_A_PLACE_TAIL = new Set([...'平櫃舞電陽窗站後前看吧月砲燈鑽擂戲觀天講祭斷烽']);

// Japanese shinjitai forms that only ever appear in the `jp` side of this
// repo. A run carrying one is Japanese text, whatever file it sits in -
// 台湾台北地方検察署 is the Japanese name, not a misspelt Chinese one.
const JAPANESE_FORM = /[湾検県区郷庁沢単担団]/u;

// Where Chinese copy lives. Dictionary VALUES are English or Japanese, so the
// two `Jp`/`jp` families are skipped wholesale and their Chinese KEYS are
// checked through the key pass below instead.
const SCAN_DIRS = ['webapp/src', 'webapp/scripts', 'docs', 'android', 'release'];
const SKIP = [
  /Jp\.js$/, /i18n\/jp\.js$/, /locales\/jp\.json$/, /-jp\.md$/,
  // Checked by key, not by line - its `jp:` values are Japanese by design.
  /data\/location\/localizedLocationNames\.js$/,
  // The zh->jp character table itself. 臺: '台' is the mapping, not a typo.
  /generate-location-localization\.mjs$/, /localization-leak-rules\.mjs$/,
  // This file: every example in the comments above is a 台 on purpose.
  /validate-zh-place-names\.mjs$/,
];

// Exact strings where 台 is correct in a Chinese-side file, each with its
// reason. Kept as whole strings rather than file-wide exemptions so a new 台
// on a neighbouring line is still caught.
const ALLOWED = new Map([
  ['元大台灣', 'registered fund name (元大台灣卓越50) - the issuer writes 台'],
  ['台北市政府警察局', 'Japanese assertion in scenario03-police-unit.test.mjs'],
  ['台北市', 'Japanese assertion in location-localization.test.mjs'],
  ['台灣數位銀行', 'a removed name this test asserts is absent - the historical spelling is the point'],
  ['台湾', 'Japanese for Taiwan'],
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    if (entry.isDirectory()) out.push(...walk(rel));
    else if (/\.(js|jsx|ts|tsx|json|mjs|css|html|md|txt|java|xml)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

// The maximal run of Han characters around position `i` - the unit that
// decides whether a 台 is part of a place name or part of another word.
function runAt(chars, i) {
  const han = (c) => /[㐀-鿿]/u.test(c ?? '');
  let a = i;
  let b = i;
  while (a > 0 && han(chars[a - 1])) a--;
  while (b < chars.length - 1 && han(chars[b + 1])) b++;
  return chars.slice(a, b + 1).join('');
}

const errors = [];

// Pass 1: Chinese copy, line by line.
for (const dir of SCAN_DIRS) {
  if (!fs.existsSync(path.join(root, dir))) continue;
  for (const file of walk(dir)) {
    if (SKIP.some((re) => re.test(file))) continue;
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    if (!source.includes('台')) continue;
    source.split('\n').forEach((line, index) => {
      // Kana on the line means the line is Japanese.
      if (KANA.test(line)) return;
      // A `jp`-keyed value is Japanese even on a line that carries no kana -
      // CITY_NAMES rows read `臺北市: { zh: '臺北', en: 'Taipei', jp: '台北' }`,
      // and that 台北 is the Japanese spelling, not a Chinese one.
      const chars = [...line.replace(/(?:"|')?(?:name)?[Jj]p(?:"|')?\s*:\s*(['"`])(?:\\.|(?!\1).)*\1/gu, '')];
      chars.forEach((char, i) => {
        if (char !== '台') return;
        if (NOT_A_PLACE_TAIL.has(chars[i - 1])) return;
        if (!TOPONYM.test(chars.slice(i, i + 2).join(''))) return;
        const run = runAt(chars, i);
        if (ALLOWED.has(run)) return;
        if (JAPANESE_FORM.test(run)) return;
        errors.push(`${file}:${index + 1}  ${run} - Chinese place names are written 臺 (${run.replace(/台/gu, '臺')})`);
      });
    });
  }
}

// Pass 2: the localized-name table, by key. Its keys are the Chinese names
// every dataset and profile stores; its values are the English and Japanese
// a player on those languages reads, and are not this check's business.
for (const name of Object.keys(LOCALIZED_LOCATION_NAMES)) {
  const chars = [...name];
  const offending = chars.some((char, i) => char === '台'
    && !NOT_A_PLACE_TAIL.has(chars[i - 1])
    && TOPONYM.test(chars.slice(i, i + 2).join('')));
  if (offending && !ALLOWED.has(name)) {
    errors.push(`src/data/location/localizedLocationNames.js  key "${name}" - Chinese place names are written 臺`);
  }
}

if (errors.length) {
  console.error(`zh-TW place names: ${errors.length} problem(s)\n`);
  for (const error of errors) console.error(`  ${error}`);
  console.error('\n台 is only correct here in Japanese text, in a registered proper noun, or in a');
  console.error('word that is not a place (平台, 櫃台, 台端, 一台). Add a reason to ALLOWED if so.');
  process.exit(1);
}

console.log(`zh-TW place names: OK (${Object.keys(LOCALIZED_LOCATION_NAMES).length} localized names, ${SCAN_DIRS.length} trees scanned)`);
