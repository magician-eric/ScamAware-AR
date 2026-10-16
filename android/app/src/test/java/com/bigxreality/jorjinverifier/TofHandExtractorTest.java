package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Before;
import org.junit.Test;

/** Finding the hand in one frame: background, signal strength, nearest blob, size, head motion. */
public class TofHandExtractorTest {
    private TofHandExtractor extractor;
    private TofScene scene;
    private long clock;

    @Before public void setUp() {
        extractor = new TofHandExtractor();
        scene = new TofScene();
        clock = 1000L;
    }

    private TofHandExtractor.Hand frame() {
        return frame(false);
    }

    private TofHandExtractor.Hand frame(boolean locked) {
        clock += TofScene.FRAME_MS;
        return extractor.process(scene.range(), scene.signal(), clock, locked);
    }

    private TofHandExtractor.Hand run(long ms) {
        return run(ms, false);
    }

    private TofHandExtractor.Hand run(long ms, boolean locked) {
        TofHandExtractor.Hand last = TofHandExtractor.Hand.NONE;
        for (long t = 0; t < ms; t += TofScene.FRAME_MS) last = frame(locked);
        return last;
    }

    // ------------------------------------------------------------------ background

    @Test public void aStaticSceneIsLearnedAndThenIsNotAHand() {
        scene.block(5, 7, 0, 7, 400);
        assertTrue("尚未學到背景前，範圍內的物體視為前景", frame().present);
        assertTrue("手勢範圍內的東西不會一秒就學成背景（可能是靜止的手）",
                run(TofHandExtractor.LEARN_MS + 200).present);
        TofHandExtractor.Hand later = run(TofHandExtractor.ABSORB_MS);
        assertFalse("學到背景後不是手：" + later.describe(), later.present);
        assertEquals(400f, extractor.backgroundOf(5 * 8), 0.5f);
    }

    /** Beyond gesture range nothing can be a hand, so it is learned quickly. */
    @Test public void aFarSceneIsLearnedWithinASecond() {
        scene.wall(1500);
        run(TofHandExtractor.LEARN_MS + 200);
        assertEquals(1500f, extractor.backgroundOf(0), 0.5f);
    }

    /**
     * Learned background is not a hand; the zone just past its edge, flickering between the
     * object and what is behind it, is not one either.
     */
    @Test public void theFlickeringEdgeOfAKnownObjectIsNotAHand() {
        scene.wall(1500).block(0, 7, 0, 3, 350);
        run(TofHandExtractor.ABSORB_MS + 500);
        // the object's edge now spills into column 4 as well
        scene.block(0, 7, 0, 4, 350);
        assertFalse(frame().present);
    }

    @Test public void aHandInFrontOfLearnedBackgroundIsFound() {
        scene.block(4, 7, 0, 7, 400);
        run(TofHandExtractor.ABSORB_MS + 500);
        scene.handAt(3.5f, 3.5f, 200);
        TofHandExtractor.Hand hand = frame();
        assertTrue(hand.present);
        assertEquals(200f, hand.rangeMm, 1f);
    }

    @Test public void somethingNewThatStaysIsAbsorbedAfterAWhile() {
        run(TofHandExtractor.LEARN_MS + 200);
        scene.block(0, 7, 6, 7, 450);
        assertTrue(frame().present);
        assertTrue("未滿吸收時間前仍是前景", run(TofHandExtractor.ABSORB_MS - 500).present);
        assertFalse("超過吸收時間後變成背景", run(1000).present);
    }

    /** A hand resting after its swipe must stay a hand for much longer. */
    @Test public void whileLockedAbsorptionTakesMuchLonger() {
        run(TofHandExtractor.LEARN_MS + 200);
        scene.handAt(5f, 3.5f, 300);
        assertTrue(run(TofHandExtractor.ABSORB_MS + 1000, true).present);
        assertFalse(run(TofHandExtractor.ABSORB_LOCKED_MS - TofHandExtractor.ABSORB_MS, true).present);
    }

