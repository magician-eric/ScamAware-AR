package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Pins the replica of JJSDK's private firmware gate. The packing is base 16, not base 10, and
 * getting that wrong would either declare a working module broken or - far worse - declare a
 * gesture-less module fine and send someone back to debug code that was never at fault.
 */
public class TofFirmwareTest {

    /** The exact threshold the SDK compares against: 290 decimal, 0x122, "1.2.2". */
    @Test public void theThresholdIsOneTwoTwoPackedInBaseSixteen() {
        assertEquals(290, TofFirmware.GESTURE_MINIMUM);
        assertEquals(290, TofFirmware.pack("1.2.2"));
    }

    @Test public void packingIsBaseSixteenNotBaseTen() {
        assertEquals(0x100, TofFirmware.pack("1.0.0"));
        assertEquals(0x123, TofFirmware.pack("1.2.3"));
        // Base 10 would make this 122 and wrongly fail the gate; base 16 makes it 0x122.
        assertEquals(0x122, TofFirmware.pack("1.2.2"));
        // A component above 15 overflows its nibble, exactly as the SDK's arithmetic does.
        assertEquals(1 * 16 + 16, TofFirmware.pack("1.16"));
    }

    @Test public void versionsAtOrAboveTheThresholdDeliverGestures() {
        assertTrue(TofFirmware.deliversGestures("1.2.2"));
        assertTrue(TofFirmware.deliversGestures("1.2.3"));
        assertTrue(TofFirmware.deliversGestures("1.3.0"));
        assertTrue(TofFirmware.deliversGestures("2.0.0"));
    }

    @Test public void versionsBelowTheThresholdDoNot() {
        assertFalse(TofFirmware.deliversGestures("1.2.1"));
        assertFalse(TofFirmware.deliversGestures("1.1.9"));
        assertFalse(TofFirmware.deliversGestures("1.0.0"));
        assertFalse(TofFirmware.deliversGestures("0.9.9"));
    }

    /**
     * The failure this was written for: a version the device never filled in packs to zero and
     * silently disables gestures, with every other layer reporting healthy.
     */
    @Test public void anUnreadableVersionPacksToZeroAndDisablesGestures() {
        assertEquals(0, TofFirmware.pack(null));
        assertEquals(0, TofFirmware.pack(""));
        assertEquals(0, TofFirmware.pack("   "));
        assertEquals(0, TofFirmware.pack("unknown"));
        assertFalse(TofFirmware.deliversGestures(null));
        assertFalse(TofFirmware.deliversGestures(""));
        assertFalse(TofFirmware.deliversGestures("unknown"));
    }

    /** Unparsable components are skipped rather than aborting, matching the SDK. */
    @Test public void anUnparsableComponentIsSkippedNotFatal() {
        assertEquals(0x12, TofFirmware.pack("1.x.2"));
    }

    /**
     * Whitespace must NOT be trimmed away before the gate. Integer.parseInt(" 2") throws, so the
     * SDK skips that component and lands below the threshold; trimming first parses what the SDK
     * could not and flips the verdict to "enabled" on a module that emits nothing. Every case
     * here failed that way before the trims were removed - the worst possible direction, because
     * it sends the reader back to debug code that was never at fault.
     */
    @Test public void whitespaceIsNotTrimmedAwayBeforeTheGate() {
        assertEquals(18, TofFirmware.pack("1. 2.2"));
        assertEquals(34, TofFirmware.pack(" 1.2.2"));
        assertEquals(18, TofFirmware.pack("1.2.2 "));
        assertEquals(34, TofFirmware.pack("1 .2.2"));
        assertFalse(TofFirmware.deliversGestures("1. 2.2"));
        assertFalse(TofFirmware.deliversGestures(" 1.2.2"));
        assertFalse(TofFirmware.deliversGestures("1.2.2 "));
        assertFalse(TofFirmware.deliversGestures("1 .2.2"));
    }

    /** A stray space therefore reads as disabled, not as enabled-with-a-tidy-version-string. */
    @Test public void theVerdictForAWhitespacedVersionIsDisabled() {
        assertTrue(TofFirmware.describe("1.2.2 ").contains("被韌體停用"));
    }

    @Test public void theVerdictNamesTheCauseWhenGesturesAreOff() {
        String off = TofFirmware.describe("1.1.0");
        assertTrue(off.contains("1.1.0"));
        assertTrue(off.contains("1.2.2"));
        assertTrue(off.contains("韌體"));

        assertTrue(TofFirmware.describe("1.2.2").contains("已啟用"));
        assertTrue(TofFirmware.describe(null).contains("無法確認"));
    }
}
