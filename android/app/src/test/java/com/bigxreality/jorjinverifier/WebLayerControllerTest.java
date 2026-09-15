package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Map;

import org.junit.Test;

/**
 * Pins {@link WebLayerController#pageOf}, the rule that decides whether asking for a page has to
 * load it or merely re-show it.
 *
 * <p>CIBAR is now the only page this app hosts - the local gesture test page and the {@code
 * ?diag=1} scan-diagnostic entry were buttons on a diagnostics panel that no longer exists - so
 * the rule this pins is narrower than it was: everything under CIBAR's own root is CIBAR, and
 * nothing else is anything.
 */
public class WebLayerControllerTest {

    @Test public void aPageIsItself() {
        assertEquals(WebLayerController.CIBAR_URL,
                WebLayerController.pageOf(WebLayerController.CIBAR_URL));
    }

    /** CIBAR is a HashRouter app: a route below its entry point is still CIBAR. */
    @Test public void aHashRouteStillBelongsToCibar() {
        assertEquals(WebLayerController.CIBAR_URL,
                WebLayerController.pageOf(WebLayerController.CIBAR_URL + "#/scenario01"));
        assertEquals(WebLayerController.CIBAR_URL,
                WebLayerController.pageOf(WebLayerController.CIBAR_URL + "index.html"));
    }

    @Test public void anythingElseBelongsToNoPage() {
        assertNull(WebLayerController.pageOf(null));
        assertNull(WebLayerController.pageOf("about:blank"));
        assertNull(WebLayerController.pageOf("https://example.com/"));
        // A look-alike host must not pass for CIBAR.
        assertNull(WebLayerController.pageOf("https://magician-eric.github.io/ScamAware-AR-evil/"));
        // The engineering pages are gone, and their addresses must not resolve to CIBAR either.
        assertNull(WebLayerController.pageOf("file:///android_asset/gesture-test/index.html"));
    }

    /**
     * Nothing before the WebView has loaded anything belongs to a page, so the first show() always
     * loads instead of silently doing nothing.
     */
    @Test public void nothingLoadedYetMatchesNoRequest() {
        assertNull(WebLayerController.pageOf(null));
    }

    // ------------------------------------------------------------ the glasses camera stream

    /**
     * The camera request is recognised by prefix, so a cache-buster does not silently take the
     * request out of the app - where GitHub Pages answers 404 for a path no server serves, and
     * the page reports a broken camera with nothing to say why.
     */
    @Test public void theCameraRequestIsRecognisedWithOrWithoutAQuery() {
        assertTrue(WebLayerController.isGlassesCameraRequest(WebLayerController.GLASSES_CAMERA_URL));
        assertTrue(WebLayerController.isGlassesCameraRequest(
                WebLayerController.GLASSES_CAMERA_URL + "?t=12345"));
        assertTrue(WebLayerController.isGlassesCameraRequest(
                WebLayerController.GLASSES_CAMERA_URL + "#frame"));
    }

    @Test public void nothingElseIsTheCameraRequest() {
        assertFalse(WebLayerController.isGlassesCameraRequest(null));
        assertFalse(WebLayerController.isGlassesCameraRequest(WebLayerController.CIBAR_URL));
        // A neighbouring path that merely starts the same way is not the camera.
        assertFalse(WebLayerController.isGlassesCameraRequest(
                WebLayerController.GLASSES_CAMERA_URL + "2"));
        assertFalse(WebLayerController.isGlassesCameraRequest(
                "https://magician-eric.github.io/ScamAware-AR-evil/__jorjin-camera.mjpeg"));
    }

    /**
     * The regression this whole diagnosis was about.
     *
     * <p>The response used to be built with the bare type and no headers beyond caching, and a
     * multipart response without a boundary parameter cannot be split into frames by any
     * browser: the {@code <img>} decodes nothing, {@code naturalWidth} stays 0, no load event
     * fires, and the page's eight-second first-frame timeout is the only thing that ever
     * reports it - as "no frame arrived", with the camera and the encoder both working.
     * {@code MjpegFraming.CONTENT_TYPE} existed and was even unit-tested; it simply was not the
     * thing being sent.
     */
    @Test public void theCameraResponseCarriesTheMultipartBoundary() {
        Map<String, String> headers = WebLayerController.glassesCameraHeaders();
        String contentType = headers.get("Content-Type");
        assertEquals(MjpegFraming.CONTENT_TYPE, contentType);
        assertTrue(contentType.startsWith(WebLayerController.MJPEG_MIME_TYPE));
        assertTrue(contentType.contains("boundary=" + MjpegFraming.BOUNDARY));
    }

    // ------------------------------------------------------------ who answers a request

