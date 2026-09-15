#!/usr/bin/env node
/**
 * Command line front end for ota-bundle.mjs.
 *
 * Two callers, two modes:
 *
 *   full release (.github/workflows/deploy-pages.yml)
 *     node webapp/scripts/build-ota-release.mjs \
 *       --dist webapp/dist --out ota-release \
 *       --bundle-url https://github.com/<repo>/releases/download/web-<version>/bundle.zip
 *     writes bundle.zip / manifest.json / sha256.txt / latest.json.
 *
 *   manifest only (android/app/build.gradle, for the baseline packaged into the APK)
 *     node webapp/scripts/build-ota-release.mjs --dist webapp/dist --manifest-only <file>
 *     writes just the manifest, which is what the shell verifies its built-in baseline against.
 *
 * A Release ID is minted by CI at publish time and passed in with --version. Without one, this
 * produces the APK's baseline identity - the Web Bundle version with a zeroed date and sequence -
 * which the phone compares on its semantic half, so a freshly installed device recognises the
 * published bundle as the content it already shipped with and downloads nothing.
 *
 * Version rules: docs/RELEASE_VERSIONING.md. Read it before any build, release or OTA publish.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import {
  DEFAULT_MIN_SHELL_VERSION, buildManifest, buildOtaRelease, collectBundleFiles, sha256Of,
} from './ota-bundle.mjs'
import { baselineReleaseId, commitInfo } from './ota-version.mjs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) throw new Error(`build-ota-release: unexpected argument ${key}`)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) throw new Error(`build-ota-release: ${key} needs a value`)
    args[key.slice(2)] = value
    i += 1
  }
  return args
}

const args = parseArgs(process.argv.slice(2))
const distDir = resolve(args.dist ?? 'webapp/dist')
const revision = args.commit ?? 'HEAD'
const info = commitInfo(revision)
// A Release ID is minted by .github/workflows/ota-release.yml and passed in with --version.
// Without one this is the APK's baseline, which is not a release and says so: the same Web Bundle
// version with a zeroed date and sequence.
const version = args.version ?? baselineReleaseId()
const commit = info?.sha ?? (args.commit ?? '')
const minShellVersion = args['min-shell-version'] ?? DEFAULT_MIN_SHELL_VERSION

if (args['manifest-only']) {
  const files = collectBundleFiles(distDir).map((path) => {
    const data = readFileSync(join(distDir, path))
    return { path, bytes: data.length, sha256: sha256Of(data) }
  })
  const manifest = buildManifest({ version, commit, files, minShellVersion })
  const target = resolve(args['manifest-only'])
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`)
  process.stdout.write(`${version}\n`)
} else {
  if (!args['bundle-url']) throw new Error('build-ota-release: --bundle-url is required')
  const result = buildOtaRelease({
    distDir,
    version,
    commit,
    minShellVersion,
    bundleUrl: args['bundle-url'],
    outDir: resolve(args.out ?? 'ota-release'),
    publishedAt: args['published-at'] ?? info?.committedAt ?? '',
    sourcePR: args['source-pr'] ? Number.parseInt(args['source-pr'], 10) : null,
  })
  process.stderr.write(
    `OTA ${version}: ${result.manifest.fileCount} files, `
    + `${(result.sizeBytes / 1048576).toFixed(1)} MiB, sha256 ${result.sha256}\n`,
  )
  process.stdout.write(`${version}\n`)
}
