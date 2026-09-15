package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import com.jorjin.jjsdk.tof.TofGestureEvent;

import java.util.ArrayList;
import java.util.List;

import org.junit.Before;
import org.junit.Test;

/**
 * The recogniser answers one question: was that a horizontal swipe, and which way?
 *
 * <p>These tests are as much about what it must <em>not</em> report. It used to produce UP/DOWN,
 * PUSH/PULL, HALT and SELECT, and each was a way for a swipe to come out as something else - on
 * a 64-zone sensor a hand rarely travels along one axis cleanly, so a left swipe with a little
 * drift could land as DOWN and the gesture the user made was lost. Anything that is not clearly
 * horizontal must now produce nothing at all.
 */
public class TofGestureRecognizerTest {
    private final List<Integer> received = new ArrayList<>();
    private TofGestureRecognizer recognizer;
    private long clock;

    @Before public void setUp() {
        received.clear();
        clock = 1000L;
        recognizer = new TofGestureRecognizer(
                (gesture, action, eventTimeNanos) -> received.add(gesture));
    }

    /** One frame with a hand centred on (row, col), as a block of lit zones. */
    private static float[] hand(float row, float col, float rangeMm) {
        float[] frame = new float[TofGestureRecognizer.ZONES];
        int r = Math.round(row);
        int c = Math.round(col);
        for (int dr = -1; dr <= 1; dr++) {
            for (int dc = -1; dc <= 1; dc++) {
                int rr = r + dr;
                int cc = c + dc;
                if (rr < 0 || rr >= TofGestureRecognizer.GRID) continue;
                if (cc < 0 || cc >= TofGestureRecognizer.GRID) continue;
                frame[rr * TofGestureRecognizer.GRID + cc] = rangeMm;
            }
        }
        return frame;
    }

    /**
     * One frame with a hand whose centroid sits <em>between</em> zones.
     *
     * <p>{@link #hand} rounds to a whole zone, so the smallest travel it can express is one
     * zone - and the thresholds this file now pins are a fifth of a zone apart. Five lit zones
     * in one row give a centroid of {@code sum/5}, so any fifth of a zone is exactly
     * representable: start from five consecutive columns and push the rightmost ones one column
     * further right until the sum matches. The columns stay distinct and inside the grid, the
     * row centroid is untouched, and five zones is comfortably over
     * {@link TofGestureRecognizer#MIN_ACTIVE_ZONES}.
     */
    private static float[] fineHand(int row, float col, float rangeMm) {
        int sum = Math.round(col * 5f);
        int start = Math.floorDiv(sum - 10, 5);
        int carry = sum - (5 * start + 10);
        float[] frame = new float[TofGestureRecognizer.ZONES];
        for (int i = 0; i < 5; i++) {
            int c = start + i + (i >= 5 - carry ? 1 : 0);
            assertTrue("欄位 " + c + " 超出感測器網格（col=" + col + "）",
                    c >= 0 && c < TofGestureRecognizer.GRID);
            frame[row * TofGestureRecognizer.GRID + c] = rangeMm;
        }
        return frame;
    }

    private static float[] empty() {
        return new float[TofGestureRecognizer.ZONES];
    }

    private void frame(float[] f, long advanceMs) {
        clock += advanceMs;
        recognizer.onFrame(f, clock);
    }

    /** Sweeps the hand from one centre to another, then lets it leave. */
    private void sweep(float fromRow, float fromCol, float toRow, float toCol, long totalMs) {
        int steps = 4;
        for (int i = 0; i <= steps; i++) {
            float t = (float) i / steps;
            frame(hand(fromRow + (toRow - fromRow) * t, fromCol + (toCol - fromCol) * t, 200f),
                    totalMs / steps);
        }
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
    }

