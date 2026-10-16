package com.bigxreality.jorjinverifier;

import java.util.Locale;

/**
 * The newest ToF frame and what the depth recogniser made of it, for the staff management mode's
 * live 8x8 view (即時感測畫面): which zones see something, how near, how strongly, and which of
 * them were taken for the hand.
 *
 * <p>Only the last frame is kept - the view polls a few times a second and a frame it missed is
 * of no interest. Frames arrive on JJSDK's reader thread and are read on a WebView thread, hence
 * synchronized. Copying 128 numbers fifteen times a second is all this costs the reader thread.
 */
final class TofLiveFrame {
    static final int ZONES = TofHandExtractor.ZONES;

    private final float[] range = new float[ZONES];
    private final float[] signal = new float[ZONES];
    private long timeMs = -1L;
    private long handMask;
    private long maskedMask;
    private int minRangeMm;
    private TofHandExtractor.Hand hand = TofHandExtractor.Hand.NONE;
    private int maxRangeMm;
    private float noiseRatio;
    private float floorFraction;
    private boolean columnIncreasesRight = true;

    synchronized void update(long nowMs, float[] range, float[] signal, TofHandExtractor.Hand hand,
                             long handMask, long maskedMask, float minRangeMm, float maxRangeMm,
                             float noiseRatio, float floorFraction,
                             boolean columnIncreasesRight) {
        if (range == null || range.length < ZONES) return;
        timeMs = nowMs;
        System.arraycopy(range, 0, this.range, 0, ZONES);
        if (signal != null && signal.length >= ZONES) {
            System.arraycopy(signal, 0, this.signal, 0, ZONES);
        } else {
            java.util.Arrays.fill(this.signal, 0f);
        }
        this.hand = hand == null ? TofHandExtractor.Hand.NONE : hand;
        this.handMask = handMask;
        this.maskedMask = maskedMask;
        this.minRangeMm = Math.round(minRangeMm);
        this.maxRangeMm = Math.round(maxRangeMm);
        this.noiseRatio = noiseRatio;
        this.floorFraction = floorFraction;
        this.columnIncreasesRight = columnIncreasesRight;
    }

    /**
     * {@code {"ageMs", "range":[64 cm], "signal":[64], "hand":[64 0|1], "masked":[64 0|1], "handPresent",
     * "handCol", "handRow", "handCm", "sceneMoving", "minRangeCm", "maxRangeCm", "noise", "floor",
     * "columnIncreasesRight"}}, or {@code {"ageMs":-1}} before the first frame. Zone 0 is the
     * first the sensor sends; {@code columnIncreasesRight} is the recogniser's current reading of
     * which way the columns run for the wearer, so the view can be drawn the wearer's way round.
     */
    synchronized String toJson(long nowMs) {
        if (timeMs < 0) return "{\"ageMs\":-1}";
        StringBuilder out = new StringBuilder(900);
        out.append("{\"ageMs\":").append(Math.max(0L, nowMs - timeMs)).append(",\"range\":[");
        for (int i = 0; i < ZONES; i++) {
            if (i > 0) out.append(',');
            float r = range[i];
            out.append(r > 0f && !Float.isNaN(r) ? Math.round(r / 10f) : 0);
        }
        out.append("],\"signal\":[");
        for (int i = 0; i < ZONES; i++) {
            if (i > 0) out.append(',');
            float s = signal[i];
            out.append(s > 0f && !Float.isNaN(s) ? Math.round(s) : 0);
        }
        out.append("],\"hand\":[");
        for (int i = 0; i < ZONES; i++) {
            if (i > 0) out.append(',');
            out.append((handMask >>> i & 1L) != 0L ? 1 : 0);
        }
        out.append("],\"masked\":[");
        for (int i = 0; i < ZONES; i++) {
            if (i > 0) out.append(',');
            out.append((maskedMask >>> i & 1L) != 0L ? 1 : 0);
        }
        out.append("],\"handPresent\":").append(hand.present)
                .append(",\"sceneMoving\":").append(hand.sceneMoving);
        if (hand.present) {
            out.append(String.format(Locale.ROOT, ",\"handCol\":%.2f,\"handRow\":%.2f,\"handCm\":%d",
                    hand.col, hand.row, Math.round(hand.rangeMm / 10f)));
        }
        out.append(String.format(Locale.ROOT,
                ",\"minRangeCm\":%d,\"maxRangeCm\":%d,\"noise\":%.3f,\"floor\":%.2f,\"columnIncreasesRight\":%b}",
                Math.round(minRangeMm / 10f), Math.round(maxRangeMm / 10f), noiseRatio, floorFraction,
                columnIncreasesRight));
        return out.toString();
    }
}
