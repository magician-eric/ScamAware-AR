// Localized ASSET coverage.
//
// scripts/validate-i18n.mjs already guarantees that a Chinese string cannot be
// translated into one language and silently fall back to Chinese in the other.
// This script is the same guarantee for the files: an asset whose CONTENT is
// language - a clip of someone talking, artwork with drawn text, a recorded
// line - has to be chosen per language too, and when it cannot be, that has to
// be a listed gap rather than something the app quietly papers over.
//
// It exists because of a real bug: Scenario 02's three {datingLead} clips were
// resolved by a module-level constant evaluated at import time, before the
// player had chosen anything, so an English run played her Chinese recordings
// with nothing in the code able to say so. Nothing failed - every file existed,
// every path resolved, every UI string was English. Only watching it showed it.
//
// Three passes:
//   1. Every path a locale table names exists on disk.
//   2. No two languages share one file unless the registry DECLARES that gap,
//      which is what stops "en points at the zh file" from passing as coverage.
//      EVERY unordered pair is compared - zh/en, zh/jp AND en/jp. Comparing
//      each language against zh alone left a hole: two non-Chinese languages
//      pointing at one non-Chinese file was reported as coverage on both,
//      which is exactly the mislabelled-recording case this gate exists for.
//   3. Coverage is reported per family, and the declared gaps are printed as a
//      shopping list of the assets that still have to be produced.
//
// Exits non-zero on pass 1 or 2. A declared gap is reported, not failed: the
// missing recordings are a production task, and blocking the build on them
// would only mean deleting the declaration.
//
// A family may also declare `languageNeutral: true`: one asset with no language
// in its content, deliberately used by every language. There, sharing is the
// contract rather than the failure, and what is checked is the opposite - that
// all three DO resolve to the same file, so a per-language variant cannot be
// slipped in without registering it. Pass 2's pair comparison does not apply.
//
// The checker is exported (checkLocaleTable) so scripts/validate-localized-
// assets.test.mjs can drive every one of these shapes directly, instead of
// only ever seeing whatever the repo's real assets happen to look like today.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { LANGUAGES, asList, checkLocaleTable } from './localized-asset-rules.mjs';

const webapp = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const abs = (path) => resolvePath(webapp, path);

// Scenario03's registry reads browser storage at module load - same stub, same
// reason, as scripts/validate-asset-ownership.mjs.
globalThis.localStorage ??= { getItem: () => null };

