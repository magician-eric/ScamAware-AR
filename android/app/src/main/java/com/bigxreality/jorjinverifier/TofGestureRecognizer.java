package com.bigxreality.jorjinverifier;

import com.jorjin.jjsdk.tof.TofGestureEvent;

/**
 * Recognises horizontal swipes from the ToF module's raw depth frames, the way the vendor
 * Gesture app does, so gestures work on firmware that predates the module's built-in gesture
 * engine.
 *
 * <h2>Why this exists</h2>
 * JJSDK's {@code TofGestureEvent} path reads a gesture bitfield the <em>firmware</em> fills in.
 * A module running firmware older than v1.2.2 never sets those bits, so that path can never
 * produce an event no matter how healthy the USB link is. The vendor's own app sidesteps this
 * entirely: it ships {@code libcalculate_gesture.so} and computes gestures host-side from the
 * same 8x8 depth grid, which JJSDK hands us through {@code TofIncomingFrameListener}.
 *
 * <h2>LEFT and RIGHT only</h2>
 * This deliberately recognises nothing else. It previously also produced UP/DOWN from vertical
 * travel, PUSH/PULL from distance, HALT from a slow hand and SELECT from a hold - and every one
 * of those was a way for a swipe to come out as something other than a swipe. On a 64-zone
 * sensor a hand rarely travels along one axis cleanly, so a left swipe with a little downward
 * drift or a little approach could be classified as DOWN or PUSH instead, and the gesture the
 * user actually made was lost.
 *
 * <p>Removing them is not a filter bolted on afterwards; the classifier itself now has one
 * question to answer. Vertical and depth travel are still measured, but only to <em>reject</em>:
 * a movement that is mostly vertical is not a horizontal swipe and produces nothing at all. That
 * is what keeps a nod from registering as LEFT, and it is the opposite of classifying it as UP.
 *
 * <h2>How it works</h2>
 * Each frame carries 64 zones laid out as an 8x8 grid ({@code index = row * 8 + col}); JJSDK has
 * already zeroed the zones whose VL53L5CX target status was not valid. Zones with a plausible
 * range form the hand; its centroid is tracked from the moment the hand appears until it leaves,
 * and the horizontal component of that travel decides LEFT or RIGHT.
 *
 * <h2>One gesture per approach</h2>
 * The sensor does not recognise a <em>hand</em>. It recognises 64 distances, so anything that
 * moves in front of the glasses can travel far enough sideways to read as a swipe. That made
 * the first swipe of a page double as the second: a player swiped RIGHT, the page advanced
 * under their still-raised hand, and the hand drifting back out of frame - or simply staying
 * there while the arm relaxed - was another movement across the same sensor, recognised on the
 * next page before they had read it.
 *
 * <p>So a recognised swipe locks the recogniser. It reports once and then refuses to see
 * anything at all until the sensor has gone quiet: fewer than {@link #MIN_ACTIVE_ZONES} lit
 * zones, held continuously for {@link #NEUTRAL_REARM_MS}. A plain cooldown would not do this.
 * A timer that expires while the hand is still in front of the sensor re-arms into the middle
 * of the movement it was supposed to sit out, and the second gesture arrives anyway, just
 * later. Both conditions have to hold together - clear <em>and</em> clear for long enough -
 * which is why the object leaving is what starts the clock and the object returning is what
 * resets it.
 *
 * <p>Nothing outside has to drive this. Navigating to the next page does not need to call
 * {@link #reset()} to stay honest; the recogniser knows on its own that it has already spoken.
 */
final class TofGestureRecognizer {
    /** Zones per side of the sensor's square grid. */
    static final int GRID = 8;
    static final int ZONES = GRID * GRID;

