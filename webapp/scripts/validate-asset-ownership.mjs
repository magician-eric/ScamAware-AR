// Asset architecture guard.
//
// Turns the invariants docs/asset-architecture.md states in prose into a
// build-time check, so the shape of the asset tree cannot drift back once it
// has been settled. Every rule below corresponds to a section of that
// document; the numbering matches the summary this script prints on success.
//
// The hard part of an asset validator is that a filename grep proves nothing:
// this repo resolves assets through six different mechanisms (static import,
// import.meta.glob, a runtime URL built from BASE_URL, a registry keyed by a
// logical name, a CSS url(), and index.html/manifest.json), and a grep sees
// none of the composition. So instead of matching text, this script *loads*
// each registry module and reads the paths it actually produces:
//
//   - `import.meta.env.BASE_URL` is substituted with '/', the same value the
//     dev server uses, so a runtime URL evaluates to a public-relative path;
//   - `import.meta.glob(...)` is replaced with the real filesystem match, so a
//     registry that indexes the glob by a logical key ('mydondon-logo-white')
//     resolves exactly as Vite would - and returns undefined, loudly, when the
//     file behind that key is gone;
//   - a static `import x from './a.webp'` becomes a marker string carrying the
//     file's repo path, so bundled and public assets are collected alike.
//
// Whatever cannot be evaluated - JSX components that compose a URL from a
// module-level base constant, CSS, HTML, the web manifest - is covered by the
// literal scan in `collectLiteralReferences`, which resolves those same
// composition forms textually.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, join, relative, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';

const webapp = resolvePath(new URL('..', import.meta.url).pathname);
const repoRoot = resolvePath(webapp, '..');
const rel = (absolute) => relative(webapp, absolute).replaceAll('\\', '/');
const abs = (path) => resolvePath(webapp, path);

const violations = [];
const fail = (rule, message) => violations.push(`[${rule}] ${message}`);

// ---------------------------------------------------------------------------
// Canonical roots (docs/asset-architecture.md 1)
// ---------------------------------------------------------------------------

// Roots whose binaries ship. Everything in them must be reachable from source,
// and every raster in them must be WebP (RULE 3's icon exception aside).
const PUBLIC_ASSETS = 'public/assets';
const PUBLIC_ICONS = 'public/icons';
const BUNDLED_ASSETS = 'src/assets';
const APP_ASSETS = /^src\/apps\/[^/]+\/assets\//;
// Design masters. Never served, never bundled, deliberately not WebP, and
// deliberately allowed to share subject matter with the file that ships.
const ASSET_SOURCES = 'asset-sources';

const BINARY_EXTENSIONS = new Set([
  '.webp', '.png', '.jpg', '.jpeg', '.gif', '.avif', '.svg', '.ico',
  '.mp4', '.webm', '.mp3', '.wav', '.ogg',
]);
const RASTER_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.avif']);
const SOURCE_EXTENSIONS = /\.(?:[mc]?[jt]sx?|css|html)$/;

const isBinary = (path) => BINARY_EXTENSIONS.has(extname(path).toLowerCase());

function collectSync(dir, predicate = () => true) {
  const output = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) output.push(...collectSync(path, predicate));
    else if (predicate(path)) output.push(path);
  }
  return output;
}

const shippingBinaries = [
  ...collectSync(abs(PUBLIC_ASSETS), isBinary),
  ...collectSync(abs(PUBLIC_ICONS), isBinary),
  ...collectSync(abs(BUNDLED_ASSETS), isBinary),
  ...collectSync(abs('src/apps'), (path) => isBinary(path) && APP_ASSETS.test(rel(path))),
].map(rel).sort();

const masterBinaries = collectSync(abs(ASSET_SOURCES), isBinary).map(rel).sort();

const sourceFiles = collectSync(abs('src'), (path) => SOURCE_EXTENSIONS.test(path)).map(rel).sort();

