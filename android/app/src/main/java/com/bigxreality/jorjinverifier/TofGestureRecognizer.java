package com.bigxreality.jorjinverifier;

import com.jorjin.jjsdk.tof.TofGestureEvent;

import java.util.Locale;

/**
 * Recognises horizontal swipes from the ToF module's 8x8 depth frames - the second of the two
 * recognisers on the glasses, running alongside the module's own engine.
 *
 * <h2>Two recognisers, one swipe</h2>
 * The ToF module recognises swipes itself and presses arrow keys the page reads
 * ({@link ModuleGestureKeys}). That engine is good, and it is a black box: what it does with a
 * busy background, an infrared-rich lamp, a hand at arm's length or a fast flick cannot be
 * changed from here. This recogniser reads the same sensor's raw frames and catches what the
 * module misses. When the module reports a swipe ({@link #onExternalGesture}) this one locks
 * exactly as if it had reported it, so one movement is never counted twice and the module's
 * swipe gets the same protection against its return stroke as this one's own. The page drops a
 * report that arrives from the other channel moments after the first
 * ({@code webapp/src/lib/arInteraction/native/jorjinGestureAdapter.js}).
 *
 * <h2>LEFT and RIGHT only</h2>
 * It recognises nothing else, deliberately. It once also produced UP/DOWN, PUSH/PULL, HALT and
 * SELECT, and each was a way for a swipe to come out as something other than a swipe. Vertical
 * travel is still measured, but only to reject: a movement that is mostly vertical produces
 * nothing at all.
 *
 * <h2>Where the hand is</h2>
 * {@link TofHandExtractor} decides that, frame by frame: background learning, signal strength,
 * the nearest object, one connected blob of hand size, and a guard for the wearer turning their
 * head. This class only sees its answer - a position in fractions of a zone, or nothing.
 *
 * <h2>The whole path, not two points</h2>
 * The first version compared where the hand appeared with where it vanished. A hand that waved
 * back and forth, paused before swiping, or stayed in view after its swipe defeated that. Now the
 * path is cut into <em>strokes</em>: a stroke runs while the hand keeps moving one way, ends when
 * it turns back ({@link #REVERSAL_HYSTERESIS}) or holds still ({@link #STOP_MS}), and is judged on
 * its own - far enough sideways ({@link #MIN_ZONE_TRAVEL}), sideways more than up or down
 * ({@link #HORIZONTAL_DOMINANCE}), not slower than {@link #MAX_SWIPE_MS}.
 *
 * <ul>
 *   <li>When the hand leaves, the biggest qualifying stroke since it last held still is
 *       reported. That is the ordinary swipe across the sensor, and it is the only way a short
 *       stroke is reported.</li>
 *   <li>A stroke that turns back or stops is reported straight away only when it is
 *       unmistakable: {@link #EARLY_ZONE_TRAVEL} or more, ending beyond the middle of the grid
 *       in the direction it travelled. That is a wave's first stroke, or a swipe whose hand
 *       stays up. A hand brought in from the side that stops in the middle does not qualify -
 *       it was placed, not swiped.</li>
 *   <li>A stroke that ends by holding still and did not qualify is forgotten. Whatever the hand
 *       does next is a new movement.</li>
 * </ul>
 *
 * <h2>One gesture per approach</h2>
 * A reported swipe locks the recogniser until the sensor has been clear - no hand - for
 * {@link #NEUTRAL_REARM_MS} without a break. A timer would not do: a hand still in front of the
 * glasses when it expired would re-arm into the middle of the movement it was meant to sit out.
 * After re-arming, a stroke the opposite way that began within {@link #RETURN_SUPPRESS_MS} of the
 * swipe is the arm coming back for the next one, and is not reported.
 *
 * <h2>Direction</h2>
 * Increasing column is RIGHT unless {@link #setColumnIncreasesRight} says otherwise. Every time
 * the module and this recogniser both read the same swipe their directions are compared; if they
 * disagree {@link #ORIENTATION_FLIP_DISAGREEMENTS} times and have never once agreed, the module
 * is taken as the reference and the axis is flipped.
 */
final class TofGestureRecognizer {
    static final int GRID = TofHandExtractor.GRID;
    static final int ZONES = TofHandExtractor.ZONES;

