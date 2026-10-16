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

    static final int[] RANGE_CHOICES_CM = {50, 40, 35};
    static final int DEFAULT_RANGE_CM = 50;
    static final GestureSettings DEFAULT =
            new GestureSettings(DEFAULT_RANGE_CM, TofHandExtractor.SignalMode.AUTO);

    final int maxRangeCm;
    final TofHandExtractor.SignalMode signalMode;

    private GestureSettings(int maxRangeCm, TofHandExtractor.SignalMode signalMode) {
        this.maxRangeCm = maxRangeCm;
        this.signalMode = signalMode;
    }

    /** The choice nearest {@code rangeCm}, and the named mode or {@code AUTO}. */
    static GestureSettings of(int rangeCm, String signalMode) {
        int best = DEFAULT_RANGE_CM;
        for (int choice : RANGE_CHOICES_CM) {
            if (Math.abs(choice - rangeCm) < Math.abs(best - rangeCm)) best = choice;
        }
        return new GestureSettings(best, TofHandExtractor.SignalMode.parse(signalMode));
    }

    static GestureSettings load(SharedPreferences prefs) {
        if (prefs == null) return DEFAULT;
        return of(prefs.getInt(KEY_MAX_RANGE_CM, DEFAULT_RANGE_CM),
                prefs.getString(KEY_SIGNAL_MODE, TofHandExtractor.SignalMode.AUTO.name()));
    }

    void save(SharedPreferences prefs) {
        if (prefs == null) return;
        prefs.edit()
                .putInt(KEY_MAX_RANGE_CM, maxRangeCm)
                .putString(KEY_SIGNAL_MODE, signalMode.name())
                .apply();
    }

    void applyTo(TofGestureRecognizer recognizer) {
        recognizer.setMaxRangeMm(maxRangeCm * 10f);
        recognizer.setSignalMode(signalMode);
    }

    /** For the frame log, in the words the staff page uses. */
    String describe() {
        return "手勢最遠 " + maxRangeCm + " 公分、訊號過濾 " + label(signalMode);
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
     * {@code {"maxRangeCm", "signalMode", "noise", "floor"}}: the settings, plus the noise the
     * sensor is measuring now and the signal fraction that is in force because of it.
     */
    String toJson(float noiseRatio, float floorFraction) {
        return String.format(Locale.ROOT,
                "{\"maxRangeCm\":%d,\"signalMode\":\"%s\",\"noise\":%.3f,\"floor\":%.2f}",
                maxRangeCm, signalMode.name(), noiseRatio, floorFraction);
    }

    @Override public boolean equals(Object other) {
        if (!(other instanceof GestureSettings)) return false;
        GestureSettings that = (GestureSettings) other;
        return maxRangeCm == that.maxRangeCm && signalMode == that.signalMode;
    }

    @Override public int hashCode() {
        return maxRangeCm * 31 + signalMode.hashCode();
    }

    @Override public String toString() {
        return describe();
    }
}
