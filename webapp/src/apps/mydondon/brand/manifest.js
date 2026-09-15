// MyDonDon (買東東) brand registry.
//
// The six supplied marks live in this module's own ../assets/, beside the two
// product photos data/catalog.js imports: MyDonDon is an App module, and an
// app module owns its own brand artwork (docs/asset-architecture.md 5). They
// used to sit in webapp/src/assets/scenarios/scenario-05/images/, back when
// MyDonDon was implemented inside scenario05 - a marketplace app is not the
// story told on it, so its identity does not live in a scenario's folder.
//
// The supplied PNG exports had the design tool's transparency checkerboard
// baked in as real pixels, at up to 2048px - 7.3 MB for the set. They were
// converted once, mechanically: the checkerboard was turned back into a real
// alpha channel (both the outer margin and the checker enclosed by the
// artwork - letter counters, the gap under the bag handle - while the solid
// white shapes that belong to the mark, the "M" and the smile inside the bag,
// were kept: a checker region contains both background tones, a white logo
// shape only one); the transparent margin was trimmed to the artwork's own
// bounding box; the result was downscaled to display size and saved as WebP,
// quality 92, alpha. 7.3 MB -> 184 KB. The artwork itself is untouched -
// nothing was redrawn, recoloured, cropped into or regenerated. A fresh export
// with genuine transparency can replace any of them under the same filename,
// with no code change here.
//
// They are resolved with import.meta.glob instead of six static `import`
// statements on purpose: an unmatched glob is simply an empty record, so the
// build stays green even if a file is missing or renamed, and dropping a new
// export into that folder needs no code change here. Vite still hashes and
// fingerprints them exactly like the product photos.
//
// Nothing here fabricates a logo: when a file is absent the helper returns
// undefined and the caller renders the plain brand name as text (see
// apps/mydondon/components/MyDonDonLogo.jsx).
const BRAND_FILES = import.meta.glob('../assets/mydondon-*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

function brandAsset(name) {
  return BRAND_FILES[`../assets/${name}.webp`];
}

// The brand name is never translated (spec section 47): "MyDonDon" keeps this
// exact casing in every language, and the Chinese product name is the fixed
// pair "MyDonDon 買東東".
export const MYDONDON = {
  name: 'MyDonDon',
  nameZh: '買東東',
  full: 'MyDonDon 買東東',
};

// Which of the two forms a player is shown. The Latin name is the brand in
// every language and is never translated; the Chinese pair is what a Chinese
// run sees. An English or Japanese run used to be handed "MyDonDon 買東東" as
// the logo's alt text, which put the Chinese product name into a run that has
// no use for it.
export function mydondonBrandLabel(lang) {
  return lang === 'en' || lang === 'jp' ? MYDONDON.name : MYDONDON.full;
}

export const MYDONDON_LOGOS = {
  appIcon: brandAsset('mydondon-app-icon'),
  horizontal: brandAsset('mydondon-logo-horizontal'),
  stacked: brandAsset('mydondon-logo-stacked'),
  wordmark: brandAsset('mydondon-wordmark'),
  wordmarkCn: brandAsset('mydondon-wordmark-cn'),
  white: brandAsset('mydondon-logo-white'),
};

// Where the artwork actually sits inside mydondon-app-icon.webp.
//
// That one export was not trimmed to its mark: the canvas is 384x375 but the
// bag only occupies x 3..303, y 0..366, leaving 81px of empty canvas on the
// right against 3px on the left. Centring the FILE therefore lands the MARK
// 10.2% of the canvas width left of centre - the skew visible on the phone
// desktop. The other five exports are all flush to their artwork, so this is
// a property of this single file, not of the brand set.
//
// The numbers are the file's measured alpha bounding box (pixels where
// alpha > 16), not a hand-tuned nudge, so anything drawing this icon can
// frame the mark instead of the canvas. Re-measure if the asset is
// re-exported; leaving it stale would move the mark, not just the padding.
export const MYDONDON_APP_ICON_BOX = {
  canvasWidth: 384,
  canvasHeight: 375,
  x: 3,
  y: 0,
  width: 300,
  height: 366,
};
