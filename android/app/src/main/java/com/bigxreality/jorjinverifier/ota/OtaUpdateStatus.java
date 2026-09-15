package com.bigxreality.jorjinverifier.ota;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * One live snapshot of the update mechanism: which {@link OtaPhase} it is in, why, and whether a
 * worker is still busy with it.
 *
 * <p>{@link OtaDiagnostics} answers "what happened, over the life of this install" and is read off
 * {@code state.json}; this answers "what is happening, right now" and is held in memory. They are
 * published side by side ({@code window.__cibarOta} and {@code window.__cibarOtaStatus}) because a
 * staff screen needs both: the versions come from the first, the spinner from the second.
 *
 * <p>{@code detail} is the technical sentence the update mechanism already produces - a decision
 * reason, an IO message. The staff screen shows wording derived from {@code phase} and keeps
 * {@code detail} for the diagnostics line beneath it, so a person is never handed a raw error as
 * the whole answer.
 */
public final class OtaUpdateStatus {

    /** One of the {@link OtaPhase} constants. */
    public final String phase;
    /** Why - free text, in Chinese, from whichever step produced it. May be empty, never null. */
    public final String detail;
    /** The remote release this phase is about, or null before one has been named. */
    public final String version;
    /** Whether a worker is still running. A phase alone cannot say: FAILED is never busy. */
    public final boolean busy;
    /** Milliseconds since the epoch, from the store's clock. */
    public final long updatedAt;

    public OtaUpdateStatus(String phase, String detail, String version, boolean busy,
                           long updatedAt) {
        this.phase = phase == null ? OtaPhase.IDLE : phase;
        this.detail = detail == null ? "" : detail;
        this.version = version;
        this.busy = busy;
        this.updatedAt = updatedAt;
    }

    public static OtaUpdateStatus idle() {
        return new OtaUpdateStatus(OtaPhase.IDLE, "", null, false, 0L);
    }

    public OtaUpdateStatus busy(boolean nowBusy) {
        return new OtaUpdateStatus(phase, detail, version, nowBusy, updatedAt);
    }

    public String toJson() {
        JSONObject root = new JSONObject();
        try {
            root.put("phase", phase);
            root.put("detail", detail);
            root.put("version", version == null ? JSONObject.NULL : version);
            root.put("busy", busy);
            root.put("updatedAt", updatedAt);
        } catch (JSONException impossible) {
            return "{}";
        }
        return root.toString();
    }

    @Override public String toString() {
        return phase + (detail.isEmpty() ? "" : "：" + detail);
    }
}
