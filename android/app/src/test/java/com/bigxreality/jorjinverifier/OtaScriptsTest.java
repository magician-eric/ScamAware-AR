package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * The two scripts the shell injects into the page after it loads, pinned as text.
 *
 * <p>They are Java strings that become JavaScript, which is the worst place for a typo to live: a
 * syntax error inside {@code evaluateJavascript} is not a compile error, is not an exception, and
 * is not visible on screen. It is a global that is simply never defined - indistinguishable from a
 * shell that never injected one at all.
 */
public class OtaScriptsTest {

    // ------------------------------------------------------------------ the Service Worker guard

    /**
     * Native OTA is this shell's version control, and a Service Worker sits above it.
     *
     * <p>A worker intercepts fetches before {@code shouldInterceptRequest} is ever consulted, and
     * answers them out of Cache Storage - which belongs to the origin, and the origin is
     * deliberately the same for every bundle this phone has ever run. So a stale worker produces
     * the state that is hardest to diagnose: the native side is correctly running v20, the files on
     * disk are v20, the diagnostics say v20, and the page on screen is v19. Reinstalling the APK
     * would not fix it.
     */
    @Test public void theGuardUnregistersWorkersAndEmptiesTheirCaches() {
        String script = ServiceWorkerGuardScript.install();
        assertTrue("must unregister every worker on this origin",
                script.contains("getRegistrations()") && script.contains("unregister()"));
        assertTrue("and empty the Cache Storage they answered out of",
                script.contains("caches.keys()") && script.contains("caches.delete(k)"));
    }

    /**
     * It has to survive being run where neither API exists.
     *
     * <p>{@code navigator.serviceWorker} is undefined on an insecure origin and {@code window
     * .caches} can be absent entirely. An uncaught reference error here would abort the injected
     * script before the diagnostics that follow it, so the failure would show up as missing
     * diagnostics rather than as anything to do with a Service Worker.
     */
    @Test public void theGuardCannotThrow() {
        String script = ServiceWorkerGuardScript.install();
        assertTrue(script.startsWith("(function(){try{"));
        assertTrue(script.endsWith("}catch(e){}})();"));
        assertTrue("both feature tests are guarded",
                script.contains("if(navigator.serviceWorker&&navigator.serviceWorker.getRegistrations)")
                        && script.contains("if(window.caches&&caches.keys)"));
        assertTrue("and both promises have a rejection handler",
                countOccurrences(script, ".catch(function(){})") == 2);
    }

    // ------------------------------------------------------------------ the diagnostics bridge

    @Test public void theDiagnosticsArePublishedAsAGlobalAndAnEvent() {
        String script = OtaDiagnosticsScript.install("{\"activeVersion\":\"1.0.0-20260825.001\"}");
        assertTrue(script.contains("window.__cibarOta={\"activeVersion\":\"1.0.0-20260825.001\"};"));
        assertTrue("a page that loaded before the injection needs to hear about it",
                script.contains("new CustomEvent('cibarOtaReady'"));
        assertTrue(script.contains("detail:window.__cibarOta"));
    }

    /**
     * An empty or missing payload publishes an empty object rather than a syntax error.
     *
     * <p>{@code window.__cibarOta=;} is not JavaScript, and the whole injected script - including
     * the event - would be discarded silently. An empty object is a page that can ask and get
     * nothing back, which is what a page in a browser during development already gets.
     */
    @Test public void nothingToReportIsStillValidJavaScript() {
        for (String empty : new String[] {null, "", "   "}) {
            assertTrue(String.valueOf(empty),
                    OtaDiagnosticsScript.install(empty).contains("window.__cibarOta={};"));
        }
    }

    @Test public void theDiagnosticsCannotThrowEither() {
        String script = OtaDiagnosticsScript.install("{}");
        assertTrue(script.startsWith("(function(){try{"));
        assertTrue(script.endsWith("}catch(e){}})();"));
    }

    /**
     * Neither script is allowed to be part of the experience.
     *
     * <p>Both are injected after the page has loaded, so they are absent for the whole of first
     * paint, and both are absent entirely when the same build runs in a desktop browser during
     * development. A page that branched on the presence of an update mechanism would behave
     * differently in the two places the same build has to work - so nothing here writes anything
     * the experience could read as a flag, beyond one namespaced global.
     */
    // ------------------------------------------------------------------ the staff mode's controls

    /**
     * The one page → native path in the app, and the only thing the page can <em>call</em>.
     *
     * <p>Everything else the shell publishes is passive - a descriptor, a diagnostics blob. This
     * exists because the update mechanism gained an operator: a venue about to run a session needs
     * to be able to ask for an update at a moment of their choosing, and to take it before the
     * session rather than during it.
     */
    @Test public void theControlBridgeWrapsTheNativeObjectInAStableApi() {
        String script = OtaControlBridgeScript.install();
        assertTrue("it wraps the injected object, it does not re-implement it",
                script.contains("var n=window.__cibarOtaNative;"));
        for (String method : new String[] {
                "checkForUpdate", "downloadUpdate", "restartToApplyUpdate", "refresh"}) {
            assertTrue("the staff screen calls " + method,
                    script.contains("call('" + method + "');"));
        }
        assertTrue("and a page that loaded before the injection needs to hear about it",
                script.contains("new CustomEvent(\"cibarOtaControlReady\""));
    }

