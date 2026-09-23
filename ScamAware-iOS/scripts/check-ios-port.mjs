#!/usr/bin/env node
/**
 * Static checks for the ScamAware-iOS port. Needs Node only (runs on Windows, Linux, Codemagic).
 *
 *   node scripts/check-ios-port.mjs
 *
 * What it proves, without an iPhone:
 *   1. independence   nothing here reaches into the Android project (../webapp, ../android,
 *                     ../release) - the directory builds on its own;
 *   2. removed        no 佐臻/JJSDK glasses camera, ToF gesture, gesture tutorial, OTA updater
 *                     or scan-diagnostics overlay code is left in the web app or the Swift shell;
 *   3. kept           five scenarios reachable from both the AR scan and the manual menu, three
 *                     languages, camera + location permission strings, touch-only hint copy;
 *   4. bundle         (if web/dist exists) the MindAR dataset, hero art for each language,
 *                     video and audio are all in the offline bundle.
 *
 * It does NOT prove that anything works on a device - see docs/VERIFICATION.md.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []
const passed = []
const check = (ok, label, detail = '') => {
  if (ok) passed.push(label)
  else problems.push(detail ? `${label}: ${detail}` : label)
}
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

function listFiles(dir, { skip = [] } = {}) {
  const out = []
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      const rel = relative(ROOT, full).split('\\').join('/')
      if (skip.some((s) => rel === s || rel.startsWith(`${s}/`))) continue
      if (entry.isDirectory()) walk(full)
      else out.push(rel)
    }
  }
  walk(join(ROOT, dir))
  return out
}

/** Source text with // and /* *\/ comments removed, so explanatory comments do not trip checks. */
function code(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

// ---------------------------------------------------------------- 1. independence
const SKIP = ['web/node_modules', 'web/dist', 'ios/www', 'ScamAwareIOS.xcodeproj', 'build', 'dist', 'docs/image-targets']
const textFiles = listFiles('.', { skip: SKIP })
  .filter((p) => /\.(m?js|jsx|json|ya?ml|sh|swift|plist|xcconfig|html|css)$/.test(p))
  .filter((p) => !p.endsWith('package-lock.json'))
const OUTSIDE = /(?:\.\.\/)+(?:webapp|android|release)\/|release\/versions\.json/
for (const file of textFiles) {
  const hit = code(read(file)).match(OUTSIDE)
  check(!hit, `independent: ${file}`, `references the Android project (${hit?.[0]})`)
}

const version = JSON.parse(read('version.json'))
check(/^\d+\.\d+\.\d+$/.test(version.marketingVersion), 'version.json marketingVersion is MAJOR.MINOR.PATCH')
check(version.bundleId && version.bundleId !== 'com.bigxreality.jorjinverifier',
  'iOS bundle ID is its own (not the Android applicationId)', version.bundleId)

// ---------------------------------------------------------------- 2. removed
const webSrc = listFiles('web/src').filter((p) => /\.(m?js|jsx)$/.test(p))
const FORBIDDEN_CODE = [
  '__jorjinCamera', 'JorjinGesture', 'installJorjinGestureBridge', 'jorjinGestureAdapter',
  'NativeGestureBridge', 'ARGestureDebugOverlay', 'GestureTutorial', 'keyboardGestureAdapter',
  '__cibarOtaControl', '__cibarOtaStatus', '__cibarShell', 'nativeOtaControls',
  'ArScanDiagnosticsOverlay', 'StaffVersionPanel', 'serviceWorker',
]
for (const file of webSrc) {
  const body = code(read(file))
  for (const word of FORBIDDEN_CODE) {
    check(!body.includes(word), `removed: ${word} not used in ${file}`, 'still referenced')
  }
}
for (const dir of ['pages/gestureTutorial', 'components/native', 'components/debug', 'lib/ota',
  'lib/arInteraction/native', 'lib/arInteraction/debug']) {
  check(!existsSync(join(ROOT, 'web/src', dir)), `removed: web/src/${dir}/`)
}
check(!existsSync(join(ROOT, 'web/public/assets/shared/ui/gesture')), 'removed: gesture tutorial artwork')
check(!existsSync(join(ROOT, 'web/public/sw.js')), 'removed: service worker (not usable from app://)')

const swift = listFiles('ios').filter((p) => p.endsWith('.swift') || p.endsWith('.plist'))
for (const file of swift) {
  const body = read(file)
  check(!/jorjin|jjsdk|\btof\b|usbmanager|mjpeg/i.test(code(body)), `removed: no glasses SDK in ${file}`)
}

// ---------------------------------------------------------------- 3. kept
const routes = read('web/src/routes.jsx')
const SCENARIOS = ['/scenario01-investment', '/scenario02-romance', '/scenario03-police',
  '/scenario04-shopping', '/scenario05-atm']
for (const route of SCENARIOS) {
  check(routes.includes(`path: '${route.slice(1)}'`), `kept: route ${route}`)
}
for (const route of ['ar-scan', 'scenario-menu', 'language', 'staff-setup']) {
  check(routes.includes(`path: '${route}'`), `kept: route /${route}`)
}
check(/path: 'gesture-tutorial', element: <Navigate to="\/ar-scan"/.test(routes),
  'gesture tutorial route redirects to /ar-scan')
check(code(read('web/src/pages/LanguageSelect.jsx')).includes("navigate('/ar-scan')"),
  'language selection goes straight to the AR scan')

const targetMap = read('web/src/lib/ar/scenarioTargetMap.js')
const targetRoutes = [...targetMap.matchAll(/:\s*'(\/scenario0\d-[a-z]+)'/g)].map((m) => m[1])
check(SCENARIOS.every((r) => targetRoutes.includes(r)), 'MindAR: all five scenarios have an image target',
  targetRoutes.join(', '))
check((targetMap.match(/\{ id: 'scenario\d'/g) || []).length === 5, 'MindAR: five image targets')

const camera = code(read('web/src/lib/ar/cameraSource.js'))
check(camera.includes('getUserMedia') && camera.includes("'environment'"),
  'camera: iPhone rear camera via getUserMedia')
check(camera.includes("setAttribute('playsinline'"), 'camera: <video> is playsinline for iOS')
check(read('web/src/lib/ar/imageRecognition.js').includes("import('mind-ar/"), 'MindAR engine still used for recognition')

const scan = code(read('web/src/pages/arScan/ArScanHome.jsx'))
check(scan.includes('onClick={enterSelectedScenario}') && scan.includes('onClick={goToManualScenarioSelection}'),
  'touch: AR scan enter + manual selection are tap buttons')

const arI18n = read('web/src/pages/arScan/i18n.js')
for (const lang of ['zh', 'en', 'jp']) check(new RegExp(`\\b${lang}:\\s*\\{`).test(arI18n), `i18n: AR scan has ${lang}`)
const languageSelect = read('web/src/pages/LanguageSelect.jsx')
check(['zh', 'en', 'jp'].every((l) => languageSelect.includes(`code: '${l}'`)),
  'i18n: language screen offers 中文 / English / 日本語')
const hints = read('web/src/components/hints/interactionHintI18n.js')
const hintStrings = hints.slice(hints.indexOf('const STRINGS'))
check(!/揮手|手を振|Swipe/.test(hintStrings), 'touch: inactivity hints no longer mention hand waves')
check(/點選/.test(hintStrings) && /Tap/.test(hintStrings) && /タップ/.test(hintStrings),
  'touch: inactivity hints say "tap" in all three languages')

const plist = read('ios/ScamAwareIOS/Info.plist')
check(plist.includes('NSCameraUsageDescription'), 'Info.plist: camera permission text')
check(plist.includes('NSLocationWhenInUseUsageDescription'), 'Info.plist: location permission text')
check(!plist.includes('NSMicrophoneUsageDescription'), 'Info.plist: no microphone permission requested')
for (const l of ['zh-Hant', 'en', 'ja']) {
  check(existsSync(join(ROOT, `ios/ScamAwareIOS/${l}.lproj/InfoPlist.strings`)), `Info.plist: ${l} permission text`)
}

const webview = read('ios/ScamAwareIOS/WebViewController.swift')
check(webview.includes('allowsInlineMediaPlayback = true'), 'WebView: inline video')
check(webview.includes('mediaTypesRequiringUserActionForPlayback = []'), 'WebView: videos/audio autoplay')
check(webview.includes('requestMediaCapturePermissionFor'), 'WebView: camera permission handler')
check(read('ios/ScamAwareIOS/AppDelegate.swift').includes('.playback'), 'audio plays with the silent switch on')
check(read('ios/ScamAwareIOS/BundleSchemeHandler.swift').includes('Content-Range'), 'video: byte-range responses')

// ---------------------------------------------------------------- 4. bundle (optional)
const dist = join(ROOT, 'web/dist')
if (existsSync(dist)) {
  const files = listFiles('web/dist')
  const has = (pred) => files.some(pred)
  check(files.includes('web/dist/assets/shared/ar/image-targets.mind'), 'bundle: MindAR dataset')
  for (const l of ['zh', 'en', 'jp']) {
    check(files.includes(`web/dist/assets/shared/ui/ar-scan-hero-${l}.webp`), `bundle: AR scan artwork (${l})`)
  }
  for (let i = 1; i <= 5; i += 1) {
    check(has((p) => p.startsWith(`web/dist/assets/scenarios/scenario-0${i}/`)), `bundle: scenario-0${i} assets`)
  }
  const mp4 = files.filter((p) => p.endsWith('.mp4')).length
  const mp3 = files.filter((p) => p.endsWith('.mp3')).length
  check(mp4 > 0, `bundle: ${mp4} video file(s)`)
  check(mp3 > 0, `bundle: ${mp3} audio file(s)`)
  check(!has((p) => p.includes('/ui/gesture/')), 'bundle: no gesture tutorial artwork')
  const zeroBytes = files.filter((p) => statSync(join(ROOT, p)).size === 0 && !p.endsWith('.gitkeep'))
  check(zeroBytes.length === 0, 'bundle: no empty files', zeroBytes.join(', '))
} else {
  console.log('(web/dist not built yet - bundle checks skipped; run scripts/build-web.sh)')
}

// ---------------------------------------------------------------- report
console.log(`ScamAware-iOS port checks: ${passed.length} passed, ${problems.length} failed`)
for (const p of problems) console.error(`  FAIL ${p}`)
if (problems.length) process.exit(1)
console.log('OK (static checks only - this is not device testing)')
