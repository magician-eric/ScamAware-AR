import test from 'node:test';
import assert from 'node:assert/strict';
import { POLICE_ORGANIZATION, SPLIT_JURISDICTIONS } from '../../data/location/policeOrganization.js';
import { LOCATION_DATASET } from '../../data/location/locationDataset.js';
import {
  getSelectableStations,
  listDivisions,
  pickStationForRun,
  resolveDivision,
  resolvePoliceAssignment,
} from './PoliceOrganizationResolver.js';

const allDivisions = POLICE_ORGANIZATION.flatMap((entry) =>
  entry.divisions.map((division) => ({ county: entry.county, division })));

// A - every station belongs to exactly one division, and every division is
// owned by exactly one county. There is no such thing as a parentless station.
test('every station has exactly one parent division', () => {
  // Names repeat across the country (and even inside one county - 臺南 has a
  // 長安派出所 under both 第三分局 and 白河分局), so the invariant is that a
  // station is listed under exactly one division, keyed by that division.
  const owners = new Map();
  for (const { county, division } of allDivisions) {
    assert.ok(division.districts.length > 0, `${division.name} has no jurisdiction`);
    for (const station of division.stations) {
      const key = `${county}/${division.id}/${station.name}`;
      assert.ok(!owners.has(key), `${key} is listed twice under ${division.name}`);
      owners.set(key, division.id);
      assert.ok(['police_station', 'substation', 'post'].includes(station.type), station.name);
    }
  }
  assert.equal(new Set(allDivisions.map((item) => item.division.id)).size, allDivisions.length);
});

// B - a division's draw pool may only contain its own units.
test('a station pool never crosses division boundaries', () => {
  for (const { division } of allDivisions) {
    const own = new Set(division.stations.map((station) => station.name));
    for (const station of getSelectableStations(division)) {
      assert.ok(own.has(station.name), `${station.name} is not a unit of ${division.name}`);
    }
  }
});

// C - every district the location layer knows about resolves to a division
// that actually exists in the dataset.
test('every district maps to an existing division', () => {
  for (const row of LOCATION_DATASET) {
    const resolved = resolveDivision(row.county, row.district);
    assert.ok(resolved, `${row.county}${row.district} resolved nothing`);
    const isSplit = Boolean(SPLIT_JURISDICTIONS[`${row.county}/${row.district}`]);
    // Only the explicitly registered split districts may report anything
    // other than a clean district-level resolution.
    assert.equal(resolved.basis === 'district', !isSplit, `${row.county}${row.district}`);
    assert.equal(resolved.isAmbiguous, isSplit, `${row.county}${row.district}`);
    assert.ok(listDivisions(resolved.county).includes(resolved.division));
  }
  assert.equal(POLICE_ORGANIZATION.length, 22);
});

// Split jurisdictions: array order must never decide the division, and the
// resolver must not claim precision it does not have.
const SPLIT_CASES = [
  ['臺北市', '中正區', ['中正第一分局', '中正第二分局']],
  ['臺北市', '文山區', ['文山第一分局', '文山第二分局']],
  ['新北市', '板橋區', ['板橋分局', '海山分局']],
  ['高雄市', '三民區', ['三民第一分局', '三民第二分局']],
  ['南投縣', '南投市', ['南投分局', '中興分局']],
];

test('every split district is registered with an explicit rule', () => {
  const found = [];
  for (const entry of POLICE_ORGANIZATION) {
    const owners = new Map();
    for (const division of entry.divisions) {
      for (const district of division.districts) {
        owners.set(district, [...(owners.get(district) ?? []), division.id]);
      }
    }
    for (const [district, ids] of owners) {
      if (ids.length < 2) continue;
      const key = `${entry.county}/${district}`;
      found.push(key);
      const split = SPLIT_JURISDICTIONS[key];
      assert.ok(split, `${key} has no jurisdiction rule`);
      assert.deepEqual([...split.candidates].sort(), [...ids].sort());
      for (const id of ids) assert.ok(split.jurisdictionText[id], `${key} ${id} has no official jurisdiction text`);
    }
  }
  assert.deepEqual(found.sort(), Object.keys(SPLIT_JURISDICTIONS).sort());
  assert.deepEqual(found.sort(), SPLIT_CASES.map(([county, district]) => `${county}/${district}`).sort());
});

test('a split district without finer location data is reported as ambiguous, never guessed', () => {
  for (const [county, district, names] of SPLIT_CASES) {
    const assignment = resolvePoliceAssignment(county, district, () => 0.5);
    assert.equal(assignment.isAmbiguous, true, `${county}${district} should be ambiguous`);
    assert.equal(assignment.jurisdictionBasis, 'ambiguous-default');
    assert.match(assignment.fallbackReason, /^ambiguous-jurisdiction-/);
    assert.ok(names.includes(assignment.divisionName));
    // Ambiguity never leaks into the station: it still comes from whichever
    // division was actually resolved.
    const owner = listDivisions(county).find((item) => item.id === assignment.divisionId);
    assert.ok(owner.stations.some((station) => station.name === assignment.stationName));
  }
});

