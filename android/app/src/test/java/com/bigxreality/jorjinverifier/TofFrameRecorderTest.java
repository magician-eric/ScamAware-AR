package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

import org.junit.Test;

/** Frames around each gesture decision, and nothing while nothing happens. */
public class TofFrameRecorderTest {
    private final StringBuilder written = new StringBuilder();
    private final TofFrameRecorder recorder = new TofFrameRecorder(written::append);

    private static float[] filled(float value) {
        float[] out = new float[64];
        java.util.Arrays.fill(out, value);
        return out;
    }

    private List<String> lines(char kind) {
        List<String> out = new ArrayList<>();
        for (String line : written.toString().split("\n")) {
            if (!line.isEmpty() && line.charAt(0) == kind) out.add(line);
        }
        return out;
    }

    @Test public void nothingIsWrittenWhileNothingHappens() {
        for (int i = 0; i < 100; i++) recorder.frame(i * 66L, filled(300), filled(40), "-");
        assertEquals("", written.toString());
    }

    @Test public void aMarkWritesTheSecondsBeforeItThenTheLabelThenTheFramesAfter() {
        for (int i = 0; i < 100; i++) recorder.frame(i * 66L, filled(300), filled(40), "-");
        long now = 99 * 66L;
        recorder.mark(now, "眼鏡模組按鍵 RIGHT");
        List<String> before = lines('F');
        assertTrue(before.size() >= 30);
        assertTrue(before.size() <= TofFrameRecorder.CAPACITY);
        assertTrue(written.toString().contains("# " + now + " 眼鏡模組按鍵 RIGHT"));

        for (int i = 100; i < 130; i++) recorder.frame(i * 66L, filled(300), filled(40), "-");
        int after = lines('F').size() - before.size();
        assertEquals("標記後 " + TofFrameRecorder.AFTER_MS + "ms 內的畫面",
                (int) (TofFrameRecorder.AFTER_MS / 66), after);
    }

    @Test public void framesAreNeverWrittenTwice() {
        for (int i = 0; i < 40; i++) recorder.frame(i * 50L, filled(300), filled(40), "-");
        recorder.mark(39 * 50L, "a");
        recorder.mark(39 * 50L + 10, "b");
        List<String> frames = lines('F');
        assertEquals(frames.size(), new java.util.HashSet<>(frames).size());
        assertEquals(40, frames.size());
    }

    @Test public void aFrameLineCarriesCentimetresAndSignal() {
        float[] range = filled(0);
        float[] signal = filled(0);
        range[0] = 304f;
        signal[0] = 41.6f;
        range[63] = 1995f;
        recorder.frame(1234L, range, signal, "H 0.00 0.00 304mm 3z 42");
        recorder.mark(1300L, "x");
        String line = lines('F').get(0);
        assertTrue(line, line.startsWith("F 1234 H 0.00 0.00 304mm 3z 42 | r 30 0 0"));
        assertTrue(line, line.contains(" / "));
        assertTrue(line, line.contains("200 | s 42 0"));
    }

    @Test public void theFileSinkAppendsAndRolls() throws Exception {
        File dir = Files.createTempDirectory("tof").toFile();
        TofFrameFile sink = new TofFrameFile(dir);
        sink.write("one\n");
        sink.write("two\n");
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline
                && (!sink.file().exists() || sink.file().length() < 8)) {
            Thread.sleep(10);
        }
        assertEquals("one\ntwo\n",
                new String(Files.readAllBytes(sink.file().toPath()), StandardCharsets.UTF_8));
    }
}
