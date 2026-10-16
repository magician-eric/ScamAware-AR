package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

import org.junit.Test;

/** Every frame, every decision - so a swipe that got no response at all can still be explained. */
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

    /** The swipe nobody recognised is exactly the one that must be on file. */
    @Test public void everyFrameIsWrittenEvenWhenNothingIsDecided() {
        for (int i = 0; i < 100; i++) recorder.frame(i * 66L, filled(300), filled(40), "-");
        assertEquals(100, lines('F').size());
        assertEquals(0, lines('#').size());
    }

    @Test public void aDecisionIsALineBetweenTheFrames() {
        recorder.frame(100L, filled(300), filled(40), "-");
        recorder.mark(120L, "12:00:00.000 眼鏡模組按鍵 RIGHT");
        recorder.frame(166L, filled(300), filled(40), "-");
        String[] all = written.toString().split("\n");
        assertTrue(all[0].startsWith("F 100 "));
        assertEquals("# 120 12:00:00.000 眼鏡模組按鍵 RIGHT", all[1]);
        assertTrue(all[2].startsWith("F 166 "));
    }

    @Test public void aFrameLineCarriesCentimetresAndSignal() {
        float[] range = filled(0);
        float[] signal = filled(0);
        range[0] = 304f;
        signal[0] = 41.6f;
        range[63] = 1995f;
        recorder.frame(1234L, range, signal, "H 0.00 0.00 304mm 3z 42");
        String line = lines('F').get(0);
        assertTrue(line, line.startsWith("F 1234 H 0.00 0.00 304mm 3z 42 | r 30 0 0"));
        assertTrue(line, line.contains(" / "));
        assertTrue(line, line.contains("200 | s 42 0"));
    }

    @Test public void aFrameWithoutSignalStillHasBothGrids() {
        recorder.frame(1L, filled(300), null, "-");
        assertTrue(lines('F').get(0).contains(" | s 0 0 0"));
    }

    @Test public void theFileSinkCollectsAndAppends() throws Exception {
        File dir = Files.createTempDirectory("tof").toFile();
        TofFrameFile sink = new TofFrameFile(dir);
        sink.write("one\n");
        sink.write("two\n");
        sink.flush();
        sink.write("three\n");
        sink.flush();
        assertEquals("one\ntwo\nthree\n",
                new String(Files.readAllBytes(sink.file().toPath()), StandardCharsets.UTF_8));
    }
}
