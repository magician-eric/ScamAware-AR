import { LOCATION_DATASET } from '../../data/location/locationDataset.js';
import {
  getSelectableStations,
  listDivisions,
  resolveDivision,
} from './PoliceOrganizationResolver.js';

// Administrative and agency resolution is deliberately driven by one static
// production dataset. The legacy centroid file is loaded only for the clearly
// labelled, best-effort GPS suggestion; it is not an agency data source.
const DATA_BASE = `${import.meta.env?.BASE_URL ?? '/'}data/`;
let cache = null;

export async function loadRegionData() {
  if (cache) return cache;
  let gpsRegions = null;
  try {
    const response = await fetch(`${DATA_BASE}taiwan-regions.json`);
    if (response.ok) gpsRegions = await response.json();
  } catch {
    // Manual selection remains fully functional offline.
  }
  cache = { locations: LOCATION_DATASET, regions: gpsRegions };
  return cache;
}

const rows = (regionData) => regionData?.locations ?? LOCATION_DATASET;

export function listCounties(regionData) {
  return [...new Set(rows(regionData).map((entry) => entry.county))];
}

export function listDistricts(regionData, county) {
  return rows(regionData).filter((entry) => entry.county === county).map((entry) => entry.district);
}

export function findLocation(county, district, regionData) {
  return rows(regionData).find((entry) => entry.county === county && entry.district === district) ?? null;
}

// `detail` carries any finer-grained location the caller holds ({ village,
// coordinates }); it only matters for the handful of districts split between
// two divisions.
export function resolveLocation(county, district, regionData, detail = {}) {
  const entry = findLocation(county, district, regionData);
  if (!entry) return null;
  // Division and stations come from the centralized police-organization
  // dataset, never from this file's legacy per-district precinct seed -
  // there is exactly one source of truth for 分局/派出所 names.
  const resolved = resolveDivision(county, district, detail);
  const division = resolved?.division ?? null;
  return {
    policeDepartment: entry.policeDepartment,
    policePrecinct: division?.name ?? null,
    policeDivisionId: division?.id ?? null,
    // Consumers may choose once from this pool; the resolver never randomizes.
    stationPool: getSelectableStations(division).map((station) => station.name),
    precincts: listDivisions(county)
      .filter((item) => item.districts.includes(district))
      .map((item) => item.name),
    precinctResolution: {
      quality: resolved && !resolved.isFallback ? 'exact' : 'fallback',
      basis: resolved?.basis ?? null,
      isAmbiguous: Boolean(resolved?.isAmbiguous),
      isFallback: Boolean(resolved?.isFallback),
      fallbackReason: resolved?.fallbackReason ?? null,
    },
    prosecutorsOffice: entry.prosecutorsOffice,
    districtCourt: entry.districtCourt,
    telephoneAreaCode: entry.telephoneAreaCode,
  };
}

// Kept for callers that already hold a plain name pool (the scenario layer
// draws through pickStationForRun instead, which owns the type filtering).
export function pickStationOnce(stationPool, random = Math.random) {
  if (!stationPool?.length) return null;
  return stationPool[Math.floor(random() * stationPool.length)];
}

// Backward-compatible API. District is now required for an authoritative
// result; callers omitting it receive only the explicitly county-wide field.
export function resolveAgenciesForCounty(regionData, county, district = null) {
  const resolved = district ? resolveLocation(county, district, regionData) : null;
  return resolved ? {
    policeDepartment: resolved.policeDepartment,
    policePrecinct: resolved.policePrecinct,
    policeStation: null,
    prosecutorsOffice: resolved.prosecutorsOffice,
    districtCourt: resolved.districtCourt,
  } : {
    policeDepartment: rows(regionData).find((entry) => entry.county === county)?.policeDepartment ?? null,
    policePrecinct: null,
    policeStation: null,
    prosecutorsOffice: null,
    districtCourt: null,
  };
}

export function getTelephoneAreaCode(regionData, county, district = null) {
  if (district) return findLocation(county, district, regionData)?.telephoneAreaCode ?? null;
  return rows(regionData).find((entry) => entry.county === county)?.telephoneAreaCode ?? null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// This remains a non-authoritative suggestion until boundary polygons exist.
export function resolveCoordinateToRegion(regionData, latitude, longitude) {
  const counties = regionData?.regions?.counties ?? [];
  let best = null;
  let distanceKm = Infinity;
  for (const county of counties) {
    const distance = haversineKm(latitude, longitude, county.lat, county.lng);
    if (distance < distanceKm) { best = county; distanceKm = distance; }
  }
  if (!best) return null;
  return { county: best.county, district: null, distanceKm, authoritative: false };
}
