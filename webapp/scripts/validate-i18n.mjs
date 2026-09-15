// Localization validation. Three passes:
//
//   1. Key coverage, per localization unit - a Scenario dictionary or an App
//      module's own dictionary (§13 AD-14). Every Chinese source string a
//      unit reaches for must exist in both its English and its Japanese
//      table.
//   2. Three-language key-set agreement - a unit's EN and JP tables must
//      define exactly the same keys, so a string cannot be translated into
//      one language and silently fall back to Chinese in the other.
//   3. Duplicate keys across every dictionary module (§13 AD-30) - see the
//      block at the bottom for why this one has to read source text.
//
// Exits non-zero if any pass finds something.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EN as SCENARIO01_EN } from '../src/pages/scenario01/i18nEn.js';
import { JP as SCENARIO01_JP } from '../src/pages/scenario01/i18nJp.js';
import { EN as SCENARIO02_EN } from '../src/shared/i18n/scenario02En.js';
import { JP as SCENARIO02_JP } from '../src/shared/i18n/scenario02Jp.js';
import { EN as SCENARIO04_EN } from '../src/shared/i18n/scenario04En.js';
import { JP as SCENARIO04_JP } from '../src/shared/i18n/scenario04Jp.js';
import { EN as SCENARIO05_EN } from '../src/shared/i18n/scenario05En.js';
import { JP as SCENARIO05_JP } from '../src/shared/i18n/scenario05Jp.js';
import { EN as BLACKPI_EN } from '../src/apps/blackpi/i18n/en.js';
import { JP as BLACKPI_JP } from '../src/apps/blackpi/i18n/jp.js';
import { EN as COIN_WINNER_EN } from '../src/apps/coin-winner/i18n/en.js';
import { JP as COIN_WINNER_JP } from '../src/apps/coin-winner/i18n/jp.js';
import { EN as MYDONDON_EN } from '../src/apps/mydondon/i18n/en.js';
import { JP as MYDONDON_JP } from '../src/apps/mydondon/i18n/jp.js';
import { EN as MEETU_EN } from '../src/apps/meetu/i18n/en.js';
import { JP as MEETU_JP } from '../src/apps/meetu/i18n/jp.js';
import { EN as HPE_EN } from '../src/apps/hpe-logistics/i18n/en.js';
import { JP as HPE_JP } from '../src/apps/hpe-logistics/i18n/jp.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A localization unit is one dictionary and everything that reads from it.
//
// `scan` lists the source the unit's t() calls live in. `indirectKeys` names
// the files inside that source whose Chinese string literals are keys even
// though they never appear inside a t(...) call - tab tables, catalogs,
// tracking-step labels, dialogue data - because the t() that renders them
// takes a variable. Every Chinese literal in such a file is required to
// exist in both tables, which is also what makes a hard-coded label
// impossible to sneak in.
//
// App modules own their own dictionaries (§13 AD-14): an App's UI copy is
// listed under the App, never under the Scenario that happens to mount it.
// `appOwned` treats the App's whole source as indirect - every Chinese
// literal an App writes is copy the App has to be able to say in three
// languages - minus `exempt`, which is where an App keeps copy that is
// already per-language and so is not looked up at all.
const UNITS = [
  // Scenario 01 keys off its Chinese source exactly as 02/04/05 do and was
  // simply never listed here, so nothing checked that its English and
  // Japanese tables covered the screens they dress.
  {
    name: 'Scenario 01',
    en: SCENARIO01_EN,
    jp: SCENARIO01_JP,
    scan: ['src/pages/scenario01', 'src/lib/scenario01Characters.js'],
  },
  {
    name: 'Scenario 02',
    en: SCENARIO02_EN,
    jp: SCENARIO02_JP,
    scan: ['src/pages/scenario02'],
  },
  {
    name: 'Scenario 04',
    en: SCENARIO04_EN,
    jp: SCENARIO04_JP,
    scan: ['src/pages/scenario04', 'src/data/dialogueTrees'],
  },
  {
    name: 'Scenario 05',
    en: SCENARIO05_EN,
    jp: SCENARIO05_JP,
    // components/ghostorder moved into pages/scenario05/components/ when
    // AD-07 gave its single consumer ownership (#296), so the directory
    // above already covers it.
    scan: [
      'src/pages/scenario05',
      'src/data/scenario05Dialogues.js',
      'src/data/scenario05Characters.js',
      'src/data/scenario05FakeSite.js',
    ],
    indirectKeys: [
      'src/pages/scenario05/Quiz.jsx',
      'src/pages/scenario05/Reveal.jsx',
      'src/data/scenario05Characters.js',
    ],
  },
  // BlackPi's asset table used to sit in the shared src/data/ and had to be
  // scanned separately; AD-15 (#298) moved it to apps/blackpi/data/assetMap.js,
  // which is exactly where its Chinese photo captions were already being
  // translated. It now falls inside the App's own scan.
  { name: 'App: blackpi', en: BLACKPI_EN, jp: BLACKPI_JP, scan: ['src/apps/blackpi'], appOwned: true },
  { name: 'App: coin-winner', en: COIN_WINNER_EN, jp: COIN_WINNER_JP, scan: ['src/apps/coin-winner'], appOwned: true },
  { name: 'App: mydondon',
    en: MYDONDON_EN,
    jp: MYDONDON_JP,
    scan: ['src/apps/mydondon'],
    appOwned: true,
    // MyDonDon's catalog is already written per language ({ zh, en, jp } on
    // every field, resolved by getProduct(id, lang)), so its strings never
    // reach a dictionary lookup and must not be demanded of one.
    exempt: ['src/apps/mydondon/data/catalog.js'] },
  { name: 'App: meetu', en: MEETU_EN, jp: MEETU_JP, scan: ['src/apps/meetu'], appOwned: true },
  { name: 'App: hpe-logistics', en: HPE_EN, jp: HPE_JP, scan: ['src/apps/hpe-logistics'], appOwned: true },
];

