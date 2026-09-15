// Where did /ar-scan actually stop?
//
// The bug this suite was written for reached the player as one sentence -
// "無法使用相機" - and that sentence is produced identically by seven
// different failures, in three different files, in two different languages,
// on a device with no DevTools attached. Nothing in the app could say which
// one had happened, so every report of it started from zero.
//
// So the chain now reports itself, layer by layer (src/lib/ar/scanDiagnostics.js),
// and this file pins the two properties that make those reports worth having:
//
//   1. Every layer says something. The descriptor, the camera choice, the
//      MJPEG request, the first frame, and - when the stream fails - what the
//      server actually answered. A layer that stays silent when it fails is
//      the failure this whole thing exists to remove.
//
//   2. Diagnosing changed nothing. `getUserMedia` is still never called once
//      the glasses have declared themselves, the descriptor still selects the
//      camera on its own, and no recording can alter which camera opens. The
//      phone's lens staying dark is the hard requirement; a diagnostic that
//      loosened it would be worse than the bug.
//
// Run: npm run test:ar-scan-diagnostics
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GlassesCameraUnavailableError,
  acquireCameraSource,
  looksLikeAndroidWebView,
  probeGlassesStream,
  resolveGlassesCameraDescriptor,
  __resetCameraSourceForTests,
} from '../src/lib/ar/cameraSource.js';
import {
  SCAN_DIAGNOSTICS_GLOBAL,
  SCAN_DIAGNOSTICS_STORAGE_KEY,
  SCAN_DIAGNOSTIC_STATUSES,
  SCAN_DIAGNOSTIC_STEPS,
  formatDiagnosticDetail,
  getScanDiagnostic,
  getScanDiagnostics,
  isScanDiagnosticsEnabled,
  recordScanDiagnostic,
  resetScanDiagnostics,
  subscribeScanDiagnostics,
} from '../src/lib/ar/scanDiagnostics.js';
import { createFakeCameraScope } from './stubs/fake-camera-scope.mjs';

const STREAM_URL = 'https://ericingptt.github.io/CIBAR/__jorjin-camera.mjpeg';
const GLASSES_CAMERA = Object.freeze({
  version: 1,
  available: true,
  streamUrl: STREAM_URL,
  width: 640,
  height: 480,
});
// Chrome's own WebView marker, which is the only thing that distinguishes the
// ar-app's browser from a desktop one.
const WEBVIEW_UA = 'Mozilla/5.0 (Linux; Android 11; SM-A315G Build/RP1A; wv) AppleWebKit/537.36';

function fresh() {
  __resetCameraSourceForTests();
  resetScanDiagnostics();
}

function stepsRecorded() {
  return getScanDiagnostics().map((record) => record.step);
}

// --- the recorder itself ------------------------------------------------------

test('each layer keeps its latest state, in the order the chain runs', () => {
  fresh();
  recordScanDiagnostic('firstFrame', 'fail', { reason: 'timeout' });
  recordScanDiagnostic('descriptor', 'ok', { available: true });
  recordScanDiagnostic('firstFrame', 'ok', { frameWidth: 640 });

  // Recorded out of order, reported in pipeline order: the first line that is
  // not OK is the layer that broke, and that only reads correctly in order.
  assert.deepEqual(stepsRecorded(), ['descriptor', 'firstFrame']);
  assert.equal(getScanDiagnostic('firstFrame').status, 'ok');
  assert.deepEqual(getScanDiagnostic('firstFrame').detail, { frameWidth: 640 });
});

test('every step the pipeline records is one the overlay knows how to order', () => {
  // A step name that is not in the list would be recorded, logged, and then
  // silently dropped from the overlay - the one failure mode a diagnostic
  // must not have.
  const declared = new Set(SCAN_DIAGNOSTIC_STEPS);
  assert.ok(declared.has('descriptor'));
  assert.ok(declared.has('cameraSource'));
  assert.ok(declared.has('mjpegRequest'));
  assert.ok(declared.has('firstFrame'));
  assert.ok(declared.has('streamProbe'));
  assert.ok(declared.has('imageRecognition'));
  assert.ok(declared.has('dataset'));
  assert.ok(declared.has('match'));
});

