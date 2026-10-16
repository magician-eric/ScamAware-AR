package com.bigxreality.jorjinverifier;

import android.os.SystemClock;
import android.webkit.JavascriptInterface;

/**
 * The staff management mode's 現場環境檢測 reading the ToF sensor: bound into the page as
 * {@link #NATIVE_OBJECT} and wrapped by {@link #installScript()} as
 * <pre>
 * window.__cibarEnvironment // { version: 1, available: true, tofSnapshot() -> object | null }
 * window.addEventListener('cibarEnvironmentReady', ...)
 * </pre>
 *
 * <p>One method, read-only and fast: it summarises frames already in memory
 * ({@link TofEnvironmentMeter}) and returns. Nothing here can change what the glasses do. The
 * same reasoning as {@link OtaControlBridge} makes the interface safe to expose: every byte the
 * page loads is answered from this device, from a bundle whose SHA-256 was checked.
 */
final class EnvironmentCheckBridge {
    static final String NATIVE_OBJECT = "__cibarEnvironmentNative";
    static final String PROPERTY = "__cibarEnvironment";
    static final String READY_EVENT = "cibarEnvironmentReady";

    private final TofEnvironmentMeter meter;

    EnvironmentCheckBridge(TofEnvironmentMeter meter) {
        this.meter = meter;
    }

    /** The last {@link TofEnvironmentMeter#WINDOW_MS} of ToF frames, as JSON. */
    @JavascriptInterface public String tofSnapshot() {
        return meter.snapshot(SystemClock.elapsedRealtime()).toJson();
    }

    /** Wraps the native object so the page sees one stable shape that never throws. */
    static String installScript() {
        return "(function(){try{"
                + "var n=window." + NATIVE_OBJECT + ";"
                + "if(!n)return;"
                + "window." + PROPERTY + "={"
                + "version:1,"
                + "available:true,"
                + "tofSnapshot:function(){try{return JSON.parse(n.tofSnapshot());}catch(e){return null;}}"
                + "};"
                + "window.dispatchEvent(new CustomEvent(" + GestureBridgeScript.quote(READY_EVENT)
                + ",{detail:window." + PROPERTY + "}));"
                + "}catch(e){}})();";
    }
}
