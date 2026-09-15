package com.bigxreality.jorjinverifier;

import android.annotation.SuppressLint;
import android.content.pm.ApplicationInfo;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import com.bigxreality.jorjinverifier.ota.WebBundle;

import java.util.HashMap;
import java.util.Map;

/**
 * Hosts CIBAR inside this app instead of handing it to a browser, and pushes ToF gestures and
 * recognised scan targets into that page.
 *
 * <p>One page is hosted, and it is the product: {@link #CIBAR_URL}. It is loaded on launch and
 * fills the window. There is no toolbar above it, no way back to anything else, and no
 * alternative page to open - the local left/right gesture test page and CIBAR's own scan
 * diagnostics (<code>?diag=1</code>) were entry points on a diagnostics panel that no longer
 * exists.
 *
 * <h2>Why this class exists at all</h2>
 * CIBAR used to be opened by leaving the app - typing the address into Chrome, or following a
 * link out of it.  The moment another app takes the foreground, this activity gets
 * {@code onStop()}, {@code JorjinHardwareManager.stop()} runs, and the RGB camera and the ToF
 * module are released: gestures stop because the hardware is off, not because the page failed to
 * receive them.  Nothing about the page could ever have fixed that.  Keeping the browser inside
 * our own activity is the fix - no foreground change, so no {@code onStop()}, so the hardware
 * keeps running the whole time the page is up.
 *
 * <h2>What it must never do</h2>
 * It never hides the camera {@link android.view.SurfaceView} to make room for the page.  A
 * SurfaceView that goes {@code GONE} destroys its surface, and JJSDK's camera loses the holder it
 * renders into.  The page is a sibling drawn <em>over</em> the surface instead, so the surface
 * stays alive and attached for as long as the app is up.
 */
final class WebLayerController {
    private static final String TAG = "JorjinVerifier";
    /**
     * Where CIBAR's web content comes from - always this device, always the same local https
     * origin, whichever bundle happens to be active. See {@link WebContentSource}.
     */
    static final WebContentSource CIBAR = WebContentSource.local();

    /**
     * CIBAR's entry point.
     *
     * <p>The active bundle is served here by {@link WebBundleAssetHandler} - either the copy of
     * {@code webapp/dist} packaged into this APK, or a newer one that arrived over the air and was
     * promoted at launch. The URL is the same string either way, which is what lets an update
     * carry across React Router's history, the Vite build's absolute {@code /CIBAR/} asset paths,
     * {@code localStorage} and the camera permission grant without any of them noticing. The app
     * is a React SPA on a HashRouter, so every route below this is a fragment of the same
     * document.
     */
    static final String CIBAR_URL = CIBAR.rootUrl;
    /**
     * Where the page reads the glasses camera from.
     *
     * <p>Deliberately a path under CIBAR's own origin rather than a separate host. Recognition
     * reads pixels back with {@code getImageData}, and a canvas drawn from a cross-origin image
     * is tainted - {@code getImageData} then throws SecurityError and the whole recogniser dies.
     * Same origin means no taint, and no CORS headers to get subtly wrong. Nothing is served at
     * this path by the real site; it exists only to be intercepted here.
     */
    static final String GLASSES_CAMERA_URL = CIBAR.cameraUrl;

    /**
     * The response's media type, without its boundary parameter.
     *
     * <p>{@link WebResourceResponse} documents its mimeType argument as carrying no parameters,
     * so the boundary travels as a real {@code Content-Type} header instead - see
     * {@link #glassesCameraHeaders()}. Both halves have to be right: the type is what makes the
     * WebView treat the response as a replacing stream at all, and the boundary is what lets it
     * find where one JPEG ends and the next begins.
     */
    static final String MJPEG_MIME_TYPE = "multipart/x-mixed-replace";

    /**
     * Whether a request is the page asking for the glasses camera.
     *
     * <p>This is the first thing {@code shouldInterceptRequest} asks, before the offline flavor's
     * asset loader is ever consulted - see {@link WebContentSource#isCameraRequest} for why it is
     * a prefix test and what a request that misses it looks like from the page.
     */
    static boolean isGlassesCameraRequest(String url) {
        return CIBAR.isCameraRequest(url);
    }

    /** Who answers a request the page makes - decided in one place so the order can be tested. */
    enum Interception {
        /** The live MJPEG stream from the glasses' RGB camera, served by this class. */
        GLASSES_CAMERA,
        /** A file from the active CIBAR bundle - the APK's baseline, or an OTA one. */
        BUNDLED_ASSET,
        /**
         * Left to the WebView. Nothing in the experience ever takes this path: every URL the page
         * loads is under {@link #CIBAR_URL}, and anything that is not is either blocked in
         * {@code handleUrl} or is a link nobody can follow. It exists so that a request we did not
         * anticipate fails as an ordinary network error rather than as an empty 404 from a bundle.
         */
        NETWORK,
    }

