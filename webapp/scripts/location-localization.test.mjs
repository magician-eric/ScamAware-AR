// The location datasets and their display names have to stay in step.
//
// data/location/locationDataset.js and data/location/policeOrganization.js
// are transcriptions of real Taiwanese agencies, and they store what those
// agencies are actually called - in Chinese. Every player-facing surface goes
// through lib/location/localizedLocationName.js to turn one of those names
// into what an English or Japanese player reads. That only works while the
// display table covers every name the datasets can produce, so this test
// fails the build when it does not - which is also what stops a new district
// or a renamed station from silently reaching an English screen in Chinese.
//
//   node --test scripts/location-localization.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import { findLeak } from './localization-leak-rules.mjs';
import { LOCATION_DATASET } from '../src/data/location/locationDataset.js';
import { POLICE_ORGANIZATION } from '../src/data/location/policeOrganization.js';
import { LOCALIZED_LOCATION_NAMES } from '../src/data/location/localizedLocationNames.js';
import { localizeLocationName, localizeRegion } from '../src/lib/location/localizedLocationName.js';

// Every Chinese name either dataset can hand a screen.
function datasetNames() {
  const names = new Set();
  for (const row of LOCATION_DATASET) {
    names.add(row.county);
    names.add(row.district);
    names.add(row.policeDepartment);
    names.add(row.prosecutorsOffice);
    names.add(row.districtCourt);
  }
  for (const county of POLICE_ORGANIZATION) {
    names.add(county.county);
    for (const division of county.divisions) {
      names.add(division.name);
      for (const station of division.stations) names.add(station.name);
    }
  }
  names.delete(undefined);
  return [...names];
}

test('every name in the location datasets has an English and a Japanese form', () => {
  const missing = datasetNames()
    .filter((name) => !LOCALIZED_LOCATION_NAMES[name]?.en || !LOCALIZED_LOCATION_NAMES[name]?.jp);
  assert.deepEqual(missing, [], 'names with no entry in localizedLocationNames.js');
});

test('no English location name contains Chinese', () => {
  const leaked = Object.entries(LOCALIZED_LOCATION_NAMES)
    .filter(([, value]) => findLeak(value.en, 'en'))
    .map(([name, value]) => `${name} -> ${value.en}`);
  assert.deepEqual(leaked, [], 'English display names that are still Chinese');
});

test('no Japanese location name is written in Traditional Chinese', () => {
  const leaked = Object.entries(LOCALIZED_LOCATION_NAMES)
    .filter(([, value]) => findLeak(value.jp, 'jp'))
    .map(([name, value]) => `${name} -> ${value.jp}`);
  assert.deepEqual(leaked, [], 'Japanese display names still in Traditional Chinese');
});

test('the table holds no name the datasets cannot produce', () => {
  const known = new Set(datasetNames());
  const orphans = Object.keys(LOCALIZED_LOCATION_NAMES).filter((name) => !known.has(name));
  assert.deepEqual(orphans, [], 'entries no dataset reaches - regenerate the table');
});

// The failure mode the whole-name rule exists to prevent: an override matching
// a PREFIX of a name and glueing the rest of the syllables onto it. 新北勢派出所
// is a station of 內埔分局 in Pingtung; matching the 新北 at the front of its
// name against New Taipei produced "New Taipeishi Police Station", which would
// have named the wrong station on every Scenario 03 surface in that
// jurisdiction.
//
// The tell is structural, not semantic: an official English name ends at a
// word boundary, so a county or city name immediately followed by more
// lowercase letters is a name that was decomposed and re-glued. Two districts
// genuinely sharing a romanization (高雄市桃源區 and 桃園市 are both "Taoyuan")
// are not that, and are not flagged.
test('no name is an override glued to the rest of its own syllables', () => {
  const overrides = [...new Set(
    LOCATION_DATASET.map((row) => LOCALIZED_LOCATION_NAMES[row.county]?.en ?? '')
      .filter(Boolean)
      .map((english) => english.replace(/ (City|County)$/, '')),
  )];
  const glued = [];
  for (const [chinese, value] of Object.entries(LOCALIZED_LOCATION_NAMES)) {
    for (const override of overrides) {
      if (new RegExp(`${override}[a-z]`).test(value.en)) {
        glued.push(`${chinese} -> ${value.en} (${override} + more syllables)`);
      }
    }
  }
  assert.deepEqual(glued, [], 'names built by matching an override against a prefix');
});

test('localizeLocationName leaves Chinese alone and translates the other two', () => {
  assert.equal(localizeLocationName('臺北市', 'zh'), '臺北市');
  assert.equal(localizeLocationName('臺北市', 'en'), 'Taipei City');
  assert.equal(localizeLocationName('臺北市', 'jp'), '台北市');
  assert.equal(localizeLocationName('信義分局', 'en'), 'Xinyi Precinct');
  // A whole-name override, not a prefix one - see the county test above.
  assert.equal(localizeLocationName('新北勢派出所', 'en'), 'Xinbeishi Police Station');
  assert.equal(localizeLocationName('新北市', 'en'), 'New Taipei City');
  assert.equal(localizeLocationName('臺灣臺北地方檢察署', 'en'), 'Taiwan Taipei District Prosecutors Office');
  assert.equal(localizeLocationName('臺灣臺北地方檢察署', 'jp'), '台湾台北地方検察署');
  // A name with no entry renders unchanged rather than blank - a gap has to
  // be visible, and a screen mid-run must never lose its agency name.
  assert.equal(localizeLocationName('無此機關', 'en'), '無此機關');
  assert.equal(localizeLocationName(null, 'en'), null);
});

test('localizeRegion writes an address the way each language writes one', () => {
  const region = { county: '臺北市', district: '信義區' };
  assert.equal(localizeRegion(region, 'zh'), '臺北市信義區');
  assert.equal(localizeRegion(region, 'en'), 'Xinyi District, Taipei City');
  assert.equal(localizeRegion(region, 'jp'), '台北市信義区');
});
