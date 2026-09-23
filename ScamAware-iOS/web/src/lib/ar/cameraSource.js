// The app's single camera - ScamAware-iOS edition.
//
// On iOS there is exactly one camera path: the iPhone's own rear camera,
// opened with navigator.mediaDevices.getUserMedia() inside the app's
// WKWebView. The Android build's second path - the 佐臻 glasses' RGB camera
// republished as an MJPEG stream through `window.__jorjinCamera` - does not
// exist in this port and has been removed, together with its descriptor
// polling, stream probing and first-frame timeout.
//
// Everything downstream still receives the same FrameSource shape it did on
// Android: a CanvasImageSource (`element`, here always a <video>) plus the
// pixel size of the current frame. imageRecognition.js is unchanged apart from
// that, so MindAR recognition behaves exactly as it does on the glasses build.
//
// One reference-counted source keeps the number of camera opens at "exactly
// one per visit to /ar-scan" across React's mount/unmount churn (StrictMode
// mounts twice in development), and makes two consumers acquiring in the
// same tick share one permission prompt and one stream.
//
// Camera permission: WKWebView asks iOS, and iOS shows the system prompt with
// the NSCameraUsageDescription text from Info.plist the first time. The native
// side (WebViewController.swift) grants the page's request once the user has
// allowed the app, so the prompt is not repeated on every visit.

import { recordScanDiagnostic } from './scanDiagnostics';

// `ideal`, not `exact`: an iPhone always has a rear camera, but a simulator or
// an iPad-on-a-stand may not, and a front camera is still better than an error
// for a demo. 1280x720 is plenty - recognition downsamples to PROCESSING_WIDTH
// (./imageTargetFrame.js) - and keeps the camera cheap on older iPhones.
const CAMERA_CONSTRAINTS = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

export const CAMERA_FRAME_CLASS = 'ar-camera-frame';

// Thrown when a consumer released its reference while the camera was still
// opening. Callers treat it as "never mind", not as a camera failure.
export class CameraReleasedError extends Error {
  constructor() {
    super('Camera reference was released before the camera finished opening');
    this.name = 'CameraReleasedError';
  }
}

let opening = null;
let source = null;
const consumers = new Set();

function waitForVideoMetadata(video) {
  if (video.readyState >= (video.HAVE_METADATA ?? 1)) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener('loadedmetadata', resolve, { once: true });
  });
}

async function openCamera(scope) {
  const mediaDevices = scope.navigator?.mediaDevices;
  if (!mediaDevices?.getUserMedia) {
    // WKWebView only exposes mediaDevices on a secure origin; the app serves
    // its bundle from app://localhost precisely so that this exists. Seeing
    // this error means the page was opened some other way (e.g. file://).
    throw new Error('navigator.mediaDevices.getUserMedia is not available in this context');
  }
  recordScanDiagnostic('cameraSource', 'info', { kind: 'user-media', getUserMedia: 'about to be called' }, { scope });
  const stream = await mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);

  const video = scope.document.createElement('video');
  video.className = CAMERA_FRAME_CLASS;
  // iOS will only play a camera stream inline (instead of full-screen) and
  // without a user gesture when the element is muted and playsinline - as
  // attributes, not just properties, for older WebKit.
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
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

function stopIfUnused() {
  if (consumers.size > 0 || !source) return;
  source.close();
  source = null;
  opening = null;
}

/**
 * Take a reference to the shared camera, opening it if this is the first one.
 * `release()` is idempotent.
 */
export async function acquireCameraSource(label = 'unnamed', { scope = globalThis } = {}) {
  const token = { label };
  consumers.add(token);

  try {
    if (!opening) opening = openCamera(scope);
    const opened = await opening;
    if (!consumers.has(token)) {
      source = opened;
      stopIfUnused();
      throw new CameraReleasedError();
    }
    source = opened;
  } catch (error) {
    consumers.delete(token);
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

/** Show the source's frames on screen: the element recognition reads is the one the player sees. */
export function mountCameraPreview(hostEl, frameSource) {
  if (!hostEl || !frameSource?.element) {
    recordScanDiagnostic('preview', 'fail', {
      host: hostEl ? 'present' : 'missing',
      element: frameSource?.element ? 'present' : 'missing',
    });
    return;
  }
  if (frameSource.element.parentNode !== hostEl) hostEl.appendChild(frameSource.element);
  // Re-assert playback after the move: WebKit can pause a <video> that is
  // re-parented, which would freeze both the preview and recognition.
  frameSource.element.play?.().catch?.(() => {});
  recordScanDiagnostic('preview', 'ok', {
    mounted: frameSource.element.tagName ?? 'unknown',
    kind: frameSource.kind,
  });
}

/** Take the preview back out of the DOM without closing the camera. */
export function unmountCameraPreview(frameSource) {
  frameSource?.element?.remove?.();
}
