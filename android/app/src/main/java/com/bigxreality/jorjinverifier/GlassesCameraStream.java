package com.bigxreality.jorjinverifier;

import android.graphics.Bitmap;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Publishes the glasses' RGB camera to the WebView as an MJPEG stream.
 *
 * <h2>Why this exists</h2>
 * A WebView's {@code getUserMedia} enumerates Android's camera2 devices. The glasses' camera is a
 * USB UVC device held open by JJSDK, so the browser cannot see it at any price - a page that asks
 * for a camera gets the phone's, which on someone wearing the glasses points at their chest.
 * JJSDK does hand us every frame, though, so the frames can be served to the page instead.
 *
 * <h2>Why a stream and not an injected canvas</h2>
 * The alternative is pushing each frame through {@code evaluateJavascript} as a data URL. A
 * 640x480 JPEG is around 30 KB, which is 40 KB once base64'd, and at any usable frame rate that
 * is megabytes a second marshalled through a JavaScript string. An MJPEG response is one request
 * that never ends, decoded by the browser itself.
 *
 * <h2>Frames are dropped, never queued</h2>
 * Only the newest frame is kept. A consumer that falls behind should see the present, not work
 * through a backlog of stale frames while drifting further behind - and image recognition on a
 * frame from two seconds ago is worse than useless, because it would match whatever the wearer
 * was looking at then.
 *
 * <h2>What it logs, and why every line of it earns its place</h2>
 * The chain from the glasses' sensor to a decoded frame in the page has five links, and every
 * one of them fails silently: JJSDK stops calling us, the buffer it hands over is not the shape
 * we assumed, the page never requests the stream, the response is served but produces no parts,
 * or the JPEG encoder returns null. From the page all five look identical - a black box and an
 * eight-second timeout - so each link says once, in logcat, that it happened. The counters are
 * logged at milestones rather than per frame: at 30fps a per-frame line is 30 lines a second,
 * which pushes everything else out of the log buffer and makes the tool useless at the exact
 * moment it is needed.
 */
final class GlassesCameraStream {
    private static final String TAG = "JorjinVerifier";
    private static final int JPEG_QUALITY = 70;
    /** How long a reader waits for a frame before giving up, so a dead camera cannot hang it. */
    private static final long FRAME_TIMEOUT_MS = 5000L;
    /**
     * How many JPEG encodes in a row may fail before the response is ended.
     *
     * <p>It used to be one: a single null from {@code Bitmap.compress} closed the body, the
     * {@code <img>} stopped updating for good, and nothing in the page could tell that apart
     * from a camera that had been unplugged. A transient OOM on one frame is not a reason to
     * lose the stream; a run of them is a real failure and still ends it.
     */
    private static final int MAX_CONSECUTIVE_ENCODE_FAILURES = 5;
    /** One debug JPEG per this many accepted frames, when a debug directory has been set. */
    static final int DEBUG_FRAME_INTERVAL = 60;
    /** Debug JPEGs are overwritten in a ring this size, so the cache cannot grow without bound. */
    private static final int DEBUG_FRAME_SLOTS = 4;

    private final Object lock = new Object();
    private byte[] latest;
    private int width;
    private int height;
    private long sequence;
    /** Frames JJSDK offered that this class could not use - the stride/size mismatch counter. */
    private volatile long rejected;

    // Development only; null in every build a tester is handed unless it is switched on
    // explicitly. See setDebugFrameDir.
    private File debugFrameDir;
    private ExecutorService debugWriter;
    private final AtomicBoolean debugWriteInFlight = new AtomicBoolean(false);

