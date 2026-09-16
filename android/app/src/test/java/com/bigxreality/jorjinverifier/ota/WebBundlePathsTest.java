package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Pins how a URL becomes a file inside whichever bundle is active.
 *
 * <p>None of this can be checked by eye on a phone: a wrong {@code Content-Type} does not show an
 * error, it shows an unstyled page or a module script the WebView refuses to run, and a path that
 * resolves one directory too high does not fail loudly either.
 */
public class WebBundlePathsTest {

    @Test public void theBundleRootIsTheEntryPoint() {
        // What the app loads: https://appassets.androidplatform.net/ScamAware-AR/ - the loader hands the
        // handler an empty path for it, and the SPA document is the answer.
        assertEquals("index.html", WebBundlePaths.relativePathFor(""));
        assertEquals("index.html", WebBundlePaths.relativePathFor("/"));
        assertEquals("index.html", WebBundlePaths.relativePathFor("index.html"));
    }

    @Test public void aBuiltAssetMapsStraightIntoTheBundle() {
        assertEquals("assets/index-D79056as.js",
                WebBundlePaths.relativePathFor("assets/index-D79056as.js"));
        assertEquals("assets/shared/ar/image-targets.mind",
                WebBundlePaths.relativePathFor("/assets/shared/ar/image-targets.mind"));
        assertEquals("manifest.json", WebBundlePaths.relativePathFor("manifest.json"));
        // A media file outside assets/, in public/media/ - the drop folder anything added by
        // hand lands in.
        assertEquals("media/stings/outro.mp4",
                WebBundlePaths.relativePathFor("/media/stings/outro.mp4"));
    }

    /**
     * Inside the APK the same build sits under {@code assets/cibar/}, one path segment away from
     * anything else the APK ever packages. Only {@code /ScamAware-AR/} is mounted, and only that
     * subdirectory is behind it.
     */
    @Test public void theApkKeepsTheBaselineInItsOwnAssetSubdirectory() {
        assertEquals("cibar/index.html", WebBundlePaths.assetPathFor(""));
        assertEquals("cibar/assets/app.js", WebBundlePaths.assetPathFor("assets/app.js"));
        // The baseline's manifest is deliberately NOT under that subdirectory, so it is not
        // reachable from the page's own origin.
        assertNull(WebBundlePaths.assetPathFor("../cibar-baseline-manifest.json"));
    }

    /** A query or fragment is the page's business, not the file system's. */
    @Test public void queriesAndFragmentsAreNotPartOfTheFilename() {
        assertEquals("assets/app.js", WebBundlePaths.relativePathFor("assets/app.js?v=2"));
        assertEquals("index.html", WebBundlePaths.relativePathFor("index.html#/ar-scan"));
        assertEquals("index.html", WebBundlePaths.relativePathFor("?diag=1"));
    }

    /** Nothing outside the bundle is reachable from CIBAR's origin. */
    @Test public void nothingCanClimbOutOfTheBundle() {
        assertNull(WebBundlePaths.relativePathFor("../gesture-test/index.html"));
        assertNull(WebBundlePaths.relativePathFor("assets/../../gesture-test/index.html"));
        assertNull(WebBundlePaths.relativePathFor("/./index.html"));
        assertNull(WebBundlePaths.relativePathFor("assets\\app.js"));
        assertNull(WebBundlePaths.relativePathFor("assets//app.js"));
        assertNull(WebBundlePaths.relativePathFor(null));
    }

    /**
     * The glasses camera is not a file and never becomes one. {@code WebLayerController} answers it
     * before any bundle is consulted; if that order is ever changed, this makes the bundle refuse
     * it rather than answer the camera request with an empty 404 body, which the page would report
     * as a dead camera on perfectly working hardware.
     */
    @Test public void theCameraEndpointIsNeverServedFromABundle() {
        assertNull(WebBundlePaths.relativePathFor(WebBundlePaths.CAMERA_FILE));
        assertNull(WebBundlePaths.relativePathFor("/" + WebBundlePaths.CAMERA_FILE));
        assertNull(WebBundlePaths.assetPathFor(WebBundlePaths.CAMERA_FILE));
    }