    /**
     * No native object, no wrapper - and no exception either.
     *
     * <p>The same script is only ever injected by the shell, but the object it wraps can be absent
     * for a moment on a rebuilt WebView. Writing a wrapper whose methods throw would be worse than
     * writing none: the staff screen tests for {@code window.__cibarOtaControl} to decide whether
     * this device has an APK Shell at all, and a wrapper around nothing would make an iPhone look
     * like one.
     */
    @Test public void theControlBridgeIsAbsentRatherThanBrokenWithoutTheNativeObject() {
        String script = OtaControlBridgeScript.install();
        assertTrue("it must bail out rather than define a broken wrapper",
                script.contains("if(!n)return;"));
        assertTrue(script.startsWith("(function(){try{"));
        assertTrue(script.endsWith("}catch(e){}})();"));
        assertTrue("every native call is individually guarded",
                script.contains("function call(name){try{n[name]();}catch(e){}}"));
    }

    /** The live phase is published the same way the diagnostics are: a global and an event. */
    @Test public void theStatusIsPublishedAsAGlobalAndAnEvent() {
        String script = OtaControlBridgeScript.status("{\"phase\":\"downloading\"}");
        assertTrue(script.contains("window.__cibarOtaStatus={\"phase\":\"downloading\"};"));
        assertTrue(script.contains("new CustomEvent(\"cibarOtaStatus\""));
        assertTrue(script.contains("detail:window.__cibarOtaStatus"));
    }

    /** And an empty payload is an empty object, not the syntax error {@code window.x=;} is. */
    @Test public void anEmptyStatusIsStillValidJavaScript() {
        for (String empty : new String[] {null, "", "   "}) {
            assertTrue(String.valueOf(empty),
                    OtaControlBridgeScript.status(empty).contains("window.__cibarOtaStatus={};"));
        }
    }

    /**
     * The controls stay out of everything the experience owns.
     *
     * <p>Same rule as the diagnostics: two namespaced globals and two events, and nothing that a
     * scenario could read or that could change what a wearer sees. In particular nothing here
     * reloads or navigates - the restart is a native relaunch, deliberately, because promotion
     * happens in {@code onCreate} and a page-level reload would promote nothing.
     */
    @Test public void theControlScriptsTouchNothingTheExperienceOwns() {
        String both = OtaControlBridgeScript.install() + OtaControlBridgeScript.status("{}");
        for (String forbidden : new String[] {
                "location.reload", "location.href", "localStorage", "sessionStorage",
                "document.write", "history.", "__jorjinCamera", "__jorjinScanBridge"}) {
            assertFalse("the update controls must not touch " + forbidden, both.contains(forbidden));
        }
        assertEquals("one control global", 1, countOccurrences(both, "window.__cibarOtaControl="));
        assertEquals("one status global", 1, countOccurrences(both, "window.__cibarOtaStatus="));
    }

    // ------------------------------------------------------------------ the probe's policy

    /**
     * The probe never stops asking, and that is the whole safety argument.
     *
     * <p>Confirming a launch is one boolean in state.json, and
     * {@link com.bigxreality.jorjinverifier.ota.WebBundleStore#markLaunchSucceeded()} has no
     * window - the demotion it prevents is only read at the NEXT launch, so a confirmation that
     * arrives at twenty seconds is worth exactly as much as one at two. Giving up, on the other
     * hand, demotes a working bundle on any device slower than whatever deadline was picked, and
     * the slower the device the more likely it is. There is no deadline that is safe in that
     * direction.
     *
     * <p>This is source-level and blunt on purpose. The failure it guards against is somebody
     * reading a two-second poll that runs for a whole session and "tidying" it into a timeout,
     * which would look like an optimisation and would silently start demoting good bundles on
     * exactly the phones least able to spare an 80 MiB re-download.
     */
    @Test public void theMountProbeHasNoDeadline() throws java.io.IOException {
        String controller = webLayerController();
        assertTrue("a slow phase is what replaces a timeout",
                controller.contains("APP_MOUNT_SLOW_AFTER_MILLIS")
                        && controller.contains("APP_MOUNT_SLOW_POLL_MILLIS"));
        assertFalse("a timeout is the thing this must not grow back",
                controller.contains("APP_MOUNT_TIMEOUT_MILLIS"));
        // Passing the slow mark changes the cadence and says so once. It must not return, and it
        // must not clear the pending probe - either would be giving up under another name.
        int slowMark = controller.indexOf("boolean slow = SystemClock");
        assertTrue("the probe must decide slow-vs-fast rather than expired-vs-live", slowMark > 0);
        String afterSlow = controller.substring(slowMark,
                controller.indexOf("} catch (Throwable unavailable)", slowMark));
        assertFalse("passing the slow mark must not stop the probe",
                afterSlow.contains("pendingMountProbe = null"));
        assertTrue("it must re-post itself either way", afterSlow.contains("postDelayed(this"));
    }

