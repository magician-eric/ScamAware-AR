package com.bigxreality.jorjinverifier.ota;

import java.io.File;

/**
 * The web build the shell is about to serve: which version, and where its bytes are.
 *
 * <p>Two possibilities and no third. Either the bytes are in this APK's assets - the baseline,
 * which is always present, can never be damaged, and is what a phone that has never had a network
 * runs - or they are a verified bundle in internal storage that arrived over the air. Everything
 * downstream (the request handler, the failure messages, the diagnostics) branches on this and
 * nothing else.
 */
public final class WebBundle {

    public enum Source {
        /** {@code assets/cibar/} inside the APK. Always available, never written to. */
        APK_BASELINE,
        /** {@code versions/<version>/} in internal storage, downloaded and verified. */
        OTA,
    }

    /** The version this build publishes itself as - see {@link BundleVersion}. */
    public final String version;

    /** The directory holding the files, or null for {@link Source#APK_BASELINE}. */
    public final File directory;

    public final Source source;

    WebBundle(String version, File directory, Source source) {
        this.version = version;
        this.directory = directory;
        this.source = source;
    }

    /** The APK's built-in copy, which needs no storage, no network and no verification. */
    public static WebBundle baseline(String version) {
        return new WebBundle(version, null, Source.APK_BASELINE);
    }

    public boolean isBaseline() {
        return source == Source.APK_BASELINE;
    }

    @Override public String toString() {
        return (isBaseline() ? "APK 內建 " : "OTA ") + version;
    }
}
