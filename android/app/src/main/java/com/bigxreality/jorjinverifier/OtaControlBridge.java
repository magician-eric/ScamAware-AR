package com.bigxreality.jorjinverifier;

import android.util.Log;
import android.webkit.JavascriptInterface;

/**
 * The object {@code addJavascriptInterface} binds into the page as
 * {@link OtaControlBridgeScript#NATIVE_OBJECT}.
 *
 * <p>Four methods, all of them void, all of them returning immediately. They are called on a
 * WebView thread that is not the UI thread and not the update thread, so this class does nothing
 * except hand the request to whoever owns the right thread - {@link OtaController} for the network
 * work, the activity for the restart. Doing the work here would block the very page that is
 * showing its progress.
 *
 * <h2>Why it is safe to expose at all</h2>
 * {@code addJavascriptInterface} is a hole in a WebView that loads anything from the network. This
 * one never does: every byte the page loads is answered from this device by
 * {@code WebLayerController.shouldInterceptRequest}, and the build-time offline audit refuses a
 * bundle that references an external resource. The page on the other side of this bridge is a
 * bundle whose SHA-256 was checked against a manifest before it was allowed on the phone.
 *
 * <p>Nothing here can damage a session either way. A check and a download stage a bundle for the
 * <em>next</em> launch and cannot touch the active one; the restart is the one destructive
 * operation and it is a relaunch of this same app, which is what the staff member asked for.
 */
final class OtaControlBridge {
    private static final String TAG = "JorjinOta";

    /** Who actually does the work. Implemented by the activity, which owns both threads. */
    interface Host {
        /** Ask the update server what it has published. Must not block. */
        void checkForUpdate();

        /** Download, verify and stage whatever is published. Must not block. */
        void downloadUpdate();

        /** End this session cleanly and start the app again, so a staged bundle is promoted. */
        void restartToApplyUpdate();

        /** Re-publish the current diagnostics and status into the page. */
        void refreshOtaState();
    }

    private final Host host;

    OtaControlBridge(Host host) {
        this.host = host;
    }

    @JavascriptInterface public void checkForUpdate() {
        Log.i(TAG, "工作人員模式：手動檢查更新");
        host.checkForUpdate();
    }

    @JavascriptInterface public void downloadUpdate() {
        Log.i(TAG, "工作人員模式：手動下載更新");
        host.downloadUpdate();
    }

    @JavascriptInterface public void restartToApplyUpdate() {
        Log.i(TAG, "工作人員模式：重新啟動以套用更新");
        host.restartToApplyUpdate();
    }

    @JavascriptInterface public void refresh() {
        host.refreshOtaState();
    }
}