test('a broken subscriber cannot take the camera down with it', () => {
  fresh();
  const seen = [];
  const stop = subscribeScanDiagnostics(() => { throw new Error('overlay bug'); });
  const stopTwo = subscribeScanDiagnostics((record) => seen.push(record.step));

  assert.doesNotThrow(() => recordScanDiagnostic('descriptor', 'ok'));
  assert.deepEqual(seen, ['descriptor']);
  stop();
  stopTwo();
});

test('details read as flat key=value, which is what a logcat line has room for', () => {
  assert.equal(formatDiagnosticDetail({ status: 404, url: '/x' }), 'status=404 url=/x');
  assert.equal(formatDiagnosticDetail({ a: 1, b: undefined }), 'a=1');
  assert.equal(formatDiagnosticDetail(null), '');
  assert.equal(formatDiagnosticDetail('plain'), 'plain');
});

// --- who may see the overlay --------------------------------------------------

test('a player never sees the overlay', () => {
  const { scope } = createFakeCameraScope();
  assert.equal(isScanDiagnosticsEnabled({ DEV: false }, scope), false);
});

test('three ways to turn it on, and each is a deliberate act', () => {
  assert.equal(isScanDiagnosticsEnabled({ DEV: true }, createFakeCameraScope().scope), true);

  const inspected = createFakeCameraScope().scope;
  inspected[SCAN_DIAGNOSTICS_GLOBAL] = true;
  assert.equal(isScanDiagnosticsEnabled({ DEV: false }, inspected), true);

  const flagged = createFakeCameraScope({
    href: 'https://ericingptt.github.io/CIBAR/?diag=1',
  }).scope;
  assert.equal(isScanDiagnosticsEnabled({ DEV: false }, flagged), true);
});

test('the URL flag survives the walk to /ar-scan', () => {
  // It can only be given on the entry URL, and the player then picks a
  // language and finishes the gesture tutorial before /ar-scan exists. A flag
  // that only worked on the URL it was typed on would never be on by the time
  // it mattered.
  const fake = createFakeCameraScope({ href: 'https://ericingptt.github.io/CIBAR/?diag=1' });
  assert.equal(isScanDiagnosticsEnabled({ DEV: false }, fake.scope), true);
  assert.equal(fake.scope.sessionStorage.getItem(SCAN_DIAGNOSTICS_STORAGE_KEY), '1');

  fake.scope.location.href = 'https://ericingptt.github.io/CIBAR/#/ar-scan';
  assert.equal(isScanDiagnosticsEnabled({ DEV: false }, fake.scope), true);
});

test('the flag is found in either half of a HashRouter URL', () => {
  const afterHash = createFakeCameraScope({
    href: 'https://ericingptt.github.io/CIBAR/#/ar-scan?diag=1',
  }).scope;
  assert.equal(isScanDiagnosticsEnabled({ DEV: false }, afterHash), true);

  const lookalike = createFakeCameraScope({
    href: 'https://ericingptt.github.io/CIBAR/?diagnostics=1',
  }).scope;
  assert.equal(isScanDiagnosticsEnabled({ DEV: false }, lookalike), false);
});

// --- the descriptor layer -----------------------------------------------------

test('the descriptor is reported with everything needed to act on it', async () => {
  fresh();
  const { scope } = createFakeCameraScope({ jorjinCamera: GLASSES_CAMERA });

  const descriptor = await resolveGlassesCameraDescriptor(scope);

  assert.equal(descriptor, scope.__jorjinCamera);
  const record = getScanDiagnostic('descriptor');
  assert.equal(record.status, 'ok');
  assert.equal(record.detail.available, true);
  assert.equal(record.detail.streamUrl, STREAM_URL);
  assert.equal(record.detail.width, 640);
  assert.equal(record.detail.height, 480);
});