    /** Ignore anything closer than the cover glass or beyond comfortable gesture reach. */
    static final float MIN_RANGE_MM = 20f;
    static final float MAX_RANGE_MM = 450f;
    /** Fewer lit zones than this is noise, not a hand. */
    static final int MIN_ACTIVE_ZONES = 3;
    /**
     * Horizontal centroid travel, in zones, before a swipe counts as directional.
     *
     * <p>Lowered from 1.5 after on-device testing: LEFT and RIGHT were recognised reliably, but
     * only when the hand was thrown right across the sensor. 1.5 zones of centroid travel is
     * most of the 8-zone grid's usable width once the hand's own width is taken off both ends,
     * so an ordinary flick in front of the glasses fell just short and produced nothing. At 1.2
     * a normal-sized swipe carries, and the movements that must still be rejected are well
     * below it - a hand shaking in place moves the centroid by a fraction of a zone, not by
     * more than a whole one.
     */
    static final float MIN_ZONE_TRAVEL = 1.2f;
    /**
     * Slower than this is not a swipe - a hand being moved into place, or hesitating.
     *
     * <p>Raised from 1600ms for the same reason: the old ceiling asked for a swipe that was
     * both wide and brisk, and a deliberate, unhurried one that took a little under two seconds
     * was thrown away after travelling far enough to be unambiguous. It is still a ceiling, not
     * an absence of one - a hand that lingers in front of the sensor and then drifts away is
     * over it and stays rejected.
     */
    static final long MAX_SWIPE_MS = 1900L;
    /** A hand must be gone this long before the next swipe can start. */
    static final long RELEASE_MS = 80L;
    /**
     * How long the sensor has to stay clear after a reported swipe before another one can be
     * recognised. Measured from the frame the swipe was reported on, and restarted in full
     * every time something comes back into view.
     *
     * <p>{@link #RELEASE_MS} is not this and cannot be raised into it. That one asks how long a
     * gap has to be before a swipe is <em>over</em>, and it is deliberately short so a single
     * dropped frame does not cut one swipe in two. This one asks how long the sensor has to be
     * empty before the recogniser will listen again, and it is the whole gesture that has to
     * end, not a frame.
     *
     * <p>300ms is long enough for an arm to fall out of the sensor's cone after the swipe it
     * just made, and short enough to be invisible to somebody swiping deliberately through a
     * few pages - by the time the next page has drawn and been read, the window is long since
     * over. It is a floor on the sensor being clear, not on the clock: an object that stays in
     * front of the glasses for three seconds re-arms nothing, because none of those three
     * seconds were quiet.
     */
    static final long NEUTRAL_REARM_MS = 300L;

    /**
     * How much of the movement has to be horizontal. A swipe whose vertical travel rivals its
     * horizontal travel is ambiguous, and guessing at it is what used to turn a nod into a LEFT.
     * Measured in the same zone units, so the two are directly comparable.
     *
     * <p>Relaxed from 1.0 to 0.85. At 1.0 the horizontal component had to be the larger of the
     * two outright, and a hand swept across the sensor by an arm that pivots at the elbow
     * traces an arc - so a swipe that read as unmistakably sideways to the person making it
     * could carry slightly more vertical travel than horizontal and be dropped. 0.85 allows the
     * horizontal component to be a little the smaller of the two and still count. It is not a
     * licence for vertical movement: a hand that travels twice as far up or down as sideways is
     * an order of magnitude clear of this and still produces nothing, which is what keeps a nod
     * from arriving as LEFT.
     */
    static final float HORIZONTAL_DOMINANCE = 0.85f;

    /**
     * Sensor orientation: increasing column index is taken as RIGHT. Which way the module is
     * actually mounted cannot be known without a unit in hand, so this is a runtime toggle
     * rather than a constant - a tester who sees a left swipe reported as RIGHT flips it on the
     * spot instead of waiting for another build.
     */
    private volatile boolean columnIncreasesRight = true;

    void setColumnIncreasesRight(boolean value) { columnIncreasesRight = value; }

    boolean isColumnIncreasesRight() { return columnIncreasesRight; }