// Brand marks. A wordmark is not translated - it is the same name in every
// language - so these render straight rather than through a dictionary, and
// demanding an entry for them would be noise.
const BRAND_MARKS = new Set([
  '黑皮通',
  '覓友',
  'MeetU｜覓友',
  'MyDonDon 買東東',
]);

// There is no allowance for an untranslated string any more. The list that
// used to live here recorded ten strings that rendered their Chinese source
// in EN and JP - four <img alt> captions, two shortened warning bodies, three
// video/result controls and one support-agent line - and every one of them
// was text a player on `en` actually read. They are translated now, and the
// only thing this file still declines to demand a translation for is a
// wordmark, which is the same name in every language.
const NOT_TRANSLATABLE = new Set(BRAND_MARKS);

// A dictionary is not a source of keys - its values are the translations.
const IS_DICTIONARY_SOURCE = /\/i18n\//;

function sourceFiles(target) {
  const absolute = path.join(root, target);
  if (!fs.statSync(absolute).isDirectory()) return [target];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.posix.join(target, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [child] : [];
  });
}

function decodeLiteral(quote, body) {
  return body
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\(['"`\\])/g, '$1');
}

function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function literals(source) {
  const values = [];
  const literalPattern = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  for (const match of source.matchAll(literalPattern)) {
    if (match[1] === '`' && match[2].includes('${')) continue;
    values.push(decodeLiteral(match[1], match[2]));
  }
  return values;
}

function directTranslationKeys(source) {
  const keys = [];
  const callPattern = /\b(?:t|tt|translate)\s*\(\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  for (const match of source.matchAll(callPattern)) {
    if (match[1] === '`' && match[2].includes('${')) continue;
    keys.push(decodeLiteral(match[1], match[2]));
  }
  return keys;
}

const HAS_CHINESE = /[\u3400-\u9fff]/u;

function unitKeys(unit) {
  const exempt = new Set(unit.exempt ?? []);
  const files = [...new Set([...unit.scan, ...(unit.extraScan ?? [])].flatMap(sourceFiles))]
    .filter((file) => !IS_DICTIONARY_SOURCE.test(file) && !exempt.has(file));
  const indirect = new Set(unit.indirectKeys ?? []);
  const keys = new Set();
  for (const file of files) {
    const source = withoutComments(fs.readFileSync(path.join(root, file), 'utf8'));
    directTranslationKeys(source).forEach((key) => keys.add(key));
    if (unit.appOwned || indirect.has(file)) {
      literals(source).filter((value) => HAS_CHINESE.test(value)).forEach((key) => keys.add(key));
    }
  }
  for (const skipped of NOT_TRANSLATABLE) keys.delete(skipped);
  return keys;
}

let coverageFailed = false;
for (const unit of UNITS) {
  const keys = unitKeys(unit);
  const missingEn = [...keys].filter((key) => !Object.hasOwn(unit.en, key)).sort();
  const missingJp = [...keys].filter((key) => !Object.hasOwn(unit.jp, key)).sort();
  // Pass 2: zh-TW (the key set), EN and JP must describe the same strings.
  const enOnly = Object.keys(unit.en).filter((key) => !Object.hasOwn(unit.jp, key)).sort();
  const jpOnly = Object.keys(unit.jp).filter((key) => !Object.hasOwn(unit.en, key)).sort();

  console.log(`\n${unit.name}: ${keys.size} source keys, ${Object.keys(unit.en).length} EN / ${Object.keys(unit.jp).length} JP entries`);
  const report = (label, list) => {
    console.log(`  ${label} (${list.length}):`);
    list.forEach((key) => console.log(`    - ${JSON.stringify(key)}`));
  };
  if (missingEn.length) report('missing EN keys', missingEn);
  if (missingJp.length) report('missing JP keys', missingJp);
  if (enOnly.length) report('translated in EN but not JP', enOnly);
  if (jpOnly.length) report('translated in JP but not EN', jpOnly);
  if (missingEn.length || missingJp.length || enOnly.length || jpOnly.length) coverageFailed = true;

  // Entries nothing reaches for. Reported, never fatal: a dictionary key can
  // be reached through a construction this scan cannot follow, so a hard
  // failure here would be a guess. It is printed because a table that has
  // drifted from the screens it dresses is worth seeing, and because after a
  // move of ownership it is the list to check.
  if (process.env.I18N_REPORT_UNUSED) {
    const unused = Object.keys(unit.en).filter((key) => !keys.has(key)).sort();
    console.log(`  entries no scanned source reaches (${unused.length}):`);
    unused.forEach((key) => console.log(`    - ${JSON.stringify(key)}`));
  }
}

if (coverageFailed) process.exitCode = 1;

// ---------------------------------------------------------------------------
// Duplicate-key detection (§13 AD-30)
//
// A key defined twice in the same object literal is legal JavaScript: the
// later definition silently overwrites the earlier one. That means the
// collision is already gone by the time a dictionary module has been
// imported - Object.hasOwn()/Object.keys() above can never see it, and a
// reviewer editing the losing entry changes nothing on screen. The only
// place a duplicate is still visible is the source text, so this pass reads
// the dictionary files instead of the objects they export.
//
// It is deliberately not scoped to the dictionary that regressed: every
// scenario dictionary is scanned (scenario01/03 keep theirs next to the
// pages, scenario02/04/05 in shared/i18n/), so the same silent overwrite
// cannot reappear in a different table.
// ---------------------------------------------------------------------------

const dictionaryTargets = ['src/shared/i18n', 'src/pages', 'src/apps'];

// Everything under the shared i18n directory, and everything in an App
// module's own i18n/ directory, is a dictionary module; page-side ones are
// recognised by the "i18n" marker in their filename. The codebase
// spells that marker three ways depending on where in the name it lands -
// `i18n.js` and `i18nEn.js` lead with it, `scenarioMenuI18n.js` carries it as
// a camelCase suffix - so match it anywhere in the basename and
// case-insensitively. Anchoring to the start (or to lower case) silently
// skipped scenarioMenuI18n.js, which is a real dictionary listed in §10.2.
function isDictionaryModule(file) {
  if (file.startsWith('src/shared/i18n/')) return true;
  // apps/<app>/i18n/{en,jp}.js - named for the language, not for "i18n", so
  // the filename marker below would walk straight past them (§13 AD-14).
  if (/^src\/apps\/[^/]+\/i18n\//.test(file)) return true;
  const basename = file.slice(file.lastIndexOf('/') + 1);
  return /i18n/i.test(basename) && /\.[cm]?js$/.test(basename);
}

// True for the characters JavaScript allows to start an unquoted key.
// scenario03/arScan namespace their tables (`common: { continue: '繼續' }`),
// so identifier keys have to be collected alongside quoted ones.
function isIdentifierStart(ch) {
  return /[A-Za-z_$]/.test(ch);
}

// Index of the next character that is neither whitespace nor a comment -
// used to decide whether a literal/identifier is a key (followed by ':')
// or just a value that happens to sit in the same position.
function nextSignificant(source, index) {
  let i = index;
  while (i < source.length) {
    if (/\s/.test(source[i])) { i += 1; continue; }
    if (source[i] === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end + 1;
      continue;
    }
    if (source[i] === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    return i;
  }
  return -1;
}

// Walks one `const NAME = { ... }` declaration and reports every key that is
// defined more than once *within the same object literal*. Per-literal
// scoping is what makes this safe on nested tables: two sibling objects in
// the same array legitimately repeat their keys and must not be flagged,
// while two entries of one table repeating a key must.
function scanDeclaration(source, start, startLine, declaredName, duplicates, file) {
  const root = { seen: new Map(), label: declaredName, expectKey: true, current: null, collects: true };
  const stack = [root];
  let line = startLine;
  let i = start;

  const closeEntry = (frame, end) => {
    if (frame.current && frame.current.valueStart !== null && frame.current.value === null) {
      frame.current.value = source.slice(frame.current.valueStart, end).trim().replace(/,$/, '').trim();
    }
    frame.current = null;
  };

  const recordKey = (frame, key, keyLine) => {
    const entry = { key, line: keyLine, valueStart: null, value: null };
    frame.current = entry;
    if (!frame.collects) return;
    const previous = frame.seen.get(key);
    if (previous) {
      duplicates.push({
        file,
        path: stack.filter((f) => f.label !== null).map((f) => f.label).join('.'),
        key,
        first: previous,
        second: entry,
      });
      return;
    }
    frame.seen.set(key, entry);
  };

  while (i < source.length && stack.length) {
    const frame = stack[stack.length - 1];
    const ch = source[i];

    if (ch === '\n') { line += 1; i += 1; continue; }
    if (/\s/.test(ch)) { i += 1; continue; }

    if (ch === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      line += source.slice(i, stop).split('\n').length - 1;
      i = stop;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      const openLine = line;
      let j = i + 1;
      for (; j < source.length; j += 1) {
        if (source[j] === '\\') {
          if (source[j + 1] === '\n') line += 1;
          j += 1;
          continue;
        }
        if (source[j] === '\n') { line += 1; continue; }
        if (source[j] === ch) break;
      }
      const body = source.slice(i + 1, j);
      const after = nextSignificant(source, j + 1);
      if (frame.expectKey && after !== -1 && source[after] === ':') {
        recordKey(frame, decodeLiteral(ch, body), openLine);
      }
      frame.expectKey = false;
      i = j + 1;
      continue;
    }

    if (isIdentifierStart(ch)) {
      let j = i;
      while (j < source.length && /[\w$]/.test(source[j])) j += 1;
      const after = nextSignificant(source, j);
      if (frame.expectKey && after !== -1 && source[after] === ':') {
        recordKey(frame, source.slice(i, j), line);
      }
      frame.expectKey = false;
      i = j;
      continue;
    }

    if (ch === ':') {
      if (frame.current && frame.current.valueStart === null) frame.current.valueStart = i + 1;
      i += 1;
      continue;
    }

    if (ch === ',') {
      closeEntry(frame, i);
      frame.expectKey = true;
      i += 1;
      continue;
    }

    if (ch === '{') {
      stack.push({
        seen: new Map(),
        label: frame.current ? frame.current.key : null,
        expectKey: true,
        current: null,
        collects: true,
      });
      i += 1;
      continue;
    }

    // Arrays and call/grouping parens get a frame purely so their commas
    // cannot be mistaken for the end of an entry in the table around them.
    if (ch === '[' || ch === '(') {
      stack.push({ seen: null, label: null, expectKey: false, current: null, collects: false });
      i += 1;
      continue;
    }

    if (ch === '}' || ch === ']' || ch === ')') {
      closeEntry(frame, i);
      stack.pop();
      const parent = stack[stack.length - 1];
      if (parent) parent.expectKey = false;
      i += 1;
      continue;
    }

    frame.expectKey = false;
    i += 1;
  }
}

function duplicateKeys(source, file) {
  const duplicates = [];
  const declaration = /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/gm;
  for (const match of source.matchAll(declaration)) {
    const startLine = source.slice(0, match.index).split('\n').length;
    scanDeclaration(source, match.index + match[0].length, startLine, match[1], duplicates, file);
  }
  return duplicates;
}

const dictionaries = [...new Set(dictionaryTargets.flatMap(sourceFiles))].filter(isDictionaryModule).sort();
const duplicates = dictionaries.flatMap((file) => duplicateKeys(fs.readFileSync(path.join(root, file), 'utf8'), file));

// List the modules, not just the count. Under-coverage here is silent by
// nature - a dictionary the discovery pattern misses looks exactly like a
// dictionary with no duplicates - so the set being scanned has to be visible
// to whoever reads the output. A bare number hid scenarioMenuI18n.js.
console.log(`\nDictionary modules scanned for duplicate keys (${dictionaries.length}):`);
dictionaries.forEach((file) => console.log(`  - ${file}`));
console.log(`duplicate keys (${duplicates.length}):`);
for (const duplicate of duplicates) {
  console.log(`  - ${duplicate.file}: ${duplicate.path} defines ${JSON.stringify(duplicate.key)} twice`);
  console.log(`      line ${duplicate.first.line}: ${duplicate.first.value}`);
  console.log(`      line ${duplicate.second.line}: ${duplicate.second.value}`);
  console.log(`      values ${duplicate.first.value === duplicate.second.value ? 'identical - the earlier entry is dead weight' : 'DIFFER - the later one wins and the earlier one never renders'}`);
}

if (duplicates.length) process.exitCode = 1;
