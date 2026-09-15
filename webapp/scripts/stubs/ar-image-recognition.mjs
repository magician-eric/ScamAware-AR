// Stands in for src/lib/ar/imageRecognition.js when ArScanHome is rendered in
// a test. Test-only, reached through scripts/ar-scan-stub-loader.mjs.
//
// The real module needs a camera, a WebGL backend and a 3MB dataset. What
// ArScanHome's tests are about is the wiring around it - what a sighting does
// to the page, what it deliberately does NOT do (navigate), how long an offer
// survives, and that the recogniser is stopped on the way out - so this
// exposes the same two-function surface and lets the test decide when a target
// is "seen".
export const startCalls = [];

export function startImageRecognition(previewHost, { onTargetSeen }) {
  const call = {
    previewHost,
    stopCount: 0,
    // Report a target the way the real loop would: once per matched frame,
    // for as long as the card is in view. `see(2)` three times is the same
    // card still being held, not three separate findings - which is exactly
    // the stream the page's target lock exists to smooth out.
    see: (targetIndex) => onTargetSeen(targetIndex),
  };
  call.handle = { stop: () => { call.stopCount += 1; } };
  startCalls.push(call);
  return Promise.resolve(call.handle);
}

export function resetStub() {
  startCalls.length = 0;
}
