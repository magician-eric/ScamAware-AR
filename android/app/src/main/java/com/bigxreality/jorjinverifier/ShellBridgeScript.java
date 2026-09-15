package com.bigxreality.jorjinverifier;

/**
 * Publishes this APK Shell's identity into the page, so the web side can say which Shell it is
 * running inside without anybody reading it off the phone's App info screen.
 *
 * <h2>Why the page needs this at all</h2>
 * CIBAR ships as two versions that move at different speeds: the APK Shell (native Android, this
 * project) and the Web Bundle (webapp/, replaceable over OTA without reinstalling anything). See
 * {@code docs/RELEASE_VERSIONING.md}. Only the page knows which Web Bundle it is - it was built
 * with that version baked in - and only Android knows which Shell it is. A diagnosis of "which
 * combination is on this device?" needs both halves in one place, and the page is the half a
 * tester can actually look at.
 *
 * <h2>Contract seen by the page</h2>
 * <pre>
 * window.__cibarShell // { version: 1, shellVersion: '1.0.0', versionName: '1.0.0+42.abc1234',
 *                     //   versionCode: 10042, webBundleSource: 'OTA', bundledWebContent: true }
 * window.addEventListener('cibarShellReady', function (event) { event.detail })
 * </pre>
 *
 * <p>Absent in a plain browser, and that is the honest answer there: a page opened on a laptop is
 * not running inside any Shell. The web side treats a missing object as "no Shell", never as an
 * error - see {@code webapp/src/lib/releaseInfo.js}.
 *
 * <p>{@code webBundleSource} replaced {@code flavor} when the online/offline pair became one APK.
 * It answers the same diagnostic question in the architecture that exists now - did the bytes on
 * screen come out of the APK's baseline or out of an over-the-air bundle - and it is the only one
 * of the two questions that still has more than one answer.
 *
 * <p>This is diagnostic information only. No scenario, route or gesture rule may branch on it:
 * {@code bundledWebContent} exists so a diagnostics line can say the content is local, not so the
 * experience can differ between one source and the other. It is always true now - the experience
 * is always served from this device - and is kept because the web side's contract reads it.
 */
final class ShellBridgeScript {
    /** Fired once per page load, right after the object is published. */
    static final String READY_EVENT_NAME = "cibarShellReady";
    static final String BRIDGE_PROPERTY = "__cibarShell";

    private ShellBridgeScript() { }

    /**
     * The script that publishes the Shell descriptor.
     *
     * <p>Not idempotent-guarded the way the gesture and scan bridges are, and deliberately so:
     * those two hold accumulated state that a re-install would wipe, this one holds four constants
     * that are the same on every call. Re-publishing is how a page that reloaded gets it back.
     */
    static String install(String shellVersion, String versionName, long versionCode,
                          String webBundleSource) {
        return ""
                + "(function(){"
                + "var d={"
                + "version:1,"
                + "shellVersion:" + GestureBridgeScript.quote(shellVersion) + ","
                + "versionName:" + GestureBridgeScript.quote(versionName) + ","
                + "versionCode:" + versionCode + ","
                + "webBundleSource:" + GestureBridgeScript.quote(webBundleSource) + ","
                + "bundledWebContent:true"
                + "};"
                + "window." + BRIDGE_PROPERTY + "=d;"
                + "try{window.dispatchEvent(new CustomEvent("
                + GestureBridgeScript.quote(READY_EVENT_NAME) + ",{detail:d}));}catch(e){}"
                + "})();";
    }
}
