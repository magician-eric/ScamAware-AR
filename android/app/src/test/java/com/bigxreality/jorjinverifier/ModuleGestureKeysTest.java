package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;

import org.junit.Test;

/**
 * The key map this app hands the ToF module's own gesture engine.
 *
 * <p>What it must say is narrow and load-bearing: LEFT and RIGHT press the two arrows the page
 * reads, and nothing else presses anything - above all not Back, which is what the vendor app's
 * default map has a pull press, and which takes this app off the screen.
 */
public class ModuleGestureKeysTest {
    @Test public void leftAndRightPressTheTwoArrowsThePageReads() {
        assertTrue(ModuleGestureKeys.COMMANDS.contains("settofkey L keyleft"));
        assertTrue(ModuleGestureKeys.COMMANDS.contains("settofkey R keyright"));
    }

    @Test public void everyOtherGestureTheModuleKnowsPressesNothing() {
        for (String gesture : new String[] {"U", "D", "PUSH", "PULL", "HALT"}) {
            assertTrue(gesture + " 必須設成 keynone",
                    ModuleGestureKeys.COMMANDS.contains("settofkey " + gesture + " keynone"));
        }
    }

    /** The two keys that leave the app or press whatever has focus, by name. */
    @Test public void noGestureCanPressBackOrEnter() {
        for (String command : ModuleGestureKeys.COMMANDS) {
            assertFalse("模組手勢不得按返回鍵：" + command, command.contains("keyback"));
            assertFalse("模組手勢不得按 Enter：" + command, command.contains("keyenter"));
        }
    }

    /** All seven of the module's gestures are named, each exactly once. */
    @Test public void theMapCoversEveryGestureExactlyOnce() {
        List<String> gestures = new ArrayList<>();
        for (String command : ModuleGestureKeys.COMMANDS) {
            String[] parts = command.split(" ");
            assertEquals("settofkey <gesture> <key>：" + command, 3, parts.length);
            assertEquals("settofkey", parts[0]);
            gestures.add(parts[1]);
        }
        assertEquals(7, gestures.size());
        assertEquals(7, new java.util.HashSet<>(gestures).size());
        for (String expected : new String[] {"U", "D", "L", "R", "PUSH", "PULL", "HALT"}) {
            assertTrue("缺少 " + expected, gestures.contains(expected));
        }
    }

    @Test public void eachCommandIsALineTheWayJjsdkEndsItsOwn() {
        assertEquals("settofkey L keyleft\r\n", ModuleGestureKeys.line("settofkey L keyleft"));
    }

    @Test public void onlyAnOkReplyCountsAsAcknowledged() {
        assertTrue(ModuleGestureKeys.acknowledged("OK"));
        assertTrue(ModuleGestureKeys.acknowledged("..OK"));
        assertFalse(ModuleGestureKeys.acknowledged(null));
        assertFalse(ModuleGestureKeys.acknowledged(""));
        assertFalse(ModuleGestureKeys.acknowledged("ERROR"));
    }

    /** A slice of a binary depth frame must not reach Logcat as control characters. */
    @Test public void aReplyIsMadePrintableAndShortForTheLog() {
        assertEquals("（無回應）", ModuleGestureKeys.describeReply(null));
        assertEquals("（空白）", ModuleGestureKeys.describeReply(""));
        assertEquals("O.K", ModuleGestureKeys.describeReply("O\u0001K"));
        String long80 = new String(new char[80]).replace('\0', 'x');
        assertEquals(40, ModuleGestureKeys.describeReply(long80).length());
    }

    @Test public void theMapIsSentTheVendorAppsWayWithTheSensorOff() {
        // settofpwr 0 -> settofmode 1 -> key map -> settofpwr 1 -> settofconf 0
        assertEquals(java.util.Arrays.asList("settofpwr 0", "settofmode 1"), ModuleGestureKeys.BEFORE);
        assertEquals(java.util.Arrays.asList("settofpwr 1", "settofconf 0"), ModuleGestureKeys.AFTER);
    }
}
