package com.bigxreality.jorjinverifier;

import android.Manifest;
import android.app.Activity;
import android.app.ActivityManager;
import android.app.ApplicationExitInfo;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.net.Uri;
import android.util.Log;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.SurfaceView;
import android.webkit.WebView;

import com.bigxreality.jorjinverifier.JorjinHardwareManager.LayerState;
import com.bigxreality.jorjinverifier.ota.WebBundle;

import java.io.File;

/**
 * The whole app: bring the glasses up and show CIBAR.
 *
 * <p>Cold launch runs exactly one path - request the camera permission, start the RGB camera and
 * the ToF module ({@link JorjinHardwareManager}), and load CIBAR into the WebView that fills the
 * screen. There is no home screen, no mode picker and no button to press: the first thing the
 * wearer sees is CIBAR itself.
 *
 * <h2>What used to be here</h2>
 * This class was a diagnostics panel with CIBAR bolted on as a layer the tester opened by hand.
 * That panel is gone - the version readout, the last-gesture and gesture-count lines, the ToF
 * depth grid and distance, the simulated-scan button, the start-up mode switch, the links to the
 * local gesture test page and to CIBAR's scan-diagnostic mode, and the toolbar that sat above the
 * WebView. What it reported is not gone: every layer still reports through
 * {@link JorjinHardwareManager.Listener}, and each report goes to Logcat under {@code
 * JorjinVerifier}, where {@code adb logcat} can read it without any of it being on the wearer's
 * screen.
 *
 * <h2>Why CIBAR is a WebView here and not an intent</h2>
 * Opening CIBAR in Chrome (or any other app) puts this activity in the background, which runs
 * {@code onStop()} and therefore {@code hardware.stop()}: the camera is released and the ToF
 * module is closed, so gestures stop at the source.  {@link WebLayerController} keeps the page
 * inside this activity, so the foreground never changes, {@code onStop()} never runs, and the
 * hardware carries on untouched while the page is up.
 *
 * <h2>Where the web content comes from</h2>
 * From this phone, always. {@link OtaController} decides which bundle - the copy of
 * {@code webapp/dist} packaged into the APK, or a newer one that arrived over the air and was
 * promoted at the previous launch - and that decision is made here, on the main thread, before the
 * WebView is asked for anything. It is a handful of stat calls; nothing waits on a network.
 *
 * <p>The check for a newer bundle is started <em>after</em> the page is already loading and runs on
 * a background thread. A wearer who reaches a scenario ten seconds later plays a local video off
 * local storage while an 80 MiB download continues underneath them, and a download that fails, is
 * interrupted or turns out to be corrupt changes nothing they can see.
 */
