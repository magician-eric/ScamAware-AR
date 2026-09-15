package com.bigxreality.jorjinverifier;

import java.nio.charset.Charset;

/**
 * The wire format of an MJPEG stream, kept separate from the camera so it can be tested without
 * a device.
 *
 * <p>An {@code <img>} pointed at a {@code multipart/x-mixed-replace} response swaps its contents
 * every time a part arrives, which makes a browser show a live camera with no JavaScript and no
 * {@code getUserMedia}. The bytes have to be exactly right for that to happen: a missing CRLF or
 * a wrong Content-Length and the image either never updates or stops after the first frame, with
 * nothing logged anywhere.
 */
final class MjpegFraming {
    /** Arbitrary, but must not occur inside JPEG data; it does not, being ASCII text. */
    static final String BOUNDARY = "jorjinframe";
    static final String CONTENT_TYPE =
            "multipart/x-mixed-replace; boundary=" + BOUNDARY;

    private static final Charset ASCII = Charset.forName("US-ASCII");

    private MjpegFraming() { }

    /**
     * The header that precedes one JPEG part.
     *
     * <p>Content-Length is required rather than optional: without it a decoder has to guess where
     * the part ends by scanning for the next boundary, and a JPEG that happens to be slow to
     * arrive gets rendered half-drawn.
     */
    static byte[] partHeader(int jpegLength) {
        return ("\r\n--" + BOUNDARY + "\r\n"
                + "Content-Type: image/jpeg\r\n"
                + "Content-Length: " + jpegLength + "\r\n"
                + "\r\n").getBytes(ASCII);
    }

    /** Closes the stream cleanly, so a decoder does not treat the end as a truncated part. */
    static byte[] trailer() {
        return ("\r\n--" + BOUNDARY + "--\r\n").getBytes(ASCII);
    }
}
