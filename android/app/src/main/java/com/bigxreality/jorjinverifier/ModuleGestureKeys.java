package com.bigxreality.jorjinverifier;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Which key the ToF module's own gesture engine presses for each gesture it recognises - set by
 * this app every time the module comes up, rather than left to whatever the module last heard.
 *
 * <h2>Why the app has to say it</h2>
 * The module recognises swipes itself (JJSDK switches the engine on with {@code settofmode 1}
 * during its handshake) and reports each one as a key press on the glasses' USB keyboard
 * interface. CIBAR's page reads Left / Right Arrow as LEFT / RIGHT
 * ({@code webapp/src/lib/arInteraction/native/glassesKeyGestures.js}). But JJSDK never sends a
 * key map, so the module presses whatever it was last told - and the vendor's gesture app, which
 * is what anybody setting the glasses up runs first, tells it:
 *
 * <pre>
 *   U -> keyup   D -> keydown   L -> keyleft   R -> keyright
 *   PUSH -> keyenter   PULL -> keyback   HALT -> keynone
 * </pre>
 *
 * {@code PULL -> keyback} is the dangerous one. A pull is anything moving away from the sensor -
 * the wearer taking the glasses off, somebody walking out of the way - and Back reaches
 * {@link MainActivity#onKeyDown}: the WebView steps back through the story's history, and on the
 * first screen the activity leaves the foreground. To the person holding the phone the app has
 * simply vanished while nobody touched it. {@code PUSH -> keyenter} presses whatever has focus.
 *
 * <p>So the app sends the whole map itself: LEFT and RIGHT press the two keys CIBAR speaks, and
 * every other gesture presses nothing. The letters and key names are the vendor app's own
 * ({@code settofkey <gesture> <key>}, see its {@code TofManager.setBuiltInParserKey}); the key
 * names match the table JJSDK carries internally.
 *
 * <p>Pure Java, so the map is pinned by a JVM test.
 */
final class ModuleGestureKeys {
    private ModuleGestureKeys() { }

    /** Every gesture the module's engine knows, and the key it may press: two arrows, then none. */
    static final List<String> COMMANDS = Collections.unmodifiableList(Arrays.asList(
            "settofkey L keyleft",
            "settofkey R keyright",
            "settofkey U keynone",
            "settofkey D keynone",
            "settofkey PUSH keynone",
            "settofkey PULL keynone",
            "settofkey HALT keynone"));

    /**
     * Sent before {@link #COMMANDS}: the sensor off, then the module's own gesture engine on.
     * This is the vendor app's order ({@code TofManager.usbSerialRunnable}: {@code settofpwr 0},
     * {@code getfirmver}, {@code settofmode 1} and the key map, then {@code settofpwr 1} and
     * {@code settofconf 0}) - it configures the engine while the sensor is off. Sent mid-stream
     * instead, the map was never seen to take: no field log ever recorded a module key.
     */
    static final List<String> BEFORE = Collections.unmodifiableList(Arrays.asList(
            "settofpwr 0",
            "settofmode 1"));

    /** Sent after {@link #COMMANDS}: the sensor back on, as JJSDK's own handshake leaves it. */
    static final List<String> AFTER = Collections.unmodifiableList(Arrays.asList(
            "settofpwr 1",
            "settofconf 0"));

    /**
     * How many times each command is sent before giving up on hearing it acknowledged. Sending a
     * key map twice is harmless; the module's reply arriving inside a depth-frame stream that
     * JJSDK's own reader is consuming at the same time is what makes a single try unreliable.
     */
    static final int ATTEMPTS = 3;

    /** The line JJSDK's {@code TofManager.execute} writes - its own commands end the same way. */
    static String line(String command) {
        return command + "\r\n";
    }

    /** The module answers a command it accepted with OK. */
    static boolean acknowledged(String reply) {
        return reply != null && reply.contains("OK");
    }

    /**
     * A reply fit for a log line. What comes back mid-stream can be a slice of a binary depth
     * frame, and that must not land in Logcat as control characters.
     */
    static String describeReply(String reply) {
        if (reply == null) return "（無回應）";
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < reply.length() && out.length() < 40; i++) {
            char c = reply.charAt(i);
            out.append(c >= 0x20 && c < 0x7f ? c : '.');
        }
        return out.length() == 0 ? "（空白）" : out.toString();
    }
}
