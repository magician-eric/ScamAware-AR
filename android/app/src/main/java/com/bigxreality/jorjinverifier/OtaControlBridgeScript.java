package com.bigxreality.jorjinverifier;

/**
 * The web → native half of the update mechanism: what the staff management mode presses.
 *
 * <p>Everything else the shell publishes into the page is one-way and passive - the Shell
 * descriptor, the OTA diagnostics, the camera descriptor. This is the first thing the page can
 * <em>call</em>, and it exists because the update mechanism gained an operator. Until now the only
 * update was the one that starts by itself at launch and finishes without telling anybody; a
 * venue about to run a session needs to be able to ask "is there a new version" at a moment of
 * their choosing, and to take it before the session rather than during it.
 *
 * <h2>What the page sees</h2>
 * <pre>
 * window.__cibarOtaControl // { version: 1, available: true, checkForUpdate(), downloadUpdate(),
 *                          //   restartToApplyUpdate(), refresh() }
 * window.__cibarOtaStatus  // { phase, detail, version, busy, updatedAt } - see OtaUpdateStatus
 * window.addEventListener('cibarOtaControlReady', ...)
 * window.addEventListener('cibarOtaStatus', ...)
 * </pre>
 *
 * <p>Every method returns immediately and answers through {@code cibarOtaStatus} events instead.
 * A {@code @JavascriptInterface} method runs on a WebView thread, not the UI thread, and blocking
 * one of them for the length of an 80 MiB download would freeze the very screen that is supposed
 * to be showing the download's progress.
 *
 * <h2>Absent in a browser, and that is the contract</h2>
 * A page opened on a laptop or added to an iPhone home screen has no APK Shell under it, so there
 * is no {@code window.__cibarOtaNative} and this script never runs. The staff screen tests for the
 * object and shows the web/PWA controls instead - it must never offer an APK Shell operation that
 * cannot happen. Nothing outside the staff management mode may read any of this.
 */
final class OtaControlBridgeScript {

    /** The name {@code addJavascriptInterface} binds the native object to. */
    static final String NATIVE_OBJECT = "__cibarOtaNative";

    /** The wrapper the page is written against. */
    static final String CONTROL_PROPERTY = "__cibarOtaControl";

    /** Where the live phase lands - {@code OtaUpdateStatus.toJson()}. */
    static final String STATUS_PROPERTY = "__cibarOtaStatus";

    static final String CONTROL_READY_EVENT = "cibarOtaControlReady";
    static final String STATUS_EVENT = "cibarOtaStatus";

    private OtaControlBridgeScript() { }

    /**
     * Wraps the injected native object in a small, stable API.
     *
     * <p>The wrapper is not decoration. {@code addJavascriptInterface} exposes methods that throw
     * into the page's own console when the activity is going away, and it exposes them under a
     * name the page would otherwise have to know; wrapping gives the staff screen one object with
     * one shape, whose every method is safe to call at any time and returns nothing.
     */
    static String install() {
        return "(function(){try{"
                + "var n=window." + NATIVE_OBJECT + ";"
                + "if(!n)return;"
                + "function call(name){try{n[name]();}catch(e){}}"
                + "window." + CONTROL_PROPERTY + "={"
                + "version:1,"
                + "available:true,"
                + "checkForUpdate:function(){call('checkForUpdate');},"
                + "downloadUpdate:function(){call('downloadUpdate');},"
                + "restartToApplyUpdate:function(){call('restartToApplyUpdate');},"
                + "refresh:function(){call('refresh');}"
                + "};"
                + "window.dispatchEvent(new CustomEvent(" + GestureBridgeScript.quote(CONTROL_READY_EVENT)
                + ",{detail:window." + CONTROL_PROPERTY + "}));"
                + "}catch(e){}})();";
    }

    /**
     * Publishes one live status snapshot.
     *
     * @param statusJson {@code OtaUpdateStatus.toJson()} - produced by {@code org.json}, so it is
     *                   already a valid JavaScript object literal. An empty or missing payload
     *                   publishes {@code {}} rather than the syntax error {@code window.x=;}
     *                   would be, which would discard the event with it.
     */
    static String status(String statusJson) {
        String value = statusJson == null || statusJson.trim().isEmpty() ? "{}" : statusJson;
        return "(function(){try{"
                + "window." + STATUS_PROPERTY + "=" + value + ";"
                + "window.dispatchEvent(new CustomEvent(" + GestureBridgeScript.quote(STATUS_EVENT)
                + ",{detail:window." + STATUS_PROPERTY + "}));"
                + "}catch(e){}})();";
    }
}
