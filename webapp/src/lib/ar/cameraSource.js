// The app's single camera - and which camera that actually is.
//
// CIBAR runs in two places, and they do not get their frames the same way:
//
//   AR glasses (the real target)          Chrome / a phone / a laptop
//   ------------------------------        ---------------------------
//   The 佐臻 ar-app owns the glasses'      Nothing owns a camera but us, so
//   RGB camera and republishes it as       the browser hands one over on
//   an MJPEG stream. It tells the          request.
//   WebView about it by setting
//   `window.__jorjinCamera`.                       navigator.mediaDevices
//                                                     .getUserMedia()
//         <img src=streamUrl>                      <video srcObject=stream>
//                    \                                  /
//                     \                                /
//                      v                              v
//                            Camera Source        <- this file
//                                  |
//                    +-------------+-------------+
//                    |                           |
//             image recognition           the on-screen preview
//             (./imageRecognition.js)     (the same element; see below)
//
// The two paths differ in exactly one place - how the element that holds the
// frames is created - and nowhere else. Everything downstream is handed a
// FrameSource: a CanvasImageSource plus the pixel size of the frame currently
// in it. That is all `drawImage()` needs, so nothing above this file knows or
// cares whether it is drawing from an <img> fed by the glasses or a <video>
// fed by getUserMedia.
//
// WHY THE GLASSES PATH MUST NOT FALL THROUGH TO getUserMedia
//
// On the glasses, `getUserMedia` does not return the glasses' RGB camera. In
// the ar-app's WebView it either fails or opens the *phone's* camera, and a
// phone camera lighting up while the player is wearing the glasses is the
// exact failure this module exists to prevent. So `available === true` is a
// commitment: from that point on this file will never call getUserMedia, and
// a glasses stream that cannot be opened is reported as a camera error rather
// than quietly retried against some other lens.
//
// GESTURES ARE NOT HERE. Hand gestures (LEFT/RIGHT) do not come from this
// camera and never did. They are produced by the glasses' own ToF 8x8 depth
// sensor, on separate hardware, through the ar-app's native bridge, and they
// reach the web app as already-decided semantic events
// (src/lib/arInteraction/gestureBridge.js). No gesture code reads an RGB
// frame, and nothing in the gesture path acquires this camera. The RGB camera
// has exactly one consumer: image recognition.
//
// One reference-counted source is still the right shape even with a single
// consumer today. It is what keeps the count of opens at "exactly one per
// visit to /ar-scan" across React's mount/unmount churn, and it is what makes
// a second consumer - a future frame-tap, a debug recorder, a photo capture -
// a `acquire()`/`release()` pair rather than a second stream.
//
// A consumer reads frames. It never reconfigures the source - no
// applyConstraints, no track.stop(), no swapping facingMode, no re-pointing
// the <img> - because those are global effects on a resource it shares. A
// consumer that needs different pixel dimensions scales the frames it draws
// (see ./imageTargetFrame.js), which is local to that consumer.

import { recordScanDiagnostic } from './scanDiagnostics';

// Only consulted on the getUserMedia path. The glasses stream is framed by
// the ar-app; asking a stream that is already chosen for a facingMode would
// be asking the wrong question.
const CAMERA_CONSTRAINTS = {
  video: { facingMode: 'environment' },
  audio: false,
};

// The global the ar-app sets on the WebView before CIBAR loads. Its shape:
//
//   window.__jorjinCamera = {
//     version: 1,
//     available: true,
//     streamUrl: 'https://.../__jorjin-camera.mjpeg',
//     width: number,
//     height: number,
//   }
export const JORJIN_CAMERA_GLOBAL = '__jorjinCamera';

// The descriptor version this file was written against. A newer ar-app is
// still used rather than refused: `available` and `streamUrl` are the whole
// contract, and a build that stopped working the day the glasses shipped a
// version bump would be worse than one that logs and carries on.
export const SUPPORTED_JORJIN_CAMERA_VERSION = 1;

