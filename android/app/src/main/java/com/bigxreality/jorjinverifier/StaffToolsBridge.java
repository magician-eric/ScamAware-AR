package com.bigxreality.jorjinverifier;

import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * The staff management mode's gesture tools: bound into the page as {@link #NATIVE_OBJECT} and
 * wrapped by {@link #installScript()} as
 * <pre>
 * window.__cibarStaffTools // { version: 1, available: true,
 *                          //   getGestureSettings() -> { maxRangeCm, signalMode, noise, floor } | null,
 *                          //   setGestureSettings({ maxRangeCm, minRangeCm, signalMode }) -> same | null,
 *                          //   liveFrame() -> TofLiveFrame JSON | null,
 *                          //   shareTofLog() -> boolean }
 * window.addEventListener('cibarStaffToolsReady', ...)
 * window.addEventListener('cibarTofLogExport', e => e.detail) // { ok, name?, bytes?, reason? }
 * </pre>
 *
 * <ul>
 *   <li>手勢最遠距離 and 訊號過濾 ({@link GestureSettings}): kept on the phone, applied at once.</li>
 *   <li>即時感測畫面: the newest 8x8 frame and the zones taken for the hand ({@link TofLiveFrame}).</li>
 *   <li>匯出紀錄檔: the frame log into the share sheet ({@link TofLogExport}). It returns at once;
 *       the copy is made on another thread and the outcome arrives as {@link #EXPORT_EVENT}.</li>
 * </ul>
 *
 * <p>Called on a WebView thread. The same reasoning as {@link OtaControlBridge} makes the
 * interface safe to expose: every byte the page loads is answered from this device, from a bundle
 * whose SHA-256 was checked. The settings it can change are the two the staff page offers, each
 * limited to the choices on its buttons.
 */
final class StaffToolsBridge {
    static final String NATIVE_OBJECT = "__cibarStaffToolsNative";
    static final String PROPERTY = "__cibarStaffTools";
    static final String READY_EVENT = "cibarStaffToolsReady";
    static final String EXPORT_EVENT = "cibarTofLogExport";
    private static final String TAG = "JorjinVerifier";

    /** Who does the work. Implemented by the activity. */
    interface Host {
        String gestureSettingsJson();

        String applyGestureSettings(int maxRangeCm, String signalMode, int minRangeCm);

        String liveFrameJson();

        /** Gather the log and offer the share sheet. Must not block. */
        void shareTofLog();
    }

    private final Host host;

    StaffToolsBridge(Host host) {
        this.host = host;
    }

    @JavascriptInterface public String getGestureSettings() {
        return host.gestureSettingsJson();
    }

    /** Shell 1.2.4's two-setting call, kept so nothing that still makes it breaks. */
    @JavascriptInterface public String setGestureSettings(int maxRangeCm, String signalMode) {
        return setGestureRange(GestureSettings.DEFAULT_MIN_RANGE_CM, maxRangeCm, signalMode);
    }

    @JavascriptInterface public String setGestureRange(int minRangeCm, int maxRangeCm, String signalMode) {
        Log.i(TAG, "工作人員模式：手勢設定 " + minRangeCm + "–" + maxRangeCm + " 公分、" + signalMode);
        return host.applyGestureSettings(maxRangeCm, signalMode, minRangeCm);
    }

    @JavascriptInterface public String liveFrame() {
        return host.liveFrameJson();
    }

    @JavascriptInterface public void shareTofLog() {
        Log.i(TAG, "工作人員模式：匯出紀錄檔");
        host.shareTofLog();
    }

    /** Wraps the native object so the page sees one stable shape that never throws. */
    static String installScript() {
        return "(function(){try{"
                + "var n=window." + NATIVE_OBJECT + ";"
                + "if(!n)return;"
                + "function j(f){try{return JSON.parse(f());}catch(e){return null;}}"
                + "window." + PROPERTY + "={"
                + "version:1,"
                + "available:true,"
                + "getGestureSettings:function(){return j(function(){return n.getGestureSettings();});},"
                + "setGestureSettings:function(s){s=s||{};return j(function(){"
                + "return n.setGestureRange(Number(s.minRangeCm)||" + GestureSettings.DEFAULT_MIN_RANGE_CM
                + ",Number(s.maxRangeCm)||0,String(s.signalMode||''));});},"
                + "liveFrame:function(){return j(function(){return n.liveFrame();});},"
                + "shareTofLog:function(){try{n.shareTofLog();return true;}catch(e){return false;}}"
                + "};"
                + "window.dispatchEvent(new CustomEvent(" + GestureBridgeScript.quote(READY_EVENT)
                + ",{detail:window." + PROPERTY + "}));"
                + "}catch(e){}})();";
    }

    /** Tells the page how 匯出紀錄檔 went. */
    static String exportResultScript(boolean ok, String name, long bytes, String reason) {
        StringBuilder detail = new StringBuilder("{ok:").append(ok);
        if (name != null) detail.append(",name:").append(GestureBridgeScript.quote(name));
        if (ok) detail.append(",bytes:").append(bytes);
        if (reason != null) detail.append(",reason:").append(GestureBridgeScript.quote(reason));
        detail.append('}');
        return "(function(){try{window.dispatchEvent(new CustomEvent("
                + GestureBridgeScript.quote(EXPORT_EVENT) + ",{detail:" + detail + "}));}catch(e){}})();";
    }
}