test('a missing descriptor and a descriptor that says no are told apart', async () => {
  fresh();
  const none = createFakeCameraScope().scope;
  assert.equal(await resolveGlassesCameraDescriptor(none), null);
  assert.equal(getScanDiagnostic('descriptor').detail.present, false);

  fresh();
  const declined = createFakeCameraScope({
    jorjinCamera: { version: 1, available: false, streamUrl: STREAM_URL },
  }).scope;
  assert.equal(await resolveGlassesCameraDescriptor(declined), null);
  // Present, but saying there is no camera - the ar-app injected and its own
  // camera layer is down, which is a different file to go and look at.
  assert.equal(getScanDiagnostic('descriptor').detail.present, true);
  assert.equal(getScanDiagnostic('descriptor').detail.available, false);
});

test('a WebView marker only buys time, never a camera', () => {
  assert.equal(looksLikeAndroidWebView(createFakeCameraScope({ userAgent: WEBVIEW_UA }).scope), true);
  assert.equal(looksLikeAndroidWebView(createFakeCameraScope().scope), false);
});

test('in a browser the missing descriptor is answered immediately', async () => {
  fresh();
  const { scope } = createFakeCameraScope();
  const started = Date.now();

  assert.equal(await resolveGlassesCameraDescriptor(scope), null);

  // A desktop browser must not sit through the WebView wait before opening
  // the camera it was always going to open.
  assert.ok(Date.now() - started < 200, 'a browser waits for nothing');
  assert.equal(getScanDiagnostic('descriptor').detail.waitedMs, 0);
});

test('inside a WebView a late descriptor is still caught', async () => {
  fresh();
  const { scope } = createFakeCameraScope({ userAgent: WEBVIEW_UA });
  // WebLayerController publishes the descriptor from onPageFinished. A page
  // that asked for a camera first used to fall straight through to
  // getUserMedia - which on the glasses opens the *phone's* camera.
  setTimeout(() => { scope.__jorjinCamera = { ...GLASSES_CAMERA }; }, 60);

  const descriptor = await resolveGlassesCameraDescriptor(scope, { timeoutMs: 1000, pollMs: 20 });

  assert.ok(descriptor, 'the descriptor that arrived late is used');
  assert.ok(getScanDiagnostic('descriptor').detail.waitedMs > 0);
});

test('a WebView with no ar-app behind it still gives up and says so', async () => {
  fresh();
  const { scope } = createFakeCameraScope({ userAgent: WEBVIEW_UA });

  const descriptor = await resolveGlassesCameraDescriptor(scope, { timeoutMs: 120, pollMs: 20 });

  assert.equal(descriptor, null);
  assert.equal(getScanDiagnostic('descriptor').status, 'fail');
  assert.ok(getScanDiagnostic('descriptor').detail.waitedMs >= 120);
});

// --- the whole chain, both ways it can go -------------------------------------

test('a working glasses camera reports every layer it passed', async () => {
  fresh();
  const fake = createFakeCameraScope({
    jorjinCamera: GLASSES_CAMERA,
    streams: { [STREAM_URL]: { width: 640, height: 480 } },
  });

  const { source, release } = await acquireCameraSource('test', { scope: fake.scope });

  assert.equal(source.kind, 'glasses');
  assert.deepEqual(fake.getUserMediaCalls, [], 'the phone camera stays dark');
  assert.deepEqual(stepsRecorded(), ['descriptor', 'cameraSource', 'mjpegRequest', 'firstFrame']);
  assert.equal(getScanDiagnostic('mjpegRequest').detail.url, STREAM_URL);
  assert.equal(getScanDiagnostic('firstFrame').status, 'ok');
  assert.equal(getScanDiagnostic('firstFrame').detail.frameWidth, 640);
  assert.equal(getScanDiagnostic('firstFrame').detail.frameHeight, 480);
  assert.equal(getScanDiagnostic('cameraSource').detail.kind, 'glasses');
  // Every status the chain produces is one the overlay has a colour for. An
  // undeclared status renders as the neutral one and a failure would read as
  // an ordinary fact.
  const declared = new Set(SCAN_DIAGNOSTIC_STATUSES);
  getScanDiagnostics().forEach((record) => {
    assert.ok(declared.has(record.status), `undeclared status: ${record.status}`);
  });
  release();
});