    interface Callback {
        /** @param action one of {@link TofGestureEvent}'s ACTION_* constants. */
        void onRecognised(int gesture, int action, long eventTimeNanos);
    }

    private final Callback callback;

    /**
     * Latest frame, kept so the panel can draw what the sensor actually sees. Without it a
     * tester has no way to tell a gesture they made badly from one the thresholds rejected.
     */
    private final float[] snapshot = new float[ZONES];
    private volatile int snapshotActive;
    private volatile float snapshotRow, snapshotCol, snapshotRange;

    /**
     * ARMED -> TRACKING when something enters the sensor, TRACKING -> WAIT_FOR_NEUTRAL when a
     * swipe is reported, WAIT_FOR_NEUTRAL -> ARMED when the sensor has been clear long enough.
     * A movement that is not a swipe goes TRACKING -> ARMED without passing through the lock:
     * nothing was reported, so there is nothing to protect the next page from.
     */
    private enum State { ARMED, TRACKING, WAIT_FOR_NEUTRAL }

    /** {@link #neutralSinceMs} when the sensor is not currently clear. */
    private static final long NOT_NEUTRAL = Long.MIN_VALUE;

    private State state = State.ARMED;
    /** When the current run of clear frames began, or {@link #NOT_NEUTRAL} if there is none. */
    private long neutralSinceMs = NOT_NEUTRAL;
    private float startRow, startCol;
    private float lastRow, lastCol;
    private long startMs;
    private long lastSeenMs;

    TofGestureRecognizer(Callback callback) {
        this.callback = callback;
    }

    /**
     * @param medianRange the frame's 64 zone distances in mm, zero where the zone had no valid
     *                    target; JJSDK reuses its buffer, so this is only read, never retained.
     * @param nowMs       monotonic clock reading, injected so the state machine can be tested.
     */
    synchronized void onFrame(float[] medianRange, long nowMs) {
        if (medianRange == null || medianRange.length < ZONES) return;

        int active = 0;
        float rowSum = 0f, colSum = 0f, rangeSum = 0f;
        for (int i = 0; i < ZONES; i++) {
            float range = medianRange[i];
            if (range < MIN_RANGE_MM || range > MAX_RANGE_MM) continue;
            active++;
            rowSum += i / GRID;
            colSum += i % GRID;
            rangeSum += range;
        }

        synchronized (snapshot) {
            System.arraycopy(medianRange, 0, snapshot, 0, ZONES);
        }
        snapshotActive = active;
        snapshotRow = active > 0 ? rowSum / active : -1f;
        snapshotCol = active > 0 ? colSum / active : -1f;
        snapshotRange = active > 0 ? rangeSum / active : 0f;

        boolean clear = active < MIN_ACTIVE_ZONES;

        if (state == State.WAIT_FOR_NEUTRAL) {
            // Locked. The frame was still copied into the snapshot above - the on-screen grid
            // keeps showing what the sensor sees, because a tester watching the panel during
            // the lock should see the same picture as at any other moment. But nothing here
            // starts a swipe, extends one, or is measured for direction: whatever is in front
            // of the glasses is the tail of the gesture already reported, and the whole point
            // is that it cannot become a second one.
            if (!clear) {
                // Something is back in view, so the sensor is not quiet and has not been.
                // Restarting rather than pausing is what makes this more than a cooldown.
                neutralSinceMs = NOT_NEUTRAL;
            } else if (neutralSinceMs == NOT_NEUTRAL) {
                neutralSinceMs = nowMs;
            } else if (nowMs - neutralSinceMs >= NEUTRAL_REARM_MS) {
                state = State.ARMED;
                neutralSinceMs = NOT_NEUTRAL;
            }
            return;
        }

        if (clear) {
            // The hand has to be absent for a moment before a swipe is called complete;
            // a single dropped frame mid-swipe must not chop the swipe in two.
            if (state == State.TRACKING && nowMs - lastSeenMs >= RELEASE_MS) finish(nowMs);
            return;
        }

        float row = rowSum / active;
        float col = colSum / active;
        lastSeenMs = nowMs;

        if (state == State.ARMED) {
            state = State.TRACKING;
            startRow = lastRow = row;
            startCol = lastCol = col;
            startMs = nowMs;
            // Nothing is emitted when the hand appears. PRESENCE used to fire here, and it is
            // not a swipe - the panel and the page only ever hear about LEFT and RIGHT.
            return;
        }
        lastRow = row;
        lastCol = col;
    }

