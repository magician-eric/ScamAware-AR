package com.bigxreality.jorjinverifier;

import android.content.Context;
import android.util.Log;

import com.bigxreality.jorjinverifier.ota.BundleVersion;
import com.bigxreality.jorjinverifier.ota.OtaDiagnostics;
import com.bigxreality.jorjinverifier.ota.OtaException;
import com.bigxreality.jorjinverifier.ota.OtaHttp;
import com.bigxreality.jorjinverifier.ota.OtaLog;
import com.bigxreality.jorjinverifier.ota.OtaManifest;
import com.bigxreality.jorjinverifier.ota.OtaPhase;
import com.bigxreality.jorjinverifier.ota.OtaUpdateStatus;
import com.bigxreality.jorjinverifier.ota.OtaUpdater;
import com.bigxreality.jorjinverifier.ota.ShellVersion;
import com.bigxreality.jorjinverifier.ota.WebBundle;
import com.bigxreality.jorjinverifier.ota.WebBundlePaths;
import com.bigxreality.jorjinverifier.ota.WebBundleStore;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * The Android half of the update mechanism: reads the APK's baseline, owns the
 * {@link WebBundleStore}, and runs one update attempt on a background thread per launch.
 *
 * <p>Everything that decides anything lives in {@code com.bigxreality.jorjinverifier.ota} and is
 * exercised by JVM tests. What is left here is the parts that genuinely need a phone - an
 * {@code AssetManager}, a files directory, a thread pool and Logcat - and it is written so that
 * none of them can delay the experience:
 *
 * <ul>
 *   <li>{@link #openForLaunch()} is a handful of stat calls and one small file write. It runs on
 *       the main thread before the WebView is asked for anything, because deciding <em>which</em>
 *       bundle to serve has to happen before the first request, and it is fast enough to.</li>
 *   <li>{@link #checkForUpdateInBackground()} does everything else - the HTTP request, the 80 MiB
 *       download, the digests, the extraction - on one background thread, after the page has
 *       already started loading. Nothing on screen waits for it, and nothing it does can fail in a
 *       way the wearer sees.</li>
 * </ul>
 */
final class OtaController {
    private static final String TAG = "JorjinOta";

    /**
     * The manifest of the build packaged into this APK, written into assets by
     * {@code app/build.gradle} at build time. It is what tells the shell which version its
     * baseline is, so a downloaded bundle can be compared against it.
     */
    static final String BASELINE_MANIFEST_ASSET = "cibar-baseline-manifest.json";

    /** Where downloaded bundles live, under the app's private internal storage. */
    static final String STORE_DIRECTORY = "webbundle";

    /** Pulled off the phone after a session that went wrong; see {@link OtaDiagnostics}. */
    static final String DIAGNOSTICS_FILE = "ota-diagnostics.json";

    private static final OtaLog LOG = message -> Log.i(TAG, message);

    private final Context context;
    private final WebBundleStore store;
    private final ExecutorService worker;

    /** Set when the activity is going away, so a download in flight stops rather than finishing. */
    private volatile boolean stopping;

    /**
     * The live phase, for the staff management mode.
     *
     * <p>Held in memory rather than in {@code state.json}: it is what is happening in this
     * process, and a phase that survived a restart would be a lie the moment the process that was
     * downloading went away. The durable half - which versions exist, when the last check was,
     * what the last error said - is in {@link OtaDiagnostics}, and the two are published together.
     */
    private volatile OtaUpdateStatus status = OtaUpdateStatus.idle();

    /**
     * Whether an attempt is in flight.
     *
     * <p>Guards the manual buttons rather than the queue. The worker is a single thread, so a
     * second request would simply wait - invisibly, behind up to three HTTP retries - and the
     * staff member who pressed 檢查更新 twice would get one check now and one at some unrelated
     * moment later. Refusing while busy is the honest answer, and the screen is already showing
     * what it is busy with.
     */
    private final AtomicBoolean running = new AtomicBoolean(false);

    /** Set by the activity so a phase change reaches the page. Null until it is. */
    private volatile StateListener stateListener;

    /** How the update mechanism's state reaches the page - see {@link OtaDiagnosticsScript}. */
    interface StateListener {
        /**
         * @param statusJson      {@link OtaUpdateStatus#toJson()} - the live phase.
         * @param diagnosticsJson {@link OtaDiagnostics#toJson()} - the durable record.
         */
        void onOtaState(String statusJson, String diagnosticsJson);
    }

    private OtaController(Context context, WebBundleStore store) {
        this.context = context;
        this.store = store;
        this.worker = Executors.newSingleThreadExecutor(runnable -> {
            Thread thread = new Thread(runnable, "cibar-ota");
            // Below the UI and below the WebView's own threads. An update must never compete for
            // CPU with the video the wearer is watching while it downloads.
            thread.setPriority(Thread.MIN_PRIORITY);
            thread.setDaemon(true);
            return thread;
        });
    }

    static OtaController create(Context context) {
        Context application = context.getApplicationContext();
        String baselineVersion = readBaselineVersion(application);
        File root = new File(application.getFilesDir(), STORE_DIRECTORY);
        return new OtaController(application,
                new WebBundleStore(root, baselineVersion, BuildConfig.SHELL_VERSION, LOG));
    }

    /**
     * The version of the build packaged in this APK.
     *
     * <p>{@link BundleVersion#UNKNOWN} when the manifest is missing or unreadable, which orders
     * below every published bundle - so a shell built without the manifest updates itself on first
     * contact with the network rather than refusing every bundle as a downgrade.
     */
    private static String readBaselineVersion(Context context) {
        try (InputStream in = context.getAssets().open(BASELINE_MANIFEST_ASSET)) {
            ByteArrayOutputStream body = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            for (int read = in.read(buffer); read >= 0; read = in.read(buffer)) {
                body.write(buffer, 0, read);
            }
            OtaManifest manifest = OtaManifest.parse(
                    new String(body.toByteArray(), StandardCharsets.UTF_8));
            Log.i(TAG, "APK 內建 web bundle：" + manifest.version + "（commit "
                    + manifest.commit + "）");
            return manifest.version;
        } catch (IOException | OtaException missing) {
            Log.w(TAG, "讀不到 assets/" + BASELINE_MANIFEST_ASSET
                    + "，APK 內建版本視為最舊：" + missing.getMessage());
            return BundleVersion.UNKNOWN;
        }
    }

    void setStateListener(StateListener listener) {
        this.stateListener = listener;
    }

    /** The live phase, for a page that has just loaded and needs the state as it is now. */
    OtaUpdateStatus status() {
        return status;
    }

    /**
     * One manual check, started by the staff management mode. Returns immediately.
     *
     * <p>Deliberately the same request, the same parser and the same {@code UpdateDecision} the
     * launch-time check uses - a second implementation would be a second answer to "is there an
     * update", and the two would disagree exactly when it mattered. What differs is that this one
     * does not download and does not retry; see {@code OtaUpdater.checkOnly()}.
     */
    void checkForUpdateNow() {
        startManual(true);
    }

    /** One manual download of whatever is published, verified and staged. Returns immediately. */
    void downloadUpdateNow() {
        startManual(false);
    }

    private void startManual(boolean checkOnly) {
        if (!running.compareAndSet(false, true)) {
            Log.i(TAG, "OTA：已經有一個更新流程在執行，忽略這次要求");
            publishState();
            return;
        }
        setStatus(new OtaUpdateStatus(OtaPhase.CHECKING,
                checkOnly ? "正在檢查更新" : "正在準備下載", null, true, now()));
        try {
            worker.execute(() -> {
                try {
                    OtaUpdater updater = newUpdater(this::onPhase);
                    OtaUpdater.Result result = checkOnly ? updater.checkOnly()
                            : updater.downloadNow();
                    Log.i(TAG, "OTA 手動" + (checkOnly ? "檢查" : "下載") + "結果：" + result);
                } catch (Throwable escaped) {
                    Log.w(TAG, "OTA 手動更新發生未預期的錯誤", escaped);
                    onPhase(OtaPhase.FAILED, "更新流程發生未預期的錯誤：" + escaped, null);
                } finally {
                    running.set(false);
                    // The phase the attempt ended on is already published; this clears the
                    // spinner and refreshes the durable half in one go.
                    setStatus(status.busy(false));
                    publishDiagnostics();
                }
            });
        } catch (RuntimeException rejected) {
            // shutdownNow() has already run - the activity is going away and there is nothing
            // left to do the work. Reported rather than thrown into a WebView thread.
            running.set(false);
            onPhase(OtaPhase.FAILED, "App 正在結束，這次更新沒有執行", null);
        }
    }

    /** Called on the update thread as an attempt moves through its phases. */
    private void onPhase(String phase, String detail, String version) {
        setStatus(new OtaUpdateStatus(phase, detail, version, running.get(), now()));
    }

    private void setStatus(OtaUpdateStatus next) {
        status = next;
        publishState();
    }

    /** Pushes both halves - live phase and durable record - at whoever is listening. */
    void publishState() {
        StateListener listener = stateListener;
        if (listener == null) return;
        listener.onOtaState(status.toJson(), store.diagnostics().toJson());
    }

    private OtaUpdater newUpdater(OtaUpdater.Progress progress) {
        return new OtaUpdater(store, new OtaHttp.UrlConnection(userAgent()),
                WebContentSource.UPDATE_LATEST_URL, BuildConfig.SHELL_VERSION, LOG,
                OtaUpdater.Sleeper.REAL, () -> stopping, progress);
    }

    private static long now() {
        return System.currentTimeMillis();
    }

    /** Decides what to serve this session. Main thread, before the WebView loads anything. */
    WebBundle openForLaunch() {
        WebBundle bundle = store.openForLaunch();
        publishDiagnostics();
        return bundle;
    }

    WebBundle activeBundle() {
        return store.activeBundle();
    }

    /** The page rendered. Clears the crash counter that would otherwise roll this bundle back. */
    void markLaunchSucceeded() {
        store.markLaunchSucceeded();
    }

    /**
     * The page failed to load. Demotes the active bundle and returns what to load instead - the
     * previous bundle, or the APK's baseline.
     */
    WebBundle rollbackAfterFailure(String reason) {
        WebBundle fallback = store.rollbackAfterFailure(reason);
        publishDiagnostics();
        return fallback;
    }

    OtaDiagnostics diagnostics() {
        return store.diagnostics();
    }

    /**
     * Starts one update attempt, and returns immediately.
     *
     * <p>Called after {@code web.show()}, so the page is already loading when the first HTTP
     * request goes out. There is no progress indicator, no dialog and no gate: a wearer who starts
     * a scenario ten seconds later plays a local video off local storage while the download
     * continues underneath them, and never learns either way.
     */
    void checkForUpdateInBackground() {
        if (!running.compareAndSet(false, true)) return;
        worker.execute(() -> {
            try {
                OtaUpdater.Result result = newUpdater(this::onPhase).runOnce();
                Log.i(TAG, "OTA 檢查結果：" + result);
            } catch (Throwable escaped) {
                // Belt and braces: OtaUpdater already swallows everything, and an exception that
                // escaped it must still not reach the default handler and take the session down.
                Log.w(TAG, "OTA 背景檢查發生未預期的錯誤", escaped);
            } finally {
                running.set(false);
                setStatus(status.busy(false));
                publishDiagnostics();
            }
        });
    }

    /** Stops any download in flight. The staged tree is scratch and is deleted with it. */
    void shutdown() {
        stopping = true;
        worker.shutdownNow();
    }

    private String userAgent() {
        return "CIBAR-Shell/" + BuildConfig.SHELL_VERSION + " (Android; " + context.getPackageName()
                + ")";
    }

    /**
     * Writes the current state to Logcat and to a file, so it can be read back without a debugger.
     *
     * <p>Failures are logged and ignored: diagnostics that could stop the app would be worse than
     * no diagnostics.
     */
    private void publishDiagnostics() {
        OtaDiagnostics diagnostics = store.diagnostics();
        Log.i(TAG, diagnostics.toLogLine());
        publishState();
        File directory = context.getExternalFilesDir(null);
        if (directory == null) return;
        File target = new File(directory, DIAGNOSTICS_FILE);
        try (FileOutputStream out = new FileOutputStream(target)) {
            out.write(diagnostics.toJson().getBytes(StandardCharsets.UTF_8));
        } catch (IOException unwritable) {
            Log.w(TAG, "無法寫入 " + DIAGNOSTICS_FILE + "：" + unwritable.getMessage());
        }
    }

    /** The asset directory the baseline build is packaged into - {@code assets/cibar/}. */
    static String baselineAssetRoot() {
        return WebBundlePaths.ASSET_ROOT;
    }
}