    /**
     * And it is cancelled when the WebView goes.
     *
     * <p>A Runnable that posts itself back to the main thread forever, holding a WebView that has
     * been destroyed, is an activity that never gets collected. The probe having no deadline is
     * what makes this necessary: with a timeout it would have expired on its own eventually.
     */
    @Test public void theMountProbeStopsWhenTheWebViewDoes() throws java.io.IOException {
        String controller = webLayerController();
        int destroy = controller.indexOf("    void destroy() {");
        assertTrue("WebLayerController must still have a destroy()", destroy > 0);
        String body = controller.substring(destroy,
                controller.indexOf("webView.destroy();", destroy));
        assertTrue("destroy() must cancel the probe before releasing the WebView",
                body.contains("cancelMountProbe()"));
    }

    private static String webLayerController() throws java.io.IOException {
        java.io.File file = new java.io.File(
                "src/main/java/com/bigxreality/jorjinverifier/WebLayerController.java");
        if (!file.isFile()) {
            file = new java.io.File(
                    "android/app/src/main/java/com/bigxreality/jorjinverifier/WebLayerController.java");
        }
        assertTrue("找不到 WebLayerController.java：" + file.getAbsolutePath(), file.isFile());
        return new String(java.nio.file.Files.readAllBytes(file.toPath()),
                java.nio.charset.StandardCharsets.UTF_8);
    }

    // ------------------------------------------------------------------ the app-mounted probe

    /**
     * The probe is the rollback gate's eyes, and it is the only part of that gate that runs as
     * text rather than as Java.
     *
     * <p>What it has to get right is narrow. It is asked repeatedly, on the main thread, of a page
     * that may be in any state - mid-boot, mid-throw, or a document the shell rendered itself -
     * and the caller confirms a launch on the strength of a literal {@code "true"} coming back.
     * Anything else it could return (an exception, {@code undefined}, a string) has to read as
     * "not yet", because "not yet" is the safe answer and "true" is the one that clears the
     * counter that would otherwise roll a broken bundle back.
     */
    @Test public void theMountProbeAsksWhetherAnythingWasRendered() {
        String probe = AppMountedProbeScript.probe();
        assertTrue("it must look at the div webapp/index.html actually ships",
                probe.contains("getElementById('root')"));
        assertTrue("an app that mounted has children under it",
                probe.contains("childElementCount>0"));
        // A boot that 404'd or threw leaves #root exactly as index.html shipped it, which is the
        // whole signal: empty div, page "loaded", white screen.
        assertTrue("and the answer has to be the literal the caller compares against",
                probe.contains("return true"));
    }

    /**
     * It cannot throw, and it cannot answer "true" by accident.
     *
     * <p>An exception inside {@code evaluateJavascript} does not surface anywhere the caller can
     * see it; what comes back is {@code null}, which the caller reads as "not yet" and retries
     * until it gives up. That is the correct outcome, and the try/catch is what guarantees it is
     * the outcome rather than an unhandled rejection in the page's own console.
     */
    @Test public void theMountProbeCannotThrowAndDefaultsToNo() {
        String probe = AppMountedProbeScript.probe();
        assertTrue("every path has to be inside a try", probe.contains("try{"));
        assertTrue("and the catch has to answer no, not rethrow",
                probe.contains("catch(e){return false;}"));
        assertTrue("it must be one self-contained expression statement",
                probe.startsWith("(function(){") && probe.endsWith("})();"));
    }

    /**
     * It reads the page and writes nothing to it.
     *
     * <p>A probe that ran on every launch and left something behind would be a shell feature the
     * experience could observe - and the first thing anybody would do with it is branch on it,
     * which makes the same bundle behave differently on a phone and in a browser.
     */
    @Test public void theMountProbeOnlyLooks() {
        String probe = AppMountedProbeScript.probe();
        for (String mutation : new String[] {
                "window.__", "localStorage", "sessionStorage", "innerHTML", "appendChild",
                "addEventListener", "dispatchEvent", "document.write", "fetch(", "location"}) {
            assertFalse("the probe must not " + mutation, probe.contains(mutation));
        }
    }

    @Test public void neitherScriptTouchesAnythingTheExperienceOwns() {
        String both = ServiceWorkerGuardScript.install() + OtaDiagnosticsScript.install("{}");
        assertEquals("exactly one global is written, and it is namespaced",
                1, countOccurrences(both, "window.__cibarOta="));
        for (String forbidden : new String[] {
                "location.reload", "location.href", "localStorage", "sessionStorage",
                "document.write", "history.", "__jorjinCamera", "__jorjinScanBridge"}) {
            assertFalse("the update scripts must not touch " + forbidden, both.contains(forbidden));
        }
    }

    private static int countOccurrences(String haystack, String needle) {
        int count = 0;
        for (int at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) {
            count++;
        }
        return count;
    }
}
