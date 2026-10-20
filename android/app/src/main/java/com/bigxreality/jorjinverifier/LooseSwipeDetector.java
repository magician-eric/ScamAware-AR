package com.bigxreality.jorjinverifier;

/**
 * 寬鬆辨識: anything that moves 5-50 cm from the glasses and travels far enough sideways is a
 * swipe - straight, or diagonal (left-up and left-down are left).
 *
 * <ul>
 *   <li>A zone counts when it reads 5-50 cm with at least {@link #MIN_SIGNAL} of signal. Strong
 *       lamp light makes empty zones read 1-9 cm at a signal of a few tens; that is dropped.</li>
 *   <li>Only what moved counts: each zone keeps a slow average of what it usually reads, and a
 *       zone {@link #FOREGROUND_MM} nearer than that is foreground. A wall or a table inside
 *       50 cm is learned and ignored.</li>
 *   <li>Something is there when the largest group of touching foreground zones has at least
 *       {@link #MIN_ZONES}. Its position is weighted by signal squared.</li>
 *   <li>When it leaves, the movement is a swipe if it went at least {@link #MIN_TRAVEL} zones
 *       sideways, sideways at least half as much as up or down, within
 *       {@link #MAX_DURATION_MS}.</li>
 *   <li>The arm coming back - the opposite direction within {@link #RETURN_MS} - is not one.</li>
 * </ul>
 *
 * <p>Pure Java, replayed against field logs.
 */
final class LooseSwipeDetector {
    static final int GRID = 8;
    static final int ZONES = GRID * GRID;
    static final float NEAR_MM = 50f;
    static final float FAR_MM = 500f;
    static final float MIN_SIGNAL = 200f;
    static final float FOREGROUND_MM = 50f;
    static final float BASELINE_ALPHA = 0.05f;
    /** Something that stays put this long becomes background - a hand held still included. */
    static final long ABSORB_MS = 3000L;
    /** Within this, a zone's reading counts as not having moved. */
    static final float STILL_MM = 30f;
    /** The background of a zone that has never read anything. */
    static final float NOTHING_MM = 4000f;
    static final int MIN_ZONES = 3;
    static final float MIN_TRAVEL = 2.5f;
    static final float MIN_HORIZONTAL_SHARE = 0.5f;
    static final long MAX_DURATION_MS = 1500L;
    /** Gone for this long and it has left. */
    static final long RELEASE_MS = 130L;
    static final long RETURN_MS = 1200L;
    static final long REPEAT_MS = 400L;

    static final int NONE = 0;
    static final int LEFT = -1;
    static final int RIGHT = 1;

    private final float[] baseline = new float[ZONES];
    private final float[] stillAt = new float[ZONES];
    private final long[] stillSinceMs = new long[ZONES];
    private final boolean[] foreground = new boolean[ZONES];
    private final int[] component = new int[ZONES];
    private final int[] queue = new int[ZONES];

    private boolean tracking;
    private long startMs;
    private long lastSeenMs;
    private float startCol;
    private float startRow;
    private float minCol;
    private float maxCol;
    private float lastCol;
    private float lastRow;

    private int lastDirection = NONE;
    private long lastReportMs = Long.MIN_VALUE / 2;

    /** True when the columns run right to left for the wearer. */
    private boolean mirrored;
    /** The staff mode's 手勢最遠距離 (at most {@link #FAR_MM}); the near end stays 5 cm. */
    private volatile float farMm = FAR_MM;

    void setMaxRangeMm(float value) {
        farMm = Math.max(NEAR_MM * 2f, Math.min(FAR_MM, value));
    }

    void setMirrored(boolean value) {
        mirrored = value;
    }

