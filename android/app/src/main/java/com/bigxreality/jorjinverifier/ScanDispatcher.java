package com.bigxreality.jorjinverifier;

/**
 * Decides which recognition results are worth telling the page about.
 *
 * <p>A recogniser running over a camera stream reports the same target on every frame it can
 * still see it - dozens of times a second while the wearer holds the card in view. The page must
 * hear about it once: CIBAR navigates on a scan, and a second navigation a frame later would
 * throw the user back to the top of the scenario they just entered.
 *
 * <p>So the rules are, in order:
 * <ul>
 *   <li>Below the confidence floor is not a recognition at all.</li>
 *   <li>The same target again inside the repeat window is the same sighting, not a new one.</li>
 *   <li>A different target is always new - looking from one card to another is a real event, and
 *       making the user wait out a cooldown for it would feel broken.</li>
 * </ul>
 *
 * <p>Separated from the camera and the WebView so all of that is testable without either.
 */
final class ScanDispatcher {
    /** Below this, a match is a guess; reporting it would navigate on nothing. */
    static final float MIN_CONFIDENCE = 0.60f;
    /**
     * How long the same target stays "already reported". Long enough to cover holding a card in
     * view and glancing away and back, short enough that a deliberate re-scan works.
     */
    static final long REPEAT_WINDOW_MS = 4000L;

    interface Callback {
        void onScan(ScanTarget target, float confidence);
    }

    private final Callback callback;
    private ScanTarget lastTarget;
    private long lastAtMs;
    private long acceptedCount;

    ScanDispatcher(Callback callback) {
        this.callback = callback;
    }

    /**
     * @param nowMs monotonic clock reading, injected so the repeat window can be unit tested.
     * @return true when the result was passed on to the page.
     */
    synchronized boolean offer(ScanTarget target, float confidence, long nowMs) {
        if (target == null) return false;
        if (Float.isNaN(confidence) || confidence < MIN_CONFIDENCE) return false;
        if (target == lastTarget && nowMs - lastAtMs < REPEAT_WINDOW_MS) return false;
        lastTarget = target;
        lastAtMs = nowMs;
        acceptedCount++;
        callback.onScan(target, confidence);
        return true;
    }

    synchronized long acceptedCount() {
        return acceptedCount;
    }

    synchronized ScanTarget lastTarget() {
        return lastTarget;
    }

    synchronized void reset() {
        lastTarget = null;
        lastAtMs = 0;
        acceptedCount = 0;
    }
}
