// Whether the 佐臻 glasses are plugged in, and what the page does about it.
//
//   glasses plugged in   language -> gesture tutorial -> scan with the glasses camera
//   no glasses          language -> scan with the phone's own camera
//
// The Shell (1.2.3+) publishes window.__cibarGlasses; an older Shell publishes
// nothing and keeps the glasses flow; a plain browser has no glasses.
import assert from 'node:assert/strict';
import test from 'node:test';

const {
  GLASSES_PRESENCE,
  areGlassesAbsent,
  readGlassesPresence,
} = await import('../src/lib/glasses/glassesPresence.js');
const { resolveGlassesCameraDescriptor } = await import('../src/lib/ar/cameraSource.js');

const SHELL = { version: 1, shellVersion: '1.2.3' };
const ANDROID_WEBVIEW = { userAgent: 'Mozilla/5.0 (Linux; Android 12; wv) Chrome/120.0 Mobile Safari/537.36' };

test('the Shell saying the glasses are plugged in is the glasses flow', () => {
  const scope = { __cibarShell: SHELL, __cibarGlasses: { version: 1, connected: true, camera: true, tof: true } };
  assert.equal(readGlassesPresence(scope), GLASSES_PRESENCE.CONNECTED);
  assert.equal(areGlassesAbsent(scope), false);
});

test('the Shell saying they are not is the phone-camera flow', () => {
  const scope = { __cibarShell: SHELL, __cibarGlasses: { version: 1, connected: false, camera: false, tof: false } };
  assert.equal(readGlassesPresence(scope), GLASSES_PRESENCE.ABSENT);
  assert.equal(areGlassesAbsent(scope), true);
});

test('an older Shell that says nothing keeps the glasses flow', () => {
  const scope = { __cibarShell: { version: 1, shellVersion: '1.2.2' } };
  assert.equal(readGlassesPresence(scope), GLASSES_PRESENCE.UNKNOWN);
  assert.equal(areGlassesAbsent(scope), false);
});

test('a plain browser has no glasses', () => {
  assert.equal(readGlassesPresence({}), GLASSES_PRESENCE.ABSENT);
  assert.equal(areGlassesAbsent({}), true);
});

test('a malformed report is not believed', () => {
  const scope = { __cibarShell: SHELL, __cibarGlasses: { connected: 'no' } };
  assert.equal(readGlassesPresence(scope), GLASSES_PRESENCE.UNKNOWN);
});

test('with the Shell saying no glasses camera, the scan does not wait two seconds for one', async () => {
  const scope = {
    navigator: ANDROID_WEBVIEW,
    __cibarShell: SHELL,
    __cibarGlasses: { version: 1, connected: false, camera: false, tof: false },
    __jorjinCamera: { version: 1, available: false, streamUrl: 'x', width: 0, height: 0 },
    setTimeout: () => assert.fail('must not wait for a descriptor the Shell said is not coming'),
  };
  const started = Date.now();
  assert.equal(await resolveGlassesCameraDescriptor(scope, { timeoutMs: 2000, pollMs: 50 }), null);
  assert.ok(Date.now() - started < 500);
});

test('without that word from the Shell, a WebView still waits for a late descriptor', async () => {
  let waits = 0;
  const scope = {
    navigator: ANDROID_WEBVIEW,
    setTimeout: (resolve) => { waits += 1; resolve(); },
  };
  assert.equal(await resolveGlassesCameraDescriptor(scope, { timeoutMs: 200, pollMs: 50 }), null);
  assert.equal(waits, 4);
});
