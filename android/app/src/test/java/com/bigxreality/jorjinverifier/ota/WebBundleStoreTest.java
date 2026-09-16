package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.Map;

/**
 * The launch-time half of the update mechanism: which bundle runs this session, when a downloaded
 * one takes over, and what happens when one will not run at all.
 *
 * <p>Every scenario below is a real directory tree on disk, opened by a real store, across as many
 * simulated launches as the case needs - a new {@link WebBundleStore} over the same root is exactly
 * what a cold start is. Nothing is stubbed, because the failures being guarded against are all
 * failures of sequencing, and a stub agrees with whatever sequence it was written for.
 *
 * <p>Test names below map to the acceptance list in the specification:
 * A (first install, no network), E (no hot swap), F (next-launch activation), G (rollback on a
 * runtime failure), H (fallback to the APK baseline), L (the active bundle serves with no network).
 */
public class WebBundleStoreTest {

    /** What the APK was built with. */
    private static final String BASELINE = "1.0.0-20260824.001";
    private static final String V1 = "1.0.0-20260825.001";
    private static final String V2 = "1.0.1-20260825.002";

    private File root;
    private final StringBuilder log = new StringBuilder();

    @Before public void setUp() throws IOException {
        root = Files.createTempDirectory("cibar-store").toFile();
    }

    @After public void tearDown() {
        WebBundleStore.deleteRecursively(root);
    }

    /** One cold start: a new store over the same directory, which is all a launch really is. */
    private WebBundleStore launch() {
        return launchAt(TestBundles.BASE_PATH);
    }

    /**
     * One cold start as a shell that mounts bundles at a given prefix.
     *
     * <p>Changing only this between two launches over the same root is exactly what installing a
     * new APK over an old one does: the code changes, {@code filesDir} does not.
     */
    private WebBundleStore launchAt(String basePath) {
        return new WebBundleStore(root, BASELINE, TestBundles.BASELINE_SHELL, basePath,
                message -> log.append(message).append('\n'),
                () -> 1_700_000_000_000L);
    }

    // ------------------------------------------------------------------ A: first install, no network

    /**
     * Test A. A phone that has just installed the APK and has never had a network runs the build
     * packaged inside it - whole, with no download, no check and nothing to wait for.
     */
    @Test public void aFreshInstallWithNoNetworkRunsTheApkBaseline() {
        WebBundleStore store = launch();
        WebBundle bundle = store.openForLaunch();

        assertTrue("a phone with nothing downloaded runs the APK's own build", bundle.isBaseline());
        assertEquals(BASELINE, bundle.version);
        assertNull("the baseline is served from assets, not from a directory", bundle.directory);
        assertEquals(BASELINE, store.activeVersion());
        assertNull(store.pendingVersion());

        OtaDiagnostics diagnostics = store.diagnostics();
        assertEquals("APK_BASELINE", diagnostics.bundleSource);
        assertEquals(BASELINE, diagnostics.bundledVersion);
        assertEquals(BASELINE, diagnostics.activeVersion);
        assertEquals("nothing has been checked yet", 0L, diagnostics.lastUpdateCheck);
    }

    /** And it keeps doing so, launch after launch, with nothing accumulating. */
    @Test public void theBaselineIsStableAcrossLaunches() {
        for (int i = 0; i < 5; i++) {
            WebBundleStore store = launch();
            assertTrue(store.openForLaunch().isBaseline());
            store.markLaunchSucceeded();
        }
        assertTrue("no bundles were installed, so none may be on disk",
                launch().installedVersions().isEmpty());
    }

    // ------------------------------------------------------------------ E and F: staging, then next launch

    /**
     * Test E. A bundle that finishes downloading mid-session does not take over mid-session.
     *
     * <p>This is the rule the wearer would notice being broken: the download completes at an
     * arbitrary moment, which with the odds against us is three choices into scenario 03, and
     * swapping the page underneath them loses the run and looks like a crash.
     */
    @Test public void aBundleStagedDuringASessionDoesNotTakeOverDuringThatSession()
            throws Exception {
        WebBundleStore store = launch();
        WebBundle running = store.openForLaunch();
        store.markLaunchSucceeded();

        stage(store, V1);

        assertEquals("the running bundle is untouched", running, store.activeBundle());
        assertTrue(store.activeBundle().isBaseline());
        assertEquals(BASELINE, store.activeVersion());
        assertEquals(V1, store.pendingVersion());
        assertEquals(V1, store.diagnostics().pendingVersion);
    }

