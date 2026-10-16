package com.bigxreality.jorjinverifier;

import java.util.Arrays;

/**
 * Finds the hand in one 8x8 ToF frame - or decides there is none - before anything asks which
 * way it moved. {@link TofGestureRecognizer} only ever sees what this hands it.
 *
 * <h2>Why the old "every zone in range is the hand" was not enough</h2>
 * The sensor measures 64 distances, not a hand. Counting every zone between 2 and 45 cm as the
 * hand worked on a bare desk and failed at the acceptance site: a display stand, a wall or a
 * table edge within reach sat in those zones permanently, so the "hand" never left, its centroid
 * was dragged towards the furniture, and after one swipe the recogniser waited forever for a
 * sensor that was never clear. A person standing behind the wearer's hand did the same thing,
 * and a lamp rich in infrared added zones that flickered in and out.
 *
 * <p>Each frame therefore goes through five filters, in order:
 *
 * <ol>
 *   <li><b>Background.</b> Every zone remembers what it normally sees. Something only counts as
 *       foreground when it is clearly <em>nearer</em> than that - and nearer than what its
 *       neighbours normally see too, so the flickering edge of a known object (a zone half on
 *       the table, half past it) cannot pass for something new. Anything beyond gesture range is
 *       learned within {@link #LEARN_MS}; something within it only after holding still for
 *       {@link #ABSORB_MS} (much longer while the recogniser is locked, so a hand resting where
 *       its swipe ended is never learned). A zone whose object has gone is updated within
 *       {@link #RECEDE_MS}.</li>
 *   <li><b>The nearest thing.</b> The hand is the closest object to the glasses. Only zones
 *       within a depth band behind the nearest one are kept ({@link #BAND_MIN_MM},
 *       {@link #BAND_RATIO}), so a person or a wall behind the hand is not averaged into it.
 *       A lone zone nearer than everything else - a single noisy reading - cannot set that
 *       band; the nearest zone has to have a neighbour at a similar depth.</li>
 *   <li><b>One connected blob</b> around that nearest zone, of at least
 *       {@link #MIN_BLOB_ZONES} zones. Connected across a gap of one zone
 *       ({@link #BLOB_REACH}): a zone that dropped out for a frame must not split the hand in
 *       two, because the half that is kept has a centroid zones away from the whole - which is
 *       a jump, and a jump is what a swipe looks like.</li>
 *   <li><b>Signal strength.</b> JJSDK hands over each zone's return strength next to its
 *       distance. A zone of the blob whose return is weak next to the blob's strongest zone - a
 *       sliver of hand barely clipping it, ambient infrared - is dropped
 *       ({@link #SIGNAL_RELATIVE_MIN}). Relative, not absolute: a hand at 5 cm returns roughly a
 *       hundred times what it returns at 50 cm, so no single number fits both; and relative to
 *       the hand itself, so one very bright reflection elsewhere cannot wipe it out.</li>
 *   <li><b>Hand-sized.</b> At 50 cm a hand covers a handful of zones; a body or a door covers the
 *       whole grid. A blob too large for a hand at its own distance is not one
 *       ({@link #maxHandZones}).</li>
 * </ol>
 *
 * <p>Its position is then the signal-weighted centroid of that blob. A zone the hand only half
 * covers returns roughly half the signal, so the centroid moves smoothly in fractions of a zone
 * instead of jumping a whole zone at a time - which is what lets a short swipe still measure as
 * one.
 *
 * <h2>When the whole scene moves</h2>
 * The sensor sits on the wearer's head. Turning the head slides everything nearby across the
 * grid, which looks exactly like a swipe. A hand can only ever make zones <em>nearer</em> than
 * their background; a moving scene also makes them <em>further</em> - the near object leaves the
 * zones it was learned in. So when {@link #EGO_MIN_ZONES} or more zones have receded from a
 * learned, nearby background <em>and</em> the blob that would be taken for the hand sits at the
 * depth those zones used to have, the blob is that object, moved: the frame is reported as
 * {@link Hand#sceneMoving} and the recogniser ignores it. A person walking away behind a hand
 * also leaves receded zones, but the hand is far nearer than where they stood, so the hand is
 * still followed.
 *
 * <p>That includes objects learned after the session started - which is most of them, since the
 * wearer walks up to the table or the display - at one accepted cost: a hand held perfectly
 * still for {@link #ABSORB_MS} has been learned too, and the swipe it then makes looks exactly
 * like that, and is not reported. The module's own engine still sees it; a page turned by a head
 * turn would be far worse.
 *
 * <p>Pure Java with injected time, so every one of these rules is pinned by a JVM test.
 */
