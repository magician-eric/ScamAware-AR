package com.bigxreality.jorjinverifier.ota;

/**
 * An update that will not be installed, and why.
 *
 * <p>Checked, and deliberately so. Every path that can reject a bundle - a malformed manifest, a
 * digest that does not match, a shell too old, a truncated download - has to be handled by
 * somebody, and the handling is always the same shape: delete the staged copy, record the reason
 * for diagnostics, and leave the running bundle exactly as it was. An unchecked exception would
 * let one of those paths escape to a default handler and take the running experience down with
 * it, which is the one thing an update mechanism must never do.
 */
public class OtaException extends Exception {

    public OtaException(String message) {
        super(message);
    }

    public OtaException(String message, Throwable cause) {
        super(message, cause);
    }
}