// Loads a registry with Vite's BASE_URL given the value the dev server uses,
// so a runtime URL evaluates to a public-relative path.
async function loadRegistry(relativePath) {
  const absolute = abs(relativePath);
  const moduleDir = dirname(absolute);
  const code = (await readFile(absolute, 'utf8'))
    .replace(/import\.meta\.env\?\.BASE_URL/g, "'/'")
    .replace(/import\.meta\.env\.BASE_URL/g, "'/'")
    .replace(/import\.meta\.env\b/g, "({ BASE_URL: '/' })")
    .replace(/(from\s*|import\s*)(['"])(\.[^'"]*)\2/g, (match, prefix, quote, specifier) => {
      const target = ['', '.js', '.jsx', '/index.js'].map((ext) => resolvePath(moduleDir, specifier + ext)).find(existsSync);
      return target ? `${prefix}${quote}${pathToFileURL(target).href}${quote}` : match;
    });
  return import(`data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`);
}

const errors = [];
const fail = (message) => errors.push(message);

// A family is one logical asset that exists once per language. `table` returns
// { zh, en, jp } of either a path or a list of paths; `gaps` names the
// languages the registry itself declares it has no file for.
//
// Every locale-varying runtime asset in the app is listed here, plus the
// language-neutral ones that are big enough to be worth declaring (`languageNeutral:
// true` - one file, every language, on purpose). An asset whose content is not
// language and which nothing would ever try to localize - a face, a product
// photo, a Latin-only wordmark - does not need a line here; see
// docs/asset-localization-audit.md for which assets were judged which way, and why.
// Two ways a family can name its files:
//
//   `from` + `table`  the module is READ and its locale table evaluated, so
//                     the gate sees exactly what the app resolves at runtime.
//                     Requires the paths to be strings (a BASE_URL URL), which
//                     is what every asset served out of public/ is.
//
//   `files` + `pinnedIn`  a static, repo-relative table, for assets the
//                     BUNDLER imports (`import logoZh from './logo-zh.webp'`).
//                     Those resolve to hashed URLs that exist only after a
//                     build, so there is no runtime table to read - which is
//                     why the GuGo Invest wordmark, a genuinely per-language
//                     asset, sat outside this gate until now. `pinnedIn` names
//                     the module that must reference each filename, so the
//                     declaration cannot drift away from the code that uses it.
const FAMILIES = [
  {
    id: 'scenario01/teacher-pitch-video',
    what: "Coach Chen's pitch video",
    from: 'src/pages/scenario01/teacherVideo.js',
    table: (module) => module.TEACHER_VIDEO_SRC,
  },
  {
    id: 'scenario02/dating-lead-clips',
    what: "{datingLead}'s three selfie clips",
    from: 'src/experience/characters/visuals.js',
    table: (module) => module.getVisual('dating_visual_03').assets.videos,
    // The en/jp recordings do not exist. Declared here so pass 2 reports the
    // gap instead of failing on a fallback that is deliberate and known.
    gaps: ['en', 'jp'],
  },
  {
    id: 'shared/ar-scan-hero',
    what: 'AR scan home artwork (drawn masthead text)',
    from: 'src/pages/arScan/heroLayout.js',
    table: (module) => module.HERO_IMAGE_SRC_BY_LANG,
  },
  {
    id: 'gugo-invest/wordmark',
    what: 'GuGo Invest wordmark (drawn Chinese/English/Japanese lockup)',
    files: {
      zh: ['src/apps/gugo-invest/assets/logos/logo-zh.webp'],
      en: ['src/apps/gugo-invest/assets/logos/logo-en.webp'],
      jp: ['src/apps/gugo-invest/assets/logos/logo-jp.webp'],
    },
    pinnedIn: 'src/apps/gugo-invest/app/components/logo/LogoHorizontal.tsx',
  },
  {
    id: 'scenario03/call-recordings',
    what: 'Fake police / prosecutor call recordings',
    from: 'src/data/scenario03Dialogues.js',
    table: (module) => {
      const files = module.SCENARIO03_AUDIO_FILES;
      return Object.fromEntries(LANGUAGES.map((lang) => [lang, Object.values(files[lang] ?? {})]));
    },
  },
];

const publicPath = (url) => `public/${String(url).replace(/^\//, '')}`;

const report = [];

for (const family of FAMILIES) {
  let table;
  if (family.files) {
    table = family.files;
  } else {
    try {
      table = family.table(await loadRegistry(family.from));
    } catch (error) {
      fail(`${family.id}: ${family.from} could not be read as a locale table (${error.message})`);
      continue;
    }
  }
  if (!table || LANGUAGES.some((lang) => !(lang in table))) {
    fail(`${family.id}: ${family.from} does not expose all of ${LANGUAGES.join('/')}`);
    continue;
  }
  if ('ja' in table) fail(`${family.id}: uses 'ja'; the internal code for Japanese is always 'jp'`);

  const byLang = Object.fromEntries(LANGUAGES.map((lang) => [lang, asList(table[lang])]));

  // PASS 1 - a named file is a real file. A `files` family already gives
  // repo-relative paths; a runtime table gives a URL served out of public/.
  for (const lang of LANGUAGES) {
    for (const url of byLang[lang]) {
      const path = family.files ? String(url) : publicPath(url);
      if (!existsSync(abs(path))) {
        fail(`${family.id}: ${lang} names ${url}, which does not exist`);
      }
    }
  }

  // PASS 1b - a statically declared file must still be the one the app uses.
  if (family.pinnedIn) {
    let source = '';
    try {
      source = await readFile(abs(family.pinnedIn), 'utf8');
    } catch {
      fail(`${family.id}: ${family.pinnedIn} could not be read`);
    }
    for (const lang of LANGUAGES) {
      for (const path of byLang[lang]) {
        const filename = String(path).split('/').pop();
        if (source && !source.includes(filename)) {
          fail(`${family.id}: ${lang}'s ${filename} is declared here but ${family.pinnedIn} does not reference it`);
        }
      }
    }
  }

  // PASS 2 - every locale pair, plus per-language coverage. See checkLocaleTable.
  const checked = checkLocaleTable({
    id: family.id,
    byLang,
    gaps: family.gaps,
    languageNeutral: family.languageNeutral,
  });
  checked.errors.forEach(fail);
  report.push({ family, byLang, status: checked.status });
}

const pad = (value, width) => String(value).padEnd(width);
const widest = Math.max(...report.map(({ family }) => family.id.length), 10);

console.log('Localized asset coverage');
for (const { family, byLang, status } of report) {
  const counts = LANGUAGES.map((lang) => `${lang} ${pad(`${status[lang]}(${byLang[lang].length})`, 11)}`).join(' ');
  console.log(`  ${pad(family.id, widest)}  ${counts}  ${family.what}`);
}

const gaps = report.flatMap(({ family, byLang, status }) => LANGUAGES
  .filter((lang) => status[lang] === 'MISSING')
  .map((lang) => ({ family, lang, count: byLang.zh.length })));

if (gaps.length) {
  console.log('\nMissing localized assets (declared, still to be produced):');
  for (const { family, lang, count } of gaps) {
    console.log(`  ${family.id}  ${lang}  ${count} file(s)  ${family.what}`);
  }
}

if (errors.length) {
  console.error(`\n${errors.length} localized-asset problem(s):`);
  for (const message of errors) console.error(`  ${message}`);
  process.exit(1);
}

console.log(`\nLocalized assets OK - ${report.length} families, ${gaps.length} declared gap(s)`);