final class TofHandExtractor {
    static final int GRID = 8;
    static final int ZONES = GRID * GRID;

    /**
     * Gesture range. Closer than 3 cm is the cover glass. 50 cm is the vendor's own limit
     * ({@code libcalculate_gesture.so} drops anything past it) and a relaxed arm's swipe; it was
     * 45 cm, which cut that swipe off. Past 50 cm the people around the wearer start to count:
     * someone standing or walking at 50-60 cm is the size of a hand to this sensor.
     */
    static final float MIN_RANGE_MM = 30f;
    static final float MAX_RANGE_MM = 500f;
    /**
     * Where a hand is looked for from, unless the staff mode says otherwise. On the glasses the
     * zones towards the nose and the bottom rows (the cheek) report 1-9 cm in about half of all
     * frames with nothing in front: the wearer's own face, the frame, the cover glass. A field
     * log from a wearer swiping closer and closer showed it, and that nothing nearer than 10 cm
     * is a swipe anyone would make in the experience - it is a hand at the glasses, adjusting
     * them, or the face itself.
     */
    static final float DEFAULT_MIN_RANGE_MM = 100f;
    /** The nearest the staff mode can set it. */
    static final float MIN_RANGE_SETTING_MAX_MM = 200f;

    /**
     * A zone whose reading within gesture range keeps coming and going with nothing in front
     * is masked out: it is noise there (the face at the edge of the view, a lamp's infrared
     * speckle), not something a hand could be. Smoothed per frame with no hand; masked at
     * {@link #ZONE_MASK_ON}, unmasked again below {@link #ZONE_MASK_OFF}.
     */
    static final float ZONE_FLICKER_SMOOTHING = 0.03f;
    static final float ZONE_MASK_ON = 0.2f;
    static final float ZONE_MASK_OFF = 0.1f;
    /**
     * This many unmasked zones nearer than the 手勢最近距離 make the whole frame "too near": a
     * hand right at the glasses. Without this its rim - the fingers, the part of the palm that
     * is a little further away - is beyond the limit and reads as a hand of its own.
     */
    static final int TOO_NEAR_ZONES = 4;
    /** Never more than this many zones masked: the rest of the view has to stay usable. */
    static final int MAX_MASKED_ZONES = 24;

    /** A zone never seen before, showing nothing within gesture range, is learned this soon. */
    static final long LEARN_MS = 1000L;
    /** Something new that stays put becomes background after this long. */
    static final long ABSORB_MS = 4000L;
    /**
     * The same while a swipe has just been reported. A hand resting where its swipe ended is
     * exactly what must <em>not</em> become background - if it did, its drift back would be all
     * the sensor could see, and would read as a swipe the other way.
     */
    static final long ABSORB_LOCKED_MS = 10000L;
    /** An object that has left: its zone takes the further distance this quickly. */
    static final long RECEDE_MS = 300L;
    /** A zone that has gone dark (no valid return) is learned as empty after this long. */
    static final long EMPTY_MS = 1000L;
    /**
     * A zone that loses its return for less than this keeps what it was holding. Infrared-rich
     * light makes single zones drop out for a frame or two; restarting a zone's learning on every
     * one of those meant a busy, brightly lit scene was never learned at all.
     */
    static final long DROPOUT_GRACE_MS = 300L;
    /** Small drift of the same surface is followed after this long. */
    static final long REFINE_MS = 500L;