    /** Infrared-rich light: zones drop out for a frame now and then. The scene is still learned. */
    @Test public void briefDropoutsDoNotStopTheSceneBeingLearned() {
        scene.block(0, 7, 0, 3, 400);
        for (long t = 0; t < TofHandExtractor.ABSORB_MS + 500; t += TofScene.FRAME_MS) {
            float[] range = scene.range();
            float[] signal = scene.signal();
            if ((t / TofScene.FRAME_MS) % 7 == 3) {
                java.util.Arrays.fill(range, 0f);
                java.util.Arrays.fill(signal, 0f);
            }
            extractor.process(range, signal, clock += TofScene.FRAME_MS, false);
        }
        assertEquals(400f, extractor.backgroundOf(0), 0.5f);
        assertFalse(frame().present);
    }

    @Test public void anObjectThatLeftIsForgottenQuickly() {
        scene.block(0, 7, 0, 7, 400);
        run(TofHandExtractor.ABSORB_MS + 500);
        scene.clearBackground().wall(1800);
        run(TofHandExtractor.RECEDE_MS + 200);
        assertEquals(1800f, extractor.backgroundOf(0), 1f);
    }

    // ------------------------------------------------------------------ signal strength

    @Test public void weakZonesNextToAStrongHandAreDropped() {
        run(TofHandExtractor.LEARN_MS + 200);
        scene.handAt(2f, 3.5f, 300);
        float[] range = scene.range();
        float[] signal = scene.signal();
        // A weak, far-off patch at the other side - an edge lit by a lamp.
        for (int r = 2; r <= 5; r++) {
            for (int c = 5; c <= 7; c++) {
                range[r * 8 + c] = 320f;
                signal[r * 8 + c] = 0.5f;
            }
        }
        TofHandExtractor.Hand hand = extractor.process(range, signal, clock += 66, false);
        assertTrue(hand.present);
        assertTrue("弱訊號區不應拉動手的位置：" + hand.describe(), hand.col < 2.6f);
    }

    /** Half-covered zones weigh half: the position moves in fractions of a zone. */
    @Test public void theCentroidFollowsTheHandBetweenZones() {
        run(TofHandExtractor.LEARN_MS + 200);
        float previous = -1f;
        for (int i = 0; i <= 8; i++) {
            float col = 2f + i * 0.25f;
            scene.handAt(col, 3.5f, 400);
            TofHandExtractor.Hand hand = frame();
            assertTrue(hand.present);
            assertEquals("位置應接近手的中心", col, hand.col, 0.45f);
            assertTrue("位置應單調前進", hand.col >= previous - 0.05f);
            previous = hand.col;
        }
    }

    // ------------------------------------------------------------------ nearest blob

    @Test public void onlyTheNearestThingIsTheHand() {
        scene.wall(2000);
        run(TofHandExtractor.LEARN_MS + 200);
        scene.block(0, 7, 4, 7, 500);   // someone standing behind, not yet learned
        scene.handAt(1.5f, 3.5f, 200);
        TofHandExtractor.Hand hand = frame();
        assertTrue(hand.present);
        assertEquals(200f, hand.rangeMm, 1f);
        assertTrue("後方的人不應被平均進手的位置：" + hand.describe(), hand.col < 2.2f);
    }

    @Test public void aLoneNearReadingDoesNotSetTheBand() {
        run(TofHandExtractor.LEARN_MS + 200);
        scene.handAt(5f, 3.5f, 300);
        float[] range = scene.range();
        float[] signal = scene.signal();
        range[0] = 60f;
        signal[0] = 1000f;
        TofHandExtractor.Hand hand = extractor.process(range, signal, clock += 66, false);
        assertTrue(hand.present);
        assertEquals(300f, hand.rangeMm, 1f);
    }

    @Test public void fewerThanThreeZonesIsNotAHand() {
        run(TofHandExtractor.LEARN_MS + 200);
        float[] range = new float[64];
        float[] signal = new float[64];
        range[27] = range[28] = 300f;
        signal[27] = signal[28] = 40f;
        assertFalse(extractor.process(range, signal, clock += 66, false).present);
    }

    // ------------------------------------------------------------------ size