// ---------------------------------------------------------------------------
// Reference collection
// ---------------------------------------------------------------------------

// A reference is one resolved (consumer -> asset) edge. `target` is always a
// webapp-relative path, so a public runtime URL and a bundled import land in
// the same coordinate system and every rule below can reason about both.
const references = [];
const addReference = (consumer, target, mechanism) => references.push({ consumer, target, mechanism });

// Marks a value that came from a bundled import rather than a public URL. The
// leading space keeps it out of every path shape a real specifier can take.
const BUNDLED = ' bundled:';

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const doubled = escaped.split('**').map((part) => part.split('*').join('[^/]*')).join('.*');
  return new RegExp(`^${doubled}$`);
}

// Vite keys a glob by the specifier as written ('../assets/x.webp'), which is
// what these registries index by, so the keys are rebuilt in that same form.
function resolveGlob(moduleDir, pattern) {
  const staticPrefix = pattern.slice(0, pattern.replace(/\*[\s\S]*$/, '').lastIndexOf('/') + 1);
  const matcher = globToRegExp(pattern);
  const entries = {};
  for (const file of collectSync(resolvePath(moduleDir, staticPrefix))) {
    const specifier = relative(moduleDir, file).replaceAll('\\', '/');
    const key = specifier.startsWith('..') ? specifier : `./${specifier}`;
    if (matcher.test(key)) entries[key] = `${BUNDLED}${rel(file)}`;
  }
  return entries;
}

const MODULE_EXTENSIONS = ['.js', '.jsx', '.mjs', '.ts', '.tsx', '/index.js', '/index.jsx'];
function resolveModuleSpecifier(fromDir, specifier) {
  const base = resolvePath(fromDir, specifier);
  if (extname(base) !== '' && existsSync(base)) return base;
  for (const extension of MODULE_EXTENSIONS) {
    if (existsSync(base + extension)) return base + extension;
  }
  return null;
}

// Scenario03's shared language helpers read browser storage at module load, so
// the registry that holds its audio table cannot be imported without this -
// same stub, same reason, as scripts/validate-scenario03-dialogues.mjs.
globalThis.localStorage ??= { getItem: () => null };

