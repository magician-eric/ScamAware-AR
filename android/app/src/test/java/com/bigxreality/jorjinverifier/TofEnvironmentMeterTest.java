package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.Random;

import org.junit.Test;

/** The numbers the staff mode's site lighting check judges. */
public class TofEnvironmentMeterTest {
    private final TofEnvironmentMeter meter = new TofEnvironmentMeter();
    private long clock = 10_000L;

    private void frames(int count, float[] range, float[] signal) {
        for (int i = 0; i < count; i++) {
            clock += 66;
            meter.frame(clock, range, signal);
        }
    }

    private static float[] filled(float value) {
        float[] out = new float[64];
        java.util.Arrays.fill(out, value);
        return out;
    }

    @Test public void noFramesIsAnEmptySnapshot() {
        TofEnvironmentMeter.Snapshot s = meter.snapshot(clock);
        assertEquals(0, s.frames);
        assertTrue(s.toJson().contains("\"frames\":0"));
    }

    @Test public void aSteadySceneHasNoNoise() {
        frames(30, filled(1500), filled(10));
        TofEnvironmentMeter.Snapshot s = meter.snapshot(clock);
        assertEquals(30, s.frames);
        assertEquals(1f, s.validRatio, 0.001f);
        assertEquals(0f, s.noisyZoneRatio, 0.001f);
        assertEquals(0f, s.handSeenRatio, 0.001f);
    }

    /** Infrared-rich light: zones drop in and out and readings wander. */
    @Test public void flickeringAndWanderingZonesAreNoise() {
        Random random = new Random(1);
        for (int i = 0; i < 30; i++) {
            float[] range = filled(1500);
            for (int z = 0; z < 32; z++) range[z] = random.nextBoolean() ? 0f : 600f + random.nextInt(900);
            clock += 66;
            meter.frame(clock, range, filled(5));
        }
        TofEnvironmentMeter.Snapshot s = meter.snapshot(clock);
        assertEquals(0.5f, s.noisyZoneRatio, 0.05f);
    }

    @Test public void aHandHeldStillIsSeenSteadily() {
        float[] range = filled(0);
        float[] signal = filled(0);
        for (int z = 26; z <= 29; z++) { range[z] = 300f; signal[z] = 40f; }
        for (int z = 34; z <= 37; z++) { range[z] = 302f; signal[z] = 42f; }
        frames(30, range, signal);
        TofEnvironmentMeter.Snapshot s = meter.snapshot(clock);
        assertEquals(1f, s.handSeenRatio, 0.001f);
        assertEquals(8f, s.handZones, 0.001f);
        assertEquals(301f, s.handRangeMm, 1.5f);
        assertTrue(s.handJitterMm < 1f);
        assertEquals(41f, s.handSignal, 1.5f);
    }

    @Test public void onlyTheLastWindowCounts() {
        frames(30, filled(300), filled(40));
        clock += TofEnvironmentMeter.WINDOW_MS + 1;
        frames(5, filled(1500), filled(10));
        TofEnvironmentMeter.Snapshot s = meter.snapshot(clock);
        assertEquals(5, s.frames);
        assertEquals(0f, s.handSeenRatio, 0.001f);
    }

    @Test public void theBridgeScriptWrapsTheNativeObject() {
        String script = EnvironmentCheckBridge.installScript();
        assertTrue(script.contains("window.__cibarEnvironmentNative"));
        assertTrue(script.contains("window.__cibarEnvironment={"));
        assertTrue(script.contains("JSON.parse(n.tofSnapshot())"));
        assertTrue(script.contains("cibarEnvironmentReady"));
    }
}
