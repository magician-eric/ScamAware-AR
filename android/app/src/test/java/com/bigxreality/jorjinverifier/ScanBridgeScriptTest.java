package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * The scan bridge is JavaScript inside string literals handed to evaluateJavascript, where a
 * syntax error is silent - the page simply never hears about the scan. These pin the parts that
 * would break quietly.
 */
public class ScanBridgeScriptTest {

    @Test public void theEventNameIsTheOneCibarIsToldToListenFor() {
        assertEquals("jorjinScan", ScanBridgeScript.EVENT_NAME);
        assertTrue(ScanBridgeScript.install().contains("\"jorjinScan\""));
    }

    @Test public void everyCallInstallsTheBridgeFirst() {
        assertTrue(ScanBridgeScript.deliver(0, "investment", 0.9f, 1)
                .startsWith(ScanBridgeScript.install()));
    }

    @Test public void installIsIdempotent() {
        assertTrue(ScanBridgeScript.install()
                .contains("if(window.__jorjinScanBridge){return;}"));
    }

    /** targetIndex is what CIBAR's routeForTargetIndex() takes; it must be a bare number. */
    @Test public void deliverCarriesTheIndexTheScenarioAndTheConfidence() {
        String script = ScanBridgeScript.deliver(3, "fakeSeller", 0.875f, 4242);
        assertTrue(script.contains("targetIndex:3"));
        assertTrue(script.contains("scenario:\"fakeSeller\""));
        assertTrue(script.contains("confidence:0.88"));
        assertTrue(script.contains("at:4242"));
    }

    /**
     * NaN and Infinity are valid floats and invalid JavaScript numbers. Emitting either would
     * make the whole call a syntax error, and the page would never hear about the scan at all.
     */
    @Test public void anUnusableConfidenceNeverBreaksTheScript() {
        assertEquals("0", ScanBridgeScript.formatConfidence(Float.NaN));
        assertEquals("0", ScanBridgeScript.formatConfidence(Float.POSITIVE_INFINITY));
        assertEquals("0", ScanBridgeScript.formatConfidence(Float.NEGATIVE_INFINITY));
        assertEquals("1.00", ScanBridgeScript.formatConfidence(2f));
        assertEquals("0.00", ScanBridgeScript.formatConfidence(-1f));
        // No exponent notation, which Float.toString would produce for a small value.
        assertEquals("0.00", ScanBridgeScript.formatConfidence(0.0001f));
    }

    @Test public void theGeneratedScriptIsBalanced() {
        for (ScanTarget target : ScanTarget.values()) {
            assertBalanced(ScanBridgeScript.deliver(
                    target.index, target.scenario, 0.9f, 1));
        }
    }

    private static void assertBalanced(String script) {
        int curly = 0, round = 0;
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
        }
        assertEquals("unbalanced braces", 0, curly);
        assertEquals("unbalanced parentheses", 0, round);
    }
}
