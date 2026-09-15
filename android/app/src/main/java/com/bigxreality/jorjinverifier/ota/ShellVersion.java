package com.bigxreality.jorjinverifier.ota;

/**
 * What this native shell can do for a web bundle, as a {@code MAJOR.MINOR.PATCH} version line.
 *
 * <p>The web experience updates over the air and the APK does not, so the two drift apart on
 * purpose: a wearer can be running last week's Shell and this morning's Web Bundle. Almost always
 * that is fine - the Web Bundle is HTML, JavaScript and media, and the Shell only has to serve it.
 * It stops being fine the moment a web build starts calling a native bridge that an older Shell
 * does not have: the page would come up, find no {@code window.__jorjinCamera}, and report a dead
 * camera on a phone whose camera is working perfectly.
 *
 * <p>So every release declares the lowest Shell it will run on ({@code minShellVersion}), and a
 * phone below that line refuses the download and carries on with what it already has. Refusing is
 * the whole point: the alternative is installing a bundle that comes up broken, and a broken
 * bundle that <em>loads</em> is the one failure mode rollback cannot detect. The comparison itself
 * is {@link SemanticVersion}; this class only holds the two constants around it.
 *
 * <h2>Two version lines, not one</h2>
 * The Shell version and the Web Bundle version are separate numbers that happen to look alike, and
 * docs/RELEASE_VERSIONING.md §5 is explicit about it: a web-only change raises
 * {@code webBundleVersion} and must not touch {@code shellVersion}. A Shell version never carries
 * a date or a sequence - that shape belongs to a Release ID, which is a Web Bundle thing
 * ({@link BundleVersion}).
 *
 * <h2>When to raise it</h2>
 * Raise {@code shellVersion} in {@code release/versions.json} in the same change that adds the
 * native capability - MAJOR for an incompatible bridge or SDK generation, MINOR for a new one
 * older bundles do not need - and publish the first bundle that needs it with
 * {@code minShellVersion} set to the new line. Never raise it for a change the web build cannot
 * observe.
 */
public final class ShellVersion {

    /**
     * What a shell reports when nothing told it its own version - below every real one, so a
     * bundle demanding anything at all is refused rather than installed on an unknown shell.
     *
     * <p>The real value is {@code BuildConfig.SHELL_VERSION}, from {@code release/versions.json} -
     * the one file in the repository a version number may be edited in. It is passed in rather
     * than read here, because everything in this package is deliberately free of {@code android.*}.
     */
    public static final String UNKNOWN = "0.0.0";

    /** The OTA wire format both sides agree on - {@code schema} in latest.json and manifest.json. */
    public static final int SCHEMA = 1;

    private ShellVersion() { }
}
