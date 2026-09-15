package android.util;

/**
 * Compile-and-run stand-in for Logcat, for the JVM harness only.
 *
 * <p>The real {@code android.util.Log} bottoms out in {@code println_native}, and on a desktop JVM
 * there is no native library behind it: every call throws {@code UnsatisfiedLinkError}. Gradle
 * solves this by generating a "mockable" android.jar whose methods return defaults; this harness
 * cannot generate one without the SDK, so it supplies the one class that matters.
 *
 * <p>It prints rather than discards, because a test that fails is a test somebody is about to read
 * the output of, and the app's own log lines are most of what explains an update decision.
 *
 * <p>Only ever on the harness classpath, ahead of android-all. It is not compiled into the APK,
 * where the real framework class is the one that resolves.
 */
public final class Log {

    public static final int VERBOSE = 2;
    public static final int DEBUG = 3;
    public static final int INFO = 4;
    public static final int WARN = 5;
    public static final int ERROR = 6;

    private Log() { }

    public static int v(String tag, String message) { return print("V", tag, message, null); }
    public static int v(String tag, String message, Throwable error) { return print("V", tag, message, error); }
    public static int d(String tag, String message) { return print("D", tag, message, null); }
    public static int d(String tag, String message, Throwable error) { return print("D", tag, message, error); }
    public static int i(String tag, String message) { return print("I", tag, message, null); }
    public static int i(String tag, String message, Throwable error) { return print("I", tag, message, error); }
    public static int w(String tag, String message) { return print("W", tag, message, null); }
    public static int w(String tag, String message, Throwable error) { return print("W", tag, message, error); }
    public static int w(String tag, Throwable error) { return print("W", tag, "", error); }
    public static int e(String tag, String message) { return print("E", tag, message, null); }
    public static int e(String tag, String message, Throwable error) { return print("E", tag, message, error); }
    public static int println(int priority, String tag, String message) {
        return print(String.valueOf(priority), tag, message, null);
    }

    public static String getStackTraceString(Throwable error) {
        if (error == null) return "";
        java.io.StringWriter out = new java.io.StringWriter();
        error.printStackTrace(new java.io.PrintWriter(out));
        return out.toString();
    }

    public static boolean isLoggable(String tag, int level) {
        return true;
    }

    private static int print(String level, String tag, String message, Throwable error) {
        String line = level + "/" + tag + ": " + message;
        System.out.println(line);
        if (error != null) error.printStackTrace(System.out);
        return line.length();
    }
}
