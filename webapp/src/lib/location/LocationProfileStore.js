import { resolveLocation } from './RegionAgencyResolver.js';

// Persists the system-wide `locationProfile` (section 7 of the location-init
// spec) - the single source of truth every scenario reads location/agency
// data from, set up once by on-site staff before the device is ever handed
// to a player.
//
// Storage strategy: IndexedDB is the durable, offline-safe store (section 11
// - survives a PWA restart, and holds up better than localStorage under
// storage-pressure eviction on Android). A trimmed mirror also goes into
// localStorage purely so synchronous callers (the profile is needed
// immediately on every route render, before any await could resolve) always
// have a same-tick answer - see `readCachedSync`. IndexedDB stays the
// authority; the localStorage mirror is rewritten every time IndexedDB is,
// and is never read as a fallback of last resort for anything but this
// synchronous case.
const DB_NAME = 'cibar-location';
const DB_VERSION = 2;
const STORE_NAME = 'profile';
const RECORD_KEY = 'current';
const LOCALSTORAGE_KEY = 'cibar-location-profile';

// Fallback used whenever staff never ran (or forgot to run) the setup flow
// on this device - product decision: a scenario that reads location data
// should never block a player on a missing admin step, so a plausible
// default (臺北市/信義區) stands in until staff actually lock a real one.
// `locked: true` so this satisfies isLocationProfileLocked() same as a
// real staff-confirmed profile; `source: 'system-default'` distinguishes
// it from an actual GPS/manual/test-mode profile if that's ever useful.
export const DEFAULT_LOCATION_PROFILE = {
  version: 2,
  locked: true,
  source: 'system-default',
  coordinates: null,
  region: { county: '臺北市', district: '信義區' },
  agencies: {
    policeDepartment: '臺北市政府警察局',
    policePrecinct: '信義分局',
    policeDivisionId: '臺北市-信義分局',
    prosecutorsOffice: '臺灣臺北地方檢察署',
    districtCourt: '臺灣臺北地方法院',
  },
  telephoneAreaCode: '02',
  updatedAt: null,
};

// The profile deliberately carries NO station: the station is a per-run
// scenario draw (see ScenarioSessionFactory), not a device-level setting.
// Only the deterministic layers - department, division, justice agencies,
// area code - are locked here.
export function migrateLocationProfile(profile) {
  if (!profile) return null;
  const county = profile.region?.county;
  const district = profile.region?.district;
  const resolved = resolveLocation(county, district, null, {
    village: profile.region?.village ?? null,
    coordinates: profile.coordinates ?? null,
  });
  if (!resolved) return { ...profile, version: 2 };
  return {
    ...profile,
    version: 2,
    agencies: {
      policeDepartment: resolved.policeDepartment,
      policePrecinct: resolved.policePrecinct,
      policeDivisionId: resolved.policeDivisionId,
      // True where the district is split between two divisions and the
      // profile has no village/boundary data to tell them apart - staff see
      // this as an explicit caveat rather than a confident answer.
      policeDivisionIsAmbiguous: resolved.precinctResolution.isAmbiguous,
      prosecutorsOffice: resolved.prosecutorsOffice,
      districtCourt: resolved.districtCourt,
    },
    telephoneAreaCode: resolved.telephoneAreaCode,
  };
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('indexeddb-unsupported'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(profile) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(profile, RECORD_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB unavailable (private mode, quota, unsupported browser) -
    // the localStorage mirror below is still written, so the profile
    // survives this session at least.
  }
}

async function idbClear() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(RECORD_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // nothing to clear
  }
}

// Only the fields every scenario actually reads synchronously need to be in
// the localStorage mirror - keeps it small and avoids ever treating
// localStorage as anything more than a fast-path cache of IndexedDB.
function writeLocalStorageMirror(profile) {
  try {
    if (!profile) {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      return;
    }
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage unavailable - IndexedDB (or in-memory fallback below)
    // still has it for this session.
  }
}

// In-memory fallback so the app never throws if BOTH storages are
// unavailable (e.g. a fully locked-down WebView) - profile just won't
// survive a reload in that specific case, which is an acceptable last
// resort rather than a hard crash on every read.
let memoryProfile = null;

export async function saveLocationProfile(profile) {
  const migrated = migrateLocationProfile(profile);
  memoryProfile = migrated;
  writeLocalStorageMirror(migrated);
  await idbSet(migrated);
  return migrated;
}

// `staffOnly: true` opts a caller (the staff-setup screen itself) out of
// the default-profile fallback below, so staff still sees an honest "尚未
// 設定" state and isn't misled into thinking the device was already set up.
export async function loadLocationProfile({ staffOnly = false } = {}) {
  const fromDb = await idbGet();
  if (fromDb) {
    const migrated = migrateLocationProfile(fromDb);
    memoryProfile = migrated;
    writeLocalStorageMirror(migrated);
    if (fromDb.version !== 2) await idbSet(migrated);
    return migrated;
  }
  return readCachedSync({ staffOnly });
}

// Synchronous best-effort read (localStorage mirror, or the in-memory copy
// from earlier this session) - for call sites that render before any await
// could resolve (e.g. the very first route guard check). Callers that can
// afford to await should prefer loadLocationProfile() for the IndexedDB-
// authoritative answer.
export function readCachedSync({ staffOnly = false } = {}) {
  if (memoryProfile) return memoryProfile;
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (raw) {
      memoryProfile = migrateLocationProfile(JSON.parse(raw));
      writeLocalStorageMirror(memoryProfile);
      return memoryProfile;
    }
  } catch {
    // ignore
  }
  return staffOnly ? null : DEFAULT_LOCATION_PROFILE;
}

export function isLocationProfileLocked() {
  const profile = readCachedSync();
  return Boolean(profile && profile.locked);
}

export async function clearLocationProfile() {
  memoryProfile = null;
  writeLocalStorageMirror(null);
  await idbClear();
}
