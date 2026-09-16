package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.After;
import org.junit.Assume;
import org.junit.Before;
import org.junit.Test;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.TimeUnit;

/**
 * The one place the publisher and the phone actually meet.
 *
 * <p>Every other test on either side proves that half agrees with itself. This one runs the real
 * publisher - {@code webapp/scripts/build-ota-release.mjs}, the same script the deploy workflow
 * runs - over a synthetic build, and then hands its output to the real installer, the same code the
 * phone runs. If the archive format, the digest, the manifest shape, the version format or the
 * pointer file ever drift apart, they drift apart here rather than on a phone that has already
 * downloaded 80 MiB.
 *
 * <p>Skipped, not failed, when Node is unavailable: this is a cross-language contract and half of
 * it is not present on a runner without a JavaScript toolchain. Every environment that publishes
 * has one.
 */
public class OtaPublisherContractTest {

    private static final String VERSION = "1.0.0-20260825.001";
    private static final String BUNDLE_URL = "https://example.test/web-1.0.0-20260825.001/bundle.zip";

    private File scratch;
    private File repositoryRoot;

    @Before public void setUp() throws IOException {
        repositoryRoot = findRepositoryRoot();
        Assume.assumeTrue("this test needs the webapp's publisher scripts",
                repositoryRoot != null);
        Assume.assumeTrue("this test needs Node on PATH", nodeIsAvailable());
        scratch = Files.createTempDirectory("cibar-publisher").toFile();
    }

    @After public void tearDown() {
        if (scratch != null) WebBundleStore.deleteRecursively(scratch);
    }

    /**
     * A release built by the real publisher installs on the phone, unchanged.
     *
     * <p>Nothing is re-implemented on either side of this: the ZIP is written by
     * {@code ota-zip.mjs} and read by {@code java.util.zip}, the digests are computed by Node's
     * {@code crypto} and re-computed by {@code MessageDigest}, and the manifest is written by
     * {@code ota-bundle.mjs} and parsed by {@link OtaManifest}.
     */
    @Test public void aReleaseTheRealPublisherProducesInstallsOnThePhone() throws Exception {
        File dist = new File(scratch, "dist");
        writeSyntheticBuild(dist);
        File out = new File(scratch, "release");

        run(repositoryRoot, "node", "webapp/scripts/build-ota-release.mjs",
                "--dist", dist.getAbsolutePath(),
                "--out", out.getAbsolutePath(),
                "--version", VERSION,
                "--bundle-url", BUNDLE_URL);

        File archive = new File(out, "bundle.zip");
        assertTrue("the publisher must produce bundle.zip", archive.isFile());
        assertTrue("...and manifest.json", new File(out, "manifest.json").isFile());
        assertTrue("...and sha256.txt", new File(out, "sha256.txt").isFile());
        assertTrue("...and latest.json", new File(out, "latest.json").isFile());

        // The pointer file, read by the shipping parser.
        OtaLatest latest = OtaLatest.parse(read(new File(out, "latest.json")));
        assertEquals(VERSION, latest.releaseId);
        // The semantic half travels beside the Release ID and has to agree with it - OtaLatest
        // refuses a pointer where they do not, so this is the publisher's half of that contract.
        assertEquals(BundleVersion.productVersionOf(VERSION), latest.version);
        assertEquals(BUNDLE_URL, latest.bundleUrl);
        assertEquals("2026-08-25", latest.releaseDate);
        // Whatever release/versions.json says, verbatim. Asserting a literal here would make
        // this test a second place the project's minShellVersion is written down, and the first
        // bump would fail it for being a bump rather than for a drift between publisher and phone.
        assertEquals(publishedMinShellVersion(), latest.minShellVersion);
        assertEquals(archive.length(), latest.sizeBytes);

        // The digest the publisher published is the digest of the file it published.
        assertEquals(Digests.of(archive), latest.sha256);
        assertTrue("sha256.txt must carry the same digest",
                read(new File(out, "sha256.txt")).trim().startsWith(latest.sha256));

        // And the whole thing verifies and unpacks, by the code the phone runs.
        File unpacked = new File(scratch, "unpack");
        OtaManifest manifest = BundleInstaller.unpackAndVerify(archive, latest.sha256,
                latest.releaseId, unpacked, latest.minShellVersion, TestBundles.BASE_PATH,
                OtaLog.NONE);

        assertEquals(VERSION, manifest.version);
        assertEquals("index.html", manifest.entry);
        assertTrue(manifest.declares("media/stings/outro.mp4"));
        assertTrue(new File(unpacked, "media/stings/outro.mp4").isFile());

        // The manifest published beside the archive is the manifest inside it, so a rewritten list
        // of digests cannot be swapped in to validate a different tree.
        assertEquals(read(new File(out, "manifest.json")).trim(),
                read(new File(unpacked, WebBundleStore.MANIFEST_ENTRY)).trim());
    }

