package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.nio.charset.Charset;

import org.junit.Test;

/**
 * The bytes of an MJPEG part. A browser decodes these itself, so a missing CRLF or a wrong
 * Content-Length shows up as an image that never updates, or one that stops after a single frame
 * - with nothing logged on either side.
 */
public class MjpegFramingTest {
    private static final Charset ASCII = Charset.forName("US-ASCII");

    private static String header(int length) {
        return new String(MjpegFraming.partHeader(length), ASCII);
    }

    @Test public void theContentTypeCarriesTheBoundary() {
        assertTrue(MjpegFraming.CONTENT_TYPE.startsWith("multipart/x-mixed-replace"));
        assertTrue(MjpegFraming.CONTENT_TYPE.contains("boundary=" + MjpegFraming.BOUNDARY));
    }

    /** A part is preceded by CRLF, the boundary, then its own headers, then a blank line. */
    @Test public void aPartHeaderIsShapedTheWayADecoderExpects() {
        assertEquals("\r\n--jorjinframe\r\n"
                + "Content-Type: image/jpeg\r\n"
                + "Content-Length: 1234\r\n"
                + "\r\n", header(1234));
    }

    /**
     * Content-Length is not optional here. Without it a decoder has to find the end of a part by
     * scanning for the next boundary, and a frame that arrives slowly gets drawn half-finished.
     */
    @Test public void everyPartDeclaresItsLength() {
        assertTrue(header(1).contains("Content-Length: 1\r\n"));
        assertTrue(header(0).contains("Content-Length: 0\r\n"));
        assertTrue(header(1048576).contains("Content-Length: 1048576\r\n"));
    }

    @Test public void theTrailerClosesTheStream() {
        assertEquals("\r\n--jorjinframe--\r\n", new String(MjpegFraming.trailer(), ASCII));
    }

    /** The boundary must not be something that can occur inside JPEG data. */
    @Test public void theBoundaryIsPlainAscii() {
        for (char c : MjpegFraming.BOUNDARY.toCharArray()) {
            assertTrue("boundary must be ASCII letters", c >= 'a' && c <= 'z');
        }
    }
}
