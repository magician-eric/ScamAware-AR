package com.bigxreality.jorjinverifier.ota;

import java.io.File;
import java.io.IOException;

/**
 * One update attempt, start to finish, on a background thread.
 *
 * <pre>
 *   fetch latest.json  →  decide  →  download bundle.zip  →  verify  →  unpack  →  verify again
 *                                                                                      ↓
 *                                                            stage as "pending" for the NEXT launch
 * </pre>
 *
 * <h2>What it must never do</h2>
 * Touch the running experience. Not the active bundle's files, not the WebView, not the main
 * thread. The wearer walking through scenario 03 while 80 MiB downloads underneath them must not
 * be able to tell that anything is happening - and when the download fails, when the digest does
 * not match, when the server returns a login page, the answer is the same: log it, record it for
 * diagnostics, delete the scratch directory, and leave everything else exactly as it was.
 *
 * <h2>Why the new bundle is not loaded when it is ready</h2>
 * Because it is ready at an arbitrary moment - which is, with the odds against us, the moment a
 * wearer is three choices into a scenario. Swapping the page underneath them would lose the run
 * and look like a crash. The verified bundle becomes {@code pending} and
 * {@link WebBundleStore#openForLaunch()} promotes it the next time the app starts cold, which is
 * the one moment when there is no session to lose.
 *
 * <h2>Retries</h2>
 * Three attempts with a widening gap, and then nothing until the next launch. A venue's Wi-Fi that
 * drops one request usually answers the second; a venue's Wi-Fi that is a captive portal will
 * answer all three with a login page, and a fourth would be no different. Nothing waits on the
 * result, so a slow retry costs the wearer nothing - but an unbounded one would keep the radio and
 * the CPU busy for the whole session for no possible gain.
 */
public final class OtaUpdater {

    public enum Outcome {
        /** Downloaded, verified, and waiting for the next launch. */
        STAGED,
        /**
         * There is a newer release and this shell will take it - but this run was only asked to
         * look. Reachable from {@link #checkOnly()} and from nowhere else: the launch-time run
         * downloads whatever it finds, so for that path this state lasts no time at all.
         */
        UPDATE_AVAILABLE,
        /** The phone already has this version or newer. */
        UP_TO_DATE,
        /** This version was already downloaded on an earlier run. */
        ALREADY_STAGED,
        /** The bundle needs a newer native shell. Refused; the active bundle is untouched. */
        SHELL_TOO_OLD,
        /** No usable answer from the update server - no network, captive portal, server down. */
        UNREACHABLE,
        /** The server answered, and what it said was not something this shell will install. */
        REJECTED,
        /** Downloaded and then failed verification, or could not be written. */
        FAILED,
        /** The app asked it to stop. */
        CANCELLED,
    }

    public static final class Result {
        public final Outcome outcome;
        public final String detail;
        /** The remote version this attempt was about, or null when we never got that far. */
        public final String version;

        Result(Outcome outcome, String detail, String version) {
            this.outcome = outcome;
            this.detail = detail;
            this.version = version;
        }

        public boolean staged() {
            return outcome == Outcome.STAGED;
        }

        @Override public String toString() {
            return outcome + "：" + detail;
        }
    }

    /**
     * Where the attempt has got to, reported as it goes.
     *
     * <p>The launch-time run has nobody to report to and passes {@link Progress#NONE}. A staff
     * member who pressed 檢查更新 does have somebody to report to - themselves - and that is the
     * whole reason this exists: without it the only observable states are "before" and "after",
     * and an 80 MiB download looks identical to a hung request for several minutes.
     *
     * <p>Called on the update thread, so an implementation must not touch anything with thread
     * affinity; the Android side hops to the main thread before it publishes anything.
     */
    public interface Progress {
        Progress NONE = (phase, detail, version) -> { };

        /** @param phase one of the {@link OtaPhase} constants. */
        void phase(String phase, String detail, String version);
    }

    /** So a test does not have to spend the backoff. */
    public interface Sleeper {
        Sleeper REAL = millis -> {
            try {
                Thread.sleep(millis);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
            }
        };

        void sleep(long millis);
    }

    /** Three attempts: immediately, two seconds later, eight seconds after that. */
    static final long[] RETRY_BACKOFF_MILLIS = {0L, 2_000L, 8_000L};

    /**
     * One attempt, no waiting - what a person pressing a button gets.
     *
     * <p>The launch-time run retries because nobody is waiting on it and a venue's Wi-Fi often
     * answers the second request. A staff member watching a screen is waiting on it, and ten
     * seconds of invisible backoff on top of the HTTP timeouts is indistinguishable from a frozen
     * button. They can press it again, which is the same three attempts with someone deciding
     * between them.
     */
    static final long[] SINGLE_ATTEMPT_MILLIS = {0L};

