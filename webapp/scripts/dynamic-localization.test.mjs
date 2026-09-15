// Per-run generated data has to be localized too - that is the whole point of
// this suite.
//
// The static dictionaries are checked elsewhere. What is checked here is
// everything a run *generates*: the county and district the device is set to,
// the police department / division / station drawn for the run, the
// prosecutors office and district court, the impersonated officer's and
// prosecutor's names, their job titles, the LINE account name that stitches a
// unit to a rank to a name, the masked delivery address, and the run's bank
// and case identifiers. Every one of those reaches a screen; none of them
// comes from a dictionary; all of them used to be Chinese in all three
// languages.
//
//   node --experimental-loader ./scripts/extensionless-loader.mjs \
//        --test ./scripts/dynamic-localization.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { findLeak } from './localization-leak-rules.mjs';

globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.sessionStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };

const {
  createScenarioSession,
  getPoliceUnitDisplay,
  getProsecutorsOfficeDisplay,
  getDistrictCourtDisplay,
  getOfficerDisplayName,
  getProsecutorDisplayName,
  getLineAccountDisplayName,
} = await import('../src/lib/session/ScenarioSessionFactory.js');
const { buildFakeDocuments } = await import('../src/data/scenario03Config.js');
const { SCENARIO03_DIALOGUES, buildDialogueBeats } = await import('../src/data/scenario03Dialogues.js');
const { getScenario03Choices } = await import('../src/data/scenario03Choices.js');
const { localizeLocationName, localizeRegion } = await import('../src/lib/location/localizedLocationName.js');
const { NAME_POOLS, MALE_FORMAL_NAME_PARTS, resolveFormalMaleName } = await import('../src/experience/characters/names.js');
const { ROLES } = await import('../src/experience/characters/roles.js');
const { readCachedSync } = await import('../src/lib/location/LocationProfileStore.js');
const { LOCATION_DATASET } = await import('../src/data/location/locationDataset.js');
const { POLICE_ORGANIZATION } = await import('../src/data/location/policeOrganization.js');

const LANGUAGES = ['zh', 'en', 'jp'];
// The rank/title each language shows next to an impersonated official's name -
// what a screen passes into getLineAccountDisplayName. Taken from the
// Scenario 03 dictionary rather than invented here.
const OFFICER_SUFFIX = { zh: '偵查佐', en: 'Investigating Officer', jp: '担当捜査員' };
const PROSECUTOR_SUFFIX = { zh: '檢察官', en: 'Prosecutor', jp: '検察官' };

const session = createScenarioSession();

// One named category of generated data -> the strings it puts on screen, in
// one language. Named so a failure says which KIND of data leaked, which is
// what a reviewer needs to know.
function generated(lang) {
  const unit = getPoliceUnitDisplay(session, lang);
  const region = readCachedSync()?.region ?? {};
  return {
    'County names': [localizeLocationName(region.county, lang)],
    'District names': [localizeLocationName(region.district, lang)],
    'Police departments': [unit.department],
    'Precincts': [unit.division],
    'Police stations': [unit.station, unit.handlingUnit],
    'Prosecutors offices': [getProsecutorsOfficeDisplay(session, lang)],
    'District courts': [getDistrictCourtDisplay(session, lang)],
    'Officer names': [getOfficerDisplayName(session, lang)],
    'Prosecutor names': [getProsecutorDisplayName(session, lang)],
    'Job titles': [
      getLineAccountDisplayName(session, lang, OFFICER_SUFFIX[lang]),
      `${PROSECUTOR_SUFFIX[lang]} ${getProsecutorDisplayName(session, lang)}`,
    ],
    'Addresses': [localizeRegion(region, lang)],
    'Bank/account dynamic data': [
      session.fakeBankAccount, session.maskedBankAccount, session.acct4,
      session.caseNumber, session.fakePhoneNumber, ...(session.documentSerials ?? []),
    ],
    'Case documents': buildFakeDocuments(session, lang).flatMap((doc) => [
      doc.title, doc.issuer, doc.consent,
      ...(doc.rows ?? []).flat().map(String),
      ...(doc.paragraphs ?? []),
      ...(doc.table ?? []).flat().map(String),
    ]),
    'Dialogue lines': Object.keys(SCENARIO03_DIALOGUES).flatMap((id) =>
      buildDialogueBeats(id, session, lang).flatMap((beat) => [beat.text, beat.speakerLabel])),
    'Dialogue choices': Object.values(getScenario03Choices(lang)).flatMap((choice) => [
      choice.question, ...(choice.options ?? []).map((option) => option.label ?? option.text),
    ]),
  };
}

