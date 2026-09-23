import { POLICE_ORGANIZATION, SPLIT_JURISDICTIONS } from '../../data/location/policeOrganization.js';

// Division/station resolution for the centralized location layer.
//
// The product rule, in one line: the division is decided by where the device
// says it is (deterministic); only the station is drawn at random, and only
// from inside the resolved division. A scenario must never roll a division,
// and must never draw a station from a county-wide pool.
//
//   county + district -> division (deterministic)
//                     -> that division's own stations -> random 1

// Only these unit types are eligible to be drawn as "the station handling
// this case". 駐在所 are staffed but are not report-taking front desks, so
// they stay in the dataset (for completeness) and out of the draw pool.
const SELECTABLE_TYPES = new Set(['police_station', 'substation']);

// Mirrors DEFAULT_LOCATION_PROFILE's county in LocationProfileStore.
export const DEFAULT_ORGANIZATION_COUNTY = '臺北市';

const byCounty = new Map(POLICE_ORGANIZATION.map((entry) => [entry.county, entry.divisions]));

export function listDivisions(county) {
  return byCounty.get(county) ?? [];
}

export function findDivisionById(divisionId) {
  for (const entry of POLICE_ORGANIZATION) {
    const division = entry.divisions.find((item) => item.id === divisionId);
    if (division) return { county: entry.county, division };
  }
  return null;
}

export function getSelectableStations(division) {
  return (division?.stations ?? []).filter((station) => SELECTABLE_TYPES.has(station.type));
}

// Resolution order for the division, most precise first. A division is
// NEVER drawn at random and never decided by dataset array order.
//
//   1. boundary polygons for a split district - not shipped yet; the hook is
//      here (rule.type === 'polygon') so a future jurisdiction dataset drops
//      in without touching callers. CIBAR's only coordinate resolver today
//      (resolveCoordinateToRegion) is a county-centroid nearest match and
//      cannot separate two jurisdictions inside one district, so passing
//      coordinates alone changes nothing yet - see spec section 7.4.
//   2. the village (里) the location profile carries, against the official
//      enumerated jurisdiction of a split district.
//   3. the district alone, when it belongs to exactly one division.
//   4. otherwise: ambiguous jurisdiction - an explicit, documented default,
//      flagged as ambiguous with a reason, never presented as located.
//
// `detail` is whatever finer-grained location data the profile happens to
// hold: { village, coordinates }. Both are optional.
export function resolveDivision(county, district, detail = {}) {
  const divisions = listDivisions(county);
  const candidates = divisions.filter((division) => division.districts.includes(district));

  if (candidates.length === 1) {
    return {
      county,
      division: candidates[0],
      basis: 'district',
      isAmbiguous: false,
      isFallback: false,
      fallbackReason: null,
    };
  }

  if (candidates.length > 1) {
    const split = SPLIT_JURISDICTIONS[`${county}/${district}`];
    if (split) {
      const byId = (id) => divisions.find((division) => division.id === id) ?? null;

      if (split.rule.type === 'polygon' && detail.coordinates) {
        const hit = split.rule.contains?.(detail.coordinates);
        const division = hit ? byId(hit) : null;
        if (division) {
          return { county, division, basis: 'coordinates', isAmbiguous: false, isFallback: false, fallbackReason: null };
        }
      }

      if (split.rule.type === 'village-list' && detail.village) {
        for (const [divisionId, villages] of Object.entries(split.rule.villages)) {
          if (villages.includes(detail.village)) {
            const division = byId(divisionId);
            if (division) {
              return { county, division, basis: 'village', isAmbiguous: false, isFallback: false, fallbackReason: null };
            }
          }
        }
        // The official jurisdiction defines the other division as the rest of
        // the district ("中興新村除外"), so this branch is authoritative too.
        const remainder = byId(split.rule.remainderDivisionId);
        if (remainder) {
          return { county, division: remainder, basis: 'village', isAmbiguous: false, isFallback: false, fallbackReason: null };
        }
      }

      // Not enough location precision to apply the official rule. Deterministic
      // and auditable, but explicitly NOT "resolved from location".
      const fallbackDivision = byId(split.ambiguousDefaultDivisionId);
      if (fallbackDivision) {
        return {
          county,
          division: fallbackDivision,
          basis: 'ambiguous-default',
          isAmbiguous: true,
          isFallback: true,
          fallbackReason: split.rule.type === 'village-list'
            ? 'ambiguous-jurisdiction-no-village'
            : 'ambiguous-jurisdiction-no-boundary-data',
        };
      }
    }
    // A split district with no registered rule is a data bug, not something
    // to paper over with array order - validate:police-organization fails the
    // build on it. At runtime, treat it as ambiguous rather than crashing.
    return {
      county,
      division: candidates[0],
      basis: 'ambiguous-default',
      isAmbiguous: true,
      isFallback: true,
      fallbackReason: 'ambiguous-jurisdiction-unregistered-split',
    };
  }

  // Fallback 1 - the district is unknown to the organization dataset (a
  // district renamed upstream, or a profile written by an older build).
  // Stay inside the same county and use its first division that can actually
  // supply a station, so the result is still a real division of the real
  // department for where the device is.
  const countyFallback = divisions.find((division) => getSelectableStations(division).length > 0);
  if (countyFallback) {
    return {
      county,
      division: countyFallback,
      basis: 'county-fallback',
      isAmbiguous: false,
      isFallback: true,
      fallbackReason: district ? 'district-not-in-dataset' : 'district-missing',
    };
  }
  // Fallback 2 - no usable county data at all (county missing/misspelled, or
  // every division in it is station-less, which today is only 連江縣's
  // 北竿/東引警察所). Fall back to the system-default county the location
  // profile itself defaults to, so the run still shows a real, existing unit
  // rather than an invented name or a crash.
  const defaultDivisions = listDivisions(DEFAULT_ORGANIZATION_COUNTY);
  const defaultDivision = defaultDivisions.find((division) => getSelectableStations(division).length > 0);
  if (!defaultDivision) return null;
  return {
    county: DEFAULT_ORGANIZATION_COUNTY,
    division: defaultDivision,
    basis: 'default-county-fallback',
    isAmbiguous: false,
    isFallback: true,
    fallbackReason: county ? 'county-not-in-dataset' : 'county-missing',
  };
}