    /**
     * Which of the three answers a URL gets, and in which order the question is asked.
     *
     * <p>The order is the whole point, and it is not obvious from either half on its own. The
     * camera endpoint deliberately lives on the page's own origin - it has to, or the recognition
     * canvas is tainted - which puts it inside the very path prefix the bundle owns. Ask the
     * bundle first and it answers the camera request with a 404 for a file that was never supposed
     * to exist, the {@code <img>} never decodes a frame, and the page reports a dead camera while
     * the camera, the USB link and the JPEG encoder are all working.
     */
    static Interception interceptionFor(String url) {
        if (CIBAR.isCameraRequest(url)) return Interception.GLASSES_CAMERA;
        if (CIBAR.owns(url)) return Interception.BUNDLED_ASSET;
        return Interception.NETWORK;
    }

    /**
     * The headers the MJPEG response carries.
     *
     * <p>The {@code Content-Type} here is the fix for a stream that connected and then showed
     * nothing at all. The response used to be built as
     * {@code new WebResourceResponse("multipart/x-mixed-replace", null, body)}, and that type
     * alone tells a browser it is being handed a sequence of parts without telling it what
     * separates them. Blink needs the {@code boundary} parameter to split the body into frames;
     * with no boundary it never produces a single decoded image, so {@code <img>.naturalWidth}
     * stays 0, no {@code load} event ever fires, and the page's own first-frame timeout is the
     * only thing that ever reports it - as "no frame arrived", eight seconds later, with the
     * camera, the USB link and the JPEG encoder all working perfectly.
     */
    static Map<String, String> glassesCameraHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", MjpegFraming.CONTENT_TYPE);
        // A cached camera would be a still photograph.
        headers.put("Cache-Control", "no-store, no-cache, must-revalidate");
        headers.put("Pragma", "no-cache");
        return headers;
    }

    /**
     * What the shell tells the activity about the page it is hosting.
     *
     * <p>Both halves feed the rollback gate. A page that finishes loading clears the counter that
     * would otherwise demote its bundle at the next launch; a main-frame load failure demotes it
     * immediately, in this session, so the wearer gets the previous bundle instead of a white
     * screen they would have to close the app to escape.
     */
    interface PageListener {
        /** CIBAR's own document finished loading. */
        void onPageReady();

        /** The main frame failed. The listener decides what to load instead, or null to give up. */
        WebBundle onPageFailed(String detail);

        /** The update state to publish into the page as {@code window.__cibarOta}. */
        String otaDiagnosticsJson();

        /**
         * The live update phase, as {@code window.__cibarOtaStatus} - see
         * {@code OtaUpdateStatus}. Separate from the diagnostics because it changes while an
         * attempt runs and the diagnostics only change when it ends.
         */
        String otaStatusJson();
    }

    private final WebView webView;
    private final PageListener listener;

    /** The bundle being served. Replaced in place when a failed load is rolled back. */
    private WebBundle bundle;

    /** Whether the page has been asked for; false only in the instant before {@link #show()}. */
    private boolean visible;
    /** The page the app asked for, or null before the first {@link #show()}. */
    private String requestedUrl;
    /** What the WebView is actually displaying - CIBAR's HashRouter moves this under our feet. */
    private String currentUrl;
    private String lastGesture = "—";
    private ScanTarget lastScan;
    private GlassesCameraStream cameraStream;
    /** Serves {@link #bundle} at {@link #CIBAR_URL}. Rebuilt whenever the bundle changes. */
    private WebViewAssetLoader assetLoader;
    private long lastCount;

    /**
     * True between asking for a page and hearing back about it, so one failed load produces one
     * rollback rather than one per sub-resource error the WebView happens to report.
     */
    private boolean loadOutcomePending;

    /**
     * How often the shell asks whether CIBAR has rendered anything, and when it stops asking
     * often.
     *
     * <p>It never stops asking. Confirming a launch is one boolean written to state.json, and
     * writing it late costs nothing - {@link WebBundleStore#markLaunchSucceeded()} has no window,
     * and the demotion it prevents is only ever read at the NEXT launch. Giving up, on the other
     * hand, has a real cost: a device that mounts a second past whatever deadline we picked would
     * have a perfectly good bundle demoted after two launches, and the slower the device the more
     * likely it is. There is no deadline that is safe in that direction, so there is no deadline.
     *
     * <p>What twelve seconds changes is only the cadence and one log line: a cold mount on the
     * glasses is well inside it, so a page still blank at that point is worth a word in the log,
     * and worth asking about every two seconds instead of four times a second.
     */
    private static final long APP_MOUNT_SLOW_AFTER_MILLIS = 12_000L;
    private static final long APP_MOUNT_POLL_MILLIS = 250L;
    private static final long APP_MOUNT_SLOW_POLL_MILLIS = 2_000L;

    /** Runs the mount probe. The WebView's own thread, which is the main thread. */
    private final Handler mainThread = new Handler(Looper.getMainLooper());

    /** Non-null while a launch is waiting to be confirmed; used to cancel a stale probe. */
    private Runnable pendingMountProbe;

    /**
     * The update controls the staff management mode calls, or null in a build that has none.
     *
     * <p>This is the only {@code addJavascriptInterface} in the app, and the only direction of
     * travel that is page → native. See {@link OtaControlBridge} for why a WebView that never
     * loads anything from the network can afford one.
     */
    private final OtaControlBridge otaControl;

    WebLayerController(WebView webView, WebBundle bundle, PageListener listener) {
        this(webView, bundle, listener, null);
    }

    /**
     * @param otaControl the object the staff management mode calls to run an update, or null when
     *                   there is nothing to control. Bound into the page under
     *                   {@link OtaControlBridgeScript#NATIVE_OBJECT}.
     */
    WebLayerController(WebView webView, WebBundle bundle, PageListener listener,
                       OtaControlBridge otaControl) {
        this.webView = webView;
        this.bundle = bundle;
        this.listener = listener;
        this.otaControl = otaControl;
        configure();
    }

    /** The live glasses camera, or null when the hardware layer has none to offer. */
    void setCameraStream(GlassesCameraStream stream) {
        this.cameraStream = stream;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configure() {
        WebSettings settings = webView.getSettings();
        // CIBAR is a React SPA; without these it renders an empty root and looks like a dead URL.
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        // A popup would need a second WebView we do not have; with this off, target="_blank"
        // loads in this WebView instead of being dropped.
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        // The bundled test page needs nothing from the device's storage, and the remote page must
        // never reach it. file:///android_asset and file:///android_res are exempt from this
        // switch by design, so the test page still loads with all three off.
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        // CIBAR is served over HTTPS; a downgraded sub-resource is a bug, not something to
        // silently allow.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // The active bundle is served over a real https origin - see WebBundleAssetHandler for
        // why not file:///android_asset. Built here rather than in the constructor because it
        // needs the WebView's context.
        installAssetLoader();
        if (otaControl != null) {
            webView.addJavascriptInterface(otaControl, OtaControlBridgeScript.NATIVE_OBJECT);
        }
        webView.setBackgroundColor(0xFF080A0F);
        webView.setWebViewClient(client);
        webView.setWebChromeClient(chromeClient);
        if (isDebuggable()) {
            // chrome://inspect against the phone, which is how a page-side failure gets diagnosed
            // without another build. Off in the release APK.
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }

    private boolean isDebuggable() {
        ApplicationInfo info = webView.getContext().getApplicationInfo();
        return (info.flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    // ---------------------------------------------------------------- visibility

    /**
     * Loads CIBAR. Called once, from {@code onCreate}: there is no other page and no button that
     * could ask for one, so this is the whole of the app's navigation.
     */
    void show() {
        visible = true;
        load(CIBAR_URL);
        webView.requestFocus();
    }

    /**
     * Serves a different bundle from here on, and reloads the page.
     *
     * <p>Called in exactly one situation: the active bundle failed to render its own entry point
     * and has been rolled back. It is not, and must never become, how a downloaded update is
     * applied - a bundle that arrives mid-session becomes {@code pending} and waits for the next
     * launch, because swapping the page underneath somebody three choices into a scenario loses
     * the run and looks like a crash.
     */
    void setBundle(WebBundle replacement) {
        if (replacement == null) return;
        bundle = replacement;
        installAssetLoader();
        Log.i(TAG, "改用 " + replacement + " 重新載入 CIBAR");
        load(CIBAR_URL);
    }

    /** The bundle currently being served. */
    WebBundle bundle() {
        return bundle;
    }

    private void installAssetLoader() {
        assetLoader = WebBundleAssetHandler.loaderFor(
                webView.getContext().getApplicationContext().getAssets(), bundle);
        Log.i(TAG, "網頁內容：由 " + CIBAR_URL + " 提供（" + bundle + "，不需要網路）");
    }

    /**
     * Which hosted page a URL belongs to, or null for anything else.  A prefix rather than an
     * equality: CIBAR is a HashRouter app, so once the user has moved off its first screen the
     * displayed URL carries a {@code #/...} route and is no longer the address we asked for - it
     * is still the same page.
     */
    static String pageOf(String url) {
        if (url == null) return null;
        if (url.startsWith(CIBAR_URL)) return CIBAR_URL;
        return null;
    }

    private void load(String url) {
        requestedUrl = url;
        currentUrl = url;
        loadOutcomePending = true;
        Log.i(TAG, "載入中… " + url);
        webView.loadUrl(url);
    }

    /**
     * @return true when the key was consumed. The WebView's own history first - CIBAR's HashRouter
     *         records every route there - and once it is exhausted the activity gets the key and
     *         finishes. There is nothing behind CIBAR to go back to any more.
     */
    boolean onBackPressed() {
        if (!visible) return false;
        if (webView.canGoBack()) {
            webView.goBack();
            return true;
        }
        return false;
    }

    // ---------------------------------------------------------------- gestures

    /**
     * Hands one accepted gesture to the page.  Called on the main thread from the activity's
     * hardware listener; the WebView is never touched from an SDK thread.
     *
     * <p>A gesture is only <em>dispatched</em> while the page is actually on screen.  The page
     * stays loaded behind the diagnostics panel so returning to it does not restart CIBAR, but a
     * gesture aimed at the diagnostics panel is not aimed at CIBAR: once the page acts on these
     * events it would otherwise navigate and answer questions invisibly, and the user would come
     * back to a screen they never chose.  The counters are still recorded and pushed as a
     * {@code sync}, which updates the readout without telling the page anything happened, so
     * nothing is lost - only the event that would have driven it.
     *
     * @param code bare uppercase gesture code, or null for "no gesture yet" (a restart), which
     *             updates the readout without telling the page anything happened.
     */
    void onGesture(String code, String label, long count) {
        lastGesture = code == null ? "—" : code;
        lastCount = count;
        if (code == null || !visible) {
            evaluate(GestureBridgeScript.sync(lastGesture, count));
        } else {
            evaluate(GestureBridgeScript.deliver(
                    code, label, count, SystemClock.elapsedRealtime()));
        }
    }

    /**
     * Hands one recognised target to the page. Called on the main thread; the WebView is never
     * touched from a camera or SDK thread.
     *
     * <p>Unlike a gesture, this is not gated on the layer being visible. A scan is what decides
     * <em>which</em> scenario to open, so it has to be able to arrive while the diagnostics panel
     * is still up - that is precisely the moment the wearer is pointing the glasses at a card.
     */
    void onScan(ScanTarget target, float confidence) {
        if (target == null) return;
        lastScan = target;
        evaluate(ScanBridgeScript.deliver(target.index, target.scenario, confidence,
                SystemClock.elapsedRealtime()));
    }

    /**
     * Waits for CIBAR to render something, and only then reports the launch as good.
     *
     * <p>Polls rather than waiting for the page to call in, because the page must not have to
     * know this exists: a bundle that stopped calling a native method would be rolled back for
     * being healthy, and a bundle that could call one is a bundle with a native method to call.
     * See {@link AppMountedProbeScript}.
     *
     * <p>It keeps asking for as long as the page is up - see the constants above for why there is
     * no deadline. Nothing here rolls anything back: a white screen this session is not evidence
     * that the previous bundle is better, and swapping under a wearer mid-session is its own
     * failure. A page that never renders simply leaves the launch unconfirmed, and
     * {@code WebBundleStore} demotes a bundle that collects two of those in a row - which is the
     * difference between "this launch was odd" and "this bundle does not work".
     */
    private void awaitAppMounted() {
        cancelMountProbe();
        final long slowAfter = SystemClock.elapsedRealtime() + APP_MOUNT_SLOW_AFTER_MILLIS;
        pendingMountProbe = new Runnable() {
            /** So the "still blank" line is said once, not every two seconds for a session. */
            private boolean warned;

            @Override public void run() {
                // `this` is this Runnable. A newer page load replaces the field, and the stale
                // probe it displaced stops here rather than confirming the wrong document.
                if (pendingMountProbe != this || listener == null) return;
                try {
                    webView.evaluateJavascript(AppMountedProbeScript.probe(), value -> {
                        if (pendingMountProbe != this || listener == null) return;
                        if ("true".equals(value)) {
                            pendingMountProbe = null;
                            loadOutcomePending = false;
                            Log.i(TAG, "CIBAR 已經畫出畫面，這一版標記為可用");
                            listener.onPageReady();
                            return;
                        }
                        boolean slow = SystemClock.elapsedRealtime() >= slowAfter;
                        if (slow && !warned) {
                            warned = true;
                            // Not a verdict. The launch is simply not confirmed yet, and this is
                            // the line that tells whoever reads the log why.
                            Log.w(TAG, "頁面載入完成，但 " + (APP_MOUNT_SLOW_AFTER_MILLIS / 1000)
                                    + " 秒內還沒畫出任何東西；繼續等，這次啟動尚未確認");
                        }
                        mainThread.postDelayed(this,
                                slow ? APP_MOUNT_SLOW_POLL_MILLIS : APP_MOUNT_POLL_MILLIS);
                    });
                } catch (Throwable unavailable) {
                    // A WebView that cannot be asked cannot be confirmed, and asking it again
                    // will not go better. This is the one path that stops.
                    pendingMountProbe = null;
                    Log.w(TAG, "無法詢問頁面是否已經啟動；這次啟動不算成功", unavailable);
                }
            }
        };
        mainThread.post(pendingMountProbe);
    }

    private void cancelMountProbe() {
        if (pendingMountProbe != null) {
            mainThread.removeCallbacks(pendingMountProbe);
            pendingMountProbe = null;
        }
    }

    private void evaluate(String script) {
        // Delivering into a page that was never loaded is a no-op, not an error, but skipping it
        // keeps the WebView from being spun up before the user ever asks for a page.
        if (requestedUrl == null) return;
        try {
            webView.evaluateJavascript(script, null);
        } catch (Throwable error) {
            Log.w(TAG, "注入手勢至 WebView 失敗", error);
        }
    }

    // ---------------------------------------------------------------- lifecycle

    /**
     * Paired with the activity's onStart/onStop rather than onResume/onPause on purpose: a USB
     * permission dialog pauses the activity, and pausing the WebView's timers underneath it would
     * freeze the diagnostic readout at exactly the moment the tester is watching it.
     */
    void onStart() {
        webView.onResume();
        webView.resumeTimers();
    }

    void onStop() {
        webView.onPause();
        webView.pauseTimers();
    }

    void destroy() {
        // Before the WebView goes: the probe posts itself back to the main thread indefinitely,
        // and a Runnable holding a destroyed WebView is a leak that outlives the activity.
        cancelMountProbe();
        try {
            webView.stopLoading();
            webView.setWebChromeClient(null);
            webView.loadUrl("about:blank");
            if (webView.getParent() instanceof android.view.ViewGroup) {
                ((android.view.ViewGroup) webView.getParent()).removeView(webView);
            }
            webView.destroy();
        } catch (Throwable error) {
            Log.w(TAG, "釋放 WebView 失敗", error);
        }
    }

    // ---------------------------------------------------------------- clients

    private final WebViewClient client = new WebViewClient() {
        @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return handleUrl(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return handleUrl(Uri.parse(url));
        }

        /**
         * Serves the glasses camera at {@link #GLASSES_CAMERA_URL}. Runs on a WebView thread,
         * never the main one, and the response body blocks between frames - that is what makes
         * an MJPEG response stay open.
         */
        @Override public WebResourceResponse shouldInterceptRequest(WebView view,
                                                                   WebResourceRequest request) {
            if (request == null || request.getUrl() == null) return null;
            String url = request.getUrl().toString();
            Interception owner = interceptionFor(url);
            if (owner == Interception.NETWORK) return null;
            if (owner == Interception.BUNDLED_ASSET) {
                // The active bundle - the APK's baseline, or one that arrived over the air. The
                // loader is rebuilt by installAssetLoader() whenever the bundle changes, and it is
                // read into a local first because a rollback can replace it from the main thread
                // while this runs on a WebView thread.
                WebViewAssetLoader loader = assetLoader;
                return loader == null ? null : loader.shouldInterceptRequest(request.getUrl());
            }
            GlassesCameraStream stream = cameraStream;
            if (stream == null) {
                // Without this line the page sees a 404 (nothing is served at that path by the
                // real site, and nothing is bundled at it either) and reports "the stream could
                // not be loaded" - which reads as a broken stream when the truth is that this app
                // never had a camera to serve in the first place.
                Log.w(TAG, "MJPEG request intercepted but no camera stream is attached: " + url);
                return null;
            }
            Log.i(TAG, "MJPEG request intercepted: " + url
                    + " hasFrame=" + stream.hasFrame()
                    + " width=" + stream.frameWidth() + " height=" + stream.frameHeight());
            return new WebResourceResponse(
                    MJPEG_MIME_TYPE, null, 200, "OK", glassesCameraHeaders(), stream.newBody());
        }

        @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
            Log.i(TAG, "載入中… " + url);
        }

        /**
         * Every navigation reports here, including the back key walking history and CIBAR's own
         * hash routes (which never reload the document and so never reach onPageFinished).  This
         * is what keeps {@link #currentUrl} honest.
         */
        @Override public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
            currentUrl = url;
            String page = pageOf(url);
            if (page != null) requestedUrl = page;
            // Re-publish the camera descriptor on every route CIBAR walks to. See
            // publishCameraDescriptor(): this is what stops /ar-scan from reading a descriptor
            // that was written before the camera had a frame, or one that a rebuilt WebView
            // never received at all.
            if (CIBAR_URL.equals(page)) publishCameraDescriptor();
        }

        @Override public void onPageFinished(WebView view, String url) {
            currentUrl = url;
            Log.i(TAG, "頁面載入完成：" + url);
            // Install immediately so the bridge exists before the first gesture, and restore the
            // counters this session has already accumulated.
            evaluate(GestureBridgeScript.sync(lastGesture, lastCount));
            // Publish the scan bridge as well, so a page that finishes loading between a scan
            // and the next one can still see window.__jorjinScanBridge.
            evaluate(ScanBridgeScript.install());
            // Which APK Shell the page is running inside. The page knows its own Web Bundle
            // version and nothing else; the two travel separately (docs/RELEASE_VERSIONING.md)
            // and only together do they identify what is installed on this device.
            evaluate(shellDescriptorScript());
            publishCameraDescriptor();
            // Native OTA is this shell's version control; a Service Worker left over from any
            // earlier visit to this origin would answer requests above it and serve a version
            // nothing on the native side knows about. See ServiceWorkerGuardScript.
            evaluate(ServiceWorkerGuardScript.install());
            if (listener != null) {
                evaluate(OtaDiagnosticsScript.install(listener.otaDiagnosticsJson()));
                // The staff management mode's update controls, and the phase they report into.
                // Injected after the diagnostics so a page that reads both on cibarOtaControlReady
                // already has the versions to go with them.
                if (otaControl != null) evaluate(OtaControlBridgeScript.install());
                evaluate(OtaControlBridgeScript.status(listener.otaStatusJson()));
                // The document loaded. That is NOT the same as CIBAR having come up, and the
                // difference is the one failure the rollback gate could not otherwise see - see
                // AppMountedProbeScript. Only CIBAR's own document is a candidate at all: an
                // error page rendered by showFailure() has no base URL and does not match.
                if (pageOf(url) != null) awaitAppMounted();
            }
        }

        @Override public void onReceivedError(WebView view, WebResourceRequest request,
                                              WebResourceError error) {
            if (request == null || !request.isForMainFrame()) return;
            String detail = error == null ? "載入失敗" : String.valueOf(error.getDescription());
            int code = error == null ? 0 : error.getErrorCode();
            if (rollBack(detail + "（錯誤碼 " + code + "）")) return;
            showFailure("無法載入網頁", detail + "（錯誤碼 " + code + "）", hintFor(code, detail));
        }

        /**
         * A server that answers with an error still counts as a failed page: the WebView would
         * otherwise render whatever body came with the 404 or 500, which for a bare host is
         * usually nothing at all.
         */
        @Override public void onReceivedHttpError(WebView view, WebResourceRequest request,
                                                  WebResourceResponse response) {
            if (request == null || !request.isForMainFrame() || response == null) return;
            int status = response.getStatusCode();
            if (rollBack("進入點回應 HTTP " + status)) return;
            showFailure("伺服器回應錯誤 " + status,
                    String.valueOf(request.getUrl()),
                    status == 404 ? missingPageHint()
                            : "這是伺服器端的回應，不是 App 的問題。");
        }

        /**
         * The silent one. An SSL failure - a phone whose clock is wrong, a captive portal, a
         * proxy that intercepts TLS - makes WebView cancel the load and render nothing at all,
         * with no error callback of any other kind. A blank screen with no explanation is
         * exactly what that looks like, so it is reported rather than swallowed.
         *
         * <p>The handler is cancelled, never proceeded with: bypassing certificate validation to
         * make a page appear is not a fix.
         */
        @Override public void onReceivedSslError(WebView view, SslErrorHandler handler,
                                                 SslError error) {
            if (handler != null) handler.cancel();
            String detail = error == null ? "憑證驗證失敗" : describeSsl(error);
            showFailure("TLS 憑證驗證失敗", detail,
                    "最常見是手機日期時間不正確，或連到會攔截 HTTPS 的網路（公司 Wi-Fi、"
                            + "代理伺服器）。請校正時間或換一個網路再試。");
        }
    };

    /**
     * Rolls the active bundle back and reloads, when a main-frame load has failed.
     *
     * <p>This is the fast path of the rollback described on {@code WebBundleStore}: a bundle that
     * cannot render its own entry point is demoted here, in this session, and the previous one -
     * or the APK's baseline - is loaded instead. The wearer sees a reload rather than a white
     * screen they would have to close the app to escape.
     *
     * @return true when a different bundle is now loading, so no failure page should be shown.
     */
    private boolean rollBack(String detail) {
        if (listener == null || !loadOutcomePending) return false;
        loadOutcomePending = false;
        WebBundle fallback = listener.onPageFailed(detail);
        // Same bundle back means there was nothing to fall back to - the APK's baseline is
        // already what failed. Nothing to reload; the failure page is the honest answer.
        if (fallback == null || fallback == bundle) return false;
        setBundle(fallback);
        return true;
    }

    /**
     * What a 404 on the main frame means. There is one source of web content now and it is this
     * device, so a missing entry point is never a server problem: it is a bundle that is not what
     * it claimed to be, which is a packaging failure no amount of checking the network explains.
     */
    private static String missingPageHint() {
        return "本機的網頁內容缺少這個檔案。若這是 APK 內建版本，代表打包時 webapp/dist 沒有"
                + "完整放進 assets；若是 OTA 下載的版本，App 會自動退回上一版。"
                + "跟網路無關，請回報並附上 ota-diagnostics.json。";
    }

    private static String describeSsl(SslError error) {
        switch (error.getPrimaryError()) {
            case SslError.SSL_DATE_INVALID: return "憑證日期無效（手機時間可能不正確）";
            case SslError.SSL_EXPIRED: return "憑證已過期（手機時間可能不正確）";
            case SslError.SSL_NOTYETVALID: return "憑證尚未生效（手機時間可能不正確）";
            case SslError.SSL_IDMISMATCH: return "憑證主機名稱不符";
            case SslError.SSL_UNTRUSTED: return "憑證不受信任（可能被代理攔截）";
            case SslError.SSL_INVALID: return "憑證無效";
            default: return "憑證錯誤 " + error.getPrimaryError();
        }
    }

    /**
     * Turns a WebView error code into something a tester can act on without a decoder ring.
     *
     * <p>Every one of these is now a local failure, and saying so is the point. The experience
     * never loads anything over the network - the network is only ever how a <em>future</em>
     * bundle is fetched, in the background - so "check your Wi-Fi" is never the right advice here,
     * and a tester sent to turn on a radio would be looking in the wrong place while the actual
     * problem sits in the bundle.
     */
    private static String hintFor(int code, String detail) {
        String text = detail == null ? "" : detail.toUpperCase(java.util.Locale.ROOT);
        if (text.contains("NAME_NOT_RESOLVED") || code == WebViewClient.ERROR_HOST_LOOKUP) {
            // appassets.androidplatform.net resolves nowhere: reaching DNS for it means the
            // request escaped the asset loader, which is a request for something that is not in
            // the bundle at all.
            return "這個要求指向本機 bundle 以外的位址。網頁內容都在 " + CIBAR_URL
                    + " 底下，出現這個錯誤代表頁面引用了外部資源，請回報。";
        }
        if (code == WebViewClient.ERROR_UNSUPPORTED_SCHEME) {
            return "這個連結不是 http/https，已被擋下以免離開本 App。";
        }
        return "網頁內容全部在手機本機，不需要網路。看到載入錯誤代表目前這一份 bundle 有缺，"
                + "App 會自動退回上一版；請回報並附上 ota-diagnostics.json。";
    }

    /**
     * Renders the failure into the WebView itself. The status line along the top is 11sp of grey
     * and easy to miss; a blank page with a quiet caption is indistinguishable from a page that
     * simply has not loaded yet, which is how "CIBAR shows nothing" arrives as a bug report with
     * no detail attached.
     */
    private void showFailure(String title, String detail, String hint) {
        Log.w(TAG, "WebView 載入失敗：" + title + " / " + detail);
        String html = "<!doctype html><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<body style=\"margin:0;background:#080A0F;color:#fff;"
                + "font-family:sans-serif;padding:6vmin;line-height:1.6\">"
                + "<div style=\"font-size:6vmin;font-weight:700;color:#FFD0D8\">" + esc(title)
                + "</div>"
                + "<div style=\"margin-top:3vmin;font-size:4vmin;font-family:monospace;"
                + "color:#AFC0CF;word-break:break-all\">" + esc(detail) + "</div>"
                + "<div style=\"margin-top:4vmin;font-size:4.2vmin\">" + esc(hint) + "</div>"
                + "<div style=\"margin-top:5vmin;font-size:3.6vmin;color:#7E93A6\">"
                + esc(loadedTarget()) + "</div>"
                + "</body>";
        // No base URL, so this cannot be mistaken for the real page: pageOf() stops matching and
        // the next tap on the button retries the load instead of merely re-showing the layer.
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private String loadedTarget() {
        return requestedUrl == null ? "" : "目標網址：" + requestedUrl;
    }

    private static String esc(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    /**
     * Every navigation stays in this WebView.  http/https and our own bundled assets are loaded
     * here (returning false hands the URL back to the WebView); anything else - a tel:, mailto:
     * or intent: URL, or a file:// URL pointing at the device's storage - would either need an
     * external app, which is the exact thing that kills the hardware, or reach somewhere a web
     * page has no business reaching.  Those are refused and logged instead.
     */
    private boolean handleUrl(Uri uri) {
        if (uri == null) return true;
        String scheme = uri.getScheme();
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) return false;
        if (uri.toString().startsWith("file:///android_asset/")) return false;
        Log.i(TAG, "已阻擋離開 App 的連結：" + uri);
        return true;
    }

    private final WebChromeClient chromeClient = new WebChromeClient() {
        @Override public boolean onConsoleMessage(ConsoleMessage message) {
            Log.i(TAG, "WebView console: " + message.message()
                    + " @" + message.sourceId() + ":" + message.lineNumber());
            return true;
        }
    };

    /**
     * Tells the page whether a glasses camera exists and where to read it.
     *
     * <p>The flag matters as much as the URL: the same page runs on a desktop browser during
     * development, where there is no {@code __jorjinCamera} and {@code getUserMedia} is the right
     * answer. A page that branches on this works in both places without knowing which it is in.
     *
     * <p>Static and taking its inputs as arguments so the script's shape can be pinned by a test:
     * a typo in it is invisible here and reaches the page as a missing descriptor, which is
     * indistinguishable from an ar-app that never injected one at all.
     */
    static String cameraDescriptorScript(boolean available, int width, int height) {
        return "window.__jorjinCamera={"
                + "version:1,"
                + "available:" + available + ","
                + "streamUrl:" + GestureBridgeScript.quote(GLASSES_CAMERA_URL) + ","
                + "width:" + width + ","
                + "height:" + height
                + "};"
                + "try{window.dispatchEvent(new CustomEvent('jorjinCameraReady',"
                + "{detail:window.__jorjinCamera}));}catch(e){}";
    }

    /**
     * This APK Shell's identity, as the page will see it under {@code window.__cibarShell}.
     *
     * <p>Three of the four are build-time constants - {@code BuildConfig.SHELL_VERSION} comes from
     * {@code release/versions.json}, the one place a version number may be edited. The fourth is
     * not: which bundle is being served is decided at launch and is the whole point of the OTA
     * mechanism, so it is read from the bundle in hand rather than compiled in.
     */
    private String shellDescriptorScript() {
        return ShellBridgeScript.install(BuildConfig.SHELL_VERSION, BuildConfig.VERSION_NAME,
                BuildConfig.VERSION_CODE, bundle.source.name());
    }

    /**
     * Publishes the descriptor into the page that is currently loaded, and says so in the log.
     *
     * <p>Called from {@code onPageFinished} <em>and</em> from every subsequent in-page
     * navigation. The global cannot survive a document reload, and CIBAR's HashRouter routes do
     * not reload the document - but the two failures this closes are real ones: a WebView that
     * was rebuilt or reloaded under the page leaves the descriptor behind with it, and the
     * width/height published at load time are 0 because the camera has not delivered a frame
     * yet. Re-publishing on each route is one {@code evaluateJavascript} per screen change, and
     * it means the page reaches /ar-scan holding the sizes the camera is actually producing.
     */
    /**
     * Pushes a new update phase into the page while it is running.
     *
     * <p>The diagnostics global is re-published alongside it rather than only at page load,
     * because a finished download changes both: the phase becomes "ready for restart" and the
     * pending version appears in the diagnostics. A staff screen reading one without the other
     * would show a restart button with nothing to name.
     *
     * <p>Main thread only - the caller hops there first. Nothing here draws anything: it writes
     * two globals and fires an event, and a page that is not the staff screen has nothing
     * listening for either.
     */
    void publishOtaState(String statusJson, String diagnosticsJson) {
        evaluate(OtaDiagnosticsScript.install(diagnosticsJson));
        evaluate(OtaControlBridgeScript.status(statusJson));
    }

    private void publishCameraDescriptor() {
        GlassesCameraStream stream = cameraStream;
        boolean available = stream != null;
        int width = available ? stream.frameWidth() : 0;
        int height = available ? stream.frameHeight() : 0;
        Log.i(TAG, "Jorjin Camera Descriptor: " + (available ? "present" : "missing")
                + " available=" + available
                + " streamUrl=" + GLASSES_CAMERA_URL
                + " width=" + width + " height=" + height
                + " hasFrame=" + (available && stream.hasFrame()));
        evaluate(cameraDescriptorScript(available, width, height));
    }

}
