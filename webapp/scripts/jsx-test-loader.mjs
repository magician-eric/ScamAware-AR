// Node ESM loader so tests can import this project's React source directly.
//
// Extends scripts/extensionless-loader.mjs (Vite-style extensionless/folder
// imports) with the two other things Vite does for the app and Node does not:
// compiling JSX, and turning asset/CSS imports into modules. Only used by
// tests - the app itself is always built through Vite.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transform } from 'rolldown/experimental';

const ASSET = /\.(webp|png|jpg|jpeg|svg|css|mp4|mp3|wav)$/;

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const resolvable = err.code === 'ERR_MODULE_NOT_FOUND'
      || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT'
      || err.code === 'ERR_UNKNOWN_FILE_EXTENSION';
    if (!resolvable || !specifier.startsWith('.')) throw err;
    const base = fileURLToPath(new URL(specifier, context.parentURL));
    if (ASSET.test(base)) return { url: pathToFileURL(base).href, format: 'module', shortCircuit: true };
    for (const ext of ['.js', '.jsx', '/index.js', '/index.jsx']) {
      if (existsSync(base + ext)) return nextResolve(pathToFileURL(base + ext).href, context);
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (ASSET.test(url)) {
    // Vite hands components a URL string for an asset; the tests only care
    // that something renders, not which file it points at.
    return { format: 'module', shortCircuit: true, source: 'export default "asset";' };
  }
  if (!/\/src\/.*\.jsx?$/.test(url)) return nextLoad(url, context);
  const path = fileURLToPath(url);
  // Two Vite-only `import.meta` features the app relies on, given the value
  // they have in a plain build: an asset glob resolves to an empty record
  // (the brand registry already treats that as "artwork missing" and falls
  // back to text), and BASE_URL is the site root.
  const raw = readFileSync(path, 'utf8')
    .replaceAll('import.meta.glob', '(() => ({}))')
    .replaceAll('import.meta.env', "({ BASE_URL: '/' })");
  if (!path.endsWith('.jsx')) return { format: 'module', shortCircuit: true, source: raw };
  const { code } = await transform(path, raw, { jsx: { runtime: 'automatic' } });
  return { format: 'module', shortCircuit: true, source: code };
}
