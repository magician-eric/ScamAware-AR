import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCATION_DATASET } from '../../data/location/locationDataset.js';
import { resolveLocation } from './RegionAgencyResolver.js';
import { migrateLocationProfile } from './LocationProfileStore.js';

test('production dataset contains exactly 22 counties and 368 unique districts', () => {
  assert.equal(new Set(LOCATION_DATASET.map((row) => row.county)).size, 22);
  assert.equal(LOCATION_DATASET.length, 368);
  assert.equal(new Set(LOCATION_DATASET.map((row) => `${row.county}/${row.district}`)).size, 368);
});

test('every district has department, justice, and telephone mappings', () => {
  for (const row of LOCATION_DATASET) {
    assert.ok(row.policeDepartment, `${row.county}${row.district} department`);
    assert.ok(row.prosecutorsOffice, `${row.county}${row.district} prosecutors`);
    assert.ok(row.districtCourt, `${row.county}${row.district} court`);
    assert.ok(row.telephoneAreaCode, `${row.county}${row.district} area code`);
    assert.ok(resolveLocation(row.county, row.district).policePrecinct, `${row.county}${row.district} division`);
  }
});

test('district-aware justice and telephone edge cases resolve correctly', () => {
  assert.equal(resolveLocation('臺北市', '士林區').prosecutorsOffice, '臺灣士林地方檢察署');
  assert.equal(resolveLocation('臺北市', '北投區').districtCourt, '臺灣士林地方法院');
  assert.equal(resolveLocation('金門縣', '烏坵鄉').telephoneAreaCode, '0826');
  for (const county of ['桃園市', '新竹市', '新竹縣', '宜蘭縣', '花蓮縣']) {
    assert.equal(LOCATION_DATASET.find((row) => row.county === county).telephoneAreaCode, '03');
  }
  assert.equal(resolveLocation('苗栗縣', '苗栗市').policeDepartment, '苗栗縣警察局');
  assert.equal(resolveLocation('彰化縣', '彰化市').policeDepartment, '彰化縣警察局');
  assert.equal(resolveLocation('雲林縣', '斗六市').policeDepartment, '雲林縣警察局');
});

test('the profile locks the division but never a station', () => {
  const v1 = { version: 1, region: { county: '臺北市', district: '信義區' }, agencies: {} };
  const migrated = migrateLocationProfile(v1);
  assert.equal(migrated.agencies.policePrecinct, '信義分局');
  assert.equal(migrated.agencies.policeStation, undefined);
  // Station selection belongs to the scenario session, so re-reading the
  // profile can never change what the current run is showing.
  assert.deepEqual(migrateLocationProfile(migrated).agencies, migrated.agencies);
});

test('a split district is reported as ambiguous, not as a confident answer', () => {
  const location = resolveLocation('臺北市', '中正區');
  assert.deepEqual(location.precincts, ['中正第一分局', '中正第二分局']);
  assert.equal(location.policePrecinct, '中正第一分局');
  assert.equal(location.precinctResolution.isAmbiguous, true);
  assert.equal(location.precinctResolution.basis, 'ambiguous-default');
  assert.equal(location.precinctResolution.fallbackReason, 'ambiguous-jurisdiction-no-boundary-data');
});
