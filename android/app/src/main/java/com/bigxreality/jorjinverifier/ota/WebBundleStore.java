package com.bigxreality.jorjinverifier.ota;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Which web bundles this phone has, which one is running, and what happens at the next launch.
 *
 * <h2>The four roles</h2>
 * <pre>
 *   baseline   assets/cibar/ inside the APK. Always present, never written to, and the answer of
 *              last resort. A phone that has never seen a network runs this and runs it whole.
 *   active     the bundle actually being served this session. Either the baseline or one of the
 *              directories under versions/.
 *   previous   the bundle that was active before the current one. What a rollback returns to.
 *   pending    downloaded, verified, and NOT loaded this session. It becomes active at the next
 *              launch and not one moment sooner.
 * </pre>
 *
 * <h2>Where they live</h2>
 * <pre>
 *   &lt;filesDir&gt;/webbundle/
 *     state.json          which version has which role - the only mutable file (WebBundleState)
 *     versions/&lt;version&gt;/ one verified bundle per directory, written once, never edited
 *     staging/            scratch: the download, and the tree being unpacked and checked
 * </pre>
 *
 * The roles are pointers into {@code versions/} rather than directories named after themselves.
 * {@link WebBundleState} explains why: promoting by renaming three directories cannot survive a
 * crash between the renames, and promoting by rewriting one small file atomically can.
 *
 * <h2>The rule the whole design exists for</h2>
 * A download in progress, a verification that fails, a phone that loses power mid-extraction - none
 * of them may touch {@code active}. Nothing outside {@code staging/} is written until a bundle has
 * been proven complete, and the only write that then happens is a rename into {@code versions/}
 * plus one atomic pointer update. The bundle the wearer is using is not a participant in any of it.
 */
public final class WebBundleStore {

    /** So a test can decide what "now" is without waiting for it. */
    public interface Clock {
        long nowMillis();
    }

    static final String STATE_FILE = "state.json";
    static final String VERSIONS_DIR = "versions";
    static final String STAGING_DIR = "staging";

    /** The manifest each installed bundle keeps beside its files, put there by the publisher. */
    public static final String MANIFEST_ENTRY = "cibar-bundle-manifest.json";

    /**
     * How many launches may start without one finishing before the active bundle is rolled back.
     *
     * <p>Two, not one. A wearer who opens the app and immediately backgrounds it never reaches
     * {@code onPageFinished}, and rolling back a perfectly good update because somebody changed
     * their mind about opening the app would silently undo the update on a phone where nothing is
     * wrong. Two consecutive launches that never got the page up is a bundle that does not run.
     *
     * <p>This is the backstop, not the main path: a WebView that reports a failed load rolls back
     * immediately, in the same session, through {@link #rollbackAfterFailure}. This one catches
     * what that cannot see - a bundle whose page takes the process down with it.
     */
    static final int MAX_UNCONFIRMED_LAUNCHES = 2;

    private final File root;
    private final File stateFile;
    private final File versionsRoot;
    private final File stagingRoot;
    private final String baselineVersion;
    private final String shellVersion;
    private final String basePath;
    private final OtaLog log;
    private final Clock clock;

    private WebBundleState state = WebBundleState.defaults();
    private WebBundle active;

    public WebBundleStore(File root, String baselineVersion, String shellVersion,
                          String basePath, OtaLog log, Clock clock) {
        this.root = root;
        this.stateFile = new File(root, STATE_FILE);
        this.versionsRoot = new File(root, VERSIONS_DIR);
        this.stagingRoot = new File(root, STAGING_DIR);
        this.baselineVersion = BundleVersion.isValid(baselineVersion)
                ? baselineVersion : BundleVersion.UNKNOWN;
        this.shellVersion = SemanticVersion.isValid(shellVersion)
                ? shellVersion : ShellVersion.UNKNOWN;
        // Not defaulted the way the two versions above are. An unreadable version has a
        // conservative reading - oldest possible shell, bundle that demands nothing - but there is
        // no conservative base path: any value we invented here would be a path some bundle could
        // match by accident. Kept as given, and BundleRequirements refuses everything when it is
        // empty, which leaves the phone on the APK's baseline.
        this.basePath = basePath;
        this.log = log == null ? OtaLog.NONE : log;
        this.clock = clock == null ? System::currentTimeMillis : clock;
    }

    public WebBundleStore(File root, String baselineVersion, String shellVersion,
                          String basePath, OtaLog log) {
        this(root, baselineVersion, shellVersion, basePath, log, null);
    }

