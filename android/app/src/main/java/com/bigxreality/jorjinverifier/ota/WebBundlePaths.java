package com.bigxreality.jorjinverifier.ota;

import java.util.Locale;

/**
 * How a URL under {@code https://appassets.androidplatform.net/CIBAR/} becomes a file inside a
 * bundle, and what {@code Content-Type} that file is served with.
 *
 * <p>Pure functions, and separate from the Android class that opens the file, because every one of
 * these decisions fails silently on a phone. A wrong {@code Content-Type} does not show an error:
 * a module script served as {@code text/plain} is refused by the strict MIME check and the page is
 * blank, a stylesheet served as anything but {@code text/css} is ignored and the app renders
 * unstyled, and a path that resolves one directory too high does not fail loudly either.
 *
 * <p>These rules do not know whether the bytes are coming out of the APK's assets or out of an
 * OTA bundle in internal storage, and that is the point: the two must be indistinguishable from
 * inside the page, or an update would change how the experience behaves and not just what it
 * contains.
 */
public final class WebBundlePaths {

    /** The directory inside {@code assets/} that the APK's baseline build is packaged into. */
    public static final String ASSET_ROOT = "cibar";

    /** The SPA's single document. Every route CIBAR has is a fragment of this file. */
    public static final String INDEX = "index.html";

    /**
     * The glasses camera endpoint. It lives on the page's own origin - it has to, or the canvas
     * the recogniser reads back with {@code getImageData} is tainted and the read throws - which
     * puts it inside the very path prefix a bundle owns. It is never a file, in any bundle.
     */
    public static final String CAMERA_FILE = "__jorjin-camera.mjpeg";

    private WebBundlePaths() { }

    /**
     * The file a loader path refers to, relative to a bundle root, or null when it must not be
     * served.
     *
     * @param path the part of the URL path after {@code /CIBAR/}, as {@code WebViewAssetLoader}
     *             hands it over - no scheme, no host, and no guarantee about the leading slash.
     */
    public static String relativePathFor(String path) {
        String clean = normalize(path);
        if (clean == null) return null;
        if (clean.isEmpty()) return INDEX;
        // WebLayerController intercepts the camera before any bundle is consulted; refusing it
        // here as well means a future reordering degrades to a 404 rather than to the bundle
        // answering a camera request with an empty body, which the page reports as a dead camera.
        if (clean.equals(CAMERA_FILE)) return null;
        return clean;
    }

    /** The same path inside the APK's assets, where the baseline lives under {@link #ASSET_ROOT}. */
    public static String assetPathFor(String path) {
        String relative = relativePathFor(path);
        return relative == null ? null : ASSET_ROOT + "/" + relative;
    }

    /**
     * Whether a path with no file behind it should fall back to {@link #INDEX} - the SPA fallback
     * a static host provides with a 404 rewrite and a local origin has to provide itself.
     *
     * <p>Only extensionless paths qualify. Falling back for every miss would answer a missing
     * image, script or {@code .mind} target with a page of HTML, and the page's own error handling
     * would then report a corrupt asset instead of a missing one.
     */
    public static boolean isRouteRequest(String path) {
        String clean = normalize(path);
        if (clean == null) return false;
        if (clean.isEmpty()) return true;
        int slash = clean.lastIndexOf('/');
        String last = slash < 0 ? clean : clean.substring(slash + 1);
        return last.indexOf('.') < 0;
    }

    /** Strips the leading slash, query and fragment; refuses anything that could leave the bundle. */
    private static String normalize(String path) {
        if (path == null) return null;
        String clean = path;
        int cut = clean.indexOf('#');
        if (cut >= 0) clean = clean.substring(0, cut);
        cut = clean.indexOf('?');
        if (cut >= 0) clean = clean.substring(0, cut);
        while (clean.startsWith("/")) clean = clean.substring(1);
        if (clean.isEmpty()) return "";
        return BundlePaths.isSafeRelativePath(clean) ? clean : null;
    }

    /**
     * The {@code Content-Type} for a file, by extension.
     *
     * <p>The default is deliberately {@code application/octet-stream}: a byte stream is what
     * {@code fetch(...).arrayBuffer()} wants, and that is how the {@code .mind} image-target
     * dataset is read.
     */
    public static String mimeTypeFor(String path) {
        switch (extensionOf(path)) {
            case "html": case "htm": return "text/html";
            case "js": case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": case "map": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "gif": return "image/gif";
            case "webp": return "image/webp";
            case "avif": return "image/avif";
            case "ico": return "image/x-icon";
            case "mp4": return "video/mp4";
            case "webm": return "video/webm";
            case "mp3": return "audio/mpeg";
            case "wav": return "audio/wav";
            case "ogg": return "audio/ogg";
            case "m4a": return "audio/mp4";
            case "woff": return "font/woff";
            case "woff2": return "font/woff2";
            case "ttf": return "font/ttf";
            case "otf": return "font/otf";
            case "wasm": return "application/wasm";
            case "txt": return "text/plain";
            case "xml": return "text/xml";
            case "mind": default: return "application/octet-stream";
        }
    }

    /**
     * The charset to declare, or null. Only for types whose bytes are text: naming an encoding on
     * a PNG or an MP4 is meaningless, and on a {@code .mind} target it would invite the WebView to
     * decode binary as UTF-8.
     */
    public static String encodingFor(String path) {
        String mime = mimeTypeFor(path);
        if (mime.startsWith("text/")) return "utf-8";
        if (mime.equals("application/json")) return "utf-8";
        if (mime.equals("application/manifest+json")) return "utf-8";
        if (mime.equals("image/svg+xml")) return "utf-8";
        return null;
    }

    private static String extensionOf(String path) {
        if (path == null) return "";
        int slash = path.lastIndexOf('/');
        String last = slash < 0 ? path : path.substring(slash + 1);
        int dot = last.lastIndexOf('.');
        if (dot < 0 || dot == last.length() - 1) return "";
        return last.substring(dot + 1).toLowerCase(Locale.ROOT);
    }
}