    @Test public void aHandAtArmsLengthFitsAndABodyDoesNot() {
        assertTrue(TofHandExtractor.maxHandZones(480) >= 10);
        assertTrue(TofHandExtractor.maxHandZones(480) < 30);
        assertEquals(64, TofHandExtractor.maxHandZones(200));
        scene.wall(2500);
        run(TofHandExtractor.LEARN_MS + 200);
        scene.block(0, 7, 0, 7, 450);
        TofHandExtractor.Hand body = frame();
        assertFalse(body.present);
        assertTrue(body.describe().startsWith("X too-big"));
    }

    // ------------------------------------------------------------------ head motion

    @Test public void theSceneSlidingAcrossIsReportedAsMoving() {
        scene.wall(1200).block(0, 7, 0, 2, 400);
        run(TofHandExtractor.ABSORB_MS + 500);
        scene.clearBackground().wall(1200).block(0, 7, 2, 4, 400);
        TofHandExtractor.Hand hand = frame();
        assertTrue(hand.describe(), hand.sceneMoving);
        assertFalse(hand.present);
    }

    @Test public void aPersonLeavingBehindAHandIsNotSceneMotion() {
        scene.wall(2000).block(0, 7, 3, 7, 500);
        run(TofHandExtractor.ABSORB_MS + 500);
        scene.clearBackground().wall(2000).block(0, 7, 6, 7, 500);
        scene.handAt(2f, 3.5f, 200);
        TofHandExtractor.Hand hand = frame();
        assertFalse(hand.sceneMoving);
        assertTrue(hand.present);
        assertEquals(200f, hand.rangeMm, 1f);
    }

    // ------------------------------------------------------------------ the log column

    @Test public void describeIsOneShortAsciiToken() {
        assertEquals("-", TofHandExtractor.Hand.NONE.describe());
        String hand = TofHandExtractor.Hand.at(3.25f, 4f, 231f, 9, 1234f).describe();
        assertEquals("H 3.25 4.00 231mm 9z 1234", hand);
        assertEquals("M 6", TofHandExtractor.Hand.moving(6).describe());
    }

    // ------------------------------------------------------------------ wall, audience, noise

    /**
     * The wall the player stands at: a hand less than 10 cm in front of it does not count, one
     * clearly in front of it does.
     */
    @Test public void aHandMustBeTenCentimetresInFrontOfWhatIsBehindIt() {
        scene.wall(450);
        run(TofHandExtractor.ABSORB_MS + 500);
        scene.handAt(3.5f, 3.5f, 380);
        assertFalse("離牆只有 7 公分，不算手", frame().present);
        scene.handAt(3.5f, 3.5f, 320);
        assertTrue("離牆 13 公分，是手", frame().present);
    }

    /** 手勢最遠距離: brought in to 35 cm, a hand at 45 cm is no longer looked for at all. */
    @Test public void theStaffModeCanBringTheRangeIn() {
        scene.wall(1500);
        run(TofHandExtractor.LEARN_MS + 200);
        scene.handAt(3.5f, 3.5f, 450);
        assertTrue(frame().present);
        extractor.setMaxRangeMm(350);
        assertFalse("最遠 35 公分時，45 公分的手不算", frame().present);
        scene.handAt(3.5f, 3.5f, 300);
        assertTrue(frame().present);
        extractor.setMaxRangeMm(5000);
        assertEquals("不能超過感測器本身的手勢範圍",
                TofHandExtractor.MAX_RANGE_MM, extractor.maxRangeMm(), 0.1f);
    }

    /** Two patches: a weak one at 30 cm (infrared speckle) and a strong one, the hand, at 35. */
    private TofHandExtractor.Hand weakNearStrong() {
        float[] range = new float[64];
        float[] signal = new float[64];
        for (int row = 2; row <= 4; row++) {
            for (int col = 0; col <= 1; col++) {
                range[row * 8 + col] = 300f;
                signal[row * 8 + col] = 4f;
            }
            for (int col = 4; col <= 6; col++) {
                range[row * 8 + col] = 350f;
                signal[row * 8 + col] = 60f;
            }
        }
        TofHandExtractor.Hand last = TofHandExtractor.Hand.NONE;
        for (int k = 0; k < 3; k++) {
            clock += TofScene.FRAME_MS;
            last = extractor.process(range, signal, clock, false);
        }
        return last;
    }

