// Minimal Node ESM loader hook so dev scripts and tests can import this
// project's source files directly with Node, even though they use
// Vite-style relative imports that Node does not resolve on its own:
// extensionless (`from '../foo'` instead of `from '../foo.js'`) and folder
// imports (`from '../apps/gugo-invest'` meaning that folder's index.js).
// Only used by those scripts - the app itself is always built/served
// through Vite, which already resolves both natively.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const resolvable = err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT';
    if (!resolvable || !specifier.startsWith('.')) throw err;
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    for (const ext of ['.js', '.jsx', '/index.js', '/index.jsx']) {
      if (existsSync(base + ext)) {
        return nextResolve(pathToFileURL(base + ext).href, context);
      }
    }
    throw err;
  }
}
