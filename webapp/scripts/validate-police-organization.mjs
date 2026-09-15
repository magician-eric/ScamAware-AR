// Structural validation of the centralized police-organization dataset, run
// from `npm run prebuild` so a bad data edit fails the build instead of
// reaching a scenario. Checks the invariants the product rule depends on:
// every district resolves to a real division, every division that a scenario
// can land on can supply a station, and no station is borrowed across
// division boundaries.
import { POLICE_ORGANIZATION, SPLIT_JURISDICTIONS } from '../src/data/location/policeOrganization.js';
import { LOCATION_DATASET } from '../src/data/location/locationDataset.js';
import {
  getSelectableStations,
  listDivisions,
  resolveDivision,
  resolvePoliceAssignment,
} from '../src/lib/location/PoliceOrganizationResolver.js';

const errors = [];
const VALID_TYPES = new Set(['police_station', 'substation', 'post']);

const counties = POLICE_ORGANIZATION.map((entry) => entry.county);
if (new Set(counties).size !== counties.length) errors.push('duplicate county entry');
const datasetCounties = new Set(LOCATION_DATASET.map((row) => row.county));
for (const county of datasetCounties) {
  if (!counties.includes(county)) errors.push(`${county} has no police organization entry`);
}

const ids = new Set();
for (const entry of POLICE_ORGANIZATION) {
  for (const division of entry.divisions) {
    if (ids.has(division.id)) errors.push(`duplicate division id ${division.id}`);
    ids.add(division.id);
    if (!division.name) errors.push(`${division.id} has no name`);
    if (!division.districts?.length) errors.push(`${division.id} has no jurisdiction`);
    for (const district of division.districts) {
      const known = LOCATION_DATASET.some((row) => row.county === entry.county && row.district === district);
      if (!known) errors.push(`${division.id} claims unknown district ${district}`);
    }
    for (const station of division.stations) {
      if (!VALID_TYPES.has(station.type)) errors.push(`${division.id}/${station.name} has type ${station.type}`);
    }
  }
}

// Every district split between two divisions MUST have an explicit rule -
// otherwise resolution would silently degrade to dataset array order, which
// the product rule forbids.
const splits = [];
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
    splits.push(key);
    const split = SPLIT_JURISDICTIONS[key];
    if (!split) {
      errors.push(`${key} is split between ${ids.join(' / ')} but has no jurisdiction rule`);
      continue;
    }
    const known = new Set(entry.divisions.map((division) => division.id));
    for (const id of [...split.candidates, split.ambiguousDefaultDivisionId]) {
      if (!known.has(id)) errors.push(`${key} references unknown division ${id}`);
    }
    if (split.candidates.length !== ids.length || ids.some((id) => !split.candidates.includes(id))) {
      errors.push(`${key} candidates do not match the dataset (${ids.join(' / ')})`);
    }
    if (!['village-list', 'boundary-unavailable', 'polygon'].includes(split.rule.type)) {
      errors.push(`${key} has unknown rule type ${split.rule.type}`);
    }
    if (split.rule.type === 'village-list') {
      for (const id of [...Object.keys(split.rule.villages), split.rule.remainderDivisionId]) {
        if (!known.has(id)) errors.push(`${key} village rule references unknown division ${id}`);
      }
    }
    for (const id of split.candidates) {
      if (!split.jurisdictionText?.[id]) errors.push(`${key} has no official jurisdiction text for ${id}`);
    }
  }
}
for (const key of Object.keys(SPLIT_JURISDICTIONS)) {
  if (!splits.includes(key)) errors.push(`${key} has a jurisdiction rule but is not split in the dataset`);
}

for (const row of LOCATION_DATASET) {
  const resolved = resolveDivision(row.county, row.district);
  const isSplit = splits.includes(`${row.county}/${row.district}`);
  if (!resolved || (resolved.isFallback && !isSplit)) {
    errors.push(`${row.county}${row.district} does not resolve to its own division`);
    continue;
  }
  const assignment = resolvePoliceAssignment(row.county, row.district, () => 0);
  const owner = listDivisions(assignment.county).find((item) => item.id === assignment.divisionId);
  if (!owner) {
    errors.push(`${row.county}${row.district} resolved to unknown division ${assignment.divisionId}`);
  } else if (!owner.stations.some((station) => station.name === assignment.stationName)) {
    errors.push(`${row.county}${row.district} drew ${assignment.stationName}, not a unit of ${owner.name}`);
  }
}

const emptyPools = POLICE_ORGANIZATION.flatMap((entry) => entry.divisions)
  .filter((division) => getSelectableStations(division).length === 0)
  .map((division) => division.id);

if (errors.length) {
  console.error('police-organization dataset validation failed:');
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

const stationCount = POLICE_ORGANIZATION
  .flatMap((entry) => entry.divisions)
  .reduce((total, division) => total + division.stations.length, 0);
console.log(`police-organization OK: ${POLICE_ORGANIZATION.length} counties, ${ids.size} divisions, ${stationCount} stations`);
console.log(`  split districts with an explicit jurisdiction rule: ${splits.length}`);
if (emptyPools.length) {
  // Not an error: 連江縣's 北竿/東引警察所 genuinely have no subordinate
  // 派出所. They are documented fallback sources, not data gaps.
  console.log(`  units with no selectable station (documented fallback): ${emptyPools.join(', ')}`);
}