    /** Sideways travel, in zones, for a stroke to count as a swipe. */
    static final float MIN_ZONE_TRAVEL = 1.2f;
    /** Sideways travel for a stroke to be reported before the hand has left. */
    static final float EARLY_ZONE_TRAVEL = 2.0f;
    /** How far past the middle of the grid an early-reported stroke must end. */
    static final float OUTER_FROM_CENTRE = 1.0f;
    /** Horizontal travel must be at least this fraction of the vertical (an elbow sweeps arcs). */
    static final float HORIZONTAL_DOMINANCE = 0.85f;
    /** A stroke slower than this is a hand being moved into place, not a swipe. */
    static final long MAX_SWIPE_MS = 2000L;
    /** Frames the hand must have been seen in; fewer is a flicker, not a hand. */
    static final int MIN_HAND_FRAMES = 3;
    /**
     * Positions a stroke must be made of. Two are a jump between frames - a blob that changed
     * shape, two objects swapping - and say nothing about a hand moving.
     */
    static final int MIN_STROKE_SAMPLES = 3;
    /**
     * Beyond this, a hand is narrow enough to be seen whole, clear of both sides of the view, at
     * some point of any swipe across it. Something that only ever shows an edge - a person
     * walking past, of whom only a shoulder fits - never is.
     */
    static final float SEEN_WHOLE_BEYOND_MM = 250f;
    /**
     * A stroke whose distance changed by more than this fraction is a hand coming towards the
     * glasses or going away: the blob grows or shrinks around its centre, and the centroid drifts
     * sideways without the hand moving sideways at all.
     */
    static final float MAX_DEPTH_CHANGE = 0.35f;
    /** The hand must be gone this long before it has left; two dropped frames do not end a swipe. */
    static final long RELEASE_MS = 150L;
    /** Clear for this long after a swipe before another can be recognised. */
    static final long NEUTRAL_REARM_MS = 300L;
    /** An opposite stroke beginning this soon after a swipe is its return stroke. */
    static final long RETURN_SUPPRESS_MS = 1200L;
    /** Movement before a stroke has a direction (zones). Below it the hand is only jittering. */
    static final float DIRECTION_HYSTERESIS = 0.3f;
    /** How far back a hand must come before a stroke is over (zones). */
    static final float REVERSAL_HYSTERESIS = 0.6f;
    /** A hand that stays within this radius (zones) for {@link #STOP_MS} has stopped. */
    static final float STILL_RADIUS = 0.4f;
    /**
     * A stroke that has not got any further for this long is over - whether the hand is perfectly
     * still or trembling in place. Measured as "no progress", not "no movement": a hand held up
     * after its swipe shakes by more than {@link #STILL_RADIUS} now and then, and when stopping
     * was "staying inside a radius" that shake kept the stroke open for as long as the hand
     * stayed up. It was then reported when the hand finally dropped - seconds later, on whatever
     * screen was showing by then: the swipe the wearer saw "remembered" and spent on the next
     * question.
     */
    static final long STOP_MS = 250L;
    /**
     * A stroke is only ever reported within this long of its end. Whatever path led to a report
     * - the hand leaving, a turn, a stop - a movement that finished longer ago than this belongs
     * to a screen that may no longer be there.
     */
    static final long REPORT_WITHIN_MS = 600L;
    /**
     * A hand that stays up after its swipe, held still this long, may swipe again without first
     * leaving the sensor. Waiting for the sensor to clear made a hand that stayed in view -
     * resting on the side the last swipe ended on, waiting for the next question - invisible to
     * this recogniser for the next swipe, leaving only the module to catch it.
     */
    static final long HOLD_REARM_MS = 600L;
    /**
     * After such a hold, a stroke must move at least this fast (zones per second) to count. A
     * swipe does; an arm relaxing and drifting back the way it came does not.
     */
    static final float MIN_SPEED_AFTER_HOLD = 3f;
    /**
     * A stroke that leaves the view at the side it was heading for may be this short. A hand
     * crossing only the edge of the sensor's narrow view - the right hand, which swipes to the
     * right of the sensor at the right eye - is seen for less of its travel.
     */
    static final float EDGE_EXIT_MIN_TRAVEL = 0.9f;
    /** How near the side a stroke must end, in zones, for {@link #EDGE_EXIT_MIN_TRAVEL}. */
    static final float EDGE_EXIT_WITHIN = 0.8f;
    /**
     * How far short of the middle of the view a stroke that ends with the hand vanishing may
     * stop, in zones. A swipe carries on across; a hand that disappears on the side it came in
     * from was put into view and taken down again - or went within 10 cm of what is behind it
     * (the wall the player stands at), where it stops counting as a hand.
     */
    static final float EXIT_SHORT_OF_CENTRE = 0.5f;
    /** After the scene moved, this long passes before a new movement is tracked. */
    static final long SCENE_SETTLE_MS = 300L;
    /** A module swipe and one of ours this close together are the same swipe. */
    static final long AGREEMENT_WINDOW_MS = 700L;
    static final int ORIENTATION_FLIP_DISAGREEMENTS = 3;