    /** Test F. The next cold start is when it takes over - and the old one becomes the fallback. */
    @Test public void theStagedBundleBecomesActiveAtTheNextLaunch() throws Exception {
        WebBundleStore first = launch();
        first.openForLaunch();
        first.markLaunchSucceeded();
        stage(first, V1);

        WebBundleStore second = launch();
        WebBundle bundle = second.openForLaunch();

        assertFalse("the downloaded bundle is now what runs", bundle.isBaseline());
        assertEquals(V1, bundle.version);
        assertEquals(second.versionDirectory(V1), bundle.directory);
        assertTrue("its files are really there", new File(bundle.directory, "index.html").isFile());
        assertNull("and nothing is left waiting", second.pendingVersion());
        // The APK baseline is what a rollback returns to now, and it is not a directory - it is
        // the APK itself, which is why previousVersion is null rather than a version string.
        assertNull(second.diagnostics().previousVersion);
        assertEquals("OTA", second.diagnostics().bundleSource);
    }

    /** Two updates in a row: each promotion moves the last one into the fallback slot. */
    @Test public void eachPromotionKeepsTheOneBeforeItAsTheFallback() throws Exception {
        WebBundleStore first = launch();
        first.openForLaunch();
        stage(first, V1);

        WebBundleStore second = launch();
        assertEquals(V1, second.openForLaunch().version);
        second.markLaunchSucceeded();
        stage(second, V2);

        WebBundleStore third = launch();
        assertEquals(V2, third.openForLaunch().version);
        assertEquals(V1, third.diagnostics().previousVersion);
        assertTrue("both are kept, because either may have to run",
                third.installedVersions().containsAll(java.util.Arrays.asList(V1, V2)));
    }

    // ------------------------------------------------------------------ G and H: rollback

    /**
     * Test G. A bundle that will not render its own entry point is demoted, in the same session,
     * and the previous one is what the wearer gets.
     */
    @Test public void aBundleThatFailsAtRuntimeIsRolledBackToThePreviousOne() throws Exception {
        installAndPromote(V1, V2);

        WebBundleStore store = launch();
        assertEquals(V2, store.openForLaunch().version);

        WebBundle fallback = store.rollbackAfterFailure("net::ERR_FILE_NOT_FOUND");

        assertEquals(V1, fallback.version);
        assertEquals(V1, store.activeVersion());
        assertTrue(store.diagnostics().lastRollbackReason.contains(V2));
        assertFalse("the broken bundle is not kept - it must never be promoted again",
                store.installedVersions().contains(V2));
    }

    /** Test H. When the fallback is broken too, the APK's own build is what is left. */
    @Test public void whenThePreviousBundleIsBrokenTooTheApkBaselineIsWhatRuns() throws Exception {
        installAndPromote(V1, V2);

        // V1's JavaScript is truncated on disk - a half-written file, a partial delete, storage
        // that filled up. It is exactly what an intact-looking bundle that cannot run looks like.
        File truncated = new File(launch().versionDirectory(V1), "assets/app.js");
        Files.write(truncated.toPath(), TestBundles.bytes("ex"));

        WebBundleStore store = launch();
        assertEquals(V2, store.openForLaunch().version);
        WebBundle fallback = store.rollbackAfterFailure("net::ERR_FILE_NOT_FOUND");

        assertTrue("nothing below the baseline exists, and the baseline always works",
                fallback.isBaseline());
        assertEquals(BASELINE, fallback.version);
        assertTrue(store.diagnostics().lastRollbackReason.length() > 0);
    }

    /**
     * The backstop for a bundle that takes the process down before anything can report a failure.
     * Two launches that never got the page up is a bundle that does not run.
     */
    @Test public void twoLaunchesThatNeverRenderRollTheBundleBack() throws Exception {
        installAndPromote(V1, V2);

        // Launch 1 of V2: starts, never confirms.
        assertEquals(V2, launch().openForLaunch().version);
        // Launch 2 of V2: starts, never confirms. That is the threshold.
        assertEquals(V2, launch().openForLaunch().version);

        WebBundleStore third = launch();
        assertEquals("the third launch does not run it again", V1, third.openForLaunch().version);
        assertTrue(third.diagnostics().lastRollbackReason.contains(V2));
    }

    /**
     * And a wearer who opens the app and immediately closes it does not lose an update.
     *
     * <p>One unconfirmed launch is somebody changing their mind, not a broken bundle. Rolling back
     * on the first would silently undo an update on a phone where nothing is wrong.
     */
    @Test public void oneUnconfirmedLaunchIsNotAFailure() throws Exception {
        installAndPromote(V1, V2);

        assertEquals(V2, launch().openForLaunch().version);          // opened and closed at once

        WebBundleStore next = launch();
        assertEquals(V2, next.openForLaunch().version);
        next.markLaunchSucceeded();

        assertEquals("a confirmed launch clears the counter for good",
                V2, launch().openForLaunch().version);
    }

