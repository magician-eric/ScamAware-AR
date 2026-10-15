package com.bigxreality.jorjinverifier;

import java.util.Arrays;
import java.util.Locale;

/**
 * How well the ToF sensor can see right here, right now - for the staff management mode's
 * 現場環境檢測 (site lighting check).
 *
 * <h2>What it can and cannot measure</h2>
 * The VL53L5CX measures the ambient infrared it is fighting internally, but JJSDK hands over only
 * each zone's distance and return strength, so ambient light cannot be read directly. What can be
 * read is its effect, which is what matters: infrared-rich light (sun, halogen, incandescent -
 * the "yellow" lamps at the acceptance site) makes zones drop in and out and makes distances
 * jitter, and it shortens how far a hand can be seen. So the check is two short windows:
 *
 * <ol>
 *   <li><b>Nothing in front of the glasses.</b> {@code noisyZoneRatio}: the share of zones that
 *       flicker between a reading and none, or whose distance wanders, while nothing moves.</li>
 *   <li><b>A hand held still about 30 cm away.</b> {@code handSeenRatio}: in how many frames a
 *       hand-sized patch was there at all; {@code handJitterMm}: how much its distance wandered
 *       although it was not moving; {@code handSignal}: how strongly it returned.</li>
 * </ol>
 *
 * <p>The page asks for a {@link Snapshot} at the end of each window and judges it
 * ({@code webapp/src/lib/environment/environmentCheck.js}). Frames arrive on JJSDK's reader
 * thread and snapshots are read on a WebView thread, hence synchronized. Pure Java, so the
 * arithmetic is pinned by a JVM test.
 */
final class TofEnvironmentMeter {
    static final int ZONES = TofHandExtractor.ZONES;
    /** The window a snapshot covers. */
    static final long WINDOW_MS = 2500L;
    /** More than the frames of one window at 15 fps. */
    static final int CAPACITY = 64;
    /** Where a hand held up for the check is looked for. */
    static final float HAND_NEAR_MM = 100f;
    static final float HAND_FAR_MM = 500f;
    static final int HAND_MIN_ZONES = 3;
    /** A zone with a reading in between this share of frames and its complement flickers. */
    static final float FLICKER_LOW = 0.1f;
    /** A steady zone whose distance wanders by more than this fraction is noisy. */
    static final float WANDER_RATIO = 0.15f;

    private final long[] times = new long[CAPACITY];
    private final float[][] ranges = new float[CAPACITY][ZONES];
    private final float[][] signals = new float[CAPACITY][ZONES];
    private int stored;
    private int next;

    synchronized void frame(long nowMs, float[] range, float[] signal) {
        if (range == null || range.length < ZONES) return;
        times[next] = nowMs;
        System.arraycopy(range, 0, ranges[next], 0, ZONES);
        if (signal != null && signal.length >= ZONES) {
            System.arraycopy(signal, 0, signals[next], 0, ZONES);
        } else {
            Arrays.fill(signals[next], 0f);
        }
        next = (next + 1) % CAPACITY;
        if (stored < CAPACITY) stored++;
    }

    /** The numbers over the frames of the last {@link #WINDOW_MS}. */
    static final class Snapshot {
        final int frames;
        final float validRatio;
        final float noisyZoneRatio;
        final float handSeenRatio;
        final float handZones;
        final float handRangeMm;
        final float handJitterMm;
        final float handSignal;

        Snapshot(int frames, float validRatio, float noisyZoneRatio, float handSeenRatio,
                 float handZones, float handRangeMm, float handJitterMm, float handSignal) {
            this.frames = frames;
            this.validRatio = validRatio;
            this.noisyZoneRatio = noisyZoneRatio;
            this.handSeenRatio = handSeenRatio;
            this.handZones = handZones;
            this.handRangeMm = handRangeMm;
            this.handJitterMm = handJitterMm;
            this.handSignal = handSignal;
        }

