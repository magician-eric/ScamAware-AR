package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * The trace exists to answer one question on hardware: did something null JJSDK's static gesture
 * listener after the streaming manager came up? Two things have to hold for it to answer that -
 * instance ids must actually distinguish instances, and a firmware string's invisible characters
 * must survive into the log.
 */
public class TofTraceTest {

    @Test public void instanceIdsAreDistinct() {
        assertNotEquals(TofTrace.nextInstanceId(), TofTrace.nextInstanceId());
    }

    /**
     * "1.2.2" and "1.2.2\r\n" behave completely differently at JJSDK's gate - parseInt throws on
     * the second, dropping a component - and look identical in an unescaped log.
     */
    @Test public void controlCharactersInAFirmwareStringStaySsible() {
        assertEquals("\"1.2.2\\r\\n\" (len=7)", TofTrace.escape("1.2.2\r\n"));
        assertEquals("\"1.2.2\" (len=5)", TofTrace.escape("1.2.2"));
        assertEquals("\"1.2.2 \" (len=6)", TofTrace.escape("1.2.2 "));
        assertEquals("\"\\x00\" (len=1)", TofTrace.escape("\u0000"));
        assertEquals("null", TofTrace.escape(null));
    }

    /** A trailing CRLF closes the gate, which is why it must be visible. */
    @Test public void aTrailingNewlineClosesTheGestureGate() {
        assertTrue(TofFirmware.deliversGestures("1.2.2"));
        org.junit.Assert.assertFalse(TofFirmware.deliversGestures("1.2.2\r\n"));
    }
}