    interface Callback {
        /** @param action one of {@link TofGestureEvent}'s ACTION_* constants. */
        void onRecognised(int gesture, int action, long eventTimeNanos);

        /** One decision worth a log line: a swipe, a rejected stroke, a direction check. */
        default void onNote(String note) { }
    }

    private enum State { IDLE, TRACKING, LOCKED }

    private enum End { EXIT, REVERSAL, STOP }

    /** One stroke: where it began and where it got furthest. */
    private static final class Stroke {
        final float dx, dy, endCol;
        final long startMs, endMs;
        final int dir;
        final int samples;
        final float startRangeMm, endRangeMm;
        final boolean seenWhole;

        Stroke(float dx, float dy, float endCol, long startMs, long endMs, int dir, int samples,
               float startRangeMm, float endRangeMm, boolean seenWhole) {
            this.dx = dx;
            this.dy = dy;
            this.endCol = endCol;
            this.startMs = startMs;
            this.endMs = endMs;
            this.dir = dir;
            this.samples = samples;
            this.startRangeMm = startRangeMm;
            this.endRangeMm = endRangeMm;
            this.seenWhole = seenWhole;
        }
    }

    private static final long NOT_NEUTRAL = Long.MIN_VALUE;
    private static final long NEVER = Long.MIN_VALUE / 4;

    private final Callback callback;
    private final TofHandExtractor extractor = new TofHandExtractor();

    private volatile boolean columnIncreasesRight = true;

    private State state = State.IDLE;
    private TofHandExtractor.Hand lastHand = TofHandExtractor.Hand.NONE;
    private boolean handInView;

    private int handFrames;
    private long lastSeenMs;
    private float trackRangeMm;
    private float anchorCol, anchorRow;
    private long anchorMs;
    private float extremeCol, extremeRow;
    private long extremeMs;
    /** +1 while the current stroke is moving towards higher columns, -1 lower, 0 not yet. */
    private int strokeDir;
    private float stillCol, stillRow;
    private long stillSinceMs;
    /** The biggest qualifying stroke that ended by turning back, waiting for the hand to leave. */
    private Stroke pending;
    /** Frames the current stroke spans, its starting point included. */
    private int strokeSamples;
    /** The time {@link #judge} measures a stroke's age against. */
    private long nowMsForJudge;
    /** Whether this track began by a hold after a swipe; see {@link #MIN_SPEED_AFTER_HOLD}. */
    private boolean afterHold;
    private float holdCol, holdRow;
    private long holdSinceMs = NEVER;
    /** Whether the stroke being judged ended because the hand left the view. */
    private boolean judgingExit;
    private float anchorRangeMm, extremeRangeMm;
    /** Whether the hand has been seen clear of both sides since the stroke began. */
    private boolean strokeSeenWhole;

    private long neutralSinceMs = NOT_NEUTRAL;
    private int lastDir;
    private long lastGestureAtMs = NEVER;
    private boolean lastWasOwn;
    private long quietUntilMs = NEVER;

    private int agreements;
    private int disagreements;

    TofGestureRecognizer(Callback callback) {
        this.callback = callback;
    }

    void setColumnIncreasesRight(boolean value) { columnIncreasesRight = value; }

    boolean isColumnIncreasesRight() { return columnIncreasesRight; }

    /** The staff mode's 手勢最遠距離: how far from the glasses a hand is looked for. */
    void setMaxRangeMm(float value) { extractor.setMaxRangeMm(value); }

