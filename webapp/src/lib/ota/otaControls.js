// The staff screen's one door to the update mechanism, and the only place that knows there is
// more than one kind of device underneath.
//
// CIBAR runs in two places from one build: inside the Android APK Shell, where a native OTA
// mechanism downloads and stages web bundles, and in a plain browser or an iPhone home-screen
// PWA, where there is no shell, no APK and nothing to stage. The staff screen must offer each of
// them only what actually exists - an APK Shell OTA button on an iPhone would be a control that
// cannot do anything, which is worse than no control at all.
//
// Nothing outside 工作人員管理模式 may import this module.

import { getShellRelease, getWebBundleRelease } from '../releaseInfo';
import { compareSemantic } from './otaState';

/** How long a manual check waits for latest.json before calling it a failure. */
export const CHECK_TIMEOUT_MS = 8000;

/** Where the published pointer file sits, relative to the site root. */
export const LATEST_JSON_PATH = 'ota/latest.json';

export const PLATFORM = {
  /** Inside the Android APK Shell. Full Shell + Web Bundle versions, and native OTA controls. */
  ANDROID_SHELL: 'android-shell',
  /** An iPhone/Android home-screen PWA. Web bundle only. */
  PWA: 'pwa',
  /** An ordinary browser tab. Web bundle only. */
  BROWSER: 'browser',
};

export const PLATFORM_LABELS = {
  [PLATFORM.ANDROID_SHELL]: 'Android APK（AR 眼鏡）',
  [PLATFORM.PWA]: 'iPhone／PWA（已加入主畫面）',
  [PLATFORM.BROWSER]: '瀏覽器',
};

/**
 * Which of the three this is.
 *
 * The APK Shell is decided by the descriptor the shell itself publishes, never by the user agent:
 * the WebView's UA is an ordinary Android Chrome UA, and every attempt to tell them apart that
 * way is a string match that breaks on the next WebView update. `window.__cibarShell` is present
 * exactly when there is a shell, because the shell is what writes it.
 */
export function detectPlatform() {
  if (typeof window === 'undefined') return PLATFORM.BROWSER;
  if (getShellRelease()) return PLATFORM.ANDROID_SHELL;
  const standalone = window.navigator?.standalone === true
    || (typeof window.matchMedia === 'function'
      && window.matchMedia('(display-mode: standalone)')?.matches === true);
  return standalone ? PLATFORM.PWA : PLATFORM.BROWSER;
}

/** The native update controls, or null - absent in a browser and in a Shell too old to have them. */
export function nativeOtaControls() {
  if (typeof window === 'undefined') return null;
  const control = window.__cibarOtaControl;
  return control && typeof control.checkForUpdate === 'function' ? control : null;
}

/** The durable update record the shell publishes, or null. */
export function readOtaDiagnostics() {
  if (typeof window === 'undefined') return null;
  const value = window.__cibarOta;
  return value && typeof value === 'object' && Object.keys(value).length > 0 ? value : null;
}

/** The live phase the shell publishes, or null. */
export function readOtaStatus() {
  if (typeof window === 'undefined') return null;
  const value = window.__cibarOtaStatus;
  return value && typeof value === 'object' && Object.keys(value).length > 0 ? value : null;
}

/**
 * Every event the shell fires when any of the above changes.
 *
 * The globals are written after the page has loaded and again whenever a phase changes, so a
 * screen that read them once at mount would show the state as it was before the shell got round
 * to publishing it - which on a fast phone is most of the time.
 */
const SHELL_EVENTS = ['cibarShellReady', 'cibarOtaReady', 'cibarOtaStatus', 'cibarOtaControlReady'];

/** @returns {() => void} an unsubscribe function. */
export function subscribeToShell(handler) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }
  for (const name of SHELL_EVENTS) window.addEventListener(name, handler);
  return () => {
    for (const name of SHELL_EVENTS) window.removeEventListener(name, handler);
  };
}

/**
 * The site root this build was served from, with a trailing slash.
 *
 * Derived from the document rather than hard-coded, because the same bundle is served from
 * https://magician-eric.github.io/ScamAware-AR/ and from the APK's local https origin at the same path.
 */
export function siteRoot(location = typeof window === 'undefined' ? null : window.location) {
  const path = location?.pathname ?? '/';
  return path.endsWith('/') ? path : path.slice(0, path.lastIndexOf('/') + 1);
}

/**
 * Asks the published pointer file what the current release is - the web/PWA half of 檢查更新.
 *
 * A real request, always. The browser's own online flag answers "is this device attached to a
 * network", which is a different question with a different answer in every venue with a captive
 * portal; the only way to know whether the update server can be reached is to reach it. Bounded by
 * an AbortController so a socket that is accepted and then goes quiet - exactly what a portal
 * does - fails in {@link CHECK_TIMEOUT_MS} rather than leaving a button spinning for ever.
 *
 * @returns {Promise<{releaseId: string, version: string, minShellVersion: string}>}
 */
export async function fetchPublishedRelease({
  fetchImpl = typeof fetch === 'function' ? fetch : null,
  timeoutMs = CHECK_TIMEOUT_MS,
  url = `${siteRoot()}${LATEST_JSON_PATH}`,
} = {}) {
  if (!fetchImpl) throw fault('served', '這個環境沒有 fetch，無法檢查線上版本');
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    // no-store rather than no-cache: the pointer file changes on every release, and a cached copy
    // is the one thing that would make an update invisible to a device doing everything else right.
    const response = await fetchImpl(url, { cache: 'no-store', signal: controller?.signal });
    if (!response || response.ok !== true) {
      // The server answered, and what it said was not a release. A 404 on latest.json is a
      // publishing mistake, not a network problem, and the screen says so.
      throw fault('served', `更新伺服器回應 ${response?.status ?? '無回應'}`);
    }
    const body = await response.json().catch(() => null);
    const releaseId = typeof body?.releaseId === 'string' ? body.releaseId : '';
    if (!releaseId) throw fault('served', '更新伺服器的回應不是可用的版本資訊');
    return {
      releaseId,
      version: typeof body?.version === 'string' ? body.version : releaseId,
      minShellVersion: typeof body?.minShellVersion === 'string' ? body.minShellVersion : '',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Tags a failure with which half of it failed, so the screen can tell 無網路 from 更新失敗.
 *
 * `reachable: false` - the request never got an answer (no route, a portal that swallowed it, the
 * timeout above) - is 無網路. `served` - an answer that was not a release - is a failure of the
 * publishing side, and telling a venue their Wi-Fi is down when it is not sends them to fix the
 * wrong thing.
 */
function fault(kind, message) {
  const error = new Error(message);
  error.otaFault = kind;
  return error;
}

/** Which of the two a thrown error was. An abort or a rejected fetch never reached anybody. */
export function faultKindOf(error) {
  return error?.otaFault === 'served' ? 'served' : 'unreachable';
}

/**
 * Is what is published newer than the build running here?
 *
 * Compared on the semantic half, the same rule the shell's `UpdateDecision` uses: every change to
 * the web bundle raises the semantic version (docs/RELEASE_VERSIONING.md §6), so equal semantics
 * means equal content - and a local dev build, whose Release ID is `<version>+dev` and never a
 * real one, is compared on the half that means something.
 */
export function isRemoteNewer(remoteReleaseId, localReleaseId = getWebBundleRelease().releaseId) {
  return compareSemantic(remoteReleaseId, localReleaseId) > 0;
}
