package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.Map;

/**
 * Serving the active bundle: what the page gets back for each kind of request.
 *
 * <p>This is the whole of what a wearer experiences, reduced to something a test can hold: the
 * request the WebView makes, and the bytes and headers that come back. It runs against a real
 * directory of files, which is what an over-the-air bundle is, so an update that changed how
 * requests are answered - rather than only what they answer with - fails here.
 *
 * <p>Test L of the acceptance list - after an update, with the network gone, the whole experience
 * still plays - is {@link #everythingTheExperienceNeedsIsServedFromTheDirectory()}: there is no
 * network in this test at all, because there is no network in the mechanism at all.
 */
public class WebBundleResponderTest {

    private File bundle;
    private WebBundleResponder responder;
    private Map<String, byte[]> files;

    @Before public void setUp() throws IOException {
        bundle = Files.createTempDirectory("cibar-serve").toFile();
        files = TestBundles.completeBuild();
        TestBundles.writeTree(bundle, files,
                TestBundles.manifestFor("1.0.0-20260825.001", files, TestBundles.BASELINE_SHELL));
        responder = new WebBundleResponder(new BundleContent.Directory(bundle), OtaLog.NONE);
    }

    @After public void tearDown() {
        WebBundleStore.deleteRecursively(bundle);
    }

    /**
     * Test L. Every kind of file the five scenarios need comes back whole, with the right type,
     * out of a directory on the phone. Nothing here has a network to fall back to.
     */
    @Test public void everythingTheExperienceNeedsIsServedFromTheDirectory() throws IOException {
        for (Map.Entry<String, byte[]> file : files.entrySet()) {
            WebBundleResponder.Response response = responder.respondTo("/" + file.getKey());
            assertEquals(file.getKey(), 200, response.status);
            assertEquals(file.getKey(), file.getValue().length, response.contentLength);
            assertArrayEquals(file.getKey(), file.getValue(), drain(response));
        }
    }

    /** The document, for the URL the shell actually loads. */
    @Test public void theRootIsTheSpaDocument() throws IOException {
        WebBundleResponder.Response response = responder.respondTo("");
        assertEquals(200, response.status);
        assertEquals("text/html", response.mimeType);
        assertEquals("utf-8", response.encoding);
        assertArrayEquals(files.get("index.html"), drain(response));
    }

    /**
     * A scenario video, with its length declared.
     *
     * <p>The length is not decoration: Chromium's media stack uses it to size the resource and to
     * seek inside it. Without one an 18 MiB MP4 is an unbounded stream that has to be buffered to
     * the end before anything can scrub, which on a phone reads as a video that will not start.
     */
    @Test public void aVideoIsServedWithItsLengthAndItsType() throws IOException {
        WebBundleResponder.Response response = responder.respondTo("/media/stings/outro.mp4");
        assertEquals(200, response.status);
        assertEquals("video/mp4", response.mimeType);
        assertEquals(files.get("media/stings/outro.mp4").length, response.contentLength);
        assertEquals("a video declares no charset", null, response.encoding);
        assertEquals(files.get("media/stings/outro.mp4").length, drain(response).length);
    }

    /**
     * A route that is not a file gets the document, with status 200.
     *
     * <p>200 and not 404: the router reads the URL, and a 404 status makes the WebView report a
     * failed navigation for a route that works perfectly.
     */
    @Test public void aRouteGetsTheDocumentWithAWorkingStatus() throws IOException {
        WebBundleResponder.Response response = responder.respondTo("/ar-scan");
        assertEquals(200, response.status);
        assertEquals("text/html", response.mimeType);
        assertArrayEquals(files.get("index.html"), drain(response));
    }

    /**
     * A missing file is a 404 with a body that names it - not a null.
     *
     * <p>Handing the asset loader a null says "this URL is not ours", and the WebView then tries to
     * reach {@code appassets.androidplatform.net} over the network, which resolves nowhere. The
     * page would report a network problem for a file missing from a bundle.
     */
    @Test public void aMissingFileIsAnExplicit404() throws IOException {
        WebBundleResponder.Response response = responder.respondTo("/assets/gone.js");
        assertNotNull(response);
        assertTrue(response.isNotFound());
        assertEquals("text/plain", response.mimeType);
        assertTrue(new String(drain(response), "UTF-8").contains("assets/gone.js"));
    }

    /** And so is a path that tried to climb out of the bundle. */
    @Test public void aPathThatTriesToEscapeIsA404AndNotAFile() throws IOException {
        WebBundleResponder.Response response = responder.respondTo("/../cibar-baseline-manifest.json");
        assertTrue(response.isNotFound());
    }

    /**
     * The camera endpoint is never a file. {@code WebLayerController} answers it first; this is
     * what makes a future reordering degrade to a 404 rather than to an empty body the page reads
     * as a dead camera.
     */
    @Test public void theCameraEndpointIsNotServedFromTheBundle() throws IOException {
        assertTrue(responder.respondTo("/" + WebBundlePaths.CAMERA_FILE).isNotFound());
    }

    /**
     * A bundle whose document is gone answers 404 rather than hanging or throwing.
     *
     * <p>The shell's rollback is what actually rescues this - see {@code WebBundleStore} - and
     * this is the behaviour that lets it happen: the WebView gets a failed main-frame load, which
     * is the signal the rollback listens for.
     */
    @Test public void aBundleWithNoDocumentFailsLoudly() throws IOException {
        //noinspection ResultOfMethodCallIgnored
        new File(bundle, "index.html").delete();
        assertTrue(responder.respondTo("").isNotFound());
        assertTrue(responder.respondTo("/ar-scan").isNotFound());
    }

    private static byte[] drain(WebBundleResponder.Response response) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (InputStream body = response.body) {
            byte[] buffer = new byte[8192];
            for (int read = body.read(buffer); read >= 0; read = body.read(buffer)) {
                out.write(buffer, 0, read);
            }
        }
        return out.toByteArray();
    }
}
