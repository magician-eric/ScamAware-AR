package com.bigxreality.jorjinverifier;

/**
 * The decisions behind "the app vanished while nobody touched it" - kept out of the activity so
 * a JVM test can pin them.
 *
 * <h2>Restarting after the page's renderer dies</h2>
 * A WebView's renderer is its own process, and it can die under a running app: it crashes, or
 * the system takes it back for memory after the page has run long enough. The activity answers
 * by starting CIBAR again ({@link MainActivity#onRendererGone}) rather than leaving a window with
 * no page in it. A renderer that dies again straight after that restart is not going to be
 * fixed by a third one, and an app that restarts itself forever is worse than one that stops -
 * so a second death inside {@link #MIN_RELAUNCH_INTERVAL_MS} closes the app instead, with the
 * reason in {@code crash.txt}.
 *
 * <h2>Reading why the last process ended</h2>
 * Android records the reason each process of this app ended
 * ({@code ActivityManager.getHistoricalProcessExitReasons}, API 30+). The activity writes the
 * ones it has not reported before to Logcat and {@code crash.txt} on every launch, so "it closed
 * by itself" stops being a guess: a native crash inside JJSDK's {@code .so}, the system reclaiming
 * memory and a Java exception each read differently.
 */
final class CrashRecovery {
    private CrashRecovery() { }

    /** A renderer that dies again within this long of the last restart is not restarted again. */
    static final long MIN_RELAUNCH_INTERVAL_MS = 60_000L;

    /**
     * @param lastRelaunchAtMs wall-clock time of the last renderer restart, 0 when there was none.
     * @param nowMs            wall-clock time now.
     */
    static boolean shouldRelaunch(long lastRelaunchAtMs, long nowMs) {
        if (lastRelaunchAtMs <= 0) return true;
        // A clock that moved backwards says nothing about how recent the last restart was.
        if (nowMs < lastRelaunchAtMs) return true;
        return nowMs - lastRelaunchAtMs >= MIN_RELAUNCH_INTERVAL_MS;
    }

    /**
     * {@code ApplicationExitInfo.getReason()} as a line someone reading Logcat can act on. The
     * values are Android's own and fixed; named here rather than referenced so the newer ones
     * do not need a newer API level to compile against.
     */
    static String exitReason(int reason) {
        switch (reason) {
            case 1: return "EXIT_SELF（App 自己結束）";
            case 2: return "SIGNALED（被系統訊號結束）";
            case 3: return "LOW_MEMORY（系統記憶體不足而回收）";
            case 4: return "CRASH（Java 例外閃退）";
            case 5: return "CRASH_NATIVE（原生程式崩潰，例如 JJSDK 的 .so）";
            case 6: return "ANR（主執行緒卡住沒有回應）";
            case 7: return "INITIALIZATION_FAILURE（啟動失敗）";
            case 8: return "PERMISSION_CHANGE（權限被變更）";
            case 9: return "EXCESSIVE_RESOURCE_USAGE（耗用資源過多）";
            case 10: return "USER_REQUESTED（使用者要求結束）";
            case 11: return "USER_STOPPED（使用者強制停止）";
            case 12: return "DEPENDENCY_DIED（依賴的元件結束，例如 WebView）";
            case 13: return "OTHER（其他）";
            case 14: return "FREEZER（被系統凍結）";
            case 15: return "PACKAGE_STATE_CHANGE（套件狀態變更）";
            case 16: return "PACKAGE_UPDATED（App 更新）";
            default: return "UNKNOWN（" + reason + "）";
        }
    }
}