    /**
     * Called on JJSDK's camera thread. The SDK reuses its buffer, so the bytes are copied out
     * before returning; nothing here retains the ByteBuffer itself.
     *
     * <p>The buffer is read through a {@code duplicate()}, which has its own position and limit.
     * The previous version moved the SDK's own buffer to 0 and put it back afterwards; that is
     * a mutation of an object the SDK owns and is still using, on its own thread, and it only
     * looked safe because nothing else happened to touch it in between.
     */
    void offerFrame(ByteBuffer buffer, int frameWidth, int frameHeight) {
        if (buffer == null || frameWidth <= 0 || frameHeight <= 0) {
            noteRejectedFrame("size", buffer, frameWidth, frameHeight, 0);
            return;
        }
        int needed = frameWidth * frameHeight * 4;
        ByteBuffer source = readableFrame(buffer, needed);
        if (source == null) {
            // The one shape of failure that produces a *plausible* picture rather than none:
            // a buffer that is packed with a row stride wider than the frame, or one that
            // carries a different pixel format, is the wrong length for width*height*4. Saying
            // so with the numbers is what separates it from "the camera sent nothing".
            noteRejectedFrame("buffer", buffer, frameWidth, frameHeight, needed);
            return;
        }
        long accepted;
        synchronized (lock) {
            if (latest == null || latest.length != needed) latest = new byte[needed];
            source.get(latest, 0, needed);
            width = frameWidth;
            height = frameHeight;
            sequence++;
            accepted = sequence;
            lock.notifyAll();
        }
        if (isFrameMilestone(accepted)) {
            Log.i(TAG, "GlassesCameraStream accepted frames: " + accepted
                    + " width=" + frameWidth + " height=" + frameHeight
                    + " bytes=" + needed + " rejected=" + rejected);
        }
        maybeWriteDebugFrame(accepted, frameWidth, frameHeight, needed);
    }

    /**
     * A view of {@code buffer} positioned on {@code needed} readable bytes, or null when it does
     * not hold that many anywhere.
     *
     * <p>Two layouts are accepted because JJSDK has been seen to produce both: a buffer already
     * positioned at the start of the frame data (so {@code remaining()} is the frame), and one
     * whose position has been left at the end by whatever filled it (so the frame is the whole
     * buffer from 0). Preferring {@code remaining()} matters for the first case and reading from
     * 0 rescues the second, which is the one the original code assumed was the only one.
     */
    private static ByteBuffer readableFrame(ByteBuffer buffer, int needed) {
        ByteBuffer view = buffer.duplicate();
        if (view.remaining() >= needed) return view;
        if (view.capacity() >= needed) {
            view.position(0);
            view.limit(needed);
            return view;
        }
        return null;
    }

    private void noteRejectedFrame(String why, ByteBuffer buffer, int frameWidth, int frameHeight,
                                   int needed) {
        rejected++;
        if (!isFrameMilestone(rejected)) return;
        Log.w(TAG, "GlassesCameraStream rejected frames: " + rejected + " reason=" + why
                + " width=" + frameWidth + " height=" + frameHeight
                + " needed=" + needed
                + " capacity=" + (buffer == null ? -1 : buffer.capacity())
                + " remaining=" + (buffer == null ? -1 : buffer.remaining()));
    }

    /**
     * Which counts get a log line: the first, then two early ones that prove frames are still
     * arriving rather than having stopped after one, then every 300 (ten seconds at 30fps).
     *
     * <p>Package-private and pure so the cadence can be pinned by a test - the point of it is
     * that a long session cannot flood logcat, and that is not observable from the device.
     */
    static boolean isFrameMilestone(long count) {
        if (count <= 0) return false;
        if (count == 1 || count == 30 || count == 120) return true;
        return count % 300 == 0;
    }

    boolean hasFrame() {
        synchronized (lock) {
            return sequence > 0;
        }
    }

    int frameWidth() {
        synchronized (lock) {
            return width;
        }
    }

    int frameHeight() {
        synchronized (lock) {
            return height;
        }
    }

    /** How many frames JJSDK has handed over that were usable. */
    long acceptedFrames() {
        synchronized (lock) {
            return sequence;
        }
    }

