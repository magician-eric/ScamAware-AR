package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.Before;
import org.junit.Test;

/**
 * A recogniser reports the same card on every frame it can still see it. CIBAR navigates on a
 * scan, so telling it twice would throw the wearer back to the top of the scenario they just
 * entered - these rules are what stops that.
 */
public class ScanDispatcherTest {
    private final List<String> fired = new ArrayList<>();
    private ScanDispatcher dispatcher;

    @Before public void setUp() {
        fired.clear();
        dispatcher = new ScanDispatcher((target, confidence) -> fired.add(target.scenario));
    }

    @Test public void aConfidentMatchIsReported() {
        assertTrue(dispatcher.offer(ScanTarget.INVESTMENT, 0.9f, 0));
        assertEquals(1, fired.size());
        assertEquals("investment", fired.get(0));
    }

    /** Holding the card in view is one sighting, however many frames see it. */
    @Test public void theSameTargetIsReportedOnce() {
        dispatcher.offer(ScanTarget.ROMANCE, 0.9f, 0);
        for (int i = 1; i < 60; i++) {
            assertFalse(dispatcher.offer(ScanTarget.ROMANCE, 0.9f, i * 33L));
        }
        assertEquals(1, fired.size());
    }

    /** Looking from one card to another is a real event and must not wait out a cooldown. */
    @Test public void adifferentTargetIsAlwaysReportedImmediately() {
        dispatcher.offer(ScanTarget.INVESTMENT, 0.9f, 0);
        assertTrue(dispatcher.offer(ScanTarget.AUTHORITY, 0.9f, 10));
        assertTrue(dispatcher.offer(ScanTarget.FAKE_BUYER, 0.9f, 20));
        assertEquals(3, fired.size());
    }

    @Test public void theSameTargetIsReportableAgainAfterTheWindow() {
        dispatcher.offer(ScanTarget.INVESTMENT, 0.9f, 0);
        assertFalse(dispatcher.offer(ScanTarget.INVESTMENT, 0.9f,
                ScanDispatcher.REPEAT_WINDOW_MS - 1));
        assertTrue(dispatcher.offer(ScanTarget.INVESTMENT, 0.9f,
                ScanDispatcher.REPEAT_WINDOW_MS));
        assertEquals(2, fired.size());
    }

    /** A guess must never navigate. */
    @Test public void aLowConfidenceMatchIsNotAScan() {
        assertFalse(dispatcher.offer(ScanTarget.ROMANCE,
                ScanDispatcher.MIN_CONFIDENCE - 0.01f, 0));
        assertTrue(fired.isEmpty());
        assertTrue(dispatcher.offer(ScanTarget.ROMANCE, ScanDispatcher.MIN_CONFIDENCE, 0));
    }

    @Test public void nothingRecognisedIsNotAScan() {
        assertFalse(dispatcher.offer(null, 1.0f, 0));
        assertFalse(dispatcher.offer(ScanTarget.ROMANCE, Float.NaN, 0));
        assertTrue(fired.isEmpty());
        assertEquals(0, dispatcher.acceptedCount());
    }

    /** A rejected result must not become the "already reported" target. */
    @Test public void aRejectedResultDoesNotBlockTheRealOne() {
        dispatcher.offer(ScanTarget.ROMANCE, 0.1f, 0);
        assertTrue(dispatcher.offer(ScanTarget.ROMANCE, 0.9f, 10));
        assertEquals(1, fired.size());
    }
}
