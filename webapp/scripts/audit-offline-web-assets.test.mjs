/**
 * The offline audit is the only automated thing standing between "somebody added a Google Font"
 * and a demo that renders wrong in aeroplane mode, so its own rules are worth pinning: what counts
 * as an external origin, what counts as a load rather than a mention, and what the bundle has to
 * contain before it can be called complete.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  auditBundle,
  documentReferences,
  isAllowed,
  isLocalReference,
  originOf,
  originsIn,
  readAllowlist,
  styleSheetReferences,
} from './audit-offline-web-assets.mjs'

const ALLOWLIST = readAllowlist()

/**
 * The audit, run against a synthetic bundle.
 *
 * `null` for the source directory on purpose: these fixtures are built in a temp directory and
 * have no webapp/public/ behind them, so the "everything in the repository reached the bundle"
 * comparison has nothing to compare against. It is exercised on its own, with its own fixture
 * pair, in the media drop-folder tests at the bottom of this file.
 */
const audit = (root, allowlist = ALLOWLIST) => auditBundle(root, allowlist, null)

/** A minimal bundle that passes, so each test can break exactly one thing. */
function makeBundle(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cibar-offline-'))
  const files = {
    'index.html': '<!doctype html><script type="module" src="/ScamAware-AR/assets/app-abc.js"></script>'
      + '<link rel="stylesheet" href="/ScamAware-AR/assets/app-abc.css">'
      + '<link rel="manifest" href="/ScamAware-AR/manifest.json">',
    'manifest.json': JSON.stringify({ start_url: './index.html', icons: [{ src: './icons/i.png' }] }),
    'assets/app-abc.js': 'export const hello = 1',
    'assets/app-abc.css': 'body{background:url(./bg.webp)}',
    'assets/shared/ar/image-targets.mind': 'binary-ish',
    'assets/v.mp4': 'binary-ish',
    'assets/a.mp3': 'binary-ish',
    'assets/i.webp': 'binary-ish',
    ...overrides,
  }
  for (const [path, body] of Object.entries(files)) {
    if (body === null) continue
    const full = join(root, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, body)
  }
  return root
}

test('a self-contained bundle passes', () => {
  const { problems } = audit(makeBundle(), ALLOWLIST)
  assert.deepEqual(problems, [])
})

test('an origin nobody has justified fails the build', () => {
  const { problems } = audit(makeBundle({
    'assets/app-abc.js': 'const font = "https://fonts.googleapis.com/css2?family=Noto"',
  }), ALLOWLIST)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /fonts\.googleapis\.com/)
  assert.match(problems[0], /allowlist/)
})

test('an allowlisted origin does not', () => {
  const { problems } = audit(makeBundle({
    'assets/app-abc.js': 'throw new Error("see https://react.dev/errors/1")',
  }), ALLOWLIST)
  assert.deepEqual(problems, [])
})

test('fetching an allowlisted origin still fails - being mentioned is not being loaded', () => {
  const { problems } = audit(makeBundle({
    'assets/app-abc.js': 'fetch("https://github.com/data.json")',
  }), ALLOWLIST)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /fetch\(\)/)
})

test('the app\'s own local origin may be fetched', () => {
  const { problems } = audit(makeBundle({
    'assets/app-abc.js':
      'fetch("https://appassets.androidplatform.net/ScamAware-AR/assets/shared/ar/image-targets.mind")',
  }), ALLOWLIST)
  assert.deepEqual(problems, [])
})

test('an external script tag fails even when its origin is allowlisted', () => {
  const { problems } = audit(makeBundle({
    'index.html': '<!doctype html><script src="https://github.com/x.js"></script>'
      + '<script type="module" src="/ScamAware-AR/assets/app-abc.js"></script>',
  }), ALLOWLIST)
  assert.ok(problems.some((problem) => /<script> loads https:\/\/github\.com/.test(problem)))
})

test('a stylesheet that pulls a remote image fails', () => {
  const { problems } = audit(makeBundle({
    'assets/app-abc.css': 'body{background:url(https://cdn.example.com/bg.png)}',
  }), ALLOWLIST)
  assert.ok(problems.some((problem) => /cdn\.example\.com/.test(problem)))
})

test('a build compiled for a different base is rejected', () => {
  const { problems } = audit(makeBundle({
    'index.html': '<!doctype html><script type="module" src="/assets/app-abc.js"></script>',
  }), ALLOWLIST)
  assert.ok(problems.some((problem) => /different Vite base/.test(problem)))
})

test('every piece the experience needs has to be there', () => {
  for (const [missing, expected] of [
    ['assets/shared/ar/image-targets.mind', /\.mind/],
    ['assets/v.mp4', /\.mp4/],
    ['assets/a.mp3', /\.mp3/],
    ['assets/app-abc.css', /CSS/],
    ['manifest.json', /manifest/],
  ]) {
    const { problems } = audit(makeBundle({ [missing]: null }), ALLOWLIST)
    assert.ok(problems.some((problem) => expected.test(problem)),
      `removing ${missing} should be reported, got: ${problems.join(' | ')}`)
  }
})

