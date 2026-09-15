package com.bigxreality.jorjinverifier.ota;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;

/** SHA-256, over a file or a stream, as lower-case hex. */
public final class Digests {

    /** 64 KiB: large enough that an 80 MiB bundle is not a million syscalls, small enough on a phone. */
    private static final int CHUNK = 64 * 1024;

    private Digests() { }

    public static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException impossible) {
            // Every Android release and every JVM ships SHA-256; there is no fallback worth having.
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }

    public static String of(File file) throws IOException {
        try (InputStream in = new FileInputStream(file)) {
            return of(in);
        }
    }

    /** Consumes the stream. Does not close it - the caller owns it. */
    public static String of(InputStream in) throws IOException {
        MessageDigest digest = sha256();
        byte[] buffer = new byte[CHUNK];
        for (int read = in.read(buffer); read >= 0; read = in.read(buffer)) {
            digest.update(buffer, 0, read);
        }
        return hex(digest.digest());
    }

    public static String hex(byte[] bytes) {
        StringBuilder text = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) text.append(String.format(Locale.ROOT, "%02x", value));
        return text.toString();
    }

    /**
     * Constant-time-ish equality for two hex digests, case-insensitively.
     *
     * <p>Not a security boundary - the bundle is not a secret - but comparing with {@code equals}
     * on a string that arrived from the network is the kind of thing that gets copied into places
     * where it is one.
     */
    public static boolean matches(String expected, String actual) {
        if (expected == null || actual == null) return false;
        if (expected.length() != actual.length()) return false;
        int difference = 0;
        for (int i = 0; i < expected.length(); i++) {
            difference |= Character.toLowerCase(expected.charAt(i))
                    ^ Character.toLowerCase(actual.charAt(i));
        }
        return difference == 0;
    }
}
