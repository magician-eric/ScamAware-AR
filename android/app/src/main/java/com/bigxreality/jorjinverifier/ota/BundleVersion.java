package com.bigxreality.jorjinverifier.ota;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The ordering of web bundle versions, on the phone.
 *
 * <p>A Release ID is {@code MAJOR.MINOR.PATCH-YYYYMMDD.NNN} - the product version somebody wrote
 * down, the date of the release, and which release of that day it is. It is minted by
 * {@code .github/workflows/ota-release.yml} at publish time; the format and the rules around it
 * are {@code docs/RELEASE_VERSIONING.md} §3. This class exists so the phone's idea of "newer" is
 * the publisher's idea of "newer", and not a string comparison that happens to agree most of
 * the time.
 *
 * <p>Numeric, field by field, in that order. {@code 1.0.10} is newer than {@code 1.0.9} as numbers
 * and older as text, and the direction of that one comparison decides whether a phone upgrades or
 * quietly installs an older experience over a newer one.
 */
public final class BundleVersion {

    /** What the publisher emits, and the only shape a remote bundle may claim. */
    private static final Pattern PUBLISHED =
            Pattern.compile("(\\d+)\\.(\\d+)\\.(\\d+)-(\\d{8})\\.(\\d{3,})");

    /**
     * What a shell with no usable baseline version reports - below every real bundle, so the first
     * OTA release supersedes it rather than being refused as a downgrade.
     */
    public static final String UNKNOWN = "0.0.0-00000000.000";

    private BundleVersion() { }

    /** Whether a string is a version this shell will compare at all. */
    public static boolean isValid(String version) {
        return version != null && PUBLISHED.matcher(version).matches();
    }

    /**
     * Whether a string is the format the publisher emits.
     *
     * <p>The same test as {@link #isValid}, kept as its own name because the two are asked for
     * different reasons: this one is applied to the version in {@code latest.json}, which is the
     * single input to this mechanism that nobody in this repository wrote, and it is what stops a
     * version like {@code 99999999} from outranking every real bundle forever and pinning the
     * phone to whatever was served with it.
     */
    public static boolean isPublishedFormat(String version) {
        return isValid(version);
    }

    /**
     * Orders two versions. Negative when {@code left} is older.
     *
     * @throws IllegalArgumentException if either side is not a version - callers decide what an
     *         unreadable version means, and silently treating it as zero would make a corrupt
     *         state file look like a fresh install.
     */
    public static int compare(String left, String right) {
        long[] a = fields(left);
        long[] b = fields(right);
        for (int i = 0; i < a.length; i++) {
            if (a[i] != b[i]) return a[i] < b[i] ? -1 : 1;
        }
        return 0;
    }

    /** Whether {@code candidate} is strictly newer than {@code current}. */
    public static boolean isNewer(String candidate, String current) {
        return compare(candidate, current) > 0;
    }

    /**
     * Compares only the {@code MAJOR.MINOR.PATCH} half.
     *
     * <p>The half a person decides, as opposed to the half CI stamps on at publish time. Every
     * change to the web bundle must raise it (docs/RELEASE_VERSIONING.md §6, enforced by
     * {@code version-bump-check}), so two Release IDs sharing a semantic version describe the same
     * content - which is what lets a freshly installed phone recognise the published bundle as the
     * one it already shipped with, instead of spending 80 MiB to arrive where it started.
     */
    public static int compareSemantic(String left, String right) {
        long[] a = fields(left);
        long[] b = fields(right);
        for (int i = 0; i < 3; i++) {
            if (a[i] != b[i]) return a[i] < b[i] ? -1 : 1;
        }
        return 0;
    }

    /** The product half, e.g. {@code 1.0.0} - what a release note calls this version. */
    public static String productVersionOf(String version) {
        Matcher matcher = matcherFor(version);
        return matcher.group(1) + "." + matcher.group(2) + "." + matcher.group(3);
    }

    /** The commit's UTC date, as {@code YYYYMMDD}. */
    public static String releaseDateOf(String version) {
        return matcherFor(version).group(4);
    }

    /** Which release of that day this is. */
    public static int releaseSequenceOf(String version) {
        return Integer.parseInt(matcherFor(version).group(5));
    }

    private static Matcher matcherFor(String version) {
        if (version == null) throw new IllegalArgumentException("不是可比較的 bundle 版本：null");
        Matcher matcher = PUBLISHED.matcher(version);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("不是可比較的 bundle 版本：" + version);
        }
        return matcher;
    }

    private static long[] fields(String version) {
        Matcher matcher = matcherFor(version);
        long[] values = new long[5];
        for (int i = 0; i < values.length; i++) {
            values[i] = Long.parseLong(matcher.group(i + 1));
        }
        return values;
    }
}