// Loads a registry module with Vite's two build-time primitives shimmed out,
// so its exported tables can be read as plain data.
async function loadRegistry(relativePath) {
  const absolute = abs(relativePath);
  const moduleDir = dirname(absolute);
  let code = await readFile(absolute, 'utf8');

  code = code
    .replace(/import\.meta\.env\?\.BASE_URL/g, "'/'")
    .replace(/import\.meta\.env\.BASE_URL/g, "'/'")
    .replace(/import\.meta\.env\b/g, "({ BASE_URL: '/' })");

  code = code.replace(
    /import\.meta\.glob\(\s*(['"`])([^'"`]+)\1\s*(?:,\s*\{[^{}]*\}\s*)?\)/g,
    (_match, _quote, pattern) => JSON.stringify(resolveGlob(moduleDir, pattern)),
  );

  // A static asset import becomes the same marker a glob produces; a missing
  // file is reported here rather than silently evaluating to undefined.
  code = code.replace(
    /import\s+(\w+)\s+from\s*(['"])([^'"]+)\2\s*;?/g,
    (match, name, _quote, specifier) => {
      if (!isBinary(specifier)) return match;
      const target = resolvePath(moduleDir, specifier);
      if (!existsSync(target)) fail('RULE 1', `${relativePath}: imports ${specifier}, which does not exist`);
      return `const ${name} = ${JSON.stringify(`${BUNDLED}${rel(target)}`)};`;
    },
  );

  // A data: URL has no directory of its own, so relative module imports are
  // rewritten to absolute file URLs. Anything deeper is left to this project's
  // extensionless loader, exactly as the other validators rely on it.
  code = code.replace(
    /(from\s*|import\s*)(['"])(\.[^'"]*)\2/g,
    (match, prefix, quote, specifier) => {
      const target = resolveModuleSpecifier(moduleDir, specifier);
      return target ? `${prefix}${quote}${pathToFileURL(target).href}${quote}` : match;
    },
  );

  return import(`data:text/javascript;base64,${Buffer.from(code, 'utf8').toString('base64')}`);
}

// Walks an evaluated registry value and records every asset path it produces.
function harvest(consumer, value, mechanism) {
  const seen = new Set();
  const found = [];
  const walk = (node) => {
    if (node == null) return;
    if (typeof node === 'string') {
      if (node.startsWith(BUNDLED)) found.push(node.slice(BUNDLED.length));
      else if (/^\/?(?:assets|icons)\//.test(node) && isBinary(node)) found.push(`public/${node.replace(/^\//, '')}`);
      return;
    }
    if (typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    for (const child of Array.isArray(node) ? node : Object.values(node)) walk(child);
  };
  walk(value);
  for (const target of found) addReference(consumer, target, mechanism);
  return found;
}

// ---------------------------------------------------------------------------
// The registries this app actually resolves assets through
// ---------------------------------------------------------------------------

// assetMap.js is located rather than hardcoded: which module owns it is a
// separate question from whether the paths it produces resolve, and this check
// must keep working either way.
const assetMapCandidates = collectSync(abs('src'), (path) => basename(path) === 'assetMap.js').map(rel);
if (assetMapCandidates.length !== 1) {
  fail('RULE 1', `expected exactly one assetMap.js under src/, found ${assetMapCandidates.length}${assetMapCandidates.length ? `: ${assetMapCandidates.join(', ')}` : ''}`);
}

// `expected` is a floor, asserted so a registry that stops resolving - a
// renamed export, a reshaped table - fails loudly instead of quietly checking
// nothing. `requiredKeys` names the logical keys that must each land on a real
// file, which is what catches a glob-backed registry losing one member.
const REGISTRIES = [
  // Scenario 04 product / unboxing / evidence artwork, keyed by assetKey.
  ...(assetMapCandidates.length === 1 ? [{
    file: assetMapCandidates[0],
    mechanism: 'scenario04 asset map',
    read: (module) => module.ASSET_MAP,
    expected: 22,
  }] : []),
  // Shared Character Registry - the one owner of every character's media.
  {
    file: 'src/experience/characters/visuals.js',
    mechanism: 'character registry',
    read: (module) => module.VISUALS.map((visual) => visual.assets),
    expected: 14,
  },
  // Ending artwork, one pair per scenario.
  {
    file: 'src/components/outcome/resultMascots.js',
    mechanism: 'result mascots',
    read: (module) => module.RESULT_MASCOTS,
    expected: 10,
  },
  // Scenario 03 dialogue recordings, three languages.
  {
    file: 'src/data/scenario03Dialogues.js',
    mechanism: 'scenario03 audio table',
    read: (module) => module.SCENARIO03_AUDIO_FILES,
    expected: 63,
  },
  // App brand manifests. Each indexes a glob by a logical name, so a key whose
  // file is missing resolves to undefined - `requiredKeys` turns that into an
  // error rather than a silently text-only logo.
  {
    file: 'src/apps/mydondon/brand/manifest.js',
    mechanism: 'MyDonDon brand manifest',
    read: (module) => module.MYDONDON_LOGOS,
    expected: 6,
    // Only `horizontal` and `appIcon` are rendered today (MyDonDonHeader /
    // ChatScreen). The other four are supplied brand variants held in reserve:
    // they are named keys of a manifest, not dead files, and must not be
    // deleted to "clean up" an unrendered asset.
    requiredKeys: ['appIcon', 'horizontal', 'stacked', 'wordmark', 'wordmarkCn', 'white'],
  },
  {
    file: 'src/apps/meetu/brand/manifest.js',
    mechanism: 'MeetU brand manifest',
    read: (module) => ({ appIcon: module.MEETU.appIcon, ...module.MEETU_LOGOS }),
    expected: 4,
    requiredKeys: ['appIcon', 'compact', 'full', 'matchSuccess'],
  },
  {
    file: 'src/apps/hpe-logistics/brand/index.js',
    mechanism: 'HPE brand manifest',
    read: (module) => module.HPE_BRAND.logos,
    expected: 2,
    requiredKeys: ['horizontal', 'deliveryIcon'],
  },
];

for (const registry of REGISTRIES) {
  let table;
  try {
    table = registry.read(await loadRegistry(registry.file));
  } catch (error) {
    fail('RULE 1', `${registry.file}: could not be evaluated as an asset registry (${error.message})`);
    continue;
  }
  for (const key of registry.requiredKeys ?? []) {
    if (table?.[key] == null) {
      fail('RULE 1', `${registry.file}: registry key '${key}' resolves to nothing - its file is missing or was renamed`);
    }
  }
  const found = harvest(registry.file, table, registry.mechanism);
  if (found.length < registry.expected) {
    fail('RULE 1', `${registry.file}: resolved ${found.length} assets, expected at least ${registry.expected} - the registry's shape changed and this check no longer covers it`);
  }
}

// Scenario entry heroes are reached by scenario id through a glob, so the
// registry is exercised the way a scenario's entry screen exercises it.
{
  const file = 'src/lib/scenarioEntryHeroes.js';
  const module = await loadRegistry(file);
  const scenarioDirs = (await readdir(abs(`${BUNDLED_ASSETS}/scenarios`), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const scenarioId of scenarioDirs) {
    const hero = module.getScenarioEntryHero(scenarioId);
    if (!hero) fail('RULE 1', `${file}: no entry hero resolves for ${scenarioId}`);
    else harvest(file, hero, 'scenario entry heroes');
  }
}

// ---------------------------------------------------------------------------
// Direct consumers: static imports, composed runtime URLs, CSS, HTML, manifest
// ---------------------------------------------------------------------------

const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, '$1');

// Two composition forms cover every runtime asset URL in this app:
//   `${import.meta.env.BASE_URL}assets/.../file.webp`
//   const DIR = `${import.meta.env.BASE_URL}assets/.../`;  ...  `${DIR}file.webp`
// Both are resolved here, so a component that names a public path directly is
// still checked even though it can never be evaluated as a module.
//
// BASE_URL is also written defensively - `import.meta.env?.BASE_URL ?? '/'` -
// by the data modules that hold a locale table, because those are imported as
// plain data by the node-run validators and tests, where import.meta.env does
// not exist (see src/pages/scenario01/teacherVideo.js,
// src/pages/arScan/heroLayout.js, src/data/scenario03Dialogues.js). That is
// the same expression with a default spliced in, so BASE_URL_EXPR accepts it
// too - otherwise extracting a table into a data module would make its files
// look unreachable and this rule would fire on a refactor that improved them.
const BASE_URL_EXPR = String.raw`\$\{import\.meta\.env\??\.?BASE_URL(?:\s*\?\?\s*['"][^'"]*['"])?\}`;

function collectLiteralReferences(consumer, rawSource) {
  const source = stripComments(rawSource);

  const prefixes = new Map();
  for (const [, name, path] of source.matchAll(new RegExp(String.raw`const\s+(\w+)\s*=\s*\`${BASE_URL_EXPR}([^\`$]*)\``, 'g'))) {
    prefixes.set(name, path);
  }

  const record = (path) => {
    if (!isBinary(path)) return;
    if (!/^\/?(?:assets|icons)\//.test(path)) return;
    addReference(consumer, `public/${path.replace(/^\//, '')}`, 'runtime URL');
  };

  for (const [, path] of source.matchAll(new RegExp(String.raw`\`${BASE_URL_EXPR}([^\`$]+)\``, 'g'))) record(path);
  for (const [, name, suffix] of source.matchAll(/`\$\{(\w+)\}([^`$]+)`/g)) {
    if (prefixes.has(name)) record(prefixes.get(name) + suffix);
  }
  // CSS url() and HTML hrefs, which have no composition at all.
  for (const [, path] of source.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) record(path);
  for (const [, path] of source.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)) record(path);
}

for (const file of sourceFiles) {
  const source = await readFile(abs(file), 'utf8');
  collectLiteralReferences(file, source);

  for (const [, specifier] of stripComments(source).matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (!isBinary(specifier) || !specifier.startsWith('.')) continue;
    const target = resolvePath(dirname(abs(file)), specifier);
    if (!existsSync(target)) fail('RULE 1', `${file}: imports ${specifier}, which does not exist`);
    else addReference(file, rel(target), 'static import');
  }
}

// index.html and the web manifest reach public/icons/ by absolute URL.
for (const file of ['index.html', 'public/manifest.json']) {
  if (!existsSync(abs(file))) {
    fail('RULE 1', `${file}: missing`);
    continue;
  }
  const source = await readFile(abs(file), 'utf8');
  collectLiteralReferences(file, source);
  for (const [, path] of source.matchAll(/"(?:src|href)"\s*:\s*"([^"]+)"/g)) {
    const cleaned = path.replace(/^\.?\//, '');
    if (isBinary(cleaned)) addReference(file, `public/${cleaned}`, 'web manifest');
  }
}

// ---------------------------------------------------------------------------
// RULE 1 - every reference resolves, and every shipping binary is reachable
// ---------------------------------------------------------------------------

const referenced = new Set();
for (const { consumer, target, mechanism } of references) {
  referenced.add(target);
  if (!existsSync(abs(target))) {
    fail('RULE 1', `${consumer}: ${mechanism} points at ${target}, which does not exist`);
  }
}
for (const binary of shippingBinaries) {
  if (!referenced.has(binary)) {
    fail('RULE 1', `${binary}: no registry or consumer resolves this file - it ships but nothing can reach it`);
  }
}

// ---------------------------------------------------------------------------
// RULE 2 - no cross-scenario asset reference
// ---------------------------------------------------------------------------
//
// A scenario page, or a scenario's own bundled asset folder, may only reach its
// own scenario folder. Three things are legal for everyone and are not scenario
// property at all: shared/ (characters, ui), an App module's own assets/, and a
// shared registry, which exists precisely so no page has to name a scenario
// folder itself.
//
// An App module is not a scenario, so BlackPi resolving Scenario 04's product
// artwork is not a cross-scenario reference - it is the App that renders that
// storefront reading the artwork the storefront is made of.

for (const { consumer, target, mechanism } of references) {
  const owner = consumer.match(/^src\/(?:pages\/scenario|assets\/scenarios\/scenario-)(\d+)/)?.[1];
  if (!owner) continue;
  const assetScenario = target.match(/assets\/scenarios\/scenario-(\d+)\//)?.[1];
  if (assetScenario && assetScenario !== owner.padStart(2, '0')) {
    fail('RULE 2', `${consumer}: scenario ${owner} reads scenario ${assetScenario}'s asset ${target} (${mechanism})`);
  }
}

// ---------------------------------------------------------------------------
// RULE 3 - every shipped raster is WebP
// ---------------------------------------------------------------------------
//
// The one exception is the PWA/favicon set: manifest.json icons and
// apple-touch-icon have to be PNG. Design masters under asset-sources/ never
// ship and keep whatever format they were delivered in.

for (const binary of shippingBinaries) {
  if (!RASTER_EXTENSIONS.has(extname(binary).toLowerCase())) continue;
  if (binary.startsWith(`${PUBLIC_ICONS}/`)) continue;
  fail('RULE 3', `${binary}: shipped raster images must be WebP (only ${PUBLIC_ICONS}/ may stay PNG)`);
}

// ---------------------------------------------------------------------------
// RULE 7 - a scenario folder is split by kind, and images by purpose
// ---------------------------------------------------------------------------
//
// public/assets/scenarios/scenario-0N/<kind>/... where kind is images, videos
// or audio - and an image sits one level deeper still, in a folder naming what
// it is for (results/, products/, chat/). That second level is what keeps a
// scenario folder readable as it grows: Scenario 04 carries 26 product photos
// and 2 ending mascots, and flat they were one undifferentiated pile.
//
// This is a layout rule about the public scenario root only. Bundled scenario
// assets under src/assets/ are reached by glob on a fixed filename, not by
// browsing, and keep their own shape.

const SCENARIO_ASSET_KINDS = new Set(['images', 'videos', 'audio']);

for (const binary of shippingBinaries) {
  const parts = binary.match(/^public\/assets\/scenarios\/scenario-\d+\/(.+)$/)?.[1]?.split('/');
  if (!parts) continue;
  const [kind, ...rest] = parts;
  if (rest.length === 0 || !SCENARIO_ASSET_KINDS.has(kind)) {
    fail('RULE 7', `${binary}: a scenario asset belongs under ${[...SCENARIO_ASSET_KINDS].join('/, ')}/, not loose in the scenario folder`);
  } else if (kind === 'images' && rest.length < 2) {
    fail('RULE 7', `${binary}: a scenario image belongs in a folder naming what it is for (images/results/, images/products/, images/chat/)`);
  }
}

// ---------------------------------------------------------------------------
// RULE 4 - source never references build output
// ---------------------------------------------------------------------------
//
// The repo root's assets/, icons/, data/, index.html, manifest.json and sw.js
// are the published GitHub Pages build, rewritten by the deploy workflow on
// every push. They stay tracked, and nothing under webapp/ may reach them:
// referencing them would make build output a source of truth. webapp/dist/ is
// the same mistake locally, and a Vite fingerprinted filename can only have
// been copied out of one of the two.
//
// One path above webapp/ is source and is therefore allowed: release/versions.json,
// the single place any CIBAR version number may be edited (docs/RELEASE_VERSIONING.md).
// It is hand-maintained, reviewed in the PR that bumps it, and read by
// android/app/build.gradle as well - the whole point of it is that the Shell and the Web
// Bundle read one file rather than each keeping their own copy. Exempted by exact path, so
// this stays a hole for that one file and not a way back into the deployed root tree.

const VERSION_SOURCE_OF_TRUTH = '../release/versions.json';
const VERSION_SOURCE_OF_TRUTH_PATH = resolvePath(webapp, VERSION_SOURCE_OF_TRUTH);

const declaredDependencies = await (async () => {
  const manifest = JSON.parse(await readFile(abs('package.json'), 'utf8'));
  return new Set(Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }));
})();

// 'mind-ar/src/...' or '@tensorflow/tfjs' - a bare specifier whose package is
// installed. Anything starting with '.' or '/' is a path into this repo and is
// never exempt.
function isDependencySpecifier(path) {
  if (path.startsWith('.') || path.startsWith('/')) return false;
  const segments = path.split('/');
  const name = path.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
  return declaredDependencies.has(name);
}

for (const { consumer, target } of references) {
  const absolute = abs(target);
  if (absolute === VERSION_SOURCE_OF_TRUTH_PATH) continue;
  if (!absolute.startsWith(`${webapp}/`)) {
    fail('RULE 4', `${consumer}: references ${relative(repoRoot, absolute)}, outside webapp/ - the repo root tree is deployed build output, not source`);
  }
}

for (const file of [...sourceFiles, 'index.html', 'vite.config.js']) {
  if (!existsSync(abs(file))) continue;
  const source = stripComments(await readFile(abs(file), 'utf8'));
  const depth = file.split('/').length - 1;
  for (const [, specifier] of source.matchAll(/['"`](\.\.\/[^'"`\s]*)['"`]/g)) {
    if (specifier === VERSION_SOURCE_OF_TRUTH) continue;
    if ((specifier.match(/\.\.\//g) ?? []).length > depth) {
      fail('RULE 4', `${file}: '${specifier}' climbs out of webapp/ into the deployed build tree`);
    }
  }
  // Anchored to a path, not a bare package specifier: `mind-ar/dist/...` is a
  // dependency's published entry point, not this repo's build output.
  for (const [, path] of source.matchAll(/['"`]((?:\.{0,2}\/)[^'"`\s]*\bdist\/[^'"`\s]*)['"`]/g)) {
    fail('RULE 4', `${file}: references '${path}' - webapp/dist/ is build output`);
  }
  for (const [, path] of source.matchAll(/['"`]([^'"`\s]*-[A-Za-z0-9_-]{8}\.(?:js|css))['"`]/g)) {
    // A deep import into a dependency is not this repo's build output, and a
    // published package is free to name a file anything - `mind-ar`'s
    // `crop-detector.js` reads as `-detector.js`, an eight-character suffix
    // after a dash, which is exactly the shape of a Vite fingerprint. Only
    // specifiers naming an installed dependency are exempted, so a real
    // fingerprinted path (always relative or root-absolute) still fails.
    if (isDependencySpecifier(path)) continue;
    fail('RULE 4', `${file}: references '${path}', a Vite hashed output filename`);
  }
}

// ---------------------------------------------------------------------------
// RULE 5 - one binary, one tracked source copy
// ---------------------------------------------------------------------------
//
// Compared by content, not by name: two files with the same name can differ,
// and the same bytes can be tracked under two unrelated names. A second copy of
// the same bytes across the shipping roots means two owners for one asset.

const digests = new Map();
for (const binary of shippingBinaries) {
  const digest = createHash('sha256').update(await readFile(abs(binary))).digest('hex');
  if (!digests.has(digest)) digests.set(digest, []);
  digests.get(digest).push(binary);
}
for (const copies of digests.values()) {
  if (copies.length > 1) fail('RULE 5', `identical bytes tracked in ${copies.length} places: ${copies.join(', ')}`);
}

// ---------------------------------------------------------------------------
// RULE 6 - asset-sources/ holds masters, and only masters
// ---------------------------------------------------------------------------
//
// A master and the file derived from it are different bytes by design (format,
// size, alpha), so RULE 5 deliberately does not compare across this boundary.
// What matters here is the other direction: nothing that ships may reach in.

for (const { consumer, target } of references) {
  if (target.startsWith(`${ASSET_SOURCES}/`)) {
    fail('RULE 6', `${consumer}: references the design master ${target} - masters are never served or bundled`);
  }
}
for (const file of sourceFiles) {
  const source = stripComments(await readFile(abs(file), 'utf8'));
  for (const [, specifier] of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
    if (specifier.includes('asset-sources/')) fail('RULE 6', `${file}: imports from asset-sources/ - masters are never bundled`);
  }
}
if (masterBinaries.length === 0) fail('RULE 6', 'asset-sources/ is empty - the design masters are no longer tracked');

// ---------------------------------------------------------------------------

if (violations.length) {
  console.error(violations.sort().join('\n'));
  process.exit(1);
}

console.log([
  'Asset architecture OK',
  `  ${shippingBinaries.length} shipping binaries, ${masterBinaries.length} design masters`,
  `  ${references.length} resolved references from ${new Set(references.map((reference) => reference.consumer)).size} consumers`,
  '  RULE 1 every reference resolves, every shipping binary is reachable',
  '  RULE 2 no cross-scenario asset reference',
  `  RULE 3 shipped rasters are WebP (${PUBLIC_ICONS}/ excepted)`,
  '  RULE 4 no reference to deployed build output or a hashed bundle name',
  '  RULE 5 no duplicate binary across the shipping roots (by content hash)',
  '  RULE 6 asset-sources/ masters are never served or bundled',
  '  RULE 7 a scenario folder is split by kind, and its images by purpose',
].join('\n'));
