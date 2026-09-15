// What /ar-scan is actually doing, layer by layer.
//
// The failure this exists for looks the same from the outside no matter where
// it happened: the scan page shows "無法使用相機" and nothing else. Behind that
// one sentence there are seven separate things that can be broken, and on the
// glasses none of them is observable - the ar-app's WebView has no address
// bar, no DevTools without a USB cable and a laptop, and by the time a tester
// can say "it did not work" the state that would have explained it is gone.
//
// So every layer of the chain reports here, in order:
//
//   descriptor          did the ar-app tell the page a camera exists?
//   cameraSource        which camera did the page then open? (glasses/phone)
//   mjpegRequest        did the page actually request the MJPEG stream?
//   firstFrame          did a frame ever decode, and at what size?
//   streamProbe         (only on failure) what did the server answer?
//   preview             is the element the player sees the one being read?
//   imageRecognition    did the recogniser start?
//   dataset             did the .mind target dataset load?
//   match               has a target been recognised?
//
// Two consumers, deliberately different in what they cost:
//
//   1. `console.info`, always on. Every line here is one line of text at a
//      handful of moments in a visit to /ar-scan - it is not a per-frame log
//      and cannot be one, because each step records at most once per state
//      change. WebLayerController forwards WebView console messages into
//      logcat under the JorjinVerifier tag, so `adb logcat` on the release
//      APK shows this chain with no rebuild, no debug flag and no DevTools.
//      That is the whole reason it is not gated behind a flag: a diagnostic
//      that needs a special build is not available at the moment it is needed.
//
//   2. The on-screen overlay (../../pages/arScan/ArScanDiagnosticsOverlay.jsx),
//      which IS gated - see `isScanDiagnosticsEnabled()`. A player must never
//      see it; a tester holding the glasses with no cable must be able to.
//
// This module records. It never decides anything: no code path branches on a
// diagnostic, so removing it could not change which camera opens or whether a
// target matches.

/** The layers, in the order they must succeed. The overlay renders them in this order. */
export const SCAN_DIAGNOSTIC_STEPS = Object.freeze([
  'descriptor',
  'cameraSource',
  'mjpegRequest',
  'firstFrame',
  'streamProbe',
  'preview',
  'imageRecognition',
  'dataset',
  'match',
]);

/**
 * `ok` reached its good state, `fail` its bad one, `pending` is in flight, and
 * `info` is a fact that is neither (which camera was chosen, say). `opened` is
 * the MJPEG request's own good state and is deliberately not `ok`: the request
 * having been made says nothing about whether a frame came back, and those two
 * being distinguishable is the whole point of splitting `mjpegRequest` from
 * `firstFrame`. The overlay colours by this; nothing else reads it.
 */
export const SCAN_DIAGNOSTIC_STATUSES = Object.freeze(['pending', 'ok', 'opened', 'fail', 'info']);

const LOG_PREFIX = '[ar-scan]';

// The runtime switch, matching the AR gesture layer's
// `__CIBAR_AR_GESTURE_DIAGNOSTICS__` (see
// ../arInteraction/debug/gestureDebugFlag.js) so there is one convention for
// "turn diagnostics on in a build that is already installed".
export const SCAN_DIAGNOSTICS_GLOBAL = '__CIBAR_AR_SCAN_DIAGNOSTICS__';

// Survives the HashRouter navigations inside one visit, which sessionStorage
// is for and a URL flag is not: the flag arrives on the entry URL and the
// player then walks language -> tutorial -> /ar-scan, and the overlay has to
// still be on when they get there.
export const SCAN_DIAGNOSTICS_STORAGE_KEY = 'cibar:ar-scan-diagnostics';

// Latest state per step. A Map rather than a list because the overlay wants
// "where are we now", not a transcript - the transcript is the console log.
const records = new Map();
const listeners = new Set();

function now(scope) {
  const value = scope?.performance?.now?.();
  return typeof value === 'number' ? Math.round(value) : 0;
}

/**
 * Format a detail object the way a logcat line should read: flat, one
 * `key=value` per fact, no JSON punctuation to squint through. Values that are
 * already strings are printed bare so a URL stays clickable-looking.
 */