test('origins are reduced to scheme and host', () => {
  assert.equal(originOf('https://a.example/b/c?d=1#e'), 'https://a.example')
  assert.equal(originOf('http://a.example'), 'http://a.example')
})

test('a URL assembled around a generated value matches its prefix entry', () => {
  assert.ok(isAllowed('https://case-verify-ab12cd.sim-example.tw', ALLOWLIST.origins))
  assert.ok(!isAllowed('https://case-verify.evil.example', ALLOWLIST.origins))
})

test('a lookalike host does not inherit an allowlisted one', () => {
  assert.ok(!isAllowed('https://github.com.evil.example', ALLOWLIST.origins))
  assert.ok(isAllowed('https://github.com', ALLOWLIST.origins))
})

test('local references are the relative ones and the ones under the served base', () => {
  assert.ok(isLocalReference('./icons/i.png'))
  assert.ok(isLocalReference('assets/app.js'))
  assert.ok(isLocalReference('/ScamAware-AR/assets/app.js'))
  assert.ok(isLocalReference('#/ar-scan'))
  assert.ok(isLocalReference('data:image/png;base64,AAAA'))
  assert.ok(!isLocalReference('/assets/app.js'))
  assert.ok(!isLocalReference('//cdn.example.com/app.js'))
  assert.ok(!isLocalReference('https://cdn.example.com/app.js'))
})

test('document and stylesheet references are read out of real markup', () => {
  const refs = documentReferences('<link rel="icon" href="/ScamAware-AR/i.png"><img src="a.webp">')
  assert.deepEqual(refs, [
    { tag: 'link', url: '/ScamAware-AR/i.png' },
    { tag: 'img', url: 'a.webp' },
  ])
  assert.deepEqual(styleSheetReferences('a{background:url("x.webp")}b{background:url(y.png)}'),
    ['x.webp', 'y.png'])
})

test('counting is per occurrence so the report shows how widespread an origin is', () => {
  const origins = originsIn('https://a.example/1 https://a.example/2 https://b.example/')
  assert.equal(origins.get('https://a.example'), 2)
  assert.equal(origins.get('https://b.example'), 1)
})

test('the allowlist explains every entry it grants', () => {
  for (const entry of ALLOWLIST.entries) {
    assert.ok(entry.reason && entry.reason.length > 20,
      `${entry.origin} is allowlisted without a usable reason`)
  }
})

// ---------------------------------------------------------------------------------------------
// Media drop folders
//
// The opening film is added by putting a file in a folder, not by writing code, so the folder and
// the copy that carries it into the bundle are the whole mechanism. These are the three ways that
// mechanism stops working without anybody noticing until a phone is in aeroplane mode.
// ---------------------------------------------------------------------------------------------

/** A webapp/public/ stand-in, so the repository-versus-bundle comparison has two sides. */
function makePublic(files = {}) {
  const root = mkdtempSync(join(tmpdir(), 'cibar-public-'))
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, path)
    mkdirSync(join(full, '..'), { recursive: true })
    writeFileSync(full, body)
  }
  return root
}

test('a media drop file travels from the repository into the bundle', () => {
  const sting = 'MP4-ISH-BYTES'
  const source = makePublic({ 'media/stings/outro.mp4': sting })
  const { problems } = auditBundle(
    makeBundle({ 'media/stings/outro.mp4': sting }), ALLOWLIST, source)
  assert.deepEqual(problems, [])
})

test('media that is in the repository and not in the bundle fails the build', () => {
  // Exactly what a stale or interrupted copy looks like: the file is on disk in the repository,
  // dist/ looks fine, and the phone plays nothing.
  const source = makePublic({ 'media/stings/outro.mp4': 'MP4-ISH' })
  const { problems } = auditBundle(makeBundle(), ALLOWLIST, source)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /media\/stings\/outro\.mp4/)
  assert.match(problems[0], /not in the bundle/)
})

test('a media file that copied short fails the build', () => {
  const source = makePublic({ 'media/stings/outro.mp4': 'MP4-ISH-BYTES' })
  const { problems } = auditBundle(
    makeBundle({ 'media/stings/outro.mp4': 'MP4' }), ALLOWLIST, source)
  assert.equal(problems.length, 1)
  assert.match(problems[0], /truncated/)
})

test('an empty media file is a failure, not a file', () => {
  const { problems } = audit(makeBundle({ 'media/stings/outro.mp4': '' }))
  assert.equal(problems.length, 1)
  assert.match(problems[0], /empty/)
})

test('a .gitkeep in the repository is not expected in the bundle', () => {
  // AGP does not package a file whose name starts with a dot into an APK's assets. Vite copies
  // it into dist/ like anything else under public/, so the repository has one and the APK does
  // not - and demanding it here failed every APK build over a zero-byte placeholder whose only
  // job was to keep an empty folder in git.
  const source = makePublic({ 'media/stings/.gitkeep': '' })
  const { problems } = auditBundle(makeBundle(), ALLOWLIST, source)
  assert.deepEqual(problems, [])
})