        String toJson() {
            return String.format(Locale.ROOT,
                    "{\"frames\":%d,\"windowMs\":%d,\"validRatio\":%.3f,\"noisyZoneRatio\":%.3f,"
                            + "\"handSeenRatio\":%.3f,\"handZones\":%.1f,\"handRangeMm\":%.0f,"
                            + "\"handJitterMm\":%.1f,\"handSignal\":%.1f}",
                    frames, WINDOW_MS, validRatio, noisyZoneRatio, handSeenRatio, handZones,
                    handRangeMm, handJitterMm, handSignal);
        }
    }

    synchronized Snapshot snapshot(long nowMs) {
        int[] picked = new int[CAPACITY];
        int frames = 0;
        for (int k = 0; k < stored; k++) {
            int slot = (next - 1 - k + CAPACITY) % CAPACITY;
            if (nowMs - times[slot] > WINDOW_MS || times[slot] > nowMs) continue;
            picked[frames++] = slot;
        }
        if (frames == 0) return new Snapshot(0, 0f, 0f, 0f, 0f, 0f, 0f, 0f);

        // Per zone: how often it had a reading, and how much that reading wandered.
        int noisy = 0;
        float validSum = 0f;
        for (int zone = 0; zone < ZONES; zone++) {
            int valid = 0;
            double sum = 0, sumSq = 0;
            for (int f = 0; f < frames; f++) {
                float r = ranges[picked[f]][zone];
                if (!(r > 0f)) continue;
                valid++;
                sum += r;
                sumSq += (double) r * r;
            }
            validSum += valid;
            float share = valid / (float) frames;
            boolean flickers = share > FLICKER_LOW && share < 1f - FLICKER_LOW;
            boolean wanders = false;
            if (valid >= 3) {
                double mean = sum / valid;
                double sd = Math.sqrt(Math.max(0, sumSq / valid - mean * mean));
                wanders = mean > 0 && sd / mean > WANDER_RATIO;
            }
            if (flickers || wanders) noisy++;
        }

        // Per frame: the hand-sized patch at hand distance, if there is one.
        float[] frameRange = new float[frames];
        float[] frameSignal = new float[frames];
        float[] scratchRange = new float[ZONES];
        float[] scratchSignal = new float[ZONES];
        int seen = 0;
        float zonesSum = 0f;
        for (int f = 0; f < frames; f++) {
            int n = 0;
            for (int zone = 0; zone < ZONES; zone++) {
                float r = ranges[picked[f]][zone];
                if (r >= HAND_NEAR_MM && r <= HAND_FAR_MM) {
                    scratchRange[n] = r;
                    scratchSignal[n] = signals[picked[f]][zone];
                    n++;
                }
            }
            if (n < HAND_MIN_ZONES) continue;
            frameRange[seen] = median(scratchRange, n);
            frameSignal[seen] = median(scratchSignal, n);
            zonesSum += n;
            seen++;
        }
        float handRange = 0f, jitter = 0f, handSignal = 0f;
        if (seen > 0) {
            float[] ranges = Arrays.copyOf(frameRange, seen);
            handRange = median(ranges, seen);
            double mean = 0;
            for (int i = 0; i < seen; i++) mean += frameRange[i];
            mean /= seen;
            double var = 0;
            for (int i = 0; i < seen; i++) var += (frameRange[i] - mean) * (frameRange[i] - mean);
            jitter = (float) Math.sqrt(var / seen);
            handSignal = median(Arrays.copyOf(frameSignal, seen), seen);
        }
        return new Snapshot(frames, validSum / (frames * (float) ZONES), noisy / (float) ZONES,
                seen / (float) frames, seen > 0 ? zonesSum / seen : 0f, handRange, jitter,
                handSignal);
    }

    private static float median(float[] values, int n) {
        float[] copy = Arrays.copyOf(values, n);
        Arrays.sort(copy);
        return n % 2 == 1 ? copy[n / 2] : (copy[n / 2 - 1] + copy[n / 2]) / 2f;
    }
}
