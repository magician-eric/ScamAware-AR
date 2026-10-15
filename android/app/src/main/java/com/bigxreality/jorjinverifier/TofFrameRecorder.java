package com.bigxreality.jorjinverifier;

import java.util.Locale;

/**
 * Keeps the last few seconds of raw ToF frames and writes them out around every gesture
 * decision - the material the recogniser's thresholds are tuned from.
 *
 * <h2>Why</h2>
 * "It missed my swipe" says nothing about why. The frames do: whether the hand was in range at
 * all, how strong its return was against the lamp, what the background was doing. The module's
 * own key presses are the best label there is - every one marks a moment the vendor's engine saw
 * a swipe - so a module key, a swipe this app reported and a stroke it rejected each write the
 * frames from {@link #BEFORE_MS} before to {@link #AFTER_MS} after, with the decision in between.
 * Nothing is written while nothing happens, so the file stays small.
 *
 * <h2>Format</h2>
 * One line per frame, readable by eye and trivially parsed:
 * <pre>
 *   F &lt;ms&gt; &lt;hand&gt; | r &lt;8 rows of 8 distances in cm&gt; | s &lt;8 rows of 8 signal rates&gt;
 *   # &lt;ms&gt; &lt;what happened&gt;
 * </pre>
 * {@code ms} is {@code SystemClock.elapsedRealtime()}; each {@code #} line also carries wall-clock
 * time, so a tester's "I swiped at 14:03" can be found. {@code hand} is
 * {@link TofHandExtractor.Hand#describe()}.
 *
 * <p>Pure Java; where the text goes is the {@link Sink}'s business ({@link TofFrameFile} on the
 * phone). Called from JJSDK's reader thread and the main thread, hence synchronized.
 */
final class TofFrameRecorder {
    static final int CAPACITY = 48;
    static final long BEFORE_MS = 2500L;
    static final long AFTER_MS = 600L;

    interface Sink {
        void write(String text);
    }

    private final Sink sink;
    private final long[] times = new long[CAPACITY];
    private final float[][] ranges = new float[CAPACITY][TofHandExtractor.ZONES];
    private final float[][] signals = new float[CAPACITY][TofHandExtractor.ZONES];
    private final String[] hands = new String[CAPACITY];
    private long added;
    /** Frames up to (but not including) this sequence number have been written or skipped. */
    private long writtenUpTo;
    private long writeUntilMs = Long.MIN_VALUE;

    TofFrameRecorder(Sink sink) {
        this.sink = sink;
    }

    synchronized void frame(long nowMs, float[] range, float[] signal, String hand) {
        if (range == null || range.length < TofHandExtractor.ZONES) return;
        int slot = (int) (added % CAPACITY);
        times[slot] = nowMs;
        System.arraycopy(range, 0, ranges[slot], 0, TofHandExtractor.ZONES);
        if (signal != null && signal.length >= TofHandExtractor.ZONES) {
            System.arraycopy(signal, 0, signals[slot], 0, TofHandExtractor.ZONES);
        } else {
            java.util.Arrays.fill(signals[slot], 0f);
        }
        hands[slot] = hand == null ? "-" : hand;
        added++;
        if (nowMs <= writeUntilMs) {
            StringBuilder out = new StringBuilder();
            appendFrame(out, added - 1);
            writtenUpTo = added;
            sink.write(out.toString());
        }
    }

    /**
     * Something happened: writes the buffered frames not yet written that fall within
     * {@link #BEFORE_MS}, then the label, then keeps writing frames for {@link #AFTER_MS}.
     */
    synchronized void mark(long nowMs, String label) {
        StringBuilder out = new StringBuilder();
        long from = Math.max(writtenUpTo, added - CAPACITY);
        for (long seq = from; seq < added; seq++) {
            if (times[(int) (seq % CAPACITY)] >= nowMs - BEFORE_MS) appendFrame(out, seq);
        }
        writtenUpTo = added;
        out.append("# ").append(nowMs).append(' ').append(label).append('\n');
        writeUntilMs = Math.max(writeUntilMs, nowMs + AFTER_MS);
        sink.write(out.toString());
    }

    /** A line of its own, with no frames: a session header, say. */
    synchronized void line(String text) {
        sink.write("# " + text + "\n");
    }

    private void appendFrame(StringBuilder out, long seq) {
        int slot = (int) (seq % CAPACITY);
        out.append("F ").append(times[slot]).append(' ').append(hands[slot]).append(" | r");
        appendGrid(out, ranges[slot], 10f);
        out.append(" | s");
        appendGrid(out, signals[slot], 1f);
        out.append('\n');
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
