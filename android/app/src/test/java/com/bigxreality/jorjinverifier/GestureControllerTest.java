package com.bigxreality.jorjinverifier;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.jorjin.jjsdk.tof.TofGestureEvent;
import com.jorjin.jjsdk.tof.TofGestureEvents;

import java.util.ArrayList;
import java.util.List;

import org.junit.Before;
import org.junit.Test;

public class GestureControllerTest {
    private final List<String> delivered = new ArrayList<>();
    private GestureController controller;

    @Before public void setUp() {
        delivered.clear();
        controller = new GestureController((label, gesture, source, count) ->
                delivered.add(label + "#" + count));
    }

    private void send(int action, int gesture, long nowMs) {
        controller.onRawEvent(TofGestureEvents.create(nowMs * 1_000_000L, action, gesture), nowMs);
    }

    @Test public void deliversReceivedGestures() {
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT, 0);
        assertEquals(1, delivered.size());
        assertEquals("向左 LEFT#1", delivered.get(0));
        assertEquals(1, controller.gestureCount());
    }

    @Test public void ignoresClearedActionButStillCountsItAsRaw() {
        send(TofGestureEvent.ACTION_CLEARED, TofGestureEvent.GESTURE_LEFT, 0);
        assertEquals(0, delivered.size());
        assertEquals(0, controller.gestureCount());
        assertEquals(1, controller.rawEventCount());
    }

    @Test public void debouncesOnlyTheSameGestureWithinTheWindow() {
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT, 0);
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT, 100);
        assertEquals(1, delivered.size());
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT,
                GestureController.DEBOUNCE_MS);
        assertEquals(2, delivered.size());
    }

    /**
     * The vocabulary is two words now, so this is the whole of it: a RIGHT immediately after a
     * LEFT must not be swallowed by the guard that stops one swipe reporting twice.
     */
    @Test public void aDifferentGestureIsNeverDebouncedAway() {
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT, 0);
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_RIGHT, 10);
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT, 20);
        assertEquals(3, delivered.size());
        assertEquals("向左 LEFT#3", delivered.get(2));
    }

    /** A cleared event between two identical gestures must not hide the second one. */
    @Test public void clearedEventDoesNotBlockAFollowUpGesture() {
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_RIGHT, 0);
        send(TofGestureEvent.ACTION_CLEARED, TofGestureEvent.GESTURE_RIGHT, 50);
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_RIGHT, 100);
        assertEquals(2, delivered.size());
    }

    // ------------------------------------------------------------ LEFT / RIGHT only

    /**
     * The firmware path can still emit the full vocabulary on a module new enough to have a
     * working gesture engine. None of it may reach the UI or the WebView bridge.
     */
    @Test public void onlyLeftAndRightAreDelivered() {
        int[] rejected = {
                TofGestureEvent.GESTURE_UP, TofGestureEvent.GESTURE_DOWN,
                TofGestureEvent.GESTURE_PUSH, TofGestureEvent.GESTURE_PULL,
                TofGestureEvent.GESTURE_HALT, TofGestureEvent.PRESENCE};
        long now = 0;
        for (int gesture : rejected) {
            send(TofGestureEvent.ACTION_RECEIVED, gesture, now += GestureController.DEBOUNCE_MS);
        }
        assertEquals("非左右手勢不得送出", 0, delivered.size());
        assertEquals("非左右手勢不得計入正式次數", 0, controller.gestureCount());
        assertEquals("但仍應計入原始事件", rejected.length, controller.rawEventCount());

        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT,
                now += GestureController.DEBOUNCE_MS);
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_RIGHT,
                now += GestureController.DEBOUNCE_MS);
        assertEquals(2, delivered.size());
        assertEquals(2, controller.gestureCount());
    }

    /**
     * A dropped gesture must not touch the debounce state. If a stray PRESENCE overwrote the
     * last-gesture record, the LEFT that follows would look like a change of gesture and slip
     * past the repeat guard - so a gesture nobody asked for would alter the timing of one they
     * did.
     */
    @Test public void aDroppedGestureDoesNotDisturbTheRepeatGuard() {
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT, 0);
        assertEquals(1, delivered.size());
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.PRESENCE, 10);
        // Still inside the window, still the same gesture: must remain debounced.
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT, 20);
        assertEquals("PRESENCE 不得讓重複的 LEFT 通過防重複", 1, delivered.size());
        send(TofGestureEvent.ACTION_RECEIVED, TofGestureEvent.GESTURE_LEFT,
                GestureController.DEBOUNCE_MS + 20);
        assertEquals(2, delivered.size());
    }

    @Test public void theVocabularyIsExactlyTwo() {
        assertTrue(GestureController.isSupported(TofGestureEvent.GESTURE_LEFT));
        assertTrue(GestureController.isSupported(TofGestureEvent.GESTURE_RIGHT));
        for (int gesture : new int[]{
                TofGestureEvent.GESTURE_UP, TofGestureEvent.GESTURE_DOWN,
                TofGestureEvent.GESTURE_PUSH, TofGestureEvent.GESTURE_PULL,
                TofGestureEvent.GESTURE_HALT, TofGestureEvent.PRESENCE, 100, -1}) {
            assertFalse(GestureLabels.code(gesture), GestureController.isSupported(gesture));
        }
    }
}
