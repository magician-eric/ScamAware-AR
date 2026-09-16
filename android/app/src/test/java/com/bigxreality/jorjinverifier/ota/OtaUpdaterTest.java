package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertArrayEquals;
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
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * The over-the-air update, end to end, against a real HTTP server.
 *
 * <p>A real server and not a stubbed transport, because most of what this mechanism has to survive
 * is what HTTP does when things go wrong, and a stub only ever does what its author imagined: a
 * connection that dies half way through 80 MiB, a venue portal answering 200 with a login page, a
 * server that is simply not there. Each of those is set up here as the thing itself.
 *
 * <p>Test names map to the acceptance list: B (the running bundle opens immediately while the new
 * one downloads), C (the network drops mid-download), D (digest mismatch), J (Wi-Fi with no
 * internet), K (a bundle that needs a newer shell).
 */
public class OtaUpdaterTest {

    private static final String BASELINE = "1.0.0-20260824.001";
    private static final String V1 = "1.0.0-20260825.001";
    private static final String V2 = "1.0.1-20260825.002";

    private File root;
    private File publishDir;
    private TestHttpServer server;
    /** Where the test server actually listens. */
    private String loopback;

    /**
     * The https origin every URL in these tests is written against.
     *
     * <p>The shipping code refuses a bundle URL that is not https, on purpose - so a test that
     * published {@code http://127.0.0.1:41234/bundle.zip} would only ever exercise that refusal.
     * The published pointer names this origin, and {@link TestHttp} is what turns it into a
     * loopback request: the parser, the decision and the verification all see exactly what they
     * would in production, and only the socket is local.
     */
    private static final String HTTPS_ORIGIN = "https://ota.test";
    private static final String LATEST_URL = HTTPS_ORIGIN + "/ota/latest.json";

    /** What the server answers for latest.json, and what it does with a bundle request. */
    private final AtomicReference<String> latestBody = new AtomicReference<>("");
    private final AtomicReference<File> bundleFile = new AtomicReference<>(null);
    private final AtomicInteger latestStatus = new AtomicInteger(200);
    private final AtomicInteger latestHits = new AtomicInteger();
    private final AtomicInteger bundleHits = new AtomicInteger();
    /** > 0 to stop sending after that many bytes, with the connection simply closing. */
    private final AtomicInteger cutOffAfterBytes = new AtomicInteger();
    /** How many latest.json requests to fail before answering properly. */
    private final AtomicInteger failLatestTimes = new AtomicInteger();
    /** > 0 to dribble the bundle out in chunks of that size, so a download stays in flight. */
    private final AtomicInteger throttleBundleBytesPerWrite = new AtomicInteger();
    /**
     * When set, the bundle response stops one byte short of the end and waits on this before
     * finishing - so a test can require the download to still be running while it does something
     * else, instead of racing it and hoping.
     */
    private final AtomicReference<CountDownLatch> holdBundleUntil = new AtomicReference<>();

    private final StringBuilder log = new StringBuilder();

    @Before public void setUp() throws IOException {
        root = Files.createTempDirectory("cibar-ota").toFile();
        publishDir = new File(root, "published");
        //noinspection ResultOfMethodCallIgnored
        publishDir.mkdirs();

        server = new TestHttpServer(this::serve);
        loopback = server.origin();
    }

    @After public void tearDown() {
        if (server != null) server.close();
        WebBundleStore.deleteRecursively(root);
    }