    float maxRangeMm() { return extractor.maxRangeMm(); }

    /** The staff mode's 手勢最近距離: nearer than this is the face or a hand at the glasses. */
    void setMinRangeMm(float value) { extractor.setMinRangeMm(value); }

    float minRangeMm() { return extractor.minRangeMm(); }

    long maskedMask() { return extractor.maskedMask(); }

    /** The staff mode's 訊號過濾: how weak a return may be before it is ignored. */
    void setSignalMode(TofHandExtractor.SignalMode mode) { extractor.setSignalMode(mode); }

    TofHandExtractor.SignalMode signalMode() { return extractor.signalMode(); }

    /** Read off the frame thread; a value a frame old is as good as the current one. */
    float noiseRatio() { return extractor.noiseRatio(); }

    float signalFloorFraction() { return extractor.signalFloorFraction(); }

    long handMask() { return extractor.handMask(); }

    /**
     * @param range  the frame's 64 zone distances in mm, zero where the zone had no valid
     *               target. Only read, never retained.
     * @param signal the 64 peak signal rates, or null.
     * @param nowMs  monotonic clock, injected so the state machine can be tested.
     * @return what the frame contained, for the frame log.
     */
    synchronized TofHandExtractor.Hand onFrame(float[] range, float[] signal, long nowMs) {
        if (range == null || range.length < ZONES) return TofHandExtractor.Hand.NONE;
        TofHandExtractor.Hand hand = extractor.process(range, signal, nowMs, state == State.LOCKED);
        lastHand = hand;

        if (hand.sceneMoving) {
            quietUntilMs = nowMs + SCENE_SETTLE_MS;
            if (state == State.TRACKING) {
                note("整個畫面在移動（" + hand.recededZones + " 格退後，多半是頭在轉），放棄這次追蹤");
                state = State.IDLE;
            } else if (state == State.LOCKED) {
                neutralSinceMs = NOT_NEUTRAL;
            }
            handInView = false;
            return hand;
        }

        boolean present = hand.present;
        handInView = present;
        switch (state) {
            case LOCKED:
                if (present) {
                    neutralSinceMs = NOT_NEUTRAL;
                    if (holdSinceMs == NEVER
                            || Math.hypot(hand.col - holdCol, hand.row - holdRow) > STILL_RADIUS) {
                        holdCol = hand.col;
                        holdRow = hand.row;
                        holdSinceMs = nowMs;
                    } else if (nowMs - holdSinceMs >= HOLD_REARM_MS) {
                        startTracking(hand, nowMs);
                        afterHold = true;
                        note("手停住 " + HOLD_REARM_MS + "ms，可以接著揮");
                    }
                } else if (neutralSinceMs == NOT_NEUTRAL) {
                    neutralSinceMs = nowMs;
                } else if (nowMs - neutralSinceMs >= NEUTRAL_REARM_MS) {
                    state = State.IDLE;
                    neutralSinceMs = NOT_NEUTRAL;
                }
                break;
            case IDLE:
                if (present && nowMs >= quietUntilMs) {
                    startTracking(hand, nowMs);
                    afterHold = false;
                }
                break;
            case TRACKING:
                if (present && Math.abs(hand.rangeMm - trackRangeMm)
                        > TofHandExtractor.band(Math.min(hand.rangeMm, trackRangeMm))) {
                    // A different object at a different depth - the hand dropped out and what
                    // was behind it became the nearest thing, or a hand came in front of an
                    // object not yet learned. What was being followed has gone; the jump between
                    // the two is not a movement of either.
                    handLeft(nowMs);
                    if (state == State.IDLE) startTracking(hand, nowMs);
                } else if (present) {
                    trackRangeMm = hand.rangeMm;
                    handFrames++;
                    lastSeenMs = nowMs;
                    step(hand, nowMs);
                } else if (nowMs - lastSeenMs >= RELEASE_MS) {
                    handLeft(nowMs);
                }
                break;
        }
        return hand;
    }

