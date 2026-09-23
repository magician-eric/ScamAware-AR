import { LOCALIZED_LOCATION_NAMES } from '../../data/location/localizedLocationNames.js';

// The one place a Chinese location or agency name becomes the name a player
// on `en` or `jp` reads.
//
// Why this layer exists at all: locationDataset.js and policeOrganization.js
// are audited transcriptions of what these agencies are actually called, and
// their names are Chinese. That is the right thing for them to store - they
// are reference data about Taiwanese agencies, not copy - but it means every
// screen that renders 縣市 / 行政區 / 警察局 / 分局 / 派出所 / 地方檢察署 /
// 地方法院 straight out of the profile or the session was painting Chinese
// into an English or Japanese run. The datasets keep their Chinese keys; this
// function is what every player-facing surface goes through.
//
// It is deliberately a lookup, never a transformation: the display names live
// in data/location/localizedLocationNames.js, generated once and reviewed,
// so a run can never invent a name and two screens can never disagree about
// one. A name with no entry renders unchanged - a visible, greppable gap
// rather than a blank agency on a screen mid-run - and
// scripts/location-localization.test.mjs fails the build if the datasets ever
// hold a name the table does not.
//
// `lang` is the internal three-way code every dictionary in this repo uses:
// 'zh' | 'en' | 'jp'. Chinese is not a lookup - it is what the datasets
// already store.
export function localizeLocationName(name, lang) {
  if (!name || (lang !== 'en' && lang !== 'jp')) return name ?? null;
  return LOCALIZED_LOCATION_NAMES[name]?.[lang] ?? name;
}

// The agency block of a locked location profile, in the player's language.
// Every field a scenario can render is localized here, so no caller has to
// remember which of them are agency names.
export function localizeAgencies(agencies, lang) {
  if (!agencies) return null;
  return {
    ...agencies,
    policeDepartment: localizeLocationName(agencies.policeDepartment, lang),
    policePrecinct: localizeLocationName(agencies.policePrecinct, lang),
    prosecutorsOffice: localizeLocationName(agencies.prosecutorsOffice, lang),
    districtCourt: localizeLocationName(agencies.districtCourt, lang),
  };
}

// "臺北市信義區" -> "Xinyi District, Taipei City" / "台北市信義区". English
// reads smallest-unit-first with a comma, which is how an address is written
// in English; Chinese and Japanese concatenate largest-first, which is how
// both write one.
export function localizeRegion(region, lang) {
  const county = localizeLocationName(region?.county, lang);
  const district = localizeLocationName(region?.district, lang);
  if (!county && !district) return '';
  if (lang === 'en') return [district, county].filter(Boolean).join(', ');
  return [county, district].filter(Boolean).join('');
}