for (const lang of LANGUAGES) {
  const categories = generated(lang);
  for (const [category, values] of Object.entries(categories)) {
    test(`${category} carry no wrong-language text in ${lang}`, () => {
      const leaks = values
        .filter((value) => typeof value === 'string' && value.trim())
        .map((value) => [value, findLeak(value, lang)])
        .filter(([, leak]) => leak)
        .map(([value, leak]) => `${JSON.stringify(value.slice(0, 120))} - ${leak.reason}`);
      assert.deepEqual(leaks, [], `${category} leaked in ${lang}`);
    });
  }
}

test('a run generates something in every category, so the checks above are not vacuous', () => {
  const categories = generated('en');
  const empty = Object.entries(categories)
    .filter(([, values]) => !values.some((value) => typeof value === 'string' && value.trim()))
    .map(([category]) => category);
  assert.deepEqual(empty, [], 'categories a run produced nothing for');
});

// The run above only exercises whichever county the device happens to be set
// to. These two walk the whole dataset, so a county nobody has ever deployed
// to is covered by the same guarantee.
test('every county and district in the dataset localizes in all three languages', () => {
  const leaks = [];
  for (const row of LOCATION_DATASET) {
    for (const lang of LANGUAGES) {
      for (const name of [row.county, row.district, row.policeDepartment, row.prosecutorsOffice, row.districtCourt]) {
        const localized = localizeLocationName(name, lang);
        const leak = findLeak(localized, lang);
        if (leak) leaks.push(`${lang} ${name} -> ${localized} - ${leak.reason}`);
      }
    }
  }
  assert.deepEqual(leaks.slice(0, 20), [], `${leaks.length} location names leaked`);
});

test('every division and station in the dataset localizes in all three languages', () => {
  const leaks = [];
  for (const county of POLICE_ORGANIZATION) {
    for (const division of county.divisions) {
      for (const name of [division.name, ...division.stations.map((station) => station.name)]) {
        for (const lang of LANGUAGES) {
          const localized = localizeLocationName(name, lang);
          const leak = findLeak(localized, lang);
          if (leak) leaks.push(`${lang} ${name} -> ${localized} - ${leak.reason}`);
        }
      }
    }
  }
  assert.deepEqual(leaks.slice(0, 20), [], `${leaks.length} police-unit names leaked`);
});

// The cast is drawn per run too, and a name pool is exactly the kind of table
// where an English entry quietly stays Chinese. Scenario 01's coach, Scenario
// 02's dating profiles and Scenario 05's buyers are all named from here.
test('every character name pool is written in its own language', () => {
  const leaks = [];
  for (const [gender, styles] of Object.entries(NAME_POOLS)) {
    for (const [style, byLanguage] of Object.entries(styles)) {
      for (const [lang, names] of Object.entries(byLanguage)) {
        for (const name of names) {
          const leak = findLeak(name, lang);
          if (leak) leaks.push(`${gender}.${style}.${lang} ${name} - ${leak.reason}`);
        }
      }
    }
  }
  assert.deepEqual(leaks, [], 'name-pool entries in the wrong language');
});

test('every fixed role has a name in all three languages, each in its own', () => {
  const missing = [];
  const leaks = [];
  for (const [id, role] of Object.entries(ROLES)) {
    if (!role.resolvedNames) continue;
    for (const lang of LANGUAGES) {
      const name = role.resolvedNames[lang];
      if (!name) { missing.push(`${id}.${lang}`); continue; }
      const leak = findLeak(name, lang);
      if (leak) leaks.push(`${id}.${lang} ${name} - ${leak.reason}`);
    }
  }
  assert.deepEqual(missing, [], 'fixed roles missing a language');
  assert.deepEqual(leaks, [], 'fixed-role names in the wrong language');
});

test('the impersonated officer and prosecutor draw a name in all three languages', () => {
  const leaks = [];
  // Every surname x given-name pairing, not one sample draw: a single bad
  // entry in either pool has to fail this.
  for (const kind of Object.keys(MALE_FORMAL_NAME_PARTS)) {
    const pool = MALE_FORMAL_NAME_PARTS[kind];
    const total = Math.max(
      pool.surnames.length * pool.given.length,
      pool.jpSurnames.length * pool.jpGiven.length,
    );
    for (let i = 0; i < total; i += 1) {
      let call = 0;
      // A deterministic sweep of the pools rather than Math.random, so this
      // covers every combination instead of whichever one a run happened to
      // draw.
      const name = resolveFormalMaleName(kind, () => {
        const lengths = [pool.surnames.length, pool.given.length, pool.jpSurnames.length, pool.jpGiven.length];
        const index = call % 4;
        call += 1;
        return ((i + index) % lengths[index]) / lengths[index];
      });
      for (const lang of LANGUAGES) {
        const leak = findLeak(name[lang], lang);
        if (leak) leaks.push(`${kind}.${lang} ${name[lang]} - ${leak.reason}`);
      }
    }
  }
  assert.deepEqual(leaks, [], 'drawn official names in the wrong language');
});