public final class MainActivity extends Activity
        implements JorjinHardwareManager.Listener, WebLayerController.PageListener,
        OtaControlBridge.Host, StaffToolsBridge.Host, OtaController.StateListener {
    private static final String TAG = "JorjinVerifier";
    private static final int CAMERA_PERMISSION_REQUEST = 1001;
    /** What survives a process: the last renderer restart, the newest exit already reported. */
    private static final String RECOVERY_PREFS = "cibar_recovery";
    private static final String KEY_LAST_RENDERER_RELAUNCH = "lastRendererRelaunchAt";
    private static final String KEY_LAST_EXIT_REPORTED = "lastExitReportedAt";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private SurfaceView cameraSurface;
    private JorjinHardwareManager hardware;
    private OtaController ota;
    private WebLayerController web;
    private boolean foreground;

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        cameraSurface = findViewById(R.id.cameraSurface);
        installCrashReporter();
        reportPreviousExits();
        Intent launch = getIntent();
        Log.i(TAG, "啟動來源：" + (launch == null ? "—" : launch.getAction()));

        // The hardware first, so the camera stream object exists before the page can ask for a
        // frame: the WebView reads the glasses camera from a URL this controller intercepts, and
        // an interception with no stream attached answers the page with "no camera".
        hardware = new JorjinHardwareManager(this, this);
        hardware.setSurfaceHolder(cameraSurface.getHolder());

        // Which web bundle this session runs, decided before the first request reaches the
        // WebView: anything staged by a previous session is promoted here, and a bundle that
        // failed to come up last time is rolled back here. Local work only - no network.
        ota = OtaController.create(this);
        WebBundle bundle = ota.openForLaunch();

        web = new WebLayerController((WebView) findViewById(R.id.cibarWebView), bundle, this,
                new OtaControlBridge(this), new EnvironmentCheckBridge(hardware.environmentMeter()),
                new StaffToolsBridge(this));
        ota.setStateListener(this);
        web.setCameraStream(hardware.cameraStream());
        // Before any permission dialog: which flow the page takes depends on whether the glasses
        // are here, and the page may be asked as soon as a language is picked.
        boolean[] glasses = hardware.detectGlasses();
        Log.i(TAG, "啟動時眼鏡：鏡頭=" + glasses[0] + " ToF=" + glasses[1]);
        web.setGlassesPresence(glasses[0], glasses[1]);
        hardware.watchGlasses();
        enableGlassesFrameDump();

        // CIBAR starts loading now rather than after the permission dialog is answered: the page
        // comes out of the active bundle on this phone, and the camera, ToF and gesture bridge
        // attach to it as they come up. Nothing waits on anything else.
        web.show();

        // And only now, with the page already loading, does anything touch the network.
        ota.checkForUpdateInBackground();
    }

    // ---------------------------------------------------------------- WebLayerController.PageListener

    /**
     * CIBAR's document rendered, so the active bundle is not a rollback candidate any more.
     *
     * <p>This is the whole of the runtime gate: a bundle that passed every check at install time
     * can still fail to come up on this particular phone, and the only proof that it did come up
     * is the page saying so.
     */
    @Override public void onPageReady() {
        ota.markLaunchSucceeded();
    }

    /**
     * CIBAR's document failed to load. Demotes the bundle that failed and hands back what to load
     * instead - the previous bundle, or the APK's baseline, which is packaged in a signed APK and
     * cannot be damaged.
     *
     * @return the same bundle when there is nothing left to fall back to, which tells the web
     *         layer to show its failure page rather than reload the identical thing forever.
     */
    @Override public WebBundle onPageFailed(String detail) {
        Log.w(TAG, "CIBAR 進入點載入失敗：" + detail);
        return ota.rollbackAfterFailure(detail);
    }

    @Override public String otaDiagnosticsJson() {
        return ota.diagnostics().toJson();
    }

    @Override public String otaStatusJson() {
        return ota.status().toJson();
    }

    // ---------------------------------------------------------------- OtaController.StateListener

    /**
     * A phase changed. Reaches the page as two globals and an event, on the main thread.
     *
     * <p>Called from the update thread, so it hops; {@link #post} also drops the call when the
     * activity is finishing, which is what a staged bundle looks like arriving one instant after
     * somebody closed the app.
     */
    @Override public void onOtaState(String statusJson, String diagnosticsJson) {
        post(() -> web.publishOtaState(statusJson, diagnosticsJson));
    }

    // ---------------------------------------------------------------- OtaControlBridge.Host
    //
    // The staff management mode's three buttons. Called on a WebView thread, so each one hands the
    // work to the thread that owns it and returns - nothing here blocks the page that is showing
    // what it asked for.

    @Override public void checkForUpdate() {
        ota.checkForUpdateNow();
    }

    @Override public void downloadUpdate() {
        ota.downloadUpdateNow();
    }

    @Override public void refreshOtaState() {
        ota.publishState();
    }

    // The staff management mode's gesture tools (StaffToolsBridge). Also called on a WebView
    // thread; the settings and the live frame are a field read or write, the export a thread.

    @Override public String gestureSettingsJson() {
        return hardware.gestureSettingsJson();
    }

    @Override public String applyGestureSettings(int maxRangeCm, String signalMode) {
        return hardware.applyGestureSettings(maxRangeCm, signalMode);
    }

    @Override public String liveFrameJson() {
        return hardware.liveFrameJson();
    }

    /**
     * 匯出紀錄檔: the frame log copied into one file (a few megabytes - on its own thread), then
     * the share sheet for LINE, e-mail or a drive. Opening the share sheet puts this activity in
     * the background, which releases the glasses (see onStop); coming back starts them again.
     */
    @Override public void shareTofLog() {
        File exportDir = new File(getCacheDir(), TofLogExport.DIRECTORY);
        new Thread(() -> {
            File exported;
            try {
                exported = hardware.exportTofLog(exportDir);
            } catch (Throwable error) {
                Log.w(TAG, "匯出紀錄檔失敗", error);
                exported = null;
            }
            File result = exported;
            post(() -> offerTofLog(result));
        }, "TofLogExport").start();
    }

    private void offerTofLog(File exported) {
        if (exported == null) {
            web.publishTofLogExport(false, null, 0L, "empty");
            return;
        }
        Uri uri = TofLogProvider.uriFor(getPackageName(), exported);
        Intent send = new Intent(Intent.ACTION_SEND)
                .setType(TofLogProvider.MIME)
                .putExtra(Intent.EXTRA_STREAM, uri)
                .putExtra(Intent.EXTRA_SUBJECT, exported.getName())
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        // The grant travels with the ClipData; without it the receiving app is refused the file.
        send.setClipData(ClipData.newRawUri(exported.getName(), uri));
        Intent chooser = Intent.createChooser(send, "匯出 ToF 紀錄檔")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivity(chooser);
            web.publishTofLogExport(true, exported.getName(), exported.length(), null);
        } catch (ActivityNotFoundException error) {
            web.publishTofLogExport(false, exported.getName(), 0L, "no-app");
        }
    }

    /**
     * Ends this session and starts the app again, so a staged bundle becomes the active one.
     *
     * <p>A relaunch rather than anything cleverer, because promotion happens in exactly one place
     * - {@code WebBundleStore.openForLaunch()}, called from {@code onCreate} before the WebView is
     * asked for a single byte - and a cold start is the one moment when there is no session to
     * lose. Nothing here swaps the bundle under the running page: that path exists only for a
     * rollback, and an update taking it would be the failure the whole staging mechanism avoids.
     *
     * <p>The order matters. The glasses are a shared USB device: the new activity's {@code
     * onStart} claims the camera and the ToF module, and it runs before this instance's {@code
     * onStop} would have released them. So they are released here, first, by hand.
     */
    @Override public void restartToApplyUpdate() {
        post(() -> relaunch("工作人員模式要求重新啟動，套用已下載完成的新版"));
    }

    /**
     * A cold start of this app, from the launcher intent: the one way it starts over, shared by
     * the staff mode's update restart and by {@link #onRendererGone}.
     *
     * <p>The glasses' USB devices are released before the new activity is started - its
     * {@code onStart} claims them, and that runs before this instance's {@code onStop} would.
     */
    private void relaunch(String why) {
        Intent relaunch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (relaunch == null) {
            Log.w(TAG, "找不到本 App 的啟動 Intent，無法重新啟動");
            return;
        }
        Log.i(TAG, why + "：重新啟動 App");
        relaunch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        web.onStop();
        hardware.stop();
        ota.shutdown();
        startActivity(relaunch);
        finish();
    }

    // ---------------------------------------------------------------- crash recovery

    /**
     * CIBAR's renderer died and the WebView is already gone. Starts CIBAR again rather than
     * leaving the wearer a window with nothing in it - once; see {@link CrashRecovery} for why a
     * second death a minute later closes the app instead.
     */
    @Override public void onRendererGone(boolean crashed) {
        String why = crashed ? "WebView 渲染程序崩潰" : "WebView 渲染程序被系統結束（多半是記憶體不足）";
        persistCrash("頁面渲染程序結束：" + why + "，時間 " + new java.util.Date());
        SharedPreferences prefs = getSharedPreferences(RECOVERY_PREFS, MODE_PRIVATE);
        long now = System.currentTimeMillis();
        long last = prefs.getLong(KEY_LAST_RENDERER_RELAUNCH, 0L);
        if (!CrashRecovery.shouldRelaunch(last, now)) {
            Log.e(TAG, why + "，且一分鐘內已重新啟動過一次；不再自動重啟");
            persistCrash("一分鐘內第二次渲染程序結束，App 不再自動重啟");
            finish();
            return;
        }
        prefs.edit().putLong(KEY_LAST_RENDERER_RELAUNCH, now).apply();
        post(() -> relaunch(why));
    }

    /**
     * Writes why this app's previous processes ended to Logcat, and the ones not reported before
     * to {@code crash.txt} - so "it closed by itself" can be read back instead of guessed at.
     * Android keeps these from API 30; older phones have nothing to read.
     */
    private void reportPreviousExits() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;
        try {
            ActivityManager activities = getSystemService(ActivityManager.class);
            if (activities == null) return;
            java.util.List<ApplicationExitInfo> exits =
                    activities.getHistoricalProcessExitReasons(getPackageName(), 0, 5);
            SharedPreferences prefs = getSharedPreferences(RECOVERY_PREFS, MODE_PRIVATE);
            long reported = prefs.getLong(KEY_LAST_EXIT_REPORTED, 0L);
            long newest = reported;
            for (ApplicationExitInfo exit : exits) {
                String line = new java.util.Date(exit.getTimestamp()) + " "
                        + CrashRecovery.exitReason(exit.getReason())
                        + " 狀態=" + exit.getStatus()
                        + " 重要度=" + exit.getImportance()
                        + " PSS=" + exit.getPss() + "KB RSS=" + exit.getRss() + "KB"
                        + (exit.getDescription() == null ? "" : " 說明=" + exit.getDescription());
                Log.i(TAG, "先前 App 結束原因：" + line);
                if (exit.getTimestamp() > reported) {
                    persistCrash("先前 App 結束原因：" + line);
                    newest = Math.max(newest, exit.getTimestamp());
                }
            }
            if (newest > reported) prefs.edit().putLong(KEY_LAST_EXIT_REPORTED, newest).apply();
        } catch (Throwable error) {
            Log.w(TAG, "讀取先前 App 結束原因失敗", error);
        }
    }

    /**
     * Writes one glasses frame to the app's cache every
     * {@link GlassesCameraStream#DEBUG_FRAME_INTERVAL} frames, on debuggable builds only.
     *
     * <p>It answers the question nothing else in the chain can: is the RGB frame the glasses are
     * producing actually a picture? Everything downstream - the MJPEG body, the WebView, the
     * recogniser - sees exactly these bytes, so a black, torn or wrongly-formatted frame reaches
     * all of them looking like "recognition does not work". Pulled off the phone with
     * {@code adb shell run-as com.bigxreality.jorjinverifier ls cache/glasses-frames}.
     *
     * <p>A development tool and gated as one: the release APK a tester is handed is not
     * debuggable, so this never runs there and nothing on screen can turn it on.
     */
    private void enableGlassesFrameDump() {
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) return;
        hardware.cameraStream().setDebugFrameDir(new File(getCacheDir(), "glasses-frames"));
    }

    /**
     * The SDK drives capture and rendering on threads it owns, so an exception there tears down
     * the process before any try/catch around startCamera can see it - the failure vanishes with
     * nothing anywhere. It goes to Logcat and to {@code crash.txt} instead, and the process is
     * kept alive when the dying thread is not the main one, so a background failure does not take
     * a running experience down with it.
     */
    private void installCrashReporter() {
        final Thread.UncaughtExceptionHandler previous =
                Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, error) -> {
            Log.e(TAG, "未捕捉例外，執行緒：" + thread.getName(), error);
            persistCrash(describeCrash(thread, error));
            if (thread != Looper.getMainLooper().getThread()) return;
            if (previous != null) previous.uncaughtException(thread, error);
        });
    }

    private static String describeCrash(Thread thread, Throwable error) {
        StringBuilder text = new StringBuilder()
                .append("執行緒 ").append(thread.getName()).append('\n')
                .append(error.getClass().getName());
        if (error.getMessage() != null) text.append(": ").append(error.getMessage());
        StackTraceElement[] frames = error.getStackTrace();
        for (int i = 0; i < frames.length && i < 6; i++) {
            text.append("\n  at ").append(frames[i]);
        }
        Throwable cause = error.getCause();
        if (cause != null) {
            text.append("\n由 ").append(cause.getClass().getName());
            if (cause.getMessage() != null) text.append(": ").append(cause.getMessage());
        }
        return text.toString();
    }

    /** Also written to disk so the trace survives a process death: adb pull, or the Files app. */
    private void persistCrash(String detail) {
        java.io.File target = new java.io.File(getExternalFilesDir(null), "crash.txt");
        try (java.io.Writer writer = new java.io.FileWriter(target, true)) {
            writer.write(detail);
            writer.write("\n\n");
        } catch (Throwable ignored) {
            Log.w(TAG, "無法寫入 crash.txt");
        }
    }

    @Override protected void onStart() {
        super.onStart();
        foreground = true;
        web.onStart();
        requestPermissionOrStart();
    }

    /**
     * The app really has left the foreground here - showing CIBAR is a change of what is drawn,
     * not a change of foreground, so this never runs while the wearer is inside the experience.
     * When it does run the camera and the ToF module must be released: the glasses are a shared
     * USB device, and holding them open in the background stops any other app, including a later
     * run of this one, from claiming them.
     */
    @Override protected void onStop() {
        foreground = false;
        web.onStop();
        hardware.stop();
        super.onStop();
    }

    @Override protected void onDestroy() {
        foreground = false;
        hardware.unwatchGlasses();
        hardware.stop();
        ota.shutdown();
        web.destroy();
        mainHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    /**
     * WebView history first, then the activity. Handled through onKeyDown rather than
     * onBackPressed so it behaves identically on the API levels either side of the
     * predictive-back changes.
     */
    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK && web.onBackPressed()) return true;
        return super.onKeyDown(keyCode, event);
    }

    /**
     * Logs every key press and the device it came from, then dispatches it exactly as before.
     *
     * <p>The glasses' ToF module reports its gestures as key presses (see
     * {@link ModuleGestureKeys}), and a module configured by the vendor's app presses Back for a
     * pull - which leaves this app. A line per press is what tells "the wearer pressed the
     * glasses' back button" from "the ToF module pressed Back", and an arrow that arrived from
     * one that never did.
     */
    @Override public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
            Log.i(TAG, "按鍵 " + KeyEvent.keyCodeToString(event.getKeyCode())
                    + " 來自 " + describeInputDevice(event.getDevice()));
            // The module's own engine recognised a swipe. The page reads the key itself (below);
            // the depth recogniser is told so it does not report the same swipe again.
            int code = event.getKeyCode();
            if (hardware != null
                    && (code == KeyEvent.KEYCODE_DPAD_LEFT || code == KeyEvent.KEYCODE_DPAD_RIGHT)) {
                hardware.onModuleGestureKey(code == KeyEvent.KEYCODE_DPAD_RIGHT);
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private static String describeInputDevice(InputDevice device) {
        if (device == null) return "（虛擬裝置）";
        return device.getName() + " " + JorjinUsbDevices.formatIds(
                device.getVendorId(), device.getProductId());
    }

    private void requestPermissionOrStart() {
        if (!foreground) return;
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            hardware.start();
        } else {
            Log.i(TAG, "RGB Camera：等待相機權限");
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions,
                                                     int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != CAMERA_PERMISSION_REQUEST || !foreground) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            hardware.start();
        } else {
            // CIBAR itself carries on - the page is what the user came for, and the parts of it
            // that do not need the glasses camera still work. Only the camera is missing.
            onError("未取得相機權限；眼鏡影像無法啟動。請在系統設定允許相機權限後重新開啟 App。");
        }
    }

    // ---------------------------------------------------------------- Listener
    //
    // Every layer still reports; the reports go to Logcat instead of to a panel on the wearer's
    // screen. `adb logcat -s JorjinVerifier JorjinToF` is the on-device diagnostic now.

    @Override public void onCameraState(LayerState state, String detail) {
        Log.i(TAG, "RGB Camera：" + JorjinHardwareManager.label(state, "Connected", "Failed", "等待中")
                + suffix(detail));
    }

    @Override public void onCameraResolution(String value) {
        Log.i(TAG, "解析度：" + value);
    }

    @Override public void onFrameCount(long value) {
        // Every frame reports; only every 100th is worth a line, and the ToF counters ride along
        // so one log line says whether both halves of the hardware are alive.
        if (value % 100 != 0) return;
        Log.i(TAG, "影像幀：" + JorjinHardwareManager.formatCount(value)
                + "　ToF 深度幀：" + JorjinHardwareManager.formatCount(hardware.tofFrameCount())
                + "　手勢次數：" + JorjinHardwareManager.formatCount(hardware.gestureCount()));
    }

    @Override public void onTofUsbState(LayerState detected, LayerState permission, String detail) {
        Log.i(TAG, "ToF USB："
                + JorjinHardwareManager.label(detected, "Detected", "Not detected", "偵測中")
                + suffix(detail)
                + "　Permission："
                + JorjinHardwareManager.label(permission, "Granted", "Missing", "Missing"));
    }

    @Override public void onTofManagerState(LayerState state, String detail) {
        Log.i(TAG, "ToF Manager："
                + JorjinHardwareManager.label(state, "Opened", "Failed", "等待中") + suffix(detail));
    }

    @Override public void onTofRuntimeState(LayerState state, String firmware,
                                            boolean listenerRegistered) {
        Log.i(TAG, "ToF State：" + JorjinHardwareManager.label(state, "Ready", "已中斷", "Waiting")
                + "　Firmware：" + (firmware == null || firmware.trim().isEmpty() ? "—" : firmware)
                + "　Gesture Listener："
                + (listenerRegistered ? "Registered" : "Not registered"));
    }

    /**
     * The one report that still has somewhere to go besides the log: the gesture bridge.
     *
     * <p>Recognition is untouched - {@link TofGestureRecognizer} still computes LEFT/RIGHT from
     * the 8x8 depth grid and {@link GestureController} still decides which of them count. Only
     * the on-screen readout is gone; the event itself reaches CIBAR exactly as before.
     */
    @Override public void onGesture(String label, String code, String source, long count) {
        post(() -> {
            Log.i(TAG, "手勢：" + label + "（" + source + "）#" + count);
            web.onGesture(code, label, count);
        });
    }

    @Override public void onError(String message) {
        Log.w(TAG, message);
    }

    /**
     * Glasses plugged in or out while the app is open. The page is told either way; glasses that
     * arrive after a start that found none are started now rather than at the next launch.
     */
    @Override public void onGlassesPresence(boolean camera, boolean tof) {
        web.setGlassesPresence(camera, tof);
        if (foreground && (camera || tof) && !hardware.isStarted()) requestPermissionOrStart();
    }

    @Override public void onUsbInventory(String inventory) {
        // JorjinHardwareManager already writes this to Logcat line by line as it builds it.
    }

    @Override public void onTofTrace(String traceText) {
        // TofTrace mirrors every entry to Logcat under the JorjinToF tag as it is recorded.
    }

    private static String suffix(String detail) {
        return detail == null || detail.trim().isEmpty() ? "" : "（" + detail + "）";
    }

    private void post(Runnable action) {
        mainHandler.post(() -> {
            if (!isFinishing() && !isDestroyed()) action.run();
        });
    }
}
