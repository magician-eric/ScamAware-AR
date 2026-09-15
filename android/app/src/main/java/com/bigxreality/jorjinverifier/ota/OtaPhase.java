package com.bigxreality.jorjinverifier.ota;

/**
 * What the update mechanism is doing right now, named so a person can be told about it.
 *
 * <p>Distinct from {@link OtaUpdater.Outcome}, which is what one attempt <em>ended</em> as. An
 * outcome exists only after the attempt is over; these exist while it is running, which is the
 * half a staff member watching a screen needs - "正在下載" is not an outcome and never appears in
 * a {@code Result}.
 *
 * <p>Strings rather than an enum because the only consumer outside this package is JavaScript:
 * these values travel through {@link OtaUpdateStatus#toJson()} into {@code window.__cibarOtaStatus}
 * and are mapped to wording by the staff screen in {@code webapp/src/lib/ota/}. The web side owns
 * the wording; this side owns the states. Nothing in the player-facing experience may read them -
 * they exist for the staff management mode and for diagnostics.
 */
public final class OtaPhase {

    /** Nothing has been asked of the update mechanism yet this session. */
    public static final String IDLE = "idle";
    /** latest.json has been requested and no answer has come back yet. */
    public static final String CHECKING = "checking";
    /** The server answered and this phone already has that release, or newer. */
    public static final String UP_TO_DATE = "up-to-date";
    /** The server published something newer that this shell will accept. Not fetched yet. */
    public static final String UPDATE_AVAILABLE = "update-available";
    /** The archive is being fetched. */
    public static final String DOWNLOADING = "downloading";
    /** The archive is being hashed, unpacked and checked against its manifest. */
    public static final String VERIFYING = "verifying";
    /** Verified and staged. It becomes active at the next cold launch, never in this session. */
    public static final String READY_FOR_RESTART = "ready-for-restart";
    /** An attempt ended badly. The active bundle is untouched; the reason is in the detail. */
    public static final String FAILED = "failed";
    /** No usable answer from the network - no route, a captive portal, a server that is down. */
    public static final String OFFLINE = "offline";
    /** The published bundle needs a newer APK Shell than this one. Refused, not failed. */
    public static final String SHELL_TOO_OLD = "shell-too-old";

    private OtaPhase() { }
}
