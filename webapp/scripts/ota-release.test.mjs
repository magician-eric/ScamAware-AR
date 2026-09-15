/**
 * The publish half of the OTA mechanism: version numbering, the deterministic archive, and the
 * four files a release consists of.
 *
 *   node --test webapp/scripts/ota-release.test.mjs
 *
 * The phone half - staging, verification, promotion at the next launch and rollback - is pinned
 * by the JVM tests under android/app/src/test/. The two meet at exactly two artefacts:
 * `latest.json` and `bundle.zip`, so those are what this file describes in full.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { buildOtaRelease, collectBundleFiles, MANIFEST_ENTRY } from './ota-bundle.mjs'
import { writeZip } from './ota-zip.mjs'
import {
  baselineReleaseId, compareOtaVersions, compareSemantic, minShellVersion, otaVersionFor,
  productVersion, productVersionOf, UNKNOWN_VERSION, VERSION_PATTERN,
} from './ota-version.mjs'

const VERSION = '1.0.0-20260825.001'

function scratch() {
  return mkdtempSync(join(tmpdir(), 'cibar-ota-'))
}

/** A miniature but structurally complete CIBAR build. */
function fakeDist(root) {
  mkdirSync(join(root, 'assets/scenarios'), { recursive: true })
  writeFileSync(join(root, 'index.html'),
    '<!doctype html><script type="module" src="/CIBAR/assets/index-abc.js"></script>')
  writeFileSync(join(root, 'manifest.json'), '{"name":"反詐AR體驗"}')
  writeFileSync(join(root, 'assets/index-abc.js'), 'export const app = 1\n'.repeat(200))
  writeFileSync(join(root, 'assets/index-abc.css'), 'body{margin:0}\n'.repeat(200))
  writeFileSync(join(root, 'assets/targets.mind'), Buffer.alloc(4096, 7))
  writeFileSync(join(root, 'assets/scenarios/clip.mp4'), Buffer.alloc(65536, 3))
  writeFileSync(join(root, 'assets/scenarios/voice.mp3'), Buffer.alloc(8192, 5))
  writeFileSync(join(root, 'assets/scenarios/card.webp'), Buffer.alloc(2048, 9))
  return root
}

// ------------------------------------------------------------------ version numbering

test('a Release ID is the Web Bundle version, the release date and that day\'s sequence', () => {
  // docs/RELEASE_VERSIONING.md §3: MAJOR.MINOR.PATCH-YYYYMMDD.NNN. A dot before the sequence,
  // not a third dash - the dash separates the version from the release, and one separator that
  // means two things is a format nobody can split reliably.
  assert.equal(otaVersionFor('1.0.0', '2026-08-25', 1), '1.0.0-20260825.001')
  assert.equal(otaVersionFor('1.0.1', '2026-08-25', 2), '1.0.1-20260825.002')
  assert.equal(otaVersionFor('2.13.4', '2026-01-02', 17), '2.13.4-20260102.017')
  assert.match(otaVersionFor('1.0.0', '2026-08-25', 1), VERSION_PATTERN)
  // The sequence pads to three digits and keeps going past a thousand rather than wrapping.
  assert.equal(otaVersionFor('1.0.0', '20260825', 1004), '1.0.0-20260825.1004')
})

test('a calendar date is taken as written, not re-read through a timezone', () => {
  // ota-release.yml decides the date in Taipei time, because "which version went out on 9/1?"
  // is asked in Taipei. Passing it back through a UTC Date would move a late-evening release
  // to the previous day and rename a release nobody renamed.
  assert.equal(otaVersionFor('1.0.0', '2026-08-25', 1), '1.0.0-20260825.001')
  assert.equal(otaVersionFor('1.0.0', '20260825', 1), '1.0.0-20260825.001')
  // An instant still resolves by UTC, which is what a timestamp means.
  assert.equal(otaVersionFor('1.0.0', '2026-08-25T22:35:12+08:00', 1), '1.0.0-20260825.001')
})

test('the APK baseline is not a release and does not claim to be one', () => {
  // A Release ID is minted after the merge that produced the content, so the bundle built into
  // the APK from that same merge cannot carry one. It carries a zeroed date and sequence, which
  // orders below every real release of the same version...
  const baseline = baselineReleaseId()
  assert.match(baseline, VERSION_PATTERN)
  assert.equal(productVersionOf(baseline), productVersion())
  assert.equal(compareOtaVersions(baseline, otaVersionFor(productVersion(), '2026-08-25', 1)), -1)
  // ...and is equal on the semantic half, which is the comparison UpdateDecision actually makes.
  // That is what keeps a freshly installed phone from downloading the bytes it shipped with.
  assert.equal(compareSemantic(baseline, otaVersionFor(productVersion(), '2026-08-25', 1)), 0)
  // No git, no clock: two builds of one commit agree, on CI and on a laptop with a shallow clone.
  assert.equal(baselineReleaseId(), baseline)
})

