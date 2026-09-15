package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * What it takes for a downloaded archive to become a bundle this phone will run - and the much
 * longer list of things that stop it.
 *
 * <p>Everything here happens in a scratch directory. The point of each test is not only that a bad
 * archive is rejected, but that rejecting it costs nothing: the active bundle is never a
 * participant, so a wearer mid-scenario cannot be affected by any of it.
 *
 * <p>Test D of the acceptance list - a bundle whose SHA-256 does not match is refused - is
 * {@link #anArchiveThatDoesNotMatchItsDigestIsRefused()}.
 */
public class BundleInstallerTest {

    private static final String VERSION = "1.0.1-20260825.002";

    private File scratch;

    @Before public void setUp() throws IOException {
        scratch = Files.createTempDirectory("cibar-installer").toFile();
    }

    @After public void tearDown() {
        WebBundleStore.deleteRecursively(scratch);
    }

    private File unpackDir() {
        return new File(scratch, "unpack");
    }

    // ------------------------------------------------------------------ the happy path

    @Test public void acompleteArchiveUnpacksAndVerifies() throws Exception {
        TestBundles.Release release = TestBundles.publish(scratch, VERSION);

        OtaManifest manifest = BundleInstaller.unpackAndVerify(release.archive, release.sha256,
                VERSION, unpackDir(), TestBundles.BASELINE_SHELL, OtaLog.NONE);

        assertEquals(VERSION, manifest.version);
        assertEquals("index.html", manifest.entry);
        assertEquals(release.files.size(), manifest.files.size());
        for (Map.Entry<String, byte[]> file : release.files.entrySet()) {
            File unpacked = new File(unpackDir(), file.getKey());
            assertTrue(file.getKey() + " should have been unpacked", unpacked.isFile());
            assertEquals(file.getKey() + " should be byte-identical",
                    file.getValue().length, unpacked.length());
        }
        // The opening film travels like everything else - it is public/ content, not a special case.
        assertTrue(new File(unpackDir(), "media/stings/outro.mp4").isFile());
    }

    // ------------------------------------------------------------------ Test D: digest mismatch

    /**
     * Test D. The digest is checked before a single byte is unpacked.
     *
     * <p>This is the check that catches everything the network can do to a download: a truncation
     * that the HTTP layer did not notice, a captive portal's HTML served with a 200, a proxy that
     * re-encoded the body. All of them arrive looking like a file.
     */
    @Test public void anArchiveThatDoesNotMatchItsDigestIsRefused() throws Exception {
        TestBundles.Release release = TestBundles.publish(scratch, VERSION);
        String wrongDigest = release.sha256.replace('a', 'b').replace('0', '1');

        try {
            BundleInstaller.unpackAndVerify(release.archive, wrongDigest, VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("an archive that does not match its published digest must not be installed");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(), refused.getMessage().contains("SHA-256"));
        }
        assertFalse("nothing may be unpacked before the digest is checked", unpackDir().exists());
    }

    /** A download that stopped half way is the same failure, and fails at the same point. */
    @Test public void aTruncatedDownloadIsRefused() throws Exception {
        TestBundles.Release release = TestBundles.publish(scratch, VERSION);
        try (RandomAccessFile file = new RandomAccessFile(release.archive, "rw")) {
            file.setLength(release.archive.length() / 2);
        }

        try {
            BundleInstaller.unpackAndVerify(release.archive, release.sha256, VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("half an archive is not an archive");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(), refused.getMessage().contains("SHA-256"));
        }
    }

    // ------------------------------------------------------------------ the extraction gate

    /**
     * An archive that is intact and unpacks short. This is what a phone that runs out of storage
     * during an 80 MiB extraction leaves behind, and it is the one failure the archive's own digest
     * cannot see: the download was perfect.
     */
    @Test public void anExtractionThatDidNotFinishIsRefused() throws Exception {
        // Built by hand: a manifest that describes the whole build, and an archive missing one of
        // the files it describes - the same end state as an extraction that stopped.
        Map<String, byte[]> build = TestBundles.completeBuild();
        String manifestJson = TestBundles.manifestFor(VERSION, build, TestBundles.BASELINE_SHELL);
        Map<String, byte[]> short_ = new LinkedHashMap<>(build);
        short_.remove("assets/scenarios/clip.mp4");
        File archive = zip(new File(scratch, "short.zip"), short_, manifestJson);

        try {
            BundleInstaller.unpackAndVerify(archive, Digests.of(archive), VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("a bundle missing a file its own manifest lists is not installable");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(), refused.getMessage().contains("clip.mp4"));
        }
    }

    /** A file that is present, the right length, and not the right bytes. */
    @Test public void aFileWhoseContentsChangedIsRefused() throws Exception {
        Map<String, byte[]> build = TestBundles.completeBuild();
        String manifestJson = TestBundles.manifestFor(VERSION, build, TestBundles.BASELINE_SHELL);
        Map<String, byte[]> tampered = new LinkedHashMap<>(build);
        tampered.put("assets/app.js", TestBundles.filler(build.get("assets/app.js").length, (byte) 0x7a));
        File archive = zip(new File(scratch, "tampered.zip"), tampered, manifestJson);

        try {
            BundleInstaller.unpackAndVerify(archive, Digests.of(archive), VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("a file that does not match its digest must fail the install");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(), refused.getMessage().contains("assets/app.js"));
        }
    }

    /**
     * A bundle that unpacked perfectly and is not a CIBAR experience.
     *
     * <p>The manifest can only ever say what the publisher put in it, so a build that lost its
     * videos ships a manifest that cheerfully declares no videos and verifies as complete. The
     * shell holds its own idea of what a complete experience contains - see
     * {@link BundleRequirements} - which is the only version of this check that means anything.
     */
    @Test public void aBundleWithNoVideosIsNotACibarExperience() throws Exception {
        Map<String, byte[]> build = TestBundles.completeBuild();
        build.remove("assets/scenarios/clip.mp4");
        build.remove("media/stings/outro.mp4");
        TestBundles.Release release =
                TestBundles.publish(scratch, VERSION, build, TestBundles.BASELINE_SHELL);

        try {
            BundleInstaller.unpackAndVerify(release.archive, release.sha256, VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("a bundle with no video is not a complete experience");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(), refused.getMessage().contains("情境影片"));
        }
    }

    // ------------------------------------------------------------------ Test K: the shell gate

    /**
     * Test K. A bundle that needs a native bridge this shell does not have is refused outright.
     *
     * <p>Refusing is the whole point. Installing it would work: it would unpack, verify, promote
     * and load - and come up without a camera, which is the one failure the rollback gate cannot
     * see, because the page did load.
     */
    @Test public void aBundleThatNeedsANewerShellIsRefused() throws Exception {
        TestBundles.Release release = TestBundles.publish(scratch, VERSION,
                TestBundles.completeBuild(), TestBundles.NEWER_SHELL);

        try {
            BundleInstaller.unpackAndVerify(release.archive, release.sha256, VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("a bundle above this shell's version must not be installed");
        } catch (OtaException refused) {
            // The message names both numbers, because a diagnostics dump that says only
            // "too old" leaves the reader with the same question they started with.
            assertTrue(refused.getMessage(),
                    refused.getMessage().contains(TestBundles.NEWER_SHELL));
            assertTrue(refused.getMessage(),
                    refused.getMessage().contains(TestBundles.BASELINE_SHELL));
        }
    }

    // ------------------------------------------------------------------ hostile archives

    /**
     * A ZIP entry named {@code ../../…} is a legal archive entry and a file write outside the
     * sandbox. The name is refused rather than resolved and then checked, because resolving first
     * is the version of this that gets subtly wrong.
     */
    @Test public void anEntryThatWouldEscapeTheBundleIsRefused() throws Exception {
        Map<String, byte[]> build = TestBundles.completeBuild();
        build.put("../../escaped.txt", TestBundles.bytes("owned"));
        File archive = zip(new File(scratch, "evil.zip"), build,
                TestBundles.manifestFor(VERSION, TestBundles.completeBuild(), TestBundles.BASELINE_SHELL));

        try {
            BundleInstaller.unpackAndVerify(archive, Digests.of(archive), VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("zip slip must be refused");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(), refused.getMessage().contains("不合法的路徑"));
        }
        assertFalse(new File(scratch, "escaped.txt").exists());
        assertFalse(new File(unpackDir().getParentFile().getParentFile(), "escaped.txt").exists());
    }

    /** An archive with no manifest cannot be verified, so it is not installed. */
    @Test public void anArchiveWithNoManifestIsRefused() throws Exception {
        File archive = zip(new File(scratch, "bare.zip"), TestBundles.completeBuild(), null);

        try {
            BundleInstaller.unpackAndVerify(archive, Digests.of(archive), VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("without a manifest there is nothing to verify the tree against");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(),
                    refused.getMessage().contains(WebBundleStore.MANIFEST_ENTRY));
        }
    }

    /**
     * An archive whose manifest claims a different version than the pointer that led us to it.
     * Otherwise a stale or swapped archive could be installed under a newer number and then never
     * be superseded, because the phone believes it already has that version.
     */
    @Test public void anArchiveThatIsNotTheVersionWeAskedForIsRefused() throws Exception {
        TestBundles.Release release = TestBundles.publish(scratch, "1.0.0-20260101.001");

        try {
            BundleInstaller.unpackAndVerify(release.archive, release.sha256, VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("the archive must be the version latest.json said it was");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(), refused.getMessage().contains("1.0.0-20260101.001"));
        }
    }

    /** Not a ZIP at all - what a captive portal's login page looks like once it is on disk. */
    @Test public void somethingThatIsNotAnArchiveIsRefused() throws Exception {
        File notAZip = new File(scratch, "portal.zip");
        Files.write(notAZip.toPath(), TestBundles.bytes(
                "<!doctype html><title>Sign in to Guest Wi-Fi</title>"));

        try {
            BundleInstaller.unpackAndVerify(notAZip, Digests.of(notAZip), VERSION, unpackDir(),
                    TestBundles.BASELINE_SHELL, OtaLog.NONE);
            fail("an HTML page is not a bundle, whatever its digest is");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(),
                    refused.getMessage().contains("沒有任何檔案")
                            || refused.getMessage().contains("解壓縮失敗"));
        }
    }

    /** A zip with the given files, and optionally a manifest entry beside them. */
    private static File zip(File target, Map<String, byte[]> files, String manifestJson)
            throws IOException {
        Map<String, byte[]> all = new LinkedHashMap<>(files);
        if (manifestJson != null) {
            all.put(WebBundleStore.MANIFEST_ENTRY, TestBundles.bytes(manifestJson));
        }
        try (OutputStream out = new FileOutputStream(target);
             ZipOutputStream zip = new ZipOutputStream(out)) {
            for (Map.Entry<String, byte[]> file : all.entrySet()) {
                ZipEntry entry = new ZipEntry(file.getKey());
                entry.setTime(0L);
                zip.putNextEntry(entry);
                zip.write(file.getValue());
                zip.closeEntry();
            }
        }
        return target;
    }
}
