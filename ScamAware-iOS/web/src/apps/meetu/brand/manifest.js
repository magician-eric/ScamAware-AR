// MeetU (覓友) brand registry - the app module owns its own artwork
// (docs/asset-architecture.md §5), so nothing outside this module needs a
// URL to it. The files used to sit in
// public/assets/scenarios/scenario-02/images/brand/ back when MeetU was
// implemented inside Scenario02; bundling them here is the same treatment
// GuGo Invest's logos already get, so Vite fingerprints them like any other
// module asset.
//
// Resolved with import.meta.glob rather than static imports for the same
// reason MyDonDon's manifest does: an unmatched glob is simply an empty
// record, so a missing or renamed file cannot break the build - the caller
// renders its own fallback instead.
const BRAND_FILES = import.meta.glob('../assets/meetu-*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

function brandAsset(name) {
  return BRAND_FILES[`../assets/${name}.webp`];
}

// "MeetU" is the constant brand name in every locale (zh/en/jp); 覓友 is only
// ever a secondary tag shown alongside it, never a translation swapped in.
export const MEETU = {
  name: 'MeetU',
  nameZh: '覓友',
  full: 'MeetU｜覓友',
  appIcon: brandAsset('meetu-icon'),
};

// Real MeetU artwork (uploaded designs), each pre-processed from an opaque
// white PNG into a transparent WebP so it drops cleanly onto whatever surface
// it is placed on. Which variant to use is a layout choice, not a language one.
//   - 'compact': cat + heart mark + "MeetU", for tight header space
//   - 'full': + "｜覓友", for light-surface screens with room to spare
//   - 'matchSuccess': a separate lockup (not a crop of the above), high-
//     contrast white-filled/outlined "MeetU｜覓友" designed specifically to
//     stay legible over the dark blurred Match Success backdrop - see
//     MatchOverlay.jsx - where 'full's dark navy wordmark would wash out
export const MEETU_LOGOS = {
  compact: brandAsset('meetu-logo-compact'),
  full: brandAsset('meetu-logo'),
  matchSuccess: brandAsset('meetu-match-success-logo'),
};

// Native pixel aspect ratio (width / height) of each lockup, so callers can
// set just a height and get the correct width for free.
export const MEETU_LOGO_ASPECT = {
  compact: 1332 / 375,
  full: 1745 / 375,
  matchSuccess: 1794 / 402,
};
