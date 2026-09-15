package com.bigxreality.jorjinverifier.ota;

/**
 * Where this package writes its running commentary.
 *
 * <p>Every class in {@code ota} is deliberately free of {@code android.*}: the update mechanism is
 * a state machine over files and HTTP, and a state machine that can only be exercised on a phone
 * is a state machine nobody exercises. {@code android.util.Log} is the one Android dependency that
 * would otherwise be scattered through all of it, so it enters through here - the app passes a
 * Logcat-backed implementation, the JVM tests pass one that collects lines and asserts on them.
 */
public interface OtaLog {

    /** Discards everything. The default, so no caller has to pass a logger it does not want. */
    OtaLog NONE = message -> { };

    void line(String message);
}
