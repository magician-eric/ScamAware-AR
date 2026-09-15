package com.bigxreality.jorjinverifier.ota;

/**
 * Whether a published release is worth downloading, decided before a single byte of it is fetched.
 *
 * <p>Pure, and separated from the code that does the fetching, because every one of these
 * decisions is invisible from the outside: an 80 MiB download that should not have happened looks
 * exactly like one that should, and a refusal that should not have happened looks exactly like a
 * phone that is up to date. The only way to know which is which is to be able to ask the question
 * without a network, a phone or a clock.
 */
public final class UpdateDecision {

    public enum Action {
        /** Fetch it, verify it, stage it for the next launch. */
        DOWNLOAD,
        /** The phone is already running this release's content, or newer. */
        ALREADY_CURRENT,
        /** Already downloaded and waiting for the next launch. Downloading it again is waste. */
        ALREADY_STAGED,
        /**
         * The release needs a native bridge this shell does not have. Refused outright: it would
         * install, promote, load, and come up without a camera - a failure the rollback gate
         * cannot see, because the page did load.
         */
        SHELL_TOO_OLD,
        /** The server said something this shell will not act on. */
        REJECTED,
    }

    public final Action action;
    public final String reason;

    private UpdateDecision(Action action, String reason) {
        this.action = action;
        this.reason = reason;
    }

    public boolean shouldDownload() {
        return action == Action.DOWNLOAD;
    }

    /**
     * @param latest        what the update server published, already parsed.
     * @param activeVersion the Release ID the phone is running right now.
     * @param pendingVersion what is already staged for the next launch, or null.
     * @param shellVersion  {@code BuildConfig.SHELL_VERSION}, passed in so a test can be old.
     */
    public static UpdateDecision decide(OtaLatest latest, String activeVersion,
                                        String pendingVersion, String shellVersion) {
        if (latest == null) {
            return new UpdateDecision(Action.REJECTED, "更新伺服器沒有給出可用的 latest.json");
        }
        // The shell gate is asked FIRST, before either version comparison. Order decides what
        // diagnostics can say: a phone stuck on an old APK should report that the published bundle
        // needs a newer shell, not "you are up to date" - which is true, useless, and what a check
        // made after the version comparison would produce.
        if (!SemanticVersion.satisfies(shellVersion, latest.minShellVersion)) {
            return new UpdateDecision(Action.SHELL_TOO_OLD, "release " + latest.releaseId
                    + " 需要 Shell " + latest.minShellVersion + "，這支 APK 是 " + shellVersion
                    + "；不下載，繼續使用目前版本");
        }
        // Staged next. A phone that has already fetched and verified this release is finished with
        // it until the next launch; re-downloading would be 80 MiB to reach the state it is in.
        if (pendingVersion != null
                && BundleVersion.compareSemantic(latest.releaseId, pendingVersion) <= 0) {
            return new UpdateDecision(Action.ALREADY_STAGED, "已經下載好 " + pendingVersion
                    + "，下次啟動生效");
        }
        String active = BundleVersion.isValid(activeVersion) ? activeVersion : BundleVersion.UNKNOWN;
        // Compared on the SEMANTIC half, not the whole Release ID. Every change to the web bundle
        // raises the semantic version (docs/RELEASE_VERSIONING.md §6), so equal semantics means
        // equal content - and the APK's own baseline, which can never carry a Release ID because
        // Release IDs are minted after the merge that builds it, is recognised as current instead
        // of triggering an 80 MiB download of the bytes it shipped with.
        if (BundleVersion.compareSemantic(latest.releaseId, active) <= 0) {
            return new UpdateDecision(Action.ALREADY_CURRENT, "目前的 "
                    + BundleVersion.productVersionOf(active) + " 已經是最新（線上是 "
                    + latest.releaseId + "）");
        }
        return new UpdateDecision(Action.DOWNLOAD, "線上有新版 " + latest.releaseId
                + "（目前 " + active + "）");
    }
}
