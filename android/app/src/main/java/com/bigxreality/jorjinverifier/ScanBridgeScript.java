package com.bigxreality.jorjinverifier;

/**
 * The JavaScript half of the Android -> WebView scan bridge, built as plain strings so it can be
 * unit tested on the JVM without a device.
 *
 * <h2>Why recognition is done natively</h2>
 * The glasses' RGB camera is a USB UVC device held open by JJSDK. A WebView's
 * {@code getUserMedia} enumerates Android's camera2 devices and can never see it, so a page that
 * asks the browser for a camera gets the <em>phone's</em> - which, on someone wearing the
 * glasses, points at their chest. Recognition therefore happens here, against the frames JJSDK
 * hands us, and only the result crosses into the page.
 *
 * <h2>Contract seen by the page</h2>
 * <pre>
 * window.addEventListener('jorjinScan', function (event) {
 *   event.detail // { targetIndex: 0, scenario: 'investment', confidence: 0.93, at: 8123456 }
 *   navigate(routeForTargetIndex(event.detail.targetIndex))
 * })
 * </pre>
 *
 * <p>{@code targetIndex} is the primary field and is what CIBAR's existing
 * {@code routeForTargetIndex()} takes - 0 to 4, in the order the five reference images are
 * registered. {@code scenario} carries the same answer as a name ({@code investment},
 * {@code romance}, {@code authority}, {@code fakeSeller}, {@code fakeBuyer}) so that a
 * disagreement between the two sides' ordering shows up as a mismatch instead of silently
 * opening the wrong scenario.
 */
final class ScanBridgeScript {
    /** The single global event CIBAR has to listen for. */
    static final String EVENT_NAME = "jorjinScan";
    /** Fired once per page load, right after the bridge object is published. */
    static final String READY_EVENT_NAME = "jorjinScanBridgeReady";
    static final String BRIDGE_PROPERTY = "__jorjinScanBridge";

    private ScanBridgeScript() { }

    /**
     * Idempotent installer, prepended to every call for the same reason the gesture bridge does
     * it: a hash-route change or a reload can drop the window object between the load callback
     * and the next result.
     */
    private static final String INSTALL = ""
            + "(function(){"
            + "var NAME=" + GestureBridgeScript.quote(EVENT_NAME) + ";"
            + "if(window." + BRIDGE_PROPERTY + "){return;}"
            + "var last=null;"
            + "window." + BRIDGE_PROPERTY + "={"
            + "version:1,"
            + "eventName:NAME,"
            + "getLastScan:function(){return last;},"
            + "deliver:function(detail){"
            + "last=detail;"
            + "try{window.dispatchEvent(new CustomEvent(NAME,{detail:detail}));}"
            + "catch(e){"
            + "var ev=document.createEvent('CustomEvent');"
            + "ev.initCustomEvent(NAME,false,false,detail);"
            + "window.dispatchEvent(ev);"
            + "}"
            + "}"
            + "};"
            + "try{window.dispatchEvent(new CustomEvent("
            + GestureBridgeScript.quote(READY_EVENT_NAME)
            + ",{detail:{version:1,eventName:NAME}}));}catch(e){}"
            + "})();";

    static String install() {
        return INSTALL;
    }

    /** Reports one recognised target. */
    static String deliver(int targetIndex, String scenario, float confidence, long atMs) {
        return INSTALL + "window." + BRIDGE_PROPERTY + ".deliver({"
                + "targetIndex:" + targetIndex + ","
                + "scenario:" + GestureBridgeScript.quote(scenario) + ","
                + "confidence:" + formatConfidence(confidence) + ","
                + "at:" + atMs
                + "});";
    }

    /**
     * Two decimals, always with a leading digit and always parseable as a JavaScript number.
     * {@code Float.toString} can produce {@code 1.0E-4}, which is valid JS, and {@code NaN} or
     * {@code Infinity}, which are not - they would make the whole call a syntax error and the
     * page would simply never hear about the scan.
     */
    static String formatConfidence(float confidence) {
        if (Float.isNaN(confidence) || Float.isInfinite(confidence)) return "0";
        float clamped = Math.max(0f, Math.min(1f, confidence));
        return String.format(java.util.Locale.ROOT, "%.2f", clamped);
    }
}