    /**
     * The module's own engine (a key press) or the firmware's gesture bits reported a swipe.
     * Locks this recogniser as though it had reported it - see the class comment - and, when
     * both read the same movement, compares directions.
     */
    synchronized void onExternalGesture(int gesture, long nowMs) {
        if (gesture != TofGestureEvent.GESTURE_LEFT && gesture != TofGestureEvent.GESTURE_RIGHT) {
            return;
        }
        int ownDir = 0;
        if (state == State.TRACKING && strokeDir != 0
                && Math.abs(extremeCol - anchorCol) >= MIN_ZONE_TRAVEL) {
            ownDir = strokeDir;
        } else if (state == State.LOCKED && lastWasOwn
                && nowMs - lastGestureAtMs <= AGREEMENT_WINDOW_MS) {
            ownDir = lastDir;
        }
        if (ownDir != 0) compareWithModule(ownDir == columnDirOf(gesture));

        state = State.LOCKED;
        holdSinceMs = NEVER;
        neutralSinceMs = handInView ? NOT_NEUTRAL : nowMs;
        lastDir = columnDirOf(gesture);
        lastGestureAtMs = nowMs;
        lastWasOwn = false;
        pending = null;
    }

    private void compareWithModule(boolean agree) {
        if (agree) agreements++;
        else disagreements++;
        note("與眼鏡模組判斷的方向" + (agree ? "一致" : "相反")
                + "（一致 " + agreements + " 次，相反 " + disagreements + " 次）");
        if (!agree && agreements == 0 && disagreements >= ORIENTATION_FLIP_DISAGREEMENTS) {
            columnIncreasesRight = !columnIncreasesRight;
            disagreements = 0;
            note("連續 " + ORIENTATION_FLIP_DISAGREEMENTS + " 次與眼鏡模組方向相反，左右方向已自動翻轉");
        }
    }

    private int columnDirOf(int gesture) {
        return (gesture == TofGestureEvent.GESTURE_RIGHT) == columnIncreasesRight ? 1 : -1;
    }

    private void startTracking(TofHandExtractor.Hand hand, long nowMs) {
        state = State.TRACKING;
        trackRangeMm = hand.rangeMm;
        handFrames = 1;
        lastSeenMs = nowMs;
        pending = null;
        strokeDir = 0;
        strokeSamples = 1;
        anchorAt(hand.col, hand.row, nowMs);
        extremeAt(hand.col, hand.row, nowMs);
        stillCol = hand.col;
        stillRow = hand.row;
        stillSinceMs = nowMs;
    }

    private void step(TofHandExtractor.Hand hand, long nowMs) {
        float col = hand.col, row = hand.row;
        strokeSamples++;
        if (!hand.touchesSide) strokeSeenWhole = true;
        if (Math.hypot(col - stillCol, row - stillRow) > STILL_RADIUS) {
            stillCol = col;
            stillRow = row;
            stillSinceMs = nowMs;
        }
        boolean stopped = nowMs - stillSinceMs >= STOP_MS;

        if (strokeDir == 0) {
            float dx = col - anchorCol;
            if (Math.abs(dx) >= DIRECTION_HYSTERESIS) {
                strokeDir = dx > 0 ? 1 : -1;
                extremeAt(col, row, nowMs);
            } else if (stopped || nowMs - anchorMs > MAX_SWIPE_MS) {
                // Still, or barely drifting: the stroke has not begun, so it begins from here.
                anchorAt(col, row, nowMs);
                strokeSamples = 1;
            }
            return;
        }

        float progress = (col - extremeCol) * strokeDir;
        if (progress > 0f) {
            extremeAt(col, row, nowMs);
        } else if (-progress >= REVERSAL_HYSTERESIS) {
            if (endStroke(End.REVERSAL, nowMs)) return;
            // The turning point starts the next stroke, the other way: it spans that point and
            // this frame so far.
            float turnRange = extremeRangeMm;
            anchorAt(extremeCol, extremeRow, extremeMs);
            anchorRangeMm = turnRange;
            strokeDir = -strokeDir;
            extremeAt(col, row, nowMs);
            strokeSamples = 2;
            return;
        }
        if (nowMs - extremeMs >= STOP_MS) {
            if (endStroke(End.STOP, nowMs)) return;
            anchorAt(col, row, nowMs);
            extremeAt(col, row, nowMs);
            strokeDir = 0;
            strokeSamples = 1;
        }
    }

