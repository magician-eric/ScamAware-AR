package com.bigxreality.jorjinverifier.ota;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

/**
 * Where a bundle's bytes come from - the APK's assets, or a directory in internal storage.
 *
 * <p>One interface with two implementations, so that everything above it - the path rules, the
 * MIME types, the SPA route fallback, the 404 - is written once and behaves identically whether
 * the phone is running the build it shipped with or one that arrived over the air. An update that
 * changed how requests are answered, and not merely what they answer with, would be an update that
 * can break the experience without changing a line of the experience.
 */
public interface BundleContent {

    /** An open file: its length where that is knowable, and the bytes. */
    final class Resource {
        /** Length in bytes, or -1 when the source cannot say. */
        public final long length;
        public final InputStream stream;

        public Resource(long length, InputStream stream) {
            this.length = length;
            this.stream = stream;
        }
    }

    /**
     * Opens a file inside the bundle.
     *
     * @param relativePath already validated by {@link WebBundlePaths} - no leading slash, no
     *                     {@code ..}, no query.
     * @return the open resource, or null when there is no such file.
     */
    Resource open(String relativePath);

    /** Whether the bundle contains this file, without opening it. */
    boolean exists(String relativePath);

    /** A bundle unpacked into a directory - every OTA bundle, and every bundle in a JVM test. */
    final class Directory implements BundleContent {

        private final File root;

        public Directory(File root) {
            this.root = root;
        }

        @Override public Resource open(String relativePath) {
            File file = resolve(relativePath);
            if (file == null || !file.isFile()) return null;
            try {
                // The length is always declared for a real file. It is what lets Chromium's media
                // stack size a scenario video and seek inside it, instead of treating an 18 MiB
                // MP4 as an unbounded stream it has to buffer to the end of.
                return new Resource(file.length(), new FileInputStream(file));
            } catch (IOException unreadable) {
                return null;
            }
        }

        @Override public boolean exists(String relativePath) {
            File file = resolve(relativePath);
            return file != null && file.isFile();
        }

        /**
         * The path checked once more here, at the point of use.
         *
         * <p>{@link WebBundlePaths} already refused anything unsafe, and this is not a substitute
         * for that. It is the belt to its braces: this class takes a bare string and opens
         * whatever it names, and it is the one place in the update mechanism where a mistake
         * anywhere upstream turns into reading a file outside the bundle.
         */
        private File resolve(String relativePath) {
            if (!BundlePaths.isSafeRelativePath(relativePath)) return null;
            return new File(root, relativePath);
        }
    }
}
