package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.jorjin.jjsdk.tof.TofGestureEvent;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.junit.Before;
import org.junit.Test;

/**
 * The depth recogniser, driven by {@link TofScene}: a hand of real size at a real distance in
 * front of a real background, rendered into the frames the sensor would send at 15 per second.
 *
 * <p>Grouped by the five problems from the acceptance test - recognition rate, swipe speed, hand
 * distance, lighting, background - then by what one swipe must and must not produce, and by how
 * it works alongside the module's own engine.
 */
public class TofGestureRecognizerTest {
    private static final int RIGHT = TofGestureEvent.GESTURE_RIGHT;
    private static final int LEFT = TofGestureEvent.GESTURE_LEFT;
    private static final float MID = 3.5f;

    private final List<Integer> received = new ArrayList<>();
    private final List<String> notes = new ArrayList<>();
    private TofGestureRecognizer recognizer;
    private TofScene scene;
    private long clock;
    /** Extra zones lit by ambient infrared on each frame, or null. */
    private Random noise;

    @Before public void setUp() {
        received.clear();
        notes.clear();
        clock = 10_000L;
        scene = new TofScene();
        noise = null;
        recognizer = new TofGestureRecognizer(new TofGestureRecognizer.Callback() {
            @Override public void onRecognised(int gesture, int action, long eventTimeNanos) {
                assertEquals(TofGestureEvent.ACTION_RECEIVED, action);
                received.add(gesture);
            }

            @Override public void onNote(String note) {
                notes.add(note);
            }
        });
    }

    // ------------------------------------------------------------------ driving the scene

    private void frame() {
        clock += TofScene.FRAME_MS;
        float[] range = scene.range();
        float[] signal = scene.signal();
        if (noise != null) {
            for (int k = 0; k < 4; k++) {
                int zone = noise.nextInt(TofScene.ZONES);
                if (range[zone] > 0f && signal[zone] > 1f) continue;
                range[zone] = 30f + noise.nextInt(570);
                signal[zone] = 0.5f;
            }
        }
        recognizer.onFrame(range, signal, clock);
    }

    private void frames(long ms) {
        for (long t = 0; t < ms; t += TofScene.FRAME_MS) frame();
    }

    /**
     * The scene with no hand, long enough for its background to be learned - including anything
     * within gesture range, which is learned as slowly as a hand held still would be.
     */
    private void settle() {
        scene.noHand();
        frames(TofHandExtractor.ABSORB_MS + 500);
    }

    private void move(float fromCol, float fromRow, float toCol, float toRow, float rangeMm,
                      long durationMs) {
        move(fromCol, fromRow, rangeMm, toCol, toRow, rangeMm, durationMs);
    }

    private void move(float fromCol, float fromRow, float fromRange,
                      float toCol, float toRow, float toRange, long durationMs) {
        int steps = Math.max(1, Math.round(durationMs / (float) TofScene.FRAME_MS));
        for (int i = 0; i <= steps; i++) {
            float t = i / (float) steps;
            scene.handAt(fromCol + (toCol - fromCol) * t, fromRow + (toRow - fromRow) * t,
                    fromRange + (toRange - fromRange) * t);
            frame();
        }
    }

    private void hold(float col, float row, float rangeMm, long ms) {
        scene.handAt(col, row, rangeMm);
        frames(ms);
    }

    /** The hand dropped out of view, long enough to count as gone. */
    private void away() {
        scene.noHand();
        frames(TofGestureRecognizer.RELEASE_MS + 2 * TofScene.FRAME_MS);
    }

    /** Clear long enough to re-arm after a swipe. */
    private void neutral() {
        scene.noHand();
        frames(TofGestureRecognizer.NEUTRAL_REARM_MS + 3 * TofScene.FRAME_MS);
        assertTrue("感測區淨空後應重新武裝", recognizer.isArmed());
    }

    /** Across the sensor at mid height, from outside one edge to outside the other. */
    private void swipe(float fromCol, float toCol, float rangeMm, long durationMs) {
        move(fromCol, MID, toCol, MID, rangeMm, durationMs);
        away();
    }

    private void swipeRight(float rangeMm) {
        swipe(-1.5f, 8.5f, rangeMm, 450);
    }

    private void swipeLeft(float rangeMm) {
        swipe(8.5f, -1.5f, rangeMm, 450);
    }