    // ------------------------------------------------------------------ launch

    /**
     * Decides what to serve this session, and returns it. Called once, on the main thread, before
     * the WebView is asked for anything - it is a handful of stat calls and one small file write,
     * never a download and never a digest of 80 MiB.
     *
     * <p>In order: throw away last session's scratch, roll back if the previous launch never got
     * the page up, promote anything that was staged, then resolve what is left to something that
     * actually exists - falling back through previous to the baseline rather than returning a
     * directory the WebView would render as a white screen.
     */
    public synchronized WebBundle openForLaunch() {
        state = WebBundleState.read(stateFile, log);
        deleteRecursively(stagingRoot);

        rollbackIfLastLaunchNeverFinished();
        promotePendingBundle();
        active = resolveActive();

        state.launchAttempts = state.launchAttempts + 1;
        state.launchConfirmed = false;
        persist();
        collectGarbage();
        log.line("OTA：本次啟動使用 " + active + "（APK 內建 " + baselineVersion
                + "，待生效 " + describe(state.pendingVersion) + "）");
        return active;
    }

    /** The bundle {@link #openForLaunch} chose, or null before it has been called. */
    public synchronized WebBundle activeBundle() {
        return active;
    }

    /**
     * The page came up. Clears the crash counter, so this bundle is no longer a rollback candidate.
     *
     * <p>Called from {@code onPageFinished} for the entry document and nowhere else: what is being
     * recorded is "this bundle can render its own entry point", which is exactly the thing a
     * rollback exists to detect the absence of.
     */
    public synchronized void markLaunchSucceeded() {
        if (state.launchConfirmed && state.launchAttempts == 0) return;
        state.launchConfirmed = true;
        state.launchAttempts = 0;
        persist();
    }

    /**
     * The active bundle failed to load. Demotes it and returns what to load instead - the previous
     * bundle, or the APK baseline when there is no previous one or it is gone too.
     *
     * <p>The failed version's directory stops being referenced, so the next
     * {@link #collectGarbage()} deletes it. That is deliberate: a bundle that could not render its
     * own entry point must not be promoted again by a later update check finding it "already
     * staged", and 80 MiB of proven-broken files is not worth keeping.
     */
    public synchronized WebBundle rollbackAfterFailure(String reason) {
        String failed = state.activeVersion;
        if (failed == null) {
            // Already on the baseline: there is nothing below it, and nothing to demote. The
            // baseline is packaged in a signed APK - if it will not load, no rearrangement of
            // pointers is going to help, and the message is what the tester needs.
            log.line("OTA：APK 內建版本載入失敗（" + reason + "）；已經沒有更底層的版本可以退回");
            state.lastRollbackReason = "APK 內建版本載入失敗：" + reason;
            persist();
            return active;
        }
        state.activeVersion = state.previousVersion;
        state.previousVersion = null;
        state.lastRollbackReason = failed + " 載入失敗：" + reason;
        state.launchConfirmed = false;
        state.launchAttempts = 1;
        log.line("OTA：" + state.lastRollbackReason + "，退回 " + describe(state.activeVersion));
        active = resolveActive();
        persist();
        collectGarbage();
        return active;
    }

    // ------------------------------------------------------------------ staging

    /** Scratch space for the updater: the download, and the tree being unpacked. Wiped freely. */
    public synchronized File stagingDirectory() {
        //noinspection ResultOfMethodCallIgnored
        stagingRoot.mkdirs();
        return stagingRoot;
    }

    /** Where a verified bundle lives once installed. */
    public File versionDirectory(String version) {
        return new File(versionsRoot, version);
    }

    /**
     * Takes a fully verified tree out of staging and makes it the pending bundle.
     *
     * <p>This is the only moment the update mechanism writes anything outside {@code staging/}, and
     * it is two operations: a rename (staging and versions are in the same directory tree, so it is
     * an inode move, not a copy of 80 MiB) and one atomic pointer write. The active bundle is not
     * touched, and will not be until the next launch.
     */
    public synchronized void stagePending(String version, File verifiedTree) throws OtaException {
        File target = versionDirectory(version);
        if (!versionsRoot.isDirectory() && !versionsRoot.mkdirs()) {
            throw new OtaException("無法建立 versions 目錄：" + versionsRoot);
        }
        if (target.exists()) deleteRecursively(target);
        if (!verifiedTree.renameTo(target)) {
            throw new OtaException("無法把驗證過的 bundle 移入 " + target
                    + "（來源 " + verifiedTree + "）");
        }
        state.pendingVersion = version;
        state.lastSuccessfulUpdateAt = clock.nowMillis();
        state.lastUpdateError = "";
        persist();
        log.line("OTA：" + version + " 已下載並驗證完成，下次啟動生效（本次維持 "
                + (active == null ? "—" : active.version) + "）");
        collectGarbage();
    }

