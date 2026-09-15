package com.bigxreality.jorjinverifier.ota;

import java.io.BufferedReader;
import java.io.Closeable;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/**
 * A one-file HTTP/1.1 server for the OTA tests, built on {@link ServerSocket}.
 *
 * <h2>Why not com.sun.net.httpserver</h2>
 * It is not on the Android unit-test compile classpath. AGP compiles {@code test/} against
 * android.jar, which carries {@code java.*} and {@code android.*} and nothing else, so a JDK-only
 * package resolves on a desktop JVM and fails in CI with {@code cannot find symbol: HttpServer}.
 * That is exactly what happened here. {@code java.net.ServerSocket} is in android.jar, so this
 * compiles in both places and runs on the real JDK sockets in both places.
 *
 * <h2>Why a real socket at all</h2>
 * Most of what the update mechanism has to survive is what HTTP does when things go wrong: a
 * connection that dies half way through 80 MiB, a venue portal answering 200 with a login page, a
 * server that is simply not there. A stubbed transport only ever does what its author imagined.
 * Owning the socket also means owning the framing, which is what lets a test announce a
 * Content-Length and then stop sending - the thing a phone walking out of Wi-Fi range does.
 *
 * <p>Deliberately minimal and deliberately not robust: it speaks to one client at a time per
 * connection, reads the request line, discards the headers, and hands the raw output stream to a
 * handler that writes whatever the test needs it to write.
 */
final class TestHttpServer implements Closeable {

    /** Writes a whole response - status line, headers and body - for one request. */
    interface Handler {
        void handle(String path, OutputStream out) throws IOException;
    }

    private final ServerSocket socket;
    private final Thread acceptLoop;
    private volatile boolean running = true;

    TestHttpServer(Handler handler) throws IOException {
        this.socket = new ServerSocket(0, 0, java.net.InetAddress.getByName("127.0.0.1"));
        this.acceptLoop = new Thread(() -> {
            while (running) {
                try {
                    Socket client = socket.accept();
                    Thread worker = new Thread(() -> serve(client, handler), "ota-test-http-client");
                    worker.setDaemon(true);
                    worker.start();
                } catch (IOException closed) {
                    // accept() throws when close() is called; that is how this loop ends.
                    return;
                }
            }
        }, "ota-test-http");
        this.acceptLoop.setDaemon(true);
        this.acceptLoop.start();
    }

    private static void serve(Socket client, Handler handler) {
        try (Socket open = client) {
            BufferedReader in = new BufferedReader(
                    new InputStreamReader(open.getInputStream(), StandardCharsets.ISO_8859_1));
            String requestLine = in.readLine();
            if (requestLine == null) return;
            // Headers, discarded: nothing here varies on them, and reading to the blank line is
            // what stops the client from blocking on a half-read request.
            for (String line = in.readLine(); line != null && !line.isEmpty(); line = in.readLine()) {
                // deliberately empty
            }
            String[] parts = requestLine.split(" ");
            String path = parts.length > 1 ? parts[1] : "/";
            OutputStream out = open.getOutputStream();
            handler.handle(path, out);
            out.flush();
        } catch (IOException clientWentAway) {
            // A client that hangs up mid-response is several of these tests' whole point.
        }
    }

    /** `http://127.0.0.1:<port>` - what {@code TestHttp} maps the published https origin onto. */
    String origin() {
        return "http://127.0.0.1:" + socket.getLocalPort();
    }

    @Override public void close() {
        running = false;
        try {
            socket.close();
        } catch (IOException ignored) {
            // Nothing left to do about it; the test is over.
        }
        acceptLoop.interrupt();
    }

    // ------------------------------------------------------------------ response helpers

    /** A complete response, written and finished. */
    static void respond(OutputStream out, int status, String contentType, byte[] body)
            throws IOException {
        writeHead(out, status, contentType, body.length);
        out.write(body);
        out.flush();
    }

    /** A response with no body at all - a bare status, for 404 and 503. */
    static void respondEmpty(OutputStream out, int status) throws IOException {
        writeHead(out, status, "text/plain", 0);
        out.flush();
    }

    /**
     * Announces the full length and then sends only part of the body.
     *
     * <p>The connection closing early with a declared Content-Length is a truncated download, and
     * it is the one failure mode that does not announce itself: some HTTP stacks simply return -1
     * from read() rather than throwing.
     */
    static void respondTruncated(OutputStream out, byte[] body, int sendBytes) throws IOException {
        writeHead(out, 200, "application/zip", body.length);
        out.write(body, 0, Math.min(sendBytes, body.length));
        out.flush();
    }

    /** The whole body, dribbled out in chunks, so a download stays in flight while a test runs. */
    static void respondThrottled(OutputStream out, byte[] body, int chunk) throws IOException {
        writeHead(out, 200, "application/zip", body.length);
        for (int at = 0; at < body.length; at += chunk) {
            out.write(body, at, Math.min(chunk, body.length - at));
            out.flush();
            try {
                Thread.sleep(1);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    private static void writeHead(OutputStream out, int status, String contentType, long length)
            throws IOException {
        String head = "HTTP/1.1 " + status + " " + reasonFor(status) + "\r\n"
                + "Content-Type: " + contentType + "\r\n"
                + "Content-Length: " + length + "\r\n"
                + "Connection: close\r\n"
                + "\r\n";
        out.write(head.getBytes(StandardCharsets.ISO_8859_1));
    }

    private static String reasonFor(int status) {
        switch (status) {
            case 200: return "OK";
            case 404: return "Not Found";
            case 503: return "Service Unavailable";
            default: return "Status";
        }
    }
}