    private void assertOnly(int gesture) {
        assertEquals("應剛好辨識出一次：" + received + " " + notes, 1, received.size());
        assertEquals("方向錯誤：" + notes, gesture, (int) received.get(0));
    }

    private void assertNothing() {
        assertEquals("不應辨識出任何手勢：" + notes, 0, received.size());
    }

    // ------------------------------------------------------------------ 1. recognition

    @Test public void aRightwardSwipeIsRIGHT() {
        swipeRight(250);
        assertOnly(RIGHT);
    }

    @Test public void aLeftwardSwipeIsLEFT() {
        swipeLeft(250);
        assertOnly(LEFT);
    }

    @Test public void theAxisToggleFlipsBothDirections() {
        recognizer.setColumnIncreasesRight(false);
        swipeRight(250);
        assertOnly(LEFT);
        received.clear();
        neutral();
        frames(TofGestureRecognizer.RETURN_SUPPRESS_MS);
        swipeLeft(250);
        assertOnly(RIGHT);
    }

    @Test public void twoSwipesWithTheHandLoweredBetweenReportTwice() {
        swipeRight(250);
        neutral();
        frames(TofGestureRecognizer.RETURN_SUPPRESS_MS);
        swipeRight(250);
        assertEquals(2, received.size());
    }

    /** A swipe that starts and ends inside the view, not just one thrown across all of it. */
    @Test public void aShortSwipeInsideTheViewStillCounts() {
        move(2f, MID, 5f, MID, 350, 300);
        away();
        assertOnly(RIGHT);
    }

    @Test public void theFrameCarryingNoSignalStillWorks() {
        // Every zone then weighs the same; nothing else changes.
        TofGestureRecognizer plain = new TofGestureRecognizer(
                (gesture, action, eventTimeNanos) -> received.add(gesture));
        for (int i = 0; i <= 7; i++) {
            scene.handAt(-1.5f + i * 10f / 7f, MID, 250);
            clock += TofScene.FRAME_MS;
            plain.onFrame(scene.range(), null, clock);
        }
        scene.noHand();
        for (int i = 0; i < 5; i++) {
            clock += TofScene.FRAME_MS;
            plain.onFrame(scene.range(), null, clock);
        }
        assertOnly(RIGHT);
    }

    // ------------------------------------------------------------------ 2. speed

    /** Three frames - a flick that crosses the whole view in about a seventh of a second. */
    @Test public void aFastFlickSeenInThreeFramesIsRecognised() {
        swipe(-1f, 8.5f, 300, 2 * TofScene.FRAME_MS);
        assertOnly(RIGHT);
    }

    /** Two frames is a flicker as easily as a hand; it is not enough to act on. */
    @Test public void somethingSeenInTwoFramesIsNot() {
        swipe(0f, 7f, 300, TofScene.FRAME_MS);
        assertNothing();
    }

    @Test public void aSlowDeliberateSwipeIsRecognised() {
        swipe(-1.5f, 8.5f, 300, 1800);
        assertOnly(RIGHT);
    }

    @Test public void slowerThanTheCeilingIsAHandBeingPlacedNotASwipe() {
        swipe(-1.5f, 8.5f, 300, 2700);
        assertNothing();
    }

    /** Two dropped frames in the middle of a swipe do not cut it in two. */
    @Test public void droppedFramesMidSwipeDoNotSplitIt() {
        move(-1.5f, MID, 3f, MID, 250, 200);
        scene.noHand();
        frame();
        frame();
        move(3.5f, MID, 8.5f, MID, 250, 200);
        away();
        assertOnly(RIGHT);
    }

    // ------------------------------------------------------------------ 3. distance

    /** 48 cm: past the old 45 cm limit, a relaxed arm's length. */
    @Test public void aSwipeAtArmsLengthIsRecognised() {
        swipeRight(480);
        assertOnly(RIGHT);
    }

    @Test public void aSwipeAtFifteenCentimetresIsRecognised() {
        swipeLeft(150);
        assertOnly(LEFT);
    }

    /** 4 cm: the hand covers the whole grid; only its leading and trailing edges move. */
    @Test public void aSwipeRightAgainstTheGlassesIsRecognised() {
        swipe(-11f, 18.5f, 40, 500);
        assertOnly(RIGHT);
    }