    /** The whole update server: the pointer file, the archive, and every way both can go wrong. */
    private void serve(String path, OutputStream out) throws IOException {
        if (path.startsWith("/ota/latest.json")) {
            latestHits.incrementAndGet();
            if (failLatestTimes.getAndDecrement() > 0) {
                TestHttpServer.respondEmpty(out, 503);
                return;
            }
            TestHttpServer.respond(out, latestStatus.get(), "application/json",
                    latestBody.get().getBytes(StandardCharsets.UTF_8));
            return;
        }
        if (path.startsWith("/bundle.zip")) {
            bundleHits.incrementAndGet();
            File file = bundleFile.get();
            if (file == null) {
                TestHttpServer.respondEmpty(out, 404);
                return;
            }
            byte[] body = Files.readAllBytes(file.toPath());
            int cut = cutOffAfterBytes.get();
            if (cut > 0) {
                // Announce the full length and then stop sending - exactly what a phone walking
                // out of Wi-Fi range looks like from the other end of a socket.
                TestHttpServer.respondTruncated(out, body, cut);
                return;
            }
            CountDownLatch hold = holdBundleUntil.get();
            if (hold != null) {
                // Everything but the last byte, then wait. The download cannot finish until the
                // test says so, which is what makes the overlap a fact rather than a race.
                TestHttpServer.respondTruncated(out, body, body.length - 1);
                try {
                    if (!hold.await(60, TimeUnit.SECONDS)) return;
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    return;
                }
                out.write(body, body.length - 1, 1);
                out.flush();
                return;
            }
            int chunk = throttleBundleBytesPerWrite.get();
            if (chunk > 0) {
                TestHttpServer.respondThrottled(out, body, chunk);
                return;
            }
            TestHttpServer.respond(out, 200, "application/zip", body);
            return;
        }
        TestHttpServer.respondEmpty(out, 404);
    }

    private WebBundleStore store() {
        return new WebBundleStore(new File(root, "webbundle"), BASELINE,
                TestBundles.BASELINE_SHELL, TestBundles.BASE_PATH,
                message -> log.append(message).append('\n'),
                () -> 1_700_000_000_000L);
    }

    /** The updater, pointed at this test's server, with the backoff sleeps skipped. */
    private OtaUpdater updater(WebBundleStore store) {
        return updater(store, new TestHttp(loopback), TestBundles.BASELINE_SHELL);
    }

    private OtaUpdater updater(WebBundleStore store, OtaHttp http, String shellVersion) {
        return new OtaUpdater(store, http, LATEST_URL, shellVersion,
                message -> log.append(message).append('\n'), millis -> { }, () -> false);
    }

    /**
     * The shipping {@link OtaHttp.UrlConnection}, with {@link #HTTPS_ORIGIN} pointed at the test
     * server - a stand-in for DNS and TLS, and nothing else. The timeouts, the declared-length
     * check, the truncation check and the socket itself are all the real implementation.
     */
    private static final class TestHttp implements OtaHttp {
        private final OtaHttp real = new OtaHttp.UrlConnection("CIBAR-Shell/test");
        private final String target;

        TestHttp(String target) {
            this.target = target;
        }

        private String resolve(String url) {
            return url.startsWith(HTTPS_ORIGIN) ? target + url.substring(HTTPS_ORIGIN.length()) : url;
        }

        @Override public String getText(String url) throws IOException {
            return real.getText(resolve(url));
        }

        @Override public void download(String url, File target, long expectedBytes,
                                       Cancellation cancellation) throws IOException {
            real.download(resolve(url), target, expectedBytes, cancellation);
        }
    }

    /** Publishes a release on the test server, and rewrites latest.json to point at it. */
    private TestBundles.Release publish(String version) throws IOException {
        return publish(version, TestBundles.BASELINE_SHELL);
    }

    private TestBundles.Release publish(String version, String minShellVersion)
            throws IOException {
        TestBundles.Release release = TestBundles.publish(publishDir, version,
                TestBundles.completeBuild(), minShellVersion);
        bundleFile.set(release.archive);
        latestBody.set(release.latestJson(HTTPS_ORIGIN + "/bundle.zip", minShellVersion));
        return release;
    }

    // ------------------------------------------------------------------ the base path gate

