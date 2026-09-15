package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.junit.Assert.fail;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.Test;

/**
 * The APK Shell version contract, pinned from the side that ships it.
 *
 * <p>{@code release/versions.json} is the single place any CIBAR version number may be edited
 * (docs/RELEASE_VERSIONING.md). {@code app/build.gradle} reads it to produce {@code versionName},
 * {@code versionCode} and {@code BuildConfig.SHELL_VERSION} - so the file and the APK can only
 * disagree if somebody edits one of them and rebuilds nothing. That is exactly what a delivery
 * looks like: the record says 1.0.0 and the phone holds something else, months later, with no way
 * left to tell which was true.
 *
 * <p>These tests compare the two directly. They run in both flavors' unit test tasks, which is
 * what CI already invokes.
 */
public class ShellVersionTest {

    private static final Pattern SEMVER = Pattern.compile("^(\\d+)\\.(\\d+)\\.(\\d+)$");

    @Test public void buildConfigCarriesTheShellVersionFromVersionsJson() {
        assertEquals("BuildConfig.SHELL_VERSION must be release/versions.json's shellVersion",
                string("shellVersion"), BuildConfig.SHELL_VERSION);
    }

    /**
     * MAJOR * 10000 + MINOR * 100 + PATCH. The build fails on a mismatch too; asserting it here
     * as well means the rule is stated where a reader of the version contract will look for it,
     * and a future build that stopped checking cannot take the guarantee down with it.
     */
    @Test public void theShellVersionCodeIsDerivedFromTheShellVersion() {
        int[] parts = semver("shellVersion");
        assertEquals("shellVersionCode must be MAJOR*10000 + MINOR*100 + PATCH of shellVersion",
                (parts[0] * 10000) + (parts[1] * 100) + parts[2], number("shellVersionCode"));
    }

    /**
     * versionName is the only place on the phone that says which build is installed, and the
     * whole point of SHELL_VERSION is that reading it there is enough. The flavor and the CI
     * build metadata follow it ("1.0.0-offline+42.abc1234"); the version itself leads.
     */
    @Test public void theVersionNameStartsWithTheShellVersion() {
        // SHELL_VERSION + build metadata, with nothing in between. It used to be
        // SHELL_VERSION + "-" + flavor + metadata, because two APKs needed the versionName to say
        // which of them was installed; there is one APK now, so the pre-release field is gone and
        // the "-" with it. What still has to hold - and is the point of this test - is that the
        // string on the phone opens with the product version somebody can look up.
        String versionName = BuildConfig.VERSION_NAME;
        String shellVersion = BuildConfig.SHELL_VERSION;
        assertTrue("versionName " + versionName + " must start with SHELL_VERSION " + shellVersion,
                versionName.startsWith(shellVersion));
        String rest = versionName.substring(shellVersion.length());
        assertTrue("versionName " + versionName + " must be SHELL_VERSION + build metadata, with"
                        + " nothing in between (got \"" + rest + "\" after the version)",
                rest.isEmpty() || rest.startsWith("+"));
    }

    /**
     * versionCode is the Shell version's code plus the CI run number, so it is never below the
     * base. A local build adds nothing and lands exactly on it.
     */
    @Test public void theVersionCodeIsAtLeastTheShellVersionCode() {
        assertTrue("versionCode " + BuildConfig.VERSION_CODE + " is below shellVersionCode "
                        + number("shellVersionCode"),
                BuildConfig.VERSION_CODE >= number("shellVersionCode"));
    }

    /** Every version in the file is a plain MAJOR.MINOR.PATCH - no dates, no sequence numbers. */
    @Test public void everyVersionInTheFileIsSemantic() {
        semver("shellVersion");
        semver("webBundleVersion");
        semver("minShellVersion");
    }

    /**
     * A Web Bundle that demands a newer Shell than the one being built is a bundle this APK
     * refuses at OTA time - shipped as the pair, it is an experience that cannot start.
     */
    @Test public void theWebBundleDoesNotRequireANewerShellThanThisOne() {
        int[] required = semver("minShellVersion");
        int[] shell = semver("shellVersion");
        int requiredCode = (required[0] * 10000) + (required[1] * 100) + required[2];
        int shellCode = (shell[0] * 10000) + (shell[1] * 100) + shell[2];
        assertTrue("minShellVersion " + string("minShellVersion") + " is newer than shellVersion "
                        + string("shellVersion"),
                requiredCode <= shellCode);
    }

    private static int[] semver(String key) {
        String value = string(key);
        Matcher matcher = SEMVER.matcher(value);
        if (!matcher.matches()) {
            fail("release/versions.json: " + key + " (" + value + ") is not MAJOR.MINOR.PATCH");
        }
        return new int[] {
                Integer.parseInt(matcher.group(1)),
                Integer.parseInt(matcher.group(2)),
                Integer.parseInt(matcher.group(3)),
        };
    }

    private static String string(String key) {
        Matcher matcher = Pattern.compile("\"" + key + "\"\\s*:\\s*\"([^\"]*)\"").matcher(json());
        if (!matcher.find()) fail("release/versions.json has no string \"" + key + "\"");
        return matcher.group(1);
    }

    private static int number(String key) {
        Matcher matcher = Pattern.compile("\"" + key + "\"\\s*:\\s*(\\d+)").matcher(json());
        if (!matcher.find()) fail("release/versions.json has no number \"" + key + "\"");
        return Integer.parseInt(matcher.group(1));
    }

    /**
     * Read straight off disk rather than through a Gradle-injected copy: the file this test has
     * to speak for is the one in the repository, and a copy staged into the test's resources
     * could go stale in exactly the way being guarded against.
     */
    private static String json() {
        File dir = new File(System.getProperty("user.dir", ".")).getAbsoluteFile();
        for (File at = dir; at != null; at = at.getParentFile()) {
            File candidate = new File(at, "release/versions.json");
            if (candidate.isFile()) {
                try {
                    return new String(Files.readAllBytes(candidate.toPath()),
                            StandardCharsets.UTF_8);
                } catch (IOException failure) {
                    throw new AssertionError("cannot read " + candidate, failure);
                }
            }
        }
        throw new AssertionError("release/versions.json not found above " + dir
                + " - it is the single source of truth for every CIBAR version"
                + " (docs/RELEASE_VERSIONING.md)");
    }
}