test('an ambiguous split district resolves identically every time - never randomly', () => {
  for (const [county, district] of SPLIT_CASES) {
    const first = resolveDivision(county, district).division.id;
    for (let i = 0; i < 50; i += 1) {
      // A different random source must not move the division, only the station.
      assert.equal(resolveDivision(county, district).division.id, first);
      assert.equal(resolvePoliceAssignment(county, district, () => i / 50).divisionId, first);
    }
  }
});

test('a split district with an enumerated official jurisdiction resolves by village', () => {
  // 中興分局 covers 中興新村's eight named 里; 南投分局 covers the rest of
  // 南投市 ("中興新村除外"), so both branches come from the official wording.
  for (const village of SPLIT_JURISDICTIONS['南投縣/南投市'].rule.villages['南投縣-中興分局']) {
    const resolved = resolveDivision('南投縣', '南投市', { village });
    assert.equal(resolved.division.name, '中興分局', village);
    assert.equal(resolved.basis, 'village');
    assert.equal(resolved.isAmbiguous, false);
  }
  for (const village of ['三和里', '軍功里', '漳興里']) {
    const resolved = resolveDivision('南投縣', '南投市', { village });
    assert.equal(resolved.division.name, '南投分局', village);
    assert.equal(resolved.basis, 'village');
    assert.equal(resolved.isAmbiguous, false);
  }
  // Same exact location, same answer, every time.
  for (let i = 0; i < 20; i += 1) {
    assert.equal(resolveDivision('南投縣', '南投市', { village: '光明里' }).division.name, '中興分局');
  }
  // And the station still comes from the village-resolved division only.
  const assignment = resolvePoliceAssignment('南投縣', '南投市', () => 0.9, { village: '光明里' });
  assert.equal(assignment.divisionName, '中興分局');
  const owner = listDivisions('南投縣').find((item) => item.id === assignment.divisionId);
  assert.ok(owner.stations.some((station) => station.name === assignment.stationName));
});

test('coordinates alone do not fake precision inside a split district', () => {
  // CIBAR's coordinate layer is a county-centroid nearest match, so passing
  // coordinates must not flip a district into a confidently-resolved state.
  const resolved = resolveDivision('新北市', '板橋區', { coordinates: { latitude: 25.0114, longitude: 121.4618 } });
  assert.equal(resolved.isAmbiguous, true);
  assert.equal(resolved.basis, 'ambiguous-default');
});

// D - anything a scenario can land on must be able to supply a station.
test('every district usable by a scenario yields a real station', () => {
  for (const row of LOCATION_DATASET) {
    const assignment = resolvePoliceAssignment(row.county, row.district, () => 0);
    assert.ok(assignment?.stationName, `${row.county}${row.district} has no station`);
    const owner = listDivisions(assignment.county).find((item) => item.id === assignment.divisionId);
    assert.ok(owner.stations.some((station) => station.name === assignment.stationName));
  }
});

// E - the division is location-derived, never drawn.
test('division resolution is deterministic for the same location', () => {
  for (const location of [['臺北市', '中正區'], ['新北市', '板橋區'], ['高雄市', '三民區'], ['南投縣', '南投市']]) {
    const first = resolveDivision(...location).division.id;
    for (let i = 0; i < 20; i += 1) {
      assert.equal(resolveDivision(...location).division.id, first);
    }
  }
});

// F - the station, and only the station, varies between runs.
test('separate runs can draw different stations from the same division', () => {
  const drawn = new Set();
  const division = resolveDivision('臺北市', '信義區').division;
  for (let i = 0; i < division.stations.length; i += 1) {
    drawn.add(pickStationForRun(division, () => i / division.stations.length).name);
  }
  assert.ok(drawn.size > 1);
  assert.equal(new Set(POLICE_ORGANIZATION.flatMap((entry) => entry.divisions)
    .filter((item) => item.districts.includes('信義區') && item.id.startsWith('臺北市')).map((item) => item.id)).size, 1);
});

// G - fallbacks stay legal: a real division, and a station that really is
// one of that division's own units.
test('fallbacks resolve to a real division and one of its own stations', () => {
  for (const location of [['連江縣', '北竿鄉'], ['臺北市', '不存在區'], ['不存在市', null]]) {
    const assignment = resolvePoliceAssignment(...location, () => 0.5);
    assert.ok(assignment.isFallback);
    assert.ok(assignment.fallbackReason);
    const owner = listDivisions(assignment.county).find((item) => item.id === assignment.divisionId);
    assert.ok(owner, `${assignment.divisionId} is not a real division`);
    assert.ok(owner.stations.some((station) => station.name === assignment.stationName));
  }
});
