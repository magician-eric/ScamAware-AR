// Node ESM loader that points ArScanHome's recogniser import at
// scripts/stubs/ar-image-recognition.mjs. Test-only, and registered only by
// scripts/register-ar-scan-loaders.mjs - nothing the app builds or ships goes
// through it. See that stub's header for why it exists.
//
// The pattern matches the specifier *as ArScanHome writes it*, not the file it
// resolves to, so a test in the same run can still import the real module by
// its own path and check the parts of it that need no camera.
const STUB = new URL('./stubs/ar-image-recognition.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (/(?:^|\/)lib\/ar\/imageRecognition$/.test(specifier)) {
    return { url: STUB, format: 'module', shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
