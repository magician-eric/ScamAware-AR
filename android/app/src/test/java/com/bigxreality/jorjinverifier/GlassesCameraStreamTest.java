package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.nio.ByteBuffer;

import org.junit.Test;

/**
 * What {@link GlassesCameraStream} accepts from JJSDK, and what it says about what it refuses.
 *
 * <p>Everything here is about the same failure mode: the glasses camera can be running perfectly
 * and the page still see nothing, because the frame never got past this class. There are only two
 * ways that happens - the buffer is not the shape we assumed, or the frame is dropped without
 * anyone being told - and both used to be invisible from every side.
 *
 * <p>Nothing here touches Bitmap or the JPEG encoder: those need a device. The buffer handling
 * and the log cadence do not, and they are where the frames are lost.
 */
public class GlassesCameraStreamTest {

    private static ByteBuffer frameBuffer(int width, int height) {
        // Real RGBA bytes rather than zeroes, so a read from the wrong offset produces a
        // different answer instead of quietly matching.
        ByteBuffer buffer = ByteBuffer.allocate(width * height * 4);
        for (int i = 0; i < buffer.capacity(); i++) buffer.put(i, (byte) (i % 251));
        return buffer;
    }

    @Test public void aFrameThatFitsIsAccepted() {
        GlassesCameraStream stream = new GlassesCameraStream();
        assertFalse(stream.hasFrame());

        stream.offerFrame(frameBuffer(8, 4), 8, 4);

        assertTrue(stream.hasFrame());
        assertEquals(8, stream.frameWidth());
        assertEquals(4, stream.frameHeight());
        assertEquals(1, stream.acceptedFrames());
    }

    /**
     * The layout the original code assumed was the only one: a buffer whose position has been
     * left at the end by whatever filled it, with the frame occupying the whole thing from 0.
     */
    @Test public void aBufferLeftAtItsEndIsReadFromTheStart() {
        GlassesCameraStream stream = new GlassesCameraStream();
        ByteBuffer buffer = frameBuffer(8, 4);
        buffer.position(buffer.capacity());

        stream.offerFrame(buffer, 8, 4);

        assertEquals(1, stream.acceptedFrames());
        assertEquals(8, stream.frameWidth());
    }

    /**
     * The SDK owns this buffer and is still using it on its own thread. Reading it must not move
     * its position - the previous version did, and put it back afterwards, which is only safe
     * for as long as nothing else ever looks at it in between.
     */
    @Test public void theSdksOwnBufferIsNotDisturbed() {
        GlassesCameraStream stream = new GlassesCameraStream();
        ByteBuffer buffer = frameBuffer(8, 4);
        buffer.position(16);

        stream.offerFrame(buffer, 8, 4);

        assertEquals(16, buffer.position());
        assertEquals(buffer.capacity(), buffer.limit());
    }

    /**
     * A buffer too small for width*height*4 is a stride or pixel-format mismatch, not a frame.
     * Taking it would produce a torn or wrongly-coloured picture, which is far worse than none:
     * it looks like the camera works and recognition is broken.
     */
    @Test public void aBufferTooSmallForTheDeclaredSizeIsRefused() {
        GlassesCameraStream stream = new GlassesCameraStream();

        stream.offerFrame(ByteBuffer.allocate(8 * 4 * 4 - 1), 8, 4);

        assertFalse(stream.hasFrame());
        assertEquals(0, stream.acceptedFrames());
    }

    @Test public void nothingAtAllIsRefusedWithoutThrowing() {
        GlassesCameraStream stream = new GlassesCameraStream();

        stream.offerFrame(null, 8, 4);
        stream.offerFrame(frameBuffer(8, 4), 0, 4);
        stream.offerFrame(frameBuffer(8, 4), 8, -1);

        assertFalse(stream.hasFrame());
    }

    /** A resolution change mid-stream re-sizes the buffer rather than being refused. */
    @Test public void aResolutionChangeIsFollowed() {
        GlassesCameraStream stream = new GlassesCameraStream();

        stream.offerFrame(frameBuffer(8, 4), 8, 4);
        stream.offerFrame(frameBuffer(16, 8), 16, 8);

        assertEquals(16, stream.frameWidth());
        assertEquals(8, stream.frameHeight());
        assertEquals(2, stream.acceptedFrames());
    }

    @Test public void clearingDropsTheFrame() {
        GlassesCameraStream stream = new GlassesCameraStream();
        stream.offerFrame(frameBuffer(8, 4), 8, 4);

        stream.clear();

        assertEquals(0, stream.frameWidth());
        assertEquals(0, stream.frameHeight());
    }

    /**
     * The log cadence. At 30fps a line per frame is 1800 lines a minute, which pushes everything
     * else out of logcat's buffer - a diagnostic that destroys the evidence around it is worse
     * than none. The first frame is the one that matters most (it proves JJSDK is delivering at
     * all), 30 and 120 prove it did not stop after one, and every 300 is ten seconds apart.
     */
    @Test public void framesAreLoggedAtMilestonesNotEveryFrame() {
        assertTrue(GlassesCameraStream.isFrameMilestone(1));
        assertTrue(GlassesCameraStream.isFrameMilestone(30));
        assertTrue(GlassesCameraStream.isFrameMilestone(120));
        assertTrue(GlassesCameraStream.isFrameMilestone(300));
        assertTrue(GlassesCameraStream.isFrameMilestone(600));

        assertFalse(GlassesCameraStream.isFrameMilestone(0));
        assertFalse(GlassesCameraStream.isFrameMilestone(-1));
        assertFalse(GlassesCameraStream.isFrameMilestone(2));
        assertFalse(GlassesCameraStream.isFrameMilestone(121));
        assertFalse(GlassesCameraStream.isFrameMilestone(299));
    }

    /** One line per ten seconds of streaming, and no more than that. */
    @Test public void aLongSessionCannotFloodTheLog() {
        int lines = 0;
        for (long frame = 1; frame <= 9000; frame++) {
            if (GlassesCameraStream.isFrameMilestone(frame)) lines++;
        }
        // 1, 30, 120, then 300..9000 every 300.
        assertEquals(3 + 30, lines);
    }
}