    private void handLeft(long nowMs) {
        boolean reported;
        nowMsForJudge = nowMs;
        if (strokeDir != 0) {
            reported = endStroke(End.EXIT, nowMs);
        } else if (pending != null && nowMs - pending.endMs <= REPORT_WITHIN_MS) {
            report(pending, nowMs, false, "手離開");
            reported = true;
        } else {
            reported = false;
        }
        if (!reported) state = State.IDLE;
    }

    /** @return whether a swipe was reported (the recogniser is then locked). */
    private boolean endStroke(End end, long nowMs) {
        nowMsForJudge = nowMs;
        judgingExit = end == End.EXIT;
        Stroke stroke = new Stroke(extremeCol - anchorCol, extremeRow - anchorRow, extremeCol,
                anchorMs, extremeMs, strokeDir, strokeSamples, anchorRangeMm, extremeRangeMm,
                strokeSeenWhole);
        String rejection = judge(stroke);
        if (end == End.EXIT) {
            Stroke chosen = rejection == null ? stroke : null;
            if (pending != null && nowMs - pending.endMs <= REPORT_WITHIN_MS
                    && (chosen == null || Math.abs(pending.dx) > Math.abs(chosen.dx))) {
                chosen = pending;
            }
            if (chosen != null) {
                report(chosen, nowMs, false, "手離開");
                return true;
            }
            if (Math.abs(stroke.dx) >= MIN_ZONE_TRAVEL * 0.6f) note("手離開，未判定為揮手：" + rejection);
            return false;
        }
        if (rejection == null && Math.abs(stroke.dx) >= EARLY_ZONE_TRAVEL && endsOutward(stroke)) {
            report(stroke, nowMs, true, end == End.REVERSAL ? "折返" : "停住");
            return true;
        }
        if (end == End.REVERSAL) {
            if (rejection == null && (pending == null || Math.abs(stroke.dx) > Math.abs(pending.dx))) {
                pending = stroke;
            }
        } else {
            if (Math.abs(stroke.dx) >= MIN_ZONE_TRAVEL) {
                note("手停在畫面中間，當作把手放進來而不是揮手（" + describe(stroke) + "）");
            }
            pending = null;
        }
        return false;
    }

    /** Null when the stroke is a swipe; otherwise why not, for the log. */
    private String judge(Stroke stroke) {
        float h = Math.abs(stroke.dx), v = Math.abs(stroke.dy);
        long duration = stroke.endMs - stroke.startMs;
        if (handFrames < MIN_HAND_FRAMES) return "只出現 " + handFrames + " 張畫面";
        if (stroke.samples < MIN_STROKE_SAMPLES) return "只是兩張畫面之間的跳動";
        float near = Math.min(stroke.startRangeMm, stroke.endRangeMm);
        float far = Math.max(stroke.startRangeMm, stroke.endRangeMm);
        if (far - near > MAX_DEPTH_CHANGE * far) {
            return "距離從 " + Math.round(stroke.startRangeMm / 10f) + " 變到 "
                    + Math.round(stroke.endRangeMm / 10f) + " 公分，是往前推或往後拉";
        }
        if (!stroke.seenWhole && near >= SEEN_WHOLE_BEYOND_MM) {
            return "一直貼著畫面邊緣，像是旁邊經過的人而不是手";
        }
        boolean edgeExit = judgingExit && (stroke.dir > 0
                ? stroke.endCol >= GRID - 1 - EDGE_EXIT_WITHIN
                : stroke.endCol <= EDGE_EXIT_WITHIN);
        if (h < (edgeExit ? EDGE_EXIT_MIN_TRAVEL : MIN_ZONE_TRAVEL)) return "水平只移動 " + fmt(h) + " 格";
        float centre = (GRID - 1) / 2f;
        if (judgingExit && (stroke.endCol - centre) * stroke.dir < -EXIT_SHORT_OF_CENTRE) {
            return "手在畫面還沒過一半的地方消失（停在第 " + fmt(stroke.endCol) + " 格），像是把手放進來又拿走";
        }
        if (afterHold && duration > 0 && h * 1000f / duration < MIN_SPEED_AFTER_HOLD) {
            return "手停住後的慢慢移動（" + fmt(h * 1000f / duration) + " 格/秒），不是揮手";
        }
        if (h < v * HORIZONTAL_DOMINANCE) return "偏垂直（水平 " + fmt(h) + "／垂直 " + fmt(v) + " 格）";
        if (duration > MAX_SWIPE_MS) return "太慢（" + duration + "ms）";
        if (nowMsForJudge - stroke.endMs > REPORT_WITHIN_MS) {
            return "動作已經結束 " + (nowMsForJudge - stroke.endMs) + "ms，太久以前的不送";
        }
        if (lastDir != 0 && stroke.dir == -lastDir
                && stroke.startMs < lastGestureAtMs + RETURN_SUPPRESS_MS) {
            return "上一個手勢的回程（" + (stroke.startMs - lastGestureAtMs) + "ms 後開始）";
        }
        return null;
    }