    /** Past 50 cm it is the people around the wearer, not the wearer's hand. */
    @Test public void beyondFiftyCentimetresIsOutOfReach() {
        swipeRight(600);
        assertNothing();
    }

    // ------------------------------------------------------------------ 4. lighting

    /** Ambient infrared lights random zones at random depths with a weak return. */
    @Test public void aSwipeIsRecognisedThroughInfraredNoise() {
        noise = new Random(7);
        settle();
        swipeRight(300);
        assertOnly(RIGHT);
    }

    @Test public void infraredNoiseOnItsOwnIsNeverASwipe() {
        noise = new Random(11);
        scene.noHand();
        frames(8000);
        assertNothing();
    }

    // ------------------------------------------------------------------ 5. background

    /**
     * A table edge or a display stand within reach. The old recogniser took it for a hand that
     * never left: after one swipe it waited for a clear sensor that never came.
     */
    @Test public void aStaticObjectInRangeIsLearnedAndSwipesKeepWorking() {
        scene.block(5, 7, 0, 7, 400);
        settle();
        swipeRight(200);
        neutral();
        frames(TofGestureRecognizer.RETURN_SUPPRESS_MS);
        swipeRight(200);
        assertEquals("背景有靜止物體時兩次揮手都要辨識：" + notes, 2, received.size());
    }

    @Test public void somethingThatArrivesAndStaysBecomesBackground() {
        settle();
        scene.block(0, 7, 5, 7, 450);
        frames(TofHandExtractor.ABSORB_MS + 500);
        assertNothing();
        swipeLeft(200);
        assertOnly(LEFT);
    }

    /** The hand is the nearest thing; whatever stands behind it is not averaged into it. */
    @Test public void aSwipeInFrontOfAPersonFollowsTheHand() {
        scene.wall(2000).block(0, 7, 3, 7, 500);
        settle();
        swipeLeft(200);
        assertOnly(LEFT);
    }

    /** Someone walking away behind the hand while it swipes neither cancels nor redirects it. */
    @Test public void aPersonMovingBehindTheHandDoesNotDisturbIt() {
        scene.wall(2000).block(0, 7, 3, 7, 500);
        settle();
        for (int i = 0; i <= 7; i++) {
            if (i >= 2) {
                scene.clearBackground().wall(2000);
                int from = Math.min(7, 3 + (i - 1));
                scene.block(0, 7, from, 7, 500);
            }
            scene.handAt(-1.5f + i * 10f / 7f, MID, 200);
            frame();
        }
        away();
        assertOnly(RIGHT);
    }

    /** A body filling the view at 45 cm is not a hand, however it moves. */
    @Test public void aBodyCrossingTheViewIsNotASwipe() {
        scene.wall(2500);
        settle();
        // A body: 60 cm wide, filling the height, crossing at walking pace.
        float width = 600f / TofScene.zoneWidthMm(450);
        for (int i = 0; i <= 9; i++) {
            scene.handAt(-6f + i * 2f, MID, 450, width, 12f);
            frame();
        }
        away();
        assertNothing();
    }

    /**
     * The wearer turns their head past a shelf at 40 cm. The shelf slides across the grid
     * exactly like a hand - but it also leaves the zones it was learned in, which a hand never
     * does.
     */
    @Test public void turningTheHeadPastANearObjectIsNotASwipe() {
        scene.wall(1200).block(0, 7, 0, 2, 400);
        settle();
        for (int shift = 1; shift <= 5; shift++) {
            scene.clearBackground().wall(1200).block(0, 7, shift, 2 + shift, 400);
            frame();
            // Either recognised as the scene moving, or not found at all - never a hand.
            assertFalse("第 " + shift + " 格位移不應被當成手：" + recognizer.lastHand().describe(),
                    recognizer.lastHand().present);
            if (shift >= 2) assertTrue(recognizer.lastHand().describe(), recognizer.lastHand().sceneMoving);
        }
        frames(2000);
        assertNothing();
    }

    // ------------------------------------------------------------------ what is not a swipe

    @Test public void aVerticalSweepProducesNothing() {
        move(MID, -6f, MID, 13f, 300, 500);
        away();
        assertNothing();
    }

    @Test public void aMostlyVerticalDiagonalIsRejected() {
        move(2f, -4f, 5f, 11f, 400, 500);
        away();
        assertNothing();
    }