    void clear() {
        synchronized (lock) {
            latest = null;
            width = 0;
            height = 0;
            sequence++;
            lock.notifyAll();
        }
    }

    /**
     * Turn on writing one JPEG per {@link #DEBUG_FRAME_INTERVAL} accepted frames into
     * {@code dir}, so the glasses' own picture can be looked at directly.
     *
     * <p>This is the check that separates "the frames are fine and the transport is broken" from
     * "the frames themselves are black, torn or the wrong pixel format" - and nothing further
     * down the chain can answer it, because everything downstream sees the same bytes this
     * would write. It is a development tool: {@link MainActivity} only enables it on a
     * debuggable build, files go to the app's own cache directory, and passing null turns it
     * off again. It is deliberately not reachable from any player-facing screen.
     */
    void setDebugFrameDir(File dir) {
        synchronized (lock) {
            debugFrameDir = dir;
            if (dir == null) {
                shutdownDebugWriter();
                return;
            }
            if (!dir.isDirectory() && !dir.mkdirs()) {
                Log.w(TAG, "無法建立除錯影像資料夾：" + dir);
                debugFrameDir = null;
                return;
            }
            if (debugWriter == null) debugWriter = Executors.newSingleThreadExecutor();
            Log.i(TAG, "眼鏡影像除錯輸出已開啟：" + dir + "（每 " + DEBUG_FRAME_INTERVAL + " 幀一張）");
        }
    }

    private void shutdownDebugWriter() {
        if (debugWriter == null) return;
        debugWriter.shutdown();
        debugWriter = null;
    }

    private void maybeWriteDebugFrame(long accepted, int frameWidth, int frameHeight, int needed) {
        File dir;
        ExecutorService writer;
        byte[] copy;
        synchronized (lock) {
            dir = debugFrameDir;
            writer = debugWriter;
            if (dir == null || writer == null || accepted % DEBUG_FRAME_INTERVAL != 0) return;
            // Only skipped when a previous write is still going: dropping the sample is right,
            // because JJSDK's thread must never wait on the phone's flash storage.
            if (!debugWriteInFlight.compareAndSet(false, true)) return;
            copy = new byte[needed];
            System.arraycopy(latest, 0, copy, 0, needed);
        }
        long slot = (accepted / DEBUG_FRAME_INTERVAL) % DEBUG_FRAME_SLOTS;
        File target = new File(dir, "glasses-frame-" + slot + ".jpg");
        try {
            writer.execute(debugWriteTask(copy, frameWidth, frameHeight, accepted, target));
        } catch (Throwable rejectedTask) {
            // A writer that has been shut down under us must not leave the in-flight flag stuck
            // true, or no further debug frame would ever be written.
            debugWriteInFlight.set(false);
            Log.w(TAG, "除錯影像排程失敗", rejectedTask);
        }
    }

    private Runnable debugWriteTask(byte[] copy, int frameWidth, int frameHeight, long accepted,
                                    File target) {
        return () -> {
            try {
                byte[] jpeg = encode(copy, frameWidth, frameHeight);
                if (jpeg == null) {
                    Log.w(TAG, "除錯影像編碼失敗（frame " + accepted + "）");
                    return;
                }
                try (FileOutputStream out = new FileOutputStream(target)) {
                    out.write(jpeg);
                }
                Log.i(TAG, "已寫出除錯影像 " + target + " frame=" + accepted
                        + " bytes=" + jpeg.length + " " + frameWidth + "x" + frameHeight);
            } catch (Throwable error) {
                Log.w(TAG, "寫出除錯影像失敗", error);
            } finally {
                debugWriteInFlight.set(false);
            }
        };
    }