    /**
     * Two publishes of the same build produce the same archive, byte for byte.
     *
     * <p>Which is what makes it safe for the APK's baseline and the OTA release to be cut from one
     * commit by two different workflows: they agree on the version, so the phone recognises the
     * published bundle as the one it already shipped with and downloads nothing.
     */
    @Test public void twoPublishesOfOneBuildAreTheSameBytes() throws Exception {
        File dist = new File(scratch, "dist");
        writeSyntheticBuild(dist);
        File first = new File(scratch, "first");
        File second = new File(scratch, "second");

        for (File out : new File[] {first, second}) {
            run(repositoryRoot, "node", "webapp/scripts/build-ota-release.mjs",
                    "--dist", dist.getAbsolutePath(), "--out", out.getAbsolutePath(),
                    "--version", VERSION, "--bundle-url", BUNDLE_URL);
        }

        assertEquals(Digests.of(new File(first, "bundle.zip")),
                Digests.of(new File(second, "bundle.zip")));
    }

    /**
     * A build that is not a complete CIBAR experience is refused by the phone even though the
     * publisher will happily package it.
     *
     * <p>The publisher only asserts that there is an {@code index.html}; the audit
     * ({@code audit-offline-web-assets.mjs}) is what fails a publish in CI. This is the third net,
     * on the device, for a bundle that arrived from somewhere the audit never ran.
     */
    @Test public void aBuildWithNoVideoIsPackagedAndThenRefused() throws Exception {
        File dist = new File(scratch, "dist");
        writeSyntheticBuild(dist);
        //noinspection ResultOfMethodCallIgnored
        new File(dist, "media/stings/outro.mp4").delete();
        //noinspection ResultOfMethodCallIgnored
        new File(dist, "assets/scenarios/clip.mp4").delete();
        File out = new File(scratch, "release");

        run(repositoryRoot, "node", "webapp/scripts/build-ota-release.mjs",
                "--dist", dist.getAbsolutePath(), "--out", out.getAbsolutePath(),
                "--version", VERSION, "--bundle-url", BUNDLE_URL);

        OtaLatest latest = OtaLatest.parse(read(new File(out, "latest.json")));
        try {
            BundleInstaller.unpackAndVerify(new File(out, "bundle.zip"), latest.sha256,
                    latest.releaseId, new File(scratch, "unpack"), latest.minShellVersion,
                    TestBundles.BASE_PATH, OtaLog.NONE);
            org.junit.Assert.fail("a bundle with no video is not a complete experience");
        } catch (OtaException refused) {
            assertTrue(refused.getMessage(), refused.getMessage().contains("情境影片"));
        }
    }

    // ------------------------------------------------------------------ helpers

    /**
     * {@code minShellVersion} out of {@code release/versions.json} - the file the publisher reads.
     *
     * <p>Parsed by hand rather than with org.json, because the two org.json builds in play disagree
     * about whether {@code JSONException} is checked and this file is three flat string fields.
     */
    private String publishedMinShellVersion() throws IOException {
        String json = read(new File(repositoryRoot, "release/versions.json"));
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("\"minShellVersion\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        assertTrue("release/versions.json must declare minShellVersion", matcher.find());
        return matcher.group(1);
    }

    /** A structurally complete CIBAR build, small enough to publish in a test. */
    private static void writeSyntheticBuild(File dist) throws IOException {
        for (java.util.Map.Entry<String, byte[]> file : TestBundles.completeBuild().entrySet()) {
            File target = new File(dist, file.getKey());
            //noinspection ResultOfMethodCallIgnored
            target.getParentFile().mkdirs();
            Files.write(target.toPath(), file.getValue());
        }
    }

    private static String read(File file) throws IOException {
        return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
    }

    /** The repository root, found by the publisher script only it has. */
    private static File findRepositoryRoot() {
        for (File dir = new File("").getAbsoluteFile(); dir != null; dir = dir.getParentFile()) {
            if (new File(dir, "webapp/scripts/build-ota-release.mjs").isFile()) return dir;
        }
        return null;
    }

    private static boolean nodeIsAvailable() {
        try {
            return new ProcessBuilder("node", "--version").start().waitFor() == 0;
        } catch (IOException | InterruptedException unavailable) {
            return false;
        }
    }

    private static void run(File workingDirectory, String... command) throws Exception {
        Process process = new ProcessBuilder(command)
                .directory(workingDirectory)
                .redirectErrorStream(true)
                .start();
        String output = new String(readAll(process.getInputStream()), StandardCharsets.UTF_8);
        assertTrue("the publisher did not finish", process.waitFor(120, TimeUnit.SECONDS));
        assertEquals(String.join(" ", command) + "\n" + output, 0, process.exitValue());
    }

    private static byte[] readAll(java.io.InputStream in) throws IOException {
        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        for (int read = in.read(buffer); read >= 0; read = in.read(buffer)) {
            out.write(buffer, 0, read);
        }
        return out.toByteArray();
    }
}