    @Test public void aSwipeThatArcsALittleIsStillASwipe() {
        move(-1.5f, 2.5f, 8.5f, 5f, 400, 450);
        away();
        assertOnly(RIGHT);
    }

    @Test public void comingStraightTowardsTheGlassesIsNothing() {
        move(MID, MID, 480, MID, MID, 100, 500);
        away();
        assertNothing();
    }

    @Test public void holdingStillIsNothing() {
        hold(MID, MID, 300, 2000);
        away();
        assertNothing();
    }

    @Test public void aSmallShiftIsNotASwipe() {
        move(3f, MID, 3.8f, MID, 350, 300);
        away();
        assertNothing();
    }

    @Test public void aHandShakingInPlaceIsNothing() {
        for (int i = 0; i < 20; i++) {
            scene.handAt(MID + (i % 2 == 0 ? 0.3f : -0.3f), MID, 300);
            frame();
        }
        away();
        assertNothing();
    }

    /**
     * Brought in from the side and stopped in the middle, then lowered: the hand was placed, not
     * swiped. Its stroke ends in the middle of the view, which a swipe's does not.
     */
    @Test public void aHandPlacedFromTheSideIsNotASwipe() {
        move(9f, MID, MID, MID, 300, 400);
        hold(MID, MID, 300, 600);
        move(MID, MID, MID, 14f, 300, 400);
        away();
        assertNothing();
    }

    /** ...and the swipe it then makes is read on its own. */
    @Test public void aSwipeAfterPlacingTheHandIsRead() {
        move(9f, MID, MID, MID, 300, 400);
        hold(MID, MID, 300, 600);
        move(MID, MID, 9.5f, MID, 300, 350);
        away();
        assertOnly(RIGHT);
    }

    // ------------------------------------------------------------------ one swipe, one gesture

    /** A wave back and forth is one gesture - its first stroke - not a page per stroke. */
    @Test public void aWaveBackAndForthIsOneGesture() {
        move(1.5f, MID, 6f, MID, 300, 300);
        move(6f, MID, 1.5f, MID, 300, 300);
        move(1.5f, MID, 6f, MID, 300, 300);
        move(6f, MID, 1.5f, MID, 300, 300);
        away();
        assertOnly(RIGHT);
    }

    /** A swipe whose hand stays up at the end is reported without waiting for it to drop. */
    @Test public void aSwipeThatStopsAtTheEdgeIsReportedWhileTheHandIsStillUp() {
        move(-1.5f, MID, 6f, MID, 300, 350);
        hold(6f, MID, 300, 400);
        assertOnly(RIGHT);
        assertTrue(recognizer.isWaitingForNeutral());
    }

    /**
     * The hand rests where its swipe ended while the next page is read, for longer than it
     * takes to learn something new as background, then drifts back as the arm relaxes. That
     * drift used to arrive on the next page as a LEFT nobody made.
     */
    @Test public void aHandRestingAfterItsSwipeAndDriftingBackIsNothing() {
        move(-1.5f, MID, 6f, MID, 300, 350);
        hold(6f, MID, 300, TofHandExtractor.ABSORB_MS + 1000);
        move(6f, MID, 1.5f, MID, 300, 500);
        hold(1.5f, MID, 300, 500);
        assertOnly(RIGHT);
    }

    /**
     * The swipe that was "remembered": a stroke that stopped short of the edge, a hand held up
     * trembling for seconds, then lowered. The trembling used to keep the stroke open, and it
     * was reported when the hand finally dropped - on whatever screen was up by then.
     */
    @Test public void aStrokeIsNeverReportedSecondsAfterItEnded() {
        move(1.5f, MID, 3.8f, MID, 300, 300);
        for (int i = 0; i < 45; i++) {
            scene.handAt(3.8f + (i % 2 == 0 ? 0.3f : -0.3f), MID, 300);
            frame();
        }
        move(3.8f, MID, 3.8f, 14f, 300, 400);
        away();
        assertNothing();
    }

    @Test public void anObjectThatNeverLeavesNeverReArms() {
        move(-1.5f, MID, 6f, MID, 300, 350);
        for (int i = 0; i < 45; i++) {
            scene.handAt(6f - (i % 3) * 0.5f, MID, 300);
            frame();
        }
        assertTrue(recognizer.isWaitingForNeutral());
        assertOnly(RIGHT);
    }

