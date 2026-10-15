package com.bigxreality.jorjinverifier;

import java.util.Locale;

/**
 * Writes every raw ToF frame, with what the recogniser made of it, and every gesture decision -
 * the material the recogniser's thresholds are tuned from.
 *
 * <h2>Why every frame</h2>
 * The first version wrote frames only around a decision: a module key, a reported swipe, a
 * rejected stroke. That cannot explain the failure that matters most - a swipe that got no
 * response at all, where neither recogniser decided anything and so nothing was written. Every
 * frame is now written, continuously. At 15 frames a second that is about 6 KB/s; the file
 * rolls over ({@link TofFrameFile}) so the last twenty minutes or so are always on the phone.
 *
 * <h2>Format</h2>
 * One line per frame, readable by eye and trivially parsed:
 * <pre>
 *   F &lt;ms&gt; &lt;hand&gt; | r &lt;8 rows of 8 distances in cm&gt; | s &lt;8 rows of 8 signal rates&gt;
 *   # &lt;ms&gt; &lt;what happened&gt;
 * </pre>
 * {@code ms} is {@code SystemClock.elapsedRealtime()}; each {@code #} line also carries wall-clock
 * time, so a tester's "I swiped at 14:03 and nothing happened" can be found. {@code hand} is
 * {@link TofHandExtractor.Hand#describe()}.
 *
 * <p>Pure Java; where the text goes is the {@link Sink}'s business ({@link TofFrameFile} on the
 * phone). Called from JJSDK's reader thread and the main thread, hence synchronized.
 */
final class TofFrameRecorder {
    interface Sink {
        void write(String text);
    }

    private final Sink sink;
    private final StringBuilder line = new StringBuilder(512);

    TofFrameRecorder(Sink sink) {
        this.sink = sink;
    }

    synchronized void frame(long nowMs, float[] range, float[] signal, String hand) {
        if (range == null || range.length < TofHandExtractor.ZONES) return;
        line.setLength(0);
        line.append("F ").append(nowMs).append(' ').append(hand == null ? "-" : hand).append(" | r");
        appendGrid(line, range, 10f);
        line.append(" | s");
        if (signal != null && signal.length >= TofHandExtractor.ZONES) {
            appendGrid(line, signal, 1f);
        } else {
            appendGrid(line, new float[TofHandExtractor.ZONES], 1f);
        }
        line.append('\n');
        sink.write(line.toString());
    }

    /** Something happened: a module key, a reported swipe, a rejected stroke. */
    synchronized void mark(long nowMs, String label) {
        sink.write("# " + nowMs + " " + label + "\n");
    }

    /** A line of its own: a session header, say. */
    synchronized void line(String text) {
        sink.write("# " + text + "\n");
    }

    private static void appendGrid(StringBuilder out, float[] values, float divisor) {
        for (int i = 0; i < TofHandExtractor.ZONES; i++) {
            out.append(i % TofHandExtractor.GRID == 0 && i > 0 ? " / " : " ");
            float v = values[i] / divisor;
            out.append(v > 0f && !Float.isNaN(v) ? Integer.toString(Math.round(v)) : "0");
        }
    }

    static String clock(long wallMs) {
        java.util.Calendar c = java.util.Calendar.getInstance();
        c.setTimeInMillis(wallMs);
        return String.format(Locale.ROOT, "%02d:%02d:%02d.%03d", c.get(java.util.Calendar.HOUR_OF_DAY),
                c.get(java.util.Calendar.MINUTE), c.get(java.util.Calendar.SECOND),
                c.get(java.util.Calendar.MILLISECOND));
    }
}