// Both the frame source and the on-screen preview, so the CSS can size it
// without caring which element it turned out to be.
export const CAMERA_FRAME_CLASS = 'ar-camera-frame';

// Aborts an in-flight MJPEG connection without asking the browser to load
// anything else. Assigning '' would re-request the containing document in
// some browsers; a blank 1x1 GIF closes the multipart response and resolves
// immediately.
const BLANK_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

// How long to wait for the glasses stream's first frame before calling it a
// camera failure. It is a real safeguard, not a guess at latency: without it
// an ar-app that advertises a stream it never serves leaves /ar-scan sitting
// on a black box forever with no error and no manual fallback offered.
const GLASSES_FIRST_FRAME_TIMEOUT_MS = 8000;

// How long to wait for the ar-app to publish its descriptor before concluding
// there is no glasses camera - and, crucially, only inside an Android WebView
// (see `looksLikeAndroidWebView`). It closes an injection race that costs the
// exact failure this file exists to prevent: WebLayerController sets
// `window.__jorjinCamera` from `onPageFinished`, and a page that asked for a
// camera before that lands on `getUserMedia` and opens the *phone's* lens.
// Reaching /ar-scan takes a language choice and the gesture tutorial, so in
// practice the descriptor is long since there and this wait never runs; it is
// insurance against a reload, a WebView that was rebuilt, or an ar-app that
// injects later than today's does. A browser (no WebView marker) skips it
// entirely and keeps the desktop path instant.
const GLASSES_DESCRIPTOR_WAIT_MS = 2000;
const GLASSES_DESCRIPTOR_POLL_MS = 50;

// How long the failure probe waits for the server's headers. Only ever runs
// after the stream has already failed, so it is delaying an error message and
// nothing else.
const STREAM_PROBE_TIMEOUT_MS = 3000;

// Module-level rather than per-consumer: that is the point. `opening` is kept
// separate from `source` so that two consumers acquiring in the same tick
// await the *same* open instead of racing into two streams (and, on the
// getUserMedia path, two permission prompts).
let opening = null;
let source = null;
const consumers = new Set();

/**
 * The ar-app's camera descriptor, or null when this build is not running on
 * the glasses.
 *
 * `available === true` is the only thing that selects the glasses path -
 * nothing here sniffs a user agent or a WebView. Anything else (no global, an
 * `available` of false, a descriptor that is not an object) is an ordinary
 * browser, which is what desktop development and the demo laptop are.
 *
 * @param {object} [scope] - where to look; the global object in the app, and
 *   an explicit stand-in in tests.
 */
export function readGlassesCameraDescriptor(scope = globalThis) {
  const descriptor = scope?.[JORJIN_CAMERA_GLOBAL];
  if (!descriptor || typeof descriptor !== 'object') return null;
  if (descriptor.available !== true) return null;
  return descriptor;
}

/** True when this build must take the glasses path and must not open a browser camera. */
export function isGlassesCameraDeclared(scope = globalThis) {
  return readGlassesCameraDescriptor(scope) !== null;
}

/**
 * Whether this page is inside an Android WebView, which is the only place the
 * ar-app can be.
 *
 * The one thing this is allowed to decide is *how long to wait for a
 * descriptor* - never which camera to open. That is still `available === true`
 * and nothing else (see `readGlassesCameraDescriptor`): a user-agent test is a
 * guess, and a guess must not be able to pick a lens. `; wv)` is Chrome's own
 * WebView marker and has been in the string since KitKat.
 */
export function looksLikeAndroidWebView(scope = globalThis) {
  const agent = scope?.navigator?.userAgent;
  return typeof agent === 'string' && agent.includes('; wv)');
}

/**
 * The descriptor, waiting for it if we are somewhere it could still arrive.
 *
 * Records `descriptor: ok` with what the ar-app published, or `descriptor:
 * fail` naming what was missing - "descriptor missing" and "descriptor present
 * but available:false" are different bugs in different files, and the scan
 * page could previously not tell them apart or even see that it had happened.
 */