    /**
     * The sensor left clear long enough for the recogniser to re-arm - what a hand dropping to
     * the player's side looks like. Fed as ordinary frames at a plausible rate rather than one
     * long jump, because it is the run of clear frames, not the gap between two of them, that
     * the re-arm gate measures.
     */
    private void neutral() {
        for (long elapsed = 0; elapsed <= TofGestureRecognizer.NEUTRAL_REARM_MS; elapsed += 60) {
            frame(empty(), 60);
        }
        assertTrue("感測區淨空 " + TofGestureRecognizer.NEUTRAL_REARM_MS + "ms 後應重新武裝",
                recognizer.isArmed());
    }

    /** {@link #sweep} in sub-zone steps, for travel the whole-zone helper cannot express. */
    private void fineSweep(int row, float fromCol, float toCol, long totalMs) {
        int steps = 4;
        for (int i = 0; i <= steps; i++) {
            float t = (float) i / steps;
            frame(fineHand(row, fromCol + (toCol - fromCol) * t, 200f), totalMs / steps);
        }
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
    }

    @Test public void aRightwardSweepIsRIGHT() {
        sweep(3, 1, 3, 6, 400);
        assertEquals(1, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
    }

    @Test public void aLeftwardSweepIsLEFT() {
        sweep(3, 6, 3, 1, 400);
        assertEquals(1, received.size());
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(0));
    }

