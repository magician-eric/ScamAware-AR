package com.bigxreality.jorjinverifier.ota;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Answers one request for a file in the active bundle - the whole of the serving logic, with no
 * {@code android.*} anywhere in it.
 *
 * <p>Separated from {@code WebBundleAssetHandler} (which is twenty lines of adapter) so that
 * "does the wearer's video still play while an 80 MiB update downloads" is a question a test can
 * ask, rather than one somebody has to answer by wearing the glasses on a slow Wi-Fi.
 *
 * <p>The three possible answers, in order:
 * <ol>
 *   <li>the file, with its length and the right {@code Content-Type};</li>
 *   <li>for an extensionless path that has no file, {@code index.html} with status 200 - the SPA
 *       fallback a static host does with a 404 rewrite. 200 and not 404: the router reads the URL,
 *       and a 404 status makes the WebView report a failed navigation for a working route;</li>
 *   <li>a 404 with a body that says which path was missing.</li>
 * </ol>
 *
 * <p>The 404 is explicit rather than a null. Handing {@code WebViewAssetLoader} a null tells it
 * this URL is not ours, and the WebView then tries to fetch {@code appassets.androidplatform.net}
 * over the network - which fails with a DNS error, on a reserved name that resolves nowhere, and
 * reports a network problem for what is really a file missing from a bundle.
 */
public final class WebBundleResponder {

    /** One answer: everything {@code WebResourceResponse} needs, and nothing Android-specific. */
    public static final class Response {
        public final int status;
        public final String reason;
        public final String mimeType;
        public final String encoding;
        /** Bytes, or -1 when unknown. */
        public final long contentLength;
        public final InputStream body;
        /** The file that was actually served, for the log. Null for a 404. */
        public final String servedPath;

        Response(int status, String reason, String mimeType, String encoding, long contentLength,
                 InputStream body, String servedPath) {
            this.status = status;
            this.reason = reason;
            this.mimeType = mimeType;
            this.encoding = encoding;
            this.contentLength = contentLength;
            this.body = body;
            this.servedPath = servedPath;
        }

        public boolean isNotFound() {
            return status == 404;
        }
    }

    private final BundleContent content;
    private final OtaLog log;

    public WebBundleResponder(BundleContent content, OtaLog log) {
        this.content = content;
        this.log = log == null ? OtaLog.NONE : log;
    }

    /**
     * @param path the part of the URL after {@code /CIBAR/}, exactly as the asset loader hands it
     *             over.
     */
    public Response respondTo(String path) {
        String relative = WebBundlePaths.relativePathFor(path);
        if (relative != null) {
            Response response = serve(relative);
            if (response != null) return response;
        }
        if (WebBundlePaths.isRouteRequest(path)) {
            Response index = serve(WebBundlePaths.INDEX);
            if (index != null) return index;
            log.line("這個 bundle 沒有 " + WebBundlePaths.INDEX + "，連進入點都缺");
        }
        return notFound(path);
    }

    private Response serve(String relativePath) {
        BundleContent.Resource resource = content.open(relativePath);
        if (resource == null) return null;
        return new Response(200, "OK", WebBundlePaths.mimeTypeFor(relativePath),
                WebBundlePaths.encodingFor(relativePath), resource.length, resource.stream,
                relativePath);
    }

    private Response notFound(String path) {
        log.line("bundle 內找不到：" + path);
        byte[] body = ("Not found in the active CIBAR bundle: " + path)
                .getBytes(StandardCharsets.UTF_8);
        return new Response(404, "Not Found", "text/plain", "utf-8", body.length,
                new ByteArrayInputStream(body), null);
    }
}
