#!/usr/bin/env node
/**
 * Turns a finished `webapp/dist` into one OTA release: `bundle.zip`, `manifest.json`,
 * `sha256.txt` and `latest.json`.
 *
 * The four files are what the phone's updater reads, in that order, and each one exists to close
 * a specific way a partial update could reach a wearer:
 *
 *   bundle.zip    one archive, so a release is downloaded whole or not at all. There is no state
 *                 in which index.html is new and the videos are old.
 *   sha256.txt    the digest of that archive, computed here and re-computed on the phone. A
 *                 truncated download, a proxy that injected a captive-portal page, or a corrupted
 *                 write all fail this and the staged copy is deleted.
 *   manifest.json the digest of every file *inside* the archive, checked after extraction. This
 *                 is what proves the extracted tree is complete: a zip can be intact and still
 *                 unpack short if the device runs out of storage half way.
 *   latest.json   the pointer, and the only file the phone fetches on a routine check. It is
 *                 published LAST, after the bundle is uploaded and proven downloadable - see
 *                 .github/workflows/deploy-pages.yml. A pointer written before its bundle exists
 *                 is a phone downloading a 404.
 *
 * Nothing here reads the clock: see ota-zip.mjs. Two publishes of one commit produce byte
 * identical archives, so the phone that already has that version never fetches it again.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join, posix, relative, resolve, sep } from 'node:path'

import { writeZip } from './ota-zip.mjs'
import {
  minShellVersion as declaredMinShellVersion, productVersionOf, VERSION_PATTERN,
  SEMANTIC_PATTERN,
} from './ota-version.mjs'

/** The schema number both sides agree on. Bumping it is a shell change - see ShellVersion.java. */
export const OTA_SCHEMA = 1

/** The document the shell loads. Also what BundleRequirements insists on finding. */
export const ENTRY = 'index.html'

/** The name the manifest travels under inside the archive. */
export const MANIFEST_ENTRY = 'cibar-bundle-manifest.json'

/**
 * The lowest APK Shell a bundle needs, as `MAJOR.MINOR.PATCH`. Read from release/versions.json,
 * which is the one file a version number may be edited in; raise it there in the release whose
 * web build depends on a native bridge older shells do not have. A phone whose SHELL_VERSION is
 * below this refuses the download and keeps running what it has, rather than installing a bundle
 * that would come up without a camera. See SemanticVersion.java and UpdateDecision.java.
 */
export const DEFAULT_MIN_SHELL_VERSION = declaredMinShellVersion()

/** Files that never belong in a bundle, whatever the build happens to leave behind. */
const EXCLUDED = new Set(['.DS_Store', 'Thumbs.db'])

/** Every file under a directory, as bundle-relative POSIX paths, sorted. */
export function collectBundleFiles(distDir) {
  const root = resolve(distDir)
  const out = []
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (EXCLUDED.has(name)) continue
      const full = join(dir, name)
      const info = statSync(full)
      if (info.isDirectory()) walk(full)
      else if (info.isFile()) out.push(relative(root, full).split(sep).join(posix.sep))
    }
  }
  walk(root)
  return out.sort()
}

export function sha256Of(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

/** `2026-08-25` out of `1.0.0-20260825.001` - the form latest.json carries. */
function releaseDateOf(version) {
  const compact = /-(\d{8})\./.exec(String(version))[1]
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6)}`
}

/** `1` out of `1.0.0-20260825.001`. */
function sequenceOf(version) {
  return Number.parseInt(/\.(\d+)$/.exec(String(version))[1], 10)
}

/**
 * The manifest for a set of files.
 *
 * `files` carries a digest per entry rather than one digest for the tree. A single tree digest
 * would say "something is wrong" and nothing else; a per-file digest names the file, which is the
 * difference between a diagnosable OTA failure and a phone that just refuses to update.
 */
export function buildManifest({ version, commit, files, minShellVersion = DEFAULT_MIN_SHELL_VERSION }) {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(
      `ota-bundle: ${version} is not a MAJOR.MINOR.PATCH-YYYYMMDD.NNN Release ID`)
  }
  if (!SEMANTIC_PATTERN.test(String(minShellVersion))) {
    throw new Error(`ota-bundle: minShellVersion ${minShellVersion} is not MAJOR.MINOR.PATCH`)
  }
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  return {
    schema: OTA_SCHEMA,
    version,
    commit: commit ?? '',
    entry: ENTRY,
    minShellVersion,
    fileCount: files.length,
    totalBytes,
    files: files.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
  }
}

/**
 * Builds the whole release into `outDir` and returns what the workflow needs to publish it.
 *
 * @param {object} options
 * @param {string} options.distDir      the finished Vite build.
 * @param {string} options.version      the Release ID - MAJOR.MINOR.PATCH-YYYYMMDD.NNN.
 * @param {string} options.commit       the commit the build came from, for diagnostics.
 * @param {string} options.bundleUrl    where bundle.zip will be reachable once uploaded.
 * @param {string} options.outDir       where the four files are written.
 * @param {string} [options.publishedAt] ISO timestamp recorded in latest.json.
 */
export function buildOtaRelease({
  distDir, version, commit = '', bundleUrl, outDir,
  minShellVersion = DEFAULT_MIN_SHELL_VERSION, publishedAt = '', sourcePR = null,
}) {
  const root = resolve(distDir)
  const paths = collectBundleFiles(root)
  if (!paths.includes(ENTRY)) {
    throw new Error(`ota-bundle: ${root} has no ${ENTRY}; that is not a CIBAR build`)
  }

  const files = paths.map((path) => {
    const data = readFileSync(join(root, path))
    return { path, data, bytes: data.length, sha256: sha256Of(data) }
  })

  const manifest = buildManifest({ version, commit, files, minShellVersion })
  const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`

  // The manifest travels inside the archive as well as beside it, so the bundle digest covers the
  // list of digests too. A manifest that could be swapped independently of the bundle it
  // describes would let a rewritten list of hashes validate the wrong tree.
  const zip = writeZip([
    ...files.map(({ path, data }) => ({ path, data })),
    { path: MANIFEST_ENTRY, data: Buffer.from(manifestJson, 'utf8') },
  ])

  // The published pointer, field for field as .github/workflows/ota-release.yml writes it and as
  // OtaLatest.java reads it. `releaseId` is the whole thing; `version` is its semantic half,
  // repeated so a release note and a diagnostics line can quote the same string without parsing.
  const latest = {
    schema: OTA_SCHEMA,
    releaseId: version,
    version: productVersionOf(version),
    releaseDate: releaseDateOf(version),
    sequence: sequenceOf(version),
    gitCommit: commit,
    sourcePR: sourcePR,
    sha256: zip.sha256,
    sizeBytes: zip.buffer.length,
    minShellVersion,
    url: bundleUrl,
    entry: ENTRY,
    fileCount: manifest.fileCount,
    publishedAt,
  }

  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'bundle.zip'), zip.buffer)
  writeFileSync(join(outDir, 'manifest.json'), manifestJson)
  writeFileSync(join(outDir, 'sha256.txt'), `${zip.sha256}  bundle.zip\n`)
  writeFileSync(join(outDir, 'latest.json'), `${JSON.stringify(latest, null, 2)}\n`)

  return { manifest, latest, sha256: zip.sha256, sizeBytes: zip.buffer.length, outDir }
}