    /** The axis toggle exists because how the module is mounted is only knowable on a unit. */
    @Test public void theAxisToggleFlipsBothDirections() {
        recognizer.setColumnIncreasesRight(false);
        sweep(3, 1, 3, 6, 400);
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(0));
        received.clear();
        neutral();
        sweep(3, 6, 3, 1, 400);
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
    }

    /** A vertical wave is rejected outright - there is no UP or DOWN to fall back to. */
    @Test public void aVerticalSweepProducesNothing() {
        sweep(1, 3, 6, 3, 400);
        assertTrue("垂直揮動不應產生任何手勢：" + received, received.isEmpty());
    }

    /** A hand coming straight in barely moves sideways, so it is simply not a swipe. */
    @Test public void movingTowardsTheSensorProducesNothing() {
        for (int i = 0; i <= 4; i++) frame(hand(3, 3, 320f - i * 60f), 80);
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        assertTrue("推進不應產生任何手勢：" + received, received.isEmpty());
    }

    /** Holding still used to fire HALT, then SELECT. It must now fire nothing. */
    @Test public void holdingStillProducesNothing() {
        for (int i = 0; i < 30; i++) frame(hand(3, 3, 200f), 60);
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        assertTrue("停留不應產生任何手勢：" + received, received.isEmpty());
    }

    /** A hand merely appearing used to emit PRESENCE. Presence is not a gesture. */
    @Test public void aHandAppearingProducesNothing() {
        frame(hand(3, 3, 200f), 50);
        frame(hand(3, 3, 200f), 50);
        assertTrue("出現在感測器前不應產生手勢：" + received, received.isEmpty());
    }

    /** A diagonal that is mostly vertical is ambiguous, and guessing is what lost gestures. */
    @Test public void aMostlyVerticalDiagonalIsRejected() {
        sweep(1, 2, 6, 4, 400);
        assertTrue("偏垂直的斜向不應產生手勢：" + received, received.isEmpty());
    }

    /** A diagonal that is clearly sideways still reads as the swipe it was. */
    @Test public void aMostlyHorizontalDiagonalStillSwipes() {
        sweep(3, 1, 4, 6, 400);
        assertEquals(1, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
    }

    @Test public void aSweepTooSlowToBeASwipeIsRejected() {
        sweep(3, 1, 3, 6, TofGestureRecognizer.MAX_SWIPE_MS + 400);
        assertTrue("過慢的移動不應產生手勢：" + received, received.isEmpty());
    }

    @Test public void aTinyShiftIsNotASwipe() {
        sweep(3, 3, 3, 3.5f, 300);
        assertTrue("位移不足不應產生手勢：" + received, received.isEmpty());
    }

    /** One swipe, one event - a hand crossing the sensor must not report twice. */
    @Test public void oneSweepReportsExactlyOnce() {
        sweep(3, 1, 3, 6, 400);
        assertEquals(1, received.size());
    }

    @Test public void twoSweepsReportTwice() {
        sweep(3, 1, 3, 6, 400);
        neutral();
        sweep(3, 6, 3, 1, 400);
        assertEquals(2, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(1));
    }

    /** A single dropped frame mid-swipe must not chop one swipe into two. */
    @Test public void aBriefDropoutDoesNotSplitASwipe() {
        frame(hand(3, 1, 200f), 80);
        frame(hand(3, 3, 200f), 80);
        frame(empty(), 20);
        frame(hand(3, 5, 200f), 20);
        frame(hand(3, 6, 200f), 80);
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        assertEquals(1, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
    }

    /** Whatever it reports, it can only ever be one of two things. */
    @Test public void nothingButLeftOrRightCanEverBeReported() {
        sweep(3, 1, 3, 6, 400);
        neutral();
        sweep(3, 6, 3, 1, 400);
        neutral();
        sweep(1, 3, 6, 3, 400);
        for (int i = 0; i < 20; i++) frame(hand(3, 3, 200f), 60);
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        for (int gesture : received) {
            assertTrue("只允許 LEFT / RIGHT，但收到 " + GestureLabels.code(gesture),
                    gesture == TofGestureEvent.GESTURE_LEFT
                            || gesture == TofGestureEvent.GESTURE_RIGHT);
        }
    }

    // ---------------------------------------------------------------------------------------
    // Sensitivity.
    //
    // On the glasses LEFT and RIGHT were recognised, but only for a swipe that was wide and
    // brisk; an ordinary flick produced nothing, and a player had to learn to exaggerate.
    // MIN_ZONE_TRAVEL went 1.5 -> 1.2, MAX_SWIPE_MS 1600 -> 1900 and HORIZONTAL_DOMINANCE
    // 1.0 -> 0.85 to meet the hand where it actually is. Everything below pins both halves of
    // that: the movements that must now carry, and the ones that must still produce nothing -
    // because each of these three constants was, before the change, part of what kept a shaking
    // hand, a nod, or a hand simply arriving from being read as a swipe.
    // ---------------------------------------------------------------------------------------

    /** 1.2 and 1.4 zones of travel: under the old 1.5 both were silently dropped. */
    @Test public void aModestRightwardSwipeIsNowRecognised() {
        fineSweep(3, 2.0f, 3.2f, 500);
        assertEquals("1.2 zone 的右揮應該要能辨識：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));

        received.clear();
        neutral();
        fineSweep(3, 2.2f, 3.6f, 500);
        assertEquals("1.4 zone 的右揮應該要能辨識：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
    }

    /** The same two distances the other way. LEFT is not RIGHT's afterthought. */
    @Test public void aModestLeftwardSwipeIsNowRecognised() {
        fineSweep(3, 3.2f, 2.0f, 500);
        assertEquals("1.2 zone 的左揮應該要能辨識：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(0));

        received.clear();
        neutral();
        fineSweep(3, 3.6f, 2.2f, 500);
        assertEquals("1.4 zone 的左揮應該要能辨識：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(0));
    }

    /**
     * Still a floor, not an open door. A whole zone of travel is more than a hand held in front
     * of the sensor ever wanders, and it is below the threshold, so it is still nothing.
     */
    @Test public void aSwipeShorterThanTheThresholdIsStillRejected() {
        fineSweep(3, 2.0f, 3.0f, 500);
        assertTrue("1.0 zone 仍在門檻之下，不應辨識：" + received, received.isEmpty());
    }

    /**
     * A hand that wobbles where it stands. It never leaves the sensor, so this is one movement,
     * and what the classifier measures is where it ended up against where it started - which is
     * where it started.
     */
    @Test public void aHandShakingInPlaceProducesNothing() {
        frame(fineHand(3, 3.0f, 200f), 60);
        frame(fineHand(3, 3.4f, 200f), 60);
        frame(fineHand(3, 2.6f, 200f), 60);
        frame(fineHand(3, 3.4f, 200f), 60);
        frame(fineHand(3, 3.0f, 200f), 60);
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        assertTrue("手在感測區小幅晃動不應觸發：" + received, received.isEmpty());
    }

    /**
     * The lowered travel floor is what makes this worth re-pinning: 1.2 zones of sideways drift
     * now clears MIN_ZONE_TRAVEL on its own, so the only thing left standing between a nod and a
     * spurious LEFT is HORIZONTAL_DOMINANCE - and that constant was relaxed in the same change.
     */
    @Test public void aVerticalMoveWithSidewaysDriftIsStillNotASwipe() {
        for (int i = 0; i <= 4; i++) {
            frame(fineHand(1 + i, 3.0f + 0.3f * i, 200f), 100);
        }
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        assertTrue("上下移動不應被判成 LEFT / RIGHT：" + received, received.isEmpty());
    }

    /**
     * An arm that pivots at the elbow sweeps an arc, so a swipe that felt unmistakably sideways
     * can carry marginally more vertical travel than horizontal. At the old dominance of 1.0
     * that was thrown away; at 0.85 it is the swipe the player made.
     */
    @Test public void aSwipeThatArcsSlightlyIsStillASwipe() {
        for (int i = 0; i <= 4; i++) {
            frame(fineHand(2 + (i + 1) / 2, 2.0f + 0.45f * i, 200f), 100);
        }
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        assertEquals("略帶弧線的揮動仍應是揮動：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
    }

    /** Unhurried but deliberate. 1600ms used to be the ceiling and this fell just outside it. */
    @Test public void anUnhurriedSwipeIsStillASwipe() {
        sweep(3, 2, 3, 5, 1700);
        assertEquals("1700ms 的揮動應該要能辨識：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));

        received.clear();
        neutral();
        sweep(3, 5, 3, 2, 1800);
        assertEquals("1800ms 的揮動應該要能辨識：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(0));
    }

    /** The ceiling moved; it did not go away. Past it is a hand loitering, not a swipe. */
    @Test public void aSwipeJustPastTheNewCeilingIsRejected() {
        sweep(3, 1, 3, 6, TofGestureRecognizer.MAX_SWIPE_MS + 100);
        assertTrue("超過 " + TofGestureRecognizer.MAX_SWIPE_MS + "ms 仍不應辨識：" + received,
                received.isEmpty());
    }

    /**
     * One swipe, one event - re-asserted at the new limits, because a swipe that only just
     * clears the thresholds is the one whose frames sit closest to being cut in two.
     */
    @Test public void aModestSwipeStillReportsExactlyOnce() {
        fineSweep(3, 2.0f, 3.2f, 1700);
        assertEquals("一次揮動只能產生一次事件：" + received, 1, received.size());
    }

    // ---------------------------------------------------------------------------------------
    // Re-arming.
    //
    // The module reports distances, not hands. On the glasses that meant one swipe could be
    // read as two: a player swiped RIGHT, the page turned under their still-raised hand, and
    // the hand leaving - or the arm relaxing where it was - crossed the same sensor again and
    // advanced the page they had not yet read. A recognised swipe now locks the recogniser
    // until the sensor has been clear for NEUTRAL_REARM_MS. Both halves are load-bearing and
    // both are pinned below: a bare cooldown would expire into the middle of the movement it
    // was meant to sit out, and a bare emptiness check would re-arm on the first frame a hand
    // happened to be edge-on to the sensor.
    // ---------------------------------------------------------------------------------------

    /**
     * The movement that turned one swipe into two. The hand does not vanish when the swipe is
     * over: it sits where it landed while the player reads the page that just appeared, and
     * then the arm relaxes and it drifts back the way it came - two zones of travel, well
     * inside the time limit, and in the opposite direction. That drift is what used to arrive
     * on the next page as a LEFT nobody made.
     */
    @Test public void aHandLeftSittingWhereTheSwipeEndedCannotSwipeAgain() {
        sweep(3, 1, 3, 6, 400);
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
        received.clear();

        for (int i = 0; i < 10; i++) frame(hand(3, 6, 200f), 60);   // held where it landed
        for (int i = 0; i <= 3; i++) frame(hand(3, 6 - i, 200f), 80);  // the arm relaxing
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);

        assertTrue("手勢後手還在感測區的移動不應再產生手勢：" + received, received.isEmpty());
        assertTrue("感測區未淨空滿窗口前不得重新武裝", recognizer.isWaitingForNeutral());
    }

    /** The hand carries straight on into a second sweep without ever leaving the sensor. */
    @Test public void aSecondMovementWithoutLeavingTheSensorIsIgnored() {
        sweep(3, 1, 3, 6, 400);
        received.clear();

        // Back across the sensor, far enough and fast enough to be a LEFT on its own merits.
        for (int i = 0; i <= 4; i++) frame(hand(3, 6 - i, 200f), 80);
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        assertTrue("未回到 neutral 前的第二段移動不應觸發：" + received, received.isEmpty());
    }

    /**
     * The release window is not the re-arm window. 80ms of emptiness is enough to call the
     * first swipe finished - that is what {@link TofGestureRecognizer#RELEASE_MS} is for - and
     * nowhere near enough to accept another one.
     */
    @Test public void aBriefGapIsNotEnoughToReArm() {
        sweep(3, 1, 3, 6, 400);
        received.clear();

        frame(empty(), 40);
        frame(empty(), 40);
        sweep(3, 6, 3, 1, 400);

        assertTrue("只淨空 80ms 就揮動不應觸發：" + received, received.isEmpty());
        assertTrue("只淨空 80ms 不應重新武裝", recognizer.isWaitingForNeutral());
    }

    /** Clear for the full window, and the recogniser is listening again. */
    @Test public void theSensorGoingQuietForTheFullWindowReArms() {
        sweep(3, 1, 3, 6, 400);
        received.clear();
        assertTrue(recognizer.isWaitingForNeutral());

        for (long elapsed = 0; elapsed < TofGestureRecognizer.NEUTRAL_REARM_MS; elapsed += 60) {
            frame(empty(), 60);
        }
        frame(empty(), 60);
        assertTrue("淨空滿 " + TofGestureRecognizer.NEUTRAL_REARM_MS + "ms 後應重新武裝",
                recognizer.isArmed());
    }

    /** Re-armed means genuinely armed: the next swipe is read normally, in either direction. */
    @Test public void aSwipeAfterReArmingIsRecognisedNormally() {
        sweep(3, 1, 3, 6, 400);
        received.clear();
        neutral();

        sweep(3, 6, 3, 1, 400);
        assertEquals("重新武裝後的左揮應正常辨識：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(0));
    }

    /** Two deliberate swipes with the hand lowered in between: one event each, in order. */
    @Test public void leftThenNeutralThenRightReportsEachExactlyOnce() {
        sweep(3, 6, 3, 1, 400);
        neutral();
        sweep(3, 1, 3, 6, 400);
        neutral();

        assertEquals("兩次揮動應各產生一次事件：" + received, 2, received.size());
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(0));
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(1));
    }

    /**
     * Why this is a gate and not a cooldown. Three seconds is ten times the window, so any
     * timer started at the swipe expired long ago - but the sensor was never clear for one of
     * those frames, so nothing re-arms and the movement that follows produces nothing.
     */
    @Test public void anObjectThatNeverLeavesDoesNotReArmHoweverLongItStays() {
        sweep(3, 1, 3, 6, 400);
        received.clear();

        for (int i = 0; i < 50; i++) frame(hand(3, 6, 200f), 60);   // 3s, continuously lit

        // It blinks out for a moment - a dropped frame, or a hand turned edge-on to the
        // sensor - and comes straight back across it. 100ms is over RELEASE_MS, so a cooldown
        // that expired two and a half seconds ago would treat what follows as a new swipe. It
        // is under NEUTRAL_REARM_MS, so the sensor was never actually quiet.
        frame(empty(), 100);
        sweep(3, 6, 3, 1, 400);

        assertTrue("物體未真正離開過，之後的揮動仍不應觸發：" + received, received.isEmpty());
        assertTrue("物體持續存在 3 秒仍不得重新武裝", recognizer.isWaitingForNeutral());
    }

    /** A rejected movement locks nothing - there was no event to protect the next page from. */
    @Test public void aMovementThatWasNotASwipeLeavesTheRecogniserArmed() {
        sweep(1, 3, 6, 3, 400);
        assertTrue("垂直揮動不應產生手勢：" + received, received.isEmpty());
        assertTrue("未辨識出手勢時不應進入等待 neutral", recognizer.isArmed());

        sweep(3, 1, 3, 6, 400);
        assertEquals("被拒絕的移動不應擋住下一次揮動：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_RIGHT, (int) received.get(0));
    }

    /**
     * reset() is for the hardware coming up, not for page changes - but when it is called it
     * has to leave nothing behind, the lock included.
     */
    @Test public void resetClearsTheLockAsWellAsTheTracking() {
        sweep(3, 1, 3, 6, 400);
        received.clear();
        frame(hand(3, 6, 200f), 60);
        assertTrue("前置條件：此時應在等待 neutral", recognizer.isWaitingForNeutral());

        recognizer.reset();
        assertTrue("reset() 後應回到已武裝狀態", recognizer.isArmed());
        float[] out = new float[TofGestureRecognizer.ZONES];
        assertEquals("reset() 後快照應清空", 0, recognizer.copySnapshot(out));

        sweep(3, 6, 3, 1, 400);
        assertEquals("reset() 後應可立即辨識：" + received, 1, received.size());
        assertEquals(TofGestureEvent.GESTURE_LEFT, (int) received.get(0));
    }

    /** reset() mid-swipe drops the half-finished movement instead of completing it. */
    @Test public void resetDuringASwipeAbandonsIt() {
        frame(hand(3, 1, 200f), 60);
        frame(hand(3, 4, 200f), 60);
        recognizer.reset();
        frame(hand(3, 6, 200f), 60);
        frame(empty(), TofGestureRecognizer.RELEASE_MS + 10);
        assertTrue("reset() 中斷的揮動不應被送出：" + received, received.isEmpty());
    }

    /** The panel keeps drawing what the sensor sees while the recogniser is locked. */
    @Test public void theSnapshotKeepsUpdatingWhileLocked() {
        sweep(3, 1, 3, 6, 400);
        assertTrue(recognizer.isWaitingForNeutral());

        frame(hand(2, 5, 180f), 60);
        float[] out = new float[TofGestureRecognizer.ZONES];
        assertTrue("鎖定期間仍應更新熱區圖",
                recognizer.copySnapshot(out) >= TofGestureRecognizer.MIN_ACTIVE_ZONES);
        assertEquals(2f, recognizer.snapshotRow(), 0.6f);
        assertEquals(5f, recognizer.snapshotColumn(), 0.6f);
    }

    @Test public void theSnapshotFollowsTheHandForTheOnScreenGrid() {
        frame(hand(2, 5, 180f), 50);
        float[] out = new float[TofGestureRecognizer.ZONES];
        assertTrue("應有亮區", recognizer.copySnapshot(out) >= TofGestureRecognizer.MIN_ACTIVE_ZONES);
        assertEquals(2f, recognizer.snapshotRow(), 0.6f);
        assertEquals(5f, recognizer.snapshotColumn(), 0.6f);
        assertEquals(180f, recognizer.snapshotRangeMm(), 1f);
    }
}