    @Test public void aBriefGapIsNotEnoughToReArm() {
        swipeRight(250);
        assertTrue(recognizer.isWaitingForNeutral());
        scene.handAt(MID, MID, 250);
        frame();
        assertTrue(recognizer.isWaitingForNeutral());
    }

    /**
     * The arm coming back after a swipe to the right crosses the view to the left. Inside
     * {@link TofGestureRecognizer#RETURN_SUPPRESS_MS} that is the return stroke; after it, a
     * real swipe back.
     */
    @Test public void theReturnStrokeIsNotASwipeTheOtherWay() {
        swipeRight(250);
        neutral();
        swipeLeft(250);
        assertOnly(RIGHT);
        assertTrue(notes.stream().anyMatch(n -> n.contains("回程")));

        received.clear();
        frames(TofGestureRecognizer.RETURN_SUPPRESS_MS);
        swipeLeft(250);
        assertOnly(LEFT);
    }

    @Test public void theSameDirectionAgainIsNotSuppressed() {
        swipeRight(250);
        neutral();
        swipeRight(250);
        assertEquals(2, received.size());
    }

    // ------------------------------------------------------------------ alongside the module

    /** The module reported the swipe first: this recogniser stays quiet about the same one. */
    @Test public void aModuleSwipeLocksThisRecogniser() {
        move(-1.5f, MID, 4f, MID, 250, 250);
        recognizer.onExternalGesture(RIGHT, clock);
        move(4f, MID, 8.5f, MID, 250, 200);
        away();
        assertNothing();
        neutral();
    }

    @Test public void theModulesSwipeGetsTheSameReturnStrokeProtection() {
        settle();
        recognizer.onExternalGesture(RIGHT, clock);
        neutral();
        swipeLeft(250);
        assertNothing();
    }

    @Test public void agreeingWithTheModuleNeverFlipsTheAxis() {
        for (int i = 0; i < 4; i++) {
            move(-1.5f, MID, 4f, MID, 250, 250);
            recognizer.onExternalGesture(i == 0 ? RIGHT : LEFT, clock);
            away();
            neutral();
            frames(TofGestureRecognizer.RETURN_SUPPRESS_MS);
        }
        assertTrue(recognizer.isColumnIncreasesRight());
    }

    /** Mounted the other way round: three swipes in a row read backwards, and it corrects itself. */
    @Test public void consistentlyDisagreeingWithTheModuleFlipsTheAxis() {
        for (int i = 0; i < TofGestureRecognizer.ORIENTATION_FLIP_DISAGREEMENTS; i++) {
            assertTrue(recognizer.isColumnIncreasesRight());
            move(-1.5f, MID, 4f, MID, 250, 250);
            recognizer.onExternalGesture(LEFT, clock);
            away();
            neutral();
            frames(TofGestureRecognizer.RETURN_SUPPRESS_MS);
        }
        assertFalse(recognizer.isColumnIncreasesRight());
        swipeRight(250);
        assertOnly(LEFT);
    }

    @Test public void onlyLeftAndRightFromOutsideLockAnything() {
        recognizer.onExternalGesture(TofGestureEvent.GESTURE_PUSH, clock);
        assertTrue(recognizer.isArmed());
    }

    // ------------------------------------------------------------------ housekeeping

    @Test public void resetReturnsToArmedAndForgetsTheBackground() {
        scene.block(5, 7, 0, 7, 400);
        settle();
        move(-1.5f, MID, 6f, MID, 300, 350);
        hold(6f, MID, 300, 400);
        assertTrue(recognizer.isWaitingForNeutral());
        recognizer.reset();
        assertTrue(recognizer.isArmed());
        assertFalse(recognizer.lastHand().present);
    }

    /** Whatever it reports, it can only ever be one of two things. */
    @Test public void nothingButLeftOrRightIsEverReported() {
        Random random = new Random(3);
        for (int i = 0; i < 400; i++) {
            scene.handAt(random.nextFloat() * 12f - 2f, random.nextFloat() * 12f - 2f,
                    50f + random.nextInt(600));
            if (random.nextInt(4) == 0) scene.noHand();
            frame();
        }
        for (int gesture : received) {
            assertTrue(gesture == LEFT || gesture == RIGHT);
        }
    }
}
