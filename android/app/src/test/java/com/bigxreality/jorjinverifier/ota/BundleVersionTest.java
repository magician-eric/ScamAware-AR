package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

/**
 * The direction of "newer".
 *
 * <p>One comparison decides whether a phone upgrades or quietly installs an older experience over
 * a newer one, and both outcomes look identical from outside: the app opens and runs. The only
 * place that difference is visible is here.
 *
 * <p>The format is {@code MAJOR.MINOR.PATCH-YYYYMMDD-NNN}, produced by
 * {@code webapp/scripts/ota-version.mjs}. The two implementations have to order identically, so
 * the cases below are deliberately the same cases that file's own tests use.
 */
public class BundleVersionTest {

    @Test public void theDaysSequenceOrders() {
        assertTrue(BundleVersion.isNewer("1.0.0-20260825.002", "1.0.0-20260825.001"));
        // Numerically, not as text: "009" < "010" either way, but an unpadded "9" would sort after
        // "10" lexicographically and ship yesterday's bundle as an update.
        assertTrue(BundleVersion.isNewer("1.0.0-20260825.010", "1.0.0-20260825.009"));
    }

    @Test public void theDateOutranksTheSequence() {
        assertTrue(BundleVersion.isNewer("1.0.0-20260826.001", "1.0.0-20260825.099"));
        assertFalse(BundleVersion.isNewer("1.0.0-20260825.099", "1.0.0-20260826.001"));
    }

    @Test public void theProductVersionOutranksBoth() {
        // A 1.0.1 cut yesterday is newer than a 1.0.0 cut today: the product version is the
        // deliberate half of this number, and a release is not superseded by a rebuild of the one
        // before it.
        assertTrue(BundleVersion.isNewer("1.0.1-20260824.001", "1.0.0-20260825.050"));
        assertTrue(BundleVersion.isNewer("1.0.10-20260825.001", "1.0.9-20260825.001"));
        assertTrue(BundleVersion.isNewer("2.0.0-20260101.001", "1.99.99-20261231.999"));
    }

    @Test public void aVersionEqualsItself() {
        assertEquals(0, BundleVersion.compare("1.0.0-20260825.001", "1.0.0-20260825.001"));
        assertFalse(BundleVersion.isNewer("1.0.0-20260825.001", "1.0.0-20260825.001"));
    }

    /**
     * A shell with no readable baseline reports {@link BundleVersion#UNKNOWN}, and the first real
     * bundle has to supersede it. The alternative - refusing every published bundle as a
     * downgrade - is a phone that can never update and gives no reason.
     */
    @Test public void anUnknownBaselineIsOlderThanEverything() {
        assertTrue(BundleVersion.isValid(BundleVersion.UNKNOWN));
        assertTrue(BundleVersion.isNewer("0.0.1-20200101.001", BundleVersion.UNKNOWN));
    }

    /**
     * What a remote pointer is allowed to claim.
     *
     * <p>The version in {@code latest.json} is the one input to this mechanism nobody in this
     * repository wrote. A free-form version would let {@code 99999999} outrank every real bundle
     * forever and pin the phone to whatever was served alongside it.
     */
    @Test public void onlyThePublishedFormatIsAccepted() {
        assertTrue(BundleVersion.isPublishedFormat("1.0.0-20260825.001"));
        assertTrue("more than three digits of sequence is still a sequence",
                BundleVersion.isPublishedFormat("1.0.0-20260825.1024"));
        for (String rejected : new String[] {
                null, "", "1.0.0", "v1.0.0-20260825.001", "1.0-20260825.001",
                "1.0.0-2026825-001", "1.0.0-20260825-1", "99999999",
                // A commit SHA is a build fingerprint, not a version anybody can order.
                "dd1cf51", "1.0.0-20260825.001-dirty"}) {
            assertFalse(String.valueOf(rejected), BundleVersion.isPublishedFormat(rejected));
        }
    }

    /**
     * An unreadable version throws rather than sorting as zero. Treating it as zero would make a
     * corrupt state file look like a fresh install and silently discard a working bundle.
     */
    @Test public void anUnreadableVersionIsRefusedRatherThanGuessed() {
        try {
            BundleVersion.compare("not-a-version", "1.0.0-20260825.001");
            fail("an unreadable version must not compare as anything");
        } catch (IllegalArgumentException expected) {
            assertTrue(expected.getMessage().contains("not-a-version"));
        }
    }

    /** The parts a diagnostics dump quotes back, so a person can read them without the shell. */
    @Test public void theVersionCanBeTakenApartForDiagnostics() {
        String version = "1.2.3-20260825.007";
        assertEquals("1.2.3", BundleVersion.productVersionOf(version));
        assertEquals("20260825", BundleVersion.releaseDateOf(version));
        assertEquals(7, BundleVersion.releaseSequenceOf(version));
    }
}
