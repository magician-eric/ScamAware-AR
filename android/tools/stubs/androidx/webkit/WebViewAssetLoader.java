package androidx.webkit;

import android.net.Uri;
import android.webkit.WebResourceResponse;

/**
 * Compile-only stand-in for {@code androidx.webkit:webkit}'s WebViewAssetLoader.
 *
 * <p>Only the shape the app uses, and only enough of it to type-check. The real artefact lives on
 * Google's Maven repository, which is unreachable from the sandbox this harness exists for (see
 * tools/README.md); the real build resolves the real dependency and never sees this file.
 */
public final class WebViewAssetLoader {

    /** Answers requests for one registered path prefix. */
    public interface PathHandler {
        WebResourceResponse handle(String path);
    }

    public static final class Builder {
        public Builder setDomain(String domain) {
            return this;
        }

        public Builder addPathHandler(String prefix, PathHandler handler) {
            return this;
        }

        public WebViewAssetLoader build() {
            return new WebViewAssetLoader();
        }
    }

    public WebResourceResponse shouldInterceptRequest(Uri url) {
        return null;
    }
}
