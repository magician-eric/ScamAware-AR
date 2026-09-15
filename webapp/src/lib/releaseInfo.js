// Which CIBAR is this?
//
// Two versions answer that, and they move independently (docs/RELEASE_VERSIONING.md):
//
//   Shell Version       the Android APK. Changes only when native code changes.
//   Web Bundle Version  this build of webapp/. Changes on every web release, and reaches an
//                       installed Shell over OTA without anybody reinstalling anything.
//
// So "1.0.0" on its own never identifies a device. The pair does, and this module is where the
// two halves meet: the Web Bundle version is compiled in (vite.config.js `define`), the Shell
// version is published into the page by the APK (ShellBridgeScript on the Android side), and in a
// plain browser there is no Shell at all - which is reported as such, not as an error.

/**
 * Baked in at build time. The fallback is for a consumer that somehow loaded this module without
 * the define in place (a bare unit-test import, an editor preview); it names itself as unknown
 * rather than inventing a version, because a wrong version in a diagnosis is worse than none.
 */
const WEB_BUNDLE =
  typeof __CIBAR_WEB_BUNDLE__ === 'undefined'
    ? {
        webBundleVersion: '0.0.0',
        releaseId: 'unknown',
        gitCommit: '',
        minShellVersion: '0.0.0',
      }
    : __CIBAR_WEB_BUNDLE__;

/**
 * This build of the web experience.
 *
 * `releaseId` is the full Release ID (`1.0.3-20260825.002`) only when CI built this bundle for a
 * real OTA release. A dev or preview build says `<version>+dev`, which is the honest answer:
 * nothing was released.
 */
export function getWebBundleRelease() {
  return { ...WEB_BUNDLE };
}

/**
 * The APK Shell hosting this page, or `null` in a browser.
 *
 * Read fresh on every call rather than captured once: the descriptor is published by the Android
 * side on page load, which can land after any module here has finished evaluating.
 */
export function getShellRelease() {
  if (typeof window === 'undefined') return null;
  const shell = window.__cibarShell;
  if (!shell || typeof shell !== 'object') return null;
  return {
    shellVersion: shell.shellVersion ?? 'unknown',
    versionName: shell.versionName ?? '',
    versionCode: shell.versionCode ?? 0,
    webBundleSource: shell.webBundleSource ?? '',
    bundledWebContent: shell.bundledWebContent === true,
  };
}

/** One line naming both halves - what a diagnostics surface or a bug report needs. */
export function describeRelease() {
  const shell = getShellRelease();
  const bundle = getWebBundleRelease();
  return `Shell ${shell ? shell.shellVersion : 'n/a (browser)'} · Bundle ${bundle.releaseId}`;
}

/**
 * Publishes the same pair as a global and logs it once.
 *
 * On the glasses there is no console to open and no address bar to type into: the log line is
 * what `adb logcat` shows, and `window.__cibarRelease` is what a remote-debugging session can
 * read. Neither draws anything - the production app has no engineering UI, deliberately.
 */
export function publishReleaseInfo() {
  if (typeof window === 'undefined') return;
  const info = {
    webBundle: getWebBundleRelease(),
    get shell() {
      return getShellRelease();
    },
  };
  window.__cibarRelease = info;
  const bundle = info.webBundle;
  // eslint-disable-next-line no-console
  console.info(
    `[CIBAR] web bundle ${bundle.webBundleVersion} (release ${bundle.releaseId}` +
      `${bundle.gitCommit ? `, commit ${bundle.gitCommit}` : ''}` +
      `, needs Shell >= ${bundle.minShellVersion})`,
  );
}
