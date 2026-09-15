package com.bigxreality.jorjinverifier.ota;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/**
 * Which bundle is which - the single mutable fact in the whole update mechanism.
 *
 * <p>Bundle directories are immutable once verified: {@code versions/<version>/} is written once
 * and never edited. Everything that changes - which version is active, which is the fallback,
 * which is waiting for the next launch - changes here, in one small file, written atomically.
 *
 * <h2>Why a pointer file rather than directories named active/ and previous/</h2>
 * Promotion would otherwise be three renames (drop previous, active becomes previous, staged
 * becomes active) with no way to survive a crash between them: the phone would come up with two
 * directories called something they are not. Here it is one rename of one small file - write
 * {@code state.json.tmp}, sync it, rename it over {@code state.json} - and a rename on a POSIX
 * filesystem either happened or did not. A crash at any point leaves the phone reading either the
 * old set of pointers or the new one, both of which are consistent, and at worst an orphaned
 * directory that {@code WebBundleStore.collectGarbage()} deletes on the next launch.
 *
 * <h2>Why launchAttempts is in here</h2>
 * It is what makes a bundle that <em>crashes</em> recoverable. Every launch increments it and
 * clears {@code launchConfirmed}; the page reaching {@code onPageFinished} sets it back. A launch
 * that starts and finds the counter already raised is a launch that follows one which never got
 * that far - so the active bundle is rolled back before it is loaded a second time, rather than
 * the wearer meeting the same white screen twice.
 */
public final class WebBundleState {

    /** The APK's built-in baseline is the active bundle. Never a version string, always null. */
    public String activeVersion;
    /** The bundle to fall back to when the active one will not run. Null means the baseline. */
    public String previousVersion;
    /** Downloaded, verified, and waiting for the next launch. Never loaded this session. */
    public String pendingVersion;

    /** Whether {@link #activeVersion} has ever completed a launch. */
    public boolean launchConfirmed;
    /** Launches of {@link #activeVersion} that have started. Reset by a confirmed launch. */
    public int launchAttempts;

    public long lastCheckAt;
    public long lastSuccessfulUpdateAt;
    public long lastPromotionAt;
    public String lastUpdateError = "";
    public String latestRemoteVersion = "";
    public String lastRollbackReason = "";

    /** A state file this shell does not understand is replaced by defaults, not guessed at. */
    static WebBundleState defaults() {
        return new WebBundleState();
    }

    /**
     * Reads the pointer file, falling back to defaults for anything unreadable.
     *
     * <p>Defaults rather than an exception on purpose: a corrupt pointer file means the phone
     * forgets which downloaded bundle was active and starts from the APK's baseline, which is a
     * complete working experience. Refusing to start would be a worse answer to a file this class
     * is the only writer of.
     */
    public static WebBundleState read(File file, OtaLog log) {
        if (!file.isFile()) return defaults();
        try {
            String json = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            JSONObject root = new JSONObject(json);
            if (root.optInt("schema", -1) != ShellVersion.SCHEMA) {
                log.line("OTA 狀態檔的 schema 不認得，改用預設值（回到 APK 內建版本）");
                return defaults();
            }
            WebBundleState state = new WebBundleState();
            state.activeVersion = optVersion(root, "activeVersion");
            state.previousVersion = optVersion(root, "previousVersion");
            state.pendingVersion = optVersion(root, "pendingVersion");
            state.launchConfirmed = root.optBoolean("launchConfirmed", false);
            state.launchAttempts = Math.max(0, root.optInt("launchAttempts", 0));
            state.lastCheckAt = root.optLong("lastCheckAt", 0L);
            state.lastSuccessfulUpdateAt = root.optLong("lastSuccessfulUpdateAt", 0L);
            state.lastPromotionAt = root.optLong("lastPromotionAt", 0L);
            state.lastUpdateError = root.optString("lastUpdateError", "");
            state.latestRemoteVersion = root.optString("latestRemoteVersion", "");
            state.lastRollbackReason = root.optString("lastRollbackReason", "");
            return state;
        } catch (IOException | JSONException unreadable) {
            log.line("OTA 狀態檔讀不出來（" + unreadable.getMessage() + "），改用預設值");
            return defaults();
        }
    }

    /** A version field, or null - an unparseable one is dropped rather than carried forward. */
    private static String optVersion(JSONObject root, String key) {
        String value = root.optString(key, "");
        return BundleVersion.isValid(value) ? value : null;
    }

    /**
     * Writes the pointer file atomically.
     *
     * <p>Temporary file, flush, {@code sync()}, rename. The sync is what makes the rename mean
     * something: without it the rename can reach the directory before the contents reach the
     * disk, and a phone that loses power in that window comes up with a state file that points at
     * a version it can see and cannot read.
     */
    public void write(File file) throws IOException {
        JSONObject root = new JSONObject();
        String json;
        try {
            root.put("schema", ShellVersion.SCHEMA);
            root.put("activeVersion", activeVersion == null ? JSONObject.NULL : activeVersion);
            root.put("previousVersion", previousVersion == null ? JSONObject.NULL : previousVersion);
            root.put("pendingVersion", pendingVersion == null ? JSONObject.NULL : pendingVersion);
            root.put("launchConfirmed", launchConfirmed);
            root.put("launchAttempts", launchAttempts);
            root.put("lastCheckAt", lastCheckAt);
            root.put("lastSuccessfulUpdateAt", lastSuccessfulUpdateAt);
            root.put("lastPromotionAt", lastPromotionAt);
            root.put("lastUpdateError", lastUpdateError);
            root.put("latestRemoteVersion", latestRemoteVersion);
            root.put("lastRollbackReason", lastRollbackReason);
            // Indented, and therefore inside this try: Android's JSONObject.toString(int) is
            // declared to throw, unlike its no-argument sibling and unlike the reference
            // org.json build. Worth the two lines - this file is read back off a phone over adb
            // when an update did not appear, and a single line of JSON is a poor thing to read.
            json = root.toString(2);
        } catch (JSONException impossible) {
            throw new IOException("無法組出 OTA 狀態 JSON", impossible);
        }

        File parent = file.getParentFile();
        if (parent != null && !parent.isDirectory() && !parent.mkdirs()) {
            throw new IOException("無法建立 OTA 狀態目錄：" + parent);
        }
        File temporary = new File(file.getParentFile(), file.getName() + ".tmp");
        try (FileOutputStream out = new FileOutputStream(temporary);
             Writer writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {
            writer.write(json);
            writer.flush();
            out.getFD().sync();
        }
        if (!temporary.renameTo(file)) {
            // A rename within one directory does not fail on a working filesystem; if it does,
            // leaving the old pointers in place is the safe answer - the phone keeps running what
            // it is running.
            temporary.delete();
            throw new IOException("無法更新 OTA 狀態檔：" + file);
        }
    }
}