    /** @return {@link #LEFT}, {@link #RIGHT} or {@link #NONE}. */
    int onFrame(float[] rangeMm, float[] signal, long nowMs) {
        if (rangeMm == null || rangeMm.length < ZONES) return NONE;
        for (int i = 0; i < ZONES; i++) {
            float r = rangeMm[i];
            boolean strong = signal == null || signal.length < ZONES || signal[i] >= MIN_SIGNAL;
            boolean inRange = r >= NEAR_MM && r <= farMm && strong;
            // Until a zone has learned something it shows nothing: whatever is in range is
            // foreground, and only what then stays put for ABSORB_MS - a table, a wall - is
            // learned. (Learning the first reading instead learned the wearer's own hand when it
            // was up at start-up, and then never saw it again.)
            float b = baseline[i] > 0f ? baseline[i] : NOTHING_MM;
            foreground[i] = inRange && r < b - FOREGROUND_MM;
            if (foreground[i]) {
                if (Math.abs(r - stillAt[i]) > STILL_MM) {
                    stillAt[i] = r;
                    stillSinceMs[i] = nowMs;
                } else if (nowMs - stillSinceMs[i] >= ABSORB_MS) {
                    baseline[i] = r;
                    foreground[i] = false;
                }
            } else {
                stillAt[i] = 0f;
                // What this zone usually reads. A dropout or lamp-light noise teaches nothing:
                // it is not "far away", and it must not make a learned table look nearer.
                if (r > 0f && strong) baseline[i] = b + (r - b) * BASELINE_ALPHA;
            }
        }
        float[] position = largestGroup(signal);
        if (position != null) {
            float col = position[0];
            float row = position[1];
            if (!tracking) {
                tracking = true;
                startMs = nowMs;
                startCol = col;
                startRow = row;
                minCol = col;
                maxCol = col;
            }
            minCol = Math.min(minCol, col);
            maxCol = Math.max(maxCol, col);
            lastCol = col;
            lastRow = row;
            lastSeenMs = nowMs;
            return NONE;
        }
        if (!tracking || nowMs - lastSeenMs < RELEASE_MS) return NONE;
        tracking = false;
        return judge(nowMs);
    }

    private int judge(long nowMs) {
        long duration = lastSeenMs - startMs;
        // The sideways movement: from where it came in to the far end it reached.
        float toMax = maxCol - startCol;
        float toMin = startCol - minCol;
        float dx = toMax >= toMin ? toMax : -toMin;
        float dy = lastRow - startRow;
        if (Math.abs(dx) < MIN_TRAVEL) return NONE;
        if (Math.abs(dx) < MIN_HORIZONTAL_SHARE * Math.abs(dy)) return NONE;
        if (duration > MAX_DURATION_MS) return NONE;
        int direction = (dx > 0) != mirrored ? RIGHT : LEFT;
        long since = nowMs - lastReportMs;
        if (direction != lastDirection && since < RETURN_MS) return NONE;
        if (direction == lastDirection && since < REPEAT_MS) return NONE;
        lastDirection = direction;
        lastReportMs = nowMs;
        return direction;
    }

    /** {col, row} of the largest group of touching foreground zones, or null when too small. */
    private float[] largestGroup(float[] signal) {
        java.util.Arrays.fill(component, -1);
        int best = -1;
        int bestSize = 0;
        int label = 0;
        for (int seed = 0; seed < ZONES; seed++) {
            if (!foreground[seed] || component[seed] >= 0) continue;
            int head = 0;
            int tail = 0;
            queue[tail++] = seed;
            component[seed] = label;
            while (head < tail) {
                int z = queue[head++];
                int zr = z / GRID;
                int zc = z % GRID;
                for (int dr = -1; dr <= 1; dr++) {
                    for (int dc = -1; dc <= 1; dc++) {
                        int r = zr + dr;
                        int c = zc + dc;
                        if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
                        int n = r * GRID + c;
                        if (foreground[n] && component[n] < 0) {
                            component[n] = label;
                            queue[tail++] = n;
                        }
                    }
                }
            }
            if (tail > bestSize) {
                bestSize = tail;
                best = label;
            }
            label++;
        }
        if (bestSize < MIN_ZONES) return null;
        double sumW = 0;
        double sumCol = 0;
        double sumRow = 0;
        for (int i = 0; i < ZONES; i++) {
            if (component[i] != best) continue;
            double s = signal == null || signal.length < ZONES ? 1.0 : Math.max(1.0, signal[i]);
            double w = s * s;
            sumW += w;
            sumCol += w * (i % GRID);
            sumRow += w * (i / GRID);
        }
        return new float[] {(float) (sumCol / sumW), (float) (sumRow / sumW)};
    }
}