    /**
     * How much nearer than its background a zone has to be to count as foreground: 10 cm at
     * least. A wall the player stands at, or a desk, is never mistaken for a hand that is not
     * clearly in front of it - the gesture range ends 10 cm before whatever is behind.
     */
    static final float FOREGROUND_MARGIN_MM = 100f;
    static final float FOREGROUND_MARGIN_RATIO = 0.15f;
    /** Two readings this close are the same surface (sensor noise grows with distance). */
    static final float SAME_TOLERANCE_MM = 25f;
    static final float SAME_TOLERANCE_RATIO = 0.06f;

    /** A foreground zone weaker than this fraction of the strongest one is dropped. */
    static final float SIGNAL_RELATIVE_MIN = 0.1f;
    /** No zone weighs more than this multiple of the blob's median signal in the centroid. */
    static final float WEIGHT_CAP_OVER_MEDIAN = 3f;

    /**
     * How weak a return may be, against the strongest one within gesture range in the same
     * frame, before the zone is ignored outright. Relative, because the sensor's units mean
     * nothing until measured on site and a hand at 5 cm returns a hundred times what it returns
     * at 50 cm; against the strongest return, because the hand is nearly always it - a wall or a
     * person behind is further away, and returns fall with the square of distance.
     */
    enum SignalMode {
        /** Follows the measured noise: the more zones flicker, the stricter. */
        AUTO(0f),
        LOOSE(0.05f),
        STANDARD(0.12f),
        STRICT(0.25f);

        final float fraction;

        SignalMode(float fraction) {
            this.fraction = fraction;
        }

        static SignalMode parse(String name) {
            for (SignalMode mode : values()) if (mode.name().equalsIgnoreCase(name)) return mode;
            return AUTO;
        }
    }

    /** {@link SignalMode#AUTO}'s fraction for quiet, noisy and very noisy surroundings. */
    static final float AUTO_FRACTION_QUIET = 0.08f;
    static final float AUTO_FRACTION_NOISY = 0.15f;
    static final float AUTO_FRACTION_VERY_NOISY = 0.25f;
    static final float NOISE_NOISY = 0.10f;
    static final float NOISE_VERY_NOISY = 0.25f;
    /** How quickly the noise estimate follows the scene (per frame with no hand in view). */
    static final float NOISE_SMOOTHING = 0.05f;

    /** The depth band behind the nearest zone that still belongs to the hand. */
    static final float BAND_MIN_MM = 80f;
    static final float BAND_RATIO = 0.3f;

    static final int MIN_BLOB_ZONES = 3;
    /**
     * A zone that was dark in the previous frame and has fewer than this many foreground
     * neighbours now is a flicker, not part of a hand, and is ignored this frame. A solid blob
     * passes at once, so a hand is not delayed; only lone sparks have to persist.
     */
    static final int PERSIST_UNLESS_NEIGHBOURS = 2;
    /** Zones this far apart (in rows or columns) belong to the same blob. */
    static final int BLOB_REACH = 2;

    /**
     * Zones an outstretched hand (about 9 x 19 cm) covers, times distance squared in mm: the
     * VL53L5CX sees 45 degrees across 8 zones, so one zone is {@code 0.1036 * d} wide.
     */
    static final float HAND_AREA_ZONES_MM2 = 1.6e6f;
    /** Room for fingers spread, a forearm in the same band and a tilted palm. */
    static final float HAND_SIZE_ALLOWANCE = 2.5f;
    static final int HAND_SIZE_SLACK_ZONES = 4;

    /** Only background this near can slide into gesture range when the head turns. */
    static final float EGO_BACKGROUND_MAX_MM = 1500f;
    static final int EGO_MIN_ZONES = 4;

    /** What one frame contained. Immutable; {@link #describe()} is the frame log's column. */
    static final class Hand {
        static final Hand NONE = new Hand(false, -1f, -1f, 0f, 0, 0f, false, 0, null, false);