    /**
     * The camera is asked about before the active bundle, and this is the test that says so.
     *
     * <p>The two are not independent. The MJPEG endpoint deliberately sits on the page's own
     * origin - it has to, or a canvas drawn from its frames is tainted and {@code getImageData}
     * throws - which puts it inside the same {@code /ScamAware-AR/} prefix the bundle is served at.
     * Asked in the wrong order, the bundle answers the camera request with a 404 for a file that
     * is not supposed to exist, and the page reports "no frame arrived" with perfectly working
     * hardware. That failure is indistinguishable from the boundary bug above.
     */
    @Test public void theGlassesCameraIsAnsweredBeforeAnythingElse() {
        assertEquals(WebLayerController.Interception.GLASSES_CAMERA,
                WebLayerController.interceptionFor(WebLayerController.GLASSES_CAMERA_URL));
        assertEquals(WebLayerController.Interception.GLASSES_CAMERA,
                WebLayerController.interceptionFor(
                        WebLayerController.GLASSES_CAMERA_URL + "?t=99"));
    }

    /**
     * The page always comes from this device.
     *
     * <p>There is one delivery now, and the network is only ever how a <em>future</em> bundle is
     * acquired - never how the running one is served. A request for the document or for any asset
     * under it that resolved to {@code NETWORK} would be an experience that stops working in
     * aeroplane mode, which is the state it is expected to be demonstrated in.
     */
    @Test public void thePageAlwaysComesFromTheActiveBundleOnThisDevice() {
        assertEquals(WebLayerController.Interception.BUNDLED_ASSET,
                WebLayerController.interceptionFor(WebLayerController.CIBAR_URL));
        assertEquals(WebLayerController.Interception.BUNDLED_ASSET,
                WebLayerController.interceptionFor(WebLayerController.CIBAR_URL + "assets/app.js"));
        assertEquals(WebLayerController.Interception.BUNDLED_ASSET,
                WebLayerController.interceptionFor(
                        WebLayerController.CIBAR_URL + "media/stings/outro.mp4"));
    }

    /** Nothing outside CIBAR's own origin is ever served out of this app. */
    @Test public void anythingElseIsLeftToTheWebView() {
        assertEquals(WebLayerController.Interception.NETWORK,
                WebLayerController.interceptionFor("https://example.com/anything"));
        assertEquals(WebLayerController.Interception.NETWORK,
                WebLayerController.interceptionFor(
                        "https://appassets.androidplatform.net/other/index.html"));
        assertEquals(WebLayerController.Interception.NETWORK,
                WebLayerController.interceptionFor(null));
    }

    /** A cached camera would be a still photograph. */
    @Test public void theCameraResponseIsNeverCached() {
        Map<String, String> headers = WebLayerController.glassesCameraHeaders();
        assertTrue(headers.get("Cache-Control").contains("no-store"));
        assertEquals("no-cache", headers.get("Pragma"));
    }

    // ------------------------------------------------------------ the camera descriptor

    /**
     * The exact shape src/lib/ar/cameraSource.js reads. `available` is what selects the glasses
     * path in the page, and it is also what keeps the phone's camera shut: a descriptor that
     * fails to parse, or one whose flag never arrives, sends the page to getUserMedia and lights
     * up the lens pointing at the wearer's chest.
     */
    @Test public void theDescriptorNamesTheStreamAndItsSize() {
        String script = WebLayerController.cameraDescriptorScript(true, 640, 480);
        assertTrue(script.startsWith("window.__jorjinCamera={"));
        assertTrue(script.contains("version:1"));
        assertTrue(script.contains("available:true"));
        assertTrue(script.contains("streamUrl:\"" + WebLayerController.GLASSES_CAMERA_URL + "\""));
        assertTrue(script.contains("width:640"));
        assertTrue(script.contains("height:480"));
    }

    /**
     * No camera attached is published as `available:false` rather than as no descriptor at all,
     * so the page can tell "this app has no glasses camera" apart from "the ar-app never
     * injected anything" - two different bugs in two different files.
     */
    @Test public void noCameraIsStillAnHonestDescriptor() {
        String script = WebLayerController.cameraDescriptorScript(false, 0, 0);
        assertTrue(script.contains("available:false"));
        assertTrue(script.contains("width:0"));
        assertTrue(script.contains("height:0"));
    }

    /**
     * The page listens for this event so it can pick the descriptor up if it asked for a camera
     * before the injection landed - the race that would otherwise end in getUserMedia.
     */
    @Test public void theDescriptorAnnouncesItself() {
        String script = WebLayerController.cameraDescriptorScript(true, 1280, 960);
        assertTrue(script.contains("jorjinCameraReady"));
        // Wrapped, because a page that has been navigated away can throw on dispatchEvent and
        // that must not take the descriptor assignment down with it.
        assertTrue(script.contains("try{"));
    }
}