    static final String DOWNLOAD_FILE = "bundle.zip";
    static final String UNPACK_DIR = "unpack";

    private final WebBundleStore store;
    private final OtaHttp http;
    private final String latestUrl;
    private final String shellVersion;
    private final OtaLog log;
    private final Sleeper sleeper;
    private final OtaHttp.Cancellation cancellation;
    private final Progress progress;

    public OtaUpdater(WebBundleStore store, OtaHttp http, String latestUrl, String shellVersion,
                      OtaLog log, Sleeper sleeper, OtaHttp.Cancellation cancellation) {
        this(store, http, latestUrl, shellVersion, log, sleeper, cancellation, Progress.NONE);
    }

    public OtaUpdater(WebBundleStore store, OtaHttp http, String latestUrl, String shellVersion,
                      OtaLog log, Sleeper sleeper, OtaHttp.Cancellation cancellation,
                      Progress progress) {
        this.progress = progress == null ? Progress.NONE : progress;
        this.store = store;
        this.http = http;
        this.latestUrl = latestUrl;
        this.shellVersion = shellVersion;
        this.log = log == null ? OtaLog.NONE : log;
        this.sleeper = sleeper == null ? Sleeper.REAL : sleeper;
        this.cancellation = cancellation == null ? OtaHttp.Cancellation.NEVER : cancellation;
    }

    /**
     * Runs one attempt. Blocking, and never to be called on the main thread.
     *
     * <p>Returns a {@link Result} rather than throwing: there is no caller who could do anything
     * useful with an exception, and every outcome short of {@code STAGED} means the same thing to
     * the wearer, which is nothing at all.
     */
    public Result runOnce() {
        return run(true, RETRY_BACKOFF_MILLIS);
    }

    /**
     * Asks the update server what it has published, and stops there.
     *
     * <p>Same request, same parsing and the same {@link UpdateDecision} as a full run - so a
     * staff screen that says "有新版" is saying it on the strength of the decision that would
     * actually be taken, not on a version-string comparison of its own. One attempt, because
     * somebody is watching; see {@link #SINGLE_ATTEMPT_MILLIS}.
     */
    public Result checkOnly() {
        return run(false, SINGLE_ATTEMPT_MILLIS);
    }

    /**
     * Downloads without asking again whether it is worth it - {@link #checkOnly()} already did.
     *
     * <p>Split from {@code runOnce()} so the staff mode's two buttons are two steps: a check that
     * costs a few hundred bytes, and a download the operator opts into knowing what it is for. It
     * still re-fetches latest.json, because the decision has to be made against what the server
     * says now rather than against what a screen was showing a minute ago.
     */
    public Result downloadNow() {
        return run(true, SINGLE_ATTEMPT_MILLIS);
    }

    private Result run(boolean fetchWhenNewer, long[] schedule) {
        File staging = store.stagingDirectory();
        try {
            return attempt(staging, fetchWhenNewer, schedule);
        } catch (RuntimeException unexpected) {
            // An update must not be able to take the session down. Anything that escapes the
            // handled paths is recorded and swallowed here.
            String detail = "更新流程發生未預期的錯誤：" + unexpected;
            log.line("OTA：" + detail);
            store.recordError(detail);
            return report(new Result(Outcome.FAILED, detail, null), OtaPhase.FAILED);
        } finally {
            WebBundleStore.deleteRecursively(staging);
        }
    }

