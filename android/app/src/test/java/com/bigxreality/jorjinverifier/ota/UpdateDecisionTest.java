package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.Test;

/**
 * Whether a published bundle is worth 80 MiB of somebody's data allowance, decided before a single
 * byte of it is fetched - and what the shell does with a pointer file it does not trust.
 *
 * <p>Both halves are invisible from outside. A download that should not have happened looks exactly
 * like one that should; a refusal that should not have happened looks exactly like a phone that is
 * up to date. Asking the question without a network, a phone or a clock is the only way to see the
 * difference.
 */
public class UpdateDecisionTest {

    private static final String V1 = "1.0.0-20260825.001";
    private static final String V2 = "1.0.1-20260825.002";

    /** The Shell these tests run as, and the one the fixtures are published for. */
    private static final String SHELL = TestBundles.BASELINE_SHELL;

    /** A Shell line above {@link #SHELL} - what a release needing a newer bridge asks for. */
    private static final String NEWER_SHELL = TestBundles.NEWER_SHELL;

    private static OtaLatest latest(String releaseId, String minShellVersion) throws OtaException {
        return OtaLatest.parse("{"
                + "\"releaseId\":\"" + releaseId + "\","
                + "\"version\":\"" + BundleVersion.productVersionOf(releaseId) + "\","
                + "\"url\":\"https://example.test/bundle.zip\","
                + "\"sha256\":\"" + zeros() + "\","
                + "\"sizeBytes\":1024,"
                + "\"minShellVersion\":\"" + minShellVersion + "\""
                + "}");
    }

    private static String zeros() {
        StringBuilder digest = new StringBuilder();
        for (int i = 0; i < 64; i++) digest.append('0');
        return digest.toString();
    }

    // ------------------------------------------------------------------ what gets downloaded

    @Test public void somethingNewerIsWorthFetching() throws Exception {
        UpdateDecision decision = UpdateDecision.decide(latest(V2, SHELL), V1, null,
                SHELL);
        assertEquals(UpdateDecision.Action.DOWNLOAD, decision.action);
        assertTrue(decision.shouldDownload());
        assertTrue(decision.reason.contains(V2));
    }

    @Test public void whatThePhoneAlreadyRunsIsNot() throws Exception {
        assertEquals(UpdateDecision.Action.ALREADY_CURRENT,
                UpdateDecision.decide(latest(V2, SHELL), V2, null, SHELL).action);
        // And neither is something older, which is what a rolled-back CDN edge serves.
        assertEquals(UpdateDecision.Action.ALREADY_CURRENT,
                UpdateDecision.decide(latest(V1, SHELL), V2, null, SHELL).action);
    }

    /** Already downloaded and waiting for the next launch: fetching it again is pure waste. */
    @Test public void whatIsAlreadyStagedIsNot() throws Exception {
        UpdateDecision decision = UpdateDecision.decide(latest(V2, SHELL), V1, V2,
                SHELL);
        assertEquals(UpdateDecision.Action.ALREADY_STAGED, decision.action);
        assertFalse(decision.shouldDownload());
    }

    /** But something newer than what is staged supersedes it. */
    @Test public void somethingNewerThanWhatIsStagedSupersedesIt() throws Exception {
        String v3 = "1.0.2-20260826.001";
        assertEquals(UpdateDecision.Action.DOWNLOAD,
                UpdateDecision.decide(latest(v3, SHELL), V1, V2, SHELL).action);
    }

    /**
     * A phone whose baseline version could not be read treats itself as older than everything, so
     * the first published bundle updates it. The alternative is a phone that can never update and
     * gives no reason.
     */
    @Test public void aPhoneWithNoUsableVersionUpdatesItself() throws Exception {
        assertEquals(UpdateDecision.Action.DOWNLOAD,
                UpdateDecision.decide(latest(V1, SHELL), null, null, SHELL).action);
        assertEquals(UpdateDecision.Action.DOWNLOAD,
                UpdateDecision.decide(latest(V1, SHELL), "nonsense", null, SHELL).action);
    }

    // ------------------------------------------------------------------ the shell gate

    /**
     * A bundle that needs a native bridge this shell does not have is refused before it is
     * fetched, and the reason names both numbers so a diagnostics dump explains itself.
     */
    @Test public void aBundleAboveThisShellIsRefusedOutright() throws Exception {
        UpdateDecision decision = UpdateDecision.decide(latest(V2, NEWER_SHELL), V1,
                null, SHELL);
        assertEquals(UpdateDecision.Action.SHELL_TOO_OLD, decision.action);
        assertFalse(decision.shouldDownload());
        assertTrue(decision.reason.contains(NEWER_SHELL));
        assertTrue(decision.reason.contains("繼續使用目前版本"));
    }