test('a stream that never delivers is reported as the frame it never sent', async () => {
  fresh();
  // A URL that is not served at all: advertised, requested, silent - which is
  // exactly what an MJPEG response with no boundary looks like from the page.
  const fake = createFakeCameraScope({ jorjinCamera: GLASSES_CAMERA });

  await assert.rejects(
    acquireCameraSource('test', { scope: fake.scope }),
    GlassesCameraUnavailableError,
  );

  assert.deepEqual(fake.getUserMediaCalls, [], 'a failed glasses stream never opens the phone');
  assert.equal(getScanDiagnostic('mjpegRequest').status, 'opened');
  assert.equal(getScanDiagnostic('firstFrame').status, 'fail');
  assert.match(getScanDiagnostic('firstFrame').detail.reason, /no frame arrived/);
  assert.equal(getScanDiagnostic('firstFrame').detail.naturalWidth, 0);
  // And the failure is attributed to the camera, not to a recogniser that
  // never got the chance to run.
  assert.equal(getScanDiagnostic('cameraSource').status, 'fail');
  assert.equal(getScanDiagnostic('cameraSource').detail.kind, 'none');
});

test('with no descriptor the browser path still runs, and says which one it took', async () => {
  fresh();
  const fake = createFakeCameraScope();

  const { source, release } = await acquireCameraSource('test', { scope: fake.scope });

  assert.equal(source.kind, 'user-media');
  assert.equal(fake.getUserMediaCalls.length, 1);
  assert.equal(getScanDiagnostic('cameraSource').detail.kind, 'user-media');
  release();
});

// --- the probe, which is the only thing that can see the server ---------------

function fakeResponse({ status = 200, contentType = '', bytes = 0 } = {}) {
  return {
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    body: {
      getReader: () => ({
        read: async () => ({ value: bytes ? new Uint8Array(bytes) : undefined, done: bytes === 0 }),
        cancel: async () => {},
      }),
    },
  };
}

test('the probe names the boundary, which is what decides whether frames can be split', async () => {
  fresh();
  const fake = createFakeCameraScope({
    fetch: async () => fakeResponse({
      contentType: 'multipart/x-mixed-replace; boundary=jorjinframe',
      bytes: 2048,
    }),
  });

  const result = await probeGlassesStream(STREAM_URL, fake.scope);

  assert.equal(result.status, 200);
  assert.equal(result.boundary, 'jorjinframe');
  assert.equal(result.firstChunkBytes, 2048);
  assert.equal(getScanDiagnostic('streamProbe').detail.interceptedByAndroid, true);
});

test('a multipart response with no boundary is a failure, not a success', async () => {
  fresh();
  // The exact bug: WebResourceResponse was built with the bare media type, so
  // the response was multipart and 200 and completely undecodable - the
  // browser has nothing to split the parts on and never produces a frame.
  const fake = createFakeCameraScope({
    fetch: async () => fakeResponse({ contentType: 'multipart/x-mixed-replace', bytes: 2048 }),
  });

  const result = await probeGlassesStream(STREAM_URL, fake.scope);

  assert.equal(result.boundary, '(none)');
  assert.equal(getScanDiagnostic('streamProbe').detail.boundary, '(none)');
});

test('a request that left the app is visible as the 404 it becomes', async () => {
  fresh();
  // Nothing is served at this path by the real site. A 404 here means
  // shouldInterceptRequest did not fire - the request went to GitHub Pages,
  // which is a bug in the Android URL match, not in the camera.
  const fake = createFakeCameraScope({
    fetch: async () => fakeResponse({ status: 404, contentType: 'text/html' }),
  });

  await probeGlassesStream(STREAM_URL, fake.scope);

  const record = getScanDiagnostic('streamProbe');
  assert.equal(record.status, 'fail');
  assert.equal(record.detail.status, 404);
  assert.equal(record.detail.interceptedByAndroid, false);
});

test('a scope with no fetch skips the probe rather than throwing inside a failure path', async () => {
  fresh();
  const { scope } = createFakeCameraScope();

  assert.equal(await probeGlassesStream(STREAM_URL, scope), null);
  assert.equal(getScanDiagnostic('streamProbe').status, 'info');
});