export async function resolveGlassesCameraDescriptor(scope = globalThis, {
  timeoutMs = GLASSES_DESCRIPTOR_WAIT_MS,
  pollMs = GLASSES_DESCRIPTOR_POLL_MS,
} = {}) {
  let descriptor = readGlassesCameraDescriptor(scope);
  let waitedMs = 0;

  if (!descriptor && looksLikeAndroidWebView(scope)) {
    recordScanDiagnostic('descriptor', 'pending', { waitingFor: `${timeoutMs}ms`, reason: 'android-webview' }, { scope });
    while (!descriptor && waitedMs < timeoutMs) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(pollMs, scope);
      waitedMs += pollMs;
      descriptor = readGlassesCameraDescriptor(scope);
    }
  }

  if (descriptor) {
    recordScanDiagnostic('descriptor', 'ok', {
      present: true,
      available: descriptor.available,
      streamUrl: descriptor.streamUrl,
      width: descriptor.width,
      height: descriptor.height,
      version: descriptor.version,
      waitedMs,
    }, { scope });
    return descriptor;
  }

  const raw = scope?.[JORJIN_CAMERA_GLOBAL];
  recordScanDiagnostic('descriptor', 'fail', {
    present: raw !== undefined && raw !== null,
    // The two failures that look identical from the page and are not: no
    // global at all (the ar-app never injected, or injected into a document
    // this page replaced) versus a global that says the camera is not there
    // (the ar-app injected, and its own camera layer is down).
    available: raw && typeof raw === 'object' ? raw.available : undefined,
    waitedMs,
  }, { scope });
  return null;
}

function sleep(ms, scope) {
  return new Promise((resolve) => {
    // Called through the scope rather than detached from it: `window.setTimeout`
    // invoked without its receiver throws "Illegal invocation" in a browser.
    if (typeof scope?.setTimeout === 'function') scope.setTimeout(resolve, ms);
    else setTimeout(resolve, ms);
  });
}

// Thrown when the ar-app said `available: true` but the stream it named
// cannot be used. Deliberately terminal: the caller shows its camera-error
// fallback. Falling back to getUserMedia here would open the phone's camera.
export class GlassesCameraUnavailableError extends Error {
  constructor(message) {
    super(`AR glasses camera declared but unusable: ${message}`);
    this.name = 'GlassesCameraUnavailableError';
  }
}

// Thrown when a consumer released its reference while the camera was still
// opening. Callers treat it as "never mind", not as a camera failure.
export class CameraReleasedError extends Error {
  constructor() {
    super('Camera reference was released before the camera finished opening');
    this.name = 'CameraReleasedError';
  }
}

function positiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

// Whether a canvas drawn from this URL would be tainted. Same-origin needs no
// CORS opt-in at all (and asking for one on a server that sends no CORS
// headers would fail the load outright); a cross-origin stream must be
// requested anonymously or `getImageData` throws and recognition is dead in
// the water with no obvious cause.
function needsCrossOriginOptIn(streamUrl, scope) {
  const here = scope?.location?.href;
  if (typeof here !== 'string') return false;
  try {
    return new URL(streamUrl, here).origin !== new URL(here).origin;
  } catch {
    return false;
  }
}

/**
 * Wait for the first decoded frame of an MJPEG stream.
 *
 * `load` is not enough on its own: a `multipart/x-mixed-replace` response
 * stays open, so in some browsers the event never fires while frames keep
 * arriving. `naturalWidth` becoming non-zero is what actually says "a frame
 * has been decoded", so both are watched and the first one wins.
 */