    // ------------------------------------------------------------------ the integrity gate

    /** A staged bundle that lost a file between download and launch is not promoted. */
    @Test public void anIncompleteStagedBundleIsNotPromoted() throws Exception {
        WebBundleStore first = launch();
        first.openForLaunch();
        stage(first, V1);

        // A file disappears from the staged tree after it was verified.
        //noinspection ResultOfMethodCallIgnored
        new File(first.versionDirectory(V1), "assets/scenarios/clip.mp4").delete();

        WebBundleStore second = launch();
        WebBundle bundle = second.openForLaunch();

        assertTrue("an incomplete bundle is refused, not promoted and hoped for",
                bundle.isBaseline());
        assertNull(second.pendingVersion());
        assertTrue(second.diagnostics().lastUpdateError.contains("clip.mp4"));
    }

    /**
     * A bundle that needs a newer shell is not run, even if it somehow got onto the phone. The
     * check is at launch as well as at download, because the shell can be <em>downgraded</em>:
     * installing an older APK over a newer one leaves the newer bundle in place.
     */
    @Test public void aBundleThatNeedsANewerShellIsNotRun() throws Exception {
        WebBundleStore first = launch();
        first.openForLaunch();
        TestBundles.install(first, V1, TestBundles.completeBuild(), TestBundles.NEWER_SHELL);
        first.stagePending(V1, moveAside(first, V1));

        WebBundleStore second = launch();
        assertTrue(second.openForLaunch().isBaseline());
        assertTrue(second.diagnostics().lastUpdateError,
                second.diagnostics().lastUpdateError.contains(TestBundles.NEWER_SHELL));
    }

    /** A state file that got corrupted falls back to the baseline rather than refusing to start. */
    @Test public void anUnreadableStateFileFallsBackToTheBaseline() throws Exception {
        WebBundleStore first = launch();
        first.openForLaunch();
        stage(first, V1);
        assertEquals(V1, launch().openForLaunch().version);

        Files.write(new File(root, WebBundleStore.STATE_FILE).toPath(),
                TestBundles.bytes("{ this is not json"));

        WebBundleStore recovered = launch();
        assertTrue("a corrupt pointer file is not a reason to refuse to start",
                recovered.openForLaunch().isBaseline());
    }

    /** Nothing any role points at is kept, so a phone does not accumulate 80 MiB per release. */
    @Test public void unreferencedBundlesAreDeleted() throws Exception {
        WebBundleStore store = launch();
        store.openForLaunch();
        TestBundles.install(store, "1.0.0-20260101.001");
        TestBundles.install(store, "1.0.0-20260102.001");
        assertEquals(2, store.installedVersions().size());

        store.collectGarbage();

        assertTrue("no role points at either, so neither survives",
                store.installedVersions().isEmpty());
    }

    // ------------------------------------------- the bundle left behind by an in-place upgrade

    /**
     * The failure this whole gate exists for, in the order it actually happens.
     *
     * <p>Installing an APK over an older one keeps {@code filesDir}, so a phone that was running a
     * bundle compiled for the previous mount prefix comes up with {@code state.json} still pointing
     * at it. Every other check passes: the tree is intact, the manifest agrees with it, and the
     * bundle's {@code minShellVersion} is <em>older</em> than this shell, so that gate waves it
     * through. Served anyway, the document loads and every asset under it 404s - a white screen
     * the rollback gate cannot see, because the page did load.
     */
    @Test public void aBundleBuiltForAnotherBasePathIsNotServedAfterAnInPlaceUpgrade()
            throws Exception {
        runningOnTheOldShell();

        WebBundle bundle = upgradedShellLaunch();

        assertTrue("a bundle compiled for another prefix must not be served", bundle.isBaseline());
        assertEquals(BASELINE, bundle.version);
        assertEquals(BASELINE, latestStore.activeVersion());
        assertTrue(latestStore.diagnostics().lastRollbackReason,
                latestStore.diagnostics().lastRollbackReason.contains(TestBundles.BASE_PATH));
    }

    /**
     * And its 80 MiB goes back to the wearer - but only once the pointers have moved off it.
     *
     * <p>No new deletion path: falling back leaves nothing pointing at the directory, and
     * {@link WebBundleStore#collectGarbage()} at the end of the launch deletes what no role points
     * at. The ordering inside {@code openForLaunch} is what makes that safe - the new pointers are
     * written to disk before anything is removed, so a process killed between the two comes back to
     * a phone on the baseline rather than one pointing at a directory that is now half deleted.
     */
    @Test public void theBundleLeftBehindIsReclaimed() throws Exception {
        runningOnTheOldShell();
        assertEquals("it really is on disk before the upgrade",
                1, launchAt(TestBundles.FOREIGN_BASE_PATH).installedVersions().size());

        upgradedShellLaunch();

        assertTrue("nothing points at it any more, so it is not kept",
                latestStore.installedVersions().isEmpty());
    }

