#!/usr/bin/env node
/**
 * Proves that the web build about to be packaged into the offline APK needs nothing from the
 * network.
 *
 * Run by Gradle's `bundleOfflineWebAssets` task against the exact bytes it just staged into
 * app/src assets, so an offline APK cannot be produced from a build that reaches outside itself.
 * Also runnable by hand:
 *
 *   node webapp/scripts/audit-offline-web-assets.mjs webapp/dist
 *
 * WHY THIS EXISTS AS WELL AS THE MISSING INTERNET PERMISSION
 * The offline APK declares no android.permission.INTERNET, which makes an outbound socket
 * impossible at the kernel level - so a CDN reference could never actually load. That is the
 * guarantee; this is the diagnosis. Without it the symptom of a stray external reference is a
 * scenario that silently renders without its font, or an image that never appears, discovered by
 * somebody wearing the glasses in aeroplane mode. With it, the build fails in CI naming the file
 * and the URL.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
export const DEFAULT_ALLOWLIST = join(HERE, 'offline-external-url-allowlist.json')

/**
 * The source of everything Vite copies verbatim. Compared against the built bundle below, so a
 * media file that was dropped into the repository and then failed to reach dist/ - a build run
 * against a stale cache, a copy that ran out of disk - fails here instead of on a phone.
 */
export const DEFAULT_PUBLIC_DIR = join(HERE, '..', 'public')

/** The path prefix the Vite build is compiled for (`base` in vite.config.js). */
export const BASE_PATH = '/CIBAR/'

/** Files whose bytes are text and therefore worth scanning for URLs. */
const TEXT_EXTENSIONS = new Set([
  '.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.json', '.map', '.svg', '.webmanifest',
  '.txt', '.md', '.xml',
])

/**
 * What the bundle must contain. Each entry is one thing a tester would find missing only by
 * walking the whole experience on a phone with no network - the run that costs an afternoon.
 */
const REQUIRED = [
  { what: 'the SPA document', match: (p) => p === 'index.html' },
  { what: 'the PWA manifest', match: (p) => p === 'manifest.json' },
  { what: 'application JavaScript', match: (p) => p.startsWith('assets/') && p.endsWith('.js') },
  { what: 'application CSS', match: (p) => p.startsWith('assets/') && p.endsWith('.css') },
  { what: 'the mind-ar image-target dataset (.mind)', match: (p) => p.endsWith('.mind') },
  // Scoped to assets/, where every scenario's own media lives. Kept scoped now that the
  // opening is no longer a film: public/media/ is a drop folder anything may be put in, and
  // a build that lost every scenario video must not be able to satisfy this rule on the
  // strength of something somebody dropped there.
  { what: 'scenario video (.mp4)', match: (p) => p.startsWith('assets/') && p.endsWith('.mp4') },
  { what: 'scenario audio (.mp3)', match: (p) => p.startsWith('assets/') && p.endsWith('.mp3') },
  { what: 'scenario imagery (.webp/.png)', match: (p) => p.endsWith('.webp') || p.endsWith('.png') },
]

/**
 * Positions in JavaScript where an absolute URL is unambiguously a network load rather than a
 * string somebody displays or links to. Assignment to `.href` is deliberately absent: it is how a
 * page builds an ordinary outbound <a>, which offline is simply a link nobody can follow, and
 * treating it as a fetch produces false failures for library attribution links. A dynamically
 * inserted <link> would still be caught by the origin allowlist below.
 */