    private Result attempt(File staging, boolean fetchWhenNewer, long[] schedule) {
        if (cancellation.cancelled()) return new Result(Outcome.CANCELLED, "已取消", null);

        progress.phase(OtaPhase.CHECKING, "正在向更新伺服器詢問最新版本", null);
        String body;
        try {
            body = withRetries("讀取 latest.json", schedule, () -> http.getText(latestUrl));
        } catch (IOException unreachable) {
            // Not an error the wearer ever sees. A phone with no network, a venue portal, or an
            // update server that is down all land here, and all of them mean "carry on with the
            // bundle we have" - which is a complete, working experience.
            String detail = "連不到更新伺服器（" + unreachable.getMessage() + "）；繼續使用目前版本";
            log.line("OTA：" + detail);
            store.recordError(detail);
            return report(new Result(Outcome.UNREACHABLE, detail, null), OtaPhase.OFFLINE);
        }

        OtaLatest latest;
        try {
            latest = OtaLatest.parse(body);
        } catch (OtaException malformed) {
            String detail = "更新伺服器的回應無法解讀：" + malformed.getMessage();
            log.line("OTA：" + detail);
            store.recordError(detail);
            return report(new Result(Outcome.REJECTED, detail, null), OtaPhase.FAILED);
        }

        store.recordCheck(latest.releaseId);
        UpdateDecision decision = UpdateDecision.decide(latest, store.activeVersion(),
                store.pendingVersion(), shellVersion);
        log.line("OTA：" + decision.reason);
        if (!decision.shouldDownload()) {
            switch (decision.action) {
                case ALREADY_CURRENT:
                    store.clearError();
                    return report(new Result(Outcome.UP_TO_DATE, decision.reason, latest.releaseId),
                            OtaPhase.UP_TO_DATE);
                case ALREADY_STAGED:
                    store.clearError();
                    return report(
                            new Result(Outcome.ALREADY_STAGED, decision.reason, latest.releaseId),
                            OtaPhase.READY_FOR_RESTART);
                case SHELL_TOO_OLD:
                    store.recordError(decision.reason);
                    return report(
                            new Result(Outcome.SHELL_TOO_OLD, decision.reason, latest.releaseId),
                            OtaPhase.SHELL_TOO_OLD);
                default:
                    store.recordError(decision.reason);
                    return report(new Result(Outcome.REJECTED, decision.reason, latest.releaseId),
                            OtaPhase.FAILED);
            }
        }

        if (!fetchWhenNewer) {
            store.clearError();
            return report(
                    new Result(Outcome.UPDATE_AVAILABLE, decision.reason, latest.releaseId),
                    OtaPhase.UPDATE_AVAILABLE);
        }

        progress.phase(OtaPhase.DOWNLOADING, "正在下載 " + latest.releaseId, latest.releaseId);
        File archive = new File(staging, DOWNLOAD_FILE);
        try {
            withRetries("下載 bundle.zip", schedule, () -> {
                http.download(latest.bundleUrl, archive, latest.sizeBytes, cancellation);
                return null;
            });
        } catch (IOException interrupted) {
            if (cancellation.cancelled()) {
                return new Result(Outcome.CANCELLED, "下載已取消", latest.releaseId);
            }
            String detail = "下載 " + latest.releaseId + " 中斷：" + interrupted.getMessage()
                    + "；繼續使用目前版本";
            log.line("OTA：" + detail);
            store.recordError(detail);
            return report(new Result(Outcome.UNREACHABLE, detail, latest.releaseId),
                    OtaPhase.OFFLINE);
        }

        progress.phase(OtaPhase.VERIFYING, "正在驗證 " + latest.releaseId, latest.releaseId);
        File unpacked = new File(staging, UNPACK_DIR);
        try {
            BundleInstaller.unpackAndVerify(archive, latest.sha256, latest.releaseId, unpacked,
                    shellVersion, store.basePath(), log);
            store.stagePending(latest.releaseId, unpacked);
        } catch (OtaException rejected) {
            String detail = latest.releaseId + " 驗證失敗，已丟棄：" + rejected.getMessage();
            log.line("OTA：" + detail);
            store.recordError(detail);
            return report(new Result(Outcome.FAILED, detail, latest.releaseId), OtaPhase.FAILED);
        }
        //noinspection ResultOfMethodCallIgnored
        archive.delete();
        return report(new Result(Outcome.STAGED, latest.releaseId + " 已就緒，下次啟動生效",
                latest.releaseId), OtaPhase.READY_FOR_RESTART);
    }

    /** Every terminal state passes through here, so no path can end without reporting one. */
    private Result report(Result result, String phase) {
        progress.phase(phase, result.detail, result.version);
        return result;
    }

    /** A network step that may be worth trying again. */
    private interface NetworkStep<T> {
        T run() throws IOException;
    }

    private <T> T withRetries(String what, long[] schedule, NetworkStep<T> step)
            throws IOException {
        IOException last = null;
        for (int attempt = 0; attempt < schedule.length; attempt++) {
            if (cancellation.cancelled()) throw new IOException("已取消");
            if (schedule[attempt] > 0) {
                log.line("OTA：" + what + " 失敗，" + (schedule[attempt] / 1000)
                        + " 秒後重試（第 " + (attempt + 1) + " 次）");
                sleeper.sleep(schedule[attempt]);
            }
            try {
                return step.run();
            } catch (IOException failure) {
                last = failure;
            }
        }
        throw last == null ? new IOException(what + " 失敗") : last;
    }
}
