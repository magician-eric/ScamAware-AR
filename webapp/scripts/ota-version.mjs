#!/usr/bin/env node
/**
 * Release IDs, on the publishing side.
 *
 * FORMAT
 *   MAJOR.MINOR.PATCH-YYYYMMDD.NNN        e.g. 1.0.0-20260825.001
 *
 *   MAJOR.MINOR.PATCH  the Web Bundle version, from release/versions.json. A person edits it, on
 *                      purpose, under the rules in docs/RELEASE_VERSIONING.md §6. Nothing derives
 *                      it, and `version-bump-check` refuses a PR that changes bundle content
 *                      without raising it.
 *   YYYYMMDD           the release date, in Taipei time - the day somebody would name if asked
 *                      when this went out.
 *   NNN                which release of that day this is, counting from 001.
 *
 * WHO MINTS ONE
 * Only .github/workflows/ota-release.yml, on a push to main, after the merge that produced the
 * content (RELEASE_VERSIONING.md §8). Nothing in this file invents a date or a sequence: the
 * workflow passes the finished Release ID in, and what lives here is the shape, the ordering and
 * the one derived value the APK build needs.
 *
 * THE APK'S BASELINE IS NOT A RELEASE
 * A Release ID is minted after the merge, and the APK is built from that same merge - so the
 * bundle packaged into the APK cannot carry one. It carries {@link baselineReleaseId} instead:
 * the same Web Bundle version with a zeroed date and sequence. That orders below every real
 * release of the same version, and BundleVersion.compareSemantic on the phone compares only the
 * MAJOR.MINOR.PATCH half - so a freshly installed phone recognises the published bundle as the
 * content it already shipped with and downloads nothing, while the first release that actually
 * raises the version supersedes it.
 *
 * USAGE
 *   node webapp/scripts/ota-version.mjs            # the APK baseline's Release ID
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * The one file in the repository a version number may be edited in - shellVersion,
 * shellVersionCode, webBundleVersion and minShellVersion. Read here, by android/app/build.gradle,
 * by webapp/vite.config.js and by both workflows.
 */
export const VERSION_FILE = join(HERE, '..', '..', 'release', 'versions.json')

/** What a build with no readable version file resolves to: below every real release. */
export const UNKNOWN_VERSION = '0.0.0-00000000.000'

/** `MAJOR.MINOR.PATCH-YYYYMMDD.NNN`, the only shape the phone accepts for a remote bundle. */
export const VERSION_PATTERN = /^\d+\.\d+\.\d+-\d{8}\.\d{3,}$/

/** `MAJOR.MINOR.PATCH` - a Shell version line, and the semantic half of a Release ID. */
export const SEMANTIC_PATTERN = /^\d+\.\d+\.\d+$/

/** Everything release/versions.json declares, validated. */
export function releaseVersions(versionFile = VERSION_FILE) {
  const raw = JSON.parse(readFileSync(versionFile, 'utf8'))
  for (const field of ['shellVersion', 'webBundleVersion', 'minShellVersion']) {
    const value = String(raw[field] ?? '')
    if (!SEMANTIC_PATTERN.test(value)) {
      throw new Error(`ota-version: ${versionFile} 的 ${field} 必須是 MAJOR.MINOR.PATCH，`
        + `實際是 ${value || '（沒有這個欄位）'}`)
    }
  }
  return {
    shellVersion: String(raw.shellVersion),
    shellVersionCode: Number(raw.shellVersionCode),
    webBundleVersion: String(raw.webBundleVersion),
    minShellVersion: String(raw.minShellVersion),
  }
}

/** The Web Bundle version somebody wrote down, e.g. `1.0.0`. */
export function productVersion(versionFile = VERSION_FILE) {
  return releaseVersions(versionFile).webBundleVersion
}

/** The lowest APK Shell this repository's bundles run on, e.g. `1.0.0`. */
export function minShellVersion(versionFile = VERSION_FILE) {
  return releaseVersions(versionFile).minShellVersion
}