function waitForFirstGlassesFrame(img, { timeoutMs = GLASSES_FIRST_FRAME_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let pollTimer = null;
    let timeoutTimer = null;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      if (pollTimer !== null) clearInterval(pollTimer);
      if (timeoutTimer !== null) clearTimeout(timeoutTimer);
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
      if (error) reject(error); else resolve();
    };

    function onLoad() { finish(null); }
    function onError() {
      finish(new GlassesCameraUnavailableError(`the stream at ${img.src} could not be loaded`));
    }

    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    if (img.naturalWidth > 0) { finish(null); return; }

    pollTimer = setInterval(() => {
      if (img.naturalWidth > 0) finish(null);
    }, 50);
    timeoutTimer = setTimeout(() => {
      finish(new GlassesCameraUnavailableError(`no frame arrived within ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Ask the server what it would answer for the stream URL, after the <img> has
 * already failed on it.
 *
 * An <img> reports exactly one bit - loaded or not - so on the glasses a
 * missing frame was indistinguishable from a 404, a wrong content type, or a
 * stream that opened and produced no bytes. Those are three different files to
 * go and fix. `fetch` sees all of it: the status says whether Android's
 * `shouldInterceptRequest` fired at all (if it did not, GitHub Pages answers
 * 404 for a path that exists on no server), the content type says whether the
 * response is the multipart stream it claims to be, and the boundary
 * parameter is the one thing a browser needs in order to split frames out of
 * it - a multipart response without one decodes to nothing at all.
 *
 * Diagnostic only. Its result is recorded and discarded; the camera has
 * already failed by the time it runs, and nothing branches on what it finds.
 */
export async function probeGlassesStream(streamUrl, scope = globalThis, {
  timeoutMs = STREAM_PROBE_TIMEOUT_MS,
} = {}) {
  if (typeof scope?.fetch !== 'function') {
    recordScanDiagnostic('streamProbe', 'info', { skipped: 'no fetch in this scope' }, { scope });
    return null;
  }

  const controller = typeof scope.AbortController === 'function' ? new scope.AbortController() : null;
  let timer = null;
  if (controller && typeof scope.setTimeout === 'function') {
    timer = scope.setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const response = await scope.fetch(streamUrl, {
      cache: 'no-store',
      signal: controller?.signal,
    });
    const contentType = response.headers?.get?.('content-type') ?? '';
    const boundary = /boundary=([^;]+)/i.exec(contentType)?.[1] ?? '';
    // One chunk is enough to answer "did any bytes come out of it", which is
    // what separates "Android served the response" from "Android served the
    // response and the camera behind it is silent". The body is cancelled
    // straight afterwards so this probe cannot hold a second stream open.
    let firstChunkBytes = 0;
    const reader = response.body?.getReader?.();
    if (reader) {
      const { value } = await reader.read();
      firstChunkBytes = value?.byteLength ?? 0;
      await reader.cancel().catch(() => {});
    }
    const result = {
      status: response.status,
      contentType: contentType || '(none)',
      boundary: boundary || '(none)',
      firstChunkBytes,
      url: streamUrl,
    };
    // A 200 that is a multipart response with a boundary means Android
    // intercepted the request; anything else means the request left the app.
    const intercepted = response.status === 200 && contentType.includes('multipart/x-mixed-replace');
    recordScanDiagnostic('streamProbe', intercepted ? 'info' : 'fail', {
      ...result,
      interceptedByAndroid: intercepted,
    }, { scope });
    return result;
  } catch (error) {
    recordScanDiagnostic('streamProbe', 'fail', {
      url: streamUrl,
      error: error?.name === 'AbortError' ? `no response within ${timeoutMs}ms` : String(error?.message ?? error),
    }, { scope });
    return null;
  } finally {
    if (timer !== null) scope.clearTimeout?.(timer);
  }
}

async function openGlassesCamera(descriptor, scope) {
  const streamUrl = typeof descriptor.streamUrl === 'string' ? descriptor.streamUrl.trim() : '';
  if (!streamUrl) {
    recordScanDiagnostic('mjpegRequest', 'fail', { reason: 'descriptor has no streamUrl' }, { scope });
    throw new GlassesCameraUnavailableError('streamUrl is missing');
  }

  const version = positiveNumber(descriptor.version);
  if (version && version !== SUPPORTED_JORJIN_CAMERA_VERSION && typeof console !== 'undefined') {
    console.warn(
      `[ar-camera] ${JORJIN_CAMERA_GLOBAL}.version is ${version}, this build was written against ${SUPPORTED_JORJIN_CAMERA_VERSION}`,
    );
  }

  const img = scope.document.createElement('img');
  img.className = CAMERA_FRAME_CLASS;
  img.alt = '';
  img.decoding = 'async';
  const crossOrigin = needsCrossOriginOptIn(streamUrl, scope);
  if (crossOrigin) img.crossOrigin = 'anonymous';
  img.src = streamUrl;
  recordScanDiagnostic('mjpegRequest', 'opened', { url: streamUrl, crossOrigin }, { scope });

  try {
    await waitForFirstGlassesFrame(img);
  } catch (error) {
    // Everything the page can still see about the failed <img>, before its
    // src is dropped: `complete` with a zero `naturalWidth` is a response that
    // arrived and decoded to nothing, which is what a multipart stream with no
    // boundary looks like from here.
    recordScanDiagnostic('firstFrame', 'fail', {
      reason: error?.message ?? String(error),
      naturalWidth: img.naturalWidth ?? 0,
      naturalHeight: img.naturalHeight ?? 0,
      complete: img.complete,
    }, { scope });
    img.src = BLANK_IMAGE;
    // Deliberately awaited: the error it explains is about to be thrown, and a
    // probe whose result lands after the page has already shown "camera
    // error" is a probe nobody reads.
    await probeGlassesStream(streamUrl, scope);
    throw error;
  }

  recordScanDiagnostic('firstFrame', 'ok', {
    frameWidth: img.naturalWidth,
    frameHeight: img.naturalHeight,
  }, { scope });

  // The declared size is a fallback only. `naturalWidth` is the size of the
  // frame actually decoded, and it is the truth if the two ever disagree.
  const declaredWidth = positiveNumber(descriptor.width);
  const declaredHeight = positiveNumber(descriptor.height);

  return {
    kind: 'glasses',
    element: img,
    stream: null,
    streamUrl,
    get frameWidth() { return img.naturalWidth || declaredWidth; },
    get frameHeight() { return img.naturalHeight || declaredHeight; },
    close() {
      img.remove?.();
      // Dropping the src is what closes the HTTP connection to the ar-app; an
      // <img> left pointed at a live multipart response keeps reading it.
      img.src = BLANK_IMAGE;
    },
  };
}

async function openUserMediaCamera(scope) {
  const stream = await scope.navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
  recordScanDiagnostic('mjpegRequest', 'info', { skipped: 'not the glasses path' }, { scope });
  const video = scope.document.createElement('video');
  video.className = CAMERA_FRAME_CLASS;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.srcObject = stream;
  await video.play?.().catch(() => {});
  await waitForVideoMetadata(video);

  return {
    kind: 'user-media',
    element: video,
    stream,
    streamUrl: null,
    get frameWidth() { return video.videoWidth || 0; },
    get frameHeight() { return video.videoHeight || 0; },
    close() {
      video.remove?.();
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    },
  };
}

function waitForVideoMetadata(video) {
  if (video.readyState >= (video.HAVE_METADATA ?? 1)) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener('loadedmetadata', resolve, { once: true });
  });
}

async function openCamera(scope) {
  const descriptor = await resolveGlassesCameraDescriptor(scope);
  // The whole branch, in one place. Note that a thrown
  // GlassesCameraUnavailableError leaves this function without ever reaching
  // the getUserMedia line - that is requirement 1, expressed as control flow
  // rather than as a comment asking people to be careful.
  recordScanDiagnostic('cameraSource', 'info', {
    kind: descriptor ? 'glasses' : 'user-media',
    getUserMedia: descriptor ? 'never called' : 'about to be called',
  }, { scope });
  return descriptor ? openGlassesCamera(descriptor, scope) : openUserMediaCamera(scope);
}

function stopIfUnused() {
  if (consumers.size > 0 || !source) return;
  source.close();
  source = null;
  opening = null;
}

/**
 * Take a reference to the shared camera, opening it if this is the first one.
 *
 * @param {string} label - who is holding it; for debugging only.
 * @param {object} [options]
 * @param {object} [options.scope] - the global to read `__jorjinCamera`,
 *   `document` and `navigator` from. Defaults to the real one.
 * @returns {Promise<{source: object, release: () => void}>} `source` is a
 *   FrameSource: `{ kind, element, frameWidth, frameHeight, stream }`, where
 *   `element` is a CanvasImageSource. `release()` is idempotent, so a
 *   consumer may call it from both an error path and a teardown path without
 *   closing someone else's camera.
 */
export async function acquireCameraSource(label = 'unnamed', { scope = globalThis } = {}) {
  const token = { label };
  consumers.add(token);

  try {
    if (!opening) opening = openCamera(scope);
    const opened = await opening;
    // Nothing else may observe a source this consumer already gave up on: a
    // component that unmounted while the permission prompt was still up has
    // already released, and its token is gone.
    if (!consumers.has(token)) {
      source = opened;
      stopIfUnused();
      throw new CameraReleasedError();
    }
    source = opened;
  } catch (error) {
    consumers.delete(token);
    // A failed open must not be cached as "already opening" - the next
    // consumer (or the next visit to the page) has to be able to ask again.
    if (consumers.size === 0) opening = null;
    if (!(error instanceof CameraReleasedError)) {
      recordScanDiagnostic('cameraSource', 'fail', {
        kind: 'none',
        label,
        reason: error?.message ?? String(error),
      }, { scope });
    }
    throw error;
  }

  recordScanDiagnostic('cameraSource', 'ok', {
    kind: source.kind,
    frameWidth: source.frameWidth,
    frameHeight: source.frameHeight,
    streamUrl: source.streamUrl ?? '(none)',
  }, { scope });

  let released = false;
  return {
    source,
    release() {
      if (released) return;
      released = true;
      consumers.delete(token);
      stopIfUnused();
    },
  };
}

/**
 * Show the source's frames on screen.
 *
 * The element the recogniser draws from *is* the element the player sees -
 * one decode, one connection, one thing to keep alive. So this moves that one
 * element into `hostEl` rather than making a copy of the feed: a second <img>
 * on the same MJPEG URL would open a second stream from the glasses, and a
 * second <video> is only free because a MediaStream happens to be cheap to
 * mirror.
 */
export function mountCameraPreview(hostEl, frameSource) {
  if (!hostEl || !frameSource?.element) {
    recordScanDiagnostic('preview', 'fail', {
      host: hostEl ? 'present' : 'missing',
      element: frameSource?.element ? 'present' : 'missing',
    });
    return;
  }
  if (frameSource.element.parentNode !== hostEl) hostEl.appendChild(frameSource.element);
  // "The player is looking at the same element recognition reads" is a claim
  // this module makes in its header; recording the tag it actually mounted is
  // what makes that claim checkable on the device.
  recordScanDiagnostic('preview', 'ok', {
    mounted: frameSource.element.tagName ?? 'unknown',
    kind: frameSource.kind,
  });
}

/** Take the preview back out of the DOM without closing the camera. */
export function unmountCameraPreview(frameSource) {
  frameSource?.element?.remove?.();
}

// Test seam. Nothing in the app calls these.
export function __cameraSourceStateForTests() {
  return { consumerCount: consumers.size, isOpen: source !== null, kind: source?.kind ?? null };
}

export function __resetCameraSourceForTests() {
  consumers.clear();
  source = null;
  opening = null;
}
