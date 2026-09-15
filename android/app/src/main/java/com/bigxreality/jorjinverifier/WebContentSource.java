package com.bigxreality.jorjinverifier;

import com.bigxreality.jorjinverifier.ota.WebBundlePaths;

/**
 * Where the CIBAR web experience is served from, and where this app looks for a newer one.
 *
 * <h2>One delivery, not two</h2>
 * There used to be two APKs - an "online" one whose WebView loaded the published GitHub Pages
 * build, and an "offline" one that carried a copy of the same build inside itself and declared no
 * INTERNET permission at all. Two APKs meant two names on the home screen, two things to explain
 * before a session, and a standing chance of demonstrating with the wrong one: they are
 * indistinguishable in use right up to the moment the network is taken away.
 *
 * <p>There is one APK now, and the page always comes from this device. It is the offline build's
 * mechanism - a complete web build served over a local https origin - with the online build's
 * property of never going stale, obtained by fetching new builds in the background and swapping
 * them in at the next launch rather than by fetching the page itself every time. The network is
 * now only ever a way to <em>acquire</em> a bundle. It is never the source a scenario plays from.
 *
 * <h2>Why the local origin uses the site's own /CIBAR/ path</h2>
 * The Vite build is configured with {@code base: '/CIBAR/'} because that is where GitHub Pages
 * serves it, so every built asset URL in {@code index.html} is absolute and starts with
 * {@code /CIBAR/}. Mounting the bundle anywhere else would need a second build of the same source
 * with a different base - two builds of one webapp, which is exactly the drift this arrangement
 * exists to avoid. Mounting it here means the APK ships, and the OTA bundle carries, the identical
 * {@code webapp/dist} the website ships.
 */
final class WebContentSource {

    /**
     * The domain {@code androidx.webkit}'s {@code WebViewAssetLoader} reserves for app-local
     * content. It is not a real host: nothing resolves it, nothing is ever fetched over the
     * network for it, and Google guarantees it will never be registered - which is what makes it
     * safe to treat as this app's own secure origin.
     */
    static final String LOCAL_DOMAIN = "appassets.androidplatform.net";

    /** The path the active bundle is mounted at - see the class comment for why it is /CIBAR/. */
    static final String LOCAL_PATH_PREFIX = "/CIBAR/";

    /** A real https origin, so the page runs under the same rules it does on the published site. */
    static final String ROOT_URL = "https://" + LOCAL_DOMAIN + LOCAL_PATH_PREFIX;

    /**
     * Where the page reads the glasses camera from, relative to the root.
     *
     * <p>Deliberately a path under CIBAR's own origin rather than a separate host. Recognition
     * reads pixels back with {@code getImageData}, and a canvas drawn from a cross-origin image is
     * tainted - {@code getImageData} then throws SecurityError and the whole recogniser dies. Same
     * origin means no taint, and no CORS headers to get subtly wrong. Nothing is served at this
     * path by any bundle; it exists only to be intercepted by {@code WebLayerController}.
     */
    static final String CAMERA_FILE = WebBundlePaths.CAMERA_FILE;

    /**
     * The published site, which is also where the OTA pointer file lives. Not loaded by the
     * WebView - nothing in the experience is ever fetched from here.
     */
    static final String SITE_ROOT = "https://ericingptt.github.io/CIBAR/";

    /**
     * The one URL this app fetches over the network: a few hundred bytes saying which web bundle
     * release is current, where its archive is, and what that archive must hash to.
     *
     * <p>The published copy of {@code release/ota/latest.json}, written by
     * {@code .github/workflows/ota-release.yml} <em>after</em> the archive it points at has been
     * uploaded and fetched back and proven to hash to what this file claims. See
     * {@code docs/RELEASE_VERSIONING.md} §8 and §10 for why that order is not negotiable.
     */
    static final String UPDATE_LATEST_URL = SITE_ROOT + "ota/latest.json";

    /** Origin + path, always ending in "/". Every other URL here is this plus a suffix. */
    final String rootUrl;
    /** What the app asks the WebView to load. The root is a directory URL, so it is the root. */
    final String entryUrl;
    /** The MJPEG endpoint the page reads the glasses camera from. */
    final String cameraUrl;

    private WebContentSource(String rootUrl) {
        this.rootUrl = rootUrl;
        this.entryUrl = rootUrl;
        this.cameraUrl = rootUrl + CAMERA_FILE;
    }

    /** The local origin the active bundle is served at, whatever that bundle turns out to be. */
    static WebContentSource local() {
        return new WebContentSource(ROOT_URL);
    }

    /** Whether a URL belongs to CIBAR's page, route fragments and query strings included. */
    boolean owns(String url) {
        return url != null && url.startsWith(rootUrl);
    }

    /**
     * Whether a request is the page asking for the glasses camera.
     *
     * <p>A prefix rather than an equality, because a query string on this URL is a perfectly
     * ordinary thing for a page to add - a cache-buster on a retry is the obvious one - and a
     * request that misses this test does not fail loudly: it falls through to the bundle and 404s
     * there, and the page reports a broken camera stream.
     */
    boolean isCameraRequest(String url) {
        if (url == null) return false;
        if (!url.startsWith(cameraUrl)) return false;
        String rest = url.substring(cameraUrl.length());
        return rest.isEmpty() || rest.startsWith("?") || rest.startsWith("#");
    }
}