    /**
     * Classifies the completed movement. A swipe is reported once and locks the recogniser
     * until the sensor is clear again; anything else simply returns it to idle.
     */
    private void finish(long nowMs) {
        long duration = lastSeenMs - startMs;
        int gesture = classify(duration);
        if (gesture == -1) {
            state = State.ARMED;
            return;
        }
        // This only ever runs on a frame that was already clear - finish() is reached from the
        // clear branch of onFrame - so that frame is the first of the neutral run, and the
        // window is measured from the swipe itself rather than from some later frame.
        state = State.WAIT_FOR_NEUTRAL;
        neutralSinceMs = nowMs;
        callback.onRecognised(gesture, TofGestureEvent.ACTION_RECEIVED, nowMs * 1_000_000L);
    }

    /**
     * @return {@link TofGestureEvent#GESTURE_LEFT}, {@link TofGestureEvent#GESTURE_RIGHT}, or -1.
     *         Those are the only three answers this can give.
     */
    private int classify(long duration) {
        if (duration > MAX_SWIPE_MS) return -1;

        float horizontal = Math.abs(lastCol - startCol);
        float vertical = Math.abs(lastRow - startRow);

        // Far enough sideways to be deliberate...
        if (horizontal < MIN_ZONE_TRAVEL) return -1;
        // ...and more sideways than up or down, or it was not a horizontal swipe. Rejected
        // rather than reclassified: this recogniser has no UP or DOWN to fall back to.
        if (horizontal < vertical * HORIZONTAL_DOMINANCE) return -1;

        boolean right = (lastCol - startCol) > 0 == columnIncreasesRight;
        return right ? TofGestureEvent.GESTURE_RIGHT : TofGestureEvent.GESTURE_LEFT;
    }

    /**
     * Back to the state a freshly constructed recogniser is in: no swipe in progress, and no
     * lock left over from one. Starting or restarting the hardware is what this is for - a
     * recogniser that came up mid-swipe, or one still holding a lock from before the ToF was
     * torn down, would otherwise carry that into the first frames of the new session.
     *
     * <p>It is not how the lock is meant to be cleared during normal use. Re-arming is the
     * recogniser's own job and happens when the sensor goes quiet; a caller that reset here on
     * every page change would hand back exactly the double-gesture this class exists to stop.
     */
    synchronized void reset() {
        state = State.ARMED;
        neutralSinceMs = NOT_NEUTRAL;
        startMs = 0;
        lastSeenMs = 0;
        snapshotActive = 0;
        java.util.Arrays.fill(snapshot, 0f);
    }

    /** Whether the next object to enter the sensor can begin a swipe. */
    synchronized boolean isArmed() { return state == State.ARMED; }

    /** Whether a swipe has been reported and the sensor has not gone quiet since. */
    synchronized boolean isWaitingForNeutral() { return state == State.WAIT_FOR_NEUTRAL; }

    /** Copies the latest frame for the on-screen grid; returns the number of lit zones. */
    int copySnapshot(float[] out) {
        if (out == null || out.length < ZONES) return 0;
        synchronized (snapshot) {
            System.arraycopy(snapshot, 0, out, 0, ZONES);
        }
        return snapshotActive;
    }

    float snapshotRow() { return snapshotRow; }

    float snapshotColumn() { return snapshotCol; }

    float snapshotRangeMm() { return snapshotRange; }
}
