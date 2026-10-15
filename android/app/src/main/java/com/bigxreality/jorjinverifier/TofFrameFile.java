package com.bigxreality.jorjinverifier;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Where {@link TofFrameRecorder} writes on the phone: {@code tof-frames.txt} next to
 * {@code crash.txt} in the app's external files directory
 * ({@code Android/data/<package>/files/}, reachable over USB file transfer or {@code adb pull}).
 *
 * <p>Text is collected in memory and appended to the file once a second on a background thread:
 * the recorder is called from JJSDK's frame reader fifteen times a second, and that thread must
 * never wait on storage. Past {@link #MAX_BYTES} the file is moved to {@code tof-frames.1.txt}
 * (replacing the one before), so the two together hold roughly the last twenty minutes and never
 * exceed twice that size. A write that fails is dropped: losing tuning data must never cost a
 * gesture.
 */
final class TofFrameFile implements TofFrameRecorder.Sink {
    static final String NAME = "tof-frames.txt";
    static final String PREVIOUS_NAME = "tof-frames.1.txt";
    static final long MAX_BYTES = 4L * 1024 * 1024;
    static final long FLUSH_EVERY_MS = 1000L;
    /** Never hold more than this in memory if the disk has stopped taking writes. */
    private static final int MAX_PENDING_CHARS = 512 * 1024;

    private final File file;
    private final File previous;
    private final StringBuilder pending = new StringBuilder();
    private final ScheduledExecutorService io = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "TofFrameFile");
        thread.setDaemon(true);
        return thread;
    });

    TofFrameFile(File directory) {
        this.file = new File(directory, NAME);
        this.previous = new File(directory, PREVIOUS_NAME);
        io.scheduleWithFixedDelay(this::flush, FLUSH_EVERY_MS, FLUSH_EVERY_MS, TimeUnit.MILLISECONDS);
    }

    @Override public void write(String text) {
        synchronized (pending) {
            if (pending.length() < MAX_PENDING_CHARS) pending.append(text);
        }
    }

    /** Appends what has been collected. Also called directly by tests. */
    void flush() {
        String text;
        synchronized (pending) {
            if (pending.length() == 0) return;
            text = pending.toString();
            pending.setLength(0);
        }
        try {
            if (file.length() > MAX_BYTES) {
                if (previous.exists() && !previous.delete()) return;
                if (!file.renameTo(previous)) return;
            }
            try (Writer writer = new OutputStreamWriter(
                    new FileOutputStream(file, true), StandardCharsets.UTF_8)) {
                writer.write(text);
            }
        } catch (Throwable ignored) {
            // See the class comment.
        }
    }

    File file() {
        return file;
    }
}