    /**
     * An MJPEG body. Blocks between frames, which is what makes the response never end; the
     * WebView reads it on one of its own threads, so nothing here runs on the main thread or on
     * JJSDK's camera thread.
     */
    InputStream newBody() {
        Log.i(TAG, "consumer connected: hasFrame=" + hasFrame()
                + " width=" + frameWidth() + " height=" + frameHeight());
        return new InputStream() {
            private long seen;
            private byte[] pending = new byte[0];
            private int offset;
            private boolean finished;
            private long delivered;
            private int consecutiveEncodeFailures;

            @Override public int read() throws IOException {
                byte[] one = new byte[1];
                int count = read(one, 0, 1);
                return count == -1 ? -1 : one[0] & 0xff;
            }

            @Override public int read(byte[] out, int start, int length) throws IOException {
                if (finished) return -1;
                if (offset >= pending.length && !advance()) {
                    finished = true;
                    return -1;
                }
                int n = Math.min(length, pending.length - offset);
                System.arraycopy(pending, offset, out, start, n);
                offset += n;
                return n;
            }

            /** @return false once the camera has stopped producing, which ends the response. */
            private boolean advance() {
                while (true) {
                    byte[] raw;
                    int w;
                    int h;
                    long at;
                    synchronized (lock) {
                        long deadline = System.currentTimeMillis() + FRAME_TIMEOUT_MS;
                        while (sequence <= seen || latest == null) {
                            long remaining = deadline - System.currentTimeMillis();
                            if (remaining <= 0) {
                                Log.w(TAG, "MJPEG body ended: no frame within " + FRAME_TIMEOUT_MS
                                        + "ms (delivered=" + delivered + ")");
                                return false;
                            }
                            try {
                                lock.wait(remaining);
                            } catch (InterruptedException interrupted) {
                                Thread.currentThread().interrupt();
                                return false;
                            }
                        }
                        seen = sequence;
                        at = sequence;
                        raw = latest.clone();
                        w = width;
                        h = height;
                    }
                    byte[] jpeg = encode(raw, w, h);
                    if (jpeg == null) {
                        consecutiveEncodeFailures++;
                        if (consecutiveEncodeFailures >= MAX_CONSECUTIVE_ENCODE_FAILURES) {
                            Log.w(TAG, "MJPEG body ended: " + consecutiveEncodeFailures
                                    + " consecutive JPEG encode failures at " + w + "x" + h);
                            return false;
                        }
                        continue;
                    }
                    consecutiveEncodeFailures = 0;
                    delivered++;
                    if (delivered == 1) {
                        Log.i(TAG, "first frame sequence=" + at + " width=" + w + " height=" + h
                                + " jpegBytes=" + jpeg.length);
                    } else if (isFrameMilestone(delivered)) {
                        Log.i(TAG, "MJPEG frames delivered: " + delivered
                                + " width=" + w + " height=" + h + " jpegBytes=" + jpeg.length);
                    }
                    byte[] header = MjpegFraming.partHeader(jpeg.length);
                    byte[] part = new byte[header.length + jpeg.length];
                    System.arraycopy(header, 0, part, 0, header.length);
                    System.arraycopy(jpeg, 0, part, header.length, jpeg.length);
                    pending = part;
                    offset = 0;
                    return true;
                }
            }
        };
    }

    /**
     * JJSDK is started with {@code COLOR_FORMAT_RGBA}, and Android's ARGB_8888 is RGBA in memory
     * order, so the buffer copies straight in without a channel swap.
     */
    private static byte[] encode(byte[] rgba, int width, int height) {
        Bitmap bitmap = null;
        try {
            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            bitmap.copyPixelsFromBuffer(ByteBuffer.wrap(rgba));
            ByteArrayOutputStream out = new ByteArrayOutputStream(rgba.length / 8);
            bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out);
            return out.toByteArray();
        } catch (Throwable error) {
            Log.w(TAG, "眼鏡影像編碼失敗 " + width + "x" + height + " bytes=" + rgba.length, error);
            return null;
        } finally {
            if (bitmap != null) bitmap.recycle();
        }
    }
}