    private static boolean endsOutward(Stroke stroke) {
        float centre = (GRID - 1) / 2f;
        return stroke.dir > 0
                ? stroke.endCol >= centre + OUTER_FROM_CENTRE
                : stroke.endCol <= centre - OUTER_FROM_CENTRE;
    }

    private void report(Stroke stroke, long nowMs, boolean handStillInView, String how) {
        int gesture = (stroke.dir > 0) == columnIncreasesRight
                ? TofGestureEvent.GESTURE_RIGHT : TofGestureEvent.GESTURE_LEFT;
        state = State.LOCKED;
        holdSinceMs = NEVER;
        neutralSinceMs = handStillInView ? NOT_NEUTRAL : nowMs;
        lastDir = stroke.dir;
        lastGestureAtMs = nowMs;
        lastWasOwn = true;
        pending = null;
        note("深度辨識：" + (gesture == TofGestureEvent.GESTURE_RIGHT ? "RIGHT" : "LEFT")
                + "（" + how + "，" + describe(stroke) + "，距離約 "
                + Math.round(trackRangeMm / 10f) + " 公分）");
        callback.onRecognised(gesture, TofGestureEvent.ACTION_RECEIVED, nowMs * 1_000_000L);
    }

    private String describe(Stroke stroke) {
        return "水平 " + fmt(stroke.dx) + " 格、垂直 " + fmt(stroke.dy) + " 格、"
                + (stroke.endMs - stroke.startMs) + "ms、" + handFrames + " 張畫面";
    }

    /** Starts a stroke here. The hand's distance is the one being tracked right now. */
    private void anchorAt(float col, float row, long ms) {
        anchorCol = col;
        anchorRow = row;
        anchorMs = ms;
        anchorRangeMm = trackRangeMm;
        strokeSeenWhole = !lastHand.touchesSide;
    }

    private void extremeAt(float col, float row, long ms) {
        extremeCol = col;
        extremeRow = row;
        extremeMs = ms;
        extremeRangeMm = trackRangeMm;
    }

    private void note(String text) {
        callback.onNote(text);
    }

    private static String fmt(float value) {
        return String.format(Locale.ROOT, "%.1f", value);
    }

    /**
     * Back to a freshly constructed recogniser: no swipe in progress, no lock, no background.
     * For starting or restarting the hardware, where the glasses may have moved and anything
     * learned or half-seen belongs to the session before. Not how the lock is cleared in normal
     * use - re-arming is the recogniser's own job. The axis, and what the direction checks have
     * learned about it, survive.
     */
    synchronized void reset() {
        state = State.IDLE;
        neutralSinceMs = NOT_NEUTRAL;
        holdSinceMs = NEVER;
        afterHold = false;
        lastDir = 0;
        lastGestureAtMs = NEVER;
        lastWasOwn = false;
        quietUntilMs = NEVER;
        pending = null;
        strokeDir = 0;
        handFrames = 0;
        handInView = false;
        lastHand = TofHandExtractor.Hand.NONE;
        extractor.reset();
    }

    /** Whether the next hand to enter the sensor can begin a swipe. */
    synchronized boolean isArmed() { return state == State.IDLE; }

    /** Whether a hand is being followed right now. */
    synchronized boolean isTracking() { return state == State.TRACKING; }

    /** Whether a swipe has been reported and the sensor has not been clear long enough since. */
    synchronized boolean isWaitingForNeutral() { return state == State.LOCKED; }

    /** What the latest frame contained. */
    synchronized TofHandExtractor.Hand lastHand() { return lastHand; }
}
