package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** The staff mode's 手勢最遠距離 and 訊號過濾: only the choices on its buttons. */
public class GestureSettingsTest {
    @Test public void onlyTheOfferedDistancesAreAccepted() {
        assertEquals(50, GestureSettings.of(50, "AUTO").maxRangeCm);
        assertEquals(40, GestureSettings.of(40, "AUTO").maxRangeCm);
        assertEquals(35, GestureSettings.of(35, "AUTO").maxRangeCm);
        assertEquals("比最近的選項還遠就用最遠的", 50, GestureSettings.of(120, "AUTO").maxRangeCm);
        assertEquals("太近就用最近的", 35, GestureSettings.of(5, "AUTO").maxRangeCm);
        assertEquals(40, GestureSettings.of(42, "AUTO").maxRangeCm);
    }

    @Test public void anUnknownSignalModeIsAuto() {
        assertEquals(TofHandExtractor.SignalMode.STRICT, GestureSettings.of(50, "STRICT").signalMode);
        assertEquals(TofHandExtractor.SignalMode.AUTO, GestureSettings.of(50, "").signalMode);
        assertEquals(TofHandExtractor.SignalMode.AUTO, GestureSettings.of(50, null).signalMode);
    }

    @Test public void theDefaultIsTheWholeRangeAndAutomatic() {
        assertEquals(GestureSettings.of(50, "AUTO"), GestureSettings.DEFAULT);
        assertEquals(GestureSettings.DEFAULT, GestureSettings.load(null));
        assertNotEquals(GestureSettings.DEFAULT, GestureSettings.of(35, "AUTO"));
    }

    @Test public void theyAreAppliedToTheRecogniser() {
        TofGestureRecognizer recognizer = new TofGestureRecognizer((gesture, action, time) -> { });
        GestureSettings.of(35, "LOOSE").applyTo(recognizer);
        assertEquals(350f, recognizer.maxRangeMm(), 0.1f);
        assertEquals(TofHandExtractor.SignalMode.LOOSE, recognizer.signalMode());
        assertEquals(0.05f, recognizer.signalFloorFraction(), 1e-6f);
    }

    @Test public void theJsonCarriesTheSettingsAndTheLiveNoise() {
        String json = GestureSettings.of(40, "STANDARD").toJson(0.0314f, 0.12f);
        assertEquals("{\"maxRangeCm\":40,\"signalMode\":\"STANDARD\",\"noise\":0.031,\"floor\":0.12}", json);
    }

    @Test public void theLogSaysItInTheStaffPagesWords() {
        assertEquals("手勢最遠 35 公分、訊號過濾 嚴格", GestureSettings.of(35, "STRICT").describe());
        assertTrue(GestureSettings.DEFAULT.describe().endsWith("自動"));
    }
}