    /**
     * The migration's own numbers: a 1.5.0 bundle published with {@code minShellVersion} 1.2.0.
     *
     * <p>This is the layer that protects the phones nobody reaches. A shell below the line is the
     * one that would mount the new bundle under the old prefix, and it is also the one that will
     * never be reinstalled by hand - so the only thing that can stop it is refusing to hand it the
     * bundle in the first place. The shell at the line takes it normally.
     */
    @Test public void aShellBelowTheMigrationLineIsNotGivenTheNewBundle() throws Exception {
        OtaLatest published = latest(V2, "1.2.0");

        UpdateDecision refused = UpdateDecision.decide(published, V1, null, "1.1.0");
        assertEquals(UpdateDecision.Action.SHELL_TOO_OLD, refused.action);
        assertFalse(refused.shouldDownload());
        assertTrue(refused.reason.contains("1.2.0"));
        assertTrue(refused.reason.contains("1.1.0"));

        UpdateDecision accepted = UpdateDecision.decide(published, V1, null, "1.2.0");
        assertEquals("the shell at the line is exactly old enough",
                UpdateDecision.Action.DOWNLOAD, accepted.action);
        assertTrue(accepted.shouldDownload());
    }

    /**
     * The shell gate is checked first, before "already current" and before "already staged".
     *
     * <p>Order matters for what diagnostics can say. A phone stuck on an old shell should report
     * that the published bundle needs a newer one - not "you are up to date", which is true and
     * useless, and which is what a check made after the version comparison would produce.
     */
    @Test public void theShellGateIsAskedBeforeTheVersionComparison() throws Exception {
        assertEquals(UpdateDecision.Action.SHELL_TOO_OLD,
                UpdateDecision.decide(latest(V1, NEWER_SHELL), V1, null,
                        SHELL).action);
        assertEquals(UpdateDecision.Action.SHELL_TOO_OLD,
                UpdateDecision.decide(latest(V2, NEWER_SHELL), V1, V2,
                        SHELL).action);
    }

    /** A bundle that asks for an older shell than this one is perfectly ordinary. */
    @Test public void aBundleThatNeedsLessThanThisShellIsFine() throws Exception {
        assertEquals(UpdateDecision.Action.DOWNLOAD,
                UpdateDecision.decide(latest(V2, SHELL), V1, null, "9.9.9").action);
    }

    @Test public void noAnswerAtAllIsARejection() {
        UpdateDecision decision = UpdateDecision.decide(null, V1, null, SHELL);
        assertEquals(UpdateDecision.Action.REJECTED, decision.action);
    }

    // ------------------------------------------------------------------ the pointer file

    /**
     * A captive portal does not answer with a connection error. It answers 200 with a login page,
     * and so does every proxy that rewrites unknown hosts. Strict parsing is what turns that into
     * "the update server said something I do not understand" rather than a download of an HTML
     * page that fails its digest several minutes later.
     */
    @Test public void aLoginPageIsNotAPointerFile() {
        for (String body : new String[] {
                "<!doctype html><title>Sign in to Guest Wi-Fi</title>",
                "", "   ", "null", "[]", "{}"}) {
            try {
                OtaLatest.parse(body);
                fail("must not accept: " + body);
            } catch (OtaException expected) {
                assertTrue(expected.getMessage(), expected.getMessage().length() > 0);
            }
        }
    }

    @Test public void aPointerFromAFutureSchemaIsRefusedRatherThanGuessedAt() {
        try {
            OtaLatest.parse("{\"schema\":99,\"releaseId\":\"" + V1 + "\",\"url\":"
                    + "\"https://example.test/b.zip\",\"sha256\":\"" + zeros() + "\"}");
            fail("a schema this shell does not know must not be acted on");
        } catch (OtaException expected) {
            assertTrue(expected.getMessage().contains("99"));
        }
    }

    @Test public void aPointerWithoutADigestIsRefused() {
        try {
            OtaLatest.parse("{\"releaseId\":\"" + V1 + "\",\"url\":"
                    + "\"https://example.test/b.zip\",\"sha256\":\"abc\"}");
            fail("a bundle with nothing to verify it against must not be fetched");
        } catch (OtaException expected) {
            assertTrue(expected.getMessage().contains("sha256"));
        }
    }

    // ------------------------------------------------------------------ the manifest

    @Test public void aManifestWithNoFileListVerifiesNothingAndIsRefused() {
        try {
            OtaManifest.parse("{\"schema\":1,\"version\":\"" + V1 + "\",\"entry\":\"index.html\","
                    + "\"files\":[]}");
            fail("a manifest that lists nothing would verify an empty tree as complete");
        } catch (OtaException expected) {
            assertTrue(expected.getMessage().contains("沒有列出任何檔案"));
        }
    }

    @Test public void aManifestPathThatCouldEscapeTheBundleIsRefused() {
        try {
            OtaManifest.parse("{\"schema\":1,\"version\":\"" + V1 + "\",\"entry\":\"index.html\","
                    + "\"files\":[{\"path\":\"../../evil\",\"bytes\":1,\"sha256\":\"" + zeros()
                    + "\"}]}");
            fail("a manifest is a list of names that will be written to disk");
        } catch (OtaException expected) {
            assertTrue(expected.getMessage().contains("離開 bundle"));
        }
    }

    @Test public void aWellFormedManifestParses() throws Exception {
        OtaManifest manifest = OtaManifest.parse(
                TestBundles.manifestFor(V1, TestBundles.completeBuild(), SHELL));
        assertEquals(V1, manifest.version);
        assertEquals("index.html", manifest.entry);
        assertEquals(SHELL, manifest.minShellVersion);
        assertTrue(manifest.declares("index.html"));
        assertTrue(manifest.declares("media/stings/outro.mp4"));
        assertFalse(manifest.declares("assets/not-in-the-build.js"));
    }
}
