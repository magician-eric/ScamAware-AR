// Every file a character owns lives under this one root, in a folder named
// after the visual's own ID - never inside a scenario's asset folder.
// female_visual_01/02 are drawn by both scenario01 and scenario05, so storing
// them in either scenario's folder would force the other to read out of it.
// See docs/asset-architecture.md.
const CHARACTERS = 'assets/shared/characters';
const asset = (visualId, file) => `${CHARACTERS}/${visualId}/${file}`;
const avatarOf = (visualId) => asset(visualId, 'avatar.webp');

// Same defensive read as data/scenario03Dialogues.js: this registry is loaded
// as plain data by the node-run validators and tests, where import.meta.env
// does not exist at all.
const BASE_URL = import.meta.env?.BASE_URL ?? '/';

// dating_visual_03's affection-stage clips are part of her fixed bundle, so
// they are stored with her rather than left behind in scenario02's folder -
// the bundle travels as one unit. The Yilan villa chat photos are not hers:
// they are scenario02 story props and live in that scenario's folder.
const dv3 = (file) => asset('dating_visual_03', file);

// The languages a recorded asset can exist in. Same three codes the rest of
// the app uses, and 'jp' - never 'ja' - for the same reason (see
// shared/i18n/scenario02.js).
export const CHARACTER_MEDIA_LANGUAGES = ['zh', 'en', 'jp'];

// Which asset kinds are RECORDED rather than merely photographed. A photo of
// a face is the same photo in every language; a clip of that face talking is
// a different recording per language, so these two kinds are locale tables
// ({ zh, en, jp }) and every other kind stays a plain path.
//
// This mirrors SCENARIO03_AUDIO_FILES in data/scenario03Dialogues.js, which
// is the same problem already solved for that scenario's call recordings.
const LOCALE_KEYED_ASSETS = new Set(['videos', 'mediaPreviews']);

const NO_VIDEOS = { zh: [], en: [], jp: [] };

// dating_visual_03 speaks to camera in all three clips, so an English or
// Japanese player needs an English or Japanese RECORDING - there is no
// subtitle track and no dubbing here, the audio is the content.
//
// `en` and `jp` are empty on purpose. They are a declaration that those
// recordings do not exist yet, not an oversight, and they must stay empty
// until real files land: naming a file that is not on disk is exactly what
// scripts/validate-asset-ownership.mjs RULE 1 rejects. What the empty list
// costs is recorded per locale by getVisualVideo() below and reported by
// scripts/validate-localized-assets.mjs, so an en/jp run playing her Chinese
// clips is a known, listed gap rather than something the app hides.
// The gap itself is written up in docs/asset-localization-audit.md 5.
const DV3_VIDEOS = {
  zh: [dv3('video-010.mp4'), dv3('video-020.mp4'), dv3('video-030.mp4')],
  en: [],
  jp: [],
};

export const VISUALS = [
  { id: 'scenario01_coach_chen', gender: 'male', assets: { avatar: avatarOf('scenario01_coach_chen') }, fixed: true, scenarioScope: ['scenario01'], randomEligible: false, eligibleRoles: ['scenario01.coachChen'] },
  { id: 'scenario01_stock_rookie', gender: 'male', assets: { avatar: avatarOf('scenario01_stock_rookie') }, fixed: true, scenarioScope: ['scenario01'], randomEligible: false, eligibleRoles: ['scenario01.stockRookie'] },
  { id: 'scenario01_wealth_freedom', gender: 'male', assets: { avatar: avatarOf('scenario01_wealth_freedom') }, fixed: true, scenarioScope: ['scenario01'], randomEligible: false, eligibleRoles: ['scenario01.wealthFreedom'] },
  { id: 'female_visual_01', gender: 'female', assets: { avatar: avatarOf('female_visual_01') }, tags: ['casual', 'avatar-only'], randomEligible: true, eligibleRoles: ['scenario04.platformAgent', 'scenario01.vipMember', 'scenario05.buyerTablet'] },
  { id: 'female_visual_02', gender: 'female', assets: { avatar: avatarOf('female_visual_02') }, tags: ['casual', 'avatar-only'], randomEligible: true, eligibleRoles: ['scenario04.platformAgent', 'scenario01.vipMember', 'scenario05.buyerStrollerMom'] },
  { id: 'male_visual_01', gender: 'male', assets: { avatar: avatarOf('male_visual_01') }, tags: ['casual', 'avatar-only'], randomEligible: true, eligibleRoles: ['scenario01.vipMember', 'scenario03.fakePolice', 'scenario03.fakeProsecutor'] },
  { id: 'male_visual_02', gender: 'male', assets: { avatar: avatarOf('male_visual_02') }, tags: ['casual', 'avatar-only'], randomEligible: true, eligibleRoles: ['scenario01.vipMember', 'scenario03.fakePolice', 'scenario03.fakeProsecutor', 'scenario05.buyerStrollerDad'] },
  { id: 'male_visual_03', gender: 'male', assets: { avatar: avatarOf('male_visual_03') }, tags: ['casual', 'avatar-only'], randomEligible: true, eligibleRoles: ['scenario01.vipMember', 'scenario03.fakePolice', 'scenario03.fakeProsecutor'] },
  { id: 'dating_visual_01', scenarioScope: ['scenario02'], gender: 'female', assets: { avatar: avatarOf('dating_visual_01'), profilePhoto: avatarOf('dating_visual_01'), largePhotos: [avatarOf('dating_visual_01')], photos: [], videos: NO_VIDEOS, mediaPreviews: NO_VIDEOS }, tags: ['dating-bundle', 'fixed-bundle'], randomEligible: false, eligibleRoles: ['scenario02.datingCandidate01'] },
  { id: 'dating_visual_02', scenarioScope: ['scenario02'], gender: 'female', assets: { avatar: avatarOf('dating_visual_02'), profilePhoto: avatarOf('dating_visual_02'), largePhotos: [avatarOf('dating_visual_02')], photos: [], videos: NO_VIDEOS, mediaPreviews: NO_VIDEOS }, tags: ['dating-bundle', 'fixed-bundle'], randomEligible: false, eligibleRoles: ['scenario02.datingCandidate02'] },
  { id: 'dating_visual_03', scenarioScope: ['scenario01', 'scenario02'], gender: 'female', assets: { avatar: avatarOf('dating_visual_03'), profilePhoto: avatarOf('dating_visual_03'), largePhotos: [avatarOf('dating_visual_03')], photos: [], videos: DV3_VIDEOS, mediaPreviews: DV3_VIDEOS }, tags: ['dating-bundle', 'fixed-bundle'], randomEligible: false, eligibleRoles: ['scenario01.investmentAssistant', 'scenario02.datingLead'] },
];