        final boolean present;
        /** Signal-weighted centroid, in zones: column 0..7 left to right as the grid is read. */
        final float col;
        final float row;
        final float rangeMm;
        final int zones;
        final float peakSignal;
        /** The head (or the whole scene) moved; nothing in this frame can be trusted. */
        final boolean sceneMoving;
        final int recededZones;
        /** Why something was in front of the sensor but is not a hand, or null. */
        final String rejected;
        /** Whether the blob reaches the leftmost or rightmost column. */
        final boolean touchesSide;

        private Hand(boolean present, float col, float row, float rangeMm, int zones,
                     float peakSignal, boolean sceneMoving, int recededZones, String rejected,
                     boolean touchesSide) {
            this.present = present;
            this.col = col;
            this.row = row;
            this.rangeMm = rangeMm;
            this.zones = zones;
            this.peakSignal = peakSignal;
            this.sceneMoving = sceneMoving;
            this.recededZones = recededZones;
            this.rejected = rejected;
            this.touchesSide = touchesSide;
        }

        static Hand at(float col, float row, float rangeMm, int zones, float peakSignal) {
            return at(col, row, rangeMm, zones, peakSignal, false);
        }

        static Hand at(float col, float row, float rangeMm, int zones, float peakSignal,
                       boolean touchesSide) {
            return new Hand(true, col, row, rangeMm, zones, peakSignal, false, 0, null,
                    touchesSide);
        }

        static Hand moving(int recededZones) {
            return new Hand(false, -1f, -1f, 0f, 0, 0f, true, recededZones, null, false);
        }

        static Hand notAHand(String why, int zones, float rangeMm) {
            return new Hand(false, -1f, -1f, rangeMm, zones, 0f, false, 0, why, false);
        }

        /** One short ASCII token for the frame log: H(and), M(oving scene), X (rejected), -. */
        String describe() {
            if (present) {
                return String.format(java.util.Locale.ROOT, "H %.2f %.2f %.0fmm %dz %.0f",
                        col, row, rangeMm, zones, peakSignal);
            }
            if (sceneMoving) return "M " + recededZones;
            if (rejected != null) {
                return String.format(java.util.Locale.ROOT, "X %s %dz %.0fmm",
                        rejected, zones, rangeMm);
            }
            return "-";
        }
    }

    /** The farthest a hand is looked for; the staff mode can bring it in. */
    private volatile float maxRangeMm = MAX_RANGE_MM;
    private volatile float minRangeMm = DEFAULT_MIN_RANGE_MM;
    private final float[] zoneFlicker = new float[ZONES];
    private final boolean[] masked = new boolean[ZONES];
    private final boolean[] previousNear = new boolean[ZONES];
    private final boolean[] near = new boolean[ZONES];
    private int maskedCount;
    private volatile long maskedMask;
    private volatile SignalMode signalMode = SignalMode.AUTO;
    /** Share of zones changing between a reading and none per frame, smoothed. */
    private volatile float noiseRatio;
    private final boolean[] previousValid = new boolean[ZONES];
    private final boolean[] wasValid = new boolean[ZONES];
    private volatile long handMask;

    void setMaxRangeMm(float value) {
        maxRangeMm = Math.max(MIN_RANGE_SETTING_MAX_MM + 50f, Math.min(MAX_RANGE_MM, value));
    }

    /** The staff mode's 手勢最近距離: nearer than this is the face or a hand at the glasses. */
    void setMinRangeMm(float value) {
        minRangeMm = Math.max(MIN_RANGE_MM, Math.min(MIN_RANGE_SETTING_MAX_MM, value));
    }

    float minRangeMm() {
        return minRangeMm;
    }

    /** The zones masked as noise right now, one bit per zone (bit 0 is zone 0). */
    long maskedMask() {
        return maskedMask;
    }

    float maxRangeMm() {
        return maxRangeMm;
    }

    void setSignalMode(SignalMode mode) {
        signalMode = mode == null ? SignalMode.AUTO : mode;
    }

    SignalMode signalMode() {
        return signalMode;
    }

    float noiseRatio() {
        return noiseRatio;
    }