// The ONLY randomization in this layer. Callers draw once per scenario run
// and persist the result - see ScenarioSessionFactory.
export function pickStationForRun(division, random = Math.random) {
  const pool = getSelectableStations(division);
  if (!pool.length) return null;
  return pool[Math.floor(random() * pool.length)];
}

// One call for the whole chain: location in, resolved division + drawn
// station out. `random` is injectable so tests can pin the draw.
export function resolvePoliceAssignment(county, district, random = Math.random, detail = {}) {
  const resolved = resolveDivision(county, district, detail);
  if (!resolved) return null;
  const station = pickStationForRun(resolved.division, random);
  // A division with no station of its own falls back within the same county
  // rather than borrowing a station from a division it does not belong to.
  if (!station) {
    const sibling = listDivisions(resolved.county).find((item) => getSelectableStations(item).length > 0);
    if (!sibling) return null;
    const siblingStation = pickStationForRun(sibling, random);
    return {
      county: resolved.county,
      divisionId: sibling.id,
      divisionName: sibling.name,
      stationName: siblingStation.name,
      stationType: siblingStation.type,
      jurisdictionBasis: 'county-fallback',
      isAmbiguous: resolved.isAmbiguous,
      isFallback: true,
      fallbackReason: 'division-has-no-station',
    };
  }
  return {
    county: resolved.county,
    divisionId: resolved.division.id,
    divisionName: resolved.division.name,
    stationName: station.name,
    stationType: station.type,
    jurisdictionBasis: resolved.basis,
    isAmbiguous: resolved.isAmbiguous,
    isFallback: resolved.isFallback,
    fallbackReason: resolved.fallbackReason,
  };
}
