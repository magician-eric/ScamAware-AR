package com.bigxreality.jorjinverifier;

/**
 * The firmware gate that decides whether the ToF module emits gestures at all.
 *
 * <h2>Why this exists</h2>
 * JJSDK v1.3.3 does not report "gestures are off". {@code TofManager} opens, {@code getTofState()}
 * returns true, frames stream, our listener is attached - and no gesture callback ever fires.  The
 * whole behaviour hangs on one private boolean ({@code TofManager.x}), set once during the device
 * handshake and never mentioned in the public API:
 *
 * <pre>
 *   int acc = 0;
 *   for (String part : firmware.split("\\.")) acc = acc * 16 + Integer.parseInt(part);
 *   x = acc &gt;= 290;                    // 290 == 0x122 == "1.2.2"
 * </pre>
 *
 * Note the base: the version is packed <em>hexadecimally</em>, one nibble per component, and a
 * component that fails to parse is skipped rather than failing the loop - so a version string the
 * device never filled in packs to 0 and silently disables gestures forever.
 *
 * <p>This class replicates that arithmetic so the diagnostics panel can state the verdict instead
 * of printing a version string and leaving the reader to know the threshold.  Getting this wrong
 * in either direction is cheap to detect and expensive to debug on a device, which is why it is
 * pure, separate, and unit tested.
 */
final class TofFirmware {
    /** {@code 0x122} - the packed form of "1.2.2", JJSDK's minimum for gesture events. */
    static final int GESTURE_MINIMUM = 0x122;
    static final String GESTURE_MINIMUM_NAME = "1.2.2";

    private TofFirmware() { }

    /**
     * Packs a dotted version the way JJSDK does: base 16, one component per nibble, unparsable
     * components skipped.
     *
     * <p>Nothing is trimmed, and that is the whole point.  {@code Integer.parseInt(" 2")} throws -
     * Java's parser tolerates no whitespace - so the SDK <em>skips</em> a component with a stray
     * space and ends up below the gate.  Trimming first made this helper parse what the SDK could
     * not: {@code "1. 2.2"} packs to 18 inside the SDK (gestures off) and to 290 with a trim
     * (gestures on).  Every such divergence fails the same way, reporting a module that emits no
     * gestures as healthy - which is worse than saying nothing, because it sends the reader back
     * to debug code that was never at fault.  Mirror the SDK, warts included.
     *
     * <p>A null version is the one deliberate departure: the SDK would throw, and there is no
     * useful mirror of that, so it packs to 0 and reads as "gestures off" - the safe direction.
     */
    static int pack(String version) {
        if (version == null) return 0;
        int packed = 0;
        for (String part : version.split("\\.")) {
            try {
                packed = packed * 16 + Integer.parseInt(part);
            } catch (NumberFormatException ignored) {
                // Same as the SDK: skip the component, leave the accumulator alone, keep going.
            }
        }
        return packed;
    }

    /** Whether JJSDK will deliver gesture callbacks for this firmware. */
    static boolean deliversGestures(String version) {
        return pack(version) >= GESTURE_MINIMUM;
    }

    /**
     * One line for the panel, phrased so a tester who has never read the SDK can act on it: the
     * failing case names the cause, the number, and the fact that it is not our code.
     */
    static String describe(String version) {
        if (version == null || version.trim().isEmpty()) {
            return "手勢輸出：無法確認（尚未讀到韌體版本；需 " + GESTURE_MINIMUM_NAME + " 以上）";
        }
        // The verdict is always computed from the raw string; only the display copy is tidied.
        String shown = version.trim();
        if (deliversGestures(version)) {
            return "手勢輸出：韌體已啟用（" + shown + " ≥ " + GESTURE_MINIMUM_NAME + "）";
        }
        return "手勢輸出：被韌體停用（" + shown + " < " + GESTURE_MINIMUM_NAME
                + "）；JJSDK 不會送出任何手勢事件，需更新 ToF 韌體";
    }
}
