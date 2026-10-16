package com.bigxreality.jorjinverifier;

import android.content.SharedPreferences;

import java.util.Locale;

/**
 * The two gesture settings the staff management mode can change on site, and where they are
 * kept between launches.
 *
 * <ul>
 *   <li><b>手勢最遠距離</b> (50 / 40 / 35 cm): how far from the glasses a hand is looked for.
 *       In a classroom, or with an audience standing behind the player, bringing it in keeps the
 *       people beyond it out of the sensor's attention altogether.</li>
 *   <li><b>訊號過濾</b> (自動 / 寬鬆 / 標準 / 嚴格): how weak a return may be, against the strongest
 *       one in the frame, before the zone is ignored - see {@link TofHandExtractor.SignalMode}.
 *       自動 follows the measured noise.</li>
 * </ul>
 *
 * <p>Only these exact choices are accepted: the page sends what a button says, and anything else
 * falls back to the nearest choice rather than to something nobody picked.
 */
final class GestureSettings {
    static final String PREFS = "cibar_gesture";
    static final String KEY_MAX_RANGE_CM = "maxRangeCm";
    static final String KEY_SIGNAL_MODE = "signalMode";
    static final String KEY_MIN_RANGE_CM = "minRangeCm";

    static final int[] RANGE_CHOICES_CM = {50, 40, 35};
    static final int DEFAULT_RANGE_CM = 50;
    /**
     * 手勢最近距離: nearer than this is the wearer's face, the frame or a hand at the glasses
     * (see {@link TofHandExtractor#DEFAULT_MIN_RANGE_MM}).
     */
    static final int[] MIN_RANGE_CHOICES_CM = {5, 10, 15};
    static final int DEFAULT_MIN_RANGE_CM = 10;
    static final GestureSettings DEFAULT = new GestureSettings(
            DEFAULT_RANGE_CM, TofHandExtractor.SignalMode.AUTO, DEFAULT_MIN_RANGE_CM);

    final int maxRangeCm;
    final TofHandExtractor.SignalMode signalMode;
    final int minRangeCm;

    private GestureSettings(int maxRangeCm, TofHandExtractor.SignalMode signalMode, int minRangeCm) {
        this.maxRangeCm = maxRangeCm;
        this.signalMode = signalMode;
        this.minRangeCm = minRangeCm;
    }

    private static int nearest(int[] choices, int fallback, int wanted) {
        int best = fallback;
        for (int choice : choices) {
            if (Math.abs(choice - wanted) < Math.abs(best - wanted)) best = choice;
        }
        return best;
    }

    /** The choices nearest those asked for, and the named mode or {@code AUTO}. */
    static GestureSettings of(int rangeCm, String signalMode, int minRangeCm) {
        return new GestureSettings(nearest(RANGE_CHOICES_CM, DEFAULT_RANGE_CM, rangeCm),
                TofHandExtractor.SignalMode.parse(signalMode),
                nearest(MIN_RANGE_CHOICES_CM, DEFAULT_MIN_RANGE_CM, minRangeCm));
    }

    /** From a page that does not know 手勢最近距離 yet (web 1.9.2): the default. */
    static GestureSettings of(int rangeCm, String signalMode) {
        return of(rangeCm, signalMode, DEFAULT_MIN_RANGE_CM);
    }

    static GestureSettings load(SharedPreferences prefs) {
        if (prefs == null) return DEFAULT;
        return of(prefs.getInt(KEY_MAX_RANGE_CM, DEFAULT_RANGE_CM),
                prefs.getString(KEY_SIGNAL_MODE, TofHandExtractor.SignalMode.AUTO.name()),
                prefs.getInt(KEY_MIN_RANGE_CM, DEFAULT_MIN_RANGE_CM));
    }

    void save(SharedPreferences prefs) {
        if (prefs == null) return;
        prefs.edit()
                .putInt(KEY_MAX_RANGE_CM, maxRangeCm)
                .putString(KEY_SIGNAL_MODE, signalMode.name())
                .putInt(KEY_MIN_RANGE_CM, minRangeCm)
                .apply();
    }

    void applyTo(TofGestureRecognizer recognizer) {
        recognizer.setMaxRangeMm(maxRangeCm * 10f);
        recognizer.setSignalMode(signalMode);
        recognizer.setMinRangeMm(minRangeCm * 10f);
    }

    /** For the frame log, in the words the staff page uses. */
    String describe() {
        return "手勢範圍 " + minRangeCm + "–" + maxRangeCm + " 公分、訊號過濾 " + label(signalMode);
    }

    static String label(TofHandExtractor.SignalMode mode) {
        switch (mode) {
            case LOOSE: return "寬鬆";
            case STANDARD: return "標準";
            case STRICT: return "嚴格";
            default: return "自動";
        }
    }

    /**
     * {@code {"maxRangeCm", "minRangeCm", "signalMode", "noise", "floor"}}: the settings, plus
     * the noise the sensor is measuring now and the signal fraction in force because of it.
     */
    String toJson(float noiseRatio, float floorFraction) {
        return String.format(Locale.ROOT,
                "{\"maxRangeCm\":%d,\"minRangeCm\":%d,\"signalMode\":\"%s\",\"noise\":%.3f,\"floor\":%.2f}",
                maxRangeCm, minRangeCm, signalMode.name(), noiseRatio, floorFraction);
    }

    @Override public boolean equals(Object other) {
        if (!(other instanceof GestureSettings)) return false;
        GestureSettings that = (GestureSettings) other;
        return maxRangeCm == that.maxRangeCm && signalMode == that.signalMode
                && minRangeCm == that.minRangeCm;
    }

    @Override public int hashCode() {
        return (maxRangeCm * 31 + signalMode.hashCode()) * 31 + minRangeCm;
    }

    @Override public String toString() {
        return describe();
    }
}