export const getVisual = (id) => VISUALS.find((visual) => visual.id === id);

// Every file path a bundle holds, whatever shape the kind is stored in: the
// plain kinds and every language of the recorded ones. One helper, so adding
// a locale-keyed kind can never make files invisible to a check that walks a
// bundle looking for them.
export function collectVisualAssetPaths(assets) {
  const paths = [];
  const walk = (value) => {
    if (typeof value === 'string') paths.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(assets);
  return paths;
}

// How many clips a locale-keyed bundle holds, counted in the language that
// defines the story - a locale is missing recordings, it never has extra ones.
export const getVisualVideoCount = (visualId, asset = 'videos') =>
  getVisual(visualId)?.assets?.[asset]?.zh?.length ?? 0;

// Resolves ONE locale-keyed clip, and says which language actually came back.
//
// The return value is deliberately not a bare URL. A caller that only ever
// saw a string could not tell "this is the English recording" from "this is
// the Chinese recording standing in for it", which is precisely how an
// English run ended up playing Chinese clips with nothing in the code saying
// so. `localized` is that missing bit, and `resolvedLang` names what is
// really being played.
//
// The fall back to zh is a story guarantee, not a language one: the clip is a
// beat the conversation waits on (see useAutoMediaPreview / onFinished in
// pages/scenario02/PrivateChat.jsx), so an absent recording may not leave the
// chat with nothing to play. It is reported instead - see the module header.
export function getVisualVideo(visualId, index = 0, lang = 'zh', asset = 'videos') {
  const table = getVisual(visualId)?.assets?.[asset];
  if (!table || Array.isArray(table)) return { url: '', path: '', resolvedLang: null, localized: false };
  const wanted = table[lang]?.[index];
  const path = wanted ?? table.zh?.[index] ?? '';
  if (!path) return { url: '', path: '', resolvedLang: null, localized: false };
  return {
    url: `${BASE_URL}${path}`,
    path,
    resolvedLang: wanted ? lang : 'zh',
    localized: Boolean(wanted),
  };
}

// Every locale-keyed clip a visual owns, in one call, for a single language -
// what a screen that shows a whole conversation's worth of clips needs.
export function getVisualVideos(visualId, lang = 'zh', asset = 'videos') {
  return Array.from({ length: getVisualVideoCount(visualId, asset) }, (_, index) =>
    getVisualVideo(visualId, index, lang, asset));
}

// Plain (non-recorded) assets: a face is a face in every language, so this
// signature is unchanged. Asking it for a locale-keyed kind is a programming
// error rather than a silent Chinese fallback, so it returns nothing and
// getVisualVideo() stays the only door to a recording.
export function getVisualAssetUrl(visualId, asset = 'avatar', index = 0) {
  if (LOCALE_KEYED_ASSETS.has(asset)) return '';
  const value = getVisual(visualId)?.assets?.[asset];
  const path = Array.isArray(value) ? value[index] : value;
  return path ? `${BASE_URL}${path}` : '';
}
