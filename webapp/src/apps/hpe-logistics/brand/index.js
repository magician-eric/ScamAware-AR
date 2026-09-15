// HPE / 黑皮通 (Happy Express) brand manifest.
//
// `colors` is the canonical CIS. It was originally read by sampling the
// pixels of this same artwork after it had been recovered read-only from git
// history (see docs/hpe-brand-audit.md for that trace) - the repo owner has
// since supplied the real files directly, at ../assets/, confirming the same
// black-and-yellow "HPE" wordmark with an arrow glyph, "黑皮通" in black,
// "HAPPY EXPRESS" as the English tagline. Not the green that was hardcoded in
// apps/hpe-logistics/styles/index.css before this file existed (commit
// 043f43d / PR #214), which had no reference to this artwork at all.
//
// yellowDeep is a derived, WCAG-AA-safe darkening of the same hue for text-on-
// light-background contexts, where the bright yellow itself fails contrast
// (~1.5:1 for white-on-yellow) - it is not a second brand color, just a
// usable shade of the one confirmed hue.
//
// `logos` resolves the supplied files the same way apps/mydondon/brand/
// manifest.js does: import.meta.glob so a missing/renamed file degrades to
// undefined (see ../components/HpeLogo.jsx's text fallback) instead of
// breaking the build.
//
// The originals were supplied as plain white-background PNGs (675 KB /
// 1.09 MB). Converted once, mechanically, the same way MyDonDon's own
// supplied PNGs were (see apps/mydondon/brand/manifest.js's own comment for
// that precedent): the white background was turned into a real alpha
// channel (threshold + unpremultiply, so there's no white fringe on a
// non-white surface), trimmed to the artwork's own bounding box, and
// downscaled to a size no on-screen use here needs more than (900px / 700px
// on the long edge - several times larger than any header/icon use, so it
// stays sharp at 2x+ density). Saved as WebP, quality 92, alpha. Result:
// 1.7 MB combined -> ~95 KB. The artwork itself was not redrawn, recoloured,
// cropped into, or regenerated - same pixels, just matted and re-encoded.
const LOGO_FILES = import.meta.glob('../assets/hpe-*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const logoAsset = (name) => LOGO_FILES[`../assets/${name}.webp`];

export const HPE_BRAND = Object.freeze({
  id: 'hpe-logistics',
  name: '黑皮通',
  internationalName: 'HPE',
  tagline: 'HAPPY EXPRESS',
  status: 'active',
  colors: Object.freeze({
    yellow: '#FFCC00',
    yellowDeep: '#8A6100',
    ink: '#141414',
  }),
  logos: Object.freeze({
    horizontal: logoAsset('hpe-logo-horizontal'),
    deliveryIcon: logoAsset('hpe-delivery-icon'),
  }),
});

// The name to show a player, in their language. The Chinese wordmark and the
// international one are both this App's real identity, so neither is
// "translated" - which one is drawn is a localization decision, and it is made
// here rather than by each surface that needs a label. An English or Japanese
// run that showed 黑皮通 in an image's alt text was Chinese in a non-Chinese
// run for no reason: HPE says the same thing.
export function hpeBrandName(lang) {
  return lang === 'en' || lang === 'jp' ? HPE_BRAND.internationalName : HPE_BRAND.name;
}

// The full lockup, for an image's alt text and the shell's accessible name.
export function hpeBrandLabel(lang) {
  return lang === 'en' || lang === 'jp'
    ? HPE_BRAND.internationalName
    : `${HPE_BRAND.name} ${HPE_BRAND.internationalName}`;
}
