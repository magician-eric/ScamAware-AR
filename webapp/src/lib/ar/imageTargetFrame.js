// How a frame is turned into the grey pixels the matcher actually sees.
//
// This module exists because the same answer has to be given twice, in two
// different processes, and a mismatch between them is invisible: a target
// compiled from one kind of pixels and a camera frame prepared another way
// simply never match, with no error anywhere. So both callers - the runtime
// recogniser (./imageRecognition.js) and the offline compiler
// (scripts/compile-image-targets.mjs) - import these functions rather than
// each doing "roughly the same thing".
//
// The sharpening step earns its place on low-texture targets. It was added for
// a previous set of smooth 3D-rendered icons whose only strong gradients were
// their own silhouettes: against the real detector an unsharp pass roughly
// doubled the feature points found on them and turned several from unmatchable
// into reliable. The current targets are detailed enough not to need it -
// measured with and without, they match at every sampled pose either way - so
// it is kept as headroom for a soft or badly lit lens, not as a necessity, and
// the empty-scene case in scripts/ar-image-recognition.test.mjs is what holds
// the other side of it: sharpening amplifies noise, and noise must still match
// nothing. See docs/ar-image-recognition.md.

// The matcher is scale-sensitive in one specific way: detection runs on a
// fixed-size square crop taken from the centre of the frame (256x256 for
// these dimensions), so what matters is how much of that crop the object
// fills. Frames are drawn to this size regardless of what the camera hands
// us, which keeps that relationship fixed instead of varying by device.
export const PROCESSING_WIDTH = 640;
export const PROCESSING_HEIGHT = 480;

// Strength of the unsharp pass, as a multiplier on the difference between the
// pixel and its sharpened value. 1.0 is a plain 3x3 sharpen; 1.5 measured best
// across the low-texture set it was tuned on, without introducing false
// matches.
export const SHARPEN_AMOUNT = 1.5;

const clamp255 = (value) => (value < 0 ? 0 : value > 255 ? 255 : value);

// RGBA bytes -> one grey value per pixel, using the same channel average the
// MindAR compiler uses internally, so a grey value written back into R, G and
// B survives its conversion unchanged.
export function rgbaToGrey(rgba, pixelCount) {
  const grey = new Float32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    grey[i] = (rgba[offset] + rgba[offset + 1] + rgba[offset + 2]) / 3;
  }
  return grey;
}

// 3x3 unsharp mask, edge pixels clamped. Values are rounded to integers
// because the compile side has to round anyway (it writes them back into 8-bit
// canvas channels) - doing it on both sides keeps the two paths bit-identical
// rather than nearly so.
export function sharpenGrey(grey, width, height, amount = SHARPEN_AMOUNT) {
  const out = new Float32Array(grey.length);
  const at = (x, y) => grey[(y < 0 ? 0 : y >= height ? height - 1 : y) * width + (x < 0 ? 0 : x >= width ? width - 1 : x)];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centre = grey[y * width + x];
      const sharpened = 5 * centre - at(x - 1, y) - at(x + 1, y) - at(x, y - 1) - at(x, y + 1);
      out[y * width + x] = Math.round(clamp255(centre + (sharpened - centre) * amount));
    }
  }
  return out;
}

// The whole preparation, for callers that start from RGBA pixels.
export function prepareMatcherPixels(rgba, width, height, amount = SHARPEN_AMOUNT) {
  return sharpenGrey(rgbaToGrey(rgba, width * height), width, height, amount);
}
