// Builds the per-run `scenarioSession` object (section 10 of the location-
// init spec) that location-aware scenarios (currently just 假檢警,
// scenario03-police) read from - never from GPS or the location profile
// directly. Everything in here is either read verbatim from the locked
// locationProfile, generated once per session, or explicitly fictional
// (case numbers, fake identities) - never a real judicial case-number
// format, never a real name/phone/account.
import { readCachedSync as readLocationProfile } from '../location/LocationProfileStore';
import { resolvePoliceAssignment } from '../location/PoliceOrganizationResolver';
import {
  addMinutes,
  formatCompactDate,
  formatROCDate,
  formatTaiwanDate,
  formatTaiwanTime,
  generateSessionTimestamp,
} from '../dateTimeService';
import { resolveCast } from '../../experience/characters/casting';
import { getVisualAssetUrl } from '../../experience/characters/visuals';
import { localizeLocationName } from '../location/localizedLocationName';

const SESSION_STORAGE_KEY = 'cibar-scenario03-session';

// The scam's signature artificial deadline: every countdown in the run
// (LINE, case site, bank) measures against this one timestamp.
const DEADLINE_MINUTES = 30;

function randomDigits(n) {
  let out = '';
  for (let i = 0; i < n; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

// Three-letter county/city code used as the first segment of the fake case
// number (see fakeCaseNumber below) - fixed spec, exact codes, do not edit
// any entry. Unlisted counties fall back to a generic "SIM". Exported so
// scripts/scenario03-case-number.test.mjs can verify all 22 counties
// directly instead of re-deriving a second copy of this table to compare
// against.
export const COUNTY_CODES = {
  臺北市: 'TPE', 新北市: 'NWT', 桃園市: 'TAO', 臺中市: 'TXG', 臺南市: 'TNN', 高雄市: 'KHH',
  基隆市: 'KEE', 新竹市: 'HSZ', 新竹縣: 'HSQ', 苗栗縣: 'MIA', 彰化縣: 'CHA', 南投縣: 'NAN',
  雲林縣: 'YUN', 嘉義市: 'CYI', 嘉義縣: 'CYQ', 屏東縣: 'PIF', 宜蘭縣: 'ILA', 花蓮縣: 'HUA',
  臺東縣: 'TTT', 澎湖縣: 'PEN', 金門縣: 'KIN', 連江縣: 'LIE',
};

// Used only when locationProfile/county is unavailable (staff setup never
// run, a deep link straight into a scene, or corrupted data) - a plain
// simulation fallback so the number still reads as a landline instead of
// silently reverting to a 09xx mobile number. This does NOT imply the
// player is in Taipei; it's just a plausible-looking placeholder area code.
export const FALLBACK_AREA_CODE = '02';

// Digit-group layout of the *subscriber number* (i.e. everything after the
// area code) for each area code above, matching how Taiwan landline numbers
// are conventionally written - e.g. 02 numbers as XXXX-XXXX, 037 numbers as
// XXX-XXX. Keyed by area code (not county) since several counties share one.
const SUBSCRIBER_GROUPS = {
  '02': [4, 4],
  '03': [3, 4],
  '037': [3, 3],
  '04': [4, 4],
  '049': [3, 3],
  '05': [3, 4],
  '06': [3, 4],
  '07': [3, 4],
  '08': [3, 4],
  '082': [3, 3],
  '0826': [2, 3],
  '089': [3, 3],
  '0836': [2, 3],
};

// The officer's and the prosecutor's identities are placeholder-only draws -
// none of this is meant to resemble a real person or a real case, matching
// spec section 8's requirement that officer/prosecutor names, case numbers,
// phone numbers, LINE IDs and bank accounts inside the scenario all stay
// fictional even though the region/agency data around them is real. The pools
// themselves live in experience/characters/names.js
// (MALE_FORMAL_NAME_PARTS): zh/en are a Wade-Giles-romanized pairing of the
// SAME surname+given-name pick, so the English name is a romanization rather
// than an independent identity, while jp is drawn from its own unrelated pool
// of Japanese names. All of them are male-only by design.
//
// ONE draw for the run's two impersonated officials. Resolving them together
// is not a tidiness choice: resolveCast tracks the visuals it has already
// handed out within a single call, so casting both here is what guarantees
// the fake prosecutor never wears the fake officer's face. Two separate
// resolveCast calls would each start with an empty used-visual set and could
// return the same man twice.
//
// `keepPoliceVisual` pins the officer to a face a run already owns instead of
// drawing him a new one - the backfill path below needs the pair's uniqueness
// guarantee without re-casting an officer the player has already been looking
// at. Pinning him still puts his visual in the used set, so the prosecutor
// draws around him exactly as he would in a fresh run.
function resolveScenario03Cast(keepPoliceVisual = null) {
  return resolveCast('scenario03', [
    keepPoliceVisual
      ? { roleId: 'scenario03.fakePolice', slotId: 'fakePolice', visualId: keepPoliceVisual, visualStrategy: 'fixed' }
      : { roleId: 'scenario03.fakePolice', slotId: 'fakePolice' },
    { roleId: 'scenario03.fakeProsecutor', slotId: 'fakeProsecutor' },
  ]).roles;
}

// Fake case number format (spec section 10): 縣市碼三碼 + CIB + YYYYMMDD +
// 165 (the real Anti-Fraud Hotline, same easter egg as fakePhoneNumber) +
// a random tail, e.g. "HSZCIB20260819165XXXX". This is the ONLY place that
// builds a case number - every screen reads session.caseNumber instead of
// re-deriving one.
export function fakeCaseNumber(county) {
  const code = COUNTY_CODES[county] ?? 'SIM';
  return `${code}CIB${formatCompactDate()}165${randomDigits(4)}`;
}

// Builds one digit-group of the given length with "165" forced in at a
// random valid offset (never split across a group - see fakePhoneNumber),
// e.g. groupWith165(4) -> "165X" or "X165"; groupWith165(3) -> "165".
// `len` is always >= 3 here: every SUBSCRIBER_GROUPS entry has at least one
// group of length >= 3, and fakePhoneNumber only ever calls this on one of
// those.
function groupWith165(len) {
  const offset = Math.floor(Math.random() * (len - 2));
  return `${randomDigits(offset)}165${randomDigits(len - offset - 3)}`;
}

// Fictional landline number for the fake police caller ID - never a real
// police/prosecutor phone. The LocationProfile supplies the centrally
// resolved area code; the subscriber number is otherwise random except
// for one deliberate easter egg: it always contains "165" (the real
// Anti-Fraud Hotline) as three *consecutive* digits within a single
// dash-separated group, e.g. "02-2165-3841" or "02-1657-2049" - never split
// across a dash like "16-5...". Which group hosts it, and where within that
// group, is re-randomized on every call.
export function fakePhoneNumber(areaCode) {
  areaCode = SUBSCRIBER_GROUPS[areaCode] ? areaCode : FALLBACK_AREA_CODE;
  const groups = SUBSCRIBER_GROUPS[areaCode] ?? SUBSCRIBER_GROUPS[FALLBACK_AREA_CODE];
  const eligible = groups.reduce((acc, len, i) => (len >= 3 ? [...acc, i] : acc), []);
  const targetIndex = eligible[Math.floor(Math.random() * eligible.length)];
  const parts = groups.map((len, i) => (i === targetIndex ? groupWith165(len) : randomDigits(len)));
  return `${areaCode}-${parts.join('-')}`;
}

function fakeBankAccount() {
  return `${randomDigits(3)}-${randomDigits(2)}-${randomDigits(6)}`;
}

function documentSerial(county, index) {
  const code = COUNTY_CODES[county] ?? 'SIM';
  return `${code}-DOC-${formatCompactDate()}-${String(index).padStart(2, '0')}${randomDigits(2)}`;
}

// The scam's LINE contact always presents as "unit + rank + name" so the
// display name alone does the impersonating work - derived from the locked
// locationProfile's real agency name plus a fictional officer.
function lineAccountName(policeDepartment, officerName) {
  return `${policeDepartment ?? '刑事警察'}偵查佐 ${officerName}`;
}

// Builds a brand-new session (fresh case number, fresh fake identities).
// Call this exactly once per "情境重新開始" - never re-derive a case number
// mid-run, per spec section 10 ("同一個 scenarioSession 中，所有畫面必須
//使用同一案件編號及資料").
//
// Deliberately carries no player name/gender: the system never knows who's
// holding the phone before the scenario starts, so it never invents one -
// every screen that used to read session.playerName/playerNameMask now
// shows a neutral placeholder instead (資料遮蔽 / 案件關係人 / etc.).
export function createScenarioSession() {
  const locationProfile = readLocationProfile();
  const county = locationProfile?.region?.county ?? null;
  const policeDepartment = locationProfile?.agencies?.policeDepartment ?? null;

  // Division is decided by the locked location (deterministic); the station
  // is drawn ONCE here, from that division's own units only, and then lives
  // in the session snapshot below. No screen may re-draw it: every LINE
  // card, 公文, case site and call screen reads session.policeStation.
  // Any finer-grained location the profile happens to hold is passed through
  // so a split district (板橋區, 中正區, ...) can be resolved properly instead
  // of falling back to an ambiguous default - see PoliceOrganizationResolver.
  const policeAssignment = resolvePoliceAssignment(
    county,
    locationProfile?.region?.district ?? null,
    Math.random,
    {
      village: locationProfile?.region?.village ?? null,
      coordinates: locationProfile?.coordinates ?? null,
    },
  );

  const startedAt = new Date();
  const deadlineAt = addMinutes(startedAt, DEADLINE_MINUTES);
  const cast = resolveScenario03Cast();
  const policeCharacter = cast.fakePolice;
  const prosecutorCharacter = cast.fakeProsecutor;
  const officer = policeCharacter.resolvedNames;
  const prosecutor = prosecutorCharacter.resolvedNames;
  const officerName = officer.zh;
  const bankAccount = fakeBankAccount();
  const acct4 = bankAccount.replace(/\D/g, '').slice(-4);
  // The fake documents' dates: all generated from today's device clock,
  // same as the case number, so nothing in the paperwork reads as an
  // inconsistent date the player would have to reconcile against "today".
  const incidentDate = startedAt;
  const filingDate = startedAt;

  const session = {
    createdAt: generateSessionTimestamp(),
    locationProfile,
    caseNumber: fakeCaseNumber(county),
    policeDepartment,
    policeDivision: policeAssignment?.divisionName ?? null,
    policeDivisionId: policeAssignment?.divisionId ?? null,
    policeStation: policeAssignment?.stationName ?? null,
    policeStationType: policeAssignment?.stationType ?? null,
    policeUnitJurisdictionBasis: policeAssignment?.jurisdictionBasis ?? null,
    policeUnitIsAmbiguous: policeAssignment?.isAmbiguous ?? false,
    policeUnitIsFallback: policeAssignment?.isFallback ?? false,
    policeUnitFallbackReason: policeAssignment?.fallbackReason ?? null,
    officerName,
    officerNameEn: officer.en,
    officerNameJp: officer.jp,
    characterAssignments: { fakePolice: policeCharacter, fakeProsecutor: prosecutorCharacter },
    prosecutorName: prosecutor.zh,
    prosecutorNameEn: prosecutor.en,
    prosecutorNameJp: prosecutor.jp,
    fakePhoneNumber: fakePhoneNumber(locationProfile?.telephoneAreaCode),
    fakeBankAccount: bankAccount,
    acct4,
    maskedBankAccount: `****-**-**${acct4}`,
    startedAt: startedAt.toISOString(),
    startedAtLabel: formatTaiwanTime(startedAt),
    deadlineAt: deadlineAt.toISOString(),
    deadlineLabel: formatTaiwanTime(deadlineAt),
    caseDate: formatTaiwanDate(startedAt),
    caseDateROC: formatROCDate(startedAt),
    incidentDate: formatTaiwanDate(incidentDate),
    // The paperwork's ROC-calendar dates, one per language, minted with the
    // run for the same reason the officer's name is: the documents must read
    // the same date in every language, and no screen may re-derive one.
    incidentDateROC: formatROCDate(incidentDate),
    incidentDateROCEn: formatROCDate(incidentDate, 'en'),
    incidentDateROCJp: formatROCDate(incidentDate, 'jp'),
    filingDateROC: formatROCDate(filingDate),
    filingDateROCEn: formatROCDate(filingDate, 'en'),
    filingDateROCJp: formatROCDate(filingDate, 'jp'),
    lineAccountName: lineAccountName(policeDepartment, officerName),
    lineAccountId: `sim-police-${randomDigits(6)}`,
    documentSerials: [1, 2, 3, 4].map((i) => documentSerial(county, i)),
  };

  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // sessionStorage unavailable - session still works for this render tree,
    // it just won't survive a hard refresh mid-scenario.
  }
  return session;
}

// Screens must call these instead of reading session.officerName /
// session.prosecutorName / session.lineAccountName directly, so the name
// shown always matches the player's current UI language rather than always
// falling back to the Chinese identity the session was minted with.
export function getOfficerDisplayName(session, lang) {
  if (lang === 'en') return session?.officerNameEn ?? session?.officerName ?? '';
  if (lang === 'jp') return session?.officerNameJp ?? session?.officerName ?? '';
  return session?.officerName ?? '';
}

export function getOfficerIdentity(session, lang, roleLabel = '') {
  const assignment = session?.characterAssignments?.fakePolice;
  return {
    characterId: assignment?.visualId ?? null,
    displayName: getOfficerDisplayName(session, lang),
    avatar: getVisualAssetUrl(assignment?.visualId),
    role: 'scenario03.fakePolice',
    roleLabel,
  };
}

export function getProsecutorDisplayName(session, lang) {
  if (lang === 'en') return session?.prosecutorNameEn ?? session?.prosecutorName ?? '';
  if (lang === 'jp') return session?.prosecutorNameJp ?? session?.prosecutorName ?? '';
  return session?.prosecutorName ?? '';
}

// The prosecutor's identity, in the same shape getOfficerIdentity returns, so
// the three surfaces that show him as a person - his ring screen, his in-call
// screen and his LINE account in the aftermath - all read ONE accessor and
// therefore cannot disagree about who he is. The visual was drawn once, when
// the run was created, and lives in the session snapshot: no screen may cast
// him itself, exactly as no screen may re-draw the officer or the station.
export function getProsecutorIdentity(session, lang, roleLabel = '') {
  const assignment = session?.characterAssignments?.fakeProsecutor;
  return {
    characterId: assignment?.visualId ?? null,
    displayName: getProsecutorDisplayName(session, lang),
    avatar: getVisualAssetUrl(assignment?.visualId),
    role: 'scenario03.fakeProsecutor',
    roleLabel,
  };
}

// `suffix` is the already-translated rank/title string the caller passes in
// (e.g. t.common.policeOfficerSuffix) - this function only assembles
// unit + suffix + name in the right order/spacing for the language.
export function getLineAccountDisplayName(session, lang, suffix) {
  const fallbackDept = lang === 'en' ? 'Police' : lang === 'jp' ? '警察' : '刑事警察';
  const dept = localizeLocationName(session?.locationProfile?.agencies?.policeDepartment, lang)
    ?? fallbackDept;
  const name = getOfficerDisplayName(session, lang);
  if (lang === 'en') return `${dept} ${suffix} ${name}`.trim();
  return `${dept}${suffix} ${name}`.trim();
}

// The one accessor every Scenario 03 screen uses for police unit names.
// Screens must never resolve or re-draw a unit themselves: the division and
// station were decided once when the run was created, and this only formats
// what the snapshot already holds.
//
// `handlingUnit` is the "承辦單位" string for UI that has a single unit field:
// "海山分局 江翠派出所". Sessions minted before the police-organization
// dataset existed carry no division/station, so every field degrades to the
// department name (or null) instead of throwing.
export function getPoliceUnitDisplay(session, lang = 'zh') {
  const department = localizeLocationName(
    session?.policeDepartment ?? session?.locationProfile?.agencies?.policeDepartment ?? null,
    lang,
  );
  const division = localizeLocationName(
    session?.policeDivision ?? session?.locationProfile?.agencies?.policePrecinct ?? null,
    lang,
  );
  const station = localizeLocationName(session?.policeStation ?? null, lang);
  const handlingUnit = [division, station].filter(Boolean).join(' ') || department;
  return { department, division, station, handlingUnit };
}

// The two justice agencies a run can name, in the player's language. Screens
// read these instead of session.locationProfile.agencies.* for the same
// reason they read getPoliceUnitDisplay: the profile stores the agency's
// Chinese name, and a player on `en` or `jp` must never be shown it.
export function getProsecutorsOfficeDisplay(session, lang = 'zh') {
  return localizeLocationName(session?.locationProfile?.agencies?.prosecutorsOffice ?? null, lang);
}

export function getDistrictCourtDisplay(session, lang = 'zh') {
  return localizeLocationName(session?.locationProfile?.agencies?.districtCourt ?? null, lang);
}

export function getCurrentScenarioSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Scene pages read the session through this rather than createScenarioSession
// so a mid-run reload (or a deep link straight into a later scene during
// staff testing) still finds the SAME case data instead of silently minting
// a second case number halfway through the run.
export function getOrCreateScenarioSession() {
  const session = getCurrentScenarioSession();
  if (!session) return createScenarioSession();
  // Older persisted runs already own their officer name. Attach one visual
  // exactly once without replacing that identity or creating a second run.
  // Runs minted before the police-organization dataset existed carry no
  // station. Draw one exactly once and persist it, rather than resolving on
  // every read - a run's station must never change mid-run.
  if (!session.policeStation) {
    const assignment = resolvePoliceAssignment(
      session.locationProfile?.region?.county ?? null,
      session.locationProfile?.region?.district ?? null,
      Math.random,
      {
        village: session.locationProfile?.region?.village ?? null,
        coordinates: session.locationProfile?.coordinates ?? null,
      },
    );
    session.policeDepartment = session.locationProfile?.agencies?.policeDepartment ?? null;
    session.policeDivision = assignment?.divisionName ?? null;
    session.policeDivisionId = assignment?.divisionId ?? null;
    session.policeStation = assignment?.stationName ?? null;
    session.policeStationType = assignment?.stationType ?? null;
    session.policeUnitJurisdictionBasis = assignment?.jurisdictionBasis ?? null;
    session.policeUnitIsAmbiguous = assignment?.isAmbiguous ?? false;
    session.policeUnitIsFallback = assignment?.isFallback ?? false;
    session.policeUnitFallbackReason = assignment?.fallbackReason ?? null;
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // The in-memory draw stays stable for the mounted scene.
    }
  }
  // Runs minted before either official was cast carry a name but no face.
  // Draw the pair once, keep the names the run already owns (an identity is
  // never replaced mid-run - only given a face), and persist. Both slots are
  // filled from the SAME cast draw whenever either is missing, so a backfilled
  // run gets the same guarantee a fresh one does: the prosecutor and the
  // officer are never the same man.
  if (!session.characterAssignments?.fakePolice?.visualId
    || !session.characterAssignments?.fakeProsecutor?.visualId) {
    const cast = resolveScenario03Cast(session.characterAssignments?.fakePolice?.visualId ?? null);
    cast.fakePolice.resolvedNames = {
      zh: session.officerName,
      en: session.officerNameEn ?? session.officerName,
      jp: session.officerNameJp ?? session.officerName,
    };
    cast.fakeProsecutor.resolvedNames = {
      zh: session.prosecutorName,
      en: session.prosecutorNameEn ?? session.prosecutorName,
      jp: session.prosecutorNameJp ?? session.prosecutorName,
    };
    session.characterAssignments = {
      ...session.characterAssignments,
      fakePolice: cast.fakePolice,
      fakeProsecutor: cast.fakeProsecutor,
    };
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
      // The in-memory assignment remains stable for the mounted scene.
    }
  }
  return session;
}

export function clearScenarioSession() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}