    /**
     * A route is not a file. CIBAR runs on a HashRouter, so its routes are fragments and never
     * reach here at all - this is for a reload or deep link that lands on a path, and for a future
     * move to a path-based router.
     */
    @Test public void aRouteFallsBackToTheDocument() {
        assertTrue(WebBundlePaths.isRouteRequest(""));
        assertTrue(WebBundlePaths.isRouteRequest("/"));
        assertTrue(WebBundlePaths.isRouteRequest("ar-scan"));
        assertTrue(WebBundlePaths.isRouteRequest("scenario01-investment/feed"));
    }

    /**
     * A missing file is not a route. Falling back for every miss would answer a missing image,
     * script or {@code .mind} target with a page of HTML, and the page's own error handling would
     * then report a corrupt asset instead of a missing one.
     */
    @Test public void aMissingFileIsNotARoute() {
        assertFalse(WebBundlePaths.isRouteRequest("assets/app.js"));
        assertFalse(WebBundlePaths.isRouteRequest("media/stings/outro.mp4"));
        assertFalse(WebBundlePaths.isRouteRequest("assets/targets.mind"));
    }

    /** The types that decide whether the page runs at all. */
    @Test public void theTypesThatDecideWhetherThePageRunsAtAll() {
        // A module script served as text/plain is refused by the strict MIME check: blank page.
        assertEquals("text/javascript", WebBundlePaths.mimeTypeFor("assets/app.js"));
        // A stylesheet served as anything else is ignored: the app renders unstyled.
        assertEquals("text/css", WebBundlePaths.mimeTypeFor("assets/app.css"));
        assertEquals("text/html", WebBundlePaths.mimeTypeFor("index.html"));
        // JSON served as HTML makes response.json() throw.
        assertEquals("application/json", WebBundlePaths.mimeTypeFor("manifest.json"));
    }

    /** The mind-ar dataset is read with fetch().arrayBuffer(); it must not be sniffed as text. */
    @Test public void theMindTargetIsBinary() {
        assertEquals("application/octet-stream",
                WebBundlePaths.mimeTypeFor("assets/shared/ar/image-targets.mind"));
        assertNull(WebBundlePaths.encodingFor("assets/shared/ar/image-targets.mind"));
    }

    @Test public void theMediaTypesAreTheOnesTheBrowserPlays() {
        assertEquals("video/mp4", WebBundlePaths.mimeTypeFor("media/stings/outro.mp4"));
        assertEquals("audio/mpeg", WebBundlePaths.mimeTypeFor("assets/voice.mp3"));
        assertEquals("image/webp", WebBundlePaths.mimeTypeFor("assets/card.webp"));
    }

    /** Naming an encoding on an MP4 is meaningless; on binary it invites a UTF-8 decode. */
    @Test public void onlyTextTypesClaimAnEncoding() {
        assertEquals("utf-8", WebBundlePaths.encodingFor("index.html"));
        assertEquals("utf-8", WebBundlePaths.encodingFor("assets/app.js"));
        assertEquals("utf-8", WebBundlePaths.encodingFor("manifest.json"));
        assertNull(WebBundlePaths.encodingFor("media/stings/outro.mp4"));
        assertNull(WebBundlePaths.encodingFor("assets/card.webp"));
    }

    @Test public void anUnknownExtensionIsTreatedAsBytes() {
        assertEquals("application/octet-stream", WebBundlePaths.mimeTypeFor("assets/thing.xyz"));
        assertEquals("application/octet-stream", WebBundlePaths.mimeTypeFor("assets/noextension"));
    }

    /** The directory the Gradle build stages the baseline into. Two places have to agree on it. */
    @Test public void theAssetDirectoryMatchesWhatGradleStages() {
        assertEquals("cibar", WebBundlePaths.ASSET_ROOT);
    }
}