const FETCH_PATTERNS = [
  [/\bfetch\s*\(\s*[`'"](https?:\/\/[^`'"]+)/g, 'fetch()'],
  [/\bimportScripts\s*\(\s*[`'"](https?:\/\/[^`'"]+)/g, 'importScripts()'],
  [/new\s+Worker\s*\(\s*[`'"](https?:\/\/[^`'"]+)/g, 'new Worker()'],
  [/new\s+EventSource\s*\(\s*[`'"](https?:\/\/[^`'"]+)/g, 'new EventSource()'],
  [/\bimport\s*\(\s*[`'"](https?:\/\/[^`'"]+)/g, 'dynamic import()'],
  [/\.open\s*\(\s*[`'"](?:GET|POST|PUT|DELETE|HEAD|PATCH)[`'"]\s*,\s*[`'"](https?:\/\/[^`'"]+)/gi,
    'XMLHttpRequest.open()'],
  [/\.src\s*=\s*[`'"](https?:\/\/[^`'"]+)/g, 'assignment to .src'],
  [/@import\s+(?:url\()?[`'"]?(https?:\/\/[^`'"()\s]+)/g, 'CSS @import'],
]

/** Every absolute http(s) URL in a blob of text, reduced to its origin. */
export function originsIn(text) {
  const found = new Map()
  for (const match of text.matchAll(/https?:\/\/[^\s"'`<>()\\[\]{},;]+/g)) {
    found.set(originOf(match[0]), (found.get(originOf(match[0])) ?? 0) + 1)
  }
  return found
}

/** `https://host.example/a/b?c` -> `https://host.example`. */
export function originOf(url) {
  const afterScheme = url.indexOf('://') + 3
  const end = url.indexOf('/', afterScheme)
  return end < 0 ? url : url.slice(0, end)
}

/**
 * Whether an origin is covered by the allowlist. Exact, except for entries written as a prefix
 * ending in `-`, which exist for URLs a page assembles around a generated value
 * (`https://case-verify-${caseNumber}.sim-example.tw`) and so have no fixed host.
 */
export function isAllowed(origin, allowedOrigins) {
  return allowedOrigins.some((allowed) =>
    origin === allowed || (allowed.endsWith('-') && origin.startsWith(allowed)))
}

/**
 * Every `src`/`href` an HTML document loads. Returns the raw attribute values, so the caller can
 * judge each one; a document that loads nothing returns an empty array rather than failing.
 */
export function documentReferences(html) {
  const refs = []
  for (const match of html.matchAll(
    /<(script|link|img|iframe|video|audio|source|embed)\b[^>]*?\s(?:src|href)\s*=\s*["']([^"']*)["']/gi)) {
    refs.push({ tag: match[1].toLowerCase(), url: match[2] })
  }
  return refs
}

/** Absolute `url(...)` targets in a stylesheet. */
export function styleSheetReferences(css) {
  const refs = []
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) refs.push(match[1])
  return refs
}

/**
 * Whether a URL a document loads is local to the bundle.
 *
 * Relative, fragment, data: and blob: URLs are all fine. An absolute path has to be under
 * {@link BASE_PATH}, because that is the only path the offline APK mounts the bundle at - a build
 * compiled with a different Vite `base` would 404 for every asset on the phone while looking
 * perfectly correct in the dist directory.
 */
export function isLocalReference(url) {
  const value = url.trim()
  if (value === '') return true
  if (value.startsWith('#') || value.startsWith('data:') || value.startsWith('blob:')) return true
  if (value.startsWith('//')) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false
  if (value.startsWith('/')) return value.startsWith(BASE_PATH)
  return true
}

function listFiles(root) {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile()) out.push(relative(root, full).split('\\').join('/'))
    }
  }
  walk(root)
  return out
}

export function readAllowlist(path = DEFAULT_ALLOWLIST) {
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  const origins = parsed.origins.map((entry) => entry.origin)
  return { origins, entries: parsed.origins }
}

/**
 * Audits one staged bundle.
 *
 * @returns {{problems: string[], stats: object}} problems is empty when the bundle is self
 *          contained; every entry names the file and the URL so it can be fixed without a hunt.
 */
export function auditBundle(root, allowlist = readAllowlist(), publicDir = DEFAULT_PUBLIC_DIR) {
  const problems = []
  const files = listFiles(root)
  const stats = { files: files.length, bytes: 0, scanned: 0, origins: new Map() }

  for (const requirement of REQUIRED) {
    if (!files.some((file) => requirement.match(file))) {
      problems.push(`bundle is missing ${requirement.what}`)
    }
  }

  problems.push(...auditMediaDropFolders(root, files, publicDir))

  for (const file of files) {
    stats.bytes += statSync(join(root, file)).size
    if (!TEXT_EXTENSIONS.has(extname(file).toLowerCase())) continue
    stats.scanned += 1
    const text = readFileSync(join(root, file), 'utf8')

    for (const [origin, count] of originsIn(text)) {
      stats.origins.set(origin, (stats.origins.get(origin) ?? 0) + count)
      if (!isAllowed(origin, allowlist.origins)) {
        problems.push(`${file}: references ${origin}, which is not in `
          + 'scripts/offline-external-url-allowlist.json. An offline APK cannot load it. Bundle '
          + 'the resource locally, or add the origin with a reason if it is never fetched.')
      }
    }

    for (const [pattern, how] of FETCH_PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        const origin = originOf(match[1])
        if (origin === 'https://appassets.androidplatform.net') continue
        problems.push(`${file}: loads ${match[1]} via ${how}. `
          + 'Offline builds have no network; this resource has to be part of the bundle.')
      }
    }

    if (file.endsWith('.html')) {
      for (const ref of documentReferences(text)) {
        if (!isLocalReference(ref.url)) {
          problems.push(`${file}: <${ref.tag}> loads ${ref.url}, which is not inside the bundle`)
        }
      }
    }
    if (file.endsWith('.css')) {
      for (const ref of styleSheetReferences(text)) {
        if (!isLocalReference(ref)) problems.push(`${file}: url(${ref}) is not inside the bundle`)
      }
    }
    if (file === 'manifest.json') {
      const manifest = JSON.parse(text)
      const refs = [manifest.start_url, ...(manifest.icons ?? []).map((icon) => icon.src)]
      for (const ref of refs) {
        if (ref && !isLocalReference(ref)) {
          problems.push(`manifest.json: ${ref} is not inside the bundle`)
        }
      }
    }
  }

  // The build has to be compiled for the path the APK mounts it at, or every asset 404s on the
  // phone while dist/ looks perfectly correct on disk.
  const index = files.includes('index.html')
    ? readFileSync(join(root, 'index.html'), 'utf8')
    : ''
  if (index && !documentReferences(index).some((ref) => ref.url.startsWith(`${BASE_PATH}assets/`))) {
    problems.push(`index.html loads nothing from ${BASE_PATH}assets/ - the webapp was built with `
      + `a different Vite base, and the offline APK serves it at ${BASE_PATH}`)
  }

  return { problems, stats }
}

/**
 * The media drop folders: everything a person is expected to add by putting a file in a directory
 * rather than by writing code.
 *
 * <p>Two things are checked, and each is a way the "drop the file in and it works" promise
 * silently stops holding:
 *
 * <ol>
 *   <li>every media file in the repository reached the bundle, at its full length. A video that
 *       failed to copy is invisible on disk and is a black screen on a phone in aeroplane mode;</li>
 *   <li>nothing under media/ is a zero-byte file, which is what a truncated copy or a `.gitkeep`
 *       mistaken for content looks like.</li>
 * </ol>
 *
 * <p>There is no longer a REQUIRED file in here. webapp/public/media/ held one thing - the opening
 * film - and the opening is now drawn by the page itself (src/pages/opening/), so the folder is
 * gone with it and this walks whatever a future drop folder holds rather than naming a filename.
 */
function auditMediaDropFolders(root, files, publicDir) {
  const problems = []

  if (publicDir && existsSync(publicDir)) {
    const mediaRoot = join(publicDir, 'media')
    if (existsSync(mediaRoot)) {
      for (const file of listFiles(mediaRoot)) {
        const bundled = `media/${file}`
        const source = join(mediaRoot, file)
        // .gitkeep and friends are repository bookkeeping, not content. Vite copies them into
        // dist/ like anything else under public/, but AGP does not package a file whose name
        // starts with a dot into assets/ - so demanding one here fails every APK build over a
        // zero-byte placeholder whose only job was to keep an empty folder in git. What the
        // folder actually needs carried is the media in it, which is what the rest of this
        // checks.
        if (basename(file).startsWith('.')) continue
        if (!files.includes(bundled)) {
          problems.push(`webapp/public/${bundled} is in the repository but not in the bundle - `
            + 'the build did not copy it, and it will be missing on the phone')
          continue
        }
        const expected = statSync(source).size
        const actual = statSync(join(root, bundled)).size
        if (expected !== actual) {
          problems.push(`${bundled}: ${actual} bytes in the bundle, ${expected} in the repository `
            + '- the copy was truncated')
        }
      }
    }
  }

  for (const file of files) {
    if (!file.startsWith('media/') || basename(file).startsWith('.')) continue
    if (statSync(join(root, file)).size === 0) {
      problems.push(`${file} is empty. A zero-byte media file plays as a broken element, which `
        + 'reads on a phone as "the video is missing" with nothing to point at.')
    }
  }

  return problems
}

function main(argv) {
  const root = argv[0]
  if (!root) {
    console.error('usage: audit-offline-web-assets.mjs <bundle-directory> [--allowlist <file>]')
    return 2
  }
  const flag = argv.indexOf('--allowlist')
  const allowlist = readAllowlist(flag < 0 ? DEFAULT_ALLOWLIST : argv[flag + 1])
  const { problems, stats } = auditBundle(resolve(root), allowlist)

  const megabytes = (stats.bytes / (1024 * 1024)).toFixed(1)
  console.log(`offline bundle: ${stats.files} files, ${megabytes} MiB, `
    + `${stats.scanned} text files scanned`)
  const origins = [...stats.origins.entries()].sort((a, b) => b[1] - a[1])
  for (const [origin, count] of origins) console.log(`  external origin: ${origin} (${count}x)`)

  if (problems.length === 0) {
    console.log('OK: the bundled CIBAR build needs nothing from the network')
    return 0
  }
  for (const problem of problems) console.error(`::error::offline audit: ${problem}`)
  console.error(`offline audit failed with ${problems.length} problem(s)`)
  return 1
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)))
}
