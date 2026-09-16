package com.bigxreality.jorjinverifier.ota;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Assume;
import org.junit.Test;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * The base path gate is one rule enforced in three languages, and this is what keeps them equal.
 *
 * <p>A Vite build writes its asset URLs absolute under {@code base}, so "was this bundle built for
 * the path we serve it at" is answered the same way everywhere: look in the entry document for the
 * prefix followed by {@code assets/}. Three places ask it -
 *
 * <ul>
 *   <li>{@code webapp/vite.config.js} decides the prefix;</li>
 *   <li>{@code .github/workflows/build-android.yml} greps the {@code index.html} it unpacks out of
 *       the APK, and fails the build when the packaged bundle was compiled for another one;</li>
 *   <li>{@link BundleRequirements} asks it of every bundle that arrives over the air and of every
 *       bundle already on disk at launch.</li>
 * </ul>
 *
 * <p>Java and a shell {@code grep} cannot share code, and a rule copied into two places is a rule
 * that will be changed in one of them. So this test reads the workflow and the config as text and
 * fails when they stop agreeing with the shell - which turns "remember to change both" into a red
 * test in {@code tools/run-jvm-tests.sh}.
 *
 * <p>Skipped rather than failed when the repository is not on disk: the JVM tests are also run
 * against the compiled module alone, where there is no {@code .github/} to read.
 */
public class BasePathGateContractTest {

    /** The workflow step that refuses an APK whose packaged build has the wrong base. */
    private static final String WORKFLOW = ".github/workflows/build-android.yml";

    /** Where the prefix is actually decided. */
    private static final String VITE_CONFIG = "webapp/vite.config.js";

    /**
     * The CI gate greps for the same string the shell looks for.
     *
     * <p>Not "a similar string": the workflow line is quoted here in full, so a change to either
     * side that leaves them merely close still fails.
     */
    @Test public void theWorkflowGrepsForWhatTheShellLooksFor() throws IOException {
        File root = repositoryRoot();
        Assume.assumeTrue("this test needs the repository on disk", root != null);

        String marker = BundleRequirements.entryAssetMarker(basePathFromViteConfig(root));
        String workflow = read(new File(root, WORKFLOW));

        assertTrue("the shell looks for " + marker + ", so " + WORKFLOW + " must grep for it;"
                        + " a bundle either side accepts and the other rejects is the whole bug",
                workflow.contains("grep -q '" + marker + "'"));
    }

    /**
     * The fixtures the OTA tests are built from carry the real prefix.
     *
     * <p>Without this the suite would keep passing after a base path change, proving only that the
     * fixtures agree with themselves.
     */
    @Test public void theTestFixturesUseTheRealBasePath() throws IOException {
        File root = repositoryRoot();
        Assume.assumeTrue("this test needs the repository on disk", root != null);

        assertEquals("TestBundles.BASE_PATH must be what webapp/vite.config.js builds for",
                basePathFromViteConfig(root), TestBundles.BASE_PATH);
    }

    /** {@code base: '<prefix>'} out of the Vite config - the value everything else follows. */
    private static String basePathFromViteConfig(File root) throws IOException {
        String config = read(new File(root, VITE_CONFIG));
        java.util.regex.Matcher matcher =
                java.util.regex.Pattern.compile("\\bbase:\\s*'([^']+)'").matcher(config);
        assertTrue(VITE_CONFIG + " must declare a base path", matcher.find());
        return matcher.group(1);
    }

    /**
     * The repository root, or null when the tests are running somewhere without one.
     *
     * <p>Walks up from the working directory looking for the two files this test reads, rather
     * than counting directory levels - Gradle runs these from {@code android/app} and
     * {@code tools/run-jvm-tests.sh} from {@code android/app} too, but neither is a promise.
     */
    private static File repositoryRoot() {
        File directory = new File("").getAbsoluteFile();
        for (int levels = 0; levels < 6 && directory != null; levels++) {
            if (new File(directory, WORKFLOW).isFile() && new File(directory, VITE_CONFIG).isFile()) {
                return directory;
            }
            directory = directory.getParentFile();
        }
        return null;
    }

    private static String read(File file) throws IOException {
        return new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
    }
}
