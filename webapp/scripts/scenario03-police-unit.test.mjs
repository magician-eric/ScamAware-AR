// Scenario 03's police unit, end to end: the division comes from the locked
// location profile (deterministic), the station is drawn once per run from
// that division's own units, and the whole run then reads the snapshot.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const store = new Map();
globalThis.sessionStorage = {
  getItem: (key) => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
  removeItem: (key) => store.delete(key),
};
globalThis.localStorage = { ...globalThis.sessionStorage };

const { listDivisions } = await import('../src/lib/location/PoliceOrganizationResolver.js');
const { createScenarioSession, getOrCreateScenarioSession, clearScenarioSession } =
  await import('../src/lib/session/ScenarioSessionFactory.js');

// No staff profile is written here, so the run uses DEFAULT_LOCATION_PROFILE
// (臺北市/信義區) - the same path a device that skipped staff setup takes.
function stationsOf(session) {
  const division = listDivisions('臺北市').find((item) => item.id === session.policeDivisionId);
  return division.stations.map((station) => station.name);
}

test('a run snapshots one division and one of its own stations', () => {
  clearScenarioSession();
  const session = createScenarioSession();
  assert.equal(session.policeDepartment, '臺北市政府警察局');
  assert.equal(session.policeDivision, '信義分局');
  assert.ok(stationsOf(session).includes(session.policeStation));
  assert.equal(session.policeUnitIsFallback, false);
});

test('the station never changes while the run is alive', () => {
  clearScenarioSession();
  const session = createScenarioSession();
  for (let i = 0; i < 25; i += 1) {
    const reread = getOrCreateScenarioSession();
    assert.equal(reread.policeStation, session.policeStation);
    assert.equal(reread.policeDivision, session.policeDivision);
    assert.equal(reread.caseNumber, session.caseNumber);
  }
});

test('a new run re-draws the station but keeps the same division', () => {
  const seen = new Set();
  for (let i = 0; i < 60; i += 1) {
    clearScenarioSession();
    const session = createScenarioSession();
    assert.equal(session.policeDivision, '信義分局');
    assert.ok(stationsOf(session).includes(session.policeStation));
    seen.add(session.policeStation);
  }
  assert.ok(seen.size > 1, 'a new run should be able to draw a different station');
});

test('a split district reaches the session as an audited ambiguous resolution', async () => {
  const { migrateLocationProfile } = await import('../src/lib/location/LocationProfileStore.js');
  const profile = migrateLocationProfile({
    version: 2,
    locked: true,
    source: 'manual',
    coordinates: null,
    region: { county: '新北市', district: '板橋區' },
    agencies: {},
  });
  assert.equal(profile.agencies.policePrecinct, '板橋分局');
  assert.equal(profile.agencies.policeDivisionIsAmbiguous, true);

  const { resolvePoliceAssignment } = await import('../src/lib/location/PoliceOrganizationResolver.js');
  const assignment = resolvePoliceAssignment('新北市', '板橋區', () => 0.4);
  assert.equal(assignment.isAmbiguous, true);
  assert.equal(assignment.fallbackReason, 'ambiguous-jurisdiction-no-boundary-data');
  const division = listDivisions('新北市').find((item) => item.id === assignment.divisionId);
  assert.ok(division.stations.some((station) => station.name === assignment.stationName));
});

test('a village on the profile resolves the split instead of falling back', async () => {
  const { migrateLocationProfile } = await import('../src/lib/location/LocationProfileStore.js');
  const profile = migrateLocationProfile({
    version: 2,
    locked: true,
    source: 'manual',
    coordinates: null,
    region: { county: '南投縣', district: '南投市', village: '光明里' },
    agencies: {},
  });
  assert.equal(profile.agencies.policePrecinct, '中興分局');
  assert.equal(profile.agencies.policeDivisionIsAmbiguous, false);
});

// --- UI wiring -------------------------------------------------------------
// The screens themselves are React components, so these tests pin the one
// accessor every screen reads (getPoliceUnitDisplay) plus the document
// builder in scenario03Config - the two places a screen could otherwise have
// re-resolved or re-drawn a unit.
const { getPoliceUnitDisplay } = await import('../src/lib/session/ScenarioSessionFactory.js');
const { buildFakeDocuments } = await import('../src/data/scenario03Config.js');

