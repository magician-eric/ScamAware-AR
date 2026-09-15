package com.bigxreality.jorjinverifier;

import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.util.Log;
import android.webkit.WebResourceResponse;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.webkit.WebViewAssetLoader;

import com.bigxreality.jorjinverifier.ota.BundleContent;
import com.bigxreality.jorjinverifier.ota.OtaLog;
import com.bigxreality.jorjinverifier.ota.WebBundle;
import com.bigxreality.jorjinverifier.ota.WebBundlePaths;
import com.bigxreality.jorjinverifier.ota.WebBundleResponder;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Serves the active CIBAR bundle at {@code https://appassets.androidplatform.net/CIBAR/…}.
 *
 * <p>This is the thin half, and it is deliberately thin: which file a path means, what
 * {@code Content-Type} it gets, whether a miss falls back to the SPA document and what a 404 says
 * all live in {@link WebBundleResponder} and {@link WebBundlePaths}, where a JVM test can see them.
 * All this class does is hand over an {@code AssetManager} or a directory and translate the answer
 * into a {@link WebResourceResponse}.
 *
 * <h2>Why not file:///android_asset/ or file:///data/…</h2>
 * A {@code file://} document is an opaque origin in a modern WebView, and this app breaks in three
 * separate ways under one: {@code fetch()} of the {@code .mind} image-target dataset is refused,
 * ES modules (the Vite build ships {@code <script type="module">}) are refused outright by the
 * module loader's origin check, and the MJPEG camera frames become cross-origin to the document,
 * which taints the recognition canvas and makes {@code getImageData} throw. Serving the same bytes
 * over a real https origin makes all of it behave exactly as it does on the published site.
 *
 * <p>That origin is also what makes an over-the-air update invisible to the page. The URL the page
 * is loaded from is the same string whether the bytes come out of the APK or out of internal
 * storage, so React Router, the asset paths Vite compiled against {@code base: '/CIBAR/'}, the
 * camera bridge, {@code localStorage} and the camera permission grant all carry across an update
 * without noticing one happened.
 */
final class WebBundleAssetHandler implements WebViewAssetLoader.PathHandler {
    private static final String TAG = "JorjinVerifier";

    private final WebBundleResponder responder;

    private WebBundleAssetHandler(WebBundleResponder responder) {
        this.responder = responder;
    }

    /**
     * Builds the loader that routes {@code /CIBAR/} on the reserved app-assets domain at whichever
     * bundle this session resolved to.
     *
     * <p>Only that one prefix is registered, and only the bundle behind it is reachable: nothing
     * else in {@code assets/}, and nothing else in the app's internal storage.
     */
    static WebViewAssetLoader loaderFor(AssetManager assets, WebBundle bundle) {
        BundleContent content = bundle.isBaseline()
                ? new AssetContent(assets)
                : new BundleContent.Directory(bundle.directory);
        OtaLog log = message -> Log.w(TAG, message);
        return new WebViewAssetLoader.Builder()
                .setDomain(WebContentSource.LOCAL_DOMAIN)
                .addPathHandler(WebContentSource.LOCAL_PATH_PREFIX,
                        new WebBundleAssetHandler(new WebBundleResponder(content, log)))
                .build();
    }

    @Nullable
    @Override
    public WebResourceResponse handle(@NonNull String path) {
        WebBundleResponder.Response response = responder.respondTo(path);
        Map<String, String> headers = new HashMap<>();
        if (response.contentLength >= 0) {
            headers.put("Content-Length", Long.toString(response.contentLength));
        }
        return new WebResourceResponse(response.mimeType, response.encoding, response.status,
                response.reason, headers, response.body);
    }

    /**
     * The APK's own assets - the baseline bundle, staged into {@code assets/cibar/} at build time.
     *
     * <p>{@code openFd} is tried first because it is the only way to learn an asset's length, and
     * it only succeeds for assets aapt stored uncompressed. aapt's built-in never-compress list
     * already covers every media extension in this bundle ({@code .mp4}, {@code .mp3},
     * {@code .webp}, …), so the scenario videos - the files where a declared length actually
     * matters to Chromium's media stack - all take that path. The HTML, JavaScript, CSS and the
     * {@code .mind} target are deflated in the APK and are opened the ordinary way, with no length
     * claimed, which a WebView handles perfectly well.
     */
    private static final class AssetContent implements BundleContent {

        private final AssetManager assets;

        AssetContent(AssetManager assets) {
            this.assets = assets;
        }

        @Override public Resource open(String relativePath) {
            String asset = WebBundlePaths.ASSET_ROOT + "/" + relativePath;
            try {
                AssetFileDescriptor fd = assets.openFd(asset);
                return new Resource(fd.getLength(), fd.createInputStream());
            } catch (IOException compressedOrMissing) {
                // openFd throws for a compressed asset exactly as it does for a missing one, so
                // this is not yet an answer about whether the file exists.
            }
            try {
                InputStream body = assets.open(asset, AssetManager.ACCESS_STREAMING);
                return new Resource(-1L, body);
            } catch (IOException missing) {
                return null;
            }
        }

        @Override public boolean exists(String relativePath) {
            Resource resource = open(relativePath);
            if (resource == null) return false;
            try {
                resource.stream.close();
            } catch (IOException ignored) {
                // Nothing to do; the question was only whether it opened.
            }
            return true;
        }
    }
}
