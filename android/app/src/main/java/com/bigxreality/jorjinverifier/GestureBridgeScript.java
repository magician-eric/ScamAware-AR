package com.bigxreality.jorjinverifier;

import java.util.Locale;

/**
 * The JavaScript half of the Android -> WebView gesture bridge, built as plain strings so it can
 * be unit tested on the JVM without a device.
 *
 * <p>Only one direction exists: Android hands a gesture that the ToF pipeline already recognised
 * to the page, and the page is free to ignore it.  Nothing here reaches back into Android, and
 * nothing here touches the page's DOM at all - this script used to paint a "Jorjin Gesture /
 * Last: / Count:" readout into the top-right corner of CIBAR, and that engineering overlay is
 * gone.  The counters it displayed are still tracked, and still readable from the page through
 * {@code window.__jorjinGestureBridge}; nothing is drawn.
 *
 * <h2>Contract seen by the page</h2>
 * <pre>
 * window.addEventListener('jorjinGesture', function (event) {
 *   event.detail // { gesture: 'PUSH', label: '推進 PUSH', count: 12, at: 8123456 }
 * })
 * </pre>
 * {@code detail.gesture} is the bare uppercase code from {@link GestureLabels#code(int)} - the
 * same vocabulary CIBAR's own AR gesture bridge speaks - so an adapter on the web side has
 * nothing to translate beyond picking the codes it cares about.
 *
 * <p>{@code window.__jorjinGestureBridge} is also published for a page that loads after a gesture
 * has already happened: it exposes the last gesture and the running count. A
 * {@code jorjinGestureBridgeReady} event fires once per page load for listeners that want to know
 * they are running inside the AR app rather than a desktop browser.
 */
final class GestureBridgeScript {
    /** The single global event CIBAR has to listen for. */
    static final String EVENT_NAME = "jorjinGesture";
    /** Fired once per page load, right after the bridge object is published. */
    static final String READY_EVENT_NAME = "jorjinGestureBridgeReady";
    static final String BRIDGE_PROPERTY = "__jorjinGestureBridge";

    private GestureBridgeScript() { }

    /**
     * Idempotent installer.  It is prepended to every call rather than run once on page load,
     * because a hash-route change, a service-worker refresh or a reload can drop the window
     * object between the load callback and the next gesture; re-running costs one property
     * lookup when the bridge is already there.
     */
    private static final String INSTALL = ""
            + "(function(){"
            + "var NAME=" + quote(EVENT_NAME) + ";"
            + "if(window." + BRIDGE_PROPERTY + "){return;}"
            + "var state={last:'\\u2014',count:0};"
            + "window." + BRIDGE_PROPERTY + "={"
            + "version:1,"
            + "eventName:NAME,"
            + "getLastGesture:function(){return state.last;},"
            + "getGestureCount:function(){return state.count;},"
            + "sync:function(last,count){state.last=last;state.count=count;},"
            + "deliver:function(detail){"
            + "state.last=detail.gesture;state.count=detail.count;"
            + "try{window.dispatchEvent(new CustomEvent(NAME,{detail:detail}));}"
            + "catch(e){"
            + "var ev=document.createEvent('CustomEvent');"
            + "ev.initCustomEvent(NAME,false,false,detail);"
            + "window.dispatchEvent(ev);"
            + "}"
            + "}"
            + "};"
            + "try{window.dispatchEvent(new CustomEvent(" + quote(READY_EVENT_NAME)
            + ",{detail:{version:1,eventName:NAME}}));}catch(e){}"
            + "})();";

    /** Publishes the bridge without reporting any gesture. */
    static String install() {
        return INSTALL;
    }

    /**
     * Restores the counters after a page load so a freshly loaded CIBAR reads the totals Android
     * has actually counted rather than restarting from zero.  No
     * {@link #EVENT_NAME} event is dispatched: nothing new happened.
     */
    static String sync(String lastGesture, long count) {
        return INSTALL + "window." + BRIDGE_PROPERTY + ".sync("
                + quote(lastGesture == null ? "—" : lastGesture) + "," + count + ");";
    }

    /** Reports one accepted gesture: updates the counters and fires {@link #EVENT_NAME}. */
    static String deliver(String gesture, String label, long count, long atMs) {
        return INSTALL + "window." + BRIDGE_PROPERTY + ".deliver({"
                + "gesture:" + quote(gesture) + ","
                + "label:" + quote(label) + ","
                + "count:" + count + ","
                + "at:" + atMs
                + "});";
    }

    /**
     * JavaScript string literal.  The gesture vocabulary is a closed set of ASCII words today, so
     * this is belt-and-braces - but the label is human text from the SDK, and an unescaped quote
     * or line separator there would turn a diagnostic into a syntax error with no visible cause.
     */
    static String quote(String value) {
        if (value == null) return "null";
        StringBuilder out = new StringBuilder(value.length() + 2).append('"');
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '"': out.append("\\\""); break;
                case '\\': out.append("\\\\"); break;
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                case '\t': out.append("\\t"); break;
                // Not required by evaluateJavascript, but keeps the literal safe if the same
                // string is ever emitted into an HTML <script> block.
                case '<': out.append("\\u003c"); break;
                case '>': out.append("\\u003e"); break;
                case '&': out.append("\\u0026"); break;
                // U+2028/U+2029 terminate a line in JavaScript but not in JSON.
                case 0x2028: out.append("\\u2028"); break;
                case 0x2029: out.append("\\u2029"); break;
                default:
                    if (c < 0x20 || c == 0x7f) {
                        out.append(String.format(Locale.ROOT, "\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
            }
        }
        return out.append('"').toString();
    }
}