test('versions order the way the phone orders them - numerically, field by field', () => {
  // The day's sequence.
  assert.equal(compareOtaVersions('1.0.0-20260825.009', '1.0.0-20260825.010'), -1)
  // The date outranks the sequence.
  assert.equal(compareOtaVersions('1.0.0-20260825.099', '1.0.0-20260826.001'), -1)
  // The product version outranks both - a 1.0.1 cut yesterday is newer than a 1.0.0 cut today.
  assert.equal(compareOtaVersions('1.0.1-20260824.001', '1.0.0-20260825.050'), 1)
  assert.equal(compareOtaVersions('1.0.10-20260825.001', '1.0.9-20260825.001'), 1)
  assert.equal(compareOtaVersions(VERSION, VERSION), 0)
})

test('a build with no readable version file is older than every published bundle', () => {
  assert.equal(compareOtaVersions(UNKNOWN_VERSION, '0.0.1-20200101.001'), -1)
  assert.match(UNKNOWN_VERSION, VERSION_PATTERN)
})

test('the version numbers are a file somebody edits, not something derived', () => {
  // Derived numbers cannot say whether a release is worth calling a new version. These are a
  // judgement, so they are written down in release/versions.json, reviewed, and read back here
  // in the shape the rest of the pipeline assumes. docs/RELEASE_VERSIONING.md §2.
  assert.match(productVersion(), /^\d+\.\d+\.\d+$/)
  assert.match(minShellVersion(), /^\d+\.\d+\.\d+$/)
})

test('the Shell version line and the Web Bundle version line are separate', () => {
  // §5: a web-only change raises webBundleVersion and must not touch shellVersion. Nothing here
  // asserts what they are - only that they are two fields, so one can move without the other.
  const raw = JSON.parse(readFileSync(new URL('../../release/versions.json', import.meta.url), 'utf8'))
  assert.match(raw.shellVersion, /^\d+\.\d+\.\d+$/)
  assert.match(raw.webBundleVersion, /^\d+\.\d+\.\d+$/)
  const [major, minor, patch] = raw.shellVersion.split('.').map(Number)
  assert.equal(raw.shellVersionCode, major * 10000 + minor * 100 + patch)
})

test('a version that is only a commit SHA is not a version', () => {
  // The product identifier a release note, a bug report and the diagnostics all quote has to be
  // the same string, and a SHA is a build fingerprint rather than a version anybody can order.
  assert.throws(() => compareOtaVersions('dd1cf51', VERSION), /not comparable/)
})

// ------------------------------------------------------------------ the archive

test('the archive is byte identical across runs, so one commit has one digest', () => {
  const data = Buffer.from('x'.repeat(1000))
  const first = writeZip([{ path: 'a.js', data }, { path: 'b/c.mp4', data }])
  const second = writeZip([{ path: 'b/c.mp4', data }, { path: 'a.js', data }])
  assert.equal(first.sha256, second.sha256)
  assert.equal(first.entries, 2)
})

test('an entry that could escape the bundle is refused at publish time', () => {
  const data = Buffer.from('x')
  assert.throws(() => writeZip([{ path: '../evil.js', data }]), /escape/)
  assert.throws(() => writeZip([{ path: '/etc/passwd', data }]), /escape/)
  assert.throws(() => writeZip([{ path: 'a.js', data }, { path: 'a.js', data }]), /duplicate/)
})

