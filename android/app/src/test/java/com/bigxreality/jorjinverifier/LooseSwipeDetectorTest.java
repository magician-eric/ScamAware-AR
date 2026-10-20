package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import org.junit.Before;
import org.junit.Test;

/** 寬鬆辨識, driven by the same simulated sensor as the depth recogniser's tests. */
public class LooseSwipeDetectorTest {
    private static final float MID = 3.5f;
    private static final int LEFT = LooseSwipeDetector.LEFT;
    private static final int RIGHT = LooseSwipeDetector.RIGHT;

    private LooseSwipeDetector detector;
    private TofScene scene;
    private long clock;
    private final List<Integer> received = new ArrayList<>();
    private Random noise;

    @Before public void setUp() {
        detector = new LooseSwipeDetector();
        scene = new TofScene();
        clock = 10_000L;
        received.clear();
        noise = null;
    }

    private void frame() {
        clock += TofScene.FRAME_MS;
        float[] range = scene.range();
        float[] signal = scene.signal();
        // TofScene's signal is in its own units; field logs read a hand at 20 cm in thousands.
        for (int i = 0; i < signal.length; i++) signal[i] *= 100f;
        if (noise != null) {
            // Lamp light: empty zones read a few centimetres at a signal of a few tens.
            for (int i = 0; i < TofScene.ZONES; i++) {
                if (signal[i] < 100f && noise.nextFloat() < 0.4f) {
                    range[i] = 10f + noise.nextInt(80);
                    signal[i] = 5f + noise.nextInt(40);
                }
            }
        }
        int g = detector.onFrame(range, signal, clock);
        if (g != LooseSwipeDetector.NONE) received.add(g);
    }

    private void frames(long ms) {
        for (long t = 0; t < ms; t += TofScene.FRAME_MS) frame();
    }

    private void settle() {
        scene.noHand();
        frames(4000);
    }

    private void move(float fromCol, float fromRow, float toCol, float toRow, float rangeMm, long ms) {
        int steps = Math.max(1, Math.round(ms / (float) TofScene.FRAME_MS));
        for (int i = 0; i <= steps; i++) {
            float t = i / (float) steps;
            scene.handAt(fromCol + (toCol - fromCol) * t, fromRow + (toRow - fromRow) * t, rangeMm);
            frame();
        }
    }

    private void away() {
        scene.noHand();
        frames(400);
    }

    private void assertOnly(int gesture) {
        assertEquals("應剛好一次：" + received, 1, received.size());
        assertEquals((int) gesture, (int) received.get(0));
    }

    private void assertNothing() {
        assertEquals("不應辨識：" + received, 0, received.size());
    }

    @Test public void leftAndRightAtEveryDistance() {
        for (float mm : new float[] {150f, 300f, 450f}) {
            setUp();
            settle();
            move(8.5f, MID, -1.5f, MID, mm, 450);
            away();
            assertOnly(LEFT);
            setUp();
            settle();
            move(-1.5f, MID, 8.5f, MID, mm, 450);
            away();
            assertOnly(RIGHT);
        }
    }

    @Test public void theRightHandGoingLeftAndDownIsLeft() {
        settle();
        move(8f, 1f, -1f, 7f, 250, 450);
        away();
        assertOnly(LEFT);
    }

    @Test public void theLeftHandGoingLeftAndUpIsLeft() {
        settle();
        move(8f, 7f, -1f, 1f, 250, 450);
        away();
        assertOnly(LEFT);
    }

    @Test public void diagonalsToTheRightAreRight() {
        settle();
        move(-1f, 1f, 8f, 7f, 250, 450);
        away();
        assertOnly(RIGHT);
        setUp();
        settle();
        move(-1f, 7f, 8f, 1f, 250, 450);
        away();
        assertOnly(RIGHT);
    }

    @Test public void aHandDroppedStraightDownIsNothing() {
        settle();
        move(MID, -3f, MID, 11f, 250, 500);
        away();
        assertNothing();
    }

    @Test public void holdingStillIsNothing() {
        settle();
        scene.handAt(MID, MID, 250);
        frames(2000);
        away();
        assertNothing();
    }

    @Test public void aSmallShiftIsNothing() {
        settle();
        move(3f, MID, 4.5f, MID, 250, 300);
        away();
        assertNothing();
    }

    @Test public void theArmComingBackIsNotASwipe() {
        settle();
        move(8.5f, MID, -1.5f, MID, 250, 450);
        away();
        move(-1.5f, MID, 8.5f, MID, 250, 450);
        away();
        assertOnly(LEFT);
    }

    @Test public void theSameWayAgainCounts() {
        settle();
        move(8.5f, MID, -1.5f, MID, 250, 450);
        away();
        move(8.5f, MID, -1.5f, MID, 250, 450);
        away();
        assertEquals(2, received.size());
    }

    @Test public void beyondFiftyCentimetresIsNothing() {
        settle();
        move(8.5f, MID, -1.5f, MID, 600, 450);
        away();
        assertNothing();
    }

    @Test public void lampLightNoiseAloneIsNothing() {
        noise = new Random(7);
        settle();
        frames(20_000);
        assertNothing();
    }

    @Test public void aSwipeThroughLampLightNoiseIsSeen() {
        noise = new Random(11);
        settle();
        move(8.5f, MID, -1.5f, MID, 120, 450);
        away();
        assertOnly(LEFT);
    }

    @Test public void aNearTableIsLearnedAndSwipesStillWork() {
        scene.wall(2000).block(6, 7, 0, 7, 400);
        settle();
        move(8.5f, 2f, -1.5f, 2f, 200, 450);
        away();
        assertOnly(LEFT);
    }

    @Test public void somethingPutDownInRangeBecomesBackgroundAndSwipesResume() {
        settle();
        scene.block(5, 7, 0, 7, 350);
        frames(4000);
        move(8.5f, 1.5f, -1.5f, 1.5f, 200, 450);
        away();
        assertOnly(LEFT);
    }

    @Test public void turningTheHeadPastANearShelfIsNothing() {
        scene.wall(1200).block(0, 7, 0, 2, 400);
        settle();
        for (int shift = 1; shift <= 5; shift++) {
            scene.clearBackground().wall(1200).block(0, 7, shift, 2 + shift, 400);
            frame();
        }
        frames(2000);
        assertNothing();
    }
}
