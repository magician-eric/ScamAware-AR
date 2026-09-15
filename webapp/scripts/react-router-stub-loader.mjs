// Node ESM loader that points `react-router-dom` at scripts/stubs/react-router-dom.mjs.
// Test-only, and registered only by scripts/register-gesture-contract-loaders.mjs -
// nothing the app builds or ships goes through it.
const STUB = new URL('./stubs/react-router-dom.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'react-router-dom') return { url: STUB, format: 'module', shortCircuit: true };
  return nextResolve(specifier, context);
}