    /** The zones of the hand found in the last frame, one bit per zone (bit 0 is zone 0). */
    long handMask() {
        return handMask;
    }

    /** The fraction of the strongest return below which a zone is ignored, right now. */
    float signalFloorFraction() {
        SignalMode mode = signalMode;
        if (mode != SignalMode.AUTO) return mode.fraction;
        if (noiseRatio >= NOISE_VERY_NOISY) return AUTO_FRACTION_VERY_NOISY;
        if (noiseRatio >= NOISE_NOISY) return AUTO_FRACTION_NOISY;
        return AUTO_FRACTION_QUIET;
    }

    /** Background distance per zone: NaN not yet known, 0 nothing there, otherwise mm. */
    private final float[] background = new float[ZONES];
    /** Whether that background was learned by absorbing something that arrived and stayed. */
    private final boolean[] absorbed = new boolean[ZONES];
    /** The reading each zone has been holding, and since when. Same encoding as background. */
    private final float[] candidate = new float[ZONES];
    private final long[] candidateSince = new long[ZONES];
    /** When each zone's current run of invalid readings began, or -1. */
    private final long[] darkSince = new long[ZONES];

    private final boolean[] foreground = new boolean[ZONES];
    private final boolean[] inBand = new boolean[ZONES];
    private final boolean[] member = new boolean[ZONES];
    private final boolean[] tried = new boolean[ZONES];
    private final int[] queue = new int[ZONES];
    private final Integer[] order = new Integer[ZONES];
    private final float[] scratch = new float[ZONES];

    TofHandExtractor() {
        reset();
    }

    /** Forgets the background: the next frames are learned from scratch. */
    void reset() {
        Arrays.fill(background, Float.NaN);
        Arrays.fill(candidate, Float.NaN);
        Arrays.fill(candidateSince, 0L);
        Arrays.fill(darkSince, -1L);
        Arrays.fill(absorbed, false);
        Arrays.fill(previousValid, false);
        noiseRatio = 0f;
        Arrays.fill(zoneFlicker, 0f);
        Arrays.fill(masked, false);
        Arrays.fill(previousNear, false);
        maskedCount = 0;
        maskedMask = 0L;
    }

    /**
     * @param range  the 64 zone distances in mm, 0 where JJSDK found no valid target.
     * @param signal the 64 peak signal rates (kcps/SPAD), or null when the frame carries none -
     *               every zone then weighs the same and the signal filter is skipped.
     * @param locked whether the recogniser has just reported a swipe; see
     *               {@link #ABSORB_LOCKED_MS}.
     */
    Hand process(float[] range, float[] signal, long nowMs, boolean locked) {
        boolean hasSignal = false;
        if (signal != null && signal.length >= ZONES) {
            for (int i = 0; i < ZONES; i++) {
                if (valid(range[i]) && signal[i] > 0f) {
                    hasSignal = true;
                    break;
                }
            }
        }

        int receded = 0;
        float recededFrom = 0f;
        int flips = 0;
        float farthest = maxRangeMm;
        float nearest = minRangeMm;
        int tooNear = 0;
        for (int i = 0; i < ZONES; i++) {
            float r = range[i];
            float b = background[i];
            boolean valid = valid(r);
            if (valid != previousValid[i]) flips++;
            wasValid[i] = previousValid[i];
            previousValid[i] = valid;
            near[i] = valid && r <= farthest;
            if (valid && r >= MIN_RANGE_MM && r < nearest && !masked[i]) tooNear++;
            foreground[i] = valid && r >= nearest && r <= farthest && r < foregroundLimit(i)
                    && !masked[i];
            if (valid && b > 0f && b <= EGO_BACKGROUND_MAX_MM && r > b + margin(b)) {
                receded++;
                recededFrom += b;
            }
        }
        // Learned after classifying, so a frame is always judged against what came before it.
        learn(range, nowMs, locked);
        if (hasSignal) dropWeakReturns(range, signal, nearest, farthest);
        dropLoneSparks();

        Hand hand = tooNear >= TOO_NEAR_ZONES ? tooNear() : findHand(range, signal, hasSignal);
        // Noise is measured only while nothing is in front: a moving hand's edges flicker too.
        // Nor while something too near or too big is: that is not an empty view either.
        if (!hand.present && hand.rejected == null) {
            noiseRatio += NOISE_SMOOTHING * (flips / (float) ZONES - noiseRatio);
            updateMask();
        }
        System.arraycopy(near, 0, previousNear, 0, ZONES);
        if (receded >= EGO_MIN_ZONES && hand.present
                && Math.abs(hand.rangeMm - recededFrom / receded) <= band(hand.rangeMm)) {
            return Hand.moving(receded);
        }
        return hand;
    }

