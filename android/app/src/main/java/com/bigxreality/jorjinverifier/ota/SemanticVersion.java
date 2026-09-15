package com.bigxreality.jorjinverifier.ota;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * {@code MAJOR.MINOR.PATCH}, compared numerically - the APK Shell's version line.
 *
 * <p>Separate from {@link BundleVersion} because the two are different things that look alike. A
 * Release ID is a Web Bundle version with the date and sequence CI stamped on it at publish time;
 * a Shell version is three numbers a person chose, and never carries either. See
 * {@code docs/RELEASE_VERSIONING.md} §1 and §5.
 *
 * <p>One place it matters: the gate. A release declares {@code minShellVersion}, the APK knows
 * {@code BuildConfig.SHELL_VERSION}, and a phone below the line must refuse the bundle rather than
 * install one that would come up without the native bridge it expects.
 */
public final class SemanticVersion {

    private static final Pattern PATTERN = Pattern.compile("(\\d+)\\.(\\d+)\\.(\\d+)");

    private SemanticVersion() { }

    public static boolean isValid(String version) {
        return version != null && PATTERN.matcher(version).matches();
    }

    /**
     * Orders two versions. Negative when {@code left} is older.
     *
     * <p>An unreadable version on either side sorts as {@code 0.0.0} rather than throwing, and
     * both callers want that: an APK whose {@code SHELL_VERSION} could not be read is the oldest
     * possible shell, and a release that declared no {@code minShellVersion} demands nothing. Both
     * are the conservative reading of a missing value.
     */
    public static int compare(String left, String right) {
        int[] a = fields(left);
        int[] b = fields(right);
        for (int i = 0; i < a.length; i++) {
            if (a[i] != b[i]) return a[i] < b[i] ? -1 : 1;
        }
        return 0;
    }

    /** Whether a shell at {@code shellVersion} may run a release needing {@code required}. */
    public static boolean satisfies(String shellVersion, String required) {
        return compare(shellVersion, required) >= 0;
    }

    private static int[] fields(String version) {
        Matcher matcher = version == null ? null : PATTERN.matcher(version);
        if (matcher == null || !matcher.matches()) return new int[] {0, 0, 0};
        return new int[] {
                Integer.parseInt(matcher.group(1)),
                Integer.parseInt(matcher.group(2)),
                Integer.parseInt(matcher.group(3)),
        };
    }
}