function unitRow(session, lang) {
  const notice = buildFakeDocuments(session, lang).find((doc) => doc.key === 'notice');
  return notice.rows.find(([label]) => ['通知單位', 'Issuing Unit', '通知機関'].includes(label))[1];
}

test('every Scenario 03 surface renders the same unit from one snapshot', () => {
  clearScenarioSession();
  const session = createScenarioSession();
  const unit = getPoliceUnitDisplay(session);

  assert.equal(unit.department, session.policeDepartment);
  assert.equal(unit.division, session.policeDivision);
  assert.equal(unit.station, session.policeStation);
  assert.equal(unit.handlingUnit, `${session.policeDivision} ${session.policeStation}`);

  // Re-reading the session the way each screen does must not change anything.
  for (let i = 0; i < 10; i += 1) {
    const reread = getPoliceUnitDisplay(getOrCreateScenarioSession());
    assert.deepEqual(reread, unit);
  }
  // The fake documents (case site) show that same unit - the same run's one
  // division and station - written in the language the document is in. The
  // unit does not change with the language; only how it is spelled does, so
  // each locale is compared against that locale's own accessor rather than
  // against the Chinese one (which is what used to put 信義分局 on an English
  // 公文).
  for (const lang of ['zh', 'en', 'jp']) {
    assert.equal(unitRow(session, lang), getPoliceUnitDisplay(session, lang).handlingUnit, lang);
  }
});

test('an older session with no division or station degrades instead of crashing', () => {
  const legacy = {
    caseNumber: 'TPECIB20260101165000',
    locationProfile: { agencies: { policeDepartment: '臺北市政府警察局' } },
  };
  const unit = getPoliceUnitDisplay(legacy);
  assert.equal(unit.department, '臺北市政府警察局');
  assert.equal(unit.station, null);
  assert.equal(unit.handlingUnit, '臺北市政府警察局');
  // Degrading to the department is language-aware too: an English run of an
  // old session falls back to the English department name, never the Chinese
  // one.
  const expectedDepartment = {
    zh: /臺北市政府警察局/,
    en: /Taipei City Police Department/,
    jp: /台北市政府警察局/,
  };
  for (const lang of ['zh', 'en', 'jp']) {
    assert.match(unitRow(legacy, lang), expectedDepartment[lang], lang);
    assert.equal(getPoliceUnitDisplay(legacy, lang).department,
      { zh: '臺北市政府警察局', en: 'Taipei City Police Department', jp: '台北市政府警察局' }[lang]);
  }
  // A session object with nothing at all must still not throw.
  assert.deepEqual(getPoliceUnitDisplay(null), {
    department: null, division: null, station: null, handlingUnit: null,
  });
});

test('no Scenario 03 screen resolves or re-draws a police unit itself', () => {
  const roots = ['../src/pages/scenario03', '../src/pages/scenario03/components'];
  const forbidden = [
    'PoliceOrganizationResolver',
    'resolvePoliceAssignment',
    'pickStationForRun',
    'pickStationOnce',
    'resolveDivision',
  ];
  let checked = 0;
  for (const root of roots) {
    const dir = path.resolve(import.meta.dirname, root);
    for (const file of readdirSync(dir)) {
      if (!/\.(jsx?|mjs)$/.test(file)) continue;
      const source = readFileSync(path.join(dir, file), 'utf8');
      checked += 1;
      for (const token of forbidden) {
        assert.ok(!source.includes(token), `${file} must read the session snapshot, not call ${token}`);
      }
    }
  }
  assert.ok(checked > 10);
  // The fake-document builder is data, not a screen - it must be snapshot-only too.
  const config = readFileSync(path.resolve(import.meta.dirname, '../src/data/scenario03Config.js'), 'utf8');
  for (const token of ['PoliceOrganizationResolver', 'pickStation', 'resolveDivision']) {
    assert.ok(!config.includes(token), `scenario03Config must not call ${token}`);
  }
});
