// Node ESM loader that points `apps/gugo-invest/app` at
// scripts/stubs/gugo-invest-app.mjs. Test-only, and registered only by
// scripts/register-outcome-reachability-loaders.mjs - nothing the app builds
// or ships goes through it. See that stub's header for why it exists.
const STUB = new URL('./stubs/gugo-invest-app.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (/(?:^|\/)apps\/gugo-invest\/app$/.test(specifier)) {
    return { url: STUB, format: 'module', shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
