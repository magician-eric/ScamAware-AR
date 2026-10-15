package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.app.ApplicationExitInfo;

import org.junit.Test;

public class CrashRecoveryTest {
    private static final long NOW = 1_800_000_000_000L;

    @Test public void theFirstRendererDeathRestartsCibar() {
        assertTrue(CrashRecovery.shouldRelaunch(0L, NOW));
    }

    /** A renderer that dies again right after a restart is not fixed by another one. */
    @Test public void aSecondDeathWithinTheIntervalDoesNotRestartAgain() {
        assertFalse(CrashRecovery.shouldRelaunch(NOW - 1_000L, NOW));
        assertFalse(CrashRecovery.shouldRelaunch(
                NOW - CrashRecovery.MIN_RELAUNCH_INTERVAL_MS + 1, NOW));
    }

    @Test public void aDeathWellAfterTheLastRestartRestartsAgain() {
        assertTrue(CrashRecovery.shouldRelaunch(NOW - CrashRecovery.MIN_RELAUNCH_INTERVAL_MS, NOW));
        assertTrue(CrashRecovery.shouldRelaunch(NOW - 3_600_000L, NOW));
    }

    @Test public void aClockThatMovedBackwardsDoesNotBlockARestart() {
        assertTrue(CrashRecovery.shouldRelaunch(NOW + 60_000L, NOW));
    }

    /** The literal values in exitReason are Android's own; pinned against the real constants. */
    @Test public void exitReasonsMatchAndroidsConstants() {
        assertTrue(CrashRecovery.exitReason(ApplicationExitInfo.REASON_LOW_MEMORY).startsWith("LOW_MEMORY"));
        assertTrue(CrashRecovery.exitReason(ApplicationExitInfo.REASON_CRASH).startsWith("CRASH（"));
        assertTrue(CrashRecovery.exitReason(ApplicationExitInfo.REASON_CRASH_NATIVE).startsWith("CRASH_NATIVE"));
        assertTrue(CrashRecovery.exitReason(ApplicationExitInfo.REASON_ANR).startsWith("ANR"));
        assertTrue(CrashRecovery.exitReason(ApplicationExitInfo.REASON_SIGNALED).startsWith("SIGNALED"));
        assertTrue(CrashRecovery.exitReason(ApplicationExitInfo.REASON_USER_REQUESTED).startsWith("USER_REQUESTED"));
        assertTrue(CrashRecovery.exitReason(ApplicationExitInfo.REASON_DEPENDENCY_DIED).startsWith("DEPENDENCY_DIED"));
        assertTrue(CrashRecovery.exitReason(ApplicationExitInfo.REASON_EXCESSIVE_RESOURCE_USAGE)
                .startsWith("EXCESSIVE_RESOURCE_USAGE"));
        assertEquals("UNKNOWN（99）", CrashRecovery.exitReason(99));
    }
}
