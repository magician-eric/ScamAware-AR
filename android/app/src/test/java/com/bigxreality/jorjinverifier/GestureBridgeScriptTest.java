package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * The bridge script is the one piece of this feature that cannot be caught by the Java compiler:
 * it is JavaScript inside string literals, handed to {@code evaluateJavascript}, where a syntax
 * error is silent - the page simply never hears a gesture.  These tests pin the parts that would
 * break quietly: the event name CIBAR has to listen for, the escaping, and the fact that a reset
 * never looks like a gesture.
 */
public class GestureBridgeScriptTest {

    @Test public void theEventNameIsTheOneCibarIsToldToListenFor() {
        assertEquals("jorjinGesture", GestureBridgeScript.EVENT_NAME);
        assertTrue(GestureBridgeScript.install().contains("\"jorjinGesture\""));
    }

    @Test public void everyCallInstallsTheBridgeFirst() {
        // A hash-route change or a reload can drop window between page load and the next gesture,
        // so no call may assume the bridge is still there.
        String install = GestureBridgeScript.install();
        assertTrue(GestureBridgeScript.sync("PUSH", 3).startsWith(install));
        assertTrue(GestureBridgeScript.deliver("PUSH", "推進 PUSH", 3, 99).startsWith(install));
    }

    @Test public void installIsIdempotent() {
        assertTrue(GestureBridgeScript.install()
                .contains("if(window.__jorjinGestureBridge){return;}"));
    }

    @Test public void deliverCarriesTheBareCodeAndTheCount() {
        String script = GestureBridgeScript.deliver("LEFT", "向左 LEFT", 12, 4242);
        assertTrue(script.contains("gesture:\"LEFT\""));
        assertTrue(script.contains("label:\"向左 LEFT\""));
        assertTrue(script.contains("count:12"));
        assertTrue(script.contains("at:4242"));
        assertTrue(script.contains(".deliver({"));
    }

    /** A restart resets the counters; the page must not be told a gesture happened. */
    @Test public void syncNeverDispatchesAnEvent() {
        String script = GestureBridgeScript.sync("—", 0);
        assertTrue(script.contains(".sync(\"—\",0)"));
        assertFalse(script.contains(".deliver({"));
    }

    @Test public void syncFallsBackToADashWhenNothingHasBeenSeenYet() {
        assertTrue(GestureBridgeScript.sync(null, 0).contains(".sync(\"—\",0)"));
    }

    @Test public void quoteEscapesWhatWouldOtherwiseEndTheLiteral() {
        assertEquals("\"a\\\"b\"", GestureBridgeScript.quote("a\"b"));
        assertEquals("\"a\\\\b\"", GestureBridgeScript.quote("a\\b"));
        assertEquals("\"a\\nb\"", GestureBridgeScript.quote("a\nb"));
        assertEquals("\"a\\rb\"", GestureBridgeScript.quote("a\rb"));
        assertEquals("\"a\\tb\"", GestureBridgeScript.quote("a\tb"));
        assertEquals("\"a\\u0000b\"", GestureBridgeScript.quote("a\u0000b"));
        // U+2028/U+2029 end a line in JavaScript even inside a string literal.
        assertEquals("\"a\\u2028b\"", GestureBridgeScript.quote("a\u2028b"));
        assertEquals("\"a\\u2029b\"", GestureBridgeScript.quote("a\u2029b"));
        assertEquals("\"\\u003c/script\\u003e\"", GestureBridgeScript.quote("</script>"));
        assertEquals("null", GestureBridgeScript.quote(null));
    }

    @Test public void quoteLeavesOrdinaryTextAlone() {
        assertEquals("\"推進 PUSH\"", GestureBridgeScript.quote("推進 PUSH"));
    }

    /**
     * The production APK draws nothing. The bridge used to paint a "Jorjin Gesture / Last: /
     * Count:" box into the top-right corner of CIBAR on every page load, and it was the last
     * piece of engineering UI a player could see. Nothing here may touch the DOM again: the
     * counters live in a JavaScript object the page can read, and that is all.
     */
    @Test public void theBridgeNeverDrawsAnythingOnThePage() {
        for (String script : new String[]{
                GestureBridgeScript.install(),
                GestureBridgeScript.sync("PUSH", 3),
                GestureBridgeScript.deliver("LEFT", "向左 LEFT", 4, 5)}) {
            assertFalse(script.contains("Jorjin Gesture"));
            assertFalse(script.contains("jorjin-gesture-diagnostic"));
            assertFalse(script.contains("createElement"));
            assertFalse(script.contains("appendChild"));
            assertFalse(script.contains("style"));
            assertFalse(script.contains("document.body"));
            // A repeating re-mount existed only to keep that box alive across SPA route changes.
            assertFalse(script.contains("setInterval"));
        }
    }

    /** What the overlay displayed is still tracked, and still readable by the page. */
    @Test public void theCountersAreStillPublishedToThePage() {
        String install = GestureBridgeScript.install();
        assertTrue(install.contains("getLastGesture:function(){return state.last;}"));
        assertTrue(install.contains("getGestureCount:function(){return state.count;}"));
        assertTrue(install.contains("state.last=detail.gesture;state.count=detail.count;"));
    }

    /** The event itself is untouched: this is the half CIBAR actually runs on. */
    @Test public void theEventIsStillDispatchedToThePage() {
        String script = GestureBridgeScript.deliver("RIGHT", "向右 RIGHT", 7, 8);
        assertTrue(script.contains("window.dispatchEvent(new CustomEvent(NAME,{detail:detail}))"));
        assertTrue(script.contains("initCustomEvent(NAME,false,false,detail)"));
        assertTrue(script.contains("jorjinGestureBridgeReady"));
    }

    /** Braces and parentheses balancing is the cheapest available proxy for "this parses". */
    @Test public void theGeneratedScriptIsBalanced() {
        for (String script : new String[]{
                GestureBridgeScript.install(),
                GestureBridgeScript.sync("PUSH", 1),
                GestureBridgeScript.deliver("PUSH", "推進 PUSH", 1, 2)}) {
            assertBalanced(script);
        }
    }

    private static void assertBalanced(String script) {
        int curly = 0;
        int round = 0;
        boolean inString = false;
        char quote = 0;
        for (int i = 0; i < script.length(); i++) {
            char c = script.charAt(i);
            if (inString) {
                if (c == '\\') { i++; continue; }
                if (c == quote) inString = false;
                continue;
            }
            switch (c) {
                case '"': case '\'': inString = true; quote = c; break;
                case '{': curly++; break;
                case '}': curly--; break;
                case '(': round++; break;
                case ')': round--; break;
                default: break;
            }
            assertTrue("unbalanced at " + i, curly >= 0 && round >= 0);
        }
        assertFalse("unterminated string literal", inString);
        assertEquals("unbalanced braces", 0, curly);
        assertEquals("unbalanced parentheses", 0, round);
    }
}
