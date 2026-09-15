package com.bigxreality.jorjinverifier.ota;

/**
 * What a path inside a bundle is allowed to look like.
 *
 * <p>One rule, applied in three places that would otherwise each invent their own: the manifest
 * parser, the ZIP extractor, and the request handler that turns a URL into a file. All three are
 * reading names that came from outside the APK, and all three then read or write a file at that
 * name.
 *
 * <p>The extractor is the one that matters. A ZIP entry named {@code ../../databases/app.db} is a
 * perfectly legal archive entry, and an extractor that resolves it against the output directory
 * writes wherever the name points - the "zip slip" bug, which is a remote file write given only
 * the ability to serve an archive. Rejecting the name outright, rather than resolving it and then
 * checking where it landed, is the version of this check that cannot be got subtly wrong.
 */
public final class BundlePaths {

    private BundlePaths() { }

    /**
     * Whether a name may be used as a path relative to a bundle root.
     *
     * <p>Refused: absolute paths, backslashes (a Windows-authored archive, and also a second
     * separator whose handling differs between the parts of Android that see it), empty segments,
     * {@code .} and {@code ..} segments, trailing slashes, and control characters - a NUL in
     * particular, because the C string a filesystem call ends up with stops there and the name
     * Java checked is then not the name the kernel opened.
     */
    public static boolean isSafeRelativePath(String path) {
        if (path == null || path.isEmpty()) return false;
        if (path.charAt(0) == '/') return false;
        if (path.indexOf('\\') >= 0) return false;
        if (path.endsWith("/")) return false;
        for (int i = 0; i < path.length(); i++) {
            if (path.charAt(i) < 0x20 || path.charAt(i) == 0x7f) return false;
        }
        for (String segment : path.split("/", -1)) {
            if (segment.isEmpty() || segment.equals(".") || segment.equals("..")) return false;
        }
        return true;
    }
}