    // ------------------------------------------------------------------ bookkeeping

    public synchronized void recordCheck(String latestRemoteVersion) {
        state.lastCheckAt = clock.nowMillis();
        if (latestRemoteVersion != null) state.latestRemoteVersion = latestRemoteVersion;
        persist();
    }

    public synchronized void recordError(String message) {
        state.lastUpdateError = message == null ? "" : message;
        state.lastCheckAt = clock.nowMillis();
        persist();
    }

    public synchronized void clearError() {
        if (state.lastUpdateError.isEmpty()) return;
        state.lastUpdateError = "";
        persist();
    }

    public synchronized String activeVersion() {
        return active != null ? active.version
                : (state.activeVersion == null ? baselineVersion : state.activeVersion);
    }

    public synchronized String pendingVersion() {
        return state.pendingVersion;
    }

    public String baselineVersion() {
        return baselineVersion;
    }

    /**
     * The mount prefix every bundle this store accepts must have been built for.
     *
     * <p>Read by {@link OtaUpdater} so the install-time gate and the launch-time gate ask the same
     * question of the same value, rather than each being handed one.
     */
    public String basePath() {
        return basePath;
    }

    /** Everything a tester can be asked to read back over adb. See {@link OtaDiagnostics}. */
    public synchronized OtaDiagnostics diagnostics() {
        return new OtaDiagnostics(shellVersion, baselineVersion, activeVersion(),
                state.previousVersion, state.pendingVersion, state.latestRemoteVersion,
                state.lastCheckAt, state.lastSuccessfulUpdateAt, state.lastUpdateError,
                state.lastRollbackReason,
                active == null ? "—" : active.source.name(), state.launchConfirmed);
    }

    // ------------------------------------------------------------------ internals

    private void rollbackIfLastLaunchNeverFinished() {
        if (state.activeVersion == null) {
            // The baseline cannot be rolled back and cannot be damaged. Reset the counter so a
            // phone that was force-closed twice on the baseline does not carry a raised counter
            // into the first bundle it later installs.
            state.launchAttempts = 0;
            return;
        }
        if (state.launchConfirmed || state.launchAttempts < MAX_UNCONFIRMED_LAUNCHES) return;
        String failed = state.activeVersion;
        state.activeVersion = state.previousVersion;
        state.previousVersion = null;
        state.launchConfirmed = false;
        state.launchAttempts = 0;
        state.lastRollbackReason = failed + " 連續 " + MAX_UNCONFIRMED_LAUNCHES
                + " 次啟動都沒有把畫面載出來，已自動退回";
        log.line("OTA：" + state.lastRollbackReason);
    }

    private void promotePendingBundle() {
        String pending = state.pendingVersion;
        if (pending == null) return;
        File directory = versionDirectory(pending);
        String problem = whyUnusable(directory);
        if (problem != null) {
            log.line("OTA：待生效的 " + pending + " 已經不完整（" + problem + "），放棄它");
            state.pendingVersion = null;
            state.lastUpdateError = "待生效的 " + pending + " 不完整：" + problem;
            return;
        }
        state.previousVersion = state.activeVersion;
        state.activeVersion = pending;
        state.pendingVersion = null;
        state.launchConfirmed = false;
        state.launchAttempts = 0;
        state.lastPromotionAt = clock.nowMillis();
        state.lastRollbackReason = "";
        log.line("OTA：" + pending + " 於本次啟動正式生效（上一版 "
                + describe(state.previousVersion) + " 保留為退路）");
    }

    /**
     * The active pointer resolved to something that exists, walking down to the baseline rather
     * than handing back a directory the WebView would render as a white screen.
     */
    private WebBundle resolveActive() {
        for (int guard = 0; guard < 2 && state.activeVersion != null; guard++) {
            File directory = versionDirectory(state.activeVersion);
            String problem = whyUnusable(directory);
            if (problem == null) {
                return new WebBundle(state.activeVersion, directory, WebBundle.Source.OTA);
            }
            log.line("OTA：啟用中的 " + state.activeVersion + " 無法使用（" + problem + "），退回 "
                    + describe(state.previousVersion));
            state.lastRollbackReason = state.activeVersion + " 無法使用：" + problem;
            state.activeVersion = state.previousVersion;
            state.previousVersion = null;
            state.launchConfirmed = false;
        }
        return WebBundle.baseline(baselineVersion);
    }