    /**
     * Ignores foreground zones whose return is weak next to the strongest return within gesture
     * range in this frame ({@link #signalFloorFraction()}): the far wall, the person behind, the
     * infrared speckle a lamp leaves - weak beside a hand at arm's length.
     */
    private void dropWeakReturns(float[] range, float[] signal, float nearest, float farthest) {
        int n = 0;
        for (int i = 0; i < ZONES; i++) {
            float r = range[i];
            if (valid(r) && r >= nearest && r <= farthest && signal[i] > 0f && !masked[i]) {
                scratch[n++] = signal[i];
            }
        }
        if (n == 0) return;
        Arrays.sort(scratch, 0, n);
        // The third strongest rather than the strongest, so a glint or two cannot set it.
        float strongest = scratch[Math.max(0, n - 3)];
        float floor = strongest * signalFloorFraction();
        for (int i = 0; i < ZONES; i++) {
            if (foreground[i] && signal[i] < floor) foreground[i] = false;
        }
    }

    private Hand tooNear() {
        handMask = 0L;
        return Hand.notAHand("too-near", 0, 0f);
    }

    /** See {@link #ZONE_MASK_ON}. Only with nothing in front: a moving hand's edges flicker too. */
    private void updateMask() {
        long mask = 0L;
        for (int i = 0; i < ZONES; i++) {
            float flip = near[i] != previousNear[i] ? 1f : 0f;
            zoneFlicker[i] += ZONE_FLICKER_SMOOTHING * (flip - zoneFlicker[i]);
            if (masked[i] && zoneFlicker[i] < ZONE_MASK_OFF) {
                masked[i] = false;
                maskedCount--;
            } else if (!masked[i] && zoneFlicker[i] >= ZONE_MASK_ON && maskedCount < MAX_MASKED_ZONES) {
                masked[i] = true;
                maskedCount++;
            }
            if (masked[i]) mask |= 1L << i;
        }
        maskedMask = mask;
    }

    /** See {@link #PERSIST_UNLESS_NEIGHBOURS}. */
    private void dropLoneSparks() {
        for (int i = 0; i < ZONES; i++) {
            if (!foreground[i] || wasValid[i]) {
                inBand[i] = foreground[i];
                continue;
            }
            int neighbours = 0;
            int row = i / GRID, col = i % GRID;
            for (int dr = -1; dr <= 1; dr++) {
                for (int dc = -1; dc <= 1; dc++) {
                    if (dr == 0 && dc == 0) continue;
                    int rr = row + dr, cc = col + dc;
                    if (rr < 0 || rr >= GRID || cc < 0 || cc >= GRID) continue;
                    if (foreground[rr * GRID + cc]) neighbours++;
                }
            }
            inBand[i] = neighbours >= PERSIST_UNLESS_NEIGHBOURS;
        }
        System.arraycopy(inBand, 0, foreground, 0, ZONES);
    }

