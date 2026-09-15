package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * Like the other two bridges, this is JavaScript inside a string literal handed to
 * {@code evaluateJavascript}, where a syntax error is completely silent - the page simply never
 * learns which Shell it is in, which looks identical to running in a browser.
 */
public class ShellBridgeScriptTest {

    private static String script() {
        return ShellBridgeScript.install("1.0.0", "1.0.0+42.abc1234", 10042, "OTA");
    }

    @Test public void theDescriptorCarriesBothHalvesOfTheVersionContract() {
        String script = script();
        assertTrue(script.contains("shellVersion:\"1.0.0\""));
        assertTrue(script.contains("versionName:\"1.0.0+42.abc1234\""));
        assertTrue(script.contains("versionCode:10042"));
        assertTrue(script.contains("webBundleSource:\"OTA\""));
        assertTrue(script.contains("bundledWebContent:true"));
    }

    @Test public void itIsPublishedUnderTheNameTheWebSideReads() {
        assertTrue(script().contains("window.__cibarShell="));
        assertTrue(script().contains("\"cibarShellReady\""));
    }

    /**
     * The gesture and scan bridges hold accumulated state and so refuse to reinstall over
     * themselves. This one is four constants: a page that reloaded has to get them back, so a
     * bail-out guard here would be a bug rather than a saving.
     */
    @Test public void republishingIsAllowed() {
        assertFalse(script().contains("if(window.__cibarShell){return;}"));
    }

    /**
     * A phone still on the build it was installed with says so.
     *
     * <p>This used to be the online delivery reporting that it did not carry its own content.
     * There is one APK now and it always carries a complete baseline, so the question that still
     * has two answers is which bundle is being served - and {@code bundledWebContent} is true
     * either way, because either way the bytes are on this device.
     */
    @Test public void aShellOnItsOwnBaselineSaysSo() {
        String baseline = ShellBridgeScript.install("1.0.0", "1.0.0+42.abc1234", 10042,
                "APK_BASELINE");
        assertTrue(baseline.contains("webBundleSource:\"APK_BASELINE\""));
        assertTrue("the experience is always served locally now",
                baseline.contains("bundledWebContent:true"));
    }

    /**
     * versionName is assembled from a JSON file and an environment variable, so it is not
     * structurally impossible for a quote to reach here; unescaped, it would take the whole
     * descriptor down with it.
     */
    @Test public void aQuoteInAVersionCannotBreakTheScript() {
        String script = ShellBridgeScript.install("1.0.0", "1.0.0-\"odd\"", 1, "OTA");
        assertTrue(script.contains("versionName:\"1.0.0-\\\"odd\\\"\""));
    }
}
