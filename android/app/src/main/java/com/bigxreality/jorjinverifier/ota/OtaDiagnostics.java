package com.bigxreality.jorjinverifier.ota;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * What the update mechanism did, in a form somebody can read back off a phone.
 *
 * <p>Deliberately not a screen. The app has no UI at all - launching it opens CIBAR - and adding
 * an update panel would put an engineering surface back in front of a wearer, which
 * {@code ProductionStartupTest} exists to prevent. This travels three ways instead, all of them
 * invisible in normal use:
 *
 * <ul>
 *   <li>Logcat, one line per launch and one per update attempt ({@code adb logcat -s JorjinOta});</li>
 *   <li>{@code window.__cibarOta} inside the page, so the existing hidden staff entry can show it
 *       without the shell growing a second diagnostics system;</li>
 *   <li>{@code ota-diagnostics.json} in the app's external files directory, so a tester can pull
 *       it with the Files app after a session that went wrong.</li>
 * </ul>
 *
 * <p>The fields are chosen to answer the questions that actually get asked when an update did not
 * appear: is the phone even checking ({@code lastUpdateCheck}), did it see a newer version
 * ({@code latestRemoteVersion}), did it fail and why ({@code lastUpdateError}), and is it waiting
 * for a relaunch ({@code pendingVersion}).
 */
public final class OtaDiagnostics {

    public final String shellVersion;
    public final String bundledVersion;
    public final String activeVersion;
    public final String previousVersion;
    public final String pendingVersion;
    public final String latestRemoteVersion;
    public final long lastUpdateCheck;
    public final long lastSuccessfulUpdate;
    public final String lastUpdateError;
    public final String lastRollbackReason;
    /** {@code APK_BASELINE} or {@code OTA} - see {@link WebBundle.Source}. */
    public final String bundleSource;
    public final boolean activeLaunchConfirmed;

    OtaDiagnostics(String shellVersion, String bundledVersion, String activeVersion,
                   String previousVersion, String pendingVersion, String latestRemoteVersion,
                   long lastUpdateCheck, long lastSuccessfulUpdate, String lastUpdateError,
                   String lastRollbackReason, String bundleSource, boolean activeLaunchConfirmed) {
        this.shellVersion = shellVersion;
        this.bundledVersion = bundledVersion;
        this.activeVersion = activeVersion;
        this.previousVersion = previousVersion;
        this.pendingVersion = pendingVersion;
        this.latestRemoteVersion = latestRemoteVersion;
        this.lastUpdateCheck = lastUpdateCheck;
        this.lastSuccessfulUpdate = lastSuccessfulUpdate;
        this.lastUpdateError = lastUpdateError;
        this.lastRollbackReason = lastRollbackReason;
        this.bundleSource = bundleSource;
        this.activeLaunchConfirmed = activeLaunchConfirmed;
    }

    /** The same fields as JSON, which is what reaches the page and the pulled file. */
    public String toJson() {
        JSONObject root = new JSONObject();
        try {
            root.put("shellVersion", shellVersion);
            root.put("schema", ShellVersion.SCHEMA);
            root.put("bundledVersion", bundledVersion);
            root.put("activeVersion", activeVersion);
            root.put("previousVersion", previousVersion == null ? JSONObject.NULL : previousVersion);
            root.put("pendingVersion", pendingVersion == null ? JSONObject.NULL : pendingVersion);
            root.put("latestRemoteVersion", latestRemoteVersion);
            root.put("lastUpdateCheck", lastUpdateCheck);
            root.put("lastSuccessfulUpdate", lastSuccessfulUpdate);
            root.put("lastUpdateError", lastUpdateError);
            root.put("lastRollbackReason", lastRollbackReason);
            root.put("bundleSource", bundleSource);
            root.put("activeLaunchConfirmed", activeLaunchConfirmed);
        } catch (JSONException impossible) {
            return "{}";
        }
        return root.toString();
    }

    /** One Logcat line: everything above, in the order a person reads it. */
    public String toLogLine() {
        return "shell=" + shellVersion
                + " bundled=" + bundledVersion
                + " active=" + activeVersion + "(" + bundleSource + ")"
                + " previous=" + describe(previousVersion)
                + " pending=" + describe(pendingVersion)
                + " latestRemote=" + describe(emptyToNull(latestRemoteVersion))
                + " lastCheck=" + lastUpdateCheck
                + " lastSuccess=" + lastSuccessfulUpdate
                + " error=" + (lastUpdateError.isEmpty() ? "—" : lastUpdateError);
    }

    private static String describe(String value) {
        return value == null ? "—" : value;
    }

    private static String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}