    /**
     * Falling back off it is not held against the baseline.
     *
     * <p>The concern is real: the fallback clears {@code launchConfirmed} and the launch counter
     * keeps counting, so a wearer who never gets the page up - opens the app, backgrounds it -
     * could look like a baseline that will not run, and the baseline is the one bundle there is
     * nothing below. {@link WebBundleStore#rollbackIfLastLaunchNeverFinished} is why that cannot
     * happen: with no active version there is nothing to demote, and it resets the counter instead.
     */
    @Test public void fallingBackOffItIsNotCountedAgainstTheBaseline() throws Exception {
        runningOnTheOldShell();

        // Three launches in a row, none of them ever reaching onPageFinished - twice over
        // MAX_UNCONFIRMED_LAUNCHES.
        for (int launch = 0; launch < 3; launch++) {
            WebBundleStore store = launch();
            assertTrue("still the baseline, launch " + launch, store.openForLaunch().isBaseline());
            assertEquals(BASELINE, store.activeVersion());
            latestStore = store;
        }
        assertFalse("the baseline is never reported as having failed to launch",
                latestStore.diagnostics().lastRollbackReason.contains("APK 內建版本載入失敗"));
    }

    /** The other half: a bundle built for this shell's own prefix is not swept up by the check. */
    @Test public void aBundleBuiltForThisShellsBasePathKeepsRunning() throws Exception {
        WebBundleStore first = launch();
        first.openForLaunch();
        stage(first, V1);

        WebBundleStore promoted = launch();
        assertEquals(V1, promoted.openForLaunch().version);
        promoted.markLaunchSucceeded();

        // A third launch, so the check runs against an already-active bundle rather than one
        // being promoted - the path a phone spends every launch after an update in.
        WebBundleStore third = launch();
        WebBundle bundle = third.openForLaunch();

        assertFalse("its prefix is this shell's, so it is not discarded", bundle.isBaseline());
        assertEquals(V1, bundle.version);
        assertEquals(1, third.installedVersions().size());
    }

    // ------------------------------------------------------------------ helpers

    /** The store the most recent simulated launch used, for asserting on after the fact. */
    private WebBundleStore latestStore;

    /** The phone as the migration finds it: an older shell, running a bundle built for its path. */
    private void runningOnTheOldShell() throws Exception {
        WebBundleStore first = launchAt(TestBundles.FOREIGN_BASE_PATH);
        first.openForLaunch();
        TestBundles.install(first, V1, TestBundles.completeBuild(TestBundles.FOREIGN_BASE_PATH),
                TestBundles.BASELINE_SHELL);
        first.stagePending(V1, moveAside(first, V1));

        WebBundleStore running = launchAt(TestBundles.FOREIGN_BASE_PATH);
        assertEquals("the old shell ran it perfectly well", V1, running.openForLaunch().version);
        running.markLaunchSucceeded();
    }

    /** The APK replaced without an uninstall: same root, same state file, a different prefix. */
    private WebBundle upgradedShellLaunch() {
        latestStore = launch();
        return latestStore.openForLaunch();
    }

    /** Stages a freshly published bundle the way the updater does: verified tree, then a rename. */
    private void stage(WebBundleStore store, String version) throws Exception {
        TestBundles.install(store, version);
        store.stagePending(version, moveAside(store, version));
    }

    /**
     * {@link WebBundleStore#stagePending} expects a tree in staging and renames it into place, so
     * a test that wrote straight into the versions directory has to hand it one.
     */
    private File moveAside(WebBundleStore store, String version) {
        File staged = new File(store.stagingDirectory(), "unpack-" + version);
        WebBundleStore.deleteRecursively(staged);
        assertTrue(store.versionDirectory(version).renameTo(staged));
        return staged;
    }

    /** Two releases installed and promoted, so the phone is running V2 with V1 behind it. */
    private void installAndPromote(String older, String newer) throws Exception {
        WebBundleStore first = launch();
        first.openForLaunch();
        stage(first, older);

        WebBundleStore second = launch();
        assertEquals(older, second.openForLaunch().version);
        second.markLaunchSucceeded();
        stage(second, newer);

        WebBundleStore third = launch();
        assertEquals(newer, third.openForLaunch().version);
        third.markLaunchSucceeded();
        assertNotNull(third.diagnostics());
    }

    /** Used by the incomplete-bundle case above; kept here so the intent is visible. */
    @SuppressWarnings("unused")
    private static Map<String, byte[]> build() {
        return TestBundles.completeBuild();
    }
}