    /** 訊號過濾: weak next to the strongest return in the frame, a zone is ignored outright. */
    @Test public void weakReturnsAreIgnoredAgainstTheStrongest() {
        run(TofHandExtractor.LEARN_MS + 200);
        extractor.setSignalMode(TofHandExtractor.SignalMode.LOOSE);
        assertEquals("寬鬆時弱訊號仍在，最近的是它", 300f, weakNearStrong().rangeMm, 1f);
        extractor.setSignalMode(TofHandExtractor.SignalMode.STANDARD);
        TofHandExtractor.Hand hand = weakNearStrong();
        assertTrue(hand.present);
        assertEquals("標準時忽略只有最強訊號 7% 的那一塊", 350f, hand.rangeMm, 1f);
    }

    /** 自動: the more zones flicker with nothing in front, the stricter the signal floor. */
    @Test public void autoGetsStricterAsTheSceneGetsNoisier() {
        assertEquals(TofHandExtractor.SignalMode.AUTO, extractor.signalMode());
        assertEquals(TofHandExtractor.AUTO_FRACTION_QUIET, extractor.signalFloorFraction(), 1e-6f);
        java.util.Random random = new java.util.Random(7);
        for (int k = 0; k < 150; k++) {
            float[] range = new float[64];
            float[] signal = new float[64];
            for (int i = 0; i < 64; i++) {
                if (random.nextInt(4) == 0) {
                    range[i] = 1500f;
                    signal[i] = 1f;
                }
            }
            clock += TofScene.FRAME_MS;
            extractor.process(range, signal, clock, false);
        }
        assertTrue("雜訊比例 " + extractor.noiseRatio(),
                extractor.noiseRatio() >= TofHandExtractor.NOISE_VERY_NOISY);
        assertEquals(TofHandExtractor.AUTO_FRACTION_VERY_NOISY, extractor.signalFloorFraction(), 1e-6f);
        extractor.setSignalMode(TofHandExtractor.SignalMode.STANDARD);
        assertEquals("手動選的不跟著雜訊變", 0.12f, extractor.signalFloorFraction(), 1e-6f);
        extractor.reset();
        extractor.setSignalMode(TofHandExtractor.SignalMode.AUTO);
        assertEquals(TofHandExtractor.AUTO_FRACTION_QUIET, extractor.signalFloorFraction(), 1e-6f);
    }

    @Test public void aStaffChoiceIsReadByName() {
        assertEquals(TofHandExtractor.SignalMode.STRICT, TofHandExtractor.SignalMode.parse("strict"));
        assertEquals(TofHandExtractor.SignalMode.AUTO, TofHandExtractor.SignalMode.parse("nonsense"));
        assertEquals(TofHandExtractor.SignalMode.AUTO, TofHandExtractor.SignalMode.parse(null));
    }

    /**
     * A zone that was dark a frame ago must persist unless it arrives as part of a solid patch:
     * a thin line of new zones is a hand from its second frame, a solid patch from its first.
     */
    @Test public void loneNewZonesMustPersistButASolidHandDoesNot() {
        run(TofHandExtractor.LEARN_MS + 200);
        float[] range = new float[64];
        float[] signal = new float[64];
        for (int row = 2; row <= 4; row++) {
            range[row * 8 + 3] = 250f;
            signal[row * 8 + 3] = 50f;
        }
        clock += TofScene.FRAME_MS;
        assertFalse("一條剛出現的細線，第一張畫面不算", extractor.process(range, signal, clock, false).present);
        clock += TofScene.FRAME_MS;
        assertTrue("第二張畫面還在，就是手", extractor.process(range, signal, clock, false).present);

        extractor.reset();
        run(TofHandExtractor.LEARN_MS + 200);
        scene.handAt(3.5f, 3.5f, 250);
        assertTrue("整塊出現的手，第一張畫面就算", frame().present);
    }

    /** The staff mode's live view shows which zones were taken for the hand. */
    @Test public void theHandsZonesAreKeptForTheLiveView() {
        run(TofHandExtractor.LEARN_MS + 200);
        scene.handAt(3.5f, 3.5f, 300);
        TofHandExtractor.Hand hand = frame();
        assertTrue(hand.present);
        assertEquals(hand.zones, Long.bitCount(extractor.handMask()));
        scene.noHand();
        frame();
        assertEquals(0L, extractor.handMask());
    }
}
