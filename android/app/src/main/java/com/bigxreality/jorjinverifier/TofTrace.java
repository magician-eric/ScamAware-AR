package com.bigxreality.jorjinverifier;

import android.os.SystemClock;
import android.util.Log;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A timestamped log of every call we make across the JJSDK ToF boundary, and every callback it
 * makes back.
 *
 * <h2>Why the panel's existing lines are not enough</h2>
 * The device reports ToF State Ready, Gesture Listener Registered, and zero raw events. Those
 * three cannot all be trusted at once, because JJSDK's gesture listener is a <em>static</em>
 * field:
 *
 * <pre>
 *   private static TofGestureEventListener D;
 *   public void setTofGestureListener(l) { D = l; }        // putstatic
 *   public void release() { ...; D = null; ... }           // putstatic - any instance
 * </pre>
 *
 * So the listener is process-global. Two managers do not get one listener each; the second
 * {@code setTofGestureListener} overwrites the first, and a {@code release()} on <em>either</em>
 * clears it for <em>both</em>. Meanwhile {@code getTofState()} is {@code z && y}, both instance
 * fields on whichever manager is streaming - so a live manager can keep reporting Ready while the
 * static listener the frame loop reads has already been nulled by a different instance.
 *
 * <p>That failure is invisible to every reading the panel currently shows, so this records the
 * ordering instead: which instance, in what order, at what time. If the trace shows a
 * {@code setGestureListener(null)} or {@code release()} landing after the manager that owns the
 * stream came up, the listener is the cause and the firmware is not.
 *
 * <p>Strings are escaped on the way in. A firmware string is compared by
 * {@code Integer.parseInt} on each dot-separated component, and that throws on any whitespace -
 * so a trailing {@code \r\n} silently drops a component and closes the gesture gate. Printing it
 * raw would hide exactly the character that matters.
 */
final class TofTrace {
    private static final String TAG = "JorjinToF";
    private static final int MAX_ENTRIES = 40;

    /** Distinguishes TofManager instances, so a callback can be attributed to one of them. */
    private static final AtomicInteger INSTANCE_SEQ = new AtomicInteger();

    private final Deque<String> entries = new ArrayDeque<>();
    private final long startedAt = SystemClock.elapsedRealtime();

    static int nextInstanceId() {
        return INSTANCE_SEQ.incrementAndGet();
    }

    /** @param instanceId the TofManager this concerns, or 0 when it concerns none. */
    synchronized void add(int instanceId, String event) {
        String line = String.format(Locale.ROOT, "%+7.3fs #%d %s",
                (SystemClock.elapsedRealtime() - startedAt) / 1000.0, instanceId, event);
        entries.addLast(line);
        while (entries.size() > MAX_ENTRIES) entries.removeFirst();
        Log.i(TAG, line);
    }

    synchronized void reset() {
        entries.clear();
    }

    synchronized String render() {
        if (entries.isEmpty()) return "ToF trace：（尚無事件）";
        StringBuilder text = new StringBuilder("ToF trace（#n = TofManager instance）：");
        for (String line : entries) text.append('\n').append(line);
        return text.toString();
    }

    /**
     * Renders a string with every control character visible.  A firmware of {@code "1.2.2\r\n"}
     * and one of {@code "1.2.2"} look identical in a log and behave completely differently at
     * JJSDK's gesture gate; this is the difference between a five-minute answer and a long hunt.
     */
    static String escape(String value) {
        if (value == null) return "null";
        StringBuilder out = new StringBuilder(value.length() + 8).append('"');
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '\n': out.append("\\n"); break;
                case '\r': out.append("\\r"); break;
                case '\t': out.append("\\t"); break;
                case '"': out.append("\\\""); break;
                case '\\': out.append("\\\\"); break;
                default:
                    if (c < 0x20 || c == 0x7f) {
                        out.append(String.format(Locale.ROOT, "\\x%02x", (int) c));
                    } else {
                        out.append(c);
                    }
            }
        }
        return out.append('"').append(" (len=").append(value.length()).append(')').toString();
    }
}
