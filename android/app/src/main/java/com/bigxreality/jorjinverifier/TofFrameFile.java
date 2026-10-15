package com.bigxreality.jorjinverifier;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Where {@link TofFrameRecorder} writes on the phone: {@code tof-frames.txt} next to
 * {@code crash.txt} in the app's external files directory
 * ({@code Android/data/<package>/files/}, reachable with {@code adb pull} or over USB).
 *
 * <p>Writes happen on one background thread - the recorder is called from JJSDK's frame reader,
 * which must never wait on storage. Past {@link #MAX_BYTES} the file is moved to
 * {@code tof-frames.1.txt} (replacing the one before), so the two together never exceed twice
 * that. A write that fails is dropped: losing tuning data must never cost a gesture.
 */
final class TofFrameFile implements TofFrameRecorder.Sink {
    static final String NAME = "tof-frames.txt";
    static final String PREVIOUS_NAME = "tof-frames.1.txt";
    static final long MAX_BYTES = 4L * 1024 * 1024;

    private final File file;
    private final File previous;
    private final ExecutorService io = Executors.newSingleThreadExecutor(runnable -> {
        Thread thread = new Thread(runnable, "TofFrameFile");
        thread.setDaemon(true);
        return thread;
    });

    TofFrameFile(File directory) {
        this.file = new File(directory, NAME);
        this.previous = new File(directory, PREVIOUS_NAME);
    }

    @Override public void write(String text) {
        try {
            io.execute(() -> append(text));
        } catch (RuntimeException rejected) {
            // Executor shut down with the process; nothing to keep.
        }
    }

    private void append(String text) {
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