    private Hand findHand(float[] range, float[] signal, boolean hasSignal) {
        handMask = 0L;
        int count = 0;
        for (int i = 0; i < ZONES; i++) {
            if (foreground[i] && supported(i, range)) order[count++] = i;
        }
        Arrays.sort(order, 0, count, (a, b) -> Float.compare(range[a], range[b]));
        Arrays.fill(tried, false);

        for (int k = 0; k < count; k++) {
            int seed = order[k];
            if (tried[seed]) continue;
            float seedRange = range[seed];
            float bandEdge = seedRange + band(seedRange);
            for (int i = 0; i < ZONES; i++) {
                inBand[i] = foreground[i] && range[i] >= seedRange && range[i] <= bandEdge;
            }

            // The blob around the seed, bridging single-zone gaps.
            Arrays.fill(member, false);
            int head = 0, tail = 0;
            queue[tail++] = seed;
            member[seed] = true;
            while (head < tail) {
                int i = queue[head++];
                tried[i] = true;
                int row = i / GRID, col = i % GRID;
                for (int dr = -BLOB_REACH; dr <= BLOB_REACH; dr++) {
                    for (int dc = -BLOB_REACH; dc <= BLOB_REACH; dc++) {
                        int rr = row + dr, cc = col + dc;
                        if (rr < 0 || rr >= GRID || cc < 0 || cc >= GRID) continue;
                        int j = rr * GRID + cc;
                        if (inBand[j] && !member[j]) {
                            member[j] = true;
                            queue[tail++] = j;
                        }
                    }
                }
            }

            if (hasSignal) {
                float strongest = 0f;
                for (int n = 0; n < tail; n++) strongest = Math.max(strongest, signal[queue[n]]);
                float floor = strongest * SIGNAL_RELATIVE_MIN;
                for (int n = 0; n < tail; n++) {
                    if (signal[queue[n]] < floor) member[queue[n]] = false;
                }
            }

            int zones = 0;
            float peak = 0f;
            for (int n = 0; n < tail; n++) {
                int i = queue[n];
                if (!member[i]) continue;
                if (hasSignal) {
                    scratch[zones] = signal[i];
                    peak = Math.max(peak, signal[i]);
                }
                zones++;
            }
            if (zones < MIN_BLOB_ZONES) continue;

            float cap = Float.MAX_VALUE;
            if (hasSignal) {
                Arrays.sort(scratch, 0, zones);
                cap = scratch[zones / 2] * WEIGHT_CAP_OVER_MEDIAN;
            }
            float sumW = 0f, sumCol = 0f, sumRow = 0f, sumRange = 0f;
            boolean side = false;
            for (int n = 0; n < tail; n++) {
                int i = queue[n];
                if (!member[i]) continue;
                int c = i % GRID;
                if (c == 0 || c == GRID - 1) side = true;
                // Squared: a zone the hand only clips counts for little, the zones it covers for a
                // lot - weak returns made weaker, as well as the weakest dropped above.
                float w = hasSignal ? Math.min(signal[i], cap) : 1f;
                w *= w;
                if (!(w > 0f)) w = Float.MIN_NORMAL;
                sumW += w;
                sumCol += w * (i % GRID);
                sumRow += w * (i / GRID);
                sumRange += w * range[i];
            }
            float meanRange = sumRange / sumW;
            // The nearest object is too big to be a hand; a hand cannot be behind it either.
            if (zones > maxHandZones(meanRange)) return Hand.notAHand("too-big", zones, meanRange);
            long mask = 0L;
            for (int n = 0; n < tail; n++) {
                if (member[queue[n]]) mask |= 1L << queue[n];
            }
            handMask = mask;
            return Hand.at(sumCol / sumW, sumRow / sumW, meanRange, zones, peak, side);
        }
        return Hand.NONE;
    }

    /**
     * Whether a foreground zone has a foreground neighbour at a similar depth. A single zone
     * nearer than everything around it is a noisy reading, not the edge of a hand.
     */
    private boolean supported(int zone, float[] range) {
        float edge = range[zone] + band(range[zone]);
        float near = range[zone] - band(range[zone]);
        int row = zone / GRID, col = zone % GRID;
        for (int dr = -1; dr <= 1; dr++) {
            for (int dc = -1; dc <= 1; dc++) {
                if (dr == 0 && dc == 0) continue;
                int rr = row + dr, cc = col + dc;
                if (rr < 0 || rr >= GRID || cc < 0 || cc >= GRID) continue;
                int j = rr * GRID + cc;
                if (foreground[j] && range[j] <= edge && range[j] >= near) return true;
            }
        }
        return false;
    }

