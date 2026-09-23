// ScamAware-iOS: which build this is.
//
// Two halves, both read-only:
//   * the web content baked into the app at build time (`__SCAMAWARE_IOS_BUNDLE__`,
//     defined in vite.config.js from ScamAware-iOS/version.json), and
//   * the native iOS app hosting it (`window.__scamAwareIOS`, injected by
//     WebViewController.swift before any page script runs).
//
// The Android build's Shell descriptor (`window.__cibarShell`) and OTA state are
// not used here: this port has no OTA updater at all.

const WEB_BUNDLE =
  typeof __SCAMAWARE_IOS_BUNDLE__ === 'undefined'
    ? { iosVersion: '0.0.0', gitCommit: '' }
    : __SCAMAWARE_IOS_BUNDLE__;

export function getWebBundleRelease() {
  return { ...WEB_BUNDLE };
}

/** The native app, or null when the page is opened in a plain browser (npm run dev). */
export function getIosAppRelease() {
  if (typeof window === 'undefined') return null;
  const app = window.__scamAwareIOS;
  if (!app || typeof app !== 'object') return null;
  return {
    version: app.version ?? 'unknown',
    build: app.build ?? 'unknown',
    bundleId: app.bundleId ?? '',
  };
}

export function describeRelease() {
  const app = getIosAppRelease();
  const bundle = getWebBundleRelease();
  return `ScamAware-iOS ${app ? `${app.version} (${app.build})` : 'browser'} · web ${bundle.iosVersion}`;
}

/** Logged once at start-up; visible in Safari Web Inspector. Draws nothing. */
export function publishReleaseInfo() {
  if (typeof window === 'undefined') return;
  window.__scamAwareRelease = { webBundle: getWebBundleRelease(), iosApp: getIosAppRelease() };
  console.info(`[ScamAware-iOS] ${describeRelease()}`);
}
