package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/**
 * Pins the Android half of a contract whose other half is in CIBAR's scenarioTargetMap.js.
 * Nothing at build time checks the two agree, so if the order drifts a scan opens the wrong
 * scenario and nothing complains - which is why both the index and the name are sent, and why
 * the spelling is asserted here character for character.
 */
public class ScanTargetTest {

    @Test public void theOrderMatchesCibarsTargetScenarioMap() {
        assertEquals("investment", ScanTarget.byIndex(0).scenario);
        assertEquals("romance", ScanTarget.byIndex(1).scenario);
        assertEquals("authority", ScanTarget.byIndex(2).scenario);
        assertEquals("fakeSeller", ScanTarget.byIndex(3).scenario);
        assertEquals("fakeBuyer", ScanTarget.byIndex(4).scenario);
    }

    @Test public void thereAreExactlyFiveTargets() {
        assertEquals(5, ScanTarget.values().length);
        for (int i = 0; i < 5; i++) {
            assertEquals(i, ScanTarget.byIndex(i).index);
        }
    }

    @Test public void anUnknownIndexIsNotGuessedAt() {
        assertNull(ScanTarget.byIndex(-1));
        assertNull(ScanTarget.byIndex(5));
        assertNull(ScanTarget.byIndex(99));
    }
}
