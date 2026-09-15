package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Pins where the experience is served from, and where the app is allowed to reach.
 *
 * <p>There used to be two APKs and this file existed to keep them apart. There is one now, and
 * what it has to keep apart is subtler and more dangerous: the origin the wearer's experience is
 * served from, which is always this device, and the one URL the app fetches over the network,
 * which is a few hundred bytes of update pointer and is never rendered.
 *
 * <p>Every failure guarded here is silent. A root that does not end in a slash produces a camera
 * URL of {@code …/ScamAware-AR__jorjin-camera.mjpeg} and a scan screen that reports a dead camera. A
 * camera endpoint on a different host than the page taints the recognition canvas and makes
 * {@code getImageData} throw, which the page reports as a recogniser failure. And an entry URL
 * that quietly became the published site would pass every test in this repository, work perfectly
 * on a bench with Wi-Fi, and show nothing at all in the room it is demonstrated in.
 */
public class WebContentSourceTest {

    /**
     * The page is served from the device, over a real https origin.
     *
     * <p>https, not {@code file://} and not http. A {@code file://} document is an opaque origin:
     * {@code fetch()} of the {@code .mind} dataset is refused, the Vite build's ES modules are
     * refused by the module loader's origin check, and the MJPEG frames become cross-origin to the
     * document, which taints the recognition canvas.
     */
    @Test public void theExperienceIsServedFromThisDevice() {
        WebContentSource source = WebContentSource.local();
        assertEquals("https://appassets.androidplatform.net/ScamAware-AR/", source.rootUrl);
        assertEquals(source.rootUrl, source.entryUrl);
        assertTrue(source.rootUrl.startsWith("https://"));
    }

    /**
     * The bundle is mounted at the same {@code /ScamAware-AR/} path the site is published at, so the APK
     * can package - and an OTA bundle can carry - the identical {@code webapp/dist}. Vite compiles
     * absolute asset URLs against {@code base: '/ScamAware-AR/'}, and any other mount point would need a
     * second build of the same source.
     */
    @Test public void theLocalMountUsesTheSitesOwnPath() {
        assertTrue(WebContentSource.local().rootUrl.endsWith("/ScamAware-AR/"));
        assertTrue(WebContentSource.SITE_ROOT.endsWith("/ScamAware-AR/"));
        assertEquals("/ScamAware-AR/", WebContentSource.LOCAL_PATH_PREFIX);
    }

    /** Every derived URL is the root plus a suffix, which is what keeps the app branch-free. */
    @Test public void everyUrlIsBuiltOnTheRoot() {
        WebContentSource source = WebContentSource.local();
        assertTrue(source.rootUrl.endsWith("/"));
        assertTrue(source.cameraUrl.startsWith(source.rootUrl));
        assertTrue(source.owns(source.entryUrl));
        assertTrue(source.owns(source.cameraUrl));
    }

    /**
     * The camera lives on the page's own origin. Recognition draws the MJPEG frames into a canvas
     * and reads them back with {@code getImageData}; a cross-origin image taints that canvas and
     * the read throws SecurityError, killing the recogniser outright.
     */
    @Test public void theCameraLivesOnThePagesOwnOrigin() {
        WebContentSource source = WebContentSource.local();
        assertEquals(originOf(source.rootUrl), originOf(source.cameraUrl));
        assertTrue(source.cameraUrl.endsWith("/__jorjin-camera.mjpeg"));
    }

    @Test public void theCameraRequestIsRecognisedWithOrWithoutAQuery() {
        WebContentSource source = WebContentSource.local();
        assertTrue(source.isCameraRequest(source.cameraUrl));
        // A cache-buster on a retry is an ordinary thing for the page to add.
        assertTrue(source.isCameraRequest(source.cameraUrl + "?t=12345"));
        assertTrue(source.isCameraRequest(source.cameraUrl + "#frame"));
    }

    @Test public void nothingElseIsTheCameraRequest() {
        WebContentSource source = WebContentSource.local();
        assertFalse(source.isCameraRequest(null));
        assertFalse(source.isCameraRequest(source.rootUrl));
        assertFalse(source.isCameraRequest(source.cameraUrl + "2"));
        assertFalse(source.isCameraRequest("https://example.com/__jorjin-camera.mjpeg"));
    }

    /** A neighbouring path must not be read as CIBAR - prefix matching is not host matching. */
    @Test public void aNeighbouringPathIsNotOurs() {
        WebContentSource source = WebContentSource.local();
        assertFalse(source.owns("https://appassets.androidplatform.net/other/index.html"));
        assertFalse(source.owns("file:///android_asset/cibar/index.html"));
        assertFalse(source.owns("https://magician-eric.github.io/ScamAware-AR/"));
    }

    /**
     * The published site is never the page.
     *
     * <p>This is the assertion the whole single-APK design rests on. The site is still where the
     * update pointer is published, so its address is still in the source - and a change that made
     * the WebView load it again would restore the old "online" build without anybody naming it:
     * indistinguishable in the office, blank in a room with no network.
     */
    @Test public void thePublishedSiteIsOnlyEverAnUpdateSource() {
        WebContentSource source = WebContentSource.local();
        assertFalse("the entry point must never be the published site",
                source.entryUrl.startsWith(WebContentSource.SITE_ROOT));
        assertFalse(source.owns(WebContentSource.UPDATE_LATEST_URL));
        assertTrue("the update pointer is fetched from the published site",
                WebContentSource.UPDATE_LATEST_URL.startsWith(WebContentSource.SITE_ROOT));
        assertTrue("and it is one small JSON file, not a page",
                WebContentSource.UPDATE_LATEST_URL.endsWith("/ota/latest.json"));
        assertTrue("over https, like everything else this app asks for",
                WebContentSource.UPDATE_LATEST_URL.startsWith("https://"));
    }

    private static String originOf(String url) {
        int afterScheme = url.indexOf("://") + 3;
        int slash = url.indexOf('/', afterScheme);
        return slash < 0 ? url : url.substring(0, slash);
    }
}
