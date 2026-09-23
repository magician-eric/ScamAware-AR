// The floor under the shared inactivity hint's band, in CSS pixels.
//
// The band itself is MEASURED, not computed: the strip is sized by its own
// content (one line of copy, or two when a longer translation wraps on a
// narrow screen) and reports its height, so the space the stage gives up is
// exactly what the hint needs and never a pixel more. That matters because
// every pixel of band is a pixel the whole stage is scaled down by - at
// 430x956 a 78px band costs 8.2% and a 50px one costs 5.2%.
//
// This is only the floor that applies before the first measurement lands and
// if a measurement ever comes back as nothing: enough for one line of the
// smallest copy at the smallest size, so the hint is never clipped by its own
// band even for the frame before it is measured.
export const INTERACTION_HINT_BAND_MIN = 48;

export function interactionHintBandHeight(measuredHeight) {
  const height = Number(measuredHeight);
  if (!Number.isFinite(height) || height <= 0) return INTERACTION_HINT_BAND_MIN;
  return Math.max(Math.round(height), INTERACTION_HINT_BAND_MIN);
}