export function formatDiagnosticDetail(detail) {
  if (detail === null || detail === undefined) return '';
  if (typeof detail !== 'object') return String(detail);
  return Object.entries(detail)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
}

/**
 * Record one layer's state.
 *
 * @param {string} step - one of SCAN_DIAGNOSTIC_STEPS.
 * @param {string} status - one of SCAN_DIAGNOSTIC_STATUSES.
 * @param {object|string} [detail] - the numbers that make the state
 *   actionable: a stream URL, a frame size, an HTTP status. Kept as data (not
 *   a pre-formatted sentence) so the overlay and the log can each render it
 *   their own way.
 * @param {object} [options]
 * @param {object} [options.scope] - the global, for tests.
 * @returns {object} the stored record.
 */
export function recordScanDiagnostic(step, status, detail = null, { scope = globalThis } = {}) {
  const record = Object.freeze({ step, status, detail, at: now(scope) });
  records.set(step, record);

  const text = formatDiagnosticDetail(detail);
  const line = `${LOG_PREFIX} ${step}: ${status}${text ? ` ${text}` : ''}`;
  // `console.info` for every state including failures, on purpose: a
  // `console.error` on the glasses reaches exactly the same logcat line, and
  // an error-level log from a page is a signal to some crash reporters that
  // something went wrong with the *page*, which is not what a camera that is
  // still starting up means.
  scope?.console?.info?.(line);

  listeners.forEach((listener) => {
    try {
      listener(record);
    } catch {
      // A broken listener is an overlay bug. It must not be able to take the
      // camera down with it - this module is on the path that opens it.
    }
  });
  return record;
}

/** The current state of every layer that has reported, in SCAN_DIAGNOSTIC_STEPS order. */
export function getScanDiagnostics() {
  return SCAN_DIAGNOSTIC_STEPS.filter((step) => records.has(step)).map((step) => records.get(step));
}

/** The current state of one layer, or null if it has not reported yet. */
export function getScanDiagnostic(step) {
  return records.get(step) ?? null;
}

/** @returns {() => void} unsubscribe. */
export function subscribeScanDiagnostics(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Forget everything recorded so far.
 *
 * Called when /ar-scan mounts: the page is the unit being diagnosed, and a
 * second visit that succeeds must not be read through the first visit's
 * failures still sitting on the overlay.
 */
export function resetScanDiagnostics() {
  records.clear();
}

/**
 * Whether the on-screen overlay may be shown. Three ways in, none of them on
 * for a player:
 *
 *   npm run dev                     import.meta.env.DEV
 *   ?diag=1 anywhere in the URL     what a tester types, or the ar-app opens
 *   __CIBAR_AR_SCAN_DIAGNOSTICS__   set from a WebView inspector or by the
 *                                   ar-app, to turn it on in an installed APK
 *
 * The URL flag is sticky for the session (see SCAN_DIAGNOSTICS_STORAGE_KEY):
 * it can only be given on the entry URL, and /ar-scan is four screens later.
 */
export function isScanDiagnosticsEnabled(env = import.meta.env ?? {}, scope = globalThis) {
  if (env?.DEV === true) return true;
  if (scope?.[SCAN_DIAGNOSTICS_GLOBAL] === true) return true;

  let sticky = null;
  try {
    sticky = scope?.sessionStorage?.getItem?.(SCAN_DIAGNOSTICS_STORAGE_KEY) ?? null;
  } catch {
    // Private browsing, or a WebView with storage disabled. The URL flag below
    // still works; it just has to be on the URL that is open.
  }
  if (sticky === '1') return true;

  const href = typeof scope?.location?.href === 'string' ? scope.location.href : '';
  // A substring test rather than URL parsing, because the flag has to be
  // findable in either half of `.../ScamAware-AR/?diag=1#/ar-scan` - HashRouter puts
  // the route after the query, and a `?diag=1` typed after the hash is inside
  // the fragment where `URLSearchParams(location.search)` would never see it.
  if (!/[?&]diag=1(?:&|$|#)/.test(href)) return false;

  try {
    scope?.sessionStorage?.setItem?.(SCAN_DIAGNOSTICS_STORAGE_KEY, '1');
  } catch {
    // Nothing to do: the flag is still true for this page load.
  }
  return true;
}
