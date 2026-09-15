// Pixel-measured layout for the three ar-scan-hero-{zh,en,jp}.webp artworks.
// v2: the supplied artwork now has a REAL alpha cutout for the camera box
// (earlier versions used a solid white or checkerboard-pattern fill, which
// needed the <video> layered ON TOP of the artwork at matching coordinates
// - see git history on this file for that approach). With a true cutout,
// the <video> instead sits BEHIND the artwork and shows through the hole
// directly, which is simpler and pixel-perfect regardless of screen size.
//
// Each language's canvas has a slightly different size/aspect ratio (zh/en
// are 841x1870, jp is 852x1846) since the top masthead block's height
// differs per language, so both the container's aspect-ratio and the box
// coordinates are tracked per language rather than assuming one shared
// canvas like the previous artwork version did.
//
// No bars/title/button are baked into this artwork below the camera box -
// that whole area is open background, so ArScanHome.jsx places the title
// and manual-selection button freely there instead of aligning to drawn
// bars.
//
// Measured with a Python/PIL script: found the checkerboard placeholder
// box via connected-component analysis on its light-gray/white pixels,
// then cleared that exact bounding rectangle to true alpha 0. Re-measure
// and update this file if the artwork is ever swapped for a new version.
// The artwork itself, one file per language. It lives here rather than in
// ArScanHome.jsx for the same reason the measurements do: which file a
// language gets is data about these three artworks, and every other fact
// about them is already in this file. Keeping the three tables together also
// makes it impossible to add a language's box coordinates and forget its
// image - or to leave the image behind in a component where a
// locale-coverage check cannot see it (scripts/validate-localized-assets.mjs).
//
// The masthead block at the top of each artwork carries drawn title text, so
// these are genuinely three different images, not one image with a caption
// laid over it.
const HERO_DIR = `${import.meta.env?.BASE_URL ?? '/'}assets/shared/ui/`;

export const HERO_IMAGE_SRC_BY_LANG = {
  zh: `${HERO_DIR}ar-scan-hero-zh.webp`,
  en: `${HERO_DIR}ar-scan-hero-en.webp`,
  jp: `${HERO_DIR}ar-scan-hero-jp.webp`,
};

export const HERO_IMAGE_ASPECT_RATIO_BY_LANG = {
  zh: 841 / 1870,
  en: 841 / 1870,
  jp: 852 / 1846,
};

export const CAMERA_BOX_BY_LANG = {
  zh: { top: 40.96, bottom: 69.09, left: 15.93, right: 83.95 },
  en: { top: 41.82, bottom: 72.35, left: 16.65, right: 82.64 },
  jp: { top: 44.58, bottom: 73.56, left: 16.90, right: 82.75 },
};