/**
 * Assembles one Release ID.
 *
 * @param {string} product  `1.0.0` - the Web Bundle version.
 * @param {string|Date} releaseDate  `2026-08-25`, an ISO-8601 timestamp, or a Date.
 * @param {number} sequence which release of that day this is, from 1.
 */
export function otaVersionFor(product, releaseDate, sequence) {
  if (!SEMANTIC_PATTERN.test(String(product))) {
    throw new Error(`ota-version: not a Web Bundle version: ${product}`)
  }
  let compact
  if (typeof releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    // A calendar date, already in whatever zone the publisher decided. Taken at face value: it is
    // the day a person would name, and re-reading it through a Date would move it by a timezone.
    compact = releaseDate.replace(/-/g, '')
  } else if (typeof releaseDate === 'string' && /^\d{8}$/.test(releaseDate)) {
    compact = releaseDate
  } else {
    const when = releaseDate instanceof Date ? releaseDate : new Date(releaseDate)
    if (Number.isNaN(when.getTime())) {
      throw new Error(`ota-version: not a release date: ${String(releaseDate)}`)
    }
    compact = `${String(when.getUTCFullYear()).padStart(4, '0')}`
      + `${String(when.getUTCMonth() + 1).padStart(2, '0')}`
      + `${String(when.getUTCDate()).padStart(2, '0')}`
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`ota-version: not a release sequence: ${sequence}`)
  }
  return `${product}-${compact}.${String(sequence).padStart(3, '0')}`
}

/** The five numbers a Release ID is, in comparison order. */
export function versionFields(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)-(\d{8})\.(\d+)$/.exec(String(version))
  if (!match) throw new Error(`ota-version: not comparable: ${version}`)
  return match.slice(1).map((field) => Number.parseInt(field, 10))
}

/** The semantic half of a Release ID, e.g. `1.0.0` out of `1.0.0-20260825.001`. */
export function productVersionOf(version) {
  const [major, minor, patch] = versionFields(version)
  return `${major}.${minor}.${patch}`
}

/**
 * Orders two Release IDs the way the phone does.
 *
 * Field by field and numerically: Web Bundle version first, then the date, then the day's
 * sequence. Numerically and not lexicographically because `1.0.10` is newer than `1.0.9` as
 * numbers and older as text, and the direction of that one comparison decides whether a phone
 * upgrades or quietly installs an older experience over a newer one.
 */
export function compareOtaVersions(left, right) {
  const a = versionFields(left)
  const b = versionFields(right)
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

/** Compares only the semantic half - the same question BundleVersion.compareSemantic asks. */
export function compareSemantic(left, right) {
  const a = versionFields(left)
  const b = versionFields(right)
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1
  }
  return 0
}

/** The commit timestamp and SHA of a revision, or null when git cannot answer. */
export function commitInfo(revision = 'HEAD', cwd = process.cwd()) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI%n%H', revision], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    })
    const [committedAt, sha] = out.trim().split('\n')
    if (!committedAt || !sha) return null
    return { committedAt, sha, shortSha: sha.slice(0, 7) }
  } catch {
    return null
  }
}

/**
 * The Release ID the bundle packaged into an APK carries.
 *
 * Zeroed date and sequence, because this build is not a release and must not claim to be one. It
 * needs no git history, so a shallow clone and a developer's laptop produce the same value as CI -
 * and two APK builds of one commit therefore agree, which is the property that keeps a freshly
 * installed phone from downloading the bytes it already has.
 */
export function baselineReleaseId(versionFile = VERSION_FILE) {
  try {
    return `${productVersion(versionFile)}-00000000.000`
  } catch {
    return UNKNOWN_VERSION
  }
}

const invokedDirectly = process.argv[1]
  && import.meta.url === new URL(`file://${process.argv[1]}`).href
if (invokedDirectly) {
  process.stdout.write(`${baselineReleaseId()}\n`)
}
