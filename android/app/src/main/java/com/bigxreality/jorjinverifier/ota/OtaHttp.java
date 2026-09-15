package com.bigxreality.jorjinverifier.ota;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * The only part of the update mechanism that touches the network.
 *
 * <p>An interface, with one real implementation, because "is there an update" is a question about
 * the internet and not about the radio. {@code navigator.onLine} - and its Android equivalent,
 * {@code NetworkInfo.isConnected()} - answer "is this phone attached to a network", which is a
 * different question with a different answer in every venue with a captive portal, every hotel
 * Wi-Fi, and every conference network that has run out of DHCP leases. This shell asks by making
 * the request, and treats a failure as "no update this time" rather than as an error worth showing
 * anybody.
 *
 * <h2>Timeouts</h2>
 * Both halves are bounded. Without a read timeout, a connection that is accepted and then goes
 * quiet - the exact behaviour of a captive portal that has decided to hold the socket - blocks the
 * update thread until the process dies. Nothing the wearer is doing depends on that thread, which
 * is precisely why nobody would notice it was stuck.
 */
public interface OtaHttp {

    /** Seconds to establish the connection before giving up. */
    int CONNECT_TIMEOUT_MILLIS = 8_000;

    /** Milliseconds without a byte arriving before a read is abandoned. */
    int READ_TIMEOUT_MILLIS = 20_000;

    /** latest.json is a few hundred bytes. Anything of this size is not latest.json. */
    int MAX_TEXT_BYTES = 64 * 1024;

    /** Told the download to stop - the activity is going away, or the app is shutting down. */
    interface Cancellation {
        Cancellation NEVER = () -> false;

        boolean cancelled();
    }

    /**
     * Fetches a small text document.
     *
     * @throws IOException for anything that is not a 200 with a body - which includes a captive
     *         portal's redirect, a 404 from a mistyped path, and a server that is simply down.
     */
    String getText(String url) throws IOException;

    /**
     * Downloads to a file, replacing whatever was there.
     *
     * @param expectedBytes the size latest.json declared, or 0 when it did not. Used only to
     *                      refuse an obviously wrong response early; the digest is what decides.
     */
    void download(String url, File target, long expectedBytes, Cancellation cancellation)
            throws IOException;

    /** {@link HttpURLConnection}, which is what Android's HTTP stack is. */
    final class UrlConnection implements OtaHttp {

        private static final int CHUNK = 64 * 1024;

        /**
         * A ceiling on what a download may write, independent of what the server claims. A server
         * that never stops sending would otherwise fill the phone's storage; the archive this
         * project publishes is well under 100 MiB.
         */
        private static final long MAX_DOWNLOAD_BYTES = 512L * 1024 * 1024;

        private final String userAgent;

        public UrlConnection(String userAgent) {
            this.userAgent = userAgent;
        }

        @Override public String getText(String url) throws IOException {
            HttpURLConnection connection = open(url);
            try {
                int status = connection.getResponseCode();
                if (status != HttpURLConnection.HTTP_OK) {
                    throw new IOException("更新伺服器回應 HTTP " + status + "：" + url);
                }
                try (InputStream in = connection.getInputStream()) {
                    java.io.ByteArrayOutputStream body = new java.io.ByteArrayOutputStream();
                    byte[] buffer = new byte[4096];
                    for (int read = in.read(buffer); read >= 0; read = in.read(buffer)) {
                        body.write(buffer, 0, read);
                        if (body.size() > MAX_TEXT_BYTES) {
                            throw new IOException("latest.json 超過 " + MAX_TEXT_BYTES
                                    + " bytes，這不是我們發布的檔案");
                        }
                    }
                    return new String(body.toByteArray(), StandardCharsets.UTF_8);
                }
            } finally {
                connection.disconnect();
            }
        }

        @Override public void download(String url, File target, long expectedBytes,
                                       Cancellation cancellation) throws IOException {
            HttpURLConnection connection = open(url);
            try {
                int status = connection.getResponseCode();
                if (status != HttpURLConnection.HTTP_OK) {
                    throw new IOException("下載 bundle 時伺服器回應 HTTP " + status + "：" + url);
                }
                long declared = connection.getContentLengthLong();
                if (expectedBytes > 0 && declared > 0 && declared != expectedBytes) {
                    throw new IOException("bundle 大小與 latest.json 不符：" + declared + " ≠ "
                            + expectedBytes);
                }
                File parent = target.getParentFile();
                if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
                    throw new IOException("無法建立下載目錄：" + parent);
                }
                long written = 0;
                try (InputStream in = connection.getInputStream();
                     OutputStream out = new FileOutputStream(target)) {
                    byte[] buffer = new byte[CHUNK];
                    for (int read = in.read(buffer); read >= 0; read = in.read(buffer)) {
                        if (cancellation != null && cancellation.cancelled()) {
                            throw new IOException("下載已取消");
                        }
                        out.write(buffer, 0, read);
                        written += read;
                        if (written > MAX_DOWNLOAD_BYTES) {
                            throw new IOException("下載超過 "
                                    + (MAX_DOWNLOAD_BYTES / 1048576) + " MiB，中止");
                        }
                    }
                }
                // A connection that dies mid-body does not always throw: some stacks simply
                // return -1 early. Comparing against the declared length is what turns a silent
                // truncation into a failure here rather than a digest mismatch later.
                if (declared > 0 && written != declared) {
                    throw new IOException("下載中斷：只收到 " + written + " / " + declared
                            + " bytes");
                }
                if (expectedBytes > 0 && written != expectedBytes) {
                    throw new IOException("下載中斷：只收到 " + written + " / " + expectedBytes
                            + " bytes");
                }
            } finally {
                connection.disconnect();
            }
        }

        private HttpURLConnection open(String url) throws IOException {
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
            connection.setReadTimeout(READ_TIMEOUT_MILLIS);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("User-Agent", userAgent);
            // The pointer file is small and changes on every release; a cached copy is the one
            // thing that would make an update invisible to a phone that is otherwise doing
            // everything right.
            connection.setRequestProperty("Cache-Control", "no-cache");
            connection.setUseCaches(false);
            return connection;
        }
    }
}