    /**
     * The launch-time integrity gate: why this directory is not a usable bundle, or null.
     *
     * <p>Existence and length of every file the manifest declares - not their digests. Hashing
     * 80 MiB on the main thread would put a second onto every cold start for a check whose real
     * job was done at install time, and the failure this gate is actually for is a tree that got
     * truncated or partly deleted afterwards, which lengths catch. A file whose contents changed
     * without its length changing is not a failure mode internal storage has.
     *
     * <p>It also asks {@link BundleRequirements} whether the bundle was built for the path this
     * shell mounts bundles at, which is the one check here that can fail on a tree that is
     * perfectly intact. An APK installed over a previous one keeps {@code filesDir}, so a phone
     * upgraded across a base path change still has the old path's bundle sitting in
     * {@code versions/} with its state pointing at it - and the manifest's own
     * {@code minShellVersion} gate waves it through, because a newer shell does satisfy an older
     * requirement. Failing here routes it into the fallback below like any other unusable
     * directory: no separate path, no special case, and the wearer gets the APK's baseline instead
     * of a white screen.
     */
    private String whyUnusable(File directory) {
        if (directory == null || !directory.isDirectory()) return "目錄不存在";
        File manifestFile = new File(directory, MANIFEST_ENTRY);
        if (!manifestFile.isFile()) return "缺少 " + MANIFEST_ENTRY;
        try {
            String json = new String(Files.readAllBytes(manifestFile.toPath()),
                    StandardCharsets.UTF_8);
            OtaManifest manifest = OtaManifest.parse(json);
            if (!SemanticVersion.satisfies(shellVersion, manifest.minShellVersion)) {
                return "需要 Shell " + manifest.minShellVersion
                        + "，這支 APK 是 " + shellVersion;
            }
            for (OtaManifest.Entry entry : manifest.files) {
                File file = new File(directory, entry.path);
                if (!file.isFile()) return "缺少檔案 " + entry.path;
                if (file.length() != entry.bytes) {
                    return entry.path + " 長度不對（" + file.length() + " ≠ " + entry.bytes + "）";
                }
            }
            BundleRequirements.assertComplete(manifest, directory, basePath);
            return null;
        } catch (IOException | OtaException broken) {
            return String.valueOf(broken.getMessage());
        }
    }

    /** Deletes every installed version no role points at. */
    public synchronized void collectGarbage() {
        File[] installed = versionsRoot.listFiles();
        if (installed == null) return;
        Set<String> keep = new HashSet<>();
        if (state.activeVersion != null) keep.add(state.activeVersion);
        if (state.previousVersion != null) keep.add(state.previousVersion);
        if (state.pendingVersion != null) keep.add(state.pendingVersion);
        for (File directory : installed) {
            if (keep.contains(directory.getName())) continue;
            log.line("OTA：清掉沒有人指向的 bundle " + directory.getName());
            deleteRecursively(directory);
        }
    }

    /** The versions currently on disk, for diagnostics and tests. */
    public synchronized List<String> installedVersions() {
        List<String> names = new ArrayList<>();
        File[] installed = versionsRoot.listFiles();
        if (installed == null) return names;
        for (File directory : installed) if (directory.isDirectory()) names.add(directory.getName());
        java.util.Collections.sort(names);
        return names;
    }

    private void persist() {
        try {
            state.write(stateFile);
        } catch (IOException failed) {
            // Nothing to do about it, and nothing that should stop the experience: the pointers
            // simply stay where they were, which means the phone keeps running what it is running.
            log.line("OTA：狀態檔寫入失敗（" + failed.getMessage() + "）；本次的變更不會保留");
        }
    }

    private static String describe(String version) {
        return version == null ? "APK 內建版本" : version;
    }

    /** Recursive delete that does not follow into anything it should not; missing is success. */
    static void deleteRecursively(File target) {
        if (target == null || !target.exists()) return;
        File[] children = target.isDirectory() ? target.listFiles() : null;
        if (children != null) for (File child : children) deleteRecursively(child);
        //noinspection ResultOfMethodCallIgnored
        target.delete();
    }

    /** The root this store owns, for tests and for the diagnostics dump. */
    public File rootDirectory() {
        return root;
    }
}