    private void learn(float[] range, long nowMs, boolean locked) {
        for (int i = 0; i < ZONES; i++) {
            float v = valid(range[i]) ? range[i] : 0f;
            if (v == 0f) {
                if (darkSince[i] < 0) darkSince[i] = nowMs;
                // A brief dropout says nothing about what the zone sees; keep what it held.
                if (candidate[i] > 0f && nowMs - darkSince[i] < DROPOUT_GRACE_MS) continue;
            } else {
                darkSince[i] = -1L;
            }
            if (!same(candidate[i], v)) {
                candidate[i] = v;
                candidateSince[i] = nowMs;
            }
            long stable = nowMs - candidateSince[i];
            float b = background[i];
            float c = candidate[i];
            long absorbAfter = locked ? ABSORB_LOCKED_MS : ABSORB_MS;
            if (Float.isNaN(b)) {
                // Within gesture range it could be a hand held still; it is learned as slowly
                // as anything else arriving there. Learned as scene, not as an arrival.
                boolean inRange = c > 0f && c <= MAX_RANGE_MM;
                if (stable >= (inRange ? absorbAfter : LEARN_MS)) set(i, c, false);
            } else if (c == 0f) {
                if (b != 0f && stable >= EMPTY_MS) set(i, 0f, false);
            } else if (b == 0f || c < b - margin(b)) {
                if (stable >= absorbAfter) set(i, c, true);
            } else if (c > b + margin(b)) {
                if (stable >= RECEDE_MS) set(i, c, false);
            } else if (stable >= REFINE_MS) {
                background[i] = c;
            }
        }
    }

    private void set(int zone, float value, boolean fromArrival) {
        background[zone] = value;
        absorbed[zone] = fromArrival;
    }

    /**
     * How near a reading in this zone must be to be foreground: nearer, by the margin, than the
     * background of the zone itself and of each of its eight neighbours. Unknown and empty
     * backgrounds set no limit.
     */
    private float foregroundLimit(int zone) {
        float limit = Float.MAX_VALUE;
        int row = zone / GRID, col = zone % GRID;
        for (int dr = -1; dr <= 1; dr++) {
            for (int dc = -1; dc <= 1; dc++) {
                int rr = row + dr, cc = col + dc;
                if (rr < 0 || rr >= GRID || cc < 0 || cc >= GRID) continue;
                float b = background[rr * GRID + cc];
                if (b > 0f) limit = Math.min(limit, b - margin(b));
            }
        }
        return limit;
    }

    static float margin(float backgroundMm) {
        return Math.max(FOREGROUND_MARGIN_MM, FOREGROUND_MARGIN_RATIO * backgroundMm);
    }

    static float band(float nearestMm) {
        return Math.max(BAND_MIN_MM, BAND_RATIO * nearestMm);
    }

    private static boolean same(float a, float b) {
        if (Float.isNaN(a) || Float.isNaN(b)) return false;
        if (a == 0f || b == 0f) return a == b;
        return Math.abs(a - b) <= Math.max(SAME_TOLERANCE_MM, SAME_TOLERANCE_RATIO * Math.max(a, b));
    }

    private static boolean valid(float range) {
        return range > 0f && !Float.isNaN(range) && !Float.isInfinite(range);
    }

    /** The most zones a hand at this distance can cover; anything larger is not a hand. */
    static int maxHandZones(float rangeMm) {
        if (!(rangeMm > 0f)) return ZONES;
        float zones = HAND_SIZE_ALLOWANCE * HAND_AREA_ZONES_MM2 / (rangeMm * rangeMm)
                + HAND_SIZE_SLACK_ZONES;
        return zones >= ZONES ? ZONES : (int) zones;
    }

    /** Test seam: the background a zone has learned (NaN unknown, 0 empty). */
    float backgroundOf(int zone) {
        return background[zone];
    }
}