test('unzip(1) reads the archive, and what comes out is the build that went in', () => {
  const root = scratch()
  try {
    const dist = fakeDist(join(root, 'dist'))
    const out = join(root, 'release')
    buildOtaRelease({ distDir: dist, version: VERSION, commit: 'abc1234',
      bundleUrl: 'https://example.invalid/bundle.zip', outDir: out })

    execFileSync('unzip', ['-t', join(out, 'bundle.zip')], { stdio: 'ignore' })
    const unpacked = join(root, 'unpacked')
    execFileSync('unzip', ['-q', join(out, 'bundle.zip'), '-d', unpacked])

    for (const path of collectBundleFiles(dist)) {
      assert.deepEqual(readFileSync(join(unpacked, path)), readFileSync(join(dist, path)),
        `${path} did not survive the round trip`)
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

// ------------------------------------------------------------------ the release

test('a release is bundle.zip, manifest.json, sha256.txt and latest.json', () => {
  const root = scratch()
  try {
    const dist = fakeDist(join(root, 'dist'))
    const out = join(root, 'release')
    const result = buildOtaRelease({ distDir: dist, version: VERSION, commit: 'abc1234',
      bundleUrl: 'https://example.invalid/web-1.0.0-20260825.001/bundle.zip', outDir: out })

    const bundle = readFileSync(join(out, 'bundle.zip'))
    const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'))
    const sha256Txt = readFileSync(join(out, 'sha256.txt'), 'utf8')
    const latest = JSON.parse(readFileSync(join(out, 'latest.json'), 'utf8'))

    // The digest the phone checks is the digest of the file that will be uploaded.
    const digest = createHash('sha256').update(bundle).digest('hex')
    assert.equal(digest, result.sha256)
    assert.equal(latest.sha256, digest)
    assert.equal(sha256Txt.trim(), `${digest}  bundle.zip`)
    assert.equal(latest.sizeBytes, bundle.length)

    // latest.json is the only file the phone fetches on a routine check, so everything it needs
    // to decide has to be in it: which version, where to get it, what it must hash to, and
    // whether this shell is new enough to run it.
    assert.deepEqual(Object.keys(latest).sort(), [
      'entry', 'fileCount', 'gitCommit', 'minShellVersion', 'publishedAt', 'releaseDate',
      'releaseId', 'schema', 'sequence', 'sha256', 'sizeBytes', 'sourcePR', 'url', 'version',
    ])
    // releaseId is the whole thing; version is its semantic half, and the two must agree -
    // OtaLatest.java refuses a pointer where they do not.
    assert.equal(latest.releaseId, VERSION)
    assert.equal(latest.version, productVersionOf(VERSION))
    assert.equal(latest.releaseDate, '2026-08-25')
    assert.equal(latest.sequence, 1)
    assert.equal(latest.minShellVersion, minShellVersion())
    assert.match(latest.minShellVersion, /^\d+\.\d+\.\d+$/)
    assert.equal(latest.entry, 'index.html')
    assert.equal(latest.fileCount, manifest.fileCount)

    // Every file in the build is described, with its own digest - that is what proves an
    // extracted tree is whole rather than merely present.
    assert.equal(manifest.fileCount, collectBundleFiles(dist).length)
    for (const file of manifest.files) {
      const bytes = readFileSync(join(dist, file.path))
      assert.equal(file.bytes, bytes.length)
      assert.equal(file.sha256, createHash('sha256').update(bytes).digest('hex'))
    }
    assert.ok(manifest.files.some((file) => file.path === 'index.html'))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('the manifest travels inside the archive too, so the digest list cannot be swapped alone',
  () => {
    const root = scratch()
    try {
      const dist = fakeDist(join(root, 'dist'))
      const out = join(root, 'release')
      buildOtaRelease({ distDir: dist, version: VERSION, bundleUrl: 'https://x.invalid/b.zip',
        outDir: out })
      const unpacked = join(root, 'unpacked')
      execFileSync('unzip', ['-q', join(out, 'bundle.zip'), '-d', unpacked])
      const inside = JSON.parse(readFileSync(join(unpacked, MANIFEST_ENTRY), 'utf8'))
      const beside = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'))
      assert.deepEqual(inside, beside)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

test('a directory that is not a CIBAR build is refused rather than published', () => {
  const root = scratch()
  try {
    mkdirSync(join(root, 'dist'), { recursive: true })
    writeFileSync(join(root, 'dist/readme.txt'), 'not a build')
    assert.throws(() => buildOtaRelease({ distDir: join(root, 'dist'), version: VERSION,
      bundleUrl: 'https://x.invalid/b.zip', outDir: join(root, 'release') }), /index\.html/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a Release ID that is not the published format is refused', () => {
  const root = scratch()
  try {
    const dist = fakeDist(join(root, 'dist'))
    assert.throws(() => buildOtaRelease({ distDir: dist, version: 'v2', bundleUrl: 'https://x/b',
      outDir: join(root, 'release') }), /Release ID/)
    // The old three-dash shape is not the format either, and must not slip through.
    assert.throws(() => buildOtaRelease({ distDir: dist, version: '1.0.0-20260825-001',
      bundleUrl: 'https://x/b', outDir: join(root, 'release') }), /Release ID/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