    /**
     * A published bundle built for another mount prefix is fetched, refused, and thrown away.
     *
     * <p>The refusal happens after the download, because nothing before it can see the problem: the
     * pointer file is honest, the digest matches, and the archive is a complete build. What the
     * check costs is one wasted download; what it buys is that the phone never points at it.
     */
    @Test public void aBundleBuiltForAnotherBasePathIsDiscardedAndTheRunningOneKeptGoing()
            throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);

        TestBundles.Release release = TestBundles.publish(publishDir, V2,
                TestBundles.completeBuild(TestBundles.FOREIGN_BASE_PATH),
                TestBundles.BASELINE_SHELL);
        bundleFile.set(release.archive);
        latestBody.set(release.latestJson(HTTPS_ORIGIN + "/bundle.zip",
                TestBundles.BASELINE_SHELL));

        OtaUpdater.Result result = updater(store).runOnce();

        assertEquals(OtaUpdater.Outcome.FAILED, result.outcome);
        assertEquals("the wearer's session is exactly what it was", V1, store.activeVersion());
        assertNull("and nothing is waiting to take over at the next launch",
                store.pendingVersion());
        assertTrue(store.diagnostics().lastUpdateError,
                store.diagnostics().lastUpdateError.contains(TestBundles.BASE_PATH));
        assertFalse("the rejected bundle is not left on disk",
                store.installedVersions().contains(V2));
    }

    // ------------------------------------------------------------------ Test B

    /**
     * Test B. The phone is running v1; v2 is published. v1 keeps running, v2 downloads, and v2
     * does not become active until the next launch.
     */
    @Test public void aNewerBundleIsDownloadedWhileTheRunningOneStaysUntouched() throws Exception {
        WebBundleStore store = store();
        WebBundle running = promoteInstalled(store, V1);
        assertEquals(V1, running.version);

        publish(V2);
        OtaUpdater.Result result = updater(store).runOnce();

        assertEquals(OtaUpdater.Outcome.STAGED, result.outcome);
        assertEquals(V2, result.version);
        assertEquals("the running bundle is exactly what it was", V1, store.activeVersion());
        assertEquals(V1, store.activeBundle().version);
        assertEquals(V2, store.pendingVersion());
        // And the file the wearer is watching right now is still the one they started with.
        assertTrue(new File(store.versionDirectory(V1), "assets/scenarios/clip.mp4").isFile());
    }

    /** Nothing published above what the phone has: no download at all. */
    @Test public void anUpToDatePhoneDownloadsNothing() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V2);

        publish(V2);
        OtaUpdater.Result result = updater(store).runOnce();

        assertEquals(OtaUpdater.Outcome.UP_TO_DATE, result.outcome);
        assertEquals("not one byte of the bundle was fetched", 0, bundleHits.get());
        assertNull(store.pendingVersion());
    }

    /** And a bundle already staged is not fetched a second time on the next check. */
    @Test public void aBundleAlreadyStagedIsNotDownloadedAgain() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        publish(V2);

        assertEquals(OtaUpdater.Outcome.STAGED, updater(store).runOnce().outcome);
        int afterFirst = bundleHits.get();
        assertEquals(OtaUpdater.Outcome.ALREADY_STAGED, updater(store).runOnce().outcome);

        assertEquals("80 MiB is not fetched twice to reach a state we are already in",
                afterFirst, bundleHits.get());
    }

    // ------------------------------------------------------------------ Test C

    /**
     * Test C. The network drops half way through the download.
     *
     * <p>The staged copy is scratch and is deleted; the running bundle is untouched; the wearer
     * learns nothing. The next launch tries again from the beginning.
     */
    @Test public void aDownloadThatDiesHalfWayLeavesTheRunningBundleAlone() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);

        TestBundles.Release release = publish(V2);
        cutOffAfterBytes.set((int) (release.archive.length() / 2));

        OtaUpdater.Result result = updater(store).runOnce();

        assertEquals(OtaUpdater.Outcome.UNREACHABLE, result.outcome);
        assertEquals("the running bundle is exactly what it was", V1, store.activeVersion());
        assertNull("nothing half-downloaded is waiting for the next launch", store.pendingVersion());
        assertFalse("and the partial file is gone", new File(root, "webbundle/staging").exists());
        assertTrue(store.diagnostics().lastUpdateError.contains("中斷")
                || store.diagnostics().lastUpdateError.contains("下載"));

        // The next attempt, with the network back, simply succeeds.
        cutOffAfterBytes.set(0);
        assertEquals(OtaUpdater.Outcome.STAGED, updater(store).runOnce().outcome);
        assertEquals(V2, store.pendingVersion());
    }

    /** Test D again, from the updater's side: a bundle whose digest is wrong is thrown away. */
    @Test public void aBundleThatFailsItsDigestIsDiscardedAndTheRunningOneKeptGoing()
            throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);

        TestBundles.Release release = publish(V2);
        // The published digest says one thing, the served archive is another - a re-encoded
        // response, a corrupted mirror, a stale digest beside a rebuilt archive.
        latestBody.set(latestBody.get().replace(release.sha256,
                "0000000000000000000000000000000000000000000000000000000000000000"));

        OtaUpdater.Result result = updater(store).runOnce();

        assertEquals(OtaUpdater.Outcome.FAILED, result.outcome);
        assertEquals(V1, store.activeVersion());
        assertNull(store.pendingVersion());
        assertTrue(store.diagnostics().lastUpdateError.contains("SHA-256"));
        assertFalse("the rejected bundle is not left on disk",
                store.installedVersions().contains(V2));
    }

    // ------------------------------------------------------------------ Test I

    /**
     * Test I. The wearer plays a scenario video off local storage while the update downloads.
     *
     * <p>The two halves of this are the thing being asserted: an 80 MiB download runs on one
     * thread, and on another the page reads its videos, its image targets and its document out of
     * the active bundle - the whole time, byte for byte, with no stall and no interference. The
     * update writes only into staging and touches nothing the wearer is reading.
     *
     * <p>The download is deliberately slowed to a trickle so it is genuinely still in flight while
     * hundreds of reads go through, rather than finishing before the first one starts.
     */
    @Test public void videosPlayFromTheActiveBundleWhileAnUpdateDownloads() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        publish(V2);

        // The download is held one byte short of complete until the reads below have all happened.
        // The first version of this test threw 400 reads at a throttled download and then asserted
        // that at least 100 had landed before it finished - which is a race, and it duly passed on
        // a slow laptop and failed on a fast CI runner. Nothing about the property being tested
        // needs a race: what has to be true is that serving the wearer's files keeps working while
        // a download is in flight, so the test makes the download stay in flight.
        CountDownLatch readsDone = new CountDownLatch(1);
        holdBundleUntil.set(readsDone);

        WebBundleResponder page = new WebBundleResponder(
                new BundleContent.Directory(store.versionDirectory(V1)), OtaLog.NONE);
        Map<String, byte[]> expected = TestBundles.completeBuild();

        AtomicReference<OtaUpdater.Result> updateResult = new AtomicReference<>();
        Thread download = new Thread(() -> updateResult.set(updater(store).runOnce()), "ota");
        download.start();

        // Everything a scenario touches, over and over, with the download demonstrably unfinished.
        String[] paths = {
                "media/stings/outro.mp4", "assets/scenarios/clip.mp4",
                "assets/scenarios/voice.mp3", "assets/targets.mind", "index.html"};
        int reads = 0;
        for (int round = 0; round < 40; round++) {
            for (String path : paths) {
                WebBundleResponder.Response response = page.respondTo("/" + path);
                assertEquals(path + " must still be served while an update downloads",
                        200, response.status);
                assertEquals(path, expected.get(path).length, response.contentLength);
                assertArrayEquals(path + " must come back byte for byte", expected.get(path),
                        readFully(response));
                reads++;
            }
        }

        assertTrue("the download must still be running - the server is holding it open",
                download.isAlive());
        readsDone.countDown();
        download.join(60_000);

        assertEquals(paths.length * 40, reads);
        assertEquals(OtaUpdater.Outcome.STAGED, updateResult.get().outcome);
        assertEquals("and the wearer's session is still on the bundle it started on",
                V1, store.activeVersion());
        assertEquals(V2, store.pendingVersion());
        assertEquals(V1, store.activeBundle().version);
    }

    // ------------------------------------------------------------------ Test J

    /**
     * Test J. Wi-Fi is connected and the internet is not reachable - the state
     * {@code navigator.onLine} reports as "online", which is why nothing here asks it.
     *
     * <p>Two shapes, because they fail at different layers: a venue portal that answers 200 with a
     * login page, and a server that is simply not there.
     */
    @Test public void aCaptivePortalIsNotAnUpdateServer() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);

        latestBody.set("<!doctype html><title>Sign in to Guest Wi-Fi</title>");
        OtaUpdater.Result result = updater(store).runOnce();

        assertEquals(OtaUpdater.Outcome.REJECTED, result.outcome);
        assertEquals("and the experience carries on, on the bundle it has", V1, store.activeVersion());
        assertEquals(0, bundleHits.get());
        assertTrue(store.diagnostics().lastUpdateError.contains("無法解讀"));
    }

    @Test public void anUpdateServerThatIsNotThereIsNotAnError() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);

        OtaUpdater.Result result = updater(store,
                new TestHttp("http://127.0.0.1:" + closedPort()), TestBundles.BASELINE_SHELL)
                .runOnce();

        assertEquals(OtaUpdater.Outcome.UNREACHABLE, result.outcome);
        assertEquals(V1, store.activeVersion());
        assertNull(store.pendingVersion());
    }

    /** A transient failure is retried; three of them is a network that is not going to answer. */
    @Test public void oneBadResponseIsRetriedAndTheNextOneSucceeds() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        publish(V2);
        failLatestTimes.set(2);

        OtaUpdater.Result result = updater(store).runOnce();

        assertEquals(OtaUpdater.Outcome.STAGED, result.outcome);
        assertEquals(3, latestHits.get());
    }

    @Test public void retriesAreBoundedRatherThanEndless() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        failLatestTimes.set(Integer.MAX_VALUE);

        assertEquals(OtaUpdater.Outcome.UNREACHABLE, updater(store).runOnce().outcome);
        assertEquals("three attempts, and then it waits for the next launch",
                OtaUpdater.RETRY_BACKOFF_MILLIS.length, latestHits.get());
    }

    // ------------------------------------------------------------------ Test K

    /**
     * Test K. A published bundle that needs a newer native shell is not downloaded at all.
     *
     * <p>Not downloaded, not merely refused after the fact: 80 MiB fetched to be thrown away is a
     * phone's data allowance spent on nothing, every launch, until somebody ships a new APK.
     */
    @Test public void aBundleThatNeedsANewerShellIsNeverFetched() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);

        publish(V2, TestBundles.NEWER_SHELL);
        OtaUpdater.Result result = updater(store, new TestHttp(loopback),
                TestBundles.BASELINE_SHELL).runOnce();

        assertEquals(OtaUpdater.Outcome.SHELL_TOO_OLD, result.outcome);
        assertEquals(0, bundleHits.get());
        assertEquals(V1, store.activeVersion());
        assertNull(store.pendingVersion());
        assertTrue(store.diagnostics().lastUpdateError,
                store.diagnostics().lastUpdateError.contains(TestBundles.NEWER_SHELL));
        assertTrue(store.diagnostics().lastUpdateError,
                store.diagnostics().lastUpdateError.contains(TestBundles.BASELINE_SHELL));
        // The check still happened, so diagnostics can say what is out there and why it is not
        // being taken - which is the difference between "not updating" and "not updating because".
        assertEquals(V2, store.diagnostics().latestRemoteVersion);
    }

    // ------------------------------------------------------------------ the pointer itself

    /**
     * A pointer that is not https is refused, and the bundle is never even requested.
     *
     * <p>The digest is what makes an update safe either way; this is what keeps a downgraded or
     * intercepted request from being attempted at all, by an app that otherwise never speaks plain
     * http for anything.
     */
    @Test public void aBundleUrlThatIsNotHttpsIsRefused() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        TestBundles.Release release = publish(V2);
        assertNotNull(release);
        latestBody.set(latestBody.get().replace(HTTPS_ORIGIN, "http://ota.test"));

        OtaUpdater.Result result = updater(store).runOnce();

        assertEquals(OtaUpdater.Outcome.REJECTED, result.outcome);
        assertTrue(store.diagnostics().lastUpdateError.contains("https"));
        assertEquals(0, bundleHits.get());
    }

    /** A version that is not the published format is refused before anything is fetched. */
    @Test public void aVersionThatIsNotThePublishedFormatIsRefused() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        publish(V2);
        latestBody.set(latestBody.get().replace(V2, "99999999"));

        assertEquals(OtaUpdater.Outcome.REJECTED, updater(store).runOnce().outcome);
        assertEquals(0, bundleHits.get());
    }

    // ------------------------------------------------------------------ helpers

    /** The updater with a phase recorder attached, for the staff mode's two buttons. */
    private OtaUpdater updater(WebBundleStore store, List<String> phases) {
        return new OtaUpdater(store, new TestHttp(loopback), LATEST_URL,
                TestBundles.BASELINE_SHELL, message -> log.append(message).append('\n'),
                millis -> { }, () -> false,
                (phase, detail, version) -> phases.add(phase));
    }

    // ------------------------------------------------------------------ the staff mode's buttons
    //
    // 工作人員管理模式 gained two controls a launch never had: 檢查更新, which costs a few hundred
    // bytes and answers a question, and 下載更新, which the operator opts into knowing what it is
    // for. Both go through the code above - the same request, the same UpdateDecision, the same
    // verification - because a second implementation of "is there an update" would be a second
    // answer, and the two would disagree exactly when it mattered.

    /** A. Nothing newer published: said plainly, and not one byte of a bundle fetched. */
    @Test public void aManualCheckOnAnUpToDatePhoneSaysSoAndFetchesNothing() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V2);
        publish(V2);
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).checkOnly();

        assertEquals(OtaUpdater.Outcome.UP_TO_DATE, result.outcome);
        assertEquals(0, bundleHits.get());
        assertEquals(Arrays.asList(OtaPhase.CHECKING, OtaPhase.UP_TO_DATE), phases);
    }

    /**
     * B. Something newer is published: reported, and still not downloaded.
     *
     * <p>The split is the whole point of the check button. A staff member finding out there is an
     * 80 MiB update available is a different event from that update being fetched, and at a venue
     * on a phone's hotspot the second one is a decision somebody wants to make deliberately.
     */
    @Test public void aManualCheckReportsANewVersionWithoutFetchingIt() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        publish(V2);
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).checkOnly();

        assertEquals(OtaUpdater.Outcome.UPDATE_AVAILABLE, result.outcome);
        assertEquals(V2, result.version);
        assertEquals("checking is not downloading", 0, bundleHits.get());
        assertNull(store.pendingVersion());
        assertEquals(V1, store.activeVersion());
        assertEquals(Arrays.asList(OtaPhase.CHECKING, OtaPhase.UPDATE_AVAILABLE), phases);
        assertEquals("and the screen can name what it found", V2,
                store.diagnostics().latestRemoteVersion);
    }

    /**
     * C/D. No answer from the update server - no network, a portal, a 404, a server that is down.
     *
     * <p>One attempt, not three. The launch-time check retries because nobody is waiting on it;
     * somebody pressing a button is waiting on it, and ten seconds of invisible backoff on top of
     * the HTTP timeouts is indistinguishable from a frozen button. Pressing it again is the same
     * three attempts with a person deciding between them.
     */
    @Test public void aManualCheckWithNoAnswerReportsNoNetworkAfterOneAttempt() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        failLatestTimes.set(Integer.MAX_VALUE);
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).checkOnly();

        assertEquals(OtaUpdater.Outcome.UNREACHABLE, result.outcome);
        assertEquals("one attempt, because a person is waiting", 1, latestHits.get());
        assertEquals(Arrays.asList(OtaPhase.CHECKING, OtaPhase.OFFLINE), phases);
        assertEquals("and the phone carries on with what it has", V1, store.activeVersion());
    }

    /** D. A 404 where latest.json should be is the same answer, and equally not an error. */
    @Test public void aManualCheckAgainstAMissingPointerFileIsNotAnError() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        latestStatus.set(404);
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).checkOnly();

        assertEquals(OtaUpdater.Outcome.UNREACHABLE, result.outcome);
        assertEquals(OtaPhase.OFFLINE, phases.get(phases.size() - 1));
        assertEquals(V1, store.activeVersion());
    }

    /** G. The whole manual path: check, download, verify, staged for the next launch. */
    @Test public void aManualDownloadStagesTheNewBundleForTheNextLaunch() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        publish(V2);
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).downloadNow();

        assertEquals(OtaUpdater.Outcome.STAGED, result.outcome);
        assertEquals(V2, store.pendingVersion());
        assertEquals("this session keeps the bundle it started on", V1, store.activeVersion());
        assertEquals(V1, store.activeBundle().version);
        assertEquals(Arrays.asList(OtaPhase.CHECKING, OtaPhase.DOWNLOADING, OtaPhase.VERIFYING,
                OtaPhase.READY_FOR_RESTART), phases);
    }

    /** E. The download dies half way: reported as a network problem, nothing else changes. */
    @Test public void aManualDownloadThatDiesReportsItAndChangesNothing() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        TestBundles.Release release = publish(V2);
        cutOffAfterBytes.set(Math.max(1, (int) (release.archive.length() / 2)));
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).downloadNow();

        assertEquals(OtaUpdater.Outcome.UNREACHABLE, result.outcome);
        assertEquals(V1, store.activeVersion());
        assertNull(store.pendingVersion());
        assertEquals(Arrays.asList(OtaPhase.CHECKING, OtaPhase.DOWNLOADING, OtaPhase.OFFLINE),
                phases);
    }

    /** F. A bundle whose digest is wrong never reaches the pending slot, manually or otherwise. */
    @Test public void aManualDownloadWithTheWrongDigestFailsAndKeepsTheActiveBundle()
            throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        TestBundles.Release release = publish(V2);
        latestBody.set(latestBody.get().replace(release.sha256,
                "0000000000000000000000000000000000000000000000000000000000000000"));
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).downloadNow();

        assertEquals(OtaUpdater.Outcome.FAILED, result.outcome);
        assertEquals(V1, store.activeVersion());
        assertNull(store.pendingVersion());
        assertTrue(store.diagnostics().lastUpdateError.contains("SHA-256"));
        assertEquals(Arrays.asList(OtaPhase.CHECKING, OtaPhase.DOWNLOADING, OtaPhase.VERIFYING,
                OtaPhase.FAILED), phases);
    }

    /**
     * A bundle that needs a newer APK Shell reports exactly that, rather than "up to date".
     *
     * <p>The distinction only exists on a screen somebody reads. A venue whose glasses are stuck
     * on an old APK needs to be told to reinstall it; "已是最新版本" is true, useless, and would
     * send them looking in the wrong place.
     */
    @Test public void aManualCheckSaysWhenTheShellIsTheThingThatIsTooOld() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        publish(V2, "9.9.9");
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).checkOnly();

        assertEquals(OtaUpdater.Outcome.SHELL_TOO_OLD, result.outcome);
        assertEquals(Arrays.asList(OtaPhase.CHECKING, OtaPhase.SHELL_TOO_OLD), phases);
        assertEquals(0, bundleHits.get());
    }

    /** A version already staged is not fetched again just because somebody pressed a button. */
    @Test public void aManualCheckWithSomethingAlreadyStagedSaysItIsReady() throws Exception {
        WebBundleStore store = store();
        promoteInstalled(store, V1);
        publish(V2);
        assertEquals(OtaUpdater.Outcome.STAGED, updater(store).runOnce().outcome);
        int afterFirst = bundleHits.get();
        List<String> phases = new ArrayList<>();

        OtaUpdater.Result result = updater(store, phases).downloadNow();

        assertEquals(OtaUpdater.Outcome.ALREADY_STAGED, result.outcome);
        assertEquals(afterFirst, bundleHits.get());
        assertEquals(Arrays.asList(OtaPhase.CHECKING, OtaPhase.READY_FOR_RESTART), phases);
    }

    /**
     * Puts the store in the state a phone that already updated once is in: running {@code version},
     * confirmed, with nothing pending.
     *
     * <p>The first {@code openForLaunch()} comes before the install, not after. Opening a store
     * collects garbage - anything no role points at is deleted - so a bundle written into
     * versions/ and then opened over would be swept away before it could be staged, which is
     * exactly the right behaviour and exactly the wrong order for a fixture.
     */
    private WebBundle promoteInstalled(WebBundleStore store, String version) throws IOException {
        store.openForLaunch();
        TestBundles.install(store, version);
        File staged = new File(store.stagingDirectory(), "unpack");
        WebBundleStore.deleteRecursively(staged);
        assertTrue(store.versionDirectory(version).renameTo(staged));
        try {
            store.stagePending(version, staged);
        } catch (OtaException impossible) {
            throw new IOException(impossible);
        }
        WebBundle bundle = store.openForLaunch();
        store.markLaunchSucceeded();
        return bundle;
    }

    private static byte[] readFully(WebBundleResponder.Response response) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (InputStream body = response.body) {
            byte[] buffer = new byte[8192];
            for (int read = body.read(buffer); read >= 0; read = body.read(buffer)) {
                out.write(buffer, 0, read);
            }
        }
        return out.toByteArray();
    }

    /** A port nothing is listening on - "connected to Wi-Fi, nothing at the other end". */
    private static int closedPort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            return socket.getLocalPort();
        }
    }
}
